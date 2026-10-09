// use-canvas-sidebar-controller.js
import { reactExports, useStorage } from "../vendor.js";
import {
  CONTENT_PANEL_MAX_WIDTH,
  CONTENT_PANEL_MIN_WIDTH,
} from "./workspace-asset-center-relocation-coach-mark.jsx";
import { useResizableWidth } from "../generation/use-resizable-width.js";

const CONTENT_PANEL_DEFAULT_WIDTH = 320;

const PANEL_TRANSITION_MS = 200;

const PANEL_TRANSITION_FALLBACK_MS = PANEL_TRANSITION_MS + 40;

export function useCanvasSidebarController({
  isActive: isActive2,
  expanded: controlledExpanded,
  onExpandedChange,
  resizeFrom = "right",
} = {}) {
  const [config2, setConfig] = useStorage("global.config");
  const [uncontrolledExpanded, setUncontrolledExpanded] =
    reactExports.useState(false);
  const expanded = controlledExpanded ?? uncontrolledExpanded;
  const active2 = isActive2 ?? true;
  const configRef = reactExports.useRef(config2);
  configRef.current = config2;
  const widthStorage = reactExports.useMemo(
    () => ({
      read: () => configRef.current.canvasSidebarWidth,
      write: (value) =>
        setConfig((prev) => ({
          ...prev,
          canvasSidebarWidth: value,
        })),
    }),
    [setConfig],
  );
  const {
    width,
    onMouseDown: handleResizeMouseDown,
    onValueChange: handleResizeValueChange,
    reset: handleResetWidth,
  } = useResizableWidth({
    defaultWidth: CONTENT_PANEL_DEFAULT_WIDTH,
    minWidth: CONTENT_PANEL_MIN_WIDTH,
    maxWidth: CONTENT_PANEL_MAX_WIDTH,
    storage: widthStorage,
    externalValue: config2.canvasSidebarWidth,
    invertDelta: resizeFrom === "left",
  });
  const handleTogglePanel = reactExports.useCallback(() => {
    const next2 = !expanded;
    if (controlledExpanded === void 0) setUncontrolledExpanded(next2);
    onExpandedChange?.(next2);
  }, [controlledExpanded, expanded, onExpandedChange]);
  const shouldOpen = active2 && expanded;
  const [contentMounted, setContentMounted] = reactExports.useState(shouldOpen);
  const [panelPhase, setPanelPhase] = reactExports.useState(
    shouldOpen ? "open" : "closed",
  );
  const contentMountedRef = reactExports.useRef(contentMounted);
  contentMountedRef.current = contentMounted;
  reactExports.useEffect(() => {
    if (!active2) {
      setContentMounted(false);
      setPanelPhase("closed");
      return;
    }
    if (expanded) {
      setContentMounted(true);
      setPanelPhase("opening");
      let innerFrame = 0;
      const frame2 = requestAnimationFrame(() => {
        innerFrame = requestAnimationFrame(() => setPanelPhase("open"));
      });
      return () => {
        cancelAnimationFrame(frame2);
        cancelAnimationFrame(innerFrame);
      };
    }
    if (!contentMountedRef.current) {
      setPanelPhase("closed");
      return;
    }
    setPanelPhase("closing");
    const timeout2 = window.setTimeout(() => {
      setPanelPhase("closed");
    }, PANEL_TRANSITION_FALLBACK_MS);
    return () => window.clearTimeout(timeout2);
  }, [active2, expanded]);
  const handleContentTransitionEnd = reactExports.useCallback(
    (event) => {
      if (
        event.currentTarget !== event.target ||
        event.propertyName !== "transform"
      )
        return;
      if (panelPhase !== "closing") return;
      setPanelPhase("closed");
    },
    [panelPhase],
  );
  return {
    active: active2,
    expanded,
    width,
    contentMounted,
    panelIsOpen: shouldOpen && panelPhase === "open",
    handleTogglePanel,
    handleResizeMouseDown,
    handleResizeValueChange,
    handleResetWidth,
    handleContentTransitionEnd,
  };
}
