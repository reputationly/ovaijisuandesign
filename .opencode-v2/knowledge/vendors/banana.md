---
vendor: banana
modality: image
status: active
provider: platform
backend: maas
---

# banana -- image 路由卡片（平台模型 qwen-image-pro）

## 能力

- 文生图：没有 `image_paths` 时走同步出图接口，一次一张，几十秒出结果，最长等 5 分钟。
- 图生图 / 编辑：带 `image_paths` 时走编辑接口，最多 10 张输入图；增删物体、换背景、改画风、上色、加文字都算这一类。
- 尺寸由 `vendor_params.aspect_ratio` + `vendor_params.resolution` 算出：`1K` 短边 1024，`2K` 短边 1440，长边按比例推并取 8 的倍数。比例可选 `1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`16:9`、`9:16`、`21:9`、`4:5`、`5:4`。
- 多张同比例备选用顶层 `count` + `prompts[]`，每张一次独立请求。

## 调用约定

- 传 `vendor: "banana"`，不传 `model_id`（缺省就会落到平台配的模型）。
- `vendor_params` 只放 `aspect_ratio` 和 `resolution`；`resolution` 只用 `1K` / `2K`，画面里有小字或细节密集时选 `2K`。`4K` 工具虽收，但平台没验证过，不要用。
- 比例永远显式给；不知道就问，不要默认方图。
- 编辑时平台**不接受尺寸**，成图画幅跟随第一张输入图。所以编辑请求的 `aspect_ratio` 要填源图实测后的最近比例，`aspect_ratio_source: source_ref`，并在 `aspect_ratio_evidence` 里放 `hub_analyse_media type:"metadata"` 量出的宽高。用户想换画幅时，先按新比例文生一张底图，或事后用 `hub_ffmpeg` 裁切。
- 平台没有负向提示词字段；要排除的东西用正面描述替代（写"干净的纯色背景"而不是"不要杂物"）。
- 输入图可以是工作区相对路径、绝对路径或 http(s) 链接；读不到的路径会直接报错，不会悄悄退化成文生图。

## 已知 bug

- 平台只回下载链接，偶发"响应里没有可下载的图片 URL"：原样换一个 prompt 结构重试一次，仍失败就报告。
- 长段文字、多行小字排版不稳；文案尽量短，关键字放大，必要时出图后用 `hub_ffmpeg` 叠字。
- 参考图超过 10 张时拼成一张参考板，或丢掉最弱的一张并告诉用户。

## Pointer

- 路由总表：`<knowledgeDir>/vendors/platform-routing.md`
- 文字上图风险：`<knowledgeDir>/failures/on-image-text.md`
