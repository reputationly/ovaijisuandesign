// use-image-split-mode.js
import { reactExports, useTranslation } from "../vendor.js";
import { SPLIT_MAGNIFICATIONS } from "./image-rotate-preview-inner.jsx";
import { rectCellIndices } from "./node-tool-interaction.js";
import { splitSelectedCellsToBlobs } from "./split-selected-cells-to-blobs.js";

export function useImageSplitMode({
  id: nodeId,
  selected: isSelected,
  meta,
  batchCropAndUpscale,
  cropSplit,
  onApply,
  url,
}) {
  const { t } = useTranslation();
  const [grid, setGrid] = reactExports.useState(null);
  const [selectedCells, setSelectedCells] = reactExports.useState(
    () => new Set(),
  );
  const [magnification, setMag] = reactExports.useState(
    SPLIT_MAGNIFICATIONS[0],
  );
  const [processing, setProcessing] = reactExports.useState(false);
  const anchorRef = reactExports.useRef(null);
  const editing = grid !== null;
  const enter = reactExports.useCallback((rows, cols) => {
    const rowCount = Math.max(1, Math.floor(rows));
    const columnCount = Math.max(1, Math.floor(cols));
    setGrid({
      rows: rowCount,
      cols: columnCount,
    });
    setSelectedCells(new Set());
    anchorRef.current = null;
  }, []);
  const exit = reactExports.useCallback(() => {
    setGrid(null);
    setSelectedCells(new Set());
    setProcessing(false);
    anchorRef.current = null;
  }, []);
  const toggleCell = reactExports.useCallback(
    (index, isRangeSelection = false) => {
      const currentGrid = grid;
      if (isRangeSelection && currentGrid && anchorRef.current != null) {
        const block = rectCellIndices(anchorRef.current, index, currentGrid.cols);
        setSelectedCells((prev) => {
          const next = new Set(prev);
          for (const cellIndex of block) next.add(cellIndex);
          return next;
        });
        return;
      }
      anchorRef.current = index;
      setSelectedCells((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
    },
    [grid],
  );
  const setMagnification = reactExports.useCallback((next) => {
    setMag(
      SPLIT_MAGNIFICATIONS.find((magnification) => magnification.id === next) ??
        SPLIT_MAGNIFICATIONS[0],
    );
  }, []);
  const selectCells = reactExports.useCallback((indices) => {
    if (indices.length === 0) return;
    setSelectedCells((prev) => {
      const next = new Set(prev);
      for (const cellIndex of indices) next.add(cellIndex);
      return next;
    });
    anchorRef.current = indices[indices.length - 1];
  }, []);
  const sliceSelectedCells = reactExports.useCallback(
    async (baseName) => {
      if (!url || !grid) return [];
      const { rows, cols } = grid;
      const blobs = await splitSelectedCellsToBlobs(
        url,
        rows,
        cols,
        selectedCells,
        meta?.width,
        meta?.height,
      );
      return blobs.map((cell) => ({
        blob: cell.blob,
        row: cell.row,
        col: cell.col,
        filename: `${baseName}-r${cell.row + 1}c${cell.col + 1}.png`,
        // Native pixel size of the sliced cell. The host multiplies these by
        // the picked magnification to derive the enhance-image target size.
        srcWidth: cell.sw,
        srcHeight: cell.sh,
        // Carry the sliced cell's pixel ratio so the HD placeholder card
        // renders at the SAME shape the upscaled result will land at (super
        // resolution preserves aspect ratio). Without this the placeholder
        // falls back to the square default and the loading card looks wrong
        // next to its short-wide siblings.
        ...(cell.sw > 0 && cell.sh > 0
          ? {
              aspectRatio: `${cell.sw}:${cell.sh}`,
            }
          : {}),
      }));
    },
    [grid, meta?.height, meta?.width, selectedCells, url],
  );
  const generateHighRes = reactExports.useCallback(async () => {
    if (processing) return;
    if (!url || !grid) return;
    if (selectedCells.size === 0) return;
    if (!batchCropAndUpscale) return;
    const baseName = meta?.name?.replace(/\.[^.]+$/, "") ?? "image";
    setProcessing(true);
    try {
      const cells = await sliceSelectedCells(baseName);
      if (cells.length === 0) return;
      onApply?.({
        output_mode: "enhance",
        cell_count: cells.length,
        magnification: magnification.id,
      });
      exit();
      void batchCropAndUpscale(
        nodeId,
        cells,
        magnification.multiplier,
        t("canvas.splitGrid.groupLabel", "宫格高清组"),
      ).catch((err) => {
        console.error("[canvas] grid-split batch failed:", err);
      });
    } finally {
      setProcessing(false);
    }
  }, [
    processing,
    batchCropAndUpscale,
    url,
    grid,
    selectedCells,
    meta?.name,
    nodeId,
    magnification.multiplier,
    magnification.id,
    exit,
    t,
    onApply,
    sliceSelectedCells,
  ]);
  const splitLocal = reactExports.useCallback(async () => {
    if (!url || !grid) return;
    if (selectedCells.size === 0) return;
    if (!cropSplit) return;
    const baseName = meta?.name?.replace(/\.[^.]+$/, "") ?? "image";
    const cells = await sliceSelectedCells(baseName);
    if (cells.length === 0) return;
    onApply?.({
      output_mode: "crop",
      cell_count: cells.length,
    });
    exit();
    void cropSplit(
      nodeId,
      cells.map(({ blob, filename }) => ({
        blob,
        filename,
      })),
      t("canvas.splitGrid.cropSplitGroupLabel", "宫格编组"),
    ).catch((err) => {
      console.error("[canvas] crop-split batch failed:", err);
    });
  }, [
    url,
    grid,
    selectedCells,
    cropSplit,
    meta?.name,
    nodeId,
    exit,
    sliceSelectedCells,
    t,
    onApply,
  ]);
  reactExports.useEffect(() => {
    if (!editing) return;
    if (processing) return;
    if (!isSelected) exit();
  }, [editing, processing, isSelected, exit]);
  return {
    editing,
    grid,
    selectedCells,
    magnification,
    processing,
    enter,
    exit,
    toggleCell,
    selectCells,
    setMagnification,
    generateHighRes,
    splitLocal,
  };
}
