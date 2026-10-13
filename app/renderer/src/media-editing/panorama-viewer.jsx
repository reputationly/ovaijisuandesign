// panorama-viewer.jsx
import {
  CompositedSvg,
  Maximize,
  reactDomExports,
  reactExports,
  RotateCw,
  useTranslation,
  X$7 as X,
  ZoomIn,
  ZoomOut,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { TooltipProvider } from "../infra/create-recently-added-store.js";
import { Camera } from "./package.jsx";
import { Tooltip } from "../generation/missing-asset-card.jsx";
const VERTEX_SHADER = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
const FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uYaw;
uniform float uPitch;
uniform float uFov;
uniform float uAspect;
const float PI = 3.14159265359;
void main() {
  float t = tan(uFov * 0.5);
  vec3 dir = normalize(vec3(vUv.x * t * uAspect, vUv.y * t, -1.0));
  float cy = cos(uPitch), sy = sin(uPitch);
  dir = vec3(dir.x, cy * dir.y - sy * dir.z, sy * dir.y + cy * dir.z);
  float cx = cos(uYaw), sx = sin(uYaw);
  dir = vec3(cx * dir.x + sx * dir.z, dir.y, -sx * dir.x + cx * dir.z);
  float u = atan(dir.x, -dir.z) / (2.0 * PI) + 0.5;
  float v = asin(clamp(dir.y, -1.0, 1.0)) / PI + 0.5;
  gl_FragColor = texture2D(uTex, vec2(u, 1.0 - v));
}`;
const FOV_MIN = 30;
const FOV_MAX = 110;
const MAX_TEXTURE_WIDTH = 4096;
function getWindowButtonBridge() {
  const platform = window.__HILO_PLATFORM__;
  return platform?.window;
}
function snapshotCanvasAsPng(source) {
  const snapshot = document.createElement("canvas");
  snapshot.width = source.width;
  snapshot.height = source.height;
  const context = snapshot.getContext("2d");
  if (!context)
    return Promise.reject(new Error("Unable to create capture canvas"));
  context.drawImage(source, 0, 0);
  return new Promise((resolve, reject) => {
    snapshot.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}
function PanoramaResetIcon() {
  return (
    <CompositedSvg
      width="19"
      height="19"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M13.897 9.358c.212.212.572.122.632-.172A6.667 6.667 0 0 0 2.757 3.718c-.12.153-.1.371.037.509l.276.276c.18.18.479.148.636-.052a5.467 5.467 0 0 1 9.612 2.127l-1.523.682zm-6.298 5.131c.22.014.4-.167.4-.388v-.4c0-.22-.18-.398-.4-.414A5.47 5.47 0 0 1 2.687 9.12l1.508-.673-2.1-2.093c-.214-.213-.574-.12-.633.175a6.668 6.668 0 0 0 6.138 7.962m3.292.003a.267.267 0 0 0 .5 0l.607-1.642a.27.27 0 0 1 .157-.158l1.643-.608a.267.267 0 0 0 0-.5l-1.643-.607a.27.27 0 0 1-.157-.158l-.607-1.642a.267.267 0 0 0-.5 0l-.609 1.642a.27.27 0 0 1-.157.158l-1.643.607a.267.267 0 0 0 0 .5l1.643.608c.073.027.13.085.157.158z"
      />
    </CompositedSvg>
  );
}
function CompositionGuidesIcon() {
  return (
    <CompositedSvg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 2.5v15M10 2.5v15M14 2.5v15M2.5 6h15M2.5 10h15M2.5 14h15" />
    </CompositedSvg>
  );
}
function compileShader(webGlContext, type, source) {
  const shader = webGlContext.createShader(type);
  if (!shader) throw new Error("Unable to create WebGL shader");
  webGlContext.shaderSource(shader, source);
  webGlContext.compileShader(shader);
  if (!webGlContext.getShaderParameter(shader, webGlContext.COMPILE_STATUS)) {
    const message =
      webGlContext.getShaderInfoLog(shader) || "Unable to compile WebGL shader";
    webGlContext.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}
function initializeWebGl(canvas) {
  const webGlContext = canvas.getContext("webgl", {
    antialias: true,
    preserveDrawingBuffer: false,
  });
  if (!webGlContext) throw new Error("WebGL is unavailable");
  let vertex = null;
  let fragment = null;
  let program = null;
  let buffer = null;
  let texture = null;
  try {
    vertex = compileShader(webGlContext, webGlContext.VERTEX_SHADER, VERTEX_SHADER);
    fragment = compileShader(webGlContext, webGlContext.FRAGMENT_SHADER, FRAGMENT_SHADER);
    program = webGlContext.createProgram();
    if (!program) throw new Error("Unable to create WebGL program");
    webGlContext.attachShader(program, vertex);
    webGlContext.attachShader(program, fragment);
    webGlContext.linkProgram(program);
    if (!webGlContext.getProgramParameter(program, webGlContext.LINK_STATUS)) {
      throw new Error(
        webGlContext.getProgramInfoLog(program) || "Unable to link WebGL program",
      );
    }
    webGlContext.useProgram(program);
    buffer = webGlContext.createBuffer();
    if (!buffer) throw new Error("Unable to create WebGL buffer");
    webGlContext.bindBuffer(webGlContext.ARRAY_BUFFER, buffer);
    webGlContext.bufferData(
      webGlContext.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      webGlContext.STATIC_DRAW,
    );
    const position = webGlContext.getAttribLocation(program, "aPos");
    webGlContext.enableVertexAttribArray(position);
    webGlContext.vertexAttribPointer(position, 2, webGlContext.FLOAT, false, 0, 0);
    texture = webGlContext.createTexture();
    if (!texture) throw new Error("Unable to create WebGL texture");
    webGlContext.bindTexture(webGlContext.TEXTURE_2D, texture);
    webGlContext.texParameteri(webGlContext.TEXTURE_2D, webGlContext.TEXTURE_WRAP_S, webGlContext.REPEAT);
    webGlContext.texParameteri(webGlContext.TEXTURE_2D, webGlContext.TEXTURE_WRAP_T, webGlContext.CLAMP_TO_EDGE);
    webGlContext.texParameteri(webGlContext.TEXTURE_2D, webGlContext.TEXTURE_MIN_FILTER, webGlContext.LINEAR);
    webGlContext.texParameteri(webGlContext.TEXTURE_2D, webGlContext.TEXTURE_MAG_FILTER, webGlContext.LINEAR);
    return {
      gl: webGlContext,
      program,
      buffer,
      texture,
      textureUniform: webGlContext.getUniformLocation(program, "uTex"),
      yaw: webGlContext.getUniformLocation(program, "uYaw"),
      pitch: webGlContext.getUniformLocation(program, "uPitch"),
      fov: webGlContext.getUniformLocation(program, "uFov"),
      aspect: webGlContext.getUniformLocation(program, "uAspect"),
    };
  } catch (error) {
    if (texture) webGlContext.deleteTexture(texture);
    if (buffer) webGlContext.deleteBuffer(buffer);
    if (program) webGlContext.deleteProgram(program);
    throw error;
  } finally {
    if (vertex) webGlContext.deleteShader(vertex);
    if (fragment) webGlContext.deleteShader(fragment);
  }
}
function disposeWebGl(state) {
  state.gl.deleteTexture(state.texture);
  state.gl.deleteBuffer(state.buffer);
  state.gl.deleteProgram(state.program);
}
function uploadTexture(state, image) {
  const { gl: webGlContext, texture } = state;
  const textureWidth = Math.min(
    MAX_TEXTURE_WIDTH,
    image.naturalWidth >= 4096 ? 4096 : 2048,
  );
  const textureHeight = textureWidth / 2;
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = textureWidth;
  textureCanvas.height = textureHeight;
  const context = textureCanvas.getContext("2d");
  if (!context) throw new Error("Unable to create panorama texture canvas");
  context.drawImage(image, 0, 0, textureWidth, textureHeight);
  webGlContext.bindTexture(webGlContext.TEXTURE_2D, texture);
  webGlContext.pixelStorei(webGlContext.UNPACK_FLIP_Y_WEBGL, false);
  webGlContext.texImage2D(
    webGlContext.TEXTURE_2D,
    0,
    webGlContext.RGBA,
    webGlContext.RGBA,
    webGlContext.UNSIGNED_BYTE,
    textureCanvas,
  );
  if (webGlContext.getError() !== webGlContext.NO_ERROR)
    throw new Error("Unable to upload panorama texture");
}
function drawPanoramaFrame(state, canvas, camera) {
  const { gl: webGlContext, program, texture } = state;
  webGlContext.viewport(0, 0, canvas.width, canvas.height);
  webGlContext.useProgram(program);
  webGlContext.activeTexture(webGlContext.TEXTURE0);
  webGlContext.bindTexture(webGlContext.TEXTURE_2D, texture);
  webGlContext.uniform1i(state.textureUniform, 0);
  webGlContext.uniform1f(state.yaw, camera.yaw);
  webGlContext.uniform1f(state.pitch, camera.pitch);
  webGlContext.uniform1f(state.fov, (camera.fov * Math.PI) / 180);
  webGlContext.uniform1f(state.aspect, canvas.width / Math.max(1, canvas.height));
  webGlContext.drawArrays(webGlContext.TRIANGLES, 0, 6);
}
export function PanoramaViewer({
  src,
  interactive,
  emptyLabel,
  loadingLabel,
  errorLabel,
  captureName = "panorama",
  captureRequest,
  fullscreenRequestId = 0,
  onExitPreview,
  onRequestCaptureCurrent,
  onCapture,
  onCaptureRequestSettled,
}) {
  const { t } = useTranslation();
  const rootRef = reactExports.useRef(null);
  const canvasRef = reactExports.useRef(null);
  const webGlRef = reactExports.useRef(null);
  const sourceImageRef = reactExports.useRef(null);
  const drawRef = reactExports.useRef(() => {});
  const cameraRef = reactExports.useRef({
    yaw: 0,
    pitch: 0,
    fov: 90,
  });
  const captureBusyRef = reactExports.useRef(false);
  const textureReadyRef = reactExports.useRef(false);
  const lastCaptureRequestRef = reactExports.useRef(0);
  const lastFullscreenRequestRef = reactExports.useRef(0);
  const dragRef = reactExports.useRef(null);
  const [status, setStatus] = reactExports.useState(src ? "loading" : "empty");
  const [fieldOfView, setFov] = reactExports.useState(90);
  const [autoRotate, setAutoRotate] = reactExports.useState(false);
  const [fullscreen, setFullscreen] = reactExports.useState(false);
  const [guides, setGuides] = reactExports.useState(false);
  const [captureBusy, setCaptureBusy] = reactExports.useState(false);
  const [contextGeneration, setContextGeneration] = reactExports.useState(0);
  reactExports.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      webGlRef.current = initializeWebGl(canvas);
    } catch (error) {
      console.error("[panorama] WebGL initialization failed:", error);
      setStatus("error");
      return;
    }
    const draw = (cameraOverride) => {
      const state = webGlRef.current;
      if (!state || !textureReadyRef.current) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
      const height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const camera = cameraOverride ?? cameraRef.current;
      drawPanoramaFrame(state, canvas, camera);
    };
    drawRef.current = draw;
    const resizeObserver = new ResizeObserver(() => draw());
    resizeObserver.observe(canvas);
    const handleContextLost = (event) => {
      event.preventDefault();
      textureReadyRef.current = false;
      setStatus("error");
    };
    const handleContextRestored = () =>
      setContextGeneration((value) => value + 1);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);
    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      const state = webGlRef.current;
      if (state) disposeWebGl(state);
      webGlRef.current = null;
      textureReadyRef.current = false;
      drawRef.current = () => {};
    };
  }, [contextGeneration, fullscreen]);
  reactExports.useEffect(() => {
    textureReadyRef.current = false;
    if (!src) {
      setStatus("empty");
      return;
    }
    setStatus("loading");
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const state = webGlRef.current;
      if (!state) return;
      try {
        uploadTexture(state, image);
        sourceImageRef.current = image;
        textureReadyRef.current = true;
        setStatus("ready");
        requestAnimationFrame(() => drawRef.current());
      } catch (error) {
        console.error("[panorama] Texture upload failed:", error);
        setStatus("error");
      }
    };
    image.onerror = () => setStatus("error");
    image.src = src;
    return () => {
      if (sourceImageRef.current === image) sourceImageRef.current = null;
      image.onload = null;
      image.onerror = null;
    };
  }, [contextGeneration, fullscreen, src]);
  reactExports.useEffect(() => {
    if (!interactive || !autoRotate || status !== "ready") return;
    let frame = 0;
    let previousTime = performance.now();
    const rotate = (time) => {
      if (!captureBusyRef.current) {
        cameraRef.current.yaw +=
          Math.min((time - previousTime) / 1e3, 0.1) * 0.18;
        drawRef.current();
      }
      previousTime = time;
      frame = requestAnimationFrame(rotate);
    };
    frame = requestAnimationFrame(rotate);
    return () => cancelAnimationFrame(frame);
  }, [autoRotate, interactive, status]);
  const zoom = reactExports.useCallback((delta) => {
    if (captureBusyRef.current) return;
    const next = Math.max(
      FOV_MIN,
      Math.min(FOV_MAX, cameraRef.current.fov + delta),
    );
    cameraRef.current.fov = next;
    setFov(Math.round(next));
    drawRef.current();
  }, []);
  const reset = reactExports.useCallback(() => {
    if (captureBusyRef.current) return;
    cameraRef.current = {
      yaw: 0,
      pitch: 0,
      fov: 90,
    };
    setFov(90);
    drawRef.current();
  }, []);
  const handlePointerDown = reactExports.useCallback(
    (event) => {
      if (!interactive || status !== "ready" || captureBusyRef.current) return;
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
      setAutoRotate(false);
    },
    [interactive, status],
  );
  const handlePointerMove = reactExports.useCallback((event) => {
    if (captureBusyRef.current) return;
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const height = Math.max(1, event.currentTarget.clientHeight);
    const scale = (cameraRef.current.fov * Math.PI) / 180 / height;
    cameraRef.current.yaw += (event.clientX - drag.x) * scale;
    cameraRef.current.pitch = Math.max(
      -Math.PI / 2 + 0.01,
      Math.min(
        Math.PI / 2 - 0.01,
        cameraRef.current.pitch + (event.clientY - drag.y) * scale,
      ),
    );
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    drawRef.current();
  }, []);
  const handlePointerUp = reactExports.useCallback((event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }, []);
  const handleWheel = reactExports.useCallback(
    (event) => {
      if (!interactive || status !== "ready" || captureBusyRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      zoom(event.deltaY * 0.05);
    },
    [interactive, status, zoom],
  );
  const capture = reactExports.useCallback(
    async (count) => {
      const canvas = canvasRef.current;
      const sourceImage = sourceImageRef.current;
      if (
        !canvas ||
        !sourceImage ||
        status !== "ready" ||
        captureBusyRef.current
      )
        return;
      captureBusyRef.current = true;
      setCaptureBusy(true);
      const original = {
        ...cameraRef.current,
      };
      const captureCanvas = document.createElement("canvas");
      captureCanvas.width = Math.max(1, canvas.width);
      captureCanvas.height = Math.max(1, canvas.height);
      let captureState = null;
      const safeName =
        captureName.replace(/\.[^.]+$/, "").replace(/[^\w一-龥-]+/g, "_") ||
        "panorama";
      try {
        captureState = initializeWebGl(captureCanvas);
        uploadTexture(captureState, sourceImage);
        const items = [];
        for (let index = 0; index < count; index += 1) {
          const captureCamera =
            count > 1
              ? {
                  yaw: (index / count) * Math.PI * 2,
                  pitch: 0,
                  fov: 90,
                }
              : original;
          drawPanoramaFrame(captureState, captureCanvas, captureCamera);
          const blob = await snapshotCanvasAsPng(captureCanvas);
          const degree = Math.round((index * 360) / count);
          const filename =
            count === 1
              ? `${safeName}_view.png`
              : `${safeName}_${count}view_${String(degree).padStart(3, "0")}.png`;
          items.push({
            blob,
            filename,
          });
        }
        if (onCapture) {
          await onCapture(
            items,
            count === 1 ? "当前视角" : `${count} 大视角截图`,
            {
              fullscreen,
            },
          );
        } else {
          for (const item of items) {
            const url = URL.createObjectURL(item.blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = item.filename;
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(url), 1e3);
          }
        }
      } catch (error) {
        console.error("[panorama] Capture failed:", error);
      } finally {
        if (captureState) disposeWebGl(captureState);
        captureBusyRef.current = false;
        setCaptureBusy(false);
      }
    },
    [captureName, fullscreen, onCapture, status],
  );
  reactExports.useEffect(() => {
    if (
      !captureRequest ||
      captureRequest.sequence === lastCaptureRequestRef.current
    )
      return;
    if (status !== "ready") return;
    lastCaptureRequestRef.current = captureRequest.sequence;
    const { count, sequence } = captureRequest;
    void capture(count).finally(() => onCaptureRequestSettled?.(sequence));
  }, [capture, captureRequest, onCaptureRequestSettled, status]);
  reactExports.useEffect(() => {
    if (
      !fullscreenRequestId ||
      fullscreenRequestId === lastFullscreenRequestRef.current
    )
      return;
    lastFullscreenRequestRef.current = fullscreenRequestId;
    setFullscreen(true);
  }, [fullscreenRequestId]);
  reactExports.useEffect(() => {
    if (!fullscreen && !onExitPreview) return;
    const windowBridge = fullscreen ? getWindowButtonBridge() : void 0;
    windowBridge?.setWindowButtonVisibility?.(false);
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (fullscreen) setFullscreen(false);
      else onExitPreview?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      windowBridge?.setWindowButtonVisibility?.(true);
    };
  }, [fullscreen, onExitPreview]);
  const controlClass =
    "nodrag nowheel relative flex size-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white disabled:opacity-50";
  const controlSurfaceClass =
    "flex items-center rounded-full border border-transparent bg-black/65 p-1 shadow-[var(--canvas-shadow-panel)] backdrop-blur-xl transition-colors hover:border-white/35";
  const viewer = (
    <div
      ref={rootRef}
      className={`${fullscreen ? "fixed inset-0 z-[10000]" : "relative size-full"} overflow-hidden bg-[var(--canvas-node-bg)]`}
    >
      <canvas
        ref={canvasRef}
        className={`size-full touch-none ${interactive ? "nodrag nopan nowheel cursor-grab active:cursor-grabbing" : "cursor-default"}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (!fullscreen) setFullscreen(true);
        }}
      />
      {guides && status === "ready" && (
        <svg
          className="pointer-events-none absolute inset-0 z-[4] size-full"
          viewBox="0 0 90 90"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <g
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-background/70"
          >
            <line x1="30" y1="0" x2="30" y2="90" />
            <line x1="60" y1="0" x2="60" y2="90" />
            <line x1="0" y1="30" x2="90" y2="30" />
            <line x1="0" y1="60" x2="90" y2="60" />
          </g>
        </svg>
      )}
      {status !== "ready" && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-[var(--canvas-node-bg)] px-6 text-center text-[13px] ${status === "empty" ? "text-[var(--canvas-empty-guidance-fg)]" : "text-[var(--canvas-controls-text-muted)]"}`}
        >
          {status === "loading"
            ? loadingLabel
            : status === "error"
              ? errorLabel
              : emptyLabel}
        </div>
      )}
      {fullscreen && status === "ready" && (
        <TooltipProvider delay={150} closeDelay={0}>
          <div className="nodrag nowheel absolute left-1/2 top-6 z-[6] -translate-x-1/2 rounded-lg border border-transparent bg-black/65 p-1 shadow-[var(--canvas-shadow-panel)] backdrop-blur-xl transition-colors hover:border-white/35">
            <Tooltip
              content={t("canvas.panorama.capture", "截取当前画面")}
              side="bottom"
              sideOffset={8}
            >
              <button
                type="button"
                className="nodrag nowheel flex h-10 items-center justify-center gap-2 rounded-[8px] px-3 text-[13px] font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white disabled:opacity-50"
                onClick={onRequestCaptureCurrent}
                disabled={captureBusy || !onRequestCaptureCurrent}
                aria-label={t("canvas.panorama.capture", "截取当前画面")}
              >
                <Camera size={19} strokeWidth={1.8} />
                <span>{t("canvas.panorama.capture", "截取当前画面")}</span>
              </button>
            </Tooltip>
          </div>
          <div className="nodrag nowheel absolute right-6 top-6 z-[6] rounded-lg border border-transparent bg-black/65 p-1 shadow-[var(--canvas-shadow-panel)] backdrop-blur-xl transition-colors hover:border-white/35">
            <Tooltip
              content={t("canvas.panorama.exitFullscreen", "退出全屏模式")}
              side="bottom"
              sideOffset={8}
            >
              <button
                type="button"
                className="nodrag nowheel flex size-10 items-center justify-center rounded-[8px] text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
                onClick={() => setFullscreen(false)}
                aria-label={t(
                  "canvas.panorama.exitFullscreen",
                  "退出全屏模式",
                )}
              >
                <X size={19} strokeWidth={2.2} className="scale-[1.2]" />
              </button>
            </Tooltip>
          </div>
        </TooltipProvider>
      )}
      {status === "ready" && interactive && (
        <TooltipProvider delay={150} closeDelay={0}>
          <div
            className={`nodrag nowheel absolute bottom-[22px] left-1/2 z-[5] flex max-w-[calc(100%-2rem)] -translate-x-1/2 origin-bottom items-center gap-2 ${fullscreen ? "" : "scale-90"}`}
          >
            <div className={controlSurfaceClass}>
              <Tooltip
                content={t("canvas.panorama.autoRotate", "自动旋转")}
                side="top"
                sideOffset={8}
              >
                <button
                  type="button"
                  className={`${controlClass} ${autoRotate ? "bg-white/15" : ""}`}
                  onClick={() => setAutoRotate((current) => !current)}
                  aria-label={t("canvas.panorama.autoRotate", "自动旋转")}
                  aria-pressed={autoRotate}
                >
                  <RotateCw size={19} strokeWidth={1.8} />
                </button>
              </Tooltip>
            </div>
            <div className={controlSurfaceClass}>
              <Tooltip
                content={t("canvas.panorama.zoomOut", "缩小")}
                side="top"
                sideOffset={8}
              >
                <button
                  type="button"
                  className={controlClass}
                  onClick={() => zoom(10)}
                  aria-label={t("canvas.panorama.zoomOut", "缩小")}
                >
                  <ZoomOut size={19} strokeWidth={1.8} />
                </button>
              </Tooltip>
              <span className="min-w-[42px] select-none px-0.5 text-center text-[12px] font-medium tabular-nums text-white">
                {fieldOfView}°
              </span>
              <Tooltip
                content={t("canvas.panorama.zoomIn", "放大")}
                side="top"
                sideOffset={8}
              >
                <button
                  type="button"
                  className={controlClass}
                  onClick={() => zoom(-10)}
                  aria-label={t("canvas.panorama.zoomIn", "放大")}
                >
                  <ZoomIn size={19} strokeWidth={1.8} />
                </button>
              </Tooltip>
              <div
                className="mx-1 h-5 w-px bg-[var(--canvas-controls-border)]"
                aria-hidden="true"
              />
              <Tooltip
                content={t("canvas.panorama.reset", "重置视角")}
                side="top"
                sideOffset={8}
              >
                <button
                  type="button"
                  className={controlClass}
                  onClick={reset}
                  aria-label={t("canvas.panorama.reset", "重置视角")}
                >
                  <PanoramaResetIcon />
                </button>
              </Tooltip>
              {!fullscreen && (
                <Tooltip
                  content={t("canvas.panorama.fullscreen", "进入全屏模式")}
                  side="top"
                  sideOffset={8}
                >
                  <button
                    type="button"
                    className={controlClass}
                    onClick={() => setFullscreen(true)}
                    aria-label={t(
                      "canvas.panorama.fullscreen",
                      "进入全屏模式",
                    )}
                  >
                    <Maximize size={19} strokeWidth={1.8} />
                  </button>
                </Tooltip>
              )}
            </div>
            <div className={controlSurfaceClass}>
              <Tooltip
                content={t("canvas.panorama.guides", "构图参考线")}
                side="top"
                sideOffset={8}
              >
                <button
                  type="button"
                  className={`${controlClass} ${guides ? "bg-white/15" : ""}`}
                  onClick={() => setGuides((current) => !current)}
                  aria-label={t("canvas.panorama.guides", "构图参考线")}
                  aria-pressed={guides}
                >
                  <CompositionGuidesIcon />
                </button>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      )}
    </div>
  );
  return fullscreen
    ? reactDomExports.createPortal(viewer, document.body)
    : viewer;
}
