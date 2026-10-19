// schedule.js
import { __jsx } from "../shared/jsx-runtime.js";
import {
  activeIds,
  listeners as modalPresenceListeners,
} from "../workspace/topbar-state-context.jsx";
import reactExports from "react";
import { useAuth } from "../assets/credit-query-keys.jsx";
import { HUB_WEB_INVITE_DOMAINS } from "../vendor-inline/vscode-base/graph.jsx";
function subscribeModalPresence(listener) {
  modalPresenceListeners.add(listener);
  return () => {
    modalPresenceListeners.delete(listener);
  };
}
function getModalPresenceSnapshot() {
  return activeIds.size;
}
export function useHasBlockingModal() {
  const count = reactExports.useSyncExternalStore(
    subscribeModalPresence,
    getModalPresenceSnapshot,
  );
  return count > 0;
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
const candidates = new Map();
const DEFAULT_MODAL_LOADING_TIMEOUT_MS = 5e3;
const MAX_MODAL_LOADING_TIMEOUT_MS = 1e4;
const loadingReservations = new Map();
const suspenders = new Set();
const listeners = new Set();
function emit() {
  for (const listener of listeners) listener();
}
let config = DEFAULT_MODAL_SCHEDULE_CONFIG;
let holderId = null;
let grantCount = 0;
let lastReleaseAt = 0;
let firstEnqueueAt = null;
let timer = null;
function priorityOf(id) {
  const index = config.order.indexOf(id);
  return index === -1 ? config.order.length : index;
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
  const eligible = [...candidates.keys()].filter(
    (id) => !config.disabled.includes(id),
  );
  if (eligible.length === 0) return;
  const now = Date.now();
  const readyAt =
    grantCount === 0
      ? (firstEnqueueAt ?? now) + config.firstGrantDelayMs
      : lastReleaseAt + config.minGapMs;
  if (now < readyAt) {
    timer = setTimeout(schedule, readyAt - now);
    return;
  }
  eligible.sort(
    (a, b) =>
      priorityOf(a) - priorityOf(b) ||
      (candidates.get(a) ?? 0) - (candidates.get(b) ?? 0),
  );
  const blockingDeadlines = [...loadingReservations.entries()]
    .filter(
      ([id, reservation]) =>
        reservation.active &&
        reservation.deadline > now &&
        !config.disabled.includes(id) &&
        !candidates.has(id) &&
        priorityOf(id) < priorityOf(eligible[0]),
    )
    .map(([, reservation]) => reservation.deadline);
  if (blockingDeadlines.length > 0) {
    timer = setTimeout(schedule, Math.min(...blockingDeadlines) - now);
    return;
  }
  holderId = eligible[0];
  grantCount++;
  emit();
}
function enqueueModalCandidate(id) {
  if (candidates.has(id)) return;
  candidates.set(id, Date.now());
  if (firstEnqueueAt === null) firstEnqueueAt = Date.now();
  schedule();
}
function withdrawModalCandidate(id) {
  const existed = candidates.delete(id);
  if (holderId === id) {
    holderId = null;
    lastReleaseAt = Date.now();
    emit();
    schedule();
    return;
  }
  if (existed) schedule();
}
export function setModalScheduleConfig(next) {
  config = next;
  schedule();
}
function beginModalLoadingWait(
  id,
  timeoutMs = DEFAULT_MODAL_LOADING_TIMEOUT_MS,
) {
  const existing = loadingReservations.get(id);
  if (existing) {
    existing.active = true;
  } else {
    const duration = Number.isFinite(timeoutMs)
      ? Math.min(MAX_MODAL_LOADING_TIMEOUT_MS, Math.max(0, timeoutMs))
      : DEFAULT_MODAL_LOADING_TIMEOUT_MS;
    loadingReservations.set(id, {
      deadline: Date.now() + duration,
      active: true,
    });
  }
  schedule();
}
function endModalLoadingWait(id) {
  const reservation = loadingReservations.get(id);
  if (!reservation?.active) return;
  reservation.active = false;
  schedule();
}
function suspendModalScheduler(id) {
  suspenders.add(id);
  clearTimer();
}
function resumeModalScheduler(id) {
  if (!suspenders.delete(id)) return;
  if (suspenders.size === 0) schedule();
}
function subscribeModalScheduler(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function getModalSlotHolderSnapshot() {
  return holderId;
}
export function useModalSlot(id, options) {
  const { candidate } = options;
  reactExports.useEffect(() => {
    if (!candidate) return;
    enqueueModalCandidate(id);
    return () => withdrawModalCandidate(id);
  }, [id, candidate]);
  const holderId = reactExports.useSyncExternalStore(
    subscribeModalScheduler,
    getModalSlotHolderSnapshot,
  );
  return candidate && holderId === id;
}
export function useModalSlotWithLoading(id, options) {
  const {
    candidate,
    loading,
    loadingTimeoutMs = DEFAULT_MODAL_LOADING_TIMEOUT_MS,
  } = options;
  reactExports.useLayoutEffect(
    () => () => {
      withdrawModalCandidate(id);
      endModalLoadingWait(id);
    },
    [id],
  );
  reactExports.useLayoutEffect(() => {
    if (loading) beginModalLoadingWait(id, loadingTimeoutMs);
    if (candidate) enqueueModalCandidate(id);
    else withdrawModalCandidate(id);
    if (!loading) endModalLoadingWait(id);
  }, [id, candidate, loading, loadingTimeoutMs]);
  const holderId = reactExports.useSyncExternalStore(
    subscribeModalScheduler,
    getModalSlotHolderSnapshot,
  );
  return candidate && holderId === id;
}
export function useModalSchedulerSuspension(id, active) {
  reactExports.useEffect(() => {
    if (!active) return;
    suspendModalScheduler(id);
    return () => resumeModalScheduler(id);
  }, [id, active]);
}
export const SESSION_DISMISS_KEY = "__hilo_login_gate_dismissed";
export const LoginGateContext = reactExports.createContext(null);
export function readSessionDismissed() {
  try {
    return sessionStorage.getItem(SESSION_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}
export function useLoginGate() {
  const ctx = reactExports.useContext(LoginGateContext);
  if (!ctx)
    throw new Error("useLoginGate must be used within <LoginGateProvider>");
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
  const url = new URL(
    "/project-invite",
    HUB_WEB_INVITE_DOMAINS[environment][input.region],
  );
  url.search = buildProjectInviteQuery(input);
  return url.toString();
}
