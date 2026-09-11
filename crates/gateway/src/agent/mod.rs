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

pub const SYSTEM: &str = "\
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
    /// 这一轮用户在界面上选的画幅。**派发工具时兜底用。**
    ///
    /// ## 为什么不能只靠 turn_hint
    ///
    /// 画幅是通过一句提示词告诉模型的（「【画幅】比例 1:1 分辨率 1K」），
    /// 指望它原样转述进工具参数 —— **实测它会丢**。用户选了 1:1，模型调
    /// `generate_video` 时只带了 prompt / duration / first_frame_image,
    /// 于是我们不传 size，平台按首帧图自己定，出来一个 16:9 的视频。
    ///
    /// 用户在界面上选的东西是**已知事实**,不该经过模型这一道转述。
    /// 模型显式给了就用模型的（它可能有更好的理由，比如按参考图的比例），
    /// 没给就用这里的。
    turn: std::sync::Mutex<TurnParams>,
}

/// 一轮里用户在界面上选定的生成参数。
#[derive(Debug, Clone, Default)]
pub struct TurnParams {
    pub aspect_ratio: Option<String>,
    pub resolution: Option<String>,
    pub duration: Option<u32>,
}

impl Agent {
    pub fn new() -> Self {
        Self::default()
    }
    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::Relaxed)
    }
    /// 记下这一轮的界面选项。`send` 在开跑前调。
    pub fn set_turn(&self, p: TurnParams) {
        if let Ok(mut t) = self.turn.lock() {
            *t = p;
        }
    }
    pub fn turn_params(&self) -> TurnParams {
        self.turn.lock().map(|t| t.clone()).unwrap_or_default()
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
    /// Agent 模式。官方的 `chat.mode.*`：
    ///
    /// - `auto`（默认）：`自动完成生成等操作，减少中途打断。`
    /// - `ask`：`执行生成等关键操作前，先询问你。`
    ///
    /// 走系统提示词那条路 —— 模型手上有 `question` 工具，这里只是告诉它
    /// 什么时候该用。硬拦在 dispatch 里也能做，但那样模型不知道自己被拦了，
    /// 只会看到一个莫名其妙的失败。
    #[serde(default)]
    pub mode: Option<String>,
    /// 这一轮允许用哪些模型。官方的 `chat.mediaModels`：
    /// `勾选后，Agent 可在任务中调用这些模型；未勾选的模型不会被使用。`
    #[serde(default)]
    pub models: Vec<String>,
    /// 画幅比例和分辨率。**之前界面上选了但从来没传** —— 用户选 16:9
    /// 出来还是方图，而且不报错。
    #[serde(default)]
    pub aspect_ratio: Option<String>,
    #[serde(default)]
    pub resolution: Option<String>,
    /// 视频时长，秒。同样**两条路都走**：提示词让模型知道，
    /// `TurnParams` 在派发时兜底。
    #[serde(default)]
    pub duration: Option<u32>,
}

/// 把这一轮的设置拼成一段追加给模型的话。
///
/// **不塞进 SYSTEM 常量**：那是每轮都一样的部分，而这些是这一条消息的
/// 设置。混在一起的话，改设置要重建整段系统提示词，而历史里那些旧消息
/// 会显得像是当初就用了新设置。
fn turn_hint(b: &SendBody) -> String {
    let mut out = Vec::new();
    if b.mode.as_deref() == Some("ask") {
        out.push(
            "【这一轮用「询问」模式】执行生成等关键操作**之前**，先用 question 工具\
             把方案告诉用户并等他确认。不要直接开始生成。"
                .to_string(),
        );
    }
    if !b.models.is_empty() {
        out.push(format!(
            "【只用这些模型】{}。没列出来的不要用；这一轮里没有合适的就如实说，\
             不要换一个用户没勾的顶上。",
            b.models.join("、")
        ));
    }
    if let Some(d) = b.duration {
        out.push(format!("【时长】{d} 秒。生成视频时按这个传。"));
    }
    let ar = b.aspect_ratio.as_deref().unwrap_or("").trim();
    let res = b.resolution.as_deref().unwrap_or("").trim();
    if !ar.is_empty() || !res.is_empty() {
        out.push(format!(
            "【画幅】{}{}。调生成工具时按这个传，用户在界面上选的就是它。",
            if ar.is_empty() {
                String::new()
            } else {
                format!("比例 {ar}")
            },
            if res.is_empty() {
                String::new()
            } else {
                format!(" 分辨率 {res}")
            },
        ));
    }
    out.join("\n")
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
    // 这一轮的设置（Agent 模式 / 允许的模型 / 画幅）跟着这条消息走，
    // 不进 system —— 理由同上：进了 system 就会在之后每一轮都生效，
    // 而用户改设置之后历史里那些旧消息会显得像当初就用了新设置。
    // 界面上选的画幅**同时**走两条路：一条是提示词（让模型知道），
    // 一条是这里（派发时兜底）。只走提示词的话模型会丢，见 `TurnParams`。
    state.agent.set_turn(TurnParams {
        aspect_ratio: b.aspect_ratio.clone().filter(|s| !s.trim().is_empty()),
        resolution: b.resolution.clone().filter(|s| !s.trim().is_empty()),
        duration: b.duration,
    });

    let hint = turn_hint(&b);
    if !hint.is_empty() {
        text.push_str("\n\n");
        text.push_str(&hint);
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

/// 这段回复是不是在**声称自己已经产出了东西**。
///
/// ## 为什么需要这个判断
///
/// 模型有时候不调工具，直接用文字把生成过程演一遍：
///
/// > 【生成图片】- 画面：… - 比例：16:9（正在生成中……）
/// > 图已经生成好了，如果构图想调整直接说就行。
///
/// 画布上什么都没有，用户盯着看半天才发现被骗了。实测这不是偶发：
/// **一旦编过一次，那条回复留在历史里，模型会学着继续编** ——
/// 干净历史下 10/10 会正常调工具，历史里放一条编造的回复之后掉到 7/10。
///
/// 判据只认"已经做完"这类**完成时**的说法。**不认「我来生成」「正在生成」**
/// 这种进行时 —— 那可能是模型先说一句再调工具，是正常的。
fn claims_completion(text: &str) -> bool {
    const DONE: [&str; 10] = [
        "已经生成",
        "已生成",
        "生成好了",
        "生成完成",
        "已经做好",
        "做好了",
        "已经放到画布",
        "放到画布上了",
        "已添加到画布",
        "已经完成",
    ];
    DONE.iter().any(|k| text.contains(k))
}

/// 发现模型在编时，塞给它的纠正。**不进可见历史** —— 用户不需要看见
/// 我们在后台跟模型拌嘴，他要的是那张图。
const NUDGE: &str = "\
你刚才的回复说已经生成完成，但你**没有调用任何工具**,所以画布上什么都没有。\
不要用文字描述生成过程。现在真正调用对应的工具把它做出来。";

async fn run(state: &Arc<AppState>, user_text: &str) {
    let mut msgs = read_history(&state.ws);
    msgs.push(Msg::user(user_text));
    write_history(&state.ws, &msgs);
    state
        .events
        .publish("agent:message", json!({ "role": "user" }));

    let tools = catalog::schema();
    // 这次运行里有没有真的调过工具。
    let mut used_tool = false;
    // 已经纠正过一次没有。**只纠正一次** —— 纠正两次还在编的话，
    // 再来一轮也是白花用户的时间和 token。
    let mut nudged = false;
    // 只在这次请求里带上、不写进 chat.json 的临时消息。
    let mut scratch: Vec<Value> = Vec::new();

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
        wire.extend(scratch.iter().cloned());

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
            // **模型在编。** 说自己做完了，但这次运行一个工具都没调过 ——
            // 画布上什么都没有。给它一条纠正再试一次。
            //
            // 纠正和那条编造的回复都**不写进 chat.json**：写进去的话它们会
            // 留在历史里，而实测正是历史里的编造回复让模型继续编
            // （10/10 → 7/10）。用户也不需要看见我们在后台跟模型拌嘴。
            if !used_tool && !nudged && claims_completion(&turn.content) {
                nudged = true;
                tracing::warn!("模型声称已完成但没有调用任何工具，重试一次");
                scratch.push(json!({ "role": "assistant", "content": turn.content }));
                scratch.push(json!({ "role": "user", "content": NUDGE }));
                continue;
            }

            let text = if turn.content.is_empty() {
                // 既没文本也没工具调用 —— 多半是 max_tokens 被推理过程吃光。
                // 如实说，而不是回一条空消息让界面上什么都不显示。
                format!("（模型没有返回内容，finish_reason={}）", turn.finish_reason)
            } else if !used_tool && claims_completion(&turn.content) {
                // 纠正过一次还在编。**不能让这句谎话原样显示** —— 用户会
                // 对着空画布等下去。保留原文（改写模型输出更糟），后面补一句
                // 说清楚实际状态。
                format!(
                    "{}\n\n——（这一轮没有实际调用任何生成工具，画布上不会出现新内容。可以再说一次，或换个说法。）",
                    turn.content
                )
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

        used_tool = true;
        // 调过工具之后那些临时消息就没意义了，清掉免得越滚越长。
        scratch.clear();

        for c in &turn.tool_calls {
            // **模型偶尔会编一个不存在的工具名**（实测见过 `example_function_name`
            // 这种模板占位符）。这种调用要照常派发 —— dispatch 会回
            // 「没有 X 这个工具，可用的是…」，模型据此当场改对。
            //
            // 但**不往活动流里记**：活动流是"agent 做了什么"，而一个不存在
            // 的工具什么都没做。记进去的话用户看到一个红叉，以为出了故障，
            // 实际上那一轮是成功的。真正跑过并失败的工具照常记。
            let known = crate::agent::catalog::all()
                .iter()
                .any(|t| t.name == c.name);
            let id = format!("a{step}-{}", c.id);
            if known {
                state.activity.push(crate::activity::Entry {
                    tool: format!("hub_{}", c.name),
                    phase: "start".into(),
                    error: None,
                    summary: Some(c.arguments.chars().take(400).collect()),
                    artifact: None,
                    id: id.clone(),
                    at: now() * 1000,
                });
                state.events.publish(
                    "tool:activity",
                    json!({ "tool": format!("hub_{}", c.name), "phase": "start", "id": id }),
                );
            }

            let result = dispatch::call(state, &c.name, &c.arguments).await;
            let ok = serde_json::from_str::<Value>(&result)
                .ok()
                .and_then(|v| v.get("ok").and_then(Value::as_bool))
                .unwrap_or(true);
            let phase = if ok { "ok" } else { "error" };
            // 产物路径给界面用来渲染文件 chip。**只在成功时取** ——
            // 失败的结果里也可能带 path（"已生成但建节点失败"那种），
            // 但那条活动是红的，再挂一个成品 chip 会自相矛盾。
            let artifact = ok
                .then(|| {
                    serde_json::from_str::<Value>(&result)
                        .ok()?
                        .get("path")?
                        .as_str()
                        .filter(|p| !p.is_empty())
                        .map(str::to_string)
                })
                .flatten();
            if known {
                state.activity.push(crate::activity::Entry {
                    tool: format!("hub_{}", c.name),
                    phase: phase.into(),
                    error: (!ok).then(|| result.chars().take(200).collect()),
                    summary: None,
                    artifact: artifact.clone(),
                    id: id.clone(),
                    at: now() * 1000,
                });
                state.events.publish(
                    "tool:activity",
                    json!({ "tool": format!("hub_{}", c.name), "phase": phase, "id": id,
                            "artifact": artifact }),
                );
            }

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

#[cfg(test)]
mod turn_hint_tests {
    use super::*;

    fn body() -> SendBody {
        SendBody {
            message: "出一张图".into(),
            attachments: vec![],
            mode: None,
            models: vec![],
            aspect_ratio: None,
            resolution: None,
            duration: None,
        }
    }

    #[test]
    fn the_default_turn_adds_nothing() {
        // 默认（自动模式、不限模型、不指定画幅）不该往消息里塞任何东西 ——
        // 每条消息都拖一段设置说明会稀释用户真正说的话。
        assert_eq!(turn_hint(&body()), "");
        let mut b = body();
        b.mode = Some("auto".into());
        assert_eq!(turn_hint(&b), "");
    }

    #[test]
    fn ask_mode_tells_the_model_to_confirm_first() {
        // 官方的 chat.mode.askDesc =「执行生成等关键操作前，先询问你。」
        // 这段话是这个开关的**全部实现** —— 写漏了开关就是个摆设。
        let mut b = body();
        b.mode = Some("ask".into());
        let h = turn_hint(&b);
        assert!(h.contains("询问"), "{h}");
        assert!(
            h.contains("question"),
            "要点名那个工具，否则模型不知道用什么问：{h}"
        );
    }

    #[test]
    fn a_model_whitelist_forbids_substituting() {
        // 官方：「未勾选的模型不会被使用」。只说"用这些"不说"别换"的话，
        // 模型找不到合适的会自己挑一个顶上 —— 而那正是用户勾选要排除的。
        let mut b = body();
        b.models = vec!["qwen-image".into(), "z-image".into()];
        let h = turn_hint(&b);
        assert!(h.contains("qwen-image") && h.contains("z-image"), "{h}");
        assert!(h.contains("不要用") || h.contains("不要换"), "{h}");
    }

    #[test]
    fn the_aspect_ratio_actually_reaches_the_model() {
        // 界面上那两个下拉之前**选了从来不传** —— 用户选 16:9 出来还是方图，
        // 而且不报错。
        let mut b = body();
        b.aspect_ratio = Some("16:9".into());
        b.resolution = Some("2K".into());
        let h = turn_hint(&b);
        assert!(h.contains("16:9") && h.contains("2K"), "{h}");
    }

    #[test]
    fn only_the_fields_that_were_set_show_up() {
        // 只选了比例没选分辨率时，不该出现一个空的「分辨率 」。
        let mut b = body();
        b.aspect_ratio = Some("21:9".into());
        let h = turn_hint(&b);
        assert!(h.contains("21:9"));
        assert!(!h.contains("分辨率"), "没设的字段不该出现：{h}");
        // 空串和只有空格都当没设。
        let mut b2 = body();
        b2.aspect_ratio = Some("  ".into());
        assert_eq!(turn_hint(&b2), "");
    }
}

#[cfg(test)]
mod fabrication_tests {
    use super::claims_completion;

    /// 用户实际遇到的那一条。模型把生成过程用文字演了一遍，画布上什么都没有。
    #[test]
    fn the_real_fabricated_reply_is_caught() {
        let text = "好，出图——一只小白兔，宫崎骏画风，阳光草地玩耍。\n\n\
                    【生成图片】\n- 画面：一只毛茸茸的小白兔…\n- 比例：16:9\n\n\
                    （正在生成中……）\n\n\
                    图已经生成好了，如果构图或氛围想调整——比如换个角度——直接说就行。";
        assert!(claims_completion(text));
    }

    #[test]
    fn other_completion_claims_are_caught() {
        for t in [
            "已经生成了三张图",
            "图片生成完成",
            "已经放到画布上了",
            "做好了，看看效果",
            "已添加到画布",
        ] {
            assert!(claims_completion(t), "漏了: {t}");
        }
    }

    /// **进行时不算。** 模型先说一句「我来生成」再调工具是完全正常的流程；
    /// 把它判成编造的话，每一次正常生成都会被无谓地重试一遍。
    #[test]
    fn present_tense_is_not_a_claim() {
        for t in [
            "我来生成一张小白兔的图",
            "正在生成中，稍等",
            "这就去生成",
            "好的，马上做",
        ] {
            assert!(!claims_completion(t), "误判: {t}");
        }
    }

    /// 解释怎么用也不算。用户问「怎么生成图片」时模型会讲流程。
    #[test]
    fn explaining_how_to_is_not_a_claim() {
        assert!(!claims_completion(
            "你可以直接说「生成一张小白兔的图」，我会调用生图工具。"
        ));
    }
}
