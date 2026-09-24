import { Agent, EnvHttpProxyAgent, setGlobalDispatcher, type Dispatcher } from "undici";

import { connectTimeoutMs } from "./env.js";

/**
 * 全局 undici dispatcher。生成的提交 / 轮询可能很久才回头部，
 * 默认 300s 的 headers/body 超时会把长任务掐断 —— 统一放宽到 310 分钟，
 * 各请求自己用 AbortSignal 控制真正的超时。连接超时单独短（5s）。
 *
 * 认 HTTP(S)_PROXY / ALL_PROXY，但本机回环地址强制直连：gateway 就在本机。
 */

export const UNDICI_TIMEOUT_MS = 310 * 60_000;
const LOOPBACK_NO_PROXY = ["127.0.0.1", "localhost", "[::1]"];
const SUPPORTED_PROXY_PROTOCOLS = new Set(["http:", "https:", "socks:", "socks5:"]);

type ProxyValue = { ok: true; value: string } | { ok: false; value?: string; reason?: string };

export type ProxyConfig =
  | { kind: "direct" }
  | { kind: "env-proxy"; httpProxy?: string; httpsProxy?: string }
  | { kind: "unsupported-proxy"; unsupported: { source: string; value: string; reason: string } };

function normalizeProxy(raw: string | undefined): ProxyValue {
  const value = raw?.trim();
  if (!value) return { ok: false };
  // 没写协议的 host:port 按 http 处理
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
  try {
    const url = new URL(hasScheme ? value : "http://" + value);
    const scheme = url.protocol;
    if (SUPPORTED_PROXY_PROTOCOLS.has(scheme)) return { ok: true, value: url.toString() };
    return { ok: false, value, reason: "unsupported protocol " + scheme };
  } catch {
    return { ok: false, value, reason: "invalid proxy URL" };
  }
}

/** PAC 风格的 `PROXY host:port; DIRECT` —— 取第一个非 DIRECT 项。 */
function normalizeResolvedProxy(raw: string): ProxyValue {
  const first = raw
    .split(";")
    .map((e) => e.trim())
    .find((e) => e.length > 0 && e.toUpperCase() !== "DIRECT");
  if (!first) return { ok: false };
  const m = first.match(/^(PROXY|HTTPS|SOCKS|SOCKS4|SOCKS5)\s+(\S+)$/i);
  if (!m?.[1] || !m[2]) return { ok: false, value: raw, reason: "invalid resolved proxy entry" };
  const kind = m[1].toUpperCase();
  if (kind === "SOCKS4") return { ok: false, value: `socks4://${m[2]}`, reason: "unsupported protocol socks4:" };
  const schemeByKeyword: Record<string, string> = { HTTPS: "https", SOCKS: "socks5", SOCKS5: "socks5", PROXY: "http" };
  return normalizeProxy(`${schemeByKeyword[kind] ?? "http"}://${m[2]}`);
}

export function resolveProxyConfig(env: NodeJS.ProcessEnv = process.env): ProxyConfig {
  const forcedDirect = env.HILO_NETWORK_PROXY_MODE === "direct";
  if (forcedDirect) return { kind: "direct" };
  const all = env.ALL_PROXY || env.all_proxy;
  const http = normalizeProxy(env.HTTP_PROXY || env.http_proxy || all);
  const https = normalizeProxy(env.HTTPS_PROXY || env.https_proxy || all);
  if (http.ok || https.ok) {
    return {
      kind: "env-proxy",
      ...(http.ok ? { httpProxy: http.value } : {}),
      ...(https.ok ? { httpsProxy: https.value } : {}),
    };
  }
  const candidates: [string, string | undefined][] = [
    ["HTTP_PROXY", env.HTTP_PROXY],
    ["http_proxy", env.http_proxy],
    ["HTTPS_PROXY", env.HTTPS_PROXY],
    ["https_proxy", env.https_proxy],
    ["ALL_PROXY", env.ALL_PROXY],
    ["all_proxy", env.all_proxy],
    ["HILO_RESOLVED_PROXY", env.HILO_RESOLVED_PROXY],
  ];
  for (const [source, raw] of candidates) {
    const value = raw?.trim();
    if (!value || value.toUpperCase() === "DIRECT") continue;
    const n = source === "HILO_RESOLVED_PROXY" ? normalizeResolvedProxy(value) : normalizeProxy(value);
    if (!n.ok && n.value) {
      return { kind: "unsupported-proxy", unsupported: { source, value: n.value, reason: n.reason ?? "unsupported proxy" } };
    }
  }
  return { kind: "direct" };
}

/** 用户的 NO_PROXY 保留，追加回环地址；含 `*` 时原样。 */
export function buildNoProxy(env: NodeJS.ProcessEnv = process.env): string {
  const entries = (env.NO_PROXY || env.no_proxy || "")
    .split(/[,\s]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  if (entries.includes("*")) return "*";
  const seen = new Set(entries.map((e) => e.toLowerCase()));
  for (const e of LOOPBACK_NO_PROXY) {
    if (!seen.has(e.toLowerCase())) {
      entries.push(e);
      seen.add(e.toLowerCase());
    }
  }
  return entries.join(",");
}

function redact(raw: string): string {
  try {
    const url = new URL(raw);
    if (url.username) url.username = "REDACTED";
    if (url.password) url.password = "";
    return url.toString();
  } catch {
    return raw.replace(/\/\/[^/@\s]+@/g, "//REDACTED@");
  }
}

export function createDispatcher(env: NodeJS.ProcessEnv = process.env): Dispatcher {
  const options = {
    connect: { timeout: connectTimeoutMs(env) },
    headersTimeout: UNDICI_TIMEOUT_MS,
    bodyTimeout: UNDICI_TIMEOUT_MS,
  };
  const proxy = resolveProxyConfig(env);
  if (proxy.kind === "env-proxy") {
    return new EnvHttpProxyAgent({
      ...options,
      httpProxy: proxy.httpProxy ?? "",
      httpsProxy: proxy.httpsProxy ?? "",
      noProxy: buildNoProxy(env),
    });
  }
  return new Agent(options);
}

/**
 * 装到全局。Node 自带的 fetch 走的是它内置的 undici，
 * 这里 setGlobalDispatcher 用的是同一个全局符号，所以对 fetch 生效。
 */
export function configureDispatcher(env: NodeJS.ProcessEnv = process.env): ProxyConfig["kind"] {
  const proxy = resolveProxyConfig(env);
  setGlobalDispatcher(createDispatcher(env));
  if (proxy.kind === "unsupported-proxy") {
    process.stderr.write(
      `${JSON.stringify({
        event: "mcp_undici_proxy_unsupported",
        source: proxy.unsupported.source,
        proxyUrl: redact(proxy.unsupported.value),
        reason: proxy.unsupported.reason,
        fallback: "direct",
      })}\n`,
    );
  }
  return proxy.kind;
}
