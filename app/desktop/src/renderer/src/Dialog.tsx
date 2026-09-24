import { X } from "lucide-react"
import { useEffect, type ReactNode } from "react"

/**
 * 弹窗外壳。尺寸和类名照官方的 `im-bridge-dialog`：
 *
 * ```
 * h-[min(540px,calc(100vh-4rem))] w-[calc(100vw-2rem)] max-w-[720px]
 * rounded-xl bg-popover shadow-lg  +  .elevated-surface-border
 * ```
 *
 * 高度用 `min(540, 100vh-4rem)` 而不是 `max-h`：**弹窗高度固定**，
 * 内容多少都一样高，切换里面的分页时四边不会跳。窗口很矮时才让步。
 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  // Esc 关闭。**capture 阶段监听** —— 弹窗里可能有输入框，
  // 冒泡阶段会被它先吃掉。
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener("keydown", onKey, true)
    return () => document.removeEventListener("keydown", onKey, true)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="modal-mask fixed inset-0 isolate z-50" onClick={onClose} />
      <div
        className="elevated-surface-border fixed top-1/2 left-1/2 z-50 flex h-[min(540px,calc(100vh-4rem))] w-[calc(100vw-2rem)] max-w-[720px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl shadow-lg outline-none"
        style={{ background: "var(--popover)", color: "var(--popover-foreground)" }}
      >
        <div
          className="flex shrink-0 items-center gap-3 border-b px-5 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <strong className="text-[15px]">{title}</strong>
          <span className="flex-1" />
          <button
            onClick={onClose}
            title="关闭"
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--canvas-controls-hover)]"
            style={{ color: "var(--muted-foreground)" }}
          >
            <X size={17} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">{children}</div>
        {footer && (
          <div
            className="flex shrink-0 items-center gap-2 border-t px-5 py-3"
            style={{ borderColor: "var(--border)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  )
}
