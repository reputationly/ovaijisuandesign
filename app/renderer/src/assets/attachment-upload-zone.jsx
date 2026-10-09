// shared/attachment-upload-zone.jsx
import { jsxRuntimeExports, useTranslation, reactExports, Loader2, X$7, Plus, ChevronDown, AtSign, FolderUp, ChevronRight$1, API_PATHS, classifyFileType, Video, Scan, PlaybackCirclePauseIcon$1, PlaybackCirclePlayIcon$1 } from "../vendor.js";
import { gatewayUrl } from "../infra/agent-ws-client.jsx";
import { Select$1 } from "./apply-asset-change.jsx";
import { AssetCenterApiError } from "./check-cloud-asset-upload.js";
import { FileTypeIcon } from "../infra/create-recently-added-store.jsx";
import { Icon, DropdownMenu, assetCenterLog, TooltipProvider, Tooltip, TooltipTrigger } from "../vendor-inline/vscode-base/graph.jsx";
import { Upload } from "../media-editing/parse-item.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { MediaLightbox } from "./image-lightbox.jsx";
import { classifyAssetError, trackAssetCenterAction, trackAssetCreate } from "../infra/use-online.jsx";
import { formatAssetCenterError, resolveAssetCenterErrorKey } from "./page-state-boundary.jsx";
import { SelectContent, SelectItem, SelectTrigger, SelectValue } from "../infra/select-content.jsx";
import {
  Badge,
  Button$1,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TooltipContent,
  cn$2,
  splitMentionFilename,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import {
  useCreateEntity,
  useCreateEntityFromPaths,
  useMaterializeEntity,
} from "./use-materialize-entity.js";
export const ENTITY_TYPES = ["character", "scene", "style_pack", "prop", "custom"];
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
export function FileNameLabel({
  name: name2,
  className,
  tooltip = true,
  actionUiId,
  tooltipPositionerClassName,
}) {
  const { stem, ext } = splitMentionFilename(name2);
  const label = (
    // biome-ignore lint/a11y/useSemanticElements: Inline filename parts form a labelled group, not a form fieldset.
    <span
      className={cn$2(
        "inline-flex w-fit max-w-full min-w-0 items-baseline overflow-hidden",
        className,
      )}
      role="group"
      aria-label={name2}
      data-action-ui-id={actionUiId}
      data-slot="file-name-label"
      tabIndex={tooltip ? 0 : void 0}
    >
      <span className="min-w-0 truncate" data-file-name-stem={true}>
        {stem}
      </span>
      {ext && (
        <span className="max-w-full shrink-0 truncate" data-file-name-extension={true}>
          {ext}
        </span>
      )}
    </span>
  );
  if (!tooltip) return label;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={label} />
        <TooltipContent
          className="max-w-80 whitespace-normal [overflow-wrap:anywhere]"
          positionerClassName={tooltipPositionerClassName}
        >
          {name2}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
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
function clamp$1(value, min2, max2) {
  return Math.min(Math.max(value, min2), max2);
}
function minCropFraction(containerSize) {
  return containerSize && containerSize > 0
    ? Math.max(MIN_CROP_RATIO, MIN_CROP_SIZE / containerSize)
    : MIN_CROP_RATIO;
}
function clampCropRect(rect, containerWidth, containerHeight) {
  const width = clamp$1(rect.width, minCropFraction(containerWidth), 1);
  const height = clamp$1(rect.height, minCropFraction(containerHeight), 1);
  return {
    x: clamp$1(rect.x, 0, 1 - width),
    y: clamp$1(rect.y, 0, 1 - height),
    width,
    height,
  };
}
function cropRectForAspectRatio(ratio, containerWidth, containerHeight) {
  if (ratio === null || containerWidth <= 0 || containerHeight <= 0) return DEFAULT_CROP_RECT;
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
  left = clamp$1(left, 0, nextRight - minWidth);
  nextRight = clamp$1(nextRight, left + minWidth, 1);
  top2 = clamp$1(top2, 0, nextBottom - minHeight);
  nextBottom = clamp$1(nextBottom, top2 + minHeight, 1);
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
      const maxWidth = Math.min(1 - Math.max(left, 0), (1 - Math.max(top2, 0)) * normalizedRatio);
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
function cropImageToBlob(imageSource, cropRect, originalWidth, originalHeight) {
  return new Promise((resolve, reject) => {
    const image2 = new Image();
    image2.crossOrigin = "anonymous";
    image2.onload = () => {
      const sourceX = Math.round(cropRect.x * originalWidth);
      const sourceY = Math.round(cropRect.y * originalHeight);
      const sourceWidth = Math.max(1, Math.round(cropRect.width * originalWidth));
      const sourceHeight = Math.max(1, Math.round(cropRect.height * originalHeight));
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
        (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode cropped image"))),
        "image/png",
      );
    };
    image2.onerror = () => reject(new Error("Failed to load crop source"));
    image2.src = imageSource;
  });
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
const DEFAULT_ASPECT_RATIO = "4:3";
function useImageCrop(containerWidth, containerHeight) {
  const [cropRect, setCropRect] = reactExports.useState(DEFAULT_CROP_RECT);
  const [aspectRatio, setAspectRatioState] = reactExports.useState(DEFAULT_ASPECT_RATIO);
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
    if (hasInitializedCropRef.current || containerWidth <= 0 || containerHeight <= 0) {
      return;
    }
    hasInitializedCropRef.current = true;
    setCropRect(
      cropRectForAspectRatio(CROP_ASPECT_RATIOS[aspectRatio], containerWidth, containerHeight),
    );
  }, [aspectRatio, containerHeight, containerWidth]);
  const handleMove = reactExports.useCallback((event) => {
    const drag2 = dragRef.current;
    const latest2 = latestRef.current;
    if (!drag2 || latest2.containerWidth <= 0 || latest2.containerHeight <= 0) return;
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
  const { cropRect, aspectRatio, isDragging, handlePointerDown, setAspectRatio } = useImageCrop(
    cropContainerSize.width,
    cropContainerSize.height,
  );
  const cropPixels = {
    x: cropRect.x * imageSize.width,
    y: cropRect.y * imageSize.height,
    width: cropRect.width * imageSize.width,
    height: cropRect.height * imageSize.height,
  };
  const handleConfirm = reactExports.useCallback(async () => {
    if (isEncoding || isSubmitting || naturalSize.width <= 0 || naturalSize.height <= 0) return;
    setIsEncoding(true);
    try {
      const blob = await cropImageToBlob(src, cropRect, naturalSize.width, naturalSize.height);
      await onConfirm(blob);
    } catch (error) {
      onError?.(error);
    } finally {
      setIsEncoding(false);
    }
  }, [cropRect, isEncoding, isSubmitting, naturalSize, onConfirm, onError, src]);
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
        <Select$1 value={aspectRatio} onValueChange={(value) => setAspectRatio(value)}>
          <SelectTrigger size="sm" data-action-ui-id="image-cropper-aspect-ratio">
            <SelectValue>
              {aspectRatio === "free" ? t2("assetCenter.cover.freeAspect") : aspectRatio}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            {ASPECT_OPTIONS.map((option2) => (
              <SelectItem key={option2} value={option2}>
                {option2 === "free" ? t2("assetCenter.cover.freeAspect") : option2}
              </SelectItem>
            ))}
          </SelectContent>
        </Select$1>
        <div className="flex items-center gap-2">
          <Button$1 variant="secondary" onClick={onCancel} disabled={busy}>
            {t2("common.cancel")}
          </Button$1>
          <Button$1
            onClick={() => void handleConfirm()}
            loading={busy}
            data-action-ui-id="image-cropper-confirm"
          >
            {confirmLabel ?? t2("common.confirm")}
          </Button$1>
        </div>
      </div>
    </div>
  );
}
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
function CropHandleView({ position: position2, onPointerDown: onPointerDown2 }) {
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
function moveStagedEntryToFront(entries2, entryId) {
  const index2 = entries2.findIndex((entry2) => entry2.id === entryId);
  if (index2 <= 0) return entries2;
  const entry = entries2[index2];
  if (!entry) return entries2;
  return [entry, ...entries2.slice(0, index2), ...entries2.slice(index2 + 1)];
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
  const [coverPreviewByEntryId, setCoverPreviewByEntryId] = reactExports.useState({});
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
        throw new Error("AttachmentUploadZone in upload mode requires uploadMutation prop");
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
        const { [id2]: _removed, ...nextPreviewByEntryId } = coverPreviewUrlsRef.current;
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
          (s2.status === "uploaded" || s2.status === "existing" || s2.status === "staged")
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
        const reordered = moveStagedEntryToFront(latestStagedRef.current, coverTarget.entryId);
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
    [commitStagedChange, coverTarget, onCoverChange, resolveErrorMessage, uploadMutation],
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
              {t2("assetCenter.create.dropZonePromptAlt", "将素材文件拖入/点击上传")}
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
            className={cn$2(
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
                  <p className="text-xs">{t2("assetCenter.create.dropZonePrompt")}</p>
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
            className={cn$2(
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
function StagedRow({
  entry,
  onRemove: onRemove2,
  onCaptionChange,
  onSetCover,
  isCover,
  coverPreviewSrc,
}) {
  const { t: t2 } = useTranslation();
  const isBusy = entry.status === "uploading";
  const preview = useFilePreviewUrl(entry.file);
  const [lightboxOpen, setLightboxOpen] = reactExports.useState(false);
  const [failedPreview, setFailedPreview] = reactExports.useState(null);
  const uploadedMedia =
    entry.status === "uploaded" &&
    (entry.uploaded.kind === "image" ||
      entry.uploaded.kind === "video" ||
      entry.uploaded.kind === "audio")
      ? entry.uploaded.kind
      : void 0;
  const effectiveMedia = uploadedMedia ?? preview?.media;
  const isImage2 = effectiveMedia === "image";
  const isVideo = effectiveMedia === "video";
  const isAudio = effectiveMedia === "audio";
  const uploadedVideo = entry.status === "uploaded" && entry.uploaded.kind === "video";
  const uploadedVideoPosterSrc = uploadedVideo
    ? gatewayUrl(API_PATHS.assetCenterBlobPreview(entry.uploaded.blobPath, 512))
    : void 0;
  const uploadedVideoPlaybackSrc = uploadedVideo
    ? gatewayUrl(API_PATHS.assetCenterBlobPlayback(entry.uploaded.blobPath))
    : void 0;
  const imageSrc = coverPreviewSrc ?? preview?.url;
  const lightboxSrc =
    effectiveMedia === "image" ? imageSrc : (uploadedVideoPlaybackSrc ?? preview?.url);
  return (
    <li
      className="group/audio flex flex-col border border-border rounded-lg bg-card text-xs overflow-hidden"
      data-action-ui-id="asset-center-add-entity-staged-row"
      data-status={entry.status}
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden flex items-center justify-center">
        {isImage2 && imageSrc ? (
          <button
            type="button"
            className="absolute inset-0 cursor-zoom-in focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default"
            onClick={() => setLightboxOpen(true)}
            disabled={isBusy}
            data-action-ui-id="asset-center-staged-attachment-image"
            aria-label={t2("assetCenter.detail.viewLarge")}
          >
            {failedPreview === imageSrc ? (
              <FileTypeIcon
                {...classifyFileType({
                  filename: entry.file.name,
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
        ) : isVideo && (uploadedVideoPosterSrc || preview) ? (
          <button
            type="button"
            className="absolute inset-0 cursor-zoom-in focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default"
            onClick={() => setLightboxOpen(true)}
            disabled={isBusy}
            data-action-ui-id="asset-center-staged-attachment-video"
            aria-label={t2("assetCenter.detail.viewLarge")}
          >
            {uploadedVideoPosterSrc ? (
              failedPreview === uploadedVideoPosterSrc ? (
                <FileTypeIcon
                  {...classifyFileType({
                    filename: entry.file.name,
                  })}
                  size={48}
                  decorative={true}
                />
              ) : (
                <img
                  src={uploadedVideoPosterSrc}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => setFailedPreview(uploadedVideoPosterSrc ?? null)}
                />
              )
            ) : preview && failedPreview !== preview.url ? (
              <video
                src={preview.url}
                onError={() => setFailedPreview(preview.url)}
                className="w-full h-full object-cover bg-black"
                preload="metadata"
              >
                <track kind="captions" />
              </video>
            ) : (
              <FileTypeIcon
                {...classifyFileType({
                  filename: entry.file.name,
                })}
                size={48}
                decorative={true}
              />
            )}
            <span className="absolute inset-0 flex items-center justify-center">
              <Video size={20} className="text-background drop-shadow" />
            </span>
          </button>
        ) : isAudio && preview ? (
          <AudioPlayButton src={preview.url} filename={entry.file.name} />
        ) : (
          <FileTypeIcon
            {...classifyFileType({
              filename: entry.file.name,
            })}
            size={48}
            decorative={true}
          />
        )}
        {isBusy && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Loader2 size={16} className="animate-spin text-foreground" />
          </div>
        )}
        {entry.status === "uploaded" && isImage2 && imageSrc && onSetCover ? (
          <Button$1
            variant="secondary"
            size="xs"
            className={cn$2(
              "absolute bottom-1 left-1 gap-0.5 pl-1 pr-1.5 transition-opacity",
              !isCover && "opacity-0 group-hover/audio:opacity-100 focus-visible:opacity-100",
            )}
            onClick={() => onSetCover(imageSrc, entry.file.name)}
            data-action-ui-id="asset-center-attachment-set-cover"
          >
            <Icon icon={Scan} size="xs" strokeWidth={2} />
            {t2(isCover ? "assetCenter.cover.edit" : "assetCenter.cover.set")}
          </Button$1>
        ) : null}
        <Button$1
          variant="ghost"
          size="icon-xs"
          className="absolute top-1 right-1 h-5 w-5 bg-background/60 text-muted-foreground hover:text-destructive hover:bg-background/80"
          onClick={onRemove2}
          disabled={isBusy}
          data-action-ui-id="asset-center-add-entity-staged-remove"
          aria-label={t2("common.remove")}
        >
          <X$7 size={10} />
        </Button$1>
      </div>
      <div className="flex flex-col gap-1 p-2">
        <div className="flex items-center gap-1">
          <FileNameLabel name={entry.file.name} className="flex-1 text-xs" />
          <span
            className={cn$2(
              "text-[10px] uppercase tracking-wide shrink-0",
              entry.status === "uploaded" && "text-foreground",
              entry.status === "staged" && "text-foreground",
              entry.status === "error" && "text-destructive",
              entry.status === "uploading" && "text-muted-foreground",
              entry.status === "pending" && "text-muted-foreground/60",
            )}
          >
            {t2(`assetCenter.create.uploadStatus.${entry.status}`)}
          </span>
        </div>
        {(entry.status === "uploaded" || entry.status === "staged") && (
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
        )}
        {entry.status === "error" && (
          <span className="text-[10px] text-destructive">{entry.errorMessage}</span>
        )}
      </div>
      {lightboxOpen && lightboxSrc && (effectiveMedia === "image" || effectiveMedia === "video") ? (
        <MediaLightbox
          kind={effectiveMedia}
          src={lightboxSrc}
          alt={entry.file.name}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </li>
  );
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
  const blobSrc = gatewayUrl(API_PATHS.assetCenterAttachmentBlob(entry.attachmentId));
  const videoPosterSrc = isVideo
    ? gatewayUrl(API_PATHS.assetCenterAttachmentBlob(entry.attachmentId, 512))
    : void 0;
  const videoPlaybackSrc = isVideo
    ? gatewayUrl(API_PATHS.assetCenterAttachmentPlayback(entry.attachmentId))
    : void 0;
  const imageSrc = coverPreviewSrc ?? blobSrc;
  const lightboxSrc = entry.kind === "image" ? imageSrc : (videoPlaybackSrc ?? blobSrc);
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
          <Button$1
            variant="secondary"
            size="xs"
            className={cn$2(
              "absolute bottom-1 left-1 gap-0.5 pl-1 pr-1.5 transition-opacity",
              !isCover && "opacity-0 group-hover/audio:opacity-100 focus-visible:opacity-100",
            )}
            onClick={() => onSetCover(imageSrc, entry.originalFilename)}
            data-action-ui-id="asset-center-attachment-set-cover"
          >
            <Icon icon={Scan} size="xs" strokeWidth={2} />
            {t2(isCover ? "assetCenter.cover.edit" : "assetCenter.cover.set")}
          </Button$1>
        ) : null}
        <Button$1
          variant="ghost"
          size="icon-xs"
          className="absolute top-1 right-1 h-5 w-5 bg-background/60 text-muted-foreground hover:text-destructive hover:bg-background/80"
          onClick={onRemove2}
          data-action-ui-id="asset-center-add-entity-staged-remove"
          aria-label={t2("common.remove")}
        >
          <X$7 size={10} />
        </Button$1>
      </div>
      <div className="flex flex-col gap-1 p-2">
        <div className="flex items-center gap-1">
          <FileNameLabel name={entry.originalFilename} className="flex-1 text-xs" />
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
      {lightboxOpen && lightboxSrc && (entry.kind === "image" || entry.kind === "video") ? (
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
function CoverCropDialog({ target, error, isSubmitting, onError, onClose, onConfirm }) {
  const { t: t2 } = useTranslation();
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="md" data-action-ui-id="asset-center-cover-crop-dialog">
        <DialogHeader>
          <DialogTitle>{t2("assetCenter.cover.cropTitle")}</DialogTitle>
          <DialogDescription>{t2("assetCenter.cover.cropDescription")}</DialogDescription>
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
function useFilePreviewUrl(file) {
  const [preview, setPreview] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const media = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
          ? "audio"
          : null;
    if (!media) {
      setPreview(null);
      return;
    }
    const next2 = URL.createObjectURL(file);
    setPreview({
      url: next2,
      media,
    });
    return () => URL.revokeObjectURL(next2);
  }, [file]);
  return preview;
}
function AudioPlayButton({ src, filename }) {
  const { t: t2 } = useTranslation();
  const audioRef = reactExports.useRef(null);
  const [playing, setPlaying] = reactExports.useState(false);
  const toggle = reactExports.useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      void el.play();
    }
  }, [playing]);
  reactExports.useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, []);
  return (
    <>
      <audio ref={audioRef} src={src} preload="metadata">
        <track kind="captions" />
      </audio>
      <FileTypeIcon
        {...classifyFileType({
          filename,
        })}
        size={48}
        decorative={true}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      />
      <button
        type="button"
        onClick={toggle}
        className={cn$2(
          "relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-transparent p-0 hover:opacity-90 transition-opacity",
          playing ? "opacity-100" : "opacity-0 group-hover/audio:opacity-100",
        )}
        aria-label={playing ? t2("common.pause") : t2("common.play")}
        data-action-ui-id="asset-center-attachment-audio-play"
      >
        {playing ? <PlaybackCirclePauseIcon$1 size={32} /> : <PlaybackCirclePlayIcon$1 size={32} />}
      </button>
    </>
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
const PRESET_TAGS = ["写实", "二次元", "赛博朋克", "水墨", "像素风"];
function PresetTags({ value, onChange, trackingSurface = "create_dialog" }) {
  const { t: t2 } = useTranslation();
  const [customDraft, setCustomDraft] = reactExports.useState("");
  const [showCustomInput, setShowCustomInput] = reactExports.useState(false);
  const [customAddedTags, setCustomAddedTags] = reactExports.useState(
    () => new Set(value.filter((tag) => !PRESET_TAGS.includes(tag))),
  );
  const toggle = (tag) => {
    const selected2 = !value.includes(tag);
    trackAssetCenterAction({
      action: "tag_toggle",
      surface: trackingSurface,
      tag_kind: PRESET_TAGS.includes(tag) ? "preset" : "custom",
      selected: selected2,
      tag_count: selected2 ? value.length + 1 : value.length - 1,
    });
    onChange(selected2 ? [...value, tag] : value.filter((t22) => t22 !== tag));
  };
  const commitCustom = () => {
    const trimmed = customDraft.trim();
    if (trimmed) {
      const isNew = !customAddedTags.has(trimmed);
      setCustomAddedTags((prev) => {
        if (prev.has(trimmed)) return prev;
        const next2 = new Set(prev);
        next2.add(trimmed);
        return next2;
      });
      if (!value.includes(trimmed)) {
        onChange([...value, trimmed]);
      }
      if (isNew) {
        trackAssetCenterAction({
          action: "custom_tag_add",
          surface: trackingSurface,
          tag_count: value.includes(trimmed) ? value.length : value.length + 1,
        });
      }
    }
    setCustomDraft("");
    setShowCustomInput(false);
  };
  const removeCustomTag = (tag) => {
    setCustomAddedTags((prev) => {
      if (!prev.has(tag)) return prev;
      const next2 = new Set(prev);
      next2.delete(tag);
      return next2;
    });
    if (value.includes(tag)) {
      onChange(value.filter((t22) => t22 !== tag));
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5" data-action-ui-id="asset-center-add-entity-tags">
      {PRESET_TAGS.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => toggle(tag)}
          className={`inline-flex items-center h-[21px] px-1.5 text-xs transition-colors cursor-pointer rounded-[4px] ${value.includes(tag) ? "bg-foreground text-background" : "bg-muted-foreground/15 text-secondary-foreground hover:bg-muted-foreground/25"}`}
        >
          {tag}
        </button>
      ))}
      {Array.from(customAddedTags).map((tag) => {
        const selected2 = value.includes(tag);
        return (
          // biome-ignore lint/a11y/useSemanticElements: nested click targets (chip + X) — a <button>-in-<button> is invalid; div+role keeps both clickable while staying valid.
          <div
            key={tag}
            role="button"
            tabIndex={0}
            onClick={() => toggle(tag)}
            onKeyDown={(e2) => {
              if (e2.key === "Enter" || e2.key === " ") {
                e2.preventDefault();
                toggle(tag);
              }
            }}
            data-action-ui-id="asset-center-add-entity-tags-custom-chip"
            data-tag-selected={selected2}
            className={`group inline-flex items-center h-[21px] pl-1.5 pr-0.5 text-xs rounded-[4px] cursor-pointer transition-colors ${selected2 ? "bg-foreground text-background" : "bg-muted-foreground/15 text-secondary-foreground hover:bg-muted-foreground/25"}`}
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={(e2) => {
                e2.stopPropagation();
                removeCustomTag(tag);
              }}
              aria-label={t2("common.remove", {
                defaultValue: "Remove",
              })}
              tabIndex={-1}
              className={`ml-0.5 inline-flex items-center justify-center size-3.5 rounded-[2px] transition-colors ${selected2 ? "text-background/70 hover:text-background hover:bg-background/15" : "text-muted-foreground hover:text-foreground hover:bg-foreground/10"}`}
            >
              <X$7 size={10} />
            </button>
          </div>
        );
      })}
      {showCustomInput ? (
        <input
          value={customDraft}
          onChange={(e2) => setCustomDraft(e2.target.value)}
          onBlur={commitCustom}
          onKeyDown={(e2) => {
            if (e2.key === "Enter") {
              e2.preventDefault();
              commitCustom();
            }
            if (e2.key === "Escape") {
              setCustomDraft("");
              setShowCustomInput(false);
            }
          }}
          placeholder={t2("assetCenter.create.customTagPlaceholder", "输入标签")}
          className="h-[21px] w-20 px-1.5 text-xs bg-transparent border border-input outline-none rounded-[4px] placeholder:text-muted-foreground/40"
          autoFocus={true}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowCustomInput(true)}
          className="inline-flex items-center gap-0.5 h-[21px] px-1.5 text-xs bg-muted-foreground/15 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/25 rounded-[4px] cursor-pointer transition-colors"
          data-action-ui-id="asset-center-add-entity-tags-custom"
        >
          <Plus size={10} />
          {t2("assetCenter.create.customTag", "自定义")}
        </button>
      )}
    </div>
  );
}
export function CollapsibleTags({ tags: tags2, onChange, trackingSurface = "create_dialog" }) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          const expanded = !open;
          trackAssetCenterAction({
            action: "tags_toggle",
            surface: trackingSurface,
            expanded,
            tag_count: tags2.length,
          });
          setOpen(expanded);
        }}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        data-action-ui-id="asset-center-add-entity-tags-toggle"
      >
        <ChevronRight$1 size={12} className={`transition-transform ${open ? "rotate-90" : ""}`} />
        {t2("assetCenter.create.addTagsOptional", "添加标签（可选）")}
        {tags2.length > 0 && (
          <span className="text-[11px] text-muted-foreground/60">({tags2.length})</span>
        )}
      </button>
      {open && (
        <div className="mt-1.5">
          <PresetTags value={tags2} onChange={onChange} trackingSurface={trackingSurface} />
        </div>
      )}
    </div>
  );
}
const TYPE_OPTIONS$3 = ENTITY_TYPES;
const TYPE_RULES = {
  character: {
    descriptionRequired: false,
    maxAttachments: Number.POSITIVE_INFINITY,
  },
  scene: {
    descriptionRequired: false,
    maxAttachments: Number.POSITIVE_INFINITY,
  },
  style_pack: {
    descriptionRequired: true,
    maxAttachments: Number.POSITIVE_INFINITY,
  },
  prop: {
    descriptionRequired: false,
    maxAttachments: Number.POSITIVE_INFINITY,
  },
  custom: {
    descriptionRequired: false,
    maxAttachments: Number.POSITIVE_INFINITY,
  },
};
export function AddEntityDialog({ open, onClose, workspacePath, initialType }) {
  const { t: t2 } = useTranslation();
  const [type2, setType] = reactExports.useState(initialType ?? "character");
  const [name2, setName] = reactExports.useState("");
  const [description, setDescription] = reactExports.useState("");
  const [tags2, setTags] = reactExports.useState([]);
  const [staged, setStaged] = reactExports.useState([]);
  const [submitError, setSubmitError] = reactExports.useState(null);
  const createFromPathsMutation = useCreateEntityFromPaths();
  const createEmptyMutation = useCreateEntity();
  const materializeMutation = useMaterializeEntity();
  const trimmedName = name2.trim();
  const trimmedDescription = description.trim();
  const rules = TYPE_RULES[type2];
  const isSubmitting = createFromPathsMutation.isPending || createEmptyMutation.isPending;
  const descriptionMissing = rules.descriptionRequired && trimmedDescription.length === 0;
  const canSubmit =
    trimmedName.length > 0 &&
    !descriptionMissing &&
    !isSubmitting &&
    true &&
    staged.every((s2) => s2.status !== "error");
  const reset2 = reactExports.useCallback(() => {
    setType(initialType ?? "character");
    setName("");
    setDescription("");
    setTags([]);
    setStaged([]);
    setSubmitError(null);
  }, [initialType]);
  reactExports.useEffect(() => {
    if (open && initialType) {
      setType(initialType);
    }
  }, [open, initialType]);
  const handleClose = reactExports.useCallback(() => {
    if (isSubmitting) return;
    trackAssetCenterAction({
      action: "create_dialog_close",
      surface: "create_dialog",
      entity_type: type2,
      had_edits:
        name2.trim().length > 0 ||
        description.trim().length > 0 ||
        tags2.length > 0 ||
        staged.length > 0,
      attachment_count: staged.length,
      tag_count: tags2.length,
    });
    reset2();
    onClose();
  }, [isSubmitting, type2, name2, description, tags2, staged, reset2, onClose]);
  const handleStagedChange = reactExports.useCallback(
    (next2) => {
      if (next2.length > staged.length) {
        trackAssetCenterAction({
          action: "attachment_add",
          surface: "create_dialog",
          entity_type: type2,
          attachment_count: next2.length,
        });
      }
      setStaged(next2);
    },
    [staged.length, type2],
  );
  const metadata = reactExports.useMemo(() => {
    const m3 = {};
    if (tags2.length > 0) m3.tags = tags2;
    return m3;
  }, [tags2]);
  const handleSubmit = reactExports.useCallback(async () => {
    if (!canSubmit) return;
    setSubmitError(null);
    const filesForServer = [];
    for (const s2 of staged) {
      if (s2.status !== "staged") continue;
      const absolutePath = window.hilo?.webUtils?.getPathForFile?.(s2.file) ?? "";
      if (!absolutePath) {
        setSubmitError(
          t2("assetCenter.create.errorNoFilePath", {
            filename: s2.file.name,
          }),
        );
        return;
      }
      const entry = {
        absolutePath,
      };
      const userDesc = s2.caption?.trim();
      if (userDesc) entry.user_desc = userDesc;
      filesForServer.push(entry);
    }
    try {
      let createdEntityId;
      if (filesForServer.length > 0) {
        const entity = await createFromPathsMutation.mutateAsync({
          input: {
            type: type2,
            name: trimmedName,
            ...(trimmedDescription
              ? {
                  description: trimmedDescription,
                }
              : {}),
            ...(Object.keys(metadata).length > 0
              ? {
                  metadata,
                }
              : {}),
            files: filesForServer,
          },
        });
        createdEntityId = entity.id;
      } else {
        const entity = await createEmptyMutation.mutateAsync({
          input: {
            type: type2,
            name: trimmedName,
            description: trimmedDescription || void 0,
            ...(Object.keys(metadata).length > 0
              ? {
                  metadata,
                }
              : {}),
          },
        });
        createdEntityId = entity.id;
      }
      let autoMaterialized = false;
      if (workspacePath && createdEntityId) {
        try {
          await materializeMutation.mutateAsync({
            entityId: createdEntityId,
            input: {
              workspacePath,
            },
            _track: {
              entity_type: type2,
              trigger: "post_create",
            },
          });
          autoMaterialized = true;
        } catch {}
      }
      trackAssetCreate({
        source: workspacePath ? "canvas_sidebar" : "asset_center_page",
        method: "manual",
        entity_type: type2,
        success: true,
        attachment_count: filesForServer.length,
        has_description: !!trimmedDescription,
        auto_materialized: autoMaterialized || void 0,
      });
      reset2();
      onClose();
    } catch (err) {
      setSubmitError(formatAssetCenterError(err, t2));
      trackAssetCreate({
        source: workspacePath ? "canvas_sidebar" : "asset_center_page",
        method: "manual",
        entity_type: type2,
        success: false,
        attachment_count: filesForServer.length,
        has_description: !!trimmedDescription,
        error_type: classifyAssetError(err),
      });
    }
  }, [
    canSubmit,
    staged,
    createFromPathsMutation,
    createEmptyMutation,
    materializeMutation,
    workspacePath,
    type2,
    trimmedName,
    trimmedDescription,
    metadata,
    reset2,
    onClose,
    t2,
  ]);
  const maxAttachments = rules.maxAttachments;
  return (
    <Dialog
      open={open}
      onOpenChange={(o2, details) => {
        if (!o2 && (details?.reason === "outside-press" || details?.reason === "focus-out")) {
          return;
        }
        if (!o2) handleClose();
      }}
    >
      <DialogContent
        className="sm:max-w-lg max-h-[85vh] overflow-y-auto"
        data-action-ui-id="asset-center-add-entity-dialog"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t2("assetCenter.create.title")}</DialogTitle>
          <DialogDescription>{t2("assetCenter.create.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AtSign size={12} className="shrink-0 text-muted-foreground" />
            <input
              value={name2}
              onChange={(e2) => setName(e2.target.value)}
              onBlur={() => {
                if (trimmedName) {
                  trackAssetCenterAction({
                    action: "field_complete",
                    surface: "create_dialog",
                    entity_type: type2,
                    value: "name",
                    char_count: trimmedName.length,
                  });
                }
              }}
              placeholder={t2("assetCenter.create.namePlaceholder")}
              className="flex-1 min-w-0 bg-transparent font-heading text-sm font-medium outline-none placeholder:text-muted-foreground/50"
              data-action-ui-id="asset-center-add-entity-name"
            />
          </div>
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="shrink-0 cursor-pointer transition-colors hover:opacity-80 mr-2"
                data-action-ui-id="asset-center-add-entity-type"
              >
                <Badge
                  variant="secondary"
                  className="text-xs h-6 px-1.5 font-medium gap-0.5 rounded-[4px] text-secondary-foreground"
                >
                  {t2(`assetCenter.types.${type2}`)}
                  <ChevronDown size={12} className="text-muted-foreground" />
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {TYPE_OPTIONS$3.map((opt) => (
                  <DropdownMenuItem
                    key={opt}
                    onClick={() => {
                      if (opt !== type2) {
                        trackAssetCenterAction({
                          action: "entity_type_change",
                          surface: "create_dialog",
                          entity_type: opt,
                        });
                        setType(opt);
                      }
                    }}
                  >
                    {t2(`assetCenter.types.${opt}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="w-0.5 h-3 shrink-0 bg-muted-foreground/20 mr-3" />
            <textarea
              value={description}
              onChange={(e2) => setDescription(e2.target.value)}
              onBlur={() => {
                if (trimmedDescription) {
                  trackAssetCenterAction({
                    action: "field_complete",
                    surface: "create_dialog",
                    entity_type: type2,
                    value: "description",
                    char_count: trimmedDescription.length,
                  });
                }
              }}
              placeholder={t2("assetCenter.create.descriptionPlaceholder")}
              rows={1}
              className="flex-1 min-w-0 bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/40 resize-none field-sizing-content break-words"
              data-action-ui-id="asset-center-add-entity-description"
            />
          </div>
          <div className="border-t border-border -mx-4" />
          <AttachmentUploadZone
            staged={staged}
            onStagedChange={handleStagedChange}
            max={maxAttachments}
            mode="stage"
            compactDropZone={true}
            trackingSurface="create_dialog"
            trackingEntityType={type2}
          />
          {staged.length > 0 && (
            <span className="text-[10px] text-muted-foreground mb-1 block text-right">
              {t2("assetCenter.create.attachmentCount", {
                count: staged.length,
              })}
            </span>
          )}
          <div className="border-t border-border -mx-4" />
          <CollapsibleTags tags={tags2} onChange={setTags} />
          {submitError && (
            <p
              className="text-xs text-destructive"
              data-action-ui-id="asset-center-add-entity-error"
            >
              {submitError}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button$1
            size="sm"
            className="h-8 gap-1.5 rounded-[4px]"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            data-action-ui-id="asset-center-add-entity-submit"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {t2("assetCenter.create.submitAsset", "创建资产")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
