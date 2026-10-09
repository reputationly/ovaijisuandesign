// browser-downloads.jsx
import {
  API_PATHS,
  dedupedToast,
  reactExports,
  usePlatform,
  useTranslation,
} from "../vendor.js";
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
  browser: browser2,
  activeTabId,
  triggerRef,
  onError,
  onOpenResult,
}) {
  const [open, setOpen] = reactExports.useState(false);
  const [pending2, setPending] = reactExports.useState(false);
  const pendingRef = reactExports.useRef(false);
  const generation = reactExports.useRef(0);
  const nativeClosedAt = reactExports.useRef(-Infinity);
  const bounds = reactExports.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const width = Math.min(360, Math.max(0, window.innerWidth - 16));
    const y4 = Math.min(rect.bottom + 6, Math.max(8, window.innerHeight - 120));
    return {
      x: Math.max(
        8,
        Math.min(rect.right - width, window.innerWidth - width - 8),
      ),
      y: y4,
      width,
      height: Math.max(0, Math.min(520, window.innerHeight - y4 - 8)),
    };
  }, [triggerRef]);
  const close2 = reactExports.useCallback(() => {
    generation.current += 1;
    pendingRef.current = false;
    setPending(false);
    setOpen(false);
    void browser2?.closeDownloadsPanel().catch(() => {});
  }, [browser2]);
  reactExports.useEffect(() => {
    setOpen(false);
    setPending(false);
    pendingRef.current = false;
    const stop = browser2?.onDownloadsPanelStateChanged((next2) => {
      if (!next2) nativeClosedAt.current = performance.now();
      setOpen(next2);
    });
    return () => {
      generation.current += 1;
      pendingRef.current = false;
      stop?.();
      void browser2?.closeDownloadsPanel().catch(() => {});
    };
  }, [browser2, activeTabId]);
  reactExports.useEffect(() => {
    if (!open && !pending2) return;
    const update2 = () => {
      if (pendingRef.current) {
        close2();
        return;
      }
      const next2 = bounds();
      if (next2) void browser2?.updateDownloadsPanel(next2).catch(close2);
    };
    const keydown = (event) => {
      if (event.key === "Escape") close2();
    };
    const pointerdown = (event) => {
      if (
        event.target instanceof Node &&
        !triggerRef.current?.contains(event.target)
      )
        close2();
    };
    window.addEventListener("resize", update2);
    document.addEventListener("scroll", update2, true);
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", pointerdown);
    const parent = triggerRef.current?.parentElement;
    const initial = parent?.getBoundingClientRect();
    const observer2 = new ResizeObserver(() => {
      const current2 = parent?.getBoundingClientRect();
      if (
        current2?.width !== initial?.width ||
        current2?.height !== initial?.height
      )
        update2();
    });
    if (parent) observer2.observe(parent);
    return () => {
      observer2.disconnect();
      window.removeEventListener("resize", update2);
      document.removeEventListener("scroll", update2, true);
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("pointerdown", pointerdown);
    };
  }, [open, pending2, bounds, browser2, close2, triggerRef]);
  const toggle = async (labels) => {
    if (open || pendingRef.current) {
      close2();
      return;
    }
    if (performance.now() - nativeClosedAt.current < 200) return;
    const next2 = bounds();
    if (!browser2 || !next2) return;
    const request = ++generation.current;
    pendingRef.current = true;
    setPending(true);
    try {
      await browser2.openDownloadsPanel(activeTabId, next2, labels);
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
    pending: pending2,
    toggle,
    close: close2,
  };
}
export function BrowserDownloads({ activeTabId }) {
  const { t: t2, i18n } = useTranslation();
  const platform2 = usePlatform();
  const browser2 = window.hilo?.browser;
  const triggerRef = reactExports.useRef(null);
  const [snapshot2, setSnapshot] = reactExports.useState(null);
  const onError = reactExports.useCallback(
    () => dedupedToast.error(t2("workspace.browser.downloads.loadFailed")),
    [t2],
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
    pending: pending2,
    toggle,
  } = useBrowserDownloadPanel({
    browser: browser2,
    activeTabId,
    triggerRef,
    onError,
    onOpenResult,
  });
  reactExports.useEffect(() => {
    if (!browser2) return;
    let alive = true;
    const apply2 = (next2) => {
      if (alive)
        setSnapshot((current2) =>
          !current2 || next2.revision > current2.revision ? next2 : current2,
        );
    };
    const stop = browser2.onDownloadsChanged(apply2);
    void browser2
      .getDownloads()
      .then(apply2)
      .catch(() => {});
    return () => {
      alive = false;
      stop();
    };
  }, [browser2]);
  reactExports.useEffect(() => {
    if (!browser2?.onDownloadTransfer) return;
    let alive = true;
    const stop = browser2.onDownloadTransfer((transfer) => {
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
            dedupedToast.success(t2("workspace.browser.pluginAddedToCanvas")),
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
          dedupedToast.error(t2("workspace.browser.downloads.actionFailed"));
      });
    });
    return () => {
      alive = false;
      stop();
    };
  }, [browser2, t2]);
  const count2 =
    snapshot2?.items.filter((item) => item.status === "progressing").length ??
    0;
  const triggerLabel = t2("workspace.browser.downloads.entry", {
    count: count2,
  });
  const labels = () => {
    const result = {};
    for (const key2 of [
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
      result[key2] = t2(`workspace.browser.downloads.${key2}`);
    }
    result.addToCanvas = t2("fileExplorer.addToCanvas");
    result.sendToChat = t2("workspace.browser.downloads.sendToChat");
    result.showInFolder = t2(
      platform2.app.os === "darwin"
        ? "workspace.browser.downloads.showInFinder"
        : "workspace.browser.downloads.showInFolder",
    );
    result.speed = t2("workspace.browser.downloads.speed", {
      speed: "{{speed}}",
    });
    result.close = t2("common.close");
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
          aria-busy={pending2 || void 0}
          disabled={!browser2}
          data-action-ui-id="workspace.browser.downloads.toggle"
          onClick={() => {
            void toggle(labels());
          }}
        >
          <Icon icon={Download} size="md" />
          {count2 > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 min-w-4 rounded-full bg-foreground px-1 text-[10px] leading-4 text-background tabular-nums"
            >
              {count2}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{triggerLabel}</TooltipContent>
    </Tooltip>
  );
}
