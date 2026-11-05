/**
 * 画布「整理」与「参考片段时长」两个纯函数。
 *
 * 抽成独立模块是为了能单测：`canvas-area-v3.js` 是几万行的 UI bundle，直接 import 它
 * 在 node 里跑不动；这两个函数本身不依赖 DOM、不依赖 React。
 */

/**
 * 把 dagre 算出来的坐标变成一条 `canvas.patch`。
 *
 * - `positions` 是 `Map<nodeId, {x, y}>`（`computeCanvasTidyLayout` 的返回值）；
 * - dagre 的坐标从 0 开始，所以整体平移到「锚点」：容器内用 `options.origin`
 *   （容器原点 + 内边距），画布上沿用选区当前的左上角，避免整片节点跳走；
 * - 没有任何节点真的移动时返回 `null`（不要发空补丁）。
 */
export function arrangeCanvasV3SelectionPatch(document, ids, layout, options = {}) {
  const positions = options?.positions;
  if (!positions || typeof positions.get !== "function") return null;
  const targets = [...new Set(ids)].flatMap((id) => {
    const node = document?.nodes?.[id];
    const position = positions.get(id);
    return node && position ? [{ node, position }] : [];
  });
  if (!targets.length) return null;
  const minX = Math.min(...targets.map((entry) => entry.position.x));
  const minY = Math.min(...targets.map((entry) => entry.position.y));
  const anchor = options.origin ?? {
    x: Math.min(...targets.map((entry) => entry.node.position.x)),
    y: Math.min(...targets.map((entry) => entry.node.position.y)),
  };
  const nodes = [];
  for (const { node, position } of targets) {
    const next = { x: anchor.x + (position.x - minX), y: anchor.y + (position.y - minY) };
    if (next.x === node.position.x && next.y === node.position.y) continue;
    nodes.push({ id: node.id, before: node, after: { ...node, position: next } });
  }
  return nodes.length ? { type: "canvas.patch", nodes, edges: [] } : null;
}

/**
 * 参考片段实际时长是否等于「裁剪后应得时长」。
 *
 * 容差取 `max(2/30 秒, 1%)`：编码器会把时长量化到帧，剥掉尾帧余量后也会有毫秒级偏差。
 * `cropDuration` 注入进来（用 `getCropOutputDuration`），这样本模块不依赖 UI 代码。
 */
export function matchesReferenceSelectionDurationWith(actual, draft, cropDuration) {
  const expected = Number(cropDuration?.(draft?.range));
  const duration = Number(actual?.duration ?? actual?.media?.duration ?? Number.NaN);
  if (!Number.isFinite(expected) || expected <= 0) return false;
  if (!Number.isFinite(duration) || duration <= 0) return false;
  const tolerance = Math.max(2 / 30, expected * 0.01);
  return Math.abs(duration - expected) <= tolerance;
}
