/**
 * 冒烟：stdio 握手 → 列工具 → 真调几次。
 *
 *   bun scripts/smoke.ts
 *
 * 需要 gateway（默认 :8100）已经在跑。这是唯一能证明"opencode 拉起来之后
 * 工具真的能用"的检查 —— 单测只覆盖 schema，覆盖不了协议握手。
 */
import { fileURLToPath } from "node:url"

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const GATEWAY = process.env.GATEWAY_URL ?? "http://127.0.0.1:8100"

const transport = new StdioClientTransport({
  command: "bun",
  args: ["src/main.ts"],
  // fileURLToPath 而不是 .pathname —— Windows 上后者会多一个前导斜杠。
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  env: { ...process.env, GATEWAY_URL: GATEWAY } as Record<string, string>,
})

const client = new Client({ name: "smoke", version: "0.0.0" })
await client.connect(transport)

const { tools } = await client.listTools()
console.log(`gateway         ${GATEWAY}`)
console.log(`工具数          ${tools.length}`)
for (const t of tools) {
  const keys = Object.keys((t.inputSchema as { properties?: object }).properties ?? {})
  console.log(`  ${t.name.padEnd(24)} ${keys.join(", ")}`)
}

const call = async (name: string, args: Record<string, unknown>) => {
  const r = await client.callTool({ name, arguments: args })
  return {
    isError: r.isError === true,
    text: ((r.content as { text?: string }[])?.[0]?.text ?? "").slice(0, 300),
  }
}

console.log("\n=== canvas_list_nodes ===")
const listed = await call("canvas_list_nodes", {})
console.log(listed.isError ? `✗ ${listed.text}` : listed.text)

// MCP 的语义是：工具执行失败作为 `isError: true` 回给 LLM，**不是**协议错误。
// 关键是 agent 能看出这一步失败了 —— 如果失败被包成一次正常返回，
// agent 会以为成功、继续往下走。
console.log("\n=== 查一个不存在的节点：不是错误，gateway 会说 missing ===")
const missing = await call("canvas_get_node", { nodeId: "does-not-exist" })
console.log(missing.isError ? `✗ 不该算失败: ${missing.text}` : `✓ ${missing.text}`)

console.log("\n=== 错误传播 ===")
const failed = await call("canvas_get_node", {})
console.log(
  failed.isError
    ? `✓ isError=true: ${failed.text.slice(0, 140)}`
    : `✗ 失败没被标成 isError —— agent 会以为这一步成功了: ${failed.text}`,
)

await client.close()
