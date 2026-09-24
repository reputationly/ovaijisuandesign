#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { GatewayClient } from "./gateway-client.js";

/**
 * 入口。启动顺序：读 GATEWAY_URL → 探活（全失败就退出）→ 注册工具 → stdio。
 *
 * **server 名必须是 `hub`**：opencode 按它给工具加前缀，agent 配置里写的全是 `hub_*`。
 * **stdout 是协议通道**，诊断只能写 stderr。
 */
async function main() {
  const gatewayUrl = process.env.GATEWAY_URL ?? "http://localhost:8001";
  const gateway = new GatewayClient(gatewayUrl);
  if (!(await gateway.healthCheck())) {
    console.error(`[hub] gateway 不可达: ${gatewayUrl}`);
    process.exit(1);
  }
  const server = new McpServer({ name: "hub", version: "1.0.0" }, { capabilities: { tools: {} } });
  // 工具在 M7 补上。
  await server.connect(new StdioServerTransport());
  console.error(`[hub] ready, gateway=${gatewayUrl}`);
}

main().catch((e) => {
  console.error("[hub]", e);
  process.exit(1);
});
