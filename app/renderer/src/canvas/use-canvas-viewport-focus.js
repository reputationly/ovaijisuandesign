// use-canvas-viewport-focus.js
import { reactExports } from "../vendor.js";
import { useReactFlow, useStoreApi } from "../vendor-fork/xyflow/react/index.js";
import {
  CANVAS_MAX_ZOOM,
  CANVAS_MIN_ZOOM,
} from "../infra/use-plugin-metadata-store.js";
import { syncStableZoomAfter } from "../media-editing/get-reference-navigation-defaults.jsx";

const CENTER_ON_NODES_DURATION_MS = 350;

const FIT_PADDING_RATIO = 0.1;

const FRAME_PADDING_RATIO = 0.15;

const CENTER_ON_NODES_MAX_FRAME_ZOOM = 2;

function easeOutQuart(progress) {
  return 1 - (1 - progress) ** 4;
}

function interpolateFocusView(startView, targetView) {
  const widthRatio = targetView[2] / startView[2];
  return (progress) => {
    const scale = widthRatio ** progress;
    const remaining = (1 - progress) * scale;
    return [
      targetView[0] - (targetView[0] - startView[0]) * remaining,
      targetView[1] - (targetView[1] - startView[1]) * remaining,
      startView[2] * scale,
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
  const zoom = Math.max(minZoom, Math.min(maxZoom, fitZoom));
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  return {
    x: canvasSize.width / 2 - centerX * zoom,
    y: canvasSize.height / 2 - centerY * zoom,
    zoom,
  };
}

function getNodesBounds(nodeIds, nodeLookup) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const id of nodeIds) {
    const node = nodeLookup.get(id);
    const width = node?.measured?.width;
    const height = node?.measured?.height;
    if (!node || !width || !height) continue;
    const position = node.internals.positionAbsolute;
    minX = Math.min(minX, position.x);
    minY = Math.min(minY, position.y);
    maxX = Math.max(maxX, position.x + width);
    maxY = Math.max(maxY, position.y + height);
  }
  if (!Number.isFinite(minX)) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function useCanvasViewportFocus(instance) {
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
    (nodeIds, frame = false) => {
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
          frame,
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
    centerViewportOnNodes(instance.selection.getSelected(), true);
  }, [centerViewportOnNodes, instance]);
  const handleMinimapNodeSelect = reactExports.useCallback(
    (nodeId, additive) => {
      if (additive) {
        instance.selection.toggle(nodeId);
        return;
      }
      instance.selection.set([nodeId]);
      centerViewportOnNodes([nodeId]);
    },
    [centerViewportOnNodes, instance],
  );
  return {
    handleFitView,
    handleFocusSelection,
    handleMinimapNodeSelect,
  };
}
