// sanitize-track-props.js
import {
  _initialized,
  _queueEvent,
  _sdk,
  _sendTrackEvent,
  _trackingDisabled,
  _userReady,
} from "./init-track.js";
import { _guard } from "./create-guard-reporter.jsx";

const MAX_PROP_STRING_LENGTH = 1024;

const MAX_STACK_PROP_STRING_LENGTH = 2048;

const MAX_PROP_COUNT = 64;

function isStackField(key2) {
  return key2.toLowerCase().includes("stack");
}

function isSafelySerializable(value) {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}

function sanitizeTrackProps(properties2) {
  const out = {};
  let truncated = 0;
  let dropped = 0;
  let kept = 0;
  for (const [key2, value] of Object.entries(properties2)) {
    if (kept >= MAX_PROP_COUNT) {
      dropped++;
      continue;
    }
    if (typeof value === "function" || typeof value === "symbol") {
      dropped++;
      continue;
    }
    if (typeof value === "string") {
      const limit = isStackField(key2)
        ? MAX_STACK_PROP_STRING_LENGTH
        : MAX_PROP_STRING_LENGTH;
      if (value.length > limit) {
        out[key2] = value.slice(0, limit);
        truncated++;
      } else {
        out[key2] = value;
      }
      kept++;
      continue;
    }
    if (
      value !== null &&
      typeof value === "object" &&
      !isSafelySerializable(value)
    ) {
      dropped++;
      continue;
    }
    if (typeof value === "bigint") {
      dropped++;
      continue;
    }
    out[key2] = value;
    kept++;
  }
  if (dropped > 0) {
    console.warn(
      `[track] sanitize dropped ${dropped} propert(y/ies) (max ${MAX_PROP_COUNT} props; functions/symbols/circular values rejected)`,
    );
  }
  return {
    props: out,
    truncatedStrings: truncated,
    droppedProps: dropped,
  };
}

const _debugListeners = new Set();

function _notifyDebugListeners(eventName, properties2) {
  if (_debugListeners.size === 0) return;
  const event = {
    eventName,
    properties: properties2,
    timestamp: Date.now(),
  };
  for (const listener of _debugListeners) {
    try {
      listener(event);
    } catch {}
  }
}

export function trackEvent(eventName, properties2 = {}) {
  const sanitized = sanitizeTrackProps(properties2);
  if (sanitized.truncatedStrings > 0 || sanitized.droppedProps > 0) {
    _guard.note({
      truncated_strings: sanitized.truncatedStrings,
      dropped_props: sanitized.droppedProps,
    });
  }
  _notifyDebugListeners(eventName, sanitized.props);
  if (_trackingDisabled) return;
  if (!_initialized || !_sdk || !_userReady) {
    _queueEvent(eventName, sanitized.props);
    return;
  }
  _sendTrackEvent(eventName, sanitized.props);
}
