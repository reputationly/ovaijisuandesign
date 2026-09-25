import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { applyTheme, resolve, watchSystem } from "../appearance"
import { readConfig, useGlobalConfig, type ThemePref } from "../stores/global-config"

interface ThemeValue {
  /** 用户偏好 */
  theme: ThemePref
  /** 实际生效的明暗 */
  resolvedTheme: "light" | "dark"
  setTheme: (t: ThemePref) => void
}

const ThemeCtx = createContext<ThemeValue | null>(null)

/** 首帧之前调用：先把 .dark 挂上，避免深色用户启动时闪一下白 */
export function applyInitialTheme() {
  const dark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
  applyTheme(resolve(readConfig().theme, !!dark))
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useGlobalConfig((s) => s.config.theme)
  const update = useGlobalConfig((s) => s.update)
  const [systemDark, setSystemDark] = useState(false)

  // 始终订阅系统明暗：从「深色」切回「跟随系统」时能立刻拿到当前值
  useEffect(() => watchSystem(setSystemDark), [])

  const resolvedTheme = resolve(theme, systemDark)
  useEffect(() => applyTheme(resolvedTheme), [resolvedTheme])

  const setTheme = useCallback((t: ThemePref) => update({ theme: t }), [update])
  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme])
  return <ThemeCtx value={value}>{children}</ThemeCtx>
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error("useTheme 必须在 ThemeProvider 里使用")
  return ctx
}
