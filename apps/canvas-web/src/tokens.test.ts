import { describe, expect, it } from "bun:test"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * 设计变量的完整性检查。
 *
 * ## 为什么需要这个测试
 *
 * **CSS 对无效的 `var()` 是静默回退**：`max-width: var(--没定义的)` 解不出来
 * 就当这条声明不存在，容器直接铺满整宽。布局散掉了，控制台一句话都没有，
 * 构建也不报错。
 *
 * 这不是假想。首页那一批 `--home-*` 的值一直只写在 Home.tsx 的注释里、
 * 从没进过 tokens.css —— 18 个里有 14 个是空的。表现是：内容栏不居中、
 * 卡片没圆角没间距、hero 字号不对。而这些都被当成"抄得不够像"，
 * 实际上是变量根本没生效。
 *
 * 靠人眼比对发现不了这种问题：你看到的是"有点不一样"，不是"这里坏了"。
 */

const SRC = join(import.meta.dir)

/** 运行时用 JS 写进去的变量，不该出现在 tokens.css 里。 */
const RUNTIME_SET = new Set([
  // App.tsx 在 viewport 变化时写入，用来反向抵消画布缩放。
  "canvas-zoom",
])

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx?|css)$/.test(name) && !name.endsWith(".test.ts")) out.push(p)
  }
  return out
}

/**
 * 剥掉注释再扫。
 *
 * 不剥的话，一句 `用语义名而不是直接写 var(--canvas-*)` 的注释会被当成
 * 一次真实引用 —— 这个测试第一版就误报在这上面。
 */
function strip(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ") // /* … */ 和 JSX 里的 {/* … */}
    .replace(/^\s*\/\/.*$/gm, " ") // 整行的 //
}

const files = walk(SRC)
const tokens = readFileSync(join(SRC, "tokens.css"), "utf8")
const styles = readFileSync(join(SRC, "styles.css"), "utf8")

/** tokens.css 和 styles.css 里定义了哪些。 */
const defined = new Set(
  [...`${tokens}\n${styles}`.matchAll(/--([a-z][a-z0-9-]*)\s*:/g)].map((m) => m[1]),
)

/** 代码和样式里真正 `var(--x)` 引用到的变量。 */
const referenced = new Set(
  files.flatMap((f) =>
    [...strip(readFileSync(f, "utf8")).matchAll(/var\(\s*--([a-z][a-z0-9-]*)/g)].map((m) => m[1]),
  ),
)

describe("设计变量", () => {
  it("每个被引用的变量都有定义", () => {
    const missing = new Map<string, string[]>()
    for (const f of files) {
      const text = strip(readFileSync(f, "utf8"))
      for (const m of text.matchAll(/var\(\s*--([a-z][a-z0-9-]*)/g)) {
        const name = m[1]
        if (defined.has(name) || RUNTIME_SET.has(name)) continue
        // `var(--x, 兜底)` 带兜底值的不算问题 —— 那是有意的降级。
        const after = text.slice(m.index! + m[0].length, m.index! + m[0].length + 3)
        if (after.trimStart().startsWith(",")) continue
        const where = f.replace(SRC + "/", "")
        missing.set(name, [...(missing.get(name) ?? []), where])
      }
    }
    const report = [...missing].map(([k, v]) => `--${k}  ←  ${[...new Set(v)].join(", ")}`)
    expect(report).toEqual([])
  })

  it("被引用的变量不会只在深色里有定义", () => {
    // `.dark` 里定义了、`:root` 里没有的变量，在浅色主题下解不出来 ——
    // 而浅色是默认主题，等于那条声明只在深色下生效。
    //
    // **只查被真正引用的**：官方自己也有一批只在深色里定义、我们没用到的
    // （比如 --shadow-soft-floating）。把那些一起报出来是噪音，
    // 而噪音多的测试会被人习惯性忽略。
    // 用选择器本身定位，不能用 `.dark` 三个字 —— 它在文件头的注释里
    // 先出现过一次，slice 出来是空串，于是所有变量都被判成"只在深色里"。
    // 这个测试第一版就是这么错的。
    const rootAt = tokens.indexOf(":root {")
    const darkAt = tokens.indexOf(".dark {")
    const root = tokens.slice(rootAt, darkAt)
    const dark = tokens.slice(darkAt)
    const inRoot = new Set([...root.matchAll(/--([a-z][a-z0-9-]*)\s*:/g)].map((m) => m[1]))
    const onlyDark = [...dark.matchAll(/--([a-z][a-z0-9-]*)\s*:/g)]
      .map((m) => m[1])
      .filter((v) => !inRoot.has(v))
      .filter((v) => referenced.has(v))
    expect([...new Set(onlyDark)]).toEqual([])
  })
})
