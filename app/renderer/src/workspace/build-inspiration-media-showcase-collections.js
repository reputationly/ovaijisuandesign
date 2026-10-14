// build-inspiration-media-showcase-collections.js
import {
  buildFeaturedItems,
  FEATURED_SHOWCASE_COLLECTION_ID,
  HOME_SHOWCASE_MAX_ITEMS_PER_COLLECTION,
  HOME_SHOWCASE_MAX_TOTAL_ITEMS,
  showcaseBadgeProps,
  showcaseOrientation,
  uniqueItemsByVideoUrl,
} from "./parse-project-archive-item.js";
import { sceneItems } from "./output-item.js";
export function buildInspirationMediaShowcaseCollections({
  categories,
  featuredLabel,
  showcase,
}) {
  const featuredScenes = categories
    .filter(
      (category) => category.kind === "scene" && category.showcase === true,
    )
    .map((category) => ({
      scene: category.scene,
      entries: sceneItems(category.scene, category.videoUrl),
    }));
  const featuredItems = buildFeaturedItems(featuredScenes);
  let remainingItemBudget = HOME_SHOWCASE_MAX_TOTAL_ITEMS;
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
    ...categories.flatMap((category) => {
      if (
        category.kind !== "scene" ||
        category.id === FEATURED_SHOWCASE_COLLECTION_ID
      )
        return [];
      const items = uniqueItemsByVideoUrl(
        sceneItems(category.scene, category.videoUrl).map(({ item }) => item),
      );
      return items.length > 0
        ? [
            {
              id: category.id,
              label: category.name,
              labelEn: category.nameEn,
              ...showcaseBadgeProps(showcase, category.id),
              videoOrientation: showcaseOrientation(showcase, category.id),
              items,
            },
          ]
        : [];
    }),
  ];
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
export function resolveHomeFeaturedSkillPrompt(skill, preset, isZh) {
  if (isZh) return preset?.prompt || skill.guidePrompt || skill.guidePromptEn;
  return preset?.promptEn || skill.guidePromptEn || skill.guidePrompt;
}
