/**
 * 和 gateway 的那条 WebSocket（`/ws`），以及建在它上面的聊天状态。
 *
 * **只开一条连接**：服务端事件（画布变了、资产变了）和聊天帧走同一条。两条的话
 * 聊天状态和"收到事件后重新拉取"的时序对不上 —— 界面可能在状态更新之前就去读。
 * 这里的订阅者按注册顺序调用，聊天状态在模块加载时最先注册，所以界面拿到事件时
 * 状态已经是新的。
 */
import type { AgentMsg, ToolActivity } from "./api"
import type { QuestionInfo, QuestionRequest } from "./Question"

type Frame = { type?: string; [k: string]: unknown }
type Listener = (frame: Frame) => void

const HILO_CONFIG: { wsUrl?: string } =
  (typeof window !== "undefined" && (window as unknown as { __HILO_CONFIG__?: { wsUrl?: string } }).__HILO_CONFIG__) || {}

class GatewaySocket {
  private ws: WebSocket | null = null
  private readonly listeners: Listener[] = []
  private readonly queue: string[] = []
  private started = false

  subscribe(fn: Listener): () => void {
    this.listeners.push(fn)
    this.start()
    return () => {
      const i = this.listeners.indexOf(fn)
      if (i >= 0) this.listeners.splice(i, 1)
    }
  }

  send(frame: Frame): void {
    const s = JSON.stringify(frame)
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(s)
    else {
      this.queue.push(s)
      this.start()
    }
  }

  private start(): void {
    if (this.started || typeof WebSocket === "undefined") return
    this.started = true
    this.open()
  }

  private open(): void {
    const proto = location.protocol === "https:" ? "wss:" : "ws:"
    const ws = new WebSocket(HILO_CONFIG.wsUrl || `${proto}//${location.host}/ws`)
    this.ws = ws
    ws.onopen = () => {
      while (this.queue.length) ws.send(this.queue.shift()!)
      this.emit({ type: "__open" })
    }
    ws.onmessage = (ev) => {
      let f: Frame
      try {
        f = JSON.parse(ev.data as string) as Frame
      } catch {
        return
      }
      this.emit(f)
    }
    // gateway 重启是常态（改配置、崩溃重拉），自己重连。
    ws.onclose = () => setTimeout(() => this.open(), 2000)
    ws.onerror = () => ws.close()
  }

  private emit(f: Frame): void {
    for (const fn of [...this.listeners]) {
      try {
        fn(f)
      } catch (e) {
        console.error("[ws] 处理帧失败", f.type, e)
      }
    }
  }
}

export const socket = new GatewaySocket()

// ---------------------------------------------------------------------------
// 聊天状态
// ---------------------------------------------------------------------------

interface PartLike {
  id: string
  messageID?: string
  type: string
  text?: string
  tool?: string
  callID?: string
  state?: { status?: string; title?: string; error?: string; output?: string; input?: unknown; metadata?: Record<string, unknown> }
  [k: string]: unknown
}

interface MessageEntry {
  id: string
  role: "user" | "assistant"
  at: number
  parts: Map<string, PartLike>
  /** 本地乐观显示的用户消息（还没拿到服务端 id）。 */
  text?: string
}

export interface ToolConfirmAsk {
  id: string
  tool: string
  args: unknown
}

export interface LoopGuardAsk {
  id: string
  tool: string
  hits?: number
}

/** 会话 id 存在本地：刷新或重启后接着原来的会话，而不是每次开一个空的。 */
const SESSION_KEY = "ov.chat.session"

class ChatClient {
  sessionId: string | null = null
  running = false
  question: QuestionRequest | null = null
  toolConfirm: ToolConfirmAsk | null = null
  loopGuard: LoopGuardAsk | null = null
  lastError: string | null = null
  private readonly messages = new Map<string, MessageEntry>()
  private readonly order: string[] = []
  private pendingCreate: Promise<string> | null = null
  private createResolve: ((id: string) => void) | null = null
  private readonly toolPhase = new Map<string, string>()

  constructor() {
    socket.subscribe((f) => this.onFrame(f))
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(SESSION_KEY) : null
    if (saved) this.switchTo(saved)
  }

  /** 转成界面一直用的 `AgentMsg[]`：用户消息原文、助手消息拼起全部文本 part。 */
  get agentMessages(): AgentMsg[] {
    const out: AgentMsg[] = []
    for (const id of this.order) {
      const m = this.messages.get(id)!
      const text =
        m.role === "user"
          ? (m.text ?? [...m.parts.values()].filter((p) => p.type === "text").map((p) => p.text ?? "").join(""))
          : [...m.parts.values()].filter((p) => p.type === "text").map((p) => p.text ?? "").join("")
      if (text.trim()) out.push({ role: m.role, content: text, at: Math.floor(m.at / 1000) })
    }
    return out
  }

  /** 工具调用转成活动流。 */
  get activity(): ToolActivity[] {
    const out: ToolActivity[] = []
    for (const id of this.order) {
      for (const p of this.messages.get(id)!.parts.values()) {
        if (p.type !== "tool" || !p.tool) continue
        const a = toActivity(p, this.messages.get(id)!.at)
        if (a) out.push(a)
      }
    }
    return out
  }

  private ensureMessage(id: string, role: "user" | "assistant"): MessageEntry {
    let m = this.messages.get(id)
    if (!m) {
      m = { id, role, at: Date.now(), parts: new Map() }
      this.messages.set(id, m)
      this.order.push(id)
    }
    return m
  }

  private reset(): void {
    this.messages.clear()
    this.order.length = 0
    this.toolPhase.clear()
    this.question = null
    this.toolConfirm = null
    this.loopGuard = null
    this.running = false
  }

  private remember(id: string | null): void {
    this.sessionId = id
    if (typeof localStorage === "undefined") return
    if (id?.startsWith("ses")) localStorage.setItem(SESSION_KEY, id)
    else if (!id) localStorage.removeItem(SESSION_KEY)
  }

  /** 开一段新对话。真会话等第一条消息时才在 opencode 里建。 */
  newChat(): void {
    this.reset()
    this.remember(null)
    notify("agent:done")
  }

  switchTo(sessionId: string): void {
    this.reset()
    this.remember(sessionId)
    socket.send({ type: "switch_session", session_id: sessionId })
  }

  private createSession(): Promise<string> {
    if (this.sessionId) return Promise.resolve(this.sessionId)
    this.pendingCreate ??= new Promise<string>((resolve) => {
      this.createResolve = resolve
      socket.send({ type: "create_session", request_id: "create" })
    })
    return this.pendingCreate
  }

  async send(text: string, attachments: string[] = [], opts: { mode?: string; chatModel?: string } = {}): Promise<void> {
    const sid = await this.createSession()
    if (opts.mode) socket.send({ type: "set_mode", session_id: sid, mode: opts.mode })
    if (opts.chatModel) socket.send({ type: "update_model", session_id: sid, model_id: opts.chatModel })
    const local = `local-${Date.now()}`
    const m = this.ensureMessage(local, "user")
    m.text = text
    this.running = true
    this.lastError = null
    notify("agent:message")
    socket.send({ type: "message", session_id: sid, content: text, attachments, client_message_id: local })
  }

  stop(): void {
    if (this.sessionId) socket.send({ type: "cancel", session_id: this.sessionId })
  }

  answer(id: string, answers: string[][] | null): void {
    socket.send(answers ? { type: "question_reply", id, session_id: this.sessionId, answers } : { type: "question_reject", id, session_id: this.sessionId })
    this.question = null
  }

  replyToolConfirm(decision: "confirm" | "reject"): void {
    if (!this.toolConfirm) return
    socket.send({ type: "tool_confirm_reply", id: this.toolConfirm.id, session_id: this.sessionId, decision })
    this.toolConfirm = null
  }

  replyLoopGuard(decision: "allow_once" | "allow_session" | "reject"): void {
    if (!this.loopGuard) return
    socket.send({ type: "loop_guard_reply", id: this.loopGuard.id, session_id: this.sessionId, decision })
    this.loopGuard = null
  }

  private mine(f: Frame): boolean {
    return !!this.sessionId && (f.session_id === this.sessionId || f.runtime_session_id === this.sessionId)
  }

  private onFrame(f: Frame): void {
    switch (f.type) {
      case "session_created":
        if (f.request_id === "create" && this.createResolve) {
          this.remember(String(f.session_id))
          this.createResolve(String(f.session_id))
          this.createResolve = null
          this.pendingCreate = null
        }
        return
      case "session_bound":
        // 从临时 id 换成 opencode 的真 id：之后按真 id 存、按真 id 恢复。
        if (f.ui_session_id === this.sessionId) this.remember(String(f.ui_session_id))
        if (typeof localStorage !== "undefined" && f.ui_session_id === this.sessionId) localStorage.setItem(SESSION_KEY, String(f.runtime_session_id))
        return
      case "session_switched": {
        if (f.session_id !== this.sessionId) return
        for (const msg of (f.messages as { info: { id: string; role: "user" | "assistant"; time?: { created?: number } }; parts: PartLike[] }[]) ?? []) {
          const m = this.ensureMessage(msg.info.id, msg.info.role)
          if (msg.info.time?.created) m.at = msg.info.time.created
          for (const p of msg.parts) m.parts.set(p.id ?? `${msg.info.id}-${m.parts.size}`, p)
        }
        notify("agent:message")
        return
      }
      default:
    }
    if (!this.mine(f)) return
    switch (f.type) {
      case "part_updated": {
        const part = f.part as PartLike
        const m = this.ensureMessage(part.messageID ?? "unknown", "assistant")
        m.parts.set(part.id, part)
        notify("agent:message")
        if (part.type === "tool" && part.callID) {
          const a = toActivity(part, m.at)
          if (a && this.toolPhase.get(part.callID) !== a.phase) {
            this.toolPhase.set(part.callID, a.phase)
            notify("tool:activity", a)
          }
        }
        return
      }
      case "part_delta": {
        const m = this.ensureMessage(String(f.messageId), "assistant")
        const pid = String(f.partId)
        const p = m.parts.get(pid) ?? { id: pid, messageID: String(f.messageId), type: "text", text: "" }
        const field = String(f.field ?? "text")
        p[field] = String((p[field] as string | undefined) ?? "") + String(f.delta ?? "")
        m.parts.set(pid, p)
        notify("agent:message")
        return
      }
      case "session_idle":
        if (f.childSessionId) return
        this.running = false
        notify("agent:done")
        return
      case "session_error":
      case "message_failed":
        if (f.childSessionId) return
        this.running = false
        this.lastError = String(f.content ?? f.error ?? "出错了")
        notify("agent:done")
        return
      case "question_request":
        this.question = { id: String(f.id), questions: (f.questions as QuestionInfo[]) ?? [] }
        notify("question:asked")
        return
      case "question_resolved":
        if (this.question?.id === f.id) this.question = null
        notify("question:replied")
        return
      case "tool_confirm_ask":
        this.toolConfirm = { id: String(f.id), tool: String(f.tool), args: f.args }
        notify("tool:confirm")
        return
      case "tool_confirm_expired":
        this.toolConfirm = null
        notify("tool:confirm")
        return
      case "loop_guard_ask":
        this.loopGuard = { id: String(f.id), tool: String(f.tool), hits: f.hits as number | undefined }
        notify("tool:confirm")
        return
      default:
    }
  }
}

function toActivity(p: PartLike, at: number): ToolActivity | null {
  const status = p.state?.status
  const phase = status === "completed" ? "ok" : status === "error" ? "error" : status === "running" || status === "pending" ? "start" : null
  if (!phase) return null
  const output = p.state?.output ?? ""
  const artifact = /"(?:path|assetPath|filePath)"\s*:\s*"((?:images|videos|audios|texts|files)\/[^"]+)"/.exec(output)?.[1]
  return {
    tool: p.tool!,
    phase,
    id: p.callID ?? p.id,
    ...(p.state?.title ? { summary: p.state.title } : {}),
    ...(p.state?.error ? { error: p.state.error } : {}),
    ...(artifact ? { artifact } : {}),
    at: Math.floor(at / 1000),
  }
}

/** 通知界面：用它现在监听的事件名（见 App 里的 connectEvents）。 */
type EventSink = (event: string, data?: unknown) => void
const sinks = new Set<EventSink>()
function notify(event: string, data?: unknown): void {
  for (const s of sinks) s(event, data)
}
export function onChatEvent(fn: EventSink): () => void {
  sinks.add(fn)
  return () => sinks.delete(fn)
}

export const chat = new ChatClient()
