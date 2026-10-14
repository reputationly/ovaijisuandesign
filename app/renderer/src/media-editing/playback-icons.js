// 播放、暂停、停止、上一段、下一段，以及圆形媒体图标。
import reactExports from "react";
import jsxRuntimeExports from "react/jsx-runtime";
import { CompositedSvg } from "./icon-compositing.js";

function createMediaIcon(name2, geometry) {
  const Icon2 = reactExports.forwardRef(function MediaIcon({
    size: size2 = 24,
    absoluteStrokeWidth: _absoluteStrokeWidth,
    children: children2,
    className,
    ...props
  }, ref) {
    return /* @__PURE__ */jsxRuntimeExports.jsxs(CompositedSvg, {
      width: size2,
      height: size2,
      "aria-hidden": "true",
      ...props,
      ref,
      className: `lucide lucide-${name2.toLowerCase()}${className ? ` ${className}` : ""}`,
      viewBox: "0 0 12 12",
      fill: "currentColor",
      stroke: "none",
      "data-media-icon": name2,
      children: [/* @__PURE__ */jsxRuntimeExports.jsx("g", {
        fill: "currentColor",
        stroke: "none",
        children: geometry
      }), children2]
    });
  });
  Icon2.displayName = `Playback${name2}Icon`;
  return Icon2;
}
export const PlaybackPlayIcon$1 = createMediaIcon("Play", /* @__PURE__ */jsxRuntimeExports.jsx("path", {
  d: "M3.1 2.35c0-.58.63-.94 1.13-.65l5.42 3.13c.5.29.5 1.01 0 1.3L4.23 9.3c-.5.29-1.13-.07-1.13-.65v-6.3Z"
}));
export const PlaybackPauseIcon$1 = createMediaIcon("Pause", /* @__PURE__ */jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
  children: [/* @__PURE__ */jsxRuntimeExports.jsx("rect", {
    x: "3",
    y: "1.8",
    width: "2.1",
    height: "8.4",
    rx: "0.7"
  }), /* @__PURE__ */jsxRuntimeExports.jsx("rect", {
    x: "6.9",
    y: "1.8",
    width: "2.1",
    height: "8.4",
    rx: "0.7"
  })]
}));
export const PlaybackStopIcon$1 = createMediaIcon("Stop", /* @__PURE__ */jsxRuntimeExports.jsx("rect", {
  x: "2.5",
  y: "2.5",
  width: "7",
  height: "7",
  rx: "1"
}));
const nextGeometry = /* @__PURE__ */jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
  children: [/* @__PURE__ */jsxRuntimeExports.jsx("path", {
    d: "M2.5 2.75Q2.5 2 3.15 2.4L7.85 5.6Q8.5 6 7.85 6.4L3.15 9.6Q2.5 10 2.5 9.25Z"
  }), /* @__PURE__ */jsxRuntimeExports.jsx("rect", {
    x: "9",
    y: "2.25",
    width: "1.25",
    height: "7.5",
    rx: "0.5"
  })]
});
export const PlaybackNextIcon$1 = createMediaIcon("Next", nextGeometry);
export const PlaybackPreviousIcon$1 = createMediaIcon("Previous", /* @__PURE__ */jsxRuntimeExports.jsx("g", {
  transform: "translate(12 0) scale(-1 1)",
  children: nextGeometry
}));
const playGeometry = /* @__PURE__ */jsxRuntimeExports.jsx("path", {
  d: "M6.13281 5.74789C6.13286 5.37642 6.53561 5.14439 6.85742 5.32992L11.04 7.74301C11.3621 7.92878 11.3621 8.39318 11.04 8.57895L6.85742 10.992C6.53566 11.1775 6.13295 10.9454 6.13281 10.5741V5.74789Z",
  fill: "var(--primary-foreground)"
});
const pauseGeometry = /* @__PURE__ */jsxRuntimeExports.jsxs("g", {
  fill: "var(--media-circle-pause-foreground, var(--primary-foreground))",
  children: [/* @__PURE__ */jsxRuntimeExports.jsx("rect", {
    x: "5.3335",
    y: "5.16663",
    width: "1.88889",
    height: "5.66667",
    rx: "0.472222"
  }), /* @__PURE__ */jsxRuntimeExports.jsx("rect", {
    x: "8.82227",
    y: "5.16663",
    width: "1.88889",
    height: "5.66667",
    rx: "0.472222"
  })]
});
const CircleMediaSvg = reactExports.forwardRef(function CircleMediaSvg2({
  size: size2 = 16,
  absoluteStrokeWidth: _absoluteStrokeWidth,
  iconName,
  children: children2,
  ...props
}, ref) {
  return /* @__PURE__ */jsxRuntimeExports.jsxs("svg", {
    width: size2,
    height: size2,
    "aria-hidden": "true",
    ...props,
    ref,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "none",
    "data-media-icon": `Circle${iconName}`,
    children: [/* @__PURE__ */jsxRuntimeExports.jsx("circle", {
      cx: "8",
      cy: "8",
      r: "8",
      fill: "var(--primary)"
    }), children2]
  });
});
function createCircleMediaIcon(name2, geometry) {
  const Icon2 = reactExports.forwardRef(function CircleMediaIcon({
    children: children2,
    ...props
  }, ref) {
    return /* @__PURE__ */jsxRuntimeExports.jsxs(CircleMediaSvg, {
      ...props,
      ref,
      iconName: name2,
      children: [geometry, children2]
    });
  });
  Icon2.displayName = `PlaybackCircle${name2}Icon`;
  return Icon2;
}
export const PlaybackCirclePlayIcon$1 = createCircleMediaIcon("Play", playGeometry);
export const PlaybackCirclePauseIcon$1 = createCircleMediaIcon("Pause", pauseGeometry);
export const PlaybackCircleToggleIcon = reactExports.forwardRef(function PlaybackCircleToggleIcon2({
  playing = false,
  children: children2,
  ...props
}, ref) {
  return /* @__PURE__ */jsxRuntimeExports.jsxs(CircleMediaSvg, {
    ...props,
    ref,
    iconName: playing ? "Pause" : "Play",
    children: [[{
      name: "play",
      visible: !playing,
      geometry: playGeometry
    }, {
      name: "pause",
      visible: playing,
      geometry: pauseGeometry
    }].map(({
      name: name2,
      visible,
      geometry
    }) => /* @__PURE__ */jsxRuntimeExports.jsx("g", {
      "data-playback-glyph": name2,
      className: `origin-center [transform-box:view-box] transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none ${visible ? "scale-100 opacity-100" : "scale-60 opacity-0"}`,
      children: geometry
    }, name2)), children2]
  });
});
export function desktopMediaIcon(Glyph) {
  return reactExports.forwardRef(function DesktopMediaIcon({
    size: size2 = 16,
    ...props
  }, ref) {
    return /* @__PURE__ */jsxRuntimeExports.jsx(Glyph, {
      size: size2,
      ...props,
      ref
    });
  });
}
