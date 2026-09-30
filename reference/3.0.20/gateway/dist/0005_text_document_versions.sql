-- ============================================================
-- Migration 0005: text document versions (user-named snapshots)
--
-- The fullscreen text editor lets a user checkpoint a document under a
-- title + note. Those snapshots are DOCUMENT-scoped (`asset_id`), not
-- canvas-node-scoped: the list must survive rename / move and be shared
-- by every node that references the same file.
--
-- Only METADATA lives here. Content is stored content-addressed under
-- `.hilo/text-versions/objects/<hash[0:2]>/<sha256>.<zst|gz>`:
--
--   * a text node's backing file can be tens of MB; 20 revisions of one
--     document inlined as TEXT would turn the hot vault DB into a
--     hundreds-of-MB blob store and slow every asset query with it,
--   * content addressing dedupes byte-identical snapshots (save →
--     restore → save is the common case) for free,
--   * compression happens in a stream, so a 15 MB document never has to
--     be fully buffered on the write path.
--
-- Object lifetime is derived, not tracked: an object is unreferenced
-- once no row carries its `content_hash` (see idx_tdv_hash). Deleting the
-- file is best-effort; orphans are swept lazily and are never fatal.
--
-- `object_state = 'missing'` is the imported-project case where metadata
-- travelled inside `.hilo/index.sqlite` but the object directory did not.
-- The row is deliberately KEPT so the timeline stays readable and the UI
-- can say "content not included in this export" instead of silently
-- dropping the user's history.
--
-- Retention is quota-driven only (count + compressed bytes, oldest
-- unpinned first). It must never be time- or resource-pressure-driven:
-- these rows are explicit user data.
-- ============================================================

CREATE TABLE text_document_versions (
  id              TEXT PRIMARY KEY,
  asset_id        TEXT NOT NULL,
  seq             INTEGER NOT NULL CHECK (seq > 0),
  title           TEXT NOT NULL,
  note            TEXT NOT NULL DEFAULT '',
  note_source     TEXT NOT NULL DEFAULT 'manual'
                    CHECK (note_source IN ('manual', 'ai')),

  -- sha256 of the UNCOMPRESSED content; also the CAS object key.
  content_hash    TEXT NOT NULL CHECK (length(content_hash) = 64),
  content_bytes   INTEGER NOT NULL CHECK (content_bytes >= 0),
  -- Compressed size on disk. 0 when the object is deduped away is NOT
  -- allowed: every row reports the real object size so per-document byte
  -- accounting stays comparable across rows.
  stored_bytes    INTEGER NOT NULL CHECK (stored_bytes >= 0),
  codec           TEXT NOT NULL CHECK (codec IN ('zstd', 'gzip')),
  storage_kind    TEXT NOT NULL DEFAULT 'full'
                    CHECK (storage_kind IN ('full', 'delta')),
  object_state    TEXT NOT NULL DEFAULT 'present'
                    CHECK (object_state IN ('present', 'missing')),

  base_version_id TEXT,
  -- 'initial' rows are created automatically the moment a document comes
  -- into existence (new text node / paste / upload / import) so every
  -- document has a "back to the original" anchor; 'restore' rows are the
  -- automatic pre-restore safety snapshot.
  origin          TEXT NOT NULL DEFAULT 'manual'
                    CHECK (origin IN ('initial', 'manual', 'restore')),

  -- Display / triage only. Never used for lookup: nodes come and go and
  -- paths change, the asset id does not.
  node_id         TEXT,
  rel_path        TEXT,

  pinned          INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  created_at      INTEGER NOT NULL CHECK (created_at >= 0),

  UNIQUE (asset_id, seq),
  CHECK (length(id) > 0),
  CHECK (length(asset_id) > 0),
  CHECK (length(title) > 0)
);

-- Version list for one document, newest first.
CREATE INDEX idx_tdv_asset_created
  ON text_document_versions(asset_id, created_at DESC);

-- Reference lookup for CAS garbage collection.
CREATE INDEX idx_tdv_hash
  ON text_document_versions(content_hash);
