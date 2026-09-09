//! 视频与超分，以及所有异步任务共用的提交/轮询。
//!
//! 平台把视频、超分、语音、音乐**全部**挂在 `POST /v1/videos` 下，靠
//! `metadata.task_type` 区分。所以 [`submit_and_poll`] 是这个 crate 里
//! 除图片之外所有能力的公共出口。

use std::time::{Duration, Instant};

use serde::Deserialize;
use serde_json::{Map, Value, json};

use crate::MediaConfig;
use crate::error::PlatformError;

const SUBMIT_TIMEOUT: Duration = Duration::from_secs(60);
const QUERY_TIMEOUT: Duration = Duration::from_secs(30);
/// 轮询上限。调用方对整条链路通常另有超时，这里只是兜底不要无限转。
const POLL_MAX_WAIT: Duration = Duration::from_secs(30 * 60);
const POLL_INTERVAL: Duration = Duration::from_secs(5);

// ---------------------------------------------------------------------------
// 玩法
// ---------------------------------------------------------------------------

/// 一次视频请求对应平台上的哪种玩法。
///
/// 平台靠 `metadata.task_type` 区分，引擎侧再落到 `frame_indices`
/// （`[0]` / `[-1]` / `[0,-1]`）—— **模型名不决定玩法**，同一个 checkpoint
/// 四种都吃。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VideoPlan {
    /// 纯文生视频。
    TextToVideo,
    /// 给首帧。
    ImageToVideo,
    /// 给首尾帧。
    FirstLastFrame,
    /// 只给尾帧，反推开头。
    ///
    /// 输入形态和 [`Self::ImageToVideo`] 一样（都是一张图），只有语义相反 ——
    /// **靠张数推不出来，必须由调用方显式区分**。当成 i2v 会让画面朝反方向
    /// 发展，而且不报错。
    LastFrame,
    /// 参考图 / 参考视频生视频。
    Reference,
}

impl VideoPlan {
    pub fn task_type(self) -> &'static str {
        match self {
            Self::TextToVideo => "t2v",
            Self::ImageToVideo => "i2v",
            Self::FirstLastFrame => "flf2v",
            Self::LastFrame => "l2va",
            Self::Reference => "r2va",
        }
    }

    /// 这种玩法用哪个模型字段。参考族和首尾帧族是两个 checkpoint。
    fn uses_ref_model(self) -> bool {
        matches!(self, Self::Reference)
    }
}

/// 一次视频生成的全部输入。
///
/// 用一个结构体而不是十来个位置参数：这些字段里有好几组含义相近、
/// 类型相同（`frames` / `ref_images` 都是 `&[String]`），位置传参放错了
/// 编译器不会拦，而平台只会安静地生成一个不对的结果。
#[derive(Debug, Clone, Copy)]
pub struct VideoJob<'a> {
    pub plan: VideoPlan,
    pub prompt: &'a str,
    /// 首帧、尾帧，按顺序。`plan` 决定用几张。
    pub frames: &'a [String],
    /// 参考素材。和首帧图是**不同的键**，混用会让平台的输入形态判定失准。
    pub ref_images: &'a [String],
    pub ref_videos: &'a [String],
    pub ref_audios: &'a [String],
    pub duration: Option<u32>,
    /// `"16:9"` 这样的比值；`adaptive` 或空表示跟随输入。
    pub aspect_ratio: &'a str,
    /// `768P` / `1080P` / `2K` 这样的档位。
    pub resolution: &'a str,
    /// 要不要连音轨一起生成。`None` 表示不指定，交给平台默认。
    pub generate_audio: Option<bool>,
    /// 调用方点名的模型，**官方那套名字**。路由到本机配置，见 [`crate::route`]。
    pub model_id: Option<&'a str>,
}

impl<'a> VideoJob<'a> {
    /// 只给提示词的最小任务，其余字段按需覆盖。
    pub fn text_to_video(prompt: &'a str) -> Self {
        Self {
            plan: VideoPlan::TextToVideo,
            prompt,
            frames: &[],
            ref_images: &[],
            ref_videos: &[],
            ref_audios: &[],
            duration: None,
            aspect_ratio: "",
            resolution: "",
            generate_audio: None,
            model_id: None,
        }
    }
}

// ---------------------------------------------------------------------------
// 尺寸
// ---------------------------------------------------------------------------

/// 把 `resolution` + `aspect_ratio` 翻成平台的 `size`。
///
/// `adaptive` 或空比值表示「跟随输入」——那种情况**不传 size**，让平台按
/// 输入图自己定。硬塞一个会把画面裁掉，而且不报错。
pub fn resolve_size(aspect_ratio: &str, resolution: &str) -> Option<String> {
    let ratio = aspect_ratio.trim();
    if ratio.is_empty() || ratio.eq_ignore_ascii_case("adaptive") {
        return None;
    }
    let short_edge: u32 = match resolution.trim().to_ascii_uppercase().as_str() {
        "2K" => 1440,
        "1080P" => 1080,
        "480P" => 480,
        // 768P 是基准档，认不出的也按它算。
        _ => 768,
    };
    let (w, h) = ratio.split_once(':')?;
    let w: f64 = w.trim().parse().ok()?;
    let h: f64 = h.trim().parse().ok()?;
    if w <= 0.0 || h <= 0.0 {
        return None;
    }
    let r = w / h;
    let (pw, ph) = if r >= 1.0 {
        ((short_edge as f64 * r).round() as u32, short_edge)
    } else {
        (short_edge, (short_edge as f64 / r).round() as u32)
    };
    Some(format!("{}x{}", round_to_8(pw), round_to_8(ph)))
}

fn round_to_8(v: u32) -> u32 {
    (v.max(8) + 4) / 8 * 8
}

// ---------------------------------------------------------------------------
// 提交体
// ---------------------------------------------------------------------------

/// 组视频任务的提交体。
///
/// 单独抽出来是为了能直接断言键的落位 —— 平台对参数校验比较松，
/// **越界或放错的字段不报错，只会安静生成一个不是你要的结果**。
pub fn build_body(cfg: &MediaConfig, job: &VideoJob<'_>) -> Result<Value, PlatformError> {
    // 调用方点名的是**官方那套名字**（`MiniMax-Hailuo-2.3` …），路由到我们
    // 配的模型。不走路由的话 `model_id` 就是收下即丢，agent 以为自己选了模型
    // 而实际一直在用默认 —— 而且不报错。
    let (modality, field) = if job.plan.uses_ref_model() {
        (crate::route::Modality::VideoRef, "models.video_ref")
    } else {
        (crate::route::Modality::Video, "models.video")
    };
    let model = crate::route::route(&cfg.models, job.model_id, modality)
        .map(|r| r.model)
        .ok_or_else(|| PlatformError::config(format!("{field} 未配置，这个能力不可用")))?;

    let mut metadata = Map::new();
    metadata.insert("task_type".into(), json!(job.plan.task_type()));
    if let Some(audio) = job.generate_audio {
        metadata.insert("generate_audio".into(), json!(audio));
    }

    let mut body = Map::new();
    body.insert("model".into(), json!(model));
    body.insert("prompt".into(), json!(job.prompt));

    match job.plan {
        VideoPlan::ImageToVideo | VideoPlan::LastFrame => {
            // i2v 和 l2va 的输入形态一样（都是一张图），平台靠 task_type 区分
            // 语义。多传会被平台 400。
            if let Some(only) = job.frames.first() {
                body.insert("image".into(), json!(only));
            }
        }
        VideoPlan::FirstLastFrame => {
            // flf2v 要求正好 [首帧, 尾帧]。
            body.insert("images".into(), json!(job.frames));
        }
        VideoPlan::Reference => {
            if !job.ref_images.is_empty() {
                metadata.insert("src_ref_images".into(), json!(job.ref_images));
            }
            if !job.ref_videos.is_empty() {
                metadata.insert("reference_videos".into(), json!(job.ref_videos));
            }
            if !job.ref_audios.is_empty() {
                metadata.insert("reference_audios".into(), json!(job.ref_audios));
            }
        }
        VideoPlan::TextToVideo => {}
    }

    if let Some(d) = job.duration {
        body.insert("duration".into(), json!(d));
    }
    if let Some(size) = resolve_size(job.aspect_ratio, job.resolution) {
        body.insert("size".into(), json!(size));
    }
    body.insert("metadata".into(), Value::Object(metadata));
    Ok(Value::Object(body))
}

// ---------------------------------------------------------------------------
// 提交与轮询
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct SubmitResponse {
    #[serde(default)]
    task_id: String,
    #[serde(default)]
    id: String,
}

#[derive(Debug, Deserialize)]
struct QueryResponse {
    #[serde(default)]
    status: String,
    #[serde(default)]
    metadata: QueryMetadata,
}

#[derive(Debug, Default, Deserialize)]
struct QueryMetadata {
    #[serde(default)]
    url: String,
}

/// 提交到平台并轮询到终态，返回结果的公网 URL。
///
/// 视频、超分、语音、音乐**共用这一个**：平台把它们都放在 `/v1/videos`
/// 这个异步任务入口下，提交与轮询的形状完全一样，只有 `metadata.task_type`
/// 不同。
pub async fn submit_and_poll(
    client: &reqwest::Client,
    cfg: &MediaConfig,
    body: &Value,
) -> Result<String, PlatformError> {
    let base = cfg.platform.base();

    let resp = client
        .post(format!("{base}/videos"))
        .bearer_auth(&cfg.platform.api_key)
        .timeout(SUBMIT_TIMEOUT)
        .json(body)
        .send()
        .await
        .map_err(|e| PlatformError::transport(e.to_string()))?;
    let status = resp.status();
    let raw = resp
        .text()
        .await
        .map_err(|e| PlatformError::transport(e.to_string()))?;
    if !status.is_success() {
        return Err(PlatformError::from_body(status.as_u16(), &raw));
    }
    let submitted: SubmitResponse = serde_json::from_str(&raw)
        .map_err(|e| PlatformError::protocol(format!("解析提交响应失败: {e}")))?;
    // 两个键名都见过，取先有的那个。
    let task_id = if submitted.task_id.is_empty() {
        submitted.id
    } else {
        submitted.task_id
    };
    if task_id.is_empty() {
        return Err(PlatformError::protocol("平台提交响应里没有 task_id"));
    }

    let started = Instant::now();
    loop {
        tokio::time::sleep(POLL_INTERVAL).await;
        if started.elapsed() > POLL_MAX_WAIT {
            return Err(PlatformError::protocol("平台任务轮询超时"));
        }

        let resp = client
            .get(format!("{base}/videos/{task_id}"))
            .bearer_auth(&cfg.platform.api_key)
            .timeout(QUERY_TIMEOUT)
            .send()
            .await;
        // 单次网络抖动不当失败 —— 任务在平台侧还好好跑着。
        let Ok(resp) = resp else { continue };
        let status = resp.status();
        let raw = resp.text().await.unwrap_or_default();
        if !status.is_success() {
            return Err(PlatformError::from_body(status.as_u16(), &raw));
        }
        let Ok(query) = serde_json::from_str::<QueryResponse>(&raw) else {
            continue;
        };
        match query.status.as_str() {
            "completed" | "succeeded" | "success" => {
                if query.metadata.url.is_empty() {
                    return Err(PlatformError::protocol("平台报告完成但没有结果 URL"));
                }
                return Ok(query.metadata.url);
            }
            "failed" | "cancelled" | "canceled" | "error" => {
                return Err(PlatformError::from_body(200, &raw));
            }
            // queued / in_progress / 其余未知状态都当进行中。
            _ => {}
        }
    }
}

/// 生成一段视频，返回结果的公网 URL。
pub async fn generate(
    client: &reqwest::Client,
    cfg: &MediaConfig,
    job: &VideoJob<'_>,
) -> Result<String, PlatformError> {
    submit_and_poll(client, cfg, &build_body(cfg, job)?).await
}

/// 超分：把一段已有素材放大到目标分辨率。
///
/// 源素材走 `metadata.video`，**不是** `src_ref_images` 那一组 ——
/// 「被加工的素材」和「参考素材」是两种语义，重载同一个键会让平台的
/// 输入形态判定失准。
pub async fn upscale(
    client: &reqwest::Client,
    cfg: &MediaConfig,
    source: &str,
    resolution: &str,
) -> Result<String, PlatformError> {
    let model = cfg.model(|m| m.video_upscale.as_ref(), "models.video_upscale")?;

    let mut metadata = Map::new();
    metadata.insert("task_type".into(), json!("sr"));
    metadata.insert("video".into(), json!(source));
    // 目标分辨率按档位词传，平台按它决定放大倍率。
    if !resolution.trim().is_empty() {
        metadata.insert("resolution".into(), json!(resolution));
    }

    let body = json!({
        "model": model,
        // sr 的提示词没有意义，但平台要求 prompt 非空
        // （ValidateBasicTaskRequest），空的直接 400。
        "prompt": "upscale",
        "metadata": Value::Object(metadata),
    });
    submit_and_poll(client, cfg, &body).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{Models, Platform};

    fn cfg() -> MediaConfig {
        MediaConfig {
            platform: Platform {
                base_url: "https://maas.example.com/v1".into(),
                api_key: "k".into(),
                chat_model: "chat".into(),
            },
            models: Models {
                video: Some("minimax-h3-fl2va".into()),
                video_ref: Some("minimax-h3-ref2va".into()),
                video_upscale: Some("swiftvr".into()),
                ..Default::default()
            },
        }
    }

    fn job<'a>(plan: VideoPlan, frames: &'a [String], refs: &'a [String]) -> VideoJob<'a> {
        VideoJob {
            plan,
            prompt: "一只猫",
            frames,
            ref_images: refs,
            ref_videos: &[],
            ref_audios: &[],
            duration: Some(5),
            aspect_ratio: "16:9",
            resolution: "768P",
            generate_audio: None,
            model_id: None,
        }
    }

    #[test]
    fn task_types_match_the_platform_enum() {
        // 这五个字符串是平台的 videoFamilyTaskTypes，改之前先去平台复测。
        assert_eq!(VideoPlan::TextToVideo.task_type(), "t2v");
        assert_eq!(VideoPlan::ImageToVideo.task_type(), "i2v");
        assert_eq!(VideoPlan::FirstLastFrame.task_type(), "flf2v");
        assert_eq!(VideoPlan::LastFrame.task_type(), "l2va");
        assert_eq!(VideoPlan::Reference.task_type(), "r2va");
    }

    #[test]
    fn single_frame_plans_use_image_not_images() {
        // 多传会被平台 400。
        let frames = vec!["data:image/png;base64,A".to_string()];
        for plan in [VideoPlan::ImageToVideo, VideoPlan::LastFrame] {
            let b = build_body(&cfg(), &job(plan, &frames, &[])).unwrap();
            assert_eq!(b["image"], frames[0]);
            assert!(b.get("images").is_none(), "{plan:?}");
            assert_eq!(b["metadata"]["task_type"], plan.task_type());
        }
    }

    #[test]
    fn first_last_frame_sends_both_in_order() {
        let frames = vec!["first".to_string(), "last".to_string()];
        let b = build_body(&cfg(), &job(VideoPlan::FirstLastFrame, &frames, &[])).unwrap();
        assert_eq!(b["images"], json!(["first", "last"]));
        assert!(b.get("image").is_none());
    }

    #[test]
    fn reference_material_goes_to_metadata_not_the_frame_keys() {
        // 参考素材和首帧图混用会让平台的输入形态判定失准。
        let refs = vec!["https://x/a.png".to_string()];
        let b = build_body(&cfg(), &job(VideoPlan::Reference, &[], &refs)).unwrap();
        assert_eq!(b["metadata"]["src_ref_images"], json!(refs));
        assert!(b.get("image").is_none());
        assert!(b.get("images").is_none());
    }

    #[test]
    fn reference_plan_uses_the_reference_checkpoint() {
        // 参考族和首尾帧族是两个 checkpoint，发错模型出来的东西完全不同。
        let refs = vec!["https://x/a.png".to_string()];
        assert_eq!(
            build_body(&cfg(), &job(VideoPlan::Reference, &[], &refs)).unwrap()["model"],
            "minimax-h3-ref2va"
        );
        assert_eq!(
            build_body(&cfg(), &job(VideoPlan::TextToVideo, &[], &[])).unwrap()["model"],
            "minimax-h3-fl2va"
        );
    }

    #[test]
    fn generate_audio_reaches_the_payload() {
        // 这个开关此前在调用链上被整个丢掉了：用户在界面上关掉音轨，
        // 平台照样生成 —— 不报错，只是多花时间出一个没人要的音轨。
        let mut j = job(VideoPlan::TextToVideo, &[], &[]);
        j.generate_audio = Some(false);
        let b = build_body(&cfg(), &j).unwrap();
        assert_eq!(b["metadata"]["generate_audio"], json!(false));

        // 不指定就不发这个键，交给平台默认。
        let b = build_body(&cfg(), &job(VideoPlan::TextToVideo, &[], &[])).unwrap();
        assert!(b["metadata"].get("generate_audio").is_none());
    }

    #[test]
    fn adaptive_ratio_omits_size_entirely() {
        // 硬塞一个 size 会把画面裁掉，而且不报错。
        assert_eq!(resolve_size("adaptive", "1080P"), None);
        assert_eq!(resolve_size("", "1080P"), None);
        assert_eq!(resolve_size("16:9", "768P"), Some("1368x768".to_string()));

        let mut j = job(VideoPlan::TextToVideo, &[], &[]);
        j.aspect_ratio = "adaptive";
        assert!(build_body(&cfg(), &j).unwrap().get("size").is_none());
    }

    #[test]
    fn video_sizes_are_multiples_of_eight() {
        for ratio in ["21:9", "4:5", "3:2", "9:16"] {
            let size = resolve_size(ratio, "1080P").unwrap();
            let (w, h) = size.split_once('x').unwrap();
            assert_eq!(w.parse::<u32>().unwrap() % 8, 0, "{size}");
            assert_eq!(h.parse::<u32>().unwrap() % 8, 0, "{size}");
        }
    }

    #[test]
    fn a_missing_model_is_reported_as_config_not_as_a_failed_generation() {
        let mut c = cfg();
        c.models.video = None;
        let err = build_body(&c, &job(VideoPlan::TextToVideo, &[], &[])).unwrap_err();
        assert_eq!(err.code, "dpp.config");
        assert!(err.message.contains("models.video"), "{}", err.message);
    }

    #[tokio::test]
    async fn upscale_without_a_model_fails_before_any_network_call() {
        let mut c = cfg();
        c.models.video_upscale = None;
        let err = upscale(&reqwest::Client::new(), &c, "https://x/a.mp4", "2K")
            .await
            .unwrap_err();
        assert!(
            err.message.contains("models.video_upscale"),
            "{}",
            err.message
        );
    }
}
