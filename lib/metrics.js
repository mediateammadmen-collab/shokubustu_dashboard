/** Division guarded against zero, missing and non-finite values. */
export function safeDivide(numerator, denominator) {
  const n = Number(numerator);
  const d = Number(denominator);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return 0;
  return n / d;
}

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const ACTION_TYPES = {
  engagements: ["post_engagement"],
  postReactions: ["post_reaction"],
  comments: ["comment"],
  shares: ["post"],
  saves: ["onsite_conversion.post_save"],
  videoViews: ["video_view"],
  linkClicks: ["link_click"],
  pageLikes: ["like"],
  profileVisits: ["onsite_conversion.profile_visit", "ig_profile_visit", "page_visit"],
};

export function emptyCounts() {
  return {
    spend: 0,
    impressions: 0,
    clicks: 0,
    engagements: 0,
    postReactions: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    videoViews: 0,
    linkClicks: 0,
    pageLikes: 0,
    profileVisits: 0,
  };
}

/** Reads the additive raw counts from one Meta insights row. Reach is left out because it can't be added. */
export function countsFromRow(row = {}) {
  const counts = emptyCounts();
  counts.spend = toNumber(row.spend);
  counts.impressions = toNumber(row.impressions);
  counts.clicks = toNumber(row.clicks);
  for (const action of row.actions ?? []) {
    for (const [key, types] of Object.entries(ACTION_TYPES)) {
      if (types.includes(action.action_type)) counts[key] += toNumber(action.value);
    }
  }
  return counts;
}

export function addCounts(a, b) {
  const sum = {};
  for (const key of Object.keys(a)) sum[key] = a[key] + b[key];
  return sum;
}

/** Derives every rate from raw totals. Rates are never averaged. */
export function deriveMetrics(counts, reach) {
  const interactions = counts.postReactions + counts.comments + counts.shares + counts.saves;
  return {
    ...counts,
    reach,
    interactions,
    engagementRate: safeDivide(counts.engagements, counts.impressions) * 100,
    interactionRate: safeDivide(interactions, reach) * 100,
    ctr: safeDivide(counts.clicks, counts.impressions) * 100,
    cpm: safeDivide(counts.spend, counts.impressions) * 1000,
    cpc: safeDivide(counts.spend, counts.clicks),
    frequency: safeDivide(counts.impressions, reach),
    costPerEngagement: safeDivide(counts.spend, counts.engagements),
  };
}

export const VIDEO_FIELDS = [
  "video_play_actions",
  "video_thruplay_watched_actions",
  "video_p25_watched_actions",
  "video_p50_watched_actions",
  "video_p75_watched_actions",
  "video_p95_watched_actions",
  "video_p100_watched_actions",
  "video_avg_time_watched_actions",
].join(",");

const sumActions = (actions) => (actions ?? []).reduce((sum, action) => sum + toNumber(action.value), 0);

/** Video watch metrics for one ad row. Cost per ThruPlay is worked out from the raw totals. */
export function videoMetrics(row = {}) {
  const thruplays = sumActions(row.video_thruplay_watched_actions);
  return {
    plays: sumActions(row.video_play_actions),
    thruplays,
    costPerThruplay: safeDivide(row.spend, thruplays),
    p25: sumActions(row.video_p25_watched_actions),
    p50: sumActions(row.video_p50_watched_actions),
    p75: sumActions(row.video_p75_watched_actions),
    p95: sumActions(row.video_p95_watched_actions),
    p100: sumActions(row.video_p100_watched_actions),
    avgWatchSeconds: sumActions(row.video_avg_time_watched_actions),
  };
}

const resultName = (indicator = "") => {
  const words = indicator.replace(/^.*[:.]/, "").replaceAll("_", " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Other";
};

const sumValues = (entry) => (entry?.values ?? []).reduce((sum, item) => sum + toNumber(item.value), 0);

/**
 * Reads Meta's Results and Cost per result fields. Different result types stay separate
 * because they can't be added together. For reach, Meta's cost is spend / reach x 1,000.
 */
export function resultsFromRow(row = {}) {
  return (row.results ?? []).map((result) => {
    const cost = (row.cost_per_result ?? []).find((entry) => entry.indicator === result.indicator);
    return {
      label: resultName(result.indicator),
      value: sumValues(result),
      cost: cost ? sumValues(cost) : null,
    };
  });
}
