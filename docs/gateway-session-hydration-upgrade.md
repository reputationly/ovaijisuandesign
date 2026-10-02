# Gateway 会话水合协议升级 —— 聊天历史面板空白（已修复）

> **状态：已修复（2026-10-02，commit 6f5c1d4 / 8814063）。**
> 真正的根因比本文档初稿的判断更具体：不是"多帧 vs 单帧"，而是**消息内容的形状**。
> 见下方「最终根因」。

## 最终根因（已实测确认）

渲染器（官方 app.asar `out/renderer/assets/index-ZNI5SgRm.js`）的
`ChatController.applyServerMessage` 里 `session_switched` 分支：

```js
const rawMsgs = [...this.store.projectMessages(
  effect2.sessionId, backendMessagesToChat(effect2.messages ?? []))];
```

而 `backendMessagesToChat(msgs)`（同文件 ~342221）是一个 **switch 分派**，
只认这些 `type`：`text` / `thinking` / `tool_call` / `tool_result` /
`sub_agent_start` / `sub_agent_text` / `sub_agent_thinking` /
`sub_agent_tool_call` / `sub_agent_tool_result` / `sub_agent_end` /
`file_added` / `error`（+ `done` 跳过）。

我们的旧 `switch_session` 把 opencode 原始 `{info, parts}` 直接塞进
`messages` —— **每条都落进 default，`result` 始终为空数组**。所以渲染器
永远装进一份空历史：`history-store-applied {beforeCount:0, afterCount:0,
sourcePartCount:0}`。这解释了为什么三层后端直查全健康、而渲染器就是 0 条。

修法：在 **gateway 侧**把原始消息压平成上面这套帧 —— 复刻官方
`convertOpenCodeMessages`（`reference/3.0.21/gateway/dist/main.js` ~264710）。

第二处（次要但同样必须）：渲染器只在 `session_switched` 帧的 `request_id`
能被 `authoritativeHydrationRequestIdsRef` 消费掉时，才把
`replaceSessionSnapshot` 置为 true 去**替换** store：

```js
const replaceSessionSnapshot = focusSafeMsg.type === "session_switched" && Boolean(
  focusSafeMsg.request_id && authoritativeHydrationRequestIdsRef.current.delete(focusSafeMsg.request_id));
```

渲染器发 `switch_session` 时把自造的 `request_id` 加进那个集合（~431386），
所以 gateway **必须原样回带 `request_id`**，并带 `activated`（焦点归属；
不是 `false` 时渲染器才清 loading 并 `switchSession`）。我们的旧实现带了
`request_id`，但 messages 形状不对，所以照样 0 条。

## 修复落地

- 新增 `app/gateway/src/chat/history-normalize.ts`：复刻 `convertOpenCodeMessages`
  + `collectTaskChildSessionIds` / `buildTaskInvocationWindows` /
  `selectChildMessagesForTask` / `expandChildMessages`（task 子 agent 展开）
  + `parseAttachmentPrefix`（附件清单 → serve URL）。
  工具 status **原样透传**（渲染器自己 `mapToolStatus`，不能预先改写）。
- `app/gateway/src/chat/chat.service.ts`：`switch_session` 改为
  `emitHydration()` —— 拉根会话 + 递归拉 task 子会话 → 压平 → 发
  `session_switched { session_id, request_id, activated:true, history_sync_id,
  messages, agent_running, runtime_session_id, name, model_id,
  selected_media_models }`；失败时带 `history_load_failed: true`。
- 测试：`history-normalize.test.ts` 13 条锁帧形状；`chat.e2e.test.ts` 断言对齐。
  全量 360 条通过。

## 验证（2026-10-02 19:55 重启实测）

重启后**开机自动恢复**（`/tmp/ov-dev.log` 第 760-762 行，7:55 PM，无人工点击）：

```
[runtime-bind] seed sid=ses_f03c20ff0ffesjcDQrL6fJ3b4v runtime=... src=session_switched running=0
[chat-diag] stage=history-controller-input outcome=install-if-empty-requested count=19
[chat-diag] stage=history-store-applied outcome=initial-history-installed
            beforeCount=0  afterCount=19  sourcePartCount=19   ← 修复前恒为 0
```

另有 4 条会话在开机时以 `initial-history-installed beforeCount=0` 装上
19 / 18 / 4 / 3 条。WS 直连实测（带身份三件套）：KOC 会话 19 条原始消息 →
66 帧；带 8 个子会话的会话 66 条原始消息 → 753 帧。

---

以下为初稿的排查记录（根因定位过程仍有参考价值）。

## 症状（2026-10-02 实测）

- 应用**重启后**打开任意历史会话，右侧聊天面板空白（全部 0 条）。
- 渲染器诊断链（`/tmp/ov-dev.log` chat-diag）：
  `operation-ws-send (switch_session) → renderer-ws-received (count=0) →
  history-controller-input (count=0) → history-store-applied (afterCount=0, sourcePartCount=0)`。
  点击 4 个不同会话、重复切换，全部 count=0。
- 会话列表、画布、生成流程均正常；仅聊天历史不显示。
- 同一天早些时候（单工作区、未重启的场景）历史显示正常。

## 已排除（三层后端全部实测健康）

1. **opencode HTTP API**：`GET /session/:id/message` 直接调用返回完整历史
   （ses_f03c20ff → 19 条、ses_f03f84f32 → 4 条）；`directory` 参数**不影响**
   消息查询结果（三种目录都返回同样数据）。
2. **两个工作区 gateway 的 WS 回路**：用进程环境里的身份三件套直连
   `ws://127.0.0.1:<port>/ws` 发 `switch_session`，
   KOC gateway 返回 19 条、使用上传参考图 gateway 返回 4 条。
3. **serve 预热**：进程出现后 t≈2.7s 数据可见，无长预热窗口。

已提交的防御性修复（保留）：`historyWithRetry`（app/gateway/src/chat/chat.service.ts，
commit 6bbb9b8）——对「未连接 / 5xx / 200+空数组」三类启动竞态做有界重试。
但它们只覆盖了网关侧竞态，**没解决主症状**。

## 根因：我们的 gateway 是 3.0.16 口径，渲染器是 3.0.21 的水合协议

官方 3.0.21 gateway（`reference/3.0.21/gateway/dist/main.js`）的
`switch_session`（bundle 位置 ~line 15591069）：

```js
case "switch_session": {
  const shouldActivate = data2.activate !== false;
  const focusIntentGeneration = shouldActivate
    ? this.sessionService.beginFocusIntent(client2) : void 0;
  const result = await this.sessionService.hydrateSession(
    client2, data2.session_id, data2.origin, data2.mode);
  await this.applySwitchResult(client2, result, { requestId, focusIntentGeneration });
}
```

`applySwitchResult`（同 bundle，搜 `async applySwitchResult`）的完整语义：

1. `seedLivenessSnapshot()` + `resumeLiveTurnOnReconnect(runtimeSessionId)` +
   `getRuntimeSessionRunningSnapshot`（恢复运行态/忙碌快照）；
2. `ensureSession(session, snapshotBuffer.send)` —— **快照缓冲流式下发**挂起的
   交互（question 卡等）；
3. `reconcilePendingInteractions` + pendingReasons + loopGuard /
   toolConfirm 结算记录；
4. `commitFocusIntent(client, focusIntentGeneration, uiSessionId)`（激活语义）；
5. **历史下发：`if ("responses" in result) for (const msg of result.responses)
   sendJson(client2, finalizeSessionSwitchResponse(msg, …))`** —— 历史以
   **多帧 responses** 下发（每帧经 finalizeSessionSwitchResponse 处理），
   不是我们现在的单帧 `session_switched {messages}`。

我们的 gateway（app/gateway/src/chat/chat.service.ts `switch_session`）：
单帧回复 `{type:"session_switched", messages}`，3.0.16 口径。3.0.21 渲染器的
历史控制器按水合协议解析（`restored()` 里读取 `message2.history_sync_id`、
responses 帧序列），对单帧旧形状要么解析为 0 条、要么被状态机丢弃。

## 修复方案

把 `chat.service.ts` 的 `switch_session` 升级为 3.0.21 水合协议：

1. 从 `reference/3.0.21/gateway/dist/main.js` 提取
   `SessionService.hydrateSession` 与 `applySwitchResult` 的完整逻辑
   （包括 `finalizeSessionSwitchResponse` 的帧整形、`history_sync_id`
   的生成与回传、focus intent 的 3 帧 RTL：begin → commit → activated）。
2. 在我们 gateway 复刻下发序列（保持我们已有的 runtime client/过滤逻辑）：
   - `session_switched` responses 多帧（含每帧的 history_sync_id）；
   - `session_bound`（ui_session_id ↔ runtime_session_id）；
   - 待交互快照（挂起的 question 卡）按需流式下发。
3. 渲染器逐帧对齐点：`restored()` 消费 `message2.messages` /
   `message2.history_sync_id` / `message2.runtime_session_id` ——
   帧字段名与分帧方式以官方 `finalizeSessionSwitchResponse` 为准。
4. 回归验证：重启应用 → 开机自动恢复的会话历史 > 0；跨项目切换会话历史 > 0；
   `history-store-applied` 的 afterCount 与 opencode API 直查数量一致。

## 相关已知差异（同一升级工程的范围）

- `beginFocusIntent / commitFocusIntent / activated` 激活语义（多标签页/
  多客户端抢占焦点）。
- `reconcilePendingInteractions`（question 卡在切换后恢复）。
- `session_error` / `user_message_id` 等事件帧的字段对齐。
