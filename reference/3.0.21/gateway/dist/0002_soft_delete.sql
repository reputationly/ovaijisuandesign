-- 0002_soft_delete.sql
--
-- Soft-delete column for asset-panel undo (ADR-009).
--
-- After user clicks delete in the asset panel, the gateway sets
-- `soft_deleted_at` to the current epoch ms instead of issuing
-- DELETE. The 10s undo window keeps the row alive (with the file
-- buffered in `<workspace>/.hilo/trash/<uuid>/<basename>`) so:
--   * Cmd+Z within 10s clears `soft_deleted_at` back to NULL — the
--     row never lost identity, asset_id and asset_dependencies
--     edges stay intact (no ON DELETE CASCADE fires on UPDATE).
--   * After 10s the gateway issues a real DELETE (via `deleteByApi`)
--     and shell.trashItem promotes the buffered file to OS trash.
--
-- Read-path semantics (enforced in vault-repo SQL, not via column
-- defaults so existing query call sites stay explicit about
-- whether they want soft-deleted rows):
--   * Path / list / inode / hash-match queries filter
--     `soft_deleted_at IS NULL` — the asset panel and discovery
--     paths must hide the soft-deleted row.
--   * By-id queries DO NOT filter — canvas / chat references that
--     hold an asset_id need to keep resolving during the 10s
--     window so backgrounded operations (chat agent generating,
--     canvas rendering) don't break on a delete the user might
--     immediately undo. Once the row is hard-deleted at t=10s,
--     those references resolve to "missing" naturally.
--
-- A partial index on the column accelerates the GC sweep
-- (`DELETE FROM assets WHERE soft_deleted_at IS NOT NULL AND
-- soft_deleted_at < ?`) without bloating the index for the common
-- case (rows with NULL aren't indexed).

ALTER TABLE assets ADD COLUMN soft_deleted_at INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_assets_soft_deleted_at
  ON assets (soft_deleted_at)
  WHERE soft_deleted_at IS NOT NULL;
