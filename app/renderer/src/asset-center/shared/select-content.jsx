// shared/select-content.jsx
import { SelectTrigger$2, SelectIcon, ChevronDownIcon$1, SelectValue$2, SelectPortal, SelectPositioner, SelectPopup, SelectList, SelectItem$2, SelectItemText, SelectItemIndicator, SelectScrollUpArrow, ChevronUpIcon, SelectScrollDownArrow } from "../../vendor.js";
import { CheckIcon$5 } from "../../m15/parse-item.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
import { Input$2, cn$2 } from "./use-browser-overlay-dialog-props.jsx";
const inputBaseClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 md:text-xs dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";
export function Input3({ className, type: type2, startIcon, endIcon, ...props }) {
  if (!startIcon && !endIcon) {
    return (
      <Input$2
        type={type2}
        data-slot="input"
        className={cn$2(inputBaseClass, className)}
        {...props}
      />
    );
  }
  return (
    <div className={cn$2("relative flex items-center", className)}>
      {startIcon && (
        <span className="pointer-events-none absolute left-2 flex items-center text-muted-foreground [&_svg:not([class*='size-'])]:size-4">
          {startIcon}
        </span>
      )}
      <Input$2
        type={type2}
        data-slot="input"
        className={cn$2(inputBaseClass, "w-full", startIcon && "pl-8", endIcon && "pr-8")}
        {...props}
      />
      {endIcon && (
        <span className="pointer-events-none absolute right-2 flex items-center text-muted-foreground [&_svg:not([class*='size-'])]:size-4">
          {endIcon}
        </span>
      )}
    </div>
  );
}
export function SelectValue({ className, ...props }) {
  return (
    <SelectValue$2
      data-slot="select-value"
      className={cn$2("flex flex-1 text-left", className)}
      {...props}
    />
  );
}
export function SelectTrigger({
  className,
  size: size2 = "default",
  children: children2,
  ...props
}) {
  return (
    <SelectTrigger$2
      data-slot="select-trigger"
      data-size={size2}
      className={cn$2(
        "flex w-fit cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-xs whitespace-nowrap transition-colors outline-none select-none hover:bg-muted/60 hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-lg *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children2}
      <SelectIcon
        render={<ChevronDownIcon$1 className="pointer-events-none size-4 text-muted-foreground" />}
      />
    </SelectTrigger$2>
  );
}
export function SelectContent({
  className,
  children: children2,
  side = "bottom",
  sideOffset = 6,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = false,
  portalContainer,
  positionerClassName,
  motion = "quick-zoom",
  ...props
}) {
  return (
    <SelectPortal container={portalContainer ?? void 0}>
      <SelectPositioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className={cn$2("isolate z-50", positionerClassName)}
      >
        <SelectPopup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn$2(
            "elevated-surface-border isolate relative z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-lg **:data-[slot$=-item]:focus:bg-popup-item-hover **:data-[slot$=-item]:data-highlighted:bg-popup-item-hover **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-popup-item-hover **:data-[slot$=-trigger]:aria-expanded:bg-popup-item-active! **:data-[variant=destructive]:focus:bg-popup-item-active! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!",
            motion !== "none" && "dp-motion-quick-zoom",
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectList>{children2}</SelectList>
          <SelectScrollDownButton />
        </SelectPopup>
      </SelectPositioner>
    </SelectPortal>
  );
}
export function SelectItem({ className, children: children2, ...props }) {
  return (
    <SelectItem$2
      data-slot="select-item"
      className={cn$2(
        "list-row-hit-area relative flex w-full cursor-default items-center gap-2 rounded-lg py-2 pr-8 pl-2 text-xs outline-hidden select-none focus:bg-popup-item-hover focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <SelectItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
        {children2}
      </SelectItemText>
      <SelectItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon$5 className="pointer-events-none" />
      </SelectItemIndicator>
    </SelectItem$2>
  );
}
function SelectScrollUpButton({ className, ...props }) {
  return (
    <SelectScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn$2(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon />
    </SelectScrollUpArrow>
  );
}
function SelectScrollDownButton({ className, ...props }) {
  return (
    <SelectScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn$2(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon$1 />
    </SelectScrollDownArrow>
  );
}
