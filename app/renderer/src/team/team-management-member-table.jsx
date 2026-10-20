// ==== 逐文件收敛 ====

// team-management-member-table.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { mergeTailwindClasses as cn } from "../infra/dialog-content.jsx";
import { createAlignAttribute, createColGroup, fillEmptyCellContent, isEmptyCellElement, normalizeTableCellAlign, parseColwidth, preprocessTablePipes, renderTableToMarkdown, updateColumns } from "../text-editor/prosemirror-table-view.js";
import { createColumn, functionalUpdate as functionalUpdate$1, getMemoOptions, isFunction as isFunction$6 } from "../media-editing/create-column.jsx";
// `Node$1` 在产物里是 **Tiptap 的 Node**（下面用 `Node$1.create({...})` 定义表格扩展），
// 还原时错认成了 prosemirror-model 的 Node —— 后者的 `create` 是别的签名，
// 构建不报错，运行时才炸「Node$1.create is not a function」。`Fragment`/`Slice` 没被用到。
import { Node as Node$1 } from "@tiptap/core";
import { Plugin, Selection, SelectionRange as SelectionRange$1, TextSelection } from "prosemirror-state";
import { CellBookmark, CellSelection, ResizeState, TableMap, TableView as TableView$1, addColSpan, addColumn, addRow, columnResizing, columnResizingPluginKey, fixTables, goToNextCell, handlePaste, inSameTable, isInTable, mergeCells, moveCellForward, pointsAtCell, removeColSpan, removeColumn, removeRow, selectedRect, selectionCell, splitCellWithType, tableEditing, tableEditingKey, tableNodeTypes, toggleHeader } from "prosemirror-tables";
import { createTable } from "@tanstack/table-core";
import { mergeAttributes } from "@tiptap/core";

// 第 200 轮：从产物取回（参考 bundle 162460）。
// isCellSelection 来自 prosemirror-tables；findParentNodeClosestToPos 是
// prosemirror-utils 的助手，本仓库没装，就地实现（逻辑等价：沿 $pos 逐层上溯）。
// prosemirror-tables 不导出 isCellSelection，它是  的别名。
const isCellSelection = (selection) => selection instanceof CellSelection;


const deleteTableWhenAllCellsSelected = ({ editor }) => {
  const { selection } = editor.state;
  if (!isCellSelection(selection)) return false;
  let cellCount = 0;
  const table = findParentNodeClosestToPos(selection.ranges[0].$from, (node) => node.type.name === "table");
  table?.node.descendants((node) => {
    if (node.type.name === "table") return false;
    if (["tableCell", "tableHeader"].includes(node.type.name)) cellCount += 1;
    return true;
  });
  if (cellCount !== selection.ranges.length) return false;
  editor.commands.deleteTable();
  return true;
};

const Table = Node$1.create({
  name: "table",
  addOptions() {
    return {
      HTMLAttributes: {},
      resizable: false,
      renderWrapper: false,
      handleWidth: 5,
      cellMinWidth: 25,
      View: TableView2,
      lastColumnResizable: true,
      allowTableNodeSelection: false,
    };
  },
  content: "tableRow+",
  tableRole: "table",
  isolating: true,
  group: "block",
  parseHTML() {
    return [
      {
        tag: "table",
      },
    ];
  },
  renderHTML({ node: node2, HTMLAttributes }) {
    const { colgroup, tableWidth, tableMinWidth } = createColGroup(node2, this.options.cellMinWidth);
    const userStyles = HTMLAttributes.style;
    function getTableStyle() {
      if (userStyles) return userStyles;
      return tableWidth ? `width: ${tableWidth}` : `min-width: ${tableMinWidth}`;
    }
    const table = [
      "table",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        style: getTableStyle(),
      }),
      colgroup,
      ["tbody", 0],
    ];
    return this.options.renderWrapper
      ? [
          "div",
          {
            class: "tableWrapper",
          },
          table,
        ]
      : table;
  },
  parseMarkdown: (token2, h2) => {
    const rows = [];
    const alignments = Array.isArray(token2.align) ? token2.align : [];
    if (token2.header) {
      const headerCells = [];
      token2.header.forEach((cell, index2) => {
        var _alignments$index;
        const align = normalizeTableCellAlign(
          (_alignments$index = alignments[index2]) !== null && _alignments$index !== void 0
            ? _alignments$index
            : cell.align,
        );
        const attrs = align
          ? {
              align,
            }
          : {};
        headerCells.push(
          h2.createNode("tableHeader", attrs, [
            {
              type: "paragraph",
              content: h2.parseInline(cell.tokens),
            },
          ]),
        );
      });
      rows.push(h2.createNode("tableRow", {}, headerCells));
    }
    if (token2.rows)
      token2.rows.forEach((row) => {
        const bodyCells = [];
        row.forEach((cell, index2) => {
          var _alignments$index2;
          const align = normalizeTableCellAlign(
            (_alignments$index2 = alignments[index2]) !== null && _alignments$index2 !== void 0
              ? _alignments$index2
              : cell.align,
          );
          const attrs = align
            ? {
                align,
              }
            : {};
          bodyCells.push(
            h2.createNode("tableCell", attrs, [
              {
                type: "paragraph",
                content: h2.parseInline(cell.tokens),
              },
            ]),
          );
        });
        rows.push(h2.createNode("tableRow", {}, bodyCells));
      });
    return h2.createNode("table", void 0, rows);
  },
  renderMarkdown: (node2, h2) => {
    return renderTableToMarkdown(node2, h2);
  },
  markdownTokenizer: {
    name: "table",
    level: "block",
    start: (src) => {
      const lines = src.split("\n");
      if (lines.length < 2) return -1;
      const sep = lines[1];
      if (!/^[ \t|:]*-[ \t|:-]*$/.test(sep) || !sep.includes("|")) return -1;
      return lines[0].includes("|") ? 0 : -1;
    },
    tokenize(src, _tokens, helper) {
      const blankLineIndex = src.indexOf("\n\n");
      const candidate = blankLineIndex >= 0 ? src.slice(0, blankLineIndex) : src;
      const candidateLines = candidate.split("\n");
      if (candidateLines.length < 2) return void 0;
      const sep = candidateLines[1];
      if (!/^[ \t|:]*-[ \t|:-]*$/.test(sep) || !sep.includes("|")) return void 0;
      const preprocessed = preprocessTablePipes(candidate);
      if (preprocessed === candidate) return void 0;
      const tableToken = helper.blockTokens(preprocessed)[0];
      if ((tableToken === null || tableToken === void 0 ? void 0 : tableToken.type) !== "table" || !tableToken.raw)
        return void 0;
      const lineCount = tableToken.raw.split("\n").length;
      const raw2 = src.split("\n").slice(0, lineCount).join("\n");
      return {
        ...tableToken,
        raw: raw2,
      };
    },
  },
  addCommands() {
    return {
      insertTable:
        ({ rows = 3, cols = 3, withHeaderRow = true } = {}) =>
        ({ tr, dispatch: dispatch2, editor: editor2 }) => {
          const node2 = createTable(editor2.schema, rows, cols, withHeaderRow);
          if (dispatch2) {
            const offset2 = tr.selection.from + 1;
            tr.replaceSelectionWith(node2)
              .scrollIntoView()
              .setSelection(TextSelection.near(tr.doc.resolve(offset2)));
          }
          return true;
        },
      addColumnBefore:
        () =>
        ({ state: state2, dispatch: dispatch2 }) => {
          return addColumnBefore(state2, dispatch2);
        },
      addColumnAfter:
        () =>
        ({ state: state2, dispatch: dispatch2 }) => {
          return addColumnAfter(state2, dispatch2);
        },
      deleteColumn:
        () =>
        ({ state: state2, dispatch: dispatch2 }) => {
          const table = findParentNodeClosestToPos(state2.selection.$from, (node2) => node2.type.name === "table");
          return deleteColumn(
            state2,
            dispatch2 &&
              ((tr) => {
                if (table) keepCursorInTable(tr, table.pos);
                dispatch2(tr);
              }),
          );
        },
      addRowBefore:
        () =>
        ({ state: state2, dispatch: dispatch2 }) => {
          return addRowBefore(state2, dispatch2);
        },
      addRowAfter:
        () =>
        ({ state: state2, dispatch: dispatch2 }) => {
          return addRowAfter(state2, dispatch2);
        },
      deleteRow:
        () =>
        ({ state: state2, dispatch: dispatch2 }) => {
          const table = findParentNodeClosestToPos(state2.selection.$from, (node2) => node2.type.name === "table");
          return deleteRow(
            state2,
            dispatch2 &&
              ((tr) => {
                if (table) keepCursorInTable(tr, table.pos);
                dispatch2(tr);
              }),
          );
        },
      deleteTable:
        () =>
        ({ state: state2, dispatch: dispatch2 }) => {
          return deleteTable(state2, dispatch2);
        },
      mergeCells:
        () =>
        ({ state: state2, dispatch: dispatch2 }) => {
          return mergeCells(state2, dispatch2);
        },
      splitCell:
        () =>
        ({ state: state2, dispatch: dispatch2 }) => {
          return splitCell(state2, dispatch2);
        },
      toggleHeaderColumn:
        () =>
        ({ state: state2, dispatch: dispatch2 }) => {
          return toggleHeader("column")(state2, dispatch2);
        },
      toggleHeaderRow:
        () =>
        ({ state: state2, dispatch: dispatch2 }) => {
          return toggleHeader("row")(state2, dispatch2);
        },
      toggleHeaderCell:
        () =>
        ({ state: state2, dispatch: dispatch2 }) => {
          return toggleHeaderCell(state2, dispatch2);
        },
      mergeOrSplit:
        () =>
        ({ state: state2, dispatch: dispatch2 }) => {
          if (mergeCells(state2, dispatch2)) return true;
          return splitCell(state2, dispatch2);
        },
      setCellAttribute:
        (name, value) =>
        ({ state: state2, dispatch: dispatch2 }) => {
          return setCellAttr(name, value)(state2, dispatch2);
        },
      goToNextCell:
        () =>
        ({ state: state2, dispatch: dispatch2 }) => {
          return goToNextCell(1)(state2, dispatch2);
        },
      goToPreviousCell:
        () =>
        ({ state: state2, dispatch: dispatch2 }) => {
          return goToNextCell(-1)(state2, dispatch2);
        },
      fixTables:
        () =>
        ({ state: state2, dispatch: dispatch2 }) => {
          if (dispatch2) fixTables(state2);
          return true;
        },
      setCellSelection:
        (position2) =>
        ({ tr, dispatch: dispatch2 }) => {
          if (dispatch2) {
            const selection = CellSelection.create(tr.doc, position2.anchorCell, position2.headCell);
            tr.setSelection(selection);
          }
          return true;
        },
    };
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.commands.goToNextCell()) return true;
        if (!this.editor.can().addRowAfter()) return false;
        return this.editor.chain().addRowAfter().goToNextCell().run();
      },
      "Shift-Tab": () => this.editor.commands.goToPreviousCell(),
      Backspace: deleteTableWhenAllCellsSelected,
      "Mod-Backspace": deleteTableWhenAllCellsSelected,
      Delete: deleteTableWhenAllCellsSelected,
      "Mod-Delete": deleteTableWhenAllCellsSelected,
    };
  },
  addProseMirrorPlugins() {
    return [
      ...(this.options.resizable && this.editor.isEditable
        ? [
            columnResizing({
              handleWidth: this.options.handleWidth,
              cellMinWidth: this.options.cellMinWidth,
              defaultCellMinWidth: this.options.cellMinWidth,
              View: this.options.View,
              lastColumnResizable: this.options.lastColumnResizable,
            }),
          ]
        : []),
      tableEditing({
        allowTableNodeSelection: this.options.allowTableNodeSelection,
      }),
    ];
  },
  addNodeView() {
    const isResizable = this.options.resizable && this.editor.isEditable;
    const View = this.options.View;
    if (isResizable || !View) return null;
    return ({ node: node2, view: view2, HTMLAttributes }) => {
      const mergedAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
      return new View(node2, this.options.cellMinWidth, view2, mergedAttributes);
    };
  },
  extendNodeSchema(extension2) {
    const context = {
      name: extension2.name,
      options: extension2.options,
      storage: extension2.storage,
    };
    return {
      tableRole: callOrReturn(getExtensionField(extension2, "tableRole", context)),
    };
  },
});
const TableHeader = Node$1.create({
  name: "tableHeader",
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  content: "block+",
  addAttributes() {
    return {
      colspan: {
        default: 1,
      },
      rowspan: {
        default: 1,
      },
      colwidth: {
        default: null,
        parseHTML: parseColwidth,
      },
      align: createAlignAttribute(),
    };
  },
  tableRole: "header_cell",
  isolating: true,
  parseHTML() {
    return [
      {
        tag: "th",
        getAttrs: (node2) => (isEmptyCellElement(node2) ? {} : false),
        getContent: (_node, schema) => fillEmptyCellContent(schema.nodes[this.name]),
      },
      {
        tag: "th",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["th", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});
function TableBody({ className, ...props }) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}
const TableRow = Node$1.create({
  name: "tableRow",
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  content: "(tableCell | tableHeader)*",
  tableRole: "row",
  parseHTML() {
    return [
      {
        tag: "tr",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["tr", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});
function TableHead({ className, ...props }) {
  return (
    <th
      data-slot="table-head"
      className={cn("text-left align-middle font-medium", className)}
      {...props}
    />
  );
}
function TableCell({ className, ...props }) {
  return (
    <td
      data-slot="table-cell"
      className={cn("align-middle", className)}
      {...props}
    />
  );
}
export function TeamManagementMemberTable({
  showCredits = true,
  headerSelection,
  memberLabel,
  roleLabel,
  quotaLabel,
  usageLabel,
  actionLabel,
  uidPrefix,
  rows,
}) {
  const showSelection = headerSelection !== void 0;
  const showUsage = showCredits && usageLabel !== void 0;
  const showAction = actionLabel !== void 0;
  return (
    <div className="overflow-clip rounded-lg border border-border [&_[data-slot=table-container]]:overflow-visible">
      <Table className="min-w-[36rem] table-fixed">
        <colgroup>
          {showSelection ? <col className="w-10" /> : null}
          <col />
          {showCredits ? <col className="w-28" /> : null}
          {showUsage ? <col className="w-28" /> : null}
          {showAction ? <col className="w-30" /> : null}
        </colgroup>
        <TableHeader className="sticky top-0 z-10 bg-muted">
          <TableRow>
            {showSelection ? (
              <TableHead className="px-3 py-1.5 text-[11px] text-muted-foreground">
                {headerSelection}
              </TableHead>
            ) : null}
            <TableHead className="min-w-0 break-words px-3 py-1.5 text-[11px] text-muted-foreground">
              {memberLabel}
            </TableHead>
            {showCredits ? (
              <TableHead className="min-w-0 break-words px-3 py-1.5 text-center text-[11px] text-muted-foreground">
                {quotaLabel}
              </TableHead>
            ) : null}
            {showUsage ? (
              <TableHead className="min-w-0 break-words px-3 py-1.5 text-center text-[11px] text-muted-foreground">
                {usageLabel}
              </TableHead>
            ) : null}
            {showAction ? (
              <TableHead className="px-3 py-1.5 text-right text-[11px] text-muted-foreground">
                <div className="ml-auto grid w-full grid-cols-2 gap-1">
                  <span className="col-start-2 text-center">{actionLabel}</span>
                </div>
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className="transition-colors hover:bg-foreground/[0.03]"
            >
              {showSelection ? (
                <TableCell className="px-3 py-2">{row.selection}</TableCell>
              ) : null}
              <TableCell className="px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {row.name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    <span className="sr-only">
                      {roleLabel}
                      {": "}
                    </span>
                    {row.role}
                    {" · "}
                    {uidPrefix} {row.uid}
                  </p>
                </div>
              </TableCell>
              {showCredits ? (
                <TableCell className="min-w-0 break-words px-3 py-2 text-center text-xs text-muted-foreground">
                  {row.quota}
                </TableCell>
              ) : null}
              {showUsage ? (
                <TableCell className="min-w-0 break-words px-3 py-2 text-center text-xs text-muted-foreground">
                  {row.usage}
                </TableCell>
              ) : null}
              {showAction ? (
                <TableCell className="px-3 py-2 text-right">
                  {row.action}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

var TableView2 = class {
  constructor(node2, cellMinWidth, _view, HTMLAttributes = {}) {
    this.node = node2;
    this.cellMinWidth = cellMinWidth;
    this.dom = document.createElement("div");
    this.dom.className = "tableWrapper";
    this.table = this.dom.appendChild(document.createElement("table"));
    for (const [key2, value] of Object.entries(HTMLAttributes))
      if (value !== void 0 && value !== null) {
        if (key2 === "style") this.table.style.cssText = String(value);
        else this.table.setAttribute(key2, String(value));
      }
    if (node2.attrs.style) this.table.style.cssText = node2.attrs.style;
    this.colgroup = this.table.appendChild(document.createElement("colgroup"));
    updateColumns(node2, this.colgroup, this.table, cellMinWidth);
    this.contentDOM = this.table.appendChild(document.createElement("tbody"));
  }
  update(node2) {
    if (node2.type !== this.node.type) return false;
    this.node = node2;
    updateColumns(node2, this.colgroup, this.table, this.cellMinWidth);
    return true;
  }
  ignoreMutation(mutation) {
    const target = mutation.target;
    const isInsideWrapper = this.dom.contains(target);
    const isInsideContent = this.contentDOM.contains(target);
    if (isInsideWrapper && !isInsideContent) {
      if (mutation.type === "attributes" || mutation.type === "childList" || mutation.type === "characterData")
        return true;
    }
    return false;
  }
};

function addColumnBefore(state2, dispatch2) {
  if (!isInTable(state2)) return false;
  if (dispatch2) {
    const rect = selectedRect(state2);
    dispatch2(addColumn(state2.tr, rect, rect.left));
  }
  return true;
}

function addColumnAfter(state2, dispatch2) {
  if (!isInTable(state2)) return false;
  if (dispatch2) {
    const rect = selectedRect(state2);
    dispatch2(addColumn(state2.tr, rect, rect.right));
  }
  return true;
}

function findParentNodeClosestToPos($pos, predicate) {
  for (let i2 = $pos.depth; i2 > 0; i2 -= 1) {
    const node2 = $pos.node(i2);
    if (predicate(node2))
      return {
        pos: i2 > 0 ? $pos.before(i2) : 0,
        start: $pos.start(i2),
        depth: i2,
        node: node2,
      };
  }
}

function deleteColumn(state2, dispatch2) {
  if (!isInTable(state2)) return false;
  if (dispatch2) {
    const rect = selectedRect(state2);
    const tr2 = state2.tr;
    if (rect.left == 0 && rect.right == rect.map.width) return false;
    for (let i2 = rect.right - 1; ; i2--) {
      removeColumn(tr2, rect, i2);
      if (i2 == rect.left) break;
      const table2 = rect.tableStart ? tr2.doc.nodeAt(rect.tableStart - 1) : tr2.doc;
      if (!table2) throw new RangeError("No table found");
      rect.table = table2;
      rect.map = TableMap.get(table2);
    }
    dispatch2(tr2);
  }
  return true;
}

function keepCursorInTable(tr2, tablePos) {
  const mappedTablePos = tr2.mapping.map(tablePos);
  const stillInTable = findParentNodeClosestToPos(tr2.selection.$from, (node2) => node2.type.name === "table");
  if ((stillInTable === null || stillInTable === void 0 ? void 0 : stillInTable.pos) === mappedTablePos) return;
  const tableNode = tr2.doc.nodeAt(mappedTablePos);
  if (!tableNode) return;
  const endOfTable = mappedTablePos + tableNode.nodeSize - 1;
  tr2.setSelection(TextSelection.near(tr2.doc.resolve(endOfTable), -1));
}

function addRowBefore(state2, dispatch2) {
  if (!isInTable(state2)) return false;
  if (dispatch2) {
    const rect = selectedRect(state2);
    dispatch2(addRow(state2.tr, rect, rect.top));
  }
  return true;
}

function addRowAfter(state2, dispatch2) {
  if (!isInTable(state2)) return false;
  if (dispatch2) {
    const rect = selectedRect(state2);
    dispatch2(addRow(state2.tr, rect, rect.bottom));
  }
  return true;
}

function deleteRow(state2, dispatch2) {
  if (!isInTable(state2)) return false;
  if (dispatch2) {
    const rect = selectedRect(state2),
      tr2 = state2.tr;
    if (rect.top == 0 && rect.bottom == rect.map.height) return false;
    for (let i2 = rect.bottom - 1; ; i2--) {
      removeRow(tr2, rect, i2);
      if (i2 == rect.top) break;
      const table2 = rect.tableStart ? tr2.doc.nodeAt(rect.tableStart - 1) : tr2.doc;
      if (!table2) throw new RangeError("No table found");
      rect.table = table2;
      rect.map = TableMap.get(rect.table);
    }
    dispatch2(tr2);
  }
  return true;
}

function deleteTable(state2, dispatch2) {
  const $pos = state2.selection.$anchor;
  for (let d2 = $pos.depth; d2 > 0; d2--)
    if ($pos.node(d2).type.spec.tableRole == "table") {
      if (dispatch2) dispatch2(state2.tr.delete($pos.before(d2), $pos.after(d2)).scrollIntoView());
      return true;
    }
  return false;
}

function splitCell(state2, dispatch2) {
  const nodeTypes2 = tableNodeTypes(state2.schema);
  return splitCellWithType(({ node: node2 }) => {
    return nodeTypes2[node2.type.spec.tableRole];
  })(state2, dispatch2);
}

const toggleHeaderCell = toggleHeader("cell", {
  useDeprecatedLogic: true,
});

function setCellAttr(name2, value) {
  return function (state2, dispatch2) {
    if (!isInTable(state2)) return false;
    const $cell = selectionCell(state2);
    if ($cell.nodeAfter.attrs[name2] === value) return false;
    if (dispatch2) {
      const tr2 = state2.tr;
      if (state2.selection instanceof CellSelection)
        state2.selection.forEachCell((node2, pos) => {
          if (node2.attrs[name2] !== value)
            tr2.setNodeMarkup(pos, null, {
              ...node2.attrs,
              [name2]: value,
            });
        });
      else
        tr2.setNodeMarkup($cell.pos, null, {
          ...$cell.nodeAfter.attrs,
          [name2]: value,
        });
      dispatch2(tr2);
    }
    return true;
  };
}

export function callOrReturn(value, context = void 0, ...props) {
  if (isFunction$6(value)) {
    if (context) return value.bind(context)(...props);
    return value(...props);
  }
  return value;
}

function getExtensionField(extension2, field, context) {
  if (extension2.config[field] === void 0 && extension2.parent)
    return getExtensionField(extension2.parent, field, context);
  if (typeof extension2.config[field] === "function")
    return extension2.config[field].bind({
      ...context,
      parent: extension2.parent ? getExtensionField(extension2.parent, field, context) : null,
    });
  return extension2.config[field];
}
