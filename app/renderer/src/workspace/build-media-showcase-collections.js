// build-media-showcase-collections.js
import {
  BRAND_ADVERTISING_COLLECTION_ID,
  BRAND_ADVERTISING_SCENE_IDS,
  buildFeaturedItems,
  DEFAULT_SHOWCASE_ATTRIBUTION,
  DEFAULT_SHOWCASE_ATTRIBUTION_EN,
  DEFAULT_SHOWCASE_DESCRIPTION,
  DEFAULT_SHOWCASE_DESCRIPTION_EN,
  FEATURED_SHOWCASE_COLLECTION_ID,
  HOME_SHOWCASE_MAX_ITEMS_PER_COLLECTION,
  HOME_SHOWCASE_MAX_TOTAL_ITEMS,
  isOfficialAttribution,
  normalizeOfficialAttributionForDisplay,
  showcaseBadgeProps,
  showcaseOrientation,
  uniqueItemsByVideoUrl,
} from "./parse-project-archive-item.js";
import { sceneItems } from "./output-item.js";

const BRAND_ADVERTISING_COLLECTION_LABEL = "品牌广告";

const BRAND_ADVERTISING_COLLECTION_LABEL_EN = "Brand Advertising";

const SYNTHETIC_SHOWCASE_COLLECTION_IDS = new Set([
  FEATURED_SHOWCASE_COLLECTION_ID,
  "skill",
]);

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
    if (
      BRAND_ADVERTISING_SCENE_IDS.has(scene.id) ||
      scene.id === BRAND_ADVERTISING_COLLECTION_ID
    ) {
      if (index2 !== brandAdvertisingCollectionIndex) return [];
      return [
        {
          id: BRAND_ADVERTISING_COLLECTION_ID,
          label: BRAND_ADVERTISING_COLLECTION_LABEL,
          labelEn: BRAND_ADVERTISING_COLLECTION_LABEL_EN,
          ...showcaseBadgeProps(showcase, BRAND_ADVERTISING_COLLECTION_ID),
          videoOrientation: showcaseOrientation(
            showcase,
            BRAND_ADVERTISING_COLLECTION_ID,
          ),
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
    isOfficial:
      isOfficialAttribution(attribution) &&
      isOfficialAttribution(attributionEn),
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

export function buildMediaShowcaseCollections({
  categories,
  featuredLabel,
  showcase,
}) {
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
      collection.items.length > 0 &&
      !SYNTHETIC_SHOWCASE_COLLECTION_IDS.has(collection.id),
  );
  const projectArchiveCollections = categories
    .filter(
      (category) => category.kind === "project-archive" && category.showcase,
    )
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
            label:
              showcase?.tabs[FEATURED_SHOWCASE_COLLECTION_ID]?.label ??
              featuredLabel,
            labelEn:
              showcase?.tabs[FEATURED_SHOWCASE_COLLECTION_ID]?.labelEn ??
              featuredLabel,
            ...showcaseBadgeProps(showcase, FEATURED_SHOWCASE_COLLECTION_ID),
            videoOrientation: showcaseOrientation(
              showcase,
              FEATURED_SHOWCASE_COLLECTION_ID,
            ),
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
