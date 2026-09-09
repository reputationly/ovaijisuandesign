import { useEffect, useRef, type ReactNode } from "react"

/**
 * 右键菜单。样式照官方的菜单容器：
 *
 * ```
 * min-w-[176px] rounded-lg border p-1 shadow-[var(--canvas-shadow-menu)]
 * 条目 px-2.5 py-2 rounded-md transition-colors duration-100
 * ```
 *
 * 三条必须做对的行为：
 *
 * - **点外面 / 按 Esc 关掉。** 只做点外面的话，用户按 Esc 会以为关了，
 *   然后下一次点击被菜单吃掉。
 * - **贴边翻转。** 菜单在屏幕右下角弹出时会被裁掉一半，那时它就是不可用的。
 * - **`onPointerDown` 不冒泡。** 冒泡到画布会让 React Flow 以为在框选，
 *   菜单一按下就消失。
 */

export interface MenuItem {
  id: string
  label: string
  icon?: ReactNode
  onClick: () => void
  danger?: boolean
  separator?: boolean
  disabled?: boolean
}

export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    // capture 阶段：菜单外的元素可能自己 stopPropagation，
    // 冒泡阶段监听会漏掉那些点击，菜单就关不掉了。
    document.addEventListener("mousedown", onDown, true)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown, true)
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  // 贴边翻转。菜单宽度按最小宽度估，够用 —— 精确测量要等挂载后再改位置，
  // 那会让菜单先在错的地方闪一下。
  const W = 200
  const H = items.length * 36 + 8
  const left = x + W > window.innerWidth ? Math.max(8, x - W) : x
  const top = y + H > window.innerHeight ? Math.max(8, y - H) : y

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[176px] rounded-lg border p-1"
      style={{
        left,
        top,
        background: "var(--canvas-controls-bg)",
        borderColor: "var(--brutalist-border-subtle)",
        boxShadow: "var(--canvas-shadow-menu)",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it) => (
        <div key={it.id}>
          {it.separator && (
            <div className="my-1 h-px" style={{ background: "var(--canvas-controls-border)" }} />
          )}
          <button
            disabled={it.disabled}
            onClick={() => {
              it.onClick()
              onClose()
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              color: it.danger ? "var(--canvas-node-tag-red)" : "var(--canvas-controls-text)",
            }}
            onMouseEnter={(e) => {
              if (!it.disabled) e.currentTarget.style.background = "var(--canvas-controls-hover)"
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {it.icon && <span className="flex-shrink-0">{it.icon}</span>}
            {it.label}
          </button>
        </div>
      ))}
    </div>
  )
}
