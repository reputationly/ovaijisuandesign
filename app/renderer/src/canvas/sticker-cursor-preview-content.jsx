// sticker-cursor-preview-content.jsx
import { reactExports, ViewportPortal } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { STICKER_NODE_SIZE } from "./resolve-canvas-focus-targets.js";
import { CANVAS_STAMP_CURSOR_URL } from "../media-editing/canvas-sticker-assets.jsx";

const PRESS_FEEDBACK_MS = 240;

function StickerCursorPreviewContent({
  active: active2,
  asset,
  emoji: emoji2,
  resolvePlacement,
}) {
  const previewRef = reactExports.useRef(null);
  const pressTimerRef = reactExports.useRef(null);
  const [pressed, setPressed] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    if (!active2) {
      preview.style.display = "none";
      setPressed(false);
      return;
    }
    const setVisiblePosition = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        preview.style.display = "none";
        return;
      }
      if (target.closest('[data-canvas-chrome="true"]')) {
        preview.style.display = "none";
        return;
      }
      const canvas = target.closest(
        '[data-hilo-canvas-root="true"] .react-flow',
      );
      if (!canvas) {
        preview.style.display = "none";
        return;
      }
      const bounds = canvas.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        preview.style.display = "none";
        return;
      }
      const position2 = resolvePlacement({
        x: event.clientX,
        y: event.clientY,
      });
      preview.style.display = "block";
      preview.style.transform = `translate3d(${position2.x}px, ${position2.y}px, 0)`;
    };
    const handlePointerDown = (event) => {
      if (event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-canvas-chrome="true"]')) return;
      if (!target.closest('[data-hilo-canvas-root="true"] .react-flow')) return;
      setPressed(true);
      if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = window.setTimeout(() => {
        pressTimerRef.current = null;
        setPressed(false);
      }, PRESS_FEEDBACK_MS);
    };
    document.addEventListener("pointermove", setVisiblePosition, true);
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointermove", setVisiblePosition, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
      setPressed(false);
    };
  }, [active2, resolvePlacement]);
  return (
    <div
      ref={previewRef}
      className="pointer-events-none absolute left-0 top-0 z-[2000] hidden will-change-transform"
      style={{
        width: STICKER_NODE_SIZE.width,
        height: STICKER_NODE_SIZE.height,
      }}
      aria-hidden="true"
    >
      <span
        className={`sticker-cursor-preview-art ${pressed ? "is-pressed" : ""}`}
      >
        {asset ? (
          <img
            src={asset.src}
            alt=""
            draggable={false}
            className="sticker-cursor-preview-image"
          />
        ) : (
          <span className="sticker-cursor-preview-emoji">{emoji2}</span>
        )}
        <img
          src={CANVAS_STAMP_CURSOR_URL}
          alt=""
          draggable={false}
          className="sticker-cursor-preview-stamp"
        />
      </span>
    </div>
  );
}

export function StickerCursorPreview({
  active: active2,
  asset,
  emoji: emoji2,
  resolvePlacement,
}) {
  return (
    <ViewportPortal>
      <StickerCursorPreviewContent
        active={active2}
        asset={asset}
        emoji={emoji2}
        resolvePlacement={resolvePlacement}
      />
    </ViewportPortal>
  );
}
