-- ============================================================
-- Migration 0001: initial schema (single dump for first-time SQLite introduction)
--
-- This branch is the first introduction of SQLite to Hub's asset system.
-- There is no prior production schema to migrate from, so the entire
-- target-state schema lives in one CREATE TABLE script. Subsequent
-- migrations should only be added when a deployed schema needs to evolve.
--
-- Schema covers:
--   * assets             -- vault index (id, path, status, fingerprint, business
--                           fields, missing-asset candidate columns)
--   * workspace_meta     -- key/value store for workspace-level metadata
--   * reconcile_lock     -- single-row coordination lock for startup reconcile
--   * asset_role_defs    -- role lookup table (replaces CHECK enum, ADR-005)
--   * asset_dependencies -- merged Lineage + Reference (sparse table, ADR-005)
--
-- Notes:
--   * NO "type" / "category" column on assets. Business category is derived
--     from mime_type by an application-layer helper (getAssetCategory).
--   * NO asset_attribution table. Attribution (asset -> session) is Deferred
--     to Future Work (ADR-005 §"asset_attribution"). Activation will land
--     in a separate migration once the attribution feature ships.
--   * NO idx_deps_child on asset_dependencies. The UNIQUE
--     (child_id, role, input_index) constraint already provides a usable
--     child_id-prefix index.
--   * candidate_asset_id / candidate_path on assets exist for the
--     row-inline merge UI (ADR-004 Phase 4); both are NULL for normal
--     status='active' rows.
-- ============================================================

CREATE TABLE IF NOT EXISTS assets (
  id                  TEXT PRIMARY KEY,                  -- UUID, stable for the lifetime of the workspace
  path                TEXT NOT NULL UNIQUE,              -- workspace-relative path (mutable, rebound by reconcile)
  status              TEXT NOT NULL DEFAULT 'active',    -- 'active' | 'missing' (greyed for 30d before GC)
  size                INTEGER NOT NULL,                  -- bytes
  mtime_ms            INTEGER NOT NULL,                  -- epoch ms; ms (not ns) keeps INTEGER -> JS Number safe to ~285000y
  dev_id              INTEGER,                           -- fs.stat().dev   -- Tier 1.5 hashtable key
  inode               INTEGER,                           -- fs.stat().ino   -- Tier 1.5 hashtable key
  birthtime_ms        INTEGER,                           -- fs.stat().birthtimeMs; anti-collision check (Linux old kernels: NULL -> fallback to size+mtime_ms)
  quick_hash          TEXT,                              -- xxh3(first 4MB), Tier 2 candidate matching
  full_hash           TEXT,                              -- xxh3(entire file), lazy on quick_hash conflict / full-disk recovery

  -- Business fields (NULLABLE; semantics see ADR-004 §"Layer 2: Identity & Metadata")
  width               INTEGER,                           -- image / video pixel width
  height              INTEGER,                           -- image / video pixel height
  duration_ms         INTEGER,                           -- video / audio duration in ms
  mime_type           TEXT,                              -- IANA standard (image/png, video/mp4, application/json, ...)

  name                TEXT NOT NULL,                     -- basename (e.g. 'hero.png')
  metadata            TEXT,                              -- JSON: backend-specific params (prompt, seed, sampler, ...)
  created_at          INTEGER NOT NULL,                  -- epoch ms
  updated_at          INTEGER NOT NULL,                  -- epoch ms

  -- Missing-asset candidate columns (ADR-004 Phase 4 row-inline merge UI):
  --   candidate_asset_id -- the active asset whose hash+size matches a
  --                         missing row's previous fingerprint. ON DELETE
  --                         SET NULL keeps the missing row pointing at
  --                         "no candidate" if the candidate is deleted
  --                         between reconcile runs.
  --   candidate_path     -- redundancy field so UI can show the candidate's
  --                         workspace-relative path even when its row was
  --                         concurrently moved.
  -- Both NULL for normal status='active' rows. Only set by reconcile.ts
  -- Phase 4 / AssetsService.markCandidate.
  candidate_asset_id  TEXT REFERENCES assets(id) ON DELETE SET NULL,
  candidate_path      TEXT
);

CREATE INDEX IF NOT EXISTS idx_assets_quick_hash      ON assets(quick_hash);
CREATE INDEX IF NOT EXISTS idx_assets_size_quick      ON assets(size, quick_hash);
CREATE INDEX IF NOT EXISTS idx_assets_mime_type       ON assets(mime_type);
CREATE INDEX IF NOT EXISTS idx_assets_created_at      ON assets(created_at);
CREATE INDEX IF NOT EXISTS idx_assets_status          ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_dev_inode       ON assets(dev_id, inode);
CREATE INDEX IF NOT EXISTS idx_assets_status_updated  ON assets(status, updated_at);

CREATE TABLE IF NOT EXISTS workspace_meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Single-row table; gateway_id identifies the holder. started_at older than
-- the stale threshold (60s, see reconcile-lock.ts) is treated as a crashed
-- gateway and forcibly cleared.
--
-- gateway_id is PRIMARY KEY so concurrent INSERT attempts from the same
-- gateway collapse via UNIQUE-conflict instead of leaving multiple rows
-- behind. ReconcileLock.acquire() runs DELETE-then-INSERT inside a
-- transaction; with no PK, a multi-instance race could land two rows
-- before the next acquire() observes them, defeating the single-holder
-- contract documented above.
CREATE TABLE IF NOT EXISTS reconcile_lock (
  gateway_id  TEXT NOT NULL PRIMARY KEY,
  started_at  INTEGER NOT NULL
);

-- ------------------------------------------------------------
-- Layer 3: relationships (ADR-005 §"Schema 设计")
--
-- Why a lookup table for role (not CHECK):
--   ALTER CHECK in SQLite requires rebuilding the entire table; a lookup
--   table + FK lets adding a role degrade to a single INSERT with zero
--   locking. See ADR-005 §"Role Enum -- TS enum + lookup 表 + FK 三层校验".
--
-- Why a surrogate `id` on asset_dependencies:
--   A composite PK on (child, parent, role) would conflict with
--   FOREIGN KEY (parent_id) ... ON DELETE SET NULL because PK columns are
--   implicitly NOT NULL. Surrogate id sidesteps this.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS asset_role_defs (
  role          TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL,
  description   TEXT,
  deprecated    INTEGER NOT NULL DEFAULT 0,        -- 0 = active, 1 = soft-deprecated
  created_at    INTEGER NOT NULL                   -- epoch ms
);

CREATE TABLE IF NOT EXISTS asset_dependencies (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,  -- surrogate; avoids composite-PK + FK SET NULL conflict
  child_id     TEXT NOT NULL,
  parent_id    TEXT,                               -- nullable: kept after parent deletion (ON DELETE SET NULL)
  role         TEXT NOT NULL REFERENCES asset_role_defs(role),
  input_index  INTEGER,                            -- NULL = order-independent; integer = array index (0-based)
  operation    TEXT,                               -- backend op: 'upscale' | 'inpaint' | 'i2i' | ...
  metadata     TEXT,                               -- JSON: weight / mask region / parent_path redundancy / ...
  created_at   INTEGER NOT NULL,                   -- epoch ms

  -- input_index is locally unique per (child_id, role). SQLite treats NULL as
  -- a distinct value in UNIQUE indexes, so multiple rows with input_index NULL
  -- on the same (child_id, role) are allowed (order-independent fan-in).
  UNIQUE (child_id, role, input_index),

  -- ADR-005 follow-up : forbid self-referential dependency edges.
  -- UNIQUE (child_id, role, input_index) doesn't catch (X, X, role-A) +
  -- (X, X, role-B), nor two (X, X, source, NULL) rows since SQLite treats
  -- NULL as distinct in UNIQUE indexes. Schema-level CHECK is the backstop
  -- for buggy backends or future MCP callers; the service layer also
  -- throws BadRequestException early so users get a friendly 400.
  CHECK (parent_id IS NULL OR parent_id <> child_id),

  FOREIGN KEY (child_id)  REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES assets(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_deps_parent ON asset_dependencies(parent_id);
CREATE INDEX IF NOT EXISTS idx_deps_role   ON asset_dependencies(role);
