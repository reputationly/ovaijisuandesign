// thumbnail-load-scheduler.jsx
import { reactExports, useStorage } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useAuth } from "../assets/apply-asset-change.jsx";
import { HUB_WEB_INVITE_DOMAINS } from "../vendor-inline/vscode-base/graph.jsx";
import {
  getModalPresenceSnapshot,
  subscribeModalPresence,
  useBlockingModalPresence,
} from "../workspace/use-hub-logo-hover-animation.jsx";
export function useHasBlockingModal() {
  const count2 = reactExports.useSyncExternalStore(
    subscribeModalPresence,
    getModalPresenceSnapshot,
  );
  return count2 > 0;
}
export const BLOCKING_MODAL_IDS = {
  watermarkOnboarding: "watermark-onboarding",
  serverDrivenPopup: "server-driven-popup",
  interestSelection: "interest-selection",
  loginGate: "login-gate",
  promotion: "promotion-dialog",
  forcedUpdate: "forced-update",
};
export const STARTUP_MODAL_IDS = {
  /** 服务端编排弹窗（GENERAL / MIGRATION / FEATURE，即 H3 上新弹窗）。 */
  serverDrivenPopup: "server-driven-popup",
  /** 登录后首次创作方向选择。 */
  interestSelection: "interest-selection",
  /** 首启 AI 水印合规弹窗（合规要求，禁止被 disabled）。 */
  watermarkOnboarding: "watermark-onboarding",
  /** 促销活动弹窗（每日一次）。 */
  promotion: "promotion-dialog",
  /** 首页输入框 coach mark 引导（锁定式 popover，队列尾部，等所有弹窗弹完）。 */
  homeCoachMarks: "home-coach-marks",
};
const KNOWN_IDS = Object.values(STARTUP_MODAL_IDS);
export const DEFAULT_MODAL_SCHEDULE_CONFIG = {
  order: [
    STARTUP_MODAL_IDS.serverDrivenPopup,
    STARTUP_MODAL_IDS.interestSelection,
    STARTUP_MODAL_IDS.watermarkOnboarding,
    STARTUP_MODAL_IDS.promotion,
    STARTUP_MODAL_IDS.homeCoachMarks,
  ],
  disabled: [],
  maxPerLaunch: 10,
  minGapMs: 400,
  firstGrantDelayMs: 1500,
};
function parseIdList(raw2) {
  if (!Array.isArray(raw2)) return null;
  const out = [];
  for (const item of raw2) {
    if (typeof item !== "string") continue;
    if (!KNOWN_IDS.includes(item)) continue;
    if (out.includes(item)) continue;
    out.push(item);
  }
  return out;
}
function parseBoundedNumber(raw2, min2, max2, fallback) {
  if (typeof raw2 !== "number" || !Number.isFinite(raw2)) return fallback;
  if (raw2 < min2 || raw2 > max2) return fallback;
  return Math.floor(raw2);
}
export function parseStartupModalSchedule(raw2) {
  if (!raw2 || typeof raw2 !== "object" || Array.isArray(raw2)) {
    return DEFAULT_MODAL_SCHEDULE_CONFIG;
  }
  const cfg = raw2;
  const configuredOrder = parseIdList(cfg.order) ?? [];
  const order2 = [
    ...configuredOrder,
    ...DEFAULT_MODAL_SCHEDULE_CONFIG.order.filter((id2) => !configuredOrder.includes(id2)),
  ];
  const disabled2 = (parseIdList(cfg.disabled) ?? []).filter(
    // 合规红线:水印首启弹窗不允许通过远端配置关闭。
    (id2) => id2 !== STARTUP_MODAL_IDS.watermarkOnboarding,
  );
  return {
    order: order2,
    disabled: disabled2,
    maxPerLaunch: parseBoundedNumber(
      cfg.max_per_launch,
      1,
      20,
      DEFAULT_MODAL_SCHEDULE_CONFIG.maxPerLaunch,
    ),
    minGapMs: parseBoundedNumber(cfg.min_gap_ms, 0, 3e4, DEFAULT_MODAL_SCHEDULE_CONFIG.minGapMs),
    firstGrantDelayMs: parseBoundedNumber(
      cfg.first_grant_delay_ms,
      0,
      1e4,
      DEFAULT_MODAL_SCHEDULE_CONFIG.firstGrantDelayMs,
    ),
  };
}
let config = DEFAULT_MODAL_SCHEDULE_CONFIG;
const candidates = new Map();
const DEFAULT_MODAL_LOADING_TIMEOUT_MS = 5e3;
const MAX_MODAL_LOADING_TIMEOUT_MS = 1e4;
const loadingReservations = new Map();
let holderId = null;
let grantCount = 0;
let lastReleaseAt = 0;
let firstEnqueueAt = null;
let timer = null;
const suspenders = new Set();
const listeners$4 = new Set();
function emit$2() {
  for (const listener of listeners$4) listener();
}
function priorityOf(id2) {
  const index2 = config.order.indexOf(id2);
  return index2 === -1 ? config.order.length : index2;
}
function clearTimer() {
  if (timer === null) return;
  clearTimeout(timer);
  timer = null;
}
function schedule() {
  clearTimer();
  if (suspenders.size > 0) return;
  if (holderId !== null) return;
  if (grantCount >= config.maxPerLaunch) return;
  const eligible = [...candidates.keys()].filter((id2) => !config.disabled.includes(id2));
  if (eligible.length === 0) return;
  const now2 = Date.now();
  const readyAt =
    grantCount === 0
      ? (firstEnqueueAt ?? now2) + config.firstGrantDelayMs
      : lastReleaseAt + config.minGapMs;
  if (now2 < readyAt) {
    timer = setTimeout(schedule, readyAt - now2);
    return;
  }
  eligible.sort(
    (a2, b3) =>
      priorityOf(a2) - priorityOf(b3) || (candidates.get(a2) ?? 0) - (candidates.get(b3) ?? 0),
  );
  const blockingDeadlines = [...loadingReservations.entries()]
    .filter(
      ([id2, reservation]) =>
        reservation.active &&
        reservation.deadline > now2 &&
        !config.disabled.includes(id2) &&
        !candidates.has(id2) &&
        priorityOf(id2) < priorityOf(eligible[0]),
    )
    .map(([, reservation]) => reservation.deadline);
  if (blockingDeadlines.length > 0) {
    timer = setTimeout(schedule, Math.min(...blockingDeadlines) - now2);
    return;
  }
  holderId = eligible[0];
  grantCount++;
  emit$2();
}
function enqueueModalCandidate(id2) {
  if (candidates.has(id2)) return;
  candidates.set(id2, Date.now());
  if (firstEnqueueAt === null) firstEnqueueAt = Date.now();
  schedule();
}
function withdrawModalCandidate(id2) {
  const existed = candidates.delete(id2);
  if (holderId === id2) {
    holderId = null;
    lastReleaseAt = Date.now();
    emit$2();
    schedule();
    return;
  }
  if (existed) schedule();
}
function beginModalLoadingWait(id2, timeoutMs = DEFAULT_MODAL_LOADING_TIMEOUT_MS) {
  const existing = loadingReservations.get(id2);
  if (existing) {
    existing.active = true;
  } else {
    const duration = Number.isFinite(timeoutMs)
      ? Math.min(MAX_MODAL_LOADING_TIMEOUT_MS, Math.max(0, timeoutMs))
      : DEFAULT_MODAL_LOADING_TIMEOUT_MS;
    loadingReservations.set(id2, {
      deadline: Date.now() + duration,
      active: true,
    });
  }
  schedule();
}
function endModalLoadingWait(id2) {
  const reservation = loadingReservations.get(id2);
  if (!reservation?.active) return;
  reservation.active = false;
  schedule();
}
export function setModalScheduleConfig(next2) {
  config = next2;
  schedule();
}
function suspendModalScheduler(id2) {
  suspenders.add(id2);
  clearTimer();
}
function resumeModalScheduler(id2) {
  if (!suspenders.delete(id2)) return;
  if (suspenders.size === 0) schedule();
}
function subscribeModalScheduler(listener) {
  listeners$4.add(listener);
  return () => {
    listeners$4.delete(listener);
  };
}
function getModalSlotHolderSnapshot() {
  return holderId;
}
export function useModalSlot(id2, options) {
  const { candidate } = options;
  reactExports.useEffect(() => {
    if (!candidate) return;
    enqueueModalCandidate(id2);
    return () => withdrawModalCandidate(id2);
  }, [id2, candidate]);
  const holderId2 = reactExports.useSyncExternalStore(
    subscribeModalScheduler,
    getModalSlotHolderSnapshot,
  );
  return candidate && holderId2 === id2;
}
export function useModalSlotWithLoading(id2, options) {
  const { candidate, loading, loadingTimeoutMs = DEFAULT_MODAL_LOADING_TIMEOUT_MS } = options;
  reactExports.useLayoutEffect(
    () => () => {
      withdrawModalCandidate(id2);
      endModalLoadingWait(id2);
    },
    [id2],
  );
  reactExports.useLayoutEffect(() => {
    if (loading) beginModalLoadingWait(id2, loadingTimeoutMs);
    if (candidate) enqueueModalCandidate(id2);
    else withdrawModalCandidate(id2);
    if (!loading) endModalLoadingWait(id2);
  }, [id2, candidate, loading, loadingTimeoutMs]);
  const holderId2 = reactExports.useSyncExternalStore(
    subscribeModalScheduler,
    getModalSlotHolderSnapshot,
  );
  return candidate && holderId2 === id2;
}
function useModalSchedulerSuspension(id2, active2) {
  reactExports.useEffect(() => {
    if (!active2) return;
    suspendModalScheduler(id2);
    return () => resumeModalScheduler(id2);
  }, [id2, active2]);
}
const SESSION_DISMISS_KEY = "__hilo_login_gate_dismissed";
const LoginGateContext = reactExports.createContext(null);
function readSessionDismissed() {
  try {
    return sessionStorage.getItem(SESSION_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}
function writeSessionDismissed(value) {
  try {
    if (value) sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    else sessionStorage.removeItem(SESSION_DISMISS_KEY);
  } catch {}
}
export function LoginGateProvider({ children: children2 }) {
  const { user, isLoggedIn, isLoading, login } = useAuth();
  const [isOpen, setIsOpen] = reactExports.useState(false);
  const sessionDismissedRef = reactExports.useRef(readSessionDismissed());
  const [hasEverLoggedIn, setHasEverLoggedIn, , hasEverLoggedInHydrated] =
    useStorage("global.hasEverLoggedIn");
  const everLoggedInWriteAttemptedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (isLoggedIn && hasEverLoggedInHydrated && !hasEverLoggedIn) {
      if (everLoggedInWriteAttemptedRef.current) return;
      everLoggedInWriteAttemptedRef.current = true;
      setHasEverLoggedIn(true);
    }
  }, [isLoggedIn, hasEverLoggedIn, hasEverLoggedInHydrated, setHasEverLoggedIn]);
  reactExports.useEffect(() => {
    if (isLoading) return;
    if (user) {
      setIsOpen(false);
      return;
    }
    if (!hasEverLoggedInHydrated) return;
    if (hasEverLoggedIn) return;
    if (!sessionDismissedRef.current) {
      setIsOpen(true);
    }
  }, [user, isLoading, hasEverLoggedIn, hasEverLoggedInHydrated]);
  const forceOpen = reactExports.useCallback(() => {
    sessionDismissedRef.current = false;
    writeSessionDismissed(false);
    setIsOpen(true);
  }, []);
  const dismissForSession = reactExports.useCallback(() => {
    sessionDismissedRef.current = true;
    writeSessionDismissed(true);
    setIsOpen(false);
  }, []);
  const triggerLogin = reactExports.useCallback(() => {
    login();
  }, [login]);
  useModalSchedulerSuspension(BLOCKING_MODAL_IDS.loginGate, isOpen);
  useBlockingModalPresence(BLOCKING_MODAL_IDS.loginGate, isOpen);
  const value = reactExports.useMemo(
    () => ({
      isOpen,
      forceOpen,
      dismissForSession,
      triggerLogin,
    }),
    [isOpen, forceOpen, dismissForSession, triggerLogin],
  );
  return <LoginGateContext.Provider value={value}>{children2}</LoginGateContext.Provider>;
}
export function useLoginGate() {
  const ctx = reactExports.useContext(LoginGateContext);
  if (!ctx) throw new Error("useLoginGate must be used within <LoginGateProvider>");
  return ctx;
}
export function useLoginGuard() {
  const { isLoggedIn } = useAuth();
  const loginGate = useLoginGate();
  const guard = reactExports.useCallback(() => {
    if (isLoggedIn) return true;
    loginGate.forceOpen();
    return false;
  }, [isLoggedIn, loginGate]);
  const requireLogin = reactExports.useCallback(
    (action) => {
      return (...args) => {
        if (!isLoggedIn) {
          loginGate.forceOpen();
          return;
        }
        return action(...args);
      };
    },
    [isLoggedIn, loginGate],
  );
  const LoginDialog = null;
  return {
    guard,
    requireLogin,
    LoginDialog,
  };
}
function buildProjectInviteQuery(input) {
  const params = new URLSearchParams({
    token: input.token,
  });
  if (input.projectName) params.set("name", input.projectName);
  if (input.inviterName) params.set("inviter", input.inviterName);
  if (input.memberCount && input.memberCount > 0) {
    params.set("members", String(input.memberCount));
  }
  return params.toString();
}
export function buildProjectInviteWebLink(input) {
  const environment = input.channel === "prod" ? "prod" : "test";
  const url2 = new URL("/project-invite", HUB_WEB_INVITE_DOMAINS[environment][input.region]);
  url2.search = buildProjectInviteQuery(input);
  return url2.toString();
}
export const THUMBNAIL_LOAD_TIMEOUT_MS = 3e4;
const INTERACTIVE_BURST_LIMIT = 3;
function createEmptyQueues() {
  return {
    interactive: [],
    normal: [],
    prefetch: [],
  };
}
export class ThumbnailLoadScheduler {
  constructor(maxConcurrency) {
    this.maxConcurrency = maxConcurrency;
    if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1) {
      throw new Error("maxConcurrency must be a positive integer");
    }
  }
  activeCount = 0;
  interactiveBurstCount = 0;
  queues = createEmptyQueues();
  schedule(start2, priority = "normal") {
    const task = {
      start: start2,
      priority,
      state: "queued",
    };
    this.queues[priority].push(task);
    this.dispatch();
    return () => this.cancel(task);
  }
  cancel(task) {
    if (task.state === "done") return;
    if (task.state === "active") {
      task.release?.();
      return;
    }
    const queue = this.queues[task.priority];
    const index2 = queue.indexOf(task);
    if (index2 >= 0) queue.splice(index2, 1);
    task.state = "done";
  }
  dispatch() {
    while (this.activeCount < this.maxConcurrency) {
      const task = this.takeNextTask();
      if (!task) return;
      if (task.state !== "queued") continue;
      task.state = "active";
      this.activeCount += 1;
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        task.state = "done";
        task.release = void 0;
        this.activeCount -= 1;
        this.dispatch();
      };
      task.release = release;
      try {
        task.start(release);
      } catch (error) {
        release();
        throw error;
      }
    }
  }
  /**
   * Interactive work jumps queued prefetch work, but a bounded burst makes
   * progress for normal work even while interactive requests keep arriving.
   * Prefetch remains best-effort and only runs while foreground queues are
   * empty.
   */
  takeNextTask() {
    const interactiveQueue = this.queues.interactive;
    const normalQueue = this.queues.normal;
    if (
      interactiveQueue.length > 0 &&
      (this.interactiveBurstCount < INTERACTIVE_BURST_LIMIT || normalQueue.length === 0)
    ) {
      this.interactiveBurstCount = Math.min(
        this.interactiveBurstCount + 1,
        INTERACTIVE_BURST_LIMIT,
      );
      return interactiveQueue.shift();
    }
    if (normalQueue.length > 0) {
      this.interactiveBurstCount = 0;
      return normalQueue.shift();
    }
    this.interactiveBurstCount = 0;
    return this.queues.prefetch.shift();
  }
}
