import {
  findFrontier,
  workflowPathOf,
  type PlanFile,
  type PlanFileStage,
  type StageStatus,
  type ToolReplanOperation,
  type WaitingReason,
} from "./plan-schema.js";
import { flattenItems, PlanError } from "./plan-store.js";

/**
 * 计划的语义校验与执行器视图。
 *
 * 两个阶段：`plan_write`（写计划时，检查 planner 写的内容是否足以执行）和
 * `execution_readiness`（执行前 / 状态推进时，额外检查依赖是否完成、引用是否已产出）。
 * 规则按工作流类型（短剧、MV、通用视频……）有所不同。
 */

type DetailItem = Record<string, string>;

export type ValidationCategory = "structure" | "document" | "dependency" | "media" | "video" | "postprocess" | "refs" | "defaults";

export interface ValidationIssue {
  severity: "error" | "warning";
  category: ValidationCategory;
  stage_id: string;
  work_item_id?: string;
  field?: string;
  message: string;
}

export interface ValidationDefault {
  category: "defaults";
  stage_id: string;
  field: string;
  value: string;
  reason: string;
}

export interface ValidationOptions {
  requireRuntimeRefs: boolean;
  phase: "plan_write" | "execution_readiness";
}

export interface ValidationResult {
  ok: boolean;
  workflow_kind: string;
  error_count: number;
  warning_count: number;
  issues: ValidationIssue[];
  defaults: ValidationDefault[];
}

export interface PublicStage {
  id: string;
  order: number;
  name?: string;
  goal: string;
  status: StageStatus;
  waiting_reason?: WaitingReason;
  blocked_reason?: string;
  failed_item_ids?: string[];
}

interface StageDetailBase {
  stage: PublicStage;
  depends_on: string[];
  sources: DetailItem[];
  work_items: DetailItem[];
  constraints: DetailItem[];
  execution_locks: DetailItem[];
  ref_capsules: DetailItem[];
  runtime_refs: DetailItem[];
  upstream_ref_capsules: DetailItem[];
  upstream_runtime_refs: DetailItem[];
  execution_excerpt: string;
}

export interface StageDetail extends StageDetailBase {
  can_execute: boolean;
  blocked_reason?: string;
  validation_issues?: ValidationIssue[];
  validation_defaults?: ValidationDefault[];
}

interface ValidationContext {
  project_type?: string;
  workflow_path?: string;
  workflow_kind: string;
  stage_fields: Record<string, string>;
  dependency_statuses: Record<string, string>;
}

export interface StageSelector {
  stage_id?: string;
  order?: number;
}

// ── 小工具 ──

export function isNullLike(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return !v || v === "null" || v === "none" || v === "undefined";
}

function stripQuotes(value: string): string {
  const t = value.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1).trim();
  return t;
}

/** "[a, b]" / "a, b" / "none" → 列表（item 被拍平后列表字段就是这种字符串）。 */
function parseInlineList(value: string): string[] {
  const t = stripQuotes(value);
  if (!t || t === "-" || t === "[]" || t.toLowerCase() === "none" || t.toLowerCase() === "null") return [];
  const inner = t.startsWith("[") && t.endsWith("]") ? t.slice(1, -1) : t;
  return inner
    .split(",")
    .map((x) => stripQuotes(x))
    .filter(Boolean);
}

export function parseRefList(value: string | undefined): string[] {
  return parseInlineList(value ?? "").filter((x) => !isNullLike(x));
}

function parseRoleList(value: string | undefined): string[] {
  return parseInlineList(value ?? "").filter((x) => {
    const n = x.trim().toLowerCase();
    return !isNullLike(x) && n !== "无" && n !== "n/a";
  });
}

function fieldValue(item: DetailItem, keys: string[]): string | undefined {
  for (const k of keys) if (!isNullLike(item[k])) return item[k];
  return undefined;
}

const lower = (v: string | undefined) => (v ?? "").trim().toLowerCase();
const itemLabel = (item: DetailItem) => fieldValue(item, ["id", "item_id"]);
const outputId = (item: DetailItem) => fieldValue(item, ["id"]);
const anyField = (item: DetailItem, keys: string[]) => keys.some((k) => !isNullLike(item[k]));

function hasDeclaredField(item: DetailItem, key: string): boolean {
  const n = (item[key] ?? "").trim().toLowerCase();
  return Boolean(n && n !== "null" && n !== "undefined");
}

function addIssue(issues: ValidationIssue[], issue: Omit<ValidationIssue, "severity"> & { severity?: ValidationIssue["severity"] }): void {
  const { severity, ...rest } = issue;
  issues.push({ severity: severity ?? "error", ...rest });
}

// 这些词出现在 execution_policy 里就视为串行：同 stage 内后面的 item 可以用前面的产出
const SERIAL_POLICY_WORDS = ["serial", "sequential", "chain", "topolog", "continuity"];
const SERIAL_POLICY_RE = new RegExp(SERIAL_POLICY_WORDS.join("|"), "i");
const runsSerially = (value: string | undefined): boolean => SERIAL_POLICY_RE.test(value ?? "");

// ── item 分类 ──

function isDocumentItem(item: DetailItem): boolean {
  return lower(item.kind) === "document" || lower(item.modality) === "document" || !isNullLike(item.document_role);
}

function isVideoItem(item: DetailItem): boolean {
  return lower(item.modality) === "video" || lower(item.kind).includes("video") || lower(item.asset_class).includes("video");
}

function isPostprocessItem(item: DetailItem): boolean {
  const kind = lower(item.kind);
  const op = lower(item.operation);
  return (
    lower(item.modality) === "postprocess" ||
    kind.includes("postprocess") ||
    op.includes("concat") ||
    op.includes("transcode") ||
    op.includes("timeline") ||
    op.includes("post")
  );
}

/** 需要 planner 写好提示词的生成类 item（分析 / 检索 / 准备类不算）。 */
function isGeneratedPromptItem(item: DetailItem): boolean {
  if (isPostprocessItem(item)) return false;
  const kind = lower(item.kind);
  const modality = lower(item.modality);
  const assetClass = lower(item.asset_class);
  if (/(analy|inspect|search|verify|register|prepare)/.test(`${kind} ${lower(item.operation)}`)) return false;
  return (
    modality === "image" ||
    modality === "video" ||
    modality === "audio.music" ||
    /^(?:generate[._-]?)?(?:image|video|music)$/.test(kind) ||
    assetClass.includes("generated_image") ||
    assetClass.includes("generated_video") ||
    assetClass.includes("generated_music")
  );
}

function parsePositiveNumber(value: string | undefined): number | undefined {
  if (isNullLike(value)) return undefined;
  const m = value?.match(/\d+(?:\.\d+)?/);
  if (!m?.[0]) return undefined;
  const n = Number.parseFloat(m[0]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** "8-12s" 取上界 12。 */
function durationUpperBoundSeconds(value: string | undefined): number | undefined {
  if (isNullLike(value)) return undefined;
  const nums = value
    ?.match(/\d+(?:\.\d+)?/g)
    ?.map((p) => Number.parseFloat(p))
    .filter((n) => Number.isFinite(n) && n > 0);
  return nums && nums.length > 0 ? Math.max(...nums) : undefined;
}

// 两处 prompt-only 约定不同：执行期引用检查认 prompt_only 字面量，
// 短剧 ref id 检查认 one_off_ / prompt_ / inline_ 前缀
function isPromptOnlyRefForRuntime(ref: string): boolean {
  const n = ref.trim().toLowerCase();
  return n === "prompt_only" || n === "prompt-only" || n === "none";
}
function isPromptOnlyRefForDrama(ref: string): boolean {
  const n = ref.trim().toLowerCase();
  return n.startsWith("one_off_") || n.startsWith("prompt_") || n.startsWith("inline_") || n === "none";
}

// 修复建议按这两段固定措辞识别问题种类，改措辞时两边一起改
const SERIAL_POLICY_HINT = "needs a serial/sequential execution_policy";
const DUPLICATE_ID_HINT = "is declared more than once";

const STABLE_REF_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]*$/;

export function workflowKindOf(projectType: string | undefined, workflowPath: string | undefined): string {
  const s = `${projectType ?? ""} ${workflowPath ?? ""}`.toLowerCase();
  if (s.includes("drama-series")) return "drama-series";
  if (s.includes("audio-production")) return "audio-production";
  if (s.includes("ad-tvc")) return "ad-tvc";
  if (s.includes("general-video")) return "general-video";
  if (s.includes("koc-video")) return "koc-video";
  if (s.includes("trailer-video")) return "trailer-video";
  if (/\bmv\b/.test(s) || s.includes("/mv.md")) return "mv";
  return "generic";
}

// ── 引用可用性 ──

function refIds(item: DetailItem): string[] {
  return [item.id].filter((v): v is string => !isNullLike(v));
}

function availableRefIds(d: StageDetailBase): Set<string> {
  const refs = new Set<string>();
  for (const item of [...d.sources, ...d.runtime_refs, ...d.upstream_runtime_refs, ...d.ref_capsules, ...d.upstream_ref_capsules]) {
    for (const id of refIds(item)) refs.add(id);
  }
  return refs;
}

function currentRuntimeRefIds(d: StageDetailBase): Set<string> {
  const refs = new Set<string>();
  for (const item of d.runtime_refs) for (const id of refIds(item)) refs.add(id);
  return refs;
}

function sameStageOutputIndexes(d: StageDetailBase): Map<string, number> {
  const m = new Map<string, number>();
  d.work_items.forEach((item, i) => {
    const id = outputId(item);
    if (id) m.set(id, i);
  });
  return m;
}

function validateDependencyStates(d: StageDetailBase, ctx: ValidationContext, issues: ValidationIssue[]): void {
  for (const depId of d.depends_on) {
    const status = ctx.dependency_statuses[depId] ?? "missing";
    if (status === "done") continue;
    addIssue(issues, {
      category: "dependency",
      stage_id: d.stage.id,
      field: "depends_on",
      message:
        status === "missing"
          ? `depends_on names "${depId}", which does not exist.`
          : `depends_on stage "${depId}" is ${status}; it has to be done before this stage can run or finish.`,
    });
  }
}

/**
 * 视频 item 的 refs 必须在执行时拿得到：来自 sources / capsule / 直接依赖的输出，
 * 或本 stage 更早的 item（且 stage 是串行执行）。
 */
function validateVideoRuntimeRefs(
  d: StageDetailBase,
  item: DetailItem,
  opts: ValidationOptions & { executionPolicy?: string },
  issues: ValidationIssue[],
): void {
  if (!opts.requireRuntimeRefs) return;
  const available = availableRefIds(d);
  const runtimeRefs = currentRuntimeRefIds(d);
  const sameStage = sameStageOutputIndexes(d);
  const currentIndex = d.work_items.indexOf(item);
  const currentId = outputId(item);
  const base: Omit<ValidationIssue, "severity" | "message"> = { category: "refs", field: "refs", stage_id: d.stage.id, work_item_id: itemLabel(item) };
  for (const ref of parseRefList(item.refs)) {
    if (isPromptOnlyRefForRuntime(ref) || available.has(ref)) continue;
    const producer = sameStage.get(ref);
    if (producer !== undefined) {
      if (currentId === ref) {
        addIssue(issues, { ...base, message: `refs lists "${ref}", which is this work item's own output.` });
      } else if (currentIndex < 0 || producer > currentIndex) {
        addIssue(issues, {
          ...base,
          message: `refs lists "${ref}", an output of a later work item in this stage; only existing refs or outputs of earlier work items in a serial stage can be used.`,
        });
      } else if (!runsSerially(opts.executionPolicy) && !runtimeRefs.has(ref)) {
        addIssue(issues, {
          ...base,
          message: `refs lists "${ref}" from another work item in this stage, which ${SERIAL_POLICY_HINT} or an existing runtime_ref; in a parallel stage one work item cannot feed another.`,
        });
      }
      continue;
    }
    addIssue(issues, {
      ...base,
      message: `ref "${ref}" cannot be resolved from this stage's sources and capsules or from its direct dependencies' runtime refs. Resolvable refs: ${[...available].sort().join(" | ") || "(none)"}.`,
    });
  }
}

// ── 各类 item 的字段要求 ──

function validationDefaults(d: StageDetailBase, ctx: ValidationContext): ValidationDefault[] {
  if (!d.work_items.some(isVideoItem) || !isNullLike(ctx.stage_fields.max_generated_clip_duration_s)) return [];
  return [
    {
      category: "defaults",
      stage_id: d.stage.id,
      field: "max_generated_clip_duration_s",
      value: "15",
      reason: "no max_generated_clip_duration_s was set for this video stage, so the platform default applies.",
    },
  ];
}

function validateOutputBinding(d: StageDetailBase, item: DetailItem, issues: ValidationIssue[]): void {
  if (outputId(item)) return;
  addIssue(issues, {
    category: "media",
    stage_id: d.stage.id,
    work_item_id: itemLabel(item),
    field: "id",
    message: "work_items[].id is empty; give every work item a stable logical output id.",
  });
}

function validateDocumentItem(d: StageDetailBase, item: DetailItem, opts: ValidationOptions, issues: ValidationIssue[]): void {
  if (!isNullLike(item.document_node_id)) return;
  if (opts.phase !== "plan_write" && d.stage.status !== "doing" && !opts.requireRuntimeRefs) return;
  addIssue(issues, {
    category: "document",
    stage_id: d.stage.id,
    work_item_id: itemLabel(item),
    field: "document_node_id",
    message: "document work item lacks a materialized document_node_id; send this stage back to the planner before any executor runs.",
  });
}

function requireField(
  d: StageDetailBase,
  item: DetailItem,
  issues: ValidationIssue[],
  field: string,
  category: ValidationCategory,
  message?: string,
): void {
  if (!isNullLike(item[field])) return;
  addIssue(issues, {
    category,
    stage_id: d.stage.id,
    work_item_id: itemLabel(item),
    field,
    message: message ?? `required field "${field}" is empty or absent.`,
  });
}

function requireAnyField(
  d: StageDetailBase,
  item: DetailItem,
  issues: ValidationIssue[],
  field: string,
  aliases: string[],
  category: ValidationCategory,
  message?: string,
): void {
  if (anyField(item, aliases)) return;
  addIssue(issues, {
    category,
    stage_id: d.stage.id,
    work_item_id: itemLabel(item),
    field,
    message: message ?? `at least one of these fields is required: ${aliases.join(" / ")}.`,
  });
}

function stageLockValue(d: StageDetailBase, keys: string[]): string | undefined {
  for (const lock of d.execution_locks) {
    const v = fieldValue(lock, keys);
    if (v !== undefined) return v;
  }
  return undefined;
}

function requireStageOrItemGeometry(d: StageDetailBase, item: DetailItem, issues: ValidationIssue[]): void {
  if (!isNullLike(item.aspect_ratio) || stageLockValue(d, ["aspect_ratio"]) !== undefined) return;
  addIssue(issues, {
    category: "video",
    stage_id: d.stage.id,
    work_item_id: itemLabel(item),
    field: "aspect_ratio",
    message: "no aspect ratio for this video work item; declare it once in the stage execution_locks, or else on the item.",
  });
}

function validateVideoDurationCap(d: StageDetailBase, ctx: ValidationContext, item: DetailItem, issues: ValidationIssue[]): void {
  const cap = parsePositiveNumber(ctx.stage_fields.max_generated_clip_duration_s) ?? 15;
  const upper = durationUpperBoundSeconds(fieldValue(item, ["duration_target_s", "target_duration_s", "duration_s"]));
  if (upper === undefined || upper <= cap) return;
  addIssue(issues, {
    category: "video",
    stage_id: d.stage.id,
    work_item_id: itemLabel(item),
    field: "duration_target_s",
    message: `the longest duration ${upper}s is over the max_generated_clip_duration_s limit of ${cap}s.`,
  });
}

/** 同一语义可以落在不同字段名上；任一个非空即算满足。字段名是计划契约的一部分。 */
const FIELD_ALIASES = {
  clipOrSegment: ["clip_group_id", "segment_id", "shot_id"],
  sourceRange: ["source_scene_beat_range", "source_scene_range", "source_segment_range"].concat("timing_target"),
  duration: ["duration_target_s", "target_duration_s", "duration_s", "timing_target"],
  audio: ["generated_speech_audio_approach", "audio_approach"],
  keyframeScene: ["scene_id"].concat("source_scene_range", "source_scene_beat_range"),
  dramaScene: ["scene_id"].concat("source_scene_beat_range", "source_scene_range"),
  mvSegment: ["segment_id", "clip_group_id"],
  mvTiming: ["timing_target"].concat("source_song_section", "beat_section_range", "source_segment_range"),
  mvDuration: ["duration_target_s", "target_duration_s", "timing_target"],
  postInputs: ["ordered_input_refs", "input_refs"].concat("clip_refs", "timeline_order"),
} satisfies Record<string, string[]>;

function validateGenericVideoItem(d: StageDetailBase, item: DetailItem, issues: ValidationIssue[]): void {
  requireAnyField(d, item, issues, "clip_or_segment_id", FIELD_ALIASES.clipOrSegment, "video");
  requireAnyField(d, item, issues, "source_range", FIELD_ALIASES.sourceRange, "video");
  requireAnyField(d, item, issues, "duration_target_s", FIELD_ALIASES.duration, "video");
  requireStageOrItemGeometry(d, item, issues);
  requireAnyField(d, item, issues, "refs", ["refs"], "video");
  requireAnyField(d, item, issues, "audio_approach", FIELD_ALIASES.audio, "video");
}

// 短剧的空间快照必须展开写：视频模型看不到“沿用上一组”指的是什么
const INHERIT_VERB = "(?:继承|延续|沿用)";
const GROUP_REF = [String.raw`(?:[a-z0-9.-]+[_-])?(?:sg|group)[_-]?\d+`, String.raw`第?\s*\d+\s*组`, String.raw`组\s*\d+`, "上一组", "前一组"];
const VAGUE_GROUP_HANDOFF_RE = new RegExp(`${INHERIT_VERB}\\s*(?:${GROUP_REF.join("|")})`, "i");

function hasPanelMarker(prompt: string, index: number): boolean {
  return new RegExp(`\\bcell_${index}\\b`, "i").test(prompt) || new RegExp(`第\\s*${index}\\s*格`).test(prompt);
}

const mentionsPanel9 = (prompt: string) => hasPanelMarker(prompt, 9);

function validateDramaBlockingRefCoverage(d: StageDetailBase, item: DetailItem, issues: ValidationIssue[]): void {
  const roles = new Set([...parseRoleList(item.roles_present), ...parseRoleList(item.persistent_background_roles)]);
  if (roles.size === 0 || parseRefList(item.refs).length >= roles.size) return;
  addIssue(issues, {
    category: "refs",
    stage_id: d.stage.id,
    work_item_id: itemLabel(item),
    field: "refs",
    message:
      "drama video refs need at least as many role reference ids as there are roles in blocking.roles_present plus blocking.persistent_background_roles.",
  });
}

function validateDramaSourceRefIds(d: StageDetailBase, item: DetailItem, issues: ValidationIssue[]): void {
  for (const ref of parseRefList(item.refs)) {
    if (isPromptOnlyRefForDrama(ref) || STABLE_REF_ID_PATTERN.test(ref.trim())) continue;
    addIssue(issues, {
      category: "refs",
      stage_id: d.stage.id,
      work_item_id: itemLabel(item),
      field: "refs",
      message: "refs may only hold stable ref ids; put role names in the prompt or blocking fields instead.",
    });
  }
}

function isDramaSceneKeyframeItem(d: StageDetailBase, item: DetailItem): boolean {
  const assetClass = lower(item.asset_class);
  const form = lower(item.required_form);
  return (
    d.stage.id.toLowerCase().includes("scene-keyframes") ||
    assetClass.includes("scene_keyframe_grid") ||
    assetClass.includes("keyframe_grid") ||
    (form.includes("3x3") && form.includes("continuous still grid"))
  );
}

/** 场景关键帧宫格：一段自包含 prompt 内联全部格子（黑白分镜 8 格，其余 9 格）。 */
function validateDramaSceneKeyframeItem(d: StageDetailBase, ctx: ValidationContext, item: DetailItem, issues: ValidationIssue[]): void {
  validateOutputBinding(d, item, issues);
  requireAnyField(
    d,
    item,
    issues,
    "scene_id",
    FIELD_ALIASES.keyframeScene,
    "media",
    "drama scene keyframe grid has to name its source scene.",
  );
  requireField(d, item, issues, "refs", "refs", "drama scene keyframe grid needs bound refs.");
  const prompt = item.prompt;
  const style = ctx.stage_fields.storyboard_style?.trim().toLowerCase();
  const panelCount = style === "bw_blockout" ? 8 : 9;
  requireField(
    d,
    item,
    issues,
    "prompt",
    "media",
    `drama scene keyframe grid needs a single self-contained prompt with all ${panelCount} panels written inline as cell_1..cell_${panelCount} blocks.`,
  );
  const base = { category: "media" as const, stage_id: d.stage.id, work_item_id: itemLabel(item) };
  if (hasDeclaredField(item, "cells")) {
    addIssue(issues, {
      ...base,
      field: "cells",
      message: `drama scene keyframe grid keeps everything in one prompt; remove the cells field and describe the ${panelCount} panels within the prompt text.`,
    });
  }
  for (let i = 1; i <= panelCount; i += 1) {
    const field = `cell_${i}`;
    if (hasDeclaredField(item, field)) {
      addIssue(issues, {
        ...base,
        field,
        message: `drama scene keyframe grid keeps everything in one prompt; remove ${field} and describe that panel in the prompt as an inline "${field}" block.`,
      });
    }
    if (isNullLike(prompt) || hasPanelMarker(prompt ?? "", i)) continue;
    addIssue(issues, {
      ...base,
      field: "prompt",
      message: `the prompt is missing 第${i}格; it needs ${panelCount} ordered panel sections in Chinese, from 第1格 to 第${panelCount}格.`,
    });
  }
  if (style === "bw_blockout" && mentionsPanel9(prompt ?? "")) {
    addIssue(issues, {
      ...base,
      field: "prompt",
      message: "bw_blockout has exactly eight panels (第1格 to 第8格); drop the ninth one.",
    });
  }
  validateDramaSourceRefIds(d, item, issues);
}

function validateDramaBackgroundRoles(d: StageDetailBase, item: DetailItem, issues: ValidationIssue[]): void {
  const present = new Set(parseRoleList(item.roles_present));
  if (present.size === 0) return;
  if (!parseRoleList(item.persistent_background_roles).some((r) => present.has(r))) return;
  addIssue(issues, {
    category: "video",
    stage_id: d.stage.id,
    work_item_id: itemLabel(item),
    field: "persistent_background_roles",
    message: "persistent_background_roles is only for non-focus background roles and cannot share any role with roles_present.",
  });
}

function validateDramaVideoItem(d: StageDetailBase, item: DetailItem, issues: ValidationIssue[]): void {
  for (const field of ["clip_group_id", "sequence_index", "duration_target_s"]) {
    requireField(d, item, issues, field, "video", `drama video work item needs "${field}".`);
  }
  requireAnyField(
    d,
    item,
    issues,
    "scene_or_beat_range",
    FIELD_ALIASES.dramaScene,
    "video",
    "drama video work item has to name its source scene or beat range.",
  );
  requireField(d, item, issues, "refs", "video", "drama video work item needs bound refs.");
  requireAnyField(
    d,
    item,
    issues,
    "audio_approach",
    ["audio_approach", "generated_speech_audio_approach"],
    "video",
    "drama video work item has to state its audio approach.",
  );
  requireField(d, item, issues, "prompt", "video", "drama video work item needs a finished prompt that can be generated as is.");
  const prompt = fieldValue(item, ["prompt"]);
  if (prompt && VAGUE_GROUP_HANDOFF_RE.test(prompt)) {
    addIssue(issues, {
      category: "video",
      stage_id: d.stage.id,
      work_item_id: itemLabel(item),
      field: "prompt",
      message:
        "drama video prompt has to spell out the spatial snapshot in full; the video model cannot see upstream group ids or shorthand such as the previous group.",
    });
  }
  requireStageOrItemGeometry(d, item, issues);
  validateDramaBlockingRefCoverage(d, item, issues);
  validateDramaSourceRefIds(d, item, issues);
  validateDramaBackgroundRoles(d, item, issues);
}

function validateMvVideoItem(d: StageDetailBase, item: DetailItem, issues: ValidationIssue[]): void {
  requireAnyField(
    d,
    item,
    issues,
    "segment_id",
    FIELD_ALIASES.mvSegment,
    "video",
    "MV video work item has to name the song section / visual segment it covers.",
  );
  requireAnyField(
    d,
    item,
    issues,
    "timing_target",
    FIELD_ALIASES.mvTiming,
    "video",
    "MV video work item needs timing taken from the song section or from beat evidence.",
  );
  requireAnyField(d, item, issues, "refs", ["refs"], "video", "MV video work item needs bound refs.");
  requireAnyField(d, item, issues, "audio_approach", [...FIELD_ALIASES.audio].reverse(), "video");
  requireAnyField(d, item, issues, "duration_or_timing", FIELD_ALIASES.mvDuration, "video");
  requireStageOrItemGeometry(d, item, issues);
}

function validateVideoItem(d: StageDetailBase, ctx: ValidationContext, item: DetailItem, opts: ValidationOptions, issues: ValidationIssue[]): void {
  validateOutputBinding(d, item, issues);
  if (ctx.workflow_kind === "drama-series") validateDramaVideoItem(d, item, issues);
  else if (ctx.workflow_kind === "mv") validateMvVideoItem(d, item, issues);
  else validateGenericVideoItem(d, item, issues);
  validateVideoDurationCap(d, ctx, item, issues);
  validateVideoRuntimeRefs(d, item, { ...opts, executionPolicy: ctx.stage_fields.execution_policy }, issues);
}

function validatePostprocessItem(d: StageDetailBase, item: DetailItem, issues: ValidationIssue[]): void {
  validateOutputBinding(d, item, issues);
  const base: Omit<ValidationIssue, "severity" | "message" | "field"> = { category: "postprocess", stage_id: d.stage.id, work_item_id: itemLabel(item) };
  if (!anyField(item, ["operation", "action"])) {
    addIssue(issues, { ...base, field: "operation", message: "postprocess work item needs an operation or action." });
  }
  if (!anyField(item, FIELD_ALIASES.postInputs)) {
    addIssue(issues, { ...base, field: "input_refs", message: "postprocess work item needs ordered input refs or a timeline order." });
  }
}

function missingPromptIssue(d: StageDetailBase, item: DetailItem): Omit<ValidationIssue, "severity"> {
  return {
    category: "media",
    stage_id: d.stage.id,
    work_item_id: itemLabel(item),
    field: "prompt",
    message: "generated media work item needs a prompt written by the planner.",
  };
}

function validateExecutionReadiness(d: StageDetailBase, ctx: ValidationContext, issues: ValidationIssue[]): void {
  if (d.work_items.length === 0) {
    addIssue(issues, { category: "structure", stage_id: d.stage.id, field: "work_items", message: "there are no work_items to run in this stage." });
  }
  for (const item of d.work_items) {
    if (isGeneratedPromptItem(item) && isNullLike(item.prompt)) addIssue(issues, missingPromptIssue(d, item));
    if (isDocumentItem(item) && isNullLike(item.document_node_id)) {
      addIssue(issues, {
        category: "document",
        stage_id: d.stage.id,
        work_item_id: itemLabel(item),
        field: "document_node_id",
        message: "document work item lacks a materialized document_node_id; the planner has to revise the plan before execution.",
      });
      continue;
    }
    if (isVideoItem(item)) {
      validateVideoRuntimeRefs(
        d,
        item,
        { requireRuntimeRefs: true, phase: "execution_readiness", executionPolicy: ctx.stage_fields.execution_policy },
        issues,
      );
    }
  }
}

function summarize(ctx: ValidationContext, issues: ValidationIssue[], defaults: ValidationDefault[]): ValidationResult {
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  return { ok: errors === 0, workflow_kind: ctx.workflow_kind, error_count: errors, warning_count: warnings, issues, defaults };
}

/** 只有 doing 的 stage 做内容检查；其他状态（写计划阶段除外）只查依赖。 */
function validateStageDetailReadiness(d: StageDetailBase, ctx: ValidationContext, opts: ValidationOptions): ValidationResult {
  const issues: ValidationIssue[] = [];
  const defaults = validationDefaults(d, ctx);
  if (opts.phase === "execution_readiness") validateDependencyStates(d, ctx, issues);
  if (d.stage.status !== "doing" && opts.phase !== "plan_write") return summarize(ctx, issues, defaults);

  if (opts.phase === "execution_readiness") {
    validateExecutionReadiness(d, ctx, issues);
  } else {
    if (d.work_items.length === 0) {
      addIssue(issues, { category: "structure", stage_id: d.stage.id, field: "work_items", message: "a stage that will execute needs work_items." });
    }
    for (const item of d.work_items) {
      if (isGeneratedPromptItem(item) && isNullLike(item.prompt)) addIssue(issues, missingPromptIssue(d, item));
      if (isDocumentItem(item)) validateDocumentItem(d, item, opts, issues);
      else if (ctx.workflow_kind === "drama-series" && isDramaSceneKeyframeItem(d, item)) validateDramaSceneKeyframeItem(d, ctx, item, issues);
      else if (isVideoItem(item)) validateVideoItem(d, ctx, item, opts, issues);
      else if (isPostprocessItem(item)) validatePostprocessItem(d, item, issues);
      else if (anyField(item, ["modality", "kind", "asset_class", "operation"])) validateOutputBinding(d, item, issues);
    }
  }
  return summarize(ctx, issues, defaults);
}

function issueSummary(i: ValidationIssue): string {
  const item = i.work_item_id ? ` work_item ${i.work_item_id}` : "";
  const field = i.field ? ` ${i.field}` : "";
  return `Stage ${i.stage_id}${item}${field}: ${i.message}`;
}

/** 最多列 5 条，优先 error。 */
export function formatValidationFailure(issues: ValidationIssue[]): string {
  const errors = issues.filter((i) => i.severity === "error");
  return (errors.length > 0 ? errors : issues).slice(0, 5).map(issueSummary).join("; ");
}

// ── 全计划的引用拓扑 ──

function idsOf(items: DetailItem[]): string[] {
  return items.map((i) => outputId(i)).filter((id): id is string => Boolean(id?.trim()));
}

/** 写计划时就检查 refs 指向的 id 在拓扑上能拿到（来源、capsule、直接依赖的 work item）。 */
function validateCanonicalRefTopology(plan: PlanFile, stage: PlanFileStage, issues: ValidationIssue[]): void {
  const workItems = flattenItems(stage.contract.work_items);
  const sourceIds = new Set(idsOf(flattenItems(plan.sources)));
  const capsuleIds = new Set(idsOf(flattenItems(stage.contract.ref_capsules)));
  const depIds = new Set<string>();
  for (const depId of stage.contract.depends_on ?? []) {
    const dep = plan.stages.find((s) => s.id === depId);
    if (!dep) continue;
    const declared = new Set(idsOf(flattenItems(dep.contract.work_items)));
    for (const id of declared) depIds.add(id);
    for (const id of idsOf(flattenItems(dep.runtime.runtime_refs))) if (declared.has(id)) depIds.add(id);
    for (const id of idsOf(flattenItems(dep.contract.ref_capsules))) depIds.add(id);
  }
  const producers = new Map<string, number>();
  workItems.forEach((item, i) => {
    const id = outputId(item);
    if (id) producers.set(id, i);
  });
  const runtimeIds = new Set(idsOf(flattenItems(stage.runtime.runtime_refs)));
  const serial = runsSerially(String(stage.contract.stage_fields?.execution_policy ?? ""));
  workItems.forEach((item, currentIndex) => {
    const base: Omit<ValidationIssue, "severity" | "message"> = { category: "refs", field: "refs", stage_id: stage.id, work_item_id: itemLabel(item) };
    for (const ref of parseRefList(item.refs)) {
      if (sourceIds.has(ref) || capsuleIds.has(ref) || depIds.has(ref)) continue;
      const producer = producers.get(ref);
      if (producer !== undefined) {
        if (producer === currentIndex) addIssue(issues, { ...base, message: `refs lists "${ref}", which is this work item's own output.` });
        else if (producer > currentIndex) addIssue(issues, { ...base, message: `refs lists "${ref}", which a later work item in this stage produces.` });
        else if (!serial && !runtimeIds.has(ref)) {
          addIssue(issues, {
            ...base,
            message: `refs lists "${ref}" from another work item in this stage, which ${SERIAL_POLICY_HINT} or an output already recorded in runtime_refs.`,
          });
        }
        continue;
      }
      addIssue(issues, {
        ...base,
        message: `ref "${ref}" cannot be resolved. Refs and capsules offered by direct dependencies: ${[...depIds].sort().join(" | ") || "(none)"}.`,
      });
    }
  });
}

// ── 执行器视图 ──

export function publicStage(s: PublicStage): PublicStage {
  return {
    id: s.id,
    order: s.order,
    ...(s.name ? { name: s.name } : {}),
    goal: s.goal,
    status: s.status,
    ...(s.waiting_reason ? { waiting_reason: s.waiting_reason } : {}),
    ...(s.blocked_reason ? { blocked_reason: s.blocked_reason } : {}),
    ...(s.failed_item_ids && s.failed_item_ids.length > 0 ? { failed_item_ids: s.failed_item_ids } : {}),
  };
}

export function fileStageToPublic(stage: PlanFileStage, name: string | undefined): PublicStage {
  return {
    id: stage.id,
    order: stage.order,
    ...(name !== undefined ? { name } : {}),
    goal: stage.goal,
    status: stage.runtime.status,
    ...(stage.runtime.waiting_reason ? { waiting_reason: stage.runtime.waiting_reason } : {}),
    ...(stage.runtime.blocked_reason ? { blocked_reason: stage.runtime.blocked_reason } : {}),
    ...(stage.runtime.failed_item_ids ? { failed_item_ids: stage.runtime.failed_item_ids } : {}),
  };
}

export function planStages(plan: PlanFile): PublicStage[] {
  const names = new Map(plan.stage_outline.map((s) => [s.id, s.name]));
  return plan.stages.map((s) => fileStageToPublic(s, names.get(s.id)));
}

function selectFileStage(plan: PlanFile, sel: StageSelector): PlanFileStage | undefined {
  if (sel.stage_id) return plan.stages.find((s) => s.id === sel.stage_id);
  if (sel.order !== undefined) return plan.stages.find((s) => s.order === sel.order);
  return undefined;
}

function headerValue(plan: PlanFile, key: string): string | undefined {
  if (key === "workflow_path") return workflowPathOf(plan);
  const v = plan.header_fields?.[key];
  return v === undefined ? undefined : String(v);
}

function collectUpstream(plan: PlanFile, dependsOn: string[], pick: (s: PlanFileStage) => DetailItem[]): DetailItem[] {
  const out: DetailItem[] = [];
  for (const depId of dependsOn) {
    const dep = plan.stages.find((s) => s.id === depId);
    if (!dep) continue;
    for (const item of pick(dep)) out.push({ ...item, source_stage_id: dep.id });
  }
  return out;
}

export function buildStageDetail(plan: PlanFile, sel: StageSelector, opts: ValidationOptions): StageDetail {
  const stage = selectFileStage(plan, sel);
  if (!stage) {
    const available = plan.stages.map((s) => `${s.id}@${s.order}`).join(", ");
    throw new Error(`No stage matches ${JSON.stringify(sel)}. Stages in the plan: ${available || "(none)"}.`);
  }
  const info = publicStage(fileStageToPublic(stage, plan.stage_outline.find((i) => i.id === stage.id)?.name));
  const dependsOn = stage.contract.depends_on ?? [];
  const base: StageDetailBase = {
    stage: info,
    depends_on: dependsOn,
    sources: flattenItems(plan.sources),
    work_items: flattenItems(stage.contract.work_items),
    constraints: flattenItems(stage.contract.constraints),
    execution_locks: flattenItems(stage.contract.execution_locks),
    ref_capsules: flattenItems(stage.contract.ref_capsules),
    runtime_refs: flattenItems(stage.runtime.runtime_refs),
    upstream_ref_capsules: collectUpstream(plan, dependsOn, (s) => flattenItems(s.contract.ref_capsules)),
    upstream_runtime_refs: collectUpstream(plan, dependsOn, (s) => flattenItems(s.runtime.runtime_refs)),
    execution_excerpt: stage.contract.execution_excerpt ?? "",
  };
  const projectType = headerValue(plan, "project_type");
  const workflowPath = headerValue(plan, "workflow_path");
  const stageFields: Record<string, string> = {};
  for (const [k, v] of Object.entries(stage.contract.stage_fields ?? {})) stageFields[k] = String(v);
  const statuses: Record<string, string> = {};
  for (const depId of dependsOn) statuses[depId] = plan.stages.find((s) => s.id === depId)?.runtime.status ?? "missing";
  const ctx: ValidationContext = {
    project_type: projectType,
    workflow_path: workflowPath,
    workflow_kind: workflowKindOf(projectType, workflowPath),
    stage_fields: stageFields,
    dependency_statuses: statuses,
  };
  const validation = validateStageDetailReadiness(base, ctx, opts);

  // 更早的前沿没解决，这个 stage 就不能执行 —— 执行严格按大纲顺序推进
  const frontier = findFrontier(plan);
  const outlineOrder = plan.stage_outline.find((o) => o.id === stage.id)?.order ?? stage.order;
  const earlier = frontier && frontier.outline.order < outlineOrder ? frontier : undefined;
  const frontierReason =
    earlier?.kind === "pending"
      ? `Stage ${earlier.outline.id} comes first and has not been authored yet, so Stage ${stage.id} cannot run.`
      : earlier?.kind === "authored"
        ? `Stage ${earlier.outline.id} comes first and is not resolved yet, so Stage ${stage.id} cannot run.`
        : undefined;
  const status = stage.runtime.status;
  const blocked =
    frontierReason ??
    (status === "waiting_user"
      ? "Waiting for the user to confirm this stage."
      : status === "blocked"
        ? "This stage is blocked."
        : status === "done"
          ? "This stage has already finished."
          : validation.ok
            ? undefined
            : `Stage is not ready: ${formatValidationFailure(validation.issues)}`);
  return {
    ...base,
    can_execute: !blocked,
    ...(blocked ? { blocked_reason: blocked } : {}),
    ...(validation.issues.length > 0 ? { validation_issues: validation.issues } : {}),
    ...(validation.defaults.length > 0 ? { validation_defaults: validation.defaults } : {}),
  };
}

export function stageDetailForExecution(plan: PlanFile, sel: StageSelector): StageDetail {
  return buildStageDetail(plan, sel, { requireRuntimeRefs: true, phase: "execution_readiness" });
}

export function validatePlanFile(plan: PlanFile, sel: StageSelector | undefined, opts: ValidationOptions): ValidationResult {
  const workflowKind = workflowKindOf(headerValue(plan, "project_type"), headerValue(plan, "workflow_path"));
  const selected =
    sel && (sel.stage_id || sel.order !== undefined) ? plan.stages.filter((s) => selectFileStage(plan, sel)?.id === s.id) : plan.stages;
  const issues: ValidationIssue[] = [];
  const defaults: ValidationDefault[] = [];
  const stageIds = new Set<string>();
  const stageOrders = new Set<number>();
  // 逻辑 id 全计划唯一：下游只凭 id 引用，重名就指代不清
  const logicalIds = new Map<string, string>();
  const structure = (message: string, stageId = "__plan__") =>
    issues.push({ severity: "error", category: "structure", stage_id: stageId, message });
  const addLogicalId = (id: string | undefined, location: string, stageId = "__plan__") => {
    if (!id?.trim()) return;
    const prev = logicalIds.get(id);
    if (prev) structure(`Logical id "${id}" ${DUPLICATE_ID_HINT} (${prev} and ${location}).`, stageId);
    else logicalIds.set(id, location);
  };
  if (plan.stages.length === 0) structure("A Stage Execution Plan needs one or more stages.");
  for (const source of flattenItems(plan.sources)) addLogicalId(source.id, "sources");
  for (const stage of plan.stages) {
    if (stageIds.has(stage.id)) structure(`Stage id ${stage.id} appears more than once in the plan.`, stage.id);
    if (stageOrders.has(stage.order)) structure(`Stage order ${stage.order} appears more than once in the plan.`, stage.id);
    stageIds.add(stage.id);
    stageOrders.add(stage.order);
    for (const item of flattenItems(stage.contract.work_items)) addLogicalId(outputId(item), `stage ${stage.id} work_items`, stage.id);
    for (const item of flattenItems(stage.contract.ref_capsules)) addLogicalId(item.id, `stage ${stage.id} ref_capsules`, stage.id);
  }
  for (const stage of selected) {
    validateCanonicalRefTopology(plan, stage, issues);
    const detail = buildStageDetail(plan, { stage_id: stage.id }, opts);
    issues.push(...(detail.validation_issues ?? []));
    defaults.push(...(detail.validation_defaults ?? []));
  }
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  return { ok: errors === 0, workflow_kind: workflowKind, error_count: errors, warning_count: warnings, issues, defaults };
}

export function assertPlanFileValid(plan: PlanFile, opts: ValidationOptions): void {
  const v = validatePlanFile(plan, undefined, opts);
  if (!v.ok) throw new Error(`The plan did not pass validation: ${formatValidationFailure(v.issues)}`);
}

// ── 下一步 ──

export interface PendingStage {
  id: string;
  order: number;
  name: string;
}

/**
 * next_action 只描述已写 stage 的运行时动作；前沿是未写 stage 时不给 next_action，
 * 只给 pending_stages（该 planner 去写它了）。全部完成且无 pending 才是 complete。
 */
export function computeNextAction(plan: PlanFile, stages: PublicStage[], pending: PendingStage[] = []): Record<string, unknown> {
  const withPending = pending.length > 0 ? { pending_stages: pending } : {};
  const frontier = findFrontier(plan);
  if (frontier?.kind === "pending") return { waiting_user: false, ...withPending };
  const next = frontier?.kind === "authored" ? stages.find((s) => s.id === frontier.stage.id) : undefined;
  if (next?.status === "waiting_user") return { next_action: "wait_for_user", next_stage: publicStage(next), waiting_user: true, ...withPending };
  if (next?.status === "blocked") return { next_action: "blocked", next_stage: publicStage(next), waiting_user: false, ...withPending };
  if (next?.status === "doing") return { next_action: "execute_stage", next_stage: publicStage(next), waiting_user: false, ...withPending };
  if (pending.length > 0) return { waiting_user: false, pending_stages: pending };
  return { next_action: "complete", waiting_user: false };
}

// ── Replan 边界 ──

/** 保留边界 = 前沿之前最后一个已写的活跃 stage（由服务端推导，agent 不用猜）。 */
export function deriveReplanPreserveThroughStageId(plan: PlanFile): string | undefined {
  const frontierOrder = findFrontier(plan)?.outline.order ?? Number.POSITIVE_INFINITY;
  const authored = new Set(plan.stages.map((s) => s.id));
  return [...plan.stage_outline]
    .filter((s) => !s.omitted && s.order < frontierOrder && authored.has(s.id))
    .sort((a, b) => a.order - b.order)
    .at(-1)?.id;
}

export function findReplanPrefixViolation(
  plan: PlanFile,
  operations: ToolReplanOperation[],
  preserveThroughStageId: string | undefined,
): { operationIndex: number; stageId: string } | undefined {
  const frontierOrder = findFrontier(plan)?.outline.order ?? Number.POSITIVE_INFINITY;
  const orderById = new Map(plan.stage_outline.map((s) => [s.id, s.order]));
  const preserveOrder = orderById.get(preserveThroughStageId ?? "") ?? 0;
  for (const [operationIndex, op] of operations.entries()) {
    if (op.type === "insert_stage" || op.type === "insert_stage_outline") {
      const anchorOrder = orderById.get(op.after_stage_id);
      if (anchorOrder !== undefined && anchorOrder < preserveOrder) return { operationIndex, stageId: op.after_stage_id };
      continue;
    }
    const stageId = op.type === "revise_stage" ? op.stage.stage_id : op.stage_id;
    const order = orderById.get(stageId);
    if (order !== undefined && order < frontierOrder) return { operationIndex, stageId };
  }
  return undefined;
}

export function replanFrontierError(
  planId: string,
  frontierStageId: string | undefined,
  expectedPreserve: string | undefined,
  opts: { violation?: { operationIndex: number; stageId: string }; providedPreserveThroughStageId?: string },
): PlanError {
  const v = opts.violation;
  const action = v ? "remove_accepted_prefix_operation" : "omit_preserve_through_stage_id";
  const frontierLabel = frontierStageId ?? "(the plan is already complete)";
  const message = v
    ? `Operation ${v.operationIndex} touches Stage ${v.stageId}, which lies before the current frontier ${frontierLabel}. Leave the accepted prefix alone and put the change at the frontier or later.`
    : `With the current frontier ${frontierLabel} the preservation boundary is ${expectedPreserve ?? "empty"}. Leave out preserve_through_stage_id so the tool derives it.`;
  return new PlanError(message, "invalid", {
    code: "REPLAN_FRONTIER_MISMATCH",
    ...(v ? { operation_index: v.operationIndex, entity: { type: "stage" as const, id: v.stageId } } : { entity: { type: "plan" as const, id: planId } }),
    current_state: {
      current_frontier_stage_id: frontierStageId || "after_completed_plan",
      expected_preserve_through_stage_id: expectedPreserve ?? "none",
      ...(opts.providedPreserveThroughStageId ? { provided_preserve_through_stage_id: opts.providedPreserveThroughStageId } : {}),
    },
    allowed_actions: [action],
    recommended_action: { operation: action },
    retryable: true,
    requires_reread: false,
  });
}

function validationIssueAction(issue: ValidationIssue): { operation: string; description: string } {
  if (issue.message.includes(SERIAL_POLICY_HINT)) {
    return {
      operation: "set_serial_execution_policy",
      description: "Make the Stage execution_policy serial/sequential, or drop the dependency between work items of the same stage.",
    };
  }
  if (issue.message.includes(DUPLICATE_ID_HINT)) {
    return {
      operation: "use_unique_logical_id",
      description: "Give the logical id a single owner and point downstream refs at that id.",
    };
  }
  return {
    operation: "correct_stage_contract",
    description: "Fix the reported Stage or work-item field and send the same intended Replan again.",
  };
}

export function planValidationError(issues: ValidationIssue[]): PlanError {
  const guided = issues
    .filter((i) => i.severity === "error")
    .slice(0, 5)
    .map((i) => ({
      stage_id: i.stage_id,
      ...(i.work_item_id ? { work_item_id: i.work_item_id } : {}),
      ...(i.field ? { field: i.field } : {}),
      message: i.message,
      recommended_action: validationIssueAction(i),
    }));
  const first = guided[0];
  return new PlanError(`The plan did not pass validation: ${formatValidationFailure(issues)}`, "invalid", {
    code: "PLAN_VALIDATION_FAILED",
    ...(first ? { entity: { type: "stage" as const, id: first.stage_id } } : {}),
    allowed_actions: [...new Set(guided.map((g) => g.recommended_action.operation))],
    recommended_action: first ? first.recommended_action : { operation: "correct_stage_contract" },
    retryable: true,
    requires_reread: false,
    issues: guided,
  });
}
