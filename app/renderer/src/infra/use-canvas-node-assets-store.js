// use-canvas-node-assets-store.js
import { parseNodeId } from "../canvas/find-free-position-from-anchor.js";
import { create$2 as create } from "../vendor.js";
const DEFAULT_WORKSPACE_SCOPE = "__default__";
function workspaceScope(workspaceId2) {
  return workspaceId2 || DEFAULT_WORKSPACE_SCOPE;
}
function buildByAssetFromRefs(refs) {
  const next2 = new Map();
  for (const { nodeId, assetId } of refs) {
    if (!assetId) continue;
    const list2 = next2.get(assetId);
    if (list2) list2.push(nodeId);
    else next2.set(assetId, [nodeId]);
  }
  return next2;
}
function buildByAsset(nodeIds) {
  const next2 = new Map();
  for (const id2 of nodeIds) {
    const { assetId } = parseNodeId(id2);
    const list2 = next2.get(assetId);
    if (list2) list2.push(id2);
    else next2.set(assetId, [id2]);
  }
  return next2;
}
function isSameAssetNodeIndex(current2, next2) {
  if (!current2 || current2.size !== next2.size) return false;
  for (const [assetId, nextNodeIds] of next2) {
    const currentNodeIds = current2.get(assetId);
    if (!currentNodeIds || currentNodeIds.length !== nextNodeIds.length)
      return false;
    if (nextNodeIds.some((nodeId, index2) => currentNodeIds[index2] !== nodeId))
      return false;
  }
  return true;
}
export const useCanvasNodeAssetsStore = create((set2) => ({
  byWorkspace: new Map(),
  setFromNodes: (workspaceId2, refs) =>
    set2((state2) => {
      const scope = workspaceScope(workspaceId2);
      const byAsset = buildByAssetFromRefs(refs);
      if (isSameAssetNodeIndex(state2.byWorkspace.get(scope), byAsset))
        return state2;
      const next2 = new Map(state2.byWorkspace);
      next2.set(scope, byAsset);
      return {
        byWorkspace: next2,
      };
    }),
  setFromNodeIds: (workspaceId2, nodeIds) =>
    set2((state2) => {
      const scope = workspaceScope(workspaceId2);
      const byAsset = buildByAsset(nodeIds);
      if (isSameAssetNodeIndex(state2.byWorkspace.get(scope), byAsset))
        return state2;
      const next2 = new Map(state2.byWorkspace);
      next2.set(scope, byAsset);
      return {
        byWorkspace: next2,
      };
    }),
  clearWorkspace: (workspaceId2) =>
    set2((state2) => {
      const next2 = new Map(state2.byWorkspace);
      next2.delete(workspaceScope(workspaceId2));
      return {
        byWorkspace: next2,
      };
    }),
  clear: () =>
    set2({
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
    (state2) =>
      state2.byWorkspace.get(workspaceScope(workspaceId2)) ??
      EMPTY_ASSET_NODE_IDS,
  );
}
export function useHasAssetOnCanvas(assetId, workspaceId2) {
  return useCanvasNodeAssetsStore((state2) =>
    assetId
      ? (state2.byWorkspace.get(workspaceScope(workspaceId2))?.has(assetId) ??
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
