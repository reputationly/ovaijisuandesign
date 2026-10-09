// column-filtering.js
import { testFalsey, equals } from "../vendor.js";
import {
  createCell$1,
  flattenBy,
  functionalUpdate$2,
  getMemoOptions,
  isFunction$1,
  isNumberArray,
  makeStateUpdater,
  memo$1,
} from "./ready-sub-video-card.jsx";
const debug = "debugHeaders";
function createHeader(table2, column, options) {
  var _options$id;
  const id2 = (_options$id = options.id) != null ? _options$id : column.id;
  let header = {
    id: id2,
    column,
    index: options.index,
    isPlaceholder: !!options.isPlaceholder,
    placeholderId: options.placeholderId,
    depth: options.depth,
    subHeaders: [],
    colSpan: 0,
    rowSpan: 0,
    headerGroup: null,
    getLeafHeaders: () => {
      const leafHeaders = [];
      const recurseHeader = (h2) => {
        if (h2.subHeaders && h2.subHeaders.length) {
          h2.subHeaders.map(recurseHeader);
        }
        leafHeaders.push(h2);
      };
      recurseHeader(header);
      return leafHeaders;
    },
    getContext: () => ({
      table: table2,
      header,
      column,
    }),
  };
  table2._features.forEach((feature) => {
    feature.createHeader == null || feature.createHeader(header, table2);
  });
  return header;
}
export const Headers$1 = {
  createTable: (table2) => {
    table2.getHeaderGroups = memo$1(
      () => [
        table2.getAllColumns(),
        table2.getVisibleLeafColumns(),
        table2.getState().columnPinning.left,
        table2.getState().columnPinning.right,
      ],
      (allColumns, leafColumns, left, right) => {
        var _left$map$filter, _right$map$filter;
        const leftColumns =
          (_left$map$filter =
            left == null
              ? void 0
              : left
                  .map((columnId) => leafColumns.find((d2) => d2.id === columnId))
                  .filter(Boolean)) != null
            ? _left$map$filter
            : [];
        const rightColumns =
          (_right$map$filter =
            right == null
              ? void 0
              : right
                  .map((columnId) => leafColumns.find((d2) => d2.id === columnId))
                  .filter(Boolean)) != null
            ? _right$map$filter
            : [];
        const centerColumns = leafColumns.filter(
          (column) =>
            !(left != null && left.includes(column.id)) &&
            !(right != null && right.includes(column.id)),
        );
        const headerGroups = buildHeaderGroups(
          allColumns,
          [...leftColumns, ...centerColumns, ...rightColumns],
          table2,
        );
        return headerGroups;
      },
      getMemoOptions(table2.options, debug),
    );
    table2.getCenterHeaderGroups = memo$1(
      () => [
        table2.getAllColumns(),
        table2.getVisibleLeafColumns(),
        table2.getState().columnPinning.left,
        table2.getState().columnPinning.right,
      ],
      (allColumns, leafColumns, left, right) => {
        leafColumns = leafColumns.filter(
          (column) =>
            !(left != null && left.includes(column.id)) &&
            !(right != null && right.includes(column.id)),
        );
        return buildHeaderGroups(allColumns, leafColumns, table2, "center");
      },
      getMemoOptions(table2.options, debug),
    );
    table2.getLeftHeaderGroups = memo$1(
      () => [
        table2.getAllColumns(),
        table2.getVisibleLeafColumns(),
        table2.getState().columnPinning.left,
      ],
      (allColumns, leafColumns, left) => {
        var _left$map$filter2;
        const orderedLeafColumns =
          (_left$map$filter2 =
            left == null
              ? void 0
              : left
                  .map((columnId) => leafColumns.find((d2) => d2.id === columnId))
                  .filter(Boolean)) != null
            ? _left$map$filter2
            : [];
        return buildHeaderGroups(allColumns, orderedLeafColumns, table2, "left");
      },
      getMemoOptions(table2.options, debug),
    );
    table2.getRightHeaderGroups = memo$1(
      () => [
        table2.getAllColumns(),
        table2.getVisibleLeafColumns(),
        table2.getState().columnPinning.right,
      ],
      (allColumns, leafColumns, right) => {
        var _right$map$filter2;
        const orderedLeafColumns =
          (_right$map$filter2 =
            right == null
              ? void 0
              : right
                  .map((columnId) => leafColumns.find((d2) => d2.id === columnId))
                  .filter(Boolean)) != null
            ? _right$map$filter2
            : [];
        return buildHeaderGroups(allColumns, orderedLeafColumns, table2, "right");
      },
      getMemoOptions(table2.options, debug),
    );
    table2.getFooterGroups = memo$1(
      () => [table2.getHeaderGroups()],
      (headerGroups) => {
        return [...headerGroups].reverse();
      },
      getMemoOptions(table2.options, debug),
    );
    table2.getLeftFooterGroups = memo$1(
      () => [table2.getLeftHeaderGroups()],
      (headerGroups) => {
        return [...headerGroups].reverse();
      },
      getMemoOptions(table2.options, debug),
    );
    table2.getCenterFooterGroups = memo$1(
      () => [table2.getCenterHeaderGroups()],
      (headerGroups) => {
        return [...headerGroups].reverse();
      },
      getMemoOptions(table2.options, debug),
    );
    table2.getRightFooterGroups = memo$1(
      () => [table2.getRightHeaderGroups()],
      (headerGroups) => {
        return [...headerGroups].reverse();
      },
      getMemoOptions(table2.options, debug),
    );
    table2.getFlatHeaders = memo$1(
      () => [table2.getHeaderGroups()],
      (headerGroups) => {
        return headerGroups
          .map((headerGroup) => {
            return headerGroup.headers;
          })
          .flat();
      },
      getMemoOptions(table2.options, debug),
    );
    table2.getLeftFlatHeaders = memo$1(
      () => [table2.getLeftHeaderGroups()],
      (left) => {
        return left
          .map((headerGroup) => {
            return headerGroup.headers;
          })
          .flat();
      },
      getMemoOptions(table2.options, debug),
    );
    table2.getCenterFlatHeaders = memo$1(
      () => [table2.getCenterHeaderGroups()],
      (left) => {
        return left
          .map((headerGroup) => {
            return headerGroup.headers;
          })
          .flat();
      },
      getMemoOptions(table2.options, debug),
    );
    table2.getRightFlatHeaders = memo$1(
      () => [table2.getRightHeaderGroups()],
      (left) => {
        return left
          .map((headerGroup) => {
            return headerGroup.headers;
          })
          .flat();
      },
      getMemoOptions(table2.options, debug),
    );
    table2.getCenterLeafHeaders = memo$1(
      () => [table2.getCenterFlatHeaders()],
      (flatHeaders) => {
        return flatHeaders.filter((header) => {
          var _header$subHeaders;
          return !((_header$subHeaders = header.subHeaders) != null && _header$subHeaders.length);
        });
      },
      getMemoOptions(table2.options, debug),
    );
    table2.getLeftLeafHeaders = memo$1(
      () => [table2.getLeftFlatHeaders()],
      (flatHeaders) => {
        return flatHeaders.filter((header) => {
          var _header$subHeaders2;
          return !((_header$subHeaders2 = header.subHeaders) != null && _header$subHeaders2.length);
        });
      },
      getMemoOptions(table2.options, debug),
    );
    table2.getRightLeafHeaders = memo$1(
      () => [table2.getRightFlatHeaders()],
      (flatHeaders) => {
        return flatHeaders.filter((header) => {
          var _header$subHeaders3;
          return !((_header$subHeaders3 = header.subHeaders) != null && _header$subHeaders3.length);
        });
      },
      getMemoOptions(table2.options, debug),
    );
    table2.getLeafHeaders = memo$1(
      () => [
        table2.getLeftHeaderGroups(),
        table2.getCenterHeaderGroups(),
        table2.getRightHeaderGroups(),
      ],
      (left, center, right) => {
        var _left$0$headers, _left$, _center$0$headers, _center$, _right$0$headers, _right$;
        return [
          ...((_left$0$headers = (_left$ = left[0]) == null ? void 0 : _left$.headers) != null
            ? _left$0$headers
            : []),
          ...((_center$0$headers = (_center$ = center[0]) == null ? void 0 : _center$.headers) !=
          null
            ? _center$0$headers
            : []),
          ...((_right$0$headers = (_right$ = right[0]) == null ? void 0 : _right$.headers) != null
            ? _right$0$headers
            : []),
        ]
          .map((header) => {
            return header.getLeafHeaders();
          })
          .flat();
      },
      getMemoOptions(table2.options, debug),
    );
  },
};
function buildHeaderGroups(allColumns, columnsToGroup, table2, headerFamily) {
  var _headerGroups$0$heade, _headerGroups$;
  let maxDepth = 0;
  const findMaxDepth = function (columns, depth2) {
    if (depth2 === void 0) {
      depth2 = 1;
    }
    maxDepth = Math.max(maxDepth, depth2);
    columns
      .filter((column) => column.getIsVisible())
      .forEach((column) => {
        var _column$columns;
        if ((_column$columns = column.columns) != null && _column$columns.length) {
          findMaxDepth(column.columns, depth2 + 1);
        }
      }, 0);
  };
  findMaxDepth(allColumns);
  let headerGroups = [];
  const createHeaderGroup = (headersToGroup, depth2) => {
    const headerGroup = {
      depth: depth2,
      id: [headerFamily, `${depth2}`].filter(Boolean).join("_"),
      headers: [],
    };
    const pendingParentHeaders = [];
    headersToGroup.forEach((headerToGroup) => {
      const latestPendingParentHeader = [...pendingParentHeaders].reverse()[0];
      const isLeafHeader = headerToGroup.column.depth === headerGroup.depth;
      let column;
      let isPlaceholder = false;
      if (isLeafHeader && headerToGroup.column.parent) {
        column = headerToGroup.column.parent;
      } else {
        column = headerToGroup.column;
        isPlaceholder = true;
      }
      if (
        latestPendingParentHeader &&
        (latestPendingParentHeader == null ? void 0 : latestPendingParentHeader.column) === column
      ) {
        latestPendingParentHeader.subHeaders.push(headerToGroup);
      } else {
        const header = createHeader(table2, column, {
          id: [headerFamily, depth2, column.id, headerToGroup == null ? void 0 : headerToGroup.id]
            .filter(Boolean)
            .join("_"),
          isPlaceholder,
          placeholderId: isPlaceholder
            ? `${pendingParentHeaders.filter((d2) => d2.column === column).length}`
            : void 0,
          depth: depth2,
          index: pendingParentHeaders.length,
        });
        header.subHeaders.push(headerToGroup);
        pendingParentHeaders.push(header);
      }
      headerGroup.headers.push(headerToGroup);
      headerToGroup.headerGroup = headerGroup;
    });
    headerGroups.push(headerGroup);
    if (depth2 > 0) {
      createHeaderGroup(pendingParentHeaders, depth2 - 1);
    }
  };
  const bottomHeaders = columnsToGroup.map((column, index2) =>
    createHeader(table2, column, {
      depth: maxDepth,
      index: index2,
    }),
  );
  createHeaderGroup(bottomHeaders, maxDepth - 1);
  headerGroups.reverse();
  const recurseHeadersForSpans = (headers) => {
    const filteredHeaders = headers.filter((header) => header.column.getIsVisible());
    return filteredHeaders.map((header) => {
      let colSpan = 0;
      let rowSpan = 0;
      let childRowSpans = [0];
      if (header.subHeaders && header.subHeaders.length) {
        childRowSpans = [];
        recurseHeadersForSpans(header.subHeaders).forEach((_ref) => {
          let { colSpan: childColSpan, rowSpan: childRowSpan } = _ref;
          colSpan += childColSpan;
          childRowSpans.push(childRowSpan);
        });
      } else {
        colSpan = 1;
      }
      const minChildRowSpan = Math.min(...childRowSpans);
      rowSpan = rowSpan + minChildRowSpan;
      header.colSpan = colSpan;
      header.rowSpan = rowSpan;
      return {
        colSpan,
        rowSpan,
      };
    });
  };
  recurseHeadersForSpans(
    (_headerGroups$0$heade =
      (_headerGroups$ = headerGroups[0]) == null ? void 0 : _headerGroups$.headers) != null
      ? _headerGroups$0$heade
      : [],
  );
  return headerGroups;
}
export const createRow = (table2, id2, original, rowIndex, depth2, subRows, parentId) => {
  let row = {
    id: id2,
    index: rowIndex,
    original,
    depth: depth2,
    parentId,
    _valuesCache: {},
    _uniqueValuesCache: {},
    getValue: (columnId) => {
      if (row._valuesCache.hasOwnProperty(columnId)) {
        return row._valuesCache[columnId];
      }
      const column = table2.getColumn(columnId);
      if (!(column != null && column.accessorFn)) {
        return void 0;
      }
      row._valuesCache[columnId] = column.accessorFn(row.original, rowIndex);
      return row._valuesCache[columnId];
    },
    getUniqueValues: (columnId) => {
      if (row._uniqueValuesCache.hasOwnProperty(columnId)) {
        return row._uniqueValuesCache[columnId];
      }
      const column = table2.getColumn(columnId);
      if (!(column != null && column.accessorFn)) {
        return void 0;
      }
      if (!column.columnDef.getUniqueValues) {
        row._uniqueValuesCache[columnId] = [row.getValue(columnId)];
        return row._uniqueValuesCache[columnId];
      }
      row._uniqueValuesCache[columnId] = column.columnDef.getUniqueValues(row.original, rowIndex);
      return row._uniqueValuesCache[columnId];
    },
    renderValue: (columnId) => {
      var _row$getValue;
      return (_row$getValue = row.getValue(columnId)) != null
        ? _row$getValue
        : table2.options.renderFallbackValue;
    },
    subRows: [],
    getLeafRows: () => flattenBy(row.subRows, (d2) => d2.subRows),
    getParentRow: () => (row.parentId ? table2.getRow(row.parentId, true) : void 0),
    getParentRows: () => {
      let parentRows = [];
      let currentRow = row;
      while (true) {
        const parentRow = currentRow.getParentRow();
        if (!parentRow) break;
        parentRows.push(parentRow);
        currentRow = parentRow;
      }
      return parentRows.reverse();
    },
    getAllCells: memo$1(
      () => [table2.getAllLeafColumns()],
      (leafColumns) => {
        return leafColumns.map((column) => {
          return createCell$1(table2, row, column, column.id);
        });
      },
      getMemoOptions(table2.options, "debugRows"),
    ),
    _getAllCellsByColumnId: memo$1(
      () => [row.getAllCells()],
      (allCells) => {
        return allCells.reduce((acc, cell) => {
          acc[cell.column.id] = cell;
          return acc;
        }, {});
      },
      getMemoOptions(table2.options, "debugRows"),
    ),
  };
  for (let i2 = 0; i2 < table2._features.length; i2++) {
    const feature = table2._features[i2];
    feature == null || feature.createRow == null || feature.createRow(row, table2);
  }
  return row;
};
export const ColumnFaceting = {
  createColumn: (column, table2) => {
    column._getFacetedRowModel =
      table2.options.getFacetedRowModel && table2.options.getFacetedRowModel(table2, column.id);
    column.getFacetedRowModel = () => {
      if (!column._getFacetedRowModel) {
        return table2.getPreFilteredRowModel();
      }
      return column._getFacetedRowModel();
    };
    column._getFacetedUniqueValues =
      table2.options.getFacetedUniqueValues &&
      table2.options.getFacetedUniqueValues(table2, column.id);
    column.getFacetedUniqueValues = () => {
      if (!column._getFacetedUniqueValues) {
        return new Map();
      }
      return column._getFacetedUniqueValues();
    };
    column._getFacetedMinMaxValues =
      table2.options.getFacetedMinMaxValues &&
      table2.options.getFacetedMinMaxValues(table2, column.id);
    column.getFacetedMinMaxValues = () => {
      if (!column._getFacetedMinMaxValues) {
        return void 0;
      }
      return column._getFacetedMinMaxValues();
    };
  },
};
const includesString$1 = (row, columnId, filterValue) => {
  var _filterValue$toString, _row$getValue;
  const search2 =
    filterValue == null || (_filterValue$toString = filterValue.toString()) == null
      ? void 0
      : _filterValue$toString.toLowerCase();
  return Boolean(
    (_row$getValue = row.getValue(columnId)) == null ||
      (_row$getValue = _row$getValue.toString()) == null ||
      (_row$getValue = _row$getValue.toLowerCase()) == null
      ? void 0
      : _row$getValue.includes(search2),
  );
};
includesString$1.autoRemove = (val) => testFalsey(val);
const includesStringSensitive = (row, columnId, filterValue) => {
  var _row$getValue2;
  return Boolean(
    (_row$getValue2 = row.getValue(columnId)) == null ||
      (_row$getValue2 = _row$getValue2.toString()) == null
      ? void 0
      : _row$getValue2.includes(filterValue),
  );
};
includesStringSensitive.autoRemove = (val) => testFalsey(val);
const equalsString = (row, columnId, filterValue) => {
  var _row$getValue3;
  return (
    ((_row$getValue3 = row.getValue(columnId)) == null ||
    (_row$getValue3 = _row$getValue3.toString()) == null
      ? void 0
      : _row$getValue3.toLowerCase()) === (filterValue == null ? void 0 : filterValue.toLowerCase())
  );
};
equalsString.autoRemove = (val) => testFalsey(val);
const arrIncludes = (row, columnId, filterValue) => {
  var _row$getValue4;
  return (_row$getValue4 = row.getValue(columnId)) == null
    ? void 0
    : _row$getValue4.includes(filterValue);
};
arrIncludes.autoRemove = (val) => testFalsey(val);
const arrIncludesAll = (row, columnId, filterValue) => {
  return !filterValue.some((val) => {
    var _row$getValue5;
    return !((_row$getValue5 = row.getValue(columnId)) != null && _row$getValue5.includes(val));
  });
};
arrIncludesAll.autoRemove = (val) => testFalsey(val) || !(val != null && val.length);
const arrIncludesSome = (row, columnId, filterValue) => {
  return filterValue.some((val) => {
    var _row$getValue6;
    return (_row$getValue6 = row.getValue(columnId)) == null
      ? void 0
      : _row$getValue6.includes(val);
  });
};
arrIncludesSome.autoRemove = (val) => testFalsey(val) || !(val != null && val.length);
const weakEquals = (row, columnId, filterValue) => {
  return row.getValue(columnId) == filterValue;
};
weakEquals.autoRemove = (val) => testFalsey(val);
const inNumberRange = (row, columnId, filterValue) => {
  let [min2, max2] = filterValue;
  const rowValue = row.getValue(columnId);
  return rowValue >= min2 && rowValue <= max2;
};
inNumberRange.resolveFilterValue = (val) => {
  let [unsafeMin, unsafeMax] = val;
  let parsedMin = typeof unsafeMin !== "number" ? parseFloat(unsafeMin) : unsafeMin;
  let parsedMax = typeof unsafeMax !== "number" ? parseFloat(unsafeMax) : unsafeMax;
  let min2 = unsafeMin === null || Number.isNaN(parsedMin) ? -Infinity : parsedMin;
  let max2 = unsafeMax === null || Number.isNaN(parsedMax) ? Infinity : parsedMax;
  if (min2 > max2) {
    const temp = min2;
    min2 = max2;
    max2 = temp;
  }
  return [min2, max2];
};
inNumberRange.autoRemove = (val) => testFalsey(val) || (testFalsey(val[0]) && testFalsey(val[1]));
const filterFns = {
  includesString: includesString$1,
  includesStringSensitive,
  equalsString,
  arrIncludes,
  arrIncludesAll,
  arrIncludesSome,
  equals,
  weakEquals,
  inNumberRange,
};
export const ColumnFiltering = {
  getDefaultColumnDef: () => {
    return {
      filterFn: "auto",
    };
  },
  getInitialState: (state2) => {
    return {
      columnFilters: [],
      ...state2,
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onColumnFiltersChange: makeStateUpdater("columnFilters", table2),
      filterFromLeafRows: false,
      maxLeafRowFilterDepth: 100,
    };
  },
  createColumn: (column, table2) => {
    column.getAutoFilterFn = () => {
      const firstRow = table2.getCoreRowModel().flatRows[0];
      const value = firstRow == null ? void 0 : firstRow.getValue(column.id);
      if (typeof value === "string") {
        return filterFns.includesString;
      }
      if (typeof value === "number") {
        return filterFns.inNumberRange;
      }
      if (typeof value === "boolean") {
        return filterFns.equals;
      }
      if (value !== null && typeof value === "object") {
        return filterFns.equals;
      }
      if (Array.isArray(value)) {
        return filterFns.arrIncludes;
      }
      return filterFns.weakEquals;
    };
    column.getFilterFn = () => {
      var _table$options$filter, _table$options$filter2;
      return isFunction$1(column.columnDef.filterFn)
        ? column.columnDef.filterFn
        : column.columnDef.filterFn === "auto"
          ? column.getAutoFilterFn()
          : // @ts-ignore
            (_table$options$filter =
                (_table$options$filter2 = table2.options.filterFns) == null
                  ? void 0
                  : _table$options$filter2[column.columnDef.filterFn]) != null
            ? _table$options$filter
            : filterFns[column.columnDef.filterFn];
    };
    column.getCanFilter = () => {
      var _column$columnDef$ena, _table$options$enable, _table$options$enable2;
      return (
        ((_column$columnDef$ena = column.columnDef.enableColumnFilter) != null
          ? _column$columnDef$ena
          : true) &&
        ((_table$options$enable = table2.options.enableColumnFilters) != null
          ? _table$options$enable
          : true) &&
        ((_table$options$enable2 = table2.options.enableFilters) != null
          ? _table$options$enable2
          : true) &&
        !!column.accessorFn
      );
    };
    column.getIsFiltered = () => column.getFilterIndex() > -1;
    column.getFilterValue = () => {
      var _table$getState$colum;
      return (_table$getState$colum = table2.getState().columnFilters) == null ||
        (_table$getState$colum = _table$getState$colum.find((d2) => d2.id === column.id)) == null
        ? void 0
        : _table$getState$colum.value;
    };
    column.getFilterIndex = () => {
      var _table$getState$colum2, _table$getState$colum3;
      return (_table$getState$colum2 =
        (_table$getState$colum3 = table2.getState().columnFilters) == null
          ? void 0
          : _table$getState$colum3.findIndex((d2) => d2.id === column.id)) != null
        ? _table$getState$colum2
        : -1;
    };
    column.setFilterValue = (value) => {
      table2.setColumnFilters((old) => {
        const filterFn = column.getFilterFn();
        const previousFilter = old == null ? void 0 : old.find((d2) => d2.id === column.id);
        const newFilter = functionalUpdate$2(value, previousFilter ? previousFilter.value : void 0);
        if (shouldAutoRemoveFilter(filterFn, newFilter, column)) {
          var _old$filter;
          return (_old$filter = old == null ? void 0 : old.filter((d2) => d2.id !== column.id)) !=
            null
            ? _old$filter
            : [];
        }
        const newFilterObj = {
          id: column.id,
          value: newFilter,
        };
        if (previousFilter) {
          var _old$map;
          return (_old$map =
            old == null
              ? void 0
              : old.map((d2) => {
                  if (d2.id === column.id) {
                    return newFilterObj;
                  }
                  return d2;
                })) != null
            ? _old$map
            : [];
        }
        if (old != null && old.length) {
          return [...old, newFilterObj];
        }
        return [newFilterObj];
      });
    };
  },
  createRow: (row, _table) => {
    row.columnFilters = {};
    row.columnFiltersMeta = {};
  },
  createTable: (table2) => {
    table2.setColumnFilters = (updater) => {
      const leafColumns = table2.getAllLeafColumns();
      const updateFn = (old) => {
        var _functionalUpdate;
        return (_functionalUpdate = functionalUpdate$2(updater, old)) == null
          ? void 0
          : _functionalUpdate.filter((filter2) => {
              const column = leafColumns.find((d2) => d2.id === filter2.id);
              if (column) {
                const filterFn = column.getFilterFn();
                if (shouldAutoRemoveFilter(filterFn, filter2.value, column)) {
                  return false;
                }
              }
              return true;
            });
      };
      table2.options.onColumnFiltersChange == null ||
        table2.options.onColumnFiltersChange(updateFn);
    };
    table2.resetColumnFilters = (defaultState2) => {
      var _table$initialState$c, _table$initialState;
      table2.setColumnFilters(
        defaultState2
          ? []
          : (_table$initialState$c =
                (_table$initialState = table2.initialState) == null
                  ? void 0
                  : _table$initialState.columnFilters) != null
            ? _table$initialState$c
            : [],
      );
    };
    table2.getPreFilteredRowModel = () => table2.getCoreRowModel();
    table2.getFilteredRowModel = () => {
      if (!table2._getFilteredRowModel && table2.options.getFilteredRowModel) {
        table2._getFilteredRowModel = table2.options.getFilteredRowModel(table2);
      }
      if (table2.options.manualFiltering || !table2._getFilteredRowModel) {
        return table2.getPreFilteredRowModel();
      }
      return table2._getFilteredRowModel();
    };
  },
};
function shouldAutoRemoveFilter(filterFn, value, column) {
  return (
    (filterFn && filterFn.autoRemove ? filterFn.autoRemove(value, column) : false) ||
    typeof value === "undefined" ||
    (typeof value === "string" && !value)
  );
}
const sum = (columnId, _leafRows, childRows) => {
  return childRows.reduce((sum2, next2) => {
    const nextValue = next2.getValue(columnId);
    return sum2 + (typeof nextValue === "number" ? nextValue : 0);
  }, 0);
};
const min$1 = (columnId, _leafRows, childRows) => {
  let min2;
  childRows.forEach((row) => {
    const value = row.getValue(columnId);
    if (value != null && (min2 > value || (min2 === void 0 && value >= value))) {
      min2 = value;
    }
  });
  return min2;
};
const max$1 = (columnId, _leafRows, childRows) => {
  let max2;
  childRows.forEach((row) => {
    const value = row.getValue(columnId);
    if (value != null && (max2 < value || (max2 === void 0 && value >= value))) {
      max2 = value;
    }
  });
  return max2;
};
const extent = (columnId, _leafRows, childRows) => {
  let min2;
  let max2;
  childRows.forEach((row) => {
    const value = row.getValue(columnId);
    if (value != null) {
      if (min2 === void 0) {
        if (value >= value) min2 = max2 = value;
      } else {
        if (min2 > value) min2 = value;
        if (max2 < value) max2 = value;
      }
    }
  });
  return [min2, max2];
};
const mean = (columnId, leafRows) => {
  let count2 = 0;
  let sum2 = 0;
  leafRows.forEach((row) => {
    let value = row.getValue(columnId);
    if (value != null && (value = +value) >= value) {
      (++count2, (sum2 += value));
    }
  });
  if (count2) return sum2 / count2;
  return;
};
const median = (columnId, leafRows) => {
  if (!leafRows.length) {
    return;
  }
  const values3 = leafRows.map((row) => row.getValue(columnId));
  if (!isNumberArray(values3)) {
    return;
  }
  if (values3.length === 1) {
    return values3[0];
  }
  const mid = Math.floor(values3.length / 2);
  const nums = values3.sort((a2, b3) => a2 - b3);
  return values3.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
};
const unique = (columnId, leafRows) => {
  return Array.from(new Set(leafRows.map((d2) => d2.getValue(columnId))).values());
};
const uniqueCount = (columnId, leafRows) => {
  return new Set(leafRows.map((d2) => d2.getValue(columnId))).size;
};
const count$1 = (_columnId, leafRows) => {
  return leafRows.length;
};
const aggregationFns = {
  sum,
  min: min$1,
  max: max$1,
  extent,
  mean,
  median,
  unique,
  uniqueCount,
  count: count$1,
};
export const ColumnGrouping = {
  getDefaultColumnDef: () => {
    return {
      aggregatedCell: (props) => {
        var _toString, _props$getValue;
        return (_toString =
          (_props$getValue = props.getValue()) == null || _props$getValue.toString == null
            ? void 0
            : _props$getValue.toString()) != null
          ? _toString
          : null;
      },
      aggregationFn: "auto",
    };
  },
  getInitialState: (state2) => {
    return {
      grouping: [],
      ...state2,
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onGroupingChange: makeStateUpdater("grouping", table2),
      groupedColumnMode: "reorder",
    };
  },
  createColumn: (column, table2) => {
    column.toggleGrouping = () => {
      table2.setGrouping((old) => {
        if (old != null && old.includes(column.id)) {
          return old.filter((d2) => d2 !== column.id);
        }
        return [...(old != null ? old : []), column.id];
      });
    };
    column.getCanGroup = () => {
      var _column$columnDef$ena, _table$options$enable;
      return (
        ((_column$columnDef$ena = column.columnDef.enableGrouping) != null
          ? _column$columnDef$ena
          : true) &&
        ((_table$options$enable = table2.options.enableGrouping) != null
          ? _table$options$enable
          : true) &&
        (!!column.accessorFn || !!column.columnDef.getGroupingValue)
      );
    };
    column.getIsGrouped = () => {
      var _table$getState$group;
      return (_table$getState$group = table2.getState().grouping) == null
        ? void 0
        : _table$getState$group.includes(column.id);
    };
    column.getGroupedIndex = () => {
      var _table$getState$group2;
      return (_table$getState$group2 = table2.getState().grouping) == null
        ? void 0
        : _table$getState$group2.indexOf(column.id);
    };
    column.getToggleGroupingHandler = () => {
      const canGroup = column.getCanGroup();
      return () => {
        if (!canGroup) return;
        column.toggleGrouping();
      };
    };
    column.getAutoAggregationFn = () => {
      const firstRow = table2.getCoreRowModel().flatRows[0];
      const value = firstRow == null ? void 0 : firstRow.getValue(column.id);
      if (typeof value === "number") {
        return aggregationFns.sum;
      }
      if (Object.prototype.toString.call(value) === "[object Date]") {
        return aggregationFns.extent;
      }
    };
    column.getAggregationFn = () => {
      var _table$options$aggreg, _table$options$aggreg2;
      if (!column) {
        throw new Error();
      }
      return isFunction$1(column.columnDef.aggregationFn)
        ? column.columnDef.aggregationFn
        : column.columnDef.aggregationFn === "auto"
          ? column.getAutoAggregationFn()
          : (_table$options$aggreg =
                (_table$options$aggreg2 = table2.options.aggregationFns) == null
                  ? void 0
                  : _table$options$aggreg2[column.columnDef.aggregationFn]) != null
            ? _table$options$aggreg
            : aggregationFns[column.columnDef.aggregationFn];
    };
  },
  createTable: (table2) => {
    table2.setGrouping = (updater) =>
      table2.options.onGroupingChange == null ? void 0 : table2.options.onGroupingChange(updater);
    table2.resetGrouping = (defaultState2) => {
      var _table$initialState$g, _table$initialState;
      table2.setGrouping(
        defaultState2
          ? []
          : (_table$initialState$g =
                (_table$initialState = table2.initialState) == null
                  ? void 0
                  : _table$initialState.grouping) != null
            ? _table$initialState$g
            : [],
      );
    };
    table2.getPreGroupedRowModel = () => table2.getFilteredRowModel();
    table2.getGroupedRowModel = () => {
      if (!table2._getGroupedRowModel && table2.options.getGroupedRowModel) {
        table2._getGroupedRowModel = table2.options.getGroupedRowModel(table2);
      }
      if (table2.options.manualGrouping || !table2._getGroupedRowModel) {
        return table2.getPreGroupedRowModel();
      }
      return table2._getGroupedRowModel();
    };
  },
  createRow: (row, table2) => {
    row.getIsGrouped = () => !!row.groupingColumnId;
    row.getGroupingValue = (columnId) => {
      if (row._groupingValuesCache.hasOwnProperty(columnId)) {
        return row._groupingValuesCache[columnId];
      }
      const column = table2.getColumn(columnId);
      if (!(column != null && column.columnDef.getGroupingValue)) {
        return row.getValue(columnId);
      }
      row._groupingValuesCache[columnId] = column.columnDef.getGroupingValue(row.original);
      return row._groupingValuesCache[columnId];
    };
    row._groupingValuesCache = {};
  },
  createCell: (cell, column, row, table2) => {
    cell.getIsGrouped = () => column.getIsGrouped() && column.id === row.groupingColumnId;
    cell.getIsPlaceholder = () => !cell.getIsGrouped() && column.getIsGrouped();
    cell.getIsAggregated = () => {
      var _row$subRows;
      return (
        !cell.getIsGrouped() &&
        !cell.getIsPlaceholder() &&
        !!((_row$subRows = row.subRows) != null && _row$subRows.length)
      );
    };
  },
};
function orderColumns(leafColumns, grouping, groupedColumnMode) {
  if (!(grouping != null && grouping.length) || !groupedColumnMode) {
    return leafColumns;
  }
  const nonGroupingColumns = leafColumns.filter((col) => !grouping.includes(col.id));
  if (groupedColumnMode === "remove") {
    return nonGroupingColumns;
  }
  const groupingColumns = grouping
    .map((g2) => leafColumns.find((col) => col.id === g2))
    .filter(Boolean);
  return [...groupingColumns, ...nonGroupingColumns];
}
export const ColumnOrdering = {
  getInitialState: (state2) => {
    return {
      columnOrder: [],
      ...state2,
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onColumnOrderChange: makeStateUpdater("columnOrder", table2),
    };
  },
  createColumn: (column, table2) => {
    column.getIndex = memo$1(
      (position2) => [_getVisibleLeafColumns(table2, position2)],
      (columns) => columns.findIndex((d2) => d2.id === column.id),
      getMemoOptions(table2.options, "debugColumns"),
    );
    column.getIsFirstColumn = (position2) => {
      var _columns$;
      const columns = _getVisibleLeafColumns(table2, position2);
      return ((_columns$ = columns[0]) == null ? void 0 : _columns$.id) === column.id;
    };
    column.getIsLastColumn = (position2) => {
      var _columns;
      const columns = _getVisibleLeafColumns(table2, position2);
      return (
        ((_columns = columns[columns.length - 1]) == null ? void 0 : _columns.id) === column.id
      );
    };
  },
  createTable: (table2) => {
    table2.setColumnOrder = (updater) =>
      table2.options.onColumnOrderChange == null
        ? void 0
        : table2.options.onColumnOrderChange(updater);
    table2.resetColumnOrder = (defaultState2) => {
      var _table$initialState$c;
      table2.setColumnOrder(
        defaultState2
          ? []
          : (_table$initialState$c = table2.initialState.columnOrder) != null
            ? _table$initialState$c
            : [],
      );
    };
    table2._getOrderColumnsFn = memo$1(
      () => [
        table2.getState().columnOrder,
        table2.getState().grouping,
        table2.options.groupedColumnMode,
      ],
      (columnOrder, grouping, groupedColumnMode) => (columns) => {
        let orderedColumns = [];
        if (!(columnOrder != null && columnOrder.length)) {
          orderedColumns = columns;
        } else {
          const columnOrderCopy = [...columnOrder];
          const columnsCopy = [...columns];
          while (columnsCopy.length && columnOrderCopy.length) {
            const targetColumnId = columnOrderCopy.shift();
            const foundIndex = columnsCopy.findIndex((d2) => d2.id === targetColumnId);
            if (foundIndex > -1) {
              orderedColumns.push(columnsCopy.splice(foundIndex, 1)[0]);
            }
          }
          orderedColumns = [...orderedColumns, ...columnsCopy];
        }
        return orderColumns(orderedColumns, grouping, groupedColumnMode);
      },
      getMemoOptions(table2.options, "debugTable"),
    );
  },
};
const getDefaultColumnPinningState = () => ({
  left: [],
  right: [],
});
export const ColumnPinning = {
  getInitialState: (state2) => {
    return {
      columnPinning: getDefaultColumnPinningState(),
      ...state2,
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onColumnPinningChange: makeStateUpdater("columnPinning", table2),
    };
  },
  createColumn: (column, table2) => {
    column.pin = (position2) => {
      const columnIds = column
        .getLeafColumns()
        .map((d2) => d2.id)
        .filter(Boolean);
      table2.setColumnPinning((old) => {
        var _old$left3, _old$right3;
        if (position2 === "right") {
          var _old$left, _old$right;
          return {
            left: ((_old$left = old == null ? void 0 : old.left) != null ? _old$left : []).filter(
              (d2) => !(columnIds != null && columnIds.includes(d2)),
            ),
            right: [
              ...((_old$right = old == null ? void 0 : old.right) != null ? _old$right : []).filter(
                (d2) => !(columnIds != null && columnIds.includes(d2)),
              ),
              ...columnIds,
            ],
          };
        }
        if (position2 === "left") {
          var _old$left2, _old$right2;
          return {
            left: [
              ...((_old$left2 = old == null ? void 0 : old.left) != null ? _old$left2 : []).filter(
                (d2) => !(columnIds != null && columnIds.includes(d2)),
              ),
              ...columnIds,
            ],
            right: ((_old$right2 = old == null ? void 0 : old.right) != null
              ? _old$right2
              : []
            ).filter((d2) => !(columnIds != null && columnIds.includes(d2))),
          };
        }
        return {
          left: ((_old$left3 = old == null ? void 0 : old.left) != null ? _old$left3 : []).filter(
            (d2) => !(columnIds != null && columnIds.includes(d2)),
          ),
          right: ((_old$right3 = old == null ? void 0 : old.right) != null
            ? _old$right3
            : []
          ).filter((d2) => !(columnIds != null && columnIds.includes(d2))),
        };
      });
    };
    column.getCanPin = () => {
      const leafColumns = column.getLeafColumns();
      return leafColumns.some((d2) => {
        var _d$columnDef$enablePi, _ref, _table$options$enable;
        return (
          ((_d$columnDef$enablePi = d2.columnDef.enablePinning) != null
            ? _d$columnDef$enablePi
            : true) &&
          ((_ref =
            (_table$options$enable = table2.options.enableColumnPinning) != null
              ? _table$options$enable
              : table2.options.enablePinning) != null
            ? _ref
            : true)
        );
      });
    };
    column.getIsPinned = () => {
      const leafColumnIds = column.getLeafColumns().map((d2) => d2.id);
      const { left, right } = table2.getState().columnPinning;
      const isLeft = leafColumnIds.some((d2) => (left == null ? void 0 : left.includes(d2)));
      const isRight = leafColumnIds.some((d2) => (right == null ? void 0 : right.includes(d2)));
      return isLeft ? "left" : isRight ? "right" : false;
    };
    column.getPinnedIndex = () => {
      var _table$getState$colum, _table$getState$colum2;
      const position2 = column.getIsPinned();
      return position2
        ? (_table$getState$colum =
            (_table$getState$colum2 = table2.getState().columnPinning) == null ||
            (_table$getState$colum2 = _table$getState$colum2[position2]) == null
              ? void 0
              : _table$getState$colum2.indexOf(column.id)) != null
          ? _table$getState$colum
          : -1
        : 0;
    };
  },
  createRow: (row, table2) => {
    row.getCenterVisibleCells = memo$1(
      () => [
        row._getAllVisibleCells(),
        table2.getState().columnPinning.left,
        table2.getState().columnPinning.right,
      ],
      (allCells, left, right) => {
        const leftAndRight = [...(left != null ? left : []), ...(right != null ? right : [])];
        return allCells.filter((d2) => !leftAndRight.includes(d2.column.id));
      },
      getMemoOptions(table2.options, "debugRows"),
    );
    row.getLeftVisibleCells = memo$1(
      () => [row._getAllVisibleCells(), table2.getState().columnPinning.left],
      (allCells, left) => {
        const cells2 = (left != null ? left : [])
          .map((columnId) => allCells.find((cell) => cell.column.id === columnId))
          .filter(Boolean)
          .map((d2) => ({
            ...d2,
            position: "left",
          }));
        return cells2;
      },
      getMemoOptions(table2.options, "debugRows"),
    );
    row.getRightVisibleCells = memo$1(
      () => [row._getAllVisibleCells(), table2.getState().columnPinning.right],
      (allCells, right) => {
        const cells2 = (right != null ? right : [])
          .map((columnId) => allCells.find((cell) => cell.column.id === columnId))
          .filter(Boolean)
          .map((d2) => ({
            ...d2,
            position: "right",
          }));
        return cells2;
      },
      getMemoOptions(table2.options, "debugRows"),
    );
  },
  createTable: (table2) => {
    table2.setColumnPinning = (updater) =>
      table2.options.onColumnPinningChange == null
        ? void 0
        : table2.options.onColumnPinningChange(updater);
    table2.resetColumnPinning = (defaultState2) => {
      var _table$initialState$c, _table$initialState;
      return table2.setColumnPinning(
        defaultState2
          ? getDefaultColumnPinningState()
          : (_table$initialState$c =
                (_table$initialState = table2.initialState) == null
                  ? void 0
                  : _table$initialState.columnPinning) != null
            ? _table$initialState$c
            : getDefaultColumnPinningState(),
      );
    };
    table2.getIsSomeColumnsPinned = (position2) => {
      var _pinningState$positio;
      const pinningState = table2.getState().columnPinning;
      if (!position2) {
        var _pinningState$left, _pinningState$right;
        return Boolean(
          ((_pinningState$left = pinningState.left) == null ? void 0 : _pinningState$left.length) ||
          ((_pinningState$right = pinningState.right) == null
            ? void 0
            : _pinningState$right.length),
        );
      }
      return Boolean(
        (_pinningState$positio = pinningState[position2]) == null
          ? void 0
          : _pinningState$positio.length,
      );
    };
    table2.getLeftLeafColumns = memo$1(
      () => [table2.getAllLeafColumns(), table2.getState().columnPinning.left],
      (allColumns, left) => {
        return (left != null ? left : [])
          .map((columnId) => allColumns.find((column) => column.id === columnId))
          .filter(Boolean);
      },
      getMemoOptions(table2.options, "debugColumns"),
    );
    table2.getRightLeafColumns = memo$1(
      () => [table2.getAllLeafColumns(), table2.getState().columnPinning.right],
      (allColumns, right) => {
        return (right != null ? right : [])
          .map((columnId) => allColumns.find((column) => column.id === columnId))
          .filter(Boolean);
      },
      getMemoOptions(table2.options, "debugColumns"),
    );
    table2.getCenterLeafColumns = memo$1(
      () => [
        table2.getAllLeafColumns(),
        table2.getState().columnPinning.left,
        table2.getState().columnPinning.right,
      ],
      (allColumns, left, right) => {
        const leftAndRight = [...(left != null ? left : []), ...(right != null ? right : [])];
        return allColumns.filter((d2) => !leftAndRight.includes(d2.id));
      },
      getMemoOptions(table2.options, "debugColumns"),
    );
  },
};
function safelyAccessDocument(_document) {
  return _document || (typeof document !== "undefined" ? document : null);
}
const defaultColumnSizing = {
  size: 150,
  minSize: 20,
  maxSize: Number.MAX_SAFE_INTEGER,
};
const getDefaultColumnSizingInfoState = () => ({
  startOffset: null,
  startSize: null,
  deltaOffset: null,
  deltaPercentage: null,
  isResizingColumn: false,
  columnSizingStart: [],
});
export const ColumnSizing = {
  getDefaultColumnDef: () => {
    return defaultColumnSizing;
  },
  getInitialState: (state2) => {
    return {
      columnSizing: {},
      columnSizingInfo: getDefaultColumnSizingInfoState(),
      ...state2,
    };
  },
  getDefaultOptions: (table2) => {
    return {
      columnResizeMode: "onEnd",
      columnResizeDirection: "ltr",
      onColumnSizingChange: makeStateUpdater("columnSizing", table2),
      onColumnSizingInfoChange: makeStateUpdater("columnSizingInfo", table2),
    };
  },
  createColumn: (column, table2) => {
    column.getSize = () => {
      var _column$columnDef$min, _ref, _column$columnDef$max;
      const columnSize = table2.getState().columnSizing[column.id];
      return Math.min(
        Math.max(
          (_column$columnDef$min = column.columnDef.minSize) != null
            ? _column$columnDef$min
            : defaultColumnSizing.minSize,
          (_ref = columnSize != null ? columnSize : column.columnDef.size) != null
            ? _ref
            : defaultColumnSizing.size,
        ),
        (_column$columnDef$max = column.columnDef.maxSize) != null
          ? _column$columnDef$max
          : defaultColumnSizing.maxSize,
      );
    };
    column.getStart = memo$1(
      (position2) => [
        position2,
        _getVisibleLeafColumns(table2, position2),
        table2.getState().columnSizing,
      ],
      (position2, columns) =>
        columns
          .slice(0, column.getIndex(position2))
          .reduce((sum2, column2) => sum2 + column2.getSize(), 0),
      getMemoOptions(table2.options, "debugColumns"),
    );
    column.getAfter = memo$1(
      (position2) => [
        position2,
        _getVisibleLeafColumns(table2, position2),
        table2.getState().columnSizing,
      ],
      (position2, columns) =>
        columns
          .slice(column.getIndex(position2) + 1)
          .reduce((sum2, column2) => sum2 + column2.getSize(), 0),
      getMemoOptions(table2.options, "debugColumns"),
    );
    column.resetSize = () => {
      table2.setColumnSizing((_ref2) => {
        let { [column.id]: _2, ...rest } = _ref2;
        return rest;
      });
    };
    column.getCanResize = () => {
      var _column$columnDef$ena, _table$options$enable;
      return (
        ((_column$columnDef$ena = column.columnDef.enableResizing) != null
          ? _column$columnDef$ena
          : true) &&
        ((_table$options$enable = table2.options.enableColumnResizing) != null
          ? _table$options$enable
          : true)
      );
    };
    column.getIsResizing = () => {
      return table2.getState().columnSizingInfo.isResizingColumn === column.id;
    };
  },
  createHeader: (header, table2) => {
    header.getSize = () => {
      let sum2 = 0;
      const recurse = (header2) => {
        if (header2.subHeaders.length) {
          header2.subHeaders.forEach(recurse);
        } else {
          var _header$column$getSiz;
          sum2 +=
            (_header$column$getSiz = header2.column.getSize()) != null ? _header$column$getSiz : 0;
        }
      };
      recurse(header);
      return sum2;
    };
    header.getStart = () => {
      if (header.index > 0) {
        const prevSiblingHeader = header.headerGroup.headers[header.index - 1];
        return prevSiblingHeader.getStart() + prevSiblingHeader.getSize();
      }
      return 0;
    };
    header.getResizeHandler = (_contextDocument) => {
      const column = table2.getColumn(header.column.id);
      const canResize = column == null ? void 0 : column.getCanResize();
      return (e2) => {
        if (!column || !canResize) {
          return;
        }
        e2.persist == null || e2.persist();
        if (isTouchStartEvent(e2)) {
          if (e2.touches && e2.touches.length > 1) {
            return;
          }
        }
        const startSize = header.getSize();
        const columnSizingStart = header
          ? header.getLeafHeaders().map((d2) => [d2.column.id, d2.column.getSize()])
          : [[column.id, column.getSize()]];
        const clientX = isTouchStartEvent(e2) ? Math.round(e2.touches[0].clientX) : e2.clientX;
        const newColumnSizing = {};
        const updateOffset = (eventType, clientXPos) => {
          if (typeof clientXPos !== "number") {
            return;
          }
          table2.setColumnSizingInfo((old) => {
            var _old$startOffset, _old$startSize;
            const deltaDirection = table2.options.columnResizeDirection === "rtl" ? -1 : 1;
            const deltaOffset =
              (clientXPos -
                ((_old$startOffset = old == null ? void 0 : old.startOffset) != null
                  ? _old$startOffset
                  : 0)) *
              deltaDirection;
            const deltaPercentage = Math.max(
              deltaOffset /
                ((_old$startSize = old == null ? void 0 : old.startSize) != null
                  ? _old$startSize
                  : 0),
              -0.999999,
            );
            old.columnSizingStart.forEach((_ref3) => {
              let [columnId, headerSize] = _ref3;
              newColumnSizing[columnId] =
                Math.round(Math.max(headerSize + headerSize * deltaPercentage, 0) * 100) / 100;
            });
            return {
              ...old,
              deltaOffset,
              deltaPercentage,
            };
          });
          if (table2.options.columnResizeMode === "onChange" || eventType === "end") {
            table2.setColumnSizing((old) => ({
              ...old,
              ...newColumnSizing,
            }));
          }
        };
        const onMove = (clientXPos) => updateOffset("move", clientXPos);
        const onEnd = (clientXPos) => {
          updateOffset("end", clientXPos);
          table2.setColumnSizingInfo((old) => ({
            ...old,
            isResizingColumn: false,
            startOffset: null,
            startSize: null,
            deltaOffset: null,
            deltaPercentage: null,
            columnSizingStart: [],
          }));
        };
        const contextDocument = safelyAccessDocument(_contextDocument);
        const mouseEvents = {
          moveHandler: (e22) => onMove(e22.clientX),
          upHandler: (e22) => {
            contextDocument == null ||
              contextDocument.removeEventListener("mousemove", mouseEvents.moveHandler);
            contextDocument == null ||
              contextDocument.removeEventListener("mouseup", mouseEvents.upHandler);
            onEnd(e22.clientX);
          },
        };
        const touchEvents = {
          moveHandler: (e22) => {
            if (e22.cancelable) {
              e22.preventDefault();
              e22.stopPropagation();
            }
            onMove(e22.touches[0].clientX);
            return false;
          },
          upHandler: (e22) => {
            var _e$touches$;
            contextDocument == null ||
              contextDocument.removeEventListener("touchmove", touchEvents.moveHandler);
            contextDocument == null ||
              contextDocument.removeEventListener("touchend", touchEvents.upHandler);
            if (e22.cancelable) {
              e22.preventDefault();
              e22.stopPropagation();
            }
            onEnd((_e$touches$ = e22.touches[0]) == null ? void 0 : _e$touches$.clientX);
          },
        };
        const passiveIfSupported = passiveEventSupported()
          ? {
              passive: false,
            }
          : false;
        if (isTouchStartEvent(e2)) {
          contextDocument == null ||
            contextDocument.addEventListener(
              "touchmove",
              touchEvents.moveHandler,
              passiveIfSupported,
            );
          contextDocument == null ||
            contextDocument.addEventListener("touchend", touchEvents.upHandler, passiveIfSupported);
        } else {
          contextDocument == null ||
            contextDocument.addEventListener(
              "mousemove",
              mouseEvents.moveHandler,
              passiveIfSupported,
            );
          contextDocument == null ||
            contextDocument.addEventListener("mouseup", mouseEvents.upHandler, passiveIfSupported);
        }
        table2.setColumnSizingInfo((old) => ({
          ...old,
          startOffset: clientX,
          startSize,
          deltaOffset: 0,
          deltaPercentage: 0,
          columnSizingStart,
          isResizingColumn: column.id,
        }));
      };
    };
  },
  createTable: (table2) => {
    table2.setColumnSizing = (updater) =>
      table2.options.onColumnSizingChange == null
        ? void 0
        : table2.options.onColumnSizingChange(updater);
    table2.setColumnSizingInfo = (updater) =>
      table2.options.onColumnSizingInfoChange == null
        ? void 0
        : table2.options.onColumnSizingInfoChange(updater);
    table2.resetColumnSizing = (defaultState2) => {
      var _table$initialState$c;
      table2.setColumnSizing(
        defaultState2
          ? {}
          : (_table$initialState$c = table2.initialState.columnSizing) != null
            ? _table$initialState$c
            : {},
      );
    };
    table2.resetHeaderSizeInfo = (defaultState2) => {
      var _table$initialState$c2;
      table2.setColumnSizingInfo(
        defaultState2
          ? getDefaultColumnSizingInfoState()
          : (_table$initialState$c2 = table2.initialState.columnSizingInfo) != null
            ? _table$initialState$c2
            : getDefaultColumnSizingInfoState(),
      );
    };
    table2.getTotalSize = () => {
      var _table$getHeaderGroup, _table$getHeaderGroup2;
      return (_table$getHeaderGroup =
        (_table$getHeaderGroup2 = table2.getHeaderGroups()[0]) == null
          ? void 0
          : _table$getHeaderGroup2.headers.reduce((sum2, header) => {
              return sum2 + header.getSize();
            }, 0)) != null
        ? _table$getHeaderGroup
        : 0;
    };
    table2.getLeftTotalSize = () => {
      var _table$getLeftHeaderG, _table$getLeftHeaderG2;
      return (_table$getLeftHeaderG =
        (_table$getLeftHeaderG2 = table2.getLeftHeaderGroups()[0]) == null
          ? void 0
          : _table$getLeftHeaderG2.headers.reduce((sum2, header) => {
              return sum2 + header.getSize();
            }, 0)) != null
        ? _table$getLeftHeaderG
        : 0;
    };
    table2.getCenterTotalSize = () => {
      var _table$getCenterHeade, _table$getCenterHeade2;
      return (_table$getCenterHeade =
        (_table$getCenterHeade2 = table2.getCenterHeaderGroups()[0]) == null
          ? void 0
          : _table$getCenterHeade2.headers.reduce((sum2, header) => {
              return sum2 + header.getSize();
            }, 0)) != null
        ? _table$getCenterHeade
        : 0;
    };
    table2.getRightTotalSize = () => {
      var _table$getRightHeader, _table$getRightHeader2;
      return (_table$getRightHeader =
        (_table$getRightHeader2 = table2.getRightHeaderGroups()[0]) == null
          ? void 0
          : _table$getRightHeader2.headers.reduce((sum2, header) => {
              return sum2 + header.getSize();
            }, 0)) != null
        ? _table$getRightHeader
        : 0;
    };
  },
};
let passiveSupported = null;
function passiveEventSupported() {
  if (typeof passiveSupported === "boolean") return passiveSupported;
  let supported = false;
  try {
    const options = {
      get passive() {
        supported = true;
        return false;
      },
    };
    const noop22 = () => {};
    window.addEventListener("test", noop22, options);
    window.removeEventListener("test", noop22);
  } catch (err) {
    supported = false;
  }
  passiveSupported = supported;
  return passiveSupported;
}
function isTouchStartEvent(e2) {
  return e2.type === "touchstart";
}
export const ColumnVisibility = {
  getInitialState: (state2) => {
    return {
      columnVisibility: {},
      ...state2,
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onColumnVisibilityChange: makeStateUpdater("columnVisibility", table2),
    };
  },
  createColumn: (column, table2) => {
    column.toggleVisibility = (value) => {
      if (column.getCanHide()) {
        table2.setColumnVisibility((old) => ({
          ...old,
          [column.id]: value != null ? value : !column.getIsVisible(),
        }));
      }
    };
    column.getIsVisible = () => {
      var _ref, _table$getState$colum;
      const childColumns = column.columns;
      return (_ref = childColumns.length
        ? childColumns.some((c3) => c3.getIsVisible())
        : (_table$getState$colum = table2.getState().columnVisibility) == null
          ? void 0
          : _table$getState$colum[column.id]) != null
        ? _ref
        : true;
    };
    column.getCanHide = () => {
      var _column$columnDef$ena, _table$options$enable;
      return (
        ((_column$columnDef$ena = column.columnDef.enableHiding) != null
          ? _column$columnDef$ena
          : true) &&
        ((_table$options$enable = table2.options.enableHiding) != null
          ? _table$options$enable
          : true)
      );
    };
    column.getToggleVisibilityHandler = () => {
      return (e2) => {
        column.toggleVisibility == null || column.toggleVisibility(e2.target.checked);
      };
    };
  },
  createRow: (row, table2) => {
    row._getAllVisibleCells = memo$1(
      () => [row.getAllCells(), table2.getState().columnVisibility],
      (cells2) => {
        return cells2.filter((cell) => cell.column.getIsVisible());
      },
      getMemoOptions(table2.options, "debugRows"),
    );
    row.getVisibleCells = memo$1(
      () => [row.getLeftVisibleCells(), row.getCenterVisibleCells(), row.getRightVisibleCells()],
      (left, center, right) => [...left, ...center, ...right],
      getMemoOptions(table2.options, "debugRows"),
    );
  },
  createTable: (table2) => {
    const makeVisibleColumnsMethod = (key2, getColumns) => {
      return memo$1(
        () => [
          getColumns(),
          getColumns()
            .filter((d2) => d2.getIsVisible())
            .map((d2) => d2.id)
            .join("_"),
        ],
        (columns) => {
          return columns.filter((d2) => (d2.getIsVisible == null ? void 0 : d2.getIsVisible()));
        },
        getMemoOptions(table2.options, "debugColumns"),
      );
    };
    table2.getVisibleFlatColumns = makeVisibleColumnsMethod("getVisibleFlatColumns", () =>
      table2.getAllFlatColumns(),
    );
    table2.getVisibleLeafColumns = makeVisibleColumnsMethod("getVisibleLeafColumns", () =>
      table2.getAllLeafColumns(),
    );
    table2.getLeftVisibleLeafColumns = makeVisibleColumnsMethod("getLeftVisibleLeafColumns", () =>
      table2.getLeftLeafColumns(),
    );
    table2.getRightVisibleLeafColumns = makeVisibleColumnsMethod("getRightVisibleLeafColumns", () =>
      table2.getRightLeafColumns(),
    );
    table2.getCenterVisibleLeafColumns = makeVisibleColumnsMethod(
      "getCenterVisibleLeafColumns",
      () => table2.getCenterLeafColumns(),
    );
    table2.setColumnVisibility = (updater) =>
      table2.options.onColumnVisibilityChange == null
        ? void 0
        : table2.options.onColumnVisibilityChange(updater);
    table2.resetColumnVisibility = (defaultState2) => {
      var _table$initialState$c;
      table2.setColumnVisibility(
        defaultState2
          ? {}
          : (_table$initialState$c = table2.initialState.columnVisibility) != null
            ? _table$initialState$c
            : {},
      );
    };
    table2.toggleAllColumnsVisible = (value) => {
      var _value;
      value = (_value = value) != null ? _value : !table2.getIsAllColumnsVisible();
      table2.setColumnVisibility(
        table2.getAllLeafColumns().reduce(
          (obj, column) => ({
            ...obj,
            [column.id]: !value ? !(column.getCanHide != null && column.getCanHide()) : value,
          }),
          {},
        ),
      );
    };
    table2.getIsAllColumnsVisible = () =>
      !table2
        .getAllLeafColumns()
        .some((column) => !(column.getIsVisible != null && column.getIsVisible()));
    table2.getIsSomeColumnsVisible = () =>
      table2
        .getAllLeafColumns()
        .some((column) => (column.getIsVisible == null ? void 0 : column.getIsVisible()));
    table2.getToggleAllColumnsVisibilityHandler = () => {
      return (e2) => {
        var _target;
        table2.toggleAllColumnsVisible((_target = e2.target) == null ? void 0 : _target.checked);
      };
    };
  },
};
function _getVisibleLeafColumns(table2, position2) {
  return !position2
    ? table2.getVisibleLeafColumns()
    : position2 === "center"
      ? table2.getCenterVisibleLeafColumns()
      : position2 === "left"
        ? table2.getLeftVisibleLeafColumns()
        : table2.getRightVisibleLeafColumns();
}
export const GlobalFaceting = {
  createTable: (table2) => {
    table2._getGlobalFacetedRowModel =
      table2.options.getFacetedRowModel && table2.options.getFacetedRowModel(table2, "__global__");
    table2.getGlobalFacetedRowModel = () => {
      if (table2.options.manualFiltering || !table2._getGlobalFacetedRowModel) {
        return table2.getPreFilteredRowModel();
      }
      return table2._getGlobalFacetedRowModel();
    };
    table2._getGlobalFacetedUniqueValues =
      table2.options.getFacetedUniqueValues &&
      table2.options.getFacetedUniqueValues(table2, "__global__");
    table2.getGlobalFacetedUniqueValues = () => {
      if (!table2._getGlobalFacetedUniqueValues) {
        return new Map();
      }
      return table2._getGlobalFacetedUniqueValues();
    };
    table2._getGlobalFacetedMinMaxValues =
      table2.options.getFacetedMinMaxValues &&
      table2.options.getFacetedMinMaxValues(table2, "__global__");
    table2.getGlobalFacetedMinMaxValues = () => {
      if (!table2._getGlobalFacetedMinMaxValues) {
        return;
      }
      return table2._getGlobalFacetedMinMaxValues();
    };
  },
};
export const GlobalFiltering = {
  getInitialState: (state2) => {
    return {
      globalFilter: void 0,
      ...state2,
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onGlobalFilterChange: makeStateUpdater("globalFilter", table2),
      globalFilterFn: "auto",
      getColumnCanGlobalFilter: (column) => {
        var _table$getCoreRowMode;
        const value =
          (_table$getCoreRowMode = table2.getCoreRowModel().flatRows[0]) == null ||
          (_table$getCoreRowMode = _table$getCoreRowMode._getAllCellsByColumnId()[column.id]) ==
            null
            ? void 0
            : _table$getCoreRowMode.getValue();
        return typeof value === "string" || typeof value === "number";
      },
    };
  },
  createColumn: (column, table2) => {
    column.getCanGlobalFilter = () => {
      var _column$columnDef$ena,
        _table$options$enable,
        _table$options$enable2,
        _table$options$getCol;
      return (
        ((_column$columnDef$ena = column.columnDef.enableGlobalFilter) != null
          ? _column$columnDef$ena
          : true) &&
        ((_table$options$enable = table2.options.enableGlobalFilter) != null
          ? _table$options$enable
          : true) &&
        ((_table$options$enable2 = table2.options.enableFilters) != null
          ? _table$options$enable2
          : true) &&
        ((_table$options$getCol =
          table2.options.getColumnCanGlobalFilter == null
            ? void 0
            : table2.options.getColumnCanGlobalFilter(column)) != null
          ? _table$options$getCol
          : true) &&
        !!column.accessorFn
      );
    };
  },
  createTable: (table2) => {
    table2.getGlobalAutoFilterFn = () => {
      return filterFns.includesString;
    };
    table2.getGlobalFilterFn = () => {
      var _table$options$filter, _table$options$filter2;
      const { globalFilterFn } = table2.options;
      return isFunction$1(globalFilterFn)
        ? globalFilterFn
        : globalFilterFn === "auto"
          ? table2.getGlobalAutoFilterFn()
          : (_table$options$filter =
                (_table$options$filter2 = table2.options.filterFns) == null
                  ? void 0
                  : _table$options$filter2[globalFilterFn]) != null
            ? _table$options$filter
            : filterFns[globalFilterFn];
    };
    table2.setGlobalFilter = (updater) => {
      table2.options.onGlobalFilterChange == null || table2.options.onGlobalFilterChange(updater);
    };
    table2.resetGlobalFilter = (defaultState2) => {
      table2.setGlobalFilter(defaultState2 ? void 0 : table2.initialState.globalFilter);
    };
  },
};
export const RowExpanding = {
  getInitialState: (state2) => {
    return {
      expanded: {},
      ...state2,
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onExpandedChange: makeStateUpdater("expanded", table2),
      paginateExpandedRows: true,
    };
  },
  createTable: (table2) => {
    let registered = false;
    let queued = false;
    table2._autoResetExpanded = () => {
      var _ref, _table$options$autoRe;
      if (!registered) {
        table2._queue(() => {
          registered = true;
        });
        return;
      }
      if (
        (_ref =
          (_table$options$autoRe = table2.options.autoResetAll) != null
            ? _table$options$autoRe
            : table2.options.autoResetExpanded) != null
          ? _ref
          : !table2.options.manualExpanding
      ) {
        if (queued) return;
        queued = true;
        table2._queue(() => {
          table2.resetExpanded();
          queued = false;
        });
      }
    };
    table2.setExpanded = (updater) =>
      table2.options.onExpandedChange == null ? void 0 : table2.options.onExpandedChange(updater);
    table2.toggleAllRowsExpanded = (expanded) => {
      if (expanded != null ? expanded : !table2.getIsAllRowsExpanded()) {
        table2.setExpanded(true);
      } else {
        table2.setExpanded({});
      }
    };
    table2.resetExpanded = (defaultState2) => {
      var _table$initialState$e, _table$initialState;
      table2.setExpanded(
        defaultState2
          ? {}
          : (_table$initialState$e =
                (_table$initialState = table2.initialState) == null
                  ? void 0
                  : _table$initialState.expanded) != null
            ? _table$initialState$e
            : {},
      );
    };
    table2.getCanSomeRowsExpand = () => {
      return table2.getPrePaginationRowModel().flatRows.some((row) => row.getCanExpand());
    };
    table2.getToggleAllRowsExpandedHandler = () => {
      return (e2) => {
        e2.persist == null || e2.persist();
        table2.toggleAllRowsExpanded();
      };
    };
    table2.getIsSomeRowsExpanded = () => {
      const expanded = table2.getState().expanded;
      return expanded === true || Object.values(expanded).some(Boolean);
    };
    table2.getIsAllRowsExpanded = () => {
      const expanded = table2.getState().expanded;
      if (typeof expanded === "boolean") {
        return expanded === true;
      }
      if (!Object.keys(expanded).length) {
        return false;
      }
      if (table2.getRowModel().flatRows.some((row) => !row.getIsExpanded())) {
        return false;
      }
      return true;
    };
    table2.getExpandedDepth = () => {
      let maxDepth = 0;
      const rowIds =
        table2.getState().expanded === true
          ? Object.keys(table2.getRowModel().rowsById)
          : Object.keys(table2.getState().expanded);
      rowIds.forEach((id2) => {
        const splitId = id2.split(".");
        maxDepth = Math.max(maxDepth, splitId.length);
      });
      return maxDepth;
    };
    table2.getPreExpandedRowModel = () => table2.getSortedRowModel();
    table2.getExpandedRowModel = () => {
      if (!table2._getExpandedRowModel && table2.options.getExpandedRowModel) {
        table2._getExpandedRowModel = table2.options.getExpandedRowModel(table2);
      }
      if (table2.options.manualExpanding || !table2._getExpandedRowModel) {
        return table2.getPreExpandedRowModel();
      }
      return table2._getExpandedRowModel();
    };
  },
  createRow: (row, table2) => {
    row.toggleExpanded = (expanded) => {
      table2.setExpanded((old) => {
        var _expanded;
        const exists = old === true ? true : !!(old != null && old[row.id]);
        let oldExpanded = {};
        if (old === true) {
          Object.keys(table2.getRowModel().rowsById).forEach((rowId) => {
            oldExpanded[rowId] = true;
          });
        } else {
          oldExpanded = old;
        }
        expanded = (_expanded = expanded) != null ? _expanded : !exists;
        if (!exists && expanded) {
          return {
            ...oldExpanded,
            [row.id]: true,
          };
        }
        if (exists && !expanded) {
          const { [row.id]: _2, ...rest } = oldExpanded;
          return rest;
        }
        return old;
      });
    };
    row.getIsExpanded = () => {
      var _table$options$getIsR;
      const expanded = table2.getState().expanded;
      return !!((_table$options$getIsR =
        table2.options.getIsRowExpanded == null ? void 0 : table2.options.getIsRowExpanded(row)) !=
      null
        ? _table$options$getIsR
        : expanded === true || (expanded == null ? void 0 : expanded[row.id]));
    };
    row.getCanExpand = () => {
      var _table$options$getRow, _table$options$enable, _row$subRows;
      return (_table$options$getRow =
        table2.options.getRowCanExpand == null ? void 0 : table2.options.getRowCanExpand(row)) !=
        null
        ? _table$options$getRow
        : ((_table$options$enable = table2.options.enableExpanding) != null
            ? _table$options$enable
            : true) && !!((_row$subRows = row.subRows) != null && _row$subRows.length);
    };
    row.getIsAllParentsExpanded = () => {
      let isFullyExpanded = true;
      let currentRow = row;
      while (isFullyExpanded && currentRow.parentId) {
        currentRow = table2.getRow(currentRow.parentId, true);
        isFullyExpanded = currentRow.getIsExpanded();
      }
      return isFullyExpanded;
    };
    row.getToggleExpandedHandler = () => {
      const canExpand = row.getCanExpand();
      return () => {
        if (!canExpand) return;
        row.toggleExpanded();
      };
    };
  },
};
const defaultPageIndex = 0;
const defaultPageSize = 10;
const getDefaultPaginationState = () => ({
  pageIndex: defaultPageIndex,
  pageSize: defaultPageSize,
});
export const RowPagination = {
  getInitialState: (state2) => {
    return {
      ...state2,
      pagination: {
        ...getDefaultPaginationState(),
        ...(state2 == null ? void 0 : state2.pagination),
      },
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onPaginationChange: makeStateUpdater("pagination", table2),
    };
  },
  createTable: (table2) => {
    let registered = false;
    let queued = false;
    table2._autoResetPageIndex = () => {
      var _ref, _table$options$autoRe;
      if (!registered) {
        table2._queue(() => {
          registered = true;
        });
        return;
      }
      if (
        (_ref =
          (_table$options$autoRe = table2.options.autoResetAll) != null
            ? _table$options$autoRe
            : table2.options.autoResetPageIndex) != null
          ? _ref
          : !table2.options.manualPagination
      ) {
        if (queued) return;
        queued = true;
        table2._queue(() => {
          table2.resetPageIndex();
          queued = false;
        });
      }
    };
    table2.setPagination = (updater) => {
      const safeUpdater = (old) => {
        let newState = functionalUpdate$2(updater, old);
        return newState;
      };
      return table2.options.onPaginationChange == null
        ? void 0
        : table2.options.onPaginationChange(safeUpdater);
    };
    table2.resetPagination = (defaultState2) => {
      var _table$initialState$p;
      table2.setPagination(
        defaultState2
          ? getDefaultPaginationState()
          : (_table$initialState$p = table2.initialState.pagination) != null
            ? _table$initialState$p
            : getDefaultPaginationState(),
      );
    };
    table2.setPageIndex = (updater) => {
      table2.setPagination((old) => {
        let pageIndex = functionalUpdate$2(updater, old.pageIndex);
        const maxPageIndex =
          typeof table2.options.pageCount === "undefined" || table2.options.pageCount === -1
            ? Number.MAX_SAFE_INTEGER
            : table2.options.pageCount - 1;
        pageIndex = Math.max(0, Math.min(pageIndex, maxPageIndex));
        return {
          ...old,
          pageIndex,
        };
      });
    };
    table2.resetPageIndex = (defaultState2) => {
      var _table$initialState$p2, _table$initialState;
      table2.setPageIndex(
        defaultState2
          ? defaultPageIndex
          : (_table$initialState$p2 =
                (_table$initialState = table2.initialState) == null ||
                (_table$initialState = _table$initialState.pagination) == null
                  ? void 0
                  : _table$initialState.pageIndex) != null
            ? _table$initialState$p2
            : defaultPageIndex,
      );
    };
    table2.resetPageSize = (defaultState2) => {
      var _table$initialState$p3, _table$initialState2;
      table2.setPageSize(
        defaultState2
          ? defaultPageSize
          : (_table$initialState$p3 =
                (_table$initialState2 = table2.initialState) == null ||
                (_table$initialState2 = _table$initialState2.pagination) == null
                  ? void 0
                  : _table$initialState2.pageSize) != null
            ? _table$initialState$p3
            : defaultPageSize,
      );
    };
    table2.setPageSize = (updater) => {
      table2.setPagination((old) => {
        const pageSize = Math.max(1, functionalUpdate$2(updater, old.pageSize));
        const topRowIndex = old.pageSize * old.pageIndex;
        const pageIndex = Math.floor(topRowIndex / pageSize);
        return {
          ...old,
          pageIndex,
          pageSize,
        };
      });
    };
    table2.setPageCount = (updater) =>
      table2.setPagination((old) => {
        var _table$options$pageCo;
        let newPageCount = functionalUpdate$2(
          updater,
          (_table$options$pageCo = table2.options.pageCount) != null ? _table$options$pageCo : -1,
        );
        if (typeof newPageCount === "number") {
          newPageCount = Math.max(-1, newPageCount);
        }
        return {
          ...old,
          pageCount: newPageCount,
        };
      });
    table2.getPageOptions = memo$1(
      () => [table2.getPageCount()],
      (pageCount) => {
        let pageOptions = [];
        if (pageCount && pageCount > 0) {
          pageOptions = [...new Array(pageCount)].fill(null).map((_2, i2) => i2);
        }
        return pageOptions;
      },
      getMemoOptions(table2.options, "debugTable"),
    );
    table2.getCanPreviousPage = () => table2.getState().pagination.pageIndex > 0;
    table2.getCanNextPage = () => {
      const { pageIndex } = table2.getState().pagination;
      const pageCount = table2.getPageCount();
      if (pageCount === -1) {
        return true;
      }
      if (pageCount === 0) {
        return false;
      }
      return pageIndex < pageCount - 1;
    };
    table2.previousPage = () => {
      return table2.setPageIndex((old) => old - 1);
    };
    table2.nextPage = () => {
      return table2.setPageIndex((old) => {
        return old + 1;
      });
    };
    table2.firstPage = () => {
      return table2.setPageIndex(0);
    };
    table2.lastPage = () => {
      return table2.setPageIndex(table2.getPageCount() - 1);
    };
    table2.getPrePaginationRowModel = () => table2.getExpandedRowModel();
    table2.getPaginationRowModel = () => {
      if (!table2._getPaginationRowModel && table2.options.getPaginationRowModel) {
        table2._getPaginationRowModel = table2.options.getPaginationRowModel(table2);
      }
      if (table2.options.manualPagination || !table2._getPaginationRowModel) {
        return table2.getPrePaginationRowModel();
      }
      return table2._getPaginationRowModel();
    };
    table2.getPageCount = () => {
      var _table$options$pageCo2;
      return (_table$options$pageCo2 = table2.options.pageCount) != null
        ? _table$options$pageCo2
        : Math.ceil(table2.getRowCount() / table2.getState().pagination.pageSize);
    };
    table2.getRowCount = () => {
      var _table$options$rowCou;
      return (_table$options$rowCou = table2.options.rowCount) != null
        ? _table$options$rowCou
        : table2.getPrePaginationRowModel().rows.length;
    };
  },
};
