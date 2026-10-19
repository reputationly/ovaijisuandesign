export function formatSeconds(value, fallback) {
  if (value === void 0 || !Number.isFinite(value)) return fallback;
  return Number.isInteger(value) ? String(value) : String(value);
}