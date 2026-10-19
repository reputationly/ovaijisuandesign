import { __jsx } from "../shared/jsx-runtime.js";
import { cn as cn$5 } from "../infra/dialog-content.jsx";
import { MenuItem as MenuItem$4 } from "../text-editor/table-ops.jsx";
import { MENU_ITEM_LAYOUT } from "./menu-item-layout.jsx";
export function ContextMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}) {
  return <MenuItem$4 data-slot="context-menu-item" data-inset={inset} data-variant={variant} className={cn$5(MENU_ITEM_LAYOUT, "group/context-menu-item list-row-hit-area relative flex cursor-default items-center rounded-sm outline-hidden select-none focus:bg-popup-item-hover focus:text-foreground data-inset:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus:*:[svg]:text-foreground data-[variant=destructive]:*:[svg]:text-destructive", className)} {...props} />;
}