import { describe, expect, it } from "bun:test"

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

/**
 * 决策卡的状态长度必须跟着题目走。
 *
 * `QuestionCard` 里 `picked` / `custom` 的初值是
 * `useState(() => request.questions.map(…))` —— **初始化只在首次挂载跑**。
 * agent 问第二道题时如果复用同一个实例（没有 key），而第二道题题数更多，
 * `picked[qi]!` 就是 `undefined`,点一下选项直接白屏。
 *
 * 两处保护缺一不可，这里各钉一条：
 * 调用方给 `key={question.id}`（换题 = 换实例），组件内部也跟着 request 重置。
 */
const read = (f: string) =>
  readFileSync(fileURLToPath(new URL(`./${f}`, import.meta.url)), "utf8")

describe("决策卡", () => {
  it("调用方按题目 id 给 key", () => {
    const src = read("ChatPanel.tsx")
    const at = src.indexOf("<QuestionCard")
    expect(at, "找不到 QuestionCard 的使用点").toBeGreaterThanOrEqual(0)
    // 只看开标签内部：属性可能跨十几行，按字符数截取会漏。
    const close = src.indexOf("/>", at)
    expect(src.slice(at, close)).toContain("key={question.id}")
  })

  it("组件内部也跟着 request 重置", () => {
    // 调用方忘了加 key 的代价是白屏，这种代价不该只靠别人记得。
    const src = read("Question.tsx")
    const m = /useEffect\(\(\) => \{[\s\S]{0,300}?\}, \[request\]\)/.exec(src)
    expect(m, "没有跟着 request 重置的 effect").not.toBeNull()
    for (const setter of ["setPicked", "setCustom", "setSent"]) {
      expect(m![0]).toContain(setter)
    }
  })
})
