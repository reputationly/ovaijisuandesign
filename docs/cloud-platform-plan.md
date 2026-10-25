# 云平台（new-api）联调规划

产品里所有需要联网的能力，统一由我们自己的云平台 new-api（`https://maas.ovaijisuan.com/v1`）提供。
本文列出参照 4.0.4 的全部云端依赖，逐项定出做或不做；要做的，再写清楚由谁提供、怎么提供、按什么顺序做。

- 决策日期：2026-10-25，范围已和负责人逐项确认。
- 清单来源：从参照 4.0.4 的 gateway、主进程、MCP 包里静态抽取的云端路径，gateway 一侧共 **135 条**
  `/api/v1|v2/*`，抽取脚本的思路见第 7 节；同时对照了我们现在的实现，以及 new-api 的路由
  （`new-api/router/relay-router.go`、`video-router.go`）。
- **局限**：静态抽取会漏掉运行时拼接出来的路径；渲染层直连的外部地址只按 CDN 域名统计过。

## 1. 原则

1. **只有一个入口**：一个 `base_url` 加一个 API key（Bearer）。不登录、不建账号，客户端不上传用户身份。
   计费由 new-api 按 key 计算，客户端不显示积分、余额，也不做费用确认。
2. **模型能力全部沿用 new-api 现有协议**：
   - 同步调用走 OpenAI 兼容路由：`/chat/completions`、`/responses`、`/messages`、`/images/generations|edits`、
     `/audio/speech|transcriptions`、`/embeddings`；
   - 异步任务统一走 `POST /v1/videos` 加 `metadata.task_type`，查询用 `GET /v1/videos/:id`，取消用 `DELETE`。
     新增的媒体工具（抠图、分离、字幕消除等）**一律加新的 `task_type`**，不另开路由。
     这样渠道、计费、重试、内容审核都直接复用 new-api 现有机制，客户端的 `@ov/maas-media` 也只需按同一模式扩展。
3. **新增一个能力目录接口**，替代客户端写死的模型清单（见第 4 节）。**不扩展 `/v1/models`**，保持它的 OpenAI 兼容语义不变。
4. **非模型服务放在独立命名空间**（暂定 `/v1/ov/*`，和 relay 用同一套 key 鉴权；路径前缀在 new-api 侧最终确认）。
   下载类接口返回带有效期的签名 URL。
5. **本地 gateway 继续做适配层**：界面和本地 API 的契约和参照保持一致。现在返回 `capabilityUnavailable(...)` 的接口逐个改为：
   先查能力目录，目录里有就调平台，没有就保持"能力不可用"。平台还没上线的能力因此可以先维持现状，不阻塞别的工作。
6. **报错要能看懂**：额度不足、限流、内容审核未通过、模型下线这些 new-api 错误，要映射成用户能看懂的提示。
   这属于功能需要，和计费界面无关。
7. **不上报任何东西**：日志只留本地，不加埋点。

## 2. 明确不做

| 类 | 参照接口或机制 | 本地处理 |
|---|---|---|
| 登录、账号 | `account/*`（资料、注销、hailuo-web）、登录页、扫码授权 | 不做；用 key 鉴权 |
| 积分、计费 | `credit/*`、`billing/*`、`user/equity`、`models/concurrency/*`、任务卡片的费用确认组 | 不做；本地回空钱包等默认值（`cloud-config/cloud-defaults.ts`） |
| 统计、上报 | 观测云 RUM、`data.hailuoai.com/meerkat-reporter`、神策、`trackEvent`、`logs/presign` | 不做；见 `ov-changes.md` #10、#11 |
| 运营 | `popup`、`promotions/*`、`billing/promotion` | 不做；本地回"不弹、没有活动" |
| 团队 | `team/*`、`backend/group/*`、`group/member/details`：带共享积分的组织账号、成员额度 | 不做；依赖账号和计费 |
| 共创项目 | `projects`、`project-invites`：云端项目、成员邀请与管理 | 不做；项目分享用本地的项目归档导出和导入 |
| 共享资产 | `cloud-folder/*`：项目共享网盘，含上传审核、配额 | 不做 |
| 云端工作流 | 参照的 Vibe DAG（`/vibe/dag/{id}/run`）；4.0.4 自带插件里没有一个 `dag_id` | 不做；本地 `api/dag/*` 保持"能力不可用"（`dag/dag.module.ts`） |
| 反馈 | `/api/v1/feedback` | 不做；**同时隐藏入口**（见第 5 节 L-6）：现在提交后只存在本机，用户却以为已经送达 |
| 远程配置 | `apollo/config`、`client_config`、`hub/client_config` | 不做；本地默认值保持不变。其中两块属于功能需要，并入别的项：强制升级策略并入 P2-3，首页示例内容并入 P2-2 |

## 3. 要做的能力

"本地现状"一列：**有**＝已接通平台；**桩**＝本地接口在，但固定返回"能力不可用"；**缺**＝还没有。

### 3.1 模型能力（走 new-api 现有协议）

| # | 能力 | 参照接口 | 本地现状 | new-api 现状 | 期 |
|---|---|---|---|---|---|
| M1 | Agent 对话，多个模型可选 | `/v1/messages`、`/v1/responses` | 有，但**只能配 1 个模型**（`runtime/chat-models.ts` 的 `chatModelIds`） | 有 chat、responses、messages | P0 |
| M2 | 图片生成、编辑 | 6 家厂商的 image 接口 | 有，模型来自预设（qwen） | 有 | P0（接能力目录） |
| M3 | 视频生成：文生、图生、首尾帧、参考 | 7 家厂商的 video 接口 | 有，模型来自预设（minimax-h3） | 有，`t2v`/`i2v`/`flf2v`/`r2v` 等 | P0（接能力目录） |
| M4 | 语音合成、音色列表 | `audio/tts`、`voices` | **没配模型**（`PLATFORM_PRESET.models.speech = null`） | 有 `tts` | P0 |
| M5 | 语音识别、字幕生成 | `mediakit/asr` | 桩（`edit/image-edit.controller.ts` 的 `noAsr`；`generate/media-edit.ts` 的转写） | 路由有 `/audio/transcriptions`，缺渠道 | P0 |
| M6 | 图片超分 | `super-resolution` | 有（swiftvr，task_type `sr`） | 有 | — |
| M7 | 音乐生成、翻唱、重绘、歌词 | `music/*`、`cover`、`lyrics` | 有 | 有 `t2m`/`cover`/`repaint`；歌词走 chat | — |
| M8 | 媒体理解、看图写文 | `tool/analyze_media`、`tool/generate_text` | 有：走平台的多模态 `/chat/completions`（`edit/edit.service.ts`）；音频理解不支持 | 有 | — |
| M9 | 抠图 | `image/remove-background` | 桩 | 缺 | P1 |
| M10 | 图层拆分 | `image/seedream/layer-decompose` | 桩 | 缺 | P1 |
| M11 | 图片增强 | `image/enhance` | 需核实是否等同 M6 | — | P1 |
| M12 | 视频高清补帧 | `video/minimax-v3/enhancement` | 桩 | 缺补帧，有超分 | P1 |
| M13 | 视频续写、音频续写 | `minimax-v3/continuation`、`audio/minimax-v3/continuation` | 桩 | 缺 | P1 |
| M14 | 对口型、数字人 | `kling/lip-sync`、`video/avatar` | 桩 | 有 `s2v`/`ads2v`，需确认是否能覆盖 | P1 |
| M15 | 人声分离、去伴奏 | `voice_isolation`、`mediakit/separate-voice` | 桩（`speech.controller.ts`、`image-edit.controller.ts`） | 缺 | P1 |
| M16 | 字幕消除 | `mediakit/erase-subtitle` | 桩 | 缺 | P1 |
| M17 | 音色设计（文字描述生成声音） | `voice_design` | 桩（`speech.service.ts` 返回 501） | 缺 | P1 |
| M18 | 音色克隆 | `voice_clone` | 有 | 需核实走的哪个渠道 | — |

### 3.2 平台服务（放在 `/v1/ov/*`）

| # | 能力 | 为什么需要 | 本地现状 | new-api 现状 | 期 |
|---|---|---|---|---|---|
| S1 | **能力目录** | 现在每种模态只能用写死的一个模型；平台上了新模型，客户端也看不到 | 硬编码（`@ov/protocol` 的 `PLATFORM_PRESET` → `generate/model-catalog.ts` 的 `buildCatalog`） | 缺 | **P0** |
| S2 | **文件上传** | 本地参考素材现在全部转成 base64 data URI 塞进请求体（`maas-media/src/image.ts` 第 100–114 行，参考视频也走 `loadMediaInputs`）；大视频会撑大请求，超出平台的请求体上限 | 缺 | `/v1/files` 是 `RelayNotImplemented` | **P0** |
| S3 | 图片搜索 | MCP `image_search` 工具 | `notImplemented`（`mcp-tools/src/tools/v3-tools.ts`） | 缺 | P1 |
| S4 | 技能、插件市场：列表、搜索、分类、下载 | 市场内容 | 只列出自带技能，插件市场返回空（`skills/skills.controller.ts`） | 缺 | P2 |
| S5 | 连接器市场、OAuth 换 token | `connector_call`；OAuth 的 client secret 只能放在服务端 | `notImplemented` | 缺 | P2 |
| S6 | 内容资源 | 首页示例（8 个分区、165 条）、引导图、示例项目。渲染层还有 **98 处** `cdn.hailuoai.video`、**27 处** `cdn.hailuoai.com` 引用；首页示例的图片在本地缓存缺失时会 302 到对方 CDN | 直接连对方 CDN | 缺；建议放我们自己的 OSS | P2 |

### 3.3 分发（不放在 new-api）

| # | 能力 | 本地现状 | 期 |
|---|---|---|---|
| D1 | 自动更新 | 有：`desktop/src/main/updater.ts` 读我们自己 R2 上的 `latest-mac.yml`/`latest.yml`（`scripts/release-desktop.py` 发布时写入） | — |
| D2 | 强制升级、最低支持版本 | 缺。参照通过 `hub/client_config` 的 `min_supported_version` 下发；我们本地返回 `{}`。平台接口变了以后，旧客户端会坏，也没法提示用户升级 | P2 |

## 4. 能力目录接口（S1）草案

**目标**：客户端不再有 `PLATFORM_PRESET.models` 这种硬编码；界面显示什么、隐藏什么，都由目录决定。平台上线新模型，客户端不用发版。

```
GET /v1/ov/capabilities            Authorization: Bearer <key>
→ 200
{
  "version": "<目录版本，变了客户端才重新拉>",
  "capabilities": [
    {
      "id": "generate_image:qwen-image-pro-enhanced",
      "operation": "generate_image",          // generate_image | generate_video | generate_speech | generate_music
                                               // | edit_media | transcribe | chat | ...
      "model": "qwen-image-pro-enhanced",      // 调用时用的 model 字段
      "displayName": { "zh": "...", "en": "..." },
      "description": { "zh": "...", "en": "..." },
      "transport": { "kind": "images" }        // images | videos_task(+task_type) | chat | audio_speech | audio_transcriptions
      "taskTypes": ["t2i", "i2i"],             // 仅 videos_task：这个模型支持的 task_type
      "paramSchema": { ... JSON Schema ... },  // 尺寸、时长、比例等的枚举与默认值
      "limits": { "maxReferenceImages": 4, "maxDurationSeconds": 10, "maxInputBytes": ... },
      "tags": ["default"]                      // 某个 operation 下的默认模型
    }
  ]
}
```

- 只返回**这个 key 有权限调用**的模型，渠道分组、模型限制都按 new-api 现有规则计算。
- 不返回价格。
- 本地 gateway：`generate/model-catalog.ts` 和 `generate/capabilities.controller.ts` 改成读这个接口，按 `version` 缓存；
  平台不可达时用上一次的缓存，不退回硬编码。对话模型清单（M1）也从这里来。
- 字段最终以两边联调结果为准；上表是起点，不是定稿。

## 5. 工作项

### new-api 侧

| # | 内容 | 期 |
|---|---|---|
| N-1 | `GET /v1/ov/capabilities`（第 4 节），带测试 | P0 |
| N-2 | 文件上传：`POST /v1/ov/files`（multipart，返回带有效期的 URL），存 OSS，按 key 隔离并设大小上限；视频、音频任务的 `metadata` 接受这个 URL | P0 |
| N-3 | 接通语音合成（M4）和语音识别（M5）的渠道，并进目录 | P0 |
| N-4 | 统一错误体：额度不足、限流、审核未通过、模型不可用，各给一个稳定的错误码 | P0 |
| N-5 | 新增 `task_type`：抠图、图层拆分、补帧、续写、人声分离、字幕消除、音色设计（M9–M17），按渠道能力逐个上线 | P1 |
| N-6 | `GET /v1/ov/search/images`（S3），接一个搜索供应商 | P1 |
| N-7 | 市场：`/v1/ov/markets/{skills,plugins,connectors}` 的列表、搜索、分类，下载返回签名 URL（S4） | P2 |
| N-8 | `POST /v1/ov/oauth/{provider}/exchange`（S5），client secret 只存在服务端 | P2 |

### 本地侧（客户端和本地 gateway）

| # | 内容 | 期 |
|---|---|---|
| L-1 | 接 N-1：`buildCatalog` 和 `/api/v3/capabilities` 改为读平台目录并缓存；删掉 `PLATFORM_PRESET.models` 的硬编码；设置页的模型展示也改读目录 | P0 |
| L-2 | 接 N-2：`maas-media` 的 `loadMediaInputs` 超过阈值就先上传再传 URL，阈值以下继续用 base64 | P0 |
| L-3 | 对话模型可以多选（M1），opencode 的 provider 配置按目录生成 | P0 |
| L-4 | 错误映射（N-4）：gateway 透传错误码，界面显示能看懂的提示 | P0 |
| L-5 | 现有桩逐个改为"目录里有就调平台"：`edit/image-edit.controller.ts`、`speech/*`、`generate/media-edit.ts`，以及 MCP 的 `image_search`、`connector_call` | P1–P2 |
| L-6 | 隐藏反馈入口，并登记进 `ov-changes.md` 和门禁的 `expected-diffs.json` | P0 |
| L-7 | 内容资源迁移（S6）：渲染层的 `cdn.hailuoai.*` 引用改为指向我们的 OSS，或打进安装包；首页示例素材的 302 回源也改到我们的 OSS | P2 |
| L-8 | 强制升级（D2）：在发布清单旁边放一份 `update-policy.json`（含 `min_supported_version`），由 `updater.ts` 读取并接到官方 UI 现成的 `ForcedUpdateDialog` | P2 |

## 6. 分期与验收

| 期 | 内容 | 验收 |
|---|---|---|
| **P0 联调底座** | N-1～N-4，L-1～L-4，L-6 | 用真实 key 跑通：设置页显示平台目录里的模型；图片、视频、语音、对话各生成一次；100MB 以上的参考视频走上传；额度不足、审核未通过时界面提示正确；37 屏和 v3 七屏门禁 exit 0 |
| **P1 媒体工具** | N-5、N-6、L-5 | 每上线一个 `task_type`，本地对应的桩就不再返回"能力不可用"，有 e2e，并用真实 key 跑通一次 |
| **P2 内容与分发** | N-7、N-8、L-7、L-8 | 渲染层、gateway、主进程里不再有对方的域名（用脚本扫描，结果为 0）；市场能列出、能安装；旧版本能被强制升级 |

## 7. 复核方法

- 参照的云端路径：在 `.probe/reference/4.0.4/sidecar/gateway/dist/main.js` 和 `asar/out/main/**`、`sidecar/mcp-tools*/dist/**` 里，
  抽出所有以 `/api/v1/`、`/api/v2/` 开头的字符串字面量（模板参数归一成 `:x`）。参照升级后重跑一遍，和本文第 2、3 节逐条核对。
- 对方域名残留：在 `app/{renderer,gateway,desktop,mcp-tools,packages}/src` 里扫 `minimax|minimaxi|xaminim|hailuoai|hailuo|guance|sensorsdata`。
  P2 完成时要求为 0；品牌说明这类文案除外，逐条登记。
