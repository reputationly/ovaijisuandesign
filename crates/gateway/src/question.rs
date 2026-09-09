//! agent 的决策点。`POST /api/question/ask`、`GET /api/question/pending`、
//! `POST /api/question/reply`
//!
//! ## 这是谁和谁之间的桥
//!
//! `question` 是 **opencode 自带的工具**（不是 MCP 的），协议定义在它的
//! `packages/schema/src/v1/question.ts`。agent 调它时 opencode 会阻塞，
//! 等一个回答。
//!
//! 但 opencode 的问答走的是它自己的 TUI / HTTP API，而我们的界面是画布 ——
//! 用户看不到题，也就答不了，agent 只能一直等到超时。这个模块把两边接上：
//!
//! ```text
//! agent → opencode question 工具 → （我们的 hook）→ POST /api/question/ask
//!                                                    ↓ 阻塞等
//!                                   界面轮询 pending，渲染成选择题
//!                                   用户提交 → POST /api/question/reply
//!                                                    ↓
//!                                   ask 返回 → agent 拿到答案继续
//! ```
//!
//! ## 为什么是阻塞的 HTTP 而不是事件
//!
//! `question` 的语义就是"停在这里等人"。用事件的话调用方要自己轮询结果、
//! 自己处理超时和重连 —— 而这里只有一个等待者，一次一个问题。
//! 阻塞一个请求最贴合语义，也最难写错。
//!
//! **一次只允许一个待答问题**：agent 在等回答，不会同时问第二次。
//! 真收到第二个就说明上一个已经废弃（比如 agent 被中断后重来），
//! 直接顶掉旧的 —— 留着旧的会让界面上出现一道永远也不会被消费的题。

use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tokio::sync::oneshot;

use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionOption {
    pub label: String,
    #[serde(default)]
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Info {
    pub question: String,
    #[serde(default)]
    pub header: String,
    #[serde(default)]
    pub options: Vec<QuestionOption>,
    #[serde(default)]
    pub multiple: Option<bool>,
    /// 允许自己填。**默认 true** —— 和 opencode 的定义一致。
    #[serde(default)]
    pub custom: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct AskBody {
    pub questions: Vec<Info>,
}

#[derive(Debug, Deserialize)]
pub struct ReplyBody {
    pub id: String,
    /// 每题一个答案数组（选中的 label）。`None` = 跳过。
    #[serde(default)]
    pub answers: Option<Vec<Vec<String>>>,
}

struct Pending {
    id: String,
    questions: Vec<Info>,
    tx: oneshot::Sender<Option<Vec<Vec<String>>>>,
}

#[derive(Default)]
pub struct Questions {
    pending: Mutex<Option<Pending>>,
}

impl Questions {
    pub fn new() -> Self {
        Self::default()
    }

    /// 界面轮询用。只读，不消费。
    fn snapshot(&self) -> Option<Value> {
        let g = self.pending.lock().unwrap();
        g.as_ref()
            .map(|p| json!({ "id": p.id, "questions": p.questions }))
    }
}

/// agent 侧：抛出问题并**阻塞等回答**。
pub async fn ask(
    State(state): State<Arc<AppState>>,
    Json(body): Json<AskBody>,
) -> (StatusCode, Json<Value>) {
    if body.questions.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "questions 是空的" })),
        );
    }
    let id = uuid::Uuid::new_v4().to_string();
    let (tx, rx) = oneshot::channel();
    {
        let mut g = state.questions.pending.lock().unwrap();
        // 顶掉上一个。留着的话界面上会出现一道永远不会被消费的题。
        if let Some(old) = g.take() {
            tracing::warn!("有新问题进来，废弃上一个 {}", old.id);
            let _ = old.tx.send(None);
        }
        *g = Some(Pending {
            id: id.clone(),
            questions: body.questions,
            tx,
        });
    }
    state.events.publish("question:asked", json!({ "id": id }));

    // 超时兜底。没有它的话，界面被关掉之后这个请求会永远挂着，
    // agent 那边也就永远停在这一步。
    let answers = match tokio::time::timeout(Duration::from_secs(600), rx).await {
        Ok(Ok(a)) => a,
        // 发送端被丢掉（被下一个问题顶掉）或超时，都按"没答"处理。
        _ => {
            let mut g = state.questions.pending.lock().unwrap();
            if g.as_ref().is_some_and(|p| p.id == id) {
                *g = None;
            }
            None
        }
    };

    (
        StatusCode::OK,
        Json(json!({ "ok": true, "id": id, "answers": answers })),
    )
}

/// 界面侧：有没有待答的题。
pub async fn pending(State(state): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({ "ok": true, "pending": state.questions.snapshot() }))
}

/// 界面侧：提交答案（`answers` 为 null = 跳过）。
pub async fn reply(
    State(state): State<Arc<AppState>>,
    Json(body): Json<ReplyBody>,
) -> (StatusCode, Json<Value>) {
    let taken = {
        let mut g = state.questions.pending.lock().unwrap();
        // id 必须对上。对不上说明界面拿的是一道已经被顶掉的旧题，
        // 照收会把答案交给一个不相干的等待者。
        match g.as_ref() {
            Some(p) if p.id == body.id => g.take(),
            _ => None,
        }
    };
    let Some(p) = taken else {
        return (
            StatusCode::CONFLICT,
            Json(json!({ "ok": false, "error": "这道题已经不在等待了" })),
        );
    };
    let _ = p.tx.send(body.answers);
    state
        .events
        .publish("question:replied", json!({ "id": body.id }));
    (StatusCode::OK, Json(json!({ "ok": true })))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn st() -> (Arc<AppState>, tempfile::TempDir) {
        crate::tests::state_with_dir()
    }

    fn one() -> AskBody {
        AskBody {
            questions: vec![Info {
                question: "用哪个比例".into(),
                header: "比例".into(),
                options: vec![QuestionOption {
                    label: "16:9".into(),
                    description: "横屏".into(),
                }],
                multiple: None,
                custom: None,
            }],
        }
    }

    #[tokio::test]
    async fn ask_blocks_until_the_ui_replies() {
        let (s, _d) = st();
        let s2 = s.clone();
        let h = tokio::spawn(async move { ask(State(s2), Json(one())).await });

        // 等它把题挂上去。
        let mut id = String::new();
        for _ in 0..50 {
            tokio::time::sleep(Duration::from_millis(10)).await;
            if let Some(p) = s.questions.snapshot() {
                id = p["id"].as_str().unwrap().to_string();
                break;
            }
        }
        assert!(!id.is_empty(), "题没挂上去");

        let r = reply(
            State(s.clone()),
            Json(ReplyBody {
                id,
                answers: Some(vec![vec!["16:9".into()]]),
            }),
        )
        .await;
        assert_eq!(r.0, StatusCode::OK);

        let (_, out) = h.await.unwrap();
        assert_eq!(out.0["answers"][0][0], "16:9");
        assert!(s.questions.snapshot().is_none(), "答完就不该还挂着");
    }

    #[tokio::test]
    async fn replying_to_a_stale_id_is_refused() {
        // 界面拿的是一道已经被顶掉的旧题。照收会把答案交给不相干的等待者 ——
        // agent 会按一个它没问过的问题的答案继续干活。
        let (s, _d) = st();
        let r = reply(
            State(s),
            Json(ReplyBody {
                id: "que_nonexistent".into(),
                answers: Some(vec![vec!["x".into()]]),
            }),
        )
        .await;
        assert_eq!(r.0, StatusCode::CONFLICT);
    }

    #[tokio::test]
    async fn a_second_question_supersedes_the_first() {
        let (s, _d) = st();
        let s2 = s.clone();
        let first = tokio::spawn(async move { ask(State(s2), Json(one())).await });
        for _ in 0..50 {
            tokio::time::sleep(Duration::from_millis(10)).await;
            if s.questions.snapshot().is_some() {
                break;
            }
        }
        let id1 = s.questions.snapshot().unwrap()["id"]
            .as_str()
            .unwrap()
            .to_string();

        let s3 = s.clone();
        let _second = tokio::spawn(async move { ask(State(s3), Json(one())).await });
        for _ in 0..50 {
            tokio::time::sleep(Duration::from_millis(10)).await;
            if s.questions
                .snapshot()
                .is_some_and(|p| p["id"] != id1.as_str())
            {
                break;
            }
        }
        // 第一个应该已经被放行（答案是 None），而不是一直挂着。
        let (_, out) = tokio::time::timeout(Duration::from_secs(2), first)
            .await
            .expect("第一个问题没被放行，agent 会永远卡住")
            .unwrap();
        assert!(out.0["answers"].is_null());
    }

    #[tokio::test]
    async fn an_empty_question_list_is_rejected() {
        let (s, _d) = st();
        let r = ask(State(s), Json(AskBody { questions: vec![] })).await;
        assert_eq!(r.0, StatusCode::BAD_REQUEST);
    }
}
