// light-ball.jsx
import { kelvinToHex, roundAngle } from "./color-stops.js";
import { jsxRuntimeExports, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { planeQuad } from "./plane-quad.jsx";
import { createBoxFaces } from "./create-box-faces.js";
import {
  getCameraModelView,
  planeEllipse,
  pointsAttribute,
} from "./layer-decompose-prompt.jsx";
import { Upload } from "./package.jsx";
import { Button } from "../canvas/node-shell-inner.jsx";
const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const normalizeHexColor = (hex) => {
  if (!HEX_COLOR_REGEX.test(hex)) return null;
  const lower = hex.toLowerCase();
  if (lower.length === 7) return lower;
  const [, redHexDigit, greenHexDigit, blueHexDigit] = lower;
  return `#${redHexDigit}${redHexDigit}${greenHexDigit}${greenHexDigit}${blueHexDigit}${blueHexDigit}`;
};
const DEFAULT_COLOR_TEMP = 6500;
const RADIUS = 88;
const MERIDIANS = 6;
const PARALLELS = 4;
const WIRE_FRONT_OPACITY = 0.72;
const WIRE_BACK_OPACITY = 0.28;
const EQUATOR_FRONT_OPACITY = 0.6;
const EQUATOR_BACK_OPACITY = 0.22;
const MARKER_HIT_SIZE = 32;
const PHOTO_WIDTH = 56;
const PHOTO_HEIGHT = 56;
const INTENSITY_MIN = 10;
const INTENSITY_MAX = 100;
const OPACITY_MIN = 0.1;
const OPACITY_MAX = 0.6;
const CONE_LENGTH_RATIO = 0.85;
const CONE_SHAPE = {
  spotlight: {
    radiusInner: 0.12,
    radiusOuter: 0.018,
  },
  rectAreaLight: {
    radiusInner: 0.22,
    radiusOuter: 0.033,
  },
  directionalLight: {
    radiusInner: 0.6,
    radiusOuter: 0.09,
  },
};
const BACKDROP_GRADIENT_STOPS = {
  black: [
    {
      color: "#C7C7C7",
      opacity: "0",
    },
    {
      offset: "0.129808",
      color: "#C7C7C7",
      opacity: "0.8",
    },
    {
      offset: "0.649038",
      color: "#383838",
      opacity: "0.8",
    },
    {
      offset: "0.884615",
      color: "#8C8C8C",
      opacity: "0.8",
    },
    {
      offset: "1",
      color: "#8C8C8C",
      opacity: "0",
    },
  ],
  white: [
    {
      color: "white",
      opacity: "0",
    },
    {
      offset: "0.149038",
      color: "white",
    },
    {
      offset: "0.367644",
      color: "white",
    },
    {
      offset: "0.649038",
      color: "#E1E1E1",
    },
    {
      offset: "0.781949",
      color: "white",
    },
    {
      offset: "0.894231",
      color: "white",
    },
    {
      offset: "1",
      color: "white",
      opacity: "0",
    },
  ],
};
const BACKDROP_SVG_WIDTH = 280;
const BACKDROP_PATH =
  "M40 0H240V133.52C240 146.369 243.095 159.029 249.023 170.428L280 230H0L30.9774 170.428C36.9052 159.028 40 146.369 40 133.52V0Z";
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const intensityToOpacity = (intensity) => {
  const intensityFraction = clamp(
    (intensity - INTENSITY_MIN) / (INTENSITY_MAX - INTENSITY_MIN),
    0,
    1,
  );
  return clamp(OPACITY_MIN + intensityFraction * (OPACITY_MAX - OPACITY_MIN), 0, 1);
};
const resolveDisplayColor = (input) => {
  const rawColor =
    input.colorMode === "hex" ? input.color : kelvinToHex(input.colorTemp);
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
const RADIANS_PER_DEGREE = Math.PI / 180;
function sphericalPoint(horizontal, vertical, radius = RADIUS) {
  const horizontalRadians = horizontal * RADIANS_PER_DEGREE;
  const verticalRadians = vertical * RADIANS_PER_DEGREE;
  return {
    x: radius * Math.cos(verticalRadians) * Math.sin(horizontalRadians),
    y: radius * Math.sin(verticalRadians),
    z: radius * Math.cos(verticalRadians) * Math.cos(horizontalRadians),
  };
}
function pointAngles(point) {
  const distanceFromOrigin = Math.hypot(point.x, point.y, point.z);
  return {
    horizontalAngle: Math.atan2(point.x, point.z) / RADIANS_PER_DEGREE,
    verticalAngle: distanceFromOrigin
      ? Math.asin(Math.max(-1, Math.min(1, point.y / distanceFromOrigin))) / RADIANS_PER_DEGREE
      : 0,
  };
}
function multiply(leftQuaternion, rightQuaternion) {
  const [leftX, leftY, leftZ, leftW] = leftQuaternion;
  const [rightX, rightY, rightZ, rightW] = rightQuaternion;
  const resultQuaternion = [
    leftW * rightX + leftX * rightW + leftY * rightZ - leftZ * rightY,
    leftW * rightY - leftX * rightZ + leftY * rightW + leftZ * rightX,
    leftW * rightZ + leftX * rightY - leftY * rightX + leftZ * rightW,
    leftW * rightW - leftX * rightX - leftY * rightY - leftZ * rightZ,
  ];
  const quaternionMagnitude = Math.hypot(...resultQuaternion) || 1;
  return [resultQuaternion[0] / quaternionMagnitude, resultQuaternion[1] / quaternionMagnitude, resultQuaternion[2] / quaternionMagnitude, resultQuaternion[3] / quaternionMagnitude];
}
function dragRotation(currentRotation, deltaX, deltaY, size) {
  const factor = Math.PI / Math.max(1, size) / 2;
  const yawRotation = [0, Math.sin(deltaX * factor), 0, Math.cos(deltaX * factor)];
  const pitch = [Math.sin(deltaY * factor), 0, 0, Math.cos(deltaY * factor)];
  return multiply(pitch, multiply(yawRotation, currentRotation));
}
function rotate(point, rotation) {
  const [quaternionX, quaternionY, quaternionZ, quaternionW] = rotation;
  const rotationOffsetX = 2 * (quaternionY * point.z - quaternionZ * point.y);
  const rotationOffsetY = 2 * (quaternionZ * point.x - quaternionX * point.z);
  const rotationOffsetZ = 2 * (quaternionX * point.y - quaternionY * point.x);
  return {
    x: point.x + quaternionW * rotationOffsetX + quaternionY * rotationOffsetZ - quaternionZ * rotationOffsetY,
    y: point.y + quaternionW * rotationOffsetY + quaternionZ * rotationOffsetX - quaternionX * rotationOffsetZ,
    z: point.z + quaternionW * rotationOffsetZ + quaternionX * rotationOffsetY - quaternionY * rotationOffsetX,
  };
}
const LIGHT_DRAG_DEG_PER_PX = 180 / (Math.PI * RADIUS);
function dragLightAngles(angles, deltaX, deltaY) {
  const horizontal = angles.horizontalAngle + deltaX * LIGHT_DRAG_DEG_PER_PX;
  return {
    id: angles.id,
    // 重打光的控件/提交约定是 -180…180，而多角度内部存储 0…360。
    horizontalAngle: ((((horizontal + 180) % 360) + 360) % 360) - 180,
    verticalAngle: Math.max(
      -90,
      Math.min(90, angles.verticalAngle - deltaY * LIGHT_DRAG_DEG_PER_PX),
    ),
  };
}
const positionsKey = (items) =>
  items
    .map((light) => `${light.id}:${light.horizontalAngle}:${light.verticalAngle}`)
    .join("|");
const bakeRotation = (items, rotation) =>
  items.map((light) => ({
    id: light.id,
    ...pointAngles(
      rotate(sphericalPoint(light.horizontalAngle, light.verticalAngle), rotation),
    ),
  }));
const GRID = [
  ...Array.from(
    {
      length: MERIDIANS,
    },
    (_unusedValue, i2) => ({
      equator: false,
      points: Array.from(
        {
          length: 97,
        },
        (_unusedValue, j2) => sphericalPoint((i2 * 180) / MERIDIANS, (j2 * 360) / 96),
      ),
    }),
  ),
  ...Array.from(
    {
      length: PARALLELS * 2 + 1,
    },
    (_unusedValue, i2) => ({
      equator: i2 === PARALLELS,
      points: Array.from(
        {
          length: 97,
        },
        (_unusedValue, j2) =>
          sphericalPoint(
            (j2 * 360) / 96,
            ((i2 - PARALLELS) * 90) / (PARALLELS + 1),
          ),
      ),
    }),
  ),
];
function gridPaths(rotation, front, equator) {
  let path = "";
  for (const line of GRID) {
    if (line.equator !== equator) continue;
    const points = line.points.map((point) => rotate(point, rotation));
    for (let i2 = 1; i2 < points.length; i2++) {
      const startPoint = points[i2 - 1];
      const endPoint = points[i2];
      if ((startPoint.z + endPoint.z) / 2 >= 0 !== front) continue;
      path += `M${startPoint.x.toFixed(2)},${(-startPoint.y).toFixed(2)}L${endPoint.x.toFixed(2)},${(-endPoint.y).toFixed(2)}`;
    }
  }
  return path;
}
const LampModel3D = reactExports.memo(function LampModel3DComponent({
  horizontalAngle,
  verticalAngle,
  type,
  color,
}) {
  const model = reactExports.useMemo(() => {
    const view = getCameraModelView(horizontalAngle, verticalAngle);
    const isSpot = type === "spotlight";
    const width = isSpot ? 17 : 22;
    const height = isSpot ? 15 : 17;
    const modelDepth = isSpot ? 15 : 7;
    const edge = "var(--hl_camera_edge, var(--border))";
    const fills = {
      front: "var(--hl_camera_body, var(--muted))",
      back: "var(--hl_camera_back, var(--muted))",
      left: "var(--hl_camera_side_dark, var(--muted))",
      right: "var(--hl_camera_side, var(--muted))",
      top: "var(--hl_camera_top_light, var(--muted))",
      bottom: "var(--hl_camera_bottom, var(--muted))",
    };
    const box = (key, centerX, centerY, centerZ, sizeX, sizeY, sizeZ) =>
      createBoxFaces({
        key,
        center: {
          x: centerX,
          y: centerY,
          z: centerZ,
        },
        size: {
          x: sizeX,
          y: sizeY,
          z: sizeZ,
        },
        basis: view,
        fills,
        stroke: edge,
      });
    const body = box("housing", 0, 0, 0, width, height, modelDepth);
    const bracketX = width / 2 + 2;
    const bracketY = -height / 2 - 2;
    const faces = [
      ...body,
      ...box("yoke-left", -bracketX, -2, 0, 2, height, 3),
      ...box("yoke-right", bracketX, -2, 0, 2, height, 3),
      ...box("yoke-base", 0, bracketY, 0, width + 6, 2, 3),
    ].sort((firstFace, secondFace) => firstFace.depth - secondFace.depth);
    const frontZ = modelDepth / 2 + 0.1;
    const backZ = -modelDepth / 2 - 0.1;
    const frontShape = (inset, depth) =>
      isSpot
        ? planeEllipse({
            center: {
              x: 0,
              y: 0,
              z: depth,
            },
            radius: height / 2 - inset,
            basis: view,
          })
        : planeQuad(
            {
              x: 0,
              y: 0,
              z: depth,
            },
            width - inset * 2,
            height - inset * 2,
            view,
          );
    return {
      faces,
      frontVisible: view.frontVisibility > 0.01,
      backVisible: view.backVisibility > 0.01,
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
          view,
        ),
      ),
      vents: [-2, 0, 2].map((verticalOffset) =>
        pointsAttribute(
          planeQuad(
            {
              x: 0,
              y: verticalOffset,
              z: backZ - 0.1,
            },
            width - 8,
            0.7,
            view,
          ),
        ),
      ),
    };
  }, [horizontalAngle, verticalAngle, type]);
  return (
    <svg
      data-testid="relight-lamp-model"
      data-light-type={type}
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
          <polygon
            points={model.backPanel}
            fill="var(--hl_camera_side_dark, var(--muted))"
          />
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
            fill={color}
            stroke="var(--hl_camera_lens_base, var(--border))"
            strokeWidth={0.5}
          />
        </g>
      )}
    </svg>
  );
});
function coneOutline(position, light) {
  const lightDirection = {
    x: position.x / RADIUS,
    y: position.y / RADIUS,
    z: position.z / RADIUS,
  };
  const coneLength = RADIUS * CONE_LENGTH_RATIO;
  const config = CONE_SHAPE[light.type];
  const sideLength = Math.hypot(lightDirection.x, lightDirection.z);
  const tangent =
    sideLength > 1e-3
      ? {
          x: lightDirection.z / sideLength,
          y: 0,
          z: -lightDirection.x / sideLength,
        }
      : {
          x: 1,
          y: 0,
          z: 0,
        };
  const bitangent = {
    x: lightDirection.y * tangent.z - lightDirection.z * tangent.y,
    y: lightDirection.z * tangent.x - lightDirection.x * tangent.z,
  };
  const points = [];
  for (const end of [0, 1]) {
    const radius =
      coneLength *
      (end
        ? config.radiusInner
        : "radiusOuter" in config
          ? config.radiusOuter
          : 0.018);
    const distance = end ? RADIUS - coneLength : RADIUS;
    for (let i2 = 0; i2 < 16; i2++) {
      const angle = (i2 * Math.PI) / 8;
      points.push({
        x:
          lightDirection.x * distance +
          radius * (tangent.x * Math.cos(angle) + bitangent.x * Math.sin(angle)),
        y: -(
          lightDirection.y * distance +
          radius * (tangent.y * Math.cos(angle) + bitangent.y * Math.sin(angle))
        ),
      });
    }
  }
  points.sort((firstPoint, secondPoint) => firstPoint.x - secondPoint.x || firstPoint.y - secondPoint.y);
  const cross = (originPoint, firstPoint, secondPoint) =>
    (firstPoint.x - originPoint.x) * (secondPoint.y - originPoint.y) - (firstPoint.y - originPoint.y) * (secondPoint.x - originPoint.x);
  const half = (list) => {
    const result = [];
    for (const point of list) {
      while (
        result.length > 1 &&
        cross(result[result.length - 2], result[result.length - 1], point) <= 0
      )
        result.pop();
      result.push(point);
    }
    return result.slice(0, -1);
  };
  return [...half(points), ...half([...points].reverse())]
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
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
    translate,
  } = props;
  const svgRef = reactExports.useRef(null);
  const latest = reactExports.useRef(props);
  latest.current = props;
  const drag = reactExports.useRef(null);
  const frame = reactExports.useRef(null);
  const persisted = reactExports.useRef(IDENTITY);
  const pendingEchoes = reactExports.useRef([]);
  const [preview, setPreview] = reactExports.useState(null);
  const [orientation, setOrientation] = reactExports.useState(IDENTITY);
  const key = positionsKey(lights);
  const gradientId = reactExports.useId();
  const stop = reactExports.useCallback(() => {
    const current = drag.current;
    drag.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    if (current?.element.hasPointerCapture(current.pointerId))
      current.element.releasePointerCapture(current.pointerId);
  }, []);
  reactExports.useEffect(() => () => stop(), [stop]);
  reactExports.useEffect(() => {
    const pending = pendingEchoes.current;
    for (let i2 = pending.length - 1; i2 >= 0; i2--) {
      if (pending[i2].includes(key)) {
        pending.splice(0, i2 + 1);
        return;
      }
    }
    pendingEchoes.current = [];
    stop();
    persisted.current = IDENTITY;
    setOrientation(IDENTITY);
    setPreview(null);
  }, [key, stop]);
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
      y:
        ((event.clientY - rect.top) * height) / (rect.height || 1) - height / 2,
      size: Math.min(width, height),
    };
  };
  const begin = (event, light) => {
    event.stopPropagation();
    if (
      isInteractionDisabled ||
      event.button !== 0 ||
      drag.current ||
      !svgRef.current
    )
      return;
    event.preventDefault();
    const pointerPosition = localPointer(event);
    drag.current = {
      element: svgRef.current,
      pointerId: event.pointerId,
      startX: pointerPosition.x,
      startY: pointerPosition.y,
      lastX: pointerPosition.x,
      lastY: pointerPosition.y,
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
    if (light) latest.current.onSelectActiveLight?.(light.id);
  };
  const update = (event) => {
    const current = drag.current;
    if (
      !current ||
      current.pointerId !== event.pointerId ||
      latest.current.isInteractionDisabled
    )
      return;
    const pointerPosition = localPointer(event);
    if (
      !current.moved &&
      Math.hypot(pointerPosition.x - current.startX, pointerPosition.y - current.startY) < 3
    )
      return;
    current.moved = true;
    if (current.angles) {
      current.angles = dragLightAngles(
        current.angles,
        pointerPosition.x - current.lastX,
        pointerPosition.y - current.lastY,
      );
    } else {
      current.rotation = dragRotation(
        current.rotation,
        pointerPosition.x - current.lastX,
        pointerPosition.y - current.lastY,
        pointerPosition.size,
      );
    }
    current.lastX = pointerPosition.x;
    current.lastY = pointerPosition.y;
  };
  const rememberEcho = (items) => {
    const keys = positionEchoKeys(items);
    const pending = pendingEchoes.current;
    const last = pending[pending.length - 1];
    if (!last || last[0] !== keys[0] || last[1] !== keys[1])
      pending.push(keys);
  };
  const draw = () => {
    frame.current = null;
    const current = drag.current;
    if (!current?.moved) return;
    if (current.angles) {
      const angles = current.angles;
      rememberEcho(
        latest.current.lights.map((light) =>
          light.id === angles.id
            ? {
                ...light,
                ...angles,
              }
            : light,
        ),
      );
      latest.current.onBakeLights([angles]);
      setPreview({
        rotation: IDENTITY,
        items: current.items.map((light) =>
          light.id === angles.id
            ? {
                ...light,
                ...angles,
              }
            : light,
        ),
      });
    } else {
      setPreview({
        rotation: current.rotation,
        items: current.items,
      });
      setOrientation(multiply(current.rotation, persisted.current));
    }
  };
  const move = (event) => {
    update(event);
    if (drag.current?.moved && frame.current === null)
      frame.current = requestAnimationFrame(draw);
  };
  const finish = (event, cancelled = false) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (!cancelled) update(event);
    if (
      !cancelled &&
      current.moved &&
      !latest.current.isInteractionDisabled
    ) {
      if (current.angles) {
        const angles = current.angles;
        rememberEcho(
          latest.current.lights.map((light) =>
            light.id === angles.id
              ? {
                  ...light,
                  ...angles,
                }
              : light,
          ),
        );
        latest.current.onBakeLights([angles]);
      } else {
        const results = bakeRotation(current.items, current.rotation);
        persisted.current = multiply(current.rotation, persisted.current);
        rememberEcho(results);
        latest.current.onBakeLights(results);
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
      const angles =
        preview?.items.find((item) => item.id === light.id) ?? light;
      const position = rotate(
        sphericalPoint(angles.horizontalAngle, angles.verticalAngle),
        preview?.rotation ?? IDENTITY,
      );
      return {
        light,
        position,
        behindPhoto:
          Boolean(imageUrl) &&
          position.z < 0 &&
          Math.abs(position.x) < (PHOTO_WIDTH + MARKER_HIT_SIZE) / 2 &&
          Math.abs(position.y) < (PHOTO_HEIGHT + MARKER_HIT_SIZE) / 2,
      };
    })
    .sort((firstItem, secondItem) => firstItem.position.z - secondItem.position.z);
  const renderLights = (front, overlay = false) =>
    displayed
      .filter(
        ({ position, behindPhoto }) =>
          position.z >= 0 === front && (!overlay || behindPhoto),
      )
      .map(({ light, position, behindPhoto }) => {
        const visual = computeConeVisualStyle(light);
        const modelAngles = pointAngles(position);
        return (
          <g
            key={light.id}
            data-light-id={light.id}
            data-hemisphere={front ? "front" : "back"}
            data-light-overlay={overlay || void 0}
          >
            {!overlay && (
              <polygon
                points={coneOutline(position, light)}
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
                  transform={`translate(${position.x},${-position.y})`}
                  role="button"
                  tabIndex={isInteractionDisabled ? -1 : 0}
                  aria-label={light.id}
                  aria-pressed={light.id === activeLightId}
                  aria-disabled={isInteractionDisabled}
                  className="outline-none focus-visible:stroke-foreground"
                  onPointerDown={(event) => begin(event, light)}
                  onKeyDown={(event) => {
                    if (
                      isInteractionDisabled ||
                      (event.key !== "Enter" && event.key !== " ")
                    )
                      return;
                    event.preventDefault();
                    event.stopPropagation();
                    latest.current.onSelectActiveLight?.(light.id);
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
                    <LampModel3D
                      {...modelAngles}
                      type={light.type}
                      color={visual.previewColor}
                    />
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
      aria-label={translate("subtab_lighting")}
      className={`overflow-visible touch-none select-none ${isInteractionDisabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
      onPointerDown={(event) => begin(event)}
      onPointerMove={move}
      onPointerUp={(event) => finish(event)}
      onPointerCancel={(event) => finish(event, true)}
      onLostPointerCapture={(event) => finish(event, true)}
    >
      <title>{translate("subtab_lighting")}</title>
      <svg x="50%" y="50%" width="1" height="1" overflow="visible">
        <title>{translate("subtab_lighting")}</title>
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
                {BACKDROP_GRADIENT_STOPS[studioMode].map((gradientStop, i2) => (
                  <stop
                    key={gradientStop.offset ?? i2}
                    offset={gradientStop.offset ?? "0"}
                    stopColor={gradientStop.color}
                    stopOpacity={gradientStop.opacity ?? "1"}
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
              <Button
                variant="outline"
                className="h-14 w-14 border-dashed bg-muted text-muted-foreground"
                onClick={onUploadClick}
                aria-label={translate("upload_image_caption")}
              >
                <Upload className="h-5 w-5" strokeWidth={1.5} />
              </Button>
              <p className="whitespace-nowrap text-xs text-muted-foreground">
                {translate("upload_image_caption")}
              </p>
            </div>
          </foreignObject>
        )}
      </svg>
    </svg>
  );
};
