// init-track.js
import { _guard } from "./create-guard-reporter.jsx";

function resolveEventIpCountry(eventValue, fallback) {
  return typeof eventValue === "string" ? eventValue : fallback;
}

const TRACK_PROJECT_NAME = "hub";

const TRACK_SERVER_URL = {
  domestic: {
    prod: "https://data.hailuoai.com/meerkat-reporter/api/report?project=hub",
    nonprod:
      "https://bigdata-test.xingyeai.com/meerkat-reporter/api/report?project=hub",
  },
  overseas: {
    prod: "https://data.hailuoai.video/meerkat-reporter/api/report?project=hub",
    nonprod:
      "https://bigdata-test.talkie-ai.com/meerkat-reporter/api/report?project=hub",
  },
};

function resolveTrackServerUrl(region, channel) {
  const bucket = channel === "prod" ? "prod" : "nonprod";
  return TRACK_SERVER_URL[region][bucket];
}

const MAX_PENDING_EVENTS = 100;

// shared/detect-os-parts.js
function normalizePlatform(p3) {
  switch (p3) {
    case "darwin":
      return "macos";
    case "win32":
      return "windows";
    case "linux":
      return "linux";
    default:
      return p3;
  }
}

function safeRequireNodeOs() {
  if (typeof process === "undefined" || !process.versions?.node) return null;
  try {
    const req = new Function("m", "return require(m)");
    return req("node:os");
  } catch {
    return null;
  }
}

function detectOsParts() {
  const nodeOs = safeRequireNodeOs();
  if (nodeOs) {
    return {
      name: normalizePlatform(nodeOs.platform()),
      version: nodeOs.release(),
      arch: nodeOs.arch(),
    };
  }
  const name2 =
    typeof process !== "undefined" && process.platform
      ? normalizePlatform(process.platform)
      : (navigator?.userAgentData?.platform ?? "unknown");
  const arch =
    typeof process !== "undefined" && process.arch ? process.arch : "";
  let version2 = "";
  if (typeof navigator !== "undefined" && navigator.userAgent) {
    const m3 = navigator.userAgent.match(/\(([^)]+)\)/);
    if (m3) {
      const part = m3[1]
        .split(";")
        .map((s2) => s2.trim())
        .find((s2) => /Mac OS X|Windows NT|Linux/i.test(s2));
      if (part) version2 = part;
    }
  }
  return {
    name: name2,
    version: version2,
    arch,
  };
}

function joinOs(parts) {
  return [parts.name, parts.version, parts.arch].filter(Boolean).join(" ");
}

function safeIntlOptions() {
  try {
    return Intl.DateTimeFormat().resolvedOptions();
  } catch {
    return null;
  }
}

function detectElectronVersion(override) {
  if (override) return override;
  if (typeof process === "undefined") return void 0;
  return process.versions?.electron;
}

function detectChromeVersion(override) {
  if (override) return override;
  if (typeof process === "undefined") return void 0;
  return process.versions?.chrome;
}

function detectCpuCount(override) {
  if (typeof override === "number") return override;
  const nodeOs = safeRequireNodeOs();
  if (!nodeOs) return void 0;
  try {
    return nodeOs.cpus().length;
  } catch {
    return void 0;
  }
}

function detectTotalMemoryMb(override) {
  if (typeof override === "number") return override;
  const nodeOs = safeRequireNodeOs();
  if (!nodeOs) return void 0;
  try {
    return Math.round(nodeOs.totalmem() / 1024 / 1024);
  } catch {
    return void 0;
  }
}

function buildBaseProps(opts) {
  const parts = detectOsParts();
  const intl = safeIntlOptions();
  return {
    app_version: opts.appVersion,
    process_type: opts.processType,
    os: opts.os ?? joinOs(parts),
    os_name: parts.name,
    os_version: parts.version,
    arch: parts.arch,
    region: opts.region,
    channel: opts.channel,
    env: opts.env,
    device_id: opts.deviceId,
    download_source: opts.downloadSource ?? "default",
    update_backend: opts.updateBackend ?? "electron-updater",
    ip_country: opts.ipCountry ?? "",
    electron_version: detectElectronVersion(opts.electronVersion),
    chrome_version: detectChromeVersion(opts.chromeVersion),
    cpu_count: detectCpuCount(opts.cpuCount),
    total_memory_mb: detectTotalMemoryMb(opts.totalMemoryMb),
    locale: opts.locale ?? intl?.locale,
    timezone: opts.timezone ?? intl?.timeZone,
  };
}

const USER_BINDING_FALLBACK_MS = 1e4;

export let _sdk = null;

let _baseProps = null;

export let _initialized = false;

export let _trackingDisabled = false;

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

export function initTrack(opts) {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    try {
      const mod = await (() => import("../mmx-sensor-track.esm-VwEZ9g-g.js"))();
      const sdk = mod.default;
      const serverUrl =
        opts.serverUrlOverride ??
        resolveTrackServerUrl(opts.region, opts.channel);
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
