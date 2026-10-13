// image-split-overlay-inner.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { rectCellIndices } from "./node-tool-interaction.js";

const DRAG_THRESHOLD_PX = 4;

export function ImageSplitOverlayInner({
  rows,
  cols,
  selected,
  onToggle,
  onSelectCells,
}) {
  const containerRef = reactExports.useRef(null);
  const [hoverIndex, setHoverIndex] = reactExports.useState(null);
  const [marquee, setMarquee] = reactExports.useState(null);
  const pressRef = reactExports.useRef(null);
  const gridCells = reactExports.useMemo(() => {
    const cells = [];
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      for (let columnIndex = 0; columnIndex < cols; columnIndex++) {
        cells.push({
          index: rowIndex * cols + columnIndex,
          row: rowIndex,
          col: columnIndex,
        });
      }
    }
    return cells;
  }, [rows, cols]);
  const cellW = 100 / cols;
  const cellH = 100 / rows;
  const rowLines = reactExports.useMemo(
    () =>
      Array.from(
        {
          length: Math.max(0, rows - 1),
        },
        (_unusedValue, index) => (index + 1) * cellH,
      ),
    [rows, cellH],
  );
  const colLines = reactExports.useMemo(
    () =>
      Array.from(
        {
          length: Math.max(0, cols - 1),
        },
        (_unusedValue, index) => (index + 1) * cellW,
      ),
    [cols, cellW],
  );
  const cellIndexAt = reactExports.useCallback(
    (clientX, clientY) => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const normalizedX = (clientX - rect.left) / rect.width;
      const normalizedY = (clientY - rect.top) / rect.height;
      const columnIndex = Math.min(cols - 1, Math.max(0, Math.floor(normalizedX * cols)));
      const rowIndex = Math.min(rows - 1, Math.max(0, Math.floor(normalizedY * rows)));
      return rowIndex * cols + columnIndex;
    },
    [rows, cols],
  );
  const indicesInRange = reactExports.useCallback(
    (range) =>
      rectCellIndices(
        range.r0 * cols + range.c0,
        range.r1 * cols + range.c1,
        cols,
      ),
    [cols],
  );
  const handlePointerDown = reactExports.useCallback(
    (pointerEvent) => {
      pointerEvent.stopPropagation();
      if (pointerEvent.button !== 0) return;
      const index = cellIndexAt(pointerEvent.clientX, pointerEvent.clientY);
      if (index == null) return;
      pressRef.current = {
        x: pointerEvent.clientX,
        y: pointerEvent.clientY,
        index,
        dragging: false,
      };
      containerRef.current?.setPointerCapture(pointerEvent.pointerId);
    },
    [cellIndexAt],
  );
  const handlePointerMove = reactExports.useCallback(
    (pointerEvent) => {
      const press = pressRef.current;
      const index = cellIndexAt(pointerEvent.clientX, pointerEvent.clientY);
      if (!press) {
        setHoverIndex(index);
        return;
      }
      if (!press.dragging) {
        const moved = Math.hypot(pointerEvent.clientX - press.x, pointerEvent.clientY - press.y);
        if (moved < DRAG_THRESHOLD_PX) return;
        press.dragging = true;
      }
      if (index == null) return;
      const startRow = Math.floor(press.index / cols);
      const startColumn = press.index % cols;
      const endRow = Math.floor(index / cols);
      const endColumn = index % cols;
      const next = {
        r0: Math.min(startRow, endRow),
        r1: Math.max(startRow, endRow),
        c0: Math.min(startColumn, endColumn),
        c1: Math.max(startColumn, endColumn),
      };
      setMarquee((prev) =>
        prev &&
        prev.r0 === next.r0 &&
        prev.r1 === next.r1 &&
        prev.c0 === next.c0 &&
        prev.c1 === next.c1
          ? prev
          : next,
      );
    },
    [cellIndexAt, cols],
  );
  const endPress = reactExports.useCallback(
    (pointerEvent) => {
      const press = pressRef.current;
      pressRef.current = null;
      containerRef.current?.releasePointerCapture?.(pointerEvent.pointerId);
      if (!press) return;
      if (press.dragging && marquee) {
        onSelectCells(indicesInRange(marquee));
      } else if (!press.dragging) {
        onToggle(press.index, pointerEvent.shiftKey);
      }
      setMarquee(null);
    },
    [marquee, indicesInRange, onSelectCells, onToggle],
  );
  const previewSet = reactExports.useMemo(() => {
    if (!marquee) return null;
    return new Set(indicesInRange(marquee));
  }, [marquee, indicesInRange]);
  return (
    <div
      ref={containerRef}
      className="nodrag nopan absolute inset-0 z-10 cursor-pointer select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      onPointerLeave={() => {
        if (!pressRef.current) setHoverIndex(null);
      }}
      onWheel={(wheelEvent) => wheelEvent.stopPropagation()}
    >
      {rowLines.map((rowLineTop) => (
        <span
          key={`r${rowLineTop}`}
          className="pointer-events-none absolute right-0 left-0"
          style={{
            top: `${rowLineTop}%`,
            height: 1,
            zIndex: 5,
            background: "rgba(0,0,0,0.18)",
          }}
        />
      ))}
      {colLines.map((left) => (
        <span
          key={`c${left}`}
          className="pointer-events-none absolute top-0 bottom-0"
          style={{
            left: `${left}%`,
            width: 1,
            zIndex: 5,
            background: "rgba(0,0,0,0.18)",
          }}
        />
      ))}
      {gridCells.map(({ index, row: rowIndex, col: columnIndex }) => {
        const isSelected = selected.has(index);
        const inMarquee = previewSet?.has(index) ?? false;
        const isHovered = hoverIndex === index && !marquee;
        const highlighted = isHovered || inMarquee;
        const scrim = isSelected
          ? highlighted
            ? 0.6
            : 0.45
          : highlighted
            ? 0.2
            : 0;
        const showLabel = isSelected || highlighted;
        return (
          <div
            key={index}
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: `${columnIndex * cellW}%`,
              top: `${rowIndex * cellH}%`,
              width: `${cellW}%`,
              height: `${cellH}%`,
              zIndex: highlighted ? 20 : isSelected ? 1 : 0,
            }}
          >
            <span
              className="absolute inset-0 transition-colors duration-150"
              style={{
                background: scrim > 0 ? `rgba(0,0,0,${scrim})` : "transparent",
              }}
            />
            {isSelected && (
              <span
                className="absolute z-10 border-2 border-solid transition-all duration-150"
                style={{
                  inset: "-1px",
                  borderColor: highlighted
                    ? "var(--canvas-node-border-selected)"
                    : "#BBBBFE",
                }}
              />
            )}
            {showLabel && (
              <span
                className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-xs font-medium shadow-sm"
                style={{
                  background:
                    "color-mix(in srgb, var(--canvas-controls-bg) 60%, transparent)",
                  color: "var(--canvas-controls-text)",
                }}
              >
                {rowIndex + 1}-{columnIndex + 1}
              </span>
            )}
          </div>
        );
      })}
      {marquee && (
        <span
          className="pointer-events-none absolute z-30 border-2 border-solid"
          style={{
            left: `${marquee.c0 * cellW}%`,
            top: `${marquee.r0 * cellH}%`,
            width: `${(marquee.c1 - marquee.c0 + 1) * cellW}%`,
            height: `${(marquee.r1 - marquee.r0 + 1) * cellH}%`,
            borderColor: "#BBBBFE",
            background: "color-mix(in srgb, #BBBBFE 12%, transparent)",
          }}
        />
      )}
    </div>
  );
}
