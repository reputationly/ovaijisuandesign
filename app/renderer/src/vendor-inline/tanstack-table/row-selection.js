// row-selection.js
import { getMemoOptions, makeStateUpdater, memo$1 } from "../../media-editing/ready-sub-video-card.jsx";
const getDefaultRowPinningState = () => ({
  top: [],
  bottom: [],
});
export const RowPinning = {
  getInitialState: (state2) => {
    return {
      rowPinning: getDefaultRowPinningState(),
      ...state2,
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onRowPinningChange: makeStateUpdater("rowPinning", table2),
    };
  },
  createRow: (row, table2) => {
    row.pin = (position2, includeLeafRows, includeParentRows) => {
      const leafRowIds = includeLeafRows
        ? row.getLeafRows().map((_ref) => {
            let { id: id2 } = _ref;
            return id2;
          })
        : [];
      const parentRowIds = includeParentRows
        ? row.getParentRows().map((_ref2) => {
            let { id: id2 } = _ref2;
            return id2;
          })
        : [];
      const rowIds = new Set([...parentRowIds, row.id, ...leafRowIds]);
      table2.setRowPinning((old) => {
        var _old$top3, _old$bottom3;
        if (position2 === "bottom") {
          var _old$top, _old$bottom;
          return {
            top: ((_old$top = old == null ? void 0 : old.top) != null ? _old$top : []).filter(
              (d2) => !(rowIds != null && rowIds.has(d2)),
            ),
            bottom: [
              ...((_old$bottom = old == null ? void 0 : old.bottom) != null
                ? _old$bottom
                : []
              ).filter((d2) => !(rowIds != null && rowIds.has(d2))),
              ...Array.from(rowIds),
            ],
          };
        }
        if (position2 === "top") {
          var _old$top2, _old$bottom2;
          return {
            top: [
              ...((_old$top2 = old == null ? void 0 : old.top) != null ? _old$top2 : []).filter(
                (d2) => !(rowIds != null && rowIds.has(d2)),
              ),
              ...Array.from(rowIds),
            ],
            bottom: ((_old$bottom2 = old == null ? void 0 : old.bottom) != null
              ? _old$bottom2
              : []
            ).filter((d2) => !(rowIds != null && rowIds.has(d2))),
          };
        }
        return {
          top: ((_old$top3 = old == null ? void 0 : old.top) != null ? _old$top3 : []).filter(
            (d2) => !(rowIds != null && rowIds.has(d2)),
          ),
          bottom: ((_old$bottom3 = old == null ? void 0 : old.bottom) != null
            ? _old$bottom3
            : []
          ).filter((d2) => !(rowIds != null && rowIds.has(d2))),
        };
      });
    };
    row.getCanPin = () => {
      var _ref3;
      const { enableRowPinning, enablePinning } = table2.options;
      if (typeof enableRowPinning === "function") {
        return enableRowPinning(row);
      }
      return (_ref3 = enableRowPinning != null ? enableRowPinning : enablePinning) != null
        ? _ref3
        : true;
    };
    row.getIsPinned = () => {
      const rowIds = [row.id];
      const { top: top2, bottom } = table2.getState().rowPinning;
      const isTop = rowIds.some((d2) => (top2 == null ? void 0 : top2.includes(d2)));
      const isBottom = rowIds.some((d2) => (bottom == null ? void 0 : bottom.includes(d2)));
      return isTop ? "top" : isBottom ? "bottom" : false;
    };
    row.getPinnedIndex = () => {
      var _ref4, _visiblePinnedRowIds$;
      const position2 = row.getIsPinned();
      if (!position2) return -1;
      const visiblePinnedRowIds =
        (_ref4 = position2 === "top" ? table2.getTopRows() : table2.getBottomRows()) == null
          ? void 0
          : _ref4.map((_ref5) => {
              let { id: id2 } = _ref5;
              return id2;
            });
      return (_visiblePinnedRowIds$ =
        visiblePinnedRowIds == null ? void 0 : visiblePinnedRowIds.indexOf(row.id)) != null
        ? _visiblePinnedRowIds$
        : -1;
    };
  },
  createTable: (table2) => {
    table2.setRowPinning = (updater) =>
      table2.options.onRowPinningChange == null
        ? void 0
        : table2.options.onRowPinningChange(updater);
    table2.resetRowPinning = (defaultState2) => {
      var _table$initialState$r, _table$initialState;
      return table2.setRowPinning(
        defaultState2
          ? getDefaultRowPinningState()
          : (_table$initialState$r =
                (_table$initialState = table2.initialState) == null
                  ? void 0
                  : _table$initialState.rowPinning) != null
            ? _table$initialState$r
            : getDefaultRowPinningState(),
      );
    };
    table2.getIsSomeRowsPinned = (position2) => {
      var _pinningState$positio;
      const pinningState = table2.getState().rowPinning;
      if (!position2) {
        var _pinningState$top, _pinningState$bottom;
        return Boolean(
          ((_pinningState$top = pinningState.top) == null ? void 0 : _pinningState$top.length) ||
          ((_pinningState$bottom = pinningState.bottom) == null
            ? void 0
            : _pinningState$bottom.length),
        );
      }
      return Boolean(
        (_pinningState$positio = pinningState[position2]) == null
          ? void 0
          : _pinningState$positio.length,
      );
    };
    table2._getPinnedRows = (visibleRows, pinnedRowIds, position2) => {
      var _table$options$keepPi;
      const rows = (
        (_table$options$keepPi = table2.options.keepPinnedRows) != null
          ? _table$options$keepPi
          : true
      )
        ? //get all rows that are pinned even if they would not be otherwise visible
          //account for expanded parent rows, but not pagination or filtering
          (pinnedRowIds != null ? pinnedRowIds : []).map((rowId) => {
            const row = table2.getRow(rowId, true);
            return row.getIsAllParentsExpanded() ? row : null;
          })
        : //else get only visible rows that are pinned
          (pinnedRowIds != null ? pinnedRowIds : []).map((rowId) =>
            visibleRows.find((row) => row.id === rowId),
          );
      return rows.filter(Boolean).map((d2) => ({
        ...d2,
        position: position2,
      }));
    };
    table2.getTopRows = memo$1(
      () => [table2.getRowModel().rows, table2.getState().rowPinning.top],
      (allRows, topPinnedRowIds) => table2._getPinnedRows(allRows, topPinnedRowIds, "top"),
      getMemoOptions(table2.options, "debugRows"),
    );
    table2.getBottomRows = memo$1(
      () => [table2.getRowModel().rows, table2.getState().rowPinning.bottom],
      (allRows, bottomPinnedRowIds) => table2._getPinnedRows(allRows, bottomPinnedRowIds, "bottom"),
      getMemoOptions(table2.options, "debugRows"),
    );
    table2.getCenterRows = memo$1(
      () => [
        table2.getRowModel().rows,
        table2.getState().rowPinning.top,
        table2.getState().rowPinning.bottom,
      ],
      (allRows, top2, bottom) => {
        const topAndBottom = new Set([
          ...(top2 != null ? top2 : []),
          ...(bottom != null ? bottom : []),
        ]);
        return allRows.filter((d2) => !topAndBottom.has(d2.id));
      },
      getMemoOptions(table2.options, "debugRows"),
    );
  },
};
export const RowSelection = {
  getInitialState: (state2) => {
    return {
      rowSelection: {},
      ...state2,
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onRowSelectionChange: makeStateUpdater("rowSelection", table2),
      enableRowSelection: true,
      enableMultiRowSelection: true,
      enableSubRowSelection: true,
      // enableGroupingRowSelection: false,
      // isAdditiveSelectEvent: (e: unknown) => !!e.metaKey,
      // isInclusiveSelectEvent: (e: unknown) => !!e.shiftKey,
    };
  },
  createTable: (table2) => {
    table2.setRowSelection = (updater) =>
      table2.options.onRowSelectionChange == null
        ? void 0
        : table2.options.onRowSelectionChange(updater);
    table2.resetRowSelection = (defaultState2) => {
      var _table$initialState$r;
      return table2.setRowSelection(
        defaultState2
          ? {}
          : (_table$initialState$r = table2.initialState.rowSelection) != null
            ? _table$initialState$r
            : {},
      );
    };
    table2.toggleAllRowsSelected = (value) => {
      table2.setRowSelection((old) => {
        value = typeof value !== "undefined" ? value : !table2.getIsAllRowsSelected();
        const rowSelection = {
          ...old,
        };
        const preGroupedFlatRows = table2.getPreGroupedRowModel().flatRows;
        if (value) {
          preGroupedFlatRows.forEach((row) => {
            if (!row.getCanSelect()) {
              return;
            }
            rowSelection[row.id] = true;
          });
        } else {
          preGroupedFlatRows.forEach((row) => {
            delete rowSelection[row.id];
          });
        }
        return rowSelection;
      });
    };
    table2.toggleAllPageRowsSelected = (value) =>
      table2.setRowSelection((old) => {
        const resolvedValue =
          typeof value !== "undefined" ? value : !table2.getIsAllPageRowsSelected();
        const rowSelection = {
          ...old,
        };
        table2.getRowModel().rows.forEach((row) => {
          mutateRowIsSelected(rowSelection, row.id, resolvedValue, true, table2);
        });
        return rowSelection;
      });
    table2.getPreSelectedRowModel = () => table2.getCoreRowModel();
    table2.getSelectedRowModel = memo$1(
      () => [table2.getState().rowSelection, table2.getCoreRowModel()],
      (rowSelection, rowModel) => {
        if (!Object.keys(rowSelection).length) {
          return {
            rows: [],
            flatRows: [],
            rowsById: {},
          };
        }
        return selectRowsFn(table2, rowModel);
      },
      getMemoOptions(table2.options, "debugTable"),
    );
    table2.getFilteredSelectedRowModel = memo$1(
      () => [table2.getState().rowSelection, table2.getFilteredRowModel()],
      (rowSelection, rowModel) => {
        if (!Object.keys(rowSelection).length) {
          return {
            rows: [],
            flatRows: [],
            rowsById: {},
          };
        }
        return selectRowsFn(table2, rowModel);
      },
      getMemoOptions(table2.options, "debugTable"),
    );
    table2.getGroupedSelectedRowModel = memo$1(
      () => [table2.getState().rowSelection, table2.getSortedRowModel()],
      (rowSelection, rowModel) => {
        if (!Object.keys(rowSelection).length) {
          return {
            rows: [],
            flatRows: [],
            rowsById: {},
          };
        }
        return selectRowsFn(table2, rowModel);
      },
      getMemoOptions(table2.options, "debugTable"),
    );
    table2.getIsAllRowsSelected = () => {
      const preGroupedFlatRows = table2.getFilteredRowModel().flatRows;
      const { rowSelection } = table2.getState();
      let isAllRowsSelected = Boolean(
        preGroupedFlatRows.length && Object.keys(rowSelection).length,
      );
      if (isAllRowsSelected) {
        if (preGroupedFlatRows.some((row) => row.getCanSelect() && !rowSelection[row.id])) {
          isAllRowsSelected = false;
        }
      }
      return isAllRowsSelected;
    };
    table2.getIsAllPageRowsSelected = () => {
      const paginationFlatRows = table2
        .getPaginationRowModel()
        .flatRows.filter((row) => row.getCanSelect());
      const { rowSelection } = table2.getState();
      let isAllPageRowsSelected = !!paginationFlatRows.length;
      if (isAllPageRowsSelected && paginationFlatRows.some((row) => !rowSelection[row.id])) {
        isAllPageRowsSelected = false;
      }
      return isAllPageRowsSelected;
    };
    table2.getIsSomeRowsSelected = () => {
      var _table$getState$rowSe;
      const totalSelected = Object.keys(
        (_table$getState$rowSe = table2.getState().rowSelection) != null
          ? _table$getState$rowSe
          : {},
      ).length;
      return totalSelected > 0 && totalSelected < table2.getFilteredRowModel().flatRows.length;
    };
    table2.getIsSomePageRowsSelected = () => {
      const paginationFlatRows = table2.getPaginationRowModel().flatRows;
      return table2.getIsAllPageRowsSelected()
        ? false
        : paginationFlatRows
            .filter((row) => row.getCanSelect())
            .some((d2) => d2.getIsSelected() || d2.getIsSomeSelected());
    };
    table2.getToggleAllRowsSelectedHandler = () => {
      return (e2) => {
        table2.toggleAllRowsSelected(e2.target.checked);
      };
    };
    table2.getToggleAllPageRowsSelectedHandler = () => {
      return (e2) => {
        table2.toggleAllPageRowsSelected(e2.target.checked);
      };
    };
  },
  createRow: (row, table2) => {
    row.toggleSelected = (value, opts) => {
      const isSelected = row.getIsSelected();
      table2.setRowSelection((old) => {
        var _opts$selectChildren;
        value = typeof value !== "undefined" ? value : !isSelected;
        if (row.getCanSelect() && isSelected === value) {
          return old;
        }
        const selectedRowIds = {
          ...old,
        };
        mutateRowIsSelected(
          selectedRowIds,
          row.id,
          value,
          (_opts$selectChildren = opts == null ? void 0 : opts.selectChildren) != null
            ? _opts$selectChildren
            : true,
          table2,
        );
        return selectedRowIds;
      });
    };
    row.getIsSelected = () => {
      const { rowSelection } = table2.getState();
      return isRowSelected(row, rowSelection);
    };
    row.getIsSomeSelected = () => {
      const { rowSelection } = table2.getState();
      return isSubRowSelected(row, rowSelection) === "some";
    };
    row.getIsAllSubRowsSelected = () => {
      const { rowSelection } = table2.getState();
      return isSubRowSelected(row, rowSelection) === "all";
    };
    row.getCanSelect = () => {
      var _table$options$enable;
      if (typeof table2.options.enableRowSelection === "function") {
        return table2.options.enableRowSelection(row);
      }
      return (_table$options$enable = table2.options.enableRowSelection) != null
        ? _table$options$enable
        : true;
    };
    row.getCanSelectSubRows = () => {
      var _table$options$enable2;
      if (typeof table2.options.enableSubRowSelection === "function") {
        return table2.options.enableSubRowSelection(row);
      }
      return (_table$options$enable2 = table2.options.enableSubRowSelection) != null
        ? _table$options$enable2
        : true;
    };
    row.getCanMultiSelect = () => {
      var _table$options$enable3;
      if (typeof table2.options.enableMultiRowSelection === "function") {
        return table2.options.enableMultiRowSelection(row);
      }
      return (_table$options$enable3 = table2.options.enableMultiRowSelection) != null
        ? _table$options$enable3
        : true;
    };
    row.getToggleSelectedHandler = () => {
      const canSelect = row.getCanSelect();
      return (e2) => {
        var _target;
        if (!canSelect) return;
        row.toggleSelected((_target = e2.target) == null ? void 0 : _target.checked);
      };
    };
  },
};
const mutateRowIsSelected = (selectedRowIds, id2, value, includeChildren, table2) => {
  var _row$subRows;
  const row = table2.getRow(id2, true);
  if (value) {
    if (!row.getCanMultiSelect()) {
      Object.keys(selectedRowIds).forEach((key2) => delete selectedRowIds[key2]);
    }
    if (row.getCanSelect()) {
      selectedRowIds[id2] = true;
    }
  } else {
    delete selectedRowIds[id2];
  }
  if (
    includeChildren &&
    (_row$subRows = row.subRows) != null &&
    _row$subRows.length &&
    row.getCanSelectSubRows()
  ) {
    row.subRows.forEach((row2) =>
      mutateRowIsSelected(selectedRowIds, row2.id, value, includeChildren, table2),
    );
  }
};
function selectRowsFn(table2, rowModel) {
  const rowSelection = table2.getState().rowSelection;
  const newSelectedFlatRows = [];
  const newSelectedRowsById = {};
  const recurseRows = function (rows, depth2) {
    return rows
      .map((row) => {
        var _row$subRows2;
        const isSelected = isRowSelected(row, rowSelection);
        if (isSelected) {
          newSelectedFlatRows.push(row);
          newSelectedRowsById[row.id] = row;
        }
        if ((_row$subRows2 = row.subRows) != null && _row$subRows2.length) {
          row = {
            ...row,
            subRows: recurseRows(row.subRows),
          };
        }
        if (isSelected) {
          return row;
        }
      })
      .filter(Boolean);
  };
  return {
    rows: recurseRows(rowModel.rows),
    flatRows: newSelectedFlatRows,
    rowsById: newSelectedRowsById,
  };
}
function isRowSelected(row, selection2) {
  var _selection$row$id;
  return (_selection$row$id = selection2[row.id]) != null ? _selection$row$id : false;
}
function isSubRowSelected(row, selection2, table2) {
  var _row$subRows3;
  if (!((_row$subRows3 = row.subRows) != null && _row$subRows3.length)) return false;
  let allChildrenSelected = true;
  let someSelected = false;
  row.subRows.forEach((subRow) => {
    if (someSelected && !allChildrenSelected) {
      return;
    }
    if (subRow.getCanSelect()) {
      if (isRowSelected(subRow, selection2)) {
        someSelected = true;
      } else {
        allChildrenSelected = false;
      }
    }
    if (subRow.subRows && subRow.subRows.length) {
      const subRowChildrenSelected = isSubRowSelected(subRow, selection2);
      if (subRowChildrenSelected === "all") {
        someSelected = true;
      } else if (subRowChildrenSelected === "some") {
        someSelected = true;
        allChildrenSelected = false;
      } else {
        allChildrenSelected = false;
      }
    }
  });
  return allChildrenSelected ? "all" : someSelected ? "some" : false;
}
