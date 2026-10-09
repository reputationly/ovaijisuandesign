// canvas-sticker-assets.jsx
import {
  CompositedSvg,
  ExternalLink$2,
  reactDomExports,
  reactExports,
  useTranslation,
  X$7,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { DEFAULT_ROW_HEIGHT } from "../canvas/is-reexecutable-generation-node.js";
import {
  buildThumbnailUrl,
  buildVideoThumbnailUrl,
} from "./build-video-thumb-base.jsx";
import { areNodePropsEqual } from "../canvas/fullscreen-icon.jsx";
import { ImageNodeInner } from "./image-node-inner.jsx";
import { Ungroup } from "../canvas/diagnostic-history-tools.js";

export const ImageNode = reactExports.memo(ImageNodeInner, areNodePropsEqual);

export function shouldActivateVideoHover({
  canvasActive,
  elementStillHovered,
  interactionBlocked = false,
}) {
  return canvasActive && elementStillHovered && !interactionBlocked;
}

export function CardWrapper({
  cardWidth,
  cardHeight,
  position: position2,
  children: children2,
  onMouseEnter,
  onMouseLeave,
  onContextMenu,
  onDoubleClick,
}) {
  const animationDelayMs = Math.min(position2.originalIndex, 6) * 18;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: mirrors the main video node's hover preview zone.
    <div
      data-action-ui-id="canvas.video-node.sub-video-card"
      className="canvas-media-expanded-card group pointer-events-auto absolute block"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      style={{
        left: position2.dx,
        top: position2.dy,
        width: cardWidth,
        height: cardHeight,
        animationDelay: `${animationDelayMs}ms`,
      }}
    >
      {children2}
    </div>
  );
}

export function DeleteButton({ onDelete, label }) {
  return (
    <button
      type="button"
      data-action-ui-id="canvas.video-node.sub-video-card.delete"
      onClick={onDelete}
      aria-label={label}
      title={label}
      className="pointer-events-auto absolute right-8 top-1 z-20 flex size-6 cursor-pointer items-center justify-center rounded-[8px] bg-[var(--canvas-media-control-bg)] text-[var(--canvas-media-control-fg)] opacity-100 transition-[background-color,color,transform] duration-150 ease-out hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      <X$7 size={14} strokeWidth={1.5} aria-hidden={true} />
    </button>
  );
}

export function VideoSplitAllButton({ onSplitAll, disabled: disabled2 }) {
  const { t: t2 } = useTranslation();
  const label = t2("canvas.multiImage.splitAll", "全部独立");
  const handleClick2 = (e2) => {
    e2.stopPropagation();
    if (disabled2) return;
    onSplitAll();
  };
  if (disabled2) return null;
  return (
    <button
      type="button"
      data-action-ui-id="canvas.video-node.split-all"
      onClick={handleClick2}
      aria-label={label}
      title={label}
      className="pointer-events-auto flex h-6 items-center gap-1 rounded-[8px] bg-black/55 px-2 text-[11px] font-medium text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      <Ungroup size={12} />
      {label}
    </button>
  );
}

export function VideoSplitMainButton({ onSplitMain, disabled: disabled2 }) {
  const { t: t2 } = useTranslation();
  const label = t2("canvas.multiImage.splitMain", "独立展示");
  const handleClick2 = (e2) => {
    e2.stopPropagation();
    if (disabled2) return;
    onSplitMain();
  };
  if (disabled2) return null;
  return (
    <button
      type="button"
      data-action-ui-id="canvas.video-node.split-main"
      onClick={handleClick2}
      aria-label={label}
      title={label}
      className="pointer-events-auto flex h-6 items-center gap-1 rounded-[8px] bg-black/55 px-2 text-[11px] font-medium text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      <ExternalLink$2 size={12} />
      {label}
    </button>
  );
}

const approvedStickerUrl =
  "" + new URL("../sticker-approved-Cvm_nH-W.png", import.meta.url).href;

const stampCursorUrl =
  "" + new URL("../sticker-cursor-bowD96zH.svg", import.meta.url).href;

const dotStickerUrl =
  "" + new URL("../sticker-dot-CxhF5shh.png", import.meta.url).href;

const heartStickerUrl =
  "data:image/png;base64,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";

const questionStickerUrl =
  "data:image/png;base64,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";

const rejectedStickerUrl =
  "" + new URL("../sticker-rejected-Z3JcNklb.png", import.meta.url).href;

const starStickerUrl =
  "data:image/png;base64,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";

const thumbsDownStickerUrl =
  "" + new URL("../sticker-thumbs-down-CO0P0mLl.png", import.meta.url).href;

const thumbsUpStickerUrl =
  "" + new URL("../sticker-thumbs-up-DL9-hU6T.png", import.meta.url).href;

const CANVAS_STICKER_ASSETS = [
  {
    id: "sticker-star",
    labelKey: "canvas.sticker.asset.star",
    src: starStickerUrl,
  },
  {
    id: "sticker-heart",
    labelKey: "canvas.sticker.asset.heart",
    src: heartStickerUrl,
  },
  {
    id: "sticker-dot",
    labelKey: "canvas.sticker.asset.dot",
    src: dotStickerUrl,
  },
  {
    id: "sticker-question",
    labelKey: "canvas.sticker.asset.question",
    src: questionStickerUrl,
  },
  {
    id: "sticker-thumbs-up",
    labelKey: "canvas.sticker.asset.thumbsUp",
    src: thumbsUpStickerUrl,
  },
  {
    id: "sticker-thumbs-down",
    labelKey: "canvas.sticker.asset.thumbsDown",
    src: thumbsDownStickerUrl,
  },
  {
    id: "sticker-approved",
    labelKey: "canvas.sticker.asset.approved",
    src: approvedStickerUrl,
  },
  {
    id: "sticker-rejected",
    labelKey: "canvas.sticker.asset.rejected",
    src: rejectedStickerUrl,
  },
];

const CANVAS_STICKER_PICKER_ASSET_IDS = [
  "sticker-approved",
  "sticker-rejected",
  "sticker-thumbs-up",
  "sticker-thumbs-down",
  "sticker-question",
  "sticker-heart",
  "sticker-star",
];

const CANVAS_STICKER_ASSET_BY_ID = new Map(
  CANVAS_STICKER_ASSETS.map((asset) => [asset.id, asset]),
);

export const CANVAS_STICKER_PICKER_ASSETS =
  CANVAS_STICKER_PICKER_ASSET_IDS.flatMap((id2) => {
    const asset = CANVAS_STICKER_ASSET_BY_ID.get(id2);
    return asset ? [asset] : [];
  });

export const CANVAS_DEFAULT_STICKER_ASSET_ID =
  CANVAS_STICKER_PICKER_ASSET_IDS[0];

export const CANVAS_EMOJI_STICKERS = [
  "✅",
  "💯",
  "🎉",
  "👏",
  "🔥",
  "💡",
  "👀",
  "🚀",
];

export const CANVAS_STAMP_CURSOR_URL = stampCursorUrl;

export function getCanvasStickerAsset(id2) {
  return CANVAS_STICKER_ASSETS.find((asset) => asset.id === id2);
}

export const CanvasToolModeContext = reactExports.createContext("select");

export function CanvasToolModeProvider({ value, children: children2 }) {
  return (
    <CanvasToolModeContext.Provider value={value}>
      {children2}
    </CanvasToolModeContext.Provider>
  );
}

export function attachmentThumbnailUrl(attachment, meta2, displayWidth) {
  if (!meta2) return void 0;
  if (attachment.kind === "text") return void 0;
  if (attachment.kind === "audio") return void 0;
  if (attachment.kind === "file") return void 0;
  if (attachment.kind === "image") {
    return buildThumbnailUrl(meta2.url, displayWidth);
  }
  if (!meta2.path) return void 0;
  return buildVideoThumbnailUrl(meta2.url, meta2.path, displayWidth);
}

export function ChipTooltip({
  x: x2,
  anchorTop,
  anchorBottom,
  children: children2,
}) {
  const ref = reactExports.useRef(null);
  const [adjusted, setAdjusted] = reactExports.useState(null);
  reactExports.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 4;
    let left = x2 - rect.width / 2;
    if (left < margin) left = margin;
    if (left + rect.width > window.innerWidth - margin) {
      left = window.innerWidth - rect.width - margin;
    }
    let top2 = anchorTop - rect.height - 6;
    if (top2 < margin) top2 = anchorBottom + 6;
    setAdjusted({
      left,
      top: top2,
    });
  }, [x2, anchorTop, anchorBottom]);
  const [host] = reactExports.useState(() =>
    typeof document !== "undefined" ? document.body : null,
  );
  if (!host) return null;
  return reactDomExports.createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-[10002] max-w-[260px] truncate px-2 py-1 text-[11px] shadow-md"
      style={{
        left: adjusted?.left ?? -9999,
        top: adjusted?.top ?? -9999,
        background: "var(--canvas-tooltip-bg, rgba(20,20,20,0.92))",
        color: "var(--canvas-tooltip-fg, #fff)",
      }}
    >
      {children2}
    </div>,
    host,
  );
}

export function PlusIcon$1({ size: size2 = 12 } = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M6 1.5V10.5M1.5 6H10.5" strokeLinecap="round" />
    </CompositedSvg>
  );
}

export function DragHandleIcon() {
  return (
    <CompositedSvg
      width="6"
      height="12"
      viewBox="0 0 6 12"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="1.5" cy="2" r="1" />
      <circle cx="4.5" cy="2" r="1" />
      <circle cx="1.5" cy="6" r="1" />
      <circle cx="4.5" cy="6" r="1" />
      <circle cx="1.5" cy="10" r="1" />
      <circle cx="4.5" cy="10" r="1" />
    </CompositedSvg>
  );
}

export function PaperclipIcon({ size: size2 = 12 } = {}) {
  return (
    <CompositedSvg
      className="shrink-0"
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12.304 7.315a1 1 0 0 1 1.414 1.414L8.13 14.317a1.485 1.485 0 0 0 0 2.1l.01.011a1.5 1.5 0 0 0 2.117-.005l7.43-7.43a3.5 3.5 0 0 0 0-4.95l-.036-.037a3.5 3.5 0 0 0-4.95 0l-7.778 7.777a5.521 5.521 0 0 0 7.808 7.809l7.07-7.07a1 1 0 0 1 1.415 1.414l-7.07 7.07A7.521 7.521 0 0 1 3.509 10.37l7.778-7.778a5.5 5.5 0 0 1 7.778 0l.037.037a5.5 5.5 0 0 1 0 7.778l-7.43 7.43a3.5 3.5 0 0 1-4.939.012l-.006-.006-.012-.012a3.485 3.485 0 0 1 0-4.928l5.589-5.588Z"
      />
    </CompositedSvg>
  );
}

export function TrashIcon({ size: size2 = 12 } = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M2.5 4h11" strokeLinecap="round" />
      <path d="M6 4V2.5h4V4" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M3.5 4l.7 9a1 1 0 001 .9h5.6a1 1 0 001-.9l.7-9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}

export const OPS_REQUIRING_VALUE = new Set([
  "equals",
  "notEquals",
  "contains",
  "notContains",
  "gt",
  "gte",
  "lt",
  "lte",
]);

const ROW_HEIGHT_LINES = {
  low: 1,
  medium: 2,
  tall: 4,
  extraTall: 6,
};

const ROW_HEIGHT_PRESETS = {
  low: 32,
  medium: 50,
  tall: 86,
  extraTall: 122,
};

export function operatorsForFieldType(type2) {
  if (type2 === "text")
    return [
      "equals",
      "notEquals",
      "contains",
      "notContains",
      "empty",
      "notEmpty",
    ];
  if (type2 === "number")
    return [
      "equals",
      "notEquals",
      "gt",
      "gte",
      "lt",
      "lte",
      "empty",
      "notEmpty",
    ];
  return ["empty", "notEmpty"];
}

export function defaultOpForFieldType(type2) {
  if (type2 === "attachment") return "empty";
  return "equals";
}

export function renameColumn(doc2, columnId, title) {
  const trimmed = title.trim() || "Untitled";
  return {
    ...doc2,
    columns: doc2.columns.map((c3) =>
      c3.id === columnId
        ? {
            ...c3,
            title: trimmed,
          }
        : c3,
    ),
  };
}

export function moveItem(list2, fromId, toId, position2) {
  if (fromId === toId) return list2;
  const fromIdx = list2.findIndex((c3) => c3.id === fromId);
  const toIdx = list2.findIndex((c3) => c3.id === toId);
  if (fromIdx < 0 || toIdx < 0) return list2;
  const next2 = list2.slice();
  const [moved] = next2.splice(fromIdx, 1);
  if (!moved) return list2;
  const baseIdx = next2.findIndex((c3) => c3.id === toId);
  if (baseIdx < 0) return list2;
  const insertAt = position2 === "after" ? baseIdx + 1 : baseIdx;
  if (insertAt === fromIdx) return list2;
  next2.splice(insertAt, 0, moved);
  return next2;
}

export function removeFilterCondition(doc2, conditionId) {
  if (!doc2.filter) return doc2;
  const conditions = doc2.filter.conditions.filter(
    (c3) => c3.id !== conditionId,
  );
  if (conditions.length === 0)
    return {
      ...doc2,
      filter: void 0,
    };
  return {
    ...doc2,
    filter: {
      ...doc2.filter,
      conditions,
    },
  };
}

export function pruneFilterColumn(filter2, columnId) {
  if (!filter2) return void 0;
  const conditions = filter2.conditions.filter(
    (c3) => c3.columnId !== columnId,
  );
  if (conditions.length === 0) return void 0;
  if (conditions.length === filter2.conditions.length) return filter2;
  return {
    ...filter2,
    conditions,
  };
}

export function getRowHeight(doc2) {
  return doc2.rowHeight ?? DEFAULT_ROW_HEIGHT;
}

export function setRowHeight(doc2, rowHeight) {
  if (getRowHeight(doc2) === rowHeight) return doc2;
  return {
    ...doc2,
    rowHeight,
  };
}

export function getRowHeightPx(doc2) {
  return ROW_HEIGHT_PRESETS[getRowHeight(doc2)];
}

export function getRowHeightLines(doc2) {
  return ROW_HEIGHT_LINES[getRowHeight(doc2)];
}
