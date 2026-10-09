// attach-native-toast-surface.jsx
import {
  CircleCheckIcon,
  InfoIcon$1,
  Loader2Icon,
  OctagonXIcon,
  reactDomExports,
  reactExports,
  Toaster$1,
  TriangleAlertIcon,
  z$3,
} from "../vendor.js";
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
  token2,
  bridge,
  onError,
  hotkey = ["altKey", "KeyT"],
) {
  let disposed = false;
  let keyboard2 = false;
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
      .refreshNativeToastPointer(token2)
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
    if (!keyboard2 || disposed) return;
    keyboard2 = false;
    void bridge
      .setNativeToastKeyboardFocus(token2, false)
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
      !hotkey.every((key2) => event[key2] || event.code === key2)
    )
      return;
    if (!mount.querySelector('[data-sonner-toast]:not([data-removed="true"])'))
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat || keyboard2) return;
    keyboard2 = true;
    previousFocus = document.activeElement;
    void bridge
      .setNativeToastKeyboardFocus(token2, true)
      .then(() => {
        if (!disposed && keyboard2)
          mount.querySelector("[data-sonner-toaster]")?.focus({
            preventScroll: true,
          });
      })
      .catch(onError);
  };
  const childKeyDown = (event) => {
    if (event.code !== "Escape" || !keyboard2) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    exitKeyboard();
  };
  const blur2 = () => {
    keyboard2 = false;
  };
  document.addEventListener("keydown", ownerKeyDown, true);
  child.addEventListener("keydown", childKeyDown, true);
  child.addEventListener("mousemove", refreshPointer, {
    passive: true,
  });
  child.addEventListener("blur", blur2);
  return {
    onEmpty: exitKeyboard,
    dispose() {
      disposed = true;
      document.removeEventListener("keydown", ownerKeyDown, true);
      child.removeEventListener("keydown", childKeyDown, true);
      child.removeEventListener("mousemove", refreshPointer);
      child.removeEventListener("blur", blur2);
    },
  };
}

function mirrorToastDocument(source, target) {
  const base2 = target.createElement("base");
  base2.href = source.baseURI;
  target.head.appendChild(base2);
  const overrides2 = target.createElement("style");
  overrides2.textContent = `
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
  target.head.appendChild(overrides2);
  const copies = new Map();
  const syncStyles2 = () => {
    const styles = new Set(
      source.head.querySelectorAll('style, link[rel="stylesheet"]'),
    );
    for (const [original, copy2] of copies) {
      if (!styles.has(original)) {
        copy2.node.remove();
        copies.delete(original);
      }
    }
    for (const original of styles) {
      let copy2 = copies.get(original);
      const markup = original.outerHTML;
      if (!copy2 || copy2.markup !== markup) {
        copy2?.node.remove();
        copy2 = {
          node: original.cloneNode(true),
          markup,
        };
        copies.set(original, copy2);
      }
      target.head.insertBefore(copy2.node, overrides2);
    }
  };
  const syncAttributes2 = (original, copy2) => {
    for (const attr2 of Array.from(copy2.attributes)) {
      if (!original.hasAttribute(attr2.name)) copy2.removeAttribute(attr2.name);
    }
    for (const attr2 of Array.from(original.attributes))
      copy2.setAttribute(attr2.name, attr2.value);
  };
  const syncTheme = () => {
    syncAttributes2(source.documentElement, target.documentElement);
    syncAttributes2(source.body, target.body);
  };
  syncStyles2();
  syncTheme();
  const stylesObserver = new MutationObserver(syncStyles2);
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
    for (const { node: node2 } of copies.values()) node2.remove();
    base2.remove();
    overrides2.remove();
  };
}

function measureNativeToasts(mount, view2) {
  const rects = [];
  for (const toast2 of mount.querySelectorAll("[data-sonner-toast]")) {
    if (toast2.dataset.visible === "false") continue;
    for (const element2 of [
      toast2,
      ...toast2.querySelectorAll("[data-close-button]"),
    ]) {
      const bounds = element2.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) continue;
      const x2 = Math.max(0, Math.floor(bounds.left));
      const y4 = Math.max(0, Math.floor(bounds.top));
      const right = Math.min(view2.innerWidth, Math.ceil(bounds.right));
      const bottom = Math.ceil(bounds.bottom);
      if (right > x2 && bottom > y4)
        rects.push({
          x: x2,
          y: y4,
          width: right - x2,
          height: bottom - y4,
        });
    }
  }
  return {
    rects,
    viewportWidth: view2.innerWidth,
    viewportHeight: view2.innerHeight,
  };
}

function attachNativeToastSurface(mount, update2, onFailure, inputOptions) {
  const token2 = crypto.randomUUID();
  const child = window.open(
    "about:blank",
    `${NATIVE_TOAST_WINDOW_PREFIX}${token2}`,
    `popup,${NATIVE_TOAST_WINDOW_FEATURE}=true`,
  );
  if (!child) return void 0;
  const fallback = mount.parentNode;
  let disposed = false;
  let frame2 = 0;
  let lastLayout = "";
  let settleUntil = 0;
  let emptyViewportFrames = 0;
  let stopMirror;
  let observer2;
  let resizeObserver;
  let input;
  let closedTimer;
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame2);
    if (closedTimer) clearInterval(closedTimer);
    observer2?.disconnect();
    resizeObserver?.disconnect();
    input?.dispose();
    stopMirror?.();
    child.removeEventListener("resize", schedule2);
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
    frame2 = 0;
    if (disposed) return;
    if (child.closed) {
      failed();
      return;
    }
    const layout = measureNativeToasts(mount, child);
    if (layout.viewportWidth <= 0 || layout.viewportHeight <= 0) {
      if (document.hidden || ++emptyViewportFrames <= 120)
        frame2 = requestAnimationFrame(measure);
      else failed(new Error("Native toast viewport did not initialize"));
      return;
    }
    const fingerprint = JSON.stringify(layout);
    if (fingerprint !== lastLayout) {
      lastLayout = fingerprint;
      void update2(token2, layout).catch(failed);
    }
    if (
      performance.now() < settleUntil &&
      mount.querySelector("[data-sonner-toast]")
    ) {
      frame2 = requestAnimationFrame(measure);
    }
  };
  const schedule2 = () => {
    settleUntil = performance.now() + 500;
    if (!disposed && !frame2) frame2 = requestAnimationFrame(measure);
  };
  try {
    stopMirror = mirrorToastDocument(document, child.document);
    child.document.body.appendChild(mount);
    if (inputOptions)
      input = bindNativeToastInput(
        mount,
        child,
        token2,
        inputOptions.bridge,
        failed,
        inputOptions.hotkey,
      );
    const observed = new Set();
    resizeObserver = new ResizeObserver(schedule2);
    const onMutation = () => {
      const toasts = new Set(mount.querySelectorAll("[data-sonner-toast]"));
      for (const element2 of observed) {
        if (!toasts.has(element2)) {
          resizeObserver?.unobserve(element2);
          observed.delete(element2);
        }
      }
      if (toasts.size === 0) input?.onEmpty();
      for (const element2 of toasts) {
        if (!observed.has(element2)) {
          resizeObserver?.observe(element2);
          observed.add(element2);
        }
      }
      schedule2();
    };
    observer2 = new MutationObserver(onMutation);
    observer2.observe(mount, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
    onMutation();
    child.addEventListener("resize", schedule2);
    child.addEventListener("pagehide", onPageHide);
    window.addEventListener("pagehide", cleanup);
    closedTimer = setInterval(() => {
      if (child.closed) failed();
    }, 1e3);
    schedule2();
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

function NativeToastHost({ children: children2, hotkey }) {
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
    const warn2 = (error) => {
      if (!disposed && error !== void 0)
        console.warn(
          "[toast] Native surface unavailable; using DOM fallback.",
          error,
        );
    };
    void (async () => {
      const { instantiationService: instantiationService2 } =
        await Promise.resolve().then(() => instantiation);
      return {
        instantiationService: instantiationService2,
      };
    })()
      .then(({ instantiationService: instantiationService2 }) => {
        if (disposed) return;
        const service2 = instantiationService2.invokeFunction((accessor) =>
          accessor.get(IWindowMainService),
        );
        detach = attachNativeToastSurface(
          mount,
          (token2, layout) => service2.updateNativeToast(token2, layout),
          warn2,
          {
            bridge: service2,
            hotkey,
          },
        );
      })
      .catch(warn2);
    return () => {
      disposed = true;
      detach?.();
    };
  }, [mount, hotkey]);
  return (
    <div ref={fallbackRef} data-native-toast-host="">
      {reactDomExports.createPortal(children2, mount)}
    </div>
  );
}

export const Toaster2 = ({ style: style2, ...props }) => {
  const { theme: theme2 = "system" } = z$3();
  const placement = resolveToasterPlacement();
  return (
    <NativeToastHost hotkey={props.hotkey}>
      <Toaster$1
        theme={theme2}
        className="toaster group"
        position={placement.position}
        offset={placement.offset}
        mobileOffset={placement.mobileOffset}
        icons={{
          success: <CircleCheckIcon className="size-4" />,
          info: <InfoIcon$1 className="size-4" />,
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
          ...style2,
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
