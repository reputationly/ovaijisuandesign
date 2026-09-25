import { Select as BaseSelect } from "@base-ui/react/select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import type { ComponentProps } from "react"

import { cn } from "../../lib"

export const Select = BaseSelect.Root

export const SelectGroup = ({ className, ...rest }: ComponentProps<typeof BaseSelect.Group>) => (
  <BaseSelect.Group data-slot="select-group" className={cn("scroll-my-1", className)} {...rest} />
)

export const SelectValue = ({ className, ...rest }: ComponentProps<typeof BaseSelect.Value>) => (
  <BaseSelect.Value data-slot="select-value" className={cn("flex flex-1 text-left", className)} {...rest} />
)

export function SelectTrigger({
  className,
  size = "default",
  children,
  ...rest
}: ComponentProps<typeof BaseSelect.Trigger> & { size?: "default" | "sm" }) {
  return (
    <BaseSelect.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-xs whitespace-nowrap transition-colors outline-none select-none hover:bg-muted/60 hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-lg *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...rest}
    >
      {children}
      <BaseSelect.Icon render={<ChevronDown className="pointer-events-none size-4 text-muted-foreground" />} />
    </BaseSelect.Trigger>
  )
}

type ContentProps = ComponentProps<typeof BaseSelect.Popup> &
  Pick<ComponentProps<typeof BaseSelect.Positioner>, "side" | "sideOffset" | "align" | "alignOffset" | "alignItemWithTrigger"> & {
    positionerClassName?: string
  }

export function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 6,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = false,
  positionerClassName,
  ...rest
}: ContentProps) {
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className={cn("isolate z-50", positionerClassName)}
      >
        <BaseSelect.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            "elevated-surface-border isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-lg duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 animate-none! relative **:data-[slot$=-item]:focus:bg-popup-item-hover **:data-[slot$=-item]:data-highlighted:bg-popup-item-hover **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-popup-item-hover **:data-[slot$=-trigger]:aria-expanded:bg-popup-item-active! **:data-[variant=destructive]:focus:bg-popup-item-active! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!",
            className,
          )}
          {...rest}
        >
          <BaseSelect.ScrollUpArrow
            data-slot="select-scroll-up-button"
            className="top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4"
          >
            <ChevronUp />
          </BaseSelect.ScrollUpArrow>
          <BaseSelect.List>{children}</BaseSelect.List>
          <BaseSelect.ScrollDownArrow
            data-slot="select-scroll-down-button"
            className="bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4"
          >
            <ChevronDown />
          </BaseSelect.ScrollDownArrow>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  )
}

export const SelectLabel = ({ className, ...rest }: ComponentProps<typeof BaseSelect.GroupLabel>) => (
  <BaseSelect.GroupLabel data-slot="select-label" className={cn("px-2 py-2 text-xs text-muted-foreground", className)} {...rest} />
)

export function SelectItem({ className, children, ...rest }: ComponentProps<typeof BaseSelect.Item>) {
  return (
    <BaseSelect.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-lg py-2 pr-8 pl-2 text-xs outline-hidden select-none focus:bg-popup-item-hover focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...rest}
    >
      <BaseSelect.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">{children}</BaseSelect.ItemText>
      <BaseSelect.ItemIndicator render={<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />}>
        <Check className="pointer-events-none" />
      </BaseSelect.ItemIndicator>
    </BaseSelect.Item>
  )
}
