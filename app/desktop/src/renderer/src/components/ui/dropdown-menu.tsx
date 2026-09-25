import { Menu } from "@base-ui/react/menu"
import { Check, ChevronRight } from "lucide-react"
import type { ComponentProps } from "react"

import { cn } from "../../lib"

// 所有菜单项共享的底子：11px 字、浮层悬停色、禁用半透明
const itemBase =
  "relative flex cursor-default items-center gap-2 rounded-sm text-[11px] font-medium outline-hidden select-none hover:bg-popup-item-hover hover:text-foreground focus:bg-popup-item-hover focus:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 transition-colors duration-[80ms]"

const popupBase =
  "elevated-surface-border z-50 origin-(--transform-origin) rounded-lg bg-popover p-1 text-popover-foreground shadow-lg duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"

export const DropdownMenu = (props: ComponentProps<typeof Menu.Root>) => <Menu.Root data-slot="dropdown-menu" {...props} />
export const DropdownMenuGroup = (props: ComponentProps<typeof Menu.Group>) => (
  <Menu.Group data-slot="dropdown-menu-group" {...props} />
)
export const DropdownMenuRadioGroup = (props: ComponentProps<typeof Menu.RadioGroup>) => (
  <Menu.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />
)
export const DropdownMenuSub = (props: ComponentProps<typeof Menu.SubmenuRoot>) => (
  <Menu.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
)

export const DropdownMenuTrigger = ({ className, ...rest }: ComponentProps<typeof Menu.Trigger>) => (
  <Menu.Trigger data-slot="dropdown-menu-trigger" className={cn("select-none outline-none", className)} {...rest} />
)

type PositionProps = Pick<ComponentProps<typeof Menu.Positioner>, "align" | "alignOffset" | "side" | "sideOffset">

export function DropdownMenuContent({
  className,
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 2,
  ...rest
}: ComponentProps<typeof Menu.Popup> & PositionProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner className="isolate z-50 outline-none" align={align} alignOffset={alignOffset} side={side} sideOffset={sideOffset}>
        <Menu.Popup
          data-slot="dropdown-menu-content"
          className={cn(popupBase, "max-h-(--available-height) min-w-28 overflow-x-hidden overflow-y-auto", className)}
          {...rest}
        />
      </Menu.Positioner>
    </Menu.Portal>
  )
}

export function DropdownMenuItem({
  className,
  variant = "default",
  ...rest
}: ComponentProps<typeof Menu.Item> & { variant?: "default" | "destructive" }) {
  return (
    <Menu.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(
        itemBase,
        "px-2.5 py-1.5 whitespace-nowrap data-[variant=destructive]:text-destructive data-[variant=destructive]:hover:bg-destructive/10 data-[variant=destructive]:hover:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive [&_svg:not([class*=size-])]:size-3.5",
        className,
      )}
      {...rest}
    />
  )
}

export const DropdownMenuLabel = ({ className, ...rest }: ComponentProps<typeof Menu.GroupLabel>) => (
  <Menu.GroupLabel
    data-slot="dropdown-menu-label"
    className={cn("px-2.5 py-1 text-[10px] font-medium text-muted-foreground select-none", className)}
    {...rest}
  />
)

export function DropdownMenuRadioItem({ className, children, closeOnClick = true, ...rest }: ComponentProps<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(itemBase, "py-1.5 pl-2.5 pr-7", className)}
      closeOnClick={closeOnClick}
      {...rest}
    >
      {children}
      <span className="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center">
        <Menu.RadioItemIndicator>
          <Check className="size-3" strokeWidth={1.75} />
        </Menu.RadioItemIndicator>
      </span>
    </Menu.RadioItem>
  )
}

export const DropdownMenuSeparator = ({ className, ...rest }: ComponentProps<"hr">) => (
  <hr data-slot="dropdown-menu-separator" className={cn("-mx-1 my-1 h-px border-none bg-border/50", className)} {...rest} />
)

export function DropdownMenuSubTrigger({ className, children, ...rest }: ComponentProps<typeof Menu.SubmenuTrigger>) {
  return (
    <Menu.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(
        itemBase,
        "px-2.5 py-1.5 whitespace-nowrap data-[popup-open]:bg-popup-item-active data-[popup-open]:text-foreground [&_svg:not([class*=size-])]:size-3.5",
        className,
      )}
      {...rest}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
      <ChevronRight className="text-current opacity-70" />
    </Menu.SubmenuTrigger>
  )
}

export function DropdownMenuSubContent({
  className,
  align = "start",
  alignOffset = -4,
  side = "right",
  sideOffset = 4,
  ...rest
}: ComponentProps<typeof Menu.Popup> & PositionProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner className="isolate z-50 outline-none" align={align} alignOffset={alignOffset} side={side} sideOffset={sideOffset}>
        <Menu.Popup data-slot="dropdown-menu-sub-content" className={cn(popupBase, "min-w-32 overflow-hidden", className)} {...rest} />
      </Menu.Positioner>
    </Menu.Portal>
  )
}
