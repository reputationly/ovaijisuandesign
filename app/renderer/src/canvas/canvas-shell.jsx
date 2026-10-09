// canvas-shell.jsx
import {
  DEFAULT_CANVAS_VIEWPORT_CONTROLS_PLACEMENT,
  VIEWPORT_CONTROLS_INSET,
} from "./use-video-starter-preset-store.js";
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { CanvasShellInner } from "./canvas-shell-inner.jsx";
import { useActiveMode } from "./use-active-mode.js";
import { useCanvasOverlayApi } from "./use-start-crop-from-node.js";
import { CanvasToolModeProvider } from "../media-editing/canvas-sticker-assets.jsx";
import { CanvasModalGuardProvider } from "./use-inline-rename.jsx";
import { CanvasRootElementProvider } from "../media-editing/director-stage-header-icon.jsx";
import { useRenderableContentChange } from "./use-renderable-content-change.js";
import {
  CANVAS_TOOL_DOCK_BOTTOM_PX,
  CANVAS_TOOL_DOCK_HEIGHT_PX,
  CANVAS_TOOL_DOCK_SAFE_BOTTOM_PX,
} from "./cursor-icon.jsx";

const CANVAS_TONE_BACKGROUNDS = {
  default: "var(--canvas-bg)",
  "warm-gray": "var(--canvas-bg-warm)",
  "cool-gray": "var(--canvas-bg-cool)",
  paper: "var(--canvas-bg-paper)",
  sage: "var(--canvas-bg-sage)",
  "mist-blue": "var(--canvas-bg-mist-blue)",
  lavender: "var(--canvas-bg-lavender)",
  blush: "var(--canvas-bg-blush)",
  sand: "var(--canvas-bg-sand)",
};

function getCanvasToneBackground(tone) {
  return CANVAS_TONE_BACKGROUNDS[tone];
}

const VIEWPORT_CONTROLS_POSITION_STYLES = {
  "bottom-left": {
    left: `calc(var(--canvas-left-overlay-inset, 0px) + ${VIEWPORT_CONTROLS_INSET}px)`,
    bottom: VIEWPORT_CONTROLS_INSET,
    transition: "left 200ms cubic-bezier(0.16, 1, 0.3, 1)",
  },
  "top-left": {
    top: VIEWPORT_CONTROLS_INSET,
    left: `calc(var(--canvas-top-left-overlay-inset, 0px) + ${VIEWPORT_CONTROLS_INSET}px)`,
    transition: "left 200ms cubic-bezier(0.16, 1, 0.3, 1)",
  },
  "top-right": {
    top: VIEWPORT_CONTROLS_INSET,
    right: `calc(var(--canvas-top-right-overlay-inset, 0px) + var(--canvas-top-right-panel-inset, 0px) + ${VIEWPORT_CONTROLS_INSET}px)`,
    transition: "right 200ms cubic-bezier(0.16, 1, 0.3, 1)",
  },
};

function getCanvasViewportControlsPositionStyle(placement) {
  return VIEWPORT_CONTROLS_POSITION_STYLES[placement];
}

const CANVAS_CHROME_Z_INDEX = 10100;

const CANVAS_UTILITY_Z_INDEX = 20;

const CANVAS_UTILITY_CONTROLS_INSET = {
  bottom: 10,
  right: 12,
};

function isPaneClick(target) {
  return (
    !!target.closest(".react-flow__pane") &&
    !target.closest(".react-flow__node") &&
    !target.closest(".react-flow__nodesselection")
  );
}

function isEditableElement(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

function isCanvasChromeElement(target) {
  return (
    target instanceof Element &&
    target.closest('[data-canvas-chrome="true"]') !== null
  );
}

export function CanvasShell(props) {
  const {
    toolbar,
    viewportControls,
    utilityControls,
    toolbarPlacement: requestedToolbarPlacement,
    onRenderableContentChange,
    suppressSelectionChrome = false,
    ...rest
  } = props;
  const toolbarPlacement =
    requestedToolbarPlacement ?? DEFAULT_CANVAS_VIEWPORT_CONTROLS_PLACEMENT;
  const activeMode = useActiveMode();
  const toolMode = props.stickerMode
    ? "sticker"
    : props.handTool
      ? "hand"
      : "select";
  useRenderableContentChange(rest.nodes, onRenderableContentChange);
  const handleDoubleClick2 = reactExports.useCallback(
    (e2) => {
      if (!rest.onPaneDoubleClick) return;
      if (isPaneClick(e2.target)) {
        e2.preventDefault();
        window.getSelection()?.removeAllRanges();
        rest.onPaneDoubleClick(e2);
      }
    },
    [rest.onPaneDoubleClick],
  );
  const handleContextMenu = reactExports.useCallback(
    (e2) => {
      if (!rest.onPaneContextMenu) return;
      if (isPaneClick(e2.target)) {
        e2.preventDefault();
        rest.onPaneContextMenu(e2);
      }
    },
    [rest.onPaneContextMenu],
  );
  const handleMouseDownCapture = reactExports.useCallback((e2) => {
    if (isEditableElement(e2.target) || isCanvasChromeElement(e2.target))
      return;
    e2.currentTarget.focus();
  }, []);
  const canvasOverlayStore = useCanvasOverlayApi();
  reactExports.useEffect(
    () => () => canvasOverlayStore.getState().reset(),
    [canvasOverlayStore],
  );
  const rootRef = reactExports.useRef(null);
  const [rootEl, setRootEl] = reactExports.useState(null);
  const onRootElChange = rest.onRootElChange;
  const assignRootRef = reactExports.useCallback((el) => {
    rootRef.current = el;
    setRootEl(el);
  }, []);
  reactExports.useEffect(() => {
    onRootElChange?.(rootRef.current);
    return () => onRootElChange?.(null);
  }, [onRootElChange]);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: canvas pane interaction handlers
    <div
      ref={assignRootRef}
      data-hilo-canvas-root="true"
      data-sticker-mode={props.stickerMode ? "true" : "false"}
      data-selection-chrome-suppressed={
        suppressSelectionChrome ? "true" : "false"
      }
      data-action-ui-id="canvas.pane"
      tabIndex={0}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        containerType: "inline-size",
        containerName: "canvas-shell",
        background: getCanvasToneBackground(props.canvasTone ?? "default"),
        "--canvas-tool-dock-bottom": `${CANVAS_TOOL_DOCK_BOTTOM_PX}px`,
        "--canvas-tool-dock-height": `${CANVAS_TOOL_DOCK_HEIGHT_PX}px`,
        "--canvas-tool-dock-safe-bottom": `${CANVAS_TOOL_DOCK_SAFE_BOTTOM_PX}px`,
      }}
      onMouseDownCapture={handleMouseDownCapture}
      onDoubleClick={handleDoubleClick2}
      onContextMenu={handleContextMenu}
      onDragEnter={rest.onCanvasDragEnter}
      onDragOver={rest.onCanvasDragOver}
      onDragLeave={rest.onCanvasDragLeave}
      onDrop={rest.onCanvasDrop}
    >
      <CanvasRootElementProvider value={rootEl}>
        {toolbar && !activeMode.isAnyActive && (
          <div
            data-canvas-chrome="true"
            style={{
              position: "absolute",
              left: "50%",
              bottom: CANVAS_TOOL_DOCK_BOTTOM_PX,
              transform: "translateX(-50%)",
              zIndex: CANVAS_CHROME_Z_INDEX,
              display: "flex",
              gap: 4,
            }}
          >
            {toolbar}
          </div>
        )}
        {viewportControls && (
          <div
            data-action-ui-id="canvas.viewport-controls"
            data-canvas-chrome="true"
            data-canvas-corner={toolbarPlacement}
            style={{
              position: "absolute",
              ...getCanvasViewportControlsPositionStyle(toolbarPlacement),
              zIndex: CANVAS_CHROME_Z_INDEX,
              display: "flex",
              gap: 4,
            }}
          >
            {viewportControls}
          </div>
        )}
        {utilityControls && (
          <div
            data-canvas-chrome="true"
            style={{
              position: "absolute",
              bottom: CANVAS_UTILITY_CONTROLS_INSET.bottom,
              right: CANVAS_UTILITY_CONTROLS_INSET.right,
              // Deliberately *below* CANVAS_CHROME_Z_INDEX: full-pane editor
              // surfaces (plugin editor, text fullscreen) portal into this
              // same root at the chrome layer and must cover this utility.
              zIndex: CANVAS_UTILITY_Z_INDEX,
              display: "flex",
              alignItems: "center",
              gap: 8,
              pointerEvents: "none",
            }}
          >
            {utilityControls}
          </div>
        )}
        <CanvasModalGuardProvider>
          <CanvasToolModeProvider value={toolMode}>
            <CanvasShellInner {...rest} toolbarPlacement={toolbarPlacement} />
          </CanvasToolModeProvider>
        </CanvasModalGuardProvider>
      </CanvasRootElementProvider>
    </div>
  );
}
