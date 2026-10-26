# `design_execute` 任务卡片：实现状态

## 已完成

| 项 | 内容 |
|---|---|
| A. MCP 契约 | `execute` 改调 `/api/v3/execute`，透传全部入参并带 agent caller；任务列表支持 operation/source/toolUseId/limit；retry 真重提，其余 action 返回 422 |
| B. 查询/推送 | `task-query.js`、`task-push.js`、`turn-registry.jsx`，`design-chat-` 订阅、缓存失效、3s/15s 轮询 |
| C. 卡片 | `design-input.js`、`resources.js`、`execute-card.jsx`；时间线 `renderEntry` 渲染，消息列表根部挂 Provider/Push |
| 门禁登记 | 已删除 4 屏 `task_subscribe`/`task_unsubscribe` 登记；37 屏连续 2 次 exit 0，v3 七屏 exit 0 |

## 交接文档第 1 节（T-1～T-8）收口

> 逐条对应 `docs/cloud-platform-plan.md` 第 1 节。**T-6 未完成**（未复现），其余已收口。

| # | 结论 | 证据 |
|---|---|---|
| T-1 | **已修**。`outputs=0` 的根因不在 gateway 交付，也不在资源查询，而在 `tasks.complete()` 写进 `state.outputs` 的内容 | 见下 |
| T-2 | **已改脚本**。轮询按"卡片自己的请求"分类并分 ready 前后两段统计 | 见下 |
| T-3 | **已落盘** `<ts>-online/result.json` | 见下 |
| T-4 | **已补 20 个 key**（中英各一份，译文取自参照 4.0.4 字典） | 见下 |
| T-5 | **已扫、已修 14+3 处、已接进 `audit-v3`** | 见下 |
| T-6 | **未完成**：两轮 turbo 全量 + 多次单文件重复都**没有复现**，因此无法按字面要求在 `41bc74f1` 之前复现 | 见下 |
| T-7 | **已对照**：`dd13f2af` 与本轮都是 **9 处**，且是同一批 9 个名字 | 见下 |
| T-8 | 见"收尾" | 见下 |

### T-1 任务产出没有落到 `outputs`

**断点**：`app/gateway/src/generate/tasks.ts` 的 `complete()`。它把落地的资产文件写成
`outputs: [{ key, path, kind, name }]`，而渲染层的 `designOutputs`
（`app/renderer/src/chat/design-execute/design-input.js:63`）要求每项都带
`resourceId` + `versionId`，缺一个就**整项过滤**。于是：交付其实成功了（资源、版本、
Composition 成员都建好了），任务的 `status` 也是 `completed`，但 `task.outputs` 在界面上
等于空 —— 卡片不渲染 media 区，画布上也看不到产出。**三处排查方向里命中的是第三条**
（卡片读的字段），而"资源路径查询"本身没问题。

**修法**：用交付收据里的资源身份回填 `state.outputs`（`{key,name,kind,resourceId,
versionId,availability,disposition}`，`path` 保留给日志），`present()` / `executionView()`
共用一个 `outputView()` 透传。e2e 补断言：`/api/v3/execute` 带 `output.resources` →
完成后 `task.outputs` 恰好 1 项、带 `res_`/`ver_`、`availability=available`，且
`POST /api/project/resources/get` 查得到 `status=ready` 的版本（卡片换 `relativePath`
走的就是这一步）。

**在线复跑**：`outputs=0` 修好之后，这条路第一次真的被走到 —— 于是又暴露了**两个更深的
缺陷**，都会让"产出显示不出来"，而且都只在真正有产出时才发作：

1. **渲染层崩溃**：`chat/design-execute/execute-card.jsx` 用了 fragment（`<>…</>`），
   但只 import 了 `__jsx`、没 import `react/jsx-runtime`。编译产物里 fragment 变成
   `jsxRuntimeExports.Fragment` → 运行期 `ReferenceError`，整个应用掉进
   「出现异常」兜底页（错误码 `EB-0573D98D`）。
2. **资源读取被判非法**：`/api/project/resources/get` 的 `version` 少了
   `createdAt` / `updatedAt`，而渲染层的资源校验把它们当必需字符串 → 整条响应判非法、
   `useDesignResourcePath` 抛 `Resource unavailable`，卡片显示「预览加载失败」，**HTTP 却是
   200**。

两处都修了，并各加了一道防回流：

- `audit-v3` 第 11 项：用 fragment 但没引 `jsx-runtime` 的文件（现 0）；
- `execute-task.e2e.test.ts`：资源响应里 `version.createdAt/updatedAt`、
  `resource.createdAt` 必须是时间字符串。

**取证方式**：`scripts/pw/design-execute-online.mjs` 新增 `--self-test` —— 起本地假平台，
**链路与真实跑法完全一致**（归档种子 → `/api/v3/execute` → 卡片 → media 区 → 拉文件），
只有平台那一侧的字节是假的。实测（`.probe/pw/design-execute/2026-10-25T17-45-14-105Z-selftest/`）：

- 任务 `completed`，`outputs` 1 项、带 `res_`/`ver_`/`availability=available`；
- 卡片文案「生成 1 张图片（已完成）」，产出区 4 个元素，
  `data-action-ui-id="chat-generated-image"`、`data-artifact-type="image"`；
- `/files/store/ver_….png` 请求两次均 200，截图里 media 区显示的就是那张图
  （`online.png`）；
- 页面异常 0 条。

**真实平台那一次也跑了**（`.probe/pw/design-execute/2026-10-25T23-05-06-173Z-online/`，
baseUrl `https://maas.ovaijisuan.com/v1`）：

- 任务 `completed`，`outputs` 1 项带 `res_`/`ver_`/`availability=available`；
- 卡片文案「生成 1 张图片（已完成）」、模型标签 `qwen-image-pro-enhanced`；
- 产出区 4 个元素，`data-action-ui-id="chat-generated-image"`、
  `data-artifact-path=…/files/store/ver_a7ab26df0858.png`；
- `/files/store/….png` 两次 **200**；页面错误 **0**；
- 交付文件本体是 **2048×2048** 的图（白底红苹果），已拷成同目录的 `output.png`。
  截图里 media 区那一块是 `background-image` + `cover` 裁切，所以看到的是苹果的中段，
  不是整张图 —— 这是卡片布局（宽而扁的条）决定的，不是没加载出来。

**这一轮还顺手加固了一个崩溃点**：真实出图后 `Tooltip`（`generation/missing-asset-card.jsx`）
对 `children.props.id` 直接解引用，而某个调用点传进来的 children 是 `undefined` ——
报 `Cannot read properties of undefined (reading 'id')`，被 `v3-render` 兜住后只是刷屏
（子树会被卸载）。改成"不是元素就原样返回"。修完同一场景页面错误 0。

### T-2 轮询间隔的测量

改在 `scripts/pw/design-execute-online.mjs`：

- 每条请求记 `{at, method, url}`（不再只记时间戳）；
- **卡片自己的请求** = `GET /api/v3/tasks/<id>`（排除 `/queue`、`/lookup`）或带 `toolUseId`
  的列表请求；其余 `/api/v3/tasks*`（任务面板、队列）单独列；
- 按 WS `task_subscription_ready` 的到达时间切"就绪前 / 就绪后"两段，按规范化 URL 分组算
  间隔（同一个 URL 的两个轮询器不会混在一起）。

**补测结论（2026-10-26，两轮）**：

**① callID 丢了 —— 产品 bug，根因是归并函数落后 4.0.4。** 参照 4.0.4
（主包 `mermaid-GHXKKRXX-DuPXfUYG.js`，`toolCallId: toolMsg.callID` 附近）在时间线归并时
**同时写 `callID` 和 `toolCallId`**，还会把 design 工具的失败态标成 `error`；我们的
`media-editing/merge-into-timeline-entries.js` 停在 4.0.3 的写法：只写 `toolCallId`，
也没有 design 失败判断。卡片照参照读 `entry.callID` → 永远 undefined → `useDesignTask`
的 `enabled`（`taskId || callID`）为假 → 查询根本没打开。

修法：把归并那段升到 4.0.4（补 `callID`、补 design 失败态、`getToolLabelId` /
`categorizeToolAction` 补上第二个参数），删掉上一轮临时加的 `designTaskCallId`。
用例：`chat/design-tool-state.test.ts`（7 条，判定逻辑）+ `media-editing/merge-tool-entry.test.ts`
（4 条，字段与失败态）。

> **更正上一轮的说法**：写过"参照 4.0.4 里没有这张卡片、是自研的"——**错**。那次的搜索只看
> 了文件名带 `index` 的包；相关代码在主包 `mermaid-GHXKKRXX-DuPXfUYG.js` 里
> （`design-execute-task` 出现 11 次，`LIVE_POLL_MS = 3e3` 约在第 20607556 字节）。
> 以后搜参照要搜整个 `assets` 目录。

**② 仍然没测到 3 s / 15 s，但原因换成了"窗口不可见"。** 夹具一直带
`OV_DEV_HIDDEN_WINDOW=1`（逐屏截图用），隐藏窗口在 Chromium 里等于页面被遮挡，React Query
的 `refetchInterval` 不会触发。诊断日志：窗口隐藏时 `polled: 15000` 但 90 秒里一次请求都没发。
`launch-app.mjs` 新增 `showWindow` 选项；打开后单次运行超时（未拿到结论），**因此 3 s/15 s
至今没有在"运行中 + 窗口可见"下拿到实测值**。

**③ 真实会话没跑成，卡在工具面（原因已查清并修）。** 两次尝试（`--real-session`：对话真、生成假 60 s）：
- 第一次没设 `HILO_PROJECT_ARCHITECTURE`，agent 的推理里写"没有 design_execute 这个工具"，
  走了 `hub_*` 老路径并弹了画幅问题；
- 第二次设了，但 agent 说 design 系列工具不可用、改用 `bash` 找 CLI。

真正的原因在 **MCP 服务名**：`desktop/src/main/opencode/config.ts` 把启动命令和环境变量
**永远写进 `config.mcp.hub`**，而 v3 的 profile 声明的服务叫 `design`。于是在 v3 下：
`design` 只剩 profile 里那条相对路径命令（起不来，`design_*` 一个都没有），真正的命令挂进一个
多出来的 `hub` 服务（注册成 `hub_*`）。修法：注入到 profile 声明的那个 local 服务上
（v3=`design`、v2=`hub`，没声明时退回 `hub`），profile 自带的 environment 在前、我们的在后。
`HILO_PROJECT_ARCHITECTURE` 由 profile 自带（`mcp.design.environment`），不需要从进程环境转发。
用例：`opencode.test.ts` 的"MCP 服务的注入位置"（v3 只有 `mcp.design`、v2 只有 `mcp.hub`）。

**旧结论（保留一句）**：在这之前的一版里我写过"卡片靠推送驱动、3 s/15 s 只在拿不到 taskId
时才生效"—— 那句是错的：`useDesignTask` 的 `enabled` 要求 `taskId || callID`，两者都有时
查询是开着的，会按 3 s/15 s 轮询。真实情况是 callID 丢了导致查询没开。

诊断日志（临时给 `task-query.js` 的 `refetchInterval` 加了一行，测完已删）：

```
[poll-debug] {"final":false,"ready":true,"taskId":null,"callID":null,"status":"running","hasData":true,"polled":15000}
```

- `useDesignTask` 的 `enabled` 要求 `taskId || callID`（`task-query.js:25`）。夹具里两者都是
  null，查询是**关着**的，界面状态全部来自推送（`task_changed` 覆盖缓存）——
  所以我测到的是"推送"，不是"轮询"。
- 为什么夹具拿不到：卡片的数据来自工具 part 的 `content`（`with-tool-presentation-fields`
  的 `parseToolResult(sub.content)`），而脚本只能往 part 的 `state.output` 里写任务；
  我试过写回真实任务并 reload，`taskId` 仍为 null。**这条夹具链路是模拟不出来的**。
- 所以：T-2 的 3 s/15 s **至今没有在"任务运行中 + 卡片拿到 taskId"的条件下测到**。
  要测只能跑一次真实会话（真实的 MCP 工具返回 `{task:{…}}`），那要花一次真实生成。

**真实平台上的实测（145 秒窗口，窗口置前、`visibilityState=visible`、`hasFocus=true`）**：

| 轮询源 | 间隔 | 次数 |
|---|---|---|
| 任务列表（`status=accepted,running,waiting_user,unknown`，面板用） | **5.0 s**，非常稳 | 30 |
| 任务列表（按四个 operation 的历史列表，`limit=50`） | **15.0 s** | 20 |
| 卡片自己（`GET /api/v3/tasks/<id>`） | 只有 1 次，之后不再轮询 | 1 |
| 卡片按 `toolUseId` 反查 | 0 次 | 0 |

**结论（更正版）**：文档预期"就绪前约 3 秒、就绪后约 15 秒"。实测到的是**两个列表
轮询器（5 s 与 15 s）**；卡片自己只发了 1 次按 id 的查询。

前一版把"只查 1 次"解释成"卡片是推送驱动、3 s/15 s 只在拿不到 taskId 时才生效" ——
**这个解释是错的**：`task-query.js` 的 `enabled` 要求 `taskId || callID`，而只要查询是
开着的，`refetchInterval` 就会按 3 s/15 s 跑（推送就绪后降到 15 s）。实际发生的顺序是
**查询压根没开**（夹具里 `taskId`/`callID` 都是 null），所以只剩推送更新。
"有没有 taskId 都一样轮询"不成立 —— 没有 taskId 时查询是关的，不会轮询。

**补充事实**：任务 id 是由 `requestId` 算出来的（`execute-task.ts`），所以多次运行拿到
**同一个 task id** 属于正常现象，不是复用了旧任务。

**另外两个容易误读的点，已经在脚本里处理**：
- `refetchIntervalInBackground` 默认 false：窗口在后台时 React Query 会暂停轮询。
  实测后台状态下 145 秒只发出 1 次卡片查询，看着像"轮询坏了"。脚本现在先
  `bringToFront()`，并把当时的 `visibilityState` / `hasFocus` 记进证据。
- 想量"就绪前 3 s / 就绪后 15 s"必须有一个跑得比间隔久的任务：图片 10 秒就完了，
  轮询还没来得及发生。脚本给了 `--fake-delay <ms>`（只在 `--self-test` 下）
  造一个慢任务来量，零成本。

### T-3 证据落盘

每次运行写 `.probe/pw/design-execute/<ts>-online/result.json`，内容：全部 WS 帧（类型 +
时间）、全部请求、`execute` 响应、任务 JSON（终态 + `outputs`）、按 `outputs[].resourceId`
/`versionId` 做的资源查询结果、卡片文案、media 区元素计数、轮询分段统计。`sk-` 开头的串
统一脱敏成 `sk-…redacted(<长度>)`。

### T-4 底部标签栏显示原始 key

**是哪个 key**：`workspace.structure.list`（底部"画布 / 列表"切换栏的第二个标签），以及
同组的 `workspace.structure.views`（`aria-label`）。整组 20 个 `workspace.structure.*`
在中英字典里**一个都没有** —— 界面直接显示 key，截图里被截成 `workspace.struct…`。

**参照的翻译**：取自参照 4.0.4 的字典（`.probe/reference/4.0.4/asar/out/renderer/assets/
index-CBQqfCOX.js`）：`workspace.structure.list` = 列表 / List，
`workspace.structure.views` = 工作区视图 / Workspace views，其余 18 条同源。已按参照译文
补进 `app/renderer/src/i18n/{chinese,english}-translations.js`。

**门禁 37 屏有没有拍到 —— 有，本轮取到证了**：`scripts/pw/design-execute-online.mjs
--self-test` 的整页截图（`.probe/pw/design-execute/2026-10-25T17-45-14-105Z-selftest/
online.png`）左下角就是这条工具条，文字是「画布 / 列表」——补 key 之前是
`workspace.struct…`。同一张截图也顺带证明 37 屏的 `ws-a` 系列确实覆盖这个区域。

（37 屏门禁本身一直是 exit 0，是因为**参照基线里这两个标签也是中文**，补齐后反而回到了
与基线一致的状态 —— 差异本来就在像素护栏以内，所以从来没有报红。）

### T-5 同类扫描

新增两个脚本（都接进 `audit-v3.mjs`，见第 9、10 项）：

- `scripts/v3preload/scan-param-shadow.mjs`：参数被改名成 `xxx2`、函数体仍引用 `xxx`，
  而 `xxx` **绑到了函数外**（模块 import / 顶层 const / 外层函数参数）。作用域感知
  （babel `traverse` + `getBinding`），不是正则猜；`check-undef` 抓不到这一类，因为那些
  名字**是有绑定的**。
- `scripts/v3preload/scan-dup-keys.mjs`：对象字面量 / 解构里的重复键（后者静默覆盖前者）。
  跳过 `get`/`set` 访问器对与 `export-engine/` 的第三方镜像文件。

**首轮结果**：参数改名遮蔽 **14 处**（`attachment-upload-zone` / `scrollable-asset-view` /
`canvas-move-object-overlay` / `canvas-outpaint-overlay` / `history-anchor-rail-impl` /
`media-preview` / `project-asset-thumbnail-generation` / `html-viewer-inner` /
`media-gen-detail` / `timeline-item` / `data-directory-settings` /
`local-connector-setup-content` / `markdown-fullscreen` / `production-plan-timeline`），
全部属于"desource 改名时漏改函数体"，已逐个修好；重复键 **5 处**，其中 3 处是真缺陷
（`app-root.jsx` 的 `validateSearch` 被写成第二个 `component`、`perform-gateway-fetch.js`
的 `serverMessage`、`customize-toolbar-dialog.jsx` 的 `attributes`），2 处不是
（`result-navigation-provider.js` 的 getter/setter 对、`panorama-viewer.js` 第三方镜像）。

**现在的数字**：两个扫描都是 0。

### T-6 turbo 全量的 2 个 e2e 失败

**没能复现**（累计：turbo 全量 8 次、gateway 全量 6 次、两个文件单跑 4 次、强制并行 1 次、
旧树 6 次、文件顺序打乱 2 次 —— 一次都没红）。试过的组合（都在本机、同一份依赖）：

| 做法 | 结果 |
|---|---|
| `pnpm turbo run build typecheck test --concurrency=1 --force` ×2 | 34/34 通过（第一次失败是我自己引入的 desktop 构建回归，已修） |
| `canvas-more.e2e` + `composition.e2e` 连续 4 次 | 12/12 通过 |
| 强制 `--fileParallelism=true` 跑 4 个会改 `WORKSPACE_DIR` 的 e2e | 38/38 通过 |
| `41bc74f1^` 的 worktree：两个文件连续 6 次 | 12/12 通过 |
| `41bc74f1^` 的 worktree：gateway 全量 ×2 | 各 1 个失败，但**不是这两个文件**（是 `generate.e2e` 的"模型目录来自本机配置" —— 那是本轮改了产品预设、而 worktree 借用了主仓 `node_modules` 里新构建的包导致的），与 T-6 无关 |
| 收口后又跑：gateway 全量连续 **6 次**（每次 94 文件 / 519~520 用例） | 6/6 全过 |
| **文件顺序打乱**（`--sequence.shuffle.files`，seed 1/2）：这是"新增一个测试文件会不会翻车"的对照 | **520/520 通过 ×2** —— 文件级顺序无关，`fileParallelism: false` 那条隔离是有效的 |
| 连**用例内部顺序**也打乱（`--sequence.shuffle` 默认同时打乱 tests） | 34~49 个用例失败 —— 但这是**文件内有状态**（前一个 it 建的东西后一个用），e2e 正常形态，与本条无关。做这个对照是为了排除"把文件内顺序当成了历史那 2 个失败" |
| 换 `pool: "forks"`（每文件一个进程）+ 打乱 | 更糟（17 文件失败），已还原 |

**没有测试名可写**：交接文档只给了"2 个 e2e 失败"，runbook 8.1 记的是
`canvas-more.e2e` / `composition.e2e`（"偶尔"）。**按现状无法完成 T-6 的验收**，需要一次
真实失败现场（失败输出或 CI 日志）。已排除的机制：`process.env` 跨文件共享
（`app/gateway/vitest.config.ts` 的 `fileParallelism: false` 早在 `c90ee616`、即
`41bc74f1` 之前就已存在）、desktop 的 vitest 误扫 staging 副本（`a2867800`，2026-10-07
已排除 `build-resources/**`）。

### T-7 `audit-v3` 第 6 项（Context 声明数）

用 `OV_AUDIT_SRC` 指向 `git archive dd13f2af app/renderer/src` 出来的旧树跑同一份脚本：

| 树 | 第 1 项缺口 | 第 2 项解析失败 | 第 3 项同实体重复 | 第 6 项超参照 |
|---|---|---|---|---|
| `dd13f2af` | 0 | 0 | 0（2239 非违规） | **9** |
| 本轮 HEAD | 0 | 0 | 0（2239 非违规） | **9** |

9 个名字也完全一致：`AuthContext`、`CurrentWorkspaceContext`、`GatewayScopeContext`、
`ImBridgeDialogCtx`、`PlatformContext`、`RuntimeConfigContext`、`SettingsDialogCtx`、
`ThemeCtx`、`WSConnectionContext`，每个都是"我们 1 / 参照 0"。**结论：原来就有，本轮没有
新增。**

### T-8 收尾

**门禁（本轮最后一次）**

| 门禁 | 命令 | 结果 |
|---|---|---|
| 37 屏 | `GOLDEN=$HOME/ov-golden-4.0.4-clean node scripts/ui-compare/compare.mjs` | **exit 0**；37/37 屏「超护栏 0 / 未登记差异 0 / 新增报错 0」；基线批次 `2026-10-24T11:38:44.667Z-rd8xdc（37 屏）` 单一。**修完 T-1 那两个更深缺陷（fragment / 资源时间戳）之后又整跑过一次，仍是 exit 0** |
| v3 七屏 | `HILO_PROJECT_ARCHITECTURE=resource_v3 GOLDEN=$HOME/ov-golden-v3-4.0.4 ONLY=ws-a-v3,… node scripts/ui-compare/compare.mjs` | **exit 0**；7 屏均为「新增报错 0 / 未登记差异 0」，工作台视图非 AA 像素 0%（同上，T-1 修复后复跑仍 exit 0） |

`node scripts/v3preload/audit-v3.mjs`：第 1～5、7～10 项全 0；第 6 项 9 处（已知遗留，T-7
已对照），因此脚本仍以 exit 1 结束 —— 这是既有口径（第 8.2 节：不要用 exit 0 当全绿，
看每项数字）。

**为了让 37 屏回到全绿，本轮动了两处门禁登记**（都写进了 `intentional-differences.md`
与 `ov-changes.md`，没有靠改 `expected-diffs.json` 掩盖真实差异）：

1. `ws-chat-input` 的 `dom.refOnly` 加 `feedback-button`（参照有「反馈问题」按钮，L-6 隐藏了）；
   同时 `MASK_TARGETS` 按该 id 遮掉参照侧那两个按钮的矩形。
2. 该屏的**残差护栏从 1.95249 上调到 2.25**。原因写在 `residual-budget.json` 的条目里：
   去掉两个 104×35 的按钮后，同一行变窄、其后内容整体位移，差异不再局限在按钮矩形内，
   只遮按钮只能收回 0.04pp（遮前 2.2449% → 遮后 2.2027%）。这是**唯一一处上调护栏**，
   属于"已知原因 + 明写数值 + 明写为什么收不回来"。

参照侧那份基线**没有重录**：单屏重录出来的状态和整批不同（实测少了 connectors 徽标、
多了 `task_subscribe` 帧），拿它当基线会凭空多出两处差异。做法是只把新算出来的两个
按钮矩形并进原来的 `ws-chat-input.mask.json`，像素 / DOM / state / 批次全部保留。
老基线备份在 `~/ov-golden-4.0.4-clean.bak-2344/`。

**工作区**：本轮全部改动已提交（`git status` 干净）。

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


## MediaGenCardLayout media 区修复

`d11aba99` 起 `MediaGenCardLayout` 参数被改名为 `media2`，JSX 仍渲染 `{media}`，命中的是
`canvas-v3-model.js` 导入的 `media` 函数，导致所有生成详情卡片和任务卡片的 media 区一直为空。
已改为 `{media2}`，并移除任务卡片 footer 的 `pt-2` 临时补丁；失败状态 DOM 坐标仍为
`errorY=164.5`、`offlineY=194.5`，与参照一致。`TAG_I18N_KEYS` 的重复 `size` 改为
`image_quality` + `size`。

### T-2 第四轮（2026-10-26）：工具链打通，但 3 s/15 s 仍未实测

**① callID 的根因改判（上一轮的解释不完整）**：不是"我们自研、参照没有"，而是归并函数
停在 4.0.3。参照 4.0.4 同时写 `callID` 与 `toolCallId`，还会把 design 工具的失败态标成
`error`。已按参照补齐（含 `getToolLabelId` / `categorizeToolAction` 的第二个参数），
删掉临时方案 `designTaskCallId`。证据：`chat/design-tool-state.test.ts` 7 条、
`media-editing/merge-tool-entry.test.ts` 4 条。

**② 真会话：agent 终于能调 `design_execute` 了，但被网关拒了。**
`desktop/src/main/opencode/config.ts` 原来**永远把 MCP 命令写进 `config.mcp.hub`**，而 v3 的
profile 声明的是 `design` —— v3 下 `design_*` 工具一个都不存在。改成"注入到 profile 声明的
那个 local 服务"（v3=`design`、v2=`hub`，没声明退回 `hub`）后，真会话里 agent **确实调用了**
`design_execute`（opencode 库里有 `"tool":"design_execute"`、`callID` 形如
`chatcmpl-tool-9261f96d632cdf9f`）。

**③ 新的拦路虎：`x-tool-use-id` 没注入。** 网关对 agent 调用要求 `x-tool-use-id` 头，
它由插件从 `_tool_use_id` 参数注入；而插件的注入条件是 `tool.startsWith("hub_")` ——
v3 的工具叫 `design_*`，直接 return。于是 `/api/v3/execute` 一律 400
`INVALID_ARGUMENT — Invalid requestId`（真会话里 agent 连试 5 次全被拒）。已修
（`opencode-plugin-hilo` 同时认 `hub_` / `design_` 前缀），用例
`plugin.test.ts` 的"design 工具也要注入会话与调用 id"。

**④ 3 s/15 s 仍未实测。** 两次真会话预算都花在 ②③ 的排查上（第二次跑的还是**旧插件包**：
`build-resources` 里那份重打包的 dist 没跟着源码更新，是我漏了构建顺序）。种子夹具这边：
窗口可见时（`showWindow`、`visibilityState=visible`、`hasFocus=true`）卡片仍然只发 1 次
查询；给卡片加临时探针（已删）想看 interval 求值与挂载/卸载时，可见窗口的两次运行都在
400～700 秒内没跑完（隐藏窗口时正常结束），怀疑可见窗口下有别的东西在挡，尚未定位。

**⑤ 隐藏窗口不轮询**仍然是事实，但那是测试环境限制：参照同样用
`refetchIntervalInBackground: false`，后台不轮询。

### T-2 第五轮（2026-10-26）：可见窗口"跑不完"的根因找到了

**根因：不是脚本等条件，是应用自己的退出确认框。** 窗口可见时关闭应用，会弹一个原生对话框
（"画布可能还没保存 / 可以留在应用里再试一次，或仍然退出"，按钮「取消」「仍然退出」），
进程一直等用户点。`launchApp.close()` 只发 SIGTERM，于是脚本跑到最后一步永远不返回 ——
而 `result.json` 其实**早就写完了**（所以"跑了 400～700 秒"那两次的产物是有效的）。
隐藏窗口时不弹这个框，所以看不出问题。

修法：这是**产品该有的行为**，不改；夹具改成"先礼后兵"——SIGTERM，宽限 3 秒，再对进程组
SIGKILL。`design-execute-online.mjs` 的收尾另外加了 15 秒超时兜底。

**3 s / 15 s 仍没测到，而且原因换了。** 修好退出后，150 秒任务的种子夹具给出：

```
[interval] value=15000 ready=true final=false taskId=null callID=tool-online status=running obs=1
```

也就是：查询**开着**、拿到的是 running、间隔算出来是 15 秒 —— 但 96 秒里一次请求都没再发，
`queryFn` 一次都没被重新调用。这是 React Query 的 interval 在当前宿主窗口状态下没有触发
（`refetchIntervalInBackground` 默认 false；参照同样如此，后台窗口不轮询）。也就是说，
**自动化夹具拿不到"前台焦点"这个条件**，3 s/15 s 只能在真人前台会话里量。

**插件构建顺序**：`build-resources/` 里那份插件 dist 由 `scripts/stage-desktop-resources.mjs`
生成（只进打包产物）；开发态加载的是 `app/packages/opencode-plugin-hilo/dist/index.js`，
它由 `pnpm --filter @ov/opencode-plugin-hilo build` 生成 —— `--filter @ov/desktop build`
不会重建它。已加检查：`launchApp` 比对 dist 与源码 mtime，陈旧时告警并回传
`plugin:{sha256,mtimeMs,stale}`；`--real-session` 遇到陈旧直接 exit 2，并把 hash 写进
`result.json`。
