//! 每个模态**真正支持**的生成参数。
//!
//! ## 为什么参数必须由后端给
//!
//! 界面以前把选项写死在输入框里：`RATIOS` 七个比例、`RESOLUTIONS` 就
//! `["1K","2K"]`,不管当前要生成什么、用什么模型。后果是一串"不报错的错"：
//!
//! - **视频没有 1K 这个档位。** 用户选 1K，`resolve_size` 里落进
//!   `_ => 768` 的兜底 —— 出来的是 768P，而界面上一直显示着 1K。
//! - **首帧驱动的视频本来就不该选比例**（比例由那张图定），强塞一个的
//!   结果是平台把 size 反推成 `32:57` 然后拒掉整个任务。
//! - **时长对图片毫无意义**,却一直摆在那儿。
//!
//! 官方的做法是把 `params` 挂在**模型**上：
//!
//! ```js
//! MiniMax-H3-Max.params = {
//!   aspect_ratio: { options: ["adaptive","16:9",…], default: "adaptive" },
//!   resolution:   { options: ["768P","480P"] },
//!   duration:     { … },
//! }
//! hiddenParamsByImageMode: { "first-last-frame": ["aspect_ratio"] }
//! ```
//!
//! 我们照这个思路，但粒度先做到**模态**：我们每个模态只配一个模型
//! （见 settings 的 `models.*`），模型换了这里的表也该跟着换 ——
//! 那一步等平台能自报参数时再接，现在先把"图片和视频用同一套选项"
//! 这个错消掉。

use serde::Serialize;

/// 一个可选参数。
#[derive(Debug, Clone, Serialize)]
pub struct ParamSpec {
    /// 字段名，和生成接口收的一致（`aspect_ratio` / `resolution` / `duration`）。
    pub name: &'static str,
    /// 界面上的标签。官方 `canvas.params.*`。
    pub label: &'static str,
    pub options: Vec<String>,
    /// 默认值。**`adaptive` 是官方 aspect_ratio 的默认** —— 让平台按
    /// 输入素材定，而不是硬塞一个比例。
    pub default: String,
}

fn spec(name: &'static str, label: &'static str, options: &[&str], default: &str) -> ParamSpec {
    ParamSpec {
        name,
        label,
        options: options.iter().map(|s| (*s).to_string()).collect(),
        default: default.to_string(),
    }
}

/// 比例。`adaptive` = 自适应，官方的默认值。
///
/// **两条链路的取值范围不一样**：图片是我们自己按短边算像素，什么比例都
/// 行；视频要过平台对模型的白名单校验，多给一个它不认的等于让用户踩坑。
const IMAGE_RATIOS: [&str; 8] = [
    "adaptive", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3",
];
/// 视频比例照 MiniMax H3 的白名单（平台报错信息里原样列出来的那一串）：
/// `21:9, 16:9, 4:3, 1:1, 3:4, 9:16`。
const VIDEO_RATIOS: [&str; 7] = ["adaptive", "16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];

/// 这个模态有哪些参数。没有就是空 —— 界面上那一区整个不显示。
pub fn for_modality(modality: &str) -> Vec<ParamSpec> {
    match modality {
        // 图生图的比例由输入图决定，只留分辨率。
        "image_edit" => vec![spec("resolution", "分辨率", &["1K", "2K"], "1K")],
        "image" => vec![
            spec("aspect_ratio", "比例", &IMAGE_RATIOS, "adaptive"),
            spec("resolution", "分辨率", &["1K", "2K"], "1K"),
        ],
        "video" | "video_ref" => vec![
            spec("aspect_ratio", "比例", &VIDEO_RATIOS, "adaptive"),
            // **不给 1K/2K。** 视频这边的档位是 P 制，给 1K 的话
            // `resolve_size` 认不出、落进 768 的兜底 —— 界面显示 1K
            // 而实际出 768P。
            spec("resolution", "分辨率", &["768P", "1080P"], "768P"),
            spec("duration", "时长", &["auto", "5", "10"], "auto"),
        ],
        // 音乐/语音没有画幅可言。**空表就是"这一区不显示"** ——
        // 摆一个永远不起作用的比例下拉比不摆更糟。
        _ => vec![],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 视频的分辨率档位**不能有 1K**。
    ///
    /// `resolve_size` 里视频只认 2K/1080P/768P/480P，`1K` 会落进
    /// `_ => 768` 的兜底 —— 用户选 1K，出来 768P，界面上却一直显示 1K,
    /// 不报错也没有任何地方说明。
    #[test]
    fn video_resolutions_are_all_understood_by_resolve_size() {
        for p in for_modality("video") {
            if p.name != "resolution" {
                continue;
            }
            for opt in &p.options {
                // 短边必须和档位名对得上：拿 1:1 算一次，短边就是档位。
                let size = crate::video::resolve_size("1:1", opt).unwrap();
                let (w, _) = size.split_once('x').unwrap();
                let short: u32 = w.parse().unwrap();
                let want: u32 = match opt.as_str() {
                    "2K" => 1440,
                    "1080P" => 1080,
                    "768P" => 768,
                    "480P" => 480,
                    other => panic!("视频档位 {other} 没有对应的短边，会落进兜底"),
                };
                assert!(
                    short.abs_diff(want) <= want / 10,
                    "{opt} 算出短边 {short}，期望 {want} 附近"
                );
            }
        }
    }

    /// 视频的比例必须都在平台白名单里。平台的报错原文列的就是这一串。
    #[test]
    fn video_ratios_are_all_on_the_platform_whitelist() {
        const WHITELIST: [&str; 6] = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];
        for p in for_modality("video") {
            if p.name != "aspect_ratio" {
                continue;
            }
            for opt in &p.options {
                assert!(
                    opt == "adaptive" || WHITELIST.contains(&opt.as_str()),
                    "{opt} 不在平台白名单里，用户选了会被拒"
                );
            }
        }
    }

    /// 默认值必须在选项里。不在的话界面打开就是个"选中了一个不存在的项"。
    #[test]
    fn every_default_is_one_of_its_options() {
        for m in [
            "image",
            "image_edit",
            "video",
            "video_ref",
            "music",
            "speech",
        ] {
            for p in for_modality(m) {
                assert!(
                    p.options.contains(&p.default),
                    "{m} 的 {} 默认值 {} 不在选项里",
                    p.name,
                    p.default
                );
            }
        }
    }

    /// 音频类没有画幅参数。**空表 = 这一区不显示** ——
    /// 摆一个永远不起作用的比例下拉比不摆更糟。
    #[test]
    fn audio_has_no_framing_params() {
        assert!(for_modality("music").is_empty());
        assert!(for_modality("speech").is_empty());
        assert!(for_modality("music_edit").is_empty());
    }
}
