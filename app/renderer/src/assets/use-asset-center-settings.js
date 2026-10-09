// use-asset-center-settings.js
import { reactExports, useQueryClient, useTranslation } from "../vendor.js";
import { getAssetCenterMainService } from "./split-shortcut-keys.js";

const ASSET_CENTER_ROOT_KEY = ["asset-center"];

function useMigrateErrorMessage() {
  const { t: t2 } = useTranslation();
  return reactExports.useCallback(
    (reasonCode) => {
      const key2 = {
        invalid_path: "settings.assetCenter.migrateReason.invalidPath",
        same_path: "settings.assetCenter.migrateReason.samePath",
        path_overlap: "settings.assetCenter.migrateReason.pathOverlap",
        source_mismatch: "settings.assetCenter.migrateReason.sourceMismatch",
        migration_in_progress:
          "settings.assetCenter.migrateReason.migrationInProgress",
        source_missing: "settings.assetCenter.migrateReason.sourceMissing",
        source_not_directory:
          "settings.assetCenter.migrateReason.sourceNotDirectory",
        destination_not_directory:
          "settings.assetCenter.migrateReason.destinationNotDirectory",
        destination_not_empty:
          "settings.assetCenter.migrateReason.destinationNotEmpty",
        destination_not_asset_center:
          "settings.assetCenter.migrateReason.destinationNotAssetCenter",
        insufficient_space:
          "settings.assetCenter.migrateReason.insufficientSpace",
        copy_failed: "settings.assetCenter.migrateReason.copyFailed",
        verification_failed:
          "settings.assetCenter.migrateReason.verificationFailed",
      };
      return reasonCode
        ? t2(key2[reasonCode])
        : t2("settings.assetCenter.migrateFailed");
    },
    [t2],
  );
}

export function useAssetCenterSettings() {
  const queryClient2 = useQueryClient();
  const migrateErrorMessage = useMigrateErrorMessage();
  const { t: t2 } = useTranslation();
  const [status, setStatus] = reactExports.useState(null);
  const [busy, setBusy] = reactExports.useState(false);
  const [needsRestart, setNeedsRestart] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [pendingSwitch, setPendingSwitch] = reactExports.useState(null);
  const [dialogError, setDialogError] = reactExports.useState(null);
  const toDisplayError = reactExports.useCallback(
    (err) => {
      const message2 = err instanceof Error ? err.message : String(err);
      const knownErrors = [
        "app_install_dir",
        "drive_root",
        "protected_dir",
        "not_writable",
        "invalid_path",
      ];
      if (message2.includes("data_directory_change_pending")) {
        return t2("settings.assetCenter.dataDirectoryChangePending");
      }
      const code2 = knownErrors.find((candidate) =>
        message2.includes(candidate),
      );
      return code2
        ? t2(`settings.storage.errors.${code2}`)
        : t2("settings.assetCenter.changeFailed");
    },
    [t2],
  );
  const refreshStatus = reactExports.useCallback(async () => {
    try {
      const next2 = await getAssetCenterMainService().getStatus();
      setStatus(next2);
      setNeedsRestart(next2.needsRestart);
    } catch (err) {
      setError(toDisplayError(err));
    }
  }, [toDisplayError]);
  reactExports.useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);
  const invalidate = reactExports.useCallback(() => {
    queryClient2.invalidateQueries({
      queryKey: ASSET_CENTER_ROOT_KEY,
    });
  }, [queryClient2]);
  const handleBrowse = reactExports.useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const service2 = getAssetCenterMainService();
      const picked = await service2.pickDirectory(
        t2("settings.assetCenter.selectDirectory"),
      );
      if (picked === null) return;
      const from2 = status?.directory;
      if (from2 && (await service2.isCurrentDirectory(picked))) return;
      const targetKind = await service2.inspectDirectory(picked);
      if (targetKind === "not_directory") {
        setError(t2("settings.assetCenter.targetNotDirectory"));
        return;
      }
      if (targetKind === "unavailable") {
        setError(t2("settings.assetCenter.targetUnavailable"));
        return;
      }
      if (targetKind === "unrelated_content") {
        setError(t2("settings.assetCenter.targetContainsOtherFiles"));
        return;
      }
      const offerMigrate =
        Boolean(status?.currentRootHasData || status?.currentRootUnavailable) &&
        Boolean(from2);
      if (offerMigrate && from2) {
        setDialogError(null);
        setPendingSwitch({
          mode: "browse",
          from: from2,
          to: picked,
          targetHasContent: targetKind === "asset_center",
          sourceUnavailable: status?.currentRootUnavailable ?? false,
        });
        return;
      }
      const result = await service2.setDirectory(picked);
      setNeedsRestart(result.needsRestart);
      await refreshStatus();
      invalidate();
    } catch (err) {
      setError(toDisplayError(err));
    } finally {
      setBusy(false);
    }
  }, [invalidate, refreshStatus, status, t2, toDisplayError]);
  const handleReset = reactExports.useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const from2 = status?.directory;
      const to = status?.defaultDirectory;
      const service2 = getAssetCenterMainService();
      const targetIsCurrent = to
        ? await service2.isCurrentDirectory(to)
        : false;
      const offerMigrate =
        Boolean(status?.currentRootHasData || status?.currentRootUnavailable) &&
        Boolean(from2) &&
        Boolean(to) &&
        !targetIsCurrent;
      if (offerMigrate && from2 && to) {
        const targetKind = await service2.inspectDirectory(to);
        if (
          targetKind === "not_directory" ||
          targetKind === "unrelated_content" ||
          targetKind === "unavailable"
        ) {
          setError(
            t2(
              targetKind === "not_directory"
                ? "settings.assetCenter.targetNotDirectory"
                : targetKind === "unavailable"
                  ? "settings.assetCenter.targetUnavailable"
                  : "settings.assetCenter.targetContainsOtherFiles",
            ),
          );
          return;
        }
        setDialogError(null);
        setPendingSwitch({
          mode: "reset",
          from: from2,
          to,
          targetHasContent: targetKind === "asset_center",
          sourceUnavailable: status?.currentRootUnavailable ?? false,
        });
        return;
      }
      const result = await service2.resetToDefault();
      setNeedsRestart(result.needsRestart);
      await refreshStatus();
      invalidate();
    } catch (err) {
      setError(toDisplayError(err));
    } finally {
      setBusy(false);
    }
  }, [invalidate, refreshStatus, status, t2, toDisplayError]);
  const applyPendingSwitch = reactExports.useCallback(
    async (pending2) => {
      if (pending2.mode === "reset") {
        const result = await getAssetCenterMainService().resetToDefault();
        setNeedsRestart(result.needsRestart);
      } else {
        const result = await getAssetCenterMainService().setDirectory(
          pending2.to,
        );
        setNeedsRestart(result.needsRestart);
      }
      await refreshStatus();
      invalidate();
    },
    [invalidate, refreshStatus],
  );
  const confirmMigrate = reactExports.useCallback(async () => {
    if (!pendingSwitch) return;
    const pending2 = pendingSwitch;
    if (pending2.sourceUnavailable) {
      setDialogError(t2("settings.assetCenter.sourceUnavailableWarning"));
      return;
    }
    setBusy(true);
    setDialogError(null);
    try {
      const result = await getAssetCenterMainService().migrateAndSwitch(
        pending2.mode === "reset"
          ? {
              mode: "default",
              overwrite: pending2.targetHasContent,
            }
          : {
              mode: "custom",
              targetDirectory: pending2.to,
              overwrite: pending2.targetHasContent,
            },
      );
      if (!result.migration.success) {
        setDialogError(migrateErrorMessage(result.migration.reasonCode));
        return;
      }
      setNeedsRestart(result.needsRestart ?? false);
      await refreshStatus();
      invalidate();
      setPendingSwitch(null);
    } catch (err) {
      setDialogError(toDisplayError(err));
    } finally {
      setBusy(false);
    }
  }, [
    invalidate,
    migrateErrorMessage,
    pendingSwitch,
    refreshStatus,
    t2,
    toDisplayError,
  ]);
  const confirmSwitchOnly = reactExports.useCallback(async () => {
    if (!pendingSwitch) return;
    const pending2 = pendingSwitch;
    setBusy(true);
    setDialogError(null);
    try {
      await applyPendingSwitch(pending2);
      setPendingSwitch(null);
    } catch (err) {
      setDialogError(toDisplayError(err));
    } finally {
      setBusy(false);
    }
  }, [applyPendingSwitch, pendingSwitch, toDisplayError]);
  const cancelSwitch = reactExports.useCallback(() => {
    setPendingSwitch(null);
    setDialogError(null);
  }, []);
  return {
    status,
    busy,
    needsRestart,
    error,
    handleBrowse,
    handleReset,
    pendingSwitch,
    dialogError,
    confirmMigrate,
    confirmSwitchOnly,
    cancelSwitch,
  };
}
