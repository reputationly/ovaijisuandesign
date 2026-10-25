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

**在线复跑**：见 `docs/cloud-platform-plan.md` 第 6 节的产物清单。注意本轮**没有**跑真实
在线场景（`OV_PLATFORM_KEY` 未在本会话环境里提供），因此"截图显示
`ArtifactAssetCard`"这一条仍未取证 —— 记录的产物目录是同一次改造前的
`.probe/pw/design-execute/2026-10-25T11-34-35-145Z-online/`（只有 png，没有任务 JSON，
正是 T-3 要补的东西）。

### T-2 轮询间隔的测量

改在 `scripts/pw/design-execute-online.mjs`：

- 每条请求记 `{at, method, url}`（不再只记时间戳）；
- **卡片自己的请求** = `GET /api/v3/tasks/<id>`（排除 `/queue`、`/lookup`）或带 `toolUseId`
  的列表请求；其余 `/api/v3/tasks*`（任务面板、队列）单独列；
- 按 WS `task_subscription_ready` 的到达时间切"就绪前 / 就绪后"两段，按规范化 URL 分组算
  间隔（同一个 URL 的两个轮询器不会混在一起）。

**与交接文档不一致**：文档预期"就绪后约 15 秒（`RETRYABLE_POLL_MS`）"，我方实际生效的
常量是 `PUSHED_POLL_MS = 15000`（`task-push.js:18`）；`RETRYABLE_POLL_MS` 也恰好是 15000，
但它是给"失败且可 retry"用的。两者数值相同、用途不同，统计结果看不出来，这里记一笔
以免以后改其中一个时误判。

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

**门禁 37 屏有没有拍到**：这是**底部工具条**，属于 `ws-a` 系列屏的可视区域，正常情况下
应该被拍到。但 37 屏在本轮是 exit 0（见 T-8），说明要么基线里这个标签当时也不显示
（`showListSwitch` 依赖项目类型），要么差异落在像素护栏以内。判断依据不足，**不下结论**；
下一轮录基线时用 `ONLY=ws-a` 单屏截图确认这个标签是否在画面里。

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

**没能复现**。试过的组合（都在本机、同一份依赖）：

| 做法 | 结果 |
|---|---|
| `pnpm turbo run build typecheck test --concurrency=1 --force` ×2 | 34/34 通过（第一次失败是我自己引入的 desktop 构建回归，已修） |
| `canvas-more.e2e` + `composition.e2e` 连续 4 次 | 12/12 通过 |
| 强制 `--fileParallelism=true` 跑 4 个会改 `WORKSPACE_DIR` 的 e2e | 38/38 通过 |
| `41bc74f1^` 的 worktree：两个文件连续 6 次 | 12/12 通过 |
| `41bc74f1^` 的 worktree：gateway 全量 ×2 | 各 1 个失败，但**不是这两个文件**（是 `generate.e2e` 的"模型目录来自本机配置" —— 那是本轮改了产品预设、而 worktree 借用了主仓 `node_modules` 里新构建的包导致的），与 T-6 无关 |

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

- 37 屏、v3 七屏各跑一次，结果见本节末尾的"门禁"；
- `node scripts/v3preload/audit-v3.mjs`：第 1～5、7～10 项全 0；第 6 项 9 处（已知遗留，
  T-7 已对照），因此脚本仍以 exit 1 结束 —— 这是既有口径（第 8.2 节：不要用 exit 0 当全绿，
  看每项数字）。

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
