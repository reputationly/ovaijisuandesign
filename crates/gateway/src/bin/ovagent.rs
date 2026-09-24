//! 在终端里跑 agent：和应用内**完全同一份**配置，只是 opencode 以 TUI / `run`
//! 的形态跑，而不是 `serve`。
//!
//! ```text
//! ovagent [工作区] [-- opencode 的参数…]
//! ovagent ~/ws -- run "生成一张…"
//! ```
//!
//! 配置由 [`gateway::opencode::prepare`] 备好（agent 配置 staging、合同拼接、
//! provider、MCP、插件），和 gateway 拉起的那个 `opencode serve` 一模一样 ——
//! 终端里复现的问题就是应用里的问题。gateway 要先在跑（MCP server 回连它）。

use std::path::PathBuf;
use std::process::Command;

use anyhow::{Context, Result};
use gateway::config::Config;
use gateway::opencode;

fn main() -> Result<()> {
    // 放在解析工作区之前 —— 否则 `--version` 会被当成工作区路径。
    if let Some(a) = std::env::args().nth(1) {
        match a.as_str() {
            "--version" | "-V" => {
                println!("ovagent {}", gateway::VERSION);
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

    let spec = opencode::prepare(opencode::Inputs {
        workspace: &workspace,
        platform: &cfg.media.platform,
        gateway_url: format!("http://127.0.0.1:{}", cfg.port),
        skills_dir: workspace.join(".hilo/skills"),
    })?;

    eprintln!("opencode    {}", spec.binary.display());
    eprintln!(
        "模型        {}/{}",
        opencode::config::PROVIDER_ID,
        cfg.media.platform.chat_model
    );
    eprintln!("gateway     http://127.0.0.1:{}", cfg.port);
    eprintln!("工作区      {}", workspace.display());

    let mut cmd = Command::new(&spec.binary);
    cmd.args(&passthrough).current_dir(&workspace);
    for key in opencode::SCRUBBED_ENV {
        cmd.env_remove(key);
    }
    cmd.envs(spec.env.iter().map(|(k, v)| (k, v)));
    let status = cmd
        .status()
        .with_context(|| format!("启动 {} 失败", spec.binary.display()))?;

    let _ = std::fs::remove_file(&spec.config_file);
    std::process::exit(status.code().unwrap_or(1));
}
