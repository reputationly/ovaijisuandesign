// compute-multi-image-grid-positions.jsx
import { parseGenerationStartedAt } from "./use-warn-missing-asset-meta.jsx";
import { CompositedSvg, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

function MultiImageCountIcon() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4.66666 1.33333H11.3333"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.33334 4H12.6667"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.6667 6.66667H3.33333C2.59695 6.66667 2 7.26362 2 8V13.3333C2 14.0697 2.59695 14.6667 3.33333 14.6667H12.6667C13.403 14.6667 14 14.0697 14 13.3333V8C14 7.26362 13.403 6.66667 12.6667 6.66667Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}

export function CountBadge({
  count: count2,
  expanded = false,
  onClick,
  unit = "",
}) {
  const { t: t2 } = useTranslation();
  if (count2 <= 1) return null;
  const label = count2 > 9 ? "9+" : String(count2);
  const displayLabel = `${label}${unit}`;
  const collapseLabel = t2("canvas.multiMedia.collapseView", "收起视图");
  const expandLabel = t2("canvas.multiMedia.expandView", {
    count: displayLabel,
  });
  const visibleLabel = expanded && onClick ? collapseLabel : displayLabel;
  if (onClick) {
    return (
      <button
        type="button"
        data-action-ui-id="canvas.image-node.count-badge"
        data-state={expanded ? "expanded" : "collapsed"}
        onClick={onClick}
        aria-label={expanded ? collapseLabel : expandLabel}
        aria-expanded={expanded}
        className="pointer-events-auto absolute left-1 top-1 z-20 inline-flex h-6 min-w-[42px] cursor-pointer items-center justify-center gap-1 rounded-[8px] border-0 bg-black/55 px-2 text-[11px] font-medium text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
      >
        {!expanded && <MultiImageCountIcon />}
        <span>{visibleLabel}</span>
      </button>
    );
  }
  return (
    // The visible "5" / "9+" already conveys the count. A redundant
    // aria-label would just have the screen reader read it twice (and biome
    // rejects aria-label on a div without an interactive role anyway).
    <div
      data-action-ui-id="canvas.image-node.count-badge"
      className="pointer-events-none absolute left-1 top-1 z-20 inline-flex h-6 min-w-[42px] items-center justify-center gap-1 rounded-[8px] bg-black/55 px-2 text-[11px] font-medium text-white"
    >
      <MultiImageCountIcon />
      <span>{displayLabel}</span>
    </div>
  );
}

const WAIT_ESTIMATE_UPDATE_INTERVAL_MS = 5e3;

const MIN_DISPLAY_SECONDS = 60;

function normalizeSeconds(value) {
  return value != null && Number.isFinite(value) && value > 0
    ? Math.max(1, Math.ceil(value))
    : void 0;
}

function calculateStaticRemainingWaitSeconds(
  estimatedGenerationSeconds,
  startedAt,
  nowMs,
) {
  if (
    estimatedGenerationSeconds == null ||
    !Number.isFinite(estimatedGenerationSeconds) ||
    estimatedGenerationSeconds <= 0
  ) {
    return void 0;
  }
  const originMs = parseGenerationStartedAt(startedAt);
  if (originMs == null) return void 0;
  const elapsedSeconds = Math.max(0, nowMs - originMs) / 1e3;
  const remainingSeconds = Math.max(
    MIN_DISPLAY_SECONDS,
    estimatedGenerationSeconds - elapsedSeconds,
  );
  return Math.ceil(remainingSeconds);
}

export function useGenerationWaitEstimate({
  active: active2,
  liveRemainingWaitSeconds,
  estimatedGenerationSeconds,
  startedAt,
}) {
  const [, setRevision] = reactExports.useState(0);
  const liveSeconds = normalizeSeconds(liveRemainingWaitSeconds);
  const hasStaticEstimate =
    estimatedGenerationSeconds != null &&
    Number.isFinite(estimatedGenerationSeconds) &&
    estimatedGenerationSeconds > 0 &&
    parseGenerationStartedAt(startedAt) != null;
  reactExports.useEffect(() => {
    if (!active2 || liveSeconds != null || !hasStaticEstimate) return;
    const intervalId = window.setInterval(
      () => setRevision((revision) => revision + 1),
      WAIT_ESTIMATE_UPDATE_INTERVAL_MS,
    );
    return () => window.clearInterval(intervalId);
  }, [active2, liveSeconds, hasStaticEstimate]);
  if (!active2) return void 0;
  return (
    liveSeconds ??
    calculateStaticRemainingWaitSeconds(
      estimatedGenerationSeconds,
      startedAt,
      Date.now(),
    )
  );
}

const PRIMARY_ROW = 2;

const PRIMARY_COL = 0;

const MULTI_IMAGE_SUB_CARD_GAP = 8;

export const MULTI_IMAGE_FRAME_INSET = 8;

export function computeMultiImageRenderBounds(cardWidth, cardHeight) {
  return {
    top:
      (cardHeight + MULTI_IMAGE_SUB_CARD_GAP) * PRIMARY_ROW +
      MULTI_IMAGE_FRAME_INSET,
    right: (cardWidth + MULTI_IMAGE_SUB_CARD_GAP) * 2 + MULTI_IMAGE_FRAME_INSET,
    bottom: MULTI_IMAGE_FRAME_INSET,
    left: MULTI_IMAGE_FRAME_INSET,
  };
}

const FILL_ORDER = [
  [2, 1],
  // sub #1 — directly RIGHT of primary (N=2)
  [1, 0],
  // sub #2 — directly ABOVE primary (N=3)
  [1, 1],
  // sub #3 — diagonal upper-right, closes the L (N=4)
  [2, 2],
  // sub #4 — further RIGHT, extends bottom row (N=5)
  [1, 2],
  // sub #5 — upper-right extension (N=6)
  [0, 2],
  // sub #6 — further ABOVE, extends right column (N=7)
  [0, 1],
  // sub #7 — top row middle (N=8)
  [0, 0],
  // sub #8 — top-left corner (N=9)
];

export function computeMultiImageGridPositions(
  imageIds,
  primaryIndex,
  cardWidth,
  cardHeight,
  gap,
  statuses,
) {
  if (imageIds.length <= 1) return [];
  const subs = [];
  for (let i2 = 0; i2 < imageIds.length; i2++) {
    if (i2 === primaryIndex) continue;
    const id2 = imageIds[i2];
    if (typeof id2 !== "string" || !id2) continue;
    const status = statuses?.[i2] ?? "ready";
    subs.push({
      id: id2,
      originalIndex: i2,
      status,
    });
  }
  const max2 = Math.min(subs.length, FILL_ORDER.length);
  const stepX = cardWidth + gap;
  const stepY = cardHeight + gap;
  const out = [];
  for (let i2 = 0; i2 < max2; i2++) {
    const slot = FILL_ORDER[i2];
    if (!slot) continue;
    const [row, col] = slot;
    const sub = subs[i2];
    if (!sub) continue;
    out.push({
      imageId: sub.id,
      status: sub.status,
      originalIndex: sub.originalIndex,
      dx: (col - PRIMARY_COL) * stepX,
      dy: (row - PRIMARY_ROW) * stepY,
    });
  }
  return out;
}

export const SUB_CARD_GAP = MULTI_IMAGE_SUB_CARD_GAP;
