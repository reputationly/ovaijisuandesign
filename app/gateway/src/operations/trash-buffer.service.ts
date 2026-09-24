import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";

import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { GatewayConfig } from "../config/gateway-config.js";

/** 删除后多久内可以撤销。 */
export const DELETE_UNDO_TTL_MS = 10_000;
/** 撤销栈深度。 */
export const UNDO_STACK_DEPTH = 10;

export type UndoOp = { type: "delete"; uuid: string; originalPath: string } | { type: "batch"; ops: UndoOp[] };

export interface UndoResult {
  ok: boolean;
  restored?: string[];
  errorType?: "empty-stack" | "expired" | "path-conflict" | "partial" | "unknown";
  errorMessage?: string;
  failed?: { path: string; reason: string }[];
}

/**
 * 资产面板的删除：先挪进 `.hilo/trash/<uuid>/`、资产行软删除，10 秒内可撤销；
 * 过期后行真删，文件经主进程移到**系统回收站**。
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
    private readonly cfg: GatewayConfig,
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

  /** 缓冲删除一个工作区相对路径。文件不存在返回 null（算成功，用户的意图就是让它消失）。 */
  async bufferDelete(rel: string): Promise<UndoOp | null> {
    const abs = this.paths.resolve(rel);
    if (!abs) throw new Error(`Path traversal detected: ${rel}`);
    const uuid = randomUUID();
    const entry = path.join(this.trashDir, uuid);
    await mkdir(entry, { recursive: true });
    this.assets.vault.softDeleteByPath(rel);
    try {
      await rename(abs, path.join(entry, path.basename(abs)));
    } catch (err) {
      await rm(entry, { recursive: true, force: true });
      this.assets.vault.restoreByPath(rel);
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
    await writeFile(path.join(entry, ".hilo-meta.json"), JSON.stringify({ originalPath: abs, uuid, deletedAt: Date.now() }));
    this.timers.set(
      uuid,
      setTimeout(() => {
        this.timers.delete(uuid);
        void this.promote(uuid).catch((e) => this.log.warn(`移到回收站失败: ${e}`));
      }, DELETE_UNDO_TTL_MS),
    );
    return { type: "delete", uuid, originalPath: abs };
  }

  push(op: UndoOp): void {
    this.stack.push(op);
    if (this.stack.length > UNDO_STACK_DEPTH) this.stack.shift();
  }

  async undo(): Promise<UndoResult> {
    const op = this.stack.pop();
    if (!op) return { ok: false, errorType: "empty-stack" };
    const ops = op.type === "batch" ? op.ops : [op];
    const restored: string[] = [];
    const failed: { path: string; reason: string }[] = [];
    for (const o of ops) {
      if (o.type !== "delete") continue;
      try {
        await this.restore(o);
        restored.push(o.originalPath);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        failed.push({ path: o.originalPath, reason: code === "ENOENT" ? "expired" : code === "EEXIST" ? "path-conflict" : "unknown" });
      }
    }
    if (failed.length === 0) return { ok: true, restored };
    if (restored.length > 0) return { ok: false, errorType: "partial", restored, failed };
    const reason = failed[0]!.reason as UndoResult["errorType"];
    return { ok: false, errorType: reason, errorMessage: `撤销失败: ${failed[0]!.path}`, failed };
  }

  private async restore(o: { uuid: string; originalPath: string }): Promise<void> {
    const t = this.timers.get(o.uuid);
    if (t) clearTimeout(t);
    this.timers.delete(o.uuid);
    const entry = path.join(this.trashDir, o.uuid);
    const src = path.join(entry, path.basename(o.originalPath));
    // 目标位置已经有同名文件了（用户又放了一个进来）：不覆盖，报冲突。
    try {
      await readFile(o.originalPath);
      const e = new Error("path conflict") as NodeJS.ErrnoException;
      e.code = "EEXIST";
      throw e;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    await mkdir(path.dirname(o.originalPath), { recursive: true });
    await rename(src, o.originalPath);
    const rel = this.paths.relativize(o.originalPath);
    if (rel) this.assets.vault.restoreByPath(rel);
    await rm(entry, { recursive: true, force: true });
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
