// hilo-canvas-data-source.js
import { assetInfoToAssetMeta } from "./use-active-runtime.js";

const FILE_CHANGE_DEBOUNCE_MS = 150;

function assetInfoToCanvasItem(asset, fileUrlById) {
  if (!asset.id) return void 0;
  const meta2 = assetInfoToAssetMeta(asset, fileUrlById);
  return meta2
    ? {
        id: asset.id,
        meta: meta2,
      }
    : void 0;
}

function mergeFileChangeEvents(left, right) {
  if (!left) return right;
  if (!right) return left;
  const paths = new Set();
  for (const path2 of left.paths ?? []) paths.add(path2);
  for (const path2 of right.paths ?? []) paths.add(path2);
  return {
    requiresCanvasReload:
      left.requiresCanvasReload || right.requiresCanvasReload,
    paths: paths.size > 0 ? Array.from(paths) : void 0,
    broad: left.broad || right.broad,
  };
}

function assetEventToFileChangeEvent(event) {
  if (event.type === "assets_changed_batch") {
    return event.events
      .map(assetEventToFileChangeEvent)
      .reduce((acc, next2) => mergeFileChangeEvents(acc, next2) ?? acc, {
        requiresCanvasReload: false,
        paths: [],
      });
  }
  const path2 = event.path ?? event.asset?.path;
  const paths = path2 ? [path2] : void 0;
  return {
    requiresCanvasReload: true,
    paths,
    broad: paths === void 0,
  };
}

export class HiloCanvasDataSource {
  constructor(httpClient, sessionStore, logger, persistenceInstanceId) {
    this.httpClient = httpClient;
    this.sessionStore = sessionStore;
    this.logger = logger;
    this.persistenceInstanceId = persistenceInstanceId;
  }
  /**
   * Active count of "canvas self-initiated add" sequences. While > 0, any
   * path-scoped reload event is downgraded to metadata-only (see
   * `downgradeSuppressedReload`).
   *
   * Why: paths like native-file drop, file-picker upload, clipboard paste,
   * and resource-panel drop all (a) write a file into the vault, which makes
   * the gateway synchronously emit a `created` asset_changed → the adapter
   * maps it to `requiresCanvasReload: true`, AND (b) immediately issue their
   * own `add-node` calls to place the node. The `created`-driven `load(false)`
   * lands mid-sequence, rebuilds the graph from `vault items (all present) +
   * canvas.json (only the nodes added so far)`, and synthesizes fresh
   * random-UUID nodes for the not-yet-added assets. The remaining `add-node`
   * broadcasts then arrive with DIFFERENT random UUIDs, so `applyIncremental`'s
   * id-based dedupe misses → the same asset lands twice → duplicate cards.
   *
   * The add-node WS broadcast is the canonical sync path for these nodes (see
   * `addCanvasAssetsAtPosition`), so the reload is purely redundant during the
   * window. We suppress by SESSION rather than by basename because the on-disk
   * name can differ from what the caller knows up front — `uniquePath` may
   * append `(1)` on a name collision, and upload emits its `created` before
   * the HTTP response hands us the real path — so a name-based match is both
   * racy and collision-blind. A session counter sidesteps both.
   */
  addSessionDepth = 0;
  /**
   * Open a reload-suppression session around a canvas self-initiated add
   * (import/upload/fork + add-node). Returns a disposer that MUST be called
   * once the add sequence settles (typically in a `finally`). A `ttlMs`
   * safety net auto-closes the session in case the disposer is dropped, so a
   * lost reference can never wedge reloads off permanently. Re-entrant:
   * overlapping sessions refcount, and the window closes only when the last
   * one ends.
   */
  beginCanvasAddSession(ttlMs = 5e3) {
    this.addSessionDepth += 1;
    let closed = false;
    let ttlHandle;
    const close2 = () => {
      if (closed) return;
      closed = true;
      if (ttlHandle !== void 0) clearTimeout(ttlHandle);
      this.addSessionDepth = Math.max(0, this.addSessionDepth - 1);
    };
    ttlHandle = setTimeout(close2, ttlMs);
    return close2;
  }
  /**
   * Downgrade a reload-requiring event to metadata-only while a canvas-add
   * session is open AND the event carries precise paths. A `broad` event (no
   * precise paths) is NEVER suppressed — it signals "something changed but we
   * don't know what" (e.g. an agent turn finishing), which a self-add window
   * never produces and which still needs a reload. Path-scoped events during
   * the window are exactly the redundant `created` echoes of our own writes,
   * so the only loss is a momentarily-deferred reload for an unrelated file
   * that happened to change while a session is open (bounded by the add's I/O
   * duration, or the TTL safety net) — self-healing on the next change, and
   * never affecting gateway-generated nodes (those ride the `canvas_updated`
   * broadcast, not this path).
   */
  downgradeSuppressedReload(event) {
    if (!event?.requiresCanvasReload) return event;
    if (this.addSessionDepth === 0) return event;
    const paths = event.paths;
    if (!paths || paths.length === 0) return event;
    return {
      ...event,
      requiresCanvasReload: false,
    };
  }
  async loadItems(signal) {
    const allAssetsRes = await this.httpClient.getAllAssets({
      signal,
    });
    const items = [];
    for (const a2 of allAssetsRes.assets) {
      const item = assetInfoToCanvasItem(
        a2,
        this.httpClient.fileUrlById.bind(this.httpClient),
      );
      if (item) items.push(item);
    }
    return items;
  }
  async loadCanvas(signal) {
    try {
      return await this.httpClient.getCanvas({
        signal,
      });
    } catch (error) {
      const isAbort = error instanceof Error && error.type === "abort";
      if (!isAbort) {
        const message2 = error instanceof Error ? error.message : String(error);
        void Promise.resolve(
          this.logger?.error(`[CanvasData] canvas load failed: ${message2}`),
        ).catch(() => void 0);
      }
      throw error;
    }
  }
  async saveCanvas(canvas, options) {
    return this.httpClient.saveCanvas(canvas, options);
  }
  async reportCanvasRecovery(report) {
    await this.httpClient.reportCanvasRecovery?.(report);
  }
  onCanvasUpdated(callback) {
    return this.sessionStore.onCanvasUpdated(callback);
  }
  onCanvasFocus(callback) {
    if (!this.sessionStore.onCanvasFocus) {
      return () => {};
    }
    return this.sessionStore.onCanvasFocus(callback);
  }
  onCanvasNodeGenerating(callback) {
    if (!this.sessionStore.onCanvasNodeGenerating) {
      return () => {};
    }
    return this.sessionStore.onCanvasNodeGenerating(callback);
  }
  onFileChanged(callback) {
    let timer2;
    let pendingEvent;
    const debounced = (event) => {
      pendingEvent = mergeFileChangeEvents(
        pendingEvent,
        this.downgradeSuppressedReload(event),
      );
      if (timer2 !== void 0) clearTimeout(timer2);
      timer2 = setTimeout(() => {
        timer2 = void 0;
        const next2 = pendingEvent;
        pendingEvent = void 0;
        callback(next2);
      }, FILE_CHANGE_DEBOUNCE_MS);
    };
    const unsubFile = this.sessionStore.onFileChanged((event) =>
      debounced(
        event ?? {
          requiresCanvasReload: true,
          broad: true,
        },
      ),
    );
    const unsubAsset =
      this.sessionStore.onAssetChanged?.((event) =>
        debounced(assetEventToFileChangeEvent(event)),
      ) ?? (() => {});
    return () => {
      if (timer2 !== void 0) {
        clearTimeout(timer2);
        timer2 = void 0;
      }
      pendingEvent = void 0;
      unsubFile();
      unsubAsset();
    };
  }
  resolveFileUrl(path2) {
    return this.httpClient.fileUrl(path2);
  }
  resolveFileUrlById(assetId) {
    return this.httpClient.fileUrlById(assetId);
  }
}
