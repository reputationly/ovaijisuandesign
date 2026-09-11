import { useEffect, useState } from "react"

import { awakeSet, awakeStatus, type AwakeInfo } from "./api"

/**
 * 「保持电脑唤醒」。对应官方的 `setPreventSleep` / `preventSleep`。
 *
 * 接了飞书/微信之后这台机器是在替你值班，而 macOS 闲置十几分钟就睡 ——
 * 睡下去之后发过来的消息不会报错，只是没人回。
 *
 * ## 为什么单独一个文件
 *
 * 它原来埋在 `ImBridge.tsx` 里。那是**系统级的开关放在了一个功能面板内部**:
 * 不接微信/飞书的用户永远不会打开那个面板，也就永远不知道有这个功能 ——
 * 而长时间跑 agent 生成同样需要它。现在设置页和 IM 面板各用一份。
 *
 * ## 失败不能默默当成关掉
 *
 * 系统可能拒掉这个断言。**乐观地先把开关拨过去再发请求**是这里最容易犯的
 * 错：拨过去了、请求失败了、开关还亮着，用户就安心合盖出门了。所以状态
 * 一律以后端返回的 `enabled` 为准。
 */
export function KeepAwake() {
  const [info, setInfo] = useState<AwakeInfo | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void awakeStatus()
      .then(setInfo)
      .catch(() => setInfo({ enabled: false, error: null }))
  }, [])

  const toggle = async () => {
    if (busy || !info) return
    setBusy(true)
    try {
      // 开关的新状态用后端回的那个，不是我们要求的那个。
      setInfo(await awakeSet(!info.enabled))
    } catch (e) {
      setInfo({ enabled: false, error: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  const on = info?.enabled === true
  return (
    <div
      className="mt-3 rounded-xl px-3 py-2.5"
      style={{
        border: "var(--divider-width) solid var(--elevated-border-color)",
        background: "var(--elevated-surface)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px]">保持电脑唤醒</div>
          <div className="mt-0.5 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            阻止系统闲置休眠。接了微信 / 飞书时，机器要一直醒着才能接消息
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="保持电脑唤醒"
          onClick={() => void toggle()}
          disabled={busy || !info}
          className="relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors disabled:opacity-40"
          style={{ background: on ? "var(--brand-accent)" : "var(--border-strong)" }}
        >
          <span
            className="absolute top-[3px] h-4 w-4 rounded-full transition-all"
            style={{ left: on ? 19 : 3, background: "var(--background)" }}
          />
        </button>
      </div>
      {info?.error && (
        <p className="mt-2 text-[11px]" style={{ color: "var(--canvas-node-tag-red)" }}>
          {info.error}
        </p>
      )}
    </div>
  )
}
