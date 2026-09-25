import { getNextPreviewTabIdAfterHide } from "../stores/tabs"

/**
 * 关标签的纯逻辑：算出关完去哪、按顺序触发副作用。副作用由调用方注入，方便单测。
 */
export interface PreviewEntryRef {
  workspaceId: string
  gatewayUrl?: string
}

export interface PreviewHideEffects {
  hidePreview(workspaceId: string): void
  activateWorkspace(workspaceId: string): void
  activateHome(): void
  requestRuntimeClose(workspaceId: string, source: string): void
}

export interface PreviewBatchHideEffects {
  hidePreviews(workspaceIds: string[]): void
  activateWorkspace(workspaceId: string): void
  requestRuntimeClose(workspaceId: string, source: string): void
}

export function getNextWorkspaceIdAfterClose(entries: readonly PreviewEntryRef[], closingWorkspaceId: string): string | null {
  return getNextPreviewTabIdAfterHide(
    entries.map((entry) => entry.workspaceId),
    closingWorkspaceId,
  )
}

/** 先藏标签、再切走、最后才请主进程停运行时：停不掉时主进程拒绝，标签会被重新显示 */
export function performWorkspacePreviewHide(
  entries: readonly PreviewEntryRef[],
  workspaceId: string,
  currentWorkspaceId: string | null,
  source: string,
  effects: PreviewHideEffects,
): void {
  const nextWorkspaceId = getNextWorkspaceIdAfterClose(entries, workspaceId)
  const wasActive = workspaceId === currentWorkspaceId
  effects.hidePreview(workspaceId)
  if (wasActive) {
    if (nextWorkspaceId) effects.activateWorkspace(nextWorkspaceId)
    else effects.activateHome()
  }
  effects.requestRuntimeClose(workspaceId, source)
}

function performWorkspacePreviewsBatchHide(
  workspaceId: string,
  currentWorkspaceId: string | null,
  hiddenWorkspaceIds: string[],
  source: string,
  effects: PreviewBatchHideEffects,
): void {
  if (hiddenWorkspaceIds.length === 0) return
  const currentWasHidden = Boolean(currentWorkspaceId && hiddenWorkspaceIds.includes(currentWorkspaceId))
  effects.hidePreviews(hiddenWorkspaceIds)
  if (currentWasHidden) effects.activateWorkspace(workspaceId)
  for (const hiddenWorkspaceId of hiddenWorkspaceIds) effects.requestRuntimeClose(hiddenWorkspaceId, source)
}

export function performOtherWorkspacePreviewsHide(
  entries: readonly PreviewEntryRef[],
  workspaceId: string,
  currentWorkspaceId: string | null,
  effects: PreviewBatchHideEffects,
): void {
  if (!entries.some((entry) => entry.workspaceId === workspaceId)) return
  performWorkspacePreviewsBatchHide(
    workspaceId,
    currentWorkspaceId,
    entries.filter((entry) => entry.workspaceId !== workspaceId).map((entry) => entry.workspaceId),
    "topbar-context-close-others",
    effects,
  )
}

export function performWorkspacePreviewsToRightHide(
  entries: readonly PreviewEntryRef[],
  workspaceId: string,
  currentWorkspaceId: string | null,
  effects: PreviewBatchHideEffects,
): void {
  const index = entries.findIndex((entry) => entry.workspaceId === workspaceId)
  if (index === -1) return
  performWorkspacePreviewsBatchHide(
    workspaceId,
    currentWorkspaceId,
    entries.slice(index + 1).map((entry) => entry.workspaceId),
    "topbar-context-close-right",
    effects,
  )
}

/** 冷标签（没起进程、没有 gateway 地址）交给工作区页去拉起；热的直接让主进程切过去 */
export function shouldActivateWorkspaceThroughRoute(entries: readonly PreviewEntryRef[], workspaceId: string): boolean {
  const entry = entries.find((candidate) => candidate.workspaceId === workspaceId)
  return Boolean(entry && !entry.gatewayUrl)
}
