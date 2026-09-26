import type { Db } from "@ov/assets";

/**
 * 文本版本的元数据表（放在工作区资产库 `.hilo/index.sqlite` 里）。正文不进库：按内容哈希压缩存到
 * `.hilo/text-versions/objects/`，一份十几 MB 的文档存二十个版本也不会把资产库撑大，内容相同的
 * 版本（保存 → 还原 → 再保存）天然共用一个对象。
 *
 * 表由这个模块自己按需建（`IF NOT EXISTS`），不占资产库的迁移版本号：资产库的迁移序号是几个模块
 * 共用的，这张表只有版本历史用，自己管更不容易撞号。
 *
 * - `asset_id` 外键级联：文档的资产行被硬删时历史一起走；软删只改 `soft_deleted_at`，撤销窗口内历史还在。
 * - 每个文档最多一个 `initial` 基线（部分唯一索引）：渲染层会同时挂好几个钩子调 list，并发补基线时靠它兜底。
 * - `object_state = 'missing'`：导入的项目带了元数据没带对象目录，行保留，界面能说清"内容没带过来"。
 * - `restored_from_version_id` 不设外键：被还原的版本可能先被配额淘汰，悬空引用在界面上显示为来源未知。
 */
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS text_document_versions (
  id              TEXT PRIMARY KEY,
  asset_id        TEXT NOT NULL,
  seq             INTEGER NOT NULL CHECK (seq > 0),
  title           TEXT NOT NULL DEFAULT '',
  note            TEXT NOT NULL DEFAULT '',
  note_source     TEXT NOT NULL DEFAULT 'manual' CHECK (note_source IN ('manual', 'ai')),
  content_hash    TEXT NOT NULL CHECK (length(content_hash) = 64),
  content_bytes   INTEGER NOT NULL CHECK (content_bytes >= 0),
  stored_bytes    INTEGER NOT NULL CHECK (stored_bytes >= 0),
  codec           TEXT NOT NULL CHECK (codec IN ('zstd', 'gzip')),
  storage_kind    TEXT NOT NULL DEFAULT 'full' CHECK (storage_kind IN ('full', 'delta')),
  object_state    TEXT NOT NULL DEFAULT 'present' CHECK (object_state IN ('present', 'missing')),
  base_version_id TEXT,
  origin          TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('initial', 'manual', 'restore', 'agent')),
  node_id         TEXT,
  rel_path        TEXT,
  pinned          INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  created_at      INTEGER NOT NULL CHECK (created_at >= 0),
  restored_from_version_id TEXT,
  UNIQUE (asset_id, seq),
  CHECK (length(id) > 0),
  CHECK (length(asset_id) > 0),
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tdv_asset_created ON text_document_versions(asset_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tdv_hash ON text_document_versions(content_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tdv_one_initial ON text_document_versions(asset_id) WHERE origin = 'initial';
`;

const ready = new WeakSet<Db>();

export function ensureTextVersionSchema(db: Db): Db {
  if (!ready.has(db)) {
    db.exec(SCHEMA_SQL);
    ready.add(db);
  }
  return db;
}
