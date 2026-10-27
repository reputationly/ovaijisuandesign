import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

/**
 * 每轮把"模型看到了什么、工具都干了什么"落一份 JSONL。
 *
 * 为什么要有它：真会话里提示词对不对、agent 的决策跟参照差在哪，只能在
 * **请求级别**看。原来只有 `scripts/pw` 的代理能抓到（而且只覆盖 chat 请求），
 * 日常用 App 时是黑盒。
 *
 * 开关是 `OV_AGENT_TRACE=1`，目录是 `HILO_TRACE_DIR`（默认 `~/.hilo/trace`）。
 * 默认**关**：这不是产品功能，是排障用的取证。
 *
 * 只记形状与摘要（system 取 sha256 与长度、消息只记角色与字符数、工具只记名字与
 * 参数/结果字节数），**不落对话正文** —— 用户的内容不该因为排查问题被复制一份到磁盘。
 * 落盘前仍会过一遍脱敏（`sk-` 开头的串）。
 */
export const TRACE_ENV = "OV_AGENT_TRACE";
export const TRACE_DIR_ENV = "HILO_TRACE_DIR";

export function traceEnabled(): boolean {
  return process.env[TRACE_ENV] === "1";
}

export function traceDir(): string {
  return process.env[TRACE_DIR_ENV]?.trim() || path.join(homedir(), ".hilo", "trace");
}

/** 文件按天切：一次排查通常就翻当天的。 */
export function traceFile(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 10);
  return path.join(traceDir(), `trace-${stamp}.jsonl`);
}

/** `sk-…` 这类凭证即使只出现在摘要里也不该落盘。 */
export function redactTrace(value: string): string {
  return value.replace(/sk-[A-Za-z0-9_-]{6,}/g, (m) => `${m.slice(0, 3)}…redacted(${m.length})`);
}

function write(record: Record<string, unknown>): void {
  if (!traceEnabled()) return;
  try {
    mkdirSync(traceDir(), { recursive: true });
    appendFileSync(traceFile(), `${redactTrace(JSON.stringify({ at: new Date().toISOString(), ...record }))}\n`);
  } catch {
    // 取证不能影响对话：写不进去就算了。
  }
}

/** system 只记指纹与长度：内容里全是提示词，没必要复制。 */
export function traceSystem(sessionID: string, system: readonly string[]): void {
  const text = system.join("\n\n");
  write({
    kind: "system",
    session: sessionID,
    chars: text.length,
    sha256: createHash("sha256").update(text).digest("hex").slice(0, 16),
    blocks: system.length,
  });
}

/** 送进模型的这一批消息（不含正文，只到"谁、多长"）。 */
export function traceMessages(
  sessionID: string,
  messages: readonly { info?: { role?: string }; parts?: readonly unknown[] }[],
  extra: Record<string, unknown> = {},
): void {
  write({
    kind: "messages",
    session: sessionID,
    count: messages.length,
    roles: messages.map((message) => message?.info?.role ?? "?"),
    parts: messages.map((message) => (Array.isArray(message?.parts) ? message.parts.length : 0)),
    ...extra,
  });
}

/** 工具调用：名字 + 参数形状；结果只记字节数。 */
export function traceTool(
  phase: "before" | "after",
  sessionID: string,
  tool: string,
  detail: { argsChars?: number; argsKeys?: string[]; resultChars?: number; status?: string },
): void {
  write({ kind: "tool", phase, session: sessionID, tool, ...detail });
}
