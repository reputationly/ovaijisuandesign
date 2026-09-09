//! 资产与文件服务。
//!
//! ```text
//! GET  /api/assets                资产列表
//! GET  /files/id/{assetId}?w=     字节流；带 w 时实时缩略
//! POST /api/files/import-url      把公网 URL 收进工作区并登记
//! ```

use std::io::Cursor;
use std::sync::Arc;

use axum::Json;
use axum::body::Body;
use axum::extract::{Path as AxPath, Query, State};
use axum::http::{StatusCode, header};
use axum::response::{IntoResponse, Response};
use serde::Deserialize;
use serde_json::{Value, json};
use tokio_util::io::ReaderStream;

use crate::AppState;

pub async fn list_assets(State(state): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({ "assets": state.assets.list() }))
}

pub async fn workspace_dir(State(state): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({ "dir": state.ws.root().to_string_lossy() }))
}

#[derive(Debug, Deserialize)]
pub struct FileQuery {
    /// 目标宽度。给了就实时缩略 —— 画布上的卡片才 350px 宽，
    /// 让它下原图（动辄 2MB）纯属浪费。
    #[serde(default)]
    w: Option<u32>,
}

pub async fn serve_by_id(
    State(state): State<Arc<AppState>>,
    AxPath(asset_id): AxPath<String>,
    Query(q): Query<FileQuery>,
) -> Response {
    let Some(asset) = state.assets.by_id(&asset_id) else {
        return (StatusCode::NOT_FOUND, "资产不存在").into_response();
    };
    let Some(abs) = state.ws.resolve(&asset.path) else {
        return (StatusCode::NOT_FOUND, "路径超出工作区").into_response();
    };
    serve_path(&abs, q.w).await
}

pub async fn serve_by_path(
    State(state): State<Arc<AppState>>,
    AxPath(rel): AxPath<String>,
    Query(q): Query<FileQuery>,
) -> Response {
    let Some(abs) = state.ws.resolve(&rel) else {
        // 路径逃逸和不存在回同一个码：不要靠错误码区分"没有"和"不许"，
        // 那会把工作区外面有没有某个文件泄露出去。
        return (StatusCode::NOT_FOUND, "找不到").into_response();
    };
    serve_path(&abs, q.w).await
}

async fn serve_path(abs: &std::path::Path, width: Option<u32>) -> Response {
    if !abs.is_file() {
        return (StatusCode::NOT_FOUND, "找不到").into_response();
    }
    let mime = mime_of(abs);

    if let Some(w) = width.filter(|w| *w > 0) {
        // 缩略是 CPU 活，丢到阻塞线程池，别占住 async 执行器。
        let path = abs.to_path_buf();
        match tokio::task::spawn_blocking(move || thumbnail(&path, w)).await {
            Ok(Ok(bytes)) => {
                return ([(header::CONTENT_TYPE, "image/jpeg")], bytes).into_response();
            }
            Ok(Err(err)) => {
                // 缩略失败就回原图 —— 非图片、格式不认识都会走到这里，
                // 那时候给原图比给 500 有用。
                tracing::debug!(path = %abs.display(), "缩略失败，回原图: {err}");
            }
            Err(err) => tracing::warn!("缩略任务失败: {err}"),
        }
    }

    match tokio::fs::File::open(abs).await {
        Ok(file) => (
            [(header::CONTENT_TYPE, mime)],
            Body::from_stream(ReaderStream::new(file)),
        )
            .into_response(),
        Err(err) => {
            tracing::warn!(path = %abs.display(), "打开失败: {err}");
            (StatusCode::NOT_FOUND, "找不到").into_response()
        }
    }
}

/// 按宽度缩略，编码成 JPEG。
///
/// 不回 PNG：官方那边 `?w=700` 回的 PNG 有 1.38MB，而同一张图 JPEG 只要
/// 几十 KB —— 无损压缩对照片几乎不起作用，而这是给卡片看的缩略图。
fn thumbnail(path: &std::path::Path, width: u32) -> anyhow::Result<Vec<u8>> {
    let img = image::open(path)?;
    let scaled = if img.width() > width {
        let height = (img.height() as f64 * width as f64 / img.width() as f64).round() as u32;
        img.thumbnail(width, height.max(1))
    } else {
        // 本来就比目标窄就不放大 —— 放大只会变糊还变大。
        img
    };
    let mut out = Vec::new();
    scaled
        .to_rgb8()
        .write_to(&mut Cursor::new(&mut out), image::ImageFormat::Jpeg)?;
    Ok(out)
}

fn mime_of(path: &std::path::Path) -> &'static str {
    match path
        .extension()
        .map(|e| e.to_string_lossy().to_ascii_lowercase())
        .as_deref()
    {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        Some("gif") => "image/gif",
        Some("svg") => "image/svg+xml",
        Some("mp4") => "video/mp4",
        Some("mov") => "video/quicktime",
        Some("webm") => "video/webm",
        Some("mp3") => "audio/mpeg",
        Some("wav") => "audio/wav",
        Some("m4a") => "audio/mp4",
        Some("flac") => "audio/flac",
        Some("md") | Some("txt") => "text/plain; charset=utf-8",
        Some("json") => "application/json",
        _ => "application/octet-stream",
    }
}

#[derive(Debug, Default, Deserialize)]
pub struct ImportUrls {
    #[serde(default)]
    pub urls: Vec<String>,
}

/// 把一批公网 URL 下载进工作区并登记成资产。
///
/// **契约照抄官方**：每个 URL 失败也回 200，失败落在 `errors[]`。
/// 一批里有成功有失败时，成功的那些不该被整体退回。
pub async fn import_url(
    State(state): State<Arc<AppState>>,
    Json(body): Json<ImportUrls>,
) -> Json<Value> {
    let mut imported = Vec::new();
    let mut errors = Vec::new();

    for url in &body.urls {
        match import_one(&state, url).await {
            Ok(asset) => imported.push(json!({
                "url": url,
                "id": asset.id,
                "path": asset.path,
                "type": asset.kind,
                "width": asset.width,
                "height": asset.height,
            })),
            Err(err) => {
                tracing::warn!(%url, "导入失败: {err:#}");
                errors.push(json!({ "url": url, "error": format!("{err:#}") }));
            }
        }
    }

    let mut out = json!({ "ok": true, "imported": imported });
    if !errors.is_empty() {
        out["errors"] = json!(errors);
    }
    Json(out)
}

pub(crate) async fn import_one(
    state: &AppState,
    url: &str,
) -> anyhow::Result<crate::assets::Asset> {
    let parsed = reqwest::Url::parse(url)?;
    anyhow::ensure!(
        matches!(parsed.scheme(), "http" | "https"),
        "只接受 http(s)，收到 {}",
        parsed.scheme()
    );

    // 文件名从**路径**取，不能带查询串 —— 平台返回的直链后面跟着一长串
    // AccessKeyId / Signature，连进文件名会让扩展名判错，进而归错目录。
    let stem = parsed
        .path_segments()
        .and_then(|mut s| s.next_back())
        .filter(|s| !s.is_empty())
        .unwrap_or("download");
    let ext = std::path::Path::new(stem)
        .extension()
        .map(|e| e.to_string_lossy().into_owned())
        .unwrap_or_default();
    let rel = format!("{}/{}", crate::workspace::subdir_for(&ext), stem);

    // 已经有同名的就直接返回那一条，别重复下载。
    if let Some(existing) = state.assets.by_path(&rel)
        && state.ws.resolve(&rel).is_some_and(|p| p.is_file())
    {
        return Ok(existing);
    }

    let abs = state
        .ws
        .resolve(&rel)
        .ok_or_else(|| anyhow::anyhow!("路径超出工作区: {rel}"))?;
    if let Some(parent) = abs.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }

    let resp = state.client.get(url).send().await?;
    anyhow::ensure!(resp.status().is_success(), "HTTP {}", resp.status());
    let bytes = resp.bytes().await?;
    tokio::fs::write(&abs, &bytes).await?;

    state.assets.enroll(&rel)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// `import-url` 的契约：**部分失败仍然回 200**，失败落在 `errors[]`。
    ///
    /// 一批里有成功有失败时，成功的那些不该被整体退回。而调用方只看 HTTP
    /// 状态的话会把整批失败当成功 —— 所以这条契约要有测试钉住。
    #[tokio::test]
    async fn a_failed_url_lands_in_errors_and_still_returns_200() {
        let dir = tempfile::tempdir().unwrap();
        let state = std::sync::Arc::new(crate::AppState {
            ws: crate::workspace::Workspace::new(dir.path()),
            assets: std::sync::Arc::new(crate::assets::Assets::load(
                crate::workspace::Workspace::new(dir.path()),
            )),
            events: std::sync::Arc::new(crate::events::Events::new()),
            canvas_lock: Default::default(),
            media: std::sync::Arc::new(maas_media::MediaConfig::default()),
            client: reqwest::Client::builder().no_proxy().build().unwrap(),
            local: reqwest::Client::builder().no_proxy().build().unwrap(),
            tasks: std::sync::Arc::new(crate::tasks::TaskStore::new()),
            updater: std::sync::Arc::new(crate::update::Updater::new()),
            questions: std::sync::Arc::new(crate::question::Questions::new()),
            activity: std::sync::Arc::new(crate::activity::Activity::new()),
            upstream: None,
            web_dir: None,
        });

        // 非 http(s)：连不上网也能走到判断分支。
        let Json(out) = import_url(
            State(state),
            Json(ImportUrls {
                urls: vec!["ftp://example.com/a.png".into()],
            }),
        )
        .await;

        assert_eq!(out["ok"], true, "整体仍然是 200/ok");
        assert!(out["imported"].as_array().unwrap().is_empty());
        assert!(
            out["errors"][0]["error"]
                .as_str()
                .is_some_and(|e| e.contains("ftp")),
            "{out}"
        );
    }

    #[test]
    fn mime_covers_what_the_canvas_renders() {
        use std::path::Path;
        assert_eq!(mime_of(Path::new("a.png")), "image/png");
        assert_eq!(mime_of(Path::new("a.MP4")), "video/mp4");
        assert_eq!(mime_of(Path::new("a.wav")), "audio/wav");
        // 认不出的给 octet-stream，让浏览器下载而不是猜。
        assert_eq!(mime_of(Path::new("a.bin")), "application/octet-stream");
        assert_eq!(mime_of(Path::new("noext")), "application/octet-stream");
    }
}
