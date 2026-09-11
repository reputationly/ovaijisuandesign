import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "bun:test"

import { THEMES, applyTheme, loadTheme, resolve } from "./appearance"

const fake = (v: string | null) => ({ getItem: () => v })

describe("主题偏好", () => {
  it("三个选项照官方：浅色 / 深色 / 跟随系统", () => {
    expect(THEMES.map((t) => t.label)).toEqual(["浅色", "深色", "跟随系统"])
  })

  it("没存过时跟随系统", () => {
    expect(loadTheme(fake(null))).toBe("system")
  })

  it("认不出的值当跟随系统，不是当浅色", () => {
    // 上一版写的、或者用户手改过的值。返回一个不在联合类型里的字符串会让
    // resolve 落进 default，行为上等于随机。
    expect(loadTheme(fake("auto"))).toBe("system")
    expect(loadTheme(fake(""))).toBe("system")
  })

  it("跟随系统时看系统，指定时忽略系统", () => {
    expect(resolve("system", true)).toBe("dark")
    expect(resolve("system", false)).toBe("light")
    expect(resolve("light", true)).toBe("light")
    expect(resolve("dark", false)).toBe("dark")
  })
})

describe("挂到 html 上", () => {
  const root = () => {
    const set: Record<string, boolean> = {}
    return {
      classList: {
        toggle: (c: string, on: boolean) => {
          set[c] = on
        },
      },
      style: {} as { colorScheme?: string },
      has: (c: string) => set[c] === true,
    }
  }

  it("深色加 class，浅色去掉", () => {
    const r = root()
    applyTheme("dark", r as unknown as HTMLElement)
    expect(r.has("dark")).toBe(true)
    applyTheme("light", r as unknown as HTMLElement)
    expect(r.has("dark")).toBe(false)
  })

  it("同时写 color-scheme —— 否则滚动条还是白的", () => {
    // 只加 class 的话，滚动条、日期选择器这些浏览器自己画的东西仍是浅色，
    // 深色界面上一条白得刺眼的滚动条，而且 CSS 变量修不了。
    const r = root()
    applyTheme("dark", r as unknown as HTMLElement)
    expect(r.style.colorScheme).toBe("dark")
  })
})

describe("深色变量是完整的", () => {
  const css = readFileSync(fileURLToPath(new URL("./tokens.css", import.meta.url)), "utf8")

  /** 取某个选择器块里的 `--x: value` 全表。 */
  const varsIn = (selector: string) => {
    const i = css.indexOf(selector)
    if (i === -1) return new Map<string, string>()
    const end = css.indexOf("\n}", i)
    return new Map(
      [...css.slice(i, end).matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map((m) => [
        m[1]!,
        m[2]!.trim(),
      ]),
    )
  }

  it(".dark 覆盖了 :root 里的每一个颜色变量", () => {
    // **漏一个就是深色下那一处仍然用浅色值** —— 深色背景上一块白卡片。
    // 这种缺口肉眼很难逐个找，清单比对一秒就出来。
    //
    // **按值判断是不是颜色，不按名字。** 先前那版用名字里的关键词猜，
    // `--home-input-radius`（含 "input"）、`--popover-trigger-gap`
    // （含 "popover"）这些纯几何量全被算成颜色 —— 36 个"缺失"里大半是
    // 误报，噪声一大就没人看了。
    const isColor = (v: string) =>
      /^#[0-9a-f]{3,8}$/i.test(v) ||
      /^(rgb|rgba|hsl|hsla|oklch|lab|color-mix)\(/i.test(v) ||
      // 渐变、阴影里也带颜色。
      /(gradient|inset|\d+px .*#|rgba?\()/i.test(v)

    const light = varsIn(":root {")
    const dark = varsIn(".dark {")
    expect(dark.size).toBeGreaterThan(100)

    /**
     * 颜色**全部来自已被覆盖的变量**时，值自己就跟着主题变了，
     * 不需要在 `.dark` 里再写一遍。
     *
     * 这一层不认的话，`--message-input-attachment-bg:
     * color-mix(in srgb, var(--foreground) 4%, transparent)` 会被报成缺失 ——
     * 而 `--foreground` 在 `.dark` 里是覆盖了的，这个值本来就是自适应的。
     * 5/6 的"缺失"都是这种，噪声一大就没人看了。
     */
    const derives = (value: string): boolean => {
      const refs = [...value.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]!)
      if (refs.length === 0) return false
      // 只要引用的变量全在 .dark 里被覆盖（或它自己也是自适应的），
      // 这个值就是自适应的。
      return refs.every((r) => dark.has(r) || derives(light.get(r) ?? ""))
    }

    /**
     * 有意两个主题共用一个值的。
     *
     * `--modal-mask-bg`：**官方也只在 `:root` 里定义、深色不覆盖**
     * （查过他们的样式表，全文只有一处 `--modal-mask-bg: #0000009e`）。
     * 遮罩的作用是压暗背后的内容，深浅色下要压暗的量是一样的。
     */
    const SHARED = new Set(["--modal-mask-bg"])

    const missing = [...light]
      .filter(
        ([name, value]) =>
          isColor(value) && !dark.has(name) && !derives(value) && !SHARED.has(name),
      )
      .map(([name, value]) => `${name}: ${value}`)
    expect(missing).toEqual([])
  })
})
