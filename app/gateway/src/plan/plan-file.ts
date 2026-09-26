import { randomBytes } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";

import { withFileLock } from "../common/file-lock.js";

/**
 * 阶段计划文件 `<工作区>/.hilo/plan/<id>.json` 的读、审阅视图和工作项修改。
 *
 * 计划由 MCP 的 plan 工具创建和推进，这里只做两件事：把文件拍平成看板要的审阅模型，以及用户在
 * "等待审阅计划"时改某几个工作项的提示词 / 引用。写入和 MCP 共用同一把锁（计划目录下的
 * `.<id>.lock-target`），读 → 校验 revision → 改 → 写临时文件 → 改名，revision +1。
 */

const PLAN_SCHEMA_VERSION = 1;
const STAGE_PLAN_STATUSES = ["waiting_user", "doing", "done", "blocked"] as const;
const STAGE_PLAN_WAITING_REASONS = ["plan_review", "result_review"] as const;
const LOCK_OPTS = { staleMs: 10_000, waitMs: 30_000, retryMs: 25 };

type Scalar = string | number | boolean;
type ItemFieldValue = Scalar | Scalar[] | Record<string, Scalar | Scalar[]>;
export type PlanItem = Record<string, ItemFieldValue>;

export interface StageContract {
  depends_on?: string[];
  work_items?: PlanItem[];
  ref_capsules?: PlanItem[];
  execution_locks?: PlanItem[];
  stage_fields?: Record<string, Scalar>;
  review?: { before_execution?: string[]; after_execution?: string[] };
  [k: string]: unknown;
}

export interface StageRuntime {
  status: string;
  waiting_reason?: string;
  blocked_reason?: string;
  failed_item_ids?: string[];
  runtime_refs?: PlanItem[];
  note?: string;
  [k: string]: unknown;
}

export interface PlanStage {
  id: string;
  order: number;
  goal: string;
  contract: StageContract;
  runtime: StageRuntime;
}

export interface OutlineItem {
  id: string;
  order: number;
  name: string;
  omitted?: boolean;
}

export interface PlanFile {
  schema_version: number;
  revision: number;
  title?: string;
  sources?: PlanItem[];
  stage_outline: OutlineItem[];
  stages: PlanStage[];
  workflow?: unknown;
  replan_history?: unknown[];
  [k: string]: unknown;
}

export type PlanStoreErrorCode = "invalid" | "not_found" | "revision_conflict" | "stage_not_found" | "item_not_found";

export class PlanStoreError extends Error {
  constructor(
    message: string,
    readonly code: PlanStoreErrorCode = "invalid",
  ) {
    super(message);
    this.name = "PlanStoreError";
  }
}

export function planFilePath(projectRoot: string, planId: string): string {
  // plan id 直接拼进文件名，带路径分隔符就能写出目录
  if (!planId || /[\\/]/.test(planId)) throw new Error(`Invalid stagePlanId for plan file path: ${JSON.stringify(planId)}`);
  return path.join(projectRoot, ".hilo", "plan", `${planId}.json`);
}

const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const hasChecks = (checks?: string[]) => Boolean(checks?.some((c) => c.trim().length > 0));
const requiresBeforeReview = (c?: StageContract) => hasChecks(c?.review?.before_execution);
const requiresAfterReview = (c?: StageContract) => hasChecks(c?.review?.after_execution);

/** planner 预先写好的文档工作项（直接挂到了文档节点上），不需要再执行就算产出了。 */
function isMaterializedDocumentItem(item: Record<string, unknown>): boolean {
  if (item.modality !== "document") return false;
  if (nonEmpty(item.document_node_id)) return true;
  return isObj(item.source) && nonEmpty(item.source.document_node_id);
}

function isMaterializedDocumentContract(c?: StageContract): boolean {
  const items = c?.work_items;
  return Boolean(items?.length && items.every((i) => isMaterializedDocumentItem(i)));
}

function isReplanOperation(v: unknown): boolean {
  if (!isObj(v)) return false;
  const type = v.type;
  if (type === "insert_stage" || type === "insert_stage_outline") {
    if (!isObj(v.stage)) return false;
    return nonEmpty(v.after_stage_id) && nonEmpty(v.stage.stage_id) && nonEmpty(v.stage.name) && (type === "insert_stage_outline" || (nonEmpty(v.stage.goal) && Boolean(v.stage.contract)));
  }
  if (type === "revise_stage") return isObj(v.stage) && nonEmpty(v.stage_id) && nonEmpty(v.stage.goal) && Boolean(v.stage.contract);
  if (type === "omit_stage" || type === "remove_unexecuted_stage") return nonEmpty(v.stage_id);
  return false;
}

function isReplanAuditEntry(v: unknown): boolean {
  if (!isObj(v)) return false;
  const idList = (items: unknown) => Array.isArray(items) && items.every(nonEmpty);
  const optStr = (x: unknown) => x === undefined || nonEmpty(x);
  const impact = v.impact;
  const impactOk =
    isObj(impact) &&
    optStr(impact.preserve_through_stage_id) &&
    idList(impact.changed_stage_ids) &&
    idList(impact.invalidated_stage_ids) &&
    idList(impact.preserved_stage_ids) &&
    optStr(impact.resume_stage_id);
  return (
    nonEmpty(v.request_id) &&
    nonEmpty(v.operation_digest) &&
    optStr(v.workflow_path) &&
    optStr(v.workflow_variant) &&
    optStr(v.preserve_through_stage_id) &&
    nonEmpty(v.reason) &&
    Array.isArray(v.operations) &&
    v.operations.every(isReplanOperation) &&
    impactOk &&
    Number.isInteger(v.previous_revision) &&
    (v.previous_revision as number) >= 0 &&
    Number.isInteger(v.revision) &&
    (v.revision as number) >= 1 &&
    nonEmpty(v.applied_at)
  );
}

/** 结构校验：大纲序号连续不重复、每个已展开的阶段都在大纲里、状态合法、等待 / 阻塞都有原因。 */
export function isPlanFile(value: unknown): value is PlanFile {
  if (!isObj(value)) return false;
  const c = value as Partial<PlanFile>;
  const ids = new Set<string>();
  const orders = new Set<number>();
  const outlineOk = Boolean(
    Array.isArray(c.stage_outline) &&
      c.stage_outline.every((s, i) => {
        const ok =
          typeof s.id === "string" &&
          s.id.length > 0 &&
          s.order === i + 1 &&
          typeof s.name === "string" &&
          s.name.length > 0 &&
          s.name.length <= 40 &&
          (s.omitted === undefined || typeof s.omitted === "boolean") &&
          !ids.has(s.id) &&
          !orders.has(s.order);
        ids.add(s.id);
        orders.add(s.order);
        return ok;
      }),
  );
  const workflowOk = c.workflow === undefined || (isObj(c.workflow) && nonEmpty(c.workflow.path) && (c.workflow.variant === undefined || nonEmpty(c.workflow.variant)));
  return (
    c.schema_version === PLAN_SCHEMA_VERSION &&
    Number.isInteger(c.revision) &&
    (c.revision as number) >= 0 &&
    Array.isArray(c.stage_outline) &&
    c.stage_outline.length > 0 &&
    outlineOk &&
    workflowOk &&
    (c.replan_history === undefined || (Array.isArray(c.replan_history) && c.replan_history.every(isReplanAuditEntry))) &&
    Array.isArray(c.stages) &&
    c.stages.length > 0 &&
    c.stages.every((s) => {
      if (!isObj(s)) return false;
      const rt = s.runtime as StageRuntime | undefined;
      return (
        typeof s.id === "string" &&
        s.id.length > 0 &&
        Number.isInteger(s.order) &&
        s.order >= 1 &&
        typeof s.goal === "string" &&
        s.goal.length > 0 &&
        Boolean(s.contract) &&
        Boolean(rt) &&
        typeof rt?.status === "string" &&
        (STAGE_PLAN_STATUSES as readonly string[]).includes(rt.status) &&
        (rt.status !== "waiting_user" || (typeof rt.waiting_reason === "string" && (STAGE_PLAN_WAITING_REASONS as readonly string[]).includes(rt.waiting_reason))) &&
        c.stage_outline!.some((o) => o.id === s.id && o.order === s.order && o.omitted !== true) &&
        (rt.status !== "blocked" || (typeof rt.blocked_reason === "string" && rt.blocked_reason.length > 0))
      );
    })
  );
}

/** 老版本文件里的 todo / approval 等运行时字段迁到当前状态机（和 MCP 读文件时同一套规则）。 */
function migrateLegacyRuntimeFields(value: unknown): unknown {
  if (!isObj(value) || !Array.isArray(value.stages)) return value;
  for (const raw of value.stages) {
    if (!isObj(raw)) continue;
    const stage = raw as unknown as PlanStage;
    const rt = stage.runtime as StageRuntime & { approval?: unknown };
    if (!rt) continue;
    delete rt.approval;
    if (rt.status === "todo") {
      if (isMaterializedDocumentContract(stage.contract)) {
        rt.status = requiresAfterReview(stage.contract) ? "waiting_user" : "done";
        rt.waiting_reason = rt.status === "waiting_user" ? "result_review" : undefined;
      } else {
        rt.status = requiresBeforeReview(stage.contract) ? "waiting_user" : "doing";
        rt.waiting_reason = rt.status === "waiting_user" ? "plan_review" : undefined;
      }
    }
    if (rt.status === "waiting_user") {
      const hasOutputs = Array.isArray(rt.runtime_refs) && rt.runtime_refs.length > 0;
      const reason = isMaterializedDocumentContract(stage.contract)
        ? "result_review"
        : rt.waiting_reason === "result_review" || (!rt.waiting_reason && hasOutputs)
          ? "result_review"
          : "plan_review";
      if (reason === "plan_review" && !requiresBeforeReview(stage.contract)) {
        rt.status = "doing";
        rt.waiting_reason = undefined;
      } else if (reason === "result_review" && !requiresAfterReview(stage.contract)) {
        rt.status = "done";
        rt.waiting_reason = undefined;
      } else rt.waiting_reason = reason;
    } else if (rt.status === "blocked" && !rt.blocked_reason) {
      rt.blocked_reason = typeof rt.note === "string" && rt.note.trim() ? rt.note.trim() : "Stage execution is blocked; inspect failures and choose how to continue.";
    }
  }
  return value;
}

export async function readPlanFile(projectRoot: string, planId: string): Promise<PlanFile> {
  let raw: string;
  try {
    raw = await fs.readFile(planFilePath(projectRoot, planId), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") throw new PlanStoreError(`Stage plan not found: ${planId}`, "not_found");
    throw err;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new PlanStoreError(`Stage plan file is not valid JSON: ${planId}`);
  }
  parsed = migrateLegacyRuntimeFields(parsed);
  if (!isPlanFile(parsed)) throw new PlanStoreError(`Stage plan file failed schema validation: ${planId}`);
  return parsed;
}

function withPlanLock<T>(projectRoot: string, planId: string, fn: () => Promise<T>): Promise<T> {
  // 锁旁路文件而不是计划本身：计划文件不存在时也要能锁住"创建"。
  return withFileLock(path.join(projectRoot, ".hilo", "plan", `.${planId}.lock-target`), LOCK_OPTS, fn);
}

async function persistPlanFile(projectRoot: string, planId: string, plan: PlanFile): Promise<PlanFile> {
  if (!isPlanFile(plan)) throw new PlanStoreError(`Refusing to persist an invalid stage plan: ${planId}`);
  const dir = path.join(projectRoot, ".hilo", "plan");
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `.${planId}.${randomBytes(4).toString("hex")}.tmp`);
  try {
    await fs.writeFile(tmp, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    await fs.rename(tmp, planFilePath(projectRoot, planId));
  } catch (err) {
    await fs.rm(tmp, { force: true });
    throw err;
  }
  return plan;
}

// ── 审阅视图 ──

const scalarStr = (v: Scalar) => (typeof v === "string" ? v : String(v));

/** 工作项拍平成字符串字典：数组写成 `[a, b]`，嵌套对象的键提到顶层。看板按字符串渲染。 */
function planItemToFlat(item: PlanItem): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(item)) {
    if (Array.isArray(value)) out[key] = `[${value.map(scalarStr).join(", ")}]`;
    else if (value !== null && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) out[k] = Array.isArray(v) ? `[${v.map(scalarStr).join(", ")}]` : scalarStr(v);
    } else out[key] = scalarStr(value);
  }
  return out;
}

const flatList = (items?: PlanItem[]) => (items ?? []).map(planItemToFlat);
const normalizeStatus = (v: string) => ((STAGE_PLAN_STATUSES as readonly string[]).includes(v) ? v : "blocked");

function addReferenceLabels(labels: Record<string, string>, items?: PlanItem[]): void {
  for (const item of items ?? []) {
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const contributes = typeof item.contributes === "string" ? item.contributes.trim() : "";
    const inferred = contributes.split(/[，,。.;；]/, 1)[0]?.trim() ?? "";
    if (id && (name || inferred)) labels[id] = name || inferred;
  }
}

function addReferenceItems(refs: Record<string, Record<string, string>>, items?: PlanItem[]): void {
  for (const item of items ?? []) {
    const flat = planItemToFlat(item);
    const id = flat.id?.trim();
    if (id) refs[id] = { ...refs[id], ...flat };
  }
}

/** 一个阶段能引用到的东西：计划来源 + 所有上游阶段（递归）+ 本阶段的引用胶囊、工作项、产出。 */
function collectStageReferences<T>(plan: PlanFile, stage: PlanStage, acc: T, add: (acc: T, items?: PlanItem[]) => void): T {
  const visited = new Set<string>();
  add(acc, plan.sources);
  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const dep = plan.stages.find((s) => s.id === id);
    if (!dep) return;
    for (const ancestor of dep.contract.depends_on ?? []) visit(ancestor);
    add(acc, dep.contract.ref_capsules);
    add(acc, dep.contract.work_items);
    add(acc, dep.runtime.runtime_refs);
  };
  for (const id of stage.contract.depends_on ?? []) visit(id);
  add(acc, stage.contract.ref_capsules);
  add(acc, stage.contract.work_items);
  add(acc, stage.runtime.runtime_refs);
  return acc;
}

function planStageFrontier(plan: PlanFile): { kind: "pending"; outline: OutlineItem } | { kind: "authored"; outline: OutlineItem; stage: PlanStage } | undefined {
  const byId = new Map(plan.stages.map((s) => [s.id, s]));
  for (const outline of [...plan.stage_outline].sort((a, b) => a.order - b.order)) {
    if (outline.omitted) continue;
    const stage = byId.get(outline.id);
    if (!stage) return { kind: "pending", outline };
    if (stage.runtime.status !== "done") return { kind: "authored", outline, stage };
  }
  return undefined;
}

export function planFileToReviewModel(plan: PlanFile) {
  const outlineById = new Map(plan.stage_outline.map((o) => [o.id, o]));
  const stageNames = Object.fromEntries(plan.stage_outline.map((o) => [o.id, o.name]));
  const stages = plan.stages
    .map((stage) => {
      const workItems = flatList(stage.contract.work_items);
      const runtimeRefs = flatList(stage.runtime.runtime_refs);
      const producedIds = new Set(runtimeRefs.map((r) => r.id).filter(Boolean));
      return {
        id: stage.id,
        order: stage.order,
        name: outlineById.get(stage.id)?.name ?? stage.id,
        goal: stage.goal,
        status: normalizeStatus(stage.runtime.status),
        waiting_reason: stage.runtime.waiting_reason,
        blocked_reason: stage.runtime.blocked_reason,
        failed_item_ids: stage.runtime.failed_item_ids,
        review: stage.contract.review,
        stage_fields: stage.contract.stage_fields ? Object.fromEntries(Object.entries(stage.contract.stage_fields).map(([k, v]) => [k, scalarStr(v)])) : undefined,
        execution_locks: flatList(stage.contract.execution_locks),
        depends_on: stage.contract.depends_on ?? [],
        work_items: workItems,
        runtime_refs: runtimeRefs,
        reference_labels: collectStageReferences(plan, stage, {} as Record<string, string>, addReferenceLabels),
        reference_items: collectStageReferences(plan, stage, {} as Record<string, Record<string, string>>, addReferenceItems),
        stage_names: stageNames,
        produced_count: workItems.filter((i) => Boolean(i.id && producedIds.has(i.id)) || isMaterializedDocumentItem(i)).length,
        work_item_count: workItems.length,
      };
    })
    .sort((a, b) => a.order - b.order);
  const frontier = planStageFrontier(plan);
  const nextStage = frontier?.kind === "authored" ? stages.find((s) => s.id === frontier.stage.id) : undefined;
  return {
    revision: plan.revision,
    title: plan.title ?? "Stage Execution Plan",
    sources: flatList(plan.sources),
    stages,
    pending_stages: plan.stage_outline.filter((o) => o.omitted !== true && !plan.stages.some((s) => s.id === o.id)),
    next_stage: nextStage,
    waiting_user: nextStage?.status === "waiting_user",
  };
}

// ── 审阅阶段改工作项 ──

export interface WorkItemPatch {
  item_id: string;
  prompt?: string;
  refs?: string[];
}

export interface ReferenceItemInput {
  id: string;
  name: string;
  modality: string;
  path: string;
  asset_id?: string;
  node_id?: string;
  [k: string]: unknown;
}

const itemId = (item: PlanItem) => (typeof item.id === "string" ? item.id : undefined);

function validatePatch(patch: WorkItemPatch): void {
  if (!patch || typeof patch !== "object") throw new PlanStoreError("Each work item patch must be an object.");
  if (typeof patch.item_id !== "string") throw new PlanStoreError("Work item patch item_id must be a string.");
  if (patch.prompt !== undefined && typeof patch.prompt !== "string") throw new PlanStoreError(`Work item ${patch.item_id} prompt must be a string.`);
  if (patch.refs !== undefined && (!Array.isArray(patch.refs) || patch.refs.some((r) => typeof r !== "string"))) {
    throw new PlanStoreError(`Work item ${patch.item_id} refs must be an array of strings.`);
  }
  if (!patch.item_id.trim()) throw new PlanStoreError("Work item patch requires item_id.");
  if (patch.prompt === undefined && patch.refs === undefined) throw new PlanStoreError(`Work item ${patch.item_id} patch has no editable fields.`);
  if (patch.prompt !== undefined && !patch.prompt.trim()) throw new PlanStoreError(`Work item ${patch.item_id} prompt cannot be empty.`);
  if (patch.refs) {
    const normalized = patch.refs.map((r) => r.trim());
    if (normalized.some((r) => !r)) throw new PlanStoreError(`Work item ${patch.item_id} refs cannot contain empty ids.`);
    // refs 在计划文件里会被拍平成 `[a, b]` 字符串，这几个字符会把它拆坏。
    if (normalized.some((r) => /[,\]\n]/.test(r))) throw new PlanStoreError(`Work item ${patch.item_id} refs cannot contain commas, closing brackets, or newlines.`);
    if (new Set(normalized).size !== normalized.length) throw new PlanStoreError(`Work item ${patch.item_id} refs cannot contain duplicates.`);
  }
}

function validateReferenceItem(item: ReferenceItemInput): void {
  if (!item || typeof item !== "object") throw new PlanStoreError("Each reference item must be an object.");
  for (const key of ["id", "name", "modality", "path"] as const) {
    if (typeof item[key] !== "string" || !item[key].trim()) throw new PlanStoreError(`Reference item ${key} must be a non-empty string.`);
  }
  if (/[,\]\n]/.test(item.id)) throw new PlanStoreError("Reference item id cannot contain commas, closing brackets, or newlines.");
  for (const key of ["asset_id", "node_id"] as const) {
    if (item[key] !== undefined && typeof item[key] !== "string") throw new PlanStoreError(`Reference item ${key} must be a string.`);
  }
}

/** 引用 id 在整份计划里是一个命名空间：不能和来源、任何阶段的工作项、别的阶段的引用胶囊重名。 */
function assertReferenceIdAvailable(plan: PlanFile, targetStageIndex: number, referenceId: string): void {
  const conflicts: string[] = [];
  if (plan.sources?.some((s) => itemId(s) === referenceId)) conflicts.push("sources");
  let inTarget = 0;
  plan.stages.forEach((stage, index) => {
    if (stage.contract.work_items?.some((i) => itemId(i) === referenceId)) conflicts.push(`stage ${stage.id} work_items`);
    for (const capsule of stage.contract.ref_capsules ?? []) {
      if (itemId(capsule) !== referenceId) continue;
      if (index === targetStageIndex) inTarget += 1;
      else conflicts.push(`stage ${stage.id} ref_capsules`);
    }
  });
  if (inTarget > 1) conflicts.push("duplicate target-stage ref_capsules");
  if (conflicts.length > 0) throw new PlanStoreError(`Reference item ${referenceId} conflicts with the Plan global logical id namespace (${conflicts.join(", ")}).`);
}

/**
 * 审阅计划时改工作项：只允许在 waiting_user(plan_review) 阶段改，只能改提示词和引用；
 * 新引用的素材以引用胶囊的形式补进本阶段。什么都没变就不写盘、不涨 revision。
 */
export async function patchStageWorkItems(
  projectRoot: string,
  planId: string,
  input: { stage_id: string; expected_revision: number; patches: WorkItemPatch[]; reference_items?: ReferenceItemInput[] },
): Promise<{ plan: PlanFile; changed_item_ids: string[] }> {
  if (input.patches.length === 0) throw new PlanStoreError("Provide at least one work item patch.");
  return withPlanLock(projectRoot, planId, async () => {
    const plan = await readPlanFile(projectRoot, planId);
    if (plan.revision !== input.expected_revision) {
      throw new PlanStoreError(
        `Stage plan revision conflict: expected ${input.expected_revision}, found ${plan.revision}. Re-read the plan and retry.`,
        "revision_conflict",
      );
    }
    const stageIndex = plan.stages.findIndex((s) => s.id === input.stage_id);
    const stage = plan.stages[stageIndex];
    if (!stage) throw new PlanStoreError(`Stage not found: ${input.stage_id}`, "stage_not_found");
    if (stage.runtime.status !== "waiting_user" || stage.runtime.waiting_reason !== "plan_review") {
      throw new PlanStoreError(`Stage ${stage.id} is not awaiting plan review; work items are editable only during waiting_user(plan_review).`);
    }
    const workItems = stage.contract.work_items ?? [];
    if (!Array.isArray(workItems)) throw new PlanStoreError(`Stage ${stage.id} has an invalid work_items contract.`);
    const seen = new Set<string>();
    const changed = new Set<string>();
    for (const patch of input.patches) {
      validatePatch(patch);
      if (seen.has(patch.item_id)) throw new PlanStoreError(`Work item ${patch.item_id} appears more than once in patches.`);
      seen.add(patch.item_id);
      const item = workItems.find((c) => itemId(c) === patch.item_id);
      if (!item) throw new PlanStoreError(`Work item not found: ${patch.item_id}`, "item_not_found");
      if (patch.prompt !== undefined && item.prompt !== patch.prompt) {
        item.prompt = patch.prompt;
        changed.add(patch.item_id);
      }
      if (patch.refs !== undefined) {
        const refs = patch.refs.map((r) => r.trim());
        const cur = item.refs;
        if (!(Array.isArray(cur) && cur.length === refs.length && cur.every((e, i) => e === refs[i]))) {
          item.refs = refs;
          delete item.ref_ids;
          changed.add(patch.item_id);
        }
      }
    }
    const referenceItems = input.reference_items ?? [];
    const seenRefs = new Set<string>();
    const capsules = stage.contract.ref_capsules ?? [];
    for (const ref of referenceItems) {
      validateReferenceItem(ref);
      const refId = ref.id.trim();
      if (seenRefs.has(refId)) throw new PlanStoreError(`Reference item ${refId} appears more than once.`);
      seenRefs.add(refId);
      assertReferenceIdAvailable(plan, stageIndex, refId);
      const users = workItems.filter((i) => Array.isArray(i.refs) && (i.refs as Scalar[]).includes(refId));
      if (users.length === 0) throw new PlanStoreError(`Reference item ${refId} is not used by any work item in stage ${stage.id}.`);
      const next: PlanItem = Object.fromEntries(
        Object.entries(ref)
          .filter(([, v]) => typeof v === "string" && v.trim())
          .map(([k, v]) => [k, (v as string).trim()]),
      );
      const existing = capsules.findIndex((c) => itemId(c) === refId);
      const same = existing >= 0 && Object.keys(capsules[existing]!).length === Object.keys(next).length && Object.keys(next).every((k) => capsules[existing]![k] === next[k]);
      if (same) continue;
      if (existing >= 0) capsules[existing] = next;
      else capsules.push(next);
      for (const u of users) {
        const id = itemId(u);
        if (id) changed.add(id);
      }
    }
    if (referenceItems.length > 0) stage.contract.ref_capsules = capsules;
    if (changed.size === 0) return { plan, changed_item_ids: [] };
    plan.revision += 1;
    return { plan: await persistPlanFile(projectRoot, planId, plan), changed_item_ids: [...changed] };
  });
}
