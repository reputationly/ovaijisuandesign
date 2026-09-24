import { randomBytes } from "node:crypto";

/**
 * 表格节点的 `.htable` 文档（`.hilo/tables/<id>.htable`，JSON）。渲染层按 id 引用列，
 * agent 给的是"按下标"的列 / 行，这里负责分配 id 并把单元格挂到列 id 上。
 */

export const TABLE_FIELD_TYPES = ["text", "number", "attachment"] as const;
export const TABLE_ROW_HEIGHTS = ["low", "medium", "tall", "extraTall"] as const;
export const FILTER_MATCH_MODES = ["all", "any"] as const;
export const FILTER_OPS = ["equals", "notEquals", "contains", "notContains", "gt", "gte", "lt", "lte", "empty", "notEmpty"] as const;

export type TableFieldType = (typeof TABLE_FIELD_TYPES)[number];
export type TableRowHeight = (typeof TABLE_ROW_HEIGHTS)[number];

export const TABLE_DOCUMENT_VERSION = 1;

export interface TableInput {
  columns?: { title: string; type?: TableFieldType; visible?: boolean; width?: number }[];
  rows?: { cells: unknown[] }[];
  filter?: { match: (typeof FILTER_MATCH_MODES)[number]; conditions: { columnIndex: number; op: (typeof FILTER_OPS)[number]; value?: unknown }[] };
  rowHeight?: TableRowHeight;
}

export interface TableColumn {
  id: string;
  title: string;
  type: TableFieldType;
  visible?: boolean;
  width?: number;
}

export interface TableDocument {
  version: number;
  columns: TableColumn[];
  rows: { id: string; cells: Record<string, unknown> }[];
  filter?: { match: string; conditions: { id: string; columnId: string; op: string; value?: unknown }[] };
  rowHeight?: TableRowHeight;
}

function shortId(): string {
  return randomBytes(4).toString("hex");
}

/** `.hilo/tables/` 下的新文件路径。文件读写接口只放行 `[A-Za-z0-9_-]+.htable` 这种名字。 */
export function newTablePath(): string {
  return `.hilo/tables/${randomBytes(6).toString("hex")}.htable`;
}

/** 右键"新建表格"的默认内容：一列文本，没有行。 */
export function emptyTableDocument(): TableDocument {
  return { version: TABLE_DOCUMENT_VERSION, columns: [{ id: `col_${shortId()}`, title: "Text", type: "text", visible: true, width: 200 }], rows: [] };
}

export function buildTableDocument(input: TableInput): TableDocument {
  const inCols = input.columns ?? [];
  if (inCols.length === 0) return emptyTableDocument();
  const columns: TableColumn[] = inCols.map((c) => ({
    id: `col_${shortId()}`,
    title: c.title,
    type: c.type ?? "text",
    ...(c.width != null ? { width: c.width } : {}),
    ...(c.visible === false ? { visible: false } : {}),
  }));
  const rows = (input.rows ?? []).map((r) => {
    const cells: Record<string, unknown> = {};
    const values = Array.isArray(r.cells) ? r.cells : [];
    columns.forEach((col, i) => {
      const v = values[i];
      if (v === undefined || v === null) return;
      // 数组只对附件列有意义；别的列收到数组多半是 agent 串了列，丢掉比显示 "[object]" 强。
      if (Array.isArray(v) && col.type !== "attachment") return;
      cells[col.id] = v;
    });
    return { id: `row_${shortId()}`, cells };
  });
  const doc: TableDocument = { version: TABLE_DOCUMENT_VERSION, columns, rows };
  const conditions = (input.filter?.conditions ?? [])
    .map((c) => {
      const col = columns[c.columnIndex];
      return col ? { id: `cond_${shortId()}`, columnId: col.id, op: c.op, value: c.value } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
  if (input.filter && conditions.length) doc.filter = { match: input.filter.match, conditions };
  if (input.rowHeight) doc.rowHeight = input.rowHeight;
  return doc;
}

export function serializeTableDocument(doc: TableDocument): string {
  return JSON.stringify(doc, null, 2);
}
