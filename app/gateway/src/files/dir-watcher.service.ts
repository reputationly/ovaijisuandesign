import { type FSWatcher, watch } from "node:fs";
import { lstat } from "node:fs/promises";
import path from "node:path";

import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";

import { WorkspacePathService } from "../common/workspace-path.service.js";
import { GatewayConfig } from "../config/gateway-config.js";
import { PathRelocator } from "../operations/path-relocator.service.js";

const DEBOUNCE_MS = 150;

/**
 * 工作区目录的增减（用户在访达里新建、删掉、改名文件夹）推给渲染层：发 `dirs_changed`，
 * 目录树收到后重拉 `/api/files/dirs`。自己的改名 / 移动 / 新建已经在操作里发过了，这里兜的是外部改动。
 *
 * 只有绑定了工作区的 gateway 才开；点开头的目录（`.hilo`、`.git`）不管。
 * `fs.watch` 的 rename 事件不区分增删，所以按事件后路径还在不在、是不是目录来判断。删掉的东西已经
 * stat 不到了、分不清原来是文件还是目录，一律发一条：多发一次只是目录树多拉一遍，漏发则树上留着死目录。
 */
@Injectable()
export class DirWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger("DirWatcher");
  private watcher?: FSWatcher;
  /** 同一个路径在短时间里的一串事件（批量拷贝、原子写）合成一次处理。 */
  private readonly pending = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly paths: WorkspacePathService,
    private readonly cfg: GatewayConfig,
    private readonly relocator: PathRelocator,
  ) {}

  onModuleInit(): void {
    if (this.cfg.role !== "workspace") return;
    try {
      this.watcher = watch(this.paths.root, { recursive: true, persistent: false }, (type, filename) => {
        if (type !== "rename" || !filename) return;
        const name = filename.toString();
        clearTimeout(this.pending.get(name));
        const t = setTimeout(() => {
          this.pending.delete(name);
          void this.onRename(name).catch(() => undefined);
        }, DEBOUNCE_MS);
        t.unref();
        this.pending.set(name, t);
      });
      this.watcher.on("error", (err) => this.log.warn(`目录监听出错: ${err.message}`));
    } catch (err) {
      this.log.warn(`目录监听启动失败: ${(err as Error).message}`);
    }
  }

  onModuleDestroy(): void {
    for (const t of this.pending.values()) clearTimeout(t);
    this.pending.clear();
    this.watcher?.close();
    this.watcher = undefined;
  }

  private async onRename(filename: string): Promise<void> {
    const rel = filename.split(path.sep).join("/");
    if (!rel || rel.split("/").some((seg) => seg.startsWith("."))) return;
    const st = await lstat(path.join(this.paths.root, filename)).catch(() => undefined);
    if (st?.isDirectory() && !st.isSymbolicLink()) this.relocator.dirsChanged(rel, "added");
    else if (!st) this.relocator.dirsChanged(rel, "removed");
  }
}
