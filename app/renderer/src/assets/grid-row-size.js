// 资产网格行高。


export const GRID_COLUMN_COUNT_WIDE = 5;
export function estimateGridRowSize(containerWidth, columnCount) {
  const horizontalPadding = 20;
  const columnGaps = (columnCount - 1) * 8;
  const tileWidth = (containerWidth - horizontalPadding - columnGaps) / columnCount;
  const thumbnailHeight = Math.max(0, tileWidth) * 2 / 3;
  const infoHeight = 48;
  const rowGap = 8;
  return thumbnailHeight + infoHeight + rowGap;
}
