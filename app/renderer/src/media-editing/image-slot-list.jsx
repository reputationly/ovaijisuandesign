// image-slot-list.jsx
import { CompositedSvg, jsxRuntimeExports, Loader2, Plus, reactExports, useTranslation } from "../vendor.js";
import { useAssetMetadataApi, useAssetMetadataStore } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { AnnotationIcon$1 as AnnotationIcon } from "../canvas/fullscreen-icon.jsx";
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
  const { t: t2 } = useTranslation();
  return (
    <button
      type="button"
      aria-label={t2("chat.imageAnnotation.annotate")}
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
  for (const path2 of incomingPaths) {
    if (writeIndex >= maxSlots) break;
    if (nextPaths[writeIndex] !== path2) newlyWritten.push(path2);
    nextPaths[writeIndex] = path2;
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
function ReferenceAudioIcon() {
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
  disabled: disabled2,
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
  mediaKind: mediaKind2 = "image",
  hostNodeId,
  audioPerClipMinSec = SEEDANCE_REFERENCE_AUDIO_MIN_SEC,
  audioPerClipMaxSec = SEEDANCE_REFERENCE_AUDIO_MAX_SEC,
}) {
  const { t: t2 } = useTranslation();
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
    disabled: disabled2,
    mediaKind: mediaKind2,
    maxSlots,
    contextKey,
  });
  latestSlotsRef.current = {
    imagePaths,
    disabled: disabled2,
    mediaKind: mediaKind2,
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
    mediaKind2 === "video"
      ? t2("canvas.imageSlot.entryVideo")
      : mediaKind2 === "audio"
        ? t2("canvas.imageSlot.entryAudio", {
            defaultValue: "选择参考音频",
          })
        : t2("canvas.imageSlot.entry");
  const existingAttachments = reactExports.useMemo(() => {
    if (imagePaths.length === 0) return [];
    const filled = new Set(imagePaths.filter(Boolean));
    if (filled.size === 0) return [];
    const list2 = [];
    assetMetadataStore.getState().assets.forEach((meta2, id2) => {
      if (meta2.path && filled.has(meta2.path)) {
        list2.push({
          assetId: id2,
          name: meta2.name,
          kind: mediaKind2,
        });
      }
    });
    return list2;
  }, [assetMetadataStore, imagePaths, mediaKind2]);
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
            type: mediaKind2,
            multiple: true,
            existingAssetIds: existingAttachments.map((a2) => a2.assetId),
            uploadMode: "attach",
            tabs: ["canvas", "upload"],
          },
          {
            anchor,
          },
        );
        if (!resources) return;
        picks = resources
          .filter((r2) => r2.type === mediaKind2)
          .map((r2) => ({
            assetId: r2.assetId,
            name: r2.name,
            kind: r2.type,
          }));
      } catch (err) {
        if (err?.code === "picker_busy") return;
        console.warn("[image-slot-list] pickAsset rejected", err);
        return;
      }
      if (!picks || picks.length === 0) return;
      const startIdx = activeSlotRef.current;
      if (startIdx < 0) return;
      const assets2 = assetMetadataStore.getState().assets;
      const paths = picks
        .map((p3) => assets2.get(p3.assetId)?.path)
        .filter((p3) => Boolean(p3));
      if (paths.length === 0) return;
      const existing = new Set(imagePaths.filter(Boolean));
      const dedupedPaths = paths.filter((p3) => !existing.has(p3));
      if (dedupedPaths.length === 0) return;
      const { nextPaths, newlyWritten } = fillImageSlotsFromIndex(
        imagePaths,
        startIdx,
        dedupedPaths,
        maxSlots,
      );
      onUpdatePaths(nextPaths);
      if (hostNodeId) {
        for (const p3 of newlyWritten) {
          const sourceId = ensureStandaloneNodeForPath(p3);
          if (sourceId) ensureDerivationEdge(sourceId, hostNodeId);
        }
      }
    },
    [
      pickAsset,
      existingAttachments,
      mediaKind2,
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
      const next2 = [...imagePaths];
      next2[slotIdx] = "";
      onUpdatePaths(next2);
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
      if (!enableHoverReplace && mediaKind2 === "audio") {
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
    [clearPreviewCloseTimer, enableHoverReplace, mediaKind2],
  );
  reactExports.useEffect(
    () => clearPreviewCloseTimer,
    [clearPreviewCloseTimer],
  );
  const handleReplaceSlot = reactExports.useCallback(
    async (slotIdx) => {
      const currentPath = imagePaths[slotIdx];
      if (!currentPath || !pickAsset || disabled2 || replacementBusyRef.current)
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
            type: mediaKind2,
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
        latestSlotsRef.current.mediaKind !== mediaKind2 ||
        latestSlotsRef.current.maxSlots !== maxSlots ||
        latestSlotsRef.current.contextKey !== contextKey ||
        latestSlotsRef.current.imagePaths[slotIdx] !== currentPath
      )
        return;
      const resource = resources?.[0];
      if (!resource || resource.type !== mediaKind2) return;
      const nextPath =
        assetMetadataStore.getState().assets.get(resource.assetId)?.path ??
        resource.path;
      if (!nextPath || nextPath === currentPath) return;
      if (
        latestSlotsRef.current.imagePaths.some(
          (path2, index2) => index2 !== slotIdx && path2 === nextPath,
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
      disabled2,
      ensureDerivationEdge,
      ensureStandaloneNodeForPath,
      existingAttachments,
      getNodeIdByPath,
      hostNodeId,
      imagePaths,
      mediaKind2,
      onUpdatePaths,
      onReplacePath,
      maxSlots,
      contextKey,
      pickAsset,
      removeDerivationEdge,
    ],
  );
  const assets = useAssetMetadataStore((s2) => s2.assets);
  const videoDurationByPath = reactExports.useMemo(() => {
    if (mediaKind2 !== "video") return null;
    const map3 = new Map();
    assets.forEach((meta2) => {
      if (
        meta2.path &&
        typeof meta2.durationSec === "number" &&
        meta2.durationSec > 0
      ) {
        map3.set(meta2.path, meta2.durationSec);
      }
    });
    return map3;
  }, [assets, mediaKind2]);
  const audioDurationByPath = reactExports.useMemo(() => {
    if (mediaKind2 !== "audio") return null;
    const map3 = new Map();
    assets.forEach((meta2) => {
      if (
        meta2.path &&
        typeof meta2.durationSec === "number" &&
        meta2.durationSec > 0
      ) {
        map3.set(meta2.path, meta2.durationSec);
      }
    });
    return map3;
  }, [assets, mediaKind2]);
  return (
    <div className={`flex flex-wrap ${getSlotLabel ? "gap-1" : "gap-2"}`}>
      {Array.from({
        length: renderedSlotCount,
      }).map((_2, idx) => {
        const path2 = imagePaths[idx];
        const rawUrl = path2 ? (resolveFileUrl?.(path2) ?? "") : "";
        const slotLabel = getSlotLabel?.(idx);
        const slotWidth = slotLabel ? FRAME_CHIP_W : CHIP_W;
        const slotHeight = slotLabel ? FRAME_CHIP_H : CHIP_H;
        const thumbUrl =
          path2 && rawUrl && mediaKind2 === "video"
            ? (buildVideoThumbnailUrl(rawUrl, path2, slotWidth) ?? rawUrl)
            : rawUrl;
        const slotActionUiId = getSlotActionUiId?.(idx);
        const slotClassName = getSlotClassName?.(idx) ?? "";
        const titleText = path2
          ? basename$c(path2)
          : (slotLabel ?? emptySlotLabel);
        const durationSec =
          mediaKind2 === "video" && path2
            ? (videoDurationByPath?.get(path2) ?? 0)
            : 0;
        const durationLabel =
          durationSec > 0 ? formatTime(durationSec, true) : "";
        const wrapSlot = (slot) =>
          // biome-ignore lint/suspicious/noArrayIndexKey: slots are fixed-position by index
          jsxRuntimeExports.jsxs(
            reactExports.Fragment,
            {
              children: [idx > 0 ? renderSlotSeparator?.(idx) : null, slot],
            },
            idx,
          );
        if (!path2) {
          return wrapSlot(
            <button
              type="button"
              onClick={(e2) => {
                e2.stopPropagation();
                void handlePickFile(idx, e2.currentTarget);
              }}
              disabled={disabled2}
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
                  {mediaKind2 === "video" ? (
                    <ReferenceVideoIcon />
                  ) : mediaKind2 === "audio" ? (
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
        const isAudio = mediaKind2 === "audio";
        const audioDuration = isAudio
          ? (audioDurationByPath?.get(path2) ?? 0)
          : 0;
        const audioOutOfRange =
          isAudio &&
          audioDuration > 0 &&
          (audioDuration < audioPerClipMinSec ||
            audioDuration > audioPerClipMaxSec);
        const audioOutOfRangeLabel = audioOutOfRange
          ? audioDuration < audioPerClipMinSec
            ? t2("canvas.audioSlot.tooShort", {
                defaultValue: "小于{{min}}s 不支持",
                min: audioPerClipMinSec,
              })
            : t2("canvas.audioSlot.tooLong", {
                defaultValue: "超过{{max}}s 不支持",
                max: audioPerClipMaxSec,
              })
          : "";
        const hoveredSlotElement =
          hoveredSlotIndex === idx && replacingSlot === null
            ? filledSlotElementsRef.current.get(idx)
            : void 0;
        return wrapSlot(
          // biome-ignore lint/a11y/noStaticElementInteractions: the full-size nested button provides keyboard access; this handler also covers the slot border.
          // biome-ignore lint/a11y/useKeyWithClickEvents: the nested reference button owns keyboard activation.
          <span
            ref={(element2) => {
              if (element2) filledSlotElementsRef.current.set(idx, element2);
              else filledSlotElementsRef.current.delete(idx);
            }}
            data-action-ui-id={slotActionUiId}
            className={`group/chip relative shrink-0 inline-flex items-center justify-center overflow-hidden rounded-[8px] border-[1.5px] border-transparent bg-[var(--bg-subtle)] ${disabled2 ? "cursor-default" : !isAudio ? "cursor-pointer" : ""} transition-[border-color,transform] duration-150 hover:border-foreground/30 motion-reduce:transform-none ${hoveredSlotIndex === idx && !isAudio ? "scale-[1.04]" : ""} ${slotClassName}`}
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
                disabled2 ||
                !event.currentTarget.contains(event.target)
              )
                return;
              if (
                event.target instanceof Element &&
                event.target.closest("button")
              )
                return;
              showPreview(idx);
              onReference?.(path2);
            }}
            onFocus={() => showPreview(idx)}
            onBlur={() => schedulePreviewClose(idx)}
            onMouseEnter={() => showPreview(idx)}
            onMouseLeave={() => schedulePreviewClose(idx)}
          >
            {!isAudio && (
              <button
                type="button"
                disabled={disabled2}
                aria-label={
                  onReference ? t2("canvas.reference.addReference") : titleText
                }
                className="absolute inset-0 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-foreground"
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation();
                  showPreview(idx);
                  onReference?.(path2);
                }}
              />
            )}
            {isAudio ? (
              <span
                className={`flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-[var(--canvas-controls-text)] ${audioOutOfRange ? "opacity-50" : ""}`}
              >
                <ReferenceAudioIcon />
                <span className="truncate max-w-full text-[10px] leading-none">
                  {basename$c(path2)}
                </span>
              </span>
            ) : thumbUrl ? (
              <img
                src={thumbUrl}
                alt={basename$c(path2)}
                className="pointer-events-none h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="truncate max-w-full px-1 text-[10px] text-[var(--canvas-controls-text)]">
                {basename$c(path2)}
              </span>
            )}
            {!isAudio && onReference && (
              <ReferenceThumbnailOverlay
                visible={hoveredSlotIndex === idx}
                disabled={disabled2}
                onReference={() => {
                  showPreview(idx);
                  onReference(path2);
                }}
              />
            )}
            {onEditImage &&
              !disabled2 &&
              replacingSlot === null &&
              canAnnotateCanvasImage(mediaKind2, path2, rawUrl) && (
                <ReferenceImageEditButton
                  visible={hoveredSlotIndex === idx}
                  onClick={() => {
                    clearPreviewCloseTimer();
                    setHoveredSlotIndex(null);
                    setReplacingSlot(idx);
                    void Promise.resolve(onEditImage(path2, idx)).finally(() =>
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
            {mediaKind2 === "video" && (
              <ReferenceThumbnailVideoInfo
                visible={hoveredSlotIndex !== idx}
                durationLabel={durationLabel || void 0}
              />
            )}
            {replacingSlot === idx && (
              <div className="absolute inset-0 z-[4] flex items-center justify-center bg-background/60">
                <Loader2 size={16} className="animate-spin" />
              </div>
            )}
            <button
              type="button"
              onClick={(e2) => {
                e2.stopPropagation();
                handleSlotClear(idx);
              }}
              disabled={disabled2}
              aria-label={t2("canvas.imageSlot.remove")}
              data-action-ui-id={
                slotActionUiId ? `${slotActionUiId}.remove` : void 0
              }
              className={`absolute z-10 flex cursor-pointer items-center justify-center rounded-full bg-[var(--canvas-media-control-bg)] text-[var(--canvas-media-control-fg)] transition-opacity duration-150 motion-reduce:transition-none hover:bg-[var(--canvas-media-control-bg-hover)] focus-visible:opacity-100 disabled:cursor-default disabled:opacity-40 ${hoveredSlotIndex === idx ? "opacity-100" : "pointer-events-none opacity-0"}`}
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
                kind={mediaKind2}
                url={rawUrl}
                name={basename$c(path2)}
                durationSec={isAudio ? audioDuration : durationSec || void 0}
                posterUrl={mediaKind2 === "video" ? thumbUrl : void 0}
                anchorElement={hoveredSlotElement}
                anchorRect={hoveredSlotElement.getBoundingClientRect()}
                previewAction={
                  !isAudio
                    ? {
                        label: t2("canvas.fullscreenPreview"),
                        onClick: () => {
                          clearPreviewCloseTimer();
                          setHoveredSlotIndex(null);
                          setLightboxItem({
                            kind: mediaKind2,
                            url: rawUrl,
                            filePath: path2,
                            fileName: basename$c(path2),
                          });
                        },
                      }
                    : void 0
                }
                locateAction={
                  getLocateAction?.(path2)
                    ? {
                        label: t2("canvas.referenceNavigation.locate"),
                        onClick: () => {
                          clearPreviewCloseTimer();
                          setHoveredSlotIndex(null);
                          getLocateAction(path2)?.();
                        },
                      }
                    : void 0
                }
                action={
                  enableHoverReplace && !disabled2
                    ? {
                        label: t2("canvas.attachment.replace", {
                          defaultValue: "Replace",
                        }),
                        onClick: () => void handleReplaceSlot(idx),
                        actionUiId: slotActionUiId
                          ? `${slotActionUiId}.replace`
                          : "popover.image-slot.replace",
                      }
                    : void 0
                }
                onPreviewMouseEnter={() => showPreview(idx)}
                onPreviewMouseLeave={() => schedulePreviewClose(idx)}
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
