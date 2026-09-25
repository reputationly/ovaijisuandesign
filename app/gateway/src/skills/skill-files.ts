import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, NotFoundException } from "@nestjs/common";

import { parseFrontmatter } from "./skill-meta.js";
import { allSkillsDirs } from "./skill-paths.js";

// ---- 目录扫描 ----

// 并发读目录项：技能多了串行读会拖慢 /api/skills，全并发又会在大目录上打满文件句柄。
const SKILL_SCAN_CONCURRENCY = 16;

export interface SkillCandidate {
  dir: string;
  entryName: string;
  skillDir: string;
}

async function listSkillCandidates(dir: string): Promise<SkillCandidate[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => null);
  if (!entries) return [];
  return entries.filter((e) => e.isDirectory() || e.isSymbolicLink()).map((e) => ({ dir, entryName: e.name, skillDir: path.join(dir, e.name) }));
}

export async function mapSkillDirs<T>(dirs: string[], mapper: (c: SkillCandidate) => Promise<T | null>): Promise<T[]> {
  const results: T[] = [];
  for (const dir of dirs) {
    const candidates = await listSkillCandidates(dir);
    for (let i = 0; i < candidates.length; i += SKILL_SCAN_CONCURRENCY) {
      for (const item of await Promise.all(candidates.slice(i, i + SKILL_SCAN_CONCURRENCY).map(mapper))) {
        if (item !== null) results.push(item);
      }
    }
  }
  return results;
}

async function findInSkillDirs<T>(dirs: string[], mapper: (c: SkillCandidate) => Promise<T | null>): Promise<T | null> {
  for (const dir of dirs) {
    const candidates = await listSkillCandidates(dir);
    for (let i = 0; i < candidates.length; i += SKILL_SCAN_CONCURRENCY) {
      const hit = (await Promise.all(candidates.slice(i, i + SKILL_SCAN_CONCURRENCY).map(mapper))).find((x) => x !== null);
      if (hit !== undefined) return hit;
    }
  }
  return null;
}

/** 按技能名（frontmatter 的 name，没有就用目录名）找目录。 */
export function resolveSkillPath(name: string): Promise<string | null> {
  return findInSkillDirs(allSkillsDirs(), async ({ entryName, skillDir }) => {
    let content: string;
    try {
      content = await readFile(path.join(skillDir, "SKILL.md"), "utf-8");
    } catch {
      return entryName === name ? skillDir : null;
    }
    return (parseFrontmatter(content).name ?? entryName) === name ? skillDir : null;
  });
}

// ---- 文件树和内容 ----

const MAX_SKILL_FILE_SIZE = 500 * 1024;
const HIDDEN_ENTRIES = new Set(["__pycache__", "node_modules", ".git"]);
const MIME_TYPES: Record<string, string> = {
  ".md": "text/markdown",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".json": "application/json",
  ".ts": "text/typescript",
  ".js": "text/javascript",
  ".py": "text/x-python",
  ".sh": "text/x-shellscript",
  ".txt": "text/plain",
  ".css": "text/css",
  ".html": "text/html",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export interface SkillFileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: SkillFileNode[];
  size?: number;
}

export function buildFileTree(dirPath: string, rootPath: string, depth = 0): SkillFileNode[] {
  if (depth > 10) return [];
  let entries;
  try {
    entries = readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
  const nodes: SkillFileNode[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || HIDDEN_ENTRIES.has(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(rootPath, fullPath);
    // 符号链接不往下走：链到技能目录外的话会把别处的文件列出来。
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      nodes.push({ name: entry.name, path: relativePath, isDirectory: true, children: buildFileTree(fullPath, rootPath, depth + 1) });
    } else {
      let size = 0;
      try {
        size = statSync(fullPath).size;
      } catch {
        // 断掉的链接按 0 字节列出
      }
      nodes.push({ name: entry.name, path: relativePath, isDirectory: false, size });
    }
  }
  nodes.sort((a, b) => (a.isDirectory !== b.isDirectory ? (a.isDirectory ? -1 : 1) : a.name.localeCompare(b.name)));
  return nodes;
}

export function readSkillFileContent(basePath: string, relativePath: string): { content: string; mimeType: string; tooLarge?: true } {
  const resolved = path.resolve(basePath, relativePath);
  let realResolved: string;
  let realBase: string;
  try {
    realResolved = realpathSync(resolved);
    realBase = realpathSync(basePath);
  } catch {
    throw new NotFoundException(`File "${relativePath}" not found`);
  }
  // 比较的是真实路径：技能目录里的符号链接指向外面也读不到。
  if (!realResolved.startsWith(realBase + path.sep) && realResolved !== realBase) throw new BadRequestException("Path traversal is not allowed");
  const st = statSync(realResolved);
  if (st.isDirectory()) throw new NotFoundException(`File "${relativePath}" not found`);
  if (st.size > MAX_SKILL_FILE_SIZE) return { content: "", mimeType: "text/plain", tooLarge: true };
  const mimeType = MIME_TYPES[path.extname(resolved).toLowerCase()] ?? "text/plain";
  if (mimeType.startsWith("image/")) return { content: readFileSync(realResolved).toString("base64"), mimeType };
  return { content: readFileSync(realResolved, "utf-8"), mimeType };
}
