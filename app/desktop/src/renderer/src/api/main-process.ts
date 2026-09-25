import { connectMainProcess, type MainProcessConnection } from "../ipc"
import { hiloBridge, hiloPlatform } from "./runtime"

let conn: MainProcessConnection | null | undefined

/**
 * 主进程总线的连接，全应用共用一条，首次使用时建立。
 * 没有 preload（浏览器里直接开 renderer）时返回 null，调用方走降级路径。
 */
export function mainProcess(): MainProcessConnection | null {
  if (conn !== undefined) return conn
  const ipc = hiloBridge().ipcRenderer
  conn = ipc ? connectMainProcess(ipc) : null
  return conn
}

/** 全局存储（主进程的 hub-config）。没有主进程时读写 localStorage 兜底 */
export async function globalGet<T>(key: string): Promise<T | undefined> {
  const storage = hiloPlatform().storage
  if (storage) return (await storage.globalGet(key)) as T | undefined
  try {
    const raw = localStorage.getItem(`ov.global.${key}`)
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}

export async function globalSet(key: string, value: unknown): Promise<void> {
  const storage = hiloPlatform().storage
  if (storage) return storage.globalSet(key, value)
  try {
    localStorage.setItem(`ov.global.${key}`, JSON.stringify(value))
  } catch {
    // 只是偏好
  }
}

/** 订阅白名单内的原始频道（menu:* 等），没有 preload 时什么都不做 */
export function onRawChannel(channel: string, fn: (...args: unknown[]) => void): () => void {
  const ipc = hiloBridge().ipcRenderer
  if (!ipc) return () => {}
  return ipc.on(channel, (_e, ...args) => fn(...args))
}

export function invokeRaw(channel: string, ...args: unknown[]): Promise<unknown> {
  const ipc = hiloBridge().ipcRenderer
  if (!ipc) return Promise.reject(new Error("主进程不可用"))
  return ipc.invoke(channel, ...args)
}
