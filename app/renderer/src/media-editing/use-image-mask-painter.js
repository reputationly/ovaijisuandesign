// use-image-mask-painter.js
import { reactExports } from "../vendor.js";
import { useDevicePixelRatio } from "../infra/shallow-copy.js";

const ERASE_BRUSH_COLOR = "rgb(128, 84, 255)";

const ERASE_MASK_OVERLAY_OPACITY = 0.4;

function paintStrokes(
  ctx,
  strokes,
  imagePxWidth,
  imagePxHeight,
  brushScale,
  fillStyle,
  activeStrokeIndex = -1,
) {
  for (let index2 = 0; index2 < strokes.length; index2++) {
    const stroke = strokes[index2];
    if (stroke.points.length === 0) continue;
    if (stroke.mode === "rect") {
      if (stroke.points.length < 2) continue;
      const [p0, p1] = stroke.points;
      const x2 = Math.min(p0.x, p1.x) * imagePxWidth;
      const y4 = Math.min(p0.y, p1.y) * imagePxHeight;
      const w3 = Math.abs(p1.x - p0.x) * imagePxWidth;
      const h2 = Math.abs(p1.y - p0.y) * imagePxHeight;
      if (w3 <= 0 || h2 <= 0) continue;
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = fillStyle;
      ctx.fillRect(x2, y4, w3, h2);
      ctx.restore();
      continue;
    }
    if (stroke.mode === "lasso") {
      if (index2 === activeStrokeIndex) {
        if (stroke.points.length < 2) continue;
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.beginPath();
        {
          const [first22, ...rest2] = stroke.points;
          ctx.moveTo(first22.x * imagePxWidth, first22.y * imagePxHeight);
          for (const p3 of rest2) {
            ctx.lineTo(p3.x * imagePxWidth, p3.y * imagePxHeight);
          }
        }
        ctx.closePath();
        if (stroke.points.length >= 3) {
          ctx.fillStyle = fillStyle;
          ctx.fill();
        }
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      if (stroke.points.length < 3) continue;
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      const [first2, ...rest] = stroke.points;
      ctx.moveTo(first2.x * imagePxWidth, first2.y * imagePxHeight);
      for (const p3 of rest) {
        ctx.lineTo(p3.x * imagePxWidth, p3.y * imagePxHeight);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      continue;
    }
    const radius = (stroke.size * brushScale) / 2;
    if (radius <= 0) continue;
    ctx.save();
    if (stroke.mode === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "#000000";
      ctx.strokeStyle = "#000000";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = fillStyle;
      ctx.strokeStyle = fillStyle;
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.size * brushScale;
    if (stroke.points.length === 1) {
      const [p3] = stroke.points;
      ctx.beginPath();
      ctx.arc(
        p3.x * imagePxWidth,
        p3.y * imagePxHeight,
        radius,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    } else {
      ctx.beginPath();
      const [first2, ...rest] = stroke.points;
      ctx.moveTo(first2.x * imagePxWidth, first2.y * imagePxHeight);
      for (const p3 of rest) {
        ctx.lineTo(p3.x * imagePxWidth, p3.y * imagePxHeight);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function useImageMaskPainter({
  meta: meta2,
  imagePos,
  onCancel,
  toolApi,
  brushColor = ERASE_BRUSH_COLOR,
  overlayOpacity = ERASE_MASK_OVERLAY_OPACITY,
  onSelectionComplete,
}) {
  const {
    selections,
    draftSelection,
    beginSelection,
    extendSelection,
    endSelection,
  } = toolApi;
  const dpr = useDevicePixelRatio();
  const maskCanvasRef = reactExports.useRef(null);
  const paintRectRef = reactExports.useRef(null);
  const paintingRef = reactExports.useRef(false);
  const lastDrawRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas || !meta2 || !imagePos) return;
    const cssW = imagePos.w;
    const cssH = imagePos.h;
    if (cssW <= 0 || cssH <= 0) return;
    const last2 = lastDrawRef.current;
    const sizeChanged =
      !last2 || last2.cssW !== cssW || last2.cssH !== cssH || last2.dpr !== dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (sizeChanged) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lastDrawRef.current = {
        cssW,
        cssH,
        dpr,
      };
    }
    ctx.clearRect(0, 0, cssW, cssH);
    const brushScale = cssW / meta2.originalWidth;
    const strokes = selections.map((rect) => ({
      size: 0,
      mode: "rect",
      points: [
        {
          x: rect.x1,
          y: rect.y1,
        },
        {
          x: rect.x2,
          y: rect.y2,
        },
      ],
    }));
    paintStrokes(ctx, strokes, cssW, cssH, brushScale, brushColor);
    if (draftSelection) {
      const x2 = draftSelection.x1 * cssW;
      const y4 = draftSelection.y1 * cssH;
      const w3 = (draftSelection.x2 - draftSelection.x1) * cssW;
      const h2 = (draftSelection.y2 - draftSelection.y1) * cssH;
      if (w3 > 0 && h2 > 0) {
        ctx.save();
        ctx.fillStyle = brushColor;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x2, y4, w3, h2);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x2, y4, w3, h2);
        ctx.restore();
      }
    }
  }, [selections, draftSelection, imagePos, meta2, dpr, brushColor]);
  const toNormalised = reactExports.useCallback((e2) => {
    const rect = paintRectRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (e2.clientX - rect.left) / rect.width,
      y: (e2.clientY - rect.top) / rect.height,
    };
  }, []);
  const handlePointerDown = reactExports.useCallback(
    (e2) => {
      if (!e2.isPrimary) return;
      if (e2.button !== 0) return;
      const point2 = toNormalised(e2);
      if (!point2) return;
      e2.preventDefault();
      e2.stopPropagation();
      e2.currentTarget.setPointerCapture(e2.pointerId);
      paintingRef.current = true;
      beginSelection(point2);
    },
    [beginSelection, toNormalised],
  );
  const handlePointerMove = reactExports.useCallback(
    (e2) => {
      if (!e2.currentTarget.hasPointerCapture(e2.pointerId)) return;
      const point2 = toNormalised(e2);
      if (!point2) return;
      e2.preventDefault();
      extendSelection(point2);
    },
    [extendSelection, toNormalised],
  );
  const finishStroke = reactExports.useCallback(() => {
    if (!paintingRef.current) return;
    paintingRef.current = false;
    const completed = endSelection();
    if (completed) onSelectionComplete?.(completed);
  }, [endSelection, onSelectionComplete]);
  const handlePointerUp = reactExports.useCallback(
    (e2) => {
      if (e2.currentTarget.hasPointerCapture(e2.pointerId)) {
        e2.currentTarget.releasePointerCapture(e2.pointerId);
      }
      finishStroke();
    },
    [finishStroke],
  );
  const handlePointerCancel = handlePointerUp;
  reactExports.useEffect(() => {
    const onWindowUp = () => finishStroke();
    window.addEventListener("pointerup", onWindowUp);
    window.addEventListener("pointercancel", onWindowUp);
    return () => {
      window.removeEventListener("pointerup", onWindowUp);
      window.removeEventListener("pointercancel", onWindowUp);
    };
  }, [finishStroke]);
  const handleContextMenu = reactExports.useCallback((e2) => {
    e2.preventDefault();
  }, []);
  reactExports.useEffect(() => {
    return void 0;
  }, []);
  reactExports.useEffect(() => {
    const handleKey = (e2) => {
      if (e2.key === "Escape") {
        e2.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  }, [onCancel]);
  reactExports.useEffect(() => {
    const node2 = paintRectRef.current;
    if (!node2) return;
    const onWheel = (e2) => {
      e2.preventDefault();
      e2.stopPropagation();
    };
    node2.addEventListener("wheel", onWheel, {
      passive: false,
    });
    return () => node2.removeEventListener("wheel", onWheel);
  }, []);
  const screenBrushPx = 0;
  const cursorStyle = {
    cursor: "crosshair",
  };
  const backdropPointerDownRef = reactExports.useRef(false);
  const onBackdropPointerDown = reactExports.useCallback((e2) => {
    backdropPointerDownRef.current = e2.target === e2.currentTarget;
  }, []);
  const onBackdropClick = reactExports.useCallback(
    (e2) => {
      if (e2.target === e2.currentTarget && backdropPointerDownRef.current)
        onCancel();
      backdropPointerDownRef.current = false;
    },
    [onCancel],
  );
  return {
    paintRectRef,
    maskCanvasRef,
    paintRectHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onContextMenu: handleContextMenu,
    },
    backdropHandlers: {
      onPointerDown: onBackdropPointerDown,
      onClick: onBackdropClick,
    },
    screenBrushPx,
    cursorStyle,
    maskOverlayOpacity: overlayOpacity,
  };
}
