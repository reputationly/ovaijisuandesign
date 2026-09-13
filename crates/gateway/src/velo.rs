//! Windows 的就地自升级（Velopack）。
//!
//! ## 为什么要另起一条路
//!
//! 我们原来那套（[`crate::update`] + [`crate::install`]）是**自己换文件**:
//! 下载 → 解包到 staging → 把程序目录整个换掉。它对 tar.gz 那种"进程和文件
//! 可分离"的形态成立，对**装好的应用**不成立 —— 一个正在运行的进程不能替换
//! 自己的可执行文件（Windows 上文件被锁，macOS 上被映射着）。
//!
//! `update.rs` 的注释里其实已经写出了症结：
//!
//! > `apply` 之后不自动重启。想过，放弃了：旧进程还占着端口，新进程起来会
//! > 绑定失败；要正确交接得**再引一个中间进程**等端口释放。
//!
//! Velopack 就是那个中间进程。它随包带一个独立的更新器
//! （Windows 上是 `Update.exe`），`wait_exit_then_apply_updates` 让它等主进程
//! 退出之后再替换文件、再把应用拉起来。官方 3.0.14 用的也是它
//! （包里能看到 `Contents/MacOS/UpdateMac` 和 `Resources/velopack-runtime`）。
//!
//! ## 只做 Windows
//!
//! macOS 上拖一下 dmg 的成本本来就低，而换成 Velopack 要把打包方式整个改掉。
//! 所以：**Windows 走 Velopack，macOS 保持 dmg，tar.gz 保持原来那套自换文件**。
//!
//! ## 没装成 Velopack 包时这里全是 no-op
//!
//! `cargo run`、tar.gz 解压跑、以及 macOS 的 .app —— 这些形态下
//! [`available`] 返回 false，调用方退回原来那条路。**不能在这里报错** ——
//! "没装成 Velopack 包"是正常情况，不是故障。

use std::sync::Arc;

use axum::Json;
use axum::extract::State;
use serde_json::{Value, json};

use crate::AppState;

/// 更新源。Velopack 要的是**它自己那份清单**(`RELEASES`),和我们
/// `scripts/release.py` 发的 `latest.json` 不是一回事 —— 两者并存，
/// 各走各的：Velopack 服务装好的 Windows 应用，`latest.json` 服务 tar.gz。
///
/// **只在 Windows 上存在。** 别的平台上标 `allow(dead_code)` 留着也行，
/// 但那是在说"这段代码没人用但先留着"—— 实际情况是"这段代码在这个平台上
/// 不该存在",cfg 说的才是真话。
#[cfg(target_os = "windows")]
fn feed_url() -> String {
    // 和 `update.rs` 的清单同源、不同子路径：那边是 `manifest.json`
    // （我们自己的两层清单），这边是 Velopack 自己那份 `RELEASES`。
    // 两套并存，各服务各的形态。
    if let Ok(v) = std::env::var("OVAIJISUAN_VELOPACK_URL") {
        return v;
    }
    let base = crate::update::manifest_url();
    // `…/manifest.json` → `…/velopack/win`
    let base = base
        .rsplit_once('/')
        .map(|(d, _)| d)
        .unwrap_or("")
        .to_string();
    format!("{base}/velopack/win")
}

/// 把 Velopack 的 3 段版本号还原成我们的 4 段。
///
/// # 为什么要还原
///
/// Velopack **只认 3 段 SemVer2**，而我们的版本号是 4 段（官方基线 3 段 +
/// 本仓迭代号）。发版时把后两段合成了一段：
///
/// ```text
/// 3.0.14.2  →  3.0.14002        PATCH * 1000 + BUILD
/// ```
///
/// 见 `.github/workflows/release.yml`。不还原的话，界面上的"发现新版本
/// 3.0.14002"和用户在关于页看到的 3.0.14.1 对不上 —— 像是两个不同的应用。
///
/// # 认不出就原样返回
///
/// 第三段小于 1000 的说明不是我们编码过的（比如手动传过 `3.0.1`），
/// 这时原样给回去。**猜错了显示一个不存在的版本号，比显示一个朴素的
/// 真值更糟**。
fn display_version(v: &str) -> String {
    let mut it = v.splitn(3, '.');
    let (Some(major), Some(minor), Some(rest)) = (it.next(), it.next(), it.next()) else {
        return v.to_string();
    };
    // 第三段后面可能还挂着 `-beta` 之类，只取数字前缀。
    let digits: String = rest.chars().take_while(char::is_ascii_digit).collect();
    let Ok(n) = digits.parse::<u64>() else {
        return v.to_string();
    };
    if n < 1000 {
        return v.to_string();
    }
    let suffix = &rest[digits.len()..];
    format!("{major}.{minor}.{}.{}{suffix}", n / 1000, n % 1000)
}

/// 这个进程是不是跑在 Velopack 装出来的包里。
///
/// 判据交给 velopack 自己（它找 `sq.version` / `Update.exe` 那一套），
/// 我们不去猜目录结构 —— 猜错的话表现是"更新按钮点了没反应"。
#[cfg(target_os = "windows")]
pub fn available() -> bool {
    // `FromCurrentExe` = "当前进程在应用的安装目录里"。文档明说
    // **没装的话返回 Err** —— 正是我们要的判据。
    //
    // 不要传 `VelopackLocatorConfig::default()`:它是另一个类型
    // （`LocationContext` 才对），而且 default 的语义是"全部路径留空",
    // 那会让它去找一个不存在的地方。
    velopack::locator::auto_locate_app_manifest(velopack::locator::LocationContext::FromCurrentExe)
        .is_ok()
}

#[cfg(not(target_os = "windows"))]
pub fn available() -> bool {
    false
}

#[cfg(target_os = "windows")]
fn manager() -> Result<velopack::UpdateManager, String> {
    velopack::UpdateManager::new(velopack::sources::HttpSource::new(feed_url()), None, None)
        .map_err(|e| e.to_string())
}

/// 查有没有新版。**不下载**。
#[cfg(target_os = "windows")]
pub async fn check(State(_state): State<Arc<AppState>>) -> Json<Value> {
    let mgr = match manager() {
        Ok(m) => m,
        Err(e) => return Json(json!({ "ok": false, "error": e })),
    };
    // 阻塞调用挪到 blocking 线程：它要走网络，占住 tokio 的 worker 会让
    // 整个 gateway 在这几秒里不响应。
    let res = tokio::task::spawn_blocking(move || mgr.check_for_updates()).await;
    match res {
        Ok(Ok(velopack::UpdateCheck::UpdateAvailable(info))) => Json(json!({
            "ok": true,
            "needUpdate": true,
            "latest": display_version(&info.TargetFullRelease.Version.to_string()),
        })),
        Ok(Ok(_)) => Json(json!({ "ok": true, "needUpdate": false })),
        Ok(Err(e)) => Json(json!({ "ok": false, "error": e.to_string() })),
        Err(e) => Json(json!({ "ok": false, "error": e.to_string() })),
    }
}

/// 下载 + 安装 + 重启。
///
/// **这三步在 Velopack 里是一个动作。** 我们原来那套分成 download / apply
/// 两步是因为"换文件"这一步要用户确认时机；Velopack 的
/// `wait_exit_then_apply_updates` 已经把时机处理好了 —— 它等这个进程退出
/// 才动手，所以不需要我们再切一刀。
#[cfg(target_os = "windows")]
pub async fn apply(State(_state): State<Arc<AppState>>) -> Json<Value> {
    let mgr = match manager() {
        Ok(m) => m,
        Err(e) => return Json(json!({ "ok": false, "error": e })),
    };
    let out = tokio::task::spawn_blocking(move || -> Result<String, String> {
        let info = match mgr.check_for_updates().map_err(|e| e.to_string())? {
            velopack::UpdateCheck::UpdateAvailable(i) => i,
            _ => return Err("没有可用的更新".into()),
        };
        let version = display_version(&info.TargetFullRelease.Version.to_string());
        mgr.download_updates(&info, None)
            .map_err(|e| e.to_string())?;
        // **不用 apply_updates_and_restart。** 那个会立刻杀掉当前进程 ——
        // 而我们还得先把这次 HTTP 响应发出去，否则界面上看到的是"请求断了",
        // 分不清是更新成功还是崩了。`wait_exit_then_apply` 只是把更新器
        // 支起来等着，主进程该怎么退还怎么退。
        mgr.wait_exit_then_apply_updates(
            &info.TargetFullRelease,
            false,
            true,
            Vec::<String>::new(),
        )
        .map_err(|e| e.to_string())?;
        Ok(version)
    })
    .await;
    match out {
        Ok(Ok(version)) => Json(json!({
            "ok": true,
            "version": version,
            // 更新器已经在等了，接下来要**主动退出**这个进程它才会动手。
            "exitRequired": true,
        })),
        Ok(Err(e)) => Json(json!({ "ok": false, "error": e })),
        Err(e) => Json(json!({ "ok": false, "error": e.to_string() })),
    }
}

// 非 Windows 上留同名的桩，路由表不用写 cfg。
#[cfg(not(target_os = "windows"))]
pub async fn check(State(_state): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({ "ok": false, "error": "这个形态不走 Velopack 更新" }))
}

#[cfg(not(target_os = "windows"))]
pub async fn apply(State(_state): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({ "ok": false, "error": "这个形态不走 Velopack 更新" }))
}

/// 界面问"这台机器上更新走哪条路"。
pub async fn mode(State(_state): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({
        "ok": true,
        // `velopack` = 就地自升级（装好的 Windows 应用）
        // `swap`     = 我们自己换文件（tar.gz）
        // `manual`   = 只能重新下载安装包（macOS 的 .app）
        "mode": if available() {
            "velopack"
        } else if cfg!(target_os = "macos") && in_app_bundle() {
            "manual"
        } else {
            "swap"
        },
    }))
}

/// 是不是跑在 macOS 的 .app 里。
///
/// **判据是可执行文件在 `Contents/MacOS/` 下**,不是"操作系统是 macOS"——
/// 同一台机器上 tar.gz 那份是能自升级的，混为一谈会把它也说成"只能手动"。
fn in_app_bundle() -> bool {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.ends_with("Contents/MacOS")))
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 非 Windows 上 `available()` 恒假 —— 调用方据此退回原来那条路。
    #[test]
    fn non_windows_never_claims_velopack() {
        if !cfg!(target_os = "windows") {
            assert!(!available());
        }
    }

    /// 4 段版本号要能从 Velopack 的 3 段还原回来。
    ///
    /// 不还原的话，"发现新版本 3.0.14002"和关于页的 3.0.14.1 对不上,
    /// 用户会以为是另一个应用。
    #[test]
    fn the_three_part_version_is_decoded_back_to_four() {
        assert_eq!(display_version("3.0.14002"), "3.0.14.2");
        assert_eq!(display_version("3.0.14001"), "3.0.14.1");
        assert_eq!(display_version("3.0.15001"), "3.0.15.1");
        // 迭代号到两位数也要对。
        assert_eq!(display_version("3.0.14012"), "3.0.14.12");
    }

    /// **认不出的原样返回。**
    ///
    /// 猜错了显示一个不存在的版本号，比显示一个朴素的真值更糟。
    #[test]
    fn an_unencoded_version_is_passed_through() {
        assert_eq!(display_version("3.0.1"), "3.0.1");
        assert_eq!(display_version("1.2"), "1.2");
        assert_eq!(display_version("not-a-version"), "not-a-version");
    }

    /// **`.app` 的判据是路径，不是操作系统。**
    ///
    /// 用 `cfg!(target_os = "macos")` 当判据的话，同一台 mac 上解压 tar.gz
    /// 跑的那份也会被说成"只能手动下载安装包"—— 而它恰恰是唯一能自升级的
    /// 形态。
    #[test]
    fn the_bundle_check_looks_at_the_path() {
        // 测试二进制在 target/debug/deps/ 下，不在 Contents/MacOS 里。
        assert!(!in_app_bundle());
    }
}
