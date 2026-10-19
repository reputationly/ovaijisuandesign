import { __jsx } from "../shared/jsx-runtime.js";
// 表格节点、列宽和 markdown 渲染像编辑器私有实现，还没对上已经换过的包。
export function normalizeTableCellAlign(value) {
  if (value === "left" || value === "right" || value === "center") return value;
  return null;
}

export function parseAlign(element) {
  const styleAlign = (element.style.textAlign || "").trim().toLowerCase();
  const attrAlign = (element.getAttribute("align") || "").trim().toLowerCase();
  return normalizeTableCellAlign(styleAlign || attrAlign);
}

export function normalizeTableCellAlignFromAttributes(attributes) {
  return normalizeTableCellAlign(attributes === null || attributes === void 0 ? void 0 : attributes.align);
}

export function createAlignAttribute() {
  return {
    default: null,
    parseHTML: element => parseAlign(element),
    renderHTML: attributes => {
      if (!attributes.align) return {};
      return {
        style: `text-align: ${attributes.align}`
      };
    }
  };
}

export function parseColgroupWidth(element) {
  var _table$querySelectorA;
  const row = element.parentElement;
  const table = element.closest("table");
  if (!row || !table) return null;
  const cellIndex = Array.from(row.children).indexOf(element);
  const width = (_table$querySelectorA = table.querySelectorAll("colgroup > col")[cellIndex]) === null || _table$querySelectorA === void 0 ? void 0 : _table$querySelectorA.getAttribute("width");
  return width ? [parseInt(width, 10)] : null;
}

export function parseColwidth(element) {
  const colwidth = element.getAttribute("colwidth");
  if (colwidth) return colwidth.split(",").map(width => parseInt(width, 10));
  return parseColgroupWidth(element);
}

export const COLLAPSIBLE_WHITESPACE = /[ \t\r\n\f]+/g;

export function isEmptyCellElement(element) {
  var _element$textContent;
  if (element.children.length > 0) return false;
  return ((_element$textContent = element.textContent) !== null && _element$textContent !== void 0 ? _element$textContent : "").replace(COLLAPSIBLE_WHITESPACE, "") === "";
}

export function fillEmptyCellContent(cellType) {
  const filled = cellType.createAndFill();
  if (!filled) throw new Error(`[tiptap error]: "${cellType.name}" has no default content to backfill.`);
  return filled.content;
}

export function getColStyleDeclaration(minWidth, width) {
  if (width) return ["width", `${Math.max(width, minWidth)}px`];
  return ["min-width", `${minWidth}px`];
}

export function updateColumns(node, colgroup, table, cellMinWidth, overrideCol, overrideValue) {
  let totalWidth = 0;
  let fixedWidth = true;
  let nextDOM = colgroup.firstChild;
  const row = node.firstChild;
  if (row !== null) for (let i = 0, col = 0; i < row.childCount; i += 1) {
    const {
      colspan,
      colwidth
    } = row.child(i).attrs;
    for (let j = 0; j < colspan; j += 1, col += 1) {
      const hasWidth = overrideCol === col ? overrideValue : colwidth && colwidth[j];
      const cssWidth = hasWidth ? `${hasWidth}px` : "";
      totalWidth += hasWidth || cellMinWidth;
      if (!hasWidth) fixedWidth = false;
      if (!nextDOM) {
        const colElement = document.createElement("col");
        const [propertyKey, propertyValue] = getColStyleDeclaration(cellMinWidth, hasWidth);
        colElement.style.setProperty(propertyKey, propertyValue);
        colgroup.appendChild(colElement);
      } else {
        if (nextDOM.style.width !== cssWidth) {
          const [propertyKey, propertyValue] = getColStyleDeclaration(cellMinWidth, hasWidth);
          nextDOM.style.setProperty(propertyKey, propertyValue);
        }
        nextDOM = nextDOM.nextSibling;
      }
    }
  }
  while (nextDOM) {
    var _nextDOM$parentNode;
    const after = nextDOM.nextSibling;
    (_nextDOM$parentNode = nextDOM.parentNode) === null || _nextDOM$parentNode === void 0 || _nextDOM$parentNode.removeChild(nextDOM);
    nextDOM = after;
  }
  const hasUserWidth = node.attrs.style && typeof node.attrs.style === "string" && /\bwidth\s*:/i.test(node.attrs.style);
  if (fixedWidth && !hasUserWidth) {
    table.style.width = `${totalWidth}px`;
    table.style.minWidth = "";
  } else {
    table.style.width = "";
    table.style.minWidth = `${totalWidth}px`;
  }
}

export var TableView = class {
  constructor(node, cellMinWidth, _view, HTMLAttributes = {}) {
    this.node = node;
    this.cellMinWidth = cellMinWidth;
    this.dom = document.createElement("div");
    this.dom.className = "tableWrapper";
    this.table = this.dom.appendChild(document.createElement("table"));
    for (const [key, value] of Object.entries(HTMLAttributes)) if (value !== void 0 && value !== null) {
      if (key === "style") this.table.style.cssText = String(value);else this.table.setAttribute(key, String(value));
    }
    if (node.attrs.style) this.table.style.cssText = node.attrs.style;
    this.colgroup = this.table.appendChild(document.createElement("colgroup"));
    updateColumns(node, this.colgroup, this.table, cellMinWidth);
    this.contentDOM = this.table.appendChild(document.createElement("tbody"));
  }
  update(node) {
    if (node.type !== this.node.type) return false;
    this.node = node;
    updateColumns(node, this.colgroup, this.table, this.cellMinWidth);
    return true;
  }
  ignoreMutation(mutation) {
    const target = mutation.target;
    const isInsideWrapper = this.dom.contains(target);
    const isInsideContent = this.contentDOM.contains(target);
    if (isInsideWrapper && !isInsideContent) {
      if (mutation.type === "attributes" || mutation.type === "childList" || mutation.type === "characterData") return true;
    }
    return false;
  }
};

export function createColGroup(node, cellMinWidth, overrideCol, overrideValue) {
  let totalWidth = 0;
  let fixedWidth = true;
  const cols = [];
  const row = node.firstChild;
  if (!row) return {};
  for (let i = 0, col = 0; i < row.childCount; i += 1) {
    const {
      colspan,
      colwidth
    } = row.child(i).attrs;
    for (let j = 0; j < colspan; j += 1, col += 1) {
      const hasWidth = overrideCol === col ? overrideValue : colwidth && colwidth[j];
      totalWidth += hasWidth || cellMinWidth;
      if (!hasWidth) fixedWidth = false;
      const [property, value] = getColStyleDeclaration(cellMinWidth, hasWidth);
      cols.push(["col", {
        style: `${property}: ${value}`
      }]);
    }
  }
  const tableWidth = fixedWidth ? `${totalWidth}px` : "";
  const tableMinWidth = fixedWidth ? "" : `${totalWidth}px`;
  return {
    colgroup: ["colgroup", {}, ...cols],
    tableWidth,
    tableMinWidth
  };
}

export function getTableNodeTypes(schema) {
  if (schema.cached.tableNodeTypes) return schema.cached.tableNodeTypes;
  const roles = {};
  Object.keys(schema.nodes).forEach(type => {
    const nodeType = schema.nodes[type];
    if (nodeType.spec.tableRole) roles[nodeType.spec.tableRole] = nodeType;
  });
  schema.cached.tableNodeTypes = roles;
  return roles;
}

export function escapeTableCellPipes(line) {
  let result = "";
  let i = 0;
  while (i < line.length) {
    if (line[i] === "\\" && i + 1 < line.length) {
      result += line[i] + line[i + 1];
      i += 2;
      continue;
    }
    if (line[i] !== "`") {
      result += line[i++];
      continue;
    }
    let runLen = 0;
    while (i + runLen < line.length && line[i + runLen] === "`") runLen += 1;
    let j = i + runLen;
    let found = false;
    while (j < line.length) {
      if (line[j] !== "`") {
        j += 1;
        continue;
      }
      let closeLen = 0;
      while (j + closeLen < line.length && line[j + closeLen] === "`") closeLen += 1;
      if (closeLen === runLen) {
        const spanContent = line.slice(i + runLen, j);
        result += line.slice(i, i + runLen) + spanContent.replace(/\\\||\|/g, match => match === "|" ? "\\|" : match) + line.slice(j, j + runLen);
        i = j + runLen;
        found = true;
        break;
      }
      j += closeLen;
    }
    if (!found) {
      result += line.slice(i, i + runLen);
      i += runLen;
    }
  }
  return result;
}

export function preprocessTablePipes(src) {
  return src.split("\n").map(line => {
    if (!line.includes("|") || !line.includes("`")) return line;
    return escapeTableCellPipes(line);
  }).join("\n");
}

export function collapseWhitespace(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

export function renderTableToMarkdown(node, helpers, options = {}) {
  var _options$cellLineSepa;
  const cellSep = (_options$cellLineSepa = options.cellLineSeparator) !== null && _options$cellLineSepa !== void 0 ? _options$cellLineSepa : "";
  if (!node || !node.content || node.content.length === 0) return "";
  const rows = [];
  node.content.forEach(rowNode => {
    const cells = [];
    if (rowNode.content) rowNode.content.forEach(cellNode => {
      let raw = "";
      if (cellNode.content && Array.isArray(cellNode.content) && cellNode.content.length > 1) raw = cellNode.content.map(child => helpers.renderChildren(child)).join(cellSep);else raw = cellNode.content ? helpers.renderChildren(cellNode.content) : "";
      const text = collapseWhitespace(raw.split(cellSep).join("\n").replace(/[ \t]*\r?\n[ \t]*/g, "<br>"));
      const isHeader = cellNode.type === "tableHeader";
      const align = normalizeTableCellAlignFromAttributes(cellNode.attrs);
      cells.push({
        text,
        isHeader,
        align
      });
    });
    rows.push(cells);
  });
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  if (columnCount === 0) return "";
  const colWidths = Array.from({
    length: columnCount
  }).fill(0);
  rows.forEach(row => {
    for (let i = 0; i < columnCount; i += 1) {
      var _r$i;
      const len = (((_r$i = row[i]) === null || _r$i === void 0 ? void 0 : _r$i.text) || "").length;
      if (len > colWidths[i]) colWidths[i] = len;
      if (colWidths[i] < 3) colWidths[i] = 3;
    }
  });
  const pad = (text, width) => text + " ".repeat(Math.max(0, width - text.length));
  const headerRow = rows[0];
  const hasHeader = headerRow.some(cell => cell.isHeader);
  const colAlignments = Array.from({
    length: columnCount
  }).fill(null);
  rows.forEach(row => {
    for (let i = 0; i < columnCount; i += 1) {
      var _r$i2;
      if (!colAlignments[i] && ((_r$i2 = row[i]) === null || _r$i2 === void 0 ? void 0 : _r$i2.align)) colAlignments[i] = row[i].align;
    }
  });
  let out = "\n";
  const headerTexts = Array.from({
    length: columnCount
  }).map((_, i) => hasHeader ? headerRow[i] && headerRow[i].text || "" : "");
  out += `| ${headerTexts.map((headerText, i) => pad(headerText, colWidths[i])).join(" | ")} |
`;
  out += `| ${colWidths.map((colWidth, index) => {
    const dashCount = Math.max(3, colWidth);
    const alignment = colAlignments[index];
    if (alignment === "left") return `:${"-".repeat(dashCount)}`;
    if (alignment === "right") return `${"-".repeat(dashCount)}:`;
    if (alignment === "center") return `:${"-".repeat(dashCount)}:`;
    return "-".repeat(dashCount);
  }).join(" | ")} |
`;
  (hasHeader ? rows.slice(1) : rows).forEach(row => {
    out += `| ${Array.from({
      length: columnCount
    }).fill(0).map((_, i) => pad(row[i] && row[i].text || "", colWidths[i])).join(" | ")} |
`;
  });
  return out;
}
