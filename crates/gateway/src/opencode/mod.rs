//! opencode 运行时：拉起 `opencode serve`、给它备好配置目录和配置文件。
//!
//! 照官方 MiniMax Design 的主进程编排（`docs/opencode-runtime.md`）。
//! 官方是 Electron 主进程做这件事，我们是 gateway —— 桌面端本来就把 gateway
//! 跑在进程内，由它管 opencode 子进程最直接。
//!
//! ```text
//! agent/（或发布包 agent-profiles/）
//!   └─ sync ─► <数据目录>/.config-v2          源目录，整份拷贝
//!                └─ stage ─► tmp/ov-opencode-staging-<pid>   OPENCODE_CONFIG_DIR
//!                              （合同拼进 agents/*.md，其余 symlink 回去）
//! config::build ─► tmp/ov-opencode-config-<pid>-<uuid>.json   OPENCODE_CONFIG
//! ```

pub mod config;
pub mod profile;
pub mod runtime;

use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use maas_media::Platform;
use serde_json::{Map, Value, json};

pub use runtime::{Endpoint, LaunchSpec, Runtime, SCRUBBED_ENV, Status};

/// 官方 base.json 的分区层叫 `base.<region>.json`。我们只有国内这一个。
pub const REGION: &str = "domestic";

/// opencode 的运行时开关。照官方 `OPENCODE_RUNTIME_SWITCHES`，每条的理由：
///
/// - `DISABLE_PROJECT_CONFIG`：工作区是用户内容，不是 agent 配置。不关的话
///   opencode 会从工作区往上收集 `.opencode` 目录当配置源（还会去那里 npm install）。
/// - `DISABLE_CLAUDE_CODE`：我们有自己的 agent 配置，不要再叠一层 Claude Code 的提示词。
/// - `DISABLE_EXTERNAL_SKILLS`：skill 走我们给的 `skills.paths`，不走 opencode 自己的发现。
/// - `LOG_LEVEL=INFO`：不显式给级别的话 opencode 写一个**零字节**的日志文件，
///   后台依赖安装失败这类诊断全丢。
const SWITCHES: &[(&str, &str)] = &[
    ("OPENCODE_DISABLE_PROJECT_CONFIG", "1"),
    ("OPENCODE_DISABLE_CLAUDE_CODE", "1"),
    ("OPENCODE_DISABLE_EXTERNAL_SKILLS", "1"),
    ("OPENCODE_LOG_LEVEL", "INFO"),
];

pub struct Inputs<'a> {
    pub workspace: &'a Path,
    pub platform: &'a Platform,
    /// 本 gateway 的地址，给插件和 MCP server 回连。
    pub gateway_url: String,
    pub skills_dir: PathBuf,
}

/// 备好一次启动所需的一切。每次启动都重做 —— staging 和配置文件都是临时的。
pub fn prepare(i: Inputs<'_>) -> Result<LaunchSpec> {
    let binary = locate_opencode().context(
        "找不到 opencode。发布包里应当自带（resources/opencode/）；\
         开发时用 OPENCODE_BIN 指定，或放进 PATH",
    )?;
    let src = profile::locate().context(
        "找不到 agent 配置（发布包的 agent-profiles/ 或仓库的 agent/）。\
         开发时也可以用 OV_AGENT_PROFILE_DIR 指定",
    )?;
    let data = data_dir().context("无法定位数据目录")?;
    let synced = data.join(".config-v2");
    profile::sync(&src, &synced, crate::VERSION)?;
    profile::assert_complete(&synced)?;

    let staging = std::env::temp_dir().join(format!("ov-opencode-staging-{}", std::process::id()));
    let report = profile::stage(&synced, &staging)?;
    tracing::info!(
        "agent 配置 {} → staging（{} 份合同：{}）",
        src.display(),
        report.contracts,
        report.spliced.join(" ")
    );

    // 把 opencode 的全部状态隔离到我们自己的数据目录下，不碰用户的 ~/.config/opencode。
    let rt = data.join("ai-runtime");
    let xdg = [
        ("XDG_CONFIG_HOME", rt.join("config-home")),
        ("XDG_CACHE_HOME", rt.join("cache-home")),
        ("XDG_DATA_HOME", rt.join("data-home")),
        ("XDG_STATE_HOME", rt.join("state-home")),
    ];
    for (_, d) in &xdg {
        std::fs::create_dir_all(d)?;
    }
    config::write_dependency_markers(&staging)?;
    config::write_dependency_markers(&xdg[0].1.join("opencode"))?;

    let mut mcp_env = Map::new();
    mcp_env.insert("GATEWAY_URL".into(), json!(i.gateway_url));
    mcp_env.insert("SKILLS_DIR".into(), json!(i.skills_dir.to_string_lossy()));
    mcp_env.insert(
        "HILO_KNOWLEDGE_DIR".into(),
        json!(synced.join("knowledge").to_string_lossy()),
    );
    mcp_env.insert(
        "HILO_WORKFLOWS_DIR".into(),
        json!(synced.join("workflows").to_string_lossy()),
    );
    let mcp = mcp_launch(mcp_env)
        .context("找不到 MCP server（发布包的 mcp/ 或仓库的 mcp/），或找不到运行它的 node")?;

    let cfg = config::build(config::Inputs {
        profile_dir: &synced,
        region: REGION,
        platform: i.platform,
        mcp,
        extra_plugins: plugin_file().into_iter().collect(),
        skills_paths: skill_dirs(&i.skills_dir),
    })?;
    let config_file = config::write_config_file(&cfg)?;

    let mut env: Vec<(String, String)> = vec![
        ("OPENCODE_CLIENT".into(), "hilo-agent".into()),
        // question 是 opencode 原生工具，但默认不开。官方 agent 配置里
        // `permission.question: allow` 的前提就是这个开关。
        ("OPENCODE_ENABLE_QUESTION_TOOL".into(), "true".into()),
        (
            "OPENCODE_TEST_HOME".into(),
            rt.join("home").to_string_lossy().into(),
        ),
        (
            "OPENCODE_CONFIG_DIR".into(),
            staging.to_string_lossy().into(),
        ),
        (
            "OPENCODE_CONFIG".into(),
            config_file.to_string_lossy().into(),
        ),
        // 插件要它回连 gateway；官方插件缺了直接 throw。
        ("GATEWAY_URL".into(), i.gateway_url.clone()),
        ("HILO_MANAGED_RUNTIME".into(), "1".into()),
        // 插件按 NODE_ENV 选数据根：非 production 会去读 ~/.hub-dev。
        ("NODE_ENV".into(), "production".into()),
        ("HILO_LOAD_USER_MEMORY".into(), "1".into()),
    ];
    std::fs::create_dir_all(rt.join("home"))?;
    for (k, d) in xdg {
        env.push((k.into(), d.to_string_lossy().into()));
    }
    for (k, v) in SWITCHES {
        env.push(((*k).into(), (*v).into()));
    }
    if cfg!(target_os = "macos") {
        // 官方同样强制：用户的 SHELL 可能是 fish / nu，agent 的 bash 工具
        // 按 POSIX 写的命令在那里跑不通，而错误看起来像命令本身写错了。
        env.push(("SHELL".into(), "/bin/bash".into()));
    }
    // opencode 的 grep 工具要 `rg`，发布包里放在它旁边。
    if let Some(dir) = binary.parent() {
        env.push(("PATH".into(), prepend_path(dir)));
    }

    Ok(LaunchSpec {
        binary,
        cwd: i.workspace.to_path_buf(),
        env,
        config_file,
    })
}

/// gateway 起来之后调一次：后台备好配置、拉起 opencode。
///
/// **不阻塞 gateway 启动，失败也不让 gateway 退出** —— 画布、资产、生成都不依赖
/// agent；opencode 起不来时只是聊天用不了，原因记在 [`Runtime::status`] 里，
/// 界面上如实显示。
pub fn spawn_start(state: std::sync::Arc<crate::AppState>, gateway_url: String) {
    tokio::spawn(async move {
        let spec = match prepare(Inputs {
            workspace: state.ws.root(),
            platform: &state.media.platform,
            gateway_url,
            skills_dir: state.ws.hilo().join("skills"),
        }) {
            Ok(s) => s,
            Err(e) => {
                tracing::error!("opencode 没有启动：{e:#}");
                state.opencode.fail(format!("{e:#}"));
                return;
            }
        };
        if let Err(e) = state.opencode.start(spec).await {
            tracing::error!("opencode 没有启动：{e:#}");
        }
    });
}

/// 我们的数据目录：配置文件所在的那个（macOS 是 `~/Library/Application Support/ovaijisuandesign`）。
pub fn data_dir() -> Option<PathBuf> {
    crate::config::Config::default_path()
        .ok()?
        .parent()
        .map(Path::to_path_buf)
}

pub(crate) fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn exe_name(base: &str) -> String {
    if cfg!(windows) {
        format!("{base}.exe")
    } else {
        base.to_string()
    }
}

/// 找 opencode。发布包自带的优先 —— 版本是钉死的（1.18.18），插件和配置都按它写。
///
/// 顺序：发布包 `opencode/` → `OPENCODE_BIN` → `PATH` → 本机 MiniMax Design
/// 的应用包（仅为开发方便，发布出去的机器上不该走到这一步）。
pub fn locate_opencode() -> Option<PathBuf> {
    let exe = exe_name("opencode");
    if let Some(p) = find_beside(&format!("opencode/{exe}")).filter(|p| p.is_file()) {
        return Some(p);
    }
    if let Some(p) = std::env::var_os("OPENCODE_BIN")
        .map(PathBuf::from)
        .filter(|p| p.is_file())
    {
        return Some(p);
    }
    if let Some(p) = which(&exe) {
        return Some(p);
    }
    let official: PathBuf = if cfg!(target_os = "macos") {
        "/Applications/MiniMax Design.app/Contents/Resources/opencode/opencode".into()
    } else if cfg!(windows) {
        std::env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)?
            .join("Programs/MiniMax Design/resources/opencode/opencode.exe")
    } else {
        return None;
    };
    official.is_file().then_some(official)
}

/// MCP server 怎么拉起。官方是 Electron 当 node 跑 `mcp-tools/dist/main.js`；
/// 我们打包一个 node。
///
/// 顺序：发布包 `node/node` + `mcp/main.js` → `OV_NODE_BIN` / `PATH` 里的 node +
/// 仓库 `mcp/dist/main.js`。
pub fn mcp_launch(environment: Map<String, Value>) -> Option<config::McpLaunch> {
    let node_exe = exe_name("node");
    let node = find_beside(&format!("node/{node_exe}"))
        .filter(|p| p.is_file())
        .or_else(|| {
            std::env::var_os("OV_NODE_BIN")
                .map(PathBuf::from)
                .filter(|p| p.is_file())
        })
        .or_else(|| which(&node_exe))?;
    let entry = std::env::var_os("OVMCP_ENTRY")
        .map(PathBuf::from)
        .filter(|p| p.is_file())
        .or_else(|| find_beside("mcp/main.js").filter(|p| p.is_file()))
        .or_else(|| find_beside("mcp/dist/main.js").filter(|p| p.is_file()))?;
    Some(config::McpLaunch {
        command: vec![
            node.to_string_lossy().into(),
            entry.to_string_lossy().into(),
        ],
        environment,
    })
}

/// 我们的 opencode 插件（官方 `opencode-plugin-hilo` 的等价物）。
/// 没有就不注入 —— 能跑，只是少了语言注入、防打转这些行为，启动时会记一条警告。
pub fn plugin_file() -> Option<PathBuf> {
    let p = find_beside("opencode-plugin/dist/index.js")
        .or_else(|| find_beside("opencode-plugin/src/index.ts"));
    if p.is_none() {
        tracing::warn!("没找到 opencode-plugin，agent 会缺少工作语言注入和防打转");
    }
    p
}

/// 每个 skill 一个目录，逐个列给 opencode —— 官方的 `skills.paths` 就是这个形状
/// （不是父目录）。没有 SKILL.md 的目录不算。
fn skill_dirs(root: &Path) -> Vec<PathBuf> {
    let Ok(rd) = std::fs::read_dir(root) else {
        return Vec::new();
    };
    let mut dirs: Vec<PathBuf> = rd
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.join("SKILL.md").is_file())
        .collect();
    dirs.sort();
    dirs
}

fn which(exe: &str) -> Option<PathBuf> {
    let paths = std::env::var_os("PATH")?;
    std::env::split_paths(&paths)
        .map(|d| d.join(exe))
        .find(|p| p.is_file())
}

fn prepend_path(dir: &Path) -> String {
    let mut parts = vec![dir.to_path_buf()];
    if let Some(p) = std::env::var_os("PATH") {
        parts.extend(std::env::split_paths(&p));
    }
    std::env::join_paths(parts)
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default()
}

/// 在「可执行文件旁边」和「仓库根」两处找一个相对路径。
///
/// 顺序：`OVAIJISUANDESIGN_ROOT` → macOS `.app` 的 `Contents/Resources/` →
/// 可执行文件目录 → 往上找到 workspace 根（`cargo run` 时）。
pub fn find_beside(rel: &str) -> Option<PathBuf> {
    if let Some(root) = std::env::var_os("OVAIJISUANDESIGN_ROOT").map(PathBuf::from) {
        let p = root.join(rel);
        if p.exists() {
            return Some(p);
        }
    }
    let exe = std::env::current_exe().ok()?;
    let base = exe.parent()?;
    for p in [base.join("../Resources").join(rel), base.join(rel)] {
        if p.exists() {
            return Some(p);
        }
    }
    let mut dir = base.to_path_buf();
    while dir.pop() {
        let candidate = dir.join(rel);
        if candidate.exists() {
            return Some(candidate);
        }
        if std::fs::read_to_string(dir.join("Cargo.toml")).is_ok_and(|s| s.contains("[workspace]"))
        {
            break;
        }
    }
    None
}
