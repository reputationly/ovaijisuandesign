/**
 * 令牌页和主进程之间的通道名。单独一个文件、没有任何依赖，preload 只引它，不会把主进程的逻辑打进去。
 */
export const GATE_CHANNELS = {
  info: "ov-gate:info",
  save: "ov-gate:save",
  quit: "ov-gate:quit",
} as const;
