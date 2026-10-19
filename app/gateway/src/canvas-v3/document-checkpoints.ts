import { randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import path from "node:path";

import { Body, Controller, HttpCode, HttpException, Inject, Post } from "@nestjs/common";
import Database from "better-sqlite3";

import { ProjectQueryError } from "../project-kernel/errors.js";
import { WorkspaceProjectArchitectureService } from "./workspace-project-architecture.service.js";

const SELECT_CHECKPOINT = `SELECT id, resource_id AS resourceId, version_id AS versionId, seq, title, note, pinned, created_at AS createdAt FROM human_document_checkpoints`;

type CheckpointRow = { id: string; resourceId: string; versionId: string; seq: number; title: string; note: string; pinned: number; createdAt: number };

/**
 * 检查点挂在文本文档的某个已就绪版本上。同一版本再存一次只改标题和备注，不另开一条。
 * 本地网关没有云端登录，所以只要求当前进程绑着 v3 工作区。
 */
@Controller("api/v3/canvas")
export class DocumentCheckpointsController {
  constructor(@Inject(WorkspaceProjectArchitectureService) private readonly architecture: WorkspaceProjectArchitectureService) {}

  @Post("document-checkpoints")
  @HttpCode(200)
  execute(@Body() input: unknown) {
    try {
      this.architecture.assertV3();
      if (process.env.HILO_GATEWAY_ROLE !== "workspace" || !process.env.WORKSPACE_DIR) throw new ProjectQueryError("FORBIDDEN", "Workspace required", 403);
      const workspace = realpathSync(process.env.WORKSPACE_DIR);
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new ProjectQueryError("INVALID_ARGUMENT", "Expected object");
      const body = input as Record<string, unknown>;
      const resourceId = identifier(body.resourceId, "resourceId");
      if (typeof body.operation !== "string" || !["list", "get", "save", "update", "remove"].includes(body.operation)) {
        throw new ProjectQueryError("INVALID_ARGUMENT", "Unknown operation");
      }
      if (body.operation === "save") {
        identifier(body.versionId, "versionId");
        if (body.contentRevision !== undefined && (typeof body.contentRevision !== "number" || !Number.isSafeInteger(body.contentRevision) || body.contentRevision < 1)) {
          throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid contentRevision");
        }
      }
      if (["get", "update", "remove"].includes(body.operation)) identifier(body.id, "id");
      for (const key of ["title", "note"] as const) {
        if (body[key] !== undefined && (typeof body[key] !== "string" || body[key].length > 16_000)) throw new ProjectQueryError("INVALID_ARGUMENT", `Invalid ${key}`);
      }
      if (body.pinned !== undefined && typeof body.pinned !== "boolean") throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid pinned");
      const db = new Database(path.join(workspace, ".hilo", "index.sqlite"));
      try {
        db.pragma("foreign_keys = ON");
        db.pragma("busy_timeout = 5000");
        return db.transaction(() => {
          db.exec(`CREATE TABLE IF NOT EXISTS resource_document_versions (
              version_id TEXT PRIMARY KEY,
              content_revision INTEGER
            );
            CREATE TABLE IF NOT EXISTS resource_document_drafts (
              version_id TEXT PRIMARY KEY
            );
            CREATE TABLE IF NOT EXISTS human_document_checkpoints (
              seq INTEGER PRIMARY KEY AUTOINCREMENT,
              id TEXT NOT NULL UNIQUE,
              resource_id TEXT NOT NULL,
              version_id TEXT NOT NULL,
              title TEXT NOT NULL DEFAULT '',
              note TEXT NOT NULL DEFAULT '',
              pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN (0,1)),
              created_at INTEGER NOT NULL,
              UNIQUE(resource_id, version_id),
              FOREIGN KEY(resource_id, version_id) REFERENCES resource_versions(resource_id, version_id) ON DELETE RESTRICT
            );`);
          const resource = db.prepare("SELECT kind, lifecycle FROM resources WHERE resource_id=?").get(resourceId) as { kind: number; lifecycle: string } | undefined;
          if (!resource || resource.kind !== 1 || resource.lifecycle !== "active") throw new ProjectQueryError("NOT_FOUND", "Document unavailable", 404);
          const rows = (sql: string, ...params: unknown[]) => (db.prepare(sql).all(...params) as CheckpointRow[]).map((row) => ({ ...row, pinned: row.pinned === 1 }));
          const assertVersion = (versionId: string) => {
            const version = db.prepare(`SELECT d.content_revision AS contentRevision FROM resource_versions v
              LEFT JOIN resource_document_versions d ON d.version_id=v.version_id
              WHERE v.resource_id=? AND v.version_id=? AND v.status='ready'`).get(resourceId, versionId) as { contentRevision: number | null } | undefined;
            if (!version) throw new ProjectQueryError("NOT_FOUND", "Version unavailable in this document", 404);
            return version;
          };
          if (body.operation === "list") {
            return { checkpoints: rows(`${SELECT_CHECKPOINT} WHERE resource_id=? AND version_id IN (SELECT version_id FROM resource_versions WHERE resource_id=? AND status='ready') ORDER BY seq DESC`, resourceId, resourceId) };
          }
          if (body.operation === "save") {
            const versionId = String(body.versionId);
            const version = assertVersion(versionId);
            if (version.contentRevision !== null && body.contentRevision === undefined) throw new ProjectQueryError("DOCUMENT_REVISION_REQUIRED", "Read the saved document revision before creating a checkpoint.", 409);
            if (body.contentRevision !== undefined && body.contentRevision !== (version.contentRevision ?? 1)) throw new ProjectQueryError("DOCUMENT_REVISION_CONFLICT", "The document changed before its checkpoint was saved; read it again.", 409);
            const existing = rows(`${SELECT_CHECKPOINT} WHERE resource_id=? AND version_id=?`, resourceId, versionId)[0];
            const id = existing?.id ?? randomUUID();
            if (!existing) db.prepare("INSERT INTO human_document_checkpoints(id,resource_id,version_id,title,note,created_at) VALUES(?,?,?,?,?,?)").run(id, resourceId, versionId, body.title ?? "", body.note ?? "", Date.now());
            else db.prepare("UPDATE human_document_checkpoints SET title=?,note=? WHERE resource_id=? AND id=?").run(body.title ?? existing.title, body.note ?? existing.note, resourceId, id);
            db.prepare("DELETE FROM resource_document_drafts WHERE version_id=?").run(versionId);
            return { checkpoints: rows(`${SELECT_CHECKPOINT} WHERE resource_id=? AND id=?`, resourceId, id), deduped: !!existing };
          }
          const id = String(body.id);
          const checkpoint = rows(`${SELECT_CHECKPOINT} WHERE resource_id=? AND id=?`, resourceId, id)[0];
          if (!checkpoint) throw new ProjectQueryError("NOT_FOUND", "Checkpoint unavailable in this document", 404);
          assertVersion(checkpoint.versionId);
          if (body.operation === "remove") {
            db.prepare("DELETE FROM human_document_checkpoints WHERE resource_id=? AND id=?").run(resourceId, id);
            return { checkpoints: [] };
          }
          if (body.operation === "update") {
            db.prepare("UPDATE human_document_checkpoints SET title=?,note=?,pinned=? WHERE resource_id=? AND id=?").run(body.title ?? checkpoint.title, body.note ?? checkpoint.note, Number(body.pinned ?? checkpoint.pinned), resourceId, id);
          }
          return { checkpoints: rows(`${SELECT_CHECKPOINT} WHERE resource_id=? AND id=?`, resourceId, id) };
        }).immediate();
      } finally {
        db.close();
      }
    } catch (error) {
      if (error instanceof ProjectQueryError) {
        throw new HttpException({ error: { code: error.code, message: error.message, retryable: false } }, error.status);
      }
      if (error instanceof HttpException) throw error;
      throw error;
    }
  }
}

function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || value.includes("\0") || value.length > 512) {
    throw new ProjectQueryError("INVALID_ARGUMENT", `${label} must be a non-empty identifier of at most 512 characters`);
  }
  return value;
}
