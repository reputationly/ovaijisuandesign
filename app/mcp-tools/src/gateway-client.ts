import { z } from "zod";

import {
  currentAgentRunId,
  currentChatTurnId,
  currentGroupId,
  currentSessionId,
  currentToolUseId,
} from "./context.js";
import { HealthResponseSchema } from "./schemas.js";

/**
 * 打本地 gateway 的客户端（docs/mcp-tools-architecture.md）。
 *
 * 普通调用不重试：生成、写画布这类请求可能已经在 gateway 侧生效，
 * 重放会重复扣费 / 重复建节点。只有探活和生成轮询（run-async.ts）重试。
 */

export const SESSION_ID_HEADER = "x-session-id";
export const TOOL_USE_ID_HEADER = "x-tool-use-id";
export const AGENT_RUN_ID_HEADER = "x-agent-run-id";
export const CHAT_TURN_ID_HEADER = "x-chat-turn-id";
export const GROUP_ID_HEADER = "x-group-id";

const log = (line: string) => process.stderr.write(`[hilo-tools] ${line}\n`);

export class GatewayHttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly reason?: string;
  constructor(args: { status: number; code: string; reason?: string; message: string }) {
    super(args.message);
    this.name = "GatewayHttpError";
    this.status = args.status;
    this.code = args.code;
    if (args.reason) this.reason = args.reason;
  }
}

/** post 失败时拼出的形状；响应 schema 若接受它就当正常返回交给工具处理。 */
export interface GatewayPostFailure {
  ok: false;
  error: string;
  error_code: string;
  cloud_status?: number;
  failure_presentation: "status_unknown" | "terminal";
}

const HttpErrorBodySchema = z
  .object({
    statusCode: z.number().int().optional(),
    code: z.string().min(1).optional(),
    error_code: z.string().min(1).optional(),
    reason: z.string().min(1).optional(),
    message: z.union([z.string(), z.array(z.string())]).optional(),
    error: z.string().optional(),
    user_message: z.string().optional(),
  })
  .passthrough();

/** 非 2xx 体 → 错误：消息取 user_message > message > error，码取 code > error_code > gateway_http_<status>。 */
export async function parseHttpError(resp: Response): Promise<GatewayHttpError> {
  const text = await resp.text().catch(() => "");
  let body: z.infer<typeof HttpErrorBodySchema> | undefined;
  if (text) {
    try {
      const parsed = HttpErrorBodySchema.safeParse(JSON.parse(text));
      if (parsed.success) body = parsed.data;
    } catch {
      // 非 JSON 体，下面用原文
    }
  }
  const raw = body?.user_message ?? body?.message ?? body?.error;
  const message = Array.isArray(raw) ? raw.join("; ") : raw || text || resp.statusText || `HTTP ${resp.status}`;
  return new GatewayHttpError({
    status: resp.status,
    code: body?.code ?? body?.error_code ?? `gateway_http_${resp.status}`,
    ...(body?.reason ? { reason: body.reason } : {}),
    message,
  });
}

export interface HealthCheckOptions {
  attempts?: number;
  timeoutMs?: number;
  delayMs?: number;
}

export class GatewayClient {
  private readonly baseHeaders: Record<string, string> = { "Content-Type": "application/json" };

  constructor(readonly baseUrl: string) {}

  /** 按当前工具调用的上下文加头：gateway 用它们把中止限定到会话、把任务和工具调用对上。 */
  requestHeaders(): Record<string, string> {
    const out = { ...this.baseHeaders };
    const sessionId = currentSessionId();
    const toolUseId = currentToolUseId();
    const agentRunId = currentAgentRunId();
    const chatTurnId = currentChatTurnId();
    const groupId = currentGroupId();
    if (sessionId) out[SESSION_ID_HEADER] = sessionId;
    if (toolUseId) out[TOOL_USE_ID_HEADER] = toolUseId;
    if (agentRunId) out[AGENT_RUN_ID_HEADER] = agentRunId;
    if (chatTurnId) out[CHAT_TURN_ID_HEADER] = chatTurnId;
    if (groupId) out[GROUP_ID_HEADER] = groupId;
    return out;
  }

  url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  async get<S extends z.ZodTypeAny>(path: string, timeoutMs: number, schema: S): Promise<z.output<S>> {
    let resp: Response;
    try {
      resp = await fetch(this.url(path), {
        method: "GET",
        headers: this.requestHeaders(),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const msg = errorMessage(err);
      log(`GET ${path} network error: ${msg}`);
      throw new Error(`Gateway network error (GET ${path}): ${msg}`);
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      log(`GET ${path} HTTP ${resp.status}: ${text.slice(0, 500)}`);
      throw new Error(`Gateway ${resp.status}: ${text}`);
    }
    try {
      return schema.parse(await resp.json());
    } catch (err) {
      log(`GET ${path} schema parse failed: ${errorMessage(err)}`);
      throw err;
    }
  }

  /**
   * 失败时先拼 `{ok:false, error, error_code, cloud_status?, failure_presentation}`：
   * 408 / 5xx / 网络错是 status_unknown（请求可能已生效），其余 terminal。
   * 响应 schema 接受这个形状就原样返回，让工具按业务语义回话；否则抛错。
   */
  async post<S extends z.ZodTypeAny>(path: string, body: unknown, timeoutMs: number, schema: S): Promise<z.output<S>> {
    const serialized = JSON.stringify(body);
    log(`POST ${this.url(path)} body=${serialized}`);
    let resp: Response;
    try {
      resp = await fetch(this.url(path), {
        method: "POST",
        headers: this.requestHeaders(),
        body: serialized,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const msg = errorMessage(err);
      log(`POST ${path} network error: ${msg}`);
      const isTimeout = err instanceof Error && err.name === "TimeoutError";
      const failure: GatewayPostFailure = {
        ok: false,
        error: `Gateway network error: ${msg}`,
        error_code: isTimeout ? "timeout" : "network_error",
        failure_presentation: "status_unknown",
      };
      const parsed = schema.safeParse(failure);
      if (parsed.success) return parsed.data;
      throw new GatewayHttpError({
        status: 0,
        code: failure.error_code,
        reason: isTimeout ? "request_timeout" : "network_error",
        message: failure.error,
      });
    }
    if (!resp.ok) {
      const httpError = await parseHttpError(resp);
      const failure: GatewayPostFailure = {
        ok: false,
        error: httpError.message,
        error_code: httpError.code,
        cloud_status: resp.status,
        failure_presentation: resp.status === 408 || resp.status >= 500 ? "status_unknown" : "terminal",
      };
      const parsed = schema.safeParse(failure);
      if (parsed.success) return parsed.data;
      throw httpError;
    }
    return schema.parse(await resp.json());
  }

  async patch<S extends z.ZodTypeAny>(path: string, body: unknown, timeoutMs: number, schema: S): Promise<z.output<S>> {
    const serialized = JSON.stringify(body);
    log(`PATCH ${this.url(path)} body=${serialized.slice(0, 500)}`);
    let resp: Response;
    try {
      resp = await fetch(this.url(path), {
        method: "PATCH",
        headers: this.requestHeaders(),
        body: serialized,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw new Error(`Gateway network error (PATCH ${path}): ${errorMessage(err)}`);
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Gateway ${resp.status}: ${text}`);
    }
    return schema.parse(await resp.json());
  }

  /**
   * 不等结果的通知：失败只记 stderr，绝不影响工具回话 ——
   * 本地动作（写记忆、写 plan）已经成功了，通知丢了只是 UI 晚刷新。
   */
  async fireAndForget(path: string, body: unknown, timeoutMs: number, label: string): Promise<void> {
    try {
      const resp = await fetch(this.url(path), {
        method: "POST",
        headers: this.requestHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!resp.ok) log(`${label} ${resp.status} (non-fatal, fire-and-forget)`);
    } catch (err) {
      log(`${label} swallowed: ${errorMessage(err)} (non-fatal, fire-and-forget)`);
    }
  }

  /** 探活：失败间隔 delayMs 重试，全部失败抛错（main 据此 exit(1)）。 */
  async healthCheck(opts: HealthCheckOptions = {}): Promise<void> {
    const attempts = opts.attempts ?? 5;
    const timeoutMs = opts.timeoutMs ?? 3_000;
    const delayMs = opts.delayMs ?? 1_000;
    let last: Error | undefined;
    for (let i = 0; i < attempts; i++) {
      try {
        await this.get("/api/health/live", timeoutMs, HealthResponseSchema);
        return;
      } catch (err) {
        last = err instanceof Error ? err : new Error(String(err));
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw new Error(`Gateway health check failed after ${attempts} attempts (${this.baseUrl}): ${last?.message}`);
  }

  // ── 跨模块的通知与查询 ──

  /** plan 文件落盘后通知看板刷新。 */
  notifyPlanChanged(payload: Record<string, unknown>): Promise<void> {
    const runtimeSessionId = currentSessionId();
    return this.fireAndForget(
      "/api/plan/notify-changed",
      { ...payload, ...(runtimeSessionId ? { runtime_session_id: runtimeSessionId } : {}) },
      2_000,
      "notifyPlanChanged",
    );
  }

  /** agent 手动写了记忆：本会话结束时 gateway 就跳过自动反馈提取。 */
  async notifyManualMemoryWrite(sessionId: string | undefined): Promise<void> {
    if (!sessionId) return;
    await this.fireAndForget("/api/feedback-extractor/notify-manual-write", { sessionId }, 2_000, "notifyManualMemoryWrite");
  }

  /** 启动时推每个工具的参数提示 / 可确认标记。 */
  pushToolMetas(metas: Record<string, unknown>): Promise<void> {
    return this.fireAndForget("/api/internal/tool-metas", { metas }, 5_000, "pushToolMetas");
  }

  /**
   * 模型守卫：用户在选择器里勾了哪些模型。null = 不过滤（自动模式、未知会话、
   * 或查询失败 —— 查询失败 fail-open，gateway 抖一下不该挡住生成）。
   */
  async getSelectedMediaModels(sessionId: string): Promise<SelectedMediaModels | null> {
    try {
      const { selected } = await this.get(
        `/api/internal/sessions/${encodeURIComponent(sessionId)}/selected-models`,
        5_000,
        SelectedModelsEnvelopeSchema,
      );
      return selected;
    } catch (err) {
      log(`picker guard fail-open: getSelectedMediaModels(${sessionId}) failed: ${errorMessage(err)}`);
      return null;
    }
  }

  async listAssets(opts: { includeMetadata?: boolean } = {}): Promise<Record<string, unknown>[]> {
    const resp = await this.get(
      opts.includeMetadata ? "/api/assets?include=metadata" : "/api/assets",
      10_000,
      z.object({ assets: z.array(z.record(z.unknown())) }),
    );
    return resp.assets;
  }
}

const SelectedModelsEnvelopeSchema = z.object({
  selected: z
    .object({
      image: z.array(z.string()).optional(),
      video: z.array(z.string()).optional(),
      audio: z.array(z.string()).optional(),
    })
    .nullable(),
});
export type SelectedMediaModels = NonNullable<z.infer<typeof SelectedModelsEnvelopeSchema>["selected"]>;

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
