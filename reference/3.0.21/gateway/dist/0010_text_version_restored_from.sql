-- ============================================================
-- Migration 0010: remember WHICH version a pre-restore snapshot came from
--
-- `origin = 'restore'` rows used to be stored with a constant title that
-- the renderer localized ("恢复前的内容" / "Content before restore"). A
-- document with several restores therefore showed the same row title
-- repeated down the whole timeline, and the title said nothing about the
-- version the user had actually restored — the one piece of information
-- that makes the row identifiable.
--
-- The snapshot now stores a REFERENCE to the restored version instead of
-- a frozen string, and the UI derives "还原自 <name>" from it at render
-- time. That is what makes the label follow a later rename of the source
-- version: nothing about the source's name is copied here.
--
-- Nullable and not a foreign key on purpose:
--   * legacy rows (and imported projects) have no reference at all and
--     keep falling back to their stored title / a generic label,
--   * retention can prune the referenced version while this snapshot
--     survives (it may be pinned); a FK would either block the prune or
--     cascade-delete a row that is still the user's only copy of some
--     content. A dangling id is handled in the UI as "source unknown".
--
-- ALTER TABLE ADD COLUMN is enough here: no CHECK / FK / index changes,
-- so the 0006-style table rebuild is unnecessary.
-- ============================================================

ALTER TABLE text_document_versions
  ADD COLUMN restored_from_version_id TEXT;

-- Drop the frozen, machine-written titles from existing restore snapshots so
-- they follow the derived label too. Only the two strings the renderer ever
-- sent are matched: a title the USER typed on such a row is real data and
-- still wins over the derived label.
UPDATE text_document_versions
   SET title = ''
 WHERE origin = 'restore'
   AND title IN ('恢复前的内容', 'Content before restore');
