#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { configureDispatcher, UNDICI_TIMEOUT_MS } from "./dispatcher.js";
import { connectTimeoutMs, gatewayUrl, releaseRegion } from "./env.js";
import { GatewayClient } from "./gateway-client.js";
import { createToolRegistrar, type RegisterToolTarget } from "./registrar.js";
import { pushToolMetas } from "./tool-metas.js";
import { registerAllTools } from "./tools/index.js";

/**
 * 入口：dispatcher → 探活（全失败 exit(1)）→ 注册工具 → 推 tool-metas（不等）→ stdio。
 *
 * **server 名必须是 `hub`**：opencode 按它给工具加前缀，agent 配置里写的全是 `hub_*`。
 * **stdout 是协议通道**，诊断只能写 stderr。
 */
const log = (msg: string) => process.stderr.write(`[hub] ${msg}\n`);

async function main(): Promise<void> {
  const url = gatewayUrl();
  log(`starting: cwd=${process.cwd()}, gateway=${url}`);
  const kind = configureDispatcher();
  log(`undici dispatcher configured (kind=${kind}, timeout=${UNDICI_TIMEOUT_MS}ms, connect=${connectTimeoutMs()}ms)`);

  const server = new McpServer({ name: "hub", version: "1.0.0" }, { capabilities: { tools: {} } });
  const gateway = new GatewayClient(url);
  // SDK 的 registerTool 是重载泛型，这里只需要最小面
  const registrar = createToolRegistrar(server as unknown as RegisterToolTarget);

  try {
    await gateway.healthCheck();
    log("Gateway health check passed");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`FATAL: Cannot connect to Gateway (${url}): ${msg}\n  Ensure Gateway is running and GATEWAY_URL is correct.`);
    process.exit(1);
  }

  registerAllTools(registrar, gateway, releaseRegion());
  log(`registered ${registrar.collected().size} tools`);
  void pushToolMetas(gateway, registrar.collected());

  await server.connect(new StdioServerTransport());
  log("connected via stdio");
}

main().catch((err) => {
  log(`FATAL: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
  process.exit(1);
});
