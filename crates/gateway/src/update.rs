//! 检查、下载、安装。换文件那一层在 [`crate::install`]。
//!
//! 清单是两层间接，和发布端（`scripts/release.py`）对齐：
//!
//! ```text
//! <base>/manifest.json         → { targets: { "<target>": { status, latestUrls } } }
//! <base>/<target>/latest.json  → { version, url, sha256, size }
//! ```
//!
//! ```text
//! GET  /api/update/check      查有没有新版（不改任何状态）
//! POST /api/update/download   开始后台下载 + 校验 + 解包，立刻返回
//! GET  /api/update/status     进度
//! POST /api/update/apply      把解好的换进程序目录
//! ```
//!
//! **下载不占住调用方。** `download` 起一个后台任务就返回，进度靠轮询
//! `status` —— 官方那套 ComfyUI 后端也是这么分的（入口秒回，worker 干活），
//! 理由一样：装的过程可能好几分钟，占住 HTTP 连接会让界面看起来卡死。
//!
//! **`apply` 之后不自动重启。** 想过，放弃了：旧进程还占着端口，新进程起来
//! 会绑定失败；要正确交接得再引一个中间进程等端口释放。对一个本地工具来说
//! 不成比例 —— 如实返回"需要重启"，让人自己重启。

use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::Deserialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};

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
    let current = crate::VERSION;
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

// ==================== 下载 / 安装 ====================

/// 升级到哪一步了。**存在内存里，进程重启就回 Idle** —— 这是对的：
/// 重启之后 staging 目录还在，但我们无从知道它是不是完整的（可能正是下载
/// 到一半被杀掉的），重下一遍比猜安全。
#[derive(Debug, Clone, Default, serde::Serialize)]
#[serde(tag = "state", rename_all = "camelCase")]
pub enum Phase {
    #[default]
    Idle,
    Downloading {
        version: String,
        done: u64,
        total: u64,
    },
    Verifying {
        version: String,
    },
    /// 已经下好、校验过、解开了，就等 `apply`。
    Staged {
        version: String,
    },
    /// 换完了，**需要重启**。
    Applied {
        version: String,
    },
    Failed {
        at: String,
        error: String,
    },
}

#[derive(Default)]
pub struct Updater {
    phase: Mutex<Phase>,
}

impl Updater {
    pub fn new() -> Self {
        Self::default()
    }
    fn set(&self, p: Phase) {
        *self.phase.lock().unwrap() = p;
    }
    fn get(&self) -> Phase {
        self.phase.lock().unwrap().clone()
    }
    /// 现在能不能开始一次新的下载。返回 `Err(理由)` 就是不能。
    ///
    /// **`Applied` 之后必须拒绝。** 那时磁盘上已经是新版、跑着的还是旧版，
    /// 唯一正确的下一步是重启。放行的话有两个后果，都不可逆：
    ///
    /// - 状态被重置，"需要重启"这个提示消失，用户不知道自己该重启；
    /// - 再 apply 一次会拿**刚换上去的**那份去覆盖 `.old`，
    ///   于是原来那个能用的版本被丢掉，出问题时没得退。
    fn can_start(&self) -> Result<(), &'static str> {
        match self.get() {
            Phase::Downloading { .. } | Phase::Verifying { .. } => Err("已经在下载了"),
            Phase::Applied { .. } => Err("新版本已装好，请先重启"),
            _ => Ok(()),
        }
    }
}

/// staging 和退役目录都放在程序目录**旁边**，不放系统临时目录 ——
/// 换文件靠 rename，跨文件系统的 rename 会失败（Linux 上 /tmp 常是 tmpfs）。
fn staging_dir(live: &Path) -> PathBuf {
    live.join(".update")
}
fn retired_dir(live: &Path) -> PathBuf {
    live.join(".old")
}

pub async fn status(State(state): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({ "ok": true, "current": crate::VERSION, "phase": state.updater.get() }))
}

#[derive(Debug, Deserialize)]
pub struct DownloadReq {
    /// 包地址和校验和。**由调用方从 `check` 的结果原样带过来** ——
    /// 不在这里重新查一遍清单：两次查之间清单可能翻了版本，
    /// 于是用户点的是 A，装上的是 B。
    pub url: String,
    pub sha256: String,
    pub version: String,
    #[serde(default)]
    pub size: u64,
}

pub async fn download(
    State(state): State<Arc<AppState>>,
    Json(req): Json<DownloadReq>,
) -> (StatusCode, Json<Value>) {
    if let Err(why) = state.updater.can_start() {
        return (
            StatusCode::CONFLICT,
            Json(json!({ "ok": false, "error": why })),
        );
    }
    if req.sha256.len() != 64 || !req.sha256.chars().all(|c| c.is_ascii_hexdigit()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "sha256 不是 64 位十六进制" })),
        );
    }
    // 只认 https。允许 http 的话，一个能改 DNS 的人就能把包换掉 ——
    // 而 sha256 是从同一个响应链路上拿的，挡不住。
    if !req.url.starts_with("https://") {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "包地址必须是 https" })),
        );
    }

    let st = state.clone();
    let v = req.version.clone();
    tokio::spawn(async move {
        if let Err(e) = run_download(&st, req).await {
            tracing::error!("下载升级包失败: {e:#}");
            st.updater.set(Phase::Failed {
                at: "download".into(),
                error: format!("{e:#}"),
            });
        }
    });
    (
        StatusCode::ACCEPTED,
        Json(json!({ "ok": true, "version": v })),
    )
}

async fn run_download(state: &Arc<AppState>, req: DownloadReq) -> anyhow::Result<()> {
    use anyhow::Context as _;
    use tokio::io::AsyncWriteExt as _;

    let live = crate::install::program_dir()?;
    let staging = staging_dir(&live);
    // 每次从头来：上一次留下的半成品混进去会解出一个新旧掺杂的目录，
    // 而 validate 只看结构、看不出来。
    let _ = std::fs::remove_dir_all(&staging);
    std::fs::create_dir_all(&staging).context("建不了 staging 目录")?;

    state.updater.set(Phase::Downloading {
        version: req.version.clone(),
        done: 0,
        total: req.size,
    });

    let resp = state
        .client
        .get(&req.url)
        .send()
        .await
        .context("发起下载失败")?;
    if !resp.status().is_success() {
        anyhow::bail!("下载返回 HTTP {}", resp.status());
    }
    let total = resp.content_length().unwrap_or(req.size);

    let tmp = staging.join("bundle.tar.gz");
    let mut file = tokio::fs::File::create(&tmp)
        .await
        .context("建不了临时文件")?;
    let mut hasher = Sha256::new();
    let mut done = 0u64;
    let mut stream = resp;
    while let Some(chunk) = stream.chunk().await.context("下载中断")? {
        hasher.update(&chunk);
        file.write_all(&chunk).await.context("写盘失败")?;
        done += chunk.len() as u64;
        state.updater.set(Phase::Downloading {
            version: req.version.clone(),
            done,
            total,
        });
    }
    file.flush().await?;
    drop(file);

    state.updater.set(Phase::Verifying {
        version: req.version.clone(),
    });
    let got = format!("{:x}", hasher.finalize());
    if got != req.sha256.to_ascii_lowercase() {
        // **不要留着这个包。** 留着的话下次点升级可能直接用了它。
        let _ = std::fs::remove_dir_all(&staging);
        anyhow::bail!("校验和对不上：期望 {}，实际 {got}", req.sha256);
    }

    // 解包放在阻塞线程池：tar + gzip 是纯 CPU/IO，在异步 worker 上跑会把
    // 整个运行时卡住几秒，表现是升级期间界面所有请求都没响应。
    let staging2 = staging.clone();
    tokio::task::spawn_blocking(move || unpack(&staging2.join("bundle.tar.gz"), &staging2))
        .await
        .context("解包任务崩了")??;
    let _ = std::fs::remove_file(&tmp);

    crate::install::validate(&staging).context("包的结构不对")?;
    state.updater.set(Phase::Staged {
        version: req.version,
    });
    Ok(())
}

/// 解 tar.gz 到 `dest`。
///
/// **逐个 entry 检查路径**，不直接 `unpack`：包里如果有 `../` 或绝对路径，
/// 会写到 staging 目录外面去。tar crate 本身有防护，但这是"写错了会被人利用"
/// 的地方，值得自己再挡一道，而且报错能说清是哪一条。
fn unpack(archive: &Path, dest: &Path) -> anyhow::Result<()> {
    use std::path::Component;

    let f = std::fs::File::open(archive)?;
    let mut ar = tar::Archive::new(flate2::read::GzDecoder::new(f));
    ar.set_preserve_permissions(true);
    for entry in ar.entries()? {
        let mut entry = entry?;
        let path = entry.path()?.into_owned();
        if path.components().any(|c| {
            matches!(
                c,
                Component::ParentDir | Component::RootDir | Component::Prefix(_)
            )
        }) {
            anyhow::bail!("包里有越界路径: {}", path.display());
        }
        entry.unpack_in(dest)?;
    }
    Ok(())
}

pub async fn apply(State(state): State<Arc<AppState>>) -> (StatusCode, Json<Value>) {
    // 只有 Staged 能 apply。已经 Applied 再来一次会拿刚换上去的那份覆盖 `.old`，
    // 把原来能用的版本丢掉。
    let Phase::Staged { version } = state.updater.get() else {
        return (
            StatusCode::CONFLICT,
            Json(json!({ "ok": false, "error": "还没有下载好的版本" })),
        );
    };
    let live = match crate::install::program_dir() {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "ok": false, "error": e.to_string() })),
            );
        }
    };
    match crate::install::swap(&live, &staging_dir(&live), &retired_dir(&live)) {
        Ok(()) => {
            let _ = std::fs::remove_dir_all(staging_dir(&live));
            state.updater.set(Phase::Applied {
                version: version.clone(),
            });
            tracing::info!("已换到 {version}，重启后生效");
            (
                StatusCode::OK,
                json!({ "ok": true, "version": version, "restartRequired": true }).into(),
            )
        }
        Err(e) => {
            state.updater.set(Phase::Failed {
                at: "apply".into(),
                error: format!("{e:#}"),
            });
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "ok": false, "error": format!("{e:#}") })),
            )
        }
    }
}

/// 启动时清理上一次升级的残留。见 [`crate::install::cleanup`]。
pub fn cleanup_on_start() {
    if let Ok(live) = crate::install::program_dir() {
        crate::install::cleanup(&retired_dir(&live));
    }
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

    // ---------- 下载 / 解包 ----------

    fn targz(entries: &[(&str, &[u8])]) -> Vec<u8> {
        let mut ar = tar::Builder::new(Vec::new());
        for (name, data) in entries {
            let mut h = tar::Header::new_gnu();
            h.set_size(data.len() as u64);
            h.set_mode(0o755);
            h.set_cksum();
            ar.append_data(&mut h, name, *data).unwrap();
        }
        let tar = ar.into_inner().unwrap();
        use std::io::Write as _;
        let mut z = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::fast());
        z.write_all(&tar).unwrap();
        z.finish().unwrap()
    }

    /// 造一个带恶意路径的包。
    ///
    /// 不能用 `tar::Builder::append_data` —— 它自己就拒绝相对路径逃逸和绝对
    /// 路径（"paths in archives must be relative"）。要测我们的防护，只能
    /// 绕过它直接往头的 name 字段里写字节。
    fn evil_targz(name: &str, data: &[u8]) -> Vec<u8> {
        use std::io::Write as _;
        let mut h = tar::Header::new_gnu();
        h.set_size(data.len() as u64);
        h.set_mode(0o644);
        h.set_entry_type(tar::EntryType::Regular);
        {
            let old = h.as_old_mut();
            old.name[..name.len()].copy_from_slice(name.as_bytes());
        }
        h.set_cksum();

        let mut tar = Vec::new();
        tar.extend_from_slice(h.as_bytes());
        tar.extend_from_slice(data);
        tar.resize(tar.len().div_ceil(512) * 512, 0);
        tar.extend_from_slice(&[0u8; 1024]); // 结束块
        let mut z = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::fast());
        z.write_all(&tar).unwrap();
        z.finish().unwrap()
    }

    #[test]
    fn unpack_rejects_paths_that_escape_the_staging_dir() {
        // 包里带 `../` 就能写到 staging 外面去 —— 那是程序目录本身。
        // tar crate 自己有防护，但这是"写错了会被人利用"的地方，自己再挡一道。
        let t = tempfile::tempdir().unwrap();
        let a = t.path().join("x.tar.gz");
        std::fs::write(&a, evil_targz("../evil", b"pwned")).unwrap();
        let err = unpack(&a, t.path()).unwrap_err().to_string();
        assert!(err.contains("越界路径"), "{err}");
        assert!(!t.path().parent().unwrap().join("evil").exists());
    }

    #[test]
    fn unpack_rejects_absolute_paths() {
        let t = tempfile::tempdir().unwrap();
        let a = t.path().join("x.tar.gz");
        std::fs::write(&a, evil_targz("/etc/evil", b"pwned")).unwrap();
        assert!(
            unpack(&a, t.path())
                .unwrap_err()
                .to_string()
                .contains("越界路径")
        );
    }

    #[test]
    fn unpack_writes_normal_entries() {
        let t = tempfile::tempdir().unwrap();
        let a = t.path().join("x.tar.gz");
        std::fs::write(
            &a,
            targz(&[("ovgw", b"bin"), ("web/index.html", b"<html>")]),
        )
        .unwrap();
        unpack(&a, t.path()).unwrap();
        assert_eq!(
            std::fs::read_to_string(t.path().join("ovgw")).unwrap(),
            "bin"
        );
        assert_eq!(
            std::fs::read_to_string(t.path().join("web/index.html")).unwrap(),
            "<html>"
        );
    }

    #[tokio::test]
    async fn download_rejects_a_bad_digest_before_doing_anything() {
        let (st, _d) = super::super::tests::state_with_dir();
        let r = download(
            State(st.clone()),
            Json(DownloadReq {
                url: "https://example.invalid/x.tar.gz".into(),
                sha256: "不是十六进制".into(),
                version: "9.9.9".into(),
                size: 1,
            }),
        )
        .await;
        assert_eq!(r.0, StatusCode::BAD_REQUEST);
        assert!(matches!(st.updater.get(), Phase::Idle), "状态不该被动过");
    }

    #[tokio::test]
    async fn download_refuses_plain_http() {
        // sha256 是从同一条链路上拿的，挡不住能改 DNS 的人。
        let (st, _d) = super::super::tests::state_with_dir();
        let r = download(
            State(st),
            Json(DownloadReq {
                url: "http://example.invalid/x.tar.gz".into(),
                sha256: "a".repeat(64),
                version: "9.9.9".into(),
                size: 1,
            }),
        )
        .await;
        assert_eq!(r.0, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn apply_without_a_staged_version_is_a_conflict_not_a_crash() {
        let (st, _d) = super::super::tests::state_with_dir();
        let r = apply(State(st)).await;
        assert_eq!(r.0, StatusCode::CONFLICT);
    }

    #[test]
    fn the_phase_serialises_the_way_the_frontend_reads_it() {
        // 前端按 `state` 分支。改了这里的 tag 名，界面会静默地一直显示"空闲"。
        let j = serde_json::to_value(Phase::Downloading {
            version: "1.2.3.4".into(),
            done: 5,
            total: 10,
        })
        .unwrap();
        assert_eq!(j["state"], "downloading");
        assert_eq!(j["done"], 5);
        assert_eq!(serde_json::to_value(Phase::Idle).unwrap()["state"], "idle");
        assert_eq!(
            serde_json::to_value(Phase::Staged {
                version: "1".into()
            })
            .unwrap()["state"],
            "staged"
        );
    }

    #[tokio::test]
    async fn a_second_download_is_refused_while_one_is_running() {
        let (st, _d) = super::super::tests::state_with_dir();
        st.updater.set(Phase::Downloading {
            version: "1".into(),
            done: 0,
            total: 1,
        });
        let r = download(State(st), Json(good_req())).await;
        assert_eq!(r.0, StatusCode::CONFLICT);
    }

    #[tokio::test]
    async fn after_applying_a_new_download_is_refused_until_restart() {
        // 放行的话：状态被重置，"需要重启"的提示消失；再 apply 一次会拿刚换
        // 上去的那份覆盖 .old，把原来能用的版本丢掉，出问题时没得退。
        let (st, _d) = super::super::tests::state_with_dir();
        st.updater.set(Phase::Applied {
            version: "3.0.12.9".into(),
        });
        let (code, body) = download(State(st.clone()), Json(good_req())).await;
        assert_eq!(code, StatusCode::CONFLICT);
        assert!(
            body.0["error"].as_str().unwrap().contains("重启"),
            "{body:?}"
        );
        assert!(
            matches!(st.updater.get(), Phase::Applied { .. }),
            "状态被冲掉了"
        );
    }

    #[tokio::test]
    async fn applying_twice_is_refused() {
        let (st, _d) = super::super::tests::state_with_dir();
        st.updater.set(Phase::Applied {
            version: "1".into(),
        });
        assert_eq!(apply(State(st)).await.0, StatusCode::CONFLICT);
    }

    fn good_req() -> DownloadReq {
        DownloadReq {
            url: "https://example.invalid/x.tar.gz".into(),
            sha256: "a".repeat(64),
            version: "9.9.9".into(),
            size: 1,
        }
    }
}
