// canvas-move-object-overlay.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  useCanvasBridge,
  useReactFlow,
  reactExports,
  CompositedSvg,
  useCropViewportZoom,
  useStore$3,
  useMoveObjectState,
  clamp$6,
  useOutpaintState,
  CANVAS_MIN_ZOOM,
  CANVAS_MAX_ZOOM,
} from "../vendor.js";
import {
  CloseIcon$1,
  SendArrowIcon,
  UndoIcon$1,
  SelectRectIcon,
} from "../m01/generating-media-area.jsx";
import { CreditCostBadge } from "../m01/create-tracker.jsx";
import { useImageEditCost } from "../m03/calc-crop-rect.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { BananaResolutionPicker } from "./canvas-crop-overlay.jsx";
import { CornerHandle, EdgeHandle, ImageIcon$1 } from "./canvas-redraw-overlay.jsx";
const CanvasMoveObjectPanel = reactExports.memo(function CanvasMoveObjectPanel2({
  croppedUrl,
  canRun,
  running: running2,
  onReset,
  onCancel,
  onRun,
  resolution,
  onResolutionChange,
}) {
  const { t: t2 } = useTranslation();
  const creditCost = useImageEditCost("move-object", resolution);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stops propagation so panel events don't reach the canvas pan/zoom handlers
    <div
      className="flex w-[300px] flex-col gap-3 rounded-lg border p-3"
      style={{
        background: "var(--canvas-controls-bg, #262626)",
        borderColor: "var(--canvas-controls-border, #363636)",
        boxShadow: "var(--canvas-shadow-dropdown)",
        color: "var(--canvas-controls-text, #fff)",
      }}
      onPointerDown={(e2) => e2.stopPropagation()}
      onWheel={(e2) => e2.stopPropagation()}
      onContextMenu={(e2) => e2.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <span className="font-heading text-[13px] font-medium">
          {t2("canvas.moveObject.title")}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={t2("canvas.moveObject.reset")}
            aria-label={t2("canvas.moveObject.reset")}
            data-action-ui-id="move-object.reset"
            onClick={onReset}
            disabled={!croppedUrl || running2}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              color: "var(--canvas-controls-text, #fff)",
              opacity: 0.7,
            }}
            onMouseEnter={(e2) => {
              if (!croppedUrl || running2) return;
              e2.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e2) => {
              if (!croppedUrl || running2) return;
              e2.currentTarget.style.opacity = "0.7";
            }}
          >
            <UndoIcon$1 />
          </button>
          <button
            type="button"
            title={t2("canvas.close")}
            aria-label={t2("canvas.close")}
            onClick={onCancel}
            disabled={running2}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-opacity duration-150 disabled:cursor-not-allowed"
            style={{
              color: "var(--canvas-controls-text, #fff)",
              opacity: running2 ? 0.4 : 0.7,
            }}
            onMouseEnter={(e2) => {
              if (running2) return;
              e2.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e2) => {
              if (running2) return;
              e2.currentTarget.style.opacity = "0.7";
            }}
          >
            <CloseIcon$1 />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span
          className="text-[12px]"
          style={{
            color: "var(--canvas-controls-text, #fff)",
            opacity: 0.7,
          }}
        >
          {t2("canvas.moveObject.objectSelection")}
        </span>
        <div
          className="flex items-center gap-2 rounded-md border p-2"
          style={{
            borderColor: "var(--canvas-controls-border, #363636)",
            background: "rgba(255, 255, 255, 0.04)",
          }}
        >
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm border"
            style={{
              borderColor: "var(--canvas-controls-border, #363636)",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            {croppedUrl ? (
              <img
                src={croppedUrl}
                alt={t2("canvas.moveObject.thumbnailAlt")}
                className="h-full w-full object-contain"
                draggable={false}
              />
            ) : (
              <span
                className="text-[10px]"
                style={{
                  color: "var(--canvas-controls-text, #fff)",
                  opacity: 0.4,
                }}
              >
                {t2("canvas.moveObject.empty")}
              </span>
            )}
          </div>
          <span
            className="text-[12px] leading-snug"
            style={{
              color: "var(--canvas-controls-text, #fff)",
              opacity: 0.7,
            }}
          >
            {t2("canvas.moveObject.hint.editObject")}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <BananaResolutionPicker
          value={resolution}
          onChange={onResolutionChange}
          disabled={running2}
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={running2}
            data-action-ui-id="move-object.cancel"
            className="flex size-8 items-center justify-center rounded-md transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t2("common.cancel")}
            title={t2("common.cancel")}
            style={{
              color: "var(--canvas-controls-text, #fff)",
              background: "transparent",
              opacity: running2 ? 0.4 : 0.7,
            }}
            onMouseEnter={(e2) => {
              if (running2) return;
              e2.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e2) => {
              if (running2) return;
              e2.currentTarget.style.opacity = "0.7";
            }}
          >
            <CloseIcon$1 />
          </button>
          <div className="flex items-center gap-2">
            {!running2 && <CreditCostBadge cost={creditCost} compact={true} />}
            <button
              type="button"
              disabled={!canRun || running2}
              onClick={onRun}
              data-action-ui-id="move-object.run"
              className="flex size-8 items-center justify-center rounded-md transition-colors duration-150 disabled:opacity-50"
              aria-label={t2("canvas.moveObject.run")}
              title={t2("canvas.moveObject.run")}
              style={{
                background: "var(--canvas-primary-btn-bg, #000000d9)",
                color: "var(--canvas-primary-btn-icon, #fff)",
              }}
              onMouseEnter={(e2) => {
                if (running2 || !canRun) return;
                e2.currentTarget.style.opacity = "0.9";
              }}
              onMouseLeave={(e2) => {
                e2.currentTarget.style.opacity = "1";
              }}
            >
              <SendArrowIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
function LassoIcon() {
  return (
    <CompositedSvg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2.5C4.41 2.5 1.75 4.36 1.75 6.7c0 1.84 1.65 3.43 4 4.04"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 2.5c3.59 0 6.25 1.86 6.25 4.2 0 1.84-1.65 3.43-4 4.04"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M5.5 11c-.4 1.1-.8 2-1.2 2.6-.3.4-.7.6-1.05.5-.3-.1-.5-.4-.5-.85 0-.4.2-.85.6-1.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
const CanvasMoveObjectTopBar = reactExports.memo(function CanvasMoveObjectTopBar2({
  tool: tool2,
  onToolChange,
  hasSelection: hasSelection2,
  onUndo,
  onClose,
}) {
  const { t: t2 } = useTranslation();
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stops propagation so toolbar events don't reach the canvas pan/zoom handlers
    <div
      className="canvas-toolbar-surface"
      onPointerDown={(e2) => e2.stopPropagation()}
      onWheel={(e2) => e2.stopPropagation()}
      onContextMenu={(e2) => e2.stopPropagation()}
      data-canvas-toolbar="true"
      data-density="compact"
    >
      <IconButton$1
        disabled={false}
        onClick={onClose}
        title={t2("canvas.close")}
        ariaLabel={t2("canvas.close")}
        e2eId="move-object.close"
      >
        <CloseIcon$1 />
      </IconButton$1>
      <Divider />
      <ToolButton
        active={tool2 === "rect"}
        onClick={() => onToolChange("rect")}
        title={t2("canvas.moveObject.tool.rect")}
        e2eId="move-object.tool-rect"
      >
        <SelectRectIcon />
      </ToolButton>
      <ToolButton
        active={tool2 === "lasso"}
        onClick={() => onToolChange("lasso")}
        title={t2("canvas.moveObject.tool.lasso")}
        e2eId="move-object.tool-lasso"
      >
        <LassoIcon />
      </ToolButton>
      <Divider />
      <IconButton$1
        disabled={!hasSelection2}
        onClick={onUndo}
        title={t2("canvas.moveObject.undo")}
        ariaLabel={t2("canvas.moveObject.undo")}
        e2eId="move-object.undo"
      >
        <UndoIcon$1 />
      </IconButton$1>
    </div>
  );
});
function ToolButton({ active: active2, onClick, title, e2eId, children: children2 }) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active2}
      onClick={onClick}
      data-action-ui-id={e2eId}
      className="canvas-toolbar-action"
    >
      {children2}
    </button>
  );
}
function IconButton$1({
  disabled: disabled2,
  onClick,
  title,
  ariaLabel,
  e2eId,
  children: children2,
}) {
  return (
    <button
      type="button"
      disabled={disabled2}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      data-action-ui-id={e2eId}
      className="canvas-toolbar-action"
    >
      {children2}
    </button>
  );
}
function Divider() {
  return <div className="canvas-toolbar-separator" aria-hidden="true" />;
}
const MOVE_OBJECT_SOURCE_COLOR = "#FF3B30";
const MOVE_OBJECT_TARGET_COLOR = "#34C759";
const MOVE_OBJECT_ARROW_COLOR = "#FFFFFF";
const MOVE_OBJECT_ARROW_SHADOW = "rgba(0, 0, 0, 0.45)";
function loadImage$1(url2) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url2}`));
    img.src = url2;
  });
}
function canvasToPngBlob$1(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob returned null"));
      },
      "image/png",
      1,
    );
  });
}
function clampBboxToImage(bbox, imageWidth, imageHeight) {
  let [x2, y4, w3, h2] = bbox;
  w3 = Math.max(1, Math.min(Math.round(w3), imageWidth));
  h2 = Math.max(1, Math.min(Math.round(h2), imageHeight));
  x2 = Math.max(0, Math.min(Math.round(x2), imageWidth - w3));
  y4 = Math.max(0, Math.min(Math.round(y4), imageHeight - h2));
  return [x2, y4, w3, h2];
}
function bboxFromPath(path2) {
  if (path2.length === 0) return [0, 0, 0, 0];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const [x2, y4] of path2) {
    if (x2 < minX) minX = x2;
    if (y4 < minY) minY = y4;
    if (x2 > maxX) maxX = x2;
    if (y4 > maxY) maxY = y4;
  }
  return [
    Math.floor(minX),
    Math.floor(minY),
    Math.max(1, Math.ceil(maxX - minX)),
    Math.max(1, Math.ceil(maxY - minY)),
  ];
}
async function cropObjectByRect(srcImageUrl, bbox) {
  const img = await loadImage$1(srcImageUrl);
  const [sx, sy, sw, sh] = bbox;
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("cropObjectByRect: 2d context unavailable");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvasToPngBlob$1(canvas);
}
async function cropObjectByLasso(srcImageUrl, path2) {
  const img = await loadImage$1(srcImageUrl);
  const [bx, by, bw, bh] = bboxFromPath(path2);
  const canvas = document.createElement("canvas");
  canvas.width = bw;
  canvas.height = bh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("cropObjectByLasso: 2d context unavailable");
  ctx.save();
  ctx.beginPath();
  for (let i2 = 0; i2 < path2.length; i2 += 1) {
    const [px, py] = path2[i2];
    const x2 = px - bx;
    const y4 = py - by;
    if (i2 === 0) ctx.moveTo(x2, y4);
    else ctx.lineTo(x2, y4);
  }
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, -bx, -by);
  ctx.restore();
  return canvasToPngBlob$1(canvas);
}
function strokeWidthForImage(imageWidth, imageHeight) {
  const longest = Math.max(imageWidth, imageHeight);
  return Math.max(2, Math.round(longest / 400));
}
async function renderSchematic(params) {
  const { srcImageUrl, imageWidth, imageHeight, source, target } = params;
  const img = await loadImage$1(srcImageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("renderSchematic: 2d context unavailable");
  ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
  const stroke = strokeWidthForImage(imageWidth, imageHeight);
  const halfStroke = stroke / 2;
  ctx.lineWidth = stroke;
  ctx.strokeStyle = MOVE_OBJECT_SOURCE_COLOR;
  ctx.setLineDash([]);
  ctx.strokeRect(
    source[0] + halfStroke,
    source[1] + halfStroke,
    source[2] - stroke,
    source[3] - stroke,
  );
  ctx.strokeStyle = MOVE_OBJECT_TARGET_COLOR;
  ctx.strokeRect(
    target[0] + halfStroke,
    target[1] + halfStroke,
    target[2] - stroke,
    target[3] - stroke,
  );
  const sx = source[0] + source[2] / 2;
  const sy = source[1] + source[3] / 2;
  const tx = target[0] + target[2] / 2;
  const ty = target[1] + target[3] / 2;
  const dash2 = Math.max(8, stroke * 4);
  ctx.setLineDash([dash2, dash2]);
  ctx.lineWidth = stroke + 2;
  ctx.strokeStyle = MOVE_OBJECT_ARROW_SHADOW;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.lineWidth = stroke;
  ctx.strokeStyle = MOVE_OBJECT_ARROW_COLOR;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.hypot(dx, dy);
  if (len > 1) {
    const ux = dx / len;
    const uy = dy / len;
    const headLen = Math.max(stroke * 4, 16);
    const headWidth = headLen * 0.6;
    const baseX = tx - ux * headLen;
    const baseY = ty - uy * headLen;
    const leftX = baseX + -uy * headWidth * 0.5;
    const leftY = baseY + ux * headWidth * 0.5;
    const rightX = baseX - -uy * headWidth * 0.5;
    const rightY = baseY - ux * headWidth * 0.5;
    ctx.fillStyle = MOVE_OBJECT_ARROW_SHADOW;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = MOVE_OBJECT_ARROW_COLOR;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(leftX + ux * 1.5, leftY + uy * 1.5);
    ctx.lineTo(rightX + ux * 1.5, rightY + uy * 1.5);
    ctx.closePath();
    ctx.fill();
  }
  return canvasToPngBlob$1(canvas);
}
function useMoveObjectEdit({ src, imageWidth, imageHeight }) {
  const [tool2, setTool] = reactExports.useState("rect");
  const [status, setStatus] = reactExports.useState("selecting");
  const [source, setSource] = reactExports.useState(null);
  const [target, setTarget] = reactExports.useState(null);
  const [croppedBlob, setCroppedBlob] = reactExports.useState(null);
  const [croppedUrl, setCroppedUrl] = reactExports.useState(null);
  const [draftRect, setDraftRect] = reactExports.useState(null);
  const [draftLasso, setDraftLasso] = reactExports.useState(null);
  const croppedUrlRef = reactExports.useRef(null);
  croppedUrlRef.current = croppedUrl;
  reactExports.useEffect(() => {
    return () => {
      if (croppedUrlRef.current) URL.revokeObjectURL(croppedUrlRef.current);
    };
  }, []);
  const clearSelection = reactExports.useCallback(() => {
    setSource(null);
    setTarget(null);
    setCroppedBlob(null);
    if (croppedUrlRef.current) {
      URL.revokeObjectURL(croppedUrlRef.current);
      croppedUrlRef.current = null;
    }
    setCroppedUrl(null);
    setDraftRect(null);
    setDraftLasso(null);
    setStatus("selecting");
  }, []);
  const commitRectSelection = reactExports.useCallback(
    async (bbox) => {
      const clamped = clampBboxToImage(bbox, imageWidth, imageHeight);
      if (clamped[2] < 4 || clamped[3] < 4) return;
      try {
        const blob = await cropObjectByRect(src, clamped);
        const url2 = URL.createObjectURL(blob);
        if (croppedUrlRef.current) URL.revokeObjectURL(croppedUrlRef.current);
        croppedUrlRef.current = url2;
        setSource({
          type: "rect",
          bbox: clamped,
        });
        setTarget(clamped);
        setCroppedBlob(blob);
        setCroppedUrl(url2);
        setDraftRect(null);
        setStatus("positioning");
      } catch (err) {
        console.error("[move-object] rect crop failed:", err);
        setDraftRect(null);
      }
    },
    [src, imageWidth, imageHeight],
  );
  const commitLassoSelection = reactExports.useCallback(
    async (path2) => {
      if (path2.length < 3) {
        setDraftLasso(null);
        return;
      }
      const bbox = bboxFromPath(path2);
      const clamped = clampBboxToImage(bbox, imageWidth, imageHeight);
      if (clamped[2] < 4 || clamped[3] < 4) {
        setDraftLasso(null);
        return;
      }
      try {
        const blob = await cropObjectByLasso(src, path2);
        const url2 = URL.createObjectURL(blob);
        if (croppedUrlRef.current) URL.revokeObjectURL(croppedUrlRef.current);
        croppedUrlRef.current = url2;
        setSource({
          type: "lasso",
          path: path2,
          bbox: clamped,
        });
        setTarget(clamped);
        setCroppedBlob(blob);
        setCroppedUrl(url2);
        setDraftLasso(null);
        setStatus("positioning");
      } catch (err) {
        console.error("[move-object] lasso crop failed:", err);
        setDraftLasso(null);
      }
    },
    [src, imageWidth, imageHeight],
  );
  const setTargetPosition = reactExports.useCallback(
    (x2, y4) => {
      setTarget((prev) => {
        if (!prev) return prev;
        const [, , w3, h2] = prev;
        return clampBboxToImage([x2, y4, w3, h2], imageWidth, imageHeight);
      });
    },
    [imageWidth, imageHeight],
  );
  const hasMoved = reactExports.useCallback(() => {
    if (!source || !target) return false;
    const [tx, ty] = target;
    const [sx, sy] = source.bbox;
    return tx !== sx || ty !== sy;
  }, [source, target]);
  return {
    // tool
    tool: tool2,
    setTool,
    // status
    status,
    setStatus,
    // selection
    source,
    target,
    croppedBlob,
    croppedUrl,
    clearSelection,
    commitRectSelection,
    commitLassoSelection,
    // drafts (in-progress selection preview)
    draftRect,
    setDraftRect,
    draftLasso,
    setDraftLasso,
    // target drag
    setTargetPosition,
    hasMoved,
  };
}
const BAR_GAP$1 = 16;
const BAR_HEIGHT = 40;
const TOP_BAR_MIN_WIDTH$1 = 220;
const BOTTOM_BAR_MIN_WIDTH$1 = 480;
const BOTTOM_BAR_MAX_WIDTH$1 = 720;
const BOTTOM_PANEL_RESERVE = 260;
export const CanvasMoveObjectOverlay = reactExports.memo(function CanvasMoveObjectOverlay2() {
  const { meta: meta2, cancelMoveObject } = useMoveObjectState();
  useCropViewportZoom(meta2, BOTTOM_PANEL_RESERVE + BAR_GAP$1);
  const transform2 = useStore$3((s2) => s2.transform);
  const [vpX, vpY, vpZoom] = transform2;
  const [confirming, setConfirming] = reactExports.useState(false);
  const [resolution, setResolution] = reactExports.useState("2K");
  const editApi = useMoveObjectEdit({
    src: meta2?.src ?? "",
    imageWidth: meta2?.originalWidth ?? 0,
    imageHeight: meta2?.originalHeight ?? 0,
  });
  const {
    tool: tool2,
    setTool,
    status,
    source,
    target,
    croppedUrl,
    clearSelection,
    commitRectSelection,
    commitLassoSelection,
    draftRect,
    setDraftRect,
    draftLasso,
    setDraftLasso,
    setTargetPosition,
    hasMoved,
  } = editApi;
  const imagePos = reactExports.useMemo(() => {
    if (!meta2) return null;
    return {
      x: meta2.nodeFlowX * vpZoom + vpX,
      y: meta2.nodeFlowY * vpZoom + vpY,
      w: meta2.nodeWidth * vpZoom,
      h: meta2.nodeHeight * vpZoom,
    };
  }, [meta2, vpX, vpY, vpZoom]);
  const imageRectRef = reactExports.useRef(null);
  const screenToImage = reactExports.useCallback(
    (clientX, clientY) => {
      const el = imageRectRef.current;
      if (!el || !meta2) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const sx = ((clientX - rect.left) / rect.width) * meta2.originalWidth;
      const sy = ((clientY - rect.top) / rect.height) * meta2.originalHeight;
      return [sx, sy];
    },
    [meta2],
  );
  const drawingRef = reactExports.useRef(null);
  const dragModeRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!meta2) return;
    const onKey = (e2) => {
      if ((e2.metaKey || e2.ctrlKey) && !e2.shiftKey && e2.key.toLowerCase() === "z") {
        if (status === "positioning" || status === "error") {
          e2.preventDefault();
          e2.stopPropagation();
          clearSelection();
        }
      }
      if (e2.key === "Escape") {
        e2.preventDefault();
        e2.stopPropagation();
        cancelMoveObject();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [meta2, status, clearSelection, cancelMoveObject]);
  const handleImagePointerDown = reactExports.useCallback(
    (e2) => {
      if (e2.button !== 0) return;
      e2.preventDefault();
      e2.stopPropagation();
      e2.currentTarget.setPointerCapture(e2.pointerId);
      const pt2 = screenToImage(e2.clientX, e2.clientY);
      if (!pt2) return;
      if ((status === "positioning" || status === "error") && target) {
        const [tx, ty, tw, th] = target;
        if (pt2[0] >= tx && pt2[0] <= tx + tw && pt2[1] >= ty && pt2[1] <= ty + th) {
          dragModeRef.current = {
            offsetX: pt2[0] - tx,
            offsetY: pt2[1] - ty,
          };
          return;
        }
      }
      if (status === "positioning" || status === "error") {
        clearSelection();
      }
      if (tool2 === "rect") {
        drawingRef.current = {
          mode: "rect",
          rectStart: pt2,
        };
        setDraftRect([pt2[0], pt2[1], 0, 0]);
      } else {
        drawingRef.current = {
          mode: "lasso",
          lassoPath: [pt2],
        };
        setDraftLasso([pt2]);
      }
    },
    [tool2, status, target, screenToImage, clearSelection, setDraftRect, setDraftLasso],
  );
  const handleImagePointerMove = reactExports.useCallback(
    (e2) => {
      if (dragModeRef.current && target) {
        const pt22 = screenToImage(e2.clientX, e2.clientY);
        if (!pt22) return;
        setTargetPosition(
          Math.round(pt22[0] - dragModeRef.current.offsetX),
          Math.round(pt22[1] - dragModeRef.current.offsetY),
        );
        return;
      }
      const drawing = drawingRef.current;
      if (!drawing) return;
      const pt2 = screenToImage(e2.clientX, e2.clientY);
      if (!pt2) return;
      if (drawing.mode === "rect" && drawing.rectStart) {
        const [sx, sy] = drawing.rectStart;
        const x2 = Math.min(sx, pt2[0]);
        const y4 = Math.min(sy, pt2[1]);
        const w3 = Math.abs(pt2[0] - sx);
        const h2 = Math.abs(pt2[1] - sy);
        setDraftRect([x2, y4, w3, h2]);
      } else if (drawing.mode === "lasso" && drawing.lassoPath) {
        const last2 = drawing.lassoPath[drawing.lassoPath.length - 1];
        if (last2 && Math.abs(last2[0] - pt2[0]) < 1 && Math.abs(last2[1] - pt2[1]) < 1) return;
        drawing.lassoPath.push(pt2);
        setDraftLasso([...drawing.lassoPath]);
      }
    },
    [target, screenToImage, setDraftRect, setDraftLasso, setTargetPosition],
  );
  const handleImagePointerUp = reactExports.useCallback(
    (e2) => {
      try {
        e2.currentTarget.releasePointerCapture(e2.pointerId);
      } catch {}
      if (dragModeRef.current) {
        dragModeRef.current = null;
        return;
      }
      const drawing = drawingRef.current;
      if (!drawing) return;
      drawingRef.current = null;
      if (drawing.mode === "rect" && drawing.rectStart) {
        const pt2 = screenToImage(e2.clientX, e2.clientY);
        if (!pt2) {
          setDraftRect(null);
          return;
        }
        const [sx, sy] = drawing.rectStart;
        const x2 = Math.min(sx, pt2[0]);
        const y4 = Math.min(sy, pt2[1]);
        const w3 = Math.abs(pt2[0] - sx);
        const h2 = Math.abs(pt2[1] - sy);
        void commitRectSelection([x2, y4, w3, h2]);
      } else if (drawing.mode === "lasso" && drawing.lassoPath) {
        void commitLassoSelection(drawing.lassoPath);
      }
    },
    [screenToImage, commitRectSelection, commitLassoSelection, setDraftRect],
  );
  const handleConfirm = reactExports.useCallback(async () => {
    if (confirming || !meta2 || !source || !target) return;
    if (!hasMoved()) return;
    setConfirming(true);
    try {
      const schematic = await renderSchematic({
        srcImageUrl: meta2.src,
        imageWidth: meta2.originalWidth,
        imageHeight: meta2.originalHeight,
        source: source.bbox,
        target,
      });
      const croppedBlob = editApi.croppedBlob;
      if (!croppedBlob) {
        setConfirming(false);
        return;
      }
      void meta2
        .onConfirm({
          schematic,
          croppedObject: croppedBlob,
          source,
          target: {
            bbox: target,
          },
          resolution,
        })
        .catch(() => {});
      cancelMoveObject();
    } catch (err) {
      console.error("[move-object] schematic render failed:", err);
      setConfirming(false);
    }
  }, [
    confirming,
    meta2,
    source,
    target,
    editApi.croppedBlob,
    resolution,
    cancelMoveObject,
    hasMoved,
  ]);
  if (!meta2 || !imagePos) return null;
  const canRun = (status === "positioning" || status === "error") && hasMoved();
  const hasSelection2 = source !== null;
  const topBarWidth = Math.max(imagePos.w, TOP_BAR_MIN_WIDTH$1);
  const topBarLeft = imagePos.x + (imagePos.w - topBarWidth) / 2;
  const bottomBarWidth = Math.max(
    BOTTOM_BAR_MIN_WIDTH$1,
    Math.min(BOTTOM_BAR_MAX_WIDTH$1, imagePos.w),
  );
  const bottomBarLeft = imagePos.x + (imagePos.w - bottomBarWidth) / 2;
  return (
    <div className="absolute inset-0 z-50 pointer-events-none animate-[crop-panel-in_0.2s_ease-out]">
      <div
        ref={imageRectRef}
        className="absolute pointer-events-auto select-none touch-none"
        style={{
          transform: `translate3d(${imagePos.x}px, ${imagePos.y}px, 0)`,
          width: imagePos.w,
          height: imagePos.h,
          top: 0,
          left: 0,
          willChange: "transform",
          cursor:
            status === "positioning" || status === "error"
              ? target
                ? "move"
                : "crosshair"
              : "crosshair",
        }}
        onPointerDown={handleImagePointerDown}
        onPointerMove={handleImagePointerMove}
        onPointerUp={handleImagePointerUp}
        onPointerCancel={handleImagePointerUp}
        onWheel={(e2) => e2.stopPropagation()}
      >
        <SelectionPreview
          imageWidth={meta2.originalWidth}
          imageHeight={meta2.originalHeight}
          displayWidth={imagePos.w}
          displayHeight={imagePos.h}
          source={source}
          target={target}
          draftRect={draftRect}
          draftLasso={draftLasso}
          src={meta2.src}
          croppedUrl={croppedUrl}
        />
      </div>
      <div
        className="absolute pointer-events-auto flex justify-center"
        style={{
          transform: `translate3d(${topBarLeft}px, ${imagePos.y - BAR_HEIGHT - BAR_GAP$1}px, 0)`,
          width: topBarWidth,
          height: BAR_HEIGHT,
          top: 0,
          left: 0,
          willChange: "transform",
        }}
      >
        <CanvasMoveObjectTopBar
          tool={tool2}
          onToolChange={setTool}
          hasSelection={hasSelection2}
          onUndo={clearSelection}
          onClose={cancelMoveObject}
        />
      </div>
      <div
        className="absolute pointer-events-auto flex justify-center"
        style={{
          transform: `translate3d(${bottomBarLeft}px, ${imagePos.y + imagePos.h + BAR_GAP$1}px, 0)`,
          width: bottomBarWidth,
          top: 0,
          left: 0,
          willChange: "transform",
        }}
      >
        <CanvasMoveObjectPanel
          croppedUrl={croppedUrl}
          canRun={canRun}
          running={confirming}
          onReset={clearSelection}
          onCancel={cancelMoveObject}
          onRun={handleConfirm}
          resolution={resolution}
          onResolutionChange={setResolution}
        />
      </div>
    </div>
  );
});
function SelectionPreview({
  imageWidth,
  imageHeight,
  displayWidth,
  displayHeight,
  source,
  target,
  draftRect,
  draftLasso,
  src,
  croppedUrl,
}) {
  const { t: t2 } = useTranslation();
  const imgToDisplayX = displayWidth / Math.max(1, imageWidth);
  const imgToDisplayY = displayHeight / Math.max(1, imageHeight);
  const sourceRectDisplay = source
    ? toDisplayRect(source.bbox, imgToDisplayX, imgToDisplayY)
    : null;
  const targetRectDisplay = target ? toDisplayRect(target, imgToDisplayX, imgToDisplayY) : null;
  const draftRectDisplay = draftRect
    ? toDisplayRect(draftRect, imgToDisplayX, imgToDisplayY)
    : null;
  const lassoPolylineDisplay = reactExports.useMemo(() => {
    const path2 = draftLasso ?? (source?.type === "lasso" ? source.path : null);
    if (!path2) return null;
    return path2.map(([x2, y4]) => `${x2 * imgToDisplayX},${y4 * imgToDisplayY}`).join(" ");
  }, [draftLasso, source, imgToDisplayX, imgToDisplayY]);
  const SOURCE_FILL = "rgba(82, 166, 255, 0.28)";
  const SOURCE_STROKE = "#52A6FF";
  return (
    <>
      <svg
        className="pointer-events-none absolute left-0 top-0"
        width={displayWidth}
        height={displayHeight}
        viewBox={`0 0 ${displayWidth} ${displayHeight}`}
        role="img"
        aria-label={t2("a11y.moveObjectGuides", "Move object selection guides")}
      >
        {draftRectDisplay && (
          <rect
            x={draftRectDisplay[0]}
            y={draftRectDisplay[1]}
            width={draftRectDisplay[2]}
            height={draftRectDisplay[3]}
            fill={SOURCE_FILL}
            stroke={SOURCE_STROKE}
            strokeWidth={1.5}
          />
        )}
        {draftLasso && lassoPolylineDisplay && (
          <polygon
            points={lassoPolylineDisplay}
            fill={SOURCE_FILL}
            stroke={SOURCE_STROKE}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        )}
        {sourceRectDisplay &&
          source &&
          !draftRectDisplay &&
          !draftLasso &&
          (source.type === "rect" ? (
            <rect
              x={sourceRectDisplay[0]}
              y={sourceRectDisplay[1]}
              width={sourceRectDisplay[2]}
              height={sourceRectDisplay[3]}
              fill="none"
              stroke={MOVE_OBJECT_SOURCE_COLOR}
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
          ) : (
            lassoPolylineDisplay && (
              <polygon
                points={lassoPolylineDisplay}
                fill="none"
                stroke={MOVE_OBJECT_SOURCE_COLOR}
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
            )
          ))}
        {targetRectDisplay && sourceRectDisplay && (
          <>
            <rect
              x={targetRectDisplay[0]}
              y={targetRectDisplay[1]}
              width={targetRectDisplay[2]}
              height={targetRectDisplay[3]}
              fill="none"
              stroke={MOVE_OBJECT_TARGET_COLOR}
              strokeWidth={1.75}
            />
            <line
              x1={sourceRectDisplay[0] + sourceRectDisplay[2] / 2}
              y1={sourceRectDisplay[1] + sourceRectDisplay[3] / 2}
              x2={targetRectDisplay[0] + targetRectDisplay[2] / 2}
              y2={targetRectDisplay[1] + targetRectDisplay[3] / 2}
              stroke="#FFFFFF"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
          </>
        )}
      </svg>
      {targetRectDisplay && croppedUrl && (
        <img
          src={croppedUrl}
          alt=""
          className="pointer-events-none absolute"
          style={{
            left: targetRectDisplay[0],
            top: targetRectDisplay[1],
            width: targetRectDisplay[2],
            height: targetRectDisplay[3],
            opacity: 0.85,
          }}
          draggable={false}
        />
      )}
      <span hidden={true} aria-hidden="true">
        {src}
      </span>
    </>
  );
}
function toDisplayRect(bbox, scaleX, scaleY) {
  return [
    Math.round(bbox[0] * scaleX),
    Math.round(bbox[1] * scaleY),
    Math.round(bbox[2] * scaleX),
    Math.round(bbox[3] * scaleY),
  ];
}
const DEFAULT_IMAGE_OFFSET = {
  x: 0,
  y: 0,
};
const OUTPAINT_SCALE_OPTIONS = [1, 1.5, 2, 3, 4];
const MAX_OUTPAINT_OUTPUT_LONGEST = 8e3;
function isOutpaintScaleAllowed(longestPx, scale2) {
  if (scale2 === 1) return true;
  return longestPx * scale2 <= MAX_OUTPAINT_OUTPUT_LONGEST;
}
function scaleRectAroundCenter(rect, scale2) {
  if (scale2 === 1) return rect;
  const cx2 = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const width = rect.width * scale2;
  const height = rect.height * scale2;
  return clampOutpaintRect({
    x: cx2 - width / 2,
    y: cy - height / 2,
    width,
    height,
  });
}
const OUTPAINT_STYLE_PRESETS = [
  "general",
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "twitter",
];
const OUTPAINT_PRESET_ITEMS = {
  general: [
    {
      id: "general:original",
      ratio: null,
      ratioLabel: "Original",
      ratioLabelKey: "canvas.outpaintRatio.original",
    },
    {
      id: "general:1:1",
      ratio: 1,
      ratioLabel: "1:1",
    },
    {
      id: "general:3:4",
      ratio: 3 / 4,
      ratioLabel: "3:4",
    },
    {
      id: "general:2:3",
      ratio: 2 / 3,
      ratioLabel: "2:3",
    },
    {
      id: "general:9:16",
      ratio: 9 / 16,
      ratioLabel: "9:16",
    },
    {
      id: "general:4:3",
      ratio: 4 / 3,
      ratioLabel: "4:3",
    },
    {
      id: "general:3:2",
      ratio: 3 / 2,
      ratioLabel: "3:2",
    },
    {
      id: "general:16:9",
      ratio: 16 / 9,
      ratioLabel: "16:9",
    },
    {
      id: "general:4:5",
      ratio: 4 / 5,
      ratioLabel: "4:5",
    },
    {
      id: "general:5:4",
      ratio: 5 / 4,
      ratioLabel: "5:4",
    },
  ],
  instagram: [
    {
      id: "instagram:square",
      ratio: 1,
      ratioLabel: "1:1",
      useCase: "Square",
      useCaseKey: "canvas.outpaintRatio.square",
    },
    {
      id: "instagram:reel",
      ratio: 9 / 16,
      ratioLabel: "9:16",
      useCase: "Story",
      useCaseKey: "canvas.outpaintRatio.story",
    },
    {
      id: "instagram:portrait",
      ratio: 4 / 5,
      ratioLabel: "4:5",
      useCase: "Portrait",
      useCaseKey: "canvas.outpaintRatio.portrait",
    },
    {
      id: "instagram:landscape",
      ratio: 1.91,
      ratioLabel: "1.91:1",
      useCase: "Landscape",
      useCaseKey: "canvas.outpaintRatio.landscape",
    },
    {
      id: "instagram:profile",
      ratio: 1,
      ratioLabel: "1:1",
      useCase: "Profile",
      useCaseKey: "canvas.outpaintRatio.profile",
    },
  ],
  facebook: [
    {
      id: "facebook:story",
      ratio: 9 / 16,
      ratioLabel: "9:16",
      useCase: "Story",
      useCaseKey: "canvas.outpaintRatio.story",
    },
    {
      id: "facebook:post",
      ratio: 1.91,
      ratioLabel: "1.91:1",
      useCase: "Post",
      useCaseKey: "canvas.outpaintRatio.post",
    },
    {
      id: "facebook:profile",
      ratio: 1,
      ratioLabel: "1:1",
      useCase: "Profile",
      useCaseKey: "canvas.outpaintRatio.profile",
    },
  ],
  tiktok: [
    {
      id: "tiktok:video",
      ratio: 9 / 16,
      ratioLabel: "9:16",
      useCase: "Video",
      useCaseKey: "canvas.outpaintRatio.video",
    },
  ],
  linkedin: [
    {
      id: "linkedin:post",
      ratio: 1.91,
      ratioLabel: "1.91:1",
      useCase: "Post",
      useCaseKey: "canvas.outpaintRatio.post",
    },
    {
      id: "linkedin:profile",
      ratio: 1,
      ratioLabel: "1:1",
      useCase: "Profile",
      useCaseKey: "canvas.outpaintRatio.profile",
    },
  ],
  twitter: [
    {
      id: "twitter:cover",
      ratio: 3,
      ratioLabel: "3:1",
      useCase: "Cover Photo",
      useCaseKey: "canvas.outpaintRatio.cover",
    },
    {
      id: "twitter:landscape",
      ratio: 2,
      ratioLabel: "2:1",
      useCase: "Landscape",
      useCaseKey: "canvas.outpaintRatio.landscape",
    },
    {
      id: "twitter:profile",
      ratio: 1,
      ratioLabel: "1:1",
      useCase: "Profile",
      useCaseKey: "canvas.outpaintRatio.profile",
    },
  ],
};
const DEFAULT_OUTPAINT_ITEM_ID = "general:original";
const MAX_OUTPAINT_HALF = 1.5;
const DEFAULT_OUTPAINT = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};
function clampOutpaintRect(r2) {
  const x2 = clamp$6(r2.x, -MAX_OUTPAINT_HALF, 0);
  const y4 = clamp$6(r2.y, -MAX_OUTPAINT_HALF, 0);
  const right = clamp$6(r2.x + r2.width, 1, 1 + MAX_OUTPAINT_HALF);
  const bottom = clamp$6(r2.y + r2.height, 1, 1 + MAX_OUTPAINT_HALF);
  return {
    x: x2,
    y: y4,
    width: right - x2,
    height: bottom - y4,
  };
}
function clampImageOffset(rect, offset2) {
  const xMin = rect.x;
  const xMax = rect.x + rect.width - 1;
  const yMin = rect.y;
  const yMax = rect.y + rect.height - 1;
  return {
    x: clamp$6(offset2.x, xMin, xMax),
    y: clamp$6(offset2.y, yMin, yMax),
  };
}
function calcOutpaintRect({ initialRect, deltaX, deltaY, handle: handle2 }) {
  if (handle2 === null) return initialRect;
  const { x: ix, y: iy, width: iw, height: ih } = initialRect;
  let left = ix;
  let top2 = iy;
  let right = ix + iw;
  let bottom = iy + ih;
  const movesLeft = handle2 === "tl" || handle2 === "bl" || handle2 === "l";
  const movesRight = handle2 === "tr" || handle2 === "br" || handle2 === "r";
  const movesTop = handle2 === "tl" || handle2 === "tr" || handle2 === "t";
  const movesBottom = handle2 === "bl" || handle2 === "br" || handle2 === "b";
  if (movesLeft) left += deltaX;
  if (movesRight) right += deltaX;
  if (movesTop) top2 += deltaY;
  if (movesBottom) bottom += deltaY;
  return clampOutpaintRect({
    x: left,
    y: top2,
    width: right - left,
    height: bottom - top2,
  });
}
function calcOutpaintRectMove({ initialRect, deltaX, deltaY }) {
  const xMin = Math.max(-MAX_OUTPAINT_HALF, 1 - initialRect.width);
  const xMax = Math.min(0, 1 + MAX_OUTPAINT_HALF - initialRect.width);
  const yMin = Math.max(-MAX_OUTPAINT_HALF, 1 - initialRect.height);
  const yMax = Math.min(0, 1 + MAX_OUTPAINT_HALF - initialRect.height);
  return {
    x: clamp$6(initialRect.x + deltaX, xMin, xMax),
    y: clamp$6(initialRect.y + deltaY, yMin, yMax),
    width: initialRect.width,
    height: initialRect.height,
  };
}
function outpaintRectForAspectRatio(ratio, imageAspect) {
  if (ratio == null) return DEFAULT_OUTPAINT;
  const normRatio = ratio / imageAspect;
  let width;
  let height;
  if (normRatio >= 1) {
    height = 1;
    width = normRatio;
  } else {
    width = 1;
    height = 1 / normRatio;
  }
  const x2 = 0.5 - width / 2;
  const y4 = 0.5 - height / 2;
  return clampOutpaintRect({
    x: x2,
    y: y4,
    width,
    height,
  });
}
function rectToPixelParams(rect, offset2, originalWidth, originalHeight) {
  const targetWidth = Math.round(rect.width * originalWidth);
  const targetHeight = Math.round(rect.height * originalHeight);
  const offsetX = Math.round((-rect.x + offset2.x) * originalWidth);
  const offsetY = Math.round((-rect.y + offset2.y) * originalHeight);
  return {
    targetWidth,
    targetHeight,
    offsetX,
    offsetY,
  };
}
const RESOLUTION_OPTIONS = ["1K", "2K", "4K"];
const RATIO_ICON_MAX = 14;
const CanvasOutpaintPanel = reactExports.memo(function CanvasOutpaintPanel2({
  preset: preset2,
  onPresetChange,
  selectedItemId,
  onSelectItem,
  scale: scale2,
  onScaleChange,
  disabledScales,
  resolution,
  onResolutionChange,
  onCancel,
  onConfirm,
  confirming,
}) {
  const { t: t2 } = useTranslation();
  const creditCost = useImageEditCost("outpaint", resolution);
  const items = OUTPAINT_PRESET_ITEMS[preset2];
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stops propagation so panel events don't reach the canvas pan/zoom handlers
    <div
      className="flex w-[260px] flex-col rounded-lg border"
      style={{
        background: "var(--canvas-controls-bg, #ffffff)",
        borderColor: "var(--canvas-controls-border, #0000000f)",
        boxShadow: "var(--canvas-shadow-dropdown)",
      }}
      onPointerDown={(e2) => e2.stopPropagation()}
      onWheel={(e2) => e2.stopPropagation()}
      onContextMenu={(e2) => e2.stopPropagation()}
    >
      <div
        className="flex h-11 items-center px-4"
        style={{
          color: "var(--canvas-controls-text, #262626)",
        }}
      >
        <span className="flex-1 font-heading text-[13px] font-medium">{t2("canvas.outpaint")}</span>
      </div>
      <div className="flex flex-col px-4 pb-2">
        <div
          className="flex h-8 items-center text-[13px]"
          style={{
            color: "var(--canvas-controls-text-muted, #737373)",
          }}
        >
          {t2("canvas.outpaintScale")}
        </div>
        <Dropdown$1
          value={`${scale2}x`}
          options={OUTPAINT_SCALE_OPTIONS.map((s2) => ({
            label: `${s2}x`,
            value: s2,
            disabled: disabledScales?.has(s2),
          }))}
          onChange={(v2) => onScaleChange(v2)}
        />
      </div>
      <div className="flex items-center justify-between px-4 pb-2 pt-1">
        <span
          className="text-[13px]"
          style={{
            color: "var(--canvas-controls-text-muted, #737373)",
          }}
        >
          {t2("canvas.outpaintResolution")}
        </span>
        <div className="w-[120px]">
          <Dropdown$1
            value={resolution}
            options={RESOLUTION_OPTIONS.map((r2) => ({
              label: r2,
              value: r2,
            }))}
            onChange={(v2) => onResolutionChange(v2)}
          />
        </div>
      </div>
      <div className="flex items-center justify-between px-4 pb-2 pt-1">
        <span
          className="text-[13px]"
          style={{
            color: "var(--canvas-controls-text-muted, #737373)",
          }}
        >
          {t2("canvas.outpaintPreset")}
        </span>
        <div className="w-[120px]">
          <Dropdown$1
            value={t2(`canvas.outpaintStylePreset.${preset2}`, defaultPresetLabel(preset2))}
            options={OUTPAINT_STYLE_PRESETS.map((p3) => ({
              label: t2(`canvas.outpaintStylePreset.${p3}`, defaultPresetLabel(p3)),
              value: p3,
            }))}
            onChange={(v2) => onPresetChange(v2)}
          />
        </div>
      </div>
      <div className="autohide-scrollbar flex max-h-[320px] flex-col overflow-y-auto px-4 pb-1">
        {items.map((item) => (
          <RatioRow
            key={item.id}
            item={item}
            selected={selectedItemId === item.id}
            onClick={() => onSelectItem(item)}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-md transition-colors duration-150"
          aria-label={t2("common.cancel")}
          title={t2("common.cancel")}
          style={{
            color: "var(--canvas-controls-text, #262626)",
            background: "transparent",
          }}
          onMouseEnter={(e2) => {
            e2.currentTarget.style.background = "var(--canvas-controls-hover, #0000000d)";
          }}
          onMouseLeave={(e2) => {
            e2.currentTarget.style.background = "transparent";
          }}
        >
          <CloseIcon$1 />
        </button>
        <div className="flex items-center gap-1.5">
          {!confirming && <CreditCostBadge cost={creditCost} compact={true} />}
          <button
            type="button"
            disabled={confirming}
            onClick={onConfirm}
            className="inline-flex size-8 items-center justify-center rounded-md transition-colors duration-150 disabled:opacity-50"
            aria-label={confirming ? t2("canvas.outpainting") : t2("canvas.outpaintGenerate")}
            title={confirming ? t2("canvas.outpainting") : t2("canvas.outpaintGenerate")}
            style={{
              background: "var(--canvas-primary-btn-bg, #000000d9)",
              color: "var(--canvas-primary-btn-icon, #ffffff)",
            }}
            onMouseEnter={(e2) => {
              if (!confirming) {
                e2.currentTarget.style.opacity = "0.9";
              }
            }}
            onMouseLeave={(e2) => {
              e2.currentTarget.style.opacity = "1";
            }}
          >
            <SendArrowIcon />
          </button>
        </div>
      </div>
    </div>
  );
});
function defaultPresetLabel(p3) {
  switch (p3) {
    case "general":
      return "General";
    case "instagram":
      return "Instagram";
    case "facebook":
      return "Facebook";
    case "tiktok":
      return "TikTok";
    case "linkedin":
      return "LinkedIn";
    case "twitter":
      return "Twitter";
  }
}
function Dropdown$1({ value, options, onChange }) {
  const [open, setOpen] = reactExports.useState(false);
  const triggerRef = reactExports.useRef(null);
  const popoverRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!open) return;
    const onPointerDown2 = (e2) => {
      const target = e2.target;
      if (
        target &&
        !triggerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
        e2.stopPropagation();
      }
    };
    const onKey = (e2) => {
      if (e2.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown2, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown2, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v2) => !v2)}
        className="flex h-8 w-full items-center justify-between rounded-md border px-2.5 text-[13px] transition-colors duration-150"
        style={{
          background: "transparent",
          color: "var(--canvas-controls-text, #262626)",
          borderColor: "var(--canvas-controls-border, #0000000f)",
        }}
      >
        <span className="text-[13px]">{value}</span>
        <ChevronDownIcon
          className={open ? "rotate-180 transition-transform" : "transition-transform"}
        />
      </button>
      {open && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-[calc(100%+4px)] z-10 w-full rounded-lg border p-1"
          style={{
            background: "var(--canvas-controls-bg, #ffffff)",
            borderColor: "var(--canvas-controls-border, #0000000f)",
            boxShadow: "var(--canvas-shadow-dropdown)",
          }}
        >
          {options.map((opt) => (
            <DropdownItem
              key={String(opt.value)}
              label={opt.label}
              selected={opt.label === value}
              disabled={opt.disabled}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
function DropdownItem({ label, selected: selected2, disabled: disabled2, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled2}
      className="flex h-8 w-full items-center justify-between rounded-md border px-2.5 text-left text-[13px] transition-colors duration-150 disabled:cursor-not-allowed"
      style={{
        color: disabled2
          ? "var(--canvas-controls-text-muted, #737373)"
          : "var(--canvas-controls-text, #262626)",
        background: selected2 ? "var(--canvas-controls-active, #2626261a)" : "transparent",
        borderColor: selected2 ? "var(--canvas-controls-text, #262626)" : "transparent",
        opacity: disabled2 ? 0.5 : 0.7,
      }}
      onMouseEnter={(e2) => {
        if (disabled2) return;
        e2.currentTarget.style.opacity = "1";
      }}
      onMouseLeave={(e2) => {
        if (disabled2) return;
        e2.currentTarget.style.opacity = "0.7";
      }}
    >
      <span>{label}</span>
      {selected2 && !disabled2 && <CheckIcon className="size-4" />}
    </button>
  );
}
function RatioRow({ item, selected: selected2, onClick }) {
  const { t: t2 } = useTranslation();
  const ratioLabel = item.ratioLabelKey ? t2(item.ratioLabelKey) : item.ratioLabel;
  const useCase = item.useCaseKey ? t2(item.useCaseKey) : item.useCase;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-8 items-center gap-2 rounded-md pl-[30px] pr-2 transition-colors duration-150"
      style={{
        color: "var(--canvas-controls-text, #262626)",
        background: selected2 ? "var(--canvas-controls-active, #2626261a)" : "transparent",
      }}
      onMouseEnter={(e2) => {
        if (selected2) return;
        e2.currentTarget.style.background = "var(--canvas-controls-hover, #0000000d)";
      }}
      onMouseLeave={(e2) => {
        if (selected2) return;
        e2.currentTarget.style.background = "transparent";
      }}
    >
      {selected2 && <CheckIcon className="absolute left-2 size-4" />}
      <span
        className="flex size-[22px] shrink-0 items-center justify-center"
        style={{
          background: "var(--canvas-controls-hover, #0000000d)",
        }}
      >
        <RatioGlyph ratio={item.ratio} />
      </span>
      <span className="flex-1 truncate text-left text-[13px]">{ratioLabel}</span>
      {useCase && (
        <span
          className="shrink-0 text-[12px]"
          style={{
            color: "var(--canvas-controls-text-muted, #737373)",
          }}
        >
          {useCase}
        </span>
      )}
    </button>
  );
}
function RatioGlyph({ ratio }) {
  if (ratio == null) {
    return <FrameCornersIcon />;
  }
  const w3 = ratio >= 1 ? RATIO_ICON_MAX : RATIO_ICON_MAX * ratio;
  const h2 = ratio >= 1 ? RATIO_ICON_MAX / ratio : RATIO_ICON_MAX;
  return (
    <span
      className="block border"
      style={{
        width: w3,
        height: h2,
        borderColor: "var(--canvas-controls-text-muted, #737373)",
      }}
    />
  );
}
function CheckIcon({ className }) {
  return (
    <CompositedSvg
      opacity={0.9}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.942 6.498a.75.75 0 0 1 1.116 1.004l-9 10a.75.75 0 0 1-1.088.028l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.94 3.94z" />
    </CompositedSvg>
  );
}
function ChevronDownIcon({ className }) {
  return (
    <CompositedSvg
      opacity={0.9}
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      style={{
        color: "var(--canvas-controls-text-muted, #737373)",
      }}
    >
      <path d="M15.47 9.47a.75.75 0 1 1 1.06 1.06l-2.94 2.94a2.25 2.25 0 0 1-3.18 0l-2.94-2.94a.75.75 0 1 1 1.06-1.06l2.94 2.94a.75.75 0 0 0 1.06 0z" />
    </CompositedSvg>
  );
}
function FrameCornersIcon() {
  const corner = {
    width: 4,
    height: 4,
    borderColor: "var(--canvas-controls-text-muted, #737373)",
  };
  return (
    <span className="relative block size-[14px]">
      <span
        className="absolute left-0 top-0 [border-left-width:var(--control-border-width)] [border-top-width:var(--control-border-width)]"
        style={corner}
      />
      <span
        className="absolute right-0 top-0 [border-right-width:var(--control-border-width)] [border-top-width:var(--control-border-width)]"
        style={corner}
      />
      <span
        className="absolute bottom-0 left-0 [border-bottom-width:var(--control-border-width)] [border-left-width:var(--control-border-width)]"
        style={corner}
      />
      <span
        className="absolute bottom-0 right-0 [border-bottom-width:var(--control-border-width)] [border-right-width:var(--control-border-width)]"
        style={corner}
      />
    </span>
  );
}
const DEFAULT_RATIO_ITEM =
  OUTPAINT_PRESET_ITEMS.general.find((it2) => it2.id === DEFAULT_OUTPAINT_ITEM_ID) ?? null;
function useImageOutpaint(containerWidth, containerHeight, imageAspect) {
  const [outpaintRect, setOutpaintRect] = reactExports.useState(DEFAULT_OUTPAINT);
  const [imageOffset, setImageOffset] = reactExports.useState(DEFAULT_IMAGE_OFFSET);
  const [selectedItem, setSelectedItem] = reactExports.useState(DEFAULT_RATIO_ITEM);
  const [scale2, setScale] = reactExports.useState(1);
  const [isDragging, setIsDragging] = reactExports.useState(false);
  const [activeHandle, setActiveHandle] = reactExports.useState(null);
  const dragRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(null);
  const latestRef = reactExports.useRef({
    containerWidth,
    containerHeight,
  });
  latestRef.current = {
    containerWidth,
    containerHeight,
  };
  const applySelection = reactExports.useCallback(
    (item, s2) => {
      const baseRect = item
        ? outpaintRectForAspectRatio(item.ratio, imageAspect)
        : DEFAULT_OUTPAINT;
      const nextRect = scaleRectAroundCenter(baseRect, s2);
      setOutpaintRect(nextRect);
      setImageOffset(clampImageOffset(nextRect, DEFAULT_IMAGE_OFFSET));
    },
    [imageAspect],
  );
  const handleMove = reactExports.useCallback((e2) => {
    const drag2 = dragRef.current;
    if (!drag2) return;
    const { containerWidth: cw, containerHeight: ch } = latestRef.current;
    if (!cw || !ch) return;
    const deltaX = (e2.clientX - drag2.startX) / cw;
    const deltaY = (e2.clientY - drag2.startY) / ch;
    if (drag2.handle === null) {
      setOutpaintRect(
        calcOutpaintRectMove({
          initialRect: drag2.initialRect,
          deltaX,
          deltaY,
        }),
      );
    } else {
      const nextRect = calcOutpaintRect({
        initialRect: drag2.initialRect,
        deltaX,
        deltaY,
        handle: drag2.handle,
      });
      setOutpaintRect(nextRect);
      setImageOffset(clampImageOffset(nextRect, drag2.initialImageOffset));
    }
  }, []);
  reactExports.useEffect(() => {
    if (!isDragging) return;
    let pendingEvent = null;
    const onMove = (e2) => {
      if (e2.cancelable) e2.preventDefault();
      pendingEvent = e2;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (pendingEvent) {
            handleMove(pendingEvent);
            pendingEvent = null;
          }
        });
      }
    };
    const onUp = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pendingEvent) {
        handleMove(pendingEvent);
        pendingEvent = null;
      }
      const wasResizing = dragRef.current?.handle != null;
      setIsDragging(false);
      setActiveHandle(null);
      dragRef.current = null;
      if (wasResizing) {
        setSelectedItem(null);
        setScale(1);
      }
    };
    window.addEventListener("pointermove", onMove, {
      passive: false,
    });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging, handleMove]);
  const handlePointerDown = reactExports.useCallback(
    (e2, handle2 = null) => {
      if (!e2.isPrimary) return;
      if (e2.button !== 0) return;
      e2.stopPropagation();
      e2.preventDefault();
      dragRef.current = {
        startX: e2.clientX,
        startY: e2.clientY,
        initialRect: {
          ...outpaintRect,
        },
        initialImageOffset: {
          ...imageOffset,
        },
        handle: handle2,
      };
      setIsDragging(true);
      setActiveHandle(handle2);
    },
    [outpaintRect, imageOffset],
  );
  const selectItem = reactExports.useCallback(
    (item) => {
      setSelectedItem(item);
      applySelection(item, scale2);
    },
    [applySelection, scale2],
  );
  const selectScale = reactExports.useCallback(
    (next2) => {
      setScale(next2);
      applySelection(selectedItem, next2);
    },
    [applySelection, selectedItem],
  );
  const reset2 = reactExports.useCallback(() => {
    setSelectedItem(DEFAULT_RATIO_ITEM);
    setScale(1);
    setOutpaintRect(DEFAULT_OUTPAINT);
    setImageOffset(DEFAULT_IMAGE_OFFSET);
  }, []);
  return {
    outpaintRect,
    imageOffset,
    selectedItem,
    selectedItemId: selectedItem?.id ?? null,
    scale: scale2,
    isDragging,
    activeHandle,
    handlePointerDown,
    selectItem,
    selectScale,
    setOutpaintRect,
    setImageOffset,
    reset: reset2,
  };
}
const PANEL_GAP = 16;
const PANEL_WIDTH = 260;
const PANEL_MIN_HEIGHT = 480;
export const CanvasOutpaintOverlay = reactExports.memo(function CanvasOutpaintOverlay2() {
  const { meta: meta2, cancelOutpaint, outpaintingNodeId } = useOutpaintState();
  const { onNodeAction } = useCanvasBridge();
  const enterTimeRef = reactExports.useRef(Date.now());
  const appliedRef = reactExports.useRef(false);
  const transform2 = useStore$3((s2) => s2.transform);
  const flowDomNode = useStore$3((s2) => s2.domNode);
  const reactFlow = useReactFlow();
  const [vpX, vpY, vpZoom] = transform2;
  const [confirming, setConfirming] = reactExports.useState(false);
  const [preset2, setPreset] = reactExports.useState("general");
  const [resolution, setResolution] = reactExports.useState("2K");
  const imagePos = reactExports.useMemo(() => {
    if (!meta2) return null;
    return {
      x: meta2.nodeFlowX * vpZoom + vpX,
      y: meta2.nodeFlowY * vpZoom + vpY,
      w: meta2.nodeWidth * vpZoom,
      h: meta2.nodeHeight * vpZoom,
    };
  }, [meta2, vpX, vpY, vpZoom]);
  const imageW = imagePos?.w ?? 0;
  const imageH = imagePos?.h ?? 0;
  const imageAspect = reactExports.useMemo(() => {
    if (!meta2) return 1;
    const w3 = meta2.originalWidth || meta2.nodeWidth || 1;
    const h2 = meta2.originalHeight || meta2.nodeHeight || 1;
    return w3 / h2;
  }, [meta2]);
  const {
    outpaintRect,
    imageOffset,
    selectedItem,
    selectedItemId,
    scale: scale2,
    isDragging,
    handlePointerDown,
    selectItem,
    selectScale,
  } = useImageOutpaint(imageW, imageH, imageAspect);
  const handleConfirm = reactExports.useCallback(() => {
    if (appliedRef.current || !meta2) return;
    appliedRef.current = true;
    setConfirming(true);
    const params = rectToPixelParams(
      outpaintRect,
      imageOffset,
      meta2.originalWidth,
      meta2.originalHeight,
    );
    if (onNodeAction && outpaintingNodeId) {
      try {
        onNodeAction({
          nodeId: outpaintingNodeId,
          nodeType: "image",
          action: "outpaint",
          phase: "apply",
          interaction: "opens_mode",
          durationMs: Date.now() - enterTimeRef.current,
          toolSpecific: {
            resolution,
          },
        });
      } catch {}
    }
    void meta2.onConfirm({
      ...params,
      resolution,
    });
    cancelOutpaint();
  }, [
    meta2,
    outpaintRect,
    imageOffset,
    resolution,
    cancelOutpaint,
    onNodeAction,
    outpaintingNodeId,
  ]);
  const trackedCancelOutpaint = reactExports.useCallback(() => {
    if (onNodeAction && outpaintingNodeId && !appliedRef.current) {
      try {
        onNodeAction({
          nodeId: outpaintingNodeId,
          nodeType: "image",
          action: "outpaint",
          phase: "abandon",
          interaction: "opens_mode",
          durationMs: Date.now() - enterTimeRef.current,
          hadProgress:
            preset2 !== "general" ||
            resolution !== "2K" ||
            selectedItemId !== "general:original" ||
            scale2 !== 1 ||
            outpaintRect.x !== DEFAULT_OUTPAINT.x ||
            outpaintRect.y !== DEFAULT_OUTPAINT.y ||
            outpaintRect.width !== DEFAULT_OUTPAINT.width ||
            outpaintRect.height !== DEFAULT_OUTPAINT.height ||
            imageOffset.x !== DEFAULT_IMAGE_OFFSET.x ||
            imageOffset.y !== DEFAULT_IMAGE_OFFSET.y,
        });
      } catch {}
    }
    cancelOutpaint();
  }, [
    onNodeAction,
    outpaintingNodeId,
    preset2,
    resolution,
    selectedItemId,
    scale2,
    outpaintRect,
    imageOffset,
    cancelOutpaint,
  ]);
  reactExports.useEffect(() => {
    const handleKey = (e2) => {
      if (e2.key === "Escape") {
        e2.stopPropagation();
        trackedCancelOutpaint();
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  }, [trackedCancelOutpaint]);
  const handlePresetChange = reactExports.useCallback(
    (next2) => {
      setPreset(next2);
      const items = OUTPAINT_PRESET_ITEMS[next2];
      const first2 = items[0];
      if (first2) selectItem(first2);
    },
    [selectItem],
  );
  const disabledScales = reactExports.useMemo(() => {
    if (!meta2) return new Set();
    const baseRect = selectedItem
      ? outpaintRectForAspectRatio(selectedItem.ratio, imageAspect)
      : outpaintRect;
    const baseLongestPx = Math.max(
      baseRect.width * meta2.originalWidth,
      baseRect.height * meta2.originalHeight,
    );
    const out = new Set();
    for (const s2 of OUTPAINT_SCALE_OPTIONS) {
      if (!isOutpaintScaleAllowed(baseLongestPx, s2)) out.add(s2);
    }
    return out;
  }, [meta2, selectedItem, imageAspect, outpaintRect]);
  reactExports.useEffect(() => {
    if (!disabledScales.has(scale2)) return;
    let fallback = 1;
    for (const s2 of OUTPAINT_SCALE_OPTIONS) {
      if (!disabledScales.has(s2)) fallback = s2;
    }
    selectScale(fallback);
  }, [disabledScales, scale2, selectScale]);
  const rectRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const node2 = rectRef.current;
    if (!node2 || !flowDomNode) return;
    const onWheel = (e2) => {
      e2.preventDefault();
      e2.stopPropagation();
      const viewport = reactFlow.getViewport();
      if (e2.ctrlKey || e2.metaKey) {
        const containerRect = flowDomNode.getBoundingClientRect();
        const px2 = e2.clientX - containerRect.left;
        const py = e2.clientY - containerRect.top;
        const zoomFactor = 2 ** (-e2.deltaY / 100);
        const newZoom = Math.max(
          CANVAS_MIN_ZOOM,
          Math.min(CANVAS_MAX_ZOOM, viewport.zoom * zoomFactor),
        );
        if (newZoom === viewport.zoom) return;
        const flowX = (px2 - viewport.x) / viewport.zoom;
        const flowY = (py - viewport.y) / viewport.zoom;
        reactFlow.setViewport({
          x: px2 - flowX * newZoom,
          y: py - flowY * newZoom,
          zoom: newZoom,
        });
      } else {
        reactFlow.setViewport({
          x: viewport.x - e2.deltaX,
          y: viewport.y - e2.deltaY,
          zoom: viewport.zoom,
        });
      }
    };
    node2.addEventListener("wheel", onWheel, {
      passive: false,
    });
    return () => node2.removeEventListener("wheel", onWheel);
  }, [flowDomNode, reactFlow]);
  const panStateRef = reactExports.useRef(null);
  const handlePanPointerDown = reactExports.useCallback(
    (e2) => {
      if (e2.button !== 1 && e2.button !== 2) return;
      e2.preventDefault();
      e2.stopPropagation();
      e2.currentTarget.setPointerCapture(e2.pointerId);
      panStateRef.current = {
        startX: e2.clientX,
        startY: e2.clientY,
        initial: reactFlow.getViewport(),
      };
    },
    [reactFlow],
  );
  const handlePanPointerMove = reactExports.useCallback(
    (e2) => {
      const state2 = panStateRef.current;
      if (!state2) return;
      e2.preventDefault();
      reactFlow.setViewport({
        x: state2.initial.x + (e2.clientX - state2.startX),
        y: state2.initial.y + (e2.clientY - state2.startY),
        zoom: state2.initial.zoom,
      });
    },
    [reactFlow],
  );
  const handlePanPointerUp = reactExports.useCallback((e2) => {
    if (!panStateRef.current) return;
    if (e2.currentTarget.hasPointerCapture(e2.pointerId)) {
      e2.currentTarget.releasePointerCapture(e2.pointerId);
    }
    panStateRef.current = null;
  }, []);
  const handleContextMenu = reactExports.useCallback((e2) => {
    e2.preventDefault();
  }, []);
  if (!meta2 || !imagePos) return null;
  const px = {
    x: imagePos.x + outpaintRect.x * imagePos.w,
    y: imagePos.y + outpaintRect.y * imagePos.h,
    w: outpaintRect.width * imagePos.w,
    h: outpaintRect.height * imagePos.h,
  };
  const targetPxW = Math.round(outpaintRect.width * meta2.originalWidth);
  const targetPxH = Math.round(outpaintRect.height * meta2.originalHeight);
  const containerW = flowDomNode?.clientWidth ?? window.innerWidth;
  const containerH = flowDomNode?.clientHeight ?? window.innerHeight;
  const panelOnRight = px.x + px.w + PANEL_GAP + PANEL_WIDTH <= containerW;
  const panelX = panelOnRight ? px.x + px.w + PANEL_GAP : px.x - PANEL_GAP - PANEL_WIDTH;
  const panelY = Math.max(8, Math.min(px.y, containerH - 8 - PANEL_MIN_HEIGHT));
  return (
    <div className="absolute inset-0 z-50 pointer-events-none animate-[crop-panel-in_0.2s_ease-out]">
      <div
        ref={rectRef}
        className="absolute pointer-events-auto"
        style={{
          transform: `translate3d(${px.x}px, ${px.y}px, 0)`,
          width: px.w,
          height: px.h,
          top: 0,
          left: 0,
          willChange: "transform",
        }}
        onPointerDown={handlePanPointerDown}
        onPointerMove={handlePanPointerMove}
        onPointerUp={handlePanPointerUp}
        onPointerCancel={handlePanPointerUp}
        onContextMenu={handleContextMenu}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            border: "1px solid var(--canvas-node-border-selected, #141414)",
            opacity: 0.5,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-200"
          style={{
            opacity: isDragging ? 1 : 0,
          }}
        >
          <div
            className="absolute left-0 right-0 top-1/3 h-px"
            style={{
              background: "var(--canvas-node-border-selected, #141414)",
              opacity: 0.3,
            }}
          />
          <div
            className="absolute left-0 right-0 top-2/3 h-px"
            style={{
              background: "var(--canvas-node-border-selected, #141414)",
              opacity: 0.3,
            }}
          />
          <div
            className="absolute bottom-0 left-1/3 top-0 w-px"
            style={{
              background: "var(--canvas-node-border-selected, #141414)",
              opacity: 0.3,
            }}
          />
          <div
            className="absolute bottom-0 left-2/3 top-0 w-px"
            style={{
              background: "var(--canvas-node-border-selected, #141414)",
              opacity: 0.3,
            }}
          />
        </div>
        <CornerHandle position="tl" onPointerDown={handlePointerDown} />
        <CornerHandle position="tr" onPointerDown={handlePointerDown} />
        <CornerHandle position="bl" onPointerDown={handlePointerDown} />
        <CornerHandle position="br" onPointerDown={handlePointerDown} />
        <EdgeHandle position="t" onPointerDown={handlePointerDown} />
        <EdgeHandle position="b" onPointerDown={handlePointerDown} />
        <EdgeHandle position="l" onPointerDown={handlePointerDown} />
        <EdgeHandle position="r" onPointerDown={handlePointerDown} />
        <div
          className="absolute inset-0 cursor-move"
          onPointerDown={(e2) => handlePointerDown(e2, null)}
        />
        <div
          className="absolute left-0 right-0 flex items-center pointer-events-none"
          style={{
            color: "var(--fg-muted, #525252)",
            top: -28 * vpZoom,
            height: 24 * vpZoom,
            gap: 4 * vpZoom,
            fontSize: 13 * vpZoom,
          }}
        >
          <div
            className="flex min-w-0 flex-1 items-center"
            style={{
              gap: 4 * vpZoom,
            }}
          >
            <ImageIcon$1 size={14 * vpZoom} />
            {meta2.name && <span className="truncate">{meta2.name}</span>}
          </div>
          <span
            className="shrink-0 whitespace-nowrap tabular-nums"
            style={{
              fontSize: 11 * vpZoom,
              opacity: 0.8,
            }}
          >
            {targetPxW}
            {" × "}
            {targetPxH}
          </span>
        </div>
      </div>
      <div
        className="absolute z-50 pointer-events-auto"
        style={{
          transform: `translate3d(${panelX}px, ${panelY}px, 0)`,
          top: 0,
          left: 0,
          willChange: "transform",
        }}
      >
        <CanvasOutpaintPanel
          preset={preset2}
          onPresetChange={handlePresetChange}
          selectedItemId={selectedItemId}
          onSelectItem={selectItem}
          scale={scale2}
          onScaleChange={selectScale}
          disabledScales={disabledScales}
          resolution={resolution}
          onResolutionChange={setResolution}
          onCancel={trackedCancelOutpaint}
          onConfirm={handleConfirm}
          confirming={confirming}
        />
      </div>
    </div>
  );
});
