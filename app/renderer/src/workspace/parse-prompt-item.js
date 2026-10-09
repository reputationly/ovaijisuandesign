// parse-prompt-item.js
import { Palette } from "../vendor.js";
import { FolderOpen } from "../media-editing/parse-item.jsx";
import {
  HOME_QUICK_START_MAX_ITEMS_PER_SECTION,
  HOME_QUICK_START_MAX_OUTPUTS_PER_QUERY,
  MEDIA_TYPES,
  PROMPT_ICON_MAP,
  configIdentifier,
  isRecord$5,
  nonEmptyString,
  normalizeConfiguredAssetUrl,
  parseAgentModelId,
  parseAttachment,
  parseLocalizedText,
  parseOptionalLocalizedText,
  parsePromptOutput,
  parseSelectedMediaModels,
  uniqueBy,
} from "./scene-categories.js";
import {
  MAX_ATTACHMENTS,
  ecommerceArtwork,
  filmArtwork,
  shortDramaArtwork,
} from "../generation/use-mention-models.jsx";
function parsePromptItem(value) {
  if (!isRecord$5(value)) return void 0;
  const id2 = configIdentifier(value.id);
  const title = parseLocalizedText(value.title);
  const prompt = parseLocalizedText(value.prompt);
  if (!id2 || !title || !prompt) return void 0;
  const mediaType = nonEmptyString(value.media);
  const description =
    parseOptionalLocalizedText(value.description) ?? parseOptionalLocalizedText(value.subtitle);
  const attribution =
    parseOptionalLocalizedText(value.attribution) ?? parseOptionalLocalizedText(value.author);
  const attachments = Array.isArray(value.attachments)
    ? value.attachments.slice(0, MAX_ATTACHMENTS).flatMap((attachment) => {
        const parsed = parseAttachment(attachment);
        return parsed ? [parsed] : [];
      })
    : [];
  const outputs = Array.isArray(value.outputs)
    ? uniqueBy(
        value.outputs.slice(0, HOME_QUICK_START_MAX_OUTPUTS_PER_QUERY).flatMap((output) => {
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
    connectorId: configIdentifier(value.connector_id) ?? (id2 === "tool-figma" ? "figma" : void 0),
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
export function parseFeaturedSkill(value) {
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
export function parsePromptSection(value) {
  const id2 = configIdentifier(value.id);
  const title = parseLocalizedText(value.title);
  const iconName = nonEmptyString(value.icon);
  const icon = (iconName && PROMPT_ICON_MAP[iconName]) || Palette;
  if (!id2 || !title) return void 0;
  const queries = Array.isArray(value.items)
    ? uniqueBy(
        value.items.slice(0, HOME_QUICK_START_MAX_ITEMS_PER_SECTION).flatMap((item) => {
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
export function parseFeaturePopupSection(value) {
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
function parseProjectArchiveItem(value) {
  if (!isRecord$5(value)) return void 0;
  const id2 = configIdentifier(value.id);
  const title = parseLocalizedText(value.title);
  const action = isRecord$5(value.action) ? value.action : null;
  const actionType = action && nonEmptyString(action.type);
  const archiveUrl = action && normalizeConfiguredAssetUrl(action.archive_url);
  const label = action && parseLocalizedText(action.cta);
  if (!id2 || !title || actionType !== "project-archive" || !archiveUrl || !label) return void 0;
  const projectName = (action && parseOptionalLocalizedText(action.project_name)) ?? title;
  const description =
    parseOptionalLocalizedText(value.description) ?? parseOptionalLocalizedText(value.subtitle);
  const attribution =
    parseOptionalLocalizedText(value.attribution) ?? parseOptionalLocalizedText(value.author);
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
        value.items.slice(0, HOME_QUICK_START_MAX_ITEMS_PER_SECTION).flatMap((item) => {
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
const DEFAULT_SHOWCASE_ATTRIBUTION = "MiniMax Design官方";
const DEFAULT_SHOWCASE_ATTRIBUTION_EN = "MiniMax Design Official";
const DEFAULT_SHOWCASE_DESCRIPTION = "展现 H3 在镜头运动、主体一致性与音画协同上的高质量生成能力。";
const DEFAULT_SHOWCASE_DESCRIPTION_EN =
  "Showcasing H3’s high-quality generation across camera motion, subject consistency, and audiovisual coherence.";
const OFFICIAL_SHOWCASE_ATTRIBUTIONS = new Set([
  DEFAULT_SHOWCASE_ATTRIBUTION,
  DEFAULT_SHOWCASE_ATTRIBUTION_EN,
  // Existing Apollo data can still carry the previous brand attribution.
  "MiniMax Hub官方",
  "MiniMax Hub Official",
]);
const BRAND_ADVERTISING_COLLECTION_ID = "brand-advertising";
const BRAND_ADVERTISING_COLLECTION_LABEL = "品牌广告";
const BRAND_ADVERTISING_COLLECTION_LABEL_EN = "Brand Advertising";
const BRAND_ADVERTISING_SCENE_IDS = new Set([
  "brand-design",
  "advertising-design",
  "text-preservation",
]);
export const FEATURED_SHOWCASE_COLLECTION_ID = "featured";
const SYNTHETIC_SHOWCASE_COLLECTION_IDS = new Set([FEATURED_SHOWCASE_COLLECTION_ID, "skill"]);
const SCENE_FALLBACK_ARTWORKS = {
  ecommerce: ecommerceArtwork,
  film: filmArtwork,
  "short-drama": shortDramaArtwork,
};
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
function previewImage(query, fallbackUrl) {
  return (
    query.coverUrl ??
    query.attachments.find((attachment) => attachment.type === "image" && attachment.assetUrl)
      ?.assetUrl ??
    fallbackUrl
  );
}
function normalizeAttribution(value) {
  return value.trim().replace(/^@+/, "").trim();
}
function isOfficialAttribution(value) {
  return OFFICIAL_SHOWCASE_ATTRIBUTIONS.has(normalizeAttribution(value));
}
function normalizeOfficialAttributionForDisplay(value, brandedValue) {
  return isOfficialAttribution(value) ? brandedValue : value;
}
function outputItem(scene, query, output, sectionVideoUrl) {
  const videoUrl = output?.videoUrl ?? query.videoUrl ?? sectionVideoUrl;
  const fallbackUrl = SCENE_FALLBACK_ARTWORKS[scene.id] ?? filmArtwork;
  const queryId = query.id;
  const sourceAttribution =
    output?.attribution ??
    output?.attributionEn ??
    query.attribution ??
    query.attributionEn ??
    DEFAULT_SHOWCASE_ATTRIBUTION;
  const sourceAttributionEn =
    output?.attributionEn ??
    output?.attribution ??
    query.attributionEn ??
    query.attribution ??
    DEFAULT_SHOWCASE_ATTRIBUTION_EN;
  const attribution = normalizeOfficialAttributionForDisplay(
    sourceAttribution,
    DEFAULT_SHOWCASE_ATTRIBUTION,
  );
  const attributionEn = normalizeOfficialAttributionForDisplay(
    sourceAttributionEn,
    DEFAULT_SHOWCASE_ATTRIBUTION_EN,
  );
  return {
    id: output ? `${scene.id}:${queryId}:${output.id}` : `${scene.id}:${queryId}`,
    contentId: output ? `${scene.id}:${queryId}:${output.id}` : `${scene.id}:${queryId}`,
    ...((output?.videoId ?? query.videoId)
      ? {
          videoId: output?.videoId ?? query.videoId,
        }
      : {}),
    title: output?.title ?? query.label,
    titleEn: output?.titleEn ?? query.labelEn,
    description:
      output?.description ??
      output?.descriptionEn ??
      query.description ??
      query.descriptionEn ??
      DEFAULT_SHOWCASE_DESCRIPTION,
    descriptionEn:
      output?.descriptionEn ??
      output?.description ??
      query.descriptionEn ??
      query.description ??
      DEFAULT_SHOWCASE_DESCRIPTION_EN,
    category: scene.name,
    categoryEn: scene.nameEn,
    coverUrl: output?.coverUrl ?? previewImage(query, fallbackUrl),
    videoUrl,
    attribution,
    attributionEn,
    isOfficial: isOfficialAttribution(attribution) && isOfficialAttribution(attributionEn),
    canUseAction: output?.usePrompt ?? query.usePrompt ?? true,
    action: {
      kind: "query",
      query,
      sceneId: scene.id,
    },
  };
}
export function sceneItems(scene, sectionVideoUrl) {
  return scene.queries.flatMap((query) => {
    if (query.outputs && query.outputs.length > 0) {
      return query.outputs.map((output) => ({
        item: outputItem(scene, query, output, sectionVideoUrl),
        featured: query.featured === true || output.featured,
      }));
    }
    return [
      {
        item: outputItem(scene, query, void 0, sectionVideoUrl),
        featured: query.featured === true,
      },
    ];
  });
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
function buildCategoryCollections(scenes, showcase) {
  const explicitBrandAdvertisingScene = scenes.find(
    ({ scene }) => scene.id === BRAND_ADVERTISING_COLLECTION_ID,
  );
  const firstLegacySceneIndex = scenes.findIndex(({ scene }) =>
    BRAND_ADVERTISING_SCENE_IDS.has(scene.id),
  );
  const explicitSceneIndex = scenes.findIndex(
    ({ scene }) => scene.id === BRAND_ADVERTISING_COLLECTION_ID,
  );
  const brandAdvertisingCollectionIndex =
    firstLegacySceneIndex >= 0 ? firstLegacySceneIndex : explicitSceneIndex;
  const brandAdvertisingItems = uniqueItemsByVideoUrl(
    (explicitBrandAdvertisingScene
      ? explicitBrandAdvertisingScene.entries
      : scenes
          .filter(({ scene }) => BRAND_ADVERTISING_SCENE_IDS.has(scene.id))
          .flatMap(({ entries: entries2 }) => entries2)
    ).map(({ item }) => item),
  );
  return scenes.flatMap(({ scene, entries: entries2 }, index2) => {
    if (BRAND_ADVERTISING_SCENE_IDS.has(scene.id) || scene.id === BRAND_ADVERTISING_COLLECTION_ID) {
      if (index2 !== brandAdvertisingCollectionIndex) return [];
      return [
        {
          id: BRAND_ADVERTISING_COLLECTION_ID,
          label: BRAND_ADVERTISING_COLLECTION_LABEL,
          labelEn: BRAND_ADVERTISING_COLLECTION_LABEL_EN,
          ...showcaseBadgeProps(showcase, BRAND_ADVERTISING_COLLECTION_ID),
          videoOrientation: showcaseOrientation(showcase, BRAND_ADVERTISING_COLLECTION_ID),
          items: brandAdvertisingItems,
        },
      ];
    }
    return [
      {
        id: scene.id,
        label: scene.name,
        labelEn: scene.nameEn,
        ...showcaseBadgeProps(showcase, scene.id),
        videoOrientation: showcaseOrientation(showcase, scene.id),
        items: uniqueItemsByVideoUrl(entries2.map(({ item }) => item)),
      },
    ];
  });
}
export function buildFeaturedItems(scenes) {
  const hasExplicitBrandAdvertisingScene = scenes.some(
    ({ scene }) => scene.id === BRAND_ADVERTISING_COLLECTION_ID,
  );
  const featuredScenes = hasExplicitBrandAdvertisingScene
    ? scenes.filter(({ scene }) => !BRAND_ADVERTISING_SCENE_IDS.has(scene.id))
    : scenes;
  const allSceneEntries = featuredScenes.flatMap(({ entries: entries2 }) => entries2);
  const explicitlyFeaturedItems = allSceneEntries
    .filter(({ featured }) => featured)
    .map(({ item }) => item);
  return explicitlyFeaturedItems.length > 0
    ? explicitlyFeaturedItems
    : allSceneEntries.map(({ item }) => item).slice(0, SHOWCASE_MINIMUM_ITEM_COUNT);
}
function projectArchiveItem(category, item) {
  const contentId = `${category.id}:${item.id}`;
  const attribution = normalizeOfficialAttributionForDisplay(
    item.attribution ?? DEFAULT_SHOWCASE_ATTRIBUTION,
    DEFAULT_SHOWCASE_ATTRIBUTION,
  );
  const attributionEn = normalizeOfficialAttributionForDisplay(
    item.attributionEn ?? DEFAULT_SHOWCASE_ATTRIBUTION_EN,
    DEFAULT_SHOWCASE_ATTRIBUTION_EN,
  );
  return {
    id: contentId,
    contentId,
    title: item.title,
    titleEn: item.titleEn,
    description: item.description ?? DEFAULT_SHOWCASE_DESCRIPTION,
    descriptionEn: item.descriptionEn ?? DEFAULT_SHOWCASE_DESCRIPTION_EN,
    category: category.name,
    categoryEn: category.nameEn,
    coverUrl: item.coverUrl ?? category.artworkUrl ?? "",
    videoUrl: item.videoUrl,
    attribution,
    attributionEn,
    isOfficial: isOfficialAttribution(attribution) && isOfficialAttribution(attributionEn),
    canUseAction: true,
    actionLabel: item.action.label,
    actionLabelEn: item.action.labelEn,
    action: {
      kind: "project-archive",
      archiveUrl: item.action.archiveUrl,
      projectName: item.action.projectName,
      projectNameEn: item.action.projectNameEn,
    },
  };
}
export function buildMediaShowcaseCollections({ categories, featuredLabel, showcase }) {
  const showcaseSceneCategories = categories.filter(
    (category) => category.kind === "scene" && category.showcase === true,
  );
  const scenes = showcaseSceneCategories.map((category) => ({
    scene: category.scene,
    entries: sceneItems(category.scene, category.videoUrl),
  }));
  const featuredItems = buildFeaturedItems(scenes);
  const categoryCollections = buildCategoryCollections(scenes, showcase).filter(
    (collection) =>
      collection.items.length > 0 && !SYNTHETIC_SHOWCASE_COLLECTION_IDS.has(collection.id),
  );
  const projectArchiveCollections = categories
    .filter((category) => category.kind === "project-archive" && category.showcase)
    .map((category) => ({
      id: category.id,
      label: category.name,
      labelEn: category.nameEn,
      ...showcaseBadgeProps(showcase, category.id),
      videoOrientation: showcaseOrientation(showcase, category.id),
      items: category.items.map((item) => projectArchiveItem(category, item)),
    }));
  const collections = [
    ...(featuredItems.length > 0
      ? [
          {
            id: FEATURED_SHOWCASE_COLLECTION_ID,
            label: showcase?.tabs[FEATURED_SHOWCASE_COLLECTION_ID]?.label ?? featuredLabel,
            labelEn: showcase?.tabs[FEATURED_SHOWCASE_COLLECTION_ID]?.labelEn ?? featuredLabel,
            ...showcaseBadgeProps(showcase, FEATURED_SHOWCASE_COLLECTION_ID),
            videoOrientation: showcaseOrientation(showcase, FEATURED_SHOWCASE_COLLECTION_ID),
            items: featuredItems,
          },
        ]
      : []),
    ...categoryCollections,
    ...projectArchiveCollections,
  ];
  let remainingItemBudget = HOME_SHOWCASE_MAX_TOTAL_ITEMS;
  return collections.flatMap((collection) => {
    if (remainingItemBudget <= 0) return [];
    const items = collection.items.slice(
      0,
      Math.min(HOME_SHOWCASE_MAX_ITEMS_PER_COLLECTION, remainingItemBudget),
    );
    remainingItemBudget -= items.length;
    return items.length > 0
      ? [
          {
            ...collection,
            items,
          },
        ]
      : [];
  });
}
