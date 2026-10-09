// table-node-inner.jsx
import {
  classifyFileType,
  CompositedSvg,
  dedupedToast,
  jsxRuntimeExports,
  reactDomExports,
  reactExports,
  useAssetMetadataStore,
  useTranslation,
} from "../vendor.js";
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
  PlusIcon$1,
  pruneFilterColumn,
  removeFilterCondition,
  renameColumn,
  setRowHeight,
  TrashIcon,
} from "../media-editing/canvas-sticker-assets.jsx";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import {
  applyFilter,
  CheckIcon$1,
  MATCH_LABELS,
  ROW_HEIGHT_LABELS,
  visibleColumns,
} from "../media-editing/create-column.jsx";
import { Tt$1 } from "./is-diff-review-session-ready.js";
import {
  addColumn$1,
  createEmptyDocument,
  newConditionId,
  ROW_HEIGHT_ORDER,
} from "../canvas/is-reexecutable-generation-node.js";
import { ConditionRow } from "../media-editing/condition-row.jsx";
import {
  Select$2,
  SelectContent$1,
  SelectItem$1,
  SelectTrigger$1,
  SelectValue$1,
} from "../generation/select-content.jsx";
import { AddColumnDialog } from "../media-editing/add-column-dialog-inner.jsx";
import { FieldRow } from "../media-editing/field-row.jsx";
import { CloseIcon$1 } from "../canvas/file-missing-icon.jsx";
import { TableEditorInner } from "./table-editor-inner.jsx";
import { useDevicePixelRatio } from "../infra/shallow-copy.js";
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
  FullscreenIcon$1,
  useCanvasNodeIsDragging,
} from "../canvas/fullscreen-icon.jsx";
import { NodeHeader } from "../canvas/node-header-inner.jsx";
import { NodeHandles } from "../canvas/proximity-handle-inner.jsx";
import { NodeToolbar } from "../media-editing/toolbar-item.jsx";
import { NodeShell } from "../canvas/node-shell-inner.jsx";
import { NodeBody } from "../canvas/node-body-inner.jsx";
import { parseTableDocument } from "./parse-table-document.js";
import { serializeTableDocument } from "./table-document-to-llm-content.js";

function removeColumn$1(doc2, columnId) {
  const columns = doc2.columns.filter((c3) => c3.id !== columnId);
  const rows = doc2.rows.map((r2) => {
    if (!(columnId in r2.cells)) return r2;
    const { [columnId]: _omit, ...rest } = r2.cells;
    return {
      ...r2,
      cells: rest,
    };
  });
  const filter2 = pruneFilterColumn(doc2.filter, columnId);
  return {
    ...doc2,
    columns,
    rows,
    filter: filter2,
  };
}

function toggleColumnVisibility(doc2, columnId, visible) {
  return {
    ...doc2,
    columns: doc2.columns.map((c3) =>
      c3.id === columnId
        ? {
            ...c3,
            visible: !(c3.visible ?? true),
          }
        : c3,
    ),
  };
}

function moveColumn(doc2, fromId, toId, position2 = "before") {
  const columns = moveItem(doc2.columns, fromId, toId, position2);
  if (columns === doc2.columns) return doc2;
  return {
    ...doc2,
    columns,
  };
}

function removeRow$1(doc2, rowId) {
  return {
    ...doc2,
    rows: doc2.rows.filter((r2) => r2.id !== rowId),
  };
}

function setFilterMatch(doc2, match2) {
  if (!doc2.filter) return doc2;
  if (doc2.filter.match === match2) return doc2;
  return {
    ...doc2,
    filter: {
      ...doc2.filter,
      match: match2,
    },
  };
}

function addFilterCondition(doc2, condition) {
  const existing = doc2.filter?.conditions ?? [];
  return {
    ...doc2,
    filter: {
      match: doc2.filter?.match ?? "any",
      conditions: [...existing, condition],
    },
  };
}

function updateFilterCondition(doc2, conditionId, patch2) {
  if (!doc2.filter) return doc2;
  const conditions = doc2.filter.conditions.map((c3) =>
    c3.id === conditionId
      ? {
          ...c3,
          ...patch2,
        }
      : c3,
  );
  return {
    ...doc2,
    filter: {
      ...doc2.filter,
      conditions,
    },
  };
}

function FieldConfigPanelInner({
  history: history2,
  onClose,
  align = "right",
}) {
  const { t: t2 } = useTranslation();
  const { doc: doc2, apply: apply2 } = history2;
  const panelRef = reactExports.useRef(null);
  const [showAddColumn, setShowAddColumn] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (showAddColumn) return;
    const handler = (e2) => {
      const target = e2.target;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (target.closest("[data-field-row-menu]")) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, showAddColumn]);
  const handleToggleVisibility = (columnId) => {
    apply2((prev) => toggleColumnVisibility(prev, columnId));
  };
  const handleRename = (columnId, title) => {
    apply2((prev) => renameColumn(prev, columnId, title));
  };
  const handleDelete2 = (columnId) => {
    apply2((prev) => removeColumn$1(prev, columnId));
  };
  const handleMoveColumn = reactExports.useCallback(
    (fromId, toId, position2) => {
      apply2((prev) => moveColumn(prev, fromId, toId, position2));
    },
    [apply2],
  );
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
      onKeyDown={(e2) => e2.stopPropagation()}
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
          {t2("canvas.table.fieldConfig", "Field configuration")}
        </span>
      </div>
      <div className="flex max-h-[360px] flex-col gap-0.5 overflow-y-auto p-1">
        {doc2.columns.length === 0 ? (
          <div
            className="px-3 py-4 text-center text-[12px]"
            style={{
              color: "var(--fg-muted,#999)",
            }}
          >
            {t2("canvas.table.noColumns", "No columns")}
          </div>
        ) : (
          doc2.columns.map((column) => (
            <FieldRow
              key={column.id}
              column={column}
              onToggle={() => handleToggleVisibility(column.id)}
              onRename={(title) => handleRename(column.id, title)}
              onDelete={() => handleDelete2(column.id)}
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
        <PlusIcon$1 />
        <span>{t2("canvas.table.addField", "Add field")}</span>
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

function FilterPanelInner({ history: history2, onClose, align = "right" }) {
  const { t: t2 } = useTranslation();
  const { doc: doc2, apply: apply2 } = history2;
  const panelRef = reactExports.useRef(null);
  const conditions = doc2.filter?.conditions ?? [];
  const match2 = doc2.filter?.match ?? "any";
  const hasColumns = doc2.columns.length > 0;
  reactExports.useEffect(() => {
    const handler = (e2) => {
      const target = e2.target;
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
    const column = doc2.columns.find((c3) => c3.id === columnId);
    if (!column) return;
    const ops = operatorsForFieldType(column.type);
    apply2((prev) => {
      const current2 = prev.filter?.conditions.find(
        (c3) => c3.id === conditionId,
      );
      const keepOp =
        current2 && ops.includes(current2.op)
          ? current2.op
          : defaultOpForFieldType(column.type);
      const needsValue = OPS_REQUIRING_VALUE.has(keepOp);
      return updateFilterCondition(prev, conditionId, {
        columnId,
        op: keepOp,
        value: needsValue ? current2?.value : void 0,
      });
    });
  };
  const handleOpChange = (conditionId, op) => {
    apply2((prev) => {
      const current2 = prev.filter?.conditions.find(
        (c3) => c3.id === conditionId,
      );
      const needsValue = OPS_REQUIRING_VALUE.has(op);
      return updateFilterCondition(prev, conditionId, {
        op,
        value: needsValue ? current2?.value : void 0,
      });
    });
  };
  const handleValueChange = (conditionId, raw2, columnType) => {
    const value =
      raw2 === "" ? void 0 : columnType === "number" ? Number(raw2) : raw2;
    apply2((prev) =>
      updateFilterCondition(prev, conditionId, {
        value,
      }),
    );
  };
  const handleRemoveCondition = (conditionId) => {
    apply2((prev) => removeFilterCondition(prev, conditionId));
  };
  const handleAddCondition = () => {
    const firstColumn = doc2.columns[0];
    if (!firstColumn) return;
    apply2((prev) => addFilterCondition(prev, createCondition(firstColumn)));
  };
  const handleMatchChange = (next2) => {
    apply2((prev) => setFilterMatch(prev, next2));
  };
  const showMatchSelector = conditions.length >= 2;
  const matchLabels = reactExports.useMemo(
    () => ({
      all: t2(MATCH_LABELS.all.key, MATCH_LABELS.all.defaultLabel),
      any: t2(MATCH_LABELS.any.key, MATCH_LABELS.any.defaultLabel),
    }),
    [t2],
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
      onKeyDown={(e2) => e2.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-foreground">
          {t2("canvas.table.filter.title", "Set filter conditions")}
        </span>
        {showMatchSelector ? (
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span>{t2("canvas.table.filter.match.prefix", "Match")}</span>
            <Select$2
              value={match2}
              items={matchLabels}
              onValueChange={(v2) => {
                if (v2 != null) handleMatchChange(v2);
              }}
            >
              <SelectTrigger$1 className="h-7 w-[80px] px-2 text-[12px]">
                <SelectValue$1 />
              </SelectTrigger$1>
              <SelectContent$1>
                {["all", "any"].map((m3) => (
                  <SelectItem$1 key={m3} value={m3}>
                    {t2(MATCH_LABELS[m3].key, MATCH_LABELS[m3].defaultLabel)}
                  </SelectItem$1>
                ))}
              </SelectContent$1>
            </Select$2>
            <span>
              {t2("canvas.table.filter.match.suffix", "condition(s)")}
            </span>
          </div>
        ) : null}
      </div>
      {conditions.length === 0 ? (
        !hasColumns ? (
          <div className="text-[12px] text-muted-foreground">
            {t2(
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
              columns={doc2.columns}
              onColumnChange={(columnId) =>
                handleColumnChange(cond.id, columnId)
              }
              onOpChange={(op) => handleOpChange(cond.id, op)}
              onValueChange={(raw2, columnType) =>
                handleValueChange(cond.id, raw2, columnType)
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
        <PlusIcon$1 />
        <span>{t2("canvas.table.filter.addCondition", "Add condition")}</span>
      </button>
    </div>
  );
}

const FilterPanel = reactExports.memo(FilterPanelInner);

function RowHeightPanelInner({ history: history2, onClose, align = "right" }) {
  const { t: t2 } = useTranslation();
  const { doc: doc2, apply: apply2 } = history2;
  const panelRef = reactExports.useRef(null);
  const current2 = getRowHeight(doc2);
  reactExports.useEffect(() => {
    const handler = (e2) => {
      if (panelRef.current && !panelRef.current.contains(e2.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  const handlePick = (next2) => {
    if (next2 !== current2) apply2((prev) => setRowHeight(prev, next2));
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
      onKeyDown={(e2) => e2.stopPropagation()}
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
          {t2("canvas.table.rowHeight", "Row height")}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 p-1">
        {ROW_HEIGHT_ORDER.map((opt) => {
          const active2 = opt === current2;
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
                {t2(
                  ROW_HEIGHT_LABELS[opt].key,
                  ROW_HEIGHT_LABELS[opt].defaultLabel,
                )}
              </span>
              {active2 && <CheckIcon$1 />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const RowHeightPanel = reactExports.memo(RowHeightPanelInner);

const MAX_HISTORY = 100;

function createHistory$1(initial) {
  return Tt$1(initial, {
    maxHistory: MAX_HISTORY,
    autoArchive: false,
  });
}

function mergeOptionalField(draft, key2, next2, prev) {
  if (next2 === void 0) {
    if (prev !== void 0) delete draft[key2];
    return;
  }
  draft[key2] = next2;
}

function mergeColumnInto(draft, next2, prev) {
  if (next2 === prev) return;
  if (next2.id !== prev.id) draft.id = next2.id;
  if (next2.title !== prev.title) draft.title = next2.title;
  if (next2.type !== prev.type) draft.type = next2.type;
  if (next2.visible !== prev.visible) draft.visible = next2.visible;
  if (next2.width !== prev.width) draft.width = next2.width;
}

function mergeCellsInto(draft, next2, prev) {
  for (const key2 of Object.keys(prev)) {
    if (!(key2 in next2)) delete draft[key2];
  }
  for (const key2 of Object.keys(next2)) {
    if (next2[key2] !== prev[key2]) draft[key2] = next2[key2];
  }
}

function mergeRowInto(draft, next2, prev) {
  if (next2 === prev) return;
  if (next2.id !== prev.id) draft.id = next2.id;
  if (next2.cells !== prev.cells) {
    mergeCellsInto(draft.cells, next2.cells, prev.cells);
  }
  if (next2.height !== prev.height) {
    if (next2.height === void 0) delete draft.height;
    else draft.height = next2.height;
  }
}

function tryMergeArrayById(draft, next2, prev, mergeItem) {
  if (next2 === prev) return true;
  if (next2.length === prev.length) {
    for (let i2 = 0; i2 < next2.length; i2++) {
      const n2 = next2[i2];
      const p3 = prev[i2];
      if (!n2 || !p3 || n2.id !== p3.id) return false;
    }
    for (let i2 = 0; i2 < next2.length; i2++) {
      const n2 = next2[i2];
      const p3 = prev[i2];
      if (n2 !== p3) mergeItem(draft[i2], n2, p3);
    }
    return true;
  }
  if (next2.length === prev.length + 1) {
    for (let i2 = 0; i2 < prev.length; i2++) {
      const n2 = next2[i2];
      const p3 = prev[i2];
      if (!n2 || !p3 || n2.id !== p3.id) return false;
    }
    draft.push(next2[prev.length]);
    return true;
  }
  if (next2.length + 1 === prev.length) {
    let removedAt = -1;
    let scan = 0;
    for (let i2 = 0; i2 < prev.length; i2++) {
      const p3 = prev[i2];
      const n2 = scan < next2.length ? next2[scan] : void 0;
      if (p3 && n2 && p3.id === n2.id) {
        scan++;
      } else if (removedAt === -1) {
        removedAt = i2;
      } else {
        return false;
      }
    }
    if (removedAt >= 0 && scan === next2.length) {
      draft.splice(removedAt, 1);
      return true;
    }
  }
  return false;
}

function mergeDocIntoDraft(draft, next2, prev) {
  if (next2 === prev) return;
  if (next2.version !== prev.version) draft.version = next2.version;
  if (next2.columns !== prev.columns) {
    if (
      !tryMergeArrayById(
        draft.columns,
        next2.columns,
        prev.columns,
        mergeColumnInto,
      )
    ) {
      draft.columns = next2.columns;
    }
  }
  if (next2.rows !== prev.rows) {
    if (!tryMergeArrayById(draft.rows, next2.rows, prev.rows, mergeRowInto)) {
      draft.rows = next2.rows;
    }
  }
  if (next2.filter !== prev.filter) {
    mergeOptionalField(draft, "filter", next2.filter, prev.filter);
  }
  if (next2.rowHeight !== prev.rowHeight) {
    mergeOptionalField(draft, "rowHeight", next2.rowHeight, prev.rowHeight);
  }
}

function useTableHistory(initial) {
  const travelsRef = reactExports.useRef(null);
  if (travelsRef.current === null)
    travelsRef.current = createHistory$1(initial);
  const [doc2, setDoc] = reactExports.useState(initial);
  reactExports.useEffect(() => {
    travelsRef.current = createHistory$1(initial);
    setDoc(initial);
  }, [initial]);
  const apply2 = reactExports.useCallback((transform2) => {
    const travels2 = travelsRef.current;
    if (!travels2) return;
    const prev = travels2.getState();
    const next2 = transform2(prev);
    if (next2 === prev) return;
    travels2.setState((draft) => {
      mergeDocIntoDraft(draft, next2, prev);
    });
    travels2.archive();
    setDoc(travels2.getState());
  }, []);
  const reset2 = reactExports.useCallback((next2) => {
    travelsRef.current = createHistory$1(next2);
    setDoc(next2);
  }, []);
  const undo2 = reactExports.useCallback(() => {
    const travels2 = travelsRef.current;
    if (!travels2?.canBack()) return;
    travels2.back();
    setDoc(travels2.getState());
  }, []);
  const redo2 = reactExports.useCallback(() => {
    const travels2 = travelsRef.current;
    if (!travels2?.canForward()) return;
    travels2.forward();
    setDoc(travels2.getState());
  }, []);
  const travels = travelsRef.current;
  return {
    doc: doc2,
    apply: apply2,
    reset: reset2,
    undo: undo2,
    redo: redo2,
    canUndo: travels?.canBack() ?? false,
    canRedo: travels?.canForward() ?? false,
  };
}

const TableEditor = reactExports.memo(TableEditorInner);

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
  const filterActive =
    !!history2.doc.filter && history2.doc.filter.conditions.length > 0;
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
            onClick={() =>
              setOpenPanel((p3) => (p3 === "fields" ? null : "fields"))
            }
            active={openPanel === "fields"}
          >
            <SettingsIcon />
          </ToolbarButton$2>
          {openPanel === "fields" && (
            <FieldConfigPanel
              history={history2}
              align="left"
              onClose={() => setOpenPanel(null)}
            />
          )}
        </div>
        <div className="relative">
          <ToolbarButton$2
            title={t2("canvas.table.filter", "Filter")}
            label={t2("canvas.table.filter", "Filter")}
            onClick={() =>
              setOpenPanel((p3) => (p3 === "filter" ? null : "filter"))
            }
            active={openPanel === "filter" || filterActive}
            dot={filterActive}
          >
            <FilterIcon />
          </ToolbarButton$2>
          {openPanel === "filter" && (
            <FilterPanel
              history={history2}
              align="right"
              onClose={() => setOpenPanel(null)}
            />
          )}
        </div>
        <div className="relative">
          <ToolbarButton$2
            title={t2("canvas.table.rowHeight", "Row height")}
            label={t2("canvas.table.rowHeight", "Row height")}
            onClick={() =>
              setOpenPanel((p3) => (p3 === "rowHeight" ? null : "rowHeight"))
            }
            active={openPanel === "rowHeight"}
          >
            <RowHeightIcon />
          </ToolbarButton$2>
          {openPanel === "rowHeight" && (
            <RowHeightPanel
              history={history2}
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

const NOOP_TITLE_CHANGE = () => {};

function TableFullscreenInner({ initialDoc, title, onClose, onTitleChange }) {
  const { t: t2 } = useTranslation();
  const active2 = useCanvasActive();
  const startDoc = initialDoc ?? createEmptyDocument();
  const history2 = useTableHistory(startDoc);
  const baselineDocRef = reactExports.useRef(startDoc);
  const [selectedRowIds, setSelectedRowIds] = reactExports.useState(
    () => new Set(),
  );
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
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable);
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
      if (
        meta2 ||
        (e2.shiftKey && (e2.code === "Digit1" || e2.code === "Digit2"))
      ) {
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

const TableFullscreen = reactExports.memo(TableFullscreenInner);

const HEADER_HEIGHT = 32;

const FALLBACK_ROW_HEIGHT = 32;

const FALLBACK_COL_WIDTH = 200;

const ATTACHMENT_VERTICAL_PADDING = 4;

const MIN_ATTACHMENT_CHIP_SIZE = 18;

const MAX_PREVIEW_CHIPS = 2;

function AttachmentPreviewChip({ attachment, size: size2 }) {
  const { t: t2 } = useTranslation();
  const meta2 = useAssetMetadataStore((s2) =>
    s2.assets.get(attachment.assetId),
  );
  const thumbnail = attachmentThumbnailUrl(attachment, meta2, size2);
  const [failedThumbnail, setFailedThumbnail] = reactExports.useState(null);
  const thumb = thumbnail === failedThumbnail ? void 0 : thumbnail;
  const missing = !meta2;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{
        width: size2,
        height: size2,
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
            size={size2 >= 30 ? 24 : 14}
            accessibleLabel={
              attachment.name.trim()
                ? attachment.name
                : t2("canvas.file.untitled", "Untitled")
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

function CellPreview({ value, type: type2, rowHeightPx, maxLines }) {
  if (type2 === "attachment") {
    const list2 = Array.isArray(value) ? value : [];
    return (
      <AttachmentPreviewList attachments={list2} rowHeightPx={rowHeightPx} />
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
  if (type2 === "number") {
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
  const text2 = String(value);
  return (
    <div
      className="h-full px-2"
      style={{
        paddingTop: 4,
        paddingBottom: 4,
      }}
      title={text2}
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
        {text2}
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

function FieldIcon({ type: type2 }) {
  if (type2 === "number") return <NumberIcon />;
  if (type2 === "attachment") return <PaperclipIcon />;
  return <TextFieldIcon />;
}

function TablePreviewInner({ doc: doc2, bodyHeight, bodyWidth }) {
  const { t: t2 } = useTranslation();
  const allColumns = reactExports.useMemo(
    () => (doc2 ? visibleColumns(doc2) : []),
    [doc2],
  );
  const rows = reactExports.useMemo(
    () => (doc2 ? applyFilter(doc2) : []),
    [doc2],
  );
  const rowHeightPx = doc2 ? getRowHeightPx(doc2) : FALLBACK_ROW_HEIGHT;
  const maxLines = doc2 ? getRowHeightLines(doc2) : 1;
  const columns = reactExports.useMemo(() => {
    if (allColumns.length === 0) return allColumns;
    const limit = Math.max(0, bodyWidth);
    let acc = 0;
    const out = [];
    for (const c3 of allColumns) {
      out.push(c3);
      acc += c3.width ?? FALLBACK_COL_WIDTH;
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
  if (!doc2) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--fg-muted,#999)]">
        {t2("canvas.table.loading", "Loading...")}
      </div>
    );
  }
  if (allColumns.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--fg-muted,#999)]">
        {t2("canvas.table.empty", "No visible columns")}
      </div>
    );
  }
  return (
    <div className="flex h-full w-full flex-col overflow-hidden text-[12px]">
      <table className="w-full table-fixed border-collapse select-none">
        <colgroup>
          {columns.map((c3) => (
            <col
              key={c3.id}
              style={{
                width: c3.width ?? FALLBACK_COL_WIDTH,
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
            {columns.map((c3) => (
              <th
                key={c3.id}
                className="border-b px-2 text-left font-normal"
                style={{
                  borderColor: "var(--canvas-node-border, #e5e5e5)",
                  background: "var(--bg-subtle, #fafafa)",
                  color: "var(--fg-muted, #525252)",
                }}
              >
                <span className="flex items-center gap-1 truncate">
                  <FieldIcon type={c3.type} />
                  <span className="truncate">{c3.title}</span>
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
                {t2("canvas.table.noRows", "No rows")}
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
                {columns.map((c3) => (
                  <td
                    key={c3.id}
                    className="overflow-hidden align-top"
                    style={{
                      height: rowHeightPx,
                      borderBottom:
                        "1px solid var(--canvas-node-border, #e5e5e5)",
                      color: "var(--fg-default, #141414)",
                    }}
                  >
                    <CellPreview
                      value={row.cells[c3.id]}
                      type={c3.type}
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
              {t2("canvas.table.moreRows", "+{{count}} rows", {
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
  id: id2,
  selected: selected2,
  width,
  height,
  data: data2,
}) {
  const { t: t2 } = useTranslation();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const isDragging = useCanvasNodeIsDragging(id2);
  const isInteractiveSelect = !isMultiSelect && !isBoxSelecting && !isDragging;
  const tableData = data2 ?? {};
  const tablePath = tableData.tablePath;
  const title =
    tableData.title || t2("canvas.table.untitled", "Untitled table");
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
  const [doc2, setDoc] = reactExports.useState(null);
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
      .then((raw2) => {
        if (cancelled) return;
        try {
          setDoc(parseTableDocument(raw2));
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
  const handleDoubleClick2 = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
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
      updateNodeData(id2, {
        ...tableDataRef.current,
        title: newName,
      });
    },
    [id2, updateNodeData],
  );
  const handleAddToChat = reactExports.useCallback(() => {
    if (!tablePath || !onAddToChat) return;
    onAddToChat(tablePath, `${title}.htable`, id2);
  }, [tablePath, onAddToChat, title, id2]);
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
            t2("canvas.table.saveFailed", "Failed to save table"),
          );
        });
      }
    },
    [tablePath, saveTableContent, t2],
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
        label: t2("canvas.addToChat"),
        icon: <AddToChatIcon />,
        onClick: handleAddToChat,
      },
      {
        id: "fullscreen",
        label: t2("canvas.fullscreenEdit"),
        icon: <FullscreenIcon$1 />,
        onClick: () => {
          if (loaded) setFullscreen(true);
        },
      },
    ],
    [t2, handleAddToChat, loaded],
  );
  return (
    <NodeShell width={nodeWidth} dataActionUiId="canvas.table-node">
      <NodeHeader
        nodeType="table"
        name={title}
        selected={selected2}
        maxWidth={nodeWidth}
        onRename={handleRename}
        preserveExtension={false}
      />
      {selected2 && isInteractiveSelect && (
        <NodeToolbar items={toolbarItems} visible={true} />
      )}
      <NodeHandles nodeId={id2} selected={!!selected2} />
      <NodeBody
        width={nodeWidth}
        height={nodeHeight}
        selected={!!selected2}
        variant="panel"
        onDoubleClick={handleDoubleClick2}
      >
        <div
          style={{
            margin: "-12px -16px",
          }}
        >
          <TablePreview
            doc={doc2}
            bodyHeight={previewBodyHeight}
            bodyWidth={previewBodyWidth}
          />
        </div>
      </NodeBody>
      {selected2 && (
        <NodeResizeFrame
          nodeId={id2}
          minWidth={TABLE_CARD_DEFAULT_SIZE.width}
          minHeight={TABLE_CARD_DEFAULT_SIZE.height}
          onResize={handleResize}
        />
      )}
      {fullscreen && (
        <TableFullscreen
          initialDoc={doc2}
          title={title}
          onClose={handleCloseFullscreen}
          onTitleChange={handleRename}
        />
      )}
    </NodeShell>
  );
}

export const TableNode = reactExports.memo(TableNodeInner, areNodePropsEqual);
