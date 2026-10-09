// use-image-split-mode.js
import { reactExports, useTranslation } from "../vendor.js";
import { SPLIT_MAGNIFICATIONS } from "./image-rotate-preview-inner.jsx";
import { rectCellIndices } from "./node-tool-interaction.js";
import { splitSelectedCellsToBlobs } from "./split-selected-cells-to-blobs.js";

export function useImageSplitMode({
  id: id2,
  selected: selected2,
  meta: meta2,
  batchCropAndUpscale,
  cropSplit,
  onApply,
  url: url2,
}) {
  const { t: t2 } = useTranslation();
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
  const enter2 = reactExports.useCallback((rows, cols) => {
    const r2 = Math.max(1, Math.floor(rows));
    const c3 = Math.max(1, Math.floor(cols));
    setGrid({
      rows: r2,
      cols: c3,
    });
    setSelectedCells(new Set());
    anchorRef.current = null;
  }, []);
  const exit2 = reactExports.useCallback(() => {
    setGrid(null);
    setSelectedCells(new Set());
    setProcessing(false);
    anchorRef.current = null;
  }, []);
  const toggleCell = reactExports.useCallback(
    (index2, range2 = false) => {
      const g2 = grid;
      if (range2 && g2 && anchorRef.current != null) {
        const block = rectCellIndices(anchorRef.current, index2, g2.cols);
        setSelectedCells((prev) => {
          const next2 = new Set(prev);
          for (const i2 of block) next2.add(i2);
          return next2;
        });
        return;
      }
      anchorRef.current = index2;
      setSelectedCells((prev) => {
        const next2 = new Set(prev);
        if (next2.has(index2)) next2.delete(index2);
        else next2.add(index2);
        return next2;
      });
    },
    [grid],
  );
  const setMagnification = reactExports.useCallback((next2) => {
    setMag(
      SPLIT_MAGNIFICATIONS.find((m3) => m3.id === next2) ??
        SPLIT_MAGNIFICATIONS[0],
    );
  }, []);
  const selectCells = reactExports.useCallback((indices) => {
    if (indices.length === 0) return;
    setSelectedCells((prev) => {
      const next2 = new Set(prev);
      for (const i2 of indices) next2.add(i2);
      return next2;
    });
    anchorRef.current = indices[indices.length - 1];
  }, []);
  const sliceSelectedCells = reactExports.useCallback(
    async (baseName) => {
      if (!url2 || !grid) return [];
      const { rows, cols } = grid;
      const blobs = await splitSelectedCellsToBlobs(
        url2,
        rows,
        cols,
        selectedCells,
        meta2?.width,
        meta2?.height,
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
    [grid, meta2?.height, meta2?.width, selectedCells, url2],
  );
  const generateHighRes = reactExports.useCallback(async () => {
    if (processing) return;
    if (!url2 || !grid) return;
    if (selectedCells.size === 0) return;
    if (!batchCropAndUpscale) return;
    const baseName = meta2?.name?.replace(/\.[^.]+$/, "") ?? "image";
    setProcessing(true);
    try {
      const cells2 = await sliceSelectedCells(baseName);
      if (cells2.length === 0) return;
      onApply?.({
        output_mode: "enhance",
        cell_count: cells2.length,
        magnification: magnification.id,
      });
      exit2();
      void batchCropAndUpscale(
        id2,
        cells2,
        magnification.multiplier,
        t2("canvas.splitGrid.groupLabel", "宫格高清组"),
      ).catch((err) => {
        console.error("[canvas] grid-split batch failed:", err);
      });
    } finally {
      setProcessing(false);
    }
  }, [
    processing,
    batchCropAndUpscale,
    url2,
    grid,
    selectedCells,
    meta2?.name,
    id2,
    magnification.multiplier,
    magnification.id,
    exit2,
    t2,
    onApply,
    sliceSelectedCells,
  ]);
  const splitLocal = reactExports.useCallback(async () => {
    if (!url2 || !grid) return;
    if (selectedCells.size === 0) return;
    if (!cropSplit) return;
    const baseName = meta2?.name?.replace(/\.[^.]+$/, "") ?? "image";
    const cells2 = await sliceSelectedCells(baseName);
    if (cells2.length === 0) return;
    onApply?.({
      output_mode: "crop",
      cell_count: cells2.length,
    });
    exit2();
    void cropSplit(
      id2,
      cells2.map(({ blob, filename }) => ({
        blob,
        filename,
      })),
      t2("canvas.splitGrid.cropSplitGroupLabel", "宫格编组"),
    ).catch((err) => {
      console.error("[canvas] crop-split batch failed:", err);
    });
  }, [
    url2,
    grid,
    selectedCells,
    cropSplit,
    meta2?.name,
    id2,
    exit2,
    sliceSelectedCells,
    t2,
    onApply,
  ]);
  reactExports.useEffect(() => {
    if (!editing) return;
    if (processing) return;
    if (!selected2) exit2();
  }, [editing, processing, selected2, exit2]);
  return {
    editing,
    grid,
    selectedCells,
    magnification,
    processing,
    enter: enter2,
    exit: exit2,
    toggleCell,
    selectCells,
    setMagnification,
    generateHighRes,
    splitLocal,
  };
}
