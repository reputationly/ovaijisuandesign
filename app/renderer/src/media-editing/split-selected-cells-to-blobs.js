// split-selected-cells-to-blobs.js

const DEFAULT_SPLIT_GUTTER_RATIO = 0.01;
function computeGridCells(
  width,
  height,
  rows,
  cols,
  gutterRatio = DEFAULT_SPLIT_GUTTER_RATIO,
) {
  const rowCount = Math.max(1, Math.floor(rows));
  const columnCount = Math.max(1, Math.floor(cols));
  const cellW = width / columnCount;
  const cellH = height / rowCount;
  const gutter = Math.max(0, Math.round(Math.min(cellW, cellH) * gutterRatio));
  const cells = [];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
      const rawX = columnIndex * cellW;
      const rawY = rowIndex * cellH;
      const sourceX = Math.round(rawX + gutter);
      const sourceY = Math.round(rawY + gutter);
      const sourceWidth = Math.max(1, Math.round(cellW - gutter * 2));
      const sourceHeight = Math.max(1, Math.round(cellH - gutter * 2));
      cells.push({
        sx: sourceX,
        sy: sourceY,
        sw: sourceWidth,
        sh: sourceHeight,
        row: rowIndex,
        col: columnIndex,
      });
    }
  }
  return cells;
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const imageElement = new Image();
    imageElement.crossOrigin = "anonymous";
    imageElement.onload = () => resolve(imageElement);
    imageElement.onerror = (errorEvent) => reject(errorEvent);
    imageElement.src = src;
  });
}
function cellToBlob(sourceImage, cell) {
  const canvas = document.createElement("canvas");
  canvas.width = cell.sw;
  canvas.height = cell.sh;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("split-utils: 2d context unavailable");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    sourceImage,
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
  selected,
  originalWidth,
  originalHeight,
  gutterRatio = 0,
) {
  if (selected.size === 0) return [];
  const imageElement = await loadImage(src);
  const sourceWidth = originalWidth || imageElement.naturalWidth;
  const sourceHeight = originalHeight || imageElement.naturalHeight;
  const cells = computeGridCells(sourceWidth, sourceHeight, rows, cols, gutterRatio);
  const selectedCells = [];
  for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
    if (!selected.has(cellIndex)) continue;
    const cell = cells[cellIndex];
    const blob = await cellToBlob(imageElement, cell);
    selectedCells.push({
      blob,
      row: cell.row,
      col: cell.col,
      sw: cell.sw,
      sh: cell.sh,
    });
  }
  return selectedCells;
}
