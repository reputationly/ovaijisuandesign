// file-explorer.jsx
import {
  useTranslation,
  reactExports,
  dedupedToast,
  useGatewayFetch,
  usePlatform,
  ChevronDown,
  ContextMenu,
  FolderOpen,
  useCurrentWorkspace,
  useWorkspaceProject,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  X$7,
  useStableCallback,
  Check,
  LayoutList,
  LayoutGrid,
  useGatewayScopeKey,
  useQueryClient,
  findEntryByPath,
  FilterMenuTrigger,
  FilterMenu,
  Popover,
  useFileExplorerOverlayBridge,
} from "../vendor.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  cn$2,
  TooltipContent,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { PageStateBoundary } from "../asset-center/shared/page-state-boundary.jsx";
import { RetryIcon } from "../m08/browser-inspiration-urls.jsx";
import { ContextMenuTrigger } from "../m10/new-workspace-dialog.jsx";
import { SegmentedSwitch, PopoverContent } from "../m09/use-credit-details.jsx";
import {
  isCanvasColorTag,
  PRESET_COLOR_NAME_KEYS,
  isCanvasKeywordTag,
} from "../m01/normalize-tag-registry.js";
import { Calendar } from "../m09/team-credit-summary-surface.jsx";
import { useAssets, useMediaActions } from "../m10/use-media-actions.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  AssetPanelOverlayHost,
  DeleteConfirmDialog$1,
  DropOverlay,
  FileExplorerGridView,
  FileExplorerTreeView,
  PromoteToAssetForm,
  getCanvasTagPresentationColor,
} from "./asset-panel-overlay-host.jsx";
import {
  SaveToProjectAssetsDialog,
  useConflictResolver,
} from "./save-to-project-assets-dialog.jsx";
import { FileExplorerSearchBar } from "./team-assets-sidebar-panel.jsx";
import {
  buildTreeFileComparator,
  expandSelectionForDelete,
  filterAndSortAssets,
  filterTreeByPredicate,
  joinFilePath,
  retainKnownTagFilters,
  toRelativeFromRoot,
  useAssetMenuShortcuts,
  useAssetPanelPreferences,
  useFileExplorerCanvasIntegration,
} from "./use-asset-menu-shortcuts.js";
import { ConflictResolutionDialog, useTagRegistry } from "./use-canvas-tags.jsx";
import {
  useFileExplorerClipboard,
  useFileExplorerCreate,
  useFileExplorerDelete,
} from "./use-file-explorer-clipboard.jsx";
import {
  useFileExplorerDrag,
  useFileExplorerGridDelegates,
  useFileExplorerImport,
  useFileExplorerKeyboard,
  useFileExplorerMissingRecovery,
} from "./use-file-explorer-import.js";
import {
  useFileExplorerPanelClose,
  useFileExplorerRename,
  useFileExplorerRootDrop,
  useFileExplorerScrollContainer,
  useFileExplorerSelection,
  useFileExplorerShortcuts,
} from "./use-file-explorer-shortcuts.js";
import {
  AssetEmptyAreaMenuContent,
  useFileExplorerWorkspaceDirs,
  useFlattenTree,
} from "./use-flatten-tree.jsx";
function PromoteToAssetDialog({ files, workspaceRoot, onClose }) {
  const { t: t2 } = useTranslation();
  const [isSubmitting, setIsSubmitting] = reactExports.useState(false);
  const filesLen = files?.length ?? 0;
  const open = files !== null && filesLen > 0;
  return (
    <Dialog
      open={open}
      onOpenChange={(o2) => {
        if (!o2 && !isSubmitting) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-xl"
        data-action-ui-id="asset-panel.promote-to-asset-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t2("assetCenter.promote.title")}</DialogTitle>
          <DialogDescription className="text-xs">
            {t2("assetCenter.promote.descriptionMulti", {
              count: filesLen,
            })}
          </DialogDescription>
        </DialogHeader>
        {open && files && (
          <PromoteToAssetForm
            files={files}
            workspaceRoot={workspaceRoot}
            onCancel={onClose}
            onSuccess={onClose}
            onSubmittingChange={setIsSubmitting}
            variant="dialog"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
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
      className={cn$2("w-auto min-w-36 gap-0.5 overflow-hidden p-1.5", className)}
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
        <Check aria-hidden="true" size={14} strokeWidth={2} className="ml-3 shrink-0" />
      )}
    </button>
  );
}
const TYPE_OPTIONS = [
  {
    value: "image",
    labelKey: "assetFilter.typeImage",
    fallback: "Image",
  },
  {
    value: "video",
    labelKey: "assetFilter.typeVideo",
    fallback: "Video",
  },
  {
    value: "audio",
    labelKey: "assetFilter.typeAudio",
    fallback: "Audio",
  },
  {
    value: "text",
    labelKey: "assetFilter.typeText",
    fallback: "Text",
  },
  {
    value: "other",
    labelKey: "assetFilter.typeOther",
    fallback: "Other",
  },
];
const DATE_PRESETS = [
  {
    value: "all",
    labelKey: "assetFilter.dateAll",
    fallback: "All time",
  },
  {
    value: "today",
    labelKey: "assetFilter.dateToday",
    fallback: "Today",
  },
  {
    value: "last7days",
    labelKey: "assetFilter.dateLast7Days",
    fallback: "Last 7 days",
  },
  {
    value: "last30days",
    labelKey: "assetFilter.dateLast30Days",
    fallback: "Last 30 days",
  },
  {
    value: "custom",
    labelKey: "assetFilter.dateCustom",
    fallback: "Custom",
  },
];
function toIsoDate(date2) {
  const y4 = date2.getFullYear();
  const m3 = String(date2.getMonth() + 1).padStart(2, "0");
  const d2 = String(date2.getDate()).padStart(2, "0");
  return `${y4}-${m3}-${d2}`;
}
function fromIsoDate(value) {
  if (!value) return void 0;
  const [y4, m3, d2] = value.split("-").map(Number);
  if (!y4 || !m3 || !d2) return void 0;
  return new Date(y4, m3 - 1, d2);
}
function formatMonthDay(iso) {
  const d2 = fromIsoDate(iso);
  if (!d2) return iso;
  const m3 = String(d2.getMonth() + 1).padStart(2, "0");
  const day = String(d2.getDate()).padStart(2, "0");
  return `${m3}-${day}`;
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
function FilterTrigger({
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
                active2 && onClear ? TRIGGER_BUTTON_ACTIVE_CLASS : TRIGGER_BUTTON_DEFAULT_CLASS,
              )}
            />
          }
        >
          <span className="min-w-0 truncate whitespace-nowrap">{label}</span>
          {!active2 && <ChevronDown size={16} strokeWidth={1.5} className="shrink-0 opacity-70" />}
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
function TypeFilterPopover({ typeFilters, onChange }) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const allSelected = typeFilters.length === 0;
  const isPartial = !allSelected;
  const active2 = isPartial;
  const triggerLabel = reactExports.useMemo(() => {
    const base2 = t2("assetFilter.typeSection");
    if (typeFilters.length === 0) return base2;
    if (typeFilters.length === 1) {
      const opt = TYPE_OPTIONS.find((o2) => o2.value === typeFilters[0]);
      return opt ? t2(opt.labelKey, opt.fallback) : typeFilters[0];
    }
    return `${base2} · ${typeFilters.length}`;
  }, [t2, typeFilters]);
  const clearTypeFilter = reactExports.useCallback(() => {
    onChange([]);
    setOpen(false);
  }, [onChange]);
  const toggleAll = reactExports.useCallback(() => {
    if (allSelected) return;
    onChange([]);
  }, [allSelected, onChange]);
  const toggle = reactExports.useCallback(
    (value) => {
      if (allSelected) {
        onChange([value]);
        return;
      }
      const set2 = new Set(typeFilters);
      if (set2.has(value)) {
        if (set2.size === 1) {
          onChange([]);
          return;
        }
        set2.delete(value);
      } else {
        set2.add(value);
      }
      const next2 = Array.from(set2);
      if (next2.length === TYPE_OPTIONS.length) onChange([]);
      else onChange(next2);
    },
    [typeFilters, allSelected, onChange],
  );
  return (
    <FilterMenu open={open} onOpenChange={setOpen}>
      <FilterTrigger
        label={triggerLabel}
        active={active2}
        open={open}
        testId="asset-panel.type-filter-trigger"
        clearLabel={t2("assetFilter.reset")}
        onClear={active2 ? clearTypeFilter : void 0}
      />
      <PopoverContent
        align="start"
        className="w-auto min-w-36 gap-0.5 p-1.5 overflow-hidden"
        data-slot="type-filter-popover"
      >
        <FilterMenuItem
          selected={allSelected}
          onClick={toggleAll}
          data-action-ui-id="asset-panel.type-filter-option-all"
        >
          {t2("assetFilter.typeAll")}
        </FilterMenuItem>
        {TYPE_OPTIONS.map((opt) => {
          const selected2 = !allSelected && typeFilters.includes(opt.value);
          const label = t2(opt.labelKey, opt.fallback);
          return (
            <FilterMenuItem
              key={opt.value}
              selected={selected2}
              onClick={() => toggle(opt.value)}
              data-action-ui-id={`asset-panel.type-filter-option-${opt.value}`}
            >
              {label}
            </FilterMenuItem>
          );
        })}
      </PopoverContent>
    </FilterMenu>
  );
}
function DateFilterPopover({ dateFilter, sortOrder, onDateChange, onSortChange }) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const active2 = reactExports.useMemo(() => {
    if (dateFilter.kind === "all") return false;
    if (dateFilter.kind === "custom") {
      return Boolean(dateFilter.from) || Boolean(dateFilter.to);
    }
    return true;
  }, [dateFilter]);
  const triggerLabel = reactExports.useMemo(() => {
    const base2 = t2("assetFilter.dateSection");
    if (dateFilter.kind === "all") return base2;
    if (dateFilter.kind === "custom") {
      const from2 = dateFilter.from ? formatMonthDay(dateFilter.from) : "";
      const to = dateFilter.to ? formatMonthDay(dateFilter.to) : "";
      if (!from2 && !to) return base2;
      return `${from2 || "..."} ~ ${to || "..."}`;
    }
    const preset2 = DATE_PRESETS.find((p3) => p3.value === dateFilter.kind);
    return preset2 ? t2(preset2.labelKey, preset2.fallback) : base2;
  }, [t2, dateFilter]);
  const handlePreset = reactExports.useCallback(
    (kind) => {
      if (kind === "custom") {
        if (dateFilter.kind === "custom") return;
        onDateChange({
          kind: "custom",
          from: "",
          to: "",
        });
        return;
      }
      onDateChange({
        kind,
      });
    },
    [dateFilter, onDateChange],
  );
  const customRange = reactExports.useMemo(() => {
    if (dateFilter.kind !== "custom") return void 0;
    const from2 = fromIsoDate(dateFilter.from);
    const to = fromIsoDate(dateFilter.to);
    if (!from2 && !to) return void 0;
    return {
      from: from2,
      to,
    };
  }, [dateFilter]);
  const handleCustomSelect = reactExports.useCallback(
    (range2) => {
      onDateChange({
        kind: "custom",
        from: range2?.from ? toIsoDate(range2.from) : "",
        to: range2?.to ? toIsoDate(range2.to) : "",
      });
    },
    [onDateChange],
  );
  const clearDateFilter = reactExports.useCallback(() => {
    onDateChange({
      kind: "all",
    });
    setOpen(false);
  }, [onDateChange]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <FilterTrigger
        label={triggerLabel}
        active={active2}
        open={open}
        testId="asset-panel.date-filter-trigger"
        clearLabel={t2("assetFilter.reset")}
        onClear={active2 ? clearDateFilter : void 0}
      />
      <FilterMenuContent data-slot="date-filter-popover">
        <FilterMenuGroup>
          {["desc", "asc"].map((value) => {
            const isSelected = sortOrder === value;
            const label =
              value === "desc" ? t2("assetFilter.sortNewest") : t2("assetFilter.sortOldest");
            return (
              <FilterMenuItem
                key={value}
                selected={isSelected}
                onClick={() => onSortChange(value)}
                data-action-ui-id={`asset-panel.sort-${value}`}
              >
                {label}
              </FilterMenuItem>
            );
          })}
        </FilterMenuGroup>
        <FilterMenuGroup separated={true}>
          {DATE_PRESETS.map((preset2) => {
            const isSelected = dateFilter.kind === preset2.value;
            const label = t2(preset2.labelKey, preset2.fallback);
            return (
              <FilterMenuItem
                key={preset2.value}
                selected={isSelected}
                onClick={() => handlePreset(preset2.value)}
                data-action-ui-id={`asset-panel.date-filter-option-${preset2.value}`}
              >
                {label}
              </FilterMenuItem>
            );
          })}
        </FilterMenuGroup>
        {dateFilter.kind === "custom" && (
          <div
            data-slot="custom-date-range"
            className="overflow-hidden rounded-lg border border-border bg-background"
          >
            <Calendar
              mode="range"
              selected={customRange}
              onSelect={handleCustomSelect}
              numberOfMonths={1}
            />
          </div>
        )}
      </FilterMenuContent>
    </Popover>
  );
}
function TagFilterPopover({ tagFilters, onChange }) {
  const { t: t2 } = useTranslation();
  const registry2 = useTagRegistry();
  const [open, setOpen] = reactExports.useState(false);
  const active2 = tagFilters.length > 0;
  const displayName2 = reactExports.useCallback(
    (id2, custom, legacyNameKey) => {
      if (custom && custom.length > 0) return custom;
      return t2(legacyNameKey ?? PRESET_COLOR_NAME_KEYS[id2] ?? "") || id2;
    },
    [t2],
  );
  const triggerLabel = reactExports.useMemo(() => {
    const base2 = t2("assetFilter.tagSection");
    return active2 ? `${base2} · ${tagFilters.length}` : base2;
  }, [t2, active2, tagFilters.length]);
  const toggle = reactExports.useCallback(
    (id2) => {
      const set2 = new Set(tagFilters);
      if (set2.has(id2)) set2.delete(id2);
      else set2.add(id2);
      onChange(Array.from(set2));
    },
    [tagFilters, onChange],
  );
  const clear = reactExports.useCallback(() => {
    onChange([]);
    setOpen(false);
  }, [onChange]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <FilterTrigger
        label={triggerLabel}
        active={active2}
        open={open}
        testId="asset-panel.tag-filter-trigger"
        clearLabel={t2("assetFilter.reset")}
        onClear={active2 ? clear : void 0}
      />
      <PopoverContent
        align="start"
        className="w-auto min-w-36 gap-0.5 p-1.5"
        data-slot="tag-filter-popover"
      >
        {[
          {
            key: "color",
            label: t2("canvasTags.colorLabels"),
            tags: registry2.tags.filter(isCanvasColorTag),
          },
          {
            key: "keyword",
            label: t2("canvasTags.keywords"),
            tags: registry2.tags.filter(isCanvasKeywordTag),
          },
        ].map((group) =>
          group.tags.length > 0 ? (
            <div key={group.key} className="not-first:mt-1">
              <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
                {group.label}
              </div>
              {group.tags.map((tag) => {
                const checked = tagFilters.includes(tag.id);
                const label = displayName2(tag.id, tag.name, tag.legacyNameKey);
                return (
                  <FilterMenuItem
                    key={tag.id}
                    selected={checked}
                    onClick={() => toggle(tag.id)}
                    className="gap-2.5"
                    data-action-ui-id={`asset-panel.tag-filter-option-${tag.id}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {isCanvasColorTag(tag) ? (
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: getCanvasTagPresentationColor(tag.color),
                          }}
                          aria-hidden={true}
                        />
                      ) : (
                        <span
                          data-canvas-keyword-mark=""
                          className="size-2.5 shrink-0 rounded-full border border-muted-foreground"
                          aria-hidden={true}
                        />
                      )}
                      <span className="min-w-0 truncate text-left">{label}</span>
                    </span>
                  </FilterMenuItem>
                );
              })}
            </div>
          ) : null,
        )}
      </PopoverContent>
    </Popover>
  );
}
function ToolbarFilters({
  typeFilters,
  dateFilter,
  sortOrder,
  tagFilters,
  onTypeFiltersChange,
  onDateFilterChange,
  onSortOrderChange,
  onTagFiltersChange,
}) {
  return (
    <div className="flex h-full w-full items-stretch">
      <div className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto scrollbar-none">
        <TypeFilterPopover typeFilters={typeFilters} onChange={onTypeFiltersChange} />
        <TagFilterPopover tagFilters={tagFilters} onChange={onTagFiltersChange} />
        <DateFilterPopover
          dateFilter={dateFilter}
          sortOrder={sortOrder}
          onDateChange={onDateFilterChange}
          onSortChange={onSortOrderChange}
        />
      </div>
    </div>
  );
}
function resolveTreePaths(entries2, rootPath) {
  return entries2.map((entry) => ({
    ...entry,
    path: joinFilePath(rootPath, entry.path),
    children: entry.children ? resolveTreePaths(entry.children, rootPath) : void 0,
  }));
}
export function FileExplorer({
  onFileOpen,
  onRootPathChange,
  initialRootPath,
  isActive: isActive2,
  onClose,
  mode: _mode,
}) {
  const { t: t2 } = useTranslation();
  const gatewayFetch2 = useGatewayFetch();
  const gatewayScopeKey = useGatewayScopeKey();
  const platform2 = usePlatform();
  const currentWorkspace = useCurrentWorkspace();
  const [rootPath, setRootPath] = reactExports.useState(initialRootPath ?? null);
  const [expanded, setExpanded] = reactExports.useState(new Set());
  const [selectedPaths, setSelectedPaths] = reactExports.useState(new Set());
  const [lastSelectedPath, setLastSelectedPath] = reactExports.useState(null);
  const [viewMode, setViewMode] = reactExports.useState("tree");
  const [searchQuery, setSearchQuery2] = reactExports.useState("");
  const deferredSearchQuery = reactExports.useDeferredValue(searchQuery);
  const conflictResolver = useConflictResolver();
  const treeRef = reactExports.useRef([]);
  const sectionRef = reactExports.useRef(null);
  const { handlePanelKeyDownCapture } = useFileExplorerPanelClose({
    isActive: isActive2,
    onClose,
  });
  const searchInputRef = reactExports.useRef(null);
  const selectionAnchorRef = reactExports.useRef(null);
  const { typeFilters, dateFilter, sortOrder, setTypeFilters, setDateFilter, setSortOrder } =
    useAssetPanelPreferences();
  const [tagFilters, setTagFilters] = reactExports.useState([]);
  const tagRegistry = useTagRegistry();
  reactExports.useEffect(() => {
    const knownTagIds = tagRegistry.tags.map((tag) => tag.id);
    setTagFilters((current2) => retainKnownTagFilters(current2, knownTagIds));
  }, [tagRegistry.tags]);
  const tagSearchIds = reactExports.useMemo(() => {
    const q2 = deferredSearchQuery.trim().toLowerCase();
    if (!q2) return void 0;
    const ids2 = new Set();
    for (const tag of tagRegistry.tags) {
      const name2 =
        tag.name || t2(tag.legacyNameKey ?? PRESET_COLOR_NAME_KEYS[tag.id] ?? "") || tag.id;
      if (name2.toLowerCase().includes(q2)) ids2.add(tag.id);
    }
    return ids2;
  }, [tagRegistry, deferredSearchQuery, t2]);
  const {
    assets,
    refresh,
    rename,
    remove: remove2,
    move,
    mergeCandidate,
    removeMissing,
    manualLocate,
    duplicate,
  } = useAssets();
  const queryClient2 = useQueryClient();
  const { assetTree, invalidateDirs } = useFileExplorerWorkspaceDirs({
    rootPath,
    assets,
    gatewayFetch: gatewayFetch2,
    queryClient: queryClient2,
  });
  const {
    openWithDefault,
    openWith,
    pickAppAndOpen,
    copyPath: handleCopyPath,
    copyFile: handleCopyFile,
  } = useMediaActions();
  const tree = reactExports.useMemo(
    () => (rootPath ? resolveTreePaths(assetTree, rootPath) : assetTree),
    [assetTree, rootPath],
  );
  treeRef.current = tree;
  const toRelativePath = reactExports.useCallback(
    (absPath) => toRelativeFromRoot(rootPath ?? "", absPath),
    [rootPath],
  );
  reactExports.useEffect(() => {
    if (!rootPath && initialRootPath) {
      setRootPath(initialRootPath);
    }
  }, [initialRootPath, rootPath]);
  reactExports.useEffect(() => {
    onRootPathChange?.(rootPath);
  }, [rootPath, onRootPathChange]);
  const assetMap = reactExports.useMemo(() => {
    const map3 = new Map();
    for (const a2 of assets) {
      map3.set(a2.path, a2);
    }
    return map3;
  }, [assets]);
  const assetByAbsPath = reactExports.useMemo(() => {
    const map3 = new Map();
    if (!rootPath) return map3;
    for (const a2 of assets) {
      map3.set(joinFilePath(rootPath, a2.path), a2);
    }
    return map3;
  }, [assets, rootPath]);
  const filteredTree = reactExports.useMemo(
    () =>
      filterTreeByPredicate(tree, {
        query: deferredSearchQuery,
        typeFilters,
        dateFilter,
        getAsset: (path2) => assetByAbsPath.get(path2),
        tagFilters,
        tagSearchIds,
      }),
    [tree, deferredSearchQuery, typeFilters, dateFilter, assetByAbsPath, tagFilters, tagSearchIds],
  );
  const treeFileComparator = reactExports.useMemo(
    () => buildTreeFileComparator(sortOrder, (path2) => assetByAbsPath.get(path2)),
    [sortOrder, assetByAbsPath],
  );
  const { creatingEntry, startCreate, handleCreateConfirm, handleCreateCancel } =
    useFileExplorerCreate({
      setViewMode,
      expanded,
      setExpanded,
      rootPath,
      gatewayFetch: gatewayFetch2,
      conflictResolver,
      platformFs: platform2.fs,
      refresh,
      invalidateDirs,
      setSelectedPaths,
      setLastSelectedPath,
    });
  const flatRows = useFlattenTree(filteredTree, expanded, creatingEntry, treeFileComparator);
  const sortedFilteredAssets = reactExports.useMemo(
    () =>
      filterAndSortAssets(assets, {
        query: deferredSearchQuery,
        typeFilters,
        dateFilter,
        sortOrder,
        tagFilters,
        tagSearchIds,
      }),
    [assets, deferredSearchQuery, typeFilters, dateFilter, sortOrder, tagFilters, tagSearchIds],
  );
  const { scrollEl, scrollCallbackRef, containerWidth } = useFileExplorerScrollContainer();
  const columnsPerRow = Math.max(2, Math.floor(containerWidth / 100));
  const resetScrollToTop = reactExports.useCallback(
    (_mode2 = viewMode) => {
      scrollEl?.scrollTo({
        top: 0,
        behavior: "auto",
      });
    },
    [viewMode, scrollEl],
  );
  const handleTypeFiltersChange = useStableCallback((next2) => {
    setTypeFilters(next2);
    resetScrollToTop();
  });
  const handleDateFilterChange = useStableCallback((next2) => {
    setDateFilter(next2);
    resetScrollToTop();
  });
  const handleSortOrderChange = useStableCallback((next2) => {
    setSortOrder(next2);
    resetScrollToTop();
  });
  const openFolder = reactExports.useCallback(async () => {
    const paths = await platform2.fs.showOpenDialog?.({
      directory: true,
    });
    if (!paths || paths.length === 0) return;
    const dir = paths[0];
    setRootPath(dir);
    setExpanded(new Set());
    setSelectedPaths(new Set());
    setLastSelectedPath(null);
  }, [platform2]);
  const refreshRoot = useStableCallback(async () => {
    await refresh();
    invalidateDirs();
  });
  const toggleFolder = reactExports.useCallback((path2) => {
    setExpanded((prev) => {
      const next2 = new Set(prev);
      if (next2.has(path2)) next2.delete(path2);
      else next2.add(path2);
      return next2;
    });
  }, []);
  const { updateSelection: updateSelection2, handleFileSelect } = useFileExplorerSelection({
    lastSelectedPath,
    flatRows,
    setSelectedPaths,
    setLastSelectedPath,
    selectionAnchorRef,
  });
  const { buildDragPayload, handleMove } = useFileExplorerDrag({
    selectedPaths,
    toRelativePath,
    treeRef,
    assetMap,
    move,
    invalidateDirs,
  });
  const handleFileDoubleClick = useStableCallback((path2) => {
    const findName2 = (entries2) => {
      for (const e2 of entries2) {
        if (e2.path === path2) return e2.name;
        if (e2.children) {
          const found2 = findName2(e2.children);
          if (found2) return found2;
        }
      }
      return null;
    };
    const name2 = findName2(treeRef.current);
    if (name2) {
      onFileOpen?.(path2, name2);
    }
  });
  const { renamingPath, startRename, handleRename, handleRenameCancel } = useFileExplorerRename({
    rename,
    toRelativePath,
    invalidateDirs,
  });
  const { deletingEntries, requestDelete, cancelDelete, handleDeleteConfirm } =
    useFileExplorerDelete({
      remove: remove2,
      toRelativePath,
      invalidateDirs,
      lastSelectedPath,
      setLastSelectedPath,
      selectionAnchorRef,
      selectedPaths,
      setSelectedPaths,
      // Asset-undo wiring (ADR-009): hook needs both to render the
      // 10s countdown toast on successful single-file delete.
      gatewayFetch: gatewayFetch2,
      queryClient: queryClient2,
      gatewayScopeKey,
    });
  const requestDeleteFromAnchor = useStableCallback((anchor) => {
    requestDelete(expandSelectionForDelete(anchor, selectedPaths, filteredTree));
  });
  const {
    externalDragOver,
    handleImportFilesFromMenu,
    handleExternalDragEnter,
    handleExternalDragOver,
    handleExternalDragLeave,
    handleExternalDrop,
  } = useFileExplorerImport({
    gatewayFetch: gatewayFetch2,
    platform: platform2,
    rootPath,
    conflictResolver,
    refresh,
    setSelectedPaths,
    setLastSelectedPath,
  });
  const handleShowInFolder = useStableCallback(async (path2) => {
    if (!platform2.shell.showItemInFolder) {
      dedupedToast.error(t2("fileExplorer.platformNotSupported"));
      return;
    }
    try {
      await platform2.shell.showItemInFolder(path2);
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.locateFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  const { handleRootDragEnter, handleRootDragOver, handleRootDragLeave, handleRootDrop } =
    useFileExplorerRootDrop({
      rootPath,
      handleMove,
      handleExternalDragEnter,
      handleExternalDragOver,
      handleExternalDragLeave,
      handleExternalDrop,
    });
  const {
    resolveAssetPath,
    handleGridSelect,
    handleGridDoubleClick,
    handleGridDelete,
    handleGridCopyPath,
    handleGridCopyFile,
    handleGridShowInFolder,
  } = useFileExplorerGridDelegates({
    rootPath,
    sortedFilteredAssets,
    filteredTree,
    updateSelection: updateSelection2,
    onFileOpen,
    requestDeleteFromAnchor,
    handleCopyPath,
    handleCopyFile,
    handleShowInFolder,
  });
  const {
    handleMergeCandidate,
    handleRemoveMissing,
    handleLocateMissing,
    handleTreeMergeCandidate,
    handleTreeRemoveMissing,
    handleTreeLocateMissing,
  } = useFileExplorerMissingRecovery({
    mergeCandidate,
    removeMissing,
    manualLocate,
    platform: platform2,
    toRelativePath,
    assetMap,
  });
  const { handleAddToCanvas, handleAddToChat, handleDuplicateForGrid, handleDuplicateForTree } =
    useFileExplorerCanvasIntegration({
      selectedPaths,
      toRelativePath,
      filteredTree,
      assetMap,
      duplicate,
    });
  const [promoteFiles, setPromoteFiles] = reactExports.useState(null);
  const workspaceProject = useWorkspaceProject(currentWorkspace ?? void 0);
  const isTeamProject = workspaceProject?.kind === "team";
  const [saveToProjectFiles, setSaveToProjectFiles] = reactExports.useState(null);
  const collectPromoteFiles = reactExports.useCallback(
    (target) => {
      if (target.isDirectory || target.isMissing) return [];
      const inSelection = selectedPaths.has(target.path) && selectedPaths.size > 1;
      const targetPaths = inSelection ? Array.from(selectedPaths) : [target.path];
      const resolved = [];
      for (const p3 of targetPaths) {
        const entry = findEntryByPath(filteredTree, p3);
        if (!entry || entry.isDirectory || entry.status === "missing") continue;
        const asset = assetByAbsPath.get(p3);
        const vaultPrompt = asset?.prompt && asset.prompt.trim().length > 0 ? asset.prompt : void 0;
        resolved.push({
          workspaceRelPath: toRelativePath(p3),
          absolutePath: p3,
          displayName: entry.name,
          ...(vaultPrompt
            ? {
                vaultPrompt,
              }
            : {}),
        });
      }
      return resolved;
    },
    [toRelativePath, selectedPaths, filteredTree, assetByAbsPath],
  );
  const handleAddToLibrary = reactExports.useMemo(
    () =>
      isTeamProject
        ? void 0
        : (target) => {
            const resolved = collectPromoteFiles(target);
            if (resolved.length > 0) setPromoteFiles(resolved);
          },
    [isTeamProject, collectPromoteFiles],
  );
  const handleSaveToProjectAssets = reactExports.useMemo(
    () =>
      workspaceProject
        ? (target) => {
            const resolved = collectPromoteFiles(target);
            if (resolved.length > 0)
              setSaveToProjectFiles({
                files: resolved,
              });
          }
        : void 0,
    [workspaceProject, collectPromoteFiles],
  );
  const handlePromoteClose = reactExports.useCallback(() => setPromoteFiles(null), []);
  const { clipboardHasContent, handleNativePaste, handlePasteFromMenu, probeClipboard } =
    useFileExplorerClipboard({
      gatewayFetch: gatewayFetch2,
      platform: platform2,
      rootPath,
      refresh,
      setSelectedPaths,
      setLastSelectedPath,
      sectionRef,
    });
  const handleNewFolderFromMenu = useStableCallback(() => {
    if (!rootPath) return;
    startCreate(rootPath, true);
  });
  const handleStartCreateInside = useStableCallback((parentAbsPath) => {
    if (!rootPath) return;
    startCreate(parentAbsPath, true);
  });
  const {
    overlayHostRef,
    registerRowAnchor,
    getRowAnchor,
    handleHoverIntent,
    handleHoverEnd,
    handleHoverLocateOnCanvas,
    handleLocateOnCanvas,
    handleLocateMissingConfirmInsert,
  } = useFileExplorerOverlayBridge({
    rootPath,
    assetByAbsPath,
    currentWorkspace,
    filteredTree,
    handleAddToCanvas,
  });
  const primaryPath =
    lastSelectedPath && selectedPaths.has(lastSelectedPath) ? lastSelectedPath : null;
  const primaryRowHandlers = reactExports.useMemo(() => {
    if (!primaryPath) return {};
    const entry = findEntryByPath(filteredTree, primaryPath);
    if (!entry) return {};
    const target = {
      path: entry.path,
      name: entry.name,
      isDirectory: entry.isDirectory,
      isMissing: entry.status === "missing",
    };
    const isMissing = entry.status === "missing";
    const isDirectory = entry.isDirectory;
    return {
      onAddToCanvas: () => handleAddToCanvas(target),
      // openWithDefault matches the menu's "Open" item — both files and
      // missing/directory rows hide the entry / disable the shortcut.
      onOpenDefault: isDirectory || isMissing ? void 0 : () => openWithDefault(entry.path),
      onShowInFolder: () => handleShowInFolder(entry.path),
      onRename: () => startRename(entry.path),
      onDelete: () => requestDeleteFromAnchor(entry),
    };
  }, [
    primaryPath,
    filteredTree,
    openWithDefault,
    startRename,
    requestDeleteFromAnchor,
    handleAddToCanvas,
    handleShowInFolder,
  ]);
  const visiblePaths = reactExports.useMemo(() => {
    if (viewMode === "tree") {
      return flatRows
        .filter((r2) => !r2.entry.path.endsWith("/__creating__"))
        .map((r2) => r2.entry.path);
    }
    return sortedFilteredAssets.map((a2) => (rootPath ? joinFilePath(rootPath, a2.path) : a2.path));
  }, [viewMode, flatRows, sortedFilteredAssets, rootPath]);
  const { panelLevelHandlers } = useFileExplorerShortcuts({
    setSelectedPaths,
    setLastSelectedPath,
    setViewMode,
    selectionAnchorRef,
    searchInputRef,
    selectedPaths,
    visiblePaths,
    primaryPath,
    primaryRowHandlers,
    resetScrollToTop,
    toRelativePath,
    handleCopyFile,
    duplicate,
    gatewayFetch: gatewayFetch2,
    queryClient: queryClient2,
    gatewayScopeKey,
  });
  const dispatchShortcut = useAssetMenuShortcuts(panelLevelHandlers);
  useFileExplorerKeyboard({
    sectionRef,
    primaryPath,
    visiblePaths,
    viewMode,
    columnsPerRow,
    flatRows,
    getRowAnchor,
    dispatchShortcut,
    selectionAnchorRef,
    setSelectedPaths,
    setLastSelectedPath,
  });
  const handleSectionPointerDown = reactExports.useCallback((e2) => {
    const target = e2.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }
    sectionRef.current?.focus({
      preventScroll: true,
    });
  }, []);
  const handleSwitchViewMode = useStableCallback(() => {
    const next2 = viewMode === "tree" ? "grid" : "tree";
    setViewMode(next2);
    resetScrollToTop(next2);
  });
  const handleShowRootInFolder = reactExports.useCallback(async () => {
    if (!rootPath || !platform2.shell.showItemInFolder) {
      dedupedToast.error(t2("fileExplorer.platformNotSupported"));
      return;
    }
    try {
      await platform2.shell.showItemInFolder(rootPath);
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.locateFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  }, [rootPath, platform2, t2]);
  const treeViewHandlers = reactExports.useMemo(
    () => ({
      buildDragPayload,
      onToggle: toggleFolder,
      onFileSelect: handleFileSelect,
      onFileDoubleClick: handleFileDoubleClick,
      onRename: handleRename,
      onDelete: requestDeleteFromAnchor,
      onCopyPath: handleCopyPath,
      onCopyFile: handleCopyFile,
      onDuplicate: handleDuplicateForTree,
      onMove: handleMove,
      onStartRename: startRename,
      onCreateConfirm: handleCreateConfirm,
      onCreateCancel: handleCreateCancel,
      onStartCreateInside: handleStartCreateInside,
      onRenameCancel: handleRenameCancel,
      onShowInFolder: handleShowInFolder,
      onMergeCandidate: handleTreeMergeCandidate,
      onRemoveMissing: handleTreeRemoveMissing,
      onLocateMissing: handleTreeLocateMissing,
      onSwitchViewMode: handleSwitchViewMode,
      onAddToCanvas: handleAddToCanvas,
      onAddToChat: handleAddToChat,
      onPromoteToAsset: handleAddToLibrary,
      onSaveToProjectAssets: handleSaveToProjectAssets,
      onLocateOnCanvas: handleLocateOnCanvas,
      onAnchorMount: registerRowAnchor,
      onOpenDefault: openWithDefault,
      onOpenWith: openWith,
      onPickAppAndOpen: pickAppAndOpen,
      onHoverIntent: handleHoverIntent,
      onHoverEnd: handleHoverEnd,
    }),
    [
      buildDragPayload,
      toggleFolder,
      handleFileSelect,
      handleFileDoubleClick,
      handleRename,
      requestDeleteFromAnchor,
      handleCopyPath,
      handleCopyFile,
      handleDuplicateForTree,
      handleMove,
      startRename,
      handleCreateConfirm,
      handleCreateCancel,
      handleStartCreateInside,
      handleRenameCancel,
      handleShowInFolder,
      handleTreeMergeCandidate,
      handleTreeRemoveMissing,
      handleTreeLocateMissing,
      handleSwitchViewMode,
      handleAddToCanvas,
      handleAddToChat,
      handleAddToLibrary,
      handleSaveToProjectAssets,
      handleLocateOnCanvas,
      registerRowAnchor,
      openWithDefault,
      openWith,
      pickAppAndOpen,
      handleHoverIntent,
      handleHoverEnd,
    ],
  );
  const gridViewHandlers = reactExports.useMemo(
    () => ({
      buildDragPayload,
      onSelect: handleGridSelect,
      onDoubleClick: handleGridDoubleClick,
      onDelete: handleGridDelete,
      onCopyPath: handleGridCopyPath,
      onCopyFile: handleGridCopyFile,
      onDuplicate: handleDuplicateForGrid,
      onShowInFolder: handleGridShowInFolder,
      onStartRename: startRename,
      onRename: handleRename,
      onRenameCancel: handleRenameCancel,
      onMergeCandidate: handleMergeCandidate,
      onRemoveMissing: handleRemoveMissing,
      onLocateMissing: handleLocateMissing,
      onSwitchViewMode: handleSwitchViewMode,
      onAddToCanvas: handleAddToCanvas,
      onAddToChat: handleAddToChat,
      onPromoteToAsset: handleAddToLibrary,
      onSaveToProjectAssets: handleSaveToProjectAssets,
      onLocateOnCanvas: handleLocateOnCanvas,
      onAnchorMount: registerRowAnchor,
      onOpenDefault: openWithDefault,
      onOpenWith: openWith,
      onPickAppAndOpen: pickAppAndOpen,
      onHoverIntent: handleHoverIntent,
      onHoverEnd: handleHoverEnd,
    }),
    [
      buildDragPayload,
      handleGridSelect,
      handleGridDoubleClick,
      handleGridDelete,
      handleGridCopyPath,
      handleGridCopyFile,
      handleDuplicateForGrid,
      handleGridShowInFolder,
      startRename,
      handleRename,
      handleRenameCancel,
      handleMergeCandidate,
      handleRemoveMissing,
      handleLocateMissing,
      handleSwitchViewMode,
      handleAddToCanvas,
      handleAddToChat,
      handleAddToLibrary,
      handleSaveToProjectAssets,
      handleLocateOnCanvas,
      registerRowAnchor,
      openWithDefault,
      openWith,
      pickAppAndOpen,
      handleHoverIntent,
      handleHoverEnd,
    ],
  );
  if (!rootPath) {
    return (
      <PageStateBoundary
        empty={true}
        density="panel"
        className="h-full"
        emptyOptions={{
          title: t2("fileExplorer.noOpenFolder"),
          description: t2("fileExplorer.selectFolderHint"),
          actions: [
            {
              key: "open-folder",
              label: t2("fileExplorer.openFolder"),
              variant: "outline",
              icon: <FolderOpen size={14} strokeWidth={1.5} />,
              onClick: openFolder,
            },
          ],
        }}
      />
    );
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drop zone for external file import
    <section
      ref={sectionRef}
      tabIndex={-1}
      className="flex flex-col h-full overflow-hidden relative outline-none"
      onDragEnter={handleRootDragEnter}
      onDragOver={handleRootDragOver}
      onDragLeave={handleRootDragLeave}
      onDrop={handleRootDrop}
      onPaste={handleNativePaste}
      onPointerDown={handleSectionPointerDown}
      onKeyDownCapture={handlePanelKeyDownCapture}
    >
      {externalDragOver && <DropOverlay />}
      <div className="flex shrink-0 items-center gap-1 px-2 pt-2 pb-2">
        <FileExplorerSearchBar
          value={searchQuery}
          onChange={setSearchQuery2}
          inputRef={searchInputRef}
          className="min-w-0 flex-1 !p-0"
        />
        <TooltipProvider>
          <div className="flex shrink-0 items-center gap-0.5">
            <SegmentedSwitch
              value={viewMode}
              onValueChange={setViewMode}
              dataActionUiId="file-view-mode-toggle"
              thumbDataSlot="file-view-mode-thumb"
              size="sm"
              iconSize={13}
              options={[
                {
                  value: "tree",
                  label: t2("fileExplorer.treeView"),
                  ariaLabel: t2("fileExplorer.treeView"),
                  icon: LayoutList,
                  tooltip: t2("fileExplorer.treeView"),
                  dataActionUiId: "asset-panel.view-tree",
                },
                {
                  value: "grid",
                  label: t2("fileExplorer.gridView"),
                  ariaLabel: t2("fileExplorer.gridView"),
                  icon: LayoutGrid,
                  tooltip: t2("fileExplorer.gridView"),
                  dataActionUiId: "asset-panel.view-grid",
                },
              ]}
            />
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={t2("fileExplorer.refreshList")}
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
                    onClick={() => void refreshRoot()}
                    data-action-ui-id="asset-panel.refresh"
                  />
                }
              >
                <RetryIcon size={14} />
              </TooltipTrigger>
              <TooltipContent side="bottom">{t2("fileExplorer.refresh")}</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
      <div className="shrink-0 px-2 pb-1">
        <div className="h-7">
          <ToolbarFilters
            typeFilters={typeFilters}
            dateFilter={dateFilter}
            sortOrder={sortOrder}
            tagFilters={tagFilters}
            onTypeFiltersChange={handleTypeFiltersChange}
            onDateFilterChange={handleDateFilterChange}
            onSortOrderChange={handleSortOrderChange}
            onTagFiltersChange={setTagFilters}
          />
        </div>
      </div>
      <ContextMenu
        onOpenChange={(open) => {
          if (!open) return;
          probeClipboard();
        }}
      >
        <ContextMenuTrigger
          render={
            <div
              ref={scrollCallbackRef}
              className="flex-1 overflow-y-auto scrollbar-none pt-1 pb-12"
            />
          }
        >
          {filteredTree.length === 0 ? (
            <PageStateBoundary
              empty={true}
              density="panel"
              className="h-full"
              emptyOptions={{
                title:
                  searchQuery.trim().length > 0
                    ? t2("fileExplorer.noMatchingFiles")
                    : t2("fileExplorer.assetsHint", "Generated assets land here"),
                description:
                  searchQuery.trim().length > 0
                    ? void 0
                    : t2("fileExplorer.localStorageHint", "Files are stored locally."),
              }}
            />
          ) : viewMode === "tree" ? (
            <FileExplorerTreeView
              flatRows={flatRows}
              expanded={expanded}
              selectedPaths={selectedPaths}
              rootPath={rootPath}
              viewMode={viewMode}
              assetByAbsPath={assetByAbsPath}
              renamingPath={renamingPath}
              scrollEl={scrollEl}
              creatingEntry={creatingEntry}
              handlers={treeViewHandlers}
            />
          ) : (
            <FileExplorerGridView
              sortedFilteredAssets={sortedFilteredAssets}
              containerWidth={containerWidth}
              selectedPaths={selectedPaths}
              viewMode={viewMode}
              renamingPath={renamingPath}
              resolveAssetPath={resolveAssetPath}
              scrollEl={scrollEl}
              handlers={gridViewHandlers}
            />
          )}
        </ContextMenuTrigger>
        <AssetEmptyAreaMenuContent
          viewMode={viewMode}
          onSwitchViewMode={handleSwitchViewMode}
          onRefresh={refresh}
          onShowRootInFolder={handleShowRootInFolder}
          rootInFolderDisabled={!rootPath}
          onNewFolder={handleNewFolderFromMenu}
          onImportFiles={handleImportFilesFromMenu}
          onPaste={handlePasteFromMenu}
          clipboardHasContent={clipboardHasContent}
        />
      </ContextMenu>
      <ConflictResolutionDialog {...conflictResolver.dialogProps} />
      <AssetPanelOverlayHost
        ref={overlayHostRef}
        onLocateOnCanvas={handleHoverLocateOnCanvas}
        onLocateMissingConfirmInsert={handleLocateMissingConfirmInsert}
      />
      <DeleteConfirmDialog$1
        entries={deletingEntries}
        onCancel={cancelDelete}
        onConfirm={handleDeleteConfirm}
      />
      <PromoteToAssetDialog
        files={promoteFiles}
        workspaceRoot={rootPath ?? null}
        onClose={handlePromoteClose}
      />
      <SaveToProjectAssetsDialog
        state={saveToProjectFiles}
        onOpenChange={(open) => {
          if (!open) setSaveToProjectFiles(null);
        }}
      />
    </section>
  );
}
