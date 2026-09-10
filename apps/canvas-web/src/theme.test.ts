import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "bun:test"

/**
 * Tailwind 的颜色 utility 必须有对应的 `@theme` 条目。
 *
 * **`@theme` 里没有的名字，`bg-foo` 这类 class 一个字节的 CSS 都不生成。**
 * class 照样出现在 HTML 里，元素上什么都没有 —— 没有报错、没有警告。
 *
 * 首页的发送按钮就这么白了一阵子：写着 `enabled:bg-foreground`,
 * 而 `@theme` 里只有 `--color-fg`,于是渲染出来是一个裸箭头，
 * 看起来像"设计就是这样"。
 *
 * 和 `tokens.test.ts` 是同一类保护，只是那边管 `var(--x)`，这边管 utility。
 */

const SRC = fileURLToPath(new URL(".", import.meta.url))

/** `@theme { --color-x: … }` 里声明的颜色名。 */
const THEME_COLORS: Set<string> = (() => {
  const css = readFileSync(join(SRC, "styles.css"), "utf8")
  const block = /@theme\s*\{([\s\S]*?)\n\}/.exec(css)
  if (!block) throw new Error("styles.css 里找不到 @theme 块")
  return new Set([...block[1]!.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]!))
})()

/**
 * Tailwind 自带的调色板。这些不需要在 `@theme` 里声明。
 *
 * 只列**我们真的用到**的那些 —— 把整份官方调色板抄进来的话，
 * 这张表会比它保护的代码还长，而且随 Tailwind 版本漂移。
 */
const BUILTIN = new Set(["white", "black", "transparent", "current", "inherit"])

/** 颜色 utility 的前缀。`border-t`、`ring-inset` 这些不是颜色，靠下面的白名单排掉。 */
const PREFIXES = ["bg", "text", "border", "fill", "stroke", "ring", "divide"]

/**
 * 同名但不是颜色的后缀。
 *
 * `border-t`（上边框宽度）、`text-sm`（字号）、`ring-inset`（内描边）——
 * 它们和颜色 utility 长得一样，但和 `@theme` 无关。
 */
const NOT_COLORS =
  /^(?:\d+|xs|sm|base|lg|xl|\d?xl|[trblxy]|inset|left|right|center|start|end|top|bottom|solid|dashed|dotted|double|none|wrap|nowrap|balance|pretty|ellipsis|clip|justify)$/

function sources(): string[] {
  return readdirSync(SRC)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => join(SRC, f))
}

describe("Tailwind 颜色", () => {
  it("@theme 至少声明了那几个官方 token 的同名版本", () => {
    // 少了任何一个，用到它的地方就是"class 在、样式不在"。
    for (const name of ["foreground", "background", "muted-foreground", "border", "popover"]) {
      expect(THEME_COLORS.has(name), `@theme 缺 --color-${name}`).toBe(true)
    }
  })

  it("每个用到的颜色名都在 @theme 或内置调色板里", () => {
    const re = new RegExp(
      `(?<![\\w-])(?:[a-z-]+:)*(${PREFIXES.join("|")})-([a-z][a-z0-9]*(?:-[a-z0-9]+)*?)(?:/\\d+)?(?![\\w/-])`,
      "g",
    )
    // 只扫 `className` / `class` 的字符串字面量。
    // 整个文件扫的话会撞上 CSS 属性名 —— `transition: "border-color 0.15s"`
    // 里的 `border-color` 看起来和一个颜色 utility 一模一样。
    const classAttr = /class(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\}|\{"([^"]*)"\})/g
    const missing = new Map<string, Set<string>>()
    for (const file of sources()) {
      const text = readFileSync(file, "utf8")
      const classes = [...text.matchAll(classAttr)]
        .map((m) => m[1] ?? m[2] ?? m[3] ?? m[4] ?? "")
        .join(" ")
      for (const m of classes.matchAll(re)) {
        const color = m[2]!
        if (NOT_COLORS.test(color)) continue
        // 逐段回退：`foreground/70` 的颜色名是 `foreground`；
        // `muted-foreground` 整体就是一个名字。
        if (THEME_COLORS.has(color) || BUILTIN.has(color)) continue
        if (THEME_COLORS.has(color.split("-")[0]!) || BUILTIN.has(color.split("-")[0]!)) continue
        const where = file.slice(SRC.length)
        missing.set(m[0]!, (missing.get(m[0]!) ?? new Set()).add(where))
      }
    }
    const report = [...missing].map(([k, v]) => `${k}  ←  ${[...v].join(", ")}`)
    expect(report).toEqual([])
  })
})
