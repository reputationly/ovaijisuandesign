import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "bun:test"

/**
 * 首页的**结构**必须和官方一致。
 *
 * ## 为什么要有这个测试
 *
 * 首页居中反复改了三次都没对，每次都是结构问题而不是数值问题：
 *
 * 1. 灵感区挂在滚动容器上 → `top: 100%` 量成了整屏，卡片被推到一屏之下；
 * 2. 少插一个 `</div>`，灵感区其实还在 hero-zone 里面 → 等于没改；
 * 3. 第三次才发现官方那个元素是**输入框的兄弟**，`top: 100%` 量的是
 *    「logo + 标题 + 输入框」那一栈的高度。
 *
 * 三次都通过了 `tsc` 和 `bun run build` —— **JSX 平衡不等于嵌套对**。
 * 编译器只管标签配对，管不了谁是谁的孩子。
 *
 * 官方从 renderer 里导出来的树（`jsxRuntimeExports.jsx` 调用）长这样：
 *
 * ```text
 * <main .home-content-grid …>
 *   <div .home-hero-zone relative flex shrink-0 flex-col items-center>
 *     <div .w-full max-w-[var(--home-primary-stack-width)]>
 *       <div .home-hero-content relative flex flex-col items-center>
 *         <div .home-hero-title-block …>
 *         <div .home-composer-placeholder relative mt-1 w-full>
 *         <div .home-below-anchor>          ← 输入框的兄弟
 * ```
 *
 * 下面几条断言就是这棵树里**居中所依赖的那部分**。
 */

const SRC = readFileSync(fileURLToPath(new URL("./Home.tsx", import.meta.url)), "utf8")

/** 某个 class 所在元素的起止行（按 `<div` / `</div>` 配平算）。 */
function spanOf(marker: string): { start: number; end: number } {
  const lines = SRC.split("\n")
  // **只认 className 属性里的**。注释里也会写到这些名字（本文件上面那段
  // 结构说明就是），按 includes 找会命中注释，然后从一个完全无关的位置
  // 开始数括号 —— 断言挂在一个看不懂的地方。
  const hit = lines.findIndex((l) => new RegExp(`className="[^"]*\\b${marker}\\b`).test(l))
  expect(hit, `源码里找不到 className 含 ${marker} 的元素`).toBeGreaterThanOrEqual(0)
  // className 可能不在 `<div` 那一行上（多行属性），往回找开标签。
  let start = hit
  while (start >= 0 && !/<div\b/.test(lines[start]!)) start--
  expect(start, `${marker} 上方找不到 <div`).toBeGreaterThanOrEqual(0)

  let depth = 0
  for (let i = start; i < lines.length; i++) {
    depth += (lines[i]!.match(/<div\b/g) ?? []).length
    depth -= (lines[i]!.match(/<\/div>/g) ?? []).length
    if (depth === 0 && i > start) return { start, end: i }
  }
  throw new Error(`${marker} 没有闭合`)
}

describe("首页结构", () => {
  it("灵感区是输入框的兄弟，挂在 home-hero-content 里", () => {
    // 这是居中的**全部依据**。挂到滚动容器上的话 `top: 100%` 变成一整屏，
    // 卡片被推到首屏之下看不见；留在流里的话 hero 的
    // `min-height:100% + justify-content: safe center` 会退化成顶对齐。
    const content = spanOf("home-hero-content")
    const anchor = spanOf("home-below-anchor")
    expect(anchor.start).toBeGreaterThan(content.start)
    expect(anchor.end).toBeLessThan(content.end)
  })

  it("home-hero-content 是定位参照物", () => {
    // 不是 relative 的话，`top: 100%` 会往上找到别的祖先 —— 多半是滚动
    // 容器，于是又变成一整屏。
    const lines = SRC.split("\n")
    const i = lines.findIndex((l) => /className="[^"]*\bhome-hero-content\b/.test(l))
    expect(lines[i]).toContain("relative")
  })

  it("hero-zone 撑满一屏并居中", () => {
    const span = spanOf("home-hero-zone")
    const body = SRC.split("\n").slice(span.start, span.end).join("\n")
    // 这三条少任何一条都不居中。
    expect(body).toContain('minHeight: "100%"')
    expect(body).toContain('justifyContent: "safe center"')
    // safe：内容超过一屏时退化成顶对齐而不是把上半截切掉。
    expect(body).toContain("safe")
  })

  it("灵感区脱离文档流，压在输入框下面", () => {
    const lines = SRC.split("\n")
    const i = lines.findIndex((l) => /className="[^"]*\bhome-below-anchor\b/.test(l))
    const block = lines.slice(i, i + 12).join("\n")
    expect(block).toContain("absolute")
    // 官方：top: calc(100% + var(--home-input-to-media-showcase-gap))
    expect(block).toContain("--home-input-to-media-showcase-gap")
  })
})
