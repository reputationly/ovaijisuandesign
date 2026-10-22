/**
 * IntegrationTextLink / OverflowMarqueeText（4.0.3 新增）。
 *
 * 逐字移植自参照 index-B3Ss5vz1.js 的同名函数，改动仅为：
 *   · cn$5 -> cn（本仓库的类名合并工具）
 *   · jsx 运行时 -> __jsx
 *   · MARQUEE_GAP_PX 常量并入本模块（参照里是相邻的顶层常量，值 24）
 *
 * OverflowMarqueeText 的用途：文本超出容器时横向滚动（marquee）。
 * 它不靠 CSS 猜宽度，而是用 ResizeObserver 实测内容宽度，超了才把 data-overflow 置真、
 * 并把距离/时长写进 CSS 变量 —— 这样「没超就不动」，避免所有文字都在慢慢爬。
 */

import reactExports from "react";

import { __jsx } from "../shared/jsx-runtime.js";
import { cn } from "../infra/dialog-content.jsx";

/** 两段文字之间的空隙（参照值 24）。 */
const MARQUEE_GAP_PX = 24;

export function IntegrationTextLink({ className, type = "button", ...props }) {
  return __jsx("button", {
    type,
    className: cn(
      "inline-flex cursor-pointer items-center gap-0.5 rounded-md px-1.5 py-1 text-muted-foreground text-xs transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
      className,
    ),
    ...props,
  });
}

export function OverflowMarqueeText({
  children,
  className,
  style,
  leadingFadeSpace = 0,
  ...props
}) {
  const viewportRef = reactExports.useRef(null);
  const contentRef = reactExports.useRef(null);
  const [distance, setDistance] = reactExports.useState(0);

  reactExports.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const measure = () => {
      const width = viewport.clientWidth - leadingFadeSpace;
      const contentWidth = content.getBoundingClientRect().width;
      const overflow = contentWidth - width;
      setDistance(
        // 空内容不滚动；溢出 1px 以内当作没溢出（抗亚像素误差）
        children.length > 0 && width > 0 && overflow > 1 ? contentWidth + MARQUEE_GAP_PX : 0,
      );
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(viewport);
    observer?.observe(content);
    return () => observer?.disconnect();
  }, [children, leadingFadeSpace]);

  return __jsx(
    "span",
    {
      ...props,
      ref: viewportRef,
      className: cn("overflow-marquee-text", className),
      "data-overflow": distance > 0 ? "true" : undefined,
      style: {
        ...style,
        "--overflow-marquee-leading-space": `${leadingFadeSpace}px`,
        "--overflow-marquee-leading-fade": `${leadingFadeSpace || 16}px`,
        "--overflow-marquee-distance": `${-distance}px`,
        "--overflow-marquee-gap": `${MARQUEE_GAP_PX}px`,
        // 每 30px 一秒，最少 2 秒 —— 短文本不会一闪而过
        "--overflow-marquee-duration": `${Math.max(2, distance / 30)}s`,
      },
    },
    __jsx(
      "span",
      { className: "overflow-marquee-text-content" },
      __jsx("span", { ref: contentRef }, children),
      distance > 0 && __jsx("span", { "aria-hidden": "true" }, children),
    ),
  );
}
