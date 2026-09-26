/**
 * 压缩（或请求超长被截）之后，opencode 会补一条合成的用户消息让模型"继续"。那条消息是英文的，
 * 长会话里模型读到它常常就改说英文了 —— 在它后面补一句语言要求。
 *
 * 只改 `synthetic` 的用户 text part；已经带 `[language]` 标记的不再补，messages.transform
 * 每次请求都会跑，不能越补越长。
 */
const CONTINUE_MARKERS = ["Continue if you have next steps", "The previous request exceeded the provider's size limit"];

const INSTRUCTION_MARKER = "[language]";

export function languageInstruction(preferredLanguage?: string): string {
  const preferred = preferredLanguage?.toLowerCase();
  if (preferred?.startsWith("zh")) return `${INSTRUCTION_MARKER} 请用中文回复。`;
  if (preferred?.startsWith("en")) return `${INSTRUCTION_MARKER} Respond in English.`;
  if (preferred?.startsWith("ja")) return `${INSTRUCTION_MARKER} 日本語で返答してください。`;
  if (preferred?.startsWith("ko")) return `${INSTRUCTION_MARKER} 한국어로 답변하세요.`;
  if (preferred) return `${INSTRUCTION_MARKER} Respond using the ${preferredLanguage} locale.`;
  // 会话没有记录工作语言：退回界面语言，再不行让模型跟着对话走。
  const lang = (process.env.HILO_USER_LANG ?? "").toLowerCase();
  if (lang.startsWith("zh")) return `${INSTRUCTION_MARKER} 请用中文回复。`;
  if (lang.startsWith("en")) return `${INSTRUCTION_MARKER} Respond in English.`;
  return `${INSTRUCTION_MARKER} Respond in the same language the user has been using in this conversation.`;
}

function isContinuePromptText(text: string): boolean {
  return CONTINUE_MARKERS.some((m) => text.includes(m));
}

interface LooseMessage {
  info?: { role?: unknown };
  parts?: unknown[];
}

interface LoosePart {
  type?: unknown;
  synthetic?: unknown;
  text?: unknown;
}

function pendingContinueParts(messages: readonly unknown[]): LoosePart[] {
  const out: LoosePart[] = [];
  for (const rawMsg of messages) {
    const msg = rawMsg as LooseMessage | null;
    if (msg?.info?.role !== "user") continue;
    for (const rawPart of msg.parts ?? []) {
      const part = rawPart as LoosePart | null;
      if (!part || typeof part !== "object") continue;
      if (part.type !== "text" || part.synthetic !== true) continue;
      const text = typeof part.text === "string" ? part.text : "";
      if (isContinuePromptText(text) && !text.includes(INSTRUCTION_MARKER)) out.push(part);
    }
  }
  return out;
}

/** 有没有还没补语言的续写消息。没有就不用去查工作语言（可能要问 gateway 根会话）。 */
export function hasPendingCompactionContinuePrompt(messages: readonly unknown[]): boolean {
  return pendingContinueParts(messages).length > 0;
}

/** 就地改写，返回改了几处。 */
export function rewriteCompactionContinueLanguage(messages: readonly unknown[], preferredLanguage?: string): number {
  const instruction = languageInstruction(preferredLanguage);
  const parts = pendingContinueParts(messages);
  for (const part of parts) part.text = `${String(part.text)}\n\n${instruction}`;
  return parts.length;
}
