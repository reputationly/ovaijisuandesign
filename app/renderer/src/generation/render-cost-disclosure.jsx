// render-cost-disclosure.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Info$1 as Info,
  PreviewCardPopup,
  PreviewCardPortal,
  PreviewCardPositioner,
  PreviewCardRoot,
  PreviewCardTrigger$1 as PreviewCardTrigger,
} from "../vendor.js";
import { TokenIcon } from "./expand-arrow-icon.jsx";
import { Tooltip } from "./missing-asset-card.jsx";
const FULL_EMPHASIS_PATTERN = /^\*\*(.+)\*\*$/;
const INLINE_EMPHASIS_PATTERN = /\*\*(.+?)\*\*/g;
function splitBillingTooltipDetail(line) {
  const chineseColonIndex = line.indexOf("：");
  const asciiColonIndex = line.indexOf(":");
  const colonIndexes = [chineseColonIndex, asciiColonIndex].filter(
    (index2) => index2 >= 0,
  );
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
    const compactDetail = segment.match(
      /^(.+?)[：:]?\s*((?:\d[\d.,]*|免费|free\b).*)$/i,
    );
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
      <strong
        key={`${start2}:${match2[1]}`}
        className="font-medium text-popover-foreground"
      >
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
    heading:
      headingLine?.match(FULL_EMPHASIS_PATTERN)?.[1] ?? headingLine ?? "",
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
function BillingTooltipContent({
  content: content2,
  details,
  showSummary = true,
}) {
  const parsed = content2 ? parseBillingTooltip(content2) : void 0;
  const parsedTableRows =
    parsed?.bodyLines.flatMap(expandBillingTableLine) ?? [];
  const sectionRowIndex = parsedTableRows.findIndex(
    (row) => row.kind === "section",
  );
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
export function renderCostDisclosure({
  billingTooltip,
  billingDetails,
  billingEstimateFormula,
  estimatedCostLabel,
  billingDetailsLabel,
  children: children2,
}) {
  const content2 = billingTooltip?.trim();
  const backendEstimateCopy = content2
    ? parseBillingEstimateCopy(
        parseBillingTooltip(content2).summaryLine,
        estimatedCostLabel,
      )
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
        <Tooltip content={estimatedCostLabel}>{priceTrigger}</Tooltip>
      </span>
    );
  }
  return (
    <span className="mr-1 inline-flex shrink-0 items-center">
      <PreviewCardRoot>
        <PreviewCardTrigger
          delay={180}
          closeDelay={220}
          render={priceTrigger}
        />
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
                  <PreviewCardTrigger
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
                    <span
                      className="shrink-0 text-popover-foreground/70"
                      aria-hidden="true"
                    >
                      <TokenIcon />
                    </span>
                    <span
                      className="min-w-0 flex-1 whitespace-nowrap text-[13px] font-medium leading-5 text-popover-foreground"
                      data-action-ui-id="popover.billing-estimate-title"
                    >
                      {estimateCopy.title}
                    </span>
                    <Info
                      className="size-3.5 shrink-0 text-popover-foreground/70"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </PreviewCardTrigger>
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
