/**
 * 工作语言：界面在用户消息的 part metadata 里带 `hilo_working_language`，这里记下，
 * 每轮拼进 system 提示词末尾。agent 的合同里写着"用注入的 working_language 回复"——
 * 不注入的话它只能猜，而读完一份英文的知识库文件后常常就改说英文了。
 */
export interface WorkingLanguage {
  locale: string;
  source: string;
}

const SOURCES = new Set(["explicit", "current-message", "ui-preference", "session", "region"]);
const bySession = new Map<string, WorkingLanguage>();
const MAX = 2048;

export function recordFromParts(sessionId: string, parts: { metadata?: Record<string, unknown> }[]): void {
  for (const p of parts) {
    const wl = p.metadata?.hilo_working_language as Partial<WorkingLanguage> | undefined;
    if (wl && typeof wl.locale === "string" && wl.locale && SOURCES.has(String(wl.source))) {
      bySession.delete(sessionId);
      bySession.set(sessionId, { locale: wl.locale, source: String(wl.source) });
      if (bySession.size > MAX) bySession.delete(bySession.keys().next().value!);
      return;
    }
  }
}

export function languageOf(sessionId: string): WorkingLanguage | undefined {
  return bySession.get(sessionId);
}

export function workingLanguageBlock(wl: WorkingLanguage): string {
  return [
    "<working-language>",
    `working_language: ${wl.locale}`,
    `source: ${wl.source}`,
    "- Reply to the user in the working language.",
    "- Write every user-facing field of the question tool (question, header, option labels and descriptions) in the working language.",
    "- Documents, plans and canvas text written for the user use the working language.",
    "- The language of skill files, knowledge files or tool output never changes the working language.",
    "- When a template says to ask something verbatim, keep its meaning, option count and order, but phrase it in the working language.",
    "</working-language>",
  ].join("\n");
}

/** 压缩之后 opencode 会补一条合成的"继续"消息；不加语言提示的话模型常常改说英文。 */
export function continueLanguageHint(locale?: string): string {
  const env = process.env.HILO_USER_LANG;
  const l = (locale ?? env ?? "").toLowerCase();
  if (l.startsWith("zh")) return "[language] 请用中文回复。";
  if (l.startsWith("ja")) return "[language] 日本語で返答してください。";
  if (l.startsWith("ko")) return "[language] 한국어로 답변해 주세요.";
  if (l.startsWith("en")) return "[language] Reply in English.";
  return "[language] Respond in the same language the user has been using.";
}
