import "server-only";
import { unstable_cache } from "next/cache";
import { ACCOUNT_FALLBACK, CUSTOM_RANGE, RANGES } from "./config.js";
import { VIDEO_FIELDS } from "./metrics.js";

const REVALIDATE_SECONDS = 300;
const ACCOUNT_REVALIDATE_SECONDS = 86400;
// Images and ad details rarely change, and each ad uses up the stricter ads_management limit.
const AD_DETAILS_REVALIDATE_SECONDS = 6 * 60 * 60;
export const CACHE_TAG = "meta";
const RATE_LIMIT_CODES = new Set([4, 17, 32, 613]);
const MAX_RETRIES = 4;
const PAGE_LIMIT = 500;
const MAX_PAGES = 20;
const BATCH_SIZE = 50;
const BATCH_CONCURRENCY = 4;
const VIDEO_CONCURRENCY = 4;
// Ad-account throttling. It isn't retried, because retries keep the account blocked.
const isThrottleCode = (code) => code >= 80000 && code <= 80099;
// After retries fail on an app-wide limit, stop calling Meta for a while so it can clear.
const RATE_LIMIT_COOLDOWN_MS = 2 * 60 * 1000;
let blockedUntil = 0;
const REQUIRED_ENV = ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID", "META_API_VERSION"];

export class MissingEnvError extends Error {
  constructor(missing) {
    super(`Missing environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
    this.name = "MissingEnvError";
    this.missing = missing;
  }
}

export class MetaApiError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "MetaApiError";
    this.code = code;
    this.isThrottled = isThrottleCode(code);
    this.isRateLimit = RATE_LIMIT_CODES.has(code) || this.isThrottled;
  }
}

function env() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length) throw new MissingEnvError(missing);
  const account = process.env.META_AD_ACCOUNT_ID;
  return {
    token: process.env.META_ACCESS_TOKEN,
    account: account.startsWith("act_") ? account : `act_${account}`,
    base: `https://graph.facebook.com/${process.env.META_API_VERSION}`,
  };
}

/** Removes the token from anything that could reach a log or the browser. */
function redact(text) {
  const token = process.env.META_ACCESS_TOKEN;
  const safe = String(text ?? "Unknown Meta API error");
  return (token ? safe.replaceAll(token, "[redacted]") : safe).replace(/access_token=[^&\s"]+/g, "access_token=[redacted]");
}

/** Carries partial batch results out of the cache wrapper, so they're used but never stored. */
class IncompleteBatch extends Error {
  constructor(results) {
    super("Batch incomplete");
    this.results = results;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const backoff = (attempt) => sleep(1000 * 2 ** attempt);

async function request(url, init) {
  for (let attempt = 0; ; attempt += 1) {
    if (Date.now() < blockedUntil) throw new MetaApiError("Application request limit reached", 4);
    // Next.js reuses identical GETs within one render, so a retry needs a signal to reach Meta again.
    const response = await fetch(url, attempt ? { ...init, signal: new AbortController().signal } : init);
    const json = await response.json();
    if (!json.error) return json;
    const code = json.error.code;
    if (RATE_LIMIT_CODES.has(code) && attempt < MAX_RETRIES) {
      await backoff(attempt);
      continue;
    }
    if (RATE_LIMIT_CODES.has(code)) blockedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
    throw new MetaApiError(redact(json.error.message), code);
  }
}

function cachedGet(url) {
  return request(url, {
    headers: { Authorization: `Bearer ${env().token}` },
    next: { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] },
  });
}

function buildUrl(path, params = {}) {
  const url = new URL(`${env().base}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  }
  return url;
}

/** Follows paging.next, and warns if the page cap could cut data off. */
async function getAllPages(path, params) {
  const rows = [];
  let next = buildUrl(path, { ...params, limit: PAGE_LIMIT });
  let pages = 0;
  while (next && pages < MAX_PAGES) {
    const page = await cachedGet(next.toString());
    rows.push(...(page.data ?? []));
    pages += 1;
    if (page.paging?.next) {
      next = new URL(page.paging.next);
      next.searchParams.delete("access_token");
    } else {
      next = null;
    }
  }
  if (next) console.warn(`[meta] Page cap of ${MAX_PAGES} reached for ${path}. Results may be incomplete.`);
  return rows;
}

/** Runs one batch of up to 50 GETs, retrying only the items that were rate limited. */
async function runBatchChunk(relativeUrls) {
  const { token, base } = env();
  const results = new Array(relativeUrls.length).fill(null);
  let pending = relativeUrls.map((_, index) => index);
  let throttled = false;

  for (let attempt = 0; pending.length; attempt += 1) {
    const body = new URLSearchParams({
      access_token: token,
      include_headers: "false",
      batch: JSON.stringify(pending.map((index) => ({ method: "GET", relative_url: relativeUrls[index] }))),
    });
    const responses = await request(`${base}/`, { method: "POST", body, cache: "no-store" });

    const retry = [];
    let rateLimit = null;
    responses.forEach((item, position) => {
      const index = pending[position];
      let parsed = null;
      try {
        parsed = item?.body ? JSON.parse(item.body) : null;
      } catch {
        parsed = null;
      }
      if (item?.code === 200 && parsed) {
        results[index] = parsed;
      } else if (isThrottleCode(parsed?.error?.code)) {
        throttled = true;
      } else if (!item || RATE_LIMIT_CODES.has(parsed?.error?.code)) {
        retry.push(index);
        rateLimit = parsed?.error;
      } else {
        // One unreadable creative shouldn't blank the dashboard. Its card falls back to a placeholder.
        console.warn(`[meta] Batch item failed (${parsed?.error?.code ?? item?.code}): ${redact(parsed?.error?.message)}`);
      }
    });

    if (retry.length && attempt >= MAX_RETRIES) {
      blockedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      throw new MetaApiError(redact(rateLimit?.message ?? "Rate limit not cleared after retries"), rateLimit?.code ?? 4);
    }
    if (retry.length) await backoff(attempt);
    pending = retry;
  }
  if (throttled) throw new IncompleteBatch(results);
  return results;
}

const cachedBatchChunk = unstable_cache(runBatchChunk, ["meta-batch-v3"], {
  revalidate: AD_DETAILS_REVALIDATE_SECONDS,
  tags: [CACHE_TAG],
});

async function fetchBatchChunk(relativeUrls) {
  try {
    return await cachedBatchChunk(relativeUrls);
  } catch (error) {
    if (error instanceof IncompleteBatch) {
      console.warn("[meta] Ad account is rate limited. Showing partial ad details.");
      return error.results;
    }
    if (error instanceof MetaApiError && error.isThrottled) {
      console.warn("[meta] Ad account is rate limited. Ad details skipped.");
      return new Array(relativeUrls.length).fill(null);
    }
    throw error;
  }
}

async function batchGet(relativeUrls) {
  env();
  const chunks = [];
  for (let i = 0; i < relativeUrls.length; i += BATCH_SIZE) chunks.push(relativeUrls.slice(i, i + BATCH_SIZE));

  const output = new Array(chunks.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < chunks.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await fetchBatchChunk(chunks[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(BATCH_CONCURRENCY, chunks.length) }, worker));
  return output.flat();
}

export async function getAccount() {
  const { account } = env();
  const url = buildUrl(account, { fields: "name,currency,timezone_name" }).toString();
  try {
    // These settings rarely change, so they're cached for a day to save calls.
    return await request(url, {
      headers: { Authorization: `Bearer ${env().token}` },
      next: { revalidate: ACCOUNT_REVALIDATE_SECONDS },
    });
  } catch (error) {
    if (error instanceof MetaApiError && error.isRateLimit) return ACCOUNT_FALLBACK;
    throw error;
  }
}

/** Today's date in the ad account's own time zone, as yyyy-MM-dd. */
function todayIn(timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/**
 * Turns dashboard filters into Meta date params. Returns null for a range that
 * hasn't started, because Meta rejects a future `since`.
 */
export function dateParams(filters, timeZone) {
  if (filters.range !== CUSTOM_RANGE) {
    return { date_preset: RANGES.find((r) => r.value === filters.range).preset };
  }
  const today = todayIn(timeZone);
  if (filters.start > today) return null;
  return { time_range: JSON.stringify({ since: filters.start, until: filters.end > today ? today : filters.end }) };
}

const SUMMARY_FIELDS = "spend,impressions,reach,clicks,actions";

/** Account-level insights, so Meta keeps reach de-duplicated. */
export async function getAccountInsights(dates, filtering) {
  if (!dates) return null;
  const { account } = env();
  const rows = await getAllPages(`${account}/insights`, {
    ...dates,
    fields: `${SUMMARY_FIELDS},results,cost_per_result`,
    filtering: filtering ? JSON.stringify(filtering) : undefined,
  });
  return rows[0] ?? null;
}

export async function getAgeInsights(dates, filtering) {
  if (!dates) return [];
  const { account } = env();
  return getAllPages(`${account}/insights`, {
    ...dates,
    breakdowns: "age",
    fields: "spend,reach,impressions",
    filtering: JSON.stringify(filtering),
  });
}

export async function getRegionInsights(dates, filtering) {
  if (!dates) return [];
  const { account } = env();
  return getAllPages(`${account}/insights`, {
    ...dates,
    breakdowns: "region",
    fields: SUMMARY_FIELDS,
    filtering: JSON.stringify(filtering),
  });
}

export async function getPlacementInsights(dates, filtering) {
  if (!dates) return [];
  const { account } = env();
  return getAllPages(`${account}/insights`, {
    ...dates,
    breakdowns: "publisher_platform,platform_position",
    fields: SUMMARY_FIELDS,
    filtering: JSON.stringify(filtering),
  });
}

export async function getPlatformInsights(dates, filtering) {
  if (!dates) return [];
  const { account } = env();
  return getAllPages(`${account}/insights`, {
    ...dates,
    breakdowns: "publisher_platform",
    fields: SUMMARY_FIELDS,
    filtering: JSON.stringify(filtering),
  });
}

export async function getDeviceInsights(dates, filtering) {
  if (!dates) return [];
  const { account } = env();
  return getAllPages(`${account}/insights`, {
    ...dates,
    breakdowns: "impression_device",
    fields: SUMMARY_FIELDS,
    filtering: JSON.stringify(filtering),
  });
}

export async function getAdCountryRows(dates) {
  if (!dates) return [];
  const { account } = env();
  return getAllPages(`${account}/insights`, {
    ...dates,
    level: "ad",
    breakdowns: "country",
    fields: "ad_id,ad_name,campaign_id,campaign_name,objective,spend,impressions,clicks,actions",
  });
}

/**
 * Ad totals without a breakdown. Per-country reach can't be added, and adding
 * per-country spend compounds Meta's rounding, so card totals come from here.
 */
export async function getAdTotalRows(dates) {
  if (!dates) return [];
  const { account } = env();
  return getAllPages(`${account}/insights`, { ...dates, level: "ad", fields: `ad_id,${SUMMARY_FIELDS},${VIDEO_FIELDS}` });
}

const AD_FIELDS =
  "name,effective_status,adset{start_time,end_time},campaign{objective},creative{id,object_type,video_id,thumbnail_url,image_url,effective_object_story_id,object_story_spec{page_id,video_data{video_id,image_url}},asset_feed_spec{videos{video_id}}}";

// Page tokens live only in this server process's memory. They're never cached to disk, logged or returned.
const pageTokens = new Map();

/** A GET with the token in the Authorization header, never in the URL, and never stored in Next's cache. */
function authGet(url, token) {
  return request(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
}

/** Rate limits go back to the caller so the page can fall back. Other errors stay with one video. */
function unlessRateLimit(error) {
  if (!(error instanceof MetaApiError) || error.isRateLimit) throw error;
  return error;
}

function pageTokenFor(pageId) {
  if (!pageTokens.has(pageId)) {
    const lookup = authGet(buildUrl(pageId, { fields: "access_token" }).toString(), env().token).then(
      (page) => page.access_token ?? null,
      (error) => {
        if (!(error instanceof MetaApiError) || error.isRateLimit) {
          pageTokens.delete(pageId);
          throw error;
        }
        // The token's user has no role on this Page. Remember that for this process.
        return null;
      },
    );
    pageTokens.set(pageId, lookup);
  }
  return pageTokens.get(pageId);
}

/**
 * Finds a video's playable file. Meta only returns `source` to the owning Page's token,
 * so the Page token is fetched here and never leaves this function.
 */
async function loadVideoMedia(videoId, fallbackPageId) {
  const { token } = env();
  let info = null;
  try {
    info = await authGet(buildUrl(videoId, { fields: "picture,from,permalink_url" }).toString(), token);
  } catch (error) {
    unlessRateLimit(error);
  }

  const pageId = info?.from?.id ?? fallbackPageId ?? null;
  const sourceUrl = buildUrl(videoId, { fields: "source,picture" }).toString();
  let media = null;
  let reason = pageId ? "no access to the Page" : "owning Page not found";

  const pageToken = pageId ? await pageTokenFor(pageId) : null;
  if (pageToken) {
    try {
      media = await authGet(sourceUrl, pageToken);
      if (!media.source) reason = "the Page token returned no source";
    } catch (error) {
      unlessRateLimit(error);
      if (error.code === 190) pageTokens.delete(pageId);
      reason = `the Page token request failed (code ${error.code})`;
    }
  }

  if (!media?.source) {
    try {
      const viaUser = await authGet(sourceUrl, token);
      if (viaUser.source || !media) media = viaUser;
    } catch (error) {
      unlessRateLimit(error);
    }
  }

  if (!media?.source) console.warn(`[meta] Video ${videoId}: no playable source, because ${reason}.`);
  return {
    source: media?.source ?? null,
    picture: media?.picture ?? info?.picture ?? null,
    permalink: info?.permalink_url ?? null,
  };
}

// The source URL is signed and expires, so results are only kept as long as the other Meta data.
const cachedVideoMedia = unstable_cache(loadVideoMedia, ["meta-video-v1"], {
  revalidate: REVALIDATE_SECONDS,
  tags: [CACHE_TAG],
});

/** Looks up each unique video once, at most 4 at a time. */
async function getVideoMedia(targets) {
  const entries = [...targets];
  const results = new Map();
  let cursor = 0;
  const worker = async () => {
    while (cursor < entries.length) {
      const [videoId, pageId] = entries[cursor];
      cursor += 1;
      results.set(videoId, await cachedVideoMedia(videoId, pageId));
    }
  };
  await Promise.all(Array.from({ length: Math.min(VIDEO_CONCURRENCY, entries.length) }, worker));
  return results;
}

const facebookUrl = (permalink) =>
  permalink ? (permalink.startsWith("http") ? permalink : `https://www.facebook.com${permalink}`) : null;

/** Loads ad details and full-size media. Only call this with IDs from a date-ranged insights response. */
export async function getAdDetails(adIds) {
  // Sorted so the same ads reuse the same cache entry whatever date range asked for them.
  const sortedIds = [...adIds].sort();
  const ads = await batchGet(sortedIds.map((id) => `${id}?fields=${AD_FIELDS}`));

  const videoIdOf = (creative) =>
    creative?.video_id ??
    creative?.object_story_spec?.video_data?.video_id ??
    creative?.asset_feed_spec?.videos?.[0]?.video_id ??
    null;

  // thumbnail_url nested under an ad is only 64x64, so it's re-fetched on the creative node.
  const creativeIds = [...new Set(ads.map((ad) => ad?.creative?.id).filter(Boolean))].sort();
  // Many ads share one video, so each is looked up once, with the creative's Page as a fallback owner.
  const videoTargets = new Map();
  for (const ad of ads) {
    const videoId = videoIdOf(ad?.creative);
    if (videoId && !videoTargets.has(videoId)) videoTargets.set(videoId, ad.creative?.object_story_spec?.page_id ?? null);
  }
  const [creatives, videoById] = await Promise.all([
    batchGet(creativeIds.map((id) => `${id}?fields=thumbnail_url,image_url&thumbnail_width=1200&thumbnail_height=1200`)),
    getVideoMedia(videoTargets),
  ]);
  const creativeById = new Map(creativeIds.map((id, i) => [id, creatives[i]]));

  const details = new Map();
  sortedIds.forEach((id, i) => {
    const ad = ads[i];
    if (!ad) return;
    const videoId = videoIdOf(ad.creative);
    const creative = creativeById.get(ad.creative?.id);
    const video = videoId ? videoById.get(videoId) : null;
    // The 1200x1200 thumbnail is a square crop, so the original image is used when Meta provides one.
    const image = creative?.image_url ?? ad.creative?.image_url ?? creative?.thumbnail_url ?? null;
    details.set(id, {
      status: ad.effective_status ?? null,
      objective: ad.campaign?.objective ?? null,
      adsetStart: ad.adset?.start_time ?? null,
      adsetEnd: ad.adset?.end_time ?? null,
      isVideo: Boolean(videoId) || ad.creative?.object_type === "VIDEO",
      image,
      poster: image ?? video?.picture ?? null,
      videoSource: video?.source ?? null,
      videoPermalink: facebookUrl(video?.permalink),
    });
  });
  return details;
}
