import { Tabs as BaseTabs } from "@base-ui/react/tabs"
import type { ComponentProps } from "react"

import { cn } from "../../lib"

type Variant = "default" | "underline" | "track"

export const Tabs = ({ className, ...rest }: ComponentProps<typeof BaseTabs.Root>) => (
  <BaseTabs.Root data-slot="tabs" className={cn("flex flex-col", className)} {...rest} />
)

// underline：页面级标签（项目库、技能页）；default：浮层里的胶囊分段
export function TabsList({ className, children, variant = "default", ...rest }: ComponentProps<typeof BaseTabs.List> & { variant?: Variant }) {
  return (
    <BaseTabs.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        variant === "underline"
          ? "scrollbar-none relative inline-flex w-max max-w-full items-center justify-start gap-6 overflow-x-auto rounded-none bg-transparent p-0 text-foreground/50"
          : "inline-flex items-center gap-1 rounded-sm bg-tab-list-bg p-1 text-muted-foreground",
        className,
      )}
      {...rest}
    >
      {variant === "track" ? <BaseTabs.Indicator aria-hidden="true" className="tabs-track-indicator" /> : null}
      {variant === "underline" ? <BaseTabs.Indicator aria-hidden="true" className="tabs-underline-indicator bottom-0" /> : null}
      {children}
    </BaseTabs.List>
  )
}

export function TabsTrigger({ className, variant = "default", ...rest }: ComponentProps<typeof BaseTabs.Tab> & { variant?: Variant }) {
  return (
    <BaseTabs.Tab
      data-slot="tabs-trigger"
      data-variant={variant}
      className={cn(
        variant === "underline"
          ? "relative inline-flex h-10 cursor-pointer items-center justify-center rounded-none px-2 py-0 text-[15px] leading-5 font-medium whitespace-nowrap text-foreground/50 transition-colors duration-150 outline-none select-none hover:bg-transparent hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-transparent data-[active]:text-foreground data-[active]:shadow-none"
          : "inline-flex cursor-pointer items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-tab-active-bg data-[active]:text-foreground data-[active]:shadow-tab-active",
        className,
      )}
      {...rest}
    />
  )
}

export const TabsContent = ({ className, ...rest }: ComponentProps<typeof BaseTabs.Panel>) => (
  <BaseTabs.Panel data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...rest} />
)
