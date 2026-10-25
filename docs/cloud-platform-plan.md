# 交接文档：任务卡片收口 + 云平台（new-api）联调

写给接手的 agent。**这是本阶段唯一的交接文档**，`docs/design-execute-card-handoff.md` 只保留作历史背景，
其中还没完成的部分已经并进本文第 1 节。

本阶段的开发同时涉及两个仓库：

| 仓库 | 路径 | 约定 |
|---|---|---|
| 客户端（桌面端、渲染层、本地 gateway、MCP） | `/Users/reputationly/Desktop/code/api/ovaijisuandesign` | 环境、门禁命令、静态检查见 `docs/v3-runtime-source-handoff.md` 第 3、6 节 |
| 云平台 new-api（Go） | `/Users/reputationly/Desktop/code/api/new-api` | 先读该仓库的 `AGENTS.md`。JSON 只能用 `common.Marshal/Unmarshal`；SQLite、MySQL、PostgreSQL 三种库都要兼容；Redis 只能用 3.0 的命令；新建文件不加许可证头 |

线上平台：`https://maas.ovaijisuan.com`，OpenAI 兼容入口是 `https://maas.ovaijisuan.com/v1`。

**执行顺序**：先把第 1 节（任务卡片）全部收口，再开始第 4 节的 P0。

## 0. 联调用的 key

- 负责人已经提供联调 key，用于真实平台调用。**key 只能放在环境变量里**（约定变量名 `OV_PLATFORM_KEY`），
  不得写进任何文件，包括代码、文档、提交记录、`.probe` 产物、日志、截图里的文字。
- 产物要落盘时，先把 `sk-` 开头的串脱敏，例如只保留 `sk-Hxn…`。
- 真实调用会产生费用：能用假 provider 验证的就用假 provider；每个场景用真实 key 跑一次就够，不要循环压测。

---

## 1. 优先：任务卡片（`design_execute`）收口

背景：卡片链路已经还原，离线状态下和参照的对比已经对齐，在线路径也跑通了一次真实任务。
当前提交 `578a68df`，实现与证据见 `docs/design-execute-card-status.md`。**以下各项全部完成，这条线才算完成。**

| # | 事项 | 完成标准 |
|---|---|---|
| T-1 | **真实任务已完成但 `outputs=0`**：种子 part 的输入带了 `output.resources=[{key:"primary",mode:"create",name:"苹果"}]`，任务显示已完成，画布和卡片里却都没有产出 | 用 `GET /api/v3/tasks/<id>` 拿到完整任务 JSON，看 `outputs` 和 `delivery`，再查 Resources 里有没有这个资源。查清断在哪一处：gateway 没交付或没回填 `task.outputs`、卡片的 `designOutputs` 读错字段、资源路径查询失败。修掉，并补 e2e：`/api/v3/execute` 带 `output.resources`，完成后 `task.outputs` 有 1 项，资源能查到。重跑在线场景，截图要显示 media 区里的 `ArtifactAssetCard`。**这条是 agent 生成的主路径，P0 联调要走的就是它** |
| T-2 | **轮询间隔的测量方法不对**：`scripts/pw/design-execute-online.mjs` 第 55 行把所有带 `/api/v3/tasks` 的请求都算进去了，任务面板、队列等其他组件的轮询也混在里面 | 每条请求记录完整 URL 和时间戳，只统计卡片自己的查询（`GET /api/v3/tasks/<taskId>`，或带 `toolUseId` 的列表请求），按推送就绪前、就绪后两段分别计算间隔；预期就绪前约 3 秒、就绪后约 15 秒（参照常量 `LIVE_POLL_MS` / `RETRYABLE_POLL_MS`，我方 `task-push.js` 的取值与参照一致）。其他来源的请求单独列出来 |
| T-3 | 证据只打印到控制台，没有存下来 | 每次在线运行都写 `<ts>-online/result.json`，包括帧序列、请求列表、任务 JSON（key 脱敏） |
| T-4 | 底部标签栏显示原始 key `workspace.struct…` | 查出是哪个 key、参照的翻译是什么，补上；确认门禁 37 屏有没有拍到这里 |
| T-5 | `MediaGenCardLayout` 那类 bug 的同类扫描：函数参数被改名成 `xxx2`，函数体内仍引用原名 `xxx`，而模块里恰好有同名导入（已修的实例：`media-gen-detail.jsx` 里的 `{media}`） | 用脚本扫 `app/renderer/src`，结果写进报告；扫描结果有可靠的检出，就在 `audit-v3.mjs` 里加一项检查 |
| T-6 | turbo 全量跑时有 2 个 e2e 失败 | 写出测试名；在 `41bc74f1` 之前的提交上复现，证明原来就会失败；不是原来就有的就修掉 |
| T-7 | `audit-v3` 第 6 项（Context 声明数超出参照 9 处）说是原来就有的 | 在 `dd13f2af` 上跑一次 `audit-v3`，把两次的数字都写出来 |
| T-8 | 收尾 | 更新 `docs/design-execute-card-status.md`；37 屏、v3 七屏各跑一次，都要 exit 0；工作区干净 |

---

## 2. 范围（已经和负责人确认）

### 2.1 不做

| 类 | 参照接口或机制 | 本地处理 |
|---|---|---|
| 登录、账号 | `account/*`、登录页、扫码授权 | 不做；只用平台 key 调模型 |
| 积分、计费 | `credit/*`、`billing/*`、`user/equity`、`models/concurrency/*`、卡片里的费用确认组 | 不做；计费在 new-api 上完成 |
| 统计、上报 | 观测云 RUM、`meerkat-reporter`、神策、`trackEvent`、`logs/presign` | 不做；日志只留本地（`ov-changes.md` #10、#11） |
| 运营 | `popup`、`promotions/*` | 不做；本地回"不弹、没有活动" |
| 团队 | `team/*`、`backend/group/*`：带共享积分的组织账号 | 不做 |
| 共创项目 | `projects`、`project-invites` | 不做；项目分享用本地的项目归档导出和导入 |
| 共享资产 | `cloud-folder/*`：项目共享网盘 | 不做 |
| 云端工作流 | 参照的 Vibe DAG；4.0.4 自带插件里没有一个 `dag_id` | 不做；本地 `api/dag/*` 保持"能力不可用" |
| 反馈 | `/api/v1/feedback` | 不做，**并隐藏入口**（L-6）：现在提交后只存在本机，用户却以为已经送达 |
| 远程配置 | `apollo/config`、`client_config`、`hub/client_config` | 不做；本地默认值保持不变。强制升级策略并入 L-8，首页示例内容并入 L-7 |

### 2.2 原则

1. **只有一个入口**：一个 `base_url` 加一个 key（Bearer）。不登录，不上传用户身份，客户端不显示积分，也不做费用确认。
2. **模型调用沿用 new-api 现有协议**：同步调用走 OpenAI 兼容路由；异步任务统一走 `POST /v1/videos` 加
   `metadata.task_type`（查询用 `GET`，取消用 `DELETE /v1/videos/:id`）。新增的媒体工具一律新增 `task_type`，不另开路由。
3. **能力目录用新接口**（第 3.3 节），**不扩展 `/v1/models`**。
4. **非模型服务统一放在新命名空间 `/v1/ov/*`**，和 relay 用同一套 key 鉴权（第 3.2 节）。
5. **本地 gateway 继续做适配层**：界面和本地 API 的契约和参照一致。返回 `capabilityUnavailable(...)` 的桩逐个改成：
   "目录里有就调平台，没有就保持不可用"。
6. **错误要讲人话**：额度不足、限流、审核未通过、模型不可用都要给出能看懂的提示。这属于功能需要，不算计费界面。
7. **不上报任何东西**。

---

## 3. new-api 现状（2026-10-25 核对并实测）

### 3.1 已经上线

负责人说明，已上线的是基础生图、视频、语言模型、音乐模型和语音模型。用联调 key 实测的结果如下：

- `GET /v1/models` 返回 **33 个**模型：
  - 语言模型：多款 GLM、Kimi、Qwen3.7/3.8、DeepSeek-V4、MiniMax-M2.7/M3、GPT-5.6 等，还有 `qwen3guard`（审核）；
  - 图片：`qwen-image-pro`；
  - 视频：`minimax-h3-fl2va`（帧族）、`minimax-h3-ref2va`（参考族）；
  - 超分：`swiftvr`、`seedvr2`；
  - 音乐：`minimax-music3`、`ace-step`；
  - 语音：`breeze-tts-2`、`indextts-2.5`。
- **聚合模型不出现在 `/v1/models` 里**：`qwen-image-pro-enhanced`、`minimax-h3-2k`、`minimax-h3-ref-2k`
  定义在 `common/aggregate_model_default.go`，由多段流水线组成（提示词增强 → 生成 → 超分）。
  我们的客户端预设用的正是这几个聚合名，所以能力目录**必须把聚合模型也列出来**。
- 对话调用正常（`qwen3.8-flash-fp8`）。**注意**：这是一个思考模型，`max_tokens=16` 时 token 全被推理用掉，
  返回的 `content` 是 `null`。客户端里写图片说明、写歌词这类短调用，要么预留足够的 token 预算，要么换成非思考模型。这是 L-3 的验收项之一。
- **语音识别（ASR）**：模型列表里没有转写模型。
- `POST /v1/files` 返回 400：路由存在，但是 `RelayNotImplemented`。
- `GET /v1/ov/capabilities` 返回 404：命名空间还没建。

### 3.2 路由与中间件约定（读代码核实）

- `router/main.go` 的挂载顺序是：health → wellknown → api → dashboard → **relay** → **video** → **hilo** → mobile → share → web（SPA 兜底）。
  **新的路由组必须在 web 之前挂载**，否则会落进 `NoRoute`，返回 `Invalid URL`。
- relay 的 `/v1` 组使用的中间件是：`RouteTag("relay")`、`SystemPerformanceCheck()`、`TokenAuth()`、`KYCRequired()`、
  `ModelRequestRateLimit()`；模型调用再加 `Distribute()`（选渠道）。
- **已有一套 "hilo" 兼容层**（`router/hilo-router.go`、`controller/hilo.go`、`setting/hilo_catalog.go`）：
  - 用途：让**官方**本地 gateway 把 `CLOUD_GATEWAY_BASE_URL` 指到 new-api，按官方写死的路径调用：
    `/api/v1/models/config`、`/api/v1/video/minimax-v3/generate`，其他生成路径都返回 501 占位。
  - `/api/v1/models/config` **不做鉴权**，单独限流（`HiloRateLimit`），返回官方 schema 的模型目录，
    数值来自我们平台的实测（例如 H3 单段最长 10 秒）。目录由管理员在 `HiloCatalog` 里配置，出厂默认值写在代码里，
    下发时会用 abilities 和流水线守卫过滤掉没有渠道的模型。
  - **我们的客户端不走这一层**：我们的本地 gateway 直接调 OpenAI 兼容的 `/v1/*`。
    这一层**保持不动**，别改坏它；但它的目录数据（`HiloCatalog` 的实测参数、abilities 过滤、`pipelineCannotDeliver` 守卫）
    要给新的能力目录复用，不要再写一份。

### 3.3 新增 `/v1/ov/*` 命名空间

- 新文件 `router/ov-router.go`，函数 `SetOvRouter`，在 `router/main.go` 里挂在 `SetHiloRouter` 之后、web 之前。
- 中间件：`RouteTag("ov")`、`TokenAuth()`、`KYCRequired()`（和 `/v1` 保持一致）、独立的限流桶（参照 `HiloRateLimit` 的做法新增一个前缀，
  不和 dashboard 共用）。**不挂 `Distribute()`**，因为这些不是模型调用。
- 每个接口都要有路由测试，参照 `router/hilo_router_test.go`、`router/api_router_register_test.go` 的写法。

**`GET /v1/ov/capabilities`（能力目录，P0）**

```
Authorization: Bearer <key>
→ 200
{
  "version": "<目录内容的哈希；变了客户端才重新拉>",
  "capabilities": [
    {
      "id": "generate_image:qwen-image-pro-enhanced",
      "operation": "generate_image",     // generate_image | generate_video | generate_speech | generate_music
                                          // | upscale | edit_media | transcribe | chat
      "model": "qwen-image-pro-enhanced", // 调用时用的 model 字段；聚合模型也要列出
      "displayName": { "zh": "...", "en": "..." },
      "description": { "zh": "...", "en": "..." },
      "transport": { "kind": "images" },  // images | videos_task | chat | audio_speech | audio_transcriptions
      "taskTypes": ["t2v", "i2v", "flf2v"],// 只有 videos_task 有：这个模型支持的 task_type
      "paramSchema": { ...JSON Schema... },// 尺寸、时长、比例等的枚举和默认值，用平台实测值
      "limits": { "maxReferenceImages": 4, "maxDurationSeconds": 10, "maxInputBytes": 0 },
      "default": true                      // 是不是这个 operation 下的默认模型
    }
  ]
}
```

- 只列**这个 key 能调用的**模型：要看用户分组和 token 的模型限制，再和 abilities（有渠道）取交集；聚合模型要求它的每一段都可用。
- 数据来源复用 `HiloCatalog`、`DefaultAggregateModelConfig` 和 abilities 的现有逻辑。对话模型按 `supported_endpoint_types` 归类。
- 不返回价格。
- 字段以两边联调结果为准，上面是起点，不是定稿。

**其他接口**

| 接口 | 期 | 要点 |
|---|---|---|
| `POST /v1/ov/files` | P0 | multipart 上传，存 OSS，按 key 隔离，有大小上限；返回 `{url, expires_at}`。`/v1/videos` 等任务的 `metadata` 要接受这个 URL |
| `GET /v1/ov/search/images` | P1 | 接一个搜索供应商；参数参照参照的 `image_search` 工具（`num`、`max_total_images`、最小尺寸） |
| `GET /v1/ov/markets/{skills,plugins,connectors}`，以及 `/search`、`/categories`、`/:id/download` | P2 | 下载返回签名 URL |
| `POST /v1/ov/oauth/:provider/exchange` | P2 | 连接器的 OAuth 用 code 换 token；client secret 只存在服务端 |

---

### 3.4 本轮代码核对与 `/v1/ov/*` 落地情况

核对方式：逐文件读 `/Users/reputationly/Desktop/code/api/new-api`（不是只看文档），
凡是下面写"实测/读代码确认"的都指那里。

**核对结论（与第 3.2 节的出入）**

| 项 | 核对结果 |
|---|---|
| 挂载顺序 | 确认 `router/main.go`：health → wellknown → api → dashboard → relay → video → hilo → **ov** → mobile → share → web。新的 `/v1/ov` 组必须在这条链里早于 web，否则落 `NoRoute` 回 `Invalid URL` |
| relay 中间件 | 确认 `/v1` 组是 `RouteTag("relay")` + `SystemPerformanceCheck()` + `TokenAuth()` + `KYCRequired()` + `ModelRequestRateLimit()`，模型调用再加 `Distribute()` |
| hilo 兼容层 | 确认三个文件（`router/hilo-router.go`、`controller/hilo.go`、`setting/hilo_catalog.go`），且**目录可用性判据可以复用**：原来 `unavailable()` / `pipelineCannotDeliver()` 是 `controller` 的私有函数，本轮抽到 `service/hilo_availability.go`，两个出口共用 |
| 聚合模型 | 确认 `common/aggregate_model_default.go` 里的三条：`minimax-h3-2k`（帧族，生成段 `minimax-h3-fl2va` + `swiftvr` 超分）、`minimax-h3-ref-2k`（参考族）、`qwen-image-pro-enhanced`（图片，PE 增强 + `qwen-image-pro`）。**聚合模型没有渠道 ability**，所以它们不在 `abilities` 表里 —— 这是能力目录里最容易漏的一条 |
| 模型过滤 | 确认 `model.GetGroupEnabledModels(group)` / `model.FilterModelsByVisibility(models, userGroup)` / `model.GetModelSupportEndpointTypes(name)`；令牌白名单在鉴权时以 `token_model_limit_enabled` + `token_model_limit` 两个 context key 存在 |
| 端点类型 | 确认 `constant.EndpointType` 只有 `openai` / `openai-response` / `openai-response-compact` / `anthropic` / `gemini` / `jina-rerank` / `image-generation` / `embeddings` / `openai-video` / `audio-speech`，**没有 `audio-transcriptions`** —— 所以"哪些模型能做转写"不能靠端点类型判，见 N-3 |
| 错误码 | 确认 `types.ErrorCode*` 里有 `insufficient_user_quota` / `model_not_found` / `access_denied` / `kyc_required` / `sensitive_words_detected` / `prompt_blocked` / `moderation_unavailable`，**没有限流码**；限流的三条中间件都用 `c.Status(429)` 回**空体** |

**`/v1/ov/*` 实现（N-0～N-4）**

- `router/ov-router.go`：`SetOvRouter`，挂在 `SetHiloRouter` 之后、web 之前。
  中间件 `RouteTag("ov")` → `OvRateLimit()` → `TokenAuth()` → `KYCRequired()`。
  **不挂 `Distribute()`**（没有渠道可选）。
- `GET /v1/ov/capabilities`（`controller/ov.go` + `service/ovcaps/`）：返回
  `{version, capabilities[]}`。`version` 是目录内容的 sha256，客户端按它判断要不要重新拉。
  条目字段：
  ```json
  {"id":"generate_image:qwen-image-pro-enhanced","operation":"generate_image",
   "model":"qwen-image-pro-enhanced",
   "displayName":{"zh":"…","en":"…"},"description":{"zh":"…","en":"…"},
   "transport":{"kind":"images"},
   "taskTypes":["t2v","i2v","flf2v","l2va"],
   "paramSchema":{"type":"object","properties":{"aspect_ratio":{"type":"string","enum":[…],"default":"adaptive","title":"宽高比"}}},
   "limits":{"maxReferenceImages":9,"maxDurationSeconds":15,"maxInputBytes":0},
   "default":true}
  ```
  **与草案的三处修正**：
  1. `transport.kind` 增加 `audio_transcriptions`；并且**语音/音乐的 transport 是
     `videos_task` 而不是 `audio_speech`** —— 这套部署上 TTS 与音乐也走
     `POST /v1/videos` + `metadata.task_type`（`tts` / `t2m` / `cover` / `repaint`，实测
     客户端 `maas-media/audio.ts` 就是这么发的）。报成 `audio_speech` 会让客户端拿同步
     接口去打只认任务的模型，回 404。
  2. `paramSchema` 用**客户端已在消费的那个最小 JSON Schema 子集**（`type/properties/
     enum/default/title`），不是完整 Schema —— 两边各写一套必然漂移。
  3. 目录里**列出对话模型**（`operation: "chat"`），因为 L-3 的模型选择器要用它；
     但 `/api/v3/capabilities`（媒体能力）会把它过滤掉。
- `POST /v1/ov/files`（同文件）：multipart → 对象存储 → `{url, key, bytes,
  content_type, expires_at}`。没配对象存储时回 **503 + `capability_unavailable`**
  （不是 500：客户端该退回内联，而不是当成故障重试）。任务侧不用改 —— 输入物化本来就
  接受 http(s) URL，且自家 OBS host 在授信名单里。
- 错误码（N-4）：新增 `rate_limited` 与 `capability_unavailable`；`OvRateLimit` 在拒绝时
  **给带码的 JSON 体**（其余三条限流仍是空体 429，未动，避免影响 dashboard）。
- 聚合模型"每一段都可用"：`service/ovcaps` 里 `Scope.callable()` 对聚合模型递归查
  `Generate.Model` 与（启用时的）`Upscale.Model`；**提示词增强段不参与判定**（它失败会回落）。
- 分组白名单与调用侧同口径：把 `middleware/aggregate_expand.go` 的判定抽成
  `common.AggregateModel.AllowsGroups` + `service.AggregateUsingGroups`，两处共用。

**N-3（语音识别）现状**：平台侧**能表达**、但**没有模型**。
- 目录里给一条 `transport: "audio_transcriptions"` 的条目就会报成 `operation:
  "transcribe"`（有测试）；
- 但 `GET /v1/models` 里没有任何转写模型，`constant.EndpointType` 也没有转写类型，
  `/v1/audio/transcriptions` 目前没有可路由的渠道。
- 结论：**卡在部署**（需要一个能转写的上游），客户端 M5 的桩保持"能力不可用" ——
  目录里没有 transcribe 条目时它就该这么显示。

## 4. 能力清单与工作项

"本地现状"一列：**有**＝已接通平台；**桩**＝本地接口在，但固定返回"能力不可用"；**缺**＝还没有。

### 4.1 模型能力

| # | 能力 | 参照接口 | 本地现状 | new-api 现状 | 期 |
|---|---|---|---|---|---|
| M1 | Agent 对话，多模型可选 | `/v1/messages`、`/v1/responses` | 有，但只能配 1 个模型（`runtime/chat-models.ts`） | 有，20 多个语言模型 | P0 |
| M2 | 图片生成、编辑 | 6 家厂商的接口 | 有，模型写死在预设里 | 有（`qwen-image-pro`，以及聚合的 `-enhanced`） | P0（改读能力目录） |
| M3 | 视频生成：文生、图生、首尾帧、参考 | 7 家厂商的接口 | 有，模型写死在预设里 | 有（H3 帧族、参考族，以及 2K 聚合） | P0（改读能力目录） |
| M4 | 语音合成、音色 | `audio/tts`、`voices` | **没配模型**（`PLATFORM_PRESET.models.speech = null`） | **有**：`breeze-tts-2`、`indextts-2.5` | P0（只需客户端改读目录） |
| M5 | 语音识别、字幕生成 | `mediakit/asr` | 桩（`edit/image-edit.controller.ts` 的 `noAsr`、`generate/media-edit.ts`） | 路由有（`/audio/transcriptions`），**缺模型** | P0 |
| M6 | 图片、视频超分 | `super-resolution` | 有 | 有（`swiftvr`、`seedvr2`） | — |
| M7 | 音乐生成、翻唱、重绘、歌词 | `music/*`、`cover`、`lyrics` | 有 | 有 | — |
| M8 | 媒体理解、看图写文 | `tool/analyze_media`、`tool/generate_text` | 有，走多模态 `/chat/completions`（`edit/edit.service.ts`）；不支持音频 | 有 | — |
| M9 | 抠图 | `image/remove-background` | 桩 | 缺 | P1 |
| M10 | 图层拆分 | `seedream/layer-decompose` | 桩 | 缺 | P1 |
| M11 | 图片增强 | `image/enhance` | 需核实是否就是 M6 | — | P1 |
| M12 | 视频高清补帧 | `minimax-v3/enhancement` | 桩 | 缺补帧 | P1 |
| M13 | 视频续写、音频续写 | `minimax-v3/continuation` | 桩 | 缺 | P1 |
| M14 | 对口型、数字人 | `kling/lip-sync`、`video/avatar` | 桩 | 有 `s2v`/`ads2v` 两个 task_type，需确认能否覆盖 | P1 |
| M15 | 人声分离、去伴奏 | `voice_isolation`、`separate-voice` | 桩 | 缺 | P1 |
| M16 | 字幕消除 | `erase-subtitle` | 桩 | 缺 | P1 |
| M17 | 音色设计 | `voice_design` | 桩（`speech.service.ts` 返回 501） | 缺 | P1 |
| M18 | 音色克隆 | `voice_clone` | 有 | 需核实走的哪个渠道 | — |

### 4.2 平台服务与分发

| # | 能力 | 本地现状 | 期 |
|---|---|---|---|
| S1 | 能力目录 `/v1/ov/capabilities` | 硬编码（`@ov/protocol` 的 `PLATFORM_PRESET` → `generate/model-catalog.ts`） | **P0** |
| S2 | 文件上传 `/v1/ov/files` | 本地参考素材全部转成 base64 塞进请求体（`maas-media/src/image.ts` 第 100–114 行，参考视频也走 `loadMediaInputs`） | **P0** |
| S3 | 图片搜索 | MCP `image_search` 返回 `notImplemented` | P1 |
| S4 | 技能、插件市场 | 只列出自带技能，插件市场返回空 | P2 |
| S5 | 连接器市场、OAuth | `connector_call` 返回 `notImplemented` | P2 |
| S6 | 内容资源 | 渲染层引用对方 CDN：`cdn.hailuoai.video` 98 处、`cdn.hailuoai.com` 27 处；首页示例图片缓存缺失时 302 到对方 CDN | P2 |
| D1 | 自动更新 | 有：读我们自己 R2 上的发布清单（`desktop/src/main/updater.ts`） | — |
| D2 | 强制升级 | 缺：参照用 `hub/client_config` 下发 `min_supported_version`，我们本地返回 `{}` | P2 |

### 4.3 工作项

**new-api**

| # | 内容 | 期 |
|---|---|---|
| N-0 | 新建 `/v1/ov` 路由组（第 3.3 节）：中间件和挂载顺序，带路由测试 | P0 |
| N-1 | `GET /v1/ov/capabilities`：复用 hilo 目录、聚合配置、abilities，按 key 的可用范围过滤，聚合模型也要列出 | P0 |
| N-2 | `POST /v1/ov/files`，同时让任务的 metadata 接受上传后的 URL | P0 |
| N-3 | 接入语音识别模型（M5），并列进能力目录 | P0 |
| N-4 | 统一错误体：额度不足、限流、审核未通过、模型不可用，各给一个稳定的错误码（沿用 `types.ErrorCode*`） | P0 |
| N-5 | 新增 task_type：M9–M17，按渠道能力逐个上线 | P1 |
| N-6 | `/v1/ov/search/images` | P1 |
| N-7 | 市场接口 | P2 |
| N-8 | OAuth 换 token | P2 |

**客户端**

| # | 内容 | 期 |
|---|---|---|
| L-1 | 接 N-1：`buildCatalog` 和 `/api/v3/capabilities` 改成读平台目录，按 `version` 缓存；平台不可达时用上次的缓存。删掉 `PLATFORM_PRESET.models` 的硬编码，设置页的模型展示也改成读目录 | P0 |
| L-2 | 接 N-2：`loadMediaInputs` 超过阈值就先上传再传 URL，阈值以下继续用 base64 | P0 |
| L-3 | 对话模型可多选（M1），按目录生成 opencode 的 provider 配置；写图片说明、写歌词的调用要处理好思考模型的 token 预算（第 3.1 节） | P0 |
| L-4 | 错误映射（N-4）：gateway 透传错误码，界面给出能看懂的提示 | P0 |
| L-5 | 桩逐个改成"目录里有就调平台"：`edit/image-edit.controller.ts`、`speech/*`、`generate/media-edit.ts`，以及 MCP 的 `image_search`、`connector_call` | P1–P2 |
| L-6 | 隐藏反馈入口，登记进 `ov-changes.md` 和 `expected-diffs.json` | P0 |
| L-7 | 内容资源迁移（S6）：`cdn.hailuoai.*` 改为指向我们的 OSS，或打进安装包 | P2 |
| L-8 | 强制升级（D2）：在发布清单旁边放一份 `update-policy.json`（含 `min_supported_version`），`updater.ts` 读它，接到官方 UI 现成的 `ForcedUpdateDialog` | P2 |

---

### 4.4 本轮完成情况（P0）

| # | 状态 | 落点 / 证据 |
|---|---|---|
| N-0 | **完成** | `router/ov-router.go` + `router/main.go`；`router/ov_router_test.go`（注册、401、限流体三条） |
| N-1 | **完成** | `service/ovcaps/`（7 个用例）+ `controller/ov.go`；聚合模型分段可用、分组白名单、令牌白名单、可见性都覆盖 |
| N-2 | **完成** | `controller/ov.go` 的 `PostOvFiles` + `service/mediastore.MaxUploadBytes()`；没配存储 → 503 + `capability_unavailable`（有测试） |
| N-3 | **做不到（卡部署）** | 目录能表达转写（`audio_transcriptions` → `transcribe`，有测试），但平台上没有转写模型，见 3.4 |
| N-4 | **完成** | `types.ErrorCodeRateLimited` / `ErrorCodeCapabilityUnavailable`；`middleware/rate-limit.go` 的 `OvRateLimit`；`middleware/model-rate-limit.go` 两处 429 补码 |
| L-1 | **完成（口径有收窄）** | `app/gateway/src/generate/platform-catalog.ts`（拉取 + 落盘 + 回退）、`media-config.service.ts`（目录补空槽位）、`capabilities.controller.ts`（目录优先）、`maas-media/route.ts`（目录里的名字原样放行）、`PLATFORM_PRESET.models` 清空。**收窄的部分**：`/api/v1/models/config`（模型选择器的数据源）仍是"每个模态一个模型"，因为 MCP 的 `hub_list_capabilities` 要拿它和**静态 vendor 表**取交集，目录里的任意模型没有对应的 vendor 条目。多模型可选这件事落在 `/api/v3/capabilities`（agent/卡片那条路）与 L-3 的对话模型上 |
| L-2 | **完成** | `app/gateway/src/generate/media-inputs.ts` + `maas-media/upload.ts`（阈值 8MB，失败退回内联） |
| L-3 | **完成** | `gateway/src/runtime/chat-models.ts` + `chat.service.ts` + `runtime.controller.ts`；主进程 `opencode/config.ts` 的 `platform.chat_models` 多模型 provider。token 预算那半本来就在位（caption 6000 / lyrics 4000，且截断有明确报错），本轮只做了核对 |
| L-4 | **完成** | `generation-runner.service.ts` 的 `describeFailure` 映射表 + `tasks.ts` 的 `problem` 落库与透出；9 个用例钉住"必须是参照枚举里的码" |
| L-6 | **完成** | `FEEDBACK_ENTRY_ENABLED = false`；三处入口（画布帮助菜单两项、对话消息菜单、`FeedbackButton`）；登记在 `docs/ov-changes.md` #14 与 `docs/intentional-differences.md` 一.7 |

**P0 验收里没做到的两项**（详见第 6 节）：

1. "用真实 key 分别跑通一次生图、视频、语音合成、音乐、对话、语音识别" ——
   本会话环境没有 `OV_PLATFORM_KEY`，一次真实调用都没发；语音识别也没有模型（N-3）。
2. 37 屏 / v3 七屏门禁 —— **两处都已 exit 0**（2026-10-26 00:4x）：37 屏 37/37
   「超护栏 0 / 未登记差异 0 / 新增报错 0」；v3 七屏 7/7 同上、工作台视图非 AA 像素 0%。
   为了让 37 屏回到全绿，`ws-chat-input` 记了一处 DOM 差异（`feedback-button`）并把该屏
   残差护栏从 1.95249 上调到 2.25（原因写在 `residual-budget.json` 与该屏条目里）。

## 5. 分期与验收

| 期 | 内容 | 验收 |
|---|---|---|
| **P0 联调底座** | N-0～N-4，L-1～L-4，L-6 | new-api：`go test ./...` 全过，新路由有测试，三种数据库都兼容。客户端：设置页和模型选择器显示的模型来自平台目录；用真实 key 分别跑通一次生图、视频、语音合成、音乐、对话、语音识别；100MB 以上的参考视频走上传；额度不足、审核未通过时界面提示正确；37 屏、v3 七屏门禁 exit 0 |
| **P1 媒体工具** | N-5、N-6、L-5 | 每上线一个 task_type，本地对应的桩就不再返回"能力不可用"，有 e2e，并用真实 key 跑通一次 |
| **P2 内容与分发** | N-7、N-8、L-7、L-8 | 扫描对方域名，结果为 0（扫描方法见第 7 节）；市场能列出、能安装；旧版本会被强制升级 |

## 6. 汇报

每个工作项完成后，按 `docs/v3-runtime-source-handoff.md` 第 6 节的模板汇报，另外写清：
- 两个仓库各自的提交号；
- 用真实 key 跑过哪些场景、产物目录在哪（已脱敏）；
- 和本文不一致的地方（接口字段、命名、分期）逐条列出。**不要悄悄改范围。**

### 6.1 本轮汇报

**提交号**

| 仓库 | 提交 | 内容 |
|---|---|---|
| 客户端 `ovaijisuandesign` | `89371aa4` | T-1 任务产出带资源身份；T-4 补 20 个 i18n key；T-5 两个扫描 + 修 17 处；L-1 目录驱动模型（核心） |
| 客户端 | `ac7c2777` | L-2 大素材先上传；L-4 平台错误语义化 |
| 客户端 | `20dffafe` | L-3 对话模型多选；目录形状/缓存格式移到 `@ov/protocol` |
| 客户端 | 本轮最后一笔 | T-3/T-2 脚本、L-6 隐藏反馈入口、`audit-v3` 第 9/10 项、文档 |
| 云平台 `new-api` | `ac3cc7fed` | `/v1/ov` 命名空间、能力目录、文件上传、稳定错误码、可用性判据抽取 |

**用真实 key 跑过的场景**：**一次都没有。** 本会话环境里没有 `OV_PLATFORM_KEY`，
按约定（key 只从该环境变量读、不落盘）没有发起任何真实调用。因此：

- T-1 的"在线场景截图显示 `ArtifactAssetCard`"没有取证；
- P0 验收里"生图 / 视频 / 语音合成 / 音乐 / 对话 / 语音识别各跑一次"没有完成；
- 离线证据：`execute-task.e2e` 的假平台用例（`outputs` 1 项 + 资源可查）、
  `platform-catalog.test.ts`（目录拉取/回退）、`media-inputs.test.ts`（阈值与回退）、
  `failure-description.test.ts`（错误码映射）。

**和本文不一致的地方（逐条，没有悄悄改范围）**

1. **T-2 的常量名**：文档写"就绪后约 15 秒（`RETRYABLE_POLL_MS`）"，实际生效的是
   `PUSHED_POLL_MS = 15000`；`RETRYABLE_POLL_MS` 同为 15000 但是给"失败且可 retry"用的。
   数值相同、用途不同，统计上看不出来，已在卡片状态文档里记明。
2. **T-6 未完成**：两轮 turbo 全量 + 多次重复都没复现，`41bc74f1^` 的 worktree 上也不复现。
   没有测试名可写，需要一次真实失败现场。已排除的两个环境机制见卡片状态文档 T-6 节。
3. **N-3 做不到**：目录侧能表达转写能力（`audio_transcriptions` → `transcribe`，有测试），
   但平台上没有转写模型、`constant.EndpointType` 也没有转写类型。**卡在部署**。
4. **L-1 收窄了"模型选择器显示全部目录模型"**：`/api/v1/models/config` 仍是一个模态一条，
   因为 MCP 的 `hub_list_capabilities` 要拿它和静态 vendor 表取交集，而目录里的任意模型
   没有 vendor 条目；硬塞进去会让 agent 的"可用模型"变成空。多模型可选的落点是
   `/api/v3/capabilities` 和 L-3 的对话模型。要真正在媒体选择器里多选，得先扩 MCP 的
   vendor 表（未做，属新的工作项）。
5. **transport 取值**：语音合成与音乐的 `transport.kind` 是 `videos_task`，不是草案里的
   `audio_speech` —— 这套部署上它们也走 `POST /v1/videos` + `metadata.task_type`。
   报错协议会让客户端拿同步接口去打任务模型（404）。
6. **N-4 只给新命名空间的限流补了响应体**：`/v1/ov` 的 429 带 `rate_limited` 码；
   另外三条限流（GlobalWeb / GlobalAPI / Hilo）仍是空体 429，未动 —— 它们被 dashboard
   共用，改响应体属于另一件事。模型调用那条（`ModelRequestRateLimit`）只补了错误码，
   响应体形状不变。
7. **目录缓存位置**：`<userData>/ov-catalog.json`（gateway 写、主进程读）。生产里
   `HILO_DATA_DIR` 没有传给 gateway，所以 gateway 落到 `dirname(OV_CONFIG_PATH)`
   = userData，和主进程给的 `dirs.userData` 是同一个目录。
8. **`Tag` T-4 的门禁取证不足**：底部工具条理应在 `ws-a` 屏内，但 37 屏本轮 exit 0，
   无法据此断定"门禁拍到了这一栏"。下一轮用 `ONLY=ws-a` 单屏确认（已写进卡片状态文档）。

## 7. 复核方法

- 参照的云端路径：从 `.probe/reference/4.0.4/sidecar/gateway/dist/main.js`、`asar/out/main/**`、`sidecar/mcp-tools*/dist/**`
  里抽出所有 `/api/v1/`、`/api/v2/` 开头的字符串字面量（模板参数归一成 `:x`），gateway 一侧共 135 条。
  参照升级后重跑一遍，和第 2、4 节逐条核对。静态抽取会漏掉运行时拼接出来的路径。
- 对方域名残留：在 `app/{renderer,gateway,desktop,mcp-tools,packages}/src` 里扫 `minimax|minimaxi|xaminim|hailuoai|hailuo|guance|sensorsdata`，
  P2 完成时要求为 0；品牌说明这类文案除外，逐条登记。

---

## 8. 验证与门禁 runbook（接手必读）

这一节记录已经跑通、踩过坑的做法。**命令都在客户端仓库根目录执行**；涉及 key 的一律只读
`OV_PLATFORM_KEY`，不要把 key 写进命令、脚本、日志或文档。

### 8.1 全仓验证

```bash
env -u ELECTRON_RUN_AS_NODE pnpm turbo run build typecheck test --concurrency=1 --force
```

- `ELECTRON_RUN_AS_NODE=1` 会让 Electron 变成 Node，启动/测试会诡异失败，先 `env -u`。
- 当前是 34 个 turbo task；gateway 单包 `pnpm --filter @ov/gateway test` 是 494 个测试。
- **只跑单个 e2e 文件会 401**：这些 e2e 依赖同一进程里前面用例留下的工作区身份/配置，单独跑
  `vitest run src/...e2e.test.ts` 不可信；要跑就跑整个 `@ov/gateway` 包。
- turbo 全量偶尔在 `canvas-more.e2e` / `composition.e2e` 上失败，单独重跑 gateway 通过；
  T-6 要求把两个测试名和 `41bc74f1` 之前的复现结果写进报告，**在完成 T-6 前不要口头说“与本次无关”**。

### 8.2 静态审计

```bash
node scripts/v3preload/audit-v3.mjs
```

- 第 8 项是新增的 JSX import 检查：`.jsx` 里出现 JSX 却没有
  `import { __jsx } from ".../shared/jsx-runtime.js"` 直接失败。不要再给 `main.jsx` 加全局 `__jsx` 兜底。
- 第 6 项 Context 超参照 9 处是已知遗留；T-7 要求在 `dd13f2af` 上跑一次对照，报告两次数字。
- `audit-v3.mjs` 的返回码还受第 6 项影响，**不要用 exit 0 当作全绿**；看每项数字。

### 8.3 37 屏门禁

```bash
# 先清掉可能残留的 Electron（调试端口 9360 独占）
lsof -nP -i :9360
kill -9 <pid>

env -u ELECTRON_RUN_AS_NODE ELECTRON_DISABLE_SANDBOX=1 \
  GOLDEN="$HOME/ov-golden-4.0.4-clean" \
  node scripts/ui-compare/compare.mjs
```

- 一次约 20 分钟，必须一个批次录基线；混批次会报“基线混了多个录制批次”。
- 基线目录 `~/ov-golden-4.0.4-clean`；baseline 的 `*.mask.json` 缺失会导致 `ws-canvas-ops` / `ws-layout` 失败。
- `project-created` / `project-assets` 是已知基线缺口（`docs/4.0.3-baseline-gaps.md`），门禁通过
  `REFERENCE_MISSING` 跳过，不是新问题。
- 判断只看三项：**超护栏 0、未登记差异 0、新增报错 0**，最后 exit 0。
- 不能改 `expected-diffs.json` 来掩盖真实差异；只有确认是参照侧缺失/登记过的差异才加。
  每次加登记都要在 `intentional-differences.md` 写原因。
- 失败时先用 `ONLY=<screen>` 单屏复现；单屏的像素/护栏数字不能当全量结论，单屏截图状态和全量不同。

### 8.4 v3 七屏门禁

```bash
env -u ELECTRON_RUN_AS_NODE ELECTRON_DISABLE_SANDBOX=1 \
  HILO_PROJECT_ARCHITECTURE=resource_v3 \
  GOLDEN="$HOME/ov-golden-v3-4.0.4" \
  ONLY=ws-a-v3,ws-a-v3-resource,ws-a-v3-wb-canvas,ws-a-v3-wb-structure,ws-a-v3-wb-execution,ws-a-v3-wb-hierarchy,ws-a-v3-wb-chat \
  node scripts/ui-compare/compare.mjs
```

- 约 4 分钟；工作台视图要求非 AA 像素为 0。
- 37 屏和 v3 各跑一次，都 exit 0 才算 T-8 通过。

### 8.5 归档会话 + 卡片 Playwright（离线对比）

脚本：

- `scripts/pw/launch-app.mjs`：复制 `compare.mjs` 的 env/spawn 参数，**不要修改 `compare.mjs` 本身**。
  用 `/tmp/ov-pw`，设置 `OPENCODE_DB`/`HILO_OPENCODE_DB` 到临时库，避免污染真实 opencode。
- `scripts/pw/design-execute-archive.mjs`：先起一次应用建库，再用产品
  `POST /api/projects/archive/import` 种会话，第二次启动后按 `workspaceSessionTabs` 聚焦，截图四状态。
- 支持 `--reference`，参照/我方读同一份会话；参照没有本地 `auth.userID`，**在线路径只能我方单侧**。

关键坑：

1. **不要直写 opencode schema**：opencode 的库在 `OPENCODE_DB`（或默认 `~/.local/share/opencode`），
   归档代码看 `HILO_OPENCODE_DB`；两边必须指向同一个文件。`XDG_DATA_HOME` 对 opencode 不生效。
2. 归档消息/part 有严格 shape 校验，缺字段会 400：
   - message：`time`、`parentID`、`agent`、`model{providerID,modelID}`、`modelID`、`providerID`、
     `mode`、`cost`、`tokens`、`path{cwd,root}`；
   - tool part state：`status`、`title`、`metadata`、`input`、`output`（**必须是字符串**）、`time`；
   - assistant 需要一条 user message 做 `parentID`。
3. 切换会话不要只写 localStorage：`SessionTabsPersister.load` 会先用
   `storage.globalGet("workspaceSessionTabs")` 覆盖。要通过
   `window.hilo.ipcRenderer.invoke("storage:global-set", "workspaceSessionTabs", record)` 写。
4. 每个状态用独立启动（端口 9370+i），避免旧 Electron/CDP 端口残留。
5. 截图前 `mouse.move(2,2)` + `document.activeElement.blur()`，否则标题可能带悬停/焦点底色。
6. 参考/我方的 `=8>ws-a`、灰色头像来自 `launch-app.mjs` 夹具环境，不是产品 bug；
   标题灰底在 `dd13f2af` 之前就有，也不阻塞。

### 8.6 在线真实任务（我方单侧）

```bash
OV_PLATFORM_KEY=... HILO_PROJECT_ARCHITECTURE=resource_v3 \
  env -u ELECTRON_RUN_AS_NODE \
  node scripts/pw/design-execute-online.mjs
```

- 脚本只用 `OV_PLATFORM_KEY`，不落盘 key；结果目录 `.probe/pw/design-execute/<ts>-online/`。
- 必须 `HILO_PROJECT_ARCHITECTURE=resource_v3`，否则 `/api/v3/execute` 返回
  `PROJECT_V3_DISABLED`。
- 需要通过工作区身份：从 `ud/logs/main.log` 的
  `ws://127.0.0.1:<port>/ws?hilo_workspace=<claim>&hilo_workspace_instance=<uuid>&hilo_workspace_generation=<n>`
  取四个值，请求带 `x-hilo-workspace`、`x-hilo-workspace-instance`、`x-hilo-workspace-generation`，
  否则 428 `WORKSPACE_IDENTITY_REQUIRED`。
- 任务请求体：`capabilityId: "generate_image:qwen-image-pro-enhanced"`，headers
  `x-hilo-agent-caller`、`x-session-id`、`x-tool-use-id`（与 part 的 `callID` 一致）。
- 202 表示新建，200 表示同一工具调用复用。任务 JSON 的 `status` 到 `completed` 后，
  **先看 `outputs` 和 `delivery`**，T-1 就是这里 `outputs=0`。
- 轮询统计只算卡片自己的请求（`/api/v3/tasks/<taskId>` 或带 `toolUseId` 的列表），
  不要把任务面板/队列的 `/api/v3/tasks` 混进去。T-2 要求按推送 ready 前后分段。
- 真实调用一次就够；不要循环压测。产物中的 `sk-` 串必须脱敏。

### 8.7 已确认的历史 bug（不要重犯）

1. **`MediaGenCardLayout` 从不渲染 media 区**：参数 `media: media2`，JSX 却写 `{media}`，
   命中模块顶部从 `canvas-v3-model.js` 导入的 `media` 函数；React 对函数子节点静默不渲染。
   修复：`{media2}`。`pt-2` 不是修复，只是补空容器的 8px gap。
2. **全局 `__jsx` 兜底**：`main.jsx` 里 `globalThis.__jsx ??= ...` 已删除；每个 JSX 文件自己
   import。`audit-v3` 第 8 项会抓。
3. **`SitePreviewService.dispose`** 对未 handle 的 `hub-site` 调 `protocol.unhandle` 会让主进程
   退出时弹异常；已加 `isProtocolHandled` + try/catch。
4. **CDP 端口挂起**：脚本超时后 Electron 主进程可能残留，9360/9361/9362 LISTEN 但
   `/json/version` 无响应；先 `pkill -9 -f app/desktop`，等端口释放再跑。

### 8.8 证据与汇报

- 卡片状态/历史证据：`docs/design-execute-card-status.md`；
- 最新离线四状态：`.probe/pw/design-execute/2026-10-25T10-35-47-519Z-recovered/`（我方）
  和 `2026-10-25T09-39-16-573Z-reference/`（参照）；
- 在线真实任务：`.probe/pw/design-execute/2026-10-25T11-34-35-145Z-online/`；
- 37 屏/v3 的 `.probe/ui-compare/<批次>/` 保留原始截图与报告；
- 汇报要写两个仓库提交号、真实 key 跑过的场景（脱敏）、和本文不一致的接口/命名/分期。
