// reference-switch-popover.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  reactExports,
  reactDomExports,
  useCanvasBridge,
  ChevronRight$1,
  ImageOutlineIcon,
  useCanvasActions,
  useAssetMetadataStore,
  FileText,
  X$7,
  useStore$3,
  Video,
  Music,
  Check,
  NodeSelection,
  FileWarning,
  classifyFileType,
  FileTypeIcon,
  NodeViewWrapper,
  Node$3,
  mergeAttributes,
  ReactNodeViewRenderer,
} from "../vendor.js";
import { Tooltip$1 } from "../m01/create-tracker.jsx";
import { splitMentionFilename } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { parseCanvasReference } from "../m01/table-document-to-llm-content.js";
import { useAssetsRefValidate, serializeMentionToken } from "../m01/use-assets-ref-validate.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { MediaHoverPreview } from "./audio-preview-player.jsx";
import {
  ANCHOR_GAP$1,
  FLYOUT_CLOSE_DELAY_MS,
  FLYOUT_GAP,
  FLYOUT_SCROLL_INSET,
  KIND_ROWS,
  PANEL_MAX_HEIGHT$1,
  PANEL_WIDTH$1,
  THUMB_PX$4,
  VIEWPORT_MARGIN$3,
  disabledReasonLabel$1,
  isMentionCandidate,
} from "./mention-picker-popover.jsx";
import { TextHoverPreview, TextReadDialog } from "./thumb-chip.jsx";
import {
  VideoPlayIndicator$1,
  mapKind,
  passesBudgetGate,
  reasonForDisabled,
} from "./use-direct-reference-picker.jsx";
function ReferenceSwitchPopover({
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
  const viewportTransform = useStore$3((state2) => state2.transform);
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
      if (!isMentionCandidate(assetId, kind, allowedKinds, config2.excludeAssetIds)) return;
      if (!meta2.path || seenPaths.has(meta2.path)) return;
      const definedKind = kind;
      const alreadyAdded = config2.existingPaths.has(meta2.path) || meta2.path === currentPath;
      if (!passesBudgetGate(definedKind, alreadyAdded, config2.constraints?.remainingByKind))
        return;
      seenPaths.add(meta2.path);
      result.push({
        assetId,
        meta: meta2,
        kind: definedKind,
        alreadyAdded,
        thumbUrl:
          definedKind === "video"
            ? (resolveThumbUrl?.(meta2.path, THUMB_PX$4, "video") ?? "")
            : definedKind === "image"
              ? (resolveThumbUrl?.(meta2.path, THUMB_PX$4, "image") ??
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
        count: items.filter((item) => item.kind === row.kind && !item.alreadyAdded).length,
      })),
    [allowedKinds, items],
  );
  const categoryItems = reactExports.useMemo(
    () =>
      activeKind ? items.filter((item) => item.kind === activeKind && !item.alreadyAdded) : [],
    [activeKind, items],
  );
  const selectItem = reactExports.useCallback(
    (item) => {
      if (item.disabledReason) return;
      const sourceNodeId =
        getNodeById(item.assetId)?.id ?? getNodeIdByPath(item.meta.path) ?? void 0;
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
    const expandedWidth = PANEL_WIDTH$1 * 2 + FLYOUT_GAP;
    const left = Math.min(
      Math.max(rect.left, VIEWPORT_MARGIN$3),
      Math.max(VIEWPORT_MARGIN$3, window.innerWidth - expandedWidth - VIEWPORT_MARGIN$3),
    );
    const spaceBelow = window.innerHeight - rect.bottom - ANCHOR_GAP$1 - VIEWPORT_MARGIN$3;
    const spaceAbove = rect.top - ANCHOR_GAP$1 - VIEWPORT_MARGIN$3;
    if (spaceBelow < 220 && spaceAbove > spaceBelow) {
      return {
        bottom: window.innerHeight - rect.top + ANCHOR_GAP$1,
        left,
      };
    }
    return {
      top: rect.bottom + ANCHOR_GAP$1,
      left,
    };
  }, []);
  const [position2, setPosition] = reactExports.useState(() => computePosition2(anchorRect));
  const positioningInput = reactExports.useMemo(
    () => ({
      anchorRect,
      viewportTransform,
    }),
    [anchorRect, viewportTransform],
  );
  reactExports.useLayoutEffect(() => {
    setPosition(computePosition2(getAnchorRect?.() ?? positioningInput.anchorRect));
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
      window.innerHeight - VIEWPORT_MARGIN$3 - containerTop - flyoutHeight,
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
    const hasVisualThumbnail = (item.kind === "image" || item.kind === "video") && !!item.thumbUrl;
    return (
      <span
        className={
          hasVisualThumbnail
            ? "flex shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-muted-foreground"
            : "flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] border-[0.5px] border-border bg-secondary text-[#555555] dark:text-[#c2c2c2]"
        }
        style={{
          width: THUMB_PX$4,
          height: THUMB_PX$4,
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
      <Tooltip$1
        key={item.meta.path}
        content={
          item.disabledReason
            ? disabledReasonLabel$1(item.disabledReason, config2.constraints, t2)
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
              <Check size={14} className="shrink-0 text-muted-foreground" aria-hidden={true} />
            )}
          </button>
        </span>
      </Tooltip$1>
    );
  };
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/noStaticElementInteractions: pointer leave closes the transient cascading flyout as a single surface
    <div
      ref={panelRef}
      className="fixed z-[10002]"
      style={{
        ...position2,
        width: PANEL_WIDTH$1,
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
          width: PANEL_WIDTH$1,
          maxHeight: PANEL_MAX_HEIGHT$1,
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto py-1.5" onScroll={alignFlyoutToActiveRow}>
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
          {categoryRows.map(({ kind, labelKey, fallback, Icon: Icon2, count: count2 }) => (
            <button
              key={kind}
              type="button"
              aria-expanded={activeKind === kind}
              className={[
                "mx-2 flex h-10 w-[calc(100%_-_1rem)] items-center gap-2 rounded-lg pr-3 pl-1 text-left text-sm font-normal text-foreground transition-colors",
                activeKind === kind ? "bg-popup-item-hover" : "hover:bg-popup-item-hover",
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
                  width: THUMB_PX$4,
                  height: THUMB_PX$4,
                }}
              >
                <Icon2 size={16} aria-hidden={true} />
              </span>
              <span className="flex-1 text-sm font-normal text-foreground">
                {t2(labelKey, fallback)}
              </span>
              <span className="text-xs text-muted-foreground">{count2}</span>
              <ChevronRight$1 size={14} className="text-muted-foreground" aria-hidden={true} />
            </button>
          ))}
        </div>
      </div>
      {activeKind && (
        <div
          className="absolute left-full"
          style={{
            width: PANEL_WIDTH$1 + FLYOUT_GAP,
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
              width: PANEL_WIDTH$1,
              maxHeight: PANEL_MAX_HEIGHT$1,
            }}
          >
            <div
              className="my-2 min-h-11 overflow-y-auto overscroll-contain"
              style={{
                maxHeight: PANEL_MAX_HEIGHT$1 - FLYOUT_SCROLL_INSET * 2,
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
const THUMB_PX$3 = 18;
function MentionChipNodeView({
  node: node2,
  selected: selected2,
  editor,
  extension: extension2,
  deleteNode: deleteNode2,
  updateAttributes: updateAttributes2,
}) {
  const { t: t2 } = useTranslation();
  const { kind, filename, path: path2 } = node2.attrs;
  const [hovered, setHovered] = reactExports.useState(false);
  const [reading, setReading] = reactExports.useState(false);
  const [chipEl, setChipEl] = reactExports.useState(null);
  const { directReferences } = useCanvasBridge();
  const {
    reference,
    resolution: currentResolution,
    status,
    unavailable,
    invalid: invalid2,
  } = useAssetsRefValidate({
    path: path2,
    anchor: chipEl,
  });
  const isSubject = reference?.target === "entity";
  const subjectTypeLabel = isSubject
    ? t2(
        `assetCenter.types.${reference.entityType ?? "other"}`,
        reference.entityType ?? t2("canvas.reference.subject", "Subject"),
      )
    : "";
  const statusLabel2 =
    !reference || status === "available" || invalid2
      ? ""
      : status === "unavailable"
        ? t2("canvas.reference.checkFailed", "Unavailable")
        : t2("canvas.reference.checking", "Checking");
  const displayName2 = currentResolution?.name ?? filename;
  reactExports.useEffect(() => {
    if (
      currentResolution?.status === "available" &&
      currentResolution.name &&
      currentResolution.name !== filename
    ) {
      updateAttributes2({
        filename: currentResolution.name,
      });
    }
  }, [currentResolution, filename, updateAttributes2]);
  const [switchConfig, setSwitchConfig] = reactExports.useState(null);
  const previewCloseTimerRef = reactExports.useRef(null);
  const resolveFileUrl = extension2.options.resolveFileUrl;
  const getFileRefSwitchConfig = extension2.options.getFileRefSwitchConfig;
  const canSwitchReference = !isSubject && !!getFileRefSwitchConfig?.();
  const previewUrl = path2 && !unavailable && !isSubject ? (resolveFileUrl?.(path2) ?? "") : "";
  const assetMetadataStore = extension2.options.assetMetadataStore;
  let intrinsicWidth;
  let intrinsicHeight;
  if (path2 && assetMetadataStore) {
    for (const meta2 of assetMetadataStore.getState().assets.values()) {
      if (meta2.path !== path2) continue;
      intrinsicWidth = meta2.width;
      intrinsicHeight = meta2.height;
      break;
    }
  }
  const hasCustomPreview = Boolean(
    (reference && (isSubject || invalid2) && directReferences?.renderPreview) ||
    (!isSubject && !unavailable && path2 && (kind === "text" || previewUrl)),
  );
  const fallbackStatusLabel = invalid2
    ? status === "deleted"
      ? t2("canvas.reference.deleted", "Deleted")
      : t2("canvas.reference.missing", "File missing")
    : statusLabel2;
  const [failedPreviewUrl, setFailedPreviewUrl] = reactExports.useState(null);
  const showImageThumb = kind === "image" && !!previewUrl && failedPreviewUrl !== previewUrl;
  const showVideoThumb = kind === "video" && !!previewUrl && failedPreviewUrl !== previewUrl;
  const { stem: displayStem, ext: displayExt } = isSubject
    ? {
        stem: displayName2,
        ext: "",
      }
    : splitMentionFilename(displayName2);
  const clearPreviewCloseTimer = reactExports.useCallback(() => {
    if (previewCloseTimerRef.current) {
      clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }
  }, []);
  const showPreview = reactExports.useCallback(() => {
    clearPreviewCloseTimer();
    setHovered(true);
  }, [clearPreviewCloseTimer]);
  const schedulePreviewClose = reactExports.useCallback(() => {
    clearPreviewCloseTimer();
    previewCloseTimerRef.current = setTimeout(() => setHovered(false), 120);
  }, [clearPreviewCloseTimer]);
  reactExports.useEffect(() => clearPreviewCloseTimer, [clearPreviewCloseTimer]);
  const openSwitchPanel = reactExports.useCallback(() => {
    const config2 = getFileRefSwitchConfig?.();
    if (!config2) return;
    clearPreviewCloseTimer();
    setHovered(false);
    setSwitchConfig(config2);
  }, [clearPreviewCloseTimer, getFileRefSwitchConfig]);
  const clearChipSelection = reactExports.useCallback(() => {
    const { selection: selection2 } = editor.state;
    if (!(selection2 instanceof NodeSelection) || selection2.node.type.name !== "canvasFileRef") {
      return;
    }
    editor.commands.setTextSelection(selection2.to);
  }, [editor]);
  const closeSwitchPanel = reactExports.useCallback(() => {
    setSwitchConfig(null);
    clearChipSelection();
  }, [clearChipSelection]);
  reactExports.useEffect(() => {
    if (!selected2) setSwitchConfig(null);
  }, [selected2]);
  const chip = (
    // biome-ignore lint/a11y/noStaticElementInteractions: Tiptap inline atom owns focus/keyboard navigation
    // biome-ignore lint/a11y/useKeyWithClickEvents: Tiptap inline atom owns focus/keyboard navigation
    <span
      ref={setChipEl}
      contentEditable={false}
      title={
        hasCustomPreview
          ? void 0
          : [displayName2 || path2, fallbackStatusLabel].filter(Boolean).join(" · ")
      }
      className={[
        "group/reference relative inline-flex items-center gap-1 py-0.5 pr-1.5 pl-0.5 text-xs leading-tight select-none rounded-[8px]",
        canSwitchReference ? "cursor-pointer" : "cursor-default",
        "border",
        invalid2 ? "text-muted-foreground opacity-50" : "text-foreground",
        selected2
          ? "bg-transparent border-black/70 dark:border-white/50"
          : "bg-[var(--chat-inline-code-bg,var(--canvas-controls-hover))] border-transparent",
        "max-w-[180px] overflow-hidden whitespace-nowrap",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseEnter={isSubject ? void 0 : showPreview}
      onMouseLeave={schedulePreviewClose}
      onClick={(event) => {
        if (isSubject) return;
        event.preventDefault();
        event.stopPropagation();
        openSwitchPanel();
      }}
    >
      {isSubject ? (
        <span
          className={`shrink-0 rounded-sm px-1 py-0.5 text-xs ${invalid2 ? "bg-muted text-muted-foreground" : "bg-foreground text-background"}`}
        >
          {subjectTypeLabel}
        </span>
      ) : (
        <span
          className="relative shrink-0 flex items-center justify-center overflow-hidden rounded-[4px] border-[0.5px] border-border bg-muted/60"
          style={{
            width: THUMB_PX$3,
            height: THUMB_PX$3,
          }}
        >
          {unavailable ? (
            <FileWarning size={12} />
          ) : showImageThumb ? (
            <img
              src={previewUrl}
              onError={() => setFailedPreviewUrl(previewUrl)}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className="w-full h-full object-cover pointer-events-none transition-transform duration-150 group-hover/reference:scale-[1.04] motion-reduce:transform-none"
            />
          ) : showVideoThumb ? (
            <>
              <video
                src={previewUrl}
                onError={() => setFailedPreviewUrl(previewUrl)}
                muted={true}
                playsInline={true}
                preload="metadata"
                className="w-full h-full object-cover pointer-events-none transition-transform duration-150 group-hover/reference:scale-[1.04] motion-reduce:transform-none"
              >
                <track kind="captions" />
              </video>
              <VideoPlayIndicator$1 size={8} />
            </>
          ) : kind === "audio" ? (
            <Music size={12} />
          ) : kind === "video" ? (
            <Video size={12} />
          ) : kind === "image" &&
            classifyFileType({
              filename: displayName2,
            }).category !== "photoshop" ? (
            <ImageOutlineIcon size={12} />
          ) : (
            <FileTypeIcon
              {...classifyFileType({
                filename: displayName2,
              })}
              size={14}
              decorative={true}
            />
          )}
        </span>
      )}
      <span className="flex min-w-0 items-baseline">
        <span className="truncate min-w-0">{displayStem}</span>
        {displayExt && <span className="shrink-0 text-muted-foreground">{displayExt}</span>}
      </span>
      {!invalid2 && statusLabel2 && (
        <span className="shrink-0 text-muted-foreground">
          {"· "}
          {statusLabel2}
        </span>
      )}
      <button
        type="button"
        contentEditable={false}
        aria-label={t2("mention.popover.removeReference", "Remove")}
        data-action-ui-id="popover.prompt-reference-remove"
        className="pointer-events-none absolute right-0.5 top-1/2 flex size-3.5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-foreground text-background opacity-0 transition-opacity focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover/reference:pointer-events-auto group-hover/reference:opacity-100"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setHovered(false);
          deleteNode2();
        }}
      >
        <X$7 size={9} strokeWidth={2.2} />
      </button>
    </span>
  );
  return (
    <NodeViewWrapper as="span" className="canvas-prompt-reference-chip-wrapper mx-0.5 inline-flex">
      {reference && (isSubject || invalid2) && directReferences?.renderPreview
        ? directReferences.renderPreview({
            reference,
            trigger: chip,
            status: status ?? "checking",
          })
        : chip}
      {reading && path2 && (
        <TextReadDialog
          open={reading}
          onOpenChange={setReading}
          path={path2}
          name={displayName2 || path2}
        />
      )}
      {hovered && !reading && !isSubject && !unavailable && chipEl && kind === "text" && path2 && (
        <TextHoverPreview
          onReadFull={() => {
            setHovered(false);
            setReading(true);
          }}
          path={path2}
          name={displayName2 || path2}
          anchorElement={chipEl}
          anchorRect={chipEl.getBoundingClientRect()}
          onPreviewMouseEnter={showPreview}
          onPreviewMouseLeave={schedulePreviewClose}
        />
      )}
      {hovered && chipEl && previewUrl && kind !== "text" && (
        <MediaHoverPreview
          showFileName={true}
          kind={kind}
          url={previewUrl}
          name={displayName2 || path2}
          width={intrinsicWidth}
          height={intrinsicHeight}
          anchorElement={chipEl}
          anchorRect={chipEl.getBoundingClientRect()}
          onPreviewMouseEnter={showPreview}
          onPreviewMouseLeave={schedulePreviewClose}
        />
      )}
      {!isSubject && switchConfig && chipEl && (
        <ReferenceSwitchPopover
          anchorRect={chipEl.getBoundingClientRect()}
          getAnchorRect={() => chipEl.getBoundingClientRect()}
          currentPath={path2}
          config={switchConfig}
          resolveFileUrl={resolveFileUrl}
          onSelect={(meta2, assetId, sourceNodeId) => {
            if (meta2.path === path2) {
              closeSwitchPanel();
              return;
            }
            const nextKind =
              meta2.type === "video" || meta2.type === "audio" || meta2.type === "text"
                ? meta2.type
                : "image";
            switchConfig.onSelectAsset(meta2, assetId, sourceNodeId);
            updateAttributes2({
              path: meta2.path,
              filename: meta2.name,
              kind: nextKind,
            });
            closeSwitchPanel();
          }}
          onClose={closeSwitchPanel}
        />
      )}
    </NodeViewWrapper>
  );
}
function isPathInCurrentWorkspace(path2, assetMetadataStore) {
  if (!assetMetadataStore) return false;
  const assets = assetMetadataStore.getState().assets;
  for (const meta2 of assets.values()) {
    if (meta2.path === path2) return true;
  }
  return false;
}
export const CanvasFileRefNode = Node$3.create({
  name: "canvasFileRef",
  group: "inline",
  inline: true,
  atom: true,
  addOptions() {
    return {
      assetMetadataStore: void 0,
      // Render-time URL resolver, injected by RichPromptInput. The chip's
      // thumbnail is DERIVED from `path` on every render — never stored — so
      // a gateway port/token change can't leave it pointing at a dead URL.
      resolveFileUrl: void 0,
      // Optional live host bridge for switching exactly one inline reference.
      // RichPromptInput supplies a stable getter because Tiptap extensions are
      // configured once while model limits and attachment paths keep changing.
      getFileRefSwitchConfig: void 0,
    };
  },
  addAttributes() {
    return {
      path: {
        default: "",
      },
      filename: {
        default: "",
      },
      kind: {
        default: "image",
      },
    };
  },
  parseHTML() {
    const assetMetadataStore = this.options.assetMetadataStore;
    return [
      {
        tag: "canvas-file-ref",
        getAttrs: (node2) => {
          if (!(node2 instanceof HTMLElement)) return false;
          const path2 = node2.getAttribute("data-path") ?? node2.getAttribute("path") ?? "";
          if (!path2) return false;
          if (!parseCanvasReference(path2) && !isPathInCurrentWorkspace(path2, assetMetadataStore))
            return false;
          const kindAttr = node2.getAttribute("data-kind") ?? node2.getAttribute("kind") ?? "image";
          const kind =
            kindAttr === "video" || kindAttr === "audio" || kindAttr === "text"
              ? kindAttr
              : "image";
          return {
            path: path2,
            filename: node2.getAttribute("data-filename") ?? node2.getAttribute("filename") ?? "",
            kind,
          };
        },
      },
    ];
  },
  renderHTML({ node: node2, HTMLAttributes }) {
    return [
      "canvas-file-ref",
      mergeAttributes(HTMLAttributes, {
        "data-path": node2.attrs.path,
        "data-filename": node2.attrs.filename,
        "data-kind": node2.attrs.kind,
      }),
    ];
  },
  // Plain-text serialization (used by Tiptap's clipboardTextSerializer +
  // any caller of `editor.getText()`) — emits the canonical `@[<path>]` form
  // so a chip copied to plaintext (and into chat / external editor) is
  // self-describing and can be parsed back by `parsePromptToTiptap`.
  renderText({ node: node2 }) {
    const path2 = String(node2.attrs.path ?? "");
    return serializeMentionToken(path2);
  },
  addNodeView() {
    return ReactNodeViewRenderer(MentionChipNodeView);
  },
  addCommands() {
    return {
      insertCanvasFileRef:
        (attrs) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .focus(void 0, {
              scrollIntoView: false,
            })
            .run();
        },
      replaceAtTriggerWithFileRef:
        (attrs, triggerRange) =>
        ({ chain, state: state2 }) => {
          if (
            triggerRange &&
            Number.isInteger(triggerRange.from) &&
            Number.isInteger(triggerRange.to) &&
            triggerRange.from >= 0 &&
            triggerRange.to > triggerRange.from &&
            triggerRange.to <= state2.doc.content.size
          ) {
            const triggerText = state2.doc.textBetween(
              triggerRange.from,
              triggerRange.to,
              void 0,
              "￼",
            );
            if (triggerText.startsWith("@")) {
              return chain()
                .deleteRange(triggerRange)
                .insertContentAt(triggerRange.from, {
                  type: this.name,
                  attrs,
                })
                .focus(triggerRange.from + 1, {
                  scrollIntoView: false,
                })
                .run();
            }
          }
          const { $from } = state2.selection;
          const before = $from.nodeBefore;
          const match2 = before?.isText ? before.text?.match(/@([^\s@]*)$/) : null;
          if (match2) {
            const start2 = $from.pos - match2[0].length;
            return chain()
              .deleteRange({
                from: start2,
                to: $from.pos,
              })
              .insertContent({
                type: this.name,
                attrs,
              })
              .focus(void 0, {
                scrollIntoView: false,
              })
              .run();
          }
          return chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .focus(void 0, {
              scrollIntoView: false,
            })
            .run();
        },
      replaceCanvasFileRefsByPath:
        (path2, attrs) =>
        ({ tr: tr2, state: state2 }) => {
          const positions = [];
          state2.doc.descendants((node2, pos) => {
            if (node2.type.name === this.name && node2.attrs.path === path2) {
              positions.push(pos);
            }
          });
          for (const pos of positions) {
            tr2.setNodeMarkup(pos, void 0, attrs);
          }
          return positions.length > 0;
        },
      removeCanvasFileRefsByPath:
        (path2) =>
        ({ tr: tr2, state: state2 }) => {
          const nodesToRemove = [];
          state2.doc.descendants((node2, pos) => {
            if (node2.type.name === this.name && node2.attrs.path === path2) {
              nodesToRemove.push({
                pos,
                size: node2.nodeSize,
              });
            }
          });
          for (let i2 = nodesToRemove.length - 1; i2 >= 0; i2--) {
            const { pos, size: size2 } = nodesToRemove[i2];
            tr2.delete(pos, pos + size2);
          }
          return nodesToRemove.length > 0;
        },
    };
  },
  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr: tr2, state: state2 }) => {
          const { selection: selection2 } = state2;
          const { $from } = selection2;
          if (!selection2.empty) return false;
          const before = $from.nodeBefore;
          if (before?.type.name === this.name) {
            tr2.delete($from.pos - before.nodeSize, $from.pos);
            return true;
          }
          return false;
        }),
    };
  },
});
