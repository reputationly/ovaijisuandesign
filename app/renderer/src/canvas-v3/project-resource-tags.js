/**
 * 项目资源标签的校验与快照解析 —— 从产物取回（第 79 轮）。
 *
 * `invalid$3`…`parseProjectResourceTagReceipt` 是产物里**连续的一整段**，整段搬；
 * `buildTagIndex` / `validateAssetTagIds` 在另一个 chunk，一并取回。
 */
import {
  PRESET_COLOR_NAME_KEYS,
  countCanvasTagNameUnits,
  CANVAS_TAG_NAME_MAX_LENGTH,
  MAX_COLOR_TAGS_PER_ASSET,
} from "../infra/parse-connector-selection.js";
import { isCanvasTagColor } from "../infra/normalize-v2-registry.js";

export const PROJECT_RESOURCE_TAG_HTTP_ROUTES = {
  get: "/api/project/resources/tags/get",
  commands: "/api/project/resources/tags/commands",
};

function buildTagIndex(registry) {
  return new Map(registry.tags.map((tag) => [tag.id, tag]));
}

function validateAssetTagIds(tagIds, registry) {
  const index2 = buildTagIndex(registry);
  const seen2 = /* @__PURE__ */ new Set();
  let colorCount = 0;
  for (const id of tagIds) {
    const tag = index2.get(id);
    if (!tag) return { code: "unknown-tag", tagId: id };
    if (seen2.has(id)) return { code: "duplicate-tag", tagId: id };
    seen2.add(id);
    if (tag.kind === "color") colorCount += 1;
  }
  if (colorCount > MAX_COLOR_TAGS_PER_ASSET) {
    return { code: "color-limit", limit: MAX_COLOR_TAGS_PER_ASSET };
  }
  return null;
}
function invalid$3() {
  throw new Error("Invalid project resource tag payload");
}
function object$1(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid$3();
  return value;
}
function revision$2(value) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) invalid$3();
  return value;
}
function id$2(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 256 || value.includes("\0"))
    invalid$3();
  return value;
}
function keys(value, allowed) {
  if (Object.keys(value).some((key2) => !allowed.includes(key2))) invalid$3();
}
function registry(value) {
  const raw2 = object$1(value);
  keys(raw2, ["version", "revision", "orderMode", "tags"]);
  if (raw2.version !== 2 || raw2.orderMode !== "default" && raw2.orderMode !== "custom" || !Array.isArray(raw2.tags) || raw2.tags.length > 1e3)
    invalid$3();
  const seen = /* @__PURE__ */ new Set();
  const names = /* @__PURE__ */ new Set();
  const tags2 = raw2.tags.map((candidate) => {
    const tag = object$1(candidate);
    keys(tag, ["id", "kind", "name", "color", "legacyNameKey"]);
    const tagId = id$2(tag.id);
    if (seen.has(tagId)) invalid$3();
    seen.add(tagId);
    const presetKey = Object.hasOwn(PRESET_COLOR_NAME_KEYS, tagId) ? PRESET_COLOR_NAME_KEYS[tagId] : void 0;
    const kind2 = presetKey ? "color" : "keyword";
    if (tag.kind !== kind2) invalid$3();
    const name2 = tag.name === void 0 ? void 0 : id$2(tag.name).trim();
    if (name2 && (countCanvasTagNameUnits(name2) > CANVAS_TAG_NAME_MAX_LENGTH || names.has(name2)))
      invalid$3();
    if (name2) names.add(name2);
    if (!name2 && !presetKey) invalid$3();
    if (tag.legacyNameKey !== void 0 && tag.legacyNameKey !== presetKey) invalid$3();
    if (tag.kind === "color" && (typeof tag.color !== "string" || !isCanvasTagColor(tag.color)))
      invalid$3();
    if (tag.kind === "keyword" && tag.color !== void 0) invalid$3();
    return {
      id: tagId,
      kind: kind2,
      ...name2 ? { name: name2 } : {},
      ...tag.kind === "color" ? { color: tag.color } : {},
      ...presetKey && !name2 ? { legacyNameKey: presetKey } : {}
    };
  });
  if (Object.keys(PRESET_COLOR_NAME_KEYS).some((key2) => !seen.has(key2))) invalid$3();
  return { version: 2, revision: revision$2(raw2.revision), orderMode: raw2.orderMode, tags: tags2 };
}
function assignments(value) {
  if (!Array.isArray(value)) invalid$3();
  const seen = /* @__PURE__ */ new Set();
  return value.map((candidate) => {
    const item = object$1(candidate);
    keys(item, ["resourceId", "tagIds"]);
    const resourceId2 = id$2(item.resourceId);
    if (seen.has(resourceId2) || !Array.isArray(item.tagIds) || item.tagIds.length > 1e3) invalid$3();
    seen.add(resourceId2);
    const tagIds = item.tagIds.map(id$2);
    if (new Set(tagIds).size !== tagIds.length) invalid$3();
    return { resourceId: resourceId2, tagIds };
  });
}
function parseProjectResourceTagSnapshot(value) {
  const raw2 = object$1(value);
  const result = {
    revision: revision$2(raw2.revision),
    registry: registry(raw2.registry),
    assignments: assignments(raw2.assignments)
  };
  if (result.registry.revision !== result.revision || result.assignments.some((item) => validateAssetTagIds(item.tagIds, result.registry)))
    invalid$3();
  return result;
}
function parseProjectResourceTagReceipt(value) {
  const raw2 = object$1(value);
  if (typeof raw2.committed !== "boolean") invalid$3();
  return {
    commandId: id$2(raw2.commandId),
    committed: raw2.committed,
    snapshot: parseProjectResourceTagSnapshot(raw2.snapshot)
  };
}

export {
  buildTagIndex,
  validateAssetTagIds,
  parseProjectResourceTagSnapshot,
  parseProjectResourceTagReceipt,
};
