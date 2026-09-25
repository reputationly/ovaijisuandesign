/**
 * agent 配置（profile）：从哪读、同步到哪、怎么拼成 opencode 真正加载的那份。
 *
 * 目录结构：`base.json` / `base.<region>.json` / `agents/` / `contracts/` /
 * `knowledge/` / `workflows/` / `plugins/`，都在一个目录里：开发时是仓库的
 * `assets/agent-profiles/v2/config`，发布包里是 `agent-profiles/v2/config`。
 *
 * ## 为什么要 staging，而不是把目录直接交给 opencode
 *
 * **合同（contracts）不会自己进 agent 提示词。** 每次启动都在临时目录里重建一份：
 * 除 `agents/` 外全部 symlink 回源目录，`agents/*.md` 按各合同 frontmatter 的
 * `agents:` 把合同正文拼进去，再追加 `<knowledge-base>` / `<workflows-base>` 两段
 * 绝对路径说明。直接交源目录的话 agent 看不到任何合同，opencode 也不会报错 ——
 * 只是行为不对。
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

/** 缺一个就不启动 —— 缺了 opencode 照样能跑，但 agent 会一本正经地引用不存在的合同或工作流。 */
const REQUIRED: readonly [string, "file" | "dir"][] = [
  ["base.json", "file"],
  ["agents/media-agent.md", "file"],
  ["agents/comfyui-agent.md", "file"],
  ["agents/planner.md", "file"],
  ["agents/router.md", "file"],
  ["agents/executor.md", "file"],
  ["contracts/baseline.md", "file"],
  ["knowledge/vendors", "dir"],
  ["plugins/session-header.ts", "file"],
  ["workflows/workflow.md", "file"],
];

/** staging 时复制而不是 symlink：opencode 会就地改写它们（依赖安装），symlink 会写穿到源目录。 */
const COPY_ONLY = new Set(["package.json", "package-lock.json", "bun.lock", "bun.lockb"]);

export const STAGING_MARKER = ".contracts-staging-marker.json";

/**
 * 把源整份同步到 `dest`，`.version` 记版本。**整目录删了重拷，不做增量**：
 * 增量同步会留下新版本已经删掉的合同，而合同按文件名自动拼进去，留下一个就
 * 多一段过期的规则。每次都拷（1.5MB 不值得省；开发时改了提示词、版本号没变，
 * 按版本判断会让改动不生效）。
 */
export function syncProfile(srcDir: string, dest: string, version: string): void {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(srcDir, dest, { recursive: true, dereference: true });
  writeFileSync(path.join(dest, ".version"), version);
}

export function assertProfileComplete(dir: string): void {
  const missing = REQUIRED.filter(([rel, kind]) => {
    const p = path.join(dir, rel);
    if (!existsSync(p)) return true;
    return kind === "dir" ? !statSync(p).isDirectory() : !statSync(p).isFile();
  }).map(([rel]) => rel);
  if (missing.length) throw new Error(`agent 配置不完整（${dir}）: 缺 ${missing.join("、")}`);
}

/** `base.json` → `base.<region>.json` 逐层深合并。 */
export function loadMergedConfig(dir: string, region: string): Record<string, unknown> {
  let merged: Record<string, unknown> = {};
  for (const name of ["base.json", `base.${region}.json`]) {
    const p = path.join(dir, name);
    if (!existsSync(p)) continue;
    let v: unknown;
    try {
      v = JSON.parse(readFileSync(p, "utf8"));
    } catch (err) {
      throw new Error(`${name} 不是合法 JSON: ${String(err)}`);
    }
    merged = deepMerge(merged, v) as Record<string, unknown>;
  }
  return merged;
}

/** 对象按键递归合并，其余（含数组）整个替换。 */
export function deepMerge(into: unknown, from: unknown): unknown {
  if (isObj(into) && isObj(from)) {
    const out: Record<string, unknown> = { ...into };
    for (const [k, v] of Object.entries(from)) out[k] = k in out && isObj(out[k]) && isObj(v) ? deepMerge(out[k], v) : v;
    return out;
  }
  return from;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

interface Contract {
  name: string;
  agents: string[];
  content: string;
}

export interface StageReport {
  contracts: number;
  /** 拼了东西进去的 agent，`名字×合同数`。 */
  spliced: string[];
}

/** 在 `staging` 重建 opencode 的配置目录。见模块说明。 */
export function stageProfile(source: string, staging: string, now: () => number = Date.now): StageReport {
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  const contracts = loadContracts(path.join(source, "contracts"));

  for (const name of readdirSync(source)) {
    if (name === "agent" || name === "agents") continue;
    const target = path.join(source, name);
    const link = path.join(staging, name);
    if (COPY_ONLY.has(name)) {
      cpSync(target, link, { recursive: true, dereference: true });
      continue;
    }
    try {
      symlinkSync(target, link, statSync(target).isDirectory() ? "junction" : "file");
    } catch {
      // Windows 上没开发者模式时 symlink 会失败，退回复制。
      cpSync(target, link, { recursive: true, dereference: true });
    }
  }

  const knowledge = path.join(source, "knowledge");
  const knowledgePrimary = existsSync(path.join(knowledge, "vendors")) ? knowledgeBlockForPrimary(knowledge) : null;
  const knowledgeSub = knowledgeBlockForSubagent(knowledge);
  const workflows = path.join(source, "workflows");
  const workflowsBlk = existsSync(path.join(workflows, "workflow.md")) ? workflowsBlock(workflows) : null;

  const stagedAgents = path.join(staging, "agents");
  mkdirSync(stagedAgents, { recursive: true });
  const report: StageReport = { contracts: contracts.length, spliced: [] };
  for (const file of readdirSync(path.join(source, "agents"))) {
    const abs = path.join(source, "agents", file);
    if (!file.endsWith(".md") || !statSync(abs).isFile()) continue;
    const agent = file.slice(0, -3);
    const matched = contracts.filter((c) => c.agents.includes("*") || c.agents.includes(agent));
    const staged = splice(readFileSync(abs, "utf8"), agent === "media-agent", matched, knowledgePrimary, knowledgeSub, workflowsBlk);
    if (matched.length) report.spliced.push(`${agent}×${matched.length}`);
    writeFileSync(path.join(stagedAgents, file), staged);
  }
  writeFileSync(
    path.join(staging, STAGING_MARKER),
    JSON.stringify({ stagedAt: now(), contractsCount: report.contracts, agentsCount: report.spliced.length, success: true }),
  );
  return report;
}

/**
 * 拼一个 agent 文件：
 * - 主 agent（media-agent）拿轻量版知识库头；其余 agent **只有匹配到合同时**才拿
 *   子 agent 版的头（那版明确禁止主动浏览知识库目录）；
 * - 工作流头给主 agent 和匹配到合同的 agent；
 * - 什么都没匹配到、又不是主 agent 的，原样输出。
 */
export function splice(
  raw: string,
  isPrimary: boolean,
  matched: Contract[],
  knowledge: string | null,
  knowledgeSub: string,
  workflows: string | null,
): string {
  const hasContract = matched.length > 0;
  if (!hasContract && !(isPrimary && (knowledge || workflows))) return raw;
  const blob = matched.map((c) => `<contract name="${c.name}">\n${c.content}\n</contract>`).join("\n\n");
  const knowledgeSuffix = isPrimary && knowledge ? `\n\n${knowledge}` : hasContract ? `\n\n${knowledgeSub}` : "";
  const workflowsSuffix = workflows && (isPrimary || hasContract) ? `\n\n${workflows}` : "";
  const contractsBlob = blob ? `\n\n<!-- Contracts: auto-injected cross-cutting rules for this agent. -->\n\n${blob}` : "";
  const [fm, body] = splitFrontmatter(raw);
  return `${fm ?? ""}${fm !== null ? body.trim() : raw.trim()}${contractsBlob}${knowledgeSuffix}${workflowsSuffix}\n`;
}

function loadContracts(dir: string): Contract[] {
  if (!existsSync(dir)) throw new Error(`没有 contracts 目录: ${dir}`);
  const out: Contract[] = [];
  for (const file of readdirSync(dir).sort()) {
    const abs = path.join(dir, file);
    if (!file.endsWith(".md") || file === "README.md" || !statSync(abs).isFile()) continue;
    const raw = readFileSync(abs, "utf8");
    const [fm, body] = splitFrontmatter(raw);
    const meta = fm !== null ? parseFrontmatter(fm) : { agents: [] as string[] };
    // 没声明给谁的合同不知道该拼进哪里。要全给就写 `agents: ['*']`。
    if (meta.agents.length === 0) continue;
    const content = (fm !== null ? body : raw).trim();
    if (!content) continue;
    out.push({ name: meta.name ?? file.slice(0, -3), agents: meta.agents, content });
  }
  return out;
}

/**
 * `[frontmatter 连同两条 ---, 正文]`，没有 frontmatter 时前者为 null。
 *
 * 等价于 `^(---\s*\n[\s\S]*?\n---\s*\n)([\s\S]*)$`：结尾的 `\s*\n` 是贪婪的，
 * 结束分隔符后面紧跟的空行**归 frontmatter**。拼接时正文会 trim，所以这些
 * 空行会原样留在 frontmatter 和正文之间。
 */
export function splitFrontmatter(raw: string): [string | null, string] {
  const m = /^(---\s*\n[\s\S]*?\n---\s*\n)([\s\S]*)$/.exec(raw);
  return m ? [m[1]!, m[2]!] : [null, raw];
}

/** 只认合同用得到的两个键：`name`、`agents`（行内 `[a, b]`、块列表 `- a`、单个标量）。 */
export function parseFrontmatter(fm: string): { name?: string; agents: string[] } {
  const meta: { name?: string; agents: string[] } = { agents: [] };
  let inAgents = false;
  for (const line of fm.split("\n")) {
    const t = line.trim();
    if (t === "---") continue;
    if (inAgents) {
      if (t.startsWith("- ")) {
        meta.agents.push(unquote(t.slice(2)));
        continue;
      }
      inAgents = false;
    }
    const i = t.indexOf(":");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (k === "name" && v) meta.name = unquote(v);
    if (k === "agents") {
      if (!v) inAgents = true;
      else if (v.startsWith("[") && v.endsWith("]")) meta.agents = v.slice(1, -1).split(",").map((s) => unquote(s)).filter(Boolean);
      else meta.agents = [unquote(v)];
    }
  }
  return meta;
}

function unquote(s: string): string {
  return s.trim().replace(/^["']|["']$/g, "");
}

function knowledgeBlockForPrimary(dir: string): string {
  return [
    "<knowledge-base>",
    "# Knowledge Base Directory (auto-injected)",
    "",
    `**Base directory**: \`${dir}\``,
    "",
    "When this SP cites a relative knowledge path (e.g.",
    "`vendors/banana.md`, `failures/anatomy-traps.md`),",
    `expand it to the absolute path under \`${dir}/\` before calling`,
    "`hub_read`. Never Read the literal relative form — it would resolve to the",
    "user workspace and fail.",
    "</knowledge-base>",
  ].join("\n");
}

function knowledgeBlockForSubagent(dir: string): string {
  return [
    "<knowledge-base>",
    "# Knowledge Base Directory (auto-injected)",
    "",
    `**Base directory**: \`${dir}\``,
    "",
    "When an injected contract instructs you to Read a path prefixed with",
    "`<knowledgeDir>` (e.g. `<knowledgeDir>/model-prompts/nano-banana.md`),",
    "expand `<knowledgeDir>` to the absolute path above and Read the resulting",
    "full path. Never Read the literal `<knowledgeDir>/...` form — it would",
    "resolve to the user workspace and fail.",
    "",
    "You MUST NOT proactively browse this directory. Only Read files explicitly",
    "named by an injected contract.",
    "</knowledge-base>",
  ].join("\n");
}

function workflowsBlock(dir: string): string {
  return [
    "<workflows-base>",
    "# Workflows Directory (auto-injected)",
    "",
    `**Base directory**: \`${dir}\``,
    "",
    "Layout: `workflow.md` (routing index), `README.md` (directory guide),",
    "`<project_type>/workflow.md` for each",
    "project workflow, and `_shared/<name>.md` for cross-workflow utilities.",
    "When the SP or an injected contract cites a path prefixed with",
    "`<workflowsDir>` (e.g. `<workflowsDir>/ad-tvc/workflow.md`), expand",
    "`<workflowsDir>` to the absolute path above before calling `hub_read`.",
    "`_disabled/` is an archive only and is never a `workflow_match` target.",
    "Never Read the literal `<workflowsDir>/...` form — it would resolve to",
    "the user workspace and fail.",
    "</workflows-base>",
  ].join("\n");
}
