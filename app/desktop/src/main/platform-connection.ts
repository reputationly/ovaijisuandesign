/**
 * 平台连接状态：启动时用令牌探一下平台能不能用，结果给左下角的绿点 / 红点。
 *
 * 探测用 `GET {base_url}/models`：有效令牌返回 200，无效或缺失返回 401（实测过）。
 * 只看结论；令牌不写进日志，也不出现在返回值里。
 */

export type PlatformConnectionState = "checking" | "connected" | "disconnected";

export interface PlatformConnectionStatus {
  state: PlatformConnectionState;
  /** 最近一次探测完成的时间（毫秒时间戳）；还没探测过为 null。 */
  checkedAt: number | null;
  /** 没连上的原因，给悬停提示用；已连接或还没探测完为 null。 */
  reason: string | null;
}

export interface PlatformEndpoint {
  base_url: string;
  api_key: string;
}

export type KeyCheck = { ok: true } | { ok: false; reason: string };

/** 探测一次令牌。不抛错：任何失败都折成 `{ ok: false, reason }`。 */
export async function checkPlatformKey(
  platform: PlatformEndpoint,
  opts: { fetchFn?: typeof fetch; timeoutMs?: number } = {},
): Promise<KeyCheck> {
  const key = platform.api_key.trim();
  if (key === "") return { ok: false, reason: "还没有填写令牌" };
  const base = platform.base_url.replace(/\/+$/, "");
  const doFetch = opts.fetchFn ?? fetch;
  try {
    const res = await doFetch(`${base}/models`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
    });
    // 响应体用不到，直接丢掉好让连接归还。
    await res.body?.cancel().catch(() => undefined);
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "令牌无效或已停用" };
    return { ok: false, reason: `平台返回 HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, reason: `连不上平台：${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * 缓存一份"平台连接状态"，界面每隔几秒读一次。启动时 `refresh()` 一次，保存令牌后再 `refresh()` 一次。
 */
export class PlatformConnection {
  private status: PlatformConnectionStatus = { state: "checking", checkedAt: null, reason: null };
  private inflight: Promise<PlatformConnectionStatus> | null = null;

  constructor(
    private readonly readEndpoint: () => PlatformEndpoint,
    private readonly opts: { fetchFn?: typeof fetch; log?: (line: string) => void } = {},
  ) {}

  current(): PlatformConnectionStatus {
    return { ...this.status };
  }

  /** 重新探测一次。探测还没完成时再调用，拿到的是同一次的结果，不会并发打平台。 */
  refresh(): Promise<PlatformConnectionStatus> {
    if (this.inflight) return this.inflight;
    this.status = { ...this.status, state: "checking", reason: null };
    const run = this.probe().finally(() => {
      this.inflight = null;
    });
    this.inflight = run;
    return run;
  }

  private async probe(): Promise<PlatformConnectionStatus> {
    let result: KeyCheck;
    try {
      result = await checkPlatformKey(this.readEndpoint(), { fetchFn: this.opts.fetchFn });
    } catch (err) {
      result = { ok: false, reason: `读取平台配置失败：${err instanceof Error ? err.message : String(err)}` };
    }
    this.status = result.ok
      ? { state: "connected", checkedAt: Date.now(), reason: null }
      : { state: "disconnected", checkedAt: Date.now(), reason: result.reason };
    this.opts.log?.(`[platform] 令牌检测：${result.ok ? "已连接" : `未连接（${result.reason}）`}`);
    return this.current();
  }
}
