// submit-button.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  ACTION_BTN_BASE,
  CompactCreditCost,
  SPINNER,
} from "./expand-arrow-icon.jsx";
import { renderCostDisclosure } from "./render-cost-disclosure.jsx";
import { renderCostBadgeWithTooltip } from "./render-cost-badge-with-tooltip.jsx";
import { Tooltip } from "./missing-asset-card.jsx";
const SQUARE_BTN_BASE =
  "flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--canvas-controls-border)] text-[13px] font-medium transition-colors duration-150";
export function SubmitButton({
  submitting,
  canSubmit,
  loading,
  creditCost,
  costBadge,
  showBillingEstimate,
  billingTooltip,
  billingDetails,
  billingEstimateFormula,
  onClick,
  title,
  children,
}) {
  const { t: translate } = useTranslation();
  const showSpinner = submitting || loading;
  const isDisabled = submitting || (!canSubmit && !loading);
  const stateClass = showSpinner
    ? "bg-[var(--canvas-controls-hover)] text-[var(--canvas-controls-text-muted)] cursor-wait"
    : !canSubmit
      ? "bg-[var(--canvas-controls-hover)] text-[var(--canvas-controls-text-muted)] cursor-default opacity-60"
      : "bg-foreground text-background hover:enabled:opacity-90 border-transparent";
  const isSquare = !children && !showSpinner;
  const button = (
    <button
      type="button"
      className={`${isSquare ? SQUARE_BTN_BASE : ACTION_BTN_BASE} ${stateClass}`}
      onClick={onClick}
      disabled={isDisabled}
      title={isDisabled ? void 0 : title}
      data-action-ui-id="popover.submit"
    >
      {showSpinner ? (
        SPINNER
      ) : children ? (
        children
      ) : (
        <span aria-hidden="true">↑</span>
      )}
    </button>
  );
  const disabledTooltip = !canSubmit && !loading ? title : void 0;
  const estimatedCostLabel =
    creditCost != null
      ? translate("canvas.billing.estimatedCost", {
          cost: creditCost,
          defaultValue: "预计消耗 {{cost}} 积分",
        })
      : void 0;
  const billingDetailsLabel = translate("canvas.billing.details", {
    defaultValue: "查看价格说明",
  });
  return (
    <>
      {!showSpinner &&
        costBadge &&
        renderCostBadgeWithTooltip({
          badge: costBadge,
          showBillingEstimate,
          billingTooltip,
          billingDetails,
          billingEstimateFormula,
          estimatedCostLabel,
          billingDetailsLabel,
        })}
      {!showSpinner &&
        !costBadge &&
        creditCost != null &&
        renderCostDisclosure({
          billingTooltip,
          billingDetails,
          billingEstimateFormula,
          estimatedCostLabel,
          billingDetailsLabel,
          children: <CompactCreditCost creditCost={creditCost} />,
        })}
      {disabledTooltip ? (
        <Tooltip content={disabledTooltip}>
          <span className="inline-flex">{button}</span>
        </Tooltip>
      ) : (
        button
      )}
    </>
  );
}
