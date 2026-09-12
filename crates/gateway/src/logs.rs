//! 日志文件。`GET /api/system/logs`、`POST /api/system/logs/open`。
//!
//! ## 为什么要有
//!
//! 在此之前 `tracing` 只写 stdout。开发时跑在终端里看得见，**而打包成 .app
//! 之后 stdout 没有任何地方接** —— 用户遇到问题时，我们能拿到的只有一句
//! "它不工作"。gateway 里那些 `tracing::warn!`（资产索引写盘失败、贴纸移到
//! 废纸篓失败、平台返回了看不懂的形状）全都进了虚空。
//!
//! 官方设置里有 `settings.logDirectory` =「日志目录」/「打开应用日志存储的
//! 文件夹」,做的就是这件事。

use std::path::PathBuf;
use std::sync::Arc;

use axum::Json;
use axum::extract::State;
use serde_json::{Value, json};

use crate::AppState;

/// 日志目录。和 `config.json` 放在同一个应用数据目录下。
///
/// **不放工作区。** 工作区是用户的创作内容，会被同步、备份、整个拷到别的
/// 机器上 —— 日志混在里面既是噪声，也可能把路径之类的本机信息带出去。
pub fn dir() -> Option<PathBuf> {
    crate::config::Config::default_path()
        .ok()
        .and_then(|p| p.parent().map(|d| d.join("logs")))
}

/// 最新的那份日志文件。
///
/// **不能直接拼 `ovaijisuandesign.log`。** 按天滚动的写法会给文件名加日期
/// 后缀（`ovaijisuandesign.log.2026-09-11`），那个不带后缀的名字从来不存在 ——
/// 我第一版就是硬拼的，接口上报的 `exists` 永远是 false，而日志其实写得
/// 好好的。用户看到"还没有日志"会去查一个根本不存在的问题。
pub fn latest() -> Option<PathBuf> {
    newest_in(&dir()?)
}

/// 目录里最新的那份日志。抽出来是为了能测 —— `dir()` 依赖真实的用户目录。
fn newest_in(d: &std::path::Path) -> Option<PathBuf> {
    let mut best: Option<(std::time::SystemTime, PathBuf)> = None;
    for entry in std::fs::read_dir(d).ok()?.flatten() {
        let path = entry.path();
        let Some(name) = path.file_name() else {
            continue;
        };
        if !name.to_string_lossy().starts_with(LOG_PREFIX) {
            continue;
        }
        let when = entry.metadata().ok().and_then(|m| m.modified().ok());
        let Some(when) = when else { continue };
        if best.as_ref().is_none_or(|(b, _)| when > *b) {
            best = Some((when, path));
        }
    }
    best.map(|(_, p)| p)
}

/// 日志文件名的前缀。`tracing-appender` 会在后面接 `.YYYY-MM-DD`。
/// **和 `main.rs` 里传给 `rolling::daily` 的那个必须一致。**
pub const LOG_PREFIX: &str = "ovaijisuandesign.log";

pub async fn get(State(_state): State<Arc<AppState>>) -> Json<Value> {
    let d = dir();
    let f = latest();
    Json(json!({
        "dir": d.as_ref().map(|p| p.to_string_lossy()),
        "file": f.as_ref().map(|p| p.to_string_lossy().into_owned()),
        // 有没有真的写出来。**要报这个** —— 只给一个路径的话，用户点开
        // 发现是空文件夹会以为按钮坏了，而真实原因可能是建目录失败。
        "exists": f.is_some(),
    }))
}

/// 在系统文件管理器里打开日志目录。
pub async fn open(State(_state): State<Arc<AppState>>) -> Json<Value> {
    let Some(d) = dir() else {
        return Json(json!({ "ok": false, "error": "定位不到日志目录" }));
    };
    // 目录可能还不存在（刚装上、一条日志都没写过）。**先建再打开** ——
    // 直接 open 一个不存在的路径在 macOS 上什么都不会发生，也不报错。
    if let Err(err) = std::fs::create_dir_all(&d) {
        return Json(json!({ "ok": false, "error": format!("建目录失败: {err}") }));
    }
    match reveal_in_file_manager(&d) {
        Ok(()) => Json(json!({ "ok": true, "dir": d.to_string_lossy() })),
        Err(err) => Json(json!({ "ok": false, "error": err.to_string() })),
    }
}

/// 在访达 / 资源管理器里打开一个目录。skill 那边也用这个。
pub fn reveal_in_file_manager(path: &std::path::Path) -> std::io::Result<()> {
    #[cfg(target_os = "macos")]
    let mut cmd = std::process::Command::new("open");
    #[cfg(target_os = "windows")]
    let mut cmd = std::process::Command::new("explorer");
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let mut cmd = std::process::Command::new("xdg-open");

    // `spawn` 不是 `status()`：文件管理器是个长命进程，等它退出等于卡死
    // 这个请求，直到用户关掉访达窗口。
    cmd.arg(path).spawn().map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 日志文件名带日期后缀，`latest()` 必须认这个形状。
    ///
    /// 第一版这里是硬拼 `ovaijisuandesign.log` —— 那个名字**从来不存在**,
    /// 于是接口上报的 `exists` 永远是 false，而日志其实写得好好的。
    /// 用户看到"还没有日志"会去查一个根本不存在的问题。
    #[test]
    fn latest_picks_the_newest_rotated_file() {
        let d = tempfile::tempdir().unwrap();
        let root = d.path();

        let old = root.join(format!("{LOG_PREFIX}.2026-09-10"));
        let new = root.join(format!("{LOG_PREFIX}.2026-09-11"));
        std::fs::write(&old, "旧").unwrap();
        // 修改时间要真的拉开，不然同一毫秒写的两个文件比不出先后。
        std::thread::sleep(std::time::Duration::from_millis(20));
        std::fs::write(&new, "新").unwrap();
        // 不相干的文件不能被选中。
        std::fs::write(root.join("config.json"), "{}").unwrap();

        let picked = newest_in(root);
        assert_eq!(picked.as_deref(), Some(new.as_path()));
    }

    #[test]
    fn an_empty_directory_has_no_log() {
        let d = tempfile::tempdir().unwrap();
        assert!(newest_in(d.path()).is_none());
    }
}
