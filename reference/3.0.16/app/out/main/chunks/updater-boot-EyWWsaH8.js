import path__default from "node:path";
import { s as setVelopackPackageMutationOwnershipValidator, v as validateCurrentVelopackInstallRoot, r as repairCurrentWindowsInstallOwnership, p as persistCurrentWindowsUserDataRootRegistry, a as recoverCurrentWindowsUninstallEntry, b as registerCurrentWindowsUninstallGuardian, c as createVelopackUpdaterTransport, V as VelopackCancellationToken, i as isUpdaterInstallRequested, d as buildUpdaterFailureProps, T as TRACK_EVENTS, e as validateWindowsVelopackInstallRoot, g as getDesignDownloadUrl, I as IUpdaterService, U as UPDATE_RUNTIME_UNAVAILABLE, f as getPendingUpdaterRollbackCandidate, h as verifyWindowsLocalLkg, j as resolveCurrentWindowsRollbackCandidate, k as findWindowsLocalLkg, l as stageWindowsLocalLkg } from "./index-C0Ixo6UY.js";
import { a6 as shouldUseVelopackUpdaterTransport, t as trackEvent, u as isVelopackUpdaterRuntime, A as APP_NAME, U as UPDATE_BASE_URL, g as getCategoryLogger, M as resolvePackagedVelopackChannel, q as releaseChannel, h as APP_ID, p as releaseRegion } from "../index.js";
import { app, powerMonitor, net } from "electron";
import { A as API_PATHS } from "./js-yaml-B0IoXaZA.js";
import "node:fs";
import "./python-runtime-g_0Tz6er.js";
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
import "./extract-zip-safe-pgCsG0Mm.js";
import "./eval-runtime-D7zKNjbh.js";
import "constants";
import "stream";
import "util";
import "node:timers/promises";
import "module";
import "./windows-junction-path-Ndl9Z-pn.js";
import "node:zlib";
import "node:perf_hooks";
import "node:inspector";
import "node:v8";
import "node:worker_threads";
import "node:process";
import "node:vm";
import "node:module";
import "https";
import "http";
import "net";
import "tls";
import "crypto";
import "url";
import "tty";
import "os";
import "http2";
import "querystring";
import "dns";
import "punycode";
import "node:https";
import "./worker-protocol-Rm4q_d5O.js";
import "child_process";
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
let activeNetworkEnvironmentPreparer;
let rollbackWatchdog = null;
let stagedRollbackCandidate = null;
let rollbackStagePromise = null;
const ROLLBACK_RENDERER_HEALTH_TIMEOUT_MS = 3 * 6e4;
function trackWindowsLkg(candidate, outcome) {
  try {
    void trackEvent(TRACK_EVENTS.APP_UPDATE_LKG, {
      outcome,
      package_kind: candidate.remoteFallbackAllowed ? "build_stamped" : "canonical",
      from_version: candidate.version,
      platform: process.platform === "win32" ? "win32" : "other"
    });
  } catch (error) {
    log.warn(`Failed to emit local LKG telemetry: ${error}`);
  }
}
async function stageCurrentWindowsRollbackCandidate(onProgress) {
  if (process.platform !== "win32") return void 0;
  if (stagedRollbackCandidate) return stagedRollbackCandidate;
  if (rollbackStagePromise) return rollbackStagePromise;
  const candidate = resolveCurrentWindowsRollbackCandidate() ?? void 0;
  if (!candidate) {
    const version = app.getVersion();
    const channel = resolvePackagedVelopackChannel(process.platform, process.arch, releaseChannel);
    const restored = await findWindowsLocalLkg({ appId: APP_ID, version, channel }, { onProgress });
    if (!restored) return void 0;
    stagedRollbackCandidate = {
      ...restored,
      appId: APP_ID,
      version,
      channel,
      feedUrl: UPDATE_BASE_URL.replace(/\/$/u, ""),
      packagePath: path__default.win32.join(restored.localFeedPath, restored.packageFile),
      // Restored local evidence never grants a new remote downgrade authority.
      remoteFallbackAllowed: false
    };
    return stagedRollbackCandidate;
  }
  rollbackStagePromise = (async () => {
    let restoreNetwork;
    try {
      restoreNetwork = await activeNetworkEnvironmentPreparer?.(candidate.feedUrl);
      const localLkg = await stageWindowsLocalLkg(candidate, {
        platform: process.platform,
        onProgress,
        fetchImpl: (url, init) => net.fetch(url instanceof URL ? url.toString() : url, init)
      });
      if (localLkg) {
        stagedRollbackCandidate = { ...candidate, ...localLkg };
        log.info(`Staged authenticated local LKG ${candidate.version}.`);
        trackWindowsLkg(candidate, "staged_local");
        return stagedRollbackCandidate;
      }
      log.warn(
        candidate.remoteFallbackAllowed ? `Local LKG ${candidate.version} could not be staged; immutable remote rollback remains available.` : `Canonical LKG ${candidate.version} could not be authenticated locally; this update will not claim offline rollback.`
      );
      trackWindowsLkg(
        candidate,
        candidate.remoteFallbackAllowed ? "remote_fallback" : "unavailable"
      );
      stagedRollbackCandidate = candidate.remoteFallbackAllowed ? candidate : null;
      return stagedRollbackCandidate ?? void 0;
    } catch (error) {
      log.warn(
        candidate.remoteFallbackAllowed ? `Local LKG ${candidate.version} staging failed; immutable remote rollback remains available. ${error}` : `Canonical LKG ${candidate.version} staging failed; this update will not claim offline rollback. ${error}`
      );
      trackWindowsLkg(
        candidate,
        candidate.remoteFallbackAllowed ? "remote_fallback" : "unavailable"
      );
      stagedRollbackCandidate = candidate.remoteFallbackAllowed ? candidate : null;
      return stagedRollbackCandidate ?? void 0;
    } finally {
      try {
        restoreNetwork?.();
      } catch (error) {
        log.warn(`Failed to restore network environment after local LKG staging: ${error}`);
      }
    }
  })();
  try {
    return await rollbackStagePromise;
  } finally {
    rollbackStagePromise = null;
  }
}
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
function scheduleUnhealthyUpdateRollback() {
  if (rollbackWatchdog || process.platform !== "win32") return;
  const velopackChannel = resolvePackagedVelopackChannel(
    process.platform,
    process.arch,
    releaseChannel
  );
  const candidate = getPendingUpdaterRollbackCandidate({
    productionBaseUrl: UPDATE_BASE_URL,
    velopackChannel,
    appId: APP_ID
  });
  if (!candidate) return;
  rollbackWatchdog = setTimeout(() => {
    rollbackWatchdog = null;
    const current = getPendingUpdaterRollbackCandidate({
      productionBaseUrl: UPDATE_BASE_URL,
      velopackChannel,
      appId: APP_ID
    });
    if (!current || current.attemptId !== candidate.attemptId) return;
    void (async () => {
      log.error(
        `Update ${current.failedVersion} did not reach renderer health; rolling back to LKG ${current.rollbackVersion}`
      );
      const localLkgValid = !!current.rollbackLocalFeedPath && !!current.rollbackPackageSha256 && await verifyWindowsLocalLkg({
        appId: current.rollbackAppId,
        version: current.rollbackVersion,
        channel: current.rollbackChannel,
        packageFile: current.rollbackPackageFile,
        packageSizeBytes: current.rollbackPackageSizeBytes,
        localFeedPath: current.rollbackLocalFeedPath,
        packageSha256: current.rollbackPackageSha256
      });
      const rollbackStillPending = () => {
        const pending = getPendingUpdaterRollbackCandidate({
          productionBaseUrl: UPDATE_BASE_URL,
          velopackChannel,
          appId: APP_ID
        });
        return pending?.attemptId === current.attemptId;
      };
      if (!rollbackStillPending()) return;
      if (!localLkgValid && !current.rollbackRemoteFallbackAllowed) {
        throw new Error(
          "Canonical LKG local feed is unavailable; mutable remote downgrade refused"
        );
      }
      const rollbackFeedUrl = localLkgValid ? current.rollbackLocalFeedPath : current.rollbackFeedUrl;
      trackWindowsLkg(
        {
          version: current.rollbackVersion,
          remoteFallbackAllowed: current.rollbackRemoteFallbackAllowed
        },
        localLkgValid ? "selected_local" : "selected_remote"
      );
      const prepareNetwork = localLkgValid ? void 0 : activeNetworkEnvironmentPreparer;
      const rollbackTransport = createVelopackUpdaterTransport(
        rollbackFeedUrl,
        void 0,
        prepareNetwork ? () => prepareNetwork(current.rollbackFeedUrl) : void 0,
        void 0,
        void 0,
        true
      );
      const available = await rollbackTransport.checkForUpdates();
      if (!rollbackStillPending()) return;
      if (available?.updateInfo?.version !== current.rollbackVersion) {
        throw new Error("LKG feed did not return the expected rollback version");
      }
      await rollbackTransport.downloadUpdate();
      if (!rollbackStillPending()) return;
      const downloadedRollback = rollbackTransport.getDownloadedFullRelease();
      if (downloadedRollback?.FileName !== current.rollbackPackageFile || downloadedRollback.Size !== current.rollbackPackageSizeBytes) {
        throw new Error("LKG package identity does not match the recorded rollback candidate");
      }
      if (!rollbackStillPending()) return;
      const { installDownloadedVelopackUpdate } = await import("./index-C0Ixo6UY.js").then((n) => n.z);
      await installDownloadedVelopackUpdate(
        () => rollbackTransport.quitAndInstall(true, true),
        current.rollbackVersion,
        { isSilent: true, isForceRunAfter: true },
        {
          packageSizeBytes: rollbackTransport.getDownloadedFullRelease()?.Size,
          // N17 (!4442): the install transaction re-evaluates this at every
          // preflight boundary, including the final one immediately before the
          // destructive native apply. Binding the rollback-pending proof here
          // (the attempt marker is deleted by finalizeSuccessfulUpdaterLaunch)
          // means a renderer-health ack that lands after the inline
          // rollbackStillPending() guards above still cancels the downgrade:
          // the transaction fails preflight and the quit lifecycle relaunches
          // the healthy current version instead of force-downgrading it.
          validatePackageIdentity: () => rollbackStillPending() && rollbackTransport.isDownloadedFullReleasePending(),
          validateInstallRootOwnership: (installDir) => validateWindowsVelopackInstallRoot(
            installDir,
            [rollbackTransport.getDownloadedFullRelease()?.FileName ?? ""].filter(Boolean)
          )
        }
      );
    })().catch((error) => {
      log.error(`Automatic LKG rollback failed: ${error}`);
    });
  }, ROLLBACK_RENDERER_HEALTH_TIMEOUT_MS);
  rollbackWatchdog.unref?.();
}
let startupOwnershipFailure = null;
function emitStartupOwnershipTelemetry(failure, repairedFromRegistryState) {
  try {
    trackEvent(TRACK_EVENTS.UPDATER_FAILURE, {
      ...buildUpdaterFailureProps({
        phase: "startup_ownership",
        message: failure?.message ?? "Install-root ownership repaired at signed startup.",
        retryable: false,
        retryCount: 0,
        fromVersion: app.getVersion(),
        targetVersion: null
      }),
      ownership_code: failure?.code ?? "REPAIRED",
      // On the repaired path this carries the pre-repair registry state
      // (missing / stale), which is what makes the root-cause split
      // quantifiable for the users we actually self-heal.
      registry_state: failure?.registryState ?? repairedFromRegistryState ?? "unknown",
      ownership_repaired: failure === null
    });
  } catch (error) {
    log.warn(`Failed to emit startup ownership telemetry: ${error}`);
  }
}
async function buildUpdaterServiceConfig(options) {
  getUpdateFeedToken = options.getUserToken ?? (() => "");
  activeNetworkEnvironmentPreparer = options.prepareVelopackNetworkEnvironment;
  setVelopackPackageMutationOwnershipValidator(validateCurrentVelopackInstallRoot);
  if (process.platform === "win32" && app.isPackaged) {
    const ownership = validateCurrentVelopackInstallRoot();
    let ownershipRuntimeUnavailable = !ownership.ok && "code" in ownership && ownership.code === "OWNERSHIP_RUNTIME_UNAVAILABLE";
    if (!ownership.ok) {
      if (ownershipRuntimeUnavailable) {
        log.warn(
          `Install-root ownership runtime is unavailable; skipping repeated startup repair and Guardian probes. ${ownership.message}`
        );
      } else {
        const repaired = repairCurrentWindowsInstallOwnership();
        ownershipRuntimeUnavailable = !repaired.ok && "code" in repaired && repaired.code === "OWNERSHIP_RUNTIME_UNAVAILABLE";
        if (repaired.ok) {
          const rehomed = "registryRehomed" in repaired && repaired.registryRehomed === true;
          const rehomedFrom = "registryState" in repaired && repaired.registryState ? String(repaired.registryState) : void 0;
          log.info(
            rehomed ? `Install-root ownership evidence was repaired at signed startup (InstallLocation registration restored from ${rehomedFrom ?? "unknown"}).` : "Install-root ownership evidence was repaired at signed startup."
          );
          emitStartupOwnershipTelemetry(null, rehomed ? rehomedFrom : "matched");
        } else {
          log.warn(
            `Install-root ownership remains unverified; destructive updater actions stay disabled. ${repaired.message ?? ownership.message}`
          );
          if (!ownershipRuntimeUnavailable) {
            const failureSource = "code" in repaired ? repaired : ownership;
            startupOwnershipFailure = {
              message: repaired.message ?? ownership.message ?? "ownership unverified",
              code: "code" in failureSource ? String(failureSource.code) : "unknown",
              registryState: "registryState" in failureSource && failureSource.registryState ? String(failureSource.registryState) : "unknown"
            };
            emitStartupOwnershipTelemetry(startupOwnershipFailure);
          }
        }
      }
    }
    if (!ownershipRuntimeUnavailable && !startupOwnershipFailure) {
      const userDataRootRegistry = persistCurrentWindowsUserDataRootRegistry();
      if (!userDataRootRegistry.ok) {
        startupOwnershipFailure = {
          message: userDataRootRegistry.message,
          code: "OWNERSHIP_USER_DATA_OVERLAP",
          registryState: "matched"
        };
        log.warn(
          `Durable user-data root registry is unavailable; destructive update/uninstall stays disabled. ${userDataRootRegistry.message}`
        );
      }
    }
    if (ownershipRuntimeUnavailable) {
      const recovered = recoverCurrentWindowsUninstallEntry();
      if (!recovered.ok) {
        log.warn(
          `Guarded uninstall entry recovery failed; uninstall safety remains unverified. ${recovered.message}`
        );
      }
    } else if (startupOwnershipFailure?.code === "OWNERSHIP_USER_DATA_OVERLAP") {
      const recovered = recoverCurrentWindowsUninstallEntry();
      if (!recovered.ok) {
        log.warn(
          `Guarded uninstall entry recovery failed while user-data roots are unverified. ${recovered.message}`
        );
      }
    } else if (startupOwnershipFailure?.registryState === "active-elsewhere" || startupOwnershipFailure?.registryState === "unreadable") {
      log.warn(
        `Skipping Uninstall Guardian registration: HKCU registration is ${startupOwnershipFailure.registryState}; leaving the other install's Apps & Features entry intact.`
      );
    } else {
      const guardian = registerCurrentWindowsUninstallGuardian();
      if (!guardian.ok) {
        log.warn(
          `Uninstall Guardian registration failed; the existing guarded entry is preserved when available. ${guardian.message}`
        );
      }
    }
  }
  const useVelopack = shouldUseVelopackUpdaterTransport(options.isDev);
  let velopackTransport = null;
  const prepareVelopackNetworkEnvironment = options.prepareVelopackNetworkEnvironment;
  const updaterRuntime = useVelopack ? (() => {
    velopackTransport = createVelopackUpdaterTransport(
      UPDATE_BASE_URL,
      void 0,
      prepareVelopackNetworkEnvironment ? () => prepareVelopackNetworkEnvironment(UPDATE_BASE_URL) : void 0,
      void 0,
      void 0,
      false,
      async (heartbeat) => {
        await stageCurrentWindowsRollbackCandidate(heartbeat);
      }
    );
    activeVelopackTransport = velopackTransport;
    scheduleUnhealthyUpdateRollback();
    return {
      autoUpdater: velopackTransport,
      CancellationToken: VelopackCancellationToken
    };
  })() : options.isDev ? await import("./main-B94gj_n3.js").then((n) => n.m).then((electronUpdater) => ({
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
    enableManagedInstallOnQuit: options.enableManagedInstallOnQuit,
    startupCheckDelay: 5e3,
    periodicCheckInterval: 60 * 60 * 1e3,
    isDev: options.isDev,
    getGatewayUrl: () => activeGatewayUrl,
    manualDownloadFallbackUrl: getDesignDownloadUrl(releaseRegion),
    resolveManualDownloadUrl: (targetVersion, preferredUrl) => process.platform === "win32" && activeAssignedUpdateFeed?.manualInstallerUrl || preferredUrl || (process.platform === "win32" && targetVersion ? resolveWindowsInstallerUrl(UPDATE_BASE_URL, APP_NAME, targetVersion) : null) || getDesignDownloadUrl(releaseRegion),
    resolveUpdatePolicy: async (resolveOptions) => {
      if (activeGatewayUrl) await applyAssignedUpdateFeed(activeGatewayUrl);
      const { resolveStartupUpdatePolicy } = await import("./update-policy-fetcher-Nu0vNfyi.js");
      return resolveStartupUpdatePolicy({
        currentVersion: app.getVersion(),
        userDataPath: app.getPath("userData"),
        platform: process.platform,
        preferCache: nonblockingUpdaterBootstrapEnabled() && resolveOptions?.preferCache === true
      });
    },
    fetchChangelog: async (v) => {
      const { fetchChangelogForUpdate } = await import("./changelog-fetcher-CHE3-R2M.js");
      return fetchChangelogForUpdate(v);
    },
    installUpdate: async (targetVersion, installOptions) => {
      if (velopackTransport) {
        const { installDownloadedVelopackUpdate } = await import("./index-C0Ixo6UY.js").then((n) => n.z);
        const rollbackCandidate = await stageCurrentWindowsRollbackCandidate();
        return installDownloadedVelopackUpdate(
          () => velopackTransport?.quitAndInstall(
            installOptions?.isSilent ?? false,
            installOptions?.isForceRunAfter ?? true
          ),
          targetVersion,
          installOptions,
          {
            packageSizeBytes: velopackTransport.getDownloadedFullRelease()?.Size,
            validatePackageIdentity: () => velopackTransport?.isDownloadedFullReleasePending() === true,
            validateInstallRootOwnership: (installDir) => validateWindowsVelopackInstallRoot(
              installDir,
              [velopackTransport?.getDownloadedFullRelease()?.FileName ?? ""].filter(
                (fileName) => fileName !== ""
              )
            )
          },
          rollbackCandidate
        );
      }
      log.warn("installUpdate ignored: no Velopack transport (dev / non-packaged runtime)");
      return false;
    },
    showToast: (version) => {
      import("./utils-Dj0rcJJt.js").then((m) => m.showUpdaterToast(version));
    },
    uploadFailure: (_gw, msg) => {
      import("./index-C0Ixo6UY.js").then((n) => n.y).then((m) => m.uploadUpdaterFailureMessage(msg));
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
  scheduleUnhealthyUpdateRollback();
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
  if (startupOwnershipFailure) {
    const assignedFeed = await updateFeedAssignment.catch(() => null);
    const canonicalInstallerUrl = state.targetVersion ? resolveWindowsInstallerUrl(UPDATE_BASE_URL, APP_NAME, state.targetVersion) : null;
    log.warn(
      `[boot] install-root ownership unverified (${startupOwnershipFailure.code}, registry ${startupOwnershipFailure.registryState}); switching updater to manual recovery`
    );
    updaterSvc.reportPreviousInstallFailure({
      message: startupOwnershipFailure.message,
      startupOwnershipCheck: true,
      fromVersion: app.getVersion(),
      manualDownloadUrl: assignedFeed?.manualInstallerUrl ?? canonicalInstallerUrl ?? getDesignDownloadUrl(releaseRegion),
      failureCode: startupOwnershipFailure.registryState === "active-elsewhere" ? "INSTDIR_MULTI_INSTALL" : "INSTDIR_OWNERSHIP_UNVERIFIED"
    });
  }
}
export {
  buildUpdaterServiceConfig,
  nonblockingUpdaterBootstrapEnabled,
  runUpdaterPolicyBootstrap
};
