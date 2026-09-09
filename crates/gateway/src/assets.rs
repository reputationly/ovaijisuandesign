//! 资产库。
//!
//! **不复刻官方那套 SQLite**（11 个 migration，xxh3 指纹 + inode 追踪 +
//! 文件移动后重绑 + 丢失资产候选匹配）。我们只要"路径 ⇄ 稳定 id + 尺寸"，
//! 一个原子写的 JSON 索引就够。
//!
//! 代价说清楚：官方那套能扛住"用户在 Finder 里把文件挪了"这种事，我们不能 ——
//! 挪了就当成新资产，旧的成为悬空引用。等真遇到了再补，不要提前造。
//!
//! 兼容边界：**文件布局和 `canvas.json` 与官方完全一致，索引各自建**。
//! 同一个工作区两边都能打开，只是各自认各自的 assetId。官方本来每次启动也
//! 会 reconcile 重建索引。

use std::collections::BTreeMap;
use std::fs;
use std::path::Path;
use std::sync::{Mutex, MutexGuard};

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

use crate::workspace::{Workspace, kind_for};

/// 一条资产记录。字段名对齐官方 `GET /api/assets` 的返回。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Asset {
    pub id: String,
    /// 工作区相对路径，`/` 分隔。
    pub path: String,
    /// `image` / `video` / `audio` / `text` / `file`
    #[serde(rename = "type")]
    pub kind: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub width: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub height: Option<u32>,
    #[serde(default)]
    pub file_size: u64,
    /// 供画布显示用。官方叫 `time`。
    #[serde(default)]
    pub time: String,
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct Index {
    #[serde(default)]
    version: u32,
    /// path → 记录。用 path 做键是因为**去重是按路径的** ——
    /// 同一个文件被导入两次要返回同一条记录，否则画布上会多出一个
    /// 指向同一份字节的重复节点。
    #[serde(default)]
    by_path: BTreeMap<String, Asset>,
}

pub struct Assets {
    ws: Workspace,
    inner: Mutex<Index>,
}

impl Assets {
    /// 从磁盘加载索引。文件不存在或读坏了都当空索引开局 ——
    /// 索引是可以重建的派生数据，不该因为它挡住整个服务启动。
    pub fn load(ws: Workspace) -> Self {
        let index = fs::read_to_string(ws.assets_path())
            .ok()
            .and_then(|raw| match serde_json::from_str::<Index>(&raw) {
                Ok(i) => Some(i),
                Err(err) => {
                    tracing::warn!("资产索引解析失败，按空索引开局: {err}");
                    None
                }
            })
            .unwrap_or_default();
        tracing::info!(count = index.by_path.len(), "资产索引已加载");
        Self {
            ws,
            inner: Mutex::new(index),
        }
    }

    fn lock(&self) -> MutexGuard<'_, Index> {
        // 索引锁被毒化说明有别的线程 panic 过。继续用里面的数据比整个服务
        // 挂掉好 —— 它是派生数据，最坏情况是少一条记录。
        self.inner.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// 原子写盘：先写临时文件再 rename。
    ///
    /// 直接覆盖写的话，进程在写一半时被杀会留下一个截断的 JSON，
    /// 下次启动整个索引就没了。
    fn persist(&self, index: &Index) -> Result<()> {
        let path = self.ws.assets_path();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .with_context(|| format!("创建目录失败: {}", parent.display()))?;
        }
        let tmp = path.with_extension("json.tmp");
        fs::write(&tmp, serde_json::to_vec_pretty(index)?)
            .with_context(|| format!("写入资产索引失败: {}", tmp.display()))?;
        fs::rename(&tmp, &path).with_context(|| format!("替换资产索引失败: {}", path.display()))
    }

    /// 登记一个已经落在工作区里的文件，返回资产记录。
    ///
    /// **按路径幂等**：同一个路径重复登记返回同一条记录（尺寸会刷新）。
    pub fn enroll(&self, rel_path: &str) -> Result<Asset> {
        let abs = self
            .ws
            .resolve(rel_path)
            .with_context(|| format!("路径超出工作区: {rel_path}"))?;
        let meta = fs::metadata(&abs).with_context(|| format!("读不到 {}", abs.display()))?;

        let ext = abs
            .extension()
            .map(|e| e.to_string_lossy().into_owned())
            .unwrap_or_default();
        let name = abs
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| rel_path.to_string());
        let (width, height) = image_dimensions(&abs);

        let mut index = self.lock();
        let existing_id = index.by_path.get(rel_path).map(|a| a.id.clone());
        let asset = Asset {
            // 已有的 id 必须保留：`canvas.json` 里的节点用 assetId 引用资产，
            // 换 id 等于把画布上的节点变成悬空引用。
            id: existing_id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
            path: rel_path.to_string(),
            kind: kind_for(&ext).to_string(),
            name,
            width,
            height,
            file_size: meta.len(),
            time: now_iso(),
        };
        index.by_path.insert(rel_path.to_string(), asset.clone());
        let snapshot = Index {
            version: 1,
            by_path: index.by_path.clone(),
        };
        drop(index);

        if let Err(err) = self.persist(&snapshot) {
            // 写盘失败不该让这次生成失败 —— 文件已经在工作区里了，
            // 索引下次还能重建。但一定要 WARN。
            tracing::warn!("资产索引写盘失败: {err:#}");
        }
        Ok(asset)
    }

    pub fn list(&self) -> Vec<Asset> {
        let mut all: Vec<Asset> = self.lock().by_path.values().cloned().collect();
        // 新的在前。画布的资产侧栏默认按时间倒序。
        all.sort_by(|a, b| b.time.cmp(&a.time).then_with(|| a.path.cmp(&b.path)));
        all
    }

    pub fn by_id(&self, id: &str) -> Option<Asset> {
        self.lock().by_path.values().find(|a| a.id == id).cloned()
    }

    pub fn by_path(&self, rel_path: &str) -> Option<Asset> {
        self.lock().by_path.get(rel_path).cloned()
    }
}

fn now_iso() -> String {
    // 只用于展示排序，不做时区换算 —— 拉一个日期库进来不值当。
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{secs}")
}

/// 读图片尺寸。只读文件头，不解码整张图。
///
/// 读不到就返回 `None` —— 非图片、或者格式不认识都是正常情况，
/// 画布拿不到尺寸会自己从文件里量。
fn image_dimensions(path: &Path) -> (Option<u32>, Option<u32>) {
    match image::image_dimensions(path) {
        Ok((w, h)) => (Some(w), Some(h)),
        Err(_) => (None, None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup() -> (tempfile::TempDir, Assets) {
        let dir = tempfile::tempdir().unwrap();
        fs::create_dir_all(dir.path().join("images")).unwrap();
        // 一张真的 1x1 PNG，用来验尺寸读取。
        let png: &[u8] = &[
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48,
            0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00,
            0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78,
            0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
        ];
        fs::write(dir.path().join("images/a.png"), png).unwrap();
        let ws = Workspace::new(dir.path());
        let assets = Assets::load(ws);
        (dir, assets)
    }

    #[test]
    fn enrolls_with_kind_size_and_dimensions() {
        let (_d, assets) = setup();
        let a = assets.enroll("images/a.png").unwrap();
        assert_eq!(a.kind, "image");
        assert_eq!(a.path, "images/a.png");
        assert_eq!(a.name, "a.png");
        assert_eq!((a.width, a.height), (Some(1), Some(1)));
        assert!(a.file_size > 0);
    }

    #[test]
    fn enrolling_twice_keeps_the_same_id() {
        // id 变了等于把 canvas.json 里引用它的节点变成悬空引用。
        let (_d, assets) = setup();
        let first = assets.enroll("images/a.png").unwrap();
        let second = assets.enroll("images/a.png").unwrap();
        assert_eq!(first.id, second.id);
        assert_eq!(assets.list().len(), 1, "重复登记不该多出一条");
    }

    #[test]
    fn rejects_paths_outside_the_workspace() {
        let (_d, assets) = setup();
        assert!(assets.enroll("../../etc/passwd").is_err());
        assert!(assets.enroll("/etc/passwd").is_err());
    }

    #[test]
    fn a_missing_file_is_an_error_not_an_empty_record() {
        // 登记一条指向不存在文件的记录，会让画布上出现一个永远加载不出来的节点。
        let (_d, assets) = setup();
        assert!(assets.enroll("images/gone.png").is_err());
    }

    #[test]
    fn survives_a_restart() {
        let (dir, assets) = setup();
        let a = assets.enroll("images/a.png").unwrap();
        drop(assets);

        let again = Assets::load(Workspace::new(dir.path()));
        assert_eq!(again.by_id(&a.id).map(|x| x.path), Some("images/a.png".into()));
        assert_eq!(again.by_path("images/a.png").map(|x| x.id), Some(a.id));
    }

    #[test]
    fn a_corrupt_index_does_not_block_startup() {
        // 索引是派生数据。读坏了应该重头开始，而不是让整个服务起不来。
        let dir = tempfile::tempdir().unwrap();
        fs::create_dir_all(dir.path().join(".hilo")).unwrap();
        fs::write(dir.path().join(".hilo/assets.json"), "{ 截断的").unwrap();
        assert!(Assets::load(Workspace::new(dir.path())).list().is_empty());
    }

    #[test]
    fn non_images_enroll_without_dimensions() {
        let dir = tempfile::tempdir().unwrap();
        fs::create_dir_all(dir.path().join("audios")).unwrap();
        fs::write(dir.path().join("audios/a.wav"), b"RIFF....").unwrap();
        let assets = Assets::load(Workspace::new(dir.path()));
        let a = assets.enroll("audios/a.wav").unwrap();
        assert_eq!(a.kind, "audio");
        assert_eq!(a.width, None);
    }
}
