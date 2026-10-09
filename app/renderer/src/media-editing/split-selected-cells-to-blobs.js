// split-selected-cells-to-blobs.js

const DEFAULT_SPLIT_GUTTER_RATIO = 0.01;

function computeGridCells(
  width,
  height,
  rows,
  cols,
  gutterRatio = DEFAULT_SPLIT_GUTTER_RATIO,
) {
  const r2 = Math.max(1, Math.floor(rows));
  const c3 = Math.max(1, Math.floor(cols));
  const cellW = width / c3;
  const cellH = height / r2;
  const gutter = Math.max(0, Math.round(Math.min(cellW, cellH) * gutterRatio));
  const cells2 = [];
  for (let row = 0; row < r2; row++) {
    for (let col = 0; col < c3; col++) {
      const rawX = col * cellW;
      const rawY = row * cellH;
      const sx = Math.round(rawX + gutter);
      const sy = Math.round(rawY + gutter);
      const sw = Math.max(1, Math.round(cellW - gutter * 2));
      const sh = Math.max(1, Math.round(cellH - gutter * 2));
      cells2.push({
        sx,
        sy,
        sw,
        sh,
        row,
        col,
      });
    }
  }
  return cells2;
}

function loadImage$5(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e2) => reject(e2);
    img.src = src;
  });
}

function cellToBlob(img, cell) {
  const canvas = document.createElement("canvas");
  canvas.width = cell.sw;
  canvas.height = cell.sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("split-utils: 2d context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    img,
    cell.sx,
    cell.sy,
    cell.sw,
    cell.sh,
    0,
    0,
    cell.sw,
    cell.sh,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("split-utils: toBlob returned null"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export async function splitSelectedCellsToBlobs(
  src,
  rows,
  cols,
  selected2,
  originalWidth,
  originalHeight,
  gutterRatio = 0,
) {
  if (selected2.size === 0) return [];
  const img = await loadImage$5(src);
  const sw = originalWidth || img.naturalWidth;
  const sh = originalHeight || img.naturalHeight;
  const cells2 = computeGridCells(sw, sh, rows, cols, gutterRatio);
  const out = [];
  for (let i2 = 0; i2 < cells2.length; i2++) {
    if (!selected2.has(i2)) continue;
    const cell = cells2[i2];
    const blob = await cellToBlob(img, cell);
    out.push({
      blob,
      row: cell.row,
      col: cell.col,
      sw: cell.sw,
      sh: cell.sh,
    });
  }
  return out;
}
