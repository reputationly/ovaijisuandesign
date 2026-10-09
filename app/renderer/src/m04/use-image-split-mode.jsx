// use-image-split-mode.jsx
import {
  jsxRuntimeExports,
  reactExports,
  CompositedSvg,
  useTranslation,
  useStore$3,
  NodeToolbar$1,
  Position,
  TooltipProvider$1,
} from "../vendor.js";
import { CloseIcon$1, GroupIcon, DropdownArrowIcon } from "../m01/generating-media-area.jsx";
import { rectCellIndices, splitSelectedCellsToBlobs } from "../m03/image-tool-meta.jsx";
import { Tooltip$1, CreditCostBadge } from "../m01/create-tracker.jsx";
import {
  DropdownMenu$1,
  DropdownMenuTrigger$1,
  DropdownMenuContent$1,
  DropdownMenuItem$1,
} from "../m01/use-lightbox-media-actions.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
export function AngleGlyph() {
  return (
    <CompositedSvg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 3v9.5A.5.5 0 0 0 3.5 13H13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M7 13a4 4 0 0 0-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </CompositedSvg>
  );
}
export function IconButton$3({
  active: active2 = false,
  disabled: disabled2 = false,
  onClick,
  title,
  children: children2,
}) {
  return (
    <button
      type="button"
      disabled={disabled2}
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active2}
      className="canvas-toolbar-action"
    >
      {children2}
    </button>
  );
}
export function Divider$4() {
  return <div className="canvas-toolbar-separator" aria-hidden="true" />;
}
function ImageRotatePreviewInner({
  src,
  srcSet,
  sizes,
  alt,
  width,
  height,
  transform: transform2,
}) {
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      className="pointer-events-none absolute left-1/2 top-1/2 object-cover"
      style={{
        width,
        height,
        // Override Tailwind preflight's `max-width: 100%`. While rotating, the
        // source rect (e.g. 350×233 landscape) is wider than the parent's
        // AABB (e.g. 233×350 portrait) — without this, the source rect would
        // be squeezed to the parent width and the rotated image wouldn't fill
        // the body.
        maxWidth: "none",
        maxHeight: "none",
        transform: transform2 ? `translate(-50%, -50%) ${transform2}` : "translate(-50%, -50%)",
        transformOrigin: "center center",
      }}
      draggable={false}
      loading="lazy"
      decoding="async"
    />
  );
}
export const ImageRotatePreview = reactExports.memo(ImageRotatePreviewInner);
const SPLIT_MAGNIFICATIONS = [
  {
    id: "2x",
    labelKey: "canvas.splitGrid.hd2x",
    defaultLabel: "2倍高清",
    multiplier: 2,
  },
  {
    id: "4x",
    labelKey: "canvas.splitGrid.hd4x",
    defaultLabel: "4倍高清",
    multiplier: 4,
  },
];
export function useImageSplitMode({
  id: id2,
  selected: selected2,
  meta: meta2,
  batchCropAndUpscale,
  cropSplit,
  onApply,
  url: url2,
}) {
  const { t: t2 } = useTranslation();
  const [grid, setGrid] = reactExports.useState(null);
  const [selectedCells, setSelectedCells] = reactExports.useState(() => new Set());
  const [magnification, setMag] = reactExports.useState(SPLIT_MAGNIFICATIONS[0]);
  const [processing, setProcessing] = reactExports.useState(false);
  const anchorRef = reactExports.useRef(null);
  const editing = grid !== null;
  const enter2 = reactExports.useCallback((rows, cols) => {
    const r2 = Math.max(1, Math.floor(rows));
    const c3 = Math.max(1, Math.floor(cols));
    setGrid({
      rows: r2,
      cols: c3,
    });
    setSelectedCells(new Set());
    anchorRef.current = null;
  }, []);
  const exit2 = reactExports.useCallback(() => {
    setGrid(null);
    setSelectedCells(new Set());
    setProcessing(false);
    anchorRef.current = null;
  }, []);
  const toggleCell = reactExports.useCallback(
    (index2, range2 = false) => {
      const g2 = grid;
      if (range2 && g2 && anchorRef.current != null) {
        const block = rectCellIndices(anchorRef.current, index2, g2.cols);
        setSelectedCells((prev) => {
          const next2 = new Set(prev);
          for (const i2 of block) next2.add(i2);
          return next2;
        });
        return;
      }
      anchorRef.current = index2;
      setSelectedCells((prev) => {
        const next2 = new Set(prev);
        if (next2.has(index2)) next2.delete(index2);
        else next2.add(index2);
        return next2;
      });
    },
    [grid],
  );
  const setMagnification = reactExports.useCallback((next2) => {
    setMag(SPLIT_MAGNIFICATIONS.find((m3) => m3.id === next2) ?? SPLIT_MAGNIFICATIONS[0]);
  }, []);
  const selectCells = reactExports.useCallback((indices) => {
    if (indices.length === 0) return;
    setSelectedCells((prev) => {
      const next2 = new Set(prev);
      for (const i2 of indices) next2.add(i2);
      return next2;
    });
    anchorRef.current = indices[indices.length - 1];
  }, []);
  const sliceSelectedCells = reactExports.useCallback(
    async (baseName) => {
      if (!url2 || !grid) return [];
      const { rows, cols } = grid;
      const blobs = await splitSelectedCellsToBlobs(
        url2,
        rows,
        cols,
        selectedCells,
        meta2?.width,
        meta2?.height,
      );
      return blobs.map((cell) => ({
        blob: cell.blob,
        row: cell.row,
        col: cell.col,
        filename: `${baseName}-r${cell.row + 1}c${cell.col + 1}.png`,
        // Native pixel size of the sliced cell. The host multiplies these by
        // the picked magnification to derive the enhance-image target size.
        srcWidth: cell.sw,
        srcHeight: cell.sh,
        // Carry the sliced cell's pixel ratio so the HD placeholder card
        // renders at the SAME shape the upscaled result will land at (super
        // resolution preserves aspect ratio). Without this the placeholder
        // falls back to the square default and the loading card looks wrong
        // next to its short-wide siblings.
        ...(cell.sw > 0 && cell.sh > 0
          ? {
              aspectRatio: `${cell.sw}:${cell.sh}`,
            }
          : {}),
      }));
    },
    [grid, meta2?.height, meta2?.width, selectedCells, url2],
  );
  const generateHighRes = reactExports.useCallback(async () => {
    if (processing) return;
    if (!url2 || !grid) return;
    if (selectedCells.size === 0) return;
    if (!batchCropAndUpscale) return;
    const baseName = meta2?.name?.replace(/\.[^.]+$/, "") ?? "image";
    setProcessing(true);
    try {
      const cells2 = await sliceSelectedCells(baseName);
      if (cells2.length === 0) return;
      onApply?.({
        output_mode: "enhance",
        cell_count: cells2.length,
        magnification: magnification.id,
      });
      exit2();
      void batchCropAndUpscale(
        id2,
        cells2,
        magnification.multiplier,
        t2("canvas.splitGrid.groupLabel", "宫格高清组"),
      ).catch((err) => {
        console.error("[canvas] grid-split batch failed:", err);
      });
    } finally {
      setProcessing(false);
    }
  }, [
    processing,
    batchCropAndUpscale,
    url2,
    grid,
    selectedCells,
    meta2?.name,
    id2,
    magnification.multiplier,
    magnification.id,
    exit2,
    t2,
    onApply,
    sliceSelectedCells,
  ]);
  const splitLocal = reactExports.useCallback(async () => {
    if (!url2 || !grid) return;
    if (selectedCells.size === 0) return;
    if (!cropSplit) return;
    const baseName = meta2?.name?.replace(/\.[^.]+$/, "") ?? "image";
    const cells2 = await sliceSelectedCells(baseName);
    if (cells2.length === 0) return;
    onApply?.({
      output_mode: "crop",
      cell_count: cells2.length,
    });
    exit2();
    void cropSplit(
      id2,
      cells2.map(({ blob, filename }) => ({
        blob,
        filename,
      })),
      t2("canvas.splitGrid.cropSplitGroupLabel", "宫格编组"),
    ).catch((err) => {
      console.error("[canvas] crop-split batch failed:", err);
    });
  }, [
    url2,
    grid,
    selectedCells,
    cropSplit,
    meta2?.name,
    id2,
    exit2,
    sliceSelectedCells,
    t2,
    onApply,
  ]);
  reactExports.useEffect(() => {
    if (!editing) return;
    if (processing) return;
    if (!selected2) exit2();
  }, [editing, processing, selected2, exit2]);
  return {
    editing,
    grid,
    selectedCells,
    magnification,
    processing,
    enter: enter2,
    exit: exit2,
    toggleCell,
    selectCells,
    setMagnification,
    generateHighRes,
    splitLocal,
  };
}
const HEADER_FLOW_HEIGHT = 28;
const TOOLBAR_GAP$1 = 16;
const zoomSelector$2 = (s2) => s2.transform[2];
function ImageSplitEditToolbarInner({
  visible,
  selectedCount,
  magnification,
  onSetMagnification,
  onGenerate,
  onSplitLocal,
  onExit,
  processing,
  perCellCost,
}) {
  const { t: t2 } = useTranslation();
  const zoom2 = useStore$3(zoomSelector$2);
  const offset2 = HEADER_FLOW_HEIGHT * zoom2 + TOOLBAR_GAP$1;
  const hasSelection2 = selectedCount > 0;
  const totalCost = perCellCost != null && hasSelection2 ? perCellCost * selectedCount : void 0;
  return (
    <NodeToolbar$1 isVisible={visible} position={Position.Top} offset={offset2} align="center">
      <TooltipProvider$1 delay={150} closeDelay={0}>
        <div
          className="canvas-toolbar-surface animate-[toolbar-fade-in_0.15s_ease-out]"
          onPointerDown={(e2) => e2.stopPropagation()}
          onWheel={(e2) => e2.stopPropagation()}
          onContextMenu={(e2) => e2.stopPropagation()}
          data-canvas-toolbar="true"
          data-density="compact"
        >
          <ExitChip onClick={onExit} label={t2("canvas.splitGrid.label", "宫格切分")} />
          <span
            className="canvas-toolbar-label px-2.5 whitespace-nowrap"
            style={{
              color: "var(--canvas-toolbar-muted-fg)",
            }}
          >
            {hasSelection2
              ? t2("canvas.splitGrid.selectedCount", "已选 {{count}} 个宫格", {
                  count: selectedCount,
                })
              : t2("canvas.splitGrid.selectHint", "选择想切分的宫格")}
          </span>
          {onSplitLocal && (
            <>
              <Tooltip$1
                content={t2(
                  "canvas.splitGrid.createGroupTooltip",
                  "将选中的宫格拆分为图片并创建分镜组，不消耗积分。",
                )}
                side="bottom"
              >
                <button
                  type="button"
                  aria-disabled={!hasSelection2 || processing}
                  onClick={hasSelection2 && !processing ? onSplitLocal : void 0}
                  className="canvas-toolbar-action"
                  data-action-ui-id="canvas.split-grid.create-storyboard-group"
                >
                  <GroupIcon size={18} />
                  <span className="whitespace-nowrap">
                    {t2("canvas.splitGrid.createGroup", "创建分镜组")}
                  </span>
                </button>
              </Tooltip$1>
              <Divider$3 />
            </>
          )}
          <MagnificationGenerateControl
            magnification={magnification}
            onSelect={onSetMagnification}
            onGenerate={onGenerate}
            totalCost={totalCost}
            disabled={!hasSelection2 || processing}
            processing={processing}
          />
        </div>
      </TooltipProvider$1>
    </NodeToolbar$1>
  );
}
export const ImageSplitEditToolbar = reactExports.memo(ImageSplitEditToolbarInner);
function MagnificationGenerateControl({
  magnification,
  onSelect,
  onGenerate,
  totalCost,
  disabled: disabled2,
  processing,
}) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  return (
    <div className="ml-1 flex h-8 items-center gap-0.5">
      <DropdownMenu$1 open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger$1
          disabled={processing}
          aria-label={t2("canvas.splitGrid.magnification", "选择高清倍率")}
          className="canvas-toolbar-action"
          data-action-ui-id="canvas.split-grid.magnification"
        >
          <span className="whitespace-nowrap">
            {t2("canvas.splitGrid.scale", "{{magnification}}倍", {
              magnification: magnification.multiplier,
            })}
          </span>
          <DropdownArrowIcon />
        </DropdownMenuTrigger$1>
        <DropdownMenuContent$1
          side="bottom"
          sideOffset={8}
          align="start"
          className="flex min-w-24 flex-col gap-0.5 p-1"
          variant="toolbar"
        >
          {SPLIT_MAGNIFICATIONS.map((m3) => (
            <DropdownMenuItem$1
              key={m3.id}
              onClick={() => onSelect(m3.id)}
              className="canvas-toolbar-menu-item px-3 py-2"
            >
              <span className="whitespace-nowrap">
                {t2("canvas.splitGrid.scale", "{{magnification}}倍", {
                  magnification: m3.multiplier,
                })}
              </span>
            </DropdownMenuItem$1>
          ))}
        </DropdownMenuContent$1>
      </DropdownMenu$1>
      <Tooltip$1
        content={t2("canvas.splitGrid.generateHdTooltip", "将选中的宫格图片高清放大后创建分镜组。")}
        side="bottom"
      >
        <button
          type="button"
          aria-disabled={disabled2}
          onClick={disabled2 ? void 0 : onGenerate}
          className="canvas-toolbar-action"
          data-action-ui-id="canvas.split-grid.generate-hd-group"
        >
          <span className="whitespace-nowrap">
            {processing
              ? t2("canvas.splitGrid.generating", "生成中…")
              : t2("canvas.splitGrid.generateHd", "生成高清图片")}
          </span>
          {!processing && (
            <CreditCostBadge
              cost={totalCost}
              className="origin-center scale-[0.84] rounded-md bg-[var(--canvas-toolbar-action-hover)] px-1.5 py-0.5 gap-0.5 text-[13px] text-[var(--canvas-toolbar-fg)]/70"
            />
          )}
        </button>
      </Tooltip$1>
    </div>
  );
}
function ExitChip({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="canvas-toolbar-action"
    >
      <CloseIcon$1 />
    </button>
  );
}
function Divider$3() {
  return <div className="canvas-toolbar-separator" aria-hidden="true" />;
}
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
    (range2) => rectCellIndices(range2.r0 * cols + range2.c0, range2.r1 * cols + range2.c1, cols),
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
        const scrim = isSelected ? (highlighted ? 0.6 : 0.45) : highlighted ? 0.2 : 0;
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
                  borderColor: highlighted ? "var(--canvas-node-border-selected)" : "#BBBBFE",
                }}
              />
            )}
            {showLabel && (
              <span
                className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-xs font-medium shadow-sm"
                style={{
                  background: "color-mix(in srgb, var(--canvas-controls-bg) 60%, transparent)",
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
