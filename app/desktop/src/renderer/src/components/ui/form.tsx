import { Input as BaseInput } from "@base-ui/react/input"
import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area"
import { Separator as BaseSeparator } from "@base-ui/react/separator"
import { Switch as BaseSwitch } from "@base-ui/react/switch"
import type { ComponentProps, ReactNode } from "react"

import { cn } from "../../lib"

// 单行输入框：聚焦只加深描边（见 base.css），不加光圈
const inputBase =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 md:text-xs dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"

const iconSlot = "pointer-events-none absolute flex items-center text-muted-foreground [&_svg:not([class*='size-'])]:size-4"

export function Input({
  className,
  startIcon,
  endIcon,
  ...rest
}: ComponentProps<typeof BaseInput> & { startIcon?: ReactNode; endIcon?: ReactNode }) {
  if (!startIcon && !endIcon) return <BaseInput data-slot="input" className={cn(inputBase, className)} {...rest} />
  return (
    <div className={cn("relative flex items-center", className)}>
      {startIcon ? <span className={cn(iconSlot, "left-2")}>{startIcon}</span> : null}
      <BaseInput data-slot="input" className={cn(inputBase, "w-full", startIcon && "pl-8", endIcon && "pr-8")} {...rest} />
      {endIcon ? <span className={cn(iconSlot, "right-2")}>{endIcon}</span> : null}
    </div>
  )
}

export const Textarea = ({ className, ...rest }: ComponentProps<"textarea">) => (
  <textarea
    data-slot="textarea"
    className={cn(
      "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 md:text-xs dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
      className,
    )}
    {...rest}
  />
)

// 开关：打开是品牌紫，拇指是 18×14 的胶囊
export function Switch({ className, ...rest }: ComponentProps<typeof BaseSwitch.Root>) {
  return (
    <BaseSwitch.Root
      className={cn(
        "peer relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full p-[3px] shadow-xs transition-colors after:absolute after:-inset-x-1 after:-inset-y-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-accent/35 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-brand-accent data-[checked]:hover:bg-brand-accent/90 data-[unchecked]:bg-input data-[unchecked]:hover:bg-foreground/15",
        className,
      )}
      {...rest}
    >
      <BaseSwitch.Thumb className="pointer-events-none block h-3.5 w-[18px] rounded-full bg-brand-accent-foreground shadow-none ring-1 ring-foreground/5 transition-transform duration-150 ease-out will-change-transform data-[checked]:translate-x-4 data-[unchecked]:translate-x-0" />
    </BaseSwitch.Root>
  )
}

export const Separator = ({ className, orientation = "horizontal", ...rest }: ComponentProps<typeof BaseSeparator>) => (
  <BaseSeparator
    data-slot="separator"
    orientation={orientation}
    className={cn(
      "shrink-0 bg-border data-horizontal:h-[var(--divider-width)] data-horizontal:w-full data-vertical:w-[var(--divider-width)] data-vertical:self-stretch",
      className,
    )}
    {...rest}
  />
)

export function ScrollBar({ className, orientation = "vertical", ...rest }: ComponentProps<typeof BaseScrollArea.Scrollbar>) {
  return (
    <BaseScrollArea.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t-[var(--divider-width)] data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l-[var(--divider-width)] data-vertical:border-l-transparent",
        className,
      )}
      {...rest}
    >
      <BaseScrollArea.Thumb data-slot="scroll-area-thumb" className="relative flex-1 rounded-full bg-border" />
    </BaseScrollArea.Scrollbar>
  )
}

export function ScrollArea({ className, children, ...rest }: ComponentProps<typeof BaseScrollArea.Root>) {
  return (
    <BaseScrollArea.Root data-slot="scroll-area" className={cn("relative", className)} {...rest}>
      <BaseScrollArea.Viewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {children}
      </BaseScrollArea.Viewport>
      <ScrollBar />
      <BaseScrollArea.Corner />
    </BaseScrollArea.Root>
  )
}

export const Kbd = ({ className, ...rest }: ComponentProps<"kbd">) => (
  <kbd
    data-slot="kbd"
    className={cn(
      "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 [&_svg:not([class*='size-'])]:size-3",
      className,
    )}
    {...rest}
  />
)

export const KbdGroup = ({ className, ...rest }: ComponentProps<"kbd">) => (
  <kbd data-slot="kbd-group" className={cn("inline-flex items-center gap-1", className)} {...rest} />
)
