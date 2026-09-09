//! 多画布。`GET/POST /api/canvases`、`POST /api/canvases/{id}/open`、
//! `DELETE /api/canvases/{id}`
//!
//! ## 换内容，不换路径
//!
//! **当前画布永远是 `.hilo/canvas.json`。** 切换的做法是：把它的内容存进
//! `.hilo/canvases/<当前 id>.json`，再把目标那份拷回来。
//!
//! 换路径（让 agent 读 `canvases/<id>.json`）看起来更干净，但会断掉
//! MCP 工具、`ovagent` 和官方应用 —— 它们读的都是那个固定路径。改成动态的
//! 意味着每个工具调用都要带上"当前是哪张画布"，而 agent 那边并没有这个
//! 概念，结果是它一直对着一张空画布干活，还不报错。
//!
//! ## 清单
//!
//! `.hilo/canvases.json` 记 `{ current, list: [...] }`。它是**派生数据** ——
//! 丢了可以从目录重建，所以任何一步失败都不该让画布本身出问题。

use std::path::Path;
use std::sync::Arc;

use axum::Json;
use axum::extract::{Path as UrlPath, State};
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::{AppState, canvas};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: String,
    pub name: String,
    /// 秒级时间戳。前端按它排序 —— 最近改的排最前。
    #[serde(default)]
    pub updated_at: u64,
    #[serde(default)]
    pub node_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Index {
    #[serde(default)]
    pub current: String,
    #[serde(default)]
    pub list: Vec<Entry>,
}

fn now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

pub fn read_index(path: &Path) -> Index {
    // 读不出来就当空的。清单是派生数据，损坏了不该让整个画布打不开。
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn write_index(path: &Path, idx: &Index) -> std::io::Result<()> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    std::fs::write(path, serde_json::to_vec_pretty(idx)?)
}

/// 确保清单里有"当前"这一条。
///
/// 老工作区只有一个裸的 `canvas.json`、没有清单 —— 第一次访问时把它收编成
/// 一条正常的记录，而不是让用户看到一个空列表、以为画布丢了。
fn ensure(state: &AppState) -> Index {
    let ipath = state.ws.index_path();
    let mut idx = read_index(&ipath);
    if idx.current.is_empty() {
        let file = canvas::read(&state.ws.canvas_path());
        let id = uuid::Uuid::new_v4().to_string();
        idx.current = id.clone();
        idx.list.insert(
            0,
            Entry {
                id,
                name: "画布".into(),
                updated_at: now(),
                node_count: file.nodes.len(),
            },
        );
        let _ = write_index(&ipath, &idx);
    }
    idx
}

/// 把当前画布的内容和统计同步进存档与清单。**切换/新建之前必须调**，
/// 否则刚才那张画布的改动会被下一次切换覆盖掉。
fn stash_current(state: &AppState, idx: &mut Index) {
    let Some(dst) = state.ws.canvas_file(&idx.current) else {
        return;
    };
    let file = canvas::read(&state.ws.canvas_path());
    if let Some(dir) = dst.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    let _ = std::fs::write(&dst, serde_json::to_vec_pretty(&file).unwrap_or_default());
    if let Some(e) = idx.list.iter_mut().find(|e| e.id == idx.current) {
        e.updated_at = now();
        e.node_count = file.nodes.len();
    }
}

pub async fn list(State(state): State<Arc<AppState>>) -> Json<Value> {
    let mut idx = ensure(&state);
    // 顺手把当前这张的节点数刷新一下，否则列表上永远是创建时那个数。
    let file = canvas::read(&state.ws.canvas_path());
    if let Some(e) = idx.list.iter_mut().find(|e| e.id == idx.current) {
        e.node_count = file.nodes.len();
    }
    Json(json!({ "ok": true, "current": idx.current, "list": idx.list }))
}

#[derive(Debug, Deserialize, Default)]
pub struct CreateBody {
    #[serde(default)]
    pub name: Option<String>,
}

/// 新建一张空画布并切过去。
pub async fn create(
    State(state): State<Arc<AppState>>,
    body: Option<Json<CreateBody>>,
) -> (StatusCode, Json<Value>) {
    let mut idx = ensure(&state);
    stash_current(&state, &mut idx);

    let id = uuid::Uuid::new_v4().to_string();
    let name = body
        .and_then(|b| b.0.name)
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| format!("画布 {}", idx.list.len() + 1));

    // 新画布用默认结构写过去。**必须真的写一次**，而不是删掉旧文件 ——
    // 删了的话读的时候会走"文件不存在"的兜底，而那条路和"空画布"未必等价。
    //
    // 用 `replace` 而不是 `write`：`write` 有破坏性写入防护（节点数掉一半
    // 以上就拒绝），而"新建空画布"正好长这样 —— 走 `write` 会被拦住，
    // 表现是"点了新建但画布没变"，而且不报错。切换画布同理。
    let empty = canvas::CanvasFile::default();
    if let Err(e) = canvas::replace(&state.ws.canvas_path(), &empty) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": e.to_string() })),
        );
    }
    idx.list.insert(
        0,
        Entry {
            id: id.clone(),
            name: name.clone(),
            updated_at: now(),
            node_count: 0,
        },
    );
    idx.current = id.clone();
    let _ = write_index(&state.ws.index_path(), &idx);
    state.events.publish("canvas:changed", json!({}));
    (
        StatusCode::OK,
        Json(json!({ "ok": true, "id": id, "name": name })),
    )
}

/// 切到某张画布。
pub async fn open(
    State(state): State<Arc<AppState>>,
    UrlPath(id): UrlPath<String>,
) -> (StatusCode, Json<Value>) {
    let mut idx = ensure(&state);
    if id == idx.current {
        return (StatusCode::OK, Json(json!({ "ok": true, "id": id })));
    }
    let Some(src) = state.ws.canvas_file(&id) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "画布 id 不合法" })),
        );
    };
    if !idx.list.iter().any(|e| e.id == id) {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "ok": false, "error": "没有这张画布" })),
        );
    }

    stash_current(&state, &mut idx);

    // 存档不在（比如手工删过）就当空画布开，而不是报错 —— 清单里有这一条，
    // 报错会让它变成一个永远打不开的死条目。
    let next = std::fs::read_to_string(&src)
        .ok()
        .and_then(|s| serde_json::from_str::<canvas::CanvasFile>(&s).ok())
        .unwrap_or_default();
    if let Err(e) = canvas::replace(&state.ws.canvas_path(), &next) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": e.to_string() })),
        );
    }
    idx.current = id.clone();
    let _ = write_index(&state.ws.index_path(), &idx);
    state.events.publish("canvas:changed", json!({}));
    (StatusCode::OK, Json(json!({ "ok": true, "id": id })))
}

/// 删掉一张画布。
pub async fn remove(
    State(state): State<Arc<AppState>>,
    UrlPath(id): UrlPath<String>,
) -> (StatusCode, Json<Value>) {
    let mut idx = ensure(&state);
    if idx.list.len() <= 1 {
        return (
            StatusCode::CONFLICT,
            Json(json!({ "ok": false, "error": "至少要留一张画布" })),
        );
    }
    idx.list.retain(|e| e.id != id);
    if let Some(p) = state.ws.canvas_file(&id) {
        let _ = std::fs::remove_file(p);
    }
    // 删的正好是当前那张 → 切到列表里的第一张。不切的话 current 指向一个
    // 不存在的 id，之后每次 stash 都往一个已删的 id 上写。
    if idx.current == id
        && let Some(first) = idx.list.first().map(|e| e.id.clone())
    {
        let next = state
            .ws
            .canvas_file(&first)
            .and_then(|p| std::fs::read_to_string(p).ok())
            .and_then(|s| serde_json::from_str::<canvas::CanvasFile>(&s).ok())
            .unwrap_or_default();
        let _ = canvas::replace(&state.ws.canvas_path(), &next);
        idx.current = first;
    }
    let _ = write_index(&state.ws.index_path(), &idx);
    state.events.publish("canvas:changed", json!({}));
    (
        StatusCode::OK,
        Json(json!({ "ok": true, "current": idx.current })),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::extract::State;

    fn st() -> (Arc<AppState>, tempfile::TempDir) {
        crate::tests::state_with_dir()
    }

    async fn put_nodes(s: &Arc<AppState>, n: usize) {
        let mut f = canvas::read(&s.ws.canvas_path());
        // 直接反序列化造节点：Node 没有 Default（字段都是必填的语义），
        // 而这里只需要 id/type 两项。
        f.nodes = (0..n)
            .map(|i| {
                serde_json::from_value(json!({ "id": format!("n{i}"), "type": "text" })).unwrap()
            })
            .collect();
        canvas::write(&s.ws.canvas_path(), &f).unwrap();
    }

    #[tokio::test]
    async fn an_old_workspace_without_an_index_gets_adopted_not_emptied() {
        // 老工作区只有一个裸的 canvas.json。不收编的话用户会看到空列表，
        // 以为画布丢了。
        let (s, _d) = st();
        put_nodes(&s, 3).await;
        let r = list(State(s.clone())).await;
        assert_eq!(r.0["list"].as_array().unwrap().len(), 1);
        assert_eq!(r.0["list"][0]["nodeCount"], 3);
        assert!(!r.0["current"].as_str().unwrap().is_empty());
    }

    #[tokio::test]
    async fn creating_stashes_the_current_canvas_instead_of_losing_it() {
        // 这一条是重点：新建之前必须把当前那张存起来，否则用户点一下
        // "开始创作"，刚才画的东西就没了。
        let (s, _d) = st();
        put_nodes(&s, 2).await;
        let first = list(State(s.clone())).await.0["current"]
            .as_str()
            .unwrap()
            .to_string();

        let _ = create(State(s.clone()), None).await;
        assert_eq!(
            canvas::read(&s.ws.canvas_path()).nodes.len(),
            0,
            "新画布应该是空的"
        );

        let _ = open(State(s.clone()), UrlPath(first)).await;
        assert_eq!(
            canvas::read(&s.ws.canvas_path()).nodes.len(),
            2,
            "切回去应该还是那 2 个节点"
        );
    }

    #[tokio::test]
    async fn switching_back_and_forth_keeps_both_sides() {
        let (s, _d) = st();
        put_nodes(&s, 1).await;
        let a = list(State(s.clone())).await.0["current"]
            .as_str()
            .unwrap()
            .to_string();
        let b = create(State(s.clone()), None).await.1.0["id"]
            .as_str()
            .unwrap()
            .to_string();
        put_nodes(&s, 5).await;

        let _ = open(State(s.clone()), UrlPath(a.clone())).await;
        assert_eq!(canvas::read(&s.ws.canvas_path()).nodes.len(), 1);
        let _ = open(State(s.clone()), UrlPath(b)).await;
        assert_eq!(canvas::read(&s.ws.canvas_path()).nodes.len(), 5);
    }

    #[tokio::test]
    async fn the_last_canvas_cannot_be_deleted() {
        // 删光了之后界面没有任何可开的东西，而"新建"按钮在画布视图里 ——
        // 会变成一个走不出去的状态。
        let (s, _d) = st();
        let id = list(State(s.clone())).await.0["current"]
            .as_str()
            .unwrap()
            .to_string();
        let r = remove(State(s.clone()), UrlPath(id)).await;
        assert_eq!(r.0, StatusCode::CONFLICT);
    }

    #[tokio::test]
    async fn deleting_the_current_one_switches_instead_of_dangling() {
        // current 指向一个已删的 id 的话，之后每次 stash 都往那个不存在的
        // id 上写 —— 改动全部静默丢失。
        let (s, _d) = st();
        put_nodes(&s, 1).await;
        let a = list(State(s.clone())).await.0["current"]
            .as_str()
            .unwrap()
            .to_string();
        let _ = create(State(s.clone()), None).await;
        let cur = list(State(s.clone())).await.0["current"]
            .as_str()
            .unwrap()
            .to_string();

        let r = remove(State(s.clone()), UrlPath(cur.clone())).await;
        assert_eq!(r.0, StatusCode::OK);
        let now_cur = r.1.0["current"].as_str().unwrap().to_string();
        assert_ne!(now_cur, cur);
        assert_eq!(now_cur, a);
        assert_eq!(
            canvas::read(&s.ws.canvas_path()).nodes.len(),
            1,
            "应该开在 a 上"
        );
    }

    #[tokio::test]
    async fn a_missing_archive_opens_empty_rather_than_erroring() {
        // 清单里有、文件被手工删了 —— 报错会让它变成一个永远打不开的死条目。
        let (s, _d) = st();
        let b = create(State(s.clone()), None).await.1.0["id"]
            .as_str()
            .unwrap()
            .to_string();
        let _ = create(State(s.clone()), None).await; // 切走，让 b 落到存档
        std::fs::remove_file(s.ws.canvas_file(&b).unwrap()).unwrap();
        let r = open(State(s.clone()), UrlPath(b)).await;
        assert_eq!(r.0, StatusCode::OK);
    }
}
