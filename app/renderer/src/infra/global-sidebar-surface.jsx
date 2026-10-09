// global-sidebar-surface.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  GLOBAL_SIDEBAR_MAX_WIDTH,
  GLOBAL_SIDEBAR_MIN_WIDTH,
  GLOBAL_SIDEBAR_RAIL_WIDTH,
} from "../workspace/set-home-widget-dev-preview-mode.js";
import { cn$2, useBrowserHoverPreview } from "./dialog-content.jsx";
import { useWindowChrome } from "../workspace/offline-banner.jsx";
import {
  GLOBAL_SIDEBAR_PREVIEW_EDGE_HIT_WIDTH,
  useGlobalSidebar,
} from "../media-editing/derive-session-task-snapshot.jsx";
import { HomeSidebar } from "../workspace/home-sidebar.jsx";

const GLOBAL_SIDEBAR_PREVIEW_PANEL_INSET = 4;

const GLOBAL_SIDEBAR_DOCKED_FOOTER_HEIGHT = 56;

const GLOBAL_SIDEBAR_RAIL_FOOTER_HEIGHT = 136;

const SIDEBAR_USER_MENU_PREVIEW_HOLD = "sidebar-user-menu";

export function GlobalSidebarSurface() {
  const {
    width,
    collapsed,
    previewOpen,
    previewOpening,
    previewClosing,
    openPreview,
    keepPreviewOpen,
    schedulePreviewClose,
    completePreviewClose,
    holdPreviewOpen,
    releasePreviewHold,
    onResizeMouseDown,
    onResizeValueChange,
    resetWidth,
  } = useGlobalSidebar();
  const { hasReservedTitlebar, needsTrafficLightSpacer } = useWindowChrome();
  const railMode = collapsed;
  const browserPreviewReady = useBrowserHoverPreview(
    railMode && (previewOpening || previewOpen),
  );
  const floatingPreview = railMode && previewOpen && browserPreviewReady;
  const previewExpanded = floatingPreview && !previewClosing;
  const previewInteractionBridge = floatingPreview;
  const previewContentWidth = railMode
    ? width + GLOBAL_SIDEBAR_PREVIEW_EDGE_HIT_WIDTH
    : width;
  const previewContentClipRight =
    previewContentWidth - GLOBAL_SIDEBAR_RAIL_WIDTH;
  const previewVisualClipRight =
    width - (GLOBAL_SIDEBAR_RAIL_WIDTH - GLOBAL_SIDEBAR_PREVIEW_PANEL_INSET);
  const previewSurfaceWidth = railMode
    ? previewInteractionBridge
      ? previewContentWidth
      : width + GLOBAL_SIDEBAR_PREVIEW_PANEL_INSET
    : width;
  const previewContentClipPath = railMode
    ? previewExpanded
      ? "inset(0px 0px 0px 0px)"
      : `inset(0px ${previewContentClipRight}px 0px 0px)`
    : void 0;
  const previewVisualClipPath =
    railMode && !previewExpanded
      ? `inset(0px ${previewVisualClipRight}px 0px 0px)`
      : "inset(0px 0px 0px 0px)";
  const isSidebarHoverRegion = (target) =>
    target instanceof Element &&
    Boolean(target.closest('[data-global-sidebar-hover-region="true"]'));
  const handleSidebarOverlayOpenChange = reactExports.useCallback(
    (open) => {
      if (open) holdPreviewOpen(SIDEBAR_USER_MENU_PREVIEW_HOLD);
      else releasePreviewHold(SIDEBAR_USER_MENU_PREVIEW_HOLD);
    },
    [holdPreviewOpen, releasePreviewHold],
  );
  const handleSurfaceBlur = (event) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget))
      return;
    if (isSidebarHoverRegion(nextTarget)) return;
    schedulePreviewClose();
  };
  const handleSurfaceMouseLeave = (event) => {
    if (isSidebarHoverRegion(event.relatedTarget)) return;
    if (floatingPreview) {
      const surfaceRect = event.currentTarget.getBoundingClientRect();
      const visiblePreviewRight =
        surfaceRect.left + width + GLOBAL_SIDEBAR_PREVIEW_PANEL_INSET;
      const pointerStillInsidePreview =
        event.clientX >= surfaceRect.left &&
        event.clientX <= visiblePreviewRight &&
        event.clientY >= surfaceRect.top &&
        event.clientY <= surfaceRect.bottom;
      if (pointerStillInsidePreview) return;
    }
    schedulePreviewClose();
  };
  const handleSurfaceMouseMove = (event) => {
    if (!floatingPreview) return;
    if (document.documentElement.dataset.columnResizeActive === "true") return;
    if (isSidebarHoverRegion(event.target)) return;
    if (
      !(event.target instanceof Node) ||
      !event.currentTarget.contains(event.target)
    )
      return;
    const visiblePreviewRight =
      event.currentTarget.getBoundingClientRect().left +
      width +
      GLOBAL_SIDEBAR_PREVIEW_PANEL_INSET;
    if (event.clientX > visiblePreviewRight) schedulePreviewClose();
  };
  return (
    <div
      className="relative z-50 h-full shrink-0"
      style={{
        width: railMode ? GLOBAL_SIDEBAR_RAIL_WIDTH : width,
      }}
      data-action-ui-id="global-sidebar-dock"
      data-collapsed={railMode ? "true" : "false"}
      data-mode={railMode ? "rail" : "pinned"}
    >
      <div
        aria-hidden="true"
        className="global-sidebar-footer-divider pointer-events-none absolute z-40 h-px"
        data-action-ui-id="global-sidebar-footer-divider"
        style={
          floatingPreview
            ? {
                bottom: GLOBAL_SIDEBAR_DOCKED_FOOTER_HEIGHT,
                left: GLOBAL_SIDEBAR_PREVIEW_PANEL_INSET,
                width,
              }
            : railMode
              ? {
                  bottom: GLOBAL_SIDEBAR_RAIL_FOOTER_HEIGHT,
                  left: 0,
                  width:
                    GLOBAL_SIDEBAR_RAIL_WIDTH +
                    GLOBAL_SIDEBAR_PREVIEW_EDGE_HIT_WIDTH,
                }
              : {
                  bottom: GLOBAL_SIDEBAR_DOCKED_FOOTER_HEIGHT,
                  left: 0,
                  width: width + GLOBAL_SIDEBAR_PREVIEW_EDGE_HIT_WIDTH,
                }
        }
      />
      <div
        className={cn$2(
          "absolute inset-y-0 left-0",
          previewInteractionBridge
            ? "no-drag pointer-events-auto z-50"
            : "pointer-events-none",
        )}
        style={{
          width: previewSurfaceWidth,
        }}
        data-action-ui-id="global-sidebar-surface"
        data-overlay={floatingPreview ? "true" : "false"}
        data-preview-opening={previewOpening ? "true" : "false"}
        data-preview-closing={previewClosing ? "true" : "false"}
        data-interaction-bridge={previewInteractionBridge ? "true" : "false"}
        data-presentation={
          floatingPreview ? "floating-preview" : railMode ? "rail" : "docked"
        }
        onMouseEnter={() => {
          if (railMode && !previewOpen) openPreview();
          else if (floatingPreview) keepPreviewOpen();
        }}
        onMouseMove={handleSurfaceMouseMove}
        onMouseLeave={handleSurfaceMouseLeave}
        onFocus={() => {
          if (railMode && !previewOpen) openPreview();
          else if (floatingPreview) keepPreviewOpen();
        }}
        onBlur={handleSurfaceBlur}
      >
        <div
          className={cn$2(
            "transparent-window-floating-sidebar elevated-surface-border pointer-events-none absolute inset-y-1 left-1 rounded-xl transition-[clip-path,opacity,box-shadow] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            previewExpanded ? "duration-[160ms]" : "duration-0",
            previewExpanded ? "opacity-100 shadow-lg" : "opacity-0 shadow-none",
          )}
          style={{
            width,
            clipPath: previewVisualClipPath,
            willChange: railMode ? "clip-path, opacity" : void 0,
          }}
          data-action-ui-id="global-sidebar-visual-panel"
          data-presentation={
            floatingPreview ? "floating-preview" : railMode ? "rail" : "docked"
          }
          aria-hidden="true"
        />
        <div
          className={cn$2(
            "pointer-events-auto absolute inset-y-0 left-0 transition-[clip-path] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            previewExpanded ? "duration-[160ms]" : "duration-0",
            railMode ? "overflow-hidden" : "overflow-visible",
          )}
          style={{
            width: previewContentWidth,
            clipPath: previewContentClipPath,
            willChange: railMode ? "clip-path" : void 0,
          }}
          data-action-ui-id="global-sidebar-content"
          data-preview-expanded={previewExpanded ? "true" : "false"}
          onTransitionEnd={(event) => {
            if (
              previewClosing &&
              event.target === event.currentTarget &&
              (event.propertyName === "clip-path" ||
                event.propertyName === "-webkit-clip-path")
            ) {
              completePreviewClose();
            }
          }}
        >
          <div
            className="h-full"
            style={{
              width,
            }}
          >
            <HomeSidebar
              width={width}
              topChromeInset={needsTrafficLightSpacer && !hasReservedTitlebar}
              presentation={
                floatingPreview
                  ? "floating-preview"
                  : railMode
                    ? "rail"
                    : "docked"
              }
              minWidth={GLOBAL_SIDEBAR_MIN_WIDTH}
              maxWidth={GLOBAL_SIDEBAR_MAX_WIDTH}
              onResizeMouseDown={onResizeMouseDown}
              onResizeValueChange={onResizeValueChange}
              onResetWidth={resetWidth}
              onPreviewInteractionEnter={keepPreviewOpen}
              onPreviewInteractionLeave={schedulePreviewClose}
              onOverlayOpenChange={handleSidebarOverlayOpenChange}
              holdPreviewOpen={holdPreviewOpen}
              releasePreviewHold={releasePreviewHold}
              loadRecentThumbnails={!railMode || previewExpanded}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
