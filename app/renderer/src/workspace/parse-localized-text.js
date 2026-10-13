// parse-localized-text.js
import { getRuntimeConfig } from "../vendor.js";
import { normalizeHomeQuickStartAssetUrl } from "../generation/use-skill-categories.js";
export const HOME_QUICK_START_SCHEMA_VERSION = 2;
export const HOME_QUICK_START_MAX_SECTIONS = 16;
export const HOME_QUICK_START_MAX_ITEMS_PER_SECTION = 64;
export function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function nonEmptyString(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
}
const CONFIG_IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/;
export function configIdentifier(value) {
  const text = nonEmptyString(value);
  return text && CONFIG_IDENTIFIER_PATTERN.test(text) ? text : void 0;
}
export function parseLocalizedText(value) {
  if (typeof value === "string") {
    const text = nonEmptyString(value);
    return text
      ? {
          zh: text,
          en: text,
        }
      : null;
  }
  if (!isRecord(value)) return null;
  const zh = nonEmptyString(value.zh);
  const en = nonEmptyString(value.en);
  if (!zh && !en) return null;
  return {
    zh: zh ?? en ?? "",
    en: en ?? zh ?? "",
  };
}
export function parseOptionalLocalizedText(value) {
  return parseLocalizedText(value) ?? void 0;
}
export function uniqueBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export function runtimeRegion() {
  try {
    return getRuntimeConfig().region;
  } catch {
    return "domestic";
  }
}
export function normalizeConfiguredAssetUrl(value) {
  if (!isRecord(value)) return normalizeHomeQuickStartAssetUrl(value);
  const domesticUrl = normalizeHomeQuickStartAssetUrl(value.domestic);
  if (runtimeRegion() === "domestic") return domesticUrl;
  return normalizeHomeQuickStartAssetUrl(value.overseas) ?? domesticUrl;
}
