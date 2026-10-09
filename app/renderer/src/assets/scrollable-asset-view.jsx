// scrollable-asset-view.jsx
import { jsxRuntimeExports, useTranslation, reactExports, dedupedToast, ChevronDown, X$7, Search, Loader2, classifyFileType, LayoutList, LayoutGrid, useVirtualizer, inferMediaKind, FileImage, Film, AudioLines, GRID_COLUMN_COUNT_WIDE, estimateGridRowSize, Tag$1, useAssetMetadataStore, guardAccountSubmission } from "../vendor.js";
import { useFullscreenContainerEl } from "../infra/create-html-iframe-pool-store.jsx";
import { FileTypeIcon } from "../infra/create-recently-added-store.jsx";
import { withThumbnail, DeferredThumbnailImage } from "../workspace/deferred-thumbnail-image-generation.jsx";
import { TooltipProvider, Tooltip, TooltipTrigger } from "../vendor-inline/vscode-base/graph.jsx";
import { Upload, Maximize2, FileText, formatTime$2, Paperclip } from "../media-editing/parse-item.jsx";
import { ASSET_VIRTUALIZATION_MIN_ITEMS, ASSET_VIEW_INITIAL_RECT, GRID_OVERSCAN_ROWS } from "../canvas/use-canvas-tag-filter.js";
import { useGatewayFetch } from "../generation/use-resizable-width.js";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  Button$1,
  cn$2,
  TooltipContent,
  Checkbox,
  Badge,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import { Input3 } from "../infra/select-content.jsx";
import { ALL_MEDIA_FILE_ACCEPT, MEDIA_FILE_ACCEPT } from "../text-editor/myers-line-hunks.js";
import { PageStateBoundary } from "./page-state-boundary.jsx";
import { PlaybackPlayIcon } from "../workspace/browser-inspiration-urls.jsx";
import { MediaLightbox } from "./image-lightbox.jsx";
import { SegmentedSwitch } from "../team/use-credit-details.jsx";
import { FileNameLabel } from "./attachment-upload-zone.jsx";
import { isCanvasColorTag, PRESET_COLOR_NAME_KEYS } from "../infra/normalize-tag-registry.js";
import { buildVideoThumbnailUrl } from "../media-editing/media-clip-panel-inner.jsx";
import { getImageConstraintReason } from "../generation/use-direct-reference-picker.jsx";
import { isSubtitleFileName } from "../canvas/prune-persisted-node-data.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { getCanvasTagPresentationColor } from "./asset-panel-overlay-host.jsx";
import { PreviewCardContent } from "../text-editor/use-canvas-image-annotation-host.jsx";
import {
  AssetSourceMenu,
  createAssetPickerPerfSession,
  getAssetSourceAvailability,
  loadAssetFpsBatch,
  selectionSummary,
  useMarqueeSelection,
} from "../canvas/use-marquee-selection.jsx";
const GRID_THUMBNAIL_DISPLAY_PX = 110;
const GRID_MEDIA_THUMBNAIL_WIDTH_PX = 200;
const LIST_THUMBNAIL_DISPLAY_PX = 40;
const LIST_MEDIA_THUMBNAIL_WIDTH_PX = 80;
const PREVIEW_IMAGE_DISPLAY_PX = 256;
const STRICT_THUMBNAIL_MAX_RETRIES = 2;
const STRICT_THUMBNAIL_RETRY_DELAY_MS = 2e3;
function withStrictThumbnail(url2, width) {
  if (!url2) return void 0;
  try {
    new URL(url2);
    return withThumbnail(url2, width, {
      format: "webp",
      fallback: "error",
    });
  } catch {
    return void 0;
  }
}
function DurationBadge({ resource }) {
  if (!resource.durationSec || resource.durationSec <= 0) return null;
  if (resource.type !== "audio" && resource.type !== "video") return null;
  return (
    <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-foreground/60 px-1 py-0.5 text-[10px] font-medium leading-none text-background tabular-nums">
      {formatTime$2(resource.durationSec, true)}
    </span>
  );
}
function AssetTypeBadge({ resource, compact = false, className }) {
  const iconClass = compact ? "size-2.5" : "size-3";
  const icon =
    resource.type === "image" ? (
      <FileImage className={iconClass} strokeWidth={2} />
    ) : resource.type === "video" ? (
      <Film className={iconClass} strokeWidth={2} />
    ) : resource.type === "audio" ? (
      <AudioLines className={iconClass} strokeWidth={2} />
    ) : resource.type === "text" || resource.type === "subtitle" ? (
      <FileText className={iconClass} strokeWidth={2} />
    ) : (
      <Paperclip className={iconClass} strokeWidth={2} />
    );
  return (
    <span
      className={cn$2(
        "pointer-events-none absolute flex items-center justify-center rounded-sm bg-black/75 text-white shadow-sm",
        compact ? "size-4" : "size-5",
        className,
      )}
      aria-hidden="true"
      data-asset-type-icon={resource.type}
    >
      {icon}
    </span>
  );
}
export function AssetPreviewPopup({ resource, side = "right" }) {
  return (
    <PreviewCardContent
      side={side}
      sideOffset={8}
      align="center"
      collisionPadding={12}
      positionerClassName="z-10002"
      className="w-64 pointer-events-none"
    >
      <div className="flex flex-col gap-2 p-2">
        <PreviewMedia resource={resource} />
        <div className="flex flex-col gap-0.5">
          <span className="truncate text-[11px] font-medium text-foreground" title={resource.name}>
            {resource.name}
          </span>
          <span className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
            {describeMeta(resource)}
          </span>
          {resource.path && resource.path !== resource.name && (
            <span className="truncate text-[10px] text-muted-foreground/70" title={resource.path}>
              {resource.path}
            </span>
          )}
        </div>
      </div>
    </PreviewCardContent>
  );
}
function PreviewMedia({ resource }) {
  const [failedUrl, setFailedUrl] = reactExports.useState(null);
  const failed = failedUrl === resource.url;
  const wrap2 =
    "relative flex aspect-video w-full items-center justify-center overflow-hidden bg-muted";
  if (resource.type === "image" && !failed) {
    return (
      <div className={wrap2}>
        <DeferredThumbnailImage
          src={withStrictThumbnail(resource.url, PREVIEW_IMAGE_DISPLAY_PX)}
          onFailure={() => setFailedUrl(resource.url)}
          alt=""
          className="max-h-full max-w-full object-contain"
          priority="interactive"
          maxRetries={STRICT_THUMBNAIL_MAX_RETRIES}
          retryDelayMs={STRICT_THUMBNAIL_RETRY_DELAY_MS}
        />
      </div>
    );
  }
  if (resource.type === "video" && !failed) {
    return (
      <div className={wrap2}>
        <video
          src={resource.url}
          onError={() => setFailedUrl(resource.url)}
          muted={true}
          playsInline={true}
          preload="metadata"
          className="max-h-full max-w-full object-contain"
        />
        <DurationBadge resource={resource} />
      </div>
    );
  }
  return (
    <div className={wrap2}>
      <FileTypeIcon
        {...classifyFileType({
          filename: resource.name,
        })}
        size={64}
        decorative={true}
      />
      <DurationBadge resource={resource} />
    </div>
  );
}
function Thumbnail({ resource, size: size2 }) {
  const dim = size2 === "grid" ? "h-full w-full" : "h-10 w-10 shrink-0";
  const thumbnailDisplayWidth =
    size2 === "grid" ? GRID_THUMBNAIL_DISPLAY_PX : LIST_THUMBNAIL_DISPLAY_PX;
  const mediaThumbnailWidth =
    size2 === "grid" ? GRID_MEDIA_THUMBNAIL_WIDTH_PX : LIST_MEDIA_THUMBNAIL_WIDTH_PX;
  const [thumbFailed, setThumbFailed] = reactExports.useState(false);
  if (resource.type === "image" && !thumbFailed) {
    return (
      <DeferredThumbnailImage
        src={withStrictThumbnail(resource.url, thumbnailDisplayWidth)}
        alt=""
        className={cn$2(dim, "object-cover")}
        onFailure={() => setThumbFailed(true)}
        priority="interactive"
        maxRetries={STRICT_THUMBNAIL_MAX_RETRIES}
        retryDelayMs={STRICT_THUMBNAIL_RETRY_DELAY_MS}
      />
    );
  }
  if (resource.type === "video" || resource.type === "audio") {
    const thumbUrl =
      !thumbFailed && resource.path
        ? buildVideoThumbnailUrl(resource.url, resource.path, mediaThumbnailWidth)
        : void 0;
    if (thumbUrl) {
      return (
        <DeferredThumbnailImage
          src={thumbUrl}
          alt=""
          className={cn$2(dim, "object-cover")}
          onFailure={() => setThumbFailed(true)}
          priority="interactive"
        />
      );
    }
  }
  return (
    <div
      className={cn$2(
        dim,
        "flex items-center justify-center bg-muted text-[10px] uppercase text-muted-foreground",
      )}
    >
      <FileTypeIcon
        {...classifyFileType({
          filename: resource.name,
        })}
        size={size2 === "grid" ? 48 : 24}
        decorative={true}
      />
    </div>
  );
}
function describeMeta(r2) {
  const bits = [];
  if (r2.width && r2.height) bits.push(`${r2.width}×${r2.height}`);
  if (r2.durationSec !== void 0) bits.push(`${r2.durationSec.toFixed(1)}s`);
  if (r2.fileSize !== void 0) bits.push(formatBytes(r2.fileSize));
  return bits.join(" · ") || r2.type.toUpperCase();
}
function formatBytes(n2) {
  if (n2 < 1024) return `${n2} B`;
  if (n2 < 1024 * 1024) return `${(n2 / 1024).toFixed(0)} KB`;
  return `${(n2 / (1024 * 1024)).toFixed(1)} MB`;
}
const GRID_COLUMN_COUNT_NARROW = 4;
const GRID_FIVE_COLUMN_MIN_WIDTH_PX = 700;
const GRID_KEYBOARD_PAGE_ROWS = 3;
const LIST_ROW_ESTIMATE_PX = 56;
const LIST_OVERSCAN_ROWS = 6;
const LIST_KEYBOARD_PAGE_SIZE = 7;
function AssetList({
  rows,
  view: view2,
  multiple,
  leadingAction,
  selected: selected2,
  canAddSelection,
  onSelectionChange,
  onToggle,
  reasonForRow,
  labelForReason,
  isRowExisting,
  onPreview,
  emptyTitle,
  emptyDescription,
  onClearFilters,
}) {
  const { t: t2 } = useTranslation();
  const emptyContent =
    rows.length === 0 ? (
      <PageStateBoundary
        empty={true}
        density="panel"
        className="h-full [&_button]:pointer-events-auto [&_button]:rounded-[calc(var(--radius-sm)+2px)]"
        emptyOptions={{
          title: emptyTitle,
          description: emptyDescription,
          ...(onClearFilters
            ? {
                actions: [
                  {
                    key: "clear-filter",
                    label: t2("assetPicker.filter.clear", "清除筛选"),
                    variant: "outline",
                    onClick: onClearFilters,
                  },
                ],
              }
            : {}),
        }}
      />
    ) : (
      void 0
    );
  if (rows.length === 0 && !leadingAction) return emptyContent;
  return (
    <ScrollableAssetView
      rows={rows}
      view={view2}
      multiple={multiple}
      leadingAction={leadingAction}
      selected={selected2}
      canAddSelection={canAddSelection}
      onSelectionChange={onSelectionChange}
      onToggle={onToggle}
      reasonForRow={reasonForRow}
      labelForReason={labelForReason}
      isRowExisting={isRowExisting}
      onPreview={onPreview}
      className="h-full overflow-y-auto"
      emptyContent={leadingAction ? void 0 : emptyContent}
    />
  );
}
function ScrollableAssetView({
  rows,
  view: view2,
  multiple,
  leadingAction,
  selected: selected2,
  canAddSelection,
  onSelectionChange,
  onToggle,
  reasonForRow,
  labelForReason,
  isRowExisting,
  onPreview,
  className,
  emptyContent,
}) {
  const [scrollEl, setScrollEl] = reactExports.useState(null);
  const [gridColumnCount, setGridColumnCount] = reactExports.useState(GRID_COLUMN_COUNT_WIDE);
  const selectionOrderByKey = reactExports.useMemo(
    () => new Map(Array.from(selected2.keys(), (rowKey, index2) => [rowKey, index2 + 1])),
    [selected2],
  );
  const rectangle = useMarqueeSelection({
    scrollEl,
    enabled: multiple,
    rows,
    view: view2,
    selected: selected2,
    canAddSelection,
    onSelectionChange,
  });
  const [activeRowKey, setActiveRowKey] = reactExports.useState(() => rows[0]?.rowKey ?? "");
  const optionIdPrefix = reactExports.useId();
  const scrollAssetRef = reactExports.useRef(() => {});
  const keyboardNavigationRef = reactExports.useRef(false);
  const scrollFrameRef = reactExports.useRef(null);
  const resolvedActiveRowKey = rows.some((row) => row.rowKey === activeRowKey)
    ? activeRowKey
    : (rows[0]?.rowKey ?? "");
  const focusedIndex = Math.max(
    0,
    rows.findIndex((row) => row.rowKey === resolvedActiveRowKey),
  );
  const activeOptionId =
    rows.length > 0 ? assetOptionId(optionIdPrefix, resolvedActiveRowKey) : void 0;
  reactExports.useEffect(() => {
    if (!scrollEl) return;
    if (view2 !== "grid" && view2 !== "list") return;
    scrollEl.scrollTo?.({
      top: 0,
    });
  }, [scrollEl, view2]);
  reactExports.useEffect(() => {
    if (rows.some((row) => row.rowKey === activeRowKey)) return;
    setActiveRowKey(rows[0]?.rowKey ?? "");
  }, [activeRowKey, rows]);
  reactExports.useEffect(() => {
    if (!scrollEl || rows.length === 0 || !activeOptionId || keyboardNavigationRef.current) return;
    const activeOption = document.getElementById(activeOptionId);
    if (activeOption && scrollEl.contains(activeOption)) return;
    const mountedRowKey = scrollEl.querySelector('[role="option"]')?.dataset.assetRowKey;
    if (mountedRowKey) setActiveRowKey(mountedRowKey);
  }, [activeOptionId, rows, scrollEl]);
  reactExports.useEffect(() => {
    if (!scrollEl) return;
    const onScroll = () => {
      if (scrollFrameRef.current !== null) return;
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        const activeOption = activeOptionId ? document.getElementById(activeOptionId) : null;
        if (activeOption && scrollEl.contains(activeOption)) {
          keyboardNavigationRef.current = false;
          return;
        }
        if (keyboardNavigationRef.current) return;
        const firstMountedOption = scrollEl.querySelector('[role="option"]');
        const mountedRowKey = firstMountedOption?.dataset.assetRowKey;
        if (mountedRowKey) setActiveRowKey(mountedRowKey);
      });
    };
    scrollEl.addEventListener("scroll", onScroll, {
      passive: true,
    });
    return () => {
      scrollEl.removeEventListener("scroll", onScroll);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, [activeOptionId, scrollEl]);
  reactExports.useEffect(() => {
    if (!scrollEl) return;
    const syncColumnCount = (width) => {
      if (width <= 0) return;
      setGridColumnCount(
        width >= GRID_FIVE_COLUMN_MIN_WIDTH_PX ? GRID_COLUMN_COUNT_WIDE : GRID_COLUMN_COUNT_NARROW,
      );
    };
    syncColumnCount(scrollEl.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const observer2 = new ResizeObserver(([entry]) => syncColumnCount(entry.contentRect.width));
    observer2.observe(scrollEl);
    return () => observer2.disconnect();
  }, [scrollEl]);
  const handleAssetKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      const activeRow = rows[focusedIndex];
      if (!activeRow) return;
      event.preventDefault();
      const disabled2 =
        isRowExisting(activeRow) || (!!reasonForRow(activeRow) && !selected2.has(activeRow.rowKey));
      if (!disabled2) onToggle(activeRow);
      return;
    }
    const nextIndex = assetNavigationIndex(
      event.key,
      focusedIndex,
      rows.length,
      view2,
      gridColumnCount,
    );
    if (nextIndex === void 0) return;
    event.preventDefault();
    const nextRow = rows[nextIndex];
    if (!nextRow) return;
    setActiveRowKey(nextRow.rowKey);
    keyboardNavigationRef.current = true;
    scrollAssetRef.current(nextIndex);
  };
  return (
    <div
      ref={setScrollEl}
      className={cn$2(
        className,
        "group/asset-view relative isolate overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
      role="listbox"
      aria-multiselectable={multiple || void 0}
      aria-activedescendant={activeOptionId}
      tabIndex={0}
      onKeyDown={handleAssetKeyDown}
      data-asset-picker-scroll="true"
      data-action-ui-id="asset-picker.resource-list"
    >
      {view2 === "grid" ? (
        <GridView
          rows={rows}
          leadingAction={leadingAction}
          selected={selected2}
          selectionOrderByKey={selectionOrderByKey}
          onToggle={onToggle}
          reasonForRow={reasonForRow}
          labelForReason={labelForReason}
          isRowExisting={isRowExisting}
          onPreview={onPreview}
          scrollEl={scrollEl}
          gridColumnCount={gridColumnCount}
          focusedIndex={focusedIndex}
          onFocusedRowChange={setActiveRowKey}
          optionIdPrefix={optionIdPrefix}
          scrollAssetRef={scrollAssetRef}
        />
      ) : (
        <ListView
          rows={rows}
          leadingAction={leadingAction}
          selected={selected2}
          selectionOrderByKey={selectionOrderByKey}
          onToggle={onToggle}
          reasonForRow={reasonForRow}
          labelForReason={labelForReason}
          isRowExisting={isRowExisting}
          onPreview={onPreview}
          scrollEl={scrollEl}
          gridColumnCount={gridColumnCount}
          focusedIndex={focusedIndex}
          onFocusedRowChange={setActiveRowKey}
          optionIdPrefix={optionIdPrefix}
          scrollAssetRef={scrollAssetRef}
        />
      )}
      {emptyContent && (
        <div className="pointer-events-none absolute inset-0" data-asset-picker-empty-region={true}>
          {emptyContent}
        </div>
      )}
      {rectangle && (
        <div
          aria-hidden="true"
          data-action-ui-id="asset-picker.marquee"
          className="pointer-events-none absolute z-10 border border-brand-accent bg-brand-accent/12"
          style={{
            left: rectangle.left,
            top: rectangle.top,
            width: rectangle.right - rectangle.left,
            height: rectangle.bottom - rectangle.top,
          }}
        />
      )}
    </div>
  );
}
function GridView({
  rows,
  leadingAction,
  selected: selected2,
  selectionOrderByKey,
  onToggle,
  reasonForRow,
  labelForReason,
  isRowExisting,
  onPreview,
  scrollEl,
  gridColumnCount,
  focusedIndex,
  onFocusedRowChange,
  optionIdPrefix,
  scrollAssetRef,
}) {
  const shouldVirtualize = rows.length > ASSET_VIRTUALIZATION_MIN_ITEMS;
  const leadingCount = leadingAction ? 1 : 0;
  const gridRows = reactExports.useMemo(() => {
    const slots = leadingAction ? [null, ...rows] : rows;
    const groupedRows = [];
    for (let index2 = 0; index2 < slots.length; index2 += gridColumnCount) {
      groupedRows.push(slots.slice(index2, index2 + gridColumnCount));
    }
    return groupedRows;
  }, [rows, leadingAction, gridColumnCount]);
  const gridVirtualizer = useVirtualizer({
    count: gridRows.length,
    getScrollElement: () => scrollEl,
    estimateSize: () =>
      estimateGridRowSize(scrollEl?.clientWidth || ASSET_VIEW_INITIAL_RECT.width, gridColumnCount),
    measureElement: (element2) => element2.getBoundingClientRect().height,
    getItemKey: (index2) => gridRows[index2]?.[0]?.rowKey ?? "upload-action",
    overscan: GRID_OVERSCAN_ROWS,
    paddingStart: 8,
    paddingEnd: 8,
    initialRect: ASSET_VIEW_INITIAL_RECT,
    enabled: shouldVirtualize,
  });
  const scrollAssetAtIndex = reactExports.useCallback(
    (index2) => {
      if (shouldVirtualize) {
        gridVirtualizer.scrollToIndex(Math.floor((index2 + leadingCount) / gridColumnCount), {
          align: "auto",
        });
        return;
      }
      scrollEl?.querySelector(`[data-asset-index="${index2}"]`)?.scrollIntoView?.({
        block: "nearest",
      });
    },
    [gridVirtualizer, shouldVirtualize, gridColumnCount, leadingCount, scrollEl],
  );
  reactExports.useEffect(() => {
    scrollAssetRef.current = scrollAssetAtIndex;
    return () => {
      if (scrollAssetRef.current === scrollAssetAtIndex) scrollAssetRef.current = () => {};
    };
  }, [scrollAssetAtIndex, scrollAssetRef]);
  if (!shouldVirtualize) {
    return (
      <div
        className={cn$2(
          "grid gap-2 py-2 pl-2 pr-3",
          gridColumnCount === GRID_COLUMN_COUNT_WIDE ? "grid-cols-5" : "grid-cols-4",
        )}
        data-grid-columns={gridColumnCount}
        data-grid-row-gap="8"
      >
        {leadingAction}
        {rows.map((row, index2) => (
          <GridTile
            key={row.rowKey}
            row={row}
            assetIndex={index2}
            totalSize={rows.length}
            isFocused={focusedIndex === index2}
            onFocusedRowChange={onFocusedRowChange}
            optionIdPrefix={optionIdPrefix}
            selected={selected2}
            selectionOrderByKey={selectionOrderByKey}
            onToggle={onToggle}
            reasonForRow={reasonForRow}
            labelForReason={labelForReason}
            isRowExisting={isRowExisting}
            onPreview={onPreview}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      className="relative w-full"
      style={{
        height: gridVirtualizer.getTotalSize(),
      }}
      data-virtualized="grid"
    >
      {gridVirtualizer.getVirtualItems().map((virtualRow) => {
        const row = gridRows[virtualRow.index];
        return (
          <div
            key={virtualRow.key}
            ref={gridVirtualizer.measureElement}
            data-index={virtualRow.index}
            className={cn$2(
              "absolute left-0 top-0 grid w-full gap-x-2 pb-2 pl-2 pr-3",
              gridColumnCount === GRID_COLUMN_COUNT_WIDE ? "grid-cols-5" : "grid-cols-4",
            )}
            data-grid-columns={gridColumnCount}
            data-grid-row-gap="8"
            style={{
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {row.map((item, itemIndex) => {
              if (!item) {
                return (
                  <div key={"upload-action"} className="h-full">
                    {leadingAction}
                  </div>
                );
              }
              const assetIndex = virtualRow.index * gridColumnCount + itemIndex - leadingCount;
              return (
                <GridTile
                  key={item.rowKey}
                  row={item}
                  assetIndex={assetIndex}
                  totalSize={rows.length}
                  isFocused={focusedIndex === assetIndex}
                  onFocusedRowChange={onFocusedRowChange}
                  optionIdPrefix={optionIdPrefix}
                  selected={selected2}
                  selectionOrderByKey={selectionOrderByKey}
                  onToggle={onToggle}
                  reasonForRow={reasonForRow}
                  labelForReason={labelForReason}
                  isRowExisting={isRowExisting}
                  onPreview={onPreview}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
function GridTile({
  row,
  assetIndex,
  totalSize,
  isFocused,
  onFocusedRowChange,
  optionIdPrefix,
  selected: selected2,
  selectionOrderByKey,
  onToggle,
  reasonForRow,
  labelForReason,
  isRowExisting,
  onPreview,
}) {
  const { t: t2 } = useTranslation();
  const sel = selected2.has(row.rowKey);
  const selectionOrder = selectionOrderByKey.get(row.rowKey);
  const existing = isRowExisting(row);
  const reason = reasonForRow(row);
  const disabled2 = existing || (!!reason && !sel);
  return (
    <div
      onPointerMove={() => onFocusedRowChange(row.rowKey)}
      aria-disabled={disabled2 || void 0}
      aria-label={row.name}
      aria-selected={sel}
      aria-posinset={assetIndex + 1}
      aria-setsize={totalSize}
      role="option"
      tabIndex={-1}
      id={assetOptionId(optionIdPrefix, row.rowKey)}
      data-asset-row-key={row.rowKey}
      className={cn$2(
        "group relative h-full overflow-hidden rounded-lg border bg-transparent text-left transition-colors",
        isFocused &&
          "group-focus-visible/asset-view:ring-2 group-focus-visible/asset-view:ring-ring group-focus-visible/asset-view:ring-offset-1",
        sel
          ? "border-transparent"
          : disabled2
            ? "border-foreground/[0.06]"
            : "border-foreground/[0.06] hover:border-foreground/20",
      )}
    >
      <button
        type="button"
        onClick={() => {
          onFocusedRowChange(row.rowKey);
          onToggle(row);
        }}
        disabled={disabled2}
        tabIndex={-1}
        data-asset-index={assetIndex}
        data-marquee-start="true"
        aria-label={existing ? t2("assetPicker.existing", "已添加") : row.name}
        className={cn$2(
          "flex h-full w-full cursor-pointer flex-col items-stretch text-left outline-none",
          isFocused &&
            "group-focus-visible/asset-view:ring-2 group-focus-visible/asset-view:ring-ring",
          disabled2 && "cursor-not-allowed opacity-45",
        )}
        data-action-ui-id={`asset-picker.tile.${row.type}`}
      >
        <div
          data-marquee-hit={row.rowKey}
          data-asset-thumbnail="true"
          className="relative flex aspect-3/2 items-center justify-center overflow-hidden bg-muted"
        >
          <Thumbnail resource={row} size="grid" />
          <DurationBadge resource={row} />
          {row.type !== "image" &&
            row.type !== "video" &&
            (!Number.isFinite(row.durationSec) || (row.durationSec ?? 0) <= 0) && (
              <AssetTypeBadge resource={row} className="bottom-2 left-2" />
            )}
        </div>
        <div
          className="flex h-12 shrink-0 flex-col justify-center gap-0.5 px-2 py-1.5"
          data-action-ui-id="asset-picker.grid-info"
        >
          <FileNameLabel
            actionUiId="asset-picker.file-name"
            tooltipPositionerClassName="z-10003"
            name={row.name}
            className="text-xs text-foreground"
          />
          <ResourceMeta row={row} compact={true} />
        </div>
      </button>
      <SelectionOutline selected={sel} className="border-[1.5px]" />
      <AssetTagMark
        tag={row.tag}
        size={12}
        className={cn$2(
          "absolute left-2",
          existing || selectionOrder !== void 0 || (reason && reason !== "full")
            ? "top-10"
            : "top-2",
        )}
        overlay={true}
      />
      <RowBadge
        existing={existing}
        reason={reason === "full" ? void 0 : reason}
        labelForReason={labelForReason}
        t={t2}
        selectionOrder={selectionOrder}
      />
      {!existing && (
        <AssetPreviewButton
          row={row}
          onPreview={onPreview}
          className="absolute right-2 bottom-14 z-10 size-7 group-hover:opacity-100 group-focus-within:opacity-100"
        />
      )}
    </div>
  );
}
function ListView({
  rows,
  leadingAction,
  selected: selected2,
  selectionOrderByKey,
  onToggle,
  reasonForRow,
  labelForReason,
  isRowExisting,
  onPreview,
  scrollEl,
  focusedIndex,
  onFocusedRowChange,
  optionIdPrefix,
  scrollAssetRef,
}) {
  const shouldVirtualize = rows.length > ASSET_VIRTUALIZATION_MIN_ITEMS;
  const leadingCount = leadingAction ? 1 : 0;
  const listVirtualizer = useVirtualizer({
    count: rows.length + leadingCount,
    getScrollElement: () => scrollEl,
    estimateSize: (index2) => LIST_ROW_ESTIMATE_PX + (leadingCount && index2 === 0 ? 8 : 0),
    getItemKey: (index2) => rows[index2 - leadingCount]?.rowKey ?? "upload-action",
    overscan: LIST_OVERSCAN_ROWS,
    paddingStart: 8,
    paddingEnd: 8,
    initialRect: ASSET_VIEW_INITIAL_RECT,
    enabled: shouldVirtualize,
  });
  const scrollAssetAtIndex = reactExports.useCallback(
    (index2) => {
      if (shouldVirtualize) {
        listVirtualizer.scrollToIndex(index2 + leadingCount, {
          align: "auto",
        });
        return;
      }
      scrollEl?.querySelector(`[data-asset-index="${index2}"]`)?.scrollIntoView?.({
        block: "nearest",
      });
    },
    [listVirtualizer, shouldVirtualize, leadingCount, scrollEl],
  );
  reactExports.useEffect(() => {
    scrollAssetRef.current = scrollAssetAtIndex;
    return () => {
      if (scrollAssetRef.current === scrollAssetAtIndex) scrollAssetRef.current = () => {};
    };
  }, [scrollAssetAtIndex, scrollAssetRef]);
  if (!shouldVirtualize) {
    return (
      <ul className="py-2 pl-2 pr-3">
        {leadingAction && <li className="pb-2">{leadingAction}</li>}
        {rows.map((row, index2) => (
          <li key={row.rowKey}>
            <ListRow
              row={row}
              assetIndex={index2}
              totalSize={rows.length}
              isFocused={focusedIndex === index2}
              onFocusedRowChange={onFocusedRowChange}
              optionIdPrefix={optionIdPrefix}
              selected={selected2}
              selectionOrderByKey={selectionOrderByKey}
              onToggle={onToggle}
              reasonForRow={reasonForRow}
              labelForReason={labelForReason}
              isRowExisting={isRowExisting}
              onPreview={onPreview}
            />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul
      className="relative w-full"
      style={{
        height: listVirtualizer.getTotalSize(),
      }}
      data-virtualized="list"
    >
      {listVirtualizer.getVirtualItems().map((virtualRow) => {
        const assetIndex = virtualRow.index - leadingCount;
        const row = rows[assetIndex];
        return (
          <li
            key={virtualRow.key}
            className="absolute left-0 top-0 w-full pl-2 pr-3"
            style={{
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {row ? (
              <ListRow
                row={row}
                assetIndex={assetIndex}
                totalSize={rows.length}
                isFocused={focusedIndex === assetIndex}
                onFocusedRowChange={onFocusedRowChange}
                optionIdPrefix={optionIdPrefix}
                selected={selected2}
                selectionOrderByKey={selectionOrderByKey}
                onToggle={onToggle}
                reasonForRow={reasonForRow}
                labelForReason={labelForReason}
                isRowExisting={isRowExisting}
                onPreview={onPreview}
              />
            ) : (
              leadingAction
            )}
          </li>
        );
      })}
    </ul>
  );
}
function ListRow({
  row,
  assetIndex,
  totalSize,
  isFocused,
  onFocusedRowChange,
  optionIdPrefix,
  selected: selected2,
  selectionOrderByKey,
  onToggle,
  reasonForRow,
  labelForReason,
  isRowExisting,
  onPreview,
}) {
  const { t: t2 } = useTranslation();
  const sel = selected2.has(row.rowKey);
  const selectionOrder = selectionOrderByKey.get(row.rowKey);
  const existing = isRowExisting(row);
  const reason = reasonForRow(row);
  const disabled2 = existing || (!!reason && !sel);
  return (
    <div
      onPointerMove={() => onFocusedRowChange(row.rowKey)}
      aria-disabled={disabled2 || void 0}
      aria-label={row.name}
      aria-selected={sel}
      aria-posinset={assetIndex + 1}
      aria-setsize={totalSize}
      role="option"
      tabIndex={-1}
      id={assetOptionId(optionIdPrefix, row.rowKey)}
      data-asset-row-key={row.rowKey}
      data-marquee-hit={row.rowKey}
      className="group/list-row"
    >
      <div
        data-action-ui-id="asset-picker.list-cell"
        className={cn$2(
          "relative flex h-14 items-center rounded-md border border-transparent",
          !sel && !disabled2 && "hover:bg-muted/60",
          isFocused &&
            "group-focus-visible/asset-view:ring-2 group-focus-visible/asset-view:ring-ring group-focus-visible/asset-view:ring-inset",
        )}
      >
        <SelectionOutline selected={sel} className="border" />
        <button
          type="button"
          onClick={() => {
            onFocusedRowChange(row.rowKey);
            onToggle(row);
          }}
          disabled={disabled2}
          tabIndex={-1}
          data-asset-index={assetIndex}
          data-marquee-start="true"
          aria-label={existing ? t2("assetPicker.existing", "已添加") : row.name}
          className={cn$2(
            "flex h-full min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 text-left outline-none",
            disabled2 && "cursor-not-allowed opacity-45",
          )}
          data-action-ui-id={`asset-picker.row.${row.type}`}
        >
          <div
            data-asset-thumbnail="true"
            className="relative size-10 shrink-0 overflow-hidden rounded-sm"
          >
            <Thumbnail resource={row} size="list" />
            {row.type === "video" ? (
              <VideoPlayIndicator />
            ) : (
              row.type !== "image" && (
                <AssetTypeBadge resource={row} compact={true} className="bottom-1 left-1" />
              )
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="flex min-w-0 items-center gap-1.5"
              data-action-ui-id="asset-picker.file-name-row"
            >
              <FileNameLabel
                actionUiId="asset-picker.file-name"
                tooltipPositionerClassName="z-10003"
                name={row.name}
                className="text-xs font-medium text-foreground"
              />
              <AssetTagMark tag={row.tag} size={12.96} />
            </div>
            <ResourceMeta row={row} />
          </div>
        </button>
        {!existing && (
          <AssetPreviewButton
            row={row}
            onPreview={onPreview}
            className="absolute left-3 top-[7px] z-10 size-10 rounded-sm backdrop-blur-none group-hover/list-row:opacity-100 group-focus-within/list-row:opacity-100"
          />
        )}
        <div className="flex shrink-0 items-center gap-2 pr-3 text-[11px]">
          {existing ? (
            <ExistingStatusTag label={t2("assetPicker.existing", "已添加")} />
          ) : (
            reason && reason !== "full" && <ProblemStatusTag label={labelForReason(reason)} />
          )}
          <span className="text-muted-foreground">
            {t2(`assetPicker.typeFilter.${row.type}`, row.type)}
          </span>
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center">
            <SelectionOrderBadge order={selectionOrder} />
          </span>
        </div>
      </div>
    </div>
  );
}
function AssetTagMark({ tag, size: size2, className, ringColor, overlay = false }) {
  if (!tag) return null;
  return (
    <TooltipProvider delay={20}>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className={cn$2(
                "shrink-0 rounded-full",
                overlay && "flex items-center justify-center bg-black/75 text-white shadow-sm",
                className,
              )}
              data-action-ui-id="asset-picker.tag-mark"
              data-tag-name={tag.name}
              onPointerEnter={(event) => event.stopPropagation()}
              onPointerMove={(event) => event.stopPropagation()}
              onPointerLeave={(event) => event.stopPropagation()}
              style={{
                width: size2,
                height: size2,
                backgroundColor: overlay ? void 0 : getCanvasTagPresentationColor(tag.color),
                boxShadow: ringColor ? `0 0 0 0.7px ${ringColor}` : void 0,
              }}
            >
              {overlay ? <Tag$1 className="size-2" strokeWidth={2} /> : null}
            </span>
          }
        />
        <TooltipContent side="top" positionerClassName="z-10003">
          {tag.name}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
function ResourceMeta({ row, compact = false }) {
  const description = describeMeta(row);
  return (
    <div
      className={cn$2(
        "flex flex-wrap items-center overflow-hidden",
        compact
          ? "h-3.5 gap-x-0.5 text-[10px] leading-3.5 text-muted-foreground/70"
          : "h-4 gap-x-1 text-[11px] leading-4 text-muted-foreground",
      )}
      title={description}
      data-action-ui-id="asset-picker.resource-meta"
    >
      {description.split(" · ").map((part, index2) => (
        <span key={part} className="shrink-0 whitespace-nowrap">
          {index2 > 0 && (
            <span aria-hidden={true} className={compact ? "mr-0.5" : "mr-1"}>
              ·
            </span>
          )}
          {part}
        </span>
      ))}
    </div>
  );
}
function assetNavigationIndex(key2, currentIndex, itemCount, view2, gridColumnCount) {
  if (itemCount <= 0) return void 0;
  const pageSize =
    view2 === "grid" ? gridColumnCount * GRID_KEYBOARD_PAGE_ROWS : LIST_KEYBOARD_PAGE_SIZE;
  let nextIndex;
  switch (key2) {
    case "Home":
      nextIndex = 0;
      break;
    case "End":
      nextIndex = itemCount - 1;
      break;
    case "PageUp":
      nextIndex = currentIndex - pageSize;
      break;
    case "PageDown":
      nextIndex = currentIndex + pageSize;
      break;
    case "ArrowUp":
      nextIndex = currentIndex - (view2 === "grid" ? gridColumnCount : 1);
      break;
    case "ArrowDown":
      nextIndex = currentIndex + (view2 === "grid" ? gridColumnCount : 1);
      break;
    case "ArrowLeft":
      if (view2 === "grid") nextIndex = currentIndex - 1;
      break;
    case "ArrowRight":
      if (view2 === "grid") nextIndex = currentIndex + 1;
      break;
    default:
      return void 0;
  }
  if (nextIndex === void 0) return void 0;
  return Math.max(0, Math.min(nextIndex, itemCount - 1));
}
function assetOptionId(prefix, rowKey) {
  const safeRowKey = rowKey.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `${prefix}-asset-${safeRowKey}`;
}
function RowBadge({ existing, reason, labelForReason, t: t2, selectionOrder }) {
  return (
    <>
      {existing ? (
        <ExistingStatusTag
          label={t2("assetPicker.existing", "已添加")}
          overlay={true}
          className="absolute left-2 top-2"
        />
      ) : (
        reason && (
          <div className="absolute left-2 top-2">
            <ProblemStatusTag label={labelForReason(reason)} />
          </div>
        )
      )}
      <SelectionOrderBadge
        order={selectionOrder}
        className="absolute left-2 top-2 size-6 min-w-6 px-0 text-[11px]"
      />
    </>
  );
}
function ExistingStatusTag({ label, overlay = false, className }) {
  return (
    <span
      className={cn$2(
        "inline-flex h-[18px] max-w-28 items-center truncate rounded-full border-0 px-1.5 text-[10px] font-medium leading-none",
        overlay ? "bg-black/55 text-white" : "bg-muted text-muted-foreground",
        className,
      )}
      data-action-ui-id="asset-picker.existing-tag"
    >
      {label}
    </span>
  );
}
function ProblemStatusTag({ label }) {
  return (
    <span
      className="inline-flex h-[18px] max-w-28 items-center gap-1 rounded-full border-0 bg-[var(--media-overlay-surface)] px-1.5 text-[10px] font-medium leading-none text-[var(--media-overlay-foreground)]"
      data-action-ui-id="asset-picker.problem-tag"
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-destructive saturate-75 brightness-110"
      />
      <span className="truncate">{label}</span>
    </span>
  );
}
function SelectionOrderBadge({ order: order2, className }) {
  const { t: t2 } = useTranslation();
  if (order2 === void 0) return null;
  return (
    <span
      role="img"
      className={cn$2(
        "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border-2 border-white bg-black px-1 text-[10px] font-semibold leading-none text-white shadow-sm tabular-nums",
        className,
      )}
      aria-label={`${t2("assetPicker.selected", "已选择")} ${order2}`}
      data-action-ui-id="asset-picker.selection-order"
      data-selection-order={order2}
    >
      {order2}
    </span>
  );
}
function SelectionOutline({ selected: selected2, className }) {
  if (!selected2) return null;
  return (
    <span
      aria-hidden="true"
      data-action-ui-id="asset-picker.selection-outline"
      className={cn$2(
        "pointer-events-none absolute inset-0 z-20 rounded-[inherit] border-foreground",
        className,
      )}
    />
  );
}
function VideoPlayIndicator() {
  return (
    <span
      aria-hidden="true"
      data-action-ui-id="asset-picker.video-play"
      className="pointer-events-none absolute inset-0 flex items-center justify-center text-[var(--media-overlay-foreground)] drop-shadow-sm"
    >
      <PlaybackPlayIcon size={14} className="text-[var(--media-overlay-foreground)]" />
    </span>
  );
}
function AssetPreviewButton({ row, onPreview, className }) {
  const { t: t2 } = useTranslation();
  return (
    <button
      type="button"
      aria-label={t2("assetPicker.preview", "预览")}
      data-action-ui-id={`asset-picker.preview.${row.type}`}
      className={cn$2(
        "flex cursor-pointer items-center justify-center rounded-full bg-black/20 text-white opacity-0 shadow-sm backdrop-blur-md transition-[opacity,background-color] hover:bg-black/30 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [@media(hover:none)]:opacity-100",
        className,
      )}
      onClick={() => onPreview(row)}
    >
      <Maximize2 className="size-3.5" strokeWidth={1.5} />
    </button>
  );
}
const VIEW_STORAGE_KEY = "assetPicker.view";
const TYPE_FILTER_ALL = "__all__";
const TAG_FILTER_ALL = "__all_tags__";
const VIDEO_BUDGET_REASON_PREFIX = "video-budget:";
const VIDEO_FPS_REASON_PREFIX = "video-fps:";
const VIDEO_FPS_PENDING_REASON = "video-fps-pending";
const MEDIA_METADATA_PENDING_REASON = "media-metadata-pending";
const DEFAULT_TABS = ["canvas", "upload"];
const EMPTY_SELECTION = new Map();
const ALL_TYPE_FILTERS = ["image", "video", "audio", "text", "subtitle", "file"];
function computeSelectionTotals(selection2) {
  const counts = {
    image: 0,
    video: 0,
    audio: 0,
  };
  const sec = {
    audio: 0,
    video: 0,
  };
  selection2.forEach((res) => {
    if (res.type === "image" || res.type === "video" || res.type === "audio") {
      counts[res.type] += 1;
    }
    const d2 = typeof res.durationSec === "number" && res.durationSec > 0 ? res.durationSec : 0;
    if (res.type === "audio") sec.audio += d2;
    if (res.type === "video") sec.video += d2;
  });
  return {
    counts,
    sec,
  };
}
function finitePositive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
}
export function AssetPickerDialog({
  request,
  onUploadAndInsert,
  onUploadAttachment,
  resolveCanvasNodeId,
  tagColorResolver,
  tagRegistry,
  sourceStatus = "ready",
}) {
  const { t: t2 } = useTranslation();
  const gatewayFetch2 = useGatewayFetch();
  const open = request !== null;
  const [sourceStep, setSourceStep] = reactExports.useState(() =>
    request?.source ? "source" : "browser",
  );
  const localStartedRef = reactExports.useRef(false);
  const sourceMenuShownRef = reactExports.useRef(false);
  const requestRef = reactExports.useRef(request);
  requestRef.current = request;
  reactExports.useEffect(() => {
    requestRef.current = request;
    return () => {
      requestRef.current = null;
    };
  }, [request]);
  const filter2 = request?.opts ?? null;
  const multiple = filter2?.multiple ?? false;
  const maxCount = !multiple
    ? 1
    : typeof filter2?.maxCount === "number" && filter2.maxCount > 0
      ? filter2.maxCount
      : void 0;
  const minCount =
    multiple && typeof filter2?.minCount === "number" && filter2.minCount > 0
      ? filter2.minCount
      : void 0;
  const uploadMode = filter2?.uploadMode ?? "insert-node";
  const existingAssetIds = reactExports.useMemo(
    () => new Set(filter2?.existingAssetIds ?? []),
    [filter2?.existingAssetIds],
  );
  const constraints2 = filter2?.constraints;
  const fpsBounded = constraints2?.videoMinFps !== void 0 || constraints2?.videoMaxFps !== void 0;
  const requestedTabs = filter2?.tabs?.length ? filter2.tabs : DEFAULT_TABS;
  const uploadEnabled = requestedTabs.includes("upload");
  const canvasEnabled = requestedTabs.includes("canvas") || requestedTabs.includes("upstream");
  const assets = useAssetMetadataStore((s2) => s2.assets);
  const fullscreenContainerEl = useFullscreenContainerEl();
  const [selected2, setSelected] = reactExports.useState(new Map());
  const [uploadedList, setUploadedList] = reactExports.useState([]);
  const [previewRow, setPreviewRow] = reactExports.useState(null);
  const dialogRef = reactExports.useRef(null);
  const [query, setQuery] = reactExports.useState("");
  const [typeFilter, setTypeFilter] = reactExports.useState(TYPE_FILTER_ALL);
  const [tagFilter, setTagFilter] = reactExports.useState(TAG_FILTER_ALL);
  const [availableOnly, setAvailableOnly] = reactExports.useState(false);
  const [tagsExpanded, setTagsExpanded] = reactExports.useState(true);
  const tagView = tagFilter !== TAG_FILTER_ALL;
  const activeTag = tagRegistry?.tags.find((tag) => tag.id === tagFilter);
  const [view2, setView] = reactExports.useState(readStoredView);
  const [videoFpsMap, setVideoFpsMap] = reactExports.useState(new Map());
  const videoFpsMapRef = reactExports.useRef(videoFpsMap);
  videoFpsMapRef.current = videoFpsMap;
  const fpsInFlightIdsRef = reactExports.useRef(new Map());
  const fpsBatchControllersRef = reactExports.useRef(new Set());
  const perfSessionRef = reactExports.useRef(null);
  const perfInputsRef = reactExports.useRef({
    totalItems: 0,
    view: view2,
  });
  const allowedTypes = reactExports.useMemo(
    () => normaliseTypeFilter(filter2?.type),
    [filter2?.type],
  );
  const visibleTypes = allowedTypes.length > 0 ? allowedTypes : ALL_TYPE_FILTERS;
  const uploadTypes = reactExports.useMemo(
    () =>
      typeFilter === TYPE_FILTER_ALL
        ? allowedTypes
        : visibleTypes.filter((type2) => type2 === typeFilter),
    [allowedTypes, typeFilter, visibleTypes],
  );
  const uploadAccept = reactExports.useMemo(() => deriveAccept(uploadTypes), [uploadTypes]);
  const canvasMemberRows = reactExports.useMemo(
    () =>
      buildRows(
        assets,
        allowedTypes,
        canvasEnabled ? resolveCanvasNodeId : void 0,
        tagColorResolver,
        tagRegistry,
        t2,
      ),
    [assets, allowedTypes, canvasEnabled, resolveCanvasNodeId, tagColorResolver, tagRegistry, t2],
  );
  perfInputsRef.current = {
    totalItems: canvasMemberRows.length,
    view: view2,
  };
  reactExports.useEffect(() => {
    if (!open) return;
    setSelected(new Map());
    setUploadedList([]);
    setPreviewRow(null);
    setQuery("");
    setTypeFilter(TYPE_FILTER_ALL);
    setTagFilter(TAG_FILTER_ALL);
    setAvailableOnly(false);
    setTagsExpanded(true);
  }, [open]);
  const uploadedRows = reactExports.useMemo(
    () =>
      uploadedList.map((res) => ({
        ...res,
        rowKey: res.nodeId || res.assetId,
      })),
    [uploadedList],
  );
  const pendingUploadRows = reactExports.useMemo(() => {
    const memberAssetIds = new Set(canvasMemberRows.map((row) => row.assetId));
    return uploadedRows.filter(
      (row) =>
        !memberAssetIds.has(row.assetId) &&
        (allowedTypes.length === 0 || allowedTypes.includes(row.type)),
    );
  }, [allowedTypes, canvasMemberRows, uploadedRows]);
  const allRows = reactExports.useMemo(
    () =>
      applyFilters(
        arrangeRowsWithSessionUploads(canvasMemberRows, uploadedRows, allowedTypes),
        query,
        typeFilter,
        tagFilter,
      ),
    [allowedTypes, canvasMemberRows, query, tagFilter, typeFilter, uploadedRows],
  );
  const typeCounts = reactExports.useMemo(() => {
    const candidates2 = applyFilters(canvasMemberRows, query, TYPE_FILTER_ALL, tagFilter);
    return {
      total: candidates2.length,
      byType: new Map(
        ALL_TYPE_FILTERS.map((type2) => [
          type2,
          candidates2.filter((row) => row.type === type2).length,
        ]),
      ),
    };
  }, [canvasMemberRows, query, tagFilter]);
  const tagCounts = reactExports.useMemo(() => {
    const candidates2 = applyFilters(canvasMemberRows, query, typeFilter, TAG_FILTER_ALL);
    const byTag2 = new Map();
    for (const row of candidates2) {
      for (const id2 of new Set(row.tagIds)) byTag2.set(id2, (byTag2.get(id2) ?? 0) + 1);
    }
    return byTag2;
  }, [canvasMemberRows, query, typeFilter]);
  const fpsAssetIdsKey = reactExports.useMemo(() => {
    if (!fpsBounded) return "";
    const ids2 = new Set();
    for (const row of [...canvasMemberRows, ...pendingUploadRows]) {
      if (row.type === "video" && row.assetId) ids2.add(row.assetId);
    }
    return [...ids2].sort().map(encodeURIComponent).join("&");
  }, [canvasMemberRows, fpsBounded, pendingUploadRows]);
  reactExports.useEffect(() => {
    if (!open) {
      fpsInFlightIdsRef.current.clear();
      for (const controller of fpsBatchControllersRef.current) controller.abort();
      fpsBatchControllersRef.current.clear();
      return;
    }
    return () => {
      fpsInFlightIdsRef.current.clear();
      for (const controller of fpsBatchControllersRef.current) controller.abort();
      fpsBatchControllersRef.current.clear();
    };
  }, [open]);
  reactExports.useEffect(() => {
    if (!request || sourceStep !== "browser") {
      perfSessionRef.current = null;
      return;
    }
    const session = createAssetPickerPerfSession({
      ...perfInputsRef.current,
      openedAt: request.openedAt,
    });
    perfSessionRef.current = session;
    let interactiveFrame;
    const firstPaintFrame = window.requestAnimationFrame(() => {
      if (perfSessionRef.current !== session) return;
      const dialog = document.querySelector('[data-action-ui-id="asset-picker.dialog"]');
      session.recordMountedItems(dialog?.querySelectorAll("[data-asset-index]").length ?? 0);
      session.markFirstPaint();
      interactiveFrame = window.requestAnimationFrame(() => {
        if (perfSessionRef.current === session) session.markInteractive();
      });
    });
    return () => {
      window.cancelAnimationFrame(firstPaintFrame);
      if (interactiveFrame !== void 0) window.cancelAnimationFrame(interactiveFrame);
      if (perfSessionRef.current === session) perfSessionRef.current = null;
    };
  }, [request, sourceStep]);
  reactExports.useEffect(() => {
    if (!open || !fpsBounded) {
      return;
    }
    const assetIds = fpsAssetIdsKey ? fpsAssetIdsKey.split("&").map(decodeURIComponent) : [];
    const missing = assetIds.filter(
      (id2) => !videoFpsMapRef.current.has(id2) && !fpsInFlightIdsRef.current.has(id2),
    );
    if (missing.length === 0) return;
    const controller = new AbortController();
    fpsBatchControllersRef.current.add(controller);
    for (const id2 of missing) fpsInFlightIdsRef.current.set(id2, controller);
    void loadAssetFpsBatch(missing, gatewayFetch2, controller.signal)
      .then((entries2) => {
        if (controller.signal.aborted) return;
        setVideoFpsMap((prev) => {
          const next2 = new Map(prev);
          for (const [id2, fps] of entries2) next2.set(id2, fps);
          return next2;
        });
      })
      .finally(() => {
        fpsBatchControllersRef.current.delete(controller);
        for (const id2 of missing) {
          if (fpsInFlightIdsRef.current.get(id2) === controller) {
            fpsInFlightIdsRef.current.delete(id2);
          }
        }
      });
  }, [fpsAssetIdsKey, fpsBounded, gatewayFetch2, open]);
  const selectionTotals = reactExports.useMemo(
    () => computeSelectionTotals(selected2),
    [selected2],
  );
  function resourceValidationReasonForRow(row) {
    if (
      (allowedTypes.length > 0 && !allowedTypes.includes(row.type)) ||
      (request?.source?.accepts && !request.source.accepts(row))
    )
      return "type-not-allowed";
    if (!constraints2) return void 0;
    if (row.type === "text" || row.type === "subtitle" || row.type === "file") return void 0;
    if (row.type === "image") {
      if (
        (constraints2.imageMinWidth !== void 0 ||
          constraints2.imageMinHeight !== void 0 ||
          constraints2.imageMaxWidth !== void 0 ||
          constraints2.imageMaxHeight !== void 0 ||
          constraints2.imageMaxPixels !== void 0 ||
          constraints2.imageMinAspectRatio !== void 0 ||
          constraints2.imageMaxAspectRatio !== void 0) &&
        (!(typeof row.width === "number") || !(typeof row.height === "number"))
      ) {
        return MEDIA_METADATA_PENDING_REASON;
      }
      return getImageConstraintReason(row, constraints2);
    }
    const duration = finitePositive(row.durationSec);
    if (duration === void 0) return MEDIA_METADATA_PENDING_REASON;
    if (row.type === "audio") {
      if (duration < constraints2.audioPerClipMinSec) return "audio-too-short";
      if (duration > constraints2.audioPerClipMaxSec) return "audio-too-long";
      return void 0;
    }
    if (constraints2.videoPerClipMinSec !== void 0 && duration < constraints2.videoPerClipMinSec) {
      return "video-too-short";
    }
    if (constraints2.videoPerClipMaxSec !== void 0 && duration > constraints2.videoPerClipMaxSec) {
      return "video-too-long";
    }
    if (constraints2.videoMinFps !== void 0 || constraints2.videoMaxFps !== void 0) {
      const fps = videoFpsMapRef.current.get(row.assetId);
      if (fps === void 0) return VIDEO_FPS_PENDING_REASON;
      if (fps <= 0) return MEDIA_METADATA_PENDING_REASON;
      if (
        (constraints2.videoMinFps !== void 0 && fps < constraints2.videoMinFps) ||
        (constraints2.videoMaxFps !== void 0 && fps > constraints2.videoMaxFps)
      ) {
        return `${VIDEO_FPS_REASON_PREFIX}${fps}`;
      }
    }
    return void 0;
  }
  function reasonForRowWithSelection(
    row,
    currentSelected,
    validateSelected = false,
    selectionId = row.rowKey,
  ) {
    const isSelected = currentSelected.has(selectionId);
    if (isSelected && !validateSelected) return void 0;
    const validationReason = resourceValidationReasonForRow(row);
    if (validationReason === "type-not-allowed") return validationReason;
    if (maxCount !== void 0 && currentSelected.size - (isSelected ? 1 : 0) >= maxCount)
      return "full";
    if (!constraints2) return void 0;
    if (row.type === "text" || row.type === "subtitle" || row.type === "file") return void 0;
    const kind = row.type;
    let totals;
    if (isSelected && validateSelected) {
      const selectionWithoutRow = new Map(currentSelected);
      selectionWithoutRow.delete(selectionId);
      totals = computeSelectionTotals(selectionWithoutRow);
    } else {
      totals =
        currentSelected === selected2 ? selectionTotals : computeSelectionTotals(currentSelected);
    }
    const remaining = constraints2.remainingByKind[kind] - totals.counts[kind];
    if (remaining <= 0) return "full";
    if (
      (kind === "video" || kind === "audio") &&
      constraints2.remainingVideoAudio !== void 0 &&
      constraints2.remainingVideoAudio - totals.counts.video - totals.counts.audio <= 0
    ) {
      return "full";
    }
    if (validationReason) return validationReason;
    if (kind === "audio") {
      const d2 = finitePositive(row.durationSec);
      if (constraints2.remainingAudioTotalSec - totals.sec.audio - d2 < 0) {
        return "audio-budget";
      }
    }
    if (kind === "video") {
      const d2 = finitePositive(row.durationSec);
      if (constraints2.remainingVideoTotalSec - totals.sec.video - d2 < 0) {
        return `${VIDEO_BUDGET_REASON_PREFIX}${totals.sec.video + d2 - constraints2.remainingVideoTotalSec}`;
      }
    }
    return void 0;
  }
  function availabilityReasonForRow(row) {
    return reasonForRowWithSelection(row, EMPTY_SELECTION, true);
  }
  function reasonForRow(row) {
    const reason = reasonForRowWithSelection(row, selected2, true);
    if (!reason) return void 0;
    return availabilityReasonForRow(row) ?? "full";
  }
  const sourceAvailability =
    request?.source && sourceStep === "source"
      ? getAssetSourceAvailability(
          sourceStatus,
          canvasMemberRows.filter((row) => !isRowExisting(row)).map(availabilityReasonForRow),
        )
      : "empty";
  const visibleRows = availableOnly
    ? allRows.filter((row) => !isRowExisting(row) && availabilityReasonForRow(row) === void 0)
    : allRows;
  const marqueeSelection = {
    selected: selected2,
    canAddSelection: (row, selection2) =>
      !isRowExisting(row) && !reasonForRowWithSelection(row, selection2),
    onSelectionChange: (selection2) => {
      setSelected((prev) =>
        prev.size === selection2.size &&
        Array.from(selection2).every(([id2, row]) => prev.get(id2) === row)
          ? prev
          : selection2,
      );
    },
  };
  function isRowExisting(row) {
    return (
      existingAssetIds.has(row.assetId) ||
      !!request?.source?.existingPaths?.includes(row.path) ||
      [...existingAssetIds].some((id2) => assets.get(id2)?.path === row.path)
    );
  }
  function toggleRow(row) {
    if (isRowExisting(row)) return;
    setSelected((prev) => {
      const next2 = new Map(prev);
      if (multiple) {
        if (next2.has(row.rowKey)) {
          next2.delete(row.rowKey);
        } else if (maxCount !== void 0 && next2.size >= maxCount) {
          return prev;
        } else if (reasonForRowWithSelection(row, prev)) {
          return prev;
        } else {
          next2.set(row.rowKey, row);
        }
      } else {
        if (reasonForRowWithSelection(row, prev)) return prev;
        next2.clear();
        if (!prev.has(row.rowKey)) {
          next2.set(row.rowKey, row);
        }
      }
      return next2;
    });
  }
  function selectRow(row) {
    if (isRowExisting(row)) return;
    setSelected((prev) => {
      if (prev.has(row.rowKey)) return prev;
      if (multiple && maxCount !== void 0 && prev.size >= maxCount) {
        dedupedToast.warning(
          t2("assetPicker.limitReached", "最多只能选 {{max}} 项", {
            max: maxCount,
          }),
        );
        return prev;
      }
      const reason = reasonForRowWithSelection(row, prev);
      if (reason) {
        dedupedToast.warning(disabledReasonLabel(reason, t2, constraints2));
        return prev;
      }
      const next2 = new Map(prev);
      if (!multiple) next2.clear();
      next2.set(row.rowKey, row);
      return next2;
    });
  }
  function cancel() {
    request?.resolve(null);
  }
  function selectionIssue(selection2) {
    if (minCount !== void 0 && selection2.size < minCount)
      return t2("assetPicker.confirmMin", "至少选 {{min}} 项", {
        min: minCount,
      });
    for (const [id2, resource] of selection2) {
      const reason = reasonForRowWithSelection(resourceToRow(resource, id2), selection2, true, id2);
      if (reason) return disabledReasonLabel(reason, t2, constraints2);
    }
    return void 0;
  }
  function confirm() {
    if (!request) return;
    const issue = selectionIssue(selected2);
    if (issue) {
      dedupedToast.warning(issue);
      return;
    }
    request.resolve(Array.from(selected2.values(), stripRowKey));
  }
  function handleUploaded(res) {
    setUploadedList((prev) =>
      prev.some((item) => item.assetId === res.assetId) ? prev : [...prev, res],
    );
    selectRow(resourceToRow(res));
  }
  function handleViewChange(next2) {
    setView(next2);
    writeStoredView(next2);
  }
  const selectedRowsValid = Array.from(selected2).every(
    ([id2, row]) => !reasonForRowWithSelection(row, selected2, true, id2),
  );
  const meetsMin =
    selected2.size > 0 && (minCount === void 0 || selected2.size >= minCount) && selectedRowsValid;
  function onKeyDown(e2) {
    if (e2.key === "Enter" && meetsMin && e2.target === e2.currentTarget) {
      e2.preventDefault();
      confirm();
    }
  }
  function handleEnterTagView(id2) {
    setTagFilter(id2);
    setPreviewRow(null);
  }
  function handleExitTagView() {
    setTagFilter(TAG_FILTER_ALL);
    setTypeFilter(TYPE_FILTER_ALL);
    setPreviewRow(null);
  }
  const filtersActive =
    query.trim().length > 0 ||
    typeFilter !== TYPE_FILTER_ALL ||
    tagFilter !== TAG_FILTER_ALL ||
    availableOnly;
  const upload = useResourceUpload({
    requestKey: request?.resolve,
    allowedTypes: uploadTypes,
    uploadMode,
    onUploadAndInsert,
    onUploadAttachment,
    onUploaded: (resource) => {
      if (!localStartedRef.current) handleUploaded(resource);
    },
    onCompleted: async (resources) => {
      if (localStartedRef.current) await handleLocalCompleted(resources);
    },
  });
  async function handleLocalCompleted(resources) {
    const activeRequest = request;
    if (!activeRequest) return;
    if (fpsBounded) {
      const controller = new AbortController();
      fpsBatchControllersRef.current.add(controller);
      const entries2 = await loadAssetFpsBatch(
        resources.filter((r2) => r2.type === "video").map((r2) => r2.assetId),
        gatewayFetch2,
        controller.signal,
      );
      fpsBatchControllersRef.current.delete(controller);
      if (controller.signal.aborted || requestRef.current !== activeRequest) return;
      for (const [id2, fps] of entries2) videoFpsMapRef.current.set(id2, fps);
    }
    if (requestRef.current !== activeRequest) return;
    const accepted = new Map();
    for (const resource of resources) {
      const row = resourceToRow(resource);
      if (isRowExisting(row) || accepted.has(row.rowKey)) continue;
      const reason = reasonForRowWithSelection(row, accepted);
      if (reason) dedupedToast.warning(disabledReasonLabel(reason, t2, constraints2));
      else accepted.set(row.rowKey, resource);
    }
    const issue = selectionIssue(accepted);
    if (issue) dedupedToast.warning(issue);
    activeRequest.resolve(!issue && accepted.size > 0 ? [...accepted.values()] : null);
  }
  function handleLocalSource() {
    if (!request || localStartedRef.current) return;
    localStartedRef.current = true;
    if (request.source?.onLocal) {
      request.resolve(null);
      request.source.onLocal();
      return;
    }
    setSourceStep("local");
    upload.pick();
  }
  reactExports.useEffect(() => {
    const input = upload.inputRef.current;
    const handleCancel = () => {
      if (localStartedRef.current) requestRef.current?.resolve(null);
    };
    input?.addEventListener("cancel", handleCancel);
    return () => input?.removeEventListener("cancel", handleCancel);
  }, [upload.inputRef]);
  const localSourceRef = reactExports.useRef(handleLocalSource);
  localSourceRef.current = handleLocalSource;
  reactExports.useEffect(() => {
    if (!request?.source || sourceStep !== "source") return;
    if (sourceAvailability === "empty" && !sourceMenuShownRef.current) localSourceRef.current();
    else sourceMenuShownRef.current = true;
  }, [request, sourceAvailability, sourceStep]);
  const summary = selectionSummary(
    filter2,
    selected2.size,
    allowedTypes,
    t2,
    selectionTotals.counts,
  );
  const uploadAction =
    !tagView && uploadEnabled ? (
      <UploadEntry view={view2} busy={upload.busy} error={upload.lastError} onClick={upload.pick} />
    ) : (
      void 0
    );
  const browser2 = (
    <Dialog
      open={open && sourceStep === "browser"}
      disablePointerDismissal={true}
      onOpenChange={(next2) => {
        if (!next2) cancel();
      }}
    >
      <DialogContent
        ref={dialogRef}
        initialFocus={dialogRef}
        size="xl"
        className="z-10001 h-[min(680px,calc(100dvh-3rem))] w-[calc(100vw-3rem)] grid-rows-[minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-[920px]"
        showCloseButton={false}
        overlayClassName="asset-picker-overlay z-10000"
        data-action-ui-id="asset-picker.dialog"
        onKeyDown={onKeyDown}
        portalContainer={fullscreenContainerEl}
      >
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-44 shrink-0 flex-col gap-4 overflow-y-auto border-r bg-muted/20 px-4 pt-4 pb-4">
            <DialogTitle className="sr-only">{t2("assetPicker.title", "选择资源")}</DialogTitle>
            <Input3
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t2("assetPicker.searchPlaceholder", "搜索资源…")}
              startIcon={<Search className="size-3.5" />}
              className="h-8 shrink-0 text-xs"
              data-action-ui-id="asset-picker.search"
            />
            <div className="shrink-0 space-y-0.5">
              <SidebarFilterButton
                active={typeFilter === TYPE_FILTER_ALL}
                onClick={tagView ? handleExitTagView : () => setTypeFilter(TYPE_FILTER_ALL)}
                count={typeCounts.total}
                actionId="asset-picker.type.all"
              >
                {t2("assetPicker.typeFilter.all", "全部")}
              </SidebarFilterButton>
              {visibleTypes.map((type2) => (
                <SidebarFilterButton
                  key={type2}
                  active={typeFilter === type2}
                  onClick={() => setTypeFilter(type2)}
                  count={typeCounts.byType.get(type2) ?? 0}
                  actionId={`asset-picker.type.${type2}`}
                >
                  {t2(`assetPicker.typeFilter.${type2}`, type2.toUpperCase())}
                </SidebarFilterButton>
              ))}
            </div>
            {canvasEnabled && (tagRegistry?.tags.length ?? 0) > 0 && (
              <div className="shrink-0">
                <button
                  type="button"
                  className="flex h-8 w-full items-center justify-between rounded-md px-2.5 text-[11px] font-normal text-muted-foreground/60 transition-colors hover:bg-muted/60 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                  aria-expanded={tagsExpanded}
                  aria-controls="asset-picker-tag-filters"
                  onClick={() => setTagsExpanded((expanded) => !expanded)}
                  data-action-ui-id="asset-picker.tags.toggle"
                >
                  <span>{t2("assetFilter.tagSection", "标签")}</span>
                  <ChevronDown
                    className={cn$2(
                      "size-3.5 shrink-0 transition-transform",
                      !tagsExpanded && "-rotate-90",
                    )}
                    strokeWidth={1.5}
                    aria-hidden={true}
                  />
                </button>
                {tagsExpanded && (
                  <div id="asset-picker-tag-filters" className="space-y-0.5">
                    {tagRegistry?.tags.map((tag) => (
                      <SidebarFilterButton
                        key={tag.id}
                        active={tagFilter === tag.id}
                        onClick={() => handleEnterTagView(tag.id)}
                        count={tagCounts.get(tag.id) ?? 0}
                        countKind="tag"
                        actionId={`asset-picker.tag.${tag.id}`}
                        icon={<TagFilterMark tag={tag} />}
                      >
                        {tagLabel(tag, t2)}
                      </SidebarFilterButton>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
          <section
            className="flex min-w-0 flex-1 flex-col"
            data-asset-picker-selection-scope={true}
          >
            <div className="flex h-16 shrink-0 items-center px-6" data-marquee-blank-origin={true}>
              <div
                className="mr-auto flex min-w-0 items-center gap-2"
                data-action-ui-id="asset-picker.toolbar-actions"
              >
                <SegmentedSwitch
                  value={view2}
                  onValueChange={handleViewChange}
                  ariaLabel={t2("assetPicker.viewToggle", "视图切换")}
                  iconSize={14}
                  options={[
                    {
                      value: "grid",
                      label: t2("assetPicker.view.grid", "宫格"),
                      icon: LayoutGrid,
                      dataActionUiId: "asset-picker.view.grid",
                    },
                    {
                      value: "list",
                      label: t2("assetPicker.view.list", "列表"),
                      icon: LayoutList,
                      dataActionUiId: "asset-picker.view.list",
                    },
                  ]}
                />
                <label
                  htmlFor="asset-picker-available-only"
                  className="hilo-checkbox-label flex min-h-8 shrink-0 cursor-pointer items-center px-1 text-xs text-foreground/70 transition-colors select-none hover:text-foreground"
                >
                  <Checkbox
                    id="asset-picker-available-only"
                    size="sm"
                    checked={availableOnly}
                    onCheckedChange={(checked) => setAvailableOnly(checked === true)}
                    data-action-ui-id="asset-picker.available-only"
                  />
                  <span>{t2("assetPicker.filter.availableOnly", "仅显示可用")}</span>
                </label>
                {tagView && (
                  <Badge
                    variant="secondary"
                    className="h-8 min-w-0 shrink gap-2 pl-2.5 pr-1"
                    data-action-ui-id="asset-picker.tag-view"
                  >
                    {activeTag && <TagFilterMark tag={activeTag} />}
                    <span className="truncate">
                      {activeTag ? tagLabel(activeTag, t2) : tagFilter}
                    </span>
                    <Button$1
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      aria-label={t2("assetFilter.reset", "清除筛选")}
                      onClick={handleExitTagView}
                      data-action-ui-id="asset-picker.tag-view.clear"
                    >
                      <X$7 className="size-3.5" strokeWidth={1.5} />
                    </Button$1>
                  </Badge>
                )}
              </div>
              <Button$1
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={cancel}
                aria-label={t2("common.close")}
                data-action-ui-id="asset-picker.close"
              >
                <X$7 className="size-[18px]" strokeWidth={1.5} />
              </Button$1>
            </div>
            <div className="flex min-h-0 flex-1 flex-col pl-4 pr-3">
              {view2 === "list" && uploadAction && (
                <div
                  className="shrink-0 pt-2 pl-2 pr-3"
                  data-action-ui-id="asset-picker.list-upload-sticky"
                >
                  {uploadAction}
                </div>
              )}
              <div className="min-h-0 flex-1">
                <AssetList
                  rows={visibleRows}
                  view={view2}
                  multiple={multiple}
                  leadingAction={view2 === "grid" ? uploadAction : void 0}
                  {...marqueeSelection}
                  onToggle={toggleRow}
                  reasonForRow={reasonForRow}
                  labelForReason={(reason) => disabledReasonLabel(reason, t2, constraints2)}
                  isRowExisting={isRowExisting}
                  onPreview={setPreviewRow}
                  emptyTitle={
                    filtersActive
                      ? t2("assetPicker.empty.filtered", "没有符合条件的资源")
                      : t2("assetPicker.empty.canvas", "画布上没有可选资源")
                  }
                  emptyDescription={
                    filtersActive
                      ? t2("assetPicker.empty.filteredHint", "请调整搜索或筛选条件")
                      : void 0
                  }
                  onClearFilters={
                    filtersActive
                      ? () => {
                          setQuery("");
                          setTypeFilter(TYPE_FILTER_ALL);
                          setTagFilter(TAG_FILTER_ALL);
                          setAvailableOnly(false);
                        }
                      : void 0
                  }
                />
              </div>
            </div>
          </section>
        </div>
        <DialogFooter className="flex-row items-center gap-4 border-t px-4 py-3 sm:justify-between">
          <div
            className="min-w-0 text-xs text-muted-foreground"
            data-action-ui-id="asset-picker.selection-summary"
            aria-live="polite"
          >
            <div className="font-medium text-foreground">{summary.selected}</div>
            <div className="mt-1 text-[11px] leading-relaxed">
              {summary.detail}
              {summary.full}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button$1
              variant="outline"
              className="min-w-22 rounded-[calc(var(--radius-sm)+2px)]"
              onClick={cancel}
              data-action-ui-id="asset-picker.cancel"
            >
              {t2("common.cancel", "取消")}
            </Button$1>
            <Button$1
              className="min-w-26 rounded-[calc(var(--radius-sm)+2px)]"
              onClick={confirm}
              disabled={!meetsMin}
              data-action-ui-id="asset-picker.confirm"
            >
              {t2("common.confirm", "确认")}
            </Button$1>
          </div>
        </DialogFooter>
      </DialogContent>
      {open && previewRow && (
        <MediaLightbox
          key={previewRow.assetId}
          kind={mediaLightboxKindForAsset(previewRow.type)}
          src={previewRow.url}
          alt={previewRow.name}
          onClose={() => setPreviewRow(null)}
        />
      )}
    </Dialog>
  );
  return (
    <>
      {uploadEnabled && (
        <input
          ref={upload.inputRef}
          type="file"
          accept={uploadAccept}
          multiple={multiple}
          className="hidden"
          data-action-ui-id="asset-source.file-input"
          onChange={upload.handleChange}
        />
      )}
      {open &&
        request?.source &&
        sourceStep === "source" &&
        (sourceAvailability !== "empty" || sourceMenuShownRef.current) && (
          <AssetSourceMenu
            anchor={request.source.anchor}
            preferredSide={request.source.preferredSide}
            appearance={request.source.appearance}
            availability={sourceAvailability}
            onCanvas={() => setSourceStep("browser")}
            onLocal={handleLocalSource}
            onCancel={cancel}
          />
        )}
      <Dialog
        open={open && sourceStep === "local" && upload.busy}
        disablePointerDismissal={true}
        onOpenChange={(next2) => {
          if (!next2) cancel();
        }}
      >
        <DialogContent
          className="z-10001"
          overlayClassName="z-10000"
          portalContainer={fullscreenContainerEl}
        >
          <DialogTitle>{t2("assetPicker.upload.uploading", "上传中…")}</DialogTitle>
          <DialogFooter>
            <Button$1
              variant="outline"
              onClick={cancel}
              data-action-ui-id="asset-source.upload-cancel"
            >
              {t2("common.cancel", "取消")}
            </Button$1>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {browser2}
    </>
  );
}
function TagFilterMark({ tag }) {
  return isCanvasColorTag(tag) ? (
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
  );
}
function SidebarFilterButton({
  active: active2,
  onClick,
  children: children2,
  count: count2,
  actionId,
  icon,
  countKind = "type",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={typeof children2 === "string" ? children2 : void 0}
      aria-pressed={active2}
      data-action-ui-id={actionId}
      className={cn$2(
        "flex h-8 w-full items-center justify-between gap-2 rounded-md px-2.5 text-left text-xs transition-colors",
        active2
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{children2}</span>
      </span>
      <span
        className="shrink-0 tabular-nums text-muted-foreground/40"
        data-type-count={countKind === "type" ? "" : void 0}
        data-tag-count={countKind === "tag" ? "" : void 0}
      >
        {count2}
      </span>
    </button>
  );
}
function mediaLightboxKindForAsset(type2) {
  return type2 === "subtitle" ? "text" : type2;
}
function useResourceUpload({
  requestKey,
  allowedTypes,
  uploadMode,
  onUploadAndInsert,
  onUploadAttachment,
  onUploaded,
  onCompleted,
}) {
  const { t: t2 } = useTranslation();
  const inputRef = reactExports.useRef(null);
  const [busy, setBusy] = reactExports.useState(false);
  const [lastError, setLastError] = reactExports.useState(null);
  const epochRef = reactExports.useRef(0);
  const busyRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    epochRef.current += 1;
    busyRef.current = false;
    setBusy(false);
    setLastError(null);
    return () => {
      epochRef.current += 1;
    };
  }, [requestKey]);
  function pick() {
    if (!busyRef.current) inputRef.current?.click();
  }
  async function handleChange(e2) {
    const files = Array.from(e2.target.files ?? []);
    e2.target.value = "";
    if (files.length === 0 || busyRef.current) return;
    const epoch = epochRef.current;
    busyRef.current = true;
    setBusy(true);
    setLastError(null);
    const resources = [];
    try {
      for (const file of files) {
        if (epoch !== epochRef.current) break;
        const type2 = inferType(file);
        if (allowedTypes.length > 0 && !allowedTypes.includes(type2)) {
          dedupedToast.error(
            t2("assetPicker.upload.typeRejected", "{{name}} 类型不在允许范围内", {
              name: file.name,
            }),
          );
          continue;
        }
        const res =
          uploadMode === "attach" && onUploadAttachment
            ? await onUploadAttachment(file)
            : await onUploadAndInsert(file, type2);
        if (epoch === epochRef.current) {
          resources.push(res);
          onUploaded(res);
        }
      }
    } catch (err) {
      if (epoch !== epochRef.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(msg);
      dedupedToast.error(`${t2("assetPicker.upload.failed", "上传失败")}: ${msg}`);
    } finally {
      if (epoch === epochRef.current) {
        await onCompleted?.(resources);
        busyRef.current = false;
        setBusy(false);
      }
    }
  }
  return {
    inputRef,
    busy,
    lastError,
    pick,
    handleChange,
  };
}
function UploadEntry({ view: view2, busy, error, onClick }) {
  const { t: t2 } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      data-action-ui-id="asset-picker.upload.pick"
      aria-label={t2("assetPicker.upload.action", "本地上传")}
      aria-busy={busy}
      className={cn$2(
        "relative flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-foreground/30 bg-muted/30 text-xs text-foreground hover:border-foreground/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait",
        view2 === "grid" ? "h-full flex-col" : "h-14 px-3",
      )}
    >
      {view2 === "grid" && (
        <span aria-hidden={true} className="invisible block aspect-3/2 w-full shrink-0" />
      )}
      {view2 === "grid" && <span aria-hidden={true} className="invisible block h-12 shrink-0" />}
      <span
        className={cn$2(
          "flex items-center justify-center gap-2",
          view2 === "grid" && "absolute inset-0 flex-col",
        )}
      >
        {busy ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Upload className="size-5" strokeWidth={1.5} />
        )}
        <span>
          {busy
            ? t2("assetPicker.upload.uploading", "上传中…")
            : t2("assetPicker.upload.action", "本地上传")}
        </span>
        {error && (
          <span role="alert" className="max-w-full truncate px-2 text-destructive" title={error}>
            {t2("assetPicker.upload.failed", "上传失败")}
          </span>
        )}
      </span>
    </button>
  );
}
function formatImageMinDimensionLimit(constraints2) {
  const minWidth = finitePositive(constraints2?.imageMinWidth);
  const minHeight = finitePositive(constraints2?.imageMinHeight);
  if (minWidth !== void 0 && minHeight !== void 0) return `${minWidth}×${minHeight}`;
  if (minWidth !== void 0) return `${minWidth}px wide`;
  if (minHeight !== void 0) return `${minHeight}px tall`;
  return "";
}
function formatSeconds(value, fallback) {
  if (value === void 0 || !Number.isFinite(value)) return fallback;
  return String(value);
}
function formatExceededDuration(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}s`;
}
function disabledReasonLabel(reason, t2, constraints2) {
  if (reason.startsWith(VIDEO_BUDGET_REASON_PREFIX)) {
    const excessSec = Number(reason.slice(VIDEO_BUDGET_REASON_PREFIX.length));
    if (Number.isFinite(excessSec) && excessSec > 0) {
      return t2("assetPicker.disabledReason.videoBudgetExceeded", "超出 {{duration}}", {
        duration: formatExceededDuration(excessSec),
      });
    }
  }
  if (reason.startsWith(VIDEO_FPS_REASON_PREFIX)) {
    const fps = Number(reason.slice(VIDEO_FPS_REASON_PREFIX.length));
    const min2 = constraints2?.videoMinFps;
    const max2 = constraints2?.videoMaxFps;
    if (max2 !== void 0 && Number.isFinite(fps) && fps > max2) {
      return t2("assetPicker.disabledReason.videoFpsOverMax", "帧率超 {{max}}fps", {
        max: max2,
      });
    }
    if (min2 !== void 0 && Number.isFinite(fps) && fps < min2) {
      return t2("assetPicker.disabledReason.videoFpsUnderMin", "帧率低于 {{min}}fps", {
        min: min2,
      });
    }
    return t2("assetPicker.disabledReason.videoFps", "帧率需 {{min}}-{{max}}fps", {
      min: min2 ?? 0,
      max: max2 ?? 0,
    });
  }
  if (reason === VIDEO_FPS_PENDING_REASON) {
    return t2("assetPicker.disabledReason.videoFpsPending", "正在检测帧率…");
  }
  switch (reason) {
    case "type-not-allowed":
      return t2("assetPicker.disabledReason.typeNotAllowed", "当前入口不支持");
    case "full":
      return t2("assetPicker.disabledReason.full", "已达上限");
    case "image-size":
      return t2("assetPicker.disabledReason.imageSize", "Min {{min}}", {
        min: formatImageMinDimensionLimit(constraints2),
      });
    case "image-aspect":
      return t2("assetPicker.disabledReason.imageAspect", "Ratio out of range");
    case "audio-range":
      return t2("assetPicker.disabledReason.audioRange", "需 {{min}}-{{max}}s", {
        min: formatSeconds(constraints2?.audioPerClipMinSec, "—"),
        max: formatSeconds(constraints2?.audioPerClipMaxSec, "—"),
      });
    case "audio-too-short":
      return t2("assetPicker.disabledReason.audioTooShort", "音频过短");
    case "audio-too-long":
      return t2("assetPicker.disabledReason.audioTooLong", "音频过长");
    case "audio-budget":
      return t2("assetPicker.disabledReason.audioBudget", "总音频超 {{max}}s", {
        max: formatSeconds(constraints2?.remainingAudioTotalSec, "—"),
      });
    case "video-budget":
      return t2("assetPicker.disabledReason.videoBudget", "总视频超 {{max}}s", {
        max: formatSeconds(constraints2?.remainingVideoTotalSec, "—"),
      });
    case "video-too-short":
      return t2("assetPicker.disabledReason.videoTooShort", "视频过短");
    case "video-too-long":
      return t2("assetPicker.disabledReason.videoTooLong", "视频过长");
    case MEDIA_METADATA_PENDING_REASON:
      return t2("assetPicker.disabledReason.metadataPending", "信息待确认");
    default:
      return "";
  }
}
function buildRows(assets, allowedTypes, resolveCanvasNodeId, tagColorResolver, tagRegistry, t2) {
  const allowed = new Set(allowedTypes);
  const seenPaths = new Set();
  const seenRefs = new WeakSet();
  const out = [];
  assets.forEach((meta2, key2) => {
    const type2 = normaliseAssetType(meta2.type, meta2.path || meta2.name);
    if (allowed.size > 0 && !allowed.has(type2)) return;
    if (meta2.path) {
      if (seenPaths.has(meta2.path)) return;
      seenPaths.add(meta2.path);
    } else {
      if (seenRefs.has(meta2)) return;
      seenRefs.add(meta2);
    }
    const nodeId = (meta2.path ? resolveCanvasNodeId?.(meta2.path) : void 0) ?? key2;
    const resolvedTag = tagColorResolver?.(meta2.tagIds)[0];
    const tagNames = (meta2.tagIds ?? [])
      .map((tagId) => tagRegistry?.tags.find((tag) => tag.id === tagId))
      .filter((tag) => Boolean(tag))
      .map((tag) => (t2 ? tagLabel(tag, t2) : (tag.name ?? tag.id)));
    out.push({
      rowKey: key2,
      nodeId,
      assetId: key2,
      type: type2,
      name: meta2.name,
      url: meta2.url,
      path: meta2.path,
      ...(meta2.width !== void 0 && {
        width: meta2.width,
      }),
      ...(meta2.height !== void 0 && {
        height: meta2.height,
      }),
      ...(meta2.durationSec !== void 0 && {
        durationSec: meta2.durationSec,
      }),
      ...(meta2.fileSize !== void 0 && {
        fileSize: meta2.fileSize,
      }),
      ...(meta2.tagIds !== void 0 && {
        tagIds: meta2.tagIds,
      }),
      ...(tagNames.length > 0 && {
        tagNames,
      }),
      ...(resolvedTag && {
        tag: {
          color: resolvedTag.color,
          name: resolvedTag.name,
        },
      }),
    });
  });
  out.sort((a2, b3) => a2.name.localeCompare(b3.name));
  return out;
}
function arrangeRowsWithSessionUploads(canvasRows, uploadedRows, allowedTypes) {
  if (uploadedRows.length === 0) return canvasRows;
  const allowed = new Set(allowedTypes);
  const canvasByAssetId = new Map(canvasRows.map((row) => [row.assetId, row]));
  const canvasByPath = new Map(
    canvasRows.filter((row) => row.path.length > 0).map((row) => [row.path, row]),
  );
  const uploadedAssetIds = new Set(uploadedRows.map((row) => row.assetId));
  const uploadedPaths = new Set(
    uploadedRows.filter((row) => row.path.length > 0).map((row) => row.path),
  );
  const uploadsFirst = [...uploadedRows]
    .reverse()
    .filter((row) => allowed.size === 0 || allowed.has(row.type))
    .map((uploadedRow) => {
      const syncedRow =
        canvasByAssetId.get(uploadedRow.assetId) ||
        (uploadedRow.path ? canvasByPath.get(uploadedRow.path) : void 0);
      if (!syncedRow) return uploadedRow;
      return {
        ...syncedRow,
        rowKey: uploadedRow.rowKey,
        assetId: uploadedRow.assetId,
        nodeId: syncedRow.nodeId || uploadedRow.nodeId,
      };
    });
  const remainingCanvasRows = canvasRows.filter(
    (row) =>
      !uploadedAssetIds.has(row.assetId) && !(row.path.length > 0 && uploadedPaths.has(row.path)),
  );
  return [...uploadsFirst, ...remainingCanvasRows];
}
function applyFilters(rows, query, typeFilter, tagFilter) {
  const q2 = query.trim().toLowerCase();
  if (q2.length === 0 && typeFilter === TYPE_FILTER_ALL && tagFilter === TAG_FILTER_ALL)
    return rows;
  return rows.filter((r2) => {
    if (typeFilter !== TYPE_FILTER_ALL && r2.type !== typeFilter) return false;
    if (tagFilter !== TAG_FILTER_ALL && !r2.tagIds?.includes(tagFilter)) return false;
    if (
      q2.length > 0 &&
      !r2.name.toLowerCase().includes(q2) &&
      !r2.tagNames?.some((name2) => name2.toLowerCase().includes(q2))
    )
      return false;
    return true;
  });
}
function normaliseTypeFilter(raw2) {
  if (!raw2) return [];
  return Array.isArray(raw2) ? raw2 : [raw2];
}
function tagLabel(tag, t2) {
  if (tag.name) return tag.name;
  return t2(tag.legacyNameKey ?? PRESET_COLOR_NAME_KEYS[tag.id] ?? "") || tag.id;
}
function normaliseAssetType(raw2, fileName) {
  if (fileName && isSubtitleFileName(fileName)) return "subtitle";
  switch (raw2) {
    case "image":
    case "video":
    case "audio":
    case "text":
      return raw2;
    default:
      return "file";
  }
}
function stripRowKey(row) {
  const { rowKey: _rowKey, tag: _tag, tagIds: _tagIds, tagNames: _tagNames, ...rest } = row;
  return rest;
}
function resourceToRow(resource, rowKey = resource.assetId) {
  return {
    ...resource,
    rowKey,
  };
}
function deriveAccept(types2) {
  if (types2.length === 0) return ALL_MEDIA_FILE_ACCEPT;
  const parts = [];
  for (const t2 of types2) {
    const accept = MEDIA_FILE_ACCEPT[t2];
    if (!accept) return ALL_MEDIA_FILE_ACCEPT;
    parts.push(accept);
  }
  return parts.join(",");
}
function inferType(file) {
  if (isSubtitleFileName(file.name)) return "subtitle";
  const dot2 = file.name.lastIndexOf(".");
  const ext = dot2 >= 0 ? file.name.slice(dot2) : "";
  const detected = inferMediaKind(file.type, ext);
  return detected;
}
function readStoredView() {
  if (typeof window === "undefined") return "grid";
  try {
    const v2 = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return v2 === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}
function writeStoredView(next2) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, next2);
  } catch {}
}
function groupId(kind) {
  const decision = guardAccountSubmission(kind);
  if (!decision.allowed) return null;
  return decision.mode === "CANONICAL" ? decision.scope.groupId : void 0;
}
function send(kind, sender, message2) {
  const requestGroupId = groupId(kind);
  return requestGroupId === null
    ? false
    : sender({
        ...message2,
        group_id: requestGroupId,
      });
}
export const accountScopedMessage = {
  groupId,
  send,
};
export const SESSION_CREATE_TIMEOUT_MS$1 = 1e4;
export const MAX_PENDING_SESSION_CREATE_REQUESTS = 5;
export const MESSAGE_DELIVERY_TIMEOUT_MS$1 = 1e4;
export const TIMED_OUT_PLUGIN_DELIVERY_LIMIT = 50;
const DEFAULT_RUNTIME_WATCHDOG_WINDOW_MS$1 = 300 * 6e4;
export const MESSAGE_RUNTIME_PROGRESS_TIMEOUT_MS$1 = DEFAULT_RUNTIME_WATCHDOG_WINDOW_MS$1;
export const MESSAGE_DELIVERY_TIMEOUT_ERROR = "Message delivery timed out.";
export const SKILL_CACHE_TTL_MS = 3e4;
export const FORWARDED_MESSAGE_TYPES = new Set([
  "text_chunk",
  "thinking",
  "text_end",
  "image",
  "video",
  "audio",
  "status",
  "task_notification",
  "interact_request",
  "confirm_request",
]);
export function mapSkillBrief(s2) {
  return {
    name: s2.name,
    displayNameZh: s2.displayNameZh,
    summary: s2.summary,
    summaryZh: s2.summaryZh,
    description: s2.description,
    tags: s2.tags ?? [],
    tagsCn: s2.tagsCn ?? [],
    triggerWords: s2.triggerWords ?? [],
    enabled: s2.enabled,
    version: s2.version,
    source: s2.source,
  };
}
export function extractText(msg) {
  switch (msg.type) {
    case "text_chunk":
    case "thinking":
    case "status":
    case "task_notification":
      return msg.content;
    default:
      return void 0;
  }
}
export function extractMedia(msg) {
  if (msg.type === "image" || msg.type === "video" || msg.type === "audio") {
    const m3 = msg;
    return {
      mediaUrl: m3.url,
      mediaPath: m3.path,
    };
  }
  return {};
}
