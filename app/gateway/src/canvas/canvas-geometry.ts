import type { CanvasFile, CanvasNode } from "@ov/protocol";

export interface Size {
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}
export interface Rect extends Point, Size {}

export const DEFAULT_WIDTH = 350;
/** 分组框的内边距：左右 24，顶部 48（留给标题），底部 24。 */
export const GROUP_PADDING = { x: 24, top: 48, bottom: 24 } as const;
const GAP = 100;

export function defaultNodeSize(type: string, data?: Record<string, unknown>): Size {
  switch (type) {
    case "image":
      return { width: 350, height: 350 };
    case "text":
      return { width: 350, height: 500 };
    case "table":
      return { width: 350, height: 200 };
    case "file":
      return data?.viewMode === "preview" ? { width: 820, height: 480 } : { width: 350, height: 76 };
    case "audio":
      return { width: 350, height: 150 };
    case "video":
      return { width: 350, height: 280 };
    case "sticker":
      return { width: 56, height: 56 };
    default:
      return { width: 350, height: 350 };
  }
}

/** 按素材宽高把长边缩到 350，每边至少 100。宽高缺失回 undefined（交给默认尺寸）。 */
export function computeNodeSize(w?: number | null, h?: number | null): Size | undefined {
  if (!w || !h || w <= 0 || h <= 0) return undefined;
  const scale = Math.min(DEFAULT_WIDTH / w, DEFAULT_WIDTH / h);
  return { width: Math.max(100, Math.round(w * scale)), height: Math.max(100, Math.round(h * scale)) };
}

const RATIO_RE = /^(\d+(?:\.\d+)?)\s*[:x/]\s*(\d+(?:\.\d+)?)$/;

export function parseRatio(r?: string | null): [number, number] | undefined {
  const m = r ? RATIO_RE.exec(r.trim()) : null;
  if (!m) return undefined;
  const w = Number(m[1]);
  const h = Number(m[2]);
  return w > 0 && h > 0 ? [w, h] : undefined;
}

/** 占位卡的尺寸：生成中按目标比例，出错时是固定高度的错误卡。 */
export function placeholderNodeSize(status?: string, ratio?: string, mediaType?: string): Size {
  const errorish = status === "error" || status === "recoverable_error" || status === "status_unknown";
  if (!errorish) {
    if (mediaType === "audio") return { width: 350, height: 150 };
    const r = parseRatio(ratio);
    if (r) return computeNodeSize(r[0], r[1])!;
    if (mediaType === "image" || mediaType === "video" || !mediaType) return { width: 350, height: 350 };
  }
  const height = status === "pending" || status === "queue_paused" ? 188 : errorish ? 216 : 248;
  return { width: 350, height };
}

export function effectiveSize(node: CanvasNode, mode: string): Size {
  if (node.type === "placeholder") {
    const d = (node.data ?? {}) as Record<string, string | undefined>;
    return placeholderNodeSize(d.status, d.aspectRatio, d.mediaType);
  }
  return (node.sizes?.[mode] as Size | undefined) ?? (node.size as Size | undefined) ?? defaultNodeSize(node.type, node.data);
}

export function positionOf(node: CanvasNode, mode: string): Point | undefined {
  const p = node.positions?.[mode];
  return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: p.x, y: p.y } : undefined;
}

/** 绝对坐标：子节点的 position 相对父节点，沿父链累加。 */
export function absolutePosition(canvas: CanvasFile, node: CanvasNode, mode: string): Point | undefined {
  const byId = new Map(canvas.nodes.map((n) => [n.id, n]));
  let p = positionOf(node, mode);
  if (!p) return undefined;
  const seen = new Set([node.id]);
  let parentId = node.parentId;
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    const pp = parent && positionOf(parent, mode);
    if (!parent || !pp) break;
    p = { x: p.x + pp.x, y: p.y + pp.y };
    parentId = parent.parentId;
  }
  return p;
}

function topLevelRects(canvas: CanvasFile, mode: string): Rect[] {
  const out: Rect[] = [];
  for (const n of canvas.nodes) {
    if (n.parentId) continue;
    const p = positionOf(n, mode);
    if (p) out.push({ ...p, ...effectiveSize(n, mode) });
  }
  return out;
}

function overlaps(a: Rect, b: Rect, margin = 5): boolean {
  return a.x < b.x + b.width + margin && a.x + a.width + margin > b.x && a.y < b.y + b.height + margin && a.y + a.height + margin > b.y;
}

/**
 * 画布上的空位：没有来源节点时新节点放哪。按行排，接在最后一行末尾右边；
 * 一行满 8 个或太宽就换行。空画布放在原点。
 */
export function findFreePosition(canvas: CanvasFile, mode: string, size: Size = { width: 350, height: 500 }): Point {
  const rects = topLevelRects(canvas, mode);
  if (rects.length === 0) return { x: 0, y: 0 };
  const rows: Rect[][] = [];
  for (const r of [...rects].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const row = rows.find((rw) => Math.abs(rw[0]!.y - r.y) <= 10);
    if (row) row.push(r);
    else rows.push([r]);
  }
  for (const row of rows) row.sort((a, b) => a.x - b.x);
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  const rowHeight = (row: Rect[]) => Math.max(...row.map((r) => r.height));
  const rowLimit = size.width * 8 + 700;
  let cand: Point;
  const tail = last[last.length - 1]!;
  if (last.length >= 8 || tail.x + tail.width + GAP + size.width - first[0]!.x > rowLimit) {
    cand = { x: first[0]!.x, y: last[0]!.y + rowHeight(last) + GAP };
  } else {
    cand = { x: tail.x + tail.width + GAP, y: last[0]!.y };
  }
  for (let i = 0; i < 50; i++) {
    const box = { ...cand, ...size };
    const hit = rects.find((r) => overlaps(box, r));
    if (!hit) return cand;
    if (hit.x + hit.width + GAP + size.width - first[0]!.x > rowLimit) {
      cand = { x: first[0]!.x, y: hit.y + hit.height + GAP };
    } else {
      cand = { x: hit.x + hit.width + GAP, y: cand.y };
    }
  }
  return cand;
}

/**
 * 派生节点放在来源右边：没有兄弟时和来源顶端对齐，挡住了就往下挪（累计 1200 还不行
 * 改往右）；已有兄弟时接在最右一列下面，一列满 5 个另起一列。
 */
export function computeDerivedNodePosition(canvas: CanvasFile, mode: string, source: Rect, size: Size, siblings: Rect[]): Point {
  const rects = topLevelRects(canvas, mode);
  if (siblings.length === 0) {
    let cand = { x: source.x + source.width + GAP, y: source.y };
    let moved = 0;
    for (let i = 0; i < 50; i++) {
      const hit = rects.find((r) => overlaps({ ...cand, ...size }, r));
      if (!hit) return cand;
      const dy = hit.y + hit.height + GAP - cand.y;
      if (moved + dy <= 1200) {
        cand = { x: cand.x, y: cand.y + dy };
        moved += dy;
      } else {
        cand = { x: hit.x + hit.width + GAP, y: source.y };
        moved = 0;
      }
    }
    return cand;
  }
  const maxRight = Math.max(...siblings.map((s) => s.x));
  const column = siblings.filter((s) => Math.abs(s.x - maxRight) < 1);
  if (column.length >= 5) {
    const colRight = Math.max(...column.map((s) => s.x + s.width));
    return { x: colRight + GAP, y: Math.min(...column.map((s) => s.y)) };
  }
  const bottom = column.reduce((a, b) => (a.y + a.height >= b.y + b.height ? a : b));
  return { x: bottom.x, y: bottom.y + bottom.height + GAP };
}

/** 若干来源节点：间隙 ≤1200 的归成一簇，取最右一簇的外包框当来源。 */
export function sourceRectFor(canvas: CanvasFile, mode: string, sourceIds: string[]): Rect | undefined {
  const rects: Rect[] = [];
  for (const id of sourceIds) {
    const n = canvas.nodes.find((x) => x.id === id);
    const p = n && absolutePosition(canvas, n, mode);
    if (n && p) rects.push({ ...p, ...effectiveSize(n, mode) });
  }
  if (rects.length === 0) return undefined;
  rects.sort((a, b) => a.x - b.x);
  const clusters: Rect[][] = [];
  for (const r of rects) {
    const c = clusters[clusters.length - 1];
    const right = c ? Math.max(...c.map((x) => x.x + x.width)) : -Infinity;
    if (c && r.x - right <= 1200) c.push(r);
    else clusters.push([r]);
  }
  const bound = (c: Rect[]) => boundsOf(c);
  return clusters.map(bound).reduce((a, b) => (b.x + b.width > a.x + a.width || (b.x + b.width === a.x + a.width && b.y + b.height > a.y + a.height) ? b : a));
}

export function boundsOf(rects: Rect[]): Rect {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.width));
  const bottom = Math.max(...rects.map((r) => r.y + r.height));
  return { x, y, width: right - x, height: bottom - y };
}

/** 有来源时派生放置，否则找空位。 */
export function resolveDerivedOrFreePosition(canvas: CanvasFile, mode: string, size: Size, sourceIds: string[] = []): Point {
  const src = sourceRectFor(canvas, mode, sourceIds);
  if (!src) return findFreePosition(canvas, mode, size);
  // 兄弟：已有的、从同一批来源派生出来的顶层节点。
  const sources = new Set(sourceIds);
  const childIds = new Set(canvas.edges.filter((e) => sources.has(e.source)).map((e) => e.target));
  const siblings: Rect[] = [];
  for (const n of canvas.nodes) {
    if (!childIds.has(n.id) || n.parentId) continue;
    const p = positionOf(n, mode);
    if (p) siblings.push({ ...p, ...effectiveSize(n, mode) });
  }
  return computeDerivedNodePosition(canvas, mode, src, size, siblings);
}
