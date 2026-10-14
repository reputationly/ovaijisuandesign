// create-guard-reporter.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { __jsx } from "../shared/jsx-runtime.js";

const GUARD_SUMMARY_INTERVAL_MS = 6e4;

function zeroCounters() {
  return {
    truncated_strings: 0,
    dropped_props: 0,
    dropped_events: 0,
  };
}

function createGuardReporter(scope, intervalMs = GUARD_SUMMARY_INTERVAL_MS) {
  const totals = zeroCounters();
  let windowCounters = zeroCounters();
  let timer = null;
  function flushNow() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (
      windowCounters.truncated_strings === 0 &&
      windowCounters.dropped_props === 0 &&
      windowCounters.dropped_events === 0
    ) {
      return;
    }
    console.warn(
      `[${scope}] guard summary: dropped_events=${windowCounters.dropped_events} dropped_props=${windowCounters.dropped_props} truncated_strings=${windowCounters.truncated_strings} (totals: ${totals.dropped_events}/${totals.dropped_props}/${totals.truncated_strings})`,
    );
    windowCounters = zeroCounters();
  }
  function note(delta) {
    for (const key of Object.keys(totals)) {
      const keyDelta = delta[key] ?? 0;
      totals[key] += keyDelta;
      windowCounters[key] += keyDelta;
    }
    if (!timer) {
      timer = setTimeout(flushNow, intervalMs);
      timer.unref?.();
    }
  }
  return {
    note,
    totals: () => ({
      ...totals,
    }),
    flushNow,
  };
}

export const _guard = createGuardReporter("track:browser");

export var useLayoutEffect =
  typeof window !== "undefined"
    ? reactExports.useLayoutEffect
    : reactExports.useEffect;

export function SafeFragment(props) {
  return <>{props.children}</>;
}
