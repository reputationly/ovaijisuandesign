//! 画布持久化。`<工作区>/.hilo/canvas.json`。
//!
//! 结构和官方完全一致（`canvasFileSchema`）：
//!
//! ```text
//! file = { version, mode, nodes[], edges[], hiddenAssetIds? }
//! node = { id, type, positions: Record<mode,{x,y}>, size?, sizes?,
//!          assetId?, groupId?, round?, parentId?, isEmpty?, data?, meta? }
//! edge = { id, source, sourceHandle?, target, targetHandle?, type, data? }
//! ```
//!
//! ## 为什么每个结构都带 `extra`
//!
//! 文件里有大量**我们不解释**的字段 —— `data.popoverDraft` 存着"重新生成"
//! 要用的 prompt / modelId / 歌词，还有 `meta` / `round` / `groupId`。
//! 用严格结构体反序列化再序列化回去，这些会被**静默抹掉，而且校验能过**。
//!
//! 所以每一层都留一个 `#[serde(flatten)] extra`，原样带进带出。

use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub struct Xy {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub struct Size {
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    /// **按模式分开存**：同一个节点在 freeform / grid / storyboard / workflow
    /// 下各有一套坐标，而且不保证四种都有。
    #[serde(default)]
    pub positions: BTreeMap<String, Xy>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size: Option<Size>,
    /// 文件里是驼峰。**漏了这个 rename，它会落进 `extra`** ——
    /// round-trip 照样对（flatten 会原样带出去），但 `asset_id` 永远是
    /// `None`，于是所有按资产查节点的逻辑静默失效。
    #[serde(rename = "assetId", default, skip_serializing_if = "Option::is_none")]
    pub asset_id: Option<String>,
    /// 所属分组。**分组就是一个 `type: "group"` 的普通节点**，成员靠子节点
    /// 的 `parentId` 指回它 —— 官方就是这么做的（React Flow 的父子机制），
    /// 不是在文件里另存一个成员列表。
    ///
    /// 这样选中/拖动分组时，成员会跟着走，是库自带的行为；另存列表的话
    /// 两处会不同步，表现是"拖走了组但图还留在原地"。
    #[serde(rename = "parentId", default, skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    /// 我们不解释的字段。原样带进带出。
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    pub id: String,
    pub source: String,
    pub target: String,
    #[serde(rename = "type")]
    pub kind: String,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasFile {
    pub version: u32,
    pub mode: String,
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

impl Default for CanvasFile {
    fn default() -> Self {
        Self {
            version: 1,
            mode: "workflow".to_string(),
            nodes: Vec::new(),
            edges: Vec::new(),
            extra: Map::new(),
        }
    }
}

impl Node {
    pub fn position(&self, mode: &str, file_mode: &str) -> Xy {
        self.positions
            .get(mode)
            .or_else(|| self.positions.get(file_mode))
            .copied()
            .unwrap_or(Xy { x: 0.0, y: 0.0 })
    }
}

/// 破坏性写入防护的阈值。
///
/// 节点数掉到原来的一半以下、且原来不止一个，就认为这次写入可疑。
/// 官方那次事故（144 → 143 连续三天写不进去）说明这个闸不能太紧；
/// 但完全没有闸的话，调用方一个 bug 就能把整张画布清空，**而且结构合法、
/// 校验拦不住**。
const DESTRUCTIVE_RATIO: f64 = 0.5;

/// 参与破坏性写入判断的节点数：**不含贴纸**。
fn count_content(file: &CanvasFile) -> usize {
    file.nodes.iter().filter(|n| n.kind != "sticker").count()
}

#[derive(Debug)]
pub enum SaveError {
    /// 结构不合法。
    Invalid(String),
    /// 疑似破坏性写入，已拒绝并把快照丢进隔离区。
    Destructive {
        before: usize,
        after: usize,
    },
    Io(anyhow::Error),
}

impl std::fmt::Display for SaveError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Invalid(why) => write!(f, "画布结构不合法: {why}"),
            Self::Destructive { before, after } => write!(
                f,
                "疑似破坏性写入：节点数 {before} → {after}，已拒绝。\
                 快照存进了 .hilo/quarantine/"
            ),
            Self::Io(e) => write!(f, "{e:#}"),
        }
    }
}

/// 结构校验。只管图的不变式，业务字段一律放行。
pub fn validate(file: &CanvasFile) -> Result<(), String> {
    let mut ids = std::collections::HashSet::new();
    for n in &file.nodes {
        if n.id.trim().is_empty() {
            return Err("有节点的 id 是空的".into());
        }
        if !ids.insert(&n.id) {
            return Err(format!("节点 id 重复: {}", n.id));
        }
    }
    for e in &file.edges {
        if e.id.trim().is_empty() {
            return Err("有边的 id 是空的".into());
        }
        // 悬空的边会让 React Flow 直接抛错，整张画布白屏。
        if !ids.contains(&e.source) {
            return Err(format!("边 {} 的 source {} 不存在", e.id, e.source));
        }
        if !ids.contains(&e.target) {
            return Err(format!("边 {} 的 target {} 不存在", e.id, e.target));
        }
    }
    Ok(())
}

pub fn read(path: &Path) -> CanvasFile {
    let Ok(raw) = fs::read_to_string(path) else {
        return CanvasFile::default();
    };
    match serde_json::from_str::<CanvasFile>(&raw) {
        Ok(f) => f,
        Err(err) => {
            // 读坏了**不要**返回空画布然后被下一次保存覆盖掉 ——
            // 那等于用户的画布凭空消失。留一份原文再给空的。
            tracing::error!("canvas.json 解析失败，本次按空画布处理: {err}");
            let _ = quarantine(path, &raw, "unreadable");
            CanvasFile::default()
        }
    }
}

/// 整份快照写回，**绕过破坏性写入防护**。
///
/// 只给"意图本身就是替换整份内容"的场景用：新建空画布、切换画布。
/// 那些操作下节点数骤降是正常的，走 [`write`] 会被闸拦住 ——
/// 表现是"点了新建但画布没变"，而且不报错。
///
/// **不要在保存路径上用它。** 那条路上的骤降就是要拦的东西。
pub fn replace(path: &Path, next: &CanvasFile) -> Result<(), SaveError> {
    validate(next).map_err(SaveError::Invalid)?;
    atomic_write(path, next).map_err(SaveError::Io)
}

/// 整份快照写回。
pub fn write(path: &Path, next: &CanvasFile) -> Result<(), SaveError> {
    validate(next).map_err(SaveError::Invalid)?;

    // **贴纸不算数。**「清空全部贴纸」是用户主动点的，一张评审过的画布上
    // 贴纸可能比产物还多（20 个章 + 3 张图），把它们算进去的话这次写入必然
    // 触发闸 —— 表现是点了「确认清空」什么都没发生，而且不报错。
    //
    // 闸要防的是"产物凭空消失"，贴纸是标注，不在防护范围内。
    let before = count_content(&read(path));
    let after = count_content(next);
    if before > 1 && (after as f64) < before as f64 * DESTRUCTIVE_RATIO {
        let raw = serde_json::to_string_pretty(next).unwrap_or_default();
        let _ = quarantine(path, &raw, "destructive");
        return Err(SaveError::Destructive { before, after });
    }

    atomic_write(path, next).map_err(SaveError::Io)
}

/// 原子写：先写临时文件再 rename。
///
/// 直接覆盖写的话，进程在写一半时被杀会留下一个截断的 JSON —— 而这份文件
/// 就是用户的画布。
fn atomic_write(path: &Path, file: &CanvasFile) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).with_context(|| format!("创建 {}", parent.display()))?;
    }
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, serde_json::to_vec_pretty(file)?)
        .with_context(|| format!("写入 {}", tmp.display()))?;
    fs::rename(&tmp, path).with_context(|| format!("替换 {}", path.display()))
}

/// 把一份可疑的内容留档，便于事后捞回来。
fn quarantine(canvas_path: &Path, raw: &str, why: &str) -> Result<()> {
    let dir = canvas_path
        .parent()
        .map(|p| p.join("quarantine"))
        .unwrap_or_else(|| Path::new("quarantine").to_path_buf());
    fs::create_dir_all(&dir)?;
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let out = dir.join(format!("canvas-{why}-{stamp}.json"));
    fs::write(&out, raw)?;
    tracing::warn!(path = %out.display(), "画布快照已隔离");
    Ok(())
}

/// 给新节点找一个不压在别人身上的位置。
///
/// 朴素地往右排：取当前模式下最右的节点，往右让开一个身位。够用，而且
/// 结果可预期 —— 生成完的东西总在最后面，不会插进画布中间。
pub fn next_position(file: &CanvasFile, mode: &str) -> Xy {
    const GAP: f64 = 100.0;
    const DEFAULT_W: f64 = 350.0;
    let rightmost = file
        .nodes
        .iter()
        .map(|n| {
            let p = n.position(mode, &file.mode);
            p.x + n.size.map(|s| s.width).unwrap_or(DEFAULT_W)
        })
        .fold(f64::NEG_INFINITY, f64::max);
    if rightmost.is_finite() {
        Xy {
            x: rightmost + GAP,
            y: 0.0,
        }
    } else {
        Xy { x: 0.0, y: 0.0 }
    }
}

#[cfg(test)]
impl CanvasFile {
    fn positions_len(&self) -> usize {
        self.nodes.first().map(|n| n.positions.len()).unwrap_or(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    const REAL: &str = r#"{
      "version": 1,
      "mode": "workflow",
      "nodes": [{
        "id": "audio-1",
        "type": "audio",
        "positions": { "workflow": { "x": 0, "y": 0 }, "grid": { "x": 10, "y": 20 } },
        "size": { "width": 350, "height": 150 },
        "assetId": "asset-1",
        "round": 3,
        "groupId": "g-1",
        "meta": { "createdBy": "agent" },
        "data": {
          "name": "深夜下班回家.wav",
          "popoverDraft": { "t2a": { "prompt": "中文说唱 trap", "modelId": "music-3.0" } }
        }
      }],
      "edges": [],
      "hiddenAssetIds": ["asset-9"]
    }"#;

    fn tmp() -> (tempfile::TempDir, std::path::PathBuf) {
        let d = tempfile::tempdir().unwrap();
        let p = d.path().join(".hilo/canvas.json");
        fs::create_dir_all(p.parent().unwrap()).unwrap();
        (d, p)
    }

    fn node_of(id: &str, kind: &str) -> Node {
        Node {
            id: id.into(),
            kind: kind.into(),
            positions: BTreeMap::new(),
            size: None,
            asset_id: None,
            parent_id: None,
            extra: Default::default(),
        }
    }

    /// 清空贴纸不该被破坏性写入闸拦住。
    ///
    /// 一张评审过的画布上贴纸可能比产物还多（20 个章 + 3 张图）。把贴纸算进
    /// 节点总数的话，「清空全部贴纸」必然触发闸 —— 表现是点了「确认清空」
    /// 什么都没发生，而且不报错。
    #[test]
    fn clearing_stickers_is_not_destructive() {
        let (_d, p) = tmp();
        let mut before = CanvasFile::default();
        before.nodes.push(node_of("img-1", "image"));
        before.nodes.push(node_of("img-2", "image"));
        before.nodes.push(node_of("img-3", "image"));
        for i in 0..20 {
            before.nodes.push(node_of(&format!("sticker-{i}"), "sticker"));
        }
        replace(&p, &before).unwrap();

        // 23 → 3。按总数算是掉到 13%，远低于 50% 的闸。
        let mut after = before.clone();
        after.nodes.retain(|n| n.kind != "sticker");
        write(&p, &after).expect("清空贴纸被闸拦住了");
    }

    /// 但产物本身骤降还是要拦 —— 贴纸多不能成为绕过闸的办法。
    #[test]
    fn losing_real_nodes_is_still_destructive() {
        let (_d, p) = tmp();
        let mut before = CanvasFile::default();
        for i in 0..4 {
            before.nodes.push(node_of(&format!("img-{i}"), "image"));
        }
        for i in 0..20 {
            before.nodes.push(node_of(&format!("sticker-{i}"), "sticker"));
        }
        replace(&p, &before).unwrap();

        // 贴纸一个不动，只掉产物 4 → 1。
        let mut after = before.clone();
        after.nodes.retain(|n| n.kind != "image" || n.id == "img-0");
        assert!(matches!(write(&p, &after), Err(SaveError::Destructive { .. })));
    }

    #[test]
    fn round_trips_without_losing_unknown_fields() {
        // 这是整个模块最重要的一条。`data.popoverDraft` 是"重新生成"按钮的
        // 数据源，抹掉了不报错，只是那个按钮从此出不来对的东西。
        let file: CanvasFile = serde_json::from_str(REAL).unwrap();
        let back = serde_json::to_value(&file).unwrap();
        let original: Value = serde_json::from_str(REAL).unwrap();

        assert_eq!(back["nodes"][0]["data"], original["nodes"][0]["data"]);
        assert_eq!(back["nodes"][0]["meta"], json!({ "createdBy": "agent" }));
        assert_eq!(back["nodes"][0]["round"], 3);
        assert_eq!(back["nodes"][0]["groupId"], "g-1");
        assert_eq!(back["nodes"][0]["assetId"], "asset-1");
        assert_eq!(back["hiddenAssetIds"], json!(["asset-9"]));
    }

    #[test]
    fn keeps_positions_for_modes_we_did_not_touch() {
        let file: CanvasFile = serde_json::from_str(REAL).unwrap();
        assert_eq!(file.positions_len(), 2);
        let back = serde_json::to_value(&file).unwrap();
        assert_eq!(
            back["nodes"][0]["positions"]["grid"],
            json!({"x":10.0,"y":20.0})
        );
    }

    #[test]
    fn falls_back_to_the_file_mode_then_the_origin() {
        let file: CanvasFile = serde_json::from_str(REAL).unwrap();
        let n = &file.nodes[0];
        // storyboard 没有坐标 → 退回文件声明的 workflow
        assert_eq!(n.position("storyboard", &file.mode), Xy { x: 0.0, y: 0.0 });
        assert_eq!(n.position("grid", &file.mode), Xy { x: 10.0, y: 20.0 });
    }

    #[test]
    fn rejects_duplicate_node_ids() {
        let mut f = CanvasFile::default();
        for _ in 0..2 {
            f.nodes.push(Node {
                id: "same".into(),
                kind: "image".into(),
                positions: BTreeMap::new(),
                size: None,
                asset_id: None,
                parent_id: None,
                extra: Map::new(),
            });
        }
        assert!(validate(&f).is_err());
    }

    #[test]
    fn rejects_dangling_edges() {
        // 悬空的边会让 React Flow 抛错，整张画布白屏。
        let mut f = CanvasFile::default();
        f.nodes.push(Node {
            id: "a".into(),
            kind: "image".into(),
            positions: BTreeMap::new(),
            size: None,
            asset_id: None,
            parent_id: None,
            extra: Map::new(),
        });
        f.edges.push(Edge {
            id: "a->ghost".into(),
            source: "a".into(),
            target: "ghost".into(),
            kind: "derivation".into(),
            extra: Map::new(),
        });
        assert!(validate(&f).unwrap_err().contains("ghost"));
    }

    #[test]
    fn asset_id_lands_on_the_field_not_in_extra() {
        // 掉进 extra 的话 round-trip 照样对，但 asset_id 永远是 None，
        // 所有按资产查节点的逻辑会静默失效。
        let file: CanvasFile = serde_json::from_str(REAL).unwrap();
        assert_eq!(file.nodes[0].asset_id.as_deref(), Some("asset-1"));
        assert!(!file.nodes[0].extra.contains_key("assetId"));
        // 序列化回去仍然是驼峰。
        let back = serde_json::to_value(&file).unwrap();
        assert_eq!(back["nodes"][0]["assetId"], "asset-1");
        assert!(back["nodes"][0].get("asset_id").is_none());
    }

    #[test]
    fn writes_and_reads_back() {
        let (_d, p) = tmp();
        let file: CanvasFile = serde_json::from_str(REAL).unwrap();
        write(&p, &file).unwrap();
        let back = read(&p);
        assert_eq!(back.nodes.len(), 1);
        assert_eq!(back.nodes[0].asset_id.as_deref(), Some("asset-1"));
    }

    #[test]
    fn refuses_a_write_that_wipes_most_of_the_canvas() {
        // 调用方一个 bug 就能清空画布，而且结构完全合法 —— 校验拦不住，
        // 只能靠这道闸。
        let (_d, p) = tmp();
        let mut many = CanvasFile::default();
        for i in 0..10 {
            many.nodes.push(Node {
                id: format!("n{i}"),
                kind: "image".into(),
                positions: BTreeMap::new(),
                size: None,
                asset_id: None,
                parent_id: None,
                extra: Map::new(),
            });
        }
        write(&p, &many).unwrap();

        let mut few = many.clone();
        few.nodes.truncate(2);
        match write(&p, &few) {
            Err(SaveError::Destructive { before, after }) => {
                assert_eq!((before, after), (10, 2));
            }
            other => panic!("应该被拒绝: {other:?}"),
        }
        // 磁盘上那份必须原封不动。
        assert_eq!(read(&p).nodes.len(), 10);
        assert!(p.parent().unwrap().join("quarantine").is_dir());
    }

    #[test]
    fn a_normal_deletion_still_goes_through() {
        // 闸不能太紧：官方那次事故就是 144 → 143 被连续拒了三天。
        let (_d, p) = tmp();
        let mut many = CanvasFile::default();
        for i in 0..10 {
            many.nodes.push(Node {
                id: format!("n{i}"),
                kind: "image".into(),
                positions: BTreeMap::new(),
                size: None,
                asset_id: None,
                parent_id: None,
                extra: Map::new(),
            });
        }
        write(&p, &many).unwrap();
        many.nodes.truncate(9);
        write(&p, &many).unwrap();
        assert_eq!(read(&p).nodes.len(), 9);
    }

    #[test]
    fn clearing_a_one_node_canvas_is_allowed() {
        // 只有一个节点时删掉它是完全正常的操作，不该被闸挡住。
        let (_d, p) = tmp();
        let mut one = CanvasFile::default();
        one.nodes.push(Node {
            id: "n".into(),
            kind: "image".into(),
            positions: BTreeMap::new(),
            size: None,
            asset_id: None,
            parent_id: None,
            extra: Map::new(),
        });
        write(&p, &one).unwrap();
        one.nodes.clear();
        write(&p, &one).unwrap();
        assert_eq!(read(&p).nodes.len(), 0);
    }

    #[test]
    fn an_unreadable_file_is_quarantined_not_silently_replaced() {
        // 返回空画布然后被下一次保存覆盖，等于用户的画布凭空消失。
        let (_d, p) = tmp();
        fs::write(&p, "{ 截断的").unwrap();
        assert_eq!(read(&p).nodes.len(), 0);
        assert!(p.parent().unwrap().join("quarantine").is_dir());
    }

    #[test]
    fn new_nodes_go_to_the_right_of_everything() {
        let file: CanvasFile = serde_json::from_str(REAL).unwrap();
        let p = next_position(&file, "workflow");
        assert_eq!(p.x, 450.0); // 0 + 350 宽 + 100 间隔
        assert_eq!(
            next_position(&CanvasFile::default(), "workflow"),
            Xy { x: 0.0, y: 0.0 }
        );
    }
}
