//! 这个 crate 需要知道的全部配置。
//!
//! 刻意做得比调用方的配置窄：这里只有「平台在哪、用哪些模型」，
//! 不掺任何关于「谁在调用、为什么调用」的东西。

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

/// 平台的接入信息。
///
/// 一个 OpenAI 兼容端点就够了 —— 图片、视频、语音、音乐、对话全在它下面。
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Platform {
    /// 形如 `https://maas.example.com/v1`，尾部斜杠可有可无。
    pub base_url: String,
    pub api_key: String,
    /// 写 caption / 歌词用的对话模型。
    ///
    /// 和媒体模型分开一个字段而不是复用某个媒体模型：这两处调的是
    /// `/chat/completions`，跟出图出曲不是一类能力。
    pub chat_model: String,
}

impl Platform {
    /// 去掉尾斜杠的 base，拼路径时用。
    pub fn base(&self) -> &str {
        self.base_url.trim_end_matches('/')
    }
}

/// 各模态用哪个模型。
///
/// 全是 `Option`：没配的能力就是不可用，调用时报一个说得清的错，
/// 而不是拿别的模型顶上 —— 顶上去往往能成功返回一个完全不对的结果。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Models {
    /// 文生图，例如 `qwen-image`。
    #[serde(default)]
    pub image: Option<String>,
    /// 图生图，例如 `qwen-image-edit`。重绘 / 擦除都走这个。
    #[serde(default)]
    pub image_edit: Option<String>,
    /// 首尾帧族，例如 `minimax-h3-fl2va`。
    ///
    /// 平台上这**一个 checkpoint 同时吃 t2v / i2v / l2va / flf2v** 四种玩法，
    /// 靠 `metadata.task_type` 区分，所以不需要按玩法各配一个。
    #[serde(default)]
    pub video: Option<String>,
    /// 参考生视频，例如 `minimax-h3-ref2va`。参考图 / 参考视频走这个。
    #[serde(default)]
    pub video_ref: Option<String>,
    /// 超分，例如 `swiftvr` / `seedvr2`。
    #[serde(default)]
    pub video_upscale: Option<String>,
    /// 文生音乐，例如 `minimax-music3` / `ace-step`。
    #[serde(default)]
    pub music: Option<String>,
    /// 音乐编辑，例如 `ace-step`。
    ///
    /// 和 [`Self::music`] 分开配：只有 ACE-Step 支持 `cover`（覆盖生成）和
    /// `repaint`（音乐重绘），`minimax-music3` 只能文生音乐。没配就报错，
    /// 不拿文生音乐顶上 —— 那会返回一段和原曲无关的音乐，而用户要的是
    /// 「这首歌换个唱法」。
    #[serde(default)]
    pub music_edit: Option<String>,
    /// 语音合成，例如 `indextts-2.5`。
    #[serde(default)]
    pub speech: Option<String>,
    /// 音乐引擎族。留空则按 [`Self::music`] 的名字推断，
    /// 推断不出来**报错而不是挑一个**，理由见 [`MusicEngine`]。
    #[serde(default)]
    pub music_engine: Option<MusicEngine>,
    /// 是否把一句话描述展开成 Music3 的三段式 caption。默认开。
    ///
    /// 不展开不会报错，只是编曲平淡 —— 属于安静的质量损失。
    /// 代价是每次生成多一次 LLM 调用（十几到几十秒）。
    #[serde(default = "default_true")]
    pub enhance_music_caption: bool,
    /// `voice_id` → 参考音频（http URL / data URI / 本地绝对路径）。
    ///
    /// **平台上没有任何模型吃预设音色名**：`indextts-2.5` 的音色是一段参考
    /// 音频，所以调用方给的音色标识必须能在这里换成音频。
    ///
    /// **映射不到就明确报错**，既不挑一个顶上（用户会听到一个完全陌生的
    /// 声音而没有任何提示），也不静默跳过。
    #[serde(default)]
    pub voice_map: BTreeMap<String, String>,
}

fn default_true() -> bool {
    true
}

/// 手写而不是 derive：`enhance_music_caption` 的 serde 默认是 `true`，
/// derive 出来的 `Default` 会给 `false` —— 两条路径给出相反的默认值，
/// 而且不报错。
impl Default for Models {
    fn default() -> Self {
        Self {
            image: None,
            image_edit: None,
            video: None,
            video_ref: None,
            video_upscale: None,
            music: None,
            music_edit: None,
            speech: None,
            music_engine: None,
            enhance_music_caption: true,
            voice_map: BTreeMap::new(),
        }
    }
}

/// 音乐引擎族。决定 caption 和歌词各自落在哪个键上。
///
/// **两个引擎的映射正好相反**：
///
/// | | caption | 歌词 |
/// |---|---|---|
/// | [`MusicEngine::Music3`] | `metadata.instructions` | 顶层 `prompt` |
/// | [`MusicEngine::AceStep`] | 顶层 `prompt` | `metadata.lyrics` |
///
/// 发反了**不会报错** —— 引擎会把歌词当风格描述、或者把风格描述一遍遍唱
/// 出来。出曲成功、时长正常、文件正常，只有听了才知道。所以推断不出来时
/// 宁可拒绝启动。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MusicEngine {
    Music3,
    AceStep,
}

impl Models {
    /// 解析音乐引擎族。显式配置优先，其次按模型名推断。
    pub fn resolve_music_engine(&self, model: &str) -> Result<MusicEngine, String> {
        if let Some(engine) = self.music_engine {
            return Ok(engine);
        }
        let lower = model.to_ascii_lowercase();
        if lower.contains("music3") || lower.contains("music-3") {
            Ok(MusicEngine::Music3)
        } else if lower.contains("ace-step") || lower.contains("acestep") {
            Ok(MusicEngine::AceStep)
        } else {
            Err(format!(
                "无法从模型名 `{model}` 判断音乐引擎族：请显式指定 music_engine \
                 （music3 或 ace_step）。两个引擎的 caption/歌词键位正好相反，\
                 猜错不会报错，只会产出完全不对的音乐"
            ))
        }
    }
}

/// 这个 crate 的全部配置。
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct MediaConfig {
    pub platform: Platform,
    #[serde(default)]
    pub models: Models,
}

impl MediaConfig {
    /// 取某个模态的模型，没配就给一个说得清缺什么的错误。
    ///
    /// 收口在一处是为了让"没配"永远是同一句话 —— 这类错误最后会显示在
    /// 用户界面上，而"某个能力不可用"和"生成失败"该长得不一样。
    pub(crate) fn model<'a>(
        &'a self,
        pick: fn(&'a Models) -> Option<&'a String>,
        field: &str,
    ) -> Result<&'a str, crate::PlatformError> {
        pick(&self.models)
            .map(String::as_str)
            .ok_or_else(|| crate::PlatformError::config(format!("{field} 未配置，这个能力不可用")))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_the_trailing_slash() {
        let p = Platform {
            base_url: "https://maas.example.com/v1/".into(),
            ..Default::default()
        };
        assert_eq!(p.base(), "https://maas.example.com/v1");
    }

    #[test]
    fn refuses_to_guess_an_unknown_music_engine() {
        let m = Models::default();
        assert_eq!(
            m.resolve_music_engine("minimax-music3"),
            Ok(MusicEngine::Music3)
        );
        assert_eq!(m.resolve_music_engine("ace-step"), Ok(MusicEngine::AceStep));
        assert!(m.resolve_music_engine("suno-v4").is_err());
    }

    #[test]
    fn an_explicit_engine_overrides_the_name_guess() {
        let m = Models {
            music_engine: Some(MusicEngine::AceStep),
            ..Default::default()
        };
        assert_eq!(
            m.resolve_music_engine("minimax-music3"),
            Ok(MusicEngine::AceStep)
        );
    }

    #[test]
    fn the_serde_default_matches_the_struct_default() {
        // 两条路径给出不同默认值不会报错，只会让「没写这一段」和
        // 「写了但没写这个键」得到相反的行为。
        let from_serde: Models = serde_json::from_str("{}").unwrap();
        assert_eq!(
            from_serde.enhance_music_caption,
            Models::default().enhance_music_caption
        );
        assert!(from_serde.enhance_music_caption);
    }
}
