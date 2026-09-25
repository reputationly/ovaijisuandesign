import { useSyncExternalStore } from "react"

import { hiloPlatform } from "../api/runtime"

/**
 * 可见的工作区预览标签。
 *
 * 标签条目本身来自主进程（listWorkspaceEntries），这里只记「哪些在界面上可见、按什么顺序」：
 * localStorage 一份（同步读，首帧就有），再镜像到全局存储 `visiblePreviewTabs`，
 * 主进程启动恢复时据此决定预热哪一个。
 */
export interface PreviewTabReference {
  workspaceId: string
  folderPath?: string
}

export interface VisiblePreviewTabsSnapshot {
  /** 还没用主进程的标签列表对齐过：此时不能按「不在列表里」丢弃引用 */
  initialized: boolean
  tabs: PreviewTabReference[]
}

/** 只要能对上 workspaceId / folderPath 就行，主进程的标签条目和别处拼的引用都满足 */
export interface PreviewEntryLike {
  workspaceId: string
  folderPath: string
}

export interface DurableMirror {
  set(value: { version: 1; initialized: boolean; tabs: PreviewTabReference[] }): void
}

export const VISIBLE_PREVIEW_TABS_STORAGE_KEY = "hilo.topbar.visible-preview-tabs.v1"
const VISIBLE_PREVIEW_TABS_VERSION = 1

function nonEmptyOpaqueText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  return value.trim().length > 0 ? value : undefined
}

// 路径是不透明的标识：只判空，不裁剪不规范化，免得和主进程的 key 对不上
export function normalizeReference(value: unknown): PreviewTabReference | null {
  if (typeof value === "string") {
    const workspaceId = nonEmptyOpaqueText(value)
    return workspaceId ? { workspaceId } : null
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const candidate = value as { workspaceId?: unknown; folderPath?: unknown }
  const workspaceId = nonEmptyOpaqueText(candidate.workspaceId)
  if (!workspaceId) return null
  const folderPath = nonEmptyOpaqueText(candidate.folderPath)
  return folderPath ? { workspaceId, folderPath } : { workspaceId }
}

export function dedupeReferences(values: readonly unknown[]): PreviewTabReference[] {
  const seenWorkspaceIds = new Set<string>()
  const seenFolderPaths = new Set<string>()
  const result: PreviewTabReference[] = []
  for (const value of values) {
    const reference = normalizeReference(value)
    if (!reference || seenWorkspaceIds.has(reference.workspaceId)) continue
    if (reference.folderPath && seenFolderPaths.has(reference.folderPath)) continue
    seenWorkspaceIds.add(reference.workspaceId)
    if (reference.folderPath) seenFolderPaths.add(reference.folderPath)
    result.push(reference)
  }
  return result
}

function referencesEqual(left: PreviewTabReference[], right: PreviewTabReference[]): boolean {
  return (
    left.length === right.length &&
    left.every((reference, index) => reference.workspaceId === right[index]?.workspaceId && reference.folderPath === right[index]?.folderPath)
  )
}

type SyncStorage = Pick<Storage, "getItem" | "setItem">

// 旧版本存的是裸数组，也认
export function readSnapshot(storage: Pick<Storage, "getItem"> | null): VisiblePreviewTabsSnapshot {
  if (!storage) return { initialized: false, tabs: [] }
  try {
    const raw = storage.getItem(VISIBLE_PREVIEW_TABS_STORAGE_KEY)
    if (raw === null) return { initialized: false, tabs: [] }
    const parsed: unknown = JSON.parse(raw)
    const values = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && (parsed as { version?: unknown }).version === VISIBLE_PREVIEW_TABS_VERSION && Array.isArray((parsed as { tabs?: unknown }).tabs)
        ? ((parsed as { tabs: unknown[] }).tabs)
        : null
    if (!values) return { initialized: false, tabs: [] }
    return { initialized: true, tabs: dedupeReferences(values) }
  } catch {
    return { initialized: false, tabs: [] }
  }
}

function browserStorage(): SyncStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

let durablePreviewWriteQueue: Promise<void> = Promise.resolve()

/** 主进程读得到的那份：串行写，后一次总覆盖前一次，不会乱序 */
export function mainReadablePreviewTabsMirror(): DurableMirror {
  return {
    set: (value) => {
      const storage = hiloPlatform().storage
      if (!storage) return
      durablePreviewWriteQueue = durablePreviewWriteQueue
        .catch(() => undefined)
        .then(() => storage.globalSet("visiblePreviewTabs", value))
        .catch(() => undefined)
    },
  }
}

function entryReference(entry: PreviewEntryLike): PreviewTabReference {
  return { workspaceId: entry.workspaceId, folderPath: entry.folderPath }
}

/** 按可见引用的顺序挑出主进程里还在的条目；id 对不上时按目录再找一次（重启后 id 可能换） */
export function resolveVisiblePreviewEntries<E extends PreviewEntryLike>(entries: readonly E[], references: readonly PreviewTabReference[]): E[] {
  const byWorkspaceId = new Map(entries.map((entry) => [entry.workspaceId, entry]))
  const byFolderPath = new Map(entries.map((entry) => [entry.folderPath, entry]))
  const seen = new Set<string>()
  const visible: E[] = []
  for (const reference of references) {
    const entry = byWorkspaceId.get(reference.workspaceId) ?? (reference.folderPath ? byFolderPath.get(reference.folderPath) : undefined)
    if (!entry || seen.has(entry.workspaceId)) continue
    seen.add(entry.workspaceId)
    visible.push(entry)
  }
  return visible
}

/** 关掉一个标签后去哪：原位置上顶上来的那个（右边的），最右边的关了就取新的最右边 */
export function getNextPreviewTabIdAfterHide(orderedWorkspaceIds: readonly string[], hiddenWorkspaceId: string): string | null {
  const hiddenIndex = orderedWorkspaceIds.indexOf(hiddenWorkspaceId)
  if (hiddenIndex === -1) return null
  const remaining = orderedWorkspaceIds.filter((id) => id !== hiddenWorkspaceId)
  return remaining[Math.min(hiddenIndex, remaining.length - 1)] ?? null
}

/**
 * 启动恢复时打开哪一个：只在恢复出来的里面挑。
 * 还没对齐过（老用户第一次）就信主进程的偏好；对齐过则只挑用户上次可见的。
 */
export function selectStartupVisiblePreviewWorkspace(
  snapshot: VisiblePreviewTabsSnapshot,
  restoredWorkspaceIds: readonly unknown[],
  preferredWorkspaceId?: string,
): string | null {
  const restored = dedupeReferences(restoredWorkspaceIds).map((entry) => entry.workspaceId)
  if (restored.length === 0) return null
  const restoredSet = new Set(restored)
  if (!snapshot.initialized) {
    return preferredWorkspaceId && restoredSet.has(preferredWorkspaceId) ? preferredWorkspaceId : (restored[0] ?? null)
  }
  const visibleRestored: string[] = []
  const seen = new Set<string>()
  for (const reference of snapshot.tabs) {
    const restoredId = restoredSet.has(reference.workspaceId)
      ? reference.workspaceId
      : reference.folderPath && restoredSet.has(reference.folderPath)
        ? reference.folderPath
        : undefined
    if (!restoredId || seen.has(restoredId)) continue
    seen.add(restoredId)
    visibleRestored.push(restoredId)
  }
  if (preferredWorkspaceId && visibleRestored.includes(preferredWorkspaceId)) return preferredWorkspaceId
  return visibleRestored[0] ?? null
}

export interface VisiblePreviewTabsStore {
  getSnapshot(): VisiblePreviewTabsSnapshot
  getVisibleWorkspaceIds(): string[]
  subscribe(listener: () => void): () => void
  initialize(entries: readonly PreviewEntryLike[]): void
  show(entry: string | Partial<PreviewTabReference>): void
  replace(workspaceId: string, entry: string | Partial<PreviewTabReference>): void
  hide(workspaceIds: string | readonly string[]): void
  reorder(activeWorkspaceId: string, overWorkspaceId: string): void
}

export function createVisiblePreviewTabsStore(
  storage: SyncStorage | null = browserStorage(),
  durableMirror: DurableMirror = mainReadablePreviewTabsMirror(),
): VisiblePreviewTabsStore {
  let snapshot = readSnapshot(storage)
  let liveEntries: readonly PreviewEntryLike[] = []
  const listeners = new Set<() => void>()
  // 首次对齐前就被关掉的：对齐时别又把它从主进程列表里种回来
  const hiddenBeforeInitialization = new Set<string>()

  const persist = (value: VisiblePreviewTabsSnapshot) => {
    // 本地只在对齐后才写：没对齐时写进去的「空列表」会被下次启动当成用户关光了
    if (storage && value.initialized) {
      try {
        storage.setItem(VISIBLE_PREVIEW_TABS_STORAGE_KEY, JSON.stringify({ version: VISIBLE_PREVIEW_TABS_VERSION, tabs: [...value.tabs] }))
      } catch {
        // 只是偏好
      }
    }
    durableMirror.set({ version: VISIBLE_PREVIEW_TABS_VERSION, initialized: value.initialized, tabs: [...value.tabs] })
  }

  const publish = (tabs: readonly unknown[], initialized = true) => {
    const normalized = dedupeReferences(tabs)
    if (snapshot.initialized === initialized && referencesEqual(snapshot.tabs, normalized)) {
      persist(snapshot)
      return
    }
    snapshot = { initialized, tabs: normalized }
    persist(snapshot)
    for (const listener of listeners) listener()
  }

  return {
    getSnapshot: () => snapshot,
    getVisibleWorkspaceIds: () =>
      snapshot.initialized ? resolveVisiblePreviewEntries(liveEntries, snapshot.tabs).map((entry) => entry.workspaceId) : snapshot.tabs.map((tab) => tab.workspaceId),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    initialize: (entries) => {
      liveEntries = entries
      if (!snapshot.initialized) {
        const seeded = entries.filter((entry) => !hiddenBeforeInitialization.has(entry.workspaceId)).map(entryReference)
        publish([...seeded, ...snapshot.tabs], true)
        hiddenBeforeInitialization.clear()
        return
      }
      // 对齐过：只把引用换成主进程当前的 id / 目录，不增不减（关掉的标签主进程可能还留着冷条目）
      const byWorkspaceId = new Map(entries.map((entry) => [entry.workspaceId, entry]))
      const byFolderPath = new Map(entries.map((entry) => [entry.folderPath, entry]))
      const reconciled = snapshot.tabs.map((reference) => {
        const entry = byWorkspaceId.get(reference.workspaceId) ?? (reference.folderPath ? byFolderPath.get(reference.folderPath) : undefined)
        return entry ? entryReference(entry) : reference
      })
      publish(reconciled, true)
    },
    show: (entry) => {
      const reference = normalizeReference(entry)
      if (!reference) return
      hiddenBeforeInitialization.delete(reference.workspaceId)
      const existingIndex = snapshot.tabs.findIndex(
        (tab) => tab.workspaceId === reference.workspaceId || Boolean(tab.folderPath && reference.folderPath && tab.folderPath === reference.folderPath),
      )
      if (existingIndex === -1) {
        publish([...snapshot.tabs, reference], snapshot.initialized)
        return
      }
      const existing = snapshot.tabs[existingIndex]!
      const updatedReference = { workspaceId: reference.workspaceId, folderPath: reference.folderPath ?? existing.folderPath }
      if (existing.workspaceId === updatedReference.workspaceId && existing.folderPath === updatedReference.folderPath) return
      const updated = [...snapshot.tabs]
      updated[existingIndex] = updatedReference
      publish(updated, snapshot.initialized)
    },
    replace: (workspaceId, entry) => {
      const canonical = normalizeReference(entry)
      const previousId = nonEmptyOpaqueText(workspaceId)
      if (!canonical || !previousId) return
      hiddenBeforeInitialization.delete(canonical.workspaceId)
      let replaced = false
      const updated = snapshot.tabs.map((tab) => {
        if (tab.workspaceId !== previousId) return tab
        replaced = true
        return canonical
      })
      publish(replaced ? updated : [...updated, canonical], snapshot.initialized)
    },
    hide: (workspaceIds) => {
      const ids = new Set(
        (typeof workspaceIds === "string" ? [workspaceIds] : workspaceIds).map(nonEmptyOpaqueText).filter((id): id is string => Boolean(id)),
      )
      if (ids.size === 0) return
      if (!snapshot.initialized) for (const id of ids) hiddenBeforeInitialization.add(id)
      publish(
        snapshot.tabs.filter((tab) => !ids.has(tab.workspaceId)),
        snapshot.initialized,
      )
    },
    reorder: (activeWorkspaceId, overWorkspaceId) => {
      const fromIndex = snapshot.tabs.findIndex((tab) => tab.workspaceId === activeWorkspaceId)
      const toIndex = snapshot.tabs.findIndex((tab) => tab.workspaceId === overWorkspaceId)
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return
      const reordered = [...snapshot.tabs]
      const [moved] = reordered.splice(fromIndex, 1)
      if (!moved) return
      reordered.splice(toIndex, 0, moved)
      publish(reordered, snapshot.initialized)
    },
  }
}

export const visiblePreviewTabsStore = createVisiblePreviewTabsStore()

export function useVisiblePreviewTabsSnapshot(): VisiblePreviewTabsSnapshot {
  return useSyncExternalStore(visiblePreviewTabsStore.subscribe, visiblePreviewTabsStore.getSnapshot, visiblePreviewTabsStore.getSnapshot)
}

export function getVisiblePreviewTabIds(): string[] {
  return visiblePreviewTabsStore.getVisibleWorkspaceIds()
}

export function getStartupVisiblePreviewWorkspace(restoredWorkspaceIds: readonly unknown[], preferredWorkspaceId?: string): string | null {
  return selectStartupVisiblePreviewWorkspace(visiblePreviewTabsStore.getSnapshot(), restoredWorkspaceIds, preferredWorkspaceId)
}

export function showVisiblePreviewTab(entry: string | Partial<PreviewTabReference>): void {
  visiblePreviewTabsStore.show(entry)
}

export function replaceVisiblePreviewTab(workspaceId: string, entry: string | Partial<PreviewTabReference>): void {
  visiblePreviewTabsStore.replace(workspaceId, entry)
}

export function hideVisiblePreviewTabs(workspaceIds: string | readonly string[]): void {
  visiblePreviewTabsStore.hide(workspaceIds)
}
