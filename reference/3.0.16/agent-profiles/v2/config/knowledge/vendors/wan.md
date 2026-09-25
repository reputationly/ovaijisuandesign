---
vendor: wan
modality: video
status: active
provider: alibaba
backend: wan
---

# wan -- video 后端卡片

## 能力

- `model_id`：`wan3.0-video`（默认，终稿）/ `wan3.0-video-prime`（高速版，草稿迭代）；两者 mode 和参数完全一致，切换只改 `model_id`。统一走 `wan_i2v` backend，不写 `model_id` 落到 `wan3.0-video`
- 强项：多素材参考、中文场景文化保真、real physics；弱项：cinematic 摄影机词汇、纯 T2V 审美上限。纯 T2V 且用户不指名 wan 时优先 seedance / veo / kling
- 输出最长 30s、30fps；参考视频 / 参考音频单段 1-15s，各自总时长 ≤15s

## Mode 与素材

| 意图 | `mode` | 素材 |
| --- | --- | --- |
| 文生视频 | `t2v` | 只有 prompt |
| 首帧生视频 | `i2v` | 只传 `first_frame_image` |
| 首尾帧 | `first-last-frame` | `first_frame_image` + 可选 `last_frame_image` |
| 参考生视频 | `multimodal` | `reference_image_paths` ≤10 / `reference_video_urls` ≤5 / `reference_audio_urls` ≤5，可组合 |
| 文件生视频 | `multimodal` | `vendor_params.file_url`（docx/pdf/pptx/xlsx/txt/md），可与 reference_* 组合 |
| 视频编辑 / 延长 | `multimodal` | `reference_video_urls`（或 `video_url`）+ prompt 写清编辑 / 延长意图 |

- 编辑 / 延长没有独立 mode，能力仍在：意图写进 prompt（编辑写清「把视频1 里的 X 改成 Y」，延长写清「接着 视频1 继续……」只写新增动作和收尾），不要回报「不支持」或换 vendor
- 传参考视频时 MCP 不下发 duration 默认值，输出长度跟随源片；要指定长度再显式传 `duration`
- 素材互斥（违反直接 FAILED 且扣额度）：首尾帧不能与 reference_* / `file_url` / `video_url` 混用；`last_frame_image` 必须配 `first_frame_image`；prompt 与素材至少一个；「首帧 + 风格参考」只能二选一

## 参数

- `duration`: `-1`（智能时长）或 `2..30`；`resolution`: `480P | 720P | 1080P`；`aspect_ratio`: `adaptive | 16:9 | 4:3 | 1:1 | 3:4 | 9:16`（默认 `adaptive`，延长时必须保持，显式传其它值会被上游拒绝）
- `generate_audio`（默认 true）、`prompt_extend`（默认 true）、`watermark`（默认 false）、`seed`: `-1` 或 `0..2147483647`
- 没有 `link_url` / `shot_type` / `audio_path`；音频一律走 `reference_audio_urls`，仅作参考不是口型同步，口播改走 kling avatar

## 调用约定

- I2V 的 subject 已被 image 锁定，prompt 预算花在动作 / 表演 / 情绪 / 微动作，不复述外观
- 用「图1」「视频1」「音频1」指代素材，图 / 视频 / 音频各自独立按传入顺序计数；多素材用编号不用形容词
- 中文 prompt 与英文同等优秀；没有 `[Camera command]` / cinematic 词汇语法，camera 靠 prompt 描述 + 首帧构图

## 已知 bug

- `mode=video-edit` / `video-extend` → 直接 error（这两个 mode 只属于 seedance）；wan 一律 `multimodal` + 参考视频
- `prompt_extend` 默认 true：精确控制的分镜 prompt 可能被改写跑偏，逐字执行显式传 false

## Pointer
→ <knowledgeDir>/failures/spoken-video.md（audio-led 口播：wan 不提供）  → <knowledgeDir>/failures/character-refs.md（多角色：wan3.0 multimodal 或 seedance / kling-omni）
