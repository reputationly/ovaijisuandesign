// canvas-surface-recovery-scheduler.jsx
import {
  CanvasNodeType,
  reactExports,
  useRenderElement,
  SelectGroupContext,
  usePopoverRootContext,
  useBaseUiId,
  useIsoLayoutEffect,
  DialogRoot,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
export function useNativeViewOcclusion(active2 = true) {
  reactExports.useLayoutEffect(() => {
    if (!active2) return;
    const platform2 = window.__HILO_PLATFORM__;
    const bridge = platform2?.window;
    if (!bridge?.setNativeViewOcclusion) return;
    const token2 = crypto.randomUUID();
    const update2 = (occluded) => {
      void bridge.setNativeViewOcclusion?.(token2, occluded).catch((error) => {
        console.error("[native-view-occlusion] Failed to update preview lease", error);
      });
    };
    update2(true);
    return () => update2(false);
  }, [active2]);
}
export const Separator$1 = reactExports.forwardRef(
  function SeparatorComponent(componentProps, forwardedRef) {
    const {
      className,
      render: render2,
      orientation = "horizontal",
      ...elementProps
    } = componentProps;
    const state2 = {
      orientation,
    };
    const element2 = useRenderElement("div", componentProps, {
      state: state2,
      ref: forwardedRef,
      props: [
        {
          role: "separator",
          "aria-orientation": orientation,
        },
        elementProps,
      ],
    });
    return element2;
  },
);
export const HEADER_FLOW_HEIGHT$3 = 28;
export const TOOLBAR_GAP$5 = 12;
export const zoomSelector$8 = (s2) => s2.transform[2];
export const TOOLBAR_ANIM_MS = 150;
export function useDelayedUnmount(visible, hidden) {
  const [shouldRender, setShouldRender] = reactExports.useState(visible && !hidden);
  const [state2, setState] = reactExports.useState(visible ? "entering" : "exiting");
  const timeoutRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (hidden) {
      setShouldRender(false);
      setState("exiting");
    } else if (visible) {
      setShouldRender(true);
      setState("entering");
    } else {
      setState("exiting");
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false);
        timeoutRef.current = null;
      }, TOOLBAR_ANIM_MS);
    }
    return () => {
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [visible, hidden]);
  return {
    shouldRender,
    state: state2,
  };
}
export const SelectGroup$1 = reactExports.forwardRef(
  function SelectGroup2(componentProps, forwardedRef) {
    const { className, render: render2, ...elementProps } = componentProps;
    const [labelId, setLabelId] = reactExports.useState();
    const contextValue = reactExports.useMemo(
      () => ({
        labelId,
        setLabelId,
      }),
      [labelId, setLabelId],
    );
    const element2 = useRenderElement("div", componentProps, {
      ref: forwardedRef,
      props: [
        {
          role: "group",
          "aria-labelledby": labelId,
        },
        elementProps,
      ],
    });
    return (
      <SelectGroupContext.Provider value={contextValue}>{element2}</SelectGroupContext.Provider>
    );
  },
);
export const CanvasReleaseRegionContext = reactExports.createContext("overseas");
export const CanvasReleaseRegionProvider = CanvasReleaseRegionContext.Provider;
export const PopoverTitle$1 = reactExports.forwardRef(
  function PopoverTitle2(componentProps, forwardedRef) {
    const { render: render2, className, ...elementProps } = componentProps;
    const { store } = usePopoverRootContext();
    const id2 = useBaseUiId(elementProps.id);
    useIsoLayoutEffect(() => {
      store.set("titleElementId", id2);
      return () => {
        store.set("titleElementId", void 0);
      };
    }, [store, id2]);
    const element2 = useRenderElement("h2", componentProps, {
      ref: forwardedRef,
      props: [
        {
          id: id2,
        },
        elementProps,
      ],
    });
    return element2;
  },
);
export const PopoverDescription$1 = reactExports.forwardRef(
  function PopoverDescription2(componentProps, forwardedRef) {
    const { render: render2, className, ...elementProps } = componentProps;
    const { store } = usePopoverRootContext();
    const id2 = useBaseUiId(elementProps.id);
    useIsoLayoutEffect(() => {
      store.set("descriptionElementId", id2);
      return () => {
        store.set("descriptionElementId", void 0);
      };
    }, [store, id2]);
    const element2 = useRenderElement("p", componentProps, {
      ref: forwardedRef,
      props: [
        {
          id: id2,
        },
        elementProps,
      ],
    });
    return element2;
  },
);
export function getExtFromMime(mime, fallback = "mp4") {
  if (mime.startsWith("image/")) {
    const sub = mime.slice("image/".length);
    if (sub === "jpeg") return "jpg";
    return sub.split("+")[0] || fallback;
  }
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime") || mime.includes("mov")) return "mov";
  if (mime.includes("mkv") || mime.includes("matroska")) return "mkv";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("mp3") || mime.includes("audio/mpeg")) return "mp3";
  if (mime.includes("flac")) return "flac";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav") || mime.includes("wave")) return "wav";
  if (mime.includes("aac")) return "aac";
  if (mime.includes("m4a")) return "m4a";
  return fallback;
}
export const DEFAULT_SOURCE_CACHE_GROUP = 1;
export const ENCRYPTION_KEY_CACHE_GROUP = 2;
function getZoomTier(zoom2) {
  if (zoom2 >= 1.5) return 2;
  if (zoom2 <= 0.5) return 0.5;
  return 1;
}
export function Dialog$1({ ...props }) {
  return <DialogRoot data-slot="dialog" {...props} />;
}
function bucketZoomForBitmap(zoom2) {
  if (!Number.isFinite(zoom2) || zoom2 <= 0) return 1;
  const ceil = Math.ceil(Math.log2(zoom2));
  const bucket = 2 ** ceil;
  return Math.min(4, Math.max(1 / 8, bucket));
}
let currentBucket = 1;
const subscribers$2 = new Set();
function notify$3() {
  for (const cb of subscribers$2) cb();
}
function subscribe$4(cb) {
  subscribers$2.add(cb);
  return () => {
    subscribers$2.delete(cb);
  };
}
function getSnapshot$3() {
  return currentBucket;
}
export function commitStableZoomBucket(zoom2) {
  const next2 = bucketZoomForBitmap(zoom2);
  if (next2 === currentBucket) return;
  currentBucket = next2;
  notify$3();
}
export function seedStableZoomBucket(zoom2) {
  currentBucket = bucketZoomForBitmap(zoom2);
}
export function useStableZoomBucket() {
  return reactExports.useSyncExternalStore(subscribe$4, getSnapshot$3, getSnapshot$3);
}
let currentTier = 1;
const subscribers$1 = new Set();
function notify$2() {
  for (const cb of subscribers$1) cb();
}
function subscribe$3(cb) {
  subscribers$1.add(cb);
  return () => {
    subscribers$1.delete(cb);
  };
}
function getSnapshot$2() {
  return currentTier;
}
export function commitStableZoomTier(zoom2) {
  const next2 = getZoomTier(zoom2);
  if (next2 === currentTier) return;
  currentTier = next2;
  notify$2();
}
export function seedStableZoomTier(zoom2) {
  currentTier = getZoomTier(zoom2);
}
export function useStableZoomTier() {
  return reactExports.useSyncExternalStore(subscribe$3, getSnapshot$2, getSnapshot$2);
}
export function syncStableZoomSignals(zoom2) {
  commitStableZoomTier(zoom2);
  commitStableZoomBucket(zoom2);
}
export function isPluginNode(node2) {
  if (!node2 || node2.type !== CanvasNodeType.File) return false;
  return typeof node2.data?.pluginId === "string";
}
export function orientUserEdge(source, target, lookup) {
  const sourceIsPlugin = isPluginNode(lookup(source));
  const targetIsPlugin = isPluginNode(lookup(target));
  if (sourceIsPlugin && !targetIsPlugin)
    return {
      source: target,
      target: source,
    };
  return {
    source,
    target,
  };
}
export const DEFAULT_MAX_RECOVERIES_PER_FRAME = 8;
export const DEFAULT_RECOVERY_FRAME_BUDGET_MS = 6;
function isEntryEligible(entry) {
  if (!entry.active) return false;
  try {
    return entry.isEligible();
  } catch {
    return false;
  }
}
function emptyTypeCounts() {
  return {
    bitmapCanvas: 0,
    video: 0,
  };
}
function incrementTypeCount(counts, surfaceType) {
  if (surfaceType === "video") counts.video += 1;
  else counts.bitmapCanvas += 1;
}
function defaultScheduleFrame(callback) {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(callback);
    return;
  }
  setTimeout(callback, 0);
}
function defaultNow() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}
export class CanvasSurfaceRecoveryScheduler {
  entries = new Set();
  maxPerFrame;
  frameBudgetMs;
  scheduleFrame;
  now;
  onComplete;
  running = false;
  pendingResumeEpoch = 0;
  pendingTrigger = "resume";
  lastRequestedResumeEpoch = 0;
  disposed = false;
  generation = 0;
  constructor(options = {}) {
    const configuredMaxPerFrame = options.maxPerFrame ?? DEFAULT_MAX_RECOVERIES_PER_FRAME;
    this.maxPerFrame = Number.isFinite(configuredMaxPerFrame)
      ? Math.max(1, Math.floor(configuredMaxPerFrame))
      : DEFAULT_MAX_RECOVERIES_PER_FRAME;
    const configuredFrameBudgetMs = options.frameBudgetMs ?? DEFAULT_RECOVERY_FRAME_BUDGET_MS;
    this.frameBudgetMs = Number.isFinite(configuredFrameBudgetMs)
      ? Math.max(0.5, configuredFrameBudgetMs)
      : DEFAULT_RECOVERY_FRAME_BUDGET_MS;
    this.scheduleFrame = options.scheduleFrame ?? defaultScheduleFrame;
    this.now = options.now ?? defaultNow;
    this.onComplete = options.onComplete ?? (() => void 0);
  }
  activate() {
    if (!this.disposed) return;
    this.disposed = false;
    this.generation += 1;
  }
  register(registration) {
    this.activate();
    const entry = {
      ...registration,
      active: true,
      // A newly mounted surface is fresh. Only surfaces that existed when a
      // resume epoch arrived need lazy catch-up when they become visible.
      handledResumeEpoch: this.lastRequestedResumeEpoch,
    };
    this.entries.add(entry);
    return {
      dispose: () => {
        entry.active = false;
        this.entries.delete(entry);
      },
      notifyEligibilityChanged: () => {
        if (
          this.disposed ||
          !entry.active ||
          entry.handledResumeEpoch >= this.lastRequestedResumeEpoch ||
          !isEntryEligible(entry)
        ) {
          return;
        }
        this.requestRun(this.lastRequestedResumeEpoch, "eligibility");
      },
    };
  }
  scheduleRecovery(resumeEpoch) {
    if (this.disposed || !Number.isFinite(resumeEpoch) || resumeEpoch <= 0) return;
    if (resumeEpoch <= this.lastRequestedResumeEpoch) return;
    this.lastRequestedResumeEpoch = resumeEpoch;
    this.requestRun(resumeEpoch, "resume");
  }
  dispose() {
    this.disposed = true;
    this.generation += 1;
    this.entries.clear();
    this.pendingResumeEpoch = 0;
    this.pendingTrigger = "resume";
    this.lastRequestedResumeEpoch = 0;
    this.running = false;
  }
  requestRun(resumeEpoch, trigger) {
    if (this.disposed || resumeEpoch <= 0) return;
    if (this.running) {
      if (resumeEpoch > this.pendingResumeEpoch) {
        this.pendingResumeEpoch = resumeEpoch;
        this.pendingTrigger = trigger;
      } else if (resumeEpoch === this.pendingResumeEpoch && trigger === "resume") {
        this.pendingTrigger = "resume";
      }
      return;
    }
    this.startRecovery(resumeEpoch, trigger);
  }
  startRecovery(resumeEpoch, trigger) {
    if (this.disposed) return;
    this.running = true;
    const generation = this.generation;
    const startedAt = this.now();
    const eligible = Array.from(this.entries).filter(
      (entry) => entry.handledResumeEpoch < resumeEpoch && isEntryEligible(entry),
    );
    const scheduledByType = emptyTypeCounts();
    for (const entry of eligible) incrementTypeCount(scheduledByType, entry.surfaceType);
    const recoveredByType = emptyTypeCounts();
    let cursor = 0;
    let recoveredCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let frameCount = 0;
    let maxFrameWorkMs = 0;
    const complete = () => {
      if (this.disposed || generation !== this.generation) return;
      this.running = false;
      try {
        this.onComplete({
          resumeEpoch,
          trigger,
          scheduledCount: eligible.length,
          recoveredCount,
          skippedCount,
          errorCount,
          frameCount,
          maxFrameWorkMs,
          scheduledByType,
          recoveredByType,
          durationMs: Math.max(0, this.now() - startedAt),
        });
      } catch {}
      const pendingResumeEpoch = this.pendingResumeEpoch;
      const pendingTrigger = this.pendingTrigger;
      this.pendingResumeEpoch = 0;
      this.pendingTrigger = "resume";
      if (pendingResumeEpoch > 0) this.startRecovery(pendingResumeEpoch, pendingTrigger);
    };
    if (eligible.length === 0) {
      complete();
      return;
    }
    const runFrame = () => {
      if (this.disposed || generation !== this.generation) return;
      frameCount += 1;
      const frameStartedAt = this.now();
      let processedThisFrame = 0;
      while (
        cursor < eligible.length &&
        processedThisFrame < this.maxPerFrame &&
        (processedThisFrame === 0 || this.now() - frameStartedAt < this.frameBudgetMs)
      ) {
        const entry = eligible[cursor++];
        processedThisFrame += 1;
        if (!entry.active || entry.handledResumeEpoch >= resumeEpoch || !isEntryEligible(entry)) {
          skippedCount += 1;
          continue;
        }
        try {
          if (entry.recover()) {
            recoveredCount += 1;
            incrementTypeCount(recoveredByType, entry.surfaceType);
          } else {
            skippedCount += 1;
          }
        } catch {
          errorCount += 1;
        } finally {
          entry.handledResumeEpoch = resumeEpoch;
        }
      }
      maxFrameWorkMs = Math.max(maxFrameWorkMs, Math.max(0, this.now() - frameStartedAt));
      if (cursor < eligible.length) this.scheduleFrame(runFrame);
      else complete();
    };
    this.scheduleFrame(runFrame);
  }
}
