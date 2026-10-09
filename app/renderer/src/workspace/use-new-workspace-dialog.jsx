// use-new-workspace-dialog.jsx
import {
  classifySkillError,
  NewWorkspaceDialogContext,
} from "./tool-label-definitions.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import {
  AlertTriangle,
  dedupedToast,
  instance,
  reactExports,
  usePlatform,
  useStorage,
  useTranslation,
  workspaceLog,
  X$7 as X,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { instantiationService, IProjectMainService } from "./home-service.jsx";
import { NewWorkspaceDialog } from "./new-workspace-dialog.jsx";
import { truncateProjectName } from "../generation/normalize-skill-detail-metadata.js";
import {
  folderNameFromPath,
  workspaceDisplayName,
} from "../generation/use-model-catalog-scope-key.js";
import { applyWorkspaceDisplayNameRename } from "./record-recent-workspace-opened.js";
import { checkTextSafety } from "./asset-lineage-query-key.js";
const TOAST_ID = "low-memory-warning";
function useNewWorkspaceDialogContext() {
  return reactExports.useContext(NewWorkspaceDialogContext);
}
function hasWorkspaceDisplayNameConflict(workspaces, workspacePath, newName) {
  const folderName = folderNameFromPath(workspacePath);
  const trimmed = truncateProjectName(newName);
  if (!trimmed || trimmed === folderName) return false;
  const candidate = trimmed.toLowerCase();
  return workspaces.some(
    (workspace) =>
      workspace.path !== workspacePath &&
      workspaceDisplayName(workspace).toLowerCase() === candidate,
  );
}
export function useWorkspaceDisplayNameRename(workspacePath) {
  const [, , setRecentWorkspacesAsync] = useStorage("global.recentWorkspaces");
  const platform2 = usePlatform();
  const { t: t2 } = useTranslation();
  return reactExports.useCallback(
    (newName) => {
      void (async () => {
        try {
          const checkedName = truncateProjectName(newName);
          const safety = await checkTextSafety(checkedName);
          if (!safety.pass) {
            dedupedToast.error(t2("rename.safetyBlocked"));
            return;
          }
          const persisted = await platform2.storage
            ?.globalGet("recentWorkspaces")
            .catch(() => void 0);
          let conflicted = false;
          const renameUnlessConflict = (workspaces) => {
            if (
              hasWorkspaceDisplayNameConflict(
                workspaces,
                workspacePath,
                newName,
              )
            ) {
              conflicted = true;
              return workspaces;
            }
            return applyWorkspaceDisplayNameRename(
              workspaces,
              workspacePath,
              newName,
            );
          };
          let ok2 = true;
          if (Array.isArray(persisted)) {
            const next2 = renameUnlessConflict(persisted);
            if (!conflicted) ok2 = await setRecentWorkspacesAsync(next2);
          } else {
            ok2 = await setRecentWorkspacesAsync((prev) =>
              renameUnlessConflict(prev),
            );
          }
          if (conflicted) {
            dedupedToast.error(t2("home.workspace.duplicateName"));
            return;
          }
          if (!ok2) dedupedToast.error(t2("canvas.renameFailed"));
        } catch (error) {
          console.error("[workspace-display-name] rename failed:", error);
          dedupedToast.error(t2("canvas.renameFailed"));
        }
      })();
    },
    [workspacePath, setRecentWorkspacesAsync, platform2.storage, t2],
  );
}
export function useNewWorkspaceDialog(onConfirm) {
  const { t: t2 } = useTranslation();
  const shared = useNewWorkspaceDialogContext();
  const [open, setOpen] = reactExports.useState(false);
  const [presetProjectId, setPresetProjectId] = reactExports.useState(void 0);
  const requestOpenForProject = reactExports.useCallback(
    async (projectId) => {
      if (projectId) {
        try {
          const service2 = instantiationService.invokeFunction((accessor) =>
            accessor.get(IProjectMainService),
          );
          if (!(await service2.isProjectFolderAvailable(projectId))) {
            dedupedToast.error(t2("workspace.newProject.projectFolderMissing"));
            return;
          }
        } catch (error) {
          workspaceLog.error("new-workspace: project-folder-check-failed", {
            projectId,
            error,
          });
          dedupedToast.error(
            t2("workspace.newProject.projectFolderCheckFailed"),
          );
          return;
        }
      }
      if (shared) {
        shared.requestOpen(onConfirm, projectId);
        return;
      }
      setPresetProjectId(projectId);
      setOpen(true);
    },
    [onConfirm, shared, t2],
  );
  const requestOpen = reactExports.useCallback(
    () => requestOpenForProject(void 0),
    [requestOpenForProject],
  );
  if (shared) {
    return {
      open: shared.open,
      requestOpen,
      requestOpenForProject,
      dialog: null,
    };
  }
  const dialog = (
    <NewWorkspaceDialog
      open={open}
      onOpenChange={setOpen}
      onConfirm={onConfirm}
      defaultProjectId={presetProjectId}
    />
  );
  return {
    open,
    requestOpen,
    requestOpenForProject,
    dialog,
  };
}
export function trackSkillInstallEvent(props) {
  const payload = {
    skill_name: props.name,
    source: props.source,
  };
  if (props.version) payload.version = props.version;
  if (props.isUpdate) payload.is_update = true;
  if (props.previousVersion) payload.previous_version = props.previousVersion;
  if (props.via) payload.via = props.via;
  trackEvent(TRACK_EVENTS.SKILL_INSTALL, payload);
}
export function trackSkillInstallFailed(opts) {
  const err = classifySkillError(opts.error);
  const payload = {
    skill_name: opts.name,
    source: opts.source,
    ...err,
  };
  if (opts.version) payload.version = opts.version;
  if (opts.isUpdate) payload.is_update = true;
  if (opts.durationMs !== void 0) payload.duration_ms = opts.durationMs;
  if (opts.via) payload.via = opts.via;
  trackEvent(TRACK_EVENTS.SKILL_INSTALL_FAILED, payload);
}
export function trackSkillUninstall(name2, source) {
  trackEvent(TRACK_EVENTS.SKILL_UNINSTALL, {
    skill_name: name2,
    source,
  });
}
export function trackSkillUninstallFailed(opts) {
  const err = classifySkillError(opts.error);
  const payload = {
    skill_name: opts.name,
    source: opts.source,
    ...err,
  };
  trackEvent(TRACK_EVENTS.SKILL_UNINSTALL_FAILED, payload);
}
export function trackSkillToggle(name2, enabled, source) {
  trackEvent(TRACK_EVENTS.SKILL_TOGGLE, {
    skill_name: name2,
    enabled,
    source,
  });
}
export function trackSkillDetailView(props) {
  trackEvent(TRACK_EVENTS.SKILL_DETAIL_VIEW, {
    ...props,
  });
}
export function trackSkillTry(props) {
  const payload = {
    skill_name: props.skill_name,
    source: props.source,
    needs_install: props.needs_install,
    needs_enable: props.needs_enable,
  };
  if (props.via) payload.via = props.via;
  trackEvent(TRACK_EVENTS.SKILL_TRY, payload);
}
export function trackSkillExport(props) {
  trackEvent(TRACK_EVENTS.SKILL_EXPORT, {
    ...props,
  });
}
export function trackSkillImport(props) {
  const payload = {
    file_ext: props.file_ext,
    result: props.result,
  };
  if (props.skill_name) payload.skill_name = props.skill_name;
  if (props.auto_fixed) payload.auto_fixed = true;
  trackEvent(TRACK_EVENTS.SKILL_IMPORT, payload);
}
export function trackSkillImportFailed(opts) {
  const baseErr = classifySkillError(opts.error);
  const payload = {
    file_ext: opts.fileExt,
    ...baseErr,
  };
  if (opts.name) payload.skill_name = opts.name;
  if (opts.errorType) payload.error_type = opts.errorType;
  if (opts.errorCode !== void 0) payload.error_code = opts.errorCode;
  trackEvent(TRACK_EVENTS.SKILL_IMPORT_FAILED, payload);
}
export function trackSkillSearch(props) {
  const payload = {
    tab: props.tab,
    query_length: props.query_length,
  };
  if (props.result_count !== void 0) payload.result_count = props.result_count;
  trackEvent(TRACK_EVENTS.SKILL_SEARCH, payload);
}
export function trackSkillFilter(props) {
  trackEvent(TRACK_EVENTS.SKILL_FILTER, {
    tab: props.tab,
    tag: props.tag,
  });
}
export function trackSkillLoadMore(props) {
  trackEvent(TRACK_EVENTS.SKILL_LOAD_MORE, {
    page: props.page,
    query_length: props.query_length,
  });
}
export function trackSkillTabSwitch(props) {
  trackEvent(TRACK_EVENTS.SKILL_TAB_SWITCH, {
    from: props.from,
    to: props.to,
  });
}
export function trackSkillMarketOpen(source) {
  trackEvent(TRACK_EVENTS.SKILL_MARKET_OPEN, {
    source,
  });
}
export function trackSkillInvoke(props) {
  trackEvent(TRACK_EVENTS.SKILL_INVOKE, {
    skill_name: props.name,
    source: props.source,
  });
}
export function trackSkillCreatorInvoke(source) {
  trackEvent(TRACK_EVENTS.SKILL_CREATOR_INVOKE, {
    source,
  });
}
function trackSkillDebugOpen(props) {
  trackEvent(TRACK_EVENTS.SKILL_DEBUG_OPEN, {
    skill_name: props.skill_name,
    source: props.source,
  });
}
export function showSkillInstallSuccessToast(skillName, opts = {}) {
  const messageKey = opts.isUpdate
    ? "skills.market.updateSuccess"
    : "skills.market.installSuccess";
  const message2 = instance.t(messageKey, {
    name: skillName,
  });
  if (!opts.onDebugClick) {
    dedupedToast.success(
      message2,
      opts.id !== void 0
        ? {
            id: opts.id,
          }
        : void 0,
    );
    return;
  }
  dedupedToast.success(message2, {
    id: opts.id,
    action: {
      label: instance.t("skills.installSuccess.debugAction", "去调试"),
      onClick: () => {
        trackSkillDebugOpen({
          skill_name: skillName,
          source: "post_install_toast",
        });
        opts.onDebugClick?.();
      },
    },
  });
}
function LowMemoryToastContent({ payload, toastId }) {
  const { t: t2 } = useTranslation();
  return (
    <div className="elevated-surface-border-width flex items-start gap-3 w-full rounded-lg border-yellow-500/30 bg-popover p-4 text-popover-foreground shadow-lg">
      <AlertTriangle className="size-5 text-yellow-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {t2("memory.lowToast.title", "System memory is running low")}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t2(
            "memory.lowToast.description",
            "Available memory ({{available}}MB) has stayed below {{threshold}}MB, which may affect MiniMax Design performance. Please close other large applications to free memory.",
            {
              available: payload.availableMemMB,
              threshold: payload.thresholdMB,
            },
          )}
        </p>
      </div>
      <button
        type="button"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => dedupedToast.dismiss(toastId)}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
export function showLowMemoryToast(payload) {
  dedupedToast.custom(
    (id2) => <LowMemoryToastContent payload={payload} toastId={id2} />,
    {
      duration: 15e3,
      id: TOAST_ID,
    },
  );
}
