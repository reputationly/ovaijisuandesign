// media-lightbox.jsx
import {
  CompositedSvg,
  reactDomExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useCanvasShortcutGuard } from "./use-canvas-shortcut-guard.js";
import { useNativeViewOcclusion } from "../canvas/separator.jsx";
import { useCanvasActive } from "./package.jsx";
const LIGHTBOX_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  "video[controls]",
  "audio[controls]",
].join(",");
function getFocusableElements(root2) {
  return Array.from(root2.querySelectorAll(LIGHTBOX_FOCUSABLE_SELECTOR)).filter(
    (element2) => {
      if (element2.hidden || element2.getAttribute("aria-hidden") === "true")
        return false;
      const style2 = window.getComputedStyle(element2);
      return style2.display !== "none" && style2.visibility !== "hidden";
    },
  );
}
function getWindowBridge() {
  const platform2 = window.__HILO_PLATFORM__;
  return platform2?.window;
}
export const MediaLightbox = reactExports.memo(function MediaLightbox2({
  onClose,
  children: children2,
  onContextMenu,
  ariaLabel,
  allowHorizontalArrowKeys = false,
}) {
  const { t: t2 } = useTranslation();
  const active2 = useCanvasActive();
  useNativeViewOcclusion(active2);
  const rootRef = reactExports.useRef(null);
  useCanvasShortcutGuard(true, rootRef, allowHorizontalArrowKeys);
  const handleKeyDown2 = reactExports.useCallback(
    (e2) => {
      if (e2.key === "Escape") {
        e2.stopPropagation();
        onClose();
        return;
      }
      if (e2.key !== "Tab") return;
      const root2 = rootRef.current;
      if (!root2) return;
      const focusableElements = getFocusableElements(root2);
      e2.preventDefault();
      e2.stopPropagation();
      if (focusableElements.length === 0) {
        root2.focus({
          preventScroll: true,
        });
        return;
      }
      const currentIndex = focusableElements.indexOf(document.activeElement);
      const nextIndex = e2.shiftKey
        ? currentIndex <= 0
          ? focusableElements.length - 1
          : currentIndex - 1
        : currentIndex < 0 || currentIndex === focusableElements.length - 1
          ? 0
          : currentIndex + 1;
      focusableElements[nextIndex]?.focus({
        preventScroll: true,
      });
    },
    [onClose],
  );
  reactExports.useEffect(() => {
    if (!active2) return;
    document.addEventListener("keydown", handleKeyDown2);
    return () => document.removeEventListener("keydown", handleKeyDown2);
  }, [active2, handleKeyDown2]);
  reactExports.useEffect(() => {
    if (!active2) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    rootRef.current?.focus({
      preventScroll: true,
    });
    return () => {
      if (previousFocus?.isConnected)
        previousFocus.focus({
          preventScroll: true,
        });
    };
  }, [active2]);
  reactExports.useEffect(() => {
    if (!active2) return;
    const bridge = getWindowBridge();
    bridge?.setWindowButtonVisibility?.(false);
    return () => {
      bridge?.setWindowButtonVisibility?.(true);
    };
  }, [active2]);
  const handleBackdropClick = reactExports.useCallback(
    (e2) => {
      if (e2.target === e2.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );
  if (!active2) return null;
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key handled via document listener above
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? t2("canvas.fullscreenPreview")}
      tabIndex={-1}
      className="no-drag fixed inset-0 isolate z-[9999] flex items-center justify-center p-16 bg-black/85 backdrop-blur-[8px] cursor-zoom-out animate-[lightbox-fade-in_0.15s_ease-out]"
      onClick={handleBackdropClick}
      onContextMenu={onContextMenu}
      data-action-ui-id="canvas.media-lightbox"
      data-canvas-chrome="true"
    >
      <button
        type="button"
        aria-label={t2("common.close")}
        className="no-drag pointer-events-auto absolute top-8 right-8 z-50 flex items-center justify-center w-9 h-9 rounded-full bg-black/55 hover:bg-black/70 text-white/80 hover:text-white transition-colors cursor-pointer"
        onClick={onClose}
        data-action-ui-id="canvas.media-lightbox.close"
      >
        <CompositedSvg
          className="pointer-events-none"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 4L4 12M4 4l8 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </CompositedSvg>
      </button>
      {children2}
    </div>,
    document.body,
  );
});
