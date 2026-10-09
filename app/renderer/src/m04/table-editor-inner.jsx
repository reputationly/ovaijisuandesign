// table-editor-inner.jsx
import { jsxRuntimeExports, reactExports, CompositedSvg, useTranslation, reactDomExports } from "../vendor.js";
import { useDevicePixelRatio } from "../m15/deep-freeze.js";
import { useCanvasActive } from "../m15/parse-item.jsx";
import { useTableHistory } from "../m15/use-diff-review-store.js";
import { CloseIcon$1 } from "../m01/generating-media-area.jsx";
import { Checkbox } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import {
  addColumn$1,
  addRow$1,
  MIN_ROW_HEIGHT_PX,
  MAX_ROW_HEIGHT_PX,
  createEmptyDocument,
} from "../m01/prune-persisted-node-data.js";
import { RESOURCE_DRAG_MIME } from "../m01/myers-line-hunks.js";
import { setCell } from "../m01/table-document-to-llm-content.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { createRow } from "./column-filtering.js";
import {
  AddColumnDialog,
  DragHandleIcon,
  FieldConfigPanel,
  FilterPanel,
  PaperclipIcon,
  PlusIcon$1,
  RowHeightPanel,
  TableCellAttachment,
  TableCellNumber,
  TableCellText,
  TrashIcon,
  appendAttachments,
  applyFilter,
  getMemoOptions,
  getRowEffectiveHeightPx,
  getRowHeightLines,
  getRowHeightPx,
  linesForHeightPx,
  memo$1,
  moveRow,
  removeAttachment,
  removeRow$1,
  renameColumn,
  resizeColumn,
  setRowHeightOverride,
  visibleColumns,
} from "./ready-sub-video-card.jsx";
import { createTable$1 } from "./row-sorting.js";
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
              row.originalSubRows = table2.options.getSubRows(originalRows[i2], i2);
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
function flexRender(Comp, props) {
  return !Comp ? null : isReactComponent(Comp) ? reactExports.createElement(Comp, props) : Comp;
}
function isReactComponent(component) {
  return (
    isClassComponent(component) || typeof component === "function" || isExoticComponent(component)
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
    current: createTable$1(resolvedOptions),
  }));
  const [state2, setState] = reactExports.useState(() => tableRef.current.initialState);
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
const MIN_THUMB_PX = 24;
const TRACK_THICKNESS = 10;
const EDGE_GAP = 3;
function OverlayScrollbarInner({ targetRef, orientation, placement = "overlay" }) {
  const horizontal = orientation === "horizontal";
  const sticky = horizontal && placement === "sticky";
  const [metrics, setMetrics] = reactExports.useState(null);
  const [dragging, setDragging] = reactExports.useState(false);
  const activeDragRef = reactExports.useRef(null);
  const cleanupActiveDrag = reactExports.useCallback((updateDraggingState) => {
    const activeDrag = activeDragRef.current;
    if (!activeDrag) return;
    window.removeEventListener("pointermove", activeDrag.onMove);
    window.removeEventListener("pointerup", activeDrag.onEnd);
    window.removeEventListener("pointercancel", activeDrag.onEnd);
    document.body.style.userSelect = activeDrag.previousUserSelect;
    activeDragRef.current = null;
    if (updateDraggingState) setDragging(false);
  }, []);
  reactExports.useEffect(() => () => cleanupActiveDrag(false), [cleanupActiveDrag]);
  const measure = reactExports.useCallback(() => {
    const el = targetRef.current;
    if (!el) return;
    const client2 = horizontal ? el.clientWidth : el.clientHeight;
    const scrollSize = horizontal ? el.scrollWidth : el.scrollHeight;
    if (scrollSize <= client2 + 1) {
      setMetrics(null);
      return;
    }
    const trackPx = client2 - EDGE_GAP * 2 - TRACK_THICKNESS;
    const thumbPx = Math.max(MIN_THUMB_PX, Math.round((client2 / scrollSize) * trackPx));
    const maxOffset2 = trackPx - thumbPx;
    const maxScroll = scrollSize - client2;
    const scrollPos = horizontal ? el.scrollLeft : el.scrollTop;
    const offsetPx = maxScroll > 0 ? (scrollPos / maxScroll) * maxOffset2 : 0;
    setMetrics((prev) =>
      prev && prev.trackPx === trackPx && prev.thumbPx === thumbPx && prev.offsetPx === offsetPx
        ? prev
        : {
            trackPx,
            thumbPx,
            offsetPx,
          },
    );
  }, [targetRef, horizontal]);
  reactExports.useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const onScroll = () => measure();
    el.addEventListener("scroll", onScroll, {
      passive: true,
    });
    return () => el.removeEventListener("scroll", onScroll);
  }, [targetRef, measure]);
  reactExports.useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [targetRef, measure]);
  const beginThumbDrag = reactExports.useCallback(
    (e2) => {
      e2.preventDefault();
      e2.stopPropagation();
      if (e2.button !== 0) return;
      const el = targetRef.current;
      if (!el || !metrics) return;
      const startPos = horizontal ? e2.clientX : e2.clientY;
      const startScroll = horizontal ? el.scrollLeft : el.scrollTop;
      const client2 = horizontal ? el.clientWidth : el.clientHeight;
      const scrollSize = horizontal ? el.scrollWidth : el.scrollHeight;
      const maxScroll = scrollSize - client2;
      const maxOffset2 = metrics.trackPx - metrics.thumbPx;
      cleanupActiveDrag(false);
      setDragging(true);
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = "none";
      const onMove = (ev) => {
        if (maxOffset2 <= 0) return;
        const delta = (horizontal ? ev.clientX : ev.clientY) - startPos;
        const next2 = startScroll + (delta / maxOffset2) * maxScroll;
        if (horizontal) el.scrollLeft = next2;
        else el.scrollTop = next2;
      };
      const onEnd = () => cleanupActiveDrag(true);
      activeDragRef.current = {
        onMove,
        onEnd,
        previousUserSelect,
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
    },
    [targetRef, metrics, horizontal, cleanupActiveDrag],
  );
  const handleTrackPointerDown = reactExports.useCallback(
    (e2) => {
      if (e2.button !== 0) return;
      e2.preventDefault();
      e2.stopPropagation();
      const el = targetRef.current;
      if (!el || !metrics) return;
      const rect = e2.currentTarget.getBoundingClientRect();
      const clickPos = horizontal ? e2.clientX - rect.left : e2.clientY - rect.top;
      const maxOffset2 = metrics.trackPx - metrics.thumbPx;
      if (maxOffset2 <= 0) return;
      const client2 = horizontal ? el.clientWidth : el.clientHeight;
      const scrollSize = horizontal ? el.scrollWidth : el.scrollHeight;
      const targetOffset = Math.max(0, Math.min(maxOffset2, clickPos - metrics.thumbPx / 2));
      const next2 = (targetOffset / maxOffset2) * (scrollSize - client2);
      if (horizontal) el.scrollLeft = next2;
      else el.scrollTop = next2;
    },
    [targetRef, metrics, horizontal],
  );
  if (!metrics) return null;
  const trackStyle = horizontal
    ? sticky
      ? {
          width: `calc(100% - ${EDGE_GAP * 2 + TRACK_THICKNESS}px)`,
          marginLeft: EDGE_GAP,
          bottom: 0,
          height: TRACK_THICKNESS,
        }
      : {
          left: EDGE_GAP,
          right: EDGE_GAP + TRACK_THICKNESS,
          bottom: 0,
          height: TRACK_THICKNESS,
        }
    : {
        top: EDGE_GAP,
        bottom: EDGE_GAP + TRACK_THICKNESS,
        right: 0,
        width: TRACK_THICKNESS,
      };
  const thumbStyle = horizontal
    ? {
        width: metrics.thumbPx,
        height: 6,
        transform: `translateX(${metrics.offsetPx}px)`,
      }
    : {
        height: metrics.thumbPx,
        width: 6,
        transform: `translateY(${metrics.offsetPx}px)`,
      };
  return (
    // Pointer-only affordance mirroring a native scrollbar; keyboard users
    // scroll the container directly (arrow / PageUp / PageDown still work).
    <div
      aria-hidden="true"
      contentEditable={false}
      onPointerDown={handleTrackPointerDown}
      className={`hilo-overlay-scrollbar-track ${sticky ? "sticky" : "absolute"} z-30 flex select-none`}
      data-orientation={orientation}
      data-placement={sticky ? "sticky" : "overlay"}
      style={{
        ...trackStyle,
        ...(sticky
          ? {
              background: "var(--canvas-node-bg, #fff)",
            }
          : {}),
        alignItems: horizontal ? "flex-end" : "center",
        justifyContent: horizontal ? "flex-start" : "flex-end",
        flexDirection: horizontal ? "row" : "column",
        pointerEvents: "auto",
      }}
    >
      <div
        onPointerDown={beginThumbDrag}
        className={`hilo-overlay-scrollbar-thumb rounded-full ${dragging ? "dragging" : ""}`}
        style={{
          ...thumbStyle,
          marginBottom: horizontal ? 2 : 0,
          marginRight: horizontal ? 0 : 2,
        }}
      />
    </div>
  );
}
export const OverlayScrollbar = reactExports.memo(OverlayScrollbarInner);
const HEADER_HEIGHT$1 = 36;
const ROW_HANDLE_WIDTH = 56;
const ADD_COLUMN_WIDTH = 80;
const ROW_DRAG_MIME = "application/x-table-row-id";
const DEFAULT_COLUMN_WIDTH = 200;
const MIN_COLUMN_WIDTH = 100;
const RESIZE_HANDLE_HIT = 6;
function TableEditorInner({ history: history2, selectedRowIds, onSelectionChange }) {
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
      if (previewWidth && previewWidth.id === column.id) return previewWidth.width;
      return column.width ?? DEFAULT_COLUMN_WIDTH;
    },
    [previewWidth],
  );
  const { previewRowHeight, beginRowResize } = useRowResize(apply2);
  const heightOf = reactExports.useCallback(
    (row) => {
      if (previewRowHeight && previewRowHeight.id === row.id) return previewRowHeight.height;
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
          onRename={(next2) => apply2((prev) => renameColumn(prev, column.id, next2))}
        />
      ),
      size: column.width ?? DEFAULT_COLUMN_WIDTH,
      cell: (info2) => {
        const rowOriginal = info2.row.original;
        const effectivePx = rowOriginal.height ?? rowHeightPx;
        const effectiveLines =
          effectivePx === rowHeightPx ? rowHeightLines : linesForHeightPx(effectivePx);
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
  const visibleRowIds = reactExports.useMemo(() => filteredRows.map((r2) => r2.id), [filteredRows]);
  const selectedVisibleCount = reactExports.useMemo(
    () => visibleRowIds.reduce((n2, id2) => (selectedRowIds.has(id2) ? n2 + 1 : n2), 0),
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
    onSelectionChange(headerSelectionState === "all" ? new Set() : new Set(visibleRowIds));
  }, [visibleRowIds, headerSelectionState, onSelectionChange]);
  const handleCommitColumn = reactExports.useCallback(
    ({ title, type: type2 }) => {
      apply2((prev) =>
        addColumn$1(prev, {
          title,
          type: type2,
        }),
      );
      setShowAddColumn(false);
    },
    [apply2],
  );
  const handleAddRow = reactExports.useCallback(() => {
    apply2((prev) => addRow$1(prev));
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
        <div ref={scrollRef} className="native-scrollbar-hidden h-full w-full overflow-auto">
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
                    height: HEADER_HEIGHT$1,
                  }}
                >
                  <th
                    style={{
                      background: "var(--bg-subtle, #fafafa)",
                      borderBottom: "1px solid var(--canvas-node-border, #e0e0e0)",
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
                    const column = visible.find((c3) => c3.id === header.column.id);
                    return (
                      <th
                        key={header.id}
                        className="relative border-b px-2 text-left font-normal"
                        style={{
                          background: "var(--bg-subtle, #fafafa)",
                          borderColor: "var(--canvas-node-border, #e0e0e0)",
                          color: "var(--fg-muted, #525252)",
                          borderRight: "1px solid var(--canvas-node-border, #e0e0e0)",
                        }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
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
                      height: HEADER_HEIGHT$1,
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
                        height: HEADER_HEIGHT$1,
                      }}
                    >
                      <PlusIcon$1 />
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
                        borderBottom: "1px solid var(--canvas-node-border, #e0e0e0)",
                      }}
                    >
                      {t2("canvas.table.noRows", "No rows yet — click + below to add one")}
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
                          background: isSelected ? "var(--bg-subtle, #f5f5f5)" : "transparent",
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
                            onPointerDown={(e2) => beginRowResize(e2, row.id, rowEffectivePx)}
                          />
                        </td>
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="border-b"
                            style={{
                              borderColor: "var(--canvas-node-border, #e0e0e0)",
                              borderRight: "1px solid var(--canvas-node-border, #e0e0e0)",
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
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
                          <PlusIcon$1 />
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
        <AddColumnDialog onCommit={handleCommitColumn} onClose={() => setShowAddColumn(false)} />
      )}
    </div>
  );
}
const TableEditor = reactExports.memo(TableEditorInner);
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
    (picks) => apply2((prev) => appendAttachments(prev, rowId, columnId, picks)),
    [apply2, rowId, columnId],
  );
  const onRemoveAttachment = reactExports.useCallback(
    (assetId) => apply2((prev) => removeAttachment(prev, rowId, columnId, assetId)),
    [apply2, rowId, columnId],
  );
  if (columnType === "text") {
    const v2 = typeof value === "string" ? value : "";
    return (
      <TableCellText value={v2} onChange={onChange} rowHeightPx={rowHeightPx} maxLines={maxLines} />
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
        className={selected2 ? "" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}
      />
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
        const next2 = Math.max(MIN_COLUMN_WIDTH, Math.round(startWidth + (ev.clientX - startX)));
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
function ColumnResizeHandle({ active: active2, onPointerDown: onPointerDown2 }) {
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
          Math.min(MAX_ROW_HEIGHT_PX, Math.round(startHeight + (ev.clientY - startY))),
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
function RowResizeHandle({ active: active2, width, onPointerDown: onPointerDown2 }) {
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
function useBackdropDismiss(onDismiss) {
  const downOnBackdropRef = reactExports.useRef(false);
  const onMouseDown = reactExports.useCallback((e2) => {
    downOnBackdropRef.current = e2.target === e2.currentTarget;
  }, []);
  const onClick = reactExports.useCallback(
    (e2) => {
      const downOnBackdrop = downOnBackdropRef.current;
      downOnBackdropRef.current = false;
      if (downOnBackdrop && e2.target === e2.currentTarget) onDismiss();
    },
    [onDismiss],
  );
  return {
    onMouseDown,
    onClick,
  };
}
function TableToolbarInner({
  title,
  onTitleChange,
  history: history2,
  onClose,
  selectedCount,
  onRemoveSelected,
}) {
  const { t: t2 } = useTranslation();
  const [draft, setDraft] = reactExports.useState(title);
  const [openPanel, setOpenPanel] = reactExports.useState(null);
  reactExports.useEffect(() => setDraft(title), [title]);
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== title) onTitleChange(trimmed || title);
  };
  const filterActive = !!history2.doc.filter && history2.doc.filter.conditions.length > 0;
  return (
    <div
      className="relative flex shrink-0 items-center gap-2 px-4 py-2.5"
      style={{
        borderBottom: "1px solid var(--canvas-node-border, #e0e0e0)",
      }}
    >
      <input
        type="text"
        value={draft}
        onChange={(e2) => setDraft(e2.target.value)}
        onBlur={commit}
        onKeyDown={(e2) => {
          if (e2.key === "Enter") {
            e2.preventDefault();
            e2.currentTarget.blur();
          }
          if (e2.key === "Escape") {
            e2.preventDefault();
            setDraft(title);
            e2.currentTarget.blur();
          }
          e2.stopPropagation();
        }}
        placeholder={t2("canvas.table.untitled", "Untitled table")}
        className="shrink-0 truncate bg-transparent text-[14px] font-medium outline-none border-0 [border-bottom-width:var(--control-border-width)] border-solid border-b-transparent transition-colors hover:border-b-[var(--canvas-node-border,#e0e0e0)] focus:border-b-[var(--fg-default,#141414)]"
        style={{
          width: 200,
          color: "var(--fg-default, #141414)",
        }}
        title={title}
      />
      <div className="flex-1 min-w-0" />
      <div className="relative flex items-center gap-0.5">
        {selectedCount > 0 && (
          <>
            <button
              type="button"
              onClick={onRemoveSelected}
              className="flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium transition-colors"
              style={{
                color: "#dc2626",
                background: "rgba(220, 38, 38, 0.08)",
              }}
              title={t2("canvas.table.removeSelected", {
                defaultValue: "Remove ({{count}})",
                count: selectedCount,
              })}
            >
              <TrashIcon size={13} />
              <span>
                {t2("canvas.table.removeSelected", {
                  defaultValue: "Remove ({{count}})",
                  count: selectedCount,
                })}
              </span>
            </button>
            <div
              className="mx-1 h-4 w-px"
              style={{
                background: "var(--canvas-node-border, #e0e0e0)",
              }}
            />
          </>
        )}
        <div className="relative">
          <ToolbarButton$2
            title={t2("canvas.table.fieldConfig", "Field configuration")}
            label={t2("canvas.table.fieldConfig", "Field configuration")}
            onClick={() => setOpenPanel((p3) => (p3 === "fields" ? null : "fields"))}
            active={openPanel === "fields"}
          >
            <SettingsIcon />
          </ToolbarButton$2>
          {openPanel === "fields" && (
            <FieldConfigPanel history={history2} align="left" onClose={() => setOpenPanel(null)} />
          )}
        </div>
        <div className="relative">
          <ToolbarButton$2
            title={t2("canvas.table.filter", "Filter")}
            label={t2("canvas.table.filter", "Filter")}
            onClick={() => setOpenPanel((p3) => (p3 === "filter" ? null : "filter"))}
            active={openPanel === "filter" || filterActive}
            dot={filterActive}
          >
            <FilterIcon />
          </ToolbarButton$2>
          {openPanel === "filter" && (
            <FilterPanel history={history2} align="right" onClose={() => setOpenPanel(null)} />
          )}
        </div>
        <div className="relative">
          <ToolbarButton$2
            title={t2("canvas.table.rowHeight", "Row height")}
            label={t2("canvas.table.rowHeight", "Row height")}
            onClick={() => setOpenPanel((p3) => (p3 === "rowHeight" ? null : "rowHeight"))}
            active={openPanel === "rowHeight"}
          >
            <RowHeightIcon />
          </ToolbarButton$2>
          {openPanel === "rowHeight" && (
            <RowHeightPanel history={history2} align="right" onClose={() => setOpenPanel(null)} />
          )}
        </div>
        <div
          className="mx-1 h-4 w-px"
          style={{
            background: "var(--canvas-node-border, #e0e0e0)",
          }}
        />
        <ToolbarButton$2
          title={t2("canvas.undo", "Undo")}
          onClick={history2.undo}
          disabled={!history2.canUndo}
        >
          <UndoIcon />
        </ToolbarButton$2>
        <ToolbarButton$2
          title={t2("canvas.redo", "Redo")}
          onClick={history2.redo}
          disabled={!history2.canRedo}
        >
          <RedoIcon />
        </ToolbarButton$2>
        <div
          className="mx-1 h-4 w-px"
          style={{
            background: "var(--canvas-node-border, #e0e0e0)",
          }}
        />
        <ToolbarButton$2 title={t2("canvas.close", "Close")} onClick={onClose}>
          <CloseIcon$1 />
        </ToolbarButton$2>
      </div>
    </div>
  );
}
const TableToolbar = reactExports.memo(TableToolbarInner);
function ToolbarButton$2({
  title,
  label,
  onClick,
  disabled: disabled2,
  active: active2,
  dot: dot2,
  children: children2,
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled2}
      onClick={onClick}
      className={
        label
          ? "relative flex h-7 items-center gap-1 rounded-md px-2 text-[12px] transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)] disabled:cursor-not-allowed disabled:opacity-30"
          : "relative flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)] disabled:cursor-not-allowed disabled:opacity-30"
      }
      style={{
        color: "var(--fg-muted, #666)",
        background: active2 ? "var(--bg-subtle, #f5f5f5)" : void 0,
      }}
    >
      {children2}
      {label && <span>{label}</span>}
      {dot2 && (
        <span
          className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full"
          style={{
            background: "#3b82f6",
          }}
        />
      )}
    </button>
  );
}
function RowHeightIcon() {
  return (
    <CompositedSvg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19 2.5a1 1 0 0 1 .76.35l3 3.5a1 1 0 0 1-1.52 1.3L20 6.204v11.594l1.24-1.448a1 1 0 1 1 1.52 1.302l-3 3.5a1 1 0 0 1-1.52 0l-3-3.5a1 1 0 1 1 1.52-1.302L18 17.797V6.203l-1.24 1.448a1 1 0 0 1-1.52-1.302l3-3.5A1 1 0 0 1 19 2.5ZM2 4a1 1 0 0 0 0 2h9a1 1 0 1 0 0-2H2Zm0 7a1 1 0 1 0 0 2h9a1 1 0 1 0 0-2H2Zm-1 8a1 1 0 0 1 1-1h9a1 1 0 1 1 0 2H2a1 1 0 0 1-1-1Z"
      />
    </CompositedSvg>
  );
}
function SettingsIcon() {
  return (
    <CompositedSvg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="2" />
      <path
        d="M13 8a5.4 5.4 0 00-.1-1l1.4-1-1.4-2.4-1.6.5a5.3 5.3 0 00-1.7-1L9.5 1.5h-3l-.1 1.6a5.3 5.3 0 00-1.7 1l-1.6-.5L1.7 6l1.4 1A5.4 5.4 0 003 8c0 .3 0 .7.1 1l-1.4 1L3.1 12.4l1.6-.5a5.3 5.3 0 001.7 1l.1 1.6h3l.1-1.6a5.3 5.3 0 001.7-1l1.6.5L14.3 10l-1.4-1c.1-.3.1-.7.1-1z"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
function FilterIcon() {
  return (
    <CompositedSvg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="m13 11.5 4.573-3.201a1 1 0 0 0 .427-.82V4a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v3.48a1 1 0 0 0 .427.819L6 11.5v7.181a2 2 0 0 0 1.212 1.838l4.394 1.884a1 1 0 0 0 1.394-.92V11.5Zm-5-1.041-5-3.5V4h13v2.959l-5 3.5v9.508L8 18.68v-8.22Z"
      />
      <path
        fill="currentColor"
        d="M15 14a1 1 0 0 1 1-1h5a1 1 0 1 1 0 2h-5a1 1 0 0 1-1-1Zm1 3a1 1 0 1 0 0 2h3a1 1 0 1 0 0-2h-3Z"
      />
    </CompositedSvg>
  );
}
function UndoIcon() {
  return (
    <CompositedSvg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.707 2.293a1 1 0 0 1 0 1.414L5.414 7H14.5a7.5 7.5 0 0 1 0 15H11a1 1 0 1 1 0-2h3.5a5.5 5.5 0 1 0 0-11H5.414l3.293 3.293a1 1 0 1 1-1.414 1.414l-5-5a1 1 0 0 1 0-1.414l5-5a1 1 0 0 1 1.414 0Z"
      />
    </CompositedSvg>
  );
}
function RedoIcon() {
  return (
    <CompositedSvg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M15.293 2.293a1 1 0 0 0 0 1.414L18.586 7H9.5a7.5 7.5 0 0 0 0 15H13a1 1 0 1 0 0-2H9.5a5.5 5.5 0 1 1 0-11h9.086l-3.293 3.293a1 1 0 0 0 1.414 1.414l5-5a1 1 0 0 0 0-1.414l-5-5a1 1 0 0 0-1.414 0Z"
      />
    </CompositedSvg>
  );
}
Object.prototype.constructor.toString();
const NOOP_TITLE_CHANGE = () => {};
export function TableFullscreenInner({ initialDoc, title, onClose, onTitleChange }) {
  const { t: t2 } = useTranslation();
  const active2 = useCanvasActive();
  const startDoc = initialDoc ?? createEmptyDocument();
  const history2 = useTableHistory(startDoc);
  const baselineDocRef = reactExports.useRef(startDoc);
  const [selectedRowIds, setSelectedRowIds] = reactExports.useState(() => new Set());
  const validSelectedRowIds = reactExports.useMemo(() => {
    if (selectedRowIds.size === 0) return selectedRowIds;
    const live = new Set(history2.doc.rows.map((r2) => r2.id));
    let drift = false;
    const next2 = new Set();
    for (const id2 of selectedRowIds) {
      if (live.has(id2)) next2.add(id2);
      else drift = true;
    }
    return drift ? next2 : selectedRowIds;
  }, [selectedRowIds, history2.doc.rows]);
  const handleDeleteSelected = reactExports.useCallback(() => {
    if (validSelectedRowIds.size === 0) return;
    history2.apply((prev) => {
      let next2 = prev;
      for (const id2 of validSelectedRowIds) {
        next2 = removeRow$1(next2, id2);
      }
      return next2;
    });
    setSelectedRowIds(new Set());
  }, [validSelectedRowIds, history2]);
  const handleClose = reactExports.useCallback(() => {
    const next2 = history2.doc;
    onClose(next2 === baselineDocRef.current ? void 0 : next2);
  }, [history2.doc, onClose]);
  const panelRef = reactExports.useRef(null);
  const handlePanelDragLeave = reactExports.useCallback(
    (event) => {
      const panel = panelRef.current;
      if (!panel) return;
      if (!event.dataTransfer.types.includes(RESOURCE_DRAG_MIME)) return;
      const related = event.relatedTarget;
      if (related && panel.contains(related)) return;
      handleClose();
    },
    [handleClose],
  );
  reactExports.useEffect(() => {
    if (!active2) return;
    const isInEditor = (target) =>
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
    const captureHandler = (e2) => {
      if (e2.key !== "Delete" && e2.key !== "Backspace") return;
      if (isInEditor(e2.target)) return;
      e2.stopPropagation();
      e2.stopImmediatePropagation();
    };
    const handler = (e2) => {
      if (e2.key === "Escape") {
        if (isInEditor(e2.target)) return;
        e2.stopPropagation();
        handleClose();
        return;
      }
      const meta2 = e2.metaKey || e2.ctrlKey;
      if (meta2 && (e2.key === "z" || e2.key === "Z")) {
        if (isInEditor(e2.target)) return;
        e2.stopPropagation();
        e2.preventDefault();
        if (e2.shiftKey) history2.redo();
        else history2.undo();
        return;
      }
      if (meta2 && (e2.key === "y" || e2.key === "Y")) {
        if (isInEditor(e2.target)) return;
        e2.stopPropagation();
        e2.preventDefault();
        history2.redo();
        return;
      }
      if (meta2 || (e2.shiftKey && (e2.code === "Digit1" || e2.code === "Digit2"))) {
        e2.stopPropagation();
      }
    };
    document.addEventListener("keydown", captureHandler, true);
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", captureHandler, true);
      document.removeEventListener("keydown", handler);
    };
  }, [active2, handleClose, history2]);
  const backdrop = useBackdropDismiss(handleClose);
  const dpr = useDevicePixelRatio();
  const cap2 =
    dpr >= 2
      ? {
          w: 2400,
          h: 1400,
        }
      : {
          w: 1600,
          h: 900,
        };
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key handled via document listener
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-[4px] animate-[lightbox-fade-in_0.15s_ease-out]"
      onMouseDown={backdrop.onMouseDown}
      onClick={backdrop.onClick}
    >
      <div
        ref={panelRef}
        className="flex flex-col rounded-xl overflow-hidden shadow-2xl animate-[lightbox-fade-in_0.15s_ease-out]"
        style={{
          width: `min(${cap2.w}px, 80vw)`,
          height: `min(${cap2.h}px, 92vh)`,
          background: "var(--canvas-node-bg, #fff)",
          border: "1px solid var(--canvas-node-border, #e0e0e0)",
        }}
        onKeyDown={(e2) => e2.stopPropagation()}
        onKeyUp={(e2) => e2.stopPropagation()}
        onClick={(e2) => e2.stopPropagation()}
        onDragLeave={handlePanelDragLeave}
      >
        <TableToolbar
          title={title || t2("canvas.table.untitled", "Untitled table")}
          onTitleChange={onTitleChange ?? NOOP_TITLE_CHANGE}
          history={history2}
          onClose={handleClose}
          selectedCount={validSelectedRowIds.size}
          onRemoveSelected={handleDeleteSelected}
        />
        <div className="flex-1 overflow-hidden">
          <TableEditor
            history={history2}
            selectedRowIds={validSelectedRowIds}
            onSelectionChange={setSelectedRowIds}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
