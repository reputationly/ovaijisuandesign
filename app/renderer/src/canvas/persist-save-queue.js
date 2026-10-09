// persist-save-queue.js
import { measurePerf } from "../vendor.js";
import {
  PERF_CANVAS_PERSIST_QUEUE,
  PERF_CANVAS_PERSIST_SAVE,
} from "../generation/to-workspace-browser-url.js";
import { stableCanvasHash } from "./is-reexecutable-generation-node.js";

function isRetryableCanvasSaveError(error) {
  if (!error || typeof error !== "object") return true;
  const status = error.status;
  if (typeof status !== "number" || !Number.isFinite(status) || status === 0)
    return true;
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export class PersistSaveQueue {
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
            failure && failure.seq >= targetSeq
              ? failure.error
              : new Error("Canvas save failed"),
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
      !this.pendingLatest ||
      (failedCandidate?.seq ?? 0) > this.pendingLatest.seq
        ? failedCandidate
        : this.pendingLatest;
    if (!next2) return null;
    if (
      !next2.saveOptions?.deletionIntent &&
      next2.contentHash === this.lastSavedContentHash
    ) {
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
        if (
          isRetryableCanvasSaveError(err) &&
          next2.seq >= this.latestDispatchedSeq
        ) {
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
    return (
      !incoming.saveOptions?.deletionIntent &&
      existing.contentHash === incoming.contentHash
    );
  }
  start(snapshot2) {
    if ((this.lastFailedSnapshot?.seq ?? 0) < snapshot2.seq) {
      this.lastFailedSnapshot = null;
    }
    this.inFlight = snapshot2;
    this.latestDispatchedSeq = Math.max(
      this.latestDispatchedSeq,
      snapshot2.seq,
    );
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
        this.lastSuccessfulSeq = Math.max(
          this.lastSuccessfulSeq,
          snapshot2.seq,
        );
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
              if (this.inFlight || this.pendingLatest?.seq !== retry.seq)
                return;
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
