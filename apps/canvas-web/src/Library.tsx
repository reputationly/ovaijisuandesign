import { FileText, FolderOpen, Image as ImageIcon, Music, Plus, Video } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"

import type { Project, Session } from "./api"

/**
 * 项目库。侧栏「项目库」进来的那一页。
 *
 * 官方这一页是项目卡片网格（`project-card` / `project.cover-collage`），
 * 每张卡拿项目里的作品拼一张封面。我们照这个结构做，但**封面用内容类型的
 * 图标而不是缩略图** —— 缩略图要按项目聚合一遍全部会话的资产，而那需要
 * 先把资产和会话关联起来，我们的资产索引现在是全工作区一份的。
 *
 * 先把"能看到项目、能建、能进去"这条路走通；封面是纯观感，后面单独补。
 */

const KIND_ICON: Record<string, ReactNode> = {
  image: <ImageIcon size={14} />,
  video: <Video size={14} />,
  audio: <Music size={14} />,
  text: <FileText size={14} />,
}

function when(ts: number) {
  if (!ts) return ""
  const d = new Date(ts * 1000)
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days === 0) return "今天"
  if (days === 1) return "昨天"
  if (days < 30) return `${days} 天前`
  return d.toLocaleDateString()
}

export function Library({
  sessions,
  projects,
  onOpenSession,
  onCreateProject,
  onDeleteProject,
  onNewSession,
}: {
  sessions: Session[]
  projects: Project[]
  onOpenSession: (id: string) => void
  onCreateProject: (name: string) => void
  onDeleteProject: (id: string) => void
  onNewSession: () => void
}) {
  const [open, setOpen] = useState<string | null>(null)

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of sessions) if (s.project) m.set(s.project, (m.get(s.project) ?? 0) + 1)
    return m
  }, [sessions])

  const inProject = open ? sessions.filter((s) => s.project === open) : []
  const ungrouped = sessions.filter((s) => !s.project)

  if (open) {
    const p = projects.find((x) => x.id === open)
    return (
      <div className="h-full overflow-auto px-8 py-6">
        {/* 面包屑。官方是 project-detail.breadcrumb-root / -current。 */}
        <nav className="mb-5 flex items-center gap-1.5 text-[13px]">
          <button
            onClick={() => setOpen(null)}
            className="text-[var(--muted-foreground)] hover:underline"
          >
            项目库
          </button>
          <span style={{ color: "var(--muted-foreground)" }}>/</span>
          <strong>{p?.name ?? "项目"}</strong>
        </nav>
        <SessionGrid
          items={inProject}
          onOpen={onOpenSession}
          empty="这个项目里还没有创作。在侧栏右键一条创作可以把它移进来。"
        />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto px-8 py-6">
      <div className="mb-5 flex items-center gap-3">
        <h1 className="text-[20px] font-semibold">项目库</h1>
        <span className="flex-1" />
        <button
          onClick={() => {
            const name = window.prompt("项目名字")?.trim()
            if (name) onCreateProject(name)
          }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px]"
          style={{ background: "var(--brand-accent)", color: "var(--brand-accent-foreground)" }}
        >
          <Plus size={15} /> 新建项目
        </button>
      </div>

      {projects.length === 0 ? (
        <p className="mb-8 text-[13px]" style={{ color: "var(--muted-foreground)" }}>
          还没有项目。项目用来把相关的创作归到一起 —— 建一个，然后在侧栏把创作拖进去。
        </p>
      ) : (
        <div className="mb-9 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setOpen(p.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                // 解散只去掉分组，里面的创作退回未分组 —— 说清楚，
                // 否则用户会以为这是一次连内容一起的删除而不敢点。
                if (window.confirm(`解散「${p.name}」？里面的创作会退回未分组，不会被删除。`))
                  onDeleteProject(p.id)
              }}
              className="rounded-xl border p-3 text-left transition-colors hover:bg-[var(--canvas-controls-hover)]"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="mb-2.5 flex h-24 items-center justify-center rounded-lg"
                style={{ background: "var(--bg-subtle)" }}
              >
                <FolderOpen size={26} style={{ color: "var(--muted-foreground)" }} />
              </div>
              <p className="truncate text-[13px] font-medium">{p.name}</p>
              <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                {counts.get(p.id) ?? 0} 个创作 · {when(p.createdAt)}
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-[15px] font-semibold">未分组</h2>
        <span className="flex-1" />
        <button
          onClick={onNewSession}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          <Plus size={14} /> 新建创作
        </button>
      </div>
      <SessionGrid items={ungrouped} onOpen={onOpenSession} empty="还没有创作。" />
    </div>
  )
}

function SessionGrid({
  items,
  onOpen,
  empty,
}: {
  items: Session[]
  onOpen: (id: string) => void
  empty: string
}) {
  if (items.length === 0) {
    return (
      <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
        {empty}
      </p>
    )
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
      {items.map((s) => (
        <button
          key={s.id}
          onClick={() => onOpen(s.id)}
          className="rounded-xl border p-3 text-left transition-colors hover:bg-[var(--canvas-controls-hover)]"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="mb-2.5 flex h-24 items-center justify-center gap-2 rounded-lg"
            style={{ background: "var(--bg-subtle)", color: "var(--muted-foreground)" }}
          >
            {s.kinds.length ? s.kinds.map((k) => <span key={k}>{KIND_ICON[k]}</span>) : <FileText size={16} />}
          </div>
          <p className="truncate text-[13px] font-medium">{s.name}</p>
          <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
            {s.nodeCount} 个节点 · {when(s.updatedAt)}
          </p>
        </button>
      ))}
    </div>
  )
}
