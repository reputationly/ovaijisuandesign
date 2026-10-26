# 验收交接：任务卡片收口 + P0 联调底座

> 写给接着做验收的 agent。所有结论都带**可复现的命令或产物路径**；凡是我没做到的、
> 与交接文档不一致的、或者只在特定条件下成立的，都在第五节明说，没有藏。
>
> 生成时间：2026-10-26 07:30 左右。客户端 HEAD `02211c51`，new-api HEAD `00d2684d7`。

---

## 一、一句话结论

| 范围 | 状态 |
|---|---|
| 第 1 节 T-1～T-8 | **7/8 完成**；T-6 未完成（要一次真实失败现场，见 5.1） |
| 第 4/5 节 P0（N-0～N-4、L-1～L-4、L-6） | **完成**；N-3 经负责人确认不做（模型没有） |
| 真实平台联调（生图/视频/语音合成/音乐/对话） | **五个全部跑通**，证据在 `.probe/platform/`、`.probe/pw/design-execute/` |
| 37 屏 / v3 七屏门禁 | 最近一次 **exit 0**（跑在 `47eac455` 这版代码上）；之后只有一处渲染层防御改动，见 4.4 |
| `go test ./...`（new-api） | 通过 |
| 文档 | `/v1/ov` 规划、new-api 逐文件核对、P0 状态、偏差清单都已写进 `docs/cloud-platform-plan.md` 与 `docs/design-execute-card-status.md` |

---

## 二、提交清单

**客户端 `ovaijisuandesign`（16 个提交，`5b1ba3e7` 之后）**

```
89371aa4  T-1 任务产出带资源身份；L-1 目录驱动模型（gateway 侧）
ac7c2777  L-2 大素材先上传；L-4 平台错误语义化
20dffafe  L-3 对话模型多选（目录驱动）
26cab535  T-4 补 i18n key、T-5 修复 17 处改名/重复键（补 89371aa4 漏掉的渲染层文件）
4b4ea71b  L-6 隐藏反馈入口；T-2/T-3 在线脚本；文档收口
fdc2dd50  37 屏 / v3 七屏门禁双双 exit 0，登记 L-6 的像素后果
0facbca4  N-3 语音识别按「不做」收口
8071d55a  额度不足的端到端证据；T-6 负结果
765338d1  真实平台联调一条命令跑完六个场景；T-6 排除文件顺序
47eac455  T-1 的两个更深缺陷（fragment 白屏、资源 version 缺时间戳）
e740ea9e  T-4 门禁取证补齐；门禁复跑
be83fbb0  第 1 节补收口状态
de28ae06  /v1/ov 未发布时的兜底 + --check
1d07acb8  真实平台联调跑通；T-2 实测间隔；Tooltip 加固
02211c51  语音合成真实跑通
```

**云平台 `new-api`（3 个提交）**

```
ac3cc7fed  /v1/ov 命名空间与能力目录；限流/能力不可用的稳定错误码
15c44089f  删除为 N-3 预留的 audio_transcriptions/transcribe 映射
00d2684d7  /v1/ov/capabilities 的整条链用例（真库 + 真中间件）
```

改动规模：客户端 68 文件 +3266/−218，new-api 20 文件 +1674/−88。

---

## 三、逐项做了什么

### T-1 `design_execute` 任务完成但 `outputs=0`（主路径）

**根因**：交付本身是好的（资源、版本、Composition 都在），断在
`app/gateway/src/generate/tasks.ts` 的 `complete()` —— 它写进 `state.outputs` 的是
`{key,path,kind,name}`，而渲染层 `design-outputs` 要求每项带 `resourceId` + `versionId`，
缺一个就**整项过滤**。

**修**：用交付收据里的资源身份回填 `outputs`（`{key,name,kind,resourceId,versionId,
availability,disposition}`，`path` 留给日志），`present()` / `executionView()` 共用
`outputView()`。

**修完又暴露两个更深的缺陷（都只在"真有产出"时发作）**：

1. `chat/design-execute/execute-card.jsx` 用了 fragment（`<>…</>`）却只 import `__jsx`
   —— 编译产物里 fragment 是 `jsxRuntimeExports.Fragment`，运行期 `ReferenceError`，
   整个应用掉进「出现异常」兜底页。
2. `/api/project/resources/get` 的 `version` 少了 `createdAt`/`updatedAt`，而渲染层
   资源校验把这两个当必需字符串 —— 整条响应判非法，卡片显示「预览加载失败」，**HTTP 是 200**。

三处都修了。防回流：
- `audit-v3` 第 11 项（用 fragment 但没引 `jsx-runtime` 的文件，现 0）；
- `execute-task.e2e.test.ts` 断言 `version.createdAt/updatedAt`、`resource.createdAt` 是时间串；
- 成功后 `task.outputs` 必须 1 项、带 `res_`/`ver_`、`availability=available`、资源可查。

**真实验证**：`.probe/pw/design-execute/2026-10-25T23-05-06-173Z-online/`
（`result.json` + `online.png` + `output.png` 2048×2048），任务 completed、产出区
4 个元素、`/files/store/ver_….png` 两次 200、页面错误 0。

### T-2 轮询间隔的测量方法

脚本 `scripts/pw/design-execute-online.mjs` 改成：记录完整 URL + 时间戳；**只统计卡片
自己的请求**（`GET /api/v3/tasks/<id>` 或带 `toolUseId` 的列表）；按 WS
`task_subscription_ready` 切就绪前/后就绪两段；其他来源单列。

**实测结论与交接文档不一致**（详见 5.2）：真实平台上跑到的是**两个列表轮询 5.0 s / 15.0 s**，
卡片自己是**推送驱动**（只有 1 次按 id 查询）。

脚本另外处理了两个坑：`refetchIntervalInBackground` 默认 false（窗口在后台时轮询会被暂停，
先 `bringToFront()` 并把 `visibilityState`/`hasFocus` 记进证据）；图片 10 秒就完成、
来不及量间隔，给了零成本的 `--fake-delay <ms>`。

### T-3 证据落盘

每次运行写 `.probe/pw/design-execute/<ts>-{online,selftest}/result.json`：WS 帧、全部请求、
`execute` 响应、任务 JSON、资源查询、卡片文案、产出区 DOM、`pageErrors`、
`/api/project/resources/get` 与 `/files/*` 的响应体、轮询分段统计。`sk-` 一律脱敏成
`sk-…redacted(<长度>)`。

### T-4 底部标签栏显示原始 key

缺的是整组 20 个 `workspace.structure.*`（`list` / `views` / `detail.*` /
`history.*`），中英各补一份，译文取自参照 4.0.4 字典。

**门禁取证**：`--self-test` 的整页截图左下角就是「画布 / 列表」，补 key 前是 `workspace.struct…`。
37 屏一直 exit 0 的原因也写清了：参照基线里这两个标签本来就是中文，补齐后回到与基线一致。

### T-5 同类扫描

新增两个脚本并接进 `audit-v3`：

- `scripts/v3preload/scan-param-shadow.mjs`（第 9 项）：参数被改名成 `xxx2`、函数体仍引用
  `xxx`，而 `xxx` 绑到函数外。作用域感知（babel `traverse` + `getBinding`），不是正则猜。
  首轮 **14 处**，全修。
- `scripts/v3preload/scan-dup-keys.mjs`（第 10 项）：对象/解构重复键。跳过 get/set 对与
  第三方镜像。首轮 5 处，**3 处真缺陷**（`app-root.jsx` 的 `validateSearch` 被写成第二个
  `component`、`perform-gateway-fetch.js` 的 `serverMessage`、`customize-toolbar-dialog.jsx`
  的 `attributes`），2 处不是（getter/setter 对、`panorama-viewer.js` 镜像）。

现两项均为 0。

### T-6 turbo 全量的 2 个 e2e 失败 —— **未完成**

见 5.1。

### T-7 `audit-v3` 第 6 项（Context 9 处）

在 `dd13f2af` 上跑同一份脚本对照：两次都是 **9 处**，且是同一批 9 个名字
（`AuthContext`、`CurrentWorkspaceContext`、`GatewayScopeContext`、`ImBridgeDialogCtx`、
`PlatformContext`、`RuntimeConfigContext`、`SettingsDialogCtx`、`ThemeCtx`、
`WSConnectionContext`）。结论：原来就有，本轮没新增。

### T-8 收尾

`docs/design-execute-card-status.md` 重写为逐条证据；37 屏与 v3 七屏 exit 0（见 4.3）；
工作区干净。

---

### N-0～N-4（new-api）

| # | 落点 |
|---|---|
| N-0 | `router/ov-router.go` + `router/main.go` 挂载（hilo 之后、web 之前）；`RouteTag("ov")` → `OvRateLimit()` → `TokenAuth()` → `KYCRequired()`，**不挂 `Distribute()`** |
| N-1 | `GET /v1/ov/capabilities`：`service/ovcaps/`（522 行）+ `controller/ov.go`。目录取自 `setting.HiloCatalog`，按"这个 key 能调的"过滤（分组 + 可见性 + 令牌白名单）；聚合模型按**每一段都有渠道**判定（`service/ovcap` 里递归查 `Generate.Model` 与启用时的 `Upscale.Model`，提示词增强段不参与）；`version` 是内容 sha256 |
| N-2 | `POST /v1/ov/files`：multipart → 对象存储 → `{url,key,bytes,content_type,expires_at}`；没配存储回 **503 + `capability_unavailable`**（不是 500） |
| N-3 | **不做**：负责人确认平台没有转写模型。客户端降级保留并有用例；我为它预留的映射已删（见 5.4） |
| N-4 | 新增 `rate_limited` / `capability_unavailable` 两个码；`OvRateLimit` 在拒绝时回**带码的 JSON**；另外三条限流（GlobalWeb/GlobalAPI/Hilo）仍是空体 429，未动 |

顺带把 `controller/hilo.go` 里的可用性判定抽成 `service/hilo_availability.go`（两个出口共用），
把聚合分组判定抽成 `common.AggregateModel.AllowsGroups` + `service.AggregateUsingGroups`。

### L-1～L-4、L-6（客户端）

| # | 落点 |
|---|---|
| L-1 | `gateway/src/generate/platform-catalog.ts`（拉取 10 s 超时 / 按令牌指纹落盘 / 平台不可达回退缓存）、`media-config.service.ts`（目录补空槽位：image/video/music/speech/upscale、`video_ref` 按 `taskTypes` 含 `r2va`、`image_edit` 按 `maxReferenceImages>0`）、`capabilities.controller.ts`（目录优先，配置兜底）、`maas-media/route.ts`（目录里的名字原样放行）、`PLATFORM_PRESET.models` 全部置空（产品不再硬编码模型名） |
| L-2 | `gateway/src/generate/media-inputs.ts` + `maas-media/upload.ts`：>8 MB 的本地素材先 `POST /v1/ov/files`，失败退回内联；URL/dataURI 直通 |
| L-3 | `gateway/src/runtime/chat-models.ts` + `chat.service.ts` + `runtime.controller.ts`；主进程 `opencode/config.ts` 的 `platform.chat_models` 多模型 provider（读 gateway 写的同一份目录缓存） |
| L-4 | `generation-runner.service.ts` 的 `describeFailure` 映射表 + `tasks.ts` 的 `problem` 落库与透出；`PLATFORM_FAILURES`：`insufficient_user_quota`/`pre_consume_token_quota_failed` → `BILLING_INSUFFICIENT`，`rate_limited` → `PROVIDER_CONCURRENCY`，审核/模型不存在/端点不支持/能力不可用 → `PROVIDER_REJECTED`，`dpp.transport` → `PROVIDER_UNAVAILABLE`。**码必须落在参照枚举内**，否则渲染层拒掉整条任务 |
| L-6 | `FEEDBACK_ENTRY_ENABLED = false`，三处入口（画布帮助菜单两项、对话消息菜单、`FeedbackButton`）全部不渲染；管线保留 |

---

## 四、验证证据（可复跑）

### 4.1 客户端全量

```bash
cd /Users/reputationly/Desktop/code/api/ovaijisuandesign
pnpm turbo run build typecheck test --concurrency=1 --force
```

**HEAD 实测**：`34 successful, 34 total`，exit 0。分项：gateway 520、desktop 579（1 skipped）、
mcp-tools 210、maas-media 136、protocol 42、assets 39、opencode-plugin-hilo 82。

### 4.2 new-api

```bash
cd /Users/reputationly/Desktop/code/api/new-api
go build ./... && go test ./...
```

**实测**：全过（44 个包有测试）。新增用例：`service/ovcaps`（7 条）、`router/ov_router_test.go`
（注册/401/限流）、`controller/ov_test.go`、`controller/ov_capabilities_e2e_test.go`
（真库 + `TokenAuth` + 令牌白名单，4 个子用例）。

> 备注：`go vet ./controller/` 有一条**既存**告警 `controller/hilo.go:79 append with no values`，
> 不是我改的行，未动。

### 4.3 门禁

```bash
# 37 屏（约 35 分钟）
GOLDEN=$HOME/ov-golden-4.0.4-clean node scripts/ui-compare/compare.mjs

# v3 七屏（约 5 分钟）
HILO_PROJECT_ARCHITECTURE=resource_v3 GOLDEN=$HOME/ov-golden-v3-4.0.4 \
  ONLY=ws-a-v3,ws-a-v3-resource,ws-a-v3-wb-canvas,ws-a-v3-wb-structure,ws-a-v3-wb-execution,ws-a-v3-wb-hierarchy,ws-a-v3-wb-chat \
  node scripts/ui-compare/compare.mjs
```

**最近一次结果**（跑在 `47eac455`）：37 屏 **exit 0**，37/37「超护栏 0 / 未登记差异 0 /
新增报错 0」，基线批次单一；v3 七屏 **exit 0**，工作台视图非 AA 像素 0%。

### 4.4 门禁时效性（请验收时重跑一次）

`47eac455` 之后只有一处**渲染层代码**改动：`generation/missing-asset-card.jsx` 的 `Tooltip`
加了"children 不是元素就原样返回"。这条分支只在 children 不合法时才走，而两次门禁
所有屏都是「新增报错 0」，说明没有屏触发过它，所以**预期**渲染不变 —— 但这是推断，
不是测量。**建议按 HEAD 重跑一次 37 屏 + v3 七屏**（40 分钟）。

### 4.5 真实平台联调

```bash
# 只验 key 与平台部署状态（不生成、不花钱）
OV_PLATFORM_KEY=… node scripts/smoke/platform-online.mjs --check

# 五个场景（每个跑一次，不要压测）
OV_PLATFORM_KEY=… node scripts/smoke/platform-online.mjs
#   语音需要参考音频：--voice-ref <本地 wav 或 URL>
#   模型名判不出音乐引擎族时：--music-engine music3|ace_step
```

**2026-10-26 实测**（`https://maas.ovaijisuan.com/v1`）：

| 场景 | 结果 | 模型 | 产出 | 耗时 | 证据目录（`.probe/platform/`） |
|---|---|---|---|---|---|
| key | 通过 | — | — | — | `…22-35-01-888Z-online/` |
| 能力目录 | **404** | — | — | — | 同上（线上没发 `/v1/ov`） |
| 生图 | 通过 | `qwen-image-pro-enhanced` | 834,407 B | 9.8 s | `…22-35-17-276Z-online/` |
| 视频 | 通过 | `minimax-h3-2k` | 6,198,688 B | 241.8 s | `…22-35-39-298Z-online/` |
| 音乐 | 通过 | `minimax-music3` | 2,218,760 B | 30.7 s | 同上 |
| 语音 | 通过 | `indextts-2.5` | 101,932 B / 2.31 s 音频 | 127.3 s | `…23-15-21-647Z-online/`（含 `output.wav`） |
| 对话 | 通过 | `deepseek-v4-1-flash` | — | 2.7 s | `…22-35-17-276Z-online/` |

卡片那条（T-1 的真实截图）：`.probe/pw/design-execute/2026-10-25T23-05-06-173Z-online/`。

### 4.6 静态审计

```bash
node scripts/v3preload/audit-v3.mjs
```

第 1～5、7～11 项全 0；第 6 项 9 处（T-7 已证明是既存）。脚本因此仍 exit 1 —— 这是既有口径
（看每项数字，不要拿 exit 0 当全绿）。

---

## 五、没做到的 / 与交接文档不一致的（重点看这节）

### 5.1 T-6：未复现，未完成

交接文档说 turbo 全量有 2 个 e2e 失败（runbook 记的是 `canvas-more.e2e` / `composition.e2e`，
"偶尔"）。我试了：

| 做法 | 结果 |
|---|---|
| turbo 全量 `--force` ×8 | 全过（其中一次失败是我自己引入的 desktop 构建回归，已修） |
| gateway 全量 ×7 | 全过（94 文件 / 519~520 用例） |
| 两个文件单跑 ×4 | 12/12 |
| 强制 `--fileParallelism=true`（4 个会改 `WORKSPACE_DIR` 的 e2e） | 38/38 |
| 文件顺序打乱 `--sequence.shuffle.files`（seed 1/2） | 520/520 ×2（**排除了"新增测试文件改变顺序"这条假设**） |
| 连用例内部顺序也打乱 | 34~49 失败 —— 但那是文件内有状态（前一个 it 建的东西后一个用），e2e 正常形态，与本条无关 |
| `pool: "forks"` + 打乱 | 更糟（17 文件失败），已还原 |
| `41bc74f1^` 的 worktree：两文件 ×6、全量 ×2 | 12/12；全量那次唯一的失败是 `generate.e2e` 的"模型目录来自本机配置"，原因是 worktree 借用了主仓 `node_modules` 里新构建的包，与 T-6 无关 |

**结论**：拿不到失败现场，所以写不出测试名，也无法做"原来就会失败"的证明。
**需要一次真实失败输出或 CI 日志**才能收口。

### 5.2 T-2 的实测与文档预期不一致（**上一版解释有误，已更正**）

实测事实不变：真实平台 145 秒窗口里，两个**列表**轮询是 5.0 s（活动任务）与 15.0 s
（按 operation）；卡片自己只发了 1 次按 id 查询。

**但"卡片是推送驱动、3 s/15 s 分支只在拿不到 taskId 时才生效"这个解释是错的。**
`task-query.js` 的 `enabled` 要求 `taskId || callID`；查询一旦开着，`refetchInterval`
就会按 3 s/15 s 跑。真实顺序是**查询根本没开**（`taskId`/`callID` 为 null），所以只剩推送。
补测（假平台 60 秒任务、窗口前台）拿到的诊断日志：

```
[poll-debug] {"final":false,"ready":true,"taskId":null,"callID":null,"status":"running","hasData":true,"polled":15000}
```

夹具里造不出"卡片拿到 taskId"的条件（卡片读的是工具 part 的 `content`，脚本只能往
`state.output` 写），所以 **3 s/15 s 至今没有在"运行中 + 有 taskId"下测到** —— 要么跑一次
真实会话，要么接受这一条继续挂着。

### 5.3 `/v1/ov` 线上未发布

`https://maas.ovaijisuan.com/v1/ov/capabilities` 实测 **404**（`/v1/models` 是 401，说明路由在）。
所以这轮联调用的是脚本里的 `FALLBACK_MODELS` 兜底模型名，**"目录下发的模型名"这条没验证过**。
云平台发布后用同一个脚本复跑一次即可。脚本会把这一点明确写进结论（`SKIP capabilities … 模型名不是目录下发的`）。

### 5.4 N-3：不做，且删掉了为它预留的代码

客户端降级保留（`edit_media:transcribe` → 503 `DEPENDENCY_UNAVAILABLE`，`noAsr` 回中文提示，
有用例）。但我在 `ac3cc7fed` 里为它加的 `audio_transcriptions` 传输与 `transcribe` 操作
**在 `15c44089f` 里删了** —— 没有模型时它唯一的效果是让管理员把某条语音模型配成转写、
然后目录里报出一条调不通的能力。模型到位后要恢复，改动点是三处（5.4 说的那三个文件）。

### 5.5 L-1 的口径收窄

`/api/v1/models/config`（媒体模型选择器的数据源）仍然是"每个模态一个模型"，因为 MCP 的
`hub_list_capabilities` 要拿它和**静态 vendor 表**取交集，目录里的任意模型没有 vendor 条目，
硬塞会让 agent 的"可用模型"变成空。多模型可选的落点是 `/api/v3/capabilities` 与 L-3 的
对话模型。要真正在媒体选择器里多选，得先扩 MCP 的 vendor 表（未做，属新工作项）。

### 5.6 L-6 动了两处门禁登记

- `ws-chat-input` 的 `dom.refOnly` 加 `feedback-button`（参照侧有两个「反馈问题」按钮）；
  同时 `MASK_TARGETS` 按该 id 遮掉它们的矩形。
- 该屏的**残差护栏从 1.95249 上调到 2.25**（`scripts/ui-compare/residual-budget.json`），
  原因写在条目里：去掉两个 104×35 按钮后同一行变窄、其后内容整体位移，差异不再局限在按钮
  矩形内，只遮按钮只能收回 0.04pp（2.2449% → 2.2027%）。这是**唯一一处上调护栏**。

参照基线没有重录（单屏重录的界面状态和整批不同，会凭空多出两处差异），只把新算出的两个矩形
并进原来的 `ws-chat-input.mask.json`；老基线备份在 `~/ov-golden-4.0.4-clean.bak-2344/`。

### 5.7 安全 / key

`OV_PLATFORM_KEY` 只以环境变量形式传进命令，**没有写进任何文件、提交、文档或 `.probe` 产物**。
期间发现一处历史遗留：`.probe/show/ud/config.json` 里存着明文 key（某次运行的应用配置），
已把该字段替换为占位符；跑完删掉了含明文 key 的临时工作区 `/tmp/ov-pw`。全仓复查
`grep -rl "sk-Hxn"`（排除 node_modules/.git/out/dist）**0 命中**。

---

## 六、给验收 agent 的建议顺序

1. `pnpm turbo run build typecheck test --concurrency=1 --force`（2 分钟，确认 34/34）
2. `cd ../new-api && go build ./... && go test ./...`（1～2 分钟）
3. `node scripts/v3preload/audit-v3.mjs`（十几秒，看第 1～5、7～11 项是 0、第 6 项是 9）
4. `OV_PLATFORM_KEY=… node scripts/smoke/platform-online.mjs --check`（几秒，确认 key 与部署状态）
5. 37 屏 + v3 七屏门禁（**必须按 HEAD 重跑**，40 分钟）
6. 需要看行为的，读 `.probe/pw/design-execute/2026-10-25T23-05-06-173Z-online/result.json`
   （任务 → 产出 → 资源 → 产物的完整链）与同目录截图

## 七、文档索引

| 文件 | 内容 |
|---|---|
| `docs/cloud-platform-plan.md` | 第 1 节任务卡与收口状态、3.3.1（T-1 最后两个坑）、3.4（new-api 核对 + `/v1/ov` 实际形态与草案的三处修正）、4.1（模态清单）、4.4（P0 逐项状态）、第 5 节验收、6.1（真实跑过的场景与偏差 8 条）、第 8 节 runbook/门禁/坑 |
| `docs/design-execute-card-status.md` | T-1～T-8 的逐条证据（含 T-6 的负结果表、T-2 的实测间隔、T-7 的两次数字） |
| `docs/intentional-differences.md` | 一.7（隐藏反馈入口）、四·补六（ASR 不做） |
| `docs/ov-changes.md` | #14（反馈入口）、#15（ASR） |

---

## 八、验收返工（2026-10-26 第二轮）

提交：客户端 `e01ff22c`，new-api `dfe3dbac9`。

### 8.1 阻塞项

| # | 改了什么 | 用例 | 修复前/后 |
|---|---|---|---|
| B-1 | 恢复 `FALLBACK_MODELS`（不放 `withPlatformPreset`），在 `MediaConfigService.load()` 的目录补位之后应用；无目录补全部空槽位，有目录只补 `image_upscale`/`video_upscale`/`music_edit` | `media-config.service.test.ts` 4 条（无目录兜底、有目录边界、目录缺 `generate_image`、null 当"没写"） | 修复前：只配 key 时 9 个槽位全 null、能力列表空。修复后：image/video/music/超分/音乐编辑都有值，能力列表非空 |
| B-2 | 目录里指向聚合模型的条目改走 `aggregateAllows`（分组 + 令牌 + 各段） | `TestBuildHonoursGroupsForCatalogAggregates` | 修复前：`default` 分组能看到 `groups:["vip"]` 的聚合条目。修复后：看不到，`vip` 能看到 |
| B-3 | 限流挪到 `FormFile` 之前（Content-Length + `MaxBytesReader`，上限 +1MB）；`limit==0` 不再套 `LimitReader`；读逻辑抽成 `readOvUpload` | `TestReadOvUploadUnlimitedReadsEverything` / `TestReadOvUploadDetectsOversize` / `TestPostOvFilesRejectsOversizeBeforeReadingBody` | 修复前：`limit=0` 只存 1 字节还回 200；超大请求体先被完整收下再判。修复后：完整读、413 在写存储之前短路（对照组证明超出限额才会走到存储） |
| B-4 | 出厂聚合配置 `upscale.model` `swiftvr` → `seedvr2`，补 `delivered_size:"1080P"`，改 `hilo_catalog.go` 注释 | `TestDefaultAggregateConfigUsesLiveUpscaler` | 修复前：出厂配置引用已下线模型，新部署超分段必失败。修复后：引用 seedvr2 且交付档位显式 |

### 8.2 其他功能问题

| # | 改了什么 | 用例 |
|---|---|---|
| F-1 | 目录条目的 `taskTypes`/`limits` 按 `agg.Generate.Model` 取 | `TestBuildReadsTaskTypesThroughGenerateSegment`（单元）+ `TestOvCapabilitiesReadsTaskTypesThroughGenerateSegment`（真库）：参考族含 `r2va`、帧族不含 |
| F-2 | `OvRateLimit` 跟随 `GlobalApiRateLimitEnable` | `TestOvRateLimitFollowsGlobalSwitch`（关掉后连续 3 次 200）；原 429 用例保留 |
| F-3 | 内存目录记 key 指纹 + base_url，换 key 丢旧目录、读新缓存、立即刷新；在飞刷新按代际丢弃 | `media-config.service.test.ts` 2 条（换 B 后为 null 且走兜底、换回 A 读到 A 的缓存） |
| F-4 | 提示改为"请稍后查看结果再决定是否重试"，不再承诺不重复计费 | `failure-description.test.ts`（断言含"查看结果"、不含"不会重复计费"） |
| F-5 | 默认项在排序前按出现顺序定；聚合模型按名字排序遍历；删掉"名字最短"规则 | `TestBuildDefaultsFollowCatalogOrder`（先 `b-model` 后 `a`，默认是 `b-model`） |
| F-6 | 门禁夹具 / `smoke/gateway.mjs` / 注释 / 三份文档里的 `swiftvr` 现状描述 | 无代码用例；夹具改完门禁见 8.4 |
| F-7 | **未改代码**，只把决定与现状写进 `cloud-platform-plan.md` 6.2 | — |

### 8.3 需要实测的两项

- **V-1 未做**：seedvr2 实际交付分辨率需要一次真实视频调用（付费），本轮约束只允许
  `--check`。`delivered_size` 先按验收方给的 `1080P` 写入出厂配置。
- **V-2 仍未测到 3 s/15 s**：假平台 + 60 秒任务 + 窗口前台，卡片仍只查 1 次。加了临时
  诊断日志（已删）拿到根因：

  ```
  [poll-debug] {"final":false,"ready":true,"taskId":null,"callID":null,"status":"running","hasData":true,"polled":15000}
  ```

  `useDesignTask` 的 `enabled` 要求 `taskId || callID`，夹具里两者都是 null → 查询关着，
  界面状态全靠推送。**这说明验收方的代码阅读是对的，我上一版的解释错了**（"有没有
  taskId 都一样轮询"不成立）。夹具造不出这个条件（卡片读的是工具 part 的 `content`，
  脚本只能往 `state.output` 写，reload 后 `taskId` 仍为 null），要测只能跑一次真实会话。

### 8.4 验证结果

| 项 | 结果 |
|---|---|
| `pnpm turbo run build typecheck test --concurrency=1 --force` | **34/34**；gateway **523**、desktop 579（1 skipped）、mcp-tools 210、maas-media 136、protocol 42、assets 39、plugin 82 |
| `go build ./... && go test ./...` | 全过 |
| `go vet`（ov 相关包） | 仅既有的 `controller/hilo.go:79: append with no values` |
| `audit-v3` | 第 1～5、7～11 项 **0**；第 6 项 **9**（既存） |
| `platform-online.mjs --check` | `PASS key`；`/v1/ov/capabilities` 仍 **404**（未发版） |
| 37 屏门禁 | **exit 0**，37/37「超护栏 0 / 未登记差异 0 / 新增报错 0」，基线批次单一 |
| v3 七屏门禁 | **exit 0**，7/7 同上；**最紧的一屏实测 3.089854% / 护栏 3.090308%，余量 0.000454pp**；`ws-a-v3` 3.241285% / 3.310254%；工作台视图非 AA 像素 0% |

### 8.5 与清单不一致 / 需要说明的

1. **B-1 的 `image_upscale` 定为 null**（清单标"待负责人确认"）。依据：`seedvr2` 在
   `relay/channel/task/gpustackplus/constants.go` 里是**视频任务**模型（`task_type=sr`），
   而客户端图片超分走同步 `/images/edits`；平台没有对应的图片适配器。要恢复只需把
   `FALLBACK_MODELS.image_upscale` 填上名字（一处）。
2. **F-7 选 A，但 UI 未动**：A 的兑现方式是"如实显示实际交付分辨率"，而这依赖 V-1 的
   实测值。本轮先把 `delivered_size` 写进聚合配置（计费按交付档位），UI 档位没改 ——
   因为改它要重录基线，而清单要求"确认之前不要改这部分代码"。
3. **new-api 工作区多了 4 个不是本轮的改动**（`controller/moderation_log.go`、
   `relay/task_moderation.go`、`service/moderation/output.go`、`service/moderation/output_test.go`），
   和 `.gitignore` 一样没有提交。清单只提到 `.gitignore`/`dist/`/`scripts/upstream-probe/`，
   这 4 个是会话期间出现的，我没有动它们。
4. **`swiftvr` 仍会出现在 `/v1/models`**：那是平台后台的模型能力登记，代码改不了，需要
   平台侧下线（清单最后一条已列）。
