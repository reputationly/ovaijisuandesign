// 项目列表页路由入口：分类标签、搜索与排序、分页加载、新建与删除。
import { useTranslation, reactExports, jsxRuntimeExports, useNavigate, useSearch, usePlatform, useStorage, getRuntimeConfig, Plus, MonochromeIcon, CloudUpload, ChevronDown, TAB_CONTENT_ENTER_CLASS_NAME } from "../vendor.js";
import { Button, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioItem } from "../infra/dialog-content.jsx";
import { DropdownMenu, getProjectTutorialUrl, openExternalUrl, DropdownMenuGroup, DropdownMenuRadioGroup } from "../vendor-inline/vscode-base/graph.jsx";
import { useProjects } from "../workspace/normalize-project-entries.js";
import { useProjectActions } from "../settings/use-project-actions.js";
import { useProjectDelete } from "../workspace/use-project-delete.js";
import { projectListLocation } from "../infra/split-pinned-inventory.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { CatalogPageHeading } from "../assets/catalog-page-heading.jsx";
import { CreateProjectMenuContent, DissolveProjectDialog } from "../infra/inline-rename-input.jsx";
import { BookOpen } from "../media-editing/package.jsx";
import { Tabs, TabsList, TabsTrigger } from "../workspace/shortcut-hint.jsx";
import { PageStateBoundary } from "../assets/page-state-boundary.jsx";
import { CreateProjectDialog } from "../workspace/create-project-dialog.jsx";
import { useWindowedList } from "./project-member-summary.jsx";
import { useHubEntries, HUB_ENTRY_IDS } from "../workspace/use-hub-entries.js";
import { PageSearchInput } from "../shared/page-search-input.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { CloudProjectsInspector } from "./cloud-debug.jsx";
import { ProjectCard } from "./project-card.jsx";
import { useRefreshProjectCovers } from "./project-cover.jsx";
const SORT_MODES = ["updated", "created", "name"];
function isProjectsSortMode(value) {
  return SORT_MODES.includes(value);
}
const KIND_TABS = [
  {
    kind: "local",
    labelKey: "project.kindTabs.local",
  },
  {
    kind: "team",
    labelKey: "project.kindTabs.cloud",
  },
];
const PROJECTS_PAGE_SIZE = 100;
function ProjectListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { kind } = useSearch({
    from: "/_home/projects/",
  });
  const activeKind = kind ?? "local";
  const platform = usePlatform();
  const [config, setConfig] = useStorage("global.config");
  const [keyword, setKeyword] = reactExports.useState("");
  const [createKind, setCreateKind] = reactExports.useState(null);
  const sortMode = isProjectsSortMode(config.projectsSortMode)
    ? config.projectsSortMode
    : "updated";
  const projects = useProjects({
    sortMode,
    keyword,
    kind: activeKind,
  });
  const { createProject, renameProject, deleteProject, syncCloudProjects } = useProjectActions();
  const { pendingDelete, requestDelete, confirmDelete, cancelDelete } =
    useProjectDelete(deleteProject);
  const {
    visibleItems: visibleProjects,
    hasMore,
    sentinelRef,
    reset: resetWindow,
  } = useWindowedList(projects, PROJECTS_PAGE_SIZE);
  const handleKindChange = reactExports.useCallback(
    (nextKind) => {
      void navigate({
        ...projectListLocation(nextKind),
        replace: true,
      });
      resetWindow();
    },
    [navigate, resetWindow],
  );
  const handleKeywordChange = reactExports.useCallback(
    (value) => {
      setKeyword(value);
      resetWindow();
    },
    [resetWindow],
  );
  reactExports.useEffect(() => {
    if (activeKind !== "team") return;
    void syncCloudProjects();
  }, [activeKind, syncCloudProjects]);
  useRefreshProjectCovers();
  const handleSortModeChange = reactExports.useCallback(
    (value) => {
      if (!isProjectsSortMode(value)) return;
      setConfig((previous) => ({
        ...previous,
        projectsSortMode: value,
      }));
      resetWindow();
    },
    [resetWindow, setConfig],
  );
  const handleCreate = reactExports.useCallback(
    async (name, projectKind) => {
      const result = await createProject(name, projectKind);
      if (!result.project) {
        dedupedToast.error(
          result.errorMessage ?? t(result.errorMessageKey ?? "project.create.failed"),
        );
        return;
      }
      setCreateKind(null);
      await navigate({
        to: "/projects/$projectId",
        params: {
          projectId: result.project.id,
        },
      });
    },
    [createProject, navigate, t],
  );
  const handleOpen = reactExports.useCallback(
    (project) => {
      void navigate({
        to: "/projects/$projectId",
        params: {
          projectId: project.id,
        },
      });
    },
    [navigate],
  );
  const handleRename = reactExports.useCallback(
    (project, name) => {
      void renameProject(project, name).then((result) => {
        if (result.safetyBlocked) {
          dedupedToast.error(t("rename.safetyBlocked"));
          return;
        }
        if (result.errorCode === "project-name-conflict") {
          dedupedToast.error(t("home.workspace.duplicateName"));
        } else if (result.errorMessage || result.errorCode === "cloud-request-failed") {
          dedupedToast.error(result.errorMessage ?? t("project.rename.failed"));
        }
      });
    },
    [renameProject, t],
  );
  const hubEntries = useHubEntries();
  const tutorialEntry = hubEntries[HUB_ENTRY_IDS.projectTutorial];
  const handleOpenTutorial = reactExports.useCallback(() => {
    const url = tutorialEntry?.url ?? getProjectTutorialUrl(getRuntimeConfig().region);
    void openExternalUrl(platform, url, {
      source: "project-list.tutorial",
    });
  }, [platform, tutorialEntry?.url]);
  return (
    <main className="flex flex-1 flex-col overflow-y-auto bg-[var(--home-content-surface)]">
      <div className="shrink-0 px-8 pt-7 md:px-12">
        <section
          className="relative isolate overflow-hidden border-b border-border-soft pb-6"
          data-action-ui-id="project-list.hero"
        >
          <div className="relative z-10 w-full">
            <CatalogPageHeading
              className="mt-3"
              title={t("project.listTitle")}
              description={t("project.heroDescription")}
            />
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      size="default"
                      data-action-ui-id="project-list.create-trigger"
                      className="h-9 gap-1.5 rounded-lg px-4 text-[13px] font-medium"
                    >
                      <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                      {t("project.create.trigger")}
                    </Button>
                  }
                />
                <CreateProjectMenuContent
                  actionUiIdPrefix="project-list"
                  onSelectKind={setCreateKind}
                  align="start"
                  side="bottom"
                  sideOffset={4}
                />
              </DropdownMenu>
              {tutorialEntry?.visible !== false ? (
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleOpenTutorial}
                  data-action-ui-id="project-list.tutorial-trigger"
                  className="h-9 gap-1.5 rounded-lg px-4 text-[13px] font-medium"
                >
                  <BookOpen size={16} strokeWidth={1.5} aria-hidden="true" />
                  <span className="max-w-48 truncate">
                    {tutorialEntry?.title ?? t("project.tutorial.trigger")}
                  </span>
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      </div>
      <div className="flex flex-1 flex-col px-8 pt-4 pb-8 md:px-12">
        <div
          className="flex min-w-0 flex-nowrap items-center gap-3 py-2"
          data-layout-slot="project-list-toolbar"
        >
          <Tabs
            value={activeKind}
            className="shrink-0"
            onValueChange={(value) => {
              if (value === "local" || value === "team") handleKindChange(value);
            }}
          >
            <TabsList
              variant="underline"
              aria-label={t("project.kindTabsAria")}
              data-action-ui-id="project-list.kind-tabs"
            >
              {KIND_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.kind}
                  value={tab.kind}
                  variant="underline"
                  className="gap-1.5 [--icon-control-ink:var(--foreground)] [--icon-control-alpha:0.5] hover:[--icon-control-alpha:1] data-[active]:[--icon-control-alpha:1]"
                  data-action-ui-id={`project-list.kind-tab-${tab.kind}`}
                >
                  {t(tab.labelKey)}
                  {tab.kind === "team" ? (
                    <MonochromeIcon tone="control">
                      <CloudUpload size={14} strokeWidth={2.25} aria-hidden="true" />
                    </MonochromeIcon>
                  ) : null}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div
            className="scrollbar-none flex min-w-0 flex-1 flex-nowrap items-center gap-3 overflow-x-auto overscroll-x-contain [&>*:first-child]:ml-auto"
            data-layout-slot="project-list-toolbar-actions"
          >
            <div
              className="w-60 min-w-36 max-w-60 flex-1 shrink"
              data-layout-slot="project-list-search-slot"
            >
              <PageSearchInput
                value={keyword}
                onValueChange={handleKeywordChange}
                placeholder={t("project.searchPlaceholder")}
                clearLabel={t("common.clear")}
                inputActionId="project-list.search"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={t("project.sortLabel")}
                data-action-ui-id="project-list.sort-trigger"
                className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-transparent px-3 text-xs text-foreground transition-colors hover:border-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                {t(`project.sort.${sortMode}`)}
                <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" sideOffset={4} className="min-w-40">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{t("project.sortLabel")}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={sortMode}
                    aria-label={t("project.sortLabel")}
                    onValueChange={handleSortModeChange}
                  >
                    {SORT_MODES.map((mode) => (
                      <DropdownMenuRadioItem key={mode} value={mode}>
                        {t(`project.sort.${mode}`)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <CloudProjectsInspector />
          </div>
        </div>
        <div
          key={`project-tab-content-${activeKind}`}
          className={`flex flex-1 flex-col ${TAB_CONTENT_ENTER_CLASS_NAME}`}
          data-layout-slot="project-tab-content"
        >
          {projects.length === 0 ? (
            <PageStateBoundary
              empty={true}
              className="mt-2"
              emptyOptions={{
                reason: keyword ? "generic" : "project",
                ...(keyword
                  ? {
                      title: t("project.searchEmpty"),
                      description: t("project.searchEmptyDescription"),
                    }
                  : {
                      title: t(
                        activeKind === "local"
                          ? "project.listEmptyLocalTitle"
                          : "project.listEmptyCloudTitle",
                      ),
                      description: t(
                        activeKind === "local"
                          ? "project.listEmptyLocalDescription"
                          : "project.listEmptyCloudDescription",
                      ),
                    }),
              }}
            />
          ) : (
            <>
              <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
                {visibleProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onOpen={handleOpen}
                    onRename={handleRename}
                    onRequestDelete={requestDelete}
                  />
                ))}
              </div>
              {hasMore ? (
                <div
                  ref={sentinelRef}
                  aria-hidden="true"
                  className="h-px"
                  data-action-ui-id="project-list.load-more-sentinel"
                />
              ) : null}
            </>
          )}
        </div>
      </div>
      <CreateProjectDialog
        open={createKind !== null}
        kind={createKind ?? "local"}
        onConfirm={handleCreate}
        onOpenChange={(open) => {
          if (!open) setCreateKind(null);
        }}
      />
      <DissolveProjectDialog
        project={pendingDelete}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </main>
  );
}
const SplitComponent = ProjectListPage;
export { SplitComponent as component };
