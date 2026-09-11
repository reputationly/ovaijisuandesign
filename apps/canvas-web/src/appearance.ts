/**
 * 主题（浅色 / 深色 / 跟随系统）。官方 `settings.theme*`：
 *
 * ```
 * settings.appearance  = 外观
 * settings.theme       = 主题
 * settings.themeDesc   = 选择浅色、深色或跟随系统主题
 * settings.themeLight  = 浅色    settings.themeDark = 深色
 * settings.themeSystem = 跟随系统
 * ```
 *
 * ## 为什么现在才做
 *
 * `tokens.css` 里的 `.dark` 有 **179 行变量**,写好之后**没有任何代码给
 * `<html>` 挂过这个 class** —— 整套深色主题是死的。index.html 上还留着
 * 一句"将来加主题开关时给 `<html>` 挂 class 即可"。就是现在。
 *
 * 起名 `appearance` 不叫 `theme`：`theme.test.ts` 已经被 Tailwind 的
 * `@theme` 检查占了，两个 theme 放一起读代码的人要多想一步。
 */

export type Theme = "light" | "dark" | "system"

export const THEMES: { id: Theme; label: string }[] = [
  { id: "light", label: "浅色" },
  { id: "dark", label: "深色" },
  { id: "system", label: "跟随系统" },
]

const KEY = "ov.theme"

/**
 * 读偏好。**认不出的值一律当 `system`。**
 *
 * localStorage 里可能是上一版写的、也可能被用户手改过。返回一个不在联合
 * 类型里的字符串会让 `resolve` 落进 default 分支，行为上等于随机。
 */
export function loadTheme(store: Pick<Storage, "getItem"> = localStorage): Theme {
  const v = store.getItem(KEY)
  return v === "light" || v === "dark" || v === "system" ? v : "system"
}

export function saveTheme(t: Theme, store: Pick<Storage, "setItem"> = localStorage) {
  store.setItem(KEY, t)
}

/** 偏好 + 系统状态 → 到底用浅色还是深色。 */
export function resolve(pref: Theme, systemDark: boolean): "light" | "dark" {
  if (pref === "system") return systemDark ? "dark" : "light"
  return pref
}

/**
 * 把结果挂到 `<html>` 上。
 *
 * **同时写 `color-scheme`。** 只加 class 的话，滚动条、`<input>` 的日期
 * 选择器、表单控件这些**浏览器自己画的东西**仍然是浅色的 —— 深色界面上
 * 一条白得刺眼的滚动条，而且用 CSS 变量修不了。
 */
export function applyTheme(mode: "light" | "dark", root: HTMLElement = document.documentElement) {
  root.classList.toggle("dark", mode === "dark")
  root.style.colorScheme = mode
}

/**
 * 监听系统主题。返回取消订阅。
 *
 * **`system` 之外也要订阅。** 用户可能在设置里从「深色」切回「跟随系统」,
 * 这时要立刻拿到当前系统状态；只在 `system` 下订阅的话，切换那一刻需要
 * 额外一次手动同步，容易漏。
 */
export function watchSystem(cb: (dark: boolean) => void): () => void {
  // 非浏览器环境（测试）里没有 matchMedia。
  if (typeof window === "undefined" || !window.matchMedia) return () => {}
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  const on = (e: MediaQueryListEvent) => cb(e.matches)
  mq.addEventListener("change", on)
  cb(mq.matches)
  return () => mq.removeEventListener("change", on)
}

/**
 * 首屏之前先把 class 挂上，避免闪一下白。
 *
 * 在 `main.tsx` 里 React 渲染之前调用 —— 等 effect 跑完再挂的话，
 * 深色偏好的用户每次启动都会看到一帧白屏。
 */
export function initTheme(): Theme {
  const pref = loadTheme()
  const dark =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  applyTheme(resolve(pref, dark))
  return pref
}
