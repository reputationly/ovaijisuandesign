-- ============================================================
-- Migration 0006: text version titles become optional
--
-- 0005 created `text_document_versions` with `CHECK (length(title) > 0)`
-- because every version was born with a generated `<filename>(N)` title.
-- That default was removed: a single document's history then read as the
-- same filename repeated on every row, with the only distinguishing
-- character at the end where list truncation eats it first.
--
-- Saving is now one click and stores NO title; the client labels an
-- unnamed row by its position ("version 3") and the user can name it
-- afterwards. An empty title is therefore a valid, meaningful value and
-- the CHECK has to go.
--
-- SQLite cannot drop a table-level CHECK, so the table is rebuilt.
-- Existing rows are copied verbatim: their generated titles are real
-- stored data now and are NOT rewritten. Only new saves are unnamed.
-- ============================================================

CREATE TABLE text_document_versions_new (
  id              TEXT PRIMARY KEY,
  asset_id        TEXT NOT NULL,
  seq             INTEGER NOT NULL CHECK (seq > 0),
  -- No length CHECK: '' means "unnamed", rendered as a positional label.
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
                    CHECK (origin IN ('initial', 'manual', 'restore')),

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

-- Indexes live on the table, so the rebuild dropped them with it.
CREATE INDEX idx_tdv_asset_created
  ON text_document_versions(asset_id, created_at DESC);

CREATE INDEX idx_tdv_hash
  ON text_document_versions(content_hash);
