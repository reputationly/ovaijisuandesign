-- ============================================================
-- Migration 0007: at most one automatic baseline per document
--
-- `origin = 'initial'` is the automatic "document as created" anchor. It
-- is created from two independent places — the creation hooks and the
-- list-time backfill — and the renderer mounts several hooks that call
-- `list()` at once. Concurrent callers each read "no versions yet" and
-- each inserted a baseline, leaving a document with two byte-identical
-- initial rows and a version rail that starts with a duplicate.
--
-- The service now serializes baseline creation per document, but that is
-- a per-process guard. This index is the invariant itself, so no future
-- caller (or second process) can reintroduce the duplicate.
--
-- Existing duplicates collapse onto the EARLIEST row. Dropping the later
-- copies cannot orphan a CAS object: duplicates share the survivor's
-- `content_hash` by construction.
-- ============================================================

-- Anything that chained off a duplicate has to be repointed FIRST.
-- `base_version_id` carries no foreign key, so a dangling id would not
-- raise here — it would surface later as a 404 the first time the user
-- opened the diff for that version.
WITH duplicate_baselines AS (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY asset_id ORDER BY created_at ASC, seq ASC
           ) AS rn
    FROM text_document_versions
    WHERE origin = 'initial'
  )
  WHERE rn > 1
)
UPDATE text_document_versions
SET base_version_id = (
  SELECT survivor.id
  FROM text_document_versions AS survivor
  WHERE survivor.asset_id = text_document_versions.asset_id
    AND survivor.origin = 'initial'
  ORDER BY survivor.created_at ASC, survivor.seq ASC
  LIMIT 1
)
WHERE base_version_id IN (SELECT id FROM duplicate_baselines);

DELETE FROM text_document_versions
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY asset_id ORDER BY created_at ASC, seq ASC
           ) AS rn
    FROM text_document_versions
    WHERE origin = 'initial'
  )
  WHERE rn > 1
);

CREATE UNIQUE INDEX idx_tdv_one_initial
  ON text_document_versions(asset_id)
  WHERE origin = 'initial';
