// image-slot-list.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { CompositedSvg } from "./icon-compositing.js";
import { Loader2, Plus } from "./lucide-icon-wraps.js";
import { useAssetMetadataApi, useAssetMetadataStore } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { AnnotationIconArtwork as AnnotationIcon } from "../canvas/fullscreen-icon.jsx";
import { formatTime, ImageOutlineIcon, useCanvasBridge } from "./package.jsx";
import {
  ReferenceMediaLightbox,
  ReferenceThumbnailOverlay,
  ReferenceThumbnailVideoInfo,
} from "./reference-thumbnail-overlay.jsx";
import { useCanvasActions } from "./use-canvas-actions.js";
import {
  SEEDANCE_REFERENCE_AUDIO_MAX_SEC,
  SEEDANCE_REFERENCE_AUDIO_MIN_SEC,
} from "../text-editor/build-asr-gateway-request.js";
import { basename$c } from "../generation/param-label-fallbacks.js";
import { MediaHoverPreview } from "./media-hover-preview.jsx";
import { canAnnotateCanvasImage } from "./append-width.js";
import { buildVideoThumbnailUrl } from "./build-video-thumb-base.jsx";
function ReferenceImageEditButton({ visible, onClick }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      aria-label={t("chat.imageAnnotation.annotate")}
      data-action-ui-id="popover.attachment-annotate"
      className={`absolute bottom-0.5 left-0.5 z-[3] flex size-4 cursor-pointer items-center justify-center rounded-[3px] bg-[var(--attachment-annotation-background)] text-[var(--attachment-annotation-foreground)] shadow-sm transition-opacity focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <AnnotationIcon size={12} aria-hidden={true} />
    </button>
  );
}
const CHIP_W = 80;
const CHIP_H = 72;
const FRAME_CHIP_W = 85;
const FRAME_CHIP_H = 48;
function fillImageSlotsFromIndex(
  imagePaths,
  startIndex,
  incomingPaths,
  maxSlots,
) {
  const nextPaths = [...imagePaths];
  while (nextPaths.length <= startIndex) nextPaths.push("");
  let writeIndex = startIndex;
  const newlyWritten = [];
  for (const path of incomingPaths) {
    if (writeIndex >= maxSlots) break;
    if (nextPaths[writeIndex] !== path) newlyWritten.push(path);
    nextPaths[writeIndex] = path;
    writeIndex++;
  }
  return {
    nextPaths,
    newlyWritten,
  };
}
function ReferenceImageIcon() {
  return <ImageOutlineIcon size={16} strokeWidth={2.25} aria-hidden="true" />;
}
function ReferenceVideoIcon() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <polygon points="7,5.5 11,8 7,10.5" fill="currentColor" stroke="none" />
    </CompositedSvg>
  );
}
function ReferenceAudioIcon({ className }) {
  return (
    <CompositedSvg
      width="16"
      height="16"
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2v12" />
      <path d="M4 5v6" />
      <path d="M12 5v6" />
      <path d="M2 7v2" />
      <path d="M6 4v8" />
      <path d="M10 4v8" />
      <path d="M14 7v2" />
    </CompositedSvg>
  );
}
export function ImageSlotList({
  imagePaths,
  contextKey,
  renderedSlotCount,
  maxSlots,
  disabled,
  resolveFileUrl,
  getSlotLabel,
  getSlotActionUiId,
  getSlotClassName,
  renderSlotSeparator,
  enableHoverReplace = false,
  getLocateAction,
  onReference,
  onEditImage,
  onUpdatePaths,
  onReplacePath,
  mediaKind = "image",
  hostNodeId,
  audioPerClipMinSec = SEEDANCE_REFERENCE_AUDIO_MIN_SEC,
  audioPerClipMaxSec = SEEDANCE_REFERENCE_AUDIO_MAX_SEC,
}) {
  const { t } = useTranslation();
  const assetMetadataStore = useAssetMetadataApi();
  const {
    getNodeIdByPath,
    ensureStandaloneNodeForPath,
    ensureDerivationEdge,
    removeDerivationEdge,
  } = useCanvasActions();
  const { pickAsset } = useCanvasBridge();
  const activeSlotRef = reactExports.useRef(-1);
  const [lightboxItem, setLightboxItem] = reactExports.useState(null);
  const [hoveredSlotIndex, setHoveredSlotIndex] = reactExports.useState(null);
  const [replacingSlot, setReplacingSlot] = reactExports.useState(null);
  const replacementBusyRef = reactExports.useRef(false);
  const latestSlotsRef = reactExports.useRef({
    imagePaths,
    disabled,
    mediaKind,
    maxSlots,
    contextKey,
  });
  latestSlotsRef.current = {
    imagePaths,
    disabled,
    mediaKind,
    maxSlots,
    contextKey,
  };
  const mountedRef = reactExports.useRef(true);
  reactExports.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const filledSlotElementsRef = reactExports.useRef(new Map());
  const previewCloseTimerRef = reactExports.useRef(null);
  const emptySlotLabel =
    mediaKind === "video"
      ? t("canvas.imageSlot.entryVideo")
      : mediaKind === "audio"
        ? t("canvas.imageSlot.entryAudio", {
            defaultValue: "选择参考音频",
          })
        : t("canvas.imageSlot.entry");
  const existingAttachments = reactExports.useMemo(() => {
    if (imagePaths.length === 0) return [];
    const filled = new Set(imagePaths.filter(Boolean));
    if (filled.size === 0) return [];
    const list = [];
    assetMetadataStore.getState().assets.forEach((meta, assetId) => {
      if (meta.path && filled.has(meta.path)) {
        list.push({
          assetId,
          name: meta.name,
          kind: mediaKind,
        });
      }
    });
    return list;
  }, [assetMetadataStore, imagePaths, mediaKind]);
  const handlePickFile = reactExports.useCallback(
    async (slotIdx, anchor) => {
      if (!pickAsset) {
        return;
      }
      activeSlotRef.current = slotIdx;
      let picks = null;
      try {
        const resources = await pickAsset(
          {
            type: mediaKind,
            multiple: true,
            existingAssetIds: existingAttachments.map((attachment) => attachment.assetId),
            uploadMode: "attach",
            tabs: ["canvas", "upload"],
          },
          {
            anchor,
          },
        );
        if (!resources) return;
        picks = resources
          .filter((assetRecord) => assetRecord.type === mediaKind)
          .map((assetRecord) => ({
            assetId: assetRecord.assetId,
            name: assetRecord.name,
            kind: assetRecord.type,
          }));
      } catch (err) {
        if (err?.code === "picker_busy") return;
        console.warn("[image-slot-list] pickAsset rejected", err);
        return;
      }
      if (!picks || picks.length === 0) return;
      const startIdx = activeSlotRef.current;
      if (startIdx < 0) return;
      const assetMap = assetMetadataStore.getState().assets;
      const paths = picks
        .map((pickedAsset) => assetMap.get(pickedAsset.assetId)?.path)
        .filter((assetPath) => Boolean(assetPath));
      if (paths.length === 0) return;
      const existing = new Set(imagePaths.filter(Boolean));
      const dedupedPaths = paths.filter((assetPath) => !existing.has(assetPath));
      if (dedupedPaths.length === 0) return;
      const { nextPaths, newlyWritten } = fillImageSlotsFromIndex(
        imagePaths,
        startIdx,
        dedupedPaths,
        maxSlots,
      );
      onUpdatePaths(nextPaths);
      if (hostNodeId) {
        for (const writtenPath of newlyWritten) {
          const sourceId = ensureStandaloneNodeForPath(writtenPath);
          if (sourceId) ensureDerivationEdge(sourceId, hostNodeId);
        }
      }
    },
    [
      pickAsset,
      existingAttachments,
      mediaKind,
      assetMetadataStore,
      imagePaths,
      maxSlots,
      onUpdatePaths,
      hostNodeId,
      ensureStandaloneNodeForPath,
      ensureDerivationEdge,
    ],
  );
  const handleSlotClear = reactExports.useCallback(
    (slotIdx) => {
      const removedPath = imagePaths[slotIdx];
      const next = [...imagePaths];
      next[slotIdx] = "";
      onUpdatePaths(next);
      if (hostNodeId && removedPath) {
        const sourceId = getNodeIdByPath(removedPath);
        if (sourceId) removeDerivationEdge(sourceId, hostNodeId);
      }
    },
    [
      imagePaths,
      onUpdatePaths,
      hostNodeId,
      getNodeIdByPath,
      removeDerivationEdge,
    ],
  );
  const clearPreviewCloseTimer = reactExports.useCallback(() => {
    if (previewCloseTimerRef.current === null) return;
    clearTimeout(previewCloseTimerRef.current);
    previewCloseTimerRef.current = null;
  }, []);
  const showPreview = reactExports.useCallback(
    (slotIdx) => {
      clearPreviewCloseTimer();
      setHoveredSlotIndex(slotIdx);
    },
    [clearPreviewCloseTimer],
  );
  const schedulePreviewClose = reactExports.useCallback(
    (slotIdx) => {
      clearPreviewCloseTimer();
      const slotHasFocus = () =>
        filledSlotElementsRef.current
          .get(slotIdx)
          ?.contains(document.activeElement);
      if (!enableHoverReplace && mediaKind === "audio") {
        if (!slotHasFocus()) {
          setHoveredSlotIndex((currentIndex) =>
            currentIndex === slotIdx ? null : currentIndex,
          );
        }
        return;
      }
      previewCloseTimerRef.current = setTimeout(() => {
        if (!slotHasFocus()) {
          setHoveredSlotIndex((currentIndex) =>
            currentIndex === slotIdx ? null : currentIndex,
          );
        }
        previewCloseTimerRef.current = null;
      }, 120);
    },
    [clearPreviewCloseTimer, enableHoverReplace, mediaKind],
  );
  reactExports.useEffect(
    () => clearPreviewCloseTimer,
    [clearPreviewCloseTimer],
  );
  const handleReplaceSlot = reactExports.useCallback(
    async (slotIdx) => {
      const currentPath = imagePaths[slotIdx];
      if (!currentPath || !pickAsset || disabled || replacementBusyRef.current)
        return;
      replacementBusyRef.current = true;
      setReplacingSlot(slotIdx);
      clearPreviewCloseTimer();
      setHoveredSlotIndex(null);
      const slot = filledSlotElementsRef.current.get(slotIdx);
      const anchor = slot?.querySelector("button") ?? slot;
      let resources;
      try {
        resources = await pickAsset(
          {
            type: mediaKind,
            multiple: false,
            existingAssetIds: existingAttachments.map(
              (attachment) => attachment.assetId,
            ),
            uploadMode: "attach",
            tabs: ["canvas", "upload"],
          },
          anchor
            ? {
                anchor,
                existingPaths: imagePaths.filter(Boolean),
              }
            : void 0,
        );
      } catch (err) {
        if (err?.code === "picker_busy") return;
        console.warn("[image-slot-list] replacement pickAsset rejected", err);
        return;
      } finally {
        replacementBusyRef.current = false;
        if (mountedRef.current) setReplacingSlot(null);
      }
      if (
        !mountedRef.current ||
        latestSlotsRef.current.disabled ||
        latestSlotsRef.current.mediaKind !== mediaKind ||
        latestSlotsRef.current.maxSlots !== maxSlots ||
        latestSlotsRef.current.contextKey !== contextKey ||
        latestSlotsRef.current.imagePaths[slotIdx] !== currentPath
      )
        return;
      const resource = resources?.[0];
      if (!resource || resource.type !== mediaKind) return;
      const nextPath =
        assetMetadataStore.getState().assets.get(resource.assetId)?.path ??
        resource.path;
      if (!nextPath || nextPath === currentPath) return;
      if (
        latestSlotsRef.current.imagePaths.some(
          (path, index) => index !== slotIdx && path === nextPath,
        )
      )
        return;
      const nextPaths = [...latestSlotsRef.current.imagePaths];
      while (nextPaths.length <= slotIdx) nextPaths.push("");
      nextPaths[slotIdx] = nextPath;
      onReplacePath?.(currentPath, nextPath);
      onUpdatePaths(nextPaths);
      if (hostNodeId) {
        const previousSourceId = getNodeIdByPath(currentPath);
        if (previousSourceId)
          removeDerivationEdge(previousSourceId, hostNodeId);
        const nextSourceId = ensureStandaloneNodeForPath(nextPath);
        if (nextSourceId) ensureDerivationEdge(nextSourceId, hostNodeId);
      }
    },
    [
      assetMetadataStore,
      clearPreviewCloseTimer,
      disabled,
      ensureDerivationEdge,
      ensureStandaloneNodeForPath,
      existingAttachments,
      getNodeIdByPath,
      hostNodeId,
      imagePaths,
      mediaKind,
      onUpdatePaths,
      onReplacePath,
      maxSlots,
      contextKey,
      pickAsset,
      removeDerivationEdge,
    ],
  );
  const assets = useAssetMetadataStore((storeState) => storeState.assets);
  const videoDurationByPath = reactExports.useMemo(() => {
    if (mediaKind !== "video") return null;
    const assetDurationsByPath = new Map();
    assets.forEach((meta) => {
      if (
        meta.path &&
        typeof meta.durationSec === "number" &&
        meta.durationSec > 0
      ) {
        assetDurationsByPath.set(meta.path, meta.durationSec);
      }
    });
    return assetDurationsByPath;
  }, [assets, mediaKind]);
  const audioDurationByPath = reactExports.useMemo(() => {
    if (mediaKind !== "audio") return null;
    const assetDurationsByPath = new Map();
    assets.forEach((meta) => {
      if (
        meta.path &&
        typeof meta.durationSec === "number" &&
        meta.durationSec > 0
      ) {
        assetDurationsByPath.set(meta.path, meta.durationSec);
      }
    });
    return assetDurationsByPath;
  }, [assets, mediaKind]);
  return (
    <div className={`flex flex-wrap ${getSlotLabel ? "gap-1" : "gap-2"}`}>
      {Array.from({
        length: renderedSlotCount,
      }).map((_unusedValue, slotIndex) => {
        const path = imagePaths[slotIndex];
        const rawUrl = path ? (resolveFileUrl?.(path) ?? "") : "";
        const slotLabel = getSlotLabel?.(slotIndex);
        const slotWidth = slotLabel ? FRAME_CHIP_W : CHIP_W;
        const slotHeight = slotLabel ? FRAME_CHIP_H : CHIP_H;
        const thumbUrl =
          path && rawUrl && mediaKind === "video"
            ? (buildVideoThumbnailUrl(rawUrl, path, slotWidth) ?? rawUrl)
            : rawUrl;
        const slotActionUiId = getSlotActionUiId?.(slotIndex);
        const slotClassName = getSlotClassName?.(slotIndex) ?? "";
        const titleText = path
          ? basename$c(path)
          : (slotLabel ?? emptySlotLabel);
        const durationSec =
          mediaKind === "video" && path
            ? (videoDurationByPath?.get(path) ?? 0)
            : 0;
        const durationLabel =
          durationSec > 0 ? formatTime(durationSec, true) : "";
        const wrapSlot = (slot) =>
          // biome-ignore lint/suspicious/noArrayIndexKey: slots are fixed-position by index
          jsxRuntimeExports.jsxs(
            reactExports.Fragment,
            {
              children: [slotIndex > 0 ? renderSlotSeparator?.(slotIndex) : null, slot],
            },
            slotIndex,
          );
        if (!path) {
          return wrapSlot(
            <button
              type="button"
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                void handlePickFile(slotIndex, clickEvent.currentTarget);
              }}
              disabled={disabled}
              title={titleText}
              aria-label={slotLabel ?? titleText}
              data-action-ui-id={slotActionUiId}
              className={`group/slot relative shrink-0 flex items-center justify-center overflow-hidden rounded-[8px] border-[1.5px] border-dashed border-foreground/10 text-foreground/50 transition-colors duration-150 hover:border-foreground/30 hover:text-foreground disabled:cursor-default disabled:opacity-60 ${slotLabel ? "pb-3" : "flex-col gap-1.5 bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)]"} ${slotClassName}`}
              style={{
                width: slotWidth,
                height: slotHeight,
              }}
            >
              {slotLabel ? (
                <Plus size={16} />
              ) : (
                <>
                  {mediaKind === "video" ? (
                    <ReferenceVideoIcon />
                  ) : mediaKind === "audio" ? (
                    <ReferenceAudioIcon />
                  ) : (
                    <ReferenceImageIcon />
                  )}
                  <span className="text-[11px] leading-none">{titleText}</span>
                </>
              )}
              {slotLabel && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-[var(--canvas-media-control-bg)] px-1 py-0.5 text-center text-[9px] leading-none text-[var(--canvas-media-control-fg)]">
                  {slotLabel}
                </span>
              )}
            </button>,
          );
        }
        const isAudio = mediaKind === "audio";
        const audioDuration = isAudio
          ? (audioDurationByPath?.get(path) ?? 0)
          : 0;
        const audioOutOfRange =
          isAudio &&
          audioDuration > 0 &&
          (audioDuration < audioPerClipMinSec ||
            audioDuration > audioPerClipMaxSec);
        const audioOutOfRangeLabel = audioOutOfRange
          ? audioDuration < audioPerClipMinSec
            ? t("canvas.audioSlot.tooShort", {
                defaultValue: "小于{{min}}s 不支持",
                min: audioPerClipMinSec,
              })
            : t("canvas.audioSlot.tooLong", {
                defaultValue: "超过{{max}}s 不支持",
                max: audioPerClipMaxSec,
              })
          : "";
        const hoveredSlotElement =
          hoveredSlotIndex === slotIndex && replacingSlot === null
            ? filledSlotElementsRef.current.get(slotIndex)
            : void 0;
        return wrapSlot(
          // biome-ignore lint/a11y/noStaticElementInteractions: the full-size nested button provides keyboard access; this handler also covers the slot border.
          // biome-ignore lint/a11y/useKeyWithClickEvents: the nested reference button owns keyboard activation.
          <span
            ref={(element) => {
              if (element) filledSlotElementsRef.current.set(slotIndex, element);
              else filledSlotElementsRef.current.delete(slotIndex);
            }}
            data-action-ui-id={slotActionUiId}
            className={`group/chip relative shrink-0 inline-flex items-center justify-center overflow-hidden rounded-[8px] border-[1.5px] border-transparent bg-[var(--bg-subtle)] ${disabled ? "cursor-default" : !isAudio ? "cursor-pointer" : ""} transition-[border-color,transform] duration-150 hover:border-foreground/30 motion-reduce:transform-none ${hoveredSlotIndex === slotIndex && !isAudio ? "scale-[1.04]" : ""} ${slotClassName}`}
            style={{
              width: slotWidth,
              height: slotHeight,
            }}
            title={
              rawUrl
                ? void 0
                : [titleText, audioOutOfRangeLabel].filter(Boolean).join(" · ")
            }
            onMouseDown={(event) => {
              if (isAudio || !event.currentTarget.contains(event.target))
                return;
              if (
                event.target instanceof Element &&
                event.target.closest("button")
              )
                return;
              event.preventDefault();
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (
                isAudio ||
                disabled ||
                !event.currentTarget.contains(event.target)
              )
                return;
              if (
                event.target instanceof Element &&
                event.target.closest("button")
              )
                return;
              showPreview(slotIndex);
              onReference?.(path);
            }}
            onFocus={() => showPreview(slotIndex)}
            onBlur={() => schedulePreviewClose(slotIndex)}
            onMouseEnter={() => showPreview(slotIndex)}
            onMouseLeave={() => schedulePreviewClose(slotIndex)}
          >
            {!isAudio && (
              <button
                type="button"
                disabled={disabled}
                aria-label={
                  onReference ? t("canvas.reference.addReference") : titleText
                }
                className="absolute inset-0 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-foreground"
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation();
                  showPreview(slotIndex);
                  onReference?.(path);
                }}
              />
            )}
            {isAudio ? (
              <span
                className={`flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-[var(--canvas-controls-text)] ${audioOutOfRange ? "opacity-50" : ""}`}
              >
                <ReferenceAudioIcon />
                <span className="truncate max-w-full text-[10px] leading-none">
                  {basename$c(path)}
                </span>
              </span>
            ) : thumbUrl ? (
              <img
                src={thumbUrl}
                alt={basename$c(path)}
                className="pointer-events-none h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="truncate max-w-full px-1 text-[10px] text-[var(--canvas-controls-text)]">
                {basename$c(path)}
              </span>
            )}
            {!isAudio && onReference && (
              <ReferenceThumbnailOverlay
                visible={hoveredSlotIndex === slotIndex}
                disabled={disabled}
                onReference={() => {
                  showPreview(slotIndex);
                  onReference(path);
                }}
              />
            )}
            {onEditImage &&
              !disabled &&
              replacingSlot === null &&
              canAnnotateCanvasImage(mediaKind, path, rawUrl) && (
                <ReferenceImageEditButton
                  visible={hoveredSlotIndex === slotIndex}
                  onClick={() => {
                    clearPreviewCloseTimer();
                    setHoveredSlotIndex(null);
                    setReplacingSlot(slotIndex);
                    void Promise.resolve(onEditImage(path, slotIndex)).finally(() =>
                      setReplacingSlot(null),
                    );
                  }}
                />
              )}
            {audioOutOfRange && (
              <span className="absolute inset-0 z-[1] flex items-center justify-center bg-black/55 px-1 text-center text-[10px] leading-tight text-white pointer-events-none">
                {audioOutOfRangeLabel}
              </span>
            )}
            {slotLabel && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-[var(--canvas-media-control-bg)] px-1 py-0.5 text-center text-[9px] leading-none text-[var(--canvas-media-control-fg)]">
                {slotLabel}
              </span>
            )}
            {mediaKind === "video" && (
              <ReferenceThumbnailVideoInfo
                visible={hoveredSlotIndex !== slotIndex}
                durationLabel={durationLabel || void 0}
              />
            )}
            {replacingSlot === slotIndex && (
              <div className="absolute inset-0 z-[4] flex items-center justify-center bg-background/60">
                <Loader2 size={16} className="animate-spin" />
              </div>
            )}
            <button
              type="button"
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                handleSlotClear(slotIndex);
              }}
              disabled={disabled}
              aria-label={t("canvas.imageSlot.remove")}
              data-action-ui-id={
                slotActionUiId ? `${slotActionUiId}.remove` : void 0
              }
              className={`absolute z-10 flex cursor-pointer items-center justify-center rounded-full bg-[var(--canvas-media-control-bg)] text-[var(--canvas-media-control-fg)] transition-opacity duration-150 motion-reduce:transition-none hover:bg-[var(--canvas-media-control-bg-hover)] focus-visible:opacity-100 disabled:cursor-default disabled:opacity-40 ${hoveredSlotIndex === slotIndex ? "opacity-100" : "pointer-events-none opacity-0"}`}
              style={{
                width: 16,
                height: 16,
                top: 4,
                right: 4,
              }}
            >
              <CompositedSvg
                width="8"
                height="8"
                viewBox="0 0 8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" />
              </CompositedSvg>
            </button>
            {hoveredSlotElement && !lightboxItem && rawUrl && (
              <MediaHoverPreview
                showFileName={true}
                description={audioOutOfRangeLabel || void 0}
                kind={mediaKind}
                url={rawUrl}
                name={basename$c(path)}
                durationSec={isAudio ? audioDuration : durationSec || void 0}
                posterUrl={mediaKind === "video" ? thumbUrl : void 0}
                anchorElement={hoveredSlotElement}
                anchorRect={hoveredSlotElement.getBoundingClientRect()}
                previewAction={
                  !isAudio
                    ? {
                        label: t("canvas.fullscreenPreview"),
                        onClick: () => {
                          clearPreviewCloseTimer();
                          setHoveredSlotIndex(null);
                          setLightboxItem({
                            kind: mediaKind,
                            url: rawUrl,
                            filePath: path,
                            fileName: basename$c(path),
                          });
                        },
                      }
                    : void 0
                }
                locateAction={
                  getLocateAction?.(path)
                    ? {
                        label: t("canvas.referenceNavigation.locate"),
                        onClick: () => {
                          clearPreviewCloseTimer();
                          setHoveredSlotIndex(null);
                          getLocateAction(path)?.();
                        },
                      }
                    : void 0
                }
                action={
                  enableHoverReplace && !disabled
                    ? {
                        label: t("canvas.attachment.replace", {
                          defaultValue: "Replace",
                        }),
                        onClick: () => void handleReplaceSlot(slotIndex),
                        actionUiId: slotActionUiId
                          ? `${slotActionUiId}.replace`
                          : "popover.image-slot.replace",
                      }
                    : void 0
                }
                onPreviewMouseEnter={() => showPreview(slotIndex)}
                onPreviewMouseLeave={() => schedulePreviewClose(slotIndex)}
              />
            )}
          </span>,
        );
      })}
      <ReferenceMediaLightbox
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
      />
    </div>
  );
}
