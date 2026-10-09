// mention-picker-popover.jsx
import {
  ChevronRight$1 as ChevronRight,
  dedupedToast,
  jsxRuntimeExports,
  Loader2Icon,
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
  Folder,
  ImageOutlineIcon,
  Package,
  useCanvasBridge,
} from "../media-editing/package.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { isMentionCandidate } from "./is-mention-candidate.js";
import { disabledReasonLabel } from "./disabled-reason-label.js";
import { useCanvasActions } from "../media-editing/use-canvas-actions.js";
import { Tooltip } from "./missing-asset-card.jsx";
import {
  mapKind,
  passesBudgetGate,
  reasonForDisabled,
} from "./attachment-bar.jsx";
import { useDirectReferencePicker } from "./use-direct-reference-picker.js";
const POPOVER_WIDTH = 288;
const POPOVER_MAX_HEIGHT = 360;
const FLYOUT_GAP = 4;
const FLYOUT_CLOSE_DELAY_MS = 120;
const FLYOUT_SCROLL_INSET = 8;
const POPOVER_MIN_HEIGHT = 160;
const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 4;
const THUMB_PX = 28;
const FILE_KIND_FILTERS = [
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
export function MentionPickerPopover({
  query,
  anchorRect,
  getAnchorRect,
  kindFilter,
  hideSubjects = false,
  existingPaths,
  excludeAssetIds,
  constraints: constraints2,
  resolveFileUrl,
  onSelect,
  onClose,
}) {
  const { t: t2 } = useTranslation();
  const { getNodeById, getNodeIdByPath } = useCanvasActions();
  const [focusIdx, setFocusIdx] = reactExports.useState(0);
  const containerRef = reactExports.useRef(null);
  const bodyRef = reactExports.useRef(null);
  const flyoutRef = reactExports.useRef(null);
  const activeCategoryRowRef = reactExports.useRef(null);
  const flyoutCloseTimerRef = reactExports.useRef(null);
  const [activeKind, setActiveKind] = reactExports.useState(null);
  const [flyoutOffset, setFlyoutOffset] = reactExports.useState(0);
  const viewportTransform = useStore((s2) => s2.transform);
  const pointerActiveRef = reactExports.useRef(false);
  const assets = useAssetMetadataStore((s2) => s2.assets);
  const { resolveThumbUrl, directReferences } = useCanvasBridge();
  const {
    items: directItems,
    isLoading: directLoading,
    hasError: directError,
    selectItem: selectDirectReference,
  } = useDirectReferencePicker({
    query,
    kindFilter,
    existingPaths,
    constraints: constraints2,
    onSelect,
    onConstraintViolation: (reason) =>
      dedupedToast.error(disabledReasonLabel(reason, constraints2, t2)),
  });
  const allowedKinds = reactExports.useMemo(
    () => new Set(kindFilter),
    [kindFilter],
  );
  const items = reactExports.useMemo(() => {
    const result = [];
    const seenPaths = new Set();
    const lowerQuery = query.toLowerCase();
    assets.forEach((meta2, id2) => {
      const kind = mapKind(meta2.type);
      if (!isMentionCandidate(id2, kind, allowedKinds, excludeAssetIds)) return;
      const definedKind = kind;
      const isReference = existingPaths.has(meta2.path);
      if (
        !passesBudgetGate(
          definedKind,
          isReference,
          constraints2?.remainingByKind,
        )
      )
        return;
      if (lowerQuery && !meta2.name.toLowerCase().includes(lowerQuery)) return;
      if (!meta2.path || seenPaths.has(meta2.path)) return;
      seenPaths.add(meta2.path);
      result.push({
        assetId: id2,
        meta: meta2,
        kind: definedKind,
        thumbUrl:
          definedKind === "video"
            ? (resolveThumbUrl?.(meta2.path, THUMB_PX, "video") ?? "")
            : definedKind === "image"
              ? (resolveThumbUrl?.(meta2.path, THUMB_PX, "image") ??
                resolveFileUrl?.(meta2.path) ??
                "")
              : (resolveFileUrl?.(meta2.path) ?? ""),
        alreadyAdded: isReference,
        // References bypass budget gating — they're already attached, so a
        // remaining-budget of 0 must not gray out the row that lets you
        // remove them.
        disabledReason: isReference
          ? void 0
          : reasonForDisabled(definedKind, meta2, constraints2),
      });
    });
    result.sort((a2, b3) => {
      if (a2.alreadyAdded !== b3.alreadyAdded) return a2.alreadyAdded ? -1 : 1;
      return a2.meta.name.localeCompare(b3.meta.name);
    });
    return result;
  }, [
    assets,
    allowedKinds,
    query,
    existingPaths,
    excludeAssetIds,
    resolveFileUrl,
    resolveThumbUrl,
    constraints2,
  ]);
  const referenceItems = reactExports.useMemo(
    () => items.filter((item) => item.alreadyAdded),
    [items],
  );
  const categoryRows = reactExports.useMemo(
    () => [
      ...FILE_KIND_FILTERS.filter(({ kind }) => allowedKinds.has(kind)).map(
        (row) => ({
          ...row,
          count: items.filter(
            (item) => item.kind === row.kind && !item.alreadyAdded,
          ).length,
        }),
      ),
      ...(directReferences
        ? [
            {
              kind: "project",
              labelKey: "mention.popover.tabProjectAssets",
              fallback: "Project assets",
              Icon: Folder,
              count: directItems.filter(
                (item) => item.directReferences?.[0]?.source === "project",
              ).length,
            },
            {
              kind: "subject",
              labelKey: "mention.popover.tabAssets",
              fallback: "Subject Library",
              Icon: Package,
              count: directItems.filter(
                (item) => item.directReferences?.[0]?.source === "subject",
              ).length,
            },
          ]
        : []),
    ],
    [allowedKinds, items, directReferences, directItems],
  );
  const visibleCategoryRows = categoryRows.filter(
    (row) => !hideSubjects || row.kind !== "subject",
  );
  const categoryItems = reactExports.useMemo(() => {
    if (activeKind === "project" || activeKind === "subject") {
      return directItems.filter(
        (item) => item.directReferences?.[0]?.source === activeKind,
      );
    }
    return activeKind
      ? items.filter((item) => item.kind === activeKind && !item.alreadyAdded)
      : [];
  }, [activeKind, items, directItems]);
  const navigableItems = activeKind ? categoryItems : referenceItems;
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
  reactExports.useEffect(() => {
    if (hideSubjects && activeKind === "subject") clearActiveCategory();
  }, [hideSubjects, activeKind, clearActiveCategory]);
  const renderThumb = reactExports.useCallback((item) => {
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
            className="w-full h-full object-cover pointer-events-none"
          />
        ) : item.kind === "video" ? (
          <Video size={14} aria-hidden={true} />
        ) : item.kind === "text" ? (
          <FileText size={14} aria-hidden={true} />
        ) : (
          <Music size={14} aria-hidden={true} />
        )}
      </span>
    );
  }, []);
  const selectItem = reactExports.useCallback(
    async (item) => {
      if (await selectDirectReference(item)) return;
      const sourceNodeId =
        getNodeById(item.assetId)?.id ??
        getNodeIdByPath(item.meta.path) ??
        void 0;
      onSelect(item.meta, item.assetId, sourceNodeId);
    },
    [getNodeById, getNodeIdByPath, onSelect, selectDirectReference],
  );
  const renderItem = (item, index2) => {
    return (
      <Tooltip
        key={item.meta.path}
        content={
          item.disabledReason
            ? disabledReasonLabel(item.disabledReason, constraints2, t2)
            : void 0
        }
      >
        <div className="group/row relative mx-2 flex h-11 w-[calc(100%_-_1rem)] items-center rounded-lg text-foreground transition-colors hover:bg-popup-item-hover">
          <button
            type="button"
            disabled={!!item.disabledReason}
            title={item.disabledReason ? void 0 : item.meta.name}
            data-action-ui-id={`mention-picker.item-${item.assetId}`}
            className={[
              "flex size-full items-center gap-2 rounded-lg pr-3 pl-1 text-left text-foreground",
              item.disabledReason
                ? "pointer-events-none cursor-not-allowed opacity-40"
                : "cursor-pointer",
            ].join(" ")}
            onMouseEnter={() => {
              if (pointerActiveRef.current) setFocusIdx(index2);
            }}
            onClick={(event) => {
              event.stopPropagation();
              selectItem(item);
            }}
          >
            {renderThumb(item)}
            <span className="min-w-0 flex-1 truncate text-sm font-normal text-foreground">
              {item.meta.name}
            </span>
          </button>
        </div>
      </Tooltip>
    );
  };
  reactExports.useEffect(() => {
    setFocusIdx(0);
  }, [query, activeKind]);
  reactExports.useEffect(() => {
    setFocusIdx((prev) =>
      prev > navigableItems.length - 1
        ? Math.max(0, navigableItems.length - 1)
        : prev,
    );
  }, [navigableItems.length]);
  reactExports.useEffect(() => {
    const handle2 = (e2) => {
      if (e2.key === "ArrowDown") {
        e2.preventDefault();
        e2.stopPropagation();
        pointerActiveRef.current = false;
        setFocusIdx((prev) =>
          navigableItems.length === 0
            ? 0
            : Math.min(prev + 1, navigableItems.length - 1),
        );
      } else if (e2.key === "ArrowUp") {
        e2.preventDefault();
        e2.stopPropagation();
        pointerActiveRef.current = false;
        setFocusIdx((prev) => Math.max(prev - 1, 0));
      } else if (e2.key === "Enter") {
        const item = navigableItems[focusIdx];
        if (!item || item.disabledReason) return;
        e2.preventDefault();
        e2.stopPropagation();
        selectItem(item);
      } else if (e2.key === "Escape") {
        e2.preventDefault();
        e2.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handle2, true);
    return () => document.removeEventListener("keydown", handle2, true);
  }, [focusIdx, navigableItems, onClose, selectItem]);
  const computePosition2 = reactExports.useCallback((rect) => {
    const expandedWidth = POPOVER_WIDTH * 2 + FLYOUT_GAP;
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
    const flipUp = spaceBelow < POPOVER_MAX_HEIGHT && spaceAbove > spaceBelow;
    if (flipUp) {
      return {
        bottom: window.innerHeight - rect.top + ANCHOR_GAP,
        left,
        maxHeight: Math.max(
          POPOVER_MIN_HEIGHT,
          Math.min(POPOVER_MAX_HEIGHT, spaceAbove),
        ),
      };
    }
    return {
      top: rect.bottom + ANCHOR_GAP,
      left,
      maxHeight: Math.max(
        POPOVER_MIN_HEIGHT,
        Math.min(POPOVER_MAX_HEIGHT, spaceBelow),
      ),
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
  const lastRectRef = reactExports.useRef(anchorRect);
  reactExports.useLayoutEffect(() => {
    const recompute = () => {
      const live = getAnchorRect?.() ?? null;
      const rect = live ?? lastRectRef.current ?? positioningInput.anchorRect;
      if (live) lastRectRef.current = live;
      setPosition(computePosition2(rect));
    };
    recompute();
    window.addEventListener("scroll", recompute, true);
    window.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("scroll", recompute, true);
      window.removeEventListener("resize", recompute);
    };
  }, [getAnchorRect, computePosition2, positioningInput]);
  const alignFlyoutToActiveRow = reactExports.useCallback(() => {
    const container = containerRef.current;
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
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/noStaticElementInteractions: pointer leave closes only the transient cascading flyout
    <div
      ref={containerRef}
      className="fixed z-[10001]"
      onPointerMove={() => {
        pointerActiveRef.current = true;
      }}
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={cancelFlyoutClose}
      onMouseLeave={scheduleFlyoutClose}
      style={{
        top: position2.top,
        bottom: position2.bottom,
        left: position2.left,
        width: POPOVER_WIDTH,
      }}
    >
      <div
        role="dialog"
        aria-label={t2("mention.popover.heading", "Mention")}
        className="elevated-surface-border flex flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-lg outline-none"
        style={{
          width: POPOVER_WIDTH,
          height: position2.maxHeight,
        }}
      >
        <div className="flex h-10 shrink-0 items-center justify-between px-3 text-sm font-medium text-foreground">
          <span>{t2("canvas.reference.addReference", "Add reference")}</span>
          {directLoading ? (
            <Loader2Icon
              className="size-4 animate-spin text-muted-foreground"
              aria-label={t2("common.loading", "Loading...")}
            />
          ) : null}
        </div>
        <div
          ref={bodyRef}
          className="min-h-0 flex-1 overflow-y-auto py-1.5 outline-none"
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
            {referenceItems.length > 0 ? (
              <div className="mx-3 mt-1 border-t border-border pt-3 pb-1.5 text-xs font-normal text-muted-foreground">
                {directReferences
                  ? t2("canvas.reference.addReference", "Add reference")
                  : t2("mention.switch.fromCanvas", "Add from canvas")}
              </div>
            ) : null}
          </div>
          {directError && (
            <div
              role="status"
              className="px-3 py-1 text-xs text-muted-foreground"
            >
              {t2(
                "canvas.reference.loadFailed",
                "References could not be loaded",
              )}
            </div>
          )}
          {visibleCategoryRows.map(
            ({ kind, labelKey, fallback, Icon: Icon2, count: count2 }) => (
              <button
                key={kind}
                type="button"
                aria-expanded={activeKind === kind}
                data-action-ui-id={`mention-picker.category-${kind}`}
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
            width: POPOVER_WIDTH + FLYOUT_GAP,
            top: flyoutOffset,
            paddingLeft: FLYOUT_GAP,
          }}
        >
          <section
            ref={flyoutRef}
            aria-label={t2(
              categoryRows.find((row) => row.kind === activeKind)?.labelKey ??
                "",
              categoryRows.find((row) => row.kind === activeKind)?.fallback ??
                "",
            )}
            className="elevated-surface-border flex min-h-11 flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-lg"
            style={{
              width: POPOVER_WIDTH,
              maxHeight: position2.maxHeight,
            }}
          >
            <div
              className="my-2 min-h-11 overflow-y-auto overscroll-contain"
              style={{
                maxHeight: Math.max(
                  44,
                  position2.maxHeight - FLYOUT_SCROLL_INSET * 2,
                ),
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
