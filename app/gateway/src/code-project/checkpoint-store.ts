import { lstat, mkdir, readdir, readFile, rename, copyFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

import {
  CodeProjectError,
  HISTORY_LIMIT,
  MAX_CHECKPOINT_FILE_BYTES,
  MAX_CHECKPOINT_FILES,
  isIgnoredCodePath,
  sha256File,
  writeAtomic,
} from "./common.js";

export interface FileEntry {
  sha256: string;
  size: number;
}

export interface CheckpointRecord {
  checkpointId: string;
  message: string;
  createdAt: number;
  parent: string | null;
  files: Record<string, FileEntry>;
}

export interface CheckpointSummary {
  checkpointId: string;
  message: string;
  createdAt: number;
}

export interface ChangedFile {
  path: string;
  change: "added" | "modified" | "deleted";
}

function summary(record: CheckpointRecord): CheckpointSummary {
  return { checkpointId: record.checkpointId, message: record.message, createdAt: record.createdAt };
}

function diff(before: Record<string, FileEntry>, after: Record<string, FileEntry>): ChangedFile[] {
  const changes: ChangedFile[] = [];
  for (const [file, entry] of Object.entries(after)) {
    const previous = before[file];
    if (!previous) changes.push({ path: file, change: "added" });
    else if (previous.sha256 !== entry.sha256) changes.push({ path: file, change: "modified" });
  }
  for (const file of Object.keys(before)) if (!after[file]) changes.push({ path: file, change: "deleted" });
  return changes.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

function damaged(detail: string): CodeProjectError {
  return new CodeProjectError(
    "CHECKPOINT_STORE_DAMAGED",
    `The Code Project checkpoint store was modified outside the platform (${detail}). It is not repaired automatically; report this as blocked.`,
    409,
  );
}

export class CodeCheckpointStore {
  private readonly hashes = new Map<string, { size: number; mtimeMs: number; sha256: string }>();

  constructor(
    private readonly metaDir: string,
    private readonly workDir: string,
    private readonly maxFileBytes = MAX_CHECKPOINT_FILE_BYTES,
  ) {}

  private get checkpointsDir(): string {
    return path.join(this.metaDir, "checkpoints");
  }

  private objectPath(sha: string): string {
    return path.join(this.metaDir, "objects", sha.slice(0, 2), sha.slice(2));
  }

  async head(): Promise<CheckpointSummary | null> {
    const record = await this.headRecord();
    return record ? summary(record) : null;
  }

  async history(limit = HISTORY_LIMIT): Promise<CheckpointSummary[]> {
    const records: CheckpointSummary[] = [];
    let current = await this.headRecord();
    while (current && records.length < limit) {
      records.push(summary(current));
      current = current.parent ? await this.read(current.parent) : null;
    }
    return records;
  }

  async changes(): Promise<ChangedFile[]> {
    const [head, current] = await Promise.all([this.headRecord(), this.manifest()]);
    return diff(head?.files ?? {}, current);
  }

  async checkpoint(message: string): Promise<{ checkpoint: CheckpointSummary; created: boolean; changedFiles: ChangedFile[] }> {
    const text = message.trim();
    if (!text) throw new CodeProjectError("CHECKPOINT_MESSAGE_REQUIRED", "message is required");
    const head = await this.headRecord();
    const files = await this.manifest();
    const changedFiles = diff(head?.files ?? {}, files);
    if (head && changedFiles.length === 0) return { checkpoint: summary(head), created: false, changedFiles };
    for (const [relative, entry] of Object.entries(files)) {
      if (head?.files[relative]?.sha256 === entry.sha256) continue;
      await this.storeObject(path.join(this.workDir, ...relative.split("/")), entry.sha256);
    }
    const sequence = head ? Number(head.checkpointId.slice(4)) + 1 : 1;
    const record: CheckpointRecord = {
      checkpointId: `ckp_${String(sequence).padStart(4, "0")}`,
      message: text.slice(0, 2000),
      createdAt: Date.now(),
      parent: head?.checkpointId ?? null,
      files,
    };
    await mkdir(this.checkpointsDir, { recursive: true });
    await writeAtomic(path.join(this.checkpointsDir, `${record.checkpointId}.json`), JSON.stringify(record));
    await writeAtomic(path.join(this.metaDir, "HEAD"), record.checkpointId);
    return { checkpoint: summary(record), created: true, changedFiles };
  }

  async tree(checkpointId: string): Promise<{ path: string; object: string; size: number }[]> {
    const record = await this.read(checkpointId);
    const files: { path: string; object: string; size: number }[] = [];
    for (const [relative, entry] of Object.entries(record.files).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
      const object = this.objectPath(entry.sha256);
      const stat = await lstat(object).catch(() => undefined);
      if (!stat?.isFile() || stat.size !== entry.size) throw damaged(`object for ${relative} in ${checkpointId} is missing`);
      files.push({ path: relative, object, size: entry.size });
    }
    return files;
  }

  private async headRecord(): Promise<CheckpointRecord | null> {
    const id = await readFile(path.join(this.metaDir, "HEAD"), "utf8").then(
      (value) => value.trim(),
      (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return "";
        throw error;
      },
    );
    return id ? this.read(id) : null;
  }

  private async read(checkpointId: string): Promise<CheckpointRecord> {
    if (!/^ckp_\d{4,}$/.test(checkpointId)) throw damaged(`invalid checkpoint ${checkpointId}`);
    let record: CheckpointRecord;
    try {
      record = JSON.parse(await readFile(path.join(this.checkpointsDir, `${checkpointId}.json`), "utf8")) as CheckpointRecord;
    } catch {
      throw damaged(`checkpoint ${checkpointId} is missing or unreadable`);
    }
    if (record.checkpointId !== checkpointId || typeof record.files !== "object") throw damaged(`checkpoint ${checkpointId} is inconsistent`);
    return record;
  }

  private async manifest(): Promise<Record<string, FileEntry>> {
    const scanned = await this.scan();
    const files: Record<string, FileEntry> = {};
    for (const [relative, file] of scanned) {
      const cached = this.hashes.get(file.absolute);
      const hash = cached && cached.size === file.size && cached.mtimeMs === file.mtimeMs
        ? cached.sha256
        : await sha256File(file.absolute);
      this.hashes.set(file.absolute, { size: file.size, mtimeMs: file.mtimeMs, sha256: hash });
      files[relative] = { sha256: hash, size: file.size };
    }
    return files;
  }

  private async scan(): Promise<Map<string, { absolute: string; size: number; mtimeMs: number }>> {
    const files = new Map<string, { absolute: string; size: number; mtimeMs: number }>();
    const oversized: string[] = [];
    const walk = async (directory: string, prefix: string): Promise<void> => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) {
          // 目录本身也要按同一套忽略规则判断（out/、inputs/ 只在根层忽略）
          if (isIgnoredCodePath(`${relative}/x`)) continue;
          await walk(path.join(directory, entry.name), relative);
          continue;
        }
        if (!entry.isFile() || isIgnoredCodePath(relative)) continue;
        const absolute = path.join(directory, entry.name);
        const stat = await lstat(absolute);
        if (stat.size > this.maxFileBytes) {
          oversized.push(relative);
          continue;
        }
        files.set(relative, { absolute, size: stat.size, mtimeMs: stat.mtimeMs });
        if (files.size > MAX_CHECKPOINT_FILES) {
          throw new CodeProjectError(
            "CHECKPOINT_TOO_MANY_FILES",
            `The working tree has more than ${MAX_CHECKPOINT_FILES} source files. Keep dependencies in node_modules/.venv and run output in out/; they are not checkpointed.`,
          );
        }
      }
    };
    await walk(this.workDir, "");
    if (oversized.length) {
      throw new CodeProjectError(
        "CHECKPOINT_FILE_TOO_LARGE",
        `Source files larger than ${Math.ceil(this.maxFileBytes / 1024 / 1024)} MiB cannot be checkpointed: ${oversized.slice(0, 10).join(", ")}. Move generated files into out/.`,
      );
    }
    return files;
  }

  private async storeObject(source: string, sha: string): Promise<void> {
    const target = this.objectPath(sha);
    if (await lstat(target).then((stat) => stat.isFile(), () => false)) return;
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.partial-${randomUUID()}`;
    try {
      await copyFile(source, temporary);
      if (await sha256File(temporary) !== sha) {
        throw new CodeProjectError(
          "CHECKPOINT_SOURCE_CHANGED",
          "A file changed while the checkpoint was being written; retry design_code_checkpoint after the running command finishes.",
          409,
          true,
        );
      }
      await rename(temporary, target);
    } finally {
      await lstat(temporary).then((s) => s.isFile(), () => false);
    }
  }
}
