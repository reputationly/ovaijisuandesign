import { z } from "zod";

import type { GatewayClient } from "../gateway-client.js";

/**
 * 画布相关的 gateway 路由、响应 schema 和节点详情缓存。
 * zod 会剥掉未声明的键 —— 要给 agent 看的字段必须写进 schema。
 */

export const CANVAS_NODE_TYPES = ["image", "video", "audio", "text", "file", "placeholder", "table", "group", "sticker"] as const;
export const NODE_DETAIL_CHILD_IDS_LIMIT = 50;

export const CanvasNodeSummarySchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string().optional(),
  label: z.string().optional(),
  promptSnippet: z.string().optional(),
  pluginId: z.string().optional(),
  currentWorkflowId: z.string().optional(),
  currentWorkflowName: z.string().optional(),
  sourceTemplateId: z.string().optional(),
  sourceTemplateName: z.string().optional(),
  hasWorkflowContent: z.boolean().optional(),
});

export const CanvasNodeListResponseSchema = z.object({
  count: z.number(),
  nodes: z.array(CanvasNodeSummarySchema),
});

export const TableAttachmentSchema = z.object({
  assetId: z.string(),
  name: z.string(),
  kind: z.enum(["image", "video", "audio", "text", "file"]),
});
export const TableCellValueSchema = z.union([z.string(), z.number(), z.array(TableAttachmentSchema), z.null()]);
export const TableFilterOps = ["equals", "notEquals", "contains", "notContains", "gt", "gte", "lt", "lte", "empty", "notEmpty"] as const;
export const TableRowHeights = ["low", "medium", "tall", "extraTall"] as const;

export const TableContentSchema = z.object({
  columns: z.array(
    z.object({
      title: z.string(),
      type: z.enum(["text", "number", "attachment"]).optional(),
      visible: z.boolean().optional(),
      width: z.number().optional(),
    }),
  ),
  rows: z.array(z.object({ cells: z.array(TableCellValueSchema) })),
  filter: z
    .object({
      match: z.enum(["all", "any"]),
      conditions: z.array(
        z.object({
          columnIndex: z.number(),
          op: z.enum(TableFilterOps),
          value: z.union([z.string(), z.number()]).optional(),
        }),
      ),
    })
    .optional(),
  rowHeight: z.enum(TableRowHeights).optional(),
});
export type TableContent = z.infer<typeof TableContentSchema>;

export const EdgeSummarySchema = z.object({
  source: z.string().describe("Source canvas node ID"),
  target: z.string().describe("Target canvas node ID"),
  type: z.string().describe("Edge type (e.g. \"derivation\")"),
});

/** 资产元数据白名单；其余键透传（gateway 已剥掉内部字段）。 */
export const AssetMetadataSchema = z.object({
  model: z.string().optional().describe("Generator model identifier"),
  model_id: z.string().optional().describe("Alternate generator model identifier"),
  description: z.string().optional().describe("Cached multimodal-AI description (populated by media `read`)"),
  voice_id: z.string().optional().describe("TTS voice identifier (audio assets)"),
  width: z.number().optional().describe("Intrinsic width in pixels"),
  height: z.number().optional().describe("Intrinsic height in pixels"),
  duration_ms: z.number().optional().describe("Duration in milliseconds (audio / video)"),
  fps: z.number().optional().describe("Frames per second (video)"),
  reference_images: z.array(z.string()).optional().describe("Asset ids of reference images used at generation time"),
  reference_audios: z.array(z.string()).optional().describe("Asset ids of reference audios used at generation time"),
  reference_videos: z.array(z.string()).optional().describe("Asset ids of reference videos used at generation time"),
  error_message: z.string().optional().describe("Failure reason for failed generations")
}).passthrough();

export const CanvasNodeDetailSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string().optional(),
  pluginId: z.string().optional(),
  currentWorkflowId: z.string().optional(),
  currentWorkflowName: z.string().optional(),
  sourceTemplateId: z.string().optional(),
  sourceTemplateName: z.string().optional(),
  hasWorkflowContent: z.boolean().optional(),
  prompt: z.string().optional(),
  metadata: AssetMetadataSchema.optional(),
  filePath: z.string().optional(),
  textContent: z.string().optional(),
  textContentHash: z.string().optional(),
  tableContent: TableContentSchema.optional(),
  incomingEdges: z.array(EdgeSummarySchema).optional(),
  outgoingEdges: z.array(EdgeSummarySchema).optional(),
  childIds: z.array(z.string()).optional(),
  childIdsTotal: z.number().optional(),
});
export type CanvasNodeDetail = z.infer<typeof CanvasNodeDetailSchema>;

export const CanvasNodeDetailsResponseSchema = z.object({
  nodes: z.array(CanvasNodeDetailSchema),
  missing: z.array(z.string()).optional(),
});
export type CanvasNodeDetails = z.infer<typeof CanvasNodeDetailsResponseSchema>;

export const ApplyTextEditsResponseSchema = z.object({
  requestId: z.string(),
  editSessionId: z.string().optional(),
  nodeId: z.string(),
  status: z.enum(["applied", "conflict"]),
  origin: z.enum(["annotation", "agent"]).optional(),
  previousContentHash: z.string(),
  contentHash: z.string(),
  results: z.array(
    z.object({
      annotationId: z.string(),
      targetIndex: z.number().optional(),
      status: z.enum(["applied", "conflict"]),
      reason: z.enum(["not_found", "ambiguous", "overlap", "duplicate_id", "version_changed"]).optional(),
      nearest: z
        .array(
          z.object({
            line: z.number(),
            occurrence: z.number().optional(),
            sourceExact: z.string().optional(),
            snippet: z.string(),
          }),
        )
        .optional(),
    }),
  ),
  appliedEdits: z
    .array(
      z.object({
        annotationId: z.string(),
        targetIndex: z.number().optional(),
        originalText: z.string(),
        replacement: z.string(),
        newStart: z.number(),
        newEnd: z.number(),
        startLine: z.number(),
        reversePrefix: z.string(),
        reverseSuffix: z.string(),
        reverseOccurrence: z.number().optional(),
      }),
    )
    .optional(),
});

export const WriteTextNodeResponseSchema = z.object({
  nodeId: z.string(),
  assetId: z.string(),
  contentLength: z.number(),
  created: z.boolean(),
  path: z.string().optional(),
});
export type WriteTextNodeResponse = z.infer<typeof WriteTextNodeResponseSchema>;

export const WriteTableNodeResponseSchema = z.object({
  nodeId: z.string(),
  tablePath: z.string(),
  columnCount: z.number(),
  rowCount: z.number(),
  created: z.boolean(),
});

export const WriteMediaNodeResponseSchema = z.object({
  nodeId: z.string(),
  assetId: z.string(),
  assetType: z.enum(["image", "video", "audio"]),
  reused: z.boolean(),
});

export const ImportUrlResponseSchema = z.object({
  ok: z.literal(true),
  imported: z.array(
    z.object({
      url: z.string(),
      id: z.string(),
      path: z.string(),
      type: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
      durationMs: z.number().optional(),
    }),
  ),
  errors: z.array(z.object({ url: z.string(), error: z.string() })).optional(),
});

const CanvasFileNodeSchema = z.object({ id: z.string(), type: z.string(), parentId: z.string().optional() }).passthrough();

export const SkippedNodeEntrySchema = z.object({
  nodeId: z.string(),
  reason: z.enum(["unknown", "already-grouped"]),
  parentId: z.string().optional(),
});

export const GroupNodesResponseSchema = z.object({
  groupId: z.string().nullable(),
  addedNodes: z.array(CanvasFileNodeSchema),
  removedNodeIds: z.array(z.string()),
  updatedNodes: z.array(CanvasFileNodeSchema),
  skippedNodes: z.array(SkippedNodeEntrySchema).optional(),
});

export const GroupRecentOutputsResponseSchema = z.object({
  groupId: z.string().nullable(),
  groupedCount: z.number(),
  label: z.string().optional(),
  reason: z.enum(["insufficient-candidates", "no-op", "no-session-scope"]).optional(),
});

export const UngroupResponseSchema = z.object({
  removed: z.boolean(),
  removedNodeIds: z.array(z.string()),
  updatedNodes: z.array(CanvasFileNodeSchema),
});

// ── 详情缓存 ──
// agent 常在同一轮里对同一节点连续 get / grep / read；3 秒 TTL 足以合并这些请求，
// 又短到不会让用户在编辑器里的改动被长时间遮住。任何写操作都清空。

const TTL_MS = 3_000;
const MAX_KEYS = 64;
const detailCache = new Map<string, { value: CanvasNodeDetails; expiresAt: number }>();

export function detailCacheKey(ids: string[]): string {
  return [...new Set(ids)].sort().join(",");
}

export function getCachedDetails(key: string): CanvasNodeDetails | undefined {
  const entry = detailCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    detailCache.delete(key);
    return undefined;
  }
  return entry.value;
}

export function setCachedDetails(key: string, value: CanvasNodeDetails): void {
  if (detailCache.size >= MAX_KEYS) {
    const oldest = detailCache.keys().next().value;
    if (oldest !== undefined) detailCache.delete(oldest);
  }
  detailCache.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

export function invalidateCanvasDetailCache(): void {
  detailCache.clear();
}

// ── 路由 ──

export function fetchNodeDetails(gw: GatewayClient, nodeIds: string[]): Promise<CanvasNodeDetails> {
  return gw.post("/api/canvas/nodes/detail", { nodeIds }, 15_000, CanvasNodeDetailsResponseSchema);
}

export interface WriteTextNodeBody {
  content: string;
  nodeId?: string;
  name?: string;
  sourceNodeIds?: string[];
  mode?: "replace" | "append" | "prepend";
  expectedContentHash?: string;
  /** 分块续写时不插分隔符，保证拼回原文。 */
  appendSeparator?: "none";
  /** 分块写入不逐块弹审阅。 */
  review?: "suppress";
}

export function writeTextNode(gw: GatewayClient, body: WriteTextNodeBody): Promise<WriteTextNodeResponse> {
  return gw.post("/api/canvas/text-node", body, 15_000, WriteTextNodeResponseSchema);
}
