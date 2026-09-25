import { create } from "zustand"

/**
 * 全局偏好（语言、主题、侧栏宽度……）。
 *
 * 落盘键 `hilo:storage:global.config`：i18n 在 React 挂载前就要同步读出语言，
 * 所以必须是 localStorage 这种同步存储；将来主进程接管存储时这里仍作为缓存。
 */
export type ThemePref = "light" | "dark" | "system"
export type Language = "zh" | "en"

export interface GlobalConfig {
  language?: Language
  theme: ThemePref
  islandLayout: boolean
  transparentWindowExperiment: boolean
  watermarkEnabled: boolean
  runOnStartup: boolean
  trayEnabled: boolean
  windowCloseBehavior: "ask" | "tray" | "quit"
  networkProxyMode: "auto" | "system" | "direct"
  recentProjectsSortMode: "priority" | "recent" | "manual"
  recentProjectsGroupMode: "none" | "project"
  globalSidebarWidth: number
  globalSidebarPinned: boolean
  /** 新建项目弹窗里「加载用户记忆」上次的选择 */
  newProjectPrefs?: { loadUserMemory?: boolean }
  projectsSortMode?: "updated" | "created" | "name"
}

export const STORAGE_KEY = "hilo:storage:global.config"

export const DEFAULT_CONFIG: GlobalConfig = {
  theme: "system",
  islandLayout: true,
  transparentWindowExperiment: false,
  watermarkEnabled: false,
  runOnStartup: false,
  trayEnabled: true,
  windowCloseBehavior: "ask",
  networkProxyMode: "auto",
  recentProjectsSortMode: "recent",
  recentProjectsGroupMode: "project",
  globalSidebarWidth: 264,
  globalSidebarPinned: true,
}

/** 读盘；坏数据整份丢弃回默认，不让一个手改坏的 JSON 卡死启动。 */
// 默认值取 globalThis 上的：Node 24 没有全局 localStorage，直接引用会在模块加载时抛错。
export function readConfig(store: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): GlobalConfig {
  try {
    const raw = store?.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CONFIG }
    const parsed = JSON.parse(raw) as Partial<GlobalConfig>
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

interface ConfigStore {
  config: GlobalConfig
  update: (patch: Partial<GlobalConfig>) => void
}

export const useGlobalConfig = create<ConfigStore>((set, get) => ({
  config: readConfig(),
  update: (patch) => {
    const next = { ...get().config, ...patch }
    set({ config: next })
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // 存储满或被禁用：本次会话内仍然生效
    }
  },
}))

/** 只取一个字段，避免整份配置变化时无关组件重渲染 */
export function useConfigValue<K extends keyof GlobalConfig>(key: K): GlobalConfig[K] {
  return useGlobalConfig((s) => s.config[key])
}
