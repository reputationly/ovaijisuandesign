// updater-provider.jsx
import {
  useTranslation,
  reactExports,
  dedupedToast,
  UPDATE_CHECK_TIMED_OUT,
  useUpdaterDevPreviewMode,
  createUpdaterDevPreviewState,
  createInitialState,
  UPDATE_DISMISS_REMINDER_MS,
  runManualUpdateCheck,
  setUpdaterDevPreviewMode,
  actionTrailLog,
  resolveNotification,
  UpdaterContext,
  BUNDLED_CHANGELOG,
  parseSemver,
} from "../vendor.js";
import { instantiationService, IUpdaterMainService } from "../m08/browser-inspiration-urls.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
const UPDATE_CHECK_ALREADY_IN_PROGRESS = "Update check already in progress";
const VELOPACK_PACKAGE_MUTATION_UNOWNED = "VELOPACK_PACKAGE_MUTATION_UNOWNED:";
const DRIVE_TYPE_PROBE_UNAVAILABLE = "Install root drive type probe is unavailable.";
function isUpdateCheckAlreadyInProgress(message2) {
  return message2 === UPDATE_CHECK_ALREADY_IN_PROGRESS;
}
function isUpdateCheckTimedOut(message2) {
  return message2 === UPDATE_CHECK_TIMED_OUT;
}
export function formatUpdaterErrorMessage(message2, t2, fallback) {
  if (isUpdateCheckAlreadyInProgress(message2)) {
    return t2("update.checkInProgress");
  }
  if (isUpdateCheckTimedOut(message2)) {
    return t2("update.timeout");
  }
  if (message2 === "ERR_TIMED_OUT: Update preparation timed out") {
    return t2("update.preparationTimeout");
  }
  if (message2?.includes(VELOPACK_PACKAGE_MUTATION_UNOWNED)) {
    return message2.includes(DRIVE_TYPE_PROBE_UNAVAILABLE)
      ? t2("update.failureCode.UPDATE_RUNTIME_UNAVAILABLE")
      : t2("update.failureCode.INSTDIR_OWNERSHIP_UNVERIFIED");
  }
  return message2 ?? fallback;
}
const INSTALLER_FAILURE_CODE_KEYS = {
  CHILD_PID_QUERY_UNAVAILABLE: "update.failureCode.CHILD_PID_QUERY_UNAVAILABLE",
  CHILD_PID_SNAPSHOT_UNAVAILABLE: "update.failureCode.CHILD_PID_SNAPSHOT_UNAVAILABLE",
  CHILD_PROCESS_EXIT_GUARD_FAILED: "update.failureCode.CHILD_PROCESS_EXIT_GUARD_FAILED",
  HANDOFF_STATE_CORRUPTED: "update.failureCode.HANDOFF_STATE_CORRUPTED",
  INSTALL_CHECKSUM_MISMATCH: "update.failureCode.INSTALL_CHECKSUM_MISMATCH",
  INSTALL_CLEANUP_FAILED: "update.failureCode.INSTALL_CLEANUP_FAILED",
  INSTALL_MARKER_CORRUPT: "update.failureCode.INSTALL_MARKER_CORRUPT",
  INSTALL_MARKER_WRITE_FAILED: "update.failureCode.INSTALL_MARKER_WRITE_FAILED",
  TEMP_SPACE: "update.failureCode.TEMP_SPACE",
  TEMP_SPACE_UNKNOWN: "update.failureCode.TEMP_SPACE_UNKNOWN",
  INSTDIR_SPACE: "update.failureCode.INSTDIR_SPACE",
  INSTDIR_SPACE_UNKNOWN: "update.failureCode.INSTDIR_SPACE_UNKNOWN",
  INSTALL_DIR_SPACE_LOW: "update.failureCode.INSTDIR_SPACE",
  INSTDIR_NOT_WRITABLE: "update.failureCode.INSTDIR_NOT_WRITABLE",
  INSTALL_DIR_NOT_WRITABLE: "update.failureCode.INSTDIR_NOT_WRITABLE",
  INSTDIR_SYSTEM_DIR: "update.failureCode.INSTDIR_SYSTEM_DIR",
  INSTALL_DIR_SYSTEM_DIR: "update.failureCode.INSTDIR_SYSTEM_DIR",
  INSTDIR_JUNCTION_INVALID: "update.failureCode.INSTDIR_JUNCTION_INVALID",
  INSTDIR_DATA_OVERLAP: "update.failureCode.INSTDIR_DATA_OVERLAP",
  INSTDIR_OWNERSHIP_UNVERIFIED: "update.failureCode.INSTDIR_OWNERSHIP_UNVERIFIED",
  INSTDIR_MULTI_INSTALL: "update.failureCode.INSTDIR_MULTI_INSTALL",
  MARKER_STORE_UNAVAILABLE: "update.failureCode.MARKER_STORE_UNAVAILABLE",
  PACKAGE_INVALIDATED: "update.failureCode.PACKAGE_INVALIDATED",
  PACKAGE_SIZE_INVALID: "update.failureCode.PACKAGE_SIZE_INVALID",
  UPDATE_PROXY_PROTOCOL_UNSUPPORTED: "update.failureCode.UPDATE_PROXY_PROTOCOL_UNSUPPORTED",
  UPDATER_EXECUTABLE_MISSING: "update.failureCode.UPDATER_EXECUTABLE_MISSING",
  UPDATE_RUNTIME_UNAVAILABLE: "update.failureCode.UPDATE_RUNTIME_UNAVAILABLE",
  INSTALL_INCOMPLETE: "update.failureCode.INSTALL_INCOMPLETE",
  INSTALL_METADATA_INVALID: "update.failureCode.INSTALL_METADATA_INVALID",
  INSTALL_METADATA_MISSING: "update.failureCode.INSTALL_METADATA_MISSING",
  INSTALL_STAGING_FAILED: "update.failureCode.INSTALL_STAGING_FAILED",
  INSTALLER_LAUNCH_FAILED: "update.failureCode.INSTALLER_LAUNCH_FAILED",
  INSTALLER_TERMINATION_FAILED: "update.failureCode.INSTALLER_TERMINATION_FAILED",
  USER_DATA_LOCKED: "update.failureCode.USER_DATA_LOCKED",
  USER_CANCELLED: "update.failureCode.USER_CANCELLED",
  INSTALL_FAILED: "update.failureCode.INSTALL_FAILED",
};
const NON_RETRYABLE_MANUAL_RECOVERY_CODES = new Set([
  "CHILD_PID_QUERY_UNAVAILABLE",
  "CHILD_PID_SNAPSHOT_UNAVAILABLE",
  "CHILD_PROCESS_EXIT_GUARD_FAILED",
  "INSTALL_INCOMPLETE",
  "INSTALL_MARKER_CORRUPT",
  "INSTALL_MARKER_WRITE_FAILED",
  "INSTALLER_TERMINATION_FAILED",
  "INSTDIR_JUNCTION_INVALID",
  "INSTDIR_OWNERSHIP_UNVERIFIED",
  "INSTDIR_MULTI_INSTALL",
  "UPDATE_PROXY_PROTOCOL_UNSUPPORTED",
  "UPDATER_EXECUTABLE_MISSING",
  "UPDATE_RUNTIME_UNAVAILABLE",
]);
export function isManualRecoveryRetryable(manualRecoveryCode) {
  return !manualRecoveryCode || !NON_RETRYABLE_MANUAL_RECOVERY_CODES.has(manualRecoveryCode);
}
export function isManualRecoveryCheckRetryable(manualRecoveryCode) {
  return manualRecoveryCode === "UPDATE_PROXY_PROTOCOL_UNSUPPORTED";
}
export function formatManualRecoveryMessage(manualRecoveryCode, t2) {
  const key2 = manualRecoveryCode ? INSTALLER_FAILURE_CODE_KEYS[manualRecoveryCode] : void 0;
  if (key2) return t2(key2);
  return t2("update.manualRecovery.body");
}
const MANUAL_UPDATE_CHECK_TOAST_ID = "manual-update-check";
function showManualUpdateCheckFeedback(result, t2) {
  if (!result.accepted) {
    if (isUpdateCheckAlreadyInProgress(result.error)) {
      dedupedToast.info(formatUpdaterErrorMessage(result.error, t2, t2("update.error")), {
        id: MANUAL_UPDATE_CHECK_TOAST_ID,
      });
      return;
    }
    dedupedToast.error(formatUpdaterErrorMessage(result.error, t2, t2("update.error")), {
      id: MANUAL_UPDATE_CHECK_TOAST_ID,
    });
    return;
  }
  const { state: state2 } = result;
  if (state2.phase === "error") {
    const message2 = formatUpdaterErrorMessage(state2.error?.message, t2, t2("update.error"));
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
    devPreviewMode ? createUpdaterDevPreviewState(devPreviewMode) : createInitialState(),
  );
  const [trigger, setTrigger] = reactExports.useState("auto");
  const [notificationNow, setNotificationNow] = reactExports.useState(() => Date.now());
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
    const supportsReminder = state2.phase === "available" || state2.phase === "downloaded";
    if (!state2.dismissed || dismissedAt <= 0 || !supportsReminder) return void 0;
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
    if (!devPreviewMode || devPreviewMode === "downloading" || state2.phase !== "downloading") {
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
  return <UpdaterContext.Provider value={value}>{children2}</UpdaterContext.Provider>;
};
({
  en: BUNDLED_CHANGELOG.en,
  zh: BUNDLED_CHANGELOG.zh,
});
function formatVersion(version2) {
  const v2 = version2.replace(/^v/, "");
  return `v${v2}`;
}
export function computeVersionDelta(currentVersion, targetVersion) {
  const current2 = parseSemver(currentVersion);
  const target = parseSemver(targetVersion);
  const currentFormatted = formatVersion(currentVersion);
  const targetFormatted = formatVersion(targetVersion);
  const isMinorBump = !!(current2 && target && current2.minor !== target.minor);
  const versionsBehind = (() => {
    if (!current2 || !target) return null;
    if (current2.major !== target.major || current2.minor !== target.minor) return null;
    const delta = target.patch - current2.patch;
    return delta > 0 ? delta : null;
  })();
  return {
    display: `${currentFormatted} → ${targetFormatted}`,
    isMinorBump,
    currentFormatted,
    targetFormatted,
    versionsBehind,
  };
}
