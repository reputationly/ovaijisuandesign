// table-node-inner.jsx
import { classifyFileType, CompositedSvg, jsxRuntimeExports, reactDomExports, reactExports, useTranslation } from "../vendor.js";
import { dedupedToast, useAssetMetadataStore } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  attachmentThumbnailUrl,
  defaultOpForFieldType,
  getRowHeight,
  getRowHeightLines,
  getRowHeightPx,
  moveItem,
  operatorsForFieldType,
  OPS_REQUIRING_VALUE,
  PaperclipIcon,
  PlusIcon,
  pruneFilterColumn,
  removeFilterCondition,
  renameColumn,
  setRowHeight,
  TrashIcon,
} from "../media-editing/canvas-sticker-assets.jsx";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import {
  applyFilter,
  CheckIcon,
  MATCH_LABELS,
  ROW_HEIGHT_LABELS,
  visibleColumns,
} from "../media-editing/create-column.jsx";
import { Tt } from "./is-diff-review-session-ready.js";
import {
  addColumn,
  createEmptyDocument,
  newConditionId,
  ROW_HEIGHT_ORDER,
} from "../canvas/is-reexecutable-generation-node.js";
import { ConditionRow } from "../media-editing/condition-row.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../generation/select-content.jsx";
import { AddColumnDialog } from "../media-editing/add-column-dialog-inner.jsx";
import { FieldRow } from "../media-editing/field-row.jsx";
import { CloseIcon } from "../canvas/file-missing-icon.jsx";
import { TableEditorInner } from "./table-editor-inner.jsx";
import { useDevicePixelRatio } from "../shared/use-device-pixel-ratio.js";
import {
  useCanvasActive,
  useCanvasBridge,
  useCanvasIsBoxSelecting,
  useCanvasIsMultiSelect,
} from "../media-editing/package.jsx";
import { RESOURCE_DRAG_MIME } from "./build-asr-gateway-request.js";
import { NodeResizeFrame } from "../infra/node-resize-frame-inner.jsx";
import { TABLE_CARD_DEFAULT_SIZE } from "../canvas/compute-group-bounds-from-children.js";
import { useCanvasActions } from "../media-editing/use-canvas-actions.js";
import {
  AddToChatIcon,
  areNodePropsEqual,
  FullscreenIcon,
  useCanvasNodeIsDragging,
} from "../canvas/fullscreen-icon.jsx";
import { NodeHeader } from "../canvas/node-header-inner.jsx";
import { NodeHandles } from "../canvas/proximity-handle-inner.jsx";
import { NodeToolbar } from "../media-editing/toolbar-item.jsx";
import { NodeShell } from "../canvas/node-shell-inner.jsx";
import { NodeBody } from "../canvas/node-body-inner.jsx";
import { parseTableDocument } from "./parse-table-document.js";
import { serializeTableDocument } from "./table-document-to-llm-content.js";
function removeColumn(doc, columnId) {
  const columns = doc.columns.filter((column) => column.id !== columnId);
  const rows = doc.rows.map((row) => {
    if (!(columnId in row.cells)) return row;
    const { [columnId]: _omit, ...rest } = row.cells;
    return {
      ...row,
      cells: rest,
    };
  });
  const filter = pruneFilterColumn(doc.filter, columnId);
  return {
    ...doc,
    columns,
    rows,
    filter,
  };
}
function toggleColumnVisibility(doc, columnId, visible) {
  return {
    ...doc,
    columns: doc.columns.map((column) =>
      column.id === columnId
        ? {
            ...column,
            visible: !(column.visible ?? true),
          }
        : column,
    ),
  };
}
function moveColumn(doc, fromId, toId, position = "before") {
  const columns = moveItem(doc.columns, fromId, toId, position);
  if (columns === doc.columns) return doc;
  return {
    ...doc,
    columns,
  };
}
function removeRow(doc, rowId) {
  return {
    ...doc,
    rows: doc.rows.filter((row) => row.id !== rowId),
  };
}
function setFilterMatch(doc, match) {
  if (!doc.filter) return doc;
  if (doc.filter.match === match) return doc;
  return {
    ...doc,
    filter: {
      ...doc.filter,
      match,
    },
  };
}
function addFilterCondition(doc, condition) {
  const existing = doc.filter?.conditions ?? [];
  return {
    ...doc,
    filter: {
      match: doc.filter?.match ?? "any",
      conditions: [...existing, condition],
    },
  };
}
function updateFilterCondition(doc, conditionId, patch) {
  if (!doc.filter) return doc;
  const conditions = doc.filter.conditions.map((condition) =>
    condition.id === conditionId
      ? {
          ...condition,
          ...patch,
        }
      : condition,
  );
  return {
    ...doc,
    filter: {
      ...doc.filter,
      conditions,
    },
  };
}
function FieldConfigPanelInner({
  history: tableHistory,
  onClose,
  align = "right",
}) {
  const { t } = useTranslation();
  const { doc, apply } = tableHistory;
  const panelRef = reactExports.useRef(null);
  const [showAddColumn, setShowAddColumn] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (showAddColumn) return;
    const handler = (domEvent) => {
      const target = domEvent.target;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (target.closest("[data-field-row-menu]")) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, showAddColumn]);
  const handleToggleVisibility = (columnId) => {
    apply((prev) => toggleColumnVisibility(prev, columnId));
  };
  const handleRename = (columnId, title) => {
    apply((prev) => renameColumn(prev, columnId, title));
  };
  const handleDelete = (columnId) => {
    apply((prev) => removeColumn(prev, columnId));
  };
  const handleMoveColumn = reactExports.useCallback(
    (fromId, toId, position) => {
      apply((prev) => moveColumn(prev, fromId, toId, position));
    },
    [apply],
  );
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
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: popover container; keyboard handled by inner controls
    <div
      ref={panelRef}
      className={`absolute ${align === "left" ? "left-0" : "right-0"} top-full mt-1 z-20 flex w-[320px] flex-col rounded-lg overflow-hidden shadow-xl`}
      style={{
        background: "var(--canvas-node-bg, #fff)",
        border: "1px solid var(--canvas-node-border, #e0e0e0)",
        animation: "context-menu-in 0.12s ease-out",
      }}
      onKeyDown={(keyboardEvent) => keyboardEvent.stopPropagation()}
    >
      <div
        className="flex shrink-0 items-center justify-between px-3 py-2.5"
        style={{
          borderBottom: "1px solid var(--canvas-node-border, #e0e0e0)",
        }}
      >
        <span
          className="text-[12px] font-medium"
          style={{
            color: "var(--fg-default,#141414)",
          }}
        >
          {t("canvas.table.fieldConfig", "Field configuration")}
        </span>
      </div>
      <div className="flex max-h-[360px] flex-col gap-0.5 overflow-y-auto p-1">
        {doc.columns.length === 0 ? (
          <div
            className="px-3 py-4 text-center text-[12px]"
            style={{
              color: "var(--fg-muted,#999)",
            }}
          >
            {t("canvas.table.noColumns", "No columns")}
          </div>
        ) : (
          doc.columns.map((column) => (
            <FieldRow
              key={column.id}
              column={column}
              onToggle={() => handleToggleVisibility(column.id)}
              onRename={(title) => handleRename(column.id, title)}
              onDelete={() => handleDelete(column.id)}
              onMove={handleMoveColumn}
            />
          ))
        )}
      </div>
      <button
        type="button"
        onClick={() => setShowAddColumn(true)}
        className="flex shrink-0 items-center gap-2 px-3 py-2.5 text-left text-[12px] transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)]"
        style={{
          borderTop: "1px solid var(--canvas-node-border, #e0e0e0)",
          color: "var(--fg-muted,#525252)",
        }}
      >
        <PlusIcon />
        <span>{t("canvas.table.addField", "Add field")}</span>
      </button>
      {showAddColumn && (
        <AddColumnDialog
          onCommit={handleCommitColumn}
          onClose={() => setShowAddColumn(false)}
        />
      )}
    </div>
  );
}
const FieldConfigPanel = reactExports.memo(FieldConfigPanelInner);
function createCondition(column) {
  return {
    id: newConditionId(),
    columnId: column.id,
    op: defaultOpForFieldType(column.type),
    value: void 0,
  };
}
function FilterPanelInner({ history: tableHistory, onClose, align = "right" }) {
  const { t } = useTranslation();
  const { doc, apply } = tableHistory;
  const panelRef = reactExports.useRef(null);
  const conditions = doc.filter?.conditions ?? [];
  const match = doc.filter?.match ?? "any";
  const hasColumns = doc.columns.length > 0;
  reactExports.useEffect(() => {
    const handler = (domEvent) => {
      const target = domEvent.target;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      const el =
        target instanceof Element ? target : (target.parentElement ?? null);
      if (
        el?.closest('[data-slot="select-content"], [data-slot="select-item"]')
      )
        return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  const handleColumnChange = (conditionId, columnId) => {
    const column = doc.columns.find((column) => column.id === columnId);
    if (!column) return;
    const ops = operatorsForFieldType(column.type);
    apply((prev) => {
      const current = prev.filter?.conditions.find(
        (condition) => condition.id === conditionId,
      );
      const keepOp =
        current && ops.includes(current.op)
          ? current.op
          : defaultOpForFieldType(column.type);
      const needsValue = OPS_REQUIRING_VALUE.has(keepOp);
      return updateFilterCondition(prev, conditionId, {
        columnId,
        op: keepOp,
        value: needsValue ? current?.value : void 0,
      });
    });
  };
  const handleOpChange = (conditionId, op) => {
    apply((prev) => {
      const current = prev.filter?.conditions.find(
        (condition) => condition.id === conditionId,
      );
      const needsValue = OPS_REQUIRING_VALUE.has(op);
      return updateFilterCondition(prev, conditionId, {
        op,
        value: needsValue ? current?.value : void 0,
      });
    });
  };
  const handleValueChange = (conditionId, raw, columnType) => {
    const value =
      raw === "" ? void 0 : columnType === "number" ? Number(raw) : raw;
    apply((prev) =>
      updateFilterCondition(prev, conditionId, {
        value,
      }),
    );
  };
  const handleRemoveCondition = (conditionId) => {
    apply((prev) => removeFilterCondition(prev, conditionId));
  };
  const handleAddCondition = () => {
    const firstColumn = doc.columns[0];
    if (!firstColumn) return;
    apply((prev) => addFilterCondition(prev, createCondition(firstColumn)));
  };
  const handleMatchChange = (next) => {
    apply((prev) => setFilterMatch(prev, next));
  };
  const showMatchSelector = conditions.length >= 2;
  const matchLabels = reactExports.useMemo(
    () => ({
      all: t(MATCH_LABELS.all.key, MATCH_LABELS.all.defaultLabel),
      any: t(MATCH_LABELS.any.key, MATCH_LABELS.any.defaultLabel),
    }),
    [t],
  );
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: popover container; keyboard handled by inner controls
    <div
      ref={panelRef}
      className={`absolute ${align === "left" ? "left-0" : "right-0"} top-full z-20 mt-1 flex w-[480px] flex-col gap-3 rounded-lg border border-border p-4 text-popover-foreground shadow-md`}
      style={{
        animation: "context-menu-in 0.12s ease-out",
        background: "var(--canvas-controls-bg)",
      }}
      onKeyDown={(keyboardEvent) => keyboardEvent.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-foreground">
          {t("canvas.table.filter.title", "Set filter conditions")}
        </span>
        {showMatchSelector ? (
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span>{t("canvas.table.filter.match.prefix", "Match")}</span>
            <Select
              value={match}
              items={matchLabels}
              onValueChange={(nextMatch) => {
                if (nextMatch != null) handleMatchChange(nextMatch);
              }}
            >
              <SelectTrigger className="h-7 w-[80px] px-2 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["all", "any"].map((matchMode) => (
                  <SelectItem key={matchMode} value={matchMode}>
                    {t(MATCH_LABELS[matchMode].key, MATCH_LABELS[matchMode].defaultLabel)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>
              {t("canvas.table.filter.match.suffix", "condition(s)")}
            </span>
          </div>
        ) : null}
      </div>
      {conditions.length === 0 ? (
        !hasColumns ? (
          <div className="text-[12px] text-muted-foreground">
            {t(
              "canvas.table.filter.noColumns",
              "Add a column first to start filtering.",
            )}
          </div>
        ) : null
      ) : (
        <div className="flex flex-col gap-2">
          {conditions.map((cond) => (
            <ConditionRow
              key={cond.id}
              condition={cond}
              columns={doc.columns}
              onColumnChange={(columnId) =>
                handleColumnChange(cond.id, columnId)
              }
              onOpChange={(op) => handleOpChange(cond.id, op)}
              onValueChange={(raw, columnType) =>
                handleValueChange(cond.id, raw, columnType)
              }
              onRemove={() => handleRemoveCondition(cond.id)}
            />
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={handleAddCondition}
        disabled={!hasColumns}
        className="flex h-7 w-fit items-center gap-1 rounded-md text-[12px] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-muted-foreground"
      >
        <PlusIcon />
        <span>{t("canvas.table.filter.addCondition", "Add condition")}</span>
      </button>
    </div>
  );
}
const FilterPanel = reactExports.memo(FilterPanelInner);
function RowHeightPanelInner({ history: tableHistory, onClose, align = "right" }) {
  const { t } = useTranslation();
  const { doc, apply } = tableHistory;
  const panelRef = reactExports.useRef(null);
  const current = getRowHeight(doc);
  reactExports.useEffect(() => {
    const handler = (domEvent) => {
      if (panelRef.current && !panelRef.current.contains(domEvent.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  const handlePick = (next) => {
    if (next !== current) apply((prev) => setRowHeight(prev, next));
    onClose();
  };
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: popover container; keyboard handled by inner controls
    <div
      ref={panelRef}
      className={`absolute ${align === "left" ? "left-0" : "right-0"} top-full mt-1 z-20 flex w-[180px] flex-col rounded-lg overflow-hidden shadow-xl`}
      style={{
        background: "var(--canvas-node-bg, #fff)",
        border: "1px solid var(--canvas-node-border, #e0e0e0)",
        animation: "context-menu-in 0.12s ease-out",
      }}
      onKeyDown={(keyboardEvent) => keyboardEvent.stopPropagation()}
    >
      <div
        className="flex shrink-0 items-center px-3 py-2.5"
        style={{
          borderBottom: "1px solid var(--canvas-node-border, #e0e0e0)",
        }}
      >
        <span
          className="text-[12px] font-medium"
          style={{
            color: "var(--fg-default,#141414)",
          }}
        >
          {t("canvas.table.rowHeight", "Row height")}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 p-1">
        {ROW_HEIGHT_ORDER.map((opt) => {
          const active = opt === current;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handlePick(opt)}
              className="flex h-8 items-center justify-between rounded-md px-3 text-[12px] transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)]"
              style={{
                color: "var(--fg-default,#141414)",
              }}
            >
              <span>
                {t(
                  ROW_HEIGHT_LABELS[opt].key,
                  ROW_HEIGHT_LABELS[opt].defaultLabel,
                )}
              </span>
              {active && <CheckIcon />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
const RowHeightPanel = reactExports.memo(RowHeightPanelInner);
const MAX_HISTORY = 100;
function createHistory(initial) {
  return Tt(initial, {
    maxHistory: MAX_HISTORY,
    autoArchive: false,
  });
}
function mergeOptionalField(draft, key, next, prev) {
  if (next === void 0) {
    if (prev !== void 0) delete draft[key];
    return;
  }
  draft[key] = next;
}
function mergeColumnInto(draft, next, prev) {
  if (next === prev) return;
  if (next.id !== prev.id) draft.id = next.id;
  if (next.title !== prev.title) draft.title = next.title;
  if (next.type !== prev.type) draft.type = next.type;
  if (next.visible !== prev.visible) draft.visible = next.visible;
  if (next.width !== prev.width) draft.width = next.width;
}
function mergeCellsInto(draft, next, prev) {
  for (const key of Object.keys(prev)) {
    if (!(key in next)) delete draft[key];
  }
  for (const key of Object.keys(next)) {
    if (next[key] !== prev[key]) draft[key] = next[key];
  }
}
function mergeRowInto(draft, next, prev) {
  if (next === prev) return;
  if (next.id !== prev.id) draft.id = next.id;
  if (next.cells !== prev.cells) {
    mergeCellsInto(draft.cells, next.cells, prev.cells);
  }
  if (next.height !== prev.height) {
    if (next.height === void 0) delete draft.height;
    else draft.height = next.height;
  }
}
function tryMergeArrayById(draft, next, prev, mergeItem) {
  if (next === prev) return true;
  if (next.length === prev.length) {
    for (let i = 0; i < next.length; i++) {
      const nextItem = next[i];
      const prevItem = prev[i];
      if (!nextItem || !prevItem || nextItem.id !== prevItem.id) return false;
    }
    for (let i = 0; i < next.length; i++) {
      const nextItem = next[i];
      const prevItem = prev[i];
      if (nextItem !== prevItem) mergeItem(draft[i], nextItem, prevItem);
    }
    return true;
  }
  if (next.length === prev.length + 1) {
    for (let i = 0; i < prev.length; i++) {
      const nextItem = next[i];
      const prevItem = prev[i];
      if (!nextItem || !prevItem || nextItem.id !== prevItem.id) return false;
    }
    draft.push(next[prev.length]);
    return true;
  }
  if (next.length + 1 === prev.length) {
    let removedAt = -1;
    let scan = 0;
    for (let i = 0; i < prev.length; i++) {
      const prevItem = prev[i];
      const nextItem = scan < next.length ? next[scan] : void 0;
      if (prevItem && nextItem && prevItem.id === nextItem.id) {
        scan++;
      } else if (removedAt === -1) {
        removedAt = i;
      } else {
        return false;
      }
    }
    if (removedAt >= 0 && scan === next.length) {
      draft.splice(removedAt, 1);
      return true;
    }
  }
  return false;
}
function mergeDocIntoDraft(draft, next, prev) {
  if (next === prev) return;
  if (next.version !== prev.version) draft.version = next.version;
  if (next.columns !== prev.columns) {
    if (
      !tryMergeArrayById(
        draft.columns,
        next.columns,
        prev.columns,
        mergeColumnInto,
      )
    ) {
      draft.columns = next.columns;
    }
  }
  if (next.rows !== prev.rows) {
    if (!tryMergeArrayById(draft.rows, next.rows, prev.rows, mergeRowInto)) {
      draft.rows = next.rows;
    }
  }
  if (next.filter !== prev.filter) {
    mergeOptionalField(draft, "filter", next.filter, prev.filter);
  }
  if (next.rowHeight !== prev.rowHeight) {
    mergeOptionalField(draft, "rowHeight", next.rowHeight, prev.rowHeight);
  }
}
function useTableHistory(initial) {
  const travelsRef = reactExports.useRef(null);
  if (travelsRef.current === null) travelsRef.current = createHistory(initial);
  const [doc, setDoc] = reactExports.useState(initial);
  reactExports.useEffect(() => {
    travelsRef.current = createHistory(initial);
    setDoc(initial);
  }, [initial]);
  const apply = reactExports.useCallback((transform) => {
    const travels = travelsRef.current;
    if (!travels) return;
    const prev = travels.getState();
    const next = transform(prev);
    if (next === prev) return;
    travels.setState((draft) => {
      mergeDocIntoDraft(draft, next, prev);
    });
    travels.archive();
    setDoc(travels.getState());
  }, []);
  const reset = reactExports.useCallback((next) => {
    travelsRef.current = createHistory(next);
    setDoc(next);
  }, []);
  const undo = reactExports.useCallback(() => {
    const travels = travelsRef.current;
    if (!travels?.canBack()) return;
    travels.back();
    setDoc(travels.getState());
  }, []);
  const redo = reactExports.useCallback(() => {
    const travels = travelsRef.current;
    if (!travels?.canForward()) return;
    travels.forward();
    setDoc(travels.getState());
  }, []);
  const travels = travelsRef.current;
  return {
    doc,
    apply,
    reset,
    undo,
    redo,
    canUndo: travels?.canBack() ?? false,
    canRedo: travels?.canForward() ?? false,
  };
}
const TableEditor = reactExports.memo(TableEditorInner);
function useBackdropDismiss(onDismiss) {
  const downOnBackdropRef = reactExports.useRef(false);
  const onMouseDown = reactExports.useCallback((mouseEvent) => {
    downOnBackdropRef.current = mouseEvent.target === mouseEvent.currentTarget;
  }, []);
  const onClick = reactExports.useCallback(
    (mouseEvent) => {
      const downOnBackdrop = downOnBackdropRef.current;
      downOnBackdropRef.current = false;
      if (downOnBackdrop && mouseEvent.target === mouseEvent.currentTarget) onDismiss();
    },
    [onDismiss],
  );
  return {
    onMouseDown,
    onClick,
  };
}
function ToolbarButton({
  title,
  label,
  onClick,
  disabled,
  active,
  dot,
  children,
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={
        label
          ? "relative flex h-7 items-center gap-1 rounded-md px-2 text-[12px] transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)] disabled:cursor-not-allowed disabled:opacity-30"
          : "relative flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)] disabled:cursor-not-allowed disabled:opacity-30"
      }
      style={{
        color: "var(--fg-muted, #666)",
        background: active ? "var(--bg-subtle, #f5f5f5)" : void 0,
      }}
    >
      {children}
      {label && <span>{label}</span>}
      {dot && (
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
    <CompositedSvg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
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
    <CompositedSvg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
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
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M8.707 2.293a1 1 0 0 1 0 1.414L5.414 7H14.5a7.5 7.5 0 0 1 0 15H11a1 1 0 1 1 0-2h3.5a5.5 5.5 0 1 0 0-11H5.414l3.293 3.293a1 1 0 1 1-1.414 1.414l-5-5a1 1 0 0 1 0-1.414l5-5a1 1 0 0 1 1.414 0Z"
      />
    </CompositedSvg>
  );
}
function RedoIcon() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M15.293 2.293a1 1 0 0 0 0 1.414L18.586 7H9.5a7.5 7.5 0 0 0 0 15H13a1 1 0 1 0 0-2H9.5a5.5 5.5 0 1 1 0-11h9.086l-3.293 3.293a1 1 0 0 0 1.414 1.414l5-5a1 1 0 0 0 0-1.414l-5-5a1 1 0 0 0-1.414 0Z"
      />
    </CompositedSvg>
  );
}
Object.prototype.constructor.toString();
function TableToolbarInner({
  title,
  onTitleChange,
  history: tableHistory,
  onClose,
  selectedCount,
  onRemoveSelected,
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = reactExports.useState(title);
  const [openPanel, setOpenPanel] = reactExports.useState(null);
  reactExports.useEffect(() => setDraft(title), [title]);
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== title) onTitleChange(trimmed || title);
  };
  const filterActive =
    !!tableHistory.doc.filter && tableHistory.doc.filter.conditions.length > 0;
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
        onChange={(changeEvent) => setDraft(changeEvent.target.value)}
        onBlur={commit}
        onKeyDown={(keyboardEvent) => {
          if (keyboardEvent.key === "Enter") {
            keyboardEvent.preventDefault();
            keyboardEvent.currentTarget.blur();
          }
          if (keyboardEvent.key === "Escape") {
            keyboardEvent.preventDefault();
            setDraft(title);
            keyboardEvent.currentTarget.blur();
          }
          keyboardEvent.stopPropagation();
        }}
        placeholder={t("canvas.table.untitled", "Untitled table")}
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
              title={t("canvas.table.removeSelected", {
                defaultValue: "Remove ({{count}})",
                count: selectedCount,
              })}
            >
              <TrashIcon size={13} />
              <span>
                {t("canvas.table.removeSelected", {
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
          <ToolbarButton
            title={t("canvas.table.fieldConfig", "Field configuration")}
            label={t("canvas.table.fieldConfig", "Field configuration")}
            onClick={() =>
              setOpenPanel((prevPanel) => (prevPanel === "fields" ? null : "fields"))
            }
            active={openPanel === "fields"}
          >
            <SettingsIcon />
          </ToolbarButton>
          {openPanel === "fields" && (
            <FieldConfigPanel
              history={tableHistory}
              align="left"
              onClose={() => setOpenPanel(null)}
            />
          )}
        </div>
        <div className="relative">
          <ToolbarButton
            title={t("canvas.table.filter", "Filter")}
            label={t("canvas.table.filter", "Filter")}
            onClick={() =>
              setOpenPanel((prevPanel) => (prevPanel === "filter" ? null : "filter"))
            }
            active={openPanel === "filter" || filterActive}
            dot={filterActive}
          >
            <FilterIcon />
          </ToolbarButton>
          {openPanel === "filter" && (
            <FilterPanel
              history={tableHistory}
              align="right"
              onClose={() => setOpenPanel(null)}
            />
          )}
        </div>
        <div className="relative">
          <ToolbarButton
            title={t("canvas.table.rowHeight", "Row height")}
            label={t("canvas.table.rowHeight", "Row height")}
            onClick={() =>
              setOpenPanel((prevPanel) => (prevPanel === "rowHeight" ? null : "rowHeight"))
            }
            active={openPanel === "rowHeight"}
          >
            <RowHeightIcon />
          </ToolbarButton>
          {openPanel === "rowHeight" && (
            <RowHeightPanel
              history={tableHistory}
              align="right"
              onClose={() => setOpenPanel(null)}
            />
          )}
        </div>
        <div
          className="mx-1 h-4 w-px"
          style={{
            background: "var(--canvas-node-border, #e0e0e0)",
          }}
        />
        <ToolbarButton
          title={t("canvas.undo", "Undo")}
          onClick={tableHistory.undo}
          disabled={!tableHistory.canUndo}
        >
          <UndoIcon />
        </ToolbarButton>
        <ToolbarButton
          title={t("canvas.redo", "Redo")}
          onClick={tableHistory.redo}
          disabled={!tableHistory.canRedo}
        >
          <RedoIcon />
        </ToolbarButton>
        <div
          className="mx-1 h-4 w-px"
          style={{
            background: "var(--canvas-node-border, #e0e0e0)",
          }}
        />
        <ToolbarButton title={t("canvas.close", "Close")} onClick={onClose}>
          <CloseIcon />
        </ToolbarButton>
      </div>
    </div>
  );
}
const TableToolbar = reactExports.memo(TableToolbarInner);
const NOOP_TITLE_CHANGE = () => {};
function TableFullscreenInner({ initialDoc, title, onClose, onTitleChange }) {
  const { t } = useTranslation();
  const active = useCanvasActive();
  const startDoc = initialDoc ?? createEmptyDocument();
  const tableHistory = useTableHistory(startDoc);
  const baselineDocRef = reactExports.useRef(startDoc);
  const [selectedRowIds, setSelectedRowIds] = reactExports.useState(
    () => new Set(),
  );
  const validSelectedRowIds = reactExports.useMemo(() => {
    if (selectedRowIds.size === 0) return selectedRowIds;
    const live = new Set(tableHistory.doc.rows.map((row) => row.id));
    let drift = false;
    const next = new Set();
    for (const id of selectedRowIds) {
      if (live.has(id)) next.add(id);
      else drift = true;
    }
    return drift ? next : selectedRowIds;
  }, [selectedRowIds, tableHistory.doc.rows]);
  const handleDeleteSelected = reactExports.useCallback(() => {
    if (validSelectedRowIds.size === 0) return;
    tableHistory.apply((prev) => {
      let next = prev;
      for (const id of validSelectedRowIds) {
        next = removeRow(next, id);
      }
      return next;
    });
    setSelectedRowIds(new Set());
  }, [validSelectedRowIds, tableHistory]);
  const handleClose = reactExports.useCallback(() => {
    const next = tableHistory.doc;
    onClose(next === baselineDocRef.current ? void 0 : next);
  }, [tableHistory.doc, onClose]);
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
    if (!active) return;
    const isInEditor = (target) =>
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable);
    const captureHandler = (keyboardEvent) => {
      if (keyboardEvent.key !== "Delete" && keyboardEvent.key !== "Backspace") return;
      if (isInEditor(keyboardEvent.target)) return;
      keyboardEvent.stopPropagation();
      keyboardEvent.stopImmediatePropagation();
    };
    const handler = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        if (isInEditor(keyboardEvent.target)) return;
        keyboardEvent.stopPropagation();
        handleClose();
        return;
      }
      const meta = keyboardEvent.metaKey || keyboardEvent.ctrlKey;
      if (meta && (keyboardEvent.key === "z" || keyboardEvent.key === "Z")) {
        if (isInEditor(keyboardEvent.target)) return;
        keyboardEvent.stopPropagation();
        keyboardEvent.preventDefault();
        if (keyboardEvent.shiftKey) tableHistory.redo();
        else tableHistory.undo();
        return;
      }
      if (meta && (keyboardEvent.key === "y" || keyboardEvent.key === "Y")) {
        if (isInEditor(keyboardEvent.target)) return;
        keyboardEvent.stopPropagation();
        keyboardEvent.preventDefault();
        tableHistory.redo();
        return;
      }
      if (
        meta ||
        (keyboardEvent.shiftKey && (keyboardEvent.code === "Digit1" || keyboardEvent.code === "Digit2"))
      ) {
        keyboardEvent.stopPropagation();
      }
    };
    document.addEventListener("keydown", captureHandler, true);
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", captureHandler, true);
      document.removeEventListener("keydown", handler);
    };
  }, [active, handleClose, tableHistory]);
  const backdrop = useBackdropDismiss(handleClose);
  const dpr = useDevicePixelRatio();
  const cap =
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
          width: `min(${cap.w}px, 80vw)`,
          height: `min(${cap.h}px, 92vh)`,
          background: "var(--canvas-node-bg, #fff)",
          border: "1px solid var(--canvas-node-border, #e0e0e0)",
        }}
        onKeyDown={(keyboardEvent) => keyboardEvent.stopPropagation()}
        onKeyUp={(keyboardEvent) => keyboardEvent.stopPropagation()}
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        onDragLeave={handlePanelDragLeave}
      >
        <TableToolbar
          title={title || t("canvas.table.untitled", "Untitled table")}
          onTitleChange={onTitleChange ?? NOOP_TITLE_CHANGE}
          history={tableHistory}
          onClose={handleClose}
          selectedCount={validSelectedRowIds.size}
          onRemoveSelected={handleDeleteSelected}
        />
        <div className="flex-1 overflow-hidden">
          <TableEditor
            history={tableHistory}
            selectedRowIds={validSelectedRowIds}
            onSelectionChange={setSelectedRowIds}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
const TableFullscreen = reactExports.memo(TableFullscreenInner);
const HEADER_HEIGHT = 32;
const FALLBACK_ROW_HEIGHT = 32;
const FALLBACK_COL_WIDTH = 200;
const ATTACHMENT_VERTICAL_PADDING = 4;
const MIN_ATTACHMENT_CHIP_SIZE = 18;
const MAX_PREVIEW_CHIPS = 2;
function AttachmentPreviewChip({ attachment, size }) {
  const { t } = useTranslation();
  const meta = useAssetMetadataStore((state) =>
    state.assets.get(attachment.assetId),
  );
  const thumbnail = attachmentThumbnailUrl(attachment, meta, size);
  const [failedThumbnail, setFailedThumbnail] = reactExports.useState(null);
  const thumb = thumbnail === failedThumbnail ? void 0 : thumbnail;
  const missing = !meta;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
      }}
      title={missing ? `${attachment.name} (missing)` : attachment.name}
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
            className="h-full w-full object-cover"
            loading="lazy"
            draggable={false}
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
    </span>
  );
}
function AttachmentPreviewList({ attachments, rowHeightPx }) {
  if (attachments.length === 0) {
    return (
      <div
        className="flex h-full items-center px-2"
        style={{
          paddingTop: ATTACHMENT_VERTICAL_PADDING,
          paddingBottom: ATTACHMENT_VERTICAL_PADDING,
        }}
      >
        <span className="opacity-30">—</span>
      </div>
    );
  }
  const chipSize = Math.max(
    MIN_ATTACHMENT_CHIP_SIZE,
    rowHeightPx - ATTACHMENT_VERTICAL_PADDING * 2,
  );
  const visible = attachments.slice(0, MAX_PREVIEW_CHIPS);
  const overflow = attachments.length - visible.length;
  return (
    <div
      className="flex h-full items-center gap-1 overflow-hidden px-1"
      style={{
        paddingTop: ATTACHMENT_VERTICAL_PADDING,
        paddingBottom: ATTACHMENT_VERTICAL_PADDING,
      }}
    >
      {visible.map((att) => (
        <AttachmentPreviewChip
          key={att.assetId}
          attachment={att}
          size={chipSize}
        />
      ))}
      {overflow > 0 && (
        <span
          className="inline-flex shrink-0 items-center justify-center text-[10px] tabular-nums"
          style={{
            width: chipSize,
            height: chipSize,
            background: "var(--bg-subtle,#fafafa)",
            color: "var(--fg-muted,#666)",
            border: "1px solid var(--canvas-node-border,#e0e0e0)",
          }}
          title={`+${overflow}`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
function CellPreview({ value, type, rowHeightPx, maxLines }) {
  if (type === "attachment") {
    const list = Array.isArray(value) ? value : [];
    return (
      <AttachmentPreviewList attachments={list} rowHeightPx={rowHeightPx} />
    );
  }
  if (value == null || value === "") {
    return (
      <div
        className="flex h-full items-start px-2"
        style={{
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        <span className="opacity-30">—</span>
      </div>
    );
  }
  if (type === "number") {
    return (
      <div
        className="flex h-full items-start justify-start px-2 tabular-nums"
        style={{
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        <span className="block w-full truncate">{String(value)}</span>
      </div>
    );
  }
  const text = String(value);
  return (
    <div
      className="h-full px-2"
      style={{
        paddingTop: 4,
        paddingBottom: 4,
      }}
      title={text}
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
        {text}
      </span>
    </div>
  );
}
function TextFieldIcon() {
  return (
    <CompositedSvg
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
function NumberIcon() {
  return (
    <CompositedSvg
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
function FieldIcon({ type }) {
  if (type === "number") return <NumberIcon />;
  if (type === "attachment") return <PaperclipIcon />;
  return <TextFieldIcon />;
}
function TablePreviewInner({ doc, bodyHeight, bodyWidth }) {
  const { t } = useTranslation();
  const allColumns = reactExports.useMemo(
    () => (doc ? visibleColumns(doc) : []),
    [doc],
  );
  const rows = reactExports.useMemo(
    () => (doc ? applyFilter(doc) : []),
    [doc],
  );
  const rowHeightPx = doc ? getRowHeightPx(doc) : FALLBACK_ROW_HEIGHT;
  const maxLines = doc ? getRowHeightLines(doc) : 1;
  const columns = reactExports.useMemo(() => {
    if (allColumns.length === 0) return allColumns;
    const limit = Math.max(0, bodyWidth);
    let acc = 0;
    const out = [];
    for (const column of allColumns) {
      out.push(column);
      acc += column.width ?? FALLBACK_COL_WIDTH;
      if (acc >= limit) break;
    }
    return out;
  }, [allColumns, bodyWidth]);
  const footerHeight = 24;
  const availableHeight = bodyHeight - HEADER_HEIGHT;
  const maxRowSlots = Math.max(
    1,
    Math.floor(
      (availableHeight -
        (rows.length > Math.floor(availableHeight / rowHeightPx)
          ? footerHeight
          : 0)) /
        rowHeightPx,
    ),
  );
  const visibleRowCount = Math.min(rows.length, maxRowSlots);
  const displayRows = rows.slice(0, visibleRowCount);
  const hiddenRowCount = Math.max(0, rows.length - displayRows.length);
  Math.max(0, allColumns.length - columns.length);
  if (!doc) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--fg-muted,#999)]">
        {t("canvas.table.loading", "Loading...")}
      </div>
    );
  }
  if (allColumns.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--fg-muted,#999)]">
        {t("canvas.table.empty", "No visible columns")}
      </div>
    );
  }
  return (
    <div className="flex h-full w-full flex-col overflow-hidden text-[12px]">
      <table className="w-full table-fixed border-collapse select-none">
        <colgroup>
          {columns.map((column) => (
            <col
              key={column.id}
              style={{
                width: column.width ?? FALLBACK_COL_WIDTH,
              }}
            />
          ))}
        </colgroup>
        <thead>
          <tr
            style={{
              height: HEADER_HEIGHT,
            }}
          >
            {columns.map((column) => (
              <th
                key={column.id}
                className="border-b px-2 text-left font-normal"
                style={{
                  borderColor: "var(--canvas-node-border, #e5e5e5)",
                  background: "var(--bg-subtle, #fafafa)",
                  color: "var(--fg-muted, #525252)",
                }}
              >
                <span className="flex items-center gap-1 truncate">
                  <FieldIcon type={column.type} />
                  <span className="truncate">{column.title}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.length === 0 ? (
            <tr
              style={{
                height: rowHeightPx,
              }}
            >
              <td
                colSpan={columns.length}
                className="px-2 text-center"
                style={{
                  color: "var(--fg-muted, #999)",
                  borderBottom: "1px solid var(--canvas-node-border, #e5e5e5)",
                }}
              >
                {t("canvas.table.noRows", "No rows")}
              </td>
            </tr>
          ) : (
            displayRows.map((row) => (
              <tr
                key={row.id}
                style={{
                  height: rowHeightPx,
                }}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className="overflow-hidden align-top"
                    style={{
                      height: rowHeightPx,
                      borderBottom:
                        "1px solid var(--canvas-node-border, #e5e5e5)",
                      color: "var(--fg-default, #141414)",
                    }}
                  >
                    <CellPreview
                      value={row.cells[column.id]}
                      type={column.type}
                      rowHeightPx={rowHeightPx}
                      maxLines={maxLines}
                    />
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {hiddenRowCount > 0 && (
        <div
          className="mt-auto flex gap-2 px-2 py-1 text-[10px]"
          style={{
            color: "var(--fg-muted, #999)",
          }}
        >
          {hiddenRowCount > 0 && (
            <span>
              {t("canvas.table.moreRows", "+{{count}} rows", {
                count: hiddenRowCount,
              })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
const TablePreview = reactExports.memo(TablePreviewInner);
function TableNodeInner({
  id,
  selected,
  width,
  height,
  data,
}) {
  const { t } = useTranslation();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const isDragging = useCanvasNodeIsDragging(id);
  const isInteractiveSelect = !isMultiSelect && !isBoxSelecting && !isDragging;
  const tableData = data ?? {};
  const tablePath = tableData.tablePath;
  const title =
    tableData.title || t("canvas.table.untitled", "Untitled table");
  const tableRevision = tableData.tableRevision;
  const [nodeWidth, setNodeWidth] = reactExports.useState(
    width || TABLE_CARD_DEFAULT_SIZE.width,
  );
  const [nodeHeight, setNodeHeight] = reactExports.useState(
    height || TABLE_CARD_DEFAULT_SIZE.height,
  );
  reactExports.useEffect(() => {
    if (typeof width === "number" && width > 0) setNodeWidth(width);
  }, [width]);
  reactExports.useEffect(() => {
    if (typeof height === "number" && height > 0) setNodeHeight(height);
  }, [height]);
  const [doc, setDoc] = reactExports.useState(null);
  const [loaded, setLoaded] = reactExports.useState(false);
  const [fullscreen, setFullscreen] = reactExports.useState(false);
  const appliedRevisionRef = reactExports.useRef(tableRevision);
  const { loadTableContent, saveTableContent, onAddToChat } = useCanvasBridge();
  const { updateNodeData } = useCanvasActions();
  reactExports.useEffect(() => {
    if (!tablePath || !loadTableContent) {
      setLoaded(true);
      return;
    }
    if (fullscreen) return;
    if (tableRevision === appliedRevisionRef.current && loaded) return;
    let cancelled = false;
    appliedRevisionRef.current = tableRevision;
    loadTableContent(tablePath)
      .then((raw) => {
        if (cancelled) return;
        try {
          setDoc(parseTableDocument(raw));
        } catch (err) {
          console.warn("[table-node] failed to parse", tablePath, err);
          setDoc(null);
        }
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[table-node] failed to load", tablePath, err);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tablePath, tableRevision, loadTableContent, fullscreen, loaded]);
  const handleDoubleClick = reactExports.useCallback(
    (domEvent) => {
      domEvent.stopPropagation();
      if (!loaded) return;
      setFullscreen(true);
    },
    [loaded],
  );
  const handleResize = reactExports.useCallback((newW, newH) => {
    setNodeWidth(newW);
    setNodeHeight(newH);
  }, []);
  const tableDataRef = reactExports.useRef(tableData);
  tableDataRef.current = tableData;
  const handleRename = reactExports.useCallback(
    (newName) => {
      updateNodeData(id, {
        ...tableDataRef.current,
        title: newName,
      });
    },
    [id, updateNodeData],
  );
  const handleAddToChat = reactExports.useCallback(() => {
    if (!tablePath || !onAddToChat) return;
    onAddToChat(tablePath, `${title}.htable`, id);
  }, [tablePath, onAddToChat, title, id]);
  const handleCloseFullscreen = reactExports.useCallback(
    (dirtyDoc) => {
      setFullscreen(false);
      if (!dirtyDoc) return;
      setDoc(dirtyDoc);
      if (tablePath && saveTableContent) {
        const serialized = serializeTableDocument(dirtyDoc);
        saveTableContent(tablePath, serialized).catch((err) => {
          console.error("[table-node] save failed", err);
          dedupedToast.error(
            t("canvas.table.saveFailed", "Failed to save table"),
          );
        });
      }
    },
    [tablePath, saveTableContent, t],
  );
  const previewBodyHeight = reactExports.useMemo(
    () => Math.max(80, nodeHeight),
    [nodeHeight],
  );
  const previewBodyWidth = reactExports.useMemo(
    () => Math.max(120, nodeWidth),
    [nodeWidth],
  );
  const toolbarItems = reactExports.useMemo(
    () => [
      {
        id: "add-to-chat",
        label: t("canvas.addToChat"),
        icon: <AddToChatIcon />,
        onClick: handleAddToChat,
      },
      {
        id: "fullscreen",
        label: t("canvas.fullscreenEdit"),
        icon: <FullscreenIcon />,
        onClick: () => {
          if (loaded) setFullscreen(true);
        },
      },
    ],
    [t, handleAddToChat, loaded],
  );
  return (
    <NodeShell width={nodeWidth} dataActionUiId="canvas.table-node">
      <NodeHeader
        nodeType="table"
        name={title}
        selected={selected}
        maxWidth={nodeWidth}
        onRename={handleRename}
        preserveExtension={false}
      />
      {selected && isInteractiveSelect && (
        <NodeToolbar items={toolbarItems} visible={true} />
      )}
      <NodeHandles nodeId={id} selected={!!selected} />
      <NodeBody
        width={nodeWidth}
        height={nodeHeight}
        selected={!!selected}
        variant="panel"
        onDoubleClick={handleDoubleClick}
      >
        <div
          style={{
            margin: "-12px -16px",
          }}
        >
          <TablePreview
            doc={doc}
            bodyHeight={previewBodyHeight}
            bodyWidth={previewBodyWidth}
          />
        </div>
      </NodeBody>
      {selected && (
        <NodeResizeFrame
          nodeId={id}
          minWidth={TABLE_CARD_DEFAULT_SIZE.width}
          minHeight={TABLE_CARD_DEFAULT_SIZE.height}
          onResize={handleResize}
        />
      )}
      {fullscreen && (
        <TableFullscreen
          initialDoc={doc}
          title={title}
          onClose={handleCloseFullscreen}
          onTitleChange={handleRename}
        />
      )}
    </NodeShell>
  );
}
export const TableNode = reactExports.memo(TableNodeInner, areNodePropsEqual);
