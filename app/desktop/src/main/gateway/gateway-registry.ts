/**
 * 所有在跑的 gateway（应用级 + 每个工作区一个）。主进程要把同一份设置推给每一个
 * gateway 时（技能权限、语言、水印……）从这里遍历。
 */
import type { GatewayBinding } from "../ipc/types.js";
import { identityHeaders } from "../workspace/identity.js";

export const APP_LEVEL_GATEWAY_KEY = "__app_level_gateway__";

export interface RegisteredGateway {
  /** 当前地址；没起来时 undefined。 */
  url(): string | undefined;
  /** 工作区 gateway 的身份；应用级没有。 */
  binding?(): GatewayBinding | undefined;
}

export class GatewayRegistry {
  private readonly items = new Map<string, RegisteredGateway>();

  register(key: string, gw: RegisteredGateway): { dispose(): void } {
    this.items.set(key, gw);
    return {
      dispose: () => {
        if (this.items.get(key) === gw) this.items.delete(key);
      },
    };
  }

  get(key: string): RegisteredGateway | undefined {
    return this.items.get(key);
  }

  keys(): string[] {
    return [...this.items.keys()];
  }

  /** 第一个有地址的（应用级优先，因为它先注册）。 */
  firstUrl(): { url: string; binding?: GatewayBinding } | undefined {
    for (const gw of this.items.values()) {
      const url = gw.url();
      if (url) return { url, binding: gw.binding?.() };
    }
    return undefined;
  }

  /** 向每个在跑的 gateway POST；单个失败只记日志。返回成功的个数。 */
  async broadcastPost(pathname: string, body: unknown, log: (l: string) => void = () => {}): Promise<number> {
    const targets = [...this.items.values()]
      .map((gw) => ({ url: gw.url(), binding: gw.binding?.() }))
      .filter((t): t is { url: string; binding: GatewayBinding | undefined } => !!t.url);
    const results = await Promise.allSettled(
      targets.map(async (t) => {
        const r = await fetch(`${t.url}${pathname}`, {
          method: "POST",
          headers: { "content-type": "application/json", ...identityHeaders(t.binding) },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(5000),
        });
        if (!r.ok) throw new Error(`${t.url}${pathname} → ${r.status}`);
      }),
    );
    for (const r of results) if (r.status === "rejected") log(`广播 ${pathname} 失败：${String(r.reason)}`);
    return results.filter((r) => r.status === "fulfilled").length;
  }
}
