// use-canvas-node-assets-store.js
import { parseNodeId } from "../canvas/find-free-position-from-anchor.js";
import { create$2 as create } from "../vendor.js";
const DEFAULT_WORKSPACE_SCOPE = "__default__";
function workspaceScope(workspaceId) {
  return workspaceId || DEFAULT_WORKSPACE_SCOPE;
}
function buildByAssetFromRefs(refs) {
  const next = new Map();
  for (const { nodeId, assetId } of refs) {
    if (!assetId) continue;
    const list = next.get(assetId);
    if (list) list.push(nodeId);
    else next.set(assetId, [nodeId]);
  }
  return next;
}
function buildByAsset(nodeIds) {
  const next = new Map();
  for (const id of nodeIds) {
    const { assetId } = parseNodeId(id);
    const list = next.get(assetId);
    if (list) list.push(id);
    else next.set(assetId, [id]);
  }
  return next;
}
function isSameAssetNodeIndex(current, next) {
  if (!current || current.size !== next.size) return false;
  for (const [assetId, nextNodeIds] of next) {
    const currentNodeIds = current.get(assetId);
    if (!currentNodeIds || currentNodeIds.length !== nextNodeIds.length)
      return false;
    if (nextNodeIds.some((nodeId, index) => currentNodeIds[index] !== nodeId))
      return false;
  }
  return true;
}
export const useCanvasNodeAssetsStore = create((set) => ({
  byWorkspace: new Map(),
  setFromNodes: (workspaceId, refs) =>
    set((state) => {
      const scope = workspaceScope(workspaceId);
      const byAsset = buildByAssetFromRefs(refs);
      if (isSameAssetNodeIndex(state.byWorkspace.get(scope), byAsset))
        return state;
      const next = new Map(state.byWorkspace);
      next.set(scope, byAsset);
      return {
        byWorkspace: next,
      };
    }),
  setFromNodeIds: (workspaceId, nodeIds) =>
    set((state) => {
      const scope = workspaceScope(workspaceId);
      const byAsset = buildByAsset(nodeIds);
      if (isSameAssetNodeIndex(state.byWorkspace.get(scope), byAsset))
        return state;
      const next = new Map(state.byWorkspace);
      next.set(scope, byAsset);
      return {
        byWorkspace: next,
      };
    }),
  clearWorkspace: (workspaceId) =>
    set((state) => {
      const next = new Map(state.byWorkspace);
      next.delete(workspaceScope(workspaceId));
      return {
        byWorkspace: next,
      };
    }),
  clear: () =>
    set({
      byWorkspace: new Map(),
    }),
}));
export function getNodeIdsForAsset(assetId, workspaceId2) {
  return (
    useCanvasNodeAssetsStore
      .getState()
      .byWorkspace.get(workspaceScope(workspaceId2))
      ?.get(assetId) ?? []
  );
}
const EMPTY_ASSET_NODE_IDS = new Map();
export function useCanvasAssetNodeIds(workspaceId2) {
  return useCanvasNodeAssetsStore(
    (state) =>
      state.byWorkspace.get(workspaceScope(workspaceId2)) ??
      EMPTY_ASSET_NODE_IDS,
  );
}
export function useHasAssetOnCanvas(assetId, workspaceId2) {
  return useCanvasNodeAssetsStore((state) =>
    assetId
      ? (state.byWorkspace.get(workspaceScope(workspaceId2))?.has(assetId) ??
        false)
      : false,
  );
}
const ELECTRON_BRIDGE_KEY = "__HILO_PLATFORM__";
export function isElectron() {
  return typeof window !== "undefined" && ELECTRON_BRIDGE_KEY in window;
}
export function getElectronPlatform() {
  if (!isElectron()) return void 0;
  return window[ELECTRON_BRIDGE_KEY];
}
