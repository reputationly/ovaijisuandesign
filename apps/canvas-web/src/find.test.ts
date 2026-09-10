import { describe, expect, it } from "bun:test"

import {
  DEFAULT_FIND_OPTIONS as D,
  compile,
  findAll,
  nextIndex,
  replaceAll,
  type FindOptions,
} from "./find"

const opt = (o: Partial<FindOptions> = {}): FindOptions => ({ ...D, ...o })

describe("查找", () => {
  it("默认不区分大小写", () => {
    expect(findAll("Cat cat CAT", "cat", opt())).toHaveLength(3)
    expect(findAll("Cat cat CAT", "cat", opt({ matchCase: true }))).toHaveLength(1)
  })

  it("非正则模式下元字符按字面理解", () => {
    // 用户搜 `a.b` 想找的就是那三个字符，不是"a 任意字符 b"。
    expect(findAll("a.b axb", "a.b", opt())).toEqual([{ start: 0, end: 3 }])
    expect(findAll("a.b axb", "a.b", opt({ regex: true }))).toHaveLength(2)
  })

  it("全字匹配", () => {
    expect(findAll("cat cats", "cat", opt({ wholeWord: true }))).toHaveLength(1)
    expect(findAll("cat cats", "cat", opt())).toHaveLength(2)
  })

  it("非法正则不抛，当成无结果", () => {
    // 用户是边打边搜的，`(` 打到一半就是非法的 —— 抛出去每敲一个字符就炸一次。
    expect(compile("(", opt({ regex: true }))).toBeNull()
    expect(findAll("abc", "(", opt({ regex: true }))).toEqual([])
    expect(findAll("abc", "[", opt({ regex: true }))).toEqual([])
  })

  it("零宽匹配不会死循环", () => {
    // `/x*/g` 在每个位置都能匹配空串。不手动推进 lastIndex 的话 exec 永远
    // 停在同一处，页面直接卡死 —— 而用户只是在搜索框里打了个 `*`。
    const t0 = Date.now()
    expect(findAll("aaa", "x*", opt({ regex: true }))).toEqual([])
    expect(findAll("aaa", "a*", opt({ regex: true }))).toEqual([{ start: 0, end: 3 }])
    expect(Date.now() - t0).toBeLessThan(1000)
  })

  it("空查询没有结果", () => {
    expect(findAll("abc", "", opt())).toEqual([])
  })
})

describe("导航", () => {
  const ms = [
    { start: 0, end: 1 },
    { start: 5, end: 6 },
    { start: 9, end: 10 },
  ]

  it("往后找光标之后的第一个，找不到就绕回开头", () => {
    expect(nextIndex(ms, 0)).toBe(0)
    expect(nextIndex(ms, 1)).toBe(1)
    expect(nextIndex(ms, 100)).toBe(0)
  })

  it("往前找光标之前的最后一个，找不到就绕到末尾", () => {
    expect(nextIndex(ms, 6, false)).toBe(1)
    expect(nextIndex(ms, 0, false)).toBe(2)
  })

  it("没有匹配时返回 -1", () => {
    expect(nextIndex([], 0)).toBe(-1)
  })
})

describe("替换", () => {
  it("全部替换", () => {
    expect(replaceAll("cat cat", "cat", "dog", opt())).toEqual({ text: "dog dog", count: 2 })
  })

  it("替换文本比原文长时不会错位", () => {
    // 从前往后替的话，后续区间会因为长度变化整体偏移 —— 替到一半开始
    // 替错位置，而且不报错。所以要从后往前。
    expect(replaceAll("a a a", "a", "xxxx", opt()).text).toBe("xxxx xxxx xxxx")
    expect(replaceAll("aa aa", "aa", "b", opt()).text).toBe("b b")
  })

  it("替换文本里的 $ 不被当成占位符", () => {
    // String.replace 会把 `$&` 展开成整个匹配。用户想打的就是一个美元符号。
    expect(replaceAll("cat", "cat", "$&", opt()).text).toBe("$&")
    expect(replaceAll("cat", "cat", "$1", opt()).text).toBe("$1")
    expect(replaceAll("price", "price", "$9.99", opt()).text).toBe("$9.99")
  })

  it("没有匹配时原样返回", () => {
    expect(replaceAll("abc", "zzz", "x", opt())).toEqual({ text: "abc", count: 0 })
  })
})
