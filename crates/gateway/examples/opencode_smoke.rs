//! 真起一个 opencode serve，看它能不能就绪、加载了哪些 agent / MCP 工具，然后关掉。
//!
//! ```text
//! cargo run -p gateway --example opencode_smoke -- [工作区]
//! ```
//!
//! 用的是本机配置（`~/Library/Application Support/ovaijisuandesign/config.json`）
//! 里的平台和模型。不发任何对话请求，不花 token。

use std::path::PathBuf;
use std::time::Duration;

use anyhow::Result;
use gateway::config::Config;
use gateway::opencode;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().with_env_filter("info").init();
    let cfg = Config::load(&Config::default_path()?)?;
    let ws: PathBuf = std::env::args()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or(cfg.workspace_dir()?);

    let spec = opencode::prepare(opencode::Inputs {
        workspace: &ws,
        platform: &cfg.media.platform,
        gateway_url: format!("http://127.0.0.1:{}", cfg.port),
        skills_dir: ws.join(".hilo/skills"),
    })?;
    println!("opencode   {}", spec.binary.display());
    println!("config     {}", spec.config_file.display());

    let rt = opencode::Runtime::new();
    let ep = rt.start(spec).await?;
    println!("就绪       {}", ep.url);

    let http = reqwest::Client::builder().no_proxy().build()?;
    let get = |path: &str| {
        http.get(format!("{}{path}", ep.url))
            .header("authorization", ep.basic_auth())
            .timeout(Duration::from_secs(30))
            .send()
    };

    let agents: serde_json::Value = get("/agent").await?.json().await?;
    let names: Vec<String> = agents
        .as_array()
        .map(|a| {
            a.iter()
                .map(|x| {
                    format!(
                        "{}({})",
                        x["name"].as_str().unwrap_or("?"),
                        x["mode"].as_str().unwrap_or("?")
                    )
                })
                .collect()
        })
        .unwrap_or_default();
    println!("agents     {}", names.join(" "));

    // MCP server 要一点时间握手。
    tokio::time::sleep(Duration::from_secs(3)).await;
    let mcp: serde_json::Value = get("/mcp").await?.json().await.unwrap_or_default();
    println!("mcp        {mcp}");

    let tools: serde_json::Value = get("/experimental/tool/ids")
        .await?
        .json()
        .await
        .unwrap_or_default();
    let hub: Vec<&str> = tools
        .as_array()
        .map(|a| {
            a.iter()
                .filter_map(|v| v.as_str())
                .filter(|s| s.starts_with("hub_"))
                .collect()
        })
        .unwrap_or_default();
    println!("hub 工具   {} 个: {}", hub.len(), hub.join(" "));

    rt.stop().await;
    println!("已停止     {:?}", rt.status());
    Ok(())
}
