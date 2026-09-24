/**
 * 目录命名。工作区目录名常常来自用户的第一句提示词，所以要：
 * 去掉文件系统不认的字符、合并空白、去掉首部的点和尾部的点/空格（Windows 不认）、
 * 拒绝 Windows 保留名、按码点截到 20 个字符；冲突时不区分大小写地追加 -2、-3……
 * （macOS 默认文件系统不区分大小写，`Foo` 和 `foo` 是同一个目录）。
 */
import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

export const WORKSPACE_DIR_NAME_MAX_CHARS = 20;
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
// 控制字符和文件系统保留字符
const ILLEGAL = /[\\/:*?"<>|\x00-\x1f\x7f]/g;

/** 去掉首部的点和尾部的点/空格；保留名或清空后返回空串。 */
export function portableBasename(name: string): string {
  let s = name.trim();
  while (s.startsWith(".")) s = s.slice(1).trimStart();
  while (s.endsWith(".") || s.endsWith(" ")) s = s.slice(0, -1);
  s = s.trim();
  return !s || RESERVED.test(s) ? "" : s;
}

function truncateCodePoints(s: string, max: number): string {
  const chars = Array.from(s);
  return chars.length > max ? chars.slice(0, max).join("") : s;
}

/** 提示词 → 合法目录名；得不出就返回空串。 */
export function sanitizeDirName(seed: string | undefined, max = WORKSPACE_DIR_NAME_MAX_CHARS): string {
  if (!seed) return "";
  const cleaned = portableBasename(seed.replace(ILLEGAL, " ").replace(/\s+/g, " "));
  if (!cleaned) return "";
  return portableBasename(truncateCodePoints(cleaned, max));
}

export function dateFallbackName(now = new Date()): string {
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `Project-${mm}${dd}`;
}

/** 在 taken（小写）里找一个不冲突的名字：base、base-2、base-3…… */
export function uniqueName(base: string, taken: Set<string>): string {
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

function lowerEntries(dir: string): Set<string> {
  try {
    return new Set(readdirSync(dir).map((n) => n.toLowerCase()));
  } catch {
    return new Set();
  }
}

/** 新工作区的完整路径：`<projectsRoot>/<名字>[-n]`。只算路径，不建目录（根目录除外）。 */
export function generateProjectDirName(seed: string | undefined, projectsRoot: string, extraTaken: Iterable<string> = []): string {
  const base = sanitizeDirName(seed) || dateFallbackName();
  mkdirSync(projectsRoot, { recursive: true });
  const taken = lowerEntries(projectsRoot);
  for (const t of extraTaken) taken.add(t.toLowerCase());
  return path.join(projectsRoot, uniqueName(base, taken));
}

/** 项目空间目录名：同样的清洗规则，得不出时用 `project-<id 前 8 位>`。 */
export function projectFolderBaseName(name: string, id: string): string {
  const cleaned = sanitizeDirName(name.replace(/\s+/g, " ").trim(), WORKSPACE_DIR_NAME_MAX_CHARS);
  return cleaned || `project-${id.slice(0, 8)}`;
}

/** 项目显示名：去首尾空白、合并中间空白。 */
export function normalizeProjectName(name: unknown): string {
  return typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
}
