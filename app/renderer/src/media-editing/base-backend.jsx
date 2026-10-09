// base-backend.jsx
import {
  computeNodeSize,
  defaultNodeSizeForType,
  IMAGE_CARD_DEFAULT_SIZE,
  VIDEO_EMPTY_CARD_SIZE,
} from "../canvas/compute-group-bounds-from-children.js";
import { parseRatio } from "../generation/resolution-tabs.jsx";
import {
  CanvasNodeType,
  isUserProvidedAssetModel,
  reactExports,
} from "../vendor.js";
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
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const sx = Math.round(cropRect.x * originalWidth);
      const sy = Math.round(cropRect.y * originalHeight);
      const sw = Math.round(cropRect.width * originalWidth);
      const sh = Math.round(cropRect.height * originalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas 2d context"));
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("canvas.toBlob returned null"));
        },
        "image/png",
        1,
      );
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${imageSrc}`));
    img.src = imageSrc;
  });
}
export function cropRectForAspectRatio(ratio, containerWidth, containerHeight) {
  if (ratio == null) return DEFAULT_CROP;
  const imageAspect =
    containerWidth && containerHeight ? containerWidth / containerHeight : 1;
  const normRatio = ratio / imageAspect;
  let w3;
  let h2;
  if (normRatio >= 1) {
    w3 = 0.8;
    h2 = w3 / normRatio;
    if (h2 > 0.8) {
      h2 = 0.8;
      w3 = h2 * normRatio;
    }
  } else {
    h2 = 0.8;
    w3 = h2 * normRatio;
    if (w3 > 0.8) {
      w3 = 0.8;
      h2 = w3 / normRatio;
    }
  }
  return {
    x: (1 - w3) / 2,
    y: (1 - h2) / 2,
    width: w3,
    height: h2,
  };
}
export function resolveGifAnimationSrc(src, path2, name2) {
  if (!src) return void 0;
  if (path2) return /\.gif$/i.test(path2) ? src : void 0;
  if (name2 && /\.gif$/i.test(name2)) return src;
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
  const [w3, h2] = parsed;
  return computeNodeSize(w3, h2) ?? IMAGE_CARD_DEFAULT_SIZE;
}
function draftRatioFromParams(params) {
  return params?.aspect_ratio ?? params?.ratio;
}
export function emptyMediaNodeInit(
  type2,
  getLastUsedModelParams,
  overrideRatio,
) {
  const lastUsedKey =
    type2 === CanvasNodeType.Image
      ? "i2i"
      : type2 === CanvasNodeType.Video
        ? "i2v"
        : null;
  if (!lastUsedKey)
    return {
      size: defaultNodeSizeForType(type2),
    };
  const aspectRatio =
    typeof overrideRatio === "string"
      ? overrideRatio
      : (draftRatioFromParams(getLastUsedModelParams?.(lastUsedKey)?.params) ??
        // Match the image's default square footprint in the creation commit.
        // Otherwise the popover's initial 1:1 mirror creates a second undo
        // entry that only adds the ratio without changing the visible card.
        (type2 === CanvasNodeType.Image ? "1:1" : void 0));
  return {
    size:
      type2 === CanvasNodeType.Video
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
  const seen2 = new Set();
  const append2 = (values3) => {
    if (!Array.isArray(values3)) return;
    for (const value of values3) {
      if (typeof value !== "string" || value.length === 0 || seen2.has(value))
        continue;
      seen2.add(value);
      merged.push(value);
    }
  };
  append2(nodeReferenceImageIds);
  append2(assetReferenceImageIds);
  return merged.length > 0 ? merged : void 0;
}
export function resolveReferenceImages(
  incomingSourceIds,
  referenceImageIds,
  assetMetadataStore,
  getNodeById,
) {
  const paths = [];
  const seen2 = new Set();
  const store = assetMetadataStore.getState();
  const imagePathForAsset = (assetId) => {
    if (!assetId) return void 0;
    const meta2 = store.assets.get(assetId);
    return meta2?.path && meta2.type === "image" ? meta2.path : void 0;
  };
  for (const sourceId of incomingSourceIds) {
    let resolvedPath;
    if (getNodeById) {
      const node2 = getNodeById(sourceId);
      if (node2?.type === CanvasNodeType.Image) {
        const nodeData = node2.data;
        const directPath =
          typeof nodeData.path === "string" && nodeData.path.length > 0
            ? nodeData.path
            : void 0;
        const nodeAssetId =
          typeof nodeData.assetId === "string" && nodeData.assetId.length > 0
            ? nodeData.assetId
            : typeof node2.assetId === "string" && node2.assetId.length > 0
              ? node2.assetId
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
    if (resolvedPath && !seen2.has(resolvedPath)) {
      seen2.add(resolvedPath);
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
        !seen2.has(refMeta.path)
      ) {
        seen2.add(refMeta.path);
        paths.push(refMeta.path);
      }
    }
    const hasInteriorGap = referenceImageIds.some(
      (assetId, index2) =>
        !assetId && referenceImageIds.slice(index2 + 1).some(Boolean),
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
        incomingPaths.every((path2) => persistedPaths.includes(path2));
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
  const seen2 = new Set();
  for (const sourceId of incomingSourceIds) {
    const sourceMeta = getAssetMetaByNodeIdFromStore(
      assetMetadataStore,
      sourceId,
    );
    if (
      sourceMeta?.path &&
      sourceMeta.type === "video" &&
      !seen2.has(sourceMeta.path)
    ) {
      seen2.add(sourceMeta.path);
      paths.push(sourceMeta.path);
    }
  }
  if (referenceVideoIds) {
    const store = assetMetadataStore.getState();
    for (const refId of referenceVideoIds) {
      if (!refId) continue;
      const refMeta = store.assets.get(refId);
      if (refMeta?.path && !seen2.has(refMeta.path)) {
        seen2.add(refMeta.path);
        paths.push(refMeta.path);
      }
    }
  }
  return paths;
}
export function useEmptyAspectRatio({
  id: id2,
  data: data2,
  isEmptyForWrite,
  draftKeys,
}) {
  const [emptyAspectRatioLive, setEmptyAspectRatioLive] =
    reactExports.useState(void 0);
  const rawPersisted = data2?.aspectRatio;
  const persistedAspectRatio =
    typeof rawPersisted === "string" ? rawPersisted : void 0;
  const draftMap = getPopoverDraftMap(data2);
  let draftAspectRatio;
  for (const key2 of draftKeys) {
    draftAspectRatio = draftRatioFromParams(draftMap?.[key2]?.params);
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
      const size2 = emptySizeFromRatio(ratio);
      const node2 = getNodeById(id2);
      const sizeMatches =
        node2?.size?.width === size2.width &&
        node2?.size?.height === size2.height;
      const ratioMatches = node2?.data?.aspectRatio === ratio;
      if (sizeMatches && ratioMatches) return;
      updateNodeDataAndResize(
        id2,
        {
          ...(node2?.data ?? {}),
          aspectRatio: ratio,
        },
        size2.width,
        size2.height,
      );
    },
    [id2, getNodeById, updateNodeDataAndResize],
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
              ? (info2) =>
                  onLutImport({
                    ...info2,
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
