//! 升级检查。`GET /api/update/check`
//!
//! 两层间接，和发布端（`scripts/release.py`）对齐：
//!
//! ```text
//! <base>/manifest.json         → { targets: { "<target>": { status, latestUrls } } }
//! <base>/<target>/latest.json  → { version, url, sha256, size }
//! ```
//!
//! 只**检查**，不下载不安装 —— 下载和安装要能在后台跑、下完再切，那是另一件事。

use std::sync::Arc;

use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use serde_json::{Value, json};

use crate::AppState;

/// 清单地址。可以用环境变量覆盖 —— 私有化部署各自指向自己的桶，
/// 不用改代码重新打包。
///
/// 默认指向 GitHub Release 的固定 tag `manifest`。CDN 的桶开了之后不用换这个
/// 地址：往清单的 `latestUrls` 里加源就行，下面本来就是按顺序试所有源。
const DEFAULT_MANIFEST: &str =
    "https://github.com/reputationly/ovaijisuandesign/releases/download/manifest/manifest.json";

fn manifest_url() -> String {
    std::env::var("OVAIJISUAN_MANIFEST_URL").unwrap_or_else(|_| DEFAULT_MANIFEST.to_string())
}

/// 当前机器的目标标识。必须和 `scripts/release.py` 的 `host_target()` 一致 ——
/// 对不上的话清单里永远查不到自己这一档，表现是"永远没有更新"。
pub fn host_target() -> String {
    let os = match std::env::consts::OS {
        "macos" => "darwin",
        "windows" => "win32",
        other => other,
    };
    let arch = match std::env::consts::ARCH {
        "aarch64" => "arm64",
        "x86_64" => "x64",
        other => other,
    };
    format!("{os}-{arch}")
}

#[derive(Debug, Deserialize)]
struct Manifest {
    #[serde(default)]
    targets: std::collections::BTreeMap<String, Target>,
}

#[derive(Debug, Deserialize)]
struct Target {
    #[serde(default)]
    status: String,
    /// 文件里是驼峰 `latestUrls`。漏了这个 rename 会永远解析成空表，
    /// 表现是"清单里没有可用的源"，而清单本身是对的。
    #[serde(default, rename = "latestUrls")]
    latest_urls: std::collections::BTreeMap<String, String>,
}

#[derive(Debug, Deserialize)]
struct Latest {
    #[serde(default)]
    version: String,
    #[serde(default)]
    url: String,
    #[serde(default)]
    sha256: String,
    #[serde(default)]
    size: u64,
}

/// 逐段比较版本号，返回远端是否更新。
///
/// **必须逐段短路**。写成"主版本大 或 次版本大 或 修订大"那种独立判断的话，
/// 远端 `1.1.9` 对本地 `1.2.0` 会在修订号那一段命中，把**降级当成升级**
/// 推出去 —— 而用户看到的是"有新版本"，装完版本号反而变小了。
///
/// 缺省段按 0 处理，所以 `1.2` 和 `1.2.0` 等价。非数字段按 0 —— 我们自己的
/// 版本号是纯数字，遇到别的形态宁可判成"不需要更新"，也不要瞎猜。
pub fn is_newer(remote: &str, local: &str) -> bool {
    let seg = |v: &str| -> Vec<u64> {
        v.split('.')
            .map(|p| p.trim().parse::<u64>().unwrap_or(0))
            .collect()
    };
    let (r, l) = (seg(remote), seg(local));
    for i in 0..r.len().max(l.len()) {
        let (a, b) = (
            r.get(i).copied().unwrap_or(0),
            l.get(i).copied().unwrap_or(0),
        );
        if a != b {
            return a > b;
        }
    }
    false
}

const TIMEOUT: std::time::Duration = std::time::Duration::from_secs(10);

pub async fn check(State(state): State<Arc<AppState>>) -> Json<Value> {
    let current = env!("CARGO_PKG_VERSION");
    let target = host_target();

    // **网络不可达一律降级成"已是最新"，不回 5xx。**
    // 这个接口会被界面在后台静默轮询：回 500 的话前端拿到的 body 是错误对象，
    // 读 `needUpdate` 会再触发一次异常 —— 一个断网变成两个报错。
    // `reachable: false` 让调用方能区分"没更新"和"没查到"。
    let unreachable = |why: String| {
        tracing::debug!("升级检查失败: {why}");
        Json(json!({
            "ok": true,
            "current": current,
            "target": target,
            "needUpdate": false,
            "reachable": false,
            "reason": why,
        }))
    };

    let manifest: Manifest = match fetch(&state.client, &manifest_url()).await {
        Ok(m) => m,
        Err(e) => return unreachable(e),
    };

    let Some(entry) = manifest.targets.get(&target) else {
        // 清单里没有这一档 —— 可能是新平台还没发布。如实说，不要当成"已是最新"。
        return unreachable(format!("清单里没有 {target} 这一档"));
    };
    if entry.status != "published" {
        return unreachable(format!("{target} 的状态是 {}", entry.status));
    }

    // 多个源按顺序试。任何一个能读到就行 —— 两个源本来就是为了互为备份，
    // 只试第一个的话它挂了就等于没有备份。
    let mut last_err = "清单里没有可用的源".to_string();
    for (name, url) in &entry.latest_urls {
        match fetch::<Latest>(&state.client, url).await {
            Ok(latest) if !latest.version.is_empty() => {
                let need = is_newer(&latest.version, current);
                return Json(json!({
                    "ok": true,
                    "current": current,
                    "target": target,
                    "latest": latest.version,
                    "needUpdate": need,
                    "reachable": true,
                    "source": name,
                    "url": latest.url,
                    "sha256": latest.sha256,
                    "size": latest.size,
                }));
            }
            Ok(_) => last_err = format!("{name} 的 latest.json 里没有 version"),
            Err(e) => last_err = format!("{name}: {e}"),
        }
    }
    unreachable(last_err)
}

async fn fetch<T: for<'de> Deserialize<'de>>(
    client: &reqwest::Client,
    url: &str,
) -> Result<T, String> {
    let resp = client
        .get(url)
        .timeout(TIMEOUT)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    resp.json::<T>().await.map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compares_segment_by_segment_and_short_circuits() {
        // 这一条是重点：写成"主版本大 或 次版本大 或 修订大"的话，
        // 远端 1.1.9 对本地 1.2.0 会在修订号那段命中，把降级当升级推出去。
        assert!(!is_newer("1.1.9", "1.2.0"), "1.1.9 比 1.2.0 旧");
        assert!(is_newer("1.2.0", "1.1.9"));
        assert!(is_newer("2.0.0", "1.9.9"));
        assert!(!is_newer("1.9.9", "2.0.0"));
    }

    #[test]
    fn equal_versions_do_not_prompt() {
        assert!(!is_newer("0.1.0", "0.1.0"));
        // 缺省段按 0：1.2 和 1.2.0 等价，不该提示更新。
        assert!(!is_newer("1.2", "1.2.0"));
        assert!(!is_newer("1.2.0", "1.2"));
    }

    #[test]
    fn a_fourth_segment_still_counts() {
        // 发定制迭代时会用到第四段。忽略它的话，热修发出去用户收不到。
        assert!(is_newer("1.2.0.1", "1.2.0"));
        assert!(!is_newer("1.2.0", "1.2.0.1"));
    }

    #[test]
    fn junk_segments_do_not_trigger_an_update() {
        // 宁可判成"不需要更新"，也不要因为解析不了就瞎猜。
        assert!(!is_newer("abc", "0.1.0"));
        assert!(!is_newer("1.x.0", "1.0.0"));
    }

    #[test]
    fn the_host_target_matches_the_release_script() {
        // 对不上的话清单里永远查不到自己这一档，表现是"永远没有更新"。
        let t = host_target();
        assert!(
            t.starts_with("darwin-") || t.starts_with("win32-") || t.starts_with("linux-"),
            "{t}"
        );
        assert!(t.ends_with("-arm64") || t.ends_with("-x64"), "{t}");
    }

    #[test]
    fn parses_the_manifest_shape_release_py_writes() {
        let m: Manifest = serde_json::from_str(
            r#"{"schemaVersion":1,"targets":{"darwin-arm64":{"status":"published",
                "latestUrls":{"obs":"https://o/x/latest.json","r2":"https://r/x/latest.json"}}}}"#,
        )
        .unwrap();
        let t = &m.targets["darwin-arm64"];
        assert_eq!(t.status, "published");
        assert_eq!(t.latest_urls.len(), 2);
    }

    #[test]
    fn parses_the_latest_shape_release_py_writes() {
        let l: Latest = serde_json::from_str(
            r#"{"version":"0.2.0","url":"https://x/abc.tar.gz","sha256":"abc",
                "size":123,"releasedAt":"2026-09-09T00:00:00Z"}"#,
        )
        .unwrap();
        assert_eq!(l.version, "0.2.0");
        assert_eq!(l.size, 123);
    }
}
