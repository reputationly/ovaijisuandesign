/**
 * ConnectIcon（4.0.3 新增）：连接/接入类入口的图标（浏览器窗口 + 连线 + 闪电）。
 *
 * 移植自参照同名函数。用 CompositedSvg 而不是裸 <svg>：
 * 本仓库的图标合成管线靠它统一处理描边与填充，裸 svg 在暗色/选中态下会不一致。
 * 三条 path 的 d 属性逐字照搬。
 */

import { __jsx } from "../shared/jsx-runtime.js";
import { CompositedSvg } from "../canvas-v3/main-exports.js";

export function ConnectIcon({ size = 24, strokeWidth = 1.875, className, ...rest }) {
  return __jsx(
    CompositedSvg,
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      ...rest,
    },
    __jsx("path", {
      d: "M11.5 16H4.5A2.5 2.5 0 0 1 2 13.5v-8A2.5 2.5 0 0 1 4.5 3h14A2.5 2.5 0 0 1 21 5.5v2",
    }),
    __jsx("path", { d: "M10 16v3m-3.5 0H12" }),
    __jsx("path", { d: "M18 9.5 13.5 17H18l-1.2 5.5 6.7-8H19l1.5-5Z" }),
  );
}
