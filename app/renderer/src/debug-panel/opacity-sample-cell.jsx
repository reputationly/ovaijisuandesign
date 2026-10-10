// opacity-sample-cell.jsx
import { useTranslation, reactExports, jsxRuntimeExports, IconCompositingContext } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
const svgIds = new WeakMap();
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
      `${element.tagName.toLowerCase()}${actionId ? `[${actionId}]` : ""}=${parentStyle.opacity}`,
    );
    if (element === sample) break;
    element = element.parentElement;
  }
  const primitives = new Set();
  for (const primitive of svg.querySelectorAll(
    "path, rect, circle, line, polyline, polygon, ellipse, use, g",
  )) {
    if (primitive.closest("defs")) continue;
    const primitiveStyle = getComputedStyle(primitive);
    primitives.add(
      `stroke=${primitiveStyle.stroke}; fill=${primitiveStyle.fill}; opacity=${primitiveStyle.opacity}; stroke-opacity=${primitiveStyle.strokeOpacity}; fill-opacity=${primitiveStyle.fillOpacity}`,
    );
  }
  const flood = svg.querySelector("feFlood");
  if (flood) {
    const paint = getComputedStyle(flood);
    primitives.add(
      `whole-icon color=${paint.floodColor}; alpha=${colorAlpha(paint.floodColor)}`,
    );
  }
  return {
    id,
    color: style.color,
    colorAlpha: colorAlpha(style.color),
    rootOpacity: style.opacity,
    filter: style.filter,
    ancestors: ancestors.join(" → "),
    primitives: Array.from(primitives).join("\n"),
  };
}
function readOpacityDiagnostics(sample) {
  return Array.from(sample.querySelectorAll("svg")).map((svg) =>
    readSvgOpacityDiagnostics(svg, sample),
  );
}
function hasAlphaPaint(svg) {
  return [
    svg,
    ...svg.querySelectorAll(
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
    if (node !== svg) alphaValues.push(style.opacity);
    return alphaValues.some(
      (value) =>
        value !== "" &&
        (value.endsWith("%") ? Number.parseFloat(value) / 100 : Number(value)) <
          1,
    );
  });
}
function isVisibleSvg(svg) {
  if (svg.getClientRects().length === 0) return false;
  let node = svg;
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
      (svg) =>
        !svg.closest(
          '[data-icon-opacity-debug], [data-action-ui-id="debug-panel-dialog"]',
        ) && isVisibleSvg(svg),
    )
    .filter(
      (svg) =>
        svg.hasAttribute("data-icon-tone") ||
        svg.hasAttribute("data-icon-compositing") ||
        hasAlphaPaint(svg),
    )
    .map((svg) => {
      const control =
        svg.closest(
          'button[data-action-ui-id], [role="button"][data-action-ui-id], [role="tab"][data-action-ui-id]',
        ) ?? svg.closest("[data-action-ui-id]");
      return {
        ...readSvgOpacityDiagnostics(svg, document.body),
        tone:
          svg.getAttribute("data-icon-compositing") ??
          svg.getAttribute("data-icon-tone") ??
          "",
        control: control?.getAttribute("data-action-ui-id") ?? "",
        label:
          control?.getAttribute("aria-label") ??
          svg.getAttribute("aria-label") ??
          "",
      };
    });
}
function OpacitySampleCell({ sample, fixed, disabled, opacity, revision }) {
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
  return (
    <div
      className="min-w-0 space-y-2"
      data-opacity-case={`${sample.id}-${fixed ? "after" : "before"}`}
    >
      <div
        ref={ref}
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
          {sample.render(fixed, disabled, t)}
        </IconCompositingContext>
      </div>
      <details
        onToggle={handleMeasure}
        className="text-caption-11 text-muted-foreground"
        data-action-ui-id={`debug.icon-opacity.${sample.id}.${fixed ? "after" : "before"}.diagnostics`}
      >
        <summary className="cursor-pointer">
          {t("debugPanel.iconOpacity.diagnostics")}
        </summary>
        <dl className="mt-1 space-y-2 break-all font-mono">
          {metrics.map((metric) => (
            <div key={metric.id}>
              <dt>{t("debugPanel.iconOpacity.colorAlpha")}</dt>
              <dd>
                {metric.color}
                {" / alpha="}
                {metric.colorAlpha}
              </dd>
              <dt>{t("debugPanel.iconOpacity.owner")}</dt>
              <dd>
                {fixed
                  ? t(`debugPanel.iconOpacity.owner.${sample.owner}`)
                  : t("debugPanel.iconOpacity.owner.legacy")}
              </dd>
              <dt>{t("debugPanel.iconOpacity.root")}</dt>
              <dd>
                {metric.rootOpacity}
                {" / "}
                {metric.filter}
              </dd>
              <dt>{t("debugPanel.iconOpacity.ancestors")}</dt>
              <dd>{metric.ancestors}</dd>
              <dt>{t("debugPanel.iconOpacity.primitives")}</dt>
              <dd className="whitespace-pre-wrap">{metric.primitives}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
export { OpacitySampleCell, readPageIconDiagnostics };
