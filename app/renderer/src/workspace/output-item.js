// output-item.js
import { ecommerceArtwork } from "../generation/use-mention-models.jsx";
import {
  filmArtwork,
  shortDramaArtwork,
} from "../generation/use-skill-categories.js";
import {
  DEFAULT_SHOWCASE_ATTRIBUTION,
  DEFAULT_SHOWCASE_ATTRIBUTION_EN,
  DEFAULT_SHOWCASE_DESCRIPTION,
  DEFAULT_SHOWCASE_DESCRIPTION_EN,
  isOfficialAttribution,
  normalizeOfficialAttributionForDisplay,
} from "./parse-project-archive-item.js";

const SCENE_FALLBACK_ARTWORKS = {
  ecommerce: ecommerceArtwork,
  film: filmArtwork,
  "short-drama": shortDramaArtwork,
};

function previewImage(query, fallbackUrl) {
  return (
    query.coverUrl ??
    query.attachments.find(
      (attachment) => attachment.type === "image" && attachment.assetUrl,
    )?.assetUrl ??
    fallbackUrl
  );
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
    id: output
      ? `${scene.id}:${queryId}:${output.id}`
      : `${scene.id}:${queryId}`,
    contentId: output
      ? `${scene.id}:${queryId}:${output.id}`
      : `${scene.id}:${queryId}`,
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
    isOfficial:
      isOfficialAttribution(attribution) &&
      isOfficialAttribution(attributionEn),
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
