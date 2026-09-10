//! 保持电脑唤醒。`GET /api/system/awake`、`POST /api/system/awake`
//!
//! 接了飞书/微信之后，这台机器是在**替你值班**：消息随时可能来，长连接
//! 断了就收不到。而 macOS 默认闲置十几分钟就睡 —— 睡下去之后发过去的
//! 消息不会报错，只是没人回，醒来才补上一堆。这个开关就是为了这个。
//!
//! ## 用 `keepawake` 而不是自己调
//!
//! 三个平台三套 API（IOKit 的 `IOPMAssertionCreateWithName`、Windows 的
//! `SetThreadExecutionState`、Linux 的 `org.freedesktop.login1.Inhibit`），
//! 每一套都有自己的坑 —— 尤其 Windows 那个是**线程局部**的，在临时线程上
//! 调完就失效，而失效的表现和没调一模一样。
//!
//! ## 和官方的对应
//!
//! 官方（Electron）是 `powerSaveBlocker.start("prevent-display-sleep")`，
//! 存在配置里的 `preventSleep`，启动时读回来。我们照搬这三点。
//!
//! Electron 的 `prevent-display-sleep` 在 macOS 上就是
//! `PreventUserIdleDisplaySleep`，在 Windows 上是
//! `ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED` —— 对应到这里是
//! `display(true) + idle(true)`。
//!
//! ## 失败要说出来，不能默默关掉
//!
//! 这个断言可能被系统拒（没权限、平台不支持）。失败了还显示"已开启"的话，
//! 用户会安心合上盖子出门，回来发现一晚上的消息全堆着。所以状态里带
//! `error`，界面照原样显示。

use std::sync::{Arc, Mutex};

use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use serde_json::{Value, json};

use crate::AppState;

/// 断言的名字。macOS 上 `pmset -g assertions` 能看到它 ——
/// 用户想知道"到底是谁不让我睡"时，这行字是唯一的线索，
/// 所以要能认出是我们，而不是笼统的 "keepawake"。
///
/// **必须是纯 ASCII。** 实测带中文的名字在 `pmset` 里显示成 `named: ""`
/// （断言本身是生效的，CFString 也是正确的 UTF-8，是 pmset 那层显示不出来）。
/// 名字的唯一用途就是给 pmset 看，显示成空就等于没起名字。
/// 见 `tests/awake_real.rs`。
const REASON: &str = "Suanli assistant on duty (Feishu/WeChat bridge)";
const APP_NAME: &str = "Suanli Assistant";
const APP_DOMAIN: &str = "com.ovaijisuan.design";

/// 持有那个断言。**drop 就是解除** —— 所以这个东西必须一直被拿着，
/// 不能是某个函数里的局部变量。
#[derive(Default)]
pub struct Keeper {
    /// `None` = 没开。
    ///
    /// `Box<dyn Any>` 之类的抽象在这里没意义：只有一种东西会被放进来。
    guard: Mutex<Option<keepawake::KeepAwake>>,
    /// 上一次开启失败的原因。开成功或主动关掉时清空。
    error: Mutex<Option<String>>,
}

impl std::fmt::Debug for Keeper {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        // KeepAwake 没有 Debug，而 AppState 要 Debug。只报开没开。
        f.debug_struct("Keeper")
            .field("enabled", &self.enabled())
            .finish()
    }
}

impl Keeper {
    /// 按配置里存的值恢复。
    ///
    /// 启动时失败**不算致命** —— 少了这个开关应用照样能用，
    /// 为它拒绝启动是把小问题放大。原因留在状态里给界面看。
    pub fn new(enabled: bool) -> Self {
        let k = Self::default();
        if enabled && let Err(e) = k.set(true) {
            tracing::warn!("恢复「保持唤醒」失败: {e}");
        }
        k
    }

    pub fn enabled(&self) -> bool {
        self.guard.lock().map(|g| g.is_some()).unwrap_or(false)
    }

    pub fn error(&self) -> Option<String> {
        self.error.lock().ok().and_then(|e| e.clone())
    }

    /// 开或关。**幂等** —— 重复开不会叠第二个断言。
    ///
    /// 官方的 `startPowerSaveBlocker` 也先查 `isStarted`。不查的话，
    /// 每按一次开关都会多一个断言，而只有最后那个句柄留在手里，
    /// 前面的到进程退出都解不掉。
    pub fn set(&self, on: bool) -> Result<(), String> {
        let mut g = self.guard.lock().map_err(|_| "内部状态被污染了")?;
        // **先清错误再判早退**。放在后面的话，"开失败 → 用户改按关"
        // 这条路会走进早退（本来就是关着的），报错就永远挂在界面上了。
        if let Ok(mut e) = self.error.lock() {
            *e = None;
        }
        if on == g.is_some() {
            return Ok(());
        }
        if on {
            let made = keepawake::Builder::default()
                .display(true)
                .idle(true)
                .reason(REASON)
                .app_name(APP_NAME)
                .app_reverse_domain(APP_DOMAIN)
                .create()
                .map_err(|e| format!("系统不让我们阻止休眠：{e}"))?;
            *g = Some(made);
            tracing::info!("「保持唤醒」已开启");
        } else {
            // drop 即解除。显式写出来，不然读的人会以为这行没用。
            *g = None;
            tracing::info!("「保持唤醒」已关闭");
        }
        Ok(())
    }

    fn note_error(&self, msg: &str) {
        if let Ok(mut e) = self.error.lock() {
            *e = Some(msg.to_string());
        }
    }
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

fn snapshot(state: &AppState) -> Value {
    json!({
        "ok": true,
        "enabled": state.awake.enabled(),
        "error": state.awake.error(),
    })
}

pub async fn get(State(state): State<Arc<AppState>>) -> Json<Value> {
    Json(snapshot(&state))
}

#[derive(Debug, Deserialize)]
pub struct Body {
    pub enabled: bool,
}

pub async fn put(State(state): State<Arc<AppState>>, Json(b): Json<Body>) -> Json<Value> {
    if let Err(e) = state.awake.set(b.enabled) {
        state.awake.note_error(&e);
        // 200 + ok:false：这不是请求错了，是系统拒了。界面要把原因显示出来，
        // 而 5xx 在前端那层通常只会变成一句"请求失败"。
        return Json(json!({
            "ok": false, "error": e,
            "enabled": state.awake.enabled(),
        }));
    }
    // 存回配置，下次启动自动恢复 —— 和官方一样。**开关是立刻生效的**，
    // 所以这里和 `/api/settings` 不同，不返回 needsRestart。
    if let Err(e) = persist(b.enabled) {
        tracing::warn!("「保持唤醒」写回配置失败: {e}");
    }
    Json(snapshot(&state))
}

/// 写回 `preventSleep`。
///
/// **以磁盘上那份为底改**，理由同 [`crate::settings::put`]：配置里有一批
/// 这个开关不管的字段，重建会把它们抹掉。
fn persist(enabled: bool) -> Result<(), String> {
    let p = match std::env::var_os("OVGW_CONFIG") {
        Some(p) => std::path::PathBuf::from(p),
        None => crate::config::Config::default_path().map_err(|e| format!("{e:#}"))?,
    };
    let mut cfg = crate::config::Config::load(&p).unwrap_or_default();
    cfg.prevent_sleep = enabled;
    cfg.save(&p).map_err(|e| format!("{e:#}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn turning_it_on_twice_does_not_stack_a_second_assertion() {
        // 不查一下就重复开的话，每按一次开关都会多一个断言，
        // 而只有最后那个句柄留在手里 —— 前面的到进程退出都解不掉，
        // 表现是"关掉了但电脑还是不睡"。
        let k = Keeper::default();
        assert!(!k.enabled());
        // CI 上可能真的开不了（无头环境）。开不了就跳过后半段 ——
        // 这个测试要验的是幂等，不是平台能力。
        if k.set(true).is_err() {
            return;
        }
        assert!(k.enabled());
        assert!(k.set(true).is_ok(), "重复开应当是 no-op");
        assert!(k.enabled());
        assert!(k.set(false).is_ok());
        assert!(!k.enabled());
        assert!(k.set(false).is_ok(), "重复关也是 no-op");
    }

    #[test]
    fn a_failure_reason_survives_until_the_next_success() {
        // 失败了还显示"已开启"的话，用户会安心合上盖子出门。
        let k = Keeper::default();
        assert_eq!(k.error(), None);
        k.note_error("系统拒了");
        assert_eq!(k.error().as_deref(), Some("系统拒了"));
        // 关一次就清掉。注意这次 set 走的是**早退**分支（本来就是关着的），
        // 清错误必须在早退之前，否则报错会永远挂在界面上。
        k.set(false).unwrap();
        assert_eq!(k.error(), None);
    }

    #[test]
    fn a_keeper_that_was_never_enabled_reports_off() {
        // Keeper::new(false) 不该去碰系统。
        let k = Keeper::new(false);
        assert!(!k.enabled());
        assert_eq!(k.error(), None);
    }
}
