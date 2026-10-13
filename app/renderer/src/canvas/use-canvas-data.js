// use-canvas-data.js
import {
  buildNodeIdMetaAliases,
  buildPersistedNodeAssetMetaEntries,
  buildSavedNodeIndex,
  filterVisibleItems,
  normaliseHandle,
} from "./partition-user-removal-elements.js";
import {
  bumpFileVersion,
  recordCanvasGraphMetrics,
  resetWorkspaceCanvasGraphMetrics,
} from "../infra/use-plugin-metadata-store.js";
import { resolveAbsolutePositionFromGraph } from "./resolve-absolute-position-from-graph.js";
import {
  computeNodeSize,
  defaultNodeSizeForType,
  isGenerationErrorStatus,
  readGroupSize,
} from "./compute-group-bounds-from-children.js";
import { computeDerivedNodePosition } from "./resolve-derived-collision.js";
import { CanvasNodeType, reactExports, selectGeneratedMediaNodeIds } from "../vendor.js";
import { useAssetMetadataApi } from "../infra/agent-http-client.js";
import { buildCanvasNodes } from "./build-canvas-nodes.js";
import {
  layoutUnsavedNodes,
  reuseUnchangedNodeRefs,
} from "./layout-unsaved-nodes.js";
import {
  beginCanvasSnapshotLoad,
  buildIncrementalNodeData,
  classifyCanvasLoadFailure,
  finishCanvasSnapshotLoad,
  isGenerationErrorNode,
  isSameCanvasLoadOwner,
  loadLatestCanvasSnapshot,
  mergeGenerationStatusSavedNode,
  mergeServerNodeDataPreservingPopoverDraft,
  mirrorImageFieldsIntoData,
  shouldDeferTransientPending,
  shouldMirrorIncomingGeneratingData,
  shouldRecoverUnhydratedCanvas,
  toGenerationStatusRuntimeUpdate,
} from "./build-incremental-node-data.js";
import { buildGeneratingInfoFromIncomingData } from "./build-generating-info-from-incoming-data.js";
import { mergeRejectedCanvasCandidateAdditions } from "./merge-rejected-canvas-candidate-additions.js";
import { useGeneratingStateApi } from "../media-editing/package.jsx";
import { reconcileGroupGeometryForMode } from "./reconcile-group-geometry-for-mode.js";
import {
  isEmptyNode,
  sanitizeCanvasFileNodePositions,
} from "./find-free-position-from-anchor.js";

const CANVAS_UNHYDRATED_RECOVERY_DELAY_MS = 3e3;

function filterEdges(nodeIds, savedEdges) {
  const runtime = [];
  for (const edge of savedEdges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    const sourceHandle = normaliseHandle(edge.sourceHandle);
    const targetHandle = normaliseHandle(edge.targetHandle);
    runtime.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...(sourceHandle !== void 0
        ? {
            sourceHandle,
          }
        : {}),
      ...(targetHandle !== void 0
        ? {
            targetHandle,
          }
        : {}),
      ...(edge.type !== void 0
        ? {
            type: edge.type,
          }
        : {}),
      ...(edge.data !== void 0
        ? {
            data: edge.data,
          }
        : {}),
    });
  }
  return runtime;
}

function normalizeServerUpdatedNode(node) {
  const { groupId, round, ...rest } = node;
  return {
    ...rest,
    ...(groupId === null
      ? {
          groupId: void 0,
        }
      : typeof groupId === "string" && groupId.length > 0
        ? {
            groupId,
          }
        : {}),
    ...(round === null
      ? {
          round: void 0,
        }
      : Number.isInteger(round)
        ? {
            round,
          }
        : {}),
  };
}

function computeDerivedPositionFromGraph(
  instance,
  sourceNodeId,
  allEdges,
  newNode,
  mode,
) {
  const graphNodes = instance.getGraph().nodes;
  const sourceNode = graphNodes.find((node) => node.id === sourceNodeId);
  const sourcePos = sourceNode
    ? resolveAbsolutePositionFromGraph(sourceNode, mode, graphNodes)
    : void 0;
  const sourceSize =
    sourceNode?.size ?? defaultNodeSizeForType(sourceNode?.type ?? "image");
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
  for (const id of derivedNodeIds) {
    const node = graphNodes.find((node) => node.id === id);
    if (!node) continue;
    const pos = resolveAbsolutePositionFromGraph(node, mode, graphNodes);
    if (!pos) continue;
    const size = node.size ?? defaultNodeSizeForType(node.type);
    peers.push({
      x: pos.x,
      y: pos.y,
      width: size.width,
      height: size.height,
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

function recordCurrentCanvasGraphMetrics(instance, workspaceId) {
  const graph = instance.getGraph();
  recordCanvasGraphMetrics(
    {
      nodes: graph.nodes,
      edges: graph.edges,
    },
    workspaceId,
  );
}

export function useCanvasData(
  instance,
  mode,
  dataSource,
  getViewportCenter,
  options,
) {
  const workspaceId = options?.workspaceId;
  const [loadState, setLoadState] = reactExports.useState(() => ({
    instance,
    workspaceId,
    loading: true,
    initialHydratedNodeCount: null,
    loadError: null,
    loadRetrying: false,
  }));
  const ownsLoadState = isSameCanvasLoadOwner(
    loadState,
    instance,
    workspaceId,
  );
  const loading = ownsLoadState ? loadState.loading : true;
  const initialHydratedNodeCount = ownsLoadState
    ? loadState.initialHydratedNodeCount
    : null;
  const loadError = ownsLoadState ? loadState.loadError : null;
  const loadRetrying = ownsLoadState ? loadState.loadRetrying : false;
  const assetMetadataStore = useAssetMetadataApi();
  const onNodesAddedRef = reactExports.useRef(options?.onNodesAdded);
  onNodesAddedRef.current = options?.onNodesAdded;
  const onFirstNodesPlacedRef = reactExports.useRef(
    options?.onFirstNodesPlaced,
  );
  onFirstNodesPlacedRef.current = options?.onFirstNodesPlaced;
  const generatingStateStore = useGeneratingStateApi();
  const savedPositionsRef = reactExports.useRef(new Map());
  const hiddenAssetIdsRef = reactExports.useRef(new Set());
  const getViewportCenterRef = reactExports.useRef(getViewportCenter);
  getViewportCenterRef.current = getViewportCenter;
  const prevModeRef = reactExports.useRef(mode);
  const prevDataSourceRef = reactExports.useRef(dataSource);
  const prevWorkspaceIdRef = reactExports.useRef(workspaceId);
  const hydrationOwnerRef = reactExports.useRef({
    instance,
    workspaceId,
    nodeCount: null,
  });
  const loadErrorOwnerRef = reactExports.useRef({
    instance,
    workspaceId,
    error: null,
  });
  const retryLoadOwnerRef = reactExports.useRef(null);
  const retryLoad = reactExports.useCallback(() => {
    const owner = retryLoadOwnerRef.current;
    if (!owner || !isSameCanvasLoadOwner(owner, instance, workspaceId))
      return;
    owner.run();
  }, [instance, workspaceId]);
  reactExports.useEffect(() => {
    instance.setArtifactReferenceResolver((nodeId) => {
      const node = instance
        .getGraph()
        .nodes.find((candidate) => candidate.id === nodeId);
      const assets = assetMetadataStore.getState();
      const meta =
        (node?.assetId ? assets.get(node.assetId) : void 0) ??
        assets.get(nodeId);
      if (!meta) return void 0;
      const referenceIds = [
        ...(meta.referenceImageIds ?? []),
        ...(meta.referenceAudioIds ?? []),
        ...(meta.referenceVideoIds ?? []),
        ...(meta.referenceTextIds ?? []),
      ];
      return referenceIds.length > 0 ? referenceIds : void 0;
    });
    instance.setArtifactBackendResolver((nodeId) => {
      const node = instance
        .getGraph()
        .nodes.find((candidate) => candidate.id === nodeId);
      const assets = assetMetadataStore.getState();
      const meta =
        (node?.assetId ? assets.get(node.assetId) : void 0) ??
        assets.get(nodeId);
      return meta?.backend;
    });
    return () => {
      instance.setArtifactReferenceResolver(void 0);
      instance.setArtifactBackendResolver(void 0);
    };
  }, [instance, assetMetadataStore]);
  reactExports.useEffect(() => {
    let cancelled = false;
    let unhydratedRecoveryTimer;
    let persistenceMutationVersion = 0;
    let pendingDestructiveRestore = null;
    const loadAbortController = new AbortController();
    const prevMode = prevModeRef.current;
    const wasModeSwitched = prevMode !== mode;
    const dataSourceUnchanged = prevDataSourceRef.current === dataSource;
    const workspaceUnchanged = prevWorkspaceIdRef.current === workspaceId;
    prevModeRef.current = mode;
    prevDataSourceRef.current = dataSource;
    prevWorkspaceIdRef.current = workspaceId;
    const previousHydrationOwner = hydrationOwnerRef.current;
    let hydratedNodeCountForEffect = isSameCanvasLoadOwner(
      previousHydrationOwner,
      instance,
      workspaceId,
    )
      ? previousHydrationOwner.nodeCount
      : null;
    hydrationOwnerRef.current = {
      instance,
      workspaceId,
      nodeCount: hydratedNodeCountForEffect,
    };
    const previousLoadErrorOwner = loadErrorOwnerRef.current;
    let loadErrorForEffect = isSameCanvasLoadOwner(
      previousLoadErrorOwner,
      instance,
      workspaceId,
    )
      ? previousLoadErrorOwner.error
      : null;
    let loadRetryingForEffect = false;
    loadErrorOwnerRef.current = {
      instance,
      workspaceId,
      error: loadErrorForEffect,
    };
    const publishLoadState = (nextLoading) => {
      if (cancelled) return;
      loadErrorOwnerRef.current = {
        instance,
        workspaceId,
        error: loadErrorForEffect,
      };
      setLoadState((current) => {
        if (cancelled) return current;
        return {
          instance,
          workspaceId,
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
      const graph = instance.getGraph();
      const allSavedNodes = savedPositionsRef.current;
      const fileSnapshot = {
        version: 1,
        mode,
        nodes: Array.from(allSavedNodes.values()),
        edges: [],
      };
      const reconciled = reconcileGroupGeometryForMode(fileSnapshot, mode);
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
          mode,
        );
      }
      const nodes = graph.nodes.map((node) => {
        const saved = allSavedNodes.get(node.id);
        const next = {
          ...node,
          positions: {
            ...node.positions,
          },
        };
        if (saved?.positions) {
          next.positions = {
            ...next.positions,
            ...saved.positions,
          };
        }
        if (node.type === CanvasNodeType.Group) {
          const resolved = saved ? readGroupSize(saved, mode) : void 0;
          if (resolved) next.size = resolved;
          if (saved?.sizes)
            next.sizes = {
              ...saved.sizes,
            };
        } else if (saved?.size) {
          next.size = saved.size;
        }
        if (saved?.parentId !== void 0) next.parentId = saved.parentId;
        return next;
      });
      for (let index = 0; index < nodes.length; index++) {
        const node = nodes[index];
        if (node.positions[mode]) continue;
        const fromPrev = node.positions[prevMode];
        if (!fromPrev) continue;
        nodes[index] = {
          ...node,
          positions: {
            ...node.positions,
            [mode]: fromPrev,
          },
        };
        const saved = allSavedNodes.get(node.id);
        if (saved) {
          allSavedNodes.set(node.id, {
            ...saved,
            positions: {
              ...(saved.positions ?? {}),
              [mode]: fromPrev,
            },
          });
        }
      }
      const { nodes: finalNodes, needsPersist } = layoutUnsavedNodes(
        instance,
        nodes,
        allSavedNodes,
        mode,
        graph.edges,
      );
      reuseUnchangedNodeRefs(finalNodes, instance.getGraph().nodes);
      instance.replaceNodesFromAuthoritativeSnapshot(finalNodes);
      recordCurrentCanvasGraphMetrics(instance, workspaceId);
      if (needsPersist || reconciled.changed) {
        instance.eventBus.emit({
          type: "persist:request",
        });
      }
      modeSwitchHandled = true;
    }
    async function load(initial) {
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
          instance.getGraph().nodes.length > 0 ||
          savedPositionsRef.current.size > 0;
        if (!dataSourceUnchanged && shouldPersistBeforeReload) {
          let persistPromise;
          instance.eventBus.emit({
            type: "persist:flush",
            waitUntil: (promise) => {
              persistPromise = promise;
            },
          });
          if (persistPromise) {
            try {
              await persistPromise;
            } catch (err) {
              console.warn(
                "[hilo/canvas] skipped dataSource reload after persist failure",
                err,
              );
              return;
            }
          }
          if (cancelled) return;
        }
        const [items, savedGraphRaw] = await loadLatestCanvasSnapshot({
          state: loadGuard,
          signal: loadAbortController.signal,
          load: (signal) =>
            Promise.all([
              dataSource.loadItems(signal),
              dataSource.loadCanvas(signal),
            ]),
        });
        if (cancelled || loadAbortController.signal.aborted) return;
        snapshotReadSucceeded = true;
        destructiveRestoreForLoad = pendingDestructiveRestore;
        if (
          destructiveRestoreForLoad &&
          destructiveRestoreForLoad.mutationVersion !==
            persistenceMutationVersion
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
              durationMs:
                performance.now() - destructiveRestoreForLoad.startedAt,
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
        const reconciledLoad = reconcileGroupGeometryForMode(
          recoveredCandidate.canvas,
          mode,
        );
        const sanitizedLoad = sanitizeCanvasFileNodePositions(
          reconciledLoad.canvas.nodes,
        );
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
            mode,
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
          const runtimeIds = new Set(
            instance.getGraph().nodes.map((node) => node.id),
          );
          effectiveStandaloneNodes = standaloneNodes.filter((node) => {
            const keep = !isEmptyNode(node) || runtimeIds.has(node.id);
            if (!keep) intentionallyOmittedNodeIds.add(node.id);
            return keep;
          });
        }
        if (!isFirstHydration && !isAuthoritativeRestore) {
          for (const runtimeNode of instance.getGraph().nodes) {
            const rd = runtimeNode.data ?? {};
            const runtimeAssetId =
              typeof rd.assetId === "string" && rd.assetId.length > 0
                ? rd.assetId
                : typeof runtimeNode.assetId === "string" &&
                    runtimeNode.assetId.length > 0
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
        const mergeSavedDataIntoMeta = (saved, base) => {
          const data = saved?.data;
          if (!data) return base;
          const merged = {
            ...base,
          };
          const dataParams = data.params;
          if (dataParams && Object.keys(dataParams).length > 0) {
            merged.params = {
              ...(base.params ?? {}),
              ...dataParams,
            };
          }
          if (typeof data.lyrics === "string" && !merged.lyrics)
            merged.lyrics = data.lyrics;
          if (typeof data.backend === "string" && !merged.backend)
            merged.backend = data.backend;
          if (typeof data.model_id === "string" && !merged.model_id)
            merged.model_id = data.model_id;
          if (typeof data.voiceId === "string" && !merged.voiceId)
            merged.voiceId = data.voiceId;
          return merged;
        };
        const metaEntries = [];
        const metaByAssetId = new Map();
        for (const item of items) {
          const aliased = savedByAssetId.get(item.id);
          const meta = mergeSavedDataIntoMeta(aliased, item.meta);
          metaByAssetId.set(item.id, meta);
          metaEntries.push([item.id, meta]);
          if (aliased && aliased.id !== item.id) {
            metaEntries.push([aliased.id, meta]);
          }
        }
        for (const clone of cloneNodes) {
          const cloneAssetId =
            typeof clone.assetId === "string" && clone.assetId.length > 0
              ? clone.assetId
              : void 0;
          if (!cloneAssetId || clone.id === cloneAssetId) continue;
          const meta = metaByAssetId.get(cloneAssetId);
          if (meta) metaEntries.push([clone.id, meta]);
        }
        const persistedNodeMetaEntries = buildPersistedNodeAssetMetaEntries(
          allSavedNodes.values(),
          metaByAssetId,
          dataSource.resolveFileUrlById?.bind(dataSource),
        );
        for (const [assetId, meta] of persistedNodeMetaEntries) {
          metaByAssetId.set(assetId, meta);
        }
        metaEntries.push(...persistedNodeMetaEntries);
        metaEntries.push(
          ...buildNodeIdMetaAliases(allSavedNodes.values(), metaByAssetId),
        );
        assetMetadataStore.getState().replaceAll(metaEntries);
        const { nodes, syntheticSavedNodes } = buildCanvasNodes({
          visibleItems,
          savedByAssetId,
          mode,
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
                existingOrder: instance.getGraph().nodes.map((node) => node.id),
              }),
        });
        for (const [id, node] of syntheticSavedNodes) {
          allSavedNodes.set(id, node);
        }
        assetMetadataStore
          .getState()
          .setMany(
            buildNodeIdMetaAliases(syntheticSavedNodes.values(), metaByAssetId),
          );
        const nodeIdSet = new Set(nodes.map((node) => node.id));
        const allEdges = filterEdges(nodeIdSet, savedGraph.edges);
        savedPositionsRef.current = allSavedNodes;
        if (!isFirstHydration && !isAuthoritativeRestore) {
          const currentPositions = new Map(
            instance
              .getGraph()
              .nodes.map((node) => [node.id, node.positions?.[mode]]),
          );
          for (let index = 0; index < nodes.length; index++) {
            const node = nodes[index];
            if (allSavedNodes.get(node.id)?.positions?.[mode]) continue;
            const pos = currentPositions.get(node.id);
            if (pos) {
              nodes[index] = {
                ...node,
                positions: {
                  ...node.positions,
                  [mode]: pos,
                },
              };
              const saved = allSavedNodes.get(node.id);
              allSavedNodes.set(node.id, {
                ...(saved ?? {
                  id: node.id,
                  type: node.type,
                  positions: {},
                }),
                positions: {
                  ...(saved?.positions ?? {}),
                  [mode]: pos,
                },
              });
            }
          }
        }
        const anchor = !isFirstHydration
          ? getViewportCenterRef.current?.()
          : void 0;
        const { nodes: finalNodes, needsPersist } = layoutUnsavedNodes(
          instance,
          nodes,
          allSavedNodes,
          mode,
          allEdges,
          anchor,
        );
        if (!isFirstHydration && !isAuthoritativeRestore) {
          reuseUnchangedNodeRefs(finalNodes, instance.getGraph().nodes);
        }
        for (const node of finalNodes) {
          if (isGenerationErrorNode(node)) {
            generatingStateStore.getState().clear(node.id);
          }
        }
        instance.replaceNodesFromAuthoritativeSnapshot(finalNodes);
        instance.replaceEdgesFromAuthoritativeSnapshot(allEdges);
        recordCurrentCanvasGraphMetrics(instance, workspaceId);
        if (needsPersist || reconciledOnLoad || sanitizedLoad.changed) {
          instance.eventBus.emit({
            type: "persist:request",
          });
        }
        if (isFirstHydration || isAuthoritativeRestore) {
          instance.snapshot();
        }
        if (isFirstHydration) {
          hydratedNodeCountForEffect = finalNodes.length;
          hydrationOwnerRef.current = {
            instance,
            workspaceId,
            nodeCount: hydratedNodeCountForEffect,
          };
        }
        loadErrorForEffect = null;
        loadRetryingForEffect = false;
        if (
          destructiveRestoreForLoad &&
          pendingDestructiveRestore === destructiveRestoreForLoad
        ) {
          if (
            recoveredCandidate.preservedNodeCount > 0 ||
            recoveredCandidate.preservedEdgeCount > 0 ||
            recoveredCandidate.replayedNodeCount > 0 ||
            recoveredCandidate.replayedEdgeCount > 0 ||
            (destructiveRestoreForLoad.deletionReplay?.removedAssetIds.length ??
              0) > 0
          ) {
            const deletionReplay = destructiveRestoreForLoad.deletionReplay;
            if (deletionReplay) {
              instance.eventBus.emit({
                type: "persist:delete-intent",
                operationId: deletionReplay.operationId,
                removedNodeIds: deletionReplay.removedNodeIds,
                removedEdgeIds: deletionReplay.removedEdgeIds,
                removedAssetIds: deletionReplay.removedAssetIds,
                highBlastConfirmed: deletionReplay.highBlastConfirmed,
              });
            }
            let recoveryPersist;
            instance.eventBus.emit({
              type: "persist:flush",
              recoveryChainId: destructiveRestoreForLoad.recoveryChainId,
              waitUntil: (promise) => {
                recoveryPersist = promise;
              },
            });
            if (!recoveryPersist) {
              throw new Error(
                "Canvas recovery could not acquire a durability barrier",
              );
            }
            await recoveryPersist;
          }
          pendingDestructiveRestore = null;
          destructiveRestoreForLoad.resolve();
          void dataSource
            .reportCanvasRecovery?.({
              result: "restored",
              durationMs:
                performance.now() - destructiveRestoreForLoad.startedAt,
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
          !snapshotReadSucceeded &&
          shouldRecoverUnhydratedCanvas(err, hydratedNodeCountForEffect);
        if (snapshotReadSucceeded) {
          loadGuard.pending.length = 0;
        }
      } finally {
        const shouldRunCoalescedReload = finishCanvasSnapshotLoad(loadGuard);
        if (!cancelled && loadGuard.pending.length > 0) {
          const queued = loadGuard.pending.splice(0);
          try {
            for (const update of queued) {
              applyIncremental(update);
            }
          } catch (error) {
            console.error(
              "[CanvasData] Failed to replay queued canvas updates:",
              error,
            );
            loadErrorForEffect = classifyCanvasLoadFailure(
              error,
              hydratedNodeCountForEffect === null ? "initial" : "refresh",
            );
            loadRetryingForEffect = false;
          }
        }
        publishLoadState(false);
        if (!cancelled && shouldRunCoalescedReload) {
          void load(false);
        } else if (!cancelled && shouldScheduleUnhydratedRecovery) {
          unhydratedRecoveryTimer = window.setTimeout(() => {
            unhydratedRecoveryTimer = void 0;
            void load(false);
          }, CANVAS_UNHYDRATED_RECOVERY_DELAY_MS);
        }
      }
    }
    function applyIncremental(update) {
      if (cancelled) return;
      if (loadGuard.inFlight) {
        if (loadGuard.pending.length < 50) {
          loadGuard.pending.push(update);
        }
        return;
      }
      let changed = false;
      const isAuthoritativeReconcile = update.origin === "reconcile";
      const isGenerationStatusUpdate = update.origin === "generation-status";
      const suppressNewNodeAffordances =
        update.origin === "user-add" || isAuthoritativeReconcile;
      const normalizedUpdatedNodes = update.updatedNodes?.map(
        normalizeServerUpdatedNode,
      );
      if (update.nodeIdReplacements?.length) {
        const liveIds = new Set(
          instance.getGraph().nodes.map((node) => node.id),
        );
        const applicable = update.nodeIdReplacements.filter(({ oldNodeId }) =>
          liveIds.has(oldNodeId),
        );
        if (applicable.length > 0) {
          instance.replaceServerNodeIds(applicable);
          const canonicalById = new Map(
            [
              ...(update.addedNodes ?? []),
              ...(normalizedUpdatedNodes ?? []),
            ].map((node) => [node.id, node]),
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
              const liveNode = instance
                .getGraph()
                .nodes.find((node) => node.id === newNodeId);
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
                ...(canonical.positions?.[mode]
                  ? {
                      position: canonical.positions[mode],
                    }
                  : {}),
              });
              const existingMeta = canonical.assetId
                ? (assetMetadataStore.getState().get(canonical.assetId) ??
                  assetMetadataStore.getState().get(oldNodeId))
                : void 0;
              const { meta } = buildIncrementalNodeData(
                canonical,
                dataSource.resolveFileUrlById?.bind(dataSource),
                existingMeta,
              );
              if (meta && canonical.assetId) {
                metaAliases.push(
                  [canonical.assetId, meta],
                  [newNodeId, meta],
                );
              }
            } else if (assetId) {
              const meta =
                assetMetadataStore.getState().get(assetId) ??
                assetMetadataStore.getState().get(oldNodeId);
              if (meta) metaAliases.push([newNodeId, meta]);
            }
          }
          if (canonicalUpdates.length > 0) {
            instance.applyServerNodeUpdate(canonicalUpdates, mode);
          }
          if (metaAliases.length > 0) {
            assetMetadataStore.getState().setMany(metaAliases);
          }
          instance.eventBus.emit({
            type: "persist:request",
          });
          changed = true;
        }
      }
      const addedEdges = update.addedEdges ?? [];
      const shouldApplyAtomicMultiImageShape =
        !!update.addedNodes?.length &&
        !!normalizedUpdatedNodes?.length &&
        (isAuthoritativeReconcile ||
          normalizedUpdatedNodes.some(
            (node) => "groupId" in node || "round" in node,
          ));
      const atomicallyAddedNodeIds = shouldApplyAtomicMultiImageShape
        ? new Set(update.addedNodes?.map((node) => node.id) ?? [])
        : null;
      if (shouldApplyAtomicMultiImageShape) {
        const atomicMetaEntries = buildPersistedNodeAssetMetaEntries(
          [...(update.addedNodes ?? []), ...(normalizedUpdatedNodes ?? [])],
          assetMetadataStore.getState().assets,
          dataSource.resolveFileUrlById?.bind(dataSource),
        );
        if (atomicMetaEntries.length > 0) {
          assetMetadataStore.getState().setMany(atomicMetaEntries);
        }
        for (const fileNode of update.addedNodes ?? []) {
          savedPositionsRef.current.set(fileNode.id, fileNode);
        }
        for (const fileNode of normalizedUpdatedNodes ?? []) {
          savedPositionsRef.current.set(fileNode.id, fileNode);
        }
        instance.applyServerCanvasUpdate(
          {
            addedNodes: update.addedNodes,
            updatedNodes: normalizedUpdatedNodes,
          },
          mode,
        );
        changed = true;
      }
      if (update.addedNodes?.length) {
        const existingNodeIds = new Set(
          instance.getGraph().nodes.map((node) => node.id),
        );
        const canvasWasEmpty = existingNodeIds.size === 0;
        const newNodes = update.addedNodes.filter(
          (node) =>
            !existingNodeIds.has(node.id) && !atomicallyAddedNodeIds?.has(node.id),
        );
        const racedPositionUpdates = [];
        for (const fileNode of update.addedNodes) {
          if (!existingNodeIds.has(fileNode.id)) continue;
          const serverPos = fileNode.positions?.[mode];
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
          instance.applyServerNodeUpdate(racedPositionUpdates, mode);
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
          const { data, meta } = buildIncrementalNodeData(
            fileNode,
            dataSource.resolveFileUrlById?.bind(dataSource),
            existingMeta,
          );
          if (meta && fileNode.assetId) {
            metaEntries.push([fileNode.assetId, meta]);
            if (fileNode.id !== fileNode.assetId) {
              metaEntries.push([fileNode.id, meta]);
            }
          }
          const isSubImage =
            !!fileNode.groupId && fileNode.meta?.hidden === true;
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
              computeNodeSize(meta?.width, meta?.height) ??
              defaultNodeSizeForType(fileNode.type),
            data,
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
          if (fileNode.positions?.[mode] || isSubImage) {
            nodesWithSavedPos.add(fileNode.id);
          }
        }
        if (metaEntries.length > 0) {
          assetMetadataStore.getState().setMany(metaEntries);
        }
        if (newCanvasNodes.length > 0) {
          const nodesWithPos = [];
          const nodesNeedingLayout = [];
          for (const node of newCanvasNodes) {
            (nodesWithSavedPos.has(node.id)
              ? nodesWithPos
              : nodesNeedingLayout
            ).push(node);
          }
          const nodesReadyToInsert = [...nodesWithPos];
          if (nodesNeedingLayout.length > 0) {
            const allEdges = [...instance.getGraph().edges, ...addedEdges];
            const derivedNodes = [];
            const otherNeedingLayout = [];
            for (const node of nodesNeedingLayout) {
              const sourceEdge = allEdges.find(
                (edge) => edge.target === node.id && edge.type === "derivation",
              );
              if (sourceEdge) {
                derivedNodes.push(node);
              } else {
                otherNeedingLayout.push(node);
              }
            }
            for (const node of derivedNodes) {
              const sourceEdge = allEdges.find(
                (edge) => edge.target === node.id && edge.type === "derivation",
              );
              if (!sourceEdge) continue;
              const pos = computeDerivedPositionFromGraph(
                instance,
                sourceEdge.source,
                allEdges,
                node,
                mode,
              );
              node.positions = {
                ...node.positions,
                [mode]: pos,
              };
              nodesReadyToInsert.push(node);
            }
            if (otherNeedingLayout.length > 0) {
              const existing = [
                ...instance.getGraph().nodes,
                ...nodesReadyToInsert,
              ];
              const anchor = getViewportCenterRef.current?.();
              const layoutEdges = allEdges;
              const positions = instance.layout.computeIncremental(
                "dagre",
                existing,
                otherNeedingLayout,
                layoutEdges,
                {
                  mode,
                  ...(anchor
                    ? {
                        anchor,
                      }
                    : {}),
                },
              );
              for (const node of otherNeedingLayout) {
                const pos = positions.get(node.id);
                if (pos)
                  node.positions = {
                    ...node.positions,
                    [mode]: pos,
                  };
                nodesReadyToInsert.push(node);
              }
            }
          }
          instance.addServerNodes(nodesReadyToInsert);
          changed = true;
          if (
            canvasWasEmpty &&
            nodesReadyToInsert.length > 0 &&
            !suppressNewNodeAffordances
          ) {
            onFirstNodesPlacedRef.current?.(
              nodesReadyToInsert.map((node) => node.id),
            );
          }
          if (newCanvasNodes.length > 0 && !suppressNewNodeAffordances) {
            const generatedIds = selectGeneratedMediaNodeIds(newCanvasNodes);
            if (generatedIds.length > 0) {
              onNodesAddedRef.current?.(generatedIds);
            }
          }
        }
      }
      if (update.removedNodeIds?.length) {
        const before = instance.getGraph().nodes.length;
        instance.removeServerElements(update.removedNodeIds, []);
        const after = instance.getGraph().nodes.length;
        if (after !== before) changed = true;
      }
      if (addedEdges.length) {
        instance.addServerEdges(addedEdges);
        changed = true;
      }
      if (update.removedEdgeIds?.length) {
        const before = instance.getGraph().edges.length;
        instance.removeServerElements([], update.removedEdgeIds);
        if (instance.getGraph().edges.length !== before) changed = true;
      }
      if (normalizedUpdatedNodes?.length) {
        const metaPatch = [];
        const batchUpdates = [];
        for (const updatedFileNode of normalizedUpdatedNodes) {
          const runtimeData = mirrorImageFieldsIntoData(updatedFileNode);
          const runtimeNode = instance
            .getGraph()
            .nodes.find((node) => node.id === updatedFileNode.id);
          const incomingData = updatedFileNode.data;
          const isMediaRuntimeNode =
            updatedFileNode.type === CanvasNodeType.Image ||
            updatedFileNode.type === CanvasNodeType.Video ||
            updatedFileNode.type === CanvasNodeType.Audio;
          if (incomingData && isMediaRuntimeNode) {
            const current = generatingStateStore
              .getState()
              .byNode.get(updatedFileNode.id);
            const persistedStatus = runtimeNode?.data?.status;
            const deferTransientVideoPending =
              updatedFileNode.type === CanvasNodeType.Video &&
              shouldDeferTransientPending(current, incomingData);
            if (
              !deferTransientVideoPending &&
              shouldMirrorIncomingGeneratingData(
                current,
                incomingData,
                persistedStatus,
              )
            ) {
              generatingStateStore
                .getState()
                .mark(
                  updatedFileNode.id,
                  buildGeneratingInfoFromIncomingData(current, incomingData),
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
          const becameFilled =
            wasEmpty && !!updatedFileNode.assetId && !!updatedFileNode.type;
          const incomingStatus = incomingData?.status;
          const incomingResolvesNode =
            !!updatedFileNode.assetId &&
            incomingStatus !== "error" &&
            incomingStatus !== "loading" &&
            incomingStatus !== "generating" &&
            incomingStatus !== "pending";
          const incomingBringsNewAsset =
            incomingResolvesNode &&
            runtimeNode?.assetId !== updatedFileNode.assetId;
          if (
            incomingBringsNewAsset &&
            generatingStateStore.getState().byNode.has(updatedFileNode.id)
          ) {
            generatingStateStore.getState().clear(updatedFileNode.id);
          }
          if (becameFilled) {
            instance.stagePlaceholderFill(updatedFileNode.id, {
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
                ...(updatedFileNode.positions?.[mode]
                  ? {
                      position: updatedFileNode.positions[mode],
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
            const liveNode = instance
              .getGraph()
              .nodes.find((node) => node.id === updatedFileNode.id);
            if (liveNode) {
              const incomingPos = updatedFileNode.positions?.[mode];
              const mergedRuntimeData =
                mergeServerNodeDataPreservingPopoverDraft(
                  runtimeData,
                  liveNode.data,
                );
              const incomingAssetId =
                typeof updatedFileNode.assetId === "string" &&
                updatedFileNode.assetId.length > 0
                  ? updatedFileNode.assetId
                  : void 0;
              const generationStatusUpdate = isGenerationStatusUpdate
                ? toGenerationStatusRuntimeUpdate(
                    liveNode,
                    updatedFileNode,
                    mergedRuntimeData,
                  )
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
              const clones = instance.getGraph().nodes.filter((node) => {
                const sep = node.id.lastIndexOf("~");
                return sep > 0 && node.id.slice(0, sep) === baseAssetId;
              });
              for (const clone of clones) {
                const mergedData = {
                  ...runtimeData,
                  ...(clone.data ?? {}),
                };
                batchUpdates.push({
                  id: clone.id,
                  data: mergedData,
                  ...(updatedFileNode.size
                    ? {
                        size: updatedFileNode.size,
                      }
                    : {}),
                });
              }
            }
            const existingSaved = savedPositionsRef.current.get(
              updatedFileNode.id,
            );
            if (
              existingSaved ||
              updatedFileNode.assetId ||
              isAuthoritativeReconcile
            ) {
              const nextSaved = isGenerationStatusUpdate
                ? mergeGenerationStatusSavedNode(existingSaved, updatedFileNode)
                : {
                    ...existingSaved,
                    ...updatedFileNode,
                  };
              if (isAuthoritativeReconcile) {
                if (!updatedFileNode.groupId) delete nextSaved.groupId;
                if (!Number.isInteger(updatedFileNode.round))
                  delete nextSaved.round;
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
            const { meta } = buildIncrementalNodeData(
              updatedFileNode,
              dataSource.resolveFileUrlById?.bind(dataSource),
              existing,
            );
            if (meta) {
              metaPatch.push([updatedFileNode.assetId, meta]);
              if (updatedFileNode.id !== updatedFileNode.assetId) {
                metaPatch.push([updatedFileNode.id, meta]);
              }
            }
          }
          changed = true;
        }
        if (metaPatch.length > 0) {
          assetMetadataStore.getState().setMany(metaPatch);
        }
        if (batchUpdates.length > 0) {
          instance.applyServerNodeUpdate(batchUpdates, mode);
        }
      }
      if (changed) {
        recordCurrentCanvasGraphMetrics(instance, workspaceId);
        if (isAuthoritativeReconcile) {
          instance.eventBus.emit({
            type: "persist:baseline-invalidated",
          });
        }
      }
    }
    const retryLoadOwner = {
      instance,
      workspaceId,
      run: () => {
        void load(false);
      },
    };
    retryLoadOwnerRef.current = retryLoadOwner;
    if (!modeSwitchHandled) {
      void load(true);
    } else {
      publishLoadState(false);
    }
    const bumpPersistenceMutationVersion = () => {
      persistenceMutationVersion += 1;
    };
    const unsubPersistRequest = instance.eventBus.on(
      "persist:request",
      bumpPersistenceMutationVersion,
    );
    const unsubPersistFlush = instance.eventBus.on(
      "persist:flush",
      bumpPersistenceMutationVersion,
    );
    const unsubDestructiveSaveRejected = instance.eventBus.on(
      "persist:destructive-save-rejected",
      (event) => {
        console.error(
          "[hilo/canvas] destructive save rejected; restoring last-good canvas",
        );
        pendingDestructiveRestore?.reject(
          new Error(
            "Canvas last-good restore was superseded by a newer rejection",
          ),
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
        void load(false);
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
        for (const node of instance.getGraph().nodes) {
          if (node.type === CanvasNodeType.Placeholder)
            return `placeholder:${node.id}`;
          const data = node.data;
          const statuses = Array.isArray(data?.imageStatuses)
            ? data.imageStatuses
            : null;
          if (
            statuses &&
            statuses.length >= 2 &&
            statuses.includes("loading")
          ) {
            return `loading-slots:${node.id}`;
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
      void load(false);
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
        if (!instance.getGraph().nodes.some((node) => node.id === event.nodeId))
          return;
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
      pendingDestructiveRestore?.reject(
        new Error("Canvas last-good restore owner was disposed"),
      );
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
      resetWorkspaceCanvasGraphMetrics(workspaceId);
    };
  }, [
    assetMetadataStore,
    generatingStateStore,
    mode,
    dataSource,
    instance,
    workspaceId,
  ]);
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
