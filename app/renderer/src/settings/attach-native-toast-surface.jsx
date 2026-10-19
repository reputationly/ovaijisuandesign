// attach-native-toast-surface.jsx
import { Toaster } from "sonner";
import { useTheme } from "../infra/theme-script.js";
import reactDomExports from "react-dom";
import reactExports from "react";
import { CircleCheckIcon, InfoIcon$1 as InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "../media-editing/lucide-icon-wraps.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { isElectron } from "../infra/use-canvas-node-assets-store.js";
import {
  instantiation,
  IWindowMainService,
} from "../workspace/home-service.jsx";
const NATIVE_TOAST_WINDOW_PREFIX = "hilo-native-toast-";
const NATIVE_TOAST_WINDOW_FEATURE = "hiloNativeToast";
function bindNativeToastInput(
  mount,
  child,
  token,
  bridge,
  onError,
  hotkey = ["altKey", "KeyT"],
) {
  let disposed = false;
  let keyboard = false;
  let previousFocus = null;
  let pointerPending = false;
  let pointerDirty = false;
  const refreshPointer = () => {
    if (disposed) return;
    if (pointerPending) {
      pointerDirty = true;
      return;
    }
    pointerPending = true;
    void bridge
      .refreshNativeToastPointer(token)
      .catch(onError)
      .finally(() => {
        pointerPending = false;
        if (pointerDirty) {
          pointerDirty = false;
          refreshPointer();
        }
      });
  };
  const exitKeyboard = () => {
    if (!keyboard || disposed) return;
    keyboard = false;
    void bridge
      .setNativeToastKeyboardFocus(token, false)
      .then(() => {
        if (!disposed && previousFocus?.isConnected)
          previousFocus.focus({
            preventScroll: true,
          });
      })
      .catch(onError);
  };
  const ownerKeyDown = (event) => {
    if (
      !hotkey.length ||
      !hotkey.every((key) => event[key] || event.code === key)
    )
      return;
    if (!mount.querySelector('[data-sonner-toast]:not([data-removed="true"])'))
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat || keyboard) return;
    keyboard = true;
    previousFocus = document.activeElement;
    void bridge
      .setNativeToastKeyboardFocus(token, true)
      .then(() => {
        if (!disposed && keyboard)
          mount.querySelector("[data-sonner-toaster]")?.focus({
            preventScroll: true,
          });
      })
      .catch(onError);
  };
  const childKeyDown = (event) => {
    if (event.code !== "Escape" || !keyboard) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    exitKeyboard();
  };
  const handleBlur = () => {
    keyboard = false;
  };
  document.addEventListener("keydown", ownerKeyDown, true);
  child.addEventListener("keydown", childKeyDown, true);
  child.addEventListener("mousemove", refreshPointer, {
    passive: true,
  });
  child.addEventListener("blur", handleBlur);
  return {
    onEmpty: exitKeyboard,
    dispose() {
      disposed = true;
      document.removeEventListener("keydown", ownerKeyDown, true);
      child.removeEventListener("keydown", childKeyDown, true);
      child.removeEventListener("mousemove", refreshPointer);
      child.removeEventListener("blur", handleBlur);
    },
  };
}
function mirrorToastDocument(source, target) {
  const base = target.createElement("base");
  base.href = source.baseURI;
  target.head.appendChild(base);
  const overrides = target.createElement("style");
  overrides.textContent = `
    html, body { background: transparent !important; margin: 0 !important; overflow: hidden !important; }
    body { min-width: 0 !important; }
    /* The native window is a compact viewport. Keep Sonner's usual desktop
       card width and a 16px shadow gutter instead of its small-screen layout.
       Main anchors this gutter at owner y=40 (36 on narrow owner windows). */
    [data-sonner-toaster] {
      width: min(var(--width), calc(100vw - 32px)) !important;
      left: 50% !important;
      right: auto !important;
      transform: translateX(-50%) !important;
      top: 16px !important;
      bottom: auto !important;
    }
    [data-sonner-toaster] [data-sonner-toast] {
      left: 0 !important;
      right: auto !important;
      width: auto !important;
      max-width: 100%;
    }
    [data-sonner-toaster] [data-sonner-toast][data-styled='true'] {
      width: 100% !important;
    }
  `;
  target.head.appendChild(overrides);
  const copies = new Map();
  const syncStyles = () => {
    const styles = new Set(
      source.head.querySelectorAll('style, link[rel="stylesheet"]'),
    );
    for (const [original, copy] of copies) {
      if (!styles.has(original)) {
        copy.node.remove();
        copies.delete(original);
      }
    }
    for (const original of styles) {
      let copy = copies.get(original);
      const markup = original.outerHTML;
      if (!copy || copy.markup !== markup) {
        copy?.node.remove();
        copy = {
          node: original.cloneNode(true),
          markup,
        };
        copies.set(original, copy);
      }
      target.head.insertBefore(copy.node, overrides);
    }
  };
  const syncAttributes = (original, copy) => {
    for (const attr of Array.from(copy.attributes)) {
      if (!original.hasAttribute(attr.name)) copy.removeAttribute(attr.name);
    }
    for (const attr of Array.from(original.attributes))
      copy.setAttribute(attr.name, attr.value);
  };
  const syncTheme = () => {
    syncAttributes(source.documentElement, target.documentElement);
    syncAttributes(source.body, target.body);
  };
  syncStyles();
  syncTheme();
  const stylesObserver = new MutationObserver(syncStyles);
  stylesObserver.observe(source.head, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
  });
  const themeObserver = new MutationObserver(syncTheme);
  themeObserver.observe(source.documentElement, {
    attributes: true,
  });
  themeObserver.observe(source.body, {
    attributes: true,
  });
  return () => {
    stylesObserver.disconnect();
    themeObserver.disconnect();
    for (const { node } of copies.values()) node.remove();
    base.remove();
    overrides.remove();
  };
}
function measureNativeToasts(mount, view) {
  const rects = [];
  for (const toast of mount.querySelectorAll("[data-sonner-toast]")) {
    if (toast.dataset.visible === "false") continue;
    for (const element of [
      toast,
      ...toast.querySelectorAll("[data-close-button]"),
    ]) {
      const bounds = element.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) continue;
      const x = Math.max(0, Math.floor(bounds.left));
      const y = Math.max(0, Math.floor(bounds.top));
      const right = Math.min(view.innerWidth, Math.ceil(bounds.right));
      const bottom = Math.ceil(bounds.bottom);
      if (right > x && bottom > y)
        rects.push({
          x,
          y,
          width: right - x,
          height: bottom - y,
        });
    }
  }
  return {
    rects,
    viewportWidth: view.innerWidth,
    viewportHeight: view.innerHeight,
  };
}
function attachNativeToastSurface(mount, update, onFailure, inputOptions) {
  const token = crypto.randomUUID();
  const child = window.open(
    "about:blank",
    `${NATIVE_TOAST_WINDOW_PREFIX}${token}`,
    `popup,${NATIVE_TOAST_WINDOW_FEATURE}=true`,
  );
  if (!child) return void 0;
  const fallback = mount.parentNode;
  let disposed = false;
  let frame = 0;
  let lastLayout = "";
  let settleUntil = 0;
  let emptyViewportFrames = 0;
  let stopMirror;
  let observer;
  let resizeObserver;
  let input;
  let closedTimer;
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    if (closedTimer) clearInterval(closedTimer);
    observer?.disconnect();
    resizeObserver?.disconnect();
    input?.dispose();
    stopMirror?.();
    child.removeEventListener("resize", schedule);
    child.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("pagehide", cleanup);
    fallback?.appendChild(mount);
    if (!child.closed) child.close();
  };
  const failed = (error) => {
    if (disposed) return;
    cleanup();
    onFailure(error);
  };
  const onPageHide = () => failed();
  const measure = () => {
    frame = 0;
    if (disposed) return;
    if (child.closed) {
      failed();
      return;
    }
    const layout = measureNativeToasts(mount, child);
    if (layout.viewportWidth <= 0 || layout.viewportHeight <= 0) {
      if (document.hidden || ++emptyViewportFrames <= 120)
        frame = requestAnimationFrame(measure);
      else failed(new Error("Native toast viewport did not initialize"));
      return;
    }
    const fingerprint = JSON.stringify(layout);
    if (fingerprint !== lastLayout) {
      lastLayout = fingerprint;
      void update(token, layout).catch(failed);
    }
    if (
      performance.now() < settleUntil &&
      mount.querySelector("[data-sonner-toast]")
    ) {
      frame = requestAnimationFrame(measure);
    }
  };
  const schedule = () => {
    settleUntil = performance.now() + 500;
    if (!disposed && !frame) frame = requestAnimationFrame(measure);
  };
  try {
    stopMirror = mirrorToastDocument(document, child.document);
    child.document.body.appendChild(mount);
    if (inputOptions)
      input = bindNativeToastInput(
        mount,
        child,
        token,
        inputOptions.bridge,
        failed,
        inputOptions.hotkey,
      );
    const observed = new Set();
    resizeObserver = new ResizeObserver(schedule);
    const onMutation = () => {
      const toasts = new Set(mount.querySelectorAll("[data-sonner-toast]"));
      for (const element of observed) {
        if (!toasts.has(element)) {
          resizeObserver?.unobserve(element);
          observed.delete(element);
        }
      }
      if (toasts.size === 0) input?.onEmpty();
      for (const element of toasts) {
        if (!observed.has(element)) {
          resizeObserver?.observe(element);
          observed.add(element);
        }
      }
      schedule();
    };
    observer = new MutationObserver(onMutation);
    observer.observe(mount, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
    onMutation();
    child.addEventListener("resize", schedule);
    child.addEventListener("pagehide", onPageHide);
    window.addEventListener("pagehide", cleanup);
    closedTimer = setInterval(() => {
      if (child.closed) failed();
    }, 1e3);
    schedule();
  } catch (error) {
    failed(error);
    return void 0;
  }
  return cleanup;
}
const CENTERED_TOASTER_PLACEMENT = {
  position: "top-center",
  offset: {
    top: "calc(56px + env(safe-area-inset-top))",
  },
  mobileOffset: {
    top: "calc(52px + env(safe-area-inset-top))",
    right: "calc(16px + env(safe-area-inset-right))",
    left: "calc(16px + env(safe-area-inset-left))",
  },
};
const GLOBAL_TOASTER_Z_INDEX = 10100;
function resolveToasterPlacement() {
  return CENTERED_TOASTER_PLACEMENT;
}
function NativeToastHost({ children, hotkey }) {
  const fallbackRef = reactExports.useRef(null);
  const [mount] = reactExports.useState(() => document.createElement("div"));
  reactExports.useLayoutEffect(() => {
    fallbackRef.current?.appendChild(mount);
    return () => mount.remove();
  }, [mount]);
  reactExports.useEffect(() => {
    if (!isElectron()) return;
    let disposed = false;
    let detach;
    const warn = (error) => {
      if (!disposed && error !== void 0)
        console.warn(
          "[toast] Native surface unavailable; using DOM fallback.",
          error,
        );
    };
    void (async () => {
      // 这里必须**动态**导入：产物里就是按需拉这个 chunk 的（`await import("…").then(n => n.nv)`）。
      // 之前还原时这句被写坏成了 `Promise("…")` —— `Promise` 不带 `new` 直接调用会抛
      // 「Promise constructor cannot be invoked without 'new'」，于是原生弹层永远走不到、只剩 DOM 兜底。
      const { instantiationService } = await import("../workspace/home-service.jsx");
      return {
        instantiationService,
      };
    })()
      .then(({ instantiationService }) => {
        if (disposed) return;
        const service = instantiationService.invokeFunction((accessor) =>
          accessor.get(IWindowMainService),
        );
        detach = attachNativeToastSurface(
          mount,
          (token, layout) => service.updateNativeToast(token, layout),
          warn,
          {
            bridge: service,
            hotkey,
          },
        );
      })
      .catch(warn);
    return () => {
      disposed = true;
      detach?.();
    };
  }, [mount, hotkey]);
  return (
    <div ref={fallbackRef} data-native-toast-host="">
      {reactDomExports.createPortal(children, mount)}
    </div>
  );
}
export const Toaster2 = ({ style, ...props }) => {
  const { theme = "system" } = useTheme();
  const placement = resolveToasterPlacement();
  return (
    <NativeToastHost hotkey={props.hotkey}>
      <Toaster
        theme={theme}
        className="toaster group"
        position={placement.position}
        offset={placement.offset}
        mobileOffset={placement.mobileOffset}
        icons={{
          success: <CircleCheckIcon className="size-4" />,
          info: <InfoIcon className="size-4" />,
          warning: <TriangleAlertIcon className="size-4" />,
          error: <OctagonXIcon className="size-4" />,
          loading: <Loader2Icon className="size-4 animate-spin" />,
        }}
        style={{
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--elevated-border-color)",
          "--border-radius": "8px",
          // NativeToastHost preserves this single tree in a native child above
          // WebContentsViews. The z-index remains for the web/error fallback,
          // above dialogs, tooltips and Canvas portals.
          zIndex: GLOBAL_TOASTER_Z_INDEX,
          ...style,
        }}
        toastOptions={{
          classNames: {
            toast: "cn-toast",
          },
        }}
        {...props}
      />
    </NativeToastHost>
  );
};
