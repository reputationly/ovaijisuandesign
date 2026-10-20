/**
 * 导出引擎用到的小声明（第 271 轮）。
 *
 * `MediaImageIcon` / `MediaVideoIcon` / `MediaAudioIcon` / `PortalContainerProvider`
 * 是参照 bundle 的顶层声明（不是 npm 包），按声明边界取回。
 * 偏移是 UTF-16 码元。
 */

import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";

const PortalContainerContext = reactExports.createContext(null);

export const PortalContainerProvider = PortalContainerContext.Provider;

export function MediaImageIcon({ size: size2 = 20, className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { "aria-hidden": "true", width: size2, height: size2, viewBox: "0 0 24 24", fill: "none", className, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "4", y: "4", width: "16", height: "16", rx: "3", stroke: "currentColor", strokeWidth: "1.8" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "path",
      {
        d: "M4.293 18.291L8.882 13.702a2 2 0 0 1 2.728-.094L18.57 19.664",
        stroke: "currentColor",
        strokeWidth: "1.8",
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "15.666", cy: "9.346", r: "1.556", fill: "currentColor" })
  ] });
}

export function MediaVideoIcon({ size: size2 = 20, className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { "aria-hidden": "true", width: size2, height: size2, viewBox: "0 0 20 20", fill: "none", className, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "2", y: "4", width: "12", height: "12", rx: "2", stroke: "currentColor", strokeWidth: "1.5" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "path",
      {
        d: "M14 8.5L18 6V14L14 11.5",
        stroke: "currentColor",
        strokeWidth: "1.5",
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }
    )
  ] });
}

export function MediaAudioIcon({ size: size2 = 20, className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { "aria-hidden": "true", width: size2, height: size2, viewBox: "0 0 20 20", fill: "none", className, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    "path",
    {
      d: "M10 3V17M7 6V14M4 8V12M13 5V15M16 7V13",
      stroke: "currentColor",
      strokeWidth: "1.5",
      strokeLinecap: "round"
    }
  ) });
}
