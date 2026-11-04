import { MARKET } from "./config.js";

const FORMATS = [
  ["Influencer Reel", "influ(?:encer|cner)\\s+reel"],
  ["Influencer Video", "influ(?:encer|cner)\\s+video"],
  ["Carousel", "carousel"],
  ["Dynamic", "dynamic|dyanmic"],
  ["Static", "static"],
  ["Reel", "reel"],
  ["Video", "video"],
].map(([label, pattern]) => ({
  label,
  // The tag must fill the segment, or be followed by ":" or a spaced dash.
  // That keeps body copy such as "Dynamic Island" from matching.
  regex: new RegExp(`^\\s*(?:${pattern})\\s*(?:(?::|\\s[-–—])\\s*(.*))?$`, "i"),
}));

const clean = (text) =>
  text
    .replace(/^[\s\-–—|:]+/, "")
    .replace(/[\s\-–—|:]+$/, "")
    .replace(/\s+/g, " ");

/** Splits an ad name into a display title and an optional format tag. */
export function parseAdName(name = "") {
  const tokens = name.split(/(\||\s[-–—]\s)/);
  for (let i = 0; i < tokens.length; i += 2) {
    for (const format of FORMATS) {
      const match = tokens[i].match(format.regex);
      if (!match) continue;
      const rest = (match[1] ?? "").trim();
      const next = [...tokens];
      if (rest) next[i] = rest;
      else if (i + 1 < next.length) next.splice(i, 2);
      else next.splice(Math.max(i - 1, 0), 2);
      return { title: clean(next.join("")) || clean(name), format: format.label };
    }
  }
  return { title: clean(name), format: null };
}

const TYPE_KEYWORDS = ["Reach", "Engagement", "Traffic", "Page Visit", "Page Like"];

/** Campaign type is whichever keyword appears earliest in the campaign name. */
export function campaignType(campaignName = "") {
  const lower = campaignName.toLowerCase();
  let best = "Other";
  let bestIndex = Infinity;
  for (const type of TYPE_KEYWORDS) {
    const index = lower.indexOf(type.toLowerCase());
    if (index !== -1 && index < bestIndex) {
      best = type;
      bestIndex = index;
    }
  }
  return best;
}

export function marketFromCampaign(campaignName = "") {
  return campaignName.toLowerCase().includes(MARKET.keyword) ? MARKET : null;
}

/** Campaign country first, then any other delivery countries: "Bangladesh, IN". */
export function displayCountries(market, deliveryCodes = []) {
  const known = deliveryCodes.filter((code) => code && code !== "unknown");
  if (!market) return known.join(", ");
  return [market.label, ...known.filter((code) => code !== market.code)].join(", ");
}

/** The metric a campaign type is judged on. Reach is handled by the caller because it can't be added. */
export function resultFor(type, metrics) {
  switch (type) {
    case "Reach":
      return { label: "Reach", value: metrics.reach };
    case "Engagement":
      return { label: "Engagements", value: metrics.engagements };
    case "Page Visit":
      return { label: "Profile visits", value: metrics.profileVisits };
    case "Page Like":
      return { label: "Page likes", value: metrics.pageLikes };
    default:
      return { label: "Link clicks", value: metrics.linkClicks };
  }
}

export function formatObjective(objective) {
  if (!objective) return "";
  const words = objective.replace(/^OUTCOME_/, "").replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const PLATFORM_NAMES = { facebook: "Facebook", instagram: "Instagram", audience_network: "Audience Network", messenger: "Messenger", threads: "Threads" };
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/** Turns Meta's values into a readable name: instagram + instagram_reels becomes "Instagram Reels". */
export function placementLabel(platform = "", position = "") {
  if (platform === "unknown" || !platform) return "Unknown";
  const name = PLATFORM_NAMES[platform] ?? capitalize(platform.replaceAll("_", " "));
  const place = position
    .replace(new RegExp(`^(?:${platform}|an)_`), "")
    .replaceAll("_", " ");
  return `${name} ${capitalize(place)}`.trim();
}

export function platformLabel(platform = "") {
  if (platform === "unknown" || !platform) return "Unknown";
  return PLATFORM_NAMES[platform] ?? capitalize(platform.replaceAll("_", " "));
}

const DEVICE_NAMES = { iphone: "iPhone", ipad: "iPad", ipod: "iPod" };

export function deviceLabel(device = "") {
  if (!device) return "Unknown";
  return DEVICE_NAMES[device] ?? capitalize(device.replaceAll("_", " "));
}

/** Meta has no operating system breakdown, so it's worked out from the device. Desktop can't be split further. */
export function osFromDevice(device = "") {
  if (device.startsWith("android")) return "Android";
  if (["iphone", "ipad", "ipod"].includes(device)) return "iOS";
  if (device === "desktop") return "Desktop";
  return "Other";
}
