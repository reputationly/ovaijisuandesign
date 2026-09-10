//! 接入飞书。
//!
//! ## 不走云端
//!
//! 用**用户自己在飞书开放平台建的应用**：填 App ID / App Secret，客户端
//! 主动连出去（长连接），飞书把事件推过来。桌面端因此不需要公网地址、
//! 不需要备案、也不经过任何第三方中转。
//!
//! 这一点和我们整个项目的取向一致，也是官方那份文案说的
//! 「所有消息直达本机，无云端中转」。
//!
//! ## 协议
//!
//! 1. `POST {domain}/callback/ws/endpoint`，body `{AppID, AppSecret}`
//!    → `{ URL, ClientConfig }`
//! 2. 连那个 `URL`（WebSocket），帧是 protobuf，见 [`frame`]
//! 3. 定期发 `method=control` + `type=ping` 的帧；服务端回 `pong`，
//!    payload 里带下一轮的 `PingInterval` 等参数
//! 4. `method=data` + `type=event` 是事件。**可能分片**（`sum` / `seq`），
//!    要按 `message_id` 合并
//!
//! 这些是从官方应用里那份 `@larksuiteoapi/node-sdk` 读出来的接口事实。

pub mod bridge;
pub mod conn;
pub mod frame;
