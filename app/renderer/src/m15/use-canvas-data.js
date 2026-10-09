// use-canvas-data.js
import {
  CanvasNodeType,
  reactExports,
  useAssetMetadataApi,
  selectGeneratedMediaNodeIds,
} from "../vendor.js";
import {
  buildCanvasNodes,
  filterEdges,
  layoutUnsavedNodes,
  reuseUnchangedNodeRefs,
} from "./build-canvas-nodes.js";
import {
  CANVAS_UNHYDRATED_RECOVERY_DELAY_MS,
  beginCanvasSnapshotLoad,
  buildGeneratingInfoFromIncomingData,
  buildIncrementalNodeData,
  classifyCanvasLoadFailure,
  finishCanvasSnapshotLoad,
  isGenerationErrorNode,
  isSameCanvasLoadOwner,
  loadLatestCanvasSnapshot,
  mergeGenerationStatusSavedNode,
  mergeRejectedCanvasCandidateAdditions,
  mergeServerNodeDataPreservingPopoverDraft,
  mirrorImageFieldsIntoData,
  shouldDeferTransientPending,
  shouldMirrorIncomingGeneratingData,
  shouldRecoverUnhydratedCanvas,
  toGenerationStatusRuntimeUpdate,
} from "./build-incremental-node-data.js";
import {
  bumpFileVersion,
  recordCanvasGraphMetrics,
  resetWorkspaceCanvasGraphMetrics,
} from "./create-html-iframe-pool-store.jsx";
import {
  computeNodeSize,
  defaultNodeSizeForType,
  isGenerationErrorStatus,
  readGroupSize,
} from "./group-nodes-in-canvas.js";
import { useGeneratingStateApi } from "./parse-item.jsx";
import { reconcileGroupGeometryForMode } from "./reconcile-group-geometry-for-mode.js";
import {
  buildNodeIdMetaAliases,
  buildPersistedNodeAssetMetaEntries,
  buildSavedNodeIndex,
  filterVisibleItems,
} from "./remap-clipboard.js";
import {
  computeDerivedNodePosition,
  isEmptyNode,
  sanitizeCanvasFileNodePositions,
} from "./resolve-derived-collision.js";
function normalizeServerUpdatedNode(node2) {
  const { groupId: groupId2, round: round2, ...rest } = node2;
  return {
    ...rest,
    ...(groupId2 === null
      ? {
          groupId: void 0,
        }
      : typeof groupId2 === "string" && groupId2.length > 0
        ? {
            groupId: groupId2,
          }
        : {}),
    ...(round2 === null
      ? {
          round: void 0,
        }
      : Number.isInteger(round2)
        ? {
            round: round2,
          }
        : {}),
  };
}
function resolveAbsolutePositionFromGraph(node2, mode2, graphNodes) {
  const pos = node2.positions?.[mode2];
  if (!pos) return void 0;
  if (!node2.parentId) return pos;
  let absX = pos.x;
  let absY = pos.y;
  let currentParentId = node2.parentId;
  while (currentParentId) {
    const parent = graphNodes.find((n2) => n2.id === currentParentId);
    if (!parent) break;
    const parentPos = parent.positions?.[mode2];
    if (!parentPos) break;
    absX += parentPos.x;
    absY += parentPos.y;
    currentParentId = parent.parentId;
  }
  return {
    x: absX,
    y: absY,
  };
}
function computeDerivedPositionFromGraph(instance2, sourceNodeId, allEdges, newNode, mode2) {
  const graphNodes = instance2.getGraph().nodes;
  const sourceNode = graphNodes.find((n2) => n2.id === sourceNodeId);
  const sourcePos = sourceNode
    ? resolveAbsolutePositionFromGraph(sourceNode, mode2, graphNodes)
    : void 0;
  const sourceSize = sourceNode?.size ?? defaultNodeSizeForType(sourceNode?.type ?? "image");
  if (!sourcePos) {
    return {
      x: 0,
      y: 0,
    };
  }
  const derivedNodeIds = new Set(
    allEdges
      .filter(
        (edge) =>
          edge.source === sourceNodeId &&
          (edge.type ?? "derivation") === "derivation" &&
          edge.target !== newNode.id,
      )
      .map((edge) => edge.target),
  );
  const peers = [];
  for (const id2 of derivedNodeIds) {
    const node2 = graphNodes.find((n2) => n2.id === id2);
    if (!node2) continue;
    const pos = resolveAbsolutePositionFromGraph(node2, mode2, graphNodes);
    if (!pos) continue;
    const size2 = node2.size ?? defaultNodeSizeForType(node2.type);
    peers.push({
      x: pos.x,
      y: pos.y,
      width: size2.width,
      height: size2.height,
    });
  }
  const newSize = newNode.size ?? defaultNodeSizeForType(newNode.type);
  return computeDerivedNodePosition(
    {
      x: sourcePos.x,
      y: sourcePos.y,
      width: sourceSize.width,
      height: sourceSize.height,
    },
    peers,
    void 0,
    {
      newSize,
    },
  );
}
function recordCurrentCanvasGraphMetrics(instance2, workspaceId2) {
  const graph = instance2.getGraph();
  recordCanvasGraphMetrics(
    {
      nodes: graph.nodes,
      edges: graph.edges,
    },
    workspaceId2,
  );
}
export function useCanvasData(instance2, mode2, dataSource, getViewportCenter, options) {
  const workspaceId2 = options?.workspaceId;
  const [loadState, setLoadState] = reactExports.useState(() => ({
    instance: instance2,
    workspaceId: workspaceId2,
    loading: true,
    initialHydratedNodeCount: null,
    loadError: null,
    loadRetrying: false,
  }));
  const ownsLoadState = isSameCanvasLoadOwner(loadState, instance2, workspaceId2);
  const loading = ownsLoadState ? loadState.loading : true;
  const initialHydratedNodeCount = ownsLoadState ? loadState.initialHydratedNodeCount : null;
  const loadError = ownsLoadState ? loadState.loadError : null;
  const loadRetrying = ownsLoadState ? loadState.loadRetrying : false;
  const assetMetadataStore = useAssetMetadataApi();
  const onNodesAddedRef = reactExports.useRef(options?.onNodesAdded);
  onNodesAddedRef.current = options?.onNodesAdded;
  const onFirstNodesPlacedRef = reactExports.useRef(options?.onFirstNodesPlaced);
  onFirstNodesPlacedRef.current = options?.onFirstNodesPlaced;
  const generatingStateStore = useGeneratingStateApi();
  const savedPositionsRef = reactExports.useRef(new Map());
  const hiddenAssetIdsRef = reactExports.useRef(new Set());
  const getViewportCenterRef = reactExports.useRef(getViewportCenter);
  getViewportCenterRef.current = getViewportCenter;
  const prevModeRef = reactExports.useRef(mode2);
  const prevDataSourceRef = reactExports.useRef(dataSource);
  const prevWorkspaceIdRef = reactExports.useRef(workspaceId2);
  const hydrationOwnerRef = reactExports.useRef({
    instance: instance2,
    workspaceId: workspaceId2,
    nodeCount: null,
  });
  const loadErrorOwnerRef = reactExports.useRef({
    instance: instance2,
    workspaceId: workspaceId2,
    error: null,
  });
  const retryLoadOwnerRef = reactExports.useRef(null);
  const retryLoad = reactExports.useCallback(() => {
    const owner = retryLoadOwnerRef.current;
    if (!owner || !isSameCanvasLoadOwner(owner, instance2, workspaceId2)) return;
    owner.run();
  }, [instance2, workspaceId2]);
  reactExports.useEffect(() => {
    instance2.setArtifactReferenceResolver((nodeId) => {
      const node2 = instance2.getGraph().nodes.find((candidate) => candidate.id === nodeId);
      const assets = assetMetadataStore.getState();
      const meta2 = (node2?.assetId ? assets.get(node2.assetId) : void 0) ?? assets.get(nodeId);
      if (!meta2) return void 0;
      const referenceIds = [
        ...(meta2.referenceImageIds ?? []),
        ...(meta2.referenceAudioIds ?? []),
        ...(meta2.referenceVideoIds ?? []),
        ...(meta2.referenceTextIds ?? []),
      ];
      return referenceIds.length > 0 ? referenceIds : void 0;
    });
    instance2.setArtifactBackendResolver((nodeId) => {
      const node2 = instance2.getGraph().nodes.find((candidate) => candidate.id === nodeId);
      const assets = assetMetadataStore.getState();
      const meta2 = (node2?.assetId ? assets.get(node2.assetId) : void 0) ?? assets.get(nodeId);
      return meta2?.backend;
    });
    return () => {
      instance2.setArtifactReferenceResolver(void 0);
      instance2.setArtifactBackendResolver(void 0);
    };
  }, [instance2, assetMetadataStore]);
  reactExports.useEffect(() => {
    let cancelled = false;
    let unhydratedRecoveryTimer;
    let persistenceMutationVersion = 0;
    let pendingDestructiveRestore = null;
    const loadAbortController = new AbortController();
    const prevMode = prevModeRef.current;
    const wasModeSwitched = prevMode !== mode2;
    const dataSourceUnchanged = prevDataSourceRef.current === dataSource;
    const workspaceUnchanged = prevWorkspaceIdRef.current === workspaceId2;
    prevModeRef.current = mode2;
    prevDataSourceRef.current = dataSource;
    prevWorkspaceIdRef.current = workspaceId2;
    const previousHydrationOwner = hydrationOwnerRef.current;
    let hydratedNodeCountForEffect = isSameCanvasLoadOwner(
      previousHydrationOwner,
      instance2,
      workspaceId2,
    )
      ? previousHydrationOwner.nodeCount
      : null;
    hydrationOwnerRef.current = {
      instance: instance2,
      workspaceId: workspaceId2,
      nodeCount: hydratedNodeCountForEffect,
    };
    const previousLoadErrorOwner = loadErrorOwnerRef.current;
    let loadErrorForEffect = isSameCanvasLoadOwner(previousLoadErrorOwner, instance2, workspaceId2)
      ? previousLoadErrorOwner.error
      : null;
    let loadRetryingForEffect = false;
    loadErrorOwnerRef.current = {
      instance: instance2,
      workspaceId: workspaceId2,
      error: loadErrorForEffect,
    };
    const publishLoadState = (nextLoading) => {
      if (cancelled) return;
      loadErrorOwnerRef.current = {
        instance: instance2,
        workspaceId: workspaceId2,
        error: loadErrorForEffect,
      };
      setLoadState((current2) => {
        if (cancelled) return current2;
        return {
          instance: instance2,
          workspaceId: workspaceId2,
          loading: nextLoading,
          initialHydratedNodeCount: hydratedNodeCountForEffect,
          loadError: loadErrorForEffect,
          loadRetrying: loadRetryingForEffect,
        };
      });
    };
    const loadGuard = {
      inFlight: false,
      reloadRequested: false,
      pending: [],
    };
    let modeSwitchHandled = false;
    if (
      wasModeSwitched &&
      dataSourceUnchanged &&
      workspaceUnchanged &&
      hydratedNodeCountForEffect !== null &&
      savedPositionsRef.current.size > 0
    ) {
      const graph = instance2.getGraph();
      const allSavedNodes = savedPositionsRef.current;
      const fileSnapshot = {
        version: 1,
        mode: mode2,
        nodes: Array.from(allSavedNodes.values()),
        edges: [],
      };
      const reconciled = reconcileGroupGeometryForMode(fileSnapshot, mode2);
      if (reconciled.changed) {
        for (const updated of reconciled.updatedNodes) {
          const existing = allSavedNodes.get(updated.id);
          allSavedNodes.set(updated.id, {
            ...(existing ?? {}),
            ...updated,
          });
        }
        console.warn(
          "[hilo/canvas] reconciled %d group geometry entries on mode switch to %s",
          reconciled.updatedNodes.length,
          mode2,
        );
      }
      const nodes = graph.nodes.map((node2) => {
        const saved = allSavedNodes.get(node2.id);
        const next2 = {
          ...node2,
          positions: {
            ...node2.positions,
          },
        };
        if (saved?.positions) {
          next2.positions = {
            ...next2.positions,
            ...saved.positions,
          };
        }
        if (node2.type === CanvasNodeType.Group) {
          const resolved = saved ? readGroupSize(saved, mode2) : void 0;
          if (resolved) next2.size = resolved;
          if (saved?.sizes)
            next2.sizes = {
              ...saved.sizes,
            };
        } else if (saved?.size) {
          next2.size = saved.size;
        }
        if (saved?.parentId !== void 0) next2.parentId = saved.parentId;
        return next2;
      });
      for (let i2 = 0; i2 < nodes.length; i2++) {
        const n2 = nodes[i2];
        if (n2.positions[mode2]) continue;
        const fromPrev = n2.positions[prevMode];
        if (!fromPrev) continue;
        nodes[i2] = {
          ...n2,
          positions: {
            ...n2.positions,
            [mode2]: fromPrev,
          },
        };
        const saved = allSavedNodes.get(n2.id);
        if (saved) {
          allSavedNodes.set(n2.id, {
            ...saved,
            positions: {
              ...(saved.positions ?? {}),
              [mode2]: fromPrev,
            },
          });
        }
      }
      const { nodes: finalNodes, needsPersist } = layoutUnsavedNodes(
        instance2,
        nodes,
        allSavedNodes,
        mode2,
        graph.edges,
      );
      reuseUnchangedNodeRefs(finalNodes, instance2.getGraph().nodes);
      instance2.replaceNodesFromAuthoritativeSnapshot(finalNodes);
      recordCurrentCanvasGraphMetrics(instance2, workspaceId2);
      if (needsPersist || reconciled.changed) {
        instance2.eventBus.emit({
          type: "persist:request",
        });
      }
      modeSwitchHandled = true;
    }
    async function load2(initial) {
      if (!beginCanvasSnapshotLoad(loadGuard)) {
        return;
      }
      if (unhydratedRecoveryTimer !== void 0) {
        window.clearTimeout(unhydratedRecoveryTimer);
        unhydratedRecoveryTimer = void 0;
      }
      loadRetryingForEffect = loadErrorForEffect !== null;
      if (hydratedNodeCountForEffect === null || loadRetryingForEffect) {
        publishLoadState(hydratedNodeCountForEffect === null);
      }
      let snapshotReadSucceeded = false;
      let destructiveRestoreForLoad = null;
      let recoveryPreservedNodeCount = 0;
      let recoveryPreservedEdgeCount = 0;
      let shouldScheduleUnhydratedRecovery = false;
      try {
        const shouldPersistBeforeReload =
          instance2.getGraph().nodes.length > 0 || savedPositionsRef.current.size > 0;
        if (!dataSourceUnchanged && shouldPersistBeforeReload) {
          let persistPromise;
          instance2.eventBus.emit({
            type: "persist:flush",
            waitUntil: (promise) => {
              persistPromise = promise;
            },
          });
          if (persistPromise) {
            try {
              await persistPromise;
            } catch (err) {
              console.warn("[hilo/canvas] skipped dataSource reload after persist failure", err);
              return;
            }
          }
          if (cancelled) return;
        }
        const [items, savedGraphRaw] = await loadLatestCanvasSnapshot({
          state: loadGuard,
          signal: loadAbortController.signal,
          load: (signal) =>
            Promise.all([dataSource.loadItems(signal), dataSource.loadCanvas(signal)]),
        });
        if (cancelled || loadAbortController.signal.aborted) return;
        snapshotReadSucceeded = true;
        destructiveRestoreForLoad = pendingDestructiveRestore;
        if (
          destructiveRestoreForLoad &&
          destructiveRestoreForLoad.mutationVersion !== persistenceMutationVersion
        ) {
          if (pendingDestructiveRestore === destructiveRestoreForLoad) {
            pendingDestructiveRestore = null;
          }
          destructiveRestoreForLoad.reject(
            new Error("Canvas changed while restoring the last-good snapshot"),
          );
          void dataSource
            .reportCanvasRecovery?.({
              result: "failed",
              durationMs: performance.now() - destructiveRestoreForLoad.startedAt,
              preservedCandidateNodeCount: 0,
              preservedCandidateEdgeCount: 0,
            })
            .catch(() => void 0);
          return;
        }
        const isAuthoritativeRestore = destructiveRestoreForLoad !== null;
        const recoveredCandidate = destructiveRestoreForLoad
          ? mergeRejectedCanvasCandidateAdditions(
              savedGraphRaw,
              destructiveRestoreForLoad.candidate,
              destructiveRestoreForLoad.deletionReplay,
            )
          : {
              canvas: savedGraphRaw,
              preservedNodeCount: 0,
              preservedEdgeCount: 0,
              replayedNodeCount: 0,
              replayedEdgeCount: 0,
            };
        recoveryPreservedNodeCount = recoveredCandidate.preservedNodeCount;
        recoveryPreservedEdgeCount = recoveredCandidate.preservedEdgeCount;
        const isFirstHydration = hydratedNodeCountForEffect === null;
        const reconciledLoad = reconcileGroupGeometryForMode(recoveredCandidate.canvas, mode2);
        const sanitizedLoad = sanitizeCanvasFileNodePositions(reconciledLoad.canvas.nodes);
        const savedGraph = sanitizedLoad.changed
          ? {
              ...reconciledLoad.canvas,
              nodes: sanitizedLoad.nodes,
            }
          : reconciledLoad.canvas;
        const reconciledOnLoad = reconciledLoad.changed;
        if (reconciledOnLoad) {
          console.warn(
            "[hilo/canvas] reconciled %d group geometry entries on first load (mode=%s)",
            reconciledLoad.updatedNodes.length,
            mode2,
          );
        }
        const {
          savedByAssetId,
          hiddenAssetIds,
          allSavedNodes,
          cloneNodes,
          standaloneNodes,
          subordinateAssetIds,
          // Pass the persisted top-level `hiddenAssetIds` so the renderer-owned
          // monotone set is re-seeded from disk on every load. Without this 2nd
          // arg `buildSavedNodeIndex` defaults to an empty set, so the next
          // save emits no `hiddenAssetIds` and the field is lost after a
          // refresh (regression from the multi-image rework, f998f989a).
        } = buildSavedNodeIndex(savedGraph.nodes, savedGraph.hiddenAssetIds);
        hiddenAssetIdsRef.current = new Set(hiddenAssetIds);
        let effectiveStandaloneNodes = standaloneNodes;
        const intentionallyOmittedNodeIds = new Set();
        if (!isFirstHydration && !isAuthoritativeRestore) {
          const runtimeIds = new Set(instance2.getGraph().nodes.map((n2) => n2.id));
          effectiveStandaloneNodes = standaloneNodes.filter((n2) => {
            const keep = !isEmptyNode(n2) || runtimeIds.has(n2.id);
            if (!keep) intentionallyOmittedNodeIds.add(n2.id);
            return keep;
          });
        }
        if (!isFirstHydration && !isAuthoritativeRestore) {
          for (const runtimeNode of instance2.getGraph().nodes) {
            const rd = runtimeNode.data ?? {};
            const runtimeAssetId =
              typeof rd.assetId === "string" && rd.assetId.length > 0
                ? rd.assetId
                : typeof runtimeNode.assetId === "string" && runtimeNode.assetId.length > 0
                  ? runtimeNode.assetId
                  : void 0;
            if (!runtimeAssetId) continue;
            if (runtimeNode.groupId && runtimeNode.meta?.hidden === true) {
              subordinateAssetIds.add(runtimeAssetId);
              continue;
            }
            if (!savedByAssetId.has(runtimeAssetId)) {
              savedByAssetId.set(runtimeAssetId, {
                id: runtimeNode.id,
                type: runtimeNode.type,
                positions: {
                  ...(runtimeNode.positions ?? {}),
                },
                size: runtimeNode.size,
                assetId: runtimeAssetId,
                data: runtimeNode.data,
              });
            }
          }
        }
        const visibleItems = filterVisibleItems(
          items,
          hiddenAssetIds,
          subordinateAssetIds,
          savedByAssetId,
        );
        if (cancelled) return;
        const mergeSavedDataIntoMeta = (saved, base2) => {
          const data2 = saved?.data;
          if (!data2) return base2;
          const merged = {
            ...base2,
          };
          const dataParams = data2.params;
          if (dataParams && Object.keys(dataParams).length > 0) {
            merged.params = {
              ...(base2.params ?? {}),
              ...dataParams,
            };
          }
          if (typeof data2.lyrics === "string" && !merged.lyrics) merged.lyrics = data2.lyrics;
          if (typeof data2.backend === "string" && !merged.backend) merged.backend = data2.backend;
          if (typeof data2.model_id === "string" && !merged.model_id)
            merged.model_id = data2.model_id;
          if (typeof data2.voiceId === "string" && !merged.voiceId) merged.voiceId = data2.voiceId;
          return merged;
        };
        const metaEntries = [];
        const metaByAssetId = new Map();
        for (const item of items) {
          const aliased = savedByAssetId.get(item.id);
          const meta2 = mergeSavedDataIntoMeta(aliased, item.meta);
          metaByAssetId.set(item.id, meta2);
          metaEntries.push([item.id, meta2]);
          if (aliased && aliased.id !== item.id) {
            metaEntries.push([aliased.id, meta2]);
          }
        }
        for (const clone2 of cloneNodes) {
          const cloneAssetId =
            typeof clone2.assetId === "string" && clone2.assetId.length > 0
              ? clone2.assetId
              : void 0;
          if (!cloneAssetId || clone2.id === cloneAssetId) continue;
          const meta2 = metaByAssetId.get(cloneAssetId);
          if (meta2) metaEntries.push([clone2.id, meta2]);
        }
        const persistedNodeMetaEntries = buildPersistedNodeAssetMetaEntries(
          allSavedNodes.values(),
          metaByAssetId,
          dataSource.resolveFileUrlById?.bind(dataSource),
        );
        for (const [assetId, meta2] of persistedNodeMetaEntries) {
          metaByAssetId.set(assetId, meta2);
        }
        metaEntries.push(...persistedNodeMetaEntries);
        metaEntries.push(...buildNodeIdMetaAliases(allSavedNodes.values(), metaByAssetId));
        assetMetadataStore.getState().replaceAll(metaEntries);
        const { nodes, syntheticSavedNodes } = buildCanvasNodes({
          visibleItems,
          savedByAssetId,
          mode: mode2,
          cloneNodes,
          standaloneNodes: effectiveStandaloneNodes,
          itemLookup: new Map(items.map((item) => [item.id, item])),
          // Deletion tombstones: the renderer-owned monotone set (already
          // re-seeded from disk above) — saved nodes claiming a tombstoned
          // asset must not come back mid-deletion.
          hiddenAssetIds: hiddenAssetIdsRef.current,
          // Superset guard input: every node currently on disk. Without this
          // a node no branch materializes is dropped, and the next save is
          // rejected by the gateway shrink-guard in an unrecoverable loop.
          allSavedNodes,
          // Stale empty placeholders filtered above — the guard must respect
          // this deliberate exclusion rather than re-emitting them.
          omittedNodeIds: intentionallyOmittedNodeIds,
          // Reload-path identity preservation: anchor the new array order to
          // the live instance node sequence so unchanged nodes keep their
          // slots. See `BuildCanvasNodesInput.existingOrder` for the full
          // rationale (iframe detach + reload chain when array order shifts).
          // Skip on first hydration (`isFirstHydration`) — there's no prior
          // runtime order to honor.
          ...(isFirstHydration || isAuthoritativeRestore
            ? {}
            : {
                existingOrder: instance2.getGraph().nodes.map((n2) => n2.id),
              }),
        });
        for (const [id2, node2] of syntheticSavedNodes) {
          allSavedNodes.set(id2, node2);
        }
        assetMetadataStore
          .getState()
          .setMany(buildNodeIdMetaAliases(syntheticSavedNodes.values(), metaByAssetId));
        const nodeIdSet = new Set(nodes.map((n2) => n2.id));
        const allEdges = filterEdges(nodeIdSet, savedGraph.edges);
        savedPositionsRef.current = allSavedNodes;
        if (!isFirstHydration && !isAuthoritativeRestore) {
          const currentPositions = new Map(
            instance2.getGraph().nodes.map((n2) => [n2.id, n2.positions?.[mode2]]),
          );
          for (let i2 = 0; i2 < nodes.length; i2++) {
            const n2 = nodes[i2];
            if (allSavedNodes.get(n2.id)?.positions?.[mode2]) continue;
            const pos = currentPositions.get(n2.id);
            if (pos) {
              nodes[i2] = {
                ...n2,
                positions: {
                  ...n2.positions,
                  [mode2]: pos,
                },
              };
              const saved = allSavedNodes.get(n2.id);
              allSavedNodes.set(n2.id, {
                ...(saved ?? {
                  id: n2.id,
                  type: n2.type,
                  positions: {},
                }),
                positions: {
                  ...(saved?.positions ?? {}),
                  [mode2]: pos,
                },
              });
            }
          }
        }
        const anchor = !isFirstHydration ? getViewportCenterRef.current?.() : void 0;
        const { nodes: finalNodes, needsPersist } = layoutUnsavedNodes(
          instance2,
          nodes,
          allSavedNodes,
          mode2,
          allEdges,
          anchor,
        );
        if (!isFirstHydration && !isAuthoritativeRestore) {
          reuseUnchangedNodeRefs(finalNodes, instance2.getGraph().nodes);
        }
        for (const node2 of finalNodes) {
          if (isGenerationErrorNode(node2)) {
            generatingStateStore.getState().clear(node2.id);
          }
        }
        instance2.replaceNodesFromAuthoritativeSnapshot(finalNodes);
        instance2.replaceEdgesFromAuthoritativeSnapshot(allEdges);
        recordCurrentCanvasGraphMetrics(instance2, workspaceId2);
        if (needsPersist || reconciledOnLoad || sanitizedLoad.changed) {
          instance2.eventBus.emit({
            type: "persist:request",
          });
        }
        if (isFirstHydration || isAuthoritativeRestore) {
          instance2.snapshot();
        }
        if (isFirstHydration) {
          hydratedNodeCountForEffect = finalNodes.length;
          hydrationOwnerRef.current = {
            instance: instance2,
            workspaceId: workspaceId2,
            nodeCount: hydratedNodeCountForEffect,
          };
        }
        loadErrorForEffect = null;
        loadRetryingForEffect = false;
        if (destructiveRestoreForLoad && pendingDestructiveRestore === destructiveRestoreForLoad) {
          if (
            recoveredCandidate.preservedNodeCount > 0 ||
            recoveredCandidate.preservedEdgeCount > 0 ||
            recoveredCandidate.replayedNodeCount > 0 ||
            recoveredCandidate.replayedEdgeCount > 0 ||
            (destructiveRestoreForLoad.deletionReplay?.removedAssetIds.length ?? 0) > 0
          ) {
            const deletionReplay = destructiveRestoreForLoad.deletionReplay;
            if (deletionReplay) {
              instance2.eventBus.emit({
                type: "persist:delete-intent",
                operationId: deletionReplay.operationId,
                removedNodeIds: deletionReplay.removedNodeIds,
                removedEdgeIds: deletionReplay.removedEdgeIds,
                removedAssetIds: deletionReplay.removedAssetIds,
                highBlastConfirmed: deletionReplay.highBlastConfirmed,
              });
            }
            let recoveryPersist;
            instance2.eventBus.emit({
              type: "persist:flush",
              recoveryChainId: destructiveRestoreForLoad.recoveryChainId,
              waitUntil: (promise) => {
                recoveryPersist = promise;
              },
            });
            if (!recoveryPersist) {
              throw new Error("Canvas recovery could not acquire a durability barrier");
            }
            await recoveryPersist;
          }
          pendingDestructiveRestore = null;
          destructiveRestoreForLoad.resolve();
          void dataSource
            .reportCanvasRecovery?.({
              result: "restored",
              durationMs: performance.now() - destructiveRestoreForLoad.startedAt,
              preservedCandidateNodeCount: recoveryPreservedNodeCount,
              preservedCandidateEdgeCount: recoveryPreservedEdgeCount,
            })
            .catch(() => void 0);
        }
      } catch (err) {
        if (cancelled || loadAbortController.signal.aborted) {
          return;
        }
        const label = initial ? "initial load" : "reload";
        console.error(`[CanvasData] Failed to ${label}:`, err);
        loadErrorForEffect = classifyCanvasLoadFailure(
          err,
          hydratedNodeCountForEffect === null ? "initial" : "refresh",
        );
        loadRetryingForEffect = false;
        if (pendingDestructiveRestore) {
          const rejectedRestore = pendingDestructiveRestore;
          pendingDestructiveRestore = null;
          rejectedRestore.reject(err);
          void dataSource
            .reportCanvasRecovery?.({
              result: "failed",
              durationMs: performance.now() - rejectedRestore.startedAt,
              preservedCandidateNodeCount: recoveryPreservedNodeCount,
              preservedCandidateEdgeCount: recoveryPreservedEdgeCount,
            })
            .catch(() => void 0);
        }
        shouldScheduleUnhydratedRecovery =
          !snapshotReadSucceeded && shouldRecoverUnhydratedCanvas(err, hydratedNodeCountForEffect);
        if (snapshotReadSucceeded) {
          loadGuard.pending.length = 0;
        }
      } finally {
        const shouldRunCoalescedReload = finishCanvasSnapshotLoad(loadGuard);
        if (!cancelled && loadGuard.pending.length > 0) {
          const queued = loadGuard.pending.splice(0);
          try {
            for (const update2 of queued) {
              applyIncremental(update2);
            }
          } catch (error) {
            console.error("[CanvasData] Failed to replay queued canvas updates:", error);
            loadErrorForEffect = classifyCanvasLoadFailure(
              error,
              hydratedNodeCountForEffect === null ? "initial" : "refresh",
            );
            loadRetryingForEffect = false;
          }
        }
        publishLoadState(false);
        if (!cancelled && shouldRunCoalescedReload) {
          void load2(false);
        } else if (!cancelled && shouldScheduleUnhydratedRecovery) {
          unhydratedRecoveryTimer = window.setTimeout(() => {
            unhydratedRecoveryTimer = void 0;
            void load2(false);
          }, CANVAS_UNHYDRATED_RECOVERY_DELAY_MS);
        }
      }
    }
    function applyIncremental(update2) {
      if (cancelled) return;
      if (loadGuard.inFlight) {
        if (loadGuard.pending.length < 50) {
          loadGuard.pending.push(update2);
        }
        return;
      }
      let changed = false;
      const isAuthoritativeReconcile = update2.origin === "reconcile";
      const isGenerationStatusUpdate = update2.origin === "generation-status";
      const suppressNewNodeAffordances = update2.origin === "user-add" || isAuthoritativeReconcile;
      const normalizedUpdatedNodes = update2.updatedNodes?.map(normalizeServerUpdatedNode);
      if (update2.nodeIdReplacements?.length) {
        const liveIds = new Set(instance2.getGraph().nodes.map((node2) => node2.id));
        const applicable = update2.nodeIdReplacements.filter(({ oldNodeId }) =>
          liveIds.has(oldNodeId),
        );
        if (applicable.length > 0) {
          instance2.replaceServerNodeIds(applicable);
          const canonicalById = new Map(
            [...(update2.addedNodes ?? []), ...(normalizedUpdatedNodes ?? [])].map((node2) => [
              node2.id,
              node2,
            ]),
          );
          const metaAliases = [];
          const canonicalUpdates = [];
          for (const { oldNodeId, newNodeId } of applicable) {
            const previousSaved = savedPositionsRef.current.get(oldNodeId);
            const canonical = canonicalById.get(newNodeId);
            savedPositionsRef.current.delete(oldNodeId);
            if (previousSaved || canonical) {
              savedPositionsRef.current.set(newNodeId, {
                ...previousSaved,
                ...canonical,
                id: newNodeId,
              });
            }
            const assetId = canonical?.assetId ?? previousSaved?.assetId;
            if (assetId) hiddenAssetIdsRef.current.delete(assetId);
            if (canonical) {
              const liveNode = instance2.getGraph().nodes.find((node2) => node2.id === newNodeId);
              const runtimeData = mergeServerNodeDataPreservingPopoverDraft(
                mirrorImageFieldsIntoData(canonical),
                liveNode?.data,
              );
              canonicalUpdates.push({
                id: newNodeId,
                type: canonical.type,
                data: runtimeData,
                ...(canonical.assetId
                  ? {
                      assetId: canonical.assetId,
                    }
                  : {}),
                ...(canonical.size
                  ? {
                      size: canonical.size,
                    }
                  : {}),
                ...(canonical.meta
                  ? {
                      meta: {
                        ...canonical.meta,
                      },
                    }
                  : {}),
                hasParentId: true,
                parentId: canonical.parentId,
                ...("groupId" in canonical
                  ? {
                      groupId: canonical.groupId ?? null,
                    }
                  : {}),
                ...("round" in canonical
                  ? {
                      round: canonical.round ?? null,
                    }
                  : {}),
                ...(canonical.positions?.[mode2]
                  ? {
                      position: canonical.positions[mode2],
                    }
                  : {}),
              });
              const existingMeta = canonical.assetId
                ? (assetMetadataStore.getState().get(canonical.assetId) ??
                  assetMetadataStore.getState().get(oldNodeId))
                : void 0;
              const { meta: meta2 } = buildIncrementalNodeData(
                canonical,
                dataSource.resolveFileUrlById?.bind(dataSource),
                existingMeta,
              );
              if (meta2 && canonical.assetId) {
                metaAliases.push([canonical.assetId, meta2], [newNodeId, meta2]);
              }
            } else if (assetId) {
              const meta2 =
                assetMetadataStore.getState().get(assetId) ??
                assetMetadataStore.getState().get(oldNodeId);
              if (meta2) metaAliases.push([newNodeId, meta2]);
            }
          }
          if (canonicalUpdates.length > 0) {
            instance2.applyServerNodeUpdate(canonicalUpdates, mode2);
          }
          if (metaAliases.length > 0) {
            assetMetadataStore.getState().setMany(metaAliases);
          }
          instance2.eventBus.emit({
            type: "persist:request",
          });
          changed = true;
        }
      }
      const addedEdges = update2.addedEdges ?? [];
      const shouldApplyAtomicMultiImageShape =
        !!update2.addedNodes?.length &&
        !!normalizedUpdatedNodes?.length &&
        (isAuthoritativeReconcile ||
          normalizedUpdatedNodes.some((node2) => "groupId" in node2 || "round" in node2));
      const atomicallyAddedNodeIds = shouldApplyAtomicMultiImageShape
        ? new Set(update2.addedNodes?.map((node2) => node2.id) ?? [])
        : null;
      if (shouldApplyAtomicMultiImageShape) {
        const atomicMetaEntries = buildPersistedNodeAssetMetaEntries(
          [...(update2.addedNodes ?? []), ...(normalizedUpdatedNodes ?? [])],
          assetMetadataStore.getState().assets,
          dataSource.resolveFileUrlById?.bind(dataSource),
        );
        if (atomicMetaEntries.length > 0) {
          assetMetadataStore.getState().setMany(atomicMetaEntries);
        }
        for (const fileNode of update2.addedNodes ?? []) {
          savedPositionsRef.current.set(fileNode.id, fileNode);
        }
        for (const fileNode of normalizedUpdatedNodes ?? []) {
          savedPositionsRef.current.set(fileNode.id, fileNode);
        }
        instance2.applyServerCanvasUpdate(
          {
            addedNodes: update2.addedNodes,
            updatedNodes: normalizedUpdatedNodes,
          },
          mode2,
        );
        changed = true;
      }
      if (update2.addedNodes?.length) {
        const existingNodeIds = new Set(instance2.getGraph().nodes.map((n2) => n2.id));
        const canvasWasEmpty = existingNodeIds.size === 0;
        const newNodes = update2.addedNodes.filter(
          (n2) => !existingNodeIds.has(n2.id) && !atomicallyAddedNodeIds?.has(n2.id),
        );
        const racedPositionUpdates = [];
        for (const fileNode of update2.addedNodes) {
          if (!existingNodeIds.has(fileNode.id)) continue;
          const serverPos = fileNode.positions?.[mode2];
          if (serverPos) {
            savedPositionsRef.current.set(fileNode.id, fileNode);
            racedPositionUpdates.push({
              id: fileNode.id,
              position: serverPos,
            });
            changed = true;
          }
        }
        if (racedPositionUpdates.length > 0) {
          instance2.applyServerNodeUpdate(racedPositionUpdates, mode2);
        }
        for (const fileNode of newNodes) {
          savedPositionsRef.current.set(fileNode.id, fileNode);
        }
        const newCanvasNodes = [];
        const nodesWithSavedPos = new Set();
        const metaEntries = [];
        for (const fileNode of newNodes) {
          const existingMeta = fileNode.assetId
            ? assetMetadataStore.getState().get(fileNode.assetId)
            : void 0;
          const { data: data2, meta: meta2 } = buildIncrementalNodeData(
            fileNode,
            dataSource.resolveFileUrlById?.bind(dataSource),
            existingMeta,
          );
          if (meta2 && fileNode.assetId) {
            metaEntries.push([fileNode.assetId, meta2]);
            if (fileNode.id !== fileNode.assetId) {
              metaEntries.push([fileNode.id, meta2]);
            }
          }
          const isSubImage = !!fileNode.groupId && fileNode.meta?.hidden === true;
          newCanvasNodes.push({
            id: fileNode.id,
            type: fileNode.type,
            positions: {
              ...(fileNode.positions ?? {}),
            },
            size:
              (fileNode.type === "image" &&
              fileNode.data?.displaySize &&
              typeof fileNode.data.displaySize === "object" &&
              typeof fileNode.data.displaySize.width === "number" &&
              fileNode.data.displaySize.width > 0 &&
              typeof fileNode.data.displaySize.height === "number" &&
              fileNode.data.displaySize.height > 0
                ? {
                    width: Math.round(fileNode.data.displaySize.width),
                    height: Math.round(fileNode.data.displaySize.height),
                  }
                : void 0) ??
              fileNode.size ??
              computeNodeSize(meta2?.width, meta2?.height) ??
              defaultNodeSizeForType(fileNode.type),
            data: data2,
            ...(fileNode.assetId
              ? {
                  assetId: fileNode.assetId,
                }
              : {}),
            ...(fileNode.parentId
              ? {
                  parentId: fileNode.parentId,
                }
              : {}),
            ...(fileNode.meta
              ? {
                  meta: {
                    ...fileNode.meta,
                  },
                }
              : {}),
            ...(fileNode.isEmpty
              ? {
                  isEmpty: true,
                }
              : {}),
            // Flat groupId model: carry group membership so a gateway-added
            // sub (e.g. appendLoadingSlotsToExisting / a batch landing extra
            // images) lands as a real group member, not a stray standalone.
            ...(fileNode.groupId
              ? {
                  groupId: fileNode.groupId,
                }
              : {}),
            ...(Number.isInteger(fileNode.round)
              ? {
                  round: fileNode.round,
                }
              : {}),
          });
          if (fileNode.positions?.[mode2] || isSubImage) {
            nodesWithSavedPos.add(fileNode.id);
          }
        }
        if (metaEntries.length > 0) {
          assetMetadataStore.getState().setMany(metaEntries);
        }
        if (newCanvasNodes.length > 0) {
          const nodesWithPos = [];
          const nodesNeedingLayout = [];
          for (const n2 of newCanvasNodes) {
            (nodesWithSavedPos.has(n2.id) ? nodesWithPos : nodesNeedingLayout).push(n2);
          }
          const nodesReadyToInsert = [...nodesWithPos];
          if (nodesNeedingLayout.length > 0) {
            const allEdges = [...instance2.getGraph().edges, ...addedEdges];
            const derivedNodes = [];
            const otherNeedingLayout = [];
            for (const n2 of nodesNeedingLayout) {
              const sourceEdge = allEdges.find(
                (e2) => e2.target === n2.id && e2.type === "derivation",
              );
              if (sourceEdge) {
                derivedNodes.push(n2);
              } else {
                otherNeedingLayout.push(n2);
              }
            }
            for (const n2 of derivedNodes) {
              const sourceEdge = allEdges.find(
                (e2) => e2.target === n2.id && e2.type === "derivation",
              );
              if (!sourceEdge) continue;
              const pos = computeDerivedPositionFromGraph(
                instance2,
                sourceEdge.source,
                allEdges,
                n2,
                mode2,
              );
              n2.positions = {
                ...n2.positions,
                [mode2]: pos,
              };
              nodesReadyToInsert.push(n2);
            }
            if (otherNeedingLayout.length > 0) {
              const existing = [...instance2.getGraph().nodes, ...nodesReadyToInsert];
              const anchor = getViewportCenterRef.current?.();
              const layoutEdges = allEdges;
              const positions = instance2.layout.computeIncremental(
                "dagre",
                existing,
                otherNeedingLayout,
                layoutEdges,
                {
                  mode: mode2,
                  ...(anchor
                    ? {
                        anchor,
                      }
                    : {}),
                },
              );
              for (const n2 of otherNeedingLayout) {
                const pos = positions.get(n2.id);
                if (pos)
                  n2.positions = {
                    ...n2.positions,
                    [mode2]: pos,
                  };
                nodesReadyToInsert.push(n2);
              }
            }
          }
          instance2.addServerNodes(nodesReadyToInsert);
          changed = true;
          if (canvasWasEmpty && nodesReadyToInsert.length > 0 && !suppressNewNodeAffordances) {
            onFirstNodesPlacedRef.current?.(nodesReadyToInsert.map((n2) => n2.id));
          }
          if (newCanvasNodes.length > 0 && !suppressNewNodeAffordances) {
            const generatedIds = selectGeneratedMediaNodeIds(newCanvasNodes);
            if (generatedIds.length > 0) {
              onNodesAddedRef.current?.(generatedIds);
            }
          }
        }
      }
      if (update2.removedNodeIds?.length) {
        const before = instance2.getGraph().nodes.length;
        instance2.removeServerElements(update2.removedNodeIds, []);
        const after = instance2.getGraph().nodes.length;
        if (after !== before) changed = true;
      }
      if (addedEdges.length) {
        instance2.addServerEdges(addedEdges);
        changed = true;
      }
      if (update2.removedEdgeIds?.length) {
        const before = instance2.getGraph().edges.length;
        instance2.removeServerElements([], update2.removedEdgeIds);
        if (instance2.getGraph().edges.length !== before) changed = true;
      }
      if (normalizedUpdatedNodes?.length) {
        const metaPatch = [];
        const batchUpdates = [];
        for (const updatedFileNode of normalizedUpdatedNodes) {
          const runtimeData = mirrorImageFieldsIntoData(updatedFileNode);
          const runtimeNode = instance2.getGraph().nodes.find((n2) => n2.id === updatedFileNode.id);
          const incomingData = updatedFileNode.data;
          const isMediaRuntimeNode =
            updatedFileNode.type === CanvasNodeType.Image ||
            updatedFileNode.type === CanvasNodeType.Video ||
            updatedFileNode.type === CanvasNodeType.Audio;
          if (incomingData && isMediaRuntimeNode) {
            const current2 = generatingStateStore.getState().byNode.get(updatedFileNode.id);
            const persistedStatus = runtimeNode?.data?.status;
            const deferTransientVideoPending =
              updatedFileNode.type === CanvasNodeType.Video &&
              shouldDeferTransientPending(current2, incomingData);
            if (
              !deferTransientVideoPending &&
              shouldMirrorIncomingGeneratingData(current2, incomingData, persistedStatus)
            ) {
              generatingStateStore
                .getState()
                .mark(
                  updatedFileNode.id,
                  buildGeneratingInfoFromIncomingData(current2, incomingData),
                );
            }
          }
          if (
            isGenerationErrorStatus(incomingData?.status) ||
            incomingData?.status === "queue_paused"
          ) {
            generatingStateStore.getState().clear(updatedFileNode.id);
          }
          const wasEmpty = !!runtimeNode && !runtimeNode.assetId;
          const becameFilled = wasEmpty && !!updatedFileNode.assetId && !!updatedFileNode.type;
          const incomingStatus = incomingData?.status;
          const incomingResolvesNode =
            !!updatedFileNode.assetId &&
            incomingStatus !== "error" &&
            incomingStatus !== "loading" &&
            incomingStatus !== "generating" &&
            incomingStatus !== "pending";
          const incomingBringsNewAsset =
            incomingResolvesNode && runtimeNode?.assetId !== updatedFileNode.assetId;
          if (
            incomingBringsNewAsset &&
            generatingStateStore.getState().byNode.has(updatedFileNode.id)
          ) {
            generatingStateStore.getState().clear(updatedFileNode.id);
          }
          if (becameFilled) {
            instance2.stagePlaceholderFill(updatedFileNode.id, {
              type: updatedFileNode.type,
              assetId: updatedFileNode.assetId,
              data: updatedFileNode.data ?? {},
              size: updatedFileNode.size,
            });
            if (isAuthoritativeReconcile) {
              batchUpdates.push({
                id: updatedFileNode.id,
                meta: updatedFileNode.meta
                  ? {
                      ...updatedFileNode.meta,
                    }
                  : {},
                replaceMeta: true,
                hasParentId: true,
                parentId: updatedFileNode.parentId,
                groupId: updatedFileNode.groupId ?? null,
                round: updatedFileNode.round ?? null,
                ...(updatedFileNode.positions?.[mode2]
                  ? {
                      position: updatedFileNode.positions[mode2],
                    }
                  : {}),
              });
            }
            savedPositionsRef.current.set(
              updatedFileNode.id,
              isGenerationStatusUpdate
                ? mergeGenerationStatusSavedNode(
                    savedPositionsRef.current.get(updatedFileNode.id),
                    updatedFileNode,
                  )
                : updatedFileNode,
            );
          } else {
            const liveNode = instance2.getGraph().nodes.find((n2) => n2.id === updatedFileNode.id);
            if (liveNode) {
              const incomingPos = updatedFileNode.positions?.[mode2];
              const mergedRuntimeData = mergeServerNodeDataPreservingPopoverDraft(
                runtimeData,
                liveNode.data,
              );
              const incomingAssetId =
                typeof updatedFileNode.assetId === "string" && updatedFileNode.assetId.length > 0
                  ? updatedFileNode.assetId
                  : void 0;
              const generationStatusUpdate = isGenerationStatusUpdate
                ? toGenerationStatusRuntimeUpdate(liveNode, updatedFileNode, mergedRuntimeData)
                : null;
              if (generationStatusUpdate) {
                batchUpdates.push(generationStatusUpdate);
              } else {
                batchUpdates.push({
                  id: updatedFileNode.id,
                  type: updatedFileNode.type,
                  data: mergedRuntimeData,
                  ...(incomingAssetId
                    ? {
                        assetId: incomingAssetId,
                      }
                    : updatedFileNode.type === CanvasNodeType.Placeholder
                      ? {
                          assetId: null,
                        }
                      : {}),
                  ...(updatedFileNode.size
                    ? {
                        size: updatedFileNode.size,
                      }
                    : {}),
                  ...(updatedFileNode.meta
                    ? {
                        meta: {
                          ...updatedFileNode.meta,
                        },
                      }
                    : isAuthoritativeReconcile
                      ? {
                          meta: {},
                        }
                      : {}),
                  ...(isAuthoritativeReconcile
                    ? {
                        replaceMeta: true,
                      }
                    : {}),
                  hasParentId: true,
                  parentId: updatedFileNode.parentId,
                  // Flat groupId model: sync groupId / round so the
                  // subImagesByParent index stays consistent with gateway state.
                  // Ordinary updates are partial: absent means "no change".
                  // Reconciliation updates are full snapshots: absent means the
                  // stale renderer field must be cleared.
                  ...(isAuthoritativeReconcile || "groupId" in updatedFileNode
                    ? {
                        groupId: updatedFileNode.groupId ?? null,
                      }
                    : {}),
                  ...(isAuthoritativeReconcile || "round" in updatedFileNode
                    ? {
                        round: updatedFileNode.round ?? null,
                      }
                    : {}),
                  ...(incomingPos
                    ? {
                        position: incomingPos,
                      }
                    : {}),
                });
              }
            }
            const baseAssetId = updatedFileNode.assetId ?? updatedFileNode.id;
            if (baseAssetId) {
              const clones = instance2.getGraph().nodes.filter((n2) => {
                const sep = n2.id.lastIndexOf("~");
                return sep > 0 && n2.id.slice(0, sep) === baseAssetId;
              });
              for (const clone2 of clones) {
                const mergedData = {
                  ...runtimeData,
                  ...(clone2.data ?? {}),
                };
                batchUpdates.push({
                  id: clone2.id,
                  data: mergedData,
                  ...(updatedFileNode.size
                    ? {
                        size: updatedFileNode.size,
                      }
                    : {}),
                });
              }
            }
            const existingSaved = savedPositionsRef.current.get(updatedFileNode.id);
            if (existingSaved || updatedFileNode.assetId || isAuthoritativeReconcile) {
              const nextSaved = isGenerationStatusUpdate
                ? mergeGenerationStatusSavedNode(existingSaved, updatedFileNode)
                : {
                    ...existingSaved,
                    ...updatedFileNode,
                  };
              if (isAuthoritativeReconcile) {
                if (!updatedFileNode.groupId) delete nextSaved.groupId;
                if (!Number.isInteger(updatedFileNode.round)) delete nextSaved.round;
                if (!updatedFileNode.meta) delete nextSaved.meta;
                if (updatedFileNode.isEmpty !== true) delete nextSaved.isEmpty;
              }
              savedPositionsRef.current.set(updatedFileNode.id, nextSaved);
            }
          }
          if (updatedFileNode.assetId) {
            const existing =
              assetMetadataStore.getState().get(updatedFileNode.id) ??
              assetMetadataStore.getState().get(updatedFileNode.assetId);
            const { meta: meta2 } = buildIncrementalNodeData(
              updatedFileNode,
              dataSource.resolveFileUrlById?.bind(dataSource),
              existing,
            );
            if (meta2) {
              metaPatch.push([updatedFileNode.assetId, meta2]);
              if (updatedFileNode.id !== updatedFileNode.assetId) {
                metaPatch.push([updatedFileNode.id, meta2]);
              }
            }
          }
          changed = true;
        }
        if (metaPatch.length > 0) {
          assetMetadataStore.getState().setMany(metaPatch);
        }
        if (batchUpdates.length > 0) {
          instance2.applyServerNodeUpdate(batchUpdates, mode2);
        }
      }
      if (changed) {
        recordCurrentCanvasGraphMetrics(instance2, workspaceId2);
        if (isAuthoritativeReconcile) {
          instance2.eventBus.emit({
            type: "persist:baseline-invalidated",
          });
        }
      }
    }
    const retryLoadOwner = {
      instance: instance2,
      workspaceId: workspaceId2,
      run: () => {
        void load2(false);
      },
    };
    retryLoadOwnerRef.current = retryLoadOwner;
    if (!modeSwitchHandled) {
      void load2(true);
    } else {
      publishLoadState(false);
    }
    const bumpPersistenceMutationVersion = () => {
      persistenceMutationVersion += 1;
    };
    const unsubPersistRequest = instance2.eventBus.on(
      "persist:request",
      bumpPersistenceMutationVersion,
    );
    const unsubPersistFlush = instance2.eventBus.on(
      "persist:flush",
      bumpPersistenceMutationVersion,
    );
    const unsubDestructiveSaveRejected = instance2.eventBus.on(
      "persist:destructive-save-rejected",
      (event) => {
        console.error("[hilo/canvas] destructive save rejected; restoring last-good canvas");
        pendingDestructiveRestore?.reject(
          new Error("Canvas last-good restore was superseded by a newer rejection"),
        );
        const restorePromise = new Promise((resolve, reject) => {
          pendingDestructiveRestore = {
            request: event.request,
            recoveryChainId: event.recoveryChainId,
            mutationVersion: persistenceMutationVersion,
            candidate: event.candidate,
            deletionReplay: event.deletionReplay,
            startedAt: performance.now(),
            resolve,
            reject,
          };
        });
        if (event.waitUntil) event.waitUntil(restorePromise);
        else void restorePromise.catch(() => {});
        void load2(false);
      },
    );
    const unsubCanvas = dataSource.onCanvasUpdated(applyIncremental);
    const unsubFile = dataSource.onFileChanged((event) => {
      if (event?.paths?.length) {
        bumpFileVersion(event.paths);
      } else {
        bumpFileVersion();
      }
      if (event && !event.requiresCanvasReload) {
        return;
      }
      const multiInFlightReason = (() => {
        for (const node2 of instance2.getGraph().nodes) {
          if (node2.type === CanvasNodeType.Placeholder) return `placeholder:${node2.id}`;
          const data2 = node2.data;
          const statuses = Array.isArray(data2?.imageStatuses) ? data2.imageStatuses : null;
          if (statuses && statuses.length >= 2 && statuses.includes("loading")) {
            return `loading-slots:${node2.id}`;
          }
        }
        return void 0;
      })();
      if (multiInFlightReason) {
        console.debug(
          "[hilo/canvas] skipped reload: generation in flight (%s), paths=%s",
          multiInFlightReason,
          event?.paths?.join(",") ?? "(broad)",
        );
        return;
      }
      void load2(false);
    });
    const unsubGenerating =
      dataSource.onCanvasNodeGenerating?.((event) => {
        console.debug(
          "[node-generating] recv",
          event.action,
          event.nodeId,
          "prevUrl?",
          Boolean(assetMetadataStore.getState().get(event.nodeId)?.url),
        );
        if (event.action === "clear") {
          generatingStateStore.getState().clear(event.nodeId);
          return;
        }
        if (!instance2.getGraph().nodes.some((n2) => n2.id === event.nodeId)) return;
        const prevUrl = assetMetadataStore.getState().get(event.nodeId)?.url;
        generatingStateStore.getState().mark(event.nodeId, {
          prompt: event.prompt ?? "",
          model: event.model ?? "",
          modelId: event.modelId,
          backend: event.backend,
          params: event.params,
          phase: event.phase ?? "generating",
          prevUrl,
          error: event.error,
          errorStatus: event.errorStatus,
          estimatedRemainingWaitSeconds: event.estimatedRemainingWaitSeconds,
          generationStartedAt: event.generationStartedAt,
        });
      }) ?? (() => {});
    return () => {
      cancelled = true;
      pendingDestructiveRestore?.reject(new Error("Canvas last-good restore owner was disposed"));
      pendingDestructiveRestore = null;
      if (retryLoadOwnerRef.current === retryLoadOwner) {
        retryLoadOwnerRef.current = null;
      }
      if (unhydratedRecoveryTimer !== void 0) {
        window.clearTimeout(unhydratedRecoveryTimer);
      }
      loadAbortController.abort();
      unsubPersistRequest();
      unsubPersistFlush();
      unsubDestructiveSaveRejected();
      unsubCanvas();
      unsubFile();
      unsubGenerating();
      resetWorkspaceCanvasGraphMetrics(workspaceId2);
    };
  }, [assetMetadataStore, generatingStateStore, mode2, dataSource, instance2, workspaceId2]);
  return {
    loading,
    initialHydratedNodeCount,
    loadError,
    loadRetrying,
    retryLoad,
    savedPositionsRef,
    hiddenAssetIdsRef,
  };
}
