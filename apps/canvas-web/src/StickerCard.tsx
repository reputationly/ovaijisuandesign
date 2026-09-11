/**
 * 贴纸节点和贴纸选择面板。逻辑在 `sticker.ts`,这里只管画。
 *
 * 文件名是 `StickerCard` 而不是 `Sticker` —— **macOS 的文件系统大小写不敏感**,
 * `Sticker.tsx` 和 `sticker.ts` 会被当成同一个文件，tsc 直接报
 * "differs only in casing"。仓里 `find.ts` / `FindBar.tsx` 就是这么错开的。
 *
 * 视觉规格取自官方的 `StickerNode` —— 我们走的正是他们的 **emoji 分支**
 * （`brandId` 那条走他们的 PNG 美术资源，我们不搬，见 sticker.ts 的说明）：
 *
 * ```
 * text-[2.75rem] leading-none
 * color:            var(--canvas-controls-text)
 * filter:           drop-shadow(0 2px 2px …22% …)
 * -webkit-text-stroke: 4px var(--canvas-controls-bg)
 * paint-order:      stroke fill
 * ```
 *
 * **描边那两行是关键。** 贴纸盖在图片上，而图片什么颜色都可能有 ——
 * 没有这圈和画布同色的描边，深色图上的深色 emoji 直接看不见。
 * `paint-order: stroke fill` 保证描边画在字底下，不然 4px 的边会把字啃掉一圈。
 */

import { memo } from "react"
import type { Node, NodeProps } from "@xyflow/react"

import type { NodeData } from "./canvas"
import { STICKERS, type StickerData } from "./sticker"

export const StickerNode = memo(function StickerNode({
  data,
  selected,
}: NodeProps<Node<NodeData>>) {
  const s = (data.raw.data ?? {}) as StickerData
  const preset = STICKERS.find((p) => p.id === s.brandId)
  const emoji = s.emoji || preset?.emoji || "⭐"
  const rotation = typeof s.rotation === "number" ? s.rotation : 0

  return (
    <div
      role="img"
      // 官方的 aria-label 就是这个形状：`Sticker ${id}` / `Sticker ${emoji}`。
      aria-label={preset ? `Sticker ${preset.label}` : `Sticker ${emoji}`}
      data-action-ui-id="canvas.sticker-node"
      // 官方也挂了这个属性。调试跟随关系时能直接在 DOM 里看出贴在谁身上。
      data-sticker-target-id={s.targetId}
      // 刚盖下去的那个带这个属性，触发落地回弹动画（见 styles.css）。
      // 520ms 后由 App 摘掉 —— 留着的话这个节点下次因为别的原因重渲染时
      // 会莫名其妙再抖一下。
      {...((data as { fresh?: boolean }).fresh ? { "data-sticker-fresh": "" } : {})}
      className="relative flex size-full items-center justify-center"
    >
      <span className="sticker-art size-full" style={{ "--sticker-rotation": `${rotation}deg` } as React.CSSProperties}>
        <span
          className="relative flex size-full items-center justify-center text-[2.75rem] leading-none"
          style={{
            color: "var(--canvas-controls-text)",
            filter: "drop-shadow(0 2px 2px color-mix(in srgb, var(--canvas-controls-text) 22%, transparent))",
            WebkitTextStroke: "4px var(--canvas-controls-bg)",
            paintOrder: "stroke fill",
          }}
        >
          {emoji}
        </span>
      </span>
      {/* 选中态是**虚线**框，和普通节点的实线描边区分开 —— 贴纸只有 56px，
          实线框套上去几乎盖住整个贴纸。官方也是 dashed。 */}
      {selected && (
        <span className="pointer-events-none absolute inset-0 border border-dashed opacity-70"
          style={{ borderColor: "var(--canvas-controls-text)" }} />
      )}
    </div>
  )
})

/**
 * 底部工具条上的贴纸面板。
 *
 * 文案逐条照官方 `canvas.toolbar.sticker*`。其中两句值得留意：
 *
 * - `stickerActive` =「Sticker 模式已开启，可连续点击盖章。」
 *   **"连续"两个字必须说。** 不说的话用户盖完一个会以为模式自动结束了，
 *   不知道可以接着盖第二个。
 * - `stickerRelationHint` 解释跟随和自由的区别 —— 这个区别在界面上看不出来，
 *   盖的时候一模一样，差别要等目标被拖动时才显现。
 */
export function StickerPicker({
  selected,
  onSelect,
  stamping,
  onStamping,
  count,
  onClear,
  hidden,
  onHidden,
}: {
  /** 当前选中的预设 id。 */
  selected: string
  onSelect: (id: string) => void
  /** 盖章模式开着没有。 */
  stamping: boolean
  onStamping: (v: boolean) => void
  /** 画布上有多少贴纸。为 0 时清除按钮置灰。 */
  count: number
  onClear: () => void
  hidden: boolean
  onHidden: (v: boolean) => void
}) {
  return (
    <div
      data-action-ui-id="canvas.sticker-picker"
      className="w-[268px] space-y-2 p-2.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px]" style={{ color: "var(--canvas-controls-text)" }}>
          Sticker
        </span>
        {/* 官方 `stickerCount` =「{{count}} 个 Sticker」。 */}
        <span className="text-[11px] tabular-nums" style={{ color: "var(--canvas-controls-text-muted)" }}>
          {count} 个 Sticker
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {STICKERS.map((p) => (
          <button
            key={p.id}
            type="button"
            data-action-ui-id={`canvas.sticker-picker-${p.id}`}
            aria-label={p.label}
            aria-pressed={selected === p.id}
            title={p.label}
            onClick={() => onSelect(p.id)}
            className="flex size-[30px] items-center justify-center rounded-md text-[17px] leading-none transition-colors"
            style={{
              background: selected === p.id ? "var(--canvas-controls-active)" : "transparent",
              outline: selected === p.id ? "1px solid var(--brand-accent)" : "none",
            }}
          >
            {p.emoji}
          </button>
        ))}
      </div>

      {/* 盖章开关。官方 `stickerMode` =「盖章」。 */}
      <button
        type="button"
        data-action-ui-id="canvas.sticker-toggle-stamp"
        aria-pressed={stamping}
        onClick={() => onStamping(!stamping)}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[12px] transition-colors"
        style={{
          background: stamping ? "var(--canvas-controls-active)" : "var(--bg-subtle)",
          color: "var(--canvas-controls-text)",
        }}
      >
        <span>盖章</span>
        <span
          className="flex h-[16px] w-[28px] items-center rounded-full px-[2px] transition-colors"
          style={{ background: stamping ? "var(--brand-accent)" : "var(--canvas-controls-border)" }}
        >
          <span
            className="size-[12px] rounded-full transition-transform"
            style={{
              background: "var(--canvas-controls-bg)",
              transform: stamping ? "translateX(12px)" : "none",
            }}
          />
        </span>
      </button>

      <p className="text-[11px] leading-4" style={{ color: "var(--canvas-controls-text-muted)" }}>
        {stamping
          ? "Sticker 模式已开启，可连续点击盖章。"
          : "选择 Sticker 后点击画布即可开始盖章。"}
      </p>
      <p className="text-[11px] leading-4" style={{ color: "var(--canvas-controls-text-muted)" }}>
        跟随目标会随选中的产物移动和缩放；自由贴纸只固定在画布位置。
      </p>

      <div className="flex items-center gap-1 border-t pt-2" style={{ borderColor: "var(--canvas-controls-border)" }}>
        <button
          type="button"
          data-action-ui-id="canvas.sticker-toggle-visibility"
          onClick={() => onHidden(!hidden)}
          disabled={count === 0}
          className="flex-1 rounded-md px-2 py-1.5 text-[12px] transition-colors enabled:hover:bg-[var(--canvas-controls-hover)] disabled:opacity-40"
          style={{ color: "var(--canvas-controls-text)" }}
        >
          {/* 官方 `showStickers` / `hideStickers`。说的是**点下去会发生什么**,
              不是当前状态 —— 按钮上写状态的话，用户永远在猜"隐藏"是说
              现在被隐藏了、还是点了会隐藏。 */}
          {hidden ? "显示全部" : "隐藏全部"}
        </button>
        <button
          type="button"
          data-action-ui-id="canvas.sticker-clear"
          onClick={onClear}
          disabled={count === 0}
          className="flex-1 rounded-md px-2 py-1.5 text-[12px] transition-colors enabled:hover:opacity-85 disabled:opacity-40"
          style={{ color: "var(--canvas-node-tag-red)" }}
        >
          清除
        </button>
      </div>
    </div>
  )
}
