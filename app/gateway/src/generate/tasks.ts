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
        const delivered = this.delivery.deliver({ requestId: input.requestId ?? id, sources: [{ key: "primary", path: output.path }], output: input.output }) as {
          resources?: DeliveryOutput[];
          placements?: unknown;
        };
        // T-1：任务的 `outputs` 必须是**交付收据里的资源**，不是落地的文件。
        // 只回 `{key,path,kind,name}` 时渲染层的 `designOutputs` 会因为缺 resourceId/versionId
        // 把每一项都丢掉（`app/renderer/src/chat/design-execute/design-input.js` 第 63 行），
        // 表现就是任务已完成、卡片和画布都没有产出。`path` 仍带上，供日志和资产核对。
        if (Array.isArray(delivered.resources) && delivered.resources.length) {
          state.outputs = delivered.resources.map((item) => ({
            key: item.key,
            name: item.name,
            kind: item.kind,
            resourceId: item.resourceId,
            versionId: item.versionId,
            availability: item.availability ?? "available",
            ...(item.disposition ? { disposition: item.disposition } : {}),
            ...(item.key === "primary" && output.path ? { path: output.path } : {}),
          }));
        }
        if (delivered.placements) state.placements = delivered.placements;
      } catch (error) {
        state.error = error instanceof Error ? error.message : String(error);
      }
    }
    this.write(id, current.operation, "completed", input, state, current.createdAt, new Date().toISOString(), current.revision + 1);
  }

  /**
   * 任务失败。
   *
   * `problem` 是给卡片看的（`{code, source, message}`）：`code` 必须落在参照那份枚举里，
   * 否则渲染层的任务解析器会拒掉整条任务（`Invalid Task response`），卡片直接空掉。
   * 不传时只写技术原文，卡片显示"失败"但不带原因 —— 这是改造前的行为。
   */
  fail(id: string, message: string, problem?: { code: string; source: string; message: string }) {
    const current = this.getRow(id);
    if (!current || TERMINAL.has(current.status)) return;
    this.write(id, current.operation, "failed", JSON.parse(current.inputJson) as Record<string, unknown>, {
      stage: "compute",
      error: message,
      ...(problem ? { problem } : {}),
    }, current.createdAt, new Date().toISOString(), current.revision + 1);
  }

  list(query: { status?: string; operation?: string | string[]; source?: string; toolUseId?: string; limit?: string | number } = {}) {
    this.ready();
    const operations = query.operation === undefined ? [] : (Array.isArray(query.operation) ? query.operation : [query.operation]).flatMap((item) => item.split(",")).filter(Boolean);
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query.status) { conditions.push("status=?"); params.push(query.status); }
    if (operations.length) { conditions.push(`operation IN (${operations.map(() => "?").join(",")})`); params.push(...operations); }
    if (query.source) { conditions.push("json_extract(input_json, '$.origin.source')=?"); params.push(query.source); }
    if (query.toolUseId) { conditions.push("json_extract(input_json, '$.origin.toolUseId')=?"); params.push(query.toolUseId); }
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 100) || 100));
    const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.database().prepare(`SELECT id, operation, idempotency_key AS idempotencyKey, status, revision, input_json AS inputJson, state_json AS stateJson, created_at AS createdAt, updated_at AS updatedAt FROM tasks${where} ORDER BY created_at DESC, id DESC LIMIT ${limit}`).all(...params) as TaskRow[];
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

  begin(task: { id: string; operation: string; idempotencyKey: string; capabilityId: string; prompt?: string; mediaType: string; output: unknown; requestId: string; origin?: { source?: string; toolUseId?: string }; generation?: unknown }) {
    this.ready();
    const existing = this.database().prepare("SELECT id, operation, idempotency_key AS idempotencyKey, status, revision, input_json AS inputJson, state_json AS stateJson, created_at AS createdAt, updated_at AS updatedAt FROM tasks WHERE operation=? AND idempotency_key=?").get(task.operation, task.idempotencyKey) as TaskRow | undefined;
    if (existing) return { reused: true, task: executionView(existing) };
    const now = new Date().toISOString();
    try {
      this.database().prepare(`INSERT INTO tasks(id, operation, idempotency_key, status, revision, input_json, state_json, created_at, updated_at)
        VALUES(?,?,?,?,?,?,?,?,?)`).run(task.id, task.operation, task.idempotencyKey, "running", 1, JSON.stringify({ prompt: task.prompt, mediaType: task.mediaType, capabilityId: task.capabilityId, output: task.output, requestId: task.requestId, ...(task.origin ? { origin: task.origin } : {}), ...(task.generation ? { generation: task.generation } : {}) }), JSON.stringify({ stage: "compute" }), now, now);
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

  retry(id: string, expectedRevision: number) {
    this.ready();
    const row = this.getRow(id);
    if (!row) throw new ProjectQueryError("NOT_FOUND", "GenerationTask is not readable", 404);
    if (row.revision !== expectedRevision) throw new ProjectQueryError("REVISION_CONFLICT", "The task changed. Read it again before resolving.", 409);
    if (row.status !== "failed") throw new ProjectQueryError("INVALID_ARGUMENT", "Only a failed Task can be retried");
    const input = JSON.parse(row.inputJson) as { generation?: unknown; mediaType?: string; origin?: { source?: string; toolUseId?: string } };
    if (!input.generation) throw new ProjectQueryError("UNSUPPORTED_OPERATION", "This Task has no resumable generation request", 422);
    const now = new Date().toISOString();
    this.write(id, row.operation, "running", JSON.parse(row.inputJson) as Record<string, unknown>, { stage: "compute" }, row.createdAt, now, row.revision + 1);
    return { task: this.get(id), generation: input.generation, mediaType: input.mediaType, origin: input.origin };
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

/**
 * 任务产出的对外形状。交付收据里给的是**资源身份**（`resourceId` + `versionId`），
 * 渲染层拿这两个去 `/api/project/resources/get` 换 `relativePath` 才能显示出图；
 * `path` 是落地的资产文件，只用于日志与核对（见 T-1）。
 */
/** 任务失败的原因，形状与参照的 `problem` 一致（`code` 必须在其枚举内）。 */
type TaskProblem = { code: string; source: string; message: string };

type DeliveryOutput = {
  key: string;
  name?: string;
  kind?: string;
  resourceId?: string;
  versionId?: string;
  availability?: string;
  disposition?: string;
  path?: string;
};

function outputView(item: DeliveryOutput) {
  return {
    key: item.key,
    ...(item.name ? { name: item.name } : {}),
    ...(item.kind ? { kind: item.kind } : {}),
    ...(item.resourceId ? { resourceId: item.resourceId } : {}),
    ...(item.versionId ? { versionId: item.versionId } : {}),
    ...(item.availability ? { availability: item.availability } : {}),
    ...(item.disposition ? { disposition: item.disposition } : {}),
    ...(item.path ? { path: item.path } : {}),
  };
}

/**
 * `/api/v3/execute` 的返回形状（含 `reused` 分支）。
 *
 * **和 `present()` 同一份视图**：tool part 里存的任务快照就是它，渲染层的 `parseTaskView`
 * 拿它当任务解析。以前这里另写了一份只有 9 个字段的旧形状（`progress.phase` 还写内部词），
 * 于是同一个任务"列表能解析、execute 返回的解析不了"。
 */
export function executionView(row: TaskRow) {
  return present(row);
}

/**
 * 列表/单条的任务视图。
 *
 * **形状必须和渲染层的 `parseTaskView` 对齐**（`canvas-v3/canvas-v3-model.js`）：
 * `operation` / `terminal` / `stage` / `data` / `problem`（可空）/ `actions` /
 * `progress` / `billing`（可空）缺一个，整条任务就被判 `Invalid Task response`，
 * 卡片永远拿不到数据 —— 现象是"卡片只显示推送来的状态，从不轮询"。
 * `createdAt` / `updatedAt` 必须是**整数毫秒**，库里存的是 ISO 字符串。
 */
function present(row: TaskRow) {
  const input = JSON.parse(row.inputJson) as { prompt?: string; mediaType?: string; capabilityId?: string; origin?: { source?: string; toolUseId?: string } };
  const state = JSON.parse(row.stateJson) as {
    error?: string;
    stage?: string;
    outputs?: DeliveryOutput[];
    placements?: unknown;
    problem?: TaskProblem & { code?: string; source?: string; recovery?: string };
  };
  const terminal = TERMINAL.has(row.status);
  const since = epochMs(row.updatedAt);
  return {
    id: row.id,
    capabilityId: input.capabilityId ?? row.operation,
    operation: row.operation,
    status: row.status,
    terminal,
    stage: state.stage ?? (terminal ? "resource" : "compute"),
    revision: row.revision,
    createdAt: epochMs(row.createdAt),
    updatedAt: since,
    ...(input.prompt ? { prompt: input.prompt.slice(0, 280) } : {}),
    ...(input.origin ? { origin: input.origin } : {}),
    // 没有 resourceId/versionId 的产物（还没交付完）在渲染层本来就被丢弃，
    // 这里先滤掉，免得整条任务被判非法。
    outputs: (state.outputs ?? []).map(outputView).filter((item) => item.resourceId && item.versionId),
    placements: placementViews(state.placements, (state.outputs ?? []).map(outputView)),
    data: {},
    // `error` 是技术原文：排障与既有用例都读它。渲染层的解析器忽略未知键，保留无害。
    ...(state.error ? { error: state.error } : {}),
    problem: problemView(state),
    // **只列 gateway 真支持的动作**（resolve 里实现了 stop / retry，其余返回 422）：
    //   非终态 → stop；failed 且存有可重新提交的请求 → retry；其余 []。
    // 空数组会让任务面板的停止/重试按钮不出现，`designTaskRetryable` 也永远是 false。
    actions: taskActions(row.status, input as { generation?: unknown }),
    handoff: null,
    progress: {
      // `phase` / `reason` 都是**渲染层的枚举**，不是我们的内部词：
      // phase ∈ pending|queued|active|paused|retrying|stopped|done，
      // reason ∈ scheduler|…|provider_running|…（见 `canvas-v3-model.js` 的
      // `TASK_PROGRESS_PHASES` / `progress.reason`）。写内部词（"compute"/"running"）
      // 会让整条任务被判 `Invalid Task response`，卡片拿不到任何数据。
      phase: progressPhase(row.status),
      reason: progressReason(row.status, problemCodeSource(state)),
      since,
      queuedAt: null,
      submittedAt: null,
      startedAt: null,
      percent: null,
      position: null,
      etaSeconds: null,
      nextRetryAt: null,
      subtasks: [],
    },
    billing: null,
  };
}

/** 我们的任务状态 → 渲染层的 progress.phase（两个枚举不是同一套词）。 */
function progressPhase(status: string): string {
  switch (status) {
    case "accepted":
      return "queued";
    case "running":
      return "active";
    case "waiting_user":
      return "paused";
    case "completed":
      return "done";
    case "failed":
    case "cancelled":
      return "stopped";
    default:
      return "queued";
  }
}

/**
 * 我们的任务状态 → 渲染层的 progress.reason（null = 不表态，渲染层允许）。
 *
 * 失败任务以前一律写 `provider_unavailable`，不管真实原因是额度不足、被拒还是存储满了 ——
 * 那是编的，用户看到的解释会和 `problem` 对不上。失败时按 `problem.code` 映射到语义
 * 对得上的那一项，对不上就 null（交给 `problem` 说话）。
 */
function progressReason(status: string, problem: { code?: string; source?: string } | null): string | null {
  switch (status) {
    case "accepted":
      return "scheduler";
    case "running":
      return "provider_running";
    case "waiting_user":
      return "user_action";
    case "cancelled":
      return "user_stopped";
    case "failed":
      return reasonForProblem(problem);
    default:
      return null;
  }
}

/** `problem` → reason 枚举里语义对得上的那一项；对不上就 null。 */
function reasonForProblem(problem: { code?: string; source?: string } | null): string | null {
  if (!problem) return null;
  const code = problem.code ?? "";
  // 按 code 先判（比 source 细），再退回 source。
  if (code.startsWith("BILLING_") || code === "QUOTE_EXPIRED") return "billing";
  if (code === "PAUSED") return "user_paused";
  if (code.startsWith("RESOURCE_") || code.startsWith("COMPOSITION_") || code.startsWith("DELIVERY_")) return "delivery";
  if (code === "PROVIDER_FAILED" || code === "PROVIDER_OUTPUT_UNAVAILABLE") return "provider_unavailable";
  if (code === "DEPENDENCY_UNAVAILABLE") return "dependency_unavailable";
  if (problem.source === "billing") return "billing";
  if (problem.source === "delivery") return "delivery";
  return null;
}

/** 渲染层只认这些动作；`pause`/`resume`/`confirm_cost` 我们没实现，不列。 */
function taskActions(status: string, input: { generation?: unknown }): string[] {
  if (!TERMINAL.has(status)) return ["stop"];
  if (status === "failed" && input.generation) return ["retry"];
  return [];
}

function problemCodeSource(state: { problem?: TaskProblem }): { code?: string; source?: string } | null {
  const problem = state.problem;
  return problem && typeof problem.code === "string" ? { code: problem.code, source: problem.source } : null;
}

function epochMs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * 渲染层的 placement 要求 key/compositionId/memberId/resourceId/status 齐全。
 * 我们库里存的是 `{key, compositionId, memberId, role}` —— `resourceId` 用同名产物的补，
 * `status` 缺省 applied。**不能整条丢掉**：丢了组合里就没有这次交付的落位了。
 */
function placementViews(raw: unknown, outputs: { key?: string; resourceId?: string }[]): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  const out: Record<string, unknown>[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const match = outputs.find((output) => output.key === row.key);
    const resourceId = typeof row.resourceId === "string" ? row.resourceId : match?.resourceId;
    const view: Record<string, unknown> = { ...row, ...(resourceId ? { resourceId } : {}), status: typeof row.status === "string" ? row.status : "applied" };
    if (typeof view.key === "string" && typeof view.compositionId === "string" && typeof view.memberId === "string" && typeof view.resourceId === "string") out.push(view);
  }
  return out;
}

/**
 * `problem` 的形状也是契约：`{code, message}`，且 `source` 必须与渲染层那张表里
 * 同 code 的 source 一致，否则整条任务判非法。库里存的可能只有 message，兜到 INTERNAL_ERROR。
 */
function problemView(state: { error?: string; problem?: TaskProblem & { recovery?: string } }): unknown {
  const source = state.problem;
  // 库里存的就是 `{code, source, message}`（generation-runner 落的），原样透出即可。
  // 只有缺 code/source 的老数据才兜到 INTERNAL_ERROR —— 渲染层会校验 code 与 source 是否配套。
  if (source && typeof source.code === "string" && typeof source.source === "string") {
    return { code: source.code, source: source.source, message: source.message, ...(source.recovery ? { recovery: source.recovery } : {}) };
  }
  if (source?.message) return { code: "INTERNAL_ERROR", source: "system", recovery: "retry", message: source.message };
  if (state.error) return { code: "INTERNAL_ERROR", source: "system", recovery: "retry", message: state.error };
  return null;
}

@Controller("api/v3/tasks")
export class ProjectTaskController {
  constructor(
    @Inject(ProjectTaskService) private readonly tasks: ProjectTaskService,
    @Inject(ModuleRef) private readonly modules: ModuleRef,
  ) {}

  @Get()
  list(
    @Query("status") status?: string,
    @Query("operation") operation?: string | string[],
    @Query("source") source?: string,
    @Query("toolUseId") toolUseId?: string,
    @Query("limit") limit?: string,
  ) {
    return this.respond(() => this.tasks.list({ status, operation, source, toolUseId, limit }));
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
      // 4.0.4 起 action 是必填且在校验顺序里排在任务查找之前：
      // 缺 action 的旧请求现在返回 400 "Invalid action"，不再落到 404。
      if (
        typeof raw.action !== "string" ||
        !["pause", "resume", "stop", "adopt_version", "finish_as_candidate", "update_placement", "finish_without_placement", "retry"].includes(raw.action)
      ) {
        throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid action");
      }
      const { GenerationRunner } = await import("./generation-runner.service.js");
      const runner = this.modules.get(GenerationRunner, { strict: false });
      if (raw.action === "stop") {
        const task = this.tasks.stop(id, raw.expectedRevision);
        await runner.cancel(id);
        return task;
      }
      if (raw.action === "retry") {
        const { task, generation, mediaType, origin } = this.tasks.retry(id, raw.expectedRevision);
        await runner.submit(mediaType as never, generation as never, origin?.source === "agent" ? "agent" : "canvas", id);
        return task;
      }
      // 本地任务模型只实现了 stop/retry；其余动作不能悄悄落到 stop。
      throw new ProjectQueryError("UNSUPPORTED_OPERATION", `Action ${raw.action} is not supported by this gateway`, 422);
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
