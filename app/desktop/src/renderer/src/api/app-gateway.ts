import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import type { GatewayReadinessSnapshot } from "../ipc"
import { mainProcess } from "./main-process"
import { runtimeConfig } from "./runtime"

/**
 * 应用级 gateway：没有工作区，首页、项目库、项目详情这些页面用它。
 *
 * 和工作区页用的 `api/gateway.ts` 分开：那边指向「当前绑定的工作区」，工作区页还挂着
 * （或刚切走、绑定还没解）时也会指到工作区 gateway 上；这里永远是 preload 给的应用级地址，
 * 也不带工作区身份。
 */
export function appGatewayUrl(path: string): string | undefined {
  const base = runtimeConfig().gatewayUrl
  return base ? `${base}${path}` : undefined
}

export async function appGatewayFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = appGatewayUrl(path)
  if (!url) throw new Error("gateway 地址未就绪")
  const headers = new Headers(init?.headers)
  headers.set("x-request-id", crypto.randomUUID())
  return fetch(url, { ...init, headers })
}

/** 应用级 gateway 的就绪状态（主进程 `gateway-readiness` 频道）；没有主进程时按就绪处理 */
export function useGatewayReadiness(): GatewayReadinessSnapshot | null {
  const [snapshot, setSnapshot] = useState<GatewayReadinessSnapshot | null>(null)
  useEffect(() => {
    const main = mainProcess()
    if (!main) {
      setSnapshot({ state: "ready", url: runtimeConfig().gatewayUrl })
      return
    }
    let disposed = false
    const sub = main.gatewayReadiness.onDidChange((s) => {
      if (!disposed) setSnapshot(s)
    })
    main.gatewayReadiness
      .getSnapshot()
      .then((s) => {
        if (!disposed) setSnapshot(s)
      })
      .catch(() => {})
    return () => {
      disposed = true
      sub.dispose()
    }
  }, [])
  return snapshot
}

export function useGatewayReady(): boolean {
  return useGatewayReadiness()?.state === "ready"
}

export type ThumbnailMediaType = "image" | "video" | "audio"

export interface WorkspaceThumbnail {
  src: string
  name: string
  mediaType: ThumbnailMediaType
}

const THUMBNAIL_EXTENSIONS: Record<string, ThumbnailMediaType> = {
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".gif": "image",
  ".webp": "image",
  ".bmp": "image",
  ".svg": "image",
  ".mp4": "video",
  ".mov": "video",
  ".webm": "video",
  ".m4v": "video",
  ".mp3": "audio",
  ".wav": "audio",
  ".m4a": "audio",
  ".ogg": "audio",
  ".flac": "audio",
  ".aac": "audio",
}

function thumbnailMediaType(filename: string): ThumbnailMediaType | undefined {
  const dot = filename.lastIndexOf(".")
  return dot < 0 ? undefined : THUMBNAIL_EXTENSIONS[filename.slice(dot).toLowerCase()]
}

/** 工作区目录里挑几个媒体文件做封面；接口没有或失败都当没有封面 */
export async function fetchWorkspaceThumbnails(workspacePath: string): Promise<WorkspaceThumbnail[]> {
  let data: { files?: { name: string; absolutePath: string }[] }
  try {
    const res = await appGatewayFetch(`/api/files/scan-media?dir=${encodeURIComponent(workspacePath)}&limit=3`)
    if (!res.ok) return []
    data = await res.json()
  } catch {
    return []
  }
  return (data.files ?? []).flatMap((f) => {
    const mediaType = thumbnailMediaType(f.name)
    const src = mediaType ? appGatewayUrl(`/api/local-file?path=${encodeURIComponent(f.absolutePath)}&w=480`) : undefined
    return mediaType && src ? [{ src, name: f.name, mediaType }] : []
  })
}

export const WORKSPACE_THUMBNAILS_QUERY_ROOT = ["workspace-thumbnails"] as const
export const workspaceThumbnailsQueryKey = (workspacePath: string) => [...WORKSPACE_THUMBNAILS_QUERY_ROOT, workspacePath] as const
const WORKSPACE_THUMBNAILS_STALE_TIME = 5 * 60 * 1000

export function useWorkspaceThumbnails(workspacePath: string, enabled = true) {
  const gatewayReady = useGatewayReady()
  return useQuery({
    queryKey: workspaceThumbnailsQueryKey(workspacePath),
    queryFn: () => fetchWorkspaceThumbnails(workspacePath),
    enabled: gatewayReady && enabled,
    staleTime: WORKSPACE_THUMBNAILS_STALE_TIME,
    retry: false,
  })
}
