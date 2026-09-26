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
| 视频（t2v / i2v / 首尾帧） | `hub_generate_video` | `vendor: MiniMax`，`model_id: MiniMax-H3` | `minimax-h3-fl2va` |
| 参考素材驱动的视频 | `hub_generate_video` + `mode: multimodal` | 同上 | `minimax-h3-ref2va` |
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

## 已知 bug

- 配置里没配的模态会直接报"未配置，这个能力不可用"。这不是临时故障，照原话告诉用户去设置里补，不要换参数重试。
- `z-image` 等其它出图模型只能由用户在画布的模型选择器里点选；工具的 `model_id` 不接受这些名字。
- 超分（`swiftvr`）只在画布界面上有入口，agent 没有对应工具；用户要放大时引导他在画布上操作。
- 翻唱 / 局部重绘音乐（`ace-step`）同样没有工具入口。

## Pointer

- 失败卡：`<knowledgeDir>/failures/`
