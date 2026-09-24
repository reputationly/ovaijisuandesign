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

      server.registerTool(name, { ...sdkConfig, inputSchema: z.object(inputSchema).passthrough() }, wrapped);
    },
    collected: () => collected,
  };
}
