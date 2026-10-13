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
  const { state, userTriggered } = input;
  const dismissed = input.dismissed ?? state.dismissed;
  const currentTime = input.now ?? Date.now();
  const dismissedAt = state.dismissedAt ?? 0;
  const dismissExpired =
    dismissed &&
    dismissedAt > 0 &&
    currentTime - dismissedAt > UPDATE_DISMISS_REMINDER_MS;
  if (state.forced)
    return {
      type: "forced-modal",
    };
  if (
    state.startupOwnershipUnverified &&
    !state.targetVersion &&
    !userTriggered
  ) {
    return {
      type: "silent",
    };
  }
  if (state.manualOnly && state.phase === "error") {
    return dismissed
      ? {
          type: "sidebar-only",
        }
      : {
          type: "banner",
        };
  }
  if (state.phase === "idle" || state.phase === "checking")
    return {
      type: "silent",
    };
  if (state.phase === "downloaded") {
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
  if (state.phase === "downloading") {
    return dismissed
      ? {
          type: "sidebar-only",
        }
      : {
          type: "banner",
        };
  }
  if (state.phase === "available") {
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
  if (state.phase === "error") {
    if (
      state.targetVersion &&
      compareSemver(state.targetVersion, state.currentVersion) > 0
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
function createUpdaterDevPreviewState(mode) {
  const phase =
    mode === "downloading"
      ? "downloading"
      : mode === "downloaded"
        ? "downloaded"
        : mode === "error"
          ? "error"
          : "available";
  const progress =
    mode === "downloading"
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
    forced: mode === "forced",
    policyStatus: "ready",
    forceSource: mode === "forced" ? "cdn" : "none",
    manualDownloadUrl:
      mode === "forced" ? "https://example.com/download" : null,
    manualOnly: false,
    manualRecoveryReason: null,
    manualRecoverySource: null,
    manualRecoveryCode: null,
    policyCheckedAt: Date.now(),
    currentVersion: "0.1.20",
    targetVersion: "0.2.0",
    subtitle:
      mode === "forced"
        ? "关键兼容性更新，需要升级后继续使用。"
        : "修复稳定性问题并优化启动体验。",
    requiredReason: mode === "forced" ? "关键服务协议升级" : null,
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
      mode === "error"
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
function hasResolvedUpdateFlow(state) {
  return (
    state.phase === "available" ||
    state.phase === "downloading" ||
    state.phase === "downloaded"
  );
}
function hasActiveUpdateFlow(state) {
  return state.phase === "checking" || hasResolvedUpdateFlow(state);
}
function waitForUpdateCheckResult(service) {
  let timeout;
  let disposable;
  const promise = new Promise((resolve) => {
    const settle = (state) => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = void 0;
      }
      disposable?.dispose();
      disposable = void 0;
      resolve(state);
    };
    timeout = setTimeout(() => settle(null), UPDATE_CHECK_RESULT_TIMEOUT_MS);
    timeout.unref?.();
    disposable = service.onStateChanged((event) => {
      if (event.state.phase === "checking") return;
      settle(event.state);
    });
  });
  return {
    promise,
    dispose: () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = void 0;
      }
      disposable?.dispose();
      disposable = void 0;
    },
  };
}
async function runManualUpdateCheck(service) {
  try {
    const { state } = await service.getState();
    if (hasResolvedUpdateFlow(state)) {
      return {
        accepted: true,
        state,
      };
    }
  } catch {}
  const pendingState = waitForUpdateCheckResult(service);
  const checkOutcome = service
    .check({
      userTriggered: true,
    })
    .then(
      (result) => ({
        type: "check",
        result,
      }),
      (error) => ({
        type: "check-error",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  const stateOutcome = pendingState.promise.then((state) => ({
    type: "state",
    state,
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
      const { state } = await service.getState();
      if (hasActiveUpdateFlow(state)) {
        return {
          accepted: true,
          state,
        };
      }
    } catch {}
    return {
      accepted: false,
      error: result.error,
    };
  }
  try {
    let { state } = await service.getState();
    if (state.phase === "checking") {
      const resolved = await pendingState.promise;
      if (resolved) {
        state = resolved;
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
      state,
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
function showManualUpdateCheckFeedback(result, t) {
  if (!result.accepted) {
    if (isUpdateCheckAlreadyInProgress(result.error)) {
      dedupedToast.info(
        formatUpdaterErrorMessage(result.error, t, t("update.error")),
        {
          id: MANUAL_UPDATE_CHECK_TOAST_ID,
        },
      );
      return;
    }
    dedupedToast.error(
      formatUpdaterErrorMessage(result.error, t, t("update.error")),
      {
        id: MANUAL_UPDATE_CHECK_TOAST_ID,
      },
    );
    return;
  }
  const { state } = result;
  if (state.phase === "error") {
    const message = formatUpdaterErrorMessage(
      state.error?.message,
      t,
      t("update.error"),
    );
    if (isUpdateCheckAlreadyInProgress(state.error?.message)) {
      dedupedToast.info(message, {
        id: MANUAL_UPDATE_CHECK_TOAST_ID,
      });
      return;
    }
    dedupedToast.error(message, {
      id: MANUAL_UPDATE_CHECK_TOAST_ID,
    });
    return;
  }
  if (state.phase === "checking") {
    dedupedToast.info(t("update.checking"), {
      id: MANUAL_UPDATE_CHECK_TOAST_ID,
    });
    return;
  }
  if (state.phase === "available") {
    dedupedToast.info(t("update.title.available"), {
      id: MANUAL_UPDATE_CHECK_TOAST_ID,
    });
    return;
  }
  if (state.phase === "downloading") {
    dedupedToast.info(t("update.title.downloading"), {
      id: MANUAL_UPDATE_CHECK_TOAST_ID,
    });
    return;
  }
  if (state.phase === "downloaded") {
    dedupedToast.info(t("update.title.downloaded"), {
      id: MANUAL_UPDATE_CHECK_TOAST_ID,
    });
    return;
  }
  if (state.phase === "idle" && !state.targetVersion) {
    dedupedToast.success(t("update.notAvailable"), {
      id: MANUAL_UPDATE_CHECK_TOAST_ID,
    });
  }
}
export const UpdaterProvider = ({ children }) => {
  const { t } = useTranslation();
  const devPreviewMode = useUpdaterDevPreviewMode();
  const [state, setState] = reactExports.useState(() =>
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
  const stateRef = reactExports.useRef(state);
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
    const dismissedAt = state.dismissedAt ?? 0;
    const supportsReminder =
      state.phase === "available" || state.phase === "downloaded";
    if (!state.dismissed || dismissedAt <= 0 || !supportsReminder)
      return void 0;
    const remainingMs = dismissedAt + UPDATE_DISMISS_REMINDER_MS - Date.now();
    if (remainingMs <= 0) return void 0;
    const timer = window.setTimeout(() => {
      setNotificationNow(Date.now());
    }, remainingMs + 1);
    return () => window.clearTimeout(timer);
  }, [state.dismissed, state.dismissedAt, state.phase]);
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
      svc.getVersion().then((version) => {
        if (disposed) return;
        setState((prev) => {
          const next = {
            ...prev,
            currentVersion: version,
          };
          stateRef.current = next;
          return next;
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
      const service = serviceRef.current;
      if (!service) return;
      if (opts?.userTriggered) {
        void runManualUpdateCheck(service).then((result) =>
          showManualUpdateCheckFeedback(result, t),
        );
        return;
      }
      service.check(opts);
    },
    [t, devPreviewMode],
  );
  const download = reactExports.useCallback(() => {
    if (devPreviewMode) {
      setState((prev) => {
        const next = {
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
        stateRef.current = next;
        return next;
      });
      return;
    }
    serviceRef.current?.download();
  }, [devPreviewMode]);
  reactExports.useEffect(() => {
    if (
      !devPreviewMode ||
      devPreviewMode === "downloading" ||
      state.phase !== "downloading"
    ) {
      return void 0;
    }
    let percent = 0;
    const timer = setInterval(() => {
      percent += 20;
      setState((prev) => {
        if (percent >= 100) {
          const next = {
            ...prev,
            phase: "downloaded",
            progress: null,
            userTriggeredDownload: false,
          };
          stateRef.current = next;
          return next;
        }
        const total = 100 * 1024 * 1024;
        const next = {
          ...prev,
          progress: {
            percent,
            bytesPerSecond: 2.4 * 1024 * 1024,
            transferred: Math.round((total * percent) / 100),
            total,
            delta: 20 * 1024 * 1024,
          },
        };
        stateRef.current = next;
        return next;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [devPreviewMode, state.phase]);
  const cancelDownload = reactExports.useCallback(() => {
    if (devPreviewMode) {
      setState((prev) => {
        const next = {
          ...prev,
          phase: "available",
          progress: null,
        };
        stateRef.current = next;
        return next;
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
        const next = {
          ...prev,
          dismissed: true,
          dismissedVersion: prev.targetVersion,
          dismissedAt: Date.now(),
        };
        stateRef.current = next;
        return next;
      });
      return;
    }
    serviceRef.current?.dismiss();
  }, [devPreviewMode]);
  const notification = reactExports.useMemo(
    () =>
      resolveNotification({
        state,
        userTriggered: trigger === "user",
        now: Math.max(notificationNow, Date.now()),
        // dismissed is now read from state SSOT (main process)
      }),
    [state, trigger, notificationNow],
  );
  const value = reactExports.useMemo(
    () => ({
      state,
      trigger,
      notification,
      dismissed: state.dismissed,
      capabilities,
      check,
      download,
      cancelDownload,
      install,
      retryInstall,
      dismiss: dismissAction,
    }),
    [
      state,
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
    <UpdaterContext.Provider value={value}>{children}</UpdaterContext.Provider>
  );
};
({
  en: BUNDLED_CHANGELOG.en,
  zh: BUNDLED_CHANGELOG.zh,
});
