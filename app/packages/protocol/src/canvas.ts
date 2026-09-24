import { z } from "zod";

/**
 * 画布文件 `.hilo/canvas.json` 的结构。
 *
 * **每一层都 passthrough**：zod 默认的 `object` 解析时会丢掉不认识的字段，
 * 我们保留。理由是往返不丢数据 —— 渲染层往节点上挂的临时字段（比如编辑中的
 * 草稿）以前就是这样被一次保存悄悄抹掉的。
 */
export const sizeSchema = z.object({ width: z.number(), height: z.number() }).passthrough();
export const positionSchema = z.object({ x: z.number(), y: z.number() }).passthrough();

export const canvasNodeSchema = z
  .object({
    id: z.string().min(1),
    type: z.string(),
    positions: z.record(positionSchema),
    size: sizeSchema.optional(),
    sizes: z.record(sizeSchema).optional(),
    assetId: z.string().optional(),
    groupId: z.string().optional(),
    round: z.number().optional(),
    parentId: z.string().optional(),
    isEmpty: z.boolean().optional(),
    data: z.record(z.unknown()).optional(),
    meta: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const canvasEdgeSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1),
    sourceHandle: z.string().optional(),
    target: z.string().min(1),
    targetHandle: z.string().optional(),
    type: z.string(),
    data: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const canvasFileSchema = z
  .object({
    version: z.number(),
    mode: z.string(),
    nodes: z.array(canvasNodeSchema),
    edges: z.array(canvasEdgeSchema),
    hiddenAssetIds: z.array(z.string()).optional(),
  })
  .passthrough();

// 类型单独声明，不用 z.infer：passthrough 推出来的类型带索引签名，坐标和尺寸会和
// 普通的 `{x, y}` / `{width, height}` 接口互不兼容。运行时校验仍以上面的 schema 为准。
export interface CanvasPoint {
  x: number;
  y: number;
}
export interface CanvasSize {
  width: number;
  height: number;
}
export interface CanvasNode {
  id: string;
  type: string;
  positions: Record<string, CanvasPoint>;
  size?: CanvasSize;
  sizes?: Record<string, CanvasSize>;
  assetId?: string;
  groupId?: string;
  round?: number;
  parentId?: string;
  isEmpty?: boolean;
  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  [extra: string]: unknown;
}
export interface CanvasEdge {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
  type: string;
  data?: Record<string, unknown>;
  [extra: string]: unknown;
}
export interface CanvasFile {
  version: number;
  mode: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  hiddenAssetIds?: string[];
  [extra: string]: unknown;
}

/** 校验并返回画布。不合法时抛 ZodError。 */
export function parseCanvasFile(v: unknown): CanvasFile {
  return canvasFileSchema.parse(v) as CanvasFile;
}

/** 节点类型。 */
export const CANVAS_NODE_TYPES = [
  "audio",
  "file",
  "group",
  "image",
  "placeholder",
  "sticker",
  "table",
  "text",
  "video",
] as const;
export type CanvasNodeType = (typeof CANVAS_NODE_TYPES)[number];

export const CANVAS_VERSION = 1;

export const CanvasMode = { Freeform: "freeform", Workflow: "workflow" } as const;
export type CanvasMode = (typeof CanvasMode)[keyof typeof CanvasMode];

/** 新建画布：默认 workflow 模式。 */
export function emptyCanvas(mode: CanvasMode = CanvasMode.Workflow): CanvasFile {
  return { version: CANVAS_VERSION, mode, nodes: [], edges: [] };
}

/**
 * `canvas:updated` 事件的增量形状。
 * `origin` 让渲染层区分"自己刚做的"和"别人做的"，避免回显自己的操作。
 */
export interface CanvasUpdated {
  type: "canvas_updated";
  addedNodes?: CanvasNode[];
  addedEdges?: CanvasEdge[];
  updatedNodes?: CanvasNode[];
  removedNodeIds?: string[];
  removedEdgeIds?: string[];
  nodeIdReplacements?: Record<string, string>;
  origin: "generation-status" | "mcp-write" | "reconcile" | "user-add" | (string & {});
}
