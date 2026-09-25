import { useNavigate, useRouterState } from "@tanstack/react-router"
import { FolderOpen, Plus, Search, ToyBrick, Workflow } from "lucide-react"
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Hint } from "../components/ui/tooltip"
import { cn } from "../lib"
import { useGlobalConfig } from "../stores/global-config"
import { PanelToggleIcon } from "./icons"
import { RecentProjects } from "./RecentProjects"
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
