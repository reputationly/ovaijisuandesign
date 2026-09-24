# 官方 mcp-tools 的架构与路由映射

官方 MiniMax Design **3.0.16** 的 MCP server（`Resources/mcp-tools/dist/main.js`，未压缩）
怎么组织、每个工具调 gateway 的哪条路由。我们的 MCP server 按这个重写
（TypeScript + Node，同名同参、调同样的路由），gateway 补齐这些路由。

> 只记接口事实。工具名与入参见 [`mcp-tools.md`](mcp-tools.md)，路由全集见
> [`gateway-api.md`](gateway-api.md)，插件注入的 `_session_id` 等见 [`plugin-hilo.md`](plugin-hilo.md)。

## 一、架构

**启动**：读 `GATEWAY_URL`（默认 `http://localhost:8001`）、`HILO_RELEASE_REGION`（默认 `domestic`，影响枚举和描述）
→ 配置全局 undici dispatcher → `new McpServer({name: "hub", version: "1.0.0"}, {capabilities: {tools: {}}})`
→ `GET /api/health/live` 探活（3s 超时，最多 5 次，间隔 1s，全失败 `exit(1)`）→ 注册全部工具
→ `POST /api/internal/tool-metas`（不等结果）→ stdio 连接。
只有 tools 能力：没有 resources / prompts / progress / logging 通知。

**依赖**（全部打进 bundle，package.json 无 dependencies）：`@modelcontextprotocol/sdk@1.30.0`、
`zod@3.25.76`、`zod-to-json-schema`、`ajv`、`undici@7`、`proper-lockfile`、`js-yaml`。

**网络**：headers / body 超时 310 分钟，连接 5s（`HILO_CONNECT_TIMEOUT_MS`）；认 `HTTP(S)_PROXY`，
强制 `127.0.0.1,localhost,[::1]` 进 NO_PROXY。

**注册器**（包一层 `server.registerTool`）：
- 从 config 剥掉私有字段收集起来：`confirmable`、`confirmationMode`、`paramHints`、`vendorParamHints`、
  `attachmentInputPaths`、`attachmentOutputPaths`；
- `inputSchema` 统一包成 `z.object(shape).passthrough()` —— 插件注入的 `_xxx` 参数不会被校验拒掉；
- handler 先 **pop** `_session_id`、`_chat_turn_id`（32 位 hex）、`_tool_use_id`、`_group_id`、
  `_group_scope`（legacy / unresolved）、`_user_override_note`，放进 `AsyncLocalStorage` 会话上下文；
- 有 `_user_override_note` 时在结果 content 末尾追加 `[User Override] …`；
- stderr 记 `[chat-turn] stage=mcp_started|mcp_finished`。

**GatewayClient**：
- 头：`Content-Type: application/json` + 按上下文 `x-session-id`、`x-tool-use-id`、`x-agent-run-id`、
  `x-chat-turn-id`、`x-group-id`（还有 `x-hilo-workspace*` 身份头，我们不做）。
- `get`：网络错 → `Gateway network error (GET …)`；非 2xx → `Gateway <status>: <body>`；成功 zod 校验。
- `post`：stderr 记 `[hilo-tools] POST <url> body=<JSON>`；失败拼 `{ok: false, error, error_code, cloud_status,
  failure_presentation}`（408/5xx → `status_unknown`，其余 `terminal`；消息取 body 的
  `user_message` > `message` > `error`，码取 `code` > `error_code` > `gateway_http_<status>`），
  响应 schema 接受这个形状就当正常返回，否则抛错。
- 普通调用不重试，只有探活和生成轮询重试。

**长任务（生成）**：没有 SSE、没有 progress。
1. 计费范围：上下文里没有 `_group_id` 也不是 `_group_scope=legacy` 时，查 `request-group` / `billing-current-scope`，
   仍定不了就报 `REQUEST_GROUP_UNAVAILABLE`。**我们让 gateway 固定回 legacy。**
2. `POST /api/generate/{image|video|speech|music}/submit`（30 分钟超时，不重试）→
   `{ok: true, task_id, status: "processing", media_type, cloud_status_polling?}`。
3. 轮询 `GET /api/generate/tasks/:task_id/query`：单次 30s，总 300 分钟；间隔 1s 起 ×1.6、封顶 15s、±20% 抖动
   （响应带 `cloud_status_polling {fixedIntervalMs, fixedWindowMs}` 时窗口期内固定间隔）；网络错 / 5xx / 408 / 429
   重置间隔继续；`processing` 但 task_id 变了就换新 id；`succeeded` 解析 `result`；`failed` → `terminal`。
4. 失败带 `error_code`（`billing_insufficient_balance` / `backend_error` / `client_error` / `timeout` / `network_error`）、
   `failure_presentation`（`terminal` / `recoverable` / `status_unknown`）、`recovery_handle`（task_id）、`user_message`。

**结果形状**：成功 `{structuredContent: obj, content: [{type: "text", text: JSON.stringify(obj)}]}`；失败
`{isError: true, content: [{type: "text", text: "Error: …"}]}`。生成类失败里 `recoverable` / `status_unknown`
额外加 `do_not_resubmit: true` 且 **`isError: false`**，只有 `terminal` 是 `isError: true`。不用 resource_link / image content，
一律回本地路径字符串。

**画布落位**：**MCP 不落位**。生成结果里的 `node_id` 是 gateway 在任务完成时自动建节点后回填的。MCP 只透传影响落位的参数
（`params.order`、`source_node_id`、ffmpeg 的 `replace_node_id`、`source_tool: "hub_generate_image:<vendor>"`）。
只有 `canvas_write_node` 的 media 分支和 `web_media` 的直链图片分支显式建节点。

**进程内本地操作**：ffprobe（`FFPROBE_PATH`：`audio_meta`、analyse_media 的 metadata 模式、宽高比证据校验）；
**ffmpeg 不在 MCP 里跑**（在 gateway 的 `/api/edit/ffmpeg`），MCP 只改写参数（CJK drawtext 注入
`fontfile=$HILO_BUNDLED_CJK_FONT_PATH`、检查 fontfile 存在、转义、音频保留）。
文件系统：plan 在 `<projectRoot>/.hilo/plan/<id>.json`（proper-lockfile + 写临时文件再 rename）；
memory 在 `<projectRoot>/.hilo/memory/*.md` 和 `~/.hub/memory`（`HUB_MEMORY_DIR`），维护 `MEMORY.md` 索引；
`search_knowledge` / `read` 读 `HILO_KNOWLEDGE_DIR` / `HILO_WORKFLOWS_DIR`；`subtitle_format` 读写字幕；
`browser` 截图写 `cwd/browser-screenshots/`。**不跑 Python，不绕过 gateway 直连云端。**

## 二、逐工具

"生成四件套" = `[GET …/:sid/selected-models]` + `POST /api/generate/<type>/submit` + `GET /api/generate/tasks/:task_id/query`。

| 工具 | gateway 路由 | 进程内 |
|---|---|---|
| canvas_list_nodes | GET /api/canvas/nodes | |
| canvas_get_node | POST /api/canvas/nodes/detail | 3s TTL 缓存；长文本截成 preview + outline |
| canvas_grep_text | POST /api/canvas/nodes/detail | MCP 内 grep |
| canvas_read_text | POST /api/canvas/nodes/detail | MCP 内切行窗口 |
| canvas_apply_text_edits | detail → POST /api/safety/check-text → POST /api/canvas/text-node/apply-edits | 本地预演 edits；安全检查 fail-open |
| canvas_write_node | text：[detail] + check-text + POST /api/canvas/text-node（按 2800 字分块）；table：POST /api/canvas/table-node；media：[POST /api/files/import-url] + POST /api/canvas/media-node | 拒绝 Stage Plan 内容；支持 items[] |
| canvas_group_nodes | POST /api/canvas/group | 固定 layout=grid |
| canvas_group_recent_outputs | POST /api/canvas/group-recent-outputs | |
| canvas_ungroup_node | POST /api/canvas/ungroup | |
| plan_write / replan / patch_stage / update_stage_state | POST /api/plan/notify-changed（不等结果） | 加锁读写 plan JSON |
| plan_get_work_items / get_stage_status | — | 读 plan JSON |
| plan_get_stage_detail | GET /api/assets?include=metadata | 读 plan JSON |
| generate_image | 生成四件套（count>1 时每批 10 并发） | 宽高比证据 ffprobe |
| generate_video | 生成四件套 | 参考素材时长 ffprobe |
| generate_audio_speech | 生成四件套 + [GET /api/speech/voices?page_size=1000，缓存 1h]；多段并发 | |
| generate_audio_music | 生成四件套 | |
| list_capabilities | GET /api/models?agent_version=2 + [selected-models] + GET /api/v1/models/concurrency/limits | 静态 manifest ∩ 目录 |
| get_model_concurrency | GET /api/v1/models/concurrency/limits + POST /api/v1/models/concurrency/usage | |
| audio_meta | — | ffprobe |
| ffmpeg | POST /api/edit/ffmpeg | 参数改写与检查 |
| merge_videos | POST /api/edit/concatenate-videos | |
| image_remove_background | POST /api/edit/remove-background | |
| media_transcribe | lyrics：POST /api/edit/asr；subtitle：POST /api/edit/asr-mediakit（language=other 走 /api/edit/asr-whisper） | 写 `<audio>_lyrics.txt` |
| voice_prepare | GET /api/speech/voices；POST /api/speech/voice_clone；POST /api/speech/voice_design | 按语言 / 性别过滤 |
| analyse_media | GET /api/assets?include=metadata、GET /api/asset-center/lookup-attachment、POST /api/edit/analyze-media、PATCH /api/assets/:id/metadata、PATCH /api/asset-center/attachments/:aid/prompt | metadata 模式 ffprobe |
| select_image_recipe | POST /api/edit/generate-text-messages | 检查 recipe 文件存在 |
| image_search | POST /api/search/images | |
| web_media | POST /api/web-media/yt-dlp；直链图片走 import-url + media-node | |
| asset_center_search | GET /api/asset-center/search | |
| asset_center_use_entity | POST /api/asset-center/entities/:eid/materialize | |
| memory | 仅 write：POST /api/feedback-extractor/notify-manual-write（不等结果） | 读写记忆文件 + 索引，文件锁 |
| search_knowledge | — | 遍历 knowledge / workflows |
| report_outcome | — | 只写 stderr `[hub-outcome]` |
| read | 仅 .docx/.pdf：GET /api/internal/document/read | 本地读；认 `<knowledgeDir>` / `<workflowsDir>` 逻辑路径；拒绝媒体文件 |
| subtitle_format | — | SRT → ASS / SRT / VTT |
| browser | POST /api/browser/automation | 截图落盘 |
| connector_authorize | POST /api/connectors/prepare | |
| plugin_agent_open_editor / describe / invoke | POST /api/plugins/agent/open-editor、GET /api/plugins/agent/surface、POST /api/plugins/agent/invoke | |
| ComfyUI 10 个 | /api/comfyui/*、/api/internal/sessions/:sid/{run,edit,save,save-run}-comfyui-*、…/comfyui-runs/:batchId/status、…/open-comfyui | 7 个**必须有 `_session_id`** |

## 三、gateway 要提供的路由（65 条，已有 15 条）

分组见上表。按"让主链路跑起来"的顺序，第一批是：
`/api/health/live`、`/api/internal/tool-metas`、`/api/internal/sessions/:sid/{request-group,selected-models}`、
`/api/internal/sessions/billing-current-scope`、`/api/internal/sessions/request-group-diagnostic`、
生成四条 + 查询、`/api/models`、`/api/v1/models/concurrency/limits`、画布那组（含
`/api/canvas/text-node/apply-edits`、`/api/canvas/group-recent-outputs`、`/api/safety/check-text`）、
`/api/plan/notify-changed`、`/api/feedback-extractor/notify-manual-write`、`/api/files/import-url`、`/api/assets`。

## 四、依赖插件注入参数的行为

- 所有 gateway 请求带 `x-session-id` / `x-tool-use-id` / `x-chat-turn-id` / `x-group-id` —— gateway 用它们把
  中止限定到会话、把生成任务和工具调用对上。
- 模型守卫：有 sessionId 时查 `…/:sid/selected-models`，过滤掉用户没勾选的模型。
- ComfyUI 7 个工具没有 `_session_id` 直接报 `No session context; do not retry`。
- 回传给 gateway 的只有两种不等结果的通知：memory 写入、plan 变更。**没有异步完成回调** ——
  生成在 MCP 进程内同步轮询到结束，节点和完成事件由 gateway 自己广播。
- `projectRoot`：plan 工具以它为根定位 `.hilo/plan/`（缺省 `cwd`），memory 用它定 project 作用域。
