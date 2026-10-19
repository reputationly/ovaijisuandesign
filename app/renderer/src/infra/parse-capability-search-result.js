// parse-capability-search-result.js
/**
 * 能力检索工具（4.0.0 新增）。
 *
 * 键是**协议版本号**而不是名字：网关按版本号告诉界面「这个版本用哪个工具名」，
 * 于是改名（`hub_*` / `design_*`）不需要两边同时发布。
 * 所以这里取的是 `Object.values`，用不到键本身。
 */
export const CAPABILITY_SEARCH_TOOL_NAMES = {
  2: "hub_capability_search",
  3: "design_capability_search",
};

const CAPABILITY_SEARCH_TOOLS = new Set(Object.values(CAPABILITY_SEARCH_TOOL_NAMES));

/** 判断某个工具名是不是能力检索。挂在工具名上的判断，所以用集合比数组快也可读。 */
export function isCapabilitySearchTool(name) {
  return typeof name === "string" && CAPABILITY_SEARCH_TOOLS.has(name);
}

import { parseConnectorCatalog } from "./parse-connector-catalog.js";

export function parseCapabilitySearchResult(value) {
  if (!value || typeof value !== "object")
    throw new Error("Invalid capability search result");
  const data = value;
  if (
    !Array.isArray(data.matches) ||
    typeof data.partial !== "boolean" ||
    typeof data.nextStep !== "string" ||
    !data.sources ||
    typeof data.sources !== "object"
  )
    throw new Error("Invalid capability search result");
  const sources = {};
  for (const [key, item] of Object.entries(data.sources)) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.available !== "boolean" ||
      typeof item.stale !== "boolean" ||
      (item.reason !== void 0 && typeof item.reason !== "string")
    )
      throw new Error("Invalid capability source");
    sources[key] = {
      available: item.available,
      stale: item.stale,
      ...(item.reason
        ? {
            reason: item.reason,
          }
        : {}),
    };
  }
  const matches = data.matches.map((item) => {
    if (!item || typeof item !== "object")
      throw new Error("Invalid capability match");
    const match = item;
    if (
      typeof match.score !== "number" ||
      !Number.isFinite(match.score) ||
      !Array.isArray(match.matchedTerms) ||
      !match.matchedTerms.every((term) => typeof term === "string") ||
      !match.capability ||
      typeof match.capability !== "object" ||
      !("kind" in match.capability) ||
      match.capability.kind !== "connector"
    )
      throw new Error("Invalid capability match");
    const capability = parseConnectorCatalog({
      version: "search",
      connectors: [match.capability],
    }).connectors[0];
    return {
      capability: {
        ...capability,
        kind: "connector",
      },
      score: match.score,
      matchedTerms: match.matchedTerms,
    };
  });
  return {
    matches,
    sources,
    partial: data.partial,
    nextStep: data.nextStep,
  };
}
