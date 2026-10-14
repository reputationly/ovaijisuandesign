// base-backend.jsx
import {
  computeNodeSize,
  defaultNodeSizeForType,
  IMAGE_CARD_DEFAULT_SIZE,
  VIDEO_EMPTY_CARD_SIZE,
} from "../canvas/compute-group-bounds-from-children.js";
import { parseRatio } from "../generation/resolution-tabs.jsx";
import { CanvasNodeType } from "../canvas/canvas-geometry.js";
import { isUserProvidedAssetModel } from "../infra/shared-runtime.js";
import reactExports from "react";
import { getAssetMetaByNodeIdFromStore } from "../canvas/fullscreen-icon.jsx";
import { DEFAULT_CROP } from "./image-edit-pricing.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Download } from "./package.jsx";
import { cn } from "../infra/dialog-content.jsx";
import { isEditResultSourceTool } from "../infra/parse-connector-selection.js";
import { useCanvasActions } from "./use-canvas-actions.js";
import { getPopoverDraftMap } from "../canvas/is-reexecutable-generation-node.js";
export function cropImageToBlob(
  imageSrc,
  cropRect,
  originalWidth,
  originalHeight,
) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const sourceX = Math.round(cropRect.x * originalWidth);
      const sourceY = Math.round(cropRect.y * originalHeight);
      const sourceWidth = Math.round(cropRect.width * originalWidth);
      const sourceHeight = Math.round(cropRect.height * originalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas 2d context"));
        return;
      }
      ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("canvas.toBlob returned null"));
        },
        "image/png",
        1,
      );
    };
    image.onerror = () => reject(new Error(`Failed to load image: ${imageSrc}`));
    image.src = imageSrc;
  });
}
export function cropRectForAspectRatio(ratio, containerWidth, containerHeight) {
  if (ratio == null) return DEFAULT_CROP;
  const imageAspect =
    containerWidth && containerHeight ? containerWidth / containerHeight : 1;
  const normRatio = ratio / imageAspect;
  let width;
  let height;
  if (normRatio >= 1) {
    width = 0.8;
    height = width / normRatio;
    if (height > 0.8) {
      height = 0.8;
      width = height * normRatio;
    }
  } else {
    height = 0.8;
    width = height * normRatio;
    if (width > 0.8) {
      width = 0.8;
      height = width / normRatio;
    }
  }
  return {
    x: (1 - width) / 2,
    y: (1 - height) / 2,
    width,
    height,
  };
}
export function resolveGifAnimationSrc(src, path, fileName) {
  if (!src) return void 0;
  if (path) return /\.gif$/i.test(path) ? src : void 0;
  if (fileName && /\.gif$/i.test(fileName)) return src;
  if (/^data:image\/gif[;,]/i.test(src)) return src;
  try {
    return /\.gif$/i.test(
      decodeURIComponent(new URL(src, "http://canvas.local").pathname),
    )
      ? src
      : void 0;
  } catch {
    return void 0;
  }
}
export function emptySizeFromRatio(ratio) {
  if (!ratio || ratio.toLowerCase() === "auto") return IMAGE_CARD_DEFAULT_SIZE;
  const parsed = parseRatio(ratio);
  if (!parsed) return IMAGE_CARD_DEFAULT_SIZE;
  const [width, height] = parsed;
  return computeNodeSize(width, height) ?? IMAGE_CARD_DEFAULT_SIZE;
}
function draftRatioFromParams(params) {
  return params?.aspect_ratio ?? params?.ratio;
}
export function emptyMediaNodeInit(
  type,
  getLastUsedModelParams,
  overrideRatio,
) {
  const lastUsedKey =
    type === CanvasNodeType.Image
      ? "i2i"
      : type === CanvasNodeType.Video
        ? "i2v"
        : null;
  if (!lastUsedKey)
    return {
      size: defaultNodeSizeForType(type),
    };
  const aspectRatio =
    typeof overrideRatio === "string"
      ? overrideRatio
      : (draftRatioFromParams(getLastUsedModelParams?.(lastUsedKey)?.params) ??
        // Match the image's default square footprint in the creation commit.
        // Otherwise the popover's initial 1:1 mirror creates a second undo
        // entry that only adds the ratio without changing the visible card.
        (type === CanvasNodeType.Image ? "1:1" : void 0));
  return {
    size:
      type === CanvasNodeType.Video
        ? VIDEO_EMPTY_CARD_SIZE
        : emptySizeFromRatio(aspectRatio),
    aspectRatio,
  };
}
function hasNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
export function canOpenAssetGenerationPopover(opts) {
  if (opts.isUserEmpty) return true;
  if (isEditResultSourceTool(opts.sourceTool)) return false;
  if (hasNonEmptyString(opts.model) && isUserProvidedAssetModel(opts.model))
    return false;
  if (hasNonEmptyString(opts.sourceTool)) return true;
  if (hasNonEmptyString(opts.modelId)) return true;
  if (hasNonEmptyString(opts.backend)) return true;
  return hasNonEmptyString(opts.model);
}
export function MediaDownloadButton({
  onClick,
  label,
  dataActionUiId,
  className,
  title = label,
}) {
  return (
    <button
      type="button"
      data-action-ui-id={dataActionUiId}
      onClick={onClick}
      aria-label={label}
      title={title}
      className={cn(
        "pointer-events-auto absolute z-20 flex size-6 cursor-pointer items-center justify-center rounded-[8px] bg-[var(--canvas-media-control-bg)] text-[var(--canvas-media-control-fg)] transition-[opacity,transform,background-color] duration-150 ease-out hover:bg-[var(--canvas-media-control-bg-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
        className,
      )}
    >
      <Download size={14} strokeWidth={1.25} aria-hidden={true} />
    </button>
  );
}
export function mergeReferenceImageIds(
  nodeReferenceImageIds,
  assetReferenceImageIds,
) {
  const merged = [];
  const seen = new Set();
  const append = (values) => {
    if (!Array.isArray(values)) return;
    for (const value of values) {
      if (typeof value !== "string" || value.length === 0 || seen.has(value))
        continue;
      seen.add(value);
      merged.push(value);
    }
  };
  append(nodeReferenceImageIds);
  append(assetReferenceImageIds);
  return merged.length > 0 ? merged : void 0;
}
export function resolveReferenceImages(
  incomingSourceIds,
  referenceImageIds,
  assetMetadataStore,
  getNodeById,
) {
  const paths = [];
  const seen = new Set();
  const store = assetMetadataStore.getState();
  const imagePathForAsset = (assetId) => {
    if (!assetId) return void 0;
    const meta = store.assets.get(assetId);
    return meta?.path && meta.type === "image" ? meta.path : void 0;
  };
  for (const sourceId of incomingSourceIds) {
    let resolvedPath;
    if (getNodeById) {
      const node = getNodeById(sourceId);
      if (node?.type === CanvasNodeType.Image) {
        const nodeData = node.data;
        const directPath =
          typeof nodeData.path === "string" && nodeData.path.length > 0
            ? nodeData.path
            : void 0;
        const nodeAssetId =
          typeof nodeData.assetId === "string" && nodeData.assetId.length > 0
            ? nodeData.assetId
            : typeof node.assetId === "string" && node.assetId.length > 0
              ? node.assetId
              : void 0;
        resolvedPath = directPath ?? imagePathForAsset(nodeAssetId);
      }
    }
    if (!resolvedPath) {
      const sourceMeta = getAssetMetaByNodeIdFromStore(
        assetMetadataStore,
        sourceId,
      );
      if (sourceMeta?.path && sourceMeta.type === "image") {
        resolvedPath = sourceMeta.path;
      }
    }
    if (resolvedPath && !seen.has(resolvedPath)) {
      seen.add(resolvedPath);
      paths.push(resolvedPath);
    }
  }
  const incomingPaths = [...paths];
  if (referenceImageIds) {
    for (const refId of referenceImageIds) {
      if (!refId) continue;
      const refMeta = store.assets.get(refId);
      if (
        refMeta?.path &&
        refMeta.type === "image" &&
        !seen.has(refMeta.path)
      ) {
        seen.add(refMeta.path);
        paths.push(refMeta.path);
      }
    }
    const hasInteriorGap = referenceImageIds.some(
      (assetId, index) =>
        !assetId && referenceImageIds.slice(index + 1).some(Boolean),
    );
    if (hasInteriorGap) {
      const positionalPaths = referenceImageIds.map(
        (assetId) => imagePathForAsset(assetId) ?? "",
      );
      const persistedPaths = positionalPaths.filter(Boolean);
      const everyPersistedIdResolved =
        persistedPaths.length === referenceImageIds.filter(Boolean).length;
      const liveReferencesMatchPersisted =
        incomingPaths.length === persistedPaths.length &&
        incomingPaths.every((path) => persistedPaths.includes(path));
      if (
        everyPersistedIdResolved &&
        (incomingPaths.length === 0 || liveReferencesMatchPersisted)
      ) {
        return positionalPaths;
      }
      if (incomingPaths.length > 0) return incomingPaths;
    }
  }
  return paths;
}
export function resolveReferenceVideos(
  incomingSourceIds,
  referenceVideoIds,
  assetMetadataStore,
) {
  const paths = [];
  const seen = new Set();
  for (const sourceId of incomingSourceIds) {
    const sourceMeta = getAssetMetaByNodeIdFromStore(
      assetMetadataStore,
      sourceId,
    );
    if (
      sourceMeta?.path &&
      sourceMeta.type === "video" &&
      !seen.has(sourceMeta.path)
    ) {
      seen.add(sourceMeta.path);
      paths.push(sourceMeta.path);
    }
  }
  if (referenceVideoIds) {
    const store = assetMetadataStore.getState();
    for (const refId of referenceVideoIds) {
      if (!refId) continue;
      const refMeta = store.assets.get(refId);
      if (refMeta?.path && !seen.has(refMeta.path)) {
        seen.add(refMeta.path);
        paths.push(refMeta.path);
      }
    }
  }
  return paths;
}
export function useEmptyAspectRatio({
  id: nodeId,
  data,
  isEmptyForWrite,
  draftKeys,
}) {
  const [emptyAspectRatioLive, setEmptyAspectRatioLive] =
    reactExports.useState(void 0);
  const rawPersisted = data?.aspectRatio;
  const persistedAspectRatio =
    typeof rawPersisted === "string" ? rawPersisted : void 0;
  const draftMap = getPopoverDraftMap(data);
  let draftAspectRatio;
  for (const key of draftKeys) {
    draftAspectRatio = draftRatioFromParams(draftMap?.[key]?.params);
    if (draftAspectRatio) break;
  }
  const emptyAspectRatio =
    emptyAspectRatioLive ?? persistedAspectRatio ?? draftAspectRatio;
  const { getNodeById, updateNodeDataAndResize } = useCanvasActions();
  const isEmptyForWriteRef = reactExports.useRef(false);
  isEmptyForWriteRef.current = isEmptyForWrite;
  const setEmptyAspectRatio = reactExports.useCallback(
    (ratio) => {
      setEmptyAspectRatioLive(ratio);
      if (!ratio || !isEmptyForWriteRef.current) return;
      const size = emptySizeFromRatio(ratio);
      const node = getNodeById(nodeId);
      const sizeMatches =
        node?.size?.width === size.width &&
        node?.size?.height === size.height;
      const ratioMatches = node?.data?.aspectRatio === ratio;
      if (sizeMatches && ratioMatches) return;
      updateNodeDataAndResize(
        nodeId,
        {
          ...(node?.data ?? {}),
          aspectRatio: ratio,
        },
        size.width,
        size.height,
      );
    },
    [nodeId, getNodeById, updateNodeDataAndResize],
  );
  return {
    emptyAspectRatio,
    setEmptyAspectRatio,
  };
}
export function useLutBundle(
  listLuts,
  importLut,
  loadLutContent,
  deleteLut,
  nodeType,
  onLutImport,
) {
  return reactExports.useMemo(
    () =>
      listLuts && importLut && loadLutContent && deleteLut
        ? {
            listLuts,
            importLut,
            loadLutContent,
            deleteLut,
            onImportEvent: onLutImport
              ? (info) =>
                  onLutImport({
                    ...info,
                    nodeType,
                  })
              : void 0,
          }
        : void 0,
    [listLuts, importLut, loadLutContent, deleteLut, nodeType, onLutImport],
  );
}
export class BaseBackend {
  canvas;
  width = 0;
  height = 0;
  initialized = false;
  options;
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = options;
  }
  /**
   * 检查后端是否可用
   */
  static isSupported() {
    return false;
  }
  /**
   * 从视频元素加载纹理（建立纹理 + 资源），后续每帧调 updateFromVideo 复用
   *
   * 默认实现 throw，要求子类覆盖
   */
  loadFromVideo(_video) {
    throw new Error(
      `${this.getType()} backend does not implement loadFromVideo`,
    );
  }
  /**
   * 用最新视频帧像素更新源纹理（不重建管线/资源）
   *
   * 默认实现 throw，要求子类覆盖
   */
  updateFromVideo(_video) {
    throw new Error(
      `${this.getType()} backend does not implement updateFromVideo`,
    );
  }
  /**
   * 通用纹理来源，离线导出场景用：可传 VideoFrame、HTMLCanvasElement、OffscreenCanvas、HTMLVideoElement、ImageBitmap。
   * 与 loadFromVideo 不同点：尺寸由调用方显式指定，不从 source 推断（VideoFrame 的 displayWidth/Height 与 codedWidth/Height 不一定一致）。
   *
   * 默认实现 throw，要求子类覆盖
   */
  loadFromSource(_source, _width, _height) {
    throw new Error(
      `${this.getType()} backend does not implement loadFromSource`,
    );
  }
  /**
   * 通用纹理来源更新，复用已有管线。
   *
   * 默认实现 throw，要求子类覆盖
   */
  updateFromSource(_source) {
    throw new Error(
      `${this.getType()} backend does not implement updateFromSource`,
    );
  }
  /**
   * 设置当前 LUT 数据，传 null 清除
   *
   * 默认 noop，子类覆盖
   */
  setLUT(_lut) {}
  /**
   * 设置 LUT 应用参数（强度等）
   *
   * 默认 noop，子类覆盖
   */
  setLUTParams(_params) {}
  /**
   * 获取图像尺寸
   */
  getSize() {
    return {
      width: this.width,
      height: this.height,
    };
  }
  /**
   * 检查是否已初始化
   */
  isInitialized() {
    return this.initialized;
  }
}
let _webgpuSupported = null;
export function isWebGPUSupported() {
  if (_webgpuSupported === null) {
    _webgpuSupported = typeof navigator !== "undefined" && "gpu" in navigator;
  }
  return _webgpuSupported;
}
