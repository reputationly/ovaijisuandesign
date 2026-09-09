import {
  Boxes,
  CircleDashed,
  Folder,
  Grid2x2,
  HelpCircle,
  LayoutPanelLeft,
  Map as MapIcon,
  MousePointer2,
  Plus,
  Sticker,
  Workflow,
} from "lucide-react"
import { useEffect, type ReactNode } from "react"
import { useReactFlow, useStore } from "@xyflow/react"

import { CANVAS_MODES, type CanvasMode } from "./api"
import { cn } from "./lib"

/**
 * 画布上的浮层控件。官方把它们摆成两处，我们照做：
 *
 * - **右上**：布局、缩放（− 100% +）、模式切换、小地图开关
 * - **底部居中**：一个圆形主按钮 + 一排工具
 *
 * 都是 `position: absolute` 浮在画布之上，不占布局 —— 这也是为什么官方的
 * 画布能一直铺满：控件不挤压可视区域。React Flow 自带的 `<Controls>` 在
 * 左下角，我们不用它。
 *
 * 容器加 `nopan nodrag nowheel`：不加的话在控件上滚轮会缩放画布、
 * 拖拽会平移画布，点按钮变成一件很难的事。
 */

const CHROME =
  "nopan nodrag nowheel pointer-events-auto flex items-center gap-0.5 rounded-lg border p-1"

function chromeStyle(): React.CSSProperties {
  return {
    background: "var(--canvas-controls-bg)",
    borderColor: "var(--brutalist-border-subtle)",
    boxShadow: "var(--canvas-shadow-panel)",
  }
}

function Btn({
  children,
  onClick,
  active,
  title,
  wide,
}: {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  title?: string
  wide?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        // 官方的工具栏按钮：h-10 min-w-10 rounded-[8px]，我们缩到 h-8
        // 适配这个更紧凑的布局，圆角和交互反馈照抄。
        "flex h-8 shrink-0 items-center justify-center gap-1 rounded-[8px] px-2 text-[13px] transition-colors",
        wide ? "min-w-0" : "min-w-8",
      )}
      style={{
        color: "var(--canvas-controls-text)",
        background: active ? "var(--canvas-controls-active)" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--canvas-controls-hover)"
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent"
      }}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px" style={{ background: "var(--canvas-controls-border)" }} />
}

export function TopRightChrome({
  mode,
  onMode,
  minimap,
  onMinimap,
}: {
  mode: CanvasMode
  onMode: (m: CanvasMode) => void
  minimap: boolean
  onMinimap: (v: boolean) => void
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  // 直接订阅 store 里的 transform，而不是自己在 onMove 里存 state ——
  // 后者在程序化缩放（zoomIn/fitView）时不会更新，显示的百分比会和实际脱节。
  const zoom = useStore((s) => s.transform[2])

  // 右键菜单里的"适应画布"。fitView 只在 ReactFlowProvider 内部拿得到，
  // 用一个自定义事件跨过去，比把整棵树重排简单得多。
  useEffect(() => {
    const fit = () => fitView({ duration: 200 })
    window.addEventListener("canvas:fit", fit)
    return () => window.removeEventListener("canvas:fit", fit)
  }, [fitView])

  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
      <div className={CHROME} style={chromeStyle()}>
        <Btn title="适应画布" onClick={() => fitView({ duration: 200 })}>
          <LayoutPanelLeft size={16} />
        </Btn>
        <Divider />
        <Btn title="缩小" onClick={() => zoomOut({ duration: 120 })}>
          −
        </Btn>
        <Btn wide title="100%" onClick={() => fitView({ duration: 200 })}>
          <span className="tabular-nums">{Math.round(zoom * 100)}%</span>
        </Btn>
        <Btn title="放大" onClick={() => zoomIn({ duration: 120 })}>
          <Plus size={14} />
        </Btn>
        <Divider />
        {/* 四种排布模式。官方是 grid / storyboard / workflow 那几个图标， */}
        {CANVAS_MODES.map((m) => (
          <Btn key={m} title={m} active={m === mode} onClick={() => onMode(m)}>
            {m === "grid" ? (
              <Grid2x2 size={16} />
            ) : m === "workflow" ? (
              <Workflow size={16} />
            ) : m === "storyboard" ? (
              <Boxes size={16} />
            ) : (
              <CircleDashed size={16} />
            )}
          </Btn>
        ))}
        <Divider />
        <Btn wide active={minimap} title="小地图" onClick={() => onMinimap(!minimap)}>
          <MapIcon size={16} />
          <span>小地图</span>
        </Btn>
      </div>
    </div>
  )
}

/**
 * 画布底色。官方给了 9 档（`--canvas-bg-*`），是画布层面的外观设置，
 * 不是主题切换 —— 明暗两套里每一档都有对应的值。
 */
export const CANVAS_BACKGROUNDS = [
  { id: "default", label: "默认", varName: "--canvas-bg" },
  { id: "warm", label: "暖", varName: "--canvas-bg-warm" },
  { id: "cool", label: "冷", varName: "--canvas-bg-cool" },
  { id: "paper", label: "纸", varName: "--canvas-bg-paper" },
  { id: "sage", label: "鼠尾草", varName: "--canvas-bg-sage" },
  { id: "sand", label: "沙", varName: "--canvas-bg-sand" },
  { id: "mist-blue", label: "雾蓝", varName: "--canvas-bg-mist-blue" },
  { id: "lavender", label: "薰衣草", varName: "--canvas-bg-lavender" },
  { id: "blush", label: "藕", varName: "--canvas-bg-blush" },
] as const

export function BackgroundPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className={CHROME} style={chromeStyle()}>
      {CANVAS_BACKGROUNDS.map((b) => (
        <button
          key={b.id}
          title={b.label}
          onClick={() => onChange(b.id)}
          className="h-5 w-5 shrink-0 rounded-full border transition-transform hover:scale-110"
          style={{
            background: `var(${b.varName})`,
            borderColor:
              value === b.id ? "var(--canvas-node-border-selected)" : "var(--canvas-controls-border)",
            borderWidth: value === b.id ? 2 : 1,
          }}
        />
      ))}
    </div>
  )
}

export function BottomToolbar({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
      <div className={CHROME} style={chromeStyle()}>
        {/* 主按钮：实心圆，官方是整条工具栏里唯一的高对比元素。 */}
        <button
          onClick={onCreate}
          title="新建"
          className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-85"
          style={{
            background: "var(--canvas-primary-btn-bg)",
            color: "var(--canvas-primary-btn-icon)",
          }}
        >
          <Plus size={18} />
        </button>
        <Btn active title="选择">
          <MousePointer2 size={16} />
        </Btn>
        <Btn title="框选">
          <CircleDashed size={16} />
        </Btn>
        <Btn title="便签">
          <Sticker size={16} />
        </Btn>
        <Btn title="素材">
          <Folder size={16} />
        </Btn>
        <Divider />
        <Btn title="帮助">
          <HelpCircle size={16} />
        </Btn>
      </div>
    </div>
  )
}
