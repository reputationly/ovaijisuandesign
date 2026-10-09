// canvas-move-object-overlay.jsx
import {
  CompositedSvg,
  jsxRuntimeExports,
  reactExports,
  useStore$3,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CloseIcon$1,
  SelectRectIcon,
  SendArrowIcon,
  UndoIcon$1,
} from "./file-missing-icon.jsx";
import { CreditCostBadge } from "../generation/missing-asset-card.jsx";
import { useImageEditCost } from "../media-editing/image-edit-pricing.js";
import { BananaResolutionPicker } from "../media-editing/banana-resolution-picker.jsx";
import { useCropViewportZoom } from "./use-crop-viewport-zoom.js";
import { useMoveObjectState } from "../media-editing/use-start-cloud-edit-from-node.js";

const CanvasMoveObjectPanel = reactExports.memo(
  function CanvasMoveObjectPanel2({
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
              {!running2 && (
                <CreditCostBadge cost={creditCost} compact={true} />
              )}
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
  active: active2,
  onClick,
  title,
  e2eId,
  children: children2,
}) {
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

const CanvasMoveObjectTopBar = reactExports.memo(
  function CanvasMoveObjectTopBar2({
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
  },
);

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
  const { t: t2 } = useTranslation();
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
    const path2 = draftLasso ?? (source?.type === "lasso" ? source.path : null);
    if (!path2) return null;
    return path2
      .map(([x2, y4]) => `${x2 * imgToDisplayX},${y4 * imgToDisplayY}`)
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

export const CanvasMoveObjectOverlay = reactExports.memo(
  function CanvasMoveObjectOverlay2() {
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
        if (
          (e2.metaKey || e2.ctrlKey) &&
          !e2.shiftKey &&
          e2.key.toLowerCase() === "z"
        ) {
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
          if (
            pt2[0] >= tx &&
            pt2[0] <= tx + tw &&
            pt2[1] >= ty &&
            pt2[1] <= ty + th
          ) {
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
      [
        tool2,
        status,
        target,
        screenToImage,
        clearSelection,
        setDraftRect,
        setDraftLasso,
      ],
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
          if (
            last2 &&
            Math.abs(last2[0] - pt2[0]) < 1 &&
            Math.abs(last2[1] - pt2[1]) < 1
          )
            return;
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
    const canRun =
      (status === "positioning" || status === "error") && hasMoved();
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
  },
);
