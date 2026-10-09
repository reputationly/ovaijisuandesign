// param-tabs.jsx
import { jsxRuntimeExports, reactExports, CompositedSvg, useTranslation, PreviewCardRoot, PreviewCardTrigger$1, PreviewCardPortal, PreviewCardPositioner, PreviewCardPopup, Info$1 } from "../vendor.js";
import { CanvasReleaseRegionContext } from "../m15/canvas-surface-recovery-scheduler.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Tooltip$1 } from "./create-tracker.jsx";
import { PARAM_OPTION_SELECTED_CLASS, ParamSectionLabel } from "./slider.jsx";
const SECONDS_OPTION_PATTERN = /^\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?$/;
export function formatSecondsOption(value) {
  return SECONDS_OPTION_PATTERN.test(value.trim()) ? `${value}s` : value;
}
function shouldRenderParamTabs(optionCount, variant) {
  return variant !== "track" || optionCount > 1;
}
export function ParamTabs({
  label,
  options,
  value,
  onChange,
  disabled: disabled2,
  disabledOptions,
  getDisabledOptionTooltip,
  getOptionLabel,
  grouped = false,
  optionUnit,
  variant = "tags",
  trackColumns,
  allowDeselect,
}) {
  const { t: t2 } = useTranslation();
  if (!shouldRenderParamTabs(options.length, variant)) return null;
  const selectedIndex = Math.max(0, options.indexOf(value));
  const trackColumnCount = Math.max(1, Math.min(trackColumns ?? options.length, options.length));
  const selectedColumn = selectedIndex % trackColumnCount;
  const selectedRow = Math.floor(selectedIndex / trackColumnCount);
  const trackStyle = {
    gridTemplateColumns: `repeat(${trackColumnCount}, minmax(0, 1fr))`,
  };
  const thumbStyle = {
    width: `calc((100% - 4px) / ${trackColumnCount})`,
    transform: `translate(${selectedColumn * 100}%, ${selectedRow * 100}%)`,
  };
  return (
    <div>
      <ParamSectionLabel>{label}</ParamSectionLabel>
      <fieldset
        className={
          variant === "track"
            ? "relative m-0 grid w-full min-w-0 rounded-[8px] border-0 bg-foreground/[0.06] p-0.5"
            : grouped
              ? "m-0 grid grid-cols-8 gap-1.5 rounded-md border-0 bg-[color-mix(in_srgb,var(--canvas-controls-hover)_60%,transparent)] p-1"
              : "m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0"
        }
        style={variant === "track" ? trackStyle : void 0}
        aria-label={label}
      >
        {variant === "track" && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0.5 left-0.5 h-7 rounded-[6px] bg-[var(--canvas-controls-bg)] transition-transform duration-200 ease-out"
            style={thumbStyle}
          />
        )}
        {options.map((opt) => {
          const isSelected = opt === value;
          const isOptDisabled = disabled2 || (disabledOptions?.has(opt) ?? false);
          const secondsLabel = formatSecondsOption(opt);
          const optionLabel = getOptionLabel
            ? getOptionLabel(opt)
            : optionUnit === "seconds" && secondsLabel !== opt
              ? t2("canvas.params.durationOption", {
                  duration: opt,
                  defaultValue: secondsLabel,
                })
              : t2(`canvas.param.option.${opt}`, {
                  defaultValue: opt,
                });
          const button = (
            <button
              key={opt}
              type="button"
              onClick={(e2) => {
                e2.stopPropagation();
                if (isOptDisabled || disabled2) return;
                if (isSelected && allowDeselect) {
                  onChange?.("");
                  return;
                }
                onChange?.(opt);
              }}
              disabled={isOptDisabled}
              aria-pressed={isSelected}
              className={[
                variant === "track"
                  ? "relative z-10 h-7 w-full min-w-0 truncate rounded-[6px] px-2.5 text-[13px] transition-colors duration-150 cursor-pointer disabled:cursor-default"
                  : grouped
                    ? "flex h-7 w-full items-center justify-center border rounded-sm px-3 py-0 text-center text-[13px] transition-colors duration-150 cursor-pointer disabled:cursor-default"
                    : "h-7 px-3 py-0 text-[13px] border rounded-sm transition-colors duration-150 cursor-pointer disabled:cursor-default",
                variant === "track"
                  ? isSelected
                    ? "font-normal text-foreground"
                    : "font-normal text-muted-foreground hover:enabled:text-foreground"
                  : grouped
                    ? isSelected
                      ? PARAM_OPTION_SELECTED_CLASS
                      : "border-transparent bg-transparent text-foreground/70 hover:enabled:bg-[var(--canvas-controls-hover)] hover:enabled:text-foreground"
                    : isSelected
                      ? PARAM_OPTION_SELECTED_CLASS
                      : "border-border bg-transparent text-foreground/70 hover:enabled:bg-[var(--canvas-controls-hover)] hover:enabled:text-foreground",
                isOptDisabled && !isSelected ? "opacity-40" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {optionLabel}
            </button>
          );
          const disabledOptionTooltip =
            !disabled2 && disabledOptions?.has(opt) ? getDisabledOptionTooltip?.(opt) : void 0;
          return disabledOptionTooltip ? (
            <Tooltip$1 key={opt} content={disabledOptionTooltip}>
              <span
                className={
                  variant === "track" ? "flex min-w-0" : grouped ? "flex w-full" : "inline-flex"
                }
              >
                {button}
              </span>
            </Tooltip$1>
          ) : (
            button
          );
        })}
      </fieldset>
    </div>
  );
}
export function ParamTextarea({
  label,
  value,
  onChange,
  disabled: disabled2,
  placeholder,
  rows = 3,
}) {
  return (
    <div>
      <ParamSectionLabel>{label}</ParamSectionLabel>
      <textarea
        rows={rows}
        value={value}
        onChange={(e2) => {
          e2.stopPropagation();
          onChange?.(e2.target.value);
        }}
        onClick={(e2) => e2.stopPropagation()}
        disabled={disabled2}
        placeholder={placeholder}
        className="w-full bg-[var(--canvas-controls-hover)] border border-[var(--canvas-controls-border)] px-2.5 py-1.5 text-[13px] text-[var(--canvas-controls-text)] placeholder:text-[var(--canvas-controls-text-muted)] outline-none resize-none transition-[border-color] duration-150 focus:border-[var(--canvas-node-border-selected)]"
      />
    </div>
  );
}
function ExpandArrowIcon({ expanded }) {
  return expanded ? (
    <CompositedSvg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 3v4h4M3 9h4v4" />
      <path d="M9 7l5-5M2 14l5-5" />
    </CompositedSvg>
  ) : (
    <CompositedSvg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 2h4v4M6 14H2v-4" />
      <path d="M14 2L9 7M2 14l5-5" />
    </CompositedSvg>
  );
}
export function ExpandToggleButton({ expanded, onToggle }) {
  const { t: t2 } = useTranslation();
  return (
    <button
      type="button"
      onClick={(e2) => {
        e2.stopPropagation();
        onToggle();
      }}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-foreground/40 transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"
      title={expanded ? t2("canvas.popover.collapse") : t2("canvas.popover.expand")}
    >
      <ExpandArrowIcon expanded={expanded} />
    </button>
  );
}
export function CloseButton$1({ onClick, disabled: disabled2, title, variant = "cancel" }) {
  if (variant === "inline") {
    return (
      <button
        type="button"
        className="text-[12px] text-[var(--canvas-controls-text-muted)] hover:text-[var(--canvas-controls-text)] leading-none"
        onClick={onClick}
        disabled={disabled2}
        title={title}
      >
        ✕
      </button>
    );
  }
  return (
    <button
      type="button"
      className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[var(--canvas-controls-text-muted)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] disabled:cursor-default disabled:opacity-40"
      onClick={onClick}
      disabled={disabled2}
      title={title}
    >
      ✕
    </button>
  );
}
const SPINNER = (
  <div className="w-3 h-3 border-[1.5px] border-[var(--canvas-controls-text-muted)] border-t-[var(--canvas-controls-text)] rounded-full animate-spin" />
);
function TokenIcon$1() {
  return (
    <CompositedSvg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.52105 2L7.25885 6.2093L4.80361 2.71115L2.71115 4.80361L6.2093 7.25885L2 6.52111V9.47895L6.2093 8.74115L2.71115 11.1964L4.80361 13.2889L7.25885 9.7907L6.52105 14H9.47889L8.74108 9.7907L11.1964 13.2889L13.2889 11.1964L9.7907 8.74115L14 9.47895V6.52111L9.7907 7.25885L13.2889 4.80361L11.1964 2.71115L8.74108 6.2093L9.47889 2H6.52105Z"
      />
    </CompositedSvg>
  );
}
const ACTION_BTN_BASE =
  "flex h-8 items-center gap-1.5 rounded-[8px] border border-[var(--canvas-controls-border)] px-3.5 text-[13px] font-medium transition-colors duration-150";
const SQUARE_BTN_BASE =
  "flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--canvas-controls-border)] text-[13px] font-medium transition-colors duration-150";
const COST_BADGE_CLASS =
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[13px] tracking-tight text-[var(--canvas-controls-text,#fff)]/70";
function CompactCreditCost({ creditCost }) {
  return (
    <span className={COST_BADGE_CLASS}>
      <TokenIcon$1 />
      <span className="pointer-events-none tabular-nums">{creditCost}</span>
    </span>
  );
}
const FULL_EMPHASIS_PATTERN = /^\*\*(.+)\*\*$/;
const INLINE_EMPHASIS_PATTERN = /\*\*(.+?)\*\*/g;
function splitBillingTooltipDetail(line) {
  const chineseColonIndex = line.indexOf("：");
  const asciiColonIndex = line.indexOf(":");
  const colonIndexes = [chineseColonIndex, asciiColonIndex].filter((index2) => index2 >= 0);
  const colonIndex = colonIndexes.length > 0 ? Math.min(...colonIndexes) : -1;
  if (colonIndex <= 0)
    return {
      description: line,
    };
  const tag = line.slice(0, colonIndex).trim();
  const description = line.slice(colonIndex + 1).trim();
  if (!tag || !description)
    return {
      description: line,
    };
  return {
    tag,
    description,
  };
}
function splitCompoundBillingDetails(line) {
  const segments = line
    .split(/[；;]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length < 2) return void 0;
  const details = segments.map((segment) => {
    const colonDetail = splitBillingTooltipDetail(segment);
    if (colonDetail.tag) return colonDetail;
    const compactDetail = segment.match(/^(.+?)[：:]?\s*((?:\d[\d.,]*|免费|free\b).*)$/i);
    if (!compactDetail) return void 0;
    const tag = compactDetail[1]?.trim();
    const description = compactDetail[2]?.trim();
    return tag && description
      ? {
          tag,
          description,
        }
      : void 0;
  });
  return details.every((detail) => detail != null) ? details : void 0;
}
function renderBillingText(text2) {
  const nodes = [];
  let cursor = 0;
  for (const match2 of text2.matchAll(INLINE_EMPHASIS_PATTERN)) {
    const start2 = match2.index;
    if (start2 > cursor) nodes.push(text2.slice(cursor, start2));
    nodes.push(
      <strong key={`${start2}:${match2[1]}`} className="font-medium text-popover-foreground">
        {match2[1]}
      </strong>,
    );
    cursor = start2 + match2[0].length;
  }
  if (cursor < text2.length) nodes.push(text2.slice(cursor));
  return nodes.length > 0 ? nodes : text2;
}
function expandBillingTableLine(line) {
  if (line.endsWith("：") || line.endsWith(":")) {
    return [
      {
        kind: "section",
        label: line.slice(0, -1).trim(),
      },
    ];
  }
  const compoundDetails = splitCompoundBillingDetails(line);
  if (compoundDetails) {
    return compoundDetails.map(({ tag: tag2, description: description2 }) => ({
      kind: "detail",
      label: tag2,
      description: description2,
    }));
  }
  const { tag, description } = splitBillingTooltipDetail(line);
  return [
    {
      kind: "detail",
      label: tag,
      description,
    },
  ];
}
function renderBillingDetailRows(rows) {
  return rows.map((row) =>
    row.kind === "section" ? (
      <tr key={`section:${row.label}`}>
        <th
          colSpan={2}
          className="px-1 py-1 text-[11px] font-medium leading-4 text-popover-foreground/50"
        >
          {renderBillingText(row.label)}
        </th>
      </tr>
    ) : (
      <tr key={`detail:${row.label ?? "text"}:${row.description}`}>
        {row.label ? (
          <th
            scope="row"
            className="w-[60px] border-r border-foreground/5 py-1 pl-1 pr-1.5 align-top text-[11px] font-medium leading-[18px] text-popover-foreground/70"
          >
            {renderBillingText(row.label)}
          </th>
        ) : null}
        <td
          colSpan={row.label ? 1 : 2}
          className="break-words py-1 pl-2 pr-1 align-top text-[12px] leading-[18px] text-popover-foreground/70"
        >
          {renderBillingText(row.description)}
        </td>
      </tr>
    ),
  );
}
function parseBillingTooltip(content2) {
  const [headingLine, ...detailLines] = content2
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const lastLine = detailLines.at(-1);
  const summaryLine = lastLine?.startsWith("**") ? lastLine : void 0;
  return {
    heading: headingLine?.match(FULL_EMPHASIS_PATTERN)?.[1] ?? headingLine ?? "",
    bodyLines: summaryLine ? detailLines.slice(0, -1) : detailLines,
    summaryLine,
  };
}
const BILLING_ESTIMATE_PATTERN = /^\*\*(.+?)[（(]\*\*(.+)[）)]$/;
function parseBillingEstimateCopy(summaryLine, fallbackTitle) {
  const match2 = summaryLine?.match(BILLING_ESTIMATE_PATTERN);
  if (match2) {
    return {
      title: match2[1]?.trim() ?? "",
      formula: match2[2]?.trim(),
    };
  }
  const summaryTitle = summaryLine?.replaceAll("**", "").trim();
  return {
    title: summaryTitle || fallbackTitle || "",
  };
}
function BillingTooltipContent({ content: content2, details, showSummary = true }) {
  const parsed = content2 ? parseBillingTooltip(content2) : void 0;
  const parsedTableRows = parsed?.bodyLines.flatMap(expandBillingTableLine) ?? [];
  const sectionRowIndex = parsedTableRows.findIndex((row) => row.kind === "section");
  const leadingRows = details
    ? details.leadingRows.map(({ label, description }) => ({
        kind: "detail",
        label,
        description,
      }))
    : sectionRowIndex >= 0
      ? parsedTableRows.slice(0, sectionRowIndex)
      : parsedTableRows;
  const sectionRows = details?.section
    ? [
        {
          kind: "section",
          label: details.section.heading,
        },
        ...details.section.rows.map(({ label, description }) => ({
          kind: "detail",
          label,
          description,
        })),
      ]
    : sectionRowIndex >= 0
      ? parsedTableRows.slice(sectionRowIndex)
      : [];
  const heading2 = details?.heading ?? parsed?.heading ?? "";
  const summaryLine = details ? void 0 : parsed?.summaryLine;
  return (
    <div
      className="flex min-w-0 flex-col gap-2 whitespace-normal text-left"
      data-action-ui-id="popover.billing-tooltip"
    >
      <p className="text-[13px] font-medium leading-5 text-popover-foreground">
        {renderBillingText(heading2)}
      </p>
      {leadingRows.length > 0 && (
        <table className="w-full table-fixed border-collapse border-y border-foreground/5 text-left [&_tr+tr]:border-t [&_tr+tr]:border-foreground/5">
          <colgroup>
            <col className="w-[60px]" />
            <col />
          </colgroup>
          <tbody>{renderBillingDetailRows(leadingRows)}</tbody>
        </table>
      )}
      {sectionRows.length > 0 && (
        <table className="w-full table-fixed border-collapse border-y border-foreground/5 text-left [&_tr+tr]:border-t [&_tr+tr]:border-foreground/5">
          <colgroup>
            <col className="w-[60px]" />
            <col />
          </colgroup>
          <tbody>{renderBillingDetailRows(sectionRows)}</tbody>
        </table>
      )}
      {showSummary && summaryLine && (
        <p className="border-t border-border pt-2 text-[12px] leading-[18px] text-popover-foreground/70">
          {renderBillingText(summaryLine)}
        </p>
      )}
    </div>
  );
}
function renderCostDisclosure({
  billingTooltip,
  billingDetails,
  billingEstimateFormula,
  estimatedCostLabel,
  billingDetailsLabel,
  children: children2,
}) {
  const content2 = billingTooltip?.trim();
  const backendEstimateCopy = content2
    ? parseBillingEstimateCopy(parseBillingTooltip(content2).summaryLine, estimatedCostLabel)
    : void 0;
  const usesFrontendEstimate = billingEstimateFormula != null;
  const estimateCopy = {
    title: usesFrontendEstimate
      ? (estimatedCostLabel ?? backendEstimateCopy?.title ?? "")
      : (backendEstimateCopy?.title ?? estimatedCostLabel ?? ""),
    formula: billingEstimateFormula ?? backendEstimateCopy?.formula,
  };
  const priceTrigger = (
    <span
      className="inline-flex h-8 shrink-0 items-center rounded-[8px] px-2 transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text,#fff)]"
      data-action-ui-id="popover.credit-cost"
    >
      {children2}
    </span>
  );
  if (!content2 && !billingDetails) {
    return (
      <span className="mr-1 inline-flex shrink-0 items-center">
        <Tooltip$1 content={estimatedCostLabel}>{priceTrigger}</Tooltip$1>
      </span>
    );
  }
  return (
    <span className="mr-1 inline-flex shrink-0 items-center">
      <PreviewCardRoot>
        <PreviewCardTrigger$1 delay={180} closeDelay={220} render={priceTrigger} />
        <PreviewCardPortal>
          <PreviewCardPositioner
            align="end"
            side="top"
            sideOffset={6}
            className="isolate z-[10020]"
          >
            <PreviewCardPopup
              className="elevated-surface-border w-max max-w-[264px] origin-(--transform-origin) rounded-[16px] bg-popover p-1 text-popover-foreground shadow-lg outline-none dp-motion-quick-zoom"
              data-action-ui-id="popover.billing-estimate"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="block max-w-[256px] rounded-[12px] px-2.5 py-2 text-left">
                <PreviewCardRoot>
                  <PreviewCardTrigger$1
                    delay={220}
                    closeDelay={240}
                    render={
                      <button
                        type="button"
                        className="flex w-full min-w-0 items-center gap-1.5 rounded-sm text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                        aria-label={billingDetailsLabel}
                        data-action-ui-id="popover.billing-details-trigger"
                      />
                    }
                  >
                    <span className="shrink-0 text-popover-foreground/70" aria-hidden="true">
                      <TokenIcon$1 />
                    </span>
                    <span
                      className="min-w-0 flex-1 whitespace-nowrap text-[13px] font-medium leading-5 text-popover-foreground"
                      data-action-ui-id="popover.billing-estimate-title"
                    >
                      {estimateCopy.title}
                    </span>
                    <Info$1
                      className="size-3.5 shrink-0 text-popover-foreground/70"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </PreviewCardTrigger$1>
                  <PreviewCardPortal>
                    <PreviewCardPositioner
                      align="start"
                      side="right"
                      sideOffset={6}
                      collisionAvoidance={{
                        side: "none",
                        align: "shift",
                        fallbackAxisSide: "none",
                      }}
                      className="isolate z-[10030]"
                    >
                      <PreviewCardPopup
                        className="elevated-surface-border flex w-[288px] max-w-[calc(100vw-2rem)] origin-(--transform-origin) items-stretch rounded-[16px] bg-popover p-3 text-popover-foreground shadow-lg outline-none dp-motion-quick-zoom"
                        data-action-ui-id="popover.billing-details"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <BillingTooltipContent
                          content={content2}
                          details={billingDetails}
                          showSummary={false}
                        />
                      </PreviewCardPopup>
                    </PreviewCardPositioner>
                  </PreviewCardPortal>
                </PreviewCardRoot>
                {estimateCopy.formula && (
                  <span
                    className="mt-1 block break-words pl-5 text-[12px] leading-[18px] text-popover-foreground/70"
                    data-action-ui-id="popover.billing-estimate-formula"
                  >
                    {estimateCopy.formula}
                  </span>
                )}
              </div>
            </PreviewCardPopup>
          </PreviewCardPositioner>
        </PreviewCardPortal>
      </PreviewCardRoot>
    </span>
  );
}
function renderCostBadgeWithTooltip({
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
    return <span className="mr-1 inline-flex shrink-0 items-center">{trigger}</span>;
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
  children: children2,
}) {
  const { t: t2 } = useTranslation();
  const showSpinner = submitting || loading;
  const isDisabled = submitting || (!canSubmit && !loading);
  const stateClass = showSpinner
    ? "bg-[var(--canvas-controls-hover)] text-[var(--canvas-controls-text-muted)] cursor-wait"
    : !canSubmit
      ? "bg-[var(--canvas-controls-hover)] text-[var(--canvas-controls-text-muted)] cursor-default opacity-60"
      : "bg-foreground text-background hover:enabled:opacity-90 border-transparent";
  const isSquare = !children2 && !showSpinner;
  const button = (
    <button
      type="button"
      className={`${isSquare ? SQUARE_BTN_BASE : ACTION_BTN_BASE} ${stateClass}`}
      onClick={onClick}
      disabled={isDisabled}
      title={isDisabled ? void 0 : title}
      data-action-ui-id="popover.submit"
    >
      {showSpinner ? SPINNER : children2 ? children2 : <span aria-hidden="true">↑</span>}
    </button>
  );
  const disabledTooltip = !canSubmit && !loading ? title : void 0;
  const estimatedCostLabel =
    creditCost != null
      ? t2("canvas.billing.estimatedCost", {
          cost: creditCost,
          defaultValue: "预计消耗 {{cost}} 积分",
        })
      : void 0;
  const billingDetailsLabel = t2("canvas.billing.details", {
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
        <Tooltip$1 content={disabledTooltip}>
          <span className="inline-flex">{button}</span>
        </Tooltip$1>
      ) : (
        button
      )}
    </>
  );
}
export function GeneratingButton({ label }) {
  return (
    <button
      type="button"
      className={`${ACTION_BTN_BASE} bg-foreground text-background border-transparent cursor-not-allowed pointer-events-none`}
      data-action-ui-id="popover.generating"
      disabled={true}
      tabIndex={-1}
    >
      {label}
    </button>
  );
}
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
  const { t: t2 } = useTranslation();
  const filledLabel = newNodeLabel ?? t2("chat.regenerate", "重新生成");
  const outlineLabel = replaceLabel ?? t2("canvas.replaceCurrentNode", "替换当前节点");
  const estimatedCostLabel =
    creditCost != null
      ? t2("canvas.billing.estimatedCost", {
          cost: creditCost,
          defaultValue: "预计消耗 {{cost}} 积分",
        })
      : void 0;
  const billingDetailsLabel = t2("canvas.billing.details", {
    defaultValue: "查看价格说明",
  });
  const disabled2 = submitting || !canSubmit;
  const withDisabledTooltip = (button) =>
    disabled2 && disabledTitle ? (
      <Tooltip$1 content={disabledTitle}>
        <span className="inline-flex">{button}</span>
      </Tooltip$1>
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
          className={`${ACTION_BTN_BASE} ${disabled2 ? "bg-[var(--canvas-controls-hover)] text-[var(--canvas-controls-text-muted)] cursor-default opacity-60" : "bg-foreground text-background hover:enabled:opacity-90 border-transparent"}`}
          onClick={onNewNode}
          disabled={disabled2}
          title={disabled2 ? void 0 : String(filledLabel)}
          data-action-ui-id="popover.submit"
        >
          {submitting ? SPINNER : <span>{filledLabel}</span>}
        </button>,
      )}
      {withDisabledTooltip(
        <button
          type="button"
          className={`${ACTION_BTN_BASE} ${disabled2 ? "text-[var(--canvas-controls-text-muted)] cursor-default opacity-60" : "text-[var(--canvas-controls-text)] hover:enabled:bg-[var(--canvas-controls-hover)]"}`}
          style={{
            background: "transparent",
          }}
          onClick={onReplace}
          disabled={disabled2}
          title={disabled2 ? void 0 : String(outlineLabel)}
        >
          <span>{outlineLabel}</span>
        </button>,
      )}
    </>
  );
}
export function useCanvasReleaseRegion() {
  return reactExports.useContext(CanvasReleaseRegionContext);
}
export function svgBase({ size: size2 = 16, ...rest }) {
  return {
    width: size2,
    height: size2,
    viewBox: "0 0 16 16",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    role: "presentation",
    "aria-hidden": true,
    ...rest,
  };
}
