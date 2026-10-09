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

const RADIUS$1 = 88;

const MERIDIANS$1 = 6;

const PARALLELS$1 = 4;

const PHOTO_SIZE_MIN = 44;

const PHOTO_SIZE_MEDIUM = 56;

const PHOTO_SIZE_MAX = 68;

const UPLOAD_BTN_SIZE = 56;

const MARKER_SIZE = 32;

const CAMERA_GRID_FOLLOW = 0.2;

const DEG$1 = Math.PI / 180;

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
    const img = imgRef.current;
    if (img?.complete) setLoadedUrl(imageUrl);
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

function project(lx, ly, lz, yaw, pitch, cx2, cy, r2) {
  const cP = Math.cos(pitch);
  const sP = Math.sin(pitch);
  const y1 = ly * cP + lz * sP;
  const z1 = -ly * sP + lz * cP;
  const cY = Math.cos(yaw);
  const sY = Math.sin(yaw);
  const x2 = lx * cY + z1 * sY;
  const z22 = -lx * sY + z1 * cY;
  return {
    x: cx2 + x2 * r2,
    y: cy - y1 * r2,
    z: z22,
  };
}

function strokeWithDepth(ctx, pts, frontAlpha, backAlpha) {
  const flush2 = (start2, end2, isFront) => {
    if (end2 - start2 < 2) return;
    ctx.globalAlpha = isFront ? frontAlpha : backAlpha;
    ctx.beginPath();
    ctx.moveTo(pts[start2].x, pts[start2].y);
    for (let j2 = start2 + 1; j2 < end2; j2++) ctx.lineTo(pts[j2].x, pts[j2].y);
    ctx.stroke();
  };
  let runStart = 0;
  let runFront = pts[0].z >= 0;
  for (let i2 = 1; i2 < pts.length; i2++) {
    const isFront = pts[i2].z >= 0;
    if (isFront !== runFront) {
      flush2(runStart, i2, runFront);
      runStart = i2 - 1;
      runFront = isFront;
    }
  }
  flush2(runStart, pts.length, runFront);
  ctx.globalAlpha = 1;
}

function cameraScreenPos(h2, v2, cx2, cy, r2) {
  const hr = h2 * DEG$1;
  const vr = v2 * DEG$1;
  return {
    x: cx2 + r2 * Math.cos(vr) * Math.sin(hr),
    y: cy - r2 * Math.sin(vr),
    z: Math.cos(vr) * Math.cos(hr),
  };
}

export function CameraBall({
  camera,
  imageUrl,
  disabled: disabled2,
  onRotate,
  onUpload,
  t: t2,
}) {
  const canvasRef = reactExports.useRef(null);
  const [ballYaw, setBallYaw] = reactExports.useState(0);
  const [ballPitch, setBallPitch] = reactExports.useState(0);
  const [themeTick, setThemeTick] = reactExports.useState(0);
  const dragRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const observer2 = new MutationObserver(() => setThemeTick((v2) => v2 + 1));
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
  const cx2 = CANVAS_SIZE / 2;
  const cy = CANVAS_SIZE / 2;
  const photoSize = getPhotoSize(camera.zoom);
  reactExports.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(CANVAS_SIZE * dpr);
    canvas.height = Math.round(CANVAS_SIZE * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
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
    const yaw = ballYaw * DEG$1;
    const pitch = ballPitch * DEG$1;
    const STEPS = 64;
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = wireColor;
    for (let i2 = 0; i2 < MERIDIANS$1; i2++) {
      const phase = (i2 / MERIDIANS$1) * Math.PI;
      const sPh = Math.sin(phase);
      const cPh = Math.cos(phase);
      const pts = [];
      for (let s2 = 0; s2 <= STEPS; s2++) {
        const theta = -Math.PI + (s2 / STEPS) * 2 * Math.PI;
        const cT = Math.cos(theta);
        const sT = Math.sin(theta);
        pts.push(
          project(sPh * cT, sT, cPh * cT, yaw, pitch, cx2, cy, RADIUS$1),
        );
      }
      strokeWithDepth(ctx, pts, 0.72, 0.28);
    }
    for (let i2 = 1; i2 <= PARALLELS$1; i2++) {
      for (const sign of [1, -1]) {
        const lat = sign * (i2 / (PARALLELS$1 + 1)) * (Math.PI / 2);
        const sL = Math.sin(lat);
        const cL = Math.cos(lat);
        const pts = [];
        for (let s2 = 0; s2 <= STEPS; s2++) {
          const lon = (s2 / STEPS) * 2 * Math.PI;
          pts.push(
            project(
              cL * Math.sin(lon),
              sL,
              cL * Math.cos(lon),
              yaw,
              pitch,
              cx2,
              cy,
              RADIUS$1,
            ),
          );
        }
        strokeWithDepth(ctx, pts, 0.72, 0.28);
      }
    }
    ctx.strokeStyle = equatorColor;
    {
      const pts = [];
      for (let s2 = 0; s2 <= STEPS; s2++) {
        const lon = (s2 / STEPS) * 2 * Math.PI;
        pts.push(
          project(
            Math.sin(lon),
            0,
            Math.cos(lon),
            yaw,
            pitch,
            cx2,
            cy,
            RADIUS$1,
          ),
        );
      }
      strokeWithDepth(ctx, pts, 0.6, 0.22);
    }
    const pos = cameraScreenPos(
      camera.horizontalAngle,
      camera.verticalAngle,
      cx2,
      cy,
      RADIUS$1,
    );
    if (pos.z < 0) {
      ctx.strokeStyle = rayColor;
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx2, cy);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }, [camera, ballYaw, ballPitch, themeTick, cx2, cy]);
  const applyDrag = reactExports.useCallback(
    (e2) => {
      const drag2 = dragRef.current;
      if (!drag2 || disabled2) return;
      const dx = e2.clientX - drag2.x;
      const dy = e2.clientY - drag2.y;
      const dh = (dx / (Math.PI * RADIUS$1)) * 180;
      const dv = (-dy / (Math.PI * RADIUS$1)) * 180;
      if (Math.abs(dh) < 0.5 && Math.abs(dv) < 0.5) return;
      drag2.x = e2.clientX;
      drag2.y = e2.clientY;
      const gridFollow = drag2.kind === "ball" ? 1 : CAMERA_GRID_FOLLOW;
      setBallYaw((v2) => v2 + dh * gridFollow);
      setBallPitch((v2) => Math.max(-85, Math.min(85, v2 + dv * gridFollow)));
      onRotate(dh, dv);
    },
    [disabled2, onRotate],
  );
  const handleBallPointerDown = (e2) => {
    if (disabled2) return;
    e2.currentTarget.setPointerCapture(e2.pointerId);
    dragRef.current = {
      kind: "ball",
      x: e2.clientX,
      y: e2.clientY,
    };
  };
  const handleMarkerPointerDown = (e2) => {
    if (disabled2) return;
    e2.stopPropagation();
    const container = e2.currentTarget.closest("[data-camera-ball]");
    if (container instanceof HTMLElement)
      container.setPointerCapture(e2.pointerId);
    dragRef.current = {
      kind: "marker",
      x: e2.clientX,
      y: e2.clientY,
    };
  };
  const handlePointerUp = (e2) => {
    if (e2.currentTarget.hasPointerCapture(e2.pointerId)) {
      e2.currentTarget.releasePointerCapture(e2.pointerId);
    }
    dragRef.current = null;
  };
  const cameraPosition = cameraScreenPos(
    camera.horizontalAngle,
    camera.verticalAngle,
    cx2,
    cy,
    RADIUS$1,
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
            x1={cx2}
            y1={cy}
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
          Math.abs(cameraPosition.x - cx2) < photoSize / 2 + 8 &&
          Math.abs(cameraPosition.y - cy) < photoSize / 2 + 8;
        const isBehindOverlap =
          nearCenter && cameraPosition.z < 0 && !!imageUrl;
        if (nearCenter && !imageUrl) return null;
        return (
          <button
            type="button"
            aria-label={t2.adjust_section}
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
              onPointerDown={(e2) => e2.stopPropagation()}
              className="border-hl_line_00 text-hl_text_03 hover:border-hl_brand_00 hover:text-hl_brand_00 bg-hl_bg_05 pointer-events-auto flex items-center justify-center rounded-[10px] border border-dashed transition-colors"
              style={{
                width: UPLOAD_BTN_SIZE,
                height: UPLOAD_BTN_SIZE,
              }}
            >
              <ToolUploadIcon />
            </button>
            <p className="text-hl_text_03 pointer-events-auto whitespace-nowrap text-xs">
              {t2.upload_prefix}
              <button
                type="button"
                onClick={onUpload}
                onPointerDown={(e2) => e2.stopPropagation()}
                className="text-hl_text_00 underline"
              >
                {t2.upload_action}
              </button>
              {t2.upload_suffix}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
