// use-image-erase.js
import { reactExports } from "../vendor.js";

function normaliseRect(a2, b3) {
  return {
    x1: Math.max(0, Math.min(1, Math.min(a2.x, b3.x))),
    y1: Math.max(0, Math.min(1, Math.min(a2.y, b3.y))),
    x2: Math.max(0, Math.min(1, Math.max(a2.x, b3.x))),
    y2: Math.max(0, Math.min(1, Math.max(a2.y, b3.y))),
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
  const beginSelection = reactExports.useCallback((point2) => {
    startRef.current = point2;
    draftRef.current = null;
    setDraftSelection(null);
  }, []);
  const extendSelection = reactExports.useCallback((point2) => {
    if (!startRef.current) return;
    const next2 = normaliseRect(startRef.current, point2);
    draftRef.current = next2;
    setDraftSelection(next2);
  }, []);
  const endSelection = reactExports.useCallback(() => {
    startRef.current = null;
    const current2 = draftRef.current;
    draftRef.current = null;
    setDraftSelection(null);
    if (!isValidSelectionRect(current2)) return null;
    setSelections((previous2) => [...previous2, current2]);
    setRedoSelections([]);
    return current2;
  }, []);
  const undoSelection2 = reactExports.useCallback(() => {
    setSelections((previous2) => {
      if (previous2.length === 0) return previous2;
      const next2 = previous2.slice(0, -1);
      const removed = previous2[previous2.length - 1];
      setRedoSelections((redo22) => [...redo22, removed]);
      return next2;
    });
  }, []);
  const redo2 = reactExports.useCallback(() => {
    setRedoSelections((previous2) => {
      if (previous2.length === 0) return previous2;
      const restored = previous2[previous2.length - 1];
      setSelections((current2) => [...current2, restored]);
      return previous2.slice(0, -1);
    });
  }, []);
  const clearSelection = reactExports.useCallback(() => {
    setSelections([]);
    setDraftSelection(null);
    setRedoSelections([]);
    draftRef.current = null;
    startRef.current = null;
  }, []);
  const selection2 = selections[selections.length - 1] ?? null;
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
    (point2) => beginSelection(point2),
    [beginSelection],
  );
  const extendStroke = reactExports.useCallback(
    (point2) => extendSelection(point2),
    [extendSelection],
  );
  const endStroke = endSelection;
  const undoStroke = undoSelection2;
  const redoStroke = redo2;
  const setTool = reactExports.useCallback((_tool) => {}, []);
  const setBrushSize = reactExports.useCallback((_value) => {}, []);
  return {
    selection: selection2,
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
    undoSelection: undoSelection2,
    redoSelection: redo2,
    clearSelection,
    hasStrokes: selections.length > 0,
    hasSelection: selections.length > 0,
    selections,
    draftSelection,
    canRedo: redoSelections.length > 0,
  };
}
