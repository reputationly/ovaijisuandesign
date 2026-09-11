import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "bun:test"

/**
 * 交互层的静态检查。
 *
 * ## 为什么要有
 *
 * 前一轮人工排查前端交互，查出 13 处「看起来能用、点了不是那回事」。
 * **跑测试一个都查不出来** —— 它们不崩溃、类型也对，只是标签和行为对不上。
 *
 * 其中两类是机器能查的，固化在这里：
 *
 * 1. **组件声明了可选 prop，但没有任何调用方传** —— 那段 UI 等于不存在。
 *    节点工具条的「以此生成」「复制」就是这么消失的：`NodeToolbar` 里
 *    `{onGenerate && <Btn…>}` 写得好好的，而 `nodes.tsx` 只传了 3 个 prop，
 *    条件永远为假。
 *
 * 2. **同一个 `data-action-ui-id` 出现在多处** —— 要么是复制粘贴漏改，
 *    要么是两个按钮在做同一件事。灯箱的百分比和圆箭头就共用了
 *    `zoom-reset`,而它们确实做的是同一件事。
 *
 * 查不到的那些（标签写「下载」实际是「打开」之类）只能靠人对着读，
 * 见提交 `fix(ui): 交互排查`。
 */

const SRC = fileURLToPath(new URL(".", import.meta.url))

function files(): { name: string; text: string }[] {
  return readdirSync(SRC)
    .filter((f) => f.endsWith(".tsx"))
    .map((name) => ({ name, text: readFileSync(join(SRC, name), "utf8") }))
}

describe("画布光标", () => {
  const css = readFileSync(join(SRC, "styles.css"), "utf8")

  /**
   * 这三组规则**缺一不可**,我亲手删错过一次。
   *
   * 官方有两组罗盘光标规则：给 pane/node 整个钉上的那组（带 `!important`）,
   * 加一条管节点内部 `cursor: default` 元素的窄规则。我只 grep 到窄的那条,
   * 以为它是替代品，把宽的删了 —— 后果是 xyflow 自带的
   * `.react-flow__node.selectable { cursor: pointer }` 赢了，移动模式下
   * 鼠标移到节点上变成一只**手指**。
   *
   * 小手工具那组则是另一个方向的漏：不挂 `.canvas-space-pan` 的话，
   * 选了小手光标毫无变化，用户不知道模式切过去没有。
   */
  it("移动模式：pane 和 node 都是罗盘光标，且要 !important", () => {
    // 不带 !important 的话，库自带的 .selectable{cursor:pointer}
    // （特异度更高）会赢。
    const blanket = /\.react-flow__pane,[\s\S]{0,200}?\.react-flow__node[\s\S]{0,200}?\{[^}]*cursor:\s*var\(--canvas-cursor-default\)\s*!important/
    expect(blanket.test(css)).toBe(true)
  })

  it("小手 / 空格：grab 和 grabbing 都有", () => {
    expect(/\.canvas-space-pan \.react-flow__pane\s*\{[^}]*cursor:\s*grab\s*!important/.test(css)).toBe(true)
    expect(/\.canvas-space-pan \.react-flow__pane\.dragging\s*\{[^}]*cursor:\s*grabbing/.test(css)).toBe(true)
  })

  it("canvas-space-pan 这个类真的有人挂", () => {
    // 官方 `isHandPanning = handTool || isSpacePanning`,两种情况共用它。
    // 只写 CSS 不挂类的话，这几条规则永远不生效。
    const app = readFileSync(join(SRC, "App.tsx"), "utf8")
    expect(app.includes('"canvas-space-pan"')).toBe(true)
    // 小手工具那一路也要覆盖到，不能只有空格。
    expect(/tool === "hand"[\s\S]{0,80}canvas-space-pan|canvas-space-pan[\s\S]{0,80}tool === "hand"/.test(app)).toBe(true)
  })
})

describe("交互层", () => {
  it("组件声明的可选 prop 都有人传", () => {
    const all = files()
    const whole = all.map((f) => f.text).join("\n")
    const missing: string[] = []

    for (const { name, text } of all) {
      // `export function Foo({ a, b }: { a?: X; b: Y })`
      for (const m of text.matchAll(
        /export function (\w+)\(\{([\s\S]{0,1200}?)\}:\s*\{([\s\S]{0,2000}?)\n\}\)/g,
      )) {
        const comp = m[1]!
        const typeBlock = m[3]!
        // 组件在别处被用到没有？没有的话跳过（可能是入口组件）。
        const used = new RegExp(`<${comp}\\b`).test(whole)
        if (!used) continue

        // 这个组件的所有使用点，连同它们的属性。
        //
        // **按括号配平找结束位置，不要用 `{0,N}?` 截断。** 多行 JSX 的
        // 属性块经常上百行，截短了会把后面的属性全漏掉 —— 于是每个 prop
        // 都被报成"没人传"，一屏误报。
        const usages = [...whole.matchAll(new RegExp(`<${comp}\\b`, "g"))]
          .map((u) => {
            const from = u.index! + u[0].length
            // 找到这个开标签的 `>`：跳过字符串和 `{...}` 里的内容。
            let depth = 0
            for (let i = from; i < whole.length; i++) {
              const c = whole[i]!
              if (c === "{") depth++
              else if (c === "}") depth--
              else if (c === ">" && depth === 0) return whole.slice(from, i)
            }
            return whole.slice(from, from + 4000)
          })
          .join("\n")

        for (const p of typeBlock.matchAll(/^\s{2}(\w+)\?:/gm)) {
          const prop = p[1]!
          // **`children` 是以嵌套 JSX 传的，不是 `children=` 属性。**
          // 不特判的话，任何一个带可选 children 的组件都会被报成
          // "没人传" —— `<AudioPlayer …><Waveform/></AudioPlayer>` 就是。
          if (prop === "children") continue
          // 组件内部真的用到了它才算数 —— 只在类型里写了没用到的不管。
          if (!new RegExp(`\\b${prop}\\b`).test(text.slice(m.index! + m[0].length))) continue
          if (!new RegExp(`\\b${prop}=`).test(usages)) {
            missing.push(`${name} <${comp}> 的 ${prop} 没有任何调用方传 → 这段 UI 等于不存在`)
          }
        }
      }
    }
    expect(missing).toEqual([])
  })

  it("不用原生 confirm / prompt / alert", () => {
    // **它们在 Tauri 的 webview 里永远不弹。** macOS 上是 WKWebView，
    // 要宿主实现 `WKUIDelegate` 的 `runJavaScriptConfirmPanel` 等方法才会
    // 弹对话框，而 wry 0.55 一个都没实现 —— 没有 delegate 时 WKWebView
    // **直接返回 false / null，不弹任何东西也不报错**。
    //
    // 这一条上线前有 9 处功能是死的：重命名、新建项目、删除会话、删除
    // skill、解散项目、新建关键词、微信退出 —— 点了毫无反应。
    //
    // 这类问题在浏览器里开发时看不出来（Chrome 实现了这些），只有装进
    // 桌面壳才会暴露，所以必须有一条静态检查挡住。用 `./Prompt` 里的
    // `confirm` / `prompt`（异步）。
    const bad: string[] = []
    for (const { name, text } of files()) {
      if (name === "Prompt.tsx") continue
      for (const m of text.matchAll(/window\.(confirm|prompt|alert)\s*\(/g)) {
        // 注释里提到它们是可以的 —— 上面那段说明就是。
        const line = text.slice(0, m.index!).split("\n").pop() ?? ""
        if (/^\s*(\*|\/\/)/.test(line)) continue
        bad.push(`${name} 用了 window.${m[1]} —— 在 Tauri 里它永远不弹`)
      }
    }
    expect(bad).toEqual([])
  })

  it("data-action-ui-id 不重复", () => {
    // 重复要么是复制粘贴漏改，要么是两个按钮在做同一件事 —— 后者更值得查：
    // 用户看到两个不同图标，会以为其中一个是别的功能。
    const seen = new Map<string, string[]>()
    for (const { name, text } of files()) {
      for (const m of text.matchAll(/data-action-ui-id="([^"]+)"/g)) {
        seen.set(m[1]!, [...(seen.get(m[1]!) ?? []), name])
      }
    }
    const dupes = [...seen]
      .filter(([, where]) => where.length > 1)
      .map(([id, where]) => `${id} 出现 ${where.length} 次（${[...new Set(where)].join(", ")}）`)
    expect(dupes).toEqual([])
  })

  it("用户能改的值都真的被送出去了", () => {
    // 画布输入框的「1:1」「1K」两个下拉**选了从来不传** —— 用户选 16:9
    // 出来还是方图，而且不报错。
    //
    // 这一类前一轮的人工排查没查到：它既不是"标签和行为对不上"（下拉本身
    // 工作正常），也不是"prop 没人传"。它是**受控控件的值从没离开过组件**。
    //
    // 判据：`value={x}` + 有 onChange 的控件，`x` 必须出现在实参位、
    // 对象值位、return 里，或被调用方法（`x.trim()`）。校准方式是把
    // Generate 里那两行设置摘掉 —— 摘掉报 2 个，接上报 0 个。
    const leaves = (text: string, v: string) => {
      const e = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const pats = [
        new RegExp(`\\(\\s*[^()]{0,80}\\b${e}\\b[^()]{0,80}\\)`),
        new RegExp(`[:,]\\s*${e}\\s*[,}\\n)]`),
        new RegExp(`return[^\\n]{0,80}\\b${e}\\b`),
        new RegExp(`\\b${e}\\s*\\.\\s*\\w+\\(`),
      ]
      for (const p of pats) {
        const m = p.exec(text)
        if (!m) continue
        // 排除 JSX 属性本身：`value={x}` 不算"送出去"。
        const before = text.slice(Math.max(0, m.index - 30), m.index)
        if (/(value|checked|options|disabled)=\{$/.test(before)) continue
        return true
      }
      return false
    }

    const dead: string[] = []
    for (const { name, text } of files()) {
      for (const m of text.matchAll(/value=\{(\w+)\}/g)) {
        const v = m[1]!
        const near = text.slice(Math.max(0, m.index! - 250), m.index! + 350)
        if (!near.includes("onChange")) continue
        if (!leaves(text, v)) dead.push(`${name} 的 ${v}：用户能改，但这个值从没被送出去`)
      }
    }
    expect([...new Set(dead)]).toEqual([])
  })

  it("同一个元素上没有两个 prop 绑到同一个表达式", () => {
    // 「放大查看」和「下载」曾经都是 `window.open(assetUrl(assetId))` ——
    // 两个不同标签的按钮做同一件事，而且做的都不是标签说的那件。
    const bad: string[] = []
    for (const { name, text } of files()) {
      for (const m of text.matchAll(/<[A-Z]\w+\b([\s\S]{0,1500}?)\/>/g)) {
        const attrs = m[1]!
        const handlers = [...attrs.matchAll(/\b(on[A-Z]\w+)=\{([^}]{8,120})\}/g)]
        const byBody = new Map<string, string[]>()
        for (const h of handlers) {
          const body = h[2]!.replace(/\s+/g, "")
          byBody.set(body, [...(byBody.get(body) ?? []), h[1]!])
        }
        for (const [body, names] of byBody) {
          if (names.length > 1) {
            bad.push(`${name}: ${names.join(" 和 ")} 绑到同一个表达式 ${body.slice(0, 60)}`)
          }
        }
      }
    }
    expect(bad).toEqual([])
  })
})
