/**
 * 打本地 gateway 的客户端（docs/mcp-tools-architecture.md）：
 * 失败时拼 `{ok:false, error, error_code, failure_presentation}`，普通调用不重试，
 * 只有探活和生成轮询重试。M7 补全。
 */
export class GatewayClient {
  constructor(readonly baseUrl: string) {}

  /** 探活：`GET /api/health/live`，3s 超时，最多 5 次，间隔 1s。 */
  async healthCheck(): Promise<boolean> {
    for (let i = 0; i < 5; i++) {
      try {
        const r = await fetch(`${this.baseUrl}/api/health/live`, { signal: AbortSignal.timeout(3000) });
        if (r.ok) return true;
      } catch {
        // 下一轮再试
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    return false;
  }
}
