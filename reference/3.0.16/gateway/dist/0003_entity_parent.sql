-- ============================================================
-- Migration 0002: extend `asset_dependencies` so a parent edge can point
-- at an asset-center entity attachment instead of a vault asset
-- (ADR-009 v0.6 "pnpm import" semantics — see protocol asset-dependency.ts
-- header and CLAUDE.md "Schema first").
--
-- What changes vs 0001:
--   1. NEW column `parent_attachment_id TEXT` -- asset-center
--      `entity_attachments.id`. No cross-DB FK (asset-center lives in a
--      separate sqlite file at <assetCenterRoot>/meta/asset-center.sqlite).
--      Existence is validated at the application layer.
--   2. NEW CHECK `parent_id IS NULL OR parent_attachment_id IS NULL`
--      so a row carries at most one parent "flavor". Both NULL is still
--      allowed (tombstone for vault parent deletion, etc.).
--   3. NEW index `idx_deps_parent_attachment` (partial — WHERE NOT NULL)
--      so `listChildrenOfAttachment(attachmentId)` lookups are O(log N).
--
-- Why a table rebuild instead of ALTER TABLE:
--   SQLite supports `ALTER TABLE ... ADD COLUMN` but NOT
--   `ALTER TABLE ... ADD CONSTRAINT`. The CHECK constraint is the safety
--   net the application contract relies on (no row may straddle both
--   parent flavors), so we rebuild via the classic 12-step pattern.
--
-- Idempotency:
--   The migration runner records `version = 2` in `schema_version` after
--   this script applies inside a single transaction. Reopening the DB
--   skips the script entirely (see runner.ts).
--
-- Backward compatibility:
--   Existing rows are migrated verbatim with `parent_attachment_id = NULL`.
--   All existing reads / writes against `parent_id` keep working. New
--   callers writing entity-flavored edges (generate.service materialized-
--   input path) set `parent_attachment_id` instead, while existing
--   producers (backfillReferences, recordAsset vault-path inputs) are
--   unaffected.
-- ============================================================

-- Defer FK enforcement to COMMIT. `PRAGMA foreign_keys` is a no-op
-- inside a transaction (SQLite docs); the migration runner wraps every
-- `.sql` file in `db.transaction(...)`, so we use `defer_foreign_keys`
-- which DOES work mid-transaction. This protects against any transient
-- FK appearance during the rebuild (insertion order vs row visibility).
PRAGMA defer_foreign_keys = TRUE;

CREATE TABLE asset_dependencies_new (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id              TEXT NOT NULL,
  parent_id             TEXT,                          -- FK assets(id); NULL after vault parent deletion (ON DELETE SET NULL).
  parent_attachment_id  TEXT,                          -- asset-center entity_attachments.id (cross-DB, NO FK; app-layer validated).
  role                  TEXT NOT NULL REFERENCES asset_role_defs(role),
  input_index           INTEGER,                       -- NULL = order-independent; integer = 0-based array index.
  operation             TEXT,                          -- backend op: 'upscale' | 'inpaint' | 'i2i' | ...
  metadata              TEXT,                          -- JSON: weight / mask region / parent_path redundancy / ...
  created_at            INTEGER NOT NULL,              -- epoch ms

  UNIQUE (child_id, role, input_index),

  -- 0001 invariant: no self-loop edges (UNIQUE doesn't catch (X, X, role-A) +
  -- (X, X, role-B) or NULL input_index dups since SQLite treats NULL as distinct).
  CHECK (parent_id IS NULL OR parent_id <> child_id),

  -- v0.6 invariant: parent flavors are mutually exclusive. Both NULL is
  -- the tombstone case (vault parent deleted via FK SET NULL, or the
  -- caller intentionally wrote a "broken parent" row up front).
  CHECK (parent_id IS NULL OR parent_attachment_id IS NULL),

  FOREIGN KEY (child_id)  REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES assets(id) ON DELETE SET NULL
);

INSERT INTO asset_dependencies_new
  (id, child_id, parent_id, parent_attachment_id, role, input_index, operation, metadata, created_at)
SELECT
  id, child_id, parent_id, NULL, role, input_index, operation, metadata, created_at
FROM asset_dependencies;

DROP TABLE asset_dependencies;
ALTER TABLE asset_dependencies_new RENAME TO asset_dependencies;

-- Re-create the 0001 indexes; SQLite drops them when the underlying
-- table is dropped. Names match 0001_init.sql for grep / explain-plan
-- parity.
CREATE INDEX idx_deps_parent ON asset_dependencies(parent_id);
CREATE INDEX idx_deps_role   ON asset_dependencies(role);

-- v0.6 partial index: only attachment-flavored rows participate, so the
-- reverse lookup ("what vault assets descended from this attachment?")
-- stays O(log N) without bloating the index for the common vault-edge
-- case (parent_attachment_id IS NULL).
CREATE INDEX idx_deps_parent_attachment
  ON asset_dependencies(parent_attachment_id)
  WHERE parent_attachment_id IS NOT NULL;

-- defer_foreign_keys is a one-shot per transaction; it clears itself at
-- COMMIT, so no explicit reset is needed. Adding `PRAGMA foreign_keys =
-- ON` here would be a no-op (already on globally) AND illegal inside the
-- enclosing transaction.
