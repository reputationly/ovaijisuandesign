/**
 * 资产库的 schema。按版本号顺序执行，每条在一个事务里；执行过的版本记在
 * `schema_version`，重开时跳过。
 *
 * 只追加不改：已经发布出去的版本改了内容，老用户的库不会重跑它，于是两边
 * schema 悄悄分叉。要改结构就加一条新的。
 */
export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: "init",
    sql: `
-- 资产索引。id 在工作区生命周期内稳定：canvas.json 的节点用 assetId 引用它，
-- id 变了等于把画布上的节点变成悬空引用。
CREATE TABLE IF NOT EXISTS assets (
  id                  TEXT PRIMARY KEY,
  path                TEXT NOT NULL UNIQUE,              -- 工作区相对路径，/ 分隔
  status              TEXT NOT NULL DEFAULT 'active',    -- 'active' | 'missing'
  size                INTEGER NOT NULL,
  mtime_ms            INTEGER NOT NULL,
  dev_id              INTEGER,
  inode               INTEGER,
  birthtime_ms        INTEGER,
  quick_hash          TEXT,                              -- xxh3-64(前 4MB)，hex
  full_hash           TEXT,
  width               INTEGER,
  height              INTEGER,
  duration_ms         INTEGER,
  mime_type           TEXT,                              -- 类别由 mime 推出，不单独存 type 列
  name                TEXT NOT NULL,
  metadata            TEXT,                              -- JSON：prompt、model、生成参数…
  created_at          INTEGER NOT NULL,                  -- epoch ms
  updated_at          INTEGER NOT NULL,
  candidate_asset_id  TEXT REFERENCES assets(id) ON DELETE SET NULL,
  candidate_path      TEXT,
  -- 软删除：资产面板删除后有一段可撤销窗口，期间行还在、id 和依赖边都不断。
  -- 按路径 / 列表查询要过滤它，按 id 查询不过滤（画布和对话里的引用在窗口期
  -- 内还得解析得出来）。
  soft_deleted_at     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_assets_quick_hash     ON assets(quick_hash);
CREATE INDEX IF NOT EXISTS idx_assets_size_quick     ON assets(size, quick_hash);
CREATE INDEX IF NOT EXISTS idx_assets_mime_type      ON assets(mime_type);
CREATE INDEX IF NOT EXISTS idx_assets_created_at     ON assets(created_at);
CREATE INDEX IF NOT EXISTS idx_assets_status         ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_dev_inode      ON assets(dev_id, inode);
CREATE INDEX IF NOT EXISTS idx_assets_status_updated ON assets(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_assets_soft_deleted_at ON assets(soft_deleted_at) WHERE soft_deleted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS workspace_meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- 启动时 reconcile 的单行锁。started_at 超过阈值的当作崩溃遗留，强制清掉。
CREATE TABLE IF NOT EXISTS reconcile_lock (
  gateway_id  TEXT NOT NULL PRIMARY KEY,
  started_at  INTEGER NOT NULL
);

-- 依赖关系的 role 用查表而不是 CHECK：SQLite 改 CHECK 要重建整张表，
-- 加一个 role 应该只是一条 INSERT。
CREATE TABLE IF NOT EXISTS asset_role_defs (
  role          TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL,
  description   TEXT,
  deprecated    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);

-- 血缘 + 引用。代理主键 id：复合主键和 parent_id 的 ON DELETE SET NULL 冲突
-- （主键列隐含 NOT NULL）。
CREATE TABLE IF NOT EXISTS asset_dependencies (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id              TEXT NOT NULL,
  parent_id             TEXT,
  parent_attachment_id  TEXT,
  role                  TEXT NOT NULL REFERENCES asset_role_defs(role),
  input_index           INTEGER,
  operation             TEXT,
  metadata              TEXT,
  created_at            INTEGER NOT NULL,
  UNIQUE (child_id, role, input_index),
  CHECK (parent_id IS NULL OR parent_id <> child_id),
  CHECK (parent_id IS NULL OR parent_attachment_id IS NULL),
  FOREIGN KEY (child_id)  REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES assets(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_deps_parent ON asset_dependencies(parent_id);
CREATE INDEX IF NOT EXISTS idx_deps_role   ON asset_dependencies(role);
CREATE INDEX IF NOT EXISTS idx_deps_parent_attachment
  ON asset_dependencies(parent_attachment_id) WHERE parent_attachment_id IS NOT NULL;
`,
  },
  {
    version: 2,
    name: "plugin-node-storage",
    sql: `
-- HTML 插件节点的键值存储，按画布节点隔离。值是 JSON 文本；字节数和版本号冗余存一份，
-- 限额检查和"有没有变"不用每次把整张表读出来算。
CREATE TABLE IF NOT EXISTS plugin_node_storage_scopes (
  node_id     TEXT PRIMARY KEY,
  plugin_id   TEXT NOT NULL,
  revision    INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plugin_node_storage_entries (
  node_id     TEXT NOT NULL REFERENCES plugin_node_storage_scopes(node_id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  bytes       INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (node_id, key)
);
`,
  },
];
