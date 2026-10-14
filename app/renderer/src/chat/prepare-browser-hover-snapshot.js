// prepare-browser-hover-snapshot.js
import reactExports from "react";
import { registerBrowserHoverPreview } from "../infra/dialog-content.jsx";

const CAPTURE_TIMEOUT_MS = 800;

function settle(operation, signal) {
  return new Promise((resolve) => {
    const finish = (value) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      resolve(value);
    };
    const abort = () => finish();
    const timer = setTimeout(abort, CAPTURE_TIMEOUT_MS);
    signal.addEventListener("abort", abort, {
      once: true,
    });
    operation.then(finish, abort);
    if (signal.aborted) abort();
  });
}

function afterPaint(signal) {
  return new Promise((resolve) => {
    let frame;
    const finish = () => {
      cancelAnimationFrame(frame);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    signal.addEventListener("abort", finish, {
      once: true,
    });
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(finish);
    });
    if (signal.aborted) finish();
  });
}

async function prepareBrowserHoverSnapshot({
  browser,
  bridge,
  viewport,
  tabId,
  signal,
  requireSnapshot = false,
}) {
  const setOccluded = bridge.setNativeViewOcclusion?.bind(bridge);
  if (signal.aborted || !setOccluded) return;
  const token = `sidebar-hover:${crypto.randomUUID()}`;
  const doc = viewport?.ownerDocument ?? document;
  const initialFocus = doc.activeElement;
  let focusChanged = false;
  const onFocus = (event) => {
    if (event.target !== initialFocus) focusChanged = true;
  };
  const onPointerDown = (event) => {
    if (
      event.target instanceof Element &&
      event.target.closest(
        "input, textarea, select, button, a, [contenteditable], [tabindex]",
      )
    )
      focusChanged = true;
  };
  doc.addEventListener("focusin", onFocus);
  doc.addEventListener("pointerdown", onPointerDown, true);
  let image;
  let acquisitionStarted = false;
  let release;
  const restoreNativeView = async () => {
    if (!acquisitionStarted) return;
    if (tabId && viewport?.isConnected && browser.setBounds) {
      await afterPaint(AbortSignal.timeout(100));
      if (viewport.isConnected) {
        const rect = viewport.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          try {
            await browser.setBounds(tabId, {
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
      await setOccluded(token, false, {
        restoreFocus: false,
      });
    else await setOccluded(token, false);
    if (image) await afterPaint(AbortSignal.timeout(100));
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
        doc.removeEventListener("focusin", onFocus);
        doc.removeEventListener("pointerdown", onPointerDown, true);
        image?.remove();
      });
    return release;
  };
  const onAbort = () => void cleanup();
  signal.addEventListener("abort", onAbort, {
    once: true,
  });
  const capture = async () => {
    if (!tabId || !viewport?.isConnected || signal.aborted) return;
    const result = await settle(browser.captureFrame(tabId), signal);
    if (
      signal.aborted ||
      !result?.success ||
      !result.dataUrl?.startsWith("data:image/png;base64,")
    )
      return;
    const next = doc.createElement("img");
    next.alt = "";
    next.draggable = false;
    const rect = viewport.getBoundingClientRect();
    next.className = "pointer-events-none absolute max-w-none select-none";
    next.style.width = `${result.width ?? Math.round(rect.width)}px`;
    next.style.height = `${result.height ?? Math.round(rect.height)}px`;
    next.style.left = `${Math.round(rect.left) - rect.left}px`;
    next.style.top = `${Math.round(rect.top) - rect.top}px`;
    next.dataset.actionUiId = "browser-hover-snapshot";
    next.src = result.dataUrl;
    const decoded = await settle(
      next.decode().then(() => true),
      signal,
    );
    if (signal.aborted || !decoded || !viewport.isConnected) return;
    image = next;
    viewport.append(image);
    await afterPaint(signal);
  };
  try {
    await capture();
    if (signal.aborted) return;
    if (requireSnapshot && tabId && !image?.isConnected) {
      throw new Error(
        "Browser snapshot was not painted; keeping the native page visible",
      );
    }
    acquisitionStarted = true;
    await setOccluded(token, true);
  } catch (error) {
    await cleanup();
    throw error;
  } finally {
    if (signal.aborted || !acquisitionStarted) await cleanup();
  }
}

export function useBrowserHoverSnapshot({
  browser,
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
    if (!browser || !bridge.setNativeViewOcclusion || !viewportKey) return;
    return registerBrowserHoverPreview((signal, options) =>
      prepareBrowserHoverSnapshot({
        browser,
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
  }, [browser, bridge, viewportRef, viewportKey]);
}
