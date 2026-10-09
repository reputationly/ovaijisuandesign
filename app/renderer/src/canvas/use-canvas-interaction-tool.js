// use-canvas-interaction-tool.js
import { reactExports } from "../vendor.js";
import { CANVAS_DEFAULT_STICKER_ASSET_ID } from "../media-editing/canvas-sticker-assets.jsx";
import { CANVAS_COMMAND_IDS } from "./use-active-mode.js";

function isCanvasChromeTarget(target) {
  return (
    target instanceof Element &&
    target.closest('[data-canvas-chrome="true"]') !== null
  );
}

export function useCanvasClickHandlers({
  commentsActive,
  selectedCommentTargetId,
  stickerMode,
  emitCommentContext,
  handlePlaceSticker,
  onStickerPlaced,
  restoreSelectionChrome,
}) {
  const handleCanvasPaneClick = reactExports.useCallback(
    (event) => {
      if (isCanvasChromeTarget(event.target)) return;
      restoreSelectionChrome();
      if (commentsActive) {
        emitCommentContext(
          event.clientX,
          event.clientY,
          selectedCommentTargetId,
        );
        return;
      }
      if (
        stickerMode &&
        event.button === 0 &&
        handlePlaceSticker(event.clientX, event.clientY)
      ) {
        onStickerPlaced();
      }
    },
    [
      commentsActive,
      emitCommentContext,
      handlePlaceSticker,
      onStickerPlaced,
      restoreSelectionChrome,
      selectedCommentTargetId,
      stickerMode,
    ],
  );
  const handleCanvasNodeClick = reactExports.useCallback(
    (event, node2) => {
      if (isCanvasChromeTarget(event.target)) return;
      restoreSelectionChrome();
      if (stickerMode) {
        if (
          event.button === 0 &&
          handlePlaceSticker(event.clientX, event.clientY)
        ) {
          onStickerPlaced();
        }
        return;
      }
      if (commentsActive)
        emitCommentContext(event.clientX, event.clientY, node2.id);
    },
    [
      commentsActive,
      emitCommentContext,
      handlePlaceSticker,
      onStickerPlaced,
      restoreSelectionChrome,
      stickerMode,
    ],
  );
  return {
    handleCanvasNodeClick,
    handleCanvasPaneClick,
  };
}

const DEFAULT_STICKER_SELECTION = {
  kind: "asset",
  id: CANVAS_DEFAULT_STICKER_ASSET_ID,
};

export function useCanvasInteractionTool() {
  const [state2, setState] = reactExports.useState({
    tool: "select",
    activeCommand: null,
    stickerSelection: DEFAULT_STICKER_SELECTION,
  });
  const setActiveCommand = reactExports.useCallback((activeCommand) => {
    setState((current2) => ({
      ...current2,
      activeCommand,
    }));
  }, []);
  const setStickerSelection = reactExports.useCallback((stickerSelection) => {
    setState((current2) => ({
      ...current2,
      stickerSelection,
    }));
  }, []);
  const setInteractionTool = reactExports.useCallback(
    (tool2, source = "trigger") => {
      setState((current2) => {
        if (tool2 !== "sticker")
          return {
            ...current2,
            tool: tool2,
            activeCommand: null,
          };
        if (source === "keyboard") {
          if (current2.tool === "sticker") return current2;
          return {
            tool: tool2,
            activeCommand: null,
            stickerSelection: DEFAULT_STICKER_SELECTION,
          };
        }
        const isOpen = current2.activeCommand === CANVAS_COMMAND_IDS.sticker;
        return {
          ...current2,
          tool: isOpen ? "select" : "sticker",
          activeCommand: isOpen ? null : CANVAS_COMMAND_IDS.sticker,
        };
      });
    },
    [],
  );
  const dismissStickerPanel = reactExports.useCallback(() => {
    setState((current2) =>
      current2.activeCommand === CANVAS_COMMAND_IDS.sticker
        ? {
            ...current2,
            activeCommand: null,
          }
        : current2,
    );
  }, []);
  const closeCommandPanel = reactExports.useCallback(() => {
    setState((current2) => ({
      ...current2,
      tool:
        current2.activeCommand === CANVAS_COMMAND_IDS.sticker
          ? "select"
          : current2.tool,
      activeCommand: null,
    }));
  }, []);
  return {
    activeCommand: state2.activeCommand,
    stickerMode: state2.tool === "sticker",
    handTool: state2.tool === "hand",
    stickerSelection: state2.stickerSelection,
    setStickerSelection,
    setActiveCommand,
    setInteractionTool,
    closeCommandPanel,
    dismissStickerPanel,
  };
}
