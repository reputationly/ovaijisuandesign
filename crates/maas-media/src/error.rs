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

#[cfg(test)]
mod tests {
    use super::*;

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
