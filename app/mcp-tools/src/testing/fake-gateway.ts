import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * 测试用假 gateway（node:http）。路由表按 `METHOD /path` 精确匹配（不含 query），
 * 找不到回 404。所有请求记在 `requests` 里供断言。
 */

export interface RecordedRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  headers: IncomingHttpHeaders;
  body: unknown;
}

export interface FakeResponse {
  status?: number;
  json?: unknown;
  text?: string;
  /** 延迟回包，模拟慢请求 / 超时。 */
  delayMs?: number;
}

export type FakeHandler = (req: RecordedRequest) => FakeResponse | Promise<FakeResponse>;

export interface FakeGateway {
  url: string;
  requests: RecordedRequest[];
  routes: Map<string, FakeHandler>;
  on(method: string, path: string, handler: FakeHandler | FakeResponse): void;
  close(): Promise<void>;
}

export async function startFakeGateway(): Promise<FakeGateway> {
  const routes = new Map<string, FakeHandler>();
  const requests: RecordedRequest[] = [];
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      void (async () => {
        const u = new URL(req.url ?? "/", "http://localhost");
        const raw = Buffer.concat(chunks).toString("utf8");
        let body: unknown = raw;
        try {
          body = raw ? JSON.parse(raw) : undefined;
        } catch {
          // 保留原文
        }
        const rec: RecordedRequest = {
          method: req.method ?? "GET",
          path: u.pathname,
          query: u.searchParams,
          headers: req.headers,
          body,
        };
        requests.push(rec);
        const handler = routes.get(`${rec.method} ${rec.path}`);
        const out: FakeResponse = handler ? await handler(rec) : { status: 404, json: { message: "not found" } };
        if (out.delayMs) await new Promise((r) => setTimeout(r, out.delayMs));
        if (res.destroyed) return;
        res.statusCode = out.status ?? 200;
        if (out.text !== undefined) {
          res.end(out.text);
        } else {
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(out.json ?? {}));
        }
      })();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    routes,
    on(method, path, handler) {
      routes.set(`${method.toUpperCase()} ${path}`, typeof handler === "function" ? handler : () => handler);
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
