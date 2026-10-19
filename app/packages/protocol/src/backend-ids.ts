/**
 * 后端标识符。
 *
 * 这些串是**跨进程、跨版本的稳定键**：请求体里的 `backend`、模型目录里的 `backend`、
 * 老项目文件里存着的 `backend`，都靠它对齐。所以它们只能是常量、不能拼出来 ——
 * 少一个字母就是「后端不存在」，而且旧数据不会报错，只会静默走错分支。
 *
 * 新增后端时加在末尾并保持串值不变；串值本身不要改。
 */

/** 图像：nano banana。 */
export const BACKEND_NANO_BANANA = "nano_banana";
/** 视频：Kling。 */
export const BACKEND_KLING = "kling";
/** 图像：OpenAI 系图像模型。 */
export const BACKEND_OPENAI = "openai";
/** 图像：Midjourney。 */
export const BACKEND_MIDJOURNEY = "midjourney";
/** 图像：Seedream。 */
export const BACKEND_SEEDREAM = "seedream";
/** 视频：多镜头。 */
export const BACKEND_VIBE_MULTI_SHOT = "vibe_multi_shot";
/** 视频：分镜。 */
export const BACKEND_VIBE_STORYBOARD = "vibe_storyboard";
/** 图像：重打光。 */
export const BACKEND_VIBE_RELIGHT = "vibe_relight";
/** 视频：v3 主线模型。 */
export const BACKEND_MINIMAX_V3 = "minimax_v3";
/** 视频：veo3。 */
export const BACKEND_VEO3 = "veo3";
/** 视频：图生视频（wan）。 */
export const BACKEND_WAN_I2V = "wan_i2v";
/** 语音：TTS。 */
export const BACKEND_MINIMAX_TTS = "minimax_tts";
/** 语音：seedaudio。 */
export const BACKEND_SEEDAUDIO = "seedaudio";
/** 音乐。 */
export const BACKEND_MINIMAX_MUSIC = "minimax_music";
/** 音乐：elevenlabs。 */
export const BACKEND_ELEVENLABS_MUSIC = "elevenlabs_music";
/** 视频：seedance。 */
export const BACKEND_SEEDANCE = "seedance";
/** 视频：数字人。 */
export const BACKEND_KLING_AVATAR = "kling_avatar";
