//! 桌面壳。**一个进程**：内嵌 gateway，再开一个窗口指向它。
//!
//! ## 为什么内嵌而不是拉子进程
//!
//! `gateway` 本来就是个库（`ovgw` 只是它的一个 bin），直接在后台任务里
//! 起 axum 就行。拉子进程要多管一摊事：找得到那个可执行文件吗、它崩了怎么
//! 办、退出时怎么保证收干净（Windows 上父进程被杀时子进程会变孤儿，端口
//! 一直占着，下次启动报"地址已被占用"而看不出原因）。
//!
//! ## 已经有一个 gateway 在跑怎么办
//!
//! 先探一下端口：能连上且 `/api/health/live` 回的是我们的服务，就**直接用
//! 它**，不再起第二个。用户很可能是先在终端跑了 `ovgw` 再打开这个 app ——
//! 那时另起一个只会绑定失败，然后整个窗口白屏。
//!
//! 端口被占但不是我们的服务，如实报错退出：静默换端口的话，`ovagent`
//! 那边按配置里的端口去连，会连到别人身上。
//!
//! ## 窗口参数
//!
//! 照官方 3.0.12 的主进程（`out/main/chunks/index-CVAJg6tm.js`）：
//!
//! ```text
//! width 1280  height 800  minWidth 800  minHeight 600
//! macOS    titleBarStyle: "hiddenInset"，trafficLightPosition {x:12, y:12}
//! Windows  frame + thickFrame + titleBarStyle "hidden" + titleBarOverlay
//! ```
//!
//! 他们的 `backgroundColor` 是 `#0f0f0f`；我们默认是浅色主题，用深色会在
//! 内容加载出来之前黑闪一下，所以取 `--background` 的浅色值。

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{Context, Result};
use gateway::config::Config;
use gateway::tasks::TaskStore;
use gateway::{AppState, router};
use tauri::{WebviewUrl, WebviewWindowBuilder};

const WINDOW_W: f64 = 1280.0;
const WINDOW_H: f64 = 800.0;
const WINDOW_MIN_W: f64 = 800.0;
const WINDOW_MIN_H: f64 = 600.0;

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .init();

    if let Err(e) = run() {
        // 起不来时给一个能看懂的原因，而不是一个白窗口。
        eprintln!("启动失败: {e:#}");
        std::process::exit(1);
    }
}

fn run() -> Result<()> {
    gateway::update::cleanup_on_start();

    let cfg_path = match std::env::var_os("OVGW_CONFIG") {
        Some(p) => std::path::PathBuf::from(p),
        None => Config::default_path()?,
    };
    if !cfg_path.exists() {
        Config::default().save(&cfg_path)?;
        anyhow::bail!(
            "已生成配置模板: {}\n请填写 platform.api_key 后重新启动（没有登录流程，key 就是唯一凭据）",
            cfg_path.display()
        );
    }
    let cfg = Config::load(&cfg_path).context("加载配置失败")?;
    let port = cfg.port;
    let url = format!("http://127.0.0.1:{port}");

    let rt = tokio::runtime::Runtime::new()?;
    let already = rt.block_on(probe(&url));
    match already {
        Probe::Ours => tracing::info!("{url} 上已经有一个 gateway，直接用它"),
        Probe::Foreign => anyhow::bail!(
            "端口 {port} 被别的程序占着。\n\
             改配置里的 port 再启动 —— 这里不自动换端口：换了之后 ovagent \
             还是按配置里那个去连，会连到别人身上。"
        ),
        Probe::Free => {
            let state = build_state(cfg)?;
            let handle = rt.handle().clone();
            handle.spawn(async move {
                let addr = SocketAddr::from(([127, 0, 0, 1], port));
                match tokio::net::TcpListener::bind(addr).await {
                    Ok(l) => {
                        tracing::info!("gateway 已监听 {addr}");
                        if let Err(e) = axum::serve(l, router(state)).await {
                            tracing::error!("gateway 退出: {e}");
                        }
                    }
                    // 探测和绑定之间有个窗口期，别人可能刚好占了进去。
                    Err(e) => tracing::error!("绑定 {addr} 失败: {e}"),
                }
            });
            rt.block_on(wait_ready(&url))?;
        }
    }

    // 运行时要活到进程结束：drop 掉的话后台的 gateway 任务会被一起取消，
    // 窗口随即变成一片"无法连接"。
    let _guard = rt.enter();
    std::mem::forget(rt);

    tauri::Builder::default()
        .setup(move |app| {
            let mut b = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External(url.parse().expect("URL 拼错了")),
            )
            .title("蒜狸小助手")
            .inner_size(WINDOW_W, WINDOW_H)
            .min_inner_size(WINDOW_MIN_W, WINDOW_MIN_H)
            .resizable(true)
            .maximizable(true)
            .fullscreen(false)
            // 浅色主题下的预绘制底色。用深色会在内容出来前黑闪一下。
            .background_color(tauri::window::Color(0xfa, 0xfa, 0xfa, 0xff))
            // 先不显示，等页面画好再 show —— 否则会先看到一个空白窗口。
            .visible(false);

            #[cfg(target_os = "macos")]
            {
                // `Overlay` = AppKit 的 `NSFullSizeContentView` + 透明标题栏，
                // 也就是官方那个 `hiddenInset`：内容一直铺到窗口顶，红绿灯浮在
                // 侧栏上。**不能换成 `Transparent`** —— 那个不延伸内容区，
                // 整个界面会往下掉一条标题栏的高度。
                //
                // `hidden_title` 单独关标题文字。不关的话 macOS 会把
                // "蒜狸小助手" 画在红绿灯右边，而侧栏顶上本来就有一次品牌名，
                // 看起来是同一个名字重复了两遍。
                //
                // y 从 12 调到 20：**红绿灯要和侧栏顶那行图标共用一条中线。**
                // 12 的时候灯的中心落在 13.5，而 h-11 的图标行中心在 22，
                // 差 8px —— 视觉上灯明显浮在上面，像贴歪了。
                // 官方量出来是中心 20.5，两者是对齐的。
                b = b
                    .title_bar_style(tauri::TitleBarStyle::Overlay)
                    .hidden_title(true)
                    .traffic_light_position(tauri::LogicalPosition::new(12.0, 20.0));
            }
            #[cfg(target_os = "windows")]
            {
                // Windows 上标题栏留原生按钮，渲染层自己画底下那条材质 ——
                // 官方的注释说这样能保住系统的缩放边框、Aero Snap 和
                // Win11 最大化按钮的 Snap Layout 菜单。
                b = b.decorations(true);
            }

            // 页面加载完再显示。`on_page_load` 在 builder 上，不是窗口上 ——
            // 建完再挂就晚了，首屏那次加载已经过去。
            let win = b
                .on_page_load(|w, _| {
                    let _ = w.show();
                    let _ = w.set_focus();
                })
                .build()?;
            // 兜底：页面一直加载不出来时也别留一个永远隐藏的窗口，
            // 那样进程在跑而屏幕上什么都没有，只能去活动监视器杀。
            let w = win.clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_secs(5));
                let _ = w.show();
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .context("Tauri 运行失败")?;
    Ok(())
}

enum Probe {
    /// 端口上是我们的 gateway，直接用。
    Ours,
    /// 端口被别人占了。
    Foreign,
    /// 端口空着。
    Free,
}

async fn probe(url: &str) -> Probe {
    // `no_proxy`：macOS 上开了系统 HTTP 代理时，发往 127.0.0.1 的请求也会
    // 被交给代理，被吞成一个空的 503 —— 于是明明空着的端口被判成"被占用"。
    let Ok(c) = reqwest::Client::builder()
        .no_proxy()
        .timeout(Duration::from_millis(800))
        .build()
    else {
        return Probe::Free;
    };
    match c.get(format!("{url}/api/health/live")).send().await {
        Ok(r) if r.status().is_success() => {
            let ours = r
                .json::<serde_json::Value>()
                .await
                .ok()
                .and_then(|v| {
                    v.get("service")
                        .and_then(|s| s.as_str().map(str::to_string))
                })
                .is_some_and(|s| s == "ovaijisuandesign-gateway");
            if ours { Probe::Ours } else { Probe::Foreign }
        }
        // 连得上但不是这个响应 —— 是别人。连不上 —— 端口空着。
        Ok(_) => Probe::Foreign,
        Err(e) if e.is_connect() => Probe::Free,
        Err(_) => Probe::Foreign,
    }
}

/// 等 gateway 起来再开窗口。不等的话窗口会先撞上一次"无法连接"，
/// WebView 缓存了那个错误页，之后要手动刷新。
async fn wait_ready(url: &str) -> Result<()> {
    let c = reqwest::Client::builder()
        .no_proxy()
        .timeout(Duration::from_millis(500))
        .build()?;
    for _ in 0..60 {
        if let Ok(r) = c.get(format!("{url}/api/health/live")).send().await
            && r.status().is_success()
        {
            return Ok(());
        }
        tokio::time::sleep(Duration::from_millis(50)).await;
    }
    anyhow::bail!("gateway 三秒内没起来")
}

fn build_state(cfg: Config) -> Result<Arc<AppState>> {
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .user_agent(concat!("ovaijisuandesign/", env!("CARGO_PKG_VERSION")))
        .build()?;
    let local = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .no_proxy()
        .build()?;

    let ws_dir = cfg.workspace_dir()?;
    std::fs::create_dir_all(&ws_dir)?;
    let ws = gateway::workspace::Workspace::new(&ws_dir);
    // `cfg` 下面会被拆开 move 走，先把要用的取出来。
    let web_dir = gateway::web::locate(cfg.web_dir.as_deref());
    let upstream = cfg.upstream.clone();

    let state = Arc::new(AppState {
        assets: Arc::new(gateway::assets::Assets::load(ws.clone())),
        events: Arc::new(gateway::events::Events::new()),
        canvas_lock: Default::default(),
        ws,
        media: Arc::new(cfg.media),
        client,
        local,
        tasks: Arc::new(TaskStore::new()),
        updater: Arc::new(gateway::update::Updater::new()),
        questions: Arc::new(gateway::question::Questions::new()),
        activity: Arc::new(gateway::activity::Activity::new()),
        agent: Arc::new(gateway::agent::Agent::new()),
        feishu: Arc::new(gateway::feishu::bridge::Bridge::new()),
        wechat: Arc::new(gateway::wechat::Wechat::new()),
        upstream,
        web_dir,
    });
    // 自带 skill 铺到工作区。只在缺的时候写，见 skills::seed。
    gateway::skills::seed(&state);
    Ok(state)
}
