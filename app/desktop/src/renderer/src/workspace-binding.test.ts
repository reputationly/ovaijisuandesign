import { afterEach, describe, expect, it } from "vitest"

import { identityHeaders, setActiveWorkspace, withIdentityHeaders, withIdentityQuery } from "./workspace-binding"

const identity = { claim: "c1", instanceId: "i1", generation: 3 }

afterEach(() => setActiveWorkspace(null))

describe("工作区身份", () => {
  it("没绑定工作区时不带身份", () => {
    expect(identityHeaders()).toEqual({})
    expect(withIdentityQuery("http://h/files/a.png")).toBe("http://h/files/a.png")
    const init = { method: "POST" }
    expect(withIdentityHeaders(init)).toBe(init)
  })

  it("绑定后请求带三个头，调用方给的同名头优先", () => {
    setActiveWorkspace({ id: "w", gatewayUrl: "http://h", wsUrl: "ws://h/ws", identity })
    const h = new Headers(withIdentityHeaders({ headers: { "content-type": "application/json", "x-hilo-workspace": "own" } }).headers)
    expect(h.get("x-hilo-workspace")).toBe("own")
    expect(h.get("x-hilo-workspace-instance")).toBe("i1")
    expect(h.get("x-hilo-workspace-generation")).toBe("3")
    expect(h.get("content-type")).toBe("application/json")
  })

  it("URL 上追加 query，保留原有参数和锚点", () => {
    setActiveWorkspace({ id: "w", gatewayUrl: "http://h", wsUrl: "ws://h/ws", identity })
    expect(withIdentityQuery("http://h/files/a.png?w=256#x")).toBe(
      "http://h/files/a.png?w=256&hilo_workspace=c1&hilo_workspace_instance=i1&hilo_workspace_generation=3#x",
    )
    expect(withIdentityQuery("ws://h/ws", { claim: "c2", instanceId: "i2", generation: 1 })).toBe(
      "ws://h/ws?hilo_workspace=c2&hilo_workspace_instance=i2&hilo_workspace_generation=1",
    )
  })

  it("浏览器开发（没有身份）时照常请求", () => {
    setActiveWorkspace({ id: "w", gatewayUrl: "http://h", wsUrl: "ws://h/ws" })
    expect(identityHeaders()).toEqual({})
  })
})
