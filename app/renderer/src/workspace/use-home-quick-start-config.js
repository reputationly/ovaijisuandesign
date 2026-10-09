// use-home-quick-start-config.js
import { DEFAULT_HOME_QUICK_START_CONFIG } from "./scene-categories.js";
import {
  configIdentifier,
  HOME_QUICK_START_MAX_ITEMS_PER_SECTION,
  HOME_QUICK_START_MAX_SECTIONS,
  HOME_QUICK_START_SCHEMA_VERSION,
  isRecord$5,
  nonEmptyString,
  normalizeConfiguredAssetUrl,
  parseLocalizedText,
  parseOptionalLocalizedText,
  runtimeRegion,
  uniqueBy,
} from "./parse-localized-text.js";
import {
  API_PATHS,
  Film,
  getRuntimeConfig,
  Palette,
  reactExports,
  useQuery,
  workspaceLog,
} from "../vendor.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { SkillIcon } from "./use-prompt-icon.jsx";
import { ShoppingBag } from "../media-editing/package.jsx";
import { MAX_ATTACHMENTS } from "../generation/use-mention-models.jsx";
import { parseProjectArchiveSection } from "./parse-project-archive-item.js";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { useRuntimeConfig } from "../generation/use-model-catalog-scope-key.js";
import { useGatewayReady } from "../infra/inline-rename-input.jsx";

const STRICT_SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function parseStrictSemver(version2) {
  const match2 = version2
    .trim()
    .replace(/^v/i, "")
    .match(STRICT_SEMVER_PATTERN);
  if (!match2) return null;
  const prerelease = match2[4]?.split(".") ?? [];
  if (prerelease.some((part) => /^0\d+$/.test(part))) return null;
  return {
    core: match2.slice(1, 4),
    prerelease,
  };
}

function compareNumericIdentifiers(a2, b3) {
  if (a2.length !== b3.length) return a2.length - b3.length;
  return a2 === b3 ? 0 : a2 < b3 ? -1 : 1;
}

function compareSemverStrict(a2, b3) {
  const pa = parseStrictSemver(a2);
  const pb = parseStrictSemver(b3);
  if (!pa || !pb) return null;
  for (let index2 = 0; index2 < pa.core.length; index2 += 1) {
    const comparison = compareNumericIdentifiers(
      pa.core[index2],
      pb.core[index2],
    );
    if (comparison !== 0) return comparison;
  }
  if (pa.prerelease.length === 0 && pb.prerelease.length === 0) return 0;
  if (pa.prerelease.length === 0) return 1;
  if (pb.prerelease.length === 0) return -1;
  for (
    let index2 = 0;
    index2 < Math.max(pa.prerelease.length, pb.prerelease.length);
    index2 += 1
  ) {
    const left = pa.prerelease[index2];
    const right = pb.prerelease[index2];
    if (left === void 0) return -1;
    if (right === void 0) return 1;
    if (left === right) continue;
    const leftNumeric = /^\d+$/.test(left);
    const rightNumeric = /^\d+$/.test(right);
    if (leftNumeric && rightNumeric)
      return compareNumericIdentifiers(left, right);
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return left < right ? -1 : 1;
  }
  return 0;
}

const HOME_QUICK_START_CONFIG_MAX_BYTES = 1e6;

const HOME_QUICK_START_MAX_OUTPUTS_PER_QUERY = 8;

const HOME_QUICK_START_MAX_TOTAL_QUERIES = 256;

const HOME_QUICK_START_MAX_SHOWCASE_TABS = HOME_QUICK_START_MAX_SECTIONS + 2;

const PROMPT_ICON_MAP = {
  film: Film,
  palette: Palette,
  "shopping-bag": ShoppingBag,
};

function stringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, HOME_QUICK_START_MAX_ITEMS_PER_SECTION)
    .flatMap((item) => {
      const parsed = nonEmptyString(item);
      return parsed ? [parsed] : [];
    });
}

function meetsMinClientVersion(value) {
  if (value === void 0) return true;
  const minClientVersion = nonEmptyString(value);
  if (!minClientVersion) return false;
  try {
    const clientVersion = nonEmptyString(getRuntimeConfig().appVersion);
    if (!clientVersion) return false;
    const comparison = compareSemverStrict(clientVersion, minClientVersion);
    return comparison !== null && comparison >= 0;
  } catch {
    return false;
  }
}

function parseAgentModelId(value) {
  const modelId = nonEmptyString(
    isRecord$5(value) ? value[runtimeRegion()] : value,
  );
  if (!modelId || /[\s\p{Cc}]/u.test(modelId)) return void 0;
  const slash2 = modelId.indexOf("/");
  return slash2 > 0 && slash2 < modelId.length - 1 ? modelId : void 0;
}

function parseSelectedMediaModels(value) {
  if (!isRecord$5(value)) return void 0;
  const image2 = stringArray(value.image);
  const video = stringArray(value.video);
  const audio = stringArray(value.audio);
  if (image2.length === 0 && video.length === 0 && audio.length === 0)
    return void 0;
  return {
    ...(image2.length > 0
      ? {
          image: image2,
        }
      : {}),
    ...(video.length > 0
      ? {
          video,
        }
      : {}),
    ...(audio.length > 0
      ? {
          audio,
        }
      : {}),
  };
}

const SHOWCASE_ORIENTATIONS = new Set(["landscape", "portrait"]);

const SHOWCASE_BADGE_LABELS = new Set(["NEW", "HOT"]);

function parseShowcaseOrientation(value) {
  return typeof value === "string" && SHOWCASE_ORIENTATIONS.has(value)
    ? value
    : "landscape";
}

function parseShowcaseTabBadge(value) {
  if (!isRecord$5(value)) return void 0;
  const label = parseLocalizedText(value);
  if (!label) return void 0;
  const normalizedLabel = label.zh.toUpperCase();
  const normalizedLabelEn = label.en.toUpperCase();
  if (
    !SHOWCASE_BADGE_LABELS.has(normalizedLabel) ||
    !SHOWCASE_BADGE_LABELS.has(normalizedLabelEn)
  ) {
    return void 0;
  }
  return {
    label: normalizedLabel,
    labelEn: normalizedLabelEn,
  };
}

function parseShowcaseConfig(value) {
  if (!isRecord$5(value)) return void 0;
  const defaultTabId = configIdentifier(value.default_tab_id);
  const parsedTabs = [];
  if (Array.isArray(value.tabs)) {
    for (const tab2 of value.tabs.slice(
      0,
      HOME_QUICK_START_MAX_SHOWCASE_TABS,
    )) {
      if (!isRecord$5(tab2)) continue;
      const id2 = configIdentifier(tab2.id);
      if (!id2) continue;
      const title = parseOptionalLocalizedText(tab2.title);
      const badge = parseShowcaseTabBadge(tab2.badge);
      parsedTabs.push({
        id: id2,
        ...(title
          ? {
              label: title.zh,
              labelEn: title.en,
            }
          : {}),
        videoOrientation: parseShowcaseOrientation(tab2.video_orientation),
        ...(badge
          ? {
              badge,
            }
          : {}),
      });
    }
  } else if (isRecord$5(value.tabs)) {
    for (const [id2, tab2] of Object.entries(value.tabs).slice(
      0,
      HOME_QUICK_START_MAX_SHOWCASE_TABS,
    )) {
      const normalizedId = configIdentifier(id2);
      if (!normalizedId || !isRecord$5(tab2)) continue;
      const title = parseOptionalLocalizedText(tab2.title);
      const badge = parseShowcaseTabBadge(tab2.badge);
      parsedTabs.push({
        id: normalizedId,
        ...(title
          ? {
              label: title.zh,
              labelEn: title.en,
            }
          : {}),
        videoOrientation: parseShowcaseOrientation(tab2.video_orientation),
        ...(badge
          ? {
              badge,
            }
          : {}),
      });
    }
  }
  return {
    ...(defaultTabId
      ? {
          defaultTabId,
        }
      : {}),
    tabs: Object.fromEntries(parsedTabs.map((tab2) => [tab2.id, tab2])),
  };
}

const ATTACHMENT_TYPES = new Set([
  "image",
  "video",
  "audio",
  "pdf",
  "folder",
  "file",
]);

function parseAttachment(value) {
  if (!isRecord$5(value)) return void 0;
  const name2 = nonEmptyString(value.name);
  const type2 = nonEmptyString(value.type);
  if (!name2 || !type2 || !ATTACHMENT_TYPES.has(type2)) return void 0;
  const aliases = [...new Set(stringArray(value.aliases))].filter(
    (alias) => alias !== name2,
  );
  const assetUrl = normalizeConfiguredAssetUrl(value.url);
  return {
    name: name2,
    type: type2,
    ...(aliases.length > 0
      ? {
          displayNames: aliases,
        }
      : {}),
    ...(assetUrl
      ? {
          assetUrl,
        }
      : {}),
  };
}

const MEDIA_TYPES = new Set(["image", "video", "audio", "document"]);

function parsePromptOutput(value) {
  if (!isRecord$5(value)) return void 0;
  const id2 = configIdentifier(value.id);
  const title = parseLocalizedText(value.title);
  if (!id2 || !title) return void 0;
  const mediaType = nonEmptyString(value.media);
  const description =
    parseOptionalLocalizedText(value.description) ??
    parseOptionalLocalizedText(value.subtitle);
  const attribution =
    parseOptionalLocalizedText(value.attribution) ??
    parseOptionalLocalizedText(value.author);
  return {
    id: id2,
    videoId: configIdentifier(value.video_id),
    title: title.zh,
    titleEn: title.en,
    ...(description
      ? {
          description: description.zh,
          descriptionEn: description.en,
        }
      : {}),
    coverUrl: normalizeConfiguredAssetUrl(value.cover),
    videoUrl: normalizeConfiguredAssetUrl(value.video),
    mediaType: mediaType && MEDIA_TYPES.has(mediaType) ? mediaType : void 0,
    ...(attribution
      ? {
          attribution: attribution.zh,
          attributionEn: attribution.en,
        }
      : {}),
    ...(typeof value.use_prompt === "boolean"
      ? {
          usePrompt: value.use_prompt,
        }
      : {}),
    featured: value.featured === true,
  };
}

function parsePromptItem(value) {
  if (!isRecord$5(value)) return void 0;
  const id2 = configIdentifier(value.id);
  const title = parseLocalizedText(value.title);
  const prompt = parseLocalizedText(value.prompt);
  if (!id2 || !title || !prompt) return void 0;
  const mediaType = nonEmptyString(value.media);
  const description =
    parseOptionalLocalizedText(value.description) ??
    parseOptionalLocalizedText(value.subtitle);
  const attribution =
    parseOptionalLocalizedText(value.attribution) ??
    parseOptionalLocalizedText(value.author);
  const attachments = Array.isArray(value.attachments)
    ? value.attachments.slice(0, MAX_ATTACHMENTS).flatMap((attachment) => {
        const parsed = parseAttachment(attachment);
        return parsed ? [parsed] : [];
      })
    : [];
  const outputs = Array.isArray(value.outputs)
    ? uniqueBy(
        value.outputs
          .slice(0, HOME_QUICK_START_MAX_OUTPUTS_PER_QUERY)
          .flatMap((output) => {
            const parsed = parsePromptOutput(output);
            return parsed ? [parsed] : [];
          }),
        (output) => output.id,
      )
    : [];
  return {
    id: id2,
    videoId: configIdentifier(value.video_id),
    label: title.zh,
    labelEn: title.en,
    queryCn: prompt.zh,
    queryEn: prompt.en,
    ...(description
      ? {
          description: description.zh,
          descriptionEn: description.en,
        }
      : {}),
    skill: configIdentifier(value.skill),
    connectorId:
      configIdentifier(value.connector_id) ??
      (id2 === "tool-figma" ? "figma" : void 0),
    agentModelId: parseAgentModelId(value.model_id),
    models: parseSelectedMediaModels(value.models),
    coverUrl: normalizeConfiguredAssetUrl(value.cover),
    videoUrl: normalizeConfiguredAssetUrl(value.video),
    mediaType: mediaType && MEDIA_TYPES.has(mediaType) ? mediaType : void 0,
    ...(attribution
      ? {
          attribution: attribution.zh,
          attributionEn: attribution.en,
        }
      : {}),
    ...(typeof value.use_prompt === "boolean"
      ? {
          usePrompt: value.use_prompt,
        }
      : {}),
    ...(value.featured === true
      ? {
          featured: true,
        }
      : {}),
    ...(outputs.length > 0
      ? {
          outputs,
        }
      : {}),
    attachments,
  };
}

function parseFeaturedSkill(value) {
  if (!isRecord$5(value)) return void 0;
  const name2 = configIdentifier(value.skill);
  const prompt = parseLocalizedText(value.prompt);
  if (!name2 || !prompt) return void 0;
  const tag = parseOptionalLocalizedText(value.tag);
  return {
    name: name2,
    prompt: prompt.zh,
    promptEn: prompt.en,
    tag: tag?.zh,
    tagEn: tag?.en,
  };
}

function parsePromptSection(value) {
  const id2 = configIdentifier(value.id);
  const title = parseLocalizedText(value.title);
  const iconName = nonEmptyString(value.icon);
  const icon = (iconName && PROMPT_ICON_MAP[iconName]) || Palette;
  if (!id2 || !title) return void 0;
  const queries = Array.isArray(value.items)
    ? uniqueBy(
        value.items
          .slice(0, HOME_QUICK_START_MAX_ITEMS_PER_SECTION)
          .flatMap((item) => {
            const parsed = parsePromptItem(item);
            return parsed ? [parsed] : [];
          }),
        (item) => item.id,
      )
    : [];
  if (queries.length === 0) return void 0;
  const scene = {
    id: id2,
    name: title.zh,
    nameEn: title.en,
    icon,
    queries,
  };
  return {
    kind: "scene",
    id: id2,
    name: title.zh,
    nameEn: title.en,
    icon,
    artworkUrl: normalizeConfiguredAssetUrl(value.cover),
    videoUrl: normalizeConfiguredAssetUrl(value.video),
    ...(value.showcase === true
      ? {
          showcase: true,
        }
      : {}),
    scene,
  };
}

function parseFeaturePopupSection(value) {
  const id2 = configIdentifier(value.id);
  const title = parseLocalizedText(value.title);
  if (!id2 || !title) return void 0;
  const iconName = nonEmptyString(value.icon);
  const icon = (iconName && PROMPT_ICON_MAP[iconName]) || Palette;
  return {
    kind: "feature-popup",
    id: id2,
    name: title.zh,
    nameEn: title.en,
    icon,
    artworkUrl: normalizeConfiguredAssetUrl(value.cover),
    videoUrl: normalizeConfiguredAssetUrl(value.video),
  };
}

const HOME_QUICK_START_STALE_TIME_MS = 6e4;

const HOME_QUICK_START_LKG_PREFIX = "hilo:home-quick-start:lkg";

const textEncoder = new TextEncoder();

class InvalidHomeQuickStartPayloadError extends Error {}

class OversizedHomeQuickStartPayloadError extends InvalidHomeQuickStartPayloadError {}

function boundedRegion(region) {
  if (region === "domestic" || region === "overseas") return region;
  return "other";
}

function boundedChannel(channel) {
  if (
    channel === "dev" ||
    channel === "test" ||
    channel === "staging" ||
    channel === "prod"
  ) {
    return channel;
  }
  return "other";
}

function utf8ByteLength(value) {
  return textEncoder.encode(value).byteLength;
}

function isRawPayloadWithinLimit(raw2) {
  let serialized;
  try {
    serialized = JSON.stringify(raw2);
  } catch {
    return false;
  }
  return (
    serialized.length <= HOME_QUICK_START_CONFIG_MAX_BYTES &&
    utf8ByteLength(serialized) <= HOME_QUICK_START_CONFIG_MAX_BYTES
  );
}

function homeQuickStartLkgKey(region, channel) {
  return `${HOME_QUICK_START_LKG_PREFIX}:v${HOME_QUICK_START_SCHEMA_VERSION}:${encodeURIComponent(region)}:${encodeURIComponent(channel)}`;
}

function removeHomeQuickStartLkg(key2) {
  try {
    localStorage.removeItem(key2);
  } catch {}
}

function pruneOtherHomeQuickStartLkgEntries(currentKey) {
  try {
    const staleKeys = [];
    const prefix = `${HOME_QUICK_START_LKG_PREFIX}:`;
    for (let index2 = 0; index2 < localStorage.length; index2 += 1) {
      const key2 = localStorage.key(index2);
      if (key2?.startsWith(prefix) && key2 !== currentKey) staleKeys.push(key2);
    }
    for (const key2 of staleKeys) localStorage.removeItem(key2);
  } catch {}
}

async function readBoundedConfigJson(response) {
  const contentLength2 = response.headers.get("content-length");
  if (contentLength2) {
    const declaredBytes = Number.parseInt(contentLength2, 10);
    if (
      Number.isFinite(declaredBytes) &&
      declaredBytes > HOME_QUICK_START_CONFIG_MAX_BYTES
    ) {
      throw new OversizedHomeQuickStartPayloadError(
        "oversized home_quick_start_config",
      );
    }
  }
  if (!response.body) {
    throw new InvalidHomeQuickStartPayloadError(
      "empty home_quick_start_config",
    );
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let serialized = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > HOME_QUICK_START_CONFIG_MAX_BYTES) {
        await reader.cancel();
        throw new OversizedHomeQuickStartPayloadError(
          "oversized home_quick_start_config",
        );
      }
      serialized += decoder.decode(value, {
        stream: true,
      });
    }
    serialized += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(serialized);
  } catch {
    throw new InvalidHomeQuickStartPayloadError(
      "invalid home_quick_start_config JSON",
    );
  }
}

function gatewayHttpStatus(error) {
  if (!error || typeof error !== "object") return void 0;
  const direct = error.status;
  if (typeof direct === "number") return direct;
  const response = error.response;
  if (!response || typeof response !== "object") return void 0;
  const nested = response.status;
  return typeof nested === "number" ? nested : void 0;
}

function parseSkillSection(value) {
  const id2 = configIdentifier(value.id);
  const title = parseLocalizedText(value.title);
  const marketSource = configIdentifier(value.source);
  if (!id2 || !title || !marketSource) return void 0;
  const skills = Array.isArray(value.items)
    ? uniqueBy(
        value.items
          .slice(0, HOME_QUICK_START_MAX_ITEMS_PER_SECTION)
          .flatMap((skill) => {
            const parsed = parseFeaturedSkill(skill);
            return parsed ? [parsed] : [];
          }),
        (skill) => skill.name,
      )
    : [];
  if (skills.length === 0) return void 0;
  return {
    kind: "featured-skills",
    id: id2,
    name: title.zh,
    nameEn: title.en,
    icon: SkillIcon,
    artworkUrl: normalizeConfiguredAssetUrl(value.cover),
    videoUrl: normalizeConfiguredAssetUrl(value.video),
    marketSource,
    skills,
  };
}

function parseSection(value) {
  if (!isRecord$5(value)) return void 0;
  if (!meetsMinClientVersion(value.min_client_version)) return void 0;
  const type2 = nonEmptyString(value.type);
  if (type2 === "prompt") return parsePromptSection(value);
  if (type2 === "skill") return parseSkillSection(value);
  if (type2 === "feature-popup") return parseFeaturePopupSection(value);
  if (type2 === "project-archive") return parseProjectArchiveSection(value);
  return void 0;
}

function parseHomeQuickStartConfig(rawConfig) {
  if (!isRecord$5(rawConfig)) return null;
  if (rawConfig.schema_version !== HOME_QUICK_START_SCHEMA_VERSION) return null;
  if (typeof rawConfig.enabled !== "boolean") return null;
  if (!Array.isArray(rawConfig.sections)) return null;
  if (!rawConfig.enabled) {
    return {
      schemaVersion: HOME_QUICK_START_SCHEMA_VERSION,
      categories: [],
    };
  }
  const parsedCategories = rawConfig.sections
    .slice(0, HOME_QUICK_START_MAX_SECTIONS)
    .flatMap((section) => {
      const parsed = parseSection(section);
      return parsed ? [parsed] : [];
    });
  const seenCategoryIds = new Set();
  let hasFeaturedCategory = false;
  let remainingQueryBudget = HOME_QUICK_START_MAX_TOTAL_QUERIES;
  const categories = [];
  for (const category of parsedCategories) {
    if (seenCategoryIds.has(category.id)) continue;
    if (category.kind === "featured-skills" && hasFeaturedCategory) continue;
    seenCategoryIds.add(category.id);
    if (category.kind === "featured-skills") hasFeaturedCategory = true;
    if (category.kind !== "scene") {
      categories.push(category);
      continue;
    }
    if (remainingQueryBudget <= 0) continue;
    const queries = category.scene.queries.slice(0, remainingQueryBudget);
    remainingQueryBudget -= queries.length;
    categories.push({
      ...category,
      scene: {
        ...category.scene,
        queries,
      },
    });
  }
  const showcase = parseShowcaseConfig(rawConfig.showcase);
  return {
    schemaVersion: HOME_QUICK_START_SCHEMA_VERSION,
    categories,
    ...(showcase
      ? {
          showcase,
        }
      : {}),
  };
}

function reportConfigResolution(region, channel, phase, outcome, failureKind) {
  const properties2 = {
    phase,
    outcome,
    region: boundedRegion(region),
    channel: boundedChannel(channel),
    schema_version: HOME_QUICK_START_SCHEMA_VERSION,
    ...(failureKind
      ? {
          failure_kind: failureKind,
        }
      : {}),
  };
  try {
    trackEvent(TRACK_EVENTS.HOME_QUICK_START_CONFIG_RESOLUTION, properties2);
  } catch {}
  const message2 = "home: quick-start-config-resolution";
  try {
    if (
      outcome === "corrupt" ||
      outcome === "invalid_config" ||
      outcome === "quota_exceeded" ||
      outcome === "storage_failed" ||
      outcome === "fetch_failed" ||
      outcome === "revalidate_failed"
    ) {
      workspaceLog.warn(message2, properties2);
    } else {
      workspaceLog.info(message2, properties2);
    }
  } catch {}
}

function readHomeQuickStartLkg(region, channel) {
  const lkgKey = homeQuickStartLkgKey(region, channel);
  pruneOtherHomeQuickStartLkgEntries(lkgKey);
  let serialized;
  try {
    serialized = localStorage.getItem(lkgKey);
  } catch {
    reportConfigResolution(
      region,
      channel,
      "lkg_read",
      "storage_failed",
      "storage",
    );
    return void 0;
  }
  if (!serialized) {
    reportConfigResolution(region, channel, "lkg_read", "miss");
    return void 0;
  }
  if (utf8ByteLength(serialized) > HOME_QUICK_START_CONFIG_MAX_BYTES) {
    reportConfigResolution(region, channel, "lkg_read", "oversized");
    removeHomeQuickStartLkg(lkgKey);
    return void 0;
  }
  let envelope;
  try {
    envelope = JSON.parse(serialized);
  } catch {
    reportConfigResolution(region, channel, "lkg_read", "corrupt", "storage");
    removeHomeQuickStartLkg(lkgKey);
    return void 0;
  }
  if (
    !envelope ||
    typeof envelope !== "object" ||
    envelope.schemaVersion !== HOME_QUICK_START_SCHEMA_VERSION
  ) {
    reportConfigResolution(region, channel, "lkg_read", "schema_mismatch");
    removeHomeQuickStartLkg(lkgKey);
    return void 0;
  }
  const parsed = parseHomeQuickStartConfig(envelope.raw);
  if (!parsed) {
    reportConfigResolution(
      region,
      channel,
      "lkg_read",
      "invalid_config",
      "invalid_payload",
    );
    removeHomeQuickStartLkg(lkgKey);
    return void 0;
  }
  reportConfigResolution(region, channel, "lkg_read", "hit");
  return parsed;
}

function writeHomeQuickStartLkg(region, channel, raw2) {
  let serialized;
  try {
    serialized = JSON.stringify({
      raw: raw2,
      schemaVersion: HOME_QUICK_START_SCHEMA_VERSION,
    });
  } catch {
    reportConfigResolution(
      region,
      channel,
      "lkg_write",
      "storage_failed",
      "storage",
    );
    return;
  }
  if (utf8ByteLength(serialized) > HOME_QUICK_START_CONFIG_MAX_BYTES) {
    reportConfigResolution(region, channel, "lkg_write", "oversized");
    return;
  }
  const lkgKey = homeQuickStartLkgKey(region, channel);
  let writeError;
  try {
    localStorage.setItem(lkgKey, serialized);
  } catch (error) {
    writeError = error;
    pruneOtherHomeQuickStartLkgEntries(lkgKey);
    try {
      localStorage.setItem(lkgKey, serialized);
      writeError = void 0;
    } catch (retryError) {
      writeError = retryError;
    }
  }
  if (!writeError) {
    pruneOtherHomeQuickStartLkgEntries(lkgKey);
    reportConfigResolution(region, channel, "lkg_write", "success");
  } else {
    reportConfigResolution(
      region,
      channel,
      "lkg_write",
      writeError instanceof DOMException &&
        writeError.name === "QuotaExceededError"
        ? "quota_exceeded"
        : "storage_failed",
      "storage",
    );
  }
}

const LOADING_HOME_QUICK_START_CONFIG = {
  schemaVersion: DEFAULT_HOME_QUICK_START_CONFIG.schemaVersion,
  categories: [],
};

export function useHomeQuickStartConfig() {
  const gatewayReady = useGatewayReady();
  const { region, channel } = useRuntimeConfig();
  const lkgConfig = reactExports.useMemo(
    () => readHomeQuickStartLkg(region, channel),
    [channel, region],
  );
  const {
    data: data2,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      "home-quick-start-config",
      HOME_QUICK_START_SCHEMA_VERSION,
      region,
      channel,
    ],
    queryFn: async () => {
      const reportFailure = (failureKind) => {
        reportConfigResolution(
          region,
          channel,
          "remote_fetch",
          lkgConfig ? "revalidate_failed" : "fetch_failed",
          failureKind,
        );
      };
      let response;
      try {
        response = await gatewayFetch(API_PATHS.homeQuickStartConfigV2);
      } catch (error) {
        reportFailure(gatewayHttpStatus(error) ? "http" : "network");
        throw error;
      }
      if (!response.ok) {
        reportFailure("http");
        throw new Error(`home_quick_start_config HTTP ${response.status}`);
      }
      let raw2;
      try {
        raw2 = await readBoundedConfigJson(response);
      } catch (error) {
        reportFailure(
          error instanceof InvalidHomeQuickStartPayloadError
            ? "invalid_payload"
            : "network",
        );
        throw error;
      }
      if (!isRawPayloadWithinLimit(raw2)) {
        reportFailure("invalid_payload");
        throw new Error("oversized home_quick_start_config");
      }
      const parsed = parseHomeQuickStartConfig(raw2);
      if (!parsed) {
        reportFailure("invalid_payload");
        throw new Error("invalid home_quick_start_config");
      }
      writeHomeQuickStartLkg(region, channel, raw2);
      reportConfigResolution(region, channel, "remote_fetch", "success");
      return {
        config: parsed,
        origin: "remote",
      };
    },
    initialData: lkgConfig
      ? {
          config: lkgConfig,
          origin: "lkg",
        }
      : void 0,
    initialDataUpdatedAt: lkgConfig ? 0 : void 0,
    enabled: gatewayReady,
    staleTime: HOME_QUICK_START_STALE_TIME_MS,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    retry: 1,
    throwOnError: false,
  });
  let config2;
  let source;
  if (data2) {
    config2 = data2.config;
    source = data2.origin;
  } else if (isError) {
    config2 = DEFAULT_HOME_QUICK_START_CONFIG;
    source = "bundle";
  } else {
    config2 = LOADING_HOME_QUICK_START_CONFIG;
    source = "loading";
  }
  return {
    config: config2,
    source,
    isLoading: gatewayReady && isLoading,
  };
}
