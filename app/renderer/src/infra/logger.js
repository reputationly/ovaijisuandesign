// 应用日志的格式化和出口留在这里，避免继续经 vendor.js 转发。
import { fmtValue } from "./perf-log.js";

function fmt(tag, action, meta2) {
  if (!meta2) return `${tag} ${action}`;
  const tail = Object.entries(meta2).map(([k2, v2]) => `${k2}=${fmtValue(v2)}`).join(" ");
  return tail ? `${tag} ${action} ${tail}` : `${tag} ${action}`;
}
function emit$6(category, level, action, meta2) {
  const tag = `[${category}]`;
  const msg = fmt(tag, action, meta2);
  const consoleFn = level === "debug" ? console.log : console[level];
  consoleFn(msg);
  try {
    void window.hilo?.logger?.[level]?.(msg, category);
  } catch {}
}
export function makeLogger(category) {
  return {
    debug: (action, meta2) => emit$6(category, "debug", action, meta2),
    info: (action, meta2) => emit$6(category, "info", action, meta2),
    warn: (action, meta2) => emit$6(category, "warn", action, meta2),
    error: (action, meta2) => emit$6(category, "error", action, meta2)
  };
}
export const workspaceLog = makeLogger("workspace");
