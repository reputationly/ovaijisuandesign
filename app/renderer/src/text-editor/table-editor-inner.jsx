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
import jsxRuntimeExports from "react/jsx-runtime";
import reactDomExports from "react-dom";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { classifyFileType } from "../infra/file-type.js";
import { CompositedSvg } from "../media-editing/icon-compositing.js";
import { useAssetMetadataStore } from "../infra/agent-http-client.js";
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
import {
  createRow,
  createTable,
  getCoreRowModel,
} from "@tanstack/table-core";
import { flexRender, useReactTable } from "@tanstack/react-table";
import { applyFilter, visibleColumns } from "../media-editing/create-column.jsx";
import { OverlayScrollbar } from "./overlay-scrollbar-inner.jsx";
import { AddColumnDialog } from "../media-editing/add-column-dialog-inner.jsx";
const VERTICAL_PADDING = 6;
const HORIZONTAL_PADDING = 4;
const MIN_CHIP_SIZE = 22;
const PREVIEW_THUMB_WIDTH = 280;
function ChipPreviewCard({
  x,
  anchorTop,
  anchorBottom,
  name: chipName,
  thumbUrl,
}) {
  const ref = reactExports.useRef(null);
  const [adjusted, setAdjusted] = reactExports.useState(null);
  reactExports.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    let left = x - rect.width / 2;
    if (left < margin) left = margin;
    if (left + rect.width > window.innerWidth - margin) {
      left = window.innerWidth - rect.width - margin;
    }
    let menuTop = anchorBottom + 6;
    if (menuTop + rect.height > window.innerHeight - margin) {
      const above = anchorTop - rect.height - 6;
      menuTop =
        above >= margin
          ? above
          : Math.max(margin, window.innerHeight - rect.height - margin);
    }
    setAdjusted({
      left,
      top: menuTop,
    });
  }, [x, anchorTop, anchorBottom]);
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
        {chipName}
      </div>
      <div
        className="flex w-full items-center justify-center overflow-hidden"
        style={{
          background: "var(--bg-subtle,#fafafa)",
        }}
      >
        <img
          src={thumbUrl}
          alt={chipName}
          loading="lazy"
          className="block max-h-[200px] w-full object-contain"
        />
      </div>
    </div>,
    host,
  );
}
function AttachmentChip({ attachment, size, onRemove }) {
  const { t } = useTranslation();
  const meta = useAssetMetadataStore((state) =>
    state.assets.get(attachment.assetId),
  );
  const thumbnail = attachmentThumbnailUrl(attachment, meta, size);
  const [failedThumbnail, setFailedThumbnail] = reactExports.useState(null);
  const thumb = thumbnail === failedThumbnail ? void 0 : thumbnail;
  const previewThumb =
    attachmentThumbnailUrl(attachment, meta, PREVIEW_THUMB_WIDTH) ?? thumb;
  const missing = !meta;
  const previewable = !missing && !!thumb;
  const canPreviewFullscreen =
    !missing &&
    !!meta &&
    (attachment.kind === "image" ||
      attachment.kind === "video" ||
      attachment.kind === "audio");
  const chipRef = reactExports.useRef(null);
  const [hoverPos, setHoverPos] = reactExports.useState(null);
  const [lightboxOpen, setLightboxOpen] = reactExports.useState(false);
  const removeBtnSize = Math.max(10, Math.min(12, Math.round(size * 0.28)));
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
    if (!meta) {
      event.preventDefault();
      return;
    }
    hideHoverSync();
    const item = {
      path: meta.path,
      absolutePath: meta.path,
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
  const handleDoubleClick = (event) => {
    if (!canPreviewFullscreen) return;
    event.stopPropagation();
    event.preventDefault();
    hideHoverSync();
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);
  const lightboxItem =
    meta &&
    (attachment.kind === "image" ||
      attachment.kind === "video" ||
      attachment.kind === "audio")
      ? lightboxItemFromAssetMeta(attachment.kind, meta)
      : void 0;
  return (
    <>
      <span
        ref={chipRef}
        className={`group/chip relative inline-flex shrink-0 items-center justify-center ${canDrag ? "cursor-grab active:cursor-grabbing" : ""}`}
        style={{
          width: size,
          height: size,
        }}
        draggable={canDrag}
        onPointerDown={handlePointerDown}
        onDragStart={handleDragStart}
        onDragEnd={hideHover}
        onDoubleClick={handleDoubleClick}
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
              size={size >= 30 ? 24 : 14}
              accessibleLabel={
                attachment.name.trim()
                  ? attachment.name
                  : t("canvas.file.untitled", "Untitled")
              }
            />
          )}
        </span>
        <button
          type="button"
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            hideHover();
            onRemove();
          }}
          aria-label={t("a11y.removeAttachment", "Remove attachment")}
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
          lyrics={getDisplayLyrics(meta)}
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
  onAdd,
  onRemove,
}) {
  const { t } = useTranslation();
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
        existingAssetIds: attachments.map((attachment) => attachment.assetId),
        uploadMode: "attach",
        // Table cells have no caller-on-canvas linkage; drop the upstream
        // tab to keep the dialog focused on workspace + upload.
        tabs: ["canvas", "upload"],
      });
      if (!picks || picks.length === 0) return;
      const next = picks
        .filter(
          (pickedAsset) =>
            pickedAsset.type === "image" ||
            pickedAsset.type === "video" ||
            pickedAsset.type === "audio" ||
            pickedAsset.type === "text",
        )
        .map((pickedAsset) => ({
          assetId: pickedAsset.assetId,
          name: pickedAsset.name,
          kind: pickedAsset.type,
        }));
      if (next.length > 0) onAdd(next);
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
      onWheel={(wheelEvent) => wheelEvent.stopPropagation()}
    >
      {attachments.map((att) => (
        <AttachmentChip
          key={att.assetId}
          attachment={att}
          size={chipSize}
          onRemove={() => onRemove(att.assetId)}
        />
      ))}
      <button
        type="button"
        onClick={() => {
          void handleOpenPicker();
        }}
        title={t("canvas.table.attachment.add", "Add attachment")}
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
    const parsedNumber = Number(trimmed);
    if (Number.isNaN(parsedNumber)) {
      setDraft(value == null ? "" : String(value));
      return;
    }
    if (parsedNumber !== value) onChange(parsedNumber);
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
        onChange={(changeEvent) => setDraft(changeEvent.target.value)}
        onBlur={commit}
        onKeyDown={(keyboardEvent) => {
          if (keyboardEvent.key === "Enter") {
            if (!keyboardEvent.nativeEvent.isComposing) {
              keyboardEvent.preventDefault();
              commit();
            }
          } else if (keyboardEvent.key === "Escape") {
            keyboardEvent.preventDefault();
            cancel();
          }
          keyboardEvent.stopPropagation();
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
        const end = el.value.length;
        el.setSelectionRange(end, end);
      });
    }
  }, [editing]);
  reactExports.useLayoutEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.max(
      rowHeightPx,
      Math.min(el.scrollHeight, MAX_EDIT_HEIGHT),
    );
    el.style.height = `${next}px`;
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
        onChange={(changeEvent) => setDraft(changeEvent.target.value)}
        onBlur={commit}
        onKeyDown={(keyboardEvent) => {
          if (keyboardEvent.key === "Enter") {
            if (!keyboardEvent.shiftKey && !keyboardEvent.nativeEvent.isComposing) {
              keyboardEvent.preventDefault();
              commit();
            }
          } else if (keyboardEvent.key === "Escape") {
            keyboardEvent.preventDefault();
            cancel();
          }
          keyboardEvent.stopPropagation();
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
function resizeColumn(doc, columnId, width) {
  const clamped = Math.max(100, Math.round(width));
  return {
    ...doc,
    columns: doc.columns.map((column) =>
      column.id === columnId
        ? {
            ...column,
            width: clamped,
          }
        : column,
    ),
  };
}
function moveRow(doc, fromId, toId, position = "before") {
  const rows = moveItem(doc.rows, fromId, toId, position);
  if (rows === doc.rows) return doc;
  return {
    ...doc,
    rows,
  };
}
function appendAttachments(doc, rowId, columnId, add) {
  if (add.length === 0) return doc;
  return {
    ...doc,
    rows: doc.rows.map((row) => {
      if (row.id !== rowId) return row;
      const existing = row.cells[columnId];
      const list = Array.isArray(existing) ? existing : [];
      const seen = new Set(list.map((attachment) => attachment.assetId));
      const merged = [...list, ...add.filter((attachment) => !seen.has(attachment.assetId))];
      return {
        ...row,
        cells: {
          ...row.cells,
          [columnId]: merged,
        },
      };
    }),
  };
}
function removeAttachment(doc, rowId, columnId, assetId) {
  return {
    ...doc,
    rows: doc.rows.map((row) => {
      if (row.id !== rowId) return row;
      const cell = row.cells[columnId];
      if (!Array.isArray(cell)) return row;
      const filtered = cell.filter((attachment) => attachment.assetId !== assetId);
      return {
        ...row,
        cells: {
          ...row.cells,
          [columnId]: filtered,
        },
      };
    }),
  };
}
const ROW_HEIGHT_VERTICAL_PADDING = 12;
const ROW_HEIGHT_LINE_PX = 18;
function getRowEffectiveHeightPx(doc, row) {
  if (row.height !== void 0) return row.height;
  return getRowHeightPx(doc);
}
function linesForHeightPx(heightPx) {
  const usable = Math.max(0, heightPx - ROW_HEIGHT_VERTICAL_PADDING);
  return Math.max(1, Math.floor(usable / ROW_HEIGHT_LINE_PX));
}
function setRowHeightOverride(doc, rowId, heightPx) {
  let mutated = false;
  const rows = doc.rows.map((row) => {
    if (row.id !== rowId) return row;
    if (heightPx === null) {
      if (row.height === void 0) return row;
      mutated = true;
      const { height: _drop, ...rest } = row;
      return rest;
    }
    const next = clampRowHeightPx(heightPx);
    if (row.height === next) return row;
    mutated = true;
    return {
      ...row,
      height: next,
    };
  });
  if (!mutated) return doc;
  return {
    ...doc,
    rows,
  };
}
const HEADER_HEIGHT = 36;
const ROW_HANDLE_WIDTH = 56;
const ADD_COLUMN_WIDTH = 80;
const ROW_DRAG_MIME = "application/x-table-row-id";
const DEFAULT_COLUMN_WIDTH = 200;
const MIN_COLUMN_WIDTH = 100;
const RESIZE_HANDLE_HIT = 6;
const CellRenderer = reactExports.memo(function CellRenderer({
  rowId,
  columnId,
  columnType,
  value,
  rowHeightPx,
  columnWidthPx,
  maxLines,
  apply,
}) {
  const onChange = reactExports.useCallback(
    (next) => apply((prev) => setCell(prev, rowId, columnId, next)),
    [apply, rowId, columnId],
  );
  const onAddAttachments = reactExports.useCallback(
    (picks) =>
      apply((prev) => appendAttachments(prev, rowId, columnId, picks)),
    [apply, rowId, columnId],
  );
  const onRemoveAttachment = reactExports.useCallback(
    (assetId) =>
      apply((prev) => removeAttachment(prev, rowId, columnId, assetId)),
    [apply, rowId, columnId],
  );
  if (columnType === "text") {
    const textValue = typeof value === "string" ? value : "";
    return (
      <TableCellText
        value={textValue}
        onChange={onChange}
        rowHeightPx={rowHeightPx}
        maxLines={maxLines}
      />
    );
  }
  if (columnType === "number") {
    const numberValue = typeof value === "number" ? value : null;
    return <TableCellNumber value={numberValue} onChange={onChange} />;
  }
  const list = Array.isArray(value) ? value : [];
  return (
    <TableCellAttachment
      attachments={list}
      rowHeightPx={rowHeightPx}
      columnWidthPx={columnWidthPx}
      onAdd={onAddAttachments}
      onRemove={onRemoveAttachment}
    />
  );
});
function RowToggle({ rowIndex, selected, onToggle }) {
  const { t } = useTranslation();
  return (
    <div className="relative min-h-7 w-7">
      {!selected && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] tabular-nums text-muted-foreground group-hover:opacity-0 group-focus-within:opacity-0">
          {rowIndex + 1}
        </span>
      )}
      <Checkbox
        size="sm"
        checked={selected}
        onCheckedChange={onToggle}
        aria-label={
          selected
            ? t("canvas.table.deselectRow", "Deselect")
            : t("canvas.table.selectRow", "Select")
        }
        data-action-ui-id="canvas.table.select-row"
        className={
          selected
            ? ""
            : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        }
      />
    </div>
  );
}
function RowHandle({ rowId, rowIndex, selected, onToggle }) {
  const { t } = useTranslation();
  const handleDragStart = (dragEvent) => {
    dragEvent.dataTransfer.setData(ROW_DRAG_MIME, rowId);
    dragEvent.dataTransfer.effectAllowed = "move";
    const rowElement = dragEvent.currentTarget.closest("tr");
    if (rowElement) dragEvent.dataTransfer.setDragImage(rowElement, 12, rowElement.offsetHeight / 2);
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
        title={t("canvas.table.dragRow", "Drag to reorder")}
      >
        <DragHandleIcon />
      </span>
      <RowToggle rowIndex={rowIndex} selected={selected} onToggle={onToggle} />
    </div>
  );
}
function HeaderSelectAll({ state, disabled, onToggle }) {
  const { t } = useTranslation();
  const title =
    state === "all"
      ? t("canvas.table.deselectAll", "Deselect all")
      : t("canvas.table.selectAll", "Select all");
  return (
    <div className="flex h-full w-full items-center justify-center gap-1">
      <span className="h-5 w-3 shrink-0" aria-hidden="true" />
      <Checkbox
        size="sm"
        checked={state === "all"}
        indeterminate={state === "some"}
        disabled={disabled}
        onCheckedChange={onToggle}
        title={title}
        aria-label={title}
        data-action-ui-id="canvas.table.select-all"
      />
    </div>
  );
}
function useColumnResize(apply) {
  const [previewWidth, setPreviewWidth] = reactExports.useState(null);
  const restoreBodyStylesRef = reactExports.useRef(null);
  reactExports.useEffect(
    () => () => {
      restoreBodyStylesRef.current?.();
    },
    [],
  );
  const beginColumnResize = reactExports.useCallback(
    (pointerEvent, columnId, currentWidth) => {
      pointerEvent.preventDefault();
      pointerEvent.stopPropagation();
      if (pointerEvent.button !== 0) return;
      const startX = pointerEvent.clientX;
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
      const onMove = (mouseEvent) => {
        const next = Math.max(
          MIN_COLUMN_WIDTH,
          Math.round(startWidth + (mouseEvent.clientX - startX)),
        );
        if (next === lastWidth) return;
        lastWidth = next;
        setPreviewWidth({
          id: columnId,
          width: next,
        });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        restore();
        setPreviewWidth(null);
        if (lastWidth !== startWidth) {
          apply((prev) => resizeColumn(prev, columnId, lastWidth));
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [apply],
  );
  return {
    previewWidth,
    beginColumnResize,
  };
}
function ColumnResizeHandle({
  active,
  onPointerDown,
}) {
  const { t } = useTranslation();
  return (
    // Mouse-only resize affordance: there is no keyboard equivalent (column
    // widths are derived from drag delta), and the 6px hit zone is invisible
    // — exposing a fake separator role only mislead screen readers, so we
    // keep it as a plain decorative div and rely on the cursor + tooltip.
    // biome-ignore lint/a11y/noStaticElementInteractions: mouse-only resize affordance, no keyboard equivalent.
    <div
      onPointerDown={onPointerDown}
      onDoubleClick={(clickEvent) => clickEvent.preventDefault()}
      title={t("canvas.table.resizeColumn", "Resize column")}
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
          background: active ? "var(--canvas-accent, #3b82f6)" : "transparent",
        }}
      />
    </div>
  );
}
function useRowResize(apply) {
  const [previewRowHeight, setPreviewRowHeight] = reactExports.useState(null);
  const restoreBodyStylesRef = reactExports.useRef(null);
  reactExports.useEffect(
    () => () => {
      restoreBodyStylesRef.current?.();
    },
    [],
  );
  const beginRowResize = reactExports.useCallback(
    (pointerEvent, rowId, currentHeight) => {
      pointerEvent.preventDefault();
      pointerEvent.stopPropagation();
      if (pointerEvent.button !== 0) return;
      const startY = pointerEvent.clientY;
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
        const next = Math.max(
          MIN_ROW_HEIGHT_PX,
          Math.min(
            MAX_ROW_HEIGHT_PX,
            Math.round(startHeight + (ev.clientY - startY)),
          ),
        );
        if (next === lastHeight) return;
        lastHeight = next;
        setPreviewRowHeight({
          id: rowId,
          height: next,
        });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        restore();
        setPreviewRowHeight(null);
        if (lastHeight !== startHeight) {
          apply((prev) => setRowHeightOverride(prev, rowId, lastHeight));
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [apply],
  );
  return {
    previewRowHeight,
    beginRowResize,
  };
}
function RowResizeHandle({
  active,
  width,
  onPointerDown,
}) {
  const { t } = useTranslation();
  return (
    // Mouse-only resize affordance: there is no keyboard equivalent, and the
    // 6px hit zone is invisible — exposing a fake separator role only misleads
    // screen readers, so we keep it as a plain decorative div.
    // biome-ignore lint/a11y/noStaticElementInteractions: mouse-only resize affordance, no keyboard equivalent.
    <div
      onPointerDown={onPointerDown}
      onDoubleClick={(clickEvent) => clickEvent.preventDefault()}
      title={t("canvas.table.resizeRow", "Resize row")}
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
          background: active ? "var(--canvas-accent, #3b82f6)" : "transparent",
        }}
      />
    </div>
  );
}
function FieldTypeIcon({ type }) {
  if (type === "number") {
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
  if (type === "attachment") return <PaperclipIcon />;
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
  const { t } = useTranslation();
  const [editing, setEditing] = reactExports.useState(false);
  const inputRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!editing) return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [editing]);
  const commitEdit = () => {
    const next = inputRef.current?.value ?? column.title;
    setEditing(false);
    if (next.trim() !== column.title) onRename(next);
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
          onKeyDown={(keyboardEvent) => {
            keyboardEvent.stopPropagation();
            if (keyboardEvent.key === "Enter") {
              keyboardEvent.preventDefault();
              commitEdit();
            } else if (keyboardEvent.key === "Escape") {
              keyboardEvent.preventDefault();
              setEditing(false);
            }
          }}
          onClick={(clickEvent) => clickEvent.stopPropagation()}
          onDoubleClick={(clickEvent) => clickEvent.stopPropagation()}
          onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
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
          title={t("canvas.table.field.edit", "Edit")}
          className="flex h-full min-w-0 flex-1 cursor-text select-none items-center"
        >
          <span className="block min-w-0 flex-1 truncate">
            {column.title || t("canvas.table.untitledColumn", "Untitled")}
          </span>
        </span>
      )}
    </span>
  );
}
export function TableEditorInner({
  history: tableHistory,
  selectedRowIds,
  onSelectionChange,
}) {
  const { t } = useTranslation();
  const { doc, apply } = tableHistory;
  const [showAddColumn, setShowAddColumn] = reactExports.useState(false);
  const scrollRef = reactExports.useRef(null);
  const visible = reactExports.useMemo(() => visibleColumns(doc), [doc]);
  const filteredRows = reactExports.useMemo(() => applyFilter(doc), [doc]);
  const rowHeightPx = getRowHeightPx(doc);
  const rowHeightLines = getRowHeightLines(doc);
  const { previewWidth, beginColumnResize } = useColumnResize(apply);
  const widthOf = reactExports.useCallback(
    (column) => {
      if (previewWidth && previewWidth.id === column.id)
        return previewWidth.width;
      return column.width ?? DEFAULT_COLUMN_WIDTH;
    },
    [previewWidth],
  );
  const { previewRowHeight, beginRowResize } = useRowResize(apply);
  const heightOf = reactExports.useCallback(
    (row) => {
      if (previewRowHeight && previewRowHeight.id === row.id)
        return previewRowHeight.height;
      return getRowEffectiveHeightPx(doc, row);
    },
    [previewRowHeight, doc],
  );
  const columnDefs = reactExports.useMemo(() => {
    return visible.map((column) => ({
      id: column.id,
      header: () => (
        <ColumnHeader
          column={column}
          onRename={(next) =>
            apply((prev) => renameColumn(prev, column.id, next))
          }
        />
      ),
      size: column.width ?? DEFAULT_COLUMN_WIDTH,
      cell: (info) => {
        const rowOriginal = info.row.original;
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
            apply={apply}
          />
        );
      },
    }));
  }, [visible, apply, rowHeightPx, rowHeightLines]);
  const table = useReactTable({
    data: filteredRows,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });
  const totalColumnWidth = visible.reduce((sum, column) => sum + widthOf(column), 0);
  const tableMinWidth = ROW_HANDLE_WIDTH + totalColumnWidth + ADD_COLUMN_WIDTH;
  const toggleRowSelection = reactExports.useCallback(
    (rowId) => {
      const next = new Set(selectedRowIds);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      onSelectionChange(next);
    },
    [selectedRowIds, onSelectionChange],
  );
  const visibleRowIds = reactExports.useMemo(
    () => filteredRows.map((row) => row.id),
    [filteredRows],
  );
  const selectedVisibleCount = reactExports.useMemo(
    () =>
      visibleRowIds.reduce(
        (count, id) => (selectedRowIds.has(id) ? count + 1 : count),
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
    ({ title, type }) => {
      apply((prev) =>
        addColumn(prev, {
          title,
          type,
        }),
      );
      setShowAddColumn(false);
    },
    [apply],
  );
  const handleAddRow = reactExports.useCallback(() => {
    apply((prev) => addRow(prev));
  }, [apply]);
  const [rowDragOver, setRowDragOver] = reactExports.useState(null);
  const handleRowDragOver = reactExports.useCallback((rowId, dragEvent) => {
    if (!dragEvent.dataTransfer.types.includes(ROW_DRAG_MIME)) return;
    dragEvent.preventDefault();
    dragEvent.dataTransfer.dropEffect = "move";
    const rect = dragEvent.currentTarget.getBoundingClientRect();
    const isAfter = dragEvent.clientY > rect.top + rect.height / 2;
    setRowDragOver((prev) =>
      prev?.rowId === rowId && prev.edge === (isAfter ? "after" : "before")
        ? prev
        : {
            rowId,
            edge: isAfter ? "after" : "before",
          },
    );
  }, []);
  const handleRowDragLeave = reactExports.useCallback((dragEvent) => {
    if (!dragEvent.currentTarget.contains(dragEvent.relatedTarget)) {
      setRowDragOver(null);
    }
  }, []);
  const handleRowDrop = reactExports.useCallback(
    (rowId, dragEvent) => {
      const fromId = dragEvent.dataTransfer.getData(ROW_DRAG_MIME);
      const edge = rowDragOver?.edge ?? "before";
      setRowDragOver(null);
      if (!fromId || fromId === rowId) return;
      dragEvent.preventDefault();
      apply((prev) => moveRow(prev, fromId, rowId, edge));
    },
    [apply, rowDragOver],
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
                {visible.map((column) => (
                  <col
                    key={column.id}
                    style={{
                      width: widthOf(column),
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
                  {table.getHeaderGroups()[0]?.headers.map((header) => {
                    const column = visible.find(
                      (column) => column.id === header.column.id,
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
                            onPointerDown={(pointerEvent) =>
                              beginColumnResize(pointerEvent, column.id, widthOf(column))
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
                      title={t("canvas.table.addColumn", "Add column")}
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
                {table.getRowModel().rows.length === 0 ? (
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
                      {t(
                        "canvas.table.noRows",
                        "No rows yet — click + below to add one",
                      )}
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => {
                    const isSelected = selectedRowIds.has(row.id);
                    const isDropTarget = rowDragOver?.rowId === row.id;
                    const dropEdge = isDropTarget ? rowDragOver?.edge : null;
                    const rowEffectivePx = heightOf(row.original);
                    const isResizingThisRow = previewRowHeight?.id === row.id;
                    return (
                      <tr
                        key={row.id}
                        className="group"
                        onDragOver={(dragEvent) => handleRowDragOver(row.id, dragEvent)}
                        onDragLeave={handleRowDragLeave}
                        onDrop={(dragEvent) => handleRowDrop(row.id, dragEvent)}
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
                            onPointerDown={(pointerEvent) =>
                              beginRowResize(pointerEvent, row.id, rowEffectivePx)
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
                      <span>{t("canvas.table.addRow", "Add row")}</span>
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
