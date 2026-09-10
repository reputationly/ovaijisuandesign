//! 平台上有哪些模型。`GET /api/models`
//!
//! 设置页的模型名以前要**手打**。打错了不会当场报错 —— 要等到用户真去生成
//! 一次，才在画布上看到一个失败节点，而错误信息是平台回的"模型不存在"，
//! 和"我在设置里填错了一个字"之间隔着好几步。
//!
//! ## 分类只能靠名字表
//!
//! 平台的 `/v1/models` 只给 id，没有模态。`/api/pricing` 有一个
//! `supported_endpoint_types`,但**实测不准** —— `id4` 在那里标的是
//! `openai-video`,而它在 `/v1/images/generations` 上正常出图。
//!
//! 所以分类走 [`maas_media::route`] 里的名字表：那是我们实际打过请求验过的。
//! 认不出的模型**照样列出来**，只是没有模态标记 —— 平台随时会加新模型，
//! 认不出不该等于用不了。

use std::sync::Arc;

use axum::Json;
use axum::extract::State;
use serde::Serialize;
use serde_json::{Value, json};

use crate::AppState;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: String,
    /// `image` / `imageEdit` / `video` / `videoRef` / `music` / `musicEdit`
    /// / `speech`,认不出来时是 `null`。
    pub modality: Option<&'static str>,
    /// 这个模型现在被配在哪些槽位上。用户一眼能看出"我选的是哪个"。
    pub configured_as: Vec<&'static str>,
}

fn modality_name(m: maas_media::route::Modality) -> &'static str {
    use maas_media::route::Modality::*;
    match m {
        Image => "image",
        ImageEdit => "imageEdit",
        Video => "video",
        VideoRef => "videoRef",
        Music => "music",
        MusicEdit => "musicEdit",
        Speech => "speech",
    }
}

/// 平台上的模型 id 列表。
///
/// 失败**不当致命错**：设置页少一个下拉照样能手打，而为了一个下拉让整个
/// 设置页打不开是把小问题放大。
async fn platform_models(state: &AppState) -> Result<Vec<String>, String> {
    let p = &state.media.platform;
    if p.api_key.trim().is_empty() {
        return Err("还没配 api_key".into());
    }
    let r = state
        .client
        .get(format!("{}/models", p.base_url.trim_end_matches('/')))
        .bearer_auth(&p.api_key)
        .timeout(std::time::Duration::from_secs(20))
        .send()
        .await
        .map_err(|e| format!("连不上平台：{e}"))?;
    if !r.status().is_success() {
        let s = r.status();
        let body = r.text().await.unwrap_or_default();
        return Err(format!(
            "平台返回 {s}：{}",
            body.chars().take(200).collect::<String>()
        ));
    }
    let v: Value = r.json().await.map_err(|e| e.to_string())?;
    Ok(v.get("data")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|m| m.get("id").and_then(Value::as_str))
        .map(str::to_string)
        .collect())
}

pub async fn list(State(state): State<Arc<AppState>>) -> Json<Value> {
    let ids = match platform_models(&state).await {
        Ok(v) => v,
        Err(e) => {
            // 200 + ok:false：设置页要把原因显示出来（多半是 key 没配或
            // 填错了），而 5xx 在前端那层通常只会变成一句"请求失败"。
            return Json(json!({ "ok": false, "error": e, "models": [] }));
        }
    };

    let m = &state.media.models;
    let slots: [(&'static str, &Option<String>); 8] = [
        ("image", &m.image),
        ("imageEdit", &m.image_edit),
        ("video", &m.video),
        ("videoRef", &m.video_ref),
        ("videoUpscale", &m.video_upscale),
        ("music", &m.music),
        ("musicEdit", &m.music_edit),
        ("speech", &m.speech),
    ];

    let mut out: Vec<Entry> = ids
        .into_iter()
        .map(|id| Entry {
            modality: maas_media::route::modality_of_public(&id).map(modality_name),
            configured_as: slots
                .iter()
                .filter(|(_, v)| v.as_deref().is_some_and(|v| v.eq_ignore_ascii_case(&id)))
                .map(|(k, _)| *k)
                .collect(),
            id,
        })
        .collect();
    // 认得出模态的排前面 —— 下拉里用户最可能要选的就是这些。
    out.sort_by(|a, b| (a.modality.is_none(), &a.id).cmp(&(b.modality.is_none(), &b.id)));

    Json(json!({ "ok": true, "models": out }))
}
