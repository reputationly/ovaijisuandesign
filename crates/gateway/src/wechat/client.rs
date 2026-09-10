//! iLink AI Bot 的 HTTP 客户端。
//!
//! 腾讯官方的机器人平台（`ilinkai.weixin.qq.com`），**不需要企业资质** ——
//! 实测直接请求 `get_bot_qrcode` 就能拿到二维码。
//!
//! ## 两件不做就会安静坏掉的
//!
//! - **iLink 业务失败也回 HTTP 200**，真正的结果在 JSON 信封里
//!   （`ret` / `errcode` / `errmsg`）。只看 HTTP 状态码的话，一条被拒的消息
//!   会被当成发成功 —— 用户那边什么都没收到，而我们的日志里一切正常。
//! - **长轮询超时是正常的，不是错误**。服务端会挂住连接最多 35 秒；
//!   到点没消息就断开。当成错误的话，一个空闲的连接每 35 秒报一次"失败"。

use std::time::Duration;

use serde::Deserialize;
use serde_json::{Value, json};

pub const DEFAULT_BASE_URL: &str = "https://ilinkai.weixin.qq.com";
/// 官方 SDK 报的版本号。**原样带上** —— 服务端可能按它做兼容处理。
const SDK_VERSION: &str = "0.9.0";
/// 扫码状态和收消息都用这个长轮询时长。和官方一致。
pub const LONG_POLL: Duration = Duration::from_secs(35);
const API_TIMEOUT: Duration = Duration::from_secs(15);
/// 二维码最多刷新几次。超过说明用户没在扫，重开一次登录流程更清楚。
pub const MAX_QR_REFRESH: u32 = 3;

/// `X-WECHAT-UIN`：一个随机 u32 的十进制字符串再 base64。
///
/// 官方 SDK 每个请求都新生成一个。照做 —— 固定值可能被当成同一个客户端
/// 的重复请求。
fn wechat_uin() -> String {
    use base64::Engine;
    let n: u32 = rand_u32();
    base64::engine::general_purpose::STANDARD.encode(n.to_string())
}

/// 不引 rand crate：这里只要一个不可预测的 u32，而系统时间加地址熵足够。
/// **不是密码学用途** —— 它只是个请求标识。
fn rand_u32() -> u32 {
    use std::hash::{BuildHasher, Hasher};
    let mut h = std::collections::hash_map::RandomState::new().build_hasher();
    h.write_u64(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos() as u64)
            .unwrap_or(0),
    );
    h.finish() as u32
}

#[derive(Debug, Clone)]
pub struct Client {
    http: reqwest::Client,
    base: String,
    pub token: Option<String>,
}

/// 从信封里读业务结果。`ret != 0` 或 `errcode != 0` 都是失败。
fn envelope_error(v: &Value) -> Option<String> {
    let ret = v.get("ret").and_then(Value::as_i64);
    let code = v.get("errcode").and_then(Value::as_i64);
    if ret.unwrap_or(0) != 0 || code.unwrap_or(0) != 0 {
        return Some(format!(
            "ret={} errcode={} errmsg={}",
            ret.unwrap_or(0),
            code.unwrap_or(0),
            v.get("errmsg").and_then(Value::as_str).unwrap_or("")
        ));
    }
    None
}

impl Client {
    pub fn new(http: reqwest::Client, base: Option<&str>, token: Option<String>) -> Self {
        Self {
            http,
            base: base
                .unwrap_or(DEFAULT_BASE_URL)
                .trim_end_matches('/')
                .to_string(),
            token,
        }
    }

    fn url(&self, path: &str) -> String {
        format!("{}/{}", self.base, path.trim_start_matches('/'))
    }

    /// POST 一个 JSON，回原始文本。**超时返回 `Ok(None)`** ——
    /// 长轮询到点是正常的，调用方按空结果处理。
    async fn post(
        &self,
        path: &str,
        mut body: Value,
        timeout: Duration,
    ) -> Result<Option<String>, String> {
        if let Some(o) = body.as_object_mut() {
            o.insert(
                "base_info".into(),
                json!({ "channel_version": SDK_VERSION }),
            );
        }
        let mut req = self
            .http
            .post(self.url(path))
            .header("content-type", "application/json")
            .header("AuthorizationType", "ilink_bot_token")
            .header("X-WECHAT-UIN", wechat_uin())
            .timeout(timeout)
            .json(&body);
        if let Some(t) = self
            .token
            .as_deref()
            .map(str::trim)
            .filter(|t| !t.is_empty())
        {
            req = req.bearer_auth(t);
        }
        match req.send().await {
            Ok(r) => {
                let status = r.status();
                let text = r.text().await.map_err(|e| e.to_string())?;
                if !status.is_success() {
                    // 把正文带出来。iLink 的诊断信息在 body 里，
                    // 只报状态码的话完全看不出是什么问题。
                    return Err(format!(
                        "HTTP {status}: {}",
                        text.chars().take(240).collect::<String>()
                    ));
                }
                Ok(Some(text))
            }
            Err(e) if e.is_timeout() => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    // -- 扫码登录 ----------------------------------------------------------

    /// 取一个新二维码。
    pub async fn qrcode(&self) -> Result<Qr, String> {
        let r = self
            .http
            .get(self.url("ilink/bot/get_bot_qrcode?bot_type=3"))
            .header("iLink-App-Id", "bot")
            .header("iLink-App-ClientVersion", "1")
            .timeout(API_TIMEOUT)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        let v: Value = serde_json::from_str(&r.text().await.map_err(|e| e.to_string())?)
            .map_err(|e| format!("二维码响应不是 JSON: {e}"))?;
        if let Some(e) = envelope_error(&v) {
            return Err(format!("取二维码失败：{e}"));
        }
        let token = v
            .get("qrcode")
            .and_then(Value::as_str)
            .ok_or("没有 qrcode")?;
        let raw = v
            .get("qrcode_img_content")
            .and_then(Value::as_str)
            .unwrap_or_default();
        // 官方那边分三种：URL、data:image、裸 base64。裸 base64 要自己补
        // data URI 前缀，否则前端 <img> 显示不出来。
        let (url, is_image) = if raw.starts_with("http://") || raw.starts_with("https://") {
            (raw.to_string(), false)
        } else if raw.starts_with("data:image/") {
            (raw.to_string(), true)
        } else if raw.contains("://") || raw.starts_with("data:text/html") {
            (raw.to_string(), false)
        } else {
            (format!("data:image/png;base64,{raw}"), true)
        };
        Ok(Qr {
            token: token.to_string(),
            url,
            is_image,
        })
    }

    /// 轮一次扫码状态。**超时算 `wait`**，这是正常的长轮询行为。
    pub async fn qr_status(&self, qrcode: &str) -> Result<QrStatus, String> {
        let r = self
            .http
            .get(self.url(&format!(
                "ilink/bot/get_qrcode_status?qrcode={}",
                urlencode(qrcode)
            )))
            .header("iLink-App-Id", "bot")
            .header("iLink-App-ClientVersion", "1")
            .timeout(LONG_POLL)
            .send()
            .await;
        let text = match r {
            Ok(r) => r.text().await.map_err(|e| e.to_string())?,
            Err(e) if e.is_timeout() => return Ok(QrStatus::default()),
            Err(e) => return Err(e.to_string()),
        };
        serde_json::from_str(&text).map_err(|e| format!("扫码状态不是 JSON（{e}）：{text}"))
    }

    // -- 收发 --------------------------------------------------------------

    /// 长轮询收消息。返回 `(消息列表, 新的游标)`。
    ///
    /// `buf` 是服务端给的游标，**必须原样带回去**，否则会重复收到旧消息。
    pub async fn get_updates(&self, buf: &str) -> Result<(Vec<Value>, String), String> {
        let Some(text) = self
            .post(
                "ilink/bot/getupdates",
                json!({ "get_updates_buf": buf }),
                LONG_POLL + Duration::from_secs(5),
            )
            .await?
        else {
            // 超时 = 这一轮没有消息。游标不变。
            return Ok((vec![], buf.to_string()));
        };
        let v: Value =
            serde_json::from_str(&text).map_err(|e| format!("收消息响应不是 JSON: {e}"))?;
        if let Some(e) = envelope_error(&v) {
            return Err(e);
        }
        let msgs = v
            .get("msgs")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        let next = v
            .get("get_updates_buf")
            .and_then(Value::as_str)
            .unwrap_or(buf)
            .to_string();
        Ok((msgs, next))
    }

    /// 发一条文本。
    pub async fn send_text(&self, ctx: &SendCtx, text: &str) -> Result<(), String> {
        let mut body = json!({
            "item_list": [{ "type": 1, "text_item": { "text": text } }],
        });
        ctx.apply(&mut body);
        let Some(resp) = self
            .post("ilink/bot/sendmessage", body, API_TIMEOUT)
            .await?
        else {
            return Err("发送超时".into());
        };
        let v: Value = serde_json::from_str(&resp).unwrap_or_default();
        // **业务失败也回 200**，只看状态码会把被拒的消息当成发成功。
        if let Some(e) = envelope_error(&v) {
            return Err(format!("发送被拒：{e}"));
        }
        Ok(())
    }

    /// 「正在输入」。失败**不当错误** —— 它只是个提示，
    /// 因为它失败而中断整轮回复得不偿失。
    pub async fn send_typing(&self, ctx: &SendCtx) {
        let mut body = json!({});
        ctx.apply(&mut body);
        let _ = self
            .post("ilink/bot/sendtyping", body, Duration::from_secs(10))
            .await;
    }
}

/// 回消息要带的上下文。**原样从收到的消息里抄** —— 这些字段的含义
/// 我们不需要知道，改一个就可能发不出去。
#[derive(Debug, Clone, Default)]
pub struct SendCtx {
    pub ilink_user_id: String,
    pub context_token: String,
    pub group_id: Option<String>,
}

impl SendCtx {
    fn apply(&self, body: &mut Value) {
        let Some(o) = body.as_object_mut() else {
            return;
        };
        o.insert("ilink_user_id".into(), json!(self.ilink_user_id));
        o.insert("context_token".into(), json!(self.context_token));
        if let Some(g) = &self.group_id {
            o.insert("group_id".into(), json!(g));
        }
    }
}

#[derive(Debug, Clone)]
pub struct Qr {
    pub token: String,
    pub url: String,
    pub is_image: bool,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct QrStatus {
    #[serde(default = "wait")]
    pub status: String,
    #[serde(default)]
    pub bot_token: Option<String>,
    #[serde(default)]
    pub ilink_bot_id: Option<String>,
    #[serde(default)]
    pub baseurl: Option<String>,
    #[serde(default)]
    pub ilink_user_id: Option<String>,
}

fn wait() -> String {
    "wait".into()
}

/// 只转 query 里会出问题的那几个字符。**不引 urlencoding crate** ——
/// 这里的输入是服务端给的 token（十六进制），本来就不需要转义，
/// 转义只是防御。
fn urlencode(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            _ => format!("%{:02X}", c as u32),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_business_failure_is_detected_even_on_http_200() {
        // iLink 业务失败也回 200。只看状态码的话，被拒的消息会被当成
        // 发成功 —— 用户那边什么都没收到，而日志里一切正常。
        assert!(envelope_error(&json!({ "ret": 0 })).is_none());
        assert!(envelope_error(&json!({ "ret": 0, "errcode": 0 })).is_none());
        assert!(envelope_error(&json!({})).is_none(), "两个字段都没有算成功");
        let e = envelope_error(&json!({ "ret": 1, "errmsg": "bad token" })).unwrap();
        assert!(e.contains("bad token"));
        assert!(envelope_error(&json!({ "errcode": 40001 })).is_some());
    }

    #[test]
    fn the_uin_header_is_base64_of_a_decimal_number() {
        use base64::Engine;
        let u = wechat_uin();
        let raw = base64::engine::general_purpose::STANDARD
            .decode(&u)
            .unwrap();
        let s = String::from_utf8(raw).unwrap();
        assert!(
            s.chars().all(|c| c.is_ascii_digit()),
            "解出来应该是十进制数字: {s}"
        );
        assert!(s.parse::<u32>().is_ok());
    }

    #[test]
    fn a_default_qr_status_is_wait_not_empty() {
        // 服务端超时时我们自己造一个。status 是空串的话，调用方的 match
        // 会掉进"未知状态"分支然后报错，而那只是没人扫码。
        assert_eq!(QrStatus::default().status, "");
        let parsed: QrStatus = serde_json::from_str("{}").unwrap();
        assert_eq!(parsed.status, "wait", "缺字段时要当成 wait");
    }

    #[test]
    fn send_ctx_only_adds_group_id_for_group_chats() {
        // 单聊带上 group_id 的话服务端会当成群消息，发到一个不存在的群里。
        let mut b = json!({ "item_list": [] });
        SendCtx {
            ilink_user_id: "u1".into(),
            context_token: "t1".into(),
            group_id: None,
        }
        .apply(&mut b);
        assert!(b.get("group_id").is_none());
        assert_eq!(b["ilink_user_id"], "u1");

        let mut g = json!({});
        SendCtx {
            ilink_user_id: "u1".into(),
            context_token: "t1".into(),
            group_id: Some("g1".into()),
        }
        .apply(&mut g);
        assert_eq!(g["group_id"], "g1");
    }
}
