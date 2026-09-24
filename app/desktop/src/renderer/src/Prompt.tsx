import { useEffect, useRef, useState, type ReactNode } from "react"

/**
 * 应用内的确认框和输入框。
 *
 * ## 为什么不用 `window.confirm` / `window.prompt`
 *
 * **它们在这个应用里永远不弹。** Tauri 的 webview（macOS 上是 WKWebView）
 * 要求宿主实现 `WKUIDelegate` 的 `runJavaScriptConfirmPanel` 等方法才会弹
 * 对话框，而 wry 0.55 一个都没实现（`grep runJavaScriptConfirmPanel` 在它
 * 源码里零命中）。没有 delegate 时 WKWebView **直接返回 false / null，
 * 不弹任何东西也不报错**。
 *
 * 后果是 9 处功能全是死的：重命名、新建项目、删除会话、删除 skill、
 * 解散项目、新建关键词、微信退出 —— 点了毫无反应。
 *
 * 这类问题在浏览器里开发时看不出来（Chrome 实现了这些），只有装进
 * 桌面壳才会暴露。
 */

type Kind = "confirm" | "prompt"

interface Req {
  kind: Kind
  title: string
  /** `prompt` 的初值。 */
  initial?: string
  placeholder?: string
  /** 主按钮的字。删除类给「删除」，比「确定」明确。 */
  confirmLabel?: string
  danger?: boolean
  resolve: (v: string | null) => void
}

let open: ((r: Req) => void) | null = null

/**
 * 代替 `window.confirm`。返回 `true` = 用户确认。
 *
 * **是异步的**，和原生那个不一样 —— 调用方要 `await`。
 */
export function confirm(
  title: string,
  opts: { confirmLabel?: string; danger?: boolean } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    // 没挂载时退回"取消"。**不要退回 true** —— 这些调用点后面接的是
    // 删除，宁可什么都不做。
    if (!open) return resolve(false)
    open({ kind: "confirm", title, ...opts, resolve: (v) => resolve(v !== null) })
  })
}

/** 代替 `window.prompt`。取消时返回 `null`。 */
export function prompt(
  title: string,
  opts: { initial?: string; placeholder?: string } = {},
): Promise<string | null> {
  return new Promise((resolve) => {
    if (!open) return resolve(null)
    open({ kind: "prompt", title, ...opts, resolve })
  })
}

/** 挂在应用根部，只需要一个。 */
export function PromptHost() {
  const [req, setReq] = useState<Req | null>(null)
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    open = (r) => {
      setReq(r)
      setValue(r.initial ?? "")
    }
    return () => {
      open = null
    }
  }, [])

  useEffect(() => {
    if (req?.kind === "prompt") {
      // 选中初值：重命名时用户多半是想整个换掉。
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [req])

  if (!req) return null

  const done = (v: string | null) => {
    req.resolve(v)
    setReq(null)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "var(--modal-mask-bg)", backdropFilter: "var(--modal-mask-blur)" }}
      // 点遮罩 = 取消。**要判是不是遮罩本身** —— 不判的话点对话框内部
      // 任何地方都会取消。
      onPointerDown={(e) => e.target === e.currentTarget && done(null)}
    >
      <div
        className="w-[340px] rounded-xl border p-4"
        style={{
          background: "var(--popover)",
          borderColor: "var(--elevated-border-color)",
          boxShadow: "var(--canvas-shadow-menu)",
        }}
      >
        <p className="text-[14px] leading-6">{req.title}</p>
        {req.kind === "prompt" && (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={req.placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) done(value.trim() || null)
              if (e.key === "Escape") done(null)
            }}
            className="mt-3 w-full rounded-md px-2.5 py-2 text-[13px] outline-none"
            style={{
              border: "1px solid var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
            }}
          />
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Btn onClick={() => done(null)}>取消</Btn>
          <Btn
            primary
            danger={req.danger}
            onClick={() => done(req.kind === "prompt" ? value.trim() || null : "")}
          >
            {req.confirmLabel ?? "确定"}
          </Btn>
        </div>
      </div>
    </div>
  )
}

function Btn({
  children,
  onClick,
  primary,
  danger,
}: {
  children: ReactNode
  onClick: () => void
  primary?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-3 py-1.5 text-[13px] transition-opacity hover:opacity-85"
      style={{
        background: primary
          ? danger
            ? "var(--canvas-node-tag-red)"
            : "var(--foreground)"
          : "var(--bg-subtle)",
        color: primary ? "var(--background)" : "var(--foreground)",
      }}
    >
      {children}
    </button>
  )
}
