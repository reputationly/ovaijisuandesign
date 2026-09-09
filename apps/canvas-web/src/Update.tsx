import { useEffect, useState } from "react"

import {
  applyUpdate,
  checkUpdate,
  startDownload,
  updateStatus,
  type UpdateCheck,
  type UpdatePhase,
} from "./api"
import { cn } from "./lib"

/**
 * 顶栏右侧那一小块升级入口。
 *
 * 三条刻意的取舍：
 *
 * - **只在有新版时才出现。** 常驻一个"已是最新"的标签是噪音，而这一栏
 *   已经挤了模式切换和保存状态。
 * - **`reachable: false` 什么都不显示。** 后端断网时回的是
 *   `needUpdate: false, reachable: false` —— 那是"没查到"，不是"已是最新"。
 *   把它渲染成任何肯定的说法都是在撒谎。
 * - **下载中才轮询，而且只轮询 `status`。** `check` 走公网，挂着轮询会一直
 *   打 CDN；`status` 是纯内存读。
 */
export function Update() {
  const [info, setInfo] = useState<UpdateCheck | null>(null)
  const [phase, setPhase] = useState<UpdatePhase>({ state: "idle" })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // 启动时查一次就够。这是个本地工具，不是长期挂着的服务，
    // 定时查只会在别人不看的时候打 CDN。
    void checkUpdate()
      .then(setInfo)
      .catch(() => {})
    void updateStatus()
      .then((s) => setPhase(s.phase))
      .catch(() => {})
  }, [])

  const running = phase.state === "downloading" || phase.state === "verifying"
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      void updateStatus()
        .then((s) => setPhase(s.phase))
        .catch(() => {})
    }, 700)
    return () => clearInterval(t)
  }, [running])

  if (phase.state === "applied") {
    return (
      <span className="text-ok" title="旧进程还占着端口，所以不自动重启">
        已装好 {phase.version}，重启后生效
      </span>
    )
  }
  if (phase.state === "failed") {
    return (
      <span className="text-bad" title={phase.error}>
        升级失败（{phase.at}）
      </span>
    )
  }
  if (phase.state === "downloading") {
    const pct = phase.total > 0 ? Math.round((phase.done / phase.total) * 100) : 0
    return <span className="text-dim">下载 {phase.version} … {pct}%</span>
  }
  if (phase.state === "verifying") return <span className="text-dim">校验中…</span>

  if (phase.state === "staged") {
    return (
      <button
        onClick={() => {
          setBusy(true)
          void applyUpdate()
            .then((r) => setPhase({ state: "applied", version: r.version }))
            .catch((e: unknown) =>
              setPhase({ state: "failed", at: "apply", error: String(e) }),
            )
            .finally(() => setBusy(false))
        }}
        disabled={busy}
        className="rounded border border-accent bg-accent px-2.5 py-0.5 text-[#10121a] disabled:opacity-50"
      >
        安装 {phase.version}
      </button>
    )
  }

  // reachable 为 false 时 needUpdate 一定是 false，这里一并被挡掉。
  if (!info?.needUpdate || !info.reachable) return null
  return (
    <button
      onClick={() => {
        setBusy(true)
        void startDownload(info)
          .then(() => setPhase({ state: "downloading", version: info.latest!, done: 0, total: info.size ?? 0 }))
          .catch((e: unknown) => setPhase({ state: "failed", at: "download", error: String(e) }))
          .finally(() => setBusy(false))
      }}
      disabled={busy}
      className={cn(
        "rounded border border-line bg-raised px-2.5 py-0.5 hover:border-accent",
        "disabled:opacity-50",
      )}
      title={`当前 ${info.current}`}
    >
      有新版 {info.latest}
    </button>
  )
}
