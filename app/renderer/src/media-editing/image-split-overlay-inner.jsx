// image-split-overlay-inner.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { rectCellIndices } from "./node-tool-interaction.js";

const DRAG_THRESHOLD_PX = 4;

export function ImageSplitOverlayInner({
  rows,
  cols,
  selected: selected2,
  onToggle,
  onSelectCells,
}) {
  const containerRef = reactExports.useRef(null);
  const [hoverIndex, setHoverIndex] = reactExports.useState(null);
  const [marquee, setMarquee] = reactExports.useState(null);
  const pressRef = reactExports.useRef(null);
  const cells2 = reactExports.useMemo(() => {
    const out = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        out.push({
          index: row * cols + col,
          row,
          col,
        });
      }
    }
    return out;
  }, [rows, cols]);
  const cellW = 100 / cols;
  const cellH = 100 / rows;
  const rowLines = reactExports.useMemo(
    () =>
      Array.from(
        {
          length: Math.max(0, rows - 1),
        },
        (_2, i2) => (i2 + 1) * cellH,
      ),
    [rows, cellH],
  );
  const colLines = reactExports.useMemo(
    () =>
      Array.from(
        {
          length: Math.max(0, cols - 1),
        },
        (_2, i2) => (i2 + 1) * cellW,
      ),
    [cols, cellW],
  );
  const cellIndexAt = reactExports.useCallback(
    (clientX, clientY) => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const fx = (clientX - rect.left) / rect.width;
      const fy = (clientY - rect.top) / rect.height;
      const col = Math.min(cols - 1, Math.max(0, Math.floor(fx * cols)));
      const row = Math.min(rows - 1, Math.max(0, Math.floor(fy * rows)));
      return row * cols + col;
    },
    [rows, cols],
  );
  const indicesInRange = reactExports.useCallback(
    (range2) =>
      rectCellIndices(
        range2.r0 * cols + range2.c0,
        range2.r1 * cols + range2.c1,
        cols,
      ),
    [cols],
  );
  const handlePointerDown = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      if (e2.button !== 0) return;
      const index2 = cellIndexAt(e2.clientX, e2.clientY);
      if (index2 == null) return;
      pressRef.current = {
        x: e2.clientX,
        y: e2.clientY,
        index: index2,
        dragging: false,
      };
      containerRef.current?.setPointerCapture(e2.pointerId);
    },
    [cellIndexAt],
  );
  const handlePointerMove = reactExports.useCallback(
    (e2) => {
      const press = pressRef.current;
      const index2 = cellIndexAt(e2.clientX, e2.clientY);
      if (!press) {
        setHoverIndex(index2);
        return;
      }
      if (!press.dragging) {
        const moved = Math.hypot(e2.clientX - press.x, e2.clientY - press.y);
        if (moved < DRAG_THRESHOLD_PX) return;
        press.dragging = true;
      }
      if (index2 == null) return;
      const ar = Math.floor(press.index / cols);
      const ac = press.index % cols;
      const br = Math.floor(index2 / cols);
      const bc = index2 % cols;
      const next2 = {
        r0: Math.min(ar, br),
        r1: Math.max(ar, br),
        c0: Math.min(ac, bc),
        c1: Math.max(ac, bc),
      };
      setMarquee((prev) =>
        prev &&
        prev.r0 === next2.r0 &&
        prev.r1 === next2.r1 &&
        prev.c0 === next2.c0 &&
        prev.c1 === next2.c1
          ? prev
          : next2,
      );
    },
    [cellIndexAt, cols],
  );
  const endPress = reactExports.useCallback(
    (e2) => {
      const press = pressRef.current;
      pressRef.current = null;
      containerRef.current?.releasePointerCapture?.(e2.pointerId);
      if (!press) return;
      if (press.dragging && marquee) {
        onSelectCells(indicesInRange(marquee));
      } else if (!press.dragging) {
        onToggle(press.index, e2.shiftKey);
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
      onWheel={(e2) => e2.stopPropagation()}
    >
      {rowLines.map((top2) => (
        <span
          key={`r${top2}`}
          className="pointer-events-none absolute right-0 left-0"
          style={{
            top: `${top2}%`,
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
      {cells2.map(({ index: index2, row, col }) => {
        const isSelected = selected2.has(index2);
        const inMarquee = previewSet?.has(index2) ?? false;
        const isHovered = hoverIndex === index2 && !marquee;
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
            key={index2}
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: `${col * cellW}%`,
              top: `${row * cellH}%`,
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
                {row + 1}-{col + 1}
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
