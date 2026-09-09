//! 本地配置。
//!
//! **没有登录** —— 用户只填平台地址、key 和几个模型名。官方那套扫码授权 /
//! 账号 / 积分我们整个不做，理由见仓库 README。

use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use maas_media::{MediaConfig, Models, Platform};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// 监听端口。
    #[serde(default = "default_port")]
    pub port: u16,
    /// 工作区目录。留空则用启动时的当前目录。
    ///
    /// 也可以用 `WORKSPACE_DIR` 环境变量覆盖 —— 和官方那边同名，
    /// 这样两边的启动脚本能共用。
    #[serde(default)]
    pub workspace: Option<PathBuf>,
    /// 没实现的路由反代到哪里，例如官方 gateway `http://127.0.0.1:8099`。
    ///
    /// 留空表示不反代 —— 那是"已经能独立跑"的状态。见 [`crate::proxy`]。
    #[serde(default)]
    pub upstream: Option<String>,
    /// 平台接入信息 + 各模态用哪个模型。
    ///
    /// 直接内嵌 [`MediaConfig`]：这一层没有任何需要额外包装的东西，
    /// 多一层结构只是多一处能配错的地方。
    #[serde(flatten)]
    pub media: MediaConfig,
}

fn default_port() -> u16 {
    8100
}

impl Default for Config {
    fn default() -> Self {
        Self {
            port: default_port(),
            workspace: None,
            upstream: None,
            media: MediaConfig {
                platform: Platform {
                    base_url: "https://maas.ovaijisuan.com/v1".into(),
                    api_key: String::new(),
                    chat_model: String::new(),
                },
                models: Models {
                    image: Some("qwen-image".into()),
                    image_edit: Some("qwen-image-edit".into()),
                    ..Default::default()
                },
            },
        }
    }
}

impl Config {
    /// 默认路径。
    ///
    /// 不用 `ProjectDirs`：它在 macOS 上会生成
    /// `com.ovaijisuandesign.ovaijisuandesign` 这种反向域名目录，不便于手改。
    pub fn default_path() -> Result<PathBuf> {
        let dirs = directories::UserDirs::new().context("无法定位用户目录")?;
        let home = dirs.home_dir();
        let base = if cfg!(target_os = "macos") {
            home.join("Library/Application Support")
        } else if cfg!(target_os = "windows") {
            std::env::var_os("APPDATA")
                .map(PathBuf::from)
                .unwrap_or_else(|| home.join("AppData/Roaming"))
        } else {
            std::env::var_os("XDG_CONFIG_HOME")
                .map(PathBuf::from)
                .unwrap_or_else(|| home.join(".config"))
        };
        Ok(base.join("ovaijisuandesign").join("config.json"))
    }

    /// 最终采用的工作区目录。优先级：环境变量 > 配置 > 当前目录。
    pub fn workspace_dir(&self) -> Result<PathBuf> {
        if let Some(v) = std::env::var_os("WORKSPACE_DIR") {
            return Ok(PathBuf::from(v));
        }
        if let Some(p) = &self.workspace {
            return Ok(p.clone());
        }
        std::env::current_dir().context("取当前目录失败")
    }

    pub fn load(path: &Path) -> Result<Self> {
        let raw = fs::read_to_string(path)
            .with_context(|| format!("读取配置失败: {}", path.display()))?;
        let cfg: Self = serde_json::from_str(&raw)
            .with_context(|| format!("解析配置失败: {}", path.display()))?;
        cfg.validate()?;
        Ok(cfg)
    }

    pub fn save(&self, path: &Path) -> Result<()> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .with_context(|| format!("创建配置目录失败: {}", parent.display()))?;
        }
        fs::write(path, serde_json::to_string_pretty(self)?)
            .with_context(|| format!("写入配置失败: {}", path.display()))
    }

    /// 校验那些一旦缺失、生成会在**画布上转半天再红掉**的字段。
    ///
    /// 这类问题在启动时一句话就能说清，拖到运行时就变成一个没有原因的失败节点。
    pub fn validate(&self) -> Result<()> {
        let p = &self.media.platform;
        anyhow::ensure!(!p.base_url.trim().is_empty(), "platform.base_url 不能为空");
        anyhow::ensure!(
            !p.api_key.trim().is_empty(),
            "platform.api_key 不能为空 —— 这是唯一的凭据，没有登录流程"
        );
        anyhow::ensure!(
            self.media.models.image.is_some(),
            "models.image 未配置（文生图，例如 qwen-image）"
        );
        anyhow::ensure!(
            self.media.models.image_edit.is_some(),
            "models.image_edit 未配置（图生图，例如 qwen-image-edit）—— \
             画布上的重绘 / 擦除都是带底图的编辑请求"
        );
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> Config {
        let mut c = Config::default();
        c.media.platform.api_key = "sk-test".into();
        c
    }

    #[test]
    fn the_default_is_usable_once_a_key_is_set() {
        assert!(sample().validate().is_ok());
    }

    #[test]
    fn a_missing_key_is_rejected_at_startup() {
        // 没有登录流程，key 就是唯一凭据；缺了它每一次生成都会失败，
        // 而失败会发生在画布上而不是终端里。
        let err = Config::default().validate().unwrap_err().to_string();
        assert!(err.contains("api_key"), "{err}");
    }

    #[test]
    fn image_edit_is_required_too() {
        // 只配文生图的话，画布上的重绘会退化成"整张图换掉" —— 不报错。
        let mut c = sample();
        c.media.models.image_edit = None;
        let err = c.validate().unwrap_err().to_string();
        assert!(err.contains("models.image_edit"), "{err}");
    }

    #[test]
    fn round_trips_through_disk() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.json");
        sample().save(&path).unwrap();
        let back = Config::load(&path).unwrap();
        assert_eq!(back.media.platform.api_key, "sk-test");
        assert_eq!(back.port, 8100);
    }

    #[test]
    fn platform_and_models_sit_at_the_top_level() {
        // `flatten` 决定了配置文件长什么样，改了会让老配置静默失效
        // （serde 对多出来的键默认不报错）。
        let json = serde_json::to_string(&sample()).unwrap();
        assert!(json.contains("\"platform\""), "{json}");
        assert!(json.contains("\"models\""), "{json}");
        assert!(!json.contains("\"media\""), "不该多包一层: {json}");
    }
}
