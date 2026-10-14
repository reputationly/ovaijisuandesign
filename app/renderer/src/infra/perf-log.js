// 性能日志的刷写和格式化是应用埋点。


export const PERF_LOG_FLUSH = "hilo:log:flush";
export const PERF_CANVAS_PERSIST_HTTP_ROUNDTRIP = "hilo:canvas:persist-http-roundtrip";
export const measurePerfCounters = /* @__PURE__ */new Map();
export function measurePerf(metricName, start, detail, options = {}) {
  const samplingRate = options.samplingRate;
  if (samplingRate !== void 0 && samplingRate > 1) {
    const current = (measurePerfCounters.get(metricName) ?? 0) + 1;
    measurePerfCounters.set(metricName, current);
    if (current % samplingRate !== 0) return;
  }
  const measuredDetail = mergePerfMetadata(detail, options.metadata);
  try {
    if (measuredDetail === void 0) {
      performance.measure(metricName, {
        start
      });
    } else {
      performance.measure(metricName, {
        start,
        detail: measuredDetail
      });
    }
  } catch {} finally {
    try {
      performance.clearMeasures(metricName);
    } catch {}
  }
}
export function mergePerfMetadata(detail, metadata) {
  if (!metadata) return detail;
  const enriched = {};
  if (metadata.workspaceId !== void 0) enriched.workspaceId = metadata.workspaceId;
  if (metadata.sessionId !== void 0) enriched.sessionId = metadata.sessionId;
  if (metadata.sessionCount !== void 0) enriched.sessionCount = metadata.sessionCount;
  if (detail === void 0) {
    return enriched;
  }
  if (detail === null || typeof detail !== "object" || Array.isArray(detail)) {
    return {
      detail,
      ...enriched
    };
  }
  const merged = detail;
  return {
    ...merged,
    ...enriched
  };
}
export const MAX_VALUE_LEN = 256;
export function fmtValue(value) {
  if (value === null || value === void 0) return String(value);
  if (typeof value === "string") {
    return value.length > MAX_VALUE_LEN ? `${value.slice(0, MAX_VALUE_LEN)}…` : value;
  }
  if (value instanceof Error) {
    return value.message.length > MAX_VALUE_LEN ? `${value.message.slice(0, MAX_VALUE_LEN)}…` : value.message;
  }
  try {
    const json = JSON.stringify(value);
    return json.length > MAX_VALUE_LEN ? `${json.slice(0, MAX_VALUE_LEN)}…` : json;
  } catch {
    return String(value);
  }
}
export const LOG_TAG = "[AgentHttp]";
export const defaultLogger = {
  warn: msg => console.warn(msg),
  error: msg => console.error(msg)
};
