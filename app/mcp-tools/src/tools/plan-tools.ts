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
  "Work item prompts were omitted because the Stage detail exceeded the safe output size. Use hub_plan_get_work_items with the corresponding work_item_ids to retrieve the complete items.";

const PLAN_ID_DESC = "Stage Execution Plan id (the `.hilo/plan/<id>.json` file stem). Returned by plan_write.";
const PROJECT_ROOT_DESC =
  "Absolute path to the active project root. Auto-injected by the runtime when omitted (OpenCode's cwd = active project); pass explicitly only to target a different project.";
const PROJECT_ROOT_SHORT_DESC = "Absolute path to the active project root. Auto-injected by the runtime when omitted (OpenCode's cwd = active project).";

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
      description: "Correct the rejected request from the reported message before retrying.",
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

/** 键顺序照参照（name 在 goal 前，决定 JSON Schema 里 required 的顺序）；每次新建，免得同一实例用两次变成 $ref。 */
const stageFields = <N extends z.ZodTypeAny>(name: N) => ({
  id: z.string(),
  order: z.number(),
  name,
  goal: z.string(),
  status: StageStatusSchema,
  waiting_reason: WaitingReasonSchema.optional(),
  blocked_reason: z.string().optional(),
  failed_item_ids: z.array(z.string()).optional(),
});
const stageSummary = () => z.object(stageFields(z.string()));
const StageSummarySchema = stageSummary();
const StageOptionalNameSchema = z.object(stageFields(z.string().optional()));
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
    .refine((v) => /^https?:\/\//i.test(v), "url must be http(s)")
    .optional(),
  path: z.string().optional(),
});

const StageStateUpdateSchema = z.object({
  stage_id: z.string().optional().describe("Stage id to update. Mutually exclusive with order."),
  order: z.number().int().min(1).optional().describe("Stage order to update. Mutually exclusive with stage_id."),
  status: StageStatusSchema.describe("New stage status."),
  expected_status: StageStatusSchema.optional().describe("Optional stale-state guard."),
  waiting_reason: WaitingReasonSchema.optional().describe(
    "Use only for an explicit framework wait. Normal execution completion should request done; the framework applies review.after_execution and returns the effective state.",
  ),
  blocked_reason: z
    .string()
    .min(1)
    .optional()
    .describe("Required when entering blocked. Explain the concrete blocker so the main agent can ask the user with reason and suggestions."),
  failed_item_ids: z.array(z.string().min(1)).optional(),
  note: z.string().optional().describe("Short runtime note to append under the stage."),
  outputs: z
    .array(RuntimeOutputSchema)
    .optional()
    .describe(
      "Optional produced output refs to upsert under the stage. A matching id replaces the current runtime ref and moves the previous ref to superseded_runtime_refs.",
    ),
});

export const registerPlanTools: RegisterTools = (registrar, gw) => {
  registrar.registerTool(
    "plan_get_stage_status",
    {
      description:
        "Read a Stage Execution Plan as structured stage status only; never return the file body. next_action covers authored Stage runtime work only. When no authored Stage needs runtime action, omit next_action and return pending_stages; return complete only when pending_stages is empty. next_action=wait_for_user means send a short normal chat message and end the turn so the user can confirm or revise in chat or Production Board; do not call the question tool. next_action=blocked requires a question-tool decision using blocked_reason and concrete suggestions.",
      inputSchema: {
        plan_id: z.string().describe(PLAN_ID_DESC),
        projectRoot: z.string().optional().describe(PROJECT_ROOT_DESC),
        stage_id: z.string().optional().describe("Optional stage id to filter."),
        order: z.number().int().min(1).optional().describe("Optional stage order to filter."),
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
        next_stage: stageSummary().optional(),
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
        "Read exactly one Stage Execution Plan stage as structured executor detail. Returns the selected stage, work items, source/ref locators needed by ordered refs, normalized output assets, constraints, locks, direct dependency runtime refs/capsules, and execution excerpt; never returns other stages or the full plan.",
      inputSchema: {
        plan_id: z.string().describe(PLAN_ID_DESC),
        projectRoot: z.string().optional().describe(PROJECT_ROOT_DESC),
        stage_id: z.string().optional().describe("Stage id to read. Required unless order is set."),
        order: z.number().int().min(1).optional().describe("Stage order to read. Required unless stage_id is set."),
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
        if (!args.stage_id && args.order === undefined) return toolError("Provide either stage_id or order.");
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
          return toolError("Stage detail still exceeds the safe output size after omitting work item prompts.", {
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
        "Return the selected complete work items from one Stage Execution Plan stage. Use this when plan_get_stage_detail says work item prompts were omitted. The response contains only the original work_items; request fewer ids if the result exceeds the safe output size.",
      inputSchema: {
        plan_id: z.string().describe(PLAN_ID_DESC),
        projectRoot: z.string().optional().describe(PROJECT_ROOT_DESC),
        stage_id: z.string().describe("Stage id containing the requested work items."),
        work_item_ids: z
          .array(z.string().min(1))
          .min(1)
          .max(50)
          .describe("Stable work item ids to return. Retry with fewer ids when the requested items exceed the safe output size."),
      },
      outputSchema: { work_items: z.array(DetailItemSchema) },
    },
    async (args) => {
      try {
        const plan = await loadPlan(rootOf(args), args.plan_id);
        const stage = plan.stages.find((s) => s.id === args.stage_id);
        if (!stage) return toolError(`Stage not found: ${args.stage_id}`, { plan_id: args.plan_id });
        const ids = [...new Set(args.work_item_ids)];
        const byId = new Map(flattenItems(stage.contract.work_items).map((i) => [i.id, i]));
        const missing = ids.filter((id) => !byId.has(id));
        if (missing.length > 0) {
          return toolError("Work items not found in the selected stage.", {
            plan_id: args.plan_id,
            stage_id: args.stage_id,
            missing_work_item_ids: missing,
          });
        }
        const response = { work_items: ids.map((id) => byId.get(id)) };
        if (outputBytes(response) > SAFE_OUTPUT_MAX_BYTES) {
          return toolError("Requested work items exceed the safe output size.", {
            plan_id: args.plan_id,
            stage_id: args.stage_id,
            work_item_ids: ids,
            safe_output_max_bytes: SAFE_OUTPUT_MAX_BYTES,
            recommended_action: "Retry hub_plan_get_work_items with fewer work_item_ids.",
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
        "Patch one or more runtime states without exposing the Plan body. The framework derives the initial state from review.before_execution: non-empty checks wait for explicit user confirmation; omitted or empty checks start execution directly. After executor success, submit outputs and request done. The framework derives the effective state from review.after_execution: non-empty checks return waiting_user(result_review); omitted or empty checks complete the Stage. Explicit confirmation may arrive from ordinary chat or the Production Board. Apply revision feedback before advancing the Stage. Planner-materialized document stages apply only review.after_execution because no Executor runs. Enter blocked with blocked_reason, then use the question tool for retry or plan-adjust decisions. After an explicit user retry decision for a blocked Stage, request status=doing with expected_status=blocked and dispatch Executor only after the returned Stage status is doing. Pass updates[]; the whole batch is validated and committed atomically.",
      inputSchema: {
        plan_id: z.string().describe(PLAN_ID_DESC),
        projectRoot: z.string().optional().describe(PROJECT_ROOT_DESC),
        expected_revision: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Optional plan revision CAS guard. Re-read and retry on conflict."),
        updates: z
          .array(StageStateUpdateSchema)
          .min(1)
          .max(50)
          .describe("Batch of stage state updates. Use a single-element array for one stage; use multiple items when one user/executor event changes several stages."),
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
        if (!args.updates || args.updates.length === 0) return updateError("Provide updates[] with at least one stage update.", args.plan_id);
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
              if (issues.length > 0) throw new Error(`Stage readiness validation failed: ${formatValidationFailure(issues)}`);
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
        "Atomically update only the current execution frontier and its suffix after a major user change. The tool derives the preserved prefix from the persisted Plan; Stages before the current frontier stay unchanged. Keep the same plan_id and workflow binding, and update the stage outline without authoring every future Stage. Use revise_stage for the same authored logical deliverable, insert_stage only for a net-new Stage that must be authored now, insert_stage_outline for a net-new future entry, omit_stage for an unauthored pending entry, and remove_unexecuted_stage only for an authored Stage that is no longer required and has not started. The result resets affected authored runtime, returns pending_stages and an attention-only resume_stage_id, and never dispatches or cancels executors. Use expected_revision from the latest plan read. Replan is atomic; request_id safely identifies duplicate submissions. Boundary rejections return current_state.current_frontier_stage_id plus the expected preservation boundary; other rejected operations return allowed_actions, recommended_action, and whether the caller must reread before retrying. Do not use plan_write to replace the whole plan.",
      inputSchema: {
        plan_id: z.string().min(1).describe("Existing Stage Execution Plan id."),
        projectRoot: z.string().optional().describe(PROJECT_ROOT_SHORT_DESC),
        request_id: z
          .string()
          .min(1)
          .describe(
            "Stable id for this user-requested replan. Reusing it replays the saved result while the plan remains at the applied revision. " +
            "If the plan has advanced, the tool reports that this request was already applied and asks the caller to reread before deciding whether another replan " +
            "is needed.",
          ),
        expected_revision: z.number().int().min(1).describe("Revision returned by the latest plan read; the write fails on a stale revision."),
        workflow_path: z.string().min(1).optional().describe("Previously selected workflow path. If supplied, it must match the plan binding."),
        workflow_variant: z.string().min(1).optional().describe("Previously selected workflow variant. If supplied, it must match the plan binding."),
        preserve_through_stage_id: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Optional assertion of the server-derived preservation boundary. When supplied, it must equal the active Stage immediately before the current execution frontier; normally omit it and let the tool derive the boundary.",
          ),
        reason: z.string().min(1).describe("Concise explanation of the user-raised major change driving the replan."),
        operations: z
          .array(PlanReplanOperationSchema)
          .min(1)
          .max(50)
          .describe(
            "Current-and-later Stage operations. revise_stage and insert_stage use the same flat planner-owned Stage fields as plan_patch_stage; do not nest them u" +
            "nder contract. revise_stage updates an authored Stage at or after the current frontier; insert_stage adds and authors one immediate Stage after an aut" +
            "hored anchor; insert_stage_outline adds only a future pending outline entry; omit_stage omits an unauthored pending outline stage; remove_unexecuted_s" +
            "tage removes an authored Stage only when the coordinator has not started it.",
          ),
        resume_stage_id: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Optional attention pointer within the active suffix. " +
            "It does not change the execution frontier or authorize skipping earlier unresolved or pending Stages; execution still continues from the frontier. " +
            "Defaults to the first active outline entry after the preserved prefix.",
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
            changed_stage_ids: z.array(z.string()).describe("Authored contract or stage-outline topology changes; may include pending ids."),
            invalidated_stage_ids: z.array(z.string()).describe("Authored suffix stages whose runtime was reset or removed."),
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
        "Create or fully replace the JSON Stage Execution Plan under `.hilo/plan/<id>.json`. Pass the structured `plan` object. The complete plan is semantically validated before the atomic write. Use expected_revision for a guarded replacement.",
      inputSchema: {
        plan: StagePlanSchema.describe("Structured Stage Execution Plan with top-level sources[], stage_outline[], and stages[] with work_items[]."),
        plan_id: z
          .string()
          .optional()
          .describe("Existing plan id (`.hilo/plan/<id>.json` stem) to fully re-write. Omit to create a new plan; the tool generates and returns the id."),
        projectRoot: z.string().optional().describe(PROJECT_ROOT_SHORT_DESC),
        expected_revision: z.number().int().min(1).optional().describe("Optional plan revision CAS guard when replacing an existing plan."),
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
        "Upsert or remove one authored stage, or omit one unauthored pending stage, in an existing JSON Stage Execution Plan. For upsert, pass `stage` and use its stage_id. For remove or omit, pass top-level `stage_id`. omit=true preserves the stage_outline entry and every Stage order while excluding that entry from pending stages. The resulting complete plan is semantically validated before the atomic write. Use expected_revision to avoid overwriting a newer plan.",
      inputSchema: {
        plan_id: z.string().describe(PLAN_ID_DESC),
        projectRoot: z.string().optional().describe(PROJECT_ROOT_DESC),
        expected_revision: z.number().int().min(1).optional().describe("Optional plan revision CAS guard. Re-read and retry on conflict."),
        stage_id: z.string().optional().describe("Stable id of the stage to remove or omit. Do not pass it for an upsert."),
        stage: PlanStageSchema.optional().describe("Structured stage to upsert. The tool uses stage.stage_id as the target id."),
        remove: z.boolean().optional().describe("Physically remove an authored stage."),
        omit: z.boolean().optional().describe("Mark an unauthored pending stage as omitted without changing Stage orders."),
        after_order: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("When inserting a new stage, place it after the stage with this order. Defaults to appending at the end."),
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
        if (args.omit && (args.remove || args.stage)) return toolError("omit=true cannot be combined with remove or stage.");
        const projectRoot = rootOf(args);
        const planId = args.plan_id;
        if (args.omit || args.remove) {
          if (!args.stage_id) return toolError("Provide stage_id when remove or omit is true.");
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
        if (!args.stage) return toolError("Provide the structured `stage` unless remove or omit is true.");
        const target = args.stage.stage_id;
        if (args.stage_id && target !== args.stage_id) {
          return toolError(`structured stage.stage_id "${args.stage.stage_id}" does not match stage_id "${args.stage_id}".`);
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
