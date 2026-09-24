/**
 * 每个工作区一份 `<dir>/.hilo/storage.json`（版本 10）。
 *
 * 渲染层按目录读写（`storage:workspace-get/set`），同时打开的工作区可能很多，
 * 这里只缓存最近用过的若干个，其余每次从盘上读。
 */
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";

import { cloneJson, isPlainObject, readJsonFile, writeJsonAtomic } from "./json-file.js";

export const WORKSPACE_STORAGE_VERSION = 10;
const CACHE_LIMIT = 16;

export function workspaceStorageDefaults(): Record<string, unknown> {
  return {
    _version: WORKSPACE_STORAGE_VERSION,
    preferences: { loadUserMemory: true },
    recentFiles: [],
    assetPanel: { typeFilters: [], dateFilter: { kind: "all" }, sortOrder: "desc" },
    lastUsedModelParams: {},
    pinnedSessionIds: [],
    hiddenSessionIds: [],
  };
}

export function workspaceStoragePath(dir: string): string {
  return path.join(dir, ".hilo", "storage.json");
}

/** 目录已经是工作区（gateway 建过索引库）。 */
export function hasWorkspaceMarker(dir: string): boolean {
  return existsSync(path.join(dir, ".hilo", "index.sqlite"));
}

function normalize(raw: Record<string, unknown>): Record<string, unknown> {
  const defaults = workspaceStorageDefaults();
  const out: Record<string, unknown> = { ...defaults, ...raw, _version: WORKSPACE_STORAGE_VERSION };
  const prefs = isPlainObject(raw.preferences) ? raw.preferences : {};
  // 记忆开关缺省是开：老文件没有这个字段时不能被当成关
  out.preferences = { ...(defaults.preferences as object), ...prefs };
  if (typeof (out.preferences as Record<string, unknown>).loadUserMemory !== "boolean") {
    (out.preferences as Record<string, unknown>).loadUserMemory = true;
  }
  delete out.timelinePanel;
  return out;
}

/** 目录在 git 仓库里时把 `.hilo/` 加进 .gitignore，避免索引库被提交。 */
function ensureGitignore(dir: string): void {
  if (!existsSync(path.join(dir, ".git"))) return;
  const file = path.join(dir, ".gitignore");
  let text = "";
  try {
    text = readFileSync(file, "utf8");
  } catch {
    // 没有就新建
  }
  if (text.split(/\r?\n/).some((l) => l.trim() === ".hilo/" || l.trim() === ".hilo")) return;
  appendFileSync(file, `${text && !text.endsWith("\n") ? "\n" : ""}.hilo/\n`);
}

class WorkspaceStorage {
  private data: Record<string, unknown>;

  constructor(readonly dir: string) {
    const read = readJsonFile<Record<string, unknown>>(workspaceStoragePath(dir));
    const fresh = read.kind !== "ok" || !isPlainObject(read.value);
    this.data = normalize(fresh ? {} : (read.value as Record<string, unknown>));
    if (fresh) {
      this.flush();
      try {
        ensureGitignore(dir);
      } catch {
        // .gitignore 写不了不影响存储本身
      }
    }
  }

  get(key?: string): unknown {
    return cloneJson(key === undefined ? this.data : this.data[key]);
  }

  set(key: string, value: unknown): void {
    const prev = this.data[key];
    const next = isPlainObject(prev) && isPlainObject(value) ? { ...prev, ...value } : value;
    if (next === undefined) delete this.data[key];
    else this.data[key] = cloneJson(next);
    this.flush();
  }

  private flush(): void {
    writeJsonAtomic(workspaceStoragePath(this.dir), this.data);
  }
}

export class WorkspaceStorageRegistry {
  private readonly cache = new Map<string, WorkspaceStorage>();

  private open(dir: string): WorkspaceStorage {
    if (typeof dir !== "string" || !path.isAbsolute(dir)) throw new Error(`workspace dir must be absolute: ${String(dir)}`);
    const key = path.resolve(dir);
    let s = this.cache.get(key);
    if (s) {
      // 挪到队尾，淘汰时先淘汰最久没用的
      this.cache.delete(key);
    } else {
      s = new WorkspaceStorage(key);
    }
    this.cache.set(key, s);
    while (this.cache.size > CACHE_LIMIT) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }
    return s;
  }

  get(dir: string, key?: string): unknown {
    return this.open(dir).get(key);
  }

  set(dir: string, key: string, value: unknown): void {
    this.open(dir).set(key, value);
  }

  /** 新建工作区时把"加载用户记忆"写进去；已经是工作区的不动。 */
  applyCreatePreferences(dir: string, loadUserMemory: unknown): void {
    if (typeof loadUserMemory !== "boolean" || hasWorkspaceMarker(dir)) return;
    this.set(dir, "preferences", { loadUserMemory });
  }
}
