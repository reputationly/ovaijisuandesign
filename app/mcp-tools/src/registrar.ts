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

function withAutoRequestId(shape: z.ZodRawShape, name: string) {
  const needsRequestId = Object.prototype.hasOwnProperty.call(shape, "requestId");
  const object = z.object(shape).passthrough();
  return z.preprocess((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const args = { ...(value as Record<string, unknown>) };
    moveUnderscoreAliases(shape, args);
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
