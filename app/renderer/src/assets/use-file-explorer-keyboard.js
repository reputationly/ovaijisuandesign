// use-file-explorer-keyboard.js
import { reactExports } from "../vendor.js";

function findNextRowPath(currentPath, visiblePaths, direction, step = 1) {
  if (visiblePaths.length === 0) return null;
  const last2 = visiblePaths.length - 1;
  if (!currentPath) {
    return direction === "next" ? visiblePaths[0] : visiblePaths[last2];
  }
  const idx = visiblePaths.indexOf(currentPath);
  if (idx < 0) {
    return direction === "next" ? visiblePaths[0] : visiblePaths[last2];
  }
  if (direction === "next") {
    if (idx === last2) return null;
    return visiblePaths[Math.min(idx + step, last2)];
  }
  if (idx === 0) return null;
  return visiblePaths[Math.max(idx - step, 0)];
}

export function useFileExplorerKeyboard({
  sectionRef,
  primaryPath,
  visiblePaths,
  viewMode,
  columnsPerRow,
  flatRows,
  getRowAnchor,
  dispatchShortcut,
  selectionAnchorRef,
  setSelectedPaths,
  setLastSelectedPath,
}) {
  const navStateRef = reactExports.useRef({
    primaryPath,
    visiblePaths,
    viewMode,
    columnsPerRow,
    flatRows,
    dispatchShortcut,
    getRowAnchor,
  });
  navStateRef.current = {
    primaryPath,
    visiblePaths,
    viewMode,
    columnsPerRow,
    flatRows,
    dispatchShortcut,
    getRowAnchor,
  };
  reactExports.useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const onKey = (event) => {
      const target = event.target;
      const state2 = navStateRef.current;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const isInputTarget =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLElement && target.isContentEditable);
        if (isInputTarget) return;
        if (state2.visiblePaths.length === 0) return;
        const direction = event.key === "ArrowDown" ? "next" : "prev";
        const step = state2.viewMode === "grid" ? state2.columnsPerRow : 1;
        const nextPath = findNextRowPath(
          state2.primaryPath,
          state2.visiblePaths,
          direction,
          step,
        );
        if (!nextPath) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.shiftKey) {
          if (!selectionAnchorRef.current) {
            selectionAnchorRef.current = state2.primaryPath ?? nextPath;
          }
          const anchorPath = selectionAnchorRef.current;
          const anchorIdx = anchorPath
            ? state2.visiblePaths.indexOf(anchorPath)
            : -1;
          const nextIdx = state2.visiblePaths.indexOf(nextPath);
          if (anchorIdx >= 0 && nextIdx >= 0) {
            const [start2, end2] =
              anchorIdx < nextIdx ? [anchorIdx, nextIdx] : [nextIdx, anchorIdx];
            setSelectedPaths(
              new Set(state2.visiblePaths.slice(start2, end2 + 1)),
            );
          } else {
            setSelectedPaths(new Set([nextPath]));
          }
          setLastSelectedPath(nextPath);
        } else {
          selectionAnchorRef.current = null;
          setSelectedPaths(new Set([nextPath]));
          setLastSelectedPath(nextPath);
        }
        const anchor = state2.getRowAnchor(nextPath);
        anchor?.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
        return;
      }
      state2.dispatchShortcut(event);
    };
    section.addEventListener("keydown", onKey);
    return () => section.removeEventListener("keydown", onKey);
  }, []);
}
