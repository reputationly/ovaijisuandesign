---
vendor: jimeng
modality: video
status: active
provider: bytedance
backend: jimeng_motion_control
---

# jimeng -- video 后端卡片

## 能力

- 默认模型：`jimeng_motion_control`；只支持 `motion-control`
- `model_id` 只能是 `jimeng_motion_control`；dispatcher 不支持 `vendor_params`
- 输入：驱动视频 `video_url` + 目标角色参考图；输出按参考动作生成新视频，接口不消费 prompt
- 强项：人物动作模仿、舞蹈 / 手势 / 走位迁移
- 弱项：T2V / I2V / first-last-frame / multimodal 均不支持；不负责角色资产生成

## 调用约定

- `vendor=jimeng, mode=motion-control` 走 `hub_generate_video`
- `video_url` 必填；目标角色图也必填，使用 `first_frame_image` 或 `reference_image_paths[0]`
- 外观来自角色图，动作来自驱动视频；prompt 不会传给上游，不能用文字承诺仅修改人物比例、服装或背景。文字定向编辑需求先说明能力边界，再与用户确认替代模型或后期方案
- 台词 / BGM 无承诺；需要声音另走原生音频视频模型或 TTS + 后期合成

## 已知 bug

- 驱动视频主体被遮挡或出画会导致动作断裂，先要求用户换清晰参考
- 双人动作容易串位；拆单人或改 seedance multimodal
- 大幅改变镜头角度会破坏动作轨迹，保持原镜头关系
- 真实人脸 identity 不稳定，关键角色先生成稳定参考图再进视频

## Pointer

→ <knowledgeDir>/failures/character-refs.md（角色参考）  → <knowledgeDir>/failures/spoken-video.md（声音后期）
