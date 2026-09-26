// 每个模态**真正支持**的生成参数。
//
// ## 为什么参数必须由后端给
//
// 界面以前把选项写死在输入框里：`RATIOS` 七个比例、`RESOLUTIONS` 就
// `["1K","2K"]`,不管当前要生成什么、用什么模型。后果是一串"不报错的错"：
//
// - **视频没有 1K 这个档位。** 用户选 1K，`resolveSize` 里落进
//   `_ => 768` 的兜底 —— 出来的是 768P，而界面上一直显示着 1K。
// - **首帧驱动的视频本来就不该选比例**（比例由那张图定），强塞一个的
//   结果是平台把 size 反推成 `32:57` 然后拒掉整个任务。
// - **时长对图片毫无意义**,却一直摆在那儿。
//
// 更合理的做法是把 `params` 挂在**模型**上：
//
// ```js
// MiniMax-H3-Max.params = {
//   aspect_ratio: { options: ["adaptive","16:9",…], default: "adaptive" },
//   resolution:   { options: ["768P","480P"] },
//   duration:     { … },
// }
// hiddenParamsByImageMode: { "first-last-frame": ["aspect_ratio"] }
// ```
//
// 我们照这个思路，但粒度先做到**模态**：我们每个模态只配一个模型
// （见 settings 的 `models.*`），模型换了这里的表也该跟着换 ——
// 那一步等平台能自报参数时再接，现在先把"图片和视频用同一套选项"
// 这个错消掉。

/** 一个可选参数。会原样序列化给界面，所以键名是蛇形 / 单词。 */
export interface ParamSpec {
  /** 字段名，和生成接口收的一致（`aspect_ratio` / `resolution` / `duration`）。 */
  name: string;
  /** 界面上的标签（`canvas.params.*` 那一组文案）。 */
  label: string;
  options: string[];
  /**
   * 默认值。**aspect_ratio 默认 `adaptive`** —— 让平台按
   * 输入素材定，而不是硬塞一个比例。
   */
  default: string;
}

function spec(name: string, label: string, options: readonly string[], dflt: string): ParamSpec {
  return { name, label, options: [...options], default: dflt };
}

/**
 * 比例。`adaptive` = 自适应，也是默认值。
 *
 * **两条链路的取值范围不一样**：图片是我们自己按短边算像素，什么比例都
 * 行；视频要过平台对模型的白名单校验，多给一个它不认的等于让用户踩坑。
 */
const IMAGE_RATIOS = ["adaptive", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"] as const;
/**
 * 视频比例照 MiniMax H3 的白名单（平台报错信息里原样列出来的那一串）：
 * `21:9, 16:9, 4:3, 1:1, 3:4, 9:16`。
 */
const VIDEO_RATIOS = ["adaptive", "16:9", "9:16", "1:1", "4:3", "3:4", "21:9"] as const;

/**
 * 平台的视频聚合模型（`minimax-h3-2k` / `minimax-h3-ref-2k`）：改写提示词 → 768P 生成 → 超分到 2K。
 * 成片档位由平台定死，分辨率只有 2K 一个选项；时长、有声视频照平台模型目录开放。
 */
export function isAggregateVideoModel(model: string | null | undefined): boolean {
  return /-2k$/i.test((model ?? "").trim());
}

const AGGREGATE_VIDEO_DURATIONS = ["4", "5", "6", "7", "8", "9", "10"] as const;

/** 这个模态有哪些参数。没有就是空 —— 界面上那一区整个不显示。`model` 用来区分聚合模型。 */
export function forModality(modality: string, model?: string | null): ParamSpec[] {
  switch (modality) {
    // 图生图的比例由输入图决定，只留分辨率。
    case "image_edit":
      return [spec("resolution", "分辨率", ["1K", "2K"], "1K")];
    case "image":
      return [
        spec("aspect_ratio", "比例", IMAGE_RATIOS, "adaptive"),
        spec("resolution", "分辨率", ["1K", "2K"], "1K"),
      ];
    case "video":
    case "video_ref":
      if (isAggregateVideoModel(model)) {
        return [
          spec("aspect_ratio", "比例", VIDEO_RATIOS, "adaptive"),
          // 选什么都出 2K（超分段的目标由平台配置），摆 768P / 1080P 就是骗用户。
          spec("resolution", "分辨率", ["2K"], "2K"),
          spec("duration", "时长", AGGREGATE_VIDEO_DURATIONS, "5"),
          spec("generate_audio", "有声视频", ["true", "false"], "true"),
        ];
      }
      return [
        spec("aspect_ratio", "比例", VIDEO_RATIOS, "adaptive"),
        // **不给 1K/2K。** 视频这边的档位是 P 制，给 1K 的话
        // `resolveSize` 认不出、落进 768 的兜底 —— 界面显示 1K
        // 而实际出 768P。
        spec("resolution", "分辨率", ["768P", "1080P"], "768P"),
        spec("duration", "时长", ["auto", "5", "10"], "auto"),
      ];
    // 音乐/语音没有画幅可言。**空表就是"这一区不显示"** ——
    // 摆一个永远不起作用的比例下拉比不摆更糟。
    default:
      return [];
  }
}
