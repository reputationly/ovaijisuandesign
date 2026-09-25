import { z } from "zod";

/**
 * Stage Execution Plan 的数据形状。
 *
 * 两层：planner 写入时的形状（StagePlanSchema / PlanStageSchema，扁平的 stage 字段），
 * 和落盘的文件形状（PlanFileSchema：每个 stage 拆成 planner 拥有的 contract
 * 与编排器拥有的 runtime）。拆开是为了 planner 改计划时不会覆盖执行进度。
 */

export const PLAN_STAGE_STATUSES = ["waiting_user", "doing", "done", "blocked"] as const;
export const PLAN_WAITING_REASONS = ["plan_review", "result_review"] as const;
export type StageStatus = (typeof PLAN_STAGE_STATUSES)[number];
export type WaitingReason = (typeof PLAN_WAITING_REASONS)[number];
export const PLAN_SCHEMA_VERSION = 1;

const SINGLE_LINE_MESSAGE =
  "has to fit on one line (no line breaks). For longer or multi-line content, use a string field on a work item instead, e.g. prompt or execution_excerpt.";
const INLINE_LIST_MEMBER_MESSAGE =
  'list members cannot include ",", "]" or line breaks. Break the value into separate members, or put long text in a dedicated work item string field.';

// 单行约束：看板 / 摘要按行渲染，换行会把结构撑坏
const singleLine = (s: z.ZodString) => s.refine((v) => !v.includes("\n"), { message: SINGLE_LINE_MESSAGE });
const InlineListMemberString = z.string().refine((v) => !/[,\]\n]/.test(v), { message: INLINE_LIST_MEMBER_MESSAGE });

/** stage 必须对应一条未省略、order 相同的大纲项。 */
function outlineAccepts(outline: { order: number; omitted?: boolean } | undefined, order: number): boolean {
  return outline !== undefined && outline.order === order && outline.omitted !== true;
}

const StageReviewSchema = z.object({
  before_execution: z.array(singleLine(z.string().min(1))).optional(),
  after_execution: z.array(singleLine(z.string().min(1))).optional(),
});

const ScalarSchema = z.union([z.string(), z.number(), z.boolean()]);
const SingleLineScalarSchema = ScalarSchema.refine((v) => typeof v !== "string" || !v.includes("\n"), {
  message: SINGLE_LINE_MESSAGE,
});
// 列表成员会被拍平成 "[a, b]" 字符串给执行器看，所以不能含分隔符
const InlineListMemberSchema = ScalarSchema.refine((v) => typeof v !== "string" || !/[,\]\n]/.test(v), {
  message: INLINE_LIST_MEMBER_MESSAGE,
});
const ItemFieldValueSchema = z.union([
  ScalarSchema,
  z.array(InlineListMemberSchema),
  z.record(z.string(), z.union([ScalarSchema, z.array(InlineListMemberSchema)])),
]);

export type Scalar = string | number | boolean;
export type ItemFieldValue = Scalar | Scalar[] | Record<string, Scalar | Scalar[]>;
export type PlanItem = Record<string, ItemFieldValue>;

/** 这些是 runtime 的字段，planner 不能借 stage_fields 写进来。 */
const RESERVED_RUNTIME_STAGE_FIELDS = new Set([
  "status",
  "waiting_reason",
  "approval",
  "blocked_reason",
  "failed_item_ids",
  "runtime_refs",
  "superseded_runtime_refs",
  "failures",
  "retry_count",
  "overrides",
  "note",
]);

const PlannerStageFieldsSchema = z.record(z.string(), SingleLineScalarSchema).superRefine((fields, ctx) => {
  for (const key of Object.keys(fields)) {
    if (!RESERVED_RUNTIME_STAGE_FIELDS.has(key)) continue;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [key],
      message: `${key} belongs to the runtime state; stage_fields cannot set it.`,
    });
  }
});

export const PlanItemSchema = z.record(z.string(), ItemFieldValueSchema);

const WorkflowBindingSchema = z
  .object({
    path: singleLine(z.string().min(1)),
    variant: singleLine(z.string().min(1)).optional(),
  })
  .strict();

/** planner 写的一个 stage。runtime_refs 故意不在这里 —— 输出只能经 plan_update_stage_state 写入。 */
export const PlanStageSchema = z
  .object({
    stage_id: singleLine(z.string().min(1)).describe("Stable stage id."),
    order: z.number().int().min(1),
    goal: singleLine(z.string().min(1)),
    depends_on: z.array(InlineListMemberString).optional(),
    review: StageReviewSchema.optional(),
    stage_fields: PlannerStageFieldsSchema.optional(),
    work_items: z.array(PlanItemSchema).optional(),
    constraints: z.array(PlanItemSchema).optional(),
    execution_locks: z.array(PlanItemSchema).optional(),
    ref_capsules: z.array(PlanItemSchema).optional(),
    execution_excerpt: z.string().optional(),
  })
  .strict();
export type PlanStageInput = z.infer<typeof PlanStageSchema>;

const StageOutlineItemSchema = z
  .object({
    id: singleLine(z.string().min(1)),
    order: z.number().int().min(1),
    name: singleLine(z.string().min(1).max(40)),
    omitted: z.boolean().optional(),
  })
  .strict();

export const StagePlanSchema = z
  .object({
    title: singleLine(z.string()).optional().describe('Plan document title; defaults to "Stage Execution Plan".'),
    header_fields: z.record(z.string(), SingleLineScalarSchema).optional(),
    workflow: WorkflowBindingSchema.optional(),
    sources: z
      .array(PlanItemSchema)
      .optional()
      .describe("Top-level external source artifacts such as uploaded scripts, briefs, or refs."),
    stage_outline: z
      .array(StageOutlineItemSchema)
      .min(1)
      .describe("Complete ordered Stage skeleton. name is the user-facing Production Board label."),
    stages: z.array(PlanStageSchema).min(1),
  })
  .superRefine((plan, ctx) => {
    const byId = new Map<string, z.infer<typeof StageOutlineItemSchema>>();
    const orders = new Set<number>();
    plan.stage_outline.forEach((item, index) => {
      if (item.order !== index + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stage_outline", index, "order"],
          message: `stage_outline entry at position ${index + 1} needs order ${index + 1}.`,
        });
      }
      if (byId.has(item.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["stage_outline", index, "id"], message: `Stage id ${item.id} is used more than once.` });
      }
      if (orders.has(item.order)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stage_outline", index, "order"],
          message: `Stage order ${item.order} is used more than once.`,
        });
      }
      byId.set(item.id, item);
      orders.add(item.order);
    });
    plan.stages.forEach((stage, index) => {
      const outline = byId.get(stage.stage_id);
      if (!outlineAccepts(outline, stage.order)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stages", index, "stage_id"],
          message: `Stage ${stage.stage_id} (order ${stage.order}) has no active stage_outline entry with the same id and order.`,
        });
      }
    });
  });

export const StageContractSchema = z
  .object({
    depends_on: z.array(InlineListMemberString).optional(),
    review: StageReviewSchema.optional(),
    stage_fields: z.record(z.string(), SingleLineScalarSchema).optional(),
    work_items: z.array(PlanItemSchema).optional(),
    constraints: z.array(PlanItemSchema).optional(),
    execution_locks: z.array(PlanItemSchema).optional(),
    ref_capsules: z.array(PlanItemSchema).optional(),
    execution_excerpt: z.string().optional(),
  })
  .strict();
export type StageContract = z.infer<typeof StageContractSchema>;

const StageRuntimeSchema = z
  .object({
    status: z.enum(PLAN_STAGE_STATUSES),
    waiting_reason: z.enum(PLAN_WAITING_REASONS).optional(),
    blocked_reason: z.string().min(1).optional(),
    failed_item_ids: z.array(singleLine(z.string().min(1))).optional(),
    runtime_refs: z.array(PlanItemSchema).optional(),
    superseded_runtime_refs: z.array(PlanItemSchema).optional(),
    failures: z.array(PlanItemSchema).optional(),
    retry_count: z.number().int().min(0).optional(),
    // 只在运行时生效的覆盖（如换模型重试），不改 contract 里的锁定
    overrides: z.record(z.string(), SingleLineScalarSchema).optional(),
    note: z.string().optional(),
  })
  .superRefine((rt, ctx) => {
    if (rt.status === "waiting_user" && !rt.waiting_reason) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["waiting_reason"], message: "status waiting_user needs a waiting_reason." });
    }
    if (rt.status === "blocked" && !rt.blocked_reason) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["blocked_reason"], message: "status blocked needs a blocked_reason." });
    }
  });
export type StageRuntime = z.infer<typeof StageRuntimeSchema>;

const PlanFileStageSchema = z.object({
  id: singleLine(z.string().min(1)),
  order: z.number().int().min(1),
  goal: singleLine(z.string().min(1)),
  contract: StageContractSchema,
  runtime: StageRuntimeSchema,
});
export type PlanFileStage = z.infer<typeof PlanFileStageSchema>;

const ReplanStageSnapshotSchema = z
  .object({
    stage_id: singleLine(z.string().min(1)).optional(),
    name: singleLine(z.string().min(1).max(40)).optional(),
    goal: singleLine(z.string().min(1)),
    contract: StageContractSchema,
  })
  .strict();

const InsertOutlineOpSchema = z
  .object({
    type: z.literal("insert_stage_outline"),
    after_stage_id: singleLine(z.string().min(1)),
    stage: z.object({ stage_id: singleLine(z.string().min(1)), name: singleLine(z.string().min(1).max(40)) }).strict(),
  })
  .strict();
const OmitOpSchema = z.object({ type: z.literal("omit_stage"), stage_id: singleLine(z.string().min(1)) }).strict();
const RemoveOpSchema = z.object({ type: z.literal("remove_unexecuted_stage"), stage_id: singleLine(z.string().min(1)) }).strict();

/** 落盘到 replan_history 的操作快照（store 层形状：revise 带 stage_id + contract）。 */
export const PlanReplanOperationSnapshotSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("revise_stage"), stage_id: singleLine(z.string().min(1)), stage: ReplanStageSnapshotSchema }).strict(),
  z
    .object({
      type: z.literal("insert_stage"),
      after_stage_id: singleLine(z.string().min(1)),
      stage: ReplanStageSnapshotSchema.extend({
        stage_id: singleLine(z.string().min(1)),
        name: singleLine(z.string().min(1).max(40)),
      }),
    })
    .strict(),
  InsertOutlineOpSchema,
  OmitOpSchema,
  RemoveOpSchema,
]);
export type StoreReplanOperation = z.infer<typeof PlanReplanOperationSnapshotSchema>;

const ReplanAuthoredStageInputSchema = PlanStageSchema.omit({ order: true }).extend({
  name: singleLine(z.string().min(1).max(40)).optional(),
});

/** plan_replan 的入参操作：revise / insert 用和 plan_patch_stage 一样的扁平 stage 字段。 */
export const PlanReplanOperationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("revise_stage"), stage: ReplanAuthoredStageInputSchema }).strict(),
  z
    .object({
      type: z.literal("insert_stage"),
      after_stage_id: singleLine(z.string().min(1)),
      stage: ReplanAuthoredStageInputSchema.extend({ name: singleLine(z.string().min(1).max(40)) }),
    })
    .strict(),
  InsertOutlineOpSchema,
  OmitOpSchema,
  RemoveOpSchema,
]);
export type ToolReplanOperation = z.infer<typeof PlanReplanOperationSchema>;

const ReplanImpactSchema = z.object({
  preserve_through_stage_id: singleLine(z.string().min(1)).optional(),
  changed_stage_ids: z.array(z.string().min(1)),
  invalidated_stage_ids: z.array(z.string().min(1)),
  preserved_stage_ids: z.array(z.string().min(1)),
  resume_stage_id: z.string().min(1).optional(),
});
export type ReplanImpact = z.infer<typeof ReplanImpactSchema>;

const ReplanAuditEntrySchema = z.object({
  request_id: z.string().min(1),
  operation_digest: z.string().min(1),
  workflow_path: z.string().min(1).optional(),
  workflow_variant: z.string().min(1).optional(),
  preserve_through_stage_id: z.string().min(1).optional(),
  reason: z.string().min(1),
  operations: z.array(PlanReplanOperationSnapshotSchema),
  impact: ReplanImpactSchema,
  previous_revision: z.number().int().min(0),
  revision: z.number().int().min(1),
  applied_at: z.string().min(1),
});
export type ReplanAuditEntry = z.infer<typeof ReplanAuditEntrySchema>;

export const PlanFileSchema = z
  .object({
    schema_version: z.literal(PLAN_SCHEMA_VERSION),
    revision: z.number().int().min(0),
    title: singleLine(z.string()).optional(),
    header_fields: z.record(z.string(), SingleLineScalarSchema).optional(),
    workflow: WorkflowBindingSchema.optional(),
    sources: z.array(PlanItemSchema).optional(),
    stage_outline: z.array(StageOutlineItemSchema).min(1),
    stages: z.array(PlanFileStageSchema).min(1),
    replan_history: z.array(ReplanAuditEntrySchema).optional(),
  })
  .superRefine((plan, ctx) => {
    const byId = new Map(plan.stage_outline.map((item) => [item.id, item]));
    const ids = new Set<string>();
    const orders = new Set<number>();
    plan.stage_outline.forEach((item, index) => {
      if (item.order !== index + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stage_outline", index, "order"],
          message: `stage_outline entry at position ${index + 1} needs order ${index + 1}.`,
        });
      }
      if (ids.has(item.id) || orders.has(item.order)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["stage_outline", index], message: "Every stage_outline id and order has to be unique." });
      }
      ids.add(item.id);
      orders.add(item.order);
    });
    plan.stages.forEach((stage, index) => {
      const outline = byId.get(stage.id);
      if (!outlineAccepts(outline, stage.order)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stages", index, "id"],
          message: `Stage ${stage.id} (order ${stage.order}) has no active stage_outline entry with the same id and order.`,
        });
      }
    });
  });
export type PlanFile = z.infer<typeof PlanFileSchema>;
export type StageOutlineItem = PlanFile["stage_outline"][number];

// ── contract 上的判定 ──

const nonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

function hasReviewChecks(checks: readonly string[] | undefined): boolean {
  return Boolean(checks?.some((c) => c.trim().length > 0));
}
export const hasPreReview = (c: StageContract | undefined) => hasReviewChecks(c?.review?.before_execution);
export const hasPostReview = (c: StageContract | undefined) => hasReviewChecks(c?.review?.after_execution);

function isPrewrittenDocItem(item: PlanItem): boolean {
  if (item.modality !== "document") return false;
  if (nonEmptyString(item.document_node_id)) return true;
  const source = item.source;
  return isRecord(source) && nonEmptyString(source.document_node_id);
}

/** planner 已经把文档直接写成画布节点的 stage：没有执行器要跑，只剩结果评审。 */
export function isPrewrittenDocContract(c: StageContract | undefined): boolean {
  const items = c?.work_items;
  return Boolean(items?.length && items.every(isPrewrittenDocItem));
}

/** 新 stage 的初始状态：前置评审 → 等用户；无评审 → 直接执行；已物化的文档 → 看后置评审。 */
export function startingRuntime(c: StageContract): StageRuntime {
  if (isPrewrittenDocContract(c)) {
    return hasPostReview(c) ? { status: "waiting_user", waiting_reason: "result_review" } : { status: "done" };
  }
  return hasPreReview(c) ? { status: "waiting_user", waiting_reason: "plan_review" } : { status: "doing" };
}

export function toContract(stage: Omit<PlanStageInput, "order" | "stage_id" | "goal">): StageContract {
  return {
    depends_on: stage.depends_on,
    review: stage.review,
    stage_fields: stage.stage_fields,
    work_items: stage.work_items,
    constraints: stage.constraints,
    execution_locks: stage.execution_locks,
    ref_capsules: stage.ref_capsules,
    execution_excerpt: stage.execution_excerpt,
  };
}

export function toFileStage(stage: PlanStageInput): PlanFileStage {
  const contract = toContract(stage);
  return { id: stage.stage_id, order: stage.order, goal: stage.goal, contract, runtime: startingRuntime(contract) };
}

// ── plan 上的判定 ──

export type Frontier =
  | { kind: "pending"; outline: StageOutlineItem }
  | { kind: "authored"; outline: StageOutlineItem; stage: PlanFileStage };

/** 执行前沿：按大纲顺序第一个未写（pending）或未完成（authored）的 stage。 */
export function findFrontier(plan: PlanFile): Frontier | undefined {
  const authored = new Map(plan.stages.map((s) => [s.id, s]));
  for (const outline of [...plan.stage_outline].sort((a, b) => a.order - b.order)) {
    if (outline.omitted) continue;
    const stage = authored.get(outline.id);
    if (!stage) return { kind: "pending", outline };
    const unfinished = stage.runtime.status !== "done";
    if (unfinished) return { kind: "authored", outline, stage };
  }
  return undefined;
}

export function workflowPathOf(plan: Pick<PlanFile, "workflow" | "header_fields">): string | undefined {
  const v = plan.workflow?.path ?? plan.header_fields?.workflow_path;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export function workflowVariantOf(plan: Pick<PlanFile, "workflow">): string | undefined {
  const v = plan.workflow?.variant;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

// ── 结构守卫（读盘时先过一遍宽松检查，再过 PlanFileSchema） ──

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function isWorkflowBinding(v: unknown): boolean {
  return isRecord(v) && nonEmptyString(v.path) && (v.variant === undefined || nonEmptyString(v.variant));
}

function isReplanOperation(v: unknown): boolean {
  if (!isRecord(v)) return false;
  const type = v.type;
  if (
    type !== "revise_stage" &&
    type !== "insert_stage" &&
    type !== "insert_stage_outline" &&
    type !== "omit_stage" &&
    type !== "remove_unexecuted_stage"
  ) {
    return false;
  }
  if (type === "insert_stage" || type === "insert_stage_outline") {
    const stage = v.stage;
    if (!isRecord(stage)) return false;
    return (
      nonEmptyString(v.after_stage_id) &&
      nonEmptyString(stage.stage_id) &&
      nonEmptyString(stage.name) &&
      (type === "insert_stage_outline" || (nonEmptyString(stage.goal) && Boolean(stage.contract)))
    );
  }
  if (type === "revise_stage") {
    const stage = v.stage;
    if (!isRecord(stage)) return false;
    return nonEmptyString(v.stage_id) && nonEmptyString(stage.goal) && Boolean(stage.contract);
  }
  return nonEmptyString(v.stage_id);
}

function isReplanImpact(v: unknown): boolean {
  if (!isRecord(v)) return false;
  const idList = (items: unknown) => Array.isArray(items) && items.every(nonEmptyString);
  return (
    (v.preserve_through_stage_id === undefined || nonEmptyString(v.preserve_through_stage_id)) &&
    idList(v.changed_stage_ids) &&
    idList(v.invalidated_stage_ids) &&
    idList(v.preserved_stage_ids) &&
    (v.resume_stage_id === undefined || nonEmptyString(v.resume_stage_id))
  );
}

const isNonNegInt = (v: unknown, min: number) => typeof v === "number" && Number.isInteger(v) && v >= min;

function isReplanAuditEntry(v: unknown): boolean {
  if (!isRecord(v)) return false;
  const optStr = (x: unknown) => x === undefined || nonEmptyString(x);
  return (
    nonEmptyString(v.request_id) &&
    nonEmptyString(v.operation_digest) &&
    optStr(v.workflow_path) &&
    optStr(v.workflow_variant) &&
    optStr(v.preserve_through_stage_id) &&
    nonEmptyString(v.reason) &&
    Array.isArray(v.operations) &&
    v.operations.every(isReplanOperation) &&
    isReplanImpact(v.impact) &&
    isNonNegInt(v.previous_revision, 0) &&
    isNonNegInt(v.revision, 1) &&
    nonEmptyString(v.applied_at)
  );
}

export function isPlanFile(value: unknown): value is PlanFile {
  if (!isRecord(value)) return false;
  const outline = value.stage_outline;
  const stages = value.stages;
  if (!Array.isArray(outline) || outline.length === 0 || !Array.isArray(stages) || stages.length === 0) return false;
  const ids = new Set<unknown>();
  const orders = new Set<unknown>();
  const validOutline = outline.every((raw, index) => {
    const s = isRecord(raw) ? raw : {};
    const ok =
      typeof s.id === "string" &&
      s.id.length > 0 &&
      s.order === index + 1 &&
      typeof s.name === "string" &&
      s.name.length > 0 &&
      s.name.length <= 40 &&
      (s.omitted === undefined || typeof s.omitted === "boolean") &&
      !ids.has(s.id) &&
      !orders.has(s.order);
    ids.add(s.id);
    orders.add(s.order);
    return ok;
  });
  if (!validOutline) return false;
  if (value.schema_version !== PLAN_SCHEMA_VERSION || !isNonNegInt(value.revision, 0)) return false;
  if (value.workflow !== undefined && !isWorkflowBinding(value.workflow)) return false;
  if (value.replan_history !== undefined && !(Array.isArray(value.replan_history) && value.replan_history.every(isReplanAuditEntry))) {
    return false;
  }
  return stages.every((raw) => {
    if (!isRecord(raw)) return false;
    const rt = isRecord(raw.runtime) ? raw.runtime : undefined;
    const status = rt?.status;
    return (
      typeof raw.id === "string" &&
      raw.id.length > 0 &&
      isNonNegInt(raw.order, 1) &&
      typeof raw.goal === "string" &&
      raw.goal.length > 0 &&
      Boolean(raw.contract) &&
      Boolean(rt) &&
      typeof status === "string" &&
      (PLAN_STAGE_STATUSES as readonly string[]).includes(status) &&
      (status !== "waiting_user" ||
        (typeof rt?.waiting_reason === "string" && (PLAN_WAITING_REASONS as readonly string[]).includes(rt.waiting_reason))) &&
      outline.some((o) => isRecord(o) && o.id === raw.id && o.order === raw.order && o.omitted !== true) &&
      (status !== "blocked" || (typeof rt?.blocked_reason === "string" && rt.blocked_reason.length > 0))
    );
  });
}
