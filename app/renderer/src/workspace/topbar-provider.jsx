// topbar-provider.jsx
import { useTranslation, reactExports, dedupedToast, useQuery, useStorage, usePlatform, useNavigate, workspaceLog } from "../vendor.js";
import { recordAction } from "../infra/agent-ws-client.jsx";
import { useAuth, hideVisiblePreviewTabs, requestWorkspaceRuntimeClose } from "../assets/apply-asset-change.jsx";
import { showVisiblePreviewTab, useNavigateToWorkspace, buildWorkspaceSearch } from "./create-visible-preview-tabs-store.js";
import { workspaceThumbnailsQueryKey, fetchWorkspaceThumbnails, WORKSPACE_THUMBNAILS_STALE_TIME, usePersistPickedWorkspaceName, useIsKnownWorkspacePath, shouldActivateWorkspaceThroughRoute, activateWorkspaceIfAvailable, performWorkspacePreviewHide, performOtherWorkspacePreviewsHide, performWorkspacePreviewsToRightHide } from "./deferred-thumbnail-image-generation.jsx";
import { projectLog } from "../vendor-inline/vscode-base/graph.jsx";
import { useRouterState } from "../vendor-inline/vscode-base/linked-list.js";
import { Users } from "../media-editing/parse-item.jsx";
import { normalizeWorkspaceId, useActiveRuntime, useWindowTitleSync, useLastActivePersistence, setTopbarActiveWorkspaceSnapshot } from "../settings/run-manual-update-check.js";
import { useLoginGuard } from "../infra/thumbnail-load-scheduler.jsx";
import { useWorkspaceFocusNavigation, TopbarStateContext, TopbarActionsContext } from "./use-hub-logo-hover-animation.jsx";
import { workspaceDisplayName } from "../generation/use-resizable-width.js";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  cn$2,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useProjectActions } from "../settings/custom-provider-form.jsx";
import { MIME_BY_EXT, parseProjectInviteParams, useGatewayReady } from "../infra/hub-logo.jsx";
import {
  handleNewWorkspaceOpenResult,
  stageWorkspacePreview,
  useCompletedTasks,
  useTopbarEntries,
} from "./new-workspace-dialog.jsx";
const TYPE_FALLBACK_MIME = {
  image: "image/*",
  audio: "audio/*",
  video: "video/*",
  file: "application/octet-stream",
};
export function inferArtifactMime(url2, type2) {
  if (!url2) return TYPE_FALLBACK_MIME[type2];
  const clean = url2.split("?")[0]?.split("#")[0] ?? "";
  const dot2 = clean.lastIndexOf(".");
  if (dot2 < 0) return TYPE_FALLBACK_MIME[type2];
  const ext = clean.slice(dot2 + 1).toLowerCase();
  return MIME_BY_EXT[ext] ?? TYPE_FALLBACK_MIME[type2];
}
export function useWorkspaceThumbnails(workspacePath, enabled = true) {
  const gatewayReady = useGatewayReady();
  return useQuery({
    queryKey: workspaceThumbnailsQueryKey(workspacePath),
    queryFn: () => fetchWorkspaceThumbnails(workspacePath),
    enabled: gatewayReady && enabled,
    staleTime: WORKSPACE_THUMBNAILS_STALE_TIME,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
function useProjectInviteDeepLink() {
  const [pendingInvite, setPendingInvite] = reactExports.useState(null);
  const recentTokensRef = reactExports.useRef(new Map());
  reactExports.useEffect(() => {
    if (!window.hilo?.projectInvite) return;
    const off = window.hilo.projectInvite.onReceived((action) => {
      const payload = parseProjectInviteParams(action.params);
      if (!payload) {
        projectLog.warn("invite-deeplink unusable", {
          params: Object.keys(action.params).join(","),
        });
        return;
      }
      const now2 = Date.now();
      const seenAt = recentTokensRef.current.get(payload.token);
      if (seenAt && now2 - seenAt < 3e3) {
        projectLog.info("invite-deeplink deduped", {
          ageMs: now2 - seenAt,
        });
        return;
      }
      recentTokensRef.current.set(payload.token, now2);
      for (const [token2, ts2] of recentTokensRef.current) {
        if (now2 - ts2 >= 3e3) recentTokensRef.current.delete(token2);
      }
      projectLog.info("invite-deeplink received", {
        projectName: payload.projectName,
        inviterName: payload.inviterName,
        memberCount: payload.memberCount,
      });
      setPendingInvite(payload);
    });
    return off;
  }, []);
  const dismiss = reactExports.useCallback(() => setPendingInvite(null), []);
  return {
    pendingInvite,
    dismiss,
  };
}
function ProjectFolderPreview({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn$2("relative overflow-visible", className)}
      data-action-ui-id="project.folder-preview"
    >
      <span className="pointer-events-none absolute inset-x-0 top-1 bottom-0 z-0 rounded-[24px] border border-[color:color-mix(in_srgb,var(--sidebar-foreground)_4%,transparent)] bg-[color:color-mix(in_srgb,var(--sidebar-accent)_98%,var(--sidebar-foreground))] shadow-[0_1px_3px_rgba(0,0,0,0.04)]" />
      <div className="pointer-events-none absolute inset-x-5 top-4 h-[64%]">
        <div className="absolute inset-x-3 top-0 h-[88%] -rotate-3 rounded-[18px] bg-muted shadow-[0_3px_8px_rgba(0,0,0,0.10)]" />
        <div className="absolute -inset-x-0.5 top-3 h-[88%] rotate-2 rounded-[18px] border border-border bg-card shadow-[0_4px_10px_rgba(0,0,0,0.14)]" />
      </div>
      <span className="pointer-events-none absolute top-[40%] left-0 h-5 w-24 translate-y-px rounded-t-[32px] border border-b-0 border-[color:color-mix(in_srgb,var(--sidebar-foreground)_4%,transparent)] bg-[color:color-mix(in_srgb,color-mix(in_srgb,var(--sidebar-accent)_98%,var(--sidebar-foreground))_88%,transparent)] backdrop-blur-[6px]" />
      <div className="absolute inset-x-0 bottom-0 top-[calc(40%+20px)] rounded-tr-[30px] rounded-b-[24px] border border-t-0 border-[color:color-mix(in_srgb,var(--sidebar-foreground)_4%,transparent)] bg-[color:color-mix(in_srgb,color-mix(in_srgb,var(--sidebar-accent)_98%,var(--sidebar-foreground))_88%,transparent)] backdrop-blur-[6px]">
        <span
          className="absolute left-5 top-3 flex size-5 items-center justify-center rounded-full bg-sidebar/70 text-sidebar-foreground/60"
          data-action-ui-id="project.folder-preview-badge"
        >
          <Users size={12} strokeWidth={1.5} aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
export function ProjectInvitePrompt() {
  const { t: t2 } = useTranslation();
  const navigate = useNavigate();
  const { pendingInvite, dismiss } = useProjectInviteDeepLink();
  const { isLoggedIn, unauthenticatedReason } = useAuth();
  const { guard: loginGuard } = useLoginGuard();
  const { acceptProjectInviteToken } = useProjectActions({
    enabled: isLoggedIn || unauthenticatedReason === "expired",
  });
  const [accepting, setAccepting] = reactExports.useState(false);
  const handleAccept = reactExports.useCallback(async () => {
    if (!pendingInvite || accepting) return;
    if (!loginGuard()) {
      projectLog.info("accept-invite blocked by login");
      return;
    }
    setAccepting(true);
    try {
      const result = await acceptProjectInviteToken(pendingInvite.token);
      if (!result.projectId) {
        dedupedToast.error(result.errorMessage || t2("project.invite.acceptFailed"));
        return;
      }
      dismiss();
      void navigate({
        to: "/projects/$projectId",
        params: {
          projectId: result.projectId,
        },
        search: {
          tab: "cloudAssets",
        },
      });
    } finally {
      setAccepting(false);
    }
  }, [accepting, acceptProjectInviteToken, dismiss, loginGuard, navigate, pendingInvite, t2]);
  const handleDecline = reactExports.useCallback(() => {
    projectLog.info("invite-prompt declined");
    dismiss();
  }, [dismiss]);
  if (!pendingInvite) return null;
  const projectName = pendingInvite.projectName || t2("project.invite.card.unknownProject");
  const inviteLine = pendingInvite.inviterName
    ? t2("project.invite.card.inviteLine", {
        inviter: pendingInvite.inviterName,
      })
    : t2("project.invite.card.inviteLineAnonymous");
  return (
    <AlertDialog open={true} onOpenChange={(open) => !open && !accepting && handleDecline()}>
      <AlertDialogContent size="sm" data-action-ui-id="project.invite-prompt">
        <div className="flex w-full min-w-0 flex-col items-center gap-4">
          <ProjectFolderPreview className="h-32 w-44 shrink-0" />
          <AlertDialogHeader className="w-full min-w-0 items-center text-center">
            <AlertDialogTitle className="w-full max-w-full truncate text-center">
              {projectName}
            </AlertDialogTitle>
            <AlertDialogDescription className="w-full max-w-full text-center break-words">
              {inviteLine}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel disabled={accepting} data-action-ui-id="project.invite-decline">
            {t2("project.invite.card.decline")}
          </AlertDialogCancel>
          <AlertDialogAction
            loading={accepting}
            onClick={() => void handleAccept()}
            data-action-ui-id="project.invite-accept"
          >
            {t2("project.invite.card.accept")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function useProjectDelete(deleteProject) {
  const { t: t2 } = useTranslation();
  const [pendingDelete, setPendingDelete] = reactExports.useState(null);
  const handleCancelDelete = reactExports.useCallback(() => setPendingDelete(null), []);
  const handleConfirmDelete = reactExports.useCallback(() => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    void deleteProject(target).then((result) => {
      if (result.errorCode === "project-transfer-active") {
        dedupedToast.warning(t2("project.dissolve.transferActive"));
      } else if (result.errorCode === "project-hide-failed") {
        dedupedToast.error(t2("project.dissolve.failed"));
      } else if (result.errorMessage || result.errorCode === "cloud-request-failed") {
        dedupedToast.error(result.errorMessage ?? t2("project.dissolve.failed"));
      }
    });
  }, [deleteProject, pendingDelete, t2]);
  return {
    pendingDelete,
    requestDelete: setPendingDelete,
    confirmDelete: handleConfirmDelete,
    cancelDelete: handleCancelDelete,
  };
}
function useTopbarNavigation(
  hiloApp2,
  allEntries,
  previewEntries,
  currentWorkspaceId,
  workspaceSnapshots,
) {
  const platform2 = usePlatform();
  const { t: t2 } = useTranslation();
  const navigate = useNavigate();
  const navigateToWorkspace = useNavigateToWorkspace();
  const persistPickedWorkspaceName = usePersistPickedWorkspaceName();
  const isKnownWorkspacePath = useIsKnownWorkspacePath();
  const { addWorkspaceToProject } = useProjectActions();
  const allEntriesRef = reactExports.useRef(allEntries);
  allEntriesRef.current = allEntries;
  const entriesRef = reactExports.useRef(previewEntries);
  entriesRef.current = previewEntries;
  const currentWorkspaceIdRef = reactExports.useRef(currentWorkspaceId);
  currentWorkspaceIdRef.current = currentWorkspaceId;
  const workspaceSnapshotsRef = reactExports.useRef(workspaceSnapshots);
  workspaceSnapshotsRef.current = workspaceSnapshots;
  const activateHome = reactExports.useCallback(() => {
    void hiloApp2.activateHome();
    void navigate({
      to: "/",
    });
  }, [hiloApp2, navigate]);
  const activateWorkspace = reactExports.useCallback(
    (workspaceId2) => {
      showVisiblePreviewTab(workspaceId2);
      if (shouldActivateWorkspaceThroughRoute(allEntriesRef.current, workspaceId2)) {
        void navigate({
          to: "/workspace",
          search: buildWorkspaceSearch(workspaceId2),
        });
        return;
      }
      void activateWorkspaceIfAvailable(hiloApp2, workspaceId2, (activatedWorkspaceId) => {
        showVisiblePreviewTab(activatedWorkspaceId);
        return navigate({
          to: "/workspace",
          search: buildWorkspaceSearch(activatedWorkspaceId),
        });
      }).catch((err) => {
        console.error("[Topbar] activateWorkspace failed:", err);
      });
    },
    [hiloApp2, navigate],
  );
  const requestRuntimeClose = reactExports.useCallback(
    (workspaceId2, source) => {
      void requestWorkspaceRuntimeClose(hiloApp2, workspaceId2, source);
    },
    [hiloApp2],
  );
  const closeWorkspace = reactExports.useCallback(
    (workspaceId2, source = "topbar") => {
      const activeTaskCount = workspaceSnapshotsRef.current.get(workspaceId2)?.tasks.length ?? 0;
      performWorkspacePreviewHide(
        entriesRef.current,
        workspaceId2,
        currentWorkspaceIdRef.current,
        activeTaskCount,
        source,
        {
          hidePreview: (id2) => hideVisiblePreviewTabs(id2),
          activateWorkspace,
          activateHome,
          requestRuntimeClose,
          record: (properties2) => recordAction("workspace:preview-hidden", properties2),
        },
      );
    },
    [activateHome, activateWorkspace, requestRuntimeClose],
  );
  const closeOtherWorkspacePreviews = reactExports.useCallback(
    (workspaceId2) => {
      performOtherWorkspacePreviewsHide(
        entriesRef.current,
        workspaceId2,
        currentWorkspaceIdRef.current,
        {
          hidePreviews: (ids2) => hideVisiblePreviewTabs(ids2),
          activateWorkspace,
          requestRuntimeClose,
          record: (properties2) => recordAction("workspace:preview-hidden-batch", properties2),
        },
      );
    },
    [activateWorkspace, requestRuntimeClose],
  );
  const closeWorkspacePreviewsToRight = reactExports.useCallback(
    (workspaceId2) => {
      performWorkspacePreviewsToRightHide(
        entriesRef.current,
        workspaceId2,
        currentWorkspaceIdRef.current,
        {
          hidePreviews: (ids2) => hideVisiblePreviewTabs(ids2),
          activateWorkspace,
          requestRuntimeClose,
          record: (properties2) => recordAction("workspace:preview-hidden-batch", properties2),
        },
      );
    },
    [activateWorkspace, requestRuntimeClose],
  );
  const createWorkspace = reactExports.useCallback(
    async (name2, options, navigateOptions) => {
      const pickedFolder = options?.folderPath;
      const targetProjectId = options?.projectId;
      if (pickedFolder) {
        workspaceLog.info("topbar: open-workspace-start", {
          source: "topbar-new",
        });
      }
      const alreadyKnown = pickedFolder ? await isKnownWorkspacePath(pickedFolder) : false;
      if (pickedFolder && alreadyKnown) {
        if (targetProjectId)
          await addWorkspaceToProject(pickedFolder, targetProjectId, "workspace-create");
        const staged = await stageWorkspacePreview({
          hiloApp: hiloApp2,
          folderPath: pickedFolder,
          t: t2,
          onStaged: (entry) =>
            navigate({
              to: "/workspace",
              search: buildWorkspaceSearch(entry.workspaceId, navigateOptions),
            }),
        });
        return Boolean(staged);
      }
      const result = await hiloApp2.createWorkspaceWithResult({
        name: name2,
        folderPath: pickedFolder,
        projectId: targetProjectId,
        parentFolderPath: options?.parentFolderPath,
        loadUserMemory: options?.loadUserMemory,
        allowDataDirectoryFallback: options?.allowDataDirectoryFallback,
      });
      if (pickedFolder) {
        workspaceLog.info("topbar: open-workspace-result", {
          kind: result.kind,
        });
        if ((result.kind === "opened" || result.kind === "reused") && name2) {
          await persistPickedWorkspaceName(result.runtime.folderPath, name2);
        }
      }
      if (targetProjectId && (result.kind === "opened" || result.kind === "reused")) {
        await addWorkspaceToProject(result.runtime.folderPath, targetProjectId, "workspace-create");
      }
      return Boolean(
        handleNewWorkspaceOpenResult(
          result,
          t2,
          (runtime) => navigateToWorkspace(runtime, navigateOptions),
          alreadyKnown,
        ),
      );
    },
    [
      addWorkspaceToProject,
      hiloApp2,
      isKnownWorkspacePath,
      navigate,
      navigateToWorkspace,
      persistPickedWorkspaceName,
      t2,
    ],
  );
  const openWorkspaceFromDialog = reactExports.useCallback(() => {
    void (async () => {
      const paths = await platform2.fs.showOpenDialog?.({
        directory: true,
      });
      const folderPath = paths?.[0];
      if (!folderPath) return;
      await stageWorkspacePreview({
        hiloApp: hiloApp2,
        folderPath,
        t: t2,
        onStaged: (entry) =>
          navigate({
            to: "/workspace",
            search: buildWorkspaceSearch(entry.workspaceId),
          }),
      });
    })();
  }, [hiloApp2, navigate, platform2.fs, t2]);
  return {
    activateHome,
    activateWorkspace,
    closeWorkspace,
    closeOtherWorkspacePreviews,
    closeWorkspacePreviewsToRight,
    createWorkspace,
    openWorkspaceFromDialog,
  };
}
export function TopbarProvider({ children: children2 }) {
  const platform2 = usePlatform();
  const routerLocation = useRouterState({
    select: (state2) => ({
      pathname: state2.location.pathname,
      search: state2.location.search,
    }),
  });
  const routerSearch = routerLocation.search;
  const isWorkspaceRoute = routerLocation.pathname.startsWith("/workspace");
  const currentWorkspaceId = normalizeWorkspaceId(routerSearch?.workspaceId) ?? null;
  const isHomeActive = currentWorkspaceId === null;
  const {
    entries: rawEntries,
    previewEntries: rawPreviewEntries,
    workspaceSnapshots,
    hiloApp: hiloApp2,
    reorderTabs,
    reportWorkspaceSnapshot,
  } = useTopbarEntries();
  const [recentWorkspaces] = useStorage("global.recentWorkspaces");
  const entries2 = reactExports.useMemo(() => {
    if (rawEntries.length === 0) return rawEntries;
    return rawEntries.map((entry) => {
      const recent = recentWorkspaces.find((w3) => w3.path === entry.folderPath);
      if (!recent) return entry;
      const resolved = workspaceDisplayName(recent);
      return resolved === entry.projectName
        ? entry
        : {
            ...entry,
            projectName: resolved,
          };
    });
  }, [rawEntries, recentWorkspaces]);
  const previewEntries = reactExports.useMemo(() => {
    const entriesById = new Map(entries2.map((entry) => [entry.workspaceId, entry]));
    return rawPreviewEntries.map((entry) => entriesById.get(entry.workspaceId) ?? entry);
  }, [entries2, rawPreviewEntries]);
  reactExports.useEffect(() => {
    if (currentWorkspaceId) showVisiblePreviewTab(currentWorkspaceId);
  }, [currentWorkspaceId]);
  reactExports.useEffect(() => {
    if (isWorkspaceRoute) return;
    void hiloApp2.activateHome().catch((error) => {
      console.error("[Topbar] activateHome failed after global navigation:", error);
    });
  }, [hiloApp2, isWorkspaceRoute]);
  useWindowTitleSync(entries2, currentWorkspaceId, platform2);
  useLastActivePersistence(currentWorkspaceId, platform2);
  const activeRuntime = useActiveRuntime(currentWorkspaceId, hiloApp2);
  reactExports.useEffect(() => {
    setTopbarActiveWorkspaceSnapshot({
      currentWorkspaceId,
      activeRuntime,
    });
  }, [activeRuntime, currentWorkspaceId]);
  reactExports.useEffect(() => {
    return () => {
      setTopbarActiveWorkspaceSnapshot({
        currentWorkspaceId: null,
        activeRuntime: null,
      });
    };
  }, []);
  const nav2 = useTopbarNavigation(
    hiloApp2,
    entries2,
    previewEntries,
    currentWorkspaceId,
    workspaceSnapshots,
  );
  const activeSnapshot = currentWorkspaceId ? workspaceSnapshots.get(currentWorkspaceId) : void 0;
  const activeTasks = reactExports.useMemo(
    () => Array.from(workspaceSnapshots.values()).flatMap((s2) => s2.tasks),
    [workspaceSnapshots],
  );
  const { navigateAndFocus } = useWorkspaceFocusNavigation(
    currentWorkspaceId,
    nav2.activateWorkspace,
  );
  const {
    completedTasks,
    unreadCompletedTaskCount,
    unreadCompletedTasks,
    reportTaskCompleted,
    dismissCompletedTask,
    markCompletedTasksRead,
    markWorkspaceCompletedTasksRead,
  } = useCompletedTasks(entries2, {
    activeWorkspaceId: currentWorkspaceId,
    activeTasks,
    onCompletionNotificationClick: navigateAndFocus,
  });
  reactExports.useEffect(() => {
    if (!currentWorkspaceId || unreadCompletedTaskCount === 0) return;
    markWorkspaceCompletedTasksRead(currentWorkspaceId);
  }, [currentWorkspaceId, unreadCompletedTaskCount, markWorkspaceCompletedTasksRead]);
  const workspaceStatusById = reactExports.useMemo(() => {
    const map3 = new Map();
    for (const task of activeTasks) {
      const prev = map3.get(task.workspaceId);
      const taskAction =
        task.status === "needs-answer"
          ? "answer"
          : task.status === "needs-confirmation"
            ? "confirmation"
            : void 0;
      const needsUserAction =
        prev?.needsUserAction === "answer" || taskAction === "answer"
          ? "answer"
          : (taskAction ?? prev?.needsUserAction);
      map3.set(task.workspaceId, {
        running: true,
        unread: prev?.unread ?? false,
        ...(needsUserAction
          ? {
              needsUserAction,
            }
          : {}),
      });
    }
    for (const task of unreadCompletedTasks) {
      if (task.workspaceId === currentWorkspaceId) continue;
      const prev = map3.get(task.workspaceId);
      map3.set(task.workspaceId, {
        running: prev?.running ?? false,
        unread: true,
        ...(prev?.needsUserAction
          ? {
              needsUserAction: prev.needsUserAction,
            }
          : {}),
      });
    }
    return map3;
  }, [activeTasks, unreadCompletedTasks, currentWorkspaceId]);
  const searchWorkspaces = reactExports.useMemo(
    () =>
      entries2.map((entry) => ({
        workspaceId: entry.workspaceId,
        workspaceName: entry.projectName,
        folderPath: entry.folderPath,
        gatewayUrl:
          entry.gatewayUrl ??
          (activeRuntime?.workspaceId === entry.workspaceId ? activeRuntime.gatewayUrl : ""),
        workspaceClaim:
          entry.workspaceClaim ??
          (activeRuntime?.workspaceId === entry.workspaceId
            ? activeRuntime.workspaceClaim
            : void 0),
        gatewayBinding:
          entry.gatewayBinding ??
          (activeRuntime?.workspaceId === entry.workspaceId
            ? activeRuntime.gatewayBinding
            : void 0),
        sessions: workspaceSnapshots.get(entry.workspaceId)?.sessions ?? [],
      })),
    [activeRuntime, entries2, workspaceSnapshots],
  );
  const stateValue = reactExports.useMemo(
    () => ({
      entries: entries2,
      previewEntries,
      currentWorkspaceId,
      isHomeActive,
      activeRuntime,
      searchSessions: activeSnapshot?.sessions ?? [],
      searchWorkspaces,
      activeTasks,
      completedTasks,
      unreadCompletedTaskCount,
      workspaceStatusById,
    }),
    [
      activeRuntime,
      activeSnapshot,
      activeTasks,
      completedTasks,
      unreadCompletedTaskCount,
      workspaceStatusById,
      entries2,
      previewEntries,
      currentWorkspaceId,
      isHomeActive,
      searchWorkspaces,
    ],
  );
  const actionsValue = reactExports.useMemo(
    () => ({
      ...nav2,
      reorderTabs,
      reportWorkspaceSnapshot,
      reportTaskCompleted,
      dismissCompletedTask,
      markCompletedTasksRead,
      markWorkspaceCompletedTasksRead,
    }),
    [
      nav2,
      reorderTabs,
      reportWorkspaceSnapshot,
      reportTaskCompleted,
      dismissCompletedTask,
      markCompletedTasksRead,
      markWorkspaceCompletedTasksRead,
    ],
  );
  return (
    <TopbarStateContext value={stateValue}>
      <TopbarActionsContext value={actionsValue}>{children2}</TopbarActionsContext>
    </TopbarStateContext>
  );
}
