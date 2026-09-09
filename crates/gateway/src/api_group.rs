//! 节点分组。对应 `canvas_group_nodes` / `canvas_ungroup_node` /
//! `canvas_group_recent_outputs`。
//!
//! ## 分组就是一个普通节点
//!
//! `type: "group"` 的节点，成员靠子节点的 `parentId` 指回它 ——
//! **官方就是这么做的**（React Flow 的父子机制），不是在文件里另存一个
//! 成员列表。
//!
//! 另存列表的话两处会不同步：删了一个节点而列表还留着它的 id，或者拖走
//! 了组而成员留在原地。用 `parentId` 的话，"跟着父节点一起移动/选中"
//! 是库自带的行为，不用我们维护。
//!
//! ## 坐标是相对父节点的
//!
//! React Flow 里子节点的坐标相对父节点。所以建组时要把成员的坐标**减去
//! 组的原点**，解组时再加回来。漏了这一步，分组的瞬间所有节点会跳到
//! 画布的另一个位置 —— 看起来像"分组把布局打乱了"。

use std::sync::Arc;

use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::Deserialize;
use serde_json::{Value, json};

use crate::canvas::{CanvasFile, Node, Xy};
use crate::{AppState, canvas};

/// 组框比内容多留这么多边距，标题也画在这一圈里。
const PADDING: f64 = 32.0;
const HEADER: f64 = 28.0;

#[derive(Debug, Deserialize)]
pub struct GroupBody {
    #[serde(rename = "nodeIds")]
    pub node_ids: Vec<String>,
    #[serde(default)]
    pub label: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RecentBody {
    #[serde(default)]
    pub label: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UngroupBody {
    #[serde(rename = "groupId")]
    pub group_id: String,
}

/// 在某个模式下把一批节点包起来，返回组节点。
fn make_group(file: &mut CanvasFile, ids: &[String], label: &str) -> Result<Node, String> {
    let mode = file.mode.clone();
    let members: Vec<&Node> = file.nodes.iter().filter(|n| ids.contains(&n.id)).collect();
    if members.is_empty() {
        return Err("这些节点一个都不在画布上".into());
    }
    // 已经在别的组里的节点先拒掉。嵌套分组我们不做 —— 官方支持，但那要
    // 连带处理多层坐标换算，而我们现在一层都还没验过。
    if let Some(n) = members.iter().find(|n| n.parent_id.is_some()) {
        return Err(format!("{} 已经在另一个组里了", n.id));
    }

    let mut min_x = f64::MAX;
    let mut min_y = f64::MAX;
    let mut max_x = f64::MIN;
    let mut max_y = f64::MIN;
    for n in &members {
        let p = n
            .positions
            .get(&mode)
            .or_else(|| n.positions.values().next())
            .copied()
            .unwrap_or(Xy { x: 0.0, y: 0.0 });
        let (w, h) = n
            .size
            .map(|s| (s.width, s.height))
            .unwrap_or((350.0, 350.0));
        min_x = min_x.min(p.x);
        min_y = min_y.min(p.y);
        max_x = max_x.max(p.x + w);
        max_y = max_y.max(p.y + h);
    }

    let origin = Xy {
        x: min_x - PADDING,
        y: min_y - PADDING - HEADER,
    };
    let id = format!("group-{}", uuid::Uuid::new_v4());
    let mut positions = std::collections::BTreeMap::new();
    positions.insert(mode.clone(), origin);

    let mut extra = serde_json::Map::new();
    extra.insert("data".into(), json!({ "name": label, "collapsed": false }));

    let group = Node {
        id: id.clone(),
        kind: "group".into(),
        positions,
        size: Some(crate::canvas::Size {
            width: max_x - min_x + PADDING * 2.0,
            height: max_y - min_y + PADDING * 2.0 + HEADER,
        }),
        asset_id: None,
        parent_id: None,
        extra,
    };

    // 成员的坐标改成相对组原点，并挂上 parentId。
    for n in file.nodes.iter_mut().filter(|n| ids.contains(&n.id)) {
        n.parent_id = Some(id.clone());
        for p in n.positions.values_mut() {
            p.x -= origin.x;
            p.y -= origin.y;
        }
    }
    Ok(group)
}

fn save(state: &AppState, file: &CanvasFile) -> Result<(), (StatusCode, Json<Value>)> {
    canvas::write(&state.ws.canvas_path(), file).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": e.to_string() })),
        )
    })
}

pub async fn group_nodes(
    State(state): State<Arc<AppState>>,
    Json(body): Json<GroupBody>,
) -> (StatusCode, Json<Value>) {
    if body.node_ids.len() < 2 {
        // 一个节点的组没有意义，而且解组时容易留下一个空壳。
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "至少要两个节点" })),
        );
    }
    let _guard = state.canvas_lock.lock().unwrap();
    let mut file = canvas::read(&state.ws.canvas_path());
    let label = body.label.clone().unwrap_or_else(|| "未命名分组".into());
    let group = match make_group(&mut file, &body.node_ids, &label) {
        Ok(g) => g,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "ok": false, "error": e })),
            );
        }
    };
    let gid = group.id.clone();
    // 组要排在成员**前面**：React Flow 要求父节点先于子节点出现，
    // 否则挂载时找不到父节点，那些子节点会被整个丢掉。
    file.nodes.insert(0, group);
    if let Err(e) = save(&state, &file) {
        return e;
    }
    state
        .events
        .publish("canvas:changed", json!({ "grouped": body.node_ids.len() }));
    (
        StatusCode::OK,
        Json(json!({ "ok": true, "groupId": gid, "label": label, "members": body.node_ids.len() })),
    )
}

/// 把"最近一批产物"打成组。
///
/// 判据是**画布上排在最后、且带 assetId 的连续一段**。用创建时间会更准，
/// 但 `canvas.json` 里没有时间戳 —— 加一个字段又会和官方的结构分叉。
pub async fn group_recent_outputs(
    State(state): State<Arc<AppState>>,
    body: Option<Json<RecentBody>>,
) -> (StatusCode, Json<Value>) {
    let _guard = state.canvas_lock.lock().unwrap();
    let mut file = canvas::read(&state.ws.canvas_path());
    let ids: Vec<String> = file
        .nodes
        .iter()
        .rev()
        .take_while(|n| n.asset_id.is_some() && n.parent_id.is_none() && n.kind != "group")
        .map(|n| n.id.clone())
        .collect();
    if ids.len() < 2 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "最近没有足够的产物可以成组" })),
        );
    }
    let label = body
        .and_then(|b| b.0.label)
        .unwrap_or_else(|| "最近生成".into());
    let group = match make_group(&mut file, &ids, &label) {
        Ok(g) => g,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "ok": false, "error": e })),
            );
        }
    };
    let gid = group.id.clone();
    file.nodes.insert(0, group);
    if let Err(e) = save(&state, &file) {
        return e;
    }
    state
        .events
        .publish("canvas:changed", json!({ "grouped": ids.len() }));
    (
        StatusCode::OK,
        Json(json!({ "ok": true, "groupId": gid, "label": label, "members": ids.len() })),
    )
}

pub async fn ungroup_node(
    State(state): State<Arc<AppState>>,
    Json(body): Json<UngroupBody>,
) -> (StatusCode, Json<Value>) {
    let _guard = state.canvas_lock.lock().unwrap();
    let mut file = canvas::read(&state.ws.canvas_path());
    let Some(g) = file.nodes.iter().find(|n| n.id == body.group_id).cloned() else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "ok": false, "error": "没有这个组" })),
        );
    };
    if g.kind != "group" {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "这不是一个组" })),
        );
    }

    // 坐标加回绝对值，否则成员会全部跳到画布原点附近。
    let mut freed = 0;
    for n in file.nodes.iter_mut() {
        if n.parent_id.as_deref() != Some(body.group_id.as_str()) {
            continue;
        }
        n.parent_id = None;
        for (mode, p) in n.positions.iter_mut() {
            let o = g
                .positions
                .get(mode)
                .or_else(|| g.positions.values().next())
                .copied()
                .unwrap_or(Xy { x: 0.0, y: 0.0 });
            p.x += o.x;
            p.y += o.y;
        }
        freed += 1;
    }
    file.nodes.retain(|n| n.id != body.group_id);

    if let Err(e) = save(&state, &file) {
        return e;
    }
    state
        .events
        .publish("canvas:changed", json!({ "ungrouped": freed }));
    (StatusCode::OK, Json(json!({ "ok": true, "freed": freed })))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn st() -> (Arc<AppState>, tempfile::TempDir) {
        crate::tests::state_with_dir()
    }

    /// 造一张有 n 个图片节点的画布，坐标 (i*400, 100)。
    fn seed(s: &Arc<AppState>, n: usize) -> Vec<String> {
        let mut f = canvas::read(&s.ws.canvas_path());
        f.mode = "workflow".into();
        f.nodes = (0..n)
            .map(|i| {
                serde_json::from_value(json!({
                    "id": format!("n{i}"),
                    "type": "image",
                    "assetId": format!("a{i}"),
                    "positions": { "workflow": { "x": (i as f64) * 400.0, "y": 100.0 } },
                    "size": { "width": 350.0, "height": 200.0 }
                }))
                .unwrap()
            })
            .collect();
        canvas::replace(&s.ws.canvas_path(), &f).unwrap();
        (0..n).map(|i| format!("n{i}")).collect()
    }

    fn pos(s: &Arc<AppState>, id: &str) -> Xy {
        canvas::read(&s.ws.canvas_path())
            .nodes
            .iter()
            .find(|n| n.id == id)
            .unwrap()
            .positions["workflow"]
    }

    #[tokio::test]
    async fn grouping_then_ungrouping_restores_the_original_positions() {
        // 这一条是重点。React Flow 里子节点坐标相对父节点 —— 换算漏了的话，
        // 分组的瞬间所有节点会跳到画布另一处，看起来像"分组把布局打乱了"。
        let (s, _d) = st();
        let ids = seed(&s, 3);
        let before: Vec<Xy> = ids.iter().map(|i| pos(&s, i)).collect();

        let r = group_nodes(
            State(s.clone()),
            Json(GroupBody {
                node_ids: ids.clone(),
                label: Some("一组".into()),
            }),
        )
        .await;
        assert_eq!(r.0, StatusCode::OK, "{:?}", r.1.0);
        let gid = r.1.0["groupId"].as_str().unwrap().to_string();

        // 组里的坐标是相对组原点的。最左那个节点在 x=0，组原点是
        // `0 - PADDING = -32`，所以它的相对坐标正好是 +PADDING。
        assert_eq!(pos(&s, "n0").x, PADDING, "最左的成员应该落在左内边距上");

        let u = ungroup_node(State(s.clone()), Json(UngroupBody { group_id: gid })).await;
        assert_eq!(u.0, StatusCode::OK);
        assert_eq!(u.1.0["freed"], 3);

        for (i, id) in ids.iter().enumerate() {
            let p = pos(&s, id);
            assert!(
                (p.x - before[i].x).abs() < 0.001 && (p.y - before[i].y).abs() < 0.001,
                "{id} 没回到原位：{:?} vs {:?}",
                p,
                before[i]
            );
        }
    }

    #[tokio::test]
    async fn the_group_node_comes_before_its_members() {
        // React Flow 要求父节点先于子节点出现，否则挂载时找不到父节点，
        // 那些子节点会被整个丢掉 —— 表现是"分组之后图全没了"。
        let (s, _d) = st();
        let ids = seed(&s, 2);
        let _ = group_nodes(
            State(s.clone()),
            Json(GroupBody {
                node_ids: ids,
                label: None,
            }),
        )
        .await;
        let f = canvas::read(&s.ws.canvas_path());
        assert_eq!(f.nodes[0].kind, "group");
        assert!(f.nodes[1].parent_id.is_some());
    }

    #[tokio::test]
    async fn the_group_box_wraps_all_members() {
        let (s, _d) = st();
        let ids = seed(&s, 3); // 最右到 800+350 = 1150
        let r = group_nodes(
            State(s.clone()),
            Json(GroupBody {
                node_ids: ids,
                label: None,
            }),
        )
        .await;
        let gid = r.1.0["groupId"].as_str().unwrap();
        let f = canvas::read(&s.ws.canvas_path());
        let g = f.nodes.iter().find(|n| n.id == gid).unwrap();
        let size = g.size.unwrap();
        assert!(
            size.width >= 1150.0 - 0.0 + PADDING,
            "宽度没包住：{}",
            size.width
        );
        assert!(size.height >= 200.0 + PADDING * 2.0 + HEADER);
    }

    #[tokio::test]
    async fn a_node_already_in_a_group_is_refused() {
        // 嵌套分组我们不做 —— 那要连带处理多层坐标换算，而一层都还没验过。
        let (s, _d) = st();
        let ids = seed(&s, 3);
        let _ = group_nodes(
            State(s.clone()),
            Json(GroupBody {
                node_ids: ids[..2].to_vec(),
                label: None,
            }),
        )
        .await;
        let r = group_nodes(
            State(s.clone()),
            Json(GroupBody {
                node_ids: ids[..2].to_vec(),
                label: None,
            }),
        )
        .await;
        assert_eq!(r.0, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn a_single_node_group_is_refused() {
        let (s, _d) = st();
        let ids = seed(&s, 2);
        let r = group_nodes(
            State(s),
            Json(GroupBody {
                node_ids: vec![ids[0].clone()],
                label: None,
            }),
        )
        .await;
        assert_eq!(r.0, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn ungrouping_something_that_is_not_a_group_is_refused() {
        let (s, _d) = st();
        let ids = seed(&s, 2);
        let r = ungroup_node(
            State(s),
            Json(UngroupBody {
                group_id: ids[0].clone(),
            }),
        )
        .await;
        assert_eq!(r.0, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn recent_outputs_groups_the_trailing_run() {
        let (s, _d) = st();
        seed(&s, 4);
        let r = group_recent_outputs(State(s.clone()), None).await;
        assert_eq!(r.0, StatusCode::OK, "{:?}", r.1.0);
        assert_eq!(r.1.0["members"], 4);
        assert_eq!(r.1.0["label"], "最近生成");
    }
}
