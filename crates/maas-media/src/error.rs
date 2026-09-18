/// 生成过程中的失败。
///
/// `code` 是给日志和排查用的，**不要**直接当成调用方协议里的错误码 ——
/// 那些通常另有枚举约束。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlatformError {
    pub code: String,
    pub message: String,
}

impl PlatformError {
    /// 配置缺失或自相矛盾。这类错误**在发出任何网络请求之前**就该抛出来。
    pub fn config(msg: impl Into<String>) -> Self {
        Self::new("dpp.config", msg)
    }

    pub fn transport(msg: impl Into<String>) -> Self {
        Self::new("dpp.transport", msg)
    }

    /// 从 `reqwest::Error` 构造，**保住失败的类别和底层原因**。
    ///
    /// # 为什么不能用 `transport(e.to_string())`
    ///
    /// `reqwest::Error` 的 Display 只有一句
    /// `error sending request for url (…)` —— 究竟是超时、连接被拒、TLS 握手
    /// 失败还是读响应体断了，全在 `source()` 链里，`to_string()` 一个都带不出来。
    ///
    /// 而传输失败时这句话**是唯一的线索**。实测栽过一次：画布超分报
    /// 「error sending request for url (…/v1/videos)」，而平台那边任务
    /// **创建成功并正常跑完了** —— 到底是我们没等到响应（超时），还是连接
    /// 被中途掐断，这句话分不出来，只能靠反复试。分不出来的直接后果是
    /// 修不对：超时该放宽预算，连接断该重试，两者的药方相反。
    ///
    /// 所以这里把类别和整条 cause 链都拼进去。
    pub fn from_reqwest(err: &reqwest::Error) -> Self {
        Self::new("dpp.transport", describe_reqwest(err))
    }

    /// 平台回了 2xx，但内容不是我们能用的形状。
    pub fn protocol(msg: impl Into<String>) -> Self {
        Self::new("dpp.protocol", msg)
    }

    /// 读写本地素材时的失败。
    pub fn io(msg: impl Into<String>) -> Self {
        Self::new("dpp.io", msg)
    }

    fn new(code: &str, msg: impl Into<String>) -> Self {
        Self {
            code: code.to_string(),
            message: msg.into(),
        }
    }

    /// 解平台的错误体。
    ///
    /// New API 有**两套信封**，5xx 和 4xx 各一套：
    ///
    /// ```json
    /// {"error": {"code": "model_not_found", "message": "…", "type": "new_api_error"}}
    /// {"code": "invalid_request", "message": "…", "data": null}
    /// ```
    ///
    /// 只认其中一套的话，另一套会退化成「平台返回 400: {原文}」——
    /// 信息没丢，但排查时要多读一层 JSON。
    pub fn from_body(status: u16, raw: &str) -> Self {
        let parsed: Option<serde_json::Value> = serde_json::from_str(raw).ok();
        let node = parsed
            .as_ref()
            .and_then(|v| v.get("error").or(Some(v)))
            .cloned()
            .unwrap_or(serde_json::Value::Null);

        let code = node
            .get("code")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .map(|s| format!("platform.{s}"))
            .unwrap_or_else(|| format!("platform.http_{status}"));
        let message = node
            .get("message")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .map(str::to_string)
            .unwrap_or_else(|| format!("平台返回 {status}: {}", truncate(raw, 200)));

        Self { code, message }
    }
}

impl std::fmt::Display for PlatformError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)
    }
}

impl std::error::Error for PlatformError {}

fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        return s.to_string();
    }
    s.chars().take(max).collect::<String>() + "…"
}

/// 把 `reqwest::Error` 说成一句能定性的话。
///
/// 形如 `超时: error sending request for url (…) ← operation timed out`。
///
/// 两部分缺一不可：
///
/// - **类别**（超时 / 连接失败 / …）决定该怎么修。超时要放宽预算，连接断
///   要重试，两者的药方相反 —— 分不出来就只能两个都试。
/// - **cause 链**是类别之外的细节（哪一层断的、系统报的什么）。`reqwest`
///   把它藏在 `source()` 里，不主动展开就永远看不到。
fn describe_reqwest(err: &reqwest::Error) -> String {
    let mut kinds = Vec::new();
    if err.is_timeout() {
        kinds.push("超时");
    }
    if err.is_connect() {
        kinds.push("连接失败");
    }
    if err.is_body() {
        kinds.push("请求/响应体中断");
    }
    if err.is_decode() {
        kinds.push("响应解码失败");
    }
    if err.is_redirect() {
        kinds.push("重定向过多");
    }
    // 一个都没命中时说"传输失败"，不要留空 —— 空类别会让这句话退回到
    // 原来那种看不出所以然的状态。
    let kind = if kinds.is_empty() {
        "传输失败".to_string()
    } else {
        kinds.join("+")
    };

    // 展开 cause 链。reqwest 自己的 Display 只有最外层那句。
    let mut causes = Vec::new();
    let mut src: Option<&(dyn std::error::Error + 'static)> = std::error::Error::source(err);
    while let Some(e) = src {
        let text = e.to_string();
        // 逐层重复同一句话没有信息量（hyper 那几层经常如此）。
        if !causes.iter().any(|c: &String| c == &text) {
            causes.push(text);
        }
        src = e.source();
    }

    let mut msg = format!("{kind}: {err}");
    if !causes.is_empty() {
        msg.push_str(" ← ");
        msg.push_str(&causes.join(" ← "));
    }
    truncate(&msg, 400)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 造一个真的超时错误 —— 连一个不会响应的地址，超时设 1ms。
    async fn timeout_error() -> reqwest::Error {
        reqwest::Client::new()
            .get("http://10.255.255.1:9/never-answers")
            .timeout(std::time::Duration::from_millis(1))
            .send()
            .await
            .expect_err("这个请求不该成功")
    }

    // **类别必须说得出来。**
    //
    // 原先是 `transport(e.to_string())`，只剩一句
    // `error sending request for url (…)` —— 超时和连接断长得一模一样，
    // 而两者的修法相反（放宽预算 vs 重试）。实测栽过：画布超分报这句，
    // 平台那边任务其实创建成功并跑完了，靠这句话分不出发生了什么。
    #[tokio::test]
    async fn a_timeout_says_it_timed_out() {
        let err = PlatformError::from_reqwest(&timeout_error().await);
        assert_eq!(err.code, "dpp.transport");
        assert!(
            err.message.contains("超时"),
            "消息里没有类别，等于没修: {}",
            err.message
        );
        // 原始描述要保留 —— 里面有 URL，是定位用的。
        assert!(err.message.contains("http://10.255.255.1:9"), "{}", err.message);
    }

    // 不认识的失败也要给个类别，别留空 —— 留空就退回了原来那种
    // "看不出所以然"的状态。
    #[tokio::test]
    async fn an_unclassified_failure_still_gets_a_label() {
        let err = PlatformError::from_reqwest(&timeout_error().await);
        assert!(
            err.message.split(':').next().is_some_and(|k| !k.trim().is_empty()),
            "类别是空的: {}",
            err.message
        );
    }

    #[test]
    fn parses_the_4xx_envelope() {
        let err = PlatformError::from_body(
            400,
            r#"{"code":"invalid_request","message":"prompt is required","data":null}"#,
        );
        assert_eq!(err.code, "platform.invalid_request");
        assert_eq!(err.message, "prompt is required");
    }

    #[test]
    fn parses_the_5xx_envelope() {
        let err = PlatformError::from_body(
            503,
            r#"{"error":{"code":"model_not_found","message":"无可用渠道","type":"new_api_error"}}"#,
        );
        assert_eq!(err.code, "platform.model_not_found");
        assert_eq!(err.message, "无可用渠道");
    }

    #[test]
    fn falls_back_when_the_body_is_not_json() {
        let err = PlatformError::from_body(502, "<html>bad gateway</html>");
        assert_eq!(err.code, "platform.http_502");
        assert!(err.message.contains("502"));
    }
}
