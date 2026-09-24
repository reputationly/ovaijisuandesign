// 这个包对外部世界的全部依赖：发请求、睡眠、看时钟、写日志。
//
// Rust 那边是 `reqwest::Client` + `tokio::time` + `tracing` 三样，各自是全局的
// 或者由调用方传进来。这里收成一个对象由调用方传：
//
// - **可注入**。轮询要睡 5 秒 × 最多 30 分钟，测试里不可能真的等；把 `sleep`
//   和 `now` 换掉，整条提交/轮询链就能在毫秒内跑完，而且不用 fake timers
//   去猜 `AbortSignal.timeout` 内部用的是哪个计时器。
// - **不绑定日志框架**。上层是 NestJS，日志怎么落是它的事。
//
// 不从 Rust 的哪个模块移植 —— 它是 reqwest 的替身。

import { setTimeout as sleepMs } from "node:timers/promises";

import { PlatformError } from "./error.js";

/** 结构化日志。字段对应 Rust `tracing::info!(k = v, …)` 里的那些键值。 */
export interface Logger {
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
}

export interface Client {
  /** 默认是全局 `fetch`。测试里换成桩。 */
  fetch: typeof globalThis.fetch;
  /** 默认是真的睡。轮询间隔走它。 */
  sleep(ms: number): Promise<void>;
  /** 单调时钟，毫秒。轮询总时长的判定走它。 */
  now(): number;
  logger: Logger;
  /**
   * 异步任务提交成功、拿到平台任务号时回调一次。调用方用它把任务号落盘，
   * 重启后才能续等而不是重新提交。
   */
  onTaskSubmitted?: (taskId: string) => void;
}

const consoleLogger: Logger = {
  info(msg, fields) {
    if (fields) console.info(msg, fields);
    else console.info(msg);
  },
  warn(msg, fields) {
    if (fields) console.warn(msg, fields);
    else console.warn(msg);
  },
};

/** 造一个客户端，没给的部分用真实实现。 */
export function createClient(overrides: Partial<Client> = {}): Client {
  return {
    fetch: overrides.fetch ?? ((input, init) => globalThis.fetch(input, init)),
    sleep: overrides.sleep ?? ((ms) => sleepMs(ms).then(() => undefined)),
    now: overrides.now ?? (() => performance.now()),
    logger: overrides.logger ?? consoleLogger,
    ...(overrides.onTaskSubmitted ? { onTaskSubmitted: overrides.onTaskSubmitted } : {}),
  };
}

/** 一次请求的描述。 */
export interface RequestSpec {
  method: "GET" | "POST";
  url: string;
  apiKey: string;
  /**
   * 整次请求的超时，**包括读响应体**。对应 reqwest `RequestBuilder::timeout` ——
   * 那边的超时也是从开始连接一直算到响应体读完。
   */
  timeoutMs: number;
  /** 有就按 JSON 发。 */
  json?: unknown;
}

/**
 * 发出请求，拿到响应头。失败时按 {@link PlatformError.fromFetch} 定性。
 *
 * 和 {@link readText} 分成两步，是因为轮询那条链对两步的失败处理不一样
 * （发送失败 → 下一轮再试；读体失败 → 当空串），见 `video.submitAndPoll`。
 */
export async function send(
  client: Client,
  spec: RequestSpec,
): Promise<Response> {
  const signal = AbortSignal.timeout(spec.timeoutMs);
  const headers: Record<string, string> = { authorization: `Bearer ${spec.apiKey}` };
  const init: RequestInit = { method: spec.method, headers, signal };
  if (spec.json !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(spec.json);
  }
  try {
    return await client.fetch(spec.url, init);
  } catch (e) {
    throw PlatformError.fromFetch(e, spec.url, "send");
  }
}

/** 读完响应体。失败时按「读体阶段」定性。 */
export async function readText(resp: Response, url: string): Promise<string> {
  try {
    return await resp.text();
  } catch (e) {
    throw PlatformError.fromFetch(e, url, "body");
  }
}

/**
 * 发一次请求并读完响应体：`{ status, raw }`。
 *
 * 除轮询外的所有调用点都是这个形状（Rust 里是 8 处
 * `send().await.map_err(from_reqwest)?` + `text().await.map_err(from_reqwest)?`）。
 */
export async function request(
  client: Client,
  spec: RequestSpec,
): Promise<{ status: number; ok: boolean; raw: string }> {
  const resp = await send(client, spec);
  const raw = await readText(resp, spec.url);
  return { status: resp.status, ok: resp.ok, raw };
}
