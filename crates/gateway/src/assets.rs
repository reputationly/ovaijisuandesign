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
    /// 开局时索引是坏的。见 [`Assets::load`]。
    degraded: bool,
    inner: Mutex<Index>,
}

impl Assets {
    /// 从磁盘加载索引。文件不存在或读坏了都当空索引开局 ——
    /// 索引是可以重建的派生数据，不该因为它挡住整个服务启动。
    pub fn load(ws: Workspace) -> Self {
        let path = ws.assets_path();
        let (index, degraded) = match fs::read_to_string(&path) {
            // 文件不存在 = 首次运行。**这是正常的**,不是事故。
            Err(_) => (Index::default(), false),
            Ok(raw) => match serde_json::from_str::<Index>(&raw) {
                Ok(i) => (i, false),
                Err(err) => {
                    // **索引损坏。先把原文件隔离出来，再按空索引开局。**
                    //
                    // 以前这里直接 `unwrap_or_default()` —— 空索引开局之后，
                    // 下一次生成或登记会 `persist` 一份空的写回磁盘,
                    // **把那份坏但可能可修的原文件永久覆盖掉**。那才是真的
                    // 不可恢复：资产文件都还在盘上，但 id → path 的映射没了,
                    // 画布上每个节点都变成悬空引用。
                    //
                    // 官方 3.0.14 新加的 `bundleError.diagnosis.
                    // workspaceIndexRecovery` 防的就是这件事：
                    // 「无法安全恢复项目的素材关联。**为保护原有内容，已停止
                    // 自动重建**；这不代表素材文件已被删除。」
                    tracing::error!("资产索引解析失败: {err}");
                    if let Err(e) = quarantine_index(&path, &raw) {
                        tracing::error!("隔离损坏的资产索引也失败了: {e:#}");
                    }
                    (Index::default(), true)
                }
            },
        };
        if degraded {
            tracing::warn!(
                "按空索引开局。**素材文件都还在盘上**,只是关联信息需要恢复 —— \
                 原索引已隔离到 quarantine/，不要删除工作区或清理应用数据。"
            );
        }
        tracing::info!(count = index.by_path.len(), degraded, "资产索引已加载");
        Self {
            ws,
            inner: Mutex::new(index),
            degraded,
        }
    }

    /// 索引是不是降级开局（原文件损坏、已隔离）。
    ///
    /// 界面要能看见这个 —— 不然用户只会看到"所有素材都不见了",
    /// 而真相是**文件都在，只是关联信息坏了**。
    pub fn is_degraded(&self) -> bool {
        self.degraded
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

    /// 把外部来的字节存进工作区并登记，返回**工作区相对路径**。
    ///
    /// 飞书/微信收到的附件都走这里 —— 和生成结果、界面上传是同一条路，
    /// 于是它会被登记进资产索引、按类型归档，agent 拿到路径就能当底图用。
    ///
    /// `filename` 是外部给的，**不可信**：只取最后一段并挡住 `..`,
    /// 否则一个 `../../.ssh/config` 就写到工作区外面去了。
    ///
    /// 同名不覆盖。用户可能两次发同一个文件名的图，覆盖会把上一张换掉，
    /// 而画布上引用它的节点看起来毫无变化。
    pub fn store(&self, filename: &str, bytes: &[u8]) -> Result<String> {
        let name = Path::new(filename)
            .file_name()
            .map(|s| s.to_string_lossy().into_owned())
            .filter(|s| !s.is_empty() && s != "." && s != "..")
            .unwrap_or_else(|| "attachment".into());
        let ext = Path::new(&name)
            .extension()
            .map(|e| e.to_string_lossy().to_ascii_lowercase())
            .unwrap_or_default();
        let dir = crate::workspace::subdir_for(&ext);

        let mut rel = format!("{dir}/{name}");
        if self.ws.resolve(&rel).is_some_and(|p| p.exists()) {
            let stem = Path::new(&name)
                .file_stem()
                .map(|s| s.to_string_lossy().into_owned())
                .unwrap_or_else(|| "attachment".into());
            let dot = if ext.is_empty() { "" } else { "." };
            // 上限是为了不在一个撞名撞疯了的目录里空转。到头就报错，
            // 而不是静默覆盖第 1000 个。
            let free = (2..1000)
                .map(|n| format!("{dir}/{stem}-{n}{dot}{ext}"))
                .find(|cand| !self.ws.resolve(cand).is_some_and(|p| p.exists()));
            rel = free.with_context(|| format!("{dir}/ 下同名文件太多: {name}"))?;
        }

        let abs = self
            .ws
            .resolve(&rel)
            .with_context(|| format!("路径超出工作区: {rel}"))?;
        if let Some(d) = abs.parent() {
            fs::create_dir_all(d).with_context(|| format!("建目录失败: {}", d.display()))?;
        }
        fs::write(&abs, bytes).with_context(|| format!("写入失败: {}", abs.display()))?;
        self.enroll(&rel)?;
        Ok(rel)
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

    /// 重新读一遍所有资产的画面尺寸。**不碰画布。**
    ///
    /// 加尺寸解析（比如视频那次）之后，已经登记过的资产还是老记录 ——
    /// 画布上的节点会一直用错的尺寸。
    ///
    /// **不要用 `media-node` 来达到这个目的**：那条路是"把素材放上画布",
    /// 对当前画布上没有的素材会**新建节点** —— 我就是这么往用户的画布里
    /// 塞进去三个视频节点的。
    ///
    /// 返回尺寸发生变化的条数。
    pub fn rescan_dimensions(&self) -> usize {
        let paths: Vec<String> = self.lock().by_path.keys().cloned().collect();
        let mut changed = 0;
        for rel in paths {
            let Some(abs) = self.ws.resolve(&rel) else { continue };
            let (w, h) = image_dimensions(&abs);
            if w.is_none() && h.is_none() {
                continue;
            }
            let mut index = self.lock();
            if let Some(a) = index.by_path.get_mut(&rel) {
                if a.width != w || a.height != h {
                    a.width = w;
                    a.height = h;
                    changed += 1;
                }
            }
        }
        if changed > 0 {
            let snapshot = Index {
                version: 1,
                by_path: self.lock().by_path.clone(),
            };
            if let Err(err) = self.persist(&snapshot) {
                tracing::warn!("资产索引写盘失败: {err:#}");
            }
        }
        changed
    }

    pub fn list(&self) -> Vec<Asset> {
        let mut all: Vec<Asset> = self.lock().by_path.values().cloned().collect();
        // 新的在前。画布的资产侧栏默认按时间倒序。
        all.sort_by(|a, b| b.time.cmp(&a.time).then_with(|| a.path.cmp(&b.path)));
        all
    }

    /// 把资产**移到废纸篓**,并从索引里摘掉。返回真正处理掉的路径。
    ///
    /// **不是真删。** 官方那句确认文案写着「可在废纸篓中找到」—— 承诺了能
    /// 找回来就必须真的能找回来。落在工作区的 `.hilo/trash/<时间戳>/` 下，
    /// 保留原来的相对路径结构，这样一眼能看出它原来在哪。
    ///
    /// 单个失败不中断整批：批量删 20 个文件，其中一个正被别的进程占用，
    /// 不该让另外 19 个也删不掉。失败的留在索引里，调用方对比返回值就知道
    /// 哪些没成。
    pub fn trash(&self, rel_paths: &[String]) -> Vec<String> {
        let stamp = now_iso();
        let bin = self.ws.root().join(".hilo/trash").join(&stamp);
        let mut done = Vec::new();

        for rel in rel_paths {
            let Some(abs) = self.ws.resolve(rel) else {
                // 路径逃出工作区。**跳过，不要报错后继续用它** ——
                // 这种输入只可能来自构造过的请求。
                tracing::warn!("删除请求的路径超出工作区，已忽略: {rel}");
                continue;
            };
            let dest = bin.join(rel);
            if let Some(parent) = dest.parent() {
                if let Err(err) = fs::create_dir_all(parent) {
                    tracing::warn!("建废纸篓目录失败 {}: {err:#}", parent.display());
                    continue;
                }
            }
            // 文件可能已经不在了（用户在访达里删过）。那也算删成功 ——
            // 用户的意图是"让它从列表里消失"，报错只会让他困惑。
            match fs::rename(&abs, &dest) {
                Ok(()) => done.push(rel.clone()),
                Err(err) if err.kind() == std::io::ErrorKind::NotFound => done.push(rel.clone()),
                Err(err) => tracing::warn!("移到废纸篓失败 {rel}: {err:#}"),
            }
        }

        if done.is_empty() {
            return done;
        }
        let mut index = self.lock();
        for rel in &done {
            index.by_path.remove(rel);
        }
        let snapshot = Index {
            version: 1,
            by_path: index.by_path.clone(),
        };
        drop(index);
        if let Err(err) = self.persist(&snapshot) {
            tracing::warn!("资产索引写盘失败: {err:#}");
        }
        done
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
/// 素材的画面尺寸。图片走 `image` crate，视频自己解 MP4 盒子。
///
/// **视频以前一律拿到 `(None, None)`** —— 于是画布上每个视频节点都退回
/// 默认的 350x350 方块，而视频本身多半是 16:9。不报错、不崩，只是尺寸
/// 一直是错的，刷新也不会变。
fn image_dimensions(path: &Path) -> (Option<u32>, Option<u32>) {
    if let Ok((w, h)) = image::image_dimensions(path) {
        return (Some(w), Some(h));
    }
    if let Some(info) = crate::mp4::probe_file(path) {
        return (Some(info.width), Some(info.height));
    }
    (None, None)
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
    fn a_stored_attachment_lands_in_the_folder_for_its_type() {
        let (d, assets) = setup();
        let rel = assets.store("photo.jpg", b"xx").unwrap();
        assert_eq!(rel, "images/photo.jpg");
        assert!(d.path().join(&rel).exists());
        // 登记进索引才算数 —— 没登记的话 agent 用路径能找到文件，
        // 但资产面板和画布节点都不认识它。
        assert!(assets.list().iter().any(|a| a.path == rel));
        assert_eq!(assets.store("clip.mp4", b"xx").unwrap(), "videos/clip.mp4");
        assert_eq!(assets.store("说明.pdf", b"xx").unwrap(), "files/说明.pdf");
    }

    #[test]
    fn a_hostile_filename_cannot_escape_the_workspace() {
        // 文件名是外部给的。不清洗的话一个 `../../.ssh/config` 就写到
        // 工作区外面去了 —— 而这条路径上的字节来自任何能给机器人发消息的人。
        let (d, assets) = setup();
        let rel = assets.store("../../.ssh/config", b"pwned").unwrap();
        assert!(!rel.contains(".."), "{rel}");
        assert_eq!(rel, "files/config");
        assert!(!d.path().parent().unwrap().join(".ssh/config").exists());
    }

    #[test]
    fn two_attachments_with_the_same_name_do_not_overwrite_each_other() {
        // 覆盖的话会把上一张换掉，而画布上引用它的节点看起来毫无变化。
        let (_d, assets) = setup();
        assert_eq!(
            assets.store("shot.png", b"first").unwrap(),
            "images/shot.png"
        );
        let second = assets.store("shot.png", b"second").unwrap();
        assert_eq!(second, "images/shot-2.png");
        assert_eq!(
            assets.store("shot.png", b"third").unwrap(),
            "images/shot-3.png"
        );
        // 第一份还在，内容没被动过。
        assert_eq!(
            fs::read(assets.ws.resolve("images/shot.png").unwrap()).unwrap(),
            b"first"
        );
    }

    #[test]
    fn a_filename_that_is_only_dots_still_gets_stored() {
        // `..` / `.` / 空串取 file_name 之后什么都不剩。直接用的话会
        // 写成一个目录名或者报一个看不懂的 IO 错误。
        let (_d, assets) = setup();
        assert_eq!(assets.store("..", b"x").unwrap(), "files/attachment");
        assert_eq!(assets.store("", b"x").unwrap(), "files/attachment-2");
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
        assert_eq!(
            again.by_id(&a.id).map(|x| x.path),
            Some("images/a.png".into())
        );
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

/// 把损坏的资产索引另存一份。和 `canvas.rs` 的 `quarantine` 同一个套路。
///
/// **必须在覆盖之前做。** 索引是"哪个 id 对应哪个文件"的唯一记录 ——
/// 素材文件本身还在盘上，但没有这份映射，画布上每个节点都是悬空引用，
/// 而重建需要的信息只在这份坏文件里。
fn quarantine_index(path: &Path, raw: &str) -> Result<()> {
    let dir = path
        .parent()
        .map(|p| p.join("quarantine"))
        .unwrap_or_else(|| Path::new("quarantine").to_path_buf());
    fs::create_dir_all(&dir)?;
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let out = dir.join(format!("assets-broken-{stamp}.json"));
    fs::write(&out, raw)?;
    tracing::warn!(path = %out.display(), "损坏的资产索引已隔离");
    Ok(())
}

#[cfg(test)]
mod degraded_tests {
    use super::*;

    fn ws() -> (tempfile::TempDir, Workspace) {
        let d = tempfile::tempdir().unwrap();
        let w = Workspace::new(d.path().to_path_buf());
        fs::create_dir_all(w.assets_path().parent().unwrap()).unwrap();
        (d, w)
    }

    /// **索引损坏时必须先隔离原文件。**
    ///
    /// 以前是直接按空索引开局 —— 而空索引一旦被 `persist` 写回，
    /// 那份坏但可能可修的原文件就**永久没了**。素材文件都还在盘上，
    /// 但 id → path 的映射没了，画布上每个节点都变成悬空引用。
    ///
    /// 官方 3.0.14 新加的 `bundleError.diagnosis.workspaceIndexRecovery`
    /// 防的就是这件事。
    #[test]
    fn a_broken_index_is_quarantined_before_anything_overwrites_it() {
        let (_d, w) = ws();
        let path = w.assets_path();
        fs::write(&path, "{ 这不是合法 JSON").unwrap();

        let assets = Assets::load(w.clone());
        assert!(assets.is_degraded(), "坏索引应该被认出来");

        let dir = path.parent().unwrap().join("quarantine");
        let saved: Vec<_> = fs::read_dir(&dir)
            .expect("应该建了 quarantine 目录")
            .flatten()
            .collect();
        assert_eq!(saved.len(), 1, "应该正好隔离出一份");
        let body = fs::read_to_string(saved[0].path()).unwrap();
        assert!(body.contains("这不是合法 JSON"), "隔离的必须是原文，不能是空的");
    }

    /// **文件不存在是正常的**（首次运行），不该当成事故。
    ///
    /// 两者以前都走 `unwrap_or_default()`,行为一样 —— 于是真出事故时
    /// 也看不出来。
    #[test]
    fn a_missing_index_is_not_degraded() {
        let (_d, w) = ws();
        let assets = Assets::load(w.clone());
        assert!(!assets.is_degraded());
        assert!(!w.assets_path().parent().unwrap().join("quarantine").exists());
    }

    #[test]
    fn a_good_index_loads_normally() {
        let (_d, w) = ws();
        fs::write(&w.assets_path(), r#"{"version":1,"by_path":{}}"#).unwrap();
        assert!(!Assets::load(w).is_degraded());
    }
}
