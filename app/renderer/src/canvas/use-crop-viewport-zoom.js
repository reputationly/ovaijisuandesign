// use-crop-viewport-zoom.js
import { clamp } from "./use-start-crop-from-node.js";
import {
  CANVAS_MAX_ZOOM,
  CANVAS_MIN_ZOOM,
} from "../infra/use-plugin-metadata-store.js";
import {
  reactExports,
  useReactFlow,
  useStore$3 as useStore,
} from "../vendor.js";
const SAFE_AREA = {
  top: 80,
  bottom: 88,
  horizontal: 72,
};
const GEOMETRY_REFIT_THRESHOLD = 4;
const RESERVE_REFIT_THRESHOLD = 8;
function shouldRefitViewportFocusLayout(previous, next) {
  if (!previous) return true;
  const geometryChanged =
    Math.abs(next.canvasWidth - previous.canvasWidth) >=
      GEOMETRY_REFIT_THRESHOLD ||
    Math.abs(next.canvasHeight - previous.canvasHeight) >=
      GEOMETRY_REFIT_THRESHOLD ||
    Math.abs(next.nodeFlowX - previous.nodeFlowX) >=
      GEOMETRY_REFIT_THRESHOLD ||
    Math.abs(next.nodeFlowY - previous.nodeFlowY) >=
      GEOMETRY_REFIT_THRESHOLD ||
    Math.abs(next.nodeWidth - previous.nodeWidth) >=
      GEOMETRY_REFIT_THRESHOLD ||
    Math.abs(next.nodeHeight - previous.nodeHeight) >=
      GEOMETRY_REFIT_THRESHOLD;
  const reserveChanged =
    Math.abs(next.topReserve - previous.topReserve) >=
      RESERVE_REFIT_THRESHOLD ||
    Math.abs(next.bottomReserve - previous.bottomReserve) >=
      RESERVE_REFIT_THRESHOLD ||
    Math.abs(next.rightReserve - previous.rightReserve) >=
      RESERVE_REFIT_THRESHOLD;
  const zoomLimitChanged =
    (next.maxZoom ?? CANVAS_MAX_ZOOM) !==
    (previous.maxZoom ?? CANVAS_MAX_ZOOM);
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
  const zoom = clamp(
    Math.min(availW / Math.max(1, nodeWidth), availH / Math.max(1, nodeHeight)),
    CANVAS_MIN_ZOOM,
    clamp(maxZoom, CANVAS_MIN_ZOOM, CANVAS_MAX_ZOOM),
  );
  const nodeCenterX = nodeFlowX + nodeWidth / 2;
  const nodeCenterY = nodeFlowY + nodeHeight / 2;
  const centerX =
    rawAvailW > 0 ? SAFE_AREA.horizontal + rawAvailW / 2 : canvasWidth / 2;
  const centerY =
    rawAvailH > 0 ? effectiveTop + rawAvailH / 2 : canvasHeight / 2;
  return {
    x: centerX - nodeCenterX * zoom,
    y: centerY - nodeCenterY * zoom,
    zoom,
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
  const canvasWidth = useStore((canvasState) => canvasState.width);
  const canvasHeight = useStore((canvasState) => canvasState.height);
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
      const current = getViewport();
      const distance = Math.sqrt(
        (targetX - current.x) ** 2 + (targetY - current.y) ** 2,
      );
      const zoomDelta = Math.abs(targetZoom - current.zoom);
      duration = clamp(
        200 +
          distance * 0.5 +
          zoomDelta * 600 +
          (1 / Math.max(current.zoom, CANVAS_MIN_ZOOM)) * 200,
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
