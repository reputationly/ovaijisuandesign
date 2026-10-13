// expandable-text.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useChatPresentation } from "../chat/use-copy.jsx";

export function ExpandableText({
  children,
  lineClamp = 8,
  className,
  asPre = false,
  richContent = false,
  ellipsis = false,
}) {
  const { t } = useTranslation();
  const isPresented = useChatPresentation();
  const [expanded, setExpanded] = reactExports.useState(false);
  const [collapsedHeight, setCollapsedHeight] = reactExports.useState(null);
  const [fullHeight, setFullHeight] = reactExports.useState(null);
  const ref = reactExports.useRef(null);
  const transitioningRef = reactExports.useRef(false);
  const measure = reactExports.useCallback(() => {
    const el = ref.current;
    if (!el || !isPresented || transitioningRef.current) return;
    const lineHeightStr = window.getComputedStyle(el).lineHeight;
    let lineHeight = parseFloat(lineHeightStr);
    if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
      const fontSize = parseFloat(window.getComputedStyle(el).fontSize) || 14;
      lineHeight = fontSize * 1.5;
    }
    const collapsed = Math.round(lineHeight * lineClamp);
    const full = el.scrollHeight;
    if (full <= 0) return;
    setCollapsedHeight(collapsed);
    setFullHeight(full);
  }, [isPresented, lineClamp]);
  reactExports.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !isPresented) return;
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [measure, children, isPresented]);
  const overflow =
    fullHeight != null &&
    collapsedHeight != null &&
    fullHeight > collapsedHeight + 1;
  const showEllipsis = ellipsis && overflow && !expanded;
  const style = {
    maxHeight:
      !overflow || expanded
        ? (fullHeight ?? void 0)
        : (collapsedHeight ?? void 0),
    ...(showEllipsis
      ? {
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: lineClamp,
        }
      : void 0),
  };
  const innerClass = [
    richContent
      ? ""
      : "whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
    "overflow-hidden transition-[max-height] duration-200 ease-out",
    asPre ? "font-mono" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  const handleToggle = () => {
    transitioningRef.current = true;
    setExpanded((isExpanded) => !isExpanded);
  };
  const handleTransitionEnd = (transitionEvent) => {
    if (transitionEvent.propertyName !== "max-height") return;
    transitioningRef.current = false;
    measure();
  };
  return (
    <div className="flex flex-col gap-1">
      {asPre ? (
        <pre
          data-line-clamp={lineClamp}
          data-ellipsis={ellipsis || void 0}
          ref={(el) => {
            ref.current = el;
          }}
          className={innerClass}
          style={style}
          onTransitionEnd={handleTransitionEnd}
        >
          {children}
        </pre>
      ) : (
        <div
          data-line-clamp={lineClamp}
          data-ellipsis={ellipsis || void 0}
          ref={(el) => {
            ref.current = el;
          }}
          className={innerClass}
          style={style}
          onTransitionEnd={handleTransitionEnd}
        >
          {children}
        </div>
      )}
      {overflow && (
        <button
          type="button"
          className="self-start text-xs text-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
          onClick={handleToggle}
        >
          {expanded ? t("chat.showLess") : t("chat.showMore")}
        </button>
      )}
    </div>
  );
}
