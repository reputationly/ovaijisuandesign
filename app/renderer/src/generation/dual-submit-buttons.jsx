// dual-submit-buttons.jsx
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
export function DualSubmitButtons({
  submitting,
  canSubmit,
  creditCost,
  costBadge,
  showBillingEstimate,
  billingTooltip,
  billingDetails,
  billingEstimateFormula,
  newNodeLabel,
  replaceLabel,
  onNewNode,
  onReplace,
  disabledTitle,
}) {
  const { t: translate } = useTranslation();
  const filledLabel = newNodeLabel ?? translate("chat.regenerate", "重新生成");
  const outlineLabel =
    replaceLabel ?? translate("canvas.replaceCurrentNode", "替换当前节点");
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
  const disabled = submitting || !canSubmit;
  const withDisabledTooltip = (button) =>
    disabled && disabledTitle ? (
      <Tooltip content={disabledTitle}>
        <span className="inline-flex">{button}</span>
      </Tooltip>
    ) : (
      button
    );
  return (
    <>
      {!submitting &&
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
      {!costBadge &&
        creditCost != null &&
        !submitting &&
        renderCostDisclosure({
          billingTooltip,
          billingDetails,
          billingEstimateFormula,
          estimatedCostLabel,
          billingDetailsLabel,
          children: <CompactCreditCost creditCost={creditCost} />,
        })}
      {withDisabledTooltip(
        <button
          type="button"
          className={`${ACTION_BTN_BASE} ${disabled ? "bg-[var(--canvas-controls-hover)] text-[var(--canvas-controls-text-muted)] cursor-default opacity-60" : "bg-foreground text-background hover:enabled:opacity-90 border-transparent"}`}
          onClick={onNewNode}
          disabled={disabled}
          title={disabled ? void 0 : String(filledLabel)}
          data-action-ui-id="popover.submit"
        >
          {submitting ? SPINNER : <span>{filledLabel}</span>}
        </button>,
      )}
      {withDisabledTooltip(
        <button
          type="button"
          className={`${ACTION_BTN_BASE} ${disabled ? "text-[var(--canvas-controls-text-muted)] cursor-default opacity-60" : "text-[var(--canvas-controls-text)] hover:enabled:bg-[var(--canvas-controls-hover)]"}`}
          style={{
            background: "transparent",
          }}
          onClick={onReplace}
          disabled={disabled}
          title={disabled ? void 0 : String(outlineLabel)}
        >
          <span>{outlineLabel}</span>
        </button>,
      )}
    </>
  );
}
