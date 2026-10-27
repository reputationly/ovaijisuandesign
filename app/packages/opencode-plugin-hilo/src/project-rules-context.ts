import { createHash } from "node:crypto";

import { withGatewayIdentity } from "./gateway-identity.js";

/**
 * 项目规则：`.hilo/project-rules.md` 里的持久工作规则，**按 `<project_rules>` 块挂到用户消息上**。
 * 逐字与机制取自参照 4.0.4 的 `src/project-rules-context.ts`。
 *
 * 为什么不是直接把规则塞进 system：规则会在会话中途被改（用户说"以后都这样"），
 * 而 system 是每轮重算的、缓存键跟着变。把"当前完整文档"挂在**用户消息**上，
 * 配上 revision 标记，模型能看到"这一份替换掉之前所有版本"，压缩之后也能重新投递。
 *
 * 只在 v3（`HILO_PROJECT_ARCHITECTURE=resource_v3`）走这条路 —— 与参照一致。
 */
export const PROJECT_RULES_METADATA_KEY = "hilo_project_rules";

/** gateway 的 `GET /api/project-rules`。 */
export const PROJECT_RULES_HTTP_PATH = "/api/project-rules";
/** 读规则不能拖慢一轮对话：超时就当没有规则。 */
export const PROJECT_RULES_TIMEOUT_MS = 2_000;

/** system 里那句"规则会以 `<project_rules>` 块出现在用户消息上"。逐字照参照。 */
export const PROJECT_RULES_SYSTEM_NOTE = [
  "## Project rules",
  "The project's persistent working rules arrive in <project_rules> blocks attached to user messages. The most recent block is the complete current document for this project and applies to main and child agents: it replaces every earlier block, so do not retain rules removed from it. Follow the rules unless they conflict with platform safety requirements or the user's latest explicit one-time exception. A one-time exception does not change the saved rules. When no block is present, no project rules are currently saved.",
].join("\n");

export interface ProjectRules {
  content: string;
  revision: string | null;
}

export function projectRulesRevision(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * 从 gateway 读项目规则（`GET /api/project-rules`）。
 *
 * **不要自己拼路径去读文件。** 规则属于"绑定的工作区"，而插件进程的 `cwd` 与
 * `input.directory` 都可能是别的东西（实测是 `data/Projects/<对话标题>`），
 * 只有 gateway 知道工作区在哪 —— 它的 `WorkspacePathService.root` 就是那份规则所在。
 * 顺带也不必重复实现 revision 与 16 KB 上限。
 */
export async function fetchProjectRules(
  gatewayUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectRules> {
  const response = await fetchImpl(
    `${gatewayUrl.replace(/\/+$/, "")}${PROJECT_RULES_HTTP_PATH}`,
    withGatewayIdentity({ signal: AbortSignal.timeout(PROJECT_RULES_TIMEOUT_MS) }),
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`project rules unavailable (HTTP ${response.status})`);
  return projectRulesFromResponse(body);
}

/** 解析 gateway 的响应；形状不对就当"没有规则"，不抛（不能因此挡住对话）。 */
export function projectRulesFromResponse(value: unknown): ProjectRules {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { content: "", revision: null };
  const record = value as { content?: unknown; revision?: unknown };
  const content = typeof record.content === "string" ? record.content : "";
  const revision = typeof record.revision === "string" ? record.revision : null;
  return { content, revision };
}

/** `<project_rules revision="xxxx">…</project_rules>`。revision 只取前 12 位，够区分。 */
export function formatProjectRulesBlock(rules: ProjectRules): string {
  const revision = rules.revision ? ` revision="${rules.revision.slice(0, 12)}"` : "";
  const body = rules.content
    ? `Current saved project rules (complete document; replaces earlier project_rules blocks):\n\n${rules.content}`
    : "No project rules are currently saved. Earlier project_rules blocks no longer apply.";
  return `<project_rules${revision}>\n${body}\n</project_rules>`;
}

export interface ProjectRulesMarker {
  revision: string | null;
}

/** 从一条 part 上读出我们打的标记（没有标记、或标记形状不对 → undefined）。 */
export function projectRulesMarkerOf(part: unknown): ProjectRulesMarker | undefined {
  if (!part || typeof part !== "object") return undefined;
  const record = part as { type?: unknown; metadata?: Record<string, unknown> };
  if (record.type !== "text" || !record.metadata || typeof record.metadata !== "object") return undefined;
  const marker = record.metadata[PROJECT_RULES_METADATA_KEY] as { revision?: unknown } | undefined;
  if (!marker || typeof marker !== "object") return undefined;
  const revision = marker.revision;
  if (revision !== null && typeof revision !== "string") return undefined;
  return { revision: revision as string | null };
}

/** 消息里最近一次投递过的规则版本；一次都没投递过 → "absent"。 */
export function latestDeliveredProjectRules(messages: readonly unknown[]): ProjectRulesMarker | "absent" {
  for (let i = messages.length - 1; i >= 0; i--) {
    const parts = (messages[i] as { parts?: unknown })?.parts;
    if (!Array.isArray(parts)) continue;
    for (let j = parts.length - 1; j >= 0; j--) {
      const marker = projectRulesMarkerOf(parts[j]);
      if (marker) return marker;
    }
  }
  return "absent";
}

/**
 * 这一轮要不要再投递一次。
 *
 * - 从没投递过：只有真的有规则才投（空规则不必打扰）；
 * - 投递过：revision 变了就重投（改过/删过都要让模型知道）。
 */
export function needsProjectRulesDelivery(delivered: ProjectRulesMarker | "absent", rules: ProjectRules): boolean {
  if (delivered === "absent") return rules.content !== "";
  return delivered.revision !== rules.revision;
}

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * opencode 的 part id 是 `prt_<12 位十六进制时间><14 位 base62>`，且**按 id 排序**。
 * 新 part 的 id 必须排在会话里最后一个 part 之后，否则界面上会插到前面去。
 * 拿不到上一个 id 时用当前时间兜底（同样是 12 位十六进制）。
 */
function nextPartId(previousPartId: string | undefined, seed: string): string {
  const match = typeof previousPartId === "string" ? /^prt_([0-9a-f]{12})[0-9A-Za-z]{14}$/.exec(previousPartId) : null;
  const base = match?.[1] ? BigInt(`0x${match[1]}`) + 1n : BigInt(Date.now()) * 0x1000n;
  const time = base.toString(16).padStart(12, "0").slice(-12);
  const bytes = createHash("sha256").update(seed).digest().subarray(0, 14);
  const tail = Array.from(bytes, (byte) => BASE62[byte % 62]).join("");
  return `prt_${time}${tail}`;
}

export interface ProjectRulesPartIds {
  sessionID: string;
  messageID: string;
  previousPartId?: string;
}

/** 造一条挂规则用的合成 text part。`synthetic: true` 让界面不把它当用户输入渲染。 */
export function projectRulesPart(rules: ProjectRules, ids: ProjectRulesPartIds): Record<string, unknown> {
  return {
    id: nextPartId(ids.previousPartId, `${ids.messageID}:${rules.revision ?? "empty"}`),
    sessionID: ids.sessionID,
    messageID: ids.messageID,
    type: "text",
    text: formatProjectRulesBlock(rules),
    synthetic: true,
    metadata: { [PROJECT_RULES_METADATA_KEY]: { revision: rules.revision } },
  };
}
