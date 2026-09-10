import QRCode from "qrcode"
import { useEffect, useRef, useState } from "react"

import {
  feishuConnect,
  feishuDisconnect,
  feishuSave,
  feishuStatus,
  wechatConnect,
  wechatDisconnect,
  wechatLogin,
  wechatLogout,
  wechatStatus,
  type FeishuInfo,
  type WechatInfo,
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
 * ## 微信
 *
 * 走腾讯官方的 iLink AI Bot 平台（`ilinkai.weixin.qq.com`）：扫码登录拿
 * 一个 bot token，然后长轮询收消息。实测**不需要企业资质**，个人微信
 * 扫码即可。同样直连腾讯的端点，没有第三方中转。
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

      <Wechat />

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

/**
 * 微信。走腾讯官方的 iLink AI Bot 平台，扫码登录后长轮询收消息。
 *
 * **二维码是后台任务在换的**（过期会自动刷新最多三次），所以这里靠轮询
 * 状态拿最新那张，而不是自己管刷新。
 */
function Wechat() {
  const [info, setInfo] = useState<WechatInfo | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const tick = () =>
      wechatStatus()
        .then(setInfo)
        .catch(() => {})
    void tick()
    const t = setInterval(tick, 1500)
    return () => clearInterval(t)
  }, [])

  const st = info?.status
  const state = st?.state ?? "disconnected"
  const connected = state === "connected"
  const qr = st?.qrState
  // 扫码进行中：有 qrState 且还没确认。确认之后后台会自己连上。
  const scanning = !!qr && qr !== "confirmed"

  const label =
    { connected: "已接入", connecting: "连接中", failed: "连接失败" }[state] ?? "未接入"
  const qrHint =
    {
      loading: "正在获取二维码…",
      ready: "请用微信扫描二维码",
      scanned: "已扫码，请在手机上确认",
      expired: "二维码已过期",
      error: "登录失败",
    }[qr ?? ""] ?? ""

  return (
    <div className="mt-2 rounded-xl px-3.5 py-3" style={{ background: "var(--bg-subtle)" }}>
      <div className="flex items-start gap-3">
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
              style={{
                background: "var(--canvas-controls-hover)",
                color: connected ? "#16a34a" : "var(--muted-foreground)",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
              {label}
            </span>
            {st && st.handled > 0 && (
              <span className="text-[11px] font-normal" style={{ color: "var(--muted-foreground)" }}>
                已处理 {st.handled} 条
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
            在微信中发送任务并接收结果 · 走腾讯官方的 iLink 机器人平台
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {info?.configured && (
            <button
              onClick={() => {
                void wechatLogout()
              }}
              className="rounded-lg px-2.5 py-1 text-[12px]"
              style={{ background: "var(--canvas-controls-hover)" }}
            >
              退出
            </button>
          )}
          <button
            onClick={() => {
              setErr(null)
              if (connected || state === "connecting") {
                void wechatDisconnect()
              } else if (info?.configured) {
                void wechatConnect().catch((e: unknown) =>
                  setErr(e instanceof Error ? e.message : String(e)),
                )
              } else {
                void wechatLogin()
              }
            }}
            className="rounded-lg px-3 py-1 text-[12px]"
            style={{ background: "var(--foreground)", color: "var(--background)" }}
          >
            {connected || state === "connecting"
              ? "断开"
              : info?.configured
                ? "连接微信"
                : "扫码登录"}
          </button>
        </div>
      </div>

      {scanning && (
        <div className="mt-3 flex items-center gap-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
          {/* 腾讯给的可能是一张图（base64，后端已补成 data URI），
              也可能是**一个 URL —— 那种要我们自己画成二维码**，
              用户是拿手机扫，给个链接他扫不了。 */}
          {st?.qrIsImage && st.qrUrl ? (
            <img
              src={st.qrUrl}
              alt="微信登录二维码"
              className="h-32 w-32 shrink-0 rounded-lg bg-white p-1"
            />
          ) : st?.qrUrl ? (
            <QrCanvas text={st.qrUrl} />
          ) : (
            <div className="h-32 w-32 shrink-0 rounded-lg" style={{ background: "var(--card)" }} />
          )}
          <div className="min-w-0 flex-1 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
            <p className="text-[13px]" style={{ color: "var(--foreground)" }}>
              {qrHint}
            </p>
            <p className="mt-1.5 leading-5">
              扫码后在手机上确认，页面会自动完成连接。之后在微信里找到这个机器人，
              发消息就能派任务。
            </p>
          </div>
        </div>
      )}

      {st?.error && (
        <p className="mt-2 text-[12px]" style={{ color: "var(--canvas-node-tag-red)" }}>
          {st.error}
        </p>
      )}
      {err && (
        <p className="mt-2 text-[12px]" style={{ color: "var(--canvas-node-tag-red)" }}>
          {err}
        </p>
      )}
    </div>
  )
}

/**
 * 把一段文本画成二维码。
 *
 * **用库不自己写。** 二维码有纠错码（Reed-Solomon）、掩码选择、版本选择
 * 一整套规范，手写出来的码在光线不好或者角度偏一点时就扫不出来 ——
 * 而"扫不出来"这件事没法靠看代码发现。qrcode 这个包 232 KB、零依赖。
 *
 * 画在 canvas 上而不是 <img src={dataURL}>：省一次 base64 编码和一次
 * 图片解码，而二维码是每次刷新都要重画的。
 */
function QrCanvas({ text }: { text: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    void QRCode.toCanvas(el, text, {
      width: 128,
      margin: 1,
      // 纠错级别 M：这个码要被手机在屏幕上扫，不是印在纸上被磨损。
      // 拉到 H 只会让码更密、更难扫。
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    }).catch(() => {})
  }, [text])
  return <canvas ref={ref} className="h-32 w-32 shrink-0 rounded-lg bg-white p-1" />
}
