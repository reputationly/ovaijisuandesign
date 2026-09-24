import { readFile, rename } from "node:fs/promises";
import path from "node:path";

import { Injectable, Logger } from "@nestjs/common";

import { atomicWriteFile } from "../common/atomic-write.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import type { GenerationRequest, MediaType } from "./generation-request.js";

/**
 * 一条进行中的生成。**提交成功到结果落地之间一直在账上**，gateway 崩了 / 重启了，
 * 靠它把平台上已经付过钱的任务接着等完，而不是让占位卡永远转圈。
 */
export interface ActiveGenerationRecord {
  id: string;
  /** 调用方轮询用的 id。 */
  taskId: string;
  mediaType: MediaType;
  backend: string;
  request: GenerationRequest;
  placeholderId: string | null;
  generationAttemptId: string;
  /** 平台的异步任务号。同步出图没有；异步任务在提交成功的那一刻写入。 */
  platformTaskId?: string;
  createdAt: number;
}

interface LedgerFile {
  version: 1;
  records: ActiveGenerationRecord[];
}

/**
 * `.hilo/active-generations.json`。所有写入串行（一条 promise 链），每次整份原子写。
 * 文件坏了不当成空账：挪到 `.corrupt-<时间戳>` 留证据再从空开始，否则下一次写入会把
 * 还能人工抢救的记录覆盖掉。
 */
@Injectable()
export class ActiveGenerationsStore {
  private readonly log = new Logger("ActiveGenerations");
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private readonly paths: WorkspacePathService) {}

  get file(): string {
    return this.paths.hilo("active-generations.json");
  }

  list(): Promise<ActiveGenerationRecord[]> {
    return this.serial(async () => (await this.read()).records);
  }

  upsert(record: ActiveGenerationRecord): Promise<void> {
    return this.serial(async () => {
      const f = await this.read();
      const i = f.records.findIndex((r) => r.id === record.id);
      if (i >= 0) f.records[i] = record;
      else f.records.push(record);
      await this.write(f);
    });
  }

  patch(id: string, patch: Partial<ActiveGenerationRecord>): Promise<void> {
    return this.serial(async () => {
      const f = await this.read();
      const r = f.records.find((x) => x.id === id);
      if (!r) return;
      Object.assign(r, patch);
      await this.write(f);
    });
  }

  remove(id: string): Promise<void> {
    return this.serial(async () => {
      const f = await this.read();
      const next = f.records.filter((r) => r.id !== id);
      if (next.length !== f.records.length) await this.write({ ...f, records: next });
    });
  }

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.catch(() => undefined);
    return run;
  }

  private async read(): Promise<LedgerFile> {
    let raw: string;
    try {
      raw = await readFile(this.file, "utf8");
    } catch {
      return { version: 1, records: [] };
    }
    try {
      const v = JSON.parse(raw) as Partial<LedgerFile>;
      if (!Array.isArray(v.records)) throw new Error("records is not an array");
      return { version: 1, records: v.records };
    } catch (err) {
      const aside = `${this.file}.corrupt-${Date.now()}`;
      this.log.warn(`Failed to parse ${path.basename(this.file)}: ${(err as Error).message}; moved to ${path.basename(aside)}`);
      await rename(this.file, aside).catch(() => undefined);
      return { version: 1, records: [] };
    }
  }

  private async write(f: LedgerFile): Promise<void> {
    await atomicWriteFile(this.file, JSON.stringify(f, null, 2));
  }
}
