// parse-capability-search-result.js
import { parseConnectorCatalog } from "./parse-connector-catalog.js";

export function parseCapabilitySearchResult(value) {
  if (!value || typeof value !== "object")
    throw new Error("Invalid capability search result");
  const data2 = value;
  if (
    !Array.isArray(data2.matches) ||
    typeof data2.partial !== "boolean" ||
    typeof data2.nextStep !== "string" ||
    !data2.sources ||
    typeof data2.sources !== "object"
  )
    throw new Error("Invalid capability search result");
  const sources = {};
  for (const [key2, item] of Object.entries(data2.sources)) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.available !== "boolean" ||
      typeof item.stale !== "boolean" ||
      (item.reason !== void 0 && typeof item.reason !== "string")
    )
      throw new Error("Invalid capability source");
    sources[key2] = {
      available: item.available,
      stale: item.stale,
      ...(item.reason
        ? {
            reason: item.reason,
          }
        : {}),
    };
  }
  const matches2 = data2.matches.map((item) => {
    if (!item || typeof item !== "object")
      throw new Error("Invalid capability match");
    const match2 = item;
    if (
      typeof match2.score !== "number" ||
      !Number.isFinite(match2.score) ||
      !Array.isArray(match2.matchedTerms) ||
      !match2.matchedTerms.every((t2) => typeof t2 === "string") ||
      !match2.capability ||
      typeof match2.capability !== "object" ||
      !("kind" in match2.capability) ||
      match2.capability.kind !== "connector"
    )
      throw new Error("Invalid capability match");
    const capability = parseConnectorCatalog({
      version: "search",
      connectors: [match2.capability],
    }).connectors[0];
    return {
      capability: {
        ...capability,
        kind: "connector",
      },
      score: match2.score,
      matchedTerms: match2.matchedTerms,
    };
  });
  return {
    matches: matches2,
    sources,
    partial: data2.partial,
    nextStep: data2.nextStep,
  };
}
