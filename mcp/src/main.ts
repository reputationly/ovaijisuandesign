/**
 * MCP server。opencode 通过 stdio 拉起它。
 *
 * server 名必须是 `hub` —— opencode 按 server 名给工具加前缀，agent 侧
 * 看到的才是 `hub_generate_image` 这种，而官方的 agent 配置就是照那些名字
 * 写的。改了名字，那批提示词里 120 处工具调用会全部落空，**而且 LLM 不会
 * 报错，它会自己编一个看起来合理的做法**。
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import { diag, gw } from "./gateway"
import { TOOLS } from "./tools"

const server = new McpServer({ name: "hub", version: "0.1.0" })

for (const tool of TOOLS) {
  server.registerTool(
    tool.name,
    { description: tool.description, inputSchema: tool.inputSchema },
    async (args: unknown) => {
      try {
        return await tool.handler(args)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        diag(`[error] ${tool.name}: ${message}`)
        // 抛回去而不是返回一个"成功但内容是错误文本"的结果 —— 后者会让
        // agent 以为这一步成功了，继续往下走。
        throw new Error(`${tool.name} 失败: ${message}`)
      }
    },
  )
}

diag(`[boot] ${TOOLS.length} 个工具，gateway=${gw.base}`)
await server.connect(new StdioServerTransport())
