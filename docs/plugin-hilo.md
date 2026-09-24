# opencode 插件接口面（plugin-hilo / session-header / trace）

官方 MiniMax Design **3.0.16** 给 opencode 挂的插件做了什么、依赖什么。
我们要写**自己的** opencode 插件复现必要的那部分 —— 不带他们的文件。

> 只记接口事实（钩子、环境变量、路由、注入块的结构与标签名），不含原文。
> 行号指 `Resources/opencode-plugin-hilo/dist/hilo.js`，它是未压缩 ESM。

## 总览

- `hilo.js` 是**一个** default export 插件（L8947），启动时没有 `GATEWAY_URL` 直接 throw。
- 注册 10 个钩子：`chat.headers`、`chat.params`、`experimental.chat.system.transform`、
  `experimental.chat.messages.transform`、`chat.message`、`tool.execute.before`、
  `tool.execute.after`、`shell.env`、`tool.definition`、`dispose`。
  **没有**自定义 `tool`、`permission.ask`、`event`、`experimental.session.compacting`。
- `.d.ts` 里列着的 `available-models-prompt`、`permission-log`、`permission-mutator`、
  `session-fetch`、`sub-agent-skill-loader` 在 bundle 里**没有对应代码**，是旧版残留 ——
  3.0.16 不注入 `<available_models>`，也不按 UI 选择推 deny 规则。
- `<canvas_plugin_nodes source="hub">` **不是插件注入的**，是 gateway 拼进用户消息的
  （gateway main.js:302222）。
- agent-profiles 的 `base.json` 还额外加载 `plugins/session-header.ts`（第二个插件，见文末）。

## 按模块

标注：**MUST** = agent-profiles 的提示词 / 契约直接依赖，缺了行为会错；
**SHOULD** = 有用、成本低；**SKIP** = 账号 / 计费 / 遥测 / 云端。

| 模块 | 钩子 | 做什么 | 依赖 | 我们 |
|---|---|---|---|---|
| hubRoot / skill 目录 | — | `~/.hub`（按 `HILO_RELEASE_*` 或 `NODE_ENV` 变体）；skill 目录 `~/Movies/Hub/skills` → `HUB_SKILLS_DIR`\|`<hub>/skills` → `EXTRA_SKILLS_DIRS`；SKILL.md frontmatter 的 `allowed-tools`/`tools`、`allowed-tools-<agent>` | 文件 | MUST（基础设施）。注意 `NODE_ENV` 不是 production 会去读 `~/.hub-dev` |
| working-language | `chat.message` 记录；`system.transform` 注入 | 从用户 text part 的 `metadata.hilo_working_language = {locale, source}` 取语言（source ∈ explicit / current-message / ui-preference / session / region），子会话回落到 root 会话；拼到 `output.system` **最后一个元素末尾**一个 `<working-language>` 块（`working_language:` / `source:` 两行 + 约 7 条语言规则） | 发消息方要带 metadata | **MUST** —— `contracts/baseline.md` 等 23 个文件引用 "the injected `working_language`" |
| loop-guard | `tool.execute.before` 判定、`after` 记录、`chat.message` 重置 | 指纹（去 `hub_` 前缀后按工具类取关键字段：视频取 model/时长 3s 分桶/比例/分辨率/首尾帧/参考集 hash/prompt 前 32 字；read 取 path；task 取 subagent_type+描述 hash；其余整 args sha1）。最近 5 次里同指纹已 ≥2 次则触发。`LOOP_GUARD_MODE=block` 直接拒；默认 `ask` 走 gateway | ask 模式：`POST /api/internal/sessions/:sid/loop-guard/ask` → `{decision: allow_once\|allow_session\|reject}`，失败对账 `GET …/loop-guard/settlements/:requestId` | **MUST** —— `contracts/anti-loop.md` 写明 "same fingerprint 3 times in any 5 tool calls" 和对 "LoopGuard blocked" 的应对。先用 block 模式，不需要 gateway |
| hub_* 参数注入 | `tool.execute.before` | `hub_plan_*` 强制 `projectRoot = cwd`；`hub_memory` 缺省补 `projectRoot`；写 `_session_id`、`_tool_use_id`、`_chat_turn_id`；`_group_id`/`_group_scope` | — | **MUST**（`_session_id`、`projectRoot`：MCP 是独立 stdio 进程，异步结果要靠它路由回会话）；`_tool_use_id` SHOULD；`_group_*` SKIP |
| task 守卫 | `tool.execute.before` | task 的 prompt 以 `/` 开头且 subagent_type 为 general/空 → throw "not a recognized slash command or skill" | — | SHOULD |
| skill 授权 | `tool.execute.before`（tool=skill）、`chat.params` | 读 SKILL.md 的工具声明，按 root 会话 + agent 记授权（只记 `hub_*`；`tools` 默认记在 media-agent 名下），立即 push 进 `agent.permission`；之后每轮 `chat.params` 重放 | root 解析 `GET /api/internal/sessions/:sid/root` → `{rootSessionId}`（2s 超时，失败退回自身）；`POST /api/skills/upload-check` | SHOULD。root 解析可改用插件 input 里的 `client.session.get` 沿 `parentID` 走；upload-check SKIP |
| compaction 续写语言 | `experimental.chat.messages.transform` | synthetic 用户 part 含 "Continue if you have next steps" / "exceeded the provider's size limit" 且没有 `[language]` 标记时，追加一句 `[language] …` 语言指令 | — | SHOULD，防 compaction 后改说英文 |
| memory 上下文 | `system.transform` | 读 `<cwd>/.hilo/memory/*.md` 和 `HUB_MEMORY_DIR`\|`<hub>/memory/*.md`（跳过 MEMORY.md；frontmatter 需 name/description/type，type ∈ user/feedback/project/reference/media-style/asset-pin）；用户记忆开关看 `.hilo/storage.json` 的 `preferences.loadUserMemory` 或 `HILO_LOAD_USER_MEMORY`。按 mtime 倒序、4096 字节预算，注入 `# Memory Context`（项目 / 用户两节 + 使用规则 + `hub_memory` 用法） | 只读本地文件 | SHOULD。我们的 `hub_memory` 要沿用同一目录约定 |
| model-safety | `system.transform` | 固定追加 `<user_visible_model_safety>`：对用户只说 `hub_list_capabilities` 的 `user_visible_models` 里的精确 display_name，不暴露厂商/模型 ID | — | SHOULD。我们的 `list_capabilities` 要返回 `user_visible_models` |
| question 系列 | `tool.definition`、`tool.execute.before`（tool=question） | 给 question 描述追加"`questions` 必须是真 JSON 数组"；选项 label 以（推荐）/(recommended) 结尾的挪到最前；问"选哪个模型"时校验每个选项是可用模型的精确 display_name（或唯一别名、或"自动"类通用项），不满足就 throw 并列出可选名 | `GET /api/models` → `{imageModels, videoModels, audioModels}`，每项 `{id, type, display_name, description, tool_names[], visibility, icon_url, series_id, hot}` | SHOULD |
| browser-skill-gate | before / after | 调 `hub_browser` 前必须先加载过 `control-in-app-browser` skill | — | 等做了 `browser` 再说 |
| tool-confirm | `tool.execute.before` | 每个 `hub_*` 调用前 `POST /api/internal/sessions/:sid/tool-confirm/ask` `{tool, args, timeout_ms}` → `{decision: confirm\|reject, reject_reason?, modified_args?}`；gateway 出错时**生成类一律 reject** | gateway | SHOULD。**若沿用这段逻辑，路由绝不能 404**，否则所有生成被拒；不做确认就回 `{decision:"confirm"}` |
| maxOutputTokens | `chat.params` | provider 为 `user-custom-*` 时 `maxOutputTokens = model.limit.output` | — | SHOULD，换成我们的 providerID |
| shell.env | `shell.env` | 仅 Windows：`LANG`/`LC_ALL=C.UTF-8`、`PYTHONIOENCODING=utf-8`、`PYTHONUTF8=1` | — | SHOULD |
| request-group | `chat.headers` | 计费 Group：`GET …/:sid/request-group` → 头 `X-Group-Id`、`X-Chat-Turn-Id`、`X-Hilo-Attachment-Refs`；解析失败 fail-closed | gateway | SKIP |
| attachment-inputs | message / before / after | 收集附件路径，`POST …/attachment-observations` 上云 | 云端 | SKIP |
| model-trace-capture | `chat.headers` + 替换 `fetch` | 反馈关联云端 trace，`POST /api/chat/model-traces` | 云端 | SKIP |
| gateway-identity | — | 给插件发往 gateway 的请求加 `x-hilo-workspace*` 头（读 `HILO_WORKSPACE_CLAIM` / `_INSTANCE_ID` / `_GENERATION`） | — | SKIP（本地 gateway 不做多工作区鉴权） |
| mcp-tool-call 上报 | after | `POST …/mcp-tool-call` 诊断 | — | SKIP |

## session-header.ts（agent-profiles 自带，`base.json` 的 `plugin` 会加载）

- `chat.message` 记录用户 text part 的 `metadata.source_type`。
- `chat.headers`：`X-OpenCode-Session-Id`、`X-Source-Type`（每条用户消息一次）、`X-Agent-Type`；
  有 `GATEWAY_URL` 或 `HILO_MANAGED_RUNTIME=1` 时 `GET /api/internal/sessions/:sid/request-group`
  （无 sid 时 `GET /api/internal/sessions/billing-current-scope`）：canonical → 加 `X-Group-Id`；
  legacy → 放行；其他 → throw `REQUEST_GROUP_REQUIRED`。
- **MUST 处理**：只要沿用 agent-profiles 就一定会加载。二选一：gateway 这两条固定回
  `{"mode":"legacy","group_id":null}`，或者在我们的配置里去掉这个插件。

## opencode-plugin-trace

纯调试，`LOG_OPENCODE_TRACE=1` 才启用；替换 `fetch`，只记他们云网关前缀的请求，写
`<cwd>/logs/opencode-trace-YYYY-MM-DD.jsonl`。运行时 import `@hilo/protocol` 但没带
node_modules，很可能根本加载不起来。**SKIP**；要抓包在自己插件里加同类开关。

## 插件调用的 gateway 路由

| 路由 | 方法 | 调用方 | 我们 |
|---|---|---|---|
| `/api/internal/sessions/:sid/root` | GET | skill 授权、working-language、browser-gate | 可选（插件可自己沿 parentID 走） |
| `/api/internal/sessions/:sid/request-group` | GET | hilo、session-header | 固定回 legacy |
| `/api/internal/sessions/billing-current-scope` | GET | session-header | 固定回 legacy |
| `/api/internal/sessions/:sid/loop-guard/ask` | POST | loop-guard | 可选（block 模式不需要） |
| `/api/internal/sessions/:sid/loop-guard/settlements/:requestId` | GET | loop-guard | 随上一条 |
| `/api/internal/sessions/:sid/tool-confirm/ask` | POST | tool-confirm | 至少回 confirm |
| `/api/models` | GET | question 模型校验 | SHOULD |
| `/api/internal/sessions/:sid/loop-guard-trip` | POST | loop-guard 指标 | SKIP |
| `/api/internal/sessions/:sid/mcp-tool-call` | POST | 诊断 | SKIP |
| `/api/internal/sessions/:sid/attachment-observations` | POST | 附件上云 | SKIP |
| `/api/skills/upload-check` | POST | skill 上传云端 | SKIP |
| `/api/chat/model-traces` | POST | trace 关联 | SKIP |
