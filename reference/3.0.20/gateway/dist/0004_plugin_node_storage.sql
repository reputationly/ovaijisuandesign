-- ============================================================
-- Migration 0004: workspace-scoped plugin node KV storage
--
-- Plugin iframe state previously lived inside each canvas node's
-- `data.pluginStorage` object. That made a one-key update rewrite the whole
-- canvas document and coupled plugin-state size to canvas persistence. These
-- tables move durability into the existing workspace SQLite while keeping the
-- ownership boundary node-scoped.
--
-- `plugin_node_storage_scopes` owns the node-level identity and monotonic
-- revision used by consumers to order incremental updates. Entries reference
-- their scope with ON DELETE CASCADE so deleting a plugin node can remove its
-- complete KV bucket with one scope DELETE.
--
-- Values are stored as JSON text. `json_valid` rejects bytes that could not be
-- parsed back into the SDK's arbitrary-JSON value contract. `value_bytes` is
-- persisted separately so quota checks do not need to re-encode every value;
-- the application layer remains the source of truth for the byte-count rule.
-- ============================================================

CREATE TABLE plugin_node_storage_scopes (
  node_id     TEXT PRIMARY KEY,
  plugin_id   TEXT NOT NULL,
  revision    INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at  INTEGER NOT NULL CHECK (updated_at >= 0),

  CHECK (length(node_id) > 0),
  CHECK (length(plugin_id) > 0)
);

CREATE INDEX idx_plugin_node_storage_scopes_plugin_id
  ON plugin_node_storage_scopes(plugin_id);

CREATE INDEX idx_plugin_node_storage_scopes_updated_at
  ON plugin_node_storage_scopes(updated_at);

CREATE TABLE plugin_node_storage_entries (
  node_id      TEXT NOT NULL,
  storage_key  TEXT NOT NULL,
  value_json   TEXT NOT NULL CHECK (json_valid(value_json)),
  value_bytes  INTEGER NOT NULL CHECK (value_bytes >= 0),
  updated_at   INTEGER NOT NULL CHECK (updated_at >= 0),

  PRIMARY KEY (node_id, storage_key),
  FOREIGN KEY (node_id)
    REFERENCES plugin_node_storage_scopes(node_id)
    ON DELETE CASCADE,

  CHECK (length(storage_key) > 0)
) WITHOUT ROWID;
