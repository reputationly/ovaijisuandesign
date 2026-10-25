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

## 参照 vs 我方（归档种子，已跑通）

用 `scripts/pw/design-execute-archive.mjs`：先启动一次应用建 opencode 库，归档导入一条
`design_execute` 会话，再用第二次启动打开同一会话；参照与走同一条 gateway/opencode 历史。

| 项 | 我方 | 参照 |
|---|---|---|
| `card` | 1 | 1 |
| 卡片 id | `chat-design-execute`, `chat-design-execute-toggle` | 同左，完全一致 |
| `task_subscribe` 帧 | 1 | 0（参照 `useDesignResourceScope` 的 `ready` 依赖 `auth.userID`；参照渲染层没有本地登录态，因此不发送。我方有本地固定用户，所以发送） |

产物：

- 我方：`.probe/pw/design-execute/2026-10-25T07-38-50-107Z-recovered/seeded-card.png`、
  `seeded-card-expanded.png`
- 参照：`.probe/pw/design-execute/2026-10-25T07-02-09-842Z-reference/seeded-card.png`、
  `seeded-card-expanded.png`

展开卡片两边都显示 `PW 任务卡片` + `qwen-image` + “连接暂时中断…” + 刷新；我方的 model 标签是纯文本，参照带图标。

## 四状态夹具（我方）

`node scripts/pw/design-execute-card.mjs` 会启动真实 Electron（`/tmp/ov-cmp/ws-a` 夹具），打开 workspace + hash 夹具，等待并断言：

- `[data-testid="design-execute-fixture"] [data-action-ui-id="chat-design-execute"]`
- `data-action-ui-id` 集合：`chat-design-execute`、`chat-design-execute-toggle`
- 截图：`.probe/pw/design-execute/2026-10-25T02-13-50-687Z/design-execute-card.png`

限制：这是**我方单侧**冒烟，不是交接文档要求的「参照 vs 我方 + 假 provider 四状态 + WS/轮询/retry 对比」。参照侧没有 fixture 钩子，无法用同一 hash 夹具渲染。

## 还没做

1. **完整 Playwright 场景**：需要参照侧可注入的会话消息（假 opencode/WS 或测试专用会话种子），再验证排队/进行中/成功/失败重试、WS 帧、轮询间隔和 retry 请求。
2. 把 `readDesignJson` 三份合并成一份（G 项）。
3. 文档 `ov-changes` / `intentional-differences` 的最终口径更新。


## 四状态（归档会话，参照 vs 我方）

| 状态 | 我方 | 参照 |
|---|---|---|
| queued | 生成 1 张图片（排队中） | 同左 |
| running | 生成 1 张图片（正在确认任务状态） | 同左 |
| completed | 已完成 + PW 任务卡片 + qwen-image + 连接中断 + 刷新 | 同左 |
| failed | 失败 + provider exploded + 刷新 + **重试** | 失败 + provider exploded + 刷新（**无重试**） |

差异：我方的 failed 卡片显示重试按钮；参照不显示。参照的 retry 可用性判断需要继续对齐。
我方截图目录 `.probe/pw/design-execute/2026-10-25T08-...-recovered/`，参照 `...-reference/`。
