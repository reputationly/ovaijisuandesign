// normalize-v2-registry.js
import {
  CANVAS_TAG_COLOR_PALETTE,
  CANVAS_TAG_REGISTRY_VERSION,
  PRESET_COLOR_TAG_IDS,
  PRESET_COLOR_TAGS,
  seedTagRegistry,
} from "./parse-connector-selection.js";

function isCanvasTagColor(color) {
  return CANVAS_TAG_COLOR_PALETTE.includes(color);
}

const PRESET_COLOR_TAG_ID_SET = new Set(Object.values(PRESET_COLOR_TAG_IDS));

function isPresetCanvasColorTagId(id) {
  return PRESET_COLOR_TAG_ID_SET.has(id);
}

function orderCanvasTagsByDefaultColor(tags) {
  const priority = new Map(
    CANVAS_TAG_COLOR_PALETTE.map((color, index) => [color, index]),
  );
  return tags
    .map((tag, index) => ({
      tag,
      index,
    }))
    .sort(
      (left, right) =>
        (priority.get(left.tag.color ?? "") ?? Number.MAX_SAFE_INTEGER) -
          (priority.get(right.tag.color ?? "") ?? Number.MAX_SAFE_INTEGER) ||
        left.index - right.index,
    )
    .map(({ tag }) => tag);
}

function normalizeV2Registry(raw) {
  if (raw.version !== CANVAS_TAG_REGISTRY_VERSION || !Array.isArray(raw.tags))
    return null;
  const tags = [];
  const seenIds = new Set();
  for (const candidate of raw.tags) {
    if (!candidate || typeof candidate !== "object") continue;
    const tag = candidate;
    const id = typeof tag.id === "string" ? tag.id.trim() : "";
    const tagName = typeof tag.name === "string" ? tag.name.trim() : "";
    const legacyNameKey =
      typeof tag.legacyNameKey === "string" ? tag.legacyNameKey : void 0;
    const color =
      typeof tag.color === "string" && isCanvasTagColor(tag.color)
        ? tag.color
        : void 0;
    const kind = isPresetCanvasColorTagId(id) ? "color" : "keyword";
    if (!id || seenIds.has(id) || (kind === "color" && !color)) continue;
    if (!tagName && !legacyNameKey) continue;
    seenIds.add(id);
    tags.push({
      id,
      kind,
      ...(kind === "color" && color
        ? {
            color,
          }
        : {}),
      name: tagName || void 0,
      legacyNameKey,
    });
  }
  const revision =
    typeof raw.revision === "number" &&
    Number.isSafeInteger(raw.revision) &&
    raw.revision >= 0
      ? raw.revision
      : 0;
  const orderMode = raw.orderMode === "custom" ? "custom" : "default";
  const existingIds = new Set(tags.map((tag) => tag.id));
  const missingPresetTags = PRESET_COLOR_TAGS.filter(
    (tag) => !existingIds.has(tag.id),
  ).map((tag) => ({
    ...tag,
  }));
  const completeTags =
    orderMode === "custom"
      ? [
          ...tags.filter((tag) => tag.kind === "color"),
          ...missingPresetTags,
          ...tags.filter((tag) => tag.kind === "keyword"),
        ]
      : orderCanvasTagsByDefaultColor([...tags, ...missingPresetTags]);
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
  const tags = PRESET_COLOR_TAGS.map((preset) => ({
    ...preset,
  }));
  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  for (const candidate of Array.isArray(legacy.colors) ? legacy.colors : []) {
    if (!candidate || typeof candidate !== "object") continue;
    const old = candidate;
    if (typeof old.id !== "string") continue;
    const current = byId.get(old.id);
    if (!current) continue;
    const trimmedName = typeof old.name === "string" ? old.name.trim() : "";
    if (trimmedName) current.name = trimmedName;
  }
  const seenIds = new Set(tags.map((tag) => tag.id));
  for (const candidate of Array.isArray(legacy.transparents)
    ? legacy.transparents
    : []) {
    if (!candidate || typeof candidate !== "object") continue;
    const old = candidate;
    const id = typeof old.id === "string" ? old.id.trim() : "";
    const trimmedName = typeof old.name === "string" ? old.name.trim() : "";
    if (!id || seenIds.has(id) || !trimmedName) continue;
    seenIds.add(id);
    tags.push({
      id,
      kind: "keyword",
      name: trimmedName,
    });
  }
  return {
    version: CANVAS_TAG_REGISTRY_VERSION,
    revision: 0,
    orderMode: "default",
    tags: orderCanvasTagsByDefaultColor(tags),
  };
}
