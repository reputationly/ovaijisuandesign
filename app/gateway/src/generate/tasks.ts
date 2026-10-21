import { mkdirSync, realpathSync } from "node:fs";
import path from "node:path";

import { Body, Controller, Get, HttpCode, HttpException, Inject, Injectable, Param, Post, Query } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import Database from "better-sqlite3";

import { ProjectDeliveryService } from "../project-kernel/delivery.js";
import { ProjectKernelError, ProjectQueryError } from "../project-kernel/errors.js";

const OPERATIONS = ["generate_image", "generate_video", "generate_speech", "generate_music"] as const;
const TERMINAL = new Set(["completed", "failed", "cancelled"]);

type TaskRow = {
  id: string;
  operation: string;
  idempotencyKey: string;
  status: string;
  revision: number;
  inputJson: string;
  stateJson: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * 生成任务记在工作区索引里，和资源删除时看到的是同一张表。
 * 本地没有云端登录，能开 v3 工作区就能读自己的任务。
 */
@Injectable()
export class ProjectTaskService {
  private db?: Database.Database;
  private workspace?: string;

  constructor(@Inject(ProjectDeliveryService) private readonly delivery: ProjectDeliveryService) {}

  accept(task: { id: string; operation: string; prompt?: string; mediaType: string }) {
    const now = new Date().toISOString();
    this.write(task.id, task.operation, "running", { prompt: task.prompt, mediaType: task.mediaType }, { stage: "compute" }, now, now);
  }

  complete(id: string, output: { path?: string; kind?: string; name?: string }) {
    const current = this.getRow(id);
    if (!current || TERMINAL.has(current.status)) return;
    const input = JSON.parse(current.inputJson) as { output?: unknown; requestId?: string };
    const state: Record<string, unknown> = { stage: "resource", outputs: [{ key: "primary", ...output }] };
    if (input.output && output.path) {
      try {
        const delivered = this.delivery.deliver({ requestId: input.requestId ?? id, sources: [{ key: "primary", path: output.path }], output: input.output }) as { placements?: unknown };
        if (delivered.placements) state.placements = delivered.placements;
      } catch (error) {
        state.error = error instanceof Error ? error.message : String(error);
      }
    }
    this.write(id, current.operation, "completed", input, state, current.createdAt, new Date().toISOString(), current.revision + 1);
  }

  fail(id: string, message: string) {
    const current = this.getRow(id);
    if (!current || TERMINAL.has(current.status)) return;
    this.write(id, current.operation, "failed", JSON.parse(current.inputJson) as Record<string, unknown>, { stage: "compute", error: message }, current.createdAt, new Date().toISOString(), current.revision + 1);
  }

  list(status?: string) {
    this.ready();
    const rows = status
      ? this.database().prepare("SELECT id, operation, idempotency_key AS idempotencyKey, status, revision, input_json AS inputJson, state_json AS stateJson, created_at AS createdAt, updated_at AS updatedAt FROM tasks WHERE status=? ORDER BY created_at DESC, id DESC LIMIT 100").all(status) as TaskRow[]
      : this.database().prepare("SELECT id, operation, idempotency_key AS idempotencyKey, status, revision, input_json AS inputJson, state_json AS stateJson, created_at AS createdAt, updated_at AS updatedAt FROM tasks ORDER BY created_at DESC, id DESC LIMIT 100").all() as TaskRow[];
    // 第 242 轮：参照 gateway 的列表响应带 coverage（分页覆盖度）。
    // 实测 GET /api/v3/tasks → {"items":[],"nextCursor":null,"coverage":{"status":"complete","reasons":[]}}
    return {
      items: rows.map(present),
      nextCursor: null,
      coverage: { status: "complete", reasons: [] as string[] },
    };
  }

  get(id: string) {
    this.ready();
    const row = this.getRow(id);
    if (!row) throw new ProjectQueryError("NOT_FOUND", "GenerationTask is not readable", 404);
    return present(row);
  }

  lookup(operation: string, requestId: string) {
    this.ready();
    // 第 242 轮：参照返回 UNSUPPORTED_OPERATION（实测 422），此前我们用 INVALID_ARGUMENT。
    if (!OPERATIONS.includes(operation as (typeof OPERATIONS)[number])) throw new ProjectQueryError("UNSUPPORTED_OPERATION", "Unsupported task operation", 422);
    const row = this.database().prepare("SELECT id, operation, idempotency_key AS idempotencyKey, status, revision, input_json AS inputJson, state_json AS stateJson, created_at AS createdAt, updated_at AS updatedAt FROM tasks WHERE operation=? AND idempotency_key=?").get(operation, requestId) as TaskRow | undefined;
    if (!row) throw new ProjectQueryError("NOT_FOUND", "GenerationTask is not readable", 404);
    return present(row);
  }

  queue() {
    this.ready();
    // 第 243 轮：参照的形状是**计数对象**，不是任务数组。
    // 实测 GET /api/v3/tasks/queue ->
    //   { tasks:{pending,queued,active,paused,waitingUser,reconciling},
    //     subtasks:[], concurrency:[], updatedAt:<epoch ms>,
    //     coverage:{status:"partial",reasons:["dependency_unavailable"]} }
    // 渲染层的 parseTaskQueue 也按这个形状校验（canvas-v3-model.js:3477），
    // 我们原来返回 {tasks:[...]} 会被客户端直接拒掉。
    const rows = this.database().prepare("SELECT status FROM tasks").all() as { status: string }[];
    const counts = { pending: 0, queued: 0, active: 0, paused: 0, waitingUser: 0, reconciling: 0 };
    // 第 318 轮（验收发现）：库里存的状态名与计数对象的键**不是一一对应**。
    // `accept()` 写的是 "running"，而计数对象里没有 running 这个键（参照的形状里没有），
    // 于是进行中的任务被算到 0 个格子里 —— 队列看起来永远是空的。
    // 这里显式做一次映射，别靠同名巧合。
    const STATUS_TO_COUNT: Record<string, keyof typeof counts> = {
      running: "active",
      active: "active",
      pending: "pending",
      queued: "queued",
      paused: "paused",
      waiting_user: "waitingUser",
      waitingUser: "waitingUser",
      reconciling: "reconciling",
    };
    for (const row of rows) {
      const key = STATUS_TO_COUNT[row.status];
      if (key) counts[key] += 1;
    }
    return {
      tasks: counts,
      subtasks: [] as unknown[],
      concurrency: [] as unknown[],
      updatedAt: Date.now(),
      coverage: { status: "partial", reasons: ["dependency_unavailable"] as string[] },
    };
  }

  begin(task: { id: string; operation: string; idempotencyKey: string; capabilityId: string; prompt?: string; mediaType: string; output: unknown; requestId: string }) {
    this.ready();
    const existing = this.database().prepare("SELECT id, operation, idempotency_key AS idempotencyKey, status, revision, input_json AS inputJson, state_json AS stateJson, created_at AS createdAt, updated_at AS updatedAt FROM tasks WHERE operation=? AND idempotency_key=?").get(task.operation, task.idempotencyKey) as TaskRow | undefined;
    if (existing) return { reused: true, task: executionView(existing) };
    const now = new Date().toISOString();
    try {
      this.database().prepare(`INSERT INTO tasks(id, operation, idempotency_key, status, revision, input_json, state_json, created_at, updated_at)
        VALUES(?,?,?,?,?,?,?,?,?)`).run(task.id, task.operation, task.idempotencyKey, "running", 1, JSON.stringify({ prompt: task.prompt, mediaType: task.mediaType, capabilityId: task.capabilityId, output: task.output, requestId: task.requestId }), JSON.stringify({ stage: "compute" }), now, now);
    } catch (error) {
      if ((error as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE" || (error as { code?: string }).code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
        const row = this.database().prepare("SELECT id, operation, idempotency_key AS idempotencyKey, status, revision, input_json AS inputJson, state_json AS stateJson, created_at AS createdAt, updated_at AS updatedAt FROM tasks WHERE operation=? AND idempotency_key=?").get(task.operation, task.idempotencyKey) as TaskRow | undefined;
        if (row) return { reused: true, task: executionView(row) };
      }
      throw error;
    }
    return { reused: false, task: executionView(this.getRow(task.id) as TaskRow) };
  }

  discard(id: string) {
    try {
      this.ready();
    } catch {
      return;
    }
    this.database().prepare("DELETE FROM tasks WHERE id=? AND status='running'").run(id);
  }

  stop(id: string, expectedRevision: number) {
    this.ready();
    const row = this.getRow(id);
    if (!row) throw new ProjectQueryError("NOT_FOUND", "GenerationTask is not readable", 404);
    if (row.revision !== expectedRevision) throw new ProjectQueryError("REVISION_CONFLICT", "The task changed. Read it again before resolving.", 409);
    if (TERMINAL.has(row.status)) return present(row);
    this.write(id, row.operation, "cancelled", JSON.parse(row.inputJson) as Record<string, unknown>, { ...(JSON.parse(row.stateJson) as object), stage: "compute" }, row.createdAt, new Date().toISOString(), row.revision + 1);
    return this.get(id);
  }

  /** 由 TaskSubscriptionsService 注入；写变更后回调（第 253 轮） */
  onChange?: (task: { id: string; revision: number }) => void;

  private write(id: string, operation: string, status: string, input: Record<string, unknown>, state: Record<string, unknown>, createdAt: string, updatedAt: string, revision = 1) {
    this.ready();
    this.database().prepare(`INSERT INTO tasks(id, operation, idempotency_key, status, revision, input_json, state_json, created_at, updated_at)
      VALUES(?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET status=excluded.status, revision=excluded.revision, state_json=excluded.state_json, updated_at=excluded.updated_at`).run(
      id, operation, id, status, revision, JSON.stringify(input), JSON.stringify(state), createdAt, updatedAt,
    );
    const written = this.getRow(id);
    if (written) this.onChange?.(present(written));
  }

  private getRow(id: string): TaskRow | undefined {
    try {
      this.ready();
    } catch {
      return undefined;
    }
    return this.database().prepare("SELECT id, operation, idempotency_key AS idempotencyKey, status, revision, input_json AS inputJson, state_json AS stateJson, created_at AS createdAt, updated_at AS updatedAt FROM tasks WHERE id=?").get(id) as TaskRow | undefined;
  }

  private ready(): void {
    if (process.env.HILO_PROJECT_ARCHITECTURE !== "resource_v3" || process.env.HILO_GATEWAY_ROLE !== "workspace" || !process.env.WORKSPACE_DIR) {
      throw new ProjectKernelError("PROJECT_V3_DISABLED");
    }
  }

  private database(): Database.Database {
    const workspace = realpathSync(process.env.WORKSPACE_DIR ?? "");
    if (this.db && this.workspace === workspace) return this.db;
    const filename = path.join(workspace, ".hilo", "index.sqlite");
    mkdirSync(path.dirname(filename), { recursive: true });
    const db = new Database(filename);
    db.exec(`CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      operation TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      status TEXT NOT NULL,
      revision INTEGER NOT NULL,
      input_json TEXT NOT NULL,
      state_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS tasks_operation_key ON tasks(operation, idempotency_key)");
    this.db = db;
    this.workspace = workspace;
    return db;
  }
}

export function executionView(row: TaskRow) {
  const input = JSON.parse(row.inputJson) as { prompt?: string; capabilityId?: string };
  const state = JSON.parse(row.stateJson) as { error?: string; stage?: string; outputs?: { key: string; path?: string; kind?: string; name?: string }[]; placements?: unknown };
  const terminal = TERMINAL.has(row.status);
  return {
    id: row.id,
    capabilityId: input.capabilityId ?? row.operation,
    status: row.status,
    revision: row.revision,
    ...(input.prompt ? { prompt: input.prompt.slice(0, 280) } : {}),
    outputs: (state.outputs ?? []).map((item) => ({ key: item.key, ...(item.name ? { name: item.name } : {}), ...(item.kind ? { kind: item.kind } : {}), ...(item.path ? { path: item.path } : {}) })),
    ...(state.placements ? { placements: state.placements } : {}),
    ...(state.error ? { problem: { message: state.error } } : {}),
    ...(terminal ? {} : { stage: state.stage ?? "compute", progress: { phase: state.stage ?? "compute", reason: row.status, since: row.updatedAt, nextRetryAt: null } }),
  };
}

function present(row: TaskRow) {
  const input = JSON.parse(row.inputJson) as { prompt?: string; mediaType?: string; capabilityId?: string };
  const state = JSON.parse(row.stateJson) as { error?: string; outputs?: { key: string; path?: string; kind?: string; name?: string }[]; placements?: unknown };
  return {
    id: row.id,
    capabilityId: input.capabilityId ?? row.operation,
    status: row.status,
    revision: row.revision,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...(input.prompt ? { prompt: input.prompt.slice(0, 280) } : {}),
    ...(state.outputs ? { outputs: state.outputs } : {}),
    ...(state.placements ? { placements: state.placements } : {}),
    ...(state.error ? { error: state.error } : {}),
  };
}

@Controller("api/v3/tasks")
export class ProjectTaskController {
  constructor(
    @Inject(ProjectTaskService) private readonly tasks: ProjectTaskService,
    @Inject(ModuleRef) private readonly modules: ModuleRef,
  ) {}

  @Get()
  list(@Query("status") status?: string) {
    return this.respond(() => this.tasks.list(status));
  }

  @Get("lookup")
  lookup(@Query("operation") operation?: string, @Query("requestId") requestId?: string) {
    return this.respond(() => {
      if (!operation || !requestId) throw new ProjectQueryError("INVALID_ARGUMENT", "operation and requestId are required");
      return this.tasks.lookup(operation, requestId);
    });
  }

  @Get("queue")
  queue() {
    return this.respond(() => this.tasks.queue());
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.respond(() => this.tasks.get(id));
  }

  @Post(":id/resolve")
  @HttpCode(200)
  resolve(@Param("id") id: string, @Body() body: unknown) {
    return this.respond(async () => {
      const raw = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
      // 第 244 轮：对齐参照的控制契约（实测 POST /api/v3/tasks/abc/resolve）：
      //   {}                            -> 400 INVALID_ARGUMENT "Invalid control requestId"
      //   {requestId}                   -> 400 INVALID_ARGUMENT "Invalid expectedRevision"
      //   {requestId,expectedRevision}  -> 404 NOT_FOUND "GenerationTask is not readable"
      // requestId 先校验、expectedRevision 次之，action 可选（参照不看它）。
      if (typeof raw.requestId !== "string" || !raw.requestId) {
        throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid control requestId");
      }
      if (typeof raw.expectedRevision !== "number") {
        throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid expectedRevision");
      }
      const task = this.tasks.stop(id, raw.expectedRevision);
      const { GenerationRunner } = await import("./generation-runner.service.js");
      await this.modules.get(GenerationRunner, { strict: false }).cancel(id);
      return task;
    });
  }

  private async respond(operation: () => unknown | Promise<unknown>) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ProjectKernelError && error.code === "PROJECT_V3_DISABLED") {
        throw new HttpException({ error: { code: error.code, message: "Project v3 is not enabled", retryable: false } }, 403);
      }
      if (error instanceof ProjectQueryError) {
        throw new HttpException({ error: { code: error.code, message: error.message, retryable: false } }, error.status);
      }
      throw error;
    }
  }
}
