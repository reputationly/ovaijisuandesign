// integration-more-menu.jsx
import { reactExports } from "../vendor.js";
import { MoreVerticalIcon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Popover } from "../assets/credit-query-keys.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { Button, cn$2 as cn } from "../infra/dialog-content.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
export function IntegrationMoreMenu({
  triggerLabel,
  actionLabel,
  actionIcon,
  actionUiIds,
  onAction,
  disabled: disabled2 = false,
  triggerClassName,
  additionalActions = [],
}) {
  const [open, setOpen] = reactExports.useState(false);
  const closeTimerRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);
  reactExports.useEffect(() => {
    if (disabled2) setOpen(false);
  }, [disabled2]);
  const clearCloseTimer = () => {
    if (closeTimerRef.current === null) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };
  const handleMouseEnter = () => {
    if (disabled2) return;
    clearCloseTimer();
    setOpen(true);
  };
  const handleMouseLeave2 = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 120);
  };
  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (!disabled2) setOpen(nextOpen);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            disabled={disabled2}
            className={cn(
              "size-8 rounded-[10px] bg-card p-0 text-muted-foreground hover:bg-muted hover:text-foreground",
              triggerClassName,
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave2}
            data-action-ui-id={actionUiIds.trigger}
          />
        }
      >
        <MoreVerticalIcon className="size-4" />
        <span className="sr-only">{triggerLabel}</span>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        side="bottom"
        sideOffset={4}
        className="relative w-max min-w-28 gap-0 p-1"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave2}
        data-action-ui-id={actionUiIds.content}
      >
        <span
          aria-hidden="true"
          className="-top-1 absolute left-0 h-1 w-full"
          data-action-ui-id={actionUiIds.bridge}
        />
        {additionalActions.map((action) => (
          <Button
            key={action.actionUiId}
            type="button"
            variant="ghost"
            className="h-8 w-full justify-start gap-2 whitespace-nowrap rounded-sm px-2.5 text-foreground text-xs hover:bg-popup-item-hover"
            onClick={() => {
              clearCloseTimer();
              setOpen(false);
              void action.onAction();
            }}
            data-action-ui-id={action.actionUiId}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
        <button
          type="button"
          className="flex h-8 w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-sm px-2.5 text-center text-destructive text-xs transition-colors hover:bg-destructive/10 focus-visible:bg-destructive/10 focus-visible:outline-none"
          onClick={() => {
            setOpen(false);
            void onAction();
          }}
          data-action-ui-id={actionUiIds.action}
        >
          {actionIcon}
          {actionLabel}
        </button>
      </PopoverContent>
    </Popover>
  );
}
