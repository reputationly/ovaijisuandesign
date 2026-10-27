import { createHash, randomBytes } from "node:crypto";
import { open } from "node:fs/promises";
import path from "node:path";

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

/** 和 gateway 的 `PROJECT_RULES_MAX_BYTES` 同一个上限，两边必须一致。 */
export const PROJECT_RULES_MAX_BYTES = 16 * 1024;

export const PROJECT_RULES_FILE = path.join(".hilo", "project-rules.md");

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
 * 读项目规则。文件不存在 = 没有规则（`{content:"", revision:null}`），**不是错误**；
 * 超上限或不是合法 UTF-8 才算错误 —— 静默截断会让 agent 按半份规则干活。
 */
export async function readProjectRules(projectRoot: string): Promise<ProjectRules> {
  const filePath = path.join(projectRoot, PROJECT_RULES_FILE);
  let handle;
  try {
    handle = await open(filePath, "r");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { content: "", revision: null };
    throw new Error(`Cannot load project rules from ${filePath}: ${(error as Error).message}`);
  }
  try {
    const bytes = Buffer.alloc(PROJECT_RULES_MAX_BYTES + 1);
    let length = 0;
    while (length < bytes.length) {
      const { bytesRead } = await handle.read(bytes, length, bytes.length - length, length);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    if (length > PROJECT_RULES_MAX_BYTES) {
      throw new Error(`Project rules exceed ${PROJECT_RULES_MAX_BYTES} UTF-8 bytes. Shorten ${filePath} before continuing.`);
    }
    const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, length));
    return { content, revision: projectRulesRevision(content) };
  } catch (error) {
    throw new Error(`Cannot load project rules from ${filePath}: ${(error as Error).message}`);
  } finally {
    await handle.close();
  }
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

/** 测试用：随机字节的兜底分支不参与断言，这里只保证导出形状稳定。 */
export const _randomTailForTests = (): number => randomBytes(1)[0]!;
