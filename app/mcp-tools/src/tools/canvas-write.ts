import { z } from "zod";

import type { GatewayClient } from "../gateway-client.js";
import {
  fetchNodeDetails,
  ImportUrlResponseSchema,
  TableFilterOps,
  TableRowHeights,
  WriteMediaNodeResponseSchema,
  WriteTableNodeResponseSchema,
  writeTextNode,
  type TableContent,
  type WriteTextNodeBody,
  type WriteTextNodeResponse,
} from "./canvas-api.js";
import { looksLikeStagePlan, splitTextForChunkedWrites } from "./canvas-text.js";
import { checkAgentText } from "./safety.js";

/**
 * canvas_write_node 的三条分支（text / table / media）和 items[] 批量。
 */

export const CANVAS_WRITE_KINDS = ["text", "table", "media"] as const;
export const UPDATE_TEXT_MODES = ["replace", "append", "prepend"] as const;
type TextMode = (typeof UPDATE_TEXT_MODES)[number];

// ── 入参 schema（单写与 items[] 共用字段） ──

export const TableColumnInputSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["text", "number", "attachment"]).optional().describe('Column field type (default "text").'),
  visible: z.boolean().optional(),
  width: z.number().int().min(40).max(2000).optional(),
});

const TableAttachmentInputSchema = z.object({
  assetId: z.string(),
  name: z.string(),
  kind: z.enum(["image", "video", "audio", "text"]),
});

export const TableRowInputSchema = z.object({
  cells: z
    .array(z.union([z.string(), z.number(), z.array(TableAttachmentInputSchema), z.null()]))
    .describe(
      "Cells positionally aligned with `columns`. Strings / numbers / null for normal columns; for attachment columns pass an array of {assetId,name,kind}. Trailing nulls may be omitted.",
    ),
});

export const TableFilterInputSchema = z.object({
  match: z.enum(["all", "any"]),
  conditions: z.array(
    z.object({
      columnIndex: z.number().int().min(0),
      op: z.enum(TableFilterOps),
      value: z.union([z.string(), z.number()]).optional(),
    }),
  ),
});

export const CanvasWriteItemSchema = z.object({
  kind: z.enum(CANVAS_WRITE_KINDS).describe("Node kind to write: text | table | media."),
  content: z.string().optional().describe("[text] Markdown content. Required for kind=text."),
  nodeId: z.string().optional().describe("[text/table] Existing node to patch/replace. Omit to create a new node."),
  name: z.string().optional().describe("[text create] File name without extension."),
  title: z.string().optional().describe("[table] Optional cached preview title."),
  columns: z.array(TableColumnInputSchema).optional().describe("[table] Table columns."),
  rows: z.array(TableRowInputSchema).optional().describe("[table] Table rows."),
  filter: TableFilterInputSchema.optional().describe("[table] Optional table filter."),
  rowHeight: z.enum(TableRowHeights).optional().describe("[table] Row-height preset."),
  assetPath: z.string().optional().describe("[media] Workspace-relative tracked media path or direct http(s) media URL."),
  sourceNodeId: z.string().optional().describe("[create/media] Source node id for one derivation edge."),
  sourceNodeIds: z.array(z.string()).optional().describe("[create] Source node ids for derivation edges."),
  mode: z
    .enum(UPDATE_TEXT_MODES)
    .optional()
    .describe("[text patch only] replace | append | prepend. Requires `nodeId`; omit for create."),
  expectedContentHash: z
    .string()
    .optional()
    .describe(
      "[text patch only] CAS token: contentHash from your latest canvas_get_node / canvas_grep_text / canvas_read_text. The patch is rejected (409) when the document changed since that read.",
    ),
  allowDuplicate: z.boolean().optional().describe("[media] Force a second card for the same file. Default false."),
});
export type CanvasWriteItem = z.infer<typeof CanvasWriteItemSchema>;

export interface CanvasWriteResult {
  kind?: (typeof CANVAS_WRITE_KINDS)[number];
  ok: boolean;
  error?: string;
  nodeId?: string;
  assetId?: string;
  contentLength?: number;
  path?: string;
  tablePath?: string;
  columnCount?: number;
  rowCount?: number;
  assetType?: "image" | "video" | "audio";
  assetPath?: string;
  created?: boolean;
  reused?: boolean;
  wrapped?: boolean;
  warnings?: string[];
}

// ── 文本分块写入 ──

interface TextWriteArgs {
  content: string;
  nodeId?: string;
  name?: string;
  sourceNodeIds?: string[];
  mode?: TextMode;
  expectedContentHash?: string;
}

/**
 * 超过块长的文本拆开顺序写：
 * - 新建：第一块建节点，其余 append 无分隔；返回首块结果但 contentLength 取最终值。
 * - prepend：从最后一块往前逐块 prepend，只有第一次（最后一块）带 CAS 令牌。
 * - replace / append：首块按原 mode 带 CAS，其余 append 无分隔。
 * 除单块以外都 `review: "suppress"`，免得每块都弹一次审阅。
 */
export async function writeTextNodeChunked(gw: GatewayClient, args: TextWriteArgs): Promise<WriteTextNodeResponse> {
  const chunks = splitTextForChunkedWrites(args.content);
  if (chunks.length === 1) {
    return writeTextNode(gw, {
      content: args.content,
      nodeId: args.nodeId,
      name: args.name,
      sourceNodeIds: args.sourceNodeIds,
      mode: args.mode,
      expectedContentHash: args.expectedContentHash,
    });
  }
  const continueBody = (content: string, nodeId: string): WriteTextNodeBody => ({
    content,
    nodeId,
    mode: "append",
    appendSeparator: "none",
    review: "suppress",
  });

  if (!args.nodeId) {
    const first = await writeTextNode(gw, {
      content: chunks[0] as string,
      name: args.name,
      sourceNodeIds: args.sourceNodeIds,
    });
    let latest = first;
    for (const chunk of chunks.slice(1)) latest = await writeTextNode(gw, continueBody(chunk, first.nodeId));
    return { ...first, contentLength: latest.contentLength };
  }

  const nodeId = args.nodeId;
  const mode = args.mode ?? "replace";
  if (mode === "prepend") {
    let latest: WriteTextNodeResponse | undefined;
    for (let i = chunks.length - 1; i >= 0; i--) {
      latest = await writeTextNode(gw, {
        content: chunks[i] as string,
        nodeId,
        mode: "prepend",
        review: "suppress",
        ...(i === chunks.length - 1 ? { expectedContentHash: args.expectedContentHash } : { appendSeparator: "none" }),
      });
    }
    if (!latest) throw new Error("No content chunks produced");
    return latest;
  }

  let latest = await writeTextNode(gw, {
    content: chunks[0] as string,
    nodeId,
    mode,
    review: "suppress",
    expectedContentHash: args.expectedContentHash,
  });
  for (const chunk of chunks.slice(1)) latest = await writeTextNode(gw, continueBody(chunk, nodeId));
  return latest;
}

// ── 嵌套 JSON 解包 ──
// 模型偶尔把整组参数 JSON 化后塞进 content（`{"content": "...", "name": ...}`）。
// 只有 content 是对象且键全是已知写入字段时才解包，普通 JSON 文档原样写入。

const TEXT_NODE_KNOWN_KEYS = new Set(["content", "nodeId", "name", "position", "sourceNodeIds", "mode"]);

export function unwrapNestedTextArgs(args: TextWriteArgs): { args: TextWriteArgs; wrapped: boolean } {
  const trimmed = args.content.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return { args, wrapped: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { args, wrapped: false };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { args, wrapped: false };
  const inner = parsed as Record<string, unknown>;
  if (typeof inner.content !== "string") return { args, wrapped: false };
  if (Object.keys(inner).some((k) => !TEXT_NODE_KNOWN_KEYS.has(k))) return { args, wrapped: false };
  const innerIds =
    Array.isArray(inner.sourceNodeIds) && inner.sourceNodeIds.every((x) => typeof x === "string")
      ? (inner.sourceNodeIds as string[])
      : undefined;
  const innerMode =
    typeof inner.mode === "string" && (UPDATE_TEXT_MODES as readonly string[]).includes(inner.mode)
      ? (inner.mode as TextMode)
      : undefined;
  return {
    wrapped: true,
    args: {
      content: inner.content,
      nodeId: args.nodeId ?? (typeof inner.nodeId === "string" ? inner.nodeId : undefined),
      name: args.name ?? (typeof inner.name === "string" ? inner.name : undefined),
      sourceNodeIds: args.sourceNodeIds ?? innerIds,
      mode: args.mode ?? innerMode,
      expectedContentHash: args.expectedContentHash,
    },
  };
}

// ── 分支 ──

const sourceIdsOf = (item: CanvasWriteItem) => item.sourceNodeIds ?? (item.sourceNodeId ? [item.sourceNodeId] : undefined);

/** patch 时按合并后的全文判断 / 送检，避免分段绕过 Stage Plan 拦截与安全检查。 */
async function mergedContentForPatch(gw: GatewayClient, nodeId: string, mode: TextMode, content: string): Promise<string> {
  if (mode === "replace") return content;
  const detail = await fetchNodeDetails(gw, [nodeId]);
  const original = detail.nodes[0]?.textContent ?? "";
  return mode === "append" ? `${original}${content}` : `${content}${original}`;
}

async function validateTextBeforeWrite(gw: GatewayClient, args: TextWriteArgs): Promise<void> {
  const content = args.nodeId ? await mergedContentForPatch(gw, args.nodeId, args.mode ?? "replace", args.content) : args.content;
  if (looksLikeStagePlan(content)) {
    throw new Error(
      "Stage Execution Plan content must be written through plan_write (create / full restructure) or plan_patch_stage (incremental stage edits), not canvas_write_node. These tools validate the whole plan before writing.",
    );
  }
  await checkAgentText(gw, args.nodeId ? [content] : [args.name ?? "", content]);
}

async function writeTextItem(gw: GatewayClient, item: CanvasWriteItem): Promise<CanvasWriteResult> {
  if (item.content === undefined) return { kind: "text", ok: false, error: "content is required for kind=text." };
  if (!item.nodeId && item.mode) {
    return {
      kind: "text",
      ok: false,
      error: "`mode` is only valid when patching an existing text node. Provide `nodeId`, or omit `mode` to create a new text node.",
    };
  }
  if (!item.nodeId && !item.name?.trim()) {
    return { kind: "text", ok: false, error: "Text node name contract violation: create mode requires a name." };
  }
  const { args, wrapped } = unwrapNestedTextArgs({
    content: item.content,
    nodeId: item.nodeId,
    name: item.name,
    sourceNodeIds: sourceIdsOf(item),
    mode: item.mode,
    expectedContentHash: item.expectedContentHash,
  });
  await validateTextBeforeWrite(gw, args);
  const result = await writeTextNodeChunked(gw, args);
  return {
    kind: "text",
    ok: true,
    nodeId: result.nodeId,
    assetId: result.assetId,
    contentLength: result.contentLength,
    created: result.created,
    ...(result.path ? { path: result.path } : {}),
    ...(wrapped
      ? {
          wrapped: true,
          warnings: ['Detected and unwrapped a nested {"content": ...} JSON layer. Next time, pass plain markdown directly in `content`.'],
        }
      : {}),
  };
}

function collectTableTexts(input: { title?: string; columns?: { title?: string }[]; rows?: { cells?: unknown[] }[] }): string[] {
  const out: string[] = [];
  if (input.title) out.push(input.title);
  for (const col of input.columns ?? []) if (typeof col?.title === "string" && col.title) out.push(col.title);
  for (const row of input.rows ?? []) {
    for (const cell of Array.isArray(row?.cells) ? row.cells : []) if (typeof cell === "string" && cell) out.push(cell);
  }
  return out;
}

async function writeTableItem(gw: GatewayClient, item: CanvasWriteItem): Promise<CanvasWriteResult> {
  let texts = collectTableTexts({ title: item.title, columns: item.columns, rows: item.rows });
  if (item.nodeId) {
    const detail = await fetchNodeDetails(gw, [item.nodeId]);
    const original: TableContent | undefined = detail.nodes[0]?.tableContent;
    if (original) texts = [...texts, ...collectTableTexts(original)];
  }
  await checkAgentText(gw, texts);
  const result = await gw.post(
    "/api/canvas/table-node",
    {
      nodeId: item.nodeId,
      title: item.title,
      columns: item.columns,
      rows: item.rows,
      filter: item.filter,
      rowHeight: item.rowHeight,
      sourceNodeIds: sourceIdsOf(item),
    },
    15_000,
    WriteTableNodeResponseSchema,
  );
  return {
    kind: "table",
    ok: true,
    nodeId: result.nodeId,
    tablePath: result.tablePath,
    columnCount: result.columnCount,
    rowCount: result.rowCount,
    created: result.created,
  };
}

/** 直链先让 gateway 下载进工作区并入库，拿到工作区路径再建卡片。 */
async function resolveAssetPath(gw: GatewayClient, assetPath: string): Promise<string> {
  if (!/^https?:\/\//i.test(assetPath)) return assetPath;
  const resp = await gw.post("/api/files/import-url", { urls: [assetPath] }, 180_000, ImportUrlResponseSchema);
  const ok = resp.imported[0];
  if (ok) return ok.path;
  throw new Error(`Failed to import URL ${assetPath}: ${resp.errors?.[0]?.error ?? "unknown import-url failure"}`);
}

async function writeMediaItem(gw: GatewayClient, item: CanvasWriteItem): Promise<CanvasWriteResult> {
  if (!item.assetPath) return { kind: "media", ok: false, error: "assetPath is required for kind=media." };
  const assetPath = await resolveAssetPath(gw, item.assetPath);
  const result = await gw.post(
    "/api/canvas/media-node",
    { assetPath, sourceNodeIds: sourceIdsOf(item), allowDuplicate: item.allowDuplicate },
    10_000,
    WriteMediaNodeResponseSchema,
  );
  return {
    kind: "media",
    ok: true,
    nodeId: result.nodeId,
    assetId: result.assetId,
    assetType: result.assetType,
    assetPath,
    reused: result.reused,
  };
}

export function writeCanvasItem(gw: GatewayClient, item: CanvasWriteItem): Promise<CanvasWriteResult> {
  switch (item.kind) {
    case "text":
      return writeTextItem(gw, item);
    case "table":
      return writeTableItem(gw, item);
    case "media":
      return writeMediaItem(gw, item);
  }
}
