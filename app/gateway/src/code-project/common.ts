import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const CODE_PROJECTS_DIR = ".hilo/code";
export const MAX_INPUTS = 50;
export const MAX_CHECKPOINT_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_CHECKPOINT_FILES = 10_000;
export const HISTORY_LIMIT = 10;

const IGNORED_DIRECTORIES = new Set([
  ".git", "node_modules", ".venv", "venv", "__pycache__", ".pytest_cache",
  ".mypy_cache", ".ruff_cache", ".cache", ".next", ".parcel-cache",
]);
const IGNORED_ROOT_DIRECTORIES = new Set(["out", "inputs"]);
const IGNORED_FILES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);
const IGNORED_SUFFIXES = [".pyc", ".pyo"];

/** 工作树里不参与 checkpoint / 目录打包的路径。 */
export function isIgnoredCodePath(relative: string): boolean {
  const parts = relative.split("/");
  if (IGNORED_ROOT_DIRECTORIES.has(parts[0] ?? "") && parts.length > 1) return true;
  if (parts.slice(0, -1).some((part) => IGNORED_DIRECTORIES.has(part))) return true;
  const name = parts.at(-1) ?? "";
  return IGNORED_FILES.has(name) || IGNORED_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

export class CodeProjectError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "CodeProjectError";
  }
}

export function codeProjectId(value: string): string {
  if (!/^cpj_[a-z0-9]{8,40}$/.test(value)) throw new Error("Invalid Code Project ID");
  return value;
}

export function resolveCodeProjectsRoot(workspaceDir: string): string {
  return path.join(workspaceDir, CODE_PROJECTS_DIR);
}

export function resolveCodeProjectDir(workspaceDir: string, id: string): string {
  return path.join(resolveCodeProjectsRoot(workspaceDir), codeProjectId(id));
}

export function resolveCodeProjectWorkDir(workspaceDir: string, id: string): string {
  return path.join(resolveCodeProjectDir(workspaceDir, id), "work");
}

export function resolveCodeProjectMetaDir(workspaceDir: string, id: string): string {
  return path.join(resolveCodeProjectDir(workspaceDir, id), "meta");
}

export function resolveCodePublishStagingPath(publishId: string): string {
  if (!/^[a-z0-9]{8,64}$/.test(publishId)) throw new Error("Invalid publish identity");
  return path.posix.join(".hilo", ".tmp", "code-publish", publishId);
}

export class AsyncMutex {
  private chain = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    const task = this.chain.then(fn, fn);
    this.chain = task.then(() => undefined, () => undefined);
    return task;
  }
}

export async function sha256File(file: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

export async function writeAtomic(file: string, content: string): Promise<void> {
  const temporary = `${file}.partial-${randomUUID()}`;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(temporary, content, "utf8");
  await rename(temporary, file);
}

export async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}
