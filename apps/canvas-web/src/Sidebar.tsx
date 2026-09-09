import {
  ChevronDown,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Music,
  PanelLeft,
  Plus,
  Search,
  Sparkles,
  Video,
  Workflow,
} from "lucide-react"
import type { ReactNode } from "react"

import type { CanvasFile, NodeDetail } from "./api"
import { cn } from "./lib"

/**
 * 左侧栏。结构按官方 3.0.12 的界面复刻。
 *
 * 宽度用他们的 `--sidebar-width: 264px`，配色用 `--sidebar*` /
 * `--home-sidebar-*` 那几个变量 —— 值都是从他们样式表里量的。
 *
 * **顶部要给红绿灯让位。** macOS 上窗口用 `titleBarStyle: hiddenInset`，
 * 红绿灯浮在内容之上（官方的 `trafficLightPosition` 是 `{x:12, y:12}`）。
 * 现在跑在浏览器里没有红绿灯，但套 Tauri 壳之后就有了 —— 预留出来，
 * 到时候不用再改布局。
 */

const NAV = [
  { id: "home", icon: <Plus size={16} />, label: "开始创作" },
  { id: "library", icon: <FolderOpen size={16} />, label: "项目库" },
  { id: "skill", icon: <Sparkles size={16} />, label: "Skill" },
  { id: "comfyui", icon: <Workflow size={16} />, label: "ComfyUI 工作流", badge: "Beta" },
]

/** 节点类型 → 列表里的小图标。和画布上节点标签用的是同一套分类。 */
const KIND_ICON: Record<string, ReactNode> = {
  image: <ImageIcon size={14} />,
  video: <Video size={14} />,
  audio: <Music size={14} />,
  text: <FileText size={14} />,
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <button className="flex w-full items-center gap-1 px-3 py-1 text-[12px] text-[var(--home-sidebar-section-text)]">
        {title}
        <ChevronDown size={12} />
      </button>
      {children}
    </div>
  )
}

export function Sidebar({
  file,
  details,
  dir,
  right,
  view,
  onView,
}: {
  file: CanvasFile | null
  details: Map<string, NodeDetail>
  dir: string
  right?: ReactNode
  view: "home" | "canvas"
  onView: (v: "home" | "canvas") => void
}) {
  return (
    <aside
      className="flex h-full shrink-0 flex-col border-r"
      style={{
        width: "var(--sidebar-width)",
        background: "var(--sidebar)",
        borderColor: "var(--sidebar-border)",
        color: "var(--sidebar-foreground)",
      }}
    >
      {/* 红绿灯占位 + 右侧两个图标。高度对齐官方的 trafficLightPosition。 */}
      <div className="flex h-11 shrink-0 items-center justify-end gap-1 pr-2 pl-20">
        <IconBtn>
          <Search size={16} />
        </IconBtn>
        <IconBtn>
          <PanelLeft size={16} />
        </IconBtn>
      </div>

      <div className="flex items-center gap-2 px-3 pt-1 pb-3">
        <img src="/logo.png" alt="" width={24} height={24} className="shrink-0 rounded" />
        <strong className="text-[15px]">ovaijisuandesign</strong>
      </div>

      <nav className="px-2">
        {NAV.map((n) => (
          <button
            key={n.label}
            onClick={() => (n.id === "home" || n.id === "skill" ? onView("home") : undefined)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] hover:bg-[var(--home-sidebar-nav-hover)]"
            style={{
              color: "var(--home-sidebar-primary-text)",
              background:
                view === "home" && n.id === "home" ? "var(--home-sidebar-nav-active)" : undefined,
            }}
          >
            {n.icon}
            <span className="truncate">{n.label}</span>
            {n.badge && (
              <span className="ml-auto rounded px-1 py-px text-[10px] text-[var(--home-sidebar-section-text)] ring-1 ring-[var(--sidebar-border)] ring-inset">
                {n.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* 画布上的节点当"未分组"列表。官方那栏是会话列表，我们还没有会话
          概念 —— 用节点填是诚实的近似，而不是画一个假的空壳。 */}
      <div className="min-h-0 flex-1 overflow-auto">
        <Section title="未分组">
          <div className="px-2">
            {(file?.nodes ?? []).map((n) => {
              const d = details.get(n.id)
              return (
                <button
                  key={n.id}
                  onClick={() => onView("canvas")}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-[var(--home-sidebar-secondary-text)] hover:bg-[var(--home-sidebar-nav-hover)]"
                  title={d?.name ?? n.id}
                >
                  <span className="shrink-0 text-[var(--home-sidebar-section-text)]">
                    {KIND_ICON[n.type] ?? <FileText size={14} />}
                  </span>
                  <span className="truncate">{d?.name ?? n.id.slice(0, 8)}</span>
                </button>
              )
            })}
            {!file?.nodes.length && (
              <p className="px-2 py-1.5 text-[12px] text-[var(--home-sidebar-section-text)]">
                画布是空的
              </p>
            )}
          </div>
        </Section>
      </div>

      <div
        className="flex items-center gap-2 border-t px-3 py-2.5 text-[13px]"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-accent)] text-[11px] text-[var(--brand-accent-foreground)]">
          ov
        </span>
        <span className="truncate text-[var(--home-sidebar-secondary-text)]" title={dir}>
          {dir ? dir.split("/").pop() : "连接中…"}
        </span>
        <span className="ml-auto">{right}</span>
      </div>
    </aside>
  )
}

function IconBtn({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md",
        "text-[var(--home-sidebar-primary-text)] hover:bg-[var(--home-sidebar-nav-hover)]",
      )}
    >
      {children}
    </button>
  )
}
