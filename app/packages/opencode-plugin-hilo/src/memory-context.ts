import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/**
 * 记忆上下文：项目记忆（`<项目>/.hilo/memory/*.md`）和用户记忆（跨项目）按修改时间
 * 倒序列一个目录，总共不超过 4096 字节。只列名字和一句话描述，正文要看再用
 * `hub_memory` 读 —— 全文塞进来的话几轮之后上下文全是记忆。
 */
const BUDGET = 4096;
const TYPES = new Set(["user", "feedback", "project", "reference", "media-style", "asset-pin"]);

interface Entry {
  name: string;
  type: string;
  description: string;
  mtime: number;
}

function parse(file: string): Entry | undefined {
  let raw: string;
  let mtime: number;
  try {
    raw = readFileSync(file, "utf8");
    mtime = statSync(file).mtimeMs;
  } catch {
    return undefined;
  }
  const fm = /^---\s*\n([\s\S]*?)\n---/.exec(raw)?.[1];
  if (!fm) return undefined;
  const get = (k: string) => new RegExp(`^${k}:\\s*(.+)$`, "m").exec(fm)?.[1]?.trim().replace(/^["']|["']$/g, "");
  const name = get("name");
  const description = get("description");
  const type = get("type");
  if (!name || !description || !type || !TYPES.has(type)) return undefined;
  return { name, description, type, mtime };
}

function list(dir: string): Entry[] {
  let names: string[] = [];
  try {
    names = readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "MEMORY.md");
  } catch {
    return [];
  }
  return names
    .map((f) => parse(path.join(dir, f)))
    .filter((e): e is Entry => !!e)
    .sort((a, b) => b.mtime - a.mtime);
}

export function userMemoryDir(): string {
  return process.env.HUB_MEMORY_DIR ?? path.join(process.env.HILO_DATA_DIR ?? path.join(homedir(), ".ovhub"), "memory");
}

function userMemoryEnabled(projectRoot: string): boolean {
  try {
    const s = JSON.parse(readFileSync(path.join(projectRoot, ".hilo", "storage.json"), "utf8"));
    if (typeof s?.preferences?.loadUserMemory === "boolean") return s.preferences.loadUserMemory;
  } catch {
    // 没有这个文件：看环境变量
  }
  return process.env.HILO_LOAD_USER_MEMORY !== "0";
}

export function memoryContext(projectRoot: string): string | undefined {
  const project = list(path.join(projectRoot, ".hilo", "memory"));
  const user = userMemoryEnabled(projectRoot) ? list(userMemoryDir()) : [];
  const projectNames = new Set(project.map((e) => e.name));
  const userOnly = user.filter((e) => !projectNames.has(e.name));
  if (project.length === 0 && userOnly.length === 0) return undefined;

  const out: string[] = ["# Memory Context"];
  let used = 0;
  let truncated = false;
  const section = (title: string, entries: Entry[]) => {
    if (!entries.length) return;
    out.push("", title);
    for (const e of entries) {
      const line = `- ${e.name} [${e.type}] — ${e.description}`;
      if (used + Buffer.byteLength(line) > BUDGET) {
        truncated = true;
        return;
      }
      used += Buffer.byteLength(line);
      out.push(line);
    }
  };
  section("## Project memory (current workspace)", project);
  section("## User memory (cross-project)", userOnly);
  if (truncated) out.push("", "(More memories exist; use hub_memory action=list to see all.)");
  out.push(
    "",
    "## Memory usage rules",
    "- Save a memory when the user states a lasting preference, a correction, or a project fact you will need again.",
    "- Do not save one-off instructions or things already in the workspace files.",
    "- Update an existing memory instead of creating a near-duplicate.",
    "",
    "Use hub_memory with action=list / read / write / delete / search.",
  );
  return out.join("\n");
}
