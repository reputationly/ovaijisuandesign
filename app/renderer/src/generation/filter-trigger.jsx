// filter-trigger.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 } from "../infra/dialog-content.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import { Check, ChevronDown, X$7 } from "../vendor.js";
import { FilterMenuTrigger } from "../workspace/set-home-widget-dev-preview-mode.js";

export function FilterMenuContent({
  className,
  align = "start",
  alignOffset = -16,
  side = "bottom",
  sideOffset = 6,
  ...props
}) {
  return (
    <PopoverContent
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      className={cn$2(
        "w-auto min-w-36 gap-0.5 overflow-hidden p-1.5",
        className,
      )}
      data-filter-menu=""
      {...props}
    />
  );
}

export function FilterMenuGroup({ className, separated = false, ...props }) {
  return (
    <div
      data-slot="filter-menu-group"
      className={cn$2(
        "flex flex-col gap-0.5",
        separated && "border-t border-border/60 pt-0.5",
        className,
      )}
      {...props}
    />
  );
}

export function FilterMenuItem({
  className,
  children: children2,
  selected: selected2 = false,
  ...props
}) {
  return (
    <button
      type="button"
      aria-pressed={selected2}
      data-slot="filter-menu-item"
      data-selected={selected2 ? "true" : "false"}
      className={cn$2(
        "list-row-hit-area [--list-row-gap:var(--filter-menu-row-gap,2px)] first:before:top-0 last:before:bottom-0 flex h-7 w-full cursor-pointer items-center justify-between rounded-md px-2.5 text-left text-xs text-foreground/70 transition-colors hover:bg-foreground/[0.03] hover:text-foreground focus-visible:bg-foreground/[0.03] focus-visible:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        selected2 && "text-foreground",
        className,
      )}
      {...props}
    >
      <span className="min-w-0 flex-1 truncate">{children2}</span>
      {selected2 && (
        <Check
          aria-hidden="true"
          size={14}
          strokeWidth={2}
          className="ml-3 shrink-0"
        />
      )}
    </button>
  );
}

const TRIGGER_CLASS = cn$2(
  "inline-flex h-full min-w-0 flex-1 basis-0 items-stretch overflow-hidden text-xs whitespace-nowrap",
  "text-muted-foreground",
);

const TRIGGER_PILL_CLASS =
  "inline-flex h-full w-full min-w-0 items-center justify-center gap-0.5 rounded-md border border-foreground/12 bg-transparent transition-colors hover:border-foreground hover:text-foreground";

const TRIGGER_BUTTON_CLASS =
  "inline-flex h-full min-w-0 items-center justify-center gap-0.5 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-ring/50";

const TRIGGER_BUTTON_DEFAULT_CLASS = "flex-1 pl-2.5 pr-1.5";

const TRIGGER_BUTTON_ACTIVE_CLASS = "flex-1 pl-2.5 pr-0 min-w-0";

const TRIGGER_CLEAR_CLASS =
  "group/clear inline-flex size-4 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-1 focus-visible:ring-ring/50";

const TRIGGER_CLEAR_ICON_CLASS =
  "inline-flex size-3.5 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground transition-colors group-hover/clear:bg-muted-foreground group-hover/clear:text-background";

export function FilterTrigger({
  label,
  active: active2,
  open = false,
  testId,
  ariaLabel,
  clearLabel,
  onClear,
}) {
  const pillActive = active2 || open;
  return (
    <span
      className={TRIGGER_CLASS}
      data-active={active2 ? "true" : "false"}
      data-open={open ? "true" : "false"}
    >
      <span
        className={cn$2(
          TRIGGER_PILL_CLASS,
          pillActive && "border-foreground text-foreground",
          active2 && onClear && "gap-1 pr-1",
        )}
      >
        <FilterMenuTrigger
          render={
            <button
              type="button"
              aria-label={ariaLabel ?? label}
              data-action-ui-id={testId}
              data-active={active2 ? "true" : "false"}
              data-open={open ? "true" : "false"}
              className={cn$2(
                TRIGGER_BUTTON_CLASS,
                active2 && onClear
                  ? TRIGGER_BUTTON_ACTIVE_CLASS
                  : TRIGGER_BUTTON_DEFAULT_CLASS,
              )}
            />
          }
        >
          <span className="min-w-0 truncate whitespace-nowrap">{label}</span>
          {!active2 && (
            <ChevronDown
              size={16}
              strokeWidth={1.5}
              className="shrink-0 opacity-70"
            />
          )}
        </FilterMenuTrigger>
        {active2 && onClear && (
          <button
            type="button"
            aria-label={clearLabel ?? label}
            onClick={onClear}
            className={TRIGGER_CLEAR_CLASS}
            data-action-ui-id={`${testId}-clear`}
          >
            <span className={TRIGGER_CLEAR_ICON_CLASS}>
              <X$7 size={9} strokeWidth={2} />
            </span>
          </button>
        )}
      </span>
    </span>
  );
}
