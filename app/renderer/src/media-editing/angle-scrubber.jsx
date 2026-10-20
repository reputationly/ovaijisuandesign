// angle-scrubber.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import { __jsx } from "../shared/jsx-runtime.js";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { CompositedSvg } from "./icon-compositing.js";
import { NodeToolbar, useStore } from "../vendor-fork/xyflow/react/index.js";
import { Position } from "../vendor-fork/xyflow/system/index.js";
import {
  clamp,
  normalizeAngle,
  ROTATE_ANGLE_MAX,
  ROTATE_ANGLE_MIN,
  ROTATE_STEP_DEG,
} from "./use-editor-state.js";
import { CloseIcon, SendArrowIcon } from "../canvas/file-missing-icon.jsx";
import {
  FlipHorizontalIcon,
  FlipVerticalIcon,
  Rotate90Icon,
} from "./package.jsx";
function AngleGlyph() {
  return (
    <CompositedSvg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3v9.5A.5.5 0 0 0 3.5 13H13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 13a4 4 0 0 0-4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </CompositedSvg>
  );
}
function IconButton({
  active = false,
  disabled = false,
  onClick,
  title,
  children,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className="canvas-toolbar-action"
    >
      {children}
    </button>
  );
}
function Divider() {
  return <div className="canvas-toolbar-separator" aria-hidden="true" />;
}
export const ROTATE_SNAP_DEG = 1;
function maybeSnapAngle(degrees) {
  const normalizedAngle = normalizeAngle(degrees);
  for (const step of [-180, -90, 0, 90, 180]) {
    if (Math.abs(normalizedAngle - step) <= ROTATE_SNAP_DEG) return step;
  }
  return normalizedAngle;
}
const HEADER_FLOW_HEIGHT = 28;
const TOOLBAR_GAP = 6;
const zoomSelector = (storeState) => storeState.transform[2];
function CancelChip({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="canvas-toolbar-action"
      aria-label={label}
    >
      <CloseIcon />
    </button>
  );
}
function AngleScrubber({ value, onChange }) {
  const { t } = useTranslation();
  const buttonRef = reactExports.useRef(null);
  const draggingRef = reactExports.useRef(false);
  const startXRef = reactExports.useRef(0);
  const startAngleRef = reactExports.useRef(0);
  const resetBackground = reactExports.useCallback(() => {
    document.body.style.cursor = "";
    buttonRef.current?.removeAttribute("data-dragging");
  }, []);
  reactExports.useEffect(() => {
    return () => {
      if (draggingRef.current) {
        document.body.style.cursor = "";
      }
    };
  }, []);
  const handlePointerDown = reactExports.useCallback(
    (pointerEvent) => {
      if (pointerEvent.button !== 0) return;
      pointerEvent.preventDefault();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      draggingRef.current = true;
      pointerEvent.currentTarget.dataset.dragging = "true";
      startXRef.current = pointerEvent.clientX;
      startAngleRef.current = value;
      pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
      document.body.style.cursor = "ew-resize";
    },
    [value],
  );
  const handlePointerMove = reactExports.useCallback(
    (pointerEvent) => {
      if (!draggingRef.current) return;
      const deltaX = pointerEvent.clientX - startXRef.current;
      const sensitivity = pointerEvent.shiftKey ? 2 : 0.5;
      const next = clamp(
        startAngleRef.current + deltaX * sensitivity,
        ROTATE_ANGLE_MIN,
        ROTATE_ANGLE_MAX,
      );
      onChange(next);
    },
    [onChange],
  );
  const handlePointerUp = reactExports.useCallback(
    (pointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
        pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
      }
      resetBackground();
    },
    [resetBackground],
  );
  const label = t("canvas.rotate.scrub");
  return (
    <button
      ref={buttonRef}
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      title={label}
      aria-label={label}
      className="canvas-toolbar-action"
      style={{
        cursor: "ew-resize",
        touchAction: "none",
      }}
    >
      <AngleGlyph />
    </button>
  );
}
function AngleInput({ value, onChange }) {
  const [draft, setDraft] = reactExports.useState(String(Math.round(value)));
  const focusedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (!focusedRef.current) {
      setDraft(String(Math.round(value)));
    }
  }, [value]);
  const commit = reactExports.useCallback(
    (raw) => {
      const parsed = Number.parseFloat(raw);
      if (!Number.isFinite(parsed)) {
        setDraft(String(Math.round(value)));
        return;
      }
      const snapped = maybeSnapAngle(
        clamp(parsed, ROTATE_ANGLE_MIN, ROTATE_ANGLE_MAX),
      );
      onChange(snapped);
      setDraft(String(Math.round(snapped)));
    },
    [onChange, value],
  );
  return (
    <div className="flex items-center gap-0 py-0.5 pr-1 pl-0.5">
      <AngleScrubber value={value} onChange={onChange} />
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(changeEvent) => setDraft(changeEvent.currentTarget.value)}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={(blurEvent) => {
          focusedRef.current = false;
          commit(blurEvent.currentTarget.value);
        }}
        onKeyDown={(keyboardEvent) => {
          if (keyboardEvent.key === "Enter") {
            keyboardEvent.currentTarget.blur();
          } else if (keyboardEvent.key === "ArrowUp") {
            keyboardEvent.preventDefault();
            const next = clamp(
              normalizeAngle(value + 1),
              ROTATE_ANGLE_MIN,
              ROTATE_ANGLE_MAX,
            );
            onChange(next);
            setDraft(String(Math.round(next)));
          } else if (keyboardEvent.key === "ArrowDown") {
            keyboardEvent.preventDefault();
            const next = clamp(
              normalizeAngle(value - 1),
              ROTATE_ANGLE_MIN,
              ROTATE_ANGLE_MAX,
            );
            onChange(next);
            setDraft(String(Math.round(next)));
          } else if (keyboardEvent.key === "Escape") {
            keyboardEvent.currentTarget.blur();
          }
        }}
        className="w-8 bg-transparent text-center canvas-toolbar-input tabular-nums outline-none"
        style={{
          color: "var(--canvas-toolbar-fg)",
        }}
      />
      <span
        className="canvas-toolbar-label tabular-nums opacity-70 select-none"
        style={{
          color: "var(--canvas-toolbar-fg)",
        }}
      >
        °
      </span>
    </div>
  );
}
function ImageRotateEditToolbarInner({
  angle,
  onAngleChange,
  onRotate90,
  flipH,
  flipV,
  onFlipHorizontal,
  onFlipVertical,
  onCancel,
  onSave,
  saving,
  canSave,
  visible,
  toolbarContainer = (children) => children,
}) {
  const { t } = useTranslation();
  if (!visible) return null;
  return toolbarContainer(
    <>
      <div
        className="canvas-toolbar-surface animate-[toolbar-fade-in_0.15s_ease-out]"
        onPointerDown={(e2) => e2.stopPropagation()}
        onWheel={(e2) => e2.stopPropagation()}
        onContextMenu={(e2) => e2.stopPropagation()}
        data-canvas-toolbar="true"
        data-density="compact"
      >
        <CancelChip onClick={onCancel} label={t("canvas.rotate.title")} />
        <Divider />
        <AngleInput value={angle} onChange={onAngleChange} />
        <Divider />
        <IconButton
          onClick={onRotate90}
          title={t("canvas.rotate.step90", {
            degrees: ROTATE_STEP_DEG,
          })}
        >
          <Rotate90Icon />
        </IconButton>
        <IconButton active={flipH} onClick={onFlipHorizontal} title={t("canvas.rotate.flipH")}>
          <FlipHorizontalIcon />
        </IconButton>
        <IconButton active={flipV} onClick={onFlipVertical} title={t("canvas.rotate.flipV")}>
          <FlipVerticalIcon />
        </IconButton>
        <Divider />
        <button
          type="button"
          disabled={!canSave || saving}
          onClick={onSave}
          className="canvas-toolbar-action"
          aria-label={saving ? t("canvas.rotate.saving") : t("canvas.rotate.save")}
          title={saving ? t("canvas.rotate.saving") : t("canvas.rotate.save")}
          data-variant="primary"
        >
          <SendArrowIcon />
        </button>
      </div>
    </>,
  );
}
export const ImageRotateEditToolbar = reactExports.memo(
  ImageRotateEditToolbarInner,
);
