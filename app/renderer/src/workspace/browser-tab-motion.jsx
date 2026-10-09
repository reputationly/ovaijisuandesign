// browser-tab-motion.jsx
import { useTranslation, reactExports, Check, ChevronDown, X$7, dedupedToast, API_PATHS, usePlatform, Globe } from "../vendor.js";
import { gatewayFetch } from "../infra/agent-ws-client.jsx";
import { Popover, PopoverTrigger } from "../assets/apply-asset-change.jsx";
import { Tooltip, TooltipTrigger, Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { Download } from "../media-editing/parse-item.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { workspaceEvents } from "./use-hub-logo-hover-animation.jsx";
import {
  TooltipContent,
  Button$1,
  useBrowserHoverPreview,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import { PopoverContent, PopoverTitle } from "../team/use-credit-details.jsx";
import { buildResourceDragItem } from "../text-editor/myers-line-hunks.js";
import { dispatchBrowserPickedFileToChat } from "./use-workspace-canvas-persistence.jsx";
import { trackEvent } from "../infra/init-track.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  ANNOTATION_STROKE,
  ANNOTATION_STROKE_WIDTH,
  DEFAULT_IMAGE_SIZE,
  TAG_BACKGROUND,
  TAG_TEXT_COLOR,
} from "../media-editing/use-browser-video-download.jsx";
export function sameBounds(a2, b3) {
  return a2.x === b3.x && a2.y === b3.y && a2.width === b3.width && a2.height === b3.height;
}
export function resolveDisplaySize(imageSize, stageSize) {
  const source = imageSize ?? DEFAULT_IMAGE_SIZE;
  const availableWidth = stageSize.width > 0 ? Math.max(1, stageSize.width) : source.width;
  const availableHeight = stageSize.height > 0 ? Math.max(1, stageSize.height) : source.height;
  const scale2 = Math.min(1, availableWidth / source.width, availableHeight / source.height);
  return {
    width: Math.max(1, Math.round(source.width * scale2)),
    height: Math.max(1, Math.round(source.height * scale2)),
    scale: scale2,
  };
}
export function buildTagData(id2, text2, bounds, imageSize) {
  const fontSize = 18;
  const longestLine = Math.max(...text2.split("\n").map((line) => line.length), 1);
  const estimatedWidth = Math.max(
    96,
    Math.min(imageSize.width * 0.48, longestLine * fontSize * 0.62 + 28),
  );
  const estimatedHeight = Math.max(34, text2.split("\n").length * fontSize * 1.4 + 8);
  const gap = 14;
  const canPlaceRight = bounds.x + bounds.width + gap + estimatedWidth <= imageSize.width - 4;
  const cardX = canPlaceRight
    ? bounds.x + bounds.width + gap
    : Math.max(4, bounds.x - gap - estimatedWidth);
  const cardY = Math.max(
    4,
    Math.min(imageSize.height - estimatedHeight - 4, bounds.y + bounds.height - estimatedHeight),
  );
  const anchorX = canPlaceRight ? cardX - 8 : cardX + estimatedWidth + 8;
  const anchorY = Math.max(
    cardY + 8,
    Math.min(cardY + estimatedHeight - 8, bounds.y + bounds.height * 0.78),
  );
  return {
    id: id2,
    type: "tag",
    anchorX,
    anchorY,
    x: cardX,
    y: cardY,
    width: estimatedWidth,
    height: estimatedHeight,
    // 标签宽度固定上限，长数字/中文由 TagShape 在卡片内换行。
    maxWidth: Math.max(96, Math.min(imageSize.width * 0.48, imageSize.width - 16)),
    text: text2,
    style: {
      stroke: ANNOTATION_STROKE,
      strokeWidth: ANNOTATION_STROKE_WIDTH,
      tagBackground: TAG_BACKGROUND,
      tagTextColor: TAG_TEXT_COLOR,
      tagAnchorRadius: Math.max(3, fontSize * 0.12),
      fontSize,
      fontWeight: 600,
    },
  };
}
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
      x: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
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
      if (event.target instanceof Node && !triggerRef.current?.contains(event.target)) close2();
    };
    window.addEventListener("resize", update2);
    document.addEventListener("scroll", update2, true);
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", pointerdown);
    const parent = triggerRef.current?.parentElement;
    const initial = parent?.getBoundingClientRect();
    const observer2 = new ResizeObserver(() => {
      const current2 = parent?.getBoundingClientRect();
      if (current2?.width !== initial?.width || current2?.height !== initial?.height) update2();
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
              ...buildResourceDragItem(transfer.savePath, "", transfer.filename, false),
              external: true,
            },
          ],
          () => dedupedToast.success(t2("workspace.browser.pluginAddedToCanvas")),
          "incremental",
        );
        return;
      }
      void (async () => {
        const response = await gatewayFetch(API_PATHS.serveLocal(transfer.savePath));
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
        if (alive) dedupedToast.error(t2("workspace.browser.downloads.actionFailed"));
      });
    });
    return () => {
      alive = false;
      stop();
    };
  }, [browser2, t2]);
  const count2 = snapshot2?.items.filter((item) => item.status === "progressing").length ?? 0;
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
        <Button$1
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
        </Button$1>
      </TooltipTrigger>
      <TooltipContent side="top">{triggerLabel}</TooltipContent>
    </Tooltip>
  );
}
export function BrowserTabMotion({
  id: id2,
  entering,
  exiting,
  className,
  children: children2,
  onExit,
}) {
  const ref = reactExports.useRef(null);
  const interrupted = reactExports.useRef(null);
  const closeAppearance = reactExports.useRef(null);
  const captureCloseAppearance = (target) => {
    if (!(target instanceof Element)) return;
    const close2 = target.closest("[data-browser-tab-close]");
    const node2 = ref.current;
    if (!close2 || !node2) return;
    const style2 = getComputedStyle(node2);
    closeAppearance.current = {
      backgroundColor: style2.backgroundColor,
      color: style2.color,
      opacity: getComputedStyle(close2).opacity,
    };
  };
  reactExports.useLayoutEffect(() => {
    const node2 = ref.current;
    if (!node2 || (!entering && !exiting)) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches || typeof node2.animate !== "function") {
      if (exiting) onExit(id2);
      return;
    }
    const width = node2.getBoundingClientRect().width;
    const computed = getComputedStyle(node2);
    const collapsed = {
      overflow: "hidden",
      minWidth: "0px",
      maxWidth: "0px",
      flexBasis: "0px",
      flexGrow: 0,
      paddingLeft: "0px",
      paddingRight: "0px",
      marginRight: "0px",
      opacity: 0,
      transform: "translateX(-4px)",
    };
    const expanded = {
      overflow: "hidden",
      minWidth: computed.minWidth,
      maxWidth: computed.maxWidth,
      flexBasis: computed.flexBasis,
      flexGrow: computed.flexGrow,
      paddingLeft: computed.paddingLeft,
      paddingRight: computed.paddingRight,
      marginRight: computed.marginRight,
      opacity: 1,
      transform: "translateX(0)",
    };
    const appearance =
      exiting && closeAppearance.current
        ? {
            backgroundColor: closeAppearance.current.backgroundColor,
            color: closeAppearance.current.color,
          }
        : {};
    const animation = node2.animate(
      exiting
        ? [
            {
              ...expanded,
              minWidth: `${width}px`,
              maxWidth: `${width}px`,
              flexBasis: `${width}px`,
              ...interrupted.current,
              ...appearance,
            },
            {
              ...collapsed,
              ...appearance,
            },
          ]
        : [collapsed, expanded],
      {
        duration: exiting ? 200 : 300,
        easing: exiting ? "cubic-bezier(.4, 0, .6, 1)" : "cubic-bezier(.22, 1, .36, 1)",
        fill: "both",
      },
    );
    const close2 = node2.querySelector("[data-browser-tab-close]");
    const closeAnimation =
      exiting && close2 && closeAppearance.current
        ? close2.animate(
            [
              {
                opacity: closeAppearance.current.opacity,
              },
              {
                opacity: closeAppearance.current.opacity,
              },
            ],
            {
              duration: 200,
              fill: "both",
            },
          )
        : null;
    const finish = () => {
      if (exiting) onExit(id2);
      else animation.cancel();
    };
    animation.addEventListener("finish", finish, {
      once: true,
    });
    const handleReducedMotion = () => {
      if (reduced.matches) animation.finish();
    };
    reduced.addEventListener("change", handleReducedMotion);
    return () => {
      if (animation.playState === "running") {
        const current2 = getComputedStyle(node2);
        const currentWidth = `${node2.getBoundingClientRect().width}px`;
        interrupted.current = {
          minWidth: currentWidth,
          maxWidth: currentWidth,
          flexBasis: currentWidth,
          paddingLeft: current2.paddingLeft,
          paddingRight: current2.paddingRight,
          marginRight: current2.marginRight,
          opacity: current2.opacity,
          transform: current2.transform,
        };
      } else interrupted.current = null;
      closeAnimation?.cancel();
      animation.removeEventListener("finish", finish);
      reduced.removeEventListener("change", handleReducedMotion);
      animation.cancel();
    };
  }, [entering, exiting, id2, onExit]);
  return (
    <div
      ref={ref}
      className={className}
      data-exiting={exiting}
      inert={exiting}
      aria-hidden={exiting || void 0}
      onPointerDownCapture={(event) => captureCloseAppearance(event.target)}
      onKeyDownCapture={(event) => {
        if (event.key === "Enter" || event.key === " ") captureCloseAppearance(event.target);
      }}
    >
      {children2}
    </div>
  );
}
export function BrowserTabOverview({ tabs, activeTabId, disabled: disabled2, onSelect, onClose }) {
  const { t: t2 } = useTranslation();
  const [requested, setRequested] = reactExports.useState(false);
  const triggerRef = reactExports.useRef(null);
  const [popupMounted, setPopupMounted] = reactExports.useState(false);
  const popupRef = reactExports.useCallback((element2) => {
    setPopupMounted(element2 !== null);
  }, []);
  const cancelPreparation = reactExports.useCallback(() => setRequested(false), []);
  const ready = useBrowserHoverPreview((requested && !disabled2) || popupMounted, {
    requireSnapshot: true,
    // A failed capture leaves the live page visible. Reset intent so the next
    // click retries, rather than leaving the trigger stuck in preparation.
    onError: cancelPreparation,
  });
  const open = requested && !disabled2 && ready;
  const previouslyOpenRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (open && !previouslyOpenRef.current) {
      trackEvent(TRACK_EVENTS.BROWSER_TOOLBAR_ACTION, {
        action: "tab_overview",
        source: "tab_strip",
        result: "success",
      });
    }
    previouslyOpenRef.current = open;
  }, [open]);
  reactExports.useEffect(() => {
    if (disabled2) setRequested(false);
  }, [disabled2]);
  reactExports.useEffect(() => {
    if (!requested || open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setRequested(false);
    };
    const onPointerDown2 = (event) => {
      if (!triggerRef.current?.contains(event.target)) setRequested(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown2);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown2);
    };
  }, [requested, open]);
  return (
    <Popover open={open} onOpenChange={setRequested}>
      <PopoverTrigger
        ref={triggerRef}
        data-action-ui-id="browser.tab-overview-trigger"
        onClick={(event) => {
          if (requested && !open) {
            event.preventBaseUIHandler();
            setRequested(false);
          }
        }}
        disabled={disabled2}
        aria-label={t2("workspace.browser.allTabs")}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-default disabled:opacity-40"
      >
        <Icon
          icon={ChevronDown}
          size="md"
          className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </PopoverTrigger>
      <PopoverContent
        ref={popupRef}
        data-action-ui-id="browser.tab-overview"
        align="end"
        sideOffset={8}
        className="w-72 max-w-[calc(100vw-24px)] gap-1 p-2"
      >
        <PopoverTitle className="flex h-7 shrink-0 items-center justify-between px-2 text-xs">
          {t2("workspace.browser.allTabs")}
          <span className="font-normal tabular-nums text-muted-foreground">{tabs.length}</span>
        </PopoverTitle>
        <div className="flex max-h-[min(480px,60vh)] flex-col gap-1 overflow-y-auto">
          {tabs.map((tab2) => {
            const title = tab2.title || t2("workspace.browser.newTab");
            const active2 = tab2.id === activeTabId;
            return (
              <div
                key={tab2.id}
                className={`flex shrink-0 items-center gap-2 rounded-md p-2 ${tab2.url ? "h-12" : "h-10"} ${active2 ? "bg-secondary" : "bg-muted/40 hover:bg-muted"}`}
              >
                <button
                  type="button"
                  aria-current={active2 ? "page" : void 0}
                  onClick={() => {
                    onSelect(tab2.id);
                    setRequested(false);
                  }}
                  className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="relative flex size-6 shrink-0 items-center justify-center rounded-sm bg-card">
                    <Icon icon={Globe} size="sm" />
                    {tab2.faviconUrl && (
                      <img
                        src={tab2.faviconUrl}
                        alt=""
                        className="absolute size-4 bg-card object-contain"
                        onError={(event) => {
                          event.currentTarget.hidden = true;
                        }}
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium leading-4">{title}</span>
                    {tab2.url && (
                      <span className="block truncate text-[11px] leading-4 text-muted-foreground">
                        {tab2.url}
                      </span>
                    )}
                  </span>
                  {active2 && <Check className="size-3.5 shrink-0" aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  aria-label={t2("workspace.browser.closeTabNamed", {
                    title,
                  })}
                  onClick={() => onClose(tab2.id)}
                  className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X$7 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
