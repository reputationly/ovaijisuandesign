import { describe, expect, it } from "vitest"

import {
  dedupeProjectName,
  filterVisibleProjects,
  hasProjectNameConflict,
  hideProjectId,
  normalizeProjectEntries,
  restoreProjectId,
  sortProjects,
  truncateProjectName,
} from "./projects"

const raw = (id: string, name: string, extra: Record<string, unknown> = {}) => ({ id, name, workspacePaths: [], ...extra })

describe("项目记录规整", () => {
  it("缺 id / 名字的丢掉；名字里的连续空白合并；有 remoteId 的旧数据算团队项目", () => {
    const out = normalizeProjectEntries([raw("a", "  甲   项目 "), raw("", "x"), raw("b", ""), null, "x", raw("c", "丙", { remoteId: "r1" })])
    expect(out.map((p) => [p.id, p.name, p.kind])).toEqual([
      ["a", "甲 项目", "local"],
      ["c", "丙", "team"],
    ])
    expect(normalizeProjectEntries("oops")).toEqual([])
  })

  it("updatedAt 缺省取 createdAt", () => {
    expect(normalizeProjectEntries([raw("a", "甲", { createdAt: 5 })])[0]).toMatchObject({ createdAt: 5, updatedAt: 5 })
  })
})

describe("解散 = 隐藏", () => {
  it("隐藏 / 恢复只改 id 列表，去重去空", () => {
    expect(hideProjectId(["a", " ", "a"], "b")).toEqual(["a", "b"])
    expect(restoreProjectId(["a", "b"], "a")).toEqual(["b"])
    expect(filterVisibleProjects([raw("a", "甲"), raw("b", "乙")], ["a"]).map((p) => p.id)).toEqual(["b"])
  })
})

describe("项目名", () => {
  it("重名自动加序号（不区分大小写）", () => {
    const projects = normalizeProjectEntries([raw("1", "Demo"), raw("2", "demo-2")])
    expect(dedupeProjectName(projects, "demo")).toBe("demo-3")
    expect(dedupeProjectName(projects, "新的")).toBe("新的")
  })

  it("改名冲突不算自己", () => {
    const projects = [raw("1", "甲"), raw("2", "乙")]
    expect(hasProjectNameConflict(projects, "2", "甲")).toBe(true)
    expect(hasProjectNameConflict(projects, "1", "甲")).toBe(false)
  })

  it("按字符截断，不切坏表情", () => {
    expect(truncateProjectName(`${"字".repeat(49)}😀😀`)).toBe(`${"字".repeat(49)}😀`)
    expect(truncateProjectName("  ")).toBe("")
  })
})

describe("排序", () => {
  const projects = [raw("a", "项目10", { createdAt: 1, updatedAt: 9 }), raw("b", "项目9", { createdAt: 3, updatedAt: 2 })]
  it("最近更新 / 创建时间 / 名称（数字按数值）", () => {
    expect(sortProjects(projects, "updated").map((p) => p.id)).toEqual(["a", "b"])
    expect(sortProjects(projects, "created").map((p) => p.id)).toEqual(["b", "a"])
    expect(sortProjects(projects, "name").map((p) => p.id)).toEqual(["b", "a"])
  })
})
