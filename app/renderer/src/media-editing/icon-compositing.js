// 图标合成：`withIconCompositing`、`CompositedSvg`、单色图标、线宽。
import reactExports from "react";
import jsxRuntimeExports from "react/jsx-runtime";

export const IconCompositingContext = reactExports.createContext(true);
const ICON_CLASS_FILTERS = "var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,) var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) var(--tw-drop-shadow,)";
export function withIconCompositing(Glyph) {
  const Composited = reactExports.forwardRef(function CompositedIcon({
    children: children2,
    style: style2,
    color: color2 = "currentColor",
    stroke,
    fill,
    className,
    ...props
  }, ref) {
    const id2 = `icon-paint-${reactExports.useId().replace(/:/g, "")}`;
    const enabled = reactExports.useContext(IconCompositingContext);
    const strokePaint = style2?.stroke ?? stroke ?? color2;
    const fillPaint = style2?.fill ?? fill;
    const layered = fillPaint && fillPaint !== "none" && fillPaint !== "currentColor" && fillPaint !== strokePaint && strokePaint !== "none";
    if (!enabled || layered) {
      return /* @__PURE__ */jsxRuntimeExports.jsx(Glyph, {
        ...props,
        ...(stroke === void 0 ? {} : {
          stroke
        }),
        ...(fill === void 0 ? {} : {
          fill
        }),
        ref,
        style: style2,
        color: color2,
        className,
        children: children2
      });
    }
    const paint = strokePaint === "none" ? fillPaint ?? color2 : strokePaint;
    const fillsCurrentColor = /(?:^|\s)fill-current(?:\s|$)/.test(className ?? "");
    return /* @__PURE__ */jsxRuntimeExports.jsxs(Glyph, {
      ...props,
      ref,
      color: color2,
      stroke: stroke ?? color2,
      fill: fill ?? "none",
      className,
      "data-icon-compositing": "color-union",
      style: {
        ...style2,
        stroke: strokePaint === "none" ? "none" : `rgb(from ${strokePaint} r g b / 1)`,
        ...(fillsCurrentColor || fillPaint && fillPaint !== "none" ? {
          fill: `rgb(from ${fillPaint ?? "currentColor"} r g b / 1)`
        } : {}),
        filter: [`url(#${id2})`, (style2?.filter ?? props.filter) === "none" ? void 0 : style2?.filter ?? props.filter ?? ICON_CLASS_FILTERS].filter(Boolean).join(" ")
      },
      children: [/* @__PURE__ */jsxRuntimeExports.jsx("defs", {
        children: /* @__PURE__ */jsxRuntimeExports.jsxs("filter", {
          filterUnits: "userSpaceOnUse",
          id: id2,
          x: "-50%",
          y: "-50%",
          width: "200%",
          height: "200%",
          colorInterpolationFilters: "sRGB",
          children: [/* @__PURE__ */jsxRuntimeExports.jsx("feFlood", {
            floodColor: paint
          }), /* @__PURE__ */jsxRuntimeExports.jsx("feComposite", {
            in2: "SourceGraphic",
            operator: "in"
          })]
        })
      }), children2]
    });
  });
  Composited.displayName = `Composited(${Glyph.displayName ?? "Icon"})`;
  return Composited;
}
const TONES = {
  muted: {
    color: "var(--icon-muted-ink)",
    alpha: "var(--icon-muted-alpha)"
  },
  topbar: {
    color: "var(--icon-topbar-ink)",
    alpha: "var(--icon-topbar-alpha)"
  },
  "canvas-muted": {
    color: "var(--canvas-controls-text-muted-solid)",
    alpha: "var(--canvas-controls-text-muted-opacity)"
  },
  control: {
    color: "var(--icon-control-ink, var(--foreground))",
    alpha: "var(--icon-control-alpha, 1)"
  }
};
export function MonochromeIcon({
  children: children2,
  tone
}) {
  const {
    color: color2,
    alpha: alpha2
  } = TONES[tone];
  const style2 = children2.props.style;
  const existingFilter = style2?.filter && style2.filter !== "none" ? `${style2.filter} ` : "";
  return reactExports.cloneElement(children2, {
    "data-icon-tone": tone,
    style: {
      ...style2,
      color: color2,
      filter: `${existingFilter}opacity(${alpha2})`
    }
  });
}
export const CompositedSvg = reactExports.forwardRef(function CompositedSvg2({
  children: children2,
  style: style2,
  ...props
}, ref) {
  const id2 = `icon-paint-${reactExports.useId().replace(/:/g, "")}`;
  const enabled = reactExports.useContext(IconCompositingContext);
  if (!enabled) return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: forwards the existing caller accessibility attributes and title.
    /* @__PURE__ */
    jsxRuntimeExports.jsx("svg", {
      ...props,
      ref,
      style: style2,
      children: children2
    })
  );
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: forwards the existing caller accessibility attributes and title.
    /* @__PURE__ */
    jsxRuntimeExports.jsxs("svg", {
      ...props,
      ref,
      "data-icon-compositing": "color-union",
      style: {
        ...style2,
        filter: [`url(#${id2})`, (style2?.filter ?? props.filter) === "none" ? void 0 : style2?.filter ?? props.filter ?? ICON_CLASS_FILTERS].filter(Boolean).join(" ")
      },
      children: [/* @__PURE__ */jsxRuntimeExports.jsx("defs", {
        children: /* @__PURE__ */jsxRuntimeExports.jsxs("filter", {
          filterUnits: "userSpaceOnUse",
          id: id2,
          x: "-50%",
          y: "-50%",
          width: "200%",
          height: "200%",
          colorInterpolationFilters: "sRGB",
          children: [/* @__PURE__ */jsxRuntimeExports.jsx("feFlood", {
            floodColor: "currentColor"
          }), /* @__PURE__ */jsxRuntimeExports.jsx("feComposite", {
            in2: "SourceGraphic",
            operator: "in"
          })]
        })
      }), /* @__PURE__ */jsxRuntimeExports.jsx("g", {
        style: {
          color: "rgb(from currentColor r g b / 1)"
        },
        children: children2
      })]
    })
  );
});
export const ICON_STROKE_SPEC = [{
  size: 12,
  stroke: 1,
  className: "size-3"
}, {
  size: 14,
  stroke: 1,
  className: "size-3.5"
}, {
  size: 16,
  stroke: 1.25,
  className: "size-4"
}, {
  size: 20,
  stroke: 1.5,
  className: "size-5"
}, {
  size: 24,
  stroke: 1.75,
  className: "size-6"
}, {
  size: 32,
  stroke: 2,
  className: "size-8"
}];
export function getIconStrokeWidth(size2, viewBoxSize = 24) {
  const spec = ICON_STROKE_SPEC.find(entry => entry.size === size2);
  if (!spec) throw new Error(`Unsupported stroke icon size: ${size2}`);
  return spec.stroke * viewBoxSize / size2;
}
