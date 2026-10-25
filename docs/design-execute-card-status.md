# `design_execute` 任务卡片：实现状态

## 已完成

| 项 | 内容 |
|---|---|
| A. MCP 契约 | `execute` 改调 `/api/v3/execute`，透传全部入参并带 agent caller；任务列表支持 operation/source/toolUseId/limit；retry 真重提，其余 action 返回 422 |
| B. 查询/推送 | `task-query.js`、`task-push.js`、`turn-registry.jsx`，`design-chat-` 订阅、缓存失效、3s/15s 轮询 |
| C. 卡片 | `design-input.js`、`resources.js`、`execute-card.jsx`；时间线 `renderEntry` 渲染，消息列表根部挂 Provider/Push |
| 门禁登记 | 已删除 4 屏 `task_subscribe`/`task_unsubscribe` 登记；37 屏连续 2 次 exit 0，v3 七屏 exit 0 |

## 参照 vs 我方（归档种子，已跑通）

用 `scripts/pw/design-execute-archive.mjs`：先启动一次应用建 opencode 库，归档导入一条
`design_execute` 会话，再用第二次启动打开同一会话；参照与走同一条 gateway/opencode 历史。

| 项 | 我方 | 参照 |
|---|---|---|
| `card` | 1 | 1 |
| 卡片 id | `chat-design-execute`, `chat-design-execute-toggle` | 同左，完全一致 |
| `task_subscribe` 帧 | 1 | 0（参照 `useDesignResourceScope` 的 `ready` 依赖 `auth.userID`；参照渲染层没有本地登录态，因此不发送。我方有本地固定用户，所以发送） |

产物：

- 我方：`.probe/pw/design-execute/2026-10-25T09-49-35-823Z-recovered/`（四状态）
- 参照：`.probe/pw/design-execute/2026-10-25T09-39-16-573Z-reference/`（四状态）
- 会话标题灰色胶囊：我方有、参照无；截图前已移开鼠标并 blur，仍存在，判断是聊天面板标题既有样式，待确认是否 4.0.3 就有。

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
| failed | 失败 + provider exploded + 刷新 | 同左 |

卡片布局已改用 `CollapsiblePresence` / `MediaGenCardLayout` / `PromptBlock` / `TagsRow`，
产出接 `ArtifactAssetCard`，参考素材有资源时接小尺寸缩略图；卡片不再有重试/停止按钮
（参照 `ScopedCard` 本来就没有）。
我方截图目录 `.probe/pw/design-execute/2026-10-25T08-...-recovered/`，参照 `...-reference/`。


## 收尾修复

- footer 前补 8px 间距：我方 failed 的错误文案/离线提示 y 从 156.5/186.5 对齐到参照的 164.5/194.5。
- 删除 `main.jsx` 的 `globalThis.__jsx` 兜底；`execute-card.jsx`、`external-agent-section.jsx`、`desktop-misc.jsx` 补 `__jsx` import；`audit-v3.mjs` 新增第 8 项检查。
- 标题灰底不是本轮引入（dd13f2af 以来没有标题组件改动）；侧栏 `=8>ws-a`/灰色头像是 launch-app 夹具环境造成，不影响验收。
