# 与参照版本不一致的地方

逐层列出和 MiniMax Design 3.0.16 **不一致**的所有已知项。怎么做、先做哪个见 [`remaining-work.md`](remaining-work.md)。
写于 2026-09-25，基于分支 `replicate-official-stack`。

分三类：

- **A 还没做**：计划做，只是还没轮到。
- **B 故意不做**：用户定下的范围之外，界面上给桩或禁用态。
- **C 做了但行为不同**：已实现，但有意或不得已和参照不一样。接手的人最容易踩的是这一类。

---

## 一、界面（差距最大）

参照的渲染层可读应用代码约 30 万行，我们约 1.7 万行。主线上跑的仍是旧界面原样迁进 Electron；新界面只在 `ui-wave-1` 分支上做了第一波的一部分。**下面几乎每一项都属于 A。**

| 区域 | 参照 | 我们 |
|---|---|---|
| 应用菜单栏 | 完整菜单（文件、编辑、视图、窗口、帮助……）和快捷键 | 只有 M5 顺手加的几项，快捷键有猜的 |
| 页面 | 首页、项目列表、项目详情、创作集、资产中心、技能 / 技能社区、工作流、更新日志；设置是 11 个分区的对话框 | 旧版的首页、素材库、画布、技能；新外壳和设置框的壳在 `ui-wave-1` |
| 标签和窗口 | 单窗口，渲染层里放工作区标签，恢复时显示未启动的标签 | 主进程已支持（M5），界面还没接 |
| 画布节点 | 9 种：image、video、audio、text、file（全景 / 插件 / 文件预览）、placeholder、table、group、sticker | 6 种，缺 file、table、sticker |
| 画布交互 | 1732 个交互点、约 144 个菜单项：撤销重做、复制粘贴、对齐吸附、选中工具栏、右键菜单、快捷键；边、小地图、背景画在 `<canvas>` 上 | 少量菜单，没有撤销重做和复制粘贴，用 xyflow 自带的边和小地图 |
| 画布模式 | 工具模式：select / hand / sticker；编辑模式：crop / outpaint / erase / redraw / move-object | 旧版的 4 种画布模式（其中 grid、storyboard 参照里没有） |
| 节点弹层 | 生成弹层、裁剪、超分、扩图、擦除、重绘、移动物体、重打光、多角度、图层拆分、抠图 | 只有裁剪和超分（超分走 `/api/edit/super-resolution`，没有 8K 档：平台按 4K 总像素封顶） |
| 聊天面板 | 约 4.6 万行：流式、markdown、思考块、工具卡、子 agent 块、提问栏、**工具确认卡**、**死循环防护卡**、上下文压缩提示、tiptap 输入框、会话标签、模型 / 模式 / Skill 选择器 | 约 1.6k 行；确认卡和防护卡**收到了却不显示**（用户看不到，agent 会一直等）；没有 markdown |
| 组件体系 | Base UI、701 个设计 token、i18n（中英各 7578 条） | 主线：普通 React + 自写样式、244 个 token、没有 i18n；`ui-wave-1` 已补齐 token、i18n 和基础组件 |
| 图标 | lucide 0.468.0 | 主线用 ^1.43，图标形状不一样；`ui-wave-1` 已钉到 0.468.0 |

**B（故意不做，界面给禁用态或不显示）**：
- 登录和账号；
- 团队、计费、积分；
- 内置浏览器；
- 插件节点（ComfyUI、3D 导演台、剪辑台）；
- 全景图节点；
- 开发者面板、遥测。

---

## 二、主进程

**A 还没做**：下面这些服务现在都是桩，只回最小值让界面能渲染。

| 服务 | 参照里做什么 |
|---|---|
| desktopSettings | 桌面设置读写（19–20 个方法） |
| log | 日志、导出 |
| notification | 系统通知 |
| trash / clipboard / skillExport | 废纸篓、剪贴板、技能导出 |
| projectArchive | 项目导入导出（打包 / 解包） |
| projectAssets（本地部分） | 项目共享素材库（25 个方法） |
| dataDirectory | 数据目录迁移 |
| custom-mcp / generic-connector | 自定义 MCP、连接器 |
| networkDiagnostics | 网络诊断 |
| assetCenter | 资产中心 |
| window 的关窗确认 | 有未保存内容时的确认 |
| fileHandlers | 文件关联打开 |

**B 故意不做**：
- team-account、team-operation、team-data-invalidation；
- updater（M10 用 Velopack 另做）；
- imBridge 的云端部分；
- comfyUiModelDownload；
- 云端 projectAssets；
- `__HILO_AUTH__`；
- 内置浏览器相关的 `browser:*` 通道。

**C 做了但行为不同**（M5）：

| 项 | 参照 | 我们 |
|---|---|---|
| 数据根目录 | `~/Movies/Hub`、`~/.hub`、userData `@hilo/desktop` | `~/Movies/蒜狸小助手`、`~/.ovhub`、自己的 userData（**有意**：不和同机的参照应用互相覆写） |
| 旧数据迁移 | 只有自己的 30 个 schema 迁移 | 从我们旧版迁移：每张画布迁成一个工作区；空画布、聊天记录、计划不迁 |
| 找不到工作区文件夹 | 弹「重新定位」对话框 | 直接新建空文件夹 |
| 工作区身份头 | gateway 校验，不一致回 409，缺失回 428，所有 HTTP 方法（OPTIONS 除外）都要 claim | 已照做并核对（码、响应体、`/ws` 1008 都一致）。两处不同：`/api/health*` 的 GET / HEAD 什么身份都没带时放行（旧界面等 gateway 就绪的探测不带身份，渲染层这一轮不改）；被拒的响应带 CORS 头（参照的中间件挂在 CORS 之前，被拒响应没有 CORS 头；我们要让渲染层读得到原因） |
| 画布写入围栏 | 整份保存画布要带 `x-hilo-canvas-writer-revision`，缺了 428 `CANVAS_WRITER_FENCE_REQUIRED`、旧实例 409 | 没做 |
| 工作区预算 | 默认 5，可配 3–20，支持环境变量覆盖 | 固定 5 |
| 关闭工作区 | 刷索引，15 秒终止追踪 | 只探一次活动状态 |
| opencode 启动失败 | 工作区状态 failed | 工作区保持可用，只有聊天标记失败（画布还能用） |
| 全局存储 | token 字段加密，有 v1–v30 迁移史 | 不加密，没有迁移史；默认值直接给 `hasEverLoggedIn` / `hasSelectedInterests` = true、`language` = zh |
| 删除项目 | 先写 journal | 先移到废纸篓再写 journal（废纸篓失败就什么都不改） |
| 新建窗口快捷键 | 未核对 | 猜的 Cmd/Ctrl+Shift+N |
| 多个 opencode 启动 | 未观察到 | 排队启动：多个 opencode 同时迁移共用的 `opencode.db` 会让第二个崩掉 |
| 开发时 gateway 的运行时 | Electron 以 Node 模式运行 | 系统 Node（better-sqlite3 的 ABI 问题），发布包仍用 Electron |

---

## 三、gateway

路由 119 / 466。共 75 个控制器：全部做完 11 个、部分 9 个、完全没做 55 个。明细见 [`gateway-api.md`](gateway-api.md)，没有 ✓ 的就是没做。

**做了一部分的控制器（A）**

| 控制器 | 进度 | 缺的主要是 |
|---|---|---|
| FilesController | 19/57 | 文件版本、项目素材锚点、提及搜索、目录操作等 |
| EditController | 8/23 | 增强、擦除字幕、口型同步、扩图 / 重绘 / 移动物体 / 擦除、图层拆分、抠图、语音识别（asr）、音频分离 |
| SpeechController | 5/6 | voice_isolation（人声提取，平台没有） |
| MusicController | 2/4 | 翻唱预处理、歌词生成 |
| InternalSessionController | 11/15 | 其余内部会话接口 |
| AssetPreviewController / PlanController / ChatAttachmentCdnController | 1/3、1/3、1/2 | 预览、计划读写、附件 CDN |
| SkillMarketController | 4/39 | 只做了纯本地的 4 条（导入、确认暂存安装、fork、删除前取路径）；其余是云端技能市场和创作者计划，归 B，见下 |

**完全没做的控制器，按「计划做（A）」和「范围外（B）」分开**。归类是按控制器名和用途判断的，动手前先去参照源码里确认：

- **A 计划做**：
  - TextVersionController（9，文本版本历史）
  - MemoryController（5）、MemoryCompactionController（8）
  - ProjectArchiveController（5）、ProjectArchiveActivityController（3）
  - LutsController（4）
  - CanvasReferencesController（3）
  - DagController（3）
  - CanvasGroupExecutorController（1）
  - SearchController（1）
  - ExportController（1）
  - MediaPreviewController（1）
  - NetworkDiagnosticsController（1）
  - HeartbeatController（1）
  - I18nController（1）
  - CustomMcpController（2）
  - AssetCenterController（31，本地部分待确认）
- **B 范围外**（账号、计费、团队、云端、插件、ComfyUI、浏览器、遥测）：
  - 团队、账号与计费：TeamController（31）、AccountController（7）、BillingController（6）、CreditController（3）、AuthController（3）、UserController（1）、AvatarController（3）、HubGroupController（4）
  - 云端项目与云端下发：CloudProjectController（9）、CloudFolderController（10）、SkillMarketController 余下 35 条（技能市场、市场运营、创作者计划投稿，全要云端账号；`market/uninstall` 虽是删本地目录，也只对市场装的技能有意义，一并不做）、ApolloConfigController、ClientConfigController、HubClientConfigController、HomeQuickStartConfigController、PopupController
  - ComfyUI：ComfyUiWorkflowController（23）、InternalComfyUiWorkflowController（5）、ComfyUiDesignProxyController（1）
  - 插件：PluginsController（6）、PluginConfigController（4）、PluginAgentController（4）、PluginPythonController（2）、PluginSdkController（1）、NodePackagesController（4）、PythonPackagesController（4）、DependenciesController（5）
  - 浏览器与连接器：BrowserController（1）、ConnectorPreparationController（1）、RemoteToolsController（2）、WebMediaController（1，yt-dlp）
  - 反馈、遥测与测试：FeedbackController（5）、RecentAutoFeedbackController（1）、LogUploadController（1）、ChatModelTraceController（2）、BenchmarkController（4）、TestAsyncController（3）、LaneController（4）、WatermarkController（1）

**C 做了但行为不同**

生成（M7）：

| 项 | 参照 | 我们 |
|---|---|---|
| 后端 | 各家云厂商后端（banana、seedream、kling、veo、seedance……），每家单独适配 | 统一走自建平台（`maas-media`）；调用方传的任何 vendor / model_id 都按模态**换成我们配的模型** |
| 模型目录 | 从云端拉，字段全 | 由本机配置生成：`backend` 固定为 `maas`，`display_name` 就是模型 id，参数表只到模态粒度 |
| 同步生成路由 | 严格 DTO；回后端的原生结果 | 严格 DTO 和结果形状已一致。`count` 收下但只出一张；`new_round` 收下不处理；调用方断开不中止任务（参照里图片、音频的非画布来源请求断开即中止） |
| 异步提交的请求体 | 同一套严格 DTO（`backend`、`filename` 必填，多余字段 400） | 不校验、原样保留：旧界面的出图不带 `backend` / `filename`；未知 `backend` 也收（参照回 400 `UNKNOWN_BACKEND`），全都落到我们的平台 |
| `@图片N` 引用词 | 生成路由的拦截器把提示词里的引用词编译成参考文件 | 没做，提示词原样发给平台 |
| 画布文本生成 `/api/generate/text` | 云端文本模型（按 `TEXT_MODELS` 认 `model_id`），异步任务 + 账本，重启能续；参考文本 / 图片 / 视频 / 音频都能带 | 同样写进文本节点、同样的请求 / 响应 / 错误文案；`model_id` 只认配置里的对话模型；进程内同步调用，没有账本，重启丢；视频和音频参考直接拒绝（平台的对话模型收不了）；参考文本以「【文本N】」贴在提示词前 |
| `/api/generate/metrics` | 各环节计数 | 形状一致；我们没有的环节（计费、落地重试、账本隔离）恒为 0，账上任务都算 `cloud_pending` |
| 任务未找到的提示语 | 按 `HILO_USER_LANG` 选中英文，没设时英文 | 没设时中文（主进程还没传 `HILO_USER_LANG`，界面默认中文） |
| 执行方式 | 查询时单次查平台；聊天停止后移交 | gateway 后台自己跑到结束，查询只读状态（结果一样，MCP 进程没了也能落地） |
| 排队 | 按模型并发上限排队 | 不排队，提交即运行；`/api/generation-queue/cancel` 是空操作 |
| 并发上限 | 云端下发 | `/api/v1/models/concurrency/limits` 回空列表（平台没有公布） |
| 取消 | 取消云端任务 | 平台任务停不了，只是不再落地，并撤掉占位卡 |
| 计费 | 预估积分、余额不足拦截、失败退款核对 | 全无，计费范围固定回 legacy |
| 任务修复重提 | 有（视频输入修复后换新任务） | 没有 |
| 多图输出 | 一次 N 张合成一个多图节点 | 不支持（我们的平台一次一张） |
| 原地替换已有节点 | 被替换的旧版本留一个隐藏节点 | 不留 |
| 占位卡的重试信息 | `retryPayload` 按媒体类型构造，加上 `popoverDraft` | `retryPayload` 是 `{mediaType, request}`，没有 `popoverDraft` |
| 音色 | 云端音色库，支持克隆和设计 | 配置里 `voice_map` 的参考音频 + 本机克隆的音色；没有预设音色和设计，见下面「语音」 |

编辑路由：

| 项 | 参照 | 我们 |
|---|---|---|
| ffmpeg 输入检查 | 不检查 `-i` 路径 | 拒绝网络协议、工作区外路径（按 realpath 比对）、`movie=` 源 |
| `preserve_source_canvas_node` | 只在 MCP 里处理 | gateway 也认 |
| 编辑失败 | 500 | 2xx + `{ok:false, error}`（MCP 两种都能处理） |
| 媒体分析 | 云端多模态模型，支持音频 | 用平台的对话模型；视频抽 6 帧；**音频拒绝** |
| 超分 | 图片 / 视频都上传云端 MPS 任务，档位词原样传 | 请求 / 响应 / 错误前缀已一致。图片目标尺寸按源图像素 + 4K 总像素预算算（平台只认精确 `size`），已经够大的图直接拒绝不打平台；认不出的档位按 2K；非图片 / 视频扩展名直接拒绝 |
| generate-text-messages | 用请求里指定的模型；`max_tokens` 照传 | 固定用 `chat_model`；`max_tokens` 最低 1024（推理模型要留出思考的额度，否则回空） |
| 表格重命名 | 只广播 | 同时写进 `canvas.json` |
| split-sub-images 的成员匹配 | 未核对 | `imageIds` 按节点 id 或资产 id 认，主图有 `groupId` 时只认同组的；`removed` = 拆出来的个数 |
| file-node 复用 | 只改形状 | 改形状，另外和 media-node 一样补来源边 |
| 资产对账（reconcile） | 细节未核对 | 认亲规则：同 inode，或唯一一个 (size, 快速指纹) 相同；多个相同只记候选。丢失比例检查只在记录 ≥10 条时生效。`evicted` 恒为 0（不自动清掉丢失的记录）。merge / locate / remove-missing 另发 `assets:changed` |
| 插件存储超限 | 未核对 | 400，文案我们写的；没有 comfyui 草稿的大限额 |

技能（SkillsController 8/8 + SkillMarketController 里的 4 条本地路由）：

| 项 | 参照 | 我们 |
|---|---|---|
| 目录 | 已装 `~/.hub/skills`，用户技能 `~/Movies/Hub/skills` | 已装 `~/.ovhub/skills`（`HUB_SKILLS_DIR`），用户技能 `~/Movies/蒜狸小助手/skills`（`HUB_USER_SKILLS_DIR`；`HILO_DATA_DIR` 覆盖时是 `<它>/user-skills`）。主进程把两个目录都传给 gateway，opencode 的 `skills.paths` 也两边都扫，同名用户的优先 |
| 默认开关来源 | `OPENCODE_CONFIG_DIR/base.json`，否则仓库里的 `config/opencode-v2/base.json` | `OPENCODE_CONFIG_DIR/base.json`，否则主进程同步出来的 `<hubRoot>/.config-v2/base.json` |
| `upload-check` | 技能有改动就打包传到云端 | 校验名字后直接回 `{ok:true}`，什么也不传 |
| `user/trash` 传 `skillType: "plugin"` | 解析用户插件的路径 | `{ok:false, error:"Plugins are not available"}`（没有插件） |
| 导入暂存目录 | 系统 tmp 下 `hilo-skill-staging/` | 系统 tmp 下 `ov-skill-staging/`，免得和同机另一个应用互相覆盖暂存的包 |
| 暂存 / 解压跨卷 | 直接 rename | rename 遇到 EXDEV 时退成复制再删 |
| `submission/stage`、`submission/save` | 创作者计划的投稿暂存和草稿保存（校验封面对象键、从云端拉分类表） | 不做（B），没有「新建 / 保存技能」的本地路由；用户技能靠导入、fork 或 agent 直接写目录 |
| `market/:name/preview*` | 下载市场技能到 tmp 预览 | 不做（B） |
| 多个工作区之间同步开关 | 主进程拿到 toggle 的 `userOverrides` 后广播 `POST /api/skills/permissions` | 路由有了，主进程还没广播（覆盖文件是共用的，其它工作区 gateway 重启后才看到） |

语音（`/api/speech/*`）：

平台的语音模型（indextts-2.5）是零样本的：音色就是一段参考音频，没有预设音色、没有训练式克隆，也没有从文字描述生成声音的模型。所以克隆在本机做完，设计回不可用。

| 项 | 参照 | 我们 |
|---|---|---|
| 克隆出的音色存哪 | 上游账号上，跨设备可用 | 应用级的本机音色表 `<HILO_DATA_DIR 或 ~/.ovhub>/voices/<voice_id>/`（`meta.json` + `reference.<ext>`），各工作区共用；换机器不跟着走 |
| 克隆做了什么 | 参考音频转 base64 发上游，上游训练并回 voice_id | 同样的预检（缺文件 / 超 20MB / 不是 mp3/m4a/wav，文案一致）后，把参考音频拷进音色表、发一个 `hub_<uuid>`；合成时按 id 换回这段音频，以 data URI 走平台的 `metadata.voice` |
| `prompt_audio_path` + `prompt_text` | 发上游提升相似度 | 只做同样的预检，不用（零样本合成只吃一段参考音频） |
| `need_noise_reduction` / `need_volume_normalization` / `aigc_watermark` | 上游处理 | 只收不用，参考音频原样登记 |
| 试听（`demo_text`） | 上游用 `demo_model` 合成 | 用配置里的语音模型合成（`demo_model` 只收不用），落到工作区根目录 `voice-clone-demo-<voice_id>.<ext>`，回绝对路径；试听合成失败整个克隆失败，音色表不留条目。两边都不登记资产、不上画布（参照的登记分支走不到） |
| 风控 | 回 `input_sensitive_type` | 没有风控，不回这个字段 |
| 没配语音模型 / 平台失败 | 上游错误：`{statusCode: 上游状态, message: 上游原文}` | 同样的形状：没配语音模型 503、配置读不了 503、平台失败 502 |
| 音色设计 | 上游按描述生成音色，回 `voice_id` + 试听；有 `source_node_id` 时挂占位卡 | 参数照样校验（`preview_text` ≤ 500 等），之后一律 501 `Voice design is not available: …`；不挂占位卡 |
| 积分预检、按会话取消 | 有 | 没有（不做计费；克隆几乎不耗时） |
| 相对路径猜错时按文件名在工作区里找 | 有（`resolveMedia` 的回退） | 没有：相对路径按工作区解析，越界 400 `Path traversal detected`；绝对路径照用 |
| `/api/speech/voices` | 上游音色目录（分页拉全） | `voice_map` 在前、本机克隆音色在后（同名时 `voice_map` 优先）；克隆音色的 `name` 是参考音频文件名，`description` 是 `Cloned from: <文件名>`，语言 / 性别等为空，所以 `voice_prepare` 的按语言搜索搜不到它们，直接拿克隆回的 voice_id 合成（MCP 对 `hub_` 开头的 id 不查目录） |
| 删除音色 | 没有接口 | 没有接口；手动删 `voices/<voice_id>/` 即可 |

聊天：
- 内容安全检查（`/api/safety/check-text`）一律放行。
- 计费范围固定回 legacy。
- 死循环防护和工具确认的后端都有，但界面不显示，见第一节。

---

## 四、MCP 工具

**A / B 没注册的 21 个**（原因写在 `app/mcp-tools/src/tools/unsupported.ts`）：
- ComfyUI × 10；
- `browser`、`connector_authorize`；
- `plugin_agent_*` × 3；
- `web_media`、`image_search`；
- `asset_center_search`、`asset_center_use_entity`；
- `media_transcribe`（平台没有语音识别）；
- `image_remove_background`（平台没有抠图）。

**C 做了但行为不同**：

工具描述、参数描述、输出 schema、错误和提示文案都已换成参照原文：`scripts/smoke/mcp-surface.mjs` 比 `tools/list`，`scripts/smoke/mcp-behavior.mjs` 按 `scripts/smoke/mcp-scenarios/*.json` 把同一组调用分别打给参照和我们的 MCP 逐字比。剩下的差异：
- agent 配置里点名了这 21 个没注册的工具（`base.json` 原样保留）：opencode 的 `agent.tools` 是任意键的开关表，多出的名字不报错；`app/mcp-tools/src/spec.test.ts` 保证每个都在 unsupported 里有原因。
- 模型选择器校验先解析别名（如 `banana_pro`）再比；参照直接比 model_id，而且出图那处传参顺序错了，实际从不拦截。我们的会拦。
- 音色列表拉取失败时退回空列表放行，参照是整次调用失败。
- `subtitle_format` 不覆盖非 `.srt` 的源文件。
- 记忆存在 `~/.ovhub/memory`。
- 附件观察上报（发往云端）不做。
- 工作区身份头从环境变量 `HILO_WORKSPACE_*` 读，有才带。

---

## 五、agent 配置与技能

用的是参照原文：开发时直接加载 `assets/agent-profiles/v2/config`，发布包里是 `agent-profiles/v2/config`；自带技能是 `assets/skills` 的 36 个原文。`wip/m8-agent-profiles` 上自己写的那套作废。

**C 做了但行为不同**：
- 多一张 `knowledge/vendors/platform-routing.md`：工具入参里的 vendor / model 只是接口词汇，各模态实际落到平台上配好的那个模型（qwen-image-pro、minimax-h3、minimax-music3、ace-step、indextts-2.5、swiftvr）。其余 vendor 卡是参照原文，描述的是参照的云端后端。
- `comfyui-agent` 原样保留（配置完整性检查要求它），但它的工具一个都没注册，派给它的活做不了。
- 技能：参照是登录后从云端技能市场同步到 `~/.hub/skills`；我们随包自带，主进程启动时铺到 `~/.ovhub/skills`（按 `meta.yaml` 的 `version` 整目录更新，不碰用户自己的技能）。没有技能市场、自动更新和白名单。

---

## 六、平台与模型（环境差异，不是代码问题）

| 能力 | 参照 | 我们的平台（dev 分组） |
|---|---|---|
| 图片 | 多家：banana、seedream、gpt-image、midjourney…… | qwen-image-pro（也拿来做图生图，是否支持改图待验证）、z-image |
| 视频 | MiniMax-H3、kling、veo、seedance、wan…… | minimax-h3-fl2va、minimax-h3-ref2va；请求的尺寸会被平台规整（1408×792 → 1344×768） |
| 音乐 | music-3.0、elevenlabs | minimax-music3、ace-step |
| 语音 | speech-2.8 预设音色 + 克隆 + 设计、seed-audio | indextts-2.5，只能用参考音频零样本克隆 |
| 语音识别、抠图、口型同步、画质增强、擦字幕 | 有 | 没有 |

---

## 七、打包与发布（M10，A）

| 项 | 参照 | 我们 |
|---|---|---|
| 安装与更新 | Velopack 安装包和更新 | 还没有：新栈没有安装包，发布的仍是旧 Rust + Tauri 版本 |
| 随包资源 | opencode、rg、ffmpeg、agent 配置、项目模板 | 没打进包里 |
| 原生模块 | 按 Electron 的 ABI 构建 | 只有系统 Node 的构建 |
| 旧栈 | — | `crates/`、`apps/desktop`（Tauri）、`apps/canvas-web`、旧 `mcp/` 还在仓库里 |
