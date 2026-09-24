// 把媒体生成落到 OpenAI 兼容的自建 MaaS 平台。从 crates/maas-media 逐模块移植。
//
// 这个包**不知道 MiniMax Design 的存在**。它只回答一个问题：
// 「给定一段提示词和一些素材，怎么让平台产出图 / 视频 / 语音 / 音乐」。
//
// 谁来调用它、请求从哪来（agent 的工具调用、还是我们自己的画布），
// 是调用方的事。
//
// ## 平台侧的形状
//
// - **图片是同步的**：`POST /v1/images/{generations,edits}` 直接返回 URL
// - **其余全是异步任务**：视频、超分、语音、音乐都挂在 `POST /v1/videos`
//   底下，靠 `metadata.task_type` 区分（`t2v` / `i2v` / `flf2v` / `l2va` /
//   `r2va` / `sr` / `tts` / `t2m` / `cover` / `repaint`），提交拿 `task_id`、
//   轮询到终态、结果在 `metadata.url`。所以它们共用
//   `video.submitAndPoll`。
// - **caption 增强与歌词**走 `POST /v1/chat/completions`，用的是同一个平台。
//
// ## 这里的注释为什么这么多
//
// 这条链上大量失败是**不报错的** —— 键名放错位置、参数越界、音色映射不到，
// 平台照样返回一个成功的任务和一段能播的音频，只是内容完全不是要的东西。
// 每一处「为什么是这个键」都记着实测依据，改之前先去平台复测。
//
// ## 和 Rust 版的对应
//
// Rust 的 `pub mod xxx` 在这里是命名空间导出（`import { video } from "@ov/maas-media"`
// 然后 `video.generate(…)`），`pub use` 的那几个类型在顶层。多出来的
// `Client` / `createClient` 是 `reqwest::Client` 的替身，见 `client.ts`。

export * as audio from "./audio.js";
export * as caption from "./caption.js";
export * as chat from "./chat.js";
export * as config from "./config.js";
export * as error from "./error.js";
export * as image from "./image.js";
export * as lyrics from "./lyrics.js";
export * as params from "./params.js";
export * as route from "./route.js";
export * as video from "./video.js";

export {
  type MediaConfig,
  type Models,
  MusicEngine,
  type Platform,
  defaultMediaConfig,
  defaultModels,
  parseMediaConfig,
  parseModels,
  parsePlatform,
  platformBase,
  resolveMusicEngine,
} from "./config.js";
export { PlatformError } from "./error.js";
export { type Client, type Logger, createClient } from "./client.js";
