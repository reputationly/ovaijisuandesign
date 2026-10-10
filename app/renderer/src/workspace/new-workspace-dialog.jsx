// new-workspace-dialog.jsx
import { AlertTriangle, ChevronDown, isWorkspaceFolderMissingError, jsxRuntimeExports, Plus, reactExports, resolveNewProjectPreferences, updateNewProjectPreferences, useNewProjectFolder, usePlatform, useStorage, useTranslation, workspaceLog, X$7 as X } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import {
  DropdownMenu,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useCreateProjectAndSelect } from "./context-menu-content.jsx";
import { CreateProjectDialog } from "./create-project-dialog.jsx";
import { Folder, Users } from "../media-editing/package.jsx";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { DropdownMenuSeparator } from "./shortcut-hint.jsx";
import { useFolderPermissionGate } from "./use-folder-permission-gate.jsx";
import {
  PROJECT_NAME_MAX_CHARS,
  truncateProjectName,
} from "../generation/normalize-skill-detail-metadata.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { folderNameFromPath } from "../generation/use-model-catalog-scope-key.js";
import { useProjects } from "./normalize-project-entries.js";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import { Input3 } from "../infra/select-content.jsx";
import { LocalFolderIcon } from "./home-service.jsx";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { Switch } from "../generation/select-content.jsx";
import { useOptionalSettingsDialog } from "../settings/persist-visible-workspace-manual-order.js";
import {
  DATA_DIRECTORY_STATUS_CHANGED_EVENT,
  getDataDirectoryMainService,
} from "../settings/get-data-directory-main-service.js";
function ProjectSelectRow({
  projects,
  selectedProjectId,
  onChange,
  className,
}) {
  const { t: t2 } = useTranslation();
  const [createDialogOpen, setCreateDialogOpen] = reactExports.useState(false);
  const selected2 = projects.find(
    (project2) => project2.id === selectedProjectId,
  );
  const handleCreateProject = useCreateProjectAndSelect((projectId) => {
    onChange(projectId);
    setCreateDialogOpen(false);
  });
  return (
    <div
      className={`flex min-h-10 w-full min-w-0 items-center gap-3 px-3 py-2 text-left ${className ?? ""}`}
      data-action-ui-id="new-workspace-project-row"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <Folder
          className="size-4 shrink-0"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span className="flex min-w-0 flex-1 items-baseline gap-2 overflow-hidden">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="max-w-[82px] shrink cursor-help truncate text-body-14 text-muted-foreground">
                    {t2("project.selectRow.label")}
                  </span>
                }
              />
              <TooltipContent side="top" className="max-w-64">
                {t2("project.selectRow.hint")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="min-w-0 flex-1 truncate whitespace-nowrap text-body-14 text-muted-foreground">
            {selected2?.name ?? t2("project.selectRow.none")}
          </span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex shrink-0 items-center gap-0.5 rounded-sm px-1.5 py-1 text-body-14 font-medium whitespace-nowrap text-brand-accent transition-colors hover:bg-brand-accent/10"
            data-action-ui-id="new-workspace-project-pick"
          >
            {selected2
              ? t2("project.selectRow.change")
              : t2("project.selectRow.pick")}
            <ChevronDown size={13} strokeWidth={1.5} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            alignOffset={-2}
            side="bottom"
            sideOffset={4}
            className="min-w-44 max-w-72 text-[13px] font-normal text-foreground/70"
          >
            <DropdownMenuItem
              data-action-ui-id="new-workspace-project-create"
              onClick={() => setCreateDialogOpen(true)}
              className="text-[13px] font-normal text-foreground/70"
            >
              <Plus size={16} strokeWidth={1.5} />
              <span>{t2("project.create.trigger")}</span>
            </DropdownMenuItem>
            {projects.length === 0 ? (
              <p className="px-2.5 py-1.5 whitespace-nowrap text-foreground/70">
                {t2("project.noProjects")}
              </p>
            ) : (
              <>
                <DropdownMenuSeparator />
                <div className="max-h-56 overflow-y-auto">
                  {projects.map((project2) => (
                    <DropdownMenuItem
                      key={project2.id}
                      onClick={() => onChange(project2.id)}
                      className="text-[13px] font-normal text-foreground/70"
                    >
                      {project2.kind === "team" ? (
                        <Users size={14} strokeWidth={1.5} />
                      ) : (
                        <Folder size={14} strokeWidth={1.5} />
                      )}
                      <span className="min-w-0 flex-1 truncate">
                        {project2.name}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </div>
              </>
            )}
            {selected2 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onChange(void 0)}
                  className="text-[13px] font-normal text-foreground/70"
                >
                  {t2("project.selectRow.clear")}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        {selected2 ? (
          <button
            type="button"
            onClick={() => onChange(void 0)}
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            aria-label={t2("common.clear")}
            data-action-ui-id="new-workspace-project-clear"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        ) : null}
      </div>
      <CreateProjectDialog
        open={createDialogOpen}
        kind="local"
        onConfirm={handleCreateProject}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
export function NewWorkspaceDialog({
  open,
  onOpenChange,
  onConfirm,
  defaultProjectId,
}) {
  const { t: t2 } = useTranslation();
  const settingsDialog = useOptionalSettingsDialog();
  const platform2 = usePlatform();
  const [config2, setConfig] = useStorage("global.config");
  const { loadUserMemory: rememberedMemory } =
    resolveNewProjectPreferences(config2);
  const [name2, setName] = reactExports.useState("");
  const submittingRef = reactExports.useRef(false);
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [loadUserMemory, setLoadUserMemory] =
    reactExports.useState(rememberedMemory);
  const [rememberedFolderPath, setFolderPath] = useNewProjectFolder();
  const [projectId, setProjectId] = reactExports.useState(defaultProjectId);
  const folderPath = projectId ? void 0 : rememberedFolderPath;
  const showFolderPicker = !projectId;
  const projects = useProjects({
    sortMode: "updated",
  });
  const [projectsRoot, setProjectsRoot] = reactExports.useState(void 0);
  const [dataDirectoryStatus, setDataDirectoryStatus] =
    reactExports.useState(null);
  const [allowDataDirectoryFallback, setAllowDataDirectoryFallback] =
    reactExports.useState(false);
  const { ensureGranted, dialog: permissionDialog } = useFolderPermissionGate();
  const composingRef = reactExports.useRef(false);
  const trimmed = truncateProjectName(name2);
  const handleLoadUserMemoryChange = reactExports.useCallback(
    (next2) => {
      setLoadUserMemory(next2);
      setConfig((prev) =>
        updateNewProjectPreferences(prev, {
          loadUserMemory: next2,
        }),
      );
    },
    [setConfig],
  );
  const refreshDataDirectoryStatus = reactExports.useCallback(() => {
    let cancelled = false;
    const service2 = getDataDirectoryMainService();
    Promise.all([service2.getStatus(), service2.getProjectsRoot()])
      .then(([status, nextProjectsRoot]) => {
        if (!cancelled) {
          setDataDirectoryStatus(status);
          setProjectsRoot(nextProjectsRoot);
        }
      })
      .catch((error) => {
        workspaceLog.info("new-project: projects-root-unavailable", {
          source: "new-workspace-dialog",
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  reactExports.useEffect(() => {
    if (!open) return;
    let cancelRefresh = refreshDataDirectoryStatus();
    const handleStatusChanged = () => {
      cancelRefresh();
      cancelRefresh = refreshDataDirectoryStatus();
    };
    window.addEventListener(
      DATA_DIRECTORY_STATUS_CHANGED_EVENT,
      handleStatusChanged,
    );
    return () => {
      cancelRefresh();
      window.removeEventListener(
        DATA_DIRECTORY_STATUS_CHANGED_EVENT,
        handleStatusChanged,
      );
    };
  }, [open, refreshDataDirectoryStatus]);
  const reset2 = reactExports.useCallback(() => {
    setName("");
    setLoadUserMemory(rememberedMemory);
    setDataDirectoryStatus(null);
    setAllowDataDirectoryFallback(false);
    setProjectId(defaultProjectId);
  }, [defaultProjectId, rememberedMemory]);
  reactExports.useEffect(() => {
    if (!open) {
      reset2();
      return;
    }
    setLoadUserMemory(rememberedMemory);
  }, [open, reset2, rememberedMemory]);
  reactExports.useEffect(() => {
    if (open) setProjectId(defaultProjectId);
  }, [open, defaultProjectId]);
  const handlePickFolder = reactExports.useCallback(async () => {
    const showOpenDialog = platform2.fs.showOpenDialog;
    if (!showOpenDialog) return;
    const picked = await showOpenDialog({
      directory: true,
      multiple: false,
      title: t2("workspace.newProject.selectFolderTitle", "选择工作区文件夹"),
      defaultPath: folderPath ?? projectsRoot,
    }).catch(() => void 0);
    const pickedPath = picked?.[0];
    if (!pickedPath) return;
    workspaceLog.info("new-project: folder-picked", {
      source: "new-workspace-dialog",
    });
    const granted = await ensureGranted(pickedPath);
    if (!granted) {
      workspaceLog.info("new-project: folder-consent-denied", {
        source: "new-workspace-dialog",
      });
      return;
    }
    setFolderPath(pickedPath);
  }, [
    platform2.fs,
    t2,
    ensureGranted,
    folderPath,
    projectsRoot,
    setFolderPath,
  ]);
  const handleConfirm = reactExports.useCallback(async () => {
    const storageBlocked2 =
      !folderPath &&
      (dataDirectoryStatus?.state === "pending_restart" ||
        (dataDirectoryStatus?.state === "configured_location_unavailable" &&
          !allowDataDirectoryFallback));
    if (!trimmed || storageBlocked2 || submittingRef.current) return;
    if (!folderPath && allowDataDirectoryFallback) {
      trackEvent(TRACK_EVENTS.DATA_DIRECTORY_FALLBACK_CREATE, {
        outcome: "temporary_opt_in",
        status_source: "verified",
        temporary_default_allowed: true,
      });
    }
    trackEvent(TRACK_EVENTS.WORKSPACE_OPEN_SUBMIT, {
      mode: folderPath ? "open_existing" : "create_new",
      source: "new_workspace_dialog",
      workspace_id: folderPath ? folderNameFromPath(folderPath) : void 0,
    });
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const result = await onConfirm(trimmed, {
        loadUserMemory,
        parentFolderPath: folderPath,
        projectId,
        ...(allowDataDirectoryFallback
          ? {
              allowDataDirectoryFallback: true,
            }
          : {}),
      });
      if (result === false) return;
      reset2();
      onOpenChange(false);
    } catch (error) {
      workspaceLog.error("new-workspace: create-failed", {
        error,
      });
      dedupedToast.error(
        isWorkspaceFolderMissingError(error)
          ? t2("home.workspaceFolderMissing")
          : t2("home.workspaceOpenFailed"),
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [
    t2,
    trimmed,
    folderPath,
    dataDirectoryStatus?.state,
    allowDataDirectoryFallback,
    loadUserMemory,
    projectId,
    onConfirm,
    onOpenChange,
    reset2,
  ]);
  const handleKeyDown2 = reactExports.useCallback(
    (e2) => {
      if (composingRef.current || e2.nativeEvent.isComposing) return;
      if (e2.key === "Enter") {
        e2.preventDefault();
        handleConfirm();
      }
    },
    [handleConfirm],
  );
  const handleOpenChange = reactExports.useCallback(
    (nextOpen) => {
      if (!nextOpen) reset2();
      onOpenChange(nextOpen);
    },
    [onOpenChange, reset2],
  );
  const displayedFolderPath =
    folderPath ??
    projectsRoot ??
    t2("workspace.newProject.locationLoading", "正在读取…");
  const storageBlocked =
    !folderPath &&
    (dataDirectoryStatus?.state === "pending_restart" ||
      (dataDirectoryStatus?.state === "configured_location_unavailable" &&
        !allowDataDirectoryFallback));
  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          size="md"
          overlayClassName="creation-dialog-overlay"
          className="creation-dialog flex max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:!max-w-[528px]"
          data-action-ui-id="new-workspace-dialog"
        >
          <div
            className="min-h-0 min-w-0 overflow-y-auto px-4 pt-4 pb-3 sm:px-5 sm:pt-5"
            data-action-ui-id="new-workspace-dialog-body"
          >
            <DialogHeader className="mb-4">
              <DialogTitle className="text-body-14 leading-5 font-medium tracking-normal">
                {t2("topbar.newProject.title")}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t2("topbar.newProject.description")}
              </DialogDescription>
            </DialogHeader>
            <div
              className="relative min-w-0 overflow-visible"
              data-action-ui-id="new-workspace-fields"
            >
              <Input3
                id="new-workspace-name"
                data-action-ui-id="new-workspace-name-input"
                className="creation-dialog-name-input relative z-2 h-12 rounded-lg px-3 text-body-15 font-normal tracking-normal"
                autoFocus={true}
                value={name2}
                onChange={(e2) => setName(e2.target.value)}
                onCompositionStart={() => {
                  composingRef.current = true;
                }}
                onCompositionEnd={() => {
                  composingRef.current = false;
                }}
                onKeyDown={handleKeyDown2}
                aria-label={t2("topbar.newProject.placeholder")}
                placeholder={t2("topbar.newProject.placeholder")}
                autoComplete="off"
                maxLength={PROJECT_NAME_MAX_CHARS}
              />
              {showFolderPicker ? (
                <div
                  className="new-workspace-path-picker relative z-1 flex min-h-10 w-full min-w-0 max-w-full items-center gap-3 overflow-hidden border-0 px-3 py-2 text-left"
                  data-action-ui-id="new-workspace-folder-row"
                >
                  <div
                    className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
                    data-layout-slot="new-workspace-folder-content"
                  >
                    <LocalFolderIcon className="size-4 shrink-0" />
                    <span className="flex min-w-0 flex-1 items-baseline gap-2 overflow-hidden">
                      <span className="max-w-[82px] shrink truncate text-body-14 text-muted-foreground">
                        {t2("workspace.newProject.locationLabel")}
                      </span>
                      <span
                        className="min-w-0 flex-1 truncate whitespace-nowrap text-body-14 text-muted-foreground"
                        title={displayedFolderPath}
                      >
                        {displayedFolderPath}
                      </span>
                    </span>
                  </div>
                  <div
                    className="flex shrink-0 items-center gap-1"
                    data-layout-slot="new-workspace-folder-actions"
                  >
                    <button
                      type="button"
                      onClick={() => void handlePickFolder()}
                      className="shrink-0 rounded-sm px-1.5 py-1 text-body-14 font-medium whitespace-nowrap text-brand-accent transition-colors hover:bg-brand-accent/10"
                      data-action-ui-id="new-workspace-folder-pick"
                    >
                      {t2("workspace.newProject.changeFolder")}
                    </button>
                    {folderPath ? (
                      <button
                        type="button"
                        onClick={() => setFolderPath(void 0)}
                        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                        data-action-ui-id="new-workspace-folder-clear"
                        aria-label={t2("common.clear", "清除")}
                      >
                        <X size={14} strokeWidth={1.5} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <ProjectSelectRow
                className={`new-workspace-project-picker relative z-1 overflow-hidden rounded-b-lg${showFolderPicker ? "" : " new-workspace-project-picker--tucked"}`}
                projects={projects}
                selectedProjectId={projectId}
                onChange={setProjectId}
              />
            </div>
            {dataDirectoryStatus?.state === "configured_location_unavailable" &&
            !folderPath ? (
              <div
                className="mt-4 space-y-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-warning-foreground"
                data-action-ui-id="new-workspace-storage-fallback"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    size={14}
                    strokeWidth={1.5}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-medium">
                      {t2("workspace.newProject.storageFallbackTitle")}
                    </p>
                    <p className="text-xs/relaxed">
                      {t2("workspace.newProject.storageFallbackDescription")}
                    </p>
                    <p
                      className="truncate text-xs text-muted-foreground"
                      title={dataDirectoryStatus.configuredDirectory}
                    >
                      {dataDirectoryStatus.configuredDirectory}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="text-xs font-medium underline underline-offset-2"
                    onClick={() => settingsDialog?.openSettings("storage")}
                  >
                    {t2("settings.storage.openSettings")}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">
                      {t2("workspace.newProject.useTemporaryDefault")}
                    </span>
                    <Switch
                      checked={allowDataDirectoryFallback}
                      onCheckedChange={setAllowDataDirectoryFallback}
                      aria-label={t2(
                        "workspace.newProject.useTemporaryDefault",
                      )}
                      data-action-ui-id="new-workspace-storage-fallback-toggle"
                    />
                  </div>
                </div>
              </div>
            ) : null}
            {dataDirectoryStatus?.state === "pending_restart" && !folderPath ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-warning-foreground">
                <AlertTriangle
                  size={14}
                  strokeWidth={1.5}
                  className="mt-0.5 shrink-0"
                />
                <p className="text-xs/relaxed">
                  {t2("workspace.newProject.storageRestartRequired")}
                </p>
              </div>
            ) : null}
            <section className="mt-5 border-t border-border-soft pt-3">
              <h3 className="mb-2 text-body-14 leading-5 font-normal text-muted-foreground">
                {t2("topbar.newProject.settingsTitle")}
              </h3>
              <div className="grid grid-cols-1 gap-1">
                <div
                  className="flex min-h-12 items-center gap-3 px-1 py-1"
                  data-action-ui-id="new-workspace-load-user-memory-row"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-body-14 leading-5 font-normal">
                      {t2("topbar.newProject.loadUserMemory.label")}
                    </div>
                    <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                      {t2("topbar.newProject.loadUserMemory.description")}
                    </p>
                  </div>
                  <Switch
                    checked={loadUserMemory}
                    onCheckedChange={handleLoadUserMemoryChange}
                    aria-label={t2("topbar.newProject.loadUserMemory.label")}
                    data-action-ui-id="new-workspace-load-user-memory-toggle"
                  />
                </div>
              </div>
            </section>
          </div>
          <DialogFooter className="shrink-0 flex-row justify-end gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
            <Button
              variant="secondary"
              onClick={() => handleOpenChange(false)}
              className="creation-dialog-action-button min-w-20 font-medium"
            >
              {t2("common.cancel")}
            </Button>
            <Button
              data-action-ui-id="new-workspace-confirm"
              disabled={!trimmed || storageBlocked || submitting}
              onClick={handleConfirm}
              className="creation-dialog-action-button min-w-22 font-medium"
            >
              {t2("topbar.newProject.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {permissionDialog}
    </>
  );
}
