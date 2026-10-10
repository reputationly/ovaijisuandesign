// updater-provider.jsx
import { compareSemver, getRuntimeConfig, reactExports, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import {
  canUseUpdaterDevPreview,
  setUpdaterDevPreviewMode,
  STORAGE_KEY,
  UPDATER_DEV_PREVIEW_EVENT,
} from "../generation/use-model-catalog-scope-key.js";
import {
  UPDATE_CHECK_TIMED_OUT,
  UpdaterContext,
} from "./use-active-runtime.js";
import {
  formatUpdaterErrorMessage,
  isUpdateCheckAlreadyInProgress,
} from "./installer-failure-code-keys.js";
import { actionTrailLog } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  instantiationService,
  IUpdaterMainService,
} from "../workspace/home-service.jsx";
import { BUNDLED_CHANGELOG } from "./bundled-changelog.js";
const UPDATE_DISMISS_REMINDER_MS = 2 * 60 * 60 * 1e3;
function resolveNotification(input) {
  const { state: state2, userTriggered } = input;
  const dismissed = input.dismissed ?? state2.dismissed;
  const currentTime = input.now ?? Date.now();
  const dismissedAt = state2.dismissedAt ?? 0;
  const dismissExpired =
    dismissed &&
    dismissedAt > 0 &&
    currentTime - dismissedAt > UPDATE_DISMISS_REMINDER_MS;
  if (state2.forced)
    return {
      type: "forced-modal",
    };
  if (
    state2.startupOwnershipUnverified &&
    !state2.targetVersion &&
    !userTriggered
  ) {
    return {
      type: "silent",
    };
  }
  if (state2.manualOnly && state2.phase === "error") {
    return dismissed
      ? {
          type: "sidebar-only",
        }
      : {
          type: "banner",
        };
  }
  if (state2.phase === "idle" || state2.phase === "checking")
    return {
      type: "silent",
    };
  if (state2.phase === "downloaded") {
    if (dismissExpired)
      return {
        type: "banner",
      };
    return dismissed
      ? {
          type: "sidebar-only",
        }
      : {
          type: "banner",
        };
  }
  if (state2.phase === "downloading") {
    return dismissed
      ? {
          type: "sidebar-only",
        }
      : {
          type: "banner",
        };
  }
  if (state2.phase === "available") {
    if (dismissExpired)
      return {
        type: "banner",
      };
    if (dismissed)
      return {
        type: "sidebar-only",
      };
    return {
      type: "banner",
    };
  }
  if (state2.phase === "error") {
    if (
      state2.targetVersion &&
      compareSemver(state2.targetVersion, state2.currentVersion) > 0
    ) {
      return dismissed
        ? {
            type: "sidebar-only",
          }
        : {
            type: "banner",
          };
    }
    return userTriggered
      ? {
          type: "banner",
        }
      : {
          type: "sidebar-only",
        };
  }
  return {
    type: "silent",
  };
}
function getUpdaterDevPreviewMode() {
  if (!canUseUpdaterDevPreview()) return null;
  const value = globalThis.sessionStorage?.getItem(STORAGE_KEY);
  return value === "forced" ||
    value === "normal" ||
    value === "downloading" ||
    value === "downloaded" ||
    value === "error"
    ? value
    : null;
}
function subscribeUpdaterDevPreview(listener) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(UPDATER_DEV_PREVIEW_EVENT, listener);
  return () => window.removeEventListener(UPDATER_DEV_PREVIEW_EVENT, listener);
}
function useUpdaterDevPreviewMode() {
  return reactExports.useSyncExternalStore(
    subscribeUpdaterDevPreview,
    getUpdaterDevPreviewMode,
    () => null,
  );
}
function createUpdaterDevPreviewState(mode2) {
  const phase =
    mode2 === "downloading"
      ? "downloading"
      : mode2 === "downloaded"
        ? "downloaded"
        : mode2 === "error"
          ? "error"
          : "available";
  const progress =
    mode2 === "downloading"
      ? {
          percent: 55,
          bytesPerSecond: 1.7 * 1024 * 1024,
          transferred: 55 * 1024 * 1024,
          total: 100 * 1024 * 1024,
          delta: 1.7 * 1024 * 1024,
        }
      : null;
  return {
    phase,
    forced: mode2 === "forced",
    policyStatus: "ready",
    forceSource: mode2 === "forced" ? "cdn" : "none",
    manualDownloadUrl:
      mode2 === "forced" ? "https://example.com/download" : null,
    manualOnly: false,
    manualRecoveryReason: null,
    manualRecoverySource: null,
    manualRecoveryCode: null,
    policyCheckedAt: Date.now(),
    currentVersion: "0.1.20",
    targetVersion: "0.2.0",
    subtitle:
      mode2 === "forced"
        ? "关键兼容性更新，需要升级后继续使用。"
        : "修复稳定性问题并优化启动体验。",
    requiredReason: mode2 === "forced" ? "关键服务协议升级" : null,
    changelog: {
      version: "0.2.0",
      date: "2026-05-21",
      subtitle: "本地预览更新",
      changelog: [
        "优化更新提示体验",
        "修复若干稳定性问题",
        "提升桌面端启动速度",
      ],
    },
    progress,
    error:
      mode2 === "error"
        ? {
            code: "DOWNLOAD_FAILED",
            message: "模拟下载失败，请重试。",
            retryCount: 1,
            canRetry: true,
          }
        : null,
    lastCheckAt: Date.now(),
    userTriggeredDownload: false,
    activeCheckUserTriggered: false,
    availableSince: Date.now() - 1e3 * 60 * 60 * 24,
    dismissed: false,
    dismissedVersion: null,
    dismissedAt: 0,
  };
}
const UPDATE_CHECK_RESULT_TIMEOUT_MS = 3e4;
function hasResolvedUpdateFlow(state2) {
  return (
    state2.phase === "available" ||
    state2.phase === "downloading" ||
    state2.phase === "downloaded"
  );
}
function hasActiveUpdateFlow(state2) {
  return state2.phase === "checking" || hasResolvedUpdateFlow(state2);
}
function waitForUpdateCheckResult(service2) {
  let timeout2;
  let disposable;
  const promise = new Promise((resolve) => {
    const settle2 = (state2) => {
      if (timeout2) {
        clearTimeout(timeout2);
        timeout2 = void 0;
      }
      disposable?.dispose();
      disposable = void 0;
      resolve(state2);
    };
    timeout2 = setTimeout(() => settle2(null), UPDATE_CHECK_RESULT_TIMEOUT_MS);
    timeout2.unref?.();
    disposable = service2.onStateChanged((event) => {
      if (event.state.phase === "checking") return;
      settle2(event.state);
    });
  });
  return {
    promise,
    dispose: () => {
      if (timeout2) {
        clearTimeout(timeout2);
        timeout2 = void 0;
      }
      disposable?.dispose();
      disposable = void 0;
    },
  };
}
async function runManualUpdateCheck(service2) {
  try {
    const { state: state2 } = await service2.getState();
    if (hasResolvedUpdateFlow(state2)) {
      return {
        accepted: true,
        state: state2,
      };
    }
  } catch {}
  const pendingState = waitForUpdateCheckResult(service2);
  const checkOutcome = service2
    .check({
      userTriggered: true,
    })
    .then(
      (result2) => ({
        type: "check",
        result: result2,
      }),
      (error) => ({
        type: "check-error",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  const stateOutcome = pendingState.promise.then((state2) => ({
    type: "state",
    state: state2,
  }));
  const firstOutcome = await Promise.race([checkOutcome, stateOutcome]);
  if (firstOutcome.type === "state") {
    if (!firstOutcome.state) {
      return {
        accepted: false,
        error: UPDATE_CHECK_TIMED_OUT,
      };
    }
    return {
      accepted: true,
      state: firstOutcome.state,
    };
  }
  if (firstOutcome.type === "check-error") {
    pendingState.dispose();
    return {
      accepted: false,
      error: firstOutcome.error,
    };
  }
  const { result } = firstOutcome;
  if (!result.accepted) {
    pendingState.dispose();
    try {
      const { state: state2 } = await service2.getState();
      if (hasActiveUpdateFlow(state2)) {
        return {
          accepted: true,
          state: state2,
        };
      }
    } catch {}
    return {
      accepted: false,
      error: result.error,
    };
  }
  try {
    let { state: state2 } = await service2.getState();
    if (state2.phase === "checking") {
      const resolved = await pendingState.promise;
      if (resolved) {
        state2 = resolved;
      } else {
        return {
          accepted: false,
          error: UPDATE_CHECK_TIMED_OUT,
        };
      }
    } else {
      pendingState.dispose();
    }
    return {
      accepted: true,
      state: state2,
    };
  } catch (error) {
    pendingState.dispose();
    return {
      accepted: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
function createInitialState() {
  const bootstrap = window.__HILO_UPDATER_BOOTSTRAP__;
  if (bootstrap && typeof bootstrap === "object" && "phase" in bootstrap) {
    return bootstrap;
  }
  return {
    phase: "idle",
    forced: false,
    policyStatus: "checking",
    forceSource: "none",
    manualDownloadUrl: null,
    manualOnly: false,
    manualRecoveryReason: null,
    manualRecoverySource: null,
    manualRecoveryCode: null,
    policyCheckedAt: 0,
    // Best-effort version from runtime config; getVersion() IPC will override.
    currentVersion: getRuntimeConfig().appVersion,
    targetVersion: null,
    subtitle: null,
    requiredReason: null,
    changelog: null,
    progress: null,
    error: null,
    lastCheckAt: 0,
    userTriggeredDownload: false,
    activeCheckUserTriggered: false,
    availableSince: 0,
    dismissed: false,
    dismissedVersion: null,
    dismissedAt: 0,
  };
}
const MANUAL_UPDATE_CHECK_TOAST_ID = "manual-update-check";
function showManualUpdateCheckFeedback(result, t2) {
  if (!result.accepted) {
    if (isUpdateCheckAlreadyInProgress(result.error)) {
      dedupedToast.info(
        formatUpdaterErrorMessage(result.error, t2, t2("update.error")),
        {
          id: MANUAL_UPDATE_CHECK_TOAST_ID,
        },
      );
      return;
    }
    dedupedToast.error(
      formatUpdaterErrorMessage(result.error, t2, t2("update.error")),
      {
        id: MANUAL_UPDATE_CHECK_TOAST_ID,
      },
    );
    return;
  }
  const { state: state2 } = result;
  if (state2.phase === "error") {
    const message2 = formatUpdaterErrorMessage(
      state2.error?.message,
      t2,
      t2("update.error"),
    );
    if (isUpdateCheckAlreadyInProgress(state2.error?.message)) {
      dedupedToast.info(message2, {
        id: MANUAL_UPDATE_CHECK_TOAST_ID,
      });
      return;
    }
    dedupedToast.error(message2, {
      id: MANUAL_UPDATE_CHECK_TOAST_ID,
    });
    return;
  }
  if (state2.phase === "checking") {
    dedupedToast.info(t2("update.checking"), {
      id: MANUAL_UPDATE_CHECK_TOAST_ID,
    });
    return;
  }
  if (state2.phase === "available") {
    dedupedToast.info(t2("update.title.available"), {
      id: MANUAL_UPDATE_CHECK_TOAST_ID,
    });
    return;
  }
  if (state2.phase === "downloading") {
    dedupedToast.info(t2("update.title.downloading"), {
      id: MANUAL_UPDATE_CHECK_TOAST_ID,
    });
    return;
  }
  if (state2.phase === "downloaded") {
    dedupedToast.info(t2("update.title.downloaded"), {
      id: MANUAL_UPDATE_CHECK_TOAST_ID,
    });
    return;
  }
  if (state2.phase === "idle" && !state2.targetVersion) {
    dedupedToast.success(t2("update.notAvailable"), {
      id: MANUAL_UPDATE_CHECK_TOAST_ID,
    });
  }
}
export const UpdaterProvider = ({ children: children2 }) => {
  const { t: t2 } = useTranslation();
  const devPreviewMode = useUpdaterDevPreviewMode();
  const [state2, setState] = reactExports.useState(() =>
    devPreviewMode
      ? createUpdaterDevPreviewState(devPreviewMode)
      : createInitialState(),
  );
  const [trigger, setTrigger] = reactExports.useState("auto");
  const [notificationNow, setNotificationNow] = reactExports.useState(() =>
    Date.now(),
  );
  const [capabilities, setCapabilities] = reactExports.useState({
    downloadCancellation: devPreviewMode !== null,
  });
  const serviceRef = reactExports.useRef(null);
  const stateRef = reactExports.useRef(state2);
  const wasDevPreviewRef = reactExports.useRef(devPreviewMode !== null);
  reactExports.useEffect(() => {
    if (devPreviewMode) {
      wasDevPreviewRef.current = true;
      setCapabilities({
        downloadCancellation: true,
      });
      setTrigger("user");
      const previewState = createUpdaterDevPreviewState(devPreviewMode);
      stateRef.current = previewState;
      setState(previewState);
      return;
    }
    if (!wasDevPreviewRef.current) return;
    wasDevPreviewRef.current = false;
    setCapabilities({
      downloadCancellation: false,
    });
    setTrigger("auto");
    const initial = createInitialState();
    stateRef.current = initial;
    setState(initial);
  }, [devPreviewMode]);
  reactExports.useEffect(() => {
    const dismissedAt = state2.dismissedAt ?? 0;
    const supportsReminder =
      state2.phase === "available" || state2.phase === "downloaded";
    if (!state2.dismissed || dismissedAt <= 0 || !supportsReminder)
      return void 0;
    const remainingMs = dismissedAt + UPDATE_DISMISS_REMINDER_MS - Date.now();
    if (remainingMs <= 0) return void 0;
    const timer2 = window.setTimeout(() => {
      setNotificationNow(Date.now());
    }, remainingMs + 1);
    return () => window.clearTimeout(timer2);
  }, [state2.dismissed, state2.dismissedAt, state2.phase]);
  reactExports.useEffect(() => {
    if (devPreviewMode) return void 0;
    try {
      let disposed = false;
      const svc = instantiationService.invokeFunction((accessor) =>
        accessor.get(IUpdaterMainService),
      );
      serviceRef.current = svc;
      svc.getState().then((event) => {
        if (disposed) return;
        stateRef.current = event.state;
        setState(event.state);
        setTrigger(event.trigger);
      });
      svc.getVersion().then((version2) => {
        if (disposed) return;
        setState((prev) => {
          const next2 = {
            ...prev,
            currentVersion: version2,
          };
          stateRef.current = next2;
          return next2;
        });
      });
      svc.getCapabilities().then((nextCapabilities) => {
        if (!disposed) setCapabilities(nextCapabilities);
      });
      const disposable = svc.onStateChanged((event) => {
        if (disposed) return;
        stateRef.current = event.state;
        setState(event.state);
        setTrigger(event.trigger);
      });
      return () => {
        disposed = true;
        disposable.dispose();
      };
    } catch {
      return void 0;
    }
  }, [devPreviewMode]);
  const check = reactExports.useCallback(
    (opts) => {
      if (devPreviewMode) {
        setTrigger(opts?.userTriggered ? "user" : "auto");
        const previewState = createUpdaterDevPreviewState(devPreviewMode);
        stateRef.current = previewState;
        setState(previewState);
        return;
      }
      const service2 = serviceRef.current;
      if (!service2) return;
      if (opts?.userTriggered) {
        void runManualUpdateCheck(service2).then((result) =>
          showManualUpdateCheckFeedback(result, t2),
        );
        return;
      }
      service2.check(opts);
    },
    [t2, devPreviewMode],
  );
  const download = reactExports.useCallback(() => {
    if (devPreviewMode) {
      setState((prev) => {
        const next2 = {
          ...prev,
          phase: "downloading",
          progress: {
            percent: 0,
            bytesPerSecond: 1024 * 1024,
            transferred: 0,
            total: 100 * 1024 * 1024,
            delta: 0,
          },
          userTriggeredDownload: true,
          // A user explicitly reopens a dismissed update from the sidebar
          // shortcut. Mirror the main-process reducer so the progress card is
          // promoted back to the banner lane while the download is active.
          dismissed: false,
          dismissedVersion: null,
          dismissedAt: 0,
        };
        stateRef.current = next2;
        return next2;
      });
      return;
    }
    serviceRef.current?.download();
  }, [devPreviewMode]);
  reactExports.useEffect(() => {
    if (
      !devPreviewMode ||
      devPreviewMode === "downloading" ||
      state2.phase !== "downloading"
    ) {
      return void 0;
    }
    let percent2 = 0;
    const timer2 = setInterval(() => {
      percent2 += 20;
      setState((prev) => {
        if (percent2 >= 100) {
          const next22 = {
            ...prev,
            phase: "downloaded",
            progress: null,
            userTriggeredDownload: false,
          };
          stateRef.current = next22;
          return next22;
        }
        const total = 100 * 1024 * 1024;
        const next2 = {
          ...prev,
          progress: {
            percent: percent2,
            bytesPerSecond: 2.4 * 1024 * 1024,
            transferred: Math.round((total * percent2) / 100),
            total,
            delta: 20 * 1024 * 1024,
          },
        };
        stateRef.current = next2;
        return next2;
      });
    }, 500);
    return () => clearInterval(timer2);
  }, [devPreviewMode, state2.phase]);
  const cancelDownload = reactExports.useCallback(() => {
    if (devPreviewMode) {
      setState((prev) => {
        const next2 = {
          ...prev,
          phase: "available",
          progress: null,
        };
        stateRef.current = next2;
        return next2;
      });
      return;
    }
    serviceRef.current?.cancelDownload();
  }, [devPreviewMode]);
  const install = reactExports.useCallback(
    async (options) => {
      if (devPreviewMode) {
        setUpdaterDevPreviewMode("off");
        return false;
      }
      try {
        return (await serviceRef.current?.install(options)) ?? false;
      } catch (error) {
        actionTrailLog.error("update install request failed", {
          error: String(error),
        });
        return false;
      }
    },
    [devPreviewMode],
  );
  const retryInstall = reactExports.useCallback(async () => {
    if (devPreviewMode) {
      setUpdaterDevPreviewMode("normal");
      return;
    }
    await serviceRef.current?.retryInstall();
  }, [devPreviewMode]);
  const dismissAction = reactExports.useCallback(() => {
    if (devPreviewMode) {
      setState((prev) => {
        const next2 = {
          ...prev,
          dismissed: true,
          dismissedVersion: prev.targetVersion,
          dismissedAt: Date.now(),
        };
        stateRef.current = next2;
        return next2;
      });
      return;
    }
    serviceRef.current?.dismiss();
  }, [devPreviewMode]);
  const notification = reactExports.useMemo(
    () =>
      resolveNotification({
        state: state2,
        userTriggered: trigger === "user",
        now: Math.max(notificationNow, Date.now()),
        // dismissed is now read from state SSOT (main process)
      }),
    [state2, trigger, notificationNow],
  );
  const value = reactExports.useMemo(
    () => ({
      state: state2,
      trigger,
      notification,
      dismissed: state2.dismissed,
      capabilities,
      check,
      download,
      cancelDownload,
      install,
      retryInstall,
      dismiss: dismissAction,
    }),
    [
      state2,
      trigger,
      notification,
      capabilities,
      check,
      download,
      cancelDownload,
      install,
      retryInstall,
      dismissAction,
    ],
  );
  return (
    <UpdaterContext.Provider value={value}>{children2}</UpdaterContext.Provider>
  );
};
({
  en: BUNDLED_CHANGELOG.en,
  zh: BUNDLED_CHANGELOG.zh,
});
