// canvas-image.jsx
import { useTranslation, reactExports } from "../vendor.js";
import { useStableZoomBucket } from "../canvas/canvas-surface-recovery-scheduler.jsx";
import { CanvasRenderRuntimeContext } from "../infra/create-html-iframe-pool-store.jsx";
import { isGenerationErrorStatus } from "../canvas/group-nodes-in-canvas.js";
import { useCanvasActive } from "./parse-item.jsx";
import {
  useViewportStatus,
  useCanvasActiveDeferred,
  areNodePropsEqual,
} from "../canvas/generating-media-area.jsx";
import { ParamSectionLabel, Slider$1 } from "../generation/slider.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { AudioNodeInner } from "./audio-action-surface.jsx";
import {
  classifyPermanentDecodeFailure,
  getBitmapManager,
  isTransientDecodeFailure,
} from "./decode-worker-pool.jsx";
export const AudioNode = reactExports.memo(AudioNodeInner, areNodePropsEqual);
const PLUGIN_ADD_NODE_TYPE_PREFIX = "plugin:";
export const DIRECTOR_STAGE_PLUGIN_ID = "3d-director-stage";
export const COMFYUI_PLUGIN_ID$1 = "comfyui";
export const PANORAMA_VIEWER_PLUGIN_ID = "panorama-viewer";
export function shouldShowPluginNodeSourceAffordance(pluginId) {
  return pluginId !== COMFYUI_PLUGIN_ID$1;
}
export function resolvePluginEditorPresentation(pluginId) {
  return "fullscreen";
}
export const CLIP_STUDIO_PLUGIN_ID = "clip-studio";
export function formatPluginAddNodeType(pluginId) {
  return `${PLUGIN_ADD_NODE_TYPE_PREFIX}${pluginId}`;
}
export function parsePluginAddNodeType(type2) {
  if (!type2.startsWith(PLUGIN_ADD_NODE_TYPE_PREFIX)) return null;
  const pluginId = type2.slice(PLUGIN_ADD_NODE_TYPE_PREFIX.length);
  return pluginId.length > 0 ? pluginId : null;
}
export function isPluginEditorSurface(agent2) {
  return agent2?.editorSurface === true;
}
function resolveCanvasContentVisibilityStyle(policy) {
  return policy.contentVisibility;
}
function useCanvasRenderPolicy() {
  return reactExports.useContext(CanvasRenderRuntimeContext).policy;
}
export function useCanvasSurfaceRecovery(registration, eligible) {
  const { registerSurface } = reactExports.useContext(CanvasRenderRuntimeContext);
  const registrationRef = reactExports.useRef(registration);
  registrationRef.current = registration;
  const handleRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const handle2 = registerSurface({
      surfaceType: registrationRef.current.surfaceType,
      isEligible: () => registrationRef.current.isEligible(),
      recover: () => registrationRef.current.recover(),
    });
    handleRef.current = handle2;
    return () => {
      handleRef.current = null;
      handle2.dispose();
    };
  }, [registerSurface]);
  reactExports.useEffect(() => {
    if (eligible) handleRef.current?.notifyEligibilityChanged();
  }, [eligible]);
}
const TRANSIENT_RETRY_DELAYS_MS = [1e3, 3e3, 8e3];
const GIF_HOVER_DELAY_MS = 200;
export function CanvasImage(props) {
  const { src, animationSrc, nodeId, width, height, alt, className, onError, onNaturalSize } =
    props;
  const canvasRef = reactExports.useRef(null);
  const handleRef = reactExports.useRef(null);
  const [loadState, setLoadState] = reactExports.useState("pending");
  const status = useViewportStatus(nodeId, width, height);
  const dpr = reactExports.useMemo(() => readDpr$1(), []);
  const zoomBucket = useStableZoomBucket();
  const effectiveWidth = Math.max(1, Math.round(width * zoomBucket));
  const effectiveHeight = Math.max(1, Math.round(height * zoomBucket));
  const canvasActive = useCanvasActiveDeferred();
  const canvasPresented = useCanvasActive();
  const isFar = isEffectivelyFar(status, canvasActive);
  const statusRef = reactExports.useRef(status);
  statusRef.current = status;
  const [hoveredAnimationSrc, setHoveredAnimationSrc] = reactExports.useState(null);
  const [loadedAnimationSrc, setLoadedAnimationSrc] = reactExports.useState(null);
  const [failedAnimationSrc, setFailedAnimationSrc] = reactExports.useState(null);
  const animationHoverTimerRef = reactExports.useRef(null);
  const cancelPendingAnimation = reactExports.useCallback(() => {
    if (animationHoverTimerRef.current !== null) {
      clearTimeout(animationHoverTimerRef.current);
      animationHoverTimerRef.current = null;
    }
  }, []);
  const canAnimate = canvasPresented && status === "inView" && !!animationSrc;
  const showAnimation =
    canAnimate && hoveredAnimationSrc === animationSrc && failedAnimationSrc !== animationSrc;
  const animationReady = showAnimation && loadedAnimationSrc === animationSrc;
  reactExports.useEffect(() => {
    setHoveredAnimationSrc(null);
    return cancelPendingAnimation;
  }, [src, animationSrc, canAnimate, cancelPendingAnimation]);
  const handleMouseEnter = () => {
    cancelPendingAnimation();
    if (!canAnimate) return;
    animationHoverTimerRef.current = setTimeout(() => {
      animationHoverTimerRef.current = null;
      setLoadedAnimationSrc(null);
      setFailedAnimationSrc(null);
      setHoveredAnimationSrc(animationSrc ?? null);
    }, GIF_HOVER_DELAY_MS);
  };
  const handleMouseLeave2 = () => {
    cancelPendingAnimation();
    setHoveredAnimationSrc(null);
  };
  const onErrorRef = reactExports.useRef(onError);
  onErrorRef.current = onError;
  const onNaturalSizeRef = reactExports.useRef(onNaturalSize);
  onNaturalSizeRef.current = onNaturalSize;
  const renderPolicy = useCanvasRenderPolicy();
  useCanvasSurfaceRecovery(
    {
      surfaceType: "bitmap-canvas",
      // Resume recovery is deliberately limited to the presented canvas and
      // its visible/prefetch ring. Far nodes release their handle/backing store
      // and naturally draw again when they return.
      isEligible: () =>
        statusRef.current !== "far" && canvasPresented && handleRef.current !== null,
      recover: () => {
        const handle2 = handleRef.current;
        if (!handle2) return false;
        return drawBitmap(canvasRef.current, handle2.bitmap, effectiveWidth, effectiveHeight, dpr, {
          force: true,
        });
      },
    },
    canvasPresented && status !== "far" && loadState === "ready",
  );
  reactExports.useEffect(() => {
    if (isFar) {
      releaseHandle(handleRef);
      resetCanvasBackingStore(canvasRef.current);
      setLoadState("pending");
      return;
    }
    const ctrl = new AbortController();
    let cancelled = false;
    let retryTimer = null;
    setLoadState((prev) => (prev === "ready" ? prev : "pending"));
    const attempt = (retryIdx) => {
      getBitmapManager()
        .acquire({
          url: src,
          displayWidth: effectiveWidth,
          dpr,
          signal: ctrl.signal,
          // Closer-to-viewport tasks get lower priority numbers (dispatch
          // first). Without a per-node distance we collapse to two
          // tiers: visible (0) and prefetch (100). Distance-weighted
          // ordering can come later. Read via ref so a nearView↔inView
          // flip during an existing acquire doesn't re-fire the effect.
          priority: statusRef.current === "inView" ? 0 : 100,
        })
        .then((h2) => {
          if (cancelled) {
            h2.release();
            return;
          }
          releaseHandle(handleRef);
          handleRef.current = h2;
          if (h2.bitmap.width > 0 && h2.bitmap.height > 0) {
            onNaturalSizeRef.current?.(h2.bitmap.width, h2.bitmap.height);
          }
          drawBitmap(canvasRef.current, h2.bitmap, effectiveWidth, effectiveHeight, dpr);
          setLoadState("ready");
        })
        .catch((err) => {
          if (cancelled || err.name === "AbortError") return;
          const delay = TRANSIENT_RETRY_DELAYS_MS[retryIdx];
          if (delay !== void 0 && isTransientDecodeFailure(err)) {
            retryTimer = setTimeout(
              () => {
                retryTimer = null;
                if (!cancelled) attempt(retryIdx + 1);
              },
              delay * (0.5 + Math.random()),
            );
            return;
          }
          setLoadState("error");
          onErrorRef.current?.(classifyPermanentDecodeFailure(err));
        });
    };
    attempt(0);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      ctrl.abort();
    };
  }, [src, effectiveWidth, effectiveHeight, dpr, isFar]);
  reactExports.useEffect(() => {
    if (handleRef.current) {
      drawBitmap(canvasRef.current, handleRef.current.bitmap, effectiveWidth, effectiveHeight, dpr);
    }
  }, [effectiveWidth, effectiveHeight, dpr]);
  reactExports.useEffect(() => {
    return () => releaseHandle(handleRef);
  }, []);
  const wrapperStyle2 = {
    width,
    height,
    position: "relative",
    overflow: "hidden",
    background: loadState === "ready" ? void 0 : "var(--canvas-node-bg, transparent)",
  };
  const canvasStyle = {
    width: "100%",
    height: "100%",
    display: "block",
    // Skip rasterization for nodes scrolled out of the viewport. On a dense
    // canvas the dominant zoom/pan cost is the browser re-rasterizing every
    // image <canvas> texture each frame (measured: 532 image nodes, zoom
    // p50 128 ms). `content-visibility: auto` lets the compositor drop the
    // off-screen canvases from that per-frame raster pass entirely, cutting
    // zoom p50 to ~103 ms with zero VRAM cost (unlike a will-change layer
    // promotion, which is slower here AND balloons GPU memory). The backing
    // store size is unchanged; only paint work is skipped while off-screen.
    // Host policy can temporarily keep the texture visible for a narrowly
    // scoped compositor canary. Far-node virtualization and bitmap release
    // remain independent from this paint-culling policy.
    contentVisibility: resolveCanvasContentVisibilityStyle(renderPolicy),
    // Match what <img object-fit:cover> does. drawBitmap stretches the
    // source to the full backing store; if aspect ratio differs the
    // resize on the worker side would have already preserved aspect,
    // so the bitmap may be smaller than the canvas — letterboxing is
    // visually identical to object-fit:cover when the canvas itself
    // crops via overflow:hidden.
    objectFit: "cover",
    // Defensive: never receive pointer events; the parent node owns
    // hit-testing for selection / drag.
    pointerEvents: "none",
    // Hide the poster after the GIF loads, otherwise transparent animation
    // frames would show the old still frame underneath.
    visibility: animationReady ? "hidden" : void 0,
  };
  if (loadState === "error") {
    return <div className={className} style={wrapperStyle2} role="img" aria-label={alt} />;
  }
  return (
    <div
      className={className}
      style={wrapperStyle2}
      role="img"
      aria-label={alt}
      onMouseEnter={animationSrc ? handleMouseEnter : void 0}
      onMouseLeave={animationSrc ? handleMouseLeave2 : void 0}
    >
      <canvas ref={canvasRef} style={canvasStyle} />
      {showAnimation && (
        <img
          key={animationSrc}
          src={animationSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          decoding="async"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{
            visibility: animationReady ? "visible" : "hidden",
          }}
          onLoad={() => setLoadedAnimationSrc(animationSrc ?? null)}
          onError={() => setFailedAnimationSrc(animationSrc ?? null)}
          data-action-ui-id="canvas.image-hover-preview"
        />
      )}
    </div>
  );
}
function isEffectivelyFar(status, canvasActive) {
  return status === "far" || !canvasActive;
}
function readDpr$1() {
  if (typeof window === "undefined") return 1;
  return Math.max(1, window.devicePixelRatio || 1);
}
function releaseHandle(ref) {
  const h2 = ref.current;
  if (!h2) return;
  ref.current = null;
  h2.release();
}
function getDrawSig(canvas) {
  return canvas.__drawSig;
}
function setDrawSig(canvas, sig) {
  canvas.__drawSig = sig;
}
let bitmapIdCounter = 0;
function bitmapId(bitmap) {
  const tagged = bitmap;
  tagged.__hiloId ??= ++bitmapIdCounter;
  return tagged.__hiloId;
}
function resetCanvasBackingStore(canvas) {
  if (!canvas) return;
  if (canvas.width !== 1) canvas.width = 1;
  if (canvas.height !== 1) canvas.height = 1;
  setDrawSig(canvas, void 0);
}
function computeCanvasBackingSize(displayWidth, displayHeight, dpr, bitmapWidth, bitmapHeight) {
  const wantW = Math.max(1, Math.round(displayWidth * dpr));
  const wantH = Math.max(1, Math.round(displayHeight * dpr));
  const scale2 = Math.min(1, bitmapWidth / wantW, bitmapHeight / wantH);
  return {
    width: Math.min(bitmapWidth, Math.max(1, Math.round(wantW * scale2))),
    height: Math.min(bitmapHeight, Math.max(1, Math.round(wantH * scale2))),
  };
}
function drawBitmap(canvas, bitmap, displayWidth, displayHeight, dpr, options = {}) {
  if (!canvas) return false;
  const backing = computeCanvasBackingSize(
    displayWidth,
    displayHeight,
    dpr,
    bitmap.width,
    bitmap.height,
  );
  const backingW = backing.width;
  const backingH = backing.height;
  const sig = `${backingW}x${backingH}@${bitmapId(bitmap)}`;
  if (!options.force && getDrawSig(canvas) === sig) return false;
  if (canvas.width !== backingW) canvas.width = backingW;
  if (canvas.height !== backingH) canvas.height = backingH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  ctx.clearRect(0, 0, backingW, backingH);
  ctx.drawImage(bitmap, 0, 0, backingW, backingH);
  setDrawSig(canvas, sig);
  return true;
}
export function resolvePanoramaGenerationPresentation(node2) {
  const data2 = node2?.data;
  if (node2?.type !== "placeholder" || data2?.mediaType !== "image") {
    return {
      status: "idle",
    };
  }
  if (!isGenerationErrorStatus(data2.status)) {
    return {
      status: "loading",
    };
  }
  const retryPayload =
    data2.retryPayload !== null && typeof data2.retryPayload === "object"
      ? data2.retryPayload
      : void 0;
  return {
    status: "error",
    errorStatus: data2.status,
    errorMessage: typeof data2.errorMessage === "string" ? data2.errorMessage : "",
    errorReason: typeof data2.errorReason === "string" ? data2.errorReason : void 0,
    retryPayload,
  };
}
export function panoramaGenerationPresentationKey(node2) {
  const presentation = resolvePanoramaGenerationPresentation(node2);
  if (presentation.status !== "error") return presentation.status;
  return [
    presentation.status,
    presentation.errorStatus,
    presentation.errorMessage,
    presentation.errorReason ?? "",
    presentation.retryPayload ? JSON.stringify(presentation.retryPayload) : "",
  ].join("\0");
}
export const PANORAMA_EMPTY_NODE_SIZE = {
  width: 410,
  height: 231,
};
export const PANORAMA_VIEWER_NODE_SIZE = {
  width: 820,
  height: 410,
};
export function panoramaCleanPreviewUrl(sourceUrl) {
  if (!sourceUrl) return sourceUrl;
  const separator = sourceUrl.includes("?") ? "&" : "?";
  return `${sourceUrl}${separator}panorama_preview=clean`;
}
export function panoramaViewerNodeSize(
  sourceWidth,
  sourceHeight,
  preferredWidth = PANORAMA_VIEWER_NODE_SIZE.width,
) {
  const width =
    Number.isFinite(preferredWidth) && preferredWidth > 0
      ? Math.round(preferredWidth)
      : PANORAMA_VIEWER_NODE_SIZE.width;
  const aspectRatio =
    Number.isFinite(sourceWidth) &&
    Number.isFinite(sourceHeight) &&
    (sourceWidth ?? 0) > 0 &&
    (sourceHeight ?? 0) > 0
      ? sourceWidth / sourceHeight
      : PANORAMA_VIEWER_NODE_SIZE.width / PANORAMA_VIEWER_NODE_SIZE.height;
  return {
    width,
    height: Math.max(1, Math.round(width / aspectRatio)),
  };
}
export function ParamQualitySlider({
  label,
  options,
  value,
  onChange,
  disabled: disabled2,
  disabledOptions,
  getOptionLabel,
}) {
  const { t: t2 } = useTranslation();
  const [preview, setPreview] = reactExports.useState(null);
  const previewRef = reactExports.useRef(null);
  const requestedRef = reactExports.useRef(null);
  const canceledRef = reactExports.useRef(false);
  const selected2 = Math.max(0, options.indexOf(value));
  const inactive = disabled2 || options.every((option2) => disabledOptions?.has(option2));
  const optionLabel = (option2) =>
    getOptionLabel?.(option2) ??
    t2(`canvas.param.option.${option2}`, {
      defaultValue: option2,
    });
  reactExports.useEffect(() => {
    if (previewRef.current !== null) canceledRef.current = true;
    previewRef.current = null;
    requestedRef.current = null;
    setPreview(null);
  }, [value, options, disabled2, disabledOptions]);
  const handlePreview = (next2) => {
    if (canceledRef.current) return;
    const index2 = Math.round(typeof next2 === "number" ? next2 : next2[0]);
    if (index2 === requestedRef.current) return;
    const current2 = previewRef.current ?? selected2;
    const direction = index2 >= (requestedRef.current ?? current2) ? 1 : -1;
    requestedRef.current = index2;
    let available = index2;
    while (
      available >= 0 &&
      available < options.length &&
      disabledOptions?.has(options[available])
    ) {
      available += direction;
    }
    if (available < 0 || available >= options.length) {
      available = index2;
      while (
        available >= 0 &&
        available < options.length &&
        disabledOptions?.has(options[available])
      ) {
        available -= direction;
      }
    }
    if (available < 0 || available >= options.length) available = current2;
    previewRef.current = available;
    setPreview(available);
  };
  const handleCommit = (next2) => {
    const index2 = previewRef.current ?? Math.round(typeof next2 === "number" ? next2 : next2[0]);
    const option2 = options[index2];
    if (!canceledRef.current && !inactive && option2 !== void 0 && !disabledOptions?.has(option2)) {
      onChange?.(option2);
    }
    previewRef.current = null;
    requestedRef.current = null;
    setPreview(null);
  };
  const handleCancel = () => {
    canceledRef.current = true;
    previewRef.current = null;
    requestedRef.current = null;
    setPreview(null);
  };
  return (
    <div data-action-ui-id="canvas.params.quality-control">
      <div className="hilo-slider-field__header flex items-baseline justify-between gap-3">
        <ParamSectionLabel>{label}</ParamSectionLabel>
        <output className="text-[13px] text-[var(--canvas-controls-text)]">
          {optionLabel(preview === null ? value : (options[preview] ?? value))}
        </output>
      </div>
      <Slider$1
        variant="filled"
        size="compact"
        value={preview ?? selected2}
        min={0}
        max={Math.max(1, options.length - 1)}
        step={1}
        largeStep={1}
        disabled={inactive || options.length < 2}
        aria-label={label}
        onValueChange={handlePreview}
        onValueCommitted={handleCommit}
        onPointerCancel={handleCancel}
        onPointerDownCapture={() => {
          canceledRef.current = false;
        }}
        onKeyDownCapture={() => {
          canceledRef.current = false;
        }}
        onPointerDown={(event) => event.stopPropagation()}
        thumbProps={{
          "data-action-ui-id": "canvas.params.quality-slider",
          getAriaValueText: (_formatted, index2) => optionLabel(options[index2] ?? value),
        }}
      />
      <div className="hilo-slider-field__marks flex items-start justify-between gap-1">
        {options.map((option2) => (
          <button
            key={option2}
            type="button"
            disabled={disabled2 || disabledOptions?.has(option2)}
            aria-pressed={option2 === value}
            data-action-ui-id={`canvas.params.quality-option-${option2}`}
            onClick={(event) => {
              event.stopPropagation();
              handleCancel();
              onChange?.(option2);
            }}
            className="min-w-0 cursor-pointer rounded-md px-1 py-1 text-[11px] text-muted-foreground hover:enabled:bg-[var(--canvas-controls-hover)] hover:enabled:text-foreground aria-pressed:text-foreground disabled:cursor-default disabled:opacity-40"
          >
            {optionLabel(option2)}
          </button>
        ))}
      </div>
    </div>
  );
}
