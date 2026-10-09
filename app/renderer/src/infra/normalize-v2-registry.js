// normalize-v2-registry.js
import {
  CANVAS_TAG_COLOR_PALETTE,
  CANVAS_TAG_REGISTRY_VERSION,
  PRESET_COLOR_TAG_IDS,
  PRESET_COLOR_TAGS,
  seedTagRegistry,
} from "./parse-connector-selection.js";

function isCanvasTagColor(color2) {
  return CANVAS_TAG_COLOR_PALETTE.includes(color2);
}

const PRESET_COLOR_TAG_ID_SET = new Set(Object.values(PRESET_COLOR_TAG_IDS));

function isPresetCanvasColorTagId(id2) {
  return PRESET_COLOR_TAG_ID_SET.has(id2);
}

function orderCanvasTagsByDefaultColor(tags2) {
  const priority = new Map(
    CANVAS_TAG_COLOR_PALETTE.map((color2, index2) => [color2, index2]),
  );
  return tags2
    .map((tag, index2) => ({
      tag,
      index: index2,
    }))
    .sort(
      (left, right) =>
        (priority.get(left.tag.color ?? "") ?? Number.MAX_SAFE_INTEGER) -
          (priority.get(right.tag.color ?? "") ?? Number.MAX_SAFE_INTEGER) ||
        left.index - right.index,
    )
    .map(({ tag }) => tag);
}

function normalizeV2Registry(raw2) {
  if (raw2.version !== CANVAS_TAG_REGISTRY_VERSION || !Array.isArray(raw2.tags))
    return null;
  const tags2 = [];
  const seenIds = new Set();
  for (const candidate of raw2.tags) {
    if (!candidate || typeof candidate !== "object") continue;
    const tag = candidate;
    const id2 = typeof tag.id === "string" ? tag.id.trim() : "";
    const name2 = typeof tag.name === "string" ? tag.name.trim() : "";
    const legacyNameKey =
      typeof tag.legacyNameKey === "string" ? tag.legacyNameKey : void 0;
    const color2 =
      typeof tag.color === "string" && isCanvasTagColor(tag.color)
        ? tag.color
        : void 0;
    const kind = isPresetCanvasColorTagId(id2) ? "color" : "keyword";
    if (!id2 || seenIds.has(id2) || (kind === "color" && !color2)) continue;
    if (!name2 && !legacyNameKey) continue;
    seenIds.add(id2);
    tags2.push({
      id: id2,
      kind,
      ...(kind === "color" && color2
        ? {
            color: color2,
          }
        : {}),
      name: name2 || void 0,
      legacyNameKey,
    });
  }
  const revision =
    typeof raw2.revision === "number" &&
    Number.isSafeInteger(raw2.revision) &&
    raw2.revision >= 0
      ? raw2.revision
      : 0;
  const orderMode = raw2.orderMode === "custom" ? "custom" : "default";
  const existingIds = new Set(tags2.map((tag) => tag.id));
  const missingPresetTags = PRESET_COLOR_TAGS.filter(
    (tag) => !existingIds.has(tag.id),
  ).map((tag) => ({
    ...tag,
  }));
  const completeTags =
    orderMode === "custom"
      ? [
          ...tags2.filter((tag) => tag.kind === "color"),
          ...missingPresetTags,
          ...tags2.filter((tag) => tag.kind === "keyword"),
        ]
      : orderCanvasTagsByDefaultColor([...tags2, ...missingPresetTags]);
  return {
    version: CANVAS_TAG_REGISTRY_VERSION,
    revision,
    orderMode,
    tags: completeTags,
  };
}

export function normalizeTagRegistry(input) {
  if (input && typeof input === "object") {
    const v2 = normalizeV2Registry(input);
    if (v2) return v2;
  }
  const legacy = input && typeof input === "object" ? input : null;
  if (
    !legacy ||
    (!Array.isArray(legacy.colors) && !Array.isArray(legacy.transparents))
  ) {
    return seedTagRegistry();
  }
  const tags2 = PRESET_COLOR_TAGS.map((preset2) => ({
    ...preset2,
  }));
  const byId = new Map(tags2.map((tag) => [tag.id, tag]));
  for (const candidate of Array.isArray(legacy.colors) ? legacy.colors : []) {
    if (!candidate || typeof candidate !== "object") continue;
    const old = candidate;
    if (typeof old.id !== "string") continue;
    const current2 = byId.get(old.id);
    if (!current2) continue;
    const name2 = typeof old.name === "string" ? old.name.trim() : "";
    if (name2) current2.name = name2;
  }
  const seenIds = new Set(tags2.map((tag) => tag.id));
  for (const candidate of Array.isArray(legacy.transparents)
    ? legacy.transparents
    : []) {
    if (!candidate || typeof candidate !== "object") continue;
    const old = candidate;
    const id2 = typeof old.id === "string" ? old.id.trim() : "";
    const name2 = typeof old.name === "string" ? old.name.trim() : "";
    if (!id2 || seenIds.has(id2) || !name2) continue;
    seenIds.add(id2);
    tags2.push({
      id: id2,
      kind: "keyword",
      name: name2,
    });
  }
  return {
    version: CANVAS_TAG_REGISTRY_VERSION,
    revision: 0,
    orderMode: "default",
    tags: orderCanvasTagsByDefaultColor(tags2),
  };
}
