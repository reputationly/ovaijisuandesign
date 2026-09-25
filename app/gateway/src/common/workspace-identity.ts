import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";

import { Logger } from "@nestjs/common";

/**
 * 工作区身份校验。主进程给每个工作区 gateway 发一组身份（claim = 工作区路径的 sha256、
 * instance = 这次进程的 UUID、generation = 同一路径第几次启动），客户端请求时带回来。
 *
 * 要防的是：gateway 重启或端口被别的工作区复用后，旧标签页 / 旧 MCP 进程的请求落进
 * 另一个工作区。所以：
 * - 进程没拿到 claim（独立启动、应用级 gateway）→ 整个不生效；
 * - 带了但对不上（header 和 query 互相矛盾也算）→ 409；
 * - 没带 claim → 428；写请求（非 GET / HEAD）在配了 instance / generation 时还要带齐这两样；
 * - 预检请求（OPTIONS）带不了自定义头，放行。
 */
export interface WorkspaceIdentity {
  claim: string;
  /** instance 和 generation 要么都有、要么都没有。 */
  instance?: string;
  generation?: number;
}

export const IDENTITY_HEADERS = {
  claim: "x-hilo-workspace",
  instance: "x-hilo-workspace-instance",
  generation: "x-hilo-workspace-generation",
} as const;

/** WebSocket 握手和 `<img src>` 这类带不了头的请求走 query。 */
export const IDENTITY_QUERY = {
  claim: "hilo_workspace",
  instance: "hilo_workspace_instance",
  generation: "hilo_workspace_generation",
} as const;

export const WORKSPACE_IDENTITY_MISMATCH_CODE = "WORKSPACE_IDENTITY_MISMATCH";
export const WORKSPACE_IDENTITY_REQUIRED_CODE = "WORKSPACE_IDENTITY_REQUIRED";
export const WORKSPACE_IDENTITY_WS_CLOSE_CODE = 1008;

const HEX_CLAIM = /^[a-f0-9]{64}$/;
const CLAIM_HOST = /^w-[a-z0-9]{50}\.hilo\.localhost$/;
const INSTANCE_HOST = /^wi-[a-f0-9]{32}(?:-g[1-9][0-9]{0,15})?\.hilo\.localhost$/;
const INSTANCE_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HOST_SUFFIX = ".hilo.localhost";

export interface IdentityRejection {
  status: 409 | 428;
  code: typeof WORKSPACE_IDENTITY_MISMATCH_CODE | typeof WORKSPACE_IDENTITY_REQUIRED_CODE;
  body: { statusCode: 409 | 428; error: string; code: string; message: string };
}

const MISMATCH: IdentityRejection = {
  status: 409,
  code: WORKSPACE_IDENTITY_MISMATCH_CODE,
  body: {
    statusCode: 409,
    error: "Conflict",
    code: WORKSPACE_IDENTITY_MISMATCH_CODE,
    message: "The gateway belongs to a different workspace. Refresh the runtime and retry.",
  },
};

const REQUIRED: IdentityRejection = {
  status: 428,
  code: WORKSPACE_IDENTITY_REQUIRED_CODE,
  body: {
    statusCode: 428,
    error: "Precondition Required",
    code: WORKSPACE_IDENTITY_REQUIRED_CODE,
    message: "Workspace identity is required. Refresh the workspace runtime and retry.",
  },
};

/**
 * 从环境变量读期望的身份。没有 claim 就不校验；instance / generation 只给了一半直接拒绝启动 ——
 * 退回"只校验 claim"等于悄悄放开了对旧进程的拦截。
 */
export function identityFromEnv(env: NodeJS.ProcessEnv): WorkspaceIdentity | undefined {
  const claim = norm(env.HILO_WORKSPACE_CLAIM);
  const instance = norm(env.HILO_WORKSPACE_INSTANCE_ID);
  const generation = normGeneration(env.HILO_WORKSPACE_GENERATION);
  const hasLifetime = env.HILO_WORKSPACE_INSTANCE_ID !== undefined || env.HILO_WORKSPACE_GENERATION !== undefined;
  if (hasLifetime && (!instance || generation === undefined)) {
    throw new Error("Workspace gateway identity lifetime is partially configured; refusing to start fail-open.");
  }
  if (!claim) return undefined;
  return instance && generation !== undefined ? { claim, instance, generation } : { claim };
}

/** claim → 浏览器用的专属主机名 `w-<base36>.hilo.localhost`；不是 64 位十六进制时没有。 */
export function workspaceIdentityHostname(claim: string): string | undefined {
  const c = claim.trim();
  if (!HEX_CLAIM.test(c)) return undefined;
  return `w-${BigInt(`0x${c}`).toString(36).padStart(50, "0")}${HOST_SUFFIX}`;
}

/** instance（+ generation）→ `wi-<uuid 去横线>[-g<n>].hilo.localhost`。 */
export function workspaceInstanceHostname(instance: string, generation?: number): string | undefined {
  const id = instance.trim().toLowerCase();
  if (!INSTANCE_ID.test(id)) return undefined;
  if (generation !== undefined && (!Number.isSafeInteger(generation) || generation < 1)) return undefined;
  return `wi-${id.replaceAll("-", "")}${generation === undefined ? "" : `-g${generation}`}${HOST_SUFFIX}`;
}

function isIdentityHostname(host: string | undefined): boolean {
  return !!host && (CLAIM_HOST.test(host) || INSTANCE_HOST.test(host));
}

interface Presented {
  headerClaim?: string;
  queryClaim?: string;
  headerInstance?: string;
  queryInstance?: string;
  /** 带了这个键（哪怕值不合法）。不合法的 generation 算对不上，不算没带。 */
  hasHeaderGeneration: boolean;
  headerGeneration?: number;
  hasQueryGeneration: boolean;
  queryGeneration?: number;
  hostname?: string;
}

function readPresented(headers: IncomingHttpHeaders, url: string | undefined): Presented {
  let query: URLSearchParams;
  try {
    query = new URL(url ?? "/", "http://gateway.invalid").searchParams;
  } catch {
    query = new URLSearchParams();
  }
  const h = (name: string): string | undefined => {
    const v = headers[name];
    return Array.isArray(v) ? v[0] : v;
  };
  const q = (name: string): string | undefined => query.get(name) ?? undefined;
  const rawHeaderGen = h(IDENTITY_HEADERS.generation);
  const rawQueryGen = q(IDENTITY_QUERY.generation);
  return {
    headerClaim: norm(h(IDENTITY_HEADERS.claim)),
    queryClaim: norm(q(IDENTITY_QUERY.claim)),
    headerInstance: norm(h(IDENTITY_HEADERS.instance)),
    queryInstance: norm(q(IDENTITY_QUERY.instance)),
    hasHeaderGeneration: rawHeaderGen !== undefined,
    headerGeneration: normGeneration(rawHeaderGen),
    hasQueryGeneration: rawQueryGen !== undefined,
    queryGeneration: normGeneration(rawQueryGen),
    hostname: hostnameOf(h("host")),
  };
}

/**
 * 判定一次 HTTP 请求。
 *
 * 和 WebSocket 不同，这里也认浏览器专属主机名：渲染层走 `*.hilo.localhost` 时身份就在域名里。
 * 唯一的放宽是 `/api/health*` 的读请求什么身份都没带时放行：渲染层等 gateway 就绪的探测不带身份。
 */
export function verifyIdentity(expected: WorkspaceIdentity | undefined, req: { method?: string; url?: string; headers: IncomingHttpHeaders }): IdentityRejection | null {
  const method = (req.method ?? "GET").toUpperCase();
  if (!expected || method === "OPTIONS") return null;
  const p = readPresented(req.headers, req.url);
  const claimHost = workspaceIdentityHostname(expected.claim);
  const instanceHost = expected.instance ? workspaceInstanceHostname(expected.instance, expected.generation) : undefined;
  const hasBrowserIdentity = isIdentityHostname(p.hostname);
  const browserMatches = hasBrowserIdentity && (instanceHost !== undefined ? p.hostname === instanceHost : claimHost !== undefined && p.hostname === claimHost);
  const { instance, generation } = expected;

  const mismatch =
    (p.headerClaim !== undefined && p.headerClaim !== expected.claim) ||
    (p.queryClaim !== undefined && p.queryClaim !== expected.claim) ||
    (instance !== undefined &&
      ((p.headerInstance !== undefined && p.headerInstance !== instance) || (p.queryInstance !== undefined && p.queryInstance !== instance))) ||
    (generation !== undefined &&
      ((p.hasHeaderGeneration && p.headerGeneration !== generation) || (p.hasQueryGeneration && p.queryGeneration !== generation))) ||
    (hasBrowserIdentity && !browserMatches) ||
    (p.headerClaim !== undefined && p.queryClaim !== undefined && p.headerClaim !== p.queryClaim) ||
    (p.headerInstance !== undefined && p.queryInstance !== undefined && p.headerInstance !== p.queryInstance) ||
    (p.headerGeneration !== undefined && p.queryGeneration !== undefined && p.headerGeneration !== p.queryGeneration);
  if (mismatch) return MISMATCH;

  const hasClaim = p.headerClaim !== undefined || p.queryClaim !== undefined;
  const lifetimeMatches =
    instance !== undefined &&
    generation !== undefined &&
    (p.headerInstance === instance || p.queryInstance === instance) &&
    (p.headerGeneration === generation || p.queryGeneration === generation);
  const needsLifetime = instance !== undefined && generation !== undefined && method !== "GET" && method !== "HEAD";
  if ((!hasClaim && !browserMatches) || (needsLifetime && !browserMatches && !lifetimeMatches)) {
    if (isHealthProbe(method, req.url) && !presentedAnything(p)) return null;
    return REQUIRED;
  }
  return null;
}

function isHealthProbe(method: string, url: string | undefined): boolean {
  if (method !== "GET" && method !== "HEAD") return false;
  const pathname = (url ?? "/").split("?")[0]!;
  return pathname === "/api/health" || pathname.startsWith("/api/health/");
}

function presentedAnything(p: Presented): boolean {
  return (
    p.headerClaim !== undefined ||
    p.queryClaim !== undefined ||
    p.headerInstance !== undefined ||
    p.queryInstance !== undefined ||
    p.hasHeaderGeneration ||
    p.hasQueryGeneration ||
    isIdentityHostname(p.hostname)
  );
}

/**
 * WebSocket 握手只看 query（浏览器的 WebSocket 带不了自定义头）。instance / generation 按原样字符串比。
 * 通过返回 null，否则回要用的错误码（调用方以 1008 关连接）。
 */
export function verifyWebSocketIdentity(env: NodeJS.ProcessEnv, url: string | undefined): string | null {
  const expectedClaim = env.HILO_WORKSPACE_CLAIM?.trim();
  if (!expectedClaim) return null;
  let q: URLSearchParams;
  try {
    q = new URL(url ?? "/ws", "http://localhost").searchParams;
  } catch {
    q = new URLSearchParams();
  }
  const claimed = q.get(IDENTITY_QUERY.claim);
  const expectedInstance = env.HILO_WORKSPACE_INSTANCE_ID?.trim();
  const expectedGeneration = env.HILO_WORKSPACE_GENERATION?.trim();
  const instanceOk = !expectedInstance || q.get(IDENTITY_QUERY.instance) === expectedInstance;
  const generationOk = !expectedGeneration || q.get(IDENTITY_QUERY.generation) === expectedGeneration;
  if (claimed === expectedClaim && instanceOk && generationOk) return null;
  return claimed ? WORKSPACE_IDENTITY_MISMATCH_CODE : WORKSPACE_IDENTITY_REQUIRED_CODE;
}

/**
 * 挂在 Express 上，放在 CORS 之后：被拒的响应也要带 CORS 头，渲染层才读得到原因。
 * 通过后把身份 query 从 URL 里去掉：它不是业务参数，留着会被严格校验的 query DTO 当成多余字段拒掉。
 */
export function workspaceIdentityMiddleware(expected: WorkspaceIdentity | undefined) {
  const log = new Logger("WorkspaceIdentity");
  return (req: IncomingMessage & { originalUrl?: string }, res: ServerResponse, next: () => void): void => {
    const rejected = verifyIdentity(expected, req);
    if (rejected) {
      const pathname = (req.url ?? "/").split("?")[0]!;
      log.warn(`[workspace-identity] code=${rejected.code} transport=${isIdentityHostname(hostnameOf(req.headers.host)) ? "browser" : "http"} method=${(req.method ?? "GET").toUpperCase()} route_class=${routeClass(pathname)}`);
      res.statusCode = rejected.status;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify(rejected.body));
      return;
    }
    stripIdentityQuery(req);
    next();
  };
}

function stripIdentityQuery(req: IncomingMessage & { originalUrl?: string; query?: unknown }): void {
  if (typeof req.url === "string") req.url = stripFromUrl(req.url);
  if (typeof req.originalUrl === "string") req.originalUrl = stripFromUrl(req.originalUrl);
  // Express 按 URL 缓存解析结果，改了 url 要把缓存一起丢掉，否则 req.query 还是旧的。
  const r = req as unknown as Record<string, unknown>;
  delete r._parsedUrl;
  delete r._parsedOriginalUrl;
}

function stripFromUrl(url: string): string {
  const i = url.indexOf("?");
  if (i === -1) return url;
  const params = new URLSearchParams(url.slice(i + 1));
  let changed = false;
  for (const k of Object.values(IDENTITY_QUERY)) {
    if (params.has(k)) {
      params.delete(k);
      changed = true;
    }
  }
  if (!changed) return url;
  const rest = params.toString();
  return rest ? `${url.slice(0, i)}?${rest}` : url.slice(0, i);
}

function routeClass(p: string): string {
  if (p.startsWith("/api/canvas")) return "canvas";
  if (p.startsWith("/api/assets") || p.startsWith("/files/")) return "asset";
  if (p.startsWith("/api/files") || p.startsWith("/api/upload")) return "file";
  if (p.startsWith("/api/sessions") || p.startsWith("/api/internal/sessions")) return "session";
  if (p.startsWith("/api/generate") || p.startsWith("/api/dag")) return "generation";
  if (p.startsWith("/api/runtime") || p === "/api/health") return "runtime";
  return "other";
}

function norm(v: string | undefined): string | undefined {
  if (typeof v !== "string") return undefined;
  return v.trim() || undefined;
}

function normGeneration(v: string | number | undefined): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : Number.NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : undefined;
}

function hostnameOf(host: string | undefined): string | undefined {
  if (!host) return undefined;
  const h = host.trim().toLowerCase();
  // IPv6 字面量带方括号，端口在括号外。
  const bare = h.startsWith("[") ? h.slice(0, h.indexOf("]") + 1) : h.replace(/:\d+$/, "");
  return bare || undefined;
}
