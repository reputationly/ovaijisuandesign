/**
 * 外部 Agent 接入的协议常量（4.0.3 新增）。
 *
 * 逐字取自参照 `packages/protocol/src/external-agent.ts`
 * （在 4.0.3 的 mcp-tools-v3/dist/external-main.js 里保留着原始模块注释与常量值）。
 *
 * 它是什么：一个**本机** MCP 服务器。外部 Agent（Claude Desktop、Cursor 之类）
 * 连到 `http://127.0.0.1:<port>/mcp`，就能调用同一套 v3 工具；
 * 每一轮通过 `<gateway>/api/internal/sessions/external-turn` 注入回会话，
 * 产物文件走 `/api/v3/external-agent/output-file`。
 *
 * **与云端无关**：参照里有 `creditReminder`（积分提醒）与登录要求，
 * 那两处按项目范围不实现，所以这里也不提供相应的常量。
 */

/** 外部 Agent 的会话 id 前缀（与界面会话区分开）。 */
export const EXTERNAL_AGENT_SESSION_PREFIX = "ext_";

/** MCP 端点路径。 */
export const EXTERNAL_AGENT_MCP_PATH = "/mcp";

/** 产物文件端点路径。 */
export const EXTERNAL_AGENT_OUTPUT_PATH = "/outputs";

/** 对外的 MCP server 名（外部 Agent 端会显示这个名字）。 */
export const EXTERNAL_AGENT_SERVER_NAME = "minimax-design";

/** 一轮输入注入到的 gateway 路由。 */
export const EXTERNAL_AGENT_TURN_PATH = "/api/internal/sessions/external-turn";

/** 读取外部 Agent 产物文件的路由。 */
export const EXTERNAL_AGENT_OUTPUT_FILE_PATH = "/api/v3/external-agent/output-file";

/** 默认端口（参照值）。 */
export const EXTERNAL_AGENT_DEFAULT_PORT = 18810;

/** 递归解析出来的本机回环地址（外部 Agent 连这个）。 */
export function externalAgentMcpUrl(port: number): string {
  return `http://127.0.0.1:${port}${EXTERNAL_AGENT_MCP_PATH}`;
}

/** 判断一个会话 id 是否来自外部 Agent。 */
export function isExternalAgentSessionId(sessionId: string): boolean {
  return sessionId.startsWith(EXTERNAL_AGENT_SESSION_PREFIX);
}
