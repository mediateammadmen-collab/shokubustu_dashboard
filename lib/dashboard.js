import "server-only";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import {
  campaignType,
  deviceLabel,
  displayCountries,
  formatObjective,
  marketFromCampaign,
  osFromDevice,
  parseAdName,
  placementLabel,
  platformLabel,
  resultFor,
} from "./ads.js";
import { CAMPAIGN_TYPES } from "./config.js";
import {
  dateParams,
  getAccount,
  getAccountInsights,
  getAdCountryRows,
  getAdDetails,
  getAdTotalRows,
  getAgeInsights,
  getDailyInsights,
  getDeviceInsights,
  getPlacementInsights,
  getPlatformInsights,
  getRegionInsights,
  MetaApiError,
} from "./meta.js";
import { withLastGood } from "./last-good.js";
import { addCounts, countsFromRow, deriveMetrics, emptyCounts, resultsFromRow, safeDivide, videoMetrics } from "./metrics.js";

const TOP_CONTENT_COUNT = 3;

const round2 = (value) => Math.round(value * 100) / 100;

function nameFilter(keyword) {
  return [{ field: "campaign.name", operator: "CONTAIN", value: keyword }];
}

/** Fills in the days Meta leaves out, so a day with no delivery plots as 0 rather than being skipped. */
function fillDays(rows, dateStart, dateStop) {
  if (!dateStart || !dateStop) return [];
  const byDate = new Map(rows.map((row) => [row.date_start, row]));
  return eachDayOfInterval({ start: parseISO(dateStart), end: parseISO(dateStop) }).map((day) => {
    const date = format(day, "yyyy-MM-dd");
    const row = byDate.get(date);
    const spend = Number(row?.spend) || 0;
    const impressions = Number(row?.impressions) || 0;
    const reach = Number(row?.reach) || 0;
    return {
      date,
      spend,
      reach,
      impressions,
      frequency: reach > 0 ? safeDivide(impressions, reach) : null,
      // No impressions means CPM doesn't exist for that day, so the chart shows a gap rather than $0.
      cpm: impressions > 0 ? safeDivide(spend, impressions) * 1000 : null,
    };
  });
}

/** Groups device rows by operating system. Reach can't be added across devices, so it's left empty. */
function operatingSystemRows(deviceRows) {
  const totals = new Map();
  for (const row of deviceRows) {
    const os = osFromDevice(row.impression_device);
    totals.set(os, addCounts(totals.get(os) ?? emptyCounts(), countsFromRow(row)));
  }
  return [...totals]
    .map(([os, counts]) => ({ os, ...deriveMetrics(counts, 0), reach: null, frequency: null }))
    .sort((a, b) => b.spend - a.spend);
}

/** Summary metrics for campaigns whose name contains the market keyword. */
async function loadInsights(filters) {
  const account = await getAccount();
  const dates = dateParams(filters, account.timezone_name);
  const filtering = nameFilter(filters.market.keyword);
  const [row, dailyRows, ageRows, regionRows, placementRows, platformRows, deviceRows] = await Promise.all([
    getAccountInsights(dates, filtering),
    getDailyInsights(dates, filtering),
    getAgeInsights(dates, filtering),
    getRegionInsights(dates, filtering),
    getPlacementInsights(dates, filtering),
    getPlatformInsights(dates, filtering),
    getDeviceInsights(dates, filtering),
  ]);

  return {
    currency: account.currency,
    timezone: account.timezone_name,
    dateStart: row?.date_start ?? null,
    dateStop: row?.date_stop ?? null,
    summary: { ...deriveMetrics(countsFromRow(row ?? {}), Number(row?.reach) || 0), results: resultsFromRow(row ?? {}) },
    daily: fillDays(dailyRows, row?.date_start, row?.date_stop),
    locations: regionRows
      .map((region) => ({ location: region.region, ...deriveMetrics(countsFromRow(region), Number(region.reach) || 0) }))
      .sort((a, b) => b.spend - a.spend),
    platforms: platformRows
      .map((platform) => ({
        platform: platformLabel(platform.publisher_platform),
        ...deriveMetrics(countsFromRow(platform), Number(platform.reach) || 0),
      }))
      .sort((a, b) => b.spend - a.spend),
    devices: deviceRows
      .map((device) => ({
        device: deviceLabel(device.impression_device),
        ...deriveMetrics(countsFromRow(device), Number(device.reach) || 0),
      }))
      .sort((a, b) => b.spend - a.spend),
    operatingSystems: operatingSystemRows(deviceRows),
    placements: placementRows
      .map((placement) => ({
        placement: placementLabel(placement.publisher_platform, placement.platform_position),
        ...deriveMetrics(countsFromRow(placement), Number(placement.reach) || 0),
      }))
      .sort((a, b) => b.spend - a.spend),
    ageBreakdown: ageRows
      .map((age) => ({
        age: age.age,
        spend: Number(age.spend) || 0,
        impressions: Number(age.impressions) || 0,
        reach: Number(age.reach) || 0,
      }))
      // Meta's age labels sort correctly as text. "Unknown" goes last.
      .sort((a, b) => (a.age === "Unknown") - (b.age === "Unknown") || a.age.localeCompare(b.age)),
  };
}

function groupTotals(ads) {
  return ads.reduce((total, ad) => addCounts(total, ad.counts), emptyCounts());
}

/** De-duplicated reach for a group of campaigns, so reach is never added up. */
async function campaignReach(dates, campaignIds) {
  if (!campaignIds.length) return 0;
  const row = await getAccountInsights(dates, [{ field: "campaign.id", operator: "IN", value: campaignIds }]);
  return Number(row?.reach) || 0;
}

const uniqueCampaigns = (ads) => [...new Set(ads.map((ad) => ad.campaignId))];

/** Ad cards, sorted by spend, with their tabs and group totals. */
async function loadCreatives(filters) {
  const account = await getAccount();
  const dates = dateParams(filters, account.timezone_name);
  const [countryRows, totalRows] = await Promise.all([getAdCountryRows(dates), getAdTotalRows(dates)]);

  const totalsByAd = new Map(totalRows.map((row) => [row.ad_id, row]));
  const byAd = new Map();
  for (const row of countryRows) {
    const market = marketFromCampaign(row.campaign_name);
    if (market?.code !== filters.market.code) continue;
    let ad = byAd.get(row.ad_id);
    if (!ad) {
      ad = { row, market, delivery: new Set() };
      byAd.set(row.ad_id, ad);
    }
    if (row.country) ad.delivery.add(row.country);
  }

  const details = await getAdDetails([...byAd.keys()]);

  const ads = [...byAd.entries()].map(([id, { row, market, delivery }]) => {
    const totals = totalsByAd.get(id) ?? {};
    const counts = countsFromRow(totals);
    const detail = details.get(id) ?? {};
    const type = campaignType(row.campaign_name);
    const metrics = deriveMetrics(counts, Number(totals.reach) || 0);
    const { title, format } = parseAdName(row.ad_name);
    const isVideo = Boolean(detail.isVideo);
    return {
      id,
      name: row.ad_name,
      title,
      format,
      status: detail.status ?? null,
      campaignId: row.campaign_id,
      campaignName: row.campaign_name,
      campaignType: type,
      objective: formatObjective(detail.objective ?? row.objective),
      countries: displayCountries(market, [...delivery]),
      adsetStart: detail.adsetStart ?? null,
      adsetEnd: detail.adsetEnd ?? null,
      isVideo,
      image: detail.image ?? null,
      poster: detail.poster ?? null,
      videoSource: detail.videoSource ?? null,
      counts,
      metrics: { ...metrics, videoViews: isVideo ? metrics.videoViews : 0 },
      video: isVideo ? videoMetrics(totals) : null,
      result: resultFor(type, metrics),
    };
  });
  ads.sort((a, b) => b.metrics.spend - a.metrics.spend);

  const typeGroups = CAMPAIGN_TYPES.map((type) => ({ type, ads: ads.filter((ad) => ad.campaignType === type) })).filter(
    (group) => group.ads.length,
  );

  const typeResults = await Promise.all(
    typeGroups.map(async ({ type, ads: groupAds }) => {
      const totals = groupTotals(groupAds);
      const reach = type === "Reach" ? await campaignReach(dates, uniqueCampaigns(groupAds)) : 0;
      return { type, ...resultFor(type, deriveMetrics(totals, reach)) };
    }),
  );

  const topContent = ads
    .filter((ad) => ad.campaignType === "Engagement" && ad.metrics.engagements > 0)
    .sort((a, b) => safeDivide(a.metrics.spend, a.metrics.engagements) - safeDivide(b.metrics.spend, b.metrics.engagements))
    .slice(0, TOP_CONTENT_COUNT);

  const group = (key, label, groupAds, results) => ({
    key,
    label,
    count: groupAds.length,
    spend: round2(groupTotals(groupAds).spend),
    results,
    adIds: groupAds.map((ad) => ad.id),
  });

  const groups = [
    group("all", "All", ads, typeResults),
    group("top", "Top Content", topContent, topContent.length
      ? [{ type: "Engagement", label: "Engagements", value: groupTotals(topContent).engagements }]
      : []),
    ...typeGroups.map(({ type, ads: groupAds }) =>
      group(type, type, groupAds, typeResults.filter((result) => result.type === type)),
    ),
  ];

  return {
    currency: account.currency,
    totalSpend: round2(groupTotals(ads).spend),
    detailsMissing: ads.filter((ad) => !details.has(ad.id)).length,
    ads: ads.map(({ counts: _counts, ...ad }) => ad),
    groups,
  };
}

const isRateLimited = (error) => error instanceof MetaApiError && error.isRateLimit;
const savedKey = (kind, { range, start, end }) => JSON.stringify([kind, range, start, end]);

export function getInsights(filters) {
  return withLastGood(savedKey("insights", filters), () => loadInsights(filters), { shouldFallback: isRateLimited });
}

export function getCreatives(filters) {
  return withLastGood(savedKey("creatives", filters), () => loadCreatives(filters), {
    shouldFallback: isRateLimited,
    // A result with missing images must not replace a complete one.
    shouldSave: (data) => data.detailsMissing === 0,
  });
}
