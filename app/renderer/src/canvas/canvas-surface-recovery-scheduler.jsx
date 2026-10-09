// canvas-surface-recovery-scheduler.jsx
import {
  DEFAULT_MAX_RECOVERIES_PER_FRAME,
  DEFAULT_RECOVERY_FRAME_BUDGET_MS,
} from "./separator.jsx";
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CanvasRenderRuntimeContext,
  DEFAULT_CANVAS_RENDER_POLICY,
  recordCanvasRenderPolicy,
  recordCanvasResumeEpoch,
  recordCanvasSurfaceRecovery,
} from "../infra/use-plugin-metadata-store.js";

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

class CanvasSurfaceRecoveryScheduler {
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
    const configuredMaxPerFrame =
      options.maxPerFrame ?? DEFAULT_MAX_RECOVERIES_PER_FRAME;
    this.maxPerFrame = Number.isFinite(configuredMaxPerFrame)
      ? Math.max(1, Math.floor(configuredMaxPerFrame))
      : DEFAULT_MAX_RECOVERIES_PER_FRAME;
    const configuredFrameBudgetMs =
      options.frameBudgetMs ?? DEFAULT_RECOVERY_FRAME_BUDGET_MS;
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
    if (this.disposed || !Number.isFinite(resumeEpoch) || resumeEpoch <= 0)
      return;
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
      } else if (
        resumeEpoch === this.pendingResumeEpoch &&
        trigger === "resume"
      ) {
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
      (entry) =>
        entry.handledResumeEpoch < resumeEpoch && isEntryEligible(entry),
    );
    const scheduledByType = emptyTypeCounts();
    for (const entry of eligible)
      incrementTypeCount(scheduledByType, entry.surfaceType);
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
      if (pendingResumeEpoch > 0)
        this.startRecovery(pendingResumeEpoch, pendingTrigger);
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
        (processedThisFrame === 0 ||
          this.now() - frameStartedAt < this.frameBudgetMs)
      ) {
        const entry = eligible[cursor++];
        processedThisFrame += 1;
        if (
          !entry.active ||
          entry.handledResumeEpoch >= resumeEpoch ||
          !isEntryEligible(entry)
        ) {
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
      maxFrameWorkMs = Math.max(
        maxFrameWorkMs,
        Math.max(0, this.now() - frameStartedAt),
      );
      if (cursor < eligible.length) this.scheduleFrame(runFrame);
      else complete();
    };
    this.scheduleFrame(runFrame);
  }
}

export function CanvasRenderPolicyProvider({
  policy = DEFAULT_CANVAS_RENDER_POLICY,
  resumeEpoch = 0,
  onRecovery,
  children: children2,
}) {
  const onRecoveryRef = reactExports.useRef(onRecovery);
  onRecoveryRef.current = onRecovery;
  const scheduler2 = reactExports.useMemo(
    () =>
      new CanvasSurfaceRecoveryScheduler({
        maxPerFrame: policy.recoveryMaxPerFrame,
        frameBudgetMs: policy.recoveryFrameBudgetMs,
        onComplete: (result) => {
          recordCanvasSurfaceRecovery(result);
          onRecoveryRef.current?.(result);
        },
      }),
    [policy.recoveryFrameBudgetMs, policy.recoveryMaxPerFrame],
  );
  reactExports.useEffect(() => {
    scheduler2.activate();
    return () => scheduler2.dispose();
  }, [scheduler2]);
  reactExports.useEffect(() => {
    recordCanvasRenderPolicy(policy);
  }, [policy]);
  reactExports.useEffect(() => {
    recordCanvasResumeEpoch(resumeEpoch);
    if (policy.recoverAfterResume) scheduler2.scheduleRecovery(resumeEpoch);
  }, [policy.recoverAfterResume, resumeEpoch, scheduler2]);
  const value = reactExports.useMemo(
    () => ({
      policy,
      registerSurface: (registration) => scheduler2.register(registration),
    }),
    [policy, scheduler2],
  );
  return (
    <CanvasRenderRuntimeContext.Provider value={value}>
      {children2}
    </CanvasRenderRuntimeContext.Provider>
  );
}
