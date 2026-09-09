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
    let reference = repo_root()?.join("reference/agent-profiles");
    anyhow::ensure!(
        reference.is_dir(),
        "还没快照官方配置：{}\n先跑 scripts/snapshot-agent-profiles.sh",
        reference.display()
    );

    let opencode = find_opencode().context(
        "找不到 opencode。装一份（https://opencode.ai）并放进 PATH，\
         或者用 OPENCODE_BIN 指定路径",
    )?;

    // staging 目录里现拼配置。**不落进版本库** —— 里面有 api_key。
    let staging =
        std::env::temp_dir().join(format!("ovaijisuandesign-agent-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&staging);
    copy_dir(&reference, &staging).context("复制官方 agent 配置失败")?;
    // 我们自己写的覆盖同名文件。
    let ours = repo_root()?.join("agent");
    for sub in ["agents", "contracts", "skills"] {
        let from = ours.join(sub);
        if from.is_dir() {
            copy_dir(&from, &staging.join(sub))?;
        }
    }

    let official: Value = serde_json::from_str(
        &std::fs::read_to_string(reference.join("base.json")).context("读官方 base.json 失败")?,
    )?;
    let cfg_json = build_opencode_config(&cfg, &official, &repo_root()?);
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
fn build_opencode_config(cfg: &Config, official: &Value, repo: &Path) -> Value {
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
                "command": ["bun", repo.join("mcp/src/main.ts").to_string_lossy()],
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

/// 仓库根目录。可执行文件在 `target/<profile>/`，往上找到有 `Cargo.toml`
/// 且带 `[workspace]` 的那一层。
fn repo_root() -> Result<PathBuf> {
    if let Some(p) = std::env::var_os("OVAIJISUANDESIGN_ROOT") {
        return Ok(PathBuf::from(p));
    }
    let mut dir = std::env::current_exe()?;
    while dir.pop() {
        let manifest = dir.join("Cargo.toml");
        if manifest.is_file()
            && std::fs::read_to_string(&manifest)
                .map(|s| s.contains("[workspace]"))
                .unwrap_or(false)
        {
            return Ok(dir);
        }
    }
    // 从 `cargo run` 起的时候 current_exe 在 target/ 里，上面那条能找到。
    // 装到别处时用环境变量指 —— 说清楚比猜一个默认值好。
    anyhow::bail!("定位不到仓库根目录，用 OVAIJISUANDESIGN_ROOT 指定")
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
