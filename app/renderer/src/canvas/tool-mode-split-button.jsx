// tool-mode-split-button.jsx
import {
  Check,
  ChevronUp,
  Hand,
  MonochromeIcon,
  reactExports,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ToolbarTooltipContent } from "./canvas-toolbar-extension-button.jsx";
import { CANVAS_COMMAND_IDS } from "./use-active-mode.js";
import { MousePointer2 } from "../media-editing/package.jsx";
import { Tooltip$1 } from "../generation/missing-asset-card.jsx";
import { QuickZoomPresence } from "./canvas-high-blast-delete-dialog.jsx";
import { CANVAS_TOOL_DOCK_CONTROL_SIZE_PX } from "./cursor-icon.jsx";

export function ToolModeSplitButton({ commandRegistry, mode: mode2, labels }) {
  const [open, setOpen] = reactExports.useState(false);
  const containerRef = reactExports.useRef(null);
  const triggerRef = reactExports.useRef(null);
  const menuRef = reactExports.useRef(null);
  const menuId = reactExports.useId();
  const ActiveIcon = mode2 === "hand" ? Hand : MousePointer2;
  const getMenuItems = reactExports.useCallback(
    () =>
      Array.from(
        menuRef.current?.querySelectorAll('[role="menuitemradio"]') ?? [],
      ),
    [],
  );
  reactExports.useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);
  reactExports.useEffect(() => {
    if (!open) return;
    const items = getMenuItems();
    (
      items.find((item) => item.getAttribute("aria-checked") === "true") ??
      items[0]
    )?.focus({
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
              mode2 === "hand"
                ? CANVAS_COMMAND_IDS.handTool
                : CANVAS_COMMAND_IDS.select,
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
          <ToolbarTooltipContent
            label={`${labels.move} / ${labels.hand}`}
            shortcut="V / H"
          />
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
                {mode2 === "move" && (
                  <Check size={14} strokeWidth={1.5} aria-hidden="true" />
                )}
              </span>
              <MousePointer2 size={16} strokeWidth={1.5} aria-hidden="true" />
              <span className="flex-1">{labels.move}</span>
              <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
                V
              </span>
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
                {mode2 === "hand" && (
                  <Check size={14} strokeWidth={1.5} aria-hidden="true" />
                )}
              </span>
              <Hand size={16} strokeWidth={1.5} aria-hidden="true" />
              <span className="flex-1">{labels.hand}</span>
              <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
                H
              </span>
            </button>
          </div>
        )}
      </QuickZoomPresence>
    </fieldset>
  );
}
