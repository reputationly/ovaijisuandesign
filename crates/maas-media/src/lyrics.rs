//! 歌词生成。
//!
//! 平台侧没有专门的歌词端点，所以这里**用对话模型自己写** ——
//! 走的就是 [`crate::Platform::chat_model`]，不引入第二处要维护的配置。
//!
//! ## 为什么要连歌名和风格标签一起回
//!
//! 官方 `lyrics_generation` 回的是 `song_title` + `style_tags` + `lyrics`
//! 三样，agent 的工作流是「起草 → 原样念给用户确认 → 再去生成」。少回两样
//! 的话，agent 只能自己编一个歌名 —— 而它编的和歌词里唱的经常对不上。
//!
//! `style_tags` 更实际：它直接喂给 `generate_audio_music` 的 `prompt`。
//! 让写词的那次顺手把风格定下来，比让 agent 事后从歌词反推准得多。

use std::time::Duration;

use serde::Serialize;

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

/// 三段输出的分隔标记。
///
/// **不用 JSON。** 歌词是多行的，里面还常有引号和方括号 —— 让模型把它塞进
/// 一个 JSON 字符串，转义错一个字整份就解不出来，而那时候歌词已经写好了、
/// 只是取不出来。行首标记做不到这种全损失败：最坏情况是标记没出现，
/// 那就把整段当歌词，见 [`parse`]。
const LYRICS_MARK: &str = "LYRICS:";
const TITLE_MARK: &str = "TITLE:";
const STYLE_MARK: &str = "STYLE:";

/// 段落标记用官方写法：方括号 + 首字母大写。
///
/// 取自 MiniMax-Music3 官方 README 列出的那一组。小写实测也能出曲，但没有
/// 依据说它等价，跟着官方写法走不赌模型的宽容度。
///
/// 真正会出事的是写成 `Verse 1:` 那种散文标题：**不报错**，只是让编曲拿不到
/// 结构信息，安静地退化成一段平铺的曲子。
const SYSTEM_PROMPT: &str = "\
你是歌词作者。按用户的要求产出一首歌的歌名、风格标签和完整歌词。

输出格式（严格照这三行开头，不要 Markdown、不要代码块、不要任何解释）：
TITLE: 歌名
STYLE: 逗号分隔的英文风格标签，如 Pop, Dance, Upbeat, Female Vocals
LYRICS:
（从下一行开始是歌词正文）

歌词要求：
1. 用方括号段落标记，首字母大写，只能用这几个：[Intro] [Verse] [Pre-Chorus] [Chorus] [Post-Chorus] [Bridge] [Instrumental] [Solo] [Outro]。
2. 至少包含两段 [Verse] 和两次 [Chorus]，副歌重复时词句保持一致。
3. 歌词语言跟随用户描述的语言；描述是中文就写中文，是英文就写英文。
4. 每行不超过 20 个字，适合演唱；不要写成散文。
5. 不要使用真实歌手、乐队或已有歌曲的名字与歌词。";

/// 这次是从头写还是改现成的。
///
/// 官方就这两个值（`write_full_song` / `edit`）。分开是因为两者的输入完全
/// 不同：从头写只有主题，改现成的必须**保住用户原来的意思** —— 当成从头写
/// 的话模型会重写一首，用户的原稿悄悄没了。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    WriteFullSong,
    Edit,
}

impl Mode {
    /// 认不出的一律按从头写。官方只有两个值，多出来的只可能是笔误，
    /// 而"从头写"是两者里丢东西更少的那个（`edit` 走错会改一份不存在的稿）。
    pub fn parse(s: Option<&str>) -> Self {
        match s
            .map(str::trim)
            .unwrap_or_default()
            .to_ascii_lowercase()
            .as_str()
        {
            "edit" | "polish" | "edit_lyrics" => Self::Edit,
            _ => Self::WriteFullSong,
        }
    }
}

/// 一次起草的结果。字段名**逐字照官方** —— agent 的提示词里写的就是这三个。
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Draft {
    pub song_title: String,
    pub style_tags: String,
    pub lyrics: String,
}

/// 起草或润色一首歌的歌词。
pub async fn draft(
    client: &reqwest::Client,
    cfg: &MediaConfig,
    mode: Mode,
    prompt: &str,
    lyrics: &str,
    title: Option<&str>,
) -> Result<Draft, PlatformError> {
    let prompt = prompt.trim();
    let lyrics = lyrics.trim();
    let user = match mode {
        Mode::Edit => {
            if lyrics.is_empty() {
                // 空稿走 edit 只可能是 agent 选错了模式。让它去用
                // write_full_song，而不是给它一首凭空编的歌 ——
                // 那首歌会被当成"润色后的用户原稿"念给用户听。
                return Err(PlatformError::config(
                    "edit 模式要给出待润色的歌词（lyrics）；从头写请用 write_full_song",
                ));
            }
            let mut u =
                String::from("把下面这份歌词扩展并润色成一首完整的歌，保持原有的意思和意象：\n\n");
            u.push_str(lyrics);
            if !prompt.is_empty() {
                u.push_str("\n\n风格要求：");
                u.push_str(prompt);
            }
            u
        }
        Mode::WriteFullSong => {
            if prompt.is_empty() {
                return Err(PlatformError::config(
                    "歌词生成缺少风格描述：需要说明这首歌要写什么",
                ));
            }
            prompt.to_string()
        }
    };

    let mut user = user;
    if let Some(t) = title.map(str::trim).filter(|t| !t.is_empty()) {
        user.push_str("\n\n歌名用：");
        user.push_str(t);
    }

    // 温度：歌词要有变化，但不能飘到听不懂。
    let text = chat::complete(client, cfg, SYSTEM_PROMPT, &user, 0.8, MAX_TOKENS, TIMEOUT).await?;
    let mut out = parse(&text);
    if out.lyrics.is_empty() {
        // 空歌词会让音乐请求带着空 lyrics 发出去，产出一段无人声的曲子 ——
        // 有声音、不报错，但用户要的是有词的歌。宁可在这里失败。
        return Err(PlatformError::protocol("LLM 未返回歌词内容"));
    }
    // 调用方点了名的歌名压过模型自己起的那个。
    if let Some(t) = title.map(str::trim).filter(|t| !t.is_empty()) {
        out.song_title = t.to_string();
    }
    Ok(out)
}

/// 拆三段输出。
///
/// **`LYRICS:` 找不到时把整段当歌词。** 模型偶尔会忘掉格式直接开始写词，
/// 那种情况下丢掉整份输出、报一个"格式不对"，比交出一首没有歌名的歌
/// 差得多 —— 歌名可以让用户补，歌词重写要再花一次额度和一分半钟。
fn parse(text: &str) -> Draft {
    let body = chat::strip_fences(text);
    let Some(at) = body.find(LYRICS_MARK) else {
        return Draft {
            song_title: String::new(),
            style_tags: String::new(),
            lyrics: sanitize(&body),
        };
    };
    let (head, rest) = body.split_at(at);
    let lyrics = sanitize(&rest[LYRICS_MARK.len()..]);
    Draft {
        song_title: field(head, TITLE_MARK),
        style_tags: field(head, STYLE_MARK),
        lyrics,
    }
}

/// 取某个行首标记后面那一行。
fn field(head: &str, mark: &str) -> String {
    head.lines()
        .find_map(|l| l.trim().strip_prefix(mark).map(str::trim))
        .unwrap_or_default()
        .to_string()
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

    // -- 三段输出 -------------------------------------------------------------

    #[test]
    fn splits_title_style_and_lyrics() {
        let raw = "TITLE: 今晚一起跳舞吧\nSTYLE: Pop, Dance, Upbeat\nLYRICS:\n[Verse]\n灯光亮起的瞬间\n[Chorus]\n今晚一起跳舞吧";
        let d = parse(raw);
        assert_eq!(d.song_title, "今晚一起跳舞吧");
        assert_eq!(d.style_tags, "Pop, Dance, Upbeat");
        assert_eq!(
            d.lyrics,
            "[Verse]\n灯光亮起的瞬间\n[Chorus]\n今晚一起跳舞吧"
        );
    }

    #[test]
    fn a_missing_header_still_yields_the_lyrics() {
        // 模型偶尔会忘掉格式直接开始写词。丢掉整份输出比交出一首没歌名的歌
        // 差得多 —— 歌名能让用户补，歌词重写要再花一次额度和一分半钟。
        let d = parse("[Verse]\n夏天的风\n[Chorus]\n我们还在");
        assert_eq!(d.lyrics, "[Verse]\n夏天的风\n[Chorus]\n我们还在");
        assert!(d.song_title.is_empty());
    }

    #[test]
    fn a_fenced_block_around_the_whole_thing_is_still_parsed() {
        let raw = "```\nTITLE: 夏天\nSTYLE: Folk\nLYRICS:\n[Verse]\n风\n```";
        let d = parse(raw);
        assert_eq!(d.song_title, "夏天");
        assert_eq!(d.lyrics, "[Verse]\n风");
    }

    #[test]
    fn lyrics_containing_brackets_and_quotes_survive() {
        // 这正是不用 JSON 的原因：这份内容塞进 JSON 字符串，模型转义错一个
        // 字整份就解不出来，而那时歌词已经写好了、只是取不出来。
        let raw =
            "TITLE: \"引号\" 之歌\nSTYLE: Rock\nLYRICS:\n[Verse]\n他说：\"走吧\"\n[Chorus]\n{再见}";
        let d = parse(raw);
        assert_eq!(d.song_title, "\"引号\" 之歌");
        assert!(d.lyrics.contains("\"走吧\""));
        assert!(d.lyrics.contains("{再见}"));
    }

    // -- 模式 -----------------------------------------------------------------

    #[test]
    fn an_unknown_mode_writes_rather_than_edits() {
        // edit 走错会去改一份不存在的稿。
        assert_eq!(Mode::parse(Some("edit")), Mode::Edit);
        assert_eq!(Mode::parse(Some("write_full_song")), Mode::WriteFullSong);
        assert_eq!(Mode::parse(Some("shrug")), Mode::WriteFullSong);
        assert_eq!(Mode::parse(None), Mode::WriteFullSong);
    }

    #[tokio::test]
    async fn an_empty_brief_is_reported_before_any_network_call() {
        let err = draft(
            &reqwest::Client::new(),
            &MediaConfig::default(),
            Mode::WriteFullSong,
            "   ",
            "",
            None,
        )
        .await
        .unwrap_err();
        assert_eq!(err.code, "dpp.config");
        assert!(err.message.contains("风格描述"), "{}", err.message);
    }

    #[tokio::test]
    async fn editing_nothing_is_refused_instead_of_inventing_a_song() {
        // 凭空编的那首会被当成"润色后的用户原稿"念给用户听。
        let err = draft(
            &reqwest::Client::new(),
            &MediaConfig::default(),
            Mode::Edit,
            "抒情",
            "  ",
            None,
        )
        .await
        .unwrap_err();
        assert!(err.message.contains("write_full_song"), "{}", err.message);
    }
}
