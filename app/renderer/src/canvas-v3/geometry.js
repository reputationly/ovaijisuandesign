/**
 * v3 画布用到的矩形相交判定 —— 从产物主包逐字取回（第 77 轮）。
 */
export function intersectsViewport(a, b) {
  return (
    a.width > 0 &&
    a.height > 0 &&
    b.width > 0 &&
    b.height > 0 &&
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
