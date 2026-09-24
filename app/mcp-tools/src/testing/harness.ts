import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { GatewayClient } from "../gateway-client.js";
import { createToolRegistrar, type RegisterToolTarget, type ToolRegistrar } from "../registrar.js";

/**
 * 测试用：不起 MCP 传输，直接抓住注册下来的工具。
 * `call` 模拟 SDK 的行为 —— 先用包好的 passthrough schema 解析参数，再调包装后的 handler。
 */

export interface CapturedTool {
  name: string;
  config: Record<string, unknown>;
  handler: (args: unknown, extra: unknown) => unknown;
}

export interface Harness {
  registrar: ToolRegistrar;
  tools: Map<string, CapturedTool>;
  call(name: string, args?: Record<string, unknown>): Promise<CallToolResult>;
}

export function createHarness(): Harness {
  const tools = new Map<string, CapturedTool>();
  const target: RegisterToolTarget = {
    registerTool(name, config, handler) {
      if (tools.has(name)) throw new Error(`duplicate tool ${name}`);
      tools.set(name, { name, config, handler });
      return undefined;
    },
  };
  const registrar = createToolRegistrar(target);
  return {
    registrar,
    tools,
    async call(name, args = {}) {
      const tool = tools.get(name);
      if (!tool) throw new Error(`tool not registered: ${name}`);
      const schema = tool.config.inputSchema as z.ZodTypeAny;
      const parsed = schema.parse(structuredClone(args));
      const result = (await tool.handler(parsed, {})) as CallToolResult;
      // 和 SDK 一样：声明了 outputSchema 的工具，非 isError 结果必须带合规的 structuredContent，
      // 否则 SDK 会把整次调用变成协议错误
      const outputShape = tool.config.outputSchema as z.ZodRawShape | undefined;
      if (outputShape && !result.isError) {
        if (!result.structuredContent) throw new Error(`Output validation error: ${name} returned no structuredContent`);
        const check = z.object(outputShape).safeParse(result.structuredContent);
        if (!check.success) throw new Error(`Output validation error: ${name}: ${check.error.message}`);
      }
      return result;
    },
  };
}

/** 从结果里取第一段文本（多数工具是 JSON 文本）。 */
export function resultText(r: CallToolResult): string {
  const first = r.content?.[0];
  return first && first.type === "text" ? first.text : "";
}

export function resultJson<T = Record<string, unknown>>(r: CallToolResult): T {
  if (r.structuredContent) return r.structuredContent as T;
  return JSON.parse(resultText(r)) as T;
}

export function gatewayFor(url: string): GatewayClient {
  return new GatewayClient(url);
}
