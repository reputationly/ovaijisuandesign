/**
 * 画布图片任务的调度器 —— 从产物主包整段取回（第 82 轮）。
 *
 * 这是一个**帧预算调度器**：每帧最多花 `BUDGET_MS`（4ms）、最多跑 `MAX_TASKS`（4）个任务；
 * 重任务之间隔 `HEAVY_TASK_GAP_MS`（200ms）；有任务等超过 `STARVATION_MS`（1500ms）
 * 就强制插队，避免饿死。`defaultHost` 提供 now / rAF / rIC / setTimeout 的可替换宿主。
 */
const STARVATION_MS = 1500;
const BUDGET_MS = 4;
const MAX_TASKS = 4;
const HEAVY_TASK_GAP_MS = 200;

function defaultHost() {
  const timer2 = (callback, delay2) => globalThis.setTimeout(callback, delay2);
  return {
    now: () => performance.now(),
    requestAnimationFrame: globalThis.requestAnimationFrame ? (callback) => globalThis.requestAnimationFrame(callback) : (callback) => timer2(callback, 16),
    cancelAnimationFrame: globalThis.cancelAnimationFrame ? (id2) => globalThis.cancelAnimationFrame(id2) : (id2) => globalThis.clearTimeout(id2),
    requestIdleCallback: globalThis.requestIdleCallback?.bind(globalThis),
    cancelIdleCallback: globalThis.cancelIdleCallback?.bind(globalThis),
    setTimeout: timer2,
    clearTimeout: (id2) => globalThis.clearTimeout(id2),
    reportError: (error) => {
      if (typeof globalThis.reportError === "function") globalThis.reportError(error);
      else console.error(error);
    }
  };
}

function createImageWorkScheduler(host = defaultHost(), options2 = {}) {
  const tasks = /* @__PURE__ */ new Set();
  let active2 = true;
  let interacting = false;
  let disposed = false;
  let running2 = false;
  let frame2;
  let idle;
  let timer2;
  let cooldownTimer = false;
  let nextHeavyAt = 0;
  let epoch = 0;
  let waitingSince = host.now();
  function report(error) {
    try {
      host.reportError?.(error);
    } catch {
    }
  }
  function cancelHostCallbacks() {
    epoch++;
    if (frame2 !== void 0) host.cancelAnimationFrame(frame2);
    if (idle !== void 0) host.cancelIdleCallback?.(idle);
    if (timer2 !== void 0) host.clearTimeout(timer2);
    frame2 = idle = timer2 = void 0;
    cooldownTimer = false;
  }
  function cancelTask(task2) {
    if (!tasks.delete(task2)) return;
    task2.detach();
    if (!hasRunnableTask()) {
      cancelHostCallbacks();
      schedule2();
    }
    try {
      task2.options.onCancel?.();
    } catch (error) {
      report(error);
    }
  }
  function canRun(task2) {
    return !task2.options.idleOnly || !interacting && host.now() >= nextHeavyAt;
  }
  function hasRunnableTask() {
    for (const task2 of tasks) {
      if (canRun(task2)) return true;
    }
    return false;
  }
  function nextTask() {
    let best;
    let bestPriority = Infinity;
    for (const task2 of tasks) {
      if (!canRun(task2)) continue;
      let priority = 0;
      try {
        priority = task2.options.priority?.() ?? 0;
      } catch (error) {
        report(error);
      }
      if (Number.isNaN(priority)) priority = 0;
      if (!best || priority < bestPriority) {
        best = task2;
        bestPriority = priority;
      }
    }
    return best;
  }
  function drain(deadline) {
    if (disposed || !active2 || !tasks.size) return;
    const single = !deadline || deadline.didTimeout;
    if (interacting && !single) return;
    running2 = true;
    const start2 = host.now();
    try {
      for (let count2 = 0; count2 < (single ? 1 : MAX_TASKS); count2++) {
        if (disposed || !active2 || !tasks.size || interacting && !single) break;
        if (!single && (host.now() - start2 >= BUDGET_MS || deadline.timeRemaining() <= 0)) break;
        const task2 = nextTask();
        if (!task2 || !canRun(task2) || !tasks.delete(task2)) break;
        task2.detach();
        waitingSince = host.now();
        if (task2.options.idleOnly) nextHeavyAt = waitingSince + HEAVY_TASK_GAP_MS;
        try {
          task2.run();
        } catch (error) {
          report(error);
        }
        if (task2.options.idleOnly) break;
      }
    } finally {
      running2 = false;
      schedule2(true);
    }
  }
  function schedule2(yieldFrame = false) {
    if (disposed || !active2 || running2 || !tasks.size) return;
    if (frame2 !== void 0 || idle !== void 0 || timer2 !== void 0) return;
    const token2 = epoch;
    if (!hasRunnableTask()) {
      if (!interacting) {
        cooldownTimer = true;
        timer2 = host.setTimeout(() => {
          if (token2 !== epoch) return;
          timer2 = void 0;
          cooldownTimer = false;
          schedule2();
        }, Math.max(1, nextHeavyAt - host.now()));
      }
      return;
    }
    if (yieldFrame) {
      frame2 = host.requestAnimationFrame(() => {
        if (token2 !== epoch) return;
        frame2 = void 0;
        schedule2();
      });
    } else if (interacting) {
      timer2 = host.setTimeout(
        () => {
          if (token2 !== epoch) return;
          timer2 = void 0;
          drain();
        },
        // Admit one ordinary task per frame while moving, when opted in.
        // idleOnly work remains blocked by canRun() until interaction ends.
        options2.continueDuringInteraction ? 16 : Math.max(0, STARVATION_MS - (host.now() - waitingSince))
      );
    } else if (host.requestIdleCallback && host.cancelIdleCallback) {
      idle = host.requestIdleCallback(
        (deadline) => {
          if (token2 !== epoch) return;
          idle = void 0;
          drain(deadline);
        },
        { timeout: Math.max(1, STARVATION_MS - (host.now() - waitingSince)) }
      );
    } else {
      timer2 = host.setTimeout(() => {
        if (token2 !== epoch) return;
        timer2 = void 0;
        drain();
      }, 16);
    }
  }
  function clear() {
    cancelHostCallbacks();
    nextHeavyAt = 0;
    for (const task2 of [...tasks]) cancelTask(task2);
  }
  return {
    enqueue(run2, options22 = {}) {
      const task2 = { run: run2, options: options22, detach: () => {
      } };
      if (!tasks.size) waitingSince = host.now();
      tasks.add(task2);
      const cancel = () => cancelTask(task2);
      if (disposed || options22.signal?.aborted) {
        cancel();
        return cancel;
      }
      if (options22.signal) {
        const signal = options22.signal;
        signal.addEventListener("abort", cancel, { once: true });
        task2.detach = () => signal.removeEventListener("abort", cancel);
      }
      if (cooldownTimer && !options22.idleOnly) cancelHostCallbacks();
      schedule2();
      return cancel;
    },
    setInteracting(value) {
      if (disposed || interacting === value) return;
      interacting = value;
      cancelHostCallbacks();
      schedule2(true);
    },
    setActive(value) {
      if (disposed || active2 === value) return;
      active2 = value;
      cancelHostCallbacks();
      if (active2) {
        waitingSince = host.now();
        schedule2(true);
      }
    },
    clear,
    dispose() {
      if (disposed) return;
      disposed = true;
      clear();
    }
  };
}

export { createImageWorkScheduler, defaultHost };
