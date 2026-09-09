//! 这台机器上到底有哪些能力。对应 `list_capabilities`。
//!
//! ## 为什么这个工具比看起来重要
//!
//! agent 用的是**官方的提示词**，里面写着一整套官方模型（`nano-banana`、
//! `MiniMax-Hailuo-2.3`、`speech-2.8-hd`…）。它没有别的办法知道这台机器上
//! 实际配了什么 —— 只能照着提示词调，调不通才发现。
//!
//! 现在有了路由层（[`maas_media::route`]），"调不通"变成了"静默换一个模型"，
//! 这反而更需要一个诚实的能力清单：**先问清楚，再决定怎么做**，
//! 而不是发出去之后才知道自己要的东西被换掉了。
//!
//! 所以这里回三样东西：
//!
//! - 这个模态**能不能用**（没配模型就是不能）
//! - 实际会用**哪个模型**
//! - 常见的官方名会被**路由到什么**（让 agent 提前知道替换会发生）

use std::sync::Arc;

use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use serde_json::{Value, json};

use maas_media::route::{Modality, route};

use crate::AppState;

#[derive(Debug, Deserialize, Default)]
pub struct Body {
    /// 只问某一个模态。不给就全给。
    #[serde(default)]
    pub modality: Option<String>,
}

/// 模态名 → 枚举。**名字用官方那套**（`image` / `video` / `audio` …）。
fn parse(name: &str) -> Vec<(&'static str, Modality)> {
    match name.to_ascii_lowercase().as_str() {
        "image" => vec![
            ("image", Modality::Image),
            ("image_edit", Modality::ImageEdit),
        ],
        "video" => vec![
            ("video", Modality::Video),
            ("video_ref", Modality::VideoRef),
        ],
        "audio" | "music" => vec![("music", Modality::Music)],
        "speech" => vec![("speech", Modality::Speech)],
        _ => vec![],
    }
}

fn all() -> Vec<(&'static str, Modality)> {
    vec![
        ("image", Modality::Image),
        ("image_edit", Modality::ImageEdit),
        ("video", Modality::Video),
        ("video_ref", Modality::VideoRef),
        ("music", Modality::Music),
        ("speech", Modality::Speech),
    ]
}

/// 每个模态给几个官方常用名，让 agent 提前看到会被路由成什么。
/// 不求全 —— 全的那份在官方的模型目录里，我们只是给个样例。
fn samples(m: Modality) -> &'static [&'static str] {
    match m {
        Modality::Image => &["nano-banana", "seedream_5_pro", "gpt-image-2"],
        Modality::ImageEdit => &["qwen-image-edit", "seedream-5-layer-decompose"],
        Modality::Video => &["MiniMax-Hailuo-2.3", "MiniMax-H3", "kling"],
        Modality::VideoRef => &["minimax-h3-ref2va"],
        Modality::Music => &["music-3.0"],
        Modality::Speech => &["speech-2.8-hd"],
    }
}

pub async fn list(State(state): State<Arc<AppState>>, body: Option<Json<Body>>) -> Json<Value> {
    let want = body.and_then(|b| b.0.modality);
    let wanted = match want.as_deref() {
        Some(name) => {
            let v = parse(name);
            // 认不出的模态名回一个**空清单加一句说明**，而不是当成"全部"。
            // 当成全部的话 agent 会以为它问的那个模态可用。
            if v.is_empty() {
                return Json(json!({
                    "ok": true,
                    "modality": name,
                    "capabilities": [],
                    "note": "不认识这个模态。已知的是 image / video / audio / speech。",
                }));
            }
            v
        }
        None => all(),
    };

    let models = &state.media.models;
    let caps: Vec<Value> = wanted
        .into_iter()
        .map(|(name, m)| {
            let routed = route(models, None, m);
            let available = routed.is_some();
            let model = routed.map(|r| r.model);
            // 样例的路由结果。**只在可用时算** —— 不可用时算出来的是兜底值，
            // 会让 agent 以为换个名字就能用。
            let routes: Vec<Value> = if available {
                samples(m)
                    .iter()
                    .filter_map(|s| {
                        let r = route(models, Some(s), m)?;
                        Some(json!({
                            "requested": s,
                            "resolvesTo": r.model,
                            "substituted": r.substituted,
                        }))
                    })
                    .collect()
            } else {
                vec![]
            };
            json!({
                "modality": name,
                "available": available,
                "model": model,
                "routes": routes,
            })
        })
        .collect();

    Json(json!({
        "ok": true,
        "capabilities": caps,
        // 说清楚这份清单的性质，否则 agent 会把它当成"官方目录"去挑模型。
        "note": "模型名按官方那套传即可，服务端会路由到本机配置的模型；\
                 available=false 的模态本机没有配，调用会失败。",
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 测试用的 `AppState` 里模型全是空的（`Models::default()`）。
    /// 要验路由样例就得先配上 —— 否则测的是"什么都没配"那条路。
    fn with_models(s: &Arc<AppState>) -> Arc<AppState> {
        let mut media = (*s.media).clone();
        media.models.image = Some("qwen-image".into());
        media.models.image_edit = Some("qwen-image-edit".into());
        Arc::new(AppState {
            media: Arc::new(media),
            ws: s.ws.clone(),
            assets: s.assets.clone(),
            events: s.events.clone(),
            canvas_lock: Default::default(),
            client: s.client.clone(),
            local: s.local.clone(),
            tasks: s.tasks.clone(),
            updater: s.updater.clone(),
            questions: s.questions.clone(),
            upstream: s.upstream.clone(),
            web_dir: s.web_dir.clone(),
        })
    }

    #[tokio::test]
    async fn it_reports_what_is_actually_configured() {
        let (s, _d) = crate::tests::state_with_dir();
        let r = list(State(s), None).await;
        let caps = r.0["capabilities"].as_array().unwrap();
        assert_eq!(caps.len(), 6, "六个模态都要出现，包括没配的");
        // 测试配置里什么都没配 —— 必须如实说不可用，而不是编一个模型名。
        let speech = caps.iter().find(|c| c["modality"] == "speech").unwrap();
        assert_eq!(speech["available"], false);
        assert!(speech["model"].is_null());
        assert_eq!(
            speech["routes"].as_array().unwrap().len(),
            0,
            "不可用时不该给路由样例——那会让 agent 以为换个名字就能用"
        );
    }

    #[tokio::test]
    async fn it_shows_where_official_names_land() {
        let (s0, _d) = crate::tests::state_with_dir();
        let s = with_models(&s0);
        let r = list(
            State(s),
            Some(Json(Body {
                modality: Some("image".into()),
            })),
        )
        .await;
        let caps = r.0["capabilities"].as_array().unwrap();
        let img = caps.iter().find(|c| c["modality"] == "image").unwrap();
        assert_eq!(img["available"], true);
        let routes = img["routes"].as_array().unwrap();
        let nb = routes
            .iter()
            .find(|x| x["requested"] == "nano-banana")
            .unwrap();
        assert_eq!(nb["substituted"], true, "要让 agent 提前知道会被换掉");
        assert!(nb["resolvesTo"].as_str().is_some_and(|s| !s.is_empty()));
    }

    #[tokio::test]
    async fn an_unknown_modality_is_not_treated_as_all() {
        // 当成"全部"的话 agent 会以为它问的那个模态可用。
        let (s, _d) = crate::tests::state_with_dir();
        let r = list(
            State(s),
            Some(Json(Body {
                modality: Some("hologram".into()),
            })),
        )
        .await;
        assert_eq!(r.0["capabilities"].as_array().unwrap().len(), 0);
        assert!(r.0["note"].as_str().unwrap().contains("不认识"));
    }
}
