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

function migrateFilter(raw2) {
  if (!raw2) return void 0;
  if (Array.isArray(raw2.conditions)) {
    const filter2 = raw2;
    if (filter2.conditions.length === 0) return void 0;
    return {
      match: filter2.match === "all" ? "all" : "any",
      conditions: filter2.conditions.map((condition) => ({
        id: condition.id || newConditionId(),
        columnId: condition.columnId,
        op: condition.op,
        value: condition.value,
      })),
    };
  }
  const legacy = raw2;
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

export function parseTableDocument(raw2) {
  const data2 = JSON.parse(raw2);
  if (!data2 || typeof data2 !== "object") {
    throw new Error("Invalid table document: not an object");
  }
  const doc2 = data2;
  if (doc2.version !== TABLE_DOCUMENT_VERSION) {
    throw new Error(`Unsupported table document version: ${doc2.version}`);
  }
  if (!Array.isArray(doc2.columns) || !Array.isArray(doc2.rows)) {
    throw new Error("Invalid table document: columns/rows must be arrays");
  }
  const rowHeight = isTableRowHeight(doc2.rowHeight) ? doc2.rowHeight : void 0;
  const rows = doc2.rows.map((row) => {
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
  const filter2 = migrateFilter(doc2.filter);
  return {
    version: doc2.version,
    columns: doc2.columns,
    rows,
    ...(filter2
      ? {
          filter: filter2,
        }
      : {}),
    ...(rowHeight
      ? {
          rowHeight,
        }
      : {}),
  };
}
