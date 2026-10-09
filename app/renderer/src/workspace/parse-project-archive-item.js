// parse-project-archive-item.js
import {
  configIdentifier,
  HOME_QUICK_START_MAX_ITEMS_PER_SECTION,
  isRecord$5,
  nonEmptyString,
  normalizeConfiguredAssetUrl,
  parseLocalizedText,
  parseOptionalLocalizedText,
  uniqueBy,
} from "./parse-localized-text.js";
import { FolderOpen } from "../media-editing/package.jsx";

function parseProjectArchiveItem(value) {
  if (!isRecord$5(value)) return void 0;
  const id2 = configIdentifier(value.id);
  const title = parseLocalizedText(value.title);
  const action = isRecord$5(value.action) ? value.action : null;
  const actionType = action && nonEmptyString(action.type);
  const archiveUrl = action && normalizeConfiguredAssetUrl(action.archive_url);
  const label = action && parseLocalizedText(action.cta);
  if (
    !id2 ||
    !title ||
    actionType !== "project-archive" ||
    !archiveUrl ||
    !label
  )
    return void 0;
  const projectName =
    (action && parseOptionalLocalizedText(action.project_name)) ?? title;
  const description =
    parseOptionalLocalizedText(value.description) ??
    parseOptionalLocalizedText(value.subtitle);
  const attribution =
    parseOptionalLocalizedText(value.attribution) ??
    parseOptionalLocalizedText(value.author);
  return {
    id: id2,
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
    ...(attribution
      ? {
          attribution: attribution.zh,
          attributionEn: attribution.en,
        }
      : {}),
    featured: value.featured === true,
    action: {
      kind: "project-archive",
      archiveUrl,
      projectName: projectName.zh,
      projectNameEn: projectName.en,
      label: label.zh,
      labelEn: label.en,
    },
  };
}

export function parseProjectArchiveSection(value) {
  const id2 = configIdentifier(value.id);
  const title = parseLocalizedText(value.title);
  if (!id2 || !title || value.showcase !== true) return void 0;
  const items = Array.isArray(value.items)
    ? uniqueBy(
        value.items
          .slice(0, HOME_QUICK_START_MAX_ITEMS_PER_SECTION)
          .flatMap((item) => {
            const parsed = parseProjectArchiveItem(item);
            return parsed ? [parsed] : [];
          }),
        (item) => item.id,
      )
    : [];
  if (items.length === 0) return void 0;
  return {
    kind: "project-archive",
    showcase: true,
    id: id2,
    name: title.zh,
    nameEn: title.en,
    icon: FolderOpen,
    artworkUrl: normalizeConfiguredAssetUrl(value.cover),
    videoUrl: normalizeConfiguredAssetUrl(value.video),
    items,
  };
}

const SHOWCASE_MINIMUM_ITEM_COUNT = 9;

export const HOME_SHOWCASE_MAX_ITEMS_PER_COLLECTION = 64;

export const HOME_SHOWCASE_MAX_TOTAL_ITEMS = 256;

export const DEFAULT_SHOWCASE_ATTRIBUTION = "MiniMax Design官方";

export const DEFAULT_SHOWCASE_ATTRIBUTION_EN = "MiniMax Design Official";

export const DEFAULT_SHOWCASE_DESCRIPTION =
  "展现 H3 在镜头运动、主体一致性与音画协同上的高质量生成能力。";

export const DEFAULT_SHOWCASE_DESCRIPTION_EN =
  "Showcasing H3’s high-quality generation across camera motion, subject consistency, and audiovisual coherence.";

const OFFICIAL_SHOWCASE_ATTRIBUTIONS = new Set([
  DEFAULT_SHOWCASE_ATTRIBUTION,
  DEFAULT_SHOWCASE_ATTRIBUTION_EN,
  // Existing Apollo data can still carry the previous brand attribution.
  "MiniMax Hub官方",
  "MiniMax Hub Official",
]);

export const BRAND_ADVERTISING_COLLECTION_ID = "brand-advertising";

export const BRAND_ADVERTISING_SCENE_IDS = new Set([
  "brand-design",
  "advertising-design",
  "text-preservation",
]);

export const FEATURED_SHOWCASE_COLLECTION_ID = "featured";

export function showcaseOrientation(showcase, tabId) {
  return showcase?.tabs[tabId]?.videoOrientation ?? "landscape";
}

export function showcaseBadgeProps(showcase, tabId) {
  const badge = showcase?.tabs[tabId]?.badge;
  return badge
    ? {
        badge,
      }
    : {};
}

function normalizeAttribution(value) {
  return value.trim().replace(/^@+/, "").trim();
}

export function isOfficialAttribution(value) {
  return OFFICIAL_SHOWCASE_ATTRIBUTIONS.has(normalizeAttribution(value));
}

export function normalizeOfficialAttributionForDisplay(value, brandedValue) {
  return isOfficialAttribution(value) ? brandedValue : value;
}

export function uniqueItemsByVideoUrl(items) {
  const seenVideoUrls = new Set();
  return items.filter((item) => {
    if (!item.videoUrl) return true;
    if (seenVideoUrls.has(item.videoUrl)) return false;
    seenVideoUrls.add(item.videoUrl);
    return true;
  });
}

export function buildFeaturedItems(scenes) {
  const hasExplicitBrandAdvertisingScene = scenes.some(
    ({ scene }) => scene.id === BRAND_ADVERTISING_COLLECTION_ID,
  );
  const featuredScenes = hasExplicitBrandAdvertisingScene
    ? scenes.filter(({ scene }) => !BRAND_ADVERTISING_SCENE_IDS.has(scene.id))
    : scenes;
  const allSceneEntries = featuredScenes.flatMap(
    ({ entries: entries2 }) => entries2,
  );
  const explicitlyFeaturedItems = allSceneEntries
    .filter(({ featured }) => featured)
    .map(({ item }) => item);
  return explicitlyFeaturedItems.length > 0
    ? explicitlyFeaturedItems
    : allSceneEntries
        .map(({ item }) => item)
        .slice(0, SHOWCASE_MINIMUM_ITEM_COUNT);
}
