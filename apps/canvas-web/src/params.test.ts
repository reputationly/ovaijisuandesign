import { describe, expect, it } from "bun:test"

import {
  defaultValues,
  groupParams,
  mergeValues,
  optionLabel,
  perModality,
  toPayload,
  type Capability,
} from "./params"

const caps: Capability[] = [
  {
    modality: "image",
    available: true,
    model: "qwen-image",
    params: [
      { name: "aspect_ratio", label: "比例", options: ["adaptive", "1:1", "16:9"], default: "adaptive" },
      { name: "resolution", label: "分辨率", options: ["1K", "2K"], default: "1K" },
    ],
  },
  { modality: "image_edit", available: true, model: "qwen-image-edit", params: [] },
  {
    modality: "video",
    available: true,
    model: "minimax-h3-fl2va",
    params: [
      { name: "aspect_ratio", label: "比例", options: ["adaptive", "16:9", "9:16"], default: "adaptive" },
      { name: "resolution", label: "分辨率", options: ["768P", "1080P"], default: "768P" },
      { name: "duration", label: "时长", options: ["auto", "5", "10"], default: "auto" },
    ],
  },
  { modality: "music", available: true, model: "minimax-music3", params: [] },
  { modality: "speech", available: false, model: null, params: [] },
]

describe("分区", () => {
  it("只留有参数可调的模态", () => {
    // 音乐/语音没有画幅可言 —— 摆一个永远不起作用的比例下拉比不摆更糟。
    expect(groupParams(caps).map((g) => g.modality)).toEqual(["image", "video"])
  })

  it("没配模型的模态不出现", () => {
    const only = groupParams([
      { modality: "video", available: false, model: null, params: [{ name: "x", label: "x", options: ["a"], default: "a" }] },
    ])
    expect(only).toEqual([])
  })

  it("视频的分辨率档位里没有 1K", () => {
    // 后端 `resolve_size` 认不出 1K，会落进 768 的兜底 —— 界面显示 1K
    // 而实际出 768P。这一条在后端也有对应的测试钉着。
    const v = groupParams(caps).find((g) => g.modality === "video")!
    const res = v.specs.find((s) => s.name === "resolution")!
    expect(res.options).not.toContain("1K")
  })
})

describe("取值", () => {
  it("按默认值初始化", () => {
    expect(defaultValues(groupParams(caps))).toEqual({
      image: { aspect_ratio: "adaptive", resolution: "1K" },
      video: { aspect_ratio: "adaptive", resolution: "768P", duration: "auto" },
    })
  })

  it("重拉能力清单时保留用户改过的值", () => {
    // 能力清单会重拉（比如改了设置里的模型）。直接用默认值覆盖的话，
    // 用户刚选好的比例会被悄悄改回去。
    const groups = groupParams(caps)
    const merged = mergeValues(groups, { image: { aspect_ratio: "16:9" } })
    expect(merged.image!.aspect_ratio).toBe("16:9")
    // 没给的补默认
    expect(merged.image!.resolution).toBe("1K")
  })

  it("旧值已经不是合法选项时退回默认", () => {
    // 换了模型之后 `1K` 可能不在视频的表里了。留着的话提交下去又是一次
    // "选了 1K 实际出 768"。
    const merged = mergeValues(groupParams(caps), { video: { resolution: "1K" } })
    expect(merged.video!.resolution).toBe("768P")
  })
})

describe("提交", () => {
  it("adaptive / auto 不传，具体的默认值要传", () => {
    // **这两者是不同的东西。**
    //
    // `adaptive` / `auto` 的语义是"让平台按输入素材定" —— 传下去的话后端
    // 会当成用户明确要求，反而覆盖掉那个判断。首帧驱动的视频就是这么被
    // 塞进一个比例、最后被平台以 32:57 拒掉的。
    //
    // 而 `768P` 是个具体档位（官方 H3 的 resolution 默认就是它，没有
    // auto 这一档）——用户没改也是他看到并接受的值，照传。
    expect(toPayload(defaultValues(groupParams(caps)))).toEqual({ resolution: "768P" })
  })

  it("选了具体值才传", () => {
    expect(
      toPayload({ video: { aspect_ratio: "9:16", resolution: "1080P", duration: "10" } }),
    ).toEqual({ aspectRatio: "9:16", resolution: "1080P", duration: 10 })
  })

  it("时长是数字不是字符串", () => {
    expect(toPayload({ video: { duration: "5" } }).duration).toBe(5)
  })

  it("按模态分开的那份只留用户明确选过的", () => {
    expect(
      perModality({
        image: { aspect_ratio: "1:1", resolution: "1K" },
        video: { aspect_ratio: "adaptive", resolution: "768P", duration: "auto" },
      }),
    ).toEqual({
      image: { aspect_ratio: "1:1", resolution: "1K" },
      video: { resolution: "768P" },
    })
  })

  it("一个模态全是自适应时整个不出现", () => {
    expect(perModality({ video: { aspect_ratio: "adaptive", duration: "auto" } })).toEqual({})
  })
})

describe("文案", () => {
  it("adaptive / auto 不直接给人看", () => {
    expect(optionLabel("aspect_ratio", "adaptive")).toBe("自适应")
    expect(optionLabel("duration", "auto")).toBe("自动")
  })
  it("时长带单位", () => {
    expect(optionLabel("duration", "5")).toBe("5s")
  })
  it("别的原样显示", () => {
    expect(optionLabel("resolution", "768P")).toBe("768P")
    expect(optionLabel("aspect_ratio", "16:9")).toBe("16:9")
  })
})
