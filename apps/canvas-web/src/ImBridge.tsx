import { useState } from "react"

import { Dialog } from "./Dialog"

/**
 * 接入飞书 / 微信。对应官方的 `im-bridge-dialog`。
 *
 * ## 它是什么
 *
 * 在 IM 里 @ 机器人，任务在**本机**执行，结果发回 IM。官方那份文案里写得
 * 很明确：「所有消息直达本机，无云端中转」——飞书用的是用户自己在开放平台
 * 建的应用 + 长连接，微信走的是腾讯官方的 iLink AI Bot 平台。两边都直连
 * 官方端点，没有第三方中转。
 *
 * ## 为什么这里只有说明，没有「连接」按钮
 *
 * 连接本身还没做。**放一个点了没反应的「连接飞书」比不放更糟** ——
 * 用户会以为功能坏了，而不是还没做。
 *
 * 这个弹窗现在的作用是把"要接什么、缺什么"说清楚：真正开始接的时候，
 * 卡片和状态位都在这儿了，换掉里面的按钮就行。
 */
export function ImBridge({ onClose }: { onClose: () => void }) {
  // 「保持电脑唤醒」——官方那个开关。我们还没接（要 Tauri 的电源管理），
  // 但状态先留着：这是远程任务能不能跑完的关键，不该以后再想起来。
  const [awake, setAwake] = useState(false)

  return (
    <Dialog open title="接入飞书 / 微信" onClose={onClose}>
      <div className="mb-4">
        <p className="text-[14px] font-medium">绑定 IM 工具，随时随地分配任务</p>
        <p className="mt-1 text-[13px]" style={{ color: "var(--muted-foreground)" }}>
          连接后，在飞书或微信中发消息，任务会在这台电脑上的蒜狸小助手里执行。
          <strong className="font-normal" style={{ color: "var(--foreground)" }}>
            消息直达本机，不经过任何云端中转。
          </strong>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Channel
          name="飞书"
          desc="在飞书中发送任务并接收结果"
          tint="#3370ff"
          todo="需要你在飞书开放平台建一个应用，填 App ID / App Secret，靠长连接收事件——桌面端不需要公网地址。"
        />
        <Channel
          name="微信"
          desc="在微信中发送任务并接收结果"
          tint="#07c160"
          todo="走腾讯官方的 iLink AI Bot 平台，扫码登录后长轮询收消息。还要先确认这个平台是否需要企业资质。"
        />
      </div>

      <div
        className="mt-5 flex items-start gap-3 rounded-xl px-3.5 py-3"
        style={{ background: "var(--bg-subtle)" }}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium">保持电脑唤醒</p>
          <p className="mt-0.5 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
            开启后让电脑保持唤醒，避免远程任务中断；显示器仍可关闭。
          </p>
        </div>
        {/* 开关做出来但**禁用**：它要 Tauri 的电源管理能力，还没接。
            做成可点但没效果的话，用户会打开它然后指望电脑真的不睡。 */}
        <button
          disabled
          title="还没接入系统的电源管理"
          onClick={() => setAwake((v) => !v)}
          className="mt-0.5 flex h-5 w-9 shrink-0 cursor-not-allowed items-center rounded-full px-0.5 opacity-40"
          style={{ background: awake ? "var(--brand-accent)" : "var(--border-strong, #ccc)" }}
        >
          <span
            className="h-4 w-4 rounded-full bg-white transition-transform"
            style={{ transform: awake ? "translateX(16px)" : undefined }}
          />
        </button>
      </div>

      <p className="mt-5 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
        接入还没做完。应用内的 agent 刚跑通——IM 桥接的意义正是把任务从手机上
        发进来交给它，所以这是下一步。
      </p>
    </Dialog>
  )
}

function Channel({
  name,
  desc,
  tint,
  todo,
}: {
  name: string
  desc: string
  tint: string
  todo: string
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl px-3.5 py-3"
      style={{ background: "var(--bg-subtle)" }}
    >
      <span
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[15px] font-semibold text-white"
        style={{ background: tint }}
      >
        {name[0]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[13px] font-medium">
          {name}
          <span
            className="flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-normal"
            style={{ background: "var(--canvas-controls-hover)", color: "var(--muted-foreground)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
            未接入
          </span>
        </p>
        <p className="mt-0.5 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
          {desc}
        </p>
        <p className="mt-1.5 text-[12px] leading-5" style={{ color: "var(--muted-foreground)" }}>
          {todo}
        </p>
      </div>
    </div>
  )
}
