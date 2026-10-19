import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync } from "node:fs";
import path from "node:path";

import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { HttpException } from "@nestjs/common";
import Database from "better-sqlite3";

import { canvasV3Error, canvasV3StorageError, invalidCanvasV3Command } from "./errors.js";
import { CANVAS_V3_LEGACY_FORMAT, type CanvasV3Document, type CanvasV3Patch, applyCanvasV3Patch, createEmptyCanvasV3Document, parseCanvasV3Document } from "./protocol.js";

const APPLICATION_ID = 1212372531;
const USER_VERSION = 2;
const DOCUMENT_TABLE = "CREATE TABLE document (id INTEGER PRIMARY KEY CHECK (id = 1), json TEXT NOT NULL)";
const RECEIPTS_TABLE = "CREATE TABLE receipts (command_id TEXT PRIMARY KEY, request_hash TEXT NOT NULL, applied_revision INTEGER NOT NULL, effects_json TEXT NOT NULL)";

export function canvasV3CanonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canvasV3CanonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value as object).sort().map((key) => `${JSON.stringify(key)}:${canvasV3CanonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function canvasV3RequestHash(request: unknown): string {
  return createHash("sha256").update(canvasV3CanonicalJson(request)).digest("hex");
}

function legacyCanvasV3Error(): HttpException {
  return canvasV3Error(409, CANVAS_V3_LEGACY_FORMAT, "Canvas V3 test data uses a retired node format; reset this development project.");
}

export interface CanvasV3CommandRequest {
  commandId: string;
  expectedRevision: number;
  command: unknown;
}

export interface CanvasV3CommandReceipt {
  commandId: string;
  appliedRevision: number;
  document: CanvasV3Document;
  replayed: boolean;
  effects: unknown;
}

type ReceiptRow = { command_id: string; request_hash: string; applied_revision: number; effects_json: string };

@Injectable()
export class CanvasV3Store implements OnModuleDestroy {
  private closed = false;
  private failed = false;
  private db?: Database.Database;
  private workspace?: string;

  read(workspace: string): CanvasV3Document {
    return this.access(workspace, () => this.readDocument(this.open(workspace)));
  }

  hasDocument(workspace: string): boolean {
    return existsSync(this.filename(workspace));
  }

  prepare(workspace: string, request: CanvasV3CommandRequest): CanvasV3CommandReceipt | undefined {
    return this.access(workspace, () => {
      if (!this.db && !existsSync(this.filename(workspace))) {
        this.assertRevision(createEmptyCanvasV3Document(), request);
        return undefined;
      }
      const db = this.open(workspace);
      const document = this.readDocument(db);
      const previous = this.receipt(db, request);
      if (previous) return previous(document);
      this.assertRevision(document, request);
      return undefined;
    });
  }

  execute(workspace: string, request: CanvasV3CommandRequest, patch: CanvasV3Patch, effects: unknown): CanvasV3CommandReceipt {
    return this.access(workspace, () => {
      const db = this.open(workspace);
      const hash = canvasV3RequestHash(request);
      return db.transaction(() => {
        const document = this.readDocument(db);
        const previous = this.receipt(db, request);
        if (previous) return previous(document);
        this.assertRevision(document, request);
        let next: CanvasV3Document;
        try {
          next = applyCanvasV3Patch(document, patch, true);
        } catch {
          throw invalidCanvasV3Command();
        }
        const effectsJson = JSON.stringify(effects);
        db.prepare("UPDATE document SET json = ? WHERE id = 1").run(JSON.stringify(next));
        db.prepare("INSERT INTO receipts VALUES (?, ?, ?, ?)").run(request.commandId, hash, next.revision, effectsJson);
        return {
          commandId: request.commandId,
          appliedRevision: next.revision,
          document: next,
          replayed: false,
          effects: JSON.parse(effectsJson),
        };
      }).immediate();
    });
  }

  onModuleDestroy(): void {
    this.closed = true;
    this.db?.close();
    this.db = undefined;
  }

  private receipt(db: Database.Database, request: CanvasV3CommandRequest): ((document: CanvasV3Document) => CanvasV3CommandReceipt) | undefined {
    const previous = db.prepare("SELECT * FROM receipts WHERE command_id = ?").get(request.commandId) as ReceiptRow | undefined;
    if (!previous) return undefined;
    if (previous.request_hash !== canvasV3RequestHash(request)) {
      throw canvasV3Error(409, "CANVAS_V3_COMMAND_ID_REUSED", "Command ID was already used for another request.");
    }
    return (document) => {
      this.validateReceipt(previous, document);
      return {
        commandId: request.commandId,
        appliedRevision: previous.applied_revision,
        document,
        replayed: true,
        effects: JSON.parse(previous.effects_json),
      };
    };
  }

  private assertRevision(document: CanvasV3Document, request: CanvasV3CommandRequest): void {
    if (request.expectedRevision !== document.revision) throw canvasV3Error(409, "CANVAS_V3_REVISION_CONFLICT", "Canvas revision has changed.");
  }

  private filename(workspace: string): string {
    return path.join(workspace, ".hilo", "canvas-v3", "state.sqlite");
  }

  private access<T>(workspace: string, task: () => T): T {
    if (this.closed || this.failed) throw canvasV3StorageError();
    const normalized = path.resolve(workspace);
    if (this.workspace && this.workspace !== normalized) throw canvasV3Error(409, "CANVAS_V3_WORKSPACE_MISMATCH", "Canvas belongs to another workspace.");
    this.workspace = normalized;
    try {
      return task();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.failed = true;
      this.db?.close();
      this.db = undefined;
      throw canvasV3StorageError();
    }
  }

  private open(workspace: string): Database.Database {
    if (this.db) return this.db;
    const filename = this.filename(workspace);
    for (const [entry, directory] of [
      [path.join(workspace, ".hilo"), true],
      [path.dirname(filename), true],
      [filename, false],
      [`${filename}-journal`, false],
      [`${filename}-wal`, false],
      [`${filename}-shm`, false],
    ] as const) {
      let stat: ReturnType<typeof lstatSync>;
      try {
        stat = lstatSync(entry);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw error;
      }
      if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile())) {
        throw new Error("Canvas storage path is not an owned regular path");
      }
    }
    const existing = existsSync(filename);
    if (!existing) mkdirSync(path.dirname(filename), { recursive: true });
    const db = new Database(filename, { timeout: 1000, fileMustExist: existing });
    this.db = db;
    if (!existing) {
      db.transaction(() => {
        db.exec(DOCUMENT_TABLE);
        db.exec(RECEIPTS_TABLE);
        db.prepare("INSERT INTO document VALUES (1, ?)").run(JSON.stringify(createEmptyCanvasV3Document()));
        db.pragma(`application_id = ${APPLICATION_ID}`);
        db.pragma(`user_version = ${USER_VERSION}`);
      }).immediate();
    }
    if (db.pragma("application_id", { simple: true }) === APPLICATION_ID && db.pragma("user_version", { simple: true }) === 1) {
      this.db = undefined;
      db.close();
      throw legacyCanvasV3Error();
    }
    db.transaction(() => {
      if (db.pragma("application_id", { simple: true }) !== APPLICATION_ID || db.pragma("user_version", { simple: true }) !== USER_VERSION || db.pragma("quick_check", { simple: true }) !== "ok") {
        throw new Error("Invalid store");
      }
      const schema = db.prepare("SELECT name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string; sql: string }[];
      if (schema.length !== 2 || schema[0]?.sql !== DOCUMENT_TABLE || schema[1]?.sql !== RECEIPTS_TABLE) throw new Error("Unknown schema");
      const document = this.readDocument(db);
      const receipts = db.prepare("SELECT * FROM receipts").all() as ReceiptRow[];
      const revisions = new Set<number>();
      for (const receipt of receipts) {
        this.validateReceipt(receipt, document);
        revisions.add(receipt.applied_revision);
      }
      if (receipts.length !== document.revision || revisions.size !== receipts.length) throw new Error("Incomplete receipt history");
    })();
    return db;
  }

  private readDocument(db: Database.Database): CanvasV3Document {
    const rows = db.prepare("SELECT * FROM document").all() as { id: number; json: string }[];
    if (rows.length !== 1 || rows[0]?.id !== 1) throw new Error("Missing document");
    try {
      const stored = JSON.parse(rows[0].json) as { nodes?: Record<string, { kind?: string; project?: unknown; scene?: unknown }> };
      if (stored && typeof stored === "object" && stored.nodes && typeof stored.nodes === "object" && !Array.isArray(stored.nodes)) {
        for (const entry of Object.values(stored.nodes)) {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
          if (entry.kind === "clip-studio" && entry.project === null) delete entry.project;
          if (entry.kind === "director-stage" && entry.scene === null) delete entry.scene;
        }
      }
      return parseCanvasV3Document(stored);
    } catch (error) {
      if (error instanceof Error && error.message.includes(CANVAS_V3_LEGACY_FORMAT)) throw legacyCanvasV3Error();
      throw error;
    }
  }

  private validateReceipt(receipt: ReceiptRow, document: CanvasV3Document): void {
    if (
      typeof receipt.command_id !== "string" ||
      !receipt.command_id ||
      !/^[a-f0-9]{64}$/.test(receipt.request_hash) ||
      typeof receipt.effects_json !== "string" ||
      !Number.isSafeInteger(receipt.applied_revision) ||
      receipt.applied_revision < 1 ||
      receipt.applied_revision > document.revision
    ) {
      throw new Error("Invalid receipt");
    }
  }
}
