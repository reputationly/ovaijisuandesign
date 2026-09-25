import { Inbox } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "../lib"

/** 目录型页面（项目库、技能、工作流……）的统一骨架：标题区 + 正文区，整页纵向滚动 */
export function CatalogPage({
  id,
  title,
  subtitle,
  actions,
  children,
}: {
  id: string
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <main className="flex flex-1 flex-col overflow-y-auto bg-[var(--home-content-surface)]">
      <div className="shrink-0 px-8 pt-7 md:px-12">
        <section className="relative isolate overflow-hidden border-b border-border-soft pb-6" data-action-ui-id={`${id}.hero`}>
          <div className="relative z-10 w-full">
            <div className="min-w-0 mt-3" data-slot="catalog-page-heading">
              <h1 className="font-heading font-medium tracking-[0.02em] text-foreground text-[20px] leading-tight">{title}</h1>
              {subtitle ? (
                <p className="text-[15px] leading-5 text-[var(--catalog-page-subtitle-foreground)] mt-2" data-slot="catalog-page-subtitle">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {actions ? <div className="mt-8 flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </section>
      </div>
      <div className="flex flex-1 flex-col px-8 pt-4 pb-8 md:px-12">{children}</div>
    </main>
  )
}

/** 空 / 占位状态：图标 + 一句话，居中 */
export function PageState({ text, description, icon, className }: { text?: ReactNode; description?: ReactNode; icon?: ReactNode; className?: string }) {
  const { t } = useTranslation()
  return (
    <div className={cn("flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center", className)} data-slot="page-state-visual">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-foreground/[0.04] text-muted-foreground">
        {icon ?? <Inbox size={24} strokeWidth={1.5} />}
      </span>
      <p className="text-sm text-muted-foreground" data-slot="page-state-copy">
        {text ?? t("pageState.emptyText")}
      </p>
      {description ? (
        <p className="-mt-1 max-w-80 text-xs text-muted-foreground/70" data-slot="page-state-description">
          {description}
        </p>
      ) : null}
    </div>
  )
}
