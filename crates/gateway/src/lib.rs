//! 本地 gateway。
//!
//! 最终要替掉官方那个（423 条路由），现在只实现**生成**那几条 ——
//! 路由形状按官方对齐，这样两边可以互换着验：我们的前端能接官方 gateway，
//! 官方的 mcp-tools 也能接我们的。
//!
//! 已实现：
//!
//! ```text
//! GET  /api/health/live
//! POST /api/generate/image/submit
//! GET  /api/generate/tasks/{task_id}/query
//! ```
//!
//! 还没实现的（资产库、画布持久化、文件服务）当前仍由官方 gateway 提供，
//! 前端同时连两个。见仓库 README 的路线。

//! 库入口。两个二进制共用这里：`ovgw`（gateway 服务）和
//! `ovagent`（跑 opencode 的启动器，要复用 [`config`]）。

/// 本机版本号。四段：**前三段跟官方 MiniMax Design 走，第四段是本仓的迭代号。**
///
/// Cargo.toml 里只能放三段（四段不是合法 semver，cargo 会直接拒绝解析），
/// 所以四段号由 CI 在编译期通过 `OVAIJISUAN_VERSION` 注入，本地开发时回落到
/// Cargo.toml 的三段。**判断"是不是新版"的所有地方都必须用这个常量**，
/// 用 `CARGO_PKG_VERSION` 的话发布出去的二进制会自报三段号，
/// 而清单里是四段 —— 于是每次检查都提示有更新，装完还是提示有更新。
pub const VERSION: &str = match option_env!("OVAIJISUAN_VERSION") {
    Some(v) => v,
    None => env!("CARGO_PKG_VERSION"),
};

pub mod api_canvas;
pub mod api_files;
pub mod assets;
pub mod canvas;
pub mod canvases;
pub mod config;
pub mod events;
pub mod generate;
pub mod install;
pub mod land;
pub mod proxy;
pub mod question;
pub mod tasks;
pub mod update;
pub mod web;
pub mod workspace;

use std::sync::Arc;

use axum::Router;
use axum::routing::{any, get, post};
use serde_json::{Value, json};
use tower_http::cors::{Any, CorsLayer};

use crate::tasks::TaskStore;

pub struct AppState {
    pub ws: crate::workspace::Workspace,
    pub assets: Arc<crate::assets::Assets>,
    pub events: Arc<crate::events::Events>,
    /// 画布的读-改-写锁。见 [`api_canvas::CanvasLock`]。
    pub canvas_lock: api_canvas::CanvasLock,
    pub media: Arc<maas_media::MediaConfig>,
    /// 打自建平台用。走公网，**尊重系统代理**。
    pub client: reqwest::Client,
    /// 打上游 gateway 用。上游是回环地址，**必须绕开系统代理** ——
    /// macOS 上打开 HTTP 代理后，reqwest 会把发往 127.0.0.1 的请求也交给
    /// 代理，被吞成一个空的 503（响应头里带 `proxy-connection: close`）。
    /// 症状是"官方明明在跑，反代却全挂"，很难往代理上想。
    pub local: reqwest::Client,
    pub tasks: Arc<TaskStore>,
    /// 升级的状态机。见 [`update`]。
    pub updater: Arc<crate::update::Updater>,
    /// agent 的决策点。见 [`question`]。
    pub questions: Arc<crate::question::Questions>,
    /// 没实现的路由反代到哪里。`None` 表示不反代，如实回 404。
    pub upstream: Option<String>,
    /// 前端产物目录。`None` 表示没找到，访问 `/` 会如实说前端没构建。
    pub web_dir: Option<std::path::PathBuf>,
}

pub fn router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/api/health/live", get(health))
        .route("/api/update/check", get(update::check))
        .route("/api/update/status", get(update::status))
        .route("/api/update/download", post(update::download))
        .route("/api/update/apply", post(update::apply))
        // -- 工作区 / 资产 / 文件 --
        .route("/api/workspace", get(api_files::workspace_dir))
        .route("/api/assets", get(api_files::list_assets))
        .route("/files/id/{asset_id}", get(api_files::serve_by_id))
        .route("/files/{*path}", get(api_files::serve_by_path))
        .route("/api/files/import-url", post(api_files::import_url))
        // -- 画布 --
        .route(
            "/api/canvas",
            get(api_canvas::get_canvas).post(api_canvas::put_canvas),
        )
        // -- 多画布 --
        .route("/api/canvases", get(canvases::list).post(canvases::create))
        .route("/api/canvases/{id}/open", post(canvases::open))
        // -- agent 的决策点 --
        .route("/api/question/ask", post(question::ask))
        .route("/api/question/pending", get(question::pending))
        .route("/api/question/reply", post(question::reply))
        .route(
            "/api/canvases/{id}",
            axum::routing::delete(canvases::remove),
        )
        .route("/api/canvas/nodes", get(api_canvas::list_nodes))
        .route("/api/canvas/nodes/detail", post(api_canvas::node_detail))
        .route("/api/canvas/media-node", post(api_canvas::media_node))
        .route("/api/canvas/text-node", post(api_canvas::text_node))
        // -- 事件推送 --
        .route("/ws", get(events::ws_handler))
        // -- 生成 --
        .route("/api/generate/image/submit", post(generate::submit_image))
        // `/query` 后缀不能省：漏了会 404，而调用方对非 2xx 的查询不写日志。
        .route(
            "/api/generate/tasks/{task_id}/query",
            get(generate::query_task),
        )
        // 剩下的先当静态资源找，找不到再反代。
        .fallback(any(fallback))
        // 前端通常经 Vite 代理过来（同源），但直连调试时没有 CORS 会一头雾水。
        // 这是个只监听回环的本地服务，放开即可。
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_headers(Any)
                .allow_methods(Any),
        )
        .with_state(state)
}

/// 兜底：先当前端资源找，再交给反代。
///
/// 顺序不能反 —— 反代在前的话，配了 upstream 时前端的每一个请求都会被
/// 转发到官方 gateway，而它对 `/assets/app.js` 只会回 404。表现是
/// "画布打不开"，但原因完全不在前端。
async fn fallback(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    req: axum::extract::Request,
) -> axum::response::Response {
    let path = req.uri().path().to_string();
    // `/api` 和 `/files` 是后端的地盘，永远不当静态资源找。
    let is_api = path.starts_with("/api") || path.starts_with("/files");
    if !is_api && let Some(dir) = state.web_dir.as_deref() {
        return web::serve(dir, &path).await;
    }
    proxy::handle(axum::extract::State(state), req).await
}

/// 探活。**带上版本** —— 升级流程要靠它确认新版真的起来了，排查时也要靠它
/// 确认连的是哪一个（本地起两个 gateway 是常态）。
///
/// 保持是纯 JSON、不碰任何 IO：它会被高频轮询。
async fn health() -> axum::Json<Value> {
    axum::Json(json!({
        "ok": true,
        "service": "ovaijisuandesign-gateway",
        "version": VERSION,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    /// 给别的模块的测试用：拿着 TempDir 才能保证目录活到断言之后。
    pub(crate) fn state_with_dir() -> (Arc<AppState>, tempfile::TempDir) {
        let dir = tempfile::tempdir().unwrap();
        let s = state_in(dir.path());
        (s, dir)
    }

    fn state() -> Arc<AppState> {
        let dir = Box::leak(Box::new(tempfile::tempdir().unwrap()));
        state_in(dir.path())
    }

    fn state_in(path: &std::path::Path) -> Arc<AppState> {
        Arc::new(AppState {
            ws: crate::workspace::Workspace::new(path),
            assets: Arc::new(crate::assets::Assets::load(
                crate::workspace::Workspace::new(path),
            )),
            events: Arc::new(crate::events::Events::new()),
            canvas_lock: Default::default(),
            media: Arc::new(maas_media::MediaConfig::default()),
            client: reqwest::Client::new(),
            local: reqwest::Client::builder().no_proxy().build().unwrap(),
            tasks: Arc::new(TaskStore::new()),
            updater: Arc::new(crate::update::Updater::new()),
            questions: Arc::new(crate::question::Questions::new()),
            upstream: None,
            web_dir: None,
        })
    }

    async fn call(
        r: Router,
        method: &str,
        uri: &str,
        body: &str,
    ) -> (StatusCode, serde_json::Value) {
        let req = Request::builder()
            .method(method)
            .uri(uri)
            .header("content-type", "application/json")
            .body(Body::from(body.to_string()))
            .unwrap();
        let resp = r.oneshot(req).await.unwrap();
        let status = resp.status();
        let bytes = axum::body::to_bytes(resp.into_body(), 1 << 20)
            .await
            .unwrap();
        (
            status,
            serde_json::from_slice(&bytes).unwrap_or(serde_json::Value::Null),
        )
    }

    #[tokio::test]
    async fn submit_then_query_round_trips() {
        let r = router(state());
        let (st, body) = call(
            r.clone(),
            "POST",
            "/api/generate/image/submit",
            r#"{"prompt":"a cat","params":{"aspect_ratio":"1:1","resolution":"1K"}}"#,
        )
        .await;
        assert_eq!(st, StatusCode::OK);
        assert_eq!(body["ok"], true);
        assert_eq!(body["media_type"], "image");
        let task_id = body["task_id"].as_str().unwrap();

        let (st, q) = call(
            r,
            "GET",
            &format!("/api/generate/tasks/{task_id}/query"),
            "",
        )
        .await;
        assert_eq!(st, StatusCode::OK);
        assert_eq!(q["task_id"], task_id);
        // 没配 key，后台那次调用会很快失败；两种状态都合法。
        assert!(
            q["status"] == "processing" || q["status"] == "failed",
            "{q}"
        );
    }

    #[tokio::test]
    async fn the_query_route_needs_its_query_suffix() {
        // 漏了 /query 会 404，而调用方对非 2xx 的查询不写任何日志 ——
        // 表现是画布上一个没有原因的失败节点。这条钉住字面量。
        let (st, _) = call(router(state()), "GET", "/api/generate/tasks/t-1", "").await;
        assert_eq!(st, StatusCode::NOT_FOUND);

        let (st, _) = call(router(state()), "GET", "/api/generate/tasks/t-1/query", "").await;
        assert_eq!(st, StatusCode::OK);
    }

    #[tokio::test]
    async fn a_malformed_submit_still_returns_a_task_id() {
        // 提交阶段返回 4xx 会被调用方当成硬错误；我们宁可照常发 task_id，
        // 让失败带着原因在轮询时回去。
        let (st, body) = call(
            router(state()),
            "POST",
            "/api/generate/image/submit",
            "not json at all",
        )
        .await;
        assert_eq!(st, StatusCode::OK);
        assert!(
            body["task_id"].as_str().is_some_and(|s| !s.is_empty()),
            "{body}"
        );
    }

    #[tokio::test]
    async fn health_reports_a_version() {
        // 升级流程靠它确认新版真的起来了；本地同时跑两个 gateway 时也靠它
        // 分辨连的是哪一个。
        let (st, body) = call(router(state()), "GET", "/api/health/live", "").await;
        assert_eq!(st, StatusCode::OK);
        assert_eq!(body["ok"], true);
        assert!(
            body["version"].as_str().is_some_and(|v| !v.is_empty()),
            "{body}"
        );
    }
}
