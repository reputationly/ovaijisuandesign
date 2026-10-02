---
vendor: platform-routing
modality: all
status: active
provider: platform
backend: maas
---

# platform-routing -- 平台模型路由总表

## 能力

本平台只有一个自建 OpenAI 兼容端点。工具入参里的 `vendor` / `model_id` / `model_name` 只是接口词汇：gateway 按模态把它们换成用户在设置里配好的那个模型，结果里会注明是否发生了替换。所以挑 vendor 不改变画质，只决定工具侧的参数校验走哪一套。

| 模态 | 工具 | 推荐入参 | 平台模型 |
|---|---|---|---|
| 文生图 | `hub_generate_image` | `vendor: banana`，不传 `model_id` | `qwen-image-pro-enhanced`（或用户配的 `qwen-image-pro`） |
| 图生图 / 编辑 | `hub_generate_image` + `image_paths` | 同上 | 配了编辑模型就用它，否则同一个出图模型 |
| **文生视频（标准路径：先出首帧图）** | ① `hub_generate_image` 出首帧 → ② `hub_generate_video` + `first_frame_image` | 图：`vendor: banana`；视频：`vendor: MiniMax`，`model_id: MiniMax-H3`，`mode: i2v` | 图 `qwen-image-pro-enhanced`；视频 `minimax-h3-2k` |
| 参考素材驱动的视频（有分镜 / 人物 / 场景图） | `hub_generate_video` + `mode: multimodal` + `reference_image_paths` | `vendor: MiniMax`，`model_id: MiniMax-H3` | `minimax-h3-ref-2k`（或 `minimax-h3-ref2va`） |
| 文生音乐 | `hub_generate_audio_music` | 不传 `vendor`，`model_id: music-3.0` | `minimax-music3` |
| 语音 | `hub_generate_audio_speech` | 不传 `vendor`，`model_name: speech-2.8-hd` | `indextts-2.5`（零样本克隆） |

细节见同目录的 `banana.md`、`minimax.md`、`official-music.md`、`moss.md`。

## 调用约定

- `hub_list_capabilities` 仍是运行时依据；但它返回的某个模态 `vendors` 为空时，不代表没有模型，按上表调用即可。
- 给用户看的模型名只用模型选择器里的名字（就是上表"平台模型"一列），不要说 banana、MiniMax-H3 这类接口词。
- 平台没有公布并发上限，`task_concurrency` 通常为空；视频一次别同时挂太多任务（5 个以内）。
- 所有生成都要真实计费：失败结果带 `do_not_resubmit` 时不要重发。
- 出图模型是 `qwen-image-pro-enhanced` 时，平台会先把提示词按 Qwen-Image 的规则改写增强，再出图；
  没传比例（`aspect_ratio` 为空或 `adaptive`）时还会按内容自己定画幅（2K 档）。所以：
  - 用户没指定比例就**不要**替他选比例，留给平台定；用户说了横版 / 竖版 / 具体比例再传。
  - 提示词写清楚要画什么、画面里要出现的文字原样写出即可，不必自己堆砌摄影参数和长描述，改写会做这件事。
  - 改图时底图会一起交给改写模型看，描述只写要改的地方和要保留的东西。
  - 单张耗时比裸模型多约 1 分钟（改写 + 出图），一次别同时挂太多张。
- **视频生成的标准流程是「先出图、再图生视频」，不要直接发 `mode: t2v`。** 平台的视频通道只吃图：
  底层只有首尾帧族（fl2va）和参考族（ref2va）两个 checkpoint，没有独立的文生视频通道；
  `minimax-h3-2k` 直发 t2v 未验证可用。所以：
  1. 先 `hub_generate_image` 按**目标视频的比例**出首帧图（要 16:9 的视频就出 16:9 的图——
     视频比例由首帧图决定，生成视频时不要再传 `aspect_ratio`）。
  2. 再 `hub_generate_video`：`vendor: MiniMax`、`model_id: MiniMax-H3`、`mode: i2v`、
     `first_frame_image: <上一步的图>`。画布上会先出现图片卡、再出现视频卡，用户可以先把图迭代满意再生成。
  3. 一镜到底短片：图里把首帧构图画对即可，运镜和动态写进视频提示词。
- 视频模型是 `minimax-h3-2k` / `minimax-h3-ref-2k` 时，平台会先改写提示词，在 768P 生成，再自动超分到 2K 交付：
  - 用户要的清晰度 / 分辨率不用再传，成片就是 2K；首尾帧 / 参考图路径下比例由输入图决定。
  - 单条耗时是裸模型的几倍（改写 + 生成 + 超分），计费也按三段合计；并发更要收着（3 条以内）。

## 已知 bug

- 配置里没配的模态会直接报"未配置，这个能力不可用"。这不是临时故障，照原话告诉用户去设置里补，不要换参数重试。
- 直发 `mode: t2v`（不带图）平台实测可用（2026-10-02，约 25-30 分钟出片），但**除非用户明确要求跳过出图，一律走「先出首帧图再 i2v」的标准路径**：画布先有图卡可以迭代，与官方产品的图卡 → 视频卡形态一致。`hub_list_capabilities` 的静态元数据里 MiniMax-H3 标的 t2v 是官方自家模型的能力，参数规则以本卡为准。
- `z-image` 等其它出图模型只能由用户在画布的模型选择器里点选；工具的 `model_id` 不接受这些名字。
- 超分（`swiftvr`）只在画布界面上有入口，agent 没有对应工具；用户要放大时引导他在画布上操作。
- 翻唱 / 局部重绘音乐（`ace-step`）同样没有工具入口。

## Pointer

- 失败卡：`<knowledgeDir>/failures/`
