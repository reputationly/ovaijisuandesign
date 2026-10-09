// use-update-actions.js
import { reactExports, usePlatform, useTranslation } from "../vendor.js";
import {
  formatProgressDisplay,
  installUpdateForPlatform,
  openManualInstallerDownload,
  progressPercent,
} from "./diagnostics-group.jsx";
import { useUpdaterContext } from "./use-active-runtime.js";
import {
  computeVersionDelta,
  isManualRecoveryRetryable,
} from "./installer-failure-code-keys.js";

const ATTENTION_PHASES = new Set(["available", "downloading", "downloaded"]);

function formatVersionLabel(version2) {
  if (!version2) return "";
  return `v${version2.replace(/^v/, "")}`;
}

function hasUpdateAttention(phase) {
  return phase ? ATTENTION_PHASES.has(phase) : false;
}

export function useUpdateActions({ manualDownloadSource }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const {
    state: state2,
    capabilities,
    check,
    download,
    cancelDownload,
    install,
    retryInstall,
    dismiss,
  } = useUpdaterContext();
  const [optimisticChecking, setOptimisticChecking] =
    reactExports.useState(false);
  const checkTimeoutRef = reactExports.useRef(void 0);
  reactExports.useEffect(() => {
    if (state2.phase === "checking") {
      setOptimisticChecking(true);
      checkTimeoutRef.current = setTimeout(
        () => setOptimisticChecking(false),
        5e3,
      );
    } else {
      setOptimisticChecking(false);
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    }
    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [state2.phase]);
  const currentVersionLabel = formatVersionLabel(state2.currentVersion);
  const targetVersionLabel = formatVersionLabel(state2.targetVersion);
  const checking = optimisticChecking || state2.phase === "checking";
  const downloading = state2.phase === "downloading";
  const downloaded = state2.phase === "downloaded";
  const available = state2.phase === "available";
  const pendingUpdate = available || downloaded;
  const attentionUpdate = hasUpdateAttention(state2.phase);
  const canManualDownload =
    !!state2.manualDownloadUrl &&
    (state2.manualOnly || state2.phase === "error");
  const canRetryLocalInstall =
    !canManualDownload &&
    state2.phase === "error" &&
    state2.manualRecoverySource === "local" &&
    isManualRecoveryRetryable(state2.manualRecoveryCode);
  const progressValue = progressPercent(state2.progress);
  const progressText = formatProgressDisplay(state2.progress);
  const versionDelta = state2.targetVersion
    ? computeVersionDelta(state2.currentVersion, state2.targetVersion)
    : null;
  const ctaLabel = (() => {
    if (checking) return t2("update.version.checking");
    if (downloading) return `${progressValue}%`;
    if (pendingUpdate) return t2("update.version.updateCta");
    return t2("update.version.checkCta");
  })();
  const primaryActionLabel = (() => {
    if (checking) return t2("update.version.checking");
    if (available)
      return canManualDownload
        ? t2("update.btn.manualDownload")
        : t2("update.btn.download");
    if (downloading) return `${progressValue}%`;
    if (downloaded) return t2("update.btn.restartNow");
    if (canRetryLocalInstall) return t2("update.btn.retryInstall");
    if (state2.phase === "error" && canManualDownload)
      return t2("update.btn.manualDownload");
    return t2("update.version.checkCta");
  })();
  const handleManualDownload = reactExports.useCallback(() => {
    if (!state2.manualDownloadUrl) return;
    void openManualInstallerDownload(
      platform2.shell,
      state2.manualDownloadUrl,
      state2.manualDownloadFallbackUrl,
      manualDownloadSource,
    );
  }, [
    platform2.shell,
    state2.manualDownloadUrl,
    state2.manualDownloadFallbackUrl,
    manualDownloadSource,
  ]);
  const handleInstall = reactExports.useCallback(() => {
    installUpdateForPlatform(install, platform2.app.os);
  }, [install, platform2.app.os]);
  const handleCheck = reactExports.useCallback(() => {
    setOptimisticChecking(true);
    check({
      userTriggered: true,
    });
  }, [check]);
  const handlePrimaryAction = reactExports.useCallback(() => {
    if (checking || downloading) return;
    if (state2.phase === "available") {
      if (canManualDownload) {
        handleManualDownload();
        return;
      }
      download();
      return;
    }
    if (state2.phase === "downloaded") {
      handleInstall();
      return;
    }
    if (canRetryLocalInstall) {
      void retryInstall();
      return;
    }
    if (state2.phase === "error" && canManualDownload) {
      handleManualDownload();
      return;
    }
    handleCheck();
  }, [
    checking,
    downloading,
    state2.phase,
    canManualDownload,
    canRetryLocalInstall,
    handleManualDownload,
    download,
    handleInstall,
    retryInstall,
    handleCheck,
  ]);
  return {
    state: state2,
    capabilities,
    check,
    download,
    cancelDownload,
    install,
    retryInstall,
    dismiss,
    currentVersionLabel,
    targetVersionLabel,
    checking,
    downloading,
    downloaded,
    available,
    pendingUpdate,
    attentionUpdate,
    canManualDownload,
    canRetryLocalInstall,
    progressValue,
    progressText,
    versionDelta,
    ctaLabel,
    primaryActionLabel,
    showCheckIcon: !pendingUpdate && !downloading,
    primaryActionDisabled: checking || downloading,
    handleCheck,
    handlePrimaryAction,
    handleManualDownload,
    handleInstall,
  };
}
