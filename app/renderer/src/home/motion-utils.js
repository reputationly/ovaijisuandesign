// 动效共用的小工具：减弱动效判断、矩形与 CSS 数值换算、DOM 样式写入。
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export function toPixels(value) {
  return `${Math.round(value * 100) / 100}px`;
}
export function setDatasetValue(element, key, value) {
  if (element.dataset[key] === value) return;
  element.dataset[key] = value;
}
export function copyRect(rect) {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
}
export function cssNumber(value) {
  if (Math.abs(value) < 5e-3) return "0";
  return Number(value.toFixed(2)).toString();
}
export function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
