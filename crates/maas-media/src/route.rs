//! 官方模型名 → 我们平台上的模型。
//!
//! ## 为什么要有这一层
//!
//! 工具的**入参保持和官方一模一样**（`vendor` / `model_id` / `model_name`），
//! agent 照着官方提示词调过来就能用；真正发请求时才把它换成我们平台上配的
//! 那个模型。
//!
//! 好处是两边的接口面不分叉：官方升级后重跑 `scripts/extract-mcp-tools.py`，
//! 差异一眼能看出来；而我们换后端模型只动 `config.json`，不碰工具定义。
//!
//! 不做这一层的话有两种坏法，都不报错：
//!
//! - **不声明 `model_id`**：MCP 对多余的参数是静默丢弃，agent 以为自己指定了
//!   `nano-banana`，实际上一直在用默认模型。
//! - **直接透传**：我们平台上没有 `nano-banana` 这个名字，请求会被上游拒掉，
//!   而错误信息是"模型不存在"，看不出是名字没映射。
//!
//! ## 映射不上怎么办
//!
//! **退回该模态的默认模型，并在结果里如实说明**。硬失败对 agent 没有帮助 ——
//! 它拿着官方提示词，不可能知道这台机器上配了什么；而静默换掉又会让人以为
//! 用的是它要的那个。折中是"照做 + 告诉你换了"。

use crate::config::Models;

/// 一次路由的结果。
#[derive(Debug, Clone, PartialEq)]
pub struct Routed {
    /// 实际要发给平台的模型名。
    pub model: String,
    /// 调用方原本要的那个（官方名）。没指定就是 `None`。
    pub requested: Option<String>,
    /// 是否发生了替换。**要回给调用方** —— 见模块注释。
    pub substituted: bool,
}

impl Routed {
    fn exact(model: String) -> Self {
        Self {
            model,
            requested: None,
            substituted: false,
        }
    }
}

/// 模态。决定映射不上时退回哪个默认模型。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Modality {
    Image,
    ImageEdit,
    Video,
    VideoRef,
    Music,
    /// 翻唱 / 重绘。**和 `Music` 是两个 checkpoint**，见 [`default_for`]。
    MusicEdit,
    Speech,
}

/// 官方模型名 → 模态。
///
/// **只认名字，不认 vendor**：同一个 vendor 下有多个模态（`seedream` 既出图
/// 也做图层分解），而模型名本身是唯一的。
///
/// 名字取自官方产物里出现过的那些，见 `docs/mcp-tools.md` 旁边的提取脚本。
/// 认不出来的一律走默认 —— 官方随时会加新模型，认不出不该变成一次失败。
/// [`modality_of`] 的公开版本。
///
/// 设置页要按模态给模型分组。**分类只有这一份** —— 界面上按一套规则分组、
/// 请求时按另一套路由的话，用户会在"图片"下拉里选到一个实际走视频端点的
/// 模型，而这种不一致只有生成失败时才看得见。
pub fn modality_of_public(name: &str) -> Option<Modality> {
    modality_of(name)
}

fn modality_of(name: &str) -> Option<Modality> {
    let n = name.to_ascii_lowercase().replace('_', "-");
    // 顺序有讲究：先判更具体的后缀，否则 `qwen-image-edit` 会被 `qwen-image`
    // 那条先命中，于是所有图生图请求都走成了文生图。
    if n.contains("edit") || n.contains("layer-decompose") {
        return Some(Modality::ImageEdit);
    }
    if n.starts_with("nano-banana")
        || n.starts_with("gpt-image")
        || n.starts_with("seedream")
        || n.starts_with("qwen-image")
        || n.starts_with("sd-")
        || n == "sdbl"
        || n.starts_with("flux")
        || n.starts_with("midjourney")
        || n.starts_with("jimeng")
        // 我们平台上的出图模型。名字里没有 image / t2i 之类的线索，
        // **只能列出来** —— 认不出的话 `route()` 会把它们悄悄换成默认那个，
        // 用户点名要 z-image 却拿到 qwen-image 出的图。
        || matches!(
            n.as_str(),
            "z-image" | "id4" | "kr2" | "hunyuan-image-3" | "sensenova-u1.5"
        )
    {
        return Some(Modality::Image);
    }
    // 和 image-edit 那条一个道理：`music-cover` 里含 `music`，
    // 顺序写反的话翻唱会静默走成文生音乐 —— 出来一首和原曲**完全无关**
    // 的歌，有声音、不报错。
    // `ace-step` 是我们平台上吃 cover / repaint 的那个 checkpoint，
    // 名字里没有任何线索，只能点名。
    if n.contains("cover") || n.contains("repaint") || n == "ace-step" {
        return Some(Modality::MusicEdit);
    }
    if n.contains("music") {
        return Some(Modality::Music);
    }
    if n.starts_with("speech") || n.starts_with("t2a") || n.starts_with("abab") || n.contains("tts")
    {
        return Some(Modality::Speech);
    }
    if n.contains("ref2v") || n.contains("reference") {
        return Some(Modality::VideoRef);
    }
    if n.starts_with("minimax-h3")
        || n.starts_with("minimax-hailuo")
        || n.starts_with("hailuo")
        || n.starts_with("kling")
        || n.starts_with("seedance")
        || n.contains("video")
    {
        return Some(Modality::Video);
    }
    // 视频修复/超分。`swiftvr` / `seedvr2` 名字里只有 "vr",
    // 上面那串一个都命中不了。
    if n.ends_with("vr") || n.ends_with("vr2") {
        return Some(Modality::Video);
    }
    None
}

fn default_for(models: &Models, m: Modality) -> Option<String> {
    match m {
        Modality::Image => models.image.clone(),
        // 图生图没单独配时退回文生图那个 —— 有些平台是同一个 checkpoint。
        Modality::ImageEdit => models.image_edit.clone().or_else(|| models.image.clone()),
        Modality::Video => models.video.clone(),
        Modality::VideoRef => models.video_ref.clone().or_else(|| models.video.clone()),
        Modality::Music => models.music.clone(),
        // **不退回 `music`。** 只有 ACE-Step 吃 cover / repaint 这两个
        // task_type；拿文生音乐顶上会返回一段和原曲完全无关的音乐 ——
        // 有声音、不报错，但不是用户要的东西。
        Modality::MusicEdit => models.music_edit.clone(),
        Modality::Speech => models.speech.clone(),
    }
}

/// 把调用方给的模型名路由到我们平台上的模型。
///
/// - 没给名字 → 直接用该模态的默认模型
/// - 给的名字**就是我们配的那个** → 原样用（允许直接指定我们自己的模型）
/// - 给的是官方名 → 换成我们的，并标记 `substituted`
pub fn route(models: &Models, want: Option<&str>, modality: Modality) -> Option<Routed> {
    let fallback = default_for(models, modality)?;
    let Some(want) = want.map(str::trim).filter(|s| !s.is_empty()) else {
        return Some(Routed::exact(fallback));
    };

    // 调用方直接点名了我们配着的模型 —— 不要动它。
    // **`music_edit` 必须在这里面。** 漏掉它的话，调用方点名我们自己配的
    // 翻唱模型（ace-step）会走到下面的"认不出 → 退回本次模态的默认",
    // 也就是被换成文生音乐那个 —— 正是 `default_for` 里警告的那种失败：
    // 出来一段和原曲完全无关的音乐，有声音、不报错。
    let configured = [
        &models.image,
        &models.image_edit,
        &models.video,
        &models.video_ref,
        &models.music,
        &models.music_edit,
        &models.speech,
    ];
    if configured
        .iter()
        .any(|m| m.as_deref().is_some_and(|m| m.eq_ignore_ascii_case(want)))
    {
        return Some(Routed::exact(want.to_string()));
    }

    // 官方名 → 按它的模态找我们的默认。认不出模态时也退回本次调用的模态，
    // 而不是失败：官方随时会加新模型。
    let target = modality_of(want).unwrap_or(modality);
    let model = default_for(models, target).unwrap_or(fallback);
    Some(Routed {
        substituted: !model.eq_ignore_ascii_case(want),
        model,
        requested: Some(want.to_string()),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn models() -> Models {
        Models {
            image: Some("qwen-image".into()),
            image_edit: Some("qwen-image-edit".into()),
            video: Some("minimax-h3-fl2va".into()),
            video_ref: Some("minimax-h3-ref2va".into()),
            music: Some("minimax-music3".into()),
            music_edit: Some("ace-step-v1".into()),
            speech: None,
            ..Default::default()
        }
    }

    #[test]
    fn no_model_given_uses_the_configured_default() {
        let r = route(&models(), None, Modality::Image).unwrap();
        assert_eq!(r.model, "qwen-image");
        assert!(!r.substituted);
    }

    #[test]
    fn an_official_name_is_swapped_and_reported() {
        // 静默换掉会让人以为用的是它要的那个模型。
        let r = route(&models(), Some("nano-banana"), Modality::Image).unwrap();
        assert_eq!(r.model, "qwen-image");
        assert_eq!(r.requested.as_deref(), Some("nano-banana"));
        assert!(r.substituted);
    }

    #[test]
    fn naming_our_own_model_is_left_alone() {
        // 允许直接指定我们平台上的模型，不该被"路由"一下又换回默认。
        let r = route(&models(), Some("qwen-image-edit"), Modality::Image).unwrap();
        assert_eq!(r.model, "qwen-image-edit");
        assert!(!r.substituted);
    }

    #[test]
    fn edit_models_do_not_fall_into_the_text_to_image_bucket() {
        // 顺序写反的话 `qwen-image-edit` 会被 `qwen-image` 先命中，
        // 于是所有图生图请求都静默走成了文生图。
        assert_eq!(
            modality_of("seedream-5-layer-decompose"),
            Some(Modality::ImageEdit)
        );
        assert_eq!(modality_of("nano_banana_2"), Some(Modality::Image));
        let r = route(
            &models(),
            Some("seedream-5-layer-decompose"),
            Modality::Image,
        )
        .unwrap();
        assert_eq!(r.model, "qwen-image-edit");
    }

    #[test]
    fn official_video_and_music_names_land_on_the_right_modality() {
        let m = models();
        assert_eq!(
            route(&m, Some("MiniMax-Hailuo-2.3"), Modality::Video)
                .unwrap()
                .model,
            "minimax-h3-fl2va"
        );
        assert_eq!(
            route(&m, Some("music-3.0"), Modality::Music).unwrap().model,
            "minimax-music3"
        );
        // 参考生视频有单独的 checkpoint。
        assert_eq!(
            route(&m, Some("minimax-h3-ref2va"), Modality::Video)
                .unwrap()
                .model,
            "minimax-h3-ref2va"
        );
    }

    #[test]
    fn an_unknown_name_falls_back_to_this_calls_modality() {
        // 官方随时会加新模型。认不出不该变成一次失败 ——
        // agent 拿着官方提示词，不可能知道这台机器上配了什么。
        let r = route(&models(), Some("brand-new-model-9"), Modality::Video).unwrap();
        assert_eq!(r.model, "minimax-h3-fl2va");
        assert!(r.substituted);
    }

    #[test]
    fn a_modality_with_nothing_configured_returns_none() {
        // speech 没配。**这时必须是 None 而不是硬塞一个别的模态的模型** ——
        // 拿出图的模型去合成语音，上游会返回一个看不懂的错误。
        assert!(route(&models(), Some("speech-2.8-hd"), Modality::Speech).is_none());
    }

    #[test]
    fn cover_does_not_fall_into_the_text_to_music_bucket() {
        // `music-cover` 里含 `music`。顺序写反的话翻唱会静默走成文生音乐，
        // 出来一首和原曲完全无关的歌 —— 有声音、不报错。
        assert_eq!(modality_of("music-cover"), Some(Modality::MusicEdit));
        assert_eq!(modality_of("music-3.0"), Some(Modality::Music));
        assert_eq!(
            route(&models(), Some("music-cover"), Modality::Music)
                .unwrap()
                .model,
            "ace-step-v1"
        );
    }

    #[test]
    fn music_edit_never_falls_back_to_plain_music() {
        // 只有 ACE-Step 吃 cover / repaint。退回文生音乐等于换了首歌。
        let mut m = models();
        m.music_edit = None;
        assert!(route(&m, Some("music-cover"), Modality::MusicEdit).is_none());
    }

    #[test]
    fn image_edit_falls_back_to_image_when_not_configured() {
        let mut m = models();
        m.image_edit = None;
        assert_eq!(
            route(&m, None, Modality::ImageEdit).unwrap().model,
            "qwen-image"
        );
    }

    #[test]
    fn the_models_on_our_own_platform_are_recognised() {
        // 这几个名字里没有 image / video 之类的线索。认不出的话 route()
        // 会把它们悄悄换成该模态的默认模型 —— 用户点名要 z-image，
        // 拿到的是 qwen-image 出的图，而且**不报错**。
        for m in ["z-image", "id4", "kr2", "hunyuan-image-3", "sensenova-u1.5"] {
            assert_eq!(modality_of(m), Some(Modality::Image), "{m}");
        }
        for m in ["swiftvr", "seedvr2"] {
            assert_eq!(modality_of(m), Some(Modality::Video), "{m}");
        }
        for m in ["breeze-tts-2", "indextts-2.5"] {
            assert_eq!(modality_of(m), Some(Modality::Speech), "{m}");
        }
        assert_eq!(modality_of("minimax-music3"), Some(Modality::Music));
        assert_eq!(modality_of("ace-step"), Some(Modality::MusicEdit));
        assert_eq!(modality_of("minimax-h3-fl2va"), Some(Modality::Video));
        assert_eq!(modality_of("minimax-h3-ref2va"), Some(Modality::VideoRef));
    }

    #[test]
    fn a_model_the_platform_really_has_is_used_as_asked() {
        // 平台上真有 z-image 时，点名要它就该拿到它 —— 而不是被
        // "认不出 → 退回默认"换成 qwen-image。
        let mut m = models();
        m.image = Some("z-image".into());
        let r = route(&m, Some("z-image"), Modality::Image).unwrap();
        assert_eq!(r.model, "z-image");
        assert!(!r.substituted);
    }

    #[test]
    fn naming_our_own_cover_model_does_not_silently_get_text_to_music() {
        // music_edit 不在 `configured` 里的话，点名 ace-step 会退回
        // 文生音乐那个模型 —— 出来一段和原曲完全无关的歌，有声音、不报错。
        let m = models();
        let cover = m.music_edit.clone().expect("测试夹具要配一个翻唱模型");
        let r = route(&m, Some(&cover), Modality::MusicEdit).unwrap();
        assert_eq!(r.model, cover);
        assert!(!r.substituted, "点名我们自己配的模型不该被替换");
        // 就算调用方把模态传成了 Music，也不该拿文生音乐顶上。
        let r = route(&m, Some(&cover), Modality::Music).unwrap();
        assert_eq!(r.model, cover, "被换成了文生音乐 —— 出来的歌和原曲无关");
    }
}
