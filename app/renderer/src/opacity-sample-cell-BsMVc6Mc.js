import { h as useTranslation, r as reactExports, j as jsxRuntimeExports, fN as IconCompositingContext } from "./main.jsx";
const svgIds = /* @__PURE__ */ new WeakMap();
let nextSvgId = 0;
function colorAlpha(color) {
  const slash = color.match(/\/\s*([\d.]+%?)\s*\)/);
  if (slash) return slash[1];
  const rgba = color.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
  return rgba?.[1] ?? "1";
}
function readSvgOpacityDiagnostics(svg, sample) {
  let id = svgIds.get(svg);
  if (!id) {
    id = `svg-${++nextSvgId}`;
    svgIds.set(svg, id);
  }
  const style = getComputedStyle(svg);
  const ancestors = [];
  let element = svg.parentElement;
  while (element) {
    const parentStyle = getComputedStyle(element);
    const actionId = element.getAttribute("data-action-ui-id");
    ancestors.push(
      `${element.tagName.toLowerCase()}${actionId ? `[${actionId}]` : ""}=${parentStyle.opacity}`
    );
    if (element === sample) break;
    element = element.parentElement;
  }
  const primitives = /* @__PURE__ */ new Set();
  for (const primitive of svg.querySelectorAll(
    "path, rect, circle, line, polyline, polygon, ellipse, use, g"
  )) {
    if (primitive.closest("defs")) continue;
    const primitiveStyle = getComputedStyle(primitive);
    primitives.add(
      `stroke=${primitiveStyle.stroke}; fill=${primitiveStyle.fill}; opacity=${primitiveStyle.opacity}; stroke-opacity=${primitiveStyle.strokeOpacity}; fill-opacity=${primitiveStyle.fillOpacity}`
    );
  }
  const flood = svg.querySelector("feFlood");
  if (flood) {
    const paint = getComputedStyle(flood);
    primitives.add(`whole-icon color=${paint.floodColor}; alpha=${colorAlpha(paint.floodColor)}`);
  }
  return {
    id,
    color: style.color,
    colorAlpha: colorAlpha(style.color),
    rootOpacity: style.opacity,
    filter: style.filter,
    ancestors: ancestors.join(" → "),
    primitives: Array.from(primitives).join("\n")
  };
}
function readOpacityDiagnostics(sample) {
  return Array.from(sample.querySelectorAll("svg")).map(
    (svg) => readSvgOpacityDiagnostics(svg, sample)
  );
}
function hasAlphaPaint(svg) {
  return [
    svg,
    ...svg.querySelectorAll("path, rect, circle, line, polyline, polygon, ellipse, use, g")
  ].some((node) => {
    const style = getComputedStyle(node);
    const alphaValues = [
      colorAlpha(style.color),
      colorAlpha(style.stroke),
      colorAlpha(style.fill),
      style.strokeOpacity,
      style.fillOpacity
    ];
    if (node !== svg) alphaValues.push(style.opacity);
    return alphaValues.some(
      (value) => value !== "" && (value.endsWith("%") ? Number.parseFloat(value) / 100 : Number(value)) < 1
    );
  });
}
function isVisibleSvg(svg) {
  if (svg.getClientRects().length === 0) return false;
  let node = svg;
  while (node) {
    const style = getComputedStyle(node);
    if (style.visibility === "hidden" || style.visibility === "collapse" || style.opacity === "0")
      return false;
    node = node.parentElement;
  }
  return true;
}
function readPageIconDiagnostics() {
  return Array.from(document.querySelectorAll("svg")).filter(
    (svg) => !svg.closest('[data-icon-opacity-debug], [data-action-ui-id="debug-panel-dialog"]') && isVisibleSvg(svg)
  ).filter(
    (svg) => svg.hasAttribute("data-icon-tone") || svg.hasAttribute("data-icon-compositing") || hasAlphaPaint(svg)
  ).map((svg) => {
    const control = svg.closest(
      'button[data-action-ui-id], [role="button"][data-action-ui-id], [role="tab"][data-action-ui-id]'
    ) ?? svg.closest("[data-action-ui-id]");
    return {
      ...readSvgOpacityDiagnostics(svg, document.body),
      tone: svg.getAttribute("data-icon-compositing") ?? svg.getAttribute("data-icon-tone") ?? "",
      control: control?.getAttribute("data-action-ui-id") ?? "",
      label: control?.getAttribute("aria-label") ?? svg.getAttribute("aria-label") ?? ""
    };
  });
}
function OpacitySampleCell({
  sample,
  fixed,
  disabled,
  opacity,
  revision
}) {
  const { t } = useTranslation();
  const ref = reactExports.useRef(null);
  const [metrics, setMetrics] = reactExports.useState([]);
  const handleMeasure = reactExports.useCallback(() => {
    if (ref.current) setMetrics(readOpacityDiagnostics(ref.current));
  }, []);
  reactExports.useEffect(() => {
    const id = requestAnimationFrame(handleMeasure);
    return () => cancelAnimationFrame(id);
  }, [revision, opacity, disabled, handleMeasure]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "min-w-0 space-y-2",
      "data-opacity-case": `${sample.id}-${fixed ? "after" : "before"}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            ref,
            style: { opacity },
            onPointerEnter: handleMeasure,
            onPointerLeave: handleMeasure,
            onFocusCapture: handleMeasure,
            onBlurCapture: handleMeasure,
            onTransitionEnd: handleMeasure,
            className: "flex min-h-12 items-center justify-center rounded-md border border-border/50 p-2",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconCompositingContext, { value: fixed, children: sample.render(fixed, disabled, t) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "details",
          {
            onToggle: handleMeasure,
            className: "text-caption-11 text-muted-foreground",
            "data-action-ui-id": `debug.icon-opacity.${sample.id}.${fixed ? "after" : "before"}.diagnostics`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "cursor-pointer", children: t("debugPanel.iconOpacity.diagnostics") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { className: "mt-1 space-y-2 break-all font-mono", children: metrics.map((metric) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: t("debugPanel.iconOpacity.colorAlpha") }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { children: [
                  metric.color,
                  " / alpha=",
                  metric.colorAlpha
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: t("debugPanel.iconOpacity.owner") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: fixed ? t(`debugPanel.iconOpacity.owner.${sample.owner}`) : t("debugPanel.iconOpacity.owner.legacy") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: t("debugPanel.iconOpacity.root") }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { children: [
                  metric.rootOpacity,
                  " / ",
                  metric.filter
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: t("debugPanel.iconOpacity.ancestors") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: metric.ancestors }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: t("debugPanel.iconOpacity.primitives") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "whitespace-pre-wrap", children: metric.primitives })
              ] }, metric.id)) })
            ]
          }
        )
      ]
    }
  );
}
export {
  OpacitySampleCell as O,
  readPageIconDiagnostics as r
};
