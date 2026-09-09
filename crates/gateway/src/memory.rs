//! agent 的跨轮记忆，和 Stage 结果回报。对应 `memory` / `report_outcome`。
//!
//! ## memory
//!
//! 一个 `action` 参数分派（`write` / `read` / `search` / `delete` / `list`）——
//! **官方就是这么设计的**，一个工具带动作而不是五个工具。跟着它：
//! agent 提示词里写的是 `hub_memory` 加 action，拆成五个它一个都调不到。
//!
//! 存在 `.hilo/memory/<scope>/<name>.json`。按 scope 分目录，
//! 因为 `project` 和 `global` 的清理时机不一样 —— 换个工作区，project 那批
//! 就该跟着走。
//!
//! ## 为什么不做成一个大 JSON
//!
//! 一条一个文件。大 JSON 的问题是并发写：两个 agent 同时写不同的记忆，
//! 后写的会把前面那条覆盖掉 —— 而它们各自都"成功"了。

use std::path::PathBuf;
use std::sync::Arc;

use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entry {
    pub name: String,
    #[serde(default)]
    pub body: String,
    #[serde(default)]
    pub description: String,
    /// `note` / `preference` / `asset` …。官方没有固定枚举，原样存。
    #[serde(rename = "type", default)]
    pub kind: String,
    #[serde(rename = "assetUri", default, skip_serializing_if = "Option::is_none")]
    pub asset_uri: Option<String>,
    #[serde(
        rename = "assetModality",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub asset_modality: Option<String>,
    #[serde(rename = "updatedAt", default)]
    pub updated_at: u64,
}

#[derive(Debug, Deserialize)]
pub struct Body {
    /// `write` / `read` / `search` / `delete` / `list`
    pub action: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub body: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(rename = "type", default)]
    pub kind: Option<String>,
    #[serde(default)]
    pub scope: Option<String>,
    #[serde(default)]
    pub query: Option<String>,
    #[serde(rename = "assetUri", default)]
    pub asset_uri: Option<String>,
    #[serde(rename = "assetModality", default)]
    pub asset_modality: Option<String>,
    /// 官方按项目分；我们跟着工作区走，接受但忽略。
    #[serde(rename = "projectRoot", default)]
    pub project_root: Option<String>,
}

fn now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// scope 会拼进路径，只允许我们认识的两个值。
fn scope_of(s: Option<&str>) -> &'static str {
    match s {
        Some("global") => "global",
        _ => "project",
    }
}

/// 记忆名会拼进文件名，必须挡住 `../`。
fn file_of(ws: &crate::workspace::Workspace, scope: &str, name: &str) -> Option<PathBuf> {
    let ok = !name.is_empty()
        && name.len() <= 96
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
        && !name.contains("..");
    ok.then(|| {
        ws.hilo()
            .join("memory")
            .join(scope)
            .join(format!("{name}.json"))
    })
}

fn dir_of(ws: &crate::workspace::Workspace, scope: &str) -> PathBuf {
    ws.hilo().join("memory").join(scope)
}

fn load_all(ws: &crate::workspace::Workspace, scope: &str) -> Vec<Entry> {
    let Ok(rd) = std::fs::read_dir(dir_of(ws, scope)) else {
        return vec![];
    };
    let mut v: Vec<Entry> = rd
        .flatten()
        .filter(|e| e.path().extension().is_some_and(|x| x == "json"))
        .filter_map(|e| std::fs::read_to_string(e.path()).ok())
        .filter_map(|s| serde_json::from_str(&s).ok())
        .collect();
    // 最近改的排前面。agent 通常要的是最新的那几条。
    v.sort_by_key(|e| std::cmp::Reverse(e.updated_at));
    v
}

pub async fn memory(
    State(state): State<Arc<AppState>>,
    Json(b): Json<Body>,
) -> (StatusCode, Json<Value>) {
    let scope = scope_of(b.scope.as_deref());
    let ws = &state.ws;

    match b.action.as_str() {
        "write" => {
            let Some(name) = b.name.as_deref() else {
                return bad("write 要带 name");
            };
            let Some(path) = file_of(ws, scope, name) else {
                return bad("name 不合法");
            };
            let e = Entry {
                name: name.to_string(),
                body: b.body.unwrap_or_default(),
                description: b.description.unwrap_or_default(),
                kind: b.kind.unwrap_or_else(|| "note".into()),
                asset_uri: b.asset_uri,
                asset_modality: b.asset_modality,
                updated_at: now(),
            };
            if let Some(d) = path.parent() {
                let _ = std::fs::create_dir_all(d);
            }
            match std::fs::write(&path, serde_json::to_vec_pretty(&e).unwrap_or_default()) {
                Ok(()) => ok(json!({ "written": e.name, "scope": scope })),
                Err(err) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "ok": false, "error": err.to_string() })),
                ),
            }
        }
        "read" => {
            let Some(name) = b.name.as_deref() else {
                return bad("read 要带 name");
            };
            let entry = file_of(ws, scope, name)
                .and_then(|p| std::fs::read_to_string(p).ok())
                .and_then(|s| serde_json::from_str::<Entry>(&s).ok());
            match entry {
                Some(e) => ok(json!({ "entry": e })),
                // 查不到不是错误 —— agent 会先试着读一条可能不存在的记忆。
                None => ok(json!({ "entry": Value::Null })),
            }
        }
        "list" => ok(json!({ "entries": load_all(ws, scope), "scope": scope })),
        "search" => {
            let q = b.query.unwrap_or_default().to_lowercase();
            if q.is_empty() {
                return bad("search 要带 query");
            }
            // 名字、描述、正文都搜。只搜正文的话，一条"描述写得好、正文是
            // 结构化数据"的记忆永远搜不到。
            let hits: Vec<Entry> = load_all(ws, scope)
                .into_iter()
                .filter(|e| {
                    e.name.to_lowercase().contains(&q)
                        || e.description.to_lowercase().contains(&q)
                        || e.body.to_lowercase().contains(&q)
                })
                .collect();
            ok(json!({ "entries": hits, "scope": scope }))
        }
        "delete" => {
            let Some(name) = b.name.as_deref() else {
                return bad("delete 要带 name");
            };
            let Some(path) = file_of(ws, scope, name) else {
                return bad("name 不合法");
            };
            let existed = path.exists();
            let _ = std::fs::remove_file(&path);
            ok(json!({ "deleted": existed }))
        }
        other => bad(&format!(
            "不认识的 action: {other}。可用的是 write / read / list / search / delete"
        )),
    }
}

// ==================== report_outcome ====================

#[derive(Debug, Deserialize)]
pub struct OutcomeBody {
    /// 一批结果。**形状原样存** —— 官方没有固定 schema，
    /// 我们解释它只会在它变化时坏掉。
    pub outcomes: Vec<Value>,
}

/// Stage 结果回报。和 `plan_*` 配套：executor 做完一段之后把结果记下来，
/// planner 下一轮据此决定要不要改计划。
///
/// **追加而不是覆盖**：一次运行里会报多次，覆盖的话只剩最后一条，
/// 而 planner 要看的是整条轨迹。
pub async fn report_outcome(
    State(state): State<Arc<AppState>>,
    Json(b): Json<OutcomeBody>,
) -> (StatusCode, Json<Value>) {
    if b.outcomes.is_empty() {
        return bad("outcomes 是空的");
    }
    let path = state.ws.hilo().join("outcomes.json");
    let mut all: Vec<Value> = std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let n = b.outcomes.len();
    for mut o in b.outcomes {
        if let Some(m) = o.as_object_mut() {
            m.insert("reportedAt".into(), json!(now()));
        }
        all.push(o);
    }
    // 只留最近 200 条。不封顶的话这个文件会随着长会话一直涨，
    // 而每次报都要整份读写。
    let total = all.len();
    if total > 200 {
        all.drain(0..total - 200);
    }
    if let Some(d) = path.parent() {
        let _ = std::fs::create_dir_all(d);
    }
    if let Err(e) = std::fs::write(&path, serde_json::to_vec_pretty(&all).unwrap_or_default()) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": e.to_string() })),
        );
    }
    state
        .events
        .publish("outcome:reported", json!({ "count": n }));
    ok(json!({ "recorded": n, "total": all.len() }))
}

fn ok(mut v: Value) -> (StatusCode, Json<Value>) {
    if let Some(m) = v.as_object_mut() {
        m.insert("ok".into(), json!(true));
    }
    (StatusCode::OK, Json(v))
}
fn bad(msg: &str) -> (StatusCode, Json<Value>) {
    (
        StatusCode::BAD_REQUEST,
        Json(json!({ "ok": false, "error": msg })),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn st() -> (Arc<AppState>, tempfile::TempDir) {
        crate::tests::state_with_dir()
    }

    fn call(b: Value) -> Body {
        serde_json::from_value(b).unwrap()
    }

    #[tokio::test]
    async fn write_then_read_round_trips() {
        let (s, _d) = st();
        let r = memory(
            State(s.clone()),
            Json(call(
                json!({ "action": "write", "name": "style", "body": "偏暖色",
                              "description": "用户的配色偏好", "type": "preference" }),
            )),
        )
        .await;
        assert_eq!(r.0, StatusCode::OK);
        let r = memory(
            State(s),
            Json(call(json!({ "action": "read", "name": "style" }))),
        )
        .await;
        assert_eq!(r.1.0["entry"]["body"], "偏暖色");
        assert_eq!(r.1.0["entry"]["type"], "preference");
    }

    #[tokio::test]
    async fn reading_a_missing_entry_is_not_an_error() {
        // agent 会先试着读一条可能不存在的记忆。回 404 的话它会当成一次失败去重试。
        let (s, _d) = st();
        let r = memory(
            State(s),
            Json(call(json!({ "action": "read", "name": "nope" }))),
        )
        .await;
        assert_eq!(r.0, StatusCode::OK);
        assert!(r.1.0["entry"].is_null());
    }

    #[tokio::test]
    async fn search_covers_name_description_and_body() {
        // 只搜正文的话，一条"描述写得好、正文是结构化数据"的记忆永远搜不到。
        let (s, _d) = st();
        for (n, d, b) in [
            ("a", "配色偏好", "warm"),
            ("palette-b", "无关", "无关"),
            ("c", "无关", "这里提到配色"),
        ] {
            let _ = memory(
                State(s.clone()),
                Json(call(
                    json!({ "action": "write", "name": n, "description": d, "body": b }),
                )),
            )
            .await;
        }
        let hit = |q: &str| {
            let s = s.clone();
            let q = q.to_string();
            async move {
                memory(
                    State(s),
                    Json(call(json!({ "action": "search", "query": q }))),
                )
                .await
                .1
                .0["entries"]
                    .as_array()
                    .unwrap()
                    .len()
            }
        };
        assert_eq!(hit("配色").await, 2, "描述和正文都要搜到");
        assert_eq!(hit("palette").await, 1, "名字也要搜到");
    }

    #[tokio::test]
    async fn scopes_do_not_leak_into_each_other() {
        // 换个工作区 project 那批就该跟着走，global 不该跟着变。
        let (s, _d) = st();
        let _ = memory(
            State(s.clone()),
            Json(call(
                json!({ "action": "write", "name": "x", "body": "p", "scope": "project" }),
            )),
        )
        .await;
        let _ = memory(
            State(s.clone()),
            Json(call(
                json!({ "action": "write", "name": "x", "body": "g", "scope": "global" }),
            )),
        )
        .await;
        let p = memory(
            State(s.clone()),
            Json(call(
                json!({ "action": "read", "name": "x", "scope": "project" }),
            )),
        )
        .await;
        let g = memory(
            State(s),
            Json(call(
                json!({ "action": "read", "name": "x", "scope": "global" }),
            )),
        )
        .await;
        assert_eq!(p.1.0["entry"]["body"], "p");
        assert_eq!(g.1.0["entry"]["body"], "g");
    }

    #[tokio::test]
    async fn a_name_cannot_escape_the_workspace() {
        let (s, _d) = st();
        let r = memory(
            State(s),
            Json(call(
                json!({ "action": "write", "name": "../../etc/passwd", "body": "x" }),
            )),
        )
        .await;
        assert_eq!(r.0, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn an_unknown_action_says_what_is_available() {
        let (s, _d) = st();
        let r = memory(State(s), Json(call(json!({ "action": "frobnicate" })))).await;
        assert_eq!(r.0, StatusCode::BAD_REQUEST);
        assert!(r.1.0["error"].as_str().unwrap().contains("write / read"));
    }

    #[tokio::test]
    async fn outcomes_append_instead_of_overwriting() {
        // 一次运行里会报多次。覆盖的话只剩最后一条，而 planner 要看整条轨迹。
        let (s, _d) = st();
        for i in 0..3 {
            let r = report_outcome(
                State(s.clone()),
                Json(OutcomeBody {
                    outcomes: vec![json!({ "stage": i })],
                }),
            )
            .await;
            assert_eq!(r.0, StatusCode::OK);
        }
        let raw = std::fs::read_to_string(s.ws.hilo().join("outcomes.json")).unwrap();
        let v: Vec<Value> = serde_json::from_str(&raw).unwrap();
        assert_eq!(v.len(), 3);
        assert!(v[0]["reportedAt"].is_number(), "要盖上时间戳");
    }

    #[tokio::test]
    async fn outcomes_are_capped() {
        // 不封顶的话这个文件会随长会话一直涨，而每次报都要整份读写。
        let (s, _d) = st();
        let batch: Vec<Value> = (0..250).map(|i| json!({ "i": i })).collect();
        let _ = report_outcome(State(s.clone()), Json(OutcomeBody { outcomes: batch })).await;
        let raw = std::fs::read_to_string(s.ws.hilo().join("outcomes.json")).unwrap();
        let v: Vec<Value> = serde_json::from_str(&raw).unwrap();
        assert_eq!(v.len(), 200);
        assert_eq!(v[199]["i"], 249, "留的应该是最近的那批");
    }
}
