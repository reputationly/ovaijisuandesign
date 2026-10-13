// use-asset-center-settings.js
import { reactExports, useQueryClient, useTranslation } from "../vendor.js";
import { getAssetCenterMainService } from "./split-shortcut-keys.js";

const ASSET_CENTER_ROOT_KEY = ["asset-center"];

function useMigrateErrorMessage() {
  const { t: translate } = useTranslation();
  return reactExports.useCallback(
    (reasonCode) => {
      const key = {
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
        ? translate(key[reasonCode])
        : translate("settings.assetCenter.migrateFailed");
    },
    [translate],
  );
}

export function useAssetCenterSettings() {
  const queryClient = useQueryClient();
  const migrateErrorMessage = useMigrateErrorMessage();
  const { t: translate } = useTranslation();
  const [status, setStatus] = reactExports.useState(null);
  const [busy, setBusy] = reactExports.useState(false);
  const [needsRestart, setNeedsRestart] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [pendingSwitch, setPendingSwitch] = reactExports.useState(null);
  const [dialogError, setDialogError] = reactExports.useState(null);
  const toDisplayError = reactExports.useCallback(
    (err) => {
      const message = err instanceof Error ? err.message : String(err);
      const knownErrors = [
        "app_install_dir",
        "drive_root",
        "protected_dir",
        "not_writable",
        "invalid_path",
      ];
      if (message.includes("data_directory_change_pending")) {
        return translate("settings.assetCenter.dataDirectoryChangePending");
      }
      const code = knownErrors.find((candidate) =>
        message.includes(candidate),
      );
      return code
        ? translate(`settings.storage.errors.${code}`)
        : translate("settings.assetCenter.changeFailed");
    },
    [translate],
  );
  const refreshStatus = reactExports.useCallback(async () => {
    try {
      const next = await getAssetCenterMainService().getStatus();
      setStatus(next);
      setNeedsRestart(next.needsRestart);
    } catch (err) {
      setError(toDisplayError(err));
    }
  }, [toDisplayError]);
  reactExports.useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);
  const invalidate = reactExports.useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ASSET_CENTER_ROOT_KEY,
    });
  }, [queryClient]);
  const handleBrowse = reactExports.useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const service = getAssetCenterMainService();
      const picked = await service.pickDirectory(
        translate("settings.assetCenter.selectDirectory"),
      );
      if (picked === null) return;
      const from = status?.directory;
      if (from && (await service.isCurrentDirectory(picked))) return;
      const targetKind = await service.inspectDirectory(picked);
      if (targetKind === "not_directory") {
        setError(translate("settings.assetCenter.targetNotDirectory"));
        return;
      }
      if (targetKind === "unavailable") {
        setError(translate("settings.assetCenter.targetUnavailable"));
        return;
      }
      if (targetKind === "unrelated_content") {
        setError(translate("settings.assetCenter.targetContainsOtherFiles"));
        return;
      }
      const offerMigrate =
        Boolean(status?.currentRootHasData || status?.currentRootUnavailable) &&
        Boolean(from);
      if (offerMigrate && from) {
        setDialogError(null);
        setPendingSwitch({
          mode: "browse",
          from,
          to: picked,
          targetHasContent: targetKind === "asset_center",
          sourceUnavailable: status?.currentRootUnavailable ?? false,
        });
        return;
      }
      const result = await service.setDirectory(picked);
      setNeedsRestart(result.needsRestart);
      await refreshStatus();
      invalidate();
    } catch (err) {
      setError(toDisplayError(err));
    } finally {
      setBusy(false);
    }
  }, [invalidate, refreshStatus, status, translate, toDisplayError]);
  const handleReset = reactExports.useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const from = status?.directory;
      const to = status?.defaultDirectory;
      const service = getAssetCenterMainService();
      const targetIsCurrent = to
        ? await service.isCurrentDirectory(to)
        : false;
      const offerMigrate =
        Boolean(status?.currentRootHasData || status?.currentRootUnavailable) &&
        Boolean(from) &&
        Boolean(to) &&
        !targetIsCurrent;
      if (offerMigrate && from && to) {
        const targetKind = await service.inspectDirectory(to);
        if (
          targetKind === "not_directory" ||
          targetKind === "unrelated_content" ||
          targetKind === "unavailable"
        ) {
          setError(
            translate(
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
          from,
          to,
          targetHasContent: targetKind === "asset_center",
          sourceUnavailable: status?.currentRootUnavailable ?? false,
        });
        return;
      }
      const result = await service.resetToDefault();
      setNeedsRestart(result.needsRestart);
      await refreshStatus();
      invalidate();
    } catch (err) {
      setError(toDisplayError(err));
    } finally {
      setBusy(false);
    }
  }, [invalidate, refreshStatus, status, translate, toDisplayError]);
  const applyPendingSwitch = reactExports.useCallback(
    async (pending) => {
      if (pending.mode === "reset") {
        const result = await getAssetCenterMainService().resetToDefault();
        setNeedsRestart(result.needsRestart);
      } else {
        const result = await getAssetCenterMainService().setDirectory(
          pending.to,
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
    const pending = pendingSwitch;
    if (pending.sourceUnavailable) {
      setDialogError(translate("settings.assetCenter.sourceUnavailableWarning"));
      return;
    }
    setBusy(true);
    setDialogError(null);
    try {
      const result = await getAssetCenterMainService().migrateAndSwitch(
        pending.mode === "reset"
          ? {
              mode: "default",
              overwrite: pending.targetHasContent,
            }
          : {
              mode: "custom",
              targetDirectory: pending.to,
              overwrite: pending.targetHasContent,
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
    translate,
    toDisplayError,
  ]);
  const confirmSwitchOnly = reactExports.useCallback(async () => {
    if (!pendingSwitch) return;
    const pending = pendingSwitch;
    setBusy(true);
    setDialogError(null);
    try {
      await applyPendingSwitch(pending);
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
