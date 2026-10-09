// zoom-menu.jsx
import {
  useTranslation,
  reactExports,
  CompositedSvg,
  useStore$3,
  DEFAULT_CANVAS_VIEWPORT_CONTROLS_PLACEMENT,
  useAlignmentSnapPreferenceStore,
  CANVAS_COMMAND_IDS,
  ChevronUp,
  MonochromeIcon,
  LayoutTemplate,
  ChevronRight$1,
  Workflow,
  Library,
  TooltipProvider$1,
  Grid2X2,
  Map$1,
  X$7,
  Plus,
  Hand,
  MousePointer2,
  Check,
} from "../vendor.js";
import {
  DropdownMenuItem$1,
  DropdownMenuSeparator$1,
  DropdownMenu$1,
  DropdownMenuTrigger$1,
  DropdownMenuContent$1,
  DropdownMenuSub$1,
  DropdownMenuSubTrigger$1,
} from "../m01/use-lightbox-media-actions.jsx";
import { Tooltip$1 } from "../m01/create-tracker.jsx";
import { cn$5 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { Input$1, CANVAS_ZOOM_PRESETS } from "../m03/use-plugin-host.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CanvasToggleIcon,
  MENU_CONTENT_CLASS,
  QuickZoomPresence,
  TidyCategoryIcon,
  TidyHint,
  TidyLayoutIcon,
  TidyLayoutMenuItems,
} from "./canvas-toggle-icon.jsx";
import {
  CANVAS_TOOL_DOCK_CONTROL_SIZE_PX,
  getCanvasAppearancePanelPositionClass,
  getCanvasZoomMenuPositionClass,
} from "./node-alignment-guides.jsx";
function SelectionTidyControlInner({ onTidy, showIncludeDeps }) {
  const { t: t2 } = useTranslation();
  const label = t2("canvas.tidy");
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  const handleTidy = reactExports.useCallback(
    (layout, includeDeps) => {
      setMenuOpen(false);
      return onTidy(layout, includeDeps);
    },
    [onTidy],
  );
  return (
    <div className="relative">
      <DropdownMenu$1 open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger$1
          type="button"
          title={label}
          aria-label={label}
          data-action-ui-id="canvas.selection-tidy"
          className="canvas-toolbar-action"
        >
          <LayoutTemplate size={20} strokeWidth={1.5} aria-hidden="true" />
          <span className="canvas-toolbar-label whitespace-nowrap">{label}</span>
        </DropdownMenuTrigger$1>
        <DropdownMenuContent$1
          data-action-ui-id="canvas.selection-tidy-menu"
          side="bottom"
          sideOffset={8}
          align="start"
          className="min-w-[200px]"
          variant="toolbar"
        >
          <TidyLayoutMenuItems
            onTidy={handleTidy}
            showIncludeDeps={showIncludeDeps}
            uiIdPrefix="canvas.selection-tidy"
          />
        </DropdownMenuContent$1>
      </DropdownMenu$1>
    </div>
  );
}
export const SelectionTidyControl = reactExports.memo(SelectionTidyControlInner);
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
      <DropdownMenu$1 open={menuOpen} onOpenChange={setMenuOpen}>
        <Tooltip$1 content={label} closeOnClick={true}>
          <DropdownMenuTrigger$1
            type="button"
            aria-label={label}
            data-action-ui-id="canvas.toolbar-tidy"
            data-canvas-control-kind="panel"
            className="flex aspect-square h-full shrink-0 cursor-pointer items-center justify-center rounded-md p-0 text-[var(--canvas-controls-text-muted)] transition-colors hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] data-popup-open:bg-[var(--canvas-controls-active)] data-popup-open:text-[var(--canvas-controls-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <LayoutTemplate size={15} strokeWidth={1.5} aria-hidden="true" />
          </DropdownMenuTrigger$1>
        </Tooltip$1>
        <DropdownMenuContent$1
          data-action-ui-id="canvas.toolbar-tidy-menu"
          side={menuSide}
          sideOffset={8}
          align={menuAlign}
          className={MENU_CONTENT_CLASS}
        >
          <DropdownMenuSub$1>
            <DropdownMenuSubTrigger$1
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
              <ChevronRight$1
                className="ml-auto text-[var(--canvas-controls-text-muted)] opacity-60"
                size={14}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </DropdownMenuSubTrigger$1>
            <DropdownMenuContent$1
              data-action-ui-id="canvas.toolbar-tidy-sort-menu"
              side="right"
              sideOffset={8}
              align="start"
              className={MENU_CONTENT_CLASS}
            >
              <DropdownMenuItem$1
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
              </DropdownMenuItem$1>
              <DropdownMenuItem$1
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
              </DropdownMenuItem$1>
            </DropdownMenuContent$1>
          </DropdownMenuSub$1>
          <DropdownMenuSeparator$1 />
          <DropdownMenuSub$1>
            <DropdownMenuSubTrigger$1
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
              <ChevronRight$1
                className="ml-auto text-[var(--canvas-controls-text-muted)] opacity-60"
                size={14}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </DropdownMenuSubTrigger$1>
            <DropdownMenuContent$1
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
            </DropdownMenuContent$1>
          </DropdownMenuSub$1>
        </DropdownMenuContent$1>
      </DropdownMenu$1>
    </div>
  );
}
const CanvasTidyControl = reactExports.memo(CanvasTidyControlInner);
export const StickerIcon = reactExports.forwardRef(function StickerIcon2(
  { size: size2 = 22, ...props },
  ref,
) {
  return (
    <CompositedSvg
      ref={ref}
      width={size2}
      height={size2}
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M0.75 10.75C0.75 16.273 5.227 20.75 10.75 20.75C11.398 20.75 12 20.45 12.458 19.992L19.992 12.458C20.45 12 20.75 11.398 20.75 10.75C20.75 5.227 16.273 0.75 10.75 0.75C5.227 0.75 0.75 5.227 0.75 10.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6.87793 13.2244C8.29599 14.2909 9.863 14.6169 11.2408 14.6169"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10.75 20.75C10.75 17.957 10.75 16.56 11.143 15.438C11.4903 14.4455 12.0568 13.5439 12.8004 12.8004C13.5439 12.0568 14.4455 11.4903 15.438 11.143C16.561 10.75 17.958 10.75 20.75 10.75"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6.85449 7.48438V8.95911"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14.7402 7.48438V8.95911"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </CompositedSvg>
  );
});
const zoomSelector = (s2) => s2.transform[2];
export function handleCanvasCommandPanelEscape(event, options) {
  if (event.key !== "Escape") return false;
  event.preventDefault();
  event.stopPropagation();
  if (options.isStickerPanel && options.stickerMode) {
    options.executeSelect();
  }
  options.closePanel();
  return true;
}
export function ToolbarSeparator({ large = false, className }) {
  return (
    <div
      className={cn$5(
        `w-px shrink-0 bg-[var(--canvas-controls-border)] ${large ? "mx-[2px] h-5" : "mx-px h-4"}`,
        className,
      )}
    />
  );
}
export function ToolbarTooltipContent({ label, shortcut }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{label}</span>
      {shortcut && (
        <kbd className="font-sans text-[10px] leading-none text-background/70">{shortcut}</kbd>
      )}
    </span>
  );
}
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
    <Tooltip$1 content={tooltip} closeOnClick={true}>
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
    </Tooltip$1>
  );
}
export const CanvasToolbarExtensionButton = reactExports.forwardRef(
  function CanvasToolbarExtensionButton2(
    {
      children: children2,
      label,
      tooltipContent = label,
      tooltipSide = "top",
      onClick,
      dataActionUiId,
      disabled: disabled2 = false,
      kind = "action",
      active: active2,
      controlsId,
      hasPopup,
      className,
      ...triggerProps
    },
    ref,
  ) {
    const selected2 = kind !== "action" && active2;
    return (
      <Tooltip$1 content={tooltipContent} side={tooltipSide} closeOnClick={true}>
        <button
          {...triggerProps}
          ref={ref}
          type="button"
          data-action-ui-id={dataActionUiId}
          data-canvas-control-kind={kind}
          aria-label={label}
          aria-pressed={kind === "toggle" ? active2 : void 0}
          aria-expanded={kind === "panel" ? active2 : void 0}
          aria-controls={kind === "panel" ? controlsId : void 0}
          aria-haspopup={kind === "panel" ? hasPopup : void 0}
          disabled={disabled2}
          onClick={onClick}
          className={`canvas-monochrome-control flex h-full min-w-8 items-center justify-center gap-1 rounded-full px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${disabled2 ? "cursor-default text-[var(--canvas-controls-text-muted)] opacity-30" : selected2 ? "cursor-pointer bg-[var(--canvas-controls-active)] text-[var(--canvas-controls-text)]" : "cursor-pointer text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"} ${className ?? ""}`}
        >
          {children2}
        </button>
      </Tooltip$1>
    );
  },
);
const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const modKey = isMac ? "⌘" : "Ctrl";
function ZoomMenu({
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onFitView,
  onZoomTo,
  atMinZoom,
  atMaxZoom,
  minZoom,
  maxZoom,
  placement,
}) {
  const [open, setOpen] = reactExports.useState(false);
  const [editing, setEditing] = reactExports.useState(false);
  const [inputValue, setInputValue] = reactExports.useState(zoomPercent.replace("%", ""));
  reactExports.useEffect(() => {
    if (!open) setEditing(false);
    if (!editing || !open) setInputValue(zoomPercent.replace("%", ""));
  }, [editing, open, zoomPercent]);
  const containerRef = reactExports.useRef(null);
  const triggerRef = reactExports.useRef(null);
  const menuRef = reactExports.useRef(null);
  const menuId = reactExports.useId();
  const { t: t2 } = useTranslation();
  const getEnabledMenuItems = reactExports.useCallback(
    () => Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]:not(:disabled)') ?? []),
    [],
  );
  reactExports.useEffect(() => {
    if (!open) return;
    const onPointerDown2 = (e2) => {
      if (containerRef.current && !containerRef.current.contains(e2.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown2);
    return () => document.removeEventListener("pointerdown", onPointerDown2);
  }, [open]);
  reactExports.useEffect(() => {
    if (!open) return;
    getEnabledMenuItems()[0]?.focus({
      preventScroll: true,
    });
  }, [getEnabledMenuItems, open]);
  const handleMenuKeyDown = reactExports.useCallback(
    (event) => {
      if (
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp" &&
        event.key !== "Home" &&
        event.key !== "End"
      ) {
        return;
      }
      const items = getEnabledMenuItems();
      if (items.length === 0) return;
      const currentIndex = items.indexOf(document.activeElement);
      let nextIndex;
      if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = items.length - 1;
      } else if (event.key === "ArrowDown") {
        nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
      } else {
        nextIndex =
          currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
      }
      event.preventDefault();
      event.stopPropagation();
      items[nextIndex]?.focus({
        preventScroll: true,
      });
    },
    [getEnabledMenuItems],
  );
  reactExports.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);
  const handleAction = reactExports.useCallback((action, event) => {
    action();
    setOpen(false);
    if (event.detail === 0) triggerRef.current?.focus();
    else triggerRef.current?.blur();
  }, []);
  return (
    <fieldset
      ref={containerRef}
      aria-label={t2("canvas.zoomControls")}
      className="relative m-0 flex h-full items-center border-0 p-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Tooltip$1 content={t2("canvas.zoom.adjust")} closeOnClick={true}>
        <button
          ref={triggerRef}
          type="button"
          data-action-ui-id="canvas.toolbar-zoom-menu"
          onClick={() => setOpen((v2) => !v2)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={`${t2("canvas.zoomControls")}: ${zoomPercent}`}
          data-canvas-control-kind="panel"
          className={`canvas-monochrome-control flex h-6 w-auto shrink-0 cursor-pointer select-none items-center justify-center rounded-md px-2 text-center text-xs tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${open ? "bg-[var(--canvas-controls-active)] text-[var(--canvas-controls-text)]" : "text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"}`}
        >
          <span className="inline-flex shrink-0 justify-center whitespace-nowrap">
            {zoomPercent}
          </span>
        </button>
      </Tooltip$1>
      <QuickZoomPresence value={open ? true : null} elementRef={menuRef}>
        {(_2, motionProps) => (
          <div
            {...motionProps}
            id={menuId}
            role="menu"
            tabIndex={-1}
            aria-label={t2("canvas.zoomControls")}
            onKeyDown={handleMenuKeyDown}
            className={`dp-motion-quick-zoom absolute ${getCanvasZoomMenuPositionClass(placement)} min-w-[180px] rounded-lg border p-1 shadow-md focus:outline-none`}
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
            <div className="mx-1 mb-1 flex h-8 items-center gap-1 rounded-md bg-[var(--canvas-controls-hover)] px-2 text-[var(--canvas-controls-text)]">
              <Input$1
                data-action-ui-id="canvas.zoom-menu-input"
                aria-label={t2("canvas.zoomControls")}
                type="text"
                inputMode="decimal"
                value={inputValue}
                readOnly={!editing}
                className={`h-8 border-0 px-0 text-xs tabular-nums shadow-none ${editing ? "" : "cursor-pointer caret-transparent"}`}
                onFocus={(event) => {
                  setEditing(true);
                  event.currentTarget.select();
                }}
                onChange={(event) => setInputValue(event.currentTarget.value)}
                onBlur={() => {
                  setEditing(false);
                  setInputValue(zoomPercent.replace("%", ""));
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") return;
                  event.stopPropagation();
                  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  const value = inputValue.trim();
                  if (/^\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value))) {
                    onZoomTo(Math.min(maxZoom, Math.max(minZoom, Number(value) / 100)));
                  }
                  menuRef.current?.focus({
                    preventScroll: true,
                  });
                }}
              />
              <span className="pointer-events-none shrink-0 text-xs">%</span>
            </div>
            <ZoomMenuItem
              dataActionUiId="canvas.zoom-menu-in"
              label={t2("canvas.zoomIn")}
              shortcut={`${modKey} +`}
              onClick={(event) => handleAction(onZoomIn, event)}
              disabled={atMaxZoom}
            />
            <ZoomMenuItem
              dataActionUiId="canvas.zoom-menu-out"
              label={t2("canvas.zoomOut")}
              shortcut={`${modKey} −`}
              onClick={(event) => handleAction(onZoomOut, event)}
              disabled={atMinZoom}
            />
            <ZoomMenuItem
              dataActionUiId="canvas.toolbar-fit"
              label={t2("canvas.fitToView")}
              shortcut={`${isMac ? "⇧" : "Shift"} 1`}
              onClick={(event) => handleAction(onFitView, event)}
            />
            <hr className="my-1 h-px border-0 bg-[var(--canvas-controls-border)]" />
            {CANVAS_ZOOM_PRESETS.map((level) => (
              <ZoomMenuItem
                key={level}
                label={`${Math.round(level * 100)}%`}
                onClick={(event) => handleAction(() => onZoomTo(level), event)}
              />
            ))}
          </div>
        )}
      </QuickZoomPresence>
    </fieldset>
  );
}
function ZoomMenuItem({ dataActionUiId, label, shortcut, onClick, disabled: disabled2 }) {
  return (
    <button
      type="button"
      data-action-ui-id={dataActionUiId}
      role="menuitem"
      tabIndex={-1}
      onClick={onClick}
      disabled={disabled2}
      className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${disabled2 ? "cursor-default text-[var(--canvas-controls-text-muted)] opacity-40" : "cursor-pointer text-[var(--canvas-controls-text)] hover:bg-[var(--canvas-controls-hover)]"}`}
    >
      <span>{label}</span>
      {shortcut && (
        <span className="ml-4 text-[11px] text-[var(--canvas-controls-text-muted)]">
          {shortcut}
        </span>
      )}
    </button>
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
  const alignmentSnapEnabled = useAlignmentSnapPreferenceStore((state2) => state2.enabled);
  const toggleAlignmentSnap = useAlignmentSnapPreferenceStore((state2) => state2.toggle);
  const zoomLevel = useStore$3(zoomSelector);
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
    <TooltipProvider$1 delay={150} closeDelay={0}>
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
          <div className="flex h-full items-center" data-canvas-toolbar-group="zoom">
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
          <div className="flex h-full items-center" data-canvas-toolbar-group="tidy">
            <CanvasTidyControl
              onSortByConnections={onSortByConnections}
              onSortByMediaType={onSortByMediaType}
              onTidyLayout={onTidyLayout}
              placement={placement}
            />
          </div>
          {trailing && (
            <div className="flex h-full items-center gap-px" data-canvas-toolbar-group="extensions">
              {trailing}
            </div>
          )}
          <div className="flex h-full items-center gap-px" data-canvas-toolbar-group="view">
            <Tooltip$1 content={t2("canvas.toolbar.canvasSettings")} closeOnClick={true}>
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
            </Tooltip$1>
            <ToolbarButton
              dataActionUiId="canvas.toolbar-edges"
              kind="toggle"
              iconOnly={true}
              highlightPressed={false}
              onClick={onToggleEdges}
              tooltip={edgesVisible ? t2("canvas.edges.hide") : t2("canvas.edges.show")}
              ariaLabel={edgesVisible ? t2("canvas.edges.hide") : t2("canvas.edges.show")}
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
              tooltip={minimapVisible ? t2("canvas.minimap.hide") : t2("canvas.minimap.show")}
              pressed={minimapVisible}
              ariaLabel={t2("canvas.minimap")}
            >
              <MonochromeIcon tone="control">
                <Map$1 size={15} strokeWidth={1.5} aria-hidden="true" />
              </MonochromeIcon>
              <span className="@max-[640px]/canvas-shell:hidden">{t2("canvas.minimap")}</span>
            </ToolbarButton>
          </div>
          <QuickZoomPresence value={appearanceOpen ? true : null} elementRef={appearancePanelRef}>
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
                      <X$7 size={14} strokeWidth={1.5} aria-hidden="true" />
                    </MonochromeIcon>
                  </button>
                </div>
                {appearancePanel}
              </div>
            )}
          </QuickZoomPresence>
        </div>
      </div>
    </TooltipProvider$1>
  );
}
export const TOOL_COMMANDS = [
  {
    id: CANVAS_COMMAND_IDS.addNode,
    icon: Plus,
    primary: true,
  },
];
export function ToolModeSplitButton({ commandRegistry, mode: mode2, labels }) {
  const [open, setOpen] = reactExports.useState(false);
  const containerRef = reactExports.useRef(null);
  const triggerRef = reactExports.useRef(null);
  const menuRef = reactExports.useRef(null);
  const menuId = reactExports.useId();
  const ActiveIcon = mode2 === "hand" ? Hand : MousePointer2;
  const getMenuItems = reactExports.useCallback(
    () => Array.from(menuRef.current?.querySelectorAll('[role="menuitemradio"]') ?? []),
    [],
  );
  reactExports.useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);
  reactExports.useEffect(() => {
    if (!open) return;
    const items = getMenuItems();
    (items.find((item) => item.getAttribute("aria-checked") === "true") ?? items[0])?.focus({
      preventScroll: true,
    });
  }, [getMenuItems, open]);
  const handleMenuKeyDown = reactExports.useCallback(
    (event) => {
      if (
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp" &&
        event.key !== "Home" &&
        event.key !== "End"
      ) {
        return;
      }
      const items = getMenuItems();
      if (items.length === 0) return;
      const currentIndex = items.indexOf(document.activeElement);
      let nextIndex;
      if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = items.length - 1;
      } else if (event.key === "ArrowDown") {
        nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
      } else {
        nextIndex =
          currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
      }
      event.preventDefault();
      event.stopPropagation();
      items[nextIndex]?.focus({
        preventScroll: true,
      });
    },
    [getMenuItems],
  );
  reactExports.useEffect(() => {
    if (!open) return;
    const handleKeyDown2 = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus({
        preventScroll: true,
      });
    };
    document.addEventListener("keydown", handleKeyDown2);
    return () => document.removeEventListener("keydown", handleKeyDown2);
  }, [open]);
  const choose = reactExports.useCallback(
    (id2, event) => {
      commandRegistry.execute(id2);
      setOpen(false);
      if (event.detail === 0)
        triggerRef.current?.focus({
          preventScroll: true,
        });
      else triggerRef.current?.blur();
    },
    [commandRegistry],
  );
  return (
    <fieldset
      ref={containerRef}
      aria-label={`${labels.move} / ${labels.hand}`}
      className="relative m-0 flex min-w-0 items-center rounded-md border-0 bg-transparent p-0"
      style={{
        height: CANVAS_TOOL_DOCK_CONTROL_SIZE_PX,
      }}
      data-interaction-mode={mode2}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Tooltip$1
        content={
          <ToolbarTooltipContent
            label={mode2 === "hand" ? labels.hand : labels.move}
            shortcut={mode2 === "hand" ? "H" : "V"}
          />
        }
      >
        <button
          type="button"
          data-action-ui-id="canvas.toolbar.move-mode"
          aria-label={mode2 === "hand" ? labels.hand : labels.move}
          onClick={() => {
            commandRegistry.execute(
              mode2 === "hand" ? CANVAS_COMMAND_IDS.handTool : CANVAS_COMMAND_IDS.select,
            );
            setOpen(false);
          }}
          className="flex items-center justify-center rounded-full text-[var(--canvas-controls-text)] transition-colors hover:bg-[var(--canvas-controls-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
          style={{
            width: CANVAS_TOOL_DOCK_CONTROL_SIZE_PX,
            height: CANVAS_TOOL_DOCK_CONTROL_SIZE_PX,
          }}
        >
          <ActiveIcon
            size={20}
            strokeWidth={1.5}
            className={mode2 === "hand" ? "scale-90" : void 0}
            aria-hidden="true"
          />
        </button>
      </Tooltip$1>
      <Tooltip$1
        content={
          <ToolbarTooltipContent label={`${labels.move} / ${labels.hand}`} shortcut="V / H" />
        }
      >
        <button
          ref={triggerRef}
          type="button"
          data-action-ui-id="canvas.toolbar.move-mode-menu"
          aria-label={`${labels.move} / ${labels.hand}`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((current2) => !current2)}
          className="canvas-monochrome-control-hover flex items-center justify-center rounded-full text-[var(--canvas-controls-text-muted)] transition-colors hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
          style={{
            height: CANVAS_TOOL_DOCK_CONTROL_SIZE_PX,
            width: 24,
          }}
        >
          <MonochromeIcon tone="control">
            <ChevronUp size={14} strokeWidth={1.5} aria-hidden="true" />
          </MonochromeIcon>
        </button>
      </Tooltip$1>
      <QuickZoomPresence value={open ? true : null} elementRef={menuRef}>
        {(_2, motionProps) => (
          <div
            {...motionProps}
            id={menuId}
            data-action-ui-id="canvas.toolbar.move-mode-options"
            className="dp-motion-quick-zoom absolute bottom-full left-0 z-50 mb-2 min-w-[176px] rounded-lg border p-1 shadow-[var(--canvas-shadow-menu)]"
            style={{
              transformOrigin: "bottom left",
              background: "var(--canvas-controls-bg)",
              borderColor: "var(--canvas-controls-border)",
              borderWidth: "var(--divider-width)",
            }}
            role="menu"
            aria-label={`${labels.move} / ${labels.hand}`}
            onKeyDown={handleMenuKeyDown}
          >
            <button
              type="button"
              role="menuitemradio"
              data-action-ui-id="canvas.toolbar.move-mode-select"
              tabIndex={-1}
              aria-checked={mode2 === "move"}
              onClick={(event) => choose(CANVAS_COMMAND_IDS.select, event)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-[var(--canvas-controls-text)] transition-colors hover:bg-[var(--canvas-controls-hover)] ${mode2 === "move" ? "bg-[var(--canvas-controls-active)]" : ""}`}
            >
              <span className="flex size-4 items-center justify-center">
                {mode2 === "move" && <Check size={14} strokeWidth={1.5} aria-hidden="true" />}
              </span>
              <MousePointer2 size={16} strokeWidth={1.5} aria-hidden="true" />
              <span className="flex-1">{labels.move}</span>
              <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">V</span>
            </button>
            <button
              type="button"
              role="menuitemradio"
              data-action-ui-id="canvas.toolbar.move-mode-hand"
              tabIndex={-1}
              aria-checked={mode2 === "hand"}
              onClick={(event) => choose(CANVAS_COMMAND_IDS.handTool, event)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-[var(--canvas-controls-text)] transition-colors hover:bg-[var(--canvas-controls-hover)] ${mode2 === "hand" ? "bg-[var(--canvas-controls-active)]" : ""}`}
            >
              <span className="flex size-4 items-center justify-center">
                {mode2 === "hand" && <Check size={14} strokeWidth={1.5} aria-hidden="true" />}
              </span>
              <Hand size={16} strokeWidth={1.5} aria-hidden="true" />
              <span className="flex-1">{labels.hand}</span>
              <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">H</span>
            </button>
          </div>
        )}
      </QuickZoomPresence>
    </fieldset>
  );
}
