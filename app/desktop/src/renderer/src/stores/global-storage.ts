import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { globalGet, globalSet } from "../api/main-process"

/**
 * 主进程全局存储（hub-config）里某个键的读写，走 react-query 缓存：
 * 同一个键在多处用时共享一份，写完直接更新缓存，别处通过失效重拉跟上主进程的变化。
 */
export const storageKeys = {
  global: (key: string) => ["storage", "global", key] as const,
}

type Updater<T> = T | ((previous: T) => T)

export function useGlobalStorage<T>(key: string, fallback: T): [T, (updater: Updater<T>) => Promise<boolean>, boolean] {
  const qc = useQueryClient()
  const queryKey = storageKeys.global(key)
  const query = useQuery({
    queryKey,
    queryFn: async () => (await globalGet<T>(key)) ?? null,
    // 主进程之外也会改它（主进程记最近打开、别的窗口），靠显式失效刷新
    staleTime: Infinity,
  })
  const value = (query.data ?? fallback) as T

  const setAsync = useCallback(
    async (updater: Updater<T>) => {
      try {
        // 以存储里的最新值为底，别拿可能过期的缓存去覆盖主进程刚写的内容
        const latest = ((await globalGet<T>(key)) ?? qc.getQueryData<T | null>(queryKey) ?? fallback) as T
        const next = typeof updater === "function" ? (updater as (p: T) => T)(latest) : updater
        await globalSet(key, next)
        qc.setQueryData(queryKey, next)
        return true
      } catch {
        return false
      }
    },
    // queryKey、fallback 每次渲染都是新对象，按 key 缓存即可
    [key, qc],
  )

  return [value, setAsync, query.isFetched]
}
