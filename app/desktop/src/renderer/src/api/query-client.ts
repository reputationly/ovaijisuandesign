import { QueryClient } from "@tanstack/react-query"

/**
 * 数据只靠显式失效刷新（多半由 WS 事件触发），不做窗口聚焦 / 重连自动重拉：
 * 桌面应用切回前台就整页重拉，只会让画布和列表无故闪一下。
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        networkMode: "always",
      },
      mutations: { networkMode: "always" },
    },
  })
}

export const queryClient = createQueryClient()

export const queryKeys = {
  workspace: ["workspace"] as const,
  sessions: ["sessions"] as const,
  settings: ["settings"] as const,
  models: ["models"] as const,
}
