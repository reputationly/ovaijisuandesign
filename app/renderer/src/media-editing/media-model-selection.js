// wt.js
import { registrySelectionRowIds } from "../generation/normalize-skill-detail-metadata.js";
import { AUDIO_MODELS } from "../generation/audio-models.js";
import { IMAGE_MODELS } from "../generation/image-models.js";
import { VIDEO_MODELS } from "../generation/video-models.js";
import reactExports from "react";
import { urlAttributes } from "html-url-attributes";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import { unified } from "unified";
import { visit } from "unist-util-visit";






















function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
export function cleanPath(src) {
  if (!src) return "";
  try {
    const url = new URL(src);
    return safeDecodeURIComponent(url.pathname);
  } catch {
    return safeDecodeURIComponent(src.split(/[?#]/)[0] ?? src);
  }
}
export const MEDIA_CATEGORIES = ["image", "video", "audio"];
function buildSelectionAliasIndex(entries) {
  const mutable = new Map();
  for (const entry of entries) {
    const aliases = [
      entry.id,
      entry.model_name,
      entry.publicToken,
      ...(entry.selectionAliases ?? []),
    ].filter((value) => Boolean(value));
    for (const alias of aliases) {
      const existing = mutable.get(alias) ?? {
        rowIds: new Set(),
      };
      for (const rowId of registrySelectionRowIds(entry))
        existing.rowIds.add(rowId);
      mutable.set(alias, existing);
    }
  }
  return mutable;
}
const SELECTION_ALIASES_BY_CATEGORY = {
  image: buildSelectionAliasIndex(IMAGE_MODELS),
  video: buildSelectionAliasIndex(VIDEO_MODELS),
  audio: buildSelectionAliasIndex(AUDIO_MODELS),
};
function isMediaCategory(value) {
  return MEDIA_CATEGORIES.includes(value);
}
function selectionIdMatchesVisibleModel(selectionId, model, category) {
  if (selectionId === model.id || selectionId === model.series_id) return true;
  const aliases = SELECTION_ALIASES_BY_CATEGORY[category].get(selectionId);
  if (!aliases) return false;
  return aliases.rowIds.has(model.id);
}
export function isVisibleMediaModelSelected(selected, model) {
  if (!isMediaCategory(model.type)) return false;
  const category = model.type;
  const selectedIds = selected[category];
  if (selectedIds === void 0) return true;
  return selectedIds.some((selectionId) =>
    selectionIdMatchesVisibleModel(selectionId, model, category),
  );
}
export function countVisibleSelectedMediaModels(selected, models) {
  return models.filter(
    (model) =>
      model.visibility !== "hidden" &&
      isMediaCategory(model.type) &&
      isVisibleMediaModelSelected(selected, model),
  ).length;
}
export function isAllVisibleMediaModelsSelected(selected, models) {
  for (const category of MEDIA_CATEGORIES) {
    const visibleModels = models.filter(
      (model) => model.type === category && model.visibility !== "hidden",
    );
    if (
      !visibleModels.every((model) =>
        isVisibleMediaModelSelected(selected, model),
      )
    )
      return false;
  }
  return true;
}
