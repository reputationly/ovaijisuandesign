// create-column.jsx
import { CompositedSvg, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { PlaceholderNodeInner } from "./placeholder-node-inner.jsx";
import { areNodePropsEqual } from "../canvas/fullscreen-icon.jsx";
export const PlaceholderNode = reactExports.memo(
  PlaceholderNodeInner,
  areNodePropsEqual,
);
function isConditionInactive(cond) {
  if (cond.op === "empty" || cond.op === "notEmpty") return false;
  if (cond.value === void 0) return true;
  if (typeof cond.value === "string" && cond.value.length === 0) return true;
  return false;
}
function isEmptyCell(cell) {
  if (cell == null) return true;
  if (typeof cell === "string") return cell.length === 0;
  if (Array.isArray(cell)) return cell.length === 0;
  return false;
}
function matchesCondition(cell, fieldType, op, value) {
  if (op === "empty") return isEmptyCell(cell);
  if (op === "notEmpty") return !isEmptyCell(cell);
  if (fieldType === "text") {
    if (typeof cell !== "string") return false;
    const target = String(value ?? "");
    switch (op) {
      case "contains":
        return cell.toLowerCase().includes(target.toLowerCase());
      case "notContains":
        return !cell.toLowerCase().includes(target.toLowerCase());
      case "equals":
        return cell === target;
      case "notEquals":
        return cell !== target;
      default:
        return false;
    }
  }
  if (fieldType === "number") {
    const n2 = typeof cell === "number" ? cell : Number.NaN;
    if (Number.isNaN(n2)) return false;
    const t2 = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(t2)) return false;
    switch (op) {
      case "equals":
        return n2 === t2;
      case "notEquals":
        return n2 !== t2;
      case "gt":
        return n2 > t2;
      case "lt":
        return n2 < t2;
      case "gte":
        return n2 >= t2;
      case "lte":
        return n2 <= t2;
      default:
        return false;
    }
  }
  return false;
}
export function applyFilter(doc2) {
  const f2 = doc2.filter;
  if (!f2 || f2.conditions.length === 0) return doc2.rows;
  const predicates = f2.conditions.map((cond) => {
    const column = doc2.columns.find((c3) => c3.id === cond.columnId);
    if (!column) return () => true;
    if (isConditionInactive(cond)) return () => true;
    return (row) =>
      matchesCondition(
        row.cells[cond.columnId],
        column.type,
        cond.op,
        cond.value,
      );
  });
  if (f2.match === "all") {
    return doc2.rows.filter((row) => predicates.every((p3) => p3(row)));
  }
  return doc2.rows.filter((row) => predicates.some((p3) => p3(row)));
}
export function visibleColumns(doc2) {
  return doc2.columns.filter((c3) => c3.visible !== false);
}
export const MATCH_LABELS = {
  all: {
    key: "canvas.table.filter.match.all",
    defaultLabel: "all",
  },
  any: {
    key: "canvas.table.filter.match.any",
    defaultLabel: "any",
  },
};
export const ROW_HEIGHT_LABELS = {
  low: {
    key: "canvas.table.rowHeight.low",
    defaultLabel: "Low",
  },
  medium: {
    key: "canvas.table.rowHeight.medium",
    defaultLabel: "Medium",
  },
  tall: {
    key: "canvas.table.rowHeight.tall",
    defaultLabel: "Tall",
  },
  extraTall: {
    key: "canvas.table.rowHeight.extraTall",
    defaultLabel: "Extra tall",
  },
};
export function CheckIcon() {
  return (
    <CompositedSvg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path
        d="M3 8.5L6.5 12L13 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
export {
  createCell as createCell$1,
  createColumn,
  flattenBy,
  functionalUpdate,
  getMemoOptions,
  isFunction,
  isNumberArray,
  makeStateUpdater,
  memo as memo$1,
} from "@tanstack/table-core";
