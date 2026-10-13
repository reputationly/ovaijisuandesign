// browser-downloads.jsx
import { API_PATHS, reactExports, usePlatform, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import {
  Icon,
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { Download } from "../media-editing/package.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { workspaceEvents } from "./topbar-state-context.jsx";
import { Button, TooltipContent } from "../infra/dialog-content.jsx";
import { buildResourceDragItem } from "../text-editor/build-asr-gateway-request.js";
import { dispatchBrowserPickedFileToChat } from "./resolve-retry-message-payload.jsx";
import { trackEvent } from "../infra/sanitize-track-props.js";
function useBrowserDownloadPanel({
  browser,
  activeTabId,
  triggerRef,
  onError,
  onOpenResult,
}) {
  const [open, setOpen] = reactExports.useState(false);
  const [pending, setPending] = reactExports.useState(false);
  const pendingRef = reactExports.useRef(false);
  const generation = reactExports.useRef(0);
  const nativeClosedAt = reactExports.useRef(-Infinity);
  const bounds = reactExports.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const width = Math.min(360, Math.max(0, window.innerWidth - 16));
    const popoverTop = Math.min(rect.bottom + 6, Math.max(8, window.innerHeight - 120));
    return {
      x: Math.max(
        8,
        Math.min(rect.right - width, window.innerWidth - width - 8),
      ),
      y: popoverTop,
      width,
      height: Math.max(0, Math.min(520, window.innerHeight - popoverTop - 8)),
    };
  }, [triggerRef]);
  const closePanel = reactExports.useCallback(() => {
    generation.current += 1;
    pendingRef.current = false;
    setPending(false);
    setOpen(false);
    void browser?.closeDownloadsPanel().catch(() => {});
  }, [browser]);
  reactExports.useEffect(() => {
    setOpen(false);
    setPending(false);
    pendingRef.current = false;
    const stop = browser?.onDownloadsPanelStateChanged((next) => {
      if (!next) nativeClosedAt.current = performance.now();
      setOpen(next);
    });
    return () => {
      generation.current += 1;
      pendingRef.current = false;
      stop?.();
      void browser?.closeDownloadsPanel().catch(() => {});
    };
  }, [browser, activeTabId]);
  reactExports.useEffect(() => {
    if (!open && !pending) return;
    const update = () => {
      if (pendingRef.current) {
        closePanel();
        return;
      }
      const next = bounds();
      if (next) void browser?.updateDownloadsPanel(next).catch(closePanel);
    };
    const keydown = (event) => {
      if (event.key === "Escape") closePanel();
    };
    const pointerdown = (event) => {
      if (
        event.target instanceof Node &&
        !triggerRef.current?.contains(event.target)
      )
        closePanel();
    };
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", pointerdown);
    const parent = triggerRef.current?.parentElement;
    const initial = parent?.getBoundingClientRect();
    const observer = new ResizeObserver(() => {
      const current = parent?.getBoundingClientRect();
      if (
        current?.width !== initial?.width ||
        current?.height !== initial?.height
      )
        update();
    });
    if (parent) observer.observe(parent);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("pointerdown", pointerdown);
    };
  }, [open, pending, bounds, browser, closePanel, triggerRef]);
  const toggle = async (labels) => {
    if (open || pendingRef.current) {
      closePanel();
      return;
    }
    if (performance.now() - nativeClosedAt.current < 200) return;
    const next = bounds();
    if (!browser || !next) return;
    const request = ++generation.current;
    pendingRef.current = true;
    setPending(true);
    try {
      await browser.openDownloadsPanel(activeTabId, next, labels);
      onOpenResult?.("success");
    } catch {
      onOpenResult?.("failed");
      if (generation.current === request) onError();
    } finally {
      if (generation.current === request) {
        pendingRef.current = false;
        setPending(false);
      }
    }
  };
  return {
    open,
    pending,
    toggle,
    close: closePanel,
  };
}
export function BrowserDownloads({ activeTabId }) {
  const { t: translate, i18n } = useTranslation();
  const platform = usePlatform();
  const browser = window.hilo?.browser;
  const triggerRef = reactExports.useRef(null);
  const [snapshot, setSnapshot] = reactExports.useState(null);
  const onError = reactExports.useCallback(
    () => dedupedToast.error(translate("workspace.browser.downloads.loadFailed")),
    [translate],
  );
  const onOpenResult = reactExports.useCallback((result) => {
    trackEvent(TRACK_EVENTS.BROWSER_DOWNLOAD_ACTION, {
      action: "open_panel",
      result,
      item_status: "none",
    });
  }, []);
  const {
    open,
    pending,
    toggle,
  } = useBrowserDownloadPanel({
    browser,
    activeTabId,
    triggerRef,
    onError,
    onOpenResult,
  });
  reactExports.useEffect(() => {
    if (!browser) return;
    let alive = true;
    const apply = (next) => {
      if (alive)
        setSnapshot((current) =>
          !current || next.revision > current.revision ? next : current,
        );
    };
    const stop = browser.onDownloadsChanged(apply);
    void browser
      .getDownloads()
      .then(apply)
      .catch(() => {});
    return () => {
      alive = false;
      stop();
    };
  }, [browser]);
  reactExports.useEffect(() => {
    if (!browser?.onDownloadTransfer) return;
    let alive = true;
    const stop = browser.onDownloadTransfer((transfer) => {
      if (transfer.action === "add-to-canvas") {
        workspaceEvents.fireAddToCanvas(
          [
            {
              ...buildResourceDragItem(
                transfer.savePath,
                "",
                transfer.filename,
                false,
              ),
              external: true,
            },
          ],
          () =>
            dedupedToast.success(translate("workspace.browser.pluginAddedToCanvas")),
          "incremental",
        );
        return;
      }
      void (async () => {
        const response = await gatewayFetch(
          API_PATHS.serveLocal(transfer.savePath),
        );
        if (!response.ok) throw new Error("Downloaded file could not be read");
        const blob = await response.blob();
        if (!alive) return;
        dispatchBrowserPickedFileToChat({
          file: new File([blob], transfer.filename, {
            type: blob.type,
          }),
          sourceUrl: transfer.url,
        });
      })().catch(() => {
        if (alive)
          dedupedToast.error(translate("workspace.browser.downloads.actionFailed"));
      });
    });
    return () => {
      alive = false;
      stop();
    };
  }, [browser, translate]);
  const count =
    snapshot?.items.filter((item) => item.status === "progressing").length ??
    0;
  const triggerLabel = translate("workspace.browser.downloads.entry", {
    count,
  });
  const labels = () => {
    const result = {};
    for (const key of [
      "title",
      "more",
      "openFolder",
      "empty",
      "loading",
      "loadFailed",
      "actionFailed",
      "pause",
      "resume",
      "cancel",
      "open",
      "copyUrl",
      "copyPath",
      "remove",
      "progressing",
      "completed",
      "fileMissing",
      "cancelled",
      "interrupted",
      "paused",
    ]) {
      result[key] = translate(`workspace.browser.downloads.${key}`);
    }
    result.addToCanvas = translate("fileExplorer.addToCanvas");
    result.sendToChat = translate("workspace.browser.downloads.sendToChat");
    result.showInFolder = translate(
      platform.app.os === "darwin"
        ? "workspace.browser.downloads.showInFinder"
        : "workspace.browser.downloads.showInFolder",
    );
    result.speed = translate("workspace.browser.downloads.speed", {
      speed: "{{speed}}",
    });
    result.close = translate("common.close");
    result.locale = i18n.resolvedLanguage ?? i18n.language ?? "en";
    return result;
  };
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon"
          className="relative size-8 rounded-md text-muted-foreground"
          aria-label={triggerLabel}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-busy={pending || void 0}
          disabled={!browser}
          data-action-ui-id="workspace.browser.downloads.toggle"
          onClick={() => {
            void toggle(labels());
          }}
        >
          <Icon icon={Download} size="md" />
          {count > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 min-w-4 rounded-full bg-foreground px-1 text-[10px] leading-4 text-background tabular-nums"
            >
              {count}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{triggerLabel}</TooltipContent>
    </Tooltip>
  );
}
