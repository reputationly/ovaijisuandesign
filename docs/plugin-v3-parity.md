# 插件 v3（4.0.4）逐项对照

参照：`.probe/reference/4.0.4/sidecar/opencode-plugin-hilo/dist/hilo.js`（526,533 字节）。
我们的插件：`app/packages/opencode-plugin-hilo/src/`。

| 参照里的东西 | 参照位置（字节偏移） | 我们的落点 | 状态 |
|---|---|---|---|
| `isFirstPartyTool` = `hub_` 或 `design_` 前缀 | ~477,k 附近 | `src/index.ts` 的 `DESIGN_TOOL_PREFIX` + `before` 的前缀判断 | ✅ 上一轮已补，本轮核对 |
| `_tool_use_id` 注入（两族都注入） | ~516,805 | `src/index.ts` 的 `args._tool_use_id = inp.callID` | ✅ 上一轮已补，本轮核对 |
| `_tool_call_index`（`design_execute` 调用序号） | 392,291（`src/tool-call-order.ts`） | `src/tool-call-order.ts` + `before` 注入 | ✅ 本轮 |
| `CAPABILITY_SEARCH_TOOL_NAMES` `{2:"hub_capability_search",3:"design_capability_search"}` | 184,545（`../protocol/dist/capability-search.js`） | `@ov/protocol` 的 `capability-search.ts` | ✅ 本轮（导出 + 用例；我们还没有参照那套连接器准入守卫，见下） |
| `AGENT_PROFILE_VERSION_ENV` / `parseAgentProfileVersion` | 176,676（`../protocol/dist/agent-profile-env.js`） | `@ov/protocol` 的 `agent-profile-env.ts` | ✅ 本轮 |
| `GLOBAL_MEMORY_GUIDANCE` + `access:"global"`（v3 记忆只有全局一份） | 346,281 起（`src/load-memory-context.ts`） | `src/load-memory-context.ts` 的 `access` 选项 + `src/index.ts` 按 profile 版本选 | ✅ 本轮 |
| `guardConnectorTool` / `connectorAccess`（连接器准入、`pendingTarget` 强制先搜） | ~470,k 起（`src/connector-access.ts`） | 无 | ⏳ 未补：我们还没有连接器会话级准入（`/api/connectors/capability-access`）这条链；`CAPABILITY_SEARCH_TOOL_NAMES` 已就位，接的时候直接用 |
| `parseHiddenContextEnvelope` / `findEmbeddedAttachmentManifests` / `parseAttachmentManifest`（`<design_context>` 信封） | 201,116（`../protocol/dist/hidden-context.js`） | `@ov/protocol` 的 `hidden-context.ts`；`attachment-inputs.ts` 的 `userAttachmentPaths` 改用它 | ✅ 本轮（未移植 `[asset_context …]` 与 composition mention 两个分支，见下） |
| `v3ToolMaterials`（从 design_* 的输入/输出收集素材） | 476,314 起（`src/v3-attachment-fields.ts`） | 无 | ⏳ 未补：还要 gateway 的 `attachment-observations` 支持 `materials`（参照侧在同一提交里改了 gateway） |
| `design_code_project_open` 的路径守卫（`src/code-agent-guard.ts`） | 328,569 起 | 无 | ⏳ 未补 |
| `design_memory` 的 `target`/`project_rules` | 346,281 / 349,427 | `access:"global"` 的说明已覆盖 `target:'global'` 与 `project_rules` | ✅ 说明层面；工具参数由 MCP 侧 schema 决定 |

## 刻意不补（排除范围）

- 账号 / 计费 / 上报统计：`ad-attribution`、`model-trace-capture` 的 v3 分支等。
- ComfyUI 相关（`comfyUiProgress`、`hub_run_comfyui_workflow`）。
- 参照 `src/connector-access.ts` 里"连接器会话准入"整条链（上表已注明原因）。

## 未移植的分支（有依据的裁剪）

- `hidden-context` 里的 `[asset_context resourceId=…]` 与 composition mention 前缀：依赖
  `parseCompositionMentionAt`（参照 protocol 的 mention 解析），我们没有那套东西；
  这两种信封我们目前不会产生，等做 mention 时一起接。
- `connector-access`（连接器会话准入）：见上表，`CAPABILITY_SEARCH_TOOL_NAMES` 已就位。
