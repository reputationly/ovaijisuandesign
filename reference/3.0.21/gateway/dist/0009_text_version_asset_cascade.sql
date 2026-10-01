-- ============================================================
-- Migration 0009: text versions die with their document's asset row
--
-- 0005 keyed versions by `asset_id` but never declared the foreign key,
-- so deleting a document left its whole history behind:
--
--   * `VaultRepo.deleteByPath` / `deleteById` (legacy delete path),
--   * `hardDeleteSoftDeletedBefore` (asset-panel delete once the 10s
--     undo window elapses),
--   * the 30-day `status='missing'` sweep,
--
-- all DELETE from `assets` and none of them knew this table existed.
-- The rows stayed forever — invisible (no asset row means no way to
-- reach them through the API) and unbounded, and their CAS objects
-- stayed on disk with them.
--
-- Deliberately scoped to the ASSET, not the canvas node: removing a node
-- from the canvas is undoable and does not delete the document, so a
-- node-scoped cascade would silently destroy history that the file on
-- disk still deserves. Soft delete (ADR-009) only UPDATEs
-- `soft_deleted_at`, so Cmd+Z inside the undo window keeps the history
-- intact; the cascade fires at hard-delete time, which is the point of
-- no return for the document itself.
--
-- Pre-existing orphans (rows whose asset is already gone) are dropped
-- during the rebuild — they are unreachable by construction. Their CAS
-- objects are reclaimed separately by
-- `TextVersionService.sweepOrphanObjects()`, which cannot run inside a
-- SQL migration.
--
-- SQLite cannot add a foreign key to an existing table, so the table is
-- rebuilt (same shape as 0008 plus the FK). All three indexes are
-- recreated, including the partial unique index from 0007.
-- ============================================================

CREATE TABLE text_document_versions_new (
  id              TEXT PRIMARY KEY,
  asset_id        TEXT NOT NULL,
  seq             INTEGER NOT NULL CHECK (seq > 0),
  title           TEXT NOT NULL DEFAULT '',
  note            TEXT NOT NULL DEFAULT '',
  note_source     TEXT NOT NULL DEFAULT 'manual'
                    CHECK (note_source IN ('manual', 'ai')),

  content_hash    TEXT NOT NULL CHECK (length(content_hash) = 64),
  content_bytes   INTEGER NOT NULL CHECK (content_bytes >= 0),
  stored_bytes    INTEGER NOT NULL CHECK (stored_bytes >= 0),
  codec           TEXT NOT NULL CHECK (codec IN ('zstd', 'gzip')),
  storage_kind    TEXT NOT NULL DEFAULT 'full'
                    CHECK (storage_kind IN ('full', 'delta')),
  object_state    TEXT NOT NULL DEFAULT 'present'
                    CHECK (object_state IN ('present', 'missing')),

  base_version_id TEXT,
  origin          TEXT NOT NULL DEFAULT 'manual'
                    CHECK (origin IN ('initial', 'manual', 'restore', 'agent')),

  node_id         TEXT,
  rel_path        TEXT,

  pinned          INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  created_at      INTEGER NOT NULL CHECK (created_at >= 0),

  UNIQUE (asset_id, seq),
  CHECK (length(id) > 0),
  CHECK (length(asset_id) > 0),

  -- The whole point of this migration. ON DELETE CASCADE rather than a
  -- gateway-side purge because the delete paths are plural and keep
  -- growing; enumerating them in TypeScript is how this table became an
  -- orphan farm in the first place.
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- `WHERE asset_id IN (SELECT id FROM assets)` drops the pre-existing
-- orphans. Without it the copy itself would fail the new FK.
INSERT INTO text_document_versions_new (
  id, asset_id, seq, title, note, note_source, content_hash, content_bytes,
  stored_bytes, codec, storage_kind, object_state, base_version_id, origin,
  node_id, rel_path, pinned, created_at
)
SELECT
  id, asset_id, seq, title, note, note_source, content_hash, content_bytes,
  stored_bytes, codec, storage_kind, object_state, base_version_id, origin,
  node_id, rel_path, pinned, created_at
FROM text_document_versions
WHERE asset_id IN (SELECT id FROM assets);

DROP TABLE text_document_versions;

ALTER TABLE text_document_versions_new RENAME TO text_document_versions;

CREATE INDEX idx_tdv_asset_created
  ON text_document_versions(asset_id, created_at DESC);

CREATE INDEX idx_tdv_hash
  ON text_document_versions(content_hash);

-- Re-established from 0007: at most one automatic baseline per document.
CREATE UNIQUE INDEX idx_tdv_one_initial
  ON text_document_versions(asset_id)
  WHERE origin = 'initial';
