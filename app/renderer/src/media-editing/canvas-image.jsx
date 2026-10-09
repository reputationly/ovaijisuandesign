// canvas-image.jsx
import { currentBucket, subscribers$2 } from "../canvas/separator.jsx";
import { reactExports } from "../vendor.js";
import { CanvasRenderRuntimeContext } from "../infra/use-plugin-metadata-store.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useCanvasSurfaceRecovery } from "./resolve-panorama-generation-presentation.js";
import { useCanvasActive } from "./package.jsx";
import {
  useCanvasActiveDeferred,
  useViewportStatus,
} from "../canvas/fullscreen-icon.jsx";

function subscribe$4(cb) {
  subscribers$2.add(cb);
  return () => {
    subscribers$2.delete(cb);
  };
}

function getSnapshot$3() {
  return currentBucket;
}

function useStableZoomBucket() {
  return reactExports.useSyncExternalStore(
    subscribe$4,
    getSnapshot$3,
    getSnapshot$3,
  );
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

function isTransientDecodeFailure(err) {
  if (!(err instanceof DecodeFailureError)) return false;
  if (err.kind === "network") return true;
  if (err.kind === "http") {
    return err.status !== void 0 && TRANSIENT_HTTP_STATUSES.has(err.status);
  }
  return false;
}

function classifyPermanentDecodeFailure(err) {
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
      "" + new URL("../decode-worker-DBC09hCG.js", import.meta.url).href,
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
    typeof navigator !== "undefined" &&
    typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency
      : 2;
  return Math.max(2, Math.min(4, hwc - 1));
}

function makeAbortError$1() {
  if (typeof DOMException !== "undefined") {
    return new DOMException("aborted", "AbortError");
  }
  const err = new Error("aborted");
  err.name = "AbortError";
  return err;
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
        task.signalCleanup = () =>
          opts.signal?.removeEventListener("abort", onAbort);
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
      task.reject(
        new DecodeFailureError(msg.message, msg.kind ?? "decode", msg.status),
      );
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

function defaultDpr() {
  if (
    typeof window !== "undefined" &&
    typeof window.devicePixelRatio === "number"
  ) {
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
      decodePromise = this.startDecode(
        opts.url,
        tier,
        dprBucket,
        key2,
        opts.priority ?? 0,
      );
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

let singleton = null;

function getBitmapManager() {
  if (!singleton || singleton.isDisposed()) {
    singleton = new BitmapManager();
  }
  return singleton;
}

function resolveCanvasContentVisibilityStyle(policy) {
  return policy.contentVisibility;
}

function useCanvasRenderPolicy() {
  return reactExports.useContext(CanvasRenderRuntimeContext).policy;
}

const TRANSIENT_RETRY_DELAYS_MS = [1e3, 3e3, 8e3];

const GIF_HOVER_DELAY_MS = 200;

function isEffectivelyFar(status, canvasActive) {
  return status === "far" || !canvasActive;
}

function readDpr$1() {
  if (typeof window === "undefined") return 1;
  return Math.max(1, window.devicePixelRatio || 1);
}

function releaseHandle(ref) {
  const h2 = ref.current;
  if (!h2) return;
  ref.current = null;
  h2.release();
}

function getDrawSig(canvas) {
  return canvas.__drawSig;
}

function setDrawSig(canvas, sig) {
  canvas.__drawSig = sig;
}

let bitmapIdCounter = 0;

function bitmapId(bitmap) {
  const tagged = bitmap;
  tagged.__hiloId ??= ++bitmapIdCounter;
  return tagged.__hiloId;
}

function resetCanvasBackingStore(canvas) {
  if (!canvas) return;
  if (canvas.width !== 1) canvas.width = 1;
  if (canvas.height !== 1) canvas.height = 1;
  setDrawSig(canvas, void 0);
}

function computeCanvasBackingSize(
  displayWidth,
  displayHeight,
  dpr,
  bitmapWidth,
  bitmapHeight,
) {
  const wantW = Math.max(1, Math.round(displayWidth * dpr));
  const wantH = Math.max(1, Math.round(displayHeight * dpr));
  const scale2 = Math.min(1, bitmapWidth / wantW, bitmapHeight / wantH);
  return {
    width: Math.min(bitmapWidth, Math.max(1, Math.round(wantW * scale2))),
    height: Math.min(bitmapHeight, Math.max(1, Math.round(wantH * scale2))),
  };
}

function drawBitmap(
  canvas,
  bitmap,
  displayWidth,
  displayHeight,
  dpr,
  options = {},
) {
  if (!canvas) return false;
  const backing = computeCanvasBackingSize(
    displayWidth,
    displayHeight,
    dpr,
    bitmap.width,
    bitmap.height,
  );
  const backingW = backing.width;
  const backingH = backing.height;
  const sig = `${backingW}x${backingH}@${bitmapId(bitmap)}`;
  if (!options.force && getDrawSig(canvas) === sig) return false;
  if (canvas.width !== backingW) canvas.width = backingW;
  if (canvas.height !== backingH) canvas.height = backingH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  ctx.clearRect(0, 0, backingW, backingH);
  ctx.drawImage(bitmap, 0, 0, backingW, backingH);
  setDrawSig(canvas, sig);
  return true;
}

export function CanvasImage(props) {
  const {
    src,
    animationSrc,
    nodeId,
    width,
    height,
    alt,
    className,
    onError,
    onNaturalSize,
  } = props;
  const canvasRef = reactExports.useRef(null);
  const handleRef = reactExports.useRef(null);
  const [loadState, setLoadState] = reactExports.useState("pending");
  const status = useViewportStatus(nodeId, width, height);
  const dpr = reactExports.useMemo(() => readDpr$1(), []);
  const zoomBucket = useStableZoomBucket();
  const effectiveWidth = Math.max(1, Math.round(width * zoomBucket));
  const effectiveHeight = Math.max(1, Math.round(height * zoomBucket));
  const canvasActive = useCanvasActiveDeferred();
  const canvasPresented = useCanvasActive();
  const isFar = isEffectivelyFar(status, canvasActive);
  const statusRef = reactExports.useRef(status);
  statusRef.current = status;
  const [hoveredAnimationSrc, setHoveredAnimationSrc] =
    reactExports.useState(null);
  const [loadedAnimationSrc, setLoadedAnimationSrc] =
    reactExports.useState(null);
  const [failedAnimationSrc, setFailedAnimationSrc] =
    reactExports.useState(null);
  const animationHoverTimerRef = reactExports.useRef(null);
  const cancelPendingAnimation = reactExports.useCallback(() => {
    if (animationHoverTimerRef.current !== null) {
      clearTimeout(animationHoverTimerRef.current);
      animationHoverTimerRef.current = null;
    }
  }, []);
  const canAnimate = canvasPresented && status === "inView" && !!animationSrc;
  const showAnimation =
    canAnimate &&
    hoveredAnimationSrc === animationSrc &&
    failedAnimationSrc !== animationSrc;
  const animationReady = showAnimation && loadedAnimationSrc === animationSrc;
  reactExports.useEffect(() => {
    setHoveredAnimationSrc(null);
    return cancelPendingAnimation;
  }, [src, animationSrc, canAnimate, cancelPendingAnimation]);
  const handleMouseEnter = () => {
    cancelPendingAnimation();
    if (!canAnimate) return;
    animationHoverTimerRef.current = setTimeout(() => {
      animationHoverTimerRef.current = null;
      setLoadedAnimationSrc(null);
      setFailedAnimationSrc(null);
      setHoveredAnimationSrc(animationSrc ?? null);
    }, GIF_HOVER_DELAY_MS);
  };
  const handleMouseLeave2 = () => {
    cancelPendingAnimation();
    setHoveredAnimationSrc(null);
  };
  const onErrorRef = reactExports.useRef(onError);
  onErrorRef.current = onError;
  const onNaturalSizeRef = reactExports.useRef(onNaturalSize);
  onNaturalSizeRef.current = onNaturalSize;
  const renderPolicy = useCanvasRenderPolicy();
  useCanvasSurfaceRecovery(
    {
      surfaceType: "bitmap-canvas",
      // Resume recovery is deliberately limited to the presented canvas and
      // its visible/prefetch ring. Far nodes release their handle/backing store
      // and naturally draw again when they return.
      isEligible: () =>
        statusRef.current !== "far" &&
        canvasPresented &&
        handleRef.current !== null,
      recover: () => {
        const handle2 = handleRef.current;
        if (!handle2) return false;
        return drawBitmap(
          canvasRef.current,
          handle2.bitmap,
          effectiveWidth,
          effectiveHeight,
          dpr,
          {
            force: true,
          },
        );
      },
    },
    canvasPresented && status !== "far" && loadState === "ready",
  );
  reactExports.useEffect(() => {
    if (isFar) {
      releaseHandle(handleRef);
      resetCanvasBackingStore(canvasRef.current);
      setLoadState("pending");
      return;
    }
    const ctrl = new AbortController();
    let cancelled = false;
    let retryTimer = null;
    setLoadState((prev) => (prev === "ready" ? prev : "pending"));
    const attempt = (retryIdx) => {
      getBitmapManager()
        .acquire({
          url: src,
          displayWidth: effectiveWidth,
          dpr,
          signal: ctrl.signal,
          // Closer-to-viewport tasks get lower priority numbers (dispatch
          // first). Without a per-node distance we collapse to two
          // tiers: visible (0) and prefetch (100). Distance-weighted
          // ordering can come later. Read via ref so a nearView↔inView
          // flip during an existing acquire doesn't re-fire the effect.
          priority: statusRef.current === "inView" ? 0 : 100,
        })
        .then((h2) => {
          if (cancelled) {
            h2.release();
            return;
          }
          releaseHandle(handleRef);
          handleRef.current = h2;
          if (h2.bitmap.width > 0 && h2.bitmap.height > 0) {
            onNaturalSizeRef.current?.(h2.bitmap.width, h2.bitmap.height);
          }
          drawBitmap(
            canvasRef.current,
            h2.bitmap,
            effectiveWidth,
            effectiveHeight,
            dpr,
          );
          setLoadState("ready");
        })
        .catch((err) => {
          if (cancelled || err.name === "AbortError") return;
          const delay = TRANSIENT_RETRY_DELAYS_MS[retryIdx];
          if (delay !== void 0 && isTransientDecodeFailure(err)) {
            retryTimer = setTimeout(
              () => {
                retryTimer = null;
                if (!cancelled) attempt(retryIdx + 1);
              },
              delay * (0.5 + Math.random()),
            );
            return;
          }
          setLoadState("error");
          onErrorRef.current?.(classifyPermanentDecodeFailure(err));
        });
    };
    attempt(0);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      ctrl.abort();
    };
  }, [src, effectiveWidth, effectiveHeight, dpr, isFar]);
  reactExports.useEffect(() => {
    if (handleRef.current) {
      drawBitmap(
        canvasRef.current,
        handleRef.current.bitmap,
        effectiveWidth,
        effectiveHeight,
        dpr,
      );
    }
  }, [effectiveWidth, effectiveHeight, dpr]);
  reactExports.useEffect(() => {
    return () => releaseHandle(handleRef);
  }, []);
  const wrapperStyle2 = {
    width,
    height,
    position: "relative",
    overflow: "hidden",
    background:
      loadState === "ready" ? void 0 : "var(--canvas-node-bg, transparent)",
  };
  const canvasStyle = {
    width: "100%",
    height: "100%",
    display: "block",
    // Skip rasterization for nodes scrolled out of the viewport. On a dense
    // canvas the dominant zoom/pan cost is the browser re-rasterizing every
    // image <canvas> texture each frame (measured: 532 image nodes, zoom
    // p50 128 ms). `content-visibility: auto` lets the compositor drop the
    // off-screen canvases from that per-frame raster pass entirely, cutting
    // zoom p50 to ~103 ms with zero VRAM cost (unlike a will-change layer
    // promotion, which is slower here AND balloons GPU memory). The backing
    // store size is unchanged; only paint work is skipped while off-screen.
    // Host policy can temporarily keep the texture visible for a narrowly
    // scoped compositor canary. Far-node virtualization and bitmap release
    // remain independent from this paint-culling policy.
    contentVisibility: resolveCanvasContentVisibilityStyle(renderPolicy),
    // Match what <img object-fit:cover> does. drawBitmap stretches the
    // source to the full backing store; if aspect ratio differs the
    // resize on the worker side would have already preserved aspect,
    // so the bitmap may be smaller than the canvas — letterboxing is
    // visually identical to object-fit:cover when the canvas itself
    // crops via overflow:hidden.
    objectFit: "cover",
    // Defensive: never receive pointer events; the parent node owns
    // hit-testing for selection / drag.
    pointerEvents: "none",
    // Hide the poster after the GIF loads, otherwise transparent animation
    // frames would show the old still frame underneath.
    visibility: animationReady ? "hidden" : void 0,
  };
  if (loadState === "error") {
    return (
      <div
        className={className}
        style={wrapperStyle2}
        role="img"
        aria-label={alt}
      />
    );
  }
  return (
    <div
      className={className}
      style={wrapperStyle2}
      role="img"
      aria-label={alt}
      onMouseEnter={animationSrc ? handleMouseEnter : void 0}
      onMouseLeave={animationSrc ? handleMouseLeave2 : void 0}
    >
      <canvas ref={canvasRef} style={canvasStyle} />
      {showAnimation && (
        <img
          key={animationSrc}
          src={animationSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          decoding="async"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{
            visibility: animationReady ? "visible" : "hidden",
          }}
          onLoad={() => setLoadedAnimationSrc(animationSrc ?? null)}
          onError={() => setFailedAnimationSrc(animationSrc ?? null)}
          data-action-ui-id="canvas.image-hover-preview"
        />
      )}
    </div>
  );
}
