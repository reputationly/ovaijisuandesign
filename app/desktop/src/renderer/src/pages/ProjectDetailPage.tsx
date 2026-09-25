import { useNavigate, useParams, useSearch } from "@tanstack/react-router"
import { ArrowLeft, ChevronRight, FolderOpen, Info, Plus } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { WorkspaceCard } from "../components/project/WorkspaceCard"
import type { NewWorkspaceConfirm } from "../components/project/dialogs"
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Hint } from "../components/ui/tooltip"
import { hiloPlatform } from "../api/runtime"
import { useNewWorkspaceDialog } from "../shell/new-workspace-dialog"
import { buildWorkspaceSearch, useHiloApp, useTopbarState } from "../shell/topbar"
import { handleNewWorkspaceOpenResult, workspaceRuntimeFromOpenResult } from "../shell/workspace-open"
import { useProject, useProjectActions, useProjectStore, type ProjectKind } from "../stores/projects"
import { useRecentWorkspaces, useRecentWorkspacesRefresh } from "../stores/recent-workspaces"
import { isWorkspacePathCaseInsensitivePlatform, mergeWorkspaceInventory, selectProjectWorkspaces } from "../stores/workspace-inventory"
import { PageState } from "./common"
import { projectListLocation } from "./ProjectsPage"

type DetailTabKey = "creations" | "localAssets" | "cloudAssets"

const PROJECT_DETAIL_TABS: { key: DetailTabKey; labelKey: string; infoKey: string; visibleFor: ProjectKind[] }[] = [
  { key: "creations", labelKey: "project.tabs.creations", infoKey: "project.tabs.creationsInfo", visibleFor: ["local", "team"] },
  { key: "localAssets", labelKey: "project.tabs.localAssets", infoKey: "project.tabs.localAssetsInfo", visibleFor: ["local"] },
  { key: "cloudAssets", labelKey: "project.tabs.cloudAssets", infoKey: "project.tabs.cloudAssetsInfo", visibleFor: ["team"] },
]

function visibleProjectDetailTabs(kind: ProjectKind) {
  return PROJECT_DETAIL_TABS.filter((tab) => tab.visibleFor.includes(kind))
}

/**
 * 项目详情：面包屑、页签（创作 / 本地资产 / 云端资产）、新建创作。
 * 本地资产依赖主进程的项目资产服务、云端资产依赖云端，两者都还是桩，页签只显示占位。
 */
export function ProjectDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const hiloApp = useHiloApp()
  const { projectId } = useParams({ strict: false }) as { projectId?: string }
  const { tab: tabAnchor } = useSearch({ strict: false }) as { tab?: string }
  const project = useProject(projectId)
  const { entries } = useTopbarState()
  const [recentWorkspaces, , recentHydrated] = useRecentWorkspaces()
  const [activeTab, setActiveTab] = useState<DetailTabKey>("creations")
  const { addWorkspaceToProject } = useProjectActions()
  useRecentWorkspacesRefresh()

  // 项目被解散或 id 不对：回项目库。等列表真的读出来再判断，免得首帧空列表误跳
  const { hydrated: projectsLoaded } = useProjectStore()
  useEffect(() => {
    if (project || !projectsLoaded) return
    void navigate(projectListLocation("local"))
  }, [navigate, project, projectsLoaded])

  const caseInsensitive = isWorkspacePathCaseInsensitivePlatform(hiloPlatform().app?.os)
  const inventory = useMemo(() => mergeWorkspaceInventory(recentHydrated ? recentWorkspaces : [], entries, { caseInsensitive }), [caseInsensitive, entries, recentHydrated, recentWorkspaces])
  const projectWorkspaces = useMemo(() => selectProjectWorkspaces(inventory, project, caseInsensitive), [caseInsensitive, inventory, project])

  const handleCreateWorkspace = useCallback<NewWorkspaceConfirm>(
    async (name, options) => {
      const result = await hiloApp
        .createWorkspaceWithResult({ name, loadUserMemory: options.loadUserMemory, allowDataDirectoryFallback: options.allowDataDirectoryFallback })
        .catch(() => null)
      if (!result) return
      const runtime = workspaceRuntimeFromOpenResult(result)
      if (options.projectId && runtime?.folderPath) await addWorkspaceToProject(runtime.folderPath, options.projectId, "project-detail-create")
      handleNewWorkspaceOpenResult(result, t, (rt) => navigate({ to: "/workspace", search: buildWorkspaceSearch(rt.workspaceId) }))
    },
    [addWorkspaceToProject, hiloApp, navigate, t],
  )
  const { requestOpenForProject, dialog: newWorkspaceDialog } = useNewWorkspaceDialog(handleCreateWorkspace)
  const requestNewWorkspace = useCallback(() => requestOpenForProject(projectId), [projectId, requestOpenForProject])

  const tabs = useMemo(() => visibleProjectDetailTabs(project?.kind ?? "local"), [project?.kind])
  useEffect(() => {
    if (!tabAnchor) return
    const target = tabs.find((tab) => tab.key === tabAnchor)
    if (target) setActiveTab(target.key)
  }, [tabAnchor, tabs])

  if (!project) return null

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--home-content-surface)]" data-action-ui-id="project-detail">
      {newWorkspaceDialog}
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
          <span aria-hidden="true" className="flex w-0 items-center overflow-hidden opacity-0 transition-all duration-150 group-hover:mr-1.5 group-hover:w-4 group-hover:opacity-100">
            <ArrowLeft size={14} strokeWidth={1.5} />
          </span>
          {t("project.listTitle")}
        </button>
        <ChevronRight size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground/40" aria-hidden="true" />
        <span className="min-w-0 truncate translate-y-px text-[14px] font-semibold leading-none text-foreground" data-action-ui-id="project-detail.breadcrumb-current">
          {project.name}
        </span>
      </div>
      <div className="mt-1.5 flex h-14 shrink-0 items-center justify-between gap-3 px-8 md:px-12">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (tabs.some((tab) => tab.key === value)) setActiveTab(value as DetailTabKey)
          }}
        >
          <TabsList variant="underline" className="gap-5" aria-label={t("project.tabsAria")} data-action-ui-id="project-detail.tabs">
            {tabs.map((tab) => (
              <Hint key={tab.key} content={t(tab.infoKey)} side="bottom">
                <TabsTrigger value={tab.key} variant="underline" className="gap-1 disabled:cursor-not-allowed disabled:text-muted-foreground/50" data-action-ui-id="project-detail.tab">
                  {t(tab.labelKey)}
                  <Info size={14} strokeWidth={2.25} className="shrink-0 opacity-60" />
                </TabsTrigger>
              </Hint>
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
            <PageState className="min-h-80" icon={<FolderOpen size={24} strokeWidth={1.5} />} text={t("project.creationsEmpty")} description={t("project.creationsEmptyDescription")} />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4" data-action-ui-id="project-detail.creations">
              {projectWorkspaces.map((item) => (
                <WorkspaceCard key={item.authoritativeEntry?.workspaceId ?? item.workspace.path} workspace={item.workspace} />
              ))}
            </div>
          )
        ) : (
          <p className="pt-8 text-center text-[13px] text-muted-foreground">{t("project.comingSoonBody")}</p>
        )}
      </div>
    </main>
  )
}
