// start-perf-observer.js
import {
  recentLongTasks,
  recentSlowMeasures,
} from "../assets/credit-query-keys.jsx";

import {
  PERF_PREFIX,
  PERF_SLOW_DEFAULT_MS,
  PERF_SLOW_THRESHOLDS,
} from "../generation/to-workspace-browser-url.js";
import { measurePerf, PERF_LOG_FLUSH } from "./perf-log.js";

export let pendingLogLines = [];
export function flush() {
  if (pendingLogLines.length === 0) return;
  const start2 = performance.now();
  const lines = pendingLogLines;
  pendingLogLines = [];
  const combined = lines.join("\n");
  try {
    window.hilo.logger.info(combined, "perf");
  } catch {} finally {
    measurePerf(PERF_LOG_FLUSH, start2, {
      lines: lines.length,
      bytes: combined.length
    });
  }
}


const MAX_BUFFER = 200;

const FLUSH_INTERVAL_MS = 5e3;

function safeStringifyDetail(detail) {
  if (detail === void 0) return void 0;
  try {
    return JSON.stringify(detail, (_key, value) => {
      if (typeof value === "bigint") return value.toString();
      return value;
    });
  } catch {
    return "[unserializable detail]";
  }
}

function handleEntries(list) {
  for (const entry of list.getEntries()) {
    if (!entry.name.startsWith(PERF_PREFIX)) continue;
    const threshold = PERF_SLOW_THRESHOLDS[entry.name] ?? PERF_SLOW_DEFAULT_MS;
    const dur = Math.round(entry.duration * 100) / 100;
    if (dur < threshold) continue;
    const detail = entry.detail;
    const record = {
      name: entry.name,
      durationMs: dur,
      detail: detail ?? void 0,
      ts: Date.now(),
    };
    recentSlowMeasures.push(record);
    if (recentSlowMeasures.length > MAX_BUFFER) {
      recentSlowMeasures.shift();
    }
    const detailText = safeStringifyDetail(detail);
    pendingLogLines.push(
      `[slow] ${entry.name} ${dur}ms${detailText ? ` ${detailText}` : ""}`,
    );
  }
}

function normalizeEntryTimestamp(entry) {
  const timeOrigin = performance.timeOrigin;
  if (Number.isFinite(timeOrigin) && Number.isFinite(entry.startTime)) {
    return Math.round(timeOrigin + entry.startTime);
  }
  return Date.now();
}

function handleLongTaskEntries(list) {
  for (const entry of list.getEntries()) {
    const ts = normalizeEntryTimestamp(entry);
    const attribution = entry.attribution;
    recentLongTasks.push({
      name: entry.name || "longtask",
      durationMs: Math.round(entry.duration * 100) / 100,
      ts,
      tsIso: new Date(ts).toISOString(),
      ...(Array.isArray(attribution)
        ? {
            attributionCount: attribution.length,
          }
        : {}),
    });
    if (recentLongTasks.length > MAX_BUFFER) {
      recentLongTasks.shift();
    }
  }
}

let observer = null;

let longTaskObserver = null;

export function startPerfObserver() {
  if (
    observer ||
    typeof PerformanceObserver === "undefined" ||
    typeof hilo === "undefined" ||
    !hilo?.logger
  ) {
    return;
  }
  try {
    longTaskObserver = new PerformanceObserver(handleLongTaskEntries);
    longTaskObserver.observe({
      type: "longtask",
      buffered: true,
    });
  } catch {
    longTaskObserver = null;
  }
  observer = new PerformanceObserver(handleEntries);
  observer.observe({
    type: "measure",
    buffered: true,
  });
  setInterval(flush, FLUSH_INTERVAL_MS);
}
