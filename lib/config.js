export const BRAND = "Shokubutsu";

export const MARKET = { label: "Bangladesh", code: "BD", keyword: "bangladesh" };

// Used only if Meta won't return the account's settings because of a rate limit.
export const ACCOUNT_FALLBACK = { currency: "USD", timezone_name: "Asia/Dhaka" };

export const RANGES = [
  { value: "today", label: "Today", preset: "today" },
  { value: "yesterday", label: "Yesterday", preset: "yesterday" },
  { value: "last_7d", label: "Last 7 days", preset: "last_7d" },
  { value: "last_14d", label: "Last 14 days", preset: "last_14d" },
  { value: "last_30d", label: "Last 30 days", preset: "last_30d" },
  { value: "last_90d", label: "Last 90 days", preset: "last_90d" },
  { value: "this_month", label: "This month", preset: "this_month" },
  { value: "last_month", label: "Last month", preset: "last_month" },
  { value: "lifetime", label: "Lifetime", preset: "maximum" },
];

export const DEFAULT_RANGE = "last_14d";
export const CUSTOM_RANGE = "custom";

export const CAMPAIGN_TYPES = ["Reach", "Engagement", "Traffic", "Page Visit", "Page Like", "Other"];
