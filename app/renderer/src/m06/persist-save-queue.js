// persist-save-queue.js
import { useAssetMetadataApi, reactExports, CanvasNodeType, measurePerf } from "../vendor.js";
import { isAssetBackedNode } from "../m15/group-nodes-in-canvas.js";
import { getClipboard, normaliseHandle } from "../m15/remap-clipboard.js";
import { resolveNodeAssetId } from "../m15/remove-nodes-and-promote-group-mains.js";
import { parseNodeId, sanitizeCanvasPositions, isUnmaterialisedGenerationNode } from "../m15/resolve-derived-collision.js";
import {
  PERF_CANVAS_PERSIST_SAVE,
  PERF_CANVAS_PERSIST_QUEUE,
  CANVAS_DESTRUCTIVE_SAVE_REJECTED_CODE,
  CANVAS_INVALID_SAVE_REJECTED_CODE,
  PERF_CANVAS_PERSIST_BUILD,
} from "../m01/text-models.js";
import {
  stableCanvasHash,
  prunePersistedNodeData,
  prunePersistedEdgeData,
  CANVAS_VERSION,
} from "../m01/prune-persisted-node-data.js";
import {
  inferKind,
  isCrossWorkspacePaste,
  promoteToPrimary,
  readSourcePath,
} from "./use-group-execution.js";
function shouldPreserveImportedMediaClone(sourceNode, clipboard2) {
  const sourceAssetId = resolveNodeAssetId(sourceNode);
  if (!sourceAssetId) return false;
  const matchingNodes2 =
    clipboard2?.nodes.filter((candidate) => resolveNodeAssetId(candidate) === sourceAssetId) ?? [];
  const primarySource =
    matchingNodes2.find((candidate) => candidate.meta?.cloneOf == null) ?? matchingNodes2[0];
  return primarySource != null && primarySource.id !== sourceNode.id;
}
function retargetImportedMediaClone(node2, duplicated, assetMetadataStore) {
  const cloneOf = node2.meta?.cloneOf ?? node2.id;
  assetMetadataStore.getState().merge(node2.id, duplicated);
  return {
    ...node2,
    assetId: duplicated.assetId,
    data: {
      ...(node2.data ?? {}),
      assetId: duplicated.assetId,
      name: duplicated.name,
      path: duplicated.path,
      cloneOf,
    },
    meta: {
      ...node2.meta,
      cloneOf,
    },
  };
}
function createPromiseDedupe() {
  const inFlight = new Map();
  return {
    run(key2, factory) {
      const existing = inFlight.get(key2);
      if (existing) return existing;
      const promise = factory().catch((err) => {
        inFlight.delete(key2);
        throw err;
      });
      inFlight.set(key2, promise);
      return promise;
    },
    size() {
      return inFlight.size;
    },
  };
}
function createPasteNodeTransformer({
  assetMetadataStore,
  duplicateTextAsset,
  duplicateFileAsset,
  duplicateTableAsset,
  duplicateAssetByPath,
  getCurrentWorkspace,
}) {
  const noTextDup = !duplicateTextAsset;
  const noFileDup = !duplicateFileAsset;
  const noTableDup = !duplicateTableAsset;
  const noCrossWsDup = !duplicateAssetByPath;
  if (noTextDup && noFileDup && noTableDup && noCrossWsDup) {
    return void 0;
  }
  const dedupe2 = createPromiseDedupe();
  const cacheKey = (sourceWorkspace, sourcePath) => `${sourceWorkspace ?? ""}|${sourcePath}`;
  return async (node2, sourceNode) => {
    const clipboard2 = getClipboard();
    const sourceWorkspace = clipboard2?.sourceWorkspace;
    const currentWorkspace = getCurrentWorkspace?.();
    const crossWorkspace = isCrossWorkspacePaste(sourceWorkspace, currentWorkspace);
    if (
      node2.type === CanvasNodeType.Image ||
      node2.type === CanvasNodeType.Video ||
      node2.type === CanvasNodeType.Audio
    ) {
      if (!crossWorkspace) {
        const originAssetId =
          (typeof sourceNode.assetId === "string" && sourceNode.assetId.length > 0
            ? sourceNode.assetId
            : void 0) ?? sourceNode.data?.assetId;
        if (originAssetId && node2.id !== originAssetId) {
          const originMeta = assetMetadataStore.getState().get(originAssetId);
          if (originMeta) assetMetadataStore.getState().set(node2.id, originMeta);
        }
        return node2;
      }
      if (!duplicateAssetByPath) return node2;
      const sourcePath = readSourcePath(sourceNode, clipboard2, assetMetadataStore);
      if (!sourcePath) return node2;
      try {
        const duplicated = await dedupe2.run(cacheKey(sourceWorkspace, sourcePath), () =>
          duplicateAssetByPath({
            sourceWorkspace,
            sourceRelativePath: sourcePath,
            expectedKind: inferKind(node2.type),
          }),
        );
        assetMetadataStore.getState().merge(duplicated.assetId, duplicated);
        const rewrittenData = {
          ...node2.data,
          assetId: duplicated.assetId,
          name: duplicated.name,
          path: duplicated.path,
        };
        if (shouldPreserveImportedMediaClone(sourceNode, clipboard2)) {
          return retargetImportedMediaClone(node2, duplicated, assetMetadataStore);
        }
        const { cloneOf: _metaCloneOf, ...metaWithoutClone } = node2.meta ?? {};
        const { cloneOf: _dataCloneOf, ...dataWithoutClone } = rewrittenData;
        assetMetadataStore.getState().merge(node2.id, duplicated);
        return {
          ...node2,
          assetId: duplicated.assetId,
          data: dataWithoutClone,
          meta: Object.keys(metaWithoutClone).length > 0 ? metaWithoutClone : void 0,
        };
      } catch (err) {
        console.warn("[paste-transformer] cross-workspace media duplicate failed:", err);
        return node2;
      }
    }
    if (node2.type === CanvasNodeType.File) {
      const sourcePath = readSourcePath(sourceNode, clipboard2, assetMetadataStore);
      if (!sourcePath) return node2;
      if (crossWorkspace && duplicateAssetByPath) {
        try {
          const duplicated = await dedupe2.run(cacheKey(sourceWorkspace, sourcePath), () =>
            duplicateAssetByPath({
              sourceWorkspace,
              sourceRelativePath: sourcePath,
            }),
          );
          assetMetadataStore.getState().merge(duplicated.assetId, duplicated);
          return promoteToPrimary(node2, duplicated, assetMetadataStore);
        } catch (err) {
          console.warn("[paste-transformer] cross-workspace file duplicate failed:", err);
          return node2;
        }
      }
      if (!duplicateFileAsset) return node2;
      try {
        const duplicated = await duplicateFileAsset(sourcePath);
        assetMetadataStore.getState().merge(duplicated.assetId, duplicated);
        return promoteToPrimary(node2, duplicated, assetMetadataStore);
      } catch (err) {
        console.warn("[paste-transformer] file duplicate failed:", err);
        return node2;
      }
    }
    if (node2.type === CanvasNodeType.Text) {
      const sourcePath = readSourcePath(sourceNode, clipboard2, assetMetadataStore);
      if (!sourcePath) return node2;
      if (crossWorkspace && duplicateAssetByPath) {
        try {
          const duplicated2 = await dedupe2.run(cacheKey(sourceWorkspace, sourcePath), () =>
            duplicateAssetByPath({
              sourceWorkspace,
              sourceRelativePath: sourcePath,
              expectedKind: "text",
            }),
          );
          assetMetadataStore.getState().merge(duplicated2.assetId, duplicated2);
          return promoteToPrimary(node2, duplicated2, assetMetadataStore);
        } catch (err) {
          console.warn("[paste-transformer] cross-workspace text duplicate failed:", err);
          return node2;
        }
      }
      if (!duplicateTextAsset) return node2;
      let duplicated;
      try {
        duplicated = await duplicateTextAsset(sourcePath);
      } catch (err) {
        console.warn("[paste-transformer] text duplicate failed:", err);
        return node2;
      }
      assetMetadataStore.getState().merge(duplicated.assetId, duplicated);
      return promoteToPrimary(node2, duplicated, assetMetadataStore);
    }
    if (node2.type === CanvasNodeType.Table && duplicateTableAsset) {
      const sourceData = sourceNode.data;
      const sourcePath = sourceData?.tablePath;
      if (!sourcePath) return node2;
      const duplicated = await duplicateTableAsset(sourcePath, sourceData?.title);
      const { cloneOf: _metaCloneOf, ...metaWithoutClone } = node2.meta ?? {};
      const {
        cloneOf: _dataCloneOf,
        assetId: _dataAssetId,
        ...dataWithoutClone
      } = node2.data ?? {};
      return {
        ...node2,
        id: crypto.randomUUID(),
        assetId: void 0,
        data: {
          ...dataWithoutClone,
          tablePath: duplicated.tablePath,
          title: duplicated.title,
          tableRevision: void 0,
        },
        meta: Object.keys(metaWithoutClone).length > 0 ? metaWithoutClone : void 0,
      };
    }
    return node2;
  };
}
export function usePasteNodeTransformer({
  instance: instance2,
  duplicateTextAsset,
  duplicateFileAsset,
  duplicateTableAsset,
  duplicateAssetByPath,
  getCurrentWorkspace,
}) {
  const assetMetadataStore = useAssetMetadataApi();
  reactExports.useEffect(() => {
    const transformer = createPasteNodeTransformer({
      assetMetadataStore,
      duplicateTextAsset,
      duplicateFileAsset,
      duplicateTableAsset,
      duplicateAssetByPath,
      getCurrentWorkspace,
    });
    instance2.setPasteNodeTransformer(transformer);
    return () => {
      instance2.setPasteNodeTransformer(void 0);
    };
  }, [
    assetMetadataStore,
    duplicateTextAsset,
    duplicateFileAsset,
    duplicateTableAsset,
    duplicateAssetByPath,
    getCurrentWorkspace,
    instance2,
  ]);
}
function canAutoPersistAcrossDataSourceChange(previous2, next2) {
  const previousInstanceId = previous2.persistenceInstanceId;
  const nextInstanceId = next2.persistenceInstanceId;
  return !previousInstanceId || !nextInstanceId || previousInstanceId === nextInstanceId;
}
class PersistSaveQueue {
  saveCanvas;
  onError;
  now;
  measure;
  maxRetryAttempts;
  inFlight = null;
  pendingLatest = null;
  lastSavedContentHash = null;
  /** Latest snapshot that has not yet been proven durable. Retained for teardown flush. */
  lastFailedSnapshot = null;
  /** Highest queue sequence whose content is known to be durably saved. */
  lastSuccessfulSeq = 0;
  /** Latest transport error, retained so durability waiters receive its structured status/body. */
  lastFailure = null;
  /**
   * Highest sequence handed to the transport, including teardown flushes that
   * run alongside an older in-flight request. An older failure must never be
   * retained or retried after a newer snapshot has already been dispatched.
   */
  latestDispatchedSeq = 0;
  seq = 0;
  metrics = {
    enqueued: 0,
    actualSaves: 0,
    superseded: 0,
    skippedNoop: 0,
    failedSaves: 0,
    maxDepth: 0,
    inFlight: 0,
    pending: 0,
  };
  constructor(options) {
    this.saveCanvas = options.saveCanvas;
    this.onError = options.onError;
    this.now = options.now ?? (() => performance.now());
    this.measure = options.measure ?? measurePerf;
    this.maxRetryAttempts = options.maxRetryAttempts ?? 1;
  }
  enqueue(file, detail, saveOptions) {
    this.enqueueAndWait(file, detail, saveOptions).catch(() => {});
  }
  enqueueAndWait(file, detail, saveOptions) {
    const requestedAt = this.now();
    const contentHash = stableCanvasHash(file);
    const deletionIntent = saveOptions?.deletionIntent;
    const hash2 = deletionIntent
      ? `${contentHash}:delete:${[...new Set(deletionIntent.removedNodeIds)].sort().join(",")}:${[...new Set(deletionIntent.removedEdgeIds ?? [])].sort().join(",")}:${deletionIntent.highBlastConfirmed === true}`
      : contentHash;
    const snapshot2 = {
      file,
      contentHash,
      hash: hash2,
      seq: ++this.seq,
      requestedAt,
      detail: {
        nodes: file.nodes?.length ?? 0,
        edges: file.edges?.length ?? 0,
        mode: file.mode,
        ...detail,
      },
      retryAttempt: 0,
      saveOptions,
    };
    if (!deletionIntent && contentHash === this.lastSavedContentHash) {
      this.recordNoop(snapshot2, "duplicate");
      return Promise.resolve();
    }
    const duplicateQueued =
      this.inFlight && this.canSatisfy(this.inFlight, snapshot2)
        ? this.inFlight
        : this.pendingLatest && this.canSatisfy(this.pendingLatest, snapshot2)
          ? this.pendingLatest
          : null;
    if (duplicateQueued) {
      this.recordNoop(snapshot2, "duplicate");
      return this.waitForSeq(duplicateQueued.seq);
    }
    this.metrics = {
      ...this.metrics,
      enqueued: this.metrics.enqueued + 1,
    };
    if (this.inFlight) {
      if (this.pendingLatest && this.pendingLatest.hash !== hash2) {
        this.metrics = {
          ...this.metrics,
          superseded: this.metrics.superseded + 1,
        };
      }
      this.pendingLatest = snapshot2;
      this.updateDepth();
      this.measureQueue(snapshot2, "queued");
      return this.waitForSeq(snapshot2.seq);
    }
    this.start(snapshot2);
    return this.waitForSeq(snapshot2.seq);
  }
  waitForSeq(targetSeq) {
    if (this.lastSuccessfulSeq >= targetSeq) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const check = () => {
        if (this.lastSuccessfulSeq >= targetSeq) resolve();
        else if (!this.inFlight && !this.pendingLatest) {
          const failure = this.lastFailure;
          reject(
            failure && failure.seq >= targetSeq ? failure.error : new Error("Canvas save failed"),
          );
        } else setTimeout(check, 0);
      };
      check();
    });
  }
  getMetrics() {
    return this.metrics;
  }
  /**
   * Drop the "last successfully saved content" dedupe baseline.
   *
   * Call when the gateway is known to have diverged from the last snapshot
   * this queue sent — e.g. a `canvas_updated` broadcast with
   * origin='reconcile' means the gateway arbitrated the save and persisted
   * something ELSE. Keeping the old hash would make the queue treat the next
   * identical-to-what-I-sent snapshot as a duplicate no-op, silently never
   * writing it — the "repeat the exact promote the gateway just reverted"
   * wedge. In-flight/pending snapshots are untouched: they are newer than the
   * reconcile by construction (full-graph snapshots supersede).
   */
  invalidateLastSaved() {
    this.lastSavedContentHash = null;
  }
  /**
   * Synchronously kick off the latest pending save, bypassing the normal
   * "wait for inFlight to settle" gate. Used on `beforeunload` / unmount,
   * where the `.finally` continuation that would normally `start()` the
   * pending snapshot will never run (the page/component is going away).
   *
   * Without this, a save enqueued while another was inFlight lives only in
   * `pendingLatest` and is silently dropped at teardown. We can't await the
   * inFlight one, so we fire the pending file immediately and let the host's
   * transport (keepalive fetch, if any) carry it out. Returns the file that
   * was flushed, or null if there was nothing pending.
   */
  flushPendingNow() {
    const failedCandidate =
      this.lastFailedSnapshot &&
      this.lastFailedSnapshot.seq > this.lastSuccessfulSeq &&
      this.lastFailedSnapshot.seq >= (this.inFlight?.seq ?? 0)
        ? this.lastFailedSnapshot
        : null;
    const next2 =
      !this.pendingLatest || (failedCandidate?.seq ?? 0) > this.pendingLatest.seq
        ? failedCandidate
        : this.pendingLatest;
    if (!next2) return null;
    if (!next2.saveOptions?.deletionIntent && next2.contentHash === this.lastSavedContentHash) {
      this.recordNoop(next2, "flush-noop");
      this.pendingLatest = null;
      this.lastFailedSnapshot = null;
      this.updateDepth();
      return null;
    }
    this.pendingLatest = null;
    this.lastFailedSnapshot = null;
    this.metrics = {
      ...this.metrics,
      actualSaves: this.metrics.actualSaves + 1,
    };
    this.latestDispatchedSeq = Math.max(this.latestDispatchedSeq, next2.seq);
    this.saveCanvas(next2.file, next2.saveOptions)
      .then((result) => {
        if (result?.superseded) {
          if (next2.seq >= this.latestDispatchedSeq) {
            this.lastFailedSnapshot = next2;
          }
          this.metrics = {
            ...this.metrics,
            superseded: this.metrics.superseded + 1,
          };
          return;
        }
        this.lastSavedContentHash = next2.contentHash;
        this.lastSuccessfulSeq = Math.max(this.lastSuccessfulSeq, next2.seq);
        if ((this.lastFailure?.seq ?? 0) <= next2.seq) {
          this.lastFailure = null;
        }
        if ((this.lastFailedSnapshot?.seq ?? 0) <= next2.seq) {
          this.lastFailedSnapshot = null;
        }
      })
      .catch((err) => {
        this.lastFailure = {
          seq: next2.seq,
          error: err,
        };
        if (isRetryableCanvasSaveError(err) && next2.seq >= this.latestDispatchedSeq) {
          this.lastFailedSnapshot = next2;
        }
        this.metrics = {
          ...this.metrics,
          failedSaves: this.metrics.failedSaves + 1,
        };
        this.onError?.(err);
      });
    this.updateDepth();
    return next2.file;
  }
  recordNoop(snapshot2, reason) {
    this.metrics = {
      ...this.metrics,
      skippedNoop: this.metrics.skippedNoop + 1,
    };
    this.measureQueue(snapshot2, reason);
  }
  canSatisfy(existing, incoming) {
    if (existing.hash === incoming.hash) return true;
    return !incoming.saveOptions?.deletionIntent && existing.contentHash === incoming.contentHash;
  }
  start(snapshot2) {
    if ((this.lastFailedSnapshot?.seq ?? 0) < snapshot2.seq) {
      this.lastFailedSnapshot = null;
    }
    this.inFlight = snapshot2;
    this.latestDispatchedSeq = Math.max(this.latestDispatchedSeq, snapshot2.seq);
    this.metrics = {
      ...this.metrics,
      actualSaves: this.metrics.actualSaves + 1,
      inFlight: 1,
    };
    this.updateDepth();
    this.measureQueue(snapshot2, "start");
    const saveStart = this.now();
    let failed = false;
    let superseded = false;
    let retryableFailure = false;
    this.saveCanvas(snapshot2.file, snapshot2.saveOptions)
      .then((result) => {
        const completedAt = this.now();
        if (result?.superseded) {
          failed = true;
          superseded = true;
          const error = new Error(
            `Canvas snapshot was superseded by writer revision ${result.revision ?? "unknown"}`,
          );
          this.lastFailure = {
            seq: snapshot2.seq,
            error,
          };
          if (snapshot2.seq >= this.latestDispatchedSeq) {
            this.lastFailedSnapshot = snapshot2;
          }
          this.metrics = {
            ...this.metrics,
            superseded: this.metrics.superseded + 1,
          };
          this.onError?.(error);
          return;
        }
        this.lastSavedContentHash = snapshot2.contentHash;
        if ((this.lastFailedSnapshot?.seq ?? 0) <= snapshot2.seq) {
          this.lastFailedSnapshot = null;
        }
        this.lastSuccessfulSeq = Math.max(this.lastSuccessfulSeq, snapshot2.seq);
        if ((this.lastFailure?.seq ?? 0) <= snapshot2.seq) {
          this.lastFailure = null;
        }
        this.measure(PERF_CANVAS_PERSIST_SAVE, snapshot2.requestedAt, {
          ...snapshot2.detail,
          saveSeq: snapshot2.seq,
          hash: snapshot2.hash,
          queueWaitMs: Math.round(saveStart - snapshot2.requestedAt),
          httpMs: Math.round(completedAt - saveStart),
          inFlight: 1,
          queued: this.pendingLatest ? 1 : 0,
          superseded: this.metrics.superseded,
          skippedNoop: this.metrics.skippedNoop,
          maxDepth: this.metrics.maxDepth,
        });
      })
      .catch((err) => {
        failed = true;
        retryableFailure = isRetryableCanvasSaveError(err);
        this.lastFailure = {
          seq: snapshot2.seq,
          error: err,
        };
        if (retryableFailure && snapshot2.seq >= this.latestDispatchedSeq) {
          this.lastFailedSnapshot = snapshot2;
        }
        const completedAt = this.now();
        this.metrics = {
          ...this.metrics,
          failedSaves: this.metrics.failedSaves + 1,
        };
        this.measure(PERF_CANVAS_PERSIST_SAVE, snapshot2.requestedAt, {
          ...snapshot2.detail,
          saveSeq: snapshot2.seq,
          hash: snapshot2.hash,
          queueWaitMs: Math.round(saveStart - snapshot2.requestedAt),
          httpMs: Math.round(completedAt - saveStart),
          inFlight: 1,
          queued: this.pendingLatest ? 1 : 0,
          superseded: this.metrics.superseded,
          skippedNoop: this.metrics.skippedNoop,
          maxDepth: this.metrics.maxDepth,
          error: err instanceof Error ? err.message : String(err),
        });
        this.onError?.(err);
      })
      .finally(() => {
        if (this.inFlight?.seq === snapshot2.seq) {
          this.inFlight = null;
        }
        this.metrics = {
          ...this.metrics,
          inFlight: 0,
        };
        const next2 = this.pendingLatest;
        this.pendingLatest = null;
        this.metrics = {
          ...this.metrics,
          pending: 0,
        };
        if (!next2) {
          if (
            failed &&
            !superseded &&
            retryableFailure &&
            snapshot2.seq >= this.latestDispatchedSeq &&
            snapshot2.retryAttempt < this.maxRetryAttempts
          ) {
            const retry = {
              ...snapshot2,
              retryAttempt: snapshot2.retryAttempt + 1,
            };
            this.pendingLatest = retry;
            this.updateDepth();
            queueMicrotask(() => {
              if (this.inFlight || this.pendingLatest?.seq !== retry.seq) return;
              const latest2 = this.pendingLatest;
              this.pendingLatest = null;
              if (latest2) this.start(latest2);
            });
            return;
          }
          this.updateDepth();
          return;
        }
        if (next2.contentHash === this.lastSavedContentHash) {
          this.lastSuccessfulSeq = Math.max(this.lastSuccessfulSeq, next2.seq);
          this.recordNoop(next2, "saved-while-pending");
          this.updateDepth();
          return;
        }
        this.start(next2);
      });
  }
  updateDepth() {
    const inFlight = this.inFlight ? 1 : 0;
    const pending2 = this.pendingLatest ? 1 : 0;
    const depth2 = inFlight + pending2;
    this.metrics = {
      ...this.metrics,
      inFlight,
      pending: pending2,
      maxDepth: Math.max(this.metrics.maxDepth, depth2),
    };
  }
  measureQueue(snapshot2, event) {
    this.measure(PERF_CANVAS_PERSIST_QUEUE, snapshot2.requestedAt, {
      ...snapshot2.detail,
      event,
      saveSeq: snapshot2.seq,
      hash: snapshot2.hash,
      inFlight: this.inFlight ? 1 : 0,
      pending: this.pendingLatest ? 1 : 0,
      maxDepth: this.metrics.maxDepth,
      superseded: this.metrics.superseded,
      skippedNoop: this.metrics.skippedNoop,
    });
  }
}
function isRetryableCanvasSaveError(error) {
  if (!error || typeof error !== "object") return true;
  const status = error.status;
  if (typeof status !== "number" || !Number.isFinite(status) || status === 0) return true;
  return status === 408 || status === 425 || status === 429 || status >= 500;
}
class CanvasSnapshotNotHydratedError extends Error {
  constructor() {
    super("Canvas snapshot is not hydrated; refusing to persist a partial graph");
    this.name = "CanvasSnapshotNotHydratedError";
  }
}
function createDeletionOperationId() {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === "function") return randomUUID.call(globalThis.crypto);
  return `canvas-delete-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function parseCanvasSaveRejection(error) {
  if (!error || typeof error !== "object") return null;
  if (error.status !== 409) return null;
  const body2 = error.body;
  let parsed = body2;
  if (typeof body2 !== "string" && (!body2 || typeof body2 !== "object")) return null;
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
    ...(reason === "missing_deletion_evidence" || reason === "high_blast_confirmation_required"
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
    const isPluginNode2 = n2.type === CanvasNodeType.File && typeof n2.data?.pluginId === "string";
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
    if (typeof n2.assetId === "string" && n2.assetId.length > 0) return n2.assetId;
    const dataAssetId = n2.data?.assetId;
    return typeof dataAssetId === "string" && dataAssetId.length > 0 ? dataAssetId : void 0;
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
      saveCanvas: (canvas, saveOptions) => dataSource.saveCanvas(canvas, saveOptions),
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
      const currentNodeIds = new Set(instance2.getGraph().nodes.map((node2) => node2.id));
      const deletedNodeIds = batchedNodeIds.filter((nodeId) => !currentNodeIds.has(nodeId));
      const deletedAssetIds = [...(pendingDeletionBatch?.assetIds ?? [])];
      const currentEdgeIds = new Set(instance2.getGraph().edges.map((edge) => edge.id));
      const deletedEdgeIds = batchedEdgeIds.filter((edgeId) => !currentEdgeIds.has(edgeId));
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
                operationId: pendingDeletionBatch?.operationId ?? createDeletionOperationId(),
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
        if (!pendingBatch || pendingBatch.operationId !== snapshot2.deletionOperationId) return;
        for (const nodeId of snapshot2.batchedNodeIds) pendingBatch.nodeIds.delete(nodeId);
        for (const edgeId of snapshot2.batchedEdgeIds) pendingBatch.edgeIds.delete(edgeId);
        for (const assetId of snapshot2.deletedAssetIds) pendingBatch.assetIds.delete(assetId);
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
                  highBlastConfirmed: deletionIntent.highBlastConfirmed === true,
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
      void trackPersistence(request, buildAndWait(mode2, request)).catch((err) => {
        console.error("[canvas] Failed to save canvas:", err);
      });
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
      instance2.getGraph().nodes.length > 0 || savedPositionsRef.current.size > 0;
    if (!hasLoadedGraph || !isHydratedRef.current) return;
    if (!canAutoPersistAcrossDataSourceChange(previousDataSource, dataSource)) {
      if (persistenceStatusRef.current !== "clean") {
        setPersistenceStatus("failed");
      }
      return;
    }
    const request = beginPersistenceRequest();
    trackPersistence(request, buildAndWait(instance2.getMode(), request)).catch((err) => {
      console.error("[canvas] Failed to save canvas after dataSource change:", err);
    });
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
            trackPersistence(request, Promise.reject(new CanvasSnapshotNotHydratedError())),
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
    [instance2, beginPersistenceRequest, buildAndEnqueue, buildAndWait, trackPersistence],
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
      await trackPersistence(request, Promise.reject(new CanvasSnapshotNotHydratedError()));
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
    const unsubDeleteIntent = instance2.eventBus.on("persist:delete-intent", (event) => {
      hasLocalMutationRef.current = true;
      const pendingBatch = pendingDeletionBatchRef.current ?? {
        operationId: event.operationId ?? createDeletionOperationId(),
        nodeIds: new Set(),
        edgeIds: new Set(),
        assetIds: new Set(),
        highBlastConfirmed: false,
      };
      pendingDeletionBatchRef.current = pendingBatch;
      for (const nodeId of event.removedNodeIds) pendingBatch.nodeIds.add(nodeId);
      for (const edgeId of event.removedEdgeIds) pendingBatch.edgeIds.add(edgeId);
      for (const assetId of event.removedAssetIds) pendingBatch.assetIds.add(assetId);
      if (event.highBlastConfirmed) pendingBatch.highBlastConfirmed = true;
    });
    const unsubBaseline = instance2.eventBus.on("persist:baseline-invalidated", () => {
      saveQueuesRef.current.get(dataSource)?.invalidateLastSaved();
    });
    const unsubMode = instance2.eventBus.on("mode:changed", flushPending);
    const supportsBeforeUnload =
      typeof window !== "undefined" && typeof window.addEventListener === "function";
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
