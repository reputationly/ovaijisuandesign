import { sessionEndpoint, withGatewayIdentity } from "./gateway-identity.js";

/**
 * 附件引用的进程内账本：
 * - 按会话记"本轮用户消息带了哪些附件"（每条新用户消息整体替换）；
 * - 按"会话 + chat turn"记工具调用读进来 / 产出的附件（上限 500 轮，每轮最多 128 条）。
 *
 * 模型请求发出前（chat.headers）把两者合并放进请求头，gateway 据此把这一轮的输入素材记到对话上。
 */
export type AttachmentSource = "client_upload" | "local" | "asset_vault" | "asset_center" | "cloud";

export interface AttachmentRef {
  attachment_source: AttachmentSource;
  attachment_id: string;
  tool_call_id?: string;
  direction: "input" | "output";
}

const ATTACHMENT_SOURCES = new Set<string>(["client_upload", "local", "asset_vault", "asset_center", "cloud"]);

export const attachmentRefsBySession = new Map<string, AttachmentRef[]>();
const toolAttachmentRefsByTurn = new Map<string, AttachmentRef[]>();
const TOOL_ATTACHMENT_TURN_CACHE_LIMIT = 500;

/** 用户消息 part metadata 里界面带的附件引用。没有就清掉上一条消息留下的。 */
export function rememberAttachmentRefs(sessionID: string, parts: readonly unknown[]): void {
  const refs: AttachmentRef[] = [];
  const seen = new Set<string>();
  for (const rawPart of parts) {
    const part = rawPart as { metadata?: { attachments?: unknown } } | null;
    if (!part?.metadata || typeof part.metadata !== "object") continue;
    const attachments = part.metadata.attachments;
    if (!Array.isArray(attachments)) continue;
    for (const rawRef of attachments) {
      if (!rawRef || typeof rawRef !== "object") continue;
      const source = (rawRef as { attachment_source?: unknown }).attachment_source;
      const id = (rawRef as { attachment_id?: unknown }).attachment_id;
      if (typeof source !== "string" || !ATTACHMENT_SOURCES.has(source)) continue;
      if (typeof id !== "string" || id.length === 0) continue;
      const key = `${source}:${id}:input`;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push({ attachment_source: source as AttachmentSource, attachment_id: id, direction: "input" });
    }
  }
  if (refs.length > 0) attachmentRefsBySession.set(sessionID, refs);
  else attachmentRefsBySession.delete(sessionID);
}

/** 工具级引用必须带 tool_call_id 和方向，形状不对的整条丢掉。 */
export function parseToolAttachmentRefs(rawRefs: unknown): AttachmentRef[] {
  if (!Array.isArray(rawRefs)) return [];
  const refs: AttachmentRef[] = [];
  const seen = new Set<string>();
  for (const rawRef of rawRefs) {
    if (!rawRef || typeof rawRef !== "object") continue;
    const c = rawRef as Record<string, unknown>;
    const source = c.attachment_source;
    const id = c.attachment_id;
    const toolCallId = c.tool_call_id;
    const direction = c.direction;
    if (typeof source !== "string" || !ATTACHMENT_SOURCES.has(source)) continue;
    if (typeof id !== "string" || id.length === 0) continue;
    if (typeof toolCallId !== "string" || toolCallId.length === 0) continue;
    if (direction !== "input" && direction !== "output") continue;
    const key = `${source}:${id}:${toolCallId}:${direction}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ attachment_source: source as AttachmentSource, attachment_id: id, tool_call_id: toolCallId, direction });
  }
  return refs;
}

export function mergeAttachmentRefs(...groups: readonly (readonly AttachmentRef[])[]): AttachmentRef[] {
  const merged: AttachmentRef[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const ref of group) {
      const key = `${ref.attachment_source}:${ref.attachment_id}:${ref.tool_call_id ?? "message"}:${ref.direction}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(ref);
    }
  }
  return merged;
}

/** 工具结果的 `_meta` 里带了 chat_turn_id 和附件引用时记到那一轮上。 */
export function rememberToolAttachmentRefs(sessionID: string, rawResult: unknown): void {
  if (!rawResult || typeof rawResult !== "object" || Array.isArray(rawResult)) return;
  const rawMeta = (rawResult as { _meta?: unknown })._meta;
  if (!rawMeta || typeof rawMeta !== "object" || Array.isArray(rawMeta)) return;
  const meta = rawMeta as { chat_turn_id?: unknown; attachment_refs?: unknown };
  const chatTurnId = meta.chat_turn_id;
  if (typeof chatTurnId !== "string" || !/^[0-9a-f]{32}$/i.test(chatTurnId)) return;
  const refs = parseToolAttachmentRefs(meta.attachment_refs);
  if (refs.length === 0) return;
  const key = turnKey(sessionID, chatTurnId);
  const merged = mergeAttachmentRefs(toolAttachmentRefsByTurn.get(key) ?? [], refs);
  toolAttachmentRefsByTurn.delete(key);
  toolAttachmentRefsByTurn.set(key, merged.slice(-128));
  while (toolAttachmentRefsByTurn.size > TOOL_ATTACHMENT_TURN_CACHE_LIMIT) {
    const oldest = toolAttachmentRefsByTurn.keys().next().value;
    if (typeof oldest !== "string") break;
    toolAttachmentRefsByTurn.delete(oldest);
  }
}

export function toolAttachmentRefsForTurn(sessionID: string, chatTurnId: string): AttachmentRef[] {
  return toolAttachmentRefsByTurn.get(turnKey(sessionID, chatTurnId)) ?? [];
}

function turnKey(sessionID: string, chatTurnId: string): string {
  return `${sessionID}:${chatTurnId.toLowerCase()}`;
}

/**
 * question 的回答里用户也可以附文件：回答文本里会带同样格式的附件清单。
 * 取出路径（最多 32 个）去登记，归到这次 question 调用上。
 */
export function questionReplyAttachmentPaths(rawResult: unknown): string[] {
  if (!rawResult || typeof rawResult !== "object" || Array.isArray(rawResult)) return [];
  const metadata = (rawResult as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const answers = (metadata as { answers?: unknown }).answers;
  if (!Array.isArray(answers)) return [];
  const paths: string[] = [];
  const seen = new Set<string>();
  for (const answer of answers) {
    if (!Array.isArray(answer)) continue;
    for (const value of answer) {
      if (typeof value !== "string") continue;
      for (const block of value.matchAll(/\[User attached files:\n([\s\S]*?)\n\]/g)) {
        for (const line of block[1]!.split("\n")) {
          if (line.trim() === "") break;
          if (!line.startsWith("- ")) continue;
          const filePath = line
            .slice(2)
            .replace(/^\[\d+\]\s*/, "")
            .replace(/^(?:image|video|audio|text|file):\s*/, "")
            .trim();
          if (!filePath || seen.has(filePath)) continue;
          seen.add(filePath);
          paths.push(filePath);
          if (paths.length === 32) return paths;
        }
      }
    }
  }
  return paths;
}

/** 超时很短（默认 500ms）：question 结果要尽快回给模型，登记不上就算了。 */
export async function observeQuestionReplyAttachments(
  gatewayUrl: string,
  sessionID: string,
  toolCallID: string,
  rawResult: unknown,
): Promise<AttachmentRef[]> {
  if (!sessionID || !toolCallID) return [];
  const paths = questionReplyAttachmentPaths(rawResult);
  if (paths.length === 0) return [];
  const timeoutMs = Number(process.env.QUESTION_ATTACHMENT_OBSERVATION_TIMEOUT_MS ?? 500);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      sessionEndpoint(gatewayUrl, sessionID, "attachment-observations"),
      withGatewayIdentity({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paths, tool_call_id: toolCallID, direction: "input" }),
        signal: controller.signal,
      }),
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as { attachment_refs?: unknown };
    const rawRefs = Array.isArray(payload.attachment_refs) ? payload.attachment_refs : [];
    return parseToolAttachmentRefs(
      rawRefs.map((rawRef: unknown) => ({
        ...(rawRef && typeof rawRef === "object" ? rawRef : {}),
        tool_call_id: toolCallID,
        direction: "input",
      })),
    );
  } finally {
    clearTimeout(timer);
  }
}

/** 测试用。 */
export function _resetAttachmentRefsForTests(): void {
  attachmentRefsBySession.clear();
  toolAttachmentRefsByTurn.clear();
}
