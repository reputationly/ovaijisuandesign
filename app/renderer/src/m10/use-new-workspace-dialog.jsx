// use-new-workspace-dialog.jsx
import { useTranslation, reactExports, dedupedToast, AlertTriangle, useQuery, useStorage, usePlatform, API_PATHS, X$7, workspaceLog, instance } from "../vendor.js";
import { gatewayFetch } from "../m15/agent-ws-client.jsx";
import { OPEN_NEW_WORKSPACE_DIALOG_EVENT, NewWorkspaceDialogContext, applyWorkspaceDisplayNameRename, classifySkillError, TOAST_ID$1 } from "../m15/deferred-thumbnail-image-generation.jsx";
import { compileToolDisplayPatterns, EMPTY_TOOL_CALL_DISPLAY_CONFIG, refreshToolCallDisplayConfig, mapHubClientConfig, HUB_CLIENT_CONFIG_REFRESH_INTERVAL_MS, DEFAULT_HUB_CLIENT_CONFIG } from "../m15/interest-selection-provider.jsx";
import { truncateProjectName } from "../m15/push-inline.js";
import { checkTextSafety } from "../m15/record-recent-workspace-opened.jsx";
import { setModalScheduleConfig } from "../m15/thumbnail-load-scheduler.jsx";
import { TRACK_EVENTS } from "../m15/track-events.js";
import { useTopbarActions } from "../m15/use-hub-logo-hover-animation.jsx";
import { folderNameFromPath, useRuntimeConfig, workspaceDisplayName } from "../m15/use-resizable-width.js";
import { instantiationService, IProjectMainService } from "../m08/browser-inspiration-urls.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useGatewayReady } from "./hub-logo.jsx";
import { NewWorkspaceDialog } from "./new-workspace-dialog.jsx";
export function NewWorkspaceDialogProvider({ children: children2 }) {
  const { createWorkspace } = useTopbarActions();
  const [open, setOpen] = reactExports.useState(false);
  const [presetProjectId, setPresetProjectId] = reactExports.useState(void 0);
  const confirmHandlerRef = reactExports.useRef(null);
  const defaultConfirm = reactExports.useCallback(
    (name2, options) => {
      return createWorkspace(name2, options);
    },
    [createWorkspace],
  );
  const requestOpen = reactExports.useCallback((onConfirm, nextPresetProjectId) => {
    confirmHandlerRef.current = onConfirm ?? null;
    setPresetProjectId(nextPresetProjectId);
    setOpen(true);
  }, []);
  const close2 = reactExports.useCallback(() => {
    confirmHandlerRef.current = null;
    setPresetProjectId(void 0);
    setOpen(false);
  }, []);
  reactExports.useEffect(() => {
    const handleOpen = () => requestOpen();
    window.addEventListener(OPEN_NEW_WORKSPACE_DIALOG_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_NEW_WORKSPACE_DIALOG_EVENT, handleOpen);
  }, [requestOpen]);
  const handleConfirm = reactExports.useCallback(
    (name2, options) => {
      const handler = confirmHandlerRef.current ?? defaultConfirm;
      confirmHandlerRef.current = null;
      return handler(name2, options);
    },
    [defaultConfirm],
  );
  const handleOpenChange = reactExports.useCallback((nextOpen) => {
    if (!nextOpen) {
      confirmHandlerRef.current = null;
      setPresetProjectId(void 0);
    }
    setOpen(nextOpen);
  }, []);
  const value = reactExports.useMemo(
    () => ({
      open,
      requestOpen,
      close: close2,
    }),
    [close2, open, requestOpen],
  );
  return (
    <NewWorkspaceDialogContext value={value}>
      {children2}
      <NewWorkspaceDialog
        open={open}
        onOpenChange={handleOpenChange}
        onConfirm={handleConfirm}
        defaultProjectId={presetProjectId}
      />
    </NewWorkspaceDialogContext>
  );
}
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
            if (hasWorkspaceDisplayNameConflict(workspaces, workspacePath, newName)) {
              conflicted = true;
              return workspaces;
            }
            return applyWorkspaceDisplayNameRename(workspaces, workspacePath, newName);
          };
          let ok2 = true;
          if (Array.isArray(persisted)) {
            const next2 = renameUnlessConflict(persisted);
            if (!conflicted) ok2 = await setRecentWorkspacesAsync(next2);
          } else {
            ok2 = await setRecentWorkspacesAsync((prev) => renameUnlessConflict(prev));
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
          dedupedToast.error(t2("workspace.newProject.projectFolderCheckFailed"));
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
  const messageKey = opts.isUpdate ? "skills.market.updateSuccess" : "skills.market.installSuccess";
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
        <X$7 className="size-4" />
      </button>
    </div>
  );
}
function showLowMemoryToast(payload) {
  dedupedToast.custom((id2) => <LowMemoryToastContent payload={payload} toastId={id2} />, {
    duration: 15e3,
    id: TOAST_ID$1,
  });
}
export function LowMemoryToast() {
  const pendingPayloadRef = reactExports.useRef(null);
  const showOrDefer = reactExports.useCallback((payload) => {
    if (document.visibilityState === "visible" && document.hasFocus()) {
      showLowMemoryToast(payload);
      return;
    }
    pendingPayloadRef.current = payload;
  }, []);
  const flushPending = reactExports.useCallback(() => {
    if (document.visibilityState !== "visible" || !document.hasFocus()) return;
    const payload = pendingPayloadRef.current;
    if (!payload) return;
    pendingPayloadRef.current = null;
    showLowMemoryToast(payload);
  }, []);
  reactExports.useEffect(() => {
    if (typeof hilo === "undefined") return;
    return hilo.diagnostics.onLowMemory((payload) => {
      showOrDefer(payload);
    });
  }, [showOrDefer]);
  reactExports.useEffect(() => {
    document.addEventListener("visibilitychange", flushPending);
    window.addEventListener("focus", flushPending);
    return () => {
      document.removeEventListener("visibilitychange", flushPending);
      window.removeEventListener("focus", flushPending);
    };
  }, [flushPending]);
  return null;
}
export function useHubClientConfig() {
  const gatewayReady = useGatewayReady();
  const { region, channel } = useRuntimeConfig();
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("zh") ? "zh" : "en";
  const { data: data2, error } = useQuery({
    queryKey: ["hub-client-config", region, channel, locale],
    queryFn: async () => {
      void refreshToolCallDisplayConfig();
      const response = await gatewayFetch(API_PATHS.hubClientConfig);
      if (!response.ok) throw new Error(`hub_client_config HTTP ${response.status}`);
      return mapHubClientConfig(await response.json(), locale);
    },
    enabled: gatewayReady,
    staleTime: HUB_CLIENT_CONFIG_REFRESH_INTERVAL_MS,
    refetchInterval: HUB_CLIENT_CONFIG_REFRESH_INTERVAL_MS,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    retry: false,
    throwOnError: false,
  });
  return !gatewayReady || error ? DEFAULT_HUB_CLIENT_CONFIG : (data2 ?? DEFAULT_HUB_CLIENT_CONFIG);
}
export function ModalSchedulerBridge() {
  const { startupModalSchedule } = useHubClientConfig();
  reactExports.useEffect(() => {
    setModalScheduleConfig(startupModalSchedule);
  }, [startupModalSchedule]);
  return null;
}
