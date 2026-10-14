// use-canvas-interaction-tool.js
import reactExports from "react";
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
    (event, node) => {
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
        emitCommentContext(event.clientX, event.clientY, node.id);
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
  const [state, setState] = reactExports.useState({
    tool: "select",
    activeCommand: null,
    stickerSelection: DEFAULT_STICKER_SELECTION,
  });
  const setActiveCommand = reactExports.useCallback((activeCommand) => {
    setState((current) => ({
      ...current,
      activeCommand,
    }));
  }, []);
  const setStickerSelection = reactExports.useCallback((stickerSelection) => {
    setState((current) => ({
      ...current,
      stickerSelection,
    }));
  }, []);
  const setInteractionTool = reactExports.useCallback(
    (tool, source = "trigger") => {
      setState((current) => {
        if (tool !== "sticker")
          return {
            ...current,
            tool,
            activeCommand: null,
          };
        if (source === "keyboard") {
          if (current.tool === "sticker") return current;
          return {
            tool,
            activeCommand: null,
            stickerSelection: DEFAULT_STICKER_SELECTION,
          };
        }
        const isOpen = current.activeCommand === CANVAS_COMMAND_IDS.sticker;
        return {
          ...current,
          tool: isOpen ? "select" : "sticker",
          activeCommand: isOpen ? null : CANVAS_COMMAND_IDS.sticker,
        };
      });
    },
    [],
  );
  const dismissStickerPanel = reactExports.useCallback(() => {
    setState((current) =>
      current.activeCommand === CANVAS_COMMAND_IDS.sticker
        ? {
            ...current,
            activeCommand: null,
          }
        : current,
    );
  }, []);
  const closeCommandPanel = reactExports.useCallback(() => {
    setState((current) => ({
      ...current,
      tool:
        current.activeCommand === CANVAS_COMMAND_IDS.sticker
          ? "select"
          : current.tool,
      activeCommand: null,
    }));
  }, []);
  return {
    activeCommand: state.activeCommand,
    stickerMode: state.tool === "sticker",
    handTool: state.tool === "hand",
    stickerSelection: state.stickerSelection,
    setStickerSelection,
    setActiveCommand,
    setInteractionTool,
    closeCommandPanel,
    dismissStickerPanel,
  };
}
