// render-cost-badge-with-tooltip.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { renderCostDisclosure } from "./render-cost-disclosure.jsx";

export function renderCostBadgeWithTooltip({
  badge,
  showBillingEstimate = true,
  billingTooltip,
  billingDetails,
  billingEstimateFormula,
  estimatedCostLabel,
  billingDetailsLabel,
}) {
  if (!badge) return null;
  const trigger = reactExports.isValidElement(badge) ? (
    badge
  ) : (
    <span className="inline-flex">{badge}</span>
  );
  if (!showBillingEstimate) {
    return (
      <span className="mr-1 inline-flex shrink-0 items-center">{trigger}</span>
    );
  }
  return renderCostDisclosure({
    billingTooltip,
    billingDetails,
    billingEstimateFormula,
    estimatedCostLabel,
    billingDetailsLabel,
    children: trigger,
  });
}
