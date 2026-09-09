//! 歌词生成。
//!
//! 平台侧没有专门的歌词端点，所以这里**用对话模型自己写** ——
//! 走的就是 [`crate::Platform::chat_model`]，不引入第二处要维护的配置。

use std::time::Duration;

use crate::MediaConfig;
use crate::chat;
use crate::error::PlatformError;

/// 写一段歌词是短输出，不需要给到出图那种量级。
const TIMEOUT: Duration = Duration::from_secs(90);

/// 一段歌词本身只要几百 token，留出的都是给推理过程的余量。
///
/// 给 800 时实测 qwen3.8-27b 会把额度全花在 reasoning 上，`content` 直接回
/// null 而 `finish_reason` 是 `length`。
const MAX_TOKENS: u32 = 4000;

/// 段落标记用官方写法：方括号 + 首字母大写。
///
/// 取自 MiniMax-Music3 官方 README 列出的那一组。小写实测也能出曲，但没有
/// 依据说它等价，跟着官方写法走不赌模型的宽容度。
///
/// 真正会出事的是写成 `Verse 1:` 那种散文标题：**不报错**，只是让编曲拿不到
/// 结构信息，安静地退化成一段平铺的曲子。
const SYSTEM_PROMPT: &str = "\
你是歌词作者。根据用户给的音乐风格描述写一首完整的歌词。

严格要求：
1. 只输出歌词本身，不要任何解释、标题、前言或后记。
2. 用方括号段落标记，首字母大写，只能用这几个：[Intro] [Verse] [Pre-Chorus] [Chorus] [Post-Chorus] [Bridge] [Instrumental] [Solo] [Outro]。
3. 至少包含两段 [Verse] 和两次 [Chorus]，副歌重复时词句保持一致。
4. 歌词语言跟随用户描述的语言；描述是中文就写中文，是英文就写英文。
5. 每行不超过 20 个字，适合演唱；不要写成散文。
6. 不要使用真实歌手、乐队或已有歌曲的名字与歌词。";

/// 按一段风格描述写歌词。
pub async fn generate(
    client: &reqwest::Client,
    cfg: &MediaConfig,
    brief: &str,
) -> Result<String, PlatformError> {
    let brief = brief.trim();
    if brief.is_empty() {
        return Err(PlatformError::config(
            "歌词生成缺少风格描述：需要说明这首歌要写什么",
        ));
    }

    // 温度：歌词要有变化，但不能飘到听不懂。
    let text = chat::complete(client, cfg, SYSTEM_PROMPT, brief, 0.8, MAX_TOKENS, TIMEOUT).await?;
    let lyrics = sanitize(&text);
    if lyrics.is_empty() {
        // 空歌词会让音乐请求带着空 lyrics 发出去，产出一段无人声的曲子 ——
        // 有声音、不报错，但用户要的是有词的歌。宁可在这里失败。
        return Err(PlatformError::protocol("LLM 未返回歌词内容"));
    }
    Ok(lyrics)
}

/// 把 LLM 的输出收拾成引擎能吃的歌词。
fn sanitize(text: &str) -> String {
    let body = chat::strip_fences(text);
    // 丢掉第一个段落标记之前的所有内容 —— 那里只可能是模型的开场白，
    // 混进去会被当成歌词唱出来。
    //
    // 找不到标记就整段保留：可能是模型没加标记，那也比清空强。
    let start = body.find('[').unwrap_or(0);
    body[start..].trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_code_fences_and_preamble() {
        // 这两种污染都不会报错，只会被当成歌词唱出来。
        let raw =
            "好的，这是为你写的歌词：\n\n```lyrics\n[Verse]\n夏天的风\n[Chorus]\n我们还在\n```";
        assert_eq!(sanitize(raw), "[Verse]\n夏天的风\n[Chorus]\n我们还在");
    }

    #[test]
    fn keeps_unmarked_lyrics_rather_than_emptying_them() {
        // 少了结构信息，但总比交出空歌词强。
        assert_eq!(sanitize("  夏天的风轻轻吹过  "), "夏天的风轻轻吹过");
    }

    #[test]
    fn drops_a_preamble_that_precedes_the_first_marker() {
        assert_eq!(
            sanitize("这是歌词：\n[Verse]\n夏天的风"),
            "[Verse]\n夏天的风"
        );
    }

    #[test]
    fn the_contract_pins_the_official_section_markers() {
        // 写成 `Verse 1:` 不报错，只是让编曲拿不到结构信息。
        for marker in ["[Intro]", "[Verse]", "[Chorus]", "[Bridge]", "[Outro]"] {
            assert!(SYSTEM_PROMPT.contains(marker), "缺少 {marker}");
        }
    }

    #[tokio::test]
    async fn an_empty_brief_is_reported_before_any_network_call() {
        let err = generate(&reqwest::Client::new(), &MediaConfig::default(), "   ")
            .await
            .unwrap_err();
        assert_eq!(err.code, "dpp.config");
        assert!(err.message.contains("风格描述"), "{}", err.message);
    }
}
