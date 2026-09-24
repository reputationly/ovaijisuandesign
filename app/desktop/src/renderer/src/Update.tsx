import { useEffect, useState } from "react"

import {
  applyUpdate,
  checkUpdate,
  startDownload,
  updateStatus,
  type UpdateCheck,
  type UpdatePhase,
  updateMode,
  velopackApply,
} from "./api"
import { Download } from "lucide-react"

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
  /**
   * 这台机器上更新走哪条路。**必须分流** —— 在 macOS 的 .app 上显示
   * 「重启并安装」是骗人的：一个正在运行的进程替换不了自己的可执行文件,
   * 点了只会失败。
   */
  const [mode, setMode] = useState<"velopack" | "swap" | "manual">("swap")
  useEffect(() => {
    void updateMode().then(setMode).catch(() => {})
  }, [])
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
        {/* 官方 `update.title.downloaded` =「下载完成」+
             `update.btn.restartNow` =「现在重启」。我们这条是"已装好、
             等重启"，用官方的说法就是「更新已准备就绪」。 */}
        更新已准备就绪 {phase.version}，重启后生效
      </span>
    )
  }
  if (phase.state === "failed") {
    return (
      <span className="text-bad" title={`${phase.error}\n\n请重试，或到官网下载最新版覆盖安装。`}>
        {/* 官方 `update.title.error` =「更新失败」，外加
             `update.errorAdvice` 告诉用户下一步做什么 —— 只说失败的话，
             用户除了再点一次没有别的选择。 */}
        更新失败（{phase.at}）
      </span>
    )
  }
  if (phase.state === "downloading") {
    const pct = phase.total > 0 ? Math.round((phase.done / phase.total) * 100) : 0
    // 官方 `update.downloading` =「正在下载更新... {{percent}}%」
    return (
      <span className="text-dim">
        正在下载更新 {phase.version}… {pct}%
      </span>
    )
  }
  // 官方没有单独的"校验"态，它归在下载里。我们分开是因为校验能跑几秒，
  // 不说的话用户以为卡住了。
  if (phase.state === "verifying") return <span className="text-dim">正在校验…</span>

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
        {/* 官方 `update.install` =「重启并安装」—— 说清楚会重启，
             而不是让用户点完才发现应用关了。 */}
        重启并安装 {phase.version}
      </button>
    )
  }

  // reachable 为 false 时 needUpdate 一定是 false，这里一并被挡掉。
  if (!info?.needUpdate || !info.reachable) return null

  // **装好的 Windows 应用走 Velopack**:下载和安装是一个动作，
  // 装完退出进程，独立的更新器会把文件换掉再把应用拉起来。
  if (mode === "velopack") {
    return (
      <button
        onClick={() => {
          setBusy(true)
          void velopackApply()
            .then((r) => {
              if (!r.ok) {
                setPhase({ state: "failed", at: "apply", error: r.error ?? "更新失败" })
                return
              }
              // 更新器已经在等这个进程退出了。**不自己退** ——
              // gateway 是内嵌的，粗暴退出会让正在跑的 agent 轮次丢掉。
              // 如实告诉用户下一步。
              setPhase({ state: "staged", version: r.version ?? info.latest! })
            })
            .catch((e: unknown) => setPhase({ state: "failed", at: "apply", error: String(e) }))
            .finally(() => setBusy(false))
        }}
        disabled={busy}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          "bg-[var(--brand-accent)] text-[var(--brand-accent-foreground)] hover:opacity-85",
          "disabled:opacity-50",
        )}
        title={`有新版 ${info.latest}（当前 ${info.current}），点击下载并安装`}
      >
        <Download size={14} />
      </button>
    )
  }

  // **macOS 的 .app 只能重新下载安装包。** 官方 3.0.14 的
  // `update.btn.manualDownload` =「下载官方安装包」。
  if (mode === "manual") {
    return (
      <a
        href={info.url ?? "https://github.com/reputationly/ovaijisuandesign/releases/latest"}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          "bg-[var(--brand-accent)] text-[var(--brand-accent-foreground)] hover:opacity-85",
        )}
        title={`有新版 ${info.latest}（当前 ${info.current}）。应用包不能就地升级，点击下载安装包`}
      >
        <Download size={14} />
      </a>
    )
  }

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
      // 收成一个图标。之前是写着「有新版 3.0.12.5」的方块，在侧栏底部占掉
      // 半行、比品牌名还显眼 —— 而"有更新"只是个提示，不是这一栏的主角。
      // 官方那里也是一个小圆图标。版本号进 title。
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
        "bg-[var(--brand-accent)] text-[var(--brand-accent-foreground)] hover:opacity-85",
        "disabled:opacity-50",
      )}
      title={`有新版 ${info.latest}（当前 ${info.current}），点击下载`}
    >
      <Download size={14} />
    </button>
  )
}
