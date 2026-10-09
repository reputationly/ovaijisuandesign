// new-workspace-dialog.jsx
import { jsxRuntimeExports, useTranslation, reactExports, dedupedToast, AlertTriangle, Check, useStorage, usePlatform, X$7, ChevronDown, Plus, Search, useNewProjectFolder, ShieldCheck, workspaceLog, Trans, BadgeInfo, resolveNewProjectPreferences, updateNewProjectPreferences, isWorkspaceFolderMissingError, ContextMenuTrigger$1, MenuPortal, MenuPositioner, MenuPopup, MenuItem$3, MenuSubmenuRoot, MenuSubmenuTrigger, ChevronRightIcon, ActionListPanel, ActionListItem, ActionListSeparator, CDN_BASE_MAP, getCdnRegion, cdnPublicAsset } from "../vendor.js";
import { Separator$1 } from "../m15/canvas-surface-recovery-scheduler.jsx";
import { useVisiblePreviewTabsSnapshot, visiblePreviewTabsStore, resolveVisiblePreviewEntries, showVisiblePreviewTab } from "../m15/create-visible-preview-tabs-store.js";
import { services, Tooltip, TooltipTrigger, TooltipProvider, DropdownMenu, pruneWorkspaceBundleCache, DropdownMenuSub } from "../m15/graph.jsx";
import { Folder, Users } from "../m15/parse-item.jsx";
import { truncateProjectName, PROJECT_NAME_MAX_CHARS } from "../m15/push-inline.js";
import { isCaseInsensitiveOs } from "../m15/run-manual-update-check.js";
import { TRACK_EVENTS } from "../m15/track-events.js";
import { getTaskCompletionKey, COMPLETED_TASK_LIMIT, getTopbarSnapshots, pruneTopbarSnapshots, subscribeTopbarSnapshots, setTopbarSnapshot, formatBusyProjects, workspaceLimitNamedFallback, workspaceLimitFallback, retryInFlightFallback, storageRestartRequiredFallback, storageCreateUnavailableFallback, storageLocationUnavailableFallback, storageMigrationInProgressFallback, isChineseLocale, OSS_WEBP, cdnRegionalFile, cdnRegionalImage, COACHMARK_BASE_MAP, coachMarkImage } from "../m15/use-hub-logo-hover-animation.jsx";
import { folderNameFromPath } from "../m15/use-resizable-width.js";
import { useProjects, sortProjects, filterProjectsByKeyword } from "../m15/workspace-events.js";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  Button$1,
  AlertDialogFooter,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  cn$2,
  TooltipContent,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  MENU_ITEM_LAYOUT,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { Label } from "../m09/infinite-scroll-container.jsx";
import { Input3 } from "../asset-center/shared/select-content.jsx";
import {
  LocalFolderIcon,
  instantiationService,
  StrokeIcon,
  INotificationMainService,
} from "../m08/browser-inspiration-urls.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { IHiloApp } from "../m08/instantiation-service.js";
import {
  DropdownMenuSeparator,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "../m08/shortcut-categories.jsx";
import { Switch } from "../m01/calc-video-cost-breakdown.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useOptionalSettingsDialog, useProjectActions } from "./custom-provider-form.jsx";
import { getDesktopSettingsMainService } from "./delete-account-confirm-dialog.jsx";
import {
  DATA_DIRECTORY_STATUS_CHANGED_EVENT,
  getDataDirectoryMainService,
} from "./use-data-directory.js";
import { isPathInWhitelist } from "./use-update-actions.jsx";
export function useCreateProjectAndSelect(onChange) {
  const { t: t2 } = useTranslation();
  const { createProject } = useProjectActions();
  const handleCreateProject = reactExports.useCallback(
    async (name2, kind) => {
      const result = await createProject(name2, kind);
      if (!result.project) {
        dedupedToast.error(
          result.errorMessage ?? t2(result.errorMessageKey ?? "project.create.failed"),
        );
        return;
      }
      onChange(result.project.id);
    },
    [createProject, onChange, t2],
  );
  return handleCreateProject;
}
function FolderPermissionDialog({ open, folderPath, onAlwaysAllow, onAllow, onCancel }) {
  const { t: t2 } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={(v2) => !v2 && onCancel()}>
      <AlertDialogContent data-action-ui-id="folder-permission-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t2("workspace.folderPermission.title", "文件夹访问权限")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t2(
              "workspace.folderPermission.body",
              "授予后，MiniMax Design 对该文件夹及其子文件夹里的内容将拥有读取、写入、删除的能力。",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center gap-2 overflow-hidden rounded-lg border border-border bg-muted/30 px-3 py-2">
          <ShieldCheck size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
          <p className="min-w-0 flex-1 truncate text-xs text-foreground" title={folderPath}>
            {folderPath}
          </p>
        </div>
        <AlertDialogFooter>
          <Button$1 variant="ghost" onClick={onCancel} data-action-ui-id="folder-permission-cancel">
            {t2("common.cancel", "取消")}
          </Button$1>
          <Button$1 variant="outline" onClick={onAllow} data-action-ui-id="folder-permission-allow">
            {t2("workspace.folderPermission.allow", "允许")}
          </Button$1>
          <Button$1 onClick={onAlwaysAllow} data-action-ui-id="folder-permission-always-allow">
            {t2("workspace.folderPermission.alwaysAllow", "始终允许")}
          </Button$1>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function useFolderPermissionGate() {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const settingsDialog = useOptionalSettingsDialog();
  const caseInsensitive = isCaseInsensitiveOs(platform2.app.os);
  const [config2, , persistConfig] = useStorage("global.config");
  const configRef = reactExports.useRef(config2);
  configRef.current = config2;
  const [pending2, setPending] = reactExports.useState(null);
  const ensureGranted = reactExports.useCallback(
    (folderPath) => {
      if (isPathInWhitelist(folderPath, configRef.current.folderWhitelist ?? [], caseInsensitive)) {
        workspaceLog.info("folder-consent: whitelisted", {
          via: "whitelist",
        });
        return Promise.resolve(true);
      }
      workspaceLog.info("folder-consent: prompt");
      return new Promise((resolve) => {
        setPending({
          folderPath,
          resolve,
        });
      });
    },
    [caseInsensitive],
  );
  const handleAllow = reactExports.useCallback(() => {
    workspaceLog.info("folder-consent: allow");
    dedupedToast.success(t2("workspace.folderPermission.allowToast", "权限添加成功"));
    pending2?.resolve(true);
    setPending(null);
  }, [pending2, t2]);
  const handleAlwaysAllow = reactExports.useCallback(async () => {
    if (!pending2) return;
    workspaceLog.info("folder-consent: always-allow");
    const folderPath = pending2.folderPath;
    if (!isPathInWhitelist(folderPath, configRef.current.folderWhitelist ?? [], caseInsensitive)) {
      const saved = await persistConfig((current2) => {
        const existing = current2.folderWhitelist ?? [];
        if (isPathInWhitelist(folderPath, existing, caseInsensitive)) return {};
        const withoutChildren = existing.filter(
          (entry) => !isPathInWhitelist(entry, [folderPath], caseInsensitive),
        );
        return {
          folderWhitelist: [...withoutChildren, folderPath],
        };
      });
      if (!saved) {
        dedupedToast.error(t2("settings.folderWhitelist.saveFailed"));
        return;
      }
    }
    dedupedToast.success(
      <Trans
        i18nKey="workspace.folderPermission.alwaysAllowToast"
        components={{
          1: (
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => settingsDialog?.openSettings("advanced")}
              data-action-ui-id="folder-permission-toast-settings-link"
            />
          ),
        }}
      />,
    );
    pending2.resolve(true);
    setPending(null);
  }, [caseInsensitive, pending2, persistConfig, settingsDialog, t2]);
  const handleCancel = reactExports.useCallback(() => {
    workspaceLog.info("folder-consent: cancel");
    pending2?.resolve(false);
    setPending(null);
  }, [pending2]);
  const dialog = (
    <FolderPermissionDialog
      open={pending2 !== null}
      folderPath={pending2?.folderPath ?? ""}
      onAlwaysAllow={handleAlwaysAllow}
      onAllow={handleAllow}
      onCancel={handleCancel}
    />
  );
  return {
    ensureGranted,
    dialog,
  };
}
function ProjectOutputLocation({ disabled: disabled2 }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const [folderPath, setFolderPath] = useNewProjectFolder();
  const [projectsRoot, setProjectsRoot] = reactExports.useState();
  const [picking, setPicking] = reactExports.useState(false);
  const { ensureGranted, dialog } = useFolderPermissionGate();
  reactExports.useEffect(() => {
    let generation = 0;
    const refresh = () => {
      const request = ++generation;
      void getDataDirectoryMainService()
        .getProjectsRoot()
        .then((root2) => {
          if (request === generation) setProjectsRoot(root2);
        })
        .catch((error) => {
          workspaceLog.info("project-output-location: root-unavailable", {
            error,
          });
        });
    };
    refresh();
    window.addEventListener(DATA_DIRECTORY_STATUS_CHANGED_EVENT, refresh);
    return () => {
      generation++;
      window.removeEventListener(DATA_DIRECTORY_STATUS_CHANGED_EVENT, refresh);
    };
  }, []);
  const handlePick = async () => {
    if (disabled2 || picking || !platform2.fs.showOpenDialog) return;
    setPicking(true);
    try {
      const paths = await platform2.fs.showOpenDialog({
        directory: true,
        multiple: false,
        title: t2("workspace.newProject.selectFolderTitle"),
        defaultPath: folderPath ?? projectsRoot,
      });
      const picked = paths?.[0];
      if (picked && (await ensureGranted(picked))) setFolderPath(picked);
    } catch (error) {
      workspaceLog.info("project-output-location: pick-failed", {
        error,
      });
    } finally {
      setPicking(false);
    }
  };
  const displayedPath = folderPath ?? projectsRoot ?? t2("workspace.newProject.locationLoading");
  return (
    <>
      <div
        className="new-workspace-path-picker rounded-b-lg relative z-1 flex min-h-10 w-full min-w-0 max-w-full items-center gap-3 overflow-hidden border-0 px-3 py-2 text-left"
        data-action-ui-id="create-project-folder-row"
      >
        <div
          className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
          data-layout-slot="create-project-folder-content"
        >
          <LocalFolderIcon className="size-4 shrink-0" />
          <span className="flex min-w-0 flex-1 items-baseline gap-2 overflow-hidden">
            <span className="max-w-[82px] shrink truncate text-body-14 text-muted-foreground">
              {t2("workspace.newProject.locationLabel")}
            </span>
            <span
              className="min-w-0 flex-1 truncate whitespace-nowrap text-body-14 text-muted-foreground"
              title={displayedPath}
            >
              {displayedPath}
            </span>
          </span>
        </div>
        <div
          className="flex shrink-0 items-center gap-1"
          data-layout-slot="create-project-folder-actions"
        >
          <button
            type="button"
            disabled={disabled2 || picking || !platform2.fs.showOpenDialog}
            onClick={() => void handlePick()}
            className="shrink-0 rounded-sm px-1.5 py-1 text-body-14 font-medium whitespace-nowrap text-brand-accent transition-colors disabled:opacity-50 disabled:pointer-events-none hover:bg-brand-accent/10"
            data-action-ui-id="create-project-folder-pick"
          >
            {t2("workspace.newProject.changeFolder")}
          </button>
          {folderPath ? (
            <button
              type="button"
              disabled={disabled2 || picking}
              onClick={() => setFolderPath(void 0)}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none hover:bg-foreground/5 hover:text-foreground"
              data-action-ui-id="create-project-folder-clear"
              aria-label={t2("common.clear", "清除")}
            >
              <X$7 size={14} strokeWidth={1.5} />
            </button>
          ) : null}
        </div>
      </div>
      {dialog}
    </>
  );
}
export function CreateProjectDialog({ open, kind, onConfirm, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const [name2, setName] = reactExports.useState("");
  const [pending2, setPending] = reactExports.useState(false);
  const composingRef = reactExports.useRef(false);
  const trimmed = truncateProjectName(name2);
  reactExports.useEffect(() => {
    if (open) return;
    setName("");
    setPending(false);
  }, [open]);
  const handleConfirm = reactExports.useCallback(async () => {
    if (!trimmed || pending2) return;
    setPending(true);
    try {
      await onConfirm(trimmed, kind);
    } finally {
      setPending(false);
    }
  }, [kind, onConfirm, pending2, trimmed]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="md"
        overlayClassName="creation-dialog-overlay"
        className="creation-dialog flex max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:!max-w-[508px]"
        data-action-ui-id="create-project-dialog"
      >
        <div
          className="min-h-0 min-w-0 overflow-y-auto px-4 pt-4 pb-3 sm:px-5 sm:pt-5"
          data-action-ui-id="create-project-dialog-body"
        >
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2 text-body-14 leading-5 font-medium tracking-normal">
              <Folder className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              {kind === "team" ? t2("project.create.teamTitle") : t2("project.create.localTitle")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {kind === "team"
                ? t2("project.create.teamDescription")
                : t2("project.create.localDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="create-project-name" className="sr-only">
              {t2("project.create.nameLabel")}
            </Label>
            <div className="relative min-w-0 overflow-visible">
              <Input3
                id="create-project-name"
                className="creation-dialog-name-input relative z-2 h-12 rounded-lg px-3 text-body-15 font-normal tracking-normal"
                autoFocus={true}
                value={name2}
                onChange={(event) => setName(event.target.value)}
                onCompositionStart={() => {
                  composingRef.current = true;
                }}
                onCompositionEnd={() => {
                  composingRef.current = false;
                }}
                onKeyDown={(event) => {
                  if (composingRef.current || event.nativeEvent.isComposing) return;
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  void handleConfirm();
                }}
                aria-label={t2("project.create.nameLabel")}
                placeholder={t2("project.create.namePlaceholder")}
                autoComplete="off"
                maxLength={PROJECT_NAME_MAX_CHARS}
                data-action-ui-id="create-project-name-input"
              />
              {open && kind === "local" ? <ProjectOutputLocation disabled={pending2} /> : null}
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
            <BadgeInfo className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <p>
              {kind === "team"
                ? t2("project.create.teamDescription")
                : t2("project.create.localDescription")}
            </p>
          </div>
        </div>
        <DialogFooter className="shrink-0 flex-row justify-end gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
          <Button$1
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={pending2}
            className="creation-dialog-action-button min-w-20 font-medium"
          >
            {t2("common.cancel")}
          </Button$1>
          <Button$1
            onClick={() => void handleConfirm()}
            disabled={!trimmed || pending2}
            className="creation-dialog-action-button min-w-22 font-medium"
            data-action-ui-id="create-project-submit"
          >
            {t2("project.create.submit")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function ProjectSelectRow({ projects, selectedProjectId, onChange, className }) {
  const { t: t2 } = useTranslation();
  const [createDialogOpen, setCreateDialogOpen] = reactExports.useState(false);
  const selected2 = projects.find((project2) => project2.id === selectedProjectId);
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
        <Folder className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
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
            {selected2 ? t2("project.selectRow.change") : t2("project.selectRow.pick")}
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
                      <span className="min-w-0 flex-1 truncate">{project2.name}</span>
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
            <X$7 size={14} strokeWidth={1.5} />
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
export function NewWorkspaceDialog({ open, onOpenChange, onConfirm, defaultProjectId }) {
  const { t: t2 } = useTranslation();
  const settingsDialog = useOptionalSettingsDialog();
  const platform2 = usePlatform();
  const [config2, setConfig] = useStorage("global.config");
  const { loadUserMemory: rememberedMemory } = resolveNewProjectPreferences(config2);
  const [name2, setName] = reactExports.useState("");
  const submittingRef = reactExports.useRef(false);
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [loadUserMemory, setLoadUserMemory] = reactExports.useState(rememberedMemory);
  const [rememberedFolderPath, setFolderPath] = useNewProjectFolder();
  const [projectId, setProjectId] = reactExports.useState(defaultProjectId);
  const folderPath = projectId ? void 0 : rememberedFolderPath;
  const showFolderPicker = !projectId;
  const projects = useProjects({
    sortMode: "updated",
  });
  const [projectsRoot, setProjectsRoot] = reactExports.useState(void 0);
  const [dataDirectoryStatus, setDataDirectoryStatus] = reactExports.useState(null);
  const [allowDataDirectoryFallback, setAllowDataDirectoryFallback] = reactExports.useState(false);
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
    window.addEventListener(DATA_DIRECTORY_STATUS_CHANGED_EVENT, handleStatusChanged);
    return () => {
      cancelRefresh();
      window.removeEventListener(DATA_DIRECTORY_STATUS_CHANGED_EVENT, handleStatusChanged);
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
  }, [platform2.fs, t2, ensureGranted, folderPath, projectsRoot, setFolderPath]);
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
    folderPath ?? projectsRoot ?? t2("workspace.newProject.locationLoading", "正在读取…");
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
                        <X$7 size={14} strokeWidth={1.5} />
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
            {dataDirectoryStatus?.state === "configured_location_unavailable" && !folderPath ? (
              <div
                className="mt-4 space-y-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-warning-foreground"
                data-action-ui-id="new-workspace-storage-fallback"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
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
                      aria-label={t2("workspace.newProject.useTemporaryDefault")}
                      data-action-ui-id="new-workspace-storage-fallback-toggle"
                    />
                  </div>
                </div>
              </div>
            ) : null}
            {dataDirectoryStatus?.state === "pending_restart" && !folderPath ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-warning-foreground">
                <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
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
            <Button$1
              variant="secondary"
              onClick={() => handleOpenChange(false)}
              className="creation-dialog-action-button min-w-20 font-medium"
            >
              {t2("common.cancel")}
            </Button$1>
            <Button$1
              data-action-ui-id="new-workspace-confirm"
              disabled={!trimmed || storageBlocked || submitting}
              onClick={handleConfirm}
              className="creation-dialog-action-button min-w-22 font-medium"
            >
              {t2("topbar.newProject.create")}
            </Button$1>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {permissionDialog}
    </>
  );
}
let _service = null;
function getNotificationMainService() {
  if (!_service) {
    _service = services.get(INotificationMainService);
  }
  return _service;
}
export function useCompletedTasks(entries2, options = {}) {
  const { t: t2 } = useTranslation();
  const [completedTasks, setCompletedTasks] = reactExports.useState([]);
  const [unreadCompletedTaskIds, setUnreadCompletedTaskIds] = reactExports.useState(
    () => new Set(),
  );
  const notificationTargetsRef = reactExports.useRef(new Map());
  const earlyClickedNotificationIdsRef = reactExports.useRef(new Set());
  const pendingNotificationsRef = reactExports.useRef(0);
  const activeWorkspaceIdRef = reactExports.useRef(options.activeWorkspaceId ?? null);
  const onCompletionNotificationClickRef = reactExports.useRef(
    options.onCompletionNotificationClick,
  );
  const recentCompletionKeysRef = reactExports.useRef(new Set());
  const activeUserActionKeysRef = reactExports.useRef(new Set());
  reactExports.useEffect(() => {
    activeWorkspaceIdRef.current = options.activeWorkspaceId ?? null;
    onCompletionNotificationClickRef.current = options.onCompletionNotificationClick;
  }, [options.activeWorkspaceId, options.onCompletionNotificationClick]);
  const markCompletedTasksRead = reactExports.useCallback(() => {
    setUnreadCompletedTaskIds((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);
  const handleNotificationTargetClick = reactExports.useCallback(
    (target) => {
      if (target.kind === "completion") markCompletedTasksRead();
      onCompletionNotificationClickRef.current?.(target.task);
    },
    [markCompletedTasksRead],
  );
  const markWorkspaceCompletedTasksRead = reactExports.useCallback(
    (workspaceId2) => {
      setUnreadCompletedTaskIds((prev) => {
        if (prev.size === 0) return prev;
        const completedTaskById = new Map(completedTasks.map((task) => [task.id, task]));
        const workspaceTaskIdPrefix = `${workspaceId2}:`;
        const next2 = new Set(
          [...prev].filter((taskId) => {
            const task = completedTaskById.get(taskId);
            return task?.workspaceId !== workspaceId2 && !taskId.startsWith(workspaceTaskIdPrefix);
          }),
        );
        return next2.size === prev.size ? prev : next2;
      });
    },
    [completedTasks],
  );
  reactExports.useEffect(() => {
    const notificationService = getNotificationMainService();
    const clickDisposable = notificationService.onDidClickNotification((notificationId) => {
      const target = notificationTargetsRef.current.get(notificationId);
      if (target) {
        notificationTargetsRef.current.delete(notificationId);
        handleNotificationTargetClick(target);
        return;
      }
      if (pendingNotificationsRef.current <= 0) return;
      earlyClickedNotificationIdsRef.current.add(notificationId);
    });
    const closeDisposable = notificationService.onDidCloseNotification((notificationId) => {
      notificationTargetsRef.current.delete(notificationId);
      earlyClickedNotificationIdsRef.current.delete(notificationId);
    });
    return () => {
      clickDisposable.dispose();
      closeDisposable.dispose();
    };
  }, [handleNotificationTargetClick]);
  reactExports.useEffect(() => {
    const currentKeys = new Set();
    const newlyActionable = [];
    for (const task of options.activeTasks ?? []) {
      if (task.status !== "needs-answer" && task.status !== "needs-confirmation") continue;
      const key2 = `${task.id}:${task.status}:${task.userActionId ?? "current"}`;
      currentKeys.add(key2);
      if (activeUserActionKeysRef.current.has(key2)) continue;
      if (task.workspaceId === activeWorkspaceIdRef.current) continue;
      newlyActionable.push(task);
    }
    activeUserActionKeysRef.current = currentKeys;
    for (const task of newlyActionable) {
      const target = {
        task,
        kind: "user-action",
      };
      pendingNotificationsRef.current += 1;
      notifyTaskNeedsUserAction(
        task,
        t2,
        (notificationId) => {
          if (earlyClickedNotificationIdsRef.current.delete(notificationId)) {
            handleNotificationTargetClick(target);
            return;
          }
          notificationTargetsRef.current.set(notificationId, target);
        },
        () => {
          pendingNotificationsRef.current = Math.max(0, pendingNotificationsRef.current - 1);
        },
      );
    }
  }, [handleNotificationTargetClick, options.activeTasks, t2]);
  const reportTaskCompleted = reactExports.useCallback(
    (task) => {
      if (task.source === "canvas") return;
      const key2 = getTaskCompletionKey(task);
      if (recentCompletionKeysRef.current.has(key2)) return;
      recentCompletionKeysRef.current.add(key2);
      const notificationTarget = {
        task,
        kind: "completion",
      };
      pendingNotificationsRef.current += 1;
      notifyTaskCompletion(
        [task],
        t2,
        (notificationId) => {
          if (earlyClickedNotificationIdsRef.current.delete(notificationId)) {
            handleNotificationTargetClick(notificationTarget);
            return;
          }
          notificationTargetsRef.current.set(notificationId, notificationTarget);
        },
        () => {
          pendingNotificationsRef.current = Math.max(0, pendingNotificationsRef.current - 1);
        },
      );
      setUnreadCompletedTaskIds((existing) => {
        if (task.workspaceId === activeWorkspaceIdRef.current) return existing;
        const next2 = new Set(existing);
        next2.add(task.id);
        return next2;
      });
      setCompletedTasks((existing) => {
        const seen2 = new Set();
        const merged = [];
        for (const t22 of [task, ...existing]) {
          if (seen2.has(t22.id)) continue;
          seen2.add(t22.id);
          merged.push(t22);
          if (merged.length >= COMPLETED_TASK_LIMIT) break;
        }
        return merged;
      });
    },
    [handleNotificationTargetClick, t2],
  );
  reactExports.useEffect(() => {
    const openIds = new Set(entries2.map((entry) => entry.workspaceId));
    setCompletedTasks((prev) => {
      const filtered = prev.filter((task) => openIds.has(task.workspaceId));
      return filtered.length === prev.length ? prev : filtered;
    });
    for (const key2 of recentCompletionKeysRef.current) {
      const wsId = key2.split(":")[0];
      if (!openIds.has(wsId)) recentCompletionKeysRef.current.delete(key2);
    }
  }, [entries2]);
  reactExports.useEffect(() => {
    const completedIds = new Set(completedTasks.map((task) => task.id));
    setUnreadCompletedTaskIds((prev) => {
      const next2 = new Set([...prev].filter((taskId) => completedIds.has(taskId)));
      return next2.size === prev.size ? prev : next2;
    });
  }, [completedTasks]);
  const dismissCompletedTask = reactExports.useCallback((taskId) => {
    setUnreadCompletedTaskIds((prev) => {
      if (!prev.has(taskId)) return prev;
      const next2 = new Set(prev);
      next2.delete(taskId);
      return next2;
    });
    setCompletedTasks((prev) => {
      const next2 = prev.filter((t22) => t22.id !== taskId);
      return next2.length === prev.length ? prev : next2;
    });
  }, []);
  const unreadCompletedTasks = reactExports.useMemo(
    () => completedTasks.filter((task) => unreadCompletedTaskIds.has(task.id)),
    [completedTasks, unreadCompletedTaskIds],
  );
  return {
    completedTasks,
    unreadCompletedTaskCount: unreadCompletedTaskIds.size,
    unreadCompletedTasks,
    reportTaskCompleted,
    dismissCompletedTask,
    markCompletedTasksRead,
    markWorkspaceCompletedTasksRead,
  };
}
function notifyTaskCompletion(tasks, t2, onNotificationShown, onNotificationSettled) {
  if (tasks.length === 0) return;
  const first2 = tasks[0];
  const promptPreview = first2.promptPreview;
  const title =
    tasks.length === 1
      ? t2("topbar.notification.taskCompletedTitle", "Generation complete")
      : t2("topbar.notification.multipleTasksCompletedTitle", "Multiple generations complete");
  const body2 = getTaskCompletionBody(tasks.length, promptPreview, t2);
  void getNotificationMainService()
    .show({
      title,
      body: body2,
    })
    .then((result) => {
      if (result.success && result.id) onNotificationShown?.(result.id);
    })
    .catch((error) => {
      console.warn("[topbar] Failed to show completion notification:", error);
    })
    .finally(() => onNotificationSettled?.());
}
function notifyTaskNeedsUserAction(task, t2, onNotificationShown, onNotificationSettled) {
  const needsAnswer = task.status === "needs-answer";
  const title = needsAnswer
    ? t2("topbar.notification.taskNeedsAnswerTitle", "Waiting for your answer")
    : t2("topbar.notification.taskNeedsConfirmationTitle", "Waiting for your confirmation");
  const body2 = task.promptPreview
    ? needsAnswer
      ? t2(
          "topbar.notification.taskNeedsAnswerBody",
          '"{{prompt}}" is waiting for your answer. Click to continue.',
          {
            prompt: task.promptPreview,
          },
        )
      : t2(
          "topbar.notification.taskNeedsConfirmationBody",
          '"{{prompt}}" is waiting for your confirmation. Click to continue.',
          {
            prompt: task.promptPreview,
          },
        )
    : needsAnswer
      ? t2(
          "topbar.notification.taskNeedsAnswerFallbackBody",
          "The Agent is waiting for your answer. Click to continue.",
        )
      : t2(
          "topbar.notification.taskNeedsConfirmationFallbackBody",
          "The Agent is waiting for your confirmation. Click to continue.",
        );
  void getNotificationMainService()
    .show({
      title,
      body: body2,
    })
    .then((result) => {
      if (result.success && result.id) onNotificationShown?.(result.id);
    })
    .catch((error) => {
      console.warn("[topbar] Failed to show user-action notification:", error);
    })
    .finally(() => onNotificationSettled?.());
}
function getTaskCompletionBody(count2, promptPreview, t2) {
  if (count2 === 1) {
    return promptPreview
      ? t2(
          "topbar.notification.taskCompletedBody",
          "“{{prompt}}” has finished generating. Click to view the result.",
          {
            prompt: promptPreview,
          },
        )
      : t2(
          "topbar.notification.taskCompletedFallbackBody",
          "Your generation is complete. Click to view the result.",
        );
  }
  return promptPreview
    ? t2(
        "topbar.notification.multipleTasksCompletedBody",
        "{{count}} generation tasks including “{{prompt}}” are complete. Click to view results.",
        {
          prompt: promptPreview,
          count: count2,
        },
      )
    : t2(
        "topbar.notification.multipleTasksCompletedFallbackBody",
        "{{count}} generation tasks are complete. Click to view results.",
        {
          count: count2,
        },
      );
}
export function useTopbarEntries() {
  const [entries2, setEntries] = reactExports.useState([]);
  const [workspaceSnapshots, setWorkspaceSnapshots] = reactExports.useState(() =>
    getTopbarSnapshots(),
  );
  const visiblePreviewTabs = useVisiblePreviewTabsSnapshot();
  const hiloApp2 = reactExports.useMemo(
    () => instantiationService.invokeFunction((accessor) => accessor.get(IHiloApp)),
    [],
  );
  const applyEntries = reactExports.useCallback((rawList) => {
    const liveIds = new Set(rawList.map((e2) => e2.workspaceId));
    visiblePreviewTabsStore.initialize(rawList);
    setEntries(rawList);
    pruneTopbarSnapshots(liveIds);
    pruneWorkspaceBundleCache(liveIds);
  }, []);
  reactExports.useEffect(() => {
    let disposed = false;
    const disposable = hiloApp2.onWorkspaceEntriesChanged((list2) => applyEntries(list2));
    hiloApp2.listWorkspaceEntries().then((list2) => {
      if (!disposed) applyEntries(list2);
    });
    return () => {
      disposed = true;
      disposable.dispose();
    };
  }, [hiloApp2, applyEntries]);
  reactExports.useEffect(
    () => subscribeTopbarSnapshots(() => setWorkspaceSnapshots(getTopbarSnapshots())),
    [],
  );
  const previewEntries = reactExports.useMemo(
    () => resolveVisiblePreviewEntries(entries2, visiblePreviewTabs.tabs),
    [entries2, visiblePreviewTabs.tabs],
  );
  const reorderTabs = reactExports.useCallback((activeId, overId) => {
    visiblePreviewTabsStore.reorder(activeId, overId);
  }, []);
  const reportWorkspaceSnapshot = reactExports.useCallback((workspaceId2, snapshot2) => {
    setTopbarSnapshot(workspaceId2, snapshot2);
  }, []);
  return {
    entries: entries2,
    previewEntries,
    workspaceSnapshots,
    hiloApp: hiloApp2,
    reorderTabs,
    reportWorkspaceSnapshot,
  };
}
export function toastWorkspaceOpenResult(result, t2, options = {}) {
  switch (result.kind) {
    case "limit_reached": {
      const projects = formatBusyProjects(result.busyProjectNames);
      dedupedToast.warning(
        projects
          ? t2("workspace.open.limitReachedNamed", {
              max: result.maxOpenWorkspaces,
              projects,
              defaultValue: workspaceLimitNamedFallback(),
            })
          : t2("workspace.open.limitReached", {
              max: result.maxOpenWorkspaces,
              defaultValue: workspaceLimitFallback(),
            }),
      );
      break;
    }
    case "retry_in_flight":
      dedupedToast.info(
        t2("workspace.open.retryInFlight", {
          defaultValue: retryInFlightFallback(),
        }),
      );
      break;
    case "storage_restart_required":
      dedupedToast.warning(
        t2("workspace.open.storageRestartRequired", {
          defaultValue: storageRestartRequiredFallback(),
        }),
        {
          action: {
            label: t2("settings.restartNow"),
            onClick: () => void getDesktopSettingsMainService().relaunch(),
          },
        },
      );
      break;
    case "storage_unavailable": {
      const statusVerified = result.statusSource === "verified";
      trackEvent(TRACK_EVENTS.DATA_DIRECTORY_FALLBACK_CREATE, {
        outcome: "blocked",
        reason_code: result.reasonCode,
        status_source: result.statusSource,
        temporary_default_allowed: result.allowTemporaryDefault,
      });
      dedupedToast.warning(
        t2(
          statusVerified
            ? "workspace.open.storageUnavailable"
            : "workspace.open.storageStatusUnavailable",
          {
            defaultValue: storageCreateUnavailableFallback(statusVerified),
          },
        ),
        result.allowTemporaryDefault && options.onTemporaryDefault
          ? {
              action: {
                label: t2("workspace.newProject.useTemporaryDefault"),
                onClick: options.onTemporaryDefault,
              },
            }
          : void 0,
      );
      break;
    }
    case "storage_location_unavailable":
      dedupedToast.warning(
        t2("workspace.open.storageLocationUnavailable", {
          defaultValue: storageLocationUnavailableFallback(),
        }),
      );
      break;
    case "storage_migration_in_progress":
      dedupedToast.warning(
        t2("workspace.open.storageMigrationInProgress", {
          defaultValue: storageMigrationInProgressFallback(),
        }),
      );
      break;
  }
}
function handleWorkspaceOpenResult(result, t2, navigateToWorkspace) {
  const runtime = result.kind === "opened" || result.kind === "reused" ? result.runtime : void 0;
  if (runtime) {
    navigateToWorkspace(runtime);
    return runtime;
  }
  toastWorkspaceOpenResult(result, t2);
  return void 0;
}
export function handleNewWorkspaceOpenResult(
  result,
  t2,
  navigateToWorkspace,
  alreadyKnown = false,
) {
  const isReopenOfKnown = result.kind === "reused" || (result.kind === "opened" && alreadyKnown);
  if (isReopenOfKnown) {
    const runtime = result.runtime;
    dedupedToast.info(
      t2("workspace.open.alreadyOpen", {
        defaultValue: isChineseLocale()
          ? "该文件夹已有对应工作区，已为您切换过去。"
          : "This folder already has a workspace. Switched to it.",
      }),
    );
    navigateToWorkspace(runtime);
    return runtime;
  }
  return handleWorkspaceOpenResult(result, t2, navigateToWorkspace);
}
export async function stageWorkspacePreview({ hiloApp: hiloApp2, folderPath, t: t2, onStaged }) {
  const result = await hiloApp2.stageWorkspaceTab(folderPath);
  if (result.kind !== "staged") {
    toastWorkspaceOpenResult(result, t2);
    return void 0;
  }
  showVisiblePreviewTab(result.entry);
  await onStaged(result.entry);
  return result.entry;
}
const PROJECT_PICKER_SEARCH_THRESHOLD = 6;
export function AddToProjectSubMenu({
  projects,
  currentProjectId,
  onSelect,
  useStrokeSpec = false,
}) {
  const { t: t2 } = useTranslation();
  const [keyword2, setKeyword] = reactExports.useState("");
  const candidates2 = reactExports.useMemo(
    () => sortProjects(filterProjectsByKeyword(projects, keyword2), "updated"),
    [keyword2, projects],
  );
  const showSearch = projects.length >= PROJECT_PICKER_SEARCH_THRESHOLD;
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger data-action-ui-id="workspace.add-to-project">
        <ProjectFolderIcon useStrokeSpec={useStrokeSpec} />
        {t2("project.addToProject")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="flex max-h-56 min-w-44 max-w-72 flex-col overflow-hidden">
        {showSearch ? (
          <div className="flex shrink-0 items-center gap-1.5 px-2 pb-1.5">
            {useStrokeSpec ? (
              <StrokeIcon icon={Search} size={12} className="text-muted-foreground" />
            ) : (
              <Search size={12} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
            )}
            <input
              value={keyword2}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder={t2("project.searchPlaceholder")}
              className="h-6 w-full bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
              data-action-ui-id="workspace.add-to-project-search"
            />
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {candidates2.length === 0 ? (
            <p className="px-2.5 py-1.5 text-[11px] whitespace-nowrap text-muted-foreground">
              {t2("project.noProjects")}
            </p>
          ) : (
            candidates2.map((project2) => {
              const isCurrent = project2.id === currentProjectId;
              return (
                <DropdownMenuItem
                  key={project2.id}
                  disabled={isCurrent}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isCurrent) return;
                    onSelect(project2.id);
                  }}
                >
                  {project2.kind === "team" ? (
                    useStrokeSpec ? (
                      <StrokeIcon icon={Users} size={14} />
                    ) : (
                      <Users size={14} strokeWidth={1.5} />
                    )
                  ) : (
                    <ProjectFolderIcon useStrokeSpec={useStrokeSpec} />
                  )}
                  <span className="min-w-0 flex-1 truncate">{project2.name}</span>
                  {isCurrent ? (
                    useStrokeSpec ? (
                      <StrokeIcon icon={Check} size={12} />
                    ) : (
                      <Check className="size-3" strokeWidth={1.75} />
                    )
                  ) : null}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
function ProjectFolderIcon({ useStrokeSpec }) {
  return useStrokeSpec ? (
    <StrokeIcon icon={Folder} size={14} />
  ) : (
    <Folder size={14} strokeWidth={1.5} />
  );
}
export function ContextMenuTrigger({ className, ...props }) {
  return (
    <ContextMenuTrigger$1
      data-slot="context-menu-trigger"
      className={cn$2("select-none", className)}
      {...props}
    />
  );
}
export function ContextMenuContent({
  className,
  align = "start",
  alignOffset = 4,
  side = "right",
  sideOffset = 0,
  motion = "quick-zoom",
  ...props
}) {
  return (
    <MenuPortal>
      <MenuPositioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPopup
          data-slot="context-menu-content"
          className={cn$2(
            "elevated-surface-border z-50 max-h-(--available-height) min-w-28 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-lg outline-none",
            motion !== "none" && "dp-motion-quick-zoom",
            className,
          )}
          {...props}
        />
      </MenuPositioner>
    </MenuPortal>
  );
}
export function ContextMenuItem({ className, inset, variant = "default", ...props }) {
  return (
    <MenuItem$3
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn$2(
        MENU_ITEM_LAYOUT,
        "group/context-menu-item list-row-hit-area relative flex cursor-default items-center rounded-sm outline-hidden select-none focus:bg-popup-item-hover focus:text-foreground data-inset:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus:*:[svg]:text-foreground data-[variant=destructive]:*:[svg]:text-destructive",
        className,
      )}
      {...props}
    />
  );
}
export function ContextMenuSub({ ...props }) {
  return <MenuSubmenuRoot data-slot="context-menu-sub" {...props} />;
}
function ContextMenuSubTrigger({ className, inset, children: children2, ...props }) {
  return (
    <MenuSubmenuTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      className={cn$2(
        MENU_ITEM_LAYOUT,
        "list-row-hit-area flex cursor-default items-center rounded-sm outline-hidden select-none focus:bg-popup-item-hover focus:text-foreground data-inset:pl-8 data-open:bg-popup-item-active data-open:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children2}
      <ChevronRightIcon className="ml-auto" />
    </MenuSubmenuTrigger>
  );
}
function ContextMenuSubContent({ ...props }) {
  return (
    <ContextMenuContent
      data-slot="context-menu-sub-content"
      className="shadow-lg"
      side="right"
      {...props}
    />
  );
}
export function ContextMenuSeparator({ className, ...props }) {
  return (
    <Separator$1
      data-slot="context-menu-separator"
      className={cn$2("h-px bg-border", className)}
      {...props}
    />
  );
}
export function ContextMenuShortcut({ className, ...props }) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn$2(
        "ml-auto text-xs tracking-widest text-muted-foreground group-focus/context-menu-item:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}
export function ActionMenuPanel({ appearance = "canvas", className, ...props }) {
  return (
    <ActionListPanel
      {...props}
      data-action-list-appearance={appearance}
      className={`${appearance === "agent-chat" ? "shadow-lg" : ""} ${className ?? ""}`}
    />
  );
}
export function ActionContextMenuContent(props) {
  return <ActionListPanel render={<ContextMenuContent {...props} />} />;
}
export function ActionContextMenuItem(props) {
  return <ActionListItem variant={props.variant} render={<ContextMenuItem {...props} />} />;
}
export function ActionContextMenuSeparator(props) {
  return <ActionListSeparator render={<ContextMenuSeparator {...props} />} />;
}
export function ActionContextMenuSubContent(props) {
  return <ActionListPanel render={<ContextMenuSubContent {...props} />} />;
}
export function ActionContextMenuSubTrigger(props) {
  return <ActionListItem render={<ContextMenuSubTrigger {...props} />} />;
}
export function ActionDropdownMenuContent(props) {
  return <ActionListPanel render={<DropdownMenuContent {...props} />} />;
}
export function ActionDropdownMenuItem(props) {
  return <ActionListItem variant={props.variant} render={<DropdownMenuItem {...props} />} />;
}
export function ActionDropdownMenuSeparator(props) {
  return <ActionListSeparator render={<DropdownMenuSeparator {...props} />} />;
}
function getCdnBase() {
  return CDN_BASE_MAP[getCdnRegion()];
}
let _cdnBase;
function cdnUrl(path2) {
  _cdnBase ??= getCdnBase();
  return `${_cdnBase}/${path2}`;
}
export function cdnAssetFile(path2) {
  return cdnUrl(path2);
}
function cdnImage(path2) {
  return `${cdnUrl(path2)}${OSS_WEBP}`;
}
const cdnRegionalVideo = cdnRegionalFile;
cdnImage("project-1.jpg");
cdnImage("project-2.jpg");
cdnImage("project-3.jpg");
cdnImage("project-4.jpg");
cdnImage("project-5.jpg");
cdnImage("project-6.jpg");
cdnImage("featured-story-to-shorts.jpg");
export const CDN_LOGIN_GATE_HERO = cdnRegionalFile({
  domestic: "hub-login.png",
  overseas: "hub-login.png",
});
export const CDN_UPDATE_POSTER = cdnPublicAsset({
  domestic: "home-widget/update/20260904/hilo-update-zh.jpg",
  overseas: "home-widget/update/20260904/hilo-update-en.jpg",
});
export const CDN_BROWSER_INSPIRATION_FALLBACK = cdnPublicAsset({
  domestic: "browser-inspiration-fallback-2fe765c826fb.png",
  overseas: "browser-inspiration-fallback-2fe765c826fb.png",
});
export const CDN_TRIAL_GRANTED_ICON = cdnRegionalImage({
  domestic: "6300a240-c39b-4bc7-99a7-928e449f878b.png",
  overseas: "49079329-9416-45d4-a7c2-b91bf8e2c0c6.png",
});
export const CDN_WORKSPACE_DISPLAY_MODE_CHAT_CANVAS = cdnRegionalImage({
  domestic: "7c41c493-115c-4142-ac6d-9ffbcbca486f.webp",
  overseas: "c887b72b-5029-4f98-be42-a2fbd5303f57.webp",
});
export const CDN_WORKSPACE_DISPLAY_MODE_CANVAS_CHAT = cdnRegionalImage({
  domestic: "78500e41-e6fe-40d9-b8dd-993e949c0dd1.webp",
  overseas: "944d2c09-b722-4091-9066-265a213040a1.webp",
});
export const CDN_WORKSPACE_DISPLAY_MODE_CANVAS = cdnRegionalImage({
  domestic: "5182abff-4c9a-4dda-bab8-49af46589b35.webp",
  overseas: "e6e3cbc2-7e4d-4222-8a2c-94237418dbea.webp",
});
export const CDN_WORKSPACE_DISPLAY_MODE_CHAT = cdnRegionalImage({
  domestic: "49ac5b47-5644-4b38-b48a-cfaa7bc79778.webp",
  overseas: "80f71b2d-3610-4bb0-8858-a9adc979a626.webp",
});
function coachMarkSharedImage(fileName) {
  return `${COACHMARK_BASE_MAP[getCdnRegion()]}/${fileName}.png${OSS_WEBP}`;
}
export const CDN_COACHMARK_FILE_LOCATE = coachMarkImage("file-locate");
export const CDN_COACHMARK_FILE_VIEW = coachMarkImage("file-view");
export const CDN_COACHMARK_CANVAS_GROUP = coachMarkSharedImage("coachmark-canvas-group");
cdnRegionalVideo({
  domestic: "ac56b513-7c8e-4733-90e5-31b2c27fe90f.mp4",
  overseas: "a90e4204-370d-40e5-9748-a8a217f78072.mp4",
});
cdnRegionalFile({
  domestic: "4c8ca94a-af87-4ebd-8c43-3aa925f1e517.apng",
  overseas: "1ac0ea34-9ef4-429c-9517-a171549596cc.apng",
});
export const CDN_BLENDER_INSTALLER_MACOS_ARM64 = cdnPublicAsset({
  domestic: "blender-5.2.1-macos-arm64.dmg",
  overseas: "blender-5.2.1-macos-arm64.dmg",
});
export const CDN_BLENDER_INSTALLER_WINDOWS_X64 = cdnPublicAsset({
  domestic: "blender-5.2.1-windows-x64.msi",
  overseas: "blender-5.2.1-windows-x64.msi",
});
export const CDN_CONNECTOR_HUB = cdnRegionalImage({
  domestic: "connector-hub-512-283b2f4fd24a.png",
  overseas: "connector-hub-512-283b2f4fd24a.png",
});
cdnRegionalImage({
  domestic: "connector-fastmoss-512-79f6245a94c9.png",
  overseas: "connector-fastmoss-512-79f6245a94c9.png",
});
cdnRegionalImage({
  domestic: "connector-apify-512-dd30f9378883.png",
  overseas: "connector-apify-512-dd30f9378883.png",
});
cdnRegionalFile({
  domestic: "connector-figma-512-e3cd7426bddf.svg",
  overseas: "connector-figma-512-e3cd7426bddf.svg",
});
cdnRegionalImage({
  domestic: "connector-google-drive-512-51364cae70d5.png",
  overseas: "connector-google-drive-512-51364cae70d5.png",
});
cdnRegionalImage({
  domestic: "connector-blender-512-50a26c81c9fa.png",
  overseas: "connector-blender-512-50a26c81c9fa.png",
});
cdnRegionalImage({
  domestic: "connector-photoshop-512-b68f08d2cc2e.png",
  overseas: "connector-photoshop-512-b68f08d2cc2e.png",
});
cdnRegionalFile({
  domestic: "connector-illustrator-240-ec0699b75d6e.svg",
  overseas: "connector-illustrator-240-ec0699b75d6e.svg",
});
cdnRegionalImage({
  domestic: "connector-ae-512-4a0c57a5e437.png",
  overseas: "connector-ae-512-4a0c57a5e437.png",
});
cdnRegionalImage({
  domestic: "connector-houdini-512-e897f9fd1003.png",
  overseas: "connector-houdini-512-e897f9fd1003.png",
});
cdnRegionalImage({
  domestic: "connector-nuke-256-85bb8d0afeea.png",
  overseas: "connector-nuke-256-85bb8d0afeea.png",
});
cdnRegionalImage({
  domestic: "connector-touchdesigner-512-2dc62c398261.png",
  overseas: "connector-touchdesigner-512-2dc62c398261.png",
});
cdnRegionalImage({
  domestic: "connector-shopify-512-6d3c7dc89d20.png",
  overseas: "connector-shopify-512-6d3c7dc89d20.png",
});
cdnRegionalImage({
  domestic: "connector-quark-drive-512-da02dab6bb3a.png",
  overseas: "connector-quark-drive-512-da02dab6bb3a.png",
});
cdnRegionalImage({
  domestic: "connector-unity-512-d63232dfa177.png",
  overseas: "connector-unity-512-d63232dfa177.png",
});
cdnRegionalImage({
  domestic: "connector-unreal-512-d53cbf00adf2.png",
  overseas: "connector-unreal-512-d53cbf00adf2.png",
});
cdnRegionalImage({
  domestic: "621c0aa5-f176-4dbf-8c3f-bd7edc0e64d5.png",
  overseas: "81bc8704-884b-489c-877a-77ca392bdb89.png",
});
cdnRegionalVideo({
  domestic: "d6839ff2-3bf3-4712-b906-4cb0f8bd844a.mp4",
  overseas: "b5a5039e-8677-45b5-896a-522d218d629b.mp4",
});
cdnRegionalVideo({
  domestic: "492deead-c992-493a-bd63-e74c604c1885.mp4",
  overseas: "5134aa13-f95b-45aa-9263-4845c9ea2950.mp4",
});
