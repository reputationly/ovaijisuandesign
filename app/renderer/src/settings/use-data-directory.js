// use-data-directory.js
import { instantiation } from "../workspace/home-service.jsx";
import { hilo as hilo$1 } from "./parse-custom-mcp-arguments.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import {
  DATA_DIRECTORY_STATUS_CHANGED_EVENT,
  getDataDirectoryMainService,
} from "./get-data-directory-main-service.js";
import { reactExports, storageKeys, usePlatform, useQueryClient, useTranslation } from "../vendor.js";
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
    const timer2 = window.setTimeout(() => {
      void window.hilo?.logger?.error?.(
        `[storage] ${operation} timed out after ${timeoutMs}ms; the IPC reply never arrived`,
        "storage",
      );
      reject(new DataDirectoryTimeoutError(operation, timeoutMs));
    }, timeoutMs);
    work.then(
      (value) => {
        window.clearTimeout(timer2);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer2);
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
  const code2 = failure?.code ?? legacyError;
  if (
    code2 === "active_workspaces" ||
    code2 === "initialization_failed" ||
    isDirValidationError(code2)
  ) {
    return code2;
  }
  return "migration_failed";
}
function recoveryModeForPending(mode2) {
  if (mode2 === "recover") return "recovery_merge";
  if (mode2 === "residue") return "default_residue_merge";
  return void 0;
}
function trackRecovery(mode2, outcome, result, errorCode) {
  trackEvent(TRACK_EVENTS.DATA_DIRECTORY_RECOVERY, {
    outcome,
    recovery_mode: mode2,
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
    { instantiationService: instantiationService2 },
    { IHiloApp: IHiloApp2 },
  ] = await Promise.all([
    (() => Promise.resolve().then(() => instantiation))(),
    (() => Promise.resolve().then(() => hilo$1))(),
  ]);
  return instantiationService2.invokeFunction((accessor) =>
    accessor.get(IHiloApp2),
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
function isSameDataDirectoryPath(left, right, os2) {
  const normalize2 = (value) => {
    const normalized = value.replace(/\\/g, "/").replace(/\/+$/, "");
    return os2 === "win32" || os2 === "darwin"
      ? normalized.toLowerCase()
      : normalized;
  };
  return normalize2(left) === normalize2(right);
}
export function useDataDirectory() {
  const { t: t2 } = useTranslation();
  const { config: config2 } = useSettings();
  const platform2 = usePlatform();
  const queryClient2 = useQueryClient();
  const [appliedDataDir, setAppliedDataDir] = reactExports.useState(null);
  const [status, setStatus] = reactExports.useState(null);
  const dataDir =
    appliedDataDir ?? status?.dataDirectory ?? config2.dataDirectory ?? "";
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
    const service2 = getDataDirectoryMainService();
    const [nextStatus, entries2] = await Promise.all([
      withIpcTimeout(
        service2.getStatus(),
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
    setWorkspaceStatuses(entries2);
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
        platform2.app.os,
      );
    if (!activeCustom) {
      setResidue(null);
      return nextStatus;
    }
    void service2
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
  }, [platform2.app.os]);
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
        platform2.app.os,
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
        queryClient2.invalidateQueries({
          queryKey: storageKeys.global("config"),
        }),
        queryClient2.invalidateQueries({
          queryKey: storageKeys.global("recentWorkspaces"),
        }),
        queryClient2.invalidateQueries({
          queryKey: storageKeys.global("projects"),
        }),
        queryClient2.invalidateQueries({
          queryKey: storageKeys.global("currentWorkspace"),
        }),
        queryClient2.invalidateQueries({
          queryKey: storageKeys.global("openWorkspacePaths"),
        }),
        queryClient2.invalidateQueries({
          queryKey: storageKeys.global("lastActiveWorkspacePath"),
        }),
        queryClient2.invalidateQueries({
          queryKey: storageKeys.global("workspaceSessionTabs"),
        }),
      ]);
    } catch (refreshError) {
      const message2 =
        refreshError instanceof Error
          ? refreshError.message
          : String(refreshError);
      void window.hilo?.logger?.error?.(
        `[storage] Failed to refresh global storage cache after migration: ${message2}`,
        "storage",
      );
    }
  }, [queryClient2]);
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
      const message2 =
        refreshError instanceof Error
          ? refreshError.message
          : String(refreshError);
      void window.hilo?.logger?.error?.(
        `[storage] Failed to refresh data-directory status after migration: ${message2}`,
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
        const message2 =
          closeError instanceof Error ? closeError.message : String(closeError);
        void window.hilo?.logger?.error?.(
          `[storage] Failed to close open workspace from settings: ${message2}`,
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
        (path2) => !nextStatus.openWorkspacePaths.includes(path2),
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
        dedupedToast.warning(t2("settings.storage.closeIdleProjectsBlocked"));
      }
    } catch (closeError) {
      const message2 =
        closeError instanceof Error ? closeError.message : String(closeError);
      void window.hilo?.logger?.error?.(
        `[storage] Failed to close idle workspaces from settings: ${message2}`,
        "storage",
      );
      dedupedToast.error(t2("settings.storage.closeIdleProjectsFailed"));
    } finally {
      setClosingIdleWorkspaces(false);
    }
  }, [
    closingIdleWorkspaces,
    closingWorkspacePath,
    refreshGlobalStorageCache,
    refreshStatus,
    t2,
  ]);
  const applyPendingMigration = reactExports.useCallback(async () => {
    if (!pendingMigration) return;
    setMigrating(true);
    setError(null);
    setMigrationFailure(null);
    setCleanupDeferred(false);
    const recoveryMode = recoveryModeForPending(pendingMigration.mode);
    try {
      const service2 = getDataDirectoryMainService();
      const result =
        pendingMigration.mode === "reset"
          ? await service2.reset()
          : pendingMigration.mode === "residue"
            ? await service2.recoverDefaultStorageResidue()
            : await service2.apply(pendingMigration.targetPath);
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
      const result = await platform2.fs.showOpenDialog?.({
        directory: true,
        title: t2("settings.storage.selectDirectory"),
      });
      if (!result?.length) return;
      const selected2 = result[0];
      setValidating(true);
      const service2 = getDataDirectoryMainService();
      const validation = await withIpcTimeout(
        service2.validate(selected2),
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
        selected2,
        currentStatus.defaultDirectory,
        platform2.app.os,
      );
      const targetIsConfigured = isSameDataDirectoryPath(
        selected2,
        currentStatus.configuredDirectory,
        platform2.app.os,
      );
      const recoveringUnavailable =
        currentStatus.state === "configured_location_unavailable";
      if (recoveringUnavailable) {
        const mode2 = targetIsDefault
          ? "reset"
          : targetIsConfigured
            ? "recover"
            : "relink";
        setPendingMigration({
          mode: mode2,
          sourcePath:
            mode2 === "recover"
              ? currentStatus.activeDirectory
              : currentStatus.configuredDirectory,
          targetPath: selected2,
          warning: validation.warning,
          sourceIsDefault:
            mode2 === "recover" ||
            isSameDataDirectoryPath(
              currentStatus.activeDirectory,
              currentStatus.defaultDirectory,
              platform2.app.os,
            ),
          targetIsDefault,
          recoveringUnavailable: mode2 === "reset",
        });
        return;
      }
      const estimate = await withIpcTimeout(
        service2.estimateMigrationSize(selected2),
        "estimateMigrationSize",
        ESTIMATE_IPC_TIMEOUT_MS,
      ).catch(() => void 0);
      setPendingMigration({
        mode: targetIsDefault ? "reset" : "apply",
        sourcePath: currentStatus.activeDirectory,
        targetPath: selected2,
        // A partial walk would understate the size; show "unknown" instead.
        totalBytes: estimate?.partial ? void 0 : estimate?.totalBytes,
        warning: validation.warning,
        sourceIsDefault: isSameDataDirectoryPath(
          currentStatus.activeDirectory,
          currentStatus.defaultDirectory,
          platform2.app.os,
        ),
        targetIsDefault,
        recoveringUnavailable: false,
      });
    } catch {
      setMigrationFailure(UNKNOWN_FAILURE);
    } finally {
      setValidating(false);
    }
  }, [clearOperationState, platform2.app.os, platform2.fs, refreshStatus, t2]);
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
            platform2.app.os,
          ),
        targetIsDefault: true,
        recoveringUnavailable,
      });
    } catch {
      setMigrationFailure(UNKNOWN_FAILURE);
    } finally {
      setValidating(false);
    }
  }, [clearOperationState, platform2.app.os, refreshStatus]);
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
          platform2.app.os,
        ) ||
        isSameDataDirectoryPath(
          currentStatus.configuredDirectory,
          currentStatus.defaultDirectory,
          platform2.app.os,
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
  }, [clearOperationState, platform2.app.os, refreshStatus]);
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
          platform2.app.os,
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
    platform2.app.os,
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
