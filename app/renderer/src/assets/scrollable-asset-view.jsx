// scrollable-asset-view.jsx
import { useVirtualizer } from "../infra/use-virtualizer.js";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { AudioLines, FileImage, Film, Tag$1 as Tag } from "../media-editing/lucide-icon-wraps.js";
import { classifyFileType } from "../infra/file-type.js";
import { estimateGridRowSize, GRID_COLUMN_COUNT_WIDE } from "./grid-row-size.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FileText, Maximize2, Paperclip } from "../media-editing/package.jsx";
import { mergeTailwindClasses as cn, TooltipContent } from "../infra/dialog-content.jsx";
import {
  describeMeta,
  DurationBadge,
  STRICT_THUMBNAIL_MAX_RETRIES,
  STRICT_THUMBNAIL_RETRY_DELAY_MS,
  withStrictThumbnail,
} from "./preview-media.jsx";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { DeferredThumbnailImage } from "../workspace/deferred-thumbnail-image-generation.jsx";
import { buildVideoThumbnailUrl } from "../media-editing/build-video-thumb-base.jsx";
import { PlaybackPlayIcon } from "../workspace/home-service.jsx";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { getCanvasTagPresentationColor } from "./inline-input.jsx";
import { FileNameLabel } from "./audio-play-button.jsx";
import { useMarqueeSelection } from "../canvas/use-marquee-selection.js";
const ASSET_VIRTUALIZATION_MIN_ITEMS = 40;
const GRID_OVERSCAN_ROWS = 3;
const ASSET_VIEW_INITIAL_RECT = {
  width: 480,
  height: 384,
};
const GRID_THUMBNAIL_DISPLAY_PX = 110;
const GRID_MEDIA_THUMBNAIL_WIDTH_PX = 200;
const LIST_THUMBNAIL_DISPLAY_PX = 40;
const LIST_MEDIA_THUMBNAIL_WIDTH_PX = 80;
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
      className={cn(
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
function Thumbnail({ resource, size }) {
  const dim = size === "grid" ? "h-full w-full" : "h-10 w-10 shrink-0";
  const thumbnailDisplayWidth =
    size === "grid" ? GRID_THUMBNAIL_DISPLAY_PX : LIST_THUMBNAIL_DISPLAY_PX;
  const mediaThumbnailWidth =
    size === "grid"
      ? GRID_MEDIA_THUMBNAIL_WIDTH_PX
      : LIST_MEDIA_THUMBNAIL_WIDTH_PX;
  const [thumbFailed, setThumbFailed] = reactExports.useState(false);
  if (resource.type === "image" && !thumbFailed) {
    return (
      <DeferredThumbnailImage
        src={withStrictThumbnail(resource.url, thumbnailDisplayWidth)}
        alt=""
        className={cn(dim, "object-cover")}
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
        ? buildVideoThumbnailUrl(
            resource.url,
            resource.path,
            mediaThumbnailWidth,
          )
        : void 0;
    if (thumbUrl) {
      return (
        <DeferredThumbnailImage
          src={thumbUrl}
          alt=""
          className={cn(dim, "object-cover")}
          onFailure={() => setThumbFailed(true)}
          priority="interactive"
        />
      );
    }
  }
  return (
    <div
      className={cn(
        dim,
        "flex items-center justify-center bg-muted text-[10px] uppercase text-muted-foreground",
      )}
    >
      <FileTypeIcon
        {...classifyFileType({
          filename: resource.name,
        })}
        size={size === "grid" ? 48 : 24}
        decorative={true}
      />
    </div>
  );
}
const GRID_COLUMN_COUNT_NARROW = 4;
const GRID_FIVE_COLUMN_MIN_WIDTH_PX = 700;
const GRID_KEYBOARD_PAGE_ROWS = 3;
const LIST_ROW_ESTIMATE_PX = 56;
const LIST_OVERSCAN_ROWS = 6;
const LIST_KEYBOARD_PAGE_SIZE = 7;
function AssetTagMark({
  tag,
  size,
  className,
  ringColor,
  overlay = false,
}) {
  if (!tag) return null;
  return (
    <TooltipProvider delay={20}>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className={cn(
                "shrink-0 rounded-full",
                overlay &&
                  "flex items-center justify-center bg-black/75 text-white shadow-sm",
                className,
              )}
              data-action-ui-id="asset-picker.tag-mark"
              data-tag-name={tag.name}
              onPointerEnter={(event) => event.stopPropagation()}
              onPointerMove={(event) => event.stopPropagation()}
              onPointerLeave={(event) => event.stopPropagation()}
              style={{
                width: size,
                height: size,
                backgroundColor: overlay
                  ? void 0
                  : getCanvasTagPresentationColor(tag.color),
                boxShadow: ringColor ? `0 0 0 0.7px ${ringColor}` : void 0,
              }}
            >
              {overlay ? <Tag className="size-2" strokeWidth={2} /> : null}
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
      className={cn(
        "flex flex-wrap items-center overflow-hidden",
        compact
          ? "h-3.5 gap-x-0.5 text-[10px] leading-3.5 text-muted-foreground/70"
          : "h-4 gap-x-1 text-[11px] leading-4 text-muted-foreground",
      )}
      title={description}
      data-action-ui-id="asset-picker.resource-meta"
    >
      {description.split(" · ").map((part, index) => (
        <span key={part} className="shrink-0 whitespace-nowrap">
          {index > 0 && (
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
function assetNavigationIndex(
  key,
  currentIndex,
  itemCount,
  view,
  gridColumnCount,
) {
  if (itemCount <= 0) return void 0;
  const pageSize =
    view === "grid"
      ? gridColumnCount * GRID_KEYBOARD_PAGE_ROWS
      : LIST_KEYBOARD_PAGE_SIZE;
  let nextIndex;
  switch (key) {
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
      nextIndex = currentIndex - (view === "grid" ? gridColumnCount : 1);
      break;
    case "ArrowDown":
      nextIndex = currentIndex + (view === "grid" ? gridColumnCount : 1);
      break;
    case "ArrowLeft":
      if (view === "grid") nextIndex = currentIndex - 1;
      break;
    case "ArrowRight":
      if (view === "grid") nextIndex = currentIndex + 1;
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
function ExistingStatusTag({ label, overlay = false, className }) {
  return (
    <span
      className={cn(
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
function SelectionOrderBadge({ order, className }) {
  const { t: translate } = useTranslation();
  if (order === void 0) return null;
  return (
    <span
      role="img"
      className={cn(
        "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border-2 border-white bg-black px-1 text-[10px] font-semibold leading-none text-white shadow-sm tabular-nums",
        className,
      )}
      aria-label={`${translate("assetPicker.selected", "已选择")} ${order}`}
      data-action-ui-id="asset-picker.selection-order"
      data-selection-order={order}
    >
      {order}
    </span>
  );
}
function RowBadge({ existing, reason, labelForReason, t: translate, selectionOrder }) {
  return (
    <>
      {existing ? (
        <ExistingStatusTag
          label={translate("assetPicker.existing", "已添加")}
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
function SelectionOutline({ selected, className }) {
  if (!selected) return null;
  return (
    <span
      aria-hidden="true"
      data-action-ui-id="asset-picker.selection-outline"
      className={cn(
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
      <PlaybackPlayIcon
        size={14}
        className="text-[var(--media-overlay-foreground)]"
      />
    </span>
  );
}
function AssetPreviewButton({ row, onPreview, className }) {
  const { t: translate } = useTranslation();
  return (
    <button
      type="button"
      aria-label={translate("assetPicker.preview", "预览")}
      data-action-ui-id={`asset-picker.preview.${row.type}`}
      className={cn(
        "flex cursor-pointer items-center justify-center rounded-full bg-black/20 text-white opacity-0 shadow-sm backdrop-blur-md transition-[opacity,background-color] hover:bg-black/30 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [@media(hover:none)]:opacity-100",
        className,
      )}
      onClick={() => onPreview(row)}
    >
      <Maximize2 className="size-3.5" strokeWidth={1.5} />
    </button>
  );
}
function GridTile({
  row,
  assetIndex,
  totalSize,
  isFocused,
  onFocusedRowChange,
  optionIdPrefix,
  selected,
  selectionOrderByKey,
  onToggle,
  reasonForRow,
  labelForReason,
  isRowExisting,
  onPreview,
}) {
  const { t: translate } = useTranslation();
  const sel = selected.has(row.rowKey);
  const selectionOrder = selectionOrderByKey.get(row.rowKey);
  const existing = isRowExisting(row);
  const reason = reasonForRow(row);
  const disabled = existing || (!!reason && !sel);
  return (
    <div
      onPointerMove={() => onFocusedRowChange(row.rowKey)}
      aria-disabled={disabled || void 0}
      aria-label={row.name}
      aria-selected={sel}
      aria-posinset={assetIndex + 1}
      aria-setsize={totalSize}
      role="option"
      tabIndex={-1}
      id={assetOptionId(optionIdPrefix, row.rowKey)}
      data-asset-row-key={row.rowKey}
      className={cn(
        "group relative h-full overflow-hidden rounded-lg border bg-transparent text-left transition-colors",
        isFocused &&
          "group-focus-visible/asset-view:ring-2 group-focus-visible/asset-view:ring-ring group-focus-visible/asset-view:ring-offset-1",
        sel
          ? "border-transparent"
          : disabled
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
        disabled={disabled}
        tabIndex={-1}
        data-asset-index={assetIndex}
        data-marquee-start="true"
        aria-label={existing ? translate("assetPicker.existing", "已添加") : row.name}
        className={cn(
          "flex h-full w-full cursor-pointer flex-col items-stretch text-left outline-none",
          isFocused &&
            "group-focus-visible/asset-view:ring-2 group-focus-visible/asset-view:ring-ring",
          disabled && "cursor-not-allowed opacity-45",
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
            (!Number.isFinite(row.durationSec) ||
              (row.durationSec ?? 0) <= 0) && (
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
        className={cn(
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
        t={translate}
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
function GridView({
  rows,
  leadingAction,
  selected,
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
    for (let index = 0; index < slots.length; index += gridColumnCount) {
      groupedRows.push(slots.slice(index, index + gridColumnCount));
    }
    return groupedRows;
  }, [rows, leadingAction, gridColumnCount]);
  const gridVirtualizer = useVirtualizer({
    count: gridRows.length,
    getScrollElement: () => scrollEl,
    estimateSize: () =>
      estimateGridRowSize(
        scrollEl?.clientWidth || ASSET_VIEW_INITIAL_RECT.width,
        gridColumnCount,
      ),
    measureElement: (element) => element.getBoundingClientRect().height,
    getItemKey: (index) => gridRows[index]?.[0]?.rowKey ?? "upload-action",
    overscan: GRID_OVERSCAN_ROWS,
    paddingStart: 8,
    paddingEnd: 8,
    initialRect: ASSET_VIEW_INITIAL_RECT,
    enabled: shouldVirtualize,
  });
  const scrollAssetAtIndex = reactExports.useCallback(
    (index) => {
      if (shouldVirtualize) {
        gridVirtualizer.scrollToIndex(
          Math.floor((index + leadingCount) / gridColumnCount),
          {
            align: "auto",
          },
        );
        return;
      }
      scrollEl
        ?.querySelector(`[data-asset-index="${index}"]`)
        ?.scrollIntoView?.({
          block: "nearest",
        });
    },
    [
      gridVirtualizer,
      shouldVirtualize,
      gridColumnCount,
      leadingCount,
      scrollEl,
    ],
  );
  reactExports.useEffect(() => {
    scrollAssetRef.current = scrollAssetAtIndex;
    return () => {
      if (scrollAssetRef.current === scrollAssetAtIndex)
        scrollAssetRef.current = () => {};
    };
  }, [scrollAssetAtIndex, scrollAssetRef]);
  if (!shouldVirtualize) {
    return (
      <div
        className={cn(
          "grid gap-2 py-2 pl-2 pr-3",
          gridColumnCount === GRID_COLUMN_COUNT_WIDE
            ? "grid-cols-5"
            : "grid-cols-4",
        )}
        data-grid-columns={gridColumnCount}
        data-grid-row-gap="8"
      >
        {leadingAction}
        {rows.map((row, index) => (
          <GridTile
            key={row.rowKey}
            row={row}
            assetIndex={index}
            totalSize={rows.length}
            isFocused={focusedIndex === index}
            onFocusedRowChange={onFocusedRowChange}
            optionIdPrefix={optionIdPrefix}
            selected={selected}
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
            className={cn(
              "absolute left-0 top-0 grid w-full gap-x-2 pb-2 pl-2 pr-3",
              gridColumnCount === GRID_COLUMN_COUNT_WIDE
                ? "grid-cols-5"
                : "grid-cols-4",
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
              const assetIndex =
                virtualRow.index * gridColumnCount + itemIndex - leadingCount;
              return (
                <GridTile
                  key={item.rowKey}
                  row={item}
                  assetIndex={assetIndex}
                  totalSize={rows.length}
                  isFocused={focusedIndex === assetIndex}
                  onFocusedRowChange={onFocusedRowChange}
                  optionIdPrefix={optionIdPrefix}
                  selected={selected}
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
function ListRow({
  row,
  assetIndex,
  totalSize,
  isFocused,
  onFocusedRowChange,
  optionIdPrefix,
  selected,
  selectionOrderByKey,
  onToggle,
  reasonForRow,
  labelForReason,
  isRowExisting,
  onPreview,
}) {
  const { t: translate } = useTranslation();
  const sel = selected.has(row.rowKey);
  const selectionOrder = selectionOrderByKey.get(row.rowKey);
  const existing = isRowExisting(row);
  const reason = reasonForRow(row);
  const disabled = existing || (!!reason && !sel);
  return (
    <div
      onPointerMove={() => onFocusedRowChange(row.rowKey)}
      aria-disabled={disabled || void 0}
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
        className={cn(
          "relative flex h-14 items-center rounded-md border border-transparent",
          !sel && !disabled && "hover:bg-muted/60",
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
          disabled={disabled}
          tabIndex={-1}
          data-asset-index={assetIndex}
          data-marquee-start="true"
          aria-label={
            existing ? translate("assetPicker.existing", "已添加") : row.name
          }
          className={cn(
            "flex h-full min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 text-left outline-none",
            disabled && "cursor-not-allowed opacity-45",
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
                <AssetTypeBadge
                  resource={row}
                  compact={true}
                  className="bottom-1 left-1"
                />
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
            <ExistingStatusTag label={translate("assetPicker.existing", "已添加")} />
          ) : (
            reason &&
            reason !== "full" && (
              <ProblemStatusTag label={labelForReason(reason)} />
            )
          )}
          <span className="text-muted-foreground">
            {translate(`assetPicker.typeFilter.${row.type}`, row.type)}
          </span>
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center">
            <SelectionOrderBadge order={selectionOrder} />
          </span>
        </div>
      </div>
    </div>
  );
}
function ListView({
  rows,
  leadingAction,
  selected,
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
    estimateSize: (index) =>
      LIST_ROW_ESTIMATE_PX + (leadingCount && index === 0 ? 8 : 0),
    getItemKey: (index) =>
      rows[index - leadingCount]?.rowKey ?? "upload-action",
    overscan: LIST_OVERSCAN_ROWS,
    paddingStart: 8,
    paddingEnd: 8,
    initialRect: ASSET_VIEW_INITIAL_RECT,
    enabled: shouldVirtualize,
  });
  const scrollAssetAtIndex = reactExports.useCallback(
    (index) => {
      if (shouldVirtualize) {
        listVirtualizer.scrollToIndex(index + leadingCount, {
          align: "auto",
        });
        return;
      }
      scrollEl
        ?.querySelector(`[data-asset-index="${index}"]`)
        ?.scrollIntoView?.({
          block: "nearest",
        });
    },
    [listVirtualizer, shouldVirtualize, leadingCount, scrollEl],
  );
  reactExports.useEffect(() => {
    scrollAssetRef.current = scrollAssetAtIndex;
    return () => {
      if (scrollAssetRef.current === scrollAssetAtIndex)
        scrollAssetRef.current = () => {};
    };
  }, [scrollAssetAtIndex, scrollAssetRef]);
  if (!shouldVirtualize) {
    return (
      <ul className="py-2 pl-2 pr-3">
        {leadingAction && <li className="pb-2">{leadingAction}</li>}
        {rows.map((row, index) => (
          <li key={row.rowKey}>
            <ListRow
              row={row}
              assetIndex={index}
              totalSize={rows.length}
              isFocused={focusedIndex === index}
              onFocusedRowChange={onFocusedRowChange}
              optionIdPrefix={optionIdPrefix}
              selected={selected}
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
                selected={selected}
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
export function ScrollableAssetView({
  rows,
  view,
  multiple,
  leadingAction,
  selected,
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
  const [gridColumnCount, setGridColumnCount] = reactExports.useState(
    GRID_COLUMN_COUNT_WIDE,
  );
  const selectionOrderByKey = reactExports.useMemo(
    () =>
      new Map(
        Array.from(selected.keys(), (rowKey, index) => [rowKey, index + 1]),
      ),
    [selected],
  );
  const rectangle = useMarqueeSelection({
    scrollEl,
    enabled: multiple,
    rows,
    view,
    selected,
    canAddSelection,
    onSelectionChange,
  });
  const [activeRowKey, setActiveRowKey] = reactExports.useState(
    () => rows[0]?.rowKey ?? "",
  );
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
    rows.length > 0
      ? assetOptionId(optionIdPrefix, resolvedActiveRowKey)
      : void 0;
  reactExports.useEffect(() => {
    if (!scrollEl) return;
    if (view !== "grid" && view !== "list") return;
    scrollEl.scrollTo?.({
      top: 0,
    });
  }, [scrollEl, view]);
  reactExports.useEffect(() => {
    if (rows.some((row) => row.rowKey === activeRowKey)) return;
    setActiveRowKey(rows[0]?.rowKey ?? "");
  }, [activeRowKey, rows]);
  reactExports.useEffect(() => {
    if (
      !scrollEl ||
      rows.length === 0 ||
      !activeOptionId ||
      keyboardNavigationRef.current
    )
      return;
    const activeOption = document.getElementById(activeOptionId);
    if (activeOption && scrollEl.contains(activeOption)) return;
    const mountedRowKey =
      scrollEl.querySelector('[role="option"]')?.dataset.assetRowKey;
    if (mountedRowKey) setActiveRowKey(mountedRowKey);
  }, [activeOptionId, rows, scrollEl]);
  reactExports.useEffect(() => {
    if (!scrollEl) return;
    const onScroll = () => {
      if (scrollFrameRef.current !== null) return;
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        const activeOption = activeOptionId
          ? document.getElementById(activeOptionId)
          : null;
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
        width >= GRID_FIVE_COLUMN_MIN_WIDTH_PX
          ? GRID_COLUMN_COUNT_WIDE
          : GRID_COLUMN_COUNT_NARROW,
      );
    };
    syncColumnCount(scrollEl.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) =>
      syncColumnCount(entry.contentRect.width),
    );
    observer.observe(scrollEl);
    return () => observer.disconnect();
  }, [scrollEl]);
  const handleAssetKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      const activeRow = rows[focusedIndex];
      if (!activeRow) return;
      event.preventDefault();
      const disabled =
        isRowExisting(activeRow) ||
        (!!reasonForRow(activeRow) && !selected.has(activeRow.rowKey));
      if (!disabled) onToggle(activeRow);
      return;
    }
    const nextIndex = assetNavigationIndex(
      event.key,
      focusedIndex,
      rows.length,
      view,
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
      className={cn(
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
      {view === "grid" ? (
        <GridView
          rows={rows}
          leadingAction={leadingAction}
          selected={selected}
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
          selected={selected}
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
        <div
          className="pointer-events-none absolute inset-0"
          data-asset-picker-empty-region={true}
        >
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
