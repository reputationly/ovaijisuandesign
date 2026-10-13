// use-image-erase.js
import { reactExports } from "../vendor.js";

function normaliseRect(firstPoint, secondPoint) {
  return {
    x1: Math.max(0, Math.min(1, Math.min(firstPoint.x, secondPoint.x))),
    y1: Math.max(0, Math.min(1, Math.min(firstPoint.y, secondPoint.y))),
    x2: Math.max(0, Math.min(1, Math.max(firstPoint.x, secondPoint.x))),
    y2: Math.max(0, Math.min(1, Math.max(firstPoint.y, secondPoint.y))),
  };
}

function isValidSelectionRect(rect, minSize = 1e-3) {
  return Boolean(
    rect && rect.x2 - rect.x1 >= minSize && rect.y2 - rect.y1 >= minSize,
  );
}

export function useImageErase() {
  const [selections, setSelections] = reactExports.useState([]);
  const [draftSelection, setDraftSelection] = reactExports.useState(null);
  const [redoSelections, setRedoSelections] = reactExports.useState([]);
  const startRef = reactExports.useRef(null);
  const draftRef = reactExports.useRef(null);
  const beginSelection = reactExports.useCallback((point) => {
    startRef.current = point;
    draftRef.current = null;
    setDraftSelection(null);
  }, []);
  const extendSelection = reactExports.useCallback((point) => {
    if (!startRef.current) return;
    const next = normaliseRect(startRef.current, point);
    draftRef.current = next;
    setDraftSelection(next);
  }, []);
  const endSelection = reactExports.useCallback(() => {
    startRef.current = null;
    const current = draftRef.current;
    draftRef.current = null;
    setDraftSelection(null);
    if (!isValidSelectionRect(current)) return null;
    setSelections((previous) => [...previous, current]);
    setRedoSelections([]);
    return current;
  }, []);
  const undoSelection = reactExports.useCallback(() => {
    setSelections((previous) => {
      if (previous.length === 0) return previous;
      const next = previous.slice(0, -1);
      const removed = previous[previous.length - 1];
      setRedoSelections((previousRedoSelections) => [...previousRedoSelections, removed]);
      return next;
    });
  }, []);
  const redo = reactExports.useCallback(() => {
    setRedoSelections((previous) => {
      if (previous.length === 0) return previous;
      const restored = previous[previous.length - 1];
      setSelections((current) => [...current, restored]);
      return previous.slice(0, -1);
    });
  }, []);
  const clearSelection = reactExports.useCallback(() => {
    setSelections([]);
    setDraftSelection(null);
    setRedoSelections([]);
    draftRef.current = null;
    startRef.current = null;
  }, []);
  const selection = selections[selections.length - 1] ?? null;
  const strokes = [
    ...selections,
    ...(draftSelection ? [draftSelection] : []),
  ].map((rect) => ({
    size: 0,
    mode: "rect",
    points: [
      {
        x: rect.x1,
        y: rect.y1,
      },
      {
        x: rect.x2,
        y: rect.y2,
      },
    ],
  }));
  const beginStroke = reactExports.useCallback(
    (point) => beginSelection(point),
    [beginSelection],
  );
  const extendStroke = reactExports.useCallback(
    (point) => extendSelection(point),
    [extendSelection],
  );
  const endStroke = endSelection;
  const undoStroke = undoSelection;
  const redoStroke = redo;
  const setTool = reactExports.useCallback((_tool) => {}, []);
  const setBrushSize = reactExports.useCallback((_value) => {}, []);
  return {
    selection,
    strokes,
    brushSize: 0,
    tool: "rect",
    isPainting: startRef.current !== null,
    beginStroke,
    extendStroke,
    endStroke,
    undoStroke,
    redoStroke,
    setTool,
    setBrushSize,
    beginSelection,
    extendSelection,
    endSelection,
    undoSelection,
    redoSelection: redo,
    clearSelection,
    hasStrokes: selections.length > 0,
    hasSelection: selections.length > 0,
    selections,
    draftSelection,
    canRedo: redoSelections.length > 0,
  };
}
