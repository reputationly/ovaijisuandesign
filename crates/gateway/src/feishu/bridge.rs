//! 把飞书消息接到 agent 上。`/api/feishu/*`
//!
//! ## 一条消息的完整路径
//!
//! ```text
//! 飞书 App → 长连接（conn.rs）→ 解出 im.message.receive_v1
//!   → 交给 agent（和右栏输入框走的是同一条路）
//!   → agent 跑完 → 把最后一句回复发回飞书那个会话
//! ```
//!
//! ## 三处不做就会安静坏掉的
//!
//! - **必须按 message_id 去重。** 飞书在没收到 ACK 时会重推同一条消息，
//!   而我们的 ACK 是"连接还活着"而不是逐条确认 —— 不去重的话一次网络抖动
//!   会让同一句话被执行两遍，而那可能是两次收费的生成。
//! - **必须过滤机器人自己发的消息。** 不过滤的话，agent 的回复又被当成
//!   一条新消息推回来，形成无限循环 —— 而每一轮都在花钱。
//! - **同一时刻只跑一轮。** agent 那边有 CAS 保护，这里要把"正忙"如实回给
//!   飞书，否则用户连发两条，第二条静默消失。

use std::collections::VecDeque;
use std::sync::Arc;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use super::media::Attachment;
use crate::AppState;

/// 凭据。存在 `.hilo/feishu.json`。
///
/// **App Secret 存明文。** 这是本机文件、和 `config.json` 里的 api_key 同级；
/// 加密的话密钥还得存在旁边，只是把问题挪了个地方，却让用户没法自己
/// 检查和备份。
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Creds {
    #[serde(default)]
    pub app_id: String,
    #[serde(default)]
    pub app_secret: String,
    /// `https://open.feishu.cn`（国内）或 `https://open.larksuite.com`（海外）。
    #[serde(default)]
    pub domain: Option<String>,
}

pub const DEFAULT_DOMAIN: &str = "https://open.feishu.cn";

fn creds_path(ws: &crate::workspace::Workspace) -> std::path::PathBuf {
    ws.hilo().join("feishu.json")
}

pub fn read_creds(ws: &crate::workspace::Workspace) -> Creds {
    std::fs::read_to_string(creds_path(ws))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

// ---------------------------------------------------------------------------
// 运行状态
// ---------------------------------------------------------------------------

#[derive(Debug, Default)]
pub struct Bridge {
    running: AtomicBool,
    stop: AtomicBool,
    status: Mutex<Status>,
    /// 已处理过的 message_id。飞书会重推，见模块注释。
    seen: Mutex<VecDeque<String>>,
}

/// 记多少条已处理的 id。飞书的重推窗口是分钟级，200 条足够覆盖，
/// 又不至于让这个集合无限涨。
const SEEN_CAP: usize = 200;

#[derive(Debug, Clone, Default, Serialize)]
pub struct Status {
    /// `disconnected` / `connecting` / `connected` / `failed`
    pub state: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(default)]
    pub handled: u64,
}

impl Bridge {
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
    fn bump(&self) {
        if let Ok(mut s) = self.status.lock() {
            s.handled += 1;
        }
    }
    /// 第一次见到返回 true。
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
// 事件解析
// ---------------------------------------------------------------------------

/// 从 `im.message.receive_v1` 里取出我们要的东西。
///
/// 返回 `None` 表示这条不该处理（不是消息事件、是机器人自己发的、
/// 或者既没有文本也没有附件）。
///
/// ## 要按 `message_type` 分发
///
/// 只读 `content.text` 的话，图片、文件、富文本三类消息**整条都是空的**
/// —— 而且没有任何报错，表现是"发了图，agent 不理"。官方的
/// `parseFeishuMessageEvent` 是一个 switch，我们照着分。
pub fn parse_message(body: &Value) -> Option<Incoming> {
    let ev = body.get("event")?;
    let t = body.pointer("/header/event_type").and_then(Value::as_str)?;
    if t != "im.message.receive_v1" {
        return None;
    }
    let msg = ev.get("message")?;
    // **机器人自己发的不处理。** 不挡的话 agent 的回复会被当成新消息推回来，
    // 形成无限循环，而每一轮都在花钱。
    let sender_type = ev.pointer("/sender/sender_type").and_then(Value::as_str);
    if sender_type == Some("bot") {
        return None;
    }
    let chat_id = msg.get("chat_id")?.as_str()?.to_string();
    let message_id = msg.get("message_id")?.as_str()?.to_string();
    let message_type = msg.get("message_type").and_then(Value::as_str)?;
    // content 是一个 JSON **字符串**，里面才是 `{"text":"…"}`。
    let raw = msg.get("content")?.as_str()?;
    let content: Value = serde_json::from_str(raw).ok()?;

    let mut attachments: Vec<Attachment> = Vec::new();
    let mut text = match message_type {
        "text" => content
            .get("text")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string(),
        "image" | "file" | "audio" | "media" => {
            // 取不到 key 的附件消息没有任何可用内容 —— 官方也是整条跳过。
            let a = super::media::from_content(message_type, &content)?;
            let t = super::media::placeholder(&a);
            attachments.push(a);
            t
        }
        "post" => {
            let p = super::media::extract_post(&content)?;
            attachments = p.attachments;
            p.text
        }
        // 表情包、名片、日程……都不是我们能处理的东西。
        _ => return None,
    };

    // 群里 @ 机器人时，正文里是 `@_user_1` 这样的占位。去掉它，
    // 否则那几个字符会被当成提示词的一部分。
    for m in ev
        .pointer("/message/mentions")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        if let Some(k) = m.get("key").and_then(Value::as_str) {
            text = text.replace(k, "");
        }
    }
    let text = text.trim().to_string();
    // 只有附件没有文字也要处理 —— 只贴一张图指望"照这个做"是常见用法。
    if text.is_empty() && attachments.is_empty() {
        return None;
    }
    Some(Incoming {
        chat_id,
        message_id,
        text,
        attachments,
    })
}

#[derive(Debug, Clone)]
pub struct Incoming {
    pub chat_id: String,
    pub message_id: String,
    pub text: String,
    pub attachments: Vec<Attachment>,
}

// ---------------------------------------------------------------------------
// 回消息
// ---------------------------------------------------------------------------

/// 拿 tenant_access_token。
///
/// **每次现取，不缓存。** 它有效期两小时，而这里的调用频率是"用户发一条
/// 消息"级别；缓存要处理过期、并发刷新，换来的只是省一次 HTTP。
async fn tenant_token(client: &reqwest::Client, domain: &str, c: &Creds) -> Result<String, String> {
    let r = client
        .post(format!(
            "{}/open-apis/auth/v3/tenant_access_token/internal",
            domain.trim_end_matches('/')
        ))
        .json(&json!({ "app_id": c.app_id, "app_secret": c.app_secret }))
        .timeout(Duration::from_secs(15))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let v: Value = r.json().await.map_err(|e| e.to_string())?;
    if v.get("code").and_then(Value::as_i64) != Some(0) {
        return Err(format!(
            "取 token 失败：{}",
            v.get("msg").and_then(Value::as_str).unwrap_or("未知")
        ));
    }
    v.get("tenant_access_token")
        .and_then(Value::as_str)
        .map(str::to_string)
        .ok_or_else(|| "飞书没有返回 token".into())
}

/// 往一个会话发文本。
pub async fn reply(
    client: &reqwest::Client,
    domain: &str,
    c: &Creds,
    chat_id: &str,
    text: &str,
) -> Result<(), String> {
    let token = tenant_token(client, domain, c).await?;
    let r = client
        .post(format!(
            "{}/open-apis/im/v1/messages?receive_id_type=chat_id",
            domain.trim_end_matches('/')
        ))
        .bearer_auth(token)
        .json(&json!({
            "receive_id": chat_id,
            "msg_type": "text",
            // content 要是 JSON 字符串，不是对象。直接放对象飞书会回
            // "invalid content"，而那个错误看不出是这里的问题。
            "content": json!({ "text": text }).to_string(),
        }))
        .timeout(Duration::from_secs(20))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let v: Value = r.json().await.map_err(|e| e.to_string())?;
    if v.get("code").and_then(Value::as_i64) != Some(0) {
        return Err(format!(
            "发送失败：{}",
            v.get("msg").and_then(Value::as_str).unwrap_or("未知")
        ));
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// 路由
// ---------------------------------------------------------------------------

pub async fn status(State(state): State<Arc<AppState>>) -> Json<Value> {
    let c = read_creds(&state.ws);
    Json(json!({
        "ok": true,
        "configured": !c.app_id.is_empty() && !c.app_secret.is_empty(),
        "appId": c.app_id,
        "domain": c.domain.unwrap_or_else(|| DEFAULT_DOMAIN.into()),
        "status": state.feishu.snapshot(),
    }))
}

#[derive(Debug, Deserialize)]
pub struct SaveBody {
    #[serde(rename = "appId", default)]
    pub app_id: String,
    /// 留空 = 不改。和设置页里的 api_key 同一个约定。
    #[serde(rename = "appSecret", default)]
    pub app_secret: String,
    #[serde(default)]
    pub domain: Option<String>,
}

pub async fn save(
    State(state): State<Arc<AppState>>,
    Json(b): Json<SaveBody>,
) -> (StatusCode, Json<Value>) {
    let mut c = read_creds(&state.ws);
    if !b.app_id.trim().is_empty() {
        c.app_id = b.app_id.trim().to_string();
    }
    if !b.app_secret.trim().is_empty() {
        c.app_secret = b.app_secret.trim().to_string();
    }
    if let Some(d) = b.domain {
        let d = d.trim();
        c.domain = (!d.is_empty()).then(|| d.to_string());
    }
    if c.app_id.is_empty() || c.app_secret.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"ok":false,"error":"App ID 和 App Secret 都要填"})),
        );
    }
    let p = creds_path(&state.ws);
    if let Some(d) = p.parent() {
        let _ = std::fs::create_dir_all(d);
    }
    match std::fs::write(&p, serde_json::to_vec_pretty(&c).unwrap_or_default()) {
        Ok(()) => (StatusCode::OK, Json(json!({ "ok": true }))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"ok":false,"error":e.to_string()})),
        ),
    }
}

pub async fn connect(State(state): State<Arc<AppState>>) -> (StatusCode, Json<Value>) {
    let c = read_creds(&state.ws);
    if c.app_id.is_empty() || c.app_secret.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"ok":false,"error":"还没有填 App ID / App Secret"})),
        );
    }
    if state
        .feishu
        .running
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return (
            StatusCode::CONFLICT,
            Json(json!({"ok":false,"error":"已经连着了"})),
        );
    }
    state.feishu.stop.store(false, Ordering::Relaxed);
    let st = state.clone();
    tokio::spawn(async move {
        serve(&st, c).await;
        st.feishu.running.store(false, Ordering::Relaxed);
    });
    (StatusCode::OK, Json(json!({ "ok": true })))
}

pub async fn disconnect(State(state): State<Arc<AppState>>) -> Json<Value> {
    state.feishu.stop.store(true, Ordering::Relaxed);
    state.feishu.set("disconnected", None);
    Json(json!({ "ok": true }))
}

/// 连上并一直收，断了就重连。
async fn serve(state: &Arc<AppState>, c: Creds) {
    let domain = c.domain.clone().unwrap_or_else(|| DEFAULT_DOMAIN.into());
    // 重连退避：1s 起，翻倍，封顶 60s。不退避的话飞书那边会把我们当成
    // 异常客户端；不封顶的话断开一晚上之后要等几小时才重试。
    const BACKOFF_MIN: Duration = Duration::from_secs(1);
    const BACKOFF_MAX: Duration = Duration::from_secs(60);
    // **退避只在"连上过又断了"时才涨。** 声明成 Option 而不是给个初值：
    // 给初值的话第一次连接前那个值永远读不到，clippy 会指出来 ——
    // 而它是对的，那说明"第一次连接不等待"这件事没有在类型上表达出来。
    let mut backoff: Option<Duration> = None;
    while !state.feishu.stop.load(Ordering::Relaxed) {
        if let Some(d) = backoff {
            tokio::time::sleep(d).await;
        }
        state.feishu.set("connecting", None);
        match super::conn::handshake(&state.client, &domain, &c.app_id, &c.app_secret).await {
            Ok(info) => {
                state.feishu.set("connected", None);
                backoff = Some(BACKOFF_MIN);
                let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<super::conn::Event>();
                let st2 = state.clone();
                let c2 = c.clone();
                let d2 = domain.clone();
                // 事件处理放另一个任务：agent 一轮能跑几分钟，
                // 在读循环里等它会让心跳停掉、连接被判掉线。
                tokio::spawn(async move {
                    while let Some(ev) = rx.recv().await {
                        handle(&st2, &c2, &d2, ev).await;
                    }
                });
                let stop = || state.feishu.stop.load(Ordering::Relaxed);
                if let Err(e) = super::conn::run(
                    &info,
                    |ev| {
                        let _ = tx.send(ev);
                    },
                    stop,
                )
                .await
                {
                    tracing::warn!("飞书长连接断开: {e}");
                    state.feishu.set("connecting", Some(e));
                }
            }
            Err(e) => {
                tracing::warn!("飞书握手失败: {e}");
                // 握手失败通常是凭据错或应用没发布 —— **重试也不会好**，
                // 所以标成 failed 让界面显示原因，而不是无声地一直重连。
                state.feishu.set("failed", Some(e));
                state.feishu.stop.store(true, Ordering::Relaxed);
                return;
            }
        }
        backoff = Some(backoff.map_or(BACKOFF_MIN, |d| (d * 2).min(BACKOFF_MAX)));
    }
    state.feishu.set("disconnected", None);
}

async fn handle(state: &Arc<AppState>, c: &Creds, domain: &str, ev: super::conn::Event) {
    let Some(inc) = parse_message(&ev.body) else {
        return;
    };
    if !state.feishu.first_time(&inc.message_id) {
        tracing::debug!("飞书重复推送，已跳过: {}", inc.message_id);
        return;
    }
    state.feishu.bump();

    // agent 同一时刻只跑一轮。**正忙要如实回过去** —— 不回的话用户
    // 连发两条，第二条静默消失。
    if state.agent.is_running() {
        let _ = reply(
            &state.client,
            domain,
            c,
            &inc.chat_id,
            "上一轮还在跑，等它结束再发。",
        )
        .await;
        return;
    }

    // 附件先落盘，再把路径拼进提示词 —— 这样"照这张图的风格出三张"里的
    // "这张图"才有所指。
    //
    // 一个附件挂了**不中断其余的**，但要说出来：否则 agent 照着少一张的
    // 素材干活，用户以为都进去了。
    let mut paths = Vec::new();
    let mut failed = Vec::new();
    if !inc.attachments.is_empty() {
        // token 取一次给整批用。每个附件现取一次的话，发 9 张图就要多打
        // 9 次鉴权。
        match tenant_token(&state.client, domain, c).await {
            Ok(token) => {
                for a in &inc.attachments {
                    match super::media::fetch(&state.client, domain, &token, &inc.message_id, a)
                        .await
                        .and_then(|b| {
                            state
                                .assets
                                .store(&a.filename, &b)
                                .map_err(|e| format!("{e:#}"))
                        }) {
                        Ok(rel) => paths.push(rel),
                        Err(e) => {
                            tracing::warn!("飞书附件 {} 取失败: {e}", a.filename);
                            failed.push(format!("{}（{e}）", a.filename));
                        }
                    }
                }
            }
            Err(e) => {
                tracing::warn!("取 token 失败，附件全部跳过: {e}");
                failed.push(format!("全部（{e}）"));
            }
        }
    }
    if !failed.is_empty() {
        let _ = reply(
            &state.client,
            domain,
            c,
            &inc.chat_id,
            &format!("这些附件没取下来：{}", failed.join("、")),
        )
        .await;
    }
    // 只发了附件而且全挂了 —— 没有素材也没有文字，这一轮无事可做。
    // 不拦的话 agent 会拿一句 `[图片]` 去猜用户想要什么。
    if paths.is_empty() && inc.attachments.len() == failed.len() && !inc.attachments.is_empty() {
        return;
    }
    let prompt = if paths.is_empty() {
        inc.text.clone()
    } else {
        format!(
            "{}\n\n（用户发来的参考素材：{}）",
            inc.text,
            paths.join("、")
        )
    };

    let before = crate::agent::read_history(&state.ws).len();
    crate::agent::run_once(state, &prompt).await;
    let after = crate::agent::read_history(&state.ws);

    // 把这一轮新产生的 assistant 文本发回去。**只发文本，不发工具结果** ——
    // 工具那些是几 KB 的 JSON，发到飞书里没人看得下去。
    let said: Vec<String> = after
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
    if let Err(e) = reply(&state.client, domain, c, &inc.chat_id, &text).await {
        tracing::warn!("回飞书失败: {e}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn event(sender: &str, text: &str) -> Value {
        typed(sender, "text", json!({ "text": text }))
    }

    /// 造一条指定 `message_type` 的事件。
    ///
    /// `content` 在飞书那边是**一个 JSON 字符串**，不是嵌套对象 ——
    /// 这里跟着序列化一次，免得测试和实际收到的形状不一样。
    fn typed(sender: &str, message_type: &str, content: Value) -> Value {
        json!({
            "header": { "event_type": "im.message.receive_v1" },
            "event": {
                "sender": { "sender_type": sender },
                "message": {
                    "chat_id": "oc_1", "message_id": "om_1",
                    "message_type": message_type,
                    "content": content.to_string(),
                },
            },
        })
    }

    #[test]
    fn a_bots_own_message_is_ignored() {
        // 不挡的话 agent 的回复会被当成新消息推回来，形成无限循环，
        // 而每一轮都在花钱。
        assert!(parse_message(&event("bot", "你好")).is_none());
        assert!(parse_message(&event("user", "你好")).is_some());
    }

    #[test]
    fn mention_placeholders_are_stripped_from_the_text() {
        // 群里 @ 机器人时正文里是 `@_user_1` 这样的占位，
        // 不去掉会被当成提示词的一部分。
        let mut e = event("user", "@_user_1 生成一张图");
        e["event"]["message"]["mentions"] = json!([{ "key": "@_user_1" }]);
        assert_eq!(parse_message(&e).unwrap().text, "生成一张图");
    }

    #[test]
    fn a_non_message_event_is_ignored() {
        let mut e = event("user", "x");
        e["header"]["event_type"] = json!("im.chat.updated_v1");
        assert!(parse_message(&e).is_none());
    }

    #[test]
    fn an_empty_message_is_ignored() {
        // 纯 @ 没有正文时 text 是空的。发给 agent 会让它对着空提示词干活。
        assert!(parse_message(&event("user", "   ")).is_none());
    }

    #[test]
    fn the_same_message_is_only_handled_once() {
        // 飞书在没收到 ACK 时会重推。不去重的话一次网络抖动会让同一句话
        // 执行两遍，而那可能是两次收费的生成。
        let b = Bridge::new();
        assert!(b.first_time("om_1"));
        assert!(!b.first_time("om_1"));
        assert!(b.first_time("om_2"));
    }

    #[test]
    fn the_seen_set_does_not_grow_without_bound() {
        let b = Bridge::new();
        for i in 0..(SEEN_CAP + 50) {
            assert!(b.first_time(&format!("m{i}")));
        }
        assert_eq!(b.seen.lock().unwrap().len(), SEEN_CAP);
        // 最早那批被挤出去了 —— 它们早就过了飞书的重推窗口。
        assert!(b.first_time("m0"));
    }

    #[test]
    fn an_image_message_carries_its_key_instead_of_being_dropped() {
        // 之前只读 content.text，图片消息整条是空的 —— 而且没有任何报错，
        // 表现是"发了图，agent 不理"。
        let inc = parse_message(&typed("user", "image", json!({ "image_key": "img_v2_x" })))
            .expect("图片消息不该被丢掉");
        assert_eq!(inc.attachments.len(), 1);
        assert_eq!(inc.attachments[0].key, "img_v2_x");
        assert_eq!(inc.attachments[0].kind, super::super::media::Kind::Image);
        // 正文给个占位，否则 agent 不知道用户发了东西过来。
        assert_eq!(inc.text, "[图片]");
    }

    #[test]
    fn a_file_message_keeps_the_original_name() {
        let inc = parse_message(&typed(
            "user",
            "file",
            json!({ "file_key": "file_v2_y", "file_name": "参考稿.pdf" }),
        ))
        .unwrap();
        assert_eq!(inc.attachments[0].filename, "参考稿.pdf");
        assert_eq!(inc.attachments[0].kind, super::super::media::Kind::File);
        assert_eq!(inc.text, "[文件] 参考稿.pdf");
    }

    #[test]
    fn a_rich_text_post_keeps_its_words_and_its_pictures_in_order() {
        let inc = parse_message(&typed(
            "user",
            "post",
            json!({ "zh_cn": { "title": "需求", "content": [[
                { "tag": "text", "text": "照 " },
                { "tag": "img", "image_key": "img_a" },
                { "tag": "text", "text": " 出三张" },
            ]] } }),
        ))
        .unwrap();
        assert_eq!(inc.text, "需求\n照 [图片1] 出三张");
        assert_eq!(inc.attachments.len(), 1);
        assert_eq!(inc.attachments[0].key, "img_a");
    }

    #[test]
    fn a_mention_in_a_post_is_still_stripped() {
        // 群里 @ 机器人时 mentions 照样在。富文本这条路也要过一遍，
        // 不然 `@_user_1` 会被当成提示词的一部分。
        let mut ev = typed(
            "user",
            "post",
            json!({ "zh_cn": { "content": [[
                { "tag": "text", "text": "@_user_1 出三张图" },
            ]] } }),
        );
        ev["event"]["message"]["mentions"] = json!([{ "key": "@_user_1" }]);
        assert_eq!(parse_message(&ev).unwrap().text, "出三张图");
    }

    #[test]
    fn a_message_type_we_do_not_handle_is_skipped_quietly() {
        // 表情包、名片、日程 —— 硬当成文本解的话会得到一条空提示词。
        assert!(parse_message(&typed("user", "sticker", json!({ "file_key": "s" }))).is_none());
        // 图片消息缺 image_key：没有任何可用内容，整条跳过（官方同样处理）。
        assert!(parse_message(&typed("user", "image", json!({}))).is_none());
    }

    #[test]
    fn a_text_message_still_works_exactly_as_before() {
        let inc = parse_message(&event("user", "出三张图")).unwrap();
        assert_eq!(inc.text, "出三张图");
        assert!(inc.attachments.is_empty(), "文本消息不该凭空多出附件");
    }
}
