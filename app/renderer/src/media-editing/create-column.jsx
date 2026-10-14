// create-column.jsx
import reactExports from "react";
import { CompositedSvg } from "./icon-compositing.js";
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
function matchesCondition(cell, fieldType, operator, value) {
  if (operator === "empty") return isEmptyCell(cell);
  if (operator === "notEmpty") return !isEmptyCell(cell);
  if (fieldType === "text") {
    if (typeof cell !== "string") return false;
    const target = String(value ?? "");
    switch (operator) {
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
    const cellNumber = typeof cell === "number" ? cell : Number.NaN;
    if (Number.isNaN(cellNumber)) return false;
    const targetNumber = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(targetNumber)) return false;
    switch (operator) {
      case "equals":
        return cellNumber === targetNumber;
      case "notEquals":
        return cellNumber !== targetNumber;
      case "gt":
        return cellNumber > targetNumber;
      case "lt":
        return cellNumber < targetNumber;
      case "gte":
        return cellNumber >= targetNumber;
      case "lte":
        return cellNumber <= targetNumber;
      default:
        return false;
    }
  }
  return false;
}
export function applyFilter(columnDocument) {
  const filterConfig = columnDocument.filter;
  if (!filterConfig || filterConfig.conditions.length === 0) return columnDocument.rows;
  const predicates = filterConfig.conditions.map((cond) => {
    const column = columnDocument.columns.find((column) => column.id === cond.columnId);
    if (!column) return () => true;
    if (isConditionInactive(cond)) return () => true;
    return (rowData) =>
      matchesCondition(
        rowData.cells[cond.columnId],
        column.type,
        cond.op,
        cond.value,
      );
  });
  if (filterConfig.match === "all") {
    return columnDocument.rows.filter((rowData) => predicates.every((predicate) => predicate(rowData)));
  }
  return columnDocument.rows.filter((rowData) => predicates.some((predicate) => predicate(rowData)));
}
export function visibleColumns(columnDocument) {
  return columnDocument.columns.filter((column) => column.visible !== false);
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
