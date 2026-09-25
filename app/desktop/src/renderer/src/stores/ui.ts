import { create } from "zustand"

/** 设置弹窗：打开状态与当前分区，任何地方都能直接打开到某一节 */
export const SETTINGS_SECTIONS = [
  "general",
  "account",
  "storage",
  "network",
  "models",
  "memory",
  "imBridge",
  "assetCenter",
  "comfyui",
  "advanced",
  "softwareUpdate",
] as const
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]

interface SettingsDialogState {
  open: boolean
  section: SettingsSection
  openAt: (section?: SettingsSection) => void
  setSection: (section: SettingsSection) => void
  close: () => void
}

export const useSettingsDialog = create<SettingsDialogState>((set) => ({
  open: false,
  section: "general",
  openAt: (section) => set((s) => ({ open: true, section: section ?? s.section })),
  setSection: (section) => set({ section }),
  close: () => set({ open: false }),
}))

/**
 * 工作区布局。split = 对话 + 画布并排；focus = 只显示一侧。
 * 对话栏宽度记在本地，下次打开保持原样。
 */
export type LayoutMode = "split" | "focus"
export type Pane = "chat" | "canvas"

export const CHAT_WIDTH = { min: 320, max: 720, initial: 366 } as const

interface LayoutState {
  mode: LayoutMode
  focusPane: Pane
  chatSide: "left" | "right"
  chatWidth: number
  setMode: (mode: LayoutMode, focusPane?: Pane) => void
  setChatSide: (side: "left" | "right") => void
  setChatWidth: (w: number) => void
}

const LAYOUT_KEY = "ov.workspace-layout.v1"

function loadLayout(): Pick<LayoutState, "mode" | "focusPane" | "chatSide" | "chatWidth"> {
  const fallback = { mode: "split" as const, focusPane: "canvas" as const, chatSide: "right" as const, chatWidth: CHAT_WIDTH.initial }
  try {
    const raw = localStorage.getItem(LAYOUT_KEY)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

export const clampChatWidth = (w: number) => Math.round(Math.min(CHAT_WIDTH.max, Math.max(CHAT_WIDTH.min, w)))

export const useWorkspaceLayout = create<LayoutState>((set, get) => {
  const persist = () => {
    const { mode, focusPane, chatSide, chatWidth } = get()
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify({ mode, focusPane, chatSide, chatWidth }))
    } catch {
      // 忽略：只是偏好
    }
  }
  return {
    ...loadLayout(),
    setMode: (mode, focusPane) => {
      set((s) => ({ mode, focusPane: focusPane ?? s.focusPane }))
      persist()
    },
    setChatSide: (chatSide) => {
      set({ chatSide })
      persist()
    },
    setChatWidth: (w) => {
      set({ chatWidth: clampChatWidth(w) })
      persist()
    },
  }
})
