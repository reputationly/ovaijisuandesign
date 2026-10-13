// browser-tab-overview.jsx
import {
  Check,
  ChevronDown,
  Globe,
  reactExports,
  useTranslation,
  X$7 as CloseIcon,
} from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Popover } from "../assets/credit-query-keys.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { useBrowserHoverPreview } from "../infra/dialog-content.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import { PopoverTitle } from "../canvas/popover-title.jsx";
import { trackEvent } from "../infra/sanitize-track-props.js";
export function BrowserTabOverview({
  tabs,
  activeTabId,
  disabled,
  onSelect,
  onClose,
}) {
  const { t: translate } = useTranslation();
  const [requested, setRequested] = reactExports.useState(false);
  const triggerRef = reactExports.useRef(null);
  const [popupMounted, setPopupMounted] = reactExports.useState(false);
  const popupRef = reactExports.useCallback((element) => {
    setPopupMounted(element !== null);
  }, []);
  const cancelPreparation = reactExports.useCallback(
    () => setRequested(false),
    [],
  );
  const ready = useBrowserHoverPreview(
    (requested && !disabled) || popupMounted,
    {
      requireSnapshot: true,
      // A failed capture leaves the live page visible. Reset intent so the next
      // click retries, rather than leaving the trigger stuck in preparation.
      onError: cancelPreparation,
    },
  );
  const open = requested && !disabled && ready;
  const previouslyOpenRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (open && !previouslyOpenRef.current) {
      trackEvent(TRACK_EVENTS.BROWSER_TOOLBAR_ACTION, {
        action: "tab_overview",
        source: "tab_strip",
        result: "success",
      });
    }
    previouslyOpenRef.current = open;
  }, [open]);
  reactExports.useEffect(() => {
    if (disabled) setRequested(false);
  }, [disabled]);
  reactExports.useEffect(() => {
    if (!requested || open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setRequested(false);
    };
    const onPointerDown = (event) => {
      if (!triggerRef.current?.contains(event.target)) setRequested(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [requested, open]);
  return (
    <Popover open={open} onOpenChange={setRequested}>
      <PopoverTrigger
        ref={triggerRef}
        data-action-ui-id="browser.tab-overview-trigger"
        onClick={(event) => {
          if (requested && !open) {
            event.preventBaseUIHandler();
            setRequested(false);
          }
        }}
        disabled={disabled}
        aria-label={translate("workspace.browser.allTabs")}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-default disabled:opacity-40"
      >
        <Icon
          icon={ChevronDown}
          size="md"
          className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </PopoverTrigger>
      <PopoverContent
        ref={popupRef}
        data-action-ui-id="browser.tab-overview"
        align="end"
        sideOffset={8}
        className="w-72 max-w-[calc(100vw-24px)] gap-1 p-2"
      >
        <PopoverTitle className="flex h-7 shrink-0 items-center justify-between px-2 text-xs">
          {translate("workspace.browser.allTabs")}
          <span className="font-normal tabular-nums text-muted-foreground">
            {tabs.length}
          </span>
        </PopoverTitle>
        <div className="flex max-h-[min(480px,60vh)] flex-col gap-1 overflow-y-auto">
          {tabs.map((tab) => {
            const title = tab.title || translate("workspace.browser.newTab");
            const active = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                className={`flex shrink-0 items-center gap-2 rounded-md p-2 ${tab.url ? "h-12" : "h-10"} ${active ? "bg-secondary" : "bg-muted/40 hover:bg-muted"}`}
              >
                <button
                  type="button"
                  aria-current={active ? "page" : void 0}
                  onClick={() => {
                    onSelect(tab.id);
                    setRequested(false);
                  }}
                  className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="relative flex size-6 shrink-0 items-center justify-center rounded-sm bg-card">
                    <Icon icon={Globe} size="sm" />
                    {tab.faviconUrl && (
                      <img
                        src={tab.faviconUrl}
                        alt=""
                        className="absolute size-4 bg-card object-contain"
                        onError={(event) => {
                          event.currentTarget.hidden = true;
                        }}
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium leading-4">
                      {title}
                    </span>
                    {tab.url && (
                      <span className="block truncate text-[11px] leading-4 text-muted-foreground">
                        {tab.url}
                      </span>
                    )}
                  </span>
                  {active && (
                    <Check className="size-3.5 shrink-0" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label={translate("workspace.browser.closeTabNamed", {
                    title,
                  })}
                  onClick={() => onClose(tab.id)}
                  className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CloseIcon className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
