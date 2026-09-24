import { describe, expect, it } from "vitest";

import { forModality } from "./params.js";
import { resolveSize } from "./video.js";

describe("params", () => {
  /**
   * 视频的分辨率档位**不能有 1K**。
   *
   * `resolveSize` 里视频只认 2K/1080P/768P/480P，`1K` 会落进
   * `_ => 768` 的兜底 —— 用户选 1K，出来 768P，界面上却一直显示 1K,
   * 不报错也没有任何地方说明。
   */
  it("video resolutions are all understood by resolve_size", () => {
    for (const p of forModality("video")) {
      if (p.name !== "resolution") continue;
      for (const opt of p.options) {
        // 短边必须和档位名对得上：拿 1:1 算一次，短边就是档位。
        const size = resolveSize("1:1", opt);
        expect(size).not.toBeNull();
        const short = Number.parseInt(size!.split("x")[0]!, 10);
        const wants: Record<string, number> = { "2K": 1440, "1080P": 1080, "768P": 768, "480P": 480 };
        const want = wants[opt];
        if (want === undefined) throw new Error(`视频档位 ${opt} 没有对应的短边，会落进兜底`);
        expect(
          Math.abs(short - want) <= Math.floor(want / 10),
          `${opt} 算出短边 ${short}，期望 ${want} 附近`,
        ).toBe(true);
      }
    }
  });

  /** 视频的比例必须都在平台白名单里。平台的报错原文列的就是这一串。 */
  it("video ratios are all on the platform whitelist", () => {
    const WHITELIST = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];
    for (const p of forModality("video")) {
      if (p.name !== "aspect_ratio") continue;
      for (const opt of p.options) {
        expect(opt === "adaptive" || WHITELIST.includes(opt), `${opt} 不在平台白名单里，用户选了会被拒`).toBe(
          true,
        );
      }
    }
  });

  /** 默认值必须在选项里。不在的话界面打开就是个"选中了一个不存在的项"。 */
  it("every default is one of its options", () => {
    for (const m of ["image", "image_edit", "video", "video_ref", "music", "speech"]) {
      for (const p of forModality(m)) {
        expect(p.options.includes(p.default), `${m} 的 ${p.name} 默认值 ${p.default} 不在选项里`).toBe(true);
      }
    }
  });

  /**
   * 音频类没有画幅参数。**空表 = 这一区不显示** ——
   * 摆一个永远不起作用的比例下拉比不摆更糟。
   */
  it("audio has no framing params", () => {
    expect(forModality("music")).toEqual([]);
    expect(forModality("speech")).toEqual([]);
    expect(forModality("music_edit")).toEqual([]);
  });
});
