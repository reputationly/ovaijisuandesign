/**
 * 4.0.4 canvas-v3 性能事件。
 *
 * 只写 `performance.measure` + 本地订阅，不发网络；参照的 RUM 上报不在本项目范围。
 * 名字与 4.0.4 `hilo:canvas-v3:*` 完全一致，方便调试面板/诊断脚本按名取。
 */
export const PERF_CANVAS_V3_PREFIX = "hilo:canvas-v3:";
export const PERF_CANVAS_V3_WORKSPACE_ACTIVATE = "hilo:canvas-v3:workspace-activate";
export const PERF_CANVAS_V3_AREA_MOUNT = "hilo:canvas-v3:canvas-area-mount";
export const PERF_CANVAS_V3_RESOURCE_VIEW = "hilo:canvas-v3:resource-view";
export const PERF_CANVAS_V3_ARCHITECTURE = "hilo:canvas-v3:architecture-query";
export const PERF_CANVAS_V3_CHUNK_WORKBENCH = "hilo:canvas-v3:chunk-workbench";
export const PERF_CANVAS_V3_CHUNK_CANVAS_AREA = "hilo:canvas-v3:chunk-canvas-area";
export const PERF_CANVAS_V3_GATEWAY_BINDING = "hilo:canvas-v3:gateway-binding";
export const PERF_CANVAS_V3_SESSION_ACQUIRE = "hilo:canvas-v3:session-acquire";
export const PERF_CANVAS_V3_DOC_LOAD = "hilo:canvas-v3:doc-load";
export const PERF_CANVAS_V3_DOC_FETCH = "hilo:canvas-v3:doc-fetch";
export const PERF_CANVAS_V3_DOC_PARSE = "hilo:canvas-v3:doc-parse";
export const PERF_CANVAS_V3_CONTENT_BATCH = "hilo:canvas-v3:content-batch";
export const PERF_CANVAS_V3_CONTENT_FIRST_PUBLISH = "hilo:canvas-v3:content-first-publish";
export const PERF_CANVAS_V3_CONTENT_INITIAL = "hilo:canvas-v3:content-initial";
export const PERF_CANVAS_V3_FIRST_NODE_COMMIT = "hilo:canvas-v3:first-node-commit";
export const PERF_CANVAS_V3_FIRST_NODE_PAINT = "hilo:canvas-v3:first-node-paint";
export const PERF_CANVAS_V3_FIRST_IMAGE_READY = "hilo:canvas-v3:first-image-ready";
export const PERF_CANVAS_V3_IMAGES_SETTLED = "hilo:canvas-v3:images-settled";
export const PERF_CANVAS_V3_SWITCH_PROJECTION = "hilo:canvas-v3:switch-projection";
export const PERF_CANVAS_V3_SWITCH_FIRST_FRAME = "hilo:canvas-v3:switch-first-frame";
export const PERF_CANVAS_V3_SELECTION_PROJECTION = "hilo:canvas-v3:selection-projection";
export const PERF_CANVAS_V3_SELECTION_INPUT = "hilo:canvas-v3:selection-input";
export const PERF_CANVAS_V3_ZOOM_GESTURE = "hilo:canvas-v3:zoom-gesture";
export const PERF_CANVAS_V3_ZOOM_LONG_FRAMES = "hilo:canvas-v3:zoom-long-frames";

const RETAIN_PER_NAME = 100;
const listeners = new Set();
const counts = new Map();

export function recordPerfSpan(name, startTime, detail, endTime) {
  if (typeof performance === "undefined") return;
  const end = Math.max(startTime, endTime ?? performance.now());
  try {
    const count = (counts.get(name) ?? 0) + 1;
    if (count > RETAIN_PER_NAME) {
      performance.clearMeasures(name);
      counts.set(name, 1);
    } else {
      counts.set(name, count);
    }
    performance.measure(name, { start: startTime, end, ...(detail ? { detail } : {}) });
  } catch {
    // performance.measure 在某些环境下会因 detail 不可序列化失败；计时不能反过来影响功能
  }
  if (!listeners.size) return;
  const span = { name, startTime, endTime: end, ...(detail ? { detail } : {}) };
  for (const listener of [...listeners]) {
    try {
      listener(span);
    } catch {
      // 单个监听器失败不影响其他监听器
    }
  }
}

export function subscribePerfSpans(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
