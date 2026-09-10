//! 长连接：握手、心跳、收事件、分片合并。
//!
//! 协议细节见 [`super`] 的模块注释。这里只讲几个**不做就会安静坏掉**的点。

use std::collections::HashMap;
use std::time::{Duration, Instant};

use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use serde_json::Value;

use super::frame::*;

/// 握手拿到的连接参数。
#[derive(Debug, Clone)]
pub struct ConnInfo {
    pub url: String,
    /// URL 的 query 里带着 `service_id`，**每一帧都要填它**。
    pub service_id: i32,
    pub ping_interval: Duration,
}

#[derive(Debug, Deserialize)]
struct EndpointResp {
    code: i64,
    #[serde(default)]
    msg: String,
    #[serde(default)]
    data: Option<EndpointData>,
}

#[derive(Debug, Deserialize)]
struct EndpointData {
    #[serde(rename = "URL")]
    url: String,
    #[serde(rename = "ClientConfig", default)]
    client_config: Option<ClientConfig>,
}

#[derive(Debug, Deserialize, Default)]
struct ClientConfig {
    #[serde(rename = "PingInterval", default)]
    ping_interval: u64,
}

/// 换一个长连接地址。
///
/// 失败时**把飞书的 msg 原样带出来**：这里最常见的失败是 App ID/Secret
/// 写错或应用没发布，飞书的提示比我们能编的任何话都准确。
pub async fn handshake(
    client: &reqwest::Client,
    domain: &str,
    app_id: &str,
    app_secret: &str,
) -> Result<ConnInfo, String> {
    let url = format!("{}/callback/ws/endpoint", domain.trim_end_matches('/'));
    let resp = client
        .post(&url)
        .header("locale", "zh")
        .json(&serde_json::json!({ "AppID": app_id, "AppSecret": app_secret }))
        .timeout(Duration::from_secs(15))
        .send()
        .await
        .map_err(|e| format!("连不上飞书：{e}"))?;
    let raw = resp.text().await.map_err(|e| e.to_string())?;
    let parsed: EndpointResp =
        serde_json::from_str(&raw).map_err(|e| format!("飞书返回的不是 JSON（{e}）：{raw}"))?;
    if parsed.code != 0 {
        return Err(format!(
            "飞书拒绝了握手（code {}）：{}",
            parsed.code, parsed.msg
        ));
    }
    let data = parsed.data.ok_or("飞书没有返回连接地址")?;
    // service_id 在 URL 的 query 里。**取不到就不能连** —— 每一帧都要带它，
    // 填 0 的话服务端会静默丢弃所有帧，表现是"连上了但收不到任何消息"。
    let service_id = service_id_from(&data.url)
        .ok_or_else(|| format!("连接地址里没有 service_id：{}", data.url))?;
    let ping = data
        .client_config
        .and_then(|c| (c.ping_interval > 0).then_some(c.ping_interval))
        .unwrap_or(120);
    Ok(ConnInfo {
        url: data.url,
        service_id,
        ping_interval: Duration::from_secs(ping),
    })
}

/// 从长连接 URL 的 query 里取 `service_id`。
pub fn service_id_from(url: &str) -> Option<i32> {
    let q = url.split_once('?')?.1;
    q.split('&')
        .filter_map(|kv| kv.split_once('='))
        .find(|(k, _)| *k == "service_id")
        .and_then(|(_, v)| v.parse().ok())
}

/// 分片合并。
///
/// 一条事件可能被拆成多帧（`sum` 总数、`seq` 序号）。**不合并的话，
/// 每一片都会被当成一条完整事件去解 JSON** —— 前几片解不出来被丢掉，
/// 用户看到的是"发了消息但 agent 没反应"。
/// 一条正在拼的消息。**用具名结构而不是三元组** —— `(usize, Vec<…>, Instant)`
/// 里那个 usize 是"总片数"还是"已收到几片"，看类型完全看不出来。
#[derive(Debug)]
struct Pending {
    sum: usize,
    parts: Vec<Option<Vec<u8>>>,
    started: Instant,
}

#[derive(Debug, Default)]
pub struct Reassembler {
    pending: HashMap<String, Pending>,
}

/// 分片最多留多久。收不齐就丢 —— 不设上限的话，一次断连留下的半条消息
/// 会一直占着内存。
const PART_TTL: Duration = Duration::from_secs(120);

impl Reassembler {
    /// 喂一帧。凑齐了返回完整 payload。
    pub fn push(&mut self, msg_id: &str, sum: usize, seq: usize, data: Vec<u8>) -> Option<Vec<u8>> {
        // 单片的最常见，直接短路，不进 map。
        if sum <= 1 {
            return Some(data);
        }
        if seq >= sum {
            // 序号越界只可能是对端出错或我们解析错了。丢掉这一片，
            // 而不是 panic 或者把 vec 撑到 seq 那么大。
            return None;
        }
        self.pending.retain(|_, p| p.started.elapsed() < PART_TTL);
        let e = self
            .pending
            .entry(msg_id.to_string())
            .or_insert_with(|| Pending {
                sum,
                parts: vec![None; sum],
                started: Instant::now(),
            });
        // 同一个 message_id 报了不同的 sum —— 不可能同时对。以先到的为准
        // 并丢掉这一片，比重建缓冲（把已收到的片全扔了）损失小。
        if e.sum != sum {
            return None;
        }
        e.parts[seq] = Some(data);
        if e.parts.iter().all(Option::is_some) {
            let p = self.pending.remove(msg_id)?;
            return Some(p.parts.into_iter().flatten().flatten().collect());
        }
        None
    }
}

/// 一条收到的事件。
#[derive(Debug)]
pub struct Event {
    pub message_id: String,
    /// 事件正文（`{ schema, header, event }`）。
    pub body: Value,
}

/// 跑一条长连接，直到断开或 `stop` 变 true。
///
/// 每收到一条完整事件调一次 `on_event`。**回调里不要做耗时的事** ——
/// 这个循环同时负责心跳，卡住会让服务端认为我们掉线。
pub async fn run<F>(info: &ConnInfo, mut on_event: F, stop: impl Fn() -> bool) -> Result<(), String>
where
    F: FnMut(Event),
{
    let (ws, _) = tokio_tungstenite::connect_async(&info.url)
        .await
        .map_err(|e| format!("长连接建立失败：{e}"))?;
    let (mut tx, mut rx) = ws.split();
    let mut asm = Reassembler::default();
    let mut ping_at = tokio::time::interval(info.ping_interval);
    // 第一次 tick 是立即触发的，跳过 —— 刚连上就发 ping 没有意义。
    ping_at.tick().await;

    loop {
        if stop() {
            let _ = tx.close().await;
            return Ok(());
        }
        tokio::select! {
            _ = ping_at.tick() => {
                let f = Frame {
                    service: info.service_id,
                    method: FRAME_CONTROL,
                    headers: vec![(H_TYPE.into(), T_PING.into())],
                    ..Default::default()
                };
                if tx.send(tokio_tungstenite::tungstenite::Message::Binary(
                    f.encode().into(),
                )).await.is_err() {
                    return Err("发送心跳失败，连接已断".into());
                }
            }
            msg = rx.next() => {
                let Some(msg) = msg else { return Err("连接被对端关闭".into()) };
                let msg = msg.map_err(|e| format!("读取失败：{e}"))?;
                use tokio_tungstenite::tungstenite::Message;
                let bytes = match msg {
                    Message::Binary(b) => b,
                    Message::Close(_) => return Err("对端要求关闭".into()),
                    // ping/pong/text 都不是业务帧，忽略。
                    _ => continue,
                };
                let Some(f) = Frame::decode(&bytes) else { continue };
                // 握手结果走 header 不是 HTTP 状态码 —— 连接建立成功但
                // 鉴权失败时，这里是唯一能看到原因的地方。
                if let Some(st) = f.header(H_HANDSHAKE_STATUS)
                    && st != "0"
                {
                    return Err(format!(
                        "飞书拒绝了这条连接（status {st}）：{}",
                        f.header(H_HANDSHAKE_MSG).unwrap_or("没有说明")
                    ));
                }
                if f.method != FRAME_DATA || f.header(H_TYPE) != Some(T_EVENT) {
                    continue;
                }
                let msg_id = f.header(H_MESSAGE_ID).unwrap_or("").to_string();
                let sum = f.header(H_SUM).and_then(|v| v.parse().ok()).unwrap_or(1);
                let seq = f.header(H_SEQ).and_then(|v| v.parse().ok()).unwrap_or(0);
                let Some(full) = asm.push(&msg_id, sum, seq, f.payload) else { continue };
                let Ok(body) = serde_json::from_slice::<Value>(&full) else { continue };
                on_event(Event { message_id: msg_id, body });
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn service_id_is_read_out_of_the_url_query() {
        // 取不到就不能连：每一帧都要带它，填 0 的话服务端静默丢弃所有帧，
        // 表现是"连上了但收不到任何消息"。
        assert_eq!(
            service_id_from("wss://x.feishu.cn/ws/v1?device_id=1&service_id=12&ts=9"),
            Some(12)
        );
        assert_eq!(service_id_from("wss://x.feishu.cn/ws/v1"), None);
        assert_eq!(service_id_from("wss://x/ws?service_id=abc"), None);
    }

    #[test]
    fn a_single_part_message_is_passed_straight_through() {
        let mut a = Reassembler::default();
        assert_eq!(a.push("m1", 1, 0, b"hi".to_vec()), Some(b"hi".to_vec()));
        assert!(a.pending.is_empty(), "单片不该留在缓存里");
    }

    #[test]
    fn parts_are_joined_in_sequence_order_not_arrival_order() {
        // 乱序到达是常态。按到达顺序拼的话，JSON 会被拼坏 ——
        // 而那时看到的是"偶尔有一条消息 agent 不理"。
        let mut a = Reassembler::default();
        assert!(a.push("m1", 3, 2, b"c".to_vec()).is_none());
        assert!(a.push("m1", 3, 0, b"a".to_vec()).is_none());
        assert_eq!(a.push("m1", 3, 1, b"b".to_vec()), Some(b"abc".to_vec()));
    }

    #[test]
    fn an_out_of_range_seq_is_dropped_not_expanded() {
        // seq 越界时按它扩容会让一条伪造的消息吃掉任意内存。
        let mut a = Reassembler::default();
        assert!(a.push("m1", 2, 99, b"x".to_vec()).is_none());
        assert!(a.pending.is_empty());
    }

    #[test]
    fn two_messages_do_not_mix() {
        let mut a = Reassembler::default();
        assert!(a.push("m1", 2, 0, b"a".to_vec()).is_none());
        assert!(a.push("m2", 2, 0, b"x".to_vec()).is_none());
        assert_eq!(a.push("m2", 2, 1, b"y".to_vec()), Some(b"xy".to_vec()));
        assert_eq!(a.push("m1", 2, 1, b"b".to_vec()), Some(b"ab".to_vec()));
    }
}
