//! 图片生成。平台侧这条是**同步**的，不是任务。

use std::path::Path;
use std::time::Duration;

use base64::Engine;
use serde::Deserialize;
use serde_json::json;

use crate::MediaConfig;
use crate::error::PlatformError;

/// 出图本身就要几十秒，而且是同步接口，超时要给够。
const TIMEOUT: Duration = Duration::from_secs(300);

// ---------------------------------------------------------------------------
// 尺寸换算
// ---------------------------------------------------------------------------

/// 把 `aspect_ratio` + `resolution` 档位翻成平台要的 `size`。
///
/// 调用方给的常是 `"16:9"` 这样的比值加 `"1K"` / `"2K"` 档位，平台要的是
/// `"1024x1024"` 这种像素尺寸。按短边对齐档位、长边按比例推，再取整到 8 的
/// 倍数 —— 扩散模型基本都要求边长能被 8 整除。
pub fn resolve_size(aspect_ratio: &str, resolution: &str) -> String {
    let short_edge: u32 = match resolution.trim().to_ascii_uppercase().as_str() {
        "2K" => 1440,
        "4K" => 2160,
        // 空值和认不出的档位都按 1K：不填 resolution 很常见，
        // 这时候报错没有意义。
        _ => 1024,
    };

    let ratio = parse_ratio(aspect_ratio).unwrap_or(1.0);
    let (w, h) = if ratio >= 1.0 {
        ((short_edge as f64 * ratio).round() as u32, short_edge)
    } else {
        (short_edge, (short_edge as f64 / ratio).round() as u32)
    };
    format!("{}x{}", round_to_8(w), round_to_8(h))
}

fn parse_ratio(raw: &str) -> Option<f64> {
    let (w, h) = raw.trim().split_once(':')?;
    let w: f64 = w.trim().parse().ok()?;
    let h: f64 = h.trim().parse().ok()?;
    if w <= 0.0 || h <= 0.0 {
        return None;
    }
    Some(w / h)
}

fn round_to_8(v: u32) -> u32 {
    (v.max(8) + 4) / 8 * 8
}

// ---------------------------------------------------------------------------
// 输入素材
// ---------------------------------------------------------------------------

/// 把一组素材路径变成平台能吃的输入。
///
/// 平台**三种形态都接受**（http(s) URL / 裸 base64 / data URI），报错原文：
/// 「输入 image 既非 http(s) URL 也非合法 base64/data-uri」。所以已经是 URL
/// 或 data URI 的原样透传，只有相对路径需要读盘转码。
///
/// `base_dir` 是相对路径的基准目录。
pub fn load_image_inputs(base_dir: &Path, paths: &[String]) -> Result<Vec<String>, PlatformError> {
    load(base_dir, paths, guess_image_mime)
}

/// 同上，但按扩展名猜视频 / 音频的 MIME。
pub fn load_media_inputs(base_dir: &Path, paths: &[String]) -> Result<Vec<String>, PlatformError> {
    load(base_dir, paths, guess_media_mime)
}

fn load(
    base_dir: &Path,
    paths: &[String],
    mime_of: fn(&str) -> &'static str,
) -> Result<Vec<String>, PlatformError> {
    let mut out = Vec::with_capacity(paths.len());
    for raw in paths {
        let p = raw.trim();
        if p.is_empty() {
            continue;
        }
        if p.starts_with("http://") || p.starts_with("https://") || p.starts_with("data:") {
            out.push(p.to_string());
            continue;
        }
        let abs = base_dir.join(p);
        // 静默跳过读不到的底图会让图生图**退化成文生图** —— 不报错，
        // 用户看到的是「重绘把整张图换了」。
        let bytes = std::fs::read(&abs)
            .map_err(|e| PlatformError::io(format!("读取素材失败 {}: {e}", abs.display())))?;
        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
        out.push(format!("data:{};base64,{b64}", mime_of(p)));
    }
    Ok(out)
}

fn ext_of(path: &str) -> Option<String> {
    path.rsplit('.').next().map(str::to_ascii_lowercase)
}

fn guess_image_mime(path: &str) -> &'static str {
    match ext_of(path).as_deref() {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        Some("gif") => "image/gif",
        Some("heic") => "image/heic",
        _ => "image/png",
    }
}

fn guess_media_mime(path: &str) -> &'static str {
    match ext_of(path).as_deref() {
        Some("mp4") => "video/mp4",
        Some("mov") => "video/quicktime",
        Some("webm") => "video/webm",
        Some("mp3") => "audio/mpeg",
        Some("wav") => "audio/wav",
        Some("m4a") => "audio/mp4",
        Some("flac") => "audio/flac",
        _ => "application/octet-stream",
    }
}

// ---------------------------------------------------------------------------
// 出图
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct ImageResponse {
    #[serde(default)]
    data: Vec<ImageItem>,
}

#[derive(Debug, Default, Deserialize)]
struct ImageItem {
    #[serde(default)]
    url: String,
}

/// 出一张图，返回**公网可下载的 URL**。
///
/// `images` 非空走 `/images/edits`（图生图），否则走 `/images/generations`
/// （文生图）。两个都是同步接口，直接返回结果。
pub async fn generate(
    client: &reqwest::Client,
    cfg: &MediaConfig,
    prompt: &str,
    images: &[String],
    aspect_ratio: &str,
    resolution: &str,
    // `model_id`：调用方点名的模型，**用官方那套名字**
    // （`nano-banana` / `seedream_5_pro` …）。路由到我们平台上配的模型，
    // 见 `crate::route`。传 None 就走默认。
    model_id: Option<&str>,
) -> Result<String, PlatformError> {
    let (path, body) = if images.is_empty() {
        let modality = crate::route::Modality::Image;
        let model = crate::route::route(&cfg.models, model_id, modality)
            .map(|r| r.model)
            .ok_or_else(|| PlatformError::config("models.image 未配置，这个能力不可用"))?;
        (
            "/images/generations",
            json!({
                "model": model,
                "prompt": prompt,
                "n": 1,
                "size": resolve_size(aspect_ratio, resolution),
            }),
        )
    } else {
        let modality = crate::route::Modality::ImageEdit;
        let model = crate::route::route(&cfg.models, model_id, modality)
            .map(|r| r.model)
            .ok_or_else(|| PlatformError::config("models.image_edit 未配置，这个能力不可用"))?;
        (
            "/images/edits",
            // 底图字段是 `image`（单张）或 `images`（多张），JSON 或
            // multipart 都行；`data:image/png;base64,` 前缀带不带都接受。
            json!({
                "model": model,
                "prompt": prompt,
                "images": images,
            }),
        )
    };

    post_images(client, cfg, path, &body).await
}

/// 发一次同步出图请求，取回第一个可下载的 URL。
///
/// 文生图 / 图生图 / 超分共用 —— 三者只有 path 和 body 不同，
/// 响应形状和错误处理完全一样。
async fn post_images(
    client: &reqwest::Client,
    cfg: &MediaConfig,
    path: &str,
    body: &serde_json::Value,
) -> Result<String, PlatformError> {
    let resp = client
        .post(format!("{}{path}", cfg.platform.base()))
        .bearer_auth(&cfg.platform.api_key)
        .timeout(TIMEOUT)
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

    let parsed: ImageResponse = serde_json::from_str(&raw)
        .map_err(|e| PlatformError::protocol(format!("解析平台响应失败: {e}")))?;

    parsed
        .data
        .into_iter()
        .map(|item| item.url)
        .find(|url| !url.is_empty())
        // 平台也可能只回 `b64_json`。调用方通常要的是一个能下载的地址，
        // 所以这里显式失败，而不是继续往下走。
        .ok_or_else(|| PlatformError::protocol("平台响应里没有可下载的图片 URL"))
}

// ---------------------------------------------------------------------------
// 超分
// ---------------------------------------------------------------------------

/// 超分档位能到的**长边**像素。官方 `canvas.superResolution.tier.*` 是
/// 「约 2048 / 3840 / 7680 像素长边」。
///
/// **我们只做到 4K。** 实测 7680×4288 的请求回来是 3854×2152 ——
/// 平台**静默截断**，不报错。给一个永远兑现不了的 8K 档位，
/// 用户看到的是「选了 8K，出来的还是 4K」,而没有任何地方说明。
fn tier_long_edge(tier: &str) -> u32 {
    match tier.trim().to_ascii_uppercase().as_str() {
        "4K" => 3840,
        // 空值和认不出的档位都按 2K —— 这是保守的那一档。
        _ => 2048,
    }
}

/// 目标尺寸算出来最多这么多像素 —— 正好是 4K 的像素数。
///
/// **平台按总像素封顶，不是按长边。** 实测（源图分别是 416×232 和 464×464）：
///
/// ```text
/// 请求 3840×2144 = 8.23M → 3840×2144   精确兑现
/// 请求 2880×2880 = 8.29M → 2880×2880   精确兑现
/// 请求 3840×3840 = 14.7M → 2880×2880   截断
/// 请求 7680×4288 = 32.9M → 3854×2152   截断
/// ```
///
/// 两次截断的结果都落在 8,294,400 像素上（= 3840×2160），比例保持不变 ——
/// 所以上限是这个数，而且**不报错**。
///
/// 按长边封顶会放过方图：4K 方图 3840×3840 长边合规，像素数却是横图 4K 的
/// 1.8 倍，照样被截 —— 表现是「选了 4K，出来的尺寸对不上」。
const MAX_PIXELS: u64 = 3840 * 2160;

/// 把源图尺寸 + 档位翻成平台要的精确 `size`。
///
/// ## 为什么必须按源图算，不能只传档位词
///
/// 平台**不读 `metadata.resolution`** —— `gpustackplus` 那条同步 i2i 的路
/// 是按字段白名单转发的，`resolution` 在里面零命中。真正生效的是
/// `size` → `target_shape`。不传 `size` 的话引擎走 `sr_ratio` 的默认值
/// **2.0**,于是不管选 2K 还是 4K，出来的永远是源图的 2 倍 ——
/// 界面显示 4K 而实际是 2 倍，不报错。
///
/// ## 返回 `None` = 这张图不该超分
///
/// 源图已经比档位大时，按比例算出来的 `target_shape` 会**小于**源图,
/// 而引擎会老老实实照办 —— 用户点「高清」,得到一张更糊的图。
/// 这种情况下调用方应当报错，而不是发出请求。
pub fn upscale_size(width: u32, height: u32, tier: &str) -> Option<String> {
    let long = width.max(height);
    if width == 0 || height == 0 {
        return None;
    }

    let mut scale = tier_long_edge(tier) as f64 / long as f64;
    // 已经够大了：算出来会是缩小，不是放大。
    if scale <= 1.0 {
        return None;
    }
    // 像素预算。**先按长边算，再按总量收** —— 方图在长边上合规、
    // 在总量上超标，只看长边会让 4K 方图落进静默截断区。
    let budget = (MAX_PIXELS as f64 / (width as f64 * height as f64)).sqrt();
    if budget < scale {
        scale = budget;
    }
    if scale <= 1.0 {
        return None;
    }

    let w = round_to_8((width as f64 * scale).round() as u32);
    let h = round_to_8((height as f64 * scale).round() as u32);
    Some(format!("{w}x{h}"))
}

/// 图片超分。返回**公网可下载的 URL**。
///
/// 走同步的 `/images/edits`,和图生图是同一条接口 —— 但字段不一样：
///
/// - 底图用**顶层 `image`**（单数）。放进 `metadata.image` 会被判
///   「图片编辑(i2i)必须提供底图」。
/// - 尺寸用 `size`,平台换算成引擎的 `target_shape: [h, w]`。
/// - `prompt` 对超分没有意义，但平台要求非空（`ValidateBasicTaskRequest`）,
///   空的直接 400。
pub async fn upscale(
    client: &reqwest::Client,
    cfg: &MediaConfig,
    source: &str,
    size: &str,
) -> Result<String, PlatformError> {
    let model = cfg.model(|m| m.image_upscale.as_ref(), "models.image_upscale")?;

    let mut body = serde_json::Map::new();
    body.insert("model".into(), json!(model));
    body.insert("prompt".into(), json!("upscale"));
    body.insert("image".into(), json!(source));
    if !size.trim().is_empty() {
        body.insert("size".into(), json!(size));
    }

    post_images(
        client,
        cfg,
        "/images/edits",
        &serde_json::Value::Object(body),
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 2K / 4K 档位都要**按源图比例**算出精确尺寸，长边落在档位上。
    #[test]
    fn upscale_size_hits_the_tier_on_the_long_edge() {
        // 416x232（16:9 附近）→ 2K
        let s = upscale_size(416, 232, "2K").unwrap();
        let (w, h) = s.split_once('x').unwrap();
        let (w, h): (u32, u32) = (w.parse().unwrap(), h.parse().unwrap());
        assert_eq!(w, 2048, "长边要落在档位上");
        // 比例要保住 —— 变形了用户一眼能看出来。
        let want = (232.0f64 / 416.0 * 2048.0).round() as u32;
        assert!(h.abs_diff(want) <= 8, "算出 {h}，期望 {want} 附近");
    }

    /// **已经比档位大的图不超分。**
    ///
    /// 不拦的话算出来的 `target_shape` 小于源图，而引擎会照办 ——
    /// 用户点「高清」得到一张更糊的图，全程不报错。
    #[test]
    fn upscale_size_refuses_to_shrink() {
        assert!(upscale_size(4000, 3000, "2K").is_none());
        assert!(upscale_size(2048, 2048, "2K").is_none());
        assert!(upscale_size(0, 100, "2K").is_none());
    }

    /// 任何档位算出来的像素数都不能超预算。
    ///
    /// **方图是这里的关键用例**：4K 方图长边合规（3840）但总量 14.7M,
    /// 是横图 4K 的 1.8 倍 —— 只看长边会让它落进平台的静默截断区,
    /// 表现是「选了 4K，出来的尺寸对不上」。
    #[test]
    fn upscale_size_stays_within_the_pixel_budget() {
        for (w, h) in [(464u32, 464u32), (416, 232), (800, 600), (300, 1200)] {
            for tier in ["2K", "4K"] {
                let Some(s) = upscale_size(w, h, tier) else {
                    continue;
                };
                let (ow, oh) = s.split_once('x').unwrap();
                let (ow, oh): (u64, u64) = (ow.parse().unwrap(), oh.parse().unwrap());
                assert!(
                    ow * oh <= MAX_PIXELS + MAX_PIXELS / 100,
                    "{w}x{h} @{tier} → {s} = {}M 像素，超出预算",
                    (ow * oh) as f64 / 1e6
                );
                // 而且必须真的是放大。
                assert!(
                    ow >= w as u64 && oh >= h as u64,
                    "{w}x{h} @{tier} → {s} 不是放大"
                );
            }
        }
    }

    #[test]
    fn maps_ratio_and_resolution_to_pixel_size() {
        assert_eq!(resolve_size("1:1", "1K"), "1024x1024");
        assert_eq!(resolve_size("16:9", "1K"), "1824x1024");
        assert_eq!(resolve_size("9:16", "1K"), "1024x1824");
        assert_eq!(resolve_size("1:1", "2K"), "1440x1440");
    }

    #[test]
    fn falls_back_to_square_1k_on_junk_input() {
        assert_eq!(resolve_size("", ""), "1024x1024");
        assert_eq!(resolve_size("not-a-ratio", "8K"), "1024x1024");
        assert_eq!(resolve_size("0:0", "1K"), "1024x1024");
    }

    #[test]
    fn sizes_are_multiples_of_eight() {
        for ratio in ["21:9", "4:5", "3:2", "5:4"] {
            let size = resolve_size(ratio, "1K");
            let (w, h) = size.split_once('x').unwrap();
            assert_eq!(w.parse::<u32>().unwrap() % 8, 0, "{size}");
            assert_eq!(h.parse::<u32>().unwrap() % 8, 0, "{size}");
        }
    }

    #[test]
    fn reads_relative_paths_as_data_uris() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(dir.path().join("images")).unwrap();
        std::fs::write(dir.path().join("images/a.png"), b"\x89PNG fake").unwrap();

        let out = load_image_inputs(dir.path(), &["images/a.png".to_string()]).unwrap();
        assert!(out[0].starts_with("data:image/png;base64,"));
    }

    #[test]
    fn passes_through_urls_and_data_uris_untouched() {
        let dir = tempfile::tempdir().unwrap();
        let inputs = vec![
            "https://cdn.example.com/a.png".to_string(),
            "data:image/png;base64,AAAA".to_string(),
        ];
        assert_eq!(load_image_inputs(dir.path(), &inputs).unwrap(), inputs);
    }

    #[test]
    fn a_missing_file_is_an_error_not_a_silent_skip() {
        // 静默跳过会让图生图退化成文生图，用户看到的是「重绘把整张图换了」。
        let dir = tempfile::tempdir().unwrap();
        let err = load_image_inputs(dir.path(), &["images/gone.png".to_string()]).unwrap_err();
        assert_eq!(err.code, "dpp.io");
    }

    #[test]
    fn media_inputs_guess_av_mime_not_png() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.mp4"), b"fake").unwrap();
        let out = load_media_inputs(dir.path(), &["a.mp4".to_string()]).unwrap();
        assert!(out[0].starts_with("data:video/mp4;base64,"), "{}", out[0]);
    }

    #[tokio::test]
    async fn a_missing_model_is_reported_before_any_network_call() {
        let cfg = MediaConfig::default();
        let err = generate(&reqwest::Client::new(), &cfg, "cat", &[], "1:1", "1K", None)
            .await
            .unwrap_err();
        assert_eq!(err.code, "dpp.config");
        assert!(err.message.contains("models.image"), "{}", err.message);
    }
}
