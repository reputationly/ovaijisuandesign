// compute-date-bounds.js
import { detectFileType } from "../canvas/diagnostic-history-tools.js";
export function categorizeByExtension(fileName) {
  if (!fileName) return "other";
  const mediaType = detectFileType(fileName);
  if (mediaType === void 0 || mediaType === "file") return "other";
  return mediaType;
}
const DAY_MS = 24 * 60 * 60 * 1e3;
function startOfDayMs(ms) {
  const d2 = new Date(ms);
  d2.setHours(0, 0, 0, 0);
  return d2.getTime();
}
function endOfDayMs(ms) {
  const d2 = new Date(ms);
  d2.setHours(23, 59, 59, 999);
  return d2.getTime();
}
function parseCustomEndpoint(value, end2) {
  if (!value) return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return end2 === "start" ? startOfDayMs(ms) : endOfDayMs(ms);
}
export function computeDateBounds(filter2, now2) {
  const nowMs = Date.now();
  switch (filter2.kind) {
    case "all":
      return null;
    case "today":
      return {
        fromMs: startOfDayMs(nowMs),
        toMs: nowMs,
      };
    case "last7days":
      return {
        fromMs: nowMs - 7 * DAY_MS,
        toMs: nowMs,
      };
    case "last30days":
      return {
        fromMs: nowMs - 30 * DAY_MS,
        toMs: nowMs,
      };
    case "custom": {
      const from2 = parseCustomEndpoint(filter2.from, "start");
      const to = parseCustomEndpoint(filter2.to, "end");
      if (from2 == null && to == null) return null;
      const fromMs = from2 ?? Number.NEGATIVE_INFINITY;
      const toMs = to ?? Number.POSITIVE_INFINITY;
      if (fromMs > toMs) {
        console.warn(
          "[asset-filter] custom range from > to, ignoring filter:",
          filter2,
        );
        return null;
      }
      return {
        fromMs,
        toMs,
      };
    }
    default: {
      console.warn(
        '[asset-filter] unknown dateFilter.kind, treating as "all":',
        filter2,
      );
      return null;
    }
  }
}
export function matchesDateFilter(timeIso, bounds) {
  if (bounds === null) return true;
  if (!timeIso) return false;
  const ms = Date.parse(timeIso);
  if (Number.isNaN(ms)) {
    if (timeIso)
      console.warn("[asset-filter] unparseable AssetInfo.time:", timeIso);
    return false;
  }
  return ms >= bounds.fromMs && ms <= bounds.toMs;
}
