import { BadRequestException } from "@nestjs/common";
import type { AssetStore } from "@ov/assets";

type Db = AssetStore["db"];

/** 限额：单值 256KB、每个节点合计 1MB、最多 256 个键。插件是用户装的第三方 HTML，不设限会把资产库撑大。 */
export const PLUGIN_STORAGE_LIMITS = { valueBytes: 256 * 1024, totalBytes: 1024 * 1024, keys: 256 } as const;

/**
 * HTML 插件节点的键值存储，放在工作区资产库里（和画布一起走，不单独落文件）。
 * 值按 JSON 存；写入返回是否真的变了，调用方据此决定要不要通知渲染层。
 */
export class PluginStorage {
  constructor(private readonly db: Db) {}

  write(nodeId: string, pluginId: string, key: string, value: unknown, deleteKey: boolean): { changed: boolean; keys: string[]; totalBytes: number } {
    return this.db.transaction(() => {
      const existing = this.db.prepare("SELECT value FROM plugin_node_storage_entries WHERE node_id = ? AND key = ?").get(nodeId, key) as { value: string } | undefined;
      let changed = false;
      if (deleteKey || value === undefined) {
        changed = this.db.prepare("DELETE FROM plugin_node_storage_entries WHERE node_id = ? AND key = ?").run(nodeId, key).changes > 0;
      } else {
        const text = JSON.stringify(value);
        const bytes = Buffer.byteLength(text);
        if (bytes > PLUGIN_STORAGE_LIMITS.valueBytes) throw new BadRequestException(`Plugin storage value for "${key}" is ${bytes} bytes; the limit is ${PLUGIN_STORAGE_LIMITS.valueBytes}.`);
        const others = this.db.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(bytes), 0) AS total FROM plugin_node_storage_entries WHERE node_id = ? AND key <> ?").get(nodeId, key) as {
          n: number;
          total: number;
        };
        if (!existing && others.n + 1 > PLUGIN_STORAGE_LIMITS.keys) throw new BadRequestException(`Plugin storage for node ${nodeId} already has ${others.n} keys; the limit is ${PLUGIN_STORAGE_LIMITS.keys}.`);
        if (others.total + bytes > PLUGIN_STORAGE_LIMITS.totalBytes) {
          throw new BadRequestException(`Plugin storage for node ${nodeId} would reach ${others.total + bytes} bytes; the limit is ${PLUGIN_STORAGE_LIMITS.totalBytes}.`);
        }
        if (existing?.value !== text) {
          const now = Date.now();
          this.db
            .prepare("INSERT INTO plugin_node_storage_scopes (node_id, plugin_id, revision, updated_at) VALUES (?, ?, 0, ?) ON CONFLICT(node_id) DO NOTHING")
            .run(nodeId, pluginId, now);
          this.db
            .prepare(
              "INSERT INTO plugin_node_storage_entries (node_id, key, value, bytes, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(node_id, key) DO UPDATE SET value = excluded.value, bytes = excluded.bytes, updated_at = excluded.updated_at",
            )
            .run(nodeId, key, text, bytes, now);
          changed = true;
        }
      }
      if (changed) this.db.prepare("UPDATE plugin_node_storage_scopes SET revision = revision + 1, updated_at = ? WHERE node_id = ?").run(Date.now(), nodeId);
      return { changed, ...this.summary(nodeId) };
    })();
  }

  read(nodeId: string, key?: string): { keys: string[]; value?: unknown } {
    const { keys } = this.summary(nodeId);
    if (key === undefined) return { keys };
    const row = this.db.prepare("SELECT value FROM plugin_node_storage_entries WHERE node_id = ? AND key = ?").get(nodeId, key) as { value: string } | undefined;
    return row ? { keys, value: JSON.parse(row.value) } : { keys };
  }

  private summary(nodeId: string): { keys: string[]; totalBytes: number } {
    const rows = this.db.prepare("SELECT key, bytes FROM plugin_node_storage_entries WHERE node_id = ? ORDER BY key").all(nodeId) as { key: string; bytes: number }[];
    return { keys: rows.map((r) => r.key), totalBytes: rows.reduce((a, r) => a + r.bytes, 0) };
  }
}
