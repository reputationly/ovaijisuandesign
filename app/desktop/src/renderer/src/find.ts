/**
 * 文本节点里的查找替换。官方的 `canvas.find.*`：
 *
 * ```
 * canvas.find.title              = 查找
 * canvas.find.placeholder        = 查找
 * canvas.find.replacePlaceholder = 替换
 * canvas.find.replace            = 替换
 * canvas.find.replaceAll         = 全部替换
 * canvas.find.matchCase          = 区分大小写
 * canvas.find.wholeWord          = 全字匹配
 * canvas.find.regex              = 使用正则表达式
 * canvas.find.next               = 下一个匹配
 * canvas.find.previous           = 上一个匹配
 * canvas.find.noResults          = 无结果
 * canvas.find.toggleReplace      = 切换替换
 * ```
 *
 * 逻辑全在这里、界面只管画 —— 查找的坑（零宽匹配、非法正则、`$` 被当成
 * 替换占位符）都在这一层，而它们在界面里很难测。
 */

export interface FindOptions {
  matchCase: boolean
  wholeWord: boolean
  regex: boolean
}

export const DEFAULT_FIND_OPTIONS: FindOptions = {
  matchCase: false,
  wholeWord: false,
  regex: false,
}

/** 一个匹配的区间，`[start, end)`。 */
export interface Match {
  start: number
  end: number
}

/** 正则元字符转义。非正则模式下用户打的每个字符都该按字面理解。 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * 编译成正则。**非法正则返回 `null`,不抛。**
 *
 * 用户是边打边搜的，`(` 打到一半就是非法的 —— 抛出去的话每敲一个字符
 * 就炸一次；界面把 `null` 当成"无结果"显示即可。
 */
export function compile(query: string, opts: FindOptions): RegExp | null {
  if (!query) return null
  let source = opts.regex ? query : escapeRegExp(query)
  if (opts.wholeWord) {
    // `\b` 对中文不起作用（中文之间没有单词边界），但官方这个选项本来就是
    // 给拉丁文字用的，行为保持一致。
    source = `\\b(?:${source})\\b`
  }
  try {
    return new RegExp(source, opts.matchCase ? "gu" : "giu")
  } catch {
    // `u` 标志对某些老写法更严格（比如 `\d` 后面跟无效转义）。退一步再试，
    // 还不行就当成非法。
    try {
      return new RegExp(source, opts.matchCase ? "g" : "gi")
    } catch {
      return null
    }
  }
}

/**
 * 找出全部匹配。
 *
 * **零宽匹配必须手动推进 `lastIndex`。** 星号量词（如 `x` 后跟一个星号）
 * 在每个位置都能匹配到空串，不推进的话 `exec` 会永远停在同一处 ——
 * 页面直接卡死，而用户只是在搜索框里打了个星号。
 */
export function findAll(text: string, query: string, opts: FindOptions): Match[] {
  const re = compile(query, opts)
  if (!re) return []
  const out: Match[] = []
  let m: RegExpExecArray | null
  // 上限防的是"匹配到几十万处"把界面拖死。查找是给人看的，
  // 超过这个数量已经没有导航价值了。
  const LIMIT = 10000
  while ((m = re.exec(text)) !== null) {
    if (m[0].length === 0) {
      re.lastIndex += 1
      continue
    }
    out.push({ start: m.index, end: m.index + m[0].length })
    if (out.length >= LIMIT) break
  }
  return out
}

/**
 * 从光标处往后找下一个（`wrap` 时回到开头）。返回在 `matches` 里的下标。
 *
 * 返回 `-1` 表示没有匹配。
 */
export function nextIndex(matches: readonly Match[], from: number, forward = true): number {
  if (matches.length === 0) return -1
  if (forward) {
    const i = matches.findIndex((m) => m.start >= from)
    return i === -1 ? 0 : i
  }
  for (let i = matches.length - 1; i >= 0; i--) {
    if (matches[i]!.start < from) return i
  }
  return matches.length - 1
}

/**
 * 替换一处。
 *
 * **非正则模式下 `$` 不是占位符。** 直接用 `String.replace` 的话，
 * 替换文本里的 `$&` 会被展开成"整个匹配"——用户想打的就是一个美元符号。
 */
export function replaceAt(text: string, m: Match, replacement: string): string {
  return text.slice(0, m.start) + replacement + text.slice(m.end)
}

/**
 * 全部替换。
 *
 * **从后往前替**，这样前面那些匹配的下标不会因为长度变化而失效。
 * 从前往后的话，替换文本比原文长时后续区间会整体错位 —— 结果是替换到
 * 一半开始替错位置，而且不报错。
 */
export function replaceAll(text: string, query: string, replacement: string, opts: FindOptions) {
  const matches = findAll(text, query, opts)
  let out = text
  for (let i = matches.length - 1; i >= 0; i--) {
    out = replaceAt(out, matches[i]!, replacement)
  }
  return { text: out, count: matches.length }
}
