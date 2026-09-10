import { describe, expect, it } from "bun:test"

import { isValidConnection } from "./canvas"

/** 画布上有：两张图、一个分组，以及一条 a→b 的边。 */
const ctx = {
  edges: [{ source: "a", target: "b" }],
  typeOf: (id: string) => ({ a: "image", b: "image", g: "group" })[id],
}

describe("连线规则", () => {
  it("正常的两个节点可以连", () => {
    expect(isValidConnection({ source: "b", target: "a" }, ctx)).toBe(true)
  })

  it("不能自己连自己", () => {
    // 画出来是一个绕回自己的圈，而"以自己为输入"没有意义。
    expect(isValidConnection({ source: "a", target: "a" }, ctx)).toBe(false)
  })

  it("同一对不能连第二次", () => {
    // 不会有新语义，只会多一条压在原来那条上面 —— 看起来还是一条线，
    // 但删的时候要删两次。
    expect(isValidConnection({ source: "a", target: "b" }, ctx)).toBe(false)
    // 反向是另一条边，允许。
    expect(isValidConnection({ source: "b", target: "a" }, ctx)).toBe(true)
  })

  it("分组不能当端点", () => {
    // 分组是容器，本身没有素材。连上之后下游拿它做输入会拿到空。
    expect(isValidConnection({ source: "g", target: "a" }, ctx)).toBe(false)
    expect(isValidConnection({ source: "a", target: "g" }, ctx)).toBe(false)
  })

  it("端点缺失时不连", () => {
    // xyflow 在连线还没落到任何 handle 上时 target 是 null。
    expect(isValidConnection({ source: "a", target: null }, ctx)).toBe(false)
    expect(isValidConnection({ source: null, target: "a" }, ctx)).toBe(false)
  })
})
