//! 微信附件：从 CDN 下载并解密。
//!
//! 图片/文件/视频不在消息体里，消息里只有一对
//! `(encrypt_query_param, aes_key)`。拿这对去
//! `https://novac2c.cdn.weixin.qq.com/c2c/download` 取密文，
//! 再用 **AES-128-ECB** 解开。
//!
//! ## 密钥有两种形态
//!
//! `aes_key` 是 base64。解出来**可能是 16 字节裸密钥，也可能是 32 个字符的
//! 十六进制文本**（那 32 个字符再解一次 hex 才是真密钥）。官方 SDK 两种都认。
//!
//! 只认第一种的话，第二种会拿一个 32 字节的"密钥"去做 AES-128 —— 要么报错，
//! 要么（更糟）取前 16 字节解出一堆乱码，然后这堆乱码被当成图片存进工作区。

use aes::cipher::{BlockDecrypt, KeyInit, generic_array::GenericArray};
use base64::Engine;

const CDN_BASE: &str = "https://novac2c.cdn.weixin.qq.com/c2c";
/// 附件 key 的分隔符。官方的 `KEY_SEPARATOR`。
const KEY_SEP: char = '|';
/// 单个附件的上限。CDN 那边给多大我们不知道，而这是全量读进内存的。
const MAX_BYTES: usize = 64 * 1024 * 1024;

/// 把两段拼成一个可传递的 key。和官方的 `encodeAttachmentKey` 一致。
pub fn encode_key(query_param: &str, aes_key_b64: &str) -> String {
    format!("{query_param}{KEY_SEP}{aes_key_b64}")
}

pub fn decode_key(key: &str) -> Option<(String, String)> {
    // **从右边切**。官方用的是 `indexOf`（从左），但那样 query_param 里
    // 一旦含 `|` 就会被切断，而 aes_key 是 base64、永远不含 `|` ——
    // 从右切在任何情况下都对。
    //
    // 这个 key 不出我们的进程（parse_message 造、fetch 用），所以和官方
    // 不一致没有兼容性问题。
    let (a, b) = key.rsplit_once(KEY_SEP)?;
    Some((a.to_string(), b.to_string()))
}

/// `aes_key`（base64）→ 16 字节密钥。
pub fn parse_key(aes_key_b64: &str) -> Result<[u8; 16], String> {
    let raw = base64::engine::general_purpose::STANDARD
        .decode(aes_key_b64.trim())
        .map_err(|e| format!("aes_key 不是合法 base64: {e}"))?;
    if raw.len() == 16 {
        let mut k = [0u8; 16];
        k.copy_from_slice(&raw);
        return Ok(k);
    }
    // 32 个十六进制字符 —— 那是密钥的文本形式，再解一次。
    if raw.len() == 32
        && let Ok(text) = std::str::from_utf8(&raw)
        && text.chars().all(|c| c.is_ascii_hexdigit())
    {
        let mut k = [0u8; 16];
        for i in 0..16 {
            k[i] = u8::from_str_radix(&text[i * 2..i * 2 + 2], 16)
                .map_err(|e| format!("aes_key 的 hex 解析失败: {e}"))?;
        }
        return Ok(k);
    }
    Err(format!(
        "aes_key 要么解出 16 字节裸密钥，要么是 32 个十六进制字符，实际 {} 字节",
        raw.len()
    ))
}

/// AES-128-ECB 解密，去掉 PKCS#7 填充。
///
/// **必须校验填充**：不校验的话，一个被截断或用错密钥解出来的数据会安静地
/// 少掉最后 1~16 个字节 —— 图片能存下来但打不开，而错误发生在几步之前。
pub fn decrypt(cipher_text: &[u8], key: &[u8; 16]) -> Result<Vec<u8>, String> {
    if cipher_text.is_empty() || !cipher_text.len().is_multiple_of(16) {
        return Err(format!(
            "密文长度 {} 不是 16 的整数倍，多半下载被截断了",
            cipher_text.len()
        ));
    }
    let c = aes::Aes128::new(GenericArray::from_slice(key));
    let mut out = cipher_text.to_vec();
    // `.0` 丢掉的是不足一块的尾巴 —— 上面刚校验过长度是 16 的整数倍，
    // 所以这里必然为空。
    for block in out.as_chunks_mut::<16>().0 {
        c.decrypt_block(GenericArray::from_mut_slice(block));
    }
    let pad = *out.last().ok_or("空数据")? as usize;
    if pad == 0 || pad > 16 || pad > out.len() {
        return Err("PKCS#7 填充不合法，多半是密钥不对".into());
    }
    if out[out.len() - pad..].iter().any(|&b| b as usize != pad) {
        return Err("PKCS#7 填充不一致，多半是密钥不对".into());
    }
    out.truncate(out.len() - pad);
    Ok(out)
}

/// 下载并解密一个附件。
pub async fn fetch(
    http: &reqwest::Client,
    key: &str,
    token: Option<&str>,
) -> Result<Vec<u8>, String> {
    let (query_param, aes_b64) = decode_key(key).ok_or("附件 key 里没有分隔符")?;
    let aes = parse_key(&aes_b64)?;
    let url = format!(
        "{CDN_BASE}/download?encrypted_query_param={}",
        super::client::urlencode(&query_param)
    );
    let mut req = http
        .get(url)
        .header("AuthorizationType", "ilink_bot_token")
        .header("X-WECHAT-UIN", super::client::wechat_uin())
        .timeout(std::time::Duration::from_secs(120));
    if let Some(t) = token.map(str::trim).filter(|t| !t.is_empty()) {
        req = req.bearer_auth(t);
    }
    let r = req.send().await.map_err(|e| format!("CDN 下载失败: {e}"))?;
    if !r.status().is_success() {
        let s = r.status();
        let body = r.text().await.unwrap_or_default();
        return Err(format!(
            "CDN 返回 {s}: {}",
            body.chars().take(200).collect::<String>()
        ));
    }
    let bytes = r.bytes().await.map_err(|e| e.to_string())?;
    if bytes.len() > MAX_BYTES {
        return Err(format!("附件太大（{} 字节）", bytes.len()));
    }
    decrypt(&bytes, &aes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use aes::cipher::BlockEncrypt;

    fn encrypt(plain: &[u8], key: &[u8; 16]) -> Vec<u8> {
        let pad = 16 - plain.len() % 16;
        let mut buf = plain.to_vec();
        buf.extend(std::iter::repeat_n(pad as u8, pad));
        let c = aes::Aes128::new(GenericArray::from_slice(key));
        for b in buf.as_chunks_mut::<16>().0 {
            c.encrypt_block(GenericArray::from_mut_slice(b));
        }
        buf
    }

    #[test]
    fn a_raw_16_byte_key_and_a_hex_key_give_the_same_result() {
        // 官方两种都认。只认第一种的话，第二种会拿 32 字节去做 AES-128 ——
        // 要么报错，要么取前 16 字节解出乱码，而那堆乱码会被当成图片存下来。
        let raw = [0xABu8; 16];
        let b64_raw = base64::engine::general_purpose::STANDARD.encode(raw);
        let hex_text = "ab".repeat(16);
        let b64_hex = base64::engine::general_purpose::STANDARD.encode(&hex_text);
        assert_eq!(parse_key(&b64_raw).unwrap(), raw);
        assert_eq!(parse_key(&b64_hex).unwrap(), raw);
    }

    #[test]
    fn a_key_of_the_wrong_length_is_refused() {
        let b64 = base64::engine::general_purpose::STANDARD.encode([1u8; 20]);
        assert!(parse_key(&b64).is_err());
        // 32 字节但不是 hex 文本 —— 也不行。
        let b64 = base64::engine::general_purpose::STANDARD.encode([0xFFu8; 32]);
        assert!(parse_key(&b64).is_err());
    }

    #[test]
    fn a_round_trip_recovers_the_exact_bytes() {
        let key = [7u8; 16];
        for len in [0usize, 1, 15, 16, 17, 1000] {
            let plain: Vec<u8> = (0..len).map(|i| (i % 251) as u8).collect();
            let back = decrypt(&encrypt(&plain, &key), &key).unwrap();
            assert_eq!(back, plain, "长度 {len} 没有原样还原");
        }
    }

    #[test]
    fn a_wrong_key_is_caught_by_the_padding_check() {
        // 不校验填充的话，用错密钥解出来的数据会安静地少掉最后 1~16 字节 ——
        // 图片能存下来但打不开，而错误发生在几步之前。
        let good = encrypt(b"hello world, this is a picture", &[7u8; 16]);
        let e = decrypt(&good, &[8u8; 16]).unwrap_err();
        assert!(e.contains("填充"), "{e}");
    }

    #[test]
    fn a_truncated_download_is_reported_not_silently_decoded() {
        let good = encrypt(b"abcdefghijklmnop", &[7u8; 16]);
        let e = decrypt(&good[..good.len() - 3], &[7u8; 16]).unwrap_err();
        assert!(e.contains("截断"), "{e}");
    }

    #[test]
    fn a_query_param_containing_the_separator_is_not_truncated() {
        // 从左切的话（官方那样）query_param 会被切成 "a=1"，
        // 而拿一个残缺的参数去 CDN 只会拿回 403，看不出是这里的问题。
        let k = encode_key("a=1|b=2", "QUJD");
        assert_eq!(decode_key(&k).unwrap(), ("a=1|b=2".into(), "QUJD".into()));
        assert!(decode_key("没有分隔符").is_none());
    }
}
