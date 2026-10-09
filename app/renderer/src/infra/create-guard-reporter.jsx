// create-guard-reporter.jsx
import { jsxRuntimeExports, reactExports } from "../vendor.js";
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
  let window2 = zeroCounters();
  let timer2 = null;
  function flushNow() {
    if (timer2) {
      clearTimeout(timer2);
      timer2 = null;
    }
    if (
      window2.truncated_strings === 0 &&
      window2.dropped_props === 0 &&
      window2.dropped_events === 0
    ) {
      return;
    }
    console.warn(
      `[${scope}] guard summary: dropped_events=${window2.dropped_events} dropped_props=${window2.dropped_props} truncated_strings=${window2.truncated_strings} (totals: ${totals.dropped_events}/${totals.dropped_props}/${totals.truncated_strings})`,
    );
    window2 = zeroCounters();
  }
  function note(delta) {
    for (const key2 of Object.keys(totals)) {
      const d2 = delta[key2] ?? 0;
      totals[key2] += d2;
      window2[key2] += d2;
    }
    if (!timer2) {
      timer2 = setTimeout(flushNow, intervalMs);
      timer2.unref?.();
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
