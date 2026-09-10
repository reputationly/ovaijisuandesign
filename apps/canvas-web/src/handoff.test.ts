import { describe, expect, it } from "bun:test"

import { handoffKey, submitHandoff, type Handoff } from "./handoff"

/** 记下 create 被调了几次 —— 这个数字就是这组测试的全部重点。 */
function rig(opts: { createFails?: boolean; activateFails?: number } = {}) {
  let creates = 0
  let activates = 0
  let nextId = 1
  return {
    get creates() {
      return creates
    },
    get activates() {
      return activates
    },
    create: async () => {
      creates++
      if (opts.createFails) throw new Error("建画布失败")
      return `canvas-${nextId++}`
    },
    activate: async (_id: string) => {
      activates++
      if (opts.activateFails !== undefined && activates <= opts.activateFails) {
        throw new Error("切过去失败")
      }
    },
  }
}

describe("首页交接", () => {
  const KEY = handoffKey("生成一张红枫叶", [])

  it("一次成功的提交建一张画布，然后不留痕迹", async () => {
    const r = rig()
    const out = await submitHandoff({ pending: null, key: KEY, ...r })
    expect(out.ok).toBe(true)
    expect(r.creates).toBe(1)
    // pending 必须清掉 —— 留着的话下一句提示词如果碰巧同 key，
    // 会被塞进这张已经在用的画布。
    expect(out.pending).toBeNull()
  })

  it("切过去失败时，那张已经建好的画布留在 pending 里", async () => {
    const r = rig({ activateFails: 1 })
    const out = await submitHandoff({ pending: null, key: KEY, ...r })
    expect(out.ok).toBe(false)
    expect(r.creates).toBe(1)
    // 这是整件事的关键：画布已经存在了，重试必须能找到它。
    expect(out.pending).toEqual({ key: KEY, id: "canvas-1" })
  })

  it("同一句提示词重试，不会再建一张", async () => {
    // 不复用的话，用户每按一次重试就在侧边栏多一张空画布，
    // 而且完全不知道那些是哪来的。
    const r = rig({ activateFails: 1 })
    const first = await submitHandoff({ pending: null, key: KEY, ...r })
    expect(first.ok).toBe(false)

    const second = await submitHandoff({ pending: first.ok ? null : first.pending, key: KEY, ...r })
    expect(second.ok).toBe(true)
    expect(r.creates).toBe(1)
    expect(second.ok && second.id).toBe("canvas-1")
    expect(second.pending).toBeNull()
  })

  it("换一句提示词就是另一次创作，建新的", async () => {
    const r = rig()
    const stale: Handoff = { key: KEY, id: "canvas-old" }
    const out = await submitHandoff({
      pending: stale,
      key: handoffKey("做一首说唱", []),
      ...r,
    })
    expect(out.ok).toBe(true)
    expect(r.creates).toBe(1)
    expect(out.ok && out.id).toBe("canvas-1")
  })

  it("附件变了也是另一次创作", async () => {
    // 同一句话换一批参考图，复用上一张会把两次的素材混在一起。
    const a = handoffKey("照这个风格出三张", ["images/a.png"])
    const b = handoffKey("照这个风格出三张", ["images/b.png"])
    expect(a).not.toBe(b)

    const r = rig()
    const out = await submitHandoff({ pending: { key: a, id: "canvas-a" }, key: b, ...r })
    expect(r.creates).toBe(1)
    expect(out.ok && out.id).toBe("canvas-1")
  })

  it("建画布这一步就失败时，不冒领别人的 pending", async () => {
    // 什么都没建出来。把上一次别的提交留下的 pending 传回去，
    // 下次重试就会往一张不相干的画布里写。
    const r = rig({ createFails: true })
    const stale: Handoff = { key: handoffKey("别的活", []), id: "canvas-other" }
    const out = await submitHandoff({ pending: stale, key: KEY, ...r })
    expect(out.ok).toBe(false)
    expect(out.pending).toBeNull()
    expect(r.activates).toBe(0)
  })

  it("连续两次失败仍然只有一张", async () => {
    const r = rig({ activateFails: 2 })
    let pending: Handoff | null = null
    for (let i = 0; i < 2; i++) {
      const out = await submitHandoff({ pending, key: KEY, ...r })
      expect(out.ok).toBe(false)
      pending = out.ok ? null : out.pending
    }
    const done = await submitHandoff({ pending, key: KEY, ...r })
    expect(done.ok).toBe(true)
    expect(r.creates).toBe(1)
  })
})
