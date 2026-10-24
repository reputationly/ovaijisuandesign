# 对话区 `design_execute` 任务卡片还原：工作指导（交接）

写给接手的 agent。产品已在 4.0.4（`scripts/reference-version.json`），本任务做完再开始 `docs/v3-runtime-source-handoff.md`。
环境、门禁命令、静态检查、汇报格式与 `v3-runtime-source-handoff.md` 第 3、6 节相同。

## 0. 问题与目标

**现状**（HEAD `aeae81af` 时核实）：对话里 agent 调用 `design_execute`（图片/视频/音频生成与编辑）时，我们只渲染一条普通工具行
（`team/activity-group.jsx` 把它排除出折叠组，按 standalone 工具条目渲染）。没有任务状态、进度、产出预览，也不能对失败任务重试。

**参照**：4.0.3 起就有一条完整链路，4.0.4 又加了 WS 推送：

```
message-turn 渲染工具条目
  └─ isDesignExecute(entry.toolName) && !pendingConfirm && !rejectedConfirm
       → <DesignExecuteCard entry>            （4.0.4 主 bundle @20874429 附近）
            → useDesignResourceScope → <ScopedCard entry scopeKey ready>
                 ├─ readDesignJson(entry.toolResult).task  = 工具结果里的任务快照
                 ├─ useDesignTask(...)   react-query 轮询 /api/v3/tasks（按 taskId，或按 toolUseId 反查）
                 ├─ useDesignTaskParams(...)
                 ├─ 快照与轮询结果按 revision 取新
                 └─ 渲染：状态 / 进度 / 产出 designOutputs / problem / 重试
对话列表根部挂 <DesignTaskPush/>（4.0.4，@21042403 附近）
  └─ useDesignTaskPush：task_subscribe("design-chat-…")
       ready   → 让 [DESIGN_TASK_QUERY, scopeKey]、[DESIGN_BATCH_MEMBER_QUERY, scopeKey] 失效
       changed → acceptDesignTaskSnapshot 写进缓存（revision 不回退）
       pushedScopes 里有该 scope 时，轮询从 3s 降到 15s（designTaskPollInterval）
```

**目标**：把这条链路还原成源码，让对话里的生成任务有实时卡片；做完后删掉 `expected-diffs.json` 里
`ws-code-editor` / `ws-chat-input` / `ws-table-edit` / `ws-canvas-ops` 四屏的 `task_subscribe` / `task_unsubscribe` 登记。

**前车之鉴**：上一轮写过一个只发订阅帧、丢弃 `task_changed` 的空壳（`b93f61dc` 已删除）。**不允许再用只对齐 WS 帧的实现过门禁**。

## 1. 参照位置（4.0.4 主 bundle `mermaid-GHXKKRXX-DuPXfUYG.js`，用 `scripts/refdiff/lib/refs.mjs` 解析，不要手写文件名）

主体集中在字节 **20,606,985 – 20,636,412**（约 29 KB）。按顺序含：

| 组 | 符号 | 本任务 |
|---|---|---|
| 资源作用域 | `useDesignResourceScope`、`servablePath`、`useDesignResourcePath`、`useDesignResourceRole`、`designResourceUrl` | 做。**`useDesignResourceScope` 我们已有**（`canvas-v3/canvas-v3-hooks.js`，经 `canvas-v3/main-exports.js` 导出），复用，不要再定义 |
| 推送 | `LIVE_POLL_MS`、`RETRYABLE_POLL_MS`、`DESIGN_TASK_QUERY`、`DESIGN_BATCH_MEMBER_QUERY`、`pushedScopes*`、`useDesignTaskPush`、`designTaskPollInterval`、`acceptDesignTaskSnapshot`、`designTaskFinal`、`designTaskRetryable` | 做 |
| 任务查询 | `findDesignTask`、`useDesignTask`、`useDesignTaskParams` | 做 |
| 回合注册表 | `PRESENTATION_KEYS`、`samePresentation`、`pickPresentation`、`createDesignTaskRegistry`、`DesignTaskRegistryContext`、`DesignTaskTurnProvider`、`useReportDesignTask`、`useTurnDesignReports`、`useTurnDesignTasks`、`useTurnDesignOutputs`、`useBatchMembers`、`BATCH_MEMBER_QUERY`、`mediaTypeOf` | 做（卡片和回合产出依赖它）；先查 `DesignTaskTurnProvider` 挂在哪 |
| **费用确认** | `decision*`、`planCostDecision`、`planBalanceCheck`、`costConfirmationEstimate`、`earliestCostExpiry`、`costConfirmationOutcome`、`expired`、`stopped`、`useDecisionRounds`、`advanceDecisionRounds`、`DesignTurnCostConfirmations`、`useResolveTasks`、`settledState`、`ThresholdRound`、`InsufficientRound` | **不做**，见第 2 节 |
| 卡片 | `MEDIA_ICONS`、`DesignExecuteCard`、`ScopedCard` | 做 |

其他依赖在别处：`readDesignJson`（@20195447）、`designInput`（@20199618）、`designOutputs`（@20200908）。

**我们源码里已有的**（复用，不要再抄一份；多份的先确认是同一实体）：

| 符号 | 位置 |
|---|---|
| `readDesignJson` | **3 份**：`chat/message-turn.jsx`、`chat/sub-agent-group.jsx`、`media-editing/connector-skill-label.js` —— 先比对是否同一实现，是就合并成一份再用 |
| `designToolPresentation` | `chat/sub-agent-group.jsx` |
| `createProjectTaskClient` | `canvas-v3/ui-components.js` |
| `TERMINAL_TASK_STATUSES` | `canvas-v3/canvas-v3-model.js` |
| `parseToolConfirmRejectReason` | `canvas/fullscreen-icon.jsx` |
| `useGatewayFetch` | **2 份**：`assets/listeners-a.jsx`、`generation/use-model-catalog-scope-key.js` —— 同上先核对 |
| `isDesignExecute` | `team/is-design-execute.jsx` |
| `createTaskSubscriptionNegotiation` | `workspace/workspace-structure-events.js` |
| `useOptionalWSConnection` | `settings/changelog-table.jsx` |

缺的：`designInput`、`designOutputs`、回合注册表全组、`DesignExecuteCard`、`ScopedCard`、推送组。

## 2. 范围边界

- **费用确认不做**：`ThresholdRound` / `InsufficientRound` / `DesignTurnCostConfirmations` 只在任务快照带 `task.billing.confirmation`
  （对方云端积分报价）时出现。我们的 gateway 生成链路不产生 `billing`（`app/gateway/src/generate` 内 `billing` / `confirm_cost` /
  `estimatedCredits` 均 0 处），参照在这种情况下这些组件渲染 `null`。所以不还原它们，行为与参照在无计费时一致。
  `ScopedCard` 里以 `billing` / 积分 / 余额为条件的分支同样不还原；**通用的 `retry` / `stop` 动作要保留**。
  在 `docs/ov-changes.md` 登记一条（计费确认属范围排除）。
- 先核对 gateway 契约，缺什么补什么（属于本任务）：
  1. MCP `design_execute` 的工具结果里有没有 `task` 快照（含 `id`、`revision`、`status`、`progress`、`outputs`、`problem`、`actions`），以及 `delivery.outputs`；
  2. `GET /api/v3/tasks` 是否支持 `operation`、`source=agent`、`toolUseId`、`limit` 过滤（`findDesignTask` 用它反查）；
  3. WS `task_subscribe`（无 `taskIds`、无 `includeProjectChanges`）会不会回 `task_subscription_ready`，任务变化时会不会推 `task_changed`
     （`app/gateway/src/generate/task-subscriptions.service.ts`、`chat/app.gateway.ts`）；
  4. 任务 `actions` 里的 `retry` 对应的 resolve 接口是否存在。
  对照参照 gateway（`.probe/reference/4.0.4/sidecar/gateway/dist/main.js`）的同名实现，有差异的在报告里逐条列出并说明。

## 3. 做法

1. **先读后写**：把第 1 节主体区段和依赖逐个读完，列出每个符号的依赖闭包，标出哪些已有、哪些要新写，交给负责人看一眼再动手
   （闭包超出上表时尤其要报告）。
2. 新建 `app/renderer/src/chat/design-execute/`，按组拆文件：`task-push.js`、`task-query.js`、`turn-registry.jsx`、`execute-card.jsx`。
   名字用参照的未压缩名，逻辑照参照写，注释用中文、讲为什么。
3. 挂载点按参照：消息回合里 `isDesignExecute` 分支渲染 `DesignExecuteCard`；对话列表根部挂 `DesignTaskPush`；
   `DesignTaskTurnProvider` 挂在参照的同一层。`team/activity-group.jsx` 现有的排除逻辑核对是否仍与参照一致。
4. 补 gateway 契约缺口（第 2 节），带 e2e 测试。
5. 删掉四屏的 `task_subscribe` / `task_unsubscribe` 登记；改正 `intentional-differences.md`、`ov-changes.md` 里相应的待做条目。

## 4. 验收

**机器判定**

| # | 检查 | 通过标准 |
|---|---|---|
| 1 | 构建/类型/测试 | `pnpm turbo run build typecheck test --concurrency=1` 全绿；gateway 新增契约有 e2e |
| 2 | 静态检查 | `v3-runtime-source-handoff.md` 3.4 节六项不变差；`audit-v3` 通过（含 Context 声明数、日志上传防回流） |
| 3 | 37 屏门禁 | 对 `~/ov-golden-4.0.4-clean`，**删掉四屏登记后** exit 0、超护栏 0、未登记 0、新报错 0；连跑 2 次一致 |
| 4 | v3 七屏 | 对 `~/ov-golden-v3-4.0.4` exit 0；工作台视图非 AA 像素 0 |

**门禁覆盖不到的，用 Playwright 补（必做）**

参照模式与我方模式都连**我们的 gateway**（门禁 reference 模式本来就是「参照渲染层 + 我方 gateway」），所以两边可以喂同一份任务数据。

- 准备：不调用真实付费平台。用 gateway 测试里已有的假 provider，或在 fixture 里种一条 `design_execute` 工具消息和对应任务；
  任务状态由测试脚本驱动：`queued → running(progress 30/70) → succeeded(带 1 张图)`，另跑一条 `failed`（`actions` 含 `retry`）。
- 每个状态各截一张卡片图；记录 WS 帧（`task_subscribe` / `task_subscription_ready` / `task_changed` / `task_unsubscribe`）、
  `/api/v3/tasks` 请求序列（含轮询间隔：推送就绪前约 3s，就绪后约 15s）。
- 判定：两边卡片 DOM 的 `data-action-ui-id` 集合一致、截图在门禁同口径下无非 AA 差异（或差异逐条解释），WS 帧类型序列一致，
  轮询间隔一致，失败卡片点重试后两边发出的请求一致。
- 产物放 `.probe/pw/design-execute/<时间戳>/`，路径写进报告，不要删。

## 5. 汇报

用 `v3-runtime-source-handoff.md` 第 6 节的模板，另外必须写清：
- 闭包清单（第 3 节第 1 步）与实际还原的符号对照；
- gateway 契约四项的核对结论与补了什么；
- 没还原的分支（计费相关）逐条列出；
- Playwright 场景的产物路径和每项判定结果。
