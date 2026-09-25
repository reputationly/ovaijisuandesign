import { Popover as BasePopover } from "@base-ui/react/popover"
import { useNavigate } from "@tanstack/react-router"
import {
  BookOpen,
  Brain,
  ChevronRight,
  CircleArrowUp,
  FileText,
  GraduationCap,
  Monitor,
  Moon,
  Palette,
  Settings,
  Smartphone,
  Sun,
  UserRound,
} from "lucide-react"
import { useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { runtimeConfig } from "../api/runtime"
import { Hint } from "../components/ui/tooltip"
import { cn } from "../lib"
import type { ThemePref } from "../stores/global-config"
import { useSettingsDialog } from "../stores/ui"
import { useTheme } from "../theme/ThemeProvider"

/**
 * 侧栏底部：头像行 + 弹出的用户菜单。
 * 我们没有账号体系，头像处显示本机用户；菜单只保留主题、设置、帮助这些本地有意义的项。
 */
export function SidebarUserMenu({ expanded }: { expanded: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const openSettings = useSettingsDialog((s) => s.openAt)

  return (
    <div className="sidebar-user-menu" data-expanded={expanded}>
      <div className="relative" data-action-ui-id="sidebar.user-avatar">
        <BasePopover.Root open={open} onOpenChange={setOpen}>
          <div className="sidebar-user-menu-trigger-row flex h-10 w-full items-center gap-1">
            <div className="min-w-0 flex-1">
              <BasePopover.Trigger
                className="group/avatar-trigger flex h-10 w-full min-w-0 cursor-pointer items-center text-left text-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                data-action-ui-id="user-menu.trigger"
                title={t("sidebar.user")}
              >
                <span className="sidebar-user-menu-trigger-content flex h-9 w-full min-w-0 items-center gap-2 rounded-md pr-2 transition-colors group-hover/avatar-trigger:bg-foreground/[0.04]">
                  <Avatar size="size-7" />
                  <span className="sidebar-user-menu-detail min-w-0 flex-1 truncate text-body-14">{t("sidebar.user")}</span>
                </span>
              </BasePopover.Trigger>
            </div>
            {expanded ? (
              <Hint content={t("imBridge.menuLabel.domestic")}>
                <button
                  type="button"
                  className="relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 size-7"
                  data-action-ui-id="user-menu.im-bridge-shortcut"
                  aria-label={t("imBridge.menuLabel.domestic")}
                  onClick={() => openSettings("imBridge")}
                >
                  <Smartphone size={16} strokeWidth={1.5} className="text-foreground opacity-50" />
                </button>
              </Hint>
            ) : null}
          </div>
          <BasePopover.Portal>
            <BasePopover.Positioner side="top" align="start" sideOffset={4} alignOffset={8} className="z-50">
              <BasePopover.Popup className="elevated-surface-border max-h-[min(32rem,var(--available-height))] w-[280px] origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover shadow-lg scrollbar-fade outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:slide-in-from-bottom-2">
                <MenuBody onClose={() => setOpen(false)} />
              </BasePopover.Popup>
            </BasePopover.Positioner>
          </BasePopover.Portal>
        </BasePopover.Root>
      </div>
    </div>
  )
}

function Avatar({ size }: { size: string }) {
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground/[0.06] text-foreground/60", size)}>
      <UserRound className="size-1/2" strokeWidth={1.75} />
    </span>
  )
}

function MenuBody({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const openSettings = useSettingsDialog((s) => s.openAt)
  const go = (fn: () => void) => () => {
    onClose()
    fn()
  }
  return (
    <div data-action-ui-id="user-menu.root-view">
      <div className="px-4 pt-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size="size-10" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-foreground text-[15px]">{t("sidebar.user")}</div>
            <div className="mt-0.5 truncate text-body-12 text-muted-foreground">{t("common.appName")}</div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 pb-1">
        <MenuSection title={t("userMenu.sectionSettings")}>
          <ThemeRow />
          <MenuRow id="user-menu.memory-management" icon={<Brain size={16} strokeWidth={1.5} />} label={t("userMenu.memoryManagement")} onClick={go(() => openSettings("memory"))} />
          <MenuRow
            id="user-menu.im-bridge"
            icon={<Smartphone size={16} strokeWidth={1.5} />}
            label={t("imBridge.menuLabel.domestic")}
            onClick={go(() => openSettings("imBridge"))}
          />
          <MenuRow id="user-menu.settings" icon={<Settings size={16} strokeWidth={1.5} />} label={t("settings.title")} onClick={go(() => openSettings())} />
        </MenuSection>
        <MenuSection title={t("userMenu.sectionHelp")}>
          <MenuRow id="user-menu.tutorial" icon={<GraduationCap size={16} strokeWidth={1.5} />} label={t("userMenu.tutorial")} disabled />
          <MenuRow id="user-menu.changelog" icon={<FileText size={16} strokeWidth={1.5} />} label={t("homeSidebar.changelog")} onClick={go(() => void navigate({ to: "/changelog" }))} />
          <MenuRow id="user-menu.protocol" icon={<BookOpen size={16} strokeWidth={1.5} />} label={t("userMenu.protocol")} disabled />
          <div className="group flex h-9 w-full items-center gap-1 rounded-md px-2 text-[14px] leading-5 text-foreground/70 transition-colors hover:bg-foreground/[0.04] hover:text-foreground" data-action-ui-id="update.versionRow">
            <button type="button" className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm px-1 text-left" onClick={go(() => openSettings("softwareUpdate"))}>
              <CircleArrowUp size={16} strokeWidth={1.5} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {t("update.version.menuLabel")} <span className="text-xs font-normal text-muted-foreground">v{runtimeConfig().appVersion}</span>
              </span>
            </button>
          </div>
        </MenuSection>
      </div>
    </div>
  )
}

function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-1 py-1">
      <div className="px-3 pt-2 pb-1 text-[11px] font-medium leading-4 text-muted-foreground/70">{title}</div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  )
}

function MenuRow({ id, icon, label, onClick, disabled }: { id: string; icon: ReactNode; label: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="flex h-9 w-full items-center gap-2 rounded-sm px-3 text-[14px] leading-5 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent text-foreground/70 hover:bg-foreground/[0.03] hover:text-foreground"
      data-action-ui-id={id}
      onClick={onClick}
    >
      {icon}
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
        <span className="min-w-0 truncate">{label}</span>
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-1">
        <ChevronRight size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
      </span>
    </button>
  )
}

const THEME_OPTIONS: { value: ThemePref; icon: typeof Sun; key: string }[] = [
  { value: "dark", icon: Moon, key: "settings.themeDark" },
  { value: "light", icon: Sun, key: "settings.themeLight" },
  { value: "system", icon: Monitor, key: "settings.themeSystem" },
]

/** 主题三段开关：滑块按选中项的序号平移 */
function ThemeRow() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const index = THEME_OPTIONS.findIndex((o) => o.value === theme)
  return (
    <div className="flex h-9 items-center justify-between gap-2 rounded-sm px-3 text-[14px] leading-5 text-foreground/70">
      <Palette size={16} strokeWidth={1.5} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{t("settings.theme")}</span>
      <fieldset className="relative m-0 grid min-w-0 rounded-[8px] border-0 bg-foreground/[0.025] p-0.5 dark:bg-foreground/[0.05] w-max grid-cols-3">
        <span
          className="pointer-events-none absolute top-0.5 left-0.5 rounded-[6px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-out dark:bg-white/[0.08] dark:shadow-none h-7"
          data-slot="segmented-switch-thumb"
          style={{ width: "calc(33.3333% - 1.33333px)", transform: `translateX(${Math.max(0, index) * 100}%)` }}
        />
        {THEME_OPTIONS.map(({ value, icon: Icon, key }) => (
          <button
            key={value}
            type="button"
            className={cn(
              "relative z-10 inline-flex items-center justify-center rounded-[6px] transition-colors size-7 cursor-pointer",
              value === theme ? "text-foreground font-medium" : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground font-normal",
            )}
            data-action-ui-id={`user-menu.theme-${value}`}
            aria-label={t(key)}
            aria-pressed={value === theme}
            onClick={() => setTheme(value)}
          >
            <Icon size={14} strokeWidth={1.5} className="shrink-0" />
          </button>
        ))}
      </fieldset>
    </div>
  )
}
