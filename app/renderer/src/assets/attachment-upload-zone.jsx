// attachment-upload-zone.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  API_PATHS,
  classifyFileType,
  FolderUp,
  jsxRuntimeExports,
  reactExports,
  Scan,
  useTranslation,
  Video,
  X$7 as X,
} from "../vendor.js";
import { Select } from "./credit-query-keys.jsx";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../infra/select-content.jsx";
import {
  Button,
  cn$2 as cn,
  Dialog,
  DialogContent,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import { assetCenterLog, Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { AudioPlayButton, FileNameLabel } from "./audio-play-button.jsx";
import { gatewayUrl } from "../infra/gateway-http-error.jsx";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { MediaLightbox } from "./text-preview.jsx";
import { StagedRow } from "./staged-row.jsx";
import { AssetCenterApiError } from "./wrap-as-asset-center-error.js";
import { Upload } from "../media-editing/package.jsx";
import { trackAssetCenterAction } from "../infra/use-online.jsx";
import { resolveAssetCenterErrorKey } from "./key-entries.js";
const ATTACHMENT_EXTENSIONS = {
  image: ["png", "jpg", "jpeg", "webp", "gif", "heic", "heif"],
  video: ["mp4", "webm"],
  audio: ["mp3", "wav", "m4a", "ogg"],
  text: ["txt", "md", "json", "jsonl", "yaml", "yml", "csv"],
  document: [
    // 演示文件
    "pptx",
    "ppt",
    "pot",
    "potx",
    "pps",
    "ppsx",
    "dps",
    "dpt",
    "pptm",
    "potm",
    "ppsm",
    // 文字文件
    "doc",
    "dot",
    "wps",
    "wpt",
    "docx",
    "dotx",
    "docm",
    "dotm",
    // 表格文件 (csv 归 text，不在此)
    "xls",
    "xlt",
    "et",
    "ett",
    "xlsx",
    "xltx",
    "xlsb",
    "xlsm",
    "xltm",
    "ets",
    // 其他
    "pdf",
  ],
};
const CROP_ASPECT_RATIOS = {
  free: null,
  "1:1": 1,
  "4:3": 4 / 3,
  "3:4": 3 / 4,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
};
const DEFAULT_CROP_RECT = {
  x: 0.1,
  y: 0.1,
  width: 0.8,
  height: 0.8,
};
const MIN_CROP_RATIO = 0.05;
const MIN_CROP_SIZE = 48;
const MAX_CROP_OUTPUT_DIMENSION = 2048;
function clamp(value, min2, max2) {
  return Math.min(Math.max(value, min2), max2);
}
function minCropFraction(containerSize) {
  return containerSize && containerSize > 0
    ? Math.max(MIN_CROP_RATIO, MIN_CROP_SIZE / containerSize)
    : MIN_CROP_RATIO;
}
function clampCropRect(rect, containerWidth, containerHeight) {
  const width = clamp(rect.width, minCropFraction(containerWidth), 1);
  const height = clamp(rect.height, minCropFraction(containerHeight), 1);
  return {
    x: clamp(rect.x, 0, 1 - width),
    y: clamp(rect.y, 0, 1 - height),
    width,
    height,
  };
}
function cropRectForAspectRatio(ratio, containerWidth, containerHeight) {
  if (ratio === null || containerWidth <= 0 || containerHeight <= 0)
    return DEFAULT_CROP_RECT;
  const normalizedRatio = ratio / (containerWidth / containerHeight);
  let width = 0.8;
  let height = width / normalizedRatio;
  if (height > 0.8) {
    height = 0.8;
    width = height * normalizedRatio;
  }
  return {
    x: (1 - width) / 2,
    y: (1 - height) / 2,
    width,
    height,
  };
}
function calculateCropRect({
  initialRect,
  deltaX,
  deltaY,
  handle: handle2,
  aspectRatio,
  containerWidth,
  containerHeight,
}) {
  if (handle2 === null) {
    return clampCropRect(
      {
        ...initialRect,
        x: initialRect.x + deltaX,
        y: initialRect.y + deltaY,
      },
      containerWidth,
      containerHeight,
    );
  }
  const right = initialRect.x + initialRect.width;
  const bottom = initialRect.y + initialRect.height;
  let left = initialRect.x;
  let top2 = initialRect.y;
  let nextRight = right;
  let nextBottom = bottom;
  if (handle2.includes("l")) left += deltaX;
  if (handle2.includes("r")) nextRight += deltaX;
  if (handle2.includes("t")) top2 += deltaY;
  if (handle2.includes("b")) nextBottom += deltaY;
  const minWidth = minCropFraction(containerWidth);
  const minHeight = minCropFraction(containerHeight);
  left = clamp(left, 0, nextRight - minWidth);
  nextRight = clamp(nextRight, left + minWidth, 1);
  top2 = clamp(top2, 0, nextBottom - minHeight);
  nextBottom = clamp(nextBottom, top2 + minHeight, 1);
  let width = nextRight - left;
  let height = nextBottom - top2;
  if (aspectRatio !== null) {
    const normalizedRatio = aspectRatio / (containerWidth / containerHeight);
    const anchorRight = handle2.includes("l") ? nextRight : left;
    const anchorBottom = handle2.includes("t") ? nextBottom : top2;
    if (handle2 === "t" || handle2 === "b") width = height * normalizedRatio;
    else height = width / normalizedRatio;
    if (handle2.includes("l")) left = anchorRight - width;
    if (handle2.includes("t")) top2 = anchorBottom - height;
    if (left < 0 || left + width > 1 || top2 < 0 || top2 + height > 1) {
      const maxWidth = Math.min(
        1 - Math.max(left, 0),
        (1 - Math.max(top2, 0)) * normalizedRatio,
      );
      width = Math.max(Math.min(width, maxWidth), minWidth);
      height = width / normalizedRatio;
      if (handle2.includes("l")) left = anchorRight - width;
      if (handle2.includes("t")) top2 = anchorBottom - height;
    }
  }
  return clampCropRect(
    {
      x: left,
      y: top2,
      width,
      height,
    },
    containerWidth,
    containerHeight,
  );
}
function fitCropOutputSize(sourceWidth, sourceHeight) {
  const scale2 = Math.min(
    1,
    MAX_CROP_OUTPUT_DIMENSION / sourceWidth,
    MAX_CROP_OUTPUT_DIMENSION / sourceHeight,
  );
  return {
    width: Math.max(1, Math.round(sourceWidth * scale2)),
    height: Math.max(1, Math.round(sourceHeight * scale2)),
  };
}
function cropImageToBlob(imageSource, cropRect, originalWidth, originalHeight) {
  return new Promise((resolve, reject) => {
    const image2 = new Image();
    image2.crossOrigin = "anonymous";
    image2.onload = () => {
      const sourceX = Math.round(cropRect.x * originalWidth);
      const sourceY = Math.round(cropRect.y * originalHeight);
      const sourceWidth = Math.max(
        1,
        Math.round(cropRect.width * originalWidth),
      );
      const sourceHeight = Math.max(
        1,
        Math.round(cropRect.height * originalHeight),
      );
      const outputSize = fitCropOutputSize(sourceWidth, sourceHeight);
      const canvas = document.createElement("canvas");
      canvas.width = outputSize.width;
      canvas.height = outputSize.height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Canvas 2D context is unavailable"));
        return;
      }
      context.drawImage(
        image2,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputSize.width,
        outputSize.height,
      );
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("Failed to encode cropped image")),
        "image/png",
      );
    };
    image2.onerror = () => reject(new Error("Failed to load crop source"));
    image2.src = imageSource;
  });
}
const DEFAULT_ASPECT_RATIO = "4:3";
function useImageCrop(containerWidth, containerHeight) {
  const [cropRect, setCropRect] = reactExports.useState(DEFAULT_CROP_RECT);
  const [aspectRatio, setAspectRatioState] =
    reactExports.useState(DEFAULT_ASPECT_RATIO);
  const [isDragging, setIsDragging] = reactExports.useState(false);
  const dragRef = reactExports.useRef(null);
  const hasInitializedCropRef = reactExports.useRef(false);
  const latestRef = reactExports.useRef({
    containerWidth,
    containerHeight,
    aspectRatio,
  });
  latestRef.current = {
    containerWidth,
    containerHeight,
    aspectRatio,
  };
  reactExports.useLayoutEffect(() => {
    if (
      hasInitializedCropRef.current ||
      containerWidth <= 0 ||
      containerHeight <= 0
    ) {
      return;
    }
    hasInitializedCropRef.current = true;
    setCropRect(
      cropRectForAspectRatio(
        CROP_ASPECT_RATIOS[aspectRatio],
        containerWidth,
        containerHeight,
      ),
    );
  }, [aspectRatio, containerHeight, containerWidth]);
  const handleMove = reactExports.useCallback((event) => {
    const drag2 = dragRef.current;
    const latest2 = latestRef.current;
    if (!drag2 || latest2.containerWidth <= 0 || latest2.containerHeight <= 0)
      return;
    setCropRect(
      calculateCropRect({
        initialRect: drag2.initialRect,
        deltaX: (event.clientX - drag2.startX) / latest2.containerWidth,
        deltaY: (event.clientY - drag2.startY) / latest2.containerHeight,
        handle: drag2.handle,
        aspectRatio: CROP_ASPECT_RATIOS[latest2.aspectRatio],
        containerWidth: latest2.containerWidth,
        containerHeight: latest2.containerHeight,
      }),
    );
  }, []);
  reactExports.useEffect(() => {
    if (!isDragging) return;
    let frame2 = null;
    let pending2 = null;
    const handlePointerMove = (event) => {
      event.preventDefault();
      pending2 = event;
      if (frame2 !== null) return;
      frame2 = requestAnimationFrame(() => {
        frame2 = null;
        if (pending2) handleMove(pending2);
        pending2 = null;
      });
    };
    const handlePointerUp = () => {
      if (frame2 !== null) cancelAnimationFrame(frame2);
      if (pending2) handleMove(pending2);
      setIsDragging(false);
      dragRef.current = null;
    };
    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      if (frame2 !== null) cancelAnimationFrame(frame2);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [handleMove, isDragging]);
  const handlePointerDown = reactExports.useCallback(
    (event, handle2 = null) => {
      if (!event.isPrimary) return;
      event.preventDefault();
      event.stopPropagation();
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        initialRect: {
          ...cropRect,
        },
        handle: handle2,
      };
      setIsDragging(true);
    },
    [cropRect],
  );
  const setAspectRatio = reactExports.useCallback((next2) => {
    setAspectRatioState(next2);
    const latest2 = latestRef.current;
    setCropRect(
      cropRectForAspectRatio(
        CROP_ASPECT_RATIOS[next2],
        latest2.containerWidth,
        latest2.containerHeight,
      ),
    );
  }, []);
  return {
    cropRect,
    aspectRatio,
    isDragging,
    handlePointerDown,
    setAspectRatio,
  };
}
const ASPECT_OPTIONS = ["1:1", "4:3", "3:4", "16:9", "9:16", "free"];
const EDGE_HANDLE_THRESHOLD = 80;
const HANDLE_CONTAINER_CLASSES = {
  tl: "absolute -left-0.5 -top-0.5 size-6 cursor-nw-resize z-10",
  tr: "absolute -right-0.5 -top-0.5 size-6 cursor-ne-resize z-10",
  bl: "absolute -bottom-0.5 -left-0.5 size-6 cursor-sw-resize z-10",
  br: "absolute -bottom-0.5 -right-0.5 size-6 cursor-se-resize z-10",
  t: "absolute -top-1.5 left-6 right-6 h-3 cursor-n-resize z-10 flex justify-center",
  b: "absolute -bottom-1.5 left-6 right-6 h-3 cursor-s-resize z-10 flex items-end justify-center",
  l: "absolute -left-1.5 inset-y-6 w-3 cursor-w-resize z-10 flex items-center",
  r: "absolute -right-1.5 inset-y-6 w-3 cursor-e-resize z-10 flex items-center justify-end",
};
function CropHandleView({
  position: position2,
  onPointerDown: onPointerDown2,
}) {
  const isCorner = position2.length === 2;
  return (
    <div
      className={HANDLE_CONTAINER_CLASSES[position2]}
      onPointerDown={(event) => onPointerDown2(event, position2)}
    >
      {isCorner ? (
        <span
          className={`absolute size-full border-background ${position2.includes("t") ? "border-t-[3px]" : "border-b-[3px]"} ${position2.includes("l") ? "border-l-[3px]" : "border-r-[3px]"}`}
        />
      ) : (
        <span
          className={
            position2 === "t" || position2 === "b"
              ? "h-[3px] w-8 rounded-full bg-background"
              : "h-8 w-[3px] rounded-full bg-background"
          }
        />
      )}
    </div>
  );
}
function ImageCropper({
  src,
  alt = "",
  isSubmitting = false,
  confirmLabel,
  onCancel,
  onConfirm,
  onError,
}) {
  const { t: t2 } = useTranslation();
  const hostRef = reactExports.useRef(null);
  const [hostSize, setHostSize] = reactExports.useState({
    width: 0,
    height: 0,
  });
  const [naturalSize, setNaturalSize] = reactExports.useState({
    width: 0,
    height: 0,
  });
  const [isEncoding, setIsEncoding] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer2 = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setHostSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer2.observe(host);
    return () => observer2.disconnect();
  }, []);
  const imageSize = reactExports.useMemo(() => {
    if (naturalSize.width <= 0 || naturalSize.height <= 0) return hostSize;
    const scale2 = Math.min(
      hostSize.width / naturalSize.width,
      hostSize.height / naturalSize.height,
    );
    return {
      width: naturalSize.width * scale2,
      height: naturalSize.height * scale2,
    };
  }, [hostSize, naturalSize]);
  const cropContainerSize =
    naturalSize.width > 0 && naturalSize.height > 0
      ? imageSize
      : {
          width: 0,
          height: 0,
        };
  const {
    cropRect,
    aspectRatio,
    isDragging,
    handlePointerDown,
    setAspectRatio,
  } = useImageCrop(cropContainerSize.width, cropContainerSize.height);
  const cropPixels = {
    x: cropRect.x * imageSize.width,
    y: cropRect.y * imageSize.height,
    width: cropRect.width * imageSize.width,
    height: cropRect.height * imageSize.height,
  };
  const handleConfirm = reactExports.useCallback(async () => {
    if (
      isEncoding ||
      isSubmitting ||
      naturalSize.width <= 0 ||
      naturalSize.height <= 0
    )
      return;
    setIsEncoding(true);
    try {
      const blob = await cropImageToBlob(
        src,
        cropRect,
        naturalSize.width,
        naturalSize.height,
      );
      await onConfirm(blob);
    } catch (error) {
      onError?.(error);
    } finally {
      setIsEncoding(false);
    }
  }, [
    cropRect,
    isEncoding,
    isSubmitting,
    naturalSize,
    onConfirm,
    onError,
    src,
  ]);
  const busy = isEncoding || isSubmitting;
  return (
    <div className="grid gap-3" data-action-ui-id="image-cropper">
      <div
        ref={hostRef}
        className="relative h-[min(55vh,420px)] overflow-hidden rounded-lg bg-muted"
      >
        <div
          className="absolute left-1/2 top-1/2 overflow-hidden -translate-x-1/2 -translate-y-1/2 select-none touch-none"
          style={{
            width: imageSize.width,
            height: imageSize.height,
          }}
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="pointer-events-none size-full object-fill brightness-50"
            onError={() => onError?.(new Error("Failed to load crop source"))}
            onLoad={(event) =>
              setNaturalSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
          />
          {naturalSize.width > 0 ? (
            <div
              className="absolute"
              style={{
                left: cropPixels.x,
                top: cropPixels.y,
                width: cropPixels.width,
                height: cropPixels.height,
              }}
            >
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute max-w-none"
                  style={{
                    width: imageSize.width,
                    height: imageSize.height,
                    left: -cropPixels.x,
                    top: -cropPixels.y,
                  }}
                />
              </div>
              <div className="pointer-events-none absolute inset-0 border border-background/70" />
              <div
                className="pointer-events-none absolute inset-0 transition-opacity duration-150"
                style={{
                  opacity: isDragging ? 1 : 0,
                }}
              >
                <div className="absolute inset-x-0 top-1/3 h-px bg-background/40" />
                <div className="absolute inset-x-0 top-2/3 h-px bg-background/40" />
                <div className="absolute inset-y-0 left-1/3 w-px bg-background/40" />
                <div className="absolute inset-y-0 left-2/3 w-px bg-background/40" />
              </div>
              {["tl", "tr", "bl", "br"].map((position2) => (
                <CropHandleView
                  key={position2}
                  position={position2}
                  onPointerDown={handlePointerDown}
                />
              ))}
              {cropPixels.width > EDGE_HANDLE_THRESHOLD
                ? ["t", "b"].map((position2) => (
                    <CropHandleView
                      key={position2}
                      position={position2}
                      onPointerDown={handlePointerDown}
                    />
                  ))
                : null}
              {cropPixels.height > EDGE_HANDLE_THRESHOLD
                ? ["l", "r"].map((position2) => (
                    <CropHandleView
                      key={position2}
                      position={position2}
                      onPointerDown={handlePointerDown}
                    />
                  ))
                : null}
              <div
                className="absolute inset-0 cursor-move"
                onPointerDown={(event) => handlePointerDown(event, null)}
              />
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Select
          value={aspectRatio}
          onValueChange={(value) => setAspectRatio(value)}
        >
          <SelectTrigger
            size="sm"
            data-action-ui-id="image-cropper-aspect-ratio"
          >
            <SelectValue>
              {aspectRatio === "free"
                ? t2("assetCenter.cover.freeAspect")
                : aspectRatio}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            {ASPECT_OPTIONS.map((option2) => (
              <SelectItem key={option2} value={option2}>
                {option2 === "free"
                  ? t2("assetCenter.cover.freeAspect")
                  : option2}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {t2("common.cancel")}
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            loading={busy}
            data-action-ui-id="image-cropper-confirm"
          >
            {confirmLabel ?? t2("common.confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
function moveStagedEntryToFront(entries2, entryId) {
  const index2 = entries2.findIndex((entry2) => entry2.id === entryId);
  if (index2 <= 0) return entries2;
  const entry = entries2[index2];
  if (!entry) return entries2;
  return [entry, ...entries2.slice(0, index2), ...entries2.slice(index2 + 1)];
}
function ExistingRow({
  entry,
  onRemove: onRemove2,
  onCaptionChange,
  onSetCover,
  isCover,
  coverPreviewSrc,
}) {
  const { t: t2 } = useTranslation();
  const isImage2 = entry.kind === "image";
  const isVideo = entry.kind === "video";
  const isAudio = entry.kind === "audio";
  const blobSrc = gatewayUrl(
    API_PATHS.assetCenterAttachmentBlob(entry.attachmentId),
  );
  const videoPosterSrc = isVideo
    ? gatewayUrl(API_PATHS.assetCenterAttachmentBlob(entry.attachmentId, 512))
    : void 0;
  const videoPlaybackSrc = isVideo
    ? gatewayUrl(API_PATHS.assetCenterAttachmentPlayback(entry.attachmentId))
    : void 0;
  const imageSrc = coverPreviewSrc ?? blobSrc;
  const lightboxSrc =
    entry.kind === "image" ? imageSrc : (videoPlaybackSrc ?? blobSrc);
  const [lightboxOpen, setLightboxOpen] = reactExports.useState(false);
  const [failedPreview, setFailedPreview] = reactExports.useState(null);
  return (
    <li
      className="group/audio flex flex-col border border-border rounded-lg bg-card text-xs overflow-hidden"
      data-action-ui-id="asset-center-add-entity-staged-row"
      data-status="existing"
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden flex items-center justify-center">
        {isImage2 && imageSrc ? (
          <button
            type="button"
            className="absolute inset-0 cursor-zoom-in focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
            onClick={() => setLightboxOpen(true)}
            data-action-ui-id="asset-center-existing-attachment-image"
            aria-label={t2("assetCenter.detail.viewLarge")}
          >
            {failedPreview === imageSrc ? (
              <FileTypeIcon
                {...classifyFileType({
                  filename: entry.originalFilename,
                })}
                size={48}
                decorative={true}
              />
            ) : (
              <img
                src={imageSrc}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setFailedPreview(imageSrc ?? null)}
              />
            )}
          </button>
        ) : isVideo && videoPosterSrc ? (
          <button
            type="button"
            className="absolute inset-0 cursor-zoom-in focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
            onClick={() => setLightboxOpen(true)}
            data-action-ui-id="asset-center-existing-attachment-video"
            aria-label={t2("assetCenter.detail.viewLarge")}
          >
            {failedPreview === videoPosterSrc ? (
              <FileTypeIcon
                {...classifyFileType({
                  filename: entry.originalFilename,
                })}
                size={48}
                decorative={true}
              />
            ) : (
              <img
                src={videoPosterSrc}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setFailedPreview(videoPosterSrc ?? null)}
              />
            )}
            <span className="absolute inset-0 flex items-center justify-center">
              <Video size={20} className="text-background drop-shadow" />
            </span>
          </button>
        ) : isAudio && blobSrc ? (
          <AudioPlayButton src={blobSrc} filename={entry.originalFilename} />
        ) : (
          <FileTypeIcon
            {...classifyFileType({
              filename: entry.originalFilename,
            })}
            size={48}
            decorative={true}
          />
        )}
        {isImage2 && imageSrc && onSetCover ? (
          <Button
            variant="secondary"
            size="xs"
            className={cn(
              "absolute bottom-1 left-1 gap-0.5 pl-1 pr-1.5 transition-opacity",
              !isCover &&
                "opacity-0 group-hover/audio:opacity-100 focus-visible:opacity-100",
            )}
            onClick={() => onSetCover(imageSrc, entry.originalFilename)}
            data-action-ui-id="asset-center-attachment-set-cover"
          >
            <Icon icon={Scan} size="xs" strokeWidth={2} />
            {t2(isCover ? "assetCenter.cover.edit" : "assetCenter.cover.set")}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute top-1 right-1 h-5 w-5 bg-background/60 text-muted-foreground hover:text-destructive hover:bg-background/80"
          onClick={onRemove2}
          data-action-ui-id="asset-center-add-entity-staged-remove"
          aria-label={t2("common.remove")}
        >
          <X size={10} />
        </Button>
      </div>
      <div className="flex flex-col gap-1 p-2">
        <div className="flex items-center gap-1">
          <FileNameLabel
            name={entry.originalFilename}
            className="flex-1 text-xs"
          />
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60 shrink-0">
            {t2("assetCenter.create.uploadStatus.existing")}
          </span>
        </div>
        <div className="flex items-start">
          <div className="w-0.5 h-3 shrink-0 bg-muted-foreground/20 mr-2 mt-0.5" />
          <textarea
            value={entry.caption ?? ""}
            onChange={(e2) => onCaptionChange?.(e2.target.value)}
            placeholder={t2("assetCenter.create.attachmentCaptionPlaceholder")}
            rows={1}
            className="flex-1 min-w-0 bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/40 resize-none field-sizing-content break-words"
            data-action-ui-id="asset-center-add-entity-staged-caption"
          />
        </div>
      </div>
      {lightboxOpen &&
      lightboxSrc &&
      (entry.kind === "image" || entry.kind === "video") ? (
        <MediaLightbox
          kind={entry.kind}
          src={lightboxSrc}
          alt={entry.originalFilename}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </li>
  );
}
function CoverCropDialog({
  target,
  error,
  isSubmitting,
  onError,
  onClose,
  onConfirm,
}) {
  const { t: t2 } = useTranslation();
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="md"
        data-action-ui-id="asset-center-cover-crop-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t2("assetCenter.cover.cropTitle")}</DialogTitle>
          <DialogDescription>
            {t2("assetCenter.cover.cropDescription")}
          </DialogDescription>
        </DialogHeader>
        <ImageCropper
          src={target.src}
          alt={target.filename}
          isSubmitting={isSubmitting}
          confirmLabel={t2("assetCenter.cover.confirm")}
          onCancel={onClose}
          onConfirm={onConfirm}
          onError={onError}
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
function buildAcceptListFromExtensions(exts) {
  const all2 = [];
  for (const list2 of Object.values(exts)) {
    for (const ext of list2) all2.push(`.${ext}`);
  }
  return all2.join(",");
}
function collectAllowedExtensions(exts) {
  const set2 = new Set();
  for (const list2 of Object.values(exts)) {
    for (const ext of list2) set2.add(ext.toLowerCase());
  }
  return set2;
}
function isFilenameAllowed(filename, allowed) {
  const dot2 = filename.lastIndexOf(".");
  if (dot2 < 0 || dot2 === filename.length - 1) return false;
  const ext = filename.slice(dot2 + 1).toLowerCase();
  return allowed.has(ext);
}
export function AttachmentUploadZone({
  staged,
  onStagedChange,
  max: max2,
  mode: mode2 = "upload",
  compactDropZone = false,
  uploadMutation,
  onCoverChange,
  trackingSurface,
  trackingEntityId,
  trackingEntityType,
}) {
  const { t: t2 } = useTranslation();
  const inputRef = reactExports.useRef(null);
  const gridRef = reactExports.useRef(null);
  const [coverTarget, setCoverTarget] = reactExports.useState(null);
  const coverPreviewUrlsRef = reactExports.useRef({});
  const [coverPreviewByEntryId, setCoverPreviewByEntryId] =
    reactExports.useState({});
  const [coverError, setCoverError] = reactExports.useState(null);
  const [isCreatingCover, setIsCreatingCover] = reactExports.useState(false);
  const latestStagedRef = reactExports.useRef(staged);
  latestStagedRef.current = staged;
  const commitStagedChange = reactExports.useCallback(
    (next2) => {
      latestStagedRef.current = next2;
      onStagedChange(next2);
    },
    [onStagedChange],
  );
  reactExports.useEffect(() => {
    return () => {
      for (const url2 of Object.values(coverPreviewUrlsRef.current)) {
        URL.revokeObjectURL(url2);
      }
    };
  }, []);
  const acceptList = reactExports.useMemo(
    () => buildAcceptListFromExtensions(ATTACHMENT_EXTENSIONS),
    [],
  );
  const resolveErrorMessage = reactExports.useCallback(
    (err) => {
      if (err instanceof AssetCenterApiError) {
        if (err.code) {
          return t2(resolveAssetCenterErrorKey(err.code));
        }
      }
      return err instanceof Error ? err.message : String(err);
    },
    [t2],
  );
  const enqueue = reactExports.useCallback(
    async (files) => {
      if (files.length === 0) return;
      const currentStaged = latestStagedRef.current;
      const remaining = Math.max(0, max2 - currentStaged.length);
      const toAdd = files.slice(0, remaining);
      if (toAdd.length === 0) return;
      const allowedExts = collectAllowedExtensions(ATTACHMENT_EXTENSIONS);
      const allowedFiles = [];
      const rejectedFiles = [];
      const sizeCapBytes = 200 * 1024 * 1024;
      for (const file of toAdd) {
        if (!isFilenameAllowed(file.name, allowedExts)) {
          rejectedFiles.push({
            file,
            reason: t2("assetCenter.upload.formatUnsupported"),
          });
        } else if (file.size > sizeCapBytes) {
          rejectedFiles.push({
            file,
            reason: t2("assetCenter.errors.fileTooLarge"),
          });
        } else {
          allowedFiles.push(file);
        }
      }
      const rejectedEntries = rejectedFiles.map(({ file, reason }) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        status: "error",
        errorMessage: reason,
      }));
      const initial = allowedFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        status: "pending",
      }));
      let next2 = [...currentStaged, ...initial, ...rejectedEntries];
      commitStagedChange(next2);
      if (mode2 === "stage") {
        next2 = next2.map((s2) => {
          const entry = initial.find((i2) => i2.id === s2.id);
          return entry
            ? {
                id: entry.id,
                file: entry.file,
                status: "staged",
              }
            : s2;
        });
        commitStagedChange(next2);
        return;
      }
      if (!uploadMutation) {
        throw new Error(
          "AttachmentUploadZone in upload mode requires uploadMutation prop",
        );
      }
      for (const entry of initial) {
        next2 = next2.map((s2) =>
          s2.id === entry.id
            ? {
                id: s2.id,
                file: entry.file,
                status: "uploading",
              }
            : s2,
        );
        commitStagedChange(next2);
        try {
          const result = await uploadMutation.mutateAsync({
            file: entry.file,
          });
          next2 = next2.map((s2) =>
            s2.id === entry.id
              ? {
                  id: s2.id,
                  file: entry.file,
                  status: "uploaded",
                  uploaded: result,
                }
              : s2,
          );
        } catch (err) {
          next2 = next2.map((s2) =>
            s2.id === entry.id
              ? {
                  id: s2.id,
                  file: entry.file,
                  status: "error",
                  errorMessage: resolveErrorMessage(err),
                }
              : s2,
          );
        }
        commitStagedChange(next2);
      }
    },
    [commitStagedChange, max2, uploadMutation, mode2, resolveErrorMessage, t2],
  );
  const handlePick = reactExports.useCallback(() => {
    if (trackingSurface) {
      trackAssetCenterAction({
        action: "attachment_picker_open",
        surface: trackingSurface,
        entity_id: trackingEntityId,
        entity_type: trackingEntityType,
        attachment_count: staged.length,
      });
    }
    inputRef.current?.click();
  }, [trackingSurface, trackingEntityId, trackingEntityType, staged.length]);
  const handleFilesPicked = reactExports.useCallback(
    (fileList) => {
      if (!fileList) return;
      void enqueue(Array.from(fileList));
      if (inputRef.current) inputRef.current.value = "";
    },
    [enqueue],
  );
  const handleDrop2 = reactExports.useCallback(
    (e2) => {
      e2.preventDefault();
      void enqueue(Array.from(e2.dataTransfer.files));
    },
    [enqueue],
  );
  const handleRemove = reactExports.useCallback(
    (id2) => {
      const previewUrl = coverPreviewUrlsRef.current[id2];
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        const { [id2]: _removed, ...nextPreviewByEntryId } =
          coverPreviewUrlsRef.current;
        coverPreviewUrlsRef.current = nextPreviewByEntryId;
        setCoverPreviewByEntryId(nextPreviewByEntryId);
      }
      const next2 = latestStagedRef.current.filter((s2) => s2.id !== id2);
      if (trackingSurface) {
        trackAssetCenterAction({
          action: "attachment_remove",
          surface: trackingSurface,
          entity_id: trackingEntityId,
          entity_type: trackingEntityType,
          attachment_count: next2.length,
        });
      }
      commitStagedChange(next2);
    },
    [commitStagedChange, trackingSurface, trackingEntityId, trackingEntityType],
  );
  const handleCaptionChange = reactExports.useCallback(
    (id2, caption) => {
      commitStagedChange(
        latestStagedRef.current.map((s2) =>
          s2.id === id2 &&
          (s2.status === "uploaded" ||
            s2.status === "existing" ||
            s2.status === "staged")
            ? {
                ...s2,
                caption,
              }
            : s2,
        ),
      );
    },
    [commitStagedChange],
  );
  const handleCoverConfirm = reactExports.useCallback(
    async (blob) => {
      if (!coverTarget || !uploadMutation) return;
      setCoverError(null);
      setIsCreatingCover(true);
      assetCenterLog.info("cover.crop_confirm_start", {
        filename: coverTarget.filename,
        blobSize: blob.size,
        blobType: blob.type,
      });
      try {
        const file = new File([blob], `cover-${Date.now()}.png`, {
          type: "image/png",
        });
        const uploaded = await uploadMutation.mutateAsync({
          file,
        });
        assetCenterLog.info("cover.crop_upload_success", {
          filename: coverTarget.filename,
          coverBlobPath: uploaded.blobPath,
          byteSize: uploaded.byteSize,
          kind: uploaded.kind,
        });
        const previewUrl = URL.createObjectURL(blob);
        setCoverPreviewByEntryId((prev) => {
          const previousUrl = prev[coverTarget.entryId];
          if (previousUrl) URL.revokeObjectURL(previousUrl);
          const next2 = {
            ...prev,
            [coverTarget.entryId]: previewUrl,
          };
          coverPreviewUrlsRef.current = next2;
          return next2;
        });
        onCoverChange?.(uploaded);
        const reordered = moveStagedEntryToFront(
          latestStagedRef.current,
          coverTarget.entryId,
        );
        if (reordered !== latestStagedRef.current) {
          commitStagedChange(reordered);
        }
        setCoverTarget(null);
      } catch (err) {
        assetCenterLog.error("cover.crop_upload_failed", {
          filename: coverTarget.filename,
          error: err instanceof Error ? err.message : String(err),
        });
        setCoverError(resolveErrorMessage(err));
      } finally {
        setIsCreatingCover(false);
      }
    },
    [
      commitStagedChange,
      coverTarget,
      onCoverChange,
      resolveErrorMessage,
      uploadMutation,
    ],
  );
  const atMax = staged.length >= max2;
  const totalItems = staged.length + (atMax ? 0 : 1);
  reactExports.useEffect(() => {
    if (compactDropZone && totalItems > 6 && gridRef.current) {
      gridRef.current.scrollTop = gridRef.current.scrollHeight;
    }
  }, [compactDropZone, totalItems]);
  const renderAttachmentRow = (entry, index2) => {
    const onSetCover =
      mode2 === "upload" && uploadMutation
        ? (src, filename) => {
            assetCenterLog.info("cover.crop_dialog_open", {
              filename,
              entryId: entry.id,
              entryStatus: entry.status,
              srcKind: src.startsWith("blob:") ? "object-url" : "gateway-url",
            });
            setCoverTarget({
              entryId: entry.id,
              src,
              filename,
            });
          }
        : void 0;
    const rowProps = {
      onRemove: () => handleRemove(entry.id),
      onCaptionChange: (caption) => handleCaptionChange(entry.id, caption),
      onSetCover,
      isCover: index2 === 0,
      coverPreviewSrc: index2 === 0 ? coverPreviewByEntryId[entry.id] : void 0,
    };
    return entry.status === "existing" ? (
      <ExistingRow key={entry.id} {...rowProps} entry={entry} />
    ) : (
      <StagedRow key={entry.id} {...rowProps} entry={entry} />
    );
  };
  return (
    <div className="space-y-2">
      {compactDropZone ? (
        staged.length === 0 ? (
          <button
            type="button"
            onClick={handlePick}
            onDragOver={(e2) => e2.preventDefault()}
            onDrop={handleDrop2}
            data-action-ui-id="asset-center-add-entity-upload-zone"
            className="w-full flex flex-col items-center justify-center gap-1 border border-dashed rounded-lg transition-colors border-muted-foreground/40 bg-muted/30 text-muted-foreground hover:border-foreground/30 hover:bg-muted/50 cursor-pointer"
            style={{
              aspectRatio: "3 / 1",
            }}
          >
            <FolderUp size={20} className="opacity-80" />
            <p className="text-xs">
              {t2(
                "assetCenter.create.dropZonePromptAlt",
                "将素材文件拖入/点击上传",
              )}
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple={true}
              accept={acceptList}
              className="hidden"
              onClick={(e2) => e2.stopPropagation()}
              onChange={(e2) => handleFilesPicked(e2.target.files)}
              data-action-ui-id="asset-center-add-entity-upload-input"
            />
          </button>
        ) : (
          <ul
            ref={gridRef}
            className={cn(
              "grid grid-cols-3 gap-2 -mx-4 px-4",
              totalItems > 6 &&
                "max-h-[328px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground [&::-webkit-scrollbar-thumb]:rounded-full",
            )}
            data-action-ui-id="asset-center-add-entity-staged-list"
          >
            {staged.map(renderAttachmentRow)}
            {!atMax && (
              <li
                className="list-none relative flex flex-col border border-dashed rounded-lg border-border overflow-hidden cursor-pointer transition-colors hover:border-foreground/30 hover:bg-muted/50"
                onClick={handlePick}
                onKeyDown={(e2) => {
                  if (e2.key === "Enter" || e2.key === " ") handlePick();
                }}
                onDragOver={(e2) => e2.preventDefault()}
                onDrop={handleDrop2}
                data-action-ui-id="asset-center-add-entity-upload-zone"
              >
                <div className="aspect-[4/3] bg-muted/30" />
                <div className="p-2">
                  <div className="h-4" />
                  <div className="flex items-start mt-1">
                    <div className="w-0.5 h-3 shrink-0 mr-2 mt-0.5" />
                    <span className="text-xs select-none">{" "}</span>
                  </div>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
                  <Upload size={20} className="opacity-60" />
                  <p className="text-xs">
                    {t2("assetCenter.create.dropZonePrompt")}
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  multiple={true}
                  accept={acceptList}
                  className="hidden"
                  onClick={(e2) => e2.stopPropagation()}
                  onChange={(e2) => handleFilesPicked(e2.target.files)}
                  data-action-ui-id="asset-center-add-entity-upload-input"
                />
              </li>
            )}
          </ul>
        )
      ) : (
        <>
          <button
            type="button"
            onClick={handlePick}
            onDragOver={(e2) => e2.preventDefault()}
            onDrop={handleDrop2}
            disabled={atMax}
            data-action-ui-id="asset-center-add-entity-upload-zone"
            className={cn(
              "w-full flex flex-col items-center justify-center gap-1 border border-dashed rounded-lg py-6 transition-colors",
              atMax
                ? "border-border bg-muted/20 text-muted-foreground/40 cursor-not-allowed"
                : "border-border bg-muted/30 text-muted-foreground hover:border-foreground/30 hover:bg-muted/50 cursor-pointer",
            )}
          >
            <Upload size={20} className="opacity-60" />
            <p className="text-xs">
              {atMax
                ? t2("assetCenter.create.dropZoneMaxed")
                : t2("assetCenter.create.dropZonePrompt")}
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple={true}
              accept={acceptList}
              className="hidden"
              onClick={(e2) => e2.stopPropagation()}
              onChange={(e2) => handleFilesPicked(e2.target.files)}
              disabled={atMax}
              data-action-ui-id="asset-center-add-entity-upload-input"
            />
          </button>
          {staged.length > 0 && (
            <ul
              className="grid grid-cols-3 gap-2"
              data-action-ui-id="asset-center-add-entity-staged-list"
            >
              {staged.map(renderAttachmentRow)}
            </ul>
          )}
        </>
      )}
      {coverTarget ? (
        <CoverCropDialog
          target={coverTarget}
          error={coverError}
          isSubmitting={isCreatingCover}
          onError={() => setCoverError(t2("assetCenter.cover.cropError"))}
          onClose={() => {
            if (!isCreatingCover) {
              setCoverTarget(null);
              setCoverError(null);
            }
          }}
          onConfirm={handleCoverConfirm}
        />
      ) : null}
    </div>
  );
}
