// use-persist.js
import { CanvasNodeType, measurePerf, reactExports } from "../vendor.js";
import { isAssetBackedNode } from "./compute-group-bounds-from-children.js";
import { normaliseHandle } from "./partition-user-removal-elements.js";
import {
  isUnmaterialisedGenerationNode,
  parseNodeId,
  sanitizeCanvasPositions,
} from "./find-free-position-from-anchor.js";
import { prunePersistedNodeData } from "./prune-persisted-node-data.js";
import {
  CANVAS_VERSION,
  prunePersistedEdgeData,
} from "./is-reexecutable-generation-node.js";
import {
  CANVAS_DESTRUCTIVE_SAVE_REJECTED_CODE,
  CANVAS_INVALID_SAVE_REJECTED_CODE,
  PERF_CANVAS_PERSIST_BUILD,
} from "../generation/to-workspace-browser-url.js";
import { PersistSaveQueue } from "./persist-save-queue.js";

function canAutoPersistAcrossDataSourceChange(previous2, next2) {
  const previousInstanceId = previous2.persistenceInstanceId;
  const nextInstanceId = next2.persistenceInstanceId;
  return (
    !previousInstanceId ||
    !nextInstanceId ||
    previousInstanceId === nextInstanceId
  );
}

class CanvasSnapshotNotHydratedError extends Error {
  constructor() {
    super(
      "Canvas snapshot is not hydrated; refusing to persist a partial graph",
    );
    this.name = "CanvasSnapshotNotHydratedError";
  }
}

function createDeletionOperationId() {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === "function")
    return randomUUID.call(globalThis.crypto);
  return `canvas-delete-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseCanvasSaveRejection(error) {
  if (!error || typeof error !== "object") return null;
  if (error.status !== 409) return null;
  const body2 = error.body;
  let parsed = body2;
  if (typeof body2 !== "string" && (!body2 || typeof body2 !== "object"))
    return null;
  try {
    if (typeof body2 === "string") parsed = JSON.parse(body2);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const code2 = parsed.code;
  if (
    code2 !== CANVAS_DESTRUCTIVE_SAVE_REJECTED_CODE &&
    code2 !== CANVAS_INVALID_SAVE_REJECTED_CODE
  ) {
    return null;
  }
  const reason = parsed.reason;
  return {
    code: code2,
    ...(reason === "missing_deletion_evidence" ||
    reason === "high_blast_confirmation_required"
      ? {
          reason,
        }
      : {}),
  };
}

function buildPersistedCanvasFile(params) {
  const { instance: instance2, mode: mode2, savedPositions } = params;
  const graph = instance2.getGraph();
  const persistedNodes = [];
  for (const n2 of graph.nodes) {
    const saved = savedPositions.get(n2.id);
    const positions = sanitizeCanvasPositions(n2.positions).positions;
    const dataMaybe = n2.data;
    const dataAssetId =
      typeof dataMaybe?.assetId === "string" && dataMaybe.assetId.length > 0
        ? dataMaybe.assetId
        : void 0;
    const isUserPlaceholder = n2.isEmpty === true;
    const isPluginNode2 =
      n2.type === CanvasNodeType.File && typeof n2.data?.pluginId === "string";
    const isUnmaterialisedGeneration = isUnmaterialisedGenerationNode(n2);
    const { assetId: parsedAssetId } = parseNodeId(n2.id);
    const assetId =
      dataAssetId ??
      n2.assetId ??
      saved?.assetId ??
      (isAssetBackedNode(n2.type) &&
      !isUserPlaceholder &&
      !isPluginNode2 &&
      !isUnmaterialisedGeneration
        ? parsedAssetId
        : void 0);
    const persistedData = n2.data
      ? prunePersistedNodeData(n2.data, {
          nodeType: n2.type,
          hasAssetId: assetId != null,
          hidden: n2.meta?.hidden === true,
        })
      : void 0;
    const isGroup = n2.type === CanvasNodeType.Group;
    let sizesField = {};
    if (isGroup) {
      const merged = {
        ...(saved?.sizes ?? {}),
        ...(n2.sizes ?? {}),
      };
      if (n2.size)
        merged[mode2] = {
          width: n2.size.width,
          height: n2.size.height,
        };
      if (Object.keys(merged).length > 0)
        sizesField = {
          sizes: merged,
        };
    }
    persistedNodes.push({
      id: n2.id,
      type: n2.type,
      positions,
      ...(n2.size
        ? {
            size: {
              width: n2.size.width,
              height: n2.size.height,
            },
          }
        : {}),
      ...sizesField,
      ...(assetId != null
        ? {
            assetId,
          }
        : {}),
      ...(n2.parentId != null
        ? {
            parentId: n2.parentId,
          }
        : {}),
      // Flat groupId model: persist image group membership.
      ...(typeof n2.groupId === "string" && n2.groupId.length > 0
        ? {
            groupId: n2.groupId,
          }
        : {}),
      ...(Number.isInteger(n2.round)
        ? {
            round: n2.round,
          }
        : {}),
      ...(n2.isEmpty === true
        ? {
            isEmpty: true,
          }
        : {}),
      ...(n2.meta
        ? {
            meta: {
              ...n2.meta,
            },
          }
        : {}),
      ...(persistedData
        ? {
            data: persistedData,
          }
        : {}),
    });
  }
  const updatedNodes = new Map();
  for (const n2 of persistedNodes) {
    updatedNodes.set(n2.id, n2);
  }
  const accumulatedHidden = new Set(params.previousHiddenAssetIds ?? []);
  const assetIdOf = (n2) => {
    if (typeof n2.assetId === "string" && n2.assetId.length > 0)
      return n2.assetId;
    const dataAssetId = n2.data?.assetId;
    return typeof dataAssetId === "string" && dataAssetId.length > 0
      ? dataAssetId
      : void 0;
  };
  const visibleAssetIds = new Set();
  const currentNodeIds = new Set();
  for (const n2 of persistedNodes) {
    currentNodeIds.add(n2.id);
    const a2 = assetIdOf(n2);
    if (a2) visibleAssetIds.add(a2);
  }
  for (const savedNode of savedPositions.values()) {
    if (!params.explicitDeletedNodeIds?.has(savedNode.id)) continue;
    const prevAssetId = assetIdOf(savedNode);
    if (!prevAssetId) continue;
    if (!visibleAssetIds.has(prevAssetId)) {
      accumulatedHidden.add(prevAssetId);
    }
  }
  for (const assetId of params.explicitDeletedAssetIds ?? []) {
    if (!visibleAssetIds.has(assetId)) accumulatedHidden.add(assetId);
  }
  for (const id2 of visibleAssetIds) accumulatedHidden.delete(id2);
  for (const id2 of currentNodeIds) accumulatedHidden.delete(id2);
  const persistedEdges = graph.edges.map((e2) => {
    const sourceHandle = normaliseHandle(e2.sourceHandle);
    const targetHandle = normaliseHandle(e2.targetHandle);
    const prunedData = prunePersistedEdgeData(e2.data);
    return {
      id: e2.id,
      source: e2.source,
      ...(sourceHandle !== void 0
        ? {
            sourceHandle,
          }
        : {}),
      target: e2.target,
      ...(targetHandle !== void 0
        ? {
            targetHandle,
          }
        : {}),
      type: e2.type ?? "default",
      ...(prunedData
        ? {
            data: prunedData,
          }
        : {}),
    };
  });
  const file = {
    version: CANVAS_VERSION,
    mode: mode2,
    nodes: persistedNodes,
    edges: persistedEdges,
    ...(accumulatedHidden.size > 0
      ? {
          hiddenAssetIds: [...accumulatedHidden],
        }
      : {}),
  };
  return {
    file,
    savedPositions: updatedNodes,
    hiddenAssetIds: accumulatedHidden,
  };
}

export function usePersist(options) {
  const {
    instance: instance2,
    dataSource,
    savedPositionsRef,
    hiddenAssetIdsRef,
    isHydrated,
    debounceMs = 500,
    onPersistenceStatusChange,
  } = options;
  const timerRef = reactExports.useRef(null);
  const saveQueuesRef = reactExports.useRef(new Map());
  const previousDataSourceRef = reactExports.useRef(dataSource);
  const persistenceStatusRef = reactExports.useRef("clean");
  const persistenceRequestRef = reactExports.useRef(0);
  const isHydratedRef = reactExports.useRef(isHydrated);
  isHydratedRef.current = isHydrated;
  const deferredUntilHydratedRef = reactExports.useRef(false);
  const hasLocalMutationRef = reactExports.useRef(false);
  const pendingDeletionBatchRef = reactExports.useRef(null);
  const statusListenerRef = reactExports.useRef(onPersistenceStatusChange);
  statusListenerRef.current = onPersistenceStatusChange;
  const deferredHandleRef = reactExports.useRef(null);
  const setPersistenceStatus = reactExports.useCallback((status) => {
    if (persistenceStatusRef.current === status) return;
    persistenceStatusRef.current = status;
    statusListenerRef.current?.(status);
  }, []);
  const beginPersistenceRequest = reactExports.useCallback(() => {
    const request = ++persistenceRequestRef.current;
    setPersistenceStatus("dirty");
    return request;
  }, [setPersistenceStatus]);
  const getQueue = reactExports.useCallback(() => {
    const existing = saveQueuesRef.current.get(dataSource);
    if (existing) return existing;
    const queue = new PersistSaveQueue({
      saveCanvas: (canvas, saveOptions) =>
        dataSource.saveCanvas(canvas, saveOptions),
      onError: (err) => console.error("[canvas] Failed to save canvas:", err),
    });
    saveQueuesRef.current.set(dataSource, queue);
    return queue;
  }, [dataSource]);
  const buildSnapshot = reactExports.useCallback(
    (mode2) => {
      const buildStart = performance.now();
      const pendingDeletionBatch = pendingDeletionBatchRef.current;
      const batchedNodeIds = [...(pendingDeletionBatch?.nodeIds ?? [])];
      const batchedEdgeIds = [...(pendingDeletionBatch?.edgeIds ?? [])];
      const currentNodeIds = new Set(
        instance2.getGraph().nodes.map((node2) => node2.id),
      );
      const deletedNodeIds = batchedNodeIds.filter(
        (nodeId) => !currentNodeIds.has(nodeId),
      );
      const deletedAssetIds = [...(pendingDeletionBatch?.assetIds ?? [])];
      const currentEdgeIds = new Set(
        instance2.getGraph().edges.map((edge) => edge.id),
      );
      const deletedEdgeIds = batchedEdgeIds.filter(
        (edgeId) => !currentEdgeIds.has(edgeId),
      );
      const {
        file,
        savedPositions,
        hiddenAssetIds: nextHidden,
      } = buildPersistedCanvasFile({
        instance: instance2,
        mode: mode2,
        savedPositions: savedPositionsRef.current,
        previousHiddenAssetIds: hiddenAssetIdsRef.current,
        explicitDeletedNodeIds: new Set(deletedNodeIds),
        explicitDeletedAssetIds: new Set(deletedAssetIds),
      });
      const nodeCount = file.nodes?.length ?? 0;
      measurePerf(PERF_CANVAS_PERSIST_BUILD, buildStart, {
        nodes: nodeCount,
        edges: file.edges?.length ?? 0,
      });
      const saveOptions =
        deletedNodeIds.length > 0 || deletedEdgeIds.length > 0
          ? {
              deletionIntent: {
                version: 1,
                operationId:
                  pendingDeletionBatch?.operationId ??
                  createDeletionOperationId(),
                removedNodeIds: deletedNodeIds,
                removedEdgeIds: deletedEdgeIds,
                ...(pendingDeletionBatch?.highBlastConfirmed
                  ? {
                      highBlastConfirmed: true,
                    }
                  : {}),
              },
            }
          : void 0;
      return {
        file,
        nodes: nodeCount,
        edges: file.edges?.length ?? 0,
        savedPositions,
        hiddenAssetIds: nextHidden,
        deletedNodeIds,
        deletedEdgeIds,
        deletedAssetIds,
        batchedNodeIds,
        batchedEdgeIds,
        deletionOperationId: pendingDeletionBatch?.operationId,
        saveOptions,
      };
    },
    [instance2, savedPositionsRef, hiddenAssetIdsRef],
  );
  const buildAndWait = reactExports.useCallback(
    async (mode2, request, recoveryChainId) => {
      if (!isHydratedRef.current) throw new CanvasSnapshotNotHydratedError();
      const snapshot2 = buildSnapshot(mode2);
      const consumeSnapshotDeletionBatch = () => {
        const pendingBatch = pendingDeletionBatchRef.current;
        if (
          !pendingBatch ||
          pendingBatch.operationId !== snapshot2.deletionOperationId
        )
          return;
        for (const nodeId of snapshot2.batchedNodeIds)
          pendingBatch.nodeIds.delete(nodeId);
        for (const edgeId of snapshot2.batchedEdgeIds)
          pendingBatch.edgeIds.delete(edgeId);
        for (const assetId of snapshot2.deletedAssetIds)
          pendingBatch.assetIds.delete(assetId);
        if (
          pendingBatch.nodeIds.size === 0 &&
          pendingBatch.edgeIds.size === 0 &&
          pendingBatch.assetIds.size === 0
        ) {
          pendingDeletionBatchRef.current = null;
        }
      };
      if (request === persistenceRequestRef.current) {
        setPersistenceStatus("saving");
      }
      try {
        await getQueue().enqueueAndWait(
          snapshot2.file,
          {
            nodes: snapshot2.nodes,
            edges: snapshot2.edges,
          },
          snapshot2.saveOptions,
        );
      } catch (error) {
        const rejection = parseCanvasSaveRejection(error);
        if (request === persistenceRequestRef.current && rejection) {
          if (recoveryChainId) throw error;
          consumeSnapshotDeletionBatch();
          const nextRecoveryChainId = createDeletionOperationId();
          const deletionIntent = snapshot2.saveOptions?.deletionIntent;
          const deletionReplay =
            rejection.code === CANVAS_DESTRUCTIVE_SAVE_REJECTED_CODE &&
            rejection.reason === "missing_deletion_evidence" &&
            deletionIntent
              ? {
                  operationId: deletionIntent.operationId,
                  removedNodeIds: [...deletionIntent.removedNodeIds],
                  removedEdgeIds: [...(deletionIntent.removedEdgeIds ?? [])],
                  removedAssetIds: snapshot2.deletedAssetIds,
                  highBlastConfirmed:
                    deletionIntent.highBlastConfirmed === true,
                }
              : void 0;
          let restorePromise;
          instance2.eventBus.emit({
            type: "persist:destructive-save-rejected",
            request,
            recoveryChainId: nextRecoveryChainId,
            candidate: snapshot2.file,
            deletionReplay,
            waitUntil: (promise) => {
              restorePromise = promise;
            },
          });
          if (restorePromise) {
            await restorePromise;
            getQueue().invalidateLastSaved();
            return;
          }
        }
        throw error;
      }
      if (request !== persistenceRequestRef.current) return;
      savedPositionsRef.current = snapshot2.savedPositions;
      hiddenAssetIdsRef.current = snapshot2.hiddenAssetIds;
      consumeSnapshotDeletionBatch();
    },
    [
      buildSnapshot,
      getQueue,
      hiddenAssetIdsRef,
      instance2,
      savedPositionsRef,
      setPersistenceStatus,
    ],
  );
  const trackPersistence = reactExports.useCallback(
    (request, promise) => {
      return promise.then(
        () => {
          if (request === persistenceRequestRef.current) {
            hasLocalMutationRef.current = false;
            setPersistenceStatus("clean");
          }
        },
        (error) => {
          if (request === persistenceRequestRef.current) {
            setPersistenceStatus("failed");
          }
          throw error;
        },
      );
    },
    [setPersistenceStatus],
  );
  const buildAndEnqueue = reactExports.useCallback(
    (mode2, request) => {
      void trackPersistence(request, buildAndWait(mode2, request)).catch(
        (err) => {
          console.error("[canvas] Failed to save canvas:", err);
        },
      );
    },
    [buildAndWait, trackPersistence],
  );
  reactExports.useLayoutEffect(() => {
    const previousDataSource = previousDataSourceRef.current;
    previousDataSourceRef.current = dataSource;
    if (previousDataSource === dataSource) return;
    persistenceRequestRef.current += 1;
    saveQueuesRef.current.get(previousDataSource)?.flushPendingNow();
    const hasLoadedGraph =
      instance2.getGraph().nodes.length > 0 ||
      savedPositionsRef.current.size > 0;
    if (!hasLoadedGraph || !isHydratedRef.current) return;
    if (!canAutoPersistAcrossDataSourceChange(previousDataSource, dataSource)) {
      if (persistenceStatusRef.current !== "clean") {
        setPersistenceStatus("failed");
      }
      return;
    }
    const request = beginPersistenceRequest();
    trackPersistence(request, buildAndWait(instance2.getMode(), request)).catch(
      (err) => {
        console.error(
          "[canvas] Failed to save canvas after dataSource change:",
          err,
        );
      },
    );
  }, [
    dataSource,
    beginPersistenceRequest,
    buildAndWait,
    instance2,
    setPersistenceStatus,
    trackPersistence,
  ]);
  const flushPending = reactExports.useCallback(() => {
    let hadPending = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      hadPending = true;
    }
    if (deferredHandleRef.current !== null) {
      cancelAnimationFrame(deferredHandleRef.current);
      deferredHandleRef.current = null;
      hadPending = true;
    }
    if (hadPending && isHydratedRef.current) {
      buildAndEnqueue(instance2.getMode(), persistenceRequestRef.current);
    } else if (hadPending) {
      deferredUntilHydratedRef.current = true;
    }
    saveQueuesRef.current.get(dataSource)?.flushPendingNow();
  }, [instance2, dataSource, buildAndEnqueue]);
  const scheduleSave = reactExports.useCallback(() => {
    hasLocalMutationRef.current = true;
    const request = beginPersistenceRequest();
    if (!isHydratedRef.current) {
      deferredUntilHydratedRef.current = true;
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      buildAndEnqueue(instance2.getMode(), request);
    }, debounceMs);
  }, [instance2, beginPersistenceRequest, buildAndEnqueue, debounceMs]);
  const saveImmediately = reactExports.useCallback(
    (event) => {
      if (!event?.recoveryChainId) hasLocalMutationRef.current = true;
      const request = beginPersistenceRequest();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (!isHydratedRef.current) {
        deferredUntilHydratedRef.current = true;
        if (event?.waitUntil) {
          event.waitUntil(
            trackPersistence(
              request,
              Promise.reject(new CanvasSnapshotNotHydratedError()),
            ),
          );
        }
        return;
      }
      if (event?.waitUntil) {
        if (deferredHandleRef.current !== null) {
          cancelAnimationFrame(deferredHandleRef.current);
          deferredHandleRef.current = null;
        }
        event.waitUntil(
          trackPersistence(
            request,
            buildAndWait(instance2.getMode(), request, event.recoveryChainId),
          ),
        );
        return;
      }
      if (deferredHandleRef.current !== null) {
        cancelAnimationFrame(deferredHandleRef.current);
      }
      deferredHandleRef.current = requestAnimationFrame(() => {
        deferredHandleRef.current = null;
        buildAndEnqueue(instance2.getMode(), request);
      });
    },
    [
      instance2,
      beginPersistenceRequest,
      buildAndEnqueue,
      buildAndWait,
      trackPersistence,
    ],
  );
  const flushAndWaitLatest = reactExports.useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (deferredHandleRef.current !== null) {
      cancelAnimationFrame(deferredHandleRef.current);
      deferredHandleRef.current = null;
    }
    if (
      !isHydratedRef.current &&
      !hasLocalMutationRef.current &&
      persistenceStatusRef.current === "clean"
    ) {
      return;
    }
    const request = beginPersistenceRequest();
    if (!isHydratedRef.current) {
      deferredUntilHydratedRef.current = true;
      await trackPersistence(
        request,
        Promise.reject(new CanvasSnapshotNotHydratedError()),
      );
      return;
    }
    await trackPersistence(request, buildAndWait(instance2.getMode(), request));
  }, [beginPersistenceRequest, buildAndWait, instance2, trackPersistence]);
  reactExports.useEffect(() => {
    if (!isHydrated || !deferredUntilHydratedRef.current) return;
    deferredUntilHydratedRef.current = false;
    const request = beginPersistenceRequest();
    buildAndEnqueue(instance2.getMode(), request);
  }, [beginPersistenceRequest, buildAndEnqueue, instance2, isHydrated]);
  const persistenceController = reactExports.useMemo(
    () => ({
      getStatus: () => persistenceStatusRef.current,
      flushAndWaitLatest,
    }),
    [flushAndWaitLatest],
  );
  reactExports.useEffect(() => {
    const unsubPersist = instance2.eventBus.on("persist:request", scheduleSave);
    const unsubFlush = instance2.eventBus.on("persist:flush", saveImmediately);
    const unsubDeleteIntent = instance2.eventBus.on(
      "persist:delete-intent",
      (event) => {
        hasLocalMutationRef.current = true;
        const pendingBatch = pendingDeletionBatchRef.current ?? {
          operationId: event.operationId ?? createDeletionOperationId(),
          nodeIds: new Set(),
          edgeIds: new Set(),
          assetIds: new Set(),
          highBlastConfirmed: false,
        };
        pendingDeletionBatchRef.current = pendingBatch;
        for (const nodeId of event.removedNodeIds)
          pendingBatch.nodeIds.add(nodeId);
        for (const edgeId of event.removedEdgeIds)
          pendingBatch.edgeIds.add(edgeId);
        for (const assetId of event.removedAssetIds)
          pendingBatch.assetIds.add(assetId);
        if (event.highBlastConfirmed) pendingBatch.highBlastConfirmed = true;
      },
    );
    const unsubBaseline = instance2.eventBus.on(
      "persist:baseline-invalidated",
      () => {
        saveQueuesRef.current.get(dataSource)?.invalidateLastSaved();
      },
    );
    const unsubMode = instance2.eventBus.on("mode:changed", flushPending);
    const supportsBeforeUnload =
      typeof window !== "undefined" &&
      typeof window.addEventListener === "function";
    const handleBeforeUnload = (event) => {
      flushPending();
      if (persistenceStatusRef.current !== "clean") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    if (supportsBeforeUnload) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }
    return () => {
      unsubPersist();
      unsubFlush();
      unsubDeleteIntent();
      unsubBaseline();
      unsubMode();
      if (supportsBeforeUnload) {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      }
      flushPending();
      if (previousDataSourceRef.current !== dataSource) {
        saveQueuesRef.current.delete(dataSource);
      }
    };
  }, [dataSource, instance2, scheduleSave, saveImmediately, flushPending]);
  return persistenceController;
}
