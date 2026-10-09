// parse-home-survey.js
import { DEFAULT_HOME_WIDGET_CONFIG } from "../workspace/tool-label-definitions.js";
import {
  DEFAULT_MODAL_SCHEDULE_CONFIG,
  STARTUP_MODAL_IDS,
} from "../infra/schedule.js";
import { API_PATHS, useQuery, useTranslation } from "../vendor.js";
import { setToolCallDisplayConfig } from "./request-prompt-prefill.jsx";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { useRuntimeConfig } from "../generation/use-model-catalog-scope-key.js";
import { useGatewayReady } from "../infra/inline-rename-input.jsx";
const VIDEO_STARTER_PRESETS_SCHEMA_VERSION = 1;
const MAX_PRESET_ITEMS = 8;
const MAX_PRESET_REFS = 12;
const MAX_PARAM_ENTRIES = 16;
const PRESET_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const REF_TYPES = new Set(["image", "video", "audio"]);
function isRecord$f(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonEmptyString(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
}
function localizedString(value, locale) {
  if (typeof value === "string") return nonEmptyString(value);
  if (!isRecord$f(value)) return void 0;
  return (
    nonEmptyString(value[locale]) ??
    nonEmptyString(value[locale === "zh" ? "en" : "zh"])
  );
}
function localizedText$1(value, locale) {
  if (typeof value === "string") return value.trim();
  if (!isRecord$f(value)) return "";
  const primary = value[locale];
  if (typeof primary === "string") return primary.trim();
  const fallback = value[locale === "zh" ? "en" : "zh"];
  return typeof fallback === "string" ? fallback.trim() : "";
}
function httpsUrl(value, locale) {
  const text2 = localizedString(value, locale);
  if (!text2) return void 0;
  try {
    const url2 = new URL(text2);
    if (
      url2.protocol !== "https:" ||
      url2.username !== "" ||
      url2.password !== ""
    ) {
      return void 0;
    }
    return url2.toString();
  } catch {
    return void 0;
  }
}
function parseParams(value) {
  if (!isRecord$f(value)) return {};
  const out = {};
  let count2 = 0;
  for (const [key2, raw2] of Object.entries(value)) {
    if (count2 >= MAX_PARAM_ENTRIES) break;
    const parsedKey = nonEmptyString(key2);
    if (!parsedKey || typeof raw2 !== "string") continue;
    out[parsedKey] = raw2;
    count2 += 1;
  }
  return out;
}
function parseRef(value, locale) {
  if (!isRecord$f(value)) return void 0;
  const url2 = httpsUrl(value.url, locale);
  const name2 = localizedString(value.name, locale);
  const type2 = nonEmptyString(value.type);
  if (!url2 || !name2 || !type2 || !REF_TYPES.has(type2)) {
    return void 0;
  }
  return {
    url: url2,
    name: name2,
    type: type2,
  };
}
function parseItem(value, locale) {
  if (!isRecord$f(value)) return void 0;
  const id2 = nonEmptyString(value.id);
  if (!id2 || !PRESET_ID_PATTERN.test(id2)) return void 0;
  const title = localizedString(value.title, locale);
  if (!title) return void 0;
  const prompt = localizedText$1(value.prompt, locale);
  const modelId = nonEmptyString(value.model_id);
  const refs = Array.isArray(value.refs)
    ? value.refs.slice(0, MAX_PRESET_REFS).flatMap((ref) => {
        const parsed = parseRef(ref, locale);
        return parsed ? [parsed] : [];
      })
    : [];
  return {
    id: id2,
    title,
    prompt,
    ...(modelId
      ? {
          modelId,
        }
      : {}),
    params: parseParams(value.params),
    refs,
  };
}
function parseVideoStarterPresets(raw2, locale = "en") {
  if (!isRecord$f(raw2)) return [];
  if (raw2.schema_version !== VIDEO_STARTER_PRESETS_SCHEMA_VERSION) return [];
  if (raw2.enabled !== true) return [];
  if (!Array.isArray(raw2.items)) return [];
  const seen2 = new Set();
  const items = [];
  for (const rawItem of raw2.items.slice(0, MAX_PRESET_ITEMS)) {
    const parsed = parseItem(rawItem, locale);
    if (!parsed || seen2.has(parsed.id)) continue;
    seen2.add(parsed.id);
    items.push(parsed);
  }
  return items;
}
const KNOWN_IDS = Object.values(STARTUP_MODAL_IDS);
function parseIdList(raw2) {
  if (!Array.isArray(raw2)) return null;
  const out = [];
  for (const item of raw2) {
    if (typeof item !== "string") continue;
    if (!KNOWN_IDS.includes(item)) continue;
    if (out.includes(item)) continue;
    out.push(item);
  }
  return out;
}
function parseBoundedNumber(raw2, min2, max2, fallback) {
  if (typeof raw2 !== "number" || !Number.isFinite(raw2)) return fallback;
  if (raw2 < min2 || raw2 > max2) return fallback;
  return Math.floor(raw2);
}
function parseStartupModalSchedule(raw2) {
  if (!raw2 || typeof raw2 !== "object" || Array.isArray(raw2)) {
    return DEFAULT_MODAL_SCHEDULE_CONFIG;
  }
  const cfg = raw2;
  const configuredOrder = parseIdList(cfg.order) ?? [];
  const order2 = [
    ...configuredOrder,
    ...DEFAULT_MODAL_SCHEDULE_CONFIG.order.filter(
      (id2) => !configuredOrder.includes(id2),
    ),
  ];
  const disabled2 = (parseIdList(cfg.disabled) ?? []).filter(
    // 合规红线:水印首启弹窗不允许通过远端配置关闭。
    (id2) => id2 !== STARTUP_MODAL_IDS.watermarkOnboarding,
  );
  return {
    order: order2,
    disabled: disabled2,
    maxPerLaunch: parseBoundedNumber(
      cfg.max_per_launch,
      1,
      20,
      DEFAULT_MODAL_SCHEDULE_CONFIG.maxPerLaunch,
    ),
    minGapMs: parseBoundedNumber(
      cfg.min_gap_ms,
      0,
      3e4,
      DEFAULT_MODAL_SCHEDULE_CONFIG.minGapMs,
    ),
    firstGrantDelayMs: parseBoundedNumber(
      cfg.first_grant_delay_ms,
      0,
      1e4,
      DEFAULT_MODAL_SCHEDULE_CONFIG.firstGrantDelayMs,
    ),
  };
}
const HOME_WIDGET_KINDS = ["update", "survey"];
const DEFAULT_UPDATE_WIDGET_CONFIG = {
  imageUrl: null,
};
async function refreshToolCallDisplayConfig() {
  try {
    const response = await gatewayFetch(
      API_PATHS.apolloConfig("tool_call_display_config"),
    );
    if (!response.ok) return;
    const raw2 = await response.json();
    setToolCallDisplayConfig(raw2);
  } catch {}
}
const DEFAULT_HUB_CLIENT_CONFIG = {
  whatsNewEnabled: true,
  videoStarterPresets: [],
  startupModalSchedule: DEFAULT_MODAL_SCHEDULE_CONFIG,
  homeWidget: DEFAULT_HOME_WIDGET_CONFIG,
  updateWidget: DEFAULT_UPDATE_WIDGET_CONFIG,
};
const HUB_CLIENT_CONFIG_REFRESH_INTERVAL_MS = 6e4;
function isRecord$b(value) {
  return typeof value === "object" && value !== null;
}
function safeHttpsUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" || parsed.username || parsed.password)
      return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
function localizedText(value, locale) {
  if (typeof value === "string") return value.trim();
  if (!isRecord$b(value)) return "";
  const keys2 =
    locale === "zh"
      ? ["zh-Hans", "zh", "en"]
      : ["en", "en-US", "zh-Hans", "zh"];
  for (const key2 of keys2) {
    const candidate = value[key2];
    if (typeof candidate === "string" && candidate.trim())
      return candidate.trim();
  }
  return "";
}
function plainText(value) {
  return typeof value === "string" ? value.trim() : "";
}
function parseHomeSurvey(value) {
  if (!isRecord$b(value) || value.enabled !== true) return null;
  const id2 = plainText(value.id);
  const imageUrl = safeHttpsUrl(value.image_url);
  const title = plainText(value.title);
  const description = plainText(value.description);
  const cta = isRecord$b(value.cta) ? value.cta : null;
  const ctaLabel = plainText(cta?.label);
  const ctaUrl = safeHttpsUrl(cta?.url);
  if (!id2 || !imageUrl || !title || !description || !ctaLabel || !ctaUrl)
    return null;
  const bullets = Array.isArray(value.bullets)
    ? value.bullets
        .map(plainText)
        .filter((bullet) => bullet.length > 0)
        .slice(0, 5)
    : [];
  const configuredCooldown = value.cooldown_ms;
  const cooldownMs =
    typeof configuredCooldown === "number" &&
    Number.isFinite(configuredCooldown)
      ? Math.min(Math.max(0, configuredCooldown), 30 * 24 * 60 * 60 * 1e3)
      : 7 * 24 * 60 * 60 * 1e3;
  return {
    id: id2,
    imageUrl,
    title,
    description,
    bullets,
    ctaLabel,
    ctaUrl,
    dismissible: value.dismissible !== false,
    cooldownMs,
  };
}
function parseUpdateWidget(value, locale) {
  if (!isRecord$b(value)) return DEFAULT_UPDATE_WIDGET_CONFIG;
  const imageUrl = safeHttpsUrl(localizedText(value.image_url, locale));
  return value.enabled === false
    ? {
        enabled: false,
        imageUrl,
      }
    : {
        imageUrl,
      };
}
function parseHomeWidget(value) {
  if (!isRecord$b(value)) return DEFAULT_HOME_WIDGET_CONFIG;
  const legacyOrder = Array.isArray(value.order)
    ? value.order.filter(
        (kind) => typeof kind === "string" && HOME_WIDGET_KINDS.includes(kind),
      )
    : void 0;
  return {
    enabled: value.enabled !== false,
    survey: parseHomeSurvey(value.survey),
    ...(legacyOrder && legacyOrder.length > 0
      ? {
          order: [...new Set(legacyOrder)],
        }
      : {}),
  };
}
function mapHubClientConfig(raw2, locale) {
  if (!isRecord$b(raw2)) return DEFAULT_HUB_CLIENT_CONFIG;
  const cfg = raw2;
  const whatsNew = cfg.whats_new;
  const whatsNewEnabled =
    whatsNew && typeof whatsNew === "object" && "enabled" in whatsNew
      ? whatsNew.enabled !== false
      : DEFAULT_HUB_CLIENT_CONFIG.whatsNewEnabled;
  return {
    whatsNewEnabled,
    videoStarterPresets: parseVideoStarterPresets(
      cfg.video_starter_presets,
      locale,
    ),
    startupModalSchedule: parseStartupModalSchedule(cfg.startup_modal_schedule),
    homeWidget: parseHomeWidget(cfg.home_widget),
    updateWidget: parseUpdateWidget(cfg.update_widget, locale),
  };
}
export function useHubClientConfig() {
  const gatewayReady = useGatewayReady();
  const { region, channel } = useRuntimeConfig();
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("zh") ? "zh" : "en";
  const { data: data2, error } = useQuery({
    queryKey: ["hub-client-config", region, channel, locale],
    queryFn: async () => {
      void refreshToolCallDisplayConfig();
      const response = await gatewayFetch(API_PATHS.hubClientConfig);
      if (!response.ok)
        throw new Error(`hub_client_config HTTP ${response.status}`);
      return mapHubClientConfig(await response.json(), locale);
    },
    enabled: gatewayReady,
    staleTime: HUB_CLIENT_CONFIG_REFRESH_INTERVAL_MS,
    refetchInterval: HUB_CLIENT_CONFIG_REFRESH_INTERVAL_MS,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    retry: false,
    throwOnError: false,
  });
  return !gatewayReady || error
    ? DEFAULT_HUB_CLIENT_CONFIG
    : (data2 ?? DEFAULT_HUB_CLIENT_CONFIG);
}
