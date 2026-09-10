import { describe, expect, it } from "bun:test"

import { GRID_PRESETS, cellFileName, gridCells } from "./splitGrid"

describe("宫格切分", () => {
  it("2x2 切出四格，行优先编号", () => {
    const cs = gridCells(100, 100, 2, 2)
    expect(cs).toHaveLength(4)
    expect(cs.map((c) => c.index)).toEqual([0, 1, 2, 3])
    expect(cs[0]).toMatchObject({ row: 0, col: 0, x: 0, y: 0, width: 50, height: 50 })
    expect(cs[3]).toMatchObject({ row: 1, col: 1, x: 50, y: 50, width: 50, height: 50 })
  })

  it("除不尽时不丢像素", () => {
    // 每格都向下取整的话，1001 切 3 列得到 333*3 = 999，右边缘 2px 被丢掉 ——
    // 拼回去比原图窄，丢的正是画面边缘。
    const cs = gridCells(1001, 1000, 1, 3)
    expect(cs.reduce((s, c) => s + c.width, 0)).toBe(1001)
    // 相邻两格首尾相接：既不重叠也不留缝。
    expect(cs[0]!.x + cs[0]!.width).toBe(cs[1]!.x)
    expect(cs[1]!.x + cs[1]!.width).toBe(cs[2]!.x)
    expect(cs[2]!.x + cs[2]!.width).toBe(1001)
  })

  it("高度方向同理", () => {
    const cs = gridCells(100, 1001, 3, 1)
    expect(cs.reduce((s, c) => s + c.height, 0)).toBe(1001)
  })

  it("非法尺寸返回空，不抛", () => {
    // 图片元数据坏掉时 width 可能是 0。抛出去会让整个右键菜单炸掉。
    expect(gridCells(0, 100, 2, 2)).toEqual([])
    expect(gridCells(100, 100, 0, 2)).toEqual([])
    expect(gridCells(-1, 100, 2, 2)).toEqual([])
  })

  it("预设都是 rows*cols = n", () => {
    for (const p of GRID_PRESETS) {
      expect(p.rows * p.cols).toBe(p.n)
      expect(gridCells(90, 90, p.rows, p.cols)).toHaveLength(p.n)
    }
  })

  it("文件名带行列而不是只带序号", () => {
    // 用户是按位置认的，「第 5 格」在 2x3 和 3x3 下不是同一个位置。
    const cs = gridCells(90, 90, 3, 3)
    expect(cellFileName("shot.png", cs[4]!)).toBe("shot-r2c2.png")
    expect(cellFileName(undefined, cs[0]!)).toBe("image-r1c1.png")
    expect(cellFileName("a.jpg", cs[0]!)).not.toContain(".jpg")
  })
})
