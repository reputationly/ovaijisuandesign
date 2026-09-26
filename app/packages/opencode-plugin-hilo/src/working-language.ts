import { resolveRootSession } from "./_session-skill-grants.js";
import {
  getWorkingLanguage,
  getWorkingLanguageForSessions,
  type WorkingLanguageContext,
  type WorkingLanguageSource,
} from "./_session-working-language.js";

/**
 * 工作语言：从用户消息 metadata 里读出来，每轮拼进 system 末尾。agent 的合同里写着"用注入的
 * working_language 回复"——不注入的话它只能猜，读完一份中文的技能文件后常常就跟着换了语言。
 */
export const WORKING_LANGUAGE_METADATA_KEY = "hilo_working_language";

const SOURCES: readonly string[] = ["explicit", "current-message", "ui-preference", "session", "region"];

export function workingLanguageFromParts(parts: readonly unknown[]): WorkingLanguageContext | undefined {
  for (const raw of parts) {
    const part = raw as { metadata?: Record<string, unknown> } | null;
    if (!part || typeof part !== "object" || !part.metadata || typeof part.metadata !== "object") continue;
    const rawContext = part.metadata[WORKING_LANGUAGE_METADATA_KEY] as { locale?: unknown; source?: unknown } | undefined;
    if (!rawContext || typeof rawContext !== "object") continue;
    const { locale, source } = rawContext;
    if (typeof locale === "string" && SOURCES.includes(String(source))) {
      return { locale, source: source as WorkingLanguageSource };
    }
  }
  return undefined;
}

/**
 * 注入 system 的 `<working-language>` 块。逐字保持：agent 合同和技能里的 question 模板都按这里的
 * 措辞理解"逐字"只约束语义、不约束模板的书写语言。
 */
export function formatWorkingLanguage(context: WorkingLanguageContext): string {
  return [
    "<working-language>",
    `working_language: ${context.locale}`,
    `source: ${context.source}`,
    `Use ${context.locale} as working_language for interaction and instruction content in this turn: replies, progress updates, question fields, user-facing documents, planning descriptions, prompt instructions, and summaries.`,
    "Audience-facing artifact language is owned by the selected Skill/workflow and confirmed user requirements. Do not infer it globally from market or audience.",
    "Skill, workflow, and knowledge files may be written in Chinese for internal authoring. Their language must never change working_language.",
    'For Question tool templates from Skill, workflow, or knowledge files, "verbatim", "fixed wording", and "do not rewrite" preserve business semantics, option count and order, recommendation, and result mapping—not the template authoring language.',
    "Render every user-visible Question header, question, option label, and description in working_language. Preserve internal identifiers and exact user-provided text verbatim.",
    "Do not let internal file language alter either language. Keep exact user-provided text verbatim. Briefly explain any hard provider language constraint to the user in working_language.",
    "</working-language>",
  ].join("\n");
}

/** 自己没有记录时沿根会话取：子 agent 的会话从来不直接收到用户消息。 */
export async function getEffectiveWorkingLanguage(sessionId: string | undefined, gatewayUrl: string): Promise<WorkingLanguageContext | undefined> {
  const direct = getWorkingLanguage(sessionId);
  if (direct || !sessionId) return direct;
  const rootSessionId = await resolveRootSession(sessionId, gatewayUrl);
  if (rootSessionId === sessionId) return undefined;
  return getWorkingLanguage(rootSessionId);
}

export async function getEffectiveWorkingLanguageForSessions(
  sessionIds: readonly string[],
  gatewayUrl: string,
): Promise<WorkingLanguageContext | undefined> {
  const direct = getWorkingLanguageForSessions(sessionIds);
  if (direct) return direct;
  for (const sessionId of sessionIds) {
    const inherited = await getEffectiveWorkingLanguage(sessionId, gatewayUrl);
    if (inherited) return inherited;
  }
  return undefined;
}

/** messages.transform 的入参没有会话 id：从消息和 part 上收集。 */
export function collectMessageSessionIds(messages: readonly unknown[]): string[] {
  const sessionIds = new Set<string>();
  for (const rawMessage of messages) {
    const message = rawMessage as { info?: { sessionID?: unknown }; parts?: unknown[] };
    if (typeof message.info?.sessionID === "string") sessionIds.add(message.info.sessionID);
    for (const rawPart of message.parts ?? []) {
      const part = rawPart as { sessionID?: unknown } | null;
      if (typeof part?.sessionID === "string" && part.sessionID.length > 0) sessionIds.add(part.sessionID);
    }
  }
  return [...sessionIds];
}
