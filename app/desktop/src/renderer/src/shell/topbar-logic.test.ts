import { describe, expect, it } from "vitest"

import { performOtherWorkspacePreviewsHide, performWorkspacePreviewHide, performWorkspacePreviewsToRightHide, shouldActivateWorkspaceThroughRoute } from "./topbar-logic"

function recorder() {
  const log: string[] = []
  return {
    log,
    effects: {
      hidePreview: (id: string) => void log.push(`hide ${id}`),
      hidePreviews: (ids: string[]) => void log.push(`hide ${ids.join(",")}`),
      activateWorkspace: (id: string) => void log.push(`activate ${id}`),
      activateHome: () => void log.push("home"),
      requestRuntimeClose: (id: string, source: string) => void log.push(`close ${id} ${source}`),
    },
  }
}

const entries = ["a", "b", "c"].map((workspaceId) => ({ workspaceId }))

describe("关一个标签", () => {
  it("关当前的：先藏，再切到相邻的，最后请主进程停运行时", () => {
    const { log, effects } = recorder()
    performWorkspacePreviewHide(entries, "b", "b", "topbar", effects)
    expect(log).toEqual(["hide b", "activate c", "close b topbar"])
  })

  it("关最后一个当前标签：回首页", () => {
    const { log, effects } = recorder()
    performWorkspacePreviewHide([{ workspaceId: "a" }], "a", "a", "menu-close-tab", effects)
    expect(log).toEqual(["hide a", "home", "close a menu-close-tab"])
  })

  it("关的不是当前的：不切换", () => {
    const { log, effects } = recorder()
    performWorkspacePreviewHide(entries, "c", "a", "home-sidebar-recent", effects)
    expect(log).toEqual(["hide c", "close c home-sidebar-recent"])
  })
})

describe("批量关", () => {
  it("关其他：当前的被关了就切到保留的那个", () => {
    const { log, effects } = recorder()
    performOtherWorkspacePreviewsHide(entries, "a", "c", effects)
    expect(log).toEqual(["hide b,c", "activate a", "close b topbar-context-close-others", "close c topbar-context-close-others"])
  })

  it("关右侧：最右边的右侧没有标签，什么都不做", () => {
    const { log, effects } = recorder()
    performWorkspacePreviewsToRightHide(entries, "c", "a", effects)
    expect(log).toEqual([])
    performWorkspacePreviewsToRightHide(entries, "a", "a", effects)
    expect(log).toEqual(["hide b,c", "close b topbar-context-close-right", "close c topbar-context-close-right"])
  })
})

describe("激活走路由还是走主进程", () => {
  it("冷标签（没有 gateway 地址）交给工作区页拉起", () => {
    expect(shouldActivateWorkspaceThroughRoute([{ workspaceId: "a" }], "a")).toBe(true)
    expect(shouldActivateWorkspaceThroughRoute([{ workspaceId: "a", gatewayUrl: "http://x" }], "a")).toBe(false)
    expect(shouldActivateWorkspaceThroughRoute([], "a")).toBe(false)
  })
})
