import { describe, expect, it } from "vitest"

import { DEFAULT_CONFIG, readConfig, STORAGE_KEY } from "./global-config"
import { clampChatWidth, CHAT_WIDTH } from "./ui"
import { basename, groupByProject, sortWorkspaces } from "./workspaces"

const store = (v: string | null) => ({ getItem: (k: string) => (k === STORAGE_KEY ? v : null) })

describe("全局偏好", () => {
  it("没存过或存坏了都回默认", () => {
    expect(readConfig(store(null))).toEqual(DEFAULT_CONFIG)
    expect(readConfig(store("{oops"))).toEqual(DEFAULT_CONFIG)
  })

  it("存过的字段覆盖默认，其余保持默认", () => {
    const c = readConfig(store(JSON.stringify({ language: "en", theme: "dark" })))
    expect(c.language).toBe("en")
    expect(c.theme).toBe("dark")
    expect(c.globalSidebarWidth).toBe(DEFAULT_CONFIG.globalSidebarWidth)
  })
})

describe("工作区列表", () => {
  const list = [
    { id: "a", name: "甲", updatedAt: 1, projectId: "p1" },
    { id: "b", name: "乙", updatedAt: 3 },
    { id: "c", name: "丙", updatedAt: 2, projectId: "gone" },
  ]

  it("按最近更新倒序", () => {
    expect(sortWorkspaces(list).map((w) => w.id)).toEqual(["b", "c", "a"])
  })

  it("按项目分组；项目不存在的归入未分组", () => {
    const groups = groupByProject(list, [{ id: "p1", name: "项目一", createdAt: 0 }])
    expect(groups.map((g) => g.project?.id ?? null)).toEqual(["p1", null])
    expect(groups[1]!.items.map((w) => w.id)).toEqual(["b", "c"])
  })

  it("目录名取最后一段，兼容 Windows 分隔符", () => {
    expect(basename("/Users/x/Projects/片子/")).toBe("片子")
    expect(basename("C:\\work\\demo")).toBe("demo")
  })
})

describe("对话栏宽度", () => {
  it("限制在上下限之间并取整", () => {
    expect(clampChatWidth(10)).toBe(CHAT_WIDTH.min)
    expect(clampChatWidth(9999)).toBe(CHAT_WIDTH.max)
    expect(clampChatWidth(400.6)).toBe(401)
  })
})
