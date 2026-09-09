//! 用官方的 agent 配置 + 我们的 MCP 工具跑 opencode。
//!
//! ```text
//! ovagent [工作区] [-- opencode 的参数…]
//! ```
//!
//! 取代原来那个 `scripts/run-agent.sh`：bash + `jq` + 写死的
//! `/Applications/...` 路径在 Windows 上完全不能用，而这是目前唯一的
//! agent 入口。
//!
//! ## opencode 从哪来
//!
//! 优先 `PATH`，其次 `OPENCODE_BIN`，**最后才是 MiniMax Design 的应用包**。
//!
//! 顺序是刻意的：opencode 是 MIT 的独立软件，用户自己装一份就行 ——
//! 为了一个二进制去依赖一个商业客户端，跟这个项目的目标正好相反。
//! 应用包那条只是本机开发时的方便。

use std::path::{Path, PathBuf};
use std::process::Command;

use anyhow::{Context, Result};
use gateway::config::Config;
use serde_json::{Value, json};

fn main() -> Result<()> {
    // 和 ovgw 保持一致。放在解析工作区之前 —— 否则 `--version` 会被当成
    // 工作区路径，opencode 在一个叫 "--version" 的目录里起来。
    if let Some(a) = std::env::args().nth(1) {
        match a.as_str() {
            "--version" | "-V" => {
                println!("ovagent {}", env!("CARGO_PKG_VERSION"));
                return Ok(());
            }
            // opencode 自己的 --help 走 `ovagent -- --help`。
            "--help" | "-h" => {
                println!("ovagent [工作区] [-- opencode 的参数…]");
                return Ok(());
            }
            _ => {}
        }
    }

    let mut args = std::env::args().skip(1);
    let mut workspace: Option<PathBuf> = None;
    let mut passthrough: Vec<String> = Vec::new();

    // 第一个非 `--` 参数是工作区，`--` 之后全部转交给 opencode。
    for a in args.by_ref() {
        if a == "--" {
            break;
        }
        if workspace.is_none() {
            workspace = Some(PathBuf::from(a));
        } else {
            passthrough.push(a);
        }
    }
    passthrough.extend(args);

    let cfg_path = match std::env::var_os("OVGW_CONFIG") {
        Some(p) => PathBuf::from(p),
        None => Config::default_path()?,
    };
    let cfg = Config::load(&cfg_path).with_context(|| {
        format!(
            "加载配置失败: {}。先跑一次 ovgw 生成模板",
            cfg_path.display()
        )
    })?;

    let workspace = match workspace {
        Some(w) => w,
        None => cfg.workspace_dir()?,
    };
    let reference = find_beside("reference/agent-profiles").context(
        "还没快照官方配置。先跑一次 scripts/snapshot-agent-profiles.sh，\
         或者用 OVAIJISUANDESIGN_ROOT 指到仓库根",
    )?;
    let mcp_entry = find_mcp_entry().context(
        "找不到 MCP server 的入口（<可执行文件目录>/mcp/main.js 或 <仓库>/mcp/src/main.ts）",
    )?;

    let opencode = find_opencode().context(
        "找不到 opencode。装一份（https://opencode.ai）并放进 PATH，\
         或者用 OPENCODE_BIN 指定路径",
    )?;

    // staging 目录里现拼配置。**不落进版本库** —— 里面有 api_key。
    let staging =
        std::env::temp_dir().join(format!("ovaijisuandesign-agent-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&staging);
    copy_dir(&reference, &staging).context("复制官方 agent 配置失败")?;
    // 我们自己写的覆盖同名文件。没有就跳过 —— 目前 agent/ 下只有 README。
    if let Some(ours) = find_beside("agent") {
        for sub in ["agents", "contracts", "skills"] {
            let from = ours.join(sub);
            if from.is_dir() {
                copy_dir(&from, &staging.join(sub))?;
            }
        }
    }

    let official: Value = serde_json::from_str(
        &std::fs::read_to_string(reference.join("base.json")).context("读官方 base.json 失败")?,
    )?;
    let cfg_json = build_opencode_config(&cfg, &official, &mcp_entry);
    let cfg_file = staging.join("opencode.json");
    std::fs::write(&cfg_file, serde_json::to_vec_pretty(&cfg_json)?)?;

    eprintln!("opencode    {}", opencode.display());
    eprintln!("模型        maas/{}", cfg.media.platform.chat_model);
    eprintln!("gateway     http://127.0.0.1:{}", cfg.port);
    eprintln!("工作区      {}", workspace.display());
    eprintln!(
        "agent       {}（官方提示词 + agent/ 的覆盖）",
        official
            .get("default_agent")
            .and_then(Value::as_str)
            .unwrap_or("(默认)")
    );

    let status = Command::new(&opencode)
        .args(&passthrough)
        .current_dir(&workspace)
        .env("OPENCODE_CONFIG", &cfg_file)
        // CONFIG_DIR 决定 opencode 从哪扫 `{agent,agents}/**/*.md`
        // （判据：packages/opencode/src/config/agent.ts）—— 官方那批 agent
        // 提示词就在里面。
        .env("OPENCODE_CONFIG_DIR", &staging)
        .status()
        .with_context(|| format!("启动 {} 失败", opencode.display()))?;

    let _ = std::fs::remove_dir_all(&staging);
    std::process::exit(status.code().unwrap_or(1));
}

/// 组 opencode 的配置。
///
/// `agent` / `default_agent` / `tools` **原样取自官方 base.json** ——
/// 这是整件事的重点：用他们的提示词，跑我们的工具。
///
/// 唯独不带 `plugin`：那是他们的 `session-header.ts`，依赖他们的运行时注入。
fn build_opencode_config(cfg: &Config, official: &Value, mcp_entry: &Path) -> Value {
    let model = &cfg.media.platform.chat_model;
    let mut root = serde_json::Map::new();
    for key in ["agent", "default_agent", "tools"] {
        if let Some(v) = official.get(key) {
            root.insert(key.to_string(), v.clone());
        }
    }
    root.insert("$schema".into(), json!("https://opencode.ai/schema.json"));
    root.insert(
        "provider".into(),
        json!({
            "maas": {
                "name": "maas",
                "npm": "@ai-sdk/openai",
                "options": {
                    "baseURL": cfg.media.platform.base_url,
                    "apiKey": cfg.media.platform.api_key,
                },
                "models": {
                    model.clone(): {
                        "name": model,
                        "attachment": true,
                        "reasoning": true,
                        "tool_call": true,
                        "temperature": true,
                        "modalities": { "input": ["text", "image"], "output": ["text"] },
                        // OpenCode 拿 `input` 做上下文裁剪的水位线，
                        // 报大了会在长会话里直接撞上游限制。
                        "limit": { "context": 128000, "input": 96000, "output": 32000 },
                    }
                }
            }
        }),
    );
    root.insert("model".into(), json!(format!("maas/{model}")));
    root.insert(
        "mcp".into(),
        json!({
            // server 名必须是 `hub`：opencode 按它给工具加前缀，官方提示词里
            // 那 120 处调用写的都是 `hub_*`。
            "hub": {
                "type": "local",
                "command": ["bun", mcp_entry.to_string_lossy()],
                "environment": { "GATEWAY_URL": format!("http://127.0.0.1:{}", cfg.port) },
            }
        }),
    );
    root.insert("experimental".into(), json!({ "mcp_timeout": 3_600_000 }));
    Value::Object(root)
}

/// 找 opencode。顺序见模块文档。
fn find_opencode() -> Option<PathBuf> {
    if let Some(p) = std::env::var_os("OPENCODE_BIN").map(PathBuf::from)
        && p.is_file()
    {
        return Some(p);
    }
    let exe = if cfg!(windows) {
        "opencode.exe"
    } else {
        "opencode"
    };
    if let Some(paths) = std::env::var_os("PATH") {
        for dir in std::env::split_paths(&paths) {
            let candidate = dir.join(exe);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    // 最后兜底：本机装着 MiniMax Design 时借它自带的那个。仅为开发方便。
    let bundled: PathBuf = if cfg!(target_os = "macos") {
        "/Applications/MiniMax Design.app/Contents/Resources/opencode/opencode".into()
    } else if cfg!(windows) {
        let base = std::env::var_os("LOCALAPPDATA").map(PathBuf::from)?;
        base.join("Programs/MiniMax Design/resources/opencode/opencode.exe")
    } else {
        return None;
    };
    bundled.is_file().then_some(bundled)
}

/// MCP server 的入口。**两种形态都要认**：
///
/// - 发布包：`<可执行文件目录>/mcp/main.js`（`bun build` 出来的单文件，
///   不需要 node_modules）
/// - 仓库：`<仓库>/mcp/src/main.ts`
///
/// 写死其中一种的话，另一种下 agent 会启动失败，而错误信息只会说
/// "spawn bun 失败"，看不出是路径的问题。
fn find_mcp_entry() -> Option<PathBuf> {
    if let Some(p) = std::env::var_os("OVMCP_ENTRY").map(PathBuf::from) {
        return p.is_file().then_some(p);
    }
    if let Some(p) = find_beside("mcp/main.js") {
        return Some(p);
    }
    find_beside("mcp/src/main.ts")
}

/// 在「可执行文件旁边」和「仓库根」两处找一个相对路径。
///
/// 顺序：`OVAIJISUANDESIGN_ROOT` → 可执行文件目录 → 往上找 workspace 根。
fn find_beside(rel: &str) -> Option<PathBuf> {
    if let Some(root) = std::env::var_os("OVAIJISUANDESIGN_ROOT").map(PathBuf::from) {
        let p = root.join(rel);
        if p.exists() {
            return Some(p);
        }
    }
    let exe = std::env::current_exe().ok()?;
    let base = exe.parent()?;
    let beside = base.join(rel);
    if beside.exists() {
        return Some(beside);
    }
    // `cargo run` 时可执行文件在 target/<profile>/，往上找 workspace 根。
    let mut dir = base.to_path_buf();
    while dir.pop() {
        let candidate = dir.join(rel);
        if candidate.exists() {
            return Some(candidate);
        }
        if dir.join("Cargo.toml").is_file()
            && std::fs::read_to_string(dir.join("Cargo.toml"))
                .map(|s| s.contains("[workspace]"))
                .unwrap_or(false)
        {
            break;
        }
    }
    None
}

fn copy_dir(from: &Path, to: &Path) -> Result<()> {
    std::fs::create_dir_all(to)?;
    for entry in std::fs::read_dir(from)? {
        let entry = entry?;
        let dst = to.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir(&entry.path(), &dst)?;
        } else {
            std::fs::copy(entry.path(), &dst)?;
        }
    }
    Ok(())
}
