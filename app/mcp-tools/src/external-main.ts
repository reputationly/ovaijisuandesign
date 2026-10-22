#!/usr/bin/env node
/**
 * 外部 Agent 入口（4.0.3 新增）：HTTP 形式的 MCP 服务器。
 *
 * 与 main.ts（stdio 入口，给 opencode 用）的关系：
 *   **同一套 25 个工具、同一个 registrar**，只是传输方式不同 ——
 *   这里监听本机端口，外部 Agent（Claude Desktop / Cursor 等）通过
 *   `http://127.0.0.1:<port>/mcp` 连进来。
 *
 * 参照：`mcp-tools-v3/dist/external-main.js`（恒 2.47MB 打包产物），
 * 其内部常量来自 `packages/protocol/src/external-agent.ts`，已移植到本仓库协议包。
 *
 * **与云端无关**：参照里有积分提醒与登录要求两处，按项目范围不实现 ——
 * 这里只做「本机监听 + 复用工具」。
 *
 * 参数（环境变量）：
 *   EXTERNAL_AGENT_PORT   监听端口，默认 18810
 *   EXTERNAL_AGENT_HOST   监听地址，默认 127.0.0.1（**只绑回环，不对外**）
 *   GATEWAY_URL           gateway 地址，与 main.ts 同一套解析
 */
import { createServer } from "node:http";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import {
  EXTERNAL_AGENT_DEFAULT_PORT,
  EXTERNAL_AGENT_MCP_PATH,
  EXTERNAL_AGENT_OUTPUT_PATH,
  EXTERNAL_AGENT_SERVER_NAME,
} from "@ov/protocol";

import { configureDispatcher, UNDICI_TIMEOUT_MS } from "./dispatcher.js";
import { connectTimeoutMs, gatewayUrl, releaseRegion } from "./env.js";
import { GatewayClient } from "./gateway-client.js";
import { createToolRegistrar, type RegisterToolTarget } from "./registrar.js";
import { registerAllTools } from "./tools/index.js";

const log = (msg: string) => process.stderr.write(`[external-agent] ${msg}\n`);

const PORT = Number.parseInt(process.env.EXTERNAL_AGENT_PORT ?? "", 10) || EXTERNAL_AGENT_DEFAULT_PORT;
const HOST = process.env.EXTERNAL_AGENT_HOST ?? "127.0.0.1";

async function buildServer(): Promise<McpServer> {
  const server = new McpServer(
    { name: EXTERNAL_AGENT_SERVER_NAME, version: "1.0.0" },
    { capabilities: { tools: {} } },
  );
  const gateway = new GatewayClient(gatewayUrl());
  const registrar = createToolRegistrar(server as unknown as RegisterToolTarget);
  registerAllTools(registrar, gateway, releaseRegion());
  log(`registered ${registrar.collected().size} tools`);
  return server;
}

async function main(): Promise<void> {
  const kind = configureDispatcher();
  log(`starting: gateway=${gatewayUrl()}, listen=${HOST}:${PORT} (dispatcher=${kind}, timeout=${UNDICI_TIMEOUT_MS}ms, connect=${connectTimeoutMs()}ms)`);

  // 每个 MCP 会话一个 transport（无状态模式也能工作，但保持一会话一实例更接近参照）
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const http = createServer((req, res) => {
    const url = req.url ?? "/";

    // 产物文件端点：外部 Agent 取生成的图片/视频走这里（参照同路径）
    if (url.startsWith(EXTERNAL_AGENT_OUTPUT_PATH)) {
      res.statusCode = 501;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "output_endpoint_not_implemented" }));
      return;
    }

    if (!url.startsWith(EXTERNAL_AGENT_MCP_PATH)) {
      res.statusCode = 404;
      res.end();
      return;
    }

    void (async () => {
      try {
        const sessionId = req.headers["mcp-session-id"];
        const key = typeof sessionId === "string" ? sessionId : "";
        let transport = key ? transports.get(key) : undefined;
        if (!transport) {
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto.randomUUID(),
            onsessioninitialized: (id) => {
              transports.set(id, transport!);
            },
          });
          transport.onclose = () => {
            const id = transport!.sessionId;
            if (id) transports.delete(id);
          };
          await (await buildServer()).connect(transport);
        }
        await transport.handleRequest(req, res);
      } catch (err) {
        log(`request failed: ${err instanceof Error ? err.message : String(err)}`);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "internal_error" }));
        }
      }
    })();
  });

  http.listen(PORT, HOST, () => {
    log(`listening on http://${HOST}:${PORT}${EXTERNAL_AGENT_MCP_PATH}`);
  });

  const shutdown = () => {
    log("shutting down");
    for (const t of transports.values()) void t.close();
    http.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  log(`FATAL: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
  process.exit(1);
});
