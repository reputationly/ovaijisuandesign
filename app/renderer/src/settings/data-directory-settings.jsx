// data-directory-settings.jsx
import {
  AlertTriangle,
  ArrowRight,
  FolderInput,
  Loader2,
  ShieldAlert,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { AlertDialog, Button } from "../infra/dialog-content.jsx";
import {
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../infra/badge-variants.jsx";
import { RestartBanner } from "./restart-banner.jsx";
import { Folder } from "../media-editing/package.jsx";
import { folderNameFromPath } from "../generation/use-model-catalog-scope-key.js";
import { SettingGroup, SettingRow } from "./settings-select.jsx";
import { LocalFolderIcon } from "../workspace/home-service.jsx";
import { useDataDirectory } from "./use-data-directory.js";
function formatBytes(bytes2) {
  if (bytes2 === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.floor(Math.log(bytes2) / Math.log(1024));
  return `${(bytes2 / 1024 ** unitIndex).toFixed(1)} ${units[unitIndex]}`;
}
function DataDirectoryMigrateDialog({
  pending: pending2,
  busy,
  failure,
  onConfirm,
  onCancel,
}) {
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
                  size: formatBytes(pending2.totalBytes),
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
    <AlertDialog
      open={pending2 !== null}
      onOpenChange={(open) => !open && !busy && onCancel()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {pending2 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 overflow-hidden rounded-sm border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <span
                className="min-w-0 flex-1 truncate"
                title={pending2.sourcePath}
              >
                {pending2.sourceIsDefault
                  ? t2("settings.storage.systemDefaultLocation")
                  : pending2.sourcePath}
              </span>
              <ArrowRight size={14} strokeWidth={1.5} className="shrink-0" />
              <span
                className="min-w-0 flex-1 truncate text-foreground"
                title={pending2.targetPath}
              >
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
              <ShieldAlert
                size={14}
                className="mt-0.5 shrink-0 text-destructive"
              />
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
          <Button
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
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
            className="h-9 w-full justify-start font-normal text-muted-foreground"
          >
            {t2("common.cancel")}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
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
    (entry) =>
      entry.idleClose.allowed && openWorkspacePaths.includes(entry.workspaceId),
  );
  const conflictedWorkspaceNames =
    recoverySummary?.conflictedWorkspaceNames ?? [];
  return (
    <SettingGroup>
      <div className="@container">
        <SettingRow
          className="flex-col items-stretch gap-3 @lg:flex-row @lg:items-center"
          label={t2("settings.storage.dataDirectory")}
          description={t2("settings.storage.dataDirectoryDesc")}
        >
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
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
            </Button>
            {dataDir && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-normal text-muted-foreground"
                onClick={() => void handleReset()}
                disabled={busy || needsRestart}
              >
                {configuredLocationUnavailable
                  ? t2("settings.storage.confirm.recoverAction")
                  : t2("settings.storage.reset")}
              </Button>
            )}
          </div>
        </SettingRow>
      </div>
      {error && (
        <div className="flex items-start gap-2 rounded-sm border border-destructive/50 bg-destructive/10 px-3 py-2">
          <ShieldAlert
            size={14}
            strokeWidth={1.5}
            className="mt-0.5 shrink-0 text-destructive"
          />
          <p className="text-xs text-destructive">
            {t2(`settings.storage.errors.${error}`)}
          </p>
        </div>
      )}
      {migrationFailure && !pendingMigration && (
        <div className="flex items-start gap-2 rounded-sm border border-destructive/50 bg-destructive/10 px-3 py-2">
          <ShieldAlert
            size={14}
            strokeWidth={1.5}
            className="mt-0.5 shrink-0 text-destructive"
          />
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
            <p className="text-xs text-muted-foreground">
              {t2("settings.storage.openProjects")}
            </p>
            {idleWorkspacePaths.length > 1 && (
              <Button
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
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t2("settings.storage.closeIdleProjectsHint")}
          </p>
          <ul className="space-y-1">
            {openWorkspacePaths.map((folderPath) => {
              const status = workspaceStatuses.find(
                (entry) => entry.workspaceId === folderPath,
              );
              const statusKey = !status
                ? "settings.storage.projectUnknown"
                : !status.idleClose.allowed &&
                    status.idleClose.reason === "unsaved"
                  ? "settings.storage.projectUnsaved"
                  : WORKSPACE_STATUS_KEYS[status.lifecycle];
              const blockedReason =
                status && !status.idleClose.allowed
                  ? t2(
                      `settings.storage.idleCloseReasons.${status.idleClose.reason}`,
                    )
                  : void 0;
              return (
                <li
                  key={folderPath}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="min-w-0 truncate text-xs text-foreground"
                      title={folderPath}
                    >
                      {folderNameFromPath(folderPath)}
                    </span>
                    <span
                      className="shrink-0 text-xs text-muted-foreground"
                      title={blockedReason}
                    >
                      {t2(statusKey)}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 shrink-0 text-xs font-normal text-muted-foreground"
                    disabled={
                      busy ||
                      needsRestart ||
                      closingWorkspacePath !== null ||
                      closingIdleWorkspaces
                    }
                    loading={closingWorkspacePath === folderPath}
                    aria-busy={closingWorkspacePath === folderPath}
                    onClick={() => void handleCloseOpenWorkspace(folderPath)}
                    data-action-ui-id="settings-storage-close-project"
                  >
                    {t2("settings.storage.closeProject")}
                  </Button>
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
            <AlertTriangle
              size={14}
              strokeWidth={1.5}
              className="mt-0.5 shrink-0 text-warning"
            />
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
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs font-normal"
              disabled={busy || needsRestart || openWorkspaceCount > 0}
              onClick={() => void handleRecoverConfigured()}
              data-action-ui-id="settings-storage-recover"
            >
              {t2("settings.storage.recover")}
            </Button>
          </div>
        </div>
      )}
      {residue?.available && (
        <div
          className="space-y-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2"
          data-action-ui-id="settings-storage-default-residue"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle
              size={14}
              strokeWidth={1.5}
              className="mt-0.5 shrink-0 text-warning"
            />
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
              <p className="text-xs text-warning">
                {t2("settings.storage.defaultResidueSafety")}
              </p>
              {openWorkspaceCount > 0 && (
                <p className="text-xs text-warning">
                  {t2("settings.storage.closeProjectsBeforeRecover")}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs font-normal"
              disabled={busy || needsRestart || openWorkspaceCount > 0}
              onClick={() => void handleRecoverResidue()}
              data-action-ui-id="settings-storage-recover-residue"
            >
              {t2("settings.storage.recoverResidue")}
            </Button>
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
              <span
                className="truncate text-foreground"
                title={activeDirectory}
              >
                {activeDirectoryIsDefault
                  ? t2("settings.storage.systemDefaultLocation")
                  : activeDirectory}
              </span>
              <span className="text-muted-foreground">
                {t2("settings.storage.locationAfterRestart")}
              </span>
              <span
                className="truncate text-foreground"
                title={configuredDirectory}
              >
                {dataDir
                  ? configuredDirectory
                  : t2("settings.storage.systemDefaultLocation")}
              </span>
            </div>
          )}
          {!needsRestart && !configuredLocationUnavailable && (
            <div className="flex items-center gap-2">
              <Folder
                size={12}
                strokeWidth={1.5}
                className="shrink-0 text-muted-foreground"
              />
              <p className="truncate text-xs text-muted-foreground">
                {dataDir
                  ? configuredDirectory
                  : t2("settings.storage.systemDefaultLocation")}
              </p>
            </div>
          )}
          {configuredLocationUnavailable && (
            <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
              <span className="text-muted-foreground">
                {t2("settings.storage.temporaryLocation")}
              </span>
              <span
                className="truncate text-foreground"
                title={activeDirectory}
              >
                {t2("settings.storage.systemDefaultLocation")}
              </span>
              <span className="text-muted-foreground">
                {t2("settings.storage.unavailableLocation")}
              </span>
              <span
                className="truncate text-foreground"
                title={configuredDirectory}
              >
                {configuredDirectory}
              </span>
            </div>
          )}
        </div>
      )}
      {cleanupDeferred && (
        <div className="flex items-start gap-2 rounded-sm border border-warning/50 bg-warning/10 px-3 py-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
          <p className="text-xs text-warning">
            {t2("settings.storage.cleanupDeferred")}
          </p>
        </div>
      )}
      {needsRestart && (
        <RestartBanner
          message={t2("settings.storage.restartRequiredDescription")}
        />
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
