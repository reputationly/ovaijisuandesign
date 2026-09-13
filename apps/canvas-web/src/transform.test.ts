import { describe, expect, it } from "bun:test"

import {
  CROP_RATIOS,
  NO_ORIENTATION,
  clampCrop,
  cropForRatio,
  normalizeDegrees,
  rotateBy,
  rotatedSize,
  transformedName,
} from "./transform"

describe("旋转角度", () => {
  it("连点四次 90° 回到 0，不是 360", () => {
    // 不规整的话界面上会显示「360°」——数学上对，但没人这么说。
    let o = NO_ORIENTATION
    for (let i = 0; i < 4; i++) o = rotateBy(o, 90)
    expect(o.degrees).toBe(0)
  })

  it("往回转不会出现负角度", () => {
    expect(rotateBy(NO_ORIENTATION, -90).degrees).toBe(270)
    expect(normalizeDegrees(-450)).toBe(270)
  })

  it("翻转状态不受旋转影响", () => {
    const o = rotateBy({ degrees: 0, flipH: true, flipV: false }, 90)
    expect(o.flipH).toBe(true)
    expect(o.flipV).toBe(false)
  })
})

describe("旋转后的画布尺寸", () => {
  it("90° 的倍数是交换宽高", () => {
    expect(rotatedSize(400, 300, 90)).toEqual({ width: 300, height: 400 })
    expect(rotatedSize(400, 300, 270)).toEqual({ width: 300, height: 400 })
    expect(rotatedSize(400, 300, 180)).toEqual({ width: 400, height: 300 })
    expect(rotatedSize(400, 300, 0)).toEqual({ width: 400, height: 300 })
  })

  it("任意角度要按外接矩形算，不是交换宽高", () => {
    // **这是最容易写错的一处。** 简单交换宽高只对 90 的倍数成立；
    // 斜着转 45° 时画布必须变大，否则四个角会被切掉，而且不报错。
    const r = rotatedSize(400, 300, 45)
    const expected = Math.round((400 + 300) * Math.SQRT1_2)
    expect(r.width).toBe(expected)
    expect(r.height).toBe(expected)
    // 一定比原图两条边都大 —— 这就是"不会切角"的意思。
    expect(r.width).toBeGreaterThan(400)
    expect(r.height).toBeGreaterThan(300)
  })

  it("正方形转 45° 是等腰直角外接正方形", () => {
    const r = rotatedSize(100, 100, 45)
    expect(r.width).toBe(141)
    expect(r.height).toBe(141)
  })
})

describe("裁剪框", () => {
  it("夹回图片范围内", () => {
    expect(clampCrop({ x: -50, y: -50, width: 100, height: 100 }, 400, 300)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    })
  })

  it("比图还大的框不会被推到负坐标上", () => {
    // **先夹尺寸再夹位置。** 反过来的话 x 会算成 400-500 = -100。
    const r = clampCrop({ x: 0, y: 0, width: 500, height: 400 }, 400, 300)
    expect(r).toEqual({ x: 0, y: 0, width: 400, height: 300 })
    expect(r.x).toBeGreaterThanOrEqual(0)
  })

  it("超出右下边界时往回推，而不是裁小", () => {
    const r = clampCrop({ x: 350, y: 250, width: 100, height: 100 }, 400, 300)
    expect(r).toEqual({ x: 300, y: 200, width: 100, height: 100 })
  })

  it("零尺寸会被拉到至少 1，不会算出空画布", () => {
    const r = clampCrop({ x: 0, y: 0, width: 0, height: 0 }, 400, 300)
    expect(r.width).toBe(1)
    expect(r.height).toBe(1)
  })
})

describe("按比例取最大框", () => {
  it("宽图取 1:1 时按高算，居中", () => {
    expect(cropForRatio(400, 300, 1)).toEqual({ x: 50, y: 0, width: 300, height: 300 })
  })

  it("方图取 16:9 时按宽算，居中", () => {
    const r = cropForRatio(400, 400, 16 / 9)
    expect(r.width).toBe(400)
    expect(r.height).toBe(225)
    expect(r.y).toBe(88) // (400-225)/2 = 87.5 → 88
  })

  it("自由裁剪 = 整张", () => {
    expect(cropForRatio(400, 300, null)).toEqual({ x: 0, y: 0, width: 400, height: 300 })
  })

  it("算出来的框一定在图内", () => {
    for (const { ratio } of CROP_RATIOS) {
      for (const [w, h] of [
        [400, 300],
        [300, 400],
        [1000, 100],
      ]) {
        const r = cropForRatio(w, h, ratio)
        expect(r.x).toBeGreaterThanOrEqual(0)
        expect(r.y).toBeGreaterThanOrEqual(0)
        expect(r.x + r.width).toBeLessThanOrEqual(w)
        expect(r.y + r.height).toBeLessThanOrEqual(h)
      }
    }
  })
})

describe("文件名", () => {
  it("带上做了什么，而不是加序号", () => {
    // 用户在资产列表里一眼能看出这张是怎么来的。
    expect(
      transformedName("猫.png", { x: 0, y: 0, width: 100, height: 100 }, { degrees: 90, flipH: false, flipV: false }, 200, 200),
    ).toBe("猫-crop-rot90.png")
  })

  it("只翻转时也说清楚", () => {
    expect(
      transformedName("猫.png", { x: 0, y: 0, width: 200, height: 200 }, { degrees: 0, flipH: true, flipV: false }, 200, 200),
    ).toBe("猫-fliph.png")
  })

  it("什么都没改时有个兜底后缀 —— 不能和原文件同名", () => {
    // 同名的话资产索引里会避让成 `-2`,而用户看到两个一模一样的名字。
    expect(
      transformedName("猫.png", { x: 0, y: 0, width: 200, height: 200 }, NO_ORIENTATION, 200, 200),
    ).toBe("猫-edit.png")
  })

  it("没有源文件名时不崩", () => {
    expect(transformedName(undefined, { x: 0, y: 0, width: 1, height: 1 }, NO_ORIENTATION, 1, 1)).toBe(
      "image-edit.png",
    )
  })
})
