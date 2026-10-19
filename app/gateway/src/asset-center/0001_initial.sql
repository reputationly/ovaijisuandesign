-- ============================================================
-- Migration 0001: initial schema for @hilo/asset-center (ADR-009 §6, v0.7 终态).
--
-- This is the ONLY migration; the entire target-state schema lives here.
-- Asset Center has NOT shipped yet (origin/main has no asset-center package),
-- so the initial schema is rewritten in place rather than layering 0002+ on
-- top. The earlier v0.6 `0002_simplify.sql` was squashed back into this file
-- (see ADR-009 v0.7 修订) — no production DB ever ran the two-step form, so the
-- intermediate v0.5 shape (entity_versions / current_version_id / refs.mode)
-- has no semantic place and is simply absent here.
--
-- Further schema changes MUST go into 0002+. The runner validates both the
-- recorded version/name identity and the terminal 0001 table shape, so a
-- rewritten or branch-reused version fails closed instead of being skipped.
--
-- Schema covers (4 core tables — v0.6 dropped entity_versions; v0.8 dropped libraries):
--   * entities               -- Entity 主表 (单表 + type 多态; 附件直接挂 entity; 全局单一, 无 library 容器)
--   * entity_attachments     -- 附件清单 (FK -> entities.id, 不再经 version)
--   * workspace_entity_refs  -- Workspace 引用 Entity (不是 entity 之间关系图; 后者是 V3)
--   * entity_suggestions     -- Agent 建议草稿区 (决策 #4: Agent 不能直接写 entities)
--
-- All IDs are UUIDv7 (string, 36 chars). All timestamps are Unix ms.
-- ============================================================

-- ── entities ────────────────────────────────────────────────
-- 单表 + type ENUM 多态。description 是 top-level 字段 (客观描述, agent + 用户可见, 参与 LIKE 索引 search);
-- 用户私人备注 (userNotes) 不在 schema 里 — 见 ADR-009 §10 anti-pattern。
-- type ENUM: character/scene/style_pack/prop/custom (5 类). prop(道具) 是 v0.5 之后
--   补加的正式 type (protocol ENTITY_TYPES SSOT 已含); CHECK 与之对齐。详见 ADR-009 v0.7。
-- v0.6: 无 entity_versions 表、无 current_version_id — 附件直接挂 entity (见 entity_attachments)。
-- v0.8: 无 library_id — 资产中心全局单一, entity 直接挂全局 (删 libraries 表)。
CREATE TABLE IF NOT EXISTS entities (
  id                  TEXT PRIMARY KEY,     -- UUID v7
  type                TEXT NOT NULL CHECK (type IN ('character', 'scene', 'style_pack', 'prop', 'custom')),
  name                TEXT NOT NULL,        -- 业务名 (用户可见、mutable)
  description         TEXT NOT NULL DEFAULT '',  -- 客观描述 (参与 search), 不是用户私人备注
  schema_json         TEXT NOT NULL DEFAULT '{}',  -- typed slots (front/face/outfit 等)
  metadata_json       TEXT NOT NULL DEFAULT '{}',  -- tags / provenance (entity 整体级)
  use_count           INTEGER NOT NULL DEFAULT 0,  -- materialize 计数器 (UI 排序 "使用次数"; ADR-009 v0.5)
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL,
  deleted_at          INTEGER,              -- soft delete (回收站)
  recycled_at         INTEGER,              -- 永久删除时间戳 (从回收站清空)
  embedding           BLOB                  -- V4 预留; MVP 写 NULL
);

CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_entities_recycle ON entities(recycled_at)
  WHERE recycled_at IS NOT NULL;
-- 支持 use_count DESC 排序 (列表分页时频繁用; 单库 entity 量级 < 1k, 索引开销可忽略)
CREATE INDEX IF NOT EXISTS idx_entities_use_count ON entities(use_count DESC)
  WHERE deleted_at IS NULL;

-- ── entity_attachments ──────────────────────────────────────
-- v0.6: 附件直接 FK 到 entities.id (不再经 entity_versions)。
-- blob_path 是 `attachments/<attachment_id>.<ext>` (v0.6 起不再 content-addressed sha256 分桶; v0.8 去 libraries/<lid> 前缀)。
-- original_filename 是 top-level (参与 LIKE 索引 search), 而非塞在 meta_json 里 — 见 ADR-009 §10。
-- meta_json 装 caption(user_desc) / tags / prompt (per-file; v0.7 AttachmentMeta 3 字段)。
CREATE TABLE IF NOT EXISTS entity_attachments (
  id                 TEXT PRIMARY KEY,      -- UUID v7
  entity_id          TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  kind               TEXT NOT NULL CHECK (kind IN ('image', 'video', 'audio', 'text', 'document')),
  blob_path          TEXT NOT NULL,         -- attachments/<attachment_id>.<ext> (L0 pool, 平铺)
  original_filename  TEXT NOT NULL,         -- 用户上传时的原始文件名 (LIKE 索引参与 search)
  byte_size          INTEGER NOT NULL,
  ord                INTEGER NOT NULL DEFAULT 0,
  meta_json          TEXT NOT NULL DEFAULT '{}'  -- user_desc / tags / prompt (per-file)
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity ON entity_attachments(entity_id, ord);

-- ── workspace_entity_refs ───────────────────────────────────
-- Workspace -> Entity 引用 (不是 entity 之间关系图, 那是 V3 entity_relations)。
-- workspace_path 直接用 RecentWorkspaceEntry.path 一致的绝对路径 (V1 单机本地, 不引入 workspace_id)。
-- v0.6: refs 总是跟随 entity 当前附件集 — 无 mode / version_pin。
CREATE TABLE IF NOT EXISTS workspace_entity_refs (
  workspace_path    TEXT NOT NULL,            -- workspace 绝对路径
  entity_id         TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  materialize_path  TEXT NOT NULL,            -- workspace 内的 .hilo/materialized-entities/<eid>/
  materialized_at   INTEGER NOT NULL,
  PRIMARY KEY (workspace_path, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_refs_entity ON workspace_entity_refs(entity_id);

-- ── entity_suggestions ──────────────────────────────────────
-- 决策 #4: Agent 不能直接写 entities, 只能在这里建草稿等用户 approve。
-- batch_ai_onboarding 也走这张表 (一次性建出多个 suggestion 让用户审)。
CREATE TABLE IF NOT EXISTS entity_suggestions (
  id                    TEXT PRIMARY KEY,   -- UUID v7
  suggested_json        TEXT NOT NULL,      -- {type, name, schema, attachments_refs}
  source                TEXT NOT NULL CHECK (source IN ('chat', 'batch_ai_onboarding')),
  source_chat_id        TEXT,               -- UI session id (引用; 审计字段)
  source_agent_call_id  TEXT,               -- OpenCode runtime call id (引用; 审计字段)
  status                TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  created_at            INTEGER NOT NULL,
  resolved_at           INTEGER,
  resolved_entity_id    TEXT REFERENCES entities(id)
);

CREATE INDEX IF NOT EXISTS idx_suggestions_pending ON entity_suggestions(created_at DESC)
  WHERE status = 'pending';
