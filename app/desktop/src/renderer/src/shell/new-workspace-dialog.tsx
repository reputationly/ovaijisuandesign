import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { NewWorkspaceDialog, type NewWorkspaceConfirm } from "../components/project/dialogs"
import { useTopbarActions } from "./topbar"

/**
 * 全应用共用一个新建项目弹窗：菜单「新建」、侧栏、首页都通过它开，
 * 各入口可以带自己的确认回调（比如项目详情页要把新工作区挂到当前项目）。
 */
export const OPEN_NEW_WORKSPACE_DIALOG_EVENT = "hilo:open-new-workspace-dialog"

interface NewWorkspaceDialogContextValue {
  open: boolean
  requestOpen: (onConfirm?: NewWorkspaceConfirm, presetProjectId?: string) => void
  close: () => void
}

const NewWorkspaceDialogContext = createContext<NewWorkspaceDialogContextValue | null>(null)

export function NewWorkspaceDialogProvider({ children }: { children: ReactNode }) {
  const { createWorkspace } = useTopbarActions()
  const [open, setOpen] = useState(false)
  const [presetProjectId, setPresetProjectId] = useState<string | undefined>(undefined)
  const confirmHandlerRef = useRef<NewWorkspaceConfirm | null>(null)

  const defaultConfirm = useCallback<NewWorkspaceConfirm>((name, options) => createWorkspace(name, options), [createWorkspace])

  const requestOpen = useCallback((onConfirm?: NewWorkspaceConfirm, nextPresetProjectId?: string) => {
    confirmHandlerRef.current = onConfirm ?? null
    setPresetProjectId(nextPresetProjectId)
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    confirmHandlerRef.current = null
    setPresetProjectId(undefined)
    setOpen(false)
  }, [])

  useEffect(() => {
    const handleOpen = () => requestOpen()
    window.addEventListener(OPEN_NEW_WORKSPACE_DIALOG_EVENT, handleOpen)
    return () => window.removeEventListener(OPEN_NEW_WORKSPACE_DIALOG_EVENT, handleOpen)
  }, [requestOpen])

  const handleConfirm = useCallback<NewWorkspaceConfirm>(
    (name, options) => {
      const handler = confirmHandlerRef.current ?? defaultConfirm
      confirmHandlerRef.current = null
      return handler(name, options)
    },
    [defaultConfirm],
  )

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      confirmHandlerRef.current = null
      setPresetProjectId(undefined)
    }
    setOpen(nextOpen)
  }, [])

  const value = useMemo(() => ({ open, requestOpen, close }), [close, open, requestOpen])
  return (
    <NewWorkspaceDialogContext.Provider value={value}>
      {children}
      <NewWorkspaceDialog open={open} onOpenChange={handleOpenChange} onConfirm={handleConfirm} defaultProjectId={presetProjectId} />
    </NewWorkspaceDialogContext.Provider>
  )
}

/** 在 Provider 里就用共享弹窗（dialog 为 null）；外面单独用时自带一个 */
export function useNewWorkspaceDialog(onConfirm?: NewWorkspaceConfirm) {
  const shared = useContext(NewWorkspaceDialogContext)
  const [open, setOpen] = useState(false)
  const [presetProjectId, setPresetProjectId] = useState<string | undefined>(undefined)

  const requestOpenForProject = useCallback(
    (projectId?: string) => {
      if (shared) {
        shared.requestOpen(onConfirm, projectId)
        return
      }
      setPresetProjectId(projectId)
      setOpen(true)
    },
    [onConfirm, shared],
  )
  const requestOpen = useCallback(() => requestOpenForProject(undefined), [requestOpenForProject])

  if (shared) return { open: shared.open, requestOpen, requestOpenForProject, dialog: null }
  const dialog = onConfirm ? <NewWorkspaceDialog open={open} onOpenChange={setOpen} onConfirm={onConfirm} defaultProjectId={presetProjectId} /> : null
  return { open, requestOpen, requestOpenForProject, dialog }
}
