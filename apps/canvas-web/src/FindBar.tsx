import { ArrowDown, ArrowUp, ChevronRight, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import {
  DEFAULT_FIND_OPTIONS,
  findAll,
  nextIndex,
  replaceAll,
  replaceAt,
  type FindOptions,
} from "./find"

/**
 * 文本节点里的查找替换条。官方的 `canvas-text-find-bar`。
 *
 * 动作 id 也照官方：
 * `canvas-text-find-input` / `canvas-text-find-replace-input` /
 * `canvas-text-find-count` / `canvas-text-find-toggle-replace`。
 *
 * **逻辑不在这里**，全在 `find.ts` —— 零宽匹配、非法正则、`$` 占位符
 * 那几个坑在界面里很难测，抽出去之后有 13 个测试盯着。
 */
export function FindBar({
  text,
  onReplace,
  onClose,
  onHighlight,
}: {
  text: string
  /** 替换后的新全文。调用方负责写回。 */
  onReplace: (next: string) => void
  onClose: () => void
  /** 当前选中的那处匹配，用来在编辑器里高亮/滚动过去。 */
  onHighlight?: (m: { start: number; end: number } | null) => void
}) {
  const [query, setQuery] = useState("")
  const [replacement, setReplacement] = useState("")
  const [opts, setOpts] = useState<FindOptions>(DEFAULT_FIND_OPTIONS)
  const [showReplace, setShowReplace] = useState(false)
  const [i, setI] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const matches = useMemo(() => findAll(text, query, opts), [text, query, opts])

  // 换了查询或选项，序号要归零 —— 不归的话「第 7 / 2 个」这种会出现。
  useEffect(() => setI(0), [query, opts, text])
  useEffect(() => onHighlight?.(matches[i] ?? null), [matches, i, onHighlight])
  useEffect(() => inputRef.current?.focus(), [])

  const go = (d: number) => {
    if (matches.length === 0) return
    const from = matches[i] ? matches[i]!.start + (d > 0 ? 1 : 0) : 0
    setI(nextIndex(matches, from, d > 0))
  }

  const doReplace = () => {
    const m = matches[i]
    if (!m) return
    onReplace(replaceAt(text, m, replacement))
    // 替换后匹配集会重算，序号留在原地即可 —— 它现在指向"下一个"。
  }

  return (
    <div
      data-action-ui-id="canvas-text-find-bar"
      className="nodrag nopan nowheel flex flex-col gap-1.5 rounded-lg border p-1.5"
      style={{
        background: "var(--canvas-controls-bg)",
        borderColor: "var(--canvas-controls-border)",
        boxShadow: "var(--canvas-shadow-panel)",
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose()
        // 回车 = 下一个，Shift+回车 = 上一个。和编辑器里的通例一致。
        if (e.key === "Enter") {
          e.preventDefault()
          go(e.shiftKey ? -1 : 1)
        }
      }}
    >
      <div className="flex items-center gap-1">
        <button
          data-action-ui-id="canvas-text-find-toggle-replace"
          title="切换替换"
          onClick={() => setShowReplace((v) => !v)}
          className="flex size-6 items-center justify-center rounded hover:bg-[var(--canvas-controls-hover)]"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ChevronRight
            size={13}
            style={{ transform: showReplace ? "rotate(90deg)" : undefined }}
          />
        </button>
        <input
          ref={inputRef}
          data-action-ui-id="canvas-text-find-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="查找"
          className="w-40 rounded bg-transparent px-1.5 py-1 text-[12px] outline-none"
          style={{ border: "1px solid var(--border)" }}
        />
        <span
          data-action-ui-id="canvas-text-find-count"
          className="min-w-16 px-1 text-[11px] tabular-nums"
          style={{ color: "var(--muted-foreground)" }}
        >
          {/* 官方的 `canvas.find.noResults` =「无结果」。**空查询时不显示
              「无结果」** —— 那不是"没找到"，是"还没开始找"。 */}
          {query === "" ? "" : matches.length === 0 ? "无结果" : `${i + 1} / ${matches.length}`}
        </span>
        <Toggle on={opts.matchCase} title="区分大小写" onClick={() => setOpts((o) => ({ ...o, matchCase: !o.matchCase }))}>
          Aa
        </Toggle>
        <Toggle on={opts.wholeWord} title="全字匹配" onClick={() => setOpts((o) => ({ ...o, wholeWord: !o.wholeWord }))}>
          ab
        </Toggle>
        <Toggle on={opts.regex} title="使用正则表达式" onClick={() => setOpts((o) => ({ ...o, regex: !o.regex }))}>
          .*
        </Toggle>
        <Icon title="上一个匹配" onClick={() => go(-1)}>
          <ArrowUp size={13} />
        </Icon>
        <Icon title="下一个匹配" onClick={() => go(1)}>
          <ArrowDown size={13} />
        </Icon>
        <Icon title="关闭" onClick={onClose}>
          <X size={13} />
        </Icon>
      </div>

      {showReplace && (
        <div className="flex items-center gap-1 pl-7">
          <input
            data-action-ui-id="canvas-text-find-replace-input"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            placeholder="替换"
            className="w-40 rounded bg-transparent px-1.5 py-1 text-[12px] outline-none"
            style={{ border: "1px solid var(--border)" }}
          />
          <button
            onClick={doReplace}
            disabled={matches.length === 0}
            className="rounded px-2 py-1 text-[12px] enabled:hover:bg-[var(--canvas-controls-hover)] disabled:opacity-40"
          >
            替换
          </button>
          <button
            onClick={() => onReplace(replaceAll(text, query, replacement, opts).text)}
            disabled={matches.length === 0}
            className="rounded px-2 py-1 text-[12px] enabled:hover:bg-[var(--canvas-controls-hover)] disabled:opacity-40"
          >
            全部替换
          </button>
        </div>
      )}
    </div>
  )
}

function Toggle({
  on,
  title,
  onClick,
  children,
}: {
  on: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      aria-pressed={on}
      onClick={onClick}
      className="flex size-6 items-center justify-center rounded font-mono text-[11px]"
      style={{
        background: on ? "var(--bg-subtle)" : "transparent",
        color: on ? "var(--foreground)" : "var(--muted-foreground)",
      }}
    >
      {children}
    </button>
  )
}

function Icon({
  title,
  onClick,
  children,
}: {
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex size-6 items-center justify-center rounded hover:bg-[var(--canvas-controls-hover)]"
      style={{ color: "var(--muted-foreground)" }}
    >
      {children}
    </button>
  )
}
