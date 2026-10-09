// row-sorting.js
import {
  ColumnFaceting,
  ColumnFiltering,
  ColumnGrouping,
  ColumnOrdering,
  ColumnPinning,
  ColumnSizing,
  ColumnVisibility,
  GlobalFaceting,
  GlobalFiltering,
  Headers$1,
  RowExpanding,
  RowPagination,
} from "./column-filtering.js";
import {
  createColumn,
  functionalUpdate$2,
  getMemoOptions,
  isFunction$1,
  makeStateUpdater,
  memo$1,
} from "./ready-sub-video-card.jsx";
import { RowPinning, RowSelection } from "./row-selection.js";
const reSplitAlphaNumeric = /([0-9]+)/gm;
const alphanumeric = (rowA, rowB, columnId) => {
  return compareAlphanumeric(
    toString$2(rowA.getValue(columnId)).toLowerCase(),
    toString$2(rowB.getValue(columnId)).toLowerCase(),
  );
};
const alphanumericCaseSensitive = (rowA, rowB, columnId) => {
  return compareAlphanumeric(
    toString$2(rowA.getValue(columnId)),
    toString$2(rowB.getValue(columnId)),
  );
};
const text$a = (rowA, rowB, columnId) => {
  return compareBasic(
    toString$2(rowA.getValue(columnId)).toLowerCase(),
    toString$2(rowB.getValue(columnId)).toLowerCase(),
  );
};
const textCaseSensitive = (rowA, rowB, columnId) => {
  return compareBasic(toString$2(rowA.getValue(columnId)), toString$2(rowB.getValue(columnId)));
};
const datetime = (rowA, rowB, columnId) => {
  const a2 = rowA.getValue(columnId);
  const b3 = rowB.getValue(columnId);
  return a2 > b3 ? 1 : a2 < b3 ? -1 : 0;
};
const basic = (rowA, rowB, columnId) => {
  return compareBasic(rowA.getValue(columnId), rowB.getValue(columnId));
};
function compareBasic(a2, b3) {
  return a2 === b3 ? 0 : a2 > b3 ? 1 : -1;
}
function toString$2(a2) {
  if (typeof a2 === "number") {
    if (isNaN(a2) || a2 === Infinity || a2 === -Infinity) {
      return "";
    }
    return String(a2);
  }
  if (typeof a2 === "string") {
    return a2;
  }
  return "";
}
function compareAlphanumeric(aStr, bStr) {
  const a2 = aStr.split(reSplitAlphaNumeric).filter(Boolean);
  const b3 = bStr.split(reSplitAlphaNumeric).filter(Boolean);
  while (a2.length && b3.length) {
    const aa = a2.shift();
    const bb = b3.shift();
    const an2 = parseInt(aa, 10);
    const bn2 = parseInt(bb, 10);
    const combo = [an2, bn2].sort();
    if (isNaN(combo[0])) {
      if (aa > bb) {
        return 1;
      }
      if (bb > aa) {
        return -1;
      }
      continue;
    }
    if (isNaN(combo[1])) {
      return isNaN(an2) ? -1 : 1;
    }
    if (an2 > bn2) {
      return 1;
    }
    if (bn2 > an2) {
      return -1;
    }
  }
  return a2.length - b3.length;
}
const sortingFns = {
  alphanumeric,
  alphanumericCaseSensitive,
  text: text$a,
  textCaseSensitive,
  datetime,
  basic,
};
const RowSorting = {
  getInitialState: (state2) => {
    return {
      sorting: [],
      ...state2,
    };
  },
  getDefaultColumnDef: () => {
    return {
      sortingFn: "auto",
      sortUndefined: 1,
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onSortingChange: makeStateUpdater("sorting", table2),
      isMultiSortEvent: (e2) => {
        return e2.shiftKey;
      },
    };
  },
  createColumn: (column, table2) => {
    column.getAutoSortingFn = () => {
      const firstRows = table2.getFilteredRowModel().flatRows.slice(10);
      let isString2 = false;
      for (const row of firstRows) {
        const value = row == null ? void 0 : row.getValue(column.id);
        if (Object.prototype.toString.call(value) === "[object Date]") {
          return sortingFns.datetime;
        }
        if (typeof value === "string") {
          isString2 = true;
          if (value.split(reSplitAlphaNumeric).length > 1) {
            return sortingFns.alphanumeric;
          }
        }
      }
      if (isString2) {
        return sortingFns.text;
      }
      return sortingFns.basic;
    };
    column.getAutoSortDir = () => {
      const firstRow = table2.getFilteredRowModel().flatRows[0];
      const value = firstRow == null ? void 0 : firstRow.getValue(column.id);
      if (typeof value === "string") {
        return "asc";
      }
      return "desc";
    };
    column.getSortingFn = () => {
      var _table$options$sortin, _table$options$sortin2;
      if (!column) {
        throw new Error();
      }
      return isFunction$1(column.columnDef.sortingFn)
        ? column.columnDef.sortingFn
        : column.columnDef.sortingFn === "auto"
          ? column.getAutoSortingFn()
          : (_table$options$sortin =
                (_table$options$sortin2 = table2.options.sortingFns) == null
                  ? void 0
                  : _table$options$sortin2[column.columnDef.sortingFn]) != null
            ? _table$options$sortin
            : sortingFns[column.columnDef.sortingFn];
    };
    column.toggleSorting = (desc2, multi) => {
      const nextSortingOrder = column.getNextSortingOrder();
      const hasManualValue = typeof desc2 !== "undefined" && desc2 !== null;
      table2.setSorting((old) => {
        const existingSorting = old == null ? void 0 : old.find((d2) => d2.id === column.id);
        const existingIndex = old == null ? void 0 : old.findIndex((d2) => d2.id === column.id);
        let newSorting = [];
        let sortAction;
        let nextDesc = hasManualValue ? desc2 : nextSortingOrder === "desc";
        if (old != null && old.length && column.getCanMultiSort() && multi) {
          if (existingSorting) {
            sortAction = "toggle";
          } else {
            sortAction = "add";
          }
        } else {
          if (old != null && old.length && existingIndex !== old.length - 1) {
            sortAction = "replace";
          } else if (existingSorting) {
            sortAction = "toggle";
          } else {
            sortAction = "replace";
          }
        }
        if (sortAction === "toggle") {
          if (!hasManualValue) {
            if (!nextSortingOrder) {
              sortAction = "remove";
            }
          }
        }
        if (sortAction === "add") {
          var _table$options$maxMul;
          newSorting = [
            ...old,
            {
              id: column.id,
              desc: nextDesc,
            },
          ];
          newSorting.splice(
            0,
            newSorting.length -
              ((_table$options$maxMul = table2.options.maxMultiSortColCount) != null
                ? _table$options$maxMul
                : Number.MAX_SAFE_INTEGER),
          );
        } else if (sortAction === "toggle") {
          newSorting = old.map((d2) => {
            if (d2.id === column.id) {
              return {
                ...d2,
                desc: nextDesc,
              };
            }
            return d2;
          });
        } else if (sortAction === "remove") {
          newSorting = old.filter((d2) => d2.id !== column.id);
        } else {
          newSorting = [
            {
              id: column.id,
              desc: nextDesc,
            },
          ];
        }
        return newSorting;
      });
    };
    column.getFirstSortDir = () => {
      var _ref, _column$columnDef$sor;
      const sortDescFirst =
        (_ref =
          (_column$columnDef$sor = column.columnDef.sortDescFirst) != null
            ? _column$columnDef$sor
            : table2.options.sortDescFirst) != null
          ? _ref
          : column.getAutoSortDir() === "desc";
      return sortDescFirst ? "desc" : "asc";
    };
    column.getNextSortingOrder = (multi) => {
      var _table$options$enable, _table$options$enable2;
      const firstSortDirection = column.getFirstSortDir();
      const isSorted = column.getIsSorted();
      if (!isSorted) {
        return firstSortDirection;
      }
      if (
        isSorted !== firstSortDirection &&
        ((_table$options$enable = table2.options.enableSortingRemoval) != null
          ? _table$options$enable
          : true) &&
        // If enableSortRemove, enable in general
        (multi
          ? (_table$options$enable2 = table2.options.enableMultiRemove) != null
            ? _table$options$enable2
            : true
          : true)
      ) {
        return false;
      }
      return isSorted === "desc" ? "asc" : "desc";
    };
    column.getCanSort = () => {
      var _column$columnDef$ena, _table$options$enable3;
      return (
        ((_column$columnDef$ena = column.columnDef.enableSorting) != null
          ? _column$columnDef$ena
          : true) &&
        ((_table$options$enable3 = table2.options.enableSorting) != null
          ? _table$options$enable3
          : true) &&
        !!column.accessorFn
      );
    };
    column.getCanMultiSort = () => {
      var _ref2, _column$columnDef$ena2;
      return (_ref2 =
        (_column$columnDef$ena2 = column.columnDef.enableMultiSort) != null
          ? _column$columnDef$ena2
          : table2.options.enableMultiSort) != null
        ? _ref2
        : !!column.accessorFn;
    };
    column.getIsSorted = () => {
      var _table$getState$sorti;
      const columnSort =
        (_table$getState$sorti = table2.getState().sorting) == null
          ? void 0
          : _table$getState$sorti.find((d2) => d2.id === column.id);
      return !columnSort ? false : columnSort.desc ? "desc" : "asc";
    };
    column.getSortIndex = () => {
      var _table$getState$sorti2, _table$getState$sorti3;
      return (_table$getState$sorti2 =
        (_table$getState$sorti3 = table2.getState().sorting) == null
          ? void 0
          : _table$getState$sorti3.findIndex((d2) => d2.id === column.id)) != null
        ? _table$getState$sorti2
        : -1;
    };
    column.clearSorting = () => {
      table2.setSorting((old) =>
        old != null && old.length ? old.filter((d2) => d2.id !== column.id) : [],
      );
    };
    column.getToggleSortingHandler = () => {
      const canSort = column.getCanSort();
      return (e2) => {
        if (!canSort) return;
        e2.persist == null || e2.persist();
        column.toggleSorting == null ||
          column.toggleSorting(
            void 0,
            column.getCanMultiSort()
              ? table2.options.isMultiSortEvent == null
                ? void 0
                : table2.options.isMultiSortEvent(e2)
              : false,
          );
      };
    };
  },
  createTable: (table2) => {
    table2.setSorting = (updater) =>
      table2.options.onSortingChange == null ? void 0 : table2.options.onSortingChange(updater);
    table2.resetSorting = (defaultState2) => {
      var _table$initialState$s, _table$initialState;
      table2.setSorting(
        defaultState2
          ? []
          : (_table$initialState$s =
                (_table$initialState = table2.initialState) == null
                  ? void 0
                  : _table$initialState.sorting) != null
            ? _table$initialState$s
            : [],
      );
    };
    table2.getPreSortedRowModel = () => table2.getGroupedRowModel();
    table2.getSortedRowModel = () => {
      if (!table2._getSortedRowModel && table2.options.getSortedRowModel) {
        table2._getSortedRowModel = table2.options.getSortedRowModel(table2);
      }
      if (table2.options.manualSorting || !table2._getSortedRowModel) {
        return table2.getPreSortedRowModel();
      }
      return table2._getSortedRowModel();
    };
  },
};
const builtInFeatures = [
  Headers$1,
  ColumnVisibility,
  ColumnOrdering,
  ColumnPinning,
  ColumnFaceting,
  ColumnFiltering,
  GlobalFaceting,
  //depends on ColumnFaceting
  GlobalFiltering,
  //depends on ColumnFiltering
  RowSorting,
  ColumnGrouping,
  //depends on RowSorting
  RowExpanding,
  RowPagination,
  RowPinning,
  RowSelection,
  ColumnSizing,
];
export function createTable$1(options) {
  var _options$_features, _options$initialState;
  const _features = [
    ...builtInFeatures,
    ...((_options$_features = options._features) != null ? _options$_features : []),
  ];
  let table2 = {
    _features,
  };
  const defaultOptions2 = table2._features.reduce((obj, feature) => {
    return Object.assign(
      obj,
      feature.getDefaultOptions == null ? void 0 : feature.getDefaultOptions(table2),
    );
  }, {});
  const mergeOptions = (options2) => {
    if (table2.options.mergeOptions) {
      return table2.options.mergeOptions(defaultOptions2, options2);
    }
    return {
      ...defaultOptions2,
      ...options2,
    };
  };
  const coreInitialState = {};
  let initialState = {
    ...coreInitialState,
    ...((_options$initialState = options.initialState) != null ? _options$initialState : {}),
  };
  table2._features.forEach((feature) => {
    var _feature$getInitialSt;
    initialState =
      (_feature$getInitialSt =
        feature.getInitialState == null ? void 0 : feature.getInitialState(initialState)) != null
        ? _feature$getInitialSt
        : initialState;
  });
  const queued = [];
  let queuedTimeout = false;
  const coreInstance = {
    _features,
    options: {
      ...defaultOptions2,
      ...options,
    },
    initialState,
    _queue: (cb) => {
      queued.push(cb);
      if (!queuedTimeout) {
        queuedTimeout = true;
        Promise.resolve()
          .then(() => {
            while (queued.length) {
              queued.shift()();
            }
            queuedTimeout = false;
          })
          .catch((error) =>
            setTimeout(() => {
              throw error;
            }),
          );
      }
    },
    reset: () => {
      table2.setState(table2.initialState);
    },
    setOptions: (updater) => {
      const newOptions = functionalUpdate$2(updater, table2.options);
      table2.options = mergeOptions(newOptions);
    },
    getState: () => {
      return table2.options.state;
    },
    setState: (updater) => {
      table2.options.onStateChange == null || table2.options.onStateChange(updater);
    },
    _getRowId: (row, index2, parent) => {
      var _table$options$getRow;
      return (_table$options$getRow =
        table2.options.getRowId == null ? void 0 : table2.options.getRowId(row, index2, parent)) !=
        null
        ? _table$options$getRow
        : `${parent ? [parent.id, index2].join(".") : index2}`;
    },
    getCoreRowModel: () => {
      if (!table2._getCoreRowModel) {
        table2._getCoreRowModel = table2.options.getCoreRowModel(table2);
      }
      return table2._getCoreRowModel();
    },
    // The final calls start at the bottom of the model,
    // expanded rows, which then work their way up
    getRowModel: () => {
      return table2.getPaginationRowModel();
    },
    //in next version, we should just pass in the row model as the optional 2nd arg
    getRow: (id2, searchAll) => {
      let row = (searchAll ? table2.getPrePaginationRowModel() : table2.getRowModel()).rowsById[
        id2
      ];
      if (!row) {
        row = table2.getCoreRowModel().rowsById[id2];
        if (!row) {
          throw new Error();
        }
      }
      return row;
    },
    _getDefaultColumnDef: memo$1(
      () => [table2.options.defaultColumn],
      (defaultColumn) => {
        var _defaultColumn;
        defaultColumn = (_defaultColumn = defaultColumn) != null ? _defaultColumn : {};
        return {
          header: (props) => {
            const resolvedColumnDef = props.header.column.columnDef;
            if (resolvedColumnDef.accessorKey) {
              return resolvedColumnDef.accessorKey;
            }
            if (resolvedColumnDef.accessorFn) {
              return resolvedColumnDef.id;
            }
            return null;
          },
          // footer: props => props.header.column.id,
          cell: (props) => {
            var _props$renderValue$to, _props$renderValue;
            return (_props$renderValue$to =
              (_props$renderValue = props.renderValue()) == null ||
              _props$renderValue.toString == null
                ? void 0
                : _props$renderValue.toString()) != null
              ? _props$renderValue$to
              : null;
          },
          ...table2._features.reduce((obj, feature) => {
            return Object.assign(
              obj,
              feature.getDefaultColumnDef == null ? void 0 : feature.getDefaultColumnDef(),
            );
          }, {}),
          ...defaultColumn,
        };
      },
      getMemoOptions(options, "debugColumns"),
    ),
    _getColumnDefs: () => table2.options.columns,
    getAllColumns: memo$1(
      () => [table2._getColumnDefs()],
      (columnDefs) => {
        const recurseColumns = function (columnDefs2, parent, depth2) {
          if (depth2 === void 0) {
            depth2 = 0;
          }
          return columnDefs2.map((columnDef) => {
            const column = createColumn(table2, columnDef, depth2, parent);
            const groupingColumnDef = columnDef;
            column.columns = groupingColumnDef.columns
              ? recurseColumns(groupingColumnDef.columns, column, depth2 + 1)
              : [];
            return column;
          });
        };
        return recurseColumns(columnDefs);
      },
      getMemoOptions(options, "debugColumns"),
    ),
    getAllFlatColumns: memo$1(
      () => [table2.getAllColumns()],
      (allColumns) => {
        return allColumns.flatMap((column) => {
          return column.getFlatColumns();
        });
      },
      getMemoOptions(options, "debugColumns"),
    ),
    _getAllFlatColumnsById: memo$1(
      () => [table2.getAllFlatColumns()],
      (flatColumns) => {
        return flatColumns.reduce((acc, column) => {
          acc[column.id] = column;
          return acc;
        }, {});
      },
      getMemoOptions(options, "debugColumns"),
    ),
    getAllLeafColumns: memo$1(
      () => [table2.getAllColumns(), table2._getOrderColumnsFn()],
      (allColumns, orderColumns2) => {
        let leafColumns = allColumns.flatMap((column) => column.getLeafColumns());
        return orderColumns2(leafColumns);
      },
      getMemoOptions(options, "debugColumns"),
    ),
    getColumn: (columnId) => {
      const column = table2._getAllFlatColumnsById()[columnId];
      return column;
    },
  };
  Object.assign(table2, coreInstance);
  for (let index2 = 0; index2 < table2._features.length; index2++) {
    const feature = table2._features[index2];
    feature == null || feature.createTable == null || feature.createTable(table2);
  }
  return table2;
}
