// resize-col-handle.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

const LINE_BASE_CLASS_NAME =
  "relative z-30 -mx-[4.5px] h-full w-[9px] shrink-0 cursor-col-resize overflow-visible border-0 bg-transparent p-0";

const GRIP_BASE_CLASS_NAME =
  "relative -mx-[4.5px] h-full w-[9px] shrink-0 cursor-col-resize border-0 bg-transparent p-0";

export function ResizeColHandle({
  onMouseDown,
  onDoubleClick,
  onValueChange,
  invertKeyboardDirection = false,
  tabIndex,
  baseClassName,
  indicatorVariant = "line",
  ...aria2
}) {
  const sepRef = reactExports.useRef(null);
  const [hovered, setHovered] = reactExports.useState(false);
  const [dragging, setDragging] = reactExports.useState(false);
  const currentValue = aria2["aria-valuenow"];
  const minValue = aria2["aria-valuemin"];
  const maxValue = aria2["aria-valuemax"];
  reactExports.useEffect(() => {
    if (!dragging) return;
    const endDragging = () => setDragging(false);
    document.addEventListener("mouseup", endDragging);
    window.addEventListener("blur", endDragging);
    return () => {
      document.removeEventListener("mouseup", endDragging);
      window.removeEventListener("blur", endDragging);
    };
  }, [dragging]);
  const handleMouseDown2 = reactExports.useCallback(
    (event) => {
      if (!onMouseDown) return;
      setDragging(true);
      onMouseDown(event);
    },
    [onMouseDown],
  );
  const handleKeyDown2 = reactExports.useCallback(
    (event) => {
      if (
        onValueChange === void 0 ||
        currentValue === void 0 ||
        minValue === void 0 ||
        maxValue === void 0
      ) {
        return;
      }
      const step = event.shiftKey ? 24 : 8;
      let next2;
      if (event.key === "Home") {
        next2 = minValue;
      } else if (event.key === "End") {
        next2 = maxValue;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const arrowDirection = event.key === "ArrowRight" ? 1 : -1;
        const direction = invertKeyboardDirection
          ? -arrowDirection
          : arrowDirection;
        next2 = Math.min(
          maxValue,
          Math.max(minValue, currentValue + direction * step),
        );
      }
      if (next2 === void 0 || next2 === currentValue) {
        if (next2 !== void 0) event.preventDefault();
        return;
      }
      event.preventDefault();
      onValueChange(next2);
    },
    [currentValue, invertKeyboardDirection, maxValue, minValue, onValueChange],
  );
  return (
    <hr
      ref={sepRef}
      tabIndex={tabIndex}
      aria-valuenow={aria2["aria-valuenow"]}
      aria-valuemin={aria2["aria-valuemin"]}
      aria-valuemax={aria2["aria-valuemax"]}
      aria-orientation={aria2["aria-orientation"] ?? "vertical"}
      aria-label={aria2["aria-label"]}
      data-action-ui-id={aria2["data-action-ui-id"]}
      data-workspace-divider={aria2["data-workspace-divider"]}
      data-global-sidebar-hover-region={
        aria2["data-global-sidebar-hover-region"]
      }
      data-indicator-variant={indicatorVariant}
      data-active={hovered || dragging ? "true" : "false"}
      className={`resize-col ${baseClassName ?? (indicatorVariant === "grip" ? GRIP_BASE_CLASS_NAME : LINE_BASE_CLASS_NAME)}`}
      onMouseDown={handleMouseDown2}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={handleKeyDown2}
    />
  );
}
