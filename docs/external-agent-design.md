# 外部 Agent 接入：4.0.3 的实际设计（读参照得出）

> 供实现用。所有常量与路径都来自冻结的 4.0.3，不是推测。

## 一、它是什么

一个**本机 MCP 服务器**：外部 Agent（Claude Desktop、Cursor 之类）连上本机的这个端点，
就能调用 MiniMax Design 的工具（同一套 25 个 v3 工具）。

**不经过云端。** 只有两处与云端有关（积分提醒、登录要求），按项目范围去掉即可。

## 二、各部件位置

| 部件 | 参照位置 | 说明 |
|---|---|---|
| 协议常量 | `packages/protocol/src/external-agent.ts` | 见下表 |
| MCP 服务器 | `mcp-tools-v3/dist/external-main.js` | 64,011 行 / 2.47 MB（打包产物） |
| 主进程服务 | 主进程 chunk 里的 `IExternalAgentService` / `startExternalAgentService` | 约 2.8 KB |
| 入口解析 | `resolveExternalAgentEntryPath()` | 见下 |
| 回合注入路由 | gateway `POST /api/internal/sessions/external-turn` | 4.0.3 新增的 4 条路由之一 |
| 设置存储 | `EXTERNAL_AGENT_GRANT_DEFAULTS`（在主进程全局存储默认值里） | 见下 |

### 协议常量（逐字）

```ts
EXTERNAL_AGENT_SESSION_PREFIX = "ext_"
EXTERNAL_AGENT_MCP_PATH       = "/mcp"
EXTERNAL_AGENT_OUTPUT_PATH    = "/outputs"
EXTERNAL_AGENT_SERVER_NAME    = "minimax-design"
EXTERNAL_AGENT_TURN_PATH      = "/api/internal/sessions/external-turn"
EXTERNAL_AGENT_OUTPUT_FILE_PATH = "/api/v3/external-agent/ou…"（被截断，需再读全）
```

### 设置默认值（逐字）

```js
const EXTERNAL_AGENT_GRANT_DEFAULTS = {
  enabled: false,
  port: 18810,
  creditReminder: { enabled: true, threshold: 2e3 },   // ← 按范围去掉
  allowedProjectPaths: [],
};
```

### 入口解析

```js
EXTERNAL_MAIN_RELATIVE = path.join("mcp-tools-v3", "dist", "external-main.js");

function resolveExternalAgentEntryPath() {
  return isDev
    ? path.resolve(process.cwd(), "..", EXTERNAL_MAIN_RELATIVE)
    : path.join(process.resourcesPath, EXTERNAL_MAIN_RELATIVE);
}
```

## 三、我们这边的差距

```
packages/protocol/src/external-agent.ts       没有
mcp-tools 的 external-main 入口               没有（我们只有 main.ts 那套）
主进程 IExternalAgentService                  没有
gateway /api/internal/sessions/external-turn  没有（4.0.3 新增路由之一）
设置页的外部 Agent 面板                       没有
```

## 四、实现顺序（建议）

1. **协议常量**：新建 `app/packages/protocol/src/external-agent.ts`，先只放常量与类型。
2. **gateway 的 external-turn 路由**：`POST /api/internal/sessions/external-turn`，
   把外部 Agent 的一轮输入注入成一个会话回合。这条路由是 4.0.3 新增的，正好一起做。
3. **mcp-tools 的 external 入口**：我们的 `app/mcp-tools/src/main.ts` 是 stdio 入口；
   需要一个 **HTTP 入口**（监听 18810、挂 `/mcp` 与 `/outputs`），复用同一套 25 个工具。
4. **主进程服务**：参照 `IExternalAgentService` 的形状（start / stop / status），
   去掉 `creditReminder`，身份用本地（不走云端登录）。
5. **设置页**：开关 + 端口 + 允许的项目路径；去掉积分提醒。

## 五、注意

- 参照的 `external-main.js` 是**打包产物**（2.47 MB），不能直接读成源文件，
  但它内部的模块边界注释（`// ../packages/.../xxx.ts`）保留了，可以据此拆分。
- 它有 60 处 `token` —— 需要逐处确认哪些是云端凭据、哪些是本机会话标识，
  **不能整体照搬**。
