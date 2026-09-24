import { basename } from "node:path";

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import type { GatewayClient } from "../gateway-client.js";
import {
  PLAN_STAGE_STATUSES,
  PLAN_WAITING_REASONS,
  PlanReplanOperationSchema,
  PlanStageSchema,
  findFrontier,
  toContract,
  toFileStage,
  StagePlanSchema,
  workflowPathOf,
  workflowVariantOf,
  type PlanFile,
  type StoreReplanOperation,
  type ToolReplanOperation,
} from "./plan-schema.js";
import {
  generatePlanId,
  flattenItems,
  omitStage,
  upsertStage,
  PlanError,
  loadPlan,
  removeStage,
  replanPlan,
  updateStageRuntimes,
  writeNewPlan,
  type PlanErrorGuidance,
} from "./plan-store.js";
import {
  assertPlanFileValid,
  computeNextAction,
  deriveReplanPreserveThroughStageId,
  fileStageToPublic,
  findReplanPrefixViolation,
  formatValidationFailure,
  parseRefList,
  planStages,
  planValidationError,
  publicStage,
  replanFrontierError,
  stageDetailForExecution,
  validatePlanFile,
  type StageDetail,
  type ValidationIssue,
} from "./plan-validation.js";
import type { RegisterTools } from "./types.js";

/**
 * Stage Execution Plan 的 7 个工具。计划是项目里的 JSON 文件，MCP 进程内加锁读写；
 * 写成功后不等结果地通知 gateway（`POST /api/plan/notify-changed`），看板据此刷新。
 */

/** 单次工具输出上限：再大 agent 上下文就吃不消了，超了让它分批取。 */
const SAFE_OUTPUT_MAX_BYTES = 40 * 1024;
const PROMPTS_OMITTED_NOTICE =
  "Work item prompts were left out because the full Stage detail is larger than the safe output size. Fetch the complete items with hub_plan_get_work_items and the matching work_item_ids.";

const PLAN_ID_DESC = "Stage Execution Plan id: the file stem of `.hilo/plan/<id>.json`, as returned by plan_write.";
const PROJECT_ROOT_DESC =
  "Absolute project root. The runtime fills it in with the active project (the session cwd) when omitted; set it only to address a different project.";
const PROJECT_ROOT_SHORT_DESC = "Absolute project root. The runtime fills it in with the active project (the session cwd) when omitted.";

// ── 回话 ──

/** 统一拼结果：text 默认是 structured 的 JSON；失败时带 isError。 */
function pack(opts: { structured?: Record<string, unknown>; text?: string; failed?: boolean }): CallToolResult {
  const text = opts.text ?? JSON.stringify(opts.structured);
  const out: CallToolResult = { content: [{ type: "text", text }] };
  if (opts.structured) out.structuredContent = opts.structured;
  if (opts.failed) out.isError = true;
  return out;
}

const reply = (structured: Record<string, unknown>) => pack({ structured });

/** 普通失败：消息 + 可选的一行 JSON 上下文。 */
function toolError(message: string, extra: Record<string, unknown> = {}): CallToolResult {
  const lines = [message];
  if (Object.keys(extra).length) lines.push(JSON.stringify(extra));
  return pack({ text: lines.join("\n"), failed: true });
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** replan 的失败带结构化修复建议：agent 据此决定改请求还是先重读。 */
function actionableError(err: unknown, planId: string | undefined): CallToolResult {
  const storeCode = err instanceof PlanError ? err.code : undefined;
  const guidance: PlanErrorGuidance = (err instanceof PlanError ? err.guidance : undefined) ?? {
    code: storeCode?.toUpperCase() ?? "PLAN_OPERATION_FAILED",
    recommended_action: {
      operation: "inspect_error_and_correct_request",
      description: "Fix the request according to the error message, then retry.",
    },
    // 找不到计划重试也没用；revision 冲突要先重读
    retryable: storeCode !== undefined && storeCode !== "not_found",
    requires_reread: storeCode === "revision_conflict",
  };
  const structured = { ok: false, ...(planId ? { plan_id: planId } : {}), error: { message: errorMessage(err), ...guidance } };
  return pack({ structured, failed: true });
}

function updateError(message: string, planId: string | undefined): CallToolResult {
  const structured = { ok: false, ...(planId ? { plan_id: planId } : {}), count: 0, updated: [], errors: [{ message }] };
  return pack({ structured, text: message, failed: true });
}

const outputBytes = (v: unknown) => Buffer.byteLength(JSON.stringify(v), "utf8");

function rootOf(args: { projectRoot?: string }): string {
  return args.projectRoot?.trim() ? args.projectRoot : process.cwd();
}

function pendingOutline(plan: PlanFile) {
  const authored = new Set(plan.stages.map((s) => s.id));
  return plan.stage_outline.filter((s) => !s.omitted && !authored.has(s.id));
}

/** 工具层的 revise/insert 是扁平 stage 字段；store 层要 stage_id + goal + contract。 */
function toStoreOperation(op: ToolReplanOperation): StoreReplanOperation {
  if (op.type === "revise_stage") {
    return {
      type: "revise_stage",
      stage_id: op.stage.stage_id,
      stage: { ...(op.stage.name ? { name: op.stage.name } : {}), goal: op.stage.goal, contract: toContract(op.stage) },
    };
  }
  if (op.type === "insert_stage") {
    return {
      type: "insert_stage",
      after_stage_id: op.after_stage_id,
      stage: { stage_id: op.stage.stage_id, name: op.stage.name, goal: op.stage.goal, contract: toContract(op.stage) },
    };
  }
  return op;
}

// ── 引用素材的缓存分析 ──

const CACHE_FIELD = "read_media_cache";
const CACHE_VER = "semantic-v3";

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const asPixels = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined);

/** 资产 metadata 里 analyse_media 留下的缓存描述，取最新一条。 */
function latestVaultAnalysis(asset: Record<string, unknown>): string | null {
  const cache = asRecord(asRecord(asset.metadata)?.[CACHE_FIELD]);
  if (cache?.version !== CACHE_VER) return null;
  const entries = asRecord(cache.entries);
  if (!entries) return null;
  let best: string | null = null;
  let bestAt = "";
  for (const value of Object.values(entries)) {
    const entry = asRecord(value);
    if (!entry || entry.version !== CACHE_VER) continue;
    const text = entry.text;
    if (typeof text !== "string" || !text) continue;
    const at = String(entry.updated_at ?? "");
    if (best === null || at.localeCompare(bestAt) > 0) {
      best = text;
      bestAt = at;
    }
  }
  return best;
}

interface RefAnalysis {
  ids: string[];
  analysis: string;
  width?: number;
  height?: number;
}

/**
 * 给执行器附上本 stage 用到的引用素材的已有分析（起点参考，不是结论），
 * 省一次多模态调用。资产库读不到就返回空 —— 这是锦上添花，不能挡住读计划。
 */
async function collectStageRefAnalyses(gw: GatewayClient, detail: StageDetail): Promise<RefAnalysis[]> {
  const used = new Set<string>();
  for (const item of detail.work_items) for (const id of parseRefList(item.refs)) used.add(id);
  if (used.size === 0) return [];
  const candidates = new Map<string, string>();
  for (const c of [...detail.sources, ...detail.ref_capsules, ...detail.upstream_ref_capsules, ...detail.runtime_refs, ...detail.upstream_runtime_refs]) {
    const id = c.id;
    const p = c.path;
    if (typeof id === "string" && used.has(id) && typeof p === "string" && p.length > 0 && !candidates.has(id)) candidates.set(id, p);
  }
  if (candidates.size === 0) return [];
  let assets: Record<string, unknown>[];
  try {
    assets = await gw.listAssets({ includeMetadata: true });
  } catch {
    return [];
  }
  const byPath = new Map<string, Record<string, unknown>>();
  const byBase = new Map<string, Record<string, unknown>>();
  const ambiguous = new Set<string>();
  for (const a of assets) {
    const p = typeof a.path === "string" ? a.path : "";
    if (!p) continue;
    byPath.set(p, a);
    const b = basename(p);
    if (byBase.has(b)) ambiguous.add(b);
    else byBase.set(b, a);
  }
  // 同名文件多于一个时按文件名匹配不可靠，只认完整路径
  for (const b of ambiguous) byBase.delete(b);
  const perAsset = new Map<string, { ids: string[]; asset: Record<string, unknown> }>();
  for (const [id, p] of candidates) {
    const asset = byPath.get(p) ?? byBase.get(basename(p));
    if (!asset) continue;
    // 同一资产被多个 ref 指到时合并成一条
    const assetKey = [asset.id, asset.path].find((v): v is string => typeof v === "string" && v.length > 0) ?? p;
    const group = perAsset.get(assetKey);
    if (group) group.ids.push(id);
    else perAsset.set(assetKey, { ids: [id], asset });
  }
  const out: RefAnalysis[] = [];
  for (const { ids, asset } of perAsset.values()) {
    const analysis = latestVaultAnalysis(asset);
    if (!analysis) continue;
    const width = asPixels(asset.width);
    const height = asPixels(asset.height);
    out.push({ ids, analysis, ...(width !== undefined ? { width } : {}), ...(height !== undefined ? { height } : {}) });
  }
  return out;
}

// ── 输出 schema ──

const StageStatusSchema = z.enum(PLAN_STAGE_STATUSES);
const WaitingReasonSchema = z.enum(PLAN_WAITING_REASONS);
const DetailItemSchema = z.record(z.string(), z.string());

const stageShape = {
  id: z.string(),
  order: z.number(),
  goal: z.string(),
  status: StageStatusSchema,
  waiting_reason: WaitingReasonSchema.optional(),
  blocked_reason: z.string().optional(),
  failed_item_ids: z.array(z.string()).optional(),
};
const StageSummarySchema = z.object({ ...stageShape, name: z.string() });
const StageOptionalNameSchema = z.object({ ...stageShape, name: z.string().optional() });
const PendingStageSchema = z.object({ id: z.string(), order: z.number(), name: z.string() });

const ValidationIssueSchema = z.object({
  severity: z.enum(["error", "warning"]),
  category: z.enum(["structure", "document", "dependency", "media", "video", "postprocess", "refs", "defaults"]),
  stage_id: z.string(),
  work_item_id: z.string().optional(),
  field: z.string().optional(),
  message: z.string(),
});
const ValidationDefaultSchema = z.object({
  category: z.literal("defaults"),
  stage_id: z.string(),
  field: z.string(),
  value: z.string(),
  reason: z.string(),
});

const RepairActionSchema = z.object({ operation: z.string(), description: z.string().optional() });
const ActionableErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  operation_index: z.number().int().min(0).optional(),
  entity: z.object({ type: z.enum(["plan", "stage", "runtime_ref"]), id: z.string() }).optional(),
  current_state: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  allowed_actions: z.array(z.string()).optional(),
  recommended_action: RepairActionSchema,
  retryable: z.boolean(),
  requires_reread: z.boolean(),
  issues: z
    .array(
      z.object({
        stage_id: z.string(),
        work_item_id: z.string().optional(),
        field: z.string().optional(),
        message: z.string(),
        recommended_action: RepairActionSchema,
      }),
    )
    .optional(),
});

// ── 入参 schema ──

const RuntimeOutputSchema = z.object({
  id: z.string(),
  node_id: z.string().optional(),
  url: z
    .string()
    .url()
    .refine((v) => /^https?:\/\//i.test(v), "url has to use http:// or https://")
    .optional(),
  path: z.string().optional(),
});

const StageStateUpdateSchema = z.object({
  stage_id: z.string().optional().describe("Id of the stage to update. Give either this or order, not both."),
  order: z.number().int().min(1).optional().describe("Order of the stage to update. Give either this or stage_id, not both."),
  status: StageStatusSchema.describe("Requested stage status."),
  expected_status: StageStatusSchema.optional().describe("Optional guard: the update is rejected if the stage is not currently in this status."),
  waiting_reason: WaitingReasonSchema.optional().describe(
    "Set only when you explicitly want a framework wait. At the end of execution request done instead; the framework checks review.after_execution and returns the resulting state.",
  ),
  blocked_reason: z
    .string()
    .min(1)
    .optional()
    .describe("Mandatory when moving to blocked. Name the specific obstacle so the main agent can put the reason and suggestions to the user."),
  failed_item_ids: z.array(z.string().min(1)).optional(),
  note: z.string().optional().describe("Short runtime note recorded on the stage."),
  outputs: z
    .array(RuntimeOutputSchema)
    .optional()
    .describe(
      "Output refs the stage produced (each id has to be one of its work item ids). A ref whose id already exists takes its place, and the replaced one is kept under superseded_runtime_refs.",
    ),
});

export const registerPlanTools: RegisterTools = (registrar, gw) => {
  registrar.registerTool(
    "plan_get_stage_status",
    {
      description:
        "Structured progress of a Stage Execution Plan; the file body is never included. next_action is about runtime work on stages that are already authored. If none of them needs anything, next_action is absent and pending_stages lists outline entries that still have to be authored; \"complete\" appears only when pending_stages is empty too. On wait_for_user, reply with a short normal chat message and end your turn: the user confirms or revises in chat or on the Production Board, not through the question tool. On blocked, use the question tool, citing blocked_reason and offering concrete choices.",
      inputSchema: {
        plan_id: z.string().describe(PLAN_ID_DESC),
        projectRoot: z.string().optional().describe(PROJECT_ROOT_DESC),
        stage_id: z.string().optional().describe("Optional: only report this stage id."),
        order: z.number().int().min(1).optional().describe("Optional: only report the stage at this order."),
      },
      outputSchema: {
        plan_id: z.string(),
        stage_count: z.number(),
        stages: z.array(StageSummarySchema),
        next_action: z.enum(["wait_for_user", "execute_stage", "blocked", "complete"]).optional(),
        revision: z.number().int().min(1),
        workflow_path: z.string().optional(),
        workflow_variant: z.string().optional(),
        pending_stages: z.array(PendingStageSchema).optional(),
        next_stage: StageSummarySchema.optional(),
        waiting_user: z.boolean(),
      },
    },
    async (args) => {
      try {
        const plan = await loadPlan(rootOf(args), args.plan_id);
        const stages = planStages(plan);
        const selected =
          args.stage_id || args.order !== undefined
            ? stages.filter((s) => (args.stage_id ? s.id === args.stage_id : s.order === args.order))
            : stages;
        const workflowPath = workflowPathOf(plan);
        const workflowVariant = workflowVariantOf(plan);
        return reply({
          plan_id: args.plan_id,
          revision: plan.revision,
          ...(workflowPath ? { workflow_path: workflowPath } : {}),
          ...(workflowVariant ? { workflow_variant: workflowVariant } : {}),
          stage_count: stages.length,
          stages: selected.map(publicStage),
          ...computeNextAction(plan, stages, pendingOutline(plan)),
        });
      } catch (err) {
        return toolError(errorMessage(err));
      }
    },
  );

  registrar.registerTool(
    "plan_get_stage_detail",
    {
      description:
        "Executor view of a single stage of a Stage Execution Plan: the stage, its work items, the source and ref locators its ordered refs point at, constraints, execution locks, runtime refs and ref capsules from direct dependencies, previously cached analyses of referenced assets, the execution excerpt, and can_execute / blocked_reason. Nothing about other stages or the whole plan is returned. When the result would be too big, work item prompts are dropped and a notice tells you to fetch them via plan_get_work_items.",
      inputSchema: {
        plan_id: z.string().describe(PLAN_ID_DESC),
        projectRoot: z.string().optional().describe(PROJECT_ROOT_DESC),
        stage_id: z.string().optional().describe("Id of the stage to read. Required unless order is given."),
        order: z.number().int().min(1).optional().describe("Order of the stage to read. Required unless stage_id is given."),
      },
      outputSchema: {
        plan_id: z.string(),
        stage: StageOptionalNameSchema,
        can_execute: z.boolean(),
        blocked_reason: z.string().optional(),
        depends_on: z.array(z.string()),
        sources: z.array(DetailItemSchema),
        work_items: z.array(DetailItemSchema),
        constraints: z.array(DetailItemSchema),
        execution_locks: z.array(DetailItemSchema),
        ref_capsules: z.array(DetailItemSchema),
        runtime_refs: z.array(DetailItemSchema),
        upstream_ref_capsules: z.array(DetailItemSchema),
        upstream_runtime_refs: z.array(DetailItemSchema),
        ref_analyses: z.array(
          z.object({
            ids: z.array(z.string()),
            analysis: z.string(),
            width: z.number().optional(),
            height: z.number().optional(),
          }),
        ),
        execution_excerpt: z.string(),
        notice: z.string().optional(),
        validation_issues: z.array(ValidationIssueSchema).optional(),
        validation_defaults: z.array(ValidationDefaultSchema).optional(),
      },
    },
    async (args) => {
      try {
        if (!args.stage_id && args.order === undefined) return toolError("Pass stage_id or order to pick a stage.");
        const plan = await loadPlan(rootOf(args), args.plan_id);
        const detail = stageDetailForExecution(plan, args);
        const full = { plan_id: args.plan_id, ...detail, ref_analyses: await collectStageRefAnalyses(gw, detail) };
        if (outputBytes(full) <= SAFE_OUTPUT_MAX_BYTES) return reply(full);
        const light = {
          ...full,
          work_items: full.work_items.map(({ prompt: _prompt, ...rest }) => rest),
          notice: PROMPTS_OMITTED_NOTICE,
        };
        if (outputBytes(light) > SAFE_OUTPUT_MAX_BYTES) {
          return toolError("The stage detail is too large to return even without work item prompts.", {
            plan_id: args.plan_id,
            stage_id: detail.stage.id,
            safe_output_max_bytes: SAFE_OUTPUT_MAX_BYTES,
          });
        }
        return reply(light);
      } catch (err) {
        return toolError(errorMessage(err), { plan_id: args.plan_id });
      }
    },
  );

  registrar.registerTool(
    "plan_get_work_items",
    {
      description:
        "Fetch full work items by id from one stage of a Stage Execution Plan; this is the follow-up when plan_get_stage_detail left the prompts out. Returns just the requested work_items. If they are too large for one response, ask for a smaller set of ids.",
      inputSchema: {
        plan_id: z.string().describe(PLAN_ID_DESC),
        projectRoot: z.string().optional().describe(PROJECT_ROOT_DESC),
        stage_id: z.string().describe("Id of the stage that holds the requested work items."),
        work_item_ids: z
          .array(z.string().min(1))
          .min(1)
          .max(50)
          .describe("Stable ids of the work items wanted. If the response would be too large, retry with fewer."),
      },
      outputSchema: { work_items: z.array(DetailItemSchema) },
    },
    async (args) => {
      try {
        const plan = await loadPlan(rootOf(args), args.plan_id);
        const stage = plan.stages.find((s) => s.id === args.stage_id);
        if (!stage) return toolError(`Unknown Stage: ${args.stage_id}`, { plan_id: args.plan_id });
        const ids = [...new Set(args.work_item_ids)];
        const byId = new Map(flattenItems(stage.contract.work_items).map((i) => [i.id, i]));
        const missing = ids.filter((id) => !byId.has(id));
        if (missing.length > 0) {
          return toolError("Some requested work items are not in this stage.", {
            plan_id: args.plan_id,
            stage_id: args.stage_id,
            missing_work_item_ids: missing,
          });
        }
        const response = { work_items: ids.map((id) => byId.get(id)) };
        if (outputBytes(response) > SAFE_OUTPUT_MAX_BYTES) {
          return toolError("The requested work items are too large to return in one response.", {
            plan_id: args.plan_id,
            stage_id: args.stage_id,
            work_item_ids: ids,
            safe_output_max_bytes: SAFE_OUTPUT_MAX_BYTES,
            recommended_action: "Call hub_plan_get_work_items again with a shorter work_item_ids list.",
          });
        }
        return reply(response);
      } catch (err) {
        return toolError(errorMessage(err), { plan_id: args.plan_id, stage_id: args.stage_id });
      }
    },
  );

  registrar.registerTool(
    "plan_update_stage_state",
    {
      description:
        "Change the runtime state of one or more stages. The plan body stays hidden, and all entries in updates[] succeed or fail together. How states flow: a new stage waits for the user when review.before_execution has checks, otherwise it starts in doing. When the executor finishes, send its outputs with status done; if review.after_execution has checks the stage lands in waiting_user(result_review), otherwise it is done. The user may confirm in normal chat or on the Production Board; fold in any requested revisions before moving on. Stages whose documents the planner already materialized have no executor and only go through review.after_execution. On problems, set blocked with a blocked_reason and ask the user via the question tool whether to retry or adjust the plan. If the user decides to retry, send status=doing with expected_status=blocked, and start the executor only after the response shows doing.",
      inputSchema: {
        plan_id: z.string().describe(PLAN_ID_DESC),
        projectRoot: z.string().optional().describe(PROJECT_ROOT_DESC),
        expected_revision: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Optional compare-and-set guard on the plan revision. On conflict, re-read and retry."),
        updates: z
          .array(StageStateUpdateSchema)
          .min(1)
          .max(50)
          .describe("All stage updates for this event, applied together. A single stage is a one-element list; use several entries when one user or executor event affects multiple stages."),
      },
      outputSchema: {
        ok: z.boolean(),
        plan_id: z.string().optional(),
        count: z.number(),
        updated: z.array(z.object({ stage: StageOptionalNameSchema, previous_status: StageStatusSchema })),
        errors: z.array(z.object({ message: z.string(), stage_id: z.string().optional(), order: z.number().optional() })).optional(),
      },
    },
    async (args) => {
      try {
        if (!args.updates || args.updates.length === 0) return updateError("updates[] needs at least one entry.", args.plan_id);
        const planId = args.plan_id;
        const result = await updateStageRuntimes(
          rootOf(args),
          planId,
          args.updates.map((u) => ({
            stage_id: u.stage_id,
            order: u.order,
            status: u.status,
            expected_status: u.expected_status,
            waiting_reason: u.waiting_reason,
            blocked_reason: u.blocked_reason,
            failed_item_ids: u.failed_item_ids,
            note: u.note,
            outputs: u.outputs,
          })),
          {
            expected_revision: args.expected_revision,
            // 推进到可执行 / 完成的状态前，确认该 stage 在新计划下确实可以执行
            validate: (candidate) => {
              const issues: ValidationIssue[] = [];
              for (const u of args.updates) {
                if (!["doing", "waiting_user", "done"].includes(u.status)) continue;
                const v = validatePlanFile(candidate, { stage_id: u.stage_id, order: u.order }, { requireRuntimeRefs: true, phase: "execution_readiness" });
                issues.push(...v.issues.filter((i) => i.severity === "error"));
              }
              if (issues.length > 0) throw new Error(`Stage is not ready for the requested state: ${formatValidationFailure(issues)}`);
            },
          },
        );
        const updated = result.updated.map((e) => ({
          stage: publicStage(fileStageToPublic(e.stage, result.plan.stage_outline.find((i) => i.id === e.stage.id)?.name)),
          previous_status: e.previous_status,
        }));
        void gw.notifyPlanChanged({
          plan_id: planId,
          revision: result.plan.revision,
          action: "update_stage_state",
          stage_ids: updated.map((e) => e.stage.id),
        });
        return reply({ ok: true, plan_id: planId, count: updated.length, updated });
      } catch (err) {
        return updateError(errorMessage(err), args.plan_id);
      }
    },
  );

  registrar.registerTool(
    "plan_replan",
    {
      description:
        "For a major change requested by the user: atomically rewrite the stage at the execution frontier and those after it. The tool works out the preserved prefix from the saved plan, and stages ahead of the frontier are not changed. plan_id and the workflow binding remain; the outline may be edited without writing every future stage in full. Pick the operation by intent. revise_stage: an authored stage that is still the same logical deliverable. insert_stage: a new stage that has to be authored right now. insert_stage_outline: a new future entry in the outline only. omit_stage: drop a pending entry that is not authored. remove_unexecuted_stage: delete an authored stage that is no longer wanted and was never started. Affected authored stages get their runtime reset. The response carries impact, pending_stages and resume_stage_id (a pointer for attention only); no executor is started or stopped. Use expected_revision from your most recent plan read; repeating a request_id is safe. If the boundary is wrong, the error includes current_state.current_frontier_stage_id and the expected boundary; other errors include allowed_actions, recommended_action and requires_reread. Never swap in a whole new plan with plan_write for this.",
      inputSchema: {
        plan_id: z.string().min(1).describe("Id of the existing Stage Execution Plan."),
        projectRoot: z.string().optional().describe(PROJECT_ROOT_SHORT_DESC),
        request_id: z
          .string()
          .min(1)
          .describe(
            "Stable id of this user-requested replan. Sending it again returns the stored result as long as the plan has not moved past the revision it created; " +
              "if the plan has moved on, the tool says the request was already applied and the caller must re-read before deciding on another replan.",
          ),
        expected_revision: z.number().int().min(1).describe("Revision from the latest plan read; a stale revision makes the write fail."),
        workflow_path: z.string().min(1).optional().describe("The workflow path chosen earlier; when given it must equal the plan's binding."),
        workflow_variant: z.string().min(1).optional().describe("The workflow variant chosen earlier; when given it must equal the plan's binding."),
        preserve_through_stage_id: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Optional check on the boundary the tool derives. If passed, it has to name the active stage immediately ahead of the current execution frontier. Usually omit it.",
          ),
        reason: z.string().min(1).describe("Short explanation of the major user change behind this replan."),
        operations: z
          .array(PlanReplanOperationSchema)
          .min(1)
          .max(50)
          .describe(
            "Operations on the frontier stage and later ones. For revise_stage and insert_stage, write the stage exactly like a plan_patch_stage `stage` (flat planner fields, no contract wrapper). " +
              "revise_stage: change an authored stage at or after the frontier. insert_stage: add and author one stage directly behind an authored anchor. " +
              "insert_stage_outline: add only a future pending entry to the outline. omit_stage: omit a pending outline entry that is not authored. " +
              "remove_unexecuted_stage: delete an authored stage, allowed only if it was never started.",
          ),
        resume_stage_id: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Optional hint naming a stage in the active suffix that deserves attention. It neither moves the frontier nor permits skipping unresolved or pending stages before it; " +
              "execution still proceeds from the frontier. When omitted, it is the first active outline entry past the preserved prefix.",
          ),
      },
      outputSchema: {
        ok: z.boolean(),
        state: z.literal("applied").optional(),
        plan_id: z.string().optional(),
        revision: z.number().int().min(1).optional(),
        workflow_path: z.string().optional(),
        workflow_variant: z.string().optional(),
        operation_digest: z.string().optional(),
        impact: z
          .object({
            preserve_through_stage_id: z.string().optional(),
            changed_stage_ids: z.array(z.string()).describe("Stages whose authored contract or outline position changed (pending ids included)."),
            invalidated_stage_ids: z.array(z.string()).describe("Authored stages after the boundary that were removed or had their runtime reset."),
            preserved_stage_ids: z.array(z.string()),
            resume_stage_id: z.string().optional(),
          })
          .optional(),
        operation_summary: z
          .object({
            revised_stage_ids: z.array(z.string()),
            inserted_stage_ids: z.array(z.string()),
            outlined_stage_ids: z.array(z.string()),
            omitted_stage_ids: z.array(z.string()),
            removed_stage_ids: z.array(z.string()),
          })
          .optional(),
        resume_stage_id: z.string().optional(),
        stage_count: z.number().optional(),
        stages: z.array(StageSummarySchema).optional(),
        pending_stages: z.array(PendingStageSchema).optional(),
        error: ActionableErrorSchema.optional(),
      },
    },
    async (args) => {
      try {
        const projectRoot = rootOf(args);
        const current = await loadPlan(projectRoot, args.plan_id);
        const previousRequest = [...(current.replan_history ?? [])].reverse().find((e) => e.request_id === args.request_id);
        const frontier = findFrontier(current);
        const derivedPreserve = deriveReplanPreserveThroughStageId(current);
        // 只校验“新的、revision 对得上”的请求；重放和过期请求交给 store 给出更准确的错误
        const validateCurrent = !previousRequest && current.revision === args.expected_revision;
        if (validateCurrent && args.preserve_through_stage_id !== undefined && args.preserve_through_stage_id !== derivedPreserve) {
          throw replanFrontierError(args.plan_id, frontier?.outline.id, derivedPreserve, {
            providedPreserveThroughStageId: args.preserve_through_stage_id,
          });
        }
        if (validateCurrent) {
          const violation = findReplanPrefixViolation(current, args.operations, derivedPreserve);
          if (violation) throw replanFrontierError(args.plan_id, frontier?.outline.id, derivedPreserve, { violation });
        }
        const preserveThroughStageId = previousRequest
          ? (args.preserve_through_stage_id ?? previousRequest.preserve_through_stage_id)
          : derivedPreserve;
        const result = await replanPlan(
          projectRoot,
          args.plan_id,
          {
            request_id: args.request_id,
            expected_revision: args.expected_revision,
            workflow_path: args.workflow_path,
            workflow_variant: args.workflow_variant,
            preserve_through_stage_id: preserveThroughStageId,
            reason: args.reason,
            operations: args.operations.map(toStoreOperation),
            resume_stage_id: args.resume_stage_id,
          },
          {
            validate: (candidate) => {
              const v = validatePlanFile(candidate, undefined, { requireRuntimeRefs: false, phase: "plan_write" });
              if (!v.ok) throw planValidationError(v.issues);
            },
          },
        );
        const plan = result.plan;
        const pending = pendingOutline(plan).map((s) => ({ id: s.id, order: s.order, name: s.name }));
        if (!result.replayed) {
          void gw.notifyPlanChanged({
            plan_id: args.plan_id,
            revision: plan.revision,
            action: "replan",
            stage_ids: [...new Set([...result.impact.invalidated_stage_ids, ...result.impact.changed_stage_ids])],
          });
        }
        return reply({
          ok: true,
          state: result.state,
          plan_id: args.plan_id,
          revision: plan.revision,
          ...(result.workflow_path ? { workflow_path: result.workflow_path } : {}),
          ...(result.workflow_variant ? { workflow_variant: result.workflow_variant } : {}),
          operation_digest: result.operation_digest,
          impact: result.impact,
          operation_summary: result.operation_summary,
          ...(result.resume_stage_id ? { resume_stage_id: result.resume_stage_id } : {}),
          stage_count: plan.stages.length,
          stages: planStages(plan).map(publicStage),
          pending_stages: pending,
        });
      } catch (err) {
        return actionableError(err, args.plan_id);
      }
    },
  );

  registrar.registerTool(
    "plan_write",
    {
      description:
        "Write a new JSON Stage Execution Plan, or overwrite an existing one completely, at `.hilo/plan/<id>.json`, from the structured `plan` object. The complete plan goes through semantic validation first and is then written atomically. Supply expected_revision when overwriting so concurrent edits are not lost.",
      inputSchema: {
        plan: StagePlanSchema.describe("The plan as structured data: sources[] and stage_outline[] at the top level, plus stages[] that each carry their work_items[]."),
        plan_id: z
          .string()
          .optional()
          .describe("Id (`.hilo/plan/<id>.json` stem) of an existing plan to rewrite completely. Omit to create a new plan; the generated id is returned."),
        projectRoot: z.string().optional().describe(PROJECT_ROOT_SHORT_DESC),
        expected_revision: z.number().int().min(1).optional().describe("Optional compare-and-set guard on the revision when replacing an existing plan."),
      },
      outputSchema: {
        ok: z.boolean(),
        plan_id: z.string(),
        stage_count: z.number(),
        stages: z.array(StageSummarySchema),
      },
    },
    async (args) => {
      try {
        const structured = StagePlanSchema.parse(args.plan);
        const projectRoot = rootOf(args);
        const planId = args.plan_id ?? generatePlanId();
        const headerFields = { ...(structured.header_fields ?? {}) };
        const hasHeader = Object.keys(headerFields).length > 0;
        const fileStages = structured.stages.map(toFileStage);
        const input = {
          title: structured.title,
          header_fields: hasHeader ? headerFields : undefined,
          workflow: structured.workflow,
          sources: structured.sources,
          stage_outline: structured.stage_outline,
          stages: fileStages,
        };
        // 先在内存里按新计划做语义校验，不合格就不碰文件
        assertPlanFileValid({ schema_version: 1, revision: 1, ...input }, { requireRuntimeRefs: false, phase: "plan_write" });
        const plan = await writeNewPlan(projectRoot, planId, input, args.expected_revision);
        void gw.notifyPlanChanged({ plan_id: planId, revision: plan.revision, action: "write", stage_ids: plan.stages.map((s) => s.id) });
        return reply({ ok: true, plan_id: planId, stage_count: plan.stages.length, stages: planStages(plan).map(publicStage) });
      } catch (err) {
        return toolError(errorMessage(err), args.plan_id ? { plan_id: args.plan_id } : {});
      }
    },
  );

  registrar.registerTool(
    "plan_patch_stage",
    {
      description:
        "Change a single stage of an existing JSON Stage Execution Plan: upsert or delete an authored stage, or omit a pending stage that has not been authored. To upsert, send `stage`; its stage_id picks the target. To delete or omit, send `stage_id` at the top level. omit=true leaves the stage_outline entry and all orders untouched and only stops listing it as pending. The full resulting plan is semantically validated and then written atomically; pass expected_revision so a newer plan is not overwritten.",
      inputSchema: {
        plan_id: z.string().describe(PLAN_ID_DESC),
        projectRoot: z.string().optional().describe(PROJECT_ROOT_DESC),
        expected_revision: z.number().int().min(1).optional().describe("Optional compare-and-set guard on the plan revision. On conflict, re-read and retry."),
        stage_id: z.string().optional().describe("Stable id of the stage to remove or omit. Leave it out for an upsert."),
        stage: PlanStageSchema.optional().describe("Structured stage to upsert; its stage.stage_id selects the target."),
        remove: z.boolean().optional().describe("Physically delete an authored stage."),
        omit: z.boolean().optional().describe("Mark an unauthored pending stage as omitted; stage orders stay the same."),
        after_order: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("For a stage that does not exist yet: insert it right after the stage with this order. Without it the stage is appended."),
      },
      outputSchema: {
        ok: z.boolean(),
        plan_id: z.string(),
        stage_count: z.number(),
        stages: z.array(StageSummarySchema),
        pending_stages: z.array(PendingStageSchema),
        patched: z.object({ stage_id: z.string(), action: z.enum(["upsert", "remove", "omit"]) }),
      },
    },
    async (args) => {
      const validate = (candidate: PlanFile) => assertPlanFileValid(candidate, { requireRuntimeRefs: false, phase: "plan_write" });
      try {
        if (args.omit && (args.remove || args.stage)) return toolError("omit=true cannot be used together with remove or stage.");
        const projectRoot = rootOf(args);
        const planId = args.plan_id;
        if (args.omit || args.remove) {
          if (!args.stage_id) return toolError("remove and omit need a top-level stage_id.");
          const action = args.omit ? "omit" : "remove";
          const plan = await (args.omit ? omitStage : removeStage)(projectRoot, planId, args.stage_id, args.expected_revision, validate);
          void gw.notifyPlanChanged({
            plan_id: planId,
            revision: plan.revision,
            action: action === "omit" ? "patch_stage" : "remove_stage",
            stage_ids: [args.stage_id],
          });
          return reply({
            ok: true,
            plan_id: planId,
            stage_count: plan.stages.length,
            stages: planStages(plan).map(publicStage),
            pending_stages: pendingOutline(plan),
            patched: { stage_id: args.stage_id, action },
          });
        }
        if (!args.stage) return toolError("Pass a structured `stage` to upsert, or set remove / omit with a stage_id.");
        const target = args.stage.stage_id;
        if (args.stage_id && target !== args.stage_id) {
          return toolError(`stage.stage_id "${args.stage.stage_id}" and stage_id "${args.stage_id}" disagree.`);
        }
        const validated = PlanStageSchema.parse(args.stage);
        const fileStage = toFileStage(validated);
        const plan = await upsertStage(projectRoot, planId, {
          stage_id: fileStage.id,
          order: fileStage.order,
          goal: fileStage.goal,
          contract: fileStage.contract,
          after_order: args.after_order,
          expected_revision: args.expected_revision,
          validate,
        });
        void gw.notifyPlanChanged({ plan_id: planId, revision: plan.revision, action: "patch_stage", stage_ids: [validated.stage_id] });
        return reply({
          ok: true,
          plan_id: planId,
          stage_count: plan.stages.length,
          stages: planStages(plan).map(publicStage),
          pending_stages: pendingOutline(plan),
          patched: { stage_id: validated.stage_id, action: "upsert" },
        });
      } catch (err) {
        return toolError(errorMessage(err), { plan_id: args.plan_id });
      }
    },
  );
};
