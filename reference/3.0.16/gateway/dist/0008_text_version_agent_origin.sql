-- ============================================================
-- Migration 0008: `origin = 'agent'` for automatic pre-edit snapshots
--
-- Agent text edits (`hub_canvas_apply_text_edits` and the diff-review
-- branch of `canvas_write_node`) write the document straight to disk and
-- only then open a review session. Accepting a review is a no-op on the
-- file, so once the review is resolved the pre-Agent bytes are gone: the
-- editor's native undo stack is per-window and dies with it.
--
-- The gateway therefore snapshots the CURRENT content right before an
-- Agent rewrite lands. That row is neither `manual` (the user did not ask
-- for it), nor `initial` (the document already had a baseline), nor
-- `restore` (nothing is being restored) — hence a fourth origin.
--
-- Retention treats `agent` rows as the cheapest to lose: they are evicted
-- before any user-authored version (see TextVersionService.pruneDocument).
-- Storage-wise they are nearly free — the CAS dedupes an unchanged
-- document to the object an earlier version already wrote.
--
-- SQLite cannot alter a table-level CHECK, so the table is rebuilt (same
-- shape as 0006 plus the widened origin CHECK). Rows are copied verbatim;
-- all three indexes are recreated, including the partial unique index
-- from 0007 that the rebuild drops with the table.
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
  CHECK (length(asset_id) > 0)
);

INSERT INTO text_document_versions_new (
  id, asset_id, seq, title, note, note_source, content_hash, content_bytes,
  stored_bytes, codec, storage_kind, object_state, base_version_id, origin,
  node_id, rel_path, pinned, created_at
)
SELECT
  id, asset_id, seq, title, note, note_source, content_hash, content_bytes,
  stored_bytes, codec, storage_kind, object_state, base_version_id, origin,
  node_id, rel_path, pinned, created_at
FROM text_document_versions;

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
