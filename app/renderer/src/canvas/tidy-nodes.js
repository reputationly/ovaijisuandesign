// 整理节点时的名字、加入时间和稳定排序。
export const GROUP_LABEL_MAX_LENGTH = 40;


export function normalizeLabel$1(label) {
  if (typeof label !== "string") return void 0;
  const trimmed = label.trim();
  if (trimmed.length === 0) return void 0;
  return trimmed.length > GROUP_LABEL_MAX_LENGTH ? trimmed.slice(0, GROUP_LABEL_MAX_LENGTH) : trimmed;
}
const nameCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base"
});
const nonEmpty = value => typeof value === "string" && value.trim() ? value.trim() : void 0;
export function tidyNodeName(node2, options) {
  const data2 = node2.data && typeof node2.data === "object" ? node2.data : {};
  const authored = node2.type === "group" ? data2.label : node2.type === "table" ? data2.title : data2.name;
  return nonEmpty(authored) ?? nonEmpty(options?.assetName?.(node2)) ?? nonEmpty(data2.path)?.split(/[\\/]/).filter(Boolean).at(-1);
}
function addedAt(node2) {
  const value = node2.meta?.addedAt;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
}
function stableOrder(a2, b3) {
  const at2 = addedAt(a2);
  const bt2 = addedAt(b3);
  if (at2 !== bt2) {
    if (at2 === void 0) return 1;
    if (bt2 === void 0) return -1;
    return at2 - bt2;
  }
  return a2.id < b3.id ? -1 : a2.id > b3.id ? 1 : 0;
}
export function orderTidyNodes(nodes, options = {}) {
  const names = new Map(nodes.map(node2 => [node2.id, tidyNodeName(node2, options)]));
  return [...nodes].sort((a2, b3) => {
    if (options.sortBy !== "addedAt") {
      const an2 = names.get(a2.id);
      const bn2 = names.get(b3.id);
      if (an2 === void 0 && bn2 !== void 0) return 1;
      if (bn2 === void 0 && an2 !== void 0) return -1;
      if (an2 !== void 0 && bn2 !== void 0) {
        const compared = nameCollator.compare(an2, bn2);
        if (compared !== 0) return compared;
      }
    }
    return stableOrder(a2, b3);
  });
}
export function pinnedTidyNodeIds(nodes) {
  const byId = new Map(nodes.map(node2 => [node2.id, node2]));
  const pinned = /* @__PURE__ */new Set();
  for (const node2 of nodes) {
    if (!node2.meta?.locked) continue;
    let current2 = node2;
    const visited = /* @__PURE__ */new Set();
    while (current2 && !visited.has(current2.id)) {
      visited.add(current2.id);
      pinned.add(current2.id);
      current2 = current2.parentId ? byId.get(current2.parentId) : void 0;
    }
  }
  return pinned;
}
