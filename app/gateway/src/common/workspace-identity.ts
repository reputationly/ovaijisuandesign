import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";

/**
 * 工作区身份校验。主进程给每个工作区 gateway 发一组身份（claim = 工作区路径的 sha256、
 * instance = 这次进程的 UUID、generation = 同一路径第几次启动），客户端请求时带回来。
 *
 * 要防的是：gateway 重启或端口被别的工作区复用后，旧标签页 / 旧 MCP 进程的写请求落进
 * 另一个工作区。所以：
 * - 带了但对不上 → 409，不管什么方法；
 * - 写请求（非 GET / HEAD / OPTIONS）没带齐 → 428；读请求不带照样放行（健康探测、静态文件）；
 * - 进程没拿到身份（独立启动、应用级 gateway）→ 整个不生效。
 */
export interface WorkspaceIdentity {
  claim?: string;
  instance: string;
  generation: string;
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

type Presented = Partial<Record<keyof WorkspaceIdentity, string>>;

export interface IdentityRejection {
  status: 409 | 428;
  body: { ok: false; error: string; error_code: string };
}

/** 从环境变量读期望的身份。instance 和 generation 缺一个就当没有身份。 */
export function identityFromEnv(env: NodeJS.ProcessEnv): WorkspaceIdentity | undefined {
  const instance = env.HILO_WORKSPACE_INSTANCE_ID?.trim();
  const generation = env.HILO_WORKSPACE_GENERATION?.trim();
  if (!instance || !generation) return undefined;
  const claim = env.HILO_WORKSPACE_CLAIM?.trim();
  return { instance, generation, ...(claim ? { claim } : {}) };
}

export function readPresented(headers: IncomingHttpHeaders, url: string | undefined): Presented {
  let query: URLSearchParams | undefined;
  try {
    query = new URL(url ?? "/", "http://gateway.invalid").searchParams;
  } catch {
    query = undefined;
  }
  const pick = (k: keyof WorkspaceIdentity): string | undefined => {
    const h = headers[IDENTITY_HEADERS[k]];
    const v = (Array.isArray(h) ? h[0] : h) ?? query?.get(IDENTITY_QUERY[k]) ?? undefined;
    return v?.trim() || undefined;
  };
  const out: Presented = {};
  for (const k of ["claim", "instance", "generation"] as const) {
    const v = pick(k);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export function verifyIdentity(expected: WorkspaceIdentity | undefined, presented: Presented, method: string | undefined): IdentityRejection | null {
  if (!expected) return null;
  const fields = (["claim", "instance", "generation"] as const).filter((k) => expected[k] !== undefined);
  const wrong = fields.filter((k) => presented[k] !== undefined && presented[k] !== expected[k]);
  if (wrong.length) {
    return {
      status: 409,
      body: {
        ok: false,
        error: `Workspace identity mismatch (${wrong.join(", ")}): this request was meant for another workspace or an earlier gateway instance. Reload the workspace and retry.`,
        error_code: "WORKSPACE_IDENTITY_MISMATCH",
      },
    };
  }
  const m = (method ?? "GET").toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return null;
  const missing = fields.filter((k) => presented[k] === undefined);
  if (missing.length) {
    return {
      status: 428,
      body: {
        ok: false,
        error: `Workspace identity required for ${m} requests; missing ${missing.map((k) => IDENTITY_HEADERS[k]).join(", ")}.`,
        error_code: "WORKSPACE_IDENTITY_REQUIRED",
      },
    };
  }
  return null;
}

/** 挂在 Express 上，放在 CORS 之后：被拒的响应也要带 CORS 头，渲染层才读得到原因。 */
export function workspaceIdentityMiddleware(expected: WorkspaceIdentity | undefined) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const rejected = verifyIdentity(expected, readPresented(req.headers, req.url), req.method);
    if (!rejected) return next();
    res.statusCode = rejected.status;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(rejected.body));
  };
}
