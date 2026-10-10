// 项目详情页路由入口：标签页、资产面板与成员的组装。
import { useTranslation, reactExports, jsxRuntimeExports, usePlatform, useStorage, ChevronRight$1 as ChevronRight, useNavigate, useParams, useSearch, ArrowLeft, UserRoundPlus, Plus, Info$1 as Info } from "../vendor.js";
import { MemberRole } from "../generation/normalize-skill-detail-metadata.js";
import { Tooltip, TooltipTrigger, TooltipProvider, projectLog } from "../vendor-inline/vscode-base/graph.jsx";
import { TooltipContent } from "../infra/dialog-content.jsx";
import { useProjectActions } from "../settings/use-project-actions.js";
import { useProject, isWorkspacePathCaseInsensitivePlatform } from "../workspace/normalize-project-entries.js";
import { useTopbarState } from "../workspace/topbar-state-context.jsx";
import { useLoginGuard } from "../infra/schedule.js";
import { useNavigateToWorkspace } from "../workspace/use-deep-link-router.js";
import { useRecentWorkspacesRefresh } from "../workspace/set-home-widget-dev-preview-mode.js";
import { projectListLocation } from "../infra/split-pinned-inventory.js";
import { mergeWorkspaceInventory } from "../workspace/merge-workspace-inventory.js";
import { selectProjectWorkspaces } from "../workspace/tool-label-definitions.js";
import { homeService } from "../workspace/home-service.jsx";
import { workspaceRuntimeFromOpenResult } from "../vendor-inline/vscode-base/linked-list.js";
import { handleNewWorkspaceOpenResult } from "../workspace/context-menu-content.jsx";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { useNewWorkspaceDialog } from "../workspace/use-new-workspace-dialog.jsx";
import { Tabs, TabsList, TabsTrigger } from "../workspace/shortcut-hint.jsx";
import { PageStateBoundary } from "../assets/page-state-boundary.jsx";
import { useWindowedList } from "../projects/project-member-summary.jsx";
import { useWorkspaceAvailability } from "../workspace/use-workspace-availability.js";
import { WorkspaceCard } from "../workspace/workspace-card.jsx";
import "../workspace/use-hub-entries.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { CloudAssetsPanel } from "./cloud/cloud-assets-panel.jsx";
import { InviteProjectDialog } from "./invite.jsx";
import { LocalAssetsPanel } from "./local/local-assets-panel.jsx";
import { ProjectMemberSummaryPopover } from "./member-summary-popover.jsx";
import { visibleProjectDetailTabs } from "./tabs.js";
import { useProjectMembers } from "./use-project-members.js";
const CREATIONS_PAGE_SIZE = 100;
function ProjectDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const platform = usePlatform();
  const { projectId } = useParams({
    from: "/_home/projects/$projectId",
  });
  const { tab: tabAnchor } = useSearch({
    from: "/_home/projects/$projectId",
  });
  const project = useProject(projectId);
  const { entries } = useTopbarState();
  const [recentWorkspaces] = useStorage("global.recentWorkspaces");
  const [activeTab, setActiveTab] = reactExports.useState("creations");
  const [inviteOpen, setInviteOpen] = reactExports.useState(false);
  const [isProjectOwner, setIsProjectOwner] = reactExports.useState(false);
  const { guard: loginGuard, LoginDialog } = useLoginGuard();
  const { addWorkspaceToProject, syncCloudProjects } = useProjectActions();
  const navigateToWorkspace = useNavigateToWorkspace();
  useRecentWorkspacesRefresh();
  const remoteId = project?.remoteId;
  const isCloudProject = project?.kind === "team" && !!remoteId;
  const { data: projectMembers = [] } = useProjectMembers(isCloudProject ? remoteId : void 0);
  reactExports.useEffect(() => {
    setIsProjectOwner(false);
    if (!isCloudProject) return;
    let cancelled = false;
    void syncCloudProjects().then((cloudProjects) => {
      if (cancelled || !cloudProjects) return;
      const cloud = cloudProjects.find((item) => item.id === remoteId);
      setIsProjectOwner(cloud?.myRole === MemberRole.MEMBER_ROLE_CREATOR);
    });
    return () => {
      cancelled = true;
    };
  }, [isCloudProject, remoteId, syncCloudProjects]);
  reactExports.useEffect(() => {
    if (project) return;
    projectLog.warn("project-detail redirect: project missing", {
      projectId,
    });
    void navigate(projectListLocation("local"));
  }, [navigate, project, projectId]);
  const caseInsensitive = isWorkspacePathCaseInsensitivePlatform(platform.app.os);
  const inventory = reactExports.useMemo(
    () =>
      mergeWorkspaceInventory(recentWorkspaces, entries, {
        caseInsensitive,
      }),
    [caseInsensitive, entries, recentWorkspaces],
  );
  const projectWorkspaces = reactExports.useMemo(
    () => selectProjectWorkspaces(inventory, project, caseInsensitive),
    [caseInsensitive, inventory, project],
  );
  const {
    visibleItems: visibleWorkspaces,
    hasMore: hasMoreWorkspaces,
    sentinelRef,
  } = useWindowedList(projectWorkspaces, CREATIONS_PAGE_SIZE, projectId);
  const workspaceEntries = reactExports.useMemo(
    () => visibleWorkspaces.map((item) => item.workspace),
    [visibleWorkspaces],
  );
  const unavailablePaths = useWorkspaceAvailability(workspaceEntries);
  const handleCreateWorkspace = reactExports.useCallback(
    async (name, options) => {
      if (!loginGuard()) return;
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
      const runtime = workspaceRuntimeFromOpenResult(result);
      if (options.projectId && runtime?.folderPath) {
        await addWorkspaceToProject(runtime.folderPath, options.projectId, "project-detail-create");
      }
      const opened = handleNewWorkspaceOpenResult(result, t, navigateToWorkspace);
      if (opened)
        trackEvent(TRACK_EVENTS.WORKSPACE_OPEN, {
          source: "project_detail_new",
        });
    },
    [addWorkspaceToProject, loginGuard, navigateToWorkspace, t],
  );
  const { requestOpenForProject, dialog: newWorkspaceDialog } =
    useNewWorkspaceDialog(handleCreateWorkspace);
  const requestNewWorkspace = reactExports.useCallback(
    () => requestOpenForProject(projectId),
    [projectId, requestOpenForProject],
  );
  const tabs = reactExports.useMemo(
    () => visibleProjectDetailTabs(project?.kind ?? "local"),
    [project?.kind],
  );
  reactExports.useEffect(() => {
    if (!tabAnchor) return;
    const target = tabs.find((tab) => tab.key === tabAnchor && !tab.comingSoon);
    if (target) setActiveTab(target.key);
  }, [tabAnchor, tabs]);
  if (!project) return null;
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--home-content-surface)]">
      {LoginDialog}
      {newWorkspaceDialog}
      {project.kind === "team" && project.remoteId ? (
        <InviteProjectDialog
          project={project}
          open={inviteOpen}
          canManageMembers={isProjectOwner}
          onOpenChange={setInviteOpen}
        />
      ) : null}
      <div
        className="flex shrink-0 items-center gap-2 bg-[color:color-mix(in_srgb,var(--foreground)_2%,var(--background))] px-8 pt-[14px] pb-2.5 md:px-12"
        data-action-ui-id="project-detail.breadcrumb"
      >
        <button
          type="button"
          onClick={() => void navigate(projectListLocation(project.kind))}
          className="group flex h-8 items-center rounded-lg text-[14px] text-muted-foreground transition-colors hover:text-foreground"
          data-action-ui-id="project-detail.breadcrumb-root"
        >
          <span
            aria-hidden="true"
            className="flex w-0 items-center overflow-hidden opacity-0 transition-all duration-150 group-hover:mr-1.5 group-hover:w-4 group-hover:opacity-100"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
          </span>
          {t("project.listTitle")}
        </button>
        <ChevronRight
          size={14}
          strokeWidth={1.5}
          className="shrink-0 text-muted-foreground/40"
          aria-hidden="true"
        />
        <span
          className="min-w-0 truncate translate-y-px text-[14px] font-semibold leading-none text-foreground"
          data-action-ui-id="project-detail.breadcrumb-current"
        >
          {project.name}
        </span>
        <div className="ml-auto flex shrink-0 -translate-y-0.5 items-center gap-2">
          {isCloudProject && projectMembers.length > 0 ? (
            <ProjectMemberSummaryPopover
              project={project}
              members={projectMembers}
              canManageMembers={isProjectOwner}
            />
          ) : null}
          {project.kind === "team" && project.remoteId && isProjectOwner ? (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-foreground/[0.05]"
              data-action-ui-id="project-detail.invite"
            >
              <UserRoundPlus size={14} strokeWidth={1.5} aria-hidden="true" />
              {t("project.invite.button")}
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-1.5 flex h-14 shrink-0 items-center justify-between gap-3 px-8 md:px-12">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (tabs.some((tab) => tab.key === value && !tab.comingSoon)) {
              setActiveTab(value);
            }
          }}
        >
          <TabsList
            variant="underline"
            className="gap-5"
            aria-label={t("project.tabsAria")}
            data-action-ui-id="project-detail.tabs"
          >
            {tabs.map((tab) => (
              <ProjectDetailTab
                key={tab.key}
                value={tab.key}
                disabled={tab.comingSoon}
                label={t(tab.labelKey)}
                info={
                  tab.comingSoon && tab.comingSoonInfoKey
                    ? t(tab.comingSoonInfoKey)
                    : tab.infoKey
                      ? t(tab.infoKey)
                      : void 0
                }
                comingSoonLabel={
                  tab.comingSoon && !tab.comingSoonInfoKey ? t("project.comingSoon") : void 0
                }
              />
            ))}
          </TabsList>
        </Tabs>
        {activeTab === "creations" ? (
          <button
            type="button"
            onClick={requestNewWorkspace}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-3 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
            data-action-ui-id="project-detail.new-creation"
          >
            <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
            {t("project.newCreation")}
          </button>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 pt-0 pb-8 md:px-12">
        {activeTab === "creations" ? (
          projectWorkspaces.length === 0 ? (
            <PageStateBoundary
              empty={true}
              className="min-h-80"
              emptyOptions={{
                reason: "project",
                title: t("project.creationsEmpty"),
                description: t("project.creationsEmptyDescription"),
              }}
            />
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
                {visibleWorkspaces.map((item) => (
                  <WorkspaceCard
                    key={item.authoritativeEntry?.workspaceId ?? item.workspace.path}
                    workspace={item.workspace}
                    unavailable={unavailablePaths.has(item.workspace.path)}
                    hideDelete={true}
                  />
                ))}
              </div>
              {hasMoreWorkspaces ? (
                <div
                  ref={sentinelRef}
                  aria-hidden="true"
                  className="h-px"
                  data-action-ui-id="project-detail.creations-load-more-sentinel"
                />
              ) : null}
            </>
          )
        ) : activeTab === "cloudAssets" ? (
          <CloudAssetsPanel project={project} />
        ) : activeTab === "localAssets" ? (
          <LocalAssetsPanel project={project} />
        ) : (
          <p className="pt-8 text-center text-[13px] text-muted-foreground">
            {t("project.comingSoonBody")}
          </p>
        )}
      </div>
    </main>
  );
}
function ProjectDetailTab({ value, disabled, label, info, comingSoonLabel }) {
  const tabButton = (
    <TabsTrigger
      value={value}
      variant="underline"
      disabled={disabled}
      className="gap-1 disabled:cursor-not-allowed disabled:text-muted-foreground/50"
      data-action-ui-id="project-detail.tab"
    >
      {label}
      {info ? <Info size={14} strokeWidth={2.25} className="shrink-0 opacity-60" /> : null}
    </TabsTrigger>
  );
  const tooltip = comingSoonLabel ? [info, comingSoonLabel].filter(Boolean).join(" · ") : info;
  if (!tooltip) return tabButton;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={tabButton} />
        <TooltipContent side="bottom" className="max-w-64">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
const SplitComponent = ProjectDetailPage;
export { SplitComponent as component };
