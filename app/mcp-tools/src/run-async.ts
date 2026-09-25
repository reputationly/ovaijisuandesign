import { z } from "zod";

import {
  adoptBillingScope,
  requireBillingScope,
  currentGroupId,
  currentGroupScope,
  currentSessionId,
} from "./context.js";
import { errorMessage, type GatewayClient } from "./gateway-client.js";
import {
  GatewayErrorSchema,
  GenerateResponseSchema,
  REFUND_STATUSES,
  type GatewayError,
  type GenerateResponse,
} from "./schemas.js";

/**
 * 生成长任务：提交 → MCP 进程内同步轮询到终态。没有 SSE、没有 progress 通知，
 * 节点和完成事件由 gateway 自己广播。
 */

export type GenerateKind = "image" | "video" | "speech" | "music";

export const SUBMIT_TIMEOUT_MS = 30 * 60_000;
export const QUERY_TIMEOUT_MS = 30_000;
export const OVERALL_TIMEOUT_MS = 300 * 60_000;
export const POLL_BASE_MS = 1_000;
export const POLL_CAP_MS = 15_000;
export const POLL_FACTOR = 1.6;
export const POLL_JITTER = 0.2;
const REQUEST_GROUP_RECOVERY_TIMEOUT_MS = 5_000;

const CLOUD_POLL_MIN_INTERVAL_MS = 1_000;
const CLOUD_POLL_MAX_INTERVAL_MS = 60_000;
const CLOUD_POLL_MAX_WINDOW_MS = 30 * 60_000;

/** 测试注入：缩短间隔和超时，免得真等。 */
export interface RunAsyncOptions {
  overallTimeoutMs?: number;
  submitTimeoutMs?: number;
  queryTimeoutMs?: number;
  pollBaseMs?: number;
  pollCapMs?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

/** gateway 在窗口期内指定固定轮询间隔（云端状态刷新节奏），过了窗口回到指数退避。 */
export interface CloudStatusPollingPolicy {
  fixedIntervalMs: number;
  fixedWindowMs: number;
}

export function isCloudStatusPollingPolicy(v: unknown): v is CloudStatusPollingPolicy {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const p = v as Record<string, unknown>;
  const iv = p.fixedIntervalMs;
  const win = p.fixedWindowMs;
  return (
    Number.isInteger(iv) &&
    Number.isInteger(win) &&
    (iv as number) >= CLOUD_POLL_MIN_INTERVAL_MS &&
    (iv as number) <= CLOUD_POLL_MAX_INTERVAL_MS &&
    (win as number) > 0 &&
    (win as number) <= CLOUD_POLL_MAX_WINDOW_MS &&
    (win as number) >= (iv as number)
  );
}

const SubmitResponseSchema = z.object({
  ok: z.literal(true),
  task_id: z.string(),
  status: z.literal("processing"),
  media_type: z.enum(["image", "video", "speech", "music"]),
  cloud_status_polling: z.object({ fixedIntervalMs: z.number(), fixedWindowMs: z.number() }).optional(),
  cloud_status_polling_started_at_ms: z.number().int().nonnegative().optional(),
});

/** 任务已经提交并扣费，可选的优化字段不合法就丢掉，不能因此丢了任务句柄。 */
function dropInvalidPollingHints(v: unknown): unknown {
  if (!v || typeof v !== "object" || Array.isArray(v)) return v;
  const out = { ...(v as Record<string, unknown>) };
  if (!isCloudStatusPollingPolicy(out.cloud_status_polling)) {
    delete out.cloud_status_polling;
    delete out.cloud_status_polling_started_at_ms;
    return out;
  }
  const started = out.cloud_status_polling_started_at_ms;
  if (typeof started !== "number" || !Number.isInteger(started) || started < 0) {
    delete out.cloud_status_polling_started_at_ms;
  }
  return out;
}

const QueryResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    task_id: z.string(),
    status: z.literal("succeeded"),
    result: z.unknown(),
    asset: z.unknown().optional(),
  }),
  z.object({ ok: z.literal(true), task_id: z.string(), status: z.literal("processing") }),
  z.object({
    ok: z.literal(false),
    task_id: z.string(),
    status: z.literal("failed"),
    cloud_terminal: z.literal(true),
    error: z.string(),
    error_code: z.string().optional(),
    user_message: z.string().optional(),
    // 未知取值按没有信息处理，不让它挡住整条查询响应
    refund_status: z.preprocess(
      (v) => ((REFUND_STATUSES as readonly unknown[]).includes(v) ? v : undefined),
      z.enum(REFUND_STATUSES).optional(),
    ),
    refunded_credits: z.number().optional(),
  }),
]);

interface PollDecision {
  delayMs: number;
  nextIntervalMs: number;
  jitter: boolean;
}

function nextPollDelay(
  currentMs: number,
  policyElapsedMs: number,
  policy: CloudStatusPollingPolicy | undefined,
  capMs: number,
): PollDecision {
  if (!policy) {
    return { delayMs: currentMs, nextIntervalMs: Math.min(currentMs * POLL_FACTOR, capMs), jitter: true };
  }
  if (policyElapsedMs < policy.fixedWindowMs) {
    return { delayMs: policy.fixedIntervalMs, nextIntervalMs: policy.fixedIntervalMs, jitter: false };
  }
  const next = Math.min(currentMs * POLL_FACTOR, capMs);
  return { delayMs: next, nextIntervalMs: next, jitter: true };
}

/** 退避重置：窗口期内回到固定间隔；否则回到“下一次乘完正好是 base”的值。 */
function intervalAfterHiccup(policy: CloudStatusPollingPolicy | undefined, startedAtMs: number, baseMs: number): number {
  if (!policy) return baseMs;
  if (Date.now() - startedAtMs < policy.fixedWindowMs) return policy.fixedIntervalMs;
  return baseMs / POLL_FACTOR;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    t.unref?.();
  });

const diag = (line: string) => process.stderr.write(`[diag] ${line}\n`);

function fail(obj: Record<string, unknown>): GenerateResponse {
  return GenerateResponseSchema.parse({ ok: false, ...obj });
}

async function parseSubmitError(resp: Response): Promise<Pick<GatewayError, "error"> & Partial<GatewayError>> {
  const text = await resp.text().catch(() => "");
  if (text) {
    try {
      return GatewayErrorSchema.parse(JSON.parse(text));
    } catch {
      // 不是标准失败体，退回原文
    }
  }
  return { error: text || resp.statusText || `HTTP ${resp.status}` };
}

/**
 * 提交并轮询到终态。
 * - 提交不重试：gateway 回错之前云端可能已经建了任务。
 * - 轮询遇网络错 / 5xx / 408 / 429 重置退避继续；其他 4xx 直接回 recoverable（带 recovery_handle）。
 * - `processing` 但 task_id 变了（gateway 换了底层任务）就改查新 id。
 */
export async function runAsync(
  gw: GatewayClient,
  kind: GenerateKind,
  body: unknown,
  opts: RunAsyncOptions = {},
): Promise<GenerateResponse> {
  const overallTimeoutMs = opts.overallTimeoutMs ?? OVERALL_TIMEOUT_MS;
  const baseMs = opts.pollBaseMs ?? POLL_BASE_MS;
  const capMs = opts.pollCapMs ?? POLL_CAP_MS;
  const sleep = opts.sleep ?? defaultSleep;
  const random = opts.random ?? Math.random;

  await ensureBillingScope(gw, kind);
  requireBillingScope(`${kind} generation`);

  const startedAt = Date.now();
  const submitUrl = gw.url(`/api/generate/${kind}/submit`);
  process.stderr.write(`[hilo-tools] POST ${submitUrl} body=${JSON.stringify(body)}\n`);

  let resp: Response;
  try {
    resp = await fetch(submitUrl, {
      method: "POST",
      headers: gw.requestHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.submitTimeoutMs ?? SUBMIT_TIMEOUT_MS),
    });
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return fail({
      error: `Gateway network error: ${errorMessage(err)}`,
      error_code: isTimeout ? "timeout" : "network_error",
      failure_presentation: "status_unknown",
    });
  }

  if (!resp.ok) {
    const f = await parseSubmitError(resp);
    const isBilling = f.error_code === "billing_insufficient_balance" || f.cloud_error_type === "insufficient_quota";
    const retryableStatus = resp.status >= 500 || resp.status === 408 || resp.status === 429;
    const clientStatus = resp.status >= 400 && resp.status < 500 && resp.status !== 408 && resp.status !== 429;
    return fail({
      error: `submit ${resp.status}: ${f.error}${f.error_code ? ` [${f.error_code}]` : ""}`,
      error_code: isBilling ? "billing_insufficient_balance" : retryableStatus ? "backend_error" : "client_error",
      ...(f.user_message ? { user_message: f.user_message } : {}),
      ...(f.billing ? { billing: f.billing } : {}),
      failure_presentation: f.failure_presentation ?? (isBilling || clientStatus ? "terminal" : "status_unknown"),
    });
  }

  let submit: z.infer<typeof SubmitResponseSchema>;
  try {
    submit = SubmitResponseSchema.parse(dropInvalidPollingHints(await resp.json()));
  } catch (err) {
    return fail({
      error: `submit schema parse failed: ${errorMessage(err)}`,
      error_code: "unknown",
      failure_presentation: "status_unknown",
    });
  }

  let taskId = submit.task_id;
  diag(`submit done kind=${kind} taskId=${taskId} submitMs=${Date.now() - startedAt}`);
  const policy = submit.cloud_status_polling as CloudStatusPollingPolicy | undefined;
  const policyStartedAt = submit.cloud_status_polling_started_at_ms ?? startedAt;
  let interval = policy?.fixedIntervalMs ?? baseMs;
  let pollCount = 0;

  while (Date.now() - startedAt < overallTimeoutMs) {
    const decision = nextPollDelay(interval, Math.max(0, Date.now() - policyStartedAt), policy, capMs);
    const spread = decision.jitter ? decision.delayMs * POLL_JITTER : 0;
    await sleep(decision.delayMs + (random() * 2 - 1) * spread);
    interval = decision.nextIntervalMs;

    let q: Response;
    try {
      q = await fetch(gw.url(`/api/generate/tasks/${encodeURIComponent(taskId)}/query`), {
        method: "GET",
        headers: gw.requestHeaders(),
        signal: AbortSignal.timeout(opts.queryTimeoutMs ?? QUERY_TIMEOUT_MS),
      });
    } catch (err) {
      process.stderr.write(`[hilo-tools] GET query network error: ${errorMessage(err)}\n`);
      interval = intervalAfterHiccup(policy, policyStartedAt, baseMs);
      continue;
    }
    if (q.status >= 500 || q.status === 408 || q.status === 429) {
      process.stderr.write(`[hilo-tools] GET query retry on ${q.status}\n`);
      await q.body?.cancel().catch(() => {});
      interval = intervalAfterHiccup(policy, policyStartedAt, baseMs);
      continue;
    }
    if (!q.ok) {
      const text = await q.text().catch(() => "");
      return fail({
        error: `query ${q.status}: ${text}`,
        error_code: "client_error",
        // 404 = gateway 不认识这个任务（可能重启过），状态未知；其余 4xx 可凭 handle 找回
        failure_presentation: q.status === 404 ? "status_unknown" : "recoverable",
        recovery_handle: taskId,
      });
    }

    let data: z.infer<typeof QueryResponseSchema>;
    try {
      data = QueryResponseSchema.parse(await q.json());
    } catch (err) {
      process.stderr.write(`[hilo-tools] GET query schema parse failed: ${errorMessage(err)}\n`);
      return fail({
        error: `query schema parse failed: ${errorMessage(err)}`,
        error_code: "unknown",
        failure_presentation: "recoverable",
        recovery_handle: taskId,
      });
    }
    pollCount += 1;
    diag(
      `poll kind=${kind} taskId=${taskId} n=${pollCount} elapsedMs=${Date.now() - startedAt} ` +
        `interval=${Math.round(interval)} status=${data.status}`,
    );

    if (data.status === "processing") {
      if (data.task_id !== taskId) {
        diag(`task id switched kind=${kind} from=${taskId} to=${data.task_id}`);
        taskId = data.task_id;
        interval = intervalAfterHiccup(policy, policyStartedAt, baseMs);
      }
      continue;
    }

    if (data.status === "succeeded") {
      diag(`done kind=${kind} taskId=${taskId} status=succeeded polls=${pollCount} totalMs=${Date.now() - startedAt}`);
      const parsed = GenerateResponseSchema.safeParse(data.result);
      if (parsed.success) return parsed.data;
      // result 不合规时退到 asset 摘要里的路径 —— 产物已经落盘，别让 agent 以为失败了去重跑
      const assetPath =
        data.asset && typeof data.asset === "object" ? (data.asset as Record<string, unknown>).path : undefined;
      if (typeof assetPath === "string" && assetPath.length > 0) {
        return GenerateResponseSchema.parse({ ok: true, path: assetPath });
      }
      process.stderr.write(`[hilo-tools] succeeded without a usable result or asset path: ${parsed.error.message}\n`);
      return fail({
        error: `gateway reported success but returned no usable asset path: ${parsed.error.message}`,
        error_code: "unknown",
        failure_presentation: "recoverable",
        recovery_handle: taskId,
      });
    }

    diag(`done kind=${kind} taskId=${taskId} status=failed polls=${pollCount} totalMs=${Date.now() - startedAt}`);
    const isBilling = data.error_code === "billing_insufficient_balance";
    return fail({
      error: data.error_code ? `${data.error} [${data.error_code}]` : data.error,
      error_code: isBilling ? "billing_insufficient_balance" : "backend_error",
      ...(data.user_message ? { user_message: data.user_message } : {}),
      ...(data.refund_status ? { refund_status: data.refund_status } : {}),
      ...(data.refunded_credits ? { refunded_credits: data.refunded_credits } : {}),
      failure_presentation: "terminal",
    });
  }

  diag(`gave up kind=${kind} taskId=${taskId} polls=${pollCount} totalMs=${Date.now() - startedAt}`);
  return fail({
    error: `async poll exceeded ${overallTimeoutMs}ms`,
    error_code: "timeout",
    failure_presentation: "recoverable",
    recovery_handle: taskId,
  });
}

// ── 计费范围 ──

const RequestGroupRecoverySchema = z.discriminatedUnion("mode", [
  z.object({
    group_id: z.string().regex(/^[1-9]\d*$/),
    mode: z.literal("canonical"),
    source: z.enum(["turn", "turn_mirror", "gateway_selection"]),
  }),
  z.object({
    group_id: z.null(),
    mode: z.literal("legacy"),
    source: z.enum(["turn", "turn_mirror", "no_selection"]),
  }),
]);

const BillingCurrentScopeSchema = z.discriminatedUnion("mode", [
  z.object({ group_id: z.string().regex(/^[1-9]\d*$/), mode: z.literal("canonical"), source: z.enum(["gateway_selection"]) }),
  z.object({ group_id: z.null(), mode: z.literal("legacy"), source: z.enum(["no_selection"]) }),
]);

const rg = (line: string) => process.stderr.write(`[request-group] ${line}\n`);

/**
 * 插件没给出可用的计费范围时补查：有会话查本轮的 request-group，
 * 连会话都没有（插件没加载）查 gateway 当前选中的范围。查不到就维持原状，
 * 交给 requireBillingScope 拒绝。本地 gateway 固定回 legacy。
 */
export async function ensureBillingScope(gw: GatewayClient, kind: GenerateKind): Promise<void> {
  if (currentGroupId() || currentGroupScope() === "legacy") return;
  const sessionId = currentSessionId();
  try {
    const recovered = sessionId
      ? await gw.get(
          `/api/internal/sessions/${encodeURIComponent(sessionId)}/request-group`,
          REQUEST_GROUP_RECOVERY_TIMEOUT_MS,
          RequestGroupRecoverySchema,
        )
      : await gw.get("/api/internal/sessions/billing-current-scope", REQUEST_GROUP_RECOVERY_TIMEOUT_MS, BillingCurrentScopeSchema);
    if (!sessionId) rg("plugin context missing: used gateway-level billing scope fallback");
    if (!adoptBillingScope({ groupId: recovered.group_id })) {
      await reportDiagnostic(gw, { event: "recovery_failed", media_type: kind });
      return;
    }
    rg(`recovered scope=${recovered.mode}`);
    await reportDiagnostic(gw, { event: "recovery_succeeded", media_type: kind, recovered_scope: recovered.mode });
  } catch (err) {
    rg(`gateway recovery failed closed: ${errorMessage(err)}`);
    await reportDiagnostic(gw, { event: sessionId ? "recovery_failed" : "plugin_context_missing", media_type: kind });
  }
}

async function reportDiagnostic(gw: GatewayClient, body: Record<string, unknown>): Promise<void> {
  try {
    const resp = await fetch(gw.url("/api/internal/sessions/request-group-diagnostic"), {
      method: "POST",
      headers: gw.requestHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(1_000),
    });
    if (!resp.ok) rg(`gateway diagnostic HTTP ${resp.status} (non-fatal)`);
    else await resp.body?.cancel().catch(() => {});
  } catch (err) {
    rg(`gateway diagnostic unavailable: ${errorMessage(err)}`);
  }
}
