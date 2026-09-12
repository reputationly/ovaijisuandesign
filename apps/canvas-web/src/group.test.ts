import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "bun:test"

import { isValidConnection } from "./canvas"

const SRC = fileURLToPath(new URL(".", import.meta.url))
const read = (f: string) => readFileSync(join(SRC, f), "utf8")

/**
 * 分组这条链路。
 *
 * 它在界面上一直显示「未支持的节点类型：group」—— 而后端的
 * `canvas_group_nodes` 造的就是它，**系统提示词里还写着「一轮做出多个
 * 产物之后用 canvas_group_nodes 归拢」**。我们主动让 agent 建它，
 * 然后画布告诉用户"不支持"。
 */
describe("分组", () => {
  it("画布认这个类型 —— 否则落到 UnknownNode 显示「未支持」", () => {
    expect(read("canvas.ts")).toMatch(/RENDERABLE[^\n]*"group"/)
    expect(read("nodes.tsx")).toMatch(/^\s*group: GroupNode,/m)
  })

  it("后端会造 group，前端就必须能画", () => {
    // 两边任何一边单独改都会让这个功能回到"未支持"。
    const backend = readFileSync(
      join(SRC, "../../../crates/gateway/src/api_group.rs"),
      "utf8",
    )
    expect(backend).toContain('kind: "group"')
    expect(read("nodes.tsx")).toContain("export function GroupNode")
  })

  it("解组入口真的接到了后端", () => {
    // **建得出来就得解得掉。** 没有这个入口的话，agent 归拢错了用户只能
    // 把整组连同里面的产物一起删掉。
    expect(read("api.ts")).toContain("/api/canvas/ungroup")
    expect(read("App.tsx")).toContain("ungroupNodes(")
    expect(read("nodes.tsx")).toContain("actions?.ungroup(")
  })

  it("分组不能连线 —— 它是容器，没有素材", () => {
    const typeOf = (id: string) => (id === "g" ? "group" : "image")
    const ctx = { edges: [], typeOf }
    expect(isValidConnection({ source: "g", target: "a" }, ctx)).toBe(false)
    expect(isValidConnection({ source: "a", target: "g" }, ctx)).toBe(false)
    expect(isValidConnection({ source: "a", target: "b" }, ctx)).toBe(true)
  })
})
