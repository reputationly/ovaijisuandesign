export function isPointInPolygon(point2, polygon) {
  const {
    x: x2,
    y: y4
  } = point2;
  let inside = false;
  for (let i2 = 0, j2 = polygon.length - 1; i2 < polygon.length; j2 = i2++) {
    const ii = polygon[i2];
    const jj = polygon[j2];
    const xi = ii.x;
    const yi = ii.y;
    const xj = jj.x;
    const yj = jj.y;
    const intersect = yi > y4 !== yj > y4 && x2 < (xj - xi) * (y4 - yi) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}