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
/**
 * 比例档位：**图片和视频共用同一组 11 个**（产品定，2026-11-06）。
 *
 * 以前两边各写一套（图片 8 个、视频 7 个），同一个界面里图片少了 21:9，
 * 视频少了 3:2/2:3/5:4/4:5，用户切模型时选项会跳变。现在统一。
 * 顺序按"常用在前"：自适应 → 方形 → 横 → 竖 → 宽银幕 → 人物/竖版。
 */
const RATIOS = ["adaptive", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9", "5:4", "4:5"] as const;
const IMAGE_RATIOS = RATIOS;
const VIDEO_RATIOS = RATIOS;

/**
 * 平台的视频聚合模型（`minimax-h3-2k` / `minimax-h3-ref-2k`）。
 * 菜单跟 H3 同一套：生成方式、768P/2K、4–15 秒。聚合链路内部仍可能先出较低分辨率再超分，
 * 但选项不能因此收成只有 2K、时长只到 10 秒。
 */
export function isAggregateVideoModel(model: string | null | undefined): boolean {
  return /-2k$/i.test((model ?? "").trim());
}

const H3_DURATIONS = ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"] as const;

/** 这个模态有哪些参数。没有就是空 —— 界面上那一区整个不显示。`model` 用来区分聚合模型。 */
export function forModality(modality: string, model?: string | null): ParamSpec[] {
  switch (modality) {
    // 图生图的比例由输入图决定，只留分辨率。
    case "image_edit":
      return [spec("resolution", "分辨率", ["1K", "2K"], "1K")];
    case "image":
      // 只暴露**平台契约里确实作用得到**的两项：比例与清晰度都由我们自己换算成 `size`。
      // 画质 / 背景**不在界面出现**：平台 48 个能力的目录里从来没有声明过这两个字段
      // （图片能力的 paramSchema / controls 都是 null），发出去不报错但也无法证明生效，
      // 属于"能选但没效果"的静默无效 —— 产品决定先不摆出来。
      // 透传能力保留在 `image.ts` 的 `EXTRA_IMAGE_FIELDS`：平台哪天声明了，这里加一行就回来。
      return [
        spec("aspect_ratio", "比例", IMAGE_RATIOS, "adaptive"),
        // 默认 2K（产品定）：图片默认出 2K，短边 1440。1K 仍可手选，用于省额度的场景。
        spec("resolution", "清晰度", ["1K", "2K"], "2K"),
      ];
    case "video":
    case "video_ref":
      if (isAggregateVideoModel(model)) {
        return [
          spec("image_mode", "生成方式", ["reference", "first-last-frame"], "reference"),
          spec("aspect_ratio", "比例", VIDEO_RATIOS, "adaptive"),
          spec("resolution", "分辨率", ["768P", "2K"], "2K"),
          spec("duration", "时长", H3_DURATIONS, "5"),
          spec("generate_audio", "有声视频", ["true", "false"], "true"),
        ];
      }
      return [
        spec("aspect_ratio", "比例", VIDEO_RATIOS, "adaptive"),
        // **只有 768P 和 2K 两档。**
        //  - 1080P 平台已经不支持了（聚合流水线里没有这个档位），给出来点了会 4xx；
        //  - 2K 走的是**聚合增强**模型：生成段仍是 768P，再由 relayvsr 超分到 2K，
        //    所以成本与耗时都比 768P 高，默认给 768P。
        //  - 1K / 480P 也一律不给：视频是 P 制档位，`resolveSize` 认不出就落 768 兜底，
        //    界面显示 1K 实际出 768P，属于"不报错的错"。
        spec("resolution", "分辨率", ["768P", "2K"], "768P"),
        spec("duration", "时长", ["auto", "5", "10"], "auto"),
      ];
    // 音乐/语音没有画幅可言。**空表就是"这一区不显示"** ——
    // 摆一个永远不起作用的比例下拉比不摆更糟。
    default:
      return [];
  }
}
