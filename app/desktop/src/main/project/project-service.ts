/**
 * 项目（`project` 频道）：一个项目 = 一组工作区路径 + 一个项目空间目录
 * `<projectsRoot>/.projects/<folderName>/`。项目本身不是工作区。
 *
 * 每次改动都是一个事务：先把"改完之后的完整列表"写进日志
 * `<userData>/project-sync-journal/pending.json`，再依次执行
 *   1. 把要删的项目空间挪进废纸篓
 *   2. 建好所有项目空间目录
 *   3. 写全局存储 `projects`
 *   4. 读回核对
 *   5. 删日志
 *   6. 通知 `onDidChangeProjects`
 * 中途崩溃时，下次启动的 `initialize()` 重放日志把状态补齐。执行失败则锁住后续
 * 改动直到重启——半截状态上再叠改动只会更乱。
 *
 * 渲染层"解散项目"只是把 id 加进 `hiddenProjectIds`（隐藏），不走这里的删除；
 * `deleteProject` 才会真的删记录并把项目空间放进废纸篓。
 */
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

import { Emitter, type Event } from "../ipc/events.js";
import type { DeleteProjectResult, ProjectRecord } from "../ipc/types.js";
import { readJsonFile, writeJsonAtomic } from "../storage/json-file.js";
import { normalizeProjectName, projectFolderBaseName, uniqueName } from "./naming.js";

export const JOURNAL_SCHEMA_VERSION = 1;
export const PROJECT_NAME_CONFLICT = "project-name-conflict";

export interface ProjectJournal {
  schemaVersion: number;
  transactionId: string;
  operation: string;
  createdAt: number;
  projectsRoot: string;
  projects: ProjectRecord[];
  deletedFolderNames: string[];
  markMigrationComplete: boolean;
}

export interface ProjectServiceDeps {
  getProjects(): ProjectRecord[];
  setProjects(projects: ProjectRecord[]): void;
  projectsRoot(): string;
  journalDir: string;
  /** 把目录放进废纸篓（生产用 shell.trashItem）。 */
  trashFolder(absPath: string): Promise<void>;
  hasActiveTransfers?(folderName: string): boolean;
  log?(line: string): void;
  now?(): number;
  newId?(): string;
}

interface Draft {
  projects: ProjectRecord[];
  deletedFolderNames: string[];
}

function samePath(a: string, b: string, caseInsensitive: boolean): boolean {
  const x = path.resolve(a);
  const y = path.resolve(b);
  return caseInsensitive ? x.toLowerCase() === y.toLowerCase() : x === y;
}

/** 比较时忽略事务戳，只看内容有没有变。 */
function contentKey(p: ProjectRecord): string {
  const { revision: _r, transactionId: _t, ...rest } = p;
  return JSON.stringify(rest);
}

function isRecord(v: unknown): v is ProjectRecord {
  const p = v as Partial<ProjectRecord> | null;
  return !!p && typeof p.id === "string" && typeof p.name === "string";
}

/** 旧数据可能缺字段：补齐成完整记录。 */
function normalizeRecord(raw: ProjectRecord, now: number): ProjectRecord {
  return {
    id: raw.id,
    name: normalizeProjectName(raw.name) || raw.name,
    kind: raw.kind === "team" ? "team" : "local",
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : now,
    workspacePaths: Array.isArray(raw.workspacePaths) ? raw.workspacePaths.filter((p) => typeof p === "string" && p) : [],
    revision: typeof raw.revision === "number" ? raw.revision : 0,
    transactionId: typeof raw.transactionId === "string" ? raw.transactionId : "",
    folderName: typeof raw.folderName === "string" ? raw.folderName : "",
    ...(raw.remoteId ? { remoteId: raw.remoteId } : {}),
    ...(raw.coverImage ? { coverImage: raw.coverImage } : {}),
  };
}

export class ProjectService {
  private readonly changed = new Emitter<ProjectRecord[]>();
  /** 类字段：总线按可枚举属性找事件。 */
  readonly onDidChangeProjects: Event<ProjectRecord[]> = this.changed.event;
  private ready = false;
  private blockedError: string | undefined;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly deps: ProjectServiceDeps) {}

  private get journalFile(): string {
    return path.join(this.deps.journalDir, "pending.json");
  }

  private get spacesRoot(): string {
    return path.join(this.deps.projectsRoot(), ".projects");
  }

  private now(): number {
    return this.deps.now?.() ?? Date.now();
  }

  private newId(): string {
    return this.deps.newId?.() ?? randomUUID();
  }

  private log(line: string): void {
    this.deps.log?.(`[projects] ${line}`);
  }

  private withLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private assertWritable(): void {
    if (this.blockedError) throw new Error(`Project storage is blocked until restart recovery: ${this.blockedError}`);
    if (!this.ready) throw new Error("Project storage is not initialized");
  }

  private current(): ProjectRecord[] {
    const now = this.now();
    const raw = this.deps.getProjects();
    return (Array.isArray(raw) ? raw : []).filter(isRecord).map((p) => normalizeRecord(p, now));
  }

  // -------------------------------------------------------------------------
  // 事务

  /** 启动时调：重放残留日志、补 folderName、建目录。失败会锁住后续改动。 */
  async initialize(): Promise<void> {
    await this.withLock(async () => {
      try {
        const read = readJsonFile<ProjectJournal>(this.journalFile);
        if (read.kind === "ok" && read.value?.schemaVersion === JOURNAL_SCHEMA_VERSION && Array.isArray(read.value.projects)) {
          this.log(`重放未完成的事务 ${read.value.operation} (${read.value.transactionId})`);
          await this.apply(read.value);
        } else if (read.kind === "corrupt") {
          this.log(`事务日志损坏，已备份到 ${read.backup ?? "(备份失败)"}`);
        }
        const before = this.current();
        const draft: Draft = { projects: before.map((p) => ({ ...p })), deletedFolderNames: [] };
        for (const p of draft.projects) if (!p.folderName) p.folderName = this.reserveFolderName(p.name, p.id, draft.projects);
        const missingDir = draft.projects.some((p) => !existsSync(path.join(this.spacesRoot, p.folderName)));
        const changed = draft.projects.some((p, i) => contentKey(p) !== contentKey(before[i]!));
        if (changed || missingDir) await this.commit("bootstrap-store", before, draft);
        this.ready = true;
      } catch (err) {
        this.blockedError = err instanceof Error ? err.message : String(err);
        this.log(`初始化失败，项目改动已锁定：${this.blockedError}`);
        throw err;
      }
    });
  }

  private run<T>(operation: string, mutate: (draft: Draft) => T): Promise<T> {
    return this.withLock(async () => {
      this.assertWritable();
      const before = this.current();
      const draft: Draft = { projects: before.map((p) => ({ ...p, workspacePaths: [...p.workspacePaths] })), deletedFolderNames: [] };
      const result = mutate(draft);
      await this.commit(operation, before, draft);
      return result;
    });
  }

  private async commit(operation: string, before: ProjectRecord[], draft: Draft): Promise<void> {
    const transactionId = this.newId();
    const prev = new Map(before.map((p) => [p.id, contentKey(p)]));
    const stamped = draft.projects.map((p) =>
      prev.get(p.id) === contentKey(p) && p.transactionId ? p : { ...p, revision: p.revision + 1, transactionId },
    );
    const journal: ProjectJournal = {
      schemaVersion: JOURNAL_SCHEMA_VERSION,
      transactionId,
      operation,
      createdAt: this.now(),
      projectsRoot: this.deps.projectsRoot(),
      projects: stamped,
      deletedFolderNames: draft.deletedFolderNames,
      markMigrationComplete: false,
    };
    writeJsonAtomic(this.journalFile, journal);
    try {
      await this.apply(journal);
    } catch (err) {
      this.blockedError = err instanceof Error ? err.message : String(err);
      this.log(`事务 ${operation} 执行失败，项目改动已锁定：${this.blockedError}`);
      throw err;
    }
  }

  private async apply(journal: ProjectJournal): Promise<void> {
    const spaces = path.join(journal.projectsRoot, ".projects");
    for (const name of journal.deletedFolderNames) {
      const dir = path.join(spaces, name);
      if (existsSync(dir)) await this.deps.trashFolder(dir);
    }
    for (const p of journal.projects) mkdirSync(path.join(spaces, p.folderName), { recursive: true });
    this.deps.setProjects(journal.projects);
    const back = this.deps.getProjects();
    const ok =
      Array.isArray(back) &&
      back.length === journal.projects.length &&
      journal.projects.every((p, i) => back[i]?.id === p.id && back[i]?.revision === p.revision);
    if (!ok) throw new Error("project store verification failed");
    rmSync(this.journalFile, { force: true });
    this.changed.fire(journal.projects.map((p) => ({ ...p, workspacePaths: [...p.workspacePaths] })));
  }

  /**
   * 项目空间目录名：和已有项目、盘上已有目录都不冲突（不区分大小写），
   * 用 mkdir 抢占，被别人先建了就换下一个。
   */
  private reserveFolderName(name: string, id: string, projects: ProjectRecord[]): string {
    const base = projectFolderBaseName(name, id);
    const taken = new Set(projects.map((p) => p.folderName.toLowerCase()).filter(Boolean));
    try {
      for (const n of readdirSync(this.spacesRoot)) taken.add(n.toLowerCase());
    } catch {
      // 根目录还没有
    }
    mkdirSync(this.spacesRoot, { recursive: true });
    for (;;) {
      const candidate = uniqueName(base, taken);
      try {
        mkdirSync(path.join(this.spacesRoot, candidate));
        return candidate;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
        taken.add(candidate.toLowerCase());
      }
    }
  }

  private dedupeName(name: string, projects: ProjectRecord[], exceptId?: string): string {
    const taken = new Set(projects.filter((p) => p.id !== exceptId).map((p) => p.name.toLowerCase()));
    return uniqueName(name, taken);
  }

  private newRecord(draft: Draft, input: { name: string; kind: "local" | "team"; id?: string; remoteId?: string; createdAt?: number; updatedAt?: number }): ProjectRecord {
    const id = input.id ?? this.newId();
    const now = this.now();
    return {
      id,
      name: input.name,
      kind: input.kind,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
      workspacePaths: [],
      revision: 0,
      transactionId: "",
      folderName: this.reserveFolderName(input.name, id, draft.projects),
      ...(input.remoteId ? { remoteId: input.remoteId } : {}),
    };
  }

  // -------------------------------------------------------------------------
  // 频道方法

  createProject(input: { name: string; kind?: "local" | "team"; remoteId?: string; id?: string; createdAt?: number; updatedAt?: number }): Promise<ProjectRecord> {
    const name = normalizeProjectName(input?.name);
    if (!name) return Promise.reject(new Error("project name is required"));
    return this.run("create-project", (draft) => {
      if (input.id && draft.projects.some((p) => p.id === input.id)) throw new Error(`Project already exists: ${input.id}`);
      const rec = this.newRecord(draft, { ...input, name: this.dedupeName(name, draft.projects), kind: input.kind === "team" ? "team" : "local" });
      draft.projects.unshift(rec);
      return rec.id;
    }).then((id) => this.find(id)!);
  }

  async renameProject(projectId: string, name: string): Promise<ProjectRecord | undefined> {
    const next = normalizeProjectName(name);
    if (!next) return undefined;
    this.assertWritable();
    const existing = this.current().find((p) => p.id === projectId);
    if (!existing) return undefined;
    if (existing.name === next) return existing;
    await this.run("rename-project", (draft) => {
      const clash = draft.projects.some((p) => p.id !== projectId && p.name.toLowerCase() === next.toLowerCase());
      if (clash) throw new Error(PROJECT_NAME_CONFLICT);
      const p = draft.projects.find((x) => x.id === projectId);
      if (p) {
        p.name = next;
        p.updatedAt = this.now();
      }
    });
    return this.find(projectId);
  }

  async deleteProject(projectId: string): Promise<DeleteProjectResult> {
    this.assertWritable();
    const target = this.current().find((p) => p.id === projectId);
    if (!target) return { success: false, errorCode: "project-not-found" };
    if (this.hasActiveProjectTransfers(projectId)) return { success: false, errorCode: "project-transfer-active" };
    // 先挪进废纸篓：挪不动就什么都不改，记录还在、目录也还在
    const dir = path.join(this.spacesRoot, target.folderName);
    if (target.folderName && existsSync(dir)) {
      try {
        await this.deps.trashFolder(dir);
      } catch (err) {
        this.log(`项目空间放入废纸篓失败：${String(err)}`);
        return { success: false, errorCode: "project-folder-trash-failed" };
      }
    }
    await this.run("delete-project", (draft) => {
      draft.projects = draft.projects.filter((p) => p.id !== projectId);
      if (target.folderName) draft.deletedFolderNames.push(target.folderName);
    });
    return { success: true };
  }

  hasActiveProjectTransfers(projectId: string): boolean {
    const p = this.current().find((x) => x.id === projectId);
    return !!p && !!this.deps.hasActiveTransfers?.(p.folderName);
  }

  /** 一个工作区只属于一个项目：从别的项目里摘掉，放到目标项目最前面。 */
  async assignWorkspace(workspacePath: string, projectId: string, caseInsensitive = false): Promise<void> {
    if (typeof workspacePath !== "string" || !workspacePath) throw new Error("workspacePath is required");
    await this.run("assign-workspace", (draft) => {
      const target = draft.projects.find((p) => p.id === projectId);
      if (!target) throw new Error(`Project not found: ${projectId}`);
      const now = this.now();
      for (const p of draft.projects) {
        const kept = p.workspacePaths.filter((w) => !samePath(w, workspacePath, caseInsensitive));
        if (kept.length !== p.workspacePaths.length) {
          p.workspacePaths = kept;
          p.updatedAt = now;
        }
      }
      target.workspacePaths = [path.resolve(workspacePath), ...target.workspacePaths];
      target.updatedAt = now;
    });
  }

  async detachWorkspace(workspacePath: string, caseInsensitive = false): Promise<void> {
    await this.run("detach-workspace", (draft) => {
      const now = this.now();
      for (const p of draft.projects) {
        const kept = p.workspacePaths.filter((w) => !samePath(w, workspacePath, caseInsensitive));
        if (kept.length !== p.workspacePaths.length) {
          p.workspacePaths = kept;
          p.updatedAt = now;
        }
      }
    });
  }

  async mergeCloudProjects(cloud: Array<{ id: string; name: string; createdAt?: number; updatedAt?: number }>): Promise<void> {
    if (!Array.isArray(cloud) || cloud.length === 0) return;
    await this.run("merge-cloud-projects", (draft) => {
      for (const c of cloud) {
        if (!c || typeof c.id !== "string") continue;
        const name = normalizeProjectName(c.name) || c.id;
        const hit = draft.projects.find((p) => p.kind === "team" && p.remoteId === c.id);
        if (hit) {
          if (hit.name !== name) hit.name = name;
        } else {
          draft.projects.push(this.newRecord(draft, { name, kind: "team", remoteId: c.id, createdAt: c.createdAt, updatedAt: c.updatedAt }));
        }
      }
    });
  }

  async upsertCloudProject(cloud: { id: string; name: string; createdAt?: number; updatedAt?: number }): Promise<string> {
    return this.run("upsert-cloud-project", (draft) => {
      const name = normalizeProjectName(cloud.name) || cloud.id;
      const hit = draft.projects.find((p) => p.kind === "team" && p.remoteId === cloud.id);
      if (hit) {
        hit.name = name;
        return hit.id;
      }
      const rec = this.newRecord(draft, { name, kind: "team", remoteId: cloud.id, createdAt: cloud.createdAt, updatedAt: cloud.updatedAt });
      draft.projects.unshift(rec);
      return rec.id;
    });
  }

  /** 示例项目：建（或复用同 id 的）项目并把工作区独占地放进去。 */
  async provisionSampleProject(input: { id?: string; name: string; workspacePath: string; caseInsensitive?: boolean }): Promise<ProjectRecord> {
    const name = normalizeProjectName(input.name);
    if (!name) throw new Error("project name is required");
    const id = await this.run("provision-sample-project", (draft) => {
      let target = input.id ? draft.projects.find((p) => p.id === input.id) : undefined;
      if (!target) {
        target = this.newRecord(draft, { id: input.id, name: this.dedupeName(name, draft.projects), kind: "local" });
        draft.projects.unshift(target);
      }
      for (const p of draft.projects) p.workspacePaths = p.workspacePaths.filter((w) => !samePath(w, input.workspacePath, !!input.caseInsensitive));
      target.workspacePaths = [path.resolve(input.workspacePath), ...target.workspacePaths];
      target.updatedAt = this.now();
      return target.id;
    });
    return this.find(id)!;
  }

  getProjectFolderName(projectId: string): string | undefined {
    return this.current().find((p) => p.id === projectId)?.folderName || undefined;
  }

  /** 数据目录搬家后：把旧根下的工作区路径改到新根下。 */
  async relocateProjectsRoot(oldRoot: string, newRoot: string): Promise<void> {
    const from = path.resolve(oldRoot);
    const to = path.resolve(newRoot);
    if (from === to) return;
    await this.run("relocate-projects-root", (draft) => {
      for (const p of draft.projects) {
        p.workspacePaths = p.workspacePaths.map((w) => {
          const abs = path.resolve(w);
          return abs === from || abs.startsWith(from + path.sep) ? path.join(to, path.relative(from, abs)) : w;
        });
      }
    });
  }

  private find(id: string): ProjectRecord | undefined {
    return this.current().find((p) => p.id === id);
  }

  list(): ProjectRecord[] {
    return this.current();
  }
}
