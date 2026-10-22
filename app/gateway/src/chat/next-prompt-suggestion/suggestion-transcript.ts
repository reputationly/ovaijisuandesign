/**
 * 「下一步提示建议」的对话摘要构建。
 *
 * 移植自 4.0.3 的 `gateway/dist/next-prompt-suggestion/suggestion-transcript.js`
 * （参照实现抽取在 `.probe/extracted/nps-4.0.3/suggestion-transcript.js`）。
 *
 * 它做的事：把 OpenCode 的原始消息（`{ info, parts }`）压成一段适合喂给模型的紧凑对话。
 * 规则（照搬参照，不改口径）：
 *   · 从最后一条往回按字符预算（8000）装，装不下就停
 *   · 必须最后一条是**已完成的助手回复**，否则不生成建议
 *   · 只从第一条 user 开始保留
 *   · 编辑类回合（带 `<document_editing_context>` 等标签）直接放弃生成
 *   · 助手消息要剥掉 ` thinking` 内容，上下文包装标签一律去掉
 */

export const SUGGESTION_TRANSCRIPT_BUDGET_CHARS = 8_000;
export const SUGGESTION_MESSAGE_MAX_CHARS = 1_500;

/** 这些是参照里的常量值，逐字照搬。 */
const DOCUMENT_EDITING_CONTEXT_TAG = "document_editing_context";
const PLUGIN_EDITING_CONTEXT_TAG = "plugin_editing_context";

const CONTEXT_WRAPPER_RE = /<([a-z][a-z0-9]*(?:[-_][a-z0-9]+)+)\b[^>]*>[\s\S]*?<\/\1>/g;
const EDITING_CONTEXT_RE = new RegExp(
  `<\\s*(?:${DOCUMENT_EDITING_CONTEXT_TAG}|${PLUGIN_EDITING_CONTEXT_TAG}|document_edit_task)\\b`,
);
const UNFINISHED_FINISH_REASONS = new Set(["tool-calls", "unknown"]);
const UNSETTLED_TOOL_STATES = new Set(["pending", "running"]);

export interface SuggestionPart {
  type: string;
  text?: string;
  tool?: string;
  toolStatus?: string;
  filename?: string;
  synthetic: boolean;
}

export interface SuggestionMessage {
  role: "user" | "assistant";
  finish?: string;
  hasError: boolean;
  completed: boolean;
  summary: boolean;
  model?: { providerID: string; modelID: string };
  parts: SuggestionPart[];
}

export interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function mapPart(value: unknown): SuggestionPart | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  const state = isRecord(value.state) ? value.state : undefined;
  return {
    type: value.type,
    ...(typeof value.text === "string" ? { text: value.text } : {}),
    ...(typeof value.tool === "string" ? { tool: value.tool } : {}),
    ...(typeof state?.status === "string" ? { toolStatus: state.status } : {}),
    ...(typeof value.filename === "string" ? { filename: value.filename } : {}),
    synthetic: value.synthetic === true || value.ignored === true,
  };
}

function mapMessage(value: unknown): SuggestionMessage | null {
  if (!isRecord(value) || !isRecord(value.info) || !Array.isArray(value.parts)) return null;
  const info = value.info;
  if (info.role !== "user" && info.role !== "assistant") return null;
  const time = isRecord(info.time) ? info.time : undefined;
  return {
    role: info.role,
    ...(typeof info.finish === "string" ? { finish: info.finish } : {}),
    hasError: info.error !== undefined && info.error !== null,
    // OpenCode 只在助手消息上盖 completed。
    completed: info.role === "user" || typeof time?.completed === "number",
    summary:
      info.summary === true || info.mode === "compaction" || info.agent === "compaction",
    ...(info.role === "assistant" &&
    typeof info.providerID === "string" &&
    typeof info.modelID === "string"
      ? { model: { providerID: info.providerID, modelID: info.modelID } }
      : {}),
    parts: value.parts.map(mapPart).filter((p): p is SuggestionPart => p !== null),
  };
}

function cleanText(text: string, stripThinking = false): string {
  const visible = stripThinking ? text.replace(/ thinking[\s\S]*?(?:<\/think>|$)/gi, "") : text;
  return visible.replace(CONTEXT_WRAPPER_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

function isEditingTurn(message: SuggestionMessage): boolean {
  return (
    message.role === "user" &&
    message.parts.some(
      (part) => part.type === "text" && !part.synthetic && EDITING_CONTEXT_RE.test(part.text ?? ""),
    )
  );
}

function isSettledAssistantReply(message: SuggestionMessage): boolean {
  if (message.role !== "assistant" || message.hasError || !message.completed) return false;
  if (message.finish === undefined || UNFINISHED_FINISH_REASONS.has(message.finish)) return false;
  if (
    message.parts.some(
      (part) => part.type === "tool" && part.toolStatus && UNSETTLED_TOOL_STATES.has(part.toolStatus),
    )
  ) {
    return false;
  }
  const text = message.parts
    .filter((part) => part.type === "text" && !part.synthetic)
    .map((part) => part.text ?? "")
    .join("\n");
  return cleanText(text, true).length > 0;
}

function renderMessage(message: SuggestionMessage): TranscriptMessage | null {
  const segments: string[] = [];
  for (const part of message.parts) {
    if (part.synthetic) continue;
    if (part.type === "text" && part.text) {
      const text = cleanText(part.text);
      if (text) segments.push(text);
    } else if (part.type === "file" && part.filename) {
      segments.push(`[attachment: ${part.filename}]`);
    } else if (part.type === "tool" && part.tool && message.role === "assistant") {
      segments.push(`[tool: ${part.tool}${part.toolStatus ? ` ${part.toolStatus}` : ""}]`);
    }
  }
  let body = cleanText(segments.join("\n"), message.role === "assistant");
  if (!body) return null;
  if (body.length > SUGGESTION_MESSAGE_MAX_CHARS) {
    body = `${body.slice(0, SUGGESTION_MESSAGE_MAX_CHARS)}\u2026`;
  }
  return { role: message.role, content: body };
}

/**
 * 把原始消息压成对话摘要。返回 null 表示「这一轮不适合给建议」，
 * 调用方应直接回空结果（参照也是这么做的）。
 */
export function buildSuggestionTranscript(raw: unknown): TranscriptMessage[] | null {
  if (!Array.isArray(raw)) return null;
  const messages = raw.map(mapMessage).filter((m): m is SuggestionMessage => m !== null);
  if (messages.some(isEditingTurn)) return null;
  const visible = messages.filter((m) => !m.summary);
  const last = visible.at(-1);
  if (!last || !isSettledAssistantReply(last)) return null;
  const rendered = visible
    .map(renderMessage)
    .filter((m): m is TranscriptMessage => m !== null);
  const kept: TranscriptMessage[] = [];
  let remaining = SUGGESTION_TRANSCRIPT_BUDGET_CHARS;
  for (let i = rendered.length - 1; i >= 0; i -= 1) {
    const message = rendered[i];
    if (!message) break;
    if (message.content.length > remaining) break;
    kept.unshift(message);
    remaining -= message.content.length;
  }
  const firstUser = kept.findIndex((m) => m.role === "user");
  if (firstUser < 0 || kept.at(-1)?.role !== "assistant") return null;
  return kept.slice(firstUser);
}

/** 上一轮回复用的是哪个模型（自定义 provider 时优先用它）。 */
export function findReplyModel(raw: unknown): { providerID: string; modelID: string } | null {
  if (!Array.isArray(raw)) return null;
  const messages = raw.map(mapMessage).filter((m): m is SuggestionMessage => m !== null);
  const last = messages.filter((m) => !m.summary).at(-1);
  return last?.role === "assistant" ? (last.model ?? null) : null;
}
