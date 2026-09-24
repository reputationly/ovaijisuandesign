/** 回连本工作区的 gateway。地址由主进程经环境变量给出。 */
export function gatewayUrl(): string {
  const u = process.env.GATEWAY_URL?.trim();
  if (!u) throw new Error("GATEWAY_URL 没有设置：插件需要回连 gateway（确认、防打转、根会话都靠它）");
  return u.replace(/\/+$/, "");
}

export async function gatewayJson<T>(path: string, init: { method?: string; body?: unknown; timeoutMs?: number } = {}): Promise<T> {
  const res = await fetch(gatewayUrl() + path, {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(init.timeoutMs ?? 5000),
  });
  if (!res.ok) throw new Error(`gateway ${path} → ${res.status}`);
  return (await res.json()) as T;
}

const roots = new Map<string, string>();

/** 根会话 id。子 agent 的会话要按根会话取语言、授权。查不到就当自己是根。 */
export async function rootSessionOf(sessionId: string): Promise<string> {
  const hit = roots.get(sessionId);
  if (hit) return hit;
  try {
    const r = await gatewayJson<{ rootSessionId?: string }>(`/api/internal/sessions/${encodeURIComponent(sessionId)}/root`, { timeoutMs: 2000 });
    const root = r.rootSessionId || sessionId;
    roots.set(sessionId, root);
    return root;
  } catch {
    return sessionId;
  }
}
