//! 从 MP4 / MOV 里读画面尺寸和时长。
//!
//! ## 为什么要自己解
//!
//! 资产索引原来只对图片读尺寸（`image::image_dimensions`），视频一律拿到
//! `(None, None)` —— 于是画布上每个视频节点都退回默认的 350x350 **方块**,
//! 而视频本身多半是 16:9。用户看到的是一个尺寸对不上的卡片，
//! 而且怎么刷新都不会变。
//!
//! 不拉 ffmpeg：为了两个整数引入一个几十 MB 的二进制依赖不划算，而且
//! 要求用户机器上装了它 —— 装没装我们控制不了，读不到尺寸时的表现又正好是
//! "安静地退回方块"。MP4 的尺寸就在 `tkhd` 盒子里，自己解一下更可靠。
//!
//! ## 只解够用的部分
//!
//! ```text
//! moov
//!  ├─ mvhd            时长（timescale + duration）
//!  └─ trak
//!      ├─ tkhd        画面尺寸（宽高是 16.16 定点数）
//!      └─ ...
//! ```
//!
//! **不递归解全部盒子**,只按需要往下钻。解析失败一律返回 `None` ——
//! 拿不到尺寸只是退回默认值，不该让一次资产登记失败。

/// 视频的画面尺寸和时长。
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct VideoInfo {
    pub width: u32,
    pub height: u32,
    /// 秒。读不到时是 `None`。
    pub duration: Option<f64>,
}

/// 盒子头：`[4 字节大小][4 字节类型]`。
///
/// 返回 `(类型, 内容区间)`。大小为 1 时后面跟 8 字节的扩展大小
/// （大于 4GB 的文件会用到）；为 0 表示"一直到文件末尾"。
fn read_box(buf: &[u8], at: usize) -> Option<(&[u8; 4], usize, usize)> {
    if at + 8 > buf.len() {
        return None;
    }
    let size = u32::from_be_bytes(buf[at..at + 4].try_into().ok()?) as usize;
    let kind: &[u8; 4] = buf[at + 4..at + 8].try_into().ok()?;
    let (body, end) = match size {
        // 扩展大小。
        1 => {
            if at + 16 > buf.len() {
                return None;
            }
            let big = u64::from_be_bytes(buf[at + 8..at + 16].try_into().ok()?) as usize;
            (at + 16, at.checked_add(big)?)
        }
        // 到文件末尾。
        0 => (at + 8, buf.len()),
        // **小于 8 是坏数据。** 不拦的话下面的 `at = end` 不前进，
        // 外层循环变成死循环 —— 一个坏文件能让整个登记流程卡住。
        n if n < 8 => return None,
        n => (at + 8, at.checked_add(n)?),
    };
    if body > buf.len() || end > buf.len() || end < body {
        return None;
    }
    Some((kind, body, end))
}

/// 在一段范围里按类型找一个盒子，返回它的内容区间。
fn find<'a>(buf: &'a [u8], mut at: usize, end: usize, want: &[u8; 4]) -> Option<(usize, usize)> {
    while at < end {
        let (kind, body, box_end) = read_box(buf, at)?;
        if kind == want {
            return Some((body, box_end));
        }
        at = box_end;
    }
    None
}

/// 解析。**读不到就是 `None`,不报错。**
pub fn probe(bytes: &[u8]) -> Option<VideoInfo> {
    let (moov_body, moov_end) = find(bytes, 0, bytes.len(), b"moov")?;

    // 时长在 mvhd 里。拿不到不影响尺寸 —— 所以是 Option，不是 `?`。
    let duration = find(bytes, moov_body, moov_end, b"mvhd").and_then(|(b, _)| mvhd_duration(bytes, b));

    // 尺寸在 trak/tkhd 里。**一个文件可能有多条 trak**（视频 + 音频），
    // 音频轨的 tkhd 宽高是 0 —— 要跳过它，否则拿到 0x0，
    // 而 0 尺寸的节点在画布上是看不见的。
    let mut at = moov_body;
    while at < moov_end {
        let (kind, body, box_end) = read_box(bytes, at)?;
        if kind == b"trak" {
            if let Some((tkhd, _)) = find(bytes, body, box_end, b"tkhd") {
                if let Some((w, h)) = tkhd_size(bytes, tkhd) {
                    if w > 0 && h > 0 {
                        return Some(VideoInfo {
                            width: w,
                            height: h,
                            duration,
                        });
                    }
                }
            }
        }
        at = box_end;
    }
    None
}

/// `tkhd` 的宽高：在盒子末尾，**16.16 定点数**。
///
/// 版本 0 的头部是 84 字节、版本 1 是 96（创建/修改时间和 duration 从
/// 32 位变 64 位）。宽高永远是最后 8 个字节。
fn tkhd_size(buf: &[u8], body: usize) -> Option<(u32, u32)> {
    let version = *buf.get(body)?;
    let len = match version {
        0 => 84,
        1 => 96,
        _ => return None,
    };
    let end = body.checked_add(len)?;
    if end > buf.len() {
        return None;
    }
    let w = u32::from_be_bytes(buf[end - 8..end - 4].try_into().ok()?);
    let h = u32::from_be_bytes(buf[end - 4..end].try_into().ok()?);
    // 定点数：高 16 位是整数部分。四舍五入而不是截断 ——
    // 有些编码器会写 1919.99 这种。
    let round = |v: u32| ((v as f64) / 65536.0).round() as u32;
    Some((round(w), round(h)))
}

/// `mvhd` 的时长 = `duration / timescale` 秒。
fn mvhd_duration(buf: &[u8], body: usize) -> Option<f64> {
    let version = *buf.get(body)?;
    let (ts_at, dur_at, dur_len) = match version {
        // version(1) + flags(3) + created(4) + modified(4) → timescale(4) + duration(4)
        0 => (body + 12, body + 16, 4),
        // 64 位的时间戳
        1 => (body + 20, body + 28, 8),
        _ => return None,
    };
    if dur_at + dur_len > buf.len() {
        return None;
    }
    let timescale = u32::from_be_bytes(buf[ts_at..ts_at + 4].try_into().ok()?);
    if timescale == 0 {
        // 除零会得到 inf，序列化成 JSON 时是 `null`,而调用方拿到的是
        // 一个"有值但不是数"的东西。直接当读不到。
        return None;
    }
    let duration = if dur_len == 4 {
        u32::from_be_bytes(buf[dur_at..dur_at + 4].try_into().ok()?) as u64
    } else {
        u64::from_be_bytes(buf[dur_at..dur_at + 8].try_into().ok()?)
    };
    Some(duration as f64 / timescale as f64)
}

/// 读文件。**只读前若干字节**：`moov` 通常在文件头部（给流播放优化过的
/// 文件更是如此），而一个视频动辄几十 MB，整份读进内存只为拿两个整数
/// 不划算。
///
/// 有些文件把 `moov` 放在末尾，那种情况下读不到 —— 退回默认尺寸，
/// 和以前的行为一样，不会更糟。
pub fn probe_file(path: &std::path::Path) -> Option<VideoInfo> {
    use std::io::Read;
    const HEAD: usize = 4 * 1024 * 1024;
    let mut f = std::fs::File::open(path).ok()?;
    let mut buf = Vec::new();
    f.by_ref().take(HEAD as u64).read_to_end(&mut buf).ok()?;
    if let Some(info) = probe(&buf) {
        return Some(info);
    }
    // 头部没有 moov，再试整份。**只对不太大的文件做** ——
    // 一个 2GB 的文件全读进内存会把进程撑爆。
    let size = f.metadata().ok()?.len();
    if size as usize <= HEAD || size > 256 * 1024 * 1024 {
        return None;
    }
    let mut all = Vec::with_capacity(size as usize);
    let mut f = std::fs::File::open(path).ok()?;
    f.read_to_end(&mut all).ok()?;
    probe(&all)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 拼一个最小的、结构合法的 MP4 头。
    fn make(width: f64, height: f64, timescale: u32, duration: u32, audio_first: bool) -> Vec<u8> {
        fn boxed(kind: &[u8; 4], body: &[u8]) -> Vec<u8> {
            let mut v = ((body.len() + 8) as u32).to_be_bytes().to_vec();
            v.extend_from_slice(kind);
            v.extend_from_slice(body);
            v
        }
        // tkhd v0 的**内容**是 84 字节（盒子总长 92）。宽高是最后 8 个。
        // 这里写 `84 - 8` 会得到一个短 8 字节的盒子，解析时读到的是矩阵
        // 的尾巴而不是宽高 —— 我第一版就是这么写的，四个测试一起红。
        fn tkhd(w: f64, h: f64) -> Vec<u8> {
            let mut b = vec![0u8; 84];
            let fx = |v: f64| ((v * 65536.0) as u32).to_be_bytes();
            let n = b.len();
            b[n - 8..n - 4].copy_from_slice(&fx(w));
            b[n - 4..n].copy_from_slice(&fx(h));
            boxed(b"tkhd", &b)
        }
        // mvhd v0 的内容里，timescale 在偏移 12、duration 在 16
        // （version+flags 4 + created 4 + modified 4）。
        let mut mvhd = vec![0u8; 100];
        mvhd[12..16].copy_from_slice(&timescale.to_be_bytes());
        mvhd[16..20].copy_from_slice(&duration.to_be_bytes());
        let mvhd = boxed(b"mvhd", &mvhd);

        let video = boxed(b"trak", &tkhd(width, height));
        // 音频轨：tkhd 的宽高是 0。
        let audio = boxed(b"trak", &tkhd(0.0, 0.0));

        let mut moov = mvhd;
        if audio_first {
            moov.extend_from_slice(&audio);
            moov.extend_from_slice(&video);
        } else {
            moov.extend_from_slice(&video);
            moov.extend_from_slice(&audio);
        }
        let moov = boxed(b"moov", &moov);

        let mut out = boxed(b"ftyp", b"isom\0\0\x02\0isomiso2");
        out.extend_from_slice(&moov);
        out
    }

    #[test]
    fn reads_size_and_duration() {
        let f = make(1920.0, 1080.0, 600, 3000, false);
        let got = probe(&f).expect("应该解出来");
        assert_eq!((got.width, got.height), (1920, 1080));
        assert_eq!(got.duration, Some(5.0));
    }

    /// **音频轨要跳过。** 它的 tkhd 宽高是 0，取到的话就是 0x0 —— 而
    /// 0 尺寸的节点在画布上根本看不见，比退回方块还糟。
    #[test]
    fn skips_the_audio_track() {
        let f = make(1280.0, 720.0, 1000, 5000, true);
        let got = probe(&f).expect("应该跳过音频轨找到视频轨");
        assert_eq!((got.width, got.height), (1280, 720));
    }

    /// 宽高是 16.16 定点数，有些编码器会写 1919.99 这种。
    #[test]
    fn rounds_fixed_point_instead_of_truncating() {
        let f = make(1919.99, 1080.0, 600, 600, false);
        assert_eq!(probe(&f).unwrap().width, 1920);
    }

    #[test]
    fn timescale_zero_is_not_infinity() {
        // 除零会得到 inf，序列化成 JSON 是 null —— 调用方拿到一个
        // "有值但不是数"的东西。
        let f = make(640.0, 480.0, 0, 100, false);
        let got = probe(&f).unwrap();
        assert_eq!((got.width, got.height), (640, 480));
        assert_eq!(got.duration, None);
    }

    #[test]
    fn garbage_does_not_panic_or_hang() {
        assert!(probe(b"").is_none());
        assert!(probe(b"not an mp4 at all").is_none());
        // 盒子大小声明成 0..7 —— 不拦的话外层循环不前进，直接死循环。
        for size in 0u32..8 {
            let mut v = size.to_be_bytes().to_vec();
            v.extend_from_slice(b"moov");
            v.extend_from_slice(&[0u8; 32]);
            let _ = probe(&v);
        }
        // 声明的大小远超实际长度。
        let mut v = 0xFFFF_FFFFu32.to_be_bytes().to_vec();
        v.extend_from_slice(b"moov");
        assert!(probe(&v).is_none());
    }

    #[test]
    fn a_file_without_moov_is_none() {
        assert!(probe(&[0, 0, 0, 16, b'f', b't', b'y', b'p', 0, 0, 0, 0, 0, 0, 0, 0]).is_none());
    }
}
