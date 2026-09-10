//! 飞书附件：解析 + 下载。
//!
//! 比微信那条简单得多 —— 消息里带的是一个 `image_key` / `file_key`，
//! 拿它去飞书换字节，没有 CDN、没有 AES。
//!
//! ## 端点只有一个能用
//!
//! `/open-apis/im/v1/images/:image_key` 和 `/files/:file_key` 看起来更直接，
//! 但飞书自己的文档写着**"只能下载机器人自己上传的"**。用户发的资源必须走
//!
//! ```text
//! GET /open-apis/im/v1/messages/{message_id}/resources/{file_key}?type=image|file
//! ```
//!
//! 走错那个的话，拿到的是一个 `code != 0` 的 JSON —— 而它是 HTTP 200，
//! 不检查的话会被当成图片存下来。
//!
//! ## `type` 只有两个值
//!
//! 官方的注释说得很清楚：图片是 `image`，**其余全是 `file`**（文件、语音、
//! 视频都算）。不是按消息类型一一对应的。
//!
//! ## 机器人得在同一个会话里
//!
//! 飞书会拒绝跨会话取资源。这是最容易撞上的失败，所以错误信息要原样带出来。

use serde_json::Value;

/// 单个附件的上限。官方的 `DEFAULT_INBOUND_DOWNLOAD_MAX_BYTES`。
/// 飞书那边自己的上限是 100 MB，这里更小 —— 是全量读进内存的。
const MAX_BYTES: usize = 32 * 1024 * 1024;

/// 下载时 `type` 参数的取值。**不是消息类型**，见模块注释。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    Image,
    File,
}

impl Kind {
    pub fn as_param(self) -> &'static str {
        match self {
            Kind::Image => "image",
            Kind::File => "file",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Attachment {
    pub key: String,
    pub kind: Kind,
    pub filename: String,
}

/// `image_key` / `file_key` 会被拼进文件名，里面可能有任意字符。
/// 官方的 `videoAttachmentFromFields` 也做这一步。
fn safe_key(key: &str) -> String {
    key.chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

/// 原名看起来像个文件名（有 1~5 位扩展名）就用原名，否则造一个。
/// 对应官方的 `videoAttachmentFromFields`。
fn video_attachment(file_key: &str, raw_name: Option<&str>) -> Attachment {
    let usable = raw_name.filter(|n| {
        let Some((_, ext)) = n.rsplit_once('.') else {
            return false;
        };
        (1..=5).contains(&ext.len()) && ext.chars().all(|c| c.is_ascii_alphanumeric())
    });
    Attachment {
        key: file_key.to_string(),
        kind: Kind::File,
        filename: usable
            .map(str::to_string)
            .unwrap_or_else(|| format!("feishu-video-{}.mp4", safe_key(file_key))),
    }
}

/// 非空字符串。飞书会把没值的字段给成 `""`,当成"有值"处理的话
/// 后面会拿一个空 key 去请求。
fn s(v: Option<&Value>) -> Option<&str> {
    v.and_then(Value::as_str).filter(|x| !x.is_empty())
}

/// 从 `content` 里取附件。对应官方的 `extractAttachmentFromContent`。
///
/// 返回 `None` 表示这条消息**整条跳过** —— 官方也是这么做的：一条图片消息
/// 取不到 `image_key`,那它就没有任何可用内容。
pub fn from_content(message_type: &str, content: &Value) -> Option<Attachment> {
    match message_type {
        "image" => {
            let key = s(content.get("image_key"))?;
            Some(Attachment {
                key: key.to_string(),
                kind: Kind::Image,
                // 图片没有名字，按 key 造一个。
                filename: format!("feishu-{}.jpg", safe_key(key)),
            })
        }
        "file" => {
            let key = s(content.get("file_key"))?;
            Some(Attachment {
                key: key.to_string(),
                kind: Kind::File,
                filename: s(content.get("file_name"))
                    .map(str::to_string)
                    .unwrap_or_else(|| format!("feishu-{}.bin", safe_key(key))),
            })
        }
        "audio" => {
            let key = s(content.get("file_key"))?;
            Some(Attachment {
                key: key.to_string(),
                // 语音也是 `file`,不是单独一类。
                kind: Kind::File,
                filename: format!("feishu-audio-{}.opus", safe_key(key)),
            })
        }
        "media" => {
            let key = s(content.get("file_key"))?;
            Some(video_attachment(key, s(content.get("file_name"))))
        }
        _ => None,
    }
}

/// 附件在正文里的占位。对应官方的 `placeholderForAttachment`。
///
/// 光把附件塞给 agent 而正文空着的话，它不知道用户发了几样东西、
/// 哪个是哪个。
pub fn placeholder(a: &Attachment) -> String {
    const VIDEO_EXT: [&str; 6] = ["mp4", "mov", "m4v", "webm", "mkv", "avi"];
    if a.kind == Kind::Image {
        return "[图片]".into();
    }
    let ext = a
        .filename
        .rsplit_once('.')
        .map(|(_, e)| e.to_ascii_lowercase())
        .unwrap_or_default();
    if VIDEO_EXT.contains(&ext.as_str()) {
        return "[视频]".into();
    }
    if a.filename.starts_with("feishu-audio-") {
        return "[语音]".into();
    }
    format!("[文件] {}", a.filename)
}

/// 富文本（`post`）拆出来的东西。
#[derive(Debug, Default, PartialEq, Eq)]
pub struct Post {
    pub text: String,
    pub attachments: Vec<Attachment>,
    /// 被 @ 的人。目前只用来判断"有没有人被 @",不参与提示词。
    pub at_user_ids: Vec<String>,
}

/// 拆 `post` 富文本。对应官方的 `extractPostContent`。
///
/// 结构是 `{ zh_cn: { title, content: [[段落元素…]…] } }`,元素有
/// `text` / `a` / `at` / `img` / `media` 五种。
///
/// **不能只看 `zh_cn`** —— 用户把飞书切成英文时同一条消息会走 `en_us`,
/// 只认中文的话那条消息整个是空的。官方按 zh_cn → en_us → ja_jp →
/// 顶层的顺序找，我们照抄。
pub fn extract_post(content: &Value) -> Option<Post> {
    let locale = ["zh_cn", "en_us", "ja_jp"]
        .iter()
        .find_map(|k| content.get(*k).filter(|v| v.is_object()))
        // 有些机器人收到的 post 正文直接在顶层。
        .unwrap_or(content);
    let paragraphs = locale.get("content")?.as_array()?;

    let mut out = Post::default();
    let mut lines: Vec<String> = Vec::new();
    if let Some(t) = s(locale.get("title")) {
        lines.push(t.to_string());
    }

    for para in paragraphs {
        let Some(elements) = para.as_array() else {
            continue;
        };
        let mut segs: Vec<String> = Vec::new();
        for el in elements {
            match el.get("tag").and_then(Value::as_str).unwrap_or("") {
                // `a` 是超链接，正文里显示它的文字。
                "text" | "a" => {
                    if let Some(t) = s(el.get("text")) {
                        segs.push(t.to_string());
                    }
                }
                "at" => {
                    let id = s(el.get("user_id")).or_else(|| s(el.get("open_id")));
                    if let Some(id) = id {
                        out.at_user_ids.push(id.to_string());
                    }
                    // 没有名字就用 id 的后 6 位 —— 至少同一条里两个不同的人
                    // 看起来是两个人。
                    let name = s(el.get("user_name"))
                        .map(str::to_string)
                        .unwrap_or_else(|| {
                            id.map(|i| {
                                let tail: String = i
                                    .chars()
                                    .rev()
                                    .take(6)
                                    .collect::<Vec<_>>()
                                    .into_iter()
                                    .rev()
                                    .collect();
                                format!("user_{tail}")
                            })
                            .unwrap_or_else(|| "someone".into())
                        });
                    segs.push(format!("@{name}"));
                }
                "img" => {
                    if let Some(key) = s(el.get("image_key")) {
                        out.attachments.push(Attachment {
                            key: key.to_string(),
                            kind: Kind::Image,
                            filename: format!("feishu-{}.jpg", safe_key(key)),
                        });
                        // 编号从 1 起，和附件顺序对齐 —— agent 才能把
                        //「第二张图」对上具体哪个文件。
                        segs.push(format!("[图片{}]", out.attachments.len()));
                    }
                }
                "media" => {
                    if let Some(key) = s(el.get("file_key")) {
                        out.attachments
                            .push(video_attachment(key, s(el.get("file_name"))));
                        segs.push(format!("[视频{}]", out.attachments.len()));
                    }
                }
                _ => {}
            }
        }
        if !segs.is_empty() {
            lines.push(segs.concat());
        }
    }

    out.text = lines.join("\n").trim().to_string();
    // 一条什么都没解出来的富文本没有处理的必要。
    if out.text.is_empty() && out.attachments.is_empty() {
        return None;
    }
    Some(out)
}

/// 下载一个附件的字节。
///
/// 失败时**把飞书的 msg 原样带出来** —— 最常见的失败是"机器人不在这个
/// 会话里",而飞书的提示比我们能编的任何话都准确。
pub async fn fetch(
    client: &reqwest::Client,
    domain: &str,
    token: &str,
    message_id: &str,
    a: &Attachment,
) -> Result<Vec<u8>, String> {
    let url = format!(
        "{}/open-apis/im/v1/messages/{}/resources/{}?type={}",
        domain.trim_end_matches('/'),
        urlencoding(message_id),
        urlencoding(&a.key),
        a.kind.as_param()
    );
    let r = client
        .get(url)
        .bearer_auth(token)
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await
        .map_err(|e| format!("下载附件失败：{e}"))?;
    let status = r.status();
    let bytes = r.bytes().await.map_err(|e| e.to_string())?;

    // **成功时返回的是二进制，失败时返回的是 JSON —— 而两种都是 HTTP 200。**
    // 不看内容的话，一个 `{"code":230002,...}` 会被当成图片存进工作区，
    // 然后 agent 拿着一张打不开的"图"干活。
    if let Ok(v) = serde_json::from_slice::<Value>(&bytes)
        && let Some(code) = v.get("code").and_then(Value::as_i64)
        && code != 0
    {
        return Err(format!(
            "飞书拒绝了这个附件（code {code}）：{}",
            v.get("msg").and_then(Value::as_str).unwrap_or("没有说明")
        ));
    }
    if !status.is_success() {
        return Err(format!("飞书返回 {status}"));
    }
    if bytes.len() > MAX_BYTES {
        return Err(format!(
            "附件太大（{} 字节，上限 {MAX_BYTES}）",
            bytes.len()
        ));
    }
    if bytes.is_empty() {
        return Err("飞书返回了空内容".into());
    }
    Ok(bytes.to_vec())
}

/// 只转义会破坏路径的字符。`file_key` / `message_id` 都是
/// `[A-Za-z0-9_-]` 那一类，正常情况下这个函数原样返回。
fn urlencoding(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b'~') {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn everything_that_is_not_an_image_downloads_as_file() {
        // 飞书的 `type` 只有 image / file 两个值，语音和视频都算 file。
        // 按消息类型一一对应地传 `audio` / `media` 的话，飞书会拒。
        assert_eq!(
            from_content("image", &json!({"image_key":"img_1"}))
                .unwrap()
                .kind,
            Kind::Image
        );
        for t in ["file", "audio", "media"] {
            let a = from_content(t, &json!({"file_key":"file_1"})).unwrap();
            assert_eq!(a.kind, Kind::File, "{t} 应当按 file 下载");
            assert_eq!(a.kind.as_param(), "file");
        }
    }

    #[test]
    fn an_attachment_without_a_key_is_skipped() {
        // 空字符串也算没有 —— 当成"有值"的话会拿空 key 去请求。
        assert!(from_content("image", &json!({})).is_none());
        assert!(from_content("image", &json!({"image_key":""})).is_none());
        assert!(from_content("file", &json!({"file_name":"a.pdf"})).is_none());
    }

    #[test]
    fn a_file_keeps_its_name_and_a_video_gets_a_usable_one() {
        assert_eq!(
            from_content("file", &json!({"file_key":"f1","file_name":"参考.pdf"}))
                .unwrap()
                .filename,
            "参考.pdf"
        );
        // 没有扩展名的原名不可用 —— 存下来的东西点不开。
        assert_eq!(
            from_content("media", &json!({"file_key":"v/1","file_name":"录屏"}))
                .unwrap()
                .filename,
            "feishu-video-v_1.mp4"
        );
        assert_eq!(
            from_content("media", &json!({"file_key":"v1","file_name":"a.mov"}))
                .unwrap()
                .filename,
            "a.mov"
        );
    }

    #[test]
    fn a_key_with_slashes_cannot_escape_the_filename() {
        // key 会被拼进文件名。`../` 混进去就写到工作区外面了。
        let a = from_content("image", &json!({"image_key":"../../etc/passwd"})).unwrap();
        assert!(!a.filename.contains('/'), "{}", a.filename);
        assert!(!a.filename.contains(".."), "{}", a.filename);
        // key 本身不变 —— 它是要发回给飞书的。
        assert_eq!(a.key, "../../etc/passwd");
    }

    #[test]
    fn a_post_is_read_in_whatever_locale_it_arrives_in() {
        // 用户把飞书切成英文时同一条消息走 en_us。只认 zh_cn 的话，
        // 那条消息整个是空的 —— 而且没有任何报错。
        let zh = json!({"zh_cn":{"content":[[{"tag":"text","text":"中文"}]]}});
        let en = json!({"en_us":{"content":[[{"tag":"text","text":"english"}]]}});
        let top = json!({"content":[[{"tag":"text","text":"顶层"}]]});
        assert_eq!(extract_post(&zh).unwrap().text, "中文");
        assert_eq!(extract_post(&en).unwrap().text, "english");
        assert_eq!(extract_post(&top).unwrap().text, "顶层");
    }

    #[test]
    fn a_post_title_becomes_the_first_line() {
        let p = extract_post(&json!({
            "zh_cn": { "title": "需求", "content": [[{"tag":"text","text":"出三张图"}]] }
        }))
        .unwrap();
        assert_eq!(p.text, "需求\n出三张图");
    }

    #[test]
    fn images_in_a_post_are_numbered_in_order() {
        // 编号要和附件顺序对齐，否则 agent 把「第二张图」对到了第一个文件上。
        let p = extract_post(&json!({
            "zh_cn": { "content": [[
                {"tag":"text","text":"照 "},
                {"tag":"img","image_key":"img_a"},
                {"tag":"text","text":" 和 "},
                {"tag":"img","image_key":"img_b"},
                {"tag":"text","text":" 的风格"},
            ]] }
        }))
        .unwrap();
        assert_eq!(p.text, "照 [图片1] 和 [图片2] 的风格");
        assert_eq!(p.attachments.len(), 2);
        assert_eq!(p.attachments[0].key, "img_a");
        assert_eq!(p.attachments[1].key, "img_b");
    }

    #[test]
    fn a_link_contributes_its_text_and_a_mention_its_name() {
        let p = extract_post(&json!({
            "zh_cn": { "content": [[
                {"tag":"at","user_id":"ou_abcdef123456"},
                {"tag":"text","text":" 看看 "},
                {"tag":"a","text":"这个链接","href":"https://x"},
            ]] }
        }))
        .unwrap();
        // 没有 user_name 就用 id 的后 6 位，至少两个不同的人看起来是两个人。
        assert_eq!(p.text, "@user_123456 看看 这个链接");
        assert_eq!(p.at_user_ids, vec!["ou_abcdef123456"]);
    }

    #[test]
    fn paragraphs_become_separate_lines() {
        let p = extract_post(&json!({
            "zh_cn": { "content": [
                [{"tag":"text","text":"第一段"}],
                [],
                [{"tag":"text","text":"第二段"}],
            ] }
        }))
        .unwrap();
        // 空段落不产生空行 —— 否则正文里会多出一堆看不见的换行。
        assert_eq!(p.text, "第一段\n第二段");
    }

    #[test]
    fn a_post_with_only_a_picture_still_comes_through() {
        // 只贴一张图指望"照这个做"是常见用法。丢掉的话那张图就没了。
        let p = extract_post(&json!({
            "zh_cn": { "content": [[{"tag":"img","image_key":"img_x"}]] }
        }))
        .unwrap();
        assert_eq!(p.text, "[图片1]");
        assert_eq!(p.attachments.len(), 1);
    }

    #[test]
    fn an_empty_post_is_skipped() {
        assert!(extract_post(&json!({"zh_cn":{"content":[]}})).is_none());
        assert!(extract_post(&json!({"zh_cn":{}})).is_none());
        // content 不是数组 —— 不是我们认识的结构。
        assert!(extract_post(&json!({"zh_cn":{"content":"文字"}})).is_none());
    }

    #[test]
    fn placeholders_tell_the_kinds_apart() {
        // 正文里只留一个 `[文件]` 的话，agent 不知道用户发了几样东西。
        let img = from_content("image", &json!({"image_key":"i"})).unwrap();
        let mov = from_content("media", &json!({"file_key":"v"})).unwrap();
        let doc = from_content("file", &json!({"file_key":"f","file_name":"报告.pdf"})).unwrap();
        let voice = from_content("audio", &json!({"file_key":"a"})).unwrap();
        assert_eq!(placeholder(&img), "[图片]");
        assert_eq!(placeholder(&mov), "[视频]");
        assert_eq!(placeholder(&doc), "[文件] 报告.pdf");
        assert_eq!(placeholder(&voice), "[语音]");
    }
}
