import { describe, expect, it } from "bun:test"

import { ADD_NODE_ITEMS, addNodeItemsFor } from "./addNode"

describe("添加节点菜单", () => {
  it("不是从节点拉出来的，四条都给", () => {
    // 双击画布、点底部 + 都走这条。
    expect(addNodeItemsFor().map((i) => i.kind)).toEqual(["text", "image", "video", "audio"])
  })

  it("按源节点类型过滤，逐条对上官方的 ALLOWED_TARGET_TYPES", () => {
    // 这张表就是"参数能不能传下去"。列出一个不该有的目标，用户会连一条线，
    // 然后拿到一个和上游毫无关系的产物，而且不报错。
    const of = (k: string) => addNodeItemsFor(k).map((i) => i.kind)
    expect(of("text")).toEqual(["text", "image", "video", "audio"])
    expect(of("image")).toEqual(["text", "image", "video"])
    expect(of("video")).toEqual(["text", "video"])
    expect(of("audio")).toEqual(["text", "video", "audio"])
    expect(of("table")).toEqual([])
  })

  it("视频不能直接生图", () => {
    // 官方的 Video 允许列表里没有 Image。给了的话，用户从视频拉一条线到
    // "图片"，出来的是一张纯文生图 —— 和那段视频没有任何关系。
    expect(of_("video")).not.toContain("image")
    function of_(k: string) {
      return addNodeItemsFor(k).map((i) => i.kind)
    }
  })

  it("分组这类认不出的源，给空而不是给全部", () => {
    // "允许连到一个我们不理解的东西上"比"暂时连不了"糟得多。
    expect(addNodeItemsFor("group")).toEqual([])
    expect(addNodeItemsFor("sticker")).toEqual([])
  })

  it("每条都有文案和说明", () => {
    for (const i of ADD_NODE_ITEMS) {
      expect(i.label.length).toBeGreaterThan(0)
      expect(i.desc.length).toBeGreaterThan(0)
    }
  })
})
