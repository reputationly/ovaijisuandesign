import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { AssetStore, type AssetRow, toAssetInfo } from "@ov/assets";
import type { AssetInfo } from "@ov/protocol";

import { AssetChangeLog } from "./asset-change-log.js";
import { WorkspacePathService } from "./workspace-path.service.js";

/**
 * 资产库的 Nest 包装：持有 `AssetStore`，写入后发（盖过戳的）`assets:changed`。
 * 懒打开 —— app-level gateway 没有工作区，不该在那里建一个 `.hilo/index.sqlite`。
 */
@Injectable()
export class AssetsService implements OnModuleDestroy {
  private readonly log = new Logger("Assets");
  private opened?: AssetStore;

  constructor(
    private readonly paths: WorkspacePathService,
    private readonly changes: AssetChangeLog,
  ) {}

  get vault(): AssetStore {
    this.opened ??= new AssetStore(this.paths.root, {
      log: (level, msg) => this.log[level === "info" ? "log" : level](msg),
    });
    return this.opened;
  }

  onModuleDestroy(): void {
    this.opened?.close();
  }

  list(opts: { includeMetadata?: boolean } = {}): AssetInfo[] {
    return this.vault.list().map((r) => toAssetInfo(r, opts));
  }

  byId(id: string): AssetRow | undefined {
    return this.vault.byId(id);
  }

  byPath(rel: string): AssetRow | undefined {
    return this.vault.byPath(rel);
  }

  async enroll(rel: string, metadata?: Record<string, unknown>): Promise<AssetRow> {
    const existed = this.vault.byPath(rel) !== undefined;
    const row = await this.vault.enroll(rel, metadata);
    this.announce(row, existed ? "updated" : "created");
    return row;
  }

  async store(filename: string, bytes: Uint8Array, metadata?: Record<string, unknown>): Promise<AssetRow> {
    const row = await this.vault.store(filename, bytes, metadata);
    this.announce(row, "created");
    return row;
  }

  announce(row: AssetRow, change: "created" | "updated"): void {
    this.changes.emit(this.paths.root, { id: row.id, change, asset: toAssetInfo(row), path: row.path });
  }
}
