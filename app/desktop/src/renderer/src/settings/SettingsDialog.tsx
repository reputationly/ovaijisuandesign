import { Dialog as BaseDialog } from "@base-ui/react/dialog"
import {
  Blocks,
  Bot,
  Brain,
  CircleArrowUp,
  CircleUserRound,
  Globe,
  HardDrive,
  Library,
  Settings2,
  SlidersHorizontal,
  Smartphone,
  X,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "../components/ui/button"
import { DialogOverlay, DialogPortal, dialogChromeButtonClassName } from "../components/ui/dialog"
import { cn } from "../lib"
import { SETTINGS_SECTIONS, useSettingsDialog, type SettingsSection } from "../stores/ui"
import { SECTION_COMPONENTS } from "./sections"

const SECTION_META: Record<SettingsSection, { icon: LucideIcon; label: string }> = {
  general: { icon: Settings2, label: "settings.general" },
  account: { icon: CircleUserRound, label: "settings.account.title" },
  storage: { icon: HardDrive, label: "settings.storageSection" },
  network: { icon: Globe, label: "settings.networkSection" },
  models: { icon: Bot, label: "settings.models.title" },
  memory: { icon: Brain, label: "settings.memory" },
  imBridge: { icon: Smartphone, label: "imBridge.title.domestic" },
  assetCenter: { icon: Library, label: "settings.assetCenter.title" },
  comfyui: { icon: Blocks, label: "settings.comfyui.title" },
  advanced: { icon: SlidersHorizontal, label: "settings.advanced" },
  softwareUpdate: { icon: CircleArrowUp, label: "settings.softwareUpdate.title" },
}

/**
 * 设置弹窗：左侧 11 个分区导航，右侧内容卡片（标题 + 可滚动正文）。
 * 打开状态放在全局 store 里，用户菜单、⌘, 快捷键、IM 快捷入口都直接打开到对应分区。
 */
export function SettingsDialog() {
  const { t } = useTranslation()
  const { open, section, setSection, close, openAt } = useSettingsDialog()
  const Section = SECTION_COMPONENTS[section]

  // ⌘, / Ctrl+, 打开设置
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault()
        openAt()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [openAt])

  return (
    <BaseDialog.Root open={open} onOpenChange={(v) => !v && close()}>
      <DialogPortal>
        <DialogOverlay />
        <BaseDialog.Popup
          data-action-ui-id="settings-dialog"
          className="elevated-surface-border fixed top-1/2 left-1/2 z-50 flex h-[min(620px,80vh)] w-full max-w-[860px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-modal-shell p-1 text-popover-foreground shadow-lg outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 [&_[data-slot=button]]:rounded-md [&_[data-slot=input]]:rounded-md [&_[data-slot=select-trigger]]:rounded-md"
        >
          <BaseDialog.Title className="sr-only">{t("settings.title")}</BaseDialog.Title>
          <aside className="flex w-52 shrink-0 flex-col rounded-md p-2">
            <div className="px-2 pb-4">
              <h2 className="pt-4 font-heading text-sm font-normal text-muted-foreground">{t("settings.title")}</h2>
            </div>
            <nav className="flex flex-col gap-1">
              {SETTINGS_SECTIONS.map((id) => {
                const { icon: Icon, label } = SECTION_META[id]
                const active = id === section
                return (
                  <button
                    key={id}
                    type="button"
                    className={cn(
                      "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-normal transition-colors disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-60",
                      active ? "bg-foreground/[0.06] text-foreground" : "text-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground",
                    )}
                    data-action-ui-id={`settings-${id}`}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setSection(id)}
                  >
                    <Icon size={16} strokeWidth={1.5} className="shrink-0 text-current" />
                    <span className="min-w-0 flex-1 truncate">{t(label)}</span>
                  </button>
                )
              })}
            </nav>
          </aside>
          <section className="ml-2 flex min-w-0 flex-1 flex-col rounded-lg bg-modal-content">
            <div className="relative h-16 shrink-0 px-5">
              <h2 className="min-w-0 truncate pt-6 pr-16 font-heading text-lg font-medium text-foreground">{t(SECTION_META[section].label)}</h2>
              <BaseDialog.Close
                render={<Button variant="ghost" className={cn("absolute top-1 right-1 size-11", dialogChromeButtonClassName)} />}
                data-action-ui-id="settings-dialog.close"
              >
                <X className="size-6" strokeWidth={1.75} />
                <span className="sr-only">{t("common.close")}</span>
              </BaseDialog.Close>
            </div>
            <ScrollBody key={section}>
              <Section />
            </ScrollBody>
          </section>
        </BaseDialog.Popup>
      </DialogPortal>
    </BaseDialog.Root>
  )
}

/** 正文滚动区：细滚动条只在滚动时显出来，停下 600ms 后淡出 */
function ScrollBody({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scrolling, setScrolling] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const on = () => {
      setScrolling(true)
      clearTimeout(timer)
      timer = setTimeout(() => setScrolling(false), 600)
    }
    el.addEventListener("scroll", on, { passive: true })
    return () => {
      el.removeEventListener("scroll", on)
      clearTimeout(timer)
    }
  }, [])
  return (
    <div
      ref={ref}
      data-scrolling={scrolling}
      data-action-ui-id="settings-dialog.content-scroll"
      className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1.5 mr-0.5 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-1! [&::-webkit-scrollbar-track]:bg-transparent! [&::-webkit-scrollbar-thumb]:rounded-full! [&::-webkit-scrollbar-thumb]:bg-foreground/0! [&::-webkit-scrollbar-thumb]:transition-colors [&::-webkit-scrollbar-thumb]:duration-300! [&::-webkit-scrollbar-thumb]:ease-in-out! [&[data-scrolling=true]::-webkit-scrollbar-thumb]:bg-foreground/20! [&::-webkit-scrollbar-thumb:hover]:bg-foreground/35!"
    >
      <div className="px-5 pt-1 pb-5">{children}</div>
    </div>
  )
}
