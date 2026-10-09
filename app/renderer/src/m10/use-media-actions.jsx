// use-media-actions.jsx
import { useTranslation, reactExports, useMutation, dedupedToast, AlertTriangle, useQuery, useQueryClient, usePlatform, ArrowRight, Loader2, ShieldAlert, FolderInput, AlertCircle, API_PATHS } from "../vendor.js";
import { ASSETS_QUERY_KEY, refreshAssetIndex, refreshFileContent, FILE_CONTENT_QUERY_KEY } from "../m15/apply-asset-change.jsx";
import { Folder } from "../m15/parse-item.jsx";
import { folderNameFromPath, useGatewayFetch, useGatewayScopeKey } from "../m15/use-resizable-width.js";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  Button$1,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { SettingGroup, SettingRow } from "../m09/auth-provider.jsx";
import { LocalFolderIcon } from "../m08/browser-inspiration-urls.jsx";
import { getErrorMessage$1, isPathAccessError } from "../m08/instantiation-service.js";
import {
  optimisticallyRemoveAssets,
  rollbackAssetListSnapshot,
} from "../m09/error-fallback-ui.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { getDesktopSettingsMainService } from "./delete-account-confirm-dialog.jsx";
import { formatBytes$4, useDataDirectory } from "./use-data-directory.js";
function DataDirectoryMigrateDialog({ pending: pending2, busy, failure, onConfirm, onCancel }) {
  const { t: t2 } = useTranslation();
  const title =
    pending2?.mode === "recover"
      ? t2("settings.storage.confirm.recoveryTitle")
      : pending2?.mode === "residue"
        ? t2("settings.storage.confirm.residueTitle")
        : pending2?.recoveringUnavailable
          ? t2("settings.storage.confirm.recoverTitle")
          : pending2?.mode === "relink"
            ? t2("settings.storage.confirm.relinkTitle")
            : t2("settings.storage.confirm.title");
  const description =
    pending2?.mode === "recover"
      ? t2("settings.storage.confirm.recoveryDescription")
      : pending2?.mode === "residue"
        ? t2("settings.storage.confirm.residueDescription")
        : pending2?.recoveringUnavailable
          ? t2("settings.storage.confirm.recoverDescription")
          : pending2?.mode === "relink"
            ? t2("settings.storage.confirm.relinkDescription")
            : pending2?.totalBytes === void 0
              ? t2("settings.storage.confirm.descriptionUnknownSize")
              : t2("settings.storage.confirm.description", {
                  size: formatBytes$4(pending2.totalBytes),
                });
  const safetyNote =
    pending2?.mode === "recover"
      ? t2("settings.storage.confirm.recoverySafetyNote")
      : pending2?.mode === "residue"
        ? t2("settings.storage.confirm.residueSafetyNote")
        : pending2?.recoveringUnavailable
          ? t2("settings.storage.confirm.recoverSafetyNote")
          : pending2?.mode === "relink"
            ? t2("settings.storage.confirm.relinkSafetyNote")
            : t2("settings.storage.confirm.safetyNote");
  const action =
    pending2?.mode === "recover"
      ? t2("settings.storage.confirm.recoveryAction")
      : pending2?.mode === "residue"
        ? t2("settings.storage.confirm.residueAction")
        : pending2?.recoveringUnavailable
          ? t2("settings.storage.confirm.recoverAction")
          : pending2?.mode === "relink"
            ? t2("settings.storage.confirm.relinkAction")
            : t2("settings.storage.confirm.startMigration");
  return (
    <AlertDialog open={pending2 !== null} onOpenChange={(open) => !open && !busy && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {pending2 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 overflow-hidden rounded-sm border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <span className="min-w-0 flex-1 truncate" title={pending2.sourcePath}>
                {pending2.sourceIsDefault
                  ? t2("settings.storage.systemDefaultLocation")
                  : pending2.sourcePath}
              </span>
              <ArrowRight size={14} strokeWidth={1.5} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-foreground" title={pending2.targetPath}>
                {pending2.targetIsDefault
                  ? t2("settings.storage.systemDefaultLocation")
                  : pending2.targetPath}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{safetyNote}</p>
          </div>
        )}
        {pending2?.warning && !busy && (
          <div className="flex items-start gap-2 rounded-sm border border-warning/50 bg-warning/10 px-3 py-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-xs text-warning">
              {t2(`settings.storage.warnings.${pending2.warning}`)}
            </p>
          </div>
        )}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
            {t2("settings.storage.migrateInProgress")}
          </div>
        )}
        {failure && !busy && (
          <div className="space-y-1 rounded-sm border border-destructive/50 bg-destructive/10 px-3 py-2">
            <div className="flex items-start gap-2">
              <ShieldAlert size={14} className="mt-0.5 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">
                {t2(`settings.storage.migrationErrors.${failure.code}`)}
              </p>
            </div>
            <p className="pl-5 text-xs text-muted-foreground">
              {t2("settings.storage.migrationErrors.sourcePreserved")}
              {failure.diagnosticId
                ? ` ${t2("settings.storage.migrationErrors.diagnosticId", {
                    id: failure.diagnosticId,
                  })}`
                : ""}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button$1
            onClick={onConfirm}
            disabled={busy}
            className="h-9 w-full justify-start gap-2"
            data-action-ui-id="settings-storage-migrate-confirm"
          >
            {busy ? (
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <FolderInput size={16} strokeWidth={1.5} />
            )}
            {failure ? t2("settings.storage.confirm.retry") : action}
          </Button$1>
          <Button$1
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
            className="h-9 w-full justify-start font-normal text-muted-foreground"
          >
            {t2("common.cancel")}
          </Button$1>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function RestartBanner({ message: message2 }) {
  const { t: t2 } = useTranslation();
  const handleRelaunch = reactExports.useCallback(() => {
    void getDesktopSettingsMainService().relaunch();
  }, []);
  return (
    <div className="mt-2 flex items-center gap-2 rounded-sm border border-border bg-muted/50 px-3 py-2">
      <AlertCircle size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
      <p className="flex-1 text-xs text-muted-foreground">
        {message2 ?? t2("settings.requiresRestart")}
      </p>
      <Button$1
        variant="outline"
        size="sm"
        className="h-6 text-xs font-normal"
        onClick={handleRelaunch}
      >
        {t2("settings.restartNow")}
      </Button$1>
    </div>
  );
}
const WORKSPACE_STATUS_KEYS = {
  cold: "settings.storage.projectNotStarted",
  starting: "settings.storage.projectOpening",
  "gateway-ready": "settings.storage.projectOpening",
  bound: "settings.storage.projectReady",
  background: "settings.storage.projectReady",
  suspending: "settings.storage.projectClosing",
  suspended: "settings.storage.projectPaused",
  resuming: "settings.storage.projectOpening",
  failed: "settings.storage.projectFailed",
  stopping: "settings.storage.projectClosing",
  stopped: "settings.storage.projectPaused",
};
export function DataDirectorySettings() {
  const { t: t2 } = useTranslation();
  const {
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
    busy,
    migrating,
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
  } = useDataDirectory();
  const busyLabel = migrating
    ? t2("settings.storage.migrating")
    : t2("settings.storage.validating");
  const idleWorkspacePaths = workspaceStatuses.filter(
    (entry) => entry.idleClose.allowed && openWorkspacePaths.includes(entry.workspaceId),
  );
  const conflictedWorkspaceNames = recoverySummary?.conflictedWorkspaceNames ?? [];
  return (
    <SettingGroup>
      <div className="@container">
        <SettingRow
          className="flex-col items-stretch gap-3 @lg:flex-row @lg:items-center"
          label={t2("settings.storage.dataDirectory")}
          description={t2("settings.storage.dataDirectoryDesc")}
        >
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button$1
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-normal"
              onClick={() => void handleBrowse()}
              disabled={busy || needsRestart}
              data-action-ui-id="settings-storage-browse"
            >
              {busy ? (
                <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
              ) : (
                <LocalFolderIcon />
              )}
              {busy ? busyLabel : t2("settings.storage.browse")}
            </Button$1>
            {dataDir && (
              <Button$1
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-normal text-muted-foreground"
                onClick={() => void handleReset()}
                disabled={busy || needsRestart}
              >
                {configuredLocationUnavailable
                  ? t2("settings.storage.confirm.recoverAction")
                  : t2("settings.storage.reset")}
              </Button$1>
            )}
          </div>
        </SettingRow>
      </div>
      {error && (
        <div className="flex items-start gap-2 rounded-sm border border-destructive/50 bg-destructive/10 px-3 py-2">
          <ShieldAlert size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">{t2(`settings.storage.errors.${error}`)}</p>
        </div>
      )}
      {migrationFailure && !pendingMigration && (
        <div className="flex items-start gap-2 rounded-sm border border-destructive/50 bg-destructive/10 px-3 py-2">
          <ShieldAlert size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">
            {t2(`settings.storage.migrationErrors.${migrationFailure.code}`)}
          </p>
        </div>
      )}
      {openWorkspacePaths.length > 0 && (
        <div
          className="space-y-1.5 rounded-sm border border-border bg-muted/30 px-3 py-2"
          data-action-ui-id="settings-storage-open-projects"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-xs text-muted-foreground">{t2("settings.storage.openProjects")}</p>
            {idleWorkspacePaths.length > 1 && (
              <Button$1
                variant="ghost"
                size="sm"
                className="h-6 shrink-0 text-xs font-normal text-muted-foreground"
                disabled={busy || needsRestart || closingWorkspacePath !== null}
                loading={closingIdleWorkspaces}
                aria-busy={closingIdleWorkspaces}
                onClick={() => void handleCloseIdleWorkspaces()}
                data-action-ui-id="settings-storage-close-idle-projects"
              >
                {t2("settings.storage.closeIdleProjects")}
              </Button$1>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t2("settings.storage.closeIdleProjectsHint")}
          </p>
          <ul className="space-y-1">
            {openWorkspacePaths.map((folderPath) => {
              const status = workspaceStatuses.find((entry) => entry.workspaceId === folderPath);
              const statusKey = !status
                ? "settings.storage.projectUnknown"
                : !status.idleClose.allowed && status.idleClose.reason === "unsaved"
                  ? "settings.storage.projectUnsaved"
                  : WORKSPACE_STATUS_KEYS[status.lifecycle];
              const blockedReason =
                status && !status.idleClose.allowed
                  ? t2(`settings.storage.idleCloseReasons.${status.idleClose.reason}`)
                  : void 0;
              return (
                <li key={folderPath} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="min-w-0 truncate text-xs text-foreground" title={folderPath}>
                      {folderNameFromPath(folderPath)}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground" title={blockedReason}>
                      {t2(statusKey)}
                    </span>
                  </span>
                  <Button$1
                    variant="ghost"
                    size="sm"
                    className="h-6 shrink-0 text-xs font-normal text-muted-foreground"
                    disabled={
                      busy || needsRestart || closingWorkspacePath !== null || closingIdleWorkspaces
                    }
                    loading={closingWorkspacePath === folderPath}
                    aria-busy={closingWorkspacePath === folderPath}
                    onClick={() => void handleCloseOpenWorkspace(folderPath)}
                    data-action-ui-id="settings-storage-close-project"
                  >
                    {t2("settings.storage.closeProject")}
                  </Button$1>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {configuredLocationUnavailable && (
        <div
          className="space-y-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2"
          data-action-ui-id="settings-storage-unavailable-recovery"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-warning" />
            <div className="min-w-0 space-y-1">
              <p className="text-xs text-warning">
                {t2("settings.storage.configuredLocationUnavailable")}
              </p>
              {openWorkspaceCount > 0 && (
                <p className="text-xs text-warning">
                  {t2("settings.storage.closeProjectsBeforeRecover")}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <Button$1
              variant="outline"
              size="sm"
              className="h-7 text-xs font-normal"
              disabled={busy || needsRestart || openWorkspaceCount > 0}
              onClick={() => void handleRecoverConfigured()}
              data-action-ui-id="settings-storage-recover"
            >
              {t2("settings.storage.recover")}
            </Button$1>
          </div>
        </div>
      )}
      {residue?.available && (
        <div
          className="space-y-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2"
          data-action-ui-id="settings-storage-default-residue"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-warning" />
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-warning">
                {t2("settings.storage.defaultResidueTitle")}
              </p>
              <p className="text-xs text-warning">
                {t2("settings.storage.defaultResidueDescription", {
                  projects: residue.projectEntryCount,
                  outputs: residue.outputEntryCount,
                })}
              </p>
              <p className="text-xs text-warning">{t2("settings.storage.defaultResidueSafety")}</p>
              {openWorkspaceCount > 0 && (
                <p className="text-xs text-warning">
                  {t2("settings.storage.closeProjectsBeforeRecover")}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <Button$1
              variant="outline"
              size="sm"
              className="h-7 text-xs font-normal"
              disabled={busy || needsRestart || openWorkspaceCount > 0}
              onClick={() => void handleRecoverResidue()}
              data-action-ui-id="settings-storage-recover-residue"
            >
              {t2("settings.storage.recoverResidue")}
            </Button$1>
          </div>
        </div>
      )}
      {recoverySummary && (
        <div className="space-y-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <p>
            {t2(
              recoverySummary.mode === "default_residue_merge"
                ? "settings.storage.residueRecoveryComplete"
                : "settings.storage.recoveryComplete",
              {
                copied: recoverySummary.copiedWorkspaceCount,
                conflicts: recoverySummary.conflictCount,
              },
            )}
          </p>
          {conflictedWorkspaceNames.length > 0 && (
            <p title={conflictedWorkspaceNames.join(", ")}>
              {t2("settings.storage.recoveryConflictNames", {
                names: conflictedWorkspaceNames.join(", "),
              })}
            </p>
          )}
        </div>
      )}
      {configuredDirectory && (
        <div className="space-y-1.5 rounded-sm border border-border bg-muted/30 px-3 py-2">
          {needsRestart && activeDirectory !== configuredDirectory && (
            <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
              <span className="text-muted-foreground">
                {t2("settings.storage.currentLocation")}
              </span>
              <span className="truncate text-foreground" title={activeDirectory}>
                {activeDirectoryIsDefault
                  ? t2("settings.storage.systemDefaultLocation")
                  : activeDirectory}
              </span>
              <span className="text-muted-foreground">
                {t2("settings.storage.locationAfterRestart")}
              </span>
              <span className="truncate text-foreground" title={configuredDirectory}>
                {dataDir ? configuredDirectory : t2("settings.storage.systemDefaultLocation")}
              </span>
            </div>
          )}
          {!needsRestart && !configuredLocationUnavailable && (
            <div className="flex items-center gap-2">
              <Folder size={12} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
              <p className="truncate text-xs text-muted-foreground">
                {dataDir ? configuredDirectory : t2("settings.storage.systemDefaultLocation")}
              </p>
            </div>
          )}
          {configuredLocationUnavailable && (
            <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
              <span className="text-muted-foreground">
                {t2("settings.storage.temporaryLocation")}
              </span>
              <span className="truncate text-foreground" title={activeDirectory}>
                {t2("settings.storage.systemDefaultLocation")}
              </span>
              <span className="text-muted-foreground">
                {t2("settings.storage.unavailableLocation")}
              </span>
              <span className="truncate text-foreground" title={configuredDirectory}>
                {configuredDirectory}
              </span>
            </div>
          )}
        </div>
      )}
      {cleanupDeferred && (
        <div className="flex items-start gap-2 rounded-sm border border-warning/50 bg-warning/10 px-3 py-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
          <p className="text-xs text-warning">{t2("settings.storage.cleanupDeferred")}</p>
        </div>
      )}
      {needsRestart && (
        <RestartBanner message={t2("settings.storage.restartRequiredDescription")} />
      )}
      {configuredLocationUnavailable && (
        <RestartBanner message={t2("settings.storage.reconnectThenRestart")} />
      )}
      <DataDirectoryMigrateDialog
        pending={pendingMigration}
        busy={migrating}
        failure={migrationFailure}
        onConfirm={handleConfirmMigration}
        onCancel={handleCancelMigration}
      />
    </SettingGroup>
  );
}
async function fetchAssets(gatewayFetch2) {
  const res = await gatewayFetch2(API_PATHS.allAssets);
  const data2 = await res.json();
  return [...data2.assets];
}
async function renameAsset(gatewayFetch2, params) {
  await gatewayFetch2(API_PATHS.rename, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: params.path,
      new_name: params.newName,
    }),
  });
}
async function removeAssets(gatewayFetch2, params) {
  await gatewayFetch2(API_PATHS.deleteFiles, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paths: params.paths,
    }),
  });
}
async function moveAssets(gatewayFetch2, params) {
  await gatewayFetch2(API_PATHS.move, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paths: params.paths,
      target: params.target,
    }),
  });
}
async function readContent(gatewayFetch2, params) {
  const res = await gatewayFetch2(API_PATHS.readContent(params.path));
  const data2 = await res.json();
  return data2.content;
}
async function writeContent(gatewayFetch2, params) {
  const res = await gatewayFetch2(API_PATHS.writeContent, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: params.path,
      content: params.content,
    }),
  });
  return await res.json();
}
async function mergeCandidateAsset(gatewayFetch2, params) {
  await gatewayFetch2(API_PATHS.mergeMissingCandidate(params.id), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      candidateId: params.candidateId,
    }),
  });
}
async function removeMissingAsset(gatewayFetch2, params) {
  await gatewayFetch2(API_PATHS.removeMissing(params.id), {
    method: "POST",
  });
}
async function manualLocateAsset(gatewayFetch2, params) {
  await gatewayFetch2(API_PATHS.locateMissing(params.id), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      newPath: params.newPath,
    }),
  });
}
async function duplicateFiles(gatewayFetch2, params) {
  const res = await gatewayFetch2(API_PATHS.duplicateFiles, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paths: params.paths,
    }),
  });
  return await res.json();
}
export function useAssets(options) {
  const queryClient2 = useQueryClient();
  const { t: t2 } = useTranslation();
  const gatewayFetch2 = useGatewayFetch();
  const gatewayScopeKey = useGatewayScopeKey();
  const contentPath = options?.contentPath;
  const enabled = options?.enabled ?? true;
  const {
    data: data2,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...ASSETS_QUERY_KEY, gatewayScopeKey],
    queryFn: () => fetchAssets(gatewayFetch2),
    staleTime: Number.POSITIVE_INFINITY,
    enabled,
  });
  const assets = reactExports.useMemo(() => data2 ?? [], [data2]);
  const refresh = reactExports.useCallback(async () => {
    await refreshAssetIndex({
      qc: queryClient2,
      gatewayScopeKey,
    });
  }, [gatewayScopeKey, queryClient2]);
  const renameMutation = useMutation({
    mutationFn: (params) => renameAsset(gatewayFetch2, params),
  });
  const removeMutation = useMutation({
    mutationFn: (params) => removeAssets(gatewayFetch2, params),
    // Optimistic UI: hide the rows immediately. The chokidar watcher in
    // @hilo/assets has a RENAME_GRACE_MS window before it fires `unlink`
    // (so it can promote unlink+add pairs into renames without losing
    // asset_id). That guarantees correctness for moves but adds 2-3s of
    // perceived latency on plain deletes. We close that gap client-side
    // and let the eventual `asset_changed` WS event reconcile.
    onMutate: async (params) => {
      const snapshot2 = await optimisticallyRemoveAssets({
        qc: queryClient2,
        gatewayScopeKey,
        paths: params.paths,
      });
      return {
        snapshot: snapshot2,
      };
    },
    onError: (_err, _params, context) => {
      rollbackAssetListSnapshot({
        qc: queryClient2,
        snapshot: context?.snapshot,
      });
    },
  });
  const moveMutation = useMutation({
    mutationFn: (params) => moveAssets(gatewayFetch2, params),
  });
  const writeContentMutation = useMutation({
    mutationFn: (params) => writeContent(gatewayFetch2, params),
    onSuccess: (data22, variables) => {
      void refreshFileContent({
        qc: queryClient2,
        gatewayScopeKey,
        path: variables.path,
      });
      if (data22.enrollError) {
        dedupedToast.warning(
          t2("assets.uploadEnrollFailed", {
            error: data22.enrollError,
          }),
        );
      }
    },
  });
  const mergeCandidateMutation = useMutation({
    mutationFn: (params) => mergeCandidateAsset(gatewayFetch2, params),
  });
  const removeMissingMutation = useMutation({
    mutationFn: (params) => removeMissingAsset(gatewayFetch2, params),
  });
  const manualLocateMutation = useMutation({
    mutationFn: (params) => manualLocateAsset(gatewayFetch2, params),
  });
  const duplicateMutation = useMutation({
    mutationFn: (params) => duplicateFiles(gatewayFetch2, params),
    onSuccess: () =>
      void refreshAssetIndex({
        qc: queryClient2,
        gatewayScopeKey,
      }),
  });
  const contentEnabled = contentPath != null && contentPath.length > 0;
  const {
    data: fileContent,
    isLoading: contentLoading,
    error: contentError,
  } = useQuery({
    queryKey: [...FILE_CONTENT_QUERY_KEY, gatewayScopeKey, contentPath],
    queryFn: () =>
      readContent(gatewayFetch2, {
        path: contentPath,
      }),
    enabled: contentEnabled,
    staleTime: Number.POSITIVE_INFINITY,
  });
  return {
    assets,
    loading: isLoading,
    error: error ?? null,
    refresh,
    rename: renameMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    move: moveMutation.mutateAsync,
    readContent: (params) => readContent(gatewayFetch2, params),
    writeContent: writeContentMutation.mutateAsync,
    mergeCandidate: mergeCandidateMutation.mutateAsync,
    removeMissing: removeMissingMutation.mutateAsync,
    manualLocate: manualLocateMutation.mutateAsync,
    duplicate: duplicateMutation.mutateAsync,
    fileContent,
    contentLoading: contentEnabled ? contentLoading : false,
    contentError: contentError ?? null,
  };
}
const WINDOWS_DRIVE_ABSOLUTE_PATH_RE = /^[a-z]:[\\/]/i;
export function isAbsoluteLocalFilePath(value) {
  return (
    value.startsWith("/") || value.startsWith("\\\\") || WINDOWS_DRIVE_ABSOLUTE_PATH_RE.test(value)
  );
}
const INVALID_FOLDER_CHARACTERS = /[<>:"/\\|?*]/g;
const TRAILING_DOTS_OR_SPACES = /[. ]+$/g;
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const MAX_FOLDER_NAME_LENGTH = 120;
function replaceInvalidFolderCharacters(value) {
  return Array.from(value, (character) => ((character.codePointAt(0) ?? 0) <= 31 ? "_" : character))
    .join("")
    .replace(INVALID_FOLDER_CHARACTERS, "_");
}
function sanitizeDownloadFolderName(name2, fallback = "download") {
  const normalizedFallback =
    replaceInvalidFolderCharacters(fallback.normalize("NFC"))
      .replace(TRAILING_DOTS_OR_SPACES, "")
      .trim() || "download";
  let value = replaceInvalidFolderCharacters(name2.normalize("NFC"))
    .replace(TRAILING_DOTS_OR_SPACES, "")
    .trim()
    .slice(0, MAX_FOLDER_NAME_LENGTH)
    .replace(TRAILING_DOTS_OR_SPACES, "");
  if (!value || value === "." || value === "..") value = normalizedFallback;
  if (WINDOWS_RESERVED_NAME.test(value)) value = `_${value}`;
  return value;
}
function createUniqueDownloadFolderNames(names) {
  const result = new Map();
  const reserved = new Set();
  for (const name2 of names) {
    if (result.has(name2)) continue;
    const base2 = sanitizeDownloadFolderName(name2);
    let candidate = base2;
    for (let index2 = 1; reserved.has(candidate.toLowerCase()); index2 += 1) {
      candidate = `${base2} (${index2})`;
    }
    reserved.add(candidate.toLowerCase());
    result.set(name2, candidate);
  }
  return result;
}
const log = window.hilo?.logger;
function getFileName$2(pathOrUrl) {
  const raw2 = pathOrUrl.split(/[/\\]/).pop() ?? "file";
  return raw2.split("?")[0] ?? raw2;
}
function getExtension(name2) {
  const dot2 = name2.lastIndexOf(".");
  return dot2 >= 0 ? name2.slice(dot2 + 1).toLowerCase() : "";
}
function isImageExtension(ext) {
  return ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg", "ico", "tiff"].includes(ext);
}
function joinTargetPath(directory, fileName) {
  const separator = directory.includes("\\") && !directory.includes("/") ? "\\" : "/";
  return `${directory.replace(/[\\/]+$/, "")}${separator}${fileName}`;
}
function splitFileName(fileName) {
  const dot2 = fileName.lastIndexOf(".");
  if (dot2 <= 0)
    return {
      stem: fileName,
      extension: "",
    };
  return {
    stem: fileName.slice(0, dot2),
    extension: fileName.slice(dot2),
  };
}
async function resolveAvailableTargetPath(directory, fileName, exists, reservedTargets) {
  const { stem, extension: extension2 } = splitFileName(fileName || "file");
  for (let index2 = 0; index2 < 1e3; index2 += 1) {
    const candidateName =
      index2 === 0 ? `${stem}${extension2}` : `${stem} (${index2})${extension2}`;
    const candidatePath = joinTargetPath(directory, candidateName);
    const reservationKey = candidatePath.toLowerCase();
    if (reservedTargets.has(reservationKey)) continue;
    if (await exists(candidatePath)) continue;
    reservedTargets.add(reservationKey);
    return candidatePath;
  }
  return joinTargetPath(directory, `${stem}-${Date.now()}${extension2}`);
}
async function resolveAvailableTargetDirectory(parentDirectory, folderName, exists) {
  const base2 = sanitizeDownloadFolderName(folderName);
  for (let index2 = 0; index2 < 1e3; index2 += 1) {
    const candidateName = index2 === 0 ? base2 : `${base2} (${index2})`;
    const candidatePath = joinTargetPath(parentDirectory, candidateName);
    if (!(await exists(candidatePath))) return candidatePath;
  }
  return joinTargetPath(parentDirectory, `${base2}-${Date.now()}`);
}
export function useMediaActions() {
  const platform2 = usePlatform();
  const { t: t2 } = useTranslation();
  const copyImage = reactExports.useCallback(
    async (pathOrUrl) => {
      try {
        if (isAbsoluteLocalFilePath(pathOrUrl)) {
          await platform2.clipboard.writeImage?.(pathOrUrl);
        } else {
          const response = await fetch(pathOrUrl);
          const buffer = await response.arrayBuffer();
          await platform2.clipboard.writeImageData?.(buffer);
        }
        dedupedToast.success(t2("common.copied"));
      } catch (err) {
        log?.error(`[media-actions] copyImage failed: ${getErrorMessage$1(err)}`, "media-actions");
        dedupedToast.error(t2("common.copyFailed"));
      }
    },
    [platform2, t2],
  );
  const copyFile = reactExports.useCallback(
    async (filePath) => {
      try {
        await platform2.clipboard.writeFile?.(filePath);
        dedupedToast.success(t2("common.copied"));
      } catch (err) {
        log?.error(`[media-actions] copyFile failed: ${getErrorMessage$1(err)}`, "media-actions");
        dedupedToast.error(t2("common.copyFailed"));
      }
    },
    [platform2, t2],
  );
  const copyPath = reactExports.useCallback(
    async (path2) => {
      try {
        await platform2.clipboard.writeText(path2);
        dedupedToast.success(t2("fileExplorer.pathCopied"));
      } catch (err) {
        log?.error(`[media-actions] copyPath failed: ${getErrorMessage$1(err)}`, "media-actions");
        dedupedToast.error(t2("common.copyFailed"));
      }
    },
    [platform2, t2],
  );
  const saveAs = reactExports.useCallback(
    async (pathOrUrl, defaultName) => {
      try {
        const fileName = defaultName ?? getFileName$2(pathOrUrl);
        const ext = getExtension(fileName);
        const targetPath = await platform2.fs.showSaveDialog?.({
          defaultPath: fileName,
          filters: ext
            ? [
                {
                  name: ext.toUpperCase(),
                  extensions: [ext],
                },
              ]
            : void 0,
        });
        if (!targetPath) return;
        if (isAbsoluteLocalFilePath(pathOrUrl)) {
          await platform2.fs.copy?.(pathOrUrl, targetPath, true);
        } else {
          const response = await fetch(pathOrUrl);
          if (!response.ok) {
            throw new Error(`Download failed: HTTP ${response.status}`);
          }
          const buffer = await response.arrayBuffer();
          await platform2.fs.writeBinaryFile?.(targetPath, buffer);
        }
        dedupedToast.success(t2("common.saved"));
      } catch (err) {
        const detail = getErrorMessage$1(err);
        log?.error(
          `[media-actions] saveAs failed: ${detail}, source=${pathOrUrl}`,
          "media-actions",
        );
        if (isPathAccessError(err)) {
          dedupedToast.error(t2("common.saveFailed"), {
            description: detail,
          });
        } else {
          dedupedToast.error(t2("common.saveFailed"));
        }
      }
    },
    [platform2, t2],
  );
  const saveManyAs = reactExports.useCallback(
    async (files, options = {}) => {
      const candidates2 = files.filter((file) => file.filePath);
      const totalCount = candidates2.length;
      const result = (status, savedCount, failedFiles, outputDirectory) => ({
        status,
        totalCount,
        savedCount,
        failedCount: failedFiles.length,
        failedFiles,
        outputDirectory,
      });
      const failAll = (reason) =>
        candidates2.map((file) => ({
          filePath: file.filePath,
          fileName: file.fileName ?? getFileName$2(file.filePath),
          folderName: file.folderName,
          reason,
        }));
      const failedFileDescription = (failedFiles) => {
        const visibleNames = failedFiles.slice(0, 3).map((file) => file.fileName);
        const remainingCount = failedFiles.length - visibleNames.length;
        return remainingCount > 0
          ? `${visibleNames.join(", ")} +${remainingCount}`
          : visibleNames.join(", ");
      };
      const emitProgress = (progress) => {
        try {
          options?.onProgress?.(progress);
        } catch (err) {
          log?.error(
            `[media-actions] saveManyAs progress callback failed: ${getErrorMessage$1(err)}`,
            "media-actions",
          );
        }
      };
      const retryAction = (failedFiles) => {
        const retryFiles = failedFiles.map(({ filePath, fileName, folderName }) => ({
          filePath,
          fileName,
          folderName,
        }));
        return {
          label: t2("common.retry"),
          onClick: () => {
            if (options.onRetry) {
              options.onRetry(retryFiles);
              return;
            }
            void saveManyAs(retryFiles, {
              rootFolderName: options.rootFolderName,
              dialogTitle: options.dialogTitle,
            });
          },
        };
      };
      if (totalCount === 0) return result("completed", 0, []);
      if (options?.signal?.aborted) return result("cancelled", 0, []);
      let targetDirectory;
      let createdRootDirectory = false;
      try {
        if (
          !platform2.fs.showOpenDialog ||
          !platform2.fs.copy ||
          !platform2.fs.exists ||
          !platform2.fs.mkdir
        ) {
          dedupedToast.error(t2("common.saveFailed"));
          return result("failed", 0, failAll("Batch file saving is not supported"));
        }
        const selected2 = await platform2.fs.showOpenDialog({
          title: options?.dialogTitle ?? t2("canvas.lightbox.selectDownloadFolder"),
          directory: true,
        });
        const selectedDirectory = selected2[0];
        if (!selectedDirectory) return result("cancelled", 0, []);
        if (options.signal?.aborted) return result("cancelled", 0, []);
        targetDirectory = options.rootFolderName
          ? await resolveAvailableTargetDirectory(
              selectedDirectory,
              options.rootFolderName,
              platform2.fs.exists,
            )
          : selectedDirectory;
        if (options.signal?.aborted) return result("cancelled", 0, []);
        if (options.rootFolderName) {
          await platform2.fs.mkdir(targetDirectory);
          createdRootDirectory = true;
        }
        const reservedTargets = new Set();
        const folderNames = createUniqueDownloadFolderNames(
          candidates2.flatMap((file) => (file.folderName ? [file.folderName] : [])),
        );
        const createdFolders = new Map();
        const successfulFolders = new Set();
        const failedFiles = [];
        let savedCount = 0;
        let processedCount = 0;
        emitProgress({
          failedCount: 0,
          processedCount: 0,
          savedCount: 0,
          totalCount,
        });
        for (const file of candidates2) {
          if (options.signal?.aborted) break;
          const fileName = file.fileName ?? getFileName$2(file.filePath);
          let safeFolderName;
          let attemptedTargetPath;
          try {
            safeFolderName = file.folderName ? folderNames.get(file.folderName) : void 0;
            const fileTargetDirectory = safeFolderName
              ? joinTargetPath(targetDirectory, safeFolderName)
              : targetDirectory;
            if (safeFolderName && !createdFolders.has(safeFolderName)) {
              await platform2.fs.mkdir(fileTargetDirectory);
              createdFolders.set(safeFolderName, fileTargetDirectory);
            }
            if (options.signal?.aborted) break;
            attemptedTargetPath = await resolveAvailableTargetPath(
              fileTargetDirectory,
              fileName,
              platform2.fs.exists,
              reservedTargets,
            );
            if (options.signal?.aborted) break;
            if (isAbsoluteLocalFilePath(file.filePath)) {
              await platform2.fs.copy(file.filePath, attemptedTargetPath, false);
            } else {
              if (!platform2.fs.writeBinaryFile) {
                throw new Error("Binary file writing is not supported");
              }
              const response = await fetch(file.filePath, {
                signal: options.signal,
              });
              if (!response.ok) {
                throw new Error(`Download failed: HTTP ${response.status}`);
              }
              const buffer = await response.arrayBuffer();
              if (options.signal?.aborted) break;
              await platform2.fs.writeBinaryFile(attemptedTargetPath, buffer);
            }
            savedCount += 1;
            if (safeFolderName) successfulFolders.add(safeFolderName);
          } catch (err) {
            if (options.signal?.aborted) {
              if (attemptedTargetPath && platform2.fs.delete) {
                try {
                  if (await platform2.fs.exists(attemptedTargetPath)) {
                    await platform2.fs.delete(attemptedTargetPath);
                  }
                } catch (cleanupError) {
                  log?.error(
                    `[media-actions] saveManyAs cancelled target cleanup failed: ${getErrorMessage$1(cleanupError)}`,
                    "media-actions",
                  );
                }
              }
              break;
            }
            const failure = {
              filePath: file.filePath,
              fileName,
              folderName: file.folderName,
              reason: getErrorMessage$1(err),
            };
            failedFiles.push(failure);
            log?.error(
              `[media-actions] saveManyAs item failed: ${failure.reason}, source=${file.filePath}`,
              "media-actions",
            );
            if (attemptedTargetPath && platform2.fs.delete) {
              try {
                if (await platform2.fs.exists(attemptedTargetPath)) {
                  await platform2.fs.delete(attemptedTargetPath);
                }
              } catch (cleanupError) {
                log?.error(
                  `[media-actions] saveManyAs failed target cleanup failed: ${getErrorMessage$1(cleanupError)}`,
                  "media-actions",
                );
              }
            }
          }
          processedCount += 1;
          emitProgress({
            currentFileName: fileName,
            failedCount: failedFiles.length,
            processedCount,
            savedCount,
            totalCount,
          });
        }
        if (createdRootDirectory && platform2.fs.delete) {
          try {
            if (savedCount === 0) {
              await platform2.fs.delete(targetDirectory);
              createdRootDirectory = false;
            } else {
              for (const [folderName, folderPath] of createdFolders) {
                if (!successfulFolders.has(folderName)) await platform2.fs.delete(folderPath);
              }
            }
          } catch (cleanupError) {
            log?.error(
              `[media-actions] saveManyAs empty directory cleanup failed: ${getErrorMessage$1(cleanupError)}`,
              "media-actions",
            );
          }
        }
        const cancelled = Boolean(options.signal?.aborted && processedCount < totalCount);
        if (cancelled) {
          dedupedToast.info(
            t2("canvas.lightbox.batchSaveCancelled", {
              count: savedCount,
            }),
          );
          return result(
            "cancelled",
            savedCount,
            failedFiles,
            createdRootDirectory ? targetDirectory : void 0,
          );
        }
        if (savedCount > 0 && failedFiles.length === 0) {
          dedupedToast.success(
            t2("canvas.lightbox.batchSaveSuccess", {
              count: savedCount,
            }),
          );
          return result("completed", savedCount, [], targetDirectory);
        } else if (savedCount > 0) {
          dedupedToast.error(
            t2("canvas.lightbox.batchSavePartial", {
              saved: savedCount,
              failed: failedFiles.length,
            }),
            {
              description: failedFileDescription(failedFiles),
              action: retryAction(failedFiles),
            },
          );
          return result("partial", savedCount, failedFiles, targetDirectory);
        } else {
          dedupedToast.error(t2("common.saveFailed"), {
            description: failedFileDescription(failedFiles),
            action: retryAction(failedFiles),
          });
          return result("failed", 0, failedFiles);
        }
      } catch (err) {
        const detail = getErrorMessage$1(err);
        log?.error(`[media-actions] saveManyAs failed: ${detail}`, "media-actions");
        const failedFiles = failAll(detail);
        dedupedToast.error(t2("common.saveFailed"), {
          action: retryAction(failedFiles),
        });
        if (createdRootDirectory && targetDirectory && platform2.fs.delete) {
          try {
            await platform2.fs.delete(targetDirectory);
          } catch (cleanupError) {
            log?.error(
              `[media-actions] saveManyAs root cleanup failed: ${getErrorMessage$1(cleanupError)}`,
              "media-actions",
            );
          }
        }
        return result("failed", 0, failedFiles);
      }
    },
    [platform2, t2],
  );
  const showInFolder = reactExports.useCallback(
    async (path2) => {
      try {
        await platform2.shell.showItemInFolder?.(path2);
      } catch (err) {
        log?.error(
          `[media-actions] showInFolder failed: ${getErrorMessage$1(err)}`,
          "media-actions",
        );
        dedupedToast.error(t2("fileExplorer.cannotOpenFolder"));
      }
    },
    [platform2, t2],
  );
  const openWithDefault = reactExports.useCallback(
    async (path2) => {
      try {
        if (platform2.shell.openPath) {
          await platform2.shell.openPath(path2);
          return;
        }
        dedupedToast.error(t2("fileExplorer.platformNotSupported"));
      } catch (err) {
        log?.error(
          `[media-actions] openWithDefault failed: ${getErrorMessage$1(err)}`,
          "media-actions",
        );
        dedupedToast.error(t2("fileExplorer.openFailed"));
      }
    },
    [platform2, t2],
  );
  const openWith = reactExports.useCallback(async (_path, _appPath) => {}, []);
  const pickAppAndOpen = reactExports.useCallback(async (_path) => {}, []);
  return {
    copyImage,
    copyFile,
    copyPath,
    saveAs,
    saveManyAs,
    showInFolder,
    openWithDefault,
    openWith,
    pickAppAndOpen,
    isLocalPath: isAbsoluteLocalFilePath,
    isImageExtension,
    getFileName: getFileName$2,
  };
}
