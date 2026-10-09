// prepare-browser-hover-snapshot.js
import { reactExports } from "../vendor.js";
import { registerBrowserHoverPreview } from "../infra/dialog-content.jsx";

const CAPTURE_TIMEOUT_MS = 800;

function settle(operation, signal) {
  return new Promise((resolve) => {
    const finish = (value) => {
      clearTimeout(timer2);
      signal.removeEventListener("abort", abort);
      resolve(value);
    };
    const abort = () => finish();
    const timer2 = setTimeout(abort, CAPTURE_TIMEOUT_MS);
    signal.addEventListener("abort", abort, {
      once: true,
    });
    operation.then(finish, abort);
    if (signal.aborted) abort();
  });
}

function afterPaint(signal) {
  return new Promise((resolve) => {
    let frame2;
    const finish = () => {
      cancelAnimationFrame(frame2);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    signal.addEventListener("abort", finish, {
      once: true,
    });
    frame2 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(finish);
    });
    if (signal.aborted) finish();
  });
}

async function prepareBrowserHoverSnapshot({
  browser: browser2,
  bridge,
  viewport,
  tabId,
  signal,
  requireSnapshot = false,
}) {
  const setOccluded = bridge.setNativeViewOcclusion?.bind(bridge);
  if (signal.aborted || !setOccluded) return;
  const token2 = `sidebar-hover:${crypto.randomUUID()}`;
  const doc2 = viewport?.ownerDocument ?? document;
  const initialFocus = doc2.activeElement;
  let focusChanged = false;
  const onFocus = (event) => {
    if (event.target !== initialFocus) focusChanged = true;
  };
  const onPointerDown2 = (event) => {
    if (
      event.target instanceof Element &&
      event.target.closest(
        "input, textarea, select, button, a, [contenteditable], [tabindex]",
      )
    )
      focusChanged = true;
  };
  doc2.addEventListener("focusin", onFocus);
  doc2.addEventListener("pointerdown", onPointerDown2, true);
  let image2;
  let acquisitionStarted = false;
  let release;
  const restoreNativeView = async () => {
    if (!acquisitionStarted) return;
    if (tabId && viewport?.isConnected && browser2.setBounds) {
      await afterPaint(AbortSignal.timeout(100));
      if (viewport.isConnected) {
        const rect = viewport.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          try {
            await browser2.setBounds(tabId, {
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            });
          } catch (error) {
            console.error(
              "[browser-hover-snapshot] Failed to restore native bounds",
              error,
            );
          }
        }
      }
    }
    if (focusChanged)
      await setOccluded(token2, false, {
        restoreFocus: false,
      });
    else await setOccluded(token2, false);
    if (image2) await afterPaint(AbortSignal.timeout(100));
  };
  const cleanup = () => {
    signal.removeEventListener("abort", onAbort);
    release ??= restoreNativeView()
      .catch((error) => {
        console.error(
          "[browser-hover-snapshot] Failed to release native view",
          error,
        );
      })
      .finally(() => {
        doc2.removeEventListener("focusin", onFocus);
        doc2.removeEventListener("pointerdown", onPointerDown2, true);
        image2?.remove();
      });
    return release;
  };
  const onAbort = () => void cleanup();
  signal.addEventListener("abort", onAbort, {
    once: true,
  });
  const capture = async () => {
    if (!tabId || !viewport?.isConnected || signal.aborted) return;
    const result = await settle(browser2.captureFrame(tabId), signal);
    if (
      signal.aborted ||
      !result?.success ||
      !result.dataUrl?.startsWith("data:image/png;base64,")
    )
      return;
    const next2 = doc2.createElement("img");
    next2.alt = "";
    next2.draggable = false;
    const rect = viewport.getBoundingClientRect();
    next2.className = "pointer-events-none absolute max-w-none select-none";
    next2.style.width = `${result.width ?? Math.round(rect.width)}px`;
    next2.style.height = `${result.height ?? Math.round(rect.height)}px`;
    next2.style.left = `${Math.round(rect.left) - rect.left}px`;
    next2.style.top = `${Math.round(rect.top) - rect.top}px`;
    next2.dataset.actionUiId = "browser-hover-snapshot";
    next2.src = result.dataUrl;
    const decoded = await settle(
      next2.decode().then(() => true),
      signal,
    );
    if (signal.aborted || !decoded || !viewport.isConnected) return;
    image2 = next2;
    viewport.append(image2);
    await afterPaint(signal);
  };
  try {
    await capture();
    if (signal.aborted) return;
    if (requireSnapshot && tabId && !image2?.isConnected) {
      throw new Error(
        "Browser snapshot was not painted; keeping the native page visible",
      );
    }
    acquisitionStarted = true;
    await setOccluded(token2, true);
  } catch (error) {
    await cleanup();
    throw error;
  } finally {
    if (signal.aborted || !acquisitionStarted) await cleanup();
  }
}

export function useBrowserHoverSnapshot({
  browser: browser2,
  bridge,
  viewportRef,
  tabId,
  viewportKey,
}) {
  const currentTabId = reactExports.useRef(tabId);
  reactExports.useLayoutEffect(() => {
    currentTabId.current = tabId;
  }, [tabId]);
  reactExports.useEffect(() => {
    if (!browser2 || !bridge.setNativeViewOcclusion || !viewportKey) return;
    return registerBrowserHoverPreview((signal, options) =>
      prepareBrowserHoverSnapshot({
        browser: browser2,
        bridge,
        viewport: viewportRef.current,
        // A lease belongs to the mounted surface, not its active tab. Closing
        // or switching a tab while a popup is open must not release/reacquire
        // occlusion and collapse the popup during the next capture. A new
        // request captures the latest committed tab; an open request stays frozen.
        tabId: currentTabId.current,
        signal,
        requireSnapshot: options?.requireSnapshot,
      }),
    );
  }, [browser2, bridge, viewportRef, viewportKey]);
}
