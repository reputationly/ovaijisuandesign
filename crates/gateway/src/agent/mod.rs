//! 应用内的 agent。`POST /api/agent/send`、`GET /api/agent/messages`、
//! `POST /api/agent/stop`
//!
//! ## 为什么不用 opencode
//!
//! 官方那边 agent 是 opencode，工具通过 MCP 协议走 stdio。我们**在
//! gateway 进程里直接跑循环**：
//!
//! - 26 个工具的 handler 本来就在这个进程里，走 MCP 要多一个进程、多一跳
//!   HTTP，而且 agent 要等 opencode 起来才能干活
//! - opencode 是外部依赖，用户得自己装一份；我们的目标是"下载即用"
//!
//! `ovagent` + MCP server 那条路**留着**：想用 opencode 和官方那套 agent
//! 配置的人仍然可以在终端跑。两条路共用同一个 gateway，看到的是同一张画布。
//!
//! ## 会话跟着画布走
//!
//! 一条会话 = 一张画布，聊天记录存 `.hilo/chat.json`，切换画布时和
//! `canvas.json` 一起存档。不这么做的话，切到另一张画布上、对话还在讲
//! 上一张的事，而 agent 看到的画布已经换了。

pub mod catalog;
pub mod dispatch;

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use axum::Json;
use axum::extract::State;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::AppState;

/// 一轮最多让模型调几次工具就必须说话。
///
/// 没有这个上限的话，模型可能在"查画布 → 没找到 → 再查画布"之间无限打转，
/// 而每一步都在花 token。25 步足够做完一次「出三张图再分组」，
/// 又不至于让跑飞的循环烧掉一整天的额度。
const MAX_STEPS: usize = 25;

/// 历史保留多少条。超出时**从中间截，保留最早的 system 和最近的若干轮**。
const MAX_HISTORY: usize = 60;

const MAX_TOKENS: u32 = 4000;
const TURN_TIMEOUT: Duration = Duration::from_secs(180);

const SYSTEM: &str = "\
你是这个画布应用里的创作助手。用户说一句话，你调用工具把东西做出来，
产物直接出现在画布上。

工作方式：

1. **先看再动。** 用户提到「那张图」「刚才的视频」时，先 canvas_list_nodes
   看画布上有什么，不要凭猜。
2. **不确定能不能做，先 list_capabilities。** 这台机器上哪些模态可用是
   配置决定的，调用失败之后才发现会浪费用户的时间。
3. **视频先出关键帧。** 视频比图慢得多也贵得多，构图不对应该在出图那一步
   就发现。
4. **带唱词的歌先 lyrics_generation，把歌词原样念给用户确认再生成。**
   自己编词直接生成的话，用户拿到的是一首他没同意过的歌。
5. 一轮做出多个产物之后用 canvas_group_nodes 归拢。

说话：

- 中文，简短。做完了就说做完了，不要复述一遍自己调了哪些工具 ——
  那些用户在旁边的活动流里看得见。
- 工具失败时**如实说失败了和原因**，不要说「已完成」。
- 用户说「以后都…」这类偏好时，用 memory 记一条。";

// ---------------------------------------------------------------------------
// 消息
// ---------------------------------------------------------------------------

/// 一条消息。形状对齐 OpenAI 的 messages，**原样存原样发** ——
/// 转换一次就多一处能丢字段的地方，而 `tool_call_id` 丢了模型就对不上。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Msg {
    pub role: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(
        rename = "tool_calls",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub tool_calls: Option<Value>,
    #[serde(
        rename = "tool_call_id",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub tool_call_id: Option<String>,
    /// 我们自己加的，不发给模型。前端按它显示时间。
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub at: Option<u64>,
}

impl Msg {
    fn user(text: &str) -> Self {
        Self {
            role: "user".into(),
            content: Some(text.into()),
            tool_calls: None,
            tool_call_id: None,
            at: Some(now()),
        }
    }
    fn assistant(text: &str, calls: Option<Value>) -> Self {
        Self {
            role: "assistant".into(),
            content: (!text.is_empty()).then(|| text.to_string()),
            tool_calls: calls,
            tool_call_id: None,
            at: Some(now()),
        }
    }
    fn tool(id: &str, result: &str) -> Self {
        Self {
            role: "tool".into(),
            content: Some(result.into()),
            tool_calls: None,
            tool_call_id: Some(id.into()),
            at: Some(now()),
        }
    }
    /// 发给模型的形状：去掉 `at`。
    fn wire(&self) -> Value {
        let mut v = serde_json::to_value(self).unwrap_or_default();
        if let Some(o) = v.as_object_mut() {
            o.remove("at");
        }
        v
    }
}

fn now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

pub fn chat_path(ws: &crate::workspace::Workspace) -> std::path::PathBuf {
    ws.hilo().join("chat.json")
}

pub fn read_history(ws: &crate::workspace::Workspace) -> Vec<Msg> {
    std::fs::read_to_string(chat_path(ws))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn write_history(ws: &crate::workspace::Workspace, msgs: &[Msg]) {
    let p = chat_path(ws);
    if let Some(d) = p.parent() {
        let _ = std::fs::create_dir_all(d);
    }
    let _ = std::fs::write(p, serde_json::to_vec_pretty(msgs).unwrap_or_default());
}

/// 截断历史。
///
/// **从中间删，不是从头删。** 从头删会把最早那几轮（往往是用户交代的
/// 总目标）删掉，模型于是忘了自己在做什么。这里保留最近的 MAX_HISTORY 条，
/// 但**不能从一条 `tool` 消息开始** —— 那条没有对应的 assistant tool_calls，
/// 平台会直接 400。
fn truncate(msgs: &[Msg]) -> Vec<Msg> {
    if msgs.len() <= MAX_HISTORY {
        return msgs.to_vec();
    }
    let mut start = msgs.len() - MAX_HISTORY;
    while start < msgs.len() && msgs[start].role == "tool" {
        start += 1;
    }
    msgs[start..].to_vec()
}

// ---------------------------------------------------------------------------
// 运行状态
// ---------------------------------------------------------------------------

#[derive(Debug, Default)]
pub struct Agent {
    running: AtomicBool,
    stop: AtomicBool,
}

impl Agent {
    pub fn new() -> Self {
        Self::default()
    }
    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::Relaxed)
    }
    pub fn request_stop(&self) {
        self.stop.store(true, Ordering::Relaxed);
    }
}

#[derive(Debug, Deserialize)]
pub struct SendBody {
    pub message: String,
    /// 参考素材（工作区相对路径）。会附在用户消息后面告诉模型。
    #[serde(default)]
    pub attachments: Vec<String>,
}

pub async fn send(
    State(state): State<Arc<AppState>>,
    Json(b): Json<SendBody>,
) -> (axum::http::StatusCode, Json<Value>) {
    use axum::http::StatusCode;
    if b.message.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"ok":false,"error":"消息是空的"})),
        );
    }
    // **同一时刻只跑一轮。** 并发跑两轮的话，两边都在往同一份 chat.json
    // 写、都在改同一张画布，而模型各自看到的是对方改之前的状态。
    if state
        .agent
        .running
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return (
            StatusCode::CONFLICT,
            Json(json!({"ok":false,"error":"上一轮还在跑，等它结束或者点停止"})),
        );
    }
    state.agent.stop.store(false, Ordering::Relaxed);

    let mut text = b.message.trim().to_string();
    if !b.attachments.is_empty() {
        // 附件作为一行事实附在消息后面。**不塞进 system** —— 那样它会在
        // 之后每一轮都出现，模型会以为用户每次都传了图。
        text.push_str("\n\n（用户附上的参考素材：");
        text.push_str(&b.attachments.join("、"));
        text.push('）');
    }

    let st = state.clone();
    tokio::spawn(async move {
        run(&st, &text).await;
        st.agent.running.store(false, Ordering::Relaxed);
        st.events.publish("agent:done", json!({}));
    });

    (StatusCode::OK, Json(json!({ "ok": true })))
}

/// 跑一轮并**等它跑完**。飞书那条路要用：消息进来 → 跑 → 把结果发回去，
/// 中间必须能等到结果。
///
/// 和 `send` 的区别只是同步/异步：`send` 是给界面用的（发出去就返回，
/// 界面靠 /ws 看进度），这个是给需要拿结果的调用方用的。
pub async fn run_once(state: &Arc<AppState>, user_text: &str) {
    if state
        .agent
        .running
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return;
    }
    state.agent.stop.store(false, Ordering::Relaxed);
    run(state, user_text).await;
    state.agent.running.store(false, Ordering::Relaxed);
    state.events.publish("agent:done", json!({}));
}

async fn run(state: &Arc<AppState>, user_text: &str) {
    let mut msgs = read_history(&state.ws);
    msgs.push(Msg::user(user_text));
    write_history(&state.ws, &msgs);
    state
        .events
        .publish("agent:message", json!({ "role": "user" }));

    let tools = catalog::schema();

    for step in 0..MAX_STEPS {
        if state.agent.stop.load(Ordering::Relaxed) {
            msgs.push(Msg::assistant("（已停止）", None));
            write_history(&state.ws, &msgs);
            state
                .events
                .publish("agent:message", json!({ "role": "assistant" }));
            return;
        }

        let mut wire = vec![json!({ "role": "system", "content": SYSTEM })];
        wire.extend(truncate(&msgs).iter().map(Msg::wire));

        let turn = match maas_media::chat::complete_with_tools(
            &state.client,
            &state.media,
            &wire,
            &tools,
            MAX_TOKENS,
            TURN_TIMEOUT,
        )
        .await
        {
            Ok(t) => t,
            Err(e) => {
                // 模型这一轮失败**写进历史**，用户看得见，而且下次重试时
                // 模型知道上次断在哪。
                msgs.push(Msg::assistant(&format!("出错了：{}", e.message), None));
                write_history(&state.ws, &msgs);
                state
                    .events
                    .publish("agent:message", json!({ "role": "assistant" }));
                return;
            }
        };

        if turn.tool_calls.is_empty() {
            let text = if turn.content.is_empty() {
                // 既没文本也没工具调用 —— 多半是 max_tokens 被推理过程吃光。
                // 如实说，而不是回一条空消息让界面上什么都不显示。
                format!("（模型没有返回内容，finish_reason={}）", turn.finish_reason)
            } else {
                turn.content.clone()
            };
            msgs.push(Msg::assistant(&text, None));
            write_history(&state.ws, &msgs);
            state
                .events
                .publish("agent:message", json!({ "role": "assistant" }));
            return;
        }

        // assistant 那条**必须带上原始的 tool_calls**再追加 tool 结果，
        // 否则平台会说「tool 消息没有对应的 tool_calls」。
        let raw_calls: Vec<Value> = turn
            .tool_calls
            .iter()
            .map(|c| {
                json!({ "id": c.id, "type": "function",
                        "function": { "name": c.name, "arguments": c.arguments } })
            })
            .collect();
        msgs.push(Msg::assistant(&turn.content, Some(json!(raw_calls))));
        write_history(&state.ws, &msgs);
        if !turn.content.is_empty() {
            state
                .events
                .publish("agent:message", json!({ "role": "assistant" }));
        }

        for c in &turn.tool_calls {
            let id = format!("a{step}-{}", c.id);
            state.activity.push(crate::activity::Entry {
                tool: format!("hub_{}", c.name),
                phase: "start".into(),
                error: None,
                summary: Some(c.arguments.chars().take(400).collect()),
                id: id.clone(),
                at: now() * 1000,
            });
            state.events.publish(
                "tool:activity",
                json!({ "tool": format!("hub_{}", c.name), "phase": "start", "id": id }),
            );

            let result = dispatch::call(state, &c.name, &c.arguments).await;
            let ok = serde_json::from_str::<Value>(&result)
                .ok()
                .and_then(|v| v.get("ok").and_then(Value::as_bool))
                .unwrap_or(true);
            let phase = if ok { "ok" } else { "error" };
            state.activity.push(crate::activity::Entry {
                tool: format!("hub_{}", c.name),
                phase: phase.into(),
                error: (!ok).then(|| result.chars().take(200).collect()),
                summary: None,
                id: id.clone(),
                at: now() * 1000,
            });
            state.events.publish(
                "tool:activity",
                json!({ "tool": format!("hub_{}", c.name), "phase": phase, "id": id }),
            );

            msgs.push(Msg::tool(&c.id, &result));
        }
        write_history(&state.ws, &msgs);
    }

    msgs.push(Msg::assistant(
        &format!("这一轮调用工具超过 {MAX_STEPS} 次还没结束，先停下来。要不要换个说法？"),
        None,
    ));
    write_history(&state.ws, &msgs);
    state
        .events
        .publish("agent:message", json!({ "role": "assistant" }));
}

pub async fn messages(State(state): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({
        "ok": true,
        "running": state.agent.is_running(),
        "messages": read_history(&state.ws),
    }))
}

pub async fn stop(State(state): State<Arc<AppState>>) -> Json<Value> {
    state.agent.request_stop();
    Json(json!({ "ok": true }))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn m(role: &str) -> Msg {
        Msg {
            role: role.into(),
            content: Some("x".into()),
            tool_calls: None,
            tool_call_id: None,
            at: None,
        }
    }

    #[test]
    fn truncation_never_starts_on_a_tool_message() {
        // 以 tool 开头的话，那条没有对应的 assistant tool_calls，
        // 平台直接 400 —— 表现是"聊久了突然报错"。
        let mut v: Vec<Msg> = (0..MAX_HISTORY + 5).map(|_| m("tool")).collect();
        v.push(m("user"));
        let out = truncate(&v);
        assert_ne!(out.first().map(|x| x.role.as_str()), Some("tool"));
    }

    #[test]
    fn short_history_is_untouched() {
        let v: Vec<Msg> = (0..5).map(|_| m("user")).collect();
        assert_eq!(truncate(&v).len(), 5);
    }

    #[test]
    fn the_wire_shape_drops_our_own_field_but_keeps_tool_call_id() {
        // `at` 是我们加的，发过去平台可能拒；而 tool_call_id 丢了模型对不上。
        let w = Msg::tool("c1", "{}").wire();
        assert_eq!(w["tool_call_id"], "c1");
        assert!(w.get("at").is_none());
    }

    #[test]
    fn an_assistant_turn_with_only_tool_calls_has_no_content_key() {
        // 发一个 content:"" 上去，部分平台会当成"模型说了句空话"。
        let w = Msg::assistant("", Some(json!([{"id":"c1"}]))).wire();
        assert!(w.get("content").is_none());
        assert!(w.get("tool_calls").is_some());
    }
}
