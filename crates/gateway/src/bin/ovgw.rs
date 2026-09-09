//! gateway 服务。
//!
//! 逻辑都在 [`gateway`] 这个库里 —— 拆开是为了让 `ovagent` 能复用配置。

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{Context, Result};
use gateway::config::Config;
use gateway::tasks::TaskStore;
use gateway::{AppState, router};

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

    let ws_dir = cfg.workspace_dir()?;
    std::fs::create_dir_all(&ws_dir)
        .with_context(|| format!("创建工作区失败: {}", ws_dir.display()))?;
    let ws = gateway::workspace::Workspace::new(&ws_dir);

    let addr = SocketAddr::from(([127, 0, 0, 1], cfg.port));
    let state = Arc::new(AppState {
        assets: Arc::new(gateway::assets::Assets::load(ws.clone())),
        events: Arc::new(gateway::events::Events::new()),
        canvas_lock: Default::default(),
        ws,
        media: Arc::new(cfg.media),
        client,
        local,
        tasks: Arc::new(TaskStore::new()),
        upstream: cfg.upstream.clone(),
        web_dir: gateway::web::locate(cfg.web_dir.as_deref()),
    });

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .with_context(|| format!("绑定 {addr} 失败，端口可能已被占用"))?;
    match state.upstream.as_deref() {
        Some(u) => tracing::info!("gateway 已监听 http://{addr}，未实现的路由反代到 {u}"),
        None => {
            tracing::info!("gateway 已监听 http://{addr}，未配置 upstream（未实现的路由回 404）")
        }
    }
    match state.web_dir.as_deref() {
        Some(d) => tracing::info!("画布: http://{addr}/  （前端产物 {}）", d.display()),
        None => tracing::warn!(
            "没找到前端产物，画布打不开。在 apps/canvas-web 里跑一次 `bun run build`"
        ),
    }
    tracing::info!("工作区: {}", ws_dir.display());
    tracing::info!("配置: {}", path.display());
    axum::serve(listener, router(state)).await?;
    Ok(())
}
