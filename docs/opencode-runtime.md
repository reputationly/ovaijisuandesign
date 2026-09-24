# opencode 运行时：官方怎么拉起、怎么接

官方 MiniMax Design **3.0.16** 里 opencode 的进程编排，以及聊天界面怎么和它通信。
这是我们把默认 agent 切回 opencode 时要对齐的接口面。

> 只记接口事实。出处是解包后的 `app.asar`（主进程 `out/main/chunks/python-runtime-*.js`、
> `index-*.js`、`js-yaml-*.js`；渲染层 `out/renderer/assets/index-*.js`）和
> `gateway/dist/main.js`，都未压缩。插件那一层见 [`plugin-hilo.md`](plugin-hilo.md)。

## 一句话

```
渲染层 ──WebSocket /ws──► gateway ──HTTP + SSE(/global/event)──► opencode serve
                                                                   │
                              mcp-tools (stdio, server 名 hub) ◄───┘  ──HTTP──► gateway
```

**渲染层不直连 opencode，也不走 IPC。** 它拿不到 opencode 的地址和密码。
聊天、会话列表、事件推送全经 gateway；gateway 是唯一的 opencode 客户端。

## 一、拓扑

- **每个工作区一套** gateway + opencode（主进程里每个工作区一个子容器），最多同时开 5 个。
  另有一个不带 opencode 的 app 级 gateway。
- opencode 的 cwd = 工作区目录。会话与项目的对应就是 opencode 会话的 `directory`。

## 二、拉起 `opencode serve`

| | 值 |
|---|---|
| 二进制 | `<resources>/opencode/opencode`（1.18.18，同目录带 `rg`）；启动前校验存在、≥1MB、Mach-O magic |
| argv | `serve --hostname 127.0.0.1 --port <空闲端口>`（`listen(0)` 取端口后 close；每次重启重新取） |
| spawn | `stdio: [ignore, pipe, pipe]`；非 Windows `detached: true`（整组 kill） |
| 鉴权 | `OPENCODE_SERVER_USERNAME` / `_PASSWORD`，每个实例各一个随机 UUID；所有请求 `Authorization: Basic` |

环境变量（后层覆盖前层）：

1. 继承 `process.env`，但**删掉** `OPENCODE_CONFIG{,_DIR,_CONTENT}`、`HILO_*_DIR` 一类；macOS 强制 `SHELL=/bin/bash`。
2. 固定：`OPENCODE_CLIENT=hilo-agent`、**`OPENCODE_ENABLE_QUESTION_TOOL=true`**、basic auth 两个。
3. 隔离：`OPENCODE_TEST_HOME=<userData>/ai-runtime/home`；`XDG_{CONFIG,CACHE,DATA,STATE}_HOME` →
   `<userData>/ai-runtime/{config-home,cache-home,data-home,state-home}`。
4. 开关：`OPENCODE_DISABLE_PROJECT_CONFIG=1`、`OPENCODE_DISABLE_CLAUDE_CODE=1`、
   `OPENCODE_DISABLE_EXTERNAL_SKILLS=1`、`OPENCODE_LOG_LEVEL=INFO`。
5. 给插件：`GATEWAY_URL=<本工作区 gateway>`、`HILO_MANAGED_RUNTIME=1`、`NODE_ENV`、
   `HILO_LOAD_USER_MEMORY`、`HILO_BUNDLED_PLUGINS_DIR`；PATH 前拼 opencode 目录（找 `rg`）和 skill runtimes。
6. `OPENCODE_CONFIG_DIR=<staging 目录>`（见第四节）。
7. 配置内容**外置成文件**：写 `tmpdir/hilo-opencode-config-<pid>-<uuid>.json`（0600），
   设 `OPENCODE_CONFIG=<该路径>`，不用 `OPENCODE_CONFIG_CONTENT`；stop 时删除。

## 三、生成的 opencode 配置

合并顺序：`base.json` → `base.<region>.json` → `<channel>.json`（deepMerge），再叠云端下发的
`enabled_providers` / `model` / `provider` / `permission` / `compaction` / `agent_model`。

- **`base.json` 本身不含 provider**；有 `experimental.mcp_timeout=3600000`、
  `default_agent: "media-agent"`、`agent`（禁用 build/plan/explore/general；media-agent 为 primary，
  comfyui-agent / planner / router / executor 为 subagent，各带 `hub_*` 准入名单）、`mcp.hub`、
  `plugin: [".opencode-v2/plugins/session-header.ts"]`。
- **provider**：官方从云端拿。自定义模型的 provider id 必须匹配 `^user-custom-[a-z0-9-]+$`，
  npm 包按协议选 `@ai-sdk/anthropic` / `@ai-sdk/openai` / `@ai-sdk/openai-compatible`；
  启用自定义模型时删掉各 agent 的 `model` 和 `small_model`。
- **permission**：没配时 `{"*": "allow"}` —— 所以**不会有 `permission.asked`**，确认类交互全由插件 + gateway 自己做。
- **`mcp.hub`**：`node` 换成 Electron 可执行文件 + `ELECTRON_RUN_AS_NODE=1`，入口 `<resources>/mcp-tools/dist/main.js`。
  `environment`：`GATEWAY_URL`、`FFMPEG_PATH`、`FFPROBE_PATH`、`SKILLS_DIR=~/.hub/skills`、
  `HILO_KNOWLEDGE_DIR` / `HILO_WORKFLOWS_DIR`（→ `~/.hub/.config-v2/…`）、`HILO_USER_LANG`、`NODE_OPTIONS=--use-system-ca`。
- **`plugin` 一律 `file://` 绝对路径**（不用 npm 名）：session-header.ts、`opencode-plugin-hilo/dist/hilo.js`、
  `opencode-plugin-trace/dist/trace.js`。
- **`skills.paths`**：`~/.hub/skills/*` + 内置插件里的 skills。
- **依赖标记**：每次启动往 `OPENCODE_CONFIG_DIR` 和 `$XDG_CONFIG_HOME/opencode` 写
  `package.json`（`{"name":"hilo-opencode-config","private":true,"dependencies":{"@opencode-ai/plugin":"1.18.18"}}`）、
  对应 `package-lock.json`、`.npmrc`（`offline=true`）、空 `node_modules/` —— 让 opencode 不去在线 npm install。

## 四、配置目录

- 启动时把 `<resources>/agent-profiles/v2/config` 同步到 `~/.hub/.config-v2`，`.version` 记应用版本，
  不一致就整目录删了重拷。校验必须有：base.json、5 个 agents/*.md、contracts/baseline.md、
  knowledge/vendors、plugins/session-header.ts、workflows/workflow.md。
- **真正的 `OPENCODE_CONFIG_DIR` 是 staging 目录** `tmpdir/hilo-opencode-staging-<pid>`，每次启动重建：
  - 除 `agents/` 外全部 symlink 回 `~/.hub/.config-v2`；
  - **`agents/*.md` 被改写**：按各 contracts 文件 frontmatter 的 `agents:` 字段把合同正文拼进对应 agent，
    再追加 `<knowledge-base>` / `<workflows-base>` 两段绝对路径说明；
  - 写 `.contracts-staging-marker.json`；启动时清理已退出进程留下的旧 staging。

> 这一条对我们很关键：**直接把 agent-profiles 丢给 opencode 是不够的**，合同（contracts）
> 不会自己进 agent 提示词。`ovagent` 目前没做这一步。

## 五、生命周期

- **健康**：轮询 `GET /global/health`（basic auth，500ms 间隔，单次 2s），要 `{healthy: true, version}`。
  软超时 max(30s, macOS 90s / Windows 120s)，硬超时 min(软×2, 240s)。
- 就绪后 `GET /session?directory=<cwd>&roots=true&limit=1` 预热（只观察不重启）。
- **崩溃**：最多重启 3 次，退避 1s·2^(n-1)（上限 10s）+750ms；30s 内 ≥2 次熔断 60s；稳定 5 分钟清零。
- **DB**：`<XDG_DATA_HOME>/opencode/opencode.db`；schema 不匹配（`no such column|no such table|has no column named`）
  时把 db/-wal/-shm 改名隔离后重建。
- **关闭**：进程组 SIGTERM，5s（Windows 1s）后 SIGKILL；先停 opencode 再停 gateway。
- **配置变了**（模型、provider）：重建配置并重启 opencode，**先问 gateway 没有进行中的会话再动手**。
- **绑定 gateway**：opencode 健康后主进程 `POST <gw>/api/runtime/opencode-url {url, username, password}`；
  gateway 默认 `http://127.0.0.1:4096`，恢复性重拉时才用 `OPENCODE_URL` / `_USERNAME` / `_PASSWORD` 环境变量。

## 六、gateway ↔ opencode

gateway 用到的 opencode HTTP 接口：`/session`（列表带 `directory` + `roots=true`）、`/session/status`、
`/session/:id/message`、`/session/:id/prompt_async`、`/session/:id/abort`、`/fork`、`/revert`、`/children`、
`PATCH /session/:id`、`DELETE /session/:id`、`/question`、`/question/:id/reply`、`/question/:id/reject`、
`/provider`、`/config`、`/skill`，以及**一条** `GET /global/event` SSE（按 sessionID 分发）。

发消息的 body：

```jsonc
{
  "parts": [{ "type": "text", "text": "<拼好的正文>",
              "metadata": { "source_type": "Hub",
                            "hilo_working_language": { "locale": "zh-CN", "source": "ui-preference" } } }],
  "model": { "providerID": "…", "modelID": "…" },   // 只有用户明确选过模型才带
  "system": "<ASSET_AWARENESS_PRIMER>(+ 文本编辑规则)",
  "agent": "…"                                      // 同步路径不带，走 default_agent
}
```

- 同步路径 `POST /session/:id/message` 只等 10s，结果全靠 SSE；排队 / 异步走 `prompt_async`。
- **附件不变成 `file` part**，而是拼成正文前缀：`[User attached files:\n- [1] image: /abs/path …` +
  `<asset_lineage>` / `<canvas_intent>` / `<asset_entity>` / `<canvas_plugin_nodes source="hub">` 等块 `]\n<原文>`。
- 会话懒创建：UI 先拿一个 8 位 `uiSessionId`，第一条消息时才 `POST /session {title, agent: "media-agent"}`，
  回 `session_bound {ui_session_id, runtime_session_id}`；首条消息后自动改名（`PATCH`）。
- 停止：先递归 abort 子会话，再 abort 根会话。
- compaction 由 opencode 自己触发，gateway 只把状态转成 `session_compaction {status}` 并吞掉 compaction 的 part。

消费的 SSE 事件：`session.created/updated`（按 parentID 认子会话）、`message.updated`、
`message.part.updated`、`message.part.delta`、`session.idle`、`session.error`、`session.next.compaction.*`、
`question.asked/replied/rejected`。不处理 `permission.*`。

## 七、渲染层 ↔ gateway（WebSocket `/ws`）

上行帧（`type`）：`create_session {name?, model_id?, mode?}`、`list_sessions`、`switch_session {session_id}`、
`restore_session`、`focus_session`、`rename_session`、`delete_session`、`fork_session {session_id, message_id}`、
`cancel {session_id}`、`update_model {model_id: "provider/model", session_id}`、
`set_mode {mode: auto|plan|ask, session_id}`、`update_selected_media_models`、
`question_reply {id, session_id, answers: string[][]}`、`question_reject {id}`、
`tool_confirm_reply {id, decision, modified_args?}`、`loop_guard_reply {id, session_id, decision}`，以及：

```jsonc
{ "type": "message", "content": "…", "agent_type": "general", "session_id": "…", "client_message_id": "…",
  "attachments": ["工作区相对路径"], "canvas_node_attachments": [{ "path": "…", "nodeId": "…" }],
  "plugin_node_attachments": [], "text_edit_context": null, "language_detection_text": "…",
  "delivery": "normal" /* | defer_if_busy */ }
```

下行帧：`session_created`、`session_bound`、`session_list`、`session_switched {messages, runtime_session_id}`、
**`part_updated {part}`（原样透传 opencode Part）**、`part_delta {partId, delta}`、`session_idle`、
`session_error {content, error, childSessionId?}`、`question_request`、`question_resolved`、
`tool_confirm_ask {id, tool, args, paramHints}`、`tool_confirm_expired`、`loop_guard_ask`、`session_compaction`、
`message_received/accepted/failed`、`status`、`file_added`、`mode_changed`。

渲染：`text` → 正文，`reasoning` → 思考，`tool` → `{工具名, 状态, 参数, 结果, callID}`（pending 除 task 外不显示），
`task` 另起一个 sub_agent 块装子会话的 parts；`step.*` 忽略。

输入框：**模型**走 `update_model`（目录来自 `GET /api/runtime/models`）；**Agent 模式**走 `set_mode`，
不进提示词，只给工具确认用；**Skill** 只是在正文前插 `/<skill名> `，由 agent 自己调 `skill` 工具；
**画布选中**单独 `POST /api/canvas/selection {nodeIds}`。

question 是 opencode **原生** QuestionTool（`OPENCODE_ENABLE_QUESTION_TOOL=true` + agent 配置
`permission.question: "allow"`）：`question.asked` → `question_request` → 用户答 → `POST /question/:id/reply {answers}`。
计划不是 todowrite（media-agent 里 `todowrite: false`），是 `hub_plan_*` 那组 MCP 工具。

## 八、工作区身份（我们不做）

`claim` = 工作区绝对路径 sha256，`instanceId` = 每个 gateway 一个 UUID，`generation` = 递增整数；
经 header `x-hilo-workspace*` / query `hilo_workspace*` / env `HILO_WORKSPACE_*` 携带，gateway 中间件校验
（不一致 409、缺失 428）。作用是多工作区多端口时防止请求打到别的 / 旧的 gateway。
我们单工作区单 gateway，不需要；插件和 MCP 那边不发这些头即可。
