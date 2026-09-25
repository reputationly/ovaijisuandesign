import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip"
import type { ComponentProps, ReactElement, ReactNode } from "react"

import { cn } from "../../lib"

export const TooltipProvider = ({ delay = 0, ...rest }: ComponentProps<typeof BaseTooltip.Provider>) => (
  <BaseTooltip.Provider delay={delay} {...rest} />
)

// 提示只是标签，不让鼠标移进去停留
export const Tooltip = ({ disableHoverablePopup = true, ...rest }: ComponentProps<typeof BaseTooltip.Root>) => (
  <BaseTooltip.Root disableHoverablePopup={disableHoverablePopup} {...rest} />
)

export const TooltipTrigger = (props: ComponentProps<typeof BaseTooltip.Trigger>) => (
  <BaseTooltip.Trigger data-slot="tooltip-trigger" {...props} />
)

type ContentProps = ComponentProps<typeof BaseTooltip.Popup> &
  Pick<ComponentProps<typeof BaseTooltip.Positioner>, "side" | "sideOffset" | "align" | "alignOffset"> & {
    positionerClassName?: string
  }

export function TooltipContent({
  className,
  positionerClassName,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  ...rest
}: ContentProps) {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className={cn("pointer-events-none isolate z-[100]", positionerClassName)}
      >
        <BaseTooltip.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-[100] inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5 rounded-sm bg-foreground px-3 py-1.5 text-xs text-background has-data-[slot=kbd]:pr-1.5 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-[100] **:data-[slot=kbd]:rounded-sm transition-opacity duration-100 ease-out data-open:opacity-100 data-closed:opacity-0 data-[state=delayed-open]:opacity-100",
            className,
            "pointer-events-none select-none",
          )}
          {...rest}
        />
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  )
}

/** 最常见的用法：给一个元素挂一句提示。content 为空时原样返回，不包任何东西。 */
export function Hint({
  content,
  side,
  children,
}: {
  content?: ReactNode
  side?: ContentProps["side"]
  children: ReactElement
}) {
  if (!content) return children
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side}>{content}</TooltipContent>
    </Tooltip>
  )
}
