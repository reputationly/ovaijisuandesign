//! 把没实现的路由反代给官方 gateway。
//!
//! 这让替换可以**逐条路由**进行：调用方（画布前端、MCP server、将来的
//! mcp-tools）只认我们这一个地址，我们实现一条就接管一条，剩下的照旧。
//!
//! 没配 upstream 时反代关闭 —— 那是"我们已经能独立跑"的状态，
//! 打到未实现的路由应该是 404，而不是悄悄连去某个默认地址。

use std::sync::Arc;

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{HeaderName, StatusCode};
use axum::response::{IntoResponse, Response};

use crate::AppState;

/// 逐跳首部，反代时必须丢弃，否则会破坏连接语义。
const HOP_BY_HOP: &[&str] = &[
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "host",
];

fn is_hop_by_hop(name: &HeaderName) -> bool {
    HOP_BY_HOP.contains(&name.as_str())
}

pub async fn handle(State(state): State<Arc<AppState>>, req: Request) -> Response {
    let Some(upstream) = state.upstream.as_deref() else {
        // 没有上游时如实回 404。反代到一个猜出来的地址会让"路由没实现"
        // 表现成别的错误。
        return (
            StatusCode::NOT_FOUND,
            format!("{} 未实现，且没有配置 upstream", req.uri().path()),
        )
            .into_response();
    };

    let (parts, body) = req.into_parts();
    let path_and_query = parts
        .uri
        .path_and_query()
        .map(|pq| pq.as_str())
        .unwrap_or_else(|| parts.uri.path());
    let url = format!("{}{path_and_query}", upstream.trim_end_matches('/'));

    // 保持流式：这条路上会走图片、视频这类大文件，缓冲到内存没有必要。
    let mut out = state
        .local
        .request(parts.method.clone(), &url)
        .body(reqwest::Body::wrap_stream(body.into_data_stream()));
    for (name, value) in parts.headers.iter() {
        if is_hop_by_hop(name) {
            continue;
        }
        out = out.header(name, value);
    }

    match out.send().await {
        Ok(resp) => {
            let mut builder = Response::builder().status(resp.status());
            for (name, value) in resp.headers().iter() {
                if is_hop_by_hop(name) {
                    continue;
                }
                builder = builder.header(name, value);
            }
            builder
                .body(Body::from_stream(resp.bytes_stream()))
                .unwrap_or_else(|err| {
                    tracing::error!("构造反代响应失败: {err}");
                    StatusCode::INTERNAL_SERVER_ERROR.into_response()
                })
        }
        Err(err) => {
            tracing::warn!(%url, "反代上游失败: {err}");
            (StatusCode::BAD_GATEWAY, format!("upstream error: {err}")).into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tasks::TaskStore;
    use axum::Router;
    use axum::routing::any;
    use tower::ServiceExt;

    fn state(upstream: Option<String>) -> Arc<AppState> {
        let dir = Box::leak(Box::new(tempfile::tempdir().unwrap()));
        Arc::new(AppState {
            ws: crate::workspace::Workspace::new(dir.path()),
            assets: Arc::new(crate::assets::Assets::load(
                crate::workspace::Workspace::new(dir.path()),
            )),
            events: Arc::new(crate::events::Events::new()),
            canvas_lock: Default::default(),
            media: Arc::new(maas_media::MediaConfig::default()),
            client: reqwest::Client::new(),
            // 显式关代理：开发机的系统代理会把发往假上游的请求一并截走。
            local: reqwest::Client::builder().no_proxy().build().unwrap(),
            tasks: Arc::new(TaskStore::new()),
            updater: Arc::new(crate::update::Updater::new()),
            questions: Arc::new(crate::question::Questions::new()),
            activity: Arc::new(crate::activity::Activity::new()),
            upstream,
            web_dir: None,
        })
    }

    /// 起一个只会回 418 的假上游，用它判断请求走了反代还是本地处理。
    async fn fake_upstream() -> String {
        let app = Router::new().fallback(any(|| async { StatusCode::IM_A_TEAPOT }));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        tokio::spawn(async move {
            let _ = axum::serve(listener, app).await;
        });
        format!("http://127.0.0.1:{port}")
    }

    async fn get(state: Arc<AppState>, uri: &str) -> StatusCode {
        crate::router(state)
            .oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap())
            .await
            .unwrap()
            .status()
    }

    /// 一条我们**确实还没实现**的路由。实现它的那天这个常量要跟着换 ——
    /// 换的时候正好会想起：反代面又小了一块。
    const UNIMPLEMENTED: &str = "/api/canvas/search";

    #[tokio::test]
    async fn unimplemented_routes_go_upstream() {
        let st = state(Some(fake_upstream().await));
        assert_eq!(get(st, UNIMPLEMENTED).await, StatusCode::IM_A_TEAPOT);
    }

    #[tokio::test]
    async fn implemented_routes_are_never_proxied() {
        // 反代一旦盖住已实现的路由，请求会悄悄走回官方 —— 生成花的是官方
        // 额度、画布写的是官方那份，而且完全不报错。
        let st = state(Some(fake_upstream().await));
        for path in [
            "/api/health/live",
            "/api/generate/tasks/t-1/query",
            "/api/workspace",
            "/api/assets",
            "/api/canvas",
            "/api/canvas/nodes",
        ] {
            assert_eq!(
                get(st.clone(), path).await,
                StatusCode::OK,
                "{path} 被反代了"
            );
        }
    }

    #[tokio::test]
    async fn without_an_upstream_it_is_an_honest_404() {
        assert_eq!(get(state(None), UNIMPLEMENTED).await, StatusCode::NOT_FOUND);
    }
}
