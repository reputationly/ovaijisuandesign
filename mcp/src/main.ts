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

import { activity, diag, gw } from "./gateway"
import { TOOLS } from "./tools"

const server = new McpServer({ name: "hub", version: "0.1.0" })

/**
 * 入参摘要，给右栏折叠着显示。
 *
 * **截断**：`generate_image` 的 image_paths 是整张图的 base64 时，
 * 一条活动能有几 MB —— 存进环形缓冲会把 gateway 的内存吃光，而界面上
 * 那一栏本来就只显示一行。
 */
function summarize(args: unknown): string | undefined {
  if (!args || typeof args !== "object") return undefined
  try {
    const s = JSON.stringify(args)
    return s.length > 400 ? `${s.slice(0, 400)}…` : s
  } catch {
    return undefined
  }
}

let seq = 0

for (const tool of TOOLS) {
  server.registerTool(
    tool.name,
    { description: tool.description, inputSchema: tool.inputSchema },
    async (args: unknown) => {
      // 名字带上 `hub_` 前缀再上报 —— 官方的标签表就是按这个键的，
      // 不带前缀前端每条都得自己拼。
      const name = `hub_${tool.name}`
      const id = `c${++seq}`
      activity({ tool: name, phase: "start", id, summary: summarize(args) })
      try {
        const out = await tool.handler(args)
        activity({ tool: name, phase: "ok", id })
        return out
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        diag(`[error] ${tool.name}: ${message}`)
        activity({ tool: name, phase: "error", id, error: message })
        // 抛回去而不是返回一个"成功但内容是错误文本"的结果 —— 后者会让
        // agent 以为这一步成功了，继续往下走。
        throw new Error(`${tool.name} 失败: ${message}`)
      }
    },
  )
}

diag(`[boot] ${TOOLS.length} 个工具，gateway=${gw.base}`)
await server.connect(new StdioServerTransport())
