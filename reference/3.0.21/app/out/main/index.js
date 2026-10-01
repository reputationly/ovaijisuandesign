import fs__default from "node:fs";
import os__default from "node:os";
import path__default from "node:path";
import { app } from "electron";
import { r as resolveManagedWindowsJunctionInstallDir, i as isReleaseChannel } from "./chunks/windows-junction-path-BTcT19J3.js";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import "./chunks/safe-spawn-path-DD3xknOt.js";
import "node:crypto";
const RESULT_OPTION = "--hilo-packaged-boot-smoke-result";
const USER_DATA_OPTION = "--hilo-packaged-boot-smoke-user-data";
const EXPECTED_USER_DATA_OPTION = "--hilo-packaged-boot-smoke-expected-user-data";
const INHERITED_DEFAULT_USER_DATA_ENV = "HILO_PACKAGED_BOOT_SMOKE_DEFAULT_USER_DATA";
const MANAGED_UPDATE_OPTION = "--hilo-packaged-boot-smoke-managed-update";
const UPDATE_FEED_OPTION = "--hilo-packaged-update-smoke-feed";
const UPDATE_TARGET_OPTION = "--hilo-packaged-update-smoke-target";
const UPDATE_PRE_APPLY_RESULT_OPTION = "--hilo-packaged-update-smoke-pre-apply-result";
const UPDATE_FILE_NAME_OPTION = "--hilo-packaged-update-smoke-file-name";
const UPDATE_SHA256_OPTION = "--hilo-packaged-update-smoke-sha256";
const UPDATE_SIZE_OPTION = "--hilo-packaged-update-smoke-size";
const BUILD_STAMP_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
function createPackagedBootSmokeExit({
  shutdown,
  exit,
  onError,
  timeoutMs = 5e3
}) {
  let requested = false;
  return (exitCode) => {
    if (requested) return;
    requested = true;
    let exited = false;
    const finish = () => {
      if (exited) return;
      exited = true;
      clearTimeout(timer);
      exit(exitCode);
    };
    const timer = setTimeout(finish, timeoutMs);
    void Promise.resolve().then(shutdown).catch(onError).finally(finish);
  };
}
let userDataEvidenceProvider;
function configurePackagedBootSmokeUserDataEvidence(provider) {
  userDataEvidenceProvider = provider;
}
function resolveManagedJunctionAttestation(options = {}) {
  const {
    platform = process.platform,
    execPath = process.execPath,
    ...resolutionOptions
  } = options;
  if (platform !== "win32") return false;
  return resolveManagedWindowsJunctionInstallDir(path__default.win32.dirname(execPath), resolutionOptions).kind === "resolved";
}
function isImmutableCandidateFeed(candidateFeed, productionFeed, targetVersion, expectedVelopackChannel) {
  const basePath = productionFeed.pathname.replace(/\/+$/u, "");
  const candidatePrefix = `${basePath}/`;
  if (!candidateFeed.pathname.startsWith(candidatePrefix) || candidateFeed.search || candidateFeed.hash || candidateFeed.username || candidateFeed.password) {
    return false;
  }
  const segments = candidateFeed.pathname.slice(candidatePrefix.length).split("/").filter(Boolean);
  return segments.length === 5 && segments[0] === "velopack" && segments[1] === expectedVelopackChannel && segments[2] === "builds" && segments[3] === targetVersion && BUILD_STAMP_PATTERN.test(segments[4] ?? "");
}
function assertPackagedUpdateSmokeAllowed(update, productionFeedUrl, expectedVelopackChannel, enabled) {
  if (!enabled) {
    throw new Error("PACKAGED_UPDATE_SMOKE_DISABLED");
  }
  let candidateFeed;
  let productionFeed;
  try {
    candidateFeed = new URL(update.feedUrl);
    productionFeed = new URL(productionFeedUrl);
  } catch {
    throw new Error("PACKAGED_UPDATE_SMOKE_FEED_INVALID");
  }
  if (candidateFeed.protocol !== "https:" || candidateFeed.origin !== productionFeed.origin || !update.feedUrl.endsWith("/") || !isImmutableCandidateFeed(
    candidateFeed,
    productionFeed,
    update.targetVersion,
    expectedVelopackChannel
  )) {
    throw new Error("PACKAGED_UPDATE_SMOKE_FEED_NOT_ALLOWED");
  }
  if (!/^\d+\.\d+\.\d+(?:[-.][0-9A-Za-z._-]+)?$/u.test(update.targetVersion)) {
    throw new Error("PACKAGED_UPDATE_SMOKE_TARGET_INVALID");
  }
  if (update.expectedAsset.fileName !== path__default.basename(update.expectedAsset.fileName) || !SHA256_PATTERN.test(update.expectedAsset.sha256) || !Number.isSafeInteger(update.expectedAsset.size) || update.expectedAsset.size <= 0) {
    throw new Error("PACKAGED_UPDATE_SMOKE_ASSET_INVALID");
  }
}
function resolvePackagedVelopackChannel(platform, architecture, releaseChannel) {
  const baseChannel = platform === "win32" ? "win" : platform === "darwin" && ["x64", "arm64"].includes(architecture) ? `osx-${architecture}` : null;
  if (!baseChannel || !["prod", "test", "staging"].includes(releaseChannel)) {
    throw new Error("PACKAGED_UPDATE_SMOKE_CHANNEL_UNSUPPORTED");
  }
  return releaseChannel === "prod" ? baseChannel : `${baseChannel}-${releaseChannel}`;
}
function readOption(argv, name) {
  const inlinePrefix = `${name}=`;
  const inline = argv.find((arg) => arg.startsWith(inlinePrefix));
  if (inline) return inline.slice(inlinePrefix.length).trim() || void 0;
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1]?.trim() || void 0 : void 0;
}
function resolvePackagedBootSmokeConfig(argv = process.argv, env = process.env) {
  const resultPath = readOption(argv, RESULT_OPTION);
  const userDataOverride = readOption(argv, USER_DATA_OPTION);
  const explicitExpectedUserDataPath = readOption(argv, EXPECTED_USER_DATA_OPTION);
  const useInheritedDefaultUserData = env[INHERITED_DEFAULT_USER_DATA_ENV] === "1";
  const userDataPaths = [userDataOverride, explicitExpectedUserDataPath].filter(
    (candidate) => Boolean(candidate)
  );
  const userDataPath = explicitExpectedUserDataPath ?? userDataOverride;
  const useDefaultUserData = Boolean(explicitExpectedUserDataPath) || useInheritedDefaultUserData && Boolean(userDataOverride);
  if (!resultPath || !userDataPath || userDataPaths.length !== 1 || !path__default.isAbsolute(resultPath) || !path__default.isAbsolute(userDataPath)) {
    return null;
  }
  const updateValues = {
    feedUrl: readOption(argv, UPDATE_FEED_OPTION),
    targetVersion: readOption(argv, UPDATE_TARGET_OPTION),
    preApplyResultPath: readOption(argv, UPDATE_PRE_APPLY_RESULT_OPTION),
    fileName: readOption(argv, UPDATE_FILE_NAME_OPTION),
    sha256: readOption(argv, UPDATE_SHA256_OPTION)?.toLowerCase(),
    size: readOption(argv, UPDATE_SIZE_OPTION)
  };
  const hasUpdateOption = Object.values(updateValues).some(Boolean);
  const parsedSize = updateValues.size ? Number(updateValues.size) : Number.NaN;
  if (hasUpdateOption && (!updateValues.feedUrl || !updateValues.targetVersion || !updateValues.preApplyResultPath || !path__default.isAbsolute(updateValues.preApplyResultPath) || !updateValues.fileName || !updateValues.sha256 || !Number.isSafeInteger(parsedSize) || parsedSize <= 0)) {
    return null;
  }
  return {
    managedUpdate: argv.includes(MANAGED_UPDATE_OPTION) || hasUpdateOption,
    resultPath,
    userDataMode: useDefaultUserData ? "default" : "override",
    userDataPath,
    ...hasUpdateOption ? {
      update: {
        feedUrl: updateValues.feedUrl,
        targetVersion: updateValues.targetVersion,
        preApplyResultPath: updateValues.preApplyResultPath,
        expectedAsset: {
          fileName: updateValues.fileName,
          sha256: updateValues.sha256,
          size: parsedSize
        }
      }
    } : {}
  };
}
function writePackagedBootSmokeResult(resultPath, result, options = {}) {
  fs__default.mkdirSync(path__default.dirname(resultPath), { recursive: true });
  const tempPath = `${resultPath}.${process.pid}.tmp`;
  const descriptor = fs__default.openSync(tempPath, "w", 384);
  try {
    fs__default.writeFileSync(
      descriptor,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          ...result,
          ...userDataEvidenceProvider?.(),
          managedJunctionActive: options.resolveManagedJunctionAttestation?.() ?? resolveManagedJunctionAttestation(),
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        null,
        2
      )}
`,
      "utf-8"
    );
    fs__default.fsyncSync(descriptor);
  } finally {
    fs__default.closeSync(descriptor);
  }
  fs__default.renameSync(tempPath, resultPath);
}
function resolveVelopackLocatorOverride(options = {}) {
  const platform = options.platform ?? process.platform;
  if (platform !== "win32") return void 0;
  const execPath = options.execPath ?? process.execPath;
  const junctionResolution = resolveManagedWindowsJunctionInstallDir(path__default.win32.dirname(execPath), {
    env: options.env,
    readlinkSync: options.readlinkSync,
    accessSync: options.accessSync
  });
  if (junctionResolution.kind === "not-managed") return void 0;
  if (junctionResolution.kind === "invalid") {
    throw new Error(`VELOPACK_JUNCTION_INVALID: ${junctionResolution.reason}`);
  }
  const currentBinaryDir = junctionResolution.installDir;
  const rootAppDir = path__default.win32.dirname(currentBinaryDir);
  return {
    RootAppDir: rootAppDir,
    UpdateExePath: path__default.win32.join(rootAppDir, "Update.exe"),
    PackagesDir: path__default.win32.join(rootAppDir, "packages"),
    ManifestPath: path__default.win32.join(currentBinaryDir, "sq.version"),
    CurrentBinaryDir: currentBinaryDir,
    IsPortable: false
  };
}
const REGISTRY_TIMEOUT_MS = 2e3;
function restoreDefaultWindowsUninstallVisibility(options) {
  if (process.platform !== "win32" || !app.isPackaged) return;
  if (!/^[a-z0-9.-]+$/iu.test(options.appId)) return;
  const systemRoot = process.env.SystemRoot ?? process.env.WINDIR;
  if (!systemRoot) return;
  try {
    const execute = options.execute ?? spawnSync;
    const registry = path__default.win32.join(systemRoot, "System32", "reg.exe");
    const key = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${options.appId}`;
    const runOptions = {
      windowsHide: true,
      timeout: REGISTRY_TIMEOUT_MS,
      stdio: "ignore"
    };
    const query = execute(registry, ["query", key, "/v", "SystemComponent", "/reg:64"], runOptions);
    if (query.error) throw query.error;
    if (query.status !== 0) return;
    const removed = execute(
      registry,
      ["delete", key, "/v", "SystemComponent", "/f", "/reg:64"],
      runOptions
    );
    if (removed.error || removed.status !== 0) {
      console.warn("The legacy uninstall visibility flag could not be removed.");
    }
  } catch {
    console.warn("The legacy uninstall visibility transition did not complete.");
  }
}
const VELOPACK_BACKEND = "velopack";
const VELOPACK_RUNTIME_RELATIVE_PATH = path__default.join(
  "velopack-runtime",
  "node_modules",
  "velopack"
);
const require$1 = createRequire(import.meta.url);
function isVelopackUpdaterRuntime(env = process.env) {
  return env.HILO_UPDATE_BACKEND === VELOPACK_BACKEND;
}
function shouldUseVelopackUpdaterTransport(isDev, env = process.env) {
  return !isDev && isVelopackUpdaterRuntime(env);
}
function markVelopackUpdaterRuntime(env = process.env) {
  env.HILO_UPDATE_BACKEND = VELOPACK_BACKEND;
}
function resolveVelopackModuleId(runtimeProcess = process) {
  const packagedRuntimePath = path__default.join(
    runtimeProcess.resourcesPath,
    VELOPACK_RUNTIME_RELATIVE_PATH
  );
  if (fs__default.existsSync(path__default.join(packagedRuntimePath, "package.json"))) {
    return packagedRuntimePath;
  }
  return "velopack";
}
function loadVelopackRuntime(runtimeProcess = process) {
  const loaded = require$1(resolveVelopackModuleId(runtimeProcess));
  if (typeof loaded !== "object" || loaded === null || !("VelopackApp" in loaded) || !("UpdateManager" in loaded)) {
    throw new Error("VELOPACK_RUNTIME_INVALID: Velopack exports are unavailable");
  }
  return loaded;
}
function runVelopackStartup(runtime, locator = resolveVelopackLocatorOverride(), safety = {}) {
  const builder = runtime.VelopackApp.build();
  const locatedBuilder = locator ? builder.setLocator(locator) : builder;
  locatedBuilder.onAfterInstallFastCallback(() => {
    if (safety.appId)
      restoreDefaultWindowsUninstallVisibility({
        appId: safety.appId
      });
  }).onAfterUpdateFastCallback(() => {
    if (safety.appId)
      restoreDefaultWindowsUninstallVisibility({
        appId: safety.appId
      });
  }).setAutoApplyOnStartup(false).run();
}
function normalizeEntryError(error) {
  return error instanceof Error ? error : new Error(String(error));
}
async function runVelopackEntry({
  loadRuntime,
  runStartup,
  markRuntime,
  importMain,
  onFatal
}) {
  try {
    const runtime = loadRuntime();
    runStartup(runtime);
    markRuntime();
  } catch (error) {
    await onFatal("runtime_startup", normalizeEntryError(error));
    return;
  }
  try {
    await importMain();
  } catch (error) {
    await onFatal("main_import", normalizeEntryError(error));
  }
}
const VELOPACK_STARTUP_LOG = path__default.join(os__default.tmpdir(), "minimax-hub-velopack-startup.log");
const VELOPACK_STARTUP_LOG_MAX_BYTES = 256 * 1024;
const packagedBootSmoke = resolvePackagedBootSmokeConfig();
function readPackagedReleaseIdentity() {
  try {
    const packageJson = JSON.parse(
      fs__default.readFileSync(path__default.join(app.getAppPath(), "package.json"), "utf8")
    );
    const release2 = packageJson.hiloRelease;
    if (typeof release2?.appId !== "string" || typeof release2.productName !== "string" || typeof release2.channel !== "string" || !isReleaseChannel(release2.channel)) {
      return null;
    }
    return {
      appId: release2.appId,
      productName: release2.productName,
      channel: release2.channel
    };
  } catch {
    return null;
  }
}
function writeVelopackStartupFailure(stage, error) {
  const message = `[${(/* @__PURE__ */ new Date()).toISOString()}] stage=${stage} ${error.stack ?? error.message}
`;
  try {
    try {
      const stat = fs__default.statSync(VELOPACK_STARTUP_LOG);
      if (stat.size > VELOPACK_STARTUP_LOG_MAX_BYTES) {
        fs__default.writeFileSync(VELOPACK_STARTUP_LOG, message, "utf-8");
        process.stderr.write(message);
        return;
      }
    } catch {
    }
    fs__default.appendFileSync(VELOPACK_STARTUP_LOG, message, "utf-8");
  } catch {
  }
  process.stderr.write(message);
}
async function showVelopackStartupFailure(stage, error) {
  writeVelopackStartupFailure(stage, error);
  if (packagedBootSmoke) {
    writePackagedBootSmokeResult(packagedBootSmoke.resultPath, {
      status: "failed",
      version: "unknown",
      platform: process.platform,
      rendererReady: false,
      error: `${stage}: startup failed`
    });
  }
  try {
    const { app: app2, dialog } = await import("electron");
    const productName = app2.getName().trim() || "MiniMax Design";
    try {
      dialog.showErrorBox(
        `${productName} startup failed`,
        `The update runtime could not start safely. Please reinstall the latest version from the official website.

Diagnostic log: ${VELOPACK_STARTUP_LOG}`
      );
    } finally {
      app2.exit(1);
    }
  } catch {
    process.exit(1);
  }
}
const release = readPackagedReleaseIdentity();
void runVelopackEntry({
  loadRuntime: loadVelopackRuntime,
  runStartup: (runtime) => runVelopackStartup(runtime, void 0, {
    appId: release?.appId
  }),
  markRuntime: markVelopackUpdaterRuntime,
  importMain: () => import("./chunks/index-E7UhlmOX.js").then((n) => n.q),
  onFatal: showVelopackStartupFailure
});
export {
  resolveVelopackLocatorOverride as a,
  assertPackagedUpdateSmokeAllowed as b,
  configurePackagedBootSmokeUserDataEvidence as c,
  resolvePackagedVelopackChannel as d,
  createPackagedBootSmokeExit as e,
  isVelopackUpdaterRuntime as i,
  loadVelopackRuntime as l,
  resolvePackagedBootSmokeConfig as r,
  shouldUseVelopackUpdaterTransport as s,
  writePackagedBootSmokeResult as w
};
