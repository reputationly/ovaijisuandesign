//! agent 配置（profile）：从哪读、同步到哪、怎么拼成 opencode 真正加载的那份。
//!
//! 目录结构和官方 `agent-profiles/v2/config` 一致（`base.json` / `agents/` /
//! `contracts/` / `knowledge/` / `workflows/` / `plugins/`），内容是我们自己写的，
//! 在仓库的 `agent/` 下。见 `docs/opencode-runtime.md` 第四节。
//!
//! ## 为什么要 staging，而不是把目录直接交给 opencode
//!
//! **合同（contracts）不会自己进 agent 提示词。** 官方主进程每次启动都在临时目录
//! 里重建一份：除 `agents/` 外全部 symlink 回源目录，`agents/*.md` 则按各合同
//! frontmatter 的 `agents:` 把合同正文拼进去，再追加 `<knowledge-base>` /
//! `<workflows-base>` 两段绝对路径说明。直接把源目录交给 opencode 的话，
//! agent 看不到任何合同，而且 opencode 不会报错 —— 只是行为不对。
//!
//! 拼接格式逐字照官方（`setupAgentStaging`），包括哪些 agent 拿哪段知识库头。

use std::path::{Path, PathBuf};

use anyhow::{Context, Result, bail};
use serde_json::{Value, json};

/// opencode 真正要读的几个文件 / 目录。缺一个就不启动 —— 缺了照样能跑起来，
/// 但 agent 会一本正经地引用不存在的合同或工作流。清单照官方
/// `REQUIRED_PROFILE_ENTRIES`。
const REQUIRED: &[(&str, bool)] = &[
    ("base.json", false),
    ("agents/media-agent.md", false),
    ("agents/comfyui-agent.md", false),
    ("agents/planner.md", false),
    ("agents/router.md", false),
    ("agents/executor.md", false),
    ("contracts/baseline.md", false),
    ("knowledge/vendors", true),
    ("plugins/session-header.ts", false),
    ("workflows/workflow.md", false),
];

/// staging 时复制而不是 symlink 的文件。opencode 会就地改写它们（依赖安装），
/// symlink 过去的话会写穿到源目录。
const COPY_ONLY: &[&str] = &["package.json", "package-lock.json", "bun.lock", "bun.lockb"];

pub const MARKER: &str = ".contracts-staging-marker.json";

/// 源目录在哪。
///
/// 顺序：`OV_AGENT_PROFILE_DIR`（开发时可以指到 `reference/agent-profiles`
/// 拿官方那份对跑）→ 发布包资源目录 `agent-profiles/` → 仓库 `agent/`。
pub fn locate() -> Option<PathBuf> {
    if let Some(p) = std::env::var_os("OV_AGENT_PROFILE_DIR").map(PathBuf::from) {
        return p.join("base.json").is_file().then_some(p);
    }
    super::find_beside("agent-profiles")
        .or_else(|| super::find_beside("agent"))
        .filter(|p| p.join("base.json").is_file())
}

/// 把源目录整份同步到数据目录，`.version` 记版本。
///
/// **整目录删了重拷，不做增量**（官方 `syncBundledConfig` 也是）：增量同步会
/// 留下新版本已经删掉的合同，而合同按文件名自动拼进去，留下一个就多一段
/// 过期的规则。官方只在版本变了时才拷；我们每次都拷 —— 1.5MB 不值得省，
/// 而开发时改了提示词、版本号却没变，按版本判断会让改动不生效。
pub fn sync(src: &Path, dest: &Path, version: &str) -> Result<()> {
    let _ = std::fs::remove_dir_all(dest);
    copy_dir(src, dest).with_context(|| format!("同步 agent 配置到 {} 失败", dest.display()))?;
    std::fs::write(dest.join(".version"), version)?;
    Ok(())
}

pub fn assert_complete(dir: &Path) -> Result<()> {
    let missing: Vec<&str> = REQUIRED
        .iter()
        .filter(|(rel, is_dir)| {
            let p = dir.join(rel);
            if *is_dir { !p.is_dir() } else { !p.is_file() }
        })
        .map(|(rel, _)| *rel)
        .collect();
    if !missing.is_empty() {
        bail!(
            "agent 配置不完整（{}）: 缺 {}",
            dir.display(),
            missing.join("、")
        );
    }
    Ok(())
}

/// `base.json` → `base.<region>.json` 逐层深合并。照官方 `loadMergedConfig`
/// （官方还有第三层 `<channel>.json`，我们只有一个渠道）。
pub fn load_merged(dir: &Path, region: &str) -> Result<Value> {
    let mut merged = json!({});
    for name in ["base.json".to_string(), format!("base.{region}.json")] {
        let p = dir.join(&name);
        if !p.is_file() {
            continue;
        }
        let raw = std::fs::read_to_string(&p)?;
        let v: Value =
            serde_json::from_str(&raw).with_context(|| format!("{name} 不是合法 JSON"))?;
        deep_merge(&mut merged, v);
    }
    Ok(merged)
}

/// 对象按键递归合并，其余（含数组）整个替换。
pub fn deep_merge(into: &mut Value, from: Value) {
    match (into, from) {
        (Value::Object(a), Value::Object(b)) => {
            for (k, v) in b {
                match a.get_mut(&k) {
                    Some(slot) if slot.is_object() && v.is_object() => deep_merge(slot, v),
                    _ => {
                        a.insert(k, v);
                    }
                }
            }
        }
        (slot, v) => *slot = v,
    }
}

// ---------------------------------------------------------------------------
// staging
// ---------------------------------------------------------------------------

struct Contract {
    name: String,
    agents: Vec<String>,
    content: String,
}

#[derive(Debug, Default)]
pub struct StageReport {
    pub contracts: usize,
    /// 拼了东西进去的 agent，`名字×合同数`。
    pub spliced: Vec<String>,
}

/// 在 `staging` 重建 opencode 的配置目录。见模块文档。
pub fn stage(source: &Path, staging: &Path) -> Result<StageReport> {
    let _ = std::fs::remove_dir_all(staging);
    std::fs::create_dir_all(staging)
        .with_context(|| format!("建 staging 目录失败: {}", staging.display()))?;

    let contracts = load_contracts(&source.join("contracts"))?;

    // 除 agents 外全部链回源目录。
    for entry in std::fs::read_dir(source)? {
        let entry = entry?;
        let name = entry.file_name();
        let name_s = name.to_string_lossy();
        if name_s == "agent" || name_s == "agents" {
            continue;
        }
        let target = entry.path();
        let link = staging.join(&name);
        if COPY_ONLY.contains(&name_s.as_ref()) {
            copy_any(&target, &link)?;
            continue;
        }
        if symlink(&target, &link).is_err() {
            // Windows 上没开发者模式时 symlink 会失败。退回复制 —— 官方也是这么兜的。
            copy_any(&target, &link)?;
        }
    }

    let knowledge = source.join("knowledge");
    let knowledge_block =
        (knowledge.join("vendors").is_dir()).then(|| knowledge_block_for_primary(&knowledge));
    let knowledge_sub = knowledge_block_for_subagent(&knowledge);
    let workflows = source.join("workflows");
    let workflows_block = workflows
        .join("workflow.md")
        .is_file()
        .then(|| workflows_block(&workflows));

    let staged_agents = staging.join("agents");
    std::fs::create_dir_all(&staged_agents)?;
    let mut report = StageReport {
        contracts: contracts.len(),
        ..Default::default()
    };

    for entry in std::fs::read_dir(source.join("agents"))? {
        let entry = entry?;
        let file = entry.file_name().to_string_lossy().into_owned();
        if !entry.file_type()?.is_file() || !file.ends_with(".md") {
            continue;
        }
        let agent = file.trim_end_matches(".md");
        let matched: Vec<&Contract> = contracts
            .iter()
            .filter(|c| c.agents.iter().any(|a| a == "*" || a == agent))
            .collect();
        let raw = std::fs::read_to_string(entry.path())?;
        let staged = splice(
            &raw,
            agent == "media-agent",
            &matched,
            knowledge_block.as_deref(),
            &knowledge_sub,
            workflows_block.as_deref(),
        );
        if !matched.is_empty() {
            report.spliced.push(format!("{agent}×{}", matched.len()));
        }
        std::fs::write(staged_agents.join(&file), staged)?;
    }

    let _ = std::fs::write(
        staging.join(MARKER),
        serde_json::to_vec(&json!({
            "stagedAt": super::now_ms(),
            "contractsCount": report.contracts,
            "agentsCount": report.spliced.len(),
            "success": true,
        }))?,
    );
    Ok(report)
}

/// 拼一个 agent 文件。**逐字照官方**：
///
/// - 主 agent（media-agent）拿"轻量版"知识库头，其余 agent **只有匹配到合同时**
///   才拿子 agent 版的头（那版明确禁止主动浏览知识库目录）；
/// - 工作流头给主 agent 和匹配到合同的 agent；
/// - 什么都没匹配到、又不是主 agent 的，原样输出。
fn splice(
    raw: &str,
    is_primary: bool,
    matched: &[&Contract],
    knowledge: Option<&str>,
    knowledge_sub: &str,
    workflows: Option<&str>,
) -> String {
    let has_contract = !matched.is_empty();
    if !has_contract && !(is_primary && (knowledge.is_some() || workflows.is_some())) {
        return raw.to_string();
    }
    let blob = matched
        .iter()
        .map(|c| format!("<contract name=\"{}\">\n{}\n</contract>", c.name, c.content))
        .collect::<Vec<_>>()
        .join("\n\n");
    let knowledge_suffix = match knowledge {
        Some(k) if is_primary => format!("\n\n{k}"),
        _ if has_contract => format!("\n\n{knowledge_sub}"),
        _ => String::new(),
    };
    let workflows_suffix = match workflows {
        Some(w) if is_primary || has_contract => format!("\n\n{w}"),
        _ => String::new(),
    };
    let contracts_blob = if blob.is_empty() {
        String::new()
    } else {
        format!(
            "\n\n<!-- Contracts: auto-injected cross-cutting rules for this agent. -->\n\n{blob}"
        )
    };
    let (fm, body) = split_frontmatter(raw);
    format!(
        "{}{}{contracts_blob}{knowledge_suffix}{workflows_suffix}\n",
        fm.unwrap_or(""),
        if fm.is_some() {
            body.trim()
        } else {
            raw.trim()
        },
    )
}

fn load_contracts(dir: &Path) -> Result<Vec<Contract>> {
    let mut out = Vec::new();
    let Ok(rd) = std::fs::read_dir(dir) else {
        bail!("没有 contracts 目录: {}", dir.display());
    };
    let mut entries: Vec<_> = rd.filter_map(|e| e.ok()).collect();
    // 官方用 readdir 的顺序（文件系统序）。我们排个序，至少每次一样。
    entries.sort_by_key(|e| e.file_name());
    for entry in entries {
        let file = entry.file_name().to_string_lossy().into_owned();
        if !file.ends_with(".md") || file == "README.md" || !entry.path().is_file() {
            continue;
        }
        let raw = std::fs::read_to_string(entry.path())?;
        let (fm, body) = split_frontmatter(&raw);
        let meta = fm.map(parse_frontmatter).unwrap_or_default();
        let agents = meta.agents;
        if agents.is_empty() {
            // 官方同样跳过：没声明给谁的合同不知道该拼进哪里。要全给就写 `agents: ['*']`。
            tracing::warn!("合同 {file} 没有 agents: frontmatter，跳过");
            continue;
        }
        let content = if fm.is_some() {
            body.trim()
        } else {
            raw.trim()
        };
        if content.is_empty() {
            continue;
        }
        out.push(Contract {
            name: meta
                .name
                .unwrap_or_else(|| file.trim_end_matches(".md").to_string()),
            agents,
            content: content.to_string(),
        });
    }
    Ok(out)
}

/// `(frontmatter 连同两条 ---, 正文)`。没有 frontmatter 时前者为 None。
///
/// 等价于官方的 `^(---\s*\n[\s\S]*?\n---\s*\n)([\s\S]*)$`。注意结尾那个
/// `\s*\n` 是贪婪的：结束分隔符后面紧跟的空行**归 frontmatter**，
/// 一直吞到这段空白里最后一个换行。拼接时正文会 trim，所以这些空行
/// 会原样留在 frontmatter 和正文之间。
fn split_frontmatter(raw: &str) -> (Option<&str>, &str) {
    let Some(rest) = raw.strip_prefix("---") else {
        return (None, raw);
    };
    // 开头那行 `---` 之后允许空白，然后换行。
    let Some(nl) = rest.find('\n') else {
        return (None, raw);
    };
    if !rest[..nl].trim().is_empty() {
        return (None, raw);
    }
    let after_open = 3 + nl + 1;
    let mut pos = after_open;
    for line in raw[after_open..].split_inclusive('\n') {
        if line.trim_end() == "---" && line.starts_with("---") && line.ends_with('\n') {
            let mut end = pos + line.len();
            let ws = raw[end..].len() - raw[end..].trim_start().len();
            if let Some(last_nl) = raw[end..end + ws].rfind('\n') {
                end += last_nl + 1;
            }
            return (Some(&raw[..end]), &raw[end..]);
        }
        pos += line.len();
    }
    (None, raw)
}

#[derive(Default)]
struct Meta {
    name: Option<String>,
    agents: Vec<String>,
}

/// 只认合同用得到的两个键：`name` 和 `agents`（行内 `[a, b]`、块列表 `- a`、单个标量都行）。
fn parse_frontmatter(fm: &str) -> Meta {
    let mut meta = Meta::default();
    let mut in_agents = false;
    for line in fm.lines() {
        let t = line.trim();
        if t == "---" {
            continue;
        }
        if in_agents {
            if let Some(item) = t.strip_prefix("- ") {
                meta.agents.push(unquote(item).to_string());
                continue;
            }
            in_agents = false;
        }
        let Some((k, v)) = t.split_once(':') else {
            continue;
        };
        let v = v.trim();
        match k.trim() {
            "name" if !v.is_empty() => meta.name = Some(unquote(v).to_string()),
            "agents" => {
                if v.is_empty() {
                    in_agents = true;
                } else if let Some(inner) = v.strip_prefix('[').and_then(|s| s.strip_suffix(']')) {
                    meta.agents = inner
                        .split(',')
                        .map(|s| unquote(s.trim()).to_string())
                        .filter(|s| !s.is_empty())
                        .collect();
                } else {
                    meta.agents = vec![unquote(v).to_string()];
                }
            }
            _ => {}
        }
    }
    meta
}

fn unquote(s: &str) -> &str {
    s.trim().trim_matches(|c| c == '"' || c == '\'')
}

fn knowledge_block_for_primary(dir: &Path) -> String {
    let d = dir.display();
    [
        "<knowledge-base>".to_string(),
        "# Knowledge Base Directory (auto-injected)".into(),
        String::new(),
        format!("**Base directory**: `{d}`"),
        String::new(),
        "When this SP cites a relative knowledge path (e.g.".into(),
        "`vendors/banana.md`, `failures/anatomy-traps.md`),".into(),
        format!("expand it to the absolute path under `{d}/` before calling"),
        "`hub_read`. Never Read the literal relative form — it would resolve to the".into(),
        "user workspace and fail.".into(),
        "</knowledge-base>".into(),
    ]
    .join("\n")
}

fn knowledge_block_for_subagent(dir: &Path) -> String {
    [
        "<knowledge-base>".to_string(),
        "# Knowledge Base Directory (auto-injected)".into(),
        String::new(),
        format!("**Base directory**: `{}`", dir.display()),
        String::new(),
        "When an injected contract instructs you to Read a path prefixed with".into(),
        "`<knowledgeDir>` (e.g. `<knowledgeDir>/model-prompts/nano-banana.md`),".into(),
        "expand `<knowledgeDir>` to the absolute path above and Read the resulting".into(),
        "full path. Never Read the literal `<knowledgeDir>/...` form — it would".into(),
        "resolve to the user workspace and fail.".into(),
        String::new(),
        "You MUST NOT proactively browse this directory. Only Read files explicitly".into(),
        "named by an injected contract.".into(),
        "</knowledge-base>".into(),
    ]
    .join("\n")
}

fn workflows_block(dir: &Path) -> String {
    [
        "<workflows-base>".to_string(),
        "# Workflows Directory (auto-injected)".into(),
        String::new(),
        format!("**Base directory**: `{}`", dir.display()),
        String::new(),
        "Layout: `workflow.md` (routing index), `README.md` (directory guide),".into(),
        "`<project_type>/workflow.md` for each".into(),
        "project workflow, and `_shared/<name>.md` for cross-workflow utilities.".into(),
        "When the SP or an injected contract cites a path prefixed with".into(),
        "`<workflowsDir>` (e.g. `<workflowsDir>/ad-tvc/workflow.md`), expand".into(),
        "`<workflowsDir>` to the absolute path above before calling `hub_read`.".into(),
        "`_disabled/` is an archive only and is never a `workflow_match` target.".into(),
        "Never Read the literal `<workflowsDir>/...` form — it would resolve to".into(),
        "the user workspace and fail.".into(),
        "</workflows-base>".into(),
    ]
    .join("\n")
}

// ---------------------------------------------------------------------------
// 文件工具
// ---------------------------------------------------------------------------

#[cfg(unix)]
fn symlink(target: &Path, link: &Path) -> std::io::Result<()> {
    std::os::unix::fs::symlink(target, link)
}

#[cfg(windows)]
fn symlink(target: &Path, link: &Path) -> std::io::Result<()> {
    if target.is_dir() {
        std::os::windows::fs::symlink_dir(target, link)
    } else {
        std::os::windows::fs::symlink_file(target, link)
    }
}

fn copy_any(from: &Path, to: &Path) -> Result<()> {
    if from.is_dir() {
        copy_dir(from, to)
    } else {
        std::fs::copy(from, to)?;
        Ok(())
    }
}

pub fn copy_dir(from: &Path, to: &Path) -> Result<()> {
    std::fs::create_dir_all(to)?;
    for entry in std::fs::read_dir(from)? {
        let entry = entry?;
        let dst = to.join(entry.file_name());
        // 跟随 symlink（dereference），和官方 cpSync 的 `dereference: true` 一致。
        if entry.path().is_dir() {
            copy_dir(&entry.path(), &dst)?;
        } else {
            std::fs::copy(entry.path(), &dst)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write(p: &Path, s: &str) {
        std::fs::create_dir_all(p.parent().unwrap()).unwrap();
        std::fs::write(p, s).unwrap();
    }

    #[test]
    fn frontmatter_agents_in_all_three_shapes() {
        let inline = parse_frontmatter("---\nname: a\nagents: [media-agent, 'executor']\n---\n");
        assert_eq!(inline.agents, ["media-agent", "executor"]);
        let block = parse_frontmatter("---\nagents:\n  - router\n  - \"planner\"\nname: b\n---\n");
        assert_eq!(block.agents, ["router", "planner"]);
        assert_eq!(block.name.as_deref(), Some("b"));
        let scalar = parse_frontmatter("---\nagents: '*'\n---\n");
        assert_eq!(scalar.agents, ["*"]);
    }

    #[test]
    fn splices_contracts_and_headers_like_the_official() {
        let src = tempfile::tempdir().unwrap();
        let s = src.path();
        write(&s.join("base.json"), "{}");
        write(
            &s.join("agents/media-agent.md"),
            "---\nmode: primary\n---\n\n主 agent\n",
        );
        write(
            &s.join("agents/executor.md"),
            "---\nmode: subagent\n---\n执行\n",
        );
        write(&s.join("agents/router.md"), "路由\n");
        write(
            &s.join("contracts/baseline.md"),
            "---\nname: baseline\nagents: [media-agent, executor]\n---\n\n基线规则\n",
        );
        write(&s.join("contracts/README.md"), "不是合同");
        write(
            &s.join("contracts/orphan.md"),
            "---\nname: orphan\n---\n没说给谁",
        );
        write(&s.join("knowledge/vendors/x.md"), "x");
        write(&s.join("workflows/workflow.md"), "索引");

        let st = tempfile::tempdir().unwrap();
        let staging = st.path().join("s");
        let r = stage(s, &staging).unwrap();
        assert_eq!(r.contracts, 1, "README 和没有 agents: 的合同都不算");

        let media = std::fs::read_to_string(staging.join("agents/media-agent.md")).unwrap();
        // frontmatter 后那个空行保留（官方正则的贪婪 `\s*\n`），正文 trim。
        assert!(media.starts_with("---\nmode: primary\n---\n\n主 agent\n\n<!-- Contracts:"));
        assert!(media.contains("<contract name=\"baseline\">\n基线规则\n</contract>"));
        // 主 agent 拿轻量版知识库头（没有"禁止主动浏览"那句）+ 工作流头。
        assert!(media.contains("When this SP cites a relative knowledge path"));
        assert!(!media.contains("MUST NOT proactively browse"));
        assert!(media.trim_end().ends_with("</workflows-base>"));

        let exec = std::fs::read_to_string(staging.join("agents/executor.md")).unwrap();
        assert!(
            exec.contains("MUST NOT proactively browse"),
            "子 agent 拿子 agent 版的头"
        );
        assert!(exec.contains("<workflows-base>"));

        // 没匹配到合同的子 agent 原样输出，一个字不加。
        let router = std::fs::read_to_string(staging.join("agents/router.md")).unwrap();
        assert_eq!(router, "路由\n");

        // 其余条目链回源目录。
        assert!(staging.join("knowledge/vendors/x.md").is_file());
        assert!(staging.join("workflows/workflow.md").is_file());
        assert!(staging.join(MARKER).is_file());
    }

    #[test]
    fn missing_entries_are_named() {
        let d = tempfile::tempdir().unwrap();
        write(&d.path().join("base.json"), "{}");
        let e = assert_complete(d.path()).unwrap_err().to_string();
        assert!(
            e.contains("agents/media-agent.md") && e.contains("knowledge/vendors"),
            "{e}"
        );
    }

    #[test]
    fn deep_merge_replaces_arrays_and_merges_objects() {
        let mut a = json!({"agent": {"x": {"tools": {"a": true}}}, "plugin": ["p1"]});
        deep_merge(
            &mut a,
            json!({"agent": {"x": {"tools": {"b": true}}}, "plugin": ["p2"]}),
        );
        assert_eq!(
            a,
            json!({"agent": {"x": {"tools": {"a": true, "b": true}}}, "plugin": ["p2"]})
        );
    }
}
