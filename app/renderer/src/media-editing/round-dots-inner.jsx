// round-dots-inner.jsx
import { isStoryboardGridValid } from "./grid-validity-map.js";
import { reactExports } from "../vendor.js";
import { useStore } from "../vendor-fork/xyflow/react/index.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn } from "../infra/dialog-content.jsx";
export function resolveImageNodeDisplayName(candidates, fallbackLabel) {
  const ordered = [
    candidates.dataName,
    candidates.primaryName,
    candidates.metaName,
  ];
  for (const candidate of ordered) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    return trimmed;
  }
  return fallbackLabel;
}
const ROUND_DOTS_MIN_ZOOM = 0.3;
export const ROUND_DOTS_POPOVER_GAP_OFFSET = 25;
const zoomSelector = (storeState) => storeState.transform[2];
function RoundDotsInner({
  count,
  activeIdx,
  onSelect,
  placement = "below-center",
}) {
  const zoom = useStore(zoomSelector);
  if (count <= 1) return null;
  if (zoom < ROUND_DOTS_MIN_ZOOM) return null;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pointerDown/mouseDown only stopPropagation to keep ReactFlow node drag from starting; actions live on the child buttons
    <div
      data-action-ui-id="canvas.image-node.round-dots"
      onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
      onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
      className={cn(
        // 绝对定位。z-30 高于 loading overlay / image body / 任何装饰层
        // （loading 时也要可见可点）。
        "pointer-events-auto absolute z-30",
        placement === "top-right"
          ? "top-2 right-2"
          : placement === "bottom-center"
            ? "bottom-2 left-1/2 -translate-x-1/2"
            : "top-full left-1/2 mt-2 -translate-x-1/2",
        "flex items-center gap-2 rounded-full",
      )}
    >
      {Array.from(
        {
          length: count,
        },
        (_unusedItem, index) => {
          const selected = index === activeIdx;
          return (
            <button
              key={index}
              type="button"
              data-action-ui-id={`canvas.image-node.round-dot-${index}`}
              aria-label={`第 ${index + 1} 轮`}
              aria-pressed={selected}
              onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
              onPointerUp={(pointerEvent) => pointerEvent.stopPropagation()}
              onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                onSelect(index);
              }}
              className="group/round-dot flex h-4 cursor-pointer items-center justify-center px-0.5"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none block h-1.5 rounded-full transition-[width,height,background-color] duration-150",
                  selected
                    ? "w-11 bg-foreground/45 group-hover/round-dot:h-2 group-hover/round-dot:bg-foreground/55"
                    : "w-4 bg-foreground/15 group-hover/round-dot:h-2 group-hover/round-dot:bg-foreground/25",
                )}
              />
            </button>
          );
        },
      )}
    </div>
  );
}
export const RoundDots = reactExports.memo(RoundDotsInner);
export const STORYBOARD_RATIOS = ["16:9", "4:3", "1:1", "3:4", "9:16"];
export function nearestValidStoryboardGrid(
  ratio,
  preferredRows,
  preferredCols,
) {
  if (isStoryboardGridValid(ratio, preferredRows, preferredCols)) {
    return {
      rows: preferredRows,
      cols: preferredCols,
    };
  }
  const candidates = [];
  for (let rows = 1; rows <= 5; rows += 1) {
    for (let cols = 1; cols <= 5; cols += 1) {
      if (isStoryboardGridValid(ratio, rows, cols))
        candidates.push({
          rows,
          cols,
        });
    }
  }
  return (
    candidates.sort(
      (firstGrid, secondGrid) =>
        Math.abs(firstGrid.rows - preferredRows) +
        Math.abs(firstGrid.cols - preferredCols) -
        (Math.abs(secondGrid.rows - preferredRows) + Math.abs(secondGrid.cols - preferredCols)),
    )[0] ?? {
      rows: 3,
      cols: 3,
    }
  );
}
export function resolveStoryboardGridSelection(params) {
  let ratio = "16:9";
  if (STORYBOARD_RATIOS.some((candidate) => candidate === params?.cell_ratio)) {
    ratio = params?.cell_ratio;
  }
  let rows = 3;
  let cols = 3;
  try {
    const parsed = JSON.parse(params?.grid_setting ?? "");
    if (
      STORYBOARD_RATIOS.some((candidate) => candidate === parsed.cell_ratio)
    ) {
      ratio = parsed.cell_ratio;
    }
    if (Number.isInteger(parsed.rows)) rows = parsed.rows;
    if (Number.isInteger(parsed.cols)) cols = parsed.cols;
  } catch {}
  const grid = nearestValidStoryboardGrid(ratio, rows, cols);
  return {
    ratio,
    rows: grid.rows,
    cols: grid.cols,
  };
}
