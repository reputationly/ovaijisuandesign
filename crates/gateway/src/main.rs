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

mod config;
mod generate;
mod land;
mod proxy;
mod tasks;

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{Context, Result};
use axum::Router;
use axum::routing::{any, get, post};
use tower_http::cors::{Any, CorsLayer};

use crate::config::Config;
use crate::tasks::TaskStore;

pub struct AppState {
    pub media: Arc<maas_media::MediaConfig>,
    /// 打自建平台用。走公网，**尊重系统代理**。
    pub client: reqwest::Client,
    /// 打上游 gateway 用。上游是回环地址，**必须绕开系统代理** ——
    /// macOS 上打开 HTTP 代理后，reqwest 会把发往 127.0.0.1 的请求也交给
    /// 代理，被吞成一个空的 503（响应头里带 `proxy-connection: close`）。
    /// 症状是"官方明明在跑，反代却全挂"，很难往代理上想。
    pub local: reqwest::Client,
    pub tasks: Arc<TaskStore>,
    /// 没实现的路由反代到哪里。`None` 表示不反代，如实回 404。
    pub upstream: Option<String>,
}

pub fn router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/api/health/live", get(|| async { "ok" }))
        .route("/api/generate/image/submit", post(generate::submit_image))
        // `/query` 后缀不能省：漏了会 404，而调用方对非 2xx 的查询不写日志。
        .route(
            "/api/generate/tasks/{task_id}/query",
            get(generate::query_task),
        )
        // 其余全部反代给上游。等自己实现了对应路由，把它加到上面即可 ——
        // 替换是逐条进行的，调用方始终只认这一个地址。
        .fallback(any(proxy::handle))
        // 前端通常经 Vite 代理过来（同源），但直连调试时没有 CORS 会一头雾水。
        // 这是个只监听回环的本地服务，放开即可。
        .layer(CorsLayer::new().allow_origin(Any).allow_headers(Any).allow_methods(Any))
        .with_state(state)
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .init();

    let path = match std::env::var_os("OVGW_CONFIG") {
        Some(p) => std::path::PathBuf::from(p),
        None => Config::default_path()?,
    };

    if !path.exists() {
        // 先把模板写出来再报错：让用户知道要改哪个文件，而不是只知道"缺配置"。
        Config::default().save(&path)?;
        anyhow::bail!(
            "已生成配置模板: {}\n请填写 platform.api_key 后重新启动（没有登录流程，key 就是唯一凭据）",
            path.display()
        );
    }

    let cfg = Config::load(&path).context("加载配置失败")?;
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .build()
        .context("构建 HTTP 客户端失败")?;
    let local = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .no_proxy()
        .build()
        .context("构建本地 HTTP 客户端失败")?;

    let addr = SocketAddr::from(([127, 0, 0, 1], cfg.port));
    let state = Arc::new(AppState {
        media: Arc::new(cfg.media),
        client,
        local,
        tasks: Arc::new(TaskStore::new()),
        upstream: cfg.upstream.clone(),
    });

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .with_context(|| format!("绑定 {addr} 失败，端口可能已被占用"))?;
    match state.upstream.as_deref() {
        Some(u) => tracing::info!("gateway 已监听 http://{addr}，未实现的路由反代到 {u}"),
        None => tracing::info!("gateway 已监听 http://{addr}，未配置 upstream（未实现的路由回 404）"),
    }
    tracing::info!("配置: {}", path.display());
    axum::serve(listener, router(state)).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    fn state() -> Arc<AppState> {
        Arc::new(AppState {
            media: Arc::new(maas_media::MediaConfig::default()),
            client: reqwest::Client::new(),
            local: reqwest::Client::builder().no_proxy().build().unwrap(),
            tasks: Arc::new(TaskStore::new()),
            upstream: None,
        })
    }

    async fn call(r: Router, method: &str, uri: &str, body: &str) -> (StatusCode, serde_json::Value) {
        let req = Request::builder()
            .method(method)
            .uri(uri)
            .header("content-type", "application/json")
            .body(Body::from(body.to_string()))
            .unwrap();
        let resp = r.oneshot(req).await.unwrap();
        let status = resp.status();
        let bytes = axum::body::to_bytes(resp.into_body(), 1 << 20).await.unwrap();
        (status, serde_json::from_slice(&bytes).unwrap_or(serde_json::Value::Null))
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

        let (st, q) = call(r, "GET", &format!("/api/generate/tasks/{task_id}/query"), "").await;
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
        assert!(body["task_id"].as_str().is_some_and(|s| !s.is_empty()), "{body}");
    }

    #[tokio::test]
    async fn health_is_plain_and_cheap() {
        let (st, _) = call(router(state()), "GET", "/api/health/live", "").await;
        assert_eq!(st, StatusCode::OK);
    }
}
