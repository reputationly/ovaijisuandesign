// opacity-sample-cell.jsx
import { useTranslation } from "react-i18next";
import reactExports from "react";
import jsxRuntimeExports from "react/jsx-runtime";
import { IconCompositingContext } from "../media-editing/icon-compositing.js";
import { __jsx } from "../shared/jsx-runtime.js";
const svgIds = new WeakMap();
let nextSvgId = 0;
function colorAlpha(color) {
  const slash = color.match(/\/\s*([\d.]+%?)\s*\)/);
  if (slash) return slash[1];
  const rgba = color.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
  return rgba?.[1] ?? "1";
}
function readSvgOpacityDiagnostics(svgElement, sample) {
  let svgDiagnosticId = svgIds.get(svgElement);
  if (!svgDiagnosticId) {
    svgDiagnosticId = `svg-${++nextSvgId}`;
    svgIds.set(svgElement, svgDiagnosticId);
  }
  const style = getComputedStyle(svgElement);
  const ancestors = [];
  let element = svgElement.parentElement;
  while (element) {
    const parentStyle = getComputedStyle(element);
    const actionId = element.getAttribute("data-action-ui-id");
    ancestors.push(
      `${element.tagName.toLowerCase()}${actionId ? `[${actionId}]` : ""}=${parentStyle.opacity}`,
    );
    if (element === sample) break;
    element = element.parentElement;
  }
  const primitives = new Set();
  for (const primitive of svgElement.querySelectorAll(
    "path, rect, circle, line, polyline, polygon, ellipse, use, g",
  )) {
    if (primitive.closest("defs")) continue;
    const primitiveStyle = getComputedStyle(primitive);
    primitives.add(
      `stroke=${primitiveStyle.stroke}; fill=${primitiveStyle.fill}; opacity=${primitiveStyle.opacity}; stroke-opacity=${primitiveStyle.strokeOpacity}; fill-opacity=${primitiveStyle.fillOpacity}`,
    );
  }
  const flood = svgElement.querySelector("feFlood");
  if (flood) {
    const paint = getComputedStyle(flood);
    primitives.add(
      `whole-icon color=${paint.floodColor}; alpha=${colorAlpha(paint.floodColor)}`,
    );
  }
  return {
    id: svgDiagnosticId,
    color: style.color,
    colorAlpha: colorAlpha(style.color),
    rootOpacity: style.opacity,
    filter: style.filter,
    ancestors: ancestors.join(" → "),
    primitives: Array.from(primitives).join("\n"),
  };
}
function readOpacityDiagnostics(sample) {
  return Array.from(sample.querySelectorAll("svg")).map((svgElement) =>
    readSvgOpacityDiagnostics(svgElement, sample),
  );
}
function hasAlphaPaint(svgElement) {
  return [
    svgElement,
    ...svgElement.querySelectorAll(
      "path, rect, circle, line, polyline, polygon, ellipse, use, g",
    ),
  ].some((node) => {
    const style = getComputedStyle(node);
    const alphaValues = [
      colorAlpha(style.color),
      colorAlpha(style.stroke),
      colorAlpha(style.fill),
      style.strokeOpacity,
      style.fillOpacity,
    ];
    if (node !== svgElement) alphaValues.push(style.opacity);
    return alphaValues.some(
      (value) =>
        value !== "" &&
        (value.endsWith("%") ? Number.parseFloat(value) / 100 : Number(value)) <
          1,
    );
  });
}
function isVisibleSvg(svgElement) {
  if (svgElement.getClientRects().length === 0) return false;
  let node = svgElement;
  while (node) {
    const style = getComputedStyle(node);
    if (
      style.visibility === "hidden" ||
      style.visibility === "collapse" ||
      style.opacity === "0"
    )
      return false;
    node = node.parentElement;
  }
  return true;
}
function readPageIconDiagnostics() {
  return Array.from(document.querySelectorAll("svg"))
    .filter(
      (svgElement) =>
        !svgElement.closest(
          '[data-icon-opacity-debug], [data-action-ui-id="debug-panel-dialog"]',
        ) && isVisibleSvg(svgElement),
    )
    .filter(
      (svgElement) =>
        svgElement.hasAttribute("data-icon-tone") ||
        svgElement.hasAttribute("data-icon-compositing") ||
        hasAlphaPaint(svgElement),
    )
    .map((svgElement) => {
      const control =
        svgElement.closest(
          'button[data-action-ui-id], [role="button"][data-action-ui-id], [role="tab"][data-action-ui-id]',
        ) ?? svgElement.closest("[data-action-ui-id]");
      return {
        ...readSvgOpacityDiagnostics(svgElement, document.body),
        tone:
          svgElement.getAttribute("data-icon-compositing") ??
          svgElement.getAttribute("data-icon-tone") ??
          "",
        control: control?.getAttribute("data-action-ui-id") ?? "",
        label:
          control?.getAttribute("aria-label") ??
          svgElement.getAttribute("aria-label") ??
          "",
      };
    });
}
function OpacitySampleCell({ sample, fixed, disabled, opacity, revision }) {
  const { t: translate } = useTranslation();
  const sampleElementRef = reactExports.useRef(null);
  const [metrics, setMetrics] = reactExports.useState([]);
  const handleMeasure = reactExports.useCallback(() => {
    if (sampleElementRef.current) setMetrics(readOpacityDiagnostics(sampleElementRef.current));
  }, []);
  reactExports.useEffect(() => {
    const animationFrameId = requestAnimationFrame(handleMeasure);
    return () => cancelAnimationFrame(animationFrameId);
  }, [revision, opacity, disabled, handleMeasure]);
  return (
    <div
      className="min-w-0 space-y-2"
      data-opacity-case={`${sample.id}-${fixed ? "after" : "before"}`}
    >
      <div
        ref={sampleElementRef}
        style={{
          opacity,
        }}
        onPointerEnter={handleMeasure}
        onPointerLeave={handleMeasure}
        onFocusCapture={handleMeasure}
        onBlurCapture={handleMeasure}
        onTransitionEnd={handleMeasure}
        className="flex min-h-12 items-center justify-center rounded-md border border-border/50 p-2"
      >
        <IconCompositingContext value={fixed}>
          {sample.render(fixed, disabled, translate)}
        </IconCompositingContext>
      </div>
      <details
        onToggle={handleMeasure}
        className="text-caption-11 text-muted-foreground"
        data-action-ui-id={`debug.icon-opacity.${sample.id}.${fixed ? "after" : "before"}.diagnostics`}
      >
        <summary className="cursor-pointer">
          {translate("debugPanel.iconOpacity.diagnostics")}
        </summary>
        <dl className="mt-1 space-y-2 break-all font-mono">
          {metrics.map((metric) => (
            <div key={metric.id}>
              <dt>{translate("debugPanel.iconOpacity.colorAlpha")}</dt>
              <dd>
                {metric.color}
                {" / alpha="}
                {metric.colorAlpha}
              </dd>
              <dt>{translate("debugPanel.iconOpacity.owner")}</dt>
              <dd>
                {fixed
                  ? translate(`debugPanel.iconOpacity.owner.${sample.owner}`)
                  : translate("debugPanel.iconOpacity.owner.legacy")}
              </dd>
              <dt>{translate("debugPanel.iconOpacity.root")}</dt>
              <dd>
                {metric.rootOpacity}
                {" / "}
                {metric.filter}
              </dd>
              <dt>{translate("debugPanel.iconOpacity.ancestors")}</dt>
              <dd>{metric.ancestors}</dd>
              <dt>{translate("debugPanel.iconOpacity.primitives")}</dt>
              <dd className="whitespace-pre-wrap">{metric.primitives}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
export { OpacitySampleCell, readPageIconDiagnostics };
