// zoom-menu.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { reactExports, useTranslation } from "../vendor.js";
import { Tooltip } from "../generation/missing-asset-card.jsx";
import { CANVAS_ZOOM_PRESETS, Input } from "../media-editing/input.jsx";
import { QuickZoomPresence } from "./canvas-high-blast-delete-dialog.jsx";
const ZOOM_MENU_POSITION_CLASSES = {
  "bottom-left": "bottom-full left-0 mb-2",
  "top-left": "top-full left-0 mt-2",
  "top-right": "top-full right-0 mt-2",
};
function getCanvasZoomMenuPositionClass(placement) {
  return ZOOM_MENU_POSITION_CLASSES[placement];
}
const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const modKey = isMac ? "⌘" : "Ctrl";
function ZoomMenuItem({
  dataActionUiId,
  label,
  shortcut,
  onClick,
  disabled: disabled2,
}) {
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
export function ZoomMenu({
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
  const [inputValue, setInputValue] = reactExports.useState(
    zoomPercent.replace("%", ""),
  );
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
    () =>
      Array.from(
        menuRef.current?.querySelectorAll('[role="menuitem"]:not(:disabled)') ??
          [],
      ),
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
          currentIndex < 0
            ? items.length - 1
            : (currentIndex - 1 + items.length) % items.length;
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
      <Tooltip content={t2("canvas.zoom.adjust")} closeOnClick={true}>
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
      </Tooltip>
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
              <Input
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
                  if (event.key !== "Enter" || event.nativeEvent.isComposing)
                    return;
                  event.preventDefault();
                  const value = inputValue.trim();
                  if (
                    /^\d+(?:\.\d+)?$/.test(value) &&
                    Number.isFinite(Number(value))
                  ) {
                    onZoomTo(
                      Math.min(maxZoom, Math.max(minZoom, Number(value) / 100)),
                    );
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
