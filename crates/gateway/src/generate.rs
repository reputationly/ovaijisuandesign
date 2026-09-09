//! 生成路由。形状对齐官方本地 gateway 的 `/api/generate/*`。
//!
//! 契约（字段来自 mcp-tools 的 zod schema，少一个都会被判失败）：
//!
//! ```text
//! POST /api/generate/image/submit
//!   body → { backend, model_id, prompt, image_paths[], filename, params{…}, source_tool }
//!   resp ← { ok: true, task_id, status: "processing", media_type: "image" }
//!
//! GET  /api/generate/tasks/<task_id>/query      ← 注意 /query 后缀
//!   resp ← { ok:true, task_id, status:"succeeded", result: { ok:true, path, width?, height? } }
//!        | { ok:true, task_id, status:"processing" }
//!        | { ok:false, task_id, status:"failed", error, error_code, user_message }
//! ```
//!
//! **`/query` 后缀漏掉的话请求会 404，而 mcp-tools 对非 2xx 的查询不写任何
//! 日志** —— 表现是画布上一个没有原因的失败节点。测试钉住这个字面量。

use std::sync::Arc;

use axum::Json;
use axum::body::Bytes;
use axum::extract::{Path, State};
use serde::Deserialize;
use serde_json::{Value, json};

use maas_media::PlatformError;
use maas_media::video::VideoPlan;

use crate::tasks::TaskState;
use crate::{AppState, land};

/// `POST /api/generate/image/submit` 的请求体。
///
/// 只解我们真正用得上的字段。多余的键（`backend` / `source_tool` /
/// `filename`）照收不误但不参与决策 —— 用哪个模型由**我们的配置**决定，
/// 不由调用方指定的 vendor 决定。
#[derive(Debug, Default, Deserialize)]
pub struct ImageSubmit {
    #[serde(default)]
    pub prompt: String,
    /// 底图。非空走图生图。
    ///
    /// 三种形态都接受（http URL / data URI / 裸 base64），平台侧一样。
    #[serde(default)]
    pub image_paths: Vec<String>,
    #[serde(default)]
    pub params: ImageParams,
    /// 调用方点名的模型，**官方那套名字**。路由到我们配的模型，
    /// 见 `maas_media::route`。
    ///
    /// 声明它是为了让 agent 照官方提示词传过来时**不被静默丢弃** ——
    /// MCP 对多余的参数不报错，agent 会以为自己指定了模型，实际一直在用默认。
    #[serde(default)]
    pub model_id: Option<String>,
    /// 官方的 vendor（`banana` / `seedream` / `kling` …）。
    /// **接受但不参与路由** —— 同一个 vendor 下有多个模态，而模型名本身
    /// 是唯一的，按名字判更准。留着是为了不丢字段。
    #[serde(default)]
    pub vendor: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
pub struct ImageParams {
    #[serde(default)]
    pub aspect_ratio: String,
    #[serde(default)]
    pub resolution: String,
}

/// 把调用方给的素材路径变成平台能吃的形态。
///
/// 画布上的节点交出来的是**工作区相对路径**（`images/a.png`），而平台只认
/// http(s) URL / data URI / 裸 base64。直接透传会被判「既非 http(s) URL 也非
/// 合法 base64/data-uri」——`generate_image` 带底图那条路整条不通。
fn as_images(state: &AppState, paths: &[String]) -> Result<Vec<String>, PlatformError> {
    maas_media::image::load_image_inputs(state.ws.root(), paths)
}

/// 同上，音视频。按扩展名猜 MIME。
fn as_media(state: &AppState, paths: &[String]) -> Result<Vec<String>, PlatformError> {
    maas_media::image::load_media_inputs(state.ws.root(), paths)
}

/// 提交的应答。四条 submit 共用一个形状。
fn accepted(task_id: &str, media_type: &str) -> Json<Value> {
    Json(json!({
        "ok": true,
        "task_id": task_id,
        "status": "processing",
        "media_type": media_type,
    }))
}

/// 提交。
///
/// **解不出请求体也照常返回 task_id**，让失败带着原因在轮询时回去 ——
/// 调用方把提交失败当硬错误，而画布上更希望看到一个带原因的失败节点。
pub async fn submit_image(State(state): State<Arc<AppState>>, body: Bytes) -> Json<Value> {
    // 自己解而不是用 `Json<T>` 提取器：那个对畸形 body 会直接回 400，
    // 而调用方把提交失败当硬错误。宁可照常发 task_id。
    let req: ImageSubmit = serde_json::from_slice(&body).unwrap_or_else(|err| {
        tracing::warn!("图片提交体解析失败，按空请求处理: {err}");
        ImageSubmit::default()
    });
    let task_id = state.tasks.create();

    tracing::info!(
        task = %task_id,
        edit = !req.image_paths.is_empty(),
        chars = req.prompt.chars().count(),
        "接到图片生成"
    );

    let (st, id) = (state.clone(), task_id.clone());
    tokio::spawn(async move {
        // 平台出图 → 收进工作区。两步都在这里做完，调用方只拿到一个
        // 工作区相对路径 —— 官方契约就是这个形状。
        let result = match as_images(&st, &req.image_paths) {
            Ok(images) => {
                match maas_media::image::generate(
                    &st.client,
                    &st.media,
                    &req.prompt,
                    &images,
                    &req.params.aspect_ratio,
                    &req.params.resolution,
                    req.model_id.as_deref(),
                )
                .await
                {
                    Ok(url) => land::land(&st, &url).await,
                    Err(err) => Err(err),
                }
            }
            Err(err) => Err(err),
        };
        st.tasks.finish(&id, result);
    });

    accepted(&task_id, "image")
}

// ---------------------------------------------------------------------------
// 视频
// ---------------------------------------------------------------------------

#[derive(Debug, Default, Deserialize)]
pub struct VideoSubmit {
    #[serde(default)]
    pub prompt: String,
    /// 官方那套玩法名（`first-last-frame` / `reference` …）。
    /// 给了就**以它为准**，见 [`plan_of`]。
    #[serde(default)]
    pub mode: Option<String>,
    #[serde(default)]
    pub first_frame_image: Option<String>,
    #[serde(default)]
    pub last_frame_image: Option<String>,
    /// 参考素材。和首尾帧是**不同的键**，混用会让平台的输入形态判定失准。
    #[serde(default)]
    pub reference_image_paths: Vec<String>,
    #[serde(default)]
    pub reference_video_urls: Vec<String>,
    #[serde(default)]
    pub reference_audio_urls: Vec<String>,
    #[serde(default)]
    pub duration: Option<u32>,
    #[serde(default)]
    pub params: VideoParams,
    #[serde(default)]
    pub model_id: Option<String>,
    #[serde(default)]
    pub vendor: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
pub struct VideoParams {
    #[serde(default)]
    pub aspect_ratio: String,
    #[serde(default)]
    pub resolution: String,
    #[serde(default)]
    pub generate_audio: Option<bool>,
}

/// 这次视频是哪种玩法。
///
/// **`mode` 说了就听 `mode` 的。** 只给尾帧和只给首帧在平台侧是同一个输入
/// 形态（都是一张图），靠张数分不出来 —— 当成 i2v 会让画面朝反方向发展，
/// 而且不报错。这里我们比 maas-media 多一层保险：字段名本身
/// （`first_frame_image` / `last_frame_image`）已经把语义说清了，所以
/// `mode` 缺失时按字段名推也是安全的。
pub fn plan_of(mode: Option<&str>, first: bool, last: bool, refs: bool) -> VideoPlan {
    if let Some(m) = mode {
        let m = m.to_ascii_lowercase().replace([' ', '_'], "-");
        // 顺序有讲究：`first-last-frame` 同时含 first 和 last，
        // 先判 last 的话它会被当成"只给尾帧"。
        if m.contains("ref") || m == "r2va" {
            return VideoPlan::Reference;
        }
        if (m.contains("first") && m.contains("last")) || m == "flf2v" {
            return VideoPlan::FirstLastFrame;
        }
        if m.contains("last") || m == "l2va" {
            return VideoPlan::LastFrame;
        }
        if m.contains("first") || m.contains("image") || m == "i2v" {
            return VideoPlan::ImageToVideo;
        }
        if m.contains("text") || m == "t2v" {
            return VideoPlan::TextToVideo;
        }
        // 认不出的 mode 不当成失败 —— 官方随时会加新玩法。往下按输入推。
    }
    match (refs, first, last) {
        (true, _, _) => VideoPlan::Reference,
        (_, true, true) => VideoPlan::FirstLastFrame,
        (_, true, false) => VideoPlan::ImageToVideo,
        (_, false, true) => VideoPlan::LastFrame,
        _ => VideoPlan::TextToVideo,
    }
}

/// 按玩法挑出真正要发的帧，顺序是 [首帧, 尾帧]。
///
/// 缺帧时**报错而不是降级**：flf2v 少一张会被平台当成 i2v 处理，
/// 出来一段"看着能用但尾帧完全不对"的视频，没人会去核对。
fn frames_of(
    plan: VideoPlan,
    first: Option<&String>,
    last: Option<&String>,
) -> Result<Vec<String>, PlatformError> {
    let need = |what: &str| PlatformError::config(format!("这种玩法需要{what}"));
    Ok(match plan {
        VideoPlan::FirstLastFrame => vec![
            first
                .ok_or_else(|| need("首帧图（first_frame_image）"))?
                .clone(),
            last.ok_or_else(|| need("尾帧图（last_frame_image）"))?
                .clone(),
        ],
        VideoPlan::ImageToVideo => {
            vec![
                first
                    .ok_or_else(|| need("首帧图（first_frame_image）"))?
                    .clone(),
            ]
        }
        VideoPlan::LastFrame => {
            vec![
                last.ok_or_else(|| need("尾帧图（last_frame_image）"))?
                    .clone(),
            ]
        }
        VideoPlan::TextToVideo | VideoPlan::Reference => vec![],
    })
}

pub async fn submit_video(State(state): State<Arc<AppState>>, body: Bytes) -> Json<Value> {
    let req: VideoSubmit = serde_json::from_slice(&body).unwrap_or_else(|err| {
        tracing::warn!("视频提交体解析失败，按空请求处理: {err}");
        VideoSubmit::default()
    });
    let task_id = state.tasks.create();

    let plan = plan_of(
        req.mode.as_deref(),
        req.first_frame_image.is_some(),
        req.last_frame_image.is_some(),
        !req.reference_image_paths.is_empty()
            || !req.reference_video_urls.is_empty()
            || !req.reference_audio_urls.is_empty(),
    );
    tracing::info!(task = %task_id, ?plan, chars = req.prompt.chars().count(), "接到视频生成");

    let (st, id) = (state.clone(), task_id.clone());
    tokio::spawn(async move {
        let result = run_video(&st, &req, plan).await;
        st.tasks.finish(&id, result);
    });

    accepted(&task_id, "video")
}

/// 抽出来只是为了能用 `?` —— 内联在 spawn 里的话每一步都要写一次
/// `match … Err(e) => return`，而漏掉一处就是一个静默降级。
async fn run_video(
    st: &AppState,
    req: &VideoSubmit,
    plan: VideoPlan,
) -> Result<crate::tasks::Product, PlatformError> {
    let frames = frames_of(
        plan,
        req.first_frame_image.as_ref(),
        req.last_frame_image.as_ref(),
    )?;
    let frames = as_images(st, &frames)?;
    let ref_images = as_images(st, &req.reference_image_paths)?;
    let ref_videos = as_media(st, &req.reference_video_urls)?;
    let ref_audios = as_media(st, &req.reference_audio_urls)?;

    let job = maas_media::video::VideoJob {
        plan,
        prompt: &req.prompt,
        frames: &frames,
        ref_images: &ref_images,
        ref_videos: &ref_videos,
        ref_audios: &ref_audios,
        duration: req.duration,
        aspect_ratio: &req.params.aspect_ratio,
        resolution: &req.params.resolution,
        generate_audio: req.params.generate_audio,
        model_id: req.model_id.as_deref(),
    };
    let url = maas_media::video::generate(&st.client, &st.media, &job).await?;
    land::land(st, &url).await
}

// ---------------------------------------------------------------------------
// 音乐
// ---------------------------------------------------------------------------

#[derive(Debug, Default, Deserialize)]
pub struct MusicSubmit {
    /// 风格描述。**不是歌词** —— 揉在一起会丢掉其中一路，而且不报错。
    #[serde(default)]
    pub prompt: String,
    #[serde(default)]
    pub lyrics: String,
    /// `song` / `instrumental`。
    #[serde(default)]
    pub mode: Option<String>,
    #[serde(default)]
    pub model_id: Option<String>,
    #[serde(default)]
    pub vendor: Option<String>,
}

/// `mode` → 「明确要器乐吗」。
///
/// 返回 `Option<bool>` 而不是 `bool`：要区分「没给 mode」和「明确说了要有
/// 唱词」。塌成 bool 的话，"我要有词但忘了给词"会被翻成"那就出器乐"，
/// 用户听到才发现。
pub fn instrumental_of(mode: Option<&str>) -> Option<bool> {
    match mode?.to_ascii_lowercase().as_str() {
        "instrumental" | "bgm" => Some(true),
        "song" | "vocal" | "vocals" => Some(false),
        _ => None,
    }
}

pub async fn submit_music(State(state): State<Arc<AppState>>, body: Bytes) -> Json<Value> {
    let req: MusicSubmit = serde_json::from_slice(&body).unwrap_or_else(|err| {
        tracing::warn!("音乐提交体解析失败，按空请求处理: {err}");
        MusicSubmit::default()
    });
    let task_id = state.tasks.create();
    tracing::info!(task = %task_id, lyrics = !req.lyrics.trim().is_empty(), "接到音乐生成");

    let (st, id) = (state.clone(), task_id.clone());
    tokio::spawn(async move {
        let intent = maas_media::audio::MusicIntent::infer(
            instrumental_of(req.mode.as_deref()),
            &req.lyrics,
        );
        let result = match maas_media::audio::generate_music(
            &st.client,
            &st.media,
            &req.prompt,
            &req.lyrics,
            intent,
            req.model_id.as_deref(),
        )
        .await
        {
            Ok(url) => land::land(&st, &url).await,
            Err(err) => Err(err),
        };
        st.tasks.finish(&id, result);
    });

    accepted(&task_id, "audio")
}

// ---------------------------------------------------------------------------
// 语音
// ---------------------------------------------------------------------------

#[derive(Debug, Default, Deserialize)]
pub struct SpeechSubmit {
    /// 一段一条。官方就是数组 —— 只做第一条的话其余几段会**生成了但没人
    /// 知道**，既占额度又不出现在画布上。
    #[serde(default)]
    pub texts: Vec<String>,
    #[serde(default)]
    pub voice_id: Option<String>,
    /// 语音这个叫 `model_name` 不是 `model_id`，官方就是这么不一致的。
    #[serde(default)]
    pub model_name: Option<String>,
    #[serde(default)]
    pub vendor: Option<String>,
}

pub async fn submit_speech(State(state): State<Arc<AppState>>, body: Bytes) -> Json<Value> {
    let req: SpeechSubmit = serde_json::from_slice(&body).unwrap_or_else(|err| {
        tracing::warn!("语音提交体解析失败，按空请求处理: {err}");
        SpeechSubmit::default()
    });
    let task_id = state.tasks.create();
    tracing::info!(task = %task_id, clips = req.texts.len(), "接到语音合成");

    let (st, id) = (state.clone(), task_id.clone());
    tokio::spawn(async move {
        let result = run_speech(&st, &req).await;
        st.tasks.finish(&id, result);
    });

    accepted(&task_id, "audio")
}

async fn run_speech(
    st: &AppState,
    req: &SpeechSubmit,
) -> Result<crate::tasks::Product, PlatformError> {
    let texts: Vec<&String> = req.texts.iter().filter(|t| !t.trim().is_empty()).collect();
    if texts.is_empty() {
        return Err(PlatformError::config("语音合成没有给文本（texts 是空的）"));
    }
    // 音色缺失**在联网前就报，并且把可选项列出来**。挑一个顶上会让用户听到
    // 一个完全陌生的声音而没有任何提示 —— 语音是最容易"听出来不对但说不清
    // 哪里不对"的模态。
    let Some(voice) = req.voice_id.as_deref().filter(|v| !v.trim().is_empty()) else {
        let known: Vec<&str> = st
            .media
            .models
            .voice_map
            .keys()
            .map(String::as_str)
            .collect();
        return Err(PlatformError::config(format!(
            "语音合成要指定 voice_id。本机配好的音色：{}",
            if known.is_empty() {
                "（一个都没有，去 config.json 的 models.voice_map 里配）".to_string()
            } else {
                known.join(" / ")
            }
        )));
    };

    let mut landed: Vec<crate::tasks::Product> = Vec::with_capacity(texts.len());
    for text in texts {
        let url = maas_media::audio::synthesize_speech(
            &st.client,
            &st.media,
            text,
            voice,
            req.model_name.as_deref(),
        )
        .await?;
        landed.push(land::land(st, &url).await?);
    }
    // 至少有一条，上面已经挡住了空数组。
    let mut first = landed.remove(0);
    first.extra = landed.into_iter().map(|p| p.path).collect();
    Ok(first)
}

/// 轮询。
pub async fn query_task(
    State(state): State<Arc<AppState>>,
    Path(task_id): Path<String>,
) -> Json<Value> {
    Json(task_response(&task_id, state.tasks.get(&task_id)))
}

/// 组轮询响应。
///
/// 抽出来是为了能直接断言形状 —— 少一个字段调用方就判失败，而那个失败
/// 不会说清少了什么。
pub fn task_response(task_id: &str, state: Option<TaskState>) -> Value {
    match state {
        Some(TaskState::Succeeded(p)) => {
            let mut result = json!({ "ok": true, "path": p.path });
            // 尺寸给不出也没关系，调用方会自己从文件里读。
            if let Some(w) = p.width {
                result["width"] = json!(w);
            }
            if let Some(h) = p.height {
                result["height"] = json!(h);
            }
            // 多段语音的其余几段。空的时候**不发这个键** —— 官方契约里没有
            // 它，发个空数组只会让调用方多一次没意义的分支。
            if !p.extra.is_empty() {
                result["paths"] = json!(
                    std::iter::once(p.path.clone())
                        .chain(p.extra.iter().cloned())
                        .collect::<Vec<_>>()
                );
            }
            json!({
                "ok": true,
                "task_id": task_id,
                "status": "succeeded",
                "result": result,
            })
        }
        Some(TaskState::Running) => json!({
            "ok": true,
            "task_id": task_id,
            "status": "processing",
        }),
        Some(TaskState::Failed { code, message }) => json!({
            "ok": false,
            "task_id": task_id,
            "status": "failed",
            "error": message,
            // 官方的 `GenerateErrorCode` 是个枚举，自定义字符串会让调用方的
            // zod 解析失败。`backend_error` 是这里唯一诚实的通用值 ——
            // 真正的原因在 `error` / `user_message` 里。
            "error_code": "backend_error",
            "user_message": message,
            "detail_code": code,
        }),
        // 认不出的 id 只可能是服务重启过。**必须回终态**，
        // 回 processing 会让画布一直转到它自己的超时上限。
        None => json!({
            "ok": false,
            "task_id": task_id,
            "status": "failed",
            "error": "任务不存在，gateway 可能已重启",
            "error_code": "backend_error",
            "user_message": "生成任务已失效，请重试",
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_succeeded_task_carries_a_workspace_path_not_a_url() {
        // 官方契约是 path。换成 URL 的话每个调用方都得自己再落一次盘，
        // 而落盘有去重、入库、按类型归档三段逻辑，不该散在调用方手里。
        let v = task_response(
            "t-1",
            Some(TaskState::Succeeded(crate::tasks::Product {
                path: "images/a.png".into(),
                width: Some(1024),
                height: Some(768),
                extra: vec![],
            })),
        );
        assert_eq!(v["status"], "succeeded");
        assert_eq!(v["result"]["ok"], true);
        assert_eq!(v["result"]["path"], "images/a.png");
        assert_eq!(v["result"]["width"], 1024);
        assert_eq!(v["result"]["height"], 768);
        assert!(v["result"].get("url").is_none(), "不该回 URL");
    }

    #[test]
    fn missing_dimensions_are_simply_omitted() {
        // 音频没有宽高。发一个 null 会让调用方的 schema 校验失败。
        let v = task_response(
            "t-1",
            Some(TaskState::Succeeded(crate::tasks::Product {
                path: "audios/a.wav".into(),
                width: None,
                height: None,
                extra: vec![],
            })),
        );
        assert_eq!(v["result"]["path"], "audios/a.wav");
        assert!(v["result"].get("width").is_none());
    }

    #[test]
    fn a_running_task_is_processing() {
        let v = task_response("t-1", Some(TaskState::Running));
        assert_eq!(v["status"], "processing");
        assert_eq!(v["ok"], true);
    }

    #[test]
    fn a_failure_keeps_the_reason_and_uses_an_enum_error_code() {
        // 自定义 error_code 会让调用方的 zod 解析失败，于是连 message
        // 都传不回去 —— 画布上就成了一个没有原因的失败节点。
        let v = task_response(
            "t-1",
            Some(TaskState::Failed {
                code: "platform.model_not_found".into(),
                message: "无可用渠道".into(),
            }),
        );
        assert_eq!(v["status"], "failed");
        assert_eq!(v["error_code"], "backend_error");
        assert_eq!(v["user_message"], "无可用渠道");
        // 真正的码留在一个不参与解析的字段里，日志和排查要用。
        assert_eq!(v["detail_code"], "platform.model_not_found");
    }

    #[test]
    fn an_unknown_task_is_terminal_not_pending() {
        // 回 processing 会让画布转到它自己的超时上限（官方是 6 小时）。
        let v = task_response("t-gone", None);
        assert_eq!(v["status"], "failed");
        assert_eq!(v["ok"], false);
    }

    // -- 视频玩法 -------------------------------------------------------------

    #[test]
    fn first_last_frame_is_not_read_as_last_frame_only() {
        // `first-last-frame` 同时含 first 和 last。先判 last 的话它会变成
        // l2va —— 平台只收尾帧、把首帧丢了，出来一段开头完全不对的视频，
        // 而且不报错。
        assert_eq!(
            plan_of(Some("first-last-frame"), true, true, false),
            VideoPlan::FirstLastFrame
        );
        assert_eq!(
            plan_of(Some("last_frame"), false, true, false),
            VideoPlan::LastFrame
        );
    }

    #[test]
    fn the_field_name_disambiguates_what_the_frame_count_cannot() {
        // 只给首帧和只给尾帧都是"一张图"，张数分不出来 —— 但字段名分得出来。
        // 弄反会让画面朝相反方向发展，不报错。
        assert_eq!(
            plan_of(None, true, false, false),
            VideoPlan::ImageToVideo,
            "只给 first_frame_image"
        );
        assert_eq!(
            plan_of(None, false, true, false),
            VideoPlan::LastFrame,
            "只给 last_frame_image"
        );
    }

    #[test]
    fn an_unrecognised_mode_falls_through_to_the_inputs() {
        // 官方随时会加新玩法。认不出就当没给 mode，按输入推 ——
        // 直接失败的话，agent 照着新提示词调过来会整条不通。
        assert_eq!(
            plan_of(Some("cinemagraph-v9"), true, true, false),
            VideoPlan::FirstLastFrame
        );
    }

    #[test]
    fn references_win_over_frames() {
        assert_eq!(plan_of(None, true, false, true), VideoPlan::Reference);
    }

    #[test]
    fn a_missing_keyframe_is_refused_rather_than_degraded() {
        // flf2v 少一张会被平台当成 i2v 处理，出来一段"看着能用但尾帧完全
        // 不对"的视频 —— 没人会去核对。
        let first = "a.png".to_string();
        let err = frames_of(VideoPlan::FirstLastFrame, Some(&first), None).unwrap_err();
        assert!(err.message.contains("尾帧"), "{}", err.message);

        let ok = frames_of(VideoPlan::FirstLastFrame, Some(&first), Some(&first)).unwrap();
        assert_eq!(ok.len(), 2, "顺序是 [首帧, 尾帧]");
        // 文生视频不需要帧，不该因为没给就失败。
        assert!(
            frames_of(VideoPlan::TextToVideo, None, None)
                .unwrap()
                .is_empty()
        );
    }

    // -- 音乐意图 -------------------------------------------------------------

    #[test]
    fn an_absent_mode_is_not_the_same_as_instrumental() {
        // 塌成 bool 的话，"我要有词但忘了给词"会被翻成"那就出器乐"，
        // 用户听到才发现。
        assert_eq!(instrumental_of(None), None);
        assert_eq!(instrumental_of(Some("nonsense")), None);
        assert_eq!(instrumental_of(Some("song")), Some(false));
        assert_eq!(instrumental_of(Some("INSTRUMENTAL")), Some(true));
    }

    #[test]
    fn a_song_without_lyrics_is_a_contradiction_not_an_instrumental() {
        use maas_media::audio::MusicIntent;
        assert_eq!(
            MusicIntent::infer(instrumental_of(Some("song")), ""),
            MusicIntent::LyricsMissing
        );
    }

    // -- 多段语音 -------------------------------------------------------------

    #[test]
    fn every_clip_of_a_multi_text_speech_task_comes_back() {
        // 只回第一条的话后面几段就生成了但没人知道 —— 既占了额度，
        // 又不会出现在画布上。
        let v = task_response(
            "t-1",
            Some(TaskState::Succeeded(crate::tasks::Product {
                path: "audios/a.wav".into(),
                width: None,
                height: None,
                extra: vec!["audios/b.wav".into()],
            })),
        );
        assert_eq!(v["result"]["path"], "audios/a.wav", "第一条仍在 path 上");
        let all = v["result"]["paths"].as_array().unwrap();
        assert_eq!(all.len(), 2);
        assert_eq!(all[0], "audios/a.wav");
        assert_eq!(all[1], "audios/b.wav");
    }

    #[test]
    fn a_single_clip_does_not_grow_a_paths_key() {
        // 官方契约里没有 paths。发个空数组只会让调用方多一次没意义的分支。
        let v = task_response(
            "t-1",
            Some(TaskState::Succeeded(crate::tasks::Product {
                path: "audios/a.wav".into(),
                width: None,
                height: None,
                extra: vec![],
            })),
        );
        assert!(v["result"].get("paths").is_none());
    }

    #[test]
    fn parses_a_submit_body_with_extra_fields() {
        // 调用方会带 backend / filename / source_tool 等我们不用的键，
        // 多一个键就解析失败的话，接官方 mcp-tools 时会全线挂掉。
        let raw = r#"{
            "backend": "nano_banana",
            "model_id": "nano_banana_2_flash",
            "prompt": "a cat",
            "image_paths": [],
            "filename": "cat.png",
            "params": { "aspect_ratio": "16:9", "resolution": "1K" },
            "source_tool": "hub_generate_image"
        }"#;
        let req: ImageSubmit = serde_json::from_str(raw).unwrap();
        assert_eq!(req.prompt, "a cat");
        assert_eq!(req.params.aspect_ratio, "16:9");
        assert!(req.image_paths.is_empty());
    }
}
