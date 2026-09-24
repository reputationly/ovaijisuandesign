import { NodeToolbar as FlowNodeToolbar, Position, useStore } from "@xyflow/react"
import { ArrowUp, Loader2, X } from "lucide-react"
import { useEffect, useState } from "react"

import {
  ENHANCE_RESOLUTIONS,
  computeTarget,
  formatResolution,
  isBelowSource,
  suggestResolution,
  type EnhanceResolution,
} from "./enhance"

/**
 * 「高清增强」面板。**参数照官方 3.0.14 的 `EnhanceImagePopover`**：
 *
 * ```
 * 容器  NodeToolbar position=Bottom align=center offset=NODE_POPOVER_SAFE_GAP
 *       w-64 flex-col gap-3 rounded-lg border p-3
 *       bg-[--canvas-controls-bg]  shadow-[--canvas-shadow-dropdown]
 *       onPointerDown stopPropagation
 * 标题  font-heading text-[13px] font-medium text-[--canvas-controls-text]
 * 小标  text-[11px] text-[--canvas-controls-text-muted]
 * 分段  h-8 gap-0.5 rounded-md p-0.5  bg var(--canvas-controls-active, #ffffff14)
 *       项 flex-1 h-7 rounded-md px-2.5 text-[13px] font-medium
 *       选中 bg var(--canvas-primary-btn-bg) / color var(--canvas-primary-btn-icon)
 * 底行  justify-between pt-3，左「取消」size-8 图标钮，右「生成」图标钮
 * ```
 *
 * ## 为什么是 popover 不是对话框
 *
 * 官方把这个动作标成 `opens_dialog` 并注释：「打开目标分辨率选择器，
 * 用户点『生成』才执行，关掉算放弃」。它贴在节点下方而不是盖住全屏 ——
 * 因为选档位时要能看见原图。
 *
 * ## 比官方多一行：真实目标尺寸
 *
 * 官方不显示算出来的尺寸，因为他们的档位总能精确兑现。我们平台按总像素
 * 封顶在 4K，方图选 4K 时会被收到 2880×2880 —— 不显示的话用户看到的是
 * 「选了 4K，出来的长边是 2880」,而没有任何地方说明。
 */
export function EnhancePopover({
  nodeId,
  width,
  height,
  onSubmit,
  onClose,
}: {
  nodeId: string
  /** 原图的真实像素。量不出来时档位不禁用，但也算不出目标尺寸。 */
  width?: number
  height?: number
  /** 跑完才 resolve —— 面板靠它显示「生成中」。 */
  onSubmit: (resolution: EnhanceResolution) => Promise<void>
  onClose: () => void
}) {
  const [resolution, setResolution] = useState<EnhanceResolution>(() =>
    suggestResolution(width, height),
  )
  // 超分要跑几十秒。**面板留着显示进度**,不是提交就关 —— 关掉的话
  // 用户会以为点了没反应，然后反复点。
  const [busy, setBusy] = useState(false)

  // 官方：拖动 / 多选 / 框选时**藏起来但不关**（状态留着），
  // 取消选中才真的关。
  const dragging = useStore((s) => Array.from(s.nodeLookup.values()).some((n) => n.dragging))
  const multi = useStore(
    (s) => Array.from(s.nodeLookup.values()).filter((n) => n.selected).length > 1,
  )
  const selected = useStore((s) => !!s.nodeLookup.get(nodeId)?.selected)

  useEffect(() => {
    // 跑着的时候不关，否则唯一的进度提示就没了。
    if (!selected && !busy) onClose()
  }, [selected, busy, onClose])

  const below = isBelowSource(resolution, width, height)
  const target = computeTarget(resolution, width, height)

  return (
    <FlowNodeToolbar nodeId={nodeId} isVisible position={Position.Bottom} offset={12} align="center">
      <div
        className="nopan nodrag nowheel pointer-events-auto flex w-64 flex-col gap-3 rounded-lg border p-3"
        style={{
          display: dragging || multi ? "none" : undefined,
          background: "var(--canvas-controls-bg)",
          borderColor: "var(--brutalist-border-subtle)",
          boxShadow: "var(--canvas-shadow-dropdown)",
          animation: "toolbar-fade-in 150ms ease-out",
        }}
        data-canvas-chrome="true"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div
          className="text-[13px] font-medium"
          style={{ color: "var(--canvas-controls-text)" }}
        >
          高清增强
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px]" style={{ color: "var(--canvas-controls-text-muted)" }}>
            分辨率
          </span>
          <div
            className="flex h-8 items-center gap-0.5 rounded-md p-0.5"
            style={{ background: "var(--canvas-controls-active, #ffffff14)" }}
          >
            {ENHANCE_RESOLUTIONS.map((option) => {
              const active = option === resolution
              // **低于原图的档位禁掉，不是点了再报错。** 不禁的话算出来的
              // 目标尺寸小于原图，引擎会照办 —— 点「生成」得到一张更糊的图。
              const disabled = busy || isBelowSource(option, width, height)
              return (
                <button
                  key={option}
                  type="button"
                  disabled={disabled}
                  title={disabled ? "目标分辨率不高于原图" : undefined}
                  onClick={() => !disabled && option !== resolution && setResolution(option)}
                  className="h-7 flex-1 rounded-md px-2.5 text-[13px] font-medium transition-colors"
                  style={{
                    background: active ? "var(--canvas-primary-btn-bg, #fff)" : "transparent",
                    color: active
                      ? "var(--canvas-primary-btn-icon, #000)"
                      : "var(--canvas-controls-text, #fff)",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.5 : 1,
                  }}
                >
                  {formatResolution(option)}
                </button>
              )
            })}
          </div>
          {target && !below && (
            <span
              className="text-[11px] tabular-nums"
              style={{ color: "var(--canvas-controls-text-muted)" }}
            >
              → {target.targetWidth} × {target.targetHeight}
            </span>
          )}
        </div>

        <div className="flex w-full items-center justify-between pt-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="取消"
            title="取消"
            className="flex size-8 items-center justify-center rounded-md transition-colors duration-150"
            style={{ color: "var(--canvas-controls-text)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--canvas-controls-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X size={16} />
          </button>
          <button
            type="button"
            disabled={below || busy}
            onClick={() => {
              if (below || busy) return
              setBusy(true)
              // 成功了才关。失败时错误由上层报出来，面板也收掉 ——
              // 留一个转不动的面板比关掉更让人困惑。
              void onSubmit(resolution).finally(onClose)
            }}
            aria-label="生成"
            title={below ? "目标分辨率不高于原图" : "生成"}
            className="flex size-8 items-center justify-center rounded-md transition-opacity enabled:hover:opacity-85 disabled:opacity-40"
            style={{
              background: "var(--canvas-primary-btn-bg, #fff)",
              color: "var(--canvas-primary-btn-icon, #000)",
              cursor: below || busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
          </button>
        </div>
      </div>
    </FlowNodeToolbar>
  )
}
