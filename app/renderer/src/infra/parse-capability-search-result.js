// parse-capability-search-result.js
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
