// bucket-item-count.js

export const MAX_MOUNTED_ITEMS = 500;

export function elapsedMs(start, end) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round(Math.max(0, end - start) * 100) / 100;
}

export function boundedCount(count, max) {
  if (!Number.isFinite(count)) return count > 0 ? max : 0;
  return Math.min(Math.max(Math.trunc(count), 0), max);
}

export function bucketItemCount(count) {
  const normalized = boundedCount(count, Number.MAX_SAFE_INTEGER);
  if (normalized === 0) return "0";
  if (normalized <= 20) return "1-20";
  if (normalized <= 50) return "21-50";
  if (normalized <= 100) return "51-100";
  if (normalized <= 250) return "101-250";
  return "251+";
}
