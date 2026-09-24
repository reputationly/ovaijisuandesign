//! 拼给 opencode 的配置。照官方 `buildConfigContent`，见 `docs/opencode-runtime.md` 第三节。
//!
//! 和官方的差别只有来源：官方的 provider 从云端 `/api/v1/config` 下发，
//! 我们的来自本地配置里填的自建平台 —— 按官方「自定义模型」那条路径拼
//! （provider id `user-custom-*`、`@ai-sdk/openai-compatible`），这样插件里
//! 按 `user-custom-*` 判断的逻辑（`maxOutputTokens`、跳过计费头）原样成立。

use std::path::{Path, PathBuf};

use anyhow::Result;
use serde_json::{Map, Value, json};

use maas_media::Platform;

/// 我们平台在 opencode 里的 provider id。**必须以 `user-custom-` 开头**：
/// 官方插件按这个前缀决定"不带计费头、按模型上限设 maxOutputTokens"。
pub const PROVIDER_ID: &str = "user-custom-maas";

/// 插件运行时依赖的版本。钉死和 opencode 同版本 —— 这是官方写进依赖标记的值。
pub const PLUGIN_RUNTIME_VERSION: &str = "1.18.18";

/// MCP server 怎么拉起。
pub struct McpLaunch {
    pub command: Vec<String>,
    pub environment: Map<String, Value>,
}

pub struct Inputs<'a> {
    /// 同步后的源目录（不是 staging）。插件路径按它解析。
    pub profile_dir: &'a Path,
    pub region: &'a str,
    pub platform: &'a Platform,
    pub mcp: McpLaunch,
    /// 除 profile 自带的 `plugin` 之外，额外注入的插件文件（我们的 hilo 等价物）。
    pub extra_plugins: Vec<PathBuf>,
    pub skills_paths: Vec<PathBuf>,
}

pub fn build(i: Inputs<'_>) -> Result<Value> {
    let mut config = super::profile::load_merged(i.profile_dir, i.region)?;
    let obj = config.as_object_mut().expect("load_merged 总是返回对象");
    obj.remove("media_models");

    // -- provider：走官方「自定义模型」那条 --
    let model = i.platform.chat_model.trim();
    if !model.is_empty() {
        let providers = obj.entry("provider").or_insert_with(|| json!({}));
        if let Some(p) = providers.as_object_mut() {
            p.insert(PROVIDER_ID.into(), custom_provider(i.platform));
        }
        if let Some(Value::Array(enabled)) = obj.get_mut("enabled_providers")
            && !enabled.iter().any(|v| v == PROVIDER_ID)
        {
            enabled.push(json!(PROVIDER_ID));
        }
        if let Some(Value::Array(disabled)) = obj.get_mut("disabled_providers") {
            disabled.retain(|v| v != PROVIDER_ID);
        }
        // 启用自定义模型时官方会删掉各 agent 的 model 和 small_model ——
        // 否则 agent 会去找一个我们平台上不存在的模型。
        if let Some(Value::Object(agents)) = obj.get_mut("agent") {
            for a in agents.values_mut() {
                if let Some(a) = a.as_object_mut() {
                    a.remove("model");
                }
            }
        }
        obj.remove("small_model");
        // 官方的 `model` 由云端下发（remoteConfig.model），我们用平台配置里那个。
        obj.insert("model".into(), json!(format!("{PROVIDER_ID}/{model}")));
    }

    // permission / compaction：官方由云端 `/api/v1/config` 下发，我们没有云端，
    // 固定成官方下发的那组值（从官方生成的配置文件里原样抄的）。
    //
    // **不能只写 `{"*": "allow"}`**：opencode 会在它后面追加自己的默认规则
    // `external_directory: ask` / `doom_loop: ask`。知识库和工作流都在工作区外，
    // agent 一读就发 permission.asked —— 而官方整条链（gateway、渲染层）都不处理
    // 那个事件，于是这一轮永远卡住，界面上只是"还在想"。
    if !obj.contains_key("permission") {
        obj.insert("permission".into(), default_permission());
    }
    if !obj.contains_key("compaction") {
        obj.insert(
            "compaction".into(),
            json!({ "auto": true, "prune": true, "reserved": 40_000 }),
        );
    }

    let skills = obj.entry("skills").or_insert_with(|| json!({}));
    if let Some(s) = skills.as_object_mut() {
        s.insert(
            "paths".into(),
            json!(
                i.skills_paths
                    .iter()
                    .map(|p| p.to_string_lossy())
                    .collect::<Vec<_>>()
            ),
        );
    }

    // -- mcp.hub：换成我们的拉起方式，环境变量合并 --
    let mcp = obj.entry("mcp").or_insert_with(|| json!({}));
    if let Some(m) = mcp.as_object_mut() {
        let hub = m.entry("hub").or_insert_with(|| json!({ "type": "local" }));
        if let Some(h) = hub.as_object_mut() {
            h.insert("type".into(), json!("local"));
            h.insert("command".into(), json!(i.mcp.command));
            let env = h.entry("environment").or_insert_with(|| json!({}));
            if let Some(e) = env.as_object_mut() {
                for (k, v) in i.mcp.environment {
                    e.insert(k, v);
                }
            }
        }
    }

    // -- plugin：一律 file:// 绝对路径 --
    let mut plugins: Vec<Value> = obj
        .get("plugin")
        .and_then(Value::as_array)
        .map(|a| {
            a.iter()
                .filter_map(Value::as_str)
                .map(|p| json!(resolve_plugin(p, i.profile_dir)))
                .collect()
        })
        .unwrap_or_default();
    for p in &i.extra_plugins {
        plugins.push(json!(file_url(p)));
    }
    obj.insert("plugin".into(), Value::Array(plugins));

    Ok(config)
}

/// 官方云端下发的 permission，逐项照抄。
fn default_permission() -> Value {
    json!({
        "read": "allow", "write": "allow", "edit": "allow", "bash": "allow",
        "glob": "allow", "grep": "allow", "task": "allow", "todowrite": "allow",
        "skill": "allow", "webfetch": "allow", "external_directory": "allow",
    })
}

/// 照官方 `buildCustomProviderConfig`。
fn custom_provider(p: &Platform) -> Value {
    let model = p.chat_model.trim();
    json!({
        "name": "maas",
        "npm": "@ai-sdk/openai-compatible",
        "options": { "baseURL": p.base_url, "apiKey": p.api_key, "headers": {} },
        "models": {
            model: {
                "id": model,
                "name": model,
                "tool_call": true,
                // opencode 拿 context 做压缩水位线。报大了会在长会话里直接撞上游限制。
                "limit": { "context": 128_000, "output": 32_000 },
            }
        }
    })
}

/// profile 里的插件路径（官方写的是 `.opencode-v2/plugins/x.ts` 这种相对形式）
/// → 源目录下的绝对 `file://`。按文件名落到 `plugins/` 下 —— 前缀是官方开发树的
/// 布局，跟我们无关。已经是 URL / 绝对路径的原样留着。
fn resolve_plugin(p: &str, profile_dir: &Path) -> String {
    if p.starts_with("file://") || p.contains("://") {
        return p.to_string();
    }
    let path = Path::new(p);
    if path.is_absolute() {
        return file_url(path);
    }
    let name = path.file_name().map(|n| n.to_owned()).unwrap_or_default();
    file_url(&profile_dir.join("plugins").join(name))
}

/// 路径 → `file://` URL，**要百分号编码**（官方用的是 Node 的 `pathToFileURL`）。
///
/// 我们的数据目录在 `~/Library/Application Support/` 下，带空格；不编码的话
/// opencode 按 URL 解析插件路径会找不到文件，而插件加载失败只是一行日志 ——
/// agent 照样能跑，只是少了语言注入、防打转这些行为。
pub fn file_url(p: &Path) -> String {
    let s = p.to_string_lossy().replace('\\', "/");
    let mut out = String::from(if s.starts_with('/') {
        "file://"
    } else {
        "file:///"
    });
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || b"-._~/!$&'()*+,;=:@".contains(&b) {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

/// 让 opencode 以为插件依赖已经装好，不去在线 `npm install`。
///
/// 照官方 `ensureOpenCodeDependencySatisfied`：往配置目录和
/// `$XDG_CONFIG_HOME/opencode` 各写一份 package.json / package-lock.json /
/// `.npmrc`（`offline=true`）+ 空的 `node_modules/`。**不写的话**第一次启动会
/// 卡在后台依赖安装上（离线或慢网时是好几分钟没有任何输出）。
pub fn write_dependency_markers(dir: &Path) -> Result<()> {
    std::fs::create_dir_all(dir.join("node_modules"))?;
    let deps = json!({ "@opencode-ai/plugin": PLUGIN_RUNTIME_VERSION });
    let pkg = json!({ "name": "hilo-opencode-config", "private": true, "dependencies": deps });
    let lock = json!({
        "name": "hilo-opencode-config",
        "lockfileVersion": 3,
        "requires": true,
        "packages": { "": { "name": "hilo-opencode-config", "dependencies": deps } },
    });
    std::fs::write(
        dir.join("package.json"),
        format!("{}\n", serde_json::to_string_pretty(&pkg)?),
    )?;
    std::fs::write(
        dir.join("package-lock.json"),
        format!("{}\n", serde_json::to_string_pretty(&lock)?),
    )?;
    std::fs::write(
        dir.join(".npmrc"),
        "# Scopes OpenCode internal installs for THIS directory to the local cache;\n\
         # never set npm_config_offline in the process env (it leaks to agent commands).\n\
         offline=true\n",
    )?;
    Ok(())
}

/// 配置写成临时文件（0600），经 `OPENCODE_CONFIG` 传 —— 不用 `OPENCODE_CONFIG_CONTENT`：
/// 里面有 api_key，放环境变量会出现在进程列表和崩溃转储里。
pub fn write_config_file(config: &Value) -> Result<PathBuf> {
    let path = std::env::temp_dir().join(format!(
        "ov-opencode-config-{}-{}.json",
        std::process::id(),
        uuid::Uuid::new_v4()
    ));
    std::fs::write(&path, serde_json::to_vec(config)?)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600))?;
    }
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn platform() -> Platform {
        Platform {
            base_url: "https://maas.example/v1".into(),
            api_key: "sk-x".into(),
            chat_model: "qwen3".into(),
        }
    }

    #[test]
    fn file_urls_are_percent_encoded_like_path_to_file_url() {
        assert_eq!(
            file_url(Path::new("/Users/a/Library/Application Support/ov/x.ts")),
            "file:///Users/a/Library/Application%20Support/ov/x.ts"
        );
        assert_eq!(
            file_url(Path::new("/tmp/蒜狸/p.js")),
            "file:///tmp/%E8%92%9C%E7%8B%B8/p.js"
        );
    }

    #[test]
    fn builds_like_the_official_custom_model_path() {
        let d = tempfile::tempdir().unwrap();
        std::fs::write(
            d.path().join("base.json"),
            r#"{"default_agent":"media-agent","small_model":"x/y",
                "agent":{"media-agent":{"model":"cloud/m","mode":"primary"}},
                "mcp":{"hub":{"type":"local","command":["node","../mcp-tools/dist/main.js"],
                       "environment":{"GATEWAY_URL":"http://localhost:8001"}}},
                "plugin":[".opencode-v2/plugins/session-header.ts"]}"#,
        )
        .unwrap();
        std::fs::write(
            d.path().join("base.domestic.json"),
            r#"{"experimental":{"mcp_timeout":1}}"#,
        )
        .unwrap();

        let mut env = Map::new();
        env.insert("GATEWAY_URL".into(), json!("http://127.0.0.1:8100"));
        let cfg = build(Inputs {
            profile_dir: d.path(),
            region: "domestic",
            platform: &platform(),
            mcp: McpLaunch {
                command: vec!["node".into(), "/opt/mcp/main.js".into()],
                environment: env,
            },
            extra_plugins: vec![PathBuf::from("/opt/ov/ovhilo.ts")],
            skills_paths: vec![],
        })
        .unwrap();

        assert_eq!(cfg["model"], "user-custom-maas/qwen3");
        assert_eq!(
            cfg["provider"]["user-custom-maas"]["npm"],
            "@ai-sdk/openai-compatible"
        );
        assert!(
            cfg["agent"]["media-agent"].get("model").is_none(),
            "agent 的云端模型要删掉"
        );
        assert!(cfg.get("small_model").is_none());
        assert_eq!(
            cfg["permission"]["external_directory"], "allow",
            "知识库在工作区外，不能 ask"
        );
        assert_eq!(cfg["compaction"]["reserved"], 40_000);
        assert_eq!(cfg["experimental"]["mcp_timeout"], 1, "region 层覆盖 base");
        assert_eq!(cfg["mcp"]["hub"]["command"][1], "/opt/mcp/main.js");
        assert_eq!(
            cfg["mcp"]["hub"]["environment"]["GATEWAY_URL"],
            "http://127.0.0.1:8100"
        );
        let plugins: Vec<&str> = cfg["plugin"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .collect();
        assert!(
            plugins[0].starts_with("file://") && plugins[0].ends_with("/plugins/session-header.ts")
        );
        assert_eq!(plugins[1], "file:///opt/ov/ovhilo.ts");
    }
}
