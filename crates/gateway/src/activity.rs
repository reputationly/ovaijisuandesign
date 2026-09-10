//! agent 的工具活动流。`POST /api/activity` + `GET /api/activity`
//!
//! ## 这条流从哪来
//!
//! 每个 MCP 工具调用都经过我们自己的 hub server，所以那一层能如实上报
//! "谁被调了、成没成"。**由 MCP 层报而不是 gateway 自己从 HTTP 请求推断**：
//! 一个工具会打好几次 gateway（比如生成完还要建节点），按请求数出来的
//! 活动条数和 agent 实际做的事对不上。
//!
//! ## 为什么要留一份历史
//!
//! `/ws` 是广播，晚连接的客户端**什么都收不到**。刷新一次页面右栏就空了，
//! 而 agent 还在后台干活 —— 界面上看起来像是断了。所以这里存一个环形缓冲，
//! 前端连上先拉一次历史，再接实时流。
//!
//! 上限存在的理由和 `outcomes` 那边一样：长会话里工具调用是只增不减的，
//! 不封顶这块内存会一直涨。丢最旧的 —— 活动流是过程反馈，不是账本。

use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

use axum::Json;
use axum::extract::State;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::AppState;

/// 留多少条历史。右栏一屏也就十来条，200 足够翻回去看完整一轮。
const KEEP: usize = 200;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entry {
    /// **带 `hub_` 前缀的名字**，和官方的标签表对得上（表的键就是
    /// `hub_generate_image` 这种）。不带前缀的话前端每条都要自己拼。
    pub tool: String,
    /// `start` / `ok` / `error`。
    pub phase: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// 入参摘要。**只用于显示**，官方那栏也是折叠着的。
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub summary: Option<String>,
    /// 这次调用产出的文件，**工作区相对路径**。
    ///
    /// 官方在活动下面挂文件 chip（`chat.turnArtifacts`）。没有这个字段的话
    /// 前端只能显示"生成 1 张图片"，用户看不出出的是哪个文件 —— 而画布上
    /// 同时有好几张图时，对不上就等于没说。
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artifact: Option<String>,
    /// 同一次调用的 start 和 ok/error 用它配对。
    #[serde(default)]
    pub id: String,
    #[serde(rename = "at", default)]
    pub at: u64,
}

#[derive(Debug, Default)]
pub struct Activity {
    log: Mutex<VecDeque<Entry>>,
}

impl Activity {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn push(&self, e: Entry) {
        let Ok(mut log) = self.log.lock() else {
            return;
        };
        log.push_back(e);
        while log.len() > KEEP {
            log.pop_front();
        }
    }

    pub fn recent(&self) -> Vec<Entry> {
        self.log
            .lock()
            .map(|l| l.iter().cloned().collect())
            .unwrap_or_default()
    }

    #[cfg(test)]
    fn len(&self) -> usize {
        self.log.lock().map(|l| l.len()).unwrap_or(0)
    }
}

#[derive(Debug, Deserialize)]
pub struct Body {
    pub tool: String,
    #[serde(default)]
    pub phase: Option<String>,
    #[serde(default)]
    pub error: Option<String>,
    #[serde(default)]
    pub summary: Option<String>,
    /// 产出的文件，工作区相对路径。MCP 那条路也可以带上它。
    #[serde(default)]
    pub artifact: Option<String>,
    #[serde(default)]
    pub id: Option<String>,
}

fn now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// 上报一条。
///
/// **永远回 200。** 调用方是 MCP 层的 fire-and-forget，它不看返回值；
/// 而回 4xx 只会在日志里留下一串和真实问题无关的噪声。
pub async fn report(State(state): State<Arc<AppState>>, Json(b): Json<Body>) -> Json<Value> {
    if b.tool.trim().is_empty() {
        return Json(json!({ "ok": false }));
    }
    let e = Entry {
        tool: b.tool,
        phase: match b.phase.as_deref() {
            Some("ok") => "ok".into(),
            Some("error") => "error".into(),
            _ => "start".into(),
        },
        error: b.error,
        summary: b.summary,
        artifact: b.artifact.filter(|p| !p.trim().is_empty()),
        id: b.id.unwrap_or_default(),
        at: now(),
    };
    state.events.publish(
        "tool:activity",
        serde_json::to_value(&e).unwrap_or_default(),
    );
    state.activity.push(e);
    Json(json!({ "ok": true }))
}

/// 拉历史。前端连上 `/ws` 之前先要一次，否则刷新后右栏是空的。
pub async fn list(State(state): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({ "ok": true, "entries": state.activity.recent() }))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn body(tool: &str, phase: &str) -> Body {
        Body {
            tool: tool.into(),
            phase: Some(phase.into()),
            error: None,
            summary: None,
            artifact: None,
            id: Some("c1".into()),
        }
    }

    #[tokio::test]
    async fn a_call_shows_up_in_history_for_a_client_that_connects_late() {
        // /ws 是广播，晚连的客户端什么都收不到 —— 刷新一次右栏就空了，
        // 而 agent 还在后台干活，界面上看起来像断了。
        let (s, _d) = crate::tests::state_with_dir();
        let _ = report(State(s.clone()), Json(body("hub_generate_image", "start"))).await;
        let _ = report(State(s.clone()), Json(body("hub_generate_image", "ok"))).await;
        let r = list(State(s)).await;
        let all = r.0["entries"].as_array().unwrap();
        assert_eq!(all.len(), 2);
        assert_eq!(all[0]["tool"], "hub_generate_image");
        assert_eq!(all[0]["phase"], "start");
        assert_eq!(all[1]["phase"], "ok");
        assert_eq!(all[0]["id"], all[1]["id"], "同一次调用要能配对");
    }

    #[tokio::test]
    async fn an_unknown_phase_is_treated_as_a_start_not_a_success() {
        // 当成成功的话，一次还在跑的调用会立刻显示成"已完成"。
        let (s, _d) = crate::tests::state_with_dir();
        let _ = report(State(s.clone()), Json(body("hub_memory", "shrug"))).await;
        let r = list(State(s)).await;
        assert_eq!(r.0["entries"][0]["phase"], "start");
    }

    #[test]
    fn history_is_capped_and_drops_the_oldest() {
        // 长会话里工具调用只增不减。丢最旧的 —— 这是过程反馈，不是账本。
        let a = Activity::new();
        for i in 0..(KEEP + 10) {
            a.push(Entry {
                tool: format!("t{i}"),
                phase: "ok".into(),
                error: None,
                summary: None,
                artifact: None,
                id: String::new(),
                at: 0,
            });
        }
        assert_eq!(a.len(), KEEP);
        assert_eq!(a.recent()[0].tool, "t10", "最旧的被丢掉");
    }

    #[tokio::test]
    async fn an_artifact_path_survives_the_round_trip() {
        // 界面靠这个字段渲染文件 chip。丢了的话活动流只会说"生成 1 张图片"，
        // 而画布上同时有好几张图时，用户对不上是哪一张。
        let (s, _d) = crate::tests::state_with_dir();
        let mut b = body("hub_generate_image", "ok");
        b.artifact = Some("images/a.png".into());
        let _ = report(State(s.clone()), Json(b)).await;
        let r = list(State(s)).await;
        assert_eq!(r.0["entries"][0]["artifact"], "images/a.png");
    }

    #[tokio::test]
    async fn a_blank_artifact_is_dropped_rather_than_shown_as_an_empty_chip() {
        // 空串会渲染成一个没有名字的 chip，点了也没反应。
        let (s, _d) = crate::tests::state_with_dir();
        let mut b = body("hub_generate_image", "ok");
        b.artifact = Some("   ".into());
        let _ = report(State(s.clone()), Json(b)).await;
        let r = list(State(s)).await;
        assert!(r.0["entries"][0].get("artifact").is_none());
    }
}
