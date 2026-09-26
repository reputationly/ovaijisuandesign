import { randomUUID } from "node:crypto";
import { lstat, mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { toAssetInfo } from "@ov/assets";

import { AssetChangeLog, type AssetChange } from "../common/asset-change-log.js";
import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { GatewayConfig } from "../config/gateway-config.js";
import { MutationQueue } from "./mutation-queue.js";
import { PathRelocator } from "./path-relocator.service.js";

/** 删除后多久内可以撤销。 */
export const DELETE_UNDO_TTL_MS = 10_000;
/** 撤销栈深度。 */
export const UNDO_STACK_DEPTH = 10;

/**
 * 可撤销的操作。路径都是绝对路径。
 * - delete：`assetIds` 是删的时候一并软删除的资产行（删文件夹时是它下面的全部），撤销时按 id 放回来。
 * - rename / move：撤销就是把 `from` 挪回 `to`。
 * - duplicate：撤销就是删掉复制出来的那份。
 */
export type UndoOp =
  | { type: "delete"; uuid: string; originalPath: string; assetIds?: string[] }
  | { type: "rename" | "move"; from: string; to: string }
  | { type: "duplicate"; created: string }
  | { type: "batch"; ops: UndoOp[] };

type AtomicOp = Exclude<UndoOp, { type: "batch" }>;
type ErrorType = "expired" | "path-conflict" | "unknown";

export interface UndoResult {
  ok: boolean;
  restored?: string[];
  errorType?: "empty-stack" | "expired" | "path-conflict" | "partial" | "unknown";
  errorMessage?: string;
  failed?: { path: string; reason: string }[];
}

/**
 * 资产面板的删除：先挪进 `.hilo/trash/<uuid>/`、资产行软删除，10 秒内可撤销；
 * 过期后行真删，文件经主进程移到**系统回收站**。另外维护一个撤销栈，改名、移动、
 * 复制一份也能撤。
 *
 * 为什么不直接删：删除确认上写着"可在废纸篓中找到"，承诺了能找回来就必须真的
 * 能找回来。为什么不直接进系统回收站：撤销要能原样放回来（同一路径、同一个
 * asset id、依赖边都不断），从系统回收站捞回来做不到这些。
 */
@Injectable()
export class TrashBufferService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger("TrashBuffer");
  private readonly stack: UndoOp[] = [];
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly paths: WorkspacePathService,
    private readonly assets: AssetsService,
    private readonly changes: AssetChangeLog,
    private readonly cfg: GatewayConfig,
    private readonly queue: MutationQueue,
    private readonly relocator: PathRelocator,
  ) {}

  private get trashDir(): string {
    return this.paths.hilo("trash");
  }

  /** 上次没来得及处理的（进程被杀在 10 秒窗口里）直接处理掉。 */
  async onModuleInit(): Promise<void> {
    if (this.cfg.role === "app-level") return;
    await this.sweep();
  }

  async onModuleDestroy(): Promise<void> {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    await this.sweep();
  }

  private async sweep(): Promise<void> {
    let entries: string[] = [];
    try {
      entries = await readdir(this.trashDir);
    } catch {
      return;
    }
    for (const uuid of entries) await this.promote(uuid).catch((e) => this.log.warn(`清理 trash/${uuid} 失败: ${e}`));
  }

  /**
   * 缓冲删除一个工作区相对路径。文件不存在返回 null（算成功，用户的意图就是让它消失）。
   * 删文件夹时它下面登记过的资产一起软删除，否则资产面板里还挂着一堆指向回收站的条目。
   */
  async bufferDelete(rel: string): Promise<UndoOp | null> {
    const abs = this.paths.resolve(rel);
    if (!abs) throw new Error(`Path traversal detected: ${rel}`);
    const norm = this.paths.relativize(abs)!;
    const uuid = randomUUID();
    const entry = path.join(this.trashDir, uuid);
    await mkdir(entry, { recursive: true });
    const rows = [this.assets.byPath(norm), ...this.assets.vault.listByFolder(norm)].filter((r) => r !== undefined);
    const ids = rows.map((r) => r.id);
    this.assets.vault.softDelete(ids);
    try {
      await rename(abs, path.join(entry, path.basename(abs)));
    } catch (err) {
      await rm(entry, { recursive: true, force: true });
      this.assets.vault.restore(ids);
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
    await writeFile(path.join(entry, ".hilo-meta.json"), JSON.stringify({ originalPath: abs, uuid, deletedAt: Date.now() }));
    this.changes.emitBatch(
      this.paths.root,
      rows.map((r) => ({ id: r.id, change: "removed", path: r.path })),
    );
    this.timers.set(
      uuid,
      setTimeout(() => {
        this.timers.delete(uuid);
        void this.promote(uuid).catch((e) => this.log.warn(`移到回收站失败: ${e}`));
      }, DELETE_UNDO_TTL_MS),
    );
    return { type: "delete", uuid, originalPath: abs, assetIds: ids };
  }

  push(op: UndoOp): void {
    this.stack.push(op);
    if (this.stack.length > UNDO_STACK_DEPTH) this.stack.shift();
  }

  /** 撤销和文件改动走同一个队列：撤销到一半又来一个删除，两边看到的盘面会对不上。 */
  async undo(): Promise<UndoResult> {
    const op = this.stack.pop();
    if (!op) return { ok: false, errorType: "empty-stack" };
    const ops = op.type === "batch" ? op.ops : [op];
    const { restored, failed } = await this.queue.enqueue(async () => {
      const restored: string[] = [];
      const failed: { path: string; reason: string; errorType: ErrorType }[] = [];
      for (const o of ops.flatMap((x) => (x.type === "batch" ? x.ops : [x])) as AtomicOp[]) {
        try {
          restored.push(await this.inverse(o));
        } catch (err) {
          const code = (err as NodeJS.ErrnoException).code;
          const errorType: ErrorType = code === "ENOENT" ? "expired" : code === "EEXIST" ? "path-conflict" : "unknown";
          this.log.warn(`撤销 ${o.type} 失败（${errorType}）: ${(err as Error).message}`);
          failed.push({ path: failurePath(o), reason: errorType, errorType });
        }
      }
      return { restored, failed };
    }, "撤销超时");
    if (failed.length === 0) return { ok: true, restored };
    const strip = failed.map(({ path: p, reason }) => ({ path: p, reason }));
    if (restored.length > 0) return { ok: false, errorType: "partial", restored, failed: strip };
    return {
      ok: false,
      errorType: failed[0]!.errorType,
      errorMessage: `撤销失败: ${failed[0]!.path}`,
      ...(op.type === "batch" ? { failed: strip } : {}),
    };
  }

  /** 执行一个操作的逆操作，返回恢复出来的路径。 */
  private async inverse(o: AtomicOp): Promise<string> {
    switch (o.type) {
      case "delete":
        await this.restore(o);
        return o.originalPath;
      case "rename":
      case "move":
        // 原位置已经被别的东西占了：不覆盖，报冲突。
        await assertAbsent(o.to);
        await mkdir(path.dirname(o.to), { recursive: true });
        await this.relocator.relocate(o.from, o.to);
        return o.to;
      case "duplicate": {
        const rel = this.paths.relativize(o.created);
        const row = rel ? this.assets.byPath(rel) : undefined;
        if (row) {
          this.assets.vault.hardDelete([row.id]);
          this.changes.emit(this.paths.root, { id: row.id, change: "removed", path: row.path });
        }
        await rm(o.created, { force: true });
        return o.created;
      }
    }
  }

  private async restore(o: { uuid: string; originalPath: string; assetIds?: string[] }): Promise<void> {
    const t = this.timers.get(o.uuid);
    if (t) clearTimeout(t);
    this.timers.delete(o.uuid);
    const entry = path.join(this.trashDir, o.uuid);
    const src = path.join(entry, path.basename(o.originalPath));
    // 目标位置已经有同名文件了（用户又放了一个进来）：不覆盖，报冲突。
    await assertAbsent(o.originalPath);
    await mkdir(path.dirname(o.originalPath), { recursive: true });
    await rename(src, o.originalPath);
    const rel = this.paths.relativize(o.originalPath);
    if (o.assetIds?.length) this.assets.vault.restore(o.assetIds);
    else if (rel) this.assets.vault.restoreByPath(rel);
    await rm(entry, { recursive: true, force: true });
    const back: AssetChange[] = [];
    for (const id of o.assetIds ?? []) {
      const row = this.assets.byId(id);
      if (row) back.push({ id, change: "created", asset: toAssetInfo(row), path: row.path });
    }
    this.changes.emitBatch(this.paths.root, back);
    if (rel && (await lstat(o.originalPath)).isDirectory()) this.relocator.dirsChanged(rel, "added");
  }

  /** 过期：行真删，文件进系统回收站，entry 目录删掉。 */
  private async promote(uuid: string): Promise<void> {
    const entry = path.join(this.trashDir, uuid);
    this.assets.vault.purgeSoftDeleted(Date.now() - (DELETE_UNDO_TTL_MS - 1000));
    let files: string[] = [];
    try {
      files = (await readdir(entry)).filter((f) => f !== ".hilo-meta.json");
    } catch {
      return;
    }
    for (const f of files) await this.toOsTrash(path.join(entry, f));
    await rm(entry, { recursive: true, force: true });
  }

  /**
   * 移到系统回收站只有主进程能做（Electron 的 shell.trashItem）。没有 bridge 时：
   * 开发环境直接删；生产环境报错 —— 宁可留着文件，也不要把"进回收站"悄悄变成永久删除。
   */
  private async toOsTrash(abs: string): Promise<void> {
    const url = this.cfg.mainBridgeUrl;
    if (url) {
      const r = await fetch(`${url}/__main/trash`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.cfg.mainBridgeToken ?? ""}` },
        body: JSON.stringify({ path: abs }),
      });
      if (!r.ok) throw new Error(`主进程移到回收站失败: ${r.status}`);
      return;
    }
    if (process.env.NODE_ENV === "production") throw new Error("没有主进程 bridge，拒绝永久删除");
    await rm(abs, { recursive: true, force: true });
  }
}

function failurePath(o: AtomicOp): string {
  switch (o.type) {
    case "delete":
      return o.originalPath;
    case "rename":
    case "move":
      return o.to;
    case "duplicate":
      return o.created;
  }
}

/** 路径上已经有东西时抛 EEXIST（撤销不覆盖任何东西）。 */
async function assertAbsent(abs: string): Promise<void> {
  const st = await lstat(abs).catch((err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") return undefined;
    throw err;
  });
  if (st) {
    const e = new Error(`path conflict: ${abs}`) as NodeJS.ErrnoException;
    e.code = "EEXIST";
    throw e;
  }
}
