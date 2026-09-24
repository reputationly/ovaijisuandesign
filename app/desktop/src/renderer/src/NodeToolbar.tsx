import { NodeToolbar as FlowNodeToolbar, Position, useStore } from "@xyflow/react"
import { Copy, Crop, Download, Maximize2, Sparkles, Trash2, Wand2 } from "lucide-react"
import type { ReactNode } from "react"

/**
 * 选中节点时浮出的操作条。**参数照官方的 NodeToolbarPalette**：
 *
 * ```
 * 容器  gap-0.5  rounded-lg  border-[--brutalist-border-subtle]  p-1
 *       hover/focus-within 时边框加深，transition-colors
 *       background: var(--canvas-controls-bg)
 *       data-canvas-chrome="true"，onPointerDown stopPropagation
 * 按钮  h-10 min-w-10 gap-0.5 p-2.5 rounded-[8px] transition-colors
 *       hover 背景 var(--canvas-controls-hover)
 * 位置  Position.Top，offset = HEADER_FLOW_HEIGHT(28) * zoom + TOOLBAR_GAP(12)
 * ```
 *
 * `offset` 要乘 zoom：工具栏是屏幕坐标，而它要让开的那 28px 标题行是画布
 * 坐标 —— 不乘的话缩小画布时工具栏会压在节点上。
 *
 * **拖拽 / 多选 / 框选时整条隐藏**（官方也是），否则拖着节点走的时候
 * 有个东西一直跟在上面跳。
 */

const HEADER_FLOW_HEIGHT = 28
const TOOLBAR_GAP = 12

function Btn({
  children,
  title,
  onClick,
  danger,
}: {
  children: ReactNode
  title: string
  onClick?: () => void
  danger?: boolean
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-9 min-w-9 shrink-0 items-center justify-center gap-0.5 rounded-[8px] p-2 transition-colors disabled:opacity-50"
      style={{ color: danger ? "var(--canvas-node-tag-red)" : "var(--canvas-controls-text)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--canvas-controls-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  )
}

export function NodeToolbar({
  nodeId,
  visible,
  onDelete,
  onDuplicate,
  onOpen,
  onDownload,
  onCrop,
  onUpscale,
  onGenerate,
}: {
  nodeId: string
  visible: boolean
  onDelete?: () => void
  onDuplicate?: () => void
  onOpen?: () => void
  onDownload?: () => void
  /** 裁剪 / 旋转与镜像。**只有图片节点有** —— 视频要逐帧处理，那是另一件事。 */
  onCrop?: () => void
  /** 打开「高清增强」面板。官方 `canvas.enhanceImage.*`。 */
  onUpscale?: () => void
  onGenerate?: () => void
}) {
  const zoom = useStore((s) => s.transform[2])
  // 拖动中不显示。`dragging` 是 React Flow 挂在节点上的状态。
  const dragging = useStore((s) => Array.from(s.nodeLookup.values()).some((n) => n.dragging))
  const multi = useStore((s) => Array.from(s.nodeLookup.values()).filter((n) => n.selected).length > 1)

  if (!visible || dragging || multi) return null

  return (
    <FlowNodeToolbar
      nodeId={nodeId}
      isVisible
      position={Position.Top}
      offset={HEADER_FLOW_HEIGHT * zoom + TOOLBAR_GAP}
      align="center"
    >
      <div
        className="nopan nodrag nowheel pointer-events-auto relative z-[1] flex w-max items-center gap-0.5 rounded-lg border p-1 transition-colors select-none"
        style={{
          background: "var(--canvas-controls-bg)",
          borderColor: "var(--brutalist-border-subtle)",
          boxShadow: "var(--canvas-shadow-panel)",
          animation: "toolbar-fade-in 140ms ease-out",
        }}
        data-canvas-chrome="true"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {onGenerate && (
          <Btn title="以此生成" onClick={onGenerate}>
            <Wand2 size={16} />
          </Btn>
        )}
        {onOpen && (
          <Btn title="放大查看" onClick={onOpen}>
            <Maximize2 size={16} />
          </Btn>
        )}
        {/* 官方这个位置是一排编辑工具（裁剪/高清/重绘/…）。重绘 / 擦除 /
            扩图 / 去背景 / 重打光要 inpaint / 抠图 / relight 这类专门模型，
            平台上一个都没有（查到底了，见 velo.rs 旁边那轮排查）——
            没做的不放按钮。 */}
        {onCrop && (
          <Btn title="裁剪 · 旋转" onClick={onCrop}>
            <Crop size={16} />
          </Btn>
        )}
        {/* 高清增强。**只开面板，档位在面板里选** —— 官方
            `canvas.enhanceImage.*`,交互标成 `opens_dialog`:
            「选完点『生成』才执行，关掉算放弃」。 */}
        {onUpscale && (
          <Btn title="高清增强" onClick={onUpscale}>
            <Sparkles size={16} />
          </Btn>
        )}
        {onDownload && (
          <Btn title="下载" onClick={onDownload}>
            <Download size={16} />
          </Btn>
        )}
        {onDuplicate && (
          <Btn title="复制" onClick={onDuplicate}>
            <Copy size={16} />
          </Btn>
        )}
        {onDelete && (
          <>
            <span
              className="mx-0.5 h-5 w-px"
              style={{ background: "var(--canvas-controls-border)" }}
            />
            <Btn title="删除" onClick={onDelete} danger>
              <Trash2 size={16} />
            </Btn>
          </>
        )}
      </div>
    </FlowNodeToolbar>
  )
}
