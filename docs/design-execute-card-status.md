# `design_execute` 任务卡片：实现状态

## 已完成

| 项 | 内容 |
|---|---|
| A. MCP 契约 | `execute` 改调 `/api/v3/execute`，透传全部入参并带 agent caller；任务列表支持 operation/source/toolUseId/limit；retry 真重提，其余 action 返回 422 |
| B. 查询/推送 | `task-query.js`、`task-push.js`、`turn-registry.jsx`，`design-chat-` 订阅、缓存失效、3s/15s 轮询 |
| C. 卡片 | `design-input.js`、`resources.js`、`execute-card.jsx`；时间线 `renderEntry` 渲染，消息列表根部挂 Provider/Push |
| 门禁登记 | 已删除 4 屏 `task_subscribe`/`task_unsubscribe` 登记；37 屏连续 2 次 exit 0，v3 七屏 exit 0 |

## 简化分支（与参照的已知差异）

- `DesignResult` 使用 `<img>/<video>`，未接 `ArtifactAssetCard` 的拖拽、定位、资源引用菜单；
- `DesignReferenceResult` 只有名称 chip，未做 256px 预览查询与音频 chip；
- `taskStatusText` 只覆盖基础状态，未做 `partialStopped` 子任务统计；
- 计费确认组（`ThresholdRound` / `InsufficientRound` / `DesignTurnCostConfirmations`）按范围排除；
- `useBatchMembers` / `BATCH_MEMBER_QUERY` 保留常量与失效调用，未接批量成本卡片。

## Playwright 冒烟（已跑通）

`node scripts/pw/design-execute-card.mjs` 会启动真实 Electron（`/tmp/ov-cmp/ws-a` 夹具），打开 workspace + hash 夹具，等待并断言：

- `[data-testid="design-execute-fixture"] [data-action-ui-id="chat-design-execute"]`
- `data-action-ui-id` 集合：`chat-design-execute`、`chat-design-execute-toggle`
- 截图：`.probe/pw/design-execute/2026-10-25T02-13-50-687Z/design-execute-card.png`

限制：这是**我方单侧**冒烟，不是交接文档要求的「参照 vs 我方 + 假 provider 四状态 + WS/轮询/retry 对比」。参照侧没有 fixture 钩子，无法用同一 hash 夹具渲染。

## 还没做

1. **完整 Playwright 场景**：需要参照侧可注入的会话消息（假 opencode/WS 或测试专用会话种子），再验证排队/进行中/成功/失败重试、WS 帧、轮询间隔和 retry 请求。
2. 把 `readDesignJson` 三份合并成一份（G 项）。
3. 文档 `ov-changes` / `intentional-differences` 的最终口径更新。
