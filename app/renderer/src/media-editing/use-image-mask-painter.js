// use-image-mask-painter.js
import { reactExports } from "../vendor.js";
import { useDevicePixelRatio } from "../shared/use-device-pixel-ratio.js";

const ERASE_BRUSH_COLOR = "rgb(128, 84, 255)";

const ERASE_MASK_OVERLAY_OPACITY = 0.4;

function paintStrokes(
  context,
  strokes,
  imagePxWidth,
  imagePxHeight,
  brushScale,
  fillStyle,
  activeStrokeIndex = -1,
) {
  for (let index = 0; index < strokes.length; index++) {
    const stroke = strokes[index];
    if (stroke.points.length === 0) continue;
    if (stroke.mode === "rect") {
      if (stroke.points.length < 2) continue;
      const [rectangleStartPoint, rectangleEndPoint] = stroke.points;
      const rectangleLeft = Math.min(rectangleStartPoint.x, rectangleEndPoint.x) * imagePxWidth;
      const rectangleTop = Math.min(rectangleStartPoint.y, rectangleEndPoint.y) * imagePxHeight;
      const rectangleWidth = Math.abs(rectangleEndPoint.x - rectangleStartPoint.x) * imagePxWidth;
      const rectangleHeight = Math.abs(rectangleEndPoint.y - rectangleStartPoint.y) * imagePxHeight;
      if (rectangleWidth <= 0 || rectangleHeight <= 0) continue;
      context.save();
      context.globalCompositeOperation = "source-over";
      context.fillStyle = fillStyle;
      context.fillRect(rectangleLeft, rectangleTop, rectangleWidth, rectangleHeight);
      context.restore();
      continue;
    }
    if (stroke.mode === "lasso") {
      if (index === activeStrokeIndex) {
        if (stroke.points.length < 2) continue;
        context.save();
        context.globalCompositeOperation = "source-over";
        context.beginPath();
        {
          const [activeLassoStartPoint, ...activeLassoRemainingPoints] = stroke.points;
          context.moveTo(activeLassoStartPoint.x * imagePxWidth, activeLassoStartPoint.y * imagePxHeight);
          for (const point of activeLassoRemainingPoints) {
            context.lineTo(point.x * imagePxWidth, point.y * imagePxHeight);
          }
        }
        context.closePath();
        if (stroke.points.length >= 3) {
          context.fillStyle = fillStyle;
          context.fill();
        }
        context.strokeStyle = "#000";
        context.lineWidth = 1.5;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.setLineDash([6, 4]);
        context.stroke();
        context.restore();
        continue;
      }
      if (stroke.points.length < 3) continue;
      context.save();
      context.globalCompositeOperation = "source-over";
      context.fillStyle = fillStyle;
      context.beginPath();
      const [first, ...rest] = stroke.points;
      context.moveTo(first.x * imagePxWidth, first.y * imagePxHeight);
      for (const point of rest) {
        context.lineTo(point.x * imagePxWidth, point.y * imagePxHeight);
      }
      context.closePath();
      context.fill();
      context.restore();
      continue;
    }
    const radius = (stroke.size * brushScale) / 2;
    if (radius <= 0) continue;
    context.save();
    if (stroke.mode === "eraser") {
      context.globalCompositeOperation = "destination-out";
      context.fillStyle = "#000000";
      context.strokeStyle = "#000000";
    } else {
      context.globalCompositeOperation = "source-over";
      context.fillStyle = fillStyle;
      context.strokeStyle = fillStyle;
    }
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = stroke.size * brushScale;
    if (stroke.points.length === 1) {
      const [point] = stroke.points;
      context.beginPath();
      context.arc(
        point.x * imagePxWidth,
        point.y * imagePxHeight,
        radius,
        0,
        Math.PI * 2,
      );
      context.fill();
    } else {
      context.beginPath();
      const [first, ...rest] = stroke.points;
      context.moveTo(first.x * imagePxWidth, first.y * imagePxHeight);
      for (const point of rest) {
        context.lineTo(point.x * imagePxWidth, point.y * imagePxHeight);
      }
      context.stroke();
    }
    context.restore();
  }
}

export function useImageMaskPainter({
  meta,
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
  const canvasPixelRatio = useDevicePixelRatio();
  const maskCanvasRef = reactExports.useRef(null);
  const paintRectRef = reactExports.useRef(null);
  const paintingRef = reactExports.useRef(false);
  const lastDrawRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas || !meta || !imagePos) return;
    const cssW = imagePos.w;
    const cssH = imagePos.h;
    if (cssW <= 0 || cssH <= 0) return;
    const last = lastDrawRef.current;
    const sizeChanged =
      !last || last.cssW !== cssW || last.cssH !== cssH || last.dpr !== canvasPixelRatio;
    const context = canvas.getContext("2d");
    if (!context) return;
    if (sizeChanged) {
      canvas.width = Math.round(cssW * canvasPixelRatio);
      canvas.height = Math.round(cssH * canvasPixelRatio);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      context.setTransform(canvasPixelRatio, 0, 0, canvasPixelRatio, 0, 0);
      lastDrawRef.current = {
        cssW,
        cssH,
        dpr: canvasPixelRatio,
      };
    }
    context.clearRect(0, 0, cssW, cssH);
    const brushScale = cssW / meta.originalWidth;
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
    paintStrokes(context, strokes, cssW, cssH, brushScale, brushColor);
    if (draftSelection) {
      const draftLeft = draftSelection.x1 * cssW;
      const draftTop = draftSelection.y1 * cssH;
      const draftWidth = (draftSelection.x2 - draftSelection.x1) * cssW;
      const draftHeight = (draftSelection.y2 - draftSelection.y1) * cssH;
      if (draftWidth > 0 && draftHeight > 0) {
        context.save();
        context.fillStyle = brushColor;
        context.globalAlpha = 0.35;
        context.fillRect(draftLeft, draftTop, draftWidth, draftHeight);
        context.globalAlpha = 1;
        context.strokeStyle = brushColor;
        context.lineWidth = 1.5;
        context.setLineDash([6, 4]);
        context.strokeRect(draftLeft, draftTop, draftWidth, draftHeight);
        context.restore();
      }
    }
  }, [selections, draftSelection, imagePos, meta, canvasPixelRatio, brushColor]);
  const toNormalised = reactExports.useCallback((pointerEvent) => {
    const rect = paintRectRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (pointerEvent.clientX - rect.left) / rect.width,
      y: (pointerEvent.clientY - rect.top) / rect.height,
    };
  }, []);
  const handlePointerDown = reactExports.useCallback(
    (pointerEvent) => {
      if (!pointerEvent.isPrimary) return;
      if (pointerEvent.button !== 0) return;
      const point = toNormalised(pointerEvent);
      if (!point) return;
      pointerEvent.preventDefault();
      pointerEvent.stopPropagation();
      pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
      paintingRef.current = true;
      beginSelection(point);
    },
    [beginSelection, toNormalised],
  );
  const handlePointerMove = reactExports.useCallback(
    (pointerEvent) => {
      if (!pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) return;
      const point = toNormalised(pointerEvent);
      if (!point) return;
      pointerEvent.preventDefault();
      extendSelection(point);
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
    (pointerEvent) => {
      if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
        pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
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
  const handleContextMenu = reactExports.useCallback((contextMenuEvent) => {
    contextMenuEvent.preventDefault();
  }, []);
  reactExports.useEffect(() => {
    return void 0;
  }, []);
  reactExports.useEffect(() => {
    const handleKey = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        keyboardEvent.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  }, [onCancel]);
  reactExports.useEffect(() => {
    const node = paintRectRef.current;
    if (!node) return;
    const onWheel = (wheelEvent) => {
      wheelEvent.preventDefault();
      wheelEvent.stopPropagation();
    };
    node.addEventListener("wheel", onWheel, {
      passive: false,
    });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);
  const screenBrushPx = 0;
  const cursorStyle = {
    cursor: "crosshair",
  };
  const backdropPointerDownRef = reactExports.useRef(false);
  const onBackdropPointerDown = reactExports.useCallback((pointerEvent) => {
    backdropPointerDownRef.current = pointerEvent.target === pointerEvent.currentTarget;
  }, []);
  const onBackdropClick = reactExports.useCallback(
    (clickEvent) => {
      if (clickEvent.target === clickEvent.currentTarget && backdropPointerDownRef.current)
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
