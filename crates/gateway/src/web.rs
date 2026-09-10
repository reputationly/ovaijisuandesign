//! 静态前端。
//!
//! 发布出去的形态是「一个二进制 + 一个 `web/` 目录」，`ovgw` 自己把画布服务
//! 起来 —— 在这之前跑这套东西必须开 Vite dev server，那不是能分发的形态。
//!
//! **不做编译期内嵌**：那会让 `cargo build` 依赖一次前端构建，开发时每改一行
//! Rust 都要先 `bun run build`。目录形态在发布包里同样是一个整体，
//! 少的只是"单文件"这一点好看。

use std::path::{Path, PathBuf};

use axum::body::Body;
use axum::http::{StatusCode, header};
use axum::response::{IntoResponse, Response};
use tokio_util::io::ReaderStream;

/// 找前端产物目录。按可预期性排序，不猜。
///
/// 1. 配置里的 `web_dir`
/// 2. 可执行文件旁边的 `web/`（发布包的形态）
/// 3. 仓库里的 `apps/canvas-web/dist`（`cargo run` 时的形态）
///
/// 都找不到就返回 `None` —— 那时访问 `/` 会如实说"前端没构建"，
/// 而不是回一个空白页让人以为是前端崩了。
///
/// ## 开发时会咬人的一处
///
/// 桌面端跑 `cargo build` 时，**tauri-build 会把 `tauri.conf.json` 里的
/// resources 拷进 `target/<profile>/web/`** —— 于是第 2 条先命中那份拷贝，
/// 第 3 条永远轮不到。
///
/// 后果：改完前端只跑 `bun run build`，界面**不会更新**，而且没有任何报错
/// （旧那份是完整可用的，只是旧）。表现是"我明明改了，怎么没变"。
///
/// 跑 `./target/debug/ovdesktop` 之前先同步一次：
///
/// ```sh
/// rm -rf target/debug/web && cp -R apps/canvas-web/dist target/debug/web
/// ```
///
/// 顺序不能调（把仓库 dist 放到 exe 旁边之前）：发布包里 exe 旁边那份才是
/// 唯一的真相，而那时仓库路径根本不存在。
pub fn locate(configured: Option<&Path>) -> Option<PathBuf> {
    if let Some(dir) = configured {
        return dir.is_dir().then(|| dir.to_path_buf());
    }
    if let Ok(exe) = std::env::current_exe()
        && let Some(base) = exe.parent()
    {
        let beside = base.join("web");
        if beside.is_dir() {
            return Some(beside);
        }
        // macOS 的 .app 里可执行文件在 `Contents/MacOS/`，资源在
        // `Contents/Resources/`。不认这一条的话，打出来的 app 一打开就是
        // "前端没构建"——而包里的 web/ 明明在。
        let bundled = base.join("../Resources/web");
        if bundled.is_dir() {
            return Some(bundled);
        }
        // `cargo run` 时可执行文件在 target/<profile>/，往上找仓库根。
        let mut dir = base.to_path_buf();
        while dir.pop() {
            let dist = dir.join("apps/canvas-web/dist");
            if dist.is_dir() {
                return Some(dist);
            }
            if dir.join("Cargo.toml").is_file()
                && std::fs::read_to_string(dir.join("Cargo.toml"))
                    .map(|s| s.contains("[workspace]"))
                    .unwrap_or(false)
            {
                break;
            }
        }
    }
    None
}

/// 服务一个前端资源。
///
/// 找不到文件时回 `index.html`（SPA 的客户端路由要靠它），但**带扩展名的
/// 请求除外** —— 那类请求要的是真文件，回一段 HTML 会让浏览器把 HTML 当
/// JS 解析，报一个和真实原因完全无关的语法错误。
pub async fn serve(root: &Path, path: &str) -> Response {
    let rel = path.trim_start_matches('/');
    let Some(candidate) = safe_join(root, rel) else {
        // 路径被拒（含 `..` 或绝对路径）。**直接 404，不要掉进下面的 SPA
        // 回退** —— 回 index.html 会让一次逃逸尝试看起来像一次正常路由，
        // 日志和监控上完全看不出来。
        return (StatusCode::NOT_FOUND, "找不到").into_response();
    };

    if candidate.is_file() {
        return respond(&candidate).await;
    }

    let looks_like_asset = Path::new(rel).extension().is_some();
    if looks_like_asset {
        return (StatusCode::NOT_FOUND, "找不到").into_response();
    }

    let index = root.join("index.html");
    if index.is_file() {
        respond(&index).await
    } else {
        (
            StatusCode::NOT_FOUND,
            "前端还没构建：在 apps/canvas-web 里跑一次 `bun run build`",
        )
            .into_response()
    }
}

/// 和工作区那边同样的规则：`..` 一律拒绝，绝对路径拒绝。
///
/// 这里的输入直接来自 URL，是最该防的一处。
fn safe_join(root: &Path, rel: &str) -> Option<PathBuf> {
    use std::path::Component;
    let mut out = root.to_path_buf();
    for part in Path::new(rel).components() {
        match part {
            Component::Normal(p) => out.push(p),
            Component::CurDir => {}
            _ => return None,
        }
    }
    Some(out)
}

async fn respond(file: &Path) -> Response {
    let mime = mime_of(file);
    match tokio::fs::File::open(file).await {
        Ok(f) => (
            [(header::CONTENT_TYPE, mime)],
            Body::from_stream(ReaderStream::new(f)),
        )
            .into_response(),
        Err(_) => (StatusCode::NOT_FOUND, "找不到").into_response(),
    }
}

fn mime_of(path: &Path) -> &'static str {
    match path
        .extension()
        .map(|e| e.to_string_lossy().to_ascii_lowercase())
        .as_deref()
    {
        Some("html") => "text/html; charset=utf-8",
        Some("js") | Some("mjs") => "text/javascript; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("json") => "application/json",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        Some("ico") => "image/x-icon",
        Some("woff2") => "font/woff2",
        Some("woff") => "font/woff",
        Some("map") => "application/json",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;

    fn dist() -> tempfile::TempDir {
        let d = tempfile::tempdir().unwrap();
        std::fs::write(d.path().join("index.html"), "<!doctype html>画布").unwrap();
        std::fs::create_dir_all(d.path().join("assets")).unwrap();
        std::fs::write(d.path().join("assets/app.js"), "console.log(1)").unwrap();
        d
    }

    async fn body_of(r: Response) -> String {
        String::from_utf8_lossy(&to_bytes(r.into_body(), 1 << 20).await.unwrap()).into_owned()
    }

    #[tokio::test]
    async fn serves_real_files_with_the_right_mime() {
        let d = dist();
        let r = serve(d.path(), "/assets/app.js").await;
        assert_eq!(
            r.headers()[header::CONTENT_TYPE],
            "text/javascript; charset=utf-8"
        );
        assert_eq!(body_of(r).await, "console.log(1)");
    }

    #[tokio::test]
    async fn unknown_routes_fall_back_to_index() {
        let d = dist();
        let r = serve(d.path(), "/some/spa/route").await;
        assert_eq!(r.status(), StatusCode::OK);
        assert!(body_of(r).await.contains("画布"));
    }

    #[tokio::test]
    async fn a_missing_asset_is_404_not_index_html() {
        // 回 index.html 的话浏览器会把 HTML 当 JS 解析，报一个和真实原因
        // 完全无关的语法错误 —— 排查时会往完全错误的方向走。
        let d = dist();
        let r = serve(d.path(), "/assets/gone.js").await;
        assert_eq!(r.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn rejects_traversal() {
        let d = dist();
        // 逃逸和不存在回同一个码，不泄露外面有没有那个文件。
        for bad in ["/../../etc/passwd", "/assets/../../etc/passwd"] {
            assert_eq!(
                serve(d.path(), bad).await.status(),
                StatusCode::NOT_FOUND,
                "{bad}"
            );
        }
    }

    #[tokio::test]
    async fn says_so_when_the_frontend_was_never_built() {
        // 空目录回一个白页会让人以为是前端崩了。
        let d = tempfile::tempdir().unwrap();
        let r = serve(d.path(), "/").await;
        assert_eq!(r.status(), StatusCode::NOT_FOUND);
        assert!(body_of(r).await.contains("bun run build"));
    }
}
