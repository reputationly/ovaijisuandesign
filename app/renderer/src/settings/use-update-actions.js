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

function formatVersionLabel(version) {
  if (!version) return "";
  return `v${version.replace(/^v/, "")}`;
}

function hasUpdateAttention(phase) {
  return phase ? ATTENTION_PHASES.has(phase) : false;
}

export function useUpdateActions({ manualDownloadSource }) {
  const { t } = useTranslation();
  const platform = usePlatform();
  const {
    state,
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
    if (state.phase === "checking") {
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
  }, [state.phase]);
  const currentVersionLabel = formatVersionLabel(state.currentVersion);
  const targetVersionLabel = formatVersionLabel(state.targetVersion);
  const checking = optimisticChecking || state.phase === "checking";
  const downloading = state.phase === "downloading";
  const downloaded = state.phase === "downloaded";
  const available = state.phase === "available";
  const pendingUpdate = available || downloaded;
  const attentionUpdate = hasUpdateAttention(state.phase);
  const canManualDownload =
    !!state.manualDownloadUrl &&
    (state.manualOnly || state.phase === "error");
  const canRetryLocalInstall =
    !canManualDownload &&
    state.phase === "error" &&
    state.manualRecoverySource === "local" &&
    isManualRecoveryRetryable(state.manualRecoveryCode);
  const progressValue = progressPercent(state.progress);
  const progressText = formatProgressDisplay(state.progress);
  const versionDelta = state.targetVersion
    ? computeVersionDelta(state.currentVersion, state.targetVersion)
    : null;
  const ctaLabel = (() => {
    if (checking) return t("update.version.checking");
    if (downloading) return `${progressValue}%`;
    if (pendingUpdate) return t("update.version.updateCta");
    return t("update.version.checkCta");
  })();
  const primaryActionLabel = (() => {
    if (checking) return t("update.version.checking");
    if (available)
      return canManualDownload
        ? t("update.btn.manualDownload")
        : t("update.btn.download");
    if (downloading) return `${progressValue}%`;
    if (downloaded) return t("update.btn.restartNow");
    if (canRetryLocalInstall) return t("update.btn.retryInstall");
    if (state.phase === "error" && canManualDownload)
      return t("update.btn.manualDownload");
    return t("update.version.checkCta");
  })();
  const handleManualDownload = reactExports.useCallback(() => {
    if (!state.manualDownloadUrl) return;
    void openManualInstallerDownload(
      platform.shell,
      state.manualDownloadUrl,
      state.manualDownloadFallbackUrl,
      manualDownloadSource,
    );
  }, [
    platform.shell,
    state.manualDownloadUrl,
    state.manualDownloadFallbackUrl,
    manualDownloadSource,
  ]);
  const handleInstall = reactExports.useCallback(() => {
    installUpdateForPlatform(install, platform.app.os);
  }, [install, platform.app.os]);
  const handleCheck = reactExports.useCallback(() => {
    setOptimisticChecking(true);
    check({
      userTriggered: true,
    });
  }, [check]);
  const handlePrimaryAction = reactExports.useCallback(() => {
    if (checking || downloading) return;
    if (state.phase === "available") {
      if (canManualDownload) {
        handleManualDownload();
        return;
      }
      download();
      return;
    }
    if (state.phase === "downloaded") {
      handleInstall();
      return;
    }
    if (canRetryLocalInstall) {
      void retryInstall();
      return;
    }
    if (state.phase === "error" && canManualDownload) {
      handleManualDownload();
      return;
    }
    handleCheck();
  }, [
    checking,
    downloading,
    state.phase,
    canManualDownload,
    canRetryLocalInstall,
    handleManualDownload,
    download,
    handleInstall,
    retryInstall,
    handleCheck,
  ]);
  return {
    state,
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
