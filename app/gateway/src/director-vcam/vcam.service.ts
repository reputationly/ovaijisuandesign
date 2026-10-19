import { timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createServer as createSecureServer } from "node:https";
import { fileURLToPath } from "node:url";

import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { WebSocket, WebSocketServer, type RawData } from "ws";

import { prepareCertificate, type VcamCertificate } from "./certificate.js";
import { lanAddresses } from "./network.js";

type Socket = WebSocket & { alive?: boolean };
type Session = { token: string; logs: number; desktop?: Socket; phone?: Socket };
export type VcamInfo = { lanIp: string; httpPort: number; httpsPort: number; phoneBase: string; certMode: VcamCertificate["certMode"] };

const PHONE_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

function same(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function localOrigin(origin: string | undefined): boolean {
  if (!origin || origin === "null" || origin === "file://" || origin === "app://.") return true;
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function send(socket: WebSocket | undefined, value: unknown): void {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value));
}

function listen(server: Server, host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, () => {
      server.off("error", reject);
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    });
  });
}

function phoneDir(): string {
  const beside = fileURLToPath(new URL("./phone/", import.meta.url));
  if (existsSync(beside)) return beside;
  return fileURLToPath(new URL("../../src/director-vcam/phone/", import.meta.url));
}

/**
 * 桌面和手机不直连。本机明文口只接待桌面，局域网加密口只接待手机，两边用同一对会话号和令牌配对。
 * 没有工作区活动登记，端口和配对规则仍按同一套走。
 */
@Injectable()
export class DirectorVcamService implements OnModuleDestroy {
  info: VcamInfo | null = null;
  /** 测试可以换成固定网卡，避免依赖这台机器当时有没有局域网地址。 */
  interfaces = lanAddresses;
  cacheDir?: string;
  certificateFetch?: typeof fetch;
  private servers: Server[] = [];
  private sockets: WebSocketServer | null = null;
  private sessions = new Map<string, Session>();
  private lastDesktop = Date.now();
  private queue: Promise<unknown> = Promise.resolve();
  private timer?: ReturnType<typeof setInterval>;
  private assets = new Map<string, { type: string; body: string }>();

  constructor() {
    const dir = phoneDir();
    for (const name of ["phone.html", "phone.js", "phone.css"]) {
      const file = `${dir}/${name}`;
      if (!existsSync(file)) continue;
      const extension = name.slice(name.lastIndexOf("."));
      this.assets.set(name === "phone.html" ? "/phone.html" : `/${name}`, { type: PHONE_TYPES[extension] ?? "application/octet-stream", body: readFileSync(file, "utf8") });
    }
  }

  status() {
    return {
      running: !!this.info,
      info: this.info,
      sessions: this.sessions.size,
      phones: [...this.sessions.values()].filter((session) => session.phone?.readyState === WebSocket.OPEN).length,
    };
  }

  start(lanIp?: string) {
    return this.serialized(async () => {
      const ips = this.interfaces();
      const ip = lanIp ?? ips[0];
      if (!ip || !ips.includes(ip)) throw new Error("NO_LAN");
      if (this.info?.lanIp === ip) return this.info;
      if (this.info) await this.close();
      try {
        const tls = await prepareCertificate(ip, { cacheDir: this.cacheDir, fetch: this.certificateFetch });
        const sockets = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024, perMessageDeflate: false });
        this.sockets = sockets;
        const local = createServer((req, res) => this.http(req, res, false));
        const lan = createSecureServer(tls, (req, res) => this.http(req, res, true));
        this.servers = [local, lan];
        for (const [server, isLan] of [[local, false], [lan, true]] as const) {
          server.requestTimeout = 10_000;
          server.headersTimeout = 10_000;
          server.on("upgrade", (req, socket, head) => {
            if (sockets.clients.size >= 128) {
              socket.destroy();
              return;
            }
            let url: URL;
            try {
              url = new URL(req.url ?? "/", "http://localhost");
            } catch {
              socket.destroy();
              return;
            }
            if (url.pathname !== "/vcam-ws" || (!isLan && !localOrigin(req.headers.origin))) {
              socket.destroy();
              return;
            }
            sockets.handleUpgrade(req, socket, head, (client) => this.connect(client as Socket, url, isLan));
          });
        }
        const httpPort = await listen(local, "127.0.0.1");
        const httpsPort = await listen(lan, "0.0.0.0");
        this.info = { lanIp: ip, httpPort, httpsPort, phoneBase: `https://${tls.phoneHost}:${httpsPort}`, certMode: tls.certMode };
        this.lastDesktop = Date.now();
        this.timer = setInterval(() => {
          for (const client of sockets.clients as Set<Socket>) {
            if (client.alive === false) {
              client.terminate();
              continue;
            }
            client.alive = false;
            client.ping();
          }
          if ([...this.sessions.values()].some((session) => session.desktop?.readyState === WebSocket.OPEN)) this.lastDesktop = Date.now();
          else if (Date.now() - this.lastDesktop > 15 * 60 * 1000) void this.stop();
        }, 30_000);
        this.timer.unref();
        return this.info;
      } catch (error) {
        await this.close();
        throw error;
      }
    });
  }

  stop() {
    return this.serialized(async () => {
      await this.close();
      return this.status();
    });
  }

  onModuleDestroy(): Promise<unknown> {
    return this.stop();
  }

  private serialized<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async close(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    for (const client of this.sockets?.clients ?? []) client.terminate();
    this.sockets?.close();
    this.sockets = null;
    await Promise.all(this.servers.map((server) => new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    })));
    this.servers = [];
    this.sessions.clear();
    this.info = null;
  }

  private connect(socket: Socket, url: URL, lan: boolean): void {
    socket.on("error", () => undefined);
    socket.on("pong", () => {
      socket.alive = true;
    });
    const role = url.searchParams.get("role");
    const sid = url.searchParams.get("session") ?? "";
    const token = url.searchParams.get("token") ?? "";
    if ((role !== "desktop" && role !== "phone") || (lan && role !== "phone") || (!lan && role !== "desktop") || !/^[a-zA-Z0-9_-]{6,128}$/.test(sid) || !/^[a-zA-Z0-9_-]{16,256}$/.test(token)) {
      socket.close(4001, "bad params");
      return;
    }
    let session = this.sessions.get(sid);
    if (!session && role === "desktop" && this.sessions.size < 32) {
      session = { token, logs: 0 };
      this.sessions.set(sid, session);
    }
    if (!session || !same(session.token, token)) {
      socket.close(4001, "unknown session");
      return;
    }
    const current = session;
    const previous = current[role];
    current[role] = socket;
    previous?.close(4002, "replaced");
    if (role === "desktop") {
      this.lastDesktop = Date.now();
      send(socket, { type: "hello-ack", lanUrl: this.info?.phoneBase, lanIp: this.info?.lanIp, certMode: this.info?.certMode });
    }
    if (current.desktop && current.phone) {
      send(current.desktop, { type: "paired" });
      send(current.phone, { type: "paired" });
    }
    let count = 0;
    let windowStart = Date.now();
    socket.on("message", (data: RawData, binary: boolean) => {
      if (current[role] !== socket || binary) return;
      if (Date.now() - windowStart > 1000) {
        windowStart = Date.now();
        count = 0;
      }
      if (++count > 200) {
        socket.close(1008, "rate limited");
        return;
      }
      const peer = role === "desktop" ? current.phone : current.desktop;
      if (peer?.readyState === WebSocket.OPEN) {
        if (peer.bufferedAmount > 1024 * 1024) {
          peer.close(1008, "slow peer");
          return;
        }
        peer.send(data, { binary: false });
      }
    });
    socket.on("close", () => {
      if (current[role] !== socket) return;
      current[role] = undefined;
      send(role === "desktop" ? current.phone : current.desktop, { type: "peer-left" });
      if (!current.desktop && !current.phone && this.sessions.get(sid) === current) this.sessions.delete(sid);
      if (role === "desktop") this.lastDesktop = Date.now();
    });
  }

  private http(req: IncomingMessage, res: ServerResponse, lan: boolean): void {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Permissions-Policy", "accelerometer=(self), gyroscope=(self), magnetometer=(self), camera=(), microphone=()");
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    if (req.method !== "GET") {
      res.writeHead(405);
      res.end();
      return;
    }
    if (pathname === "/healthz" && !lan) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(this.status()));
      return;
    }
    if (pathname === "/vcam-log" && lan) {
      const session = this.sessions.get(String(req.headers["x-vcam-session"] ?? ""));
      if (!session || !same(session.token, String(req.headers["x-vcam-token"] ?? ""))) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (++session.logs > 20) {
        res.writeHead(429);
        res.end();
        return;
      }
      let text = String(req.headers["x-vcam-log"] ?? "").slice(0, 6000);
      try {
        text = decodeURIComponent(text);
      } catch {
        // 日志头不是合法转义时按原文转发。
      }
      send(session.desktop, { type: "debug-log", text });
      res.writeHead(204);
      res.end();
      return;
    }
    const asset = lan ? this.assets.get(pathname === "/" ? "/phone.html" : pathname) : undefined;
    if (!asset) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader("Content-Type", asset.type);
    res.end(asset.body);
  }
}
