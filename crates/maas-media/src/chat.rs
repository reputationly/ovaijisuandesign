//! 平台的对话接口。caption 增强和歌词生成共用。
//!
//! 抽出来是因为这两处踩的是同一个坑：**推理模型的思考过程和正文共用
//! `max_tokens` 预算**。给小了，模型会把额度全花在 reasoning 上，
//! `content` 直接回 null 而 `finish_reason` 是 `length` —— 看起来像
//! 「模型不听话」，实际是预算不够。

use std::time::Duration;

use serde_json::{Value, json};

use crate::MediaConfig;
use crate::error::PlatformError;

/// 发一次对话请求，返回 `choices[0].message.content`。
///
/// 内容为空时**报错而不是返回空串**：调用方拿到空串往往会继续往下走，
/// 于是一个空 caption / 空歌词被发给引擎，产出一段能播但完全不对的音频。
pub async fn complete(
    client: &reqwest::Client,
    cfg: &MediaConfig,
    system: &str,
    user: &str,
    temperature: f64,
    max_tokens: u32,
    timeout: Duration,
) -> Result<String, PlatformError> {
    let body = json!({
        "model": cfg.platform.chat_model,
        "messages": [
            { "role": "system", "content": system },
            { "role": "user", "content": user },
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": false,
    });

    let resp = client
        .post(format!("{}/chat/completions", cfg.platform.base()))
        .bearer_auth(&cfg.platform.api_key)
        .timeout(timeout)
        .json(&body)
        .send()
        .await
        .map_err(|e| PlatformError::transport(e.to_string()))?;

    let status = resp.status();
    let raw = resp
        .text()
        .await
        .map_err(|e| PlatformError::transport(e.to_string()))?;
    if !status.is_success() {
        return Err(PlatformError::from_body(status.as_u16(), &raw));
    }

    let parsed: Value = serde_json::from_str(&raw)
        .map_err(|e| PlatformError::protocol(format!("对话响应不是 JSON: {e}")))?;
    let text = parsed
        .pointer("/choices/0/message/content")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_string();

    if text.is_empty() {
        // 单独点出截断，否则只看到「未返回内容」会以为是模型不听话，
        // 而不是 max_tokens 不够。
        let truncated = parsed
            .pointer("/choices/0/finish_reason")
            .and_then(Value::as_str)
            == Some("length");
        let hint = if truncated {
            "（输出被 max_tokens 截断，推理过程占满了预算）"
        } else {
            ""
        };
        return Err(PlatformError::protocol(format!(
            "对话未返回内容{hint}: {raw}"
        )));
    }
    Ok(text)
}

/// 去掉模型可能套上的 Markdown 围栏。
///
/// 模型经常在正文外面套一层 ```，或者在前面加一句「好的，这是为你写的：」。
/// 这些混进去不会报错 —— 歌词场景下会被当成词唱出来。
///
/// 是**找**围栏而不是剥前缀：真实顺序常是「开场白 → 围栏 → 正文」，
/// 按前缀剥会整个落空，把收尾的 ``` 留在正文里。
pub fn strip_fences(text: &str) -> String {
    let body = text.trim();
    let Some(open) = body.find("```") else {
        return body.to_string();
    };
    let after = &body[open + 3..];
    // ```lyrics / ```text 这种语言标注要连同那一行一起去掉。
    let after = after.split_once('\n').map_or("", |(_, rest)| rest);
    // 取到**第一个**收尾围栏为止：多一对围栏时，后面只可能是模型又补的说明。
    after
        .split_once("```")
        .map_or(after, |(inner, _)| inner)
        .trim()
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_a_fence_that_follows_a_preamble() {
        let raw = "这是歌词：\n```\n[Verse]\n夏天的风\n```\n希望你喜欢";
        assert_eq!(strip_fences(raw), "[Verse]\n夏天的风");
    }

    #[test]
    fn strips_the_language_tag_line() {
        let raw = "```lyrics\n[Verse]\n夏天的风\n```";
        assert_eq!(strip_fences(raw), "[Verse]\n夏天的风");
    }

    #[test]
    fn leaves_unfenced_text_alone() {
        assert_eq!(strip_fences("  夏天的风轻轻吹过  "), "夏天的风轻轻吹过");
    }

    #[test]
    fn does_not_treat_an_inline_backtick_as_a_fence() {
        let raw = "[Verse]\n她说 `再见`";
        assert_eq!(strip_fences(raw), raw);
    }
}
