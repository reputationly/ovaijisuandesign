//! 画布 API。
//!
//! ```text
//! GET  /api/canvas               整份画布
//! POST /api/canvas               整份写回
//! GET  /api/canvas/nodes         节点清单（轻量）
//! POST /api/canvas/nodes/detail  节点详情（含文本内容）
//! POST /api/canvas/media-node    把工作区里的媒体文件放上画布
//! POST /api/canvas/text-node     建/改文本节点
//! ```

use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};

use axum::Json;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Deserialize;
use serde_json::{Map, Value, json};
use sha2::{Digest, Sha256};

use crate::AppState;
use crate::canvas::{self, CanvasFile, Node, SaveError};

/// 画布的写锁。
///
/// 读-改-写不是原子的：agent 建节点和用户拖动可能同时发生，没有这把锁
/// 后写的那次会**整份覆盖**掉前一次 —— 表现是"刚生成的节点又没了"。
pub type CanvasLock = Mutex<()>;

pub async fn get_canvas(State(state): State<Arc<AppState>>) -> Json<CanvasFile> {
    Json(canvas::read(&state.ws.canvas_path()))
}

pub async fn put_canvas(
    State(state): State<Arc<AppState>>,
    Json(next): Json<CanvasFile>,
) -> Response {
    let _guard = state.canvas_lock.lock();
    match canvas::write(&state.ws.canvas_path(), &next) {
        Ok(()) => {
            state
                .events
                .publish("canvas:changed", json!({ "nodes": next.nodes.len() }));
            Json(json!({ "ok": true })).into_response()
        }
        Err(err @ SaveError::Destructive { .. }) | Err(err @ SaveError::Invalid(_)) => {
            // 409 而不是 400：这不是"请求写错了"，是"和当前状态冲突"。
            // 调用方该重新读一份再改，而不是原样重试。
            (StatusCode::CONFLICT, err.to_string()).into_response()
        }
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()).into_response(),
    }
}

#[derive(Debug, Default, Deserialize)]
pub struct ListQuery {
    #[serde(default, rename = "type")]
    kind: Option<String>,
    #[serde(default)]
    limit: Option<usize>,
    #[serde(default)]
    offset: Option<usize>,
}

pub async fn list_nodes(
    State(state): State<Arc<AppState>>,
    Query(q): Query<ListQuery>,
) -> Json<Value> {
    let file = canvas::read(&state.ws.canvas_path());
    let filtered: Vec<&Node> = file
        .nodes
        .iter()
        .filter(|n| q.kind.as_deref().is_none_or(|k| n.kind == k))
        .collect();
    let total = filtered.len();
    let nodes: Vec<Value> = filtered
        .into_iter()
        .skip(q.offset.unwrap_or(0))
        .take(q.limit.unwrap_or(usize::MAX))
        .map(|n| json!({ "id": n.id, "type": n.kind, "name": node_name(&state, n) }))
        .collect();
    Json(json!({ "count": total, "nodes": nodes }))
}

#[derive(Debug, Default, Deserialize)]
pub struct DetailBody {
    #[serde(default, rename = "nodeIds")]
    node_ids: Vec<String>,
}

pub async fn node_detail(
    State(state): State<Arc<AppState>>,
    Json(body): Json<DetailBody>,
) -> Json<Value> {
    let file = canvas::read(&state.ws.canvas_path());
    let mut nodes = Vec::new();
    let mut missing = Vec::new();

    for id in &body.node_ids {
        let Some(n) = file.nodes.iter().find(|n| &n.id == id) else {
            // 查不到不是错误 —— 节点可能刚被删掉。如实报 missing，
            // 让调用方自己决定怎么办。
            missing.push(id.clone());
            continue;
        };
        let mut entry = json!({ "id": n.id, "type": n.kind, "name": node_name(&state, n) });
        // 素材的像素尺寸。前端按它算节点大小（等比缩到长边 350，和官方
        // 的 computeNodeSize 一致）—— 没有它就只能套一个固定卡片，
        // 竖图会变成方框里的一条，那是和官方观感差别最明显的地方。
        if let Some(a) = n.asset_id.as_deref().and_then(|id| state.assets.by_id(id)) {
            // **工作区相对路径。** 界面要拿一个节点当下一次生成的输入
            // （"以此为输入生成"）时，只有 assetId 和文件名是不够的 ——
            // 生成接口收的是 `images/xxx.png` 这种路径。
            //
            // 少了它，那条菜单只能打开输入框而带不上素材：用户以为接上了，
            // 出来的却是一张纯文生图，**全程不报错**。
            entry["path"] = json!(a.path);
        }
        if let Some(a) = n.asset_id.as_deref().and_then(|id| state.assets.by_id(id))
            && let (Some(w), Some(h)) = (a.width, a.height)
        {
            entry["width"] = json!(w);
            entry["height"] = json!(h);
        }
        if let Some((content, hash)) = read_text(&state, n) {
            entry["textContent"] = json!(content);
            entry["textContentHash"] = json!(hash);
        }
        nodes.push(entry);
    }
    Json(json!({ "nodes": nodes, "missing": missing }))
}

fn node_name(state: &AppState, n: &Node) -> String {
    n.asset_id
        .as_deref()
        .and_then(|id| state.assets.by_id(id))
        .map(|a| a.name)
        .or_else(|| {
            n.extra
                .get("data")
                .and_then(|d| d.get("name"))
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .unwrap_or_else(|| n.id.chars().take(8).collect())
}

/// 文本节点的内容 + 哈希。非文本节点返回 `None`。
fn read_text(state: &AppState, n: &Node) -> Option<(String, String)> {
    if n.kind != "text" {
        return None;
    }
    let asset = state.assets.by_id(n.asset_id.as_deref()?)?;
    let abs = state.ws.resolve(&asset.path)?;
    let content = std::fs::read_to_string(abs).ok()?;
    let hash = sha256(&content);
    Some((content, hash))
}

/// 文本内容的哈希。**两处必须用同一份实现** —— `canvas_write_node` 和
/// `canvas_apply_text_edits` 走的是同一套并发保护，算法不一致的话
/// 前者拿到的 hash 在后者那里永远对不上。
pub(crate) fn sha256(s: &str) -> String {
    let mut h = Sha256::new();
    h.update(s.as_bytes());
    format!("{:x}", h.finalize())
}

#[derive(Debug, Default, Deserialize)]
pub struct MediaNodeBody {
    #[serde(default, rename = "assetPath")]
    asset_path: String,
    #[serde(default, rename = "sourceNodeIds")]
    source_node_ids: Vec<String>,
    #[serde(default, rename = "allowDuplicate")]
    allow_duplicate: bool,
}

/// 把工作区里已有的媒体文件放上画布。
pub async fn media_node(
    State(state): State<Arc<AppState>>,
    Json(body): Json<MediaNodeBody>,
) -> Response {
    if body.asset_path.trim().is_empty() {
        return (StatusCode::BAD_REQUEST, "assetPath 不能为空").into_response();
    }
    let asset = match state.assets.enroll(&body.asset_path) {
        Ok(a) => a,
        Err(err) => return (StatusCode::BAD_REQUEST, format!("{err:#}")).into_response(),
    };

    let _guard = state.canvas_lock.lock();
    let mut file = canvas::read(&state.ws.canvas_path());

    // 同一份资产已经在画布上了就直接返回那个节点 —— 否则重复生成会在画布上
    // 堆出一排指向同一份字节的节点。
    if !body.allow_duplicate
        && let Some(existing) = file
            .nodes
            .iter()
            .find(|n| n.asset_id.as_deref() == Some(&asset.id))
    {
        return Json(json!({ "nodeId": existing.id, "assetId": asset.id, "reused": true }))
            .into_response();
    }

    let mode = file.mode.clone();
    let pos = canvas::next_position(&file, &mode);
    let node_id = uuid::Uuid::new_v4().to_string();
    let mut positions = BTreeMap::new();
    positions.insert(mode, pos);

    let mut data = Map::new();
    data.insert("name".into(), json!(asset.name));
    data.insert("path".into(), json!(asset.path));
    let mut extra = Map::new();
    extra.insert("data".into(), Value::Object(data));

    file.nodes.push(Node {
        id: node_id.clone(),
        kind: asset.kind.clone(),
        positions,
        size: default_size(&asset.kind, asset.width.zip(asset.height)),
        asset_id: Some(asset.id.clone()),
        parent_id: None,
        extra,
    });
    link_sources(&mut file, &node_id, &body.source_node_ids);

    match canvas::write(&state.ws.canvas_path(), &file) {
        Ok(()) => {
            state
                .events
                .publish("canvas:changed", json!({ "added": node_id }));
            Json(json!({ "nodeId": node_id, "assetId": asset.id, "created": true })).into_response()
        }
        Err(err) => (StatusCode::CONFLICT, err.to_string()).into_response(),
    }
}

/// 新节点的初始尺寸。**和官方的 `defaultNodeSizeForType` 一致**：
///
/// ```text
/// image/video  350x350     audio  350x150     text  350x500
/// ```
///
/// 有素材像素尺寸的话按真实比例算（等比缩到长边 350，短边保底 100，
/// 官方的 `computeNodeSize`）—— 套固定卡片的话，一张 4:3 的图放进 16:9 的
/// 框里四周就是白边，那是画面上最刺眼的一处。
fn default_size(kind: &str, asset: Option<(u32, u32)>) -> Option<canvas::Size> {
    const MAX: f64 = 350.0;
    const MIN: f64 = 100.0;
    if let Some((w, h)) = asset
        && w > 0
        && h > 0
    {
        let (w, h) = (w as f64, h as f64);
        let scale = (MAX / w).min(MAX / h);
        return Some(canvas::Size {
            width: (w * scale).round().max(MIN),
            height: (h * scale).round().max(MIN),
        });
    }
    let (width, height) = match kind {
        "image" | "video" => (350.0, 350.0),
        "audio" => (350.0, 150.0),
        "text" => (350.0, 500.0),
        _ => (350.0, 350.0),
    };
    Some(canvas::Size { width, height })
}

/// 建 derivation 边，把产物和来源连起来。
fn link_sources(file: &mut CanvasFile, node_id: &str, sources: &[String]) {
    for src in sources {
        if !file.nodes.iter().any(|n| &n.id == src) {
            // 来源不存在就跳过。加一条悬空的边会让整张画布在前端抛错。
            tracing::warn!(source = %src, "sourceNodeIds 里有不存在的节点，已跳过");
            continue;
        }
        file.edges.push(canvas::Edge {
            id: format!("{src}->{node_id}"),
            source: src.clone(),
            target: node_id.to_string(),
            kind: "derivation".into(),
            extra: Map::new(),
        });
    }
}

#[derive(Debug, Default, Deserialize)]
pub struct TextNodeBody {
    #[serde(default)]
    content: String,
    #[serde(default)]
    name: Option<String>,
    #[serde(default, rename = "nodeId")]
    node_id: Option<String>,
    #[serde(default)]
    mode: Option<String>,
    #[serde(default, rename = "expectedContentHash")]
    expected_hash: Option<String>,
    #[serde(default, rename = "sourceNodeIds")]
    source_node_ids: Vec<String>,
}

/// 建或改文本节点。内容是 Markdown 源码，落成 `texts/` 下的一个文件。
pub async fn text_node(
    State(state): State<Arc<AppState>>,
    Json(body): Json<TextNodeBody>,
) -> Response {
    let _guard = state.canvas_lock.lock();
    let mut file = canvas::read(&state.ws.canvas_path());

    let (rel_path, existing_idx) = match &body.node_id {
        Some(id) => {
            let Some(idx) = file.nodes.iter().position(|n| &n.id == id) else {
                return (StatusCode::NOT_FOUND, format!("节点不存在: {id}")).into_response();
            };
            let Some(path) = file.nodes[idx]
                .asset_id
                .as_deref()
                .and_then(|a| state.assets.by_id(a))
                .map(|a| a.path)
            else {
                return (StatusCode::BAD_REQUEST, "这个节点没有关联文件").into_response();
            };
            (path, Some(idx))
        }
        None => {
            let name = body
                .name
                .clone()
                .unwrap_or_else(|| format!("note-{}.md", &uuid::Uuid::new_v4().to_string()[..8]));
            let name = if name.contains('.') {
                name
            } else {
                format!("{name}.md")
            };
            (format!("texts/{name}"), None)
        }
    };

    let Some(abs) = state.ws.resolve(&rel_path) else {
        return (StatusCode::BAD_REQUEST, "路径超出工作区").into_response();
    };

    // 乐观并发：对不上就拒绝，**不要覆盖**。
    // 文本节点最可能被 agent 和用户同时写，静默覆盖掉对方是这里最坏的失败。
    let current = std::fs::read_to_string(&abs).unwrap_or_default();
    if let Some(expected) = &body.expected_hash {
        let actual = sha256(&current);
        if &actual != expected {
            return (
                StatusCode::CONFLICT,
                "内容在你编辑期间被改过了。重新读一次再写，避免覆盖对方的修改。",
            )
                .into_response();
        }
    }

    let next_content = match body.mode.as_deref() {
        Some("append") => format!("{current}{}", body.content),
        Some("prepend") => format!("{}{current}", body.content),
        _ => body.content.clone(),
    };

    if let Some(parent) = abs.parent()
        && let Err(err) = std::fs::create_dir_all(parent)
    {
        return (StatusCode::INTERNAL_SERVER_ERROR, format!("{err}")).into_response();
    }
    if let Err(err) = std::fs::write(&abs, &next_content) {
        return (StatusCode::INTERNAL_SERVER_ERROR, format!("{err}")).into_response();
    }

    let asset = match state.assets.enroll(&rel_path) {
        Ok(a) => a,
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("{err:#}")).into_response(),
    };

    let node_id = match existing_idx {
        Some(idx) => file.nodes[idx].id.clone(),
        None => {
            let id = uuid::Uuid::new_v4().to_string();
            let mode = file.mode.clone();
            let pos = canvas::next_position(&file, &mode);
            let mut positions = BTreeMap::new();
            positions.insert(mode, pos);
            let mut data = Map::new();
            data.insert("name".into(), json!(asset.name));
            data.insert("path".into(), json!(asset.path));
            let mut extra = Map::new();
            extra.insert("data".into(), Value::Object(data));
            file.nodes.push(Node {
                id: id.clone(),
                kind: "text".into(),
                positions,
                size: default_size("text", None),
                asset_id: Some(asset.id.clone()),
                parent_id: None,
                extra,
            });
            link_sources(&mut file, &id, &body.source_node_ids);
            id
        }
    };

    if let Err(err) = canvas::write(&state.ws.canvas_path(), &file) {
        return (StatusCode::CONFLICT, err.to_string()).into_response();
    }
    state
        .events
        .publish("canvas:changed", json!({ "text": node_id }));

    Json(json!({
        "nodeId": node_id,
        "assetId": asset.id,
        "path": asset.path,
        "contentLength": next_content.chars().count(),
        "contentHash": sha256(&next_content),
        "created": existing_idx.is_none(),
    }))
    .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hashes_match_the_official_shape() {
        // 官方的 textContentHash 是 64 位十六进制的 sha256。
        // 换个算法的话，前端存下来的 hash 和我们算的永远对不上，
        // 每一次编辑都会被判成冲突。
        let h = sha256("hello from probe");
        assert_eq!(h.len(), 64);
        assert!(h.chars().all(|c| c.is_ascii_hexdigit()));
    }
}

#[cfg(test)]
mod size_tests {
    use super::default_size;

    #[test]
    fn an_asset_with_dimensions_drives_the_node_size() {
        // 4:3 的图不能塞进 16:9 的框——四周会是白边，画面上最刺眼的一处。
        let s = default_size("image", Some((1360, 1024))).unwrap();
        assert_eq!((s.width, s.height), (350.0, 264.0));
        let s = default_size("image", Some((1080, 1920))).unwrap();
        assert_eq!((s.width, s.height), (197.0, 350.0));
    }

    #[test]
    fn an_extreme_ratio_still_keeps_a_usable_short_edge() {
        let s = default_size("image", Some((4000, 200))).unwrap();
        assert_eq!((s.width, s.height), (350.0, 100.0));
    }

    #[test]
    fn without_dimensions_it_falls_back_per_type() {
        // 和官方的 defaultNodeSizeForType 对齐。
        assert_eq!(default_size("audio", None).unwrap().height, 150.0);
        assert_eq!(default_size("text", None).unwrap().height, 500.0);
        assert_eq!(default_size("image", None).unwrap().height, 350.0);
    }

    #[test]
    fn a_zero_dimension_asset_does_not_produce_a_zero_sized_node() {
        // 损坏的图片元数据不该让节点在画布上完全消失。
        let s = default_size("image", Some((0, 0))).unwrap();
        assert_eq!((s.width, s.height), (350.0, 350.0));
    }
}
