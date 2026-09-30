import { h as useTranslation, v as useStorage, w as useNavigate, x as useNavigateToWorkspace, y as useLoginGuard, r as reactExports, z as sortRecentWorkspaces, B as usePersistPickedWorkspaceName, C as useIsKnownWorkspacePath, E as useProjectActions, F as workspaceLog, G as stageWorkspacePreview, H as homeService, t as trackEvent, T as TRACK_EVENTS, J as buildWorkspaceSearch, K as workspaceRuntimeFromOpenResult, M as handleNewWorkspaceOpenResult, N as useNewWorkspaceDialog, P as useRecentWorkspacesRefresh, j as jsxRuntimeExports, Q as Plus, U as PageStateBoundary } from "./index-CANVzzmD.js";
import { u as useWorkspaceAvailability } from "./use-workspace-availability-C9xXSOAk.js";
import { W as WorkspaceCard } from "./WorkspaceCard-C8b0Nrum.js";
function CreationsPage() {
  const { t } = useTranslation();
  const [recentWorkspaces] = useStorage("global.recentWorkspaces");
  const navigate = useNavigate();
  const navigateToWorkspace = useNavigateToWorkspace();
  const { guard: loginGuard, LoginDialog } = useLoginGuard();
  const sortedRecent = reactExports.useMemo(() => sortRecentWorkspaces(recentWorkspaces), [recentWorkspaces]);
  const unavailablePaths = useWorkspaceAvailability(sortedRecent);
  const persistPickedWorkspaceName = usePersistPickedWorkspaceName();
  const isKnownWorkspacePath = useIsKnownWorkspacePath();
  const { addWorkspaceToProject } = useProjectActions();
  const handleNewProject = reactExports.useCallback(
    async (name, options) => {
      if (!loginGuard()) return;
      if (options.folderPath) {
        workspaceLog.info("projects: open-workspace-start", { source: "projects-new" });
        const alreadyKnown = await isKnownWorkspacePath(options.folderPath);
        await stageWorkspacePreview({
          hiloApp: homeService.hiloApp,
          folderPath: options.folderPath,
          t,
          onStaged: async (entry) => {
            workspaceLog.info("projects: open-workspace-result", { kind: "staged" });
            if (!alreadyKnown) await persistPickedWorkspaceName(entry.folderPath, name);
            if (options.projectId)
              await addWorkspaceToProject(entry.folderPath, options.projectId, "creations-create");
            trackEvent(TRACK_EVENTS.WORKSPACE_OPEN, { source: "projects_new" });
            await navigate({
              to: "/workspace",
              search: buildWorkspaceSearch(entry.workspaceId)
            });
          }
        }).catch((err) => {
          workspaceLog.error("projects: open-workspace-error", { error: err });
        });
        return;
      }
      const result = await homeService.hiloApp.createWorkspaceWithResult({
        name,
        projectId: options.projectId,
        parentFolderPath: options.parentFolderPath,
        loadUserMemory: options.loadUserMemory,
        allowDataDirectoryFallback: options.allowDataDirectoryFallback
      }).catch(() => null);
      if (!result) return;
      const created = workspaceRuntimeFromOpenResult(result);
      if (options.projectId && created?.folderPath) {
        await addWorkspaceToProject(created.folderPath, options.projectId, "creations-create");
      }
      const runtime = handleNewWorkspaceOpenResult(result, t, navigateToWorkspace);
      if (runtime) trackEvent(TRACK_EVENTS.WORKSPACE_OPEN, { source: "projects_new" });
    },
    [
      addWorkspaceToProject,
      isKnownWorkspacePath,
      loginGuard,
      navigate,
      navigateToWorkspace,
      persistPickedWorkspaceName,
      t
    ]
  );
  const { requestOpen, dialog } = useNewWorkspaceDialog(handleNewProject);
  useRecentWorkspacesRefresh();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--home-content-surface)]", children: [
    LoginDialog,
    dialog,
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "sticky top-0 z-10 bg-[var(--home-content-surface)] px-16 pt-6 pb-4",
        "data-window-app-controls-safe-row": "true",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-[20px] font-heading font-medium leading-tight tracking-[0.02em] text-foreground", children: t("homeSidebar.allCreations") }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              "data-action-ui-id": "projects-create",
              onClick: requestOpen,
              className: "flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition-opacity",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 16, strokeWidth: 1.5 }),
                t("projects.create")
              ]
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-0 flex-1 flex-col px-16 pb-8", children: sortedRecent.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      PageStateBoundary,
      {
        empty: true,
        className: "min-h-80",
        emptyOptions: { title: t("recentProjects.empty") }
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4", children: sortedRecent.map((workspace) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      WorkspaceCard,
      {
        workspace,
        unavailable: unavailablePaths.has(workspace.path)
      },
      workspace.path
    )) }) })
  ] });
}
const SplitComponent = CreationsPage;
export {
  SplitComponent as component
};
