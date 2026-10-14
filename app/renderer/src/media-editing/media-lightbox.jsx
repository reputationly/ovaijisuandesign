// media-lightbox.jsx
import reactDomExports from "react-dom";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { CompositedSvg } from "./icon-compositing.js";
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
function getFocusableElements(root) {
  return Array.from(root.querySelectorAll(LIGHTBOX_FOCUSABLE_SELECTOR)).filter(
    (element) => {
      if (element.hidden || element.getAttribute("aria-hidden") === "true")
        return false;
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    },
  );
}
function getWindowBridge() {
  const platform = window.__HILO_PLATFORM__;
  return platform?.window;
}
export const MediaLightbox = reactExports.memo(function MediaLightbox({
  onClose,
  children,
  onContextMenu,
  ariaLabel,
  allowHorizontalArrowKeys = false,
}) {
  const { t } = useTranslation();
  const isActive = useCanvasActive();
  useNativeViewOcclusion(isActive);
  const rootRef = reactExports.useRef(null);
  useCanvasShortcutGuard(true, rootRef, allowHorizontalArrowKeys);
  const handleKeyDown = reactExports.useCallback(
    (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        keyboardEvent.stopPropagation();
        onClose();
        return;
      }
      if (keyboardEvent.key !== "Tab") return;
      const root = rootRef.current;
      if (!root) return;
      const focusableElements = getFocusableElements(root);
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      if (focusableElements.length === 0) {
        root.focus({
          preventScroll: true,
        });
        return;
      }
      const currentIndex = focusableElements.indexOf(document.activeElement);
      const nextIndex = keyboardEvent.shiftKey
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
    if (!isActive) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isActive, handleKeyDown]);
  reactExports.useEffect(() => {
    if (!isActive) return;
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
  }, [isActive]);
  reactExports.useEffect(() => {
    if (!isActive) return;
    const bridge = getWindowBridge();
    bridge?.setWindowButtonVisibility?.(false);
    return () => {
      bridge?.setWindowButtonVisibility?.(true);
    };
  }, [isActive]);
  const handleBackdropClick = reactExports.useCallback(
    (clickEvent) => {
      if (clickEvent.target === clickEvent.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );
  if (!isActive) return null;
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key handled via document listener above
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? t("canvas.fullscreenPreview")}
      tabIndex={-1}
      className="no-drag fixed inset-0 isolate z-[9999] flex items-center justify-center p-16 bg-black/85 backdrop-blur-[8px] cursor-zoom-out animate-[lightbox-fade-in_0.15s_ease-out]"
      onClick={handleBackdropClick}
      onContextMenu={onContextMenu}
      data-action-ui-id="canvas.media-lightbox"
      data-canvas-chrome="true"
    >
      <button
        type="button"
        aria-label={t("common.close")}
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
      {children}
    </div>,
    document.body,
  );
});
