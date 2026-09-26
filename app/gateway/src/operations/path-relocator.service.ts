import { lstat, rename } from "node:fs/promises";

import { Injectable } from "@nestjs/common";
import { toAssetInfo } from "@ov/assets";

import { AssetChangeLog, type AssetChange } from "../common/asset-change-log.js";
import { AssetsService } from "../common/assets.service.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";

/** 以 `.` 开头的目录（`.hilo`、`.git`）不进资产面板的目录树，也不为它们发目录变更。 */
function isVisibleDir(rel: string): boolean {
  return rel.split("/").every((seg) => !seg.startsWith("."));
}

/**
 * 盘上挪动文件 / 文件夹，并让资产库、渲染层跟上。
 *
 * 没有文件监听兜底：改名、移动之后库里的路径不跟着改的话，资产面板会看到一条"找不到文件"
 * 和一个新冒出来的陌生文件，画布上引用它的节点也断了。所以挪完就在库里换路径（id 不变），
 * 再按条发 `renamed`；挪的是文件夹时另外发 `dirs_changed`，让目录树重新拉一遍。
 * 改名、移动和它们的撤销都走这里，行为才一致。
 */
@Injectable()
export class PathRelocator {
  constructor(
    private readonly paths: WorkspacePathService,
    private readonly assets: AssetsService,
    private readonly changes: AssetChangeLog,
    private readonly bus: GatewayEventBus,
  ) {}

  /** 目标已存在时 POSIX rename 会直接覆盖文件，调用方负责先挑好不冲突的名字。 */
  async relocate(fromAbs: string, toAbs: string): Promise<void> {
    const isDir = (await lstat(fromAbs)).isDirectory();
    await rename(fromAbs, toAbs);
    const oldRel = this.paths.relativize(fromAbs);
    const newRel = this.paths.relativize(toAbs);
    if (!oldRel || !newRel) return;
    const moved = this.assets.vault.relocate(oldRel, newRel);
    const evs: AssetChange[] = moved.map(({ row, oldPath }) => ({
      id: row.id,
      change: "renamed",
      asset: toAssetInfo(row),
      path: row.path,
      old_path: oldPath,
    }));
    if (evs.length === 1) this.changes.emit(this.paths.root, evs[0]!);
    else this.changes.emitBatch(this.paths.root, evs);
    if (isDir) {
      this.dirsChanged(oldRel, "removed");
      this.dirsChanged(newRel, "added");
    }
  }

  /** 目录树的增量通知。渲染层收到后整份重拉 `/api/files/dirs`，所以一次改动发一条就够。 */
  dirsChanged(rel: string, change: "added" | "removed"): void {
    if (!rel || !isVisibleDir(rel)) return;
    this.bus.emit("dirs:changed", { type: "dirs_changed", path: rel, change });
  }
}
