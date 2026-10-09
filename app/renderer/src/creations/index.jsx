import {
  h as useTranslation,
  v as useStorage,
  w as useNavigate,
  x as useNavigateToWorkspace,
  y as useLoginGuard,
  r as reactExports,
  z as sortRecentWorkspaces,
  B as usePersistPickedWorkspaceName,
  C as useIsKnownWorkspacePath,
  E as useProjectActions,
  F as workspaceLog,
  G as stageWorkspacePreview,
  H as homeService,
  t as trackEvent,
  T as TRACK_EVENTS,
  J as buildWorkspaceSearch,
  K as workspaceRuntimeFromOpenResult,
  M as handleNewWorkspaceOpenResult,
  N as useNewWorkspaceDialog,
  P as useRecentWorkspacesRefresh,
  j as jsxRuntimeExports,
  Q as Plus,
  U as PageStateBoundary,
} from "../main.jsx";
import { u as useWorkspaceAvailability } from "../use-workspace-availability-Dj4GHjzL.js";
import { W as WorkspaceCard } from "../WorkspaceCard-vSPE0nQy.js";
import { __jsx } from "../shared/jsx-runtime.js";
function CreationsPage() {
  const { t } = useTranslation();
  const [recentWorkspaces] = useStorage("global.recentWorkspaces");
  const navigate = useNavigate();
  const navigateToWorkspace = useNavigateToWorkspace();
  const { guard: loginGuard, LoginDialog } = useLoginGuard();
  const sortedRecent = reactExports.useMemo(
    () => sortRecentWorkspaces(recentWorkspaces),
    [recentWorkspaces],
  );
  const unavailablePaths = useWorkspaceAvailability(sortedRecent);
  const persistPickedWorkspaceName = usePersistPickedWorkspaceName();
  const isKnownWorkspacePath = useIsKnownWorkspacePath();
  const { addWorkspaceToProject } = useProjectActions();
  const handleNewProject = reactExports.useCallback(
    async (name, options) => {
      if (!loginGuard()) return;
      if (options.folderPath) {
        workspaceLog.info("projects: open-workspace-start", {
          source: "projects-new",
        });
        const alreadyKnown = await isKnownWorkspacePath(options.folderPath);
        await stageWorkspacePreview({
          hiloApp: homeService.hiloApp,
          folderPath: options.folderPath,
          t,
          onStaged: async (entry) => {
            workspaceLog.info("projects: open-workspace-result", {
              kind: "staged",
            });
            if (!alreadyKnown) await persistPickedWorkspaceName(entry.folderPath, name);
            if (options.projectId)
              await addWorkspaceToProject(entry.folderPath, options.projectId, "creations-create");
            trackEvent(TRACK_EVENTS.WORKSPACE_OPEN, {
              source: "projects_new",
            });
            await navigate({
              to: "/workspace",
              search: buildWorkspaceSearch(entry.workspaceId),
            });
          },
        }).catch((err) => {
          workspaceLog.error("projects: open-workspace-error", {
            error: err,
          });
        });
        return;
      }
      const result = await homeService.hiloApp
        .createWorkspaceWithResult({
          name,
          projectId: options.projectId,
          parentFolderPath: options.parentFolderPath,
          loadUserMemory: options.loadUserMemory,
          allowDataDirectoryFallback: options.allowDataDirectoryFallback,
        })
        .catch(() => null);
      if (!result) return;
      const created = workspaceRuntimeFromOpenResult(result);
      if (options.projectId && created?.folderPath) {
        await addWorkspaceToProject(created.folderPath, options.projectId, "creations-create");
      }
      const runtime = handleNewWorkspaceOpenResult(result, t, navigateToWorkspace);
      if (runtime)
        trackEvent(TRACK_EVENTS.WORKSPACE_OPEN, {
          source: "projects_new",
        });
    },
    [
      addWorkspaceToProject,
      isKnownWorkspacePath,
      loginGuard,
      navigate,
      navigateToWorkspace,
      persistPickedWorkspaceName,
      t,
    ],
  );
  const { requestOpen, dialog } = useNewWorkspaceDialog(handleNewProject);
  useRecentWorkspacesRefresh();
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--home-content-surface)]">
      {LoginDialog}
      {dialog}
      <div
        className="sticky top-0 z-10 bg-[var(--home-content-surface)] px-16 pt-6 pb-4"
        data-window-app-controls-safe-row="true"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-heading font-medium leading-tight tracking-[0.02em] text-foreground">
            {t("homeSidebar.allCreations")}
          </h1>
          <button
            type="button"
            data-action-ui-id="projects-create"
            onClick={requestOpen}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={16} strokeWidth={1.5} />
            {t("projects.create")}
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-16 pb-8">
        {sortedRecent.length === 0 ? (
          <PageStateBoundary
            empty={true}
            className="min-h-80"
            emptyOptions={{
              title: t("recentProjects.empty"),
            }}
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {sortedRecent.map((workspace) => (
              <WorkspaceCard
                key={workspace.path}
                workspace={workspace}
                unavailable={unavailablePaths.has(workspace.path)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
const SplitComponent = CreationsPage;
export { SplitComponent as component };
