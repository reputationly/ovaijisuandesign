import { describe, expect, it } from "vitest"

import type { ProjectRecord, WorkspaceEntry } from "../ipc"
import { truncateProjectName } from "./projects"
import {
  applyWorkspaceDisplayNameRename,
  groupRecentWorkspacesByProject,
  hasWorkspaceDisplayNameConflict,
  mergeWorkspaceInventory,
  recordRecentWorkspaceOpened,
  selectProjectWorkspaces,
  sortRecentWorkspaces,
  workspaceDisplayName,
  workspaceInventoryPathKey,
} from "./workspace-inventory"

const entry = (id: string, projectName = id.split("/").pop()!): WorkspaceEntry => ({ workspaceId: id, folderPath: id, projectName })
const project = (id: string, workspacePaths: string[]): ProjectRecord => ({
  id,
  name: id,
  kind: "local",
  createdAt: 0,
  updatedAt: 0,
  workspacePaths,
  revision: 0,
  transactionId: "",
  folderName: id,
})

describe("路径 key", () => {
  it("去掉多余斜杠和 .；Windows 盘符统一分隔符并转小写", () => {
    expect(workspaceInventoryPathKey("/a//b/./c/", false)).toBe("/a/b/c")
    expect(workspaceInventoryPathKey("C:\\Work\\Demo", true)).toBe("c:/work/demo")
    expect(workspaceInventoryPathKey("/Users/X", false)).toBe("/Users/X")
  })
})

describe("最近列表排序", () => {
  const list = [
    { path: "/a", openedAt: 1, manualOrder: 1 },
    { path: "/b", openedAt: 3, manualOrder: 0 },
    { path: "/c", openedAt: 2 },
  ]
  it("按最近：只看打开时间", () => {
    expect(sortRecentWorkspaces(list, "recent").map((w) => w.path)).toEqual(["/b", "/c", "/a"])
  })
  it("手动：没排过的在前，排过的按 manualOrder", () => {
    expect(sortRecentWorkspaces(list, "manual").map((w) => w.path)).toEqual(["/c", "/b", "/a"])
  })
})

describe("合并最近列表和已打开的标签", () => {
  it("已打开的带上 authoritativeEntry；只在标签里的合成一项；按打开时间排", () => {
    const inv = mergeWorkspaceInventory([{ path: "/p/a", openedAt: 10 }, { path: "/p/b", openedAt: 5 }], [entry("/p/b"), entry("/p/new", "新片子")], {
      caseInsensitive: false,
      sortMode: "recent",
      syntheticOpenedAt: 7,
    })
    expect(inv.map((i) => [i.workspace.path, i.authoritativeEntry?.workspaceId ?? null, i.recentPath ?? null])).toEqual([
      ["/p/a", null, "/p/a"],
      ["/p/new", "/p/new", null],
      ["/p/b", "/p/b", "/p/b"],
    ])
    // 标签名和目录名不同时当作显示名
    expect(workspaceDisplayName(inv[1]!.workspace)).toBe("新片子")
  })

  it("删掉后没再打开过的不出现；之后重新打开过（时间更新）的又出现", () => {
    const dismissals = [{ paths: ["/p/a"], recentOpenedAt: 10 }]
    expect(mergeWorkspaceInventory([{ path: "/p/a", openedAt: 10 }], [], { caseInsensitive: false, dismissals })).toEqual([])
    expect(mergeWorkspaceInventory([{ path: "/p/a", openedAt: 11 }], [], { caseInsensitive: false, dismissals })).toHaveLength(1)
  })

  it("同一个目录的重复条目只留一项", () => {
    const inv = mergeWorkspaceInventory([{ path: "/p/a/", openedAt: 2 }, { path: "/p/a", openedAt: 1 }], [entry("/p/a"), entry("/p/a")], { caseInsensitive: false })
    expect(inv).toHaveLength(1)
    expect(inv[0]!.authoritativeEntry?.workspaceId).toBe("/p/a")
  })
})

describe("按项目分组", () => {
  it("每个项目一组（空的也列），没归属的放最后", () => {
    const inv = mergeWorkspaceInventory([{ path: "/a", openedAt: 2 }, { path: "/b", openedAt: 1 }], [], { caseInsensitive: false, sortMode: "recent" })
    const groups = groupRecentWorkspacesByProject(inv, [project("p1", ["/b"]), project("p2", [])], false)
    expect(groups.map((g) => [g.key, g.items.map((i) => i.workspace.path)])).toEqual([
      ["p1", ["/b"]],
      ["p2", []],
      ["__ungrouped__", ["/a"]],
    ])
  })

  it("项目详情：清单里没有的项目成员合成一项（打开时间 0）", () => {
    const inv = mergeWorkspaceInventory([{ path: "/a", openedAt: 2 }], [], { caseInsensitive: false })
    const items = selectProjectWorkspaces(inv, project("p", ["/a", "/gone"]), false)
    expect(items.map((i) => [i.workspace.path, i.workspace.openedAt])).toEqual([
      ["/a", 2],
      ["/gone", 0],
    ])
    expect(selectProjectWorkspaces(inv, undefined, false)).toEqual([])
  })
})

describe("工作区显示名", () => {
  const list = [
    { path: "/p/a", openedAt: 1, displayName: "片子" },
    { path: "/p/b", openedAt: 2 },
  ]
  it("和别的工作区重名算冲突；改回目录名不算", () => {
    expect(hasWorkspaceDisplayNameConflict(list, "/p/b", " 片子 ", truncateProjectName)).toBe(true)
    expect(hasWorkspaceDisplayNameConflict(list, "/p/a", "a", truncateProjectName)).toBe(false)
  })
  it("改名写 displayName；改成目录名清掉；不在列表里就记一次打开", () => {
    expect(applyWorkspaceDisplayNameRename(list, "/p/b", "新名字", truncateProjectName)[1]).toEqual({ path: "/p/b", openedAt: 2, displayName: "新名字" })
    expect(applyWorkspaceDisplayNameRename(list, "/p/a", "a", truncateProjectName)[0]).toEqual({ path: "/p/a", openedAt: 1 })
    const added = applyWorkspaceDisplayNameRename(list, "/p/c", "丙", truncateProjectName, 99)
    expect(added[0]).toMatchObject({ path: "/p/c", openedAt: 99, displayName: "丙", manualOrder: 0 })
  })
  it("记一次打开：去重并保留重复项上的自定义名", () => {
    const out = recordRecentWorkspaceOpened([{ path: "/x", openedAt: 1 }, { path: "/x", openedAt: 0, displayName: "叉" }, { path: "/y", openedAt: 2 }], "/x", 5)
    expect(out.find((w) => w.path === "/x")).toMatchObject({ openedAt: 5, displayName: "叉" })
    expect(out.filter((w) => w.path === "/x")).toHaveLength(1)
  })
})
