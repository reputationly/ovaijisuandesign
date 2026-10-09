// reference-switch-popover.jsx
import {
  Check,
  ChevronRight$1 as ChevronRight,
  jsxRuntimeExports,
  Music,
  reactDomExports,
  reactExports,
  useAssetMetadataStore,
  useStore$3 as useStore,
  useTranslation,
  Video,
} from "../vendor.js";
import {
  FileText,
  ImageOutlineIcon,
  useCanvasBridge,
} from "../media-editing/package.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useCanvasActions } from "../media-editing/use-canvas-actions.js";
import { Tooltip } from "./missing-asset-card.jsx";
import { disabledReasonLabel } from "./disabled-reason-label.js";
import { isMentionCandidate } from "./is-mention-candidate.js";
import {
  mapKind,
  passesBudgetGate,
  reasonForDisabled,
} from "./attachment-bar.jsx";
const PANEL_WIDTH = 288;
const PANEL_MAX_HEIGHT = 360;
const FLYOUT_GAP = 4;
const FLYOUT_CLOSE_DELAY_MS = 120;
const FLYOUT_SCROLL_INSET = 8;
const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 4;
const THUMB_PX = 28;
const KIND_ROWS = [
  {
    kind: "image",
    labelKey: "assetFilter.typeImage",
    fallback: "Image",
    Icon: ImageOutlineIcon,
  },
  {
    kind: "video",
    labelKey: "assetFilter.typeVideo",
    fallback: "Video",
    Icon: Video,
  },
  {
    kind: "audio",
    labelKey: "assetFilter.typeAudio",
    fallback: "Audio",
    Icon: Music,
  },
  {
    kind: "text",
    labelKey: "assetFilter.typeText",
    fallback: "Text",
    Icon: FileText,
  },
];
export function ReferenceSwitchPopover({
  anchorRect,
  getAnchorRect,
  currentPath,
  config: config2,
  resolveFileUrl,
  onSelect,
  onClose,
}) {
  const { t: t2 } = useTranslation();
  const { getNodeById, getNodeIdByPath } = useCanvasActions();
  const { resolveThumbUrl } = useCanvasBridge();
  const assets = useAssetMetadataStore((state2) => state2.assets);
  const viewportTransform = useStore((state2) => state2.transform);
  const panelRef = reactExports.useRef(null);
  const flyoutRef = reactExports.useRef(null);
  const activeCategoryRowRef = reactExports.useRef(null);
  const flyoutCloseTimerRef = reactExports.useRef(null);
  const [activeKind, setActiveKind] = reactExports.useState(null);
  const [flyoutOffset, setFlyoutOffset] = reactExports.useState(0);
  const allowedKinds = reactExports.useMemo(
    () => new Set(config2.kindFilter),
    [config2.kindFilter],
  );
  const cancelFlyoutClose = reactExports.useCallback(() => {
    if (flyoutCloseTimerRef.current === null) return;
    clearTimeout(flyoutCloseTimerRef.current);
    flyoutCloseTimerRef.current = null;
  }, []);
  const scheduleFlyoutClose = reactExports.useCallback(() => {
    cancelFlyoutClose();
    flyoutCloseTimerRef.current = setTimeout(() => {
      setActiveKind(null);
      activeCategoryRowRef.current = null;
      flyoutCloseTimerRef.current = null;
    }, FLYOUT_CLOSE_DELAY_MS);
  }, [cancelFlyoutClose]);
  const clearActiveCategory = reactExports.useCallback(() => {
    cancelFlyoutClose();
    setActiveKind(null);
    activeCategoryRowRef.current = null;
  }, [cancelFlyoutClose]);
  reactExports.useEffect(() => cancelFlyoutClose, [cancelFlyoutClose]);
  const items = reactExports.useMemo(() => {
    const result = [];
    const seenPaths = new Set();
    assets.forEach((meta2, assetId) => {
      const kind = mapKind(meta2.type);
      if (
        !isMentionCandidate(
          assetId,
          kind,
          allowedKinds,
          config2.excludeAssetIds,
        )
      )
        return;
      if (!meta2.path || seenPaths.has(meta2.path)) return;
      const definedKind = kind;
      const alreadyAdded =
        config2.existingPaths.has(meta2.path) || meta2.path === currentPath;
      if (
        !passesBudgetGate(
          definedKind,
          alreadyAdded,
          config2.constraints?.remainingByKind,
        )
      )
        return;
      seenPaths.add(meta2.path);
      result.push({
        assetId,
        meta: meta2,
        kind: definedKind,
        alreadyAdded,
        thumbUrl:
          definedKind === "video"
            ? (resolveThumbUrl?.(meta2.path, THUMB_PX, "video") ?? "")
            : definedKind === "image"
              ? (resolveThumbUrl?.(meta2.path, THUMB_PX, "image") ??
                resolveFileUrl?.(meta2.path) ??
                "")
              : (resolveFileUrl?.(meta2.path) ?? ""),
        disabledReason: alreadyAdded
          ? void 0
          : reasonForDisabled(definedKind, meta2, config2.constraints),
      });
    });
    result.sort((a2, b3) => a2.meta.name.localeCompare(b3.meta.name));
    return result;
  }, [
    allowedKinds,
    assets,
    config2.constraints,
    config2.excludeAssetIds,
    config2.existingPaths,
    currentPath,
    resolveFileUrl,
    resolveThumbUrl,
  ]);
  const referenceItems = reactExports.useMemo(
    () => items.filter((item) => item.alreadyAdded),
    [items],
  );
  const categoryRows = reactExports.useMemo(
    () =>
      KIND_ROWS.filter(({ kind }) => allowedKinds.has(kind)).map((row) => ({
        ...row,
        count: items.filter(
          (item) => item.kind === row.kind && !item.alreadyAdded,
        ).length,
      })),
    [allowedKinds, items],
  );
  const categoryItems = reactExports.useMemo(
    () =>
      activeKind
        ? items.filter((item) => item.kind === activeKind && !item.alreadyAdded)
        : [],
    [activeKind, items],
  );
  const selectItem = reactExports.useCallback(
    (item) => {
      if (item.disabledReason) return;
      const sourceNodeId =
        getNodeById(item.assetId)?.id ??
        getNodeIdByPath(item.meta.path) ??
        void 0;
      onSelect(item.meta, item.assetId, sourceNodeId);
    },
    [getNodeById, getNodeIdByPath, onSelect],
  );
  reactExports.useEffect(() => {
    const handlePointerDown = (event) => {
      if (!panelRef.current?.contains(event.target)) onClose();
    };
    const handleKeyDown2 = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown2, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown2, true);
    };
  }, [onClose]);
  const computePosition2 = reactExports.useCallback((rect) => {
    const expandedWidth = PANEL_WIDTH * 2 + FLYOUT_GAP;
    const left = Math.min(
      Math.max(rect.left, VIEWPORT_MARGIN),
      Math.max(
        VIEWPORT_MARGIN,
        window.innerWidth - expandedWidth - VIEWPORT_MARGIN,
      ),
    );
    const spaceBelow =
      window.innerHeight - rect.bottom - ANCHOR_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - ANCHOR_GAP - VIEWPORT_MARGIN;
    if (spaceBelow < 220 && spaceAbove > spaceBelow) {
      return {
        bottom: window.innerHeight - rect.top + ANCHOR_GAP,
        left,
      };
    }
    return {
      top: rect.bottom + ANCHOR_GAP,
      left,
    };
  }, []);
  const [position2, setPosition] = reactExports.useState(() =>
    computePosition2(anchorRect),
  );
  const positioningInput = reactExports.useMemo(
    () => ({
      anchorRect,
      viewportTransform,
    }),
    [anchorRect, viewportTransform],
  );
  reactExports.useLayoutEffect(() => {
    setPosition(
      computePosition2(getAnchorRect?.() ?? positioningInput.anchorRect),
    );
  }, [computePosition2, getAnchorRect, positioningInput]);
  const alignFlyoutToActiveRow = reactExports.useCallback(() => {
    const container = panelRef.current;
    const row = activeCategoryRowRef.current;
    const flyout = flyoutRef.current;
    if (!container || !row || !flyout) return;
    const containerTop = container.getBoundingClientRect().top;
    const desiredOffset = row.getBoundingClientRect().top - containerTop;
    const flyoutHeight = flyout.getBoundingClientRect().height;
    const maxOffset2 = Math.max(
      0,
      window.innerHeight - VIEWPORT_MARGIN - containerTop - flyoutHeight,
    );
    setFlyoutOffset(Math.max(0, Math.min(desiredOffset, maxOffset2)));
  }, []);
  const flyoutAlignmentInput = reactExports.useMemo(
    () => ({
      activeKind,
      itemCount: categoryItems.length,
      positioningInput,
    }),
    [activeKind, categoryItems.length, positioningInput],
  );
  reactExports.useLayoutEffect(() => {
    if (!flyoutAlignmentInput.activeKind) {
      setFlyoutOffset(0);
      return;
    }
    alignFlyoutToActiveRow();
    const resizeObserver = new ResizeObserver(alignFlyoutToActiveRow);
    if (flyoutRef.current) resizeObserver.observe(flyoutRef.current);
    window.addEventListener("resize", alignFlyoutToActiveRow);
    window.addEventListener("scroll", alignFlyoutToActiveRow, true);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", alignFlyoutToActiveRow);
      window.removeEventListener("scroll", alignFlyoutToActiveRow, true);
    };
  }, [alignFlyoutToActiveRow, flyoutAlignmentInput]);
  const renderThumb = (item) => {
    const hasVisualThumbnail =
      (item.kind === "image" || item.kind === "video") && !!item.thumbUrl;
    return (
      <span
        className={
          hasVisualThumbnail
            ? "flex shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-muted-foreground"
            : "flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] border-[0.5px] border-border bg-secondary text-[#555555] dark:text-[#c2c2c2]"
        }
        style={{
          width: THUMB_PX,
          height: THUMB_PX,
        }}
      >
        {hasVisualThumbnail ? (
          <img
            src={item.thumbUrl}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="size-full object-cover pointer-events-none"
          />
        ) : item.kind === "video" ? (
          <Video size={14} aria-hidden={true} />
        ) : item.kind === "audio" ? (
          <Music size={14} aria-hidden={true} />
        ) : (
          <FileText size={14} aria-hidden={true} />
        )}
      </span>
    );
  };
  const renderItem = (item) => {
    const selected2 = item.meta.path === currentPath;
    return (
      <Tooltip
        key={item.meta.path}
        content={
          item.disabledReason
            ? disabledReasonLabel(item.disabledReason, config2.constraints, t2)
            : void 0
        }
      >
        <span className="block">
          <button
            type="button"
            disabled={!!item.disabledReason}
            title={item.disabledReason ? void 0 : item.meta.name}
            data-action-ui-id={`prompt-reference-switch.item-${item.assetId}`}
            className={[
              "mx-2 flex h-11 w-[calc(100%_-_1rem)] items-center gap-2 rounded-lg pr-3 pl-1 text-left text-foreground transition-colors hover:bg-popup-item-hover",
              item.disabledReason
                ? "pointer-events-none cursor-not-allowed opacity-40"
                : "cursor-pointer",
            ].join(" ")}
            onClick={() => selectItem(item)}
          >
            {renderThumb(item)}
            <span className="min-w-0 flex-1 truncate text-sm font-normal text-foreground">
              {item.meta.name}
            </span>
            {selected2 && (
              <Check
                size={14}
                className="shrink-0 text-muted-foreground"
                aria-hidden={true}
              />
            )}
          </button>
        </span>
      </Tooltip>
    );
  };
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/noStaticElementInteractions: pointer leave closes the transient cascading flyout as a single surface
    <div
      ref={panelRef}
      className="fixed z-[10002]"
      style={{
        ...position2,
        width: PANEL_WIDTH,
      }}
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={cancelFlyoutClose}
      onMouseLeave={scheduleFlyoutClose}
    >
      <div
        role="dialog"
        aria-label={t2("mention.switch.title", "Switch reference")}
        className="elevated-surface-border flex flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-lg"
        style={{
          width: PANEL_WIDTH,
          maxHeight: PANEL_MAX_HEIGHT,
        }}
      >
        <div
          className="min-h-0 flex-1 overflow-y-auto py-1.5"
          onScroll={alignFlyoutToActiveRow}
        >
          <div onMouseEnter={clearActiveCategory}>
            {referenceItems.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs font-normal text-muted-foreground">
                  {t2("mention.switch.current", "Current references")}
                </div>
                {referenceItems.map(renderItem)}
              </>
            )}
            <div
              className={
                referenceItems.length > 0
                  ? "mx-3 mt-1 border-t border-border pt-3 pb-1.5 text-xs font-normal text-muted-foreground"
                  : "px-3 py-1.5 text-xs font-normal text-muted-foreground"
              }
            >
              {t2("mention.switch.fromCanvas", "Add from canvas")}
            </div>
          </div>
          {categoryRows.map(
            ({ kind, labelKey, fallback, Icon: Icon2, count: count2 }) => (
              <button
                key={kind}
                type="button"
                aria-expanded={activeKind === kind}
                className={[
                  "mx-2 flex h-10 w-[calc(100%_-_1rem)] items-center gap-2 rounded-lg pr-3 pl-1 text-left text-sm font-normal text-foreground transition-colors",
                  activeKind === kind
                    ? "bg-popup-item-hover"
                    : "hover:bg-popup-item-hover",
                ].join(" ")}
                onMouseEnter={(event) => {
                  cancelFlyoutClose();
                  activeCategoryRowRef.current = event.currentTarget;
                  setActiveKind(kind);
                }}
                onClick={(event) => {
                  activeCategoryRowRef.current = event.currentTarget;
                  setActiveKind(kind);
                }}
              >
                <span
                  className="flex shrink-0 items-center justify-center rounded-[6px] border-[0.5px] border-border bg-secondary text-[#555555] dark:text-[#c2c2c2]"
                  style={{
                    width: THUMB_PX,
                    height: THUMB_PX,
                  }}
                >
                  <Icon2 size={16} aria-hidden={true} />
                </span>
                <span className="flex-1 text-sm font-normal text-foreground">
                  {t2(labelKey, fallback)}
                </span>
                <span className="text-xs text-muted-foreground">{count2}</span>
                <ChevronRight
                  size={14}
                  className="text-muted-foreground"
                  aria-hidden={true}
                />
              </button>
            ),
          )}
        </div>
      </div>
      {activeKind && (
        <div
          className="absolute left-full"
          style={{
            width: PANEL_WIDTH + FLYOUT_GAP,
            top: flyoutOffset,
            paddingLeft: FLYOUT_GAP,
          }}
        >
          <section
            ref={flyoutRef}
            aria-label={t2(
              KIND_ROWS.find((row) => row.kind === activeKind)?.labelKey ?? "",
              KIND_ROWS.find((row) => row.kind === activeKind)?.fallback ?? "",
            )}
            className="elevated-surface-border flex min-h-11 flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-lg"
            style={{
              width: PANEL_WIDTH,
              maxHeight: PANEL_MAX_HEIGHT,
            }}
          >
            <div
              className="my-2 min-h-11 overflow-y-auto overscroll-contain"
              style={{
                maxHeight: PANEL_MAX_HEIGHT - FLYOUT_SCROLL_INSET * 2,
              }}
            >
              {categoryItems.length > 0 ? (
                categoryItems.map(renderItem)
              ) : (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  {t2("mention.switch.empty", "No available assets")}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>,
    document.body,
  );
}
