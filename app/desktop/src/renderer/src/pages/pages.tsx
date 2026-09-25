import { useNavigate, useParams, useSearch } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { CircleAlert, FileText, Library, LoaderCircle, MessageSquare, ToyBrick, Workflow } from "lucide-react"
import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { createSession } from "../api"
import { mainProcess } from "../api/main-process"
import { dedupedToast } from "../components/ui/sonner"
import { Home } from "../Home"
import { sortWorkspaces, useWorkspaceList, fetchWorkspaceList } from "../stores/workspaces"
import { WorkspaceView } from "../WorkspaceView"
import type { WorkspaceSearch } from "../router/search"
import { CatalogPage, PageState } from "./common"
import { openFailureMessage, useWorkspaceRuntime } from "./workspace-runtime"

/**
 * 首页。主体暂用旧首页（下一波换成新输入框），这里只负责把「发送」接到路由：
 * 建好（或选定）工作区后带着输入内容跳到 /workspace，由工作区页预填进对话框。
 */
/** 一句话一个新工作区：主进程在时由它建目录并起运行时，否则走旧后端 */
async function createWorkspaceFor(prompt: string, t: TFunction): Promise<string> {
  const main = mainProcess()
  if (main) {
    const r = await main.hilo.createWorkspaceWithResult({ name: prompt.slice(0, 40) })
    if (r.kind === "opened" || r.kind === "reused") return r.runtime.workspaceId
    throw new Error(openFailureMessage(r, t))
  }
  const list = await fetchWorkspaceList()
  const id = list.source === "canvases" ? (await createSession(prompt)).id : list.current
  if (!id) throw new Error(t("ov.workspace.missing"))
  return id
}

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const inFlight = useRef(false)

  const submit = async (prompt: string, attachments: string[]) => {
    if (inFlight.current) return
    inFlight.current = true
    setSubmitting(true)
    try {
      const workspaceId = await createWorkspaceFor(prompt, t)
      await navigate({
        to: "/workspace",
        search: { workspaceId, initialMessage: prompt, initialAttachments: attachments.length ? attachments : undefined },
      })
    } catch (e) {
      dedupedToast.error(e instanceof Error ? e.message : String(e))
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="legacy-surface flex min-h-0 flex-1 flex-col">
      <Home
        onSubmit={(p, _preset, attachments) => void submit(p, attachments ?? [])}
        submitting={submitting}
        projectName={null}
        onPickProject={() => {}}
        onOpenSkills={() => void navigate({ to: "/skills" })}
      />
    </div>
  )
}

export function WorkspacePage() {
  const { t } = useTranslation()
  const { workspaceId, initialMessage, initialAttachments } = useSearch({ strict: false }) as WorkspaceSearch
  const runtime = useWorkspaceRuntime(workspaceId, t)
  if (runtime.status === "starting") {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl bg-background elevated-surface-border text-muted-foreground" data-action-ui-id="workspace.loading">
        <LoaderCircle className="size-5 animate-spin" strokeWidth={1.5} />
      </div>
    )
  }
  if (runtime.status === "failed") {
    return (
      <div className="flex flex-1 rounded-xl bg-background elevated-surface-border">
        <PageState icon={<CircleAlert size={24} strokeWidth={1.5} />} text={runtime.message} />
      </div>
    )
  }
  // 换工作区或 gateway 重启（地址变了）时整棵重挂，旧连接上的订阅不会串过来
  return (
    <WorkspaceView
      key={`${workspaceId}|${runtime.gatewayUrl}`}
      workspaceId={workspaceId}
      initialMessage={initialMessage}
      initialAttachments={initialAttachments}
    />
  )
}

export function CreationsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data } = useWorkspaceList()
  const list = sortWorkspaces(data?.workspaces ?? [])
  return (
    <CatalogPage id="creations" title={t("homeSidebar.allCreations")}>
      {list.length ? (
        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {list.map((w) => (
            <button
              key={w.id}
              type="button"
              className="group flex flex-col gap-2 text-left"
              onClick={() => void navigate({ to: "/workspace", search: { workspaceId: w.id } })}
            >
              <span className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-border-soft bg-muted text-muted-foreground transition-colors group-hover:border-border">
                <MessageSquare size={24} strokeWidth={1.25} />
              </span>
              <span className="truncate text-sm text-foreground">{w.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <PageState />
      )}
    </CatalogPage>
  )
}

export function ProjectDetailPage() {
  const { t } = useTranslation()
  const { projectId } = useParams({ strict: false }) as { projectId?: string }
  const { data } = useWorkspaceList()
  const project = data?.projects.find((p) => p.id === projectId)
  return (
    <CatalogPage id="project-detail" title={project?.name ?? t("project.hubTitle")}>
      <PageState text={t("ov.page.placeholder")} />
    </CatalogPage>
  )
}

export function SkillsPage() {
  const { t } = useTranslation()
  return (
    <CatalogPage id="skills" title={t("skills.hubTitle")} subtitle={t("skills.hubDescription")}>
      <PageState icon={<ToyBrick size={24} strokeWidth={1.5} />} text={t("ov.page.placeholder")} />
    </CatalogPage>
  )
}

export function WorkflowsPage() {
  const { t } = useTranslation()
  return (
    <CatalogPage id="workflows" title={t("workflows.title")} subtitle={t("workflows.subtitle")}>
      <PageState icon={<Workflow size={24} strokeWidth={1.5} />} text={t("common.comingSoon")} />
    </CatalogPage>
  )
}

export function AssetCenterPage() {
  const { t } = useTranslation()
  return (
    <CatalogPage id="asset-center" title={t("assetCenter.title")} subtitle={t("assetCenter.subtitle")}>
      <PageState icon={<Library size={24} strokeWidth={1.5} />} text={t("ov.page.placeholder")} />
    </CatalogPage>
  )
}

export function ChangelogPage() {
  const { t } = useTranslation()
  return (
    <CatalogPage id="changelog" title={t("homeSidebar.changelog")}>
      <PageState icon={<FileText size={24} strokeWidth={1.5} />} text={t("ov.page.placeholder")} />
    </CatalogPage>
  )
}
