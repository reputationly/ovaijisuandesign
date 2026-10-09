// shared/init-track.js
import { resolveEventIpCountry } from "./track-events.js";
import { sanitizeTrackProps, _guard, _notifyDebugListeners, MAX_PENDING_EVENTS } from "./transitioner.jsx";
import { buildBaseProps } from "./detect-os-parts.js";
import { TRACK_PROJECT_NAME, resolveTrackServerUrl } from "./use-browser-overlay-dialog-props.jsx";
const USER_BINDING_FALLBACK_MS = 1e4;
let _sdk = null;
let _baseProps = null;
let _initialized = false;
let _trackingDisabled = false;
let _initPromise = null;
export let _pendingUser = null;
export let _userBindingVersion = 0;
export let _userBindingInFlightVersion = null;
export let _userReady = false;
let _pendingEvents = [];
let _userReadyResolve = null;
export const _userReadyPromise = new Promise((resolve) => {
  _userReadyResolve = resolve;
});
export function _markUserReady() {
  _userReady = true;
  if (_userReadyResolve) {
    _userReadyResolve();
    _userReadyResolve = null;
  }
  _flushPendingEvents();
}
function _queueEvent(eventName, properties2) {
  if (_pendingEvents.length >= MAX_PENDING_EVENTS) {
    _pendingEvents = _pendingEvents.slice(1);
    _guard.note({
      dropped_events: 1,
    });
  }
  _pendingEvents.push({
    eventName,
    properties: properties2,
  });
}
function _sendTrackEvent(eventName, properties2) {
  if (!_initialized || !_sdk) return;
  const finalProperties = {
    ...properties2,
    ip_country: resolveEventIpCountry(properties2.ip_country, _baseProps?.ip_country ?? ""),
  };
  _sdk.track(eventName, finalProperties).catch((err) => {
    console.warn(`[track] failed to send "${eventName}":`, err);
  });
}
function _flushPendingEvents() {
  if (!_initialized || !_sdk || !_userReady || _pendingEvents.length === 0) return;
  const events2 = _pendingEvents;
  _pendingEvents = [];
  for (const event of events2) {
    _sendTrackEvent(event.eventName, event.properties);
  }
}
function _finishUserBinding(version2) {
  if (_userBindingInFlightVersion === version2) {
    _userBindingInFlightVersion = null;
  }
  if (version2 === _userBindingVersion) {
    _markUserReady();
  }
}
function _scheduleUserBindingFallback(version2) {
  setTimeout(() => {
    if (
      version2 === _userBindingVersion &&
      !_userReady &&
      _userBindingInFlightVersion === version2
    ) {
      _finishUserBinding(version2);
    }
  }, USER_BINDING_FALLBACK_MS);
}
function _applyPendingUserIfReady(version2) {
  if (!_initialized || !_sdk || !_pendingUser) return;
  const pendingUser = _pendingUser;
  _pendingUser = null;
  _userBindingInFlightVersion = version2;
  _scheduleUserBindingFallback(version2);
  _sdk
    .login(pendingUser.userId)
    .then(async () => {
      if (pendingUser.profile && Object.keys(pendingUser.profile).length > 0) {
        await _sdk?.set(pendingUser.profile);
      }
    })
    .catch((err) => console.warn("[track] login failed:", err))
    .finally(() => {
      _finishUserBinding(version2);
    });
}
export function initTrack(opts) {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    try {
      const mod = await (() => import("../mmx-sensor-track.esm-VwEZ9g-g.js"))();
      const sdk = mod.default;
      const serverUrl = opts.serverUrlOverride ?? resolveTrackServerUrl(opts.region, opts.channel);
      await sdk.init({
        server_url: serverUrl,
        project_name: TRACK_PROJECT_NAME,
        debug: opts.debug ?? false,
      });
      const baseProps = buildBaseProps(opts);
      await sdk.registerPage(baseProps);
      _sdk = sdk;
      _baseProps = baseProps;
      _initialized = true;
      _applyPendingUserIfReady(_userBindingVersion);
      _flushPendingEvents();
    } catch (err) {
      console.warn("[track] init failed, becoming no-op:", err);
      _initialized = false;
      _trackingDisabled = true;
      _pendingEvents = [];
    }
  })();
  return _initPromise;
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
export function setTrackUser(userId, profile) {
  _userBindingVersion += 1;
  _userReady = false;
  _pendingUser = {
    userId,
    profile,
  };
  _applyPendingUserIfReady(_userBindingVersion);
}
export function clearTrackUser() {
  _userBindingVersion += 1;
  const version2 = _userBindingVersion;
  _pendingUser = null;
  _userReady = false;
  if (!_initialized || !_sdk) {
    _markUserReady();
    return;
  }
  _sdk
    .logout()
    .catch((err) => console.warn("[track] logout failed:", err))
    .finally(() => {
      if (version2 === _userBindingVersion) {
        _markUserReady();
      }
    });
}
