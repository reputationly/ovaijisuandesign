// init-track.js
import { _guard } from "./create-guard-reporter.jsx";

function resolveEventIpCountry(eventValue, fallback) {
  return typeof eventValue === "string" ? eventValue : fallback;
}

const MAX_PENDING_EVENTS = 100;

const USER_BINDING_FALLBACK_MS = 1e4;

export let _sdk = null;

let _baseProps = null;

export let _initialized = false;

// 神策上报已停用：不再加载统计脚本，trackEvent 直接返回。
export let _trackingDisabled = true;

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

export function _queueEvent(eventName, properties2) {
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

export function _sendTrackEvent(eventName, properties2) {
  if (!_initialized || !_sdk) return;
  const finalProperties = {
    ...properties2,
    ip_country: resolveEventIpCountry(
      properties2.ip_country,
      _baseProps?.ip_country ?? "",
    ),
  };
  _sdk.track(eventName, finalProperties).catch((err) => {
    console.warn(`[track] failed to send "${eventName}":`, err);
  });
}

function _flushPendingEvents() {
  if (!_initialized || !_sdk || !_userReady || _pendingEvents.length === 0)
    return;
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

export function initTrack() {
  _markUserReady();
  return Promise.resolve();
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
