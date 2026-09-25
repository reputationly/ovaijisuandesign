import { createHash, randomBytes } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import lockfile from "proper-lockfile";

import {
  startingRuntime,
  isPlanFile,
  isPrewrittenDocContract,
  PlanFileSchema,
  hasPostReview,
  hasPreReview,
  workflowPathOf,
  workflowVariantOf,
  type PlanFile,
  type PlanFileStage,
  type PlanItem,
  type ReplanAuditEntry,
  type ReplanImpact,
  type StageContract,
  type StageRuntime,
  type StageStatus,
  type StoreReplanOperation,
  type WaitingReason,
} from "./plan-schema.js";

/**
 * plan 文件存储：`<projectRoot>/.hilo/plan/<id>.json`。
 *
 * 每次改动都在 proper-lockfile 锁内“读 → 校验 revision → 改 → 写临时文件 → rename”，
 * 保证 planner、编排器、看板并发写时不会半写或覆盖彼此。revision 每次 +1，
 * 调用方用 expected_revision 做 CAS。
 */

export type PlanErrorCode = "invalid" | "not_found" | "revision_conflict" | "stage_not_found" | "duplicate_stage";

/** 给 agent 的可执行修复建议（错误码、允许的动作、推荐动作、是否要重读）。 */
export interface PlanErrorGuidance {
  code: string;
  operation_index?: number;
  entity?: { type: "plan" | "stage" | "runtime_ref"; id: string };
  current_state?: Record<string, string | number | boolean>;
  allowed_actions?: string[];
  recommended_action: { operation: string; description?: string };
  retryable: boolean;
  requires_reread: boolean;
  issues?: {
    stage_id: string;
    work_item_id?: string;
    field?: string;
    message: string;
    recommended_action: { operation: string; description?: string };
  }[];
}

export class PlanError extends Error {
  constructor(
    message: string,
    readonly code: PlanErrorCode = "invalid",
    readonly guidance?: PlanErrorGuidance,
  ) {
    super(message);
    this.name = "PlanError";
  }
}

const LOCK_STALE_MS = 10_000;
const LOCK_WAIT_MS = 30_000;
const LOCK_RETRY_MS = 25;
const MAX_REPLAN_HISTORY_ENTRIES = 20;

export function projectPlanDir(projectRoot: string): string {
  return path.join(projectRoot, ".hilo", "plan");
}

export function planFilePath(projectRoot: string, planId: string): string {
  // plan id 直接拼进文件名，带路径分隔符就能写出目录
  if (!planId || /[\\/]/.test(planId)) {
    throw new Error(`Invalid stagePlanId for plan file path: ${JSON.stringify(planId)}`);
  }
  return path.join(projectPlanDir(projectRoot), `${planId}.json`);
}

export function generatePlanId(): string {
  return `plan_${randomBytes(9).toString("hex")}`;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** 老版本文件里的 todo / approval 等 runtime 字段迁到当前状态机。 */
function migrateLegacyRuntimeFields(value: unknown): unknown {
  const stages = isPlainObject(value) ? value.stages : undefined;
  if (!Array.isArray(stages)) return value;
  for (const raw of stages) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const stage = raw as { contract?: StageContract; runtime?: Record<string, unknown> };
    const rt = stage.runtime;
    if (!rt) continue;
    delete rt.approval;
    if (rt.status === "todo") {
      if (isPrewrittenDocContract(stage.contract)) {
        rt.status = hasPostReview(stage.contract) ? "waiting_user" : "done";
        rt.waiting_reason = rt.status === "waiting_user" ? "result_review" : undefined;
      } else {
        rt.status = hasPreReview(stage.contract) ? "waiting_user" : "doing";
        rt.waiting_reason = rt.status === "waiting_user" ? "plan_review" : undefined;
      }
    }
    if (rt.status === "waiting_user") {
      const hasBefore = hasPreReview(stage.contract);
      const hasAfter = hasPostReview(stage.contract);
      const hasOutputs = Array.isArray(rt.runtime_refs) && rt.runtime_refs.length > 0;
      const reason = isPrewrittenDocContract(stage.contract)
        ? "result_review"
        : rt.waiting_reason === "result_review" || (!rt.waiting_reason && hasOutputs)
          ? "result_review"
          : "plan_review";
      if (reason === "plan_review" && !hasBefore) {
        rt.status = "doing";
        rt.waiting_reason = undefined;
      } else if (reason === "result_review" && !hasAfter) {
        rt.status = "done";
        rt.waiting_reason = undefined;
      } else {
        rt.waiting_reason = reason;
      }
    } else if (rt.status === "blocked" && !rt.blocked_reason) {
      rt.blocked_reason =
        typeof rt.note === "string" && rt.note.trim()
          ? rt.note.trim()
          : "Stage execution is blocked; inspect failures and choose how to continue.";
    }
  }
  return value;
}

/** 锁一个旁路文件（而不是 plan 本身）：plan 文件不存在时也要能锁住“创建”。 */
export async function withPlanLock<T>(projectRoot: string, planId: string, fn: () => Promise<T>): Promise<T> {
  const dir = projectPlanDir(projectRoot);
  await fs.mkdir(dir, { recursive: true });
  const target = path.join(dir, `.${planId}.lock-target`);
  await (await fs.open(target, "a")).close();
  const startedAt = Date.now();
  let release: (() => Promise<void>) | undefined;
  while (!release) {
    try {
      release = await lockfile.lock(target, { realpath: false, retries: 0, stale: LOCK_STALE_MS });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ELOCKED") throw err;
      if (Date.now() - startedAt >= LOCK_WAIT_MS) throw new PlanError(`Timed out waiting for plan lock: ${planId}`);
      await new Promise((r) => setTimeout(r, LOCK_RETRY_MS));
    }
  }
  try {
    return await fn();
  } finally {
    await release().catch(() => undefined);
  }
}

function formatIssues(issues: { path: (string | number)[]; message: string }[]): string {
  return issues
    .slice(0, 5)
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
}

export async function loadPlan(projectRoot: string, planId: string): Promise<PlanFile> {
  let raw: string;
  try {
    const file = planFilePath(projectRoot, planId);
    raw = await fs.readFile(file, { encoding: "utf8" });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") throw new PlanError(`Stage plan not found: ${planId}`, "not_found");
    throw err;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new PlanError(`Stage plan file is not valid JSON: ${planId}`);
  }
  parsed = migrateLegacyRuntimeFields(parsed);
  if (!isPlanFile(parsed)) throw new PlanError(`Stage plan file failed schema validation: ${planId}`);
  const check = PlanFileSchema.safeParse(parsed);
  if (!check.success) {
    throw new PlanError(`Stage plan file failed schema validation: ${formatIssues(check.error.issues)}`, "invalid");
  }
  return check.data;
}

export function assertRevision(plan: PlanFile, expected: number | undefined): void {
  if (expected === undefined || plan.revision === expected) return;
  throw new PlanError(
    `Stage plan revision conflict: expected ${expected}, found ${plan.revision}. Re-read the plan and retry.`,
    "revision_conflict",
    {
      code: "PLAN_REVISION_CONFLICT",
      current_state: { expected_revision: expected, actual_revision: plan.revision },
      allowed_actions: ["reread_plan"],
      recommended_action: {
        operation: "reread_plan",
        description: "Read the latest Plan revision and rebuild the intended request once.",
      },
      retryable: true,
      requires_reread: true,
    },
  );
}

async function persist(projectRoot: string, planId: string, plan: PlanFile): Promise<PlanFile> {
  if (!isPlanFile(plan)) throw new PlanError(`Refusing to persist an invalid stage plan: ${planId}`);
  const dir = projectPlanDir(projectRoot);
  await fs.mkdir(dir, { recursive: true });
  const file = planFilePath(projectRoot, planId);
  const temp = path.join(dir, `.${planId}.${randomBytes(4).toString("hex")}.tmp`);
  try {
    await fs.writeFile(temp, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    await fs.rename(temp, file);
  } catch (err) {
    await fs.rm(temp, { force: true });
    throw err;
  }
  return PlanFileSchema.parse(plan);
}

// ── 改 contract 后的 runtime 对账 ──

function canonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, canonValue(v)]),
  );
}
/** 与键顺序、undefined 键无关的比较键。 */
const canonKey = (v: unknown) => JSON.stringify(canonValue(v));

function itemIdOf(item: PlanItem): string | undefined {
  return typeof item.id === "string" && item.id.trim() ? item.id : undefined;
}

/** name 只是展示用，改名不算改了执行内容。 */
function execItem(item: PlanItem): PlanItem {
  const { name: _name, ...rest } = item;
  return rest;
}

function execContract(c: StageContract): StageContract {
  return { ...c, ...(c.work_items ? { work_items: c.work_items.map(execItem) } : {}) };
}

function referenceIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => (typeof v === "string" ? [v.trim()] : []));
  if (typeof value !== "string") return [];
  return value
    .trim()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function consumedItemIds(item: PlanItem): string[] {
  const ids = new Set<string>();
  for (const [field, value] of Object.entries(item)) {
    if (field === "refs" || field.endsWith("_refs")) for (const id of referenceIds(value)) ids.add(id);
  }
  return [...ids];
}

function hasLocator(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasLocator);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([k, v]) => ["node_id", "document_node_id", "path", "url"].includes(k) || hasLocator(v),
  );
}

function depView(plan: PlanFile, stage: PlanFileStage) {
  return (stage.contract.depends_on ?? []).map((depId) => {
    const dep = plan.stages.find((s) => s.id === depId);
    if (!dep) return { id: depId, missing: true };
    return {
      id: dep.id,
      ref_capsules: dep.contract.ref_capsules ?? [],
      materialized_refs: (dep.contract.work_items ?? []).filter(hasLocator),
      runtime_refs: dep.runtime.runtime_refs ?? [],
    };
  });
}

/** 影响执行的上下文：stage 级字段 + 上游依赖能提供的引用。变了就得整体重跑。 */
function execContext(plan: PlanFile, stage: PlanFileStage) {
  return {
    stage_fields: stage.contract.stage_fields,
    constraints: stage.contract.constraints,
    execution_locks: stage.contract.execution_locks,
    ref_capsules: stage.contract.ref_capsules,
    execution_excerpt: stage.contract.execution_excerpt,
    dependencies: depView(plan, stage),
  };
}

function uniqueItems(items: PlanItem[]): PlanItem[] {
  const m = new Map<string, PlanItem>();
  for (const item of items) m.set(canonKey(item), item);
  return [...m.values()];
}

/**
 * 对比改动前后的一个 stage，决定 runtime 保留多少：
 * 上下文和 contract 都没变 → 原样保留；否则回到初始状态，
 * 只保留执行内容没变（且不消费被作废输出）的 work item 的输出，其余挪进 superseded。
 */
export function reconcileStageRuntime(before: PlanFile, after: PlanFile, stageId: string): { runtime: StageRuntime; reset: boolean } {
  const beforeStage = before.stages.find((s) => s.id === stageId);
  const afterStage = after.stages.find((s) => s.id === stageId);
  if (!afterStage) throw new Error(`Cannot reconcile missing Stage: ${stageId}`);
  if (!beforeStage) return { runtime: startingRuntime(afterStage.contract), reset: true };

  const contextMatches = canonKey(execContext(before, beforeStage)) === canonKey(execContext(after, afterStage));
  const byId = (items: PlanItem[] | undefined) =>
    new Map(
      (items ?? []).flatMap((item): [string, PlanItem][] => {
        const id = itemIdOf(item);
        return id ? [[id, item]] : [];
      }),
    );
  const beforeItems = byId(beforeStage.contract.work_items);
  const afterItems = byId(afterStage.contract.work_items);
  const invalidated = new Set<string>();
  // Map 按插入顺序迭代：前面作废的输出会传染给后面消费它的 item
  for (const [id, item] of afterItems) {
    const prev = beforeItems.get(id);
    const same = prev !== undefined && canonKey(execItem(prev)) === canonKey(execItem(item));
    const consumesInvalidated = consumedItemIds(item).some((ref) => invalidated.has(ref));
    if (!contextMatches || !same || consumesInvalidated) invalidated.add(id);
  }
  for (const id of beforeItems.keys()) if (!afterItems.has(id)) invalidated.add(id);

  const retained: PlanItem[] = [];
  const dropped: PlanItem[] = [];
  for (const ref of beforeStage.runtime.runtime_refs ?? []) {
    const id = itemIdOf(ref);
    if (id && afterItems.has(id) && !invalidated.has(id)) retained.push(ref);
    else dropped.push(ref);
  }
  const contractMatches = canonKey(execContract(beforeStage.contract)) === canonKey(execContract(afterStage.contract));
  const reset = !contextMatches || !contractMatches || invalidated.size > 0;
  if (!reset) return { runtime: structuredClone(beforeStage.runtime), reset: false };

  const retainedKeys = new Set(retained.map(canonKey));
  const superseded = uniqueItems([...(beforeStage.runtime.superseded_runtime_refs ?? []), ...dropped]).filter(
    (item) => !retainedKeys.has(canonKey(item)),
  );
  return {
    runtime: {
      ...startingRuntime(afterStage.contract),
      ...(retained.length > 0 ? { runtime_refs: retained } : {}),
      ...(superseded.length > 0 ? { superseded_runtime_refs: superseded } : {}),
    },
    reset: true,
  };
}

// ── 整体写入 / 单 stage 修补 ──

export interface NewPlanInput {
  title?: string;
  header_fields?: PlanFile["header_fields"];
  workflow?: PlanFile["workflow"];
  sources?: PlanItem[];
  stage_outline: PlanFile["stage_outline"];
  stages: PlanFileStage[];
}

/** 新建或整体替换。替换时 revision 接着涨；给了 expected_revision 但文件不存在也算错。 */
export async function writeNewPlan(
  projectRoot: string,
  planId: string,
  input: NewPlanInput,
  expectedRevision: number | undefined,
): Promise<PlanFile> {
  return withPlanLock(projectRoot, planId, async () => {
    let previous: PlanFile | undefined;
    try {
      previous = await loadPlan(projectRoot, planId);
    } catch (err) {
      if (!(err instanceof PlanError) || err.code !== "not_found") throw err;
    }
    if (previous) assertRevision(previous, expectedRevision);
    else if (expectedRevision !== undefined) throw new PlanError(`Stage plan not found: ${planId}`, "not_found");
    const plan = {
      schema_version: 1 as const,
      revision: previous ? previous.revision + 1 : 1,
      title: input.title,
      header_fields: input.header_fields,
      workflow: input.workflow,
      sources: input.sources,
      stage_outline: input.stage_outline,
      stages: input.stages,
    };
    const check = PlanFileSchema.safeParse(plan);
    if (!check.success) throw new PlanError(`New plan failed validation: ${formatIssues(check.error.issues)}`, "invalid");
    return persist(projectRoot, planId, check.data);
  });
}

export interface PatchStageInput {
  stage_id: string;
  order: number;
  goal: string;
  contract: StageContract;
  after_order?: number;
  expected_revision?: number;
  validate?: (plan: PlanFile) => void;
}

/** upsert 一个已写的 stage：已存在保留 runtime 再对账，新 stage 取初始状态。 */
export async function upsertStage(projectRoot: string, planId: string, input: PatchStageInput): Promise<PlanFile> {
  return withPlanLock(projectRoot, planId, async () => {
    const plan = await loadPlan(projectRoot, planId);
    assertRevision(plan, input.expected_revision);
    const before = structuredClone(plan);
    const idx = plan.stages.findIndex((s) => s.id === input.stage_id);
    const existing = idx >= 0 ? plan.stages[idx] : undefined;
    if (existing) {
      plan.stages[idx] = { id: input.stage_id, order: input.order, goal: input.goal, contract: input.contract, runtime: existing.runtime };
    } else {
      const stage: PlanFileStage = {
        id: input.stage_id,
        order: input.order,
        goal: input.goal,
        contract: input.contract,
        runtime: startingRuntime(input.contract),
      };
      const at = input.after_order !== undefined ? plan.stages.findIndex((s) => s.order === input.after_order) : -1;
      if (at >= 0) plan.stages.splice(at + 1, 0, stage);
      else plan.stages.push(stage);
    }
    plan.stages.sort((a, b) => a.order - b.order);
    for (const stage of plan.stages) stage.runtime = reconcileStageRuntime(before, plan, stage.id).runtime;
    const outline = plan.stage_outline.find((s) => s.id === input.stage_id);
    if (!outline || outline.order !== input.order) {
      throw new PlanError(`Stage ${input.stage_id} (order ${input.order}) is not declared in stage_outline.`, "invalid");
    }
    input.validate?.(plan);
    plan.revision += 1;
    return persist(projectRoot, planId, plan);
  });
}

/** 物理删除已写的 stage，大纲一并删掉并重排 order。 */
export async function removeStage(
  projectRoot: string,
  planId: string,
  stageId: string,
  expectedRevision: number | undefined,
  validate?: (plan: PlanFile) => void,
): Promise<PlanFile> {
  return withPlanLock(projectRoot, planId, async () => {
    const plan = await loadPlan(projectRoot, planId);
    assertRevision(plan, expectedRevision);
    const before = plan.stages.length;
    plan.stages = plan.stages.filter((s) => s.id !== stageId);
    if (plan.stages.length === before) throw new PlanError(`Stage not found: ${stageId}`, "stage_not_found");
    plan.stage_outline = plan.stage_outline.filter((s) => s.id !== stageId).map((s, i) => ({ ...s, order: i + 1 }));
    const orderById = new Map(plan.stage_outline.map((s) => [s.id, s.order]));
    plan.stages = plan.stages.map((s) => ({ ...s, order: orderById.get(s.id) ?? s.order })).sort((a, b) => a.order - b.order);
    validate?.(plan);
    plan.revision += 1;
    return persist(projectRoot, planId, plan);
  });
}

/** 标记未写的大纲项为 omitted，order 不动（看板上的位置保持稳定）。 */
export async function omitStage(
  projectRoot: string,
  planId: string,
  stageId: string,
  expectedRevision: number | undefined,
  validate?: (plan: PlanFile) => void,
): Promise<PlanFile> {
  return withPlanLock(projectRoot, planId, async () => {
    const plan = await loadPlan(projectRoot, planId);
    assertRevision(plan, expectedRevision);
    const outline = plan.stage_outline.find((s) => s.id === stageId);
    if (!outline) throw new PlanError(`Stage not found: ${stageId}`, "stage_not_found");
    if (plan.stages.some((s) => s.id === stageId)) throw new PlanError(`Authored Stage cannot be omitted: ${stageId}`, "invalid");
    if (outline.omitted) return plan;
    outline.omitted = true;
    validate?.(plan);
    plan.revision += 1;
    return persist(projectRoot, planId, plan);
  });
}

// ── runtime 状态机 ──

export interface RuntimeOutput {
  id: string;
  node_id?: string;
  url?: string;
  path?: string;
}

export interface StageRuntimeUpdate {
  stage_id?: string;
  order?: number;
  status: StageStatus;
  expected_status?: StageStatus;
  waiting_reason?: WaitingReason;
  blocked_reason?: string;
  failed_item_ids?: string[];
  note?: string;
  outputs?: RuntimeOutput[];
}

function outputToItem(o: RuntimeOutput): PlanItem {
  const item: PlanItem = { id: o.id };
  if (o.node_id) item.node_id = o.node_id;
  if (o.path) item.path = o.path;
  if (o.url) item.url = o.url;
  return item;
}

const refIdOf = (item: PlanItem) => (typeof item.id === "string" ? item.id : undefined);

/** 输出 id 必须是 contract 里声明过的 work item id —— 下游按这些 id 取引用。 */
function assertOutputIdsDeclared(stage: PlanFileStage, outputs: RuntimeOutput[] | undefined): void {
  if (!outputs || outputs.length === 0) return;
  const declared = new Set((stage.contract.work_items ?? []).map(refIdOf).filter((v): v is string => Boolean(v)));
  const seen = new Set<string>();
  for (const o of outputs) {
    if (seen.has(o.id)) throw new PlanError(`Stage ${stage.id} output id "${o.id}" appears more than once in one update.`, "invalid");
    seen.add(o.id);
    if (declared.has(o.id)) continue;
    throw new PlanError(
      `Stage ${stage.id} output id "${o.id}" is not declared in work_items. Declared output ids: [${[...declared].sort().join(", ")}].`,
      "invalid",
    );
  }
}

/** 未显式给出等待原因时按当前状态推断：执行完等结果评审，阻塞恢复等计划评审。 */
const IMPLIED_WAIT: Partial<Record<StageStatus, WaitingReason>> = { doing: "result_review", blocked: "plan_review" };

function waitReasonFor(stage: PlanFileStage, input: StageRuntimeUpdate): WaitingReason | undefined {
  const cur = stage.runtime;
  return input.waiting_reason ?? (cur.status === "waiting_user" ? cur.waiting_reason : IMPLIED_WAIT[cur.status]);
}

/**
 * 执行完成的路由由框架决定而不是执行器：doing 状态请求完成时，
 * 有后置评审就进 waiting_user(result_review)，没有就直接 done。
 */
function routeExecutionCompletion(stage: PlanFileStage, input: StageRuntimeUpdate): StageRuntimeUpdate {
  if (stage.runtime.status !== "doing") return input;
  const reason = waitReasonFor(stage, input);
  const requestsCompletion = input.status === "done" || (input.status === "waiting_user" && reason === "result_review");
  if (!requestsCompletion) return input;
  if (hasPostReview(stage.contract)) return { ...input, status: "waiting_user", waiting_reason: "result_review" };
  const routed: StageRuntimeUpdate = { ...input, status: "done" };
  delete routed.waiting_reason;
  return routed;
}

function assertRuntimeTransition(stage: PlanFileStage, input: StageRuntimeUpdate): void {
  const prev = stage.runtime.status;
  const next = input.status;
  if (prev === next) return;
  if (prev === "done") throw new PlanError(`Stage ${stage.id} is done and cannot return to ${next}.`, "invalid");
  if (next === "done") {
    const acceptedResult = prev === "waiting_user" && stage.runtime.waiting_reason === "result_review";
    const completedWithoutReview = prev === "doing" && !hasPostReview(stage.contract);
    if (!acceptedResult && !completedWithoutReview) {
      const reason = stage.runtime.waiting_reason ? `(${stage.runtime.waiting_reason})` : "";
      throw new PlanError(`Stage ${stage.id} cannot reach done from ${prev}${reason}.`, "invalid");
    }
    if (acceptedResult && !hasPostReview(stage.contract)) {
      throw new PlanError(`Stage ${stage.id} has no after_execution review checks.`, "invalid");
    }
    return;
  }
  if (prev === "waiting_user" && stage.runtime.waiting_reason === "plan_review" && next === "doing") {
    if (!hasPreReview(stage.contract)) {
      throw new PlanError(`Stage ${stage.id} has no before_execution review checks.`, "invalid");
    }
  }
  if (next === "waiting_user") {
    const reason = waitReasonFor(stage, input);
    if (!reason) throw new PlanError(`Stage ${stage.id} must include waiting_reason when entering waiting_user.`, "invalid");
    if (prev === "doing" && reason !== "result_review") {
      throw new PlanError(`Stage ${stage.id} must enter waiting_user(result_review) after execution.`, "invalid");
    }
    if (reason === "plan_review" && !hasPreReview(stage.contract)) {
      throw new PlanError(`Stage ${stage.id} has no before_execution review checks.`, "invalid");
    }
    if (reason === "result_review" && !hasPostReview(stage.contract)) {
      throw new PlanError(`Stage ${stage.id} has no after_execution review checks.`, "invalid");
    }
    return;
  }
  const hasBlockReason = Boolean(input.blocked_reason?.trim()) || Boolean(stage.runtime.blocked_reason);
  if (next === "blocked" && !hasBlockReason) {
    throw new PlanError(`Stage ${stage.id} must include blocked_reason when entering blocked.`, "invalid");
  }
}

/** 一批 runtime 更新整体校验、整体提交；任何一条不合法就都不写。 */
export async function updateStageRuntimes(
  projectRoot: string,
  planId: string,
  inputs: StageRuntimeUpdate[],
  options: { expected_revision?: number; validate?: (plan: PlanFile) => void } = {},
): Promise<{ plan: PlanFile; updated: { stage: PlanFileStage; previous_status: StageStatus }[] }> {
  if (inputs.length === 0) throw new PlanError("Provide at least one stage update.", "invalid");
  return withPlanLock(projectRoot, planId, async () => {
    const plan = await loadPlan(projectRoot, planId);
    assertRevision(plan, options.expected_revision);
    const seen = new Set<string>();
    const selected: { index: number; input: StageRuntimeUpdate }[] = [];
    for (const input of inputs) {
      if (Boolean(input.stage_id) === (input.order !== undefined)) {
        throw new PlanError("Each update must provide exactly one of stage_id or order.", "invalid");
      }
      const index = input.stage_id
        ? plan.stages.findIndex((s) => s.id === input.stage_id)
        : plan.stages.findIndex((s) => s.order === input.order);
      const stage = plan.stages[index];
      if (!stage) throw new PlanError(`Stage not found: ${input.stage_id ?? `order ${input.order}`}`, "stage_not_found");
      if (seen.has(stage.id)) throw new PlanError(`Stage ${stage.id} appears more than once in updates.`, "invalid");
      seen.add(stage.id);
      const actual = stage.runtime.status;
      if (input.expected_status !== undefined && actual !== input.expected_status) {
        throw new PlanError(`Stage ${stage.id} status is ${stage.runtime.status}, expected ${input.expected_status}.`, "invalid");
      }
      assertOutputIdsDeclared(stage, input.outputs);
      const routed = routeExecutionCompletion(stage, input);
      assertRuntimeTransition(stage, routed);
      selected.push({ index, input: routed });
    }
    const updated: { stage: PlanFileStage; previous_status: StageStatus }[] = [];
    for (const { index, input } of selected) {
      const stage = plan.stages[index] as PlanFileStage;
      const previous_status = stage.runtime.status;
      const runtime: StageRuntime = { ...stage.runtime, status: input.status };
      if (input.status === "waiting_user") runtime.waiting_reason = waitReasonFor(stage, input);
      else delete runtime.waiting_reason;
      if (input.status === "blocked") {
        const reason = input.blocked_reason?.trim();
        if (reason) runtime.blocked_reason = reason;
        runtime.failed_item_ids = input.failed_item_ids;
      } else {
        delete runtime.blocked_reason;
        delete runtime.failed_item_ids;
      }
      if (input.outputs && input.outputs.length > 0) {
        const current = [...(runtime.runtime_refs ?? [])];
        const superseded = [...(runtime.superseded_runtime_refs ?? [])];
        for (const o of input.outputs) {
          const item = outputToItem(o);
          const at = current.findIndex((c) => refIdOf(c) === o.id);
          if (at >= 0) {
            const [prev] = current.splice(at, 1, item);
            if (prev) superseded.push(prev);
          } else {
            current.push(item);
          }
        }
        runtime.runtime_refs = current;
        if (superseded.length) runtime.superseded_runtime_refs = superseded;
      }
      if (input.note) runtime.note = input.note;
      plan.stages[index] = { ...stage, runtime };
      updated.push({ stage: plan.stages[index] as PlanFileStage, previous_status });
    }
    options.validate?.(plan);
    plan.revision += 1;
    return { plan: await persist(projectRoot, planId, plan), updated };
  });
}

// ── 给执行器看的扁平视图 ──

const scalarStr = (v: unknown) => (typeof v === "string" ? v : String(v));

/** item 拍平成 string→string：数组写成 "[a, b]"，嵌套对象的键提到顶层。 */
export function flattenItem(item: PlanItem): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(item)) {
    if (Array.isArray(value)) {
      out[key] = `[${value.map(scalarStr).join(", ")}]`;
    } else if (value !== null && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) out[k] = Array.isArray(v) ? `[${v.map(scalarStr).join(", ")}]` : scalarStr(v);
    } else {
      out[key] = scalarStr(value);
    }
  }
  return out;
}

export function flattenItems(items: PlanItem[] | undefined): Record<string, string>[] {
  return (items ?? []).map(flattenItem);
}

// ── Replan ──

export interface ReplanRequest {
  request_id: string;
  expected_revision: number;
  workflow_path?: string;
  workflow_variant?: string;
  preserve_through_stage_id?: string;
  reason: string;
  operations: StoreReplanOperation[];
  resume_stage_id?: string;
}

export interface ReplanOperationSummary {
  revised_stage_ids: string[];
  inserted_stage_ids: string[];
  outlined_stage_ids: string[];
  omitted_stage_ids: string[];
  removed_stage_ids: string[];
}

export interface ReplanResult {
  state: "applied";
  plan: PlanFile;
  replayed: boolean;
  workflow_path?: string;
  workflow_variant?: string;
  impact: ReplanImpact;
  operation_summary: ReplanOperationSummary;
  resume_stage_id?: string;
  operation_digest: string;
}

function nonEmpty(value: string | undefined, field: string): string {
  const v = value?.trim() ?? "";
  if (!v) throw new PlanError(`${field} must not be empty.`, "invalid");
  return v;
}

function workItemId(item: PlanItem): string | undefined {
  return typeof item.id === "string" && item.id.trim() ? item.id.trim() : undefined;
}

/** 执行身份：去掉 id / name 后的内容；只有 modality 的空壳不算。 */
function workItemExecutionIdentity(item: PlanItem): string | undefined {
  const { id: _id, name: _name, ...rest } = item;
  if (!Object.keys(rest).some((k) => k !== "modality")) return undefined;
  return canonKey(rest);
}

function workItemsByIdentity(items: PlanItem[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const item of items) {
    const id = workItemId(item);
    const identity = workItemExecutionIdentity(item);
    if (!id || !identity) continue;
    m.set(identity, [...(m.get(identity) ?? []), id]);
  }
  return m;
}

/**
 * 内容没变却换了 id 的 work item 会被当成新产物、白白作废已有输出。
 * 一对一可唯一匹配时拒绝，并告诉 agent 用回旧 id。
 */
function assertStableWorkItemIds(stage: PlanFileStage, revised: StageContract, operationIndex: number): void {
  const beforeItems = stage.contract.work_items ?? [];
  const afterItems = revised.work_items ?? [];
  const beforeIds = new Set(beforeItems.flatMap((i) => workItemId(i) ?? []));
  const afterIds = new Set(afterItems.flatMap((i) => workItemId(i) ?? []));
  const afterByIdentity = workItemsByIdentity(afterItems);
  const churn = [...workItemsByIdentity(beforeItems).entries()].flatMap(([identity, prevIds]) => {
    const nextIds = afterByIdentity.get(identity) ?? [];
    if (prevIds.length !== 1 || nextIds.length !== 1) return [];
    const previousId = prevIds[0];
    const revisedId = nextIds[0];
    if (!previousId || !revisedId || previousId === revisedId || afterIds.has(previousId) || beforeIds.has(revisedId)) return [];
    return [{ previousId, revisedId }];
  });
  if (churn.length === 0) return;
  const replacements = churn.map((c) => `${c.revisedId} -> ${c.previousId}`);
  throw new PlanError(
    `Stage ${stage.id} replaces stable work item ids without changing their execution content: ${replacements.join(", ")}.`,
    "invalid",
    {
      code: "WORK_ITEM_ID_CHURN",
      operation_index: operationIndex,
      entity: { type: "stage", id: stage.id },
      allowed_actions: ["reuse_existing_work_item_id"],
      recommended_action: {
        operation: "reuse_existing_work_item_id",
        description: `Reuse the existing ids in the revised contract: ${replacements.join(", ")}.`,
      },
      retryable: true,
      requires_reread: false,
      issues: churn.map(({ previousId, revisedId }) => ({
        stage_id: stage.id,
        work_item_id: revisedId,
        field: "work_items[].id",
        message: `Work item ${revisedId} uniquely matches existing logical output ${previousId}.`,
        recommended_action: {
          operation: "reuse_existing_work_item_id",
          description: `Replace ${revisedId} with ${previousId} in the revised contract.`,
        },
      })),
    },
  );
}

function operationTargetId(op: StoreReplanOperation): string {
  return op.type === "insert_stage" || op.type === "insert_stage_outline" ? op.stage.stage_id : op.stage_id;
}

function existingStageIdGuidance(stageId: string, operationIndex: number, authored: boolean): PlanErrorGuidance {
  const operation = authored === true ? "revise_stage" : "author_pending_stage";
  return {
    code: "STAGE_ID_ALREADY_EXISTS",
    operation_index: operationIndex,
    entity: { type: "stage", id: stageId },
    allowed_actions: [operation, "choose_unique_stage_id"],
    recommended_action: authored
      ? { operation, description: "If this is the same authored deliverable, keep its stable Stage id and revise its contract." }
      : {
          operation,
          description: "Keep the existing pending outline id, finish Replan without inserting it, then author it when it reaches the frontier.",
        },
    retryable: true,
    requires_reread: false,
  };
}

/** 请求摘要：同一 request_id 重放时靠它判断载荷是否一致。 */
function operationDigest(req: ReplanRequest): string {
  const payload = {
    request_id: req.request_id,
    workflow_path: req.workflow_path,
    workflow_variant: req.workflow_variant,
    preserve_through_stage_id: req.preserve_through_stage_id,
    reason: req.reason,
    operations: req.operations,
    resume_stage_id: req.resume_stage_id,
  };
  return createHash("sha256").update(JSON.stringify(canonValue(payload))).digest("hex");
}

const posInOutline = (plan: PlanFile, id: string) => plan.stage_outline.find((i) => i.id === id)?.order ?? -1;
const stageById = (plan: PlanFile, id: string) => plan.stages.find((s) => s.id === id);
function activeOutlineItem(plan: PlanFile, id: string) {
  const item = plan.stage_outline.find((c) => c.id === id);
  return !item || item.omitted ? undefined : item;
}

function requireDonePrefix(plan: PlanFile, preserveOrder: number): void {
  for (const outline of plan.stage_outline) {
    if (outline.order > preserveOrder) break;
    if (outline.omitted === true) continue;
    const stage = stageById(plan, outline.id);
    if (!stage) throw new PlanError(`Preserved prefix contains an unauthored Stage: ${outline.id}.`, "invalid");
    if (stage.runtime.status !== "done") {
      throw new PlanError(
        `Preserved prefix Stage ${stage.id} is not accepted; every active Stage through the boundary must be done.`,
        "invalid",
      );
    }
  }
}

/** replan 不能换工作流：已绑定就必须一致；老文件没绑定时用请求里的补上。 */
function bindWorkflow(plan: PlanFile, req: ReplanRequest): { path: string; variant?: string } {
  const conflicts = (bound: string | undefined, asked: string | undefined) => Boolean(bound && asked && bound !== asked);
  const bound = { path: workflowPathOf(plan), variant: workflowVariantOf(plan) };
  const asked = { path: req.workflow_path?.trim(), variant: req.workflow_variant?.trim() };
  if (conflicts(bound.path, asked.path)) {
    throw new PlanError(`Replan workflow mismatch: plan is bound to ${bound.path}, request selected ${asked.path}.`, "invalid");
  }
  if (conflicts(bound.variant, asked.variant)) {
    throw new PlanError(`Replan workflow variant mismatch: plan is bound to ${bound.variant}, request selected ${asked.variant}.`, "invalid");
  }
  const p = bound.path ?? asked.path;
  if (!p) throw new PlanError("Replan requires the workflow selected when the plan was authored.", "invalid");
  const variant = bound.variant ?? asked.variant;
  plan.workflow = { path: p, ...(variant ? { variant } : {}) };
  return { path: p, ...(variant ? { variant } : {}) };
}

/** 已写 stage 不能 omit，可选的替代做法。 */
const AUTHORED_OMIT_ALTERNATIVES = ["revise_stage", "remove_unexecuted_stage"] as const;

/** 先在大纲副本上模拟一遍所有操作，任何一条不合法都在动文件前拒绝。 */
function validateRequest(plan: PlanFile, req: ReplanRequest): void {
  nonEmpty(req.request_id, "request_id");
  nonEmpty(req.reason, "reason");
  if (!Number.isInteger(req.expected_revision) || req.expected_revision < 0) {
    throw new PlanError("expected_revision must be a non-negative integer.", "invalid");
  }
  if (req.operations.length === 0) throw new PlanError("Replan requires at least one operation.", "invalid");

  const preserveId = req.preserve_through_stage_id;
  const preservedStage = preserveId ? stageById(plan, preserveId) : undefined;
  const preservedOutline = preserveId ? activeOutlineItem(plan, preserveId) : undefined;
  if (preserveId && (!preservedStage || !preservedOutline)) {
    throw new PlanError(`Preserved Stage must be an authored, active Stage: ${preserveId}.`, "stage_not_found");
  }
  if (preservedStage?.runtime.status !== undefined && preservedStage.runtime.status !== "done") {
    throw new PlanError(`Preserved Stage ${preservedStage.id} must be accepted before it can anchor a Replan.`, "invalid");
  }
  const preserveOrder = preservedOutline?.order ?? 0;
  if (preservedOutline) requireDonePrefix(plan, preserveOrder);

  const outline = plan.stage_outline.map((i) => ({ ...i }));
  const authored = new Set(plan.stages.map((s) => s.id));
  // 连续插到同一个锚点后面时，后一个接在前一个后面（保持书写顺序）
  const insertionTails = new Map<string, string>();
  const renumber = () => outline.forEach((item, i) => (item.order = i + 1));
  const seenTargets = new Set<string>();

  for (const [index, op] of req.operations.entries()) {
    const targetId = nonEmpty(operationTargetId(op), "operation stage id");
    if (seenTargets.has(targetId)) {
      throw new PlanError(
        `Stage ${targetId} appears in more than one Replan operation. Combine its change into one operation.`,
        "invalid",
        {
          code: "DUPLICATE_REPLAN_TARGET",
          operation_index: index,
          entity: { type: "stage", id: targetId },
          allowed_actions: ["combine_stage_change"],
          recommended_action: {
            operation: "combine_stage_change",
            description: "Express the complete change for this Stage in one Replan operation.",
          },
          retryable: true,
          requires_reread: false,
        },
      );
    }
    seenTargets.add(targetId);

    if (op.type === "insert_stage_outline" || op.type === "insert_stage") {
      const label = op.type;
      const stageId = nonEmpty(op.stage.stage_id, `${label}.stage.stage_id`);
      const name = nonEmpty(op.stage.name, `${label}.stage.name`);
      if (op.type === "insert_stage") nonEmpty(op.stage.goal, "insert_stage.stage.goal");
      if (outline.some((i) => i.id === stageId)) {
        throw new PlanError(`Stage already exists: ${stageId}`, "duplicate_stage", existingStageIdGuidance(stageId, index, authored.has(stageId)));
      }
      const anchorId = insertionTails.get(op.after_stage_id) ?? op.after_stage_id;
      if (op.type === "insert_stage" && !authored.has(anchorId)) {
        throw new PlanError(`Immediate Stage insertion anchor must already be authored: ${anchorId}.`, "invalid");
      }
      const anchorIndex = outline.findIndex((i) => i.id === anchorId && i.omitted !== true);
      if (anchorIndex < 0) throw new PlanError(`Insertion anchor Stage not found or omitted: ${op.after_stage_id}.`, "stage_not_found");
      if ((outline[anchorIndex]?.order ?? -1) < preserveOrder) {
        throw new PlanError(`Replan insertion must be after preserved Stage ${preserveId}.`, "invalid");
      }
      outline.splice(anchorIndex + 1, 0, { id: stageId, order: anchorIndex + 2, name });
      if (op.type === "insert_stage") authored.add(stageId);
      insertionTails.set(op.after_stage_id, stageId);
      renumber();
      continue;
    }

    const outlineIndex = outline.findIndex((i) => i.id === op.stage_id && i.omitted !== true);
    if (outlineIndex < 0) throw new PlanError(`Stage not found or omitted: ${op.stage_id}`, "stage_not_found");
    if ((outline[outlineIndex]?.order ?? -1) <= preserveOrder) {
      throw new PlanError(`Replan can only change stages after preserved Stage ${preserveId ?? "the beginning"}.`, "invalid");
    }

    if (op.type === "revise_stage") {
      if (!authored.has(op.stage_id)) {
        throw new PlanError(`Unauthored Stage ${op.stage_id} must be authored instead of revised.`, "invalid", {
          code: "UNAUTHORED_STAGE_REVISE",
          operation_index: index,
          entity: { type: "stage", id: op.stage_id },
          allowed_actions: ["author_pending_stage"],
          recommended_action: {
            operation: "author_pending_stage",
            description: "Remove this revise operation, keep the pending outline entry, then author it when it reaches the frontier.",
          },
          retryable: true,
          requires_reread: false,
        });
      }
      nonEmpty(op.stage.goal, "revise_stage.stage.goal");
      const current = stageById(plan, op.stage_id);
      if (current) assertStableWorkItemIds(current, op.stage.contract, index);
    }
    if (op.type === "omit_stage") {
      if (authored.has(op.stage_id)) {
        throw new PlanError(`Authored Stage ${op.stage_id} cannot be omitted; use remove_unexecuted_stage.`, "invalid", {
          code: "AUTHORED_STAGE_OMIT",
          operation_index: index,
          entity: { type: "stage", id: op.stage_id },
          allowed_actions: [...AUTHORED_OMIT_ALTERNATIVES],
          recommended_action: {
            operation: "remove_unexecuted_stage",
            description: "Remove the Stage only if execution has not started; otherwise revise its stable contract.",
          },
          retryable: true,
          requires_reread: false,
        });
      }
      outline[outlineIndex] = { ...(outline[outlineIndex] as (typeof outline)[number]), omitted: true };
    }
    if (op.type === "remove_unexecuted_stage") {
      if (!authored.has(op.stage_id)) {
        throw new PlanError(`Unauthored Stage ${op.stage_id} must be omitted instead of removed.`, "invalid", {
          code: "UNAUTHORED_STAGE_REMOVE",
          operation_index: index,
          entity: { type: "stage", id: op.stage_id },
          allowed_actions: ["omit_stage"],
          recommended_action: {
            operation: "omit_stage",
            description: "Omit the pending outline entry instead of removing an authored Stage.",
          },
          retryable: true,
          requires_reread: false,
        });
      }
      authored.delete(op.stage_id);
      outline.splice(outlineIndex, 1);
      renumber();
    }
  }
}

function normalizeOrders(plan: PlanFile): void {
  const orderById = new Map<string, number>();
  plan.stage_outline = plan.stage_outline.map((item, i) => {
    orderById.set(item.id, i + 1);
    return { ...item, order: i + 1 };
  });
  plan.stages = plan.stages
    .map((s) => {
      const order = orderById.get(s.id);
      if (!order) throw new PlanError(`Stage ${s.id} is missing from stage_outline.`, "invalid");
      return { ...s, order };
    })
    .sort((a, b) => a.order - b.order);
}

/** 依赖只能指向更早、未省略的 stage，且不能成环。 */
function assertDependencyGraph(plan: PlanFile): void {
  const outlineById = new Map(plan.stage_outline.map((i) => [i.id, i]));
  for (const stage of plan.stages) {
    for (const depId of stage.contract.depends_on ?? []) {
      const dep = outlineById.get(depId);
      if (!dep || dep.omitted) throw new PlanError(`Stage ${stage.id} depends on missing or omitted Stage ${depId}.`, "invalid");
      if (dep.order >= stage.order) throw new PlanError(`Stage ${stage.id} dependency ${depId} must appear earlier in the workflow.`, "invalid");
    }
  }
  const stageMap = new Map(plan.stages.map((s) => [s.id, s]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new PlanError(`Replan creates a dependency cycle at Stage ${id}.`, "invalid");
    visiting.add(id);
    for (const depId of stageMap.get(id)?.contract.depends_on ?? []) if (stageMap.has(depId)) visit(depId);
    visiting.delete(id);
    visited.add(id);
  };
  for (const s of plan.stages) visit(s.id);
}

interface DraftPlan {
  plan: PlanFile;
  changed: Set<string>;
  inserted: Set<string>;
  omitted: Set<string>;
  removed: Set<string>;
}

function applyOperations(plan: PlanFile, req: ReplanRequest): DraftPlan {
  const draft = structuredClone(plan);
  const changed = new Set<string>();
  const inserted = new Set<string>();
  const omitted = new Set<string>();
  const removed = new Set<string>();
  const insertionTails = new Map<string, string>();

  for (const [index, op] of req.operations.entries()) {
    if (op.type === "revise_stage") {
      const stage = draft.stages.find((s) => s.id === op.stage_id);
      const outline = activeOutlineItem(draft, op.stage_id);
      if (!stage || !outline) throw new PlanError(`Stage not found: ${op.stage_id}`, "stage_not_found");
      draft.stages = draft.stages.map((s) =>
        s.id === op.stage_id
          ? { ...s, goal: nonEmpty(op.stage.goal, "revise_stage.stage.goal"), contract: structuredClone(op.stage.contract) }
          : s,
      );
      if (op.stage.name !== undefined) outline.name = nonEmpty(op.stage.name, "revise_stage.stage.name");
      changed.add(op.stage_id);
      continue;
    }
    if (op.type === "insert_stage_outline" || op.type === "insert_stage") {
      const anchorId = insertionTails.get(op.after_stage_id) ?? op.after_stage_id;
      if (op.type === "insert_stage" && !draft.stages.some((s) => s.id === anchorId)) {
        throw new PlanError(`Immediate Stage insertion anchor must already be authored: ${anchorId}.`, "invalid");
      }
      const anchorIndex = draft.stage_outline.findIndex((i) => i.id === anchorId && i.omitted !== true);
      if (anchorIndex < 0) throw new PlanError(`Insertion anchor Stage not found: ${op.after_stage_id}`, "stage_not_found");
      const stageId = nonEmpty(op.stage.stage_id, `${op.type}.stage.stage_id`);
      if (op.type === "insert_stage_outline" && draft.stage_outline.some((i) => i.id === stageId)) {
        throw new PlanError(`Stage already exists: ${stageId}`, "duplicate_stage");
      }
      draft.stage_outline.splice(anchorIndex + 1, 0, {
        id: stageId,
        order: anchorIndex + 2,
        name: nonEmpty(op.stage.name, `${op.type}.stage.name`),
      });
      if (op.type === "insert_stage") {
        draft.stages.push({
          id: stageId,
          order: anchorIndex + 2,
          goal: nonEmpty(op.stage.goal, "insert_stage.stage.goal"),
          contract: structuredClone(op.stage.contract),
          runtime: startingRuntime(op.stage.contract),
        });
      }
      changed.add(stageId);
      inserted.add(stageId);
      insertionTails.set(op.after_stage_id, stageId);
      continue;
    }
    const outline = activeOutlineItem(draft, op.stage_id);
    if (!outline) throw new PlanError(`Stage not found: ${op.stage_id}`, "stage_not_found");
    if (op.type === "omit_stage") {
      if (draft.stages.some((s) => s.id === op.stage_id)) throw new PlanError(`Authored Stage cannot be omitted: ${op.stage_id}`, "invalid");
      outline.omitted = true;
      changed.add(op.stage_id);
      omitted.add(op.stage_id);
      continue;
    }
    const stageIndex = draft.stages.findIndex((s) => s.id === op.stage_id);
    const target = draft.stages[stageIndex];
    if (!target) throw new PlanError(`Stage not found: ${op.stage_id}`, "stage_not_found");
    const rt = target.runtime;
    // 有任何执行痕迹就不许删：输出、失败、重试、已完成/阻塞/等待结果评审
    const started =
      (rt.runtime_refs?.length ?? 0) > 0 ||
      (rt.failures?.length ?? 0) > 0 ||
      (rt.failed_item_ids?.length ?? 0) > 0 ||
      (rt.retry_count ?? 0) > 0 ||
      rt.status === "done" ||
      rt.status === "blocked" ||
      (rt.status === "waiting_user" && rt.waiting_reason === "result_review");
    if (started) {
      throw new PlanError(`Stage ${op.stage_id} has started execution and cannot be removed by Replan.`, "invalid", {
        code: "STAGE_ALREADY_STARTED",
        operation_index: index,
        entity: { type: "stage", id: op.stage_id },
        current_state: { status: rt.status, has_execution_evidence: true },
        allowed_actions: ["revise_stage"],
        recommended_action: {
          operation: "revise_stage",
          description: "Keep the stable Stage id and submit its complete revised contract.",
        },
        retryable: true,
        requires_reread: false,
      });
    }
    draft.stages.splice(stageIndex, 1);
    draft.stage_outline = draft.stage_outline.filter((i) => i.id !== op.stage_id);
    changed.add(op.stage_id);
    removed.add(op.stage_id);
  }
  normalizeOrders(draft);
  assertDependencyGraph(draft);
  return { plan: draft, changed, inserted, omitted, removed };
}

function sortedIds(before: PlanFile, after: PlanFile, ids: Iterable<string>): string[] {
  const orderOf = (id: string) => (posInOutline(after, id) >= 0 ? posInOutline(after, id) : posInOutline(before, id));
  return [...new Set(ids)].sort((a, b) => orderOf(a) - orderOf(b));
}

/** 保留前缀之后的每个 stage 做 runtime 对账，汇总影响面。 */
function reconcileSuffix(before: PlanFile, draft: DraftPlan, preserveThroughStageId: string | undefined): ReplanImpact {
  const preserveOrder = preserveThroughStageId ? posInOutline(before, preserveThroughStageId) : 0;
  const preserved = before.stages
    .filter((s) => s.order <= preserveOrder && draft.plan.stages.some((c) => c.id === s.id))
    .map((s) => s.id);
  const invalidated = new Set<string>();
  for (const stage of draft.plan.stages) {
    if (stage.order <= preserveOrder) continue;
    const r = reconcileStageRuntime(before, draft.plan, stage.id);
    stage.runtime = r.runtime;
    if (r.reset || draft.inserted.has(stage.id)) invalidated.add(stage.id);
  }
  for (const stage of before.stages) {
    if (stage.order > preserveOrder && !draft.plan.stages.some((c) => c.id === stage.id)) invalidated.add(stage.id);
  }
  const resume = draft.plan.stage_outline
    .filter((i) => i.omitted !== true && i.order > preserveOrder)
    .sort((a, b) => a.order - b.order)
    .find((i) => stageById(draft.plan, i.id)?.runtime.status !== "done")?.id;
  return {
    ...(preserveThroughStageId ? { preserve_through_stage_id: preserveThroughStageId } : {}),
    changed_stage_ids: sortedIds(before, draft.plan, draft.changed),
    invalidated_stage_ids: sortedIds(before, draft.plan, invalidated),
    preserved_stage_ids: sortedIds(before, draft.plan, preserved),
    ...(resume ? { resume_stage_id: resume } : {}),
  };
}

function operationSummary(ops: StoreReplanOperation[]): ReplanOperationSummary {
  const s: ReplanOperationSummary = {
    revised_stage_ids: [],
    inserted_stage_ids: [],
    outlined_stage_ids: [],
    omitted_stage_ids: [],
    removed_stage_ids: [],
  };
  for (const op of ops) {
    if (op.type === "revise_stage") s.revised_stage_ids.push(op.stage_id);
    if (op.type === "insert_stage") s.inserted_stage_ids.push(op.stage.stage_id);
    if (op.type === "insert_stage_outline") s.outlined_stage_ids.push(op.stage.stage_id);
    if (op.type === "omit_stage") s.omitted_stage_ids.push(op.stage_id);
    if (op.type === "remove_unexecuted_stage") s.removed_stage_ids.push(op.stage_id);
  }
  return s;
}

function replayResult(plan: PlanFile, entry: ReplanAuditEntry): ReplanResult {
  return {
    state: "applied",
    plan,
    replayed: true,
    ...(entry.workflow_path ? { workflow_path: entry.workflow_path } : {}),
    ...(entry.workflow_variant ? { workflow_variant: entry.workflow_variant } : {}),
    impact: structuredClone(entry.impact),
    operation_summary: operationSummary(entry.operations),
    ...(entry.impact.resume_stage_id ? { resume_stage_id: entry.impact.resume_stage_id } : {}),
    operation_digest: entry.operation_digest,
  };
}

/**
 * 原子 replan。同一 request_id 且载荷一致、plan 还停在当时的 revision → 重放保存的结果
 * （agent 重试不会重复改计划）；plan 已前进 → 让调用方重读。
 */
export async function replanPlan(
  projectRoot: string,
  planId: string,
  req: ReplanRequest,
  options: { now?: () => Date; validate?: (plan: PlanFile) => void } = {},
): Promise<ReplanResult> {
  return withPlanLock(projectRoot, planId, async () => {
    const plan = await loadPlan(projectRoot, planId);
    const digest = operationDigest(req);
    const previous = plan.replan_history?.find((e) => e.request_id === req.request_id);
    if (previous) {
      if (previous.operation_digest !== digest) {
        throw new PlanError(`Replan request ${req.request_id} was already applied with a different payload.`, "invalid");
      }
      if (plan.revision !== previous.revision) {
        throw new PlanError(
          `Replan request ${req.request_id} was already applied at revision ${previous.revision}, but the plan has advanced to revision ${plan.revision}; reread the current plan before deciding whether a new replan is needed.`,
          "revision_conflict",
        );
      }
      return replayResult(plan, previous);
    }
    assertRevision(plan, req.expected_revision);
    const workflow = bindWorkflow(plan, req);
    validateRequest(plan, req);
    const draft = applyOperations(plan, req);
    const impact = reconcileSuffix(plan, draft, req.preserve_through_stage_id);
    if (req.resume_stage_id) {
      const resumeOrder = posInOutline(draft.plan, req.resume_stage_id);
      const preserveOrder = req.preserve_through_stage_id ? posInOutline(draft.plan, req.preserve_through_stage_id) : 0;
      if (resumeOrder <= preserveOrder || !activeOutlineItem(draft.plan, req.resume_stage_id)) {
        throw new PlanError(`Resume Stage ${req.resume_stage_id} is not active after the preserved prefix.`, "invalid");
      }
      impact.resume_stage_id = req.resume_stage_id;
    }
    const nextRevision = plan.revision + 1;
    const candidate = draft.plan;
    candidate.revision = nextRevision;
    const entry: ReplanAuditEntry = {
      request_id: req.request_id,
      operation_digest: digest,
      workflow_path: workflow.path,
      ...(workflow.variant ? { workflow_variant: workflow.variant } : {}),
      ...(req.preserve_through_stage_id ? { preserve_through_stage_id: req.preserve_through_stage_id } : {}),
      reason: req.reason.trim(),
      operations: structuredClone(req.operations),
      impact: structuredClone(impact),
      previous_revision: plan.revision,
      revision: nextRevision,
      applied_at: (options.now?.() ?? new Date()).toISOString(),
    };
    candidate.replan_history = [...(candidate.replan_history ?? []), entry].slice(-MAX_REPLAN_HISTORY_ENTRIES);
    options.validate?.(PlanFileSchema.parse(candidate));
    const persisted = await persist(projectRoot, planId, candidate);
    return {
      state: "applied",
      plan: persisted,
      replayed: false,
      workflow_path: workflow.path,
      ...(workflow.variant ? { workflow_variant: workflow.variant } : {}),
      impact,
      operation_summary: operationSummary(req.operations),
      ...(impact.resume_stage_id ? { resume_stage_id: impact.resume_stage_id } : {}),
      operation_digest: digest,
    };
  });
}
