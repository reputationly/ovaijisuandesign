//! 飞书长连接的帧编解码。
//!
//! 协议是 protobuf，schema 只有两个 message、九个字段，全是标量：
//!
//! ```proto
//! message Header { string key = 1; string value = 2; }
//! message Frame {
//!   uint64 SeqID = 1;  uint64 LogID = 2;
//!   int32 service = 3; int32 method = 4;
//!   repeated Header headers = 5;
//!   string payloadEncoding = 6;  string payloadType = 7;
//!   bytes payload = 8;  string LogIDNew = 9;
//! }
//! ```
//!
//! **手写而不是引 prost。** prost 要 build.rs + protoc，而这里只有九个字段
//! 和四种 wire type。引进来的复杂度（构建期依赖一个外部二进制）远大于
//! 这一百来行。
//!
//! ## 解码要宽容
//!
//! 未知字段**按 wire type 跳过，不报错**。飞书随时可能加字段，
//! 一个 `unknown field` 的错误会让整条长连接断掉，而那个字段我们根本不用。

/// 帧类型（protobuf 里的 `method`）。
pub const FRAME_CONTROL: i32 = 0;
pub const FRAME_DATA: i32 = 1;

/// `headers` 里的键。取自官方 SDK 的 `HeaderKey`。
pub const H_TYPE: &str = "type";
pub const H_MESSAGE_ID: &str = "message_id";
pub const H_SUM: &str = "sum";
pub const H_SEQ: &str = "seq";
pub const H_TRACE_ID: &str = "trace_id";
pub const H_BIZ_RT: &str = "biz_rt";
/// 握手结果走这三个头，不是 HTTP 状态码。
pub const H_HANDSHAKE_STATUS: &str = "handshake-status";
pub const H_HANDSHAKE_MSG: &str = "handshake-msg";

/// `type` 头的取值。
pub const T_EVENT: &str = "event";
pub const T_CARD: &str = "card";
pub const T_PING: &str = "ping";
pub const T_PONG: &str = "pong";

#[derive(Debug, Clone, Default)]
pub struct Frame {
    pub seq_id: u64,
    pub log_id: u64,
    pub service: i32,
    pub method: i32,
    pub headers: Vec<(String, String)>,
    pub payload_encoding: Option<String>,
    pub payload_type: Option<String>,
    pub payload: Vec<u8>,
    pub log_id_new: Option<String>,
}

impl Frame {
    pub fn header(&self, key: &str) -> Option<&str> {
        self.headers
            .iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.as_str())
    }

    pub fn encode(&self) -> Vec<u8> {
        let mut out = Vec::with_capacity(64 + self.payload.len());
        put_varint_field(&mut out, 1, self.seq_id);
        put_varint_field(&mut out, 2, self.log_id);
        put_varint_field(&mut out, 3, self.service as u64);
        put_varint_field(&mut out, 4, self.method as u64);
        for (k, v) in &self.headers {
            let mut h = Vec::new();
            put_bytes_field(&mut h, 1, k.as_bytes());
            put_bytes_field(&mut h, 2, v.as_bytes());
            put_bytes_field(&mut out, 5, &h);
        }
        if let Some(s) = &self.payload_encoding {
            put_bytes_field(&mut out, 6, s.as_bytes());
        }
        if let Some(s) = &self.payload_type {
            put_bytes_field(&mut out, 7, s.as_bytes());
        }
        if !self.payload.is_empty() {
            put_bytes_field(&mut out, 8, &self.payload);
        }
        if let Some(s) = &self.log_id_new {
            put_bytes_field(&mut out, 9, s.as_bytes());
        }
        out
    }

    /// 解一帧。**坏帧返回 None 而不是 panic** —— 网络上收到什么都有可能，
    /// 而一个畸形帧不该让整个连接挂掉。
    pub fn decode(buf: &[u8]) -> Option<Frame> {
        let mut f = Frame::default();
        let mut i = 0usize;
        while i < buf.len() {
            let (tag, n) = read_varint(buf, i)?;
            i += n;
            let field = (tag >> 3) as u32;
            let wire = (tag & 7) as u8;
            match (field, wire) {
                (1, 0) => {
                    let (v, n) = read_varint(buf, i)?;
                    i += n;
                    f.seq_id = v;
                }
                (2, 0) => {
                    let (v, n) = read_varint(buf, i)?;
                    i += n;
                    f.log_id = v;
                }
                (3, 0) => {
                    let (v, n) = read_varint(buf, i)?;
                    i += n;
                    f.service = v as i32;
                }
                (4, 0) => {
                    let (v, n) = read_varint(buf, i)?;
                    i += n;
                    f.method = v as i32;
                }
                (5, 2) => {
                    let (b, n) = read_bytes(buf, i)?;
                    i += n;
                    if let Some(h) = decode_header(b) {
                        f.headers.push(h);
                    }
                }
                (6, 2) => {
                    let (b, n) = read_bytes(buf, i)?;
                    i += n;
                    f.payload_encoding = Some(String::from_utf8_lossy(b).into_owned());
                }
                (7, 2) => {
                    let (b, n) = read_bytes(buf, i)?;
                    i += n;
                    f.payload_type = Some(String::from_utf8_lossy(b).into_owned());
                }
                (8, 2) => {
                    let (b, n) = read_bytes(buf, i)?;
                    i += n;
                    f.payload = b.to_vec();
                }
                (9, 2) => {
                    let (b, n) = read_bytes(buf, i)?;
                    i += n;
                    f.log_id_new = Some(String::from_utf8_lossy(b).into_owned());
                }
                // 不认识的字段按 wire type 跳过。飞书随时会加字段，
                // 报错会让整条长连接断掉，而那个字段我们根本不用。
                (_, 0) => {
                    let (_, n) = read_varint(buf, i)?;
                    i += n;
                }
                (_, 2) => {
                    let (_, n) = read_bytes(buf, i)?;
                    i += n;
                }
                (_, 5) => i += 4,
                (_, 1) => i += 8,
                _ => return None,
            }
        }
        Some(f)
    }
}

fn decode_header(buf: &[u8]) -> Option<(String, String)> {
    let (mut k, mut v) = (String::new(), String::new());
    let mut i = 0usize;
    while i < buf.len() {
        let (tag, n) = read_varint(buf, i)?;
        i += n;
        match (tag >> 3, tag & 7) {
            (1, 2) => {
                let (b, n) = read_bytes(buf, i)?;
                i += n;
                k = String::from_utf8_lossy(b).into_owned();
            }
            (2, 2) => {
                let (b, n) = read_bytes(buf, i)?;
                i += n;
                v = String::from_utf8_lossy(b).into_owned();
            }
            (_, 0) => {
                let (_, n) = read_varint(buf, i)?;
                i += n;
            }
            (_, 2) => {
                let (_, n) = read_bytes(buf, i)?;
                i += n;
            }
            _ => return None,
        }
    }
    Some((k, v))
}

fn put_varint(out: &mut Vec<u8>, mut v: u64) {
    loop {
        let b = (v & 0x7f) as u8;
        v >>= 7;
        if v == 0 {
            out.push(b);
            return;
        }
        out.push(b | 0x80);
    }
}

fn put_varint_field(out: &mut Vec<u8>, field: u32, v: u64) {
    put_varint(out, u64::from(field) << 3);
    put_varint(out, v);
}

fn put_bytes_field(out: &mut Vec<u8>, field: u32, b: &[u8]) {
    put_varint(out, (u64::from(field) << 3) | 2);
    put_varint(out, b.len() as u64);
    out.extend_from_slice(b);
}

/// 读一个 varint。**限制 10 字节** —— 64 位最多 10 个 7 位组，
/// 不限的话一串 0x80 会让这里一直读到缓冲区末尾。
fn read_varint(buf: &[u8], mut i: usize) -> Option<(u64, usize)> {
    let start = i;
    let mut v = 0u64;
    let mut shift = 0u32;
    loop {
        let b = *buf.get(i)?;
        i += 1;
        v |= u64::from(b & 0x7f) << shift;
        if b & 0x80 == 0 {
            return Some((v, i - start));
        }
        shift += 7;
        if shift >= 64 {
            return None;
        }
    }
}

fn read_bytes(buf: &[u8], i: usize) -> Option<(&[u8], usize)> {
    let (len, n) = read_varint(buf, i)?;
    let start = i + n;
    let end = start.checked_add(len as usize)?;
    // 长度字段可能被截断或被伪造。**先检查再切片**，否则直接 panic。
    if end > buf.len() {
        return None;
    }
    Some((&buf[start..end], n + len as usize))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> Frame {
        Frame {
            seq_id: 7,
            log_id: 0,
            service: 12,
            method: FRAME_DATA,
            headers: vec![
                (H_TYPE.into(), T_EVENT.into()),
                (H_MESSAGE_ID.into(), "m-1".into()),
                (H_SUM.into(), "1".into()),
                (H_SEQ.into(), "0".into()),
            ],
            payload_encoding: None,
            payload_type: None,
            payload: b"{\"hello\":\"world\"}".to_vec(),
            log_id_new: None,
        }
    }

    #[test]
    fn a_frame_survives_a_round_trip() {
        let f = sample();
        let back = Frame::decode(&f.encode()).unwrap();
        assert_eq!(back.seq_id, 7);
        assert_eq!(back.service, 12);
        assert_eq!(back.method, FRAME_DATA);
        assert_eq!(back.payload, f.payload);
        assert_eq!(back.header(H_TYPE), Some(T_EVENT));
        assert_eq!(back.header(H_MESSAGE_ID), Some("m-1"));
    }

    #[test]
    fn an_unknown_field_is_skipped_not_rejected() {
        // 飞书随时会加字段。报错会让整条长连接断掉，而那个字段我们不用。
        let mut buf = sample().encode();
        // 追加 field 20 (varint) 和 field 21 (bytes)
        put_varint_field(&mut buf, 20, 12345);
        put_bytes_field(&mut buf, 21, b"future");
        let back = Frame::decode(&buf).expect("未知字段不该让整帧解不出来");
        assert_eq!(back.seq_id, 7);
        assert_eq!(back.header(H_TYPE), Some(T_EVENT));
    }

    #[test]
    fn a_truncated_frame_returns_none_instead_of_panicking() {
        // 网络上收到什么都有可能。切片越界会 panic，而这跑在长连接的
        // 读循环里 —— panic 掉的是整个任务。
        let full = sample().encode();
        for cut in [1, 3, full.len() / 2, full.len() - 1] {
            let _ = Frame::decode(&full[..cut]);
        }
        // 伪造一个超长的 length 前缀
        let mut evil = Vec::new();
        put_varint(&mut evil, (8u64 << 3) | 2);
        put_varint(&mut evil, u64::MAX / 2);
        evil.extend_from_slice(b"short");
        assert!(Frame::decode(&evil).is_none());
    }

    #[test]
    fn a_runaway_varint_does_not_loop_forever() {
        // 一串 0x80 不封顶的话会一直读到缓冲区末尾，或者移位溢出。
        let evil = vec![0x80u8; 64];
        assert!(Frame::decode(&evil).is_none());
    }

    #[test]
    fn a_ping_frame_matches_what_the_sdk_sends() {
        // 官方 SDK 的 ping：method=control，headers 只有一个 type=ping，
        // SeqID 和 LogID 都是 0。少一个字段服务端会直接断开。
        let ping = Frame {
            service: 9,
            method: FRAME_CONTROL,
            headers: vec![(H_TYPE.into(), T_PING.into())],
            ..Default::default()
        };
        let back = Frame::decode(&ping.encode()).unwrap();
        assert_eq!(back.method, FRAME_CONTROL);
        assert_eq!(back.seq_id, 0);
        assert_eq!(back.log_id, 0);
        assert_eq!(back.header(H_TYPE), Some(T_PING));
    }
}
