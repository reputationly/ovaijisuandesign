import { Popover as BasePopover } from "@base-ui/react/popover"
import type { ComponentProps } from "react"

import { cn } from "../../lib"

export const Popover = (props: ComponentProps<typeof BasePopover.Root>) => <BasePopover.Root data-slot="popover" {...props} />
export const PopoverTrigger = (props: ComponentProps<typeof BasePopover.Trigger>) => (
  <BasePopover.Trigger data-slot="popover-trigger" {...props} />
)

type ContentProps = ComponentProps<typeof BasePopover.Popup> &
  Pick<
    ComponentProps<typeof BasePopover.Positioner>,
    "align" | "alignOffset" | "side" | "sideOffset" | "anchor" | "collisionAvoidance" | "collisionPadding"
  > & { positionerClassName?: string }

export function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 2,
  anchor,
  collisionAvoidance,
  collisionPadding,
  positionerClassName,
  ...rest
}: ContentProps) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        anchor={anchor}
        collisionAvoidance={collisionAvoidance}
        collisionPadding={collisionPadding}
        className={cn("isolate z-50", positionerClassName)}
      >
        <BasePopover.Popup
          data-slot="popover-content"
          className={cn(
            "elevated-surface-border z-50 flex w-72 origin-(--transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-xs text-popover-foreground shadow-lg outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...rest}
        />
      </BasePopover.Positioner>
    </BasePopover.Portal>
  )
}

export const PopoverHeader = ({ className, ...rest }: ComponentProps<"div">) => (
  <div data-slot="popover-header" className={cn("flex flex-col gap-1 text-xs", className)} {...rest} />
)
export const PopoverTitle = ({ className, ...rest }: ComponentProps<typeof BasePopover.Title>) => (
  <BasePopover.Title data-slot="popover-title" className={cn("text-sm font-medium", className)} {...rest} />
)
export const PopoverDescription = ({ className, ...rest }: ComponentProps<typeof BasePopover.Description>) => (
  <BasePopover.Description data-slot="popover-description" className={cn("text-xs/relaxed text-muted-foreground", className)} {...rest} />
)
