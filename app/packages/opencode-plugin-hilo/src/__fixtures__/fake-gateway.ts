import { createServer, type Server } from "node:http";

/**
 * 测试用的假 gateway：记下收到的每个请求，按路径后缀回预设的结果。
 * 回复可以是对象（200 + JSON）、`{ status, body }`，或函数（按请求体算）。
 */
export interface RecordedCall {
  method: string;
  path: string;
  body: any;
  headers: Record<string, unknown>;
}

export type Reply = unknown | { __status: number; body?: unknown } | ((call: RecordedCall) => unknown | Promise<unknown>);

export interface FakeGateway {
  url: string;
  calls: RecordedCall[];
  /** 路径（去掉 query）以 key 结尾就用它回复。越具体的 key 越先匹配。 */
  routes: Map<string, Reply>;
  reset(): void;
  close(): Promise<void>;
}

export const status = (code: number, body: unknown = {}) => ({ __status: code, body });

export async function startFakeGateway(defaults: Record<string, Reply> = {}): Promise<FakeGateway> {
  const calls: RecordedCall[] = [];
  const routes = new Map<string, Reply>(Object.entries(defaults));
  const server: Server = createServer((req, res) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", async () => {
      let body: unknown;
      try {
        body = s ? JSON.parse(s) : undefined;
      } catch {
        body = s;
      }
      const call: RecordedCall = { method: req.method ?? "GET", path: req.url ?? "", body, headers: req.headers };
      calls.push(call);
      const pathname = (req.url ?? "").split("?")[0]!;
      const key = [...routes.keys()].sort((a, b) => b.length - a.length).find((k) => pathname.endsWith(k));
      let reply: unknown = key === undefined ? { __status: 404, body: {} } : routes.get(key);
      if (typeof reply === "function") reply = await (reply as (c: RecordedCall) => unknown)(call);
      res.setHeader("content-type", "application/json");
      if (reply && typeof reply === "object" && "__status" in reply) {
        const r = reply as { __status: number; body?: unknown };
        res.statusCode = r.__status;
        res.end(typeof r.body === "string" ? r.body : JSON.stringify(r.body ?? {}));
        return;
      }
      res.end(JSON.stringify(reply));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const initial = new Map(routes);
  return {
    url,
    calls,
    routes,
    reset() {
      calls.length = 0;
      routes.clear();
      for (const [k, v] of initial) routes.set(k, v);
    },
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
