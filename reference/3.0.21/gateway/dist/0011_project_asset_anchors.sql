-- ============================================================
-- Migration 0011: project-asset anchor ledger
-- legacy-schema-adoption: project_asset_anchors
--
-- Records every hard-link (or copy-fallback) anchor created under
-- `.hilo/project-assets/` for the "项目资产添加到 chat" flow, so the
-- write side (ProjectAssetsService in Electron main) can propagate
-- content replacement (re-link to the new inode) and deletion (unlink
-- the anchor) to this workspace. Without this table the filesystem has
-- no reverse pointer from a source file to its anchors — hard links
-- share an inode but store no referrer list.
--
-- Columns:
--   anchor_rel_path  POSIX path relative to the workspace root, e.g.
--                    '.hilo/project-assets/主角三视图.png'. PRIMARY KEY —
--                    one ledger row per on-disk anchor.
--   asset_id         Project-asset index id (cloud snowflake / local
--                    UUID) from `<project>/.hilo/project-assets.sqlite`.
--   project_folder   Project folder NAME under the Projects root (never
--                    an absolute path — survives HILO_DATA_DIR moves).
--   source_rel_path  Last-KNOWN source relPath under `.assets/` at the
--                    time of the latest anchor/relink. Diagnostic +
--                    reconcile fallback only: renames/moves do NOT
--                    update it (fs.rename keeps the inode, links stay
--                    valid), so treat as possibly stale; the index db
--                    is the authority for the current location.
--   src_ino / src_size / src_mtime_ms
--                    Identity snapshot of the source at link time.
--                    ino matching detects content replacement for the
--                    hardlink mode; size+mtime is the fallback identity
--                    for the copy mode (cross-volume anchors).
--   link_mode        'hardlink' | 'copy' — how the anchor was produced.
--   created_at / updated_at   Unix ms.
--
-- UNIQUE(asset_id, project_folder): one anchor per asset per workspace —
-- re-anchoring refreshes the existing path (stable chat de-dupe) instead
-- of minting "(1)" suffixed siblings.
-- ============================================================

CREATE TABLE project_asset_anchors (
  anchor_rel_path TEXT PRIMARY KEY,
  asset_id        TEXT NOT NULL,
  project_folder  TEXT NOT NULL,
  source_rel_path TEXT NOT NULL,
  src_ino         INTEGER,
  src_size        INTEGER,
  src_mtime_ms    INTEGER,
  link_mode       TEXT NOT NULL DEFAULT 'hardlink' CHECK (link_mode IN ('hardlink', 'copy')),
  created_at      INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at      INTEGER NOT NULL CHECK (updated_at >= 0),

  CHECK (length(anchor_rel_path) > 0),
  CHECK (length(asset_id) > 0),
  CHECK (length(project_folder) > 0)
);

CREATE UNIQUE INDEX idx_project_asset_anchors_identity
  ON project_asset_anchors(asset_id, project_folder);
