// camera-model3-d.jsx
import { jsxRuntimeExports, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { planeQuad } from "./plane-quad.jsx";
import {
  getCameraModelView,
  planeEllipse,
  pointsAttribute,
  project$1,
  VIEWBOX_SIZE,
} from "./layer-decompose-prompt.jsx";
import { createBoxFaces } from "./create-box-faces.js";

export function CameraModel3D({
  horizontalAngle,
  verticalAngle,
  className = "",
}) {
  const model = reactExports.useMemo(() => {
    const view2 = getCameraModelView(horizontalAngle, verticalAngle);
    const edge = "var(--hl_camera_edge, #8b939d)";
    const bodyFaces = createBoxFaces({
      key: "body",
      center: {
        x: 0,
        y: 0,
        z: 0,
      },
      size: {
        x: 19,
        y: 13,
        z: 13,
      },
      basis: view2,
      stroke: edge,
      fills: {
        front: "var(--hl_camera_body, #3b4654)",
        back: "var(--hl_camera_back, #303946)",
        left: "var(--hl_camera_side_dark, #2c3544)",
        right: "var(--hl_camera_side, #465261)",
        top: "var(--hl_camera_top, #5a6676)",
        bottom: "var(--hl_camera_bottom, #27313f)",
      },
    });
    const topFaces = createBoxFaces({
      key: "top",
      center: {
        x: -2.2,
        y: 7.5,
        z: -0.5,
      },
      size: {
        x: 6,
        y: 3,
        z: 5,
      },
      basis: view2,
      stroke: "var(--hl_camera_top_edge, #9ca3af)",
      fills: {
        front: "var(--hl_camera_top, #5a6676)",
        back: "var(--hl_camera_side_dark, #2c3544)",
        left: "var(--hl_camera_side_dark, #2c3544)",
        right: "var(--hl_camera_side, #465261)",
        top: "var(--hl_camera_top_light, #6b7788)",
        bottom: "var(--hl_camera_top, #5a6676)",
      },
    });
    const faces = [...bodyFaces, ...topFaces].sort(
      (a2, b3) => a2.depth - b3.depth,
    );
    const frontVisible = view2.frontVisibility > 0.04;
    const backVisible = view2.backVisibility > 0.04;
    const frontZ = 7.05;
    const backZ = -6.55;
    return {
      view: view2,
      faces,
      frontVisible,
      backVisible,
      lensBase: planeEllipse({
        center: {
          x: 3.2,
          y: 0,
          z: frontZ,
        },
        radius: 4.4,
        basis: view2,
      }),
      lensDark: planeEllipse({
        center: {
          x: 3.2,
          y: 0,
          z: frontZ + 0.08,
        },
        radius: 2.9,
        basis: view2,
      }),
      lensCore: planeEllipse({
        center: {
          x: 3.2,
          y: 0,
          z: frontZ + 0.12,
        },
        radius: 1.65,
        basis: view2,
      }),
      lensOuterRing: planeEllipse({
        center: {
          x: 3.2,
          y: 0,
          z: frontZ + 0.16,
        },
        radius: 3.55,
        basis: view2,
      }),
      lensInnerRing: planeEllipse({
        center: {
          x: 3.2,
          y: 0,
          z: frontZ + 0.2,
        },
        radius: 2.35,
        basis: view2,
      }),
      recordDot: planeEllipse({
        center: {
          x: 6.1,
          y: 2,
          z: frontZ + 0.24,
        },
        radius: 0.95,
        basis: view2,
        steps: 16,
      }),
      backScreen: planeQuad(
        {
          x: -1.5,
          y: 0,
          z: backZ,
        },
        9.5,
        6.2,
        view2,
      ),
      handle: [
        {
          x: -4.4,
          y: 9.1,
          z: -0.5,
        },
        {
          x: -3.8,
          y: 10.2,
          z: -0.5,
        },
        {
          x: -0.6,
          y: 10.2,
          z: -0.5,
        },
        {
          x: 0,
          y: 9.1,
          z: -0.5,
        },
      ].map((point2) => project$1(point2, view2)),
    };
  }, [horizontalAngle, verticalAngle]);
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {model.faces.map((face) => (
        <polygon
          key={face.key}
          points={pointsAttribute(face.points)}
          fill={face.fill}
          stroke={face.stroke}
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
      ))}
      {model.backVisible && (
        <polygon
          points={pointsAttribute(model.backScreen)}
          fill="var(--hl_camera_screen, #161d28)"
          stroke="var(--hl_camera_screen_edge, #667284)"
          strokeWidth="0.55"
          strokeLinejoin="round"
        />
      )}
      {model.frontVisible && (
        <>
          <polygon
            points={pointsAttribute(model.lensBase)}
            fill="var(--hl_camera_lens_base, #d1d5db)"
          />
          <polygon
            points={pointsAttribute(model.lensDark)}
            fill="var(--hl_camera_lens_dark, #4b5563)"
          />
          <polygon
            points={pointsAttribute(model.lensCore)}
            fill="var(--hl_camera_lens_core, #374151)"
          />
          <polygon
            points={pointsAttribute(model.lensOuterRing)}
            fill="none"
            stroke="var(--hl_camera_ring_1, #d1d5db)"
            strokeWidth="0.55"
          />
          <polygon
            points={pointsAttribute(model.lensInnerRing)}
            fill="none"
            stroke="var(--hl_camera_ring_2, #9ca3af)"
            strokeWidth="0.45"
          />
          <polygon points={pointsAttribute(model.recordDot)} fill="#ef4444" />
        </>
      )}
      <polyline
        points={pointsAttribute(model.handle)}
        fill="none"
        stroke="var(--hl_camera_handle, #8f96a0)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
