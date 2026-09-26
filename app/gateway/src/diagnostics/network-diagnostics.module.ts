import { createConnection } from "node:net";

import { Controller, Get, Injectable, Module } from "@nestjs/common";

import { MediaConfigService } from "../generate/media-config.service.js";

const DEFAULT_PROBE_TIMEOUT_MS = 4000;
const PROXY_PROBE_TIMEOUT_MS = 2000;
const MAX_ERROR_MESSAGE_LENGTH = 240;
const SECRET_QUERY_KEY_PATTERN = /^(token|password|passwd|secret|api[_-]?key|access[_-]?key|authorization|auth)$/i;
const SECRET_ASSIGNMENT_PATTERN = /((?:token|password|passwd|secret|api[_-]?key|access[_-]?key|authorization|auth)=)[^&\s]+/gi;
const URL_USERINFO_PATTERN = /((?:https?|socks5?|wss?):\/\/)[^/@\s]+@/gi;
const PROXY_ENV_KEYS = ["HTTPS_PROXY", "HTTP_PROXY", "ALL_PROXY", "https_proxy", "http_proxy", "all_proxy"];
const PROXY_DEFAULT_PORT: Record<string, number> = { "http:": 80, "https:": 443, "socks:": 1080, "socks4:": 1080, "socks5:": 1080 };

type FailureKind = "offline" | "timeout" | "dns" | "network_changed" | "tls" | "proxy" | "http" | "unreachable" | "unknown";

interface ProbeTarget {
  target: string;
  label: string;
  url?: string;
  method?: "GET" | "HEAD";
  statusMode?: "success" | "reachability" | "auth-boundary";
  nonBlocking?: boolean;
  timeoutMs?: number;
}

/**
 * 主进程"网络诊断"面板里 gateway 这一侧的探测。
 *
 * 目标清单和字段保持原样（主进程按 target 认字段，不认识的目标会被丢掉），但这个版本不连任何厂商云：
 * 账号、团队、云端网关、埋点这些目标都没有地址，一律回 `skipped`；只有显式用环境变量配了地址的目标才真探。
 * 代理诊断照做（读代理环境变量，TCP 探代理，再经代理探一次用户自己配置的平台地址）。
 */
@Injectable()
export class NetworkDiagnosticsService {
  constructor(private readonly media: MediaConfigService) {}

  async run() {
    const [probes, proxy] = await Promise.all([Promise.all(this.targets().map((t) => probeTarget(t))), this.runProxyDiagnostics()]);
    return { generatedAt: new Date().toISOString(), probes, proxy };
  }

  private targets(): ProbeTarget[] {
    const env = process.env;
    return [
      { target: "cloud_gateway_api", label: "Cloud Gateway API", method: "GET" },
      { target: "app_api", label: "App API", url: env.HILO_APP_API_BASE_URL },
      { target: "team_account_api", label: "Team Account API", method: "GET", statusMode: "auth-boundary" },
      { target: "update_cdn", label: "Update CDN", url: env.HILO_UPDATE_BASE_URL ? joinUrl(env.HILO_UPDATE_BASE_URL, "update-policy.json") : undefined, nonBlocking: true },
      { target: "guance_rum", label: "Guance RUM", url: env.HILO_RUM_SITE, statusMode: "reachability", nonBlocking: true },
      { target: "sensors", label: "Sensors", url: env.HILO_TRACK_SERVER_URL, statusMode: "reachability", nonBlocking: true },
    ];
  }

  private platformUrl(): string | undefined {
    try {
      const base = this.media.load().platform.base_url.trim();
      return base || undefined;
    } catch {
      return undefined;
    }
  }

  private async runProxyDiagnostics() {
    const env = process.env;
    const modeRaw = env.HILO_NETWORK_PROXY_MODE;
    const mode = modeRaw === "direct" || modeRaw === "system" ? modeRaw : "auto";
    if (mode === "direct") return { detected: false, mode, state: "skipped", source: "direct_mode" };
    const key = PROXY_ENV_KEYS.find((k) => env[k]?.trim());
    if (!key) return { detected: false, mode, state: "skipped", source: "env" };
    const value = env[key]!.trim();
    let url: URL;
    let port: number;
    try {
      url = new URL(value);
      port = url.port ? Number(url.port) : (PROXY_DEFAULT_PORT[url.protocol] ?? NaN);
      if (!url.hostname || !Number.isInteger(port) || port <= 0) throw new Error("bad");
    } catch {
      return { detected: true, mode, source: key, proxyUrl: sanitizeText(value), state: "warning", failureKind: "proxy", error: "Invalid proxy URL" };
    }
    const tcp = await probeProxyTcp(url.hostname, port, PROXY_PROBE_TIMEOUT_MS);
    if (!tcp.reachable) {
      return { detected: true, mode, source: key, proxyUrl: sanitizeUrl(url.toString()), state: "warning", failureKind: tcp.failureKind ?? "unreachable", ...(tcp.error ? { error: tcp.error } : {}), tcp };
    }
    // 经代理的端到端探测：目标是用户自己配置的平台，没配平台就不探（不替用户连一个他没选的服务）。
    const e2eUrl = env.HILO_PROXY_E2E_PROBE_URL || this.platformUrl();
    if (!e2eUrl) return { detected: true, mode, source: key, proxyUrl: sanitizeUrl(url.toString()), state: "ok", tcp };
    const e2e = await probeE2e(e2eUrl, DEFAULT_PROBE_TIMEOUT_MS);
    return {
      detected: true,
      mode,
      source: key,
      proxyUrl: sanitizeUrl(url.toString()),
      state: e2e.status === "ok" ? "ok" : "warning",
      ...(e2e.failureKind ? { failureKind: e2e.failureKind } : {}),
      ...(e2e.error ? { error: e2e.error } : {}),
      tcp,
      e2e,
    };
  }
}

async function probeTarget(t: ProbeTarget) {
  if (!t.url) return { target: t.target, label: t.label, status: "skipped" };
  const startedAt = Date.now();
  const method = t.method ?? "HEAD";
  const timeoutMs = t.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;
  const init = (m: string): RequestInit => ({ method: m, headers: { "cache-control": "no-store" }, redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
  try {
    let res = await fetch(t.url, init(method));
    // 有的服务不收 HEAD：405 时换 GET 再问一次。
    if (method === "HEAD" && res.status === 405) {
      await res.body?.cancel().catch(() => undefined);
      res = await fetch(t.url, init("GET"));
    }
    await res.body?.cancel().catch(() => undefined);
    const durationMs = Date.now() - startedAt;
    const ok =
      t.statusMode === "reachability" ? res.status >= 200 && res.status < 500 : t.statusMode === "auth-boundary" ? (res.status >= 200 && res.status < 300) || res.status === 401 : res.status >= 200 && res.status < 300;
    if (ok) return { target: t.target, label: t.label, url: sanitizeUrl(t.url), status: "ok", httpStatus: res.status, durationMs };
    return { target: t.target, label: t.label, url: sanitizeUrl(t.url), status: t.nonBlocking ? "warning" : "failed", httpStatus: res.status, durationMs, failureKind: "http", error: `HTTP ${res.status}` };
  } catch (err) {
    return {
      target: t.target,
      label: t.label,
      url: sanitizeUrl(t.url),
      status: t.nonBlocking ? "warning" : "failed",
      durationMs: Date.now() - startedAt,
      failureKind: classifyError(err),
      error: formatError(err),
    };
  }
}

function probeProxyTcp(host: string, port: number, timeoutMs: number): Promise<{ reachable: boolean; durationMs: number; failureKind?: FailureKind; error?: string }> {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const socket = createConnection({ host, port, timeout: timeoutMs });
    const finish = (r: { reachable: boolean; failureKind?: FailureKind; error?: string }) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve({ ...r, durationMs: Date.now() - startedAt });
    };
    socket.once("connect", () => finish({ reachable: true }));
    socket.once("timeout", () => finish({ reachable: false, failureKind: "timeout", error: "TCP proxy probe timed out" }));
    socket.once("error", (err) => finish({ reachable: false, failureKind: classifyError(err), error: formatError(err) }));
  });
}

async function probeE2e(url: string, timeoutMs: number) {
  const startedAt = Date.now();
  try {
    const res = await fetch(url, { method: "GET", headers: { "cache-control": "no-store" }, redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
    await res.body?.cancel().catch(() => undefined);
    if (res.status >= 200 && res.status < 300) return { status: "ok", httpStatus: res.status, durationMs: Date.now() - startedAt, url: sanitizeUrl(url) };
    return { status: "warning", httpStatus: res.status, durationMs: Date.now() - startedAt, failureKind: "http" as FailureKind, error: `HTTP ${res.status}`, url: sanitizeUrl(url) };
  } catch (err) {
    return { status: "failed", durationMs: Date.now() - startedAt, failureKind: classifyError(err), error: formatError(err), url: sanitizeUrl(url) };
  }
}

const NETWORK_CHANGED_PATTERN = /err_network_changed|network[_\s-]+changed/i;
const OFFLINE_PATTERN = /err_internet_disconnected|internet[_\s-]+disconnected|\boffline\b|network is offline/i;
const TIMEOUT_PATTERN = /aborted|aborterror|timeout|timed out|etimedout|err_timed_out/i;
const DNS_PATTERN = /enotfound|eai_again|getaddrinfo|err_name_not_resolved|dns|name[_\s-]*not[_\s-]*resolved/i;
const TLS_PATTERN = /cert|certificate|tls|ssl/i;
const PROXY_PATTERN = /proxy|tunnel/i;
const UNREACHABLE_PATTERN = /econn|fetch failed|und_err|err_connection|enetunreach|ehostunreach|network error/i;

/** 错误的名字、消息、错误码连同 cause 链拼成一串，按关键字归类（fetch 的真实原因藏在 cause 里）。 */
function errorSignature(err: unknown, depth = 0): string {
  if (depth > 4 || err === null || err === undefined) return "";
  if (typeof err === "string" || typeof err === "number" || typeof err === "boolean") return String(err);
  if (typeof err !== "object") return String(err);
  const r = err as Record<string, unknown>;
  const field = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");
  return [field(r.name), field(r.message), field(r.code), field(r.errno), errorSignature(r.cause, depth + 1)].join(" ");
}

/** 归成主进程认得的几类：它会整份丢掉带未知类别的诊断结果。 */
export function classifyError(err: unknown): FailureKind {
  const s = errorSignature(err).toLowerCase();
  if (NETWORK_CHANGED_PATTERN.test(s)) return "network_changed";
  if (OFFLINE_PATTERN.test(s)) return "offline";
  if (TIMEOUT_PATTERN.test(s)) return "timeout";
  if (DNS_PATTERN.test(s)) return "dns";
  if (TLS_PATTERN.test(s)) return "tls";
  if (PROXY_PATTERN.test(s)) return "proxy";
  if (UNREACHABLE_PATTERN.test(s)) return "unreachable";
  return "unknown";
}

function formatError(err: unknown): string {
  const msg = sanitizeText(err instanceof Error ? err.message : String(err));
  return msg.length > MAX_ERROR_MESSAGE_LENGTH ? `${msg.slice(0, MAX_ERROR_MESSAGE_LENGTH)}…` : msg;
}

function joinUrl(base: string, p: string): string {
  if (/^https?:\/\//i.test(p)) return p;
  return `${base.replace(/\/+$/, "")}/${p.replace(/^\/+/, "")}`;
}

/** 诊断结果会被用户截图发出去：URL 里的账号密码、token 类查询参数一律打码。 */
export function sanitizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (url.username) url.username = "REDACTED";
    if (url.password) url.password = "";
    for (const key of [...url.searchParams.keys()]) if (SECRET_QUERY_KEY_PATTERN.test(key)) url.searchParams.set(key, "REDACTED");
    return url.toString();
  } catch {
    return sanitizeText(raw);
  }
}

function sanitizeText(text: string): string {
  return text.replace(URL_USERINFO_PATTERN, "$1REDACTED@").replace(SECRET_ASSIGNMENT_PATTERN, "$1REDACTED");
}

@Controller("api/diagnostics")
export class NetworkDiagnosticsController {
  constructor(private readonly diagnostics: NetworkDiagnosticsService) {}

  @Get("network")
  network() {
    return this.diagnostics.run();
  }
}

@Module({ controllers: [NetworkDiagnosticsController], providers: [NetworkDiagnosticsService] })
export class NetworkDiagnosticsModule {}
