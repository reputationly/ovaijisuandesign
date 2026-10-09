// use-hub-logo-hover-animation.jsx
import {
  reactExports,
  instance,
  useNavigate,
  ContextMenuRoot,
  getCdnRegion,
  CDN_BASE_MAP,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { buildWorkspaceSearch } from "./create-visible-preview-tabs-store.js";
import { WorkspaceEvents } from "./workspace-events.js";
export const workspaceEvents = new WorkspaceEvents();
const READY_TIMEOUT_MS = 2e3;
function scrollActiveChatToBottom() {
  window.requestAnimationFrame(() => {
    const messageList = document.querySelector('[data-action-ui-id="chat-message-list"]');
    if (!messageList) return;
    messageList.scrollTop = messageList.scrollHeight;
  });
}
function waitForSubscribersReady(workspaceId2) {
  if (workspaceEvents.isSubscribersReady(workspaceId2)) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timer2 = window.setTimeout(() => {
      sub.dispose();
      resolve();
    }, READY_TIMEOUT_MS);
    const sub = workspaceEvents.onSubscribersReady((event) => {
      if (event.workspaceId !== workspaceId2) return;
      clearTimeout(timer2);
      sub.dispose();
      resolve();
    });
  });
}
export function useWorkspaceFocusNavigation(currentWorkspaceId, activateWorkspace) {
  const navigate = useNavigate();
  const focusAfterNavigation = reactExports.useCallback(
    (workspaceId2, focusFn) => {
      if (workspaceId2 === currentWorkspaceId) {
        focusFn();
        return;
      }
      activateWorkspace(workspaceId2);
      void navigate({
        to: "/workspace",
        search: buildWorkspaceSearch(workspaceId2),
      }).then(async () => {
        await waitForSubscribersReady(workspaceId2);
        focusFn();
      });
    },
    [activateWorkspace, currentWorkspaceId, navigate],
  );
  const navigateAndFocus = reactExports.useCallback(
    (target) => {
      focusAfterNavigation(target.workspaceId, () => {
        if (target.source === "canvas") {
          const nodeId = target.sessionId.startsWith("canvas:")
            ? target.sessionId.slice("canvas:".length)
            : target.sessionId;
          if (!nodeId) return;
          workspaceEvents.fireCanvasFocus(target.workspaceId, [nodeId]);
        } else {
          workspaceEvents.fireSwitchSession(target.workspaceId, target.sessionId);
          scrollActiveChatToBottom();
        }
      });
    },
    [focusAfterNavigation],
  );
  const navigateAndFocusCanvas = reactExports.useCallback(
    (workspaceId2, nodeId) => {
      focusAfterNavigation(workspaceId2, () =>
        workspaceEvents.fireCanvasFocus(workspaceId2, [nodeId]),
      );
    },
    [focusAfterNavigation],
  );
  const navigateAndFocusSession = reactExports.useCallback(
    (workspaceId2, sessionId) => {
      focusAfterNavigation(workspaceId2, () => {
        workspaceEvents.fireSwitchSession(workspaceId2, sessionId);
        scrollActiveChatToBottom();
      });
    },
    [focusAfterNavigation],
  );
  return {
    navigateAndFocus,
    navigateAndFocusCanvas,
    navigateAndFocusSession,
  };
}
export const TopbarStateContext = reactExports.createContext({
  entries: [],
  previewEntries: [],
  currentWorkspaceId: null,
  isHomeActive: true,
  activeRuntime: null,
  searchSessions: [],
  searchWorkspaces: [],
  activeTasks: [],
  completedTasks: [],
  unreadCompletedTaskCount: 0,
  workspaceStatusById: new Map(),
});
export const TopbarActionsContext = reactExports.createContext(null);
export function useTopbarState() {
  return reactExports.useContext(TopbarStateContext);
}
export function useTopbarActions() {
  const actions = reactExports.useContext(TopbarActionsContext);
  if (!actions) throw new Error("useTopbarActions must be used within TopbarProvider");
  return actions;
}
export const COMPLETED_TASK_LIMIT = 20;
export function getTaskCompletionKey(task) {
  const prompt = task.promptPreview?.trim();
  return prompt ? `${task.workspaceId}:prompt:${prompt}` : `${task.workspaceId}:task:${task.id}`;
}
let snapshots = new Map();
const listeners$6 = new Set();
let emitScheduled = false;
export function getTopbarSnapshots() {
  return snapshots;
}
export function setTopbarSnapshot(workspaceId2, snapshot2) {
  const previousSnapshot = snapshots.get(workspaceId2);
  if (previousSnapshot && areTopbarSnapshotsEqual(previousSnapshot, snapshot2)) return;
  snapshots = new Map(snapshots).set(workspaceId2, snapshot2);
  scheduleEmit();
}
function areTopbarSnapshotsEqual(previous2, next2) {
  return (
    areShallowEqualArrays(previous2.sessions, next2.sessions) &&
    areShallowEqualArrays(previous2.tasks, next2.tasks)
  );
}
function areShallowEqualArrays(previous2, next2) {
  if (Object.is(previous2, next2)) return true;
  if (previous2.length !== next2.length) return false;
  return previous2.every((item, index2) => shallowEqualObject$1(item, next2[index2]));
}
function shallowEqualObject$1(previous2, next2) {
  if (Object.is(previous2, next2)) return true;
  const previousKeys = Object.keys(previous2);
  const nextKeys = Object.keys(next2);
  if (previousKeys.length !== nextKeys.length) return false;
  return previousKeys.every(
    (key2) => Object.hasOwn(next2, key2) && Object.is(previous2[key2], next2[key2]),
  );
}
export function pruneTopbarSnapshots(activeWorkspaceIds) {
  let changed = false;
  const next2 = new Map(snapshots);
  for (const id2 of next2.keys()) {
    if (!activeWorkspaceIds.has(id2)) {
      next2.delete(id2);
      changed = true;
    }
  }
  if (!changed) return;
  snapshots = next2;
  scheduleEmit();
}
export function subscribeTopbarSnapshots(listener) {
  listeners$6.add(listener);
  return () => listeners$6.delete(listener);
}
function scheduleEmit() {
  if (emitScheduled) return;
  emitScheduled = true;
  queueMicrotask(() => {
    emitScheduled = false;
    for (const listener of listeners$6) listener();
  });
}
export function isChineseLocale() {
  return (instance.resolvedLanguage ?? instance.language).startsWith("zh");
}
const MAX_LISTED_BUSY_PROJECTS = 3;
export function formatBusyProjects(names) {
  const zh2 = isChineseLocale();
  const listed = names.slice(0, MAX_LISTED_BUSY_PROJECTS).join(zh2 ? "、" : ", ");
  if (names.length <= MAX_LISTED_BUSY_PROJECTS) return listed;
  return zh2 ? `${listed} 等` : `${listed} and others`;
}
export function workspaceLimitFallback() {
  return isChineseLocale()
    ? "最多同时运行 {{max}} 个项目，运行位当前都被占用。稍后再试即可打开。"
    : "Up to {{max}} projects can run at once and every slot is currently taken. Try again shortly.";
}
export function workspaceLimitNamedFallback() {
  return isChineseLocale()
    ? "最多同时运行 {{max}} 个项目，{{projects}} 正在生成中。等它完成后即可打开。"
    : "Up to {{max}} projects can run at once, and {{projects}} are still generating. Open this one once that finishes.";
}
export function retryInFlightFallback() {
  return isChineseLocale()
    ? "这个 workspace 正在重启，请稍后再试。"
    : "This workspace is restarting. Please try again in a moment.";
}
export function storageRestartRequiredFallback() {
  return isChineseLocale()
    ? "保存位置刚刚发生更改。请先重启应用，再新建项目，确保文件保存到正确位置。"
    : "The save location just changed. Restart the app before creating a project so files are saved in the correct location.";
}
export function storageLocationUnavailableFallback() {
  return isChineseLocale()
    ? "已设置的保存位置当前不可用。请重新连接磁盘，或前往“设置 > 存储”更改位置后再试。"
    : "The configured save location is unavailable. Reconnect the drive or change it in Settings > Storage, then try again.";
}
export function storageCreateUnavailableFallback(statusVerified) {
  if (!statusVerified) {
    return isChineseLocale()
      ? "暂时无法确认当前保存位置，项目未创建。请重启应用；如果问题仍存在，请前往“设置 > 存储”检查。"
      : "The current save location could not be verified, so the project was not created. Restart the app, then check Settings > Storage if the issue persists.";
  }
  return isChineseLocale()
    ? "设置的保存位置当前不可用，项目未创建。请前往“设置 > 存储”恢复，或在新建弹窗中明确选择本次临时使用默认位置。"
    : "The configured save location is unavailable, so the project was not created. Recover it in Settings > Storage, or explicitly allow built-in storage for one create.";
}
export function storageMigrationInProgressFallback() {
  return isChineseLocale()
    ? "正在迁移项目和生成文件，请等待迁移完成并按提示重启后再试。"
    : "Projects and generated files are being migrated. Wait for migration to finish and restart when prompted.";
}
export function ContextMenu({ ...props }) {
  return <ContextMenuRoot data-slot="context-menu" {...props} />;
}
export const OSS_WEBP = "?x-oss-process=image/format,webp";
export function cdnRegionalImage(files) {
  const region = getCdnRegion();
  return `${CDN_BASE_MAP[region]}/${files[region]}${OSS_WEBP}`;
}
export function cdnRegionalFile(files) {
  const region = getCdnRegion();
  return `${CDN_BASE_MAP[region]}/${files[region]}`;
}
export const CDN_SKILL_SHOWCASE_FALLBACK = `${CDN_BASE_MAP.domestic}/232f1aee-b73a-4982-8930-a628ab6aad59.png`;
const PROMOTION_SEEDANCE_FILES = {
  domestic: "71a33405-9268-4db7-adf2-c77d6f05571d.png",
  overseas: "e75d691e-dc2b-4436-ae1e-0fbe65fdaa73.png",
};
export const CDN_PROMOTION_SEEDANCE = cdnRegionalImage(PROMOTION_SEEDANCE_FILES);
export const COACHMARK_BASE_MAP = {
  domestic: "https://cdn.hailuoai.com/public_assets",
  overseas: "https://cdn.hailuoai.video/public_assets",
};
export function coachMarkImage(baseName) {
  const region = getCdnRegion();
  const suffix = region === "overseas" ? "global" : "cn";
  return `${COACHMARK_BASE_MAP[region]}/coachmark-${baseName}-${suffix}.png${OSS_WEBP}`;
}
export const CDN_COACHMARK_HOME_AT = coachMarkImage("home-at");
export const CDN_COACHMARK_HOME_SLASH = coachMarkImage("home-slash");
export const CDN_TEMPLATE_PROJECT_3D_DIRECTOR = cdnRegionalFile({
  domestic: "23d22e0b-5e1f-4ab7-82e8-8d53be2966f6.zip",
  overseas: "3fc6da43-afc7-42f7-8cbf-a1fb01214e55.zip",
});
export const CDN_TEMPLATE_PROJECT_MULTI_SHOT = cdnRegionalFile({
  domestic: "4ece4270-8b18-49d2-8baa-ebb6e838836d.zip",
  overseas: "1c419bd9-800f-477d-9b7c-aa198d91c799.zip",
});
export const CDN_TEMPLATE_PROJECT_N_STORYBOARD = cdnRegionalFile({
  domestic: "edcbe984-30e4-4293-9ee9-a859c4650498.zip",
  overseas: "27ec9ccf-3185-47ae-b190-b2b24ca4a9a1.zip",
});
export const CDN_TEMPLATE_PROJECT_PANORAMA_VIEWER = cdnRegionalFile({
  domestic: "1833c3a5-045a-4802-a72c-4b8cbc38e89f.zip",
  overseas: "1889486e-32ae-4ba1-9128-2b4a00927d14.zip",
});
export const CDN_TEMPLATE_PROJECT_RELIGHT = cdnRegionalFile({
  domestic: "46769f81-b9bb-4fb7-8688-3792b510a578.zip",
  overseas: "9cb2a2c1-e20a-455b-a455-684e56f25472.zip",
});
export const CDN_TEMPLATE_PROJECT_WATERMARK_TOOL = cdnRegionalFile({
  domestic: "52e8059e-f99c-4e5d-9e2e-e508d366d3e4.zip",
  overseas: "cfd4abcc-a484-4933-baed-2b75ae7899e1.zip",
});
export const CDN_CONNECTOR_CUSTOM = cdnRegionalImage({
  domestic: "connector-custom-512-2df5a8a59c73.png",
  overseas: "connector-custom-512-2df5a8a59c73.png",
});
const WINK_DURATION_MS = 560;
const BLINK_DURATION_MS = 240;
const BLINK_DELAY_MIN_MS = 2600;
const BLINK_DELAY_RANGE_MS = 1300;
const BLINK_COUNT = 2;
const MOTION_ATTRIBUTE = "data-hub-logo-motion";
function prefersReducedMotion$1() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
function setMotion(elements, motion) {
  for (const element2 of elements) {
    if (!element2) continue;
    element2.removeAttribute(MOTION_ATTRIBUTE);
    void element2.getBoundingClientRect();
    element2.setAttribute(MOTION_ATTRIBUTE, motion);
  }
}
function clearMotion(elements) {
  for (const element2 of elements) {
    element2?.removeAttribute(MOTION_ATTRIBUTE);
  }
}
export function useHubLogoHoverAnimation({ enabled, leftEyeRef, rightEyeRef }) {
  const activeRef = reactExports.useRef(false);
  const timersRef = reactExports.useRef(new Set());
  const schedule2 = reactExports.useCallback((callback, delayMs) => {
    const timerId = window.setTimeout(() => {
      timersRef.current.delete(timerId);
      callback();
    }, delayMs);
    timersRef.current.add(timerId);
  }, []);
  const reset2 = reactExports.useCallback(() => {
    for (const timerId of timersRef.current) {
      window.clearTimeout(timerId);
    }
    timersRef.current.clear();
    activeRef.current = false;
    clearMotion([leftEyeRef.current, rightEyeRef.current]);
  }, [leftEyeRef, rightEyeRef]);
  reactExports.useEffect(() => {
    if (!enabled) {
      reset2();
      return reset2;
    }
    const motionQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const handleMotionPreferenceChange = (event) => {
      if (event.matches) reset2();
    };
    if (motionQuery?.matches) reset2();
    motionQuery?.addEventListener("change", handleMotionPreferenceChange);
    return () => {
      motionQuery?.removeEventListener("change", handleMotionPreferenceChange);
      reset2();
    };
  }, [enabled, reset2]);
  return reactExports.useCallback(() => {
    if (!enabled || activeRef.current || prefersReducedMotion$1()) return;
    activeRef.current = true;
    setMotion([leftEyeRef.current], "wink");
    schedule2(() => clearMotion([leftEyeRef.current]), WINK_DURATION_MS);
    let blinkCount = 0;
    const scheduleBlink = () => {
      const delayMs = BLINK_DELAY_MIN_MS + Math.random() * BLINK_DELAY_RANGE_MS;
      schedule2(() => {
        const eyes = [leftEyeRef.current, rightEyeRef.current];
        setMotion(eyes, "blink");
        schedule2(() => clearMotion(eyes), BLINK_DURATION_MS);
        blinkCount += 1;
        if (blinkCount < BLINK_COUNT) {
          scheduleBlink();
          return;
        }
        schedule2(() => {
          activeRef.current = false;
        }, BLINK_DURATION_MS);
      }, delayMs);
    };
    scheduleBlink();
  }, [enabled, leftEyeRef, rightEyeRef, schedule2]);
}
const EYE_ROTATION = (28.8202 * Math.PI) / 180;
const EYE_COS = Math.cos(EYE_ROTATION);
const EYE_SIN = Math.sin(EYE_ROTATION);
const EYE_TRAVEL_SCALE = 1.3;
const EYE_TRAVEL_A = (5.58216 - 4.25085) * EYE_TRAVEL_SCALE;
const EYE_TRAVEL_B = (7.06529 - 5.6272) * EYE_TRAVEL_SCALE;
const EYE_RIM_REACH = 0.88;
const EYE_FALLOFF = 26;
export const ACTIVE_EASING = 0.1;
export const IDLE_EASING = 0.08;
export const EYES = [
  {
    centerX: 10.789,
    centerY: 32.0297,
    restX: 10.7172 - 10.789,
    restY: 32.088 - 32.0297,
  },
  {
    centerX: 37.4316,
    centerY: 46.6895,
    restX: 37.3652 - 37.4316,
    restY: 46.7917 - 46.6895,
  },
];
export function mix(currentValue, targetValue, factor) {
  return currentValue + (targetValue - currentValue) * factor;
}
export function pupilTargetFor(eye, svgX, svgY) {
  const dx = svgX - eye.centerX;
  const dy = svgY - eye.centerY;
  const dist2 = Math.hypot(dx, dy);
  if (dist2 < 1e-3)
    return {
      x: -eye.restX,
      y: -eye.restY,
    };
  const localX = (dx * EYE_COS + dy * EYE_SIN) / dist2;
  const localY = (dy * EYE_COS - dx * EYE_SIN) / dist2;
  const rim = 1 / Math.sqrt((localX / EYE_TRAVEL_A) ** 2 + (localY / EYE_TRAVEL_B) ** 2);
  const reach = (dist2 / (dist2 + EYE_FALLOFF)) * EYE_RIM_REACH * rim;
  const travelX = localX * reach;
  const travelY = localY * reach;
  return {
    x: travelX * EYE_COS - travelY * EYE_SIN - eye.restX,
    y: travelX * EYE_SIN + travelY * EYE_COS - eye.restY,
  };
}
const activeIds = new Set();
const listeners$5 = new Set();
function emit$3() {
  for (const listener of listeners$5) listener();
}
function acquireModalPresence(id2) {
  activeIds.add(id2);
  emit$3();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeIds.delete(id2);
    emit$3();
  };
}
export function subscribeModalPresence(listener) {
  listeners$5.add(listener);
  return () => {
    listeners$5.delete(listener);
  };
}
export function getModalPresenceSnapshot() {
  return activeIds.size;
}
export function useBlockingModalPresence(id2, active2) {
  reactExports.useEffect(() => {
    if (!active2) return;
    return acquireModalPresence(id2);
  }, [id2, active2]);
}
