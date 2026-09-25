import type { TFunction } from "i18next"

import { dropConnection } from "../chat"
import { dedupedToast } from "../components/ui/sonner"
import i18n from "../i18n"
import type { IHiloApp, WorkspaceCloseResult, WorkspaceEntry, WorkspaceOpenResult, WorkspaceRuntimeInfo } from "../ipc"
import { showVisiblePreviewTab } from "../stores/tabs"

/**
 * 打开 / 关闭工作区结果的统一处理：成功就跳过去，失败按原因提示。
 * 各入口（侧栏、项目详情、新建对话框、菜单）都走这里，提示文案保持一致。
 */
const zh = () => (i18n.resolvedLanguage ?? i18n.language ?? "zh").startsWith("zh")

const MAX_LISTED_BUSY_PROJECTS = 3

function formatBusyProjects(names: string[]): string {
  const listed = names.slice(0, MAX_LISTED_BUSY_PROJECTS).join(zh() ? "、" : ", ")
  if (names.length <= MAX_LISTED_BUSY_PROJECTS) return listed
  return zh() ? `${listed} 等` : `${listed} and others`
}

export function workspaceRuntimeFromOpenResult(result: WorkspaceOpenResult): WorkspaceRuntimeInfo | undefined {
  return result.kind === "opened" || result.kind === "reused" ? result.runtime : undefined
}

export function toastWorkspaceOpenResult(result: WorkspaceOpenResult | { kind: "cancelled" }, t: TFunction): void {
  switch (result.kind) {
    case "limit_reached": {
      const projects = formatBusyProjects(result.busyProjectNames)
      dedupedToast.warning(
        projects
          ? t("workspace.open.limitReachedNamed", { max: result.maxOpenWorkspaces, projects })
          : t("workspace.open.limitReached", { max: result.maxOpenWorkspaces }),
      )
      break
    }
    case "retry_in_flight":
      dedupedToast.info(t("workspace.open.retryInFlight"))
      break
    case "storage_restart_required":
      dedupedToast.warning(t("workspace.open.storageRestartRequired"))
      break
    case "storage_unavailable":
      dedupedToast.warning(t(result.statusSource === "verified" ? "workspace.open.storageUnavailable" : "workspace.open.storageStatusUnavailable"))
      break
    case "storage_migration_in_progress":
      dedupedToast.warning(t("workspace.open.storageMigrationInProgress"))
      break
  }
}

export function handleWorkspaceOpenResult(
  result: WorkspaceOpenResult,
  t: TFunction,
  navigateToWorkspace: (runtime: WorkspaceRuntimeInfo) => unknown,
): WorkspaceRuntimeInfo | undefined {
  const runtime = workspaceRuntimeFromOpenResult(result)
  if (runtime) {
    navigateToWorkspace(runtime)
    return runtime
  }
  toastWorkspaceOpenResult(result, t)
  return undefined
}

/** 新建时选的文件夹其实已经有工作区：提示一句再切过去 */
export function handleNewWorkspaceOpenResult(
  result: WorkspaceOpenResult,
  t: TFunction,
  navigateToWorkspace: (runtime: WorkspaceRuntimeInfo) => unknown,
  alreadyKnown = false,
): WorkspaceRuntimeInfo | undefined {
  const isReopenOfKnown = result.kind === "reused" || (result.kind === "opened" && alreadyKnown)
  if (isReopenOfKnown) {
    dedupedToast.info(t("workspace.open.alreadyOpen"))
    navigateToWorkspace(result.runtime)
    return result.runtime
  }
  return handleWorkspaceOpenResult(result, t, navigateToWorkspace)
}

/**
 * 从最近列表 / 卡片打开：先让主进程登记成（冷）标签，显示出来再跳到工作区页，
 * 进程由工作区页激活时拉起，点击本身不等启动。
 */
export async function stageWorkspacePreview({
  hiloApp,
  folderPath,
  t,
  onStaged,
}: {
  hiloApp: Pick<IHiloApp, "stageWorkspaceTab">
  folderPath: string
  t: TFunction
  onStaged: (entry: WorkspaceEntry) => unknown
}): Promise<WorkspaceEntry | undefined> {
  const result = await hiloApp.stageWorkspaceTab(folderPath)
  if (result.kind !== "staged") {
    if (result.kind === "retry_in_flight") toastWorkspaceOpenResult(result, t)
    return undefined
  }
  showVisiblePreviewTab(result.entry)
  await onStaged(result.entry)
  return result.entry
}

function toastWorkspaceCloseBlocked(result: Partial<WorkspaceCloseResult>): void {
  const key =
    result.reason === "storage"
      ? "workspace.close.blockedStorage"
      : result.reason === "unsaved"
        ? "workspace.close.blockedUnsaved"
        : result.reason === "active"
          ? "workspace.close.blockedActive"
          : "workspace.close.blockedGeneric"
  dedupedToast.warning(i18n.t(key))
}

/** 请主进程停掉运行时；被拒（有未保存内容、任务还在跑）就把标签放回来 */
export async function requestWorkspaceRuntimeClose(
  hiloApp: Pick<IHiloApp, "closeWorkspace">,
  workspaceId: string,
  source: string,
): Promise<WorkspaceCloseResult | undefined> {
  try {
    const result = await hiloApp.closeWorkspace(workspaceId, { source })
    if (!result.closed) {
      showVisiblePreviewTab(workspaceId)
      toastWorkspaceCloseBlocked(result)
    } else {
      dropConnection(workspaceId)
    }
    return result
  } catch {
    showVisiblePreviewTab(workspaceId)
    toastWorkspaceCloseBlocked({})
    return undefined
  }
}
