import { describe, expect, it } from "bun:test"

import {
  ENHANCE_RESOLUTIONS,
  MAX_PIXELS,
  RESOLUTION_LONG_EDGE,
  computeTarget,
  isBelowSource,
  suggestResolution,
} from "./enhance"

describe("档位", () => {
  it("长边取值和官方一致", () => {
    // 官方 `RESOLUTION_LONG_EDGE`。抄错一个数，界面上的档位名和实际
    // 出图尺寸就对不上了，而且不报错。
    expect(RESOLUTION_LONG_EDGE["1k"]).toBe(1024)
    expect(RESOLUTION_LONG_EDGE["2k"]).toBe(2048)
    expect(RESOLUTION_LONG_EDGE["4k"]).toBe(3840)
  })

  it("没有 8K", () => {
    // 平台按总像素封顶在 4K，8K 永远兑现不了 —— 摆一个选了没用的档位
    // 比不摆更糟。
    expect(ENHANCE_RESOLUTIONS).not.toContain("8k")
  })
})

describe("低于原图的档位要禁掉", () => {
  it("原图长边已经到档位时禁用", () => {
    expect(isBelowSource("1k", 2048, 1024)).toBe(true)
    expect(isBelowSource("2k", 2048, 1024)).toBe(true) // 等于也算
    expect(isBelowSource("4k", 2048, 1024)).toBe(false)
  })

  it("尺寸未知时一个都不禁", () => {
    // 禁掉的话用户面对一排灰按钮，而真实原因只是"还没量出尺寸"。
    expect(isBelowSource("1k", undefined, undefined)).toBe(false)
    expect(isBelowSource("1k", 0, 0)).toBe(false)
  })
})

describe("目标尺寸", () => {
  it("按长边缩放，比例不变", () => {
    const t = computeTarget("2k", 416, 232)!
    expect(t.targetWidth).toBe(2048)
    // 232/416 * 2048 = 1142.15 → 1142
    expect(t.targetHeight).toBe(1142)
  })

  it("方图选 4K 时按像素预算收，不是按长边", () => {
    // **这是和官方唯一有分歧的地方。** 官方算出 3840×3840,
    // 而我们平台会把它静默截断成 2880×2880 —— 界面显示一个数、
    // 出来另一个数，没有任何地方说明。
    const t = computeTarget("4k", 464, 464)!
    expect(t.targetWidth).toBe(2880)
    expect(t.targetHeight).toBe(2880)
  })

  it("任何输入算出来都不超预算", () => {
    for (const [w, h] of [
      [464, 464],
      [416, 232],
      [800, 600],
      [300, 1200],
      [1000, 1000],
    ]) {
      for (const r of ENHANCE_RESOLUTIONS) {
        const t = computeTarget(r, w, h)
        if (!t) continue
        expect(t.targetWidth * t.targetHeight).toBeLessThanOrEqual(MAX_PIXELS * 1.01)
      }
    }
  })

  it("尺寸未知时算不出目标", () => {
    expect(computeTarget("2k", undefined, undefined)).toBeUndefined()
    expect(computeTarget("2k", 0, 100)).toBeUndefined()
  })
})

describe("默认档位", () => {
  it("取第一个比原图大的档位", () => {
    expect(suggestResolution(512, 512)).toBe("1k")
    expect(suggestResolution(1024, 768)).toBe("2k")
    expect(suggestResolution(2048, 1536)).toBe("4k")
  })

  it("默认档位永远不是禁用的那一档", () => {
    // 落在禁用档上的话，面板一打开「生成」就是灰的 ——
    // 用户以为功能坏了。只有原图已经超过最高档时无解，那时整个
    // 面板都该是禁用态。
    for (const [w, h] of [
      [100, 100],
      [512, 512],
      [1024, 768],
      [2048, 1536],
      [3000, 2000],
    ]) {
      const pick = suggestResolution(w, h)
      if (RESOLUTION_LONG_EDGE["4k"] <= Math.max(w, h)) continue
      expect(isBelowSource(pick, w, h)).toBe(false)
    }
  })

  it("原图已经超过最高档时取最高档", () => {
    expect(suggestResolution(8000, 6000)).toBe("4k")
  })
})
