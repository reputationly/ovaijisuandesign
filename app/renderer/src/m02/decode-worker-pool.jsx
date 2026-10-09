// decode-worker-pool.jsx
import {
  useTranslation,
  reactExports,
  useCanvasBridge,
  useCanvasActions,
  syncStableZoomSignals,
  CanvasActionsContext,
  useReactFlow,
  useStoreApi,
} from "../vendor.js";
import { resolveDefaultReferencePaths } from "../m01/resolve-reference-texts.js";
import { extractCanvasEditorText } from "../m01/use-assets-ref-validate.js";
import { MIN_MUSIC_BILLING_SECONDS } from "../m01/calc-video-cost-breakdown.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
export function usePopoverOpenTrack(info2) {
  const { onPopoverOpen } = useCanvasBridge();
  const emittedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (emittedRef.current || !onPopoverOpen) return;
    emittedRef.current = true;
    onPopoverOpen(info2);
  }, [info2, onPopoverOpen]);
}
class BitmapLru {
  constructor(opts) {
    this.opts = opts;
  }
  entries = new Map();
  clock = 0;
  totalBytes = 0;
  /** Number of entries (pinned + eligible). For tests / metrics. */
  size() {
    return this.entries.size;
  }
  /** Total bytes across all entries. For tests / metrics. */
  bytes() {
    return this.totalBytes;
  }
  has(key2) {
    return this.entries.has(key2);
  }
  /**
   * Acquire a bitmap. Bumps `refCount` and `lastUsed`. Returns null if
   * the entry doesn't exist — callers schedule a decode in that case.
   *
   * The returned bitmap is borrowed; release it via `release(key)` when
   * done so it can become eligible for eviction.
   */
  acquire(key2) {
    const entry = this.entries.get(key2);
    if (!entry) return null;
    entry.refCount += 1;
    entry.lastUsed = ++this.clock;
    return entry;
  }
  /**
   * Decrement an entry's refCount. When it reaches zero the entry stays
   * in the cache as an eviction candidate (warm bitmap — re-acquiring
   * costs nothing if it survives the next eviction sweep).
   *
   * Throws if called with a refCount that's already zero — that's a bug
   * in the caller (double-release).
   */
  release(key2) {
    const entry = this.entries.get(key2);
    if (!entry) return;
    if (entry.refCount === 0) {
      throw new Error(`BitmapLru: double release of ${key2}`);
    }
    entry.refCount -= 1;
    entry.lastUsed = ++this.clock;
  }
  /**
   * Insert a freshly-decoded bitmap. Replaces any existing entry at the
   * same key — used when a stale entry was evicted during decode and
   * the worker now reports back a fresh bitmap. The new entry starts
   * with `refCount = 0`; callers must `acquire()` separately if they
   * intend to render it (this lets a pre-decode-on-prefetch path work
   * without forcing a render).
   *
   * Triggers eviction if over budget afterward.
   */
  set(key2, bitmap, bytes2) {
    const existing = this.entries.get(key2);
    if (existing) {
      this.totalBytes -= existing.bytes;
      try {
        existing.bitmap.close();
      } catch {}
      existing.bitmap = bitmap;
      existing.bytes = bytes2;
      existing.lastUsed = ++this.clock;
      this.totalBytes += bytes2;
      this.evictUntilUnderBudget();
      return existing;
    }
    const entry = {
      bitmap,
      bytes: bytes2,
      refCount: 0,
      lastUsed: ++this.clock,
    };
    this.entries.set(key2, entry);
    this.totalBytes += bytes2;
    this.evictUntilUnderBudget();
    return entry;
  }
  /**
   * Force-drop an entry (e.g. URL changed and the cached bitmap is now
   * known stale, no point keeping it around). Refuses to drop pinned
   * entries to avoid yanking a bitmap out from under a renderer.
   */
  delete(key2) {
    const entry = this.entries.get(key2);
    if (!entry) return false;
    if (entry.refCount > 0) return false;
    this.entries.delete(key2);
    this.totalBytes -= entry.bytes;
    try {
      entry.bitmap.close();
    } catch {}
    this.opts.onEvict?.(key2, entry);
    return true;
  }
  /** Close every entry and drop the table. Used on canvas teardown. */
  clear() {
    for (const [, entry] of this.entries) {
      try {
        entry.bitmap.close();
      } catch {}
    }
    this.entries.clear();
    this.totalBytes = 0;
    this.clock = 0;
  }
  /**
   * Evict eligible (refCount===0) entries oldest-first until total bytes
   * ≤ budget. Stops if everything left is pinned — emits `onOverBudget`
   * once at the end of any call that finishes still over-budget.
   *
   * The just-touched entry (lastUsed === currentClock) is *excluded*
   * from candidates: when triggered from `set()`, this prevents the
   * fresh entry from immediately evicting itself before any caller has
   * had a chance to `acquire()` it (e.g. prefetch path: set in the
   * decode callback, acquire on the next render tick). Anything older
   * — including a release-just-bumped entry from a previous tick — is
   * fair game.
   *
   * Public for tests; production code only calls it indirectly via
   * `set()`.
   */
  evictUntilUnderBudget() {
    if (this.totalBytes <= this.opts.byteBudget) return;
    const protectedClock = this.clock;
    const eligible = [];
    for (const [key2, entry] of this.entries) {
      if (entry.refCount > 0) continue;
      if (entry.lastUsed >= protectedClock) continue;
      eligible.push([key2, entry]);
    }
    eligible.sort((a2, b3) => a2[1].lastUsed - b3[1].lastUsed);
    for (const [key2, entry] of eligible) {
      if (this.totalBytes <= this.opts.byteBudget) break;
      this.entries.delete(key2);
      this.totalBytes -= entry.bytes;
      try {
        entry.bitmap.close();
      } catch {}
      this.opts.onEvict?.(key2, entry);
    }
    if (this.totalBytes > this.opts.byteBudget) {
      this.opts.onOverBudget?.(this.totalBytes, this.opts.byteBudget);
    }
  }
}
class DecodeFailureError extends Error {
  kind;
  /** HTTP status code — only set when `kind === 'http'`. */
  status;
  constructor(message2, kind, status) {
    super(message2);
    this.name = "DecodeFailureError";
    this.kind = kind;
    this.status = status;
  }
}
const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
export function isTransientDecodeFailure(err) {
  if (!(err instanceof DecodeFailureError)) return false;
  if (err.kind === "network") return true;
  if (err.kind === "http") {
    return err.status !== void 0 && TRANSIENT_HTTP_STATUSES.has(err.status);
  }
  return false;
}
export function classifyPermanentDecodeFailure(err) {
  if (
    err instanceof DecodeFailureError &&
    err.kind === "http" &&
    // 404/410 mean "the file is not there" rather than "can't render it".
    (err.status === 404 || err.status === 410)
  ) {
    return "missing";
  }
  return "unsupported";
}
function defaultWorkerFactory() {
  return new Worker(
    new URL(
      /* @vite-ignore */
      "" + new URL("decode-worker-DBC09hCG.js", import.meta.url).href,
      import.meta.url,
    ),
    {
      type: "module",
      name: "hilo-canvas-decode",
    },
  );
}
function recommendedPoolSize() {
  const hwc =
    typeof navigator !== "undefined" && typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency
      : 2;
  return Math.max(2, Math.min(4, hwc - 1));
}
class DecodeWorkerPool {
  slots = [];
  queue = [];
  tasks = new Map();
  taskIdSeq = 0;
  disposed = false;
  constructor(opts = {}) {
    const size2 = opts.size ?? recommendedPoolSize();
    const factory = opts.workerFactory ?? defaultWorkerFactory;
    for (let i2 = 0; i2 < size2; i2++) {
      const worker = factory();
      const slot = {
        worker,
        busyTask: null,
        onMessage: () => {},
      };
      slot.onMessage = (event) => this.handleWorkerMessage(slot, event.data);
      worker.addEventListener("message", slot.onMessage);
      this.slots.push(slot);
    }
  }
  /** Number of busy + queued tasks. For tests / metrics. */
  pendingCount() {
    return this.tasks.size;
  }
  /** Number of tasks waiting for a free worker. For tests / metrics. */
  queueLength() {
    return this.queue.length;
  }
  /** Number of currently-busy workers. For tests / metrics. */
  busyCount() {
    let n2 = 0;
    for (const slot of this.slots) if (slot.busyTask) n2++;
    return n2;
  }
  /**
   * Submit a decode request. Returns a promise that resolves with the
   * decoded bitmap or rejects with `Error('aborted')` on cancellation
   * or `Error(<message>)` on failure.
   */
  submit(opts) {
    if (this.disposed) {
      return Promise.reject(new Error("pool disposed"));
    }
    return new Promise((resolve, reject) => {
      const taskId = ++this.taskIdSeq;
      const task = {
        taskId,
        request: {
          type: "decode",
          taskId,
          url: opts.url,
          tier: opts.tier,
          dprBucket: opts.dprBucket,
        },
        priority: opts.priority,
        resolve,
        reject,
        signal: opts.signal,
        cancelled: false,
        workerSlot: null,
      };
      if (opts.signal?.aborted) {
        reject(makeAbortError$1());
        return;
      }
      if (opts.signal) {
        const onAbort = () => this.cancelTask(task);
        opts.signal.addEventListener("abort", onAbort);
        task.signalCleanup = () => opts.signal?.removeEventListener("abort", onAbort);
      }
      this.tasks.set(taskId, task);
      this.queue.push(task);
      this.dispatch();
    });
  }
  /** Tear down: terminate workers, reject outstanding tasks. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const pending2 = Array.from(this.tasks.values());
    for (const task of pending2) {
      task.cancelled = true;
      task.signalCleanup?.();
      task.reject(makeAbortError$1());
    }
    this.tasks.clear();
    this.queue.length = 0;
    for (const slot of this.slots) {
      slot.worker.removeEventListener("message", slot.onMessage);
      try {
        slot.worker.terminate();
      } catch {}
    }
    this.slots.length = 0;
  }
  // ---- Internals -----------------------------------------------------
  dispatch() {
    if (this.disposed) return;
    if (this.queue.length === 0) return;
    this.queue.sort((a2, b3) => a2.priority - b3.priority);
    while (this.queue.length > 0) {
      const slot = this.findIdleSlot();
      if (!slot) break;
      const task = this.queue.shift();
      if (!task) break;
      if (task.cancelled) continue;
      slot.busyTask = task;
      task.workerSlot = slot;
      slot.worker.postMessage(task.request);
    }
  }
  findIdleSlot() {
    for (const slot of this.slots) {
      if (!slot.busyTask) return slot;
    }
    return null;
  }
  handleWorkerMessage(slot, msg) {
    const task = this.tasks.get(msg.taskId);
    if (slot.busyTask?.taskId === msg.taskId) {
      slot.busyTask = null;
    }
    if (!task) {
      if (msg.type === "success") {
        try {
          msg.bitmap.close();
        } catch {}
      }
      this.dispatch();
      return;
    }
    if (task.cancelled) {
      if (msg.type === "success") {
        try {
          msg.bitmap.close();
        } catch {}
      }
      this.tasks.delete(msg.taskId);
      this.dispatch();
      return;
    }
    task.signalCleanup?.();
    this.tasks.delete(msg.taskId);
    if (msg.type === "success") {
      task.resolve(msg);
    } else {
      task.reject(new DecodeFailureError(msg.message, msg.kind ?? "decode", msg.status));
    }
    this.dispatch();
  }
  cancelTask(task) {
    if (task.cancelled) return;
    task.cancelled = true;
    task.signalCleanup?.();
    if (task.workerSlot) {
      task.workerSlot.worker.postMessage({
        type: "cancel",
        taskId: task.taskId,
      });
    } else {
      const idx = this.queue.indexOf(task);
      if (idx >= 0) this.queue.splice(idx, 1);
      this.tasks.delete(task.taskId);
    }
    task.reject(makeAbortError$1());
  }
}
function makeAbortError$1() {
  if (typeof DOMException !== "undefined") {
    return new DOMException("aborted", "AbortError");
  }
  const err = new Error("aborted");
  err.name = "AbortError";
  return err;
}
const SIZE_TIERS = [64, 128, 256, 512, 1024, 2048];
const DPR_CAP = 2;
function bucketDpr(dpr) {
  return dpr >= 1.5 ? "2x" : "1x";
}
function pickTier(displayWidth, dpr) {
  if (!Number.isFinite(displayWidth) || displayWidth <= 0) return SIZE_TIERS[0];
  const cappedDpr = Math.min(Math.max(dpr || 1, 1), DPR_CAP);
  const physical = displayWidth * cappedDpr;
  for (const t2 of SIZE_TIERS) {
    if (physical <= t2) return t2;
  }
  return SIZE_TIERS[SIZE_TIERS.length - 1];
}
function bitmapCacheKey(url2, tier, dprBucket) {
  return `${url2}@${tier}@${dprBucket}`;
}
const DEFAULT_BYTE_BUDGET = 512 * 1024 * 1024;
class BitmapManager {
  lru;
  pool;
  inflight = new Map();
  disposed = false;
  constructor(opts = {}) {
    this.lru = new BitmapLru({
      byteBudget: opts.byteBudget ?? DEFAULT_BYTE_BUDGET,
      onEvict: opts.lruOptions?.onEvict,
      onOverBudget:
        opts.lruOptions?.onOverBudget ??
        ((bytes2, budget) => {
          console.warn(
            `[hilo-canvas] BitmapManager over budget: ${(bytes2 / 1048576).toFixed(1)}MB / ${(budget / 1048576).toFixed(1)}MB`,
          );
        }),
    });
    this.pool = new DecodeWorkerPool(
      opts.poolOptions ?? {
        size: recommendedPoolSize(),
      },
    );
  }
  /** Total cached bytes across all entries. */
  bytes() {
    return this.lru.bytes();
  }
  /** Number of cached entries. */
  size() {
    return this.lru.size();
  }
  /** True if the manager has been torn down. */
  isDisposed() {
    return this.disposed;
  }
  /**
   * Acquire a bitmap for `(url, displayWidth, dpr)`. Returns a handle
   * holding a refcount on the cached entry — call `handle.release()`
   * exactly once when done.
   *
   * Concurrent acquires for the same key share a single decode.
   */
  async acquire(opts) {
    if (this.disposed) throw new Error("manager disposed");
    const dpr = opts.dpr ?? defaultDpr();
    const tier = pickTier(opts.displayWidth, dpr);
    const dprBucket = bucketDpr(dpr);
    const key2 = bitmapCacheKey(opts.url, tier, dprBucket);
    if (opts.signal?.aborted) throw makeAbortError();
    const cached = this.lru.acquire(key2);
    if (cached) {
      return this.makeHandle(key2, cached);
    }
    let decodePromise = this.inflight.get(key2);
    if (!decodePromise) {
      decodePromise = this.startDecode(opts.url, tier, dprBucket, key2, opts.priority ?? 0);
      this.inflight.set(key2, decodePromise);
    }
    return this.waitForDecode(key2, decodePromise, opts.signal);
  }
  /** Tear down: terminate workers, drop all bitmaps. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.pool.dispose();
    this.lru.clear();
    this.inflight.clear();
  }
  // ---- Internals -----------------------------------------------------
  startDecode(url2, tier, dprBucket, key2, priority) {
    return this.pool
      .submit({
        url: url2,
        tier,
        dprBucket,
        priority,
      })
      .then((resp) => {
        if (!this.disposed) {
          this.lru.set(key2, resp.bitmap, resp.bytes);
        } else {
          try {
            resp.bitmap.close();
          } catch {}
        }
        const ok2 = {
          width: resp.width,
          height: resp.height,
        };
        return ok2;
      })
      .finally(() => {
        if (this.inflight.get(key2)) this.inflight.delete(key2);
      });
  }
  waitForDecode(key2, decodePromise, signal) {
    return new Promise((resolve, reject) => {
      let aborted = false;
      const onAbort = () => {
        aborted = true;
        cleanup();
        reject(makeAbortError());
      };
      const cleanup = () => {
        if (signal) signal.removeEventListener("abort", onAbort);
      };
      if (signal) {
        signal.addEventListener("abort", onAbort);
      }
      decodePromise
        .then(() => {
          if (aborted) return;
          cleanup();
          const entry = this.lru.acquire(key2);
          if (!entry) {
            reject(new Error("bitmap evicted before delivery"));
            return;
          }
          resolve(this.makeHandle(key2, entry));
        })
        .catch((err) => {
          if (aborted) return;
          cleanup();
          reject(err);
        });
    });
  }
  makeHandle(key2, entry) {
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      this.lru.release(key2);
    };
    return {
      key: key2,
      bitmap: entry.bitmap,
      width: entry.bitmap.width,
      height: entry.bitmap.height,
      release,
    };
  }
}
function defaultDpr() {
  if (typeof window !== "undefined" && typeof window.devicePixelRatio === "number") {
    return window.devicePixelRatio || 1;
  }
  return 1;
}
function makeAbortError() {
  if (typeof DOMException !== "undefined") {
    return new DOMException("aborted", "AbortError");
  }
  const err = new Error("aborted");
  err.name = "AbortError";
  return err;
}
let singleton = null;
export function getBitmapManager() {
  if (!singleton || singleton.isDisposed()) {
    singleton = new BitmapManager();
  }
  return singleton;
}
export function syncStableZoomAfter(result, getZoom) {
  const sync = () => syncStableZoomSignals(getZoom());
  if (result) {
    void result.then(sync, sync);
    return;
  }
  requestAnimationFrame(sync);
}
export const ReferenceNavigationContext = reactExports.createContext(null);
export function CanvasReferenceNavigationScope({
  actions,
  children: children2,
  cancelPendingFocus,
  scope,
}) {
  return (
    <CanvasActionsContext.Provider value={actions}>
      <ReferenceNavigationProvider cancelPendingFocus={cancelPendingFocus} scope={scope}>
        {children2}
      </ReferenceNavigationProvider>
    </CanvasActionsContext.Provider>
  );
}
function resolveReferenceTarget(actions, nodeId, path2) {
  let target = actions.getIncomingSourceNodeIdByPath(nodeId, path2);
  const visited = new Set();
  while (target && !visited.has(target)) {
    visited.add(target);
    const node2 = actions.getNodeById(target);
    if (!node2 || target === nodeId) return null;
    if (node2.meta?.hidden !== true) return target;
    target = node2.groupId ?? null;
  }
  return null;
}
function ReferenceNavigationProvider({ children: children2, cancelPendingFocus, scope }) {
  const actions = useCanvasActions();
  const { getViewport, setViewport } = useReactFlow();
  const storeApi = useStoreApi();
  const [record2, setRecord] = reactExports.useState(null);
  const currentRecord = record2?.scope === scope ? record2 : null;
  const recordRef = reactExports.useRef(record2);
  recordRef.current = currentRecord;
  const returningRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!currentRecord || currentRecord.returning) returningRef.current = null;
  }, [currentRecord]);
  reactExports.useEffect(() => {
    setRecord((current2) => (current2?.scope === scope ? current2 : null));
  }, [scope]);
  const locate = reactExports.useCallback(
    (nodeId, targetId, snapshot2) => {
      if (!actions.getNodeById(nodeId) || !actions.getNodeById(targetId)) return;
      returningRef.current = null;
      cancelPendingFocus();
      setRecord({
        scope,
        nodeId,
        viewport: getViewport(),
        snapshot: snapshot2,
        returning: false,
      });
      actions.focusNodeIds([targetId], {
        expandAncestorGroups: true,
      });
    },
    [actions, cancelPendingFocus, getViewport, scope],
  );
  const acknowledgeReturn = reactExports.useCallback((nodeId) => {
    setRecord((current2) => (current2?.nodeId === nodeId && current2.returning ? null : current2));
  }, []);
  reactExports.useEffect(() => {
    return storeApi.subscribe(() => {
      const current2 = recordRef.current;
      if (current2 && !actions.getNodeById(current2.nodeId)) setRecord(null);
    });
  }, [actions, storeApi]);
  reactExports.useEffect(() => {
    if (!currentRecord || currentRecord.returning) return;
    const timer2 = setTimeout(() => {
      if (returningRef.current) return;
      setRecord((latest2) => (latest2 === currentRecord ? null : latest2));
    }, 5e3);
    return () => clearTimeout(timer2);
  }, [currentRecord]);
  const handleReturn = async () => {
    const current2 = recordRef.current;
    if (!current2 || !actions.getNodeById(current2.nodeId)) {
      setRecord(null);
      return;
    }
    if (returningRef.current === current2) return;
    returningRef.current = current2;
    cancelPendingFocus();
    actions.selectNodeExclusive(current2.nodeId);
    await setViewport(current2.viewport, {
      duration: 400,
    });
    if (recordRef.current !== current2) return;
    syncStableZoomSignals(getViewport().zoom);
    setRecord((latest2) =>
      latest2 === current2
        ? {
            ...current2,
            returning: true,
          }
        : latest2,
    );
  };
  const value = {
    record: currentRecord,
    locate,
    acknowledgeReturn,
    returnToNode: handleReturn,
    dismiss: () => setRecord(null),
  };
  return (
    <ReferenceNavigationContext.Provider value={value}>
      {children2}
    </ReferenceNavigationContext.Provider>
  );
}
export function useReferenceNavigationSnapshot(nodeId, mode2) {
  const navigation2 = reactExports.useContext(ReferenceNavigationContext);
  const [snapshot2] = reactExports.useState(() => {
    const record2 = navigation2?.record;
    return record2 && record2.nodeId === nodeId && record2.snapshot.mode === mode2
      ? record2.snapshot
      : null;
  });
  return {
    navigation: navigation2,
    snapshot: snapshot2,
  };
}
function restoreReferenceEditor(editor, snapshot2) {
  if (!snapshot2 || editor.isDestroyed) return;
  if (snapshot2.selection) {
    const max2 = editor.state.doc.content.size;
    editor.commands.setTextSelection({
      from: Math.min(snapshot2.selection.from, max2),
      to: Math.min(snapshot2.selection.to, max2),
    });
  }
  if (snapshot2.focused)
    editor.commands.focus(void 0, {
      scrollIntoView: false,
    });
  const viewport = editor.view.dom.closest('[data-action-ui-id="popover.prompt-input"]');
  if (snapshot2.scrollTop !== void 0 && viewport) viewport.scrollTop = snapshot2.scrollTop;
}
export function useReferenceAttachmentNavigation({
  nodeId,
  mode: mode2,
  editorRef,
  expanded,
  count: count2,
  getDraft,
  onSaveDraft,
  snapshot: snapshot2,
  defaults: defaults2,
}) {
  const actions = reactExports.useContext(CanvasActionsContext);
  const navigation2 = reactExports.useContext(ReferenceNavigationContext);
  const navigationSavedRef = reactExports.useRef(false);
  const restoredRef = reactExports.useRef(false);
  const onEditorReady = reactExports.useCallback(
    (editor) => {
      if (restoredRef.current) return;
      restoredRef.current = true;
      restoreReferenceEditor(editor, snapshot2 ?? null);
    },
    [snapshot2],
  );
  reactExports.useEffect(() => {
    if (navigation2?.record?.returning && navigation2.record.nodeId === nodeId) {
      navigationSavedRef.current = false;
      const editor = editorRef.current;
      if (editor) onEditorReady(editor);
      navigation2.acknowledgeReturn(nodeId);
    }
    if (!navigation2?.record) navigationSavedRef.current = false;
  }, [navigation2, nodeId, editorRef, onEditorReady]);
  const getLocateAction = (item) => {
    if (!nodeId || !actions || !navigation2 || (item.kind !== "image" && item.kind !== "video"))
      return void 0;
    if (!resolveReferenceTarget(actions, nodeId, item.path)) return void 0;
    return () => {
      const target = resolveReferenceTarget(actions, nodeId, item.path);
      if (!target) return;
      const editor = editorRef.current;
      const draft = getDraft();
      if (editor && !editor.isDestroyed) {
        draft.prompt = extractCanvasEditorText(editor);
        draft.promptJson = JSON.stringify(editor.getJSON());
      }
      if (draft.modelId) {
        onSaveDraft?.(draft);
        navigationSavedRef.current = true;
      }
      navigation2.locate(nodeId, target, {
        mode: mode2,
        draft,
        expanded,
        count: count2,
        selection:
          editor && !editor.isDestroyed
            ? {
                from: editor.state.selection.from,
                to: editor.state.selection.to,
              }
            : void 0,
        scrollTop:
          editor && !editor.isDestroyed
            ? editor.view.dom.closest('[data-action-ui-id="popover.prompt-input"]')?.scrollTop
            : void 0,
        focused: editor?.isFocused,
        defaults: defaults2,
      });
    };
  };
  return {
    getLocateAction,
    onEditorReady,
    navigationSavedRef,
  };
}
export function getReferenceNavigationDefaults(snapshot2, live) {
  if (!snapshot2) return {};
  const draft = snapshot2.draft;
  const restorePaths = (current2, saved, original) => {
    const upstream = current2 ?? [];
    const staged = saved?.filter((path2) => path2 && !(original ?? saved).includes(path2)) ?? [];
    return resolveDefaultReferencePaths(
      [...upstream, ...staged.filter((path2) => !upstream.includes(path2))],
      saved,
      {
        preserveDraftSlots: true,
      },
    );
  };
  const imagePaths = restorePaths(
    live.defaultImagePaths,
    draft.imagePaths,
    snapshot2.defaults?.imagePaths,
  );
  return {
    defaultPrompt: draft.prompt,
    defaultPromptJson: draft.promptJson,
    defaultModelId: draft.modelId,
    defaultParams: draft.params,
    defaultImagePaths: imagePaths,
    defaultImageDraftPaths: imagePaths,
    defaultVideoPaths: restorePaths(
      live.defaultVideoPaths,
      draft.videoPaths,
      snapshot2.defaults?.videoPaths,
    ),
    defaultAudioPaths: restorePaths(
      live.defaultAudioPaths,
      draft.audioPaths,
      snapshot2.defaults?.audioPaths,
    ),
    defaultTextPaths: restorePaths(
      live.defaultTextPaths,
      draft.textPaths,
      snapshot2.defaults?.textPaths,
    ),
  };
}
export function useVideoReferenceNavigation({
  defaultImagePaths,
  defaultVideoPaths,
  defaultAudioPaths,
  defaultTextPaths,
  prompt,
  modelId,
  params,
  paths,
  ...navigation2
}) {
  return useReferenceAttachmentNavigation({
    ...navigation2,
    mode: "i2v",
    defaults: {
      imagePaths: [...(defaultImagePaths ?? [])],
      videoPaths: [...(defaultVideoPaths ?? [])],
      audioPaths: [...(defaultAudioPaths ?? [])],
      textPaths: [...(defaultTextPaths ?? [])],
    },
    getDraft: () => ({
      prompt,
      modelId,
      params,
      imagePaths: [...paths.imagePaths],
      videoPaths: [...paths.videoPaths],
      audioPaths: [...paths.audioPaths],
      textPaths: [...paths.textPaths],
    }),
  });
}
export function withReferenceNavigationSnapshot(Component, mode2) {
  return reactExports.memo(function ReferenceNavigationPopover(props) {
    const { snapshot: snapshot2 } = useReferenceNavigationSnapshot(
      props.nodeId ?? props.replaceNodeId,
      typeof mode2 === "function" ? mode2(props) : mode2,
    );
    return (
      <Component
        {...props}
        {...getReferenceNavigationDefaults(snapshot2, props)}
        navigationSnapshot={snapshot2}
      />
    );
  });
}
export const PROMPT_LENGTH_HINT_EXTRA_HEIGHT = 22;
export const AUDIO_REFERENCE_BAR_FIRST_ROW_EXTRA_HEIGHT = 56;
export const SEEDAUDIO_CREDITS_PER_SECOND = 3;
const MUSIC_LENGTH_PRESETS = [
  {
    value: "auto",
    label: "Auto",
  },
  {
    value: "30s",
    label: "30s",
  },
  {
    value: "1m",
    label: "1m",
  },
  {
    value: "2m",
    label: "2m",
  },
  {
    value: "4m",
    label: "4m",
  },
  {
    value: "6m",
    label: "6m",
  },
];
function musicLengthPresetLabel(t2, preset2) {
  return preset2.value === "auto"
    ? t2("canvas.param.option.auto", {
        defaultValue: preset2.label,
      })
    : preset2.label;
}
export function formatMusicLengthSummary(t2, value) {
  if (!value || value === "auto") {
    return t2("canvas.param.option.auto", {
      defaultValue: "Auto",
    });
  }
  const preset2 = MUSIC_LENGTH_PRESETS.find((p3) => p3.value === value);
  if (preset2) return musicLengthPresetLabel(t2, preset2);
  return value;
}
export function isCustomMusicLength(value) {
  if (!value || value === "auto") return false;
  return !MUSIC_LENGTH_PRESETS.some((p3) => p3.value === value);
}
export function parseCustomMusicLengthSeconds(value) {
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  const mmss = /^(\d{1,2}):(\d{1,2})$/.exec(trimmed);
  if (!mmss) return void 0;
  const mins = Number(mmss[1]);
  const secs = Number(mmss[2]);
  if (secs >= 60) return void 0;
  return mins * 60 + secs;
}
function splitCustomMusicLength(value) {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed === "custom")
    return {
      mm: "",
      ss: "",
    };
  const m3 = /^(\d{0,2}):(\d{0,2})$/.exec(trimmed);
  if (m3)
    return {
      mm: m3[1],
      ss: m3[2],
    };
  return {
    mm: "",
    ss: "",
  };
}
export function MusicLengthParam({ value, onChange, disabled: disabled2 }) {
  const { t: t2 } = useTranslation();
  const customSelected = value === "custom" || isCustomMusicLength(value);
  const custom = value === "custom" ? "" : isCustomMusicLength(value) ? value : "";
  const customSeconds = custom ? parseCustomMusicLengthSeconds(custom) : void 0;
  const belowMinDuration = customSeconds != null && customSeconds < MIN_MUSIC_BILLING_SECONDS;
  const { mm: mmField, ss: ssField } = splitCustomMusicLength(custom);
  const emitCustom = (mm, ss2) => {
    const cleanMm = mm.replace(/\D/g, "").slice(0, 2);
    const cleanSs = ss2.replace(/\D/g, "").slice(0, 2);
    if (!cleanMm && !cleanSs) {
      onChange("custom");
      return;
    }
    onChange(`${cleanMm || "0"}:${cleanSs}`);
  };
  return (
    <div>
      <div className="mb-2 text-[13px] font-medium text-foreground/50">
        {t2("canvas.params.duration", {
          defaultValue: "时长",
        })}
      </div>
      <div className="flex flex-col gap-1">
        {MUSIC_LENGTH_PRESETS.map((preset2) => {
          const selected2 = value === preset2.value || (!value && preset2.value === "auto");
          return (
            <button
              key={preset2.value}
              type="button"
              onClick={(e2) => {
                e2.stopPropagation();
                if (!disabled2) onChange(preset2.value);
              }}
              disabled={disabled2}
              className={[
                "flex h-8 items-center justify-between rounded-md px-3 text-left text-[14px] transition-colors disabled:cursor-default disabled:opacity-50",
                selected2
                  ? "bg-[var(--canvas-controls-hover)] text-foreground"
                  : "text-foreground/80 hover:enabled:bg-[var(--canvas-controls-hover)]",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span>{musicLengthPresetLabel(t2, preset2)}</span>
              {selected2 && <span aria-hidden={true}>✓</span>}
            </button>
          );
        })}
        {customSelected ? (
          <div className="mt-1 rounded-lg bg-[var(--canvas-controls-hover)] p-2">
            <div className="flex items-center justify-center gap-2">
              <input
                type="text"
                value={mmField}
                onChange={(e2) => {
                  if (/^\d{0,2}$/.test(e2.target.value)) emitCustom(e2.target.value, ssField);
                }}
                onClick={(e2) => e2.stopPropagation()}
                onKeyDown={(e2) => e2.stopPropagation()}
                disabled={disabled2}
                placeholder={t2("canvas.params.placeholder.durationMm", {
                  defaultValue: "mm",
                })}
                inputMode="numeric"
                maxLength={2}
                aria-label={t2("canvas.params.durationMinutes", {
                  defaultValue: "分钟",
                })}
                aria-invalid={belowMinDuration}
                className={[
                  "h-9 w-14 rounded-md border bg-[var(--canvas-node-bg)] px-2 text-center text-[14px] text-foreground outline-none placeholder:text-foreground/40 disabled:opacity-50",
                  belowMinDuration
                    ? "border-destructive focus:border-destructive"
                    : "border-[var(--canvas-controls-border)] focus:border-[var(--canvas-node-border-selected)]",
                ].join(" ")}
              />
              <span className="text-[14px] font-medium text-foreground/60" aria-hidden={true}>
                :
              </span>
              <input
                type="text"
                value={ssField}
                onChange={(e2) => {
                  if (/^\d{0,2}$/.test(e2.target.value)) emitCustom(mmField, e2.target.value);
                }}
                onClick={(e2) => e2.stopPropagation()}
                onKeyDown={(e2) => e2.stopPropagation()}
                disabled={disabled2}
                placeholder={t2("canvas.params.placeholder.durationSs", {
                  defaultValue: "ss",
                })}
                inputMode="numeric"
                maxLength={2}
                aria-label={t2("canvas.params.durationSeconds", {
                  defaultValue: "秒",
                })}
                aria-invalid={belowMinDuration}
                className={[
                  "h-9 w-14 rounded-md border bg-[var(--canvas-node-bg)] px-2 text-center text-[14px] text-foreground outline-none placeholder:text-foreground/40 disabled:opacity-50",
                  belowMinDuration
                    ? "border-destructive focus:border-destructive"
                    : "border-[var(--canvas-controls-border)] focus:border-[var(--canvas-node-border-selected)]",
                ].join(" ")}
              />
            </div>
            {belowMinDuration && (
              <div className="mt-1 px-1 text-[12px] text-destructive">
                {t2("canvas.params.durationMinSeconds", {
                  defaultValue: "最小时长 {{n}}s",
                  n: MIN_MUSIC_BILLING_SECONDS,
                })}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={(e2) => {
              e2.stopPropagation();
              if (!disabled2) onChange("custom");
            }}
            disabled={disabled2}
            className="mt-1 h-9 rounded-lg bg-[var(--canvas-controls-hover)] px-3 text-[14px] font-medium text-foreground/50 transition-colors hover:enabled:text-foreground disabled:cursor-default disabled:opacity-50"
          >
            {t2("canvas.params.custom", {
              defaultValue: "自定义",
            })}
          </button>
        )}
      </div>
    </div>
  );
}
