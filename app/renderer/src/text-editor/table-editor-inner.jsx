// table-editor-inner.jsx
import {
  attachmentThumbnailUrl,
  ChipTooltip,
  DragHandleIcon,
  getRowHeightLines,
  getRowHeightPx,
  moveItem,
  PaperclipIcon,
  PlusIcon,
  renameColumn,
} from "../media-editing/canvas-sticker-assets.jsx";
import {
  classifyFileType,
  CompositedSvg,
  jsxRuntimeExports,
  reactDomExports,
  reactExports,
  useAssetMetadataStore,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  addColumn,
  addRow,
  clampRowHeightPx,
  MAX_ROW_HEIGHT_PX,
  MIN_ROW_HEIGHT_PX,
} from "../canvas/is-reexecutable-generation-node.js";
import { Checkbox } from "../infra/checkbox.jsx";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import {
  getDisplayLyrics,
  lightboxItemFromAssetMeta,
} from "../media-editing/use-warn-missing-asset-meta.jsx";
import { AudioLightbox } from "../media-editing/audio-lightbox.jsx";
import { ImageLightbox } from "../media-editing/image-lightbox.jsx";
import { VideoLightbox } from "../media-editing/video-lightbox.jsx";
import { RESOURCE_DRAG_MIME } from "./build-asr-gateway-request.js";
import { useCanvasBridge } from "../media-editing/package.jsx";
import { setCell } from "./table-document-to-llm-content.js";
import { createTable$1 as createTable } from "../vendor-inline/tanstack-table/row-sorting.js";
import { createRow } from "../vendor-inline/tanstack-table/column-filtering.js";
import {
  applyFilter,
  getMemoOptions,
  memo$1,
  visibleColumns,
} from "../media-editing/create-column.jsx";
import { OverlayScrollbar } from "./overlay-scrollbar-inner.jsx";
import { AddColumnDialog } from "../media-editing/add-column-dialog-inner.jsx";
const VERTICAL_PADDING = 6;
const HORIZONTAL_PADDING = 4;
const MIN_CHIP_SIZE = 22;
const PREVIEW_THUMB_WIDTH = 280;
function ChipPreviewCard({
  x: x2,
  anchorTop,
  anchorBottom,
  name: name2,
  thumbUrl,
}) {
  const ref = reactExports.useRef(null);
  const [adjusted, setAdjusted] = reactExports.useState(null);
  reactExports.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    let left = x2 - rect.width / 2;
    if (left < margin) left = margin;
    if (left + rect.width > window.innerWidth - margin) {
      left = window.innerWidth - rect.width - margin;
    }
    let top2 = anchorBottom + 6;
    if (top2 + rect.height > window.innerHeight - margin) {
      const above = anchorTop - rect.height - 6;
      top2 =
        above >= margin
          ? above
          : Math.max(margin, window.innerHeight - rect.height - margin);
    }
    setAdjusted({
      left,
      top: top2,
    });
  }, [x2, anchorTop, anchorBottom]);
  const [host] = reactExports.useState(() =>
    typeof document !== "undefined" ? document.body : null,
  );
  if (!host) return null;
  return reactDomExports.createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-[10002] flex flex-col gap-2 p-3"
      style={{
        left: adjusted?.left ?? -9999,
        top: adjusted?.top ?? -9999,
        width: PREVIEW_THUMB_WIDTH + 24,
        // thumb width + horizontal padding
        background: "var(--canvas-controls-bg, #ffffff)",
        color: "var(--canvas-controls-text, #262626)",
        border: "0.5px solid var(--canvas-controls-border, rgba(0,0,0,0.06))",
        boxShadow: "var(--canvas-shadow-dropdown)",
      }}
    >
      <div className="truncate text-[13px] font-medium leading-tight">
        {name2}
      </div>
      <div
        className="flex w-full items-center justify-center overflow-hidden"
        style={{
          background: "var(--bg-subtle,#fafafa)",
        }}
      >
        <img
          src={thumbUrl}
          alt={name2}
          loading="lazy"
          className="block max-h-[200px] w-full object-contain"
        />
      </div>
    </div>,
    host,
  );
}
function AttachmentChip({ attachment, size: size2, onRemove: onRemove2 }) {
  const { t: t2 } = useTranslation();
  const meta2 = useAssetMetadataStore((s2) =>
    s2.assets.get(attachment.assetId),
  );
  const thumbnail = attachmentThumbnailUrl(attachment, meta2, size2);
  const [failedThumbnail, setFailedThumbnail] = reactExports.useState(null);
  const thumb = thumbnail === failedThumbnail ? void 0 : thumbnail;
  const previewThumb =
    attachmentThumbnailUrl(attachment, meta2, PREVIEW_THUMB_WIDTH) ?? thumb;
  const missing = !meta2;
  const previewable = !missing && !!thumb;
  const canPreviewFullscreen =
    !missing &&
    !!meta2 &&
    (attachment.kind === "image" ||
      attachment.kind === "video" ||
      attachment.kind === "audio");
  const chipRef = reactExports.useRef(null);
  const [hoverPos, setHoverPos] = reactExports.useState(null);
  const [lightboxOpen, setLightboxOpen] = reactExports.useState(false);
  const removeBtnSize = Math.max(10, Math.min(12, Math.round(size2 * 0.28)));
  const removeIconSize = Math.max(6, Math.round(removeBtnSize * 0.55));
  const removeBtnOverhang =
    -Math.round(removeBtnSize / 2) + Math.round(removeBtnSize / 4);
  const showHover = () => {
    const el = chipRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setHoverPos({
      x: rect.left + rect.width / 2,
      bottom: rect.bottom,
      top: rect.top,
    });
  };
  const hideHover = () => setHoverPos(null);
  const hideHoverSync = () => reactDomExports.flushSync(hideHover);
  const canDrag = !missing;
  const handlePointerDown = () => {
    if (!canDrag) return;
    hideHoverSync();
  };
  const handleDragStart = (event) => {
    if (!meta2) {
      event.preventDefault();
      return;
    }
    hideHoverSync();
    const item = {
      path: meta2.path,
      absolutePath: meta2.path,
      name: attachment.name,
      type: attachment.kind,
      assetId: attachment.assetId,
      isDirectory: false,
    };
    event.dataTransfer.setData(RESOURCE_DRAG_MIME, JSON.stringify([item]));
    event.dataTransfer.effectAllowed = "copy";
    const el = chipRef.current;
    if (el) {
      event.dataTransfer.setDragImage(
        el,
        el.offsetWidth / 2,
        el.offsetHeight / 2,
      );
    }
  };
  const handleDoubleClick2 = (event) => {
    if (!canPreviewFullscreen) return;
    event.stopPropagation();
    event.preventDefault();
    hideHoverSync();
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);
  const lightboxItem =
    meta2 &&
    (attachment.kind === "image" ||
      attachment.kind === "video" ||
      attachment.kind === "audio")
      ? lightboxItemFromAssetMeta(attachment.kind, meta2)
      : void 0;
  return (
    <>
      <span
        ref={chipRef}
        className={`group/chip relative inline-flex shrink-0 items-center justify-center ${canDrag ? "cursor-grab active:cursor-grabbing" : ""}`}
        style={{
          width: size2,
          height: size2,
        }}
        draggable={canDrag}
        onPointerDown={handlePointerDown}
        onDragStart={handleDragStart}
        onDragEnd={hideHover}
        onDoubleClick={handleDoubleClick2}
        onMouseEnter={showHover}
        onMouseLeave={hideHover}
      >
        <span
          className="flex h-full w-full items-center justify-center overflow-hidden"
          style={{
            background:
              thumb || !missing ? "var(--bg-subtle,#fafafa)" : "transparent",
            border: missing
              ? "1px dashed var(--canvas-node-border,#c0c0c0)"
              : thumb
                ? "1px solid var(--canvas-node-border,#e0e0e0)"
                : "none",
          }}
        >
          {thumb ? (
            <img
              src={thumb}
              onError={() => setFailedThumbnail(thumb)}
              alt={attachment.name}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          ) : (
            <FileTypeIcon
              {...classifyFileType({
                filename: attachment.name,
              })}
              size={size2 >= 30 ? 24 : 14}
              accessibleLabel={
                attachment.name.trim()
                  ? attachment.name
                  : t2("canvas.file.untitled", "Untitled")
              }
            />
          )}
        </span>
        <button
          type="button"
          onClick={(e2) => {
            e2.stopPropagation();
            hideHover();
            onRemove2();
          }}
          aria-label={t2("a11y.removeAttachment", "Remove attachment")}
          className="absolute z-10 hidden cursor-pointer items-center justify-center rounded-full bg-black/60 text-white shadow-sm transition-colors group-hover/chip:flex hover:bg-black/80"
          style={{
            width: removeBtnSize,
            height: removeBtnSize,
            top: removeBtnOverhang,
            right: removeBtnOverhang,
          }}
        >
          <CompositedSvg
            width={removeIconSize}
            height={removeIconSize}
            viewBox="0 0 8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" />
          </CompositedSvg>
        </button>
      </span>
      {hoverPos &&
        !lightboxOpen &&
        (previewable && previewThumb ? (
          <ChipPreviewCard
            x={hoverPos.x}
            anchorTop={hoverPos.top}
            anchorBottom={hoverPos.bottom}
            name={attachment.name}
            thumbUrl={previewThumb}
          />
        ) : (
          <ChipTooltip
            x={hoverPos.x}
            anchorTop={hoverPos.top}
            anchorBottom={hoverPos.bottom}
          >
            {missing ? `${attachment.name} (missing)` : attachment.name}
          </ChipTooltip>
        ))}
      {lightboxOpen && lightboxItem && attachment.kind === "image" && (
        <ImageLightbox
          items={[lightboxItem]}
          index={0}
          onIndexChange={() => {}}
          alt={attachment.name}
          onClose={closeLightbox}
        />
      )}
      {lightboxOpen && lightboxItem && attachment.kind === "video" && (
        <VideoLightbox item={lightboxItem} onClose={closeLightbox} />
      )}
      {lightboxOpen && lightboxItem && attachment.kind === "audio" && (
        <AudioLightbox
          item={lightboxItem}
          name={attachment.name}
          lyrics={getDisplayLyrics(meta2)}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}
function TableCellAttachmentInner({
  attachments,
  rowHeightPx,
  columnWidthPx,
  onAdd: onAdd2,
  onRemove: onRemove2,
}) {
  const { t: t2 } = useTranslation();
  const { pickAsset } = useCanvasBridge();
  const chipSize = Math.max(
    MIN_CHIP_SIZE,
    Math.min(
      rowHeightPx - VERTICAL_PADDING * 2,
      columnWidthPx - HORIZONTAL_PADDING * 2,
    ),
  );
  async function handleOpenPicker() {
    if (!pickAsset) {
      return;
    }
    try {
      const picks = await pickAsset({
        multiple: true,
        existingAssetIds: attachments.map((a2) => a2.assetId),
        uploadMode: "attach",
        // Table cells have no caller-on-canvas linkage; drop the upstream
        // tab to keep the dialog focused on workspace + upload.
        tabs: ["canvas", "upload"],
      });
      if (!picks || picks.length === 0) return;
      const next2 = picks
        .filter(
          (r2) =>
            r2.type === "image" ||
            r2.type === "video" ||
            r2.type === "audio" ||
            r2.type === "text",
        )
        .map((r2) => ({
          assetId: r2.assetId,
          name: r2.name,
          kind: r2.type,
        }));
      if (next2.length > 0) onAdd2(next2);
    } catch (err) {
      if (err?.code === "picker_busy") return;
      console.warn("[cell-attachment] pickAsset rejected", err);
    }
  }
  return (
    <div
      className="flex h-full items-center gap-1 overflow-x-auto overflow-y-hidden px-1"
      style={{
        paddingTop: VERTICAL_PADDING,
        paddingBottom: VERTICAL_PADDING,
      }}
      onWheel={(e2) => e2.stopPropagation()}
    >
      {attachments.map((att) => (
        <AttachmentChip
          key={att.assetId}
          attachment={att}
          size={chipSize}
          onRemove={() => onRemove2(att.assetId)}
        />
      ))}
      <button
        type="button"
        onClick={() => {
          void handleOpenPicker();
        }}
        title={t2("canvas.table.attachment.add", "Add attachment")}
        className="flex shrink-0 items-center justify-center bg-[var(--bg-subtle,#f5f5f5)] transition-colors hover:bg-[var(--bg-subtle-hover,#eee)]"
        style={{
          width: chipSize,
          height: chipSize,
          color: "var(--fg-muted,#666)",
        }}
      >
        +
      </button>
    </div>
  );
}
const TableCellAttachment = reactExports.memo(TableCellAttachmentInner);
function TableCellNumberInner({ value, onChange }) {
  const [editing, setEditing] = reactExports.useState(false);
  const [draft, setDraft] = reactExports.useState(
    value == null ? "" : String(value),
  );
  const textareaRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!editing) setDraft(value == null ? "" : String(value));
  }, [value, editing]);
  reactExports.useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      });
    }
  }, [editing]);
  const commit = reactExports.useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (value !== null) onChange(null);
      return;
    }
    const n2 = Number(trimmed);
    if (Number.isNaN(n2)) {
      setDraft(value == null ? "" : String(value));
      return;
    }
    if (n2 !== value) onChange(n2);
  }, [draft, value, onChange]);
  const cancel = reactExports.useCallback(() => {
    setDraft(value == null ? "" : String(value));
    setEditing(false);
  }, [value]);
  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        rows={1}
        inputMode="decimal"
        value={draft}
        onChange={(e2) => setDraft(e2.target.value)}
        onBlur={commit}
        onKeyDown={(e2) => {
          if (e2.key === "Enter") {
            if (!e2.nativeEvent.isComposing) {
              e2.preventDefault();
              commit();
            }
          } else if (e2.key === "Escape") {
            e2.preventDefault();
            cancel();
          }
          e2.stopPropagation();
        }}
        className="absolute left-0 top-0 z-20 block w-full resize-none overflow-hidden px-2 py-1.5 text-left text-[13px] leading-snug tabular-nums shadow-lg outline-none"
        style={{
          color: "var(--fg-default, #141414)",
          boxSizing: "border-box",
          background: "var(--canvas-node-bg, #ffffff)",
          border: "none",
          outline: "1px solid var(--canvas-node-border-selected, #3370ff)",
          height: "100%",
          fontFamily: "inherit",
        }}
      />
    );
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: editing toggles via parent table; keyboard nav is handled at the row level
    // biome-ignore lint/a11y/useKeyWithClickEvents: cell enters edit mode via its own onClick; keyboard nav is handled at the row level
    <div
      className="h-full w-full cursor-text truncate px-2 py-1.5 text-left text-[13px] leading-snug tabular-nums"
      style={{
        color: "var(--fg-default, #141414)",
      }}
      onClick={() => setEditing(true)}
    >
      {value == null ? <span className="opacity-30">—</span> : String(value)}
    </div>
  );
}
const TableCellNumber = reactExports.memo(TableCellNumberInner);
const MAX_EDIT_HEIGHT = 150;
function TableCellTextInner({ value, onChange, rowHeightPx, maxLines }) {
  const [editing, setEditing] = reactExports.useState(false);
  const [draft, setDraft] = reactExports.useState(value);
  const textareaRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);
  reactExports.useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        const end2 = el.value.length;
        el.setSelectionRange(end2, end2);
      });
    }
  }, [editing]);
  reactExports.useLayoutEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next2 = Math.max(
      rowHeightPx,
      Math.min(el.scrollHeight, MAX_EDIT_HEIGHT),
    );
    el.style.height = `${next2}px`;
  }, [draft, editing, rowHeightPx]);
  const commit = reactExports.useCallback(() => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  }, [draft, value, onChange]);
  const cancel = reactExports.useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);
  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e2) => setDraft(e2.target.value)}
        onBlur={commit}
        onKeyDown={(e2) => {
          if (e2.key === "Enter") {
            if (!e2.shiftKey && !e2.nativeEvent.isComposing) {
              e2.preventDefault();
              commit();
            }
          } else if (e2.key === "Escape") {
            e2.preventDefault();
            cancel();
          }
          e2.stopPropagation();
        }}
        className="absolute left-0 top-0 z-20 block w-full resize-none overflow-y-auto px-2 py-1.5 text-[13px] leading-snug shadow-lg outline-none"
        style={{
          color: "var(--fg-default, #141414)",
          fontFamily: "inherit",
          boxSizing: "border-box",
          background: "var(--canvas-node-bg, #ffffff)",
          border: "none",
          outline: "1px solid var(--canvas-node-border-selected, #3370ff)",
          minHeight: rowHeightPx,
          maxHeight: MAX_EDIT_HEIGHT,
        }}
      />
    );
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: editing toggles via parent table; keyboard nav is handled at the row level
    // biome-ignore lint/a11y/useKeyWithClickEvents: cell enters edit mode via its own onClick; keyboard nav is handled at the row level
    <div
      className="flex h-full w-full cursor-text items-start px-2 py-1.5 text-[13px] leading-snug"
      style={{
        color: "var(--fg-default, #141414)",
      }}
      onClick={() => setEditing(true)}
      title={value}
    >
      <span
        className="block w-full overflow-hidden break-words"
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: maxLines,
          whiteSpace: maxLines === 1 ? "normal" : "pre-wrap",
        }}
      >
        {value || <span className="opacity-30">—</span>}
      </span>
    </div>
  );
}
const TableCellText = reactExports.memo(TableCellTextInner);
function resizeColumn(doc2, columnId, width) {
  const clamped = Math.max(100, Math.round(width));
  return {
    ...doc2,
    columns: doc2.columns.map((c3) =>
      c3.id === columnId
        ? {
            ...c3,
            width: clamped,
          }
        : c3,
    ),
  };
}
function moveRow(doc2, fromId, toId, position2 = "before") {
  const rows = moveItem(doc2.rows, fromId, toId, position2);
  if (rows === doc2.rows) return doc2;
  return {
    ...doc2,
    rows,
  };
}
function appendAttachments(doc2, rowId, columnId, add2) {
  if (add2.length === 0) return doc2;
  return {
    ...doc2,
    rows: doc2.rows.map((r2) => {
      if (r2.id !== rowId) return r2;
      const existing = r2.cells[columnId];
      const list2 = Array.isArray(existing) ? existing : [];
      const seen2 = new Set(list2.map((a2) => a2.assetId));
      const merged = [...list2, ...add2.filter((a2) => !seen2.has(a2.assetId))];
      return {
        ...r2,
        cells: {
          ...r2.cells,
          [columnId]: merged,
        },
      };
    }),
  };
}
function removeAttachment(doc2, rowId, columnId, assetId) {
  return {
    ...doc2,
    rows: doc2.rows.map((r2) => {
      if (r2.id !== rowId) return r2;
      const cell = r2.cells[columnId];
      if (!Array.isArray(cell)) return r2;
      const filtered = cell.filter((a2) => a2.assetId !== assetId);
      return {
        ...r2,
        cells: {
          ...r2.cells,
          [columnId]: filtered,
        },
      };
    }),
  };
}
const ROW_HEIGHT_VERTICAL_PADDING = 12;
const ROW_HEIGHT_LINE_PX = 18;
function getRowEffectiveHeightPx(doc2, row) {
  if (row.height !== void 0) return row.height;
  return getRowHeightPx(doc2);
}
function linesForHeightPx(heightPx) {
  const usable = Math.max(0, heightPx - ROW_HEIGHT_VERTICAL_PADDING);
  return Math.max(1, Math.floor(usable / ROW_HEIGHT_LINE_PX));
}
function setRowHeightOverride(doc2, rowId, heightPx) {
  let mutated = false;
  const rows = doc2.rows.map((r2) => {
    if (r2.id !== rowId) return r2;
    if (heightPx === null) {
      if (r2.height === void 0) return r2;
      mutated = true;
      const { height: _drop, ...rest } = r2;
      return rest;
    }
    const next2 = clampRowHeightPx(heightPx);
    if (r2.height === next2) return r2;
    mutated = true;
    return {
      ...r2,
      height: next2,
    };
  });
  if (!mutated) return doc2;
  return {
    ...doc2,
    rows,
  };
}
function getCoreRowModel() {
  return (table2) =>
    memo$1(
      () => [table2.options.data],
      (data2) => {
        const rowModel = {
          rows: [],
          flatRows: [],
          rowsById: {},
        };
        const accessRows = function (originalRows, depth2, parentRow) {
          if (depth2 === void 0) {
            depth2 = 0;
          }
          const rows = [];
          for (let i2 = 0; i2 < originalRows.length; i2++) {
            const row = createRow(
              table2,
              table2._getRowId(originalRows[i2], i2, parentRow),
              originalRows[i2],
              i2,
              depth2,
              void 0,
              parentRow == null ? void 0 : parentRow.id,
            );
            rowModel.flatRows.push(row);
            rowModel.rowsById[row.id] = row;
            rows.push(row);
            if (table2.options.getSubRows) {
              var _row$originalSubRows;
              row.originalSubRows = table2.options.getSubRows(
                originalRows[i2],
                i2,
              );
              if (
                (_row$originalSubRows = row.originalSubRows) != null &&
                _row$originalSubRows.length
              ) {
                row.subRows = accessRows(row.originalSubRows, depth2 + 1, row);
              }
            }
          }
          return rows;
        };
        rowModel.rows = accessRows(data2);
        return rowModel;
      },
      getMemoOptions(table2.options, "debugTable", "getRowModel", () =>
        table2._autoResetPageIndex(),
      ),
    );
}
function isClassComponent(component) {
  return (
    typeof component === "function" &&
    (() => {
      const proto2 = Object.getPrototypeOf(component);
      return proto2.prototype && proto2.prototype.isReactComponent;
    })()
  );
}
function isExoticComponent(component) {
  return (
    typeof component === "object" &&
    typeof component.$$typeof === "symbol" &&
    ["react.memo", "react.forward_ref"].includes(component.$$typeof.description)
  );
}
function isReactComponent(component) {
  return (
    isClassComponent(component) ||
    typeof component === "function" ||
    isExoticComponent(component)
  );
}
function flexRender(Comp, props) {
  return !Comp
    ? null
    : isReactComponent(Comp)
      ? reactExports.createElement(Comp, props)
      : Comp;
}
function useReactTable(options) {
  const resolvedOptions = {
    state: {},
    // Dummy state
    onStateChange: () => {},
    // noop
    renderFallbackValue: null,
    ...options,
  };
  const [tableRef] = reactExports.useState(() => ({
    current: createTable(resolvedOptions),
  }));
  const [state2, setState] = reactExports.useState(
    () => tableRef.current.initialState,
  );
  tableRef.current.setOptions((prev) => ({
    ...prev,
    ...options,
    state: {
      ...state2,
      ...options.state,
    },
    // Similarly, we'll maintain both our internal state and any user-provided
    // state.
    onStateChange: (updater) => {
      setState(updater);
      options.onStateChange == null || options.onStateChange(updater);
    },
  }));
  return tableRef.current;
}
const HEADER_HEIGHT = 36;
const ROW_HANDLE_WIDTH = 56;
const ADD_COLUMN_WIDTH = 80;
const ROW_DRAG_MIME = "application/x-table-row-id";
const DEFAULT_COLUMN_WIDTH = 200;
const MIN_COLUMN_WIDTH = 100;
const RESIZE_HANDLE_HIT = 6;
const CellRenderer = reactExports.memo(function CellRenderer2({
  rowId,
  columnId,
  columnType,
  value,
  rowHeightPx,
  columnWidthPx,
  maxLines,
  apply: apply2,
}) {
  const onChange = reactExports.useCallback(
    (next2) => apply2((prev) => setCell(prev, rowId, columnId, next2)),
    [apply2, rowId, columnId],
  );
  const onAddAttachments = reactExports.useCallback(
    (picks) =>
      apply2((prev) => appendAttachments(prev, rowId, columnId, picks)),
    [apply2, rowId, columnId],
  );
  const onRemoveAttachment = reactExports.useCallback(
    (assetId) =>
      apply2((prev) => removeAttachment(prev, rowId, columnId, assetId)),
    [apply2, rowId, columnId],
  );
  if (columnType === "text") {
    const v2 = typeof value === "string" ? value : "";
    return (
      <TableCellText
        value={v2}
        onChange={onChange}
        rowHeightPx={rowHeightPx}
        maxLines={maxLines}
      />
    );
  }
  if (columnType === "number") {
    const v2 = typeof value === "number" ? value : null;
    return <TableCellNumber value={v2} onChange={onChange} />;
  }
  const list2 = Array.isArray(value) ? value : [];
  return (
    <TableCellAttachment
      attachments={list2}
      rowHeightPx={rowHeightPx}
      columnWidthPx={columnWidthPx}
      onAdd={onAddAttachments}
      onRemove={onRemoveAttachment}
    />
  );
});
function RowToggle({ rowIndex, selected: selected2, onToggle }) {
  const { t: t2 } = useTranslation();
  return (
    <div className="relative min-h-7 w-7">
      {!selected2 && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] tabular-nums text-muted-foreground group-hover:opacity-0 group-focus-within:opacity-0">
          {rowIndex + 1}
        </span>
      )}
      <Checkbox
        size="sm"
        checked={selected2}
        onCheckedChange={onToggle}
        aria-label={
          selected2
            ? t2("canvas.table.deselectRow", "Deselect")
            : t2("canvas.table.selectRow", "Select")
        }
        data-action-ui-id="canvas.table.select-row"
        className={
          selected2
            ? ""
            : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        }
      />
    </div>
  );
}
function RowHandle({ rowId, rowIndex, selected: selected2, onToggle }) {
  const { t: t2 } = useTranslation();
  const handleDragStart = (e2) => {
    e2.dataTransfer.setData(ROW_DRAG_MIME, rowId);
    e2.dataTransfer.effectAllowed = "move";
    const tr2 = e2.currentTarget.closest("tr");
    if (tr2) e2.dataTransfer.setDragImage(tr2, 12, tr2.offsetHeight / 2);
  };
  return (
    <div className="relative flex h-full w-full items-start justify-center gap-1 pt-1">
      <span
        draggable={true}
        onDragStart={handleDragStart}
        className="flex h-5 w-3 shrink-0 cursor-grab items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        style={{
          color: "var(--fg-muted, #999)",
        }}
        title={t2("canvas.table.dragRow", "Drag to reorder")}
      >
        <DragHandleIcon />
      </span>
      <RowToggle rowIndex={rowIndex} selected={selected2} onToggle={onToggle} />
    </div>
  );
}
function HeaderSelectAll({ state: state2, disabled: disabled2, onToggle }) {
  const { t: t2 } = useTranslation();
  const title =
    state2 === "all"
      ? t2("canvas.table.deselectAll", "Deselect all")
      : t2("canvas.table.selectAll", "Select all");
  return (
    <div className="flex h-full w-full items-center justify-center gap-1">
      <span className="h-5 w-3 shrink-0" aria-hidden="true" />
      <Checkbox
        size="sm"
        checked={state2 === "all"}
        indeterminate={state2 === "some"}
        disabled={disabled2}
        onCheckedChange={onToggle}
        title={title}
        aria-label={title}
        data-action-ui-id="canvas.table.select-all"
      />
    </div>
  );
}
function useColumnResize(apply2) {
  const [previewWidth, setPreviewWidth] = reactExports.useState(null);
  const restoreBodyStylesRef = reactExports.useRef(null);
  reactExports.useEffect(
    () => () => {
      restoreBodyStylesRef.current?.();
    },
    [],
  );
  const beginColumnResize = reactExports.useCallback(
    (e2, columnId, currentWidth) => {
      e2.preventDefault();
      e2.stopPropagation();
      if (e2.button !== 0) return;
      const startX = e2.clientX;
      const startWidth = currentWidth;
      let lastWidth = currentWidth;
      setPreviewWidth({
        id: columnId,
        width: startWidth,
      });
      const prevCursor = document.body.style.cursor;
      const prevUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      const restore = () => {
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevUserSelect;
        restoreBodyStylesRef.current = null;
      };
      restoreBodyStylesRef.current = restore;
      const onMove = (ev) => {
        const next2 = Math.max(
          MIN_COLUMN_WIDTH,
          Math.round(startWidth + (ev.clientX - startX)),
        );
        if (next2 === lastWidth) return;
        lastWidth = next2;
        setPreviewWidth({
          id: columnId,
          width: next2,
        });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        restore();
        setPreviewWidth(null);
        if (lastWidth !== startWidth) {
          apply2((prev) => resizeColumn(prev, columnId, lastWidth));
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [apply2],
  );
  return {
    previewWidth,
    beginColumnResize,
  };
}
function ColumnResizeHandle({
  active: active2,
  onPointerDown: onPointerDown2,
}) {
  const { t: t2 } = useTranslation();
  return (
    // Mouse-only resize affordance: there is no keyboard equivalent (column
    // widths are derived from drag delta), and the 6px hit zone is invisible
    // — exposing a fake separator role only mislead screen readers, so we
    // keep it as a plain decorative div and rely on the cursor + tooltip.
    // biome-ignore lint/a11y/noStaticElementInteractions: mouse-only resize affordance, no keyboard equivalent.
    <div
      onPointerDown={onPointerDown2}
      onDoubleClick={(e2) => e2.preventDefault()}
      title={t2("canvas.table.resizeColumn", "Resize column")}
      className="group/resize absolute top-0 z-10 flex h-full cursor-col-resize select-none items-stretch justify-center"
      style={{
        // Center the hit area on the cell's right border so users hovering
        // either side of the divider grab it.
        right: -RESIZE_HANDLE_HIT / 2,
        width: RESIZE_HANDLE_HIT,
      }}
    >
      <span
        aria-hidden="true"
        className="h-full w-[2px] transition-colors group-hover/resize:bg-[var(--canvas-accent,#3b82f6)]"
        style={{
          background: active2 ? "var(--canvas-accent, #3b82f6)" : "transparent",
        }}
      />
    </div>
  );
}
function useRowResize(apply2) {
  const [previewRowHeight, setPreviewRowHeight] = reactExports.useState(null);
  const restoreBodyStylesRef = reactExports.useRef(null);
  reactExports.useEffect(
    () => () => {
      restoreBodyStylesRef.current?.();
    },
    [],
  );
  const beginRowResize = reactExports.useCallback(
    (e2, rowId, currentHeight) => {
      e2.preventDefault();
      e2.stopPropagation();
      if (e2.button !== 0) return;
      const startY = e2.clientY;
      const startHeight = currentHeight;
      let lastHeight = currentHeight;
      setPreviewRowHeight({
        id: rowId,
        height: startHeight,
      });
      const prevCursor = document.body.style.cursor;
      const prevUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      const restore = () => {
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevUserSelect;
        restoreBodyStylesRef.current = null;
      };
      restoreBodyStylesRef.current = restore;
      const onMove = (ev) => {
        const next2 = Math.max(
          MIN_ROW_HEIGHT_PX,
          Math.min(
            MAX_ROW_HEIGHT_PX,
            Math.round(startHeight + (ev.clientY - startY)),
          ),
        );
        if (next2 === lastHeight) return;
        lastHeight = next2;
        setPreviewRowHeight({
          id: rowId,
          height: next2,
        });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        restore();
        setPreviewRowHeight(null);
        if (lastHeight !== startHeight) {
          apply2((prev) => setRowHeightOverride(prev, rowId, lastHeight));
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [apply2],
  );
  return {
    previewRowHeight,
    beginRowResize,
  };
}
function RowResizeHandle({
  active: active2,
  width,
  onPointerDown: onPointerDown2,
}) {
  const { t: t2 } = useTranslation();
  return (
    // Mouse-only resize affordance: there is no keyboard equivalent, and the
    // 6px hit zone is invisible — exposing a fake separator role only misleads
    // screen readers, so we keep it as a plain decorative div.
    // biome-ignore lint/a11y/noStaticElementInteractions: mouse-only resize affordance, no keyboard equivalent.
    <div
      onPointerDown={onPointerDown2}
      onDoubleClick={(e2) => e2.preventDefault()}
      title={t2("canvas.table.resizeRow", "Resize row")}
      className="group/row-resize absolute left-0 z-10 flex cursor-row-resize select-none items-center justify-center"
      style={{
        // Center the hit area on the row's bottom border so users hovering
        // either side of the divider grab it.
        bottom: -RESIZE_HANDLE_HIT / 2,
        width,
        height: RESIZE_HANDLE_HIT,
      }}
    >
      <span
        aria-hidden="true"
        className="h-[2px] w-full transition-colors group-hover/row-resize:bg-[var(--canvas-accent,#3b82f6)]"
        style={{
          background: active2 ? "var(--canvas-accent, #3b82f6)" : "transparent",
        }}
      />
    </div>
  );
}
function FieldTypeIcon({ type: type2 }) {
  if (type2 === "number") {
    return (
      <CompositedSvg
        className="shrink-0"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M8.774 2.14a1 1 0 0 1 .85 1.129L9.242 6h6.98l.423-3.01a1 1 0 1 1 1.98.279L18.242 6H22a1 1 0 1 1 0 2h-4.04l-.984 7H20a1 1 0 1 1 0 2h-3.305l-.575 4.093a1 1 0 1 1-1.98-.278L14.674 17h-6.98l-.575 4.093a1 1 0 1 1-1.98-.278L5.674 17H2a1 1 0 1 1 0-2h3.956l.984-7H4a1 1 0 1 1 0-2h3.221l.423-3.01a1 1 0 0 1 1.13-.85ZM14.956 15l.984-7H8.96l-.984 7h6.98Z"
        />
      </CompositedSvg>
    );
  }
  if (type2 === "attachment") return <PaperclipIcon />;
  return (
    <CompositedSvg
      className="shrink-0"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M8.437 4.898 5.447 13h6.063L8.437 4.898Zm6.025 15.881L12.269 15h-7.56l-2.131 5.78a1 1 0 1 1-1.873-.703L7.02 2.982c.491-1.31 2.344-1.31 2.835 0l6.48 17.095a1 1 0 1 1-1.872.702ZM15.056 5a1 1 0 1 0 0 2H23a1 1 0 1 0 0-2h-7.944Zm1.055 7a1 1 0 0 1 1-1H23a1 1 0 1 1 0 2h-5.89a1 1 0 0 1-1-1Zm3.056 5a1 1 0 1 0 0 2H23a1 1 0 1 0 0-2h-3.833Z"
      />
    </CompositedSvg>
  );
}
function ColumnHeader({ column, onRename }) {
  const { t: t2 } = useTranslation();
  const [editing, setEditing] = reactExports.useState(false);
  const inputRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!editing) return;
    const id2 = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(id2);
  }, [editing]);
  const commitEdit = () => {
    const next2 = inputRef.current?.value ?? column.title;
    setEditing(false);
    if (next2.trim() !== column.title) onRename(next2);
  };
  return (
    <span className="flex h-full w-full items-center gap-1 text-[12px]">
      <FieldTypeIcon type={column.type} />
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          defaultValue={column.title}
          onBlur={commitEdit}
          onKeyDown={(e2) => {
            e2.stopPropagation();
            if (e2.key === "Enter") {
              e2.preventDefault();
              commitEdit();
            } else if (e2.key === "Escape") {
              e2.preventDefault();
              setEditing(false);
            }
          }}
          onClick={(e2) => e2.stopPropagation()}
          onDoubleClick={(e2) => e2.stopPropagation()}
          onPointerDown={(e2) => e2.stopPropagation()}
          className="min-w-0 flex-1 bg-[var(--bg-subtle,#fafafa)] px-1 outline-none"
          style={{
            color: "var(--fg-default, #141414)",
          }}
        />
      ) : (
        // Display span fills the remaining header width AND height — the outer
        // flex items-center would otherwise shrink-wrap a single line of text,
        // leaving most of the 36px header row as dead zone. Inner span keeps
        // truncate working (flex children with truncate misbehave directly).
        // biome-ignore lint/a11y/noStaticElementInteractions: column rename also reachable via field-config panel kebab menu
        <span
          onDoubleClick={() => setEditing(true)}
          title={t2("canvas.table.field.edit", "Edit")}
          className="flex h-full min-w-0 flex-1 cursor-text select-none items-center"
        >
          <span className="block min-w-0 flex-1 truncate">
            {column.title || t2("canvas.table.untitledColumn", "Untitled")}
          </span>
        </span>
      )}
    </span>
  );
}
export function TableEditorInner({
  history: history2,
  selectedRowIds,
  onSelectionChange,
}) {
  const { t: t2 } = useTranslation();
  const { doc: doc2, apply: apply2 } = history2;
  const [showAddColumn, setShowAddColumn] = reactExports.useState(false);
  const scrollRef = reactExports.useRef(null);
  const visible = reactExports.useMemo(() => visibleColumns(doc2), [doc2]);
  const filteredRows = reactExports.useMemo(() => applyFilter(doc2), [doc2]);
  const rowHeightPx = getRowHeightPx(doc2);
  const rowHeightLines = getRowHeightLines(doc2);
  const { previewWidth, beginColumnResize } = useColumnResize(apply2);
  const widthOf = reactExports.useCallback(
    (column) => {
      if (previewWidth && previewWidth.id === column.id)
        return previewWidth.width;
      return column.width ?? DEFAULT_COLUMN_WIDTH;
    },
    [previewWidth],
  );
  const { previewRowHeight, beginRowResize } = useRowResize(apply2);
  const heightOf = reactExports.useCallback(
    (row) => {
      if (previewRowHeight && previewRowHeight.id === row.id)
        return previewRowHeight.height;
      return getRowEffectiveHeightPx(doc2, row);
    },
    [previewRowHeight, doc2],
  );
  const columnDefs = reactExports.useMemo(() => {
    return visible.map((column) => ({
      id: column.id,
      header: () => (
        <ColumnHeader
          column={column}
          onRename={(next2) =>
            apply2((prev) => renameColumn(prev, column.id, next2))
          }
        />
      ),
      size: column.width ?? DEFAULT_COLUMN_WIDTH,
      cell: (info2) => {
        const rowOriginal = info2.row.original;
        const effectivePx = rowOriginal.height ?? rowHeightPx;
        const effectiveLines =
          effectivePx === rowHeightPx
            ? rowHeightLines
            : linesForHeightPx(effectivePx);
        const committedColumnWidth = column.width ?? DEFAULT_COLUMN_WIDTH;
        return (
          <CellRenderer
            rowId={rowOriginal.id}
            columnId={column.id}
            columnType={column.type}
            value={rowOriginal.cells[column.id]}
            rowHeightPx={effectivePx}
            columnWidthPx={committedColumnWidth}
            maxLines={effectiveLines}
            apply={apply2}
          />
        );
      },
    }));
  }, [visible, apply2, rowHeightPx, rowHeightLines]);
  const table2 = useReactTable({
    data: filteredRows,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });
  const totalColumnWidth = visible.reduce((sum2, c3) => sum2 + widthOf(c3), 0);
  const tableMinWidth = ROW_HANDLE_WIDTH + totalColumnWidth + ADD_COLUMN_WIDTH;
  const toggleRowSelection = reactExports.useCallback(
    (rowId) => {
      const next2 = new Set(selectedRowIds);
      if (next2.has(rowId)) next2.delete(rowId);
      else next2.add(rowId);
      onSelectionChange(next2);
    },
    [selectedRowIds, onSelectionChange],
  );
  const visibleRowIds = reactExports.useMemo(
    () => filteredRows.map((r2) => r2.id),
    [filteredRows],
  );
  const selectedVisibleCount = reactExports.useMemo(
    () =>
      visibleRowIds.reduce(
        (n2, id2) => (selectedRowIds.has(id2) ? n2 + 1 : n2),
        0,
      ),
    [visibleRowIds, selectedRowIds],
  );
  const headerSelectionState =
    visibleRowIds.length === 0 || selectedVisibleCount === 0
      ? "none"
      : selectedVisibleCount === visibleRowIds.length
        ? "all"
        : "some";
  const handleToggleAll = reactExports.useCallback(() => {
    if (visibleRowIds.length === 0) return;
    onSelectionChange(
      headerSelectionState === "all" ? new Set() : new Set(visibleRowIds),
    );
  }, [visibleRowIds, headerSelectionState, onSelectionChange]);
  const handleCommitColumn = reactExports.useCallback(
    ({ title, type: type2 }) => {
      apply2((prev) =>
        addColumn(prev, {
          title,
          type: type2,
        }),
      );
      setShowAddColumn(false);
    },
    [apply2],
  );
  const handleAddRow = reactExports.useCallback(() => {
    apply2((prev) => addRow(prev));
  }, [apply2]);
  const [rowDragOver, setRowDragOver] = reactExports.useState(null);
  const handleRowDragOver = reactExports.useCallback((rowId, e2) => {
    if (!e2.dataTransfer.types.includes(ROW_DRAG_MIME)) return;
    e2.preventDefault();
    e2.dataTransfer.dropEffect = "move";
    const rect = e2.currentTarget.getBoundingClientRect();
    const isAfter2 = e2.clientY > rect.top + rect.height / 2;
    setRowDragOver((prev) =>
      prev?.rowId === rowId && prev.edge === (isAfter2 ? "after" : "before")
        ? prev
        : {
            rowId,
            edge: isAfter2 ? "after" : "before",
          },
    );
  }, []);
  const handleRowDragLeave = reactExports.useCallback((e2) => {
    if (!e2.currentTarget.contains(e2.relatedTarget)) {
      setRowDragOver(null);
    }
  }, []);
  const handleRowDrop = reactExports.useCallback(
    (rowId, e2) => {
      const fromId = e2.dataTransfer.getData(ROW_DRAG_MIME);
      const edge = rowDragOver?.edge ?? "before";
      setRowDragOver(null);
      if (!fromId || fromId === rowId) return;
      e2.preventDefault();
      apply2((prev) => moveRow(prev, fromId, rowId, edge));
    },
    [apply2, rowDragOver],
  );
  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="native-scrollbar-hidden h-full w-full overflow-auto"
        >
          <div
            style={{
              minWidth: tableMinWidth,
            }}
          >
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col
                  style={{
                    width: ROW_HANDLE_WIDTH,
                  }}
                />
                {visible.map((c3) => (
                  <col
                    key={c3.id}
                    style={{
                      width: widthOf(c3),
                    }}
                  />
                ))}
                <col />
              </colgroup>
              <thead>
                <tr
                  style={{
                    height: HEADER_HEIGHT,
                  }}
                >
                  <th
                    style={{
                      background: "var(--bg-subtle, #fafafa)",
                      borderBottom:
                        "1px solid var(--canvas-node-border, #e0e0e0)",
                      padding: 0,
                      verticalAlign: "middle",
                    }}
                  >
                    <HeaderSelectAll
                      state={headerSelectionState}
                      disabled={visibleRowIds.length === 0}
                      onToggle={handleToggleAll}
                    />
                  </th>
                  {table2.getHeaderGroups()[0]?.headers.map((header) => {
                    const column = visible.find(
                      (c3) => c3.id === header.column.id,
                    );
                    return (
                      <th
                        key={header.id}
                        className="relative border-b px-2 text-left font-normal"
                        style={{
                          background: "var(--bg-subtle, #fafafa)",
                          borderColor: "var(--canvas-node-border, #e0e0e0)",
                          color: "var(--fg-muted, #525252)",
                          borderRight:
                            "1px solid var(--canvas-node-border, #e0e0e0)",
                        }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {column && (
                          <ColumnResizeHandle
                            active={previewWidth?.id === column.id}
                            onPointerDown={(e2) =>
                              beginColumnResize(e2, column.id, widthOf(column))
                            }
                          />
                        )}
                      </th>
                    );
                  })}
                  <th
                    className="border-b"
                    style={{
                      background: "var(--bg-subtle, #fafafa)",
                      borderColor: "var(--canvas-node-border, #e0e0e0)",
                      padding: 0,
                      height: HEADER_HEIGHT,
                    }}
                  >
                    <button
                      type="button"
                      title={t2("canvas.table.addColumn", "Add column")}
                      onClick={() => setShowAddColumn(true)}
                      className="flex cursor-pointer items-center justify-center transition-colors hover:bg-[var(--bg-subtle,#eee)]"
                      style={{
                        color: "var(--fg-muted, #666)",
                        width: ADD_COLUMN_WIDTH,
                        height: HEADER_HEIGHT,
                      }}
                    >
                      <PlusIcon />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {table2.getRowModel().rows.length === 0 ? (
                  <tr
                    style={{
                      height: rowHeightPx,
                    }}
                  >
                    <td
                      colSpan={visible.length + 2}
                      className="px-2 text-center text-[12px]"
                      style={{
                        color: "var(--fg-muted, #999)",
                        borderBottom:
                          "1px solid var(--canvas-node-border, #e0e0e0)",
                      }}
                    >
                      {t2(
                        "canvas.table.noRows",
                        "No rows yet — click + below to add one",
                      )}
                    </td>
                  </tr>
                ) : (
                  table2.getRowModel().rows.map((row) => {
                    const isSelected = selectedRowIds.has(row.id);
                    const isDropTarget = rowDragOver?.rowId === row.id;
                    const dropEdge = isDropTarget ? rowDragOver?.edge : null;
                    const rowEffectivePx = heightOf(row.original);
                    const isResizingThisRow = previewRowHeight?.id === row.id;
                    return (
                      <tr
                        key={row.id}
                        className="group"
                        onDragOver={(e2) => handleRowDragOver(row.id, e2)}
                        onDragLeave={handleRowDragLeave}
                        onDrop={(e2) => handleRowDrop(row.id, e2)}
                        style={{
                          height: rowEffectivePx,
                          background: isSelected
                            ? "var(--bg-subtle, #f5f5f5)"
                            : "transparent",
                          // Drop indicator: 2px line on the top/bottom edge of the
                          // hovered row. Inset shadow so it stays inside the row
                          // bounds without shifting layout.
                          boxShadow:
                            dropEdge === "before"
                              ? "inset 0 2px 0 0 var(--canvas-accent, #3b82f6)"
                              : dropEdge === "after"
                                ? "inset 0 -2px 0 0 var(--canvas-accent, #3b82f6)"
                                : void 0,
                        }}
                      >
                        <td
                          className="border-b text-center align-top"
                          style={{
                            // position:relative anchors the row resize handle.
                            // The handle uses an absolute width (table min-width)
                            // because right:0 would clip it to this single cell.
                            position: "relative",
                            borderColor: "var(--canvas-node-border, #e0e0e0)",
                            color: "var(--fg-muted, #999)",
                          }}
                        >
                          <RowHandle
                            rowId={row.id}
                            rowIndex={row.index}
                            selected={isSelected}
                            onToggle={() => toggleRowSelection(row.id)}
                          />
                          <RowResizeHandle
                            active={isResizingThisRow}
                            width={tableMinWidth}
                            onPointerDown={(e2) =>
                              beginRowResize(e2, row.id, rowEffectivePx)
                            }
                          />
                        </td>
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="border-b"
                            style={{
                              borderColor: "var(--canvas-node-border, #e0e0e0)",
                              borderRight:
                                "1px solid var(--canvas-node-border, #e0e0e0)",
                              padding: 0,
                              verticalAlign: "top",
                            }}
                          >
                            <div
                              className="relative w-full overflow-hidden focus-within:z-20 focus-within:overflow-visible"
                              style={{
                                height: rowEffectivePx,
                              }}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </div>
                          </td>
                        ))}
                        <td
                          className="border-b"
                          style={{
                            borderColor: "var(--canvas-node-border, #e0e0e0)",
                          }}
                        />
                      </tr>
                    );
                  })
                )}
                <tr
                  style={{
                    height: 36,
                  }}
                >
                  <td
                    colSpan={visible.length + 2}
                    className="border-b"
                    style={{
                      borderColor: "var(--canvas-node-border, #e0e0e0)",
                      color: "var(--fg-muted, #666)",
                      padding: 0,
                      height: 36,
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="flex cursor-pointer items-center text-left text-[12px] transition-colors hover:bg-[var(--bg-subtle,#f5f5f5)]"
                      style={{
                        width: "100%",
                        height: 36,
                      }}
                    >
                      <span
                        className="flex h-full items-center justify-center gap-1 shrink-0"
                        style={{
                          width: ROW_HANDLE_WIDTH,
                        }}
                      >
                        <span className="h-5 w-3 shrink-0" aria-hidden="true" />
                        <span className="flex h-5 w-5 items-center justify-center">
                          <PlusIcon />
                        </span>
                      </span>
                      <span>{t2("canvas.table.addRow", "Add row")}</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <OverlayScrollbar targetRef={scrollRef} orientation="horizontal" />
        <OverlayScrollbar targetRef={scrollRef} orientation="vertical" />
      </div>
      {showAddColumn && (
        <AddColumnDialog
          onCommit={handleCommitColumn}
          onClose={() => setShowAddColumn(false)}
        />
      )}
    </div>
  );
}
