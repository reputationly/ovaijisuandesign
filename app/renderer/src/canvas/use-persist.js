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
  for (const node of graph.nodes) {
    const saved = savedPositions.get(node.id);
    const positions = sanitizeCanvasPositions(node.positions).positions;
    const dataMaybe = node.data;
    const dataAssetId =
      typeof dataMaybe?.assetId === "string" && dataMaybe.assetId.length > 0
        ? dataMaybe.assetId
        : void 0;
    const isUserPlaceholder = node.isEmpty === true;
    const isPluginNode2 =
      node.type === CanvasNodeType.File && typeof node.data?.pluginId === "string";
    const isUnmaterialisedGeneration = isUnmaterialisedGenerationNode(node);
    const { assetId: parsedAssetId } = parseNodeId(node.id);
    const assetId =
      dataAssetId ??
      node.assetId ??
      saved?.assetId ??
      (isAssetBackedNode(node.type) &&
      !isUserPlaceholder &&
      !isPluginNode2 &&
      !isUnmaterialisedGeneration
        ? parsedAssetId
        : void 0);
    const persistedData = node.data
      ? prunePersistedNodeData(node.data, {
          nodeType: node.type,
          hasAssetId: assetId != null,
          hidden: node.meta?.hidden === true,
        })
      : void 0;
    const isGroup = node.type === CanvasNodeType.Group;
    let sizesField = {};
    if (isGroup) {
      const merged = {
        ...(saved?.sizes ?? {}),
        ...(node.sizes ?? {}),
      };
      if (node.size)
        merged[mode2] = {
          width: node.size.width,
          height: node.size.height,
        };
      if (Object.keys(merged).length > 0)
        sizesField = {
          sizes: merged,
        };
    }
    persistedNodes.push({
      id: node.id,
      type: node.type,
      positions,
      ...(node.size
        ? {
            size: {
              width: node.size.width,
              height: node.size.height,
            },
          }
        : {}),
      ...sizesField,
      ...(assetId != null
        ? {
            assetId,
          }
        : {}),
      ...(node.parentId != null
        ? {
            parentId: node.parentId,
          }
        : {}),
      // Flat groupId model: persist image group membership.
      ...(typeof node.groupId === "string" && node.groupId.length > 0
        ? {
            groupId: node.groupId,
          }
        : {}),
      ...(Number.isInteger(node.round)
        ? {
            round: node.round,
          }
        : {}),
      ...(node.isEmpty === true
        ? {
            isEmpty: true,
          }
        : {}),
      ...(node.meta
        ? {
            meta: {
              ...node.meta,
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
  for (const node of persistedNodes) {
    updatedNodes.set(node.id, node);
  }
  const accumulatedHidden = new Set(params.previousHiddenAssetIds ?? []);
  const assetIdOf = (node) => {
    if (typeof node.assetId === "string" && node.assetId.length > 0)
      return node.assetId;
    const dataAssetId = node.data?.assetId;
    return typeof dataAssetId === "string" && dataAssetId.length > 0
      ? dataAssetId
      : void 0;
  };
  const visibleAssetIds = new Set();
  const currentNodeIds = new Set();
  for (const node of persistedNodes) {
    currentNodeIds.add(node.id);
    const assetId = assetIdOf(node);
    if (assetId) visibleAssetIds.add(assetId);
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
  for (const assetId of visibleAssetIds) accumulatedHidden.delete(assetId);
  for (const nodeId of currentNodeIds) accumulatedHidden.delete(nodeId);
  const persistedEdges = graph.edges.map((edge) => {
    const sourceHandle = normaliseHandle(edge.sourceHandle);
    const targetHandle = normaliseHandle(edge.targetHandle);
    const prunedData = prunePersistedEdgeData(edge.data);
    return {
      id: edge.id,
      source: edge.source,
      ...(sourceHandle !== void 0
        ? {
            sourceHandle,
          }
        : {}),
      target: edge.target,
      ...(targetHandle !== void 0
        ? {
            targetHandle,
          }
        : {}),
      type: edge.type ?? "default",
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
      onError: (error) => console.error("[canvas] Failed to save canvas:", error),
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
        (error) => {
          console.error("[canvas] Failed to save canvas:", error);
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
      (error) => {
        console.error(
          "[canvas] Failed to save canvas after dataSource change:",
          error,
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
  // 主进程关窗口 / 退出前会调用这份列表，等画布写完再拆进程。
  reactExports.useEffect(() => {
    const list = (window.__ovFlushCanvas ??= []);
    list.push(flushAndWaitLatest);
    return () => {
      const index = list.indexOf(flushAndWaitLatest);
      if (index >= 0) list.splice(index, 1);
    };
  }, [flushAndWaitLatest]);
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
