// asset-picker-dialog.jsx
import { inferMediaKind } from "../infra/media-lineage.js";
import { measurePerf } from "../infra/perf-log.js";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, LayoutGrid, LayoutList, Loader2, MonitorUp, Search, X$7 as CloseIcon } from "../media-editing/lucide-icon-wraps.js";
import { MenuPopup, MenuPortal, MenuPositioner } from "../infra/base-ui.js";
import { dedupedToast, useAssetMetadataStore } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ScrollableAssetView } from "./scrollable-asset-view.jsx";
import { PageStateBoundary } from "./page-state-boundary.jsx";
import {
  boundedCount,
  bucketItemCount,
  elapsedMs,
  MAX_MOUNTED_ITEMS,
} from "../canvas/bucket-item-count.js";
import {
  PERF_ASSET_PICKER_OPEN_FIRST_PAINT,
  PERF_ASSET_PICKER_OPEN_INTERACTIVE,
} from "../generation/to-workspace-browser-url.js";
import { DropdownMenu } from "../vendor-inline/vscode-base/graph.jsx";
import { FolderOpen, Upload } from "../media-editing/package.jsx";
import {
  Button,
  mergeTailwindClasses as cn,
  Dialog,
  DialogContent,
  DialogFooter,
} from "../infra/dialog-content.jsx";
import {
  ActionDropdownMenuItem,
  ActionMenuPanel,
} from "../workspace/context-menu-content.jsx";
import {
  finitePositive,
  formatExceededDuration,
  formatImageMinDimensionLimit,
  formatSeconds,
  normaliseAssetType,
  TAG_FILTER_ALL,
  tagLabel,
  TYPE_FILTER_ALL,
  VIEW_STORAGE_KEY,
} from "./preview-media.jsx";
import {
  ALL_MEDIA_FILE_ACCEPT,
  MEDIA_FILE_ACCEPT,
} from "../text-editor/build-asr-gateway-request.js";
import { isSubtitleFileName } from "../canvas/is-reexecutable-generation-node.js";
import { isCanvasColorTag } from "../infra/parse-connector-selection.js";
import { getCanvasTagPresentationColor } from "./inline-input.jsx";
import { useFullscreenContainerEl } from "../infra/use-plugin-metadata-store.js";
import { useGatewayFetch } from "../generation/use-model-catalog-scope-key.js";
import { Badge, DialogTitle } from "../infra/badge-variants.jsx";
import { Checkbox } from "../infra/checkbox.jsx";
import { Input3 as Input } from "../infra/select-content.jsx";
import { MediaLightbox } from "./text-preview.jsx";
import { SegmentedSwitch } from "../canvas/popover-title.jsx";
import { getImageConstraintReason } from "../generation/attachment-bar.jsx";
import { loadAssetFpsBatch } from "../canvas/load-asset-fps-batch.js";
import { selectionSummary } from "../canvas/selection-summary.js";
function createAssetPickerPerfSession({
  openedAt = performance.now(),
  now = () => performance.now(),
  totalItems,
  view,
}) {
  let phase = "opened";
  let mountedItems = 0;
  let firstPaintMs;
  let interactiveMs;
  const snapshot = () => ({
    phase,
    view,
    totalItemsBucket: bucketItemCount(totalItems),
    mountedItems,
    ...(firstPaintMs === void 0
      ? {}
      : {
          firstPaintMs,
        }),
    ...(interactiveMs === void 0
      ? {}
      : {
          interactiveMs,
        }),
  });
  return {
    markFirstPaint() {
      if (firstPaintMs !== void 0) return;
      firstPaintMs = elapsedMs(openedAt, now());
      phase = "first-paint";
      measurePerf(PERF_ASSET_PICKER_OPEN_FIRST_PAINT, openedAt, snapshot());
    },
    markInteractive() {
      if (interactiveMs !== void 0) return;
      interactiveMs = elapsedMs(openedAt, now());
      phase = "interactive";
      measurePerf(PERF_ASSET_PICKER_OPEN_INTERACTIVE, openedAt, snapshot());
    },
    recordMountedItems(count) {
      mountedItems = boundedCount(count, MAX_MOUNTED_ITEMS);
    },
    snapshot,
  };
}
function getAssetSourceAvailability(status, reasons) {
  if (reasons.some((reason) => reason === void 0)) return "available";
  if (status === "error") return "error";
  if (
    status === "loading" ||
    reasons.some(
      (reason) =>
        reason === "media-metadata-pending" || reason === "video-fps-pending",
    )
  )
    return "pending";
  return "empty";
}
function AssetSourceMenu({
  anchor,
  preferredSide = "bottom",
  appearance = "canvas",
  availability,
  onCanvas,
  onLocal,
  onCancel,
}) {
  const { t: translate } = useTranslation();
  const [open, setOpen] = reactExports.useState(true);
  const pendingActionRef = reactExports.useRef(null);
  function closeWithAction(action) {
    if (pendingActionRef.current) return;
    pendingActionRef.current = action;
    setOpen(false);
  }
  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen, details) => {
        if (!nextOpen && details.reason !== "item-press")
          closeWithAction(onCancel);
      }}
      onOpenChangeComplete={(nextOpen) => {
        if (nextOpen) return;
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        action?.();
      }}
    >
      <MenuPortal>
        <MenuPositioner
          anchor={anchor}
          side={preferredSide}
          collisionAvoidance={{
            side: "flip",
            align: "shift",
            fallbackAxisSide: "none",
          }}
          collisionPadding={8}
          align={preferredSide === "top" ? "center" : "start"}
          sideOffset={8}
          className="z-10002"
        >
          <ActionMenuPanel
            appearance={appearance}
            className={`w-60 max-w-[calc(100vw-1rem)] [--action-list-item-height:38px] [--action-list-item-padding:9px_12px] [--action-list-item-radius:8px] [--action-list-row-gap:4px] ${preferredSide === "top" ? "data-[side=top]:origin-bottom data-[side=bottom]:origin-top" : ""}`}
            render={
              <MenuPopup
                className={cn(
                  "origin-(--transform-origin) outline-none",
                  "dp-motion-quick-zoom",
                )}
                finalFocus={() => anchor}
              />
            }
            data-action-ui-id="asset-source.menu"
          >
            {availability !== "empty" && (
              <ActionDropdownMenuItem
                disabled={availability !== "available"}
                data-action-ui-id="asset-source.canvas"
                onClick={() => closeWithAction(onCanvas)}
              >
                <FolderOpen
                  className="size-4"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {availability === "pending"
                  ? translate("assetPicker.source.loading", "正在检查可选资源…")
                  : availability === "error"
                    ? translate("assetPicker.source.error", "资源暂不可用")
                    : translate("assetPicker.source.task", "当前任务文件中选择")}
              </ActionDropdownMenuItem>
            )}
            <ActionDropdownMenuItem
              data-action-ui-id="asset-source.local"
              onClick={() => closeWithAction(onLocal)}
            >
              <MonitorUp
                className="size-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              {translate("assetPicker.source.local", "本地上传")}
            </ActionDropdownMenuItem>
          </ActionMenuPanel>
        </MenuPositioner>
      </MenuPortal>
    </DropdownMenu>
  );
}
function AssetList({
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
  emptyTitle,
  emptyDescription,
  onClearFilters,
}) {
  const { t: translate } = useTranslation();
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
                    label: translate("assetPicker.filter.clear", "清除筛选"),
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
      view={view}
      multiple={multiple}
      leadingAction={leadingAction}
      selected={selected}
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
const VIDEO_BUDGET_REASON_PREFIX = "video-budget:";
const VIDEO_FPS_REASON_PREFIX = "video-fps:";
const VIDEO_FPS_PENDING_REASON = "video-fps-pending";
const MEDIA_METADATA_PENDING_REASON = "media-metadata-pending";
const DEFAULT_TABS = ["canvas", "upload"];
const EMPTY_SELECTION = new Map();
const ALL_TYPE_FILTERS = [
  "image",
  "video",
  "audio",
  "text",
  "subtitle",
  "file",
];
function computeSelectionTotals(selection) {
  const counts = {
    image: 0,
    video: 0,
    audio: 0,
  };
  const sec = {
    audio: 0,
    video: 0,
  };
  selection.forEach((res) => {
    if (res.type === "image" || res.type === "video" || res.type === "audio") {
      counts[res.type] += 1;
    }
    const durationSeconds =
      typeof res.durationSec === "number" && res.durationSec > 0
        ? res.durationSec
        : 0;
    if (res.type === "audio") sec.audio += durationSeconds;
    if (res.type === "video") sec.video += durationSeconds;
  });
  return {
    counts,
    sec,
  };
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
  active,
  onClick,
  children,
  count,
  actionId,
  icon,
  countKind = "type",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={typeof children === "string" ? children : void 0}
      aria-pressed={active}
      data-action-ui-id={actionId}
      className={cn(
        "flex h-8 w-full items-center justify-between gap-2 rounded-md px-2.5 text-left text-xs transition-colors",
        active
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{children}</span>
      </span>
      <span
        className="shrink-0 tabular-nums text-muted-foreground/40"
        data-type-count={countKind === "type" ? "" : void 0}
        data-tag-count={countKind === "tag" ? "" : void 0}
      >
        {count}
      </span>
    </button>
  );
}
function mediaLightboxKindForAsset(type) {
  return type === "subtitle" ? "text" : type;
}
function UploadEntry({ view, busy, error, onClick }) {
  const { t: translate } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      data-action-ui-id="asset-picker.upload.pick"
      aria-label={translate("assetPicker.upload.action", "本地上传")}
      aria-busy={busy}
      className={cn(
        "relative flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-foreground/30 bg-muted/30 text-xs text-foreground hover:border-foreground/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait",
        view === "grid" ? "h-full flex-col" : "h-14 px-3",
      )}
    >
      {view === "grid" && (
        <span
          aria-hidden={true}
          className="invisible block aspect-3/2 w-full shrink-0"
        />
      )}
      {view === "grid" && (
        <span aria-hidden={true} className="invisible block h-12 shrink-0" />
      )}
      <span
        className={cn(
          "flex items-center justify-center gap-2",
          view === "grid" && "absolute inset-0 flex-col",
        )}
      >
        {busy ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Upload className="size-5" strokeWidth={1.5} />
        )}
        <span>
          {busy
            ? translate("assetPicker.upload.uploading", "上传中…")
            : translate("assetPicker.upload.action", "本地上传")}
        </span>
        {error && (
          <span
            role="alert"
            className="max-w-full truncate px-2 text-destructive"
            title={error}
          >
            {translate("assetPicker.upload.failed", "上传失败")}
          </span>
        )}
      </span>
    </button>
  );
}
function disabledReasonLabel(reason, translate, constraints) {
  if (reason.startsWith(VIDEO_BUDGET_REASON_PREFIX)) {
    const excessSec = Number(reason.slice(VIDEO_BUDGET_REASON_PREFIX.length));
    if (Number.isFinite(excessSec) && excessSec > 0) {
      return translate(
        "assetPicker.disabledReason.videoBudgetExceeded",
        "超出 {{duration}}",
        {
          duration: formatExceededDuration(excessSec),
        },
      );
    }
  }
  if (reason.startsWith(VIDEO_FPS_REASON_PREFIX)) {
    const fps = Number(reason.slice(VIDEO_FPS_REASON_PREFIX.length));
    const min = constraints?.videoMinFps;
    const max = constraints?.videoMaxFps;
    if (max !== void 0 && Number.isFinite(fps) && fps > max) {
      return translate(
        "assetPicker.disabledReason.videoFpsOverMax",
        "帧率超 {{max}}fps",
        {
          max,
        },
      );
    }
    if (min !== void 0 && Number.isFinite(fps) && fps < min) {
      return translate(
        "assetPicker.disabledReason.videoFpsUnderMin",
        "帧率低于 {{min}}fps",
        {
          min,
        },
      );
    }
    return translate(
      "assetPicker.disabledReason.videoFps",
      "帧率需 {{min}}-{{max}}fps",
      {
        min: min ?? 0,
        max: max ?? 0,
      },
    );
  }
  if (reason === VIDEO_FPS_PENDING_REASON) {
    return translate("assetPicker.disabledReason.videoFpsPending", "正在检测帧率…");
  }
  switch (reason) {
    case "type-not-allowed":
      return translate("assetPicker.disabledReason.typeNotAllowed", "当前入口不支持");
    case "full":
      return translate("assetPicker.disabledReason.full", "已达上限");
    case "image-size":
      return translate("assetPicker.disabledReason.imageSize", "Min {{min}}", {
        min: formatImageMinDimensionLimit(constraints),
      });
    case "image-aspect":
      return translate("assetPicker.disabledReason.imageAspect", "Ratio out of range");
    case "audio-range":
      return translate(
        "assetPicker.disabledReason.audioRange",
        "需 {{min}}-{{max}}s",
        {
          min: formatSeconds(constraints?.audioPerClipMinSec, "—"),
          max: formatSeconds(constraints?.audioPerClipMaxSec, "—"),
        },
      );
    case "audio-too-short":
      return translate("assetPicker.disabledReason.audioTooShort", "音频过短");
    case "audio-too-long":
      return translate("assetPicker.disabledReason.audioTooLong", "音频过长");
    case "audio-budget":
      return translate("assetPicker.disabledReason.audioBudget", "总音频超 {{max}}s", {
        max: formatSeconds(constraints?.remainingAudioTotalSec, "—"),
      });
    case "video-budget":
      return translate("assetPicker.disabledReason.videoBudget", "总视频超 {{max}}s", {
        max: formatSeconds(constraints?.remainingVideoTotalSec, "—"),
      });
    case "video-too-short":
      return translate("assetPicker.disabledReason.videoTooShort", "视频过短");
    case "video-too-long":
      return translate("assetPicker.disabledReason.videoTooLong", "视频过长");
    case MEDIA_METADATA_PENDING_REASON:
      return translate("assetPicker.disabledReason.metadataPending", "信息待确认");
    default:
      return "";
  }
}
function buildRows(
  assets,
  allowedTypes,
  resolveCanvasNodeId,
  tagColorResolver,
  tagRegistry,
  translate,
) {
  const allowed = new Set(allowedTypes);
  const seenPaths = new Set();
  const seenRefs = new WeakSet();
  const out = [];
  assets.forEach((meta, key) => {
    const type = normaliseAssetType(meta.type, meta.path || meta.name);
    if (allowed.size > 0 && !allowed.has(type)) return;
    if (meta.path) {
      if (seenPaths.has(meta.path)) return;
      seenPaths.add(meta.path);
    } else {
      if (seenRefs.has(meta)) return;
      seenRefs.add(meta);
    }
    const nodeId =
      (meta.path ? resolveCanvasNodeId?.(meta.path) : void 0) ?? key;
    const resolvedTag = tagColorResolver?.(meta.tagIds)[0];
    const tagNames = (meta.tagIds ?? [])
      .map((tagId) => tagRegistry?.tags.find((tag) => tag.id === tagId))
      .filter((tag) => Boolean(tag))
      .map((tag) => (translate ? tagLabel(tag, translate) : (tag.name ?? tag.id)));
    out.push({
      rowKey: key,
      nodeId,
      assetId: key,
      type,
      name: meta.name,
      url: meta.url,
      path: meta.path,
      ...(meta.width !== void 0 && {
        width: meta.width,
      }),
      ...(meta.height !== void 0 && {
        height: meta.height,
      }),
      ...(meta.durationSec !== void 0 && {
        durationSec: meta.durationSec,
      }),
      ...(meta.fileSize !== void 0 && {
        fileSize: meta.fileSize,
      }),
      ...(meta.tagIds !== void 0 && {
        tagIds: meta.tagIds,
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
  out.sort((leftRow, rightRow) => leftRow.name.localeCompare(rightRow.name));
  return out;
}
function arrangeRowsWithSessionUploads(canvasRows, uploadedRows, allowedTypes) {
  if (uploadedRows.length === 0) return canvasRows;
  const allowed = new Set(allowedTypes);
  const canvasByAssetId = new Map(canvasRows.map((row) => [row.assetId, row]));
  const canvasByPath = new Map(
    canvasRows
      .filter((row) => row.path.length > 0)
      .map((row) => [row.path, row]),
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
      !uploadedAssetIds.has(row.assetId) &&
      !(row.path.length > 0 && uploadedPaths.has(row.path)),
  );
  return [...uploadsFirst, ...remainingCanvasRows];
}
function applyFilters(rows, query, typeFilter, tagFilter) {
  const normalizedQuery = query.trim().toLowerCase();
  if (
    normalizedQuery.length === 0 &&
    typeFilter === TYPE_FILTER_ALL &&
    tagFilter === TAG_FILTER_ALL
  )
    return rows;
  return rows.filter((row) => {
    if (typeFilter !== TYPE_FILTER_ALL && row.type !== typeFilter) return false;
    if (tagFilter !== TAG_FILTER_ALL && !row.tagIds?.includes(tagFilter))
      return false;
    if (
      normalizedQuery.length > 0 &&
      !row.name.toLowerCase().includes(normalizedQuery) &&
      !row.tagNames?.some((tagName) => tagName.toLowerCase().includes(normalizedQuery))
    )
      return false;
    return true;
  });
}
function normaliseTypeFilter(raw) {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}
function stripRowKey(row) {
  const {
    rowKey: _rowKey,
    tag: _tag,
    tagIds: _tagIds,
    tagNames: _tagNames,
    ...rest
  } = row;
  return rest;
}
function resourceToRow(resource, rowKey = resource.assetId) {
  return {
    ...resource,
    rowKey,
  };
}
function deriveAccept(types) {
  if (types.length === 0) return ALL_MEDIA_FILE_ACCEPT;
  const parts = [];
  for (const mediaType of types) {
    const accept = MEDIA_FILE_ACCEPT[mediaType];
    if (!accept) return ALL_MEDIA_FILE_ACCEPT;
    parts.push(accept);
  }
  return parts.join(",");
}
function inferType(file) {
  if (isSubtitleFileName(file.name)) return "subtitle";
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot) : "";
  const detected = inferMediaKind(file.type, ext);
  return detected;
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
  const { t: translate } = useTranslation();
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
  async function handleChange(changeEvent) {
    const files = Array.from(changeEvent.target.files ?? []);
    changeEvent.target.value = "";
    if (files.length === 0 || busyRef.current) return;
    const epoch = epochRef.current;
    busyRef.current = true;
    setBusy(true);
    setLastError(null);
    const resources = [];
    try {
      for (const file of files) {
        if (epoch !== epochRef.current) break;
        const type = inferType(file);
        if (allowedTypes.length > 0 && !allowedTypes.includes(type)) {
          dedupedToast.error(
            translate(
              "assetPicker.upload.typeRejected",
              "{{name}} 类型不在允许范围内",
              {
                name: file.name,
              },
            ),
          );
          continue;
        }
        const res =
          uploadMode === "attach" && onUploadAttachment
            ? await onUploadAttachment(file)
            : await onUploadAndInsert(file, type);
        if (epoch === epochRef.current) {
          resources.push(res);
          onUploaded(res);
        }
      }
    } catch (err) {
      if (epoch !== epochRef.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(msg);
      dedupedToast.error(
        `${translate("assetPicker.upload.failed", "上传失败")}: ${msg}`,
      );
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
function readStoredView() {
  if (typeof window === "undefined") return "grid";
  try {
    const storedViewMode = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return storedViewMode === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}
function writeStoredView(next) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  } catch {}
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
  const { t: translate } = useTranslation();
  const gatewayFetch = useGatewayFetch();
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
  const filter = request?.opts ?? null;
  const multiple = filter?.multiple ?? false;
  const maxCount = !multiple
    ? 1
    : typeof filter?.maxCount === "number" && filter.maxCount > 0
      ? filter.maxCount
      : void 0;
  const minCount =
    multiple && typeof filter?.minCount === "number" && filter.minCount > 0
      ? filter.minCount
      : void 0;
  const uploadMode = filter?.uploadMode ?? "insert-node";
  const existingAssetIds = reactExports.useMemo(
    () => new Set(filter?.existingAssetIds ?? []),
    [filter?.existingAssetIds],
  );
  const constraints = filter?.constraints;
  const fpsBounded =
    constraints?.videoMinFps !== void 0 ||
    constraints?.videoMaxFps !== void 0;
  const requestedTabs = filter?.tabs?.length ? filter.tabs : DEFAULT_TABS;
  const uploadEnabled = requestedTabs.includes("upload");
  const canvasEnabled =
    requestedTabs.includes("canvas") || requestedTabs.includes("upstream");
  const assets = useAssetMetadataStore((storeState) => storeState.assets);
  const fullscreenContainerEl = useFullscreenContainerEl();
  const [selected, setSelected] = reactExports.useState(new Map());
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
  const [view, setView] = reactExports.useState(readStoredView);
  const [videoFpsMap, setVideoFpsMap] = reactExports.useState(new Map());
  const videoFpsMapRef = reactExports.useRef(videoFpsMap);
  videoFpsMapRef.current = videoFpsMap;
  const fpsInFlightIdsRef = reactExports.useRef(new Map());
  const fpsBatchControllersRef = reactExports.useRef(new Set());
  const perfSessionRef = reactExports.useRef(null);
  const perfInputsRef = reactExports.useRef({
    totalItems: 0,
    view,
  });
  const allowedTypes = reactExports.useMemo(
    () => normaliseTypeFilter(filter?.type),
    [filter?.type],
  );
  const visibleTypes =
    allowedTypes.length > 0 ? allowedTypes : ALL_TYPE_FILTERS;
  const uploadTypes = reactExports.useMemo(
    () =>
      typeFilter === TYPE_FILTER_ALL
        ? allowedTypes
        : visibleTypes.filter((type) => type === typeFilter),
    [allowedTypes, typeFilter, visibleTypes],
  );
  const uploadAccept = reactExports.useMemo(
    () => deriveAccept(uploadTypes),
    [uploadTypes],
  );
  const canvasMemberRows = reactExports.useMemo(
    () =>
      buildRows(
        assets,
        allowedTypes,
        canvasEnabled ? resolveCanvasNodeId : void 0,
        tagColorResolver,
        tagRegistry,
        translate,
      ),
    [
      assets,
      allowedTypes,
      canvasEnabled,
      resolveCanvasNodeId,
      tagColorResolver,
      tagRegistry,
      translate,
    ],
  );
  perfInputsRef.current = {
    totalItems: canvasMemberRows.length,
    view,
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
        arrangeRowsWithSessionUploads(
          canvasMemberRows,
          uploadedRows,
          allowedTypes,
        ),
        query,
        typeFilter,
        tagFilter,
      ),
    [
      allowedTypes,
      canvasMemberRows,
      query,
      tagFilter,
      typeFilter,
      uploadedRows,
    ],
  );
  const typeCounts = reactExports.useMemo(() => {
    const candidates = applyFilters(
      canvasMemberRows,
      query,
      TYPE_FILTER_ALL,
      tagFilter,
    );
    return {
      total: candidates.length,
      byType: new Map(
        ALL_TYPE_FILTERS.map((type) => [
          type,
          candidates.filter((row) => row.type === type).length,
        ]),
      ),
    };
  }, [canvasMemberRows, query, tagFilter]);
  const tagCounts = reactExports.useMemo(() => {
    const candidates = applyFilters(
      canvasMemberRows,
      query,
      typeFilter,
      TAG_FILTER_ALL,
    );
    const byTag = new Map();
    for (const row of candidates) {
      for (const tagId of new Set(row.tagIds))
        byTag.set(tagId, (byTag.get(tagId) ?? 0) + 1);
    }
    return byTag;
  }, [canvasMemberRows, query, typeFilter]);
  const fpsAssetIdsKey = reactExports.useMemo(() => {
    if (!fpsBounded) return "";
    const ids = new Set();
    for (const row of [...canvasMemberRows, ...pendingUploadRows]) {
      if (row.type === "video" && row.assetId) ids.add(row.assetId);
    }
    return [...ids].sort().map(encodeURIComponent).join("&");
  }, [canvasMemberRows, fpsBounded, pendingUploadRows]);
  reactExports.useEffect(() => {
    if (!open) {
      fpsInFlightIdsRef.current.clear();
      for (const controller of fpsBatchControllersRef.current)
        controller.abort();
      fpsBatchControllersRef.current.clear();
      return;
    }
    return () => {
      fpsInFlightIdsRef.current.clear();
      for (const controller of fpsBatchControllersRef.current)
        controller.abort();
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
      const dialog = document.querySelector(
        '[data-action-ui-id="asset-picker.dialog"]',
      );
      session.recordMountedItems(
        dialog?.querySelectorAll("[data-asset-index]").length ?? 0,
      );
      session.markFirstPaint();
      interactiveFrame = window.requestAnimationFrame(() => {
        if (perfSessionRef.current === session) session.markInteractive();
      });
    });
    return () => {
      window.cancelAnimationFrame(firstPaintFrame);
      if (interactiveFrame !== void 0)
        window.cancelAnimationFrame(interactiveFrame);
      if (perfSessionRef.current === session) perfSessionRef.current = null;
    };
  }, [request, sourceStep]);
  reactExports.useEffect(() => {
    if (!open || !fpsBounded) {
      return;
    }
    const assetIds = fpsAssetIdsKey
      ? fpsAssetIdsKey.split("&").map(decodeURIComponent)
      : [];
    const missing = assetIds.filter(
      (assetId) =>
        !videoFpsMapRef.current.has(assetId) && !fpsInFlightIdsRef.current.has(assetId),
    );
    if (missing.length === 0) return;
    const controller = new AbortController();
    fpsBatchControllersRef.current.add(controller);
    for (const assetId of missing) fpsInFlightIdsRef.current.set(assetId, controller);
    void loadAssetFpsBatch(missing, gatewayFetch, controller.signal)
      .then((entries) => {
        if (controller.signal.aborted) return;
        setVideoFpsMap((prev) => {
          const next = new Map(prev);
          for (const [assetId, fps] of entries) next.set(assetId, fps);
          return next;
        });
      })
      .finally(() => {
        fpsBatchControllersRef.current.delete(controller);
        for (const assetId of missing) {
          if (fpsInFlightIdsRef.current.get(assetId) === controller) {
            fpsInFlightIdsRef.current.delete(assetId);
          }
        }
      });
  }, [fpsAssetIdsKey, fpsBounded, gatewayFetch, open]);
  const selectionTotals = reactExports.useMemo(
    () => computeSelectionTotals(selected),
    [selected],
  );
  function resourceValidationReasonForRow(row) {
    if (
      (allowedTypes.length > 0 && !allowedTypes.includes(row.type)) ||
      (request?.source?.accepts && !request.source.accepts(row))
    )
      return "type-not-allowed";
    if (!constraints) return void 0;
    if (row.type === "text" || row.type === "subtitle" || row.type === "file")
      return void 0;
    if (row.type === "image") {
      if (
        (constraints.imageMinWidth !== void 0 ||
          constraints.imageMinHeight !== void 0 ||
          constraints.imageMaxWidth !== void 0 ||
          constraints.imageMaxHeight !== void 0 ||
          constraints.imageMaxPixels !== void 0 ||
          constraints.imageMinAspectRatio !== void 0 ||
          constraints.imageMaxAspectRatio !== void 0) &&
        (!(typeof row.width === "number") || !(typeof row.height === "number"))
      ) {
        return MEDIA_METADATA_PENDING_REASON;
      }
      return getImageConstraintReason(row, constraints);
    }
    const duration = finitePositive(row.durationSec);
    if (duration === void 0) return MEDIA_METADATA_PENDING_REASON;
    if (row.type === "audio") {
      if (duration < constraints.audioPerClipMinSec) return "audio-too-short";
      if (duration > constraints.audioPerClipMaxSec) return "audio-too-long";
      return void 0;
    }
    if (
      constraints.videoPerClipMinSec !== void 0 &&
      duration < constraints.videoPerClipMinSec
    ) {
      return "video-too-short";
    }
    if (
      constraints.videoPerClipMaxSec !== void 0 &&
      duration > constraints.videoPerClipMaxSec
    ) {
      return "video-too-long";
    }
    if (
      constraints.videoMinFps !== void 0 ||
      constraints.videoMaxFps !== void 0
    ) {
      const fps = videoFpsMapRef.current.get(row.assetId);
      if (fps === void 0) return VIDEO_FPS_PENDING_REASON;
      if (fps <= 0) return MEDIA_METADATA_PENDING_REASON;
      if (
        (constraints.videoMinFps !== void 0 &&
          fps < constraints.videoMinFps) ||
        (constraints.videoMaxFps !== void 0 && fps > constraints.videoMaxFps)
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
    if (
      maxCount !== void 0 &&
      currentSelected.size - (isSelected ? 1 : 0) >= maxCount
    )
      return "full";
    if (!constraints) return void 0;
    if (row.type === "text" || row.type === "subtitle" || row.type === "file")
      return void 0;
    const kind = row.type;
    let totals;
    if (isSelected && validateSelected) {
      const selectionWithoutRow = new Map(currentSelected);
      selectionWithoutRow.delete(selectionId);
      totals = computeSelectionTotals(selectionWithoutRow);
    } else {
      totals =
        currentSelected === selected
          ? selectionTotals
          : computeSelectionTotals(currentSelected);
    }
    const remaining = constraints.remainingByKind[kind] - totals.counts[kind];
    if (remaining <= 0) return "full";
    if (
      (kind === "video" || kind === "audio") &&
      constraints.remainingVideoAudio !== void 0 &&
      constraints.remainingVideoAudio -
        totals.counts.video -
        totals.counts.audio <=
        0
    ) {
      return "full";
    }
    if (validationReason) return validationReason;
    if (kind === "audio") {
      const durationSeconds = finitePositive(row.durationSec);
      if (constraints.remainingAudioTotalSec - totals.sec.audio - durationSeconds < 0) {
        return "audio-budget";
      }
    }
    if (kind === "video") {
      const durationSeconds = finitePositive(row.durationSec);
      if (constraints.remainingVideoTotalSec - totals.sec.video - durationSeconds < 0) {
        return `${VIDEO_BUDGET_REASON_PREFIX}${totals.sec.video + durationSeconds - constraints.remainingVideoTotalSec}`;
      }
    }
    return void 0;
  }
  function availabilityReasonForRow(row) {
    return reasonForRowWithSelection(row, EMPTY_SELECTION, true);
  }
  function reasonForRow(row) {
    const reason = reasonForRowWithSelection(row, selected, true);
    if (!reason) return void 0;
    return availabilityReasonForRow(row) ?? "full";
  }
  const sourceAvailability =
    request?.source && sourceStep === "source"
      ? getAssetSourceAvailability(
          sourceStatus,
          canvasMemberRows
            .filter((row) => !isRowExisting(row))
            .map(availabilityReasonForRow),
        )
      : "empty";
  const visibleRows = availableOnly
    ? allRows.filter(
        (row) =>
          !isRowExisting(row) && availabilityReasonForRow(row) === void 0,
      )
    : allRows;
  const marqueeSelection = {
    selected,
    canAddSelection: (row, selection) =>
      !isRowExisting(row) && !reasonForRowWithSelection(row, selection),
    onSelectionChange: (selection) => {
      setSelected((prev) =>
        prev.size === selection.size &&
        Array.from(selection).every(([rowKey, row]) => prev.get(rowKey) === row)
          ? prev
          : selection,
      );
    },
  };
  function isRowExisting(row) {
    return (
      existingAssetIds.has(row.assetId) ||
      !!request?.source?.existingPaths?.includes(row.path) ||
      [...existingAssetIds].some((assetId) => assets.get(assetId)?.path === row.path)
    );
  }
  function toggleRow(row) {
    if (isRowExisting(row)) return;
    setSelected((prev) => {
      const next = new Map(prev);
      if (multiple) {
        if (next.has(row.rowKey)) {
          next.delete(row.rowKey);
        } else if (maxCount !== void 0 && next.size >= maxCount) {
          return prev;
        } else if (reasonForRowWithSelection(row, prev)) {
          return prev;
        } else {
          next.set(row.rowKey, row);
        }
      } else {
        if (reasonForRowWithSelection(row, prev)) return prev;
        next.clear();
        if (!prev.has(row.rowKey)) {
          next.set(row.rowKey, row);
        }
      }
      return next;
    });
  }
  function selectRow(row) {
    if (isRowExisting(row)) return;
    setSelected((prev) => {
      if (prev.has(row.rowKey)) return prev;
      if (multiple && maxCount !== void 0 && prev.size >= maxCount) {
        dedupedToast.warning(
          translate("assetPicker.limitReached", "最多只能选 {{max}} 项", {
            max: maxCount,
          }),
        );
        return prev;
      }
      const reason = reasonForRowWithSelection(row, prev);
      if (reason) {
        dedupedToast.warning(disabledReasonLabel(reason, translate, constraints));
        return prev;
      }
      const next = new Map(prev);
      if (!multiple) next.clear();
      next.set(row.rowKey, row);
      return next;
    });
  }
  function cancel() {
    request?.resolve(null);
  }
  function selectionIssue(selection) {
    if (minCount !== void 0 && selection.size < minCount)
      return translate("assetPicker.confirmMin", "至少选 {{min}} 项", {
        min: minCount,
      });
    for (const [rowKey, resource] of selection) {
      const reason = reasonForRowWithSelection(
        resourceToRow(resource, rowKey),
        selection,
        true,
        rowKey,
      );
      if (reason) return disabledReasonLabel(reason, translate, constraints);
    }
    return void 0;
  }
  function confirm() {
    if (!request) return;
    const issue = selectionIssue(selected);
    if (issue) {
      dedupedToast.warning(issue);
      return;
    }
    request.resolve(Array.from(selected.values(), stripRowKey));
  }
  function handleUploaded(res) {
    setUploadedList((prev) =>
      prev.some((item) => item.assetId === res.assetId) ? prev : [...prev, res],
    );
    selectRow(resourceToRow(res));
  }
  function handleViewChange(next) {
    setView(next);
    writeStoredView(next);
  }
  const selectedRowsValid = Array.from(selected).every(
    ([rowKey, row]) => !reasonForRowWithSelection(row, selected, true, rowKey),
  );
  const meetsMin =
    selected.size > 0 &&
    (minCount === void 0 || selected.size >= minCount) &&
    selectedRowsValid;
  function onKeyDown(keyboardEvent) {
    if (keyboardEvent.key === "Enter" && meetsMin && keyboardEvent.target === keyboardEvent.currentTarget) {
      keyboardEvent.preventDefault();
      confirm();
    }
  }
  function handleEnterTagView(tagId) {
    setTagFilter(tagId);
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
      const entries = await loadAssetFpsBatch(
        resources.filter((resource) => resource.type === "video").map((resource) => resource.assetId),
        gatewayFetch,
        controller.signal,
      );
      fpsBatchControllersRef.current.delete(controller);
      if (controller.signal.aborted || requestRef.current !== activeRequest)
        return;
      for (const [assetId, fps] of entries) videoFpsMapRef.current.set(assetId, fps);
    }
    if (requestRef.current !== activeRequest) return;
    const accepted = new Map();
    for (const resource of resources) {
      const row = resourceToRow(resource);
      if (isRowExisting(row) || accepted.has(row.rowKey)) continue;
      const reason = reasonForRowWithSelection(row, accepted);
      if (reason)
        dedupedToast.warning(disabledReasonLabel(reason, translate, constraints));
      else accepted.set(row.rowKey, resource);
    }
    const issue = selectionIssue(accepted);
    if (issue) dedupedToast.warning(issue);
    activeRequest.resolve(
      !issue && accepted.size > 0 ? [...accepted.values()] : null,
    );
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
    if (sourceAvailability === "empty" && !sourceMenuShownRef.current)
      localSourceRef.current();
    else sourceMenuShownRef.current = true;
  }, [request, sourceAvailability, sourceStep]);
  const summary = selectionSummary(
    filter,
    selected.size,
    allowedTypes,
    translate,
    selectionTotals.counts,
  );
  const uploadAction =
    !tagView && uploadEnabled ? (
      <UploadEntry
        view={view}
        busy={upload.busy}
        error={upload.lastError}
        onClick={upload.pick}
      />
    ) : (
      void 0
    );
  const browser = (
    <Dialog
      open={open && sourceStep === "browser"}
      disablePointerDismissal={true}
      onOpenChange={(next) => {
        if (!next) cancel();
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
            <DialogTitle className="sr-only">
              {translate("assetPicker.title", "选择资源")}
            </DialogTitle>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={translate("assetPicker.searchPlaceholder", "搜索资源…")}
              startIcon={<Search className="size-3.5" />}
              className="h-8 shrink-0 text-xs"
              data-action-ui-id="asset-picker.search"
            />
            <div className="shrink-0 space-y-0.5">
              <SidebarFilterButton
                active={typeFilter === TYPE_FILTER_ALL}
                onClick={
                  tagView
                    ? handleExitTagView
                    : () => setTypeFilter(TYPE_FILTER_ALL)
                }
                count={typeCounts.total}
                actionId="asset-picker.type.all"
              >
                {translate("assetPicker.typeFilter.all", "全部")}
              </SidebarFilterButton>
              {visibleTypes.map((type) => (
                <SidebarFilterButton
                  key={type}
                  active={typeFilter === type}
                  onClick={() => setTypeFilter(type)}
                  count={typeCounts.byType.get(type) ?? 0}
                  actionId={`asset-picker.type.${type}`}
                >
                  {translate(`assetPicker.typeFilter.${type}`, type.toUpperCase())}
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
                  <span>{translate("assetFilter.tagSection", "标签")}</span>
                  <ChevronDown
                    className={cn(
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
                        {tagLabel(tag, translate)}
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
            <div
              className="flex h-16 shrink-0 items-center px-6"
              data-marquee-blank-origin={true}
            >
              <div
                className="mr-auto flex min-w-0 items-center gap-2"
                data-action-ui-id="asset-picker.toolbar-actions"
              >
                <SegmentedSwitch
                  value={view}
                  onValueChange={handleViewChange}
                  ariaLabel={translate("assetPicker.viewToggle", "视图切换")}
                  iconSize={14}
                  options={[
                    {
                      value: "grid",
                      label: translate("assetPicker.view.grid", "宫格"),
                      icon: LayoutGrid,
                      dataActionUiId: "asset-picker.view.grid",
                    },
                    {
                      value: "list",
                      label: translate("assetPicker.view.list", "列表"),
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
                    onCheckedChange={(checked) =>
                      setAvailableOnly(checked === true)
                    }
                    data-action-ui-id="asset-picker.available-only"
                  />
                  <span>
                    {translate("assetPicker.filter.availableOnly", "仅显示可用")}
                  </span>
                </label>
                {tagView && (
                  <Badge
                    variant="secondary"
                    className="h-8 min-w-0 shrink gap-2 pl-2.5 pr-1"
                    data-action-ui-id="asset-picker.tag-view"
                  >
                    {activeTag && <TagFilterMark tag={activeTag} />}
                    <span className="truncate">
                      {activeTag ? tagLabel(activeTag, translate) : tagFilter}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      aria-label={translate("assetFilter.reset", "清除筛选")}
                      onClick={handleExitTagView}
                      data-action-ui-id="asset-picker.tag-view.clear"
                    >
                      <CloseIcon className="size-3.5" strokeWidth={1.5} />
                    </Button>
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={cancel}
                aria-label={translate("common.close")}
                data-action-ui-id="asset-picker.close"
              >
                <CloseIcon className="size-[18px]" strokeWidth={1.5} />
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col pl-4 pr-3">
              {view === "list" && uploadAction && (
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
                  view={view}
                  multiple={multiple}
                  leadingAction={view === "grid" ? uploadAction : void 0}
                  {...marqueeSelection}
                  onToggle={toggleRow}
                  reasonForRow={reasonForRow}
                  labelForReason={(reason) =>
                    disabledReasonLabel(reason, translate, constraints)
                  }
                  isRowExisting={isRowExisting}
                  onPreview={setPreviewRow}
                  emptyTitle={
                    filtersActive
                      ? translate("assetPicker.empty.filtered", "没有符合条件的资源")
                      : translate("assetPicker.empty.canvas", "画布上没有可选资源")
                  }
                  emptyDescription={
                    filtersActive
                      ? translate(
                          "assetPicker.empty.filteredHint",
                          "请调整搜索或筛选条件",
                        )
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
            <div className="font-medium text-foreground">
              {summary.selected}
            </div>
            <div className="mt-1 text-[11px] leading-relaxed">
              {summary.detail}
              {summary.full}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              className="min-w-22 rounded-[calc(var(--radius-sm)+2px)]"
              onClick={cancel}
              data-action-ui-id="asset-picker.cancel"
            >
              {translate("common.cancel", "取消")}
            </Button>
            <Button
              className="min-w-26 rounded-[calc(var(--radius-sm)+2px)]"
              onClick={confirm}
              disabled={!meetsMin}
              data-action-ui-id="asset-picker.confirm"
            >
              {translate("common.confirm", "确认")}
            </Button>
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
        onOpenChange={(next) => {
          if (!next) cancel();
        }}
      >
        <DialogContent
          className="z-10001"
          overlayClassName="z-10000"
          portalContainer={fullscreenContainerEl}
        >
          <DialogTitle>
            {translate("assetPicker.upload.uploading", "上传中…")}
          </DialogTitle>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancel}
              data-action-ui-id="asset-source.upload-cancel"
            >
              {translate("common.cancel", "取消")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {browser}
    </>
  );
}
