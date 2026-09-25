import { gatewayJson } from "./gateway"
import { invokeRaw, mainProcess } from "./main-process"
import type { PlatformSettingsInfo } from "./runtime"

interface PlatformSettingsService {
  get(): Promise<PlatformSettingsInfo>
  save(patch: Record<string, unknown>): Promise<{ ok: boolean }>
}

const service = () => mainProcess()?.getService<PlatformSettingsService>("platform-settings")

/**
 * 平台设置（接口地址、API Key、各模态模型）的读写。
 *
 * 优先走主进程总线：配置文件归主进程管，保存后请求重启 opencode 让新配置生效；
 * 没有主进程时（浏览器里直接开 renderer、或旧 gateway）退回 HTTP /api/settings。
 */
export async function loadPlatformSettings(): Promise<PlatformSettingsInfo> {
  const svc = service()
  if (svc) return svc.get()
  return gatewayJson<PlatformSettingsInfo>("/api/settings")
}

export interface PlatformSettingsPatch {
  baseUrl?: string
  /** 空串表示不改已保存的 key */
  apiKey?: string
  chatModel?: string
  image?: string
  imageEdit?: string
  video?: string
  videoRef?: string
  videoUpscale?: string
  imageUpscale?: string
  music?: string
  musicEdit?: string
  speech?: string
}

export async function savePlatformSettings(patch: PlatformSettingsPatch): Promise<void> {
  const svc = service()
  if (svc) {
    await svc.save(patch as Record<string, unknown>)
    // 重启失败不算保存失败：下次打开工作区时也会按新配置起
    await invokeRaw("opencode:restart").catch(() => {})
    return
  }
  await gatewayJson("/api/settings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  })
}

/** 模型表单里的字段与后端 models 对象里蛇形键的对应 */
export const MODEL_FIELDS = [
  ["image", "image"],
  ["imageEdit", "image_edit"],
  ["video", "video"],
  ["videoRef", "video_ref"],
  ["videoUpscale", "video_upscale"],
  ["imageUpscale", "image_upscale"],
  ["music", "music"],
  ["musicEdit", "music_edit"],
  ["speech", "speech"],
] as const

export type ModelField = (typeof MODEL_FIELDS)[number][0]

/** 后端的 models 可能是蛇形也可能是驼峰（旧 gateway），两种都认 */
export function readModel(models: Record<string, unknown>, field: ModelField): string {
  const snake = MODEL_FIELDS.find(([f]) => f === field)![1]
  const v = models[field] ?? models[snake]
  return typeof v === "string" ? v : ""
}
