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
) -> Result<String, PlatformError> {
    let (path, body) = if images.is_empty() {
        let model = cfg.model(|m| m.image.as_ref(), "models.image")?;
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
        let model = cfg.model(|m| m.image_edit.as_ref(), "models.image_edit")?;
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

    let resp = client
        .post(format!("{}{path}", cfg.platform.base()))
        .bearer_auth(&cfg.platform.api_key)
        .timeout(TIMEOUT)
        .json(&body)
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

#[cfg(test)]
mod tests {
    use super::*;

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
        let err = generate(&reqwest::Client::new(), &cfg, "cat", &[], "1:1", "1K")
            .await
            .unwrap_err();
        assert_eq!(err.code, "dpp.config");
        assert!(err.message.contains("models.image"), "{}", err.message);
    }
}
