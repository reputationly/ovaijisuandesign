// folder-drill-down-picker.jsx
import { ROOT_KEY } from "./list-all-cloud-folders.js";
import {
  Check,
  ChevronDown,
  ChevronRight$1,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Folder } from "../media-editing/package.jsx";
import { cn$2 } from "../infra/dialog-content.jsx";
import { Popover } from "./credit-query-keys.jsx";
import { PopoverTrigger } from "./gateway-scope-provider.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";

function findBySegments(options, segments) {
  if (segments.length === 0)
    return options.find((option2) => option2.key === ROOT_KEY);
  return options.find(
    (option2) =>
      option2.key !== ROOT_KEY &&
      option2.segments.length === segments.length &&
      option2.segments.every((segment, index2) => segment === segments[index2]),
  );
}

function childrenOf(options, path2) {
  return options.filter(
    (option2) =>
      option2.key !== ROOT_KEY &&
      option2.segments.length === path2.length + 1 &&
      path2.every((segment, index2) => option2.segments[index2] === segment),
  );
}

function FolderRow$1({
  label,
  isSelected,
  canDrill = false,
  drillLabel,
  onPick,
  onDrill,
}) {
  return (
    <div
      className={cn$2(
        "flex w-full items-center gap-1 rounded-lg pr-1.5 transition-colors focus-within:bg-popup-item-hover focus-within:text-foreground hover:bg-popup-item-hover hover:text-foreground",
        isSelected ? "text-foreground" : "text-foreground/70",
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-2 pl-2 text-xs outline-none select-none"
        onClick={onPick}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" && canDrill && onDrill) {
            event.preventDefault();
            onDrill();
          }
        }}
      >
        <Folder size={13} strokeWidth={1.5} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        {isSelected ? (
          <Check size={14} strokeWidth={1.5} className="shrink-0" />
        ) : null}
      </button>
      {canDrill && onDrill ? (
        <button
          type="button"
          aria-label={drillLabel}
          title={drillLabel}
          className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
          onClick={onDrill}
        >
          <ChevronRight$1 size={14} strokeWidth={1.5} />
        </button>
      ) : null}
    </div>
  );
}

export function FolderDrillDownPicker({
  options,
  value,
  onChange,
  loading = false,
  className,
  actionUiId,
}) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const [browsePath, setBrowsePath] = reactExports.useState([]);
  const selected2 = reactExports.useMemo(
    () => options.find((option2) => option2.key === value),
    [options, value],
  );
  const browseOption = reactExports.useMemo(
    () => findBySegments(options, browsePath),
    [options, browsePath],
  );
  const children2 = reactExports.useMemo(
    () => childrenOf(options, browsePath),
    [options, browsePath],
  );
  const hasChildren2 = reactExports.useCallback(
    (option2) => childrenOf(options, option2.segments).length > 0,
    [options],
  );
  const handleOpenChange = reactExports.useCallback(
    (next2) => {
      setOpen(next2);
      if (next2)
        setBrowsePath(selected2 ? selected2.segments.slice(0, -1) : []);
    },
    [selected2],
  );
  const pick = reactExports.useCallback(
    (key2) => {
      if (!key2) return;
      onChange(key2);
      setOpen(false);
    },
    [onChange],
  );
  const leafName = selected2?.segments[selected2.segments.length - 1];
  const parentPrefix =
    selected2 && selected2.segments.length > 1
      ? selected2.segments.slice(0, -1).join(" / ")
      : void 0;
  const currentLevelLabel =
    browsePath.length === 0
      ? t2("localAssets.saveRootFolder")
      : (browsePath[browsePath.length - 1] ?? "");
  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={cn$2(
          "flex h-8 min-w-0 cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-xs transition-colors outline-none select-none hover:bg-muted/60 hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
          className,
        )}
        data-action-ui-id={actionUiId}
      >
        {selected2 ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <Folder
              size={13}
              strokeWidth={1.5}
              className="shrink-0 text-muted-foreground"
            />
            <span className="truncate">
              {parentPrefix ? (
                <span className="text-muted-foreground">
                  {parentPrefix}
                  {" / "}
                </span>
              ) : null}
              {selected2.segments.length === 0
                ? t2("localAssets.saveRootFolder")
                : leafName}
            </span>
          </span>
        ) : (
          <span className="truncate text-muted-foreground">
            {loading
              ? t2("common.loading")
              : t2("localAssets.saveLocationPlaceholder")}
          </span>
        )}
        <ChevronDown
          size={16}
          strokeWidth={1}
          className="shrink-0 text-muted-foreground"
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        positionerClassName="z-[70]"
        className="w-(--anchor-width) min-w-64 gap-0 p-1"
      >
        <div className="flex min-w-0 items-center gap-0.5 overflow-hidden px-1 py-1 text-xs">
          <button
            type="button"
            onClick={() => setBrowsePath([])}
            className={cn$2(
              "min-w-6 max-w-28 truncate rounded-md px-1 py-0.5 transition-colors",
              browsePath.length === 0
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
            )}
          >
            {t2("localAssets.saveRootFolder")}
          </button>
          {browsePath.map((segment, index2) => {
            const prefixPath = browsePath.slice(0, index2 + 1).join("/");
            const isLast = index2 === browsePath.length - 1;
            return (
              <span
                key={prefixPath}
                className="flex min-w-0 items-center gap-0.5"
              >
                <ChevronRight$1
                  size={12}
                  strokeWidth={1}
                  className="shrink-0 text-muted-foreground/60"
                />
                <button
                  type="button"
                  onClick={() => setBrowsePath(browsePath.slice(0, index2 + 1))}
                  className={cn$2(
                    "min-w-6 max-w-28 truncate rounded-md px-1 py-0.5 transition-colors",
                    isLast
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
                  )}
                >
                  {segment}
                </button>
              </span>
            );
          })}
        </div>
        <div className="mb-1 h-px shrink-0 bg-foreground/5" />
        <FolderRow$1
          label={currentLevelLabel}
          isSelected={browseOption !== void 0 && browseOption.key === value}
          onPick={() => pick(browseOption?.key)}
        />
        {children2.length > 0 ? (
          <div className="flex max-h-56 flex-col overflow-y-auto">
            {children2.map((child) => (
              <FolderRow$1
                key={child.key}
                label={child.segments[child.segments.length - 1] ?? ""}
                isSelected={child.key === value}
                canDrill={hasChildren2(child)}
                drillLabel={t2("localAssets.folderPickerEnter")}
                onPick={() => pick(child.key)}
                onDrill={() => setBrowsePath(child.segments)}
              />
            ))}
          </div>
        ) : (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            {t2("localAssets.folderPickerEmpty")}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
