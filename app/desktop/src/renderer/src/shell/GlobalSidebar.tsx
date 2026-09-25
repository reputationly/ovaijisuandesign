import { useNavigate, useRouterState } from "@tanstack/react-router"
import { ArrowUpRight, ChevronDown, FolderOpen, MessageSquare, Pin, Plus, Search, ToyBrick, Workflow } from "lucide-react"
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Hint } from "../components/ui/tooltip"
import { cn } from "../lib"
import { useGlobalConfig } from "../stores/global-config"
import { groupByProject, sortWorkspaces, useWorkspaceList, type WorkspaceEntry } from "../stores/workspaces"
import { DotsVerticalIcon, PanelToggleIcon } from "./icons"
import { SidebarUserMenu } from "./SidebarUserMenu"

export const SIDEBAR_WIDTH = { min: 220, max: 360, rail: 64 } as const
/** macOS 红绿灯占掉的左侧宽度 */
const TRAFFIC_LIGHT_INSET = 76
const FOOTER_HEIGHT = 56

/**
 * 全局侧栏。两种形态：pinned（可拖宽，220–360）和 rail（只留 64px 图标轨）。
 * 宽度与形态存进全局偏好，重启后保持。
 */
export function GlobalSidebar() {
  const { t } = useTranslation()
  const width = useGlobalConfig((s) => s.config.globalSidebarWidth)
  const pinned = useGlobalConfig((s) => s.config.globalSidebarPinned)
  const update = useGlobalConfig((s) => s.update)
  const [resizing, setResizing] = useState(false)
  const w = pinned ? Math.min(SIDEBAR_WIDTH.max, Math.max(SIDEBAR_WIDTH.min, width)) : SIDEBAR_WIDTH.rail

  const startResize = useResizeHandle(w, (next) => update({ globalSidebarWidth: next }), setResizing)

  return (
    <div className="relative z-50 h-full shrink-0 transition-[width] duration-200 ease-out motion-reduce:transition-none" data-action-ui-id="global-sidebar-dock" data-mode={pinned ? "pinned" : "rail"} style={{ width: w, transitionDuration: resizing ? "0ms" : undefined }}>
      <div
        className="global-sidebar-footer-divider pointer-events-none absolute z-40 h-px"
        data-action-ui-id="global-sidebar-footer-divider"
        style={{ bottom: FOOTER_HEIGHT, left: 0, width: w + 8 }}
      />
      <div className="absolute inset-y-0 left-0" data-action-ui-id="global-sidebar-surface" data-presentation={pinned ? "docked" : "rail"} style={{ width: w }}>
        <aside
          className="transparent-window-home-sidebar relative flex h-full shrink-0 flex-col bg-transparent"
          data-action-ui-id="home-sidebar"
          aria-label={t("topbar.toggleGlobalSidebar")}
          data-presentation={pinned ? "docked" : "rail"}
          data-sidebar-density={pinned ? "full" : "rail"}
          style={{ width: w, ["--home-sidebar-icon-axis" as string]: "32px" }}
        >
          <ChromeRow pinned={pinned} onToggle={() => update({ globalSidebarPinned: !pinned })} />
          <BrandRow />
          <div className="shrink-0 pt-2">
            <NavButton to="/" id="home" icon={<Plus size={16} strokeWidth={1.5} />} label={t("home.newProject")} />
          </div>
          <div className="relative min-h-0 flex-1">
            <section
              className="home-sidebar-scroll flex h-full min-h-0 flex-col overflow-y-auto scrollbar-none home-sidebar-scroll-mask-active home-sidebar-scroll-mask-bottom"
              data-action-ui-id="home-sidebar.scroll"
              aria-label={t("homeSidebar.navigation")}
            >
              <div className="flex shrink-0 flex-col pb-[54px]" data-action-ui-id="home-sidebar.scroll-content">
                <NavButton to="/projects" id="projects" icon={<FolderOpen size={18} strokeWidth={1.5} />} label={t("project.hubTitle")} />
                <NavButton to="/skills" id="skills" icon={<ToyBrick size={18} strokeWidth={1.5} />} label={t("homeSidebar.skillCommunity")} />
                <NavButton
                  to="/workflows"
                  id="workflows"
                  icon={<Workflow size={18} strokeWidth={1.5} />}
                  label={t("homeSidebar.comfyWorkflows")}
                  badge="Beta"
                />
                {pinned ? <RecentProjects /> : null}
              </div>
            </section>
          </div>
          <div className="home-sidebar-footer relative w-full shrink-0 py-2">
            <SidebarUserMenu expanded={pinned} />
          </div>
          {pinned ? (
            <hr
              className="resize-col no-drag absolute inset-y-0 -right-1 z-30 m-0 h-full w-2 cursor-col-resize border-0 bg-transparent p-0"
              data-action-ui-id="home-sidebar.resize-handle"
              aria-label={t("a11y.resizeGlobalSidebar")}
              data-active={resizing}
              onPointerDown={startResize}
            />
          ) : null}
        </aside>
      </div>
    </div>
  )
}

/** 拖宽：记下起点，移动时实时写宽度，松手结束。拖动期间关掉宽度过渡，免得跟手发涩 */
function useResizeHandle(current: number, onChange: (w: number) => void, setActive: (v: boolean) => void) {
  const startRef = useRef({ x: 0, w: current })
  return useCallback(
    (e: ReactPointerEvent<HTMLHRElement>) => {
      e.preventDefault()
      startRef.current = { x: e.clientX, w: current }
      setActive(true)
      document.documentElement.dataset.columnResizeActive = "true"
      const move = (ev: PointerEvent) => {
        const next = startRef.current.w + ev.clientX - startRef.current.x
        onChange(Math.round(Math.min(SIDEBAR_WIDTH.max, Math.max(SIDEBAR_WIDTH.min, next))))
      }
      const up = () => {
        setActive(false)
        delete document.documentElement.dataset.columnResizeActive
        window.removeEventListener("pointermove", move)
        window.removeEventListener("pointerup", up)
      }
      window.addEventListener("pointermove", move)
      window.addEventListener("pointerup", up)
    },
    [current, onChange, setActive],
  )
}

function ChromeRow({ pinned, onToggle }: { pinned: boolean; onToggle: () => void }) {
  const { t } = useTranslation()
  const iconBtn =
    "no-drag relative z-50 flex size-8 shrink-0 items-center justify-center rounded-[10px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
  return (
    <div
      className={cn("relative flex h-10 items-center mac-window-drag-region shrink-0", pinned ? "justify-end" : "justify-center")}
      data-action-ui-id="global-sidebar.chrome-inset"
      style={{ paddingLeft: pinned ? TRAFFIC_LIGHT_INSET : 0 }}
    >
      <div className="home-sidebar-chrome-controls no-drag pointer-events-auto relative z-50 flex h-8 shrink-0 items-center gap-0.5 mr-0.5" data-action-ui-id="home-sidebar.chrome-controls">
        {pinned ? (
          <Hint content={`${t("topbar.search")} ⌘K`}>
            <button
              type="button"
              className={cn(iconBtn, "mx-0.5 my-1 text-[var(--topbar-icon-fg)] hover:bg-[var(--topbar-tab-inactive-bg-hover)] hover:text-[var(--topbar-icon-fg-hover)]")}
              data-action-ui-id="home-sidebar.global-search"
              aria-label={`${t("topbar.search")} ⌘K`}
            >
              <Search size={15} strokeWidth={1.75} />
            </button>
          </Hint>
        ) : null}
        <Hint content={t("topbar.toggleGlobalSidebar")}>
          <button
            type="button"
            className={cn(iconBtn, "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground")}
            data-action-ui-id="topbar.toggle-global-sidebar"
            aria-label={t("topbar.toggleGlobalSidebar")}
            onClick={onToggle}
          >
            <PanelToggleIcon active={pinned} className="pointer-events-none" />
          </button>
        </Hint>
      </div>
    </div>
  )
}

/** 品牌行：logo + 字标。字标用品牌毛笔字，收成图标轨时隐藏 */
function BrandRow() {
  const { t } = useTranslation()
  return (
    <div className="home-sidebar-brand-row relative flex h-10 shrink-0 items-center gap-1 pr-0.5 mac-window-drag-region" data-action-ui-id="home-sidebar.brand-row">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        <div className="relative flex size-[22px] shrink-0 items-center justify-center">
          <img src="/logo.png" alt={t("common.appName")} width={22} height={22} className="size-[22px] rounded-[5px]" draggable={false} data-action-ui-id="home-sidebar.brand" />
        </div>
        <span className="home-sidebar-detail font-brand min-w-0 truncate text-[16px] leading-none text-foreground">{t("common.appName")}</span>
      </div>
    </div>
  )
}

function NavButton({ to, id, icon, label, badge }: { to: string; id: string; icon: ReactNode; label: string; badge?: string }) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const active = to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`)
  const button = (
    <button
      type="button"
      className={cn(
        "group flex h-9 w-full items-center text-[14px] leading-[14px] transition-colors duration-100 cursor-pointer",
        active ? "text-foreground" : "text-[var(--home-sidebar-primary-text)] hover:text-foreground",
      )}
      data-action-ui-id={`home-sidebar-nav-${id}`}
      aria-current={active ? "page" : undefined}
      aria-label={badge ? `${label}, ${badge}` : undefined}
      onClick={() => void navigate({ to })}
    >
      <span
        className={cn(
          "home-sidebar-nav-pill relative isolate flex h-8 w-full items-center gap-2 rounded-md pr-1 before:pointer-events-none before:absolute before:inset-y-0 before:-z-10 before:rounded-md",
          active ? "before:bg-[var(--home-sidebar-nav-active)]" : "group-hover:before:bg-[var(--home-sidebar-nav-hover)]",
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center relative" data-action-ui-id="home-sidebar.nav-icon-slot">
          {icon}
        </span>
        <span className="home-sidebar-detail truncate leading-[normal]">{label}</span>
        {badge ? (
          <span className="home-sidebar-detail shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none bg-muted text-muted-foreground">{badge}</span>
        ) : null}
      </span>
    </button>
  )
  return button
}

/** 「项目」分区：按项目分组的最近工作区，未归入项目的放在「未分组」 */
function RecentProjects() {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const { data } = useWorkspaceList()
  const navigate = useNavigate()
  const currentId = useRouterState({
    select: (s) => (s.location.pathname.startsWith("/workspace") ? (s.location.search as { workspaceId?: string }).workspaceId : undefined),
  })
  const groups = groupByProject(sortWorkspaces(data?.workspaces ?? []), data?.projects ?? [])

  const open = (w: WorkspaceEntry) => void navigate({ to: "/workspace", search: { workspaceId: w.id } })

  return (
    <div data-action-ui-id="home-sidebar.recent-projects">
      <div className="group flex items-center pl-5 pr-2 pt-[18px] pb-0.5" data-action-ui-id="home-sidebar.recent-header">
        <button
          type="button"
          className="flex items-center gap-1 text-sm text-[var(--home-sidebar-section-text)] font-normal cursor-pointer hover:text-foreground focus-visible:outline-none"
          data-action-ui-id="home-sidebar.recent-section-toggle"
          aria-label={collapsed ? t("project.expand") : t("project.collapse")}
          onClick={() => setCollapsed((v) => !v)}
        >
          <span>{t("project.sidebarTitle")}</span>
          <ChevronDown size={14} strokeWidth={1.75} className={cn("shrink-0 text-muted-foreground transition-transform", collapsed && "-rotate-90")} />
        </button>
        <div className="ml-auto flex shrink-0 items-center gap-0.5" data-action-ui-id="home-sidebar.recent-header-actions">
          <HeaderAction id="home-sidebar.recent-sort-trigger" label={t("homeSidebar.recentProjectsMore")}>
            <DotsVerticalIcon size={16} />
          </HeaderAction>
          <HeaderAction id="home-sidebar.recent-create-project" label={t("project.create.trigger")} onClick={() => void navigate({ to: "/projects" })}>
            <Plus size={14} strokeWidth={1.5} />
          </HeaderAction>
        </div>
      </div>
      {collapsed ? null : (
        <div className="flex shrink-0 flex-col">
          {groups.map((g, i) => (
            <RecentGroup
              key={g.project?.id ?? "ungrouped"}
              first={i === 0}
              title={g.project?.name ?? t("project.ungrouped")}
              isProject={!!g.project}
              items={g.items}
              currentId={currentId}
              onOpen={open}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function HeaderAction({ id, label, children, onClick }: { id: string; label: string; children: ReactNode; onClick?: () => void }) {
  return (
    <Hint content={label}>
      <button
        type="button"
        className="select-none outline-none pointer-events-none flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-[opacity,background-color,color] duration-[80ms] hover:bg-foreground/[0.05] hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
        data-action-ui-id={id}
        aria-label={label}
        onClick={onClick}
      >
        {children}
      </button>
    </Hint>
  )
}

function RecentGroup({
  first,
  title,
  isProject,
  items,
  currentId,
  onOpen,
}: {
  first: boolean
  title: string
  isProject: boolean
  items: WorkspaceEntry[]
  currentId?: string
  onOpen: (w: WorkspaceEntry) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)
  const smallBtn =
    "flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none"
  return (
    <section className={cn("flex flex-col gap-px", !first && "pt-4")} data-action-ui-id="home-sidebar.recent-group">
      <div
        className={cn(
          "group relative isolate flex h-[32px] items-center gap-1 pr-2 text-sm before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:left-[calc(var(--hover-left)_-_6px)] before:-z-10 before:rounded-md select-none",
          isProject ? "text-[var(--home-sidebar-secondary-text)] hover:before:bg-[var(--home-sidebar-nav-hover)]" : "text-[var(--home-sidebar-section-text)]",
        )}
        data-action-ui-id="home-sidebar.recent-group-header"
        style={{ paddingLeft: 20, ["--hover-left" as string]: "20px" }}
      >
        {isProject ? (
          <button
            type="button"
            className="relative z-10 flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none"
            data-action-ui-id="home-sidebar.recent-group-toggle"
            aria-label={open ? t("project.collapse") : t("project.expand")}
            onClick={() => setOpen((v) => !v)}
          >
            <FolderOpen size={16} strokeWidth={1.5} />
          </button>
        ) : null}
        <button
          type="button"
          className={cn("flex min-w-0 items-center gap-1 cursor-pointer text-left", isProject && "flex-1")}
          data-action-ui-id="home-sidebar.recent-group-label"
          aria-label={title}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="min-w-0 truncate">{title}</span>
          {isProject ? null : <ChevronDown size={14} strokeWidth={1.75} className={cn("shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />}
        </button>
        {isProject ? null : (
          <>
            <div className="flex-1" />
            <Hint content={t("home.viewAll")}>
              <button type="button" className={cn(smallBtn, "pointer-events-none relative z-10 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100")} data-action-ui-id="home-sidebar.recent-group-ungrouped-view-all" aria-label={t("home.viewAll")}>
                <ArrowUpRight size={16} strokeWidth={1.5} />
              </button>
            </Hint>
          </>
        )}
      </div>
      {open ? (
        <ul className="flex shrink-0 flex-col gap-px" data-action-ui-id="home-sidebar.recent-group-items" style={{ paddingLeft: isProject ? 16 : 0 }}>
          {items.map((w) => (
            <RecentRow key={w.id} item={w} active={w.id === currentId} onOpen={() => onOpen(w)} />
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function RecentRow({ item, active, onOpen }: { item: WorkspaceEntry; active: boolean; onOpen: () => void }) {
  const { t } = useTranslation()
  return (
    <li
      className={cn(
        "group relative flex h-[32px] shrink-0 cursor-pointer items-center text-left text-sm transition-colors hover:text-foreground",
        active ? "text-foreground" : "text-[var(--home-sidebar-secondary-text)]",
      )}
      data-action-ui-id="home-sidebar-recent"
    >
      <button
        type="button"
        className={cn(
          "home-sidebar-nav-pill relative isolate flex h-8 w-full items-center gap-2 rounded-md before:pointer-events-none before:absolute before:inset-y-0 before:-z-10 before:rounded-md pr-2 text-left",
          active ? "before:bg-[var(--home-sidebar-nav-active)]" : "group-hover:before:bg-[var(--home-sidebar-nav-hover)]",
        )}
        data-action-ui-id="home-sidebar.recent-pill"
        onClick={onOpen}
      >
        <span className="relative flex size-6 shrink-0 overflow-hidden rounded-sm" data-action-ui-id="home-sidebar.recent-thumbnail">
          <span className="home-sidebar-recent-thumbnail-fallback flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-foreground/[0.04] text-sidebar-foreground">
            <MessageSquare className="size-3 opacity-40" strokeWidth={2} />
          </span>
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate">{item.name}</span>
        </span>
        <span className="relative flex h-4 shrink-0 items-center justify-center overflow-hidden transition-[width] duration-150 ease-out group-hover:w-5 group-focus-within:w-5 w-0" data-action-ui-id="home-sidebar.recent-trailing-slot" />
      </button>
      <div className="pointer-events-none absolute right-0.5 top-0 bottom-0 flex items-center gap-0.5 px-2 rounded-r-md opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 bg-[var(--home-sidebar-nav-hover)]">
        <Hint content={t("session.pin")}>
          <button
            type="button"
            className="pointer-events-auto flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/[0.1] hover:text-foreground focus-visible:outline-none"
            data-action-ui-id="home-sidebar-recent-pin"
            aria-label={t("session.pin")}
          >
            <Pin size={14} strokeWidth={1.5} />
          </button>
        </Hint>
        <button
          type="button"
          className="select-none outline-none pointer-events-auto flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none"
          data-action-ui-id="home-sidebar-recent-more"
          aria-label={t("homeSidebar.recentProjectActions")}
        >
          <DotsVerticalIcon size={14} />
        </button>
      </div>
    </li>
  )
}
