import { CircleSlash } from "lucide-react"
import type { ComponentType, ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { cn } from "../lib"

/** 设置页的一组：可选的小标题 + 若干行 */
export function SettingGroup({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      {title ? (
        <div className="pt-3 pb-1 first:pt-0">
          <span className="text-xs font-normal text-muted-foreground">{title}</span>
        </div>
      ) : null}
      {children}
    </div>
  )
}

/** 左边标题 + 说明，右边控件 */
export function SettingRow({ label, description, children }: { label: ReactNode; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-normal text-foreground">{label}</p>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export interface SelectOption<V extends string> {
  value: V
  label: string
  icon?: ComponentType<{ size?: number; strokeWidth?: number; className?: string; "data-slot"?: string }>
}

/** 设置页专用的下拉：固定宽度、浅底、选项可带图标 */
export function SettingsSelect<V extends string>({
  value,
  options,
  onChange,
  className,
  disabled,
  "aria-label": ariaLabel,
}: {
  value: V
  options: SelectOption<V>[]
  onChange: (v: V) => void
  className?: string
  disabled?: boolean
  "aria-label"?: string
}) {
  const render = (opt?: SelectOption<V>) => {
    if (!opt) return value
    const Icon = opt.icon
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        {Icon ? <Icon data-slot="settings-select-option-icon" size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" /> : null}
        <span className="truncate">{opt.label}</span>
      </span>
    )
  }
  const current = options.find((o) => o.value === value)
  return (
    <Select value={value} disabled={disabled} onValueChange={(v) => v != null && onChange(v as V)}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          "h-8 min-w-28 rounded-md border-border! bg-muted/30! px-2.5 text-xs font-normal text-foreground/70 hover:bg-foreground/[0.03]! hover:text-foreground",
          className,
        )}
      >
        <SelectValue>{() => render(current)}</SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover! p-1">
        {options.map((o) => (
          <SelectItem
            key={o.value}
            value={o.value}
            className="h-7 rounded-md py-1.5 pr-8 pl-2.5 text-xs font-normal text-foreground/70 focus:bg-popup-item-hover! focus:text-foreground! data-[highlighted]:bg-popup-item-hover! data-[highlighted]:text-foreground!"
          >
            {render(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** 灰底信息卡：一行一个键值 */
export function InfoCard({ rows }: { rows: { label: ReactNode; value: ReactNode; title?: string }[] }) {
  return (
    <div className="space-y-0.5 rounded-lg bg-secondary p-1.5">
      {rows.map((r, i) => (
        <div key={i} className="flex h-9 items-center justify-between gap-4 rounded-md px-2.5">
          <span className="shrink-0 text-sm text-muted-foreground">{r.label}</span>
          <span className="min-w-0 truncate text-right text-sm text-foreground select-text" title={r.title}>
            {r.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/** 背后没有服务的分区：保留分区本身，内容换成统一的「当前版本不支持」 */
export function UnavailableNotice({ children }: { children?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg bg-secondary p-3" data-action-ui-id="settings.unavailable">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground">
          <CircleSlash size={16} strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-normal text-foreground">{t("ov.settings.unavailable.title")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("ov.settings.unavailable.desc")}</p>
        </div>
      </div>
      {children ? <div className="pointer-events-none opacity-50">{children}</div> : null}
    </div>
  )
}
