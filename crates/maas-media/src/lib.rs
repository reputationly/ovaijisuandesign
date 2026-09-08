//! 把媒体生成落到 OpenAI 兼容的自建 MaaS 平台。
//!
//! 这个 crate **不知道 MiniMax Design 的存在**。它只回答一个问题：
//! 「给定一段提示词和一些素材，怎么让平台产出图 / 视频 / 语音 / 音乐」。
//!
//! 谁来调用它、请求从哪来（拦截官方应用、还是我们自己的画布），
//! 是调用方的事。
//!
//! ## 平台侧的形状
//!
//! - **图片是同步的**：`POST /v1/images/{generations,edits}` 直接返回 URL
//! - **其余全是异步任务**：视频、超分、语音、音乐都挂在 `POST /v1/videos`
//!   底下，靠 `metadata.task_type` 区分（`t2v` / `i2v` / `flf2v` / `l2va` /
//!   `r2va` / `sr` / `tts` / `t2m` / `cover` / `repaint`），提交拿 `task_id`、
//!   轮询到终态、结果在 `metadata.url`。所以它们共用
//!   [`video::submit_and_poll`]。
//! - **caption 增强与歌词**走 `POST /v1/chat/completions`，用的是同一个平台。
//!
//! ## 这里的注释为什么这么多
//!
//! 这条链上大量失败是**不报错的** —— 键名放错位置、参数越界、音色映射不到，
//! 平台照样返回一个成功的任务和一段能播的音频，只是内容完全不是要的东西。
//! 每一处「为什么是这个键」都记着实测依据，改之前先去平台复测。

pub mod audio;
pub mod caption;
pub mod chat;
pub mod config;
pub mod error;
pub mod image;
pub mod lyrics;
pub mod video;

pub use config::{MediaConfig, Models, MusicEngine, Platform};
pub use error::PlatformError;
