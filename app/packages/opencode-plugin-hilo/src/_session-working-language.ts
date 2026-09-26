/**
 * 会话 id → 工作语言。界面在每条用户消息的 part metadata 里带上，chat.message 时记下，
 * system.transform / messages.transform 时取用。上限 2048 的 LRU。
 */
export type WorkingLanguageSource = "explicit" | "current-message" | "ui-preference" | "session" | "region";

export interface WorkingLanguageContext {
  locale: string;
  source: WorkingLanguageSource;
}

const SESSION_LIMIT = 2048;
const contexts = new Map<string, WorkingLanguageContext>();

function lruSet(key: string, value: WorkingLanguageContext): void {
  if (contexts.has(key)) contexts.delete(key);
  contexts.set(key, value);
  if (contexts.size > SESSION_LIMIT) {
    const oldest = contexts.keys().next().value;
    if (oldest !== undefined) contexts.delete(oldest);
  }
}

export function rememberWorkingLanguage(sessionId: string, context: WorkingLanguageContext): void {
  lruSet(sessionId, context);
}

export function getWorkingLanguage(sessionId: string | undefined): WorkingLanguageContext | undefined {
  if (!sessionId) return undefined;
  return contexts.get(sessionId);
}

/** 多个会话里第一个有记录的（消息列表里可能混着父子会话的 part）。 */
export function getWorkingLanguageForSessions(sessionIds: readonly string[]): WorkingLanguageContext | undefined {
  for (const sessionId of sessionIds) {
    const context = contexts.get(sessionId);
    if (context) return context;
  }
  return undefined;
}

/** 测试用。 */
export function _resetWorkingLanguageForTests(): void {
  contexts.clear();
}
