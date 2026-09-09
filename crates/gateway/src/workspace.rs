//! 工作区：路径解析与安全边界。
//!
//! 布局和官方保持一致，这样同一个目录两边都能打开：
//!
//! ```text
//! <工作区>/
//!   .hilo/canvas.json     画布图
//!   .hilo/assets.json     资产索引（我们自己的，见 crate::assets）
//!   images/ videos/ audios/ texts/ files/
//! ```

use std::path::{Component, Path, PathBuf};

/// 按扩展名归到哪个子目录。和官方的 `deriveImportTarget` 对齐。
pub fn subdir_for(ext: &str) -> &'static str {
    match ext.trim_start_matches('.').to_ascii_lowercase().as_str() {
        "png" | "jpg" | "jpeg" | "webp" | "gif" | "bmp" | "heic" | "svg" => "images",
        "mp4" | "mov" | "webm" | "mkv" | "avi" => "videos",
        "mp3" | "wav" | "m4a" | "flac" | "aac" | "ogg" => "audios",
        "md" | "txt" | "json" | "csv" | "srt" | "vtt" => "texts",
        _ => "files",
    }
}

/// 资产的模态。画布节点的 `type` 用的就是这个。
pub fn kind_for(ext: &str) -> &'static str {
    match subdir_for(ext) {
        "images" => "image",
        "videos" => "video",
        "audios" => "audio",
        "texts" => "text",
        _ => "file",
    }
}

#[derive(Debug, Clone)]
pub struct Workspace {
    root: PathBuf,
}

impl Workspace {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self { root: root.into() }
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    /// `.hilo/` 目录。
    pub fn hilo(&self) -> PathBuf {
        self.root.join(".hilo")
    }

    pub fn canvas_path(&self) -> PathBuf {
        self.hilo().join("canvas.json")
    }

    pub fn assets_path(&self) -> PathBuf {
        self.hilo().join("assets.json")
    }

    /// 把一个工作区相对路径解析成绝对路径，**拒绝逃出工作区**。
    ///
    /// 这一层是安全边界：相对路径来自 agent 和 HTTP 请求，`../../etc/passwd`
    /// 和绝对路径都必须挡住。官方那个函数叫 `safeResolve`。
    ///
    /// 只做词法归一化，不碰文件系统 —— 符号链接不在这里处理（工作区里的
    /// 软链是用户自己放的，跟着走是预期行为）。
    pub fn resolve(&self, rel: &str) -> Option<PathBuf> {
        let rel = rel.trim();
        if rel.is_empty() {
            return None;
        }
        let candidate = Path::new(rel);
        if candidate.is_absolute() {
            return None;
        }

        let mut out = PathBuf::new();
        for part in candidate.components() {
            match part {
                Component::Normal(p) => out.push(p),
                // `./` 无害，跳过
                Component::CurDir => {}
                // `..` 一律拒绝，而不是"弹一层"——弹层的写法在
                // `a/../../b` 这种输入上会算出工作区外面去。
                Component::ParentDir => return None,
                // 前缀和根只可能出现在绝对路径里，上面已经挡了
                Component::RootDir | Component::Prefix(_) => return None,
            }
        }
        if out.as_os_str().is_empty() {
            return None;
        }
        Some(self.root.join(out))
    }

    /// 反过来：绝对路径 → 工作区相对路径（用 `/` 分隔，和存进
    /// `canvas.json` 的形式一致）。
    pub fn relativize(&self, abs: &Path) -> Option<String> {
        let rel = abs.strip_prefix(&self.root).ok()?;
        let s = rel
            .components()
            .filter_map(|c| match c {
                Component::Normal(p) => Some(p.to_string_lossy().into_owned()),
                _ => None,
            })
            .collect::<Vec<_>>()
            .join("/");
        (!s.is_empty()).then_some(s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ws() -> Workspace {
        Workspace::new("/tmp/ws")
    }

    #[test]
    fn resolves_a_plain_relative_path() {
        assert_eq!(
            ws().resolve("images/a.png"),
            Some(PathBuf::from("/tmp/ws/images/a.png"))
        );
    }

    #[test]
    fn rejects_escapes() {
        // 这些相对路径来自 agent 和 HTTP 请求，是真的会被喂进来的。
        for bad in [
            "../secrets",
            "images/../../etc/passwd",
            "a/../../b",
            "..",
            "./../x",
        ] {
            assert_eq!(ws().resolve(bad), None, "{bad} 应该被拒绝");
        }
    }

    #[test]
    fn rejects_absolute_paths() {
        for bad in ["/etc/passwd", "/tmp/ws/images/a.png"] {
            assert_eq!(ws().resolve(bad), None, "{bad} 应该被拒绝");
        }
    }

    #[test]
    fn rejects_empty() {
        assert_eq!(ws().resolve(""), None);
        assert_eq!(ws().resolve("   "), None);
        assert_eq!(ws().resolve("."), None);
    }

    #[test]
    fn a_leading_dot_slash_is_harmless() {
        assert_eq!(
            ws().resolve("./images/a.png"),
            Some(PathBuf::from("/tmp/ws/images/a.png"))
        );
    }

    #[test]
    fn relativizes_back_with_forward_slashes() {
        // canvas.json 里存的一律是 `/` 分隔，Windows 上也一样。
        assert_eq!(
            ws().relativize(Path::new("/tmp/ws/images/a.png")),
            Some("images/a.png".to_string())
        );
        assert_eq!(ws().relativize(Path::new("/elsewhere/a.png")), None);
    }

    #[test]
    fn routes_extensions_to_the_official_subdirs() {
        assert_eq!(subdir_for("png"), "images");
        assert_eq!(subdir_for(".JPEG"), "images");
        assert_eq!(subdir_for("mp4"), "videos");
        assert_eq!(subdir_for("wav"), "audios");
        assert_eq!(subdir_for("md"), "texts");
        // 认不出的一律进 files/，不要猜。
        assert_eq!(subdir_for("bin"), "files");
        assert_eq!(subdir_for(""), "files");
    }

    #[test]
    fn kinds_match_canvas_node_types() {
        // 画布节点的 type 就是这个值，写错会让节点渲染成"未支持"。
        assert_eq!(kind_for("png"), "image");
        assert_eq!(kind_for("mp4"), "video");
        assert_eq!(kind_for("wav"), "audio");
        assert_eq!(kind_for("md"), "text");
        assert_eq!(kind_for("bin"), "file");
    }
}
