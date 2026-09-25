/**
 * preload 注入的运行时配置（`window.__HILO_CONFIG__`）与平台桥（`window.__HILO_PLATFORM__` / `window.hilo`）。
 * 浏览器里直接开 renderer 时这些都不存在，这里给出可用的默认值，调用方按「可能没有」处理。
 */
export interface RuntimeConfig {
  /** 应用级 gateway（没有工作区）；工作区的地址从主进程的工作区运行信息里取 */
  gatewayUrl: string
  wsUrl: string
  appVersion: string
  platform: string
  /** 发行区域：overseas → 默认英文，其余 → 默认中文 */
  region: string
}

export interface PlatformSettingsInfo {
  path: string
  workspace: string
  port: number
  platform: { baseUrl: string; apiKeyMasked: string; hasApiKey: boolean; chatModel: string }
  models: Record<string, unknown>
}

type Unsubscribe = () => void

/** preload 暴露的 `window.hilo`，这里只声明界面用到的部分 */
export interface HiloBridge {
  ipcRenderer?: {
    send(channel: string, ...args: unknown[]): void
    invoke(channel: string, ...args: unknown[]): Promise<unknown>
    on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): Unsubscribe
  }
  diagnostics?: { openLogDir(): Promise<unknown>; getLogPath(): Promise<unknown> }
}

/** `window.__HILO_PLATFORM__` 里界面用到的部分 */
export interface HiloPlatform {
  app?: { os?: string }
  storage?: {
    globalGet(key: string): Promise<unknown>
    globalSet(key: string, value: unknown): Promise<void>
    onGlobalConfigChanged(cb: (patch: unknown) => void): Unsubscribe
  }
  shell?: { openPath(path: string): Promise<unknown>; showItemInFolder(path: string): Promise<unknown> }
  fs?: { showOpenDialog?(opts: { directory?: boolean; multiple?: boolean; title?: string }): Promise<string[] | undefined> }
  window?: { setTitle(title: string): void }
  clipboard?: { writeText(text: string): void }
}

declare global {
  interface Window {
    __HILO_CONFIG__?: Partial<RuntimeConfig>
    __HILO_PLATFORM__?: HiloPlatform
    hilo?: HiloBridge
  }
}

export function runtimeConfig(): RuntimeConfig {
  const c = (typeof window !== "undefined" && window.__HILO_CONFIG__) || {}
  return {
    gatewayUrl: (c.gatewayUrl ?? "").replace(/\/+$/, ""),
    wsUrl: c.wsUrl ?? "",
    appVersion: c.appVersion ?? "0.0.0",
    platform: c.platform ?? (typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "darwin" : "unknown"),
    region: c.region ?? "domestic",
  }
}

export function hiloBridge(): HiloBridge {
  return (typeof window !== "undefined" && window.hilo) || {}
}

export function hiloPlatform(): HiloPlatform {
  return (typeof window !== "undefined" && window.__HILO_PLATFORM__) || {}
}

export const isMac = () => runtimeConfig().platform === "darwin"
