//! 文本节点的读、搜、改。对应 `canvas_read_text` / `canvas_grep_text` /
//! `canvas_apply_text_edits`。
//!
//! ## 为什么要有"按片段改"而不是整份覆盖
//!
//! 我们已经有 `canvas_write_node`（整份写 + `expectedContentHash`）。但让
//! agent 改一篇长文里的一句话时，整份覆盖意味着它要把**全文重新吐一遍** ——
//! 几千字的文本每次改一个错别字都要重写，既慢又极容易在重写时改动别处
//! （LLM 复述长文本不是无损的）。
//!
//! `apply_text_edits` 让它只提交"把 A 换成 B"，其余部分**根本不经过模型**。
//!
//! ## 三条必须做对的
//!
//! - **`oldText` 必须唯一**。出现多次时不知道改哪一处，猜一个就是改错地方，
//!   而调用方收到的是成功。
//! - **一批 edits 要么全成要么全不成**。改一半就落盘的话，文本会停在一个
//!   agent 和用户都没预期的中间状态。
//! - **`expectedContentHash` 照旧**。这条路和整份写共用同一份并发保护，
//!   不能因为"只是改一小段"就跳过。

use std::sync::Arc;

use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::Deserialize;
use serde_json::{Value, json};

use crate::{AppState, canvas};

#[derive(Debug, Deserialize)]
pub struct ReadBody {
    #[serde(rename = "nodeId")]
    pub node_id: String,
    /// 从第几行开始（0 基）。
    #[serde(rename = "offsetLine", default)]
    pub offset_line: Option<usize>,
    #[serde(rename = "limitLines", default)]
    pub limit_lines: Option<usize>,
}

fn text_of(state: &AppState, node_id: &str) -> Option<(String, String)> {
    let file = canvas::read(&state.ws.canvas_path());
    let n = file.nodes.iter().find(|n| n.id == node_id)?;
    let asset = state.assets.by_id(n.asset_id.as_deref()?)?;
    let path = state.ws.resolve(&asset.path)?;
    let content = std::fs::read_to_string(path).ok()?;
    let hash = crate::api_canvas::sha256(&content);
    Some((content, hash))
}

pub async fn read_text(
    State(state): State<Arc<AppState>>,
    Json(body): Json<ReadBody>,
) -> (StatusCode, Json<Value>) {
    let Some((content, hash)) = text_of(&state, &body.node_id) else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "ok": false, "error": "没有这个文本节点，或者它没有内容" })),
        );
    };
    let lines: Vec<&str> = content.lines().collect();
    let total = lines.len();
    let start = body.offset_line.unwrap_or(0).min(total);
    let end = body
        .limit_lines
        .map(|l| (start + l).min(total))
        .unwrap_or(total);
    (
        StatusCode::OK,
        Json(json!({
            "ok": true,
            "nodeId": body.node_id,
            "content": lines[start..end].join("\n"),
            // 分段读时要把边界告诉调用方，否则它无从知道自己只拿到一部分。
            "offsetLine": start,
            "lineCount": end - start,
            "totalLines": total,
            "expectedContentHash": hash,
        })),
    )
}

#[derive(Debug, Deserialize)]
pub struct GrepBody {
    pub query: String,
    /// 只搜某一个节点。不给就搜所有文本节点。
    #[serde(rename = "nodeId", default)]
    pub node_id: Option<String>,
    #[serde(default)]
    pub regex: Option<bool>,
    #[serde(rename = "maxMatches", default)]
    pub max_matches: Option<usize>,
    #[serde(rename = "contextBefore", default)]
    pub context_before: Option<usize>,
    #[serde(rename = "contextAfter", default)]
    pub context_after: Option<usize>,
}

pub async fn grep_text(
    State(state): State<Arc<AppState>>,
    Json(body): Json<GrepBody>,
) -> (StatusCode, Json<Value>) {
    if body.query.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "query 是空的" })),
        );
    }
    // 正则由调用方决定。**编译失败要如实报错**，不要退化成字面量搜索 ——
    // 那样 agent 会拿到一批看起来正常、其实语义完全不同的结果。
    let re = if body.regex.unwrap_or(false) {
        match regex_lite::Regex::new(&body.query) {
            Ok(r) => Some(r),
            Err(e) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "ok": false, "error": format!("正则不合法: {e}") })),
                );
            }
        }
    } else {
        None
    };

    let file = canvas::read(&state.ws.canvas_path());
    let max = body.max_matches.unwrap_or(50);
    let before = body.context_before.unwrap_or(0);
    let after = body.context_after.unwrap_or(0);
    let mut matches = Vec::new();

    for n in file.nodes.iter().filter(|n| n.kind == "text") {
        if let Some(want) = &body.node_id
            && &n.id != want
        {
            continue;
        }
        let Some((content, _)) = text_of(&state, &n.id) else {
            continue;
        };
        let lines: Vec<&str> = content.lines().collect();
        for (i, line) in lines.iter().enumerate() {
            let hit = match &re {
                Some(r) => r.is_match(line),
                None => line.contains(&body.query),
            };
            if !hit {
                continue;
            }
            let lo = i.saturating_sub(before);
            let hi = (i + after + 1).min(lines.len());
            matches.push(json!({
                "nodeId": n.id,
                "line": i,
                "text": line,
                "context": lines[lo..hi].join("\n"),
            }));
            if matches.len() >= max {
                break;
            }
        }
        if matches.len() >= max {
            break;
        }
    }
    (
        StatusCode::OK,
        // `truncated` 必须告诉调用方：不说的话 agent 会以为这就是全部命中，
        // 然后基于一个不完整的结果做判断。
        Json(json!({ "ok": true, "matches": matches, "truncated": matches.len() >= max })),
    )
}

#[derive(Debug, Deserialize)]
pub struct Edit {
    #[serde(rename = "oldText")]
    pub old_text: String,
    #[serde(rename = "newText")]
    pub new_text: String,
}

#[derive(Debug, Deserialize)]
pub struct EditsBody {
    #[serde(rename = "nodeId")]
    pub node_id: String,
    pub edits: Vec<Edit>,
    #[serde(rename = "expectedContentHash", default)]
    pub expected_content_hash: Option<String>,
    #[serde(rename = "editSessionId", default)]
    pub edit_session_id: Option<String>,
    #[serde(rename = "requestId", default)]
    pub request_id: Option<String>,
}

pub async fn apply_text_edits(
    State(state): State<Arc<AppState>>,
    Json(body): Json<EditsBody>,
) -> (StatusCode, Json<Value>) {
    let Some((content, hash)) = text_of(&state, &body.node_id) else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "ok": false, "error": "没有这个文本节点" })),
        );
    };
    if let Some(expected) = &body.expected_content_hash
        && expected != &hash
    {
        return (
            StatusCode::CONFLICT,
            Json(json!({
                "ok": false,
                "error": "内容已经被改过，请重新读取",
                "expectedContentHash": hash,
            })),
        );
    }
    if body.edits.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "edits 是空的" })),
        );
    }

    // **先全部校验再落盘。** 改一半就写的话，文本会停在一个 agent 和用户
    // 都没预期的中间状态，而调用方收到的是失败、会重试整批。
    let mut next = content.clone();
    for (i, e) in body.edits.iter().enumerate() {
        if e.old_text.is_empty() {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "ok": false, "error": format!("第 {i} 条的 oldText 是空的") })),
            );
        }
        let n = next.matches(&e.old_text).count();
        if n == 0 {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "ok": false,
                    "error": format!("第 {i} 条的 oldText 在正文里找不到"),
                    "oldText": e.old_text,
                })),
            );
        }
        if n > 1 {
            // 出现多次时不知道改哪一处。猜一个就是改错地方，
            // 而调用方收到的是成功。
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "ok": false,
                    "error": format!("第 {i} 条的 oldText 出现了 {n} 次，无法确定改哪一处；请带上更多上下文"),
                    "oldText": e.old_text,
                })),
            );
        }
        next = next.replacen(&e.old_text, &e.new_text, 1);
    }

    let file = canvas::read(&state.ws.canvas_path());
    let Some(node) = file.nodes.iter().find(|n| n.id == body.node_id) else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "ok": false, "error": "节点不见了" })),
        );
    };
    let Some(path) = node
        .asset_id
        .as_deref()
        .and_then(|id| state.assets.by_id(id))
        .and_then(|a| state.ws.resolve(&a.path))
    else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "ok": false, "error": "找不到这个节点的文件" })),
        );
    };
    if let Err(e) = std::fs::write(&path, &next) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": e.to_string() })),
        );
    }
    let new_hash = crate::api_canvas::sha256(&next);
    state.events.publish(
        "canvas:changed",
        json!({ "nodeId": body.node_id, "edits": body.edits.len() }),
    );
    (
        StatusCode::OK,
        Json(json!({
            "ok": true,
            "nodeId": body.node_id,
            "applied": body.edits.len(),
            // 回新哈希，调用方下一次改可以直接用，不用再读一遍。
            "expectedContentHash": new_hash,
        })),
    )
}
