// apply-visibility-priority-focus.js
import { CanvasNodeType, getViewportForBounds } from "../vendor.js";
import { getAssetMetaByNodeIdFromStore } from "./fullscreen-icon.jsx";
import { getNodePosition, sizeOf } from "./use-active-mode.js";
import { STICKER_NODE_SIZE } from "./resolve-canvas-focus-targets.js";
import { resolveVisibilityPriorityFocus } from "./resolve-visibility-priority-focus.js";
export function applyVisibilityPriorityFocus({
  duration,
  getViewport,
  minReadableZoom,
  minZoom,
  nodeIds,
  padding,
  setCenter,
  setViewport,
  state: state2,
  syncViewportChange,
}) {
  const nodeRects = [];
  for (const id2 of nodeIds) {
    const node2 = state2.nodeLookup.get(id2);
    const width = node2?.measured?.width;
    const height = node2?.measured?.height;
    if (!node2 || !width || !height) return;
    const position2 = node2.internals.positionAbsolute;
    nodeRects.push({
      id: id2,
      x: position2.x,
      y: position2.y,
      width,
      height,
    });
  }
  if (nodeRects.length === 0 || state2.width <= 0 || state2.height <= 0) return;
  const minX = Math.min(...nodeRects.map((rect) => rect.x));
  const minY = Math.min(...nodeRects.map((rect) => rect.y));
  const maxX = Math.max(...nodeRects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...nodeRects.map((rect) => rect.y + rect.height));
  const fitAllViewport = getViewportForBounds(
    {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
    state2.width,
    state2.height,
    minZoom,
    1,
    padding,
  );
  const currentViewport = getViewport();
  const decision = resolveVisibilityPriorityFocus({
    fitAllZoom: fitAllViewport.zoom,
    minReadableZoom,
    nodeRects,
    viewportRect: {
      x: -currentViewport.x / currentViewport.zoom,
      y: -currentViewport.y / currentViewport.zoom,
      width: state2.width / currentViewport.zoom,
      height: state2.height / currentViewport.zoom,
    },
  });
  if (decision.type === "keep") return;
  if (decision.type === "fit-all") {
    syncViewportChange(
      setViewport(fitAllViewport, {
        duration,
      }),
    );
    return;
  }
  const target = nodeRects.find((rect) => rect.id === decision.nodeId);
  if (!target) return;
  syncViewportChange(
    setCenter(target.x + target.width / 2, target.y + target.height / 2, {
      duration,
      zoom: Math.max(currentViewport.zoom, minReadableZoom),
    }),
  );
}
export function resolveInitialFitGateAction({
  presented,
  loading,
  initialFitConsumed,
  initialHydratedNodeCount,
  nodeCount,
  nodesInitialized,
}) {
  if (!presented || loading || initialFitConsumed) return "wait";
  if (initialHydratedNodeCount === null) return "wait";
  if (initialHydratedNodeCount === 0) return "reveal-empty";
  if (nodeCount === 0) return "wait";
  return nodesInitialized ? "fit-measured" : "schedule-fallback";
}
export function shouldAcquireCanvasResources({
  presented,
  loading,
  initialFitDone,
}) {
  return presented && !loading && initialFitDone;
}
export function filterInitialFitFallbackNodes(nodes) {
  return nodes.filter((node2) => !("hidden" in node2) || node2.hidden !== true);
}
export function resolveInitialFitFallbackViewport({
  bounds,
  viewportWidth,
  viewportHeight,
  minZoom,
  maxZoom,
  padding,
}) {
  if (
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return void 0;
  }
  return getViewportForBounds(
    bounds,
    viewportWidth,
    viewportHeight,
    minZoom,
    maxZoom,
    padding,
  );
}
export function resolveNewNodesToastAction(input) {
  return input.projectActive && input.canvasPresented
    ? "focus-presented-canvas"
    : "navigate";
}
export function shouldRecenterFirstNodes(input) {
  return input.canvasPresented && input.nodeCount > 0;
}
const URL_PATH_PARAM_KEYS = ["path", "file", "file_path", "local_path"];
const FILES_ROUTE_PREFIX = "/files/";
const THUMBNAIL_ROUTE_PREFIX = "/api/thumbnail/";
function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
function stripQueryAndHash(value) {
  return value.split("?")[0]?.split("#")[0] ?? value;
}
function normalizePath(value) {
  return decodePath(stripQueryAndHash(value.trim())).replace(/\\/g, "/");
}
function pushUnique(values3, value) {
  if (!value) return;
  const normalized = normalizePath(value);
  if (!normalized || values3.includes(normalized)) return;
  values3.push(normalized);
}
function pathQueries(rawPath) {
  const values3 = [];
  pushUnique(values3, rawPath);
  try {
    const url2 = new URL(rawPath, "http://hilo.local");
    for (const key2 of URL_PATH_PARAM_KEYS) {
      pushUnique(values3, url2.searchParams.get(key2) ?? void 0);
    }
    const pathname = normalizePath(url2.pathname);
    pushUnique(values3, pathname);
    if (pathname.startsWith(FILES_ROUTE_PREFIX)) {
      pushUnique(values3, pathname.slice(FILES_ROUTE_PREFIX.length));
    }
    if (pathname.startsWith(THUMBNAIL_ROUTE_PREFIX)) {
      pushUnique(values3, pathname.slice(THUMBNAIL_ROUTE_PREFIX.length));
    }
  } catch {}
  return values3;
}
function basename(value) {
  return value.split("/").pop() ?? value;
}
function hasDirectorySegment(value) {
  return value.includes("/");
}
function isExactOrSegmentSuffix(candidate, query) {
  if (candidate === query) return true;
  if (hasDirectorySegment(candidate) && query.endsWith(`/${candidate}`))
    return true;
  if (hasDirectorySegment(query) && candidate.endsWith(`/${query}`))
    return true;
  return false;
}
export function resolveFileNodeIdByPath(rawPath, candidates2) {
  if (!rawPath) return null;
  const queries = pathQueries(rawPath);
  if (queries.length === 0) return null;
  for (const query of queries) {
    for (const candidate of candidates2) {
      if (!candidate.path) continue;
      if (isExactOrSegmentSuffix(normalizePath(candidate.path), query)) {
        return candidate.nodeId;
      }
    }
  }
  const queryBases = new Set(
    queries.map((query) => basename(query)).filter(Boolean),
  );
  const basenameMatches = new Set();
  for (const candidate of candidates2) {
    if (!candidate.path) continue;
    if (queryBases.has(basename(normalizePath(candidate.path)))) {
      basenameMatches.add(candidate.nodeId);
    }
  }
  return basenameMatches.size === 1 ? ([...basenameMatches][0] ?? null) : null;
}
export function resolveFirstFileNodeIdByPartialName(rawName, candidates2) {
  const query = decodePath(rawName).trim().toLowerCase();
  if (!query) return null;
  for (const candidate of candidates2) {
    const names = [
      candidate.name,
      candidate.path ? basename(normalizePath(candidate.path)) : null,
    ];
    if (
      names.some(
        (name2) =>
          typeof name2 === "string" && name2.toLowerCase().includes(query),
      )
    ) {
      return candidate.nodeId;
    }
  }
  return null;
}
export function applyReactFlowSelectionWriteback({
  ids: ids2,
  syncing,
  active: active2,
  writeSelection,
  closeMenus,
}) {
  if (syncing) return "ignored-syncing";
  if (!active2) return "ignored-inactive";
  writeSelection([...ids2]);
  closeMenus();
  return "applied";
}
export const INITIAL_FIT_FALLBACK_MS = 2500;
export const EMPTY_SHELL_NODES = [];
export const EMPTY_SHELL_EDGES = [];
const STICKER_MAX_ROTATION_DEG = 30;
export const STICKER_BINDING_DELAY_MS = 120;
export function randomStickerRotation() {
  return Math.round((Math.random() * 2 - 1) * STICKER_MAX_ROTATION_DEG);
}
export const DEFAULT_STICKER_EMOJI = "⭐";
export function getAbsoluteNodePosition(node2, nodesById, mode2) {
  let position2 = getNodePosition(node2, mode2);
  let parentId = node2.parentId;
  const visited = new Set([node2.id]);
  while (parentId) {
    if (visited.has(parentId)) break;
    visited.add(parentId);
    const parent = nodesById.get(parentId);
    if (!parent) break;
    const parentPosition = getNodePosition(parent, mode2);
    position2 = {
      x: position2.x + parentPosition.x,
      y: position2.y + parentPosition.y,
    };
    parentId = parent.parentId;
  }
  return position2;
}
export function findStickerTarget(nodes, stickerPosition, mode2) {
  let best;
  const nodesById = new Map(nodes.map((node2) => [node2.id, node2]));
  const stickerRight = stickerPosition.x + STICKER_NODE_SIZE.width;
  const stickerBottom = stickerPosition.y + STICKER_NODE_SIZE.height;
  for (const node2 of nodes) {
    if (node2.type === CanvasNodeType.Sticker || node2.meta?.hidden) continue;
    const position2 = getAbsoluteNodePosition(node2, nodesById, mode2);
    const size2 = sizeOf(node2, mode2);
    const overlapWidth = Math.max(
      0,
      Math.min(stickerRight, position2.x + size2.width) -
        Math.max(stickerPosition.x, position2.x),
    );
    const overlapHeight = Math.max(
      0,
      Math.min(stickerBottom, position2.y + size2.height) -
        Math.max(stickerPosition.y, position2.y),
    );
    const area = overlapWidth * overlapHeight;
    if (area <= 0 || (best && area <= best.area)) continue;
    best = {
      area,
      target: {
        id: node2.id,
        position: position2,
        size: size2,
        anchor: {
          x: (stickerPosition.x - position2.x) / Math.max(size2.width, 1),
          y: (stickerPosition.y - position2.y) / Math.max(size2.height, 1),
        },
      },
    };
  }
  return best?.target;
}
export function getTextNodeBackingPath(node2, assetMetadataStore) {
  if (node2.type !== CanvasNodeType.Text) return null;
  const metaPath = getAssetMetaByNodeIdFromStore(
    assetMetadataStore,
    node2.id,
  )?.path;
  if (metaPath) return metaPath;
  const data2 = node2.data;
  const dataPath = data2?.path;
  return typeof dataPath === "string" && dataPath.length > 0 ? dataPath : null;
}
export function hasOtherTextNodeWithBackingPath(
  nodes,
  removedNodeId,
  filePath,
  assetMetadataStore,
) {
  return nodes.some(
    (node2) =>
      node2.id !== removedNodeId &&
      getTextNodeBackingPath(node2, assetMetadataStore) === filePath,
  );
}
