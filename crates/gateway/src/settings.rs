//! 设置。`GET /api/settings`、`POST /api/settings`
//!
//! 官方那一大套（账号、积分、团队、存储迁移、文件夹白名单）我们都不做 ——
//! 没有登录、没有云端，那些设置项背后没有东西。真正要能改的是**平台接入和
//! 模型选择**：现在这些只能手编 `config.json`，改完还要自己重启。
//!
//! ## api_key 不回明文
//!
//! 读出来只给一个掩码（`sk-JUM…c7H`）。这是本机文件、用户自己就能打开看，
//! 所以不是为了防谁 —— 是为了**别把 key 铺到界面上**：设置页会被截图、
//! 会被录屏演示，而 key 一旦出现在图里就得换。
//!
//! 写回时**留空表示不改**。不这么做的话，用户改一个模型名、保存，
//! 掩码就被当成新 key 写进了配置。
//!
//! ## 改完要重启
//!
//! 配置是启动时读进 `AppState` 的，写文件不会让在跑的这个进程改主意。
//! 界面上如实说，而不是假装已经生效 —— 后者会让用户改完发现没用，
//! 再改一遍，还是没用。

use std::path::PathBuf;
use std::sync::Arc;

use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::Deserialize;
use serde_json::{Value, json};

use crate::AppState;
use crate::config::Config;

/// 把 key 变成能显示的样子。
///
/// 头 6 尾 3，中间省略。全遮成 `••••` 的话用户分不出"配了一个错的 key"
/// 和"配了另一个 key"——而这两种情况的排查方向完全不同。
fn mask(key: &str) -> String {
    let n = key.chars().count();
    if n == 0 {
        return String::new();
    }
    if n <= 12 {
        return "•".repeat(n);
    }
    let head: String = key.chars().take(6).collect();
    let tail: String = key.chars().skip(n - 3).collect();
    format!("{head}…{tail}")
}

fn path() -> Result<PathBuf, String> {
    match std::env::var_os("OVGW_CONFIG") {
        Some(p) => Ok(PathBuf::from(p)),
        None => Config::default_path().map_err(|e| format!("{e:#}")),
    }
}

pub async fn get(State(state): State<Arc<AppState>>) -> (StatusCode, Json<Value>) {
    let p = match path() {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"ok":false,"error":e})),
            );
        }
    };
    let cfg = Config::load(&p).unwrap_or_default();
    let m = &cfg.media.models;
    (
        StatusCode::OK,
        Json(json!({
            "ok": true,
            "path": p.to_string_lossy(),
            // 工作区回**实际生效的那个**，不是配置里写的 —— 环境变量
            // WORKSPACE_DIR 会覆盖它，而用户看到配置里一个、实际用另一个
            // 完全没法排查。
            "workspace": state.ws.root().to_string_lossy(),
            "workspaceConfigured": cfg.workspace.as_ref().map(|p| p.to_string_lossy()),
            "port": cfg.port,
            "platform": {
                "baseUrl": cfg.media.platform.base_url,
                "apiKeyMasked": mask(&cfg.media.platform.api_key),
                "hasApiKey": !cfg.media.platform.api_key.is_empty(),
                "chatModel": cfg.media.platform.chat_model,
            },
            "models": {
                "image": m.image, "imageEdit": m.image_edit,
                "video": m.video, "videoRef": m.video_ref, "videoUpscale": m.video_upscale,
                "music": m.music, "musicEdit": m.music_edit, "speech": m.speech,
                "enhanceMusicCaption": m.enhance_music_caption,
                "voiceMap": m.voice_map,
            },
        })),
    )
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Body {
    pub port: Option<u16>,
    pub workspace: Option<String>,
    pub base_url: Option<String>,
    /// **留空 = 不改**。见模块注释。
    pub api_key: Option<String>,
    pub chat_model: Option<String>,
    pub image: Option<String>,
    pub image_edit: Option<String>,
    pub video: Option<String>,
    pub video_ref: Option<String>,
    pub video_upscale: Option<String>,
    pub music: Option<String>,
    pub music_edit: Option<String>,
    pub speech: Option<String>,
    pub enhance_music_caption: Option<bool>,
    pub voice_map: Option<std::collections::BTreeMap<String, String>>,
}

/// 空字符串 → `None`。模型名留空的语义是"这个模态不配"，
/// 存成空串的话 `route()` 会拿到一个非 None 的空模型名发出去。
fn opt(v: Option<String>) -> Option<Option<String>> {
    v.map(|s| {
        let t = s.trim();
        (!t.is_empty()).then(|| t.to_string())
    })
}

pub async fn put(
    State(_s): State<Arc<AppState>>,
    Json(b): Json<Body>,
) -> (StatusCode, Json<Value>) {
    let p = match path() {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"ok":false,"error":e})),
            );
        }
    };
    // **以磁盘上那份为底改**，不是拿内存里的 AppState 重建：配置里有一批
    // 我们这个界面不管的字段（web_dir / upstream / music_engine），
    // 重建会把它们抹掉。
    let mut cfg = Config::load(&p).unwrap_or_default();

    if let Some(v) = b.port {
        cfg.port = v;
    }
    if let Some(v) = b.workspace {
        let t = v.trim();
        cfg.workspace = (!t.is_empty()).then(|| PathBuf::from(t));
    }
    if let Some(v) = b.base_url {
        cfg.media.platform.base_url = v.trim().to_string();
    }
    // 留空不动。掩码回传时也是留空，所以不会把 `sk-JUM…c7H` 写进去。
    if let Some(v) = b.api_key
        && !v.trim().is_empty()
    {
        cfg.media.platform.api_key = v.trim().to_string();
    }
    if let Some(v) = b.chat_model {
        cfg.media.platform.chat_model = v.trim().to_string();
    }

    let m = &mut cfg.media.models;
    if let Some(v) = opt(b.image) {
        m.image = v;
    }
    if let Some(v) = opt(b.image_edit) {
        m.image_edit = v;
    }
    if let Some(v) = opt(b.video) {
        m.video = v;
    }
    if let Some(v) = opt(b.video_ref) {
        m.video_ref = v;
    }
    if let Some(v) = opt(b.video_upscale) {
        m.video_upscale = v;
    }
    if let Some(v) = opt(b.music) {
        m.music = v;
    }
    if let Some(v) = opt(b.music_edit) {
        m.music_edit = v;
    }
    if let Some(v) = opt(b.speech) {
        m.speech = v;
    }
    if let Some(v) = b.enhance_music_caption {
        m.enhance_music_caption = v;
    }
    if let Some(v) = b.voice_map {
        m.voice_map = v;
    }

    match cfg.save(&p) {
        Ok(()) => (
            StatusCode::OK,
            Json(json!({
                "ok": true,
                // 如实说要重启。假装已生效的话，用户改完发现没用会再改一遍。
                "needsRestart": true,
                "path": p.to_string_lossy(),
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": format!("{e:#}") })),
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_masked_key_still_tells_two_wrong_keys_apart() {
        // 全遮成 ●●●● 的话，"配了个错 key"和"配了另一个 key"看起来一样，
        // 而这两种情况的排查方向完全不同。
        let a = mask("sk-JUMabcdefghijklmnc7H");
        assert!(a.starts_with("sk-JUM") && a.ends_with("c7H"));
        assert!(!a.contains("abcdefg"), "中间不能露出来: {a}");
        assert_ne!(a, mask("sk-XYZabcdefghijklmnZZZ"));
    }

    #[test]
    fn a_short_key_is_fully_masked() {
        // 短 key 露头露尾等于露了大半。
        assert_eq!(mask("sk-123"), "••••••");
        assert_eq!(mask(""), "");
    }

    #[test]
    fn an_empty_model_name_becomes_none_not_an_empty_string() {
        // 存成空串的话 route() 会拿到一个非 None 的空模型名发出去，
        // 平台回一个"模型不存在"，而配置里看起来是"没配"。
        assert_eq!(opt(Some("  ".into())), Some(None));
        assert_eq!(
            opt(Some(" qwen-image ".into())),
            Some(Some("qwen-image".into()))
        );
        assert_eq!(opt(None), None, "没传这个字段 = 不改");
    }
}
