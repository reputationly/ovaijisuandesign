import { describe, expect, it } from "bun:test"

import {
  MAX_TAGS_PER_NODE,
  TAG_PRESETS,
  filterByTag,
  nameTooLong,
  nameWidth,
  tagById,
  tagColor,
  toggleTag,
} from "./tags"

describe("画布标签", () => {
  it("七个预设，id 形如 color:xxx", () => {
    // 官方的 PRESET_COLOR_TAG_IDS。id 变了的话，之前打过的标签全部失效
    // 而且不报错 —— canvas.json 里存的就是这个字符串。
    expect(TAG_PRESETS).toHaveLength(7)
    for (const t of TAG_PRESETS) {
      expect(t.id.startsWith("color:")).toBe(true)
      expect(t.name.length).toBeGreaterThan(0)
      expect(tagById(t.id)).toEqual(t)
    }
    expect(TAG_PRESETS.map((t) => t.name)).toContain("人物")
    expect(TAG_PRESETS.map((t) => t.name)).toContain("最终版")
  })

  it("颜色走 CSS 变量而不是写死 hex", () => {
    // 深色主题下这些值是另一套。写死的话切主题标签颜色不跟着变。
    expect(tagColor("color:red")).toBe("var(--canvas-node-tag-red)")
    expect(tagColor("color:deep-purple")).toBe("var(--canvas-node-tag-deep-purple)")
    expect(tagColor("color:nope")).toBeUndefined()
  })

  it("变量名是写全的字面量，不是拼出来的", () => {
    // `var(--canvas-node-tag-${token})` 这种拼法 tokens.test.ts 验不了 ——
    // 它只看得到静态前缀，于是 token 里一个错字会产出一个没定义的变量，
    // 样式静默失效。这条就是防止有人"顺手"改回拼接。
    for (const t of TAG_PRESETS) {
      expect(t.color).toMatch(/^var\(--canvas-node-tag-[a-z-]+\)$/)
      expect(t.foreground).toMatch(/^var\(--canvas-node-tag-[a-z-]+-foreground\)$/)
      expect(t.color).not.toContain("$")
    }
  })

  it("名字按显示宽度算，中文占 2", () => {
    // 官方提示是「最多 6 个中文或 12 个英文字符」—— 同一个上限的两种说法。
    // 按 length 算的话能一直打到 12 个中文，标签会把节点顶宽。
    expect(nameWidth("人物")).toBe(4)
    expect(nameWidth("abcd")).toBe(4)
    expect(nameTooLong("最终版")).toBe(false)
    expect(nameTooLong("一二三四五六")).toBe(false) // 6 个中文 = 12
    expect(nameTooLong("一二三四五六七")).toBe(true) // 7 个 = 14
    expect(nameTooLong("abcdefghijkl")).toBe(false) // 12 个英文
    expect(nameTooLong("abcdefghijklm")).toBe(true)
  })

  it("再点同一个标签是取消", () => {
    expect(toggleTag(["color:red"], "color:red")).toEqual([])
  })

  it("超过上限时换掉旧的，不是拒绝", () => {
    // 官方 MAX_COLOR_TAGS_PER_ASSET = 1。用户点第二个颜色的意思显然是
    // "改成这个"，弹一句"已达上限"只会让人再点一次。
    expect(MAX_TAGS_PER_NODE).toBe(1)
    expect(toggleTag(["color:red"], "color:green")).toEqual(["color:green"])
  })

  it("按标签筛选", () => {
    const nodes = [
      { id: "a", tags: ["color:red"] },
      { id: "b", tags: ["color:green"] },
      { id: "c" },
    ]
    expect(filterByTag(nodes, "color:red").map((n) => n.id)).toEqual(["a"])
    // null = 不筛，要拿到全部（包括没有标签的）。
    expect(filterByTag(nodes, null)).toHaveLength(3)
  })
})
