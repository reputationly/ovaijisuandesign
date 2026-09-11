import { describe, expect, it } from "bun:test"

import type { AssetInfo as Asset } from "./api"
import {
  DEFAULT_LIST,
  bucketCounts,
  bucketOf,
  humanSize,
  listAssets,
  type Bucket,
} from "./projectAssets"

const a = (path: string, over: Partial<Asset> = {}): Asset =>
  ({
    id: path,
    path,
    name: path.split("/").pop()!,
    type: "image",
    file_size: 1000,
    time: "1000",
    ...over,
  }) as Asset

describe("归桶", () => {
  it("按扩展名分，pdf 是文档、rs 是代码", () => {
    // 资产索引的 `type` 只分四类，pdf 和 .rs 都会落进 text —— 而筛选器上
    // 「文档」和「代码」是两个选项，混在一起用户按"代码"筛不出脚本。
    expect(bucketOf({ path: "a/b.pdf", type: "text" })).toBe("document")
    expect(bucketOf({ path: "a/b.rs", type: "text" })).toBe("code")
    expect(bucketOf({ path: "a/b.zip", type: "text" })).toBe("archive")
  })

  it("扩展名不认识时退回索引里的 type", () => {
    expect(bucketOf({ path: "a/b.xyz", type: "video" })).toBe("video")
    expect(bucketOf({ path: "a/b", type: "text" })).toBe("other")
  })

  it("大写扩展名也认", () => {
    expect(bucketOf({ path: "A/B.PNG", type: "image" })).toBe("image")
  })
})

describe("文件大小", () => {
  it("小于 10 留一位小数，再大就取整", () => {
    expect(humanSize(1536)).toBe("1.5 KB")
    expect(humanSize(1024 * 1024 * 123.4)).toBe("123 MB")
  })
  it("零和负数不会出现 NaN", () => {
    expect(humanSize(0)).toBe("0 B")
    expect(humanSize(-1)).toBe("—")
    expect(humanSize(Number.NaN)).toBe("—")
  })
})

describe("筛选和排序", () => {
  const all = [
    a("images/猫-10.png", { file_size: 300, time: "300" }),
    a("images/猫-2.png", { file_size: 100, time: "100" }),
    a("videos/片子.mp4", { type: "video", file_size: 900, time: "200" }),
    a("docs/说明.pdf", { type: "text", file_size: 200, time: "400" }),
  ]

  it("默认按最近修改降序 —— 刚生成的在最上面", () => {
    expect(listAssets(all, DEFAULT_LIST).map((x) => x.name)).toEqual([
      "说明.pdf",
      "猫-10.png",
      "片子.mp4",
      "猫-2.png",
    ])
  })

  it("按名称排时 猫-2 在 猫-10 前面", () => {
    // 默认字典序会把 10 排到 2 前面，而用户是按数字理解的。
    const names = listAssets(all, { ...DEFAULT_LIST, sort: "name", dir: "asc" }).map((x) => x.name)
    expect(names.indexOf("猫-2.png")).toBeLessThan(names.indexOf("猫-10.png"))
  })

  it("搜索同时匹配文件名和路径", () => {
    expect(listAssets(all, { ...DEFAULT_LIST, search: "videos" }).map((x) => x.name)).toEqual([
      "片子.mp4",
    ])
    expect(listAssets(all, { ...DEFAULT_LIST, search: "说明" })).toHaveLength(1)
  })

  it("搜索不区分大小写", () => {
    expect(listAssets([a("A/B.PNG")], { ...DEFAULT_LIST, search: "b.png" })).toHaveLength(1)
  })

  it("按桶筛选", () => {
    const only = new Set<Bucket>(["video", "document"])
    expect(listAssets(all, { ...DEFAULT_LIST, buckets: only }).map((x) => x.name).sort()).toEqual([
      "片子.mp4",
      "说明.pdf",
    ])
  })

  it("空筛选集合 = 不筛，不是筛掉全部", () => {
    expect(listAssets(all, DEFAULT_LIST)).toHaveLength(4)
  })

  it("排序是稳定的：来回切方向，相等项顺序不变", () => {
    // 四个文件大小全一样。切一次升降序再切回来，顺序要和原来一致 ——
    // 不稳定的话用户看到的是"点两下排序，列表乱跳"。
    const same = [a("z.png"), a("a.png"), a("m.png")]
    const asc = listAssets(same, { ...DEFAULT_LIST, sort: "size", dir: "asc" })
    const desc = listAssets(same, { ...DEFAULT_LIST, sort: "size", dir: "desc" })
    expect(asc.map((x) => x.path)).toEqual(desc.map((x) => x.path))
    // 而且是按次级键 path 排的，不是原始顺序
    expect(asc.map((x) => x.path)).toEqual(["a.png", "m.png", "z.png"])
  })
})

describe("筛选菜单上的数量", () => {
  it("按'没有这一条筛选时'算 —— 否则选中一个桶后其它全变 0", () => {
    const all = [a("a.png"), a("b.mp4", { type: "video" }), a("c.mp4", { type: "video" })]
    const counts = bucketCounts(all, { ...DEFAULT_LIST, buckets: new Set<Bucket>(["image"]) })
    expect(counts.get("image")).toBe(1)
    // 关键：选中「图片」之后，「视频」仍然显示 2，用户才知道切过去有东西。
    expect(counts.get("video")).toBe(2)
  })

  it("但搜索词要算进去 —— 那是另一维的收窄", () => {
    const all = [a("cat.png"), a("dog.mp4", { type: "video" })]
    const counts = bucketCounts(all, { ...DEFAULT_LIST, search: "cat" })
    expect(counts.get("image")).toBe(1)
    expect(counts.get("video")).toBeUndefined()
  })
})
