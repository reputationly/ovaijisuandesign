# `design_execute` 任务卡片：实现状态

## 已完成

| 项 | 内容 |
|---|---|
| A. MCP 契约 | `execute` 改调 `/api/v3/execute`，透传全部入参并带 agent caller；任务列表支持 operation/source/toolUseId/limit；retry 真重提，其余 action 返回 422 |
| B. 查询/推送 | `task-query.js`、`task-push.js`、`turn-registry.jsx`，`design-chat-` 订阅、缓存失效、3s/15s 轮询 |
| C. 卡片 | `design-input.js`、`resources.js`、`execute-card.jsx`；时间线 `renderEntry` 渲染，消息列表根部挂 Provider/Push |
| 门禁登记 | 已删除 4 屏 `task_subscribe`/`task_unsubscribe` 登记；37 屏与 v3 七屏 exit 0 |

## 简化分支（与参照的已知差异）

- `DesignResult` 使用 `<img>/<video>`，未接 `ArtifactAssetCard` 的拖拽、定位、资源引用菜单；
- `DesignReferenceResult` 只有名称 chip，未做 256px 预览查询与音频 chip；
- `taskStatusText` 只覆盖基础状态，未做 `partialStopped` 子任务统计；
- 计费确认组（`ThresholdRound` / `InsufficientRound` / `DesignTurnCostConfirmations`）按范围排除；
- `useBatchMembers` / `BATCH_MEMBER_QUERY` 保留常量与失效调用，未接批量成本卡片。

## 还没做

1. **Playwright 场景**：门禁会话里没有 `design_execute` 工具消息，卡片没有被真正渲染；需要按交接文档第 4 节用假 provider + 工具消息种入，验证各状态、WS 帧、轮询间隔和重试请求。
2. 把 `readDesignJson` 三份合并成一份（G 项）。
3. 文档 `ov-changes` / `intentional-differences` 的最终口径更新。
