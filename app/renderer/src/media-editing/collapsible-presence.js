/**
 * CollapsiblePresence（4.0.3 新增）：带进出场阶段的可折叠容器。
 *
 * 移植自参照 index-B3Ss5vz1.js 第 327750~327821 行（readMs / measurePhaseMs /
 * CollapsiblePresence 三个声明）。逻辑照搬，只做了两处适配：
 *   · 类名合并用仓库里的 `cn`（参照里是 rollup 改名的 cn$5）
 *   · prefersReducedMotion 用仓库已有的实现（home/motion-utils.js）
 *
 * 为什么不是简单的「display: none 切换」：
 *   收起时要先播完退场动画再卸载，否则内容会突然消失；
 *   展开时要先挂载再播入场，否则第一帧没有过渡起点。
 *   所以它维护 rendered（是否在 DOM 里）与 phase（idle/enter/exit）两个状态。
 *
 * **动画时长从 CSS 变量读**（--disclosure-enter-duration 等），
 * 样式缺失时会退回 0 —— 也就是没有动画但功能正常。
 */

import reactExports from "react";

import { __jsx } from "../shared/jsx-runtime.js";
import { cn } from "../infra/dialog-content.jsx";
import { prefersReducedMotion } from "../home/motion-utils.js";

/** 阶段结束后多等一点再卸载，避免和最后一帧动画抢。 */
const SETTLE_BUFFER_MS = 50;

/** 从已计算样式里读一个时长（毫秒）。没写或写错都当 0。 */
function readMs(style, name) {
  const raw = style.getPropertyValue(name).trim();
  if (!raw) return 0;
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) return 0;
  return raw.endsWith("ms") ? value : raw.endsWith("s") ? value * 1e3 : value;
}

/**
 * 算一个阶段总共要多久：高度动画与「逐项错开」里取更长的那个。
 * 逐项数取自 DOM 深度约定：element > .disclosure-clip > 列表 > 子项。
 */
function measurePhaseMs(element, phase) {
  const style = window.getComputedStyle(element);
  const itemCount = element.firstElementChild?.firstElementChild?.childElementCount ?? 0;
  const staggerMax = Number.parseFloat(style.getPropertyValue("--disclosure-stagger-max")) || 0;
  const steps = Math.max(0, Math.min(itemCount - 1, staggerMax));
  const height = readMs(
    style,
    phase === "enter" ? "--disclosure-enter-duration" : "--disclosure-exit-duration",
  );
  const item = readMs(
    style,
    phase === "enter" ? "--disclosure-item-duration" : "--disclosure-item-exit-duration",
  );
  const stagger = readMs(
    style,
    phase === "enter" ? "--disclosure-stagger-enter" : "--disclosure-stagger-exit",
  );
  return Math.max(height, item + steps * stagger);
}

/**
 * @param {{ open: boolean, children?: unknown, className?: string,
 *           keepMounted?: boolean }} props
 *   keepMounted=true 时即使收起也留在 DOM 里（只加 hidden），
 *   用于需要保留内部状态的场景。
 */
export function CollapsiblePresence({ open, children, className, keepMounted = false }) {
  const ref = reactExports.useRef(null);
  const [rendered, setRendered] = reactExports.useState(open);
  const [phase, setPhase] = reactExports.useState("idle");
  const [prevOpen, setPrevOpen] = reactExports.useState(open);

  // 在渲染期同步决定阶段（参照就是这么做，不用 effect，避免多一帧闪烁）
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (prefersReducedMotion()) {
      setRendered(open);
      setPhase("idle");
    } else if (open) {
      setRendered(true);
      setPhase("enter");
    } else if (rendered) {
      setPhase("exit");
    }
  }

  reactExports.useEffect(() => {
    if (phase === "idle") return;
    const element = ref.current;
    const totalMs = element ? measurePhaseMs(element, phase) : 0;
    const timer = window.setTimeout(() => {
      setPhase("idle");
      if (phase === "exit") setRendered(false);
    }, totalMs + SETTLE_BUFFER_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (!rendered && !keepMounted) return null;

  return __jsx(
    "div",
    {
      ref,
      className: cn("disclosure", className),
      "data-state": open ? "open" : "closed",
      "data-phase": phase,
      inert: !open,
      hidden: !rendered,
    },
    __jsx("div", { className: "disclosure-clip" }, children),
  );
}
