// canvas-view-controls.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { Tooltip } from "../generation/missing-asset-card.jsx";
import {
  ChevronRight$1 as ChevronRight,
  CompositedSvg,
  Grid2X2,
  LayoutTemplate,
  Library,
  Map$1 as Map,
  MonochromeIcon,
  reactExports,
  useStore$3 as useStore,
  useTranslation,
  Workflow,
  X$7 as X,
} from "../vendor.js";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSubTrigger,
} from "../media-editing/audio-lightbox.jsx";
import {
  DropdownMenu,
  DropdownMenuSub,
  DropdownMenuTrigger,
} from "../media-editing/use-warn-missing-asset-meta.jsx";
import {
  QuickZoomPresence,
  TidyHint,
} from "./canvas-high-blast-delete-dialog.jsx";
import { TidyLayoutMenuItems } from "./tidy-layout-menu-items.jsx";
import { ToolbarSeparator } from "./canvas-toolbar-extension-button.jsx";
import { ZoomMenu } from "./zoom-menu.jsx";
import { TooltipProvider } from "../infra/create-recently-added-store.js";
import { DEFAULT_CANVAS_VIEWPORT_CONTROLS_PLACEMENT } from "./use-video-starter-preset-store.js";
import { useAlignmentSnapPreferenceStore } from "./use-active-mode.js";
import { CanvasToggleIcon } from "./canvas-toggle-icon.jsx";
const APPEARANCE_PANEL_POSITION_CLASSES = {
  "bottom-left": "bottom-full left-0 mb-2",
  "top-left": "top-full left-0 mt-2",
  "top-right": "top-full right-0 mt-2",
};
function getCanvasAppearancePanelPositionClass(placement) {
  return APPEARANCE_PANEL_POSITION_CLASSES[placement];
}
function TidyCategoryIcon(props) {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      {...props}
    >
      <path
        d="M6.02878 10.4572C6.02854 10.0377 5.68762 9.69649 5.26804 9.69649H3.18112C2.76155 9.6965 2.4216 10.0377 2.42136 10.4572V12.5441C2.42136 12.9639 2.7614 13.3039 3.18112 13.3039H5.26804C5.68777 13.3039 6.02878 12.9639 6.02878 12.5441V10.4572ZM11.8979 8.59688C13.4341 8.67492 14.6557 9.94556 14.6557 11.5012L14.6518 11.6506C14.5738 13.1867 13.3039 14.4081 11.7485 14.4084L11.5981 14.4045C10.1115 14.329 8.9197 13.1372 8.84421 11.6506L8.8403 11.5012C8.8403 9.89527 10.1426 8.59297 11.7485 8.59297L11.8979 8.59688ZM11.7485 9.83321C10.8274 9.83321 10.0805 10.5801 10.0805 11.5012C10.0808 12.422 10.8276 13.1682 11.7485 13.1682C12.6692 13.1679 13.4155 12.4218 13.4155 11.5012C13.4155 10.5803 12.6693 9.83349 11.7485 9.83321ZM7.26804 12.5441C7.26804 13.6487 6.37261 14.5441 5.26804 14.5441H3.18112C2.14549 14.5441 1.29413 13.7569 1.19186 12.7482L1.18112 12.5441V10.4572C1.18136 9.35288 2.07671 8.45725 3.18112 8.45723H5.26804C6.37246 8.45723 7.2678 9.35286 7.26804 10.4572V12.5441Z"
        fill="currentColor"
      />
      <path
        d="M7.67947 2.0106C7.83074 1.79442 8.15125 1.79442 8.30252 2.0106L11.201 6.15318C11.3771 6.40494 11.1976 6.75055 10.8904 6.75084H5.09256C4.78516 6.75084 4.6048 6.40504 4.78104 6.15318L7.67947 2.0106Z"
        stroke="currentColor"
        strokeWidth="1.24"
      />
    </CompositedSvg>
  );
}
function TidyLayoutIcon(props) {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      {...props}
    >
      <path
        d="M5.345 10.0625C6.44954 10.0625 7.34495 10.958 7.345 12.0625V12.5L7.33426 12.7041C7.23876 13.6456 6.49062 14.3938 5.5491 14.4893L5.345 14.5H3.345C2.24043 14.5 1.345 13.6046 1.345 12.5V12.0625C1.345 10.958 2.24043 10.0625 3.345 10.0625H5.345ZM3.345 11.3027C2.9253 11.3027 2.58529 11.6428 2.58524 12.0625V12.5C2.58529 12.9197 2.9253 13.2598 3.345 13.2598H5.345C5.76471 13.2598 6.10472 12.9197 6.10477 12.5V12.0625C6.10472 11.6428 5.76471 11.3027 5.345 11.3027H3.345ZM5.345 1C6.44957 1 7.345 1.89543 7.345 3V6.75C7.345 7.78567 6.55781 8.638 5.5491 8.74023L5.345 8.75H3.345C2.24043 8.75 1.345 7.78567 1.345 6.75V3C1.345 1.89543 2.24043 1 3.345 1H5.345ZM3.345 2.24023C2.92527 2.24023 2.58524 2.58026 2.58524 3V6.75C2.58524 7.16974 2.92526 7.51074 3.345 7.51074H5.345C5.76474 7.51074 6.10477 7.16974 6.10477 6.75V3C6.10477 2.58026 5.76474 2.24023 5.345 2.24023H3.345Z"
        fill="currentColor"
      />
      <path
        d="M12.655 5.4375C13.7595 5.4375 14.6549 4.54203 14.655 3.4375V3L14.6443 2.7959C14.5488 1.85439 13.8006 1.1062 12.8591 1.01074L12.655 1H10.655L10.4509 1.01074C9.50938 1.1062 8.76124 1.85439 8.66574 2.7959L8.655 3V3.4375C8.65505 4.54203 9.55046 5.4375 10.655 5.4375H12.655ZM10.655 4.19727C10.2353 4.19727 9.89528 3.85719 9.89523 3.4375V3C9.89528 2.58031 10.2353 2.24023 10.655 2.24023H12.655C13.0747 2.24023 13.4147 2.58031 13.4148 3V3.4375C13.4147 3.85719 13.0747 4.19727 12.655 4.19727H10.655ZM12.655 14.5C13.7596 14.5 14.655 13.6046 14.655 12.5V8.75C14.655 7.71433 13.8678 6.862 12.8591 6.75977L12.655 6.75H10.655L10.4509 6.75977C9.44219 6.862 8.655 7.71433 8.655 8.75V12.5C8.655 13.6046 9.55043 14.5 10.655 14.5H12.655ZM10.655 13.2598C10.2353 13.2598 9.89523 12.9197 9.89523 12.5V8.75C9.89523 8.33026 10.2353 7.98926 10.655 7.98926H12.655C13.0747 7.98926 13.4148 8.33026 13.4148 8.75V12.5C13.4148 12.9197 13.0747 13.2598 12.655 13.2598H10.655Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
const MENU_CONTENT_CLASS =
  "min-w-[200px] border border-[var(--canvas-controls-border)] [border-width:var(--divider-width)]";
function CanvasTidyControlInner({
  onSortByConnections,
  onSortByMediaType,
  onTidyLayout,
  placement,
}) {
  const { t: t2 } = useTranslation();
  const label = t2("canvas.tidy");
  const menuSide = placement === "bottom-left" ? "top" : "bottom";
  const menuAlign = "start";
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  const handleTidyLayout = reactExports.useCallback(
    (layout, includeDeps) => {
      setMenuOpen(false);
      return onTidyLayout(layout, includeDeps);
    },
    [onTidyLayout],
  );
  const handleSortByConnections = reactExports.useCallback(() => {
    setMenuOpen(false);
    return onSortByConnections();
  }, [onSortByConnections]);
  const handleSortByMediaType = reactExports.useCallback(() => {
    setMenuOpen(false);
    return onSortByMediaType();
  }, [onSortByMediaType]);
  const connectionsHintId = reactExports.useId();
  const mediaTypeHintId = reactExports.useId();
  const connectionsHint = t2(
    "canvas.tidy.sort.connections.hint",
    "有连线依赖的节点按上下游排在上方，离散节点收拢到下方",
  );
  const mediaTypeHint = t2(
    "canvas.tidy.sort.mediaType.hint",
    "按图片 / 视频 / 音频 / 文本 等素材类型分成多条泳道，不考虑连线",
  );
  return (
    <div className="relative h-full">
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <Tooltip content={label} closeOnClick={true}>
          <DropdownMenuTrigger
            type="button"
            aria-label={label}
            data-action-ui-id="canvas.toolbar-tidy"
            data-canvas-control-kind="panel"
            className="flex aspect-square h-full shrink-0 cursor-pointer items-center justify-center rounded-md p-0 text-[var(--canvas-controls-text-muted)] transition-colors hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] data-popup-open:bg-[var(--canvas-controls-active)] data-popup-open:text-[var(--canvas-controls-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <LayoutTemplate size={15} strokeWidth={1.5} aria-hidden="true" />
          </DropdownMenuTrigger>
        </Tooltip>
        <DropdownMenuContent
          data-action-ui-id="canvas.toolbar-tidy-menu"
          side={menuSide}
          sideOffset={8}
          align={menuAlign}
          className={MENU_CONTENT_CLASS}
        >
          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              data-action-ui-id="canvas.toolbar-tidy-sort"
              className="cursor-pointer gap-2 rounded-md px-3 py-2 text-xs tracking-tight"
            >
              <TidyCategoryIcon
                aria-hidden="true"
                className="shrink-0 text-[var(--canvas-controls-text-muted)]"
              />
              <span className="whitespace-nowrap text-[var(--canvas-controls-text)]">
                {t2("canvas.tidy.sort", "分类整理")}
              </span>
              <ChevronRight
                className="ml-auto text-[var(--canvas-controls-text-muted)] opacity-60"
                size={14}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </DropdownMenuSubTrigger>
            <DropdownMenuContent
              data-action-ui-id="canvas.toolbar-tidy-sort-menu"
              side="right"
              sideOffset={8}
              align="start"
              className={MENU_CONTENT_CLASS}
            >
              <DropdownMenuItem
                data-action-ui-id="canvas.toolbar-tidy-sort-connections"
                onClick={() => void handleSortByConnections()}
                aria-describedby={connectionsHintId}
                className="cursor-pointer gap-2 rounded-md px-3 py-2 text-xs tracking-tight"
              >
                <Workflow
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="text-[var(--canvas-controls-text-muted)]"
                />
                <span className="whitespace-nowrap text-[var(--canvas-controls-text)]">
                  {t2("canvas.tidy.sort.connections", "按连线关系")}
                </span>
                <TidyHint hint={connectionsHint} hintId={connectionsHintId} />
              </DropdownMenuItem>
              <DropdownMenuItem
                data-action-ui-id="canvas.toolbar-tidy-sort-media-type"
                onClick={() => void handleSortByMediaType()}
                aria-describedby={mediaTypeHintId}
                className="cursor-pointer gap-2 rounded-md px-3 py-2 text-xs tracking-tight"
              >
                <Library
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="text-[var(--canvas-controls-text-muted)]"
                />
                <span className="whitespace-nowrap text-[var(--canvas-controls-text)]">
                  {t2("canvas.tidy.sort.mediaType", "按素材类型")}
                </span>
                <TidyHint hint={mediaTypeHint} hintId={mediaTypeHintId} />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              data-action-ui-id="canvas.toolbar-tidy-layouts"
              className="cursor-pointer gap-2 rounded-md px-3 py-2 text-xs tracking-tight"
            >
              <TidyLayoutIcon
                aria-hidden="true"
                className="shrink-0 text-[var(--canvas-controls-text-muted)]"
              />
              <span className="whitespace-nowrap text-[var(--canvas-controls-text)]">
                {t2("canvas.tidy.layouts", "布局整理")}
              </span>
              <ChevronRight
                className="ml-auto text-[var(--canvas-controls-text-muted)] opacity-60"
                size={14}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </DropdownMenuSubTrigger>
            <DropdownMenuContent
              data-action-ui-id="canvas.toolbar-tidy-layout-menu"
              side="right"
              sideOffset={8}
              align="start"
              className={MENU_CONTENT_CLASS}
            >
              <TidyLayoutMenuItems
                onTidy={handleTidyLayout}
                showIncludeDeps={true}
                uiIdPrefix="canvas.toolbar-tidy"
              />
            </DropdownMenuContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
const CanvasTidyControl = reactExports.memo(CanvasTidyControlInner);
const zoomSelector = (s2) => s2.transform[2];
function ToolbarButton({
  children: children2,
  onClick,
  tooltip,
  disabled: disabled2,
  kind = "action",
  pressed,
  ariaLabel,
  dataActionUiId,
  compact = false,
  iconOnly = false,
  highlightPressed = true,
}) {
  const active2 = kind === "toggle" && pressed && highlightPressed;
  return (
    <Tooltip content={tooltip} closeOnClick={true}>
      <button
        type="button"
        data-action-ui-id={dataActionUiId}
        onClick={onClick}
        disabled={disabled2}
        aria-pressed={kind === "toggle" ? pressed : void 0}
        aria-label={ariaLabel}
        data-canvas-control-kind={kind}
        className={`${highlightPressed ? "canvas-monochrome-control" : "canvas-monochrome-control-hover"} flex items-center rounded-md text-xs select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${compact ? "size-6 justify-center p-0" : iconOnly ? "aspect-square h-full shrink-0 justify-center p-0" : "h-full gap-1.5 px-2"} ${disabled2 ? "cursor-default text-[var(--canvas-controls-text-muted)] opacity-30" : active2 ? "cursor-pointer bg-[var(--canvas-controls-active)] text-[var(--canvas-controls-text)] hover:bg-[var(--canvas-controls-active)]" : "cursor-pointer text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"}`}
      >
        {children2}
      </button>
    </Tooltip>
  );
}
export function CanvasViewControls({
  onSortByConnections,
  onSortByMediaType,
  onTidyLayout,
  onZoomIn,
  onZoomOut,
  onFitView,
  onZoomTo,
  onToggleMinimap,
  minimapVisible,
  appearancePanel,
  onAppearanceOpen,
  onToggleEdges,
  edgesVisible,
  leading,
  trailing,
  minZoom,
  maxZoom,
  placement = DEFAULT_CANVAS_VIEWPORT_CONTROLS_PLACEMENT,
}) {
  const alignmentSnapEnabled = useAlignmentSnapPreferenceStore(
    (state2) => state2.enabled,
  );
  const toggleAlignmentSnap = useAlignmentSnapPreferenceStore(
    (state2) => state2.toggle,
  );
  const zoomLevel = useStore(zoomSelector);
  const zoomPercent = `${Math.round(zoomLevel * 100)}%`;
  const atMinZoom = zoomLevel <= minZoom + 0.01;
  const atMaxZoom = zoomLevel >= maxZoom - 0.01;
  const [appearanceOpen, setAppearanceOpen] = reactExports.useState(false);
  const appearanceTriggerRef = reactExports.useRef(null);
  const appearancePanelRef = reactExports.useRef(null);
  const appearancePanelId = reactExports.useId();
  const { t: t2 } = useTranslation();
  reactExports.useEffect(() => {
    if (!appearanceOpen) return;
    const onPointerDown2 = (event) => {
      const target = event.target;
      if (
        !appearanceTriggerRef.current?.contains(target) &&
        !appearancePanelRef.current?.contains(target)
      ) {
        setAppearanceOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown2);
    return () => document.removeEventListener("pointerdown", onPointerDown2);
  }, [appearanceOpen]);
  reactExports.useEffect(() => {
    if (!appearanceOpen) return;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setAppearanceOpen(false);
      appearanceTriggerRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [appearanceOpen]);
  reactExports.useEffect(() => {
    if (!appearanceOpen) return;
    appearancePanelRef.current?.querySelector("button:not(:disabled)")?.focus({
      preventScroll: true,
    });
  }, [appearanceOpen]);
  const toggleAppearancePanel = () => {
    setAppearanceOpen((current2) => {
      if (!current2) onAppearanceOpen?.();
      return !current2;
    });
  };
  return (
    <TooltipProvider delay={150} closeDelay={0}>
      <div className="relative flex items-center gap-[6px]">
        {leading && (
          <div
            className="flex h-8 items-center gap-px rounded-lg border border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] px-1.5 py-0.5 empty:hidden [border-width:var(--divider-width)]"
            data-canvas-toolbar-group="labels"
          >
            {leading}
          </div>
        )}
        <div className="relative flex h-8 items-center gap-px rounded-lg border border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] p-0.5 [border-width:var(--divider-width)]">
          <div
            className="flex h-full items-center"
            data-canvas-toolbar-group="zoom"
          >
            <ZoomMenu
              zoomPercent={zoomPercent}
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              onFitView={onFitView}
              onZoomTo={onZoomTo}
              atMinZoom={atMinZoom}
              atMaxZoom={atMaxZoom}
              minZoom={minZoom}
              maxZoom={maxZoom}
              placement={placement}
            />
          </div>
          <ToolbarSeparator className="mx-0" />
          <div
            className="flex h-full items-center"
            data-canvas-toolbar-group="tidy"
          >
            <CanvasTidyControl
              onSortByConnections={onSortByConnections}
              onSortByMediaType={onSortByMediaType}
              onTidyLayout={onTidyLayout}
              placement={placement}
            />
          </div>
          {trailing && (
            <div
              className="flex h-full items-center gap-px"
              data-canvas-toolbar-group="extensions"
            >
              {trailing}
            </div>
          )}
          <div
            className="flex h-full items-center gap-px"
            data-canvas-toolbar-group="view"
          >
            <Tooltip
              content={t2("canvas.toolbar.canvasSettings")}
              closeOnClick={true}
            >
              <button
                ref={appearanceTriggerRef}
                type="button"
                data-action-ui-id="canvas.toolbar-appearance"
                data-canvas-control-kind="panel"
                onClick={toggleAppearancePanel}
                aria-label={t2("canvas.toolbar.canvasSettings")}
                aria-haspopup="dialog"
                aria-expanded={appearanceOpen}
                aria-controls={appearancePanelId}
                className={`canvas-monochrome-control flex aspect-square h-full shrink-0 cursor-pointer items-center justify-center rounded-md p-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${appearanceOpen ? "bg-[var(--canvas-controls-active)] text-[var(--canvas-controls-text)]" : "text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"}`}
              >
                <MonochromeIcon tone="control">
                  <Grid2X2 size={15} strokeWidth={1.5} aria-hidden="true" />
                </MonochromeIcon>
              </button>
            </Tooltip>
            <ToolbarButton
              dataActionUiId="canvas.toolbar-edges"
              kind="toggle"
              iconOnly={true}
              highlightPressed={false}
              onClick={onToggleEdges}
              tooltip={
                edgesVisible ? t2("canvas.edges.hide") : t2("canvas.edges.show")
              }
              ariaLabel={
                edgesVisible ? t2("canvas.edges.hide") : t2("canvas.edges.show")
              }
              pressed={edgesVisible}
            >
              <CanvasToggleIcon kind="edges" enabled={edgesVisible} />
            </ToolbarButton>
            <ToolbarButton
              dataActionUiId="canvas.toolbar-alignment-snap"
              kind="toggle"
              iconOnly={true}
              highlightPressed={false}
              onClick={toggleAlignmentSnap}
              tooltip={
                alignmentSnapEnabled
                  ? t2("canvas.alignmentSnap.disable")
                  : t2("canvas.alignmentSnap.enable")
              }
              ariaLabel={t2("canvas.alignmentSnap.label")}
              pressed={alignmentSnapEnabled}
            >
              <CanvasToggleIcon kind="snap" enabled={alignmentSnapEnabled} />
            </ToolbarButton>
            <ToolbarButton
              dataActionUiId="canvas.toolbar-minimap"
              kind="toggle"
              onClick={onToggleMinimap}
              tooltip={
                minimapVisible
                  ? t2("canvas.minimap.hide")
                  : t2("canvas.minimap.show")
              }
              pressed={minimapVisible}
              ariaLabel={t2("canvas.minimap")}
            >
              <MonochromeIcon tone="control">
                <Map size={15} strokeWidth={1.5} aria-hidden="true" />
              </MonochromeIcon>
              <span className="@max-[640px]/canvas-shell:hidden">
                {t2("canvas.minimap")}
              </span>
            </ToolbarButton>
          </div>
          <QuickZoomPresence
            value={appearanceOpen ? true : null}
            elementRef={appearancePanelRef}
          >
            {(_2, motionProps) => (
              <div
                {...motionProps}
                id={appearancePanelId}
                data-action-ui-id="canvas.appearance-panel"
                role="dialog"
                aria-label={t2("canvas.toolbar.canvasSettings")}
                className={`dp-motion-quick-zoom absolute z-50 w-[min(288px,calc(100vw-24px))] rounded-lg border p-2.5 shadow-[var(--canvas-shadow-menu)] ${getCanvasAppearancePanelPositionClass(placement)}`}
                style={{
                  transformOrigin:
                    placement === "bottom-left"
                      ? "bottom left"
                      : placement === "top-right"
                        ? "top right"
                        : "top left",
                  background: "var(--canvas-controls-bg)",
                  borderColor: "var(--canvas-controls-border)",
                }}
              >
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-[var(--canvas-controls-text)]">
                    {t2("canvas.toolbar.canvasSettings")}
                  </span>
                  <button
                    type="button"
                    className="canvas-monochrome-control flex size-6 items-center justify-center rounded-full text-[var(--canvas-controls-text-muted)] transition-colors hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label={t2("common.close", "Close")}
                    title={t2("common.close", "Close")}
                    onClick={() => {
                      setAppearanceOpen(false);
                      appearanceTriggerRef.current?.focus();
                    }}
                  >
                    <MonochromeIcon tone="control">
                      <X size={14} strokeWidth={1.5} aria-hidden="true" />
                    </MonochromeIcon>
                  </button>
                </div>
                {appearancePanel}
              </div>
            )}
          </QuickZoomPresence>
        </div>
      </div>
    </TooltipProvider>
  );
}
