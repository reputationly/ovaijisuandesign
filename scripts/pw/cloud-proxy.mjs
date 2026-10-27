import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * 抓参照应用（MiniMax Design）的云端请求。
 *
 * 用法：
 *   node scripts/pw/cloud-proxy.mjs --target https://design.minimax.cn --out .probe/ref-proxy
 *   CLOUD_GATEWAY_BASE_URL=http://127.0.0.1:<port> "/Applications/MiniMax Design.app/Contents/MacOS/MiniMax Design"
 *
 * 参照 4.0.4 的 asar 里 `CLOUD_GATEWAY_BASE_URL` 是环境变量覆盖（`getCloudGatewayUrl` 之前读），
 * 指到本地就能把云端请求原样拦下来。**只做透传**：不改请求、不改响应，避免影响它的正常行为。
 *
 * 落盘前脱敏：`sk-…`、`Authorization` / `Cookie` 头。**请求体原样保留**——排查提示词要的就是它。
 */
const args = process.argv.slice(2);
const valueOf = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const target = (valueOf("target", "https://design.minimax.cn") ?? "").replace(/\/+$/, "");
const out = path.resolve(valueOf("out", ".probe/ref-proxy") ?? ".probe/ref-proxy");
const port = Number(valueOf("port", "0"));
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = path.join(out, stamp);
mkdirSync(dir, { recursive: true });

const redact = (text) =>
  String(text)
    .replace(/sk-[A-Za-z0-9_-]{6,}/g, (m) => `${m.slice(0, 3)}…redacted(${m.length})`)
    .replace(/(Bearer\s+)[A-Za-z0-9._-]{8,}/g, "$1…redacted");

let index = 0;
const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  const n = ++index;
  const url = `${target}${request.url}`;
  const started = Date.now();
  try {
    // **原样转发所有请求头**（去掉只对这一段连接有意义的几个）。
    // 之前只白名单了几个头，结果 `/api/v1/config` 401 —— 它的鉴权走的是别的头/凭据
    // （cookie 或自定义 token 头），少一个就整条链路断掉，表现成"服务响应中断"。
    const forwardHeaders = {};
    for (const [name, value] of Object.entries(request.headers)) {
      if (!value || ["host", "content-length", "connection", "accept-encoding"].includes(name.toLowerCase())) continue;
      forwardHeaders[name] = Array.isArray(value) ? value.join(", ") : String(value);
    }
    const upstream = await fetch(url, {
      method: request.method,
      headers: forwardHeaders,
      ...(request.method === "GET" || request.method === "HEAD" ? {} : { body: raw }),
    });
    response.writeHead(upstream.status, {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      ...(upstream.headers.get("cache-control") ? { "cache-control": String(upstream.headers.get("cache-control")) } : {}),
    });
    if (!upstream.body) {
      response.end();
    } else {
      for await (const chunk of upstream.body) response.write(chunk);
      response.end();
    }
    const body = raw.toString("utf8");
    const headerNames = Object.keys(forwardHeaders).sort();
    const summary = { n, at: new Date().toISOString(), method: request.method, path: request.url, status: upstream.status, ms: Date.now() - started, requestBytes: raw.length, headerNames };
    writeFileSync(path.join(dir, `${String(n).padStart(3, "0")}.json`), redact(JSON.stringify({ ...summary, body: body ? tryJson(body) : null }, null, 2)));
    console.log(`${summary.status} ${summary.method} ${summary.path} (${summary.requestBytes}B)`);
  } catch (error) {
    response.statusCode = 502;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ error: { message: String(error).slice(0, 200) } }));
    writeFileSync(path.join(dir, `${String(n).padStart(3, "0")}-error.json`), redact(JSON.stringify({ path: request.url, error: String(error) }, null, 2)));
    console.log(`502 ${request.method} ${request.url} → ${String(error).slice(0, 120)}`);
  }
});

function tryJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 20000);
  }
}

server.listen(port, "127.0.0.1", () => {
  const actual = server.address().port;
  console.log(`cloud-proxy 已就绪：http://127.0.0.1:${actual} → ${target}`);
  console.log(`落盘目录：${dir}`);
  console.log(`启动参照应用时带上：CLOUD_GATEWAY_BASE_URL=http://127.0.0.1:${actual}`);
  writeFileSync(path.join(dir, "proxy-url.txt"), `http://127.0.0.1:${actual}`);
});
