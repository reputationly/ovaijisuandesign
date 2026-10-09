// 工作流页路由入口：列表、详情展开、下载与教程弹窗的组装。
import {
  h as useTranslation,
  kP as useComfyUiDownloadProgress,
  j as jsxRuntimeExports,
  fM as Button,
  X,
  r as reactExports,
  m as API_PATHS,
  e as Icon,
  a3 as dedupedToast,
  o as usePlatform,
  gB as openExternalUrl,
  v as useStorage,
  H as homeService,
  j8 as LocalFolderIcon,
  ay as BookOpen,
  ae as DropdownMenu,
  af as DropdownMenuTrigger,
  ah as DropdownMenuContent,
  ai as DropdownMenuItem,
  Q as Plus,
  w as useNavigate,
  fT as useSearch,
  l7 as useGatewayFetch,
  J as buildWorkspaceSearch,
  l8 as trackComfyUiWorkflowCatalogAction,
  K as workspaceRuntimeFromOpenResult,
  l9 as toastWorkspaceOpenResult,
  G as stageWorkspacePreview,
  la as trackComfyUiWorkflowInstall,
  lb as trackComfyUiWorkflowInstallFailed,
  gC as CatalogPageHeading,
  dl as Loader2,
  f0 as Upload,
  bI as ChevronRight,
  fi as Workflow,
  gE as Tabs,
  gF as TabsList,
  gG as TabsTrigger,
  gk as RetryIcon,
  gM as TAB_CONTENT_ENTER_CLASS_NAME,
  U as PageStateBoundary,
} from "../main.jsx";
import { u as useHubEntries, H as HUB_ENTRY_IDS } from "../use-hub-entries-BqMaebYB.js";
import { u as useWorkspaceAvailability } from "../use-workspace-availability-Dj4GHjzL.js";
import { P as PageSearchInput } from "../index-CCILjxtP.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { WorkflowDownloadConfirmDialog } from "./download-confirm-dialog.jsx";
import { ComfyUiModelDownloadSection } from "./download-section.jsx";
import { WorkflowTutorialDialog } from "./tutorial-dialog.jsx";
import { notifyComfyWorkflowsChanged, useComfyWorkflows } from "./use-comfy-workflows.js";
import { WorkflowUseMenu } from "./use-menu.jsx";
import { UserWorkflowListItem } from "./user-workflow-item.jsx";
import {
  isActiveWorkflowDownloadTask,
  isWorkflowModelPreparationComplete,
  isWorkflowPendingModelPreparation,
} from "./workflow-card-helpers.js";
import { WorkflowCard } from "./workflow-card.jsx";
import { WorkflowDetailRail, WorkflowDetailView } from "./workflow-detail.jsx";
import {
  isInstalledFeaturedWorkflow,
  workflowDisplayName,
  workflowMatchesSearch,
} from "./workflow-mapping.js";
const DETAIL_COLLAPSE_DURATION_MS = 180;
const DETAIL_COLLAPSE_FALLBACK_MS = DETAIL_COLLAPSE_DURATION_MS + 60;
const COMFY_UI_PLUGIN_ID = "comfyui";
function WorkflowsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { tab: initialTab } = useSearch({
    from: "/_home/workflows/",
  });
  const [activeTab, setActiveTab] = reactExports.useState(initialTab ?? "official");
  const [search, setSearch] = reactExports.useState("");
  const [tutorialOpen, setTutorialOpen] = reactExports.useState(false);
  const [importing, setImporting] = reactExports.useState(false);
  const [downloadWorkflow, setDownloadWorkflow] = reactExports.useState(null);
  const [detailWorkflow, setDetailWorkflow] = reactExports.useState(null);
  const importInputRef = reactExports.useRef(null);
  const inlineBrowserRef = reactExports.useRef(null);
  const gatewayFetch2 = useGatewayFetch();
  const query = useComfyWorkflows(activeTab);
  const { tasks: downloadTasks } = useComfyUiDownloadProgress();
  const hasActiveDownloads = downloadTasks.some(isActiveWorkflowDownloadTask);
  const [recentWorkspaces] = useStorage("global.recentWorkspaces");
  const unavailableWorkspacePaths = useWorkspaceAvailability(recentWorkspaces);
  const platform = usePlatform();
  const hubEntries = useHubEntries();
  const tutorialEntry = hubEntries[HUB_ENTRY_IDS.workflowTutorial];
  const handleCloseDetail = reactExports.useCallback(() => {
    const browser = inlineBrowserRef.current;
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!browser?.animate || prefersReducedMotion) {
      setDetailWorkflow(null);
      return;
    }
    const animation = browser.animate(
      [
        {
          opacity: 1,
          transform: "translateX(0)",
        },
        {
          opacity: 0,
          transform: "translateX(8px)",
        },
      ],
      {
        duration: DETAIL_COLLAPSE_DURATION_MS,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "forwards",
      },
    );
    let fallbackTimer;
    let completed = false;
    const completeCollapse = () => {
      if (completed) return;
      completed = true;
      if (fallbackTimer !== void 0) window.clearTimeout(fallbackTimer);
      setDetailWorkflow(null);
    };
    fallbackTimer = window.setTimeout(completeCollapse, DETAIL_COLLAPSE_FALLBACK_MS);
    void animation.finished.then(completeCollapse, completeCollapse);
  }, []);
  reactExports.useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const filteredWorkflows = reactExports.useMemo(() => {
    return query.workflows.filter(
      (workflow) =>
        (activeTab !== "mine" || !isWorkflowPendingModelPreparation(workflow, downloadTasks)) &&
        workflowMatchesSearch(workflow, search),
    );
  }, [activeTab, downloadTasks, query.workflows, search]);
  reactExports.useEffect(() => {
    setDetailWorkflow((current) => {
      if (!current) return current;
      const refreshed = query.workflows.find((workflow) => workflow.id === current.id);
      return refreshed && refreshed !== current ? refreshed : current;
    });
  }, [query.workflows]);
  const navigateWithWorkflow = reactExports.useCallback(
    (workspaceId, workflowId) =>
      navigate({
        to: "/workspace",
        search: buildWorkspaceSearch(workspaceId, {
          initialComfyUiWorkflowId: workflowId,
          initialComfyUiWorkflowTarget: "new",
        }),
      }),
    [navigate],
  );
  const handleImportWorkflow = reactExports.useCallback(
    (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || importing) return;
      setImporting(true);
      const formData = new FormData();
      formData.append("file", file);
      void gatewayFetch2(API_PATHS.comfyUiWorkflowImport, {
        method: "POST",
        body: formData,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          await response.json();
          setActiveTab("mine");
          notifyComfyWorkflowsChanged();
          trackComfyUiWorkflowCatalogAction("workflows_page", "import_success");
          dedupedToast.success(t("workflows.importSuccess"));
        })
        .catch((error) => {
          trackComfyUiWorkflowCatalogAction("workflows_page", "import_failed");
          dedupedToast.error(
            t("workflows.importFailed", {
              message: error instanceof Error ? error.message : String(error),
            }),
          );
        })
        .finally(() => setImporting(false));
    },
    [gatewayFetch2, importing, t],
  );
  const handleCreateBlankWorkflow = reactExports.useCallback(async () => {
    try {
      const result = await homeService.hiloApp.createWorkspaceWithResult({
        name: t("workflows.createCanvas"),
        loadUserMemory: true,
      });
      const runtime = workspaceRuntimeFromOpenResult(result);
      if (!runtime) {
        toastWorkspaceOpenResult(result, t);
        return;
      }
      await navigate({
        to: "/workspace",
        search: buildWorkspaceSearch(runtime.workspaceId, {
          pluginId: COMFY_UI_PLUGIN_ID,
        }),
      });
      trackComfyUiWorkflowCatalogAction("workflows_page", "create_blank");
    } catch (error) {
      dedupedToast.error(
        t("workflows.addFailed", {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }, [navigate, t]);
  const ensureWorkflowModelsReady = reactExports.useCallback(async (workflow) => {
    if (workflow.source !== "official") return true;
    const models = workflow.modelDependencies ?? [];
    if (models.length === 0) return true;
    const availability = await homeService.comfyUiModelDownload.getModelAvailability(models, {
      scanUserDisk: true,
    });
    const discoveredModelDirectories = [
      ...new Set(
        availability.models
          .filter((model) => model.available && !model.registered && model.modelsDirectory)
          .map((model) => model.modelsDirectory),
      ),
    ];
    const state = await homeService.comfyUiModelDownload.getModelDirectoryState();
    const queued = await homeService.comfyUiModelDownload.prepareWorkflow({
      workflowId: workflow.id,
      workflowTitle: workflowDisplayName(workflow),
      models,
      modelsDirectory: state.activeDirectory,
      discoveredModelDirectories,
      preferSilentLocalReuse: availability.models.every((model) => model.available),
    });
    const completed = await homeService.comfyUiModelDownload.waitForTask(queued.id);
    if (completed.status === "cancelled") return false;
    if (completed.status === "failed") throw new Error(completed.error || "模型准备失败");
    if (!isWorkflowModelPreparationComplete(completed)) {
      throw new Error("工作流仍有不可用模型");
    }
    return true;
  }, []);
  const handleUseInNewWorkspace = reactExports.useCallback(
    async (workflowId, workflowName, workflow) => {
      try {
        if (workflow && !(await ensureWorkflowModelsReady(workflow))) return;
        const result = await homeService.hiloApp.createWorkspaceWithResult({
          name: t("workflows.useMenu.workspaceName", {
            name: workflowName,
          }),
          loadUserMemory: true,
        });
        const runtime = workspaceRuntimeFromOpenResult(result);
        if (!runtime) {
          toastWorkspaceOpenResult(result, t);
          return;
        }
        await navigateWithWorkflow(runtime.workspaceId, workflowId);
        trackComfyUiWorkflowCatalogAction("workflows_page", "use_new_workspace", workflowId);
      } catch (error) {
        dedupedToast.error(
          t("workflows.addFailed", {
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    },
    [ensureWorkflowModelsReady, navigateWithWorkflow, t],
  );
  const handleUseExistingWorkspace = reactExports.useCallback(
    (workflowId, path, workflow) => {
      void (async () => {
        if (workflow && !(await ensureWorkflowModelsReady(workflow))) return;
        return stageWorkspacePreview({
          hiloApp: homeService.hiloApp,
          folderPath: path,
          t,
          onStaged: (entry) => {
            trackComfyUiWorkflowCatalogAction(
              "workflows_page",
              "use_existing_workspace",
              workflowId,
            );
            return navigateWithWorkflow(entry.workspaceId, workflowId);
          },
        });
      })().catch((error) => {
        dedupedToast.error(
          t("workflows.addFailed", {
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      });
    },
    [ensureWorkflowModelsReady, navigateWithWorkflow, t],
  );
  const handleConfirmDownload = reactExports.useCallback(
    (modelsDirectory, discoveredModelDirectories, preferSilentLocalReuse) => {
      const workflow = downloadWorkflow;
      if (!workflow || workflow.source !== "official") {
        return;
      }
      const workflowId = workflow.id;
      const modelDependencies = workflow.modelDependencies ?? [];
      setDownloadWorkflow(null);
      void (async () => {
        let stage = "model_prepare";
        const startedAt = Date.now();
        try {
          const queued = await homeService.comfyUiModelDownload.prepareWorkflow({
            workflowId,
            workflowTitle: workflowDisplayName(workflow),
            models: modelDependencies,
            modelsDirectory,
            discoveredModelDirectories,
            preferSilentLocalReuse,
          });
          const completed = await homeService.comfyUiModelDownload.waitForTask(queued.id);
          if (completed.status === "cancelled") return;
          if (!isWorkflowModelPreparationComplete(completed)) {
            throw new Error(completed.error || "工作流仍有不可用模型");
          }
          stage = "workflow_install";
          const response = await gatewayFetch2(API_PATHS.comfyUiWorkflowInstall(workflowId), {
            method: "POST",
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          trackComfyUiWorkflowInstall("workflows_page", startedAt);
          notifyComfyWorkflowsChanged();
        } catch (error) {
          trackComfyUiWorkflowInstallFailed("workflows_page", startedAt, stage);
          dedupedToast.error(
            t("chat.workflow.prepareFailed", {
              message: error instanceof Error ? error.message : String(error),
            }),
          );
        }
      })();
    },
    [downloadWorkflow, gatewayFetch2, t],
  );
  const handleDeleteWorkflow = reactExports.useCallback(
    async (workflow) => {
      try {
        const response = await gatewayFetch2(API_PATHS.comfyUiWorkflowDelete(workflow.id), {
          method: "DELETE",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (detailWorkflow?.id === workflow.id) setDetailWorkflow(null);
        notifyComfyWorkflowsChanged();
        trackComfyUiWorkflowCatalogAction("workflows_page", "delete_success", workflow.id);
        dedupedToast.success(t("workflows.delete.success"));
      } catch (error) {
        trackComfyUiWorkflowCatalogAction("workflows_page", "delete_failed", workflow.id);
        dedupedToast.error(
          t("workflows.delete.failed", {
            message: error instanceof Error ? error.message : String(error),
          }),
        );
        throw error;
      }
    },
    [detailWorkflow?.id, gatewayFetch2, t],
  );
  const handleOpenModelsFolder = reactExports.useCallback(() => {
    void homeService.comfyUiModelDownload.openModelsFolder().catch(() => {
      dedupedToast.error(t("workflows.openModelsFolderFailed"));
    });
  }, [t]);
  const handleOpenWorkflowsFolder = reactExports.useCallback(() => {
    void homeService.comfyUiModelDownload.openWorkflowsFolder().catch(() => {
      dedupedToast.error(t("workflows.openWorkflowsFolderFailed"));
    });
  }, [t]);
  const detailWorkflowId = detailWorkflow?.id;
  const renderDetailView = (embedded = false) => {
    if (!detailWorkflow) return null;
    return (
      <WorkflowDetailView
        key={detailWorkflow.id}
        workflow={detailWorkflow}
        nodeLabel={t("workflows.nodes")}
        onBack={handleCloseDetail}
        embedded={embedded}
        {...(detailWorkflowId
          ? {
              completedAction: (
                <WorkflowUseMenu
                  workflowId={detailWorkflowId}
                  recentWorkspaces={recentWorkspaces}
                  unavailablePaths={unavailableWorkspacePaths}
                  onCreate={() => {
                    void handleUseInNewWorkspace(
                      detailWorkflowId,
                      detailWorkflow.displayName || detailWorkflow.name,
                      detailWorkflow,
                    );
                  }}
                  onSelect={(path) =>
                    handleUseExistingWorkspace(detailWorkflowId, path, detailWorkflow)
                  }
                />
              ),
            }
          : {})}
        {...(detailWorkflow.source === "official" && detailWorkflow.installed !== true
          ? {
              onDownload: () => setDownloadWorkflow(detailWorkflow),
            }
          : {})}
      />
    );
  };
  const renderWorkflowCard = (workflow, layout = "grid") => {
    if (activeTab === "mine" && workflow.source === "user") {
      const canViewDetails = isInstalledFeaturedWorkflow(workflow);
      return (
        <UserWorkflowListItem
          key={workflow.id}
          workflow={workflow}
          {...(canViewDetails
            ? {
                onView: () => {
                  setDetailWorkflow(workflow);
                  trackComfyUiWorkflowCatalogAction("workflows_page", "view", workflow.id);
                },
              }
            : {})}
          onDelete={handleDeleteWorkflow}
          useAction={
            <WorkflowUseMenu
              workflowId={workflow.id}
              recentWorkspaces={recentWorkspaces}
              unavailablePaths={unavailableWorkspacePaths}
              compact={true}
              onCreate={() => {
                void handleUseInNewWorkspace(workflow.id, workflowDisplayName(workflow));
              }}
              onSelect={(path) => handleUseExistingWorkspace(workflow.id, path)}
            />
          }
        />
      );
    }
    const officialWorkflowId = workflow.source === "official" ? workflow.id : void 0;
    return (
      <WorkflowCard
        key={workflow.id}
        workflow={workflow}
        locale={i18n.resolvedLanguage ?? i18n.language}
        metadataLabels={{
          nodes: t("workflows.nodes"),
          links: t("workflows.links"),
          nodeTypes: t("workflows.nodeTypes"),
          groups: t("workflows.groups"),
          models: t("workflows.models"),
          size: t("workflows.size"),
          updated: t("workflows.updated"),
        }}
        {...(layout === "grid" && workflow.source === "official"
          ? {
              downloadLabel: t("workflows.download"),
              onDownload: () => setDownloadWorkflow(workflow),
            }
          : {})}
        viewLabel={t("workflows.view")}
        onView={() => {
          setDetailWorkflow(workflow);
          trackComfyUiWorkflowCatalogAction("workflows_page", "view", workflow.id);
        }}
        layout={layout}
        selected={detailWorkflow?.id === workflow.id}
        {...(officialWorkflowId
          ? {
              completedAction: (
                <WorkflowUseMenu
                  workflowId={officialWorkflowId}
                  recentWorkspaces={recentWorkspaces}
                  unavailablePaths={unavailableWorkspacePaths}
                  compact={true}
                  onCreate={() => {
                    void handleUseInNewWorkspace(
                      officialWorkflowId,
                      workflowDisplayName(workflow),
                      workflow,
                    );
                  }}
                  onSelect={(path) =>
                    handleUseExistingWorkspace(officialWorkflowId, path, workflow)
                  }
                />
              ),
            }
          : {})}
      />
    );
  };
  return (
    <>
      {detailWorkflow?.source === "user" ? (
        renderDetailView()
      ) : (
        <main className="flex h-full flex-col overflow-y-auto bg-[var(--home-content-surface)] [scrollbar-gutter:stable]">
          <div className="shrink-0 px-8 pt-7 md:px-12">
            <section
              className="relative isolate overflow-hidden border-b border-border-soft pb-6"
              data-action-ui-id="workflows-hero"
            >
              <div className="relative z-10 w-full">
                <CatalogPageHeading
                  className="mt-3"
                  title={t("workflows.title")}
                  description={t("workflows.subtitle")}
                />
                <div className="mt-8 flex flex-wrap items-center gap-2">
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={handleImportWorkflow}
                    data-action-ui-id="workflows-import-input"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          size="lg"
                          disabled={importing}
                          className="h-9 gap-1.5 rounded-lg pl-3.5 pr-4 text-[13px] font-medium"
                          data-action-ui-id="workflows-create"
                        >
                          <Icon icon={Plus} size="md" aria-hidden={true} />
                          {t("workflows.create")}
                        </Button>
                      }
                    />
                    <DropdownMenuContent
                      align="start"
                      side="bottom"
                      sideOffset={4}
                      className="w-64 p-1"
                      data-action-ui-id="workflows-create-menu"
                    >
                      <DropdownMenuItem
                        disabled={importing}
                        onClick={() => importInputRef.current?.click()}
                        className="group h-11 cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 whitespace-normal"
                        data-action-ui-id="workflows-create-import"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground/70 transition-colors duration-150 group-hover:bg-background group-hover:text-foreground group-focus:bg-background group-focus:text-foreground">
                          <Icon
                            icon={importing ? Loader2 : Upload}
                            size="md"
                            className={importing ? "animate-spin" : void 0}
                            aria-hidden={true}
                          />
                        </span>
                        <span className="min-w-0 flex-1 font-heading text-sm font-medium text-foreground">
                          {t("workflows.createMenu.import")}
                        </span>
                        <Icon
                          icon={ChevronRight}
                          size="sm"
                          strokeWidth={1.5}
                          className="shrink-0 text-muted-foreground"
                          aria-hidden={true}
                        />
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void handleCreateBlankWorkflow()}
                        className="group h-11 cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 whitespace-normal"
                        data-action-ui-id="workflows-create-canvas"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground/70 transition-colors duration-150 group-hover:bg-background group-hover:text-foreground group-focus:bg-background group-focus:text-foreground">
                          <Icon icon={Workflow} size="md" aria-hidden={true} />
                        </span>
                        <span className="min-w-0 flex-1 font-heading text-sm font-medium text-foreground">
                          {t("workflows.createMenu.canvas")}
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {tutorialEntry?.visible !== false ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="h-9 gap-1.5 rounded-lg pl-3.5 pr-4 text-[13px] font-medium"
                      onClick={() => {
                        if (tutorialEntry?.url) {
                          void openExternalUrl(platform, tutorialEntry.url, {
                            source: "workflows.tutorial",
                          });
                        } else {
                          setTutorialOpen(true);
                        }
                      }}
                      data-action-ui-id="workflows-tutorial"
                    >
                      <Icon icon={BookOpen} size="md" aria-hidden={true} />
                      {t("workflows.tutorial")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
          <div className="flex min-h-0 flex-1 flex-col px-8 pt-4 pb-10 md:px-12">
            <div
              className="flex min-w-0 flex-nowrap items-center gap-3 py-2"
              data-layout-slot="workflows-toolbar"
            >
              <Tabs
                value={activeTab}
                className="shrink-0"
                onValueChange={(value) => {
                  if (value !== "official" && value !== "mine") return;
                  setActiveTab(value);
                  trackComfyUiWorkflowCatalogAction("workflows_page", "tab_switch");
                }}
              >
                <TabsList
                  variant="underline"
                  aria-label={t("workflows.title")}
                  data-action-ui-id="workflows-tabs"
                >
                  {["official", "mine"].map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      variant="underline"
                      data-action-ui-id={`workflows-tab-${tab}`}
                    >
                      {t(`workflows.tabs.${tab}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div
                className="scrollbar-none flex min-w-0 flex-1 flex-nowrap items-center gap-3 overflow-x-auto overscroll-x-contain [&>*:first-child]:ml-auto"
                data-layout-slot="workflows-toolbar-actions"
              >
                {activeTab === "mine" ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 gap-1.5 whitespace-nowrap px-2.5 text-[13px]"
                      onClick={() => importInputRef.current?.click()}
                      disabled={importing}
                      data-action-ui-id="workflows-import-button"
                    >
                      <Icon
                        icon={importing ? Loader2 : Upload}
                        size="sm"
                        className={importing ? "animate-spin" : void 0}
                        aria-hidden={true}
                      />
                      {t("workflows.importShort")}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 shrink-0 gap-1.5 whitespace-nowrap px-2.5 text-[13px]"
                            data-action-ui-id="workflows-open-folder"
                          >
                            <LocalFolderIcon className="size-4" aria-hidden="true" />
                            {t("workflows.openFolder")}
                          </Button>
                        }
                      />
                      <DropdownMenuContent
                        align="end"
                        side="bottom"
                        sideOffset={4}
                        className="w-44 p-1"
                        data-action-ui-id="workflows-open-folder-menu"
                      >
                        <DropdownMenuItem
                          onClick={handleOpenModelsFolder}
                          className="cursor-pointer gap-2"
                          data-action-ui-id="workflows-open-models-folder"
                        >
                          <LocalFolderIcon className="size-4" aria-hidden="true" />
                          {t("workflows.modelsFolder")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleOpenWorkflowsFolder}
                          className="cursor-pointer gap-2"
                          data-action-ui-id="workflows-open-workflows-folder"
                        >
                          <LocalFolderIcon className="size-4" aria-hidden="true" />
                          {t("workflows.workflowsFolder")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : null}
                <div
                  className="w-60 min-w-36 max-w-60 flex-1 shrink"
                  data-layout-slot="workflows-search-slot"
                >
                  <PageSearchInput
                    value={search}
                    onValueChange={setSearch}
                    placeholder={t("workflows.search")}
                    clearLabel={t("common.clear")}
                    inputActionId="workflows-search"
                  />
                </div>
                {activeTab === "official" ? (
                  <div
                    className={`grid shrink-0 place-items-center overflow-hidden transition-[width,opacity,transform] duration-200 ease-out ${detailWorkflow?.source === "official" ? "w-9 translate-x-0 scale-100 opacity-100" : "w-0 translate-x-1 scale-90 opacity-0"}`}
                  >
                    <Button
                      type="button"
                      variant="default"
                      size="icon-lg"
                      className="rounded-lg transition-colors duration-150"
                      aria-label={t("workflows.detail.collapse")}
                      aria-hidden={detailWorkflow?.source !== "official"}
                      tabIndex={detailWorkflow?.source === "official" ? 0 : -1}
                      title={t("workflows.detail.collapse")}
                      onClick={handleCloseDetail}
                      data-action-ui-id="workflows-detail-collapse"
                    >
                      <Icon icon={X} size="lg" strokeWidth={2} aria-hidden={true} />
                    </Button>
                  </div>
                ) : null}
                {query.error ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 whitespace-nowrap"
                    onClick={query.retry}
                    data-action-ui-id="workflows-retry"
                  >
                    <RetryIcon size={14} />
                    {t("common.retry")}
                  </Button>
                ) : null}
              </div>
            </div>
            <div
              key={`workflows-tab-content-${activeTab}`}
              className={`mt-2 flex min-h-0 flex-1 flex-col ${TAB_CONTENT_ENTER_CLASS_NAME}`}
              data-layout-slot="workflows-tab-content"
            >
              {activeTab === "mine" ? <ComfyUiModelDownloadSection /> : null}
              {query.loading ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="ml-2 text-xs">{t("workflows.loading")}</span>
                </div>
              ) : query.error && activeTab === "official" ? (
                <PageStateBoundary error={true} className="min-h-80" />
              ) : filteredWorkflows.length === 0 &&
                activeTab === "mine" &&
                hasActiveDownloads ? null : filteredWorkflows.length === 0 ? (
                <PageStateBoundary
                  empty={true}
                  className="min-h-80"
                  emptyOptions={{
                    title: search.trim()
                      ? t("workflows.noMatch")
                      : t(`workflows.empty.${activeTab}`),
                    description: t(
                      search.trim()
                        ? "workflows.searchEmptyDescription"
                        : activeTab === "mine"
                          ? "workflows.empty.mineDescription"
                          : "workflows.empty.officialDescription",
                    ),
                    actions:
                      activeTab === "mine"
                        ? [
                            {
                              key: "empty-import",
                              label: (
                                <span data-action-ui-id="workflows-empty-import">
                                  {t("workflows.import")}
                                </span>
                              ),
                              variant: "default",
                              icon: <Upload size={14} strokeWidth={1.5} />,
                              onClick: () => importInputRef.current?.click(),
                              disabled: importing,
                            },
                          ]
                        : [],
                  }}
                />
              ) : activeTab === "official" && detailWorkflow?.source === "official" ? (
                <div
                  key={"workflow-detail-browser"}
                  ref={inlineBrowserRef}
                  className="grid h-[calc(100vh-19rem)] min-h-[35rem] translate-x-0 grid-cols-[minmax(0,1fr)_clamp(10rem,22vw,18rem)] gap-4 opacity-100"
                  data-action-ui-id="workflows-inline-browser"
                >
                  {renderDetailView(true)}
                  <WorkflowDetailRail ariaLabel={t("workflows.tabs.official")}>
                    <div className="space-y-2">
                      {filteredWorkflows.map((workflow) => renderWorkflowCard(workflow, "rail"))}
                    </div>
                  </WorkflowDetailRail>
                </div>
              ) : (
                <div
                  key={"workflow-card-grid"}
                  className={
                    activeTab === "mine"
                      ? "grid grid-cols-1 gap-3 lg:grid-cols-2"
                      : "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  }
                >
                  {filteredWorkflows.map((workflow) => renderWorkflowCard(workflow))}
                </div>
              )}
            </div>
          </div>
        </main>
      )}
      <WorkflowDownloadConfirmDialog
        workflow={downloadWorkflow}
        onOpenChange={(open) => {
          if (!open) setDownloadWorkflow(null);
        }}
        onConfirm={handleConfirmDownload}
      />
      <WorkflowTutorialDialog open={tutorialOpen} onOpenChange={setTutorialOpen} />
    </>
  );
}
const SplitComponent = WorkflowsPage;
export { SplitComponent as component };
