//! 实时事件推送。`GET /ws`
//!
//! 和官方一样用 Nest `WsAdapter` 的帧格式：`{"event": …, "data": …}`。
//! 前端 `connectEvents()` 就是按这个解的。
//!
//! 这条路由自己实现而不是反代 —— reqwest 转不了 WebSocket 的 Upgrade 握手，
//! 那也是之前 `/ws` 只能让前端直连官方的原因。

use std::sync::Arc;

use axum::extract::State;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::response::Response;
use serde_json::{Value, json};
use tokio::sync::broadcast;

use crate::AppState;

/// 广播缓冲。订阅者跟不上时丢最旧的 —— 事件是提示，不是账本，
/// 丢几条比把发布方阻塞住好。
const CAPACITY: usize = 64;

pub struct Events {
    tx: broadcast::Sender<String>,
}

impl Events {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(CAPACITY);
        Self { tx }
    }

    /// 发一条事件。没有订阅者时静默丢弃，不是错误。
    pub fn publish(&self, event: &str, data: Value) {
        let frame = json!({ "event": event, "data": data }).to_string();
        let _ = self.tx.send(frame);
    }

    fn subscribe(&self) -> broadcast::Receiver<String> {
        self.tx.subscribe()
    }
}

impl Default for Events {
    fn default() -> Self {
        Self::new()
    }
}

pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<Arc<AppState>>) -> Response {
    ws.on_upgrade(move |socket| pump(socket, state))
}

async fn pump(mut socket: WebSocket, state: Arc<AppState>) {
    let mut rx = state.events.subscribe();
    tracing::debug!("ws 已连接");
    loop {
        tokio::select! {
            frame = rx.recv() => match frame {
                Ok(text) => {
                    if socket.send(Message::Text(text.into())).await.is_err() {
                        break;
                    }
                }
                // 订阅者跟不上被落下了。继续收就行 —— 断开连接会让前端
                // 以为服务挂了，而实际上只是漏了几条提示。
                Err(broadcast::error::RecvError::Lagged(n)) => {
                    tracing::debug!("ws 落后 {n} 条");
                }
                Err(broadcast::error::RecvError::Closed) => break,
            },
            // 读一侧只用来感知对端关闭。我们不处理入站消息。
            incoming = socket.recv() => match incoming {
                None | Some(Err(_)) => break,
                Some(Ok(_)) => {}
            },
        }
    }
    tracing::debug!("ws 已断开");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frames_match_the_nest_ws_adapter_shape() {
        // 前端按 {event, data} 解。改了这个形状，实时事件会安静地不工作。
        let e = Events::new();
        let mut rx = e.subscribe();
        e.publish("canvas:changed", json!({ "added": "n1" }));
        let frame: Value = serde_json::from_str(&rx.try_recv().unwrap()).unwrap();
        assert_eq!(frame["event"], "canvas:changed");
        assert_eq!(frame["data"]["added"], "n1");
    }

    #[test]
    fn publishing_without_subscribers_is_not_an_error() {
        Events::new().publish("canvas:changed", json!({}));
    }
}
