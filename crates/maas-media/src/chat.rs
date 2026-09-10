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

// ---------------------------------------------------------------------------
// 带工具的多轮对话
//
// **和 [`complete`] 是两个函数，不是一个加参数。** 那个的语义是"必须回一段
// 文本，空的就是错"——歌词、caption 都靠它守住。而 agent 的一轮里，
// `content` 为空而 `tool_calls` 非空是最正常的情况（模型决定先调工具）。
// 合成一个的话，那条"空内容 = 错误"的保护要么失效、要么误伤。
// ---------------------------------------------------------------------------

/// 模型这一轮的产出。
#[derive(Debug, Clone, Default)]
pub struct Turn {
    /// 给用户看的文本。可能是空的（这一轮只调工具）。
    pub content: String,
    /// 要执行的工具调用。
    pub tool_calls: Vec<ToolCall>,
    /// 原样保留的 `finish_reason`，排查截断用。
    pub finish_reason: String,
}

#[derive(Debug, Clone)]
pub struct ToolCall {
    /// 平台给的 id。**回传时必须原样带上** —— 它是 `tool` 消息和这次调用
    /// 的唯一关联，改一个字符模型就对不上，会重复调同一个工具。
    pub id: String,
    pub name: String,
    /// 原始参数字符串（JSON）。**不在这里解析** —— 解析失败要作为工具结果
    /// 回给模型让它改，而不是让整轮失败。
    pub arguments: String,
}

/// 发一轮带工具的对话。
///
/// `messages` 是完整历史（含 system），调用方负责累积。这里不持有状态：
/// 会话怎么存、截断到多长，是上层的事。
pub async fn complete_with_tools(
    client: &reqwest::Client,
    cfg: &MediaConfig,
    messages: &[Value],
    tools: &[Value],
    max_tokens: u32,
    timeout: Duration,
) -> Result<Turn, PlatformError> {
    let mut body = json!({
        "model": cfg.platform.chat_model,
        "messages": messages,
        "max_tokens": max_tokens,
        "stream": false,
    });
    // 工具为空时**不发这两个字段**。发一个空数组，部分网关会当成"限定在
    // 这零个工具里选"，于是模型什么都调不了却也不说话。
    if !tools.is_empty() {
        body["tools"] = json!(tools);
        body["tool_choice"] = json!("auto");
    }

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
    Ok(parse_turn(&parsed))
}

/// 拆一轮响应。抽出来是为了能直接断言形状 —— 这里每个字段错位都不会报错，
/// 只会让 agent 安静地少做一件事。
pub fn parse_turn(parsed: &Value) -> Turn {
    let msg = parsed.pointer("/choices/0/message");
    let content = msg
        .and_then(|m| m.get("content"))
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_string();
    let tool_calls = msg
        .and_then(|m| m.get("tool_calls"))
        .and_then(Value::as_array)
        .map(|a| {
            a.iter()
                .filter_map(|c| {
                    let name = c.pointer("/function/name")?.as_str()?.to_string();
                    Some(ToolCall {
                        id: c
                            .get("id")
                            .and_then(Value::as_str)
                            .unwrap_or("")
                            .to_string(),
                        name,
                        // 有的实现在没有参数时给 `null` 而不是 `"{}"`。
                        // 原样当空对象，而不是让这次调用整个丢掉。
                        arguments: c
                            .pointer("/function/arguments")
                            .and_then(Value::as_str)
                            .unwrap_or("{}")
                            .to_string(),
                    })
                })
                .collect()
        })
        .unwrap_or_default();
    Turn {
        content,
        tool_calls,
        finish_reason: parsed
            .pointer("/choices/0/finish_reason")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string(),
    }
}

#[cfg(test)]
mod tool_tests {
    use super::*;

    #[test]
    fn a_turn_can_be_tool_calls_only() {
        // content 为空 + tool_calls 非空是最正常的一轮。当成错误的话
        // agent 第一步就走不下去。
        let v: Value = serde_json::from_str(
            r#"{"choices":[{"finish_reason":"tool_calls","message":{"content":null,
                "tool_calls":[{"id":"c1","type":"function",
                "function":{"name":"canvas_list_nodes","arguments":"{}"}}]}}]}"#,
        )
        .unwrap();
        let t = parse_turn(&v);
        assert!(t.content.is_empty());
        assert_eq!(t.tool_calls.len(), 1);
        assert_eq!(t.tool_calls[0].id, "c1");
        assert_eq!(t.tool_calls[0].name, "canvas_list_nodes");
    }

    #[test]
    fn null_arguments_are_treated_as_an_empty_object() {
        // 有的实现没参数时给 null。丢掉这次调用的话，agent 会以为工具
        // 没被调过而重试，陷在同一步上。
        let v: Value = serde_json::from_str(
            r#"{"choices":[{"message":{"tool_calls":[{"id":"c1",
                "function":{"name":"list_capabilities","arguments":null}}]}}]}"#,
        )
        .unwrap();
        let t = parse_turn(&v);
        assert_eq!(t.tool_calls[0].arguments, "{}");
    }

    #[test]
    fn a_plain_text_turn_has_no_tool_calls() {
        let v: Value = serde_json::from_str(
            r#"{"choices":[{"finish_reason":"stop","message":{"content":"  做好了  "}}]}"#,
        )
        .unwrap();
        let t = parse_turn(&v);
        assert_eq!(t.content, "做好了");
        assert!(t.tool_calls.is_empty());
        assert_eq!(t.finish_reason, "stop");
    }

    #[test]
    fn a_malformed_tool_call_does_not_drop_the_good_ones() {
        // 一个坏的把整批丢掉的话，模型明明调了三个工具，我们只当它什么
        // 都没调 —— 它会原样再调一遍。
        let v: Value = serde_json::from_str(
            r#"{"choices":[{"message":{"tool_calls":[
                {"id":"c1","function":{"arguments":"{}"}},
                {"id":"c2","function":{"name":"read","arguments":"{}"}}]}}]}"#,
        )
        .unwrap();
        let t = parse_turn(&v);
        assert_eq!(t.tool_calls.len(), 1);
        assert_eq!(t.tool_calls[0].name, "read");
    }
}
