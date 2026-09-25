---
vendor: kling
modality: video
status: active
provider: kuaishou
backend: kling
---

# kling -- video model card

## Activate When

Use when the user selects Kling or the video requires Kling-specific references, multi-shot, or native audio.

## Decision Test

- `kling-video-o1`：single-shot，3-10s，std/pro；支持 T2V、I2V、首尾帧和参考视频；不支持原生音频、multi-shot、4k。适合短单镜头、首尾帧和无声参考视频。
- `kling-v3-omni`：3-15s，std/pro/4k；支持 T2V、I2V、首尾帧、multi-shot、原生音频、多图参考和视频参考。适合主体/商品一致性、多镜头叙事和声画同出；对外称 `Kling 3.0 Omni`。
- Omni 参考视频最多 1 条；无视频时参考图/Element 最多 7 张，带视频时合计最多 4 张。Omni 使用 feature/base 参考视频时不能开启 native audio。
- `feature` 视频用于动作/运镜/风格参考；`base` 视频用于编辑，输出时长跟随输入视频，不能与首尾帧或 multi-shot 混用。
- `mode=avatar`：图片 + 驱动音频，时长跟随音频；只使用 std/pro。`mode=motion-control`：人物图 + 动作视频，时长跟随视频；使用 std/pro、原声开关和人物朝向。

## Action

- Omni route 的 `model_id` 只能是 `kling-video-o1` / `kling-v3-omni`；Avatar/Motion Control 使用对应 mode，省略 `model_id`。
- 参考媒体按发送顺序用 `@image_1`、`@video_1`、`@<element>` 绑定，并写清每个素材的角色和用途。
- Multi-shot 按 `Shot N (Duration: Xs): ...` 编写，所有 shot 时长之和等于顶层 duration；使用 `shot_type=intelligence` 时补充顶层总览。
- 对话先写角色、动作和说话人，再写准确台词；使用稳定角色标签和具体 cinematic 动词。
- 需要原生音频时选 `kling-v3-omni` 且不要带参考视频；O1 不支持 native audio，Avatar/Motion Control 不使用 `sound=on`。纯写实人脸 close-up 优先考虑 MiniMax H3。
