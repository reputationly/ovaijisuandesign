import * as fs from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";

/**
 * 记忆上下文：项目记忆（`<项目>/.hilo/memory/*.md`）和用户记忆（跨项目）按修改时间倒序列一个目录，
 * 总共不超过 4096 字节。只列名字、类型和一句话描述，正文要看再用 `hub_memory` 读 ——
 * 全文塞进来的话几轮之后上下文全是记忆。
 *
 * 目录列表后面跟一段固定的"什么时候存、什么时候别存"的规则：不写的话模型会把每次生成的
 * 参数都当成长期偏好存下来。
 */
const DEFAULT_BUDGET_BYTES = 4096;
const INDEX_FILENAME = "MEMORY.md";
const MEMORY_TYPES = new Set(["user", "feedback", "project", "reference", "media-style", "asset-pin"]);

export interface MemoryEntry {
  scope: "project" | "user";
  name: string;
  type: string;
  description: string;
  mtimeMs: number;
}

/** 数据根和主进程、gateway、MCP 同一套规则：HILO_DATA_DIR 覆盖，默认 `~/.ovhub`。 */
function hubRoot(): string {
  return process.env.HILO_DATA_DIR?.trim() || path.join(homedir(), ".ovhub");
}

export function userMemoryDir(): string {
  const envDir = process.env.HUB_MEMORY_DIR;
  if (envDir) return envDir;
  return path.join(hubRoot(), "memory");
}

export function projectMemoryDir(projectRoot: string): string {
  return path.join(projectRoot, ".hilo", "memory");
}

function workspaceStoragePath(projectRoot: string): string {
  return path.join(projectRoot, ".hilo", "storage.json");
}

/** 工作区偏好（界面上的"加载用户记忆"开关）优先，没有再看环境变量。 */
export function shouldIncludeUserMemory(projectRoot: string | undefined): boolean {
  if (projectRoot) {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(workspaceStoragePath(projectRoot), "utf-8"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const preferences = (parsed as { preferences?: unknown }).preferences;
        if (preferences && typeof preferences === "object" && !Array.isArray(preferences)) {
          const value = (preferences as { loadUserMemory?: unknown }).loadUserMemory;
          if (typeof value === "boolean") return value;
        }
      }
    } catch {
      // 没有偏好文件或读不了：看环境变量
    }
  }
  return process.env.HILO_LOAD_USER_MEMORY !== "0";
}

function parseHeader(content: string): { name: string; description: string; type: string } | undefined {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return undefined;
  const yaml = match[1]!;
  const pick = (key: string): string | undefined => {
    const m = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    if (!m) return undefined;
    const raw = m[1]!.trim();
    if (raw.length === 0) return undefined;
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) return raw.slice(1, -1);
    return raw;
  };
  const name = pick("name");
  const description = pick("description");
  const type = pick("type");
  if (!name || !description || !type) return undefined;
  if (!MEMORY_TYPES.has(type)) return undefined;
  return { name, description, type };
}

function scanScope(dir: string, scope: MemoryEntry["scope"]): MemoryEntry[] {
  if (!fs.existsSync(dir)) return [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    console.warn(`[hilo-plugin] memory scope=${scope} dir=${dir} unreadable: ${(err as Error).message}`);
    return [];
  }
  const out: MemoryEntry[] = [];
  for (const entry of entries) {
    if (!entry.isFile() && !entry.isSymbolicLink()) continue;
    if (!entry.name.endsWith(".md")) continue;
    if (entry.name === INDEX_FILENAME) continue;
    const filePath = path.join(dir, entry.name);
    let raw: string;
    let mtimeMs: number;
    try {
      raw = fs.readFileSync(filePath, "utf-8");
      mtimeMs = fs.statSync(filePath).mtimeMs;
    } catch (err) {
      console.warn(`[hilo-plugin] memory entry ${filePath} unreadable: ${(err as Error).message}`);
      continue;
    }
    const header = parseHeader(raw);
    if (!header) {
      console.warn(`[hilo-plugin] memory entry ${filePath} missing/invalid frontmatter (name/description/type), skipped`);
      continue;
    }
    out.push({ scope, name: header.name, type: header.type, description: header.description, mtimeMs });
  }
  return out;
}

/** 规则正文里引用记忆工具的写法。记忆工具是一个 `hub_memory` 按 action 分派。 */
const TOOL_LEXICON = {
  ref: (action: string) => `hub_memory({action:'${action}'})`,
  refWithName: (action: string) => `hub_memory({action:'${action}', name})`,
  family: "hub_memory",
  hint: "You can call the `hub_memory` tool with an `action` arg (`list` / `read` / `write` / `delete` / `search`) to manage memory entries. Refer to memory only when relevant; do not dump all entries.",
};

function buildMemoryUsageRules(lex: typeof TOOL_LEXICON): string {
  return `## Memory usage rules

You are a multimodal co-creator. Memory is your long-term style + asset memory
across sessions, not a notepad for the current generation. Bias toward NOT saving.

When to save:
- media-style (project): user expresses a stable preference for the **whole project / series** —
  visual style, color grading, composition, default size, default duration, default voice, etc.
  Examples: "this project uses cinematic cool tones", "always use voice_id=xxx for narration"
- asset-pin (project): user explicitly says "use this as the main character", "remember this
  asset", "lock this anchor". MUST include asset_uri + asset_modality.
- project: project-level world-building / character bible / brand constraint / delivery deadline.
  Examples: "main character is Mochi the orange cat", "client forbids red tones", "deliver Friday"
- feedback: user **corrects** or **explicitly confirms** a non-obvious working pattern.
  Examples: "stop generating 4 candidates per round, too slow", "yes, storyboard first then batch generate is right"
- user: user identity / creative domain (write once, then leave alone).
  Example: "indie game artist, mixed pixel + oil-painting style"
- reference: external moodboard / Pinterest board / Linear tickets — only when user explicitly
  asks you to remember the link. Lowest priority for media work; skip unless user insists.

When NOT to save:
- one-off experimental prompts ("let me try cinematic this round") — next round may pivot
- a normal generation result — never asset-pin unless user explicitly anchors it
- the user's current edit request ("make this one darker") — that is task context, not long-term memory
- inferred aesthetic preferences — never speak for the user; require an explicit "I like / always"
- per-session model / parameter picks — only persist when user says "use this from now on"

When to update vs create:
- An existing media-style for this project? ${lex.ref("read")} first, then merge incrementally —
  do not create a new entry per micro-preference.
- A better version of an existing asset-pin character? overwrite the same name, keep the name stable.
- Always ${lex.ref("list")} at the start of a session to surface project anchors.

## How to call memory tools

- The bullet list above is \`<name> [<type>] — <description>\`, where **name is
  the frontmatter \`name\` field** (kebab-case, no underscores). Pass that
  exact value to \`${lex.refWithName("read")}\`/\`${lex.refWithName("delete")}\` — do not pass the on-disk
  filename stem like \`user_image-style-preference\` or \`asset_pin_xxx\`.
- \`projectRoot\` is **auto-injected** by the runtime for every \`${lex.family}\` call,
  so you can omit it. (Pass it only when you genuinely need to point at a
  different project — almost never.)
- Always \`${lex.ref("list")}\` once at the start of a session to surface project
  anchors, then \`${lex.ref("read")}\` only what's relevant.

Recommended body template for media-style:
\`\`\`markdown
## 风格关键词 / Style keywords
cinematic, cool tone, low-key lighting

## 默认参数 / Defaults
- image: aspect_ratio=16:9, model=banana
- video: duration=5s, model=<video model_id>
- audio: voice_id=xxx (描述音色)

## 避免 / Avoid
- 过饱和色
- anime 风
\`\`\`
This structure lets sub-agents lift the relevant block straight into their generation prompts.`;
}

function renderEntryLine(entry: MemoryEntry): string {
  return `- ${entry.name} [${entry.type}] — ${entry.description}`;
}

const utf8Bytes = (s: string) => Buffer.byteLength(s, "utf8");

export interface LoadMemoryContextOptions {
  projectRoot?: string;
  includeUserMemory?: boolean;
  budgetBytes?: number;
}

export interface MemoryContextResult {
  prompt: string;
  truncated: number;
  totalEntries: number;
}

export async function loadMemoryContext(opts: LoadMemoryContextOptions = {}): Promise<MemoryContextResult> {
  const budgetBytes = opts.budgetBytes ?? DEFAULT_BUDGET_BYTES;
  const includeUserMemory = opts.includeUserMemory ?? true;
  const usageRules = buildMemoryUsageRules(TOOL_LEXICON);
  const listToolRef = TOOL_LEXICON.ref("list");

  const projectEntries = opts.projectRoot ? scanScope(projectMemoryDir(opts.projectRoot), "project") : [];
  const rawUserEntries = includeUserMemory ? scanScope(userMemoryDir(), "user") : [];
  // 同名时项目记忆覆盖用户记忆。
  const projectNames = new Set(projectEntries.map((e) => e.name));
  const userEntries = rawUserEntries.filter((e) => !projectNames.has(e.name));
  projectEntries.sort((a, b) => b.mtimeMs - a.mtimeMs);
  userEntries.sort((a, b) => b.mtimeMs - a.mtimeMs);

  const totalEntries = projectEntries.length + userEntries.length;
  if (totalEntries === 0) return { prompt: "", truncated: 0, totalEntries: 0 };

  const header = "# Memory Context";
  const sections = [header];
  let bytes = utf8Bytes(header);
  let truncated = 0;
  const appendSection = (title: string, items: MemoryEntry[]) => {
    if (items.length === 0) return;
    const headerCost = utf8Bytes(`\n\n${title}`);
    if (bytes + headerCost > budgetBytes) {
      truncated += items.length;
      return;
    }
    sections.push(title);
    bytes += headerCost;
    for (const entry of items) {
      const line = renderEntryLine(entry);
      const cost = utf8Bytes(`\n${line}`);
      // 放不下的跳过、继续看后面更短的，而不是整段截断。
      if (bytes + cost > budgetBytes) {
        truncated += 1;
        continue;
      }
      sections.push(line);
      bytes += cost;
    }
  };
  appendSection("## Project memory (current workspace)", projectEntries);
  appendSection("## User memory (cross-project)", userEntries);
  if (truncated > 0) sections.push(`[... ${truncated} more entries truncated, use ${listToolRef} to see all]`);
  sections.push(usageRules);
  sections.push(TOOL_LEXICON.hint);
  return { prompt: collapseBlocks(sections), truncated, totalEntries };
}

/** 标题和正文之间空一行，同一段里的条目紧挨着。 */
function collapseBlocks(parts: string[]): string {
  const blocks: string[] = [];
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.length > 0) {
      blocks.push(buffer.join("\n"));
      buffer = [];
    }
  };
  for (const part of parts) {
    if (part.startsWith("- ") || part.startsWith("[... ")) {
      buffer.push(part);
    } else {
      flush();
      buffer.push(part);
    }
  }
  flush();
  return blocks.join("\n\n");
}
