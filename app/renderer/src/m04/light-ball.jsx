// light-ball.jsx
import { jsxRuntimeExports, reactExports } from "../vendor.js";
import { Upload } from "../m15/parse-item.jsx";
import { Button$2 } from "../m01/use-media-node-actions.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  BACKDROP_GRADIENT_STOPS,
  CONE_LENGTH_RATIO,
  CONE_SHAPE,
  DEFAULT_COLOR_TEMP,
  EQUATOR_BACK_OPACITY,
  EQUATOR_FRONT_OPACITY,
  INTENSITY_MAX,
  INTENSITY_MIN,
  MARKER_HIT_SIZE,
  MERIDIANS,
  OPACITY_MAX,
  OPACITY_MIN,
  PARALLELS,
  PHOTO_HEIGHT,
  PHOTO_WIDTH,
  RADIUS,
  WIRE_BACK_OPACITY,
  WIRE_FRONT_OPACITY,
  kelvinToHex,
  normalizeHexColor,
  roundAngle,
} from "./backdrop-gradient-stops.jsx";
import { planeQuad } from "./camera-ball.jsx";
import {
  createBoxFaces,
  getCameraModelView,
  planeEllipse,
  pointsAttribute,
} from "./create-box-faces.jsx";
const BACKDROP_SVG_WIDTH = 280;
const BACKDROP_PATH =
  "M40 0H240V133.52C240 146.369 243.095 159.029 249.023 170.428L280 230H0L30.9774 170.428C36.9052 159.028 40 146.369 40 133.52V0Z";
const clamp$4 = (value, min2, max2) => Math.min(Math.max(value, min2), max2);
const intensityToOpacity = (intensity) => {
  const t2 = clamp$4((intensity - INTENSITY_MIN) / (INTENSITY_MAX - INTENSITY_MIN), 0, 1);
  return clamp$4(OPACITY_MIN + t2 * (OPACITY_MAX - OPACITY_MIN), 0, 1);
};
const resolveDisplayColor = (input) => {
  const rawColor = input.colorMode === "hex" ? input.color : kelvinToHex(input.colorTemp);
  const fallbackHex = kelvinToHex(DEFAULT_COLOR_TEMP);
  return normalizeHexColor(rawColor) ?? fallbackHex;
};
const computeConeVisualStyle = (input) => {
  const displayColor = resolveDisplayColor(input);
  const opacity = intensityToOpacity(input.intensity);
  return {
    displayColor,
    previewColor: displayColor,
    opacity,
  };
};
const IDENTITY = [0, 0, 0, 1];
const DEG = Math.PI / 180;
function sphericalPoint(horizontal, vertical, radius = RADIUS) {
  const h2 = horizontal * DEG;
  const v2 = vertical * DEG;
  return {
    x: radius * Math.cos(v2) * Math.sin(h2),
    y: radius * Math.sin(v2),
    z: radius * Math.cos(v2) * Math.cos(h2),
  };
}
function pointAngles(p3) {
  const r2 = Math.hypot(p3.x, p3.y, p3.z);
  return {
    horizontalAngle: Math.atan2(p3.x, p3.z) / DEG,
    verticalAngle: r2 ? Math.asin(Math.max(-1, Math.min(1, p3.y / r2))) / DEG : 0,
  };
}
function multiply(a2, b3) {
  const [x2, y4, z3, w3] = a2;
  const [u4, v2, t2, s2] = b3;
  const q2 = [
    w3 * u4 + x2 * s2 + y4 * t2 - z3 * v2,
    w3 * v2 - x2 * t2 + y4 * s2 + z3 * u4,
    w3 * t2 + x2 * v2 - y4 * u4 + z3 * s2,
    w3 * s2 - x2 * u4 - y4 * v2 - z3 * t2,
  ];
  const length2 = Math.hypot(...q2) || 1;
  return [q2[0] / length2, q2[1] / length2, q2[2] / length2, q2[3] / length2];
}
function dragRotation(q2, dx, dy, size2) {
  const factor = Math.PI / Math.max(1, size2) / 2;
  const yaw = [0, Math.sin(dx * factor), 0, Math.cos(dx * factor)];
  const pitch = [Math.sin(dy * factor), 0, 0, Math.cos(dy * factor)];
  return multiply(pitch, multiply(yaw, q2));
}
function rotate(p3, q2) {
  const [x2, y4, z3, w3] = q2;
  const tx = 2 * (y4 * p3.z - z3 * p3.y);
  const ty = 2 * (z3 * p3.x - x2 * p3.z);
  const tz = 2 * (x2 * p3.y - y4 * p3.x);
  return {
    x: p3.x + w3 * tx + y4 * tz - z3 * ty,
    y: p3.y + w3 * ty + z3 * tx - x2 * tz,
    z: p3.z + w3 * tz + x2 * ty - y4 * tx,
  };
}
const LIGHT_DRAG_DEG_PER_PX = 180 / (Math.PI * RADIUS);
function dragLightAngles(angles, dx, dy) {
  const horizontal = angles.horizontalAngle + dx * LIGHT_DRAG_DEG_PER_PX;
  return {
    id: angles.id,
    // 重打光的控件/提交约定是 -180…180，而多角度内部存储 0…360。
    horizontalAngle: ((((horizontal + 180) % 360) + 360) % 360) - 180,
    verticalAngle: Math.max(-90, Math.min(90, angles.verticalAngle - dy * LIGHT_DRAG_DEG_PER_PX)),
  };
}
const positionsKey = (items) =>
  items.map((l2) => `${l2.id}:${l2.horizontalAngle}:${l2.verticalAngle}`).join("|");
const bakeRotation = (items, q2) =>
  items.map((l2) => ({
    id: l2.id,
    ...pointAngles(rotate(sphericalPoint(l2.horizontalAngle, l2.verticalAngle), q2)),
  }));
const GRID = [
  ...Array.from(
    {
      length: MERIDIANS,
    },
    (_2, i2) => ({
      equator: false,
      points: Array.from(
        {
          length: 97,
        },
        (_22, j2) => sphericalPoint((i2 * 180) / MERIDIANS, (j2 * 360) / 96),
      ),
    }),
  ),
  ...Array.from(
    {
      length: PARALLELS * 2 + 1,
    },
    (_2, i2) => ({
      equator: i2 === PARALLELS,
      points: Array.from(
        {
          length: 97,
        },
        (_22, j2) => sphericalPoint((j2 * 360) / 96, ((i2 - PARALLELS) * 90) / (PARALLELS + 1)),
      ),
    }),
  ),
];
function gridPaths(q2, front, equator) {
  let path2 = "";
  for (const line of GRID) {
    if (line.equator !== equator) continue;
    const points = line.points.map((p3) => rotate(p3, q2));
    for (let i2 = 1; i2 < points.length; i2++) {
      const a2 = points[i2 - 1];
      const b3 = points[i2];
      if ((a2.z + b3.z) / 2 >= 0 !== front) continue;
      path2 += `M${a2.x.toFixed(2)},${(-a2.y).toFixed(2)}L${b3.x.toFixed(2)},${(-b3.y).toFixed(2)}`;
    }
  }
  return path2;
}
const LampModel3D = reactExports.memo(function LampModel3D2({
  horizontalAngle,
  verticalAngle,
  type: type2,
  color: color2,
}) {
  const model = reactExports.useMemo(() => {
    const view2 = getCameraModelView(horizontalAngle, verticalAngle);
    const isSpot = type2 === "spotlight";
    const width = isSpot ? 17 : 22;
    const height = isSpot ? 15 : 17;
    const depth2 = isSpot ? 15 : 7;
    const edge = "var(--hl_camera_edge, var(--border))";
    const fills = {
      front: "var(--hl_camera_body, var(--muted))",
      back: "var(--hl_camera_back, var(--muted))",
      left: "var(--hl_camera_side_dark, var(--muted))",
      right: "var(--hl_camera_side, var(--muted))",
      top: "var(--hl_camera_top_light, var(--muted))",
      bottom: "var(--hl_camera_bottom, var(--muted))",
    };
    const box2 = (key2, x2, y4, z3, sx, sy, sz) =>
      createBoxFaces({
        key: key2,
        center: {
          x: x2,
          y: y4,
          z: z3,
        },
        size: {
          x: sx,
          y: sy,
          z: sz,
        },
        basis: view2,
        fills,
        stroke: edge,
      });
    const body2 = box2("housing", 0, 0, 0, width, height, depth2);
    const bracketX = width / 2 + 2;
    const bracketY = -height / 2 - 2;
    const faces = [
      ...body2,
      ...box2("yoke-left", -bracketX, -2, 0, 2, height, 3),
      ...box2("yoke-right", bracketX, -2, 0, 2, height, 3),
      ...box2("yoke-base", 0, bracketY, 0, width + 6, 2, 3),
    ].sort((a2, b3) => a2.depth - b3.depth);
    const frontZ = depth2 / 2 + 0.1;
    const backZ = -depth2 / 2 - 0.1;
    const frontShape = (inset, z3) =>
      isSpot
        ? planeEllipse({
            center: {
              x: 0,
              y: 0,
              z: z3,
            },
            radius: height / 2 - inset,
            basis: view2,
          })
        : planeQuad(
            {
              x: 0,
              y: 0,
              z: z3,
            },
            width - inset * 2,
            height - inset * 2,
            view2,
          );
    return {
      faces,
      frontVisible: view2.frontVisibility > 0.01,
      backVisible: view2.backVisibility > 0.01,
      bezel: pointsAttribute(frontShape(1, frontZ)),
      emitter: pointsAttribute(frontShape(2.7, frontZ + 0.1)),
      backPanel: pointsAttribute(
        planeQuad(
          {
            x: 0,
            y: 0,
            z: backZ,
          },
          width - 5,
          height - 5,
          view2,
        ),
      ),
      vents: [-2, 0, 2].map((y4) =>
        pointsAttribute(
          planeQuad(
            {
              x: 0,
              y: y4,
              z: backZ - 0.1,
            },
            width - 8,
            0.7,
            view2,
          ),
        ),
      ),
    };
  }, [horizontalAngle, verticalAngle, type2]);
  return (
    <svg
      data-testid="relight-lamp-model"
      data-light-type={type2}
      data-horizontal-angle={horizontalAngle}
      data-vertical-angle={verticalAngle}
      aria-hidden="true"
      x={-18}
      y={-18}
      width={36}
      height={36}
      viewBox="0 0 40 40"
      overflow="visible"
      pointerEvents="none"
    >
      {model.faces.map((face) => (
        <polygon
          key={face.key}
          data-lamp-face={face.key}
          points={pointsAttribute(face.points)}
          fill={face.fill}
          stroke={face.stroke}
          strokeWidth={0.6}
          strokeLinejoin="round"
        />
      ))}
      {model.backVisible && (
        <g data-lamp-detail="back">
          <polygon points={model.backPanel} fill="var(--hl_camera_side_dark, var(--muted))" />
          {model.vents.map((points) => (
            <polygon
              key={points}
              points={points}
              fill="var(--hl_camera_screen, var(--foreground))"
            />
          ))}
        </g>
      )}
      {model.frontVisible && (
        <g data-lamp-detail="emitter">
          <polygon
            points={model.bezel}
            fill="var(--hl_camera_lens_dark, var(--muted))"
            stroke="var(--hl_camera_lens_base, var(--border))"
            strokeWidth={0.7}
          />
          <polygon
            points={model.emitter}
            fill={color2}
            stroke="var(--hl_camera_lens_base, var(--border))"
            strokeWidth={0.5}
          />
        </g>
      )}
    </svg>
  );
});
function coneOutline(position2, light) {
  const n2 = {
    x: position2.x / RADIUS,
    y: position2.y / RADIUS,
    z: position2.z / RADIUS,
  };
  const length2 = RADIUS * CONE_LENGTH_RATIO;
  const config2 = CONE_SHAPE[light.type];
  const sideLength = Math.hypot(n2.x, n2.z);
  const u4 =
    sideLength > 1e-3
      ? {
          x: n2.z / sideLength,
          y: 0,
          z: -n2.x / sideLength,
        }
      : {
          x: 1,
          y: 0,
          z: 0,
        };
  const v2 = {
    x: n2.y * u4.z - n2.z * u4.y,
    y: n2.z * u4.x - n2.x * u4.z,
  };
  const points = [];
  for (const end2 of [0, 1]) {
    const radius =
      length2 *
      (end2 ? config2.radiusInner : "radiusOuter" in config2 ? config2.radiusOuter : 0.018);
    const distance2 = end2 ? RADIUS - length2 : RADIUS;
    for (let i2 = 0; i2 < 16; i2++) {
      const a2 = (i2 * Math.PI) / 8;
      points.push({
        x: n2.x * distance2 + radius * (u4.x * Math.cos(a2) + v2.x * Math.sin(a2)),
        y: -(n2.y * distance2 + radius * (u4.y * Math.cos(a2) + v2.y * Math.sin(a2))),
      });
    }
  }
  points.sort((a2, b3) => a2.x - b3.x || a2.y - b3.y);
  const cross2 = (o2, a2, b3) => (a2.x - o2.x) * (b3.y - o2.y) - (a2.y - o2.y) * (b3.x - o2.x);
  const half = (list2) => {
    const result = [];
    for (const p3 of list2) {
      while (
        result.length > 1 &&
        cross2(result[result.length - 2], result[result.length - 1], p3) <= 0
      )
        result.pop();
      result.push(p3);
    }
    return result.slice(0, -1);
  };
  return [...half(points), ...half([...points].reverse())].map((p3) => `${p3.x},${p3.y}`).join(" ");
}
const positionEchoKeys = (items) => [
  positionsKey(items),
  positionsKey(
    items.map((item) => ({
      ...item,
      horizontalAngle: roundAngle(item.horizontalAngle),
      verticalAngle: roundAngle(item.verticalAngle),
    })),
  ),
];
export const LightBall = (props) => {
  const {
    lights,
    activeLightId,
    imageUrl,
    isInteractionDisabled,
    onUploadClick,
    studioMode = "default",
    translate: translate2,
  } = props;
  const svgRef = reactExports.useRef(null);
  const latest2 = reactExports.useRef(props);
  latest2.current = props;
  const drag2 = reactExports.useRef(null);
  const frame2 = reactExports.useRef(null);
  const persisted = reactExports.useRef(IDENTITY);
  const pendingEchoes = reactExports.useRef([]);
  const [preview, setPreview] = reactExports.useState(null);
  const [orientation, setOrientation] = reactExports.useState(IDENTITY);
  const key2 = positionsKey(lights);
  const gradientId = reactExports.useId();
  const stop = reactExports.useCallback(() => {
    const current2 = drag2.current;
    drag2.current = null;
    if (frame2.current !== null) cancelAnimationFrame(frame2.current);
    frame2.current = null;
    if (current2?.element.hasPointerCapture(current2.pointerId))
      current2.element.releasePointerCapture(current2.pointerId);
  }, []);
  reactExports.useEffect(() => () => stop(), [stop]);
  reactExports.useEffect(() => {
    const pending2 = pendingEchoes.current;
    for (let i2 = pending2.length - 1; i2 >= 0; i2--) {
      if (pending2[i2].includes(key2)) {
        pending2.splice(0, i2 + 1);
        return;
      }
    }
    pendingEchoes.current = [];
    stop();
    persisted.current = IDENTITY;
    setOrientation(IDENTITY);
    setPreview(null);
  }, [key2, stop]);
  reactExports.useEffect(() => {
    if (!isInteractionDisabled) return;
    stop();
    setPreview(null);
    setOrientation(persisted.current);
  }, [isInteractionDisabled, stop]);
  const localPointer = (event) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect)
      return {
        x: 0,
        y: 0,
        size: 212,
      };
    const width = svgRef.current?.clientWidth || rect.width || 1;
    const height = svgRef.current?.clientHeight || rect.height || 1;
    return {
      x: ((event.clientX - rect.left) * width) / (rect.width || 1) - width / 2,
      y: ((event.clientY - rect.top) * height) / (rect.height || 1) - height / 2,
      size: Math.min(width, height),
    };
  };
  const begin = (event, light) => {
    event.stopPropagation();
    if (isInteractionDisabled || event.button !== 0 || drag2.current || !svgRef.current) return;
    event.preventDefault();
    const p3 = localPointer(event);
    drag2.current = {
      element: svgRef.current,
      pointerId: event.pointerId,
      startX: p3.x,
      startY: p3.y,
      lastX: p3.x,
      lastY: p3.y,
      moved: false,
      rotation: IDENTITY,
      items: lights,
      angles: light
        ? {
            id: light.id,
            horizontalAngle: light.horizontalAngle,
            verticalAngle: light.verticalAngle,
          }
        : void 0,
    };
    svgRef.current?.setPointerCapture(event.pointerId);
    if (light) latest2.current.onSelectActiveLight?.(light.id);
  };
  const update2 = (event) => {
    const current2 = drag2.current;
    if (
      !current2 ||
      current2.pointerId !== event.pointerId ||
      latest2.current.isInteractionDisabled
    )
      return;
    const p3 = localPointer(event);
    if (!current2.moved && Math.hypot(p3.x - current2.startX, p3.y - current2.startY) < 3) return;
    current2.moved = true;
    if (current2.angles) {
      current2.angles = dragLightAngles(
        current2.angles,
        p3.x - current2.lastX,
        p3.y - current2.lastY,
      );
    } else {
      current2.rotation = dragRotation(
        current2.rotation,
        p3.x - current2.lastX,
        p3.y - current2.lastY,
        p3.size,
      );
    }
    current2.lastX = p3.x;
    current2.lastY = p3.y;
  };
  const rememberEcho = (items) => {
    const keys2 = positionEchoKeys(items);
    const pending2 = pendingEchoes.current;
    const last2 = pending2[pending2.length - 1];
    if (!last2 || last2[0] !== keys2[0] || last2[1] !== keys2[1]) pending2.push(keys2);
  };
  const draw = () => {
    frame2.current = null;
    const current2 = drag2.current;
    if (!current2?.moved) return;
    if (current2.angles) {
      const angles = current2.angles;
      rememberEcho(
        latest2.current.lights.map((l2) =>
          l2.id === angles.id
            ? {
                ...l2,
                ...angles,
              }
            : l2,
        ),
      );
      latest2.current.onBakeLights([angles]);
      setPreview({
        rotation: IDENTITY,
        items: current2.items.map((l2) =>
          l2.id === angles.id
            ? {
                ...l2,
                ...angles,
              }
            : l2,
        ),
      });
    } else {
      setPreview({
        rotation: current2.rotation,
        items: current2.items,
      });
      setOrientation(multiply(current2.rotation, persisted.current));
    }
  };
  const move = (event) => {
    update2(event);
    if (drag2.current?.moved && frame2.current === null)
      frame2.current = requestAnimationFrame(draw);
  };
  const finish = (event, cancelled = false) => {
    const current2 = drag2.current;
    if (!current2 || current2.pointerId !== event.pointerId) return;
    if (!cancelled) update2(event);
    if (!cancelled && current2.moved && !latest2.current.isInteractionDisabled) {
      if (current2.angles) {
        const angles = current2.angles;
        rememberEcho(
          latest2.current.lights.map((l2) =>
            l2.id === angles.id
              ? {
                  ...l2,
                  ...angles,
                }
              : l2,
          ),
        );
        latest2.current.onBakeLights([angles]);
      } else {
        const results = bakeRotation(current2.items, current2.rotation);
        persisted.current = multiply(current2.rotation, persisted.current);
        rememberEcho(results);
        latest2.current.onBakeLights(results);
      }
    }
    stop();
    setPreview(null);
    setOrientation(persisted.current);
  };
  const paths = reactExports.useMemo(
    () => ({
      back: gridPaths(orientation, false, false),
      front: gridPaths(orientation, true, false),
      backEquator: gridPaths(orientation, false, true),
      frontEquator: gridPaths(orientation, true, true),
    }),
    [orientation],
  );
  const displayed = lights
    .map((light) => {
      const angles = preview?.items.find((item) => item.id === light.id) ?? light;
      const position2 = rotate(
        sphericalPoint(angles.horizontalAngle, angles.verticalAngle),
        preview?.rotation ?? IDENTITY,
      );
      return {
        light,
        position: position2,
        behindPhoto:
          Boolean(imageUrl) &&
          position2.z < 0 &&
          Math.abs(position2.x) < (PHOTO_WIDTH + MARKER_HIT_SIZE) / 2 &&
          Math.abs(position2.y) < (PHOTO_HEIGHT + MARKER_HIT_SIZE) / 2,
      };
    })
    .sort((a2, b3) => a2.position.z - b3.position.z);
  const renderLights = (front, overlay = false) =>
    displayed
      .filter(
        ({ position: position2, behindPhoto }) =>
          position2.z >= 0 === front && (!overlay || behindPhoto),
      )
      .map(({ light, position: position2, behindPhoto }) => {
        const visual = computeConeVisualStyle(light);
        const modelAngles = pointAngles(position2);
        return (
          <g
            key={light.id}
            data-light-id={light.id}
            data-hemisphere={front ? "front" : "back"}
            data-light-overlay={overlay || void 0}
          >
            {!overlay && (
              <polygon
                points={coneOutline(position2, light)}
                fill={visual.previewColor}
                pointerEvents="none"
                style={{
                  filter: "brightness(var(--hl_relight_cone_brightness, 1))",
                  opacity: `calc(${visual.opacity} * var(--hl_relight_cone_opacity_multiplier, 1))`,
                }}
              />
            )}
            {(!behindPhoto || overlay) && (
              <>
                <g
                  transform={`translate(${position2.x},${-position2.y})`}
                  role="button"
                  tabIndex={isInteractionDisabled ? -1 : 0}
                  aria-label={light.id}
                  aria-pressed={light.id === activeLightId}
                  aria-disabled={isInteractionDisabled}
                  className="outline-none focus-visible:stroke-foreground"
                  onPointerDown={(event) => begin(event, light)}
                  onKeyDown={(event) => {
                    if (isInteractionDisabled || (event.key !== "Enter" && event.key !== " "))
                      return;
                    event.preventDefault();
                    event.stopPropagation();
                    latest2.current.onSelectActiveLight?.(light.id);
                  }}
                >
                  <rect
                    x={-MARKER_HIT_SIZE / 2}
                    y={-MARKER_HIT_SIZE / 2}
                    width={MARKER_HIT_SIZE}
                    height={MARKER_HIT_SIZE}
                    fill="transparent"
                  />
                  <g opacity={overlay ? 0.46 : front ? 1 : 0.65}>
                    <LampModel3D {...modelAngles} type={light.type} color={visual.previewColor} />
                  </g>
                </g>
              </>
            )}
          </g>
        );
      });
  const backdropScale = (RADIUS * 2.6) / BACKDROP_SVG_WIDTH;
  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      data-testid="relight-light-ball"
      aria-label={translate2("subtab_lighting")}
      className={`overflow-visible touch-none select-none ${isInteractionDisabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
      onPointerDown={(event) => begin(event)}
      onPointerMove={move}
      onPointerUp={(event) => finish(event)}
      onPointerCancel={(event) => finish(event, true)}
      onLostPointerCapture={(event) => finish(event, true)}
    >
      <title>{translate2("subtab_lighting")}</title>
      <svg x="50%" y="50%" width="1" height="1" overflow="visible">
        <title>{translate2("subtab_lighting")}</title>
        {studioMode !== "default" && (
          <g
            pointerEvents="none"
            transform={`translate(${(-BACKDROP_SVG_WIDTH * backdropScale) / 2},${(-230 * backdropScale) / 2}) scale(${backdropScale})`}
          >
            <defs>
              <linearGradient
                id={gradientId}
                gradientUnits="userSpaceOnUse"
                x1="140"
                y1="20"
                x2="140"
                y2="220"
              >
                {BACKDROP_GRADIENT_STOPS[studioMode].map((stop2, i2) => (
                  <stop
                    key={stop2.offset ?? i2}
                    offset={stop2.offset ?? "0"}
                    stopColor={stop2.color}
                    stopOpacity={stop2.opacity ?? "1"}
                  />
                ))}
              </linearGradient>
            </defs>
            <path d={BACKDROP_PATH} fill={`url(#${gradientId})`} />
          </g>
        )}
        <g
          fill="none"
          stroke="var(--hl_wire_color, var(--border))"
          strokeWidth={0.5}
          pointerEvents="none"
        >
          <path d={paths.back} opacity={WIRE_BACK_OPACITY} />
          <path d={paths.backEquator} opacity={EQUATOR_BACK_OPACITY} />
        </g>
        {renderLights(false)}
        <g
          fill="none"
          stroke="var(--hl_wire_color, var(--border))"
          strokeWidth={0.5}
          pointerEvents="none"
        >
          <path d={paths.front} opacity={WIRE_FRONT_OPACITY} />
          <path d={paths.frontEquator} opacity={EQUATOR_FRONT_OPACITY} />
        </g>
        {imageUrl && (
          <foreignObject
            x={-PHOTO_WIDTH / 2}
            y={-PHOTO_HEIGHT / 2}
            width={PHOTO_WIDTH}
            height={PHOTO_HEIGHT}
            pointerEvents="all"
          >
            <div className="flex h-full w-full items-center justify-center">
              <img
                key={imageUrl}
                src={imageUrl}
                alt=""
                draggable={false}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            </div>
          </foreignObject>
        )}
        {renderLights(false, true)}
        {renderLights(true)}
        {!imageUrl && !isInteractionDisabled && (
          <foreignObject x={-90} y={-28} width={180} height={88}>
            <div
              className="flex flex-col items-center gap-2"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Button$2
                variant="outline"
                className="h-14 w-14 border-dashed bg-muted text-muted-foreground"
                onClick={onUploadClick}
                aria-label={translate2("upload_image_caption")}
              >
                <Upload className="h-5 w-5" strokeWidth={1.5} />
              </Button$2>
              <p className="whitespace-nowrap text-xs text-muted-foreground">
                {translate2("upload_image_caption")}
              </p>
            </div>
          </foreignObject>
        )}
      </svg>
    </svg>
  );
};
