// bucket-item-count.js

export const MAX_MOUNTED_ITEMS = 500;

export function elapsedMs(start2, end2) {
  if (!Number.isFinite(start2) || !Number.isFinite(end2)) return 0;
  return Math.round(Math.max(0, end2 - start2) * 100) / 100;
}

export function boundedCount(count2, max2) {
  if (!Number.isFinite(count2)) return count2 > 0 ? max2 : 0;
  return Math.min(Math.max(Math.trunc(count2), 0), max2);
}

export function bucketItemCount(count2) {
  const normalized = boundedCount(count2, Number.MAX_SAFE_INTEGER);
  if (normalized === 0) return "0";
  if (normalized <= 20) return "1-20";
  if (normalized <= 50) return "21-50";
  if (normalized <= 100) return "51-100";
  if (normalized <= 250) return "101-250";
  return "251+";
}
