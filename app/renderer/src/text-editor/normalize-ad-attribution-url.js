// normalize-ad-attribution-url.js

const AD_ATTRIBUTION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1e3;

const AD_ATTRIBUTION_MAX_URL_LENGTH = 2048;

const MAX_INPUT_URL_LENGTH = 8192;

const MAX_PARAM_VALUE_LENGTH = 1024;

const CLOCK_SKEW_MS = 5 * 60 * 1e3;

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

const ADS_PREFIX = "hl_ads_";

const PUBLIC_LANDING_PATH =
  /^\/(?:$|(?:h3|tools|blog|campaign|skill)(?:\/[a-z0-9-]+)*\/?$)/;

const AUTH_PARAM_KEYS = new Set([
  "accesstoken",
  "access_token",
  "idtoken",
  "id_token",
  "refresh_token",
  "token",
  "code",
  "state",
  "login_redirect",
  "redirect_uri",
]);

const LANDING_ORIGINS = {
  domestic: [
    "https://design.minimaxi.com",
    "https://design.minimax.cn",
    "https://hub.minimaxi.com",
    "https://hub-pre.xaminim.com",
  ],
  overseas: [
    "https://design.minimax.io",
    "https://hub.minimax.io",
    "https://hub-test.xaminim.com",
  ],
};

const AD_PARAM_KEYS = new Set([
  "monitorId",
  "trackChannelId",
  "gclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "fbclid",
  "ttclid",
  "twclid",
  "yclid",
  "campaign",
  "adgroup",
  "creative",
  "campaign_id",
  "adgroup_id",
  "creative_id",
  "ad_id",
  "keyword",
  "matchtype",
  "placement",
]);

function isAdParam(key2) {
  return AD_PARAM_KEYS.has(key2) || /^utm_[a-z0-9_]{1,48}$/.test(key2);
}

function normalizeAdAttributionUrl(value, region) {
  if (
    typeof value !== "string" ||
    value.length > MAX_INPUT_URL_LENGTH ||
    CONTROL_CHARACTERS.test(value)
  )
    return null;
  try {
    const source = new URL(value);
    const origins = region
      ? LANDING_ORIGINS[region]
      : Object.values(LANDING_ORIGINS).flat();
    if (source.username || source.password || !origins.includes(source.origin))
      return null;
    const params = new URLSearchParams();
    for (const prefixed of [false, true]) {
      for (const key2 of new Set(source.searchParams.keys())) {
        if (key2.startsWith(ADS_PREFIX) !== prefixed) continue;
        const canonicalKey = prefixed ? key2.slice(ADS_PREFIX.length) : key2;
        if (!isAdParam(canonicalKey)) continue;
        const values3 = source.searchParams.getAll(key2).filter(Boolean);
        if (new Set(values3).size > 1) return null;
        const param = values3[0];
        if (!param) continue;
        if (
          param.length > MAX_PARAM_VALUE_LENGTH ||
          CONTROL_CHARACTERS.test(param)
        )
          return null;
        if (!params.has(canonicalKey)) params.set(canonicalKey, param);
      }
    }
    if (
      params.size === 0 &&
      (!PUBLIC_LANDING_PATH.test(source.pathname) ||
        [...source.searchParams.keys()].some((key2) =>
          AUTH_PARAM_KEYS.has(key2.toLowerCase()),
        ))
    )
      return null;
    if (!params.has("utm_media_source") && params.has("utm_source")) {
      params.set("utm_media_source", params.get("utm_source") ?? "");
    }
    const sanitized = new URL(source.href);
    sanitized.hash = "";
    sanitized.search = params.toString();
    const result = sanitized.toString();
    return result.length <= AD_ATTRIBUTION_MAX_URL_LENGTH ? result : null;
  } catch {
    return null;
  }
}

export function normalizeAdAttribution(value, now2 = Date.now(), region) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record2 = value;
  const { capturedAt, expiresAt } = record2;
  if (
    record2.v !== 1 ||
    typeof capturedAt !== "number" ||
    typeof expiresAt !== "number" ||
    !Number.isSafeInteger(capturedAt) ||
    !Number.isSafeInteger(expiresAt) ||
    capturedAt <= 0 ||
    capturedAt > now2 + CLOCK_SKEW_MS ||
    expiresAt <= now2 ||
    expiresAt <= capturedAt ||
    expiresAt - capturedAt > AD_ATTRIBUTION_MAX_AGE_MS
  )
    return null;
  const url2 = normalizeAdAttributionUrl(record2.url, region);
  return url2
    ? {
        v: 1,
        url: url2,
        capturedAt,
        expiresAt,
      }
    : null;
}
