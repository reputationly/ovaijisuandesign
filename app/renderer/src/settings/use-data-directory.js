// use-data-directory.js
import { instantiation } from "../workspace/home-service.jsx";
import { hilo } from "./parse-custom-mcp-arguments.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import {
  DATA_DIRECTORY_STATUS_CHANGED_EVENT,
  getDataDirectoryMainService,
} from "./get-data-directory-main-service.js";
import reactExports from "react";
import { storageKeys } from "../infra/storage-cache.js";
import { usePlatform } from "../infra/platform-context.js";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { dedupedToast } from "../infra/agent-http-client.js";
import { useSettings } from "./use-settings.js";
import {
  hideVisiblePreviewTabs,
  toastWorkspaceCloseBlocked,
} from "../assets/credit-query-keys.jsx";
function notifyDataDirectoryStatusChanged() {
  window.dispatchEvent(new Event(DATA_DIRECTORY_STATUS_CHANGED_EVENT));
}
const UNKNOWN_FAILURE = {
  code: "unknown",
  phase: "preflight",
  retryable: true,
  diagnosticId: "",
  sourcePreserved: true,
};
const ACTIVE_WORKSPACES_FAILURE = {
  code: "active_workspaces",
  phase: "preflight",
  retryable: true,
  diagnosticId: "",
  sourcePreserved: true,
};
const PREFLIGHT_IPC_TIMEOUT_MS = 3e4;
const ESTIMATE_IPC_TIMEOUT_MS = 6e4;
class DataDirectoryTimeoutError extends Error {
  constructor(operation, timeoutMs) {
    super(`Data directory ${operation} did not respond within ${timeoutMs}ms`);
    this.name = "DataDirectoryTimeoutError";
  }
}
function withIpcTimeout(work, operation, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      void window.hilo?.logger?.error?.(
        `[storage] ${operation} timed out after ${timeoutMs}ms; the IPC reply never arrived`,
        "storage",
      );
      reject(new DataDirectoryTimeoutError(operation, timeoutMs));
    }, timeoutMs);
    work.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}
function isDirValidationError(error) {
  return (
    error === "drive_root" ||
    error === "protected_dir" ||
    error === "not_writable" ||
    error === "invalid_path" ||
    error === "app_install_dir"
  );
}
function dataDirectoryRecoveryErrorCode(failure, legacyError) {
  const code = failure?.code ?? legacyError;
  if (
    code === "active_workspaces" ||
    code === "initialization_failed" ||
    isDirValidationError(code)
  ) {
    return code;
  }
  return "migration_failed";
}
function recoveryModeForPending(mode) {
  if (mode === "recover") return "recovery_merge";
  if (mode === "residue") return "default_residue_merge";
  return void 0;
}
function trackRecovery(mode, outcome, result, errorCode) {
  trackEvent(TRACK_EVENTS.DATA_DIRECTORY_RECOVERY, {
    outcome,
    recovery_mode: mode,
    ...(errorCode
      ? {
          error_code: errorCode,
        }
      : {}),
    copied_workspace_count: result?.recovery?.copiedWorkspaceCount ?? 0,
    copied_output_entry_count: result?.recovery?.copiedOutputEntryCount ?? 0,
    conflict_count: result?.recovery?.conflictCount ?? 0,
    source_preserved:
      result?.recovery?.sourcePreserved ??
      result?.failure?.sourcePreserved ??
      true,
  });
}
function trackMigrationBlocked(gate, openWorkspaceCount) {
  trackEvent(TRACK_EVENTS.DATA_DIRECTORY_MIGRATION_BLOCKED, {
    gate,
    open_workspace_count: openWorkspaceCount,
  });
}
async function hiloApp() {
  const [
    { instantiationService },
    { IHiloApp },
  ] = await Promise.all([
    (() => Promise.resolve().then(() => instantiation))(),
    (() => Promise.resolve().then(() => hilo))(),
  ]);
  return instantiationService.invokeFunction((accessor) =>
    accessor.get(IHiloApp),
  );
}
async function closeOpenWorkspaceViaHiloApp(folderPath) {
  return (await hiloApp()).closeWorkspace(folderPath, {
    source: "settings-storage",
  });
}
async function closeIdleWorkspacesViaHiloApp() {
  return (await hiloApp()).closeIdleWorkspaces({
    source: "settings-storage",
  });
}
function normalizeDataDirectoryFailure(failure, legacyError) {
  if (!failure && isDirValidationError(legacyError)) {
    return {
      validationError: legacyError,
      failure: null,
    };
  }
  return {
    validationError: null,
    failure: failure ?? UNKNOWN_FAILURE,
  };
}
function isSameDataDirectoryPath(left, right, os) {
  const normalize = (value) => {
    const normalized = value.replace(/\\/g, "/").replace(/\/+$/, "");
    return os === "win32" || os === "darwin"
      ? normalized.toLowerCase()
      : normalized;
  };
  return normalize(left) === normalize(right);
}
export function useDataDirectory() {
  const { t } = useTranslation();
  const { config } = useSettings();
  const platform = usePlatform();
  const queryClient = useQueryClient();
  const [appliedDataDir, setAppliedDataDir] = reactExports.useState(null);
  const [status, setStatus] = reactExports.useState(null);
  const dataDir =
    appliedDataDir ?? status?.dataDirectory ?? config.dataDirectory ?? "";
  const [residue, setResidue] = reactExports.useState(null);
  const [recoverySummary, setRecoverySummary] = reactExports.useState(null);
  const [needsRestart, setNeedsRestart] = reactExports.useState(false);
  const [configuredLocationUnavailable, setConfiguredLocationUnavailable] =
    reactExports.useState(false);
  const [validating, setValidating] = reactExports.useState(false);
  const [migrating, setMigrating] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [migrationFailure, setMigrationFailure] = reactExports.useState(null);
  const [cleanupDeferred, setCleanupDeferred] = reactExports.useState(false);
  const [pendingMigration, setPendingMigration] = reactExports.useState(null);
  const mountedRef = reactExports.useRef(false);
  const refreshSequenceRef = reactExports.useRef(0);
  const [workspaceStatuses, setWorkspaceStatuses] = reactExports.useState([]);
  const refreshStatus = reactExports.useCallback(async () => {
    const sequence = ++refreshSequenceRef.current;
    const service = getDataDirectoryMainService();
    const [nextStatus, entries] = await Promise.all([
      withIpcTimeout(
        service.getStatus(),
        "getStatus",
        PREFLIGHT_IPC_TIMEOUT_MS,
      ),
      withIpcTimeout(
        hiloApp().then((app) => app.listWorkspaceEntryStatuses()),
        "listWorkspaceEntryStatuses",
        PREFLIGHT_IPC_TIMEOUT_MS,
      ).catch(() => []),
    ]);
    if (!mountedRef.current || sequence !== refreshSequenceRef.current)
      return nextStatus;
    setStatus(nextStatus);
    setWorkspaceStatuses(entries);
    setNeedsRestart(nextStatus.state === "pending_restart");
    setConfiguredLocationUnavailable(
      nextStatus.state === "configured_location_unavailable",
    );
    setCleanupDeferred(nextStatus.deferredCleanupPaths.length > 0);
    const activeCustom =
      nextStatus.state === "active" &&
      !isSameDataDirectoryPath(
        nextStatus.activeDirectory,
        nextStatus.defaultDirectory,
        platform.app.os,
      );
    if (!activeCustom) {
      setResidue(null);
      return nextStatus;
    }
    void service
      .getDefaultStorageResidue()
      .then((nextResidue) => {
        if (mountedRef.current && sequence === refreshSequenceRef.current) {
          setResidue(nextResidue ?? null);
        }
      })
      .catch(() => {
        if (mountedRef.current && sequence === refreshSequenceRef.current)
          setResidue(null);
      });
    return nextStatus;
  }, [platform.app.os]);
  reactExports.useEffect(() => {
    mountedRef.current = true;
    let disposed = false;
    let subscription;
    const refresh = () => {
      void refreshStatus().catch(() => {});
    };
    void hiloApp()
      .then((app) => {
        if (!disposed) subscription = app.onWorkspaceEntriesChanged(refresh);
      })
      .catch(() => {})
      .finally(() => {
        if (!disposed) refresh();
      });
    return () => {
      disposed = true;
      subscription?.dispose();
      mountedRef.current = false;
      refreshSequenceRef.current += 1;
    };
  }, [refreshStatus]);
  const configuredDirectory = status?.configuredDirectory ?? dataDir;
  const activeDirectory = status?.activeDirectory ?? configuredDirectory;
  const activeDirectoryIsDefault = status
    ? isSameDataDirectoryPath(
        status.activeDirectory,
        status.defaultDirectory,
        platform.app.os,
      )
    : !dataDir;
  const openWorkspaceCount = status?.openWorkspaceCount ?? 0;
  const openWorkspacePaths = status?.openWorkspacePaths ?? [];
  const [closingWorkspacePath, setClosingWorkspacePath] =
    reactExports.useState(null);
  const [closingIdleWorkspaces, setClosingIdleWorkspaces] =
    reactExports.useState(false);
  const refreshGlobalStorageCache = reactExports.useCallback(async () => {
    try {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: storageKeys.global("config"),
        }),
        queryClient.invalidateQueries({
          queryKey: storageKeys.global("recentWorkspaces"),
        }),
        queryClient.invalidateQueries({
          queryKey: storageKeys.global("projects"),
        }),
        queryClient.invalidateQueries({
          queryKey: storageKeys.global("currentWorkspace"),
        }),
        queryClient.invalidateQueries({
          queryKey: storageKeys.global("openWorkspacePaths"),
        }),
        queryClient.invalidateQueries({
          queryKey: storageKeys.global("lastActiveWorkspacePath"),
        }),
        queryClient.invalidateQueries({
          queryKey: storageKeys.global("workspaceSessionTabs"),
        }),
      ]);
    } catch (refreshError) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : String(refreshError);
      void window.hilo?.logger?.error?.(
        `[storage] Failed to refresh global storage cache after migration: ${message}`,
        "storage",
      );
    }
  }, [queryClient]);
  const recordFailure = reactExports.useCallback((failure, legacy) => {
    const normalized = normalizeDataDirectoryFailure(failure, legacy);
    setError(normalized.validationError);
    setMigrationFailure(normalized.failure);
  }, []);
  const clearOperationState = reactExports.useCallback(() => {
    setError(null);
    setMigrationFailure(null);
    setCleanupDeferred(false);
    setPendingMigration(null);
    setRecoverySummary(null);
  }, []);
  const refreshAfterOperation = reactExports.useCallback(async () => {
    try {
      await refreshStatus();
    } catch (refreshError) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : String(refreshError);
      void window.hilo?.logger?.error?.(
        `[storage] Failed to refresh data-directory status after migration: ${message}`,
        "storage",
      );
    }
    notifyDataDirectoryStatusChanged();
    await refreshGlobalStorageCache();
  }, [refreshGlobalStorageCache, refreshStatus]);
  const handleCloseOpenWorkspace = reactExports.useCallback(
    async (folderPath) => {
      if (closingWorkspacePath) return;
      setClosingWorkspacePath(folderPath);
      try {
        const result = await closeOpenWorkspaceViaHiloApp(folderPath);
        if (result.closed) {
          hideVisiblePreviewTabs(folderPath);
          const nextStatus = await refreshStatus();
          if (nextStatus.openWorkspaceCount === 0) {
            setMigrationFailure((failure) =>
              failure?.code === "active_workspaces" ? null : failure,
            );
          }
          notifyDataDirectoryStatusChanged();
          await refreshGlobalStorageCache();
          return;
        }
        toastWorkspaceCloseBlocked(folderPath, result);
        await refreshStatus();
      } catch (closeError) {
        const message =
          closeError instanceof Error ? closeError.message : String(closeError);
        void window.hilo?.logger?.error?.(
          `[storage] Failed to close open workspace from settings: ${message}`,
          "storage",
        );
        toastWorkspaceCloseBlocked(folderPath, {});
      } finally {
        setClosingWorkspacePath(null);
      }
    },
    [closingWorkspacePath, refreshGlobalStorageCache, refreshStatus],
  );
  const handleCloseIdleWorkspaces = reactExports.useCallback(async () => {
    if (closingIdleWorkspaces || closingWorkspacePath) return;
    setClosingIdleWorkspaces(true);
    try {
      const result = await closeIdleWorkspacesViaHiloApp();
      const nextStatus = await refreshStatus();
      const closedPaths = result.closedWorkspaceIds.filter(
        (path) => !nextStatus.openWorkspacePaths.includes(path),
      );
      if (closedPaths.length > 0) hideVisiblePreviewTabs(closedPaths);
      if (nextStatus.openWorkspaceCount === 0) {
        setMigrationFailure((failure) =>
          failure?.code === "active_workspaces" ? null : failure,
        );
      }
      notifyDataDirectoryStatusChanged();
      await refreshGlobalStorageCache();
      if (result.remaining > 0) {
        dedupedToast.warning(t("settings.storage.closeIdleProjectsBlocked"));
      }
    } catch (closeError) {
      const message =
        closeError instanceof Error ? closeError.message : String(closeError);
      void window.hilo?.logger?.error?.(
        `[storage] Failed to close idle workspaces from settings: ${message}`,
        "storage",
      );
      dedupedToast.error(t("settings.storage.closeIdleProjectsFailed"));
    } finally {
      setClosingIdleWorkspaces(false);
    }
  }, [
    closingIdleWorkspaces,
    closingWorkspacePath,
    refreshGlobalStorageCache,
    refreshStatus,
    t,
  ]);
  const applyPendingMigration = reactExports.useCallback(async () => {
    if (!pendingMigration) return;
    setMigrating(true);
    setError(null);
    setMigrationFailure(null);
    setCleanupDeferred(false);
    const recoveryMode = recoveryModeForPending(pendingMigration.mode);
    try {
      const service = getDataDirectoryMainService();
      const result =
        pendingMigration.mode === "reset"
          ? await service.reset()
          : pendingMigration.mode === "residue"
            ? await service.recoverDefaultStorageResidue()
            : await service.apply(pendingMigration.targetPath);
      if (!result.success) {
        setCleanupDeferred((result.cleanupDeferredPaths?.length ?? 0) > 0);
        recordFailure(result.failure, result.error);
        if (result.failure?.code === "active_workspaces") {
          trackMigrationBlocked("main_preflight", openWorkspaceCount);
        }
        if (recoveryMode) {
          trackRecovery(
            recoveryMode,
            "failed",
            result,
            dataDirectoryRecoveryErrorCode(result.failure, result.error),
          );
        }
        return;
      }
      if (pendingMigration.mode !== "residue") {
        const nextCustomRoot =
          pendingMigration.mode === "reset" ? "" : pendingMigration.targetPath;
        setAppliedDataDir(nextCustomRoot);
      }
      setNeedsRestart(result.needsRestart);
      setConfiguredLocationUnavailable(false);
      setCleanupDeferred((result.cleanupDeferredPaths?.length ?? 0) > 0);
      setRecoverySummary(recoveryMode ? (result.recovery ?? null) : null);
      if (recoveryMode) {
        if (result.recovery) {
          trackRecovery(recoveryMode, "success", result);
        } else {
          trackRecovery(
            recoveryMode,
            "failed",
            result,
            "missing_recovery_summary",
          );
        }
      }
      setPendingMigration(null);
      await refreshAfterOperation();
    } catch {
      setMigrationFailure(UNKNOWN_FAILURE);
      if (recoveryMode)
        trackRecovery(recoveryMode, "failed", void 0, "ipc_error");
    } finally {
      setMigrating(false);
    }
  }, [
    openWorkspaceCount,
    pendingMigration,
    recordFailure,
    refreshAfterOperation,
  ]);
  const handleBrowse = reactExports.useCallback(async () => {
    clearOperationState();
    try {
      const result = await platform.fs.showOpenDialog?.({
        directory: true,
        title: t("settings.storage.selectDirectory"),
      });
      if (!result?.length) return;
      const selected = result[0];
      setValidating(true);
      const service = getDataDirectoryMainService();
      const validation = await withIpcTimeout(
        service.validate(selected),
        "validate",
        PREFLIGHT_IPC_TIMEOUT_MS,
      );
      if (!validation.ok) {
        setError(validation.error ?? "not_writable");
        return;
      }
      const currentStatus = await refreshStatus();
      if (currentStatus.openWorkspaceCount > 0) {
        trackMigrationBlocked("browse", currentStatus.openWorkspaceCount);
        setMigrationFailure(ACTIVE_WORKSPACES_FAILURE);
        return;
      }
      const targetIsDefault = isSameDataDirectoryPath(
        selected,
        currentStatus.defaultDirectory,
        platform.app.os,
      );
      const targetIsConfigured = isSameDataDirectoryPath(
        selected,
        currentStatus.configuredDirectory,
        platform.app.os,
      );
      const recoveringUnavailable =
        currentStatus.state === "configured_location_unavailable";
      if (recoveringUnavailable) {
        const mode = targetIsDefault
          ? "reset"
          : targetIsConfigured
            ? "recover"
            : "relink";
        setPendingMigration({
          mode,
          sourcePath:
            mode === "recover"
              ? currentStatus.activeDirectory
              : currentStatus.configuredDirectory,
          targetPath: selected,
          warning: validation.warning,
          sourceIsDefault:
            mode === "recover" ||
            isSameDataDirectoryPath(
              currentStatus.activeDirectory,
              currentStatus.defaultDirectory,
              platform.app.os,
            ),
          targetIsDefault,
          recoveringUnavailable: mode === "reset",
        });
        return;
      }
      const estimate = await withIpcTimeout(
        service.estimateMigrationSize(selected),
        "estimateMigrationSize",
        ESTIMATE_IPC_TIMEOUT_MS,
      ).catch(() => void 0);
      setPendingMigration({
        mode: targetIsDefault ? "reset" : "apply",
        sourcePath: currentStatus.activeDirectory,
        targetPath: selected,
        // A partial walk would understate the size; show "unknown" instead.
        totalBytes: estimate?.partial ? void 0 : estimate?.totalBytes,
        warning: validation.warning,
        sourceIsDefault: isSameDataDirectoryPath(
          currentStatus.activeDirectory,
          currentStatus.defaultDirectory,
          platform.app.os,
        ),
        targetIsDefault,
        recoveringUnavailable: false,
      });
    } catch {
      setMigrationFailure(UNKNOWN_FAILURE);
    } finally {
      setValidating(false);
    }
  }, [clearOperationState, platform.app.os, platform.fs, refreshStatus, t]);
  const handleReset = reactExports.useCallback(async () => {
    clearOperationState();
    try {
      setValidating(true);
      const currentStatus = await refreshStatus();
      const recoveringUnavailable =
        currentStatus.state === "configured_location_unavailable";
      if (!recoveringUnavailable && currentStatus.openWorkspaceCount > 0) {
        trackMigrationBlocked("reset", currentStatus.openWorkspaceCount);
        setMigrationFailure(ACTIVE_WORKSPACES_FAILURE);
        return;
      }
      setPendingMigration({
        mode: "reset",
        sourcePath: recoveringUnavailable
          ? currentStatus.configuredDirectory
          : currentStatus.activeDirectory,
        targetPath: currentStatus.defaultDirectory,
        sourceIsDefault:
          !recoveringUnavailable &&
          isSameDataDirectoryPath(
            currentStatus.activeDirectory,
            currentStatus.defaultDirectory,
            platform.app.os,
          ),
        targetIsDefault: true,
        recoveringUnavailable,
      });
    } catch {
      setMigrationFailure(UNKNOWN_FAILURE);
    } finally {
      setValidating(false);
    }
  }, [clearOperationState, platform.app.os, refreshStatus]);
  const handleRecoverConfigured = reactExports.useCallback(async () => {
    clearOperationState();
    try {
      setValidating(true);
      const currentStatus = await refreshStatus();
      if (currentStatus.openWorkspaceCount > 0) {
        trackMigrationBlocked("recover", currentStatus.openWorkspaceCount);
        setMigrationFailure(ACTIVE_WORKSPACES_FAILURE);
        return;
      }
      if (
        currentStatus.state !== "configured_location_unavailable" ||
        !isSameDataDirectoryPath(
          currentStatus.activeDirectory,
          currentStatus.defaultDirectory,
          platform.app.os,
        ) ||
        isSameDataDirectoryPath(
          currentStatus.configuredDirectory,
          currentStatus.defaultDirectory,
          platform.app.os,
        )
      ) {
        return;
      }
      setPendingMigration({
        mode: "recover",
        sourcePath: currentStatus.activeDirectory,
        targetPath: currentStatus.configuredDirectory,
        sourceIsDefault: true,
        targetIsDefault: false,
        recoveringUnavailable: false,
      });
    } catch {
      setMigrationFailure(UNKNOWN_FAILURE);
    } finally {
      setValidating(false);
    }
  }, [clearOperationState, platform.app.os, refreshStatus]);
  const handleRecoverResidue = reactExports.useCallback(async () => {
    clearOperationState();
    try {
      setValidating(true);
      const currentStatus = await refreshStatus();
      if (currentStatus.openWorkspaceCount > 0) {
        trackMigrationBlocked("residue", currentStatus.openWorkspaceCount);
        setMigrationFailure(ACTIVE_WORKSPACES_FAILURE);
        return;
      }
      if (
        currentStatus.state !== "active" ||
        !residue?.available ||
        isSameDataDirectoryPath(
          currentStatus.activeDirectory,
          currentStatus.defaultDirectory,
          platform.app.os,
        )
      ) {
        return;
      }
      setPendingMigration({
        mode: "residue",
        sourcePath: currentStatus.defaultDirectory,
        targetPath: currentStatus.activeDirectory,
        sourceIsDefault: true,
        targetIsDefault: false,
        recoveringUnavailable: false,
      });
    } catch {
      setMigrationFailure(UNKNOWN_FAILURE);
    } finally {
      setValidating(false);
    }
  }, [
    clearOperationState,
    platform.app.os,
    refreshStatus,
    residue?.available,
  ]);
  const handleConfirmMigration = reactExports.useCallback(() => {
    void applyPendingMigration();
  }, [applyPendingMigration]);
  const handleCancelMigration = reactExports.useCallback(() => {
    if (migrating) return;
    setMigrationFailure(null);
    setPendingMigration(null);
  }, [migrating]);
  return {
    dataDir,
    activeDirectory,
    activeDirectoryIsDefault,
    configuredDirectory,
    openWorkspaceCount,
    openWorkspacePaths,
    closingWorkspacePath,
    workspaceStatuses,
    closingIdleWorkspaces,
    residue,
    recoverySummary,
    needsRestart,
    configuredLocationUnavailable,
    validating,
    migrating,
    busy: validating || migrating,
    error,
    migrationFailure,
    cleanupDeferred,
    pendingMigration,
    handleBrowse,
    handleReset,
    handleRecoverConfigured,
    handleRecoverResidue,
    handleCloseOpenWorkspace,
    handleCloseIdleWorkspaces,
    handleConfirmMigration,
    handleCancelMigration,
  };
}
