// use-canvas-viewport-focus.js
import { reactExports, useReactFlow, useStoreApi } from "../vendor.js";
import {
  CANVAS_MAX_ZOOM,
  CANVAS_MIN_ZOOM,
} from "../infra/use-plugin-metadata-store.js";
import { syncStableZoomAfter } from "../media-editing/get-reference-navigation-defaults.jsx";

const CENTER_ON_NODES_DURATION_MS = 350;

const FIT_PADDING_RATIO = 0.1;

const FRAME_PADDING_RATIO = 0.15;

const CENTER_ON_NODES_MAX_FRAME_ZOOM = 2;

function easeOutQuart(t2) {
  return 1 - (1 - t2) ** 4;
}

function interpolateFocusView(a2, b3) {
  const widthRatio = b3[2] / a2[2];
  return (t2) => {
    const scale2 = widthRatio ** t2;
    const remaining = (1 - t2) * scale2;
    return [
      b3[0] - (b3[0] - a2[0]) * remaining,
      b3[1] - (b3[1] - a2[1]) * remaining,
      a2[2] * scale2,
    ];
  };
}

function computeCenterOnBoundsViewport(
  bounds,
  canvasSize,
  currentZoom,
  minZoom,
  options = {},
) {
  const padding = options.frame ? FRAME_PADDING_RATIO : FIT_PADDING_RATIO;
  const usableWidth = canvasSize.width * (1 - padding * 2);
  const usableHeight = canvasSize.height * (1 - padding * 2);
  const fitZoom =
    bounds.width > 0 && bounds.height > 0
      ? Math.min(usableWidth / bounds.width, usableHeight / bounds.height)
      : currentZoom;
  const maxZoom = options.frame
    ? Math.min(
        options.maxZoom ?? CENTER_ON_NODES_MAX_FRAME_ZOOM,
        CENTER_ON_NODES_MAX_FRAME_ZOOM,
      )
    : currentZoom;
  const zoom2 = Math.max(minZoom, Math.min(maxZoom, fitZoom));
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  return {
    x: canvasSize.width / 2 - centerX * zoom2,
    y: canvasSize.height / 2 - centerY * zoom2,
    zoom: zoom2,
  };
}

function getNodesBounds(nodeIds, nodeLookup) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const id2 of nodeIds) {
    const node2 = nodeLookup.get(id2);
    const width = node2?.measured?.width;
    const height = node2?.measured?.height;
    if (!node2 || !width || !height) continue;
    const position2 = node2.internals.positionAbsolute;
    minX = Math.min(minX, position2.x);
    minY = Math.min(minY, position2.y);
    maxX = Math.max(maxX, position2.x + width);
    maxY = Math.max(maxY, position2.y + height);
  }
  if (!Number.isFinite(minX)) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function useCanvasViewportFocus(instance2) {
  const { fitView, getViewport, setViewport } = useReactFlow();
  const storeApi = useStoreApi();
  const syncStableZoomAfterViewportChange = reactExports.useCallback(
    (result) => syncStableZoomAfter(result, () => getViewport().zoom),
    [getViewport],
  );
  const handleFitView = reactExports.useCallback(() => {
    syncStableZoomAfterViewportChange(
      fitView({
        padding: 0.2,
        duration: 300,
      }),
    );
  }, [fitView, syncStableZoomAfterViewportChange]);
  const centerViewportOnNodes = reactExports.useCallback(
    (nodeIds, frame2 = false) => {
      const { nodeLookup, width, height } = storeApi.getState();
      const bounds = getNodesBounds(nodeIds, nodeLookup);
      if (!bounds || width <= 0 || height <= 0) return;
      const target = computeCenterOnBoundsViewport(
        bounds,
        {
          width,
          height,
        },
        getViewport().zoom,
        CANVAS_MIN_ZOOM,
        {
          frame: frame2,
          maxZoom: CANVAS_MAX_ZOOM,
        },
      );
      syncStableZoomAfterViewportChange(
        setViewport(target, {
          duration: CENTER_ON_NODES_DURATION_MS,
          ease: easeOutQuart,
          interpolate: interpolateFocusView,
        }),
      );
    },
    [getViewport, setViewport, storeApi, syncStableZoomAfterViewportChange],
  );
  const handleFocusSelection = reactExports.useCallback(() => {
    centerViewportOnNodes(instance2.selection.getSelected(), true);
  }, [centerViewportOnNodes, instance2]);
  const handleMinimapNodeSelect = reactExports.useCallback(
    (nodeId, additive) => {
      if (additive) {
        instance2.selection.toggle(nodeId);
        return;
      }
      instance2.selection.set([nodeId]);
      centerViewportOnNodes([nodeId]);
    },
    [centerViewportOnNodes, instance2],
  );
  return {
    handleFitView,
    handleFocusSelection,
    handleMinimapNodeSelect,
  };
}
