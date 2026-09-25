import type { Plugin } from "@opencode-ai/plugin"

/**
 * 给发往模型的每个请求补三个头，方便平台侧按会话 / agent 归类日志：
 *
 * - `X-OpenCode-Session-Id`：会话 id。新会话的第一个请求偶尔拿不到顶层 sessionID，
 *   依次退到消息上的 sessionID、消息 id，最后给一个临时占位 —— 空值的头会被
 *   HTTP 客户端直接丢掉。
 * - `X-Agent-Type`：当前是哪个 agent 在说话（media-agent / planner / …）。
 * - `X-Source-Type`：界面在用户消息 text part 的 metadata 里带的来源标记，
 *   只跟随该消息触发的第一次请求发送一次。
 *
 * 计费分组不在这里做：本地 gateway 不区分分组。
 *
 * opencode 加载这个文件时旁边没有 node_modules，所以只能 import 类型。
 */

const SOURCE_KEY = "source_type"

function sourceOf(parts: unknown[]): string | undefined {
  for (const part of parts) {
    if (!part || typeof part !== "object") continue
    const p = part as { type?: unknown; metadata?: unknown }
    if (p.type !== "text" || !p.metadata || typeof p.metadata !== "object") continue
    const v = (p.metadata as Record<string, unknown>)[SOURCE_KEY]
    if (typeof v === "string" && v) return v
  }
  return undefined
}

function agentName(agent: unknown): string | undefined {
  const raw = typeof agent === "string" ? agent : (agent as { name?: unknown } | null)?.name
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined
}

const plugin: Plugin = async () => {
  // 消息 id → 来源标记；发出后立即删除，避免会话很长时越攒越多。
  const pending = new Map<string, string>()

  return {
    "chat.message": async (_input, output) => {
      const source = sourceOf(output.parts)
      if (source) pending.set(output.message.id, source)
    },
    "chat.headers": async (input, output) => {
      const message = input.message as { id?: string; sessionID?: string } | undefined
      output.headers["X-OpenCode-Session-Id"] =
        input.sessionID || message?.sessionID || message?.id || `pending-${Date.now()}`

      if (message?.id) {
        const source = pending.get(message.id)
        pending.delete(message.id)
        if (source) output.headers["X-Source-Type"] = source
      }

      const name = agentName(input.agent)
      if (name) output.headers["X-Agent-Type"] = name
    },
  }
}

export default plugin
