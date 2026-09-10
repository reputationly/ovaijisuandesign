import {
  ChevronDown,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  MoreHorizontal,
  Music,
  PanelLeft,
  Plus,
  Search,
  Sparkles,
  Video,
  Workflow,
} from "lucide-react"
import { useState, type ReactNode } from "react"

import type { View } from "./App"
import type { Project, Session } from "./api"
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
  const [open, setOpen] = useState(true)
  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 px-3 py-1 text-[12px] text-[var(--home-sidebar-section-text)]"
      >
        {title}
        <ChevronDown
          size={12}
          className="transition-transform"
          style={{ transform: open ? undefined : "rotate(-90deg)" }}
        />
      </button>
      {open && children}
    </div>
  )
}

export function Sidebar({
  dir,
  right,
  view,
  onView,
  onCollapse,
  sessions,
  projects,
  current,
  onOpenSession,
  onSessionMenu,
}: {
  dir: string
  right?: ReactNode
  view: View
  onView: (v: View) => void
  onCollapse: () => void
  sessions: Session[]
  projects: Project[]
  /** 当前打开的那条。列表里高亮它。 */
  current: string
  onOpenSession: (id: string) => void
  /** 右键 / 「…」，弹出重命名、移动、删除。 */
  onSessionMenu: (id: string, at: { x: number; y: number }) => void
}) {
  const [searching, setSearching] = useState(false)
  const [q, setQ] = useState("")
  const shown = sessions.filter(
    (s) => !q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase()),
  )
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
      {/* 红绿灯占位 + 右侧两个图标。高度对齐官方的 trafficLightPosition。
          **`data-tauri-drag-region` 是必须的**：窗口用 hiddenInset 之后就
          没有系统标题栏了，不自己声明一块可拖区域，整个窗口拖不动 ——
          只能靠边缘缩放，用起来像卡住了。按钮不受影响，Tauri 按事件目标
          判断，点在按钮上不会触发拖拽。 */}
      <div
        data-tauri-drag-region
        className="flex h-11 shrink-0 items-center justify-end gap-1 pr-2 pl-20"
      >
        <IconBtn title="搜索" onClick={() => setSearching((v) => !v)}>
          <Search size={16} />
        </IconBtn>
        <IconBtn title="收起侧栏" onClick={onCollapse}>
          <PanelLeft size={16} />
        </IconBtn>
      </div>

      {searching && (
        <div className="px-3 pb-2">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && (setQ(""), setSearching(false))}
            placeholder="按名字过滤"
            className="w-full rounded-md px-2 py-1.5 text-[13px] outline-none"
            style={{
              background: "var(--bg-subtle)",
              color: "var(--foreground)",
              border: "1px solid var(--sidebar-border)",
            }}
          />
        </div>
      )}

      <div className="flex items-center gap-2 px-3 pt-1 pb-3">
        <img src="/logo.png" alt="" width={24} height={24} className="shrink-0 rounded" />
        <strong className="font-brand text-[16px]">光谷爱计算</strong>
      </div>

      <nav className="px-2">
        {NAV.map((n) => (
          <button
            key={n.label}
            // ComfyUI 那条要一个本地 ComfyUI 服务，我们没有。
            // **禁用而不是点了没反应** —— 后者看起来是坏了，前者能看出是没有。
            disabled={n.id === "comfyui"}
            title={n.id === "comfyui" ? "需要本地 ComfyUI 服务，尚未接入" : undefined}
            onClick={() => onView(n.id as View)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] enabled:hover:bg-[var(--home-sidebar-nav-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              color: "var(--home-sidebar-primary-text)",
              background: view === n.id ? "var(--home-sidebar-nav-active)" : undefined,
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

      {/* 会话列表。**每条是一张独立画布**，点进去是切换工作内容。

          之前这里列的是当前画布上的节点 —— 看起来像几条独立创作，点进去
          却哪儿也没去，只是在同一张画布上选中一个节点。官方那栏从来就是
          会话，我们其实早就有多画布了，只是没接上来。 */}
      <div className="min-h-0 flex-1 overflow-auto pb-2">
        {/* 官方的结构是「项目」一个大标题，下面挂各个项目文件夹，
            每个文件夹再挂它的会话。**不是每个项目一个平级分组** ——
            那样项目多了以后，「未分组」会被挤到很下面，而它才是最常用的。 */}
        {projects.length > 0 && (
          <Section title="项目">
            {projects.map((p) => (
              <ProjectFolder
                key={p.id}
                name={p.name}
                items={shown.filter((s) => s.project === p.id)}
                current={current}
                onOpen={onOpenSession}
                onMenu={onSessionMenu}
              />
            ))}
          </Section>
        )}
        <Section title="未分组">
          <SessionList
            items={shown.filter((s) => !s.project)}
            current={current}
            onOpen={onOpenSession}
            onMenu={onSessionMenu}
            empty={q.trim() ? "没有匹配的创作" : "还没有创作"}
          />
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

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md",
        "text-[var(--home-sidebar-primary-text)] hover:bg-[var(--home-sidebar-nav-hover)]",
      )}
    >
      {children}
    </button>
  )
}

/**
 * 一组会话。
 *
 * 图标按会话里**实际有什么内容**选，不按创建时猜 —— 官方那栏一眼能看出
 * 这条出的是音频、视频还是图，靠的就是这个。空会话退回文档图标。
 */
function SessionList({
  items,
  current,
  onOpen,
  onMenu,
  empty,
}: {
  items: Session[]
  current: string
  onOpen: (id: string) => void
  onMenu: (id: string, at: { x: number; y: number }) => void
  empty: string
}) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-1.5 text-[12px] text-[var(--home-sidebar-section-text)]">{empty}</p>
    )
  }
  return (
    <div className="px-2">
      {items.map((s) => {
        // 多种内容时取第一种。顺序在 gateway 里固定成 image/video/audio/text，
        // 不是 read_dir 的顺序 —— 否则同一条会话的图标会自己变。
        const icon = KIND_ICON[s.kinds[0] ?? ""] ?? <FileText size={14} />
        const active = s.id === current
        return (
          <button
            key={s.id}
            onClick={() => onOpen(s.id)}
            onContextMenu={(e) => {
              e.preventDefault()
              onMenu(s.id, { x: e.clientX, y: e.clientY })
            }}
            title={`${s.name}  ·  ${s.nodeCount} 个节点`}
            className={cn(
              "group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px]",
              active
                ? "bg-[var(--home-sidebar-nav-active)] text-[var(--home-sidebar-primary-text)]"
                : "text-[var(--home-sidebar-secondary-text)] hover:bg-[var(--home-sidebar-nav-hover)]",
            )}
          >
            <span className="shrink-0 text-[var(--home-sidebar-section-text)]">{icon}</span>
            <span className="truncate">{s.name}</span>
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation()
                const r = (e.target as HTMLElement).getBoundingClientRect()
                onMenu(s.id, { x: r.left, y: r.bottom })
              }}
              className="ml-auto hidden shrink-0 rounded px-1 text-[var(--home-sidebar-section-text)] group-hover:block hover:bg-[var(--home-sidebar-nav-hover)]"
            >
              <MoreHorizontal size={14} />
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * 项目文件夹。点标题展开 / 收起。
 *
 * 默认展开：官方那样。收起的话，用户建完项目、把会话拖进去，侧栏上看起来
 * 那条会话就"消失"了 —— 得先发现有个能点开的三角。
 */
function ProjectFolder({
  name,
  items,
  current,
  onOpen,
  onMenu,
}: {
  name: string
  items: Session[]
  current: string
  onOpen: (id: string) => void
  onMenu: (id: string, at: { x: number; y: number }) => void
}) {
  // 里面有当前打开的那条时**强制展开** —— 否则用户从别处切进来，
  // 侧栏上完全看不出自己在哪。
  const hasCurrent = items.some((s) => s.id === current)
  const [open, setOpen] = useState(true)
  const expanded = open || hasCurrent
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-left text-[13px] text-[var(--home-sidebar-secondary-text)] hover:bg-[var(--home-sidebar-nav-hover)]"
      >
        <FolderOpen size={14} className="shrink-0 text-[var(--home-sidebar-section-text)]" />
        <span className="truncate">{name}</span>
        <ChevronDown
          size={12}
          className="ml-auto shrink-0 transition-transform"
          style={{ transform: expanded ? undefined : "rotate(-90deg)" }}
        />
      </button>
      {/* 缩进一档，看得出层级 */}
      {expanded && (
        <div className="pl-3">
          <SessionList
            items={items}
            current={current}
            onOpen={onOpen}
            onMenu={onMenu}
            empty="这个项目还没有创作"
          />
        </div>
      )}
    </div>
  )
}
