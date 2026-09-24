import { isObject, truncate } from "./text.js";

/** 传输失败发生在哪个阶段。决定那句「外层描述」怎么说，见 {@link PlatformError.fromFetch}。 */
export type FetchPhase = "send" | "body";

/**
 * 生成过程中的失败。
 *
 * `code` 是给日志和排查用的，**不要**直接当成调用方协议里的错误码 ——
 * 那些通常另有枚举约束。
 *
 * `message` 是不带 code 的原文（和 Rust 的 `message` 字段一致）；
 * `toString()` 才是 `[code] message`，对应 Rust 的 `Display`。
 */
export class PlatformError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PlatformError";
    this.code = code;
  }

  /** 配置缺失或自相矛盾。这类错误**在发出任何网络请求之前**就该抛出来。 */
  static config(msg: string): PlatformError {
    return new PlatformError("dpp.config", msg);
  }

  static transport(msg: string): PlatformError {
    return new PlatformError("dpp.transport", msg);
  }

  /**
   * 从 `fetch` 抛出来的错误构造，**保住失败的类别和底层原因**。
   *
   * # 为什么不能用 `transport(String(e))`
   *
   * Rust 那边 `reqwest::Error` 的 Display 只有一句
   * `error sending request for url (…)`；Node 这边更糟 —— `fetch` 抛的是
   * `TypeError: fetch failed`，**连 URL 都没有**。究竟是超时、连接被拒、
   * TLS 握手失败还是读响应体断了，全在 `cause` 链里（undici 的
   * `ConnectTimeoutError` / `SocketError` / 系统的 `ECONNREFUSED` …），
   * `message` 一个都带不出来。
   *
   * 而传输失败时这句话**是唯一的线索**。实测栽过一次：画布超分报
   * 「error sending request for url (…/v1/videos)」，而平台那边任务
   * **创建成功并正常跑完了** —— 到底是我们没等到响应（超时），还是连接
   * 被中途掐断，这句话分不出来，只能靠反复试。分不出来的直接后果是
   * 修不对：超时该放宽预算，连接断该重试，两者的药方相反。
   *
   * 所以这里把类别、URL 和整条 cause 链都拼进去。`url` 必须由调用方给 ——
   * `fetch` 的错误对象里没有它。
   */
  static fromFetch(err: unknown, url: string, phase: FetchPhase = "send"): PlatformError {
    return new PlatformError("dpp.transport", describeFetch(err, url, phase));
  }

  /** 平台回了 2xx，但内容不是我们能用的形状。 */
  static protocol(msg: string): PlatformError {
    return new PlatformError("dpp.protocol", msg);
  }

  /** 读写本地素材时的失败。 */
  static io(msg: string): PlatformError {
    return new PlatformError("dpp.io", msg);
  }

  /**
   * 解平台的错误体。
   *
   * New API 有**两套信封**，5xx 和 4xx 各一套：
   *
   * ```json
   * {"error": {"code": "model_not_found", "message": "…", "type": "new_api_error"}}
   * {"code": "invalid_request", "message": "…", "data": null}
   * ```
   *
   * 只认其中一套的话，另一套会退化成「平台返回 400: {原文}」——
   * 信息没丢，但排查时要多读一层 JSON。
   */
  static fromBody(status: number, raw: string): PlatformError {
    let parsed: unknown = undefined;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = undefined;
    }
    // Rust: `v.get("error").or(Some(v))` —— 有 `error` 键就钻进去（哪怕它不是
    // 对象），没有就用整个体。`get` 只对对象有意义，数组 / 标量都当没有。
    let node: unknown = null;
    if (parsed !== undefined) {
      node = isObject(parsed) && "error" in parsed ? parsed.error : parsed;
    }
    const get = (k: string): string | undefined => {
      if (!isObject(node)) return undefined;
      const v = node[k];
      return typeof v === "string" && v !== "" ? v : undefined;
    };

    const c = get("code");
    const code = c !== undefined ? `platform.${c}` : `platform.http_${status}`;
    const message = get("message") ?? `平台返回 ${status}: ${truncate(raw, 200)}`;
    return new PlatformError(code, message);
  }

  override toString(): string {
    return `[${this.code}] ${this.message}`;
  }
}

// ---------------------------------------------------------------------------
// 传输失败的定性
// ---------------------------------------------------------------------------

/** 系统 / undici 报「超时」时用的 code。 */
const TIMEOUT_CODES = new Set([
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

/**
 * 连接根本没建起来。对应 reqwest 的 `is_connect()` —— 那边 TLS 握手也在
 * connector 里，所以证书问题同样算「连接失败」。
 */
const CONNECT_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EAI_FAIL",
  "EHOSTUNREACH",
  "EHOSTDOWN",
  "ENETUNREACH",
  "ENETDOWN",
  "EADDRNOTAVAIL",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "CERT_HAS_EXPIRED",
  "ERR_SSL_WRONG_VERSION_NUMBER",
]);

/**
 * 连接建起来之后被掐断。
 *
 * reqwest 没有对应的判定（hyper 把它报成普通的请求错误，Rust 那边会落到
 * 「传输失败」），但 undici 把 code 给得很清楚 —— 能说出来就说出来：
 * 这正是 9fd49bd 那次要和「超时」区分开的另一半（连接断该重试）。
 */
const SOCKET_CLOSED_CODES = new Set([
  "ECONNRESET",
  "EPIPE",
  "ECONNABORTED",
  "UND_ERR_SOCKET",
  "UND_ERR_CLOSED",
]);

/** 响应体解压 / 解码失败（gzip、br 坏了，或编码不合法）。 */
const DECODE_CODES = new Set([
  "Z_DATA_ERROR",
  "Z_BUF_ERROR",
  "ERR_BROTLI_DECOMPRESSION_FAILED",
  "ERR_ENCODING_INVALID_ENCODED_DATA",
]);

function errName(e: unknown): string {
  return isObject(e) || e instanceof Error ? String((e as { name?: unknown }).name ?? "") : "";
}

function errCode(e: unknown): string {
  if (!(isObject(e) || e instanceof Error)) return "";
  const c = (e as { code?: unknown }).code;
  return typeof c === "string" ? c : "";
}

function errMessage(e: unknown): string {
  if (e instanceof Error || isObject(e)) {
    const m = (e as { message?: unknown }).message;
    return typeof m === "string" ? m : "";
  }
  return String(e);
}

/**
 * 把 `err` 连同它的整条 cause 链摊平。
 *
 * `AggregateError`（happy eyeballs 同时连 IPv4/IPv6 都失败时 undici 会给这个）
 * 的 `errors` 也展开 —— 真正的 `ECONNREFUSED` 常常藏在那里面，外层 message 是空的。
 */
function flattenChain(err: unknown): unknown[] {
  const out: unknown[] = [];
  const seen = new Set<unknown>();
  const walk = (e: unknown, depth: number): void => {
    if (e === undefined || e === null || depth > 16 || seen.has(e)) return;
    seen.add(e);
    out.push(e);
    if (e instanceof AggregateError) {
      for (const inner of e.errors) walk(inner, depth + 1);
    }
    if (e instanceof Error || isObject(e)) {
      walk((e as { cause?: unknown }).cause, depth + 1);
    }
  };
  walk(err, 0);
  return out;
}

/** 链上一环说成一句话：`名字: 原文 [code]`，code 已经在原文里就不重复。 */
function describeOne(e: unknown): string {
  const name = errName(e);
  const msg = errMessage(e).trim();
  const code = errCode(e);
  let text = msg;
  if (name && name !== "Error" && msg) text = `${name}: ${msg}`;
  else if (name && name !== "Error") text = name;
  if (code && !text.includes(code)) text = text ? `${text} [${code}]` : code;
  return text;
}

/**
 * 把一次 `fetch` 失败说成一句能定性的话。
 *
 * 形如 `超时: error sending request for url (…) ← TimeoutError: The operation was aborted due to timeout`。
 *
 * 两部分缺一不可：
 *
 * - **类别**（超时 / 连接失败 / …）决定该怎么修。超时要放宽预算，连接断
 *   要重试，两者的药方相反 —— 分不出来就只能两个都试。
 * - **cause 链**是类别之外的细节（哪一层断的、系统报的什么）。undici
 *   把它藏在 `cause` 里，不主动展开就永远看不到。
 *
 * 外层那句照抄 reqwest 的措辞（`error sending request for url (…)`），
 * 这样 Rust 时期的日志和现在的日志能用同一个关键词搜。
 */
function describeFetch(err: unknown, url: string, phase: FetchPhase): string {
  const chain = flattenChain(err);
  const any = (pred: (e: unknown) => boolean) => chain.some(pred);

  const kinds: string[] = [];
  // `AbortSignal.timeout()` 触发时 fetch 以 `TimeoutError` 拒绝。`AbortError`
  // 也归到这里：这个包里唯一的 abort 来源就是超时信号（调用方要是自己串了
  // 一个取消信号进来，那也是「没等到响应」，不是「连接断了」）。
  if (
    any((e) => {
      const n = errName(e);
      return n === "TimeoutError" || n === "AbortError" || TIMEOUT_CODES.has(errCode(e));
    })
  ) {
    kinds.push("超时");
  }
  if (any((e) => CONNECT_CODES.has(errCode(e)))) {
    kinds.push("连接失败");
  }
  if (
    any((e) => {
      if (SOCKET_CLOSED_CODES.has(errCode(e))) return true;
      // undici 在连接被对端关掉时给的是 `TypeError: terminated` ← `SocketError: other side closed`。
      const m = errMessage(e);
      return m === "terminated" || m === "other side closed";
    })
  ) {
    kinds.push("连接中断");
  }
  // reqwest 读响应体时出的错一律是 Body 类（超时也会同时带上它），这里照做。
  if (phase === "body") {
    kinds.push("请求/响应体中断");
  }
  if (any((e) => DECODE_CODES.has(errCode(e)))) {
    kinds.push("响应解码失败");
  }
  if (any((e) => /redirect count exceeded/i.test(errMessage(e)))) {
    kinds.push("重定向过多");
  }
  // 一个都没命中时说"传输失败"，不要留空 —— 空类别会让这句话退回到
  // 原来那种看不出所以然的状态。
  const kind = kinds.length === 0 ? "传输失败" : kinds.join("+");

  // 展开 cause 链。`fetch failed` 本身也算一环 —— Node 这边没有 reqwest
  // 那句自带 URL 的外层描述，外层是下面自己拼的。
  const causes: string[] = [];
  for (const e of chain) {
    const text = describeOne(e);
    // 逐层重复同一句话没有信息量（undici 那几层经常如此）。
    if (text && !causes.includes(text)) causes.push(text);
  }

  const outer =
    phase === "send"
      ? `error sending request for url (${url})`
      : `error reading response body for url (${url})`;
  let msg = `${kind}: ${outer}`;
  if (causes.length > 0) {
    msg += " ← ";
    msg += causes.join(" ← ");
  }
  return truncate(msg, 400);
}
