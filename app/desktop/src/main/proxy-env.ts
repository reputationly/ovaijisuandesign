/**
 * 把设置里的代理模式变成子进程环境变量。
 *
 * gateway / opencode 是独立的 Node 进程，不走 Electron 的 session 代理。
 * 「直连」必须把继承来的 HTTP(S)_PROXY 清掉，否则用户选了直连仍会绕去壳层的代理。
 * 「系统 / 自动」把 Electron `resolveProxy` 的结果写成 HTTP_PROXY，Node 的 fetch 才跟系统代理走。
 */

const PROXY_URL_KEYS = ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"] as const;

export type ProxyMode = "auto" | "system" | "direct";

export function normalizeProxyMode(mode: unknown): ProxyMode {
  return mode === "direct" || mode === "system" || mode === "auto" ? mode : "auto";
}

/** Electron session.setProxy 的 mode。自动和系统都交给系统代理解析。 */
export function electronProxyMode(mode: ProxyMode): "direct" | "system" {
  return mode === "direct" ? "direct" : "system";
}

/** 把 `PROXY host:port; DIRECT` 收成 Node 能用的代理 URL。解析不出就当没有代理。 */
export function proxyUrlFromResolved(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const first = raw
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.length > 0 && part.toUpperCase() !== "DIRECT");
  if (!first) return undefined;
  const match = /^(PROXY|HTTPS|SOCKS5?)\s+(\S+)$/i.exec(first);
  if (!match?.[1] || !match[2]) return undefined;
  const kind = match[1].toUpperCase();
  if (kind === "SOCKS" || kind === "SOCKS5") return `socks5://${match[2]}`;
  return `http://${match[2]}`;
}

/** 覆盖进子进程 env。直连用空字符串盖掉父进程带进来的代理变量。 */
export function childProxyEnv(mode: ProxyMode, resolved: string | undefined): Record<string, string> {
  if (mode === "direct") {
    return {
      HILO_NETWORK_PROXY_MODE: "direct",
      ...Object.fromEntries(PROXY_URL_KEYS.map((key) => [key, ""])),
    };
  }
  const proxyUrl = proxyUrlFromResolved(resolved);
  // 系统明确说没有代理时，清掉壳层带进来的 HTTP_PROXY，避免和「直连」相反的方向漏网。
  if (resolved !== undefined && !proxyUrl) {
    return {
      HILO_NETWORK_PROXY_MODE: "system",
      ...Object.fromEntries(PROXY_URL_KEYS.map((key) => [key, ""])),
    };
  }
  const env: Record<string, string> = { HILO_NETWORK_PROXY_MODE: "system" };
  if (proxyUrl) {
    for (const key of PROXY_URL_KEYS) env[key] = proxyUrl;
    // 本机 gateway / opencode 不能被送进代理，否则工作区之间的回环请求会失败。
    env.NO_PROXY = "127.0.0.1,localhost,::1";
    env.no_proxy = env.NO_PROXY;
  }
  return env;
}
