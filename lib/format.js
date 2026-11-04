import { format, parseISO } from "date-fns";

export function formatMoney(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value || 0);
}

/** Below 0.01, shows 2 significant figures instead of rounding down to $0.00. */
export function formatCostPerResult(value, currency = "USD") {
  if (value > 0 && value < 0.01) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumSignificantDigits: 2,
      maximumSignificantDigits: 2,
    }).format(value);
  }
  return formatMoney(value, currency);
}

/** Shows very small costs to 3 significant figures, so $0.000112 doesn't round to $0.00. */
export function formatSmallCost(value, currency = "USD") {
  if (value > 0 && value < 1) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumSignificantDigits: 3,
      maximumSignificantDigits: 3,
    }).format(value);
  }
  return formatMoney(value, currency);
}

export const formatNumber = (value) => new Intl.NumberFormat("en-US").format(Math.round(value || 0));
export const formatPercent = (value) => `${(value || 0).toFixed(2)}%`;
export const formatRatio = (value) => (value || 0).toFixed(2);

export function formatDay(iso) {
  if (!iso) return "";
  // Keep the calendar date Meta sent, so it reads the same on the server and in any browser.
  const date = parseISO(String(iso).slice(0, 10));
  return Number.isNaN(date.getTime()) ? "" : format(date, "d MMM yyyy");
}

export function formatDuration(seconds) {
  const total = Math.round(seconds || 0);
  if (total < 60) return `${total}s`;
  const rest = total % 60;
  return rest ? `${Math.floor(total / 60)}m ${rest}s` : `${Math.floor(total / 60)}m`;
}
