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
  const text2 = nonEmptyString(value);
  return text2 && CONFIG_IDENTIFIER_PATTERN.test(text2) ? text2 : void 0;
}
export function parseLocalizedText(value) {
  if (typeof value === "string") {
    const text2 = nonEmptyString(value);
    return text2
      ? {
          zh: text2,
          en: text2,
        }
      : null;
  }
  if (!isRecord(value)) return null;
  const zh2 = nonEmptyString(value.zh);
  const en2 = nonEmptyString(value.en);
  if (!zh2 && !en2) return null;
  return {
    zh: zh2 ?? en2 ?? "",
    en: en2 ?? zh2 ?? "",
  };
}
export function parseOptionalLocalizedText(value) {
  return parseLocalizedText(value) ?? void 0;
}
export function uniqueBy(items, getKey) {
  const seen2 = new Set();
  return items.filter((item) => {
    const key2 = getKey(item);
    if (!key2 || seen2.has(key2)) return false;
    seen2.add(key2);
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
