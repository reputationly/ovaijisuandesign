import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from "lucide-react"
import type { CSSProperties } from "react"
import { Toaster as Sonner, toast, type ToasterProps } from "sonner"

import { useTheme } from "../../theme/ThemeProvider"

// 顶部居中、离顶 56px，层级压过弹窗和画布浮层
const Z_INDEX = 10100

export function Toaster({ style, ...rest }: ToasterProps) {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="top-center"
      offset={{ top: "calc(56px + env(safe-area-inset-top))" }}
      mobileOffset={{
        top: "calc(52px + env(safe-area-inset-top))",
        right: "calc(16px + env(safe-area-inset-right))",
        left: "calc(16px + env(safe-area-inset-left))",
      }}
      icons={{
        success: <CircleCheck className="size-4" />,
        info: <Info className="size-4" />,
        warning: <TriangleAlert className="size-4" />,
        error: <OctagonX className="size-4" />,
        loading: <LoaderCircle className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--elevated-border-color)",
          "--border-radius": "8px",
          zIndex: Z_INDEX,
          ...style,
        } as CSSProperties
      }
      toastOptions={{ classNames: { toast: "cn-toast" } }}
      {...rest}
    />
  )
}

// 同一句提示短时间内只弹一次，避免重连、轮询这类场景刷屏
const recent = new Map<string, number>()
const DEDUPE_MS = 2000

function once(kind: "success" | "error" | "info" | "warning", message: string) {
  const key = `${kind}:${message}`
  const now = Date.now()
  if ((recent.get(key) ?? 0) > now - DEDUPE_MS) return
  recent.set(key, now)
  toast[kind](message)
}

export const dedupedToast = {
  success: (m: string) => once("success", m),
  error: (m: string) => once("error", m),
  info: (m: string) => once("info", m),
  warning: (m: string) => once("warning", m),
}
