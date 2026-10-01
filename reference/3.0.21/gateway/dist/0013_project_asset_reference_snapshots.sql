-- Durable mapping from a watcher-ignored Project asset anchor to the ordinary
-- workspace asset snapshot used by Canvas generations.
--
-- The anchor remains under `.hilo/project-assets/` so "Add to Agent" never
-- creates a Canvas node. Once a generation actually consumes that anchor, the
-- Gateway copies its bytes to a collision-free name in the workspace root and
-- records the stable vault asset id here. Content hash makes repeated use idempotent while keeping
-- older generated canvases pinned to the exact bytes they referenced.

CREATE TABLE project_asset_reference_snapshots (
  anchor_rel_path  TEXT NOT NULL,
  source_hash      TEXT NOT NULL,
  asset_id         TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  source_dev_id    INTEGER,
  source_inode     INTEGER,
  source_size      INTEGER NOT NULL CHECK (source_size >= 0),
  source_mtime_ms  INTEGER NOT NULL CHECK (source_mtime_ms >= 0),
  created_at       INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at       INTEGER NOT NULL CHECK (updated_at >= 0),

  PRIMARY KEY (anchor_rel_path, source_hash),
  UNIQUE (asset_id),
  CHECK (length(anchor_rel_path) > 0),
  CHECK (length(source_hash) > 0)
);

CREATE INDEX idx_project_asset_reference_snapshots_anchor_updated
  ON project_asset_reference_snapshots(anchor_rel_path, updated_at DESC);
