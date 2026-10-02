# Gateway 会话水合协议升级 —— 聊天历史面板空白的根因与修复方案

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
