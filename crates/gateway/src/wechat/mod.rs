//! 接入微信。`/api/wechat/*`
//!
//! 走**腾讯官方的 iLink AI Bot 平台**（`ilinkai.weixin.qq.com`）：
//! 扫码登录拿一个 bot token，然后长轮询收消息、HTTP 发消息。
//! 实测不需要企业资质，个人微信扫码即可。
//!
//! 和飞书那条一样，**没有任何第三方中转** —— 直连腾讯的端点。
//!
//! ```text
//! 扫码  get_bot_qrcode → get_qrcode_status（长轮询）→ bot_token
//! 收    getupdates（长轮询 35s，带 get_updates_buf 游标）
//! 发    sendmessage / sendtyping
//! ```

pub mod client;

use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::AppState;
use client::{Client, SendCtx};

/// 存下来的登录凭据。
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Creds {
    #[serde(default)]
    pub bot_token: String,
    #[serde(default)]
    pub ilink_bot_id: String,
    /// 登录时服务端可能给一个专属的 baseurl，**要用它而不是默认那个**。
    #[serde(default)]
    pub base_url: Option<String>,
}

fn creds_path(ws: &crate::workspace::Workspace) -> std::path::PathBuf {
    ws.hilo().join("wechat.json")
}

pub fn read_creds(ws: &crate::workspace::Workspace) -> Creds {
    std::fs::read_to_string(creds_path(ws))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn write_creds(ws: &crate::workspace::Workspace, c: &Creds) {
    let p = creds_path(ws);
    if let Some(d) = p.parent() {
        let _ = std::fs::create_dir_all(d);
    }
    let _ = std::fs::write(p, serde_json::to_vec_pretty(c).unwrap_or_default());
}

// ---------------------------------------------------------------------------
// 状态
// ---------------------------------------------------------------------------

const SEEN_CAP: usize = 200;

#[derive(Debug, Default)]
pub struct Wechat {
    running: AtomicBool,
    stop: AtomicBool,
    logging_in: AtomicBool,
    status: Mutex<Status>,
    seen: Mutex<VecDeque<String>>,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    /// `disconnected` / `connecting` / `connected` / `failed`
    pub state: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub handled: u64,
    /// 扫码过程中的状态：`loading` / `ready` / `scanned` / `expired` / `confirmed` / `error`
    #[serde(skip_serializing_if = "Option::is_none")]
    pub qr_state: Option<String>,
    /// 二维码。可能是 URL 也可能是 data URI，见 `client::Qr::is_image`。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub qr_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub qr_is_image: Option<bool>,
}

impl Wechat {
    pub fn new() -> Self {
        Self::default()
    }
    pub fn snapshot(&self) -> Status {
        self.status.lock().map(|s| s.clone()).unwrap_or_default()
    }
    fn set(&self, state: &str, error: Option<String>) {
        if let Ok(mut s) = self.status.lock() {
            s.state = state.into();
            s.error = error;
        }
    }
    fn set_qr(&self, qr_state: &str, url: Option<String>, is_image: Option<bool>) {
        if let Ok(mut s) = self.status.lock() {
            s.qr_state = Some(qr_state.into());
            if url.is_some() {
                s.qr_url = url;
                s.qr_is_image = is_image;
            }
        }
    }
    fn clear_qr(&self) {
        if let Ok(mut s) = self.status.lock() {
            s.qr_state = None;
            s.qr_url = None;
            s.qr_is_image = None;
        }
    }
    fn bump(&self) {
        if let Ok(mut s) = self.status.lock() {
            s.handled += 1;
        }
    }
    fn first_time(&self, id: &str) -> bool {
        let Ok(mut q) = self.seen.lock() else {
            return true;
        };
        if q.iter().any(|x| x == id) {
            return false;
        }
        q.push_back(id.to_string());
        while q.len() > SEEN_CAP {
            q.pop_front();
        }
        true
    }
}

// ---------------------------------------------------------------------------
// 消息解析
// ---------------------------------------------------------------------------

/// iLink 的消息类型。官方 SDK 的 `MessageItemType`。
const ITEM_TEXT: i64 = 1;
/// 语音消息，`voice_item.text` 是转写好的文字 —— **当文本用**，
/// 用户对着微信说一句话就能派任务。
const ITEM_VOICE: i64 = 3;

#[derive(Debug, Clone)]
pub struct Incoming {
    pub message_id: String,
    pub text: String,
    pub ctx: SendCtx,
}

/// 从一条 `msgs[]` 里取出我们能处理的部分。
///
/// 返回 `None` 表示跳过（没有文本、没有发送者、或者只有我们还不支持的
/// 附件）。**图片/文件先不处理**：它们要走 CDN 下载 + AES 解密，
/// 是另一块；而没有文本的消息交给 agent 也没有指令可执行。
pub fn parse_message(msg: &Value) -> Option<Incoming> {
    let items = msg.get("item_list")?.as_array()?;
    let mut text = String::new();
    for it in items {
        let t = it.get("type").and_then(Value::as_i64).unwrap_or(0);
        let s = match t {
            ITEM_TEXT => it.pointer("/text_item/text").and_then(Value::as_str),
            ITEM_VOICE => it.pointer("/voice_item/text").and_then(Value::as_str),
            _ => None,
        };
        if let Some(s) = s.filter(|s| !s.trim().is_empty()) {
            if !text.is_empty() {
                text.push('\n');
            }
            text.push_str(s);
        }
    }
    let text = text.trim().to_string();
    if text.is_empty() {
        return None;
    }
    let sender = msg.get("from_user_id").and_then(Value::as_str)?;
    if sender.is_empty() {
        return None;
    }
    // message_id 可能是数字。**转成字符串再比** —— 直接拿 as_str 的话
    // 数字型 id 全都取不到，于是去重完全失效，每条消息都会被当成新的。
    let message_id = msg
        .get("message_id")
        .map(|v| match v {
            Value::String(s) => s.clone(),
            other => other.to_string(),
        })
        .or_else(|| {
            msg.get("client_id")
                .and_then(Value::as_str)
                .map(str::to_string)
        })?;
    let group_id = msg
        .get("group_id")
        .and_then(Value::as_str)
        .filter(|g| !g.is_empty())
        .map(str::to_string);
    Some(Incoming {
        message_id,
        text,
        ctx: SendCtx {
            ilink_user_id: sender.to_string(),
            context_token: msg
                .get("context_token")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            group_id,
        },
    })
}

// ---------------------------------------------------------------------------
// 路由
// ---------------------------------------------------------------------------

pub async fn status(State(state): State<Arc<AppState>>) -> Json<Value> {
    let c = read_creds(&state.ws);
    Json(json!({
        "ok": true,
        "configured": !c.bot_token.is_empty(),
        "status": state.wechat.snapshot(),
    }))
}

/// 开始扫码登录。二维码通过 `/api/wechat/status` 轮询取。
pub async fn login(State(state): State<Arc<AppState>>) -> (StatusCode, Json<Value>) {
    if state
        .wechat
        .logging_in
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return (
            StatusCode::CONFLICT,
            Json(json!({"ok":false,"error":"已经在扫码了"})),
        );
    }
    let st = state.clone();
    tokio::spawn(async move {
        run_login(&st).await;
        st.wechat.logging_in.store(false, Ordering::Relaxed);
    });
    (StatusCode::OK, Json(json!({ "ok": true })))
}

async fn run_login(state: &Arc<AppState>) {
    let c = Client::new(state.client.clone(), None, None);
    state.wechat.set_qr("loading", None, None);
    let mut qr = match c.qrcode().await {
        Ok(q) => q,
        Err(e) => {
            state.wechat.set_qr("error", None, None);
            state.wechat.set("failed", Some(e));
            return;
        }
    };
    state
        .wechat
        .set_qr("ready", Some(qr.url.clone()), Some(qr.is_image));

    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(5 * 60);
    let mut refreshed = 0u32;
    while std::time::Instant::now() < deadline {
        let s = match c.qr_status(&qr.token).await {
            Ok(s) => s,
            Err(e) => {
                state.wechat.set_qr("error", None, None);
                state.wechat.set("failed", Some(e));
                return;
            }
        };
        match s.status.as_str() {
            // 长轮询到点没人扫。继续等 —— 这是最常见的一条路径。
            "wait" => {}
            "scaned" | "scanned" => state.wechat.set_qr("scanned", None, None),
            "expired" => {
                refreshed += 1;
                if refreshed >= client::MAX_QR_REFRESH {
                    state.wechat.set_qr("expired", None, None);
                    state
                        .wechat
                        .set("failed", Some("二维码多次过期，请重新发起登录".into()));
                    return;
                }
                match c.qrcode().await {
                    Ok(q) => {
                        qr = q;
                        state
                            .wechat
                            .set_qr("ready", Some(qr.url.clone()), Some(qr.is_image));
                    }
                    Err(e) => {
                        state.wechat.set_qr("error", None, None);
                        state.wechat.set("failed", Some(e));
                        return;
                    }
                }
            }
            "confirmed" => {
                let (Some(token), Some(bot)) = (s.bot_token, s.ilink_bot_id) else {
                    state.wechat.set_qr("error", None, None);
                    state
                        .wechat
                        .set("failed", Some("登录成功但没有返回 token".into()));
                    return;
                };
                write_creds(
                    &state.ws,
                    &Creds {
                        bot_token: token,
                        ilink_bot_id: bot,
                        base_url: s.baseurl,
                    },
                );
                state.wechat.set_qr("confirmed", None, None);
                // 登录完直接连上。用户扫完码还要再点一次"连接"是多余的。
                start(state);
                return;
            }
            other => tracing::debug!("微信扫码返回了没见过的状态: {other}"),
        }
    }
    state.wechat.set_qr("expired", None, None);
    state.wechat.set("failed", Some("扫码超时".into()));
}

pub async fn connect(State(state): State<Arc<AppState>>) -> (StatusCode, Json<Value>) {
    if read_creds(&state.ws).bot_token.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"ok":false,"error":"还没有扫码登录"})),
        );
    }
    if !start(&state) {
        return (
            StatusCode::CONFLICT,
            Json(json!({"ok":false,"error":"已经连着了"})),
        );
    }
    (StatusCode::OK, Json(json!({ "ok": true })))
}

fn start(state: &Arc<AppState>) -> bool {
    if state
        .wechat
        .running
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return false;
    }
    state.wechat.stop.store(false, Ordering::Relaxed);
    let st = state.clone();
    tokio::spawn(async move {
        serve(&st).await;
        st.wechat.running.store(false, Ordering::Relaxed);
    });
    true
}

pub async fn disconnect(State(state): State<Arc<AppState>>) -> Json<Value> {
    state.wechat.stop.store(true, Ordering::Relaxed);
    state.wechat.set("disconnected", None);
    Json(json!({ "ok": true }))
}

pub async fn logout(State(state): State<Arc<AppState>>) -> Json<Value> {
    state.wechat.stop.store(true, Ordering::Relaxed);
    let _ = std::fs::remove_file(creds_path(&state.ws));
    state.wechat.clear_qr();
    state.wechat.set("disconnected", None);
    Json(json!({ "ok": true }))
}

/// 长轮询循环。
async fn serve(state: &Arc<AppState>) {
    let creds = read_creds(&state.ws);
    let c = Client::new(
        state.client.clone(),
        creds.base_url.as_deref(),
        Some(creds.bot_token.clone()),
    );
    state.wechat.set("connected", None);
    // 游标。**必须在循环外面** —— 每轮重置的话会一直收到同一批旧消息。
    let mut buf = String::new();
    let mut fails = 0u32;

    while !state.wechat.stop.load(Ordering::Relaxed) {
        match c.get_updates(&buf).await {
            Ok((msgs, next)) => {
                fails = 0;
                buf = next;
                state.wechat.set("connected", None);
                for m in msgs {
                    handle(state, &c, &m).await;
                    if state.wechat.stop.load(Ordering::Relaxed) {
                        break;
                    }
                }
            }
            Err(e) => {
                fails += 1;
                tracing::warn!("微信收消息失败({fails}): {e}");
                state.wechat.set("connecting", Some(e));
                // 连续失败才放弃。一次网络抖动就断开的话，用户得手动重连。
                if fails >= 5 {
                    state.wechat.set(
                        "failed",
                        Some("连续失败多次，已断开。可能是登录已失效，请重新扫码。".into()),
                    );
                    break;
                }
                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
            }
        }
    }
    if state.wechat.snapshot().state != "failed" {
        state.wechat.set("disconnected", None);
    }
}

async fn handle(state: &Arc<AppState>, c: &Client, msg: &Value) {
    let Some(inc) = parse_message(msg) else {
        return;
    };
    if !state.wechat.first_time(&inc.message_id) {
        return;
    }
    state.wechat.bump();

    if state.agent.is_running() {
        let _ = c.send_text(&inc.ctx, "上一轮还在跑，等它结束再发。").await;
        return;
    }
    // 「正在输入」。一轮可能几分钟，不给反馈的话用户会以为消息没发出去。
    c.send_typing(&inc.ctx).await;

    let before = crate::agent::read_history(&state.ws).len();
    crate::agent::run_once(state, &inc.text).await;
    let said: Vec<String> = crate::agent::read_history(&state.ws)
        .into_iter()
        .skip(before)
        .filter(|m| m.role == "assistant")
        .filter_map(|m| m.content)
        .filter(|s| !s.trim().is_empty())
        .collect();
    let text = if said.is_empty() {
        "做完了，但这一轮没有文字说明。".to_string()
    } else {
        said.join("\n\n")
    };
    if let Err(e) = c.send_text(&inc.ctx, &text).await {
        tracing::warn!("回微信失败: {e}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn text_msg(id: Value, text: &str) -> Value {
        json!({
            "message_id": id,
            "from_user_id": "u1",
            "context_token": "ctx1",
            "item_list": [{ "type": 1, "text_item": { "text": text } }],
        })
    }

    #[test]
    fn a_numeric_message_id_is_still_usable_for_dedup() {
        // message_id 可能是数字。直接 as_str 的话取不到，去重完全失效，
        // 每条消息都会被当成新的 —— 而重复执行可能是重复收费的生成。
        assert_eq!(
            parse_message(&text_msg(json!(12345), "hi"))
                .unwrap()
                .message_id,
            "12345"
        );
        assert_eq!(
            parse_message(&text_msg(json!("om_1"), "hi"))
                .unwrap()
                .message_id,
            "om_1"
        );
    }

    #[test]
    fn a_voice_message_is_treated_as_text() {
        // voice_item.text 是转写好的文字。当文本用，用户对着微信说一句话
        // 就能派任务。
        let m = json!({
            "message_id": 1, "from_user_id": "u1",
            "item_list": [{ "type": 3, "voice_item": { "text": "生成一张图" } }],
        });
        assert_eq!(parse_message(&m).unwrap().text, "生成一张图");
    }

    #[test]
    fn several_items_are_joined_with_newlines() {
        let m = json!({
            "message_id": 1, "from_user_id": "u1",
            "item_list": [
                { "type": 1, "text_item": { "text": "第一段" } },
                { "type": 99, "unknown_item": {} },
                { "type": 1, "text_item": { "text": "第二段" } },
            ],
        });
        assert_eq!(parse_message(&m).unwrap().text, "第一段\n第二段");
    }

    #[test]
    fn a_message_without_text_is_skipped() {
        // 只有图片/文件的消息交给 agent 也没有指令可执行。
        let m = json!({
            "message_id": 1, "from_user_id": "u1",
            "item_list": [{ "type": 2, "image_item": {} }],
        });
        assert!(parse_message(&m).is_none());
        assert!(parse_message(&text_msg(json!(1), "   ")).is_none());
    }

    #[test]
    fn a_group_message_carries_the_group_id_back() {
        // 回消息时不带 group_id 会发到单聊里，用户在群里等不到回复。
        let mut m = text_msg(json!(1), "hi");
        m["group_id"] = json!("g1");
        assert_eq!(
            parse_message(&m).unwrap().ctx.group_id.as_deref(),
            Some("g1")
        );
        assert!(
            parse_message(&text_msg(json!(1), "hi"))
                .unwrap()
                .ctx
                .group_id
                .is_none()
        );
    }

    #[test]
    fn the_same_message_is_only_handled_once() {
        let w = Wechat::new();
        assert!(w.first_time("m1"));
        assert!(!w.first_time("m1"));
    }
}
