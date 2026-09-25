import { describe, expect, it } from "vitest"

import { parseWorkspaceSearch, pickSkillsSearch } from "./search"

describe("工作区路由参数", () => {
  it("附件既收数组也收 JSON 串，坏值丢弃", () => {
    expect(parseWorkspaceSearch({ workspaceId: "w", initialAttachments: ["a", "b"] }).initialAttachments).toEqual(["a", "b"])
    expect(parseWorkspaceSearch({ workspaceId: "w", initialAttachments: '["x"]' }).initialAttachments).toEqual(["x"])
    expect(parseWorkspaceSearch({ workspaceId: "w", initialAttachments: "{bad" }).initialAttachments).toBeUndefined()
    expect(parseWorkspaceSearch({ workspaceId: "w", initialAttachments: [1] }).initialAttachments).toBeUndefined()
  })

  it("空白的 workspaceId 视为没有", () => {
    expect(parseWorkspaceSearch({ workspaceId: "  " }).workspaceId).toBeUndefined()
  })

  it("枚举参数只认合法值", () => {
    const s = parseWorkspaceSearch({ menuAction: "open-settings", initialComfyUiWorkflowTarget: "elsewhere", assetCenterRelocation: "true" })
    expect(s.menuAction).toBe("open-settings")
    expect(s.initialComfyUiWorkflowTarget).toBeUndefined()
    expect(s.assetCenterRelocation).toBe(true)
  })

  it("媒体模型选择按模态拆开，非字符串数组的模态丢掉", () => {
    expect(parseWorkspaceSearch({ initialSelectedMediaModels: JSON.stringify({ image: ["a"], video: "x" }) }).initialSelectedMediaModels).toEqual({ image: ["a"] })
  })
})

describe("技能页参数", () => {
  it("丢掉未知值、去掉首尾空白", () => {
    expect(pickSkillsSearch({ capability: "connectors", tab: "nope", pluginId: " p1 ", skillName: "" })).toEqual({ capability: "connectors", pluginId: "p1" })
  })
})
