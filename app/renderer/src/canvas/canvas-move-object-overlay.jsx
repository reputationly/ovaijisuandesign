// ==== 逐文件收敛 ====
import { resolution } from "../canvas-v3/ui-components.js";
// canvas-move-object-overlay.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { CompositedSvg } from "../media-editing/icon-compositing.js";
import { useStore } from "../vendor-fork/xyflow/react/index.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CloseIcon,
  SelectRectIcon,
  SendArrowIcon,
  UndoIcon,
} from "./file-missing-icon.jsx";
import { CreditCostBadge } from "../generation/missing-asset-card.jsx";
import { useImageEditCost } from "../media-editing/image-edit-pricing.js";
import { BananaResolutionPicker } from "../media-editing/banana-resolution-picker.jsx";
import { useCropViewportZoom } from "./use-crop-viewport-zoom.js";
import { useMoveObjectState } from "../media-editing/use-start-cloud-edit-from-node.js";
import { BAR_GAP } from "./bar-gap.jsx";
const CanvasMoveObjectPanel = reactExports.memo(
  function CanvasMoveObjectPanel({
    croppedUrl,
    canRun,
    running,
    onReset,
    onCancel,
    onRun,
    resolution: resolution2,
    onResolutionChange,
  }) {
    const { t: translate } = useTranslation();
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
        onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
        onWheel={(wheelEvent) => wheelEvent.stopPropagation()}
        onContextMenu={(contextMenuEvent) => contextMenuEvent.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="font-heading text-[13px] font-medium">
            {translate("canvas.moveObject.title")}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              title={translate("canvas.moveObject.reset")}
              aria-label={translate("canvas.moveObject.reset")}
              data-action-ui-id="move-object.reset"
              onClick={onReset}
              disabled={!croppedUrl || running}
              className="flex h-7 w-7 items-center justify-center rounded-md transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                color: "var(--canvas-controls-text, #fff)",
                opacity: 0.7,
              }}
              onMouseEnter={(mouseEvent) => {
                if (!croppedUrl || running) return;
                mouseEvent.currentTarget.style.opacity = "1";
              }}
              onMouseLeave={(mouseEvent) => {
                if (!croppedUrl || running) return;
                mouseEvent.currentTarget.style.opacity = "0.7";
              }}
            >
              <UndoIcon />
            </button>
            <button
              type="button"
              title={translate("canvas.close")}
              aria-label={translate("canvas.close")}
              onClick={onCancel}
              disabled={running}
              className="flex h-7 w-7 items-center justify-center rounded-md transition-opacity duration-150 disabled:cursor-not-allowed"
              style={{
                color: "var(--canvas-controls-text, #fff)",
                opacity: running ? 0.4 : 0.7,
              }}
              onMouseEnter={(mouseEvent) => {
                if (running) return;
                mouseEvent.currentTarget.style.opacity = "1";
              }}
              onMouseLeave={(mouseEvent) => {
                if (running) return;
                mouseEvent.currentTarget.style.opacity = "0.7";
              }}
            >
              <CloseIcon />
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
            {translate("canvas.moveObject.objectSelection")}
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
                  alt={translate("canvas.moveObject.thumbnailAlt")}
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
                  {translate("canvas.moveObject.empty")}
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
              {translate("canvas.moveObject.hint.editObject")}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <BananaResolutionPicker
            value={resolution}
            onChange={onResolutionChange}
            disabled={running}
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={running}
              data-action-ui-id="move-object.cancel"
              className="flex size-8 items-center justify-center rounded-md transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={translate("common.cancel")}
              title={translate("common.cancel")}
              style={{
                color: "var(--canvas-controls-text, #fff)",
                background: "transparent",
                opacity: running ? 0.4 : 0.7,
              }}
              onMouseEnter={(mouseEvent) => {
                if (running) return;
                mouseEvent.currentTarget.style.opacity = "1";
              }}
              onMouseLeave={(mouseEvent) => {
                if (running) return;
                mouseEvent.currentTarget.style.opacity = "0.7";
              }}
            >
              <CloseIcon />
            </button>
            <div className="flex items-center gap-2">
              {!running && (
                <CreditCostBadge cost={creditCost} compact={true} />
              )}
              <button
                type="button"
                disabled={!canRun || running}
                onClick={onRun}
                data-action-ui-id="move-object.run"
                className="flex size-8 items-center justify-center rounded-md transition-colors duration-150 disabled:opacity-50"
                aria-label={translate("canvas.moveObject.run")}
                title={translate("canvas.moveObject.run")}
                style={{
                  background: "var(--canvas-primary-btn-bg, #000000d9)",
                  color: "var(--canvas-primary-btn-icon, #fff)",
                }}
                onMouseEnter={(mouseEvent) => {
                  if (running || !canRun) return;
                  mouseEvent.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(mouseEvent) => {
                  mouseEvent.currentTarget.style.opacity = "1";
                }}
              >
                <SendArrowIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
function LassoIcon() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
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
function ToolButton({
  active,
  onClick,
  title,
  e2eId,
  children,
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      data-action-ui-id={e2eId}
      className="canvas-toolbar-action"
    >
      {children}
    </button>
  );
}
function IconButton({
  disabled,
  onClick,
  title,
  ariaLabel,
  e2eId,
  children,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      data-action-ui-id={e2eId}
      className="canvas-toolbar-action"
    >
      {children}
    </button>
  );
}
function Divider() {
  return <div className="canvas-toolbar-separator" aria-hidden="true" />;
}
const CanvasMoveObjectTopBar = reactExports.memo(
  function CanvasMoveObjectTopBar({
    tool,
    onToolChange,
    hasSelection,
    onUndo,
    onClose,
  }) {
    const { t: translate } = useTranslation();
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: stops propagation so toolbar events don't reach the canvas pan/zoom handlers
      <div
        className="canvas-toolbar-surface"
        onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
        onWheel={(wheelEvent) => wheelEvent.stopPropagation()}
        onContextMenu={(contextMenuEvent) => contextMenuEvent.stopPropagation()}
        data-canvas-toolbar="true"
        data-density="compact"
      >
        <IconButton
          disabled={false}
          onClick={onClose}
          title={translate("canvas.close")}
          ariaLabel={translate("canvas.close")}
          e2eId="move-object.close"
        >
          <CloseIcon />
        </IconButton>
        <Divider />
        <ToolButton
          active={tool === "rect"}
          onClick={() => onToolChange("rect")}
          title={translate("canvas.moveObject.tool.rect")}
          e2eId="move-object.tool-rect"
        >
          <SelectRectIcon />
        </ToolButton>
        <ToolButton
          active={tool === "lasso"}
          onClick={() => onToolChange("lasso")}
          title={translate("canvas.moveObject.tool.lasso")}
          e2eId="move-object.tool-lasso"
        >
          <LassoIcon />
        </ToolButton>
        <Divider />
        <IconButton
          disabled={!hasSelection}
          onClick={onUndo}
          title={translate("canvas.moveObject.undo")}
          ariaLabel={translate("canvas.moveObject.undo")}
          e2eId="move-object.undo"
        >
          <UndoIcon />
        </IconButton>
      </div>
    );
  },
);
const MOVE_OBJECT_SOURCE_COLOR = "#FF3B30";
const MOVE_OBJECT_TARGET_COLOR = "#34C759";
const MOVE_OBJECT_ARROW_COLOR = "#FFFFFF";
const MOVE_OBJECT_ARROW_SHADOW = "rgba(0, 0, 0, 0.45)";
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}
function canvasToPngBlob(canvas) {
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
  let [bboxLeft, bboxTop, bboxWidth, bboxHeight] = bbox;
  bboxWidth = Math.max(1, Math.min(Math.round(bboxWidth), imageWidth));
  bboxHeight = Math.max(1, Math.min(Math.round(bboxHeight), imageHeight));
  bboxLeft = Math.max(0, Math.min(Math.round(bboxLeft), imageWidth - bboxWidth));
  bboxTop = Math.max(0, Math.min(Math.round(bboxTop), imageHeight - bboxHeight));
  return [bboxLeft, bboxTop, bboxWidth, bboxHeight];
}
function bboxFromPath(path) {
  if (path.length === 0) return [0, 0, 0, 0];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const [pointX, pointY] of path) {
    if (pointX < minX) minX = pointX;
    if (pointY < minY) minY = pointY;
    if (pointX > maxX) maxX = pointX;
    if (pointY > maxY) maxY = pointY;
  }
  return [
    Math.floor(minX),
    Math.floor(minY),
    Math.max(1, Math.ceil(maxX - minX)),
    Math.max(1, Math.ceil(maxY - minY)),
  ];
}
async function cropObjectByRect(srcImageUrl, bbox) {
  const img = await loadImage(srcImageUrl);
  const [sx, sy, sw, sh] = bbox;
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("cropObjectByRect: 2d context unavailable");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvasToPngBlob(canvas);
}
async function cropObjectByLasso(srcImageUrl, path) {
  const img = await loadImage(srcImageUrl);
  const [bx, by, bw, bh] = bboxFromPath(path);
  const canvas = document.createElement("canvas");
  canvas.width = bw;
  canvas.height = bh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("cropObjectByLasso: 2d context unavailable");
  ctx.save();
  ctx.beginPath();
  for (let pointIndex = 0; pointIndex < path.length; pointIndex += 1) {
    const [px, py] = path[pointIndex];
    const relativeX = px - bx;
    const relativeY = py - by;
    if (pointIndex === 0) ctx.moveTo(relativeX, relativeY);
    else ctx.lineTo(relativeX, relativeY);
  }
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, -bx, -by);
  ctx.restore();
  return canvasToPngBlob(canvas);
}
function strokeWidthForImage(imageWidth, imageHeight) {
  const longest = Math.max(imageWidth, imageHeight);
  return Math.max(2, Math.round(longest / 400));
}
async function renderSchematic(params) {
  const { srcImageUrl, imageWidth, imageHeight, source, target } = params;
  const img = await loadImage(srcImageUrl);
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
  const dash = Math.max(8, stroke * 4);
  ctx.setLineDash([dash, dash]);
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
  return canvasToPngBlob(canvas);
}
function useMoveObjectEdit({ src, imageWidth, imageHeight }) {
  const [tool, setTool] = reactExports.useState("rect");
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
        const url = URL.createObjectURL(blob);
        if (croppedUrlRef.current) URL.revokeObjectURL(croppedUrlRef.current);
        croppedUrlRef.current = url;
        setSource({
          type: "rect",
          bbox: clamped,
        });
        setTarget(clamped);
        setCroppedBlob(blob);
        setCroppedUrl(url);
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
    async (path) => {
      if (path.length < 3) {
        setDraftLasso(null);
        return;
      }
      const bbox = bboxFromPath(path);
      const clamped = clampBboxToImage(bbox, imageWidth, imageHeight);
      if (clamped[2] < 4 || clamped[3] < 4) {
        setDraftLasso(null);
        return;
      }
      try {
        const blob = await cropObjectByLasso(src, path);
        const url = URL.createObjectURL(blob);
        if (croppedUrlRef.current) URL.revokeObjectURL(croppedUrlRef.current);
        croppedUrlRef.current = url;
        setSource({
          type: "lasso",
          path,
          bbox: clamped,
        });
        setTarget(clamped);
        setCroppedBlob(blob);
        setCroppedUrl(url);
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
    (targetX, targetY) => {
      setTarget((prev) => {
        if (!prev) return prev;
        const [, , targetWidth, targetHeight] = prev;
        return clampBboxToImage([targetX, targetY, targetWidth, targetHeight], imageWidth, imageHeight);
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
    tool,
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
const ACCOUNT_NAME_MIN_LENGTH = 2;
const BAR_HEIGHT = 40;
const TOP_BAR_MIN_WIDTH = 220;
const BOTTOM_BAR_MIN_WIDTH = 480;
const BOTTOM_BAR_MAX_WIDTH = 720;
const BOTTOM_PANEL_RESERVE = 260;
function toDisplayRect(bbox, scaleX, scaleY) {
  return [
    Math.round(bbox[0] * scaleX),
    Math.round(bbox[1] * scaleY),
    Math.round(bbox[2] * scaleX),
    Math.round(bbox[3] * scaleY),
  ];
}
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
  const { t: translate } = useTranslation();
  const imgToDisplayX = displayWidth / Math.max(1, imageWidth);
  const imgToDisplayY = displayHeight / Math.max(1, imageHeight);
  const sourceRectDisplay = source
    ? toDisplayRect(source.bbox, imgToDisplayX, imgToDisplayY)
    : null;
  const targetRectDisplay = target
    ? toDisplayRect(target, imgToDisplayX, imgToDisplayY)
    : null;
  const draftRectDisplay = draftRect
    ? toDisplayRect(draftRect, imgToDisplayX, imgToDisplayY)
    : null;
  const lassoPolylineDisplay = reactExports.useMemo(() => {
    const path = draftLasso ?? (source?.type === "lasso" ? source.path : null);
    if (!path) return null;
    return path
      .map(([imageX, imageY]) => `${imageX * imgToDisplayX},${imageY * imgToDisplayY}`)
      .join(" ");
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
        aria-label={translate("a11y.moveObjectGuides", "Move object selection guides")}
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
export const CanvasMoveObjectOverlay = reactExports.memo(
  function CanvasMoveObjectOverlay() {
    const { meta, cancelMoveObject } = useMoveObjectState();
    useCropViewportZoom(meta, BOTTOM_PANEL_RESERVE + BAR_GAP);
    const transform = useStore((state) => state.transform);
    const [viewportX, viewportY, vpZoom] = transform;
    const [confirming, setConfirming] = reactExports.useState(false);
    const [resolution, setResolution] = reactExports.useState("2K");
    const editApi = useMoveObjectEdit({
      src: meta?.src ?? "",
      imageWidth: meta?.originalWidth ?? 0,
      imageHeight: meta?.originalHeight ?? 0,
    });
    const {
      tool,
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
      if (!meta) return null;
      return {
        x: meta.nodeFlowX * vpZoom + viewportX,
        y: meta.nodeFlowY * vpZoom + viewportY,
        w: meta.nodeWidth * vpZoom,
        h: meta.nodeHeight * vpZoom,
      };
    }, [meta, viewportX, viewportY, vpZoom]);
    const imageRectRef = reactExports.useRef(null);
    const screenToImage = reactExports.useCallback(
      (clientX, clientY) => {
        const el = imageRectRef.current;
        if (!el || !meta) return null;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return null;
        const sx = ((clientX - rect.left) / rect.width) * meta.originalWidth;
        const sy = ((clientY - rect.top) / rect.height) * meta.originalHeight;
        return [sx, sy];
      },
      [meta],
    );
    const drawingRef = reactExports.useRef(null);
    const dragModeRef = reactExports.useRef(null);
    reactExports.useEffect(() => {
      if (!meta) return;
      const onKey = (keyboardEvent) => {
        if (
          (keyboardEvent.metaKey || keyboardEvent.ctrlKey) &&
          !keyboardEvent.shiftKey &&
          keyboardEvent.key.toLowerCase() === "z"
        ) {
          if (status === "positioning" || status === "error") {
            keyboardEvent.preventDefault();
            keyboardEvent.stopPropagation();
            clearSelection();
          }
        }
        if (keyboardEvent.key === "Escape") {
          keyboardEvent.preventDefault();
          keyboardEvent.stopPropagation();
          cancelMoveObject();
        }
      };
      window.addEventListener("keydown", onKey, true);
      return () => window.removeEventListener("keydown", onKey, true);
    }, [meta, status, clearSelection, cancelMoveObject]);
    const handleImagePointerDown = reactExports.useCallback(
      (pointerEvent) => {
        if (pointerEvent.button !== 0) return;
        pointerEvent.preventDefault();
        pointerEvent.stopPropagation();
        pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
        const pt = screenToImage(pointerEvent.clientX, pointerEvent.clientY);
        if (!pt) return;
        if ((status === "positioning" || status === "error") && target) {
          const [tx, ty, tw, th] = target;
          if (
            pt[0] >= tx &&
            pt[0] <= tx + tw &&
            pt[1] >= ty &&
            pt[1] <= ty + th
          ) {
            dragModeRef.current = {
              offsetX: pt[0] - tx,
              offsetY: pt[1] - ty,
            };
            return;
          }
        }
        if (status === "positioning" || status === "error") {
          clearSelection();
        }
        if (tool === "rect") {
          drawingRef.current = {
            mode: "rect",
            rectStart: pt,
          };
          setDraftRect([pt[0], pt[1], 0, 0]);
        } else {
          drawingRef.current = {
            mode: "lasso",
            lassoPath: [pt],
          };
          setDraftLasso([pt]);
        }
      },
      [
        tool,
        status,
        target,
        screenToImage,
        clearSelection,
        setDraftRect,
        setDraftLasso,
      ],
    );
    const handleImagePointerMove = reactExports.useCallback(
      (pointerEvent) => {
        if (dragModeRef.current && target) {
          const pt = screenToImage(pointerEvent.clientX, pointerEvent.clientY);
          if (!pt) return;
          setTargetPosition(
            Math.round(pt[0] - dragModeRef.current.offsetX),
            Math.round(pt[1] - dragModeRef.current.offsetY),
          );
          return;
        }
        const drawing = drawingRef.current;
        if (!drawing) return;
        const imagePoint = screenToImage(pointerEvent.clientX, pointerEvent.clientY);
        if (!imagePoint) return;
        if (drawing.mode === "rect" && drawing.rectStart) {
          const [sx, sy] = drawing.rectStart;
          const rectLeft = Math.min(sx, imagePoint[0]);
          const rectTop = Math.min(sy, imagePoint[1]);
          const rectWidth = Math.abs(imagePoint[0] - sx);
          const rectHeight = Math.abs(imagePoint[1] - sy);
          setDraftRect([rectLeft, rectTop, rectWidth, rectHeight]);
        } else if (drawing.mode === "lasso" && drawing.lassoPath) {
          const last = drawing.lassoPath[drawing.lassoPath.length - 1];
          if (
            last &&
            Math.abs(last[0] - imagePoint[0]) < 1 &&
            Math.abs(last[1] - imagePoint[1]) < 1
          )
            return;
          drawing.lassoPath.push(imagePoint);
          setDraftLasso([...drawing.lassoPath]);
        }
      },
      [target, screenToImage, setDraftRect, setDraftLasso, setTargetPosition],
    );
    const handleImagePointerUp = reactExports.useCallback(
      (pointerEvent) => {
        try {
          pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
        } catch {}
        if (dragModeRef.current) {
          dragModeRef.current = null;
          return;
        }
        const drawing = drawingRef.current;
        if (!drawing) return;
        drawingRef.current = null;
        if (drawing.mode === "rect" && drawing.rectStart) {
          const pt = screenToImage(pointerEvent.clientX, pointerEvent.clientY);
          if (!pt) {
            setDraftRect(null);
            return;
          }
          const [sx, sy] = drawing.rectStart;
          const rectLeft = Math.min(sx, pt[0]);
          const rectTop = Math.min(sy, pt[1]);
          const rectWidth = Math.abs(pt[0] - sx);
          const rectHeight = Math.abs(pt[1] - sy);
          void commitRectSelection([rectLeft, rectTop, rectWidth, rectHeight]);
        } else if (drawing.mode === "lasso" && drawing.lassoPath) {
          void commitLassoSelection(drawing.lassoPath);
        }
      },
      [screenToImage, commitRectSelection, commitLassoSelection, setDraftRect],
    );
    const handleConfirm = reactExports.useCallback(async () => {
      if (confirming || !meta || !source || !target) return;
      if (!hasMoved()) return;
      setConfirming(true);
      try {
        const schematic = await renderSchematic({
          srcImageUrl: meta.src,
          imageWidth: meta.originalWidth,
          imageHeight: meta.originalHeight,
          source: source.bbox,
          target,
        });
        const croppedBlob = editApi.croppedBlob;
        if (!croppedBlob) {
          setConfirming(false);
          return;
        }
        void meta
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
      meta,
      source,
      target,
      editApi.croppedBlob,
      resolution,
      cancelMoveObject,
      hasMoved,
    ]);
    if (!meta || !imagePos) return null;
    const canRun =
      (status === "positioning" || status === "error") && hasMoved();
    const hasSelection = source !== null;
    const topBarWidth = Math.max(imagePos.w, TOP_BAR_MIN_WIDTH);
    const topBarLeft = imagePos.x + (imagePos.w - topBarWidth) / 2;
    const bottomBarWidth = Math.max(
      BOTTOM_BAR_MIN_WIDTH,
      Math.min(BOTTOM_BAR_MAX_WIDTH, imagePos.w),
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
          onWheel={(wheelEvent) => wheelEvent.stopPropagation()}
        >
          <SelectionPreview
            imageWidth={meta.originalWidth}
            imageHeight={meta.originalHeight}
            displayWidth={imagePos.w}
            displayHeight={imagePos.h}
            source={source}
            target={target}
            draftRect={draftRect}
            draftLasso={draftLasso}
            src={meta.src}
            croppedUrl={croppedUrl}
          />
        </div>
        <div
          className="absolute pointer-events-auto flex justify-center"
          style={{
            transform: `translate3d(${topBarLeft}px, ${imagePos.y - BAR_HEIGHT - BAR_GAP}px, 0)`,
            width: topBarWidth,
            height: BAR_HEIGHT,
            top: 0,
            left: 0,
            willChange: "transform",
          }}
        >
          <CanvasMoveObjectTopBar
            tool={tool}
            onToolChange={setTool}
            hasSelection={hasSelection}
            onUndo={clearSelection}
            onClose={cancelMoveObject}
          />
        </div>
        <div
          className="absolute pointer-events-auto flex justify-center"
          style={{
            transform: `translate3d(${bottomBarLeft}px, ${imagePos.y + imagePos.h + BAR_GAP}px, 0)`,
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
  },
);

const BAR_GAP$4 = 2;
