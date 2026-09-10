import { describe, expect, it } from "bun:test"

import { isCopyShortcut, normalizeWheelDeltaY, wheelZoomScale } from "./Lightbox"

describe("灯箱缩放", () => {
  it("滚轮是指数的，不是线性的", () => {
    // 线性的话放大到 8 倍时再滚一格会直接顶到天花板，而缩小永远到不了底。
    // 指数的特征：同样的 delta，在任何起点上产生的是同一个**比值**。
    const a = wheelZoomScale(1, -50)
    const b = wheelZoomScale(2, -50)
    expect(b / 2).toBeCloseTo(a / 1, 6)
  })

  it("向上滚是放大，向下滚是缩小", () => {
    expect(wheelZoomScale(1, -50)).toBeGreaterThan(1)
    expect(wheelZoomScale(1, 50)).toBeLessThan(1)
  })

  it("卡在 0.5 到 10 之间", () => {
    expect(wheelZoomScale(9.9, -100000)).toBe(10)
    expect(wheelZoomScale(0.6, 100000)).toBe(0.5)
  })

  it("单次增量截断到 120px", () => {
    // 触控板惯性滚动一帧能报几百像素，不截的话一次轻扫就从 1 冲到 10。
    expect(wheelZoomScale(1, -500)).toBe(wheelZoomScale(1, -120))
    expect(wheelZoomScale(1, -5000)).toBe(wheelZoomScale(1, -120))
    // 截断值以内要照常按比例走。
    expect(wheelZoomScale(1, -60)).toBeLessThan(wheelZoomScale(1, -120))
  })

  it("行模式和页模式要换算成像素", () => {
    // 不换算的话，报行数的鼠标驱动一格只动 0.000006 倍 ——
    // 表现是"滚轮在这个浏览器里没用"。
    expect(normalizeWheelDeltaY(3, 0)).toBe(3)
    expect(normalizeWheelDeltaY(3, 1)).toBe(48)
    expect(normalizeWheelDeltaY(1, 2)).toBe(800)
    // 3 行 = 48px，和直接给 48px 等价。
    expect(wheelZoomScale(1, 3, 1)).toBe(wheelZoomScale(1, 48, 0))
  })

  it("非法的当前缩放回 1 而不是 NaN", () => {
    // NaN 一旦进了 transform，图会整个消失，而且没有任何报错。
    expect(wheelZoomScale(Number.NaN, -50)).toBe(1)
    expect(wheelZoomScale(0, -50)).toBe(1)
  })
})

describe("复制快捷键", () => {
  const ev = (o: Partial<Parameters<typeof isCopyShortcut>[0]>) =>
    ({ metaKey: false, ctrlKey: false, altKey: false, code: "KeyC", ...o }) as Parameters<
      typeof isCopyShortcut
    >[0]

  it("Cmd/Ctrl+C 认，带 Alt 的不认", () => {
    expect(isCopyShortcut(ev({ metaKey: true }))).toBe(true)
    expect(isCopyShortcut(ev({ ctrlKey: true }))).toBe(true)
    expect(isCopyShortcut(ev({ metaKey: true, altKey: true }))).toBe(false)
    expect(isCopyShortcut(ev({}))).toBe(false)
    expect(isCopyShortcut(ev({ metaKey: true, code: "KeyV" }))).toBe(false)
  })
})
