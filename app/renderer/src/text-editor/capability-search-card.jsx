// capability-search-card.jsx
import { normalizeJsonToolResult } from "../chat/has-structured-success-payload.js";
import { parseCapabilitySearchResult } from "../infra/parse-capability-search-result.js";
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ConnectorCapabilityCard } from "../settings/connector-capability-card.jsx";

export function CapabilitySearchCard({ result, searchCallId }) {
  const { t: t2 } = useTranslation();
  const actionable = result.matches.filter(
    ({ capability }) => !capability.autoActivated,
  );
  if (!result.partial && !actionable.length) return null;
  return (
    <div
      className="space-y-3 empty:hidden"
      data-action-ui-id="capability-search-card"
    >
      {result.partial && (
        <p role="status" className="text-xs text-muted-foreground">
          {t2("chat.capabilitySearch.connectorsUnavailable")}
        </p>
      )}
      {actionable.map(({ capability }) => {
        switch (capability.kind) {
          case "connector":
            return (
              <ConnectorCapabilityCard
                key={`connector:${capability.connectorId}`}
                capability={capability}
                searchCallId={searchCallId}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

export function parseCapabilitySearchCardResult(name2, result) {
  if (name2 !== "hub_capability_search" || !result) return null;
  try {
    let value = JSON.parse(normalizeJsonToolResult(result));
    if (
      value &&
      typeof value === "object" &&
      "content" in value &&
      Array.isArray(value.content)
    ) {
      const block = value.content.find(
        (item) =>
          !!item &&
          typeof item === "object" &&
          "type" in item &&
          item.type === "text" &&
          "text" in item &&
          typeof item.text === "string",
      );
      if (!block) return null;
      value = JSON.parse(normalizeJsonToolResult(block.text));
    }
    return parseCapabilitySearchResult(value);
  } catch {
    return null;
  }
}

const RECOMMENDED_SUFFIX_PATTERN =
  /\s*(?:（推荐）|\((?:推荐|recommended)\))\s*$/iu;

export function localizeRecommendedQuestionOptionLabel(label, t2) {
  if (!RECOMMENDED_SUFFIX_PATTERN.test(label)) return label;
  const baseLabel = label.replace(RECOMMENDED_SUFFIX_PATTERN, "").trimEnd();
  return t2("chat.question.recommendedLabel", {
    label: baseLabel,
  });
}

const defaultValue = {
  openPlan: () => false,
};

export const ProductionPlanDisclosureContext =
  reactExports.createContext(defaultValue);
