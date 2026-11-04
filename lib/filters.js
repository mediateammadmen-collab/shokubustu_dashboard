import { isValid, parse } from "date-fns";
import { CUSTOM_RANGE, DEFAULT_RANGE, MARKET, RANGES } from "./config.js";

const isDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  isValid(parse(value, "yyyy-MM-dd", new Date()));

const first = (value) => (Array.isArray(value) ? value[0] : value);

/** Normalises raw URL params. Anything invalid falls back to the defaults. */
export function parseFilters(raw = {}) {
  const range = first(raw.range);
  let start = first(raw.start);
  let end = first(raw.end);

  const filters = {
    market: MARKET,
    range: DEFAULT_RANGE,
    start: null,
    end: null,
  };

  if (range === CUSTOM_RANGE && isDate(start) && isDate(end)) {
    if (start > end) [start, end] = [end, start];
    return { ...filters, range: CUSTOM_RANGE, start, end };
  }
  if (RANGES.some((r) => r.value === range)) filters.range = range;
  return filters;
}
