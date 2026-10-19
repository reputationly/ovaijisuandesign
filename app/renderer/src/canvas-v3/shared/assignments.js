/**
 * `assignments` 的唯一归属（第 146 轮）。
 *
 * 此前 `canvas-v3-model.js` 与 `project-resource-tags.js` 各有一份。
 * 叶子模块：依赖的校验器就地内联，不导入 canvas-v3 里任何文件。
 */

const invalid$3 = () => {
  throw new Error("Invalid project resource assignments");
};
const object$1 = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid$3();
  return value;
};
const id$2 = (value) => {
  if (typeof value !== "string" || !value.trim() || value.length > 256) invalid$3();
  return value;
};
const keys = (value, allowed) => {
  if (Object.keys(value).some((key) => !allowed.includes(key))) invalid$3();
  return value;
};

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

export { assignments };
