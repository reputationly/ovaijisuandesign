import { createHash } from "node:crypto";

import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

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

function withAutoRequestId(shape: z.ZodRawShape, name: string) {
  const needsRequestId = Object.prototype.hasOwnProperty.call(shape, "requestId");
  const object = z.object(shape).passthrough();
  return z.preprocess((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    let args = { ...(value as Record<string, unknown>) };
    moveUnderscoreAliases(shape, args);
    moveKeyAliases(shape, args);
    args = inferMissingFields(name, args);

    // 依次尝试：原样 → 解析 JSON 字符串 → 再把数字字符串转成数字。
    // 第一个能被 schema 接受的就用；都不行就交回原样，让 SDK 如实报错。
    if (name === "code_publish") args = coercePublishOutputs(args);
    const unpacked = unpackActionObject(shape, args);
    const candidates = [
      args,
      ...(unpacked ? [unpacked, repairValues(shape, unpacked, "json"), repairValues(shape, unpacked, "json+number")] : []),
      repairValues(shape, args, "json"),
      repairValues(shape, args, "json+number"),
    ];
    args = candidates.find((candidate) => object.safeParse(candidate).success) ?? args;

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
