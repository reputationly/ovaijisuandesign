// camera-ball.jsx
import { CompositedSvg, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { CameraModel3D } from "./camera-model3-d.jsx";
import { CANVAS_SIZE } from "./plane-quad.jsx";
const ToolUploadIcon = ({ className = "" }) => (
  <CompositedSvg
    aria-hidden="true"
    className={className}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8 2V10"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11.3332 5.33333L7.99984 2L4.6665 5.33333"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </CompositedSvg>
);
const RADIUS = 88;
const MERIDIANS = 6;
const PARALLELS = 4;
const PHOTO_SIZE_MIN = 44;
const PHOTO_SIZE_MEDIUM = 56;
const PHOTO_SIZE_MAX = 68;
const UPLOAD_BTN_SIZE = 56;
const MARKER_SIZE = 32;
const CAMERA_GRID_FOLLOW = 0.2;
const RADIANS_PER_DEGREE = Math.PI / 180;
function getPhotoSize(zoom2) {
  const clampedZoom = Math.max(0, Math.min(10, zoom2));
  if (clampedZoom <= 5) {
    return (
      PHOTO_SIZE_MIN + (PHOTO_SIZE_MEDIUM - PHOTO_SIZE_MIN) * (clampedZoom / 5)
    );
  }
  return (
    PHOTO_SIZE_MEDIUM +
    (PHOTO_SIZE_MAX - PHOTO_SIZE_MEDIUM) * ((clampedZoom - 5) / 5)
  );
}
function CenterImage({ imageUrl, size: size2 }) {
  const [loadedUrl, setLoadedUrl] = reactExports.useState(null);
  const imgRef = reactExports.useRef(null);
  const isLoaded = loadedUrl === imageUrl;
  reactExports.useEffect(() => {
    const imageElement = imgRef.current;
    if (imageElement?.complete) setLoadedUrl(imageUrl);
  }, [imageUrl]);
  return (
    <div
      className="border-hl_line_00 bg-hl_bg_05 relative mx-auto overflow-hidden rounded-lg border transition-[width,height] duration-200 ease-out"
      style={{
        width: size2,
        height: size2,
      }}
    >
      {!isLoaded && (
        <div
          aria-hidden="true"
          className="bg-hl_bg_05 pointer-events-none absolute inset-0 animate-pulse"
        />
      )}
      <img
        ref={imgRef}
        src={imageUrl}
        alt=""
        className={`h-full w-full object-cover transition-opacity duration-200 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        draggable={false}
        onLoad={() => setLoadedUrl(imageUrl)}
        onError={() => setLoadedUrl(imageUrl)}
      />
    </div>
  );
}
function project(pointX, pointY, pointZ, yawRadians, pitch, centerX, centerY, radius) {
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const rotatedY = pointY * cosPitch + pointZ * sinPitch;
  const rotatedZ = -pointY * sinPitch + pointZ * cosPitch;
  const cosYaw = Math.cos(yawRadians);
  const sinYaw = Math.sin(yawRadians);
  const rotatedX = pointX * cosYaw + rotatedZ * sinYaw;
  const rotatedDepth = -pointX * sinYaw + rotatedZ * cosYaw;
  return {
    x: centerX + rotatedX * radius,
    y: centerY - rotatedY * radius,
    z: rotatedDepth,
  };
}
function strokeWithDepth(canvasContext, points, frontAlpha, backAlpha) {
  const flush2 = (start2, end2, isFront) => {
    if (end2 - start2 < 2) return;
    canvasContext.globalAlpha = isFront ? frontAlpha : backAlpha;
    canvasContext.beginPath();
    canvasContext.moveTo(points[start2].x, points[start2].y);
    for (let j2 = start2 + 1; j2 < end2; j2++) canvasContext.lineTo(points[j2].x, points[j2].y);
    canvasContext.stroke();
  };
  let runStart = 0;
  let runFront = points[0].z >= 0;
  for (let i2 = 1; i2 < points.length; i2++) {
    const isFront = points[i2].z >= 0;
    if (isFront !== runFront) {
      flush2(runStart, i2, runFront);
      runStart = i2 - 1;
      runFront = isFront;
    }
  }
  flush2(runStart, points.length, runFront);
  canvasContext.globalAlpha = 1;
}
function cameraScreenPos(horizontalAngle, verticalAngle, centerX, centerY, radius) {
  const horizontalRadians = horizontalAngle * RADIANS_PER_DEGREE;
  const verticalRadians = verticalAngle * RADIANS_PER_DEGREE;
  return {
    x: centerX + radius * Math.cos(verticalRadians) * Math.sin(horizontalRadians),
    y: centerY - radius * Math.sin(verticalRadians),
    z: Math.cos(verticalRadians) * Math.cos(horizontalRadians),
  };
}
export function CameraBall({
  camera,
  imageUrl,
  disabled: disabled2,
  onRotate,
  onUpload,
  t: translations,
}) {
  const canvasRef = reactExports.useRef(null);
  const [ballYaw, setBallYaw] = reactExports.useState(0);
  const [ballPitch, setBallPitch] = reactExports.useState(0);
  const [themeTick, setThemeTick] = reactExports.useState(0);
  const dragRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const observer2 = new MutationObserver(() => setThemeTick((previousThemeTick) => previousThemeTick + 1));
    observer2.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer2.disconnect();
  }, []);
  reactExports.useEffect(() => {
    if (!camera.presetId) return;
    setBallYaw(0);
    setBallPitch(0);
  }, [camera.presetId]);
  const centerX = CANVAS_SIZE / 2;
  const centerY = CANVAS_SIZE / 2;
  const photoSize = getPhotoSize(camera.zoom);
  reactExports.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasPixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(CANVAS_SIZE * canvasPixelRatio);
    canvas.height = Math.round(CANVAS_SIZE * canvasPixelRatio);
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) return;
    canvasContext.scale(canvasPixelRatio, canvasPixelRatio);
    canvasContext.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const themeRoot =
      canvas.closest(".multi-angle-theme") ?? document.documentElement;
    const rootStyle = getComputedStyle(themeRoot);
    const wireColor =
      rootStyle.getPropertyValue("--hl_wire_color").trim() ||
      "rgba(192,192,208,0.6)";
    const equatorColor =
      rootStyle.getPropertyValue("--hl_equator_color").trim() ||
      "rgba(192,192,208,0.8)";
    const rayColor =
      rootStyle.getPropertyValue("--hl_text_02").trim() || "rgba(20,22,31,0.7)";
    const yawRadians = ballYaw * RADIANS_PER_DEGREE;
    const pitch = ballPitch * RADIANS_PER_DEGREE;
    const STEPS = 64;
    canvasContext.lineWidth = 0.8;
    canvasContext.strokeStyle = wireColor;
    for (let i2 = 0; i2 < MERIDIANS; i2++) {
      const phase = (i2 / MERIDIANS) * Math.PI;
      const sinPhase = Math.sin(phase);
      const cosPhase = Math.cos(phase);
      const points = [];
      for (let stepIndex = 0; stepIndex <= STEPS; stepIndex++) {
        const theta = -Math.PI + (stepIndex / STEPS) * 2 * Math.PI;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        points.push(project(sinPhase * cosTheta, sinTheta, cosPhase * cosTheta, yawRadians, pitch, centerX, centerY, RADIUS));
      }
      strokeWithDepth(canvasContext, points, 0.72, 0.28);
    }
    for (let i2 = 1; i2 <= PARALLELS; i2++) {
      for (const sign of [1, -1]) {
        const latitude = sign * (i2 / (PARALLELS + 1)) * (Math.PI / 2);
        const sinLatitude = Math.sin(latitude);
        const cosLatitude = Math.cos(latitude);
        const points = [];
        for (let stepIndex = 0; stepIndex <= STEPS; stepIndex++) {
          const longitude = (stepIndex / STEPS) * 2 * Math.PI;
          points.push(
            project(
              cosLatitude * Math.sin(longitude),
              sinLatitude,
              cosLatitude * Math.cos(longitude),
              yawRadians,
              pitch,
              centerX,
              centerY,
              RADIUS,
            ),
          );
        }
        strokeWithDepth(canvasContext, points, 0.72, 0.28);
      }
    }
    canvasContext.strokeStyle = equatorColor;
    {
      const points = [];
      for (let stepIndex = 0; stepIndex <= STEPS; stepIndex++) {
        const longitude = (stepIndex / STEPS) * 2 * Math.PI;
        points.push(
          project(Math.sin(longitude), 0, Math.cos(longitude), yawRadians, pitch, centerX, centerY, RADIUS),
        );
      }
      strokeWithDepth(canvasContext, points, 0.6, 0.22);
    }
    const cameraPosition = cameraScreenPos(
      camera.horizontalAngle,
      camera.verticalAngle,
      centerX,
      centerY,
      RADIUS,
    );
    if (cameraPosition.z < 0) {
      canvasContext.strokeStyle = rayColor;
      canvasContext.globalAlpha = 0.2;
      canvasContext.lineWidth = 1.5;
      canvasContext.beginPath();
      canvasContext.moveTo(centerX, centerY);
      canvasContext.lineTo(cameraPosition.x, cameraPosition.y);
      canvasContext.stroke();
      canvasContext.globalAlpha = 1;
    }
  }, [camera, ballYaw, ballPitch, themeTick, centerX, centerY]);
  const applyDrag = reactExports.useCallback(
    (pointerEvent) => {
      const drag2 = dragRef.current;
      if (!drag2 || disabled2) return;
      const deltaX = pointerEvent.clientX - drag2.x;
      const deltaY = pointerEvent.clientY - drag2.y;
      const horizontalAngleDelta = (deltaX / (Math.PI * RADIUS)) * 180;
      const verticalAngleDelta = (-deltaY / (Math.PI * RADIUS)) * 180;
      if (Math.abs(horizontalAngleDelta) < 0.5 && Math.abs(verticalAngleDelta) < 0.5) return;
      drag2.x = pointerEvent.clientX;
      drag2.y = pointerEvent.clientY;
      const gridFollow = drag2.kind === "ball" ? 1 : CAMERA_GRID_FOLLOW;
      setBallYaw((previousYaw) => previousYaw + horizontalAngleDelta * gridFollow);
      setBallPitch((previousPitch) => Math.max(-85, Math.min(85, previousPitch + verticalAngleDelta * gridFollow)));
      onRotate(horizontalAngleDelta, verticalAngleDelta);
    },
    [disabled2, onRotate],
  );
  const handleBallPointerDown = (pointerEvent) => {
    if (disabled2) return;
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
    dragRef.current = {
      kind: "ball",
      x: pointerEvent.clientX,
      y: pointerEvent.clientY,
    };
  };
  const handleMarkerPointerDown = (pointerEvent) => {
    if (disabled2) return;
    pointerEvent.stopPropagation();
    const container = pointerEvent.currentTarget.closest("[data-camera-ball]");
    if (container instanceof HTMLElement)
      container.setPointerCapture(pointerEvent.pointerId);
    dragRef.current = {
      kind: "marker",
      x: pointerEvent.clientX,
      y: pointerEvent.clientY,
    };
  };
  const handlePointerUp = (pointerEvent) => {
    if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
      pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
    }
    dragRef.current = null;
  };
  const cameraPosition = cameraScreenPos(
    camera.horizontalAngle,
    camera.verticalAngle,
    centerX,
    centerY,
    RADIUS,
  );
  return (
    <div
      data-camera-ball={true}
      data-action-ui-id="canvas.multi-angle.camera-ball"
      className={
        disabled2
          ? "relative cursor-not-allowed opacity-60"
          : "relative cursor-grab active:cursor-grabbing"
      }
      style={{
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
      }}
      onPointerDown={handleBallPointerDown}
      onPointerMove={applyDrag}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
        }}
      />
      {cameraPosition.z >= 0 && (
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
          className="pointer-events-none absolute inset-0 z-[4] size-full"
        >
          <line
            x1={centerX}
            y1={centerY}
            x2={cameraPosition.x}
            y2={cameraPosition.y}
            stroke="var(--hl_text_02)"
            strokeWidth="1.5"
            opacity="0.9"
          />
        </svg>
      )}
      {(() => {
        const nearCenter =
          Math.abs(cameraPosition.x - centerX) < photoSize / 2 + 8 &&
          Math.abs(cameraPosition.y - centerY) < photoSize / 2 + 8;
        const isBehindOverlap =
          nearCenter && cameraPosition.z < 0 && !!imageUrl;
        if (nearCenter && !imageUrl) return null;
        return (
          <button
            type="button"
            aria-label={translations.adjust_section}
            onPointerDown={handleMarkerPointerDown}
            className="group absolute flex items-center justify-center transition-opacity"
            style={{
              left: cameraPosition.x,
              top: cameraPosition.y,
              width: MARKER_SIZE,
              height: MARKER_SIZE,
              transform: "translate(-50%, -50%)",
              opacity: isBehindOverlap ? 0.46 : 1,
              zIndex: cameraPosition.z >= 0 || isBehindOverlap ? 4 : 1,
              cursor: disabled2 ? "not-allowed" : "grab",
            }}
          >
            <div className="size-8 scale-[1.331]">
              <CameraModel3D
                horizontalAngle={camera.horizontalAngle}
                verticalAngle={camera.verticalAngle}
                className="size-8 transition-transform duration-150 ease-out group-hover:scale-105"
              />
            </div>
          </button>
        );
      })()}
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 z-[3] -translate-x-1/2 -translate-y-1/2 ${imageUrl ? "flex items-center justify-center" : ""}`}
        style={
          imageUrl
            ? {
                width: PHOTO_SIZE_MAX,
                height: PHOTO_SIZE_MAX,
              }
            : {
                width: UPLOAD_BTN_SIZE,
              }
        }
      >
        {imageUrl ? (
          <CenterImage imageUrl={imageUrl} size={photoSize} />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onUpload}
              onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
              className="border-hl_line_00 text-hl_text_03 hover:border-hl_brand_00 hover:text-hl_brand_00 bg-hl_bg_05 pointer-events-auto flex items-center justify-center rounded-[10px] border border-dashed transition-colors"
              style={{
                width: UPLOAD_BTN_SIZE,
                height: UPLOAD_BTN_SIZE,
              }}
            >
              <ToolUploadIcon />
            </button>
            <p className="text-hl_text_03 pointer-events-auto whitespace-nowrap text-xs">
              {translations.upload_prefix}
              <button
                type="button"
                onClick={onUpload}
                onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
                className="text-hl_text_00 underline"
              >
                {translations.upload_action}
              </button>
              {translations.upload_suffix}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
