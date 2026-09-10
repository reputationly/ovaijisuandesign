import {
  Boxes,
  ChevronUp,
  CircleDashed,
  Folder,
  Grid2x2,
  Hand,
  HelpCircle,
  LayoutPanelLeft,
  Map as MapIcon,
  Maximize2,
  Mouse as MouseIcon,
  MousePointer2,
  Palette,
  Plus,
  Workflow,
  X,
} from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
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

/** 一个挂菜单的按钮。点外面关掉，Esc 也关。 */
function MenuBtn({
  icon,
  title,
  children,
  wide,
}: {
  icon: ReactNode
  title: string
  children: (close: () => void) => ReactNode
  wide?: boolean
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("pointerdown", down)
    document.addEventListener("keydown", key)
    return () => {
      document.removeEventListener("pointerdown", down)
      document.removeEventListener("keydown", key)
    }
  }, [open])

  return (
    <div ref={box} className="relative">
      <Btn title={title} active={open} wide={wide} onClick={() => setOpen((v) => !v)}>
        {icon}
      </Btn>
      {open && (
        <div
          className="absolute top-full right-0 z-50 mt-2 min-w-[176px] rounded-lg border p-1"
          style={{
            background: "var(--canvas-controls-bg)",
            borderColor: "var(--brutalist-border-subtle)",
            boxShadow: "var(--canvas-shadow-menu)",
          }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

function MenuRow({
  children,
  onClick,
  active,
}: {
  children: ReactNode
  onClick?: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors"
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

/** 缩放档位。官方的 `canvas.toolbar-zoom-menu` 是一个下拉，不是纯 +/−。 */
const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2] as const

export function TopRightChrome({
  mode,
  onMode,
  minimap,
  onMinimap,
  bg,
  onBg,
  onTidy,
}: {
  mode: CanvasMode
  onMode: (m: CanvasMode) => void
  minimap: boolean
  onMinimap: (v: boolean) => void
  bg: string
  onBg: (id: string) => void
  onTidy: (kind: "grid" | "type") => void
}) {
  const { zoomIn, zoomOut, zoomTo, fitView } = useReactFlow()
  // 直接订阅 store 里的 transform，而不是自己在 onMove 里存 state ——
  // 后者在程序化缩放（zoomIn/fitView）时不会更新，显示的百分比会和实际脱节。
  const zoom = useStore((s) => s.transform[2])

  // 右键菜单里的"适应画布"。fitView 只在 ReactFlowProvider 内部拿得到，
  // 用一个自定义事件跨过去，比把整棵树重排简单得多。
  useEffect(() => {
    const fit = () => fitView({ duration: 200 })
    // 侧栏点某个节点 → 把它居中。只调视野，**不动节点坐标** ——
    // 点一下列表就把节点挪走是最糟的交互。
    const focus = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (typeof id === "string") void fitView({ nodes: [{ id }], duration: 260, maxZoom: 1 })
    }
    window.addEventListener("canvas:fit", fit)
    window.addEventListener("canvas:focus", focus)
    return () => {
      window.removeEventListener("canvas:fit", fit)
      window.removeEventListener("canvas:focus", focus)
    }
  }, [fitView])

  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
      <div className={CHROME} style={chromeStyle()}>
        {/* 整理（官方 canvas.toolbar-tidy）：按网格排 / 按媒体类型分组排 */}
        <MenuBtn icon={<LayoutPanelLeft size={16} />} title="整理">
          {(close) => (
            <>
              <MenuRow
                onClick={() => {
                  onTidy("grid")
                  close()
                }}
              >
                <Grid2x2 size={15} />
                按网格排列
              </MenuRow>
              <MenuRow
                onClick={() => {
                  onTidy("type")
                  close()
                }}
              >
                <Boxes size={15} />
                按类型分组
              </MenuRow>
              <div className="my-1 h-px" style={{ background: "var(--canvas-controls-border)" }} />
              <MenuRow
                onClick={() => {
                  fitView({ duration: 200 })
                  close()
                }}
              >
                <Maximize2 size={15} />
                适应画布
              </MenuRow>
            </>
          )}
        </MenuBtn>
        <Divider />

        <Btn title="缩小" onClick={() => zoomOut({ duration: 120 })}>
          −
        </Btn>
        <MenuBtn wide icon={<span className="tabular-nums">{Math.round(zoom * 100)}%</span>} title="缩放">
          {(close) => (
            <>
              {ZOOM_STEPS.map((z) => (
                <MenuRow
                  key={z}
                  active={Math.abs(zoom - z) < 0.01}
                  onClick={() => {
                    zoomTo(z, { duration: 160 })
                    close()
                  }}
                >
                  <span className="tabular-nums">{z * 100}%</span>
                </MenuRow>
              ))}
              <div className="my-1 h-px" style={{ background: "var(--canvas-controls-border)" }} />
              <MenuRow
                onClick={() => {
                  fitView({ duration: 200 })
                  close()
                }}
              >
                适应画布
              </MenuRow>
            </>
          )}
        </MenuBtn>
        <Btn title="放大" onClick={() => zoomIn({ duration: 120 })}>
          <Plus size={14} />
        </Btn>
        <Divider />

        {/* 四种排布模式 */}
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

        {/* 外观（官方 canvas.toolbar-appearance）：画布底色 9 档 */}
        <MenuBtn icon={<Palette size={16} />} title="外观">
          {() => (
            <div className="grid grid-cols-3 gap-1 p-1">
              {CANVAS_BACKGROUNDS.map((b) => (
                <button
                  key={b.id}
                  title={b.label}
                  onClick={() => onBg(b.id)}
                  className="h-8 w-8 rounded-md border transition-transform hover:scale-105"
                  style={{
                    background: `var(${b.varName})`,
                    borderColor:
                      bg === b.id
                        ? "var(--canvas-node-border-selected)"
                        : "var(--canvas-controls-border)",
                    borderWidth: bg === b.id ? 2 : 1,
                  }}
                />
              ))}
            </div>
          )}
        </MenuBtn>

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

/**
 * 底部工具坞。**尺寸全部是官方的常量**：
 *
 * ```text
 * CANVAS_TOOL_DOCK_HEIGHT_PX        44   坞本身的高度
 * CANVAS_TOOL_DOCK_CONTROL_SIZE_PX  36   每个控件
 * CANVAS_TOOL_DOCK_ICON_SIZE_PX     18   图标
 * CANVAS_TOOL_DOCK_BOTTOM_PX        12   离底边
 * 容器  flex items-center gap-px rounded-full border p-[5px]
 *       shadow-[var(--canvas-shadow-panel)]
 * ```
 *
 * 关键是 **`rounded-full`** —— 是个药丸，不是圆角矩形。条目顺序也照他们的：
 * `+ 主按钮 | 大分隔 | 选择/抓手分体下拉 | 便签 | …`。
 */
const DOCK_H = 44
const CTRL = 36
const ICON = 18

function DockBtn({
  children,
  title,
  onClick,
  active,
  primary,
}: {
  children: ReactNode
  title: string
  onClick?: () => void
  active?: boolean
  primary?: boolean
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex shrink-0 items-center justify-center rounded-full transition-colors"
      style={{
        width: CTRL,
        height: CTRL,
        background: primary
          ? "var(--canvas-primary-btn-bg)"
          : active
            ? "var(--canvas-controls-active)"
            : "transparent",
        color: primary ? "var(--canvas-primary-btn-icon)" : "var(--canvas-controls-text)",
      }}
      onMouseEnter={(e) => {
        if (primary) e.currentTarget.style.background = "var(--canvas-primary-btn-bg-hover)"
        else if (!active) e.currentTarget.style.background = "var(--canvas-controls-hover)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = primary
          ? "var(--canvas-primary-btn-bg)"
          : active
            ? "var(--canvas-controls-active)"
            : "transparent"
      }}
    >
      {children}
    </button>
  )
}

export type ToolMode = "select" | "hand"

export function BottomToolbar({
  onCreate,
  mode,
  onMode,
  onAssets,
  help,
  onHelp,
}: {
  onCreate?: () => void
  mode: ToolMode
  onMode: (m: ToolMode) => void
  onAssets: () => void
  help: boolean
  onHelp: (v: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", down)
    return () => document.removeEventListener("pointerdown", down)
  }, [open])

  const Active = mode === "hand" ? Hand : MousePointer2

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10 flex justify-center"
      style={{ bottom: 12 }}
    >
      <div
        ref={boxRef}
        className="nopan nodrag nowheel pointer-events-auto relative flex items-center gap-px rounded-full border p-[5px]"
        style={{
          height: DOCK_H,
          background: "var(--canvas-controls-bg)",
          borderColor: "var(--canvas-controls-border)",
          boxShadow: "var(--canvas-shadow-panel)",
        }}
      >
        <DockBtn primary title="新建" onClick={onCreate}>
          <Plus size={ICON} />
        </DockBtn>

        {/* 大分隔。官方是 ToolbarSeparator large。 */}
        <span
          className="mx-1.5 w-px"
          style={{ height: 22, background: "var(--canvas-controls-border)" }}
        />

        {/* 选择 / 抓手的分体按钮：左边切换、右边展开菜单。 */}
        <div className="flex items-center">
          <DockBtn
            title={mode === "hand" ? "抓手" : "选择"}
            active
            onClick={() => onMode(mode === "hand" ? "select" : "hand")}
          >
            <Active size={ICON} />
          </DockBtn>
          <button
            title="切换指针模式"
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-4 shrink-0 items-center justify-center rounded-full transition-colors"
            style={{ color: "var(--canvas-controls-text-muted)" }}
          >
            <ChevronUp size={12} />
          </button>
          {open && (
            <div
              className="absolute bottom-full left-0 z-50 mb-2 min-w-[176px] rounded-lg border p-1"
              style={{
                background: "var(--canvas-controls-bg)",
                borderColor: "var(--brutalist-border-subtle)",
                boxShadow: "var(--canvas-shadow-menu)",
              }}
            >
              {(
                [
                  ["select", "选择", <MousePointer2 key="s" size={15} />],
                  ["hand", "抓手", <Hand key="h" size={15} />],
                ] as const
              ).map(([id, label, icon]) => (
                <button
                  key={id}
                  role="menuitemradio"
                  aria-checked={mode === id}
                  onClick={() => {
                    onMode(id)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors"
                  style={{
                    color: "var(--canvas-controls-text)",
                    background: mode === id ? "var(--canvas-controls-active)" : "transparent",
                  }}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* 官方这里还有一个「便签」（Sticker 模式：在画布世界坐标上放标记）。
            **我们没做，所以不放这个按钮** —— 之前它只是翻转一个没人读的
            布尔值，点上去除了自己变蓝什么都不会发生。一个假按钮比少一个
            按钮更糟：用户会反复点，以为是自己用错了。 */}
        <DockBtn title="资产列表" onClick={onAssets}>
          <Folder size={ICON} />
        </DockBtn>
        <span
          className="mx-1 w-px"
          style={{ height: 22, background: "var(--canvas-controls-border)" }}
        />
        <div className="relative">
          <DockBtn title="快捷键" active={help} onClick={() => onHelp(!help)}>
            <HelpCircle size={ICON} />
          </DockBtn>
          {help && (
            <div
              className="absolute right-0 bottom-full z-50 mb-2 w-[248px] rounded-lg border p-3 text-[12px]"
              style={{
                background: "var(--canvas-controls-bg)",
                borderColor: "var(--brutalist-border-subtle)",
                boxShadow: "var(--canvas-shadow-menu)",
                color: "var(--canvas-controls-text)",
              }}
            >
              <p className="mb-2 font-medium">快捷键</p>
              {[
                ["空白处拖拽", "框选（选择模式）"],
                ["中键 / 右键拖拽", "平移画布"],
                ["滚轮", "平移；⌘/Ctrl + 滚轮缩放"],
                ["双击文本节点", "编辑"],
                ["右键", "菜单"],
                ["节点两侧 ⊕", "拉出连线"],
              ].map(([k, v]) => (
                <p key={k} className="flex justify-between gap-3 py-0.5">
                  <span style={{ color: "var(--canvas-controls-text-muted)" }}>{k}</span>
                  <span className="text-right">{v}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 空画布上的操作引导。
 *
 * 文案逐字取自官方 i18n 的 `canvas.emptyHint.*`：
 *
 * ```
 * primaryAction = 双击画布      primaryResult = 自由生成节点
 * spacePrefix   = 按住          kbd.space     = Space
 * spaceSuffix   = 可以拖拽画布
 * scrollPrefix  = 滚动          zoomSuffix    = 缩放画布
 * ariaLabel     = 画布操作引导
 * ```
 *
 * **说的是操作，不是状态。** "画布是空的"只是把用户已经看得见的事实又
 * 说了一遍；真正该告诉他的是下一步怎么做，以及这块区域怎么操作 ——
 * 拖拽和缩放这两件事在一块空白上是猜不出来的。
 *
 * `pointer-events-none`：它盖在画布上，能点穿才不会挡住双击。
 */
export function EmptyHint() {
  return (
    <div
      aria-label="画布操作引导"
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-6"
    >
      <div className="flex items-center gap-3">
        <MousePointer2
          size={20}
          className="-scale-x-100"
          style={{ color: "var(--brand-accent)", fill: "var(--brand-accent)" }}
        />
        <strong className="text-[15px]" style={{ color: "var(--foreground)" }}>
          双击画布
        </strong>
        <span className="text-[15px]" style={{ color: "var(--muted-foreground)" }}>
          自由生成节点
        </span>
      </div>
      <p
        className="flex flex-wrap items-center justify-center gap-1.5 text-[13px]"
        style={{ color: "var(--muted-foreground)" }}
      >
        <span>按住</span>
        <Kbd>Space</Kbd>
        <span>可以拖拽画布，滚动</span>
        <Kbd>
          <MouseIcon size={11} />
        </Kbd>
        <span>缩放画布</span>
      </p>
    </div>
  )
}

/** 键帽。官方那两处提示里的 `Space` 和鼠标图标都是这个样子。 */
function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd
      className="inline-flex h-[22px] items-center rounded-md px-1.5 font-sans text-[12px]"
      style={{
        background: "var(--bg-subtle)",
        border: "var(--divider-width) solid var(--elevated-border-color)",
        color: "var(--foreground)",
      }}
    >
      {children}
    </kbd>
  )
}

/**
 * 快捷键面板。
 *
 * **只列真的能用的。** 这个面板最容易变成一张愿望清单 —— 抄一份官方的
 * 快捷键表放上去，用户按了没反应，比没有这个面板更糟：他会以为是自己
 * 按错了，反复试。
 *
 * 下面每一条都对应 `App.tsx` 里一处真实配置，改动那边时这里要跟着改。
 */
const SHORTCUTS: { keys: string[]; desc: string }[] = [
  { keys: ["双击画布"], desc: "生成节点" },
  { keys: ["Space", "拖拽"], desc: "平移画布" },
  { keys: ["滚轮"], desc: "缩放画布" },
  { keys: ["中键 / 右键", "拖拽"], desc: "平移画布" },
  { keys: ["空白处拖拽"], desc: "框选节点" },
  { keys: ["右键"], desc: "打开菜单" },
  { keys: ["双击文本节点"], desc: "编辑内容" },
]

export function ShortcutPanel({ onClose }: { onClose: () => void }) {
  // Esc 关掉。面板是覆盖层，没有 Esc 的话只能去点那个小按钮。
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", k)
    return () => document.removeEventListener("keydown", k)
  }, [onClose])

  return (
    <div
      className="nopan nodrag nowheel absolute bottom-20 left-1/2 z-30 w-[300px] -translate-x-1/2 rounded-xl border p-3"
      style={{
        background: "var(--canvas-controls-bg)",
        borderColor: "var(--canvas-controls-border)",
        boxShadow: "var(--canvas-shadow-menu)",
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <strong className="text-[13px]">快捷键</strong>
        <button
          onClick={onClose}
          aria-label="关闭"
          className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-[var(--canvas-controls-hover)]"
          style={{ color: "var(--muted-foreground)" }}
        >
          <X size={14} />
        </button>
      </div>
      <ul className="space-y-1.5">
        {SHORTCUTS.map((s) => (
          <li key={s.desc + s.keys.join()} className="flex items-center justify-between gap-3">
            <span className="flex flex-wrap items-center gap-1">
              {s.keys.map((k, i) => (
                <span key={k} className="flex items-center gap-1">
                  {i > 0 && (
                    <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                      +
                    </span>
                  )}
                  <Kbd>{k}</Kbd>
                </span>
              ))}
            </span>
            <span className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
              {s.desc}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
