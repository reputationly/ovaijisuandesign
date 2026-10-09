// angle-scrubber.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CompositedSvg,
  NodeToolbar$1 as NodeToolbar,
  Position,
  reactExports,
  useStore$3 as useStore,
  useTranslation,
} from "../vendor.js";
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
  active: active2 = false,
  disabled: disabled2 = false,
  onClick,
  title,
  children: children2,
}) {
  return (
    <button
      type="button"
      disabled={disabled2}
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active2}
      className="canvas-toolbar-action"
    >
      {children2}
    </button>
  );
}
function Divider() {
  return <div className="canvas-toolbar-separator" aria-hidden="true" />;
}
const ROTATE_SNAP_DEG = 1;
function maybeSnapAngle(deg) {
  const n2 = normalizeAngle(deg);
  for (const step of [-180, -90, 0, 90, 180]) {
    if (Math.abs(n2 - step) <= ROTATE_SNAP_DEG) return step;
  }
  return n2;
}
const HEADER_FLOW_HEIGHT = 28;
const TOOLBAR_GAP = 8;
const zoomSelector = (s2) => s2.transform[2];
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
  const { t: t2 } = useTranslation();
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
    (e2) => {
      if (e2.button !== 0) return;
      e2.preventDefault();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      draggingRef.current = true;
      e2.currentTarget.dataset.dragging = "true";
      startXRef.current = e2.clientX;
      startAngleRef.current = value;
      e2.currentTarget.setPointerCapture(e2.pointerId);
      document.body.style.cursor = "ew-resize";
    },
    [value],
  );
  const handlePointerMove = reactExports.useCallback(
    (e2) => {
      if (!draggingRef.current) return;
      const deltaX = e2.clientX - startXRef.current;
      const sensitivity = e2.shiftKey ? 2 : 0.5;
      const next2 = clamp(
        startAngleRef.current + deltaX * sensitivity,
        ROTATE_ANGLE_MIN,
        ROTATE_ANGLE_MAX,
      );
      onChange(next2);
    },
    [onChange],
  );
  const handlePointerUp = reactExports.useCallback(
    (e2) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      if (e2.currentTarget.hasPointerCapture(e2.pointerId)) {
        e2.currentTarget.releasePointerCapture(e2.pointerId);
      }
      resetBackground();
    },
    [resetBackground],
  );
  const label = t2("canvas.rotate.scrub");
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
    (raw2) => {
      const parsed = Number.parseFloat(raw2);
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
        onChange={(e2) => setDraft(e2.currentTarget.value)}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={(e2) => {
          focusedRef.current = false;
          commit(e2.currentTarget.value);
        }}
        onKeyDown={(e2) => {
          if (e2.key === "Enter") {
            e2.currentTarget.blur();
          } else if (e2.key === "ArrowUp") {
            e2.preventDefault();
            const next2 = clamp(
              normalizeAngle(value + 1),
              ROTATE_ANGLE_MIN,
              ROTATE_ANGLE_MAX,
            );
            onChange(next2);
            setDraft(String(Math.round(next2)));
          } else if (e2.key === "ArrowDown") {
            e2.preventDefault();
            const next2 = clamp(
              normalizeAngle(value - 1),
              ROTATE_ANGLE_MIN,
              ROTATE_ANGLE_MAX,
            );
            onChange(next2);
            setDraft(String(Math.round(next2)));
          } else if (e2.key === "Escape") {
            e2.currentTarget.blur();
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
}) {
  const { t: t2 } = useTranslation();
  const zoom2 = useStore(zoomSelector);
  const offset2 = HEADER_FLOW_HEIGHT * zoom2 + TOOLBAR_GAP;
  return (
    <NodeToolbar
      isVisible={visible}
      position={Position.Top}
      offset={offset2}
      align="center"
    >
      <div
        className="canvas-toolbar-surface animate-[toolbar-fade-in_0.15s_ease-out]"
        onPointerDown={(e2) => e2.stopPropagation()}
        onWheel={(e2) => e2.stopPropagation()}
        onContextMenu={(e2) => e2.stopPropagation()}
        data-canvas-toolbar="true"
        data-density="compact"
      >
        <CancelChip onClick={onCancel} label={t2("canvas.rotate.title")} />
        <Divider />
        <AngleInput value={angle} onChange={onAngleChange} />
        <Divider />
        <IconButton
          onClick={onRotate90}
          title={t2("canvas.rotate.step90", {
            degrees: ROTATE_STEP_DEG,
          })}
        >
          <Rotate90Icon />
        </IconButton>
        <IconButton
          active={flipH}
          onClick={onFlipHorizontal}
          title={t2("canvas.rotate.flipH")}
        >
          <FlipHorizontalIcon />
        </IconButton>
        <IconButton
          active={flipV}
          onClick={onFlipVertical}
          title={t2("canvas.rotate.flipV")}
        >
          <FlipVerticalIcon />
        </IconButton>
        <Divider />
        <button
          type="button"
          disabled={!canSave || saving}
          onClick={onSave}
          className="canvas-toolbar-action"
          aria-label={
            saving ? t2("canvas.rotate.saving") : t2("canvas.rotate.save")
          }
          title={saving ? t2("canvas.rotate.saving") : t2("canvas.rotate.save")}
          data-variant="primary"
        >
          <SendArrowIcon />
        </button>
      </div>
    </NodeToolbar>
  );
}
export const ImageRotateEditToolbar = reactExports.memo(
  ImageRotateEditToolbarInner,
);
