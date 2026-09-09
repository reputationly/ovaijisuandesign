//! 歌词起草与翻唱。对应 `lyrics_generation` / `music_cover`。
//!
//! 路径照官方的路由表（`docs/gateway-api.md`）：
//! `POST /api/music/lyrics/generate` 和 `POST /api/music/cover/preprocess`。
//! 翻唱的**生成**没有独立路由 —— 官方也是走 `/api/generate/music/submit`，
//! 靠请求体里有没有 `audio` 区分，所以我们跟着放在 [`crate::generate`] 里。
//!
//! ## 为什么歌词这条是同步的
//!
//! 它不产出文件，只回一段文本，两三秒就完。套一层 task_id + 轮询只会让
//! agent 多两次往返，而且轮询表里会多出一种"成功了但没有 path"的终态 ——
//! 那个形状每一个消费方都要单独处理。

use std::sync::Arc;

use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::Deserialize;
use serde_json::{Value, json};

use crate::AppState;

#[derive(Debug, Default, Deserialize)]
pub struct LyricsBody {
    /// `write_full_song` / `edit`。
    #[serde(default)]
    pub mode: Option<String>,
    /// 主题 / 风格描述。`write_full_song` 时必填。
    #[serde(default)]
    pub prompt: String,
    /// 待润色的原稿。`edit` 时必填。
    #[serde(default)]
    pub lyrics: String,
    #[serde(default)]
    pub title: Option<String>,
}

pub async fn lyrics(
    State(state): State<Arc<AppState>>,
    Json(b): Json<LyricsBody>,
) -> (StatusCode, Json<Value>) {
    let mode = maas_media::lyrics::Mode::parse(b.mode.as_deref());
    match maas_media::lyrics::draft(
        &state.client,
        &state.media,
        mode,
        &b.prompt,
        &b.lyrics,
        b.title.as_deref(),
    )
    .await
    {
        Ok(d) => (
            StatusCode::OK,
            // 三个字段名**逐字照官方** —— agent 的提示词里写的就是这三个，
            // 改一个字它就读不到，而 MCP 对读不到的字段不报错。
            Json(json!({
                "ok": true,
                "song_title": d.song_title,
                "style_tags": d.style_tags,
                "lyrics": d.lyrics,
            })),
        ),
        Err(err) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": err.message, "error_code": err.code })),
        ),
    }
}

// ---------------------------------------------------------------------------
// 翻唱的第一步
// ---------------------------------------------------------------------------

#[derive(Debug, Default, Deserialize)]
pub struct PreprocessBody {
    /// 参考音频。工作区相对路径或 URL。
    #[serde(default)]
    pub audio: String,
}

/// `music_cover` 的 `prepare_lyrics`。
///
/// **这一步本机做不了，如实说。** 它要把参考音频里唱的词转写出来，那需要一个
/// 语音识别模型，而我们的 `models` 里没有这一项 —— 平台上也没有对应的
/// task_type。
///
/// 不做成"回一份空歌词"：官方这个 action 的结果里没有媒体文件，调用方被
/// 明确要求**不能把它当失败**，于是一份空歌词会被原样带进下一步，
/// 翻唱出来是一首没有词的曲子，全程不报错。
///
/// 也不做成"不注册这个 action"：`music_cover` 的另一个 action 是能用的，
/// 整个工具不注册等于连能用的那半也没了。
pub async fn cover_preprocess(
    State(_state): State<Arc<AppState>>,
    Json(_b): Json<PreprocessBody>,
) -> (StatusCode, Json<Value>) {
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "ok": false,
            "error_code": "dpp.unsupported",
            "error": "本机没有配语音识别模型，扒不出参考音频里的歌词。\
                      要么直接用 action=generate 一步翻唱（不改词），\
                      要么自己把歌词写进 lyrics 传给 action=generate。",
        })),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn an_empty_brief_does_not_reach_the_network() {
        let (s, _d) = crate::tests::state_with_dir();
        let (code, body) = lyrics(State(s), Json(LyricsBody::default())).await;
        assert_eq!(code, StatusCode::BAD_REQUEST);
        assert_eq!(body.0["ok"], false);
        assert!(body.0["error"].as_str().unwrap().contains("风格描述"));
    }

    #[tokio::test]
    async fn preprocess_says_what_is_missing_and_what_to_do_instead() {
        // 回一份空歌词的话，它会被原样带进下一步，翻唱出来是一首没有词的
        // 曲子 —— 全程不报错。
        let (s, _d) = crate::tests::state_with_dir();
        let (code, body) = cover_preprocess(State(s), Json(PreprocessBody::default())).await;
        assert_eq!(code, StatusCode::NOT_IMPLEMENTED);
        assert!(body.0.get("formatted_lyrics").is_none(), "不能回空歌词");
        let msg = body.0["error"].as_str().unwrap();
        assert!(msg.contains("generate"), "要给出一条能走的路: {msg}");
    }
}
