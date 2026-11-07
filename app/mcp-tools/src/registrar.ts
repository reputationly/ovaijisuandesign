import { createHash } from "node:crypto";

import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { asArrayLike, deepUnwrapArrayWrappers, normalizeDeepArrayElements, normalizeExecuteArgs, normalizeExecuteReferences } from "./args-normalize.js";
import { runWithSession, type GroupScope } from "./context.js";

/**
 * 包一层 `server.registerTool`：
 * - 剥掉 SDK 不认识的私有配置（参数提示、可确认标记等），收集起来推给 gateway；
 * - inputSchema 包成 `z.object(shape).passthrough()` —— 插件注入的 `_xxx` 参数不能被校验拒掉；
 * - handler 先 pop 出 `_session_id` 等放进会话上下文，工具代码看不到它们；
 * - 有 `_user_override_note` 时在结果末尾追加 `[User Override] …`；
 * - stderr 记 `[chat-turn] stage=mcp_started|mcp_finished`，每轮限量。
 */

export const SESSION_ID_KEY = "_session_id";
export const CHAT_TURN_ID_KEY = "_chat_turn_id";
export const TOOL_USE_ID_KEY = "_tool_use_id";
export const GROUP_ID_KEY = "_group_id";
export const GROUP_SCOPE_KEY = "_group_scope";
export const USER_OVERRIDE_NOTE_KEY = "_user_override_note";

export type ToolArgs<S extends z.ZodRawShape> = z.objectOutputType<S, z.ZodTypeAny, "passthrough">;
export type ToolHandler<S extends z.ZodRawShape> = (
  args: ToolArgs<S>,
  extra: unknown,
) => CallToolResult | Promise<CallToolResult>;

export interface ToolConfig<S extends z.ZodRawShape> {
  title?: string;
  description: string;
  inputSchema: S;
  outputSchema?: z.ZodRawShape;
  annotations?: ToolAnnotations;
  /** 任务支持声明。参照 25 个工具都是 { taskSupport: "forbidden" }。
   *  第 354 轮：原来靠 SDK 默认值，collected() 看不到、测试无从比对；
   *  改成显式声明，行为由我们控制。 */
  execution?: Record<string, unknown>;
  // ── 私有字段：不进 SDK，推给 gateway ──
  /** 调用前需要用户确认（gateway / 插件的 tool-confirm 读它）。 */
  confirmable?: boolean;
  confirmationMode?: string;
  paramHints?: Record<string, unknown>;
  vendorParamHints?: Record<string, unknown>;
  /** 附件观测（上报云端用），我们不做上报，只保留声明位。 */
  attachmentInputPaths?: (input: Record<string, unknown>) => unknown[];
  attachmentOutputPaths?: (output: Record<string, unknown>) => unknown[];
}

export interface CollectedTool {
  inputSchema: z.ZodRawShape;
  description: string;
  // 第 354 轮：这三个字段也收进来，好让测试按**整个工具对象**比对
  // （只比 description + inputSchema 会漏掉 analyse_media 那种只在 outputSchema 上的差异）。
  outputSchema?: z.ZodRawShape;
  annotations?: Record<string, unknown>;
  execution?: Record<string, unknown>;
  confirmable: boolean;
  confirmationMode?: string;
  paramHints?: Record<string, unknown>;
  vendorParamHints?: Record<string, unknown>;
}

export interface ToolRegistrar {
  registerTool<S extends z.ZodRawShape>(name: string, config: ToolConfig<S>, cb: ToolHandler<S>): void;
  collected(): ReadonlyMap<string, CollectedTool>;
}

/** registerTool 的最小面：真实的 McpServer 或测试里的假 server。 */
export interface RegisterToolTarget {
  registerTool(name: string, config: Record<string, unknown>, cb: (args: unknown, extra: unknown) => unknown): unknown;
}

const LOG_LIMIT_PER_TURN = 10;
const LOG_TURN_LIMIT = 500;
const logCounts = new Map<string, number>();

function truncateForLog(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit)}…(+${text.length - limit})`;
}

function writeLog(line: string): void {
  try {
    process.stderr.write(`${line}\n`);
  } catch {
    // stderr 关了也不能影响工具结果
  }
}

/** 同一轮只记前 N 次，免得批量调用刷屏；LRU 保留最近 500 轮的计数。 */
function shouldLogLifecycle(chatTurnId: string | undefined): boolean {
  if (!chatTurnId) return false;
  const next = (logCounts.get(chatTurnId) ?? 0) + 1;
  logCounts.delete(chatTurnId);
  logCounts.set(chatTurnId, next);
  while (logCounts.size > LOG_TURN_LIMIT) {
    const oldest = logCounts.keys().next().value;
    if (typeof oldest !== "string") break;
    logCounts.delete(oldest);
  }
  if (next === LOG_LIMIT_PER_TURN + 1) {
    writeLog(`[chat-turn] stage=mcp_log_capped chat_turn_id=${chatTurnId} limit=${LOG_LIMIT_PER_TURN}`);
  }
  return next <= LOG_LIMIT_PER_TURN;
}

function takeString(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key];
  delete args[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/** chat turn id 是 32 位 hex，其他形状一律当没给（防止把随意字符串写进头）。 */
function takeTurnId(args: Record<string, unknown>): string | undefined {
  const v = takeString(args, CHAT_TURN_ID_KEY);
  return v && /^[0-9a-f]{32}$/i.test(v) ? v.toLowerCase() : undefined;
}

/**
 * 模型漏传 `requestId` 时补一个**确定性**的。
 *
 * `requestId` 是这些写工具的幂等键，schema 里是必填（与参照逐字一致，不能改）。
 * 但真会话里模型会漏（`document_write` 就因此被 SDK 的 zod 挡下：`Required at requestId`）。
 * 这一步在**校验之前**补上，schema 不用动：
 * 同会话、同轮、同参数 → 同一个 id（重试仍幂等）；换参数/换轮次 → 新 id。
 */
/**
 * 模型有时会给必填字段加下划线前缀（`_action`、`_operations`）。
 *
 * 真会话里见过：它把私有的 `_session_id` 当成了"参数命名规范"，于是
 * `composition_edit` 连发三次 `{"_action": "ensure", …}` → SDK 报
 * `Required at action`。这里做**防御性别名**：正式字段缺了、`_字段` 在，就用它，
 * 并把带下划线的旧键删掉。
 */
function moveUnderscoreAliases(shape: z.ZodRawShape, args: Record<string, unknown>): void {
  for (const key of Object.keys(shape)) {
    if (args[key] !== undefined) continue;
    const aliased = `_${key}`;
    if (args[aliased] === undefined) continue;
    args[key] = args[aliased];
    delete args[aliased];
  }
}

/**
 * 把模型写成字符串的结构化成真正的 JSON。
 *
 * 真会话里 qwen3.8 会稳定地把数组/对象参数序列化成一个字符串：
 *   `{"sources":"[{\"key\":\"plan\"}]"}`、`{"ids":"[\"a\",\"b\"]"}`、
 *   `{"output":"{…}"}`、`{"limit":"20"}`、`{"baseRevision":"1"}`
 * —— 于是 SDK 报 `Expected array, received string`。这里按"能解析就解析"修，
 * **不安全不生效**：修完会用 schema 试解析，成功了才用它。
 */
function parseJsonLike(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!(text.startsWith("[") || text.startsWith("{"))) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function numericLike(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (text === "" || !/^-?\d+(\.\d+)?$/.test(text)) return value;
  return Number(text);
}

/**
 * `code_publish` 的 `outputs`：模型会写成"键 → {path}"的对象，schema 要的是
 * `[{key, source:{path}}]`。对象表单在这里展开成数组。
 */
function coercePublishOutputs(args: Record<string, unknown>): Record<string, unknown> {
  const raw = args.outputs;
  if (raw === undefined) return args;
  const parsed = typeof raw === "string" ? parseJsonLike(raw) : raw;
  if (!parsed || typeof parsed !== "object") return { ...args, outputs: parsed };
  // 对象表单 `{key: {...}}` → 数组；数组表单里每一项的 `source` 也要归一：
  // 模型会写 `{key, path}` 或者 `{key, source: "out/x.png"}`，schema 要
  // `{key, source: {path}}`。
  const sourceOf = (value: unknown): unknown => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      if (typeof record.source === "string") return { path: record.source };
      if (record.source !== undefined) return record.source;
      if (typeof record.path === "string") return { path: record.path };
      return value;
    }
    if (typeof value === "string") return { path: value };
    return value;
  };
  const names = new Map<string, string>();
  const entries = Array.isArray(parsed)
    ? parsed.map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return item;
        const record = item as Record<string, unknown>;
        const key = typeof record.key === "string" ? record.key : "";
        const name = [record.name, record.goal, record.title, record.description].find((v): v is string => typeof v === "string" && v.trim() !== "");
        if (key && name) names.set(key, name.trim());
        return { key, source: sourceOf(record) };
      })
    : Object.entries(parsed as Record<string, unknown>).map(([key, value]) => {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          const name = [(value as Record<string, unknown>).name, (value as Record<string, unknown>).goal].find((v): v is string => typeof v === "string" && v.trim() !== "");
          if (name) names.set(key, name.trim());
        }
        return { key, source: sourceOf(value) };
      });

  // **`output` 是必填，模型经常漏**（真机上同一个调用连试 38 次都是 `Required at output`）。
  // 按 outputs 推断：每个 key 建一个 Resource，名字优先用模型给的 name/goal。
  let output = args.output;
  if (output === undefined && entries.length > 0) {
    output = {
      resources: entries.map((entry) => ({
        key: entry.key,
        mode: "create",
        name: names.get(entry.key) ?? entry.key,
      })),
    };
  }
  return { ...args, outputs: entries, ...(output === undefined ? {} : { output }) };
}


/**
 * `deliver` 的参数清洗。
 *
 * 真机上模型给出的形状五花八门（都是同一个原因：它按语义拼，不管网关的白名单）：
 *   - 整个 `output` 是一段 JSON **字符串**；
 *   - 忘了 `sources`，把 `versionId` 塞进 `output.resources[i]`；
 *   - `output.composition.type` 带 `id`，`resources` 里带 `title`/`kind` 之类网关不认的键。
 *
 * 网关对未知字段是**硬拒绝**（422 UNSUPPORTED_FIELD），所以这里按网关的白名单清洗，
 * 并把 `resources[i].versionId` 提升成 `sources[j].versionId`（`reuse` / `new_version` 的真身份）。
 */
function sanitizeDeliver(args: Record<string, unknown>): Record<string, unknown> {
  const parsedOutput = typeof args.output === "string" ? parseJsonLike(args.output) : args.output;
  const output = parsedOutput && typeof parsedOutput === "object" && !Array.isArray(parsedOutput) ? (parsedOutput as Record<string, unknown>) : parsedOutput;

  // 模型常把"单个对象"当成数组传（`sources: {...}`），这里统一包成数组。
  const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : value && typeof value === "object" ? [value] : []);
  const sourcesIn = asArray(args.sources);
  const sources: Record<string, unknown>[] = [];
  for (const item of sourcesIn) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const raw = item as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const key of ["key", "versionId", "artifactId", "path"]) if (raw[key] !== undefined) next[key] = raw[key];
    sources.push(next);
  }

  const derived: Record<string, unknown>[] = [];
  if (output && typeof output === "object" && !Array.isArray(output)) {
    const out = output as Record<string, unknown>;
    if (out.resources !== undefined && !Array.isArray(out.resources)) out.resources = asArray(out.resources);
    if (Array.isArray(out.resources)) {
      out.resources = out.resources.map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
        const raw = entry as Record<string, unknown>;
        const next: Record<string, unknown> = {};
        for (const key of ["key", "mode", "name", "description", "resourceId", "baseVersionId", "disposition"]) {
          if (raw[key] !== undefined) next[key] = raw[key];
        }
        // 身份被写在了 target 上：提升成 source，并从 target 里删掉（网关不认）。
        if (typeof raw.versionId === "string" && !sources.some((source) => source.versionId === raw.versionId)) {
          derived.push({ key: raw.key ?? next.key, versionId: raw.versionId });
        }
        return next;
      });
    }
    if (out.composition && typeof out.composition === "object" && !Array.isArray(out.composition)) {
      const composition = out.composition as Record<string, unknown>;
      const nextComposition: Record<string, unknown> = {};
      for (const key of ["compositionId", "name", "attributes", "placements"]) if (composition[key] !== undefined) nextComposition[key] = composition[key];
      if (composition.type && typeof composition.type === "object") {
        const type = composition.type as Record<string, unknown>;
        const nextType: Record<string, unknown> = {};
        for (const key of ["id", "label", "description"]) if (type[key] !== undefined) nextType[key] = type[key];
        nextComposition.type = nextType;
      }
      if (composition.placements !== undefined && !Array.isArray(composition.placements)) composition.placements = asArray(composition.placements);
      if (Array.isArray(composition.placements)) {
        nextComposition.placements = composition.placements.map((placement) => {
          if (!placement || typeof placement !== "object" || Array.isArray(placement)) return placement;
          const raw = placement as Record<string, unknown>;
          const next: Record<string, unknown> = {};
          for (const key of ["key", "role", "memberId", "replaceResourceId"]) if (raw[key] !== undefined) next[key] = raw[key];
          return next;
        });
      }
      // **缺 placements 时按资源顺序补位。** 网关要求"每个要新建的 resource 都要在
      // composition 里有位置"，模型经常只给 resources 不给 placements，被硬拒：
      //   character, style would be created without a place in a Composition …
      // 与其让它重试三轮，不如照 resources 的顺序各补一条（role 用名字/key）。
      const resourcesOut = Array.isArray(out.resources) ? out.resources : [];
      const placementsOut = Array.isArray(nextComposition.placements) ? nextComposition.placements : [];
      if (resourcesOut.length > 0 && placementsOut.length === 0) {
        nextComposition.placements = resourcesOut.map((entry, index2) => {
          const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
          const key = typeof item.key === "string" && item.key ? item.key : `resource-${index2 + 1}`;
          return { key, role: typeof item.name === "string" && item.name ? item.name : key };
        });
      }
      out.composition = nextComposition;
    }
  }

  const merged = [...sources, ...derived];
  return { ...args, ...(output === undefined ? {} : { output }), ...(merged.length ? { sources: merged } : {}) };
}

/**
 * `design_execute` 的 `output` 归一。
 *
 * 网关的三条硬规则（真机上都撞过）：
 *  1. **恰好一个目标是 primary** —— primary 不带 `key`；所有目标都带 key 会被拒：
 *     "The result is saved under the primary output, and no target is primary."
 *  2. 画布只展示 Composition 成员，所以新建的资源必须**放进 Composition**：
 *     `output.composition` 里要有 `compositionId`（既有）或 `type`+`name`（新建），
 *     外加每个 key 的 `placements`。
 *  3. 模型经常把 `compositionId` / `placements` 写在 `output` **顶层**而不是
 *     `output.composition` 里 —— 这里顺手搬到正确位置。
 */
function normalizeExecuteOutput(value: unknown): unknown {
  const parsed = typeof value === "string" ? (() => {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  })() : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return parsed;
  const output = { ...(parsed as Record<string, unknown>) };

  // 顶层散落的 composition 字段 → 搬进 output.composition
  const loose = ["compositionId", "placements"].some((key) => output[key] !== undefined);
  if (output.composition === undefined && loose) {
    const composition: Record<string, unknown> = {};
    for (const key of ["compositionId", "name", "type", "attributes", "placements"]) {
      if (output[key] !== undefined) {
        composition[key] = output[key];
        delete output[key];
      }
    }
    output.composition = composition;
  }

  // 宿主/模型可能把数组改写成对象，先还原再谈"谁是 primary"。
  const repairedResources = asArrayLike(output.resources);
  if (repairedResources) output.resources = repairedResources;
  if (output.composition !== undefined && typeof output.composition === "object" && !Array.isArray(output.composition)) {
    const composition = { ...(output.composition as Record<string, unknown>) };
    const repairedPlacements = asArrayLike(composition.placements);
    if (repairedPlacements) composition.placements = repairedPlacements;
    output.composition = composition;
  }

  const resources = Array.isArray(output.resources) ? output.resources : undefined;
  if (resources && resources.length > 0) {
    const hasPrimary = resources.some((entry) => entry && typeof entry === "object" && (entry as Record<string, unknown>).key === undefined);
    if (!hasPrimary) {
      // 第一个当 primary：删掉 key，其它保持具名附加输出。
      const first = { ...(resources[0] as Record<string, unknown>) };
      delete first.key;
      output.resources = [first, ...resources.slice(1)];
    }
    const keys = (output.resources as Record<string, unknown>[])
      .map((entry) => (typeof entry.key === "string" ? entry.key : undefined))
      .filter((key): key is string => Boolean(key));
    const composition = output.composition as Record<string, unknown> | undefined;
    if (composition && Array.isArray(composition.placements)) {
      composition.placements = composition.placements.map((placement) => {
        if (!placement || typeof placement !== "object" || Array.isArray(placement)) return placement;
        const next = { ...(placement as Record<string, unknown>) };
        // 具名目标要有对应 key；primary（无 key）就不带 key。
        if (typeof next.key === "string" && !keys.includes(next.key)) delete next.key;
        return next;
      });
    }
  }
  return output;
}


/** 只按 schema 里声明的键去修（不认识的键保持原样，`_session_id` 等私有键也不动）。 */
function repairValues(shape: z.ZodRawShape, args: Record<string, unknown>, mode: "json" | "json+number"): Record<string, unknown> {
  const out = { ...args };
  for (const key of Object.keys(shape)) {
    if (out[key] === undefined) continue;
    const parsed = parseJsonLike(out[key]);
    out[key] = parsed;
    if (mode === "json+number" && parsed === out[key]) {
      const numeric = numericLike(out[key]);
      if (numeric !== out[key]) out[key] = numeric;
    }
  }
  return out;
}

/** `document_write` / `task_query` 这类工具有"必须显式给 mode"的必填项，模型会漏。 */
/**
 * `execute` 的形状补全。
 *
 * 真机（2026-11-06）：
 *   `Expected object, received string at params` +
 *   `Required at output.resources` + `Required at output.composition.placements`
 * —— 模型把 `params` 写成了 JSON 字符串，`output` 只给了 composition 的名字/类型。
 * 这三样都能从已给的信息推出来，不该让整轮生成失败。
 */
function completeExecuteArgs(args: Record<string, unknown>): Record<string, unknown> {
  const out = { ...args };
  // params：字符串 → 对象（含二次编码）
  if (typeof out.params === "string") {
    const parsed = parseJsonLike(out.params);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) out.params = parsed as Record<string, unknown>;
    else delete out.params;
  }
  const output = out.output;
  if (!output || typeof output !== "object" || Array.isArray(output)) return out;
  const next = { ...(output as Record<string, unknown>) };
  const composition = next.composition && typeof next.composition === "object" && !Array.isArray(next.composition)
    ? { ...(next.composition as Record<string, unknown>) }
    : undefined;
  const compositionName = typeof composition?.name === "string" ? composition.name.trim() : "";
  const fallbackName = (typeof out.name === "string" && out.name.trim()) || compositionName || "生成结果";
  const resources = Array.isArray(next.resources) ? next.resources : [];
  if (!resources.length) next.resources = [{ mode: "create", name: fallbackName }];
  if (composition) {
    const placements = Array.isArray(composition.placements) ? composition.placements : [];
    if (!placements.length) composition.placements = [{ role: compositionName || fallbackName }];
    next.composition = composition;
  }
  out.output = next;
  return out;
}

/**
 * `analyse_media` 的形状补全：模型会用 v2 的写法
 * `{ mode: "metadata", versionIds: {item: [...]} }`，而 v3 要求 `references` + `type`。
 * （真机：`Required at references` + `Required at type`，一次白跑。）
 */
function completeAnalyseMediaArgs(args: Record<string, unknown>): Record<string, unknown> {
  const out = { ...args };
  if (out.references === undefined) {
    const ids = asArrayLike(out.versionIds ?? out.version_ids ?? out.versions);
    if (ids?.length) {
      out.references = ids
        .filter((entry): entry is string => typeof entry === "string" && entry !== "")
        .map((versionId) => ({ versionId }));
    }
  }
  if (out.type === undefined && typeof out.mode === "string") {
    if (["metadata", "semantic", "both"].includes(out.mode)) out.type = out.mode;
  }
  if (out.type === undefined) out.type = "metadata";
  delete out.versionIds;
  delete out.version_ids;
  delete out.versions;
  delete out.mode;
  return out;
}

/**
 * `composition_edit` 的深层归一。
 *
 * 真机（2026-11-07 实跑）：模型把成员操作写成
 *   {"operations": "[{\"op\": \"add_member\", \"resourceId\": \"res_x\"}]"}
 * 而 schema 里字段名是 `action`（`z.literal("add_member")`），且 JSON 字符串要解析。
 * 两处都对不上 → `Expected array, received string at operations`，模型连试 22 次。
 *
 * 这里递归处理：字符串化 JSON 解析开；对象里的 `op` 别名为 `action`。
 */
function normalizeCompositionEditArgs(args: Record<string, unknown>): Record<string, unknown> {
  const walk = (value: unknown): unknown => {
    if (typeof value === "string") {
      const parsed = parseJsonLike(value);
      return parsed === value ? value : walk(parsed);
    }
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      const next: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(record)) {
        if (key === "op" && record.action === undefined) continue;
        next[key] = walk(entry);
      }
      if (record.action === undefined && typeof record.op === "string") next.action = record.op;
      if (record.action === undefined && typeof record.operation === "string") next.action = record.operation;
      return next;
    }
    return value;
  };
  return walk(args) as Record<string, unknown>;
}

function inferMissingFields(name: string, args: Record<string, unknown>): Record<string, unknown> {
  const out = { ...args };
  if (name === "document_write" && out.mode === undefined) {
    // 有 edits → patch；带 baseVersionId 的整篇重写 → replace；否则新建。
    if (Array.isArray(out.edits)) out.mode = "patch";
    else if (typeof out.baseVersionId === "string" && out.baseVersionId !== "") out.mode = "replace";
    else if (typeof out.content === "string") out.mode = "create";
  }
  if (name === "code_checkpoint" && (out.message === undefined || out.message === "")) {
    // 模型习惯写 `note`（我们自己的 note 字段名），schema 里叫 message；
    // 有时干脆什么都不给 —— 补一句默认描述，别让整轮因为一个备注字段失败。
    const note = out.note ?? out.description ?? out.summary ?? out.text;
    if (typeof note === "string" && note.trim() !== "") {
      out.message = note;
      delete out.note;
    } else {
      out.message = "自动记录：完成一个里程碑";
    }
  }
  if (name === "task_query" && out.mode === undefined && typeof out.action === "string") {
    // 模型把 mode 写成 action（`{"action":"list"}`）；值不在枚举里就让校验照常报错。
    const candidate = out.action;
    if (["get", "list", "wait", "resolve"].includes(candidate)) out.mode = candidate;
  }
  return out;
}

/**
 * 同义键：模型会用错名字（`capabilityIds` 而不是 schema 里的 `ids`）。
 * 只映射**明知会用到**的少数几个，且仅在正式键缺失时生效；值不对照样由 schema 报错。
 */
const KEY_ALIASES: Record<string, readonly string[]> = {
  ids: ["capabilityIds", "capability_ids"],
  // 真机：`MCP error -32602 … Required at capabilityId` —— 模型写成了下面这些键名之一。
  capabilityId: ["capability_id", "capability", "capabilityID"],
};

function moveKeyAliases(shape: z.ZodRawShape, args: Record<string, unknown>): void {
  for (const [canonical, aliases] of Object.entries(KEY_ALIASES)) {
    if (!Object.prototype.hasOwnProperty.call(shape, canonical)) continue;
    if (args[canonical] !== undefined) continue;
    const hit = aliases.find((alias) => args[alias] !== undefined);
    if (!hit) continue;
    args[canonical] = args[hit];
    delete args[hit];
  }
}

/**
 * 模型会把整份参数塞进一个以动作名命名的键里：
 *
 *   {"ensure":"{\"composition\":{…},\"operations\":[…]}", "_session_id":"…"}
 *
 * 也就是把 `action` 当成了函数名。这里识别"只有一个键、键名是 action/mode 的合法值、
 * 值是个 JSON 对象"的形状，把它拆成 `action: <键名>` + 对象里的字段。
 */
function unpackActionObject(shape: z.ZodRawShape, args: Record<string, unknown>): Record<string, unknown> | null {
  const field = Object.prototype.hasOwnProperty.call(shape, "action")
    ? "action"
    : Object.prototype.hasOwnProperty.call(shape, "mode")
      ? "mode"
      : null;
  if (!field) return null;
  if (args[field] !== undefined) return null;
  const keys = Object.keys(args).filter((key) => !key.startsWith("_"));
  if (keys.length !== 1) return null;
  const key = keys[0];
  if (key === undefined) return null;
  if (["create", "replace", "patch", "ensure", "update", "rename", "set_attributes", "move", "duplicate", "batch", "get", "list", "wait", "resolve", "adopt", "describe"].indexOf(key) < 0) return null;
  const raw = args[key];
  const payload = typeof raw === "string" ? parseJsonLike(raw) : raw;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const rest = { ...(payload as Record<string, unknown>) };
  delete args[key];
  return { ...rest, ...args, [field]: key };
}

/**
 * **通用数组修复**：schema 里声明为数组的字段，如果拿到的不是数组（宿主会把 `[… ]`
 * 改写成 `{"item": …}` / 数字键对象 / 单个对象），用 `asArrayLike` 还原后再交给校验。
 *
 * 之前只给 `execute.output.resources` 做了这件事，于是 `capability_get` 的 `ids`
 * 仍然被判 `Expected array, received object`，模型为此白转了 20 多步（真机日志可查）。
 */
function repairArrayFields(shape: z.ZodRawShape, args: Record<string, unknown>): Record<string, unknown> {
  let out = args;
  for (const key of Object.keys(shape)) {
    const value = out[key];
    if (value === undefined || Array.isArray(value)) continue;
    const field = shape[key];
    if (!field || typeof (field as { safeParse?: unknown }).safeParse !== "function") continue;
    if (field.safeParse(value).success) continue;
    const repaired = asArrayLike(value);
    if (!repaired || !field.safeParse(repaired).success) continue;
    if (out === args) out = { ...args };
    out[key] = repaired;
  }
  return out;
}

/**
 * 入参候选：形状维度（原样 / 深度解壳 / action 展开）× 标量维度（原样 / JSON 字符串 / 数字字符串）。
 * 顺序即优先级：越靠前越"没动过"，先试代价最小的。
 */
function argumentCandidates(
  shape: z.ZodRawShape,
  input: { args: Record<string, unknown>; deep: Record<string, unknown>; unpacked: Record<string, unknown> | null },
): Record<string, unknown>[] {
  const shapes = [input.args];
  if (input.deep !== input.args) shapes.push(input.deep);
  if (input.unpacked && input.unpacked !== input.args) shapes.push(input.unpacked);
  const out: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  const push = (candidate: Record<string, unknown>) => {
    const key = JSON.stringify(candidate);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(candidate);
  };
  // 先原样（不动最好），再 JSON 字符串，最后连数字一起修。
  for (const shapeArgs of shapes) push(shapeArgs);
  for (const shapeArgs of shapes) push(repairValues(shape, shapeArgs, "json"));
  for (const shapeArgs of shapes) push(repairValues(shape, shapeArgs, "json+number"));
  return out;
}

/**
 * 按 zod 的 issue **路径**做定点修复。
 *
 * 比"猜形状"稳：解析失败时 zod 会给出 `path` 与 `expected`，照着改就行 ——
 * 任意深度的字符串数字（`query.limit:"20"`）、包壳数组（`sources:{"item":…}`）、
 * 字符串化对象（`params:"{…}"`）都能一次修好。
 * 最多迭代 3 轮（修一处可能暴露下一处）。
 */
type IssueShape = { code?: string; expected?: string; path?: (string | number)[] };

function repairArgsByIssues(schema: z.ZodTypeAny, input: Record<string, unknown>): Record<string, unknown> | null {
  let current = structuredClone(input);
  for (let round = 0; round < 3; round += 1) {
    const parsed = schema.safeParse(current);
    if (parsed.success) return current;
    const issues = (parsed.error?.issues ?? []) as IssueShape[];
    let changed = false;
    for (const issue of issues) {
      const path = issue.path ?? [];
      if (!path.length) continue;
      const parent = path.slice(0, -1).reduce<unknown>((node, key) => {
        if (node === null || typeof node !== "object") return undefined;
        return (node as Record<string | number, unknown>)[key as string | number];
      }, current);
      if (!parent || typeof parent !== "object") continue;
      const key = path[path.length - 1] as string | number;
      const holder = parent as Record<string | number, unknown>;
      const value = holder[key];
      if (issue.code !== "invalid_type") continue;
      if (issue.expected === "number" && typeof value === "string") {
        const numeric = numericLike(value);
        if (typeof numeric === "number") { holder[key] = numeric; changed = true; }
      } else if (issue.expected === "array" && value && typeof value === "object" && !Array.isArray(value)) {
        const array = asArrayLike(value);
        if (array) { holder[key] = array; changed = true; }
      } else if (issue.expected === "object" && typeof value === "string") {
        const parsedValue = parseJsonLike(value);
        if (parsedValue && typeof parsedValue === "object") { holder[key] = parsedValue; changed = true; }
      }
    }
    if (!changed) return null;
  }
  return schema.safeParse(current).success ? current : null;
}

function withAutoRequestId(shape: z.ZodRawShape, name: string) {
  const needsRequestId = Object.prototype.hasOwnProperty.call(shape, "requestId");
  const object = z.object(shape).passthrough();
  return z.preprocess((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    let args = { ...(value as Record<string, unknown>) };
    // 从**原始入参**算深度解壳（后面的步骤会就地改 args，算晚了就拿到已被改坏的形状）。
    const deepFromOriginal = deepUnwrapArrayWrappers({ ...args });
    moveUnderscoreAliases(shape, args);
    moveKeyAliases(shape, args);
    args = inferMissingFields(name, args);

    // 依次尝试：原样 → 解析 JSON 字符串 → 再把数字字符串转成数字。
    // 第一个能被 schema 接受的就用；都不行就交回原样，让 SDK 如实报错。
    // 只对 **v3** 的 analyse_media 生效：它的 schema 才有 `references`。
    // v2 的 hub_analyse_media 走 `file_path`，不能一起拦。
    if (name === "analyse_media" && Object.prototype.hasOwnProperty.call(shape, "references") && !Array.isArray(args.references) && (typeof args.file_path === "string" || typeof args.media === "string")) {
      // 模型习惯把本地路径直接塞进来。schema 只接受项目 Resource 的 references，
      // 与其让它收到一句看不懂的 "Required at references"，不如直接告诉它怎么改。
      throw new Error(
        "design_analyse_media 只接受项目 Resource 的 references（resourceId 或 versionId）。" +
          "要检查本地渲染帧，用 python/PIL/numpy 在本机统计；要检查已发布的媒体，先 design_deliver 再用它的 resourceId。",
      );
    }
    if (name === "code_publish") args = coercePublishOutputs(args);
    if (name === "deliver") args = sanitizeDeliver(args);
    if (name === "execute" && args.output !== undefined) args = { ...args, output: normalizeExecuteOutput(args.output) };
    if (name.replace(/^(design|hub)_/, "") === "execute") args = normalizeExecuteArgs(args);
    if (name === "code_project_open" && Array.isArray(args.inputs)) {
      // 模型会把 inputs 写成 ["ver_xxx"]；schema 要的是对象数组。
      args = {
        ...args,
        inputs: (args.inputs as unknown[]).map((item) => {
          if (typeof item !== "string") return item;
          if (item.startsWith("ver_")) return { versionId: item };
          if (item.startsWith("res_")) return { resourceId: item };
          return { path: item };
        }),
      };
    }
    // 工具名可能带 `design_` 前缀（v3 命名空间），比较时去掉。
    if (name.replace(/^(design|hub)_/, "") === "capability_get") {
      // `ids` 必须是**字符串数组**。模型会给：单个字符串、JSON 字符串、
      // 单个对象、对象数组（`[{id: "generate_video:x"}]`）—— 全部归一。
      const raw = args.ids ?? args.capabilityId ?? args.id ?? args.capability_id;
      const parsed = typeof raw === "string" ? parseJsonLike(raw) : raw;
      const list = Array.isArray(parsed) ? parsed : parsed === undefined ? [] : [parsed];
      const ids = list
        .map((item) => (typeof item === "string" ? item : item && typeof item === "object" ? (item as Record<string, unknown>).id ?? (item as Record<string, unknown>).capabilityId ?? (item as Record<string, unknown>).value : undefined))
        .filter((item): item is string => typeof item === "string" && item.trim() !== "");
      if (ids.length) args = { ...args, ids };
      // 别名键留着会变成"未知字段"，整份参数校验失败后退回无过滤的候选 → 工具忽略过滤返回全量。
      const stripped = { ...args };
      for (const key of ["capabilityIds", "capability_ids", "capabilityId", "capability_id", "id"]) delete stripped[key];
      args = stripped;
    }
    if (name === "document_write") {
      // 模型会按语义补 `title` / `docType`（网关只认 name/format，未知字段是硬 422）。
      const next = { ...args };
      if (next.name === undefined && typeof next.title === "string") next.name = next.title;
      delete next.title;
      delete next.docType;
      delete next.documentType;
      args = next;
    }
    if (name === "execute") args = completeExecuteArgs(args);
    if (name === "analyse_media") args = completeAnalyseMediaArgs(args);
    if (name === "composition_edit") args = normalizeCompositionEditArgs(args);
    args = repairArrayFields(shape, args);
    const deepNormalized = normalizeDeepArrayElements(args);
    if (deepNormalized !== args) args = deepNormalized;
    // 只作为**候选**：整体深度解壳太激进（会把合法的 `{item: …}` 对象也变成数组），
    // 所以不改写 args，只在常规候选都校验失败时才尝试。
    const deepUnwrapped = deepFromOriginal;
    const unpacked = unpackActionObject(shape, args);
    // **候选按"形状 × 标量修复"交叉组合**：真机踩过的组合有
    //   纯包壳（deliver）、包壳+字符串数字（composition_edit）、
    //   字符串 params（execute）、action 对象展开（document_write）……
    // 逐个工具补漏会一直漏，这里统一生成、去重后按优先级试。
    const candidates = argumentCandidates(shape, { args, deep: deepUnwrapped, unpacked });
    // 路径驱动的定点修复（任意深度的字符串数字 / 包壳 / 字符串化对象）。
    const byIssues = repairArgsByIssues(object, args);
    if (byIssues && !candidates.some((candidate) => JSON.stringify(candidate) === JSON.stringify(byIssues))) candidates.push(byIssues);
    const accepted = candidates.find((candidate) => object.safeParse(candidate).success);
    if (!accepted && process.env.OV_MCP_LOG_ARGS !== "0") {
      // **参数校验失败必须留证据**：宿主/模型改写的形状千奇百怪（数组包壳、元素包壳、
      // 字段名漂移），没原始参数就只能靠猜。真机 case：`Invalid input at output.resources[0]`。
      const parsed = object.safeParse(args);
      const issue = parsed.success
        ? undefined
        : parsed.error.issues
            .slice(0, 3)
            .map((item) => `${item.path.join(".") || "<root>"}: ${item.message}`)
            .join(" | ");
      writeLog(
        `[mcp-args] tool=${name} rejected path=${issue ?? "unknown"} args=${truncateForLog(JSON.stringify(args ?? null), 1800)}`,
      );
    }
    args = accepted ?? args;

    if (!needsRequestId) return args;
    if (typeof args.requestId === "string" && args.requestId.trim() !== "") return args;
    const { _session_id, _chat_turn_id, _tool_use_id, ...rest } = args;
    const seed = JSON.stringify([name, _session_id ?? "", _chat_turn_id ?? "", _tool_use_id ?? "", rest]);
    args.requestId = `auto-${createHash("sha256").update(seed).digest("hex").slice(0, 32)}`;
    return args;
  }, object);
}

export function createToolRegistrar(server: RegisterToolTarget): ToolRegistrar {
  const collected = new Map<string, CollectedTool>();

  return {
    registerTool(name, config, cb) {
      const {
        confirmable,
        confirmationMode,
        paramHints,
        vendorParamHints,
        attachmentInputPaths: _in,
        attachmentOutputPaths: _out,
        inputSchema,
        ...sdkConfig
      } = config;
      collected.set(name, {
        inputSchema,
        description: config.description,
        ...(config.outputSchema ? { outputSchema: config.outputSchema } : {}),
        ...(config.annotations ? { annotations: config.annotations } : {}),
        execution: config.execution ?? { taskSupport: "forbidden" },
        confirmable: confirmable === true,
        ...(confirmationMode ? { confirmationMode } : {}),
        ...(paramHints ? { paramHints } : {}),
        ...(vendorParamHints ? { vendorParamHints } : {}),
      });

      const wrapped = async (rawArgs: unknown, extra: unknown): Promise<CallToolResult> => {
        let sessionId: string | undefined;
        let chatTurnId: string | undefined;
        let toolUseId: string | undefined;
        let groupId: string | undefined;
        let groupScope: GroupScope | undefined;
        let overrideNote: string | undefined;
        if (rawArgs && typeof rawArgs === "object") {
          const args = rawArgs as Record<string, unknown>;
          sessionId = takeString(args, SESSION_ID_KEY);
          chatTurnId = takeTurnId(args);
          toolUseId = takeString(args, TOOL_USE_ID_KEY);
          groupId = takeString(args, GROUP_ID_KEY);
          const scope = takeString(args, GROUP_SCOPE_KEY);
          groupScope = scope === "legacy" || scope === "unresolved" ? scope : undefined;
          overrideNote = takeString(args, USER_OVERRIDE_NOTE_KEY);
        }

        const startedAt = Date.now();
        const logIt = shouldLogLifecycle(chatTurnId);
        const ids = `chat_turn_id=${chatTurnId ?? "none"} session_id=${sessionId ?? "none"} tool_use_id=${toolUseId ?? "none"} tool=${name}`;
        if (logIt) writeLog(`[chat-turn] stage=mcp_started ${ids}`);

        let result: CallToolResult;
        try {
          result = await runWithSession({ sessionId, chatTurnId, toolUseId, groupId, groupScope }, () =>
            cb(rawArgs as ToolArgs<typeof inputSchema>, extra),
          );
          if (logIt) writeLog(`[chat-turn] stage=mcp_finished ${ids} status=ok elapsed_ms=${Date.now() - startedAt}`);
        } catch (err) {
          if (logIt) {
            const type = err instanceof Error ? err.name : "unknown";
            writeLog(`[chat-turn] stage=mcp_finished ${ids} status=error elapsed_ms=${Date.now() - startedAt} error_type=${type}`);
          }
          throw err;
        }

        if (overrideNote && result && Array.isArray(result.content)) {
          result.content.push({ type: "text", text: `\n[User Override] ${overrideNote}` });
        }
        return result;
      };

      server.registerTool(
        name,
        {
          ...sdkConfig,
          // 第 354 轮：显式声明，不再依赖 SDK 默认值（参照 25 个工具都是 forbidden）。
          execution: config.execution ?? { taskSupport: "forbidden" },
          inputSchema: withAutoRequestId(inputSchema, name),
        },
        wrapped,
      );
    },
    collected: () => collected,
  };
}

export { normalizeExecuteReferences };
export const normalizeExecuteReferencesForTest = normalizeExecuteReferences;
