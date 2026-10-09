// file-explorer-search-bar.jsx
import { reactExports, Search, useTranslation, X$7 } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 } from "../infra/dialog-content.jsx";
import { StrokeIcon } from "../workspace/use-prompt-icon.jsx";

export function FileExplorerSearchBar({
  value,
  onChange,
  inputRef,
  placeholder,
  clearLabel,
  rowActionId = "asset-panel.search-row",
  inputActionId = "asset-panel.search-input",
  clearActionId = "asset-panel.search-clear",
  className,
  collapsible = false,
  expandedFillsRow = false,
  useStrokeSpec = false,
}) {
  const { t: t2 } = useTranslation();
  const resolvedPlaceholder =
    placeholder ??
    t2("fileExplorer.searchPlaceholder", {
      defaultValue: "搜索文件",
    });
  const resolvedClearLabel =
    clearLabel ??
    t2("fileExplorer.clearSearch", {
      defaultValue: "Clear search",
    });
  const openLabel = t2("fileExplorer.openSearch", {
    defaultValue: "搜索",
  });
  const [open, setOpen] = reactExports.useState(
    !collapsible || value.length > 0,
  );
  const fallbackRef = reactExports.useRef(null);
  const effectiveInputRef = inputRef ?? fallbackRef;
  reactExports.useEffect(() => {
    if (value.length > 0 && !open) setOpen(true);
  }, [value, open]);
  reactExports.useEffect(() => {
    if (open && collapsible) effectiveInputRef.current?.focus();
  }, [open, collapsible, effectiveInputRef]);
  if (collapsible && !open) {
    return (
      <div className={cn$2("flex shrink-0", className)}>
        <button
          type="button"
          aria-label={openLabel}
          title={openLabel}
          onClick={() => setOpen(true)}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
          data-action-ui-id={rowActionId}
        >
          {useStrokeSpec ? (
            <StrokeIcon icon={Search} size={14} />
          ) : (
            <Search size={14} strokeWidth={1.5} />
          )}
        </button>
      </div>
    );
  }
  return (
    <div
      className={cn$2(
        "group flex shrink-0 px-2 pb-2",
        !expandedFillsRow && className,
        expandedFillsRow &&
          "absolute inset-0 z-20 !px-2 !pt-2 !pb-2 items-center bg-background",
      )}
    >
      <div
        className="flex h-7 w-full items-center gap-1.5 rounded-md border border-transparent bg-foreground/[0.025] px-2 text-muted-foreground transition-colors focus-within:border-border-strong focus-within:bg-card focus-within:text-foreground dark:bg-foreground/[0.05]"
        data-action-ui-id={rowActionId}
      >
        {useStrokeSpec ? (
          <StrokeIcon icon={Search} size={14} />
        ) : (
          <Search size={14} strokeWidth={1.5} className="shrink-0" />
        )}
        <input
          ref={effectiveInputRef}
          type="text"
          className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/60"
          placeholder={resolvedPlaceholder}
          value={value}
          onChange={(e2) => onChange(e2.target.value)}
          onBlur={() => {
            if (collapsible && value.length === 0) setOpen(false);
          }}
          data-action-ui-id={inputActionId}
        />
        <button
          type="button"
          aria-label={resolvedClearLabel}
          onClick={() => onChange("")}
          tabIndex={value ? 0 : -1}
          className={cn$2(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-foreground/[0.05] hover:text-foreground",
            value ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          data-action-ui-id={clearActionId}
        >
          {useStrokeSpec ? (
            <StrokeIcon icon={X$7} size={12} />
          ) : (
            <X$7 size={12} strokeWidth={1.5} />
          )}
        </button>
      </div>
    </div>
  );
}
