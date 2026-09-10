import { useEffect, useState } from "react"

import {
  feishuConnect,
  feishuDisconnect,
  feishuSave,
  feishuStatus,
  type FeishuInfo,
} from "./api"
import { Dialog } from "./Dialog"

/**
 * 接入飞书 / 微信。对应官方的 `im-bridge-dialog`。
 *
 * ## 不走云端
 *
 * 用**你自己在飞书开放平台建的应用**：填 App ID / App Secret，客户端主动
 * 连出去（长连接），飞书把消息推过来。桌面端因此不需要公网地址、不需要
 * 备案、也不经过任何第三方中转 —— 官方那份文案说的
 * 「所有消息直达本机，无云端中转」就是这个意思。
 *
 * ## 微信还没做
 *
 * 走腾讯官方的 iLink AI Bot 平台（`ilinkai.weixin.qq.com`），扫码登录后
 * 长轮询收消息。端点都摸清了，但要先确认那个平台是否需要企业资质 ——
 * **在确认之前不放「连接微信」按钮**，点了没反应比没有更糟。
 */
export function ImBridge({ onClose }: { onClose: () => void }) {
  const [info, setInfo] = useState<FeishuInfo | null>(null)
  const [appId, setAppId] = useState("")
  const [secret, setSecret] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const reload = () =>
    feishuStatus()
      .then((i) => {
        setInfo(i)
        setAppId((v) => v || i.appId)
        // 没配过就直接把表单展开 —— 否则用户要先发现有个可以点开的地方。
        setExpanded((v) => v || !i.configured)
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))

  useEffect(() => {
    void reload()
    // 连接状态是后台任务在改，**要轮询**：连上、断开、重连都不是这个
    // 组件触发的，不轮的话界面会一直停在"连接中"。
    const t = setInterval(() => void reload(), 2000)
    return () => clearInterval(t)
  }, [])

  const state = info?.status.state ?? "disconnected"
  const connected = state === "connected"
  const label =
    { connected: "已接入", connecting: "连接中", failed: "连接失败" }[state] ?? "未接入"

  return (
    <Dialog open title="接入飞书 / 微信" onClose={onClose}>
      <div className="mb-4">
        <p className="text-[14px] font-medium">绑定 IM 工具，随时随地分配任务</p>
        <p className="mt-1 text-[13px]" style={{ color: "var(--muted-foreground)" }}>
          连接后，在飞书里 @ 机器人发消息，任务会在这台电脑上执行，结果发回原会话。
          <strong className="font-normal" style={{ color: "var(--foreground)" }}>
            消息直达本机，不经过任何云端中转。
          </strong>
        </p>
      </div>

      <div className="rounded-xl px-3.5 py-3" style={{ background: "var(--bg-subtle)" }}>
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[15px] font-semibold text-white"
            style={{ background: "#3370ff" }}
          >
            飞
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[13px] font-medium">
              飞书
              <span
                className="flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-normal"
                style={{
                  background: "var(--canvas-controls-hover)",
                  color: connected ? "#16a34a" : "var(--muted-foreground)",
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
                {label}
              </span>
              {info && info.status.handled > 0 && (
                <span className="text-[11px] font-normal" style={{ color: "var(--muted-foreground)" }}>
                  已处理 {info.status.handled} 条
                </span>
              )}
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
              在飞书中发送任务并接收结果
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="rounded-lg px-2.5 py-1 text-[12px]"
              style={{ background: "var(--canvas-controls-hover)" }}
            >
              {expanded ? "收起" : "凭据"}
            </button>
            <button
              disabled={busy || !info?.configured}
              onClick={() => {
                setErr(null)
                setBusy(true)
                const p = connected || state === "connecting" ? feishuDisconnect() : feishuConnect()
                void p
                  .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
                  .finally(() => {
                    setBusy(false)
                    void reload()
                  })
              }}
              className="rounded-lg px-3 py-1 text-[12px] disabled:opacity-40"
              style={{ background: "var(--foreground)", color: "var(--background)" }}
            >
              {connected || state === "connecting" ? "断开" : "连接飞书"}
            </button>
          </div>
        </div>

        {info?.status.error && (
          <p className="mt-2 text-[12px]" style={{ color: "var(--canvas-node-tag-red)" }}>
            {info.status.error}
          </p>
        )}

        {expanded && (
          <div className="mt-3 flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <p className="text-[12px] leading-5" style={{ color: "var(--muted-foreground)" }}>
              在 <a className="underline" href="https://open.feishu.cn/app" target="_blank" rel="noreferrer">飞书开放平台</a>{" "}
              建一个企业自建应用，开启「机器人」能力，事件订阅方式选
              <strong className="font-normal" style={{ color: "var(--foreground)" }}>长连接</strong>，
              订阅 <code>im.message.receive_v1</code>，然后把凭据填在这里。
              建议在「可用性设置」里把应用范围设为仅自己可见。
            </p>
            <Row label="App ID" value={appId} onChange={setAppId} placeholder="cli_xxx" />
            <Row
              label="App Secret"
              value={secret}
              onChange={setSecret}
              type="password"
              placeholder={info?.configured ? "已保存，留空表示不修改" : "请输入"}
            />
            <div className="flex items-center gap-2">
              <button
                disabled={busy}
                onClick={() => {
                  setErr(null)
                  setBusy(true)
                  void feishuSave({ appId, appSecret: secret })
                    .then(() => {
                      setSecret("")
                      return reload()
                    })
                    .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
                    .finally(() => setBusy(false))
                }}
                className="rounded-lg px-3 py-1 text-[12px] disabled:opacity-40"
                style={{ background: "var(--brand-accent)", color: "var(--brand-accent-foreground)" }}
              >
                保存凭据
              </button>
              <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                存在工作区的 .hilo/feishu.json，不上传
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 微信：端点摸清了但没接，所以**不放连接按钮**。 */}
      <div className="mt-2 flex items-start gap-3 rounded-xl px-3.5 py-3" style={{ background: "var(--bg-subtle)" }}>
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[15px] font-semibold text-white"
          style={{ background: "#07c160" }}
        >
          微
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[13px] font-medium">
            微信
            <span
              className="flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-normal"
              style={{ background: "var(--canvas-controls-hover)", color: "var(--muted-foreground)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
              未接入
            </span>
          </p>
          <p className="mt-1 text-[12px] leading-5" style={{ color: "var(--muted-foreground)" }}>
            走腾讯官方的 iLink AI Bot 平台，扫码登录后长轮询收消息。端点已经摸清，
            但要先确认那个平台是否需要企业资质 —— 在此之前不放一个点了没反应的按钮。
          </p>
        </div>
      </div>

      {err && (
        <p className="mt-3 text-[12px]" style={{ color: "var(--canvas-node-tag-red)" }}>
          {err}
        </p>
      )}

      <p className="mt-4 text-[12px] leading-5" style={{ color: "var(--muted-foreground)" }}>
        任务在这台电脑上执行。关掉应用、断网或电脑睡眠后，远程任务会中断 ——
        「保持电脑唤醒」还没接（要系统的电源管理能力），先手动把睡眠关掉。
      </p>
    </Dialog>
  )
}

function Row({
  label,
  value,
  onChange,
  type,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label className="flex items-center gap-2 text-[12px]">
      <span className="w-20 shrink-0" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </span>
      <input
        type={type ?? "text"}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-[12px] outline-none"
        style={{
          background: "var(--card)",
          color: "var(--foreground)",
          border: "1px solid var(--border)",
        }}
      />
    </label>
  )
}
