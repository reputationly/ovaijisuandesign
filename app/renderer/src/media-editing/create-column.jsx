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
export function functionalUpdate(updater, input) {
  return typeof updater === "function" ? updater(input) : updater;
}
export function makeStateUpdater(key2, instance2) {
  return (updater) => {
    instance2.setState((old) => {
      return {
        ...old,
        [key2]: functionalUpdate(updater, old[key2]),
      };
    });
  };
}
export function isFunction(d2) {
  return d2 instanceof Function;
}
export function isNumberArray(d2) {
  return Array.isArray(d2) && d2.every((val) => typeof val === "number");
}
export function flattenBy(arr, getChildren2) {
  const flat = [];
  const recurse = (subArr) => {
    subArr.forEach((item) => {
      flat.push(item);
      const children2 = getChildren2(item);
      if (children2 != null && children2.length) {
        recurse(children2);
      }
    });
  };
  recurse(arr);
  return flat;
}
export function memo$1(getDeps, fn2, opts) {
  let deps = [];
  let result;
  return (depArgs) => {
    let depTime;
    if (opts.key && opts.debug) depTime = Date.now();
    const newDeps = getDeps(depArgs);
    const depsChanged =
      newDeps.length !== deps.length ||
      newDeps.some((dep, index2) => deps[index2] !== dep);
    if (!depsChanged) {
      return result;
    }
    deps = newDeps;
    let resultTime;
    if (opts.key && opts.debug) resultTime = Date.now();
    result = fn2(...newDeps);
    opts == null || opts.onChange == null || opts.onChange(result);
    if (opts.key && opts.debug) {
      if (opts != null && opts.debug()) {
        const depEndTime = Math.round((Date.now() - depTime) * 100) / 100;
        const resultEndTime = Math.round((Date.now() - resultTime) * 100) / 100;
        const resultFpsPercentage = resultEndTime / 16;
        const pad = (str2, num) => {
          str2 = String(str2);
          while (str2.length < num) {
            str2 = " " + str2;
          }
          return str2;
        };
        console.info(
          `%c⏱ ${pad(resultEndTime, 5)} /${pad(depEndTime, 5)} ms`,
          `
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(0, Math.min(120 - 120 * resultFpsPercentage, 120))}deg 100% 31%);`,
          opts == null ? void 0 : opts.key,
        );
      }
    }
    return result;
  };
}
export function getMemoOptions(tableOptions, debugLevel, key2, onChange) {
  return {
    debug: () => {
      var _tableOptions$debugAl;
      return (_tableOptions$debugAl =
        tableOptions == null ? void 0 : tableOptions.debugAll) != null
        ? _tableOptions$debugAl
        : tableOptions[debugLevel];
    },
    key: false,
    onChange,
  };
}
export function createCell$1(table2, row, column, columnId) {
  const getRenderValue = () => {
    var _cell$getValue;
    return (_cell$getValue = cell.getValue()) != null
      ? _cell$getValue
      : table2.options.renderFallbackValue;
  };
  const cell = {
    id: `${row.id}_${column.id}`,
    row,
    column,
    getValue: () => row.getValue(columnId),
    renderValue: getRenderValue,
    getContext: memo$1(
      () => [table2, column, row, cell],
      (table22, column2, row2, cell2) => ({
        table: table22,
        column: column2,
        row: row2,
        cell: cell2,
        getValue: cell2.getValue,
        renderValue: cell2.renderValue,
      }),
      getMemoOptions(table2.options, "debugCells"),
    ),
  };
  table2._features.forEach((feature) => {
    feature.createCell == null || feature.createCell(cell, column, row, table2);
  }, {});
  return cell;
}
export function createColumn(table2, columnDef, depth2, parent) {
  var _ref, _resolvedColumnDef$id;
  const defaultColumn = table2._getDefaultColumnDef();
  const resolvedColumnDef = {
    ...defaultColumn,
    ...columnDef,
  };
  const accessorKey = resolvedColumnDef.accessorKey;
  let id2 =
    (_ref =
      (_resolvedColumnDef$id = resolvedColumnDef.id) != null
        ? _resolvedColumnDef$id
        : accessorKey
          ? typeof String.prototype.replaceAll === "function"
            ? accessorKey.replaceAll(".", "_")
            : accessorKey.replace(/\./g, "_")
          : void 0) != null
      ? _ref
      : typeof resolvedColumnDef.header === "string"
        ? resolvedColumnDef.header
        : void 0;
  let accessorFn;
  if (resolvedColumnDef.accessorFn) {
    accessorFn = resolvedColumnDef.accessorFn;
  } else if (accessorKey) {
    if (accessorKey.includes(".")) {
      accessorFn = (originalRow) => {
        let result = originalRow;
        for (const key2 of accessorKey.split(".")) {
          var _result;
          result = (_result = result) == null ? void 0 : _result[key2];
        }
        return result;
      };
    } else {
      accessorFn = (originalRow) => originalRow[resolvedColumnDef.accessorKey];
    }
  }
  if (!id2) {
    throw new Error();
  }
  let column = {
    id: `${String(id2)}`,
    accessorFn,
    parent,
    depth: depth2,
    columnDef: resolvedColumnDef,
    columns: [],
    getFlatColumns: memo$1(
      () => [true],
      () => {
        var _column$columns;
        return [
          column,
          ...((_column$columns = column.columns) == null
            ? void 0
            : _column$columns.flatMap((d2) => d2.getFlatColumns())),
        ];
      },
      getMemoOptions(table2.options, "debugColumns"),
    ),
    getLeafColumns: memo$1(
      () => [table2._getOrderColumnsFn()],
      (orderColumns2) => {
        var _column$columns2;
        if (
          (_column$columns2 = column.columns) != null &&
          _column$columns2.length
        ) {
          let leafColumns = column.columns.flatMap((column2) =>
            column2.getLeafColumns(),
          );
          return orderColumns2(leafColumns);
        }
        return [column];
      },
      getMemoOptions(table2.options, "debugColumns"),
    ),
  };
  for (const feature of table2._features) {
    feature.createColumn == null || feature.createColumn(column, table2);
  }
  return column;
}
