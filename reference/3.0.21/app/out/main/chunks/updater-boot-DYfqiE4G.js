import { c as createVelopackUpdaterTransport, V as VelopackCancellationToken, i as isUpdaterInstallRequested, t as trackEvent, b as buildUpdaterFailureProps, T as TRACK_EVENTS, v as validateWindowsInstallBoundary, g as getDesignDownloadUrl, I as IUpdaterService, U as UPDATE_RUNTIME_UNAVAILABLE, a as UPDATE_BASE_URL, d as getCategoryLogger, r as releaseChannel, A as APP_NAME, e as releaseRegion } from "./index-E7UhlmOX.js";
import { app, powerMonitor, net } from "electron";
import { s as shouldUseVelopackUpdaterTransport, i as isVelopackUpdaterRuntime, d as resolvePackagedVelopackChannel } from "../index.js";
import { A as API_PATHS } from "./safe-spawn-path-DD3xknOt.js";
import "node:fs";
import "node:path";
import "./python-runtime-ZdSS6sqy.js";
import "node:child_process";
import "node:crypto";
import "node:net";
import "node:os";
import "node:util";
import "node:tls";
import "node:url";
import "node:http";
import "node:sqlite";
import "node:stream";
import "node:stream/promises";
import "events";
import "fs";
import "node:events";
import "node:string_decoder";
import "path";
import "assert";
import "buffer";
import "zlib";
import "node:assert";
import "node:fs/promises";
import "./extract-zip-safe-Bhxshmqd.js";
import "constants";
import "stream";
import "util";
import "node:timers/promises";
import "module";
import "./windows-junction-path-BTcT19J3.js";
import "child_process";
import "os";
import "http";
import "https";
import "node:zlib";
import "node:perf_hooks";
import "node:inspector";
import "node:v8";
import "node:worker_threads";
import "node:process";
import "node:vm";
import "node:module";
import "net";
import "tls";
import "crypto";
import "url";
import "tty";
import "http2";
import "querystring";
import "dns";
import "punycode";
import "node:https";
import "./worker-protocol-Rm4q_d5O.js";
const CORRUPTION_PATTERNS = [
  "sha512",
  "checksum mismatch",
  "ERR_UPDATER_INVALID_SIGNATURE",
  "is not signed by the application owner"
];
function isDownloadCorruptionError(message) {
  return CORRUPTION_PATTERNS.some((pattern) => message.includes(pattern));
}
const CAMPAIGN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;
const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+(?:[-.][A-Za-z0-9._-]+)?$/u;
const FEED_ID_PATTERN = /^([0-9]+\.[0-9]+\.[0-9]+(?:[-.][A-Za-z0-9._-]+)?)\/([A-Za-z0-9][A-Za-z0-9._-]{0,127})$/u;
const VELOPACK_CHANNEL_PATTERN = /^win(?:-(?:test|staging))?$/u;
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function resolveWindowsInstallerUrl(baseUrl, productName, version) {
  if (!VERSION_PATTERN.test(version) || productName.trim() === "") return null;
  try {
    const base = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
    if (base.protocol !== "https:") return null;
    const installer = new URL(encodeURIComponent(`${productName}-${version}-x64-Setup.exe`), base);
    if (installer.origin !== base.origin || !installer.pathname.startsWith(base.pathname)) {
      return null;
    }
    return installer.toString();
  } catch {
    return null;
  }
}
function parseDesktopUpdateAssignment(value, now = Date.now()) {
  if (!isRecord(value)) return null;
  const raw = value.desktop_update_assignment;
  if (!isRecord(raw)) return null;
  const campaignId = raw.campaign_id;
  const feedId = raw.feed_id;
  const expiresAt = raw.expires_at;
  if (typeof campaignId !== "string" || !CAMPAIGN_ID_PATTERN.test(campaignId) || typeof feedId !== "string" || !FEED_ID_PATTERN.test(feedId) || typeof expiresAt !== "string") {
    return null;
  }
  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now) return null;
  return { campaignId, feedId, expiresAt };
}
function resolveAssignedUpdateFeed(productionBaseUrl, velopackChannel, productName, assignment) {
  if (!VELOPACK_CHANNEL_PATTERN.test(velopackChannel)) return null;
  const feedMatch = FEED_ID_PATTERN.exec(assignment.feedId);
  if (!feedMatch) return null;
  try {
    const productionBase = new URL(
      productionBaseUrl.endsWith("/") ? productionBaseUrl : `${productionBaseUrl}/`
    );
    if (productionBase.protocol !== "https:") return null;
    const version = feedMatch[1];
    const buildStamp = feedMatch[2];
    const assigned = new URL(
      `velopack/${velopackChannel}/builds/${version}/${buildStamp}/`,
      productionBase
    );
    if (assigned.origin !== productionBase.origin || !assigned.pathname.startsWith(productionBase.pathname)) {
      return null;
    }
    const baseUrl = assigned.toString().replace(/\/$/u, "");
    const manualInstallerUrl = resolveWindowsInstallerUrl(baseUrl, productName, version);
    if (!manualInstallerUrl) return null;
    return { campaignId: assignment.campaignId, baseUrl, manualInstallerUrl };
  } catch {
    return null;
  }
}
async function fetchAssignedUpdateFeed(options) {
  const endpoint = new URL(API_PATHS.hubClientConfig, `${options.gatewayUrl.replace(/\/$/u, "")}/`);
  try {
    const response = await options.fetchImpl(endpoint.toString(), {
      method: "GET",
      headers: options.token ? { token: options.token } : void 0,
      signal: AbortSignal.timeout(options.timeoutMs ?? 3e3)
    });
    if (!response.ok) return null;
    const assignment = parseDesktopUpdateAssignment(await response.json(), options.now);
    return assignment ? resolveAssignedUpdateFeed(
      options.productionBaseUrl,
      options.velopackChannel,
      options.productName,
      assignment
    ) : null;
  } catch {
    return null;
  }
}
const log = getCategoryLogger("update", "boot");
let activeGatewayUrl;
const UPDATE_RUNTIME_UNAVAILABLE_MESSAGE = "The automatic update component is unavailable. Reinstall from the official website.";
function createInertUpdaterTransport(appVersion) {
  const unavailable = async () => {
    throw new Error(UPDATE_RUNTIME_UNAVAILABLE);
  };
  return {
    on: () => void 0,
    checkForUpdates: unavailable,
    downloadUpdate: unavailable,
    quitAndInstall: () => {
      throw new Error(UPDATE_RUNTIME_UNAVAILABLE);
    },
    autoInstallOnAppQuit: false,
    currentVersion: { version: appVersion }
  };
}
function nonblockingUpdaterBootstrapEnabled() {
  return process.env.HILO_NONBLOCKING_UPDATER_BOOTSTRAP !== "false";
}
let activeVelopackTransport = null;
let updateFeedAssignmentStarted = false;
let activeAssignedUpdateFeed = null;
let getUpdateFeedToken = () => "";
async function applyAssignedUpdateFeed(gatewayUrl) {
  if (updateFeedAssignmentStarted || !activeVelopackTransport || process.platform !== "win32") {
    return activeAssignedUpdateFeed;
  }
  const token = getUpdateFeedToken();
  if (!token) return null;
  updateFeedAssignmentStarted = true;
  const assigned = await fetchAssignedUpdateFeed({
    gatewayUrl,
    token,
    productionBaseUrl: UPDATE_BASE_URL,
    velopackChannel: resolvePackagedVelopackChannel(process.platform, process.arch, releaseChannel),
    productName: APP_NAME,
    fetchImpl: (url, init) => net.fetch(url instanceof URL ? url.toString() : url, init)
  });
  if (!assigned) return null;
  if (activeVelopackTransport.setFeedUrl(assigned.baseUrl)) {
    activeAssignedUpdateFeed = assigned;
    process.env.HILO_UPDATE_CAMPAIGN_ID = assigned.campaignId;
    log.info(`Applied targeted updater feed assignment: campaign=${assigned.campaignId}`);
  } else {
    log.warn(
      `Ignored targeted updater feed assignment after update selection started: campaign=${assigned.campaignId}`
    );
  }
  return activeAssignedUpdateFeed;
}
async function buildUpdaterServiceConfig(options) {
  getUpdateFeedToken = options.getUserToken ?? (() => "");
  const useVelopack = shouldUseVelopackUpdaterTransport(options.isDev);
  let velopackTransport = null;
  const prepareVelopackNetworkEnvironment = options.prepareVelopackNetworkEnvironment;
  const updaterRuntime = useVelopack ? (() => {
    velopackTransport = createVelopackUpdaterTransport(
      UPDATE_BASE_URL,
      void 0,
      prepareVelopackNetworkEnvironment ? () => prepareVelopackNetworkEnvironment(UPDATE_BASE_URL) : void 0,
      void 0,
      validateWindowsInstallBoundary
    );
    activeVelopackTransport = velopackTransport;
    return {
      autoUpdater: velopackTransport,
      CancellationToken: VelopackCancellationToken
    };
  })() : options.isDev ? await import("./main-DvlhVGpV.js").then((n) => n.m).then((electronUpdater) => ({
    autoUpdater: electronUpdater.default.autoUpdater,
    CancellationToken: electronUpdater.CancellationToken
  })) : {
    autoUpdater: createInertUpdaterTransport(app.getVersion()),
    CancellationToken: VelopackCancellationToken
  };
  return {
    autoUpdater: updaterRuntime.autoUpdater,
    CancellationToken: updaterRuntime.CancellationToken,
    supportsDownloadCancellation: options.isDev && !useVelopack,
    appVersion: app.getVersion(),
    enableAutoInstallOnQuit: options.enableAutoInstallOnQuit,
    isManagedInstallOnQuitEnabled: options.isManagedInstallOnQuitEnabled,
    startupCheckDelay: 5e3,
    periodicCheckInterval: 60 * 60 * 1e3,
    isDev: options.isDev,
    getGatewayUrl: () => activeGatewayUrl,
    manualDownloadFallbackUrl: getDesignDownloadUrl(releaseRegion),
    resolveManualDownloadUrl: (targetVersion, preferredUrl) => process.platform === "win32" && activeAssignedUpdateFeed?.manualInstallerUrl || preferredUrl || (process.platform === "win32" && targetVersion ? resolveWindowsInstallerUrl(UPDATE_BASE_URL, APP_NAME, targetVersion) : null) || getDesignDownloadUrl(releaseRegion),
    resolveUpdatePolicy: async (resolveOptions) => {
      if (activeGatewayUrl) await applyAssignedUpdateFeed(activeGatewayUrl);
      const { resolveStartupUpdatePolicy } = await import("./update-policy-fetcher-lRxjVMGl.js");
      return resolveStartupUpdatePolicy({
        currentVersion: app.getVersion(),
        userDataPath: app.getPath("userData"),
        platform: process.platform,
        preferCache: nonblockingUpdaterBootstrapEnabled() && resolveOptions?.preferCache === true
      });
    },
    fetchChangelog: async (v) => {
      const { fetchChangelogForUpdate } = await import("./changelog-fetcher-umwzaYJ-.js");
      return fetchChangelogForUpdate(v);
    },
    installUpdate: async (targetVersion, installOptions) => {
      if (velopackTransport) {
        const { installDownloadedVelopackUpdate } = await import("./index-E7UhlmOX.js").then((n) => n.p);
        return installDownloadedVelopackUpdate(
          (beforeNativeApply) => velopackTransport?.quitAndInstall(
            installOptions?.isSilent ?? false,
            installOptions?.isForceRunAfter ?? true,
            void 0,
            beforeNativeApply
          ),
          targetVersion,
          installOptions,
          {
            packageSizeBytes: velopackTransport.getDownloadedFullRelease()?.Size,
            validatePackageIdentity: () => velopackTransport?.isDownloadedFullReleasePending() === true,
            validateInstallBoundary: (installDir) => validateWindowsInstallBoundary(installDir)
          }
        );
      }
      log.warn("installUpdate ignored: no Velopack transport (dev / non-packaged runtime)");
      return false;
    },
    showToast: (version) => {
      import("./utils-j9tv3NlA.js").then((m) => m.showUpdaterToast(version));
    },
    uploadFailure: (_gw, msg) => {
      import("./index-E7UhlmOX.js").then((n) => n.o).then((m) => m.uploadUpdaterFailureMessage(msg));
    },
    onFailureTelemetry: (info) => {
      trackEvent(TRACK_EVENTS.UPDATER_FAILURE, buildUpdaterFailureProps(info));
    },
    purgeCache: async () => {
      log.info("Velopack owns its package cache; nothing to purge");
    },
    isInstallHandoffInProgress: () => isUpdaterInstallRequested(),
    isCorruptionError: (msg) => isDownloadCorruptionError(msg),
    isOnline: () => net.isOnline(),
    onSuspend: (cb) => powerMonitor.on("suspend", cb),
    onResume: (cb) => powerMonitor.on("resume", cb),
    log: options.log
  };
}
async function runUpdaterPolicyBootstrap(container, windowService, gatewayUrl, bootMsNow) {
  activeGatewayUrl = gatewayUrl;
  const updateFeedAssignment = applyAssignedUpdateFeed(gatewayUrl);
  void updateFeedAssignment.catch((error) => {
    log.warn(`Targeted updater feed assignment failed; keeping stable feed: ${error}`);
  });
  const updaterSvc = container.invokeFunction((accessor) => accessor.get(IUpdaterService));
  if (app.isPackaged && !isVelopackUpdaterRuntime()) {
    log.error(
      "[boot] packaged runtime has no Velopack backend; skipping update policy and exposing manual recovery"
    );
    updaterSvc.reportPreviousInstallFailure({
      message: UPDATE_RUNTIME_UNAVAILABLE_MESSAGE,
      fromVersion: app.getVersion(),
      manualDownloadUrl: getDesignDownloadUrl(releaseRegion),
      failureCode: UPDATE_RUNTIME_UNAVAILABLE
    });
    try {
      trackEvent(
        TRACK_EVENTS.UPDATER_FAILURE,
        buildUpdaterFailureProps({
          phase: "bootstrap",
          message: UPDATE_RUNTIME_UNAVAILABLE_MESSAGE,
          retryable: false,
          retryCount: 0,
          fromVersion: app.getVersion(),
          targetVersion: null
        })
      );
    } catch (error) {
      log.warn(`[boot] failed to emit unavailable updater runtime telemetry: ${error}`);
    }
    const { state: state2 } = await updaterSvc.getState();
    windowService.setUpdaterBootstrap(JSON.stringify(state2));
    updaterSvc.onStateChanged(({ state: nextState }) => {
      windowService.setUpdaterBootstrap(JSON.stringify(nextState));
    });
    return;
  }
  const policyStartedAt = Date.now();
  await updaterSvc.initializePolicy();
  const { state } = await updaterSvc.getState();
  const policyDurationMs = Date.now() - policyStartedAt;
  const policySource = state.policySource ?? state.forceSource;
  log.info(
    `[boot] update policy bootstrap: ${policyDurationMs}ms (source=${policySource}, status=${state.policyStatus}) T+${bootMsNow()}ms`
  );
  trackEvent(TRACK_EVENTS.UPDATER_POLICY_BOOTSTRAP, {
    duration_ms: policyDurationMs,
    source: policySource,
    prefer_cache_enabled: nonblockingUpdaterBootstrapEnabled()
  });
  windowService.setUpdaterBootstrap(JSON.stringify(state));
  updaterSvc.onStateChanged(({ state: nextState }) => {
    windowService.setUpdaterBootstrap(JSON.stringify(nextState));
  });
}
export {
  buildUpdaterServiceConfig,
  nonblockingUpdaterBootstrapEnabled,
  runUpdaterPolicyBootstrap
};
