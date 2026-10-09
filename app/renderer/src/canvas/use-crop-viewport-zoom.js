// use-crop-viewport-zoom.js
import { clamp$6 } from "./use-start-crop-from-node.js";
import {
  CANVAS_MAX_ZOOM,
  CANVAS_MIN_ZOOM,
} from "../infra/use-plugin-metadata-store.js";
import { reactExports, useReactFlow, useStore$3 } from "../vendor.js";

const SAFE_AREA = {
  top: 80,
  bottom: 88,
  horizontal: 72,
};

const GEOMETRY_REFIT_THRESHOLD = 4;

const RESERVE_REFIT_THRESHOLD = 8;

function shouldRefitViewportFocusLayout(previous2, next2) {
  if (!previous2) return true;
  const geometryChanged =
    Math.abs(next2.canvasWidth - previous2.canvasWidth) >=
      GEOMETRY_REFIT_THRESHOLD ||
    Math.abs(next2.canvasHeight - previous2.canvasHeight) >=
      GEOMETRY_REFIT_THRESHOLD ||
    Math.abs(next2.nodeFlowX - previous2.nodeFlowX) >=
      GEOMETRY_REFIT_THRESHOLD ||
    Math.abs(next2.nodeFlowY - previous2.nodeFlowY) >=
      GEOMETRY_REFIT_THRESHOLD ||
    Math.abs(next2.nodeWidth - previous2.nodeWidth) >=
      GEOMETRY_REFIT_THRESHOLD ||
    Math.abs(next2.nodeHeight - previous2.nodeHeight) >=
      GEOMETRY_REFIT_THRESHOLD;
  const reserveChanged =
    Math.abs(next2.topReserve - previous2.topReserve) >=
      RESERVE_REFIT_THRESHOLD ||
    Math.abs(next2.bottomReserve - previous2.bottomReserve) >=
      RESERVE_REFIT_THRESHOLD ||
    Math.abs(next2.rightReserve - previous2.rightReserve) >=
      RESERVE_REFIT_THRESHOLD;
  const zoomLimitChanged =
    (next2.maxZoom ?? CANVAS_MAX_ZOOM) !==
    (previous2.maxZoom ?? CANVAS_MAX_ZOOM);
  return geometryChanged || reserveChanged || zoomLimitChanged;
}

function computeViewportFocusLayout(input) {
  const {
    canvasWidth,
    canvasHeight,
    nodeFlowX,
    nodeFlowY,
    nodeWidth,
    nodeHeight,
    topReserve,
    bottomReserve,
    rightReserve,
    maxZoom = CANVAS_MAX_ZOOM,
  } = input;
  const effectiveTop = SAFE_AREA.top + Math.max(0, topReserve);
  const effectiveBottom = SAFE_AREA.bottom + Math.max(0, bottomReserve);
  const effectiveRight = SAFE_AREA.horizontal + Math.max(0, rightReserve);
  const rawAvailW = canvasWidth - SAFE_AREA.horizontal - effectiveRight;
  const rawAvailH = canvasHeight - effectiveTop - effectiveBottom;
  const availW = Math.max(1, rawAvailW);
  const availH = Math.max(1, rawAvailH);
  const zoom2 = clamp$6(
    Math.min(availW / Math.max(1, nodeWidth), availH / Math.max(1, nodeHeight)),
    CANVAS_MIN_ZOOM,
    clamp$6(maxZoom, CANVAS_MIN_ZOOM, CANVAS_MAX_ZOOM),
  );
  const nodeCenterX = nodeFlowX + nodeWidth / 2;
  const nodeCenterY = nodeFlowY + nodeHeight / 2;
  const centerX =
    rawAvailW > 0 ? SAFE_AREA.horizontal + rawAvailW / 2 : canvasWidth / 2;
  const centerY =
    rawAvailH > 0 ? effectiveTop + rawAvailH / 2 : canvasHeight / 2;
  return {
    x: centerX - nodeCenterX * zoom2,
    y: centerY - nodeCenterY * zoom2,
    zoom: zoom2,
  };
}

export function useCropViewportZoom(
  target,
  bottomReserve = 0,
  rightReserve = 0,
  topReserve = 0,
  maxZoom = CANVAS_MAX_ZOOM,
) {
  const { setViewport, getViewport } = useReactFlow();
  const canvasWidth = useStore$3((s2) => s2.width);
  const canvasHeight = useStore$3((s2) => s2.height);
  const lastLayoutInput = reactExports.useRef(null);
  if (!target) {
    lastLayoutInput.current = null;
  }
  reactExports.useLayoutEffect(() => {
    if (!target) return;
    if (!canvasWidth || !canvasHeight) return;
    const layoutInput = {
      canvasWidth,
      canvasHeight,
      ...target,
      topReserve,
      bottomReserve,
      rightReserve,
      maxZoom,
    };
    if (!shouldRefitViewportFocusLayout(lastLayoutInput.current, layoutInput))
      return;
    const isFirst = lastLayoutInput.current === null;
    lastLayoutInput.current = layoutInput;
    const {
      x: targetX,
      y: targetY,
      zoom: targetZoom,
    } = computeViewportFocusLayout(layoutInput);
    let duration;
    if (isFirst) {
      const current2 = getViewport();
      const distance2 = Math.sqrt(
        (targetX - current2.x) ** 2 + (targetY - current2.y) ** 2,
      );
      const zoomDelta = Math.abs(targetZoom - current2.zoom);
      duration = clamp$6(
        200 +
          distance2 * 0.5 +
          zoomDelta * 600 +
          (1 / Math.max(current2.zoom, CANVAS_MIN_ZOOM)) * 200,
        200,
        1500,
      );
    } else {
      duration = 250;
    }
    setViewport(
      {
        x: targetX,
        y: targetY,
        zoom: targetZoom,
      },
      {
        duration,
      },
    );
  }, [
    target,
    canvasWidth,
    canvasHeight,
    topReserve,
    bottomReserve,
    rightReserve,
    maxZoom,
    setViewport,
    getViewport,
  ]);
}
