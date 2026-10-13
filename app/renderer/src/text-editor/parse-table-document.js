// parse-table-document.js
import {
  clampRowHeightPx,
  newConditionId,
  ROW_HEIGHT_ORDER,
  TABLE_DOCUMENT_VERSION,
} from "../canvas/is-reexecutable-generation-node.js";

const ROW_HEIGHT_SET = new Set(ROW_HEIGHT_ORDER);

function isTableRowHeight(value) {
  return typeof value === "string" && ROW_HEIGHT_SET.has(value);
}

function sanitizeRowHeightOverride(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return void 0;
  return clampRowHeightPx(value);
}

function migrateFilter(raw) {
  if (!raw) return void 0;
  if (Array.isArray(raw.conditions)) {
    const filter = raw;
    if (filter.conditions.length === 0) return void 0;
    return {
      match: filter.match === "all" ? "all" : "any",
      conditions: filter.conditions.map((condition) => ({
        id: condition.id || newConditionId(),
        columnId: condition.columnId,
        op: condition.op,
        value: condition.value,
      })),
    };
  }
  const legacy = raw;
  if (!legacy.columnId || !legacy.op) return void 0;
  return {
    match: "any",
    conditions: [
      {
        id: newConditionId(),
        columnId: legacy.columnId,
        op: legacy.op,
        value: legacy.value,
      },
    ],
  };
}

export function parseTableDocument(raw) {
  const data = JSON.parse(raw);
  if (!data || typeof data !== "object") {
    throw new Error("Invalid table document: not an object");
  }
  const doc = data;
  if (doc.version !== TABLE_DOCUMENT_VERSION) {
    throw new Error(`Unsupported table document version: ${doc.version}`);
  }
  if (!Array.isArray(doc.columns) || !Array.isArray(doc.rows)) {
    throw new Error("Invalid table document: columns/rows must be arrays");
  }
  const rowHeight = isTableRowHeight(doc.rowHeight) ? doc.rowHeight : void 0;
  const rows = doc.rows.map((row) => {
    if (!("height" in row) || row.height === void 0) return row;
    const sanitized = sanitizeRowHeightOverride(row.height);
    if (sanitized === row.height) return row;
    if (sanitized === void 0) {
      const { height: _drop, ...rest } = row;
      return rest;
    }
    return {
      ...row,
      height: sanitized,
    };
  });
  const filter = migrateFilter(doc.filter);
  return {
    version: doc.version,
    columns: doc.columns,
    rows,
    ...(filter
      ? {
          filter,
        }
      : {}),
    ...(rowHeight
      ? {
          rowHeight,
        }
      : {}),
  };
}
