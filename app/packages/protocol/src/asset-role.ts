/**
 * 资产在生成请求里扮演的角色。
 *
 * 同一个文件在不同后端里的身份完全不同：img2img 里是 `init_image`，ControlNet 里可能是
 * `pose` 或 `depth`，口型同步里是 `audio_track`。所以角色**不是给文件贴标签**，
 * 而是描述「这次请求拿它当什么用」—— 同一个文件在两次请求里可以是两个角色。
 *
 * `Reference` 是兜底项，也是历史数据迁移时统一落到的角色：更具体的角色是后来才细分的，
 * 迁移前的老数据无法判断原意，只能按兜底处理。
 */
export enum AssetRole {
  Source = "source",
  InitImage = "init_image",
  Style = "style",
  Subject = "subject",
  Mask = "mask",
  Pose = "pose",
  Depth = "depth",
  AudioTrack = "audio_track",
  Subtitle = "subtitle",
  Frame = "frame",
  Reference = "reference",
}

/** 角色在界面上的显示名。英文原样，中文由调用方按 i18n 覆盖。 */
export const ROLE_DISPLAY_NAMES: Record<AssetRole, string> = {
  [AssetRole.Source]: "Source",
  [AssetRole.InitImage]: "Init Image",
  [AssetRole.Style]: "Style",
  [AssetRole.Subject]: "Subject",
  [AssetRole.Mask]: "Mask",
  [AssetRole.Pose]: "Pose",
  [AssetRole.Depth]: "Depth",
  [AssetRole.AudioTrack]: "Audio Track",
  [AssetRole.Subtitle]: "Subtitle",
  [AssetRole.Frame]: "Frame",
  [AssetRole.Reference]: "Reference",
};

/**
 * 角色的用途说明。写给模型看的，所以是完整句子而不是词组 ——
 * 生成请求的提示里会带上它，措辞影响模型对输入的理解。
 */
export const ROLE_DESCRIPTIONS: Record<AssetRole, string> = {
  [AssetRole.Source]: "Primary derivation input (e.g. the original image in img2img / upscale / remix).",
  [AssetRole.InitImage]: "Starting image for Stable Diffusion img2img pipelines.",
  [AssetRole.Style]: "Style reference for IP-Adapter, style transfer, or LoRA-style guidance.",
  [AssetRole.Subject]: "Subject identity reference for character / face consistency.",
  [AssetRole.Mask]: "Region mask used by inpainting / outpainting / segmentation backends.",
  [AssetRole.Pose]: "Pose reference (e.g. OpenPose ControlNet keypoints).",
  [AssetRole.Depth]: "Depth-map reference (e.g. Depth ControlNet, MiDaS output).",
  [AssetRole.AudioTrack]: "Audio track input for lip-sync, video soundtrack, or audio analysis.",
  [AssetRole.Subtitle]: "Subtitle / caption track referenced by the generated asset.",
  [AssetRole.Frame]: "Specific video frame referenced as input.",
  [AssetRole.Reference]:
    "Generic / catch-all reference used when a more specific role is unknown (also the role assigned by the legacy reference_images backfill migration).",
};
