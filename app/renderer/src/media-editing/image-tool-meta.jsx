// image-tool-meta.jsx
import { jsxRuntimeExports, useTranslation, reactExports, X$7, CompositedSvg, SortableContext, horizontalListSortingStrategy, useSortable, CSS$1, Pin, PinOff, ActionListItem, ActionListSeparator, ActionListPanel, Layers3 } from "../vendor.js";
import { Settings2, RotateIcon, Stamp } from "./parse-item.jsx";
import { DEFAULT_PINNED$1, DEFAULT_SHOW_LABELS$1 } from "./use-multi-image-actions.js";
import {
  PanoramaIcon,
  SplitGridIcon,
  EraseIcon,
  RedrawIcon,
  CropIcon,
  OutpaintIcon,
  SuperResolutionIcon,
  RemoveBgIcon,
  ColorAdjustIcon,
  AnnotationIcon,
  MultiAngleIcon,
  StoryboardGridIcon,
  RelightIcon,
} from "../canvas/generating-media-area.jsx";
import {
  DropdownMenuItem$1,
  DropdownMenuSub$1,
  DropdownMenuSubTrigger$1,
  DropdownMenuContent$1,
  DropdownMenu$1,
  DropdownMenuTrigger$1,
} from "./use-lightbox-media-actions.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
export function PreviewBar({ pinned, showLabels, toolMeta, fixedRightChips, onUnpin }) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border-[1.5px] border-[var(--canvas-controls-border)] p-1"
      style={{
        background: "var(--canvas-controls-bg)",
      }}
    >
      <SortableContext items={pinned} strategy={horizontalListSortingStrategy}>
        {pinned.map((id2) => (
          <SortablePreviewChip
            key={id2}
            id={id2}
            meta={toolMeta[id2]}
            showLabel={showLabels}
            onUnpin={() => onUnpin(id2)}
          />
        ))}
      </SortableContext>
      <PreviewMoreChip />
      {fixedRightChips.length > 0 && (
        <>
          <FixedDivider />
          {fixedRightChips.map((chip) => (
            <FixedChip
              key={chip.id}
              icon={chip.icon}
              label={chip.label}
              showLabel={chip.showLabel}
            />
          ))}
        </>
      )}
    </div>
  );
}
function SortablePreviewChip({ id: id2, meta: meta2, showLabel, onUnpin }) {
  const { t: t2 } = useTranslation();
  const label = t2(meta2.labelKey, meta2.defaultLabel);
  const {
    attributes,
    listeners: listeners2,
    setNodeRef,
    transform: transform2,
    transition: transition2,
    isDragging,
  } = useSortable({
    id: id2,
    transition: {
      duration: 220,
      easing: "cubic-bezier(0.18, 0.67, 0.16, 1)",
    },
  });
  const style2 = {
    transform: CSS$1.Transform.toString(transform2),
    transition: transition2,
  };
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style2,
        ...(isDragging
          ? {
              visibility: "hidden",
            }
          : null),
      }}
      className={`relative group outline-none ${isDragging ? "pointer-events-none" : ""}`}
      {...attributes}
      {...listeners2}
    >
      <div
        className="flex h-10 min-w-10 items-center justify-center gap-0.5 p-2.5 rounded-[6px] cursor-grab active:cursor-grabbing"
        style={{
          color: "var(--canvas-controls-text)",
        }}
      >
        {meta2.icon}
        {showLabel && (
          <span className="text-sm font-normal tracking-tight whitespace-nowrap">{label}</span>
        )}
      </div>
      {!isDragging && (
        <button
          type="button"
          onClick={(e2) => {
            e2.stopPropagation();
            onUnpin();
          }}
          onPointerDown={(e2) => e2.stopPropagation()}
          className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background opacity-0 group-hover:opacity-100 transition-opacity outline-none"
          aria-label={t2("canvas.customizeToolbar.unpin", "Unpin")}
          title={t2("canvas.customizeToolbar.unpin", "Unpin")}
        >
          <X$7 size={10} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
export function DragGhost({ meta: meta2, showLabel }) {
  const { t: t2 } = useTranslation();
  const label = t2(meta2.labelKey, meta2.defaultLabel);
  return (
    <div
      className="flex h-10 min-w-10 items-center justify-center gap-0.5 p-2.5 rounded-[6px] cursor-grabbing"
      style={{
        background: "#ffffff",
        color: "#262626",
        outline: "1.5px solid rgba(0, 0, 0, 0.6)",
        outlineOffset: "0px",
        boxShadow: "0 12px 28px rgba(0, 0, 0, 0.18), 0 4px 10px rgba(0, 0, 0, 0.08)",
        transition: "none",
      }}
    >
      {meta2.icon}
      {showLabel && (
        <span className="text-sm font-normal tracking-tight whitespace-nowrap">{label}</span>
      )}
    </div>
  );
}
function PreviewMoreChip() {
  return (
    <div
      className="flex h-10 min-w-10 items-center justify-center gap-0.5 p-2.5 rounded-[4px]"
      style={{
        color: "var(--canvas-controls-text)",
      }}
    >
      <MorePreviewIcon />
    </div>
  );
}
function FixedDivider() {
  return (
    <div
      style={{
        width: 1,
        height: 24,
        background: "var(--canvas-controls-text)",
        opacity: 0.1,
        flexShrink: 0,
        margin: "0 2px",
      }}
    />
  );
}
function FixedChip({ icon, label, showLabel }) {
  return (
    <div
      className="flex h-10 min-w-10 items-center justify-center gap-0.5 p-2.5 rounded-[4px]"
      style={{
        color: "var(--canvas-controls-text)",
      }}
      title={label}
    >
      {icon}
      {showLabel && (
        <span className="text-sm font-normal tracking-tight whitespace-nowrap">{label}</span>
      )}
    </div>
  );
}
export function ToolTile({ id: _id, meta: meta2, pinned, onTogglePin }) {
  const { t: t2 } = useTranslation();
  const label = t2(meta2.labelKey, meta2.defaultLabel);
  return (
    <button
      type="button"
      onClick={onTogglePin}
      aria-pressed={pinned}
      title={pinned ? `${label} (Unpin)` : `${label} (Pin)`}
      className={`flex items-center gap-2 h-10 rounded-lg border px-3 select-none transition-colors text-left ${pinned ? "border-foreground/30 bg-[var(--canvas-controls-active)] text-foreground hover:bg-[var(--canvas-controls-hover)]" : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{meta2.icon}</span>
      <span className="flex-1 min-w-0 truncate text-sm">{label}</span>
      <span
        aria-hidden={true}
        className={`flex h-5 w-5 shrink-0 items-center justify-center ${pinned ? "text-foreground" : "text-muted-foreground/60"}`}
      >
        {pinned ? (
          <Pin size={14} strokeWidth={1.75} className="fill-current" />
        ) : (
          <PinOff size={14} strokeWidth={1.75} />
        )}
      </span>
    </button>
  );
}
function MorePreviewIcon() {
  return (
    <CompositedSvg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </CompositedSvg>
  );
}
const NODE_TOOL_INTERACTION = {
  // ── image tools ─────────────────────────────────────────────
  erase: "opens_mode",
  redraw: "opens_mode",
  crop: "opens_mode",
  outpaint: "opens_mode",
  "move-object": "opens_mode",
  "image-inplace-edit": "opens_mode",
  rotate: "opens_mode",
  "split-grid": "opens_mode",
  // Opens the target-resolution picker; apply happens only after the user
  // clicks Generate, and closing the picker is an abandon.
  "super-resolution": "opens_dialog",
  "remove-bg": "instant",
  "layer-decompose": "opens_dialog",
  "color-adjust": "opens_dialog",
  "promote-to-asset": "opens_dialog",
  "customize-toolbar": "opens_dialog",
  "add-to-chat": "side_effect",
  "panorama-reference": "side_effect",
  watermark: "opens_panel",
  more: "opens_panel",
  "multi-angle": "opens_panel",
  "storyboard-grid": "opens_panel",
  relight: "opens_panel",
  fullscreen: "opens_panel",
  // ── video tools ────────────────────────────────────────────
  "enhance-video": "opens_mode",
  "hailuo03-super-resolution": "opens_mode",
  "erase-subtitle": "opens_mode",
  asr: "opens_mode",
  clip: "opens_mode",
  "extract-frame": "opens_mode",
  "extract-audio": "instant",
  "capture-frame": "instant",
};
const DEFAULT_INTERACTION = "opens_mode";
export function classifyToolInteraction(toolId) {
  return NODE_TOOL_INTERACTION[toolId] ?? DEFAULT_INTERACTION;
}
export function createToolInteractionSession() {
  return {
    active: false,
    hadProgress: false,
  };
}
export function beginToolInteractionSession(session) {
  session.active = true;
  session.hadProgress = false;
}
export function setToolInteractionSessionProgress(session, hadProgress) {
  if (!session.active) return;
  session.hadProgress = hadProgress;
}
export function completeToolInteractionSession(session) {
  if (!session.active) return false;
  session.active = false;
  return true;
}
export function abandonToolInteractionSession(session, hadProgressOverride) {
  if (!session.active) return null;
  session.active = false;
  return hadProgressOverride ?? session.hadProgress;
}
const SPLIT_PRESETS = [
  {
    rows: 2,
    cols: 2,
  },
  {
    rows: 3,
    cols: 3,
  },
  {
    rows: 4,
    cols: 4,
  },
  {
    rows: 5,
    cols: 5,
  },
];
function resolveSplitGridMenuOptions(sourceGrid) {
  return sourceGrid ? [sourceGrid] : SPLIT_PRESETS;
}
const SPLIT_MAX = 5;
const DEFAULT_SPLIT_GUTTER_RATIO = 0.01;
function computeGridCells(width, height, rows, cols, gutterRatio = DEFAULT_SPLIT_GUTTER_RATIO) {
  const r2 = Math.max(1, Math.floor(rows));
  const c3 = Math.max(1, Math.floor(cols));
  const cellW = width / c3;
  const cellH = height / r2;
  const gutter = Math.max(0, Math.round(Math.min(cellW, cellH) * gutterRatio));
  const cells2 = [];
  for (let row = 0; row < r2; row++) {
    for (let col = 0; col < c3; col++) {
      const rawX = col * cellW;
      const rawY = row * cellH;
      const sx = Math.round(rawX + gutter);
      const sy = Math.round(rawY + gutter);
      const sw = Math.max(1, Math.round(cellW - gutter * 2));
      const sh = Math.max(1, Math.round(cellH - gutter * 2));
      cells2.push({
        sx,
        sy,
        sw,
        sh,
        row,
        col,
      });
    }
  }
  return cells2;
}
export function rectCellIndices(a2, b3, cols) {
  const ar = Math.floor(a2 / cols);
  const ac = a2 % cols;
  const br = Math.floor(b3 / cols);
  const bc = b3 % cols;
  const r0 = Math.min(ar, br);
  const r1 = Math.max(ar, br);
  const c0 = Math.min(ac, bc);
  const c1 = Math.max(ac, bc);
  const out = [];
  for (let r2 = r0; r2 <= r1; r2++) {
    for (let c3 = c0; c3 <= c1; c3++) out.push(r2 * cols + c3);
  }
  return out;
}
function loadImage$5(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e2) => reject(e2);
    img.src = src;
  });
}
function cellToBlob(img, cell) {
  const canvas = document.createElement("canvas");
  canvas.width = cell.sw;
  canvas.height = cell.sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("split-utils: 2d context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, cell.sx, cell.sy, cell.sw, cell.sh, 0, 0, cell.sw, cell.sh);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("split-utils: toBlob returned null"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}
export async function splitSelectedCellsToBlobs(
  src,
  rows,
  cols,
  selected2,
  originalWidth,
  originalHeight,
  gutterRatio = 0,
) {
  if (selected2.size === 0) return [];
  const img = await loadImage$5(src);
  const sw = originalWidth || img.naturalWidth;
  const sh = originalHeight || img.naturalHeight;
  const cells2 = computeGridCells(sw, sh, rows, cols, gutterRatio);
  const out = [];
  for (let i2 = 0; i2 < cells2.length; i2++) {
    if (!selected2.has(i2)) continue;
    const cell = cells2[i2];
    const blob = await cellToBlob(img, cell);
    out.push({
      blob,
      row: cell.row,
      col: cell.col,
      sw: cell.sw,
      sh: cell.sh,
    });
  }
  return out;
}
export function ImageSplitMenuItems({ onPick, sourceGrid }) {
  const { t: t2 } = useTranslation();
  const menuOptions = resolveSplitGridMenuOptions(sourceGrid);
  return (
    <>
      {menuOptions.map(({ rows, cols }) => (
        <ActionListItem
          key={`${rows}x${cols}`}
          render={<DropdownMenuItem$1 />}
          onClick={() => onPick(rows, cols)}
          data-action-ui-id={`canvas.node-split-grid-${cols}x${rows}`}
        >
          <span className="whitespace-nowrap">
            {sourceGrid ? (
              `${cols}×${rows}`
            ) : (
              <>
                {t2("canvas.splitGrid.preset", "{{n}}宫格", {
                  n: rows * cols,
                })}
                <span className="ml-1 text-[var(--canvas-toolbar-muted-fg)]">
                  ({cols}×{rows})
                </span>
              </>
            )}
          </span>
        </ActionListItem>
      ))}
      <ActionListSeparator />
      <DropdownMenuSub$1>
        <ActionListItem render={<DropdownMenuSubTrigger$1 />}>
          <span className="whitespace-nowrap">{t2("canvas.splitGrid.custom", "自定义")}</span>
          <span className="ml-auto pl-3 opacity-60">
            <ChevronRight />
          </span>
        </ActionListItem>
        <DropdownMenuContent$1
          side="right"
          align="start"
          sideOffset={8}
          className="p-3"
          variant="toolbar"
        >
          <CustomGridPicker onPick={onPick} />
        </DropdownMenuContent$1>
      </DropdownMenuSub$1>
    </>
  );
}
function CustomGridPicker({ onPick }) {
  const { t: t2 } = useTranslation();
  const [hover, setHover] = reactExports.useState({
    rows: 0,
    cols: 0,
  });
  const rowsIdx = Array.from(
    {
      length: SPLIT_MAX,
    },
    (_2, i2) => i2 + 1,
  );
  const colsIdx = Array.from(
    {
      length: SPLIT_MAX,
    },
    (_2, i2) => i2 + 1,
  );
  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between gap-6">
        <span className="canvas-toolbar-label text-[var(--canvas-toolbar-muted-fg)]">
          {t2("canvas.splitGrid.customTitle", "自定义宫格")}
        </span>
        <span className="canvas-toolbar-label tabular-nums text-[var(--canvas-toolbar-muted-fg)]">
          {hover.cols > 0 ? `${hover.cols} × ${hover.rows}` : `${SPLIT_MAX} × ${SPLIT_MAX}`}
        </span>
      </div>
      <div
        className="flex flex-col gap-1"
        onMouseLeave={() =>
          setHover({
            rows: 0,
            cols: 0,
          })
        }
      >
        {rowsIdx.map((r2) => (
          <div key={r2} className="flex gap-1">
            {colsIdx.map((c3) => {
              const selected2 = r2 <= hover.rows && c3 <= hover.cols;
              return (
                <button
                  key={c3}
                  type="button"
                  aria-label={`${c3} × ${r2}`}
                  onMouseEnter={() =>
                    setHover({
                      rows: r2,
                      cols: c3,
                    })
                  }
                  onClick={() => onPick(r2, c3)}
                  className={`h-8 w-8 rounded-md border transition-colors ${selected2 ? "border-brand-accent/80 bg-brand-accent/80 hover:bg-brand-accent/90 dark:hover:bg-brand-accent/90" : "border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-hover)]"}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
function ChevronRight() {
  return (
    <CompositedSvg width="8" height="10" viewBox="0 0 8 10" fill="none" aria-hidden="true">
      <path
        d="M2 1L6 5L2 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
export const IMAGE_TOOLBAR_DEFAULT_PINNED = DEFAULT_PINNED$1;
export const IMAGE_TOOLBAR_DEFAULT_SHOW_LABELS = DEFAULT_SHOW_LABELS$1;
export const IMAGE_TOOLBAR_NEW_FEATURE_STORAGE_KEY = "hilo:canvas:image-toolbar:seen-features:v1";
const IMAGE_TOOLBAR_NEW_FEATURE_IDS = [
  "relight",
  "storyboard-grid",
  "watermark",
  "layer-decompose",
];
const IMAGE_TOOLBAR_NEW_FEATURE_ID_SET = new Set(IMAGE_TOOLBAR_NEW_FEATURE_IDS);
export function readSeenImageToolbarFeatures() {
  if (typeof window === "undefined") return new Set();
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(IMAGE_TOOLBAR_NEW_FEATURE_STORAGE_KEY) ?? "[]",
    );
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter(
        (value) => typeof value === "string" && IMAGE_TOOLBAR_NEW_FEATURE_ID_SET.has(value),
      ),
    );
  } catch {
    return new Set();
  }
}
export function isImageToolbarNewFeatureId(value) {
  return IMAGE_TOOLBAR_NEW_FEATURE_ID_SET.has(value);
}
export function CustomizeIcon$1() {
  return <Settings2 size={20} strokeWidth={1.5} aria-hidden="true" />;
}
export function PinnedSplitGridToolbarItem({ disabled: disabled2, onPick, sourceGrid }) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  return (
    <>
      <DropdownMenu$1 open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger$1
          disabled={disabled2}
          className="canvas-toolbar-action"
          data-action-ui-id="canvas.node-split-grid"
        >
          <SplitGridIcon />
          <span className="canvas-toolbar-label whitespace-nowrap">
            {t2("canvas.splitGrid.label", "Split Grid")}
          </span>
          <SplitGridDisclosureIcon open={open} />
        </DropdownMenuTrigger$1>
        <ActionListPanel
          className="w-max"
          render={
            <DropdownMenuContent$1
              side="bottom"
              sideOffset={8}
              align="start"
              variant="toolbar"
              className="data-open:zoom-in-100 data-closed:zoom-out-100"
            />
          }
        >
          <ImageSplitMenuItems onPick={onPick} sourceGrid={sourceGrid} />
        </ActionListPanel>
      </DropdownMenu$1>
      <div
        aria-hidden="true"
        style={{
          width: 1,
          height: 24,
          background: "var(--canvas-controls-text)",
          opacity: 0.1,
          flexShrink: 0,
        }}
      />
    </>
  );
}
function SplitGridDisclosureIcon({ open }) {
  return (
    <CompositedSvg
      width="8"
      height="5"
      viewBox="0 0 8 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ml-0.5 opacity-60"
      aria-hidden="true"
    >
      <path d={open ? "M1 4L4 1L7 4" : "M1 1L4 4L7 1"} />
    </CompositedSvg>
  );
}
export const IMAGE_TOOL_META = {
  erase: {
    id: "erase",
    labelKey: "canvas.erase",
    defaultLabel: "Erase",
    icon: <EraseIcon />,
    requiresDimensions: true,
  },
  redraw: {
    id: "redraw",
    labelKey: "canvas.redraw.label",
    defaultLabel: "Redraw",
    icon: <RedrawIcon />,
    requiresDimensions: true,
  },
  crop: {
    id: "crop",
    labelKey: "canvas.crop",
    defaultLabel: "Crop",
    icon: <CropIcon />,
    requiresDimensions: false,
  },
  outpaint: {
    id: "outpaint",
    labelKey: "canvas.outpaint",
    defaultLabel: "Outpaint",
    icon: <OutpaintIcon />,
    requiresDimensions: true,
  },
  "super-resolution": {
    id: "super-resolution",
    labelKey: "canvas.superResolution.label",
    defaultLabel: "HD",
    icon: <SuperResolutionIcon />,
    requiresDimensions: true,
  },
  "remove-bg": {
    id: "remove-bg",
    labelKey: "canvas.removeBg.label",
    defaultLabel: "Remove Background",
    icon: <RemoveBgIcon />,
    requiresDimensions: true,
    costToolId: "remove-bg",
  },
  "color-adjust": {
    id: "color-adjust",
    labelKey: "canvas.colorAdjust",
    defaultLabel: "Color Adjust",
    icon: <ColorAdjustIcon />,
    requiresDimensions: false,
  },
  "image-inplace-edit": {
    id: "image-inplace-edit",
    labelKey: "canvas.imageEdit.label",
    defaultLabel: "Edit Image",
    icon: <AnnotationIcon size={20} />,
    requiresDimensions: false,
  },
  rotate: {
    id: "rotate",
    labelKey: "canvas.rotate.label",
    defaultLabel: "Rotate",
    icon: <RotateIcon />,
    requiresDimensions: true,
  },
  "multi-angle": {
    id: "multi-angle",
    labelKey: "canvas.multiAngle",
    defaultLabel: "AnyAngle",
    icon: <MultiAngleIcon size={16} />,
    requiresDimensions: false,
    dataActionUiId: "canvas.node-multi-angle",
  },
  "storyboard-grid": {
    id: "storyboard-grid",
    labelKey: "canvas.storyboardGrid",
    defaultLabel: "Storyboard",
    icon: <StoryboardGridIcon />,
    requiresDimensions: false,
    dataActionUiId: "canvas.node-storyboard-grid",
  },
  "panorama-reference": {
    id: "panorama-reference",
    labelKey: "canvas.panorama.title",
    defaultLabel: "Panorama",
    icon: <PanoramaIcon />,
    requiresDimensions: false,
    dataActionUiId: "canvas.node-panorama-reference",
  },
  watermark: {
    id: "watermark",
    labelKey: "canvas.watermark.label",
    defaultLabel: "Watermark",
    icon: <Stamp size={20} strokeWidth={1.6} aria-hidden="true" />,
    requiresDimensions: false,
    dataActionUiId: "canvas.node-watermark",
  },
  relight: {
    id: "relight",
    labelKey: "canvas.relight",
    defaultLabel: "Relight",
    icon: <RelightIcon />,
    requiresDimensions: false,
    dataActionUiId: "canvas.node-relight",
  },
  "layer-decompose": {
    id: "layer-decompose",
    labelKey: "canvas.layerDecompose.label",
    defaultLabel: "图层拆分",
    icon: <Layers3 size={18} strokeWidth={1.5} aria-hidden="true" />,
    requiresDimensions: true,
    dataActionUiId: "canvas.node-layer-decompose",
  },
};
