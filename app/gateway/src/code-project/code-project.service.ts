import { randomUUID } from "node:crypto";
import { constants, lstatSync } from "node:fs";
import { chmod, copyFile, mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { getRuntimeSessionId } from "../common/request-context.js";
import { ProjectResourceService } from "../project-kernel/resource.service.js";
import {
  AsyncMutex,
  CodeProjectError,
  MAX_INPUTS,
  codeProjectId,
  resolveCodeProjectMetaDir,
  resolveCodeProjectWorkDir,
  resolveCodeProjectsRoot,
} from "./common.js";
import { CodeCheckpointStore } from "./checkpoint-store.js";

interface CodeProjectRecord {
  version: 1;
  codeProjectId: string;
  createdAt: number;
  sessions: string[];
  inputs: InputRecord[];
  published: unknown[];
  pendingPublishes: unknown[];
}

export interface InputRecord {
  versionId: string;
  resourceId: string;
  name: string;
  kind: string;
  path: string;
}

@Injectable()
export class CodeProjectService {
  private readonly bindings = new Map<string, string>();
  private readonly locks = new Map<string, AsyncMutex>();
  private readonly stores = new Map<string, CodeCheckpointStore>();

  constructor(private readonly resources: ProjectResourceService) {}

  private workspaceDir(): string {
    const dir = process.env.WORKSPACE_DIR;
    if (!dir) throw new CodeProjectError("WORKSPACE_UNAVAILABLE", "No active workspace", 503);
    return path.resolve(dir);
  }

  open(sessionId: string, request: { inputs?: { versionId: string }[] }) {
    const inputs = request.inputs ?? [];
    if (inputs.length > MAX_INPUTS) {
      throw new CodeProjectError("TOO_MANY_INPUTS", `At most ${MAX_INPUTS} inputs per call`);
    }
    return this.exclusive(`session:${sessionId}`, async () => {
      const workspaceDir = this.workspaceDir();
      const existing = await this.lookup(workspaceDir, sessionId);
      const id = existing ?? `cpj_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
      const skippedInputs: { versionId: string; reason: string }[] = [];
      const record = await this.exclusive(id, async () => {
        const metaDir = resolveCodeProjectMetaDir(workspaceDir, id);
        const workDir = resolveCodeProjectWorkDir(workspaceDir, id);
        let current: CodeProjectRecord;
        if (existing) {
          current = await this.readRecord(workspaceDir, id);
        } else {
          await mkdir(workDir, { recursive: true });
          await mkdir(metaDir, { recursive: true });
          current = {
            version: 1,
            codeProjectId: id,
            createdAt: Date.now(),
            sessions: [sessionId],
            inputs: [],
            published: [],
            pendingPublishes: [],
          };
        }
        for (const { versionId } of inputs) {
          if (current.inputs.some((item) => item.versionId === versionId)) continue;
          if (current.published.some((item) => (item as { versionId?: string }).versionId === versionId)) {
            skippedInputs.push({ versionId, reason: "published_by_this_project" });
            continue;
          }
          current.inputs.push(await this.copyInput(workspaceDir, workDir, versionId));
        }
        await this.writeRecord(workspaceDir, current);
        this.bindings.set(sessionId, id);
        return current;
      });
      return {
        codeProjectId: id,
        created: !existing,
        workDir: resolveCodeProjectWorkDir(workspaceDir, id),
        inputs: record.inputs,
        ...(skippedInputs.length ? { skippedInputs } : {}),
      };
    });
  }

  async status(sessionId: string) {
    const project = await this.bound(sessionId);
    return this.exclusive(project.codeProjectId, async () => {
      const record = await this.readRecord(project.workspaceDir, project.codeProjectId);
      const [head, recent, changedFiles] = await Promise.all([
        project.store.head(),
        project.store.history(),
        project.store.changes(),
      ]);
      return {
        codeProjectId: project.codeProjectId,
        workDir: project.workDir,
        head,
        recent,
        changedFiles,
        published: record.published,
      };
    });
  }

  async checkpoint(sessionId: string, message: string) {
    const project = await this.bound(sessionId);
    return this.exclusive(project.codeProjectId, () => project.store.checkpoint(message));
  }

  async bound(sessionId: string) {
    const workspaceDir = this.workspaceDir();
    const id = await this.lookup(workspaceDir, sessionId);
    if (!id) {
      throw new CodeProjectError(
        "CODE_PROJECT_NOT_OPEN",
        "This session has no Code Project. Call design_code_project_open first.",
        409,
      );
    }
    const workDir = resolveCodeProjectWorkDir(workspaceDir, id);
    const metaDir = resolveCodeProjectMetaDir(workspaceDir, id);
    let store = this.stores.get(metaDir);
    if (!store) {
      store = new CodeCheckpointStore(metaDir, workDir);
      this.stores.set(metaDir, store);
    }
    return { codeProjectId: id, workspaceDir, workDir, metaDir, store };
  }

  async binding(sessionId: string) {
    const workspaceDir = this.workspaceDir();
    const id = await this.lookup(workspaceDir, sessionId);
    return id ? { codeProjectId: id, workDir: resolveCodeProjectWorkDir(workspaceDir, id) } : null;
  }

  sessionId(): string {
    const sessionId = getRuntimeSessionId();
    if (!sessionId) throw new CodeProjectError("SESSION_UNAVAILABLE", "No agent session", 409);
    return sessionId;
  }

  exclusive<T>(id: string, task: () => Promise<T> | T): Promise<T> {
    let lock = this.locks.get(id);
    if (!lock) {
      lock = new AsyncMutex();
      this.locks.set(id, lock);
    }
    return lock.runExclusive(task);
  }

  async readRecord(workspaceDir: string, id: string): Promise<CodeProjectRecord> {
    try {
      const record = JSON.parse(
        await readFile(path.join(resolveCodeProjectMetaDir(workspaceDir, id), "project.json"), "utf8"),
      ) as CodeProjectRecord;
      if (record.codeProjectId !== id) throw new Error("mismatched record");
      return { ...record, pendingPublishes: record.pendingPublishes ?? [] };
    } catch {
      throw new CodeProjectError(
        "CODE_PROJECT_MISSING",
        `Code Project ${id} is missing or damaged in this workspace; it is not recreated automatically.`,
        409,
      );
    }
  }

  async writeRecord(workspaceDir: string, record: CodeProjectRecord): Promise<void> {
    const file = path.join(resolveCodeProjectMetaDir(workspaceDir, record.codeProjectId), "project.json");
    const temporary = `${file}.partial-${randomUUID()}`;
    await writeFile(temporary, JSON.stringify(record, null, 2), "utf8");
    await rename(temporary, file);
  }

  private async lookup(workspaceDir: string, sessionId: string): Promise<string | undefined> {
    const cached = this.bindings.get(sessionId);
    if (cached) return cached;
    const root = resolveCodeProjectsRoot(workspaceDir);
    const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory() || !/^cpj_[a-z0-9]{8,40}$/.test(entry.name)) continue;
      const record = await this.readRecord(workspaceDir, codeProjectId(entry.name)).catch(() => undefined);
      if (record?.sessions.includes(sessionId)) {
        this.bindings.set(sessionId, entry.name);
        return entry.name;
      }
    }
    return undefined;
  }

  private async copyInput(workspaceDir: string, workDir: string, versionId: string): Promise<InputRecord> {
    const snapshot = this.resources.queryResource({ versionId });
    const relativePath = snapshot.version?.relativePath;
    if (snapshot.resource.lifecycle !== "active" || snapshot.version?.status !== "ready" || !relativePath) {
      throw new CodeProjectError("INPUT_UNAVAILABLE", `Input ${versionId} is unavailable`, 404);
    }
    assertResourceContent(workspaceDir, relativePath);
    const extension = path.posix.extname(relativePath);
    const base = snapshot.resource.name
      .replace(/\.[A-Za-z0-9]{1,10}$/, "")
      .replace(/[^\p{L}\p{N}_-]+/gu, "_")
      .slice(0, 60) || "input";
    const name = `${base}-${versionId.slice(-8)}${extension}`;
    await mkdir(path.join(workDir, "inputs"), { recursive: true });
    const target = path.join(workDir, "inputs", name);
    await copyFile(path.join(workspaceDir, relativePath), target, constants.COPYFILE_EXCL).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "EEXIST") throw error;
    });
    await chmod(target, 0o444).catch(() => undefined);
    return {
      versionId,
      resourceId: snapshot.resource.id,
      name: snapshot.resource.name,
      kind: snapshot.resource.kind,
      path: `inputs/${name}`,
    };
  }
}

/** 工作区内的真实文件：拒绝 NUL、反斜杠、绝对路径、`..`、`.hilo` 和符号链接。 */
function assertResourceContent(workspaceDir: string, relativePath: string): void {
  if (
    !relativePath ||
    relativePath.includes("\0") ||
    relativePath.includes("\\") ||
    relativePath.includes(":") ||
    path.posix.isAbsolute(relativePath) ||
    relativePath.split("/").some((part) => !part || part === "." || part === "..") ||
    relativePath.split("/")[0] === ".hilo"
  ) {
    throw new CodeProjectError("INPUT_UNAVAILABLE", "Input path is invalid", 404);
  }
  const parts = relativePath.split("/");
  let current = workspaceDir;
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index] ?? "");
    let stat;
    try {
      stat = lstatSync(current);
    } catch {
      throw new CodeProjectError("INPUT_UNAVAILABLE", "Input is unavailable", 404);
    }
    if (stat.isSymbolicLink()) throw new CodeProjectError("INPUT_UNAVAILABLE", "Input must not be a symlink", 404);
    if (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory()) {
      throw new CodeProjectError("INPUT_UNAVAILABLE", "Input is unavailable", 404);
    }
  }
}
