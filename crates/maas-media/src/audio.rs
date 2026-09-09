//! 语音与音乐。
//!
//! 和视频、超分同构 —— 都挂在 `POST /v1/videos` 下，靠 `metadata.task_type`
//! 区分（`tts` / `t2m` / `cover` / `repaint`），所以复用
//! [`crate::video::submit_and_poll`]。
//!
//! **这个模块里几乎每个键位错误都是不报错的。** 三个音频键彼此不通用、
//! 两个音乐引擎的映射正好相反、纯器乐和"有词但没给词"在上游是同一个现象。
//! 每处都记了实测依据，改之前先去平台复测。

use serde_json::{Map, Value, json};

use crate::config::MusicEngine;
use crate::error::PlatformError;
use crate::video::submit_and_poll;
use crate::{MediaConfig, caption};

// ---------------------------------------------------------------------------
// 语音
// ---------------------------------------------------------------------------

/// 语音合成，返回音频的公网 URL。
///
/// `voice_id` 必须能在 `models.voice_map` 里找到对应的参考音频 ——
/// 平台上**没有任何模型吃预设音色名**（报错原文：「音色是一段参考音频而非
/// 预设名」），只能靠零样本克隆逼近。
///
/// 映射不到就报错，**不挑一个顶上**：用户会听到一个完全陌生的声音而没有
/// 任何提示，语音是最容易"听出来不对但说不清哪里不对"的模态。
pub async fn synthesize_speech(
    client: &reqwest::Client,
    cfg: &MediaConfig,
    text: &str,
    voice_id: &str,
) -> Result<String, PlatformError> {
    let model = cfg.model(|m| m.speech.as_ref(), "models.speech")?;

    let reference = cfg.models.voice_map.get(voice_id).ok_or_else(|| {
        PlatformError::config(format!(
            "音色 {voice_id} 没有配置映射：在 voice_map 里为它指定一段参考音频"
        ))
    })?;

    let mut metadata = Map::new();
    metadata.insert("task_type".into(), json!("tts"));
    // 参考音色走 metadata.voice —— 实测报错原文：「任务类型 tts 需要参考音色:
    // 请在 metadata.voice 提供音频 URL 或 base64」。
    //
    // 不是 metadata.audio（那是被驱动的素材，如口型同步的音轨），
    // 也不是 reference_audios（那是 r2va 的参考音色，另一条链路）。
    // 三个键语义各不相同，用错了平台会说"缺参考音色"而不是静默出错。
    metadata.insert("voice".into(), json!(reference));

    let body = json!({
        "model": model,
        "prompt": text,
        "metadata": Value::Object(metadata),
    });
    submit_and_poll(client, cfg, &body).await
}

// ---------------------------------------------------------------------------
// 音乐
// ---------------------------------------------------------------------------

/// 一次音乐请求要的是什么。
///
/// 单独一个枚举而不是 `bool`，是为了留住第三种情况：
///
/// | 调用方声明 | 歌词 | 语义 |
/// |---|---|---|
/// | 明确要器乐 | — | [`Self::Instrumental`] |
/// | 明确要有词 | 空 | [`Self::LyricsMissing`] —— 矛盾请求，报错 |
/// | 明确要有词 | 有 | [`Self::Vocal`] |
/// | 没声明 | 空 | [`Self::Instrumental`]（按空歌词推断） |
///
/// 中间那行是关键：合成一个 bool（`flag || lyrics.is_empty()`）会把
/// "我要有词"翻成反面，产出一首没人声的曲子，用户听到才发现。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MusicIntent {
    Vocal,
    Instrumental,
    LyricsMissing,
}

impl MusicIntent {
    /// 从「是否声明了器乐」和「有没有歌词」推断。
    ///
    /// `is_instrumental` 用 `Option` 而不是 `bool`：要区分「没给这个字段」
    /// 和「明确给了 false」。
    pub fn infer(is_instrumental: Option<bool>, lyrics: &str) -> Self {
        match (is_instrumental, lyrics.trim().is_empty()) {
            (Some(true), _) => Self::Instrumental,
            (Some(false), true) => Self::LyricsMissing,
            (Some(false), false) => Self::Vocal,
            (None, true) => Self::Instrumental,
            (None, false) => Self::Vocal,
        }
    }
}

/// Music3 纯器乐时放进 `prompt` 的占位。
///
/// 不能发空串：平台对 `tts`（Music3 的 t2m 会被改写成它）有硬校验
/// 「需要合成文本(prompt)」，空的直接 400 —— 而这个失败发生在**调用方已经
/// 拿到 task_id 之后**，界面上是一个转半天再红掉的节点。
///
/// `[Instrumental]` 是官方 README 列出的合法段落标记之一，既满足非空，
/// 又正好表达"这段没有唱词"。
const MUSIC3_INSTRUMENTAL_INPUT: &str = "[Instrumental]";

/// 文生音乐，返回音频的公网 URL。
///
/// `instructions` 是风格描述，`lyrics` 是歌词。**两者必须分开传** ——
/// 揉在一起会丢掉其中一路，而且不报错。
pub async fn generate_music(
    client: &reqwest::Client,
    cfg: &MediaConfig,
    instructions: &str,
    lyrics: &str,
    intent: MusicIntent,
) -> Result<String, PlatformError> {
    let model = cfg.model(|m| m.music.as_ref(), "models.music")?;

    if instructions.trim().is_empty() {
        // Music3 强制要求它存在（报错原文：「it is what decides the
        // arrangement」）；ACE-Step 不强制，所以这个缺口只测 ace-step 时看不出来。
        return Err(PlatformError::config(
            "音乐生成缺少风格描述：需要给出流派 / 配器 / 速度 / 情绪",
        ));
    }

    if intent == MusicIntent::LyricsMissing {
        return Err(PlatformError::config(
            "音乐请求声明了要有唱词却没有提供歌词：请给出歌词，或明确改成纯器乐",
        ));
    }
    let instrumental = intent == MusicIntent::Instrumental;

    let engine = cfg
        .models
        .resolve_music_engine(model)
        .map_err(PlatformError::config)?;

    // 把一句话展开成官方三段式。Music3 是照结构化 caption 训练的，
    // 喂一句话它只能自己脑补编曲 —— 出来"是那个流派"但没有段落发展。
    //
    // 增强失败时退回原描述而不是让整次生成失败：那样至少还有歌听。
    // 但一定要 WARN —— 这类降级不出声的话，下次问「为什么不好听」查不到原因。
    let caption = if should_enhance(cfg, engine) {
        match caption::enhance_music_caption(client, cfg, instructions, lyrics, instrumental).await
        {
            Ok(c) => c,
            Err(err) => {
                tracing::warn!(code = %err.code, "caption 增强失败，退回原描述: {}", err.message);
                instructions.to_string()
            }
        }
    } else {
        instructions.to_string()
    };

    // 记下真正发出去的 caption。排查音质时缺了这条就只能看到"开始生成"，
    // 不知道模型收到的是什么。
    tracing::info!(
        model,
        ?engine,
        instrumental,
        caption_chars = caption.chars().count(),
        lyrics_chars = lyrics.chars().count(),
        "音乐 caption: {caption}"
    );

    submit_and_poll(
        client,
        cfg,
        &music_body(engine, model, &caption, lyrics, instrumental),
    )
    .await
}

/// 这次要不要做 caption 增强。
///
/// 抽成函数是为了能直接断言这个决策 —— 内联的话，增强失败会 WARN 后回退、
/// 不中断流程，于是"走没走增强"在返回值上看不出来，测试只能假通过。
fn should_enhance(cfg: &MediaConfig, engine: MusicEngine) -> bool {
    cfg.models.enhance_music_caption && engine == MusicEngine::Music3
}

/// 组文生音乐的请求体。
///
/// 单独抽出来是为了能直接断言键的落位 —— **两个引擎的映射正好相反**，
/// 放错不报错，只能靠测试守住。
fn music_body(
    engine: MusicEngine,
    model: &str,
    caption: &str,
    lyrics: &str,
    instrumental: bool,
) -> Value {
    let mut metadata = Map::new();
    metadata.insert("task_type".into(), json!("t2m"));

    let prompt = match engine {
        MusicEngine::Music3 => {
            // caption 走 metadata，歌词走顶层 prompt。
            //
            // 依据：引擎是 `build_prompt(instructions, input)`，而网关把顶层
            // `prompt` 映射到 `input`；`metadata.lyrics` 虽然会被透传，
            // 但引擎 schema 里没有它，到了就丢。
            metadata.insert("instructions".into(), json!(caption));
            if instrumental || lyrics.is_empty() {
                MUSIC3_INSTRUMENTAL_INPUT
            } else {
                lyrics
            }
        }
        MusicEngine::AceStep => {
            // 完全相反：caption 走顶层 prompt，歌词走 metadata.lyrics。
            //
            // 纯器乐**不发** lyrics 键，而不是发空串 —— 空歌词和"没有歌词"
            // 在引擎侧不等价。
            if !instrumental && !lyrics.is_empty() {
                metadata.insert("lyrics".into(), json!(lyrics));
            }
            caption
        }
    };

    json!({
        "model": model,
        "prompt": prompt,
        "metadata": Value::Object(metadata),
    })
}

// ---------------------------------------------------------------------------
// 音乐编辑
// ---------------------------------------------------------------------------

/// 音乐编辑的两种玩法。
///
/// **各自读不同的 metadata 键**，而且传错了不会报「键不认识」，
/// 而是报「缺少音频」—— 症状指向缺参数，根因是键名错，很难对上。
/// 实测三个音频键彼此不通用：
///
/// | task_type | 键 |
/// |---|---|
/// | `tts` | `metadata.voice` |
/// | `cover` | `metadata.reference_audio` |
/// | `repaint` | `metadata.src_audio` |
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MusicEdit {
    /// 覆盖生成：以参考音频的风格重新演绎。
    Cover,
    /// 音乐重绘：在源音频基础上局部改写。
    Repaint,
}

impl MusicEdit {
    fn task_type(self) -> &'static str {
        match self {
            Self::Cover => "cover",
            Self::Repaint => "repaint",
        }
    }

    fn audio_key(self) -> &'static str {
        match self {
            Self::Cover => "reference_audio",
            Self::Repaint => "src_audio",
        }
    }
}

/// 拿一段已有音频，按提示词重新演绎或局部改写。
///
/// 只有 ACE-Step 支持这两个 task_type，Music3 只能文生音乐。所以这里单独取
/// `models.music_edit`，没配就报错 —— 拿文生音乐顶上会返回一段和原曲**完全
/// 无关**的音乐：有声音、不报错，但不是用户要的东西。
pub async fn edit_music(
    client: &reqwest::Client,
    cfg: &MediaConfig,
    kind: MusicEdit,
    prompt: &str,
    source_audio: &str,
) -> Result<String, PlatformError> {
    let model = cfg.model(|m| m.music_edit.as_ref(), "models.music_edit")?;

    let mut metadata = Map::new();
    metadata.insert("task_type".into(), json!(kind.task_type()));
    metadata.insert(kind.audio_key().into(), json!(source_audio));

    let body = json!({
        "model": model,
        "prompt": prompt,
        "metadata": Value::Object(metadata),
    });
    submit_and_poll(client, cfg, &body).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{Models, Platform};

    const CAPTION: &str = "acoustic folk, 76 bpm";
    const LYRICS: &str = "[Verse]\n夏天的风";

    fn cfg() -> MediaConfig {
        MediaConfig {
            platform: Platform {
                base_url: "https://maas.example.com/v1".into(),
                api_key: "k".into(),
                chat_model: "chat".into(),
            },
            models: Models {
                speech: Some("indextts-2.5".into()),
                music: Some("minimax-music3".into()),
                ..Default::default()
            },
        }
    }

    // -- intent --------------------------------------------------------------

    #[test]
    fn explicit_vocal_with_no_lyrics_is_a_contradiction_not_instrumental() {
        // 合成一个 bool 会把"我要有词"翻成反面，而且不报错。
        assert_eq!(
            MusicIntent::infer(Some(false), ""),
            MusicIntent::LyricsMissing
        );
    }

    #[test]
    fn an_omitted_flag_still_infers_instrumental_from_empty_lyrics() {
        assert_eq!(MusicIntent::infer(None, "  "), MusicIntent::Instrumental);
    }

    #[test]
    fn an_explicit_instrumental_flag_wins_over_present_lyrics() {
        assert_eq!(
            MusicIntent::infer(Some(true), LYRICS),
            MusicIntent::Instrumental
        );
    }

    #[test]
    fn lyrics_present_means_vocal() {
        assert_eq!(MusicIntent::infer(Some(false), LYRICS), MusicIntent::Vocal);
        assert_eq!(MusicIntent::infer(None, LYRICS), MusicIntent::Vocal);
    }

    // -- 键位 ----------------------------------------------------------------

    #[test]
    fn music3_puts_lyrics_in_prompt_and_caption_in_metadata() {
        // 两个键颠倒了不会报错：模型会一遍遍唱那句风格描述，出曲成功、
        // 时长正常、文件正常，只有听了才知道错了。
        let b = music_body(
            MusicEngine::Music3,
            "minimax-music3",
            CAPTION,
            LYRICS,
            false,
        );
        assert_eq!(b["prompt"], LYRICS, "Music3 的顶层 prompt 必须是歌词");
        assert_eq!(b["metadata"]["instructions"], CAPTION);
        // metadata.lyrics 会被透传但引擎不认，发了只会让人误以为歌词生效了。
        assert!(b["metadata"].get("lyrics").is_none());
    }

    #[test]
    fn ace_step_is_the_exact_mirror_of_music3() {
        let b = music_body(MusicEngine::AceStep, "ace-step", CAPTION, LYRICS, false);
        assert_eq!(b["prompt"], CAPTION, "ACE-Step 的顶层 prompt 是描述");
        assert_eq!(b["metadata"]["lyrics"], LYRICS);
        assert!(b["metadata"].get("instructions").is_none());
    }

    #[test]
    fn music3_instrumental_never_sends_an_empty_prompt() {
        // 平台对 tts 有硬校验「需要合成文本」，空 prompt 直接 400 ——
        // 而且失败发生在调用方已经拿到 task_id 之后。
        let b = music_body(MusicEngine::Music3, "minimax-music3", CAPTION, "", true);
        assert_eq!(b["prompt"], MUSIC3_INSTRUMENTAL_INPUT);
    }

    #[test]
    fn ace_step_instrumental_omits_the_lyrics_key() {
        // 空歌词和「没有歌词」在引擎侧不等价，所以是不发这个键。
        let b = music_body(MusicEngine::AceStep, "ace-step", CAPTION, "", true);
        assert_eq!(b["prompt"], CAPTION);
        assert!(b["metadata"].get("lyrics").is_none());
    }

    #[test]
    fn each_edit_task_reads_its_own_audio_key() {
        // 传错了平台报的是「缺少音频」，不是「键不认识」—— 症状指向缺参数，
        // 根因是键名错。这四行是实测报错原文里点名的键。
        assert_eq!(MusicEdit::Cover.task_type(), "cover");
        assert_eq!(MusicEdit::Cover.audio_key(), "reference_audio");
        assert_eq!(MusicEdit::Repaint.task_type(), "repaint");
        assert_eq!(MusicEdit::Repaint.audio_key(), "src_audio");
    }

    // -- caption 增强的门控 ---------------------------------------------------

    #[test]
    fn ace_step_never_gets_the_music3_structured_caption() {
        // 三段式实测 3400+ 字，落在 ACE-Step 的顶层 prompt 上会撞平台的
        // 逐字段字数闸（现网 600）直接 400。Music3 不受影响是因为它走的是
        // 另一条联合闸。
        let c = cfg();
        assert!(should_enhance(&c, MusicEngine::Music3));
        assert!(
            !should_enhance(&c, MusicEngine::AceStep),
            "三段式是 Music3 的契约，套到 ACE-Step 上会被按字数拒掉"
        );
    }

    #[test]
    fn the_switch_still_turns_music3_off() {
        let mut c = cfg();
        c.models.enhance_music_caption = false;
        assert!(!should_enhance(&c, MusicEngine::Music3));
    }

    // -- 配置缺失在联网前就报 --------------------------------------------------

    #[tokio::test]
    async fn an_unmapped_voice_fails_loudly_instead_of_substituting_one() {
        let err = synthesize_speech(&reqwest::Client::new(), &cfg(), "你好", "female-tianmei")
            .await
            .unwrap_err();
        assert!(err.message.contains("voice_map"), "{}", err.message);
        assert!(err.message.contains("female-tianmei"), "{}", err.message);
    }

    #[tokio::test]
    async fn a_missing_speech_model_is_reported_before_any_network_call() {
        let mut c = cfg();
        c.models.speech = None;
        let err = synthesize_speech(&reqwest::Client::new(), &c, "hi", "v")
            .await
            .unwrap_err();
        assert!(err.message.contains("models.speech"), "{}", err.message);
    }

    #[tokio::test]
    async fn a_contradictory_request_fails_instead_of_going_instrumental() {
        let err = generate_music(
            &reqwest::Client::new(),
            &cfg(),
            CAPTION,
            "",
            MusicIntent::LyricsMissing,
        )
        .await
        .unwrap_err();
        assert!(err.message.contains("歌词"), "{}", err.message);
    }

    #[tokio::test]
    async fn music_edit_does_not_fall_back_to_text_to_music() {
        // 拿文生音乐顶上会返回一段和原曲无关的音乐 —— 有声音、不报错，
        // 但完全不是用户要的，是最难发现的一类失败。
        let err = edit_music(
            &reqwest::Client::new(),
            &cfg(),
            MusicEdit::Cover,
            "jazz",
            "https://example.com/a.mp3",
        )
        .await
        .unwrap_err();
        assert!(err.message.contains("models.music_edit"), "{}", err.message);
    }

    #[tokio::test]
    async fn an_unresolvable_music_engine_fails_before_generating() {
        // 猜错引擎不报错，只会产出完全不对的音乐 —— 所以宁可拒绝。
        let mut c = cfg();
        c.models.music = Some("suno-v4".into());
        let err = generate_music(
            &reqwest::Client::new(),
            &c,
            CAPTION,
            LYRICS,
            MusicIntent::Vocal,
        )
        .await
        .unwrap_err();
        assert!(err.message.contains("music_engine"), "{}", err.message);
    }
}
