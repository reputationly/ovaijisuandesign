import * as fs from "node:fs";
import fs__default from "node:fs";
import os__default from "node:os";
import * as path from "node:path";
import path__default from "node:path";
import { n as normalizeWindowsJunctionTarget, w as windowsJunctionHash } from "./chunks/js-yaml-B0IoXaZA.js";
import require$$0$3, { app } from "electron";
import { r as resolveManagedWindowsJunctionInstallDir, g as getDiagnosticsUpdateBaseUrl, a as getApiDomain, i as isReleaseChannel, b as isReleaseRegion, c as createReleaseMetadata, d as channelToRuntimeEnv, e as isUnsignedPermittedPackId, f as getDurableAppName } from "./chunks/windows-junction-path-Ndl9Z-pn.js";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes, timingSafeEqual, createHmac, randomUUID } from "node:crypto";
import * as fsp from "node:fs/promises";
import { g as getDefaultExportFromCjs, i as isEvalGuiMode } from "./chunks/eval-runtime-D7zKNjbh.js";
import require$$1 from "path";
import require$$0 from "child_process";
import require$$1$1 from "os";
import fs__default$1 from "fs";
import require$$0$1 from "util";
import require$$0$2 from "events";
import http from "http";
import https from "https";
import { createRequire } from "node:module";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const JUNCTION_ROOT_NAME = "MiniMaxHub";
const JUNCTIONS_DIR_NAME = "junctions";
const JUNCTION_HASH_PATTERN = /^[a-f0-9]{12}$/i;
function stripWindowsNtPathPrefix(input) {
  return input.replace(/^(\\\\\?\\|\\\?\?\\)/, "");
}
function junctionBaseDirCandidates(env) {
  return [
    path.win32.join(env.ProgramData || "C:\\ProgramData", JUNCTION_ROOT_NAME, JUNCTIONS_DIR_NAME),
    path.win32.join(env.PUBLIC || "C:\\Users\\Public", JUNCTION_ROOT_NAME, JUNCTIONS_DIR_NAME)
  ];
}
function resolveWindowsEffectiveExecPath(execPath, env, readlinkSync = (targetPath) => fs.readlinkSync(targetPath)) {
  const exeDir = path.win32.dirname(execPath);
  const junctionName = path.win32.basename(exeDir);
  if (!JUNCTION_HASH_PATTERN.test(junctionName)) return execPath;
  const parentDir = normalizeWindowsJunctionTarget(path.win32.dirname(exeDir));
  const isManaged = junctionBaseDirCandidates(env).some(
    (candidate) => normalizeWindowsJunctionTarget(candidate) === parentDir
  );
  if (!isManaged) return execPath;
  try {
    const target = path.win32.normalize(stripWindowsNtPathPrefix(readlinkSync(exeDir))).replace(/[\\/]+$/, "");
    if (!path.win32.isAbsolute(target)) return execPath;
    if (windowsJunctionHash(target) !== junctionName.toLowerCase()) return execPath;
    return path.win32.join(target, path.win32.basename(execPath));
  } catch {
    return execPath;
  }
}
function isCustomWindowsInstallDir(execPath, localAppData) {
  if (!localAppData) return false;
  const normalizedExec = path.win32.normalize(execPath).toLowerCase();
  const normalizedRoot = `${path.win32.normalize(localAppData).toLowerCase().replace(/\\+$/, "")}\\`;
  return !normalizedExec.startsWith(normalizedRoot);
}
function resolveWindowsInstallLocationInfo(options) {
  const platform = options.platform ?? process.platform;
  if (platform !== "win32" || !options.isPackaged) {
    return { supported: false, installDir: "", isDefaultLocation: true };
  }
  const env = options.env ?? process.env;
  const execPath = resolveWindowsEffectiveExecPath(
    options.execPath ?? process.execPath,
    env,
    options.readlinkSync
  );
  return {
    supported: true,
    installDir: path.win32.dirname(path.win32.dirname(execPath)),
    isDefaultLocation: !isCustomWindowsInstallDir(execPath, env.LOCALAPPDATA)
  };
}
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
function resolvePackagedVelopackChannel(platform, architecture, releaseChannel2) {
  const baseChannel = platform === "win32" ? "win" : platform === "darwin" && ["x64", "arm64"].includes(architecture) ? `osx-${architecture}` : null;
  if (!baseChannel || !["prod", "test", "staging"].includes(releaseChannel2)) {
    throw new Error("PACKAGED_UPDATE_SMOKE_CHANNEL_UNSUPPORTED");
  }
  return releaseChannel2 === "prod" ? baseChannel : `${baseChannel}-${releaseChannel2}`;
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
const LEGACY_OWNERSHIP_RECORD_SCHEMA_VERSION = 1;
const OWNERSHIP_RECORD_SCHEMA_VERSION = 2;
const OWNERSHIP_MARKER_SCHEMA_VERSION = 1;
const USER_DATA_ROOT_REGISTRY_SCHEMA_VERSION = 1;
const OWNERSHIP_VENDOR_DIRECTORY_NAME = "MiniMax";
const OWNERSHIP_DIRECTORY_NAME = "install-ownership";
const OWNERSHIP_RECORD_FILENAME = "record.json";
const OWNERSHIP_KEY_FILENAME = "record.key";
const USER_DATA_ROOT_REGISTRY_FILENAME = "user-data-roots.json";
const WINDOWS_IDENTITY_COMMAND_TIMEOUT_MS = 5e3;
const WINDOWS_DRIVE_TYPE_COMMAND_TIMEOUT_MS = 1e4;
const PACKAGE_FILE_NAME_MAX_LENGTH = 240;
const INSTALL_ROOT_B64_ENV = "HILO_INSTALL_ROOT_B64";
const INSTALL_LOCATION_KEY_B64_ENV = "HILO_INSTALL_LOCATION_KEY_B64";
const DRIVE_TYPE_PROBE_PROCESS_CODES = /* @__PURE__ */ new Set(["EACCES", "ENOENT", "EPERM"]);
const DRIVE_TYPE_PROBE_SIGNALS = /* @__PURE__ */ new Set(["SIGABRT", "SIGKILL", "SIGTERM"]);
const INSTALL_ROOT_MARKER_FILENAME = ".minimax-install-root.json";
const INSTALL_CONTENT_MANIFEST_RELATIVE_PATH = "resources/install-ownership-manifest.json";
const PREFLIGHT_PROBE_ENTRY_RE = /^\.hilo-update-preflight-[0-9]+-([0-9]+)\.tmp$/u;
const INSTALLER_PROBE_ENTRY_RES = [
  PREFLIGHT_PROBE_ENTRY_RE,
  /^\.minimax-install-probe-[0-9]+-[0-9]+\.tmp$/u,
  /^\.minimax-install-write-probe-[0-9]+-[0-9a-f]{32}\.tmp$/u
];
const SID_PATTERN = /S-\d-(?:\d+-){1,14}\d+/iu;
function stripWindowsNtPrefix(input) {
  return input.replace(/^(\\\\\?\\|\\\?\?\\)/u, "");
}
function normalizeWindowsPath$2(input) {
  return path__default.win32.normalize(stripWindowsNtPrefix(input)).replace(/[\\/]+$/u, "");
}
function comparableWindowsPath(input) {
  return normalizeWindowsPath$2(input).toLowerCase();
}
function isSameOrInside(candidate, parent) {
  const normalizedCandidate = comparableWindowsPath(candidate);
  const normalizedParent = comparableWindowsPath(parent);
  return normalizedCandidate === normalizedParent || normalizedCandidate.startsWith(`${normalizedParent}\\`);
}
function resolveSystemExecutable(name, env) {
  const systemRoot = env.SystemRoot ?? env.WINDIR;
  return systemRoot ? path__default.win32.join(systemRoot, "System32", name) : name;
}
const UNINSTALL_REGISTRY_ROOT = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall";
function uninstallRegistryKey(appId) {
  return `${UNINSTALL_REGISTRY_ROOT}\\${appId}`;
}
const OEM_CODE_PAGE_LABELS = {
  "932": "shift_jis",
  // ja-JP
  "936": "gbk",
  // zh-CN
  "949": "euc-kr",
  // ko-KR
  "950": "big5",
  // zh-TW / zh-HK
  "54936": "gb18030",
  "65001": "utf-8",
  "866": "ibm866",
  // ru-RU console
  "1252": "windows-1252"
};
function decodeRegOutput(buffer, env) {
  const label = OEM_CODE_PAGE_LABELS[readOemCodePage(env)];
  if (label) {
    try {
      return { text: new TextDecoder(label).decode(buffer), oemDecoded: true };
    } catch {
    }
  }
  return { text: buffer.toString("latin1"), oemDecoded: false };
}
let cachedOemCodePage;
function isAsciiOnly(value) {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) > 127) return false;
  }
  return true;
}
function readOemCodePage(env) {
  if (cachedOemCodePage !== void 0) return cachedOemCodePage;
  const codepageKey = "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Nls\\CodePage";
  try {
    const stdout = execFileSync(
      resolveSystemExecutable("reg.exe", env),
      ["query", codepageKey, "/v", "OEMCP"],
      {
        // Read raw bytes and decode as latin1: the OEMCP value is ASCII digits in
        // every locale, and latin1 cannot throw on surrounding localized text.
        encoding: "buffer",
        timeout: WINDOWS_IDENTITY_COMMAND_TIMEOUT_MS,
        windowsHide: true
      }
    ).toString("latin1");
    const line = stdout.split(/\r?\n/u).find((candidate) => /^\s*OEMCP\s+REG_\w+\s+/iu.test(candidate));
    const page = line?.replace(/^\s*OEMCP\s+REG_\w+\s+/iu, "").trim() || "";
    if (page) cachedOemCodePage = page;
    return page;
  } catch {
    return "";
  }
}
function tryRegQuery(args, env) {
  try {
    const stdout = execFileSync(resolveSystemExecutable("reg.exe", env), [...args], {
      encoding: "buffer",
      timeout: WINDOWS_IDENTITY_COMMAND_TIMEOUT_MS,
      windowsHide: true
    });
    if (Buffer.isBuffer(stdout)) {
      const decoded = decodeRegOutput(stdout, env);
      return { ok: true, stdout: decoded.text, oemDecoded: decoded.oemDecoded };
    }
    return { ok: true, stdout: String(stdout), oemDecoded: true };
  } catch {
    return { ok: false };
  }
}
function queryUninstallCommands(appId, env) {
  const values = [];
  for (const name of ["UninstallString", "QuietUninstallString"]) {
    const result = tryRegQuery(["query", uninstallRegistryKey(appId), "/v", name], env);
    if (!result.ok) return void 0;
    const pattern = new RegExp(`^\\s*${name}\\s+REG_SZ\\s+`, "iu");
    const line = result.stdout.split(/\r?\n/u).find((candidate) => pattern.test(candidate));
    const value = line?.replace(pattern, "").trim();
    if (!value || !result.oemDecoded && !isAsciiOnly(value)) return void 0;
    values.push(value);
  }
  return { uninstall: values[0], quiet: values[1] };
}
function queryInstallLocation(appId, env) {
  const target = tryRegQuery(["query", uninstallRegistryKey(appId), "/v", "InstallLocation"], env);
  if (!target.ok) {
    return tryRegQuery(["query", UNINSTALL_REGISTRY_ROOT], env).ok ? { status: "absent" } : { status: "unreadable" };
  }
  const line = target.stdout.split(/\r?\n/u).find((candidate) => /^\s*InstallLocation\s+REG_\w+\s+/iu.test(candidate));
  if (!line) return { status: "absent" };
  const value = line.replace(/^\s*InstallLocation\s+REG_\w+\s+/iu, "").trim();
  if (!value) return { status: "absent" };
  if (!target.oemDecoded && !isAsciiOnly(value)) {
    const cached = cachedPowerShellDecodes.get(value);
    if (cached) return cached;
    const fallback = queryInstallLocationViaPowerShell(appId, env);
    if (fallback) {
      cachedPowerShellDecodes.set(value, fallback);
      return fallback;
    }
    return { status: "unreadable", undecodedValue: true };
  }
  return { status: "present", path: value };
}
const cachedPowerShellDecodes = /* @__PURE__ */ new Map();
function queryInstallLocationViaPowerShell(appId, env) {
  const powershellRoot = env.SystemRoot ?? env.WINDIR;
  const executable = powershellRoot ? path__default.win32.join(powershellRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : "powershell.exe";
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$encodedKey = $env:${INSTALL_LOCATION_KEY_B64_ENV}`,
    "if ([string]::IsNullOrWhiteSpace($encodedKey)) { throw 'missing key' }",
    "$key = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encodedKey))",
    "$item = Get-ItemProperty -LiteralPath $key -Name InstallLocation -ErrorAction SilentlyContinue",
    'if ($null -eq $item -or $null -eq $item.InstallLocation) { [Console]::Out.Write("ABSENT"); exit 0 }',
    "$bytes = [System.Text.Encoding]::UTF8.GetBytes([string]$item.InstallLocation)",
    "[Console]::Out.Write('B64:' + [Convert]::ToBase64String($bytes))"
  ].join("; ");
  try {
    const stdout = execFileSync(
      executable,
      [
        "-NoProfile",
        "-NonInteractive",
        "-EncodedCommand",
        Buffer.from(script, "utf16le").toString("base64")
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          ...env,
          [INSTALL_LOCATION_KEY_B64_ENV]: Buffer.from(
            `Registry::${uninstallRegistryKey(appId)}`,
            "utf8"
          ).toString("base64")
        },
        timeout: WINDOWS_DRIVE_TYPE_COMMAND_TIMEOUT_MS,
        windowsHide: true
      }
    ).trim();
    if (stdout === "ABSENT") return { status: "absent" };
    if (stdout.startsWith("B64:")) {
      const decoded = Buffer.from(stdout.slice(4), "base64").toString("utf8").trim();
      return decoded ? { status: "present", path: decoded } : { status: "absent" };
    }
    return null;
  } catch {
    return null;
  }
}
function writeInstallLocation(appId, installDir, env) {
  const key = uninstallRegistryKey(appId);
  execFileSync(
    resolveSystemExecutable("reg.exe", env),
    ["add", key, "/v", "InstallLocation", "/t", "REG_SZ", "/d", installDir, "/f"],
    {
      encoding: "utf8",
      timeout: WINDOWS_IDENTITY_COMMAND_TIMEOUT_MS,
      windowsHide: true
    }
  );
}
let cachedCurrentUserSid;
const cachedDriveTypes = /* @__PURE__ */ new Map();
function currentUserSid(env) {
  if (cachedCurrentUserSid !== void 0) return cachedCurrentUserSid;
  try {
    const stdout = execFileSync(
      resolveSystemExecutable("whoami.exe", env),
      ["/user", "/fo", "csv", "/nh"],
      {
        encoding: "utf8",
        timeout: WINDOWS_IDENTITY_COMMAND_TIMEOUT_MS,
        windowsHide: true
      }
    );
    const sid = stdout.match(SID_PATTERN)?.[0] ?? null;
    if (sid !== null) cachedCurrentUserSid = sid;
    return sid;
  } catch {
    return null;
  }
}
function driveTypeProbeFailureKind(error) {
  if (typeof error !== "object" || error === null) return "unknown";
  const processError = error;
  if (processError.code === "ETIMEDOUT") return "timeout";
  const stderr = Buffer.isBuffer(processError.stderr) ? processError.stderr.toString("utf8") : typeof processError.stderr === "string" ? processError.stderr : "";
  const diagnostic = `${typeof processError.message === "string" ? processError.message : ""}
${stderr}`;
  if (/ParserError/iu.test(diagnostic)) return "parser_error";
  if (/access (?:is )?denied|unauthorized/iu.test(diagnostic)) return "access_denied";
  if (typeof processError.status === "number") return `exit_${processError.status}`;
  if (typeof processError.signal === "string") {
    return DRIVE_TYPE_PROBE_SIGNALS.has(processError.signal) ? `signal_${processError.signal.toLowerCase()}` : "signal";
  }
  if (typeof processError.code === "string") {
    return DRIVE_TYPE_PROBE_PROCESS_CODES.has(processError.code) ? processError.code.toLowerCase() : "process_error";
  }
  return "unknown";
}
function queryDriveType(directoryPath, env) {
  const cacheKey = comparableWindowsPath(directoryPath);
  const cached = cachedDriveTypes.get(cacheKey);
  if (cached !== void 0) return cached;
  const powershell = env.SystemRoot ?? env.WINDIR;
  const executable = powershell ? path__default.win32.join(powershell, "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : "powershell.exe";
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$encodedPath = $env:${INSTALL_ROOT_B64_ENV}`,
    "if ([string]::IsNullOrWhiteSpace($encodedPath)) { throw 'missing install root' }",
    "$directoryPath = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encodedPath))",
    "$root = [System.IO.Path]::GetPathRoot($directoryPath)",
    "if ([string]::IsNullOrWhiteSpace($root)) { exit 2 }",
    "$drive = New-Object System.IO.DriveInfo($root)",
    "[Console]::Out.Write($drive.DriveType.ToString())"
  ].join("; ");
  const encodedScript = Buffer.from(script, "utf16le").toString("base64");
  let output;
  try {
    output = execFileSync(
      executable,
      ["-NoProfile", "-NonInteractive", "-EncodedCommand", encodedScript],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          ...env,
          [INSTALL_ROOT_B64_ENV]: Buffer.from(directoryPath, "utf8").toString("base64")
        },
        timeout: WINDOWS_DRIVE_TYPE_COMMAND_TIMEOUT_MS,
        windowsHide: true
      }
    );
  } catch (error) {
    throw new Error(`Windows drive type probe failed (${driveTypeProbeFailureKind(error)}).`, {
      cause: error
    });
  }
  const driveType = output.trim();
  if (driveType === "") throw new Error("Windows drive type probe failed (empty_output).");
  cachedDriveTypes.set(cacheKey, driveType);
  return driveType;
}
function writeTextAtomic(filePath, content) {
  fs__default.mkdirSync(path__default.win32.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  const descriptor = fs__default.openSync(temporaryPath, "wx", 384);
  try {
    fs__default.writeFileSync(descriptor, content, "utf8");
    fs__default.fsyncSync(descriptor);
  } finally {
    fs__default.closeSync(descriptor);
  }
  try {
    fs__default.renameSync(temporaryPath, filePath);
  } catch (error) {
    fs__default.rmSync(temporaryPath, { force: true });
    throw error;
  }
}
function walkDirectory(rootDirectory) {
  const entries = [];
  const stack = [rootDirectory];
  while (stack.length > 0) {
    const directory = stack.pop();
    if (!directory) continue;
    for (const child of fs__default.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path__default.win32.join(directory, child.name);
      const relativePath = path__default.win32.relative(rootDirectory, absolutePath).split(path__default.win32.sep).join("/");
      if (child.isSymbolicLink()) {
        entries.push({ path: relativePath, kind: "file", isReparsePoint: true, linkCount: 0 });
      } else if (child.isDirectory()) {
        stack.push(absolutePath);
      } else if (child.isFile()) {
        const stat = fs__default.lstatSync(absolutePath);
        entries.push({
          path: relativePath,
          kind: "file",
          isReparsePoint: false,
          linkCount: stat.nlink
        });
      } else {
        entries.push({ path: relativePath, kind: "file", isReparsePoint: true, linkCount: 0 });
      }
    }
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}
function defaultIo(env) {
  return {
    exists: fs__default.existsSync,
    readText: (filePath) => fs__default.readFileSync(filePath, "utf8"),
    listDirectory: (directoryPath) => fs__default.readdirSync(directoryPath),
    walkDirectory,
    realpath: (directoryPath) => fs__default.realpathSync.native(directoryPath),
    identity: (directoryPath) => {
      const stat = fs__default.lstatSync(directoryPath, { bigint: true });
      return {
        device: stat.dev.toString(),
        inode: stat.ino.toString(),
        isDirectory: stat.isDirectory(),
        isFile: stat.isFile(),
        isReparsePoint: stat.isSymbolicLink(),
        linkCount: Number(stat.nlink)
      };
    },
    pathStatus: (targetPath) => {
      try {
        fs__default.lstatSync(targetPath);
        return "present";
      } catch (error) {
        const code = error.code;
        return code === "ENOENT" || code === "ENOTDIR" ? "missing" : "unreadable";
      }
    },
    driveType: (directoryPath) => queryDriveType(directoryPath, env),
    queryInstallLocation: (appId) => queryInstallLocation(appId, env),
    writeInstallLocation: (appId, installDir) => writeInstallLocation(appId, installDir, env),
    currentUserSid: () => currentUserSid(env),
    writeTextAtomic,
    removeOwnFile: (filePath) => fs__default.rmSync(filePath, { force: true }),
    randomNonce: () => randomBytes(32).toString("hex"),
    now: () => (/* @__PURE__ */ new Date()).toISOString()
  };
}
function normalizedUserDataRoots(roots) {
  return [...new Set(roots.map((root) => normalizeWindowsPath$2(root.trim())).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right)
  );
}
function writeUserDataRootRegistry(options, roots) {
  if ((options.platform ?? process.platform) !== "win32" || options.isPackaged === false) {
    return { ok: true, roots: [] };
  }
  const env = options.env ?? process.env;
  const localAppData = env.LOCALAPPDATA;
  if (!localAppData) return { ok: false, message: "LOCALAPPDATA is unavailable." };
  const io = { ...defaultIo(env), ...options.io };
  const paths = ownershipPaths(localAppData, options.installDir, options.appId);
  const key = readKey(io, paths.keyPath);
  if (!key) return { ok: false, message: "Install ownership key is unavailable." };
  const rawRoots = [options.userDataPath, ...roots].map((root) => root.trim()).filter(Boolean);
  if (rawRoots.some((root) => root.length > 4096 || !path__default.win32.isAbsolute(root))) {
    return { ok: false, message: "User-data root registry contains an invalid path." };
  }
  const normalizedRoots = normalizedUserDataRoots(rawRoots);
  if (normalizedRoots.length > 256) {
    return { ok: false, message: "User-data root registry exceeds the supported root count." };
  }
  const payload = {
    schemaVersion: USER_DATA_ROOT_REGISTRY_SCHEMA_VERSION,
    appId: options.appId,
    roots: normalizedRoots,
    updatedAt: io.now()
  };
  const registry = { ...payload, mac: hmac(key, payload) };
  try {
    io.writeTextAtomic(paths.userDataRootRegistryPath, `${JSON.stringify(registry)}
`);
    return { ok: true, roots: normalizedRoots };
  } catch (error) {
    return { ok: false, message: `Unable to persist user-data root registry: ${error}` };
  }
}
function readUserDataRootRegistry(options) {
  if ((options.platform ?? process.platform) !== "win32" || options.isPackaged === false) {
    return { ok: true, roots: [] };
  }
  const env = options.env ?? process.env;
  const localAppData = env.LOCALAPPDATA;
  if (!localAppData) return { ok: false, message: "LOCALAPPDATA is unavailable." };
  const io = { ...defaultIo(env), ...options.io };
  const paths = ownershipPaths(localAppData, options.installDir, options.appId);
  const key = readKey(io, paths.keyPath);
  if (!key || !io.exists(paths.userDataRootRegistryPath)) {
    return { ok: false, message: "User-data root registry is unavailable." };
  }
  try {
    const registry = parseUserDataRootRegistry(io.readText(paths.userDataRootRegistryPath));
    if (!registry || registry.appId !== options.appId || !validMac(registry.mac, hmac(key, userDataRootRegistryPayload(registry)))) {
      return { ok: false, message: "User-data root registry is invalid." };
    }
    return { ok: true, roots: normalizedUserDataRoots(registry.roots) };
  } catch (error) {
    return { ok: false, message: `User-data root registry is unreadable: ${error}` };
  }
}
function ownershipPaths(localAppDataPath, installDir, appId) {
  const ownershipDirectory = path__default.win32.join(
    localAppDataPath,
    OWNERSHIP_VENDOR_DIRECTORY_NAME,
    OWNERSHIP_DIRECTORY_NAME,
    appId
  );
  return {
    keyPath: path__default.win32.join(ownershipDirectory, OWNERSHIP_KEY_FILENAME),
    recordPath: path__default.win32.join(ownershipDirectory, OWNERSHIP_RECORD_FILENAME),
    markerPath: path__default.win32.join(installDir, INSTALL_ROOT_MARKER_FILENAME),
    userDataRootRegistryPath: path__default.win32.join(ownershipDirectory, USER_DATA_ROOT_REGISTRY_FILENAME)
  };
}
function parseJsonRecord(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function parseOwnershipRecord(value) {
  const record = parseJsonRecord(value);
  const schemaVersion = record?.schemaVersion;
  if (!record || schemaVersion !== LEGACY_OWNERSHIP_RECORD_SCHEMA_VERSION && schemaVersion !== OWNERSHIP_RECORD_SCHEMA_VERSION || typeof record.appId !== "string" || typeof record.ownerSid !== "string" || typeof record.rootPath !== "string" || typeof record.rootRealPath !== "string" || typeof record.rootDevice !== "string" || typeof record.rootInode !== "string" || typeof record.nonce !== "string" || typeof record.createdAt !== "string" || typeof record.mac !== "string" || schemaVersion === OWNERSHIP_RECORD_SCHEMA_VERSION && (typeof record.contentManifestSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(record.contentManifestSha256))) {
    return null;
  }
  return record;
}
function parseOwnershipMarker(value) {
  const marker = parseJsonRecord(value);
  if (!marker || marker.schemaVersion !== OWNERSHIP_MARKER_SCHEMA_VERSION || typeof marker.appId !== "string" || typeof marker.nonce !== "string" || typeof marker.mac !== "string") {
    return null;
  }
  return marker;
}
function payloadOf(record) {
  const common = {
    appId: record.appId,
    ownerSid: record.ownerSid,
    rootPath: record.rootPath,
    rootRealPath: record.rootRealPath,
    rootDevice: record.rootDevice,
    rootInode: record.rootInode
  };
  if (record.schemaVersion === OWNERSHIP_RECORD_SCHEMA_VERSION) {
    return {
      schemaVersion: OWNERSHIP_RECORD_SCHEMA_VERSION,
      ...common,
      contentManifestSha256: record.contentManifestSha256,
      nonce: record.nonce,
      createdAt: record.createdAt
    };
  }
  return {
    schemaVersion: LEGACY_OWNERSHIP_RECORD_SCHEMA_VERSION,
    ...common,
    nonce: record.nonce,
    createdAt: record.createdAt
  };
}
function parseUserDataRootRegistry(value) {
  const record = parseJsonRecord(value);
  if (!record || record.schemaVersion !== USER_DATA_ROOT_REGISTRY_SCHEMA_VERSION || typeof record.appId !== "string" || !Array.isArray(record.roots) || !record.roots.every(
    (root) => typeof root === "string" && root.length > 0 && root.length <= 4096 && path__default.win32.isAbsolute(root)
  ) || typeof record.updatedAt !== "string" || !Number.isFinite(Date.parse(record.updatedAt)) || typeof record.mac !== "string") {
    return null;
  }
  return record;
}
function userDataRootRegistryPayload(registry) {
  const { mac: _mac, ...payload } = registry;
  return payload;
}
function hmac(key, value) {
  return createHmac("sha256", key).update(JSON.stringify(value)).digest("hex");
}
function validOwnershipRecordMac(record, key) {
  const payload = payloadOf(record);
  if (validMac(record.mac, hmac(key, payload))) return true;
  const legacyJson = JSON.stringify(payload).replace(
    /[&'<>\u0085\u2028\u2029]/gu,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
  return validMac(record.mac, createHmac("sha256", key).update(legacyJson).digest("hex"));
}
function validMac(expected, actual) {
  if (!/^[a-f0-9]{64}$/u.test(expected) || !/^[a-f0-9]{64}$/u.test(actual)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}
function parseVelopackPackageIdentity(value) {
  const nuspecId = value.match(/<id>\s*([^<]+?)\s*<\/id>/iu)?.[1]?.trim();
  if (nuspecId) {
    return {
      id: nuspecId,
      version: value.match(/<version>\s*([^<]+?)\s*<\/version>/iu)?.[1]?.trim() ?? null
    };
  }
  const manifest = parseJsonRecord(value);
  if (!manifest) return null;
  for (const key of ["PackageId", "packageId", "packId", "id"]) {
    const candidate = manifest[key];
    if (typeof candidate === "string" && candidate.trim() !== "") {
      const version = manifest.Version ?? manifest.version;
      return {
        id: candidate.trim(),
        version: typeof version === "string" && version.trim() !== "" ? version.trim() : null
      };
    }
  }
  return null;
}
function parseInstallContentManifest(value) {
  const manifest = parseJsonRecord(value);
  if (!manifest || manifest.schemaVersion !== 1 || typeof manifest.appId !== "string" || !Array.isArray(manifest.entries)) {
    return null;
  }
  const entries = [];
  const seen = /* @__PURE__ */ new Set();
  for (const rawEntry of manifest.entries) {
    if (rawEntry === null || typeof rawEntry !== "object" || Array.isArray(rawEntry) || typeof rawEntry.path !== "string" || rawEntry.kind !== "file") {
      return null;
    }
    const entryPath = rawEntry.path.replace(/\\/gu, "/");
    const pathSegments = entryPath.split("/");
    if (entryPath === "" || entryPath.startsWith("/") || path__default.win32.isAbsolute(entryPath) || pathSegments.some(
      (segment) => segment === "" || segment === "." || segment === ".." || segment.includes(":")
    ) || seen.has(entryPath.toLowerCase())) {
      return null;
    }
    seen.add(entryPath.toLowerCase());
    entries.push({ path: entryPath, kind: "file" });
  }
  return {
    schemaVersion: 1,
    appId: manifest.appId,
    entries: entries.sort((left, right) => left.path.localeCompare(right.path))
  };
}
function allowedRootEntries(options) {
  return new Set(
    [
      "current",
      "packages",
      "staging",
      "Update.exe",
      ".betaId",
      ".dead",
      "Velopack.log",
      "SquirrelSetup.log",
      `${options.productName}.exe`,
      `${options.durableProductName}.exe`,
      INSTALL_ROOT_MARKER_FILENAME
    ].map((entry) => entry.toLowerCase())
  );
}
function isAllowedRootEntry(entry, allowedEntries) {
  const lower = entry.toLowerCase();
  return allowedEntries.has(lower) || /^velopack\.log\.\d+$/u.test(lower) || // Our own installer/updater write probes (update preflight, NSIS fresh
  // target, verifier writability). Their cleanup is best-effort: antivirus
  // can hold the handle long enough for the delete to fail, and an
  // unrecognized leftover used to permanently self-destruct ownership — the
  // very thing the probes exist to protect (audit P1-5, review M4/N15).
  // Every pattern is tightly bound to a fixed prefix + numeric/hex suffix.
  INSTALLER_PROBE_ENTRY_RES.some((pattern) => pattern.test(lower));
}
function failure(options, code, message, unknownEntries, registryState) {
  return {
    ok: false,
    checked: options.platform === "win32" && options.isPackaged !== false,
    code,
    message,
    installDir: options.installDir,
    ...unknownEntries ? { unknownEntries } : {},
    ...registryState ? { registryState } : {}
  };
}
function isExactPathAuthorizedRoot(installDir, options, io, localAppData) {
  if (!localAppData) return false;
  try {
    const { recordPath } = ownershipPaths(localAppData, installDir, options.appId);
    if (!io.exists(recordPath)) return false;
    const parsed = JSON.parse(io.readText(recordPath));
    if (typeof parsed !== "object" || parsed === null) return false;
    const record = parsed;
    if (record.appId !== options.appId || typeof record.rootPath !== "string") return false;
    return comparableWindowsPath(record.rootPath) === comparableWindowsPath(installDir);
  } catch {
    return false;
  }
}
function isManagedInstallRootShape(installDir, options, io) {
  const env = options.env ?? process.env;
  const localAppData = env.LOCALAPPDATA;
  const normalized = comparableWindowsPath(installDir);
  if (localAppData && normalized === comparableWindowsPath(path__default.win32.join(localAppData, options.appId))) {
    return true;
  }
  const leaf = path__default.win32.basename(normalizeWindowsPath$2(installDir)).toLowerCase();
  if ([options.productName, options.durableProductName].map((name) => name.toLowerCase()).includes(leaf)) {
    return true;
  }
  return isExactPathAuthorizedRoot(installDir, options, io, localAppData);
}
function readKey(io, keyPath) {
  if (!io.exists(keyPath)) return null;
  try {
    const value = io.readText(keyPath).trim();
    return /^[a-f0-9]{64}$/u.test(value) ? Buffer.from(value, "hex") : null;
  } catch {
    return null;
  }
}
function verifyAttestation(options, record, marker, key, ownerSid, realInstallDir, identity, contentManifestSha256) {
  const markerPayload = {
    schemaVersion: marker.schemaVersion,
    appId: marker.appId,
    nonce: marker.nonce
  };
  const markerMac = hmac(key, markerPayload);
  if (!validOwnershipRecordMac(record, key) || !validMac(marker.mac, markerMac)) {
    return failure(options, "OWNERSHIP_ATTESTATION_INVALID", "Ownership HMAC is invalid.");
  }
  if (record.appId !== options.appId || marker.appId !== options.appId || record.ownerSid !== ownerSid || record.nonce !== marker.nonce || comparableWindowsPath(record.rootPath) !== comparableWindowsPath(options.installDir) || comparableWindowsPath(record.rootRealPath) !== comparableWindowsPath(realInstallDir) || record.rootDevice !== identity.device || record.rootInode !== identity.inode) {
    return failure(
      options,
      "OWNERSHIP_ATTESTATION_INVALID",
      "Ownership identity no longer matches the current user or physical directory."
    );
  }
  if (record.schemaVersion !== OWNERSHIP_RECORD_SCHEMA_VERSION || record.contentManifestSha256 !== contentManifestSha256) {
    return failure(
      options,
      "OWNERSHIP_ATTESTATION_INVALID",
      record.schemaVersion === LEGACY_OWNERSHIP_RECORD_SCHEMA_VERSION ? "Ownership record must be upgraded to bind the packaged content manifest." : "Packaged content manifest no longer matches the signed ownership record."
    );
  }
  return {
    ok: true,
    checked: true,
    bootstrapped: false,
    installDir: options.installDir,
    realInstallDir
  };
}
function canRotateAttestation(options, record, key, ownerSid, realInstallDir, identity) {
  return hasValidRecordAuthority(options, record, key, ownerSid) && comparableWindowsPath(record.rootPath) === comparableWindowsPath(options.installDir) && comparableWindowsPath(record.rootRealPath) === comparableWindowsPath(realInstallDir) && record.rootDevice === identity.device;
}
function hasValidRecordAuthority(options, record, key, ownerSid) {
  return validOwnershipRecordMac(record, key) && record.appId === options.appId && record.ownerSid === ownerSid;
}
function canRehomeStaleAttestation(options, record, key, ownerSid, io) {
  if (!hasValidRecordAuthority(options, record, key, ownerSid) || comparableWindowsPath(record.rootPath) === comparableWindowsPath(options.installDir) || comparableWindowsPath(record.rootPath) !== comparableWindowsPath(record.rootRealPath)) {
    return false;
  }
  try {
    return io.pathStatus(record.rootPath) === "missing";
  } catch {
    return false;
  }
}
function hasValidMarkerAuthority(marker, key, appId) {
  const markerPayload = {
    schemaVersion: marker.schemaVersion,
    appId: marker.appId,
    nonce: marker.nonce
  };
  return marker.appId === appId && validMac(marker.mac, hmac(key, markerPayload));
}
function ensureInstallRootOwnership(options) {
  const platform = options.platform ?? process.platform;
  const isPackaged = options.isPackaged ?? true;
  if (platform !== "win32" || !isPackaged) {
    return failure(options, "OWNERSHIP_UNSUPPORTED", "Ownership proof requires packaged Windows.");
  }
  const env = options.env ?? process.env;
  const io = { ...defaultIo(env), ...options.io };
  const allowUninstallReconciliation = options.allowUninstallReconciliation === true;
  const rawInstallDir = options.installDir.trim();
  const installDir = normalizeWindowsPath$2(options.installDir);
  const currentDir = path__default.win32.join(installDir, "current");
  const executableLeaf = path__default.win32.basename(options.execPath).toLowerCase();
  const expectedExecutableLeaves = [options.productName, options.durableProductName].map(
    (name) => `${name}.exe`.toLowerCase()
  );
  if (!/^[a-z]:[\\/]/iu.test(rawInstallDir) || !path__default.win32.isAbsolute(installDir) || !isManagedInstallRootShape(installDir, options, io) || comparableWindowsPath(path__default.win32.dirname(options.execPath)) !== comparableWindowsPath(currentDir) || !expectedExecutableLeaves.includes(executableLeaf)) {
    return failure(
      options,
      "OWNERSHIP_PATH_INVALID",
      "Install root or running executable is not a managed MiniMax path."
    );
  }
  let driveType;
  try {
    driveType = io.driveType(installDir);
  } catch (error) {
    return failure(
      options,
      "OWNERSHIP_RUNTIME_UNAVAILABLE",
      `Install root drive type probe is unavailable. ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (driveType.toLowerCase() !== "fixed") {
    return failure(
      options,
      "OWNERSHIP_PATH_INVALID",
      "Install root must be on a local fixed drive."
    );
  }
  const registryLocation = io.queryInstallLocation(options.appId);
  const registryMatches = registryLocation.status === "present" && comparableWindowsPath(registryLocation.path) === comparableWindowsPath(installDir);
  let pendingRegistryRehome = false;
  let registryRehomeRequiresExistingRootAuthority = false;
  let rehomedFromState;
  if (!registryMatches) {
    let registryState;
    if (registryLocation.status === "unreadable") {
      registryState = "unreadable";
    } else if (registryLocation.status === "absent") {
      registryState = "missing";
    } else {
      let registeredRootStatus;
      try {
        registeredRootStatus = io.pathStatus(registryLocation.path);
      } catch {
        registeredRootStatus = "unreadable";
      }
      registryState = registeredRootStatus === "missing" ? "stale" : "active-elsewhere";
    }
    if (options.allowRegistryRehome === true && registryState !== "unreadable") {
      pendingRegistryRehome = true;
      registryRehomeRequiresExistingRootAuthority = registryState === "active-elsewhere";
      rehomedFromState = registryState;
    } else {
      return failure(
        options,
        "OWNERSHIP_REGISTRY_MISMATCH",
        `Current-user InstallLocation does not match the running install root (registry ${registryState}).`,
        void 0,
        registryState
      );
    }
  }
  const commitRegistryRehome = (existingRootAuthority = false) => {
    if (!pendingRegistryRehome) return null;
    if (registryRehomeRequiresExistingRootAuthority && !existingRootAuthority) {
      return failure(
        options,
        "OWNERSHIP_REGISTRY_MISMATCH",
        "Another existing install is registered and this root has no matching signed primary record.",
        void 0,
        "active-elsewhere"
      );
    }
    try {
      io.writeInstallLocation(options.appId, installDir);
    } catch (error) {
      return failure(
        options,
        "OWNERSHIP_WRITE_FAILED",
        `Unable to restore the current-user InstallLocation registration: ${error}`
      );
    }
    return null;
  };
  let realInstallDir;
  let identity;
  try {
    realInstallDir = normalizeWindowsPath$2(io.realpath(installDir));
    identity = io.identity(installDir);
  } catch (error) {
    return failure(
      options,
      "OWNERSHIP_PATH_INVALID",
      `Install root identity is unreadable: ${error}`
    );
  }
  if (!identity.isDirectory || identity.isReparsePoint) {
    return failure(options, "OWNERSHIP_REPARSE_POINT", "Install root is not a normal directory.");
  }
  if (identity.device === "0" || identity.inode === "0") {
    return failure(
      options,
      "OWNERSHIP_PATH_INVALID",
      "Install root does not expose a stable physical file identity."
    );
  }
  if (comparableWindowsPath(realInstallDir) !== comparableWindowsPath(installDir)) {
    return failure(
      options,
      "OWNERSHIP_PATH_INVALID",
      "Install root resolves through a physical path alias or reparse boundary."
    );
  }
  if (isSameOrInside(options.userDataPath, installDir) || isSameOrInside(installDir, options.userDataPath)) {
    return failure(
      options,
      "OWNERSHIP_USER_DATA_OVERLAP",
      "User data and install root must not overlap."
    );
  }
  const durableUserDataRoots = [...new Set(options.userDataRoots ?? [])];
  for (const userDataRoot of durableUserDataRoots) {
    const trimmedRoot = userDataRoot.trim();
    if (!trimmedRoot) continue;
    if (isSameOrInside(trimmedRoot, installDir) || isSameOrInside(installDir, trimmedRoot)) {
      return failure(
        options,
        "OWNERSHIP_USER_DATA_OVERLAP",
        "A durable user-data root overlaps the native install/update scope."
      );
    }
    let rootStatus;
    try {
      rootStatus = io.pathStatus(trimmedRoot);
    } catch {
      rootStatus = "unreadable";
    }
    if (rootStatus === "unreadable") {
      return failure(
        options,
        "OWNERSHIP_USER_DATA_OVERLAP",
        "A durable user-data root could not be resolved before native install/update."
      );
    }
    if (rootStatus === "present") {
      let realUserDataRoot;
      try {
        realUserDataRoot = normalizeWindowsPath$2(io.realpath(trimmedRoot));
      } catch {
        return failure(
          options,
          "OWNERSHIP_USER_DATA_OVERLAP",
          "A durable user-data root could not be canonicalized before native install/update."
        );
      }
      if (isSameOrInside(realUserDataRoot, realInstallDir) || isSameOrInside(realInstallDir, realUserDataRoot)) {
        return failure(
          options,
          "OWNERSHIP_USER_DATA_OVERLAP",
          "A durable user-data root physically overlaps the native install/update scope."
        );
      }
    }
  }
  const localAppDataPath = env.LOCALAPPDATA;
  if (!localAppDataPath) {
    return failure(
      options,
      "OWNERSHIP_PATH_INVALID",
      "LOCALAPPDATA is required for the external ownership store."
    );
  }
  const ownershipStoreRoot = path__default.win32.join(localAppDataPath, OWNERSHIP_VENDOR_DIRECTORY_NAME);
  if (isSameOrInside(ownershipStoreRoot, installDir) || isSameOrInside(installDir, ownershipStoreRoot)) {
    return failure(
      options,
      "OWNERSHIP_USER_DATA_OVERLAP",
      "External ownership store and install root must not overlap."
    );
  }
  let entries;
  try {
    entries = io.listDirectory(installDir);
  } catch (error) {
    return failure(
      options,
      "OWNERSHIP_PATH_INVALID",
      `Install root cannot be enumerated: ${error}`
    );
  }
  const allowedEntries = allowedRootEntries(options);
  const unknownEntries = entries.filter((entry) => !isAllowedRootEntry(entry, allowedEntries)).sort((left, right) => left.localeCompare(right));
  if (unknownEntries.length > 0 && !allowUninstallReconciliation) {
    return failure(
      options,
      "OWNERSHIP_UNKNOWN_ROOT_ENTRIES",
      "Install root contains files or directories not owned by MiniMax.",
      unknownEntries
    );
  }
  const requiredDirectoryNames = /* @__PURE__ */ new Set(["current", "packages", "staging"]);
  const rootEntryIdentities = /* @__PURE__ */ new Map();
  try {
    for (const entry of entries) {
      rootEntryIdentities.set(entry.toLowerCase(), io.identity(path__default.win32.join(installDir, entry)));
    }
  } catch (error) {
    return failure(options, "OWNERSHIP_PATH_INVALID", `Install root entry is unreadable: ${error}`);
  }
  for (const [entry, entryIdentity] of rootEntryIdentities) {
    if (entryIdentity.isReparsePoint) {
      return failure(
        options,
        "OWNERSHIP_REPARSE_POINT",
        `Install root contains a reparse entry: ${entry}`
      );
    }
    const isUnknownEntry = !isAllowedRootEntry(entry, allowedEntries);
    if (!entryIdentity.isDirectory && entryIdentity.linkCount !== void 0 && entryIdentity.linkCount !== 1 && (!isUnknownEntry || !allowUninstallReconciliation)) {
      return failure(
        options,
        "OWNERSHIP_FINGERPRINT_INVALID",
        `Install root contains a hard-linked file: ${entry}`
      );
    }
    const expectsDirectory = requiredDirectoryNames.has(entry);
    if (isUnknownEntry && allowUninstallReconciliation && (entryIdentity.isDirectory || entryIdentity.isFile)) {
      continue;
    }
    if (expectsDirectory && !entryIdentity.isDirectory || !expectsDirectory && !entryIdentity.isFile) {
      return failure(
        options,
        "OWNERSHIP_FINGERPRINT_INVALID",
        `Install root entry has an unexpected file type: ${entry}`
      );
    }
  }
  const currentManifestPath = path__default.win32.join(currentDir, "sq.version");
  const installContentManifestPath = path__default.win32.join(
    currentDir,
    ...INSTALL_CONTENT_MANIFEST_RELATIVE_PATH.split("/")
  );
  const hasRootStub = [options.productName, options.durableProductName].some(
    (name) => io.exists(path__default.win32.join(installDir, `${name}.exe`))
  );
  const hasCurrentExecutable = [options.productName, options.durableProductName].some(
    (name) => io.exists(path__default.win32.join(currentDir, `${name}.exe`))
  );
  let manifestPackageIdentity = null;
  try {
    manifestPackageIdentity = io.exists(currentManifestPath) ? parseVelopackPackageIdentity(io.readText(currentManifestPath)) : null;
  } catch {
    manifestPackageIdentity = null;
  }
  if (!io.exists(path__default.win32.join(installDir, "Update.exe")) || !hasRootStub || !hasCurrentExecutable || manifestPackageIdentity?.id.toLowerCase() !== options.appId.toLowerCase() || !io.exists(installContentManifestPath)) {
    return failure(
      options,
      "OWNERSHIP_FINGERPRINT_INVALID",
      "Velopack layout or package identity does not match this application."
    );
  }
  let installContentManifestRaw;
  let installContentManifest;
  let actualContentEntries;
  try {
    installContentManifestRaw = io.readText(installContentManifestPath);
    installContentManifest = parseInstallContentManifest(installContentManifestRaw);
    actualContentEntries = io.walkDirectory(currentDir);
  } catch (error) {
    return failure(
      options,
      "OWNERSHIP_CONTENT_MANIFEST_INVALID",
      `Install content manifest cannot be verified: ${error}`
    );
  }
  if (!installContentManifest || installContentManifest.appId !== options.appId) {
    return failure(
      options,
      "OWNERSHIP_CONTENT_MANIFEST_INVALID",
      "Install content manifest has an invalid schema or package identity."
    );
  }
  const contentManifestSha256 = createHash("sha256").update(installContentManifestRaw, "utf8").digest("hex");
  const reparseEntry = actualContentEntries.find((entry) => entry.isReparsePoint);
  if (reparseEntry) {
    return failure(
      options,
      "OWNERSHIP_REPARSE_POINT",
      `Install content contains a reparse point: ${reparseEntry.path}`
    );
  }
  const expectedContentPaths = installContentManifest.entries.map(
    (entry) => entry.path.toLowerCase()
  );
  const actualContentPaths = actualContentEntries.map((entry) => entry.path.toLowerCase());
  const expectedSet = new Set(expectedContentPaths);
  const actualSet = new Set(actualContentPaths);
  const unknownContentEntries = actualContentPaths.filter((entry) => !expectedSet.has(entry));
  const missingContentEntries = expectedContentPaths.filter((entry) => !actualSet.has(entry));
  const hardLinkedContentEntry = actualContentEntries.find(
    (entry) => entry.linkCount !== void 0 && entry.linkCount !== 1 && (expectedSet.has(entry.path.toLowerCase()) || !allowUninstallReconciliation)
  );
  if (hardLinkedContentEntry) {
    return failure(
      options,
      "OWNERSHIP_CONTENT_MANIFEST_INVALID",
      `Install content contains a hard-linked file: ${hardLinkedContentEntry.path}`
    );
  }
  if (missingContentEntries.length > 0 || unknownContentEntries.length > 0 && !allowUninstallReconciliation) {
    return failure(
      options,
      "OWNERSHIP_CONTENT_MANIFEST_INVALID",
      `Install content differs from the packaged manifest. unknownCount=${unknownContentEntries.length} missingCount=${missingContentEntries.length}`,
      unknownContentEntries
    );
  }
  if (entries.some((entry) => entry.toLowerCase() === "packages")) {
    const packagesDir = path__default.win32.join(installDir, "packages");
    let packageEntries;
    try {
      packageEntries = io.listDirectory(packagesDir);
    } catch (error) {
      return failure(
        options,
        "OWNERSHIP_PATH_INVALID",
        `Velopack packages directory cannot be enumerated: ${error}`
      );
    }
    const currentPackageFile = manifestPackageIdentity.version ? `${manifestPackageIdentity.id}-${manifestPackageIdentity.version}-full.nupkg` : null;
    const isInterruptedDownloadResidue = (entry) => {
      const lower = entry.toLowerCase();
      const prefix = `${manifestPackageIdentity.id.toLowerCase()}-`;
      return entry.length <= PACKAGE_FILE_NAME_MAX_LENGTH && lower.startsWith(prefix) && /^[0-9a-z][0-9a-z._-]*-full\.partial$/u.test(lower.slice(prefix.length));
    };
    const allowedPackageEntries = new Set(
      [
        ".velopack_lock",
        ".betaId",
        ...currentPackageFile ? [currentPackageFile] : [],
        ...(options.allowedPackageFiles ?? []).filter(
          (entry) => path__default.win32.basename(entry) === entry && !entry.includes("/")
        )
      ].map((entry) => entry.toLowerCase())
    );
    const unknownPackageEntries = packageEntries.filter(
      (entry) => entry.toLowerCase() !== "velopacktemp" && !allowedPackageEntries.has(entry.toLowerCase()) && !isInterruptedDownloadResidue(entry)
    ).sort((left, right) => left.localeCompare(right));
    if (unknownPackageEntries.length > 0 && !allowUninstallReconciliation) {
      return failure(
        options,
        "OWNERSHIP_UNKNOWN_ROOT_ENTRIES",
        "Velopack packages directory contains files not owned by this update transaction.",
        unknownPackageEntries.map((entry) => `packages/${entry}`)
      );
    }
    try {
      for (const entry of packageEntries) {
        const entryIdentity = io.identity(path__default.win32.join(packagesDir, entry));
        const isTempDirectory = entry.toLowerCase() === "velopacktemp";
        const isUnknownPackageEntry = !isTempDirectory && !allowedPackageEntries.has(entry.toLowerCase()) && !isInterruptedDownloadResidue(entry);
        if (isUnknownPackageEntry && allowUninstallReconciliation) {
          if (entryIdentity.isReparsePoint) {
            return failure(
              options,
              "OWNERSHIP_REPARSE_POINT",
              `Velopack package entry has an unsafe type: ${entry}`
            );
          }
          if (entryIdentity.isDirectory) {
            const unknownTree = io.walkDirectory(path__default.win32.join(packagesDir, entry));
            const unsafeTreeEntry = unknownTree.find((candidate) => candidate.isReparsePoint);
            if (unsafeTreeEntry) {
              return failure(
                options,
                "OWNERSHIP_REPARSE_POINT",
                `Velopack package entry contains a reparse point: ${entry}/${unsafeTreeEntry.path}`
              );
            }
          }
          continue;
        }
        if (entryIdentity.isReparsePoint || !isTempDirectory && entryIdentity.linkCount !== void 0 && entryIdentity.linkCount !== 1 || (isTempDirectory ? !entryIdentity.isDirectory : !entryIdentity.isFile)) {
          return failure(
            options,
            entryIdentity.isReparsePoint ? "OWNERSHIP_REPARSE_POINT" : "OWNERSHIP_FINGERPRINT_INVALID",
            `Velopack package entry has an unsafe type: ${entry}`
          );
        }
        if (isTempDirectory) {
          const tempEntries = io.walkDirectory(path__default.win32.join(packagesDir, entry));
          const tempHasReparse = tempEntries.some((tempEntry) => tempEntry.isReparsePoint);
          if (tempHasReparse || tempEntries.length > 0 && !options.allowRetiredGenerationResidue) {
            return failure(
              options,
              tempHasReparse ? "OWNERSHIP_REPARSE_POINT" : "OWNERSHIP_UNKNOWN_ROOT_ENTRIES",
              "Velopack temporary package directory is not empty.",
              tempEntries.map((tempEntry) => `packages/VelopackTemp/${tempEntry.path}`)
            );
          }
        }
      }
    } catch (error) {
      return failure(
        options,
        "OWNERSHIP_PATH_INVALID",
        `Velopack package entry cannot be verified: ${error}`
      );
    }
  }
  if (entries.some((entry) => entry.toLowerCase() === "staging")) {
    let stagingEntries;
    try {
      stagingEntries = io.walkDirectory(path__default.win32.join(installDir, "staging"));
    } catch (error) {
      return failure(
        options,
        "OWNERSHIP_PATH_INVALID",
        `Velopack staging directory cannot be enumerated: ${error}`
      );
    }
    const stagingHasReparse = stagingEntries.some((entry) => entry.isReparsePoint);
    if (stagingHasReparse || stagingEntries.length > 0 && !options.allowRetiredGenerationResidue && !allowUninstallReconciliation) {
      return failure(
        options,
        stagingHasReparse ? "OWNERSHIP_REPARSE_POINT" : "OWNERSHIP_UNKNOWN_ROOT_ENTRIES",
        "Velopack staging directory is not empty.",
        stagingEntries.map((entry) => `staging/${entry.path}`)
      );
    }
  }
  const ownerSid = io.currentUserSid();
  if (!ownerSid || !SID_PATTERN.test(ownerSid)) {
    return failure(options, "OWNERSHIP_PATH_INVALID", "Current Windows SID is unavailable.");
  }
  const paths = ownershipPaths(localAppDataPath, installDir, options.appId);
  const recordExists = io.exists(paths.recordPath);
  const markerExists = io.exists(paths.markerPath);
  const keyExists = io.exists(paths.keyPath);
  const key = readKey(io, paths.keyPath);
  let keyNeedsWrite = !keyExists;
  let rotationKey = null;
  let existingRecordAuthorizesCurrentRoot = false;
  if (recordExists) {
    if (!key) {
      if (options.allowBootstrap !== true) {
        return failure(
          options,
          "OWNERSHIP_PARTIAL_ATTESTATION",
          "Install ownership attestation is incomplete."
        );
      }
      if (keyExists) {
        return failure(
          options,
          "OWNERSHIP_ATTESTATION_INVALID",
          "Install ownership key is present but invalid."
        );
      }
      keyNeedsWrite = true;
    } else {
      let record2 = null;
      try {
        record2 = parseOwnershipRecord(io.readText(paths.recordPath));
      } catch {
        record2 = null;
      }
      if (!record2) {
        return failure(
          options,
          "OWNERSHIP_ATTESTATION_INVALID",
          "Install ownership attestation has an invalid schema."
        );
      } else {
        if (markerExists) {
          let marker2 = null;
          try {
            marker2 = parseOwnershipMarker(io.readText(paths.markerPath));
          } catch {
            marker2 = null;
          }
          if (marker2 && hasValidMarkerAuthority(marker2, key, options.appId)) {
            if (marker2.nonce === record2.nonce) {
              const verified = verifyAttestation(
                options,
                record2,
                marker2,
                key,
                ownerSid,
                realInstallDir,
                identity,
                contentManifestSha256
              );
              if (verified.ok) {
                const rehomeFailure = commitRegistryRehome(true);
                if (rehomeFailure) return rehomeFailure;
                return {
                  ...verified,
                  registryRehomed: pendingRegistryRehome,
                  ...rehomedFromState ? { registryState: rehomedFromState } : {}
                };
              }
            }
          } else if (options.allowBootstrap !== true) {
            return failure(
              options,
              "OWNERSHIP_ATTESTATION_INVALID",
              "Install ownership marker is invalid."
            );
          }
        }
        const recordAuthorityValid = hasValidRecordAuthority(options, record2, key, ownerSid);
        if (!recordAuthorityValid) {
          return failure(
            options,
            "OWNERSHIP_ATTESTATION_INVALID",
            "Install ownership record HMAC or identity is invalid."
          );
        } else {
          const rotationAuthorized = canRotateAttestation(
            options,
            record2,
            key,
            ownerSid,
            realInstallDir,
            identity
          );
          existingRecordAuthorizesCurrentRoot = rotationAuthorized;
          const staleRehomeAuthorized = canRehomeStaleAttestation(
            options,
            record2,
            key,
            ownerSid,
            io
          );
          if (options.allowBootstrap !== true || !rotationAuthorized && !staleRehomeAuthorized) {
            return failure(
              options,
              "OWNERSHIP_ATTESTATION_INVALID",
              "Install ownership identity changed without valid rotation or stale-root recovery authority."
            );
          }
          rotationKey = key;
        }
      }
    }
  } else if (keyExists || markerExists) {
    if (options.allowBootstrap !== true) {
      return failure(
        options,
        "OWNERSHIP_PARTIAL_ATTESTATION",
        "Install ownership attestation is incomplete."
      );
    }
    if (keyExists && !key) keyNeedsWrite = true;
    if (markerExists && key) {
      let marker2 = null;
      try {
        marker2 = parseOwnershipMarker(io.readText(paths.markerPath));
      } catch {
        marker2 = null;
      }
      if (marker2 && hasValidMarkerAuthority(marker2, key, options.appId)) rotationKey = key;
    }
    if (!rotationKey && key) rotationKey = key;
  }
  if (options.allowBootstrap !== true) {
    return failure(
      options,
      "OWNERSHIP_BOOTSTRAP_DISABLED",
      "Install root has not been attested by the ownership guardian."
    );
  }
  if (registryRehomeRequiresExistingRootAuthority && !existingRecordAuthorizesCurrentRoot) {
    return failure(
      options,
      "OWNERSHIP_REGISTRY_MISMATCH",
      "Another existing install is registered and this root has no matching signed primary record.",
      void 0,
      "active-elsewhere"
    );
  }
  const ownershipKey = rotationKey ?? Buffer.from(io.randomNonce(), "hex");
  if (ownershipKey.length !== 32) {
    return failure(options, "OWNERSHIP_WRITE_FAILED", "Ownership key material is invalid.");
  }
  const payload = {
    schemaVersion: OWNERSHIP_RECORD_SCHEMA_VERSION,
    appId: options.appId,
    ownerSid,
    rootPath: installDir,
    rootRealPath: realInstallDir,
    rootDevice: identity.device,
    rootInode: identity.inode,
    contentManifestSha256,
    nonce: io.randomNonce(),
    createdAt: io.now()
  };
  const markerPayload = {
    schemaVersion: OWNERSHIP_MARKER_SCHEMA_VERSION,
    appId: options.appId,
    nonce: payload.nonce
  };
  const marker = {
    ...markerPayload,
    mac: hmac(ownershipKey, markerPayload)
  };
  const record = {
    ...payload,
    mac: hmac(ownershipKey, payload)
  };
  let keyWritten = false;
  let markerWritten = false;
  try {
    if (keyNeedsWrite) {
      io.writeTextAtomic(paths.keyPath, `${ownershipKey.toString("hex")}
`);
      keyWritten = true;
    }
    io.writeTextAtomic(paths.markerPath, `${JSON.stringify(marker)}
`);
    markerWritten = true;
    io.writeTextAtomic(paths.recordPath, `${JSON.stringify(record)}
`);
  } catch (error) {
    if (markerWritten) {
      try {
        io.removeOwnFile(paths.markerPath);
      } catch {
      }
    }
    if (keyWritten && !io.exists(paths.recordPath)) {
      try {
        io.removeOwnFile(paths.keyPath);
      } catch {
      }
    }
    return failure(
      options,
      "OWNERSHIP_WRITE_FAILED",
      `Unable to persist install ownership attestation: ${error}`
    );
  }
  const bootstrapRehomeFailure = commitRegistryRehome(existingRecordAuthorizesCurrentRoot);
  if (bootstrapRehomeFailure) return bootstrapRehomeFailure;
  return {
    ok: true,
    checked: true,
    bootstrapped: true,
    installDir,
    realInstallDir,
    registryRehomed: pendingRegistryRehome,
    ...rehomedFromState ? { registryState: rehomedFromState } : {}
  };
}
const TRACK_PROJECT_NAME = "hub";
const TRACK_SERVER_URL = {
  domestic: {
    prod: "https://data.hailuoai.com/meerkat-reporter/api/report?project=hub",
    nonprod: "https://bigdata-test.xingyeai.com/meerkat-reporter/api/report?project=hub"
  },
  overseas: {
    prod: "https://data.hailuoai.video/meerkat-reporter/api/report?project=hub",
    nonprod: "https://bigdata-test.talkie-ai.com/meerkat-reporter/api/report?project=hub"
  }
};
function resolveTrackServerUrl(region, channel) {
  const bucket = channel === "prod" ? "prod" : "nonprod";
  return TRACK_SERVER_URL[region][bucket];
}
function resolveEventIpCountry(eventValue, fallback) {
  return typeof eventValue === "string" ? eventValue : fallback;
}
function resolveTrackingDomain(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname.toLowerCase().replace(/\.$/u, "") || null;
  } catch {
    return null;
  }
}
function normalizePlatform(p) {
  switch (p) {
    case "darwin":
      return "macos";
    case "win32":
      return "windows";
    case "linux":
      return "linux";
    default:
      return p;
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
      arch: nodeOs.arch()
    };
  }
  const name = typeof process !== "undefined" && process.platform ? normalizePlatform(process.platform) : navigator?.userAgentData?.platform ?? "unknown";
  const arch = typeof process !== "undefined" && process.arch ? process.arch : "";
  let version = "";
  if (typeof navigator !== "undefined" && navigator.userAgent) {
    const m = navigator.userAgent.match(/\(([^)]+)\)/);
    if (m) {
      const part = m[1].split(";").map((s) => s.trim()).find((s) => /Mac OS X|Windows NT|Linux/i.test(s));
      if (part) version = part;
    }
  }
  return { name, version, arch };
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
    timezone: opts.timezone ?? intl?.timeZone
  };
}
const INSTALLER_SHELL_RESULT_EVENT = "installer_shell_result";
const MAX_PROP_STRING_LENGTH = 1024;
const MAX_STACK_PROP_STRING_LENGTH = 2048;
const MAX_PROP_COUNT = 64;
function isStackField(key) {
  return key.toLowerCase().includes("stack");
}
function isSafelySerializable(value) {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}
function sanitizeTrackProps(properties) {
  const out = {};
  let truncated = 0;
  let dropped = 0;
  let kept = 0;
  for (const [key, value] of Object.entries(properties)) {
    if (kept >= MAX_PROP_COUNT) {
      dropped++;
      continue;
    }
    if (typeof value === "function" || typeof value === "symbol") {
      dropped++;
      continue;
    }
    if (typeof value === "string") {
      const limit = isStackField(key) ? MAX_STACK_PROP_STRING_LENGTH : MAX_PROP_STRING_LENGTH;
      if (value.length > limit) {
        out[key] = value.slice(0, limit);
        truncated++;
      } else {
        out[key] = value;
      }
      kept++;
      continue;
    }
    if (value !== null && typeof value === "object" && !isSafelySerializable(value)) {
      dropped++;
      continue;
    }
    if (typeof value === "bigint") {
      dropped++;
      continue;
    }
    out[key] = value;
    kept++;
  }
  if (dropped > 0) {
    console.warn(
      `[track] sanitize dropped ${dropped} propert(y/ies) (max ${MAX_PROP_COUNT} props; functions/symbols/circular values rejected)`
    );
  }
  return { props: out, truncatedStrings: truncated, droppedProps: dropped };
}
const GUARD_SUMMARY_INTERVAL_MS = 6e4;
function zeroCounters() {
  return { truncated_strings: 0, dropped_props: 0, dropped_events: 0 };
}
function createGuardReporter(scope2, intervalMs = GUARD_SUMMARY_INTERVAL_MS) {
  const totals = zeroCounters();
  let window2 = zeroCounters();
  let timer = null;
  function flushNow() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (window2.truncated_strings === 0 && window2.dropped_props === 0 && window2.dropped_events === 0) {
      return;
    }
    console.warn(
      `[${scope2}] guard summary: dropped_events=${window2.dropped_events} dropped_props=${window2.dropped_props} truncated_strings=${window2.truncated_strings} (totals: ${totals.dropped_events}/${totals.dropped_props}/${totals.truncated_strings})`
    );
    window2 = zeroCounters();
  }
  function note(delta) {
    for (const key of Object.keys(totals)) {
      const d = delta[key] ?? 0;
      totals[key] += d;
      window2[key] += d;
    }
    if (!timer) {
      timer = setTimeout(flushNow, intervalMs);
      timer.unref?.();
    }
  }
  return { note, totals: () => ({ ...totals }), flushNow };
}
const MAX_RETRY_QUEUE_SIZE = 200;
const MAX_SEND_ATTEMPTS = 3;
const RETRY_BACKOFF_BASE_MS = 5e3;
const RETRY_BACKOFF_MAX_MS = 3e4;
let _state = null;
let _retryQueue = [];
let _retryTimer = null;
const _guard = createGuardReporter("track:server");
function initTrack(opts) {
  const serverUrl = opts.serverUrlOverride ?? resolveTrackServerUrl(opts.region, opts.channel);
  _state = {
    serverUrl,
    baseProps: buildBaseProps(opts),
    userId: null
  };
  _retryQueue = [];
  if (_retryTimer) {
    clearTimeout(_retryTimer);
    _retryTimer = null;
  }
}
function setTrackUser(userId) {
  if (!_state) return;
  _state.userId = userId;
}
function trackEvent(eventName, properties = {}) {
  if (!_state) return Promise.resolve();
  const sanitized = sanitizeTrackProps(properties);
  if (sanitized.truncatedStrings > 0 || sanitized.droppedProps > 0) {
    _guard.note({
      truncated_strings: sanitized.truncatedStrings,
      dropped_props: sanitized.droppedProps
    });
  }
  const event = {
    eventName,
    properties: sanitized.props,
    time: Date.now(),
    attempts: 0,
    nextAttemptAt: 0
  };
  return attemptSend(event).then(() => void 0);
}
function trackEventDelivered(eventName, properties = {}) {
  if (!_state) return Promise.resolve(false);
  const sanitized = sanitizeTrackProps(properties);
  if (sanitized.truncatedStrings > 0 || sanitized.droppedProps > 0) {
    _guard.note({
      truncated_strings: sanitized.truncatedStrings,
      dropped_props: sanitized.droppedProps
    });
  }
  const event = {
    eventName,
    properties: sanitized.props,
    time: Date.now(),
    attempts: 0,
    nextAttemptAt: 0
  };
  return attemptSend(event);
}
async function attemptSend(event) {
  const state = _state;
  if (!state) return false;
  event.attempts += 1;
  try {
    await sendToSensors(state, event);
    return true;
  } catch (err) {
    console.warn(
      `[track:server] failed to send "${event.eventName}" (attempt ${event.attempts}/${MAX_SEND_ATTEMPTS}):`,
      err
    );
    scheduleRetry(event);
    return false;
  }
}
function scheduleRetry(event) {
  if (event.attempts >= MAX_SEND_ATTEMPTS) {
    _guard.note({ dropped_events: 1 });
    return;
  }
  const backoff = Math.min(RETRY_BACKOFF_BASE_MS * 2 ** (event.attempts - 1), RETRY_BACKOFF_MAX_MS);
  event.nextAttemptAt = Date.now() + backoff;
  if (_retryQueue.length >= MAX_RETRY_QUEUE_SIZE) {
    _retryQueue.shift();
    _guard.note({ dropped_events: 1 });
  }
  _retryQueue.push(event);
  armRetryTimer();
}
function armRetryTimer() {
  if (_retryTimer || _retryQueue.length === 0) return;
  let earliest = Number.POSITIVE_INFINITY;
  for (const e of _retryQueue) {
    if (e.nextAttemptAt < earliest) earliest = e.nextAttemptAt;
  }
  const delay = Math.max(0, earliest - Date.now());
  _retryTimer = setTimeout(() => {
    _retryTimer = null;
    void drainDueRetries();
  }, delay);
  _retryTimer.unref?.();
}
async function drainDueRetries() {
  const now = Date.now();
  const due = [];
  const rest = [];
  for (const e of _retryQueue) {
    (e.nextAttemptAt <= now ? due : rest).push(e);
  }
  _retryQueue = rest;
  for (const event of due) {
    await attemptSend(event);
  }
  armRetryTimer();
}
async function sendToSensors(state, event) {
  const distinctId = state.userId ?? state.baseProps.device_id;
  const payload = {
    type: "track",
    event: event.eventName,
    time: event.time,
    distinct_id: distinctId,
    project: TRACK_PROJECT_NAME,
    properties: {
      ...state.baseProps,
      ...event.properties,
      ip_country: resolveEventIpCountry(event.properties.ip_country, state.baseProps.ip_country)
    },
    lib: {
      $lib: "Node",
      $lib_version: "0.1.0",
      $lib_method: "code"
    }
  };
  const json = JSON.stringify(payload);
  const data = encodeURIComponent(Buffer.from(json, "utf8").toString("base64"));
  const body = `data=${data}`;
  const res = await fetch(state.serverUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}
var src = { exports: {} };
var electronLogPreload = { exports: {} };
var hasRequiredElectronLogPreload;
function requireElectronLogPreload() {
  if (hasRequiredElectronLogPreload) return electronLogPreload.exports;
  hasRequiredElectronLogPreload = 1;
  (function(module) {
    let electron = {};
    try {
      electron = require2("electron");
    } catch (e) {
    }
    if (electron.ipcRenderer) {
      initialize2(electron);
    }
    {
      module.exports = initialize2;
    }
    function initialize2({ contextBridge, ipcRenderer }) {
      if (!ipcRenderer) {
        return;
      }
      ipcRenderer.on("__ELECTRON_LOG_IPC__", (_, message) => {
        window.postMessage({ cmd: "message", ...message });
      });
      ipcRenderer.invoke("__ELECTRON_LOG__", { cmd: "getOptions" }).catch((e) => console.error(new Error(
        `electron-log isn't initialized in the main process. Please call log.initialize() before. ${e.message}`
      )));
      const electronLog = {
        sendToMain(message) {
          try {
            ipcRenderer.send("__ELECTRON_LOG__", message);
          } catch (e) {
            console.error("electronLog.sendToMain ", e, "data:", message);
            ipcRenderer.send("__ELECTRON_LOG__", {
              cmd: "errorHandler",
              error: { message: e?.message, stack: e?.stack },
              errorName: "sendToMain"
            });
          }
        },
        log(...data) {
          electronLog.sendToMain({ data, level: "info" });
        }
      };
      for (const level of ["error", "warn", "info", "verbose", "debug", "silly"]) {
        electronLog[level] = (...data) => electronLog.sendToMain({
          data,
          level
        });
      }
      if (contextBridge && process.contextIsolated) {
        try {
          contextBridge.exposeInMainWorld("__electronLog", electronLog);
        } catch {
        }
      }
      if (typeof window === "object") {
        window.__electronLog = electronLog;
      } else {
        __electronLog = electronLog;
      }
    }
  })(electronLogPreload);
  return electronLogPreload.exports;
}
var renderer = { exports: {} };
var scope;
var hasRequiredScope;
function requireScope() {
  if (hasRequiredScope) return scope;
  hasRequiredScope = 1;
  scope = scopeFactory;
  function scopeFactory(logger2) {
    return Object.defineProperties(scope2, {
      defaultLabel: { value: "", writable: true },
      labelPadding: { value: true, writable: true },
      maxLabelLength: { value: 0, writable: true },
      labelLength: {
        get() {
          switch (typeof scope2.labelPadding) {
            case "boolean":
              return scope2.labelPadding ? scope2.maxLabelLength : 0;
            case "number":
              return scope2.labelPadding;
            default:
              return 0;
          }
        }
      }
    });
    function scope2(label) {
      scope2.maxLabelLength = Math.max(scope2.maxLabelLength, label.length);
      const newScope = {};
      for (const level of logger2.levels) {
        newScope[level] = (...d) => logger2.logData(d, { level, scope: label });
      }
      newScope.log = newScope.info;
      return newScope;
    }
  }
  return scope;
}
var Buffering_1;
var hasRequiredBuffering;
function requireBuffering() {
  if (hasRequiredBuffering) return Buffering_1;
  hasRequiredBuffering = 1;
  class Buffering {
    constructor({ processMessage }) {
      this.processMessage = processMessage;
      this.buffer = [];
      this.enabled = false;
      this.begin = this.begin.bind(this);
      this.commit = this.commit.bind(this);
      this.reject = this.reject.bind(this);
    }
    addMessage(message) {
      this.buffer.push(message);
    }
    begin() {
      this.enabled = [];
    }
    commit() {
      this.enabled = false;
      this.buffer.forEach((item) => this.processMessage(item));
      this.buffer = [];
    }
    reject() {
      this.enabled = false;
      this.buffer = [];
    }
  }
  Buffering_1 = Buffering;
  return Buffering_1;
}
var Logger_1;
var hasRequiredLogger;
function requireLogger() {
  if (hasRequiredLogger) return Logger_1;
  hasRequiredLogger = 1;
  const scopeFactory = requireScope();
  const Buffering = requireBuffering();
  class Logger {
    static instances = {};
    dependencies = {};
    errorHandler = null;
    eventLogger = null;
    functions = {};
    hooks = [];
    isDev = false;
    levels = null;
    logId = null;
    scope = null;
    transports = {};
    variables = {};
    constructor({
      allowUnknownLevel = false,
      dependencies = {},
      errorHandler,
      eventLogger,
      initializeFn,
      isDev: isDev2 = false,
      levels = ["error", "warn", "info", "verbose", "debug", "silly"],
      logId,
      transportFactories = {},
      variables
    } = {}) {
      this.addLevel = this.addLevel.bind(this);
      this.create = this.create.bind(this);
      this.initialize = this.initialize.bind(this);
      this.logData = this.logData.bind(this);
      this.processMessage = this.processMessage.bind(this);
      this.allowUnknownLevel = allowUnknownLevel;
      this.buffering = new Buffering(this);
      this.dependencies = dependencies;
      this.initializeFn = initializeFn;
      this.isDev = isDev2;
      this.levels = levels;
      this.logId = logId;
      this.scope = scopeFactory(this);
      this.transportFactories = transportFactories;
      this.variables = variables || {};
      for (const name of this.levels) {
        this.addLevel(name, false);
      }
      this.log = this.info;
      this.functions.log = this.log;
      this.errorHandler = errorHandler;
      errorHandler?.setOptions({ ...dependencies, logFn: this.error });
      this.eventLogger = eventLogger;
      eventLogger?.setOptions({ ...dependencies, logger: this });
      for (const [name, factory] of Object.entries(transportFactories)) {
        this.transports[name] = factory(this, dependencies);
      }
      Logger.instances[logId] = this;
    }
    static getInstance({ logId }) {
      return this.instances[logId] || this.instances.default;
    }
    addLevel(level, index = this.levels.length) {
      if (index !== false) {
        this.levels.splice(index, 0, level);
      }
      this[level] = (...args) => this.logData(args, { level });
      this.functions[level] = this[level];
    }
    catchErrors(options) {
      this.processMessage(
        {
          data: ["log.catchErrors is deprecated. Use log.errorHandler instead"],
          level: "warn"
        },
        { transports: ["console"] }
      );
      return this.errorHandler.startCatching(options);
    }
    create(options) {
      if (typeof options === "string") {
        options = { logId: options };
      }
      return new Logger({
        dependencies: this.dependencies,
        errorHandler: this.errorHandler,
        initializeFn: this.initializeFn,
        isDev: this.isDev,
        transportFactories: this.transportFactories,
        variables: { ...this.variables },
        ...options
      });
    }
    compareLevels(passLevel, checkLevel, levels = this.levels) {
      const pass = levels.indexOf(passLevel);
      const check = levels.indexOf(checkLevel);
      if (check === -1 || pass === -1) {
        return true;
      }
      return check <= pass;
    }
    initialize(options = {}) {
      this.initializeFn({ logger: this, ...this.dependencies, ...options });
    }
    logData(data, options = {}) {
      if (this.buffering.enabled) {
        this.buffering.addMessage({ data, date: /* @__PURE__ */ new Date(), ...options });
      } else {
        this.processMessage({ data, ...options });
      }
    }
    processMessage(message, { transports = this.transports } = {}) {
      if (message.cmd === "errorHandler") {
        this.errorHandler.handle(message.error, {
          errorName: message.errorName,
          processType: "renderer",
          showDialog: Boolean(message.showDialog)
        });
        return;
      }
      let level = message.level;
      if (!this.allowUnknownLevel) {
        level = this.levels.includes(message.level) ? message.level : "info";
      }
      const normalizedMessage = {
        date: /* @__PURE__ */ new Date(),
        logId: this.logId,
        ...message,
        level,
        variables: {
          ...this.variables,
          ...message.variables
        }
      };
      for (const [transName, transFn] of this.transportEntries(transports)) {
        if (typeof transFn !== "function" || transFn.level === false) {
          continue;
        }
        if (!this.compareLevels(transFn.level, message.level)) {
          continue;
        }
        try {
          const transformedMsg = this.hooks.reduce((msg, hook) => {
            return msg ? hook(msg, transFn, transName) : msg;
          }, normalizedMessage);
          if (transformedMsg) {
            transFn({ ...transformedMsg, data: [...transformedMsg.data] });
          }
        } catch (e) {
          this.processInternalErrorFn(e);
        }
      }
    }
    processInternalErrorFn(_e) {
    }
    transportEntries(transports = this.transports) {
      const transportArray = Array.isArray(transports) ? transports : Object.entries(transports);
      return transportArray.map((item) => {
        switch (typeof item) {
          case "string":
            return this.transports[item] ? [item, this.transports[item]] : null;
          case "function":
            return [item.name, item];
          default:
            return Array.isArray(item) ? item : null;
        }
      }).filter(Boolean);
    }
  }
  Logger_1 = Logger;
  return Logger_1;
}
var RendererErrorHandler_1;
var hasRequiredRendererErrorHandler;
function requireRendererErrorHandler() {
  if (hasRequiredRendererErrorHandler) return RendererErrorHandler_1;
  hasRequiredRendererErrorHandler = 1;
  const consoleError = console.error;
  class RendererErrorHandler {
    logFn = null;
    onError = null;
    showDialog = false;
    preventDefault = true;
    constructor({ logFn = null } = {}) {
      this.handleError = this.handleError.bind(this);
      this.handleRejection = this.handleRejection.bind(this);
      this.startCatching = this.startCatching.bind(this);
      this.logFn = logFn;
    }
    handle(error, {
      logFn = this.logFn,
      errorName = "",
      onError = this.onError,
      showDialog = this.showDialog
    } = {}) {
      try {
        if (onError?.({ error, errorName, processType: "renderer" }) !== false) {
          logFn({ error, errorName, showDialog });
        }
      } catch {
        consoleError(error);
      }
    }
    setOptions({ logFn, onError, preventDefault, showDialog }) {
      if (typeof logFn === "function") {
        this.logFn = logFn;
      }
      if (typeof onError === "function") {
        this.onError = onError;
      }
      if (typeof preventDefault === "boolean") {
        this.preventDefault = preventDefault;
      }
      if (typeof showDialog === "boolean") {
        this.showDialog = showDialog;
      }
    }
    startCatching({ onError, showDialog } = {}) {
      if (this.isActive) {
        return;
      }
      this.isActive = true;
      this.setOptions({ onError, showDialog });
      window.addEventListener("error", (event) => {
        this.preventDefault && event.preventDefault?.();
        this.handleError(event.error || event);
      });
      window.addEventListener("unhandledrejection", (event) => {
        this.preventDefault && event.preventDefault?.();
        this.handleRejection(event.reason || event);
      });
    }
    handleError(error) {
      this.handle(error, { errorName: "Unhandled" });
    }
    handleRejection(reason) {
      const error = reason instanceof Error ? reason : new Error(JSON.stringify(reason));
      this.handle(error, { errorName: "Unhandled rejection" });
    }
  }
  RendererErrorHandler_1 = RendererErrorHandler;
  return RendererErrorHandler_1;
}
var transform_1;
var hasRequiredTransform;
function requireTransform() {
  if (hasRequiredTransform) return transform_1;
  hasRequiredTransform = 1;
  transform_1 = { transform };
  function transform({
    logger: logger2,
    message,
    transport,
    initialData = message?.data || [],
    transforms = transport?.transforms
  }) {
    return transforms.reduce((data, trans) => {
      if (typeof trans === "function") {
        return trans({ data, logger: logger2, message, transport });
      }
      return data;
    }, initialData);
  }
  return transform_1;
}
var console_1$1;
var hasRequiredConsole$1;
function requireConsole$1() {
  if (hasRequiredConsole$1) return console_1$1;
  hasRequiredConsole$1 = 1;
  const { transform } = requireTransform();
  console_1$1 = consoleTransportRendererFactory;
  const consoleMethods = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    verbose: console.info,
    debug: console.debug,
    silly: console.debug,
    log: console.log
  };
  function consoleTransportRendererFactory(logger2) {
    return Object.assign(transport, {
      format: "{h}:{i}:{s}.{ms}{scope} › {text}",
      transforms: [formatDataFn],
      writeFn({ message: { level, data } }) {
        const consoleLogFn = consoleMethods[level] || consoleMethods.info;
        setTimeout(() => consoleLogFn(...data));
      }
    });
    function transport(message) {
      transport.writeFn({
        message: { ...message, data: transform({ logger: logger2, message, transport }) }
      });
    }
  }
  function formatDataFn({
    data = [],
    logger: logger2 = {},
    message = {},
    transport = {}
  }) {
    if (typeof transport.format === "function") {
      return transport.format({
        data,
        level: message?.level || "info",
        logger: logger2,
        message,
        transport
      });
    }
    if (typeof transport.format !== "string") {
      return data;
    }
    data.unshift(transport.format);
    if (typeof data[1] === "string" && data[1].match(/%[1cdfiOos]/)) {
      data = [`${data[0]}${data[1]}`, ...data.slice(2)];
    }
    const date = message.date || /* @__PURE__ */ new Date();
    data[0] = data[0].replace(/\{(\w+)}/g, (substring, name) => {
      switch (name) {
        case "level":
          return message.level;
        case "logId":
          return message.logId;
        case "scope": {
          const scope2 = message.scope || logger2.scope?.defaultLabel;
          return scope2 ? ` (${scope2})` : "";
        }
        case "text":
          return "";
        case "y":
          return date.getFullYear().toString(10);
        case "m":
          return (date.getMonth() + 1).toString(10).padStart(2, "0");
        case "d":
          return date.getDate().toString(10).padStart(2, "0");
        case "h":
          return date.getHours().toString(10).padStart(2, "0");
        case "i":
          return date.getMinutes().toString(10).padStart(2, "0");
        case "s":
          return date.getSeconds().toString(10).padStart(2, "0");
        case "ms":
          return date.getMilliseconds().toString(10).padStart(3, "0");
        case "iso":
          return date.toISOString();
        default:
          return message.variables?.[name] || substring;
      }
    }).trim();
    return data;
  }
  return console_1$1;
}
var ipc$1;
var hasRequiredIpc$1;
function requireIpc$1() {
  if (hasRequiredIpc$1) return ipc$1;
  hasRequiredIpc$1 = 1;
  const { transform } = requireTransform();
  ipc$1 = ipcTransportRendererFactory;
  const RESTRICTED_TYPES = /* @__PURE__ */ new Set([Promise, WeakMap, WeakSet]);
  function ipcTransportRendererFactory(logger2) {
    return Object.assign(transport, {
      depth: 5,
      transforms: [serializeFn]
    });
    function transport(message) {
      if (!window.__electronLog) {
        logger2.processMessage(
          {
            data: ["electron-log: logger isn't initialized in the main process"],
            level: "error"
          },
          { transports: ["console"] }
        );
        return;
      }
      try {
        const serialized = transform({
          initialData: message,
          logger: logger2,
          message,
          transport
        });
        __electronLog.sendToMain(serialized);
      } catch (e) {
        logger2.transports.console({
          data: ["electronLog.transports.ipc", e, "data:", message.data],
          level: "error"
        });
      }
    }
  }
  function isPrimitive(value) {
    return Object(value) !== value;
  }
  function serializeFn({
    data,
    depth,
    seen = /* @__PURE__ */ new WeakSet(),
    transport = {}
  } = {}) {
    const actualDepth = depth || transport.depth || 5;
    if (seen.has(data)) {
      return "[Circular]";
    }
    if (actualDepth < 1) {
      if (isPrimitive(data)) {
        return data;
      }
      if (Array.isArray(data)) {
        return "[Array]";
      }
      return `[${typeof data}]`;
    }
    if (["function", "symbol"].includes(typeof data)) {
      return data.toString();
    }
    if (isPrimitive(data)) {
      return data;
    }
    if (RESTRICTED_TYPES.has(data.constructor)) {
      return `[${data.constructor.name}]`;
    }
    if (Array.isArray(data)) {
      return data.map((item) => serializeFn({
        data: item,
        depth: actualDepth - 1,
        seen
      }));
    }
    if (data instanceof Date) {
      return data.toISOString();
    }
    if (data instanceof Error) {
      return data.stack;
    }
    if (data instanceof Map) {
      return new Map(
        Array.from(data).map(([key, value]) => [
          serializeFn({ data: key, depth: actualDepth - 1, seen }),
          serializeFn({ data: value, depth: actualDepth - 1, seen })
        ])
      );
    }
    if (data instanceof Set) {
      return new Set(
        Array.from(data).map(
          (val) => serializeFn({ data: val, depth: actualDepth - 1, seen })
        )
      );
    }
    seen.add(data);
    return Object.fromEntries(
      Object.entries(data).map(
        ([key, value]) => [
          key,
          serializeFn({ data: value, depth: actualDepth - 1, seen })
        ]
      )
    );
  }
  return ipc$1;
}
var hasRequiredRenderer;
function requireRenderer() {
  if (hasRequiredRenderer) return renderer.exports;
  hasRequiredRenderer = 1;
  (function(module) {
    const Logger = requireLogger();
    const RendererErrorHandler = requireRendererErrorHandler();
    const transportConsole = requireConsole$1();
    const transportIpc = requireIpc$1();
    if (typeof process === "object" && process.type === "browser") {
      console.warn(
        "electron-log/renderer is loaded in the main process. It could cause unexpected behaviour."
      );
    }
    module.exports = createLogger();
    module.exports.Logger = Logger;
    module.exports.default = module.exports;
    function createLogger() {
      const logger2 = new Logger({
        allowUnknownLevel: true,
        errorHandler: new RendererErrorHandler(),
        initializeFn: () => {
        },
        logId: "default",
        transportFactories: {
          console: transportConsole,
          ipc: transportIpc
        },
        variables: {
          processType: "renderer"
        }
      });
      logger2.errorHandler.setOptions({
        logFn({ error, errorName, showDialog }) {
          logger2.transports.console({
            data: [errorName, error].filter(Boolean),
            level: "error"
          });
          logger2.transports.ipc({
            cmd: "errorHandler",
            error: {
              cause: error?.cause,
              code: error?.code,
              name: error?.name,
              message: error?.message,
              stack: error?.stack
            },
            errorName,
            logId: logger2.logId,
            showDialog
          });
        }
      });
      if (typeof window === "object") {
        window.addEventListener("message", (event) => {
          const { cmd, logId, ...message } = event.data || {};
          const instance = Logger.getInstance({ logId });
          if (cmd === "message") {
            instance.processMessage(message, { transports: ["console"] });
          }
        });
      }
      return new Proxy(logger2, {
        get(target, prop) {
          if (typeof target[prop] !== "undefined") {
            return target[prop];
          }
          return (...data) => logger2.logData(data, { level: prop });
        }
      });
    }
  })(renderer);
  return renderer.exports;
}
var packageJson;
var hasRequiredPackageJson;
function requirePackageJson() {
  if (hasRequiredPackageJson) return packageJson;
  hasRequiredPackageJson = 1;
  const fs2 = fs__default$1;
  const path2 = require$$1;
  packageJson = {
    findAndReadPackageJson,
    tryReadJsonAt
  };
  function findAndReadPackageJson() {
    return tryReadJsonAt(getMainModulePath()) || tryReadJsonAt(extractPathFromArgs()) || tryReadJsonAt(process.resourcesPath, "app.asar") || tryReadJsonAt(process.resourcesPath, "app") || tryReadJsonAt(process.cwd()) || { name: void 0, version: void 0 };
  }
  function tryReadJsonAt(...searchPaths) {
    if (!searchPaths[0]) {
      return void 0;
    }
    try {
      const searchPath = path2.join(...searchPaths);
      const fileName = findUp("package.json", searchPath);
      if (!fileName) {
        return void 0;
      }
      const json = JSON.parse(fs2.readFileSync(fileName, "utf8"));
      const name = json?.productName || json?.name;
      if (!name || name.toLowerCase() === "electron") {
        return void 0;
      }
      if (name) {
        return { name, version: json?.version };
      }
      return void 0;
    } catch (e) {
      return void 0;
    }
  }
  function findUp(fileName, cwd) {
    let currentPath = cwd;
    while (true) {
      const parsedPath = path2.parse(currentPath);
      const root = parsedPath.root;
      const dir = parsedPath.dir;
      if (fs2.existsSync(path2.join(currentPath, fileName))) {
        return path2.resolve(path2.join(currentPath, fileName));
      }
      if (currentPath === root) {
        return null;
      }
      currentPath = dir;
    }
  }
  function extractPathFromArgs() {
    const matchedArgs = process.argv.filter((arg) => {
      return arg.indexOf("--user-data-dir=") === 0;
    });
    if (matchedArgs.length === 0 || typeof matchedArgs[0] !== "string") {
      return null;
    }
    const userDataDir = matchedArgs[0];
    return userDataDir.replace("--user-data-dir=", "");
  }
  function getMainModulePath() {
    try {
      return require2.main?.filename;
    } catch {
      return void 0;
    }
  }
  return packageJson;
}
var NodeExternalApi_1;
var hasRequiredNodeExternalApi;
function requireNodeExternalApi() {
  if (hasRequiredNodeExternalApi) return NodeExternalApi_1;
  hasRequiredNodeExternalApi = 1;
  const childProcess = require$$0;
  const os = require$$1$1;
  const path2 = require$$1;
  const packageJson2 = requirePackageJson();
  class NodeExternalApi {
    appName = void 0;
    appPackageJson = void 0;
    platform = process.platform;
    getAppLogPath(appName = this.getAppName()) {
      if (this.platform === "darwin") {
        return path2.join(this.getSystemPathHome(), "Library/Logs", appName);
      }
      return path2.join(this.getAppUserDataPath(appName), "logs");
    }
    getAppName() {
      const appName = this.appName || this.getAppPackageJson()?.name;
      if (!appName) {
        throw new Error(
          "electron-log can't determine the app name. It tried these methods:\n1. Use `electron.app.name`\n2. Use productName or name from the nearest package.json`\nYou can also set it through log.transports.file.setAppName()"
        );
      }
      return appName;
    }
    /**
     * @private
     * @returns {undefined}
     */
    getAppPackageJson() {
      if (typeof this.appPackageJson !== "object") {
        this.appPackageJson = packageJson2.findAndReadPackageJson();
      }
      return this.appPackageJson;
    }
    getAppUserDataPath(appName = this.getAppName()) {
      return appName ? path2.join(this.getSystemPathAppData(), appName) : void 0;
    }
    getAppVersion() {
      return this.getAppPackageJson()?.version;
    }
    getElectronLogPath() {
      return this.getAppLogPath();
    }
    getMacOsVersion() {
      const release = Number(os.release().split(".")[0]);
      if (release <= 19) {
        return `10.${release - 4}`;
      }
      return release - 9;
    }
    /**
     * @protected
     * @returns {string}
     */
    getOsVersion() {
      let osName = os.type().replace("_", " ");
      let osVersion = os.release();
      if (osName === "Darwin") {
        osName = "macOS";
        osVersion = this.getMacOsVersion();
      }
      return `${osName} ${osVersion}`;
    }
    /**
     * @return {PathVariables}
     */
    getPathVariables() {
      const appName = this.getAppName();
      const appVersion2 = this.getAppVersion();
      const self = this;
      return {
        appData: this.getSystemPathAppData(),
        appName,
        appVersion: appVersion2,
        get electronDefaultDir() {
          return self.getElectronLogPath();
        },
        home: this.getSystemPathHome(),
        libraryDefaultDir: this.getAppLogPath(appName),
        libraryTemplate: this.getAppLogPath("{appName}"),
        temp: this.getSystemPathTemp(),
        userData: this.getAppUserDataPath(appName)
      };
    }
    getSystemPathAppData() {
      const home = this.getSystemPathHome();
      switch (this.platform) {
        case "darwin": {
          return path2.join(home, "Library/Application Support");
        }
        case "win32": {
          return process.env.APPDATA || path2.join(home, "AppData/Roaming");
        }
        default: {
          return process.env.XDG_CONFIG_HOME || path2.join(home, ".config");
        }
      }
    }
    getSystemPathHome() {
      return os.homedir?.() || process.env.HOME;
    }
    getSystemPathTemp() {
      return os.tmpdir();
    }
    getVersions() {
      return {
        app: `${this.getAppName()} ${this.getAppVersion()}`,
        electron: void 0,
        os: this.getOsVersion()
      };
    }
    isDev() {
      return process.env.NODE_ENV === "development" || process.env.ELECTRON_IS_DEV === "1";
    }
    isElectron() {
      return Boolean(process.versions.electron);
    }
    onAppEvent(_eventName, _handler) {
    }
    onAppReady(handler) {
      handler();
    }
    onEveryWebContentsEvent(eventName, handler) {
    }
    /**
     * Listen to async messages sent from opposite process
     * @param {string} channel
     * @param {function} listener
     */
    onIpc(channel, listener) {
    }
    onIpcInvoke(channel, listener) {
    }
    /**
     * @param {string} url
     * @param {Function} [logFunction]
     */
    openUrl(url, logFunction = console.error) {
      const startMap = { darwin: "open", win32: "start", linux: "xdg-open" };
      const start = startMap[process.platform] || "xdg-open";
      childProcess.exec(`${start} ${url}`, {}, (err) => {
        if (err) {
          logFunction(err);
        }
      });
    }
    setAppName(appName) {
      this.appName = appName;
    }
    setPlatform(platform) {
      this.platform = platform;
    }
    setPreloadFileForSessions({
      filePath,
      // eslint-disable-line no-unused-vars
      includeFutureSession = true,
      // eslint-disable-line no-unused-vars
      getSessions = () => []
      // eslint-disable-line no-unused-vars
    }) {
    }
    /**
     * Sent a message to opposite process
     * @param {string} channel
     * @param {any} message
     */
    sendIpc(channel, message) {
    }
    showErrorBox(title, message) {
    }
  }
  NodeExternalApi_1 = NodeExternalApi;
  return NodeExternalApi_1;
}
var ElectronExternalApi_1;
var hasRequiredElectronExternalApi;
function requireElectronExternalApi() {
  if (hasRequiredElectronExternalApi) return ElectronExternalApi_1;
  hasRequiredElectronExternalApi = 1;
  const path2 = require$$1;
  const NodeExternalApi = requireNodeExternalApi();
  class ElectronExternalApi extends NodeExternalApi {
    /**
     * @type {typeof Electron}
     */
    electron = void 0;
    /**
     * @param {object} options
     * @param {typeof Electron} [options.electron]
     */
    constructor({ electron } = {}) {
      super();
      this.electron = electron;
    }
    getAppName() {
      let appName;
      try {
        appName = this.appName || this.electron.app?.name || this.electron.app?.getName();
      } catch {
      }
      return appName || super.getAppName();
    }
    getAppUserDataPath(appName) {
      return this.getPath("userData") || super.getAppUserDataPath(appName);
    }
    getAppVersion() {
      let appVersion2;
      try {
        appVersion2 = this.electron.app?.getVersion();
      } catch {
      }
      return appVersion2 || super.getAppVersion();
    }
    getElectronLogPath() {
      return this.getPath("logs") || super.getElectronLogPath();
    }
    /**
     * @private
     * @param {any} name
     * @returns {string|undefined}
     */
    getPath(name) {
      try {
        return this.electron.app?.getPath(name);
      } catch {
        return void 0;
      }
    }
    getVersions() {
      return {
        app: `${this.getAppName()} ${this.getAppVersion()}`,
        electron: `Electron ${process.versions.electron}`,
        os: this.getOsVersion()
      };
    }
    getSystemPathAppData() {
      return this.getPath("appData") || super.getSystemPathAppData();
    }
    isDev() {
      if (this.electron.app?.isPackaged !== void 0) {
        return !this.electron.app.isPackaged;
      }
      if (typeof process.execPath === "string") {
        const execFileName = path2.basename(process.execPath).toLowerCase();
        return execFileName.startsWith("electron");
      }
      return super.isDev();
    }
    onAppEvent(eventName, handler) {
      this.electron.app?.on(eventName, handler);
      return () => {
        this.electron.app?.off(eventName, handler);
      };
    }
    onAppReady(handler) {
      if (this.electron.app?.isReady()) {
        handler();
      } else if (this.electron.app?.once) {
        this.electron.app?.once("ready", handler);
      } else {
        handler();
      }
    }
    onEveryWebContentsEvent(eventName, handler) {
      this.electron.webContents?.getAllWebContents()?.forEach((webContents) => {
        webContents.on(eventName, handler);
      });
      this.electron.app?.on("web-contents-created", onWebContentsCreated);
      return () => {
        this.electron.webContents?.getAllWebContents().forEach((webContents) => {
          webContents.off(eventName, handler);
        });
        this.electron.app?.off("web-contents-created", onWebContentsCreated);
      };
      function onWebContentsCreated(_, webContents) {
        webContents.on(eventName, handler);
      }
    }
    /**
     * Listen to async messages sent from opposite process
     * @param {string} channel
     * @param {function} listener
     */
    onIpc(channel, listener) {
      this.electron.ipcMain?.on(channel, listener);
    }
    onIpcInvoke(channel, listener) {
      this.electron.ipcMain?.handle?.(channel, listener);
    }
    /**
     * @param {string} url
     * @param {Function} [logFunction]
     */
    openUrl(url, logFunction = console.error) {
      this.electron.shell?.openExternal(url).catch(logFunction);
    }
    setPreloadFileForSessions({
      filePath,
      includeFutureSession = true,
      getSessions = () => [this.electron.session?.defaultSession]
    }) {
      for (const session of getSessions().filter(Boolean)) {
        setPreload(session);
      }
      if (includeFutureSession) {
        this.onAppEvent("session-created", (session) => {
          setPreload(session);
        });
      }
      function setPreload(session) {
        if (typeof session.registerPreloadScript === "function") {
          session.registerPreloadScript({
            filePath,
            id: "electron-log-preload",
            type: "frame"
          });
        } else {
          session.setPreloads([...session.getPreloads(), filePath]);
        }
      }
    }
    /**
     * Sent a message to opposite process
     * @param {string} channel
     * @param {any} message
     */
    sendIpc(channel, message) {
      this.electron.BrowserWindow?.getAllWindows()?.forEach((wnd) => {
        if (wnd.webContents?.isDestroyed() === false && wnd.webContents?.isCrashed() === false) {
          wnd.webContents.send(channel, message);
        }
      });
    }
    showErrorBox(title, message) {
      this.electron.dialog?.showErrorBox(title, message);
    }
  }
  ElectronExternalApi_1 = ElectronExternalApi;
  return ElectronExternalApi_1;
}
var initialize;
var hasRequiredInitialize;
function requireInitialize() {
  if (hasRequiredInitialize) return initialize;
  hasRequiredInitialize = 1;
  const fs2 = fs__default$1;
  const os = require$$1$1;
  const path2 = require$$1;
  const preloadInitializeFn = requireElectronLogPreload();
  let preloadInitialized = false;
  let spyConsoleInitialized = false;
  initialize = {
    initialize({
      externalApi,
      getSessions,
      includeFutureSession,
      logger: logger2,
      preload = true,
      spyRendererConsole = false
    }) {
      externalApi.onAppReady(() => {
        try {
          if (preload) {
            initializePreload({
              externalApi,
              getSessions,
              includeFutureSession,
              logger: logger2,
              preloadOption: preload
            });
          }
          if (spyRendererConsole) {
            initializeSpyRendererConsole({ externalApi, logger: logger2 });
          }
        } catch (err) {
          logger2.warn(err);
        }
      });
    }
  };
  function initializePreload({
    externalApi,
    getSessions,
    includeFutureSession,
    logger: logger2,
    preloadOption
  }) {
    let preloadPath = typeof preloadOption === "string" ? preloadOption : void 0;
    if (preloadInitialized) {
      logger2.warn(new Error("log.initialize({ preload }) already called").stack);
      return;
    }
    preloadInitialized = true;
    try {
      preloadPath = path2.resolve(
        __dirname,
        "../renderer/electron-log-preload.js"
      );
    } catch {
    }
    if (!preloadPath || !fs2.existsSync(preloadPath)) {
      preloadPath = path2.join(
        externalApi.getAppUserDataPath() || os.tmpdir(),
        "electron-log-preload.js"
      );
      const preloadCode = `
      try {
        (${preloadInitializeFn.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;
      fs2.writeFileSync(preloadPath, preloadCode, "utf8");
    }
    externalApi.setPreloadFileForSessions({
      filePath: preloadPath,
      includeFutureSession,
      getSessions
    });
  }
  function initializeSpyRendererConsole({ externalApi, logger: logger2 }) {
    if (spyConsoleInitialized) {
      logger2.warn(
        new Error("log.initialize({ spyRendererConsole }) already called").stack
      );
      return;
    }
    spyConsoleInitialized = true;
    const levels = ["debug", "info", "warn", "error"];
    externalApi.onEveryWebContentsEvent(
      "console-message",
      (event, level, message) => {
        logger2.processMessage({
          data: [message],
          level: levels[level],
          variables: { processType: "renderer" }
        });
      }
    );
  }
  return initialize;
}
var ErrorHandler_1;
var hasRequiredErrorHandler;
function requireErrorHandler() {
  if (hasRequiredErrorHandler) return ErrorHandler_1;
  hasRequiredErrorHandler = 1;
  class ErrorHandler {
    externalApi = void 0;
    isActive = false;
    logFn = void 0;
    onError = void 0;
    showDialog = true;
    constructor({
      externalApi,
      logFn = void 0,
      onError = void 0,
      showDialog = void 0
    } = {}) {
      this.createIssue = this.createIssue.bind(this);
      this.handleError = this.handleError.bind(this);
      this.handleRejection = this.handleRejection.bind(this);
      this.setOptions({ externalApi, logFn, onError, showDialog });
      this.startCatching = this.startCatching.bind(this);
      this.stopCatching = this.stopCatching.bind(this);
    }
    handle(error, {
      logFn = this.logFn,
      onError = this.onError,
      processType = "browser",
      showDialog = this.showDialog,
      errorName = ""
    } = {}) {
      error = normalizeError(error);
      try {
        if (typeof onError === "function") {
          const versions = this.externalApi?.getVersions() || {};
          const createIssue = this.createIssue;
          const result = onError({
            createIssue,
            error,
            errorName,
            processType,
            versions
          });
          if (result === false) {
            return;
          }
        }
        errorName ? logFn(errorName, error) : logFn(error);
        if (showDialog && !errorName.includes("rejection") && this.externalApi) {
          this.externalApi.showErrorBox(
            `A JavaScript error occurred in the ${processType} process`,
            error.stack
          );
        }
      } catch {
        console.error(error);
      }
    }
    setOptions({ externalApi, logFn, onError, showDialog }) {
      if (typeof externalApi === "object") {
        this.externalApi = externalApi;
      }
      if (typeof logFn === "function") {
        this.logFn = logFn;
      }
      if (typeof onError === "function") {
        this.onError = onError;
      }
      if (typeof showDialog === "boolean") {
        this.showDialog = showDialog;
      }
    }
    startCatching({ onError, showDialog } = {}) {
      if (this.isActive) {
        return;
      }
      this.isActive = true;
      this.setOptions({ onError, showDialog });
      process.on("uncaughtException", this.handleError);
      process.on("unhandledRejection", this.handleRejection);
    }
    stopCatching() {
      this.isActive = false;
      process.removeListener("uncaughtException", this.handleError);
      process.removeListener("unhandledRejection", this.handleRejection);
    }
    createIssue(pageUrl, queryParams) {
      this.externalApi?.openUrl(
        `${pageUrl}?${new URLSearchParams(queryParams).toString()}`
      );
    }
    handleError(error) {
      this.handle(error, { errorName: "Unhandled" });
    }
    handleRejection(reason) {
      const error = reason instanceof Error ? reason : new Error(JSON.stringify(reason));
      this.handle(error, { errorName: "Unhandled rejection" });
    }
  }
  function normalizeError(e) {
    if (e instanceof Error) {
      return e;
    }
    if (e && typeof e === "object") {
      if (e.message) {
        return Object.assign(new Error(e.message), e);
      }
      try {
        return new Error(JSON.stringify(e));
      } catch (serErr) {
        return new Error(`Couldn't normalize error ${String(e)}: ${serErr}`);
      }
    }
    return new Error(`Can't normalize error ${String(e)}`);
  }
  ErrorHandler_1 = ErrorHandler;
  return ErrorHandler_1;
}
var EventLogger_1;
var hasRequiredEventLogger;
function requireEventLogger() {
  if (hasRequiredEventLogger) return EventLogger_1;
  hasRequiredEventLogger = 1;
  class EventLogger {
    disposers = [];
    format = "{eventSource}#{eventName}:";
    formatters = {
      app: {
        "certificate-error": ({ args }) => {
          return this.arrayToObject(args.slice(1, 4), [
            "url",
            "error",
            "certificate"
          ]);
        },
        "child-process-gone": ({ args }) => {
          return args.length === 1 ? args[0] : args;
        },
        "render-process-gone": ({ args: [webContents, details] }) => {
          return details && typeof details === "object" ? { ...details, ...this.getWebContentsDetails(webContents) } : [];
        }
      },
      webContents: {
        "console-message": ({ args: [level, message, line, sourceId] }) => {
          if (level < 3) {
            return void 0;
          }
          return { message, source: `${sourceId}:${line}` };
        },
        "did-fail-load": ({ args }) => {
          return this.arrayToObject(args, [
            "errorCode",
            "errorDescription",
            "validatedURL",
            "isMainFrame",
            "frameProcessId",
            "frameRoutingId"
          ]);
        },
        "did-fail-provisional-load": ({ args }) => {
          return this.arrayToObject(args, [
            "errorCode",
            "errorDescription",
            "validatedURL",
            "isMainFrame",
            "frameProcessId",
            "frameRoutingId"
          ]);
        },
        "plugin-crashed": ({ args }) => {
          return this.arrayToObject(args, ["name", "version"]);
        },
        "preload-error": ({ args }) => {
          return this.arrayToObject(args, ["preloadPath", "error"]);
        }
      }
    };
    events = {
      app: {
        "certificate-error": true,
        "child-process-gone": true,
        "render-process-gone": true
      },
      webContents: {
        // 'console-message': true,
        "did-fail-load": true,
        "did-fail-provisional-load": true,
        "plugin-crashed": true,
        "preload-error": true,
        "unresponsive": true
      }
    };
    externalApi = void 0;
    level = "error";
    scope = "";
    constructor(options = {}) {
      this.setOptions(options);
    }
    setOptions({
      events,
      externalApi,
      level,
      logger: logger2,
      format: format2,
      formatters,
      scope: scope2
    }) {
      if (typeof events === "object") {
        this.events = events;
      }
      if (typeof externalApi === "object") {
        this.externalApi = externalApi;
      }
      if (typeof level === "string") {
        this.level = level;
      }
      if (typeof logger2 === "object") {
        this.logger = logger2;
      }
      if (typeof format2 === "string" || typeof format2 === "function") {
        this.format = format2;
      }
      if (typeof formatters === "object") {
        this.formatters = formatters;
      }
      if (typeof scope2 === "string") {
        this.scope = scope2;
      }
    }
    startLogging(options = {}) {
      this.setOptions(options);
      this.disposeListeners();
      for (const eventName of this.getEventNames(this.events.app)) {
        this.disposers.push(
          this.externalApi.onAppEvent(eventName, (...handlerArgs) => {
            this.handleEvent({ eventSource: "app", eventName, handlerArgs });
          })
        );
      }
      for (const eventName of this.getEventNames(this.events.webContents)) {
        this.disposers.push(
          this.externalApi.onEveryWebContentsEvent(
            eventName,
            (...handlerArgs) => {
              this.handleEvent(
                { eventSource: "webContents", eventName, handlerArgs }
              );
            }
          )
        );
      }
    }
    stopLogging() {
      this.disposeListeners();
    }
    arrayToObject(array, fieldNames) {
      const obj = {};
      fieldNames.forEach((fieldName, index) => {
        obj[fieldName] = array[index];
      });
      if (array.length > fieldNames.length) {
        obj.unknownArgs = array.slice(fieldNames.length);
      }
      return obj;
    }
    disposeListeners() {
      this.disposers.forEach((disposer) => disposer());
      this.disposers = [];
    }
    formatEventLog({ eventName, eventSource, handlerArgs }) {
      const [event, ...args] = handlerArgs;
      if (typeof this.format === "function") {
        return this.format({ args, event, eventName, eventSource });
      }
      const formatter = this.formatters[eventSource]?.[eventName];
      let formattedArgs = args;
      if (typeof formatter === "function") {
        formattedArgs = formatter({ args, event, eventName, eventSource });
      }
      if (!formattedArgs) {
        return void 0;
      }
      const eventData = {};
      if (Array.isArray(formattedArgs)) {
        eventData.args = formattedArgs;
      } else if (typeof formattedArgs === "object") {
        Object.assign(eventData, formattedArgs);
      }
      if (eventSource === "webContents") {
        Object.assign(eventData, this.getWebContentsDetails(event?.sender));
      }
      const title = this.format.replace("{eventSource}", eventSource === "app" ? "App" : "WebContents").replace("{eventName}", eventName);
      return [title, eventData];
    }
    getEventNames(eventMap) {
      if (!eventMap || typeof eventMap !== "object") {
        return [];
      }
      return Object.entries(eventMap).filter(([_, listen]) => listen).map(([eventName]) => eventName);
    }
    getWebContentsDetails(webContents) {
      if (!webContents?.loadURL) {
        return {};
      }
      try {
        return {
          webContents: {
            id: webContents.id,
            url: webContents.getURL()
          }
        };
      } catch {
        return {};
      }
    }
    handleEvent({ eventName, eventSource, handlerArgs }) {
      const log2 = this.formatEventLog({ eventName, eventSource, handlerArgs });
      if (log2) {
        const logFns = this.scope ? this.logger.scope(this.scope) : this.logger;
        logFns?.[this.level]?.(...log2);
      }
    }
  }
  EventLogger_1 = EventLogger;
  return EventLogger_1;
}
var format;
var hasRequiredFormat;
function requireFormat() {
  if (hasRequiredFormat) return format;
  hasRequiredFormat = 1;
  const { transform } = requireTransform();
  format = {
    concatFirstStringElements,
    formatScope,
    formatText,
    formatVariables,
    timeZoneFromOffset,
    format({ message, logger: logger2, transport, data = message?.data }) {
      switch (typeof transport.format) {
        case "string": {
          return transform({
            message,
            logger: logger2,
            transforms: [formatVariables, formatScope, formatText],
            transport,
            initialData: [transport.format, ...data]
          });
        }
        case "function": {
          return transport.format({
            data,
            level: message?.level || "info",
            logger: logger2,
            message,
            transport
          });
        }
        default: {
          return data;
        }
      }
    }
  };
  function concatFirstStringElements({ data }) {
    if (typeof data[0] !== "string" || typeof data[1] !== "string") {
      return data;
    }
    if (data[0].match(/%[1cdfiOos]/)) {
      return data;
    }
    return [`${data[0]} ${data[1]}`, ...data.slice(2)];
  }
  function timeZoneFromOffset(minutesOffset) {
    const minutesPositive = Math.abs(minutesOffset);
    const sign = minutesOffset > 0 ? "-" : "+";
    const hours = Math.floor(minutesPositive / 60).toString().padStart(2, "0");
    const minutes = (minutesPositive % 60).toString().padStart(2, "0");
    return `${sign}${hours}:${minutes}`;
  }
  function formatScope({ data, logger: logger2, message }) {
    const { defaultLabel, labelLength } = logger2?.scope || {};
    const template = data[0];
    let label = message.scope;
    if (!label) {
      label = defaultLabel;
    }
    let scopeText;
    if (label === "") {
      scopeText = labelLength > 0 ? "".padEnd(labelLength + 3) : "";
    } else if (typeof label === "string") {
      scopeText = ` (${label})`.padEnd(labelLength + 3);
    } else {
      scopeText = "";
    }
    data[0] = template.replace("{scope}", scopeText);
    return data;
  }
  function formatVariables({ data, message }) {
    let template = data[0];
    if (typeof template !== "string") {
      return data;
    }
    template = template.replace("{level}]", `${message.level}]`.padEnd(6, " "));
    const date = message.date || /* @__PURE__ */ new Date();
    data[0] = template.replace(/\{(\w+)}/g, (substring, name) => {
      switch (name) {
        case "level":
          return message.level || "info";
        case "logId":
          return message.logId;
        case "y":
          return date.getFullYear().toString(10);
        case "m":
          return (date.getMonth() + 1).toString(10).padStart(2, "0");
        case "d":
          return date.getDate().toString(10).padStart(2, "0");
        case "h":
          return date.getHours().toString(10).padStart(2, "0");
        case "i":
          return date.getMinutes().toString(10).padStart(2, "0");
        case "s":
          return date.getSeconds().toString(10).padStart(2, "0");
        case "ms":
          return date.getMilliseconds().toString(10).padStart(3, "0");
        case "z":
          return timeZoneFromOffset(date.getTimezoneOffset());
        case "iso":
          return date.toISOString();
        default: {
          return message.variables?.[name] || substring;
        }
      }
    }).trim();
    return data;
  }
  function formatText({ data }) {
    const template = data[0];
    if (typeof template !== "string") {
      return data;
    }
    const textTplPosition = template.lastIndexOf("{text}");
    if (textTplPosition === template.length - 6) {
      data[0] = template.replace(/\s?{text}/, "");
      if (data[0] === "") {
        data.shift();
      }
      return data;
    }
    const templatePieces = template.split("{text}");
    let result = [];
    if (templatePieces[0] !== "") {
      result.push(templatePieces[0]);
    }
    result = result.concat(data.slice(1));
    if (templatePieces[1] !== "") {
      result.push(templatePieces[1]);
    }
    return result;
  }
  return format;
}
var object = { exports: {} };
var hasRequiredObject;
function requireObject() {
  if (hasRequiredObject) return object.exports;
  hasRequiredObject = 1;
  (function(module) {
    const util = require$$0$1;
    module.exports = {
      serialize,
      maxDepth({ data, transport, depth = transport?.depth ?? 6 }) {
        if (!data) {
          return data;
        }
        if (depth < 1) {
          if (Array.isArray(data)) return "[array]";
          if (typeof data === "object" && data) return "[object]";
          return data;
        }
        if (Array.isArray(data)) {
          return data.map((child) => module.exports.maxDepth({
            data: child,
            depth: depth - 1
          }));
        }
        if (typeof data !== "object") {
          return data;
        }
        if (data && typeof data.toISOString === "function") {
          return data;
        }
        if (data === null) {
          return null;
        }
        if (data instanceof Error) {
          return data;
        }
        const newJson = {};
        for (const i in data) {
          if (!Object.prototype.hasOwnProperty.call(data, i)) continue;
          newJson[i] = module.exports.maxDepth({
            data: data[i],
            depth: depth - 1
          });
        }
        return newJson;
      },
      toJSON({ data }) {
        return JSON.parse(JSON.stringify(data, createSerializer()));
      },
      toString({ data, transport }) {
        const inspectOptions = transport?.inspectOptions || {};
        const simplifiedData = data.map((item) => {
          if (item === void 0) {
            return void 0;
          }
          try {
            const str = JSON.stringify(item, createSerializer(), "  ");
            return str === void 0 ? void 0 : JSON.parse(str);
          } catch (e) {
            return item;
          }
        });
        return util.formatWithOptions(inspectOptions, ...simplifiedData);
      }
    };
    function createSerializer(options = {}) {
      const seen = /* @__PURE__ */ new WeakSet();
      return function(key, value) {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return void 0;
          }
          seen.add(value);
        }
        return serialize(key, value, options);
      };
    }
    function serialize(key, value, options = {}) {
      const serializeMapAndSet = options?.serializeMapAndSet !== false;
      if (value instanceof Error) {
        return value.stack;
      }
      if (!value) {
        return value;
      }
      if (typeof value === "function") {
        return `[function] ${value.toString()}`;
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (serializeMapAndSet && value instanceof Map && Object.fromEntries) {
        return Object.fromEntries(value);
      }
      if (serializeMapAndSet && value instanceof Set && Array.from) {
        return Array.from(value);
      }
      return value;
    }
  })(object);
  return object.exports;
}
var style;
var hasRequiredStyle;
function requireStyle() {
  if (hasRequiredStyle) return style;
  hasRequiredStyle = 1;
  style = {
    transformStyles,
    applyAnsiStyles({ data }) {
      return transformStyles(data, styleToAnsi, resetAnsiStyle);
    },
    removeStyles({ data }) {
      return transformStyles(data, () => "");
    }
  };
  const ANSI_COLORS = {
    unset: "\x1B[0m",
    black: "\x1B[30m",
    red: "\x1B[31m",
    green: "\x1B[32m",
    yellow: "\x1B[33m",
    blue: "\x1B[34m",
    magenta: "\x1B[35m",
    cyan: "\x1B[36m",
    white: "\x1B[37m",
    gray: "\x1B[90m"
  };
  function styleToAnsi(style2) {
    const color = style2.replace(/color:\s*(\w+).*/, "$1").toLowerCase();
    return ANSI_COLORS[color] || "";
  }
  function resetAnsiStyle(string) {
    return string + ANSI_COLORS.unset;
  }
  function transformStyles(data, onStyleFound, onStyleApplied) {
    const foundStyles = {};
    return data.reduce((result, item, index, array) => {
      if (foundStyles[index]) {
        return result;
      }
      if (typeof item === "string") {
        let valueIndex = index;
        let styleApplied = false;
        item = item.replace(/%[1cdfiOos]/g, (match) => {
          valueIndex += 1;
          if (match !== "%c") {
            return match;
          }
          const style2 = array[valueIndex];
          if (typeof style2 === "string") {
            foundStyles[valueIndex] = true;
            styleApplied = true;
            return onStyleFound(style2, item);
          }
          return match;
        });
        if (styleApplied && onStyleApplied) {
          item = onStyleApplied(item);
        }
      }
      result.push(item);
      return result;
    }, []);
  }
  return style;
}
var console_1;
var hasRequiredConsole;
function requireConsole() {
  if (hasRequiredConsole) return console_1;
  hasRequiredConsole = 1;
  const {
    concatFirstStringElements,
    format: format2
  } = requireFormat();
  const { maxDepth, toJSON } = requireObject();
  const {
    applyAnsiStyles,
    removeStyles
  } = requireStyle();
  const { transform } = requireTransform();
  const consoleMethods = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    verbose: console.info,
    debug: console.debug,
    silly: console.debug,
    log: console.log
  };
  console_1 = consoleTransportFactory;
  const separator = process.platform === "win32" ? ">" : "›";
  const DEFAULT_FORMAT = `%c{h}:{i}:{s}.{ms}{scope}%c ${separator} {text}`;
  Object.assign(consoleTransportFactory, {
    DEFAULT_FORMAT
  });
  function consoleTransportFactory(logger2) {
    return Object.assign(transport, {
      colorMap: {
        error: "red",
        warn: "yellow",
        info: "cyan",
        verbose: "unset",
        debug: "gray",
        silly: "gray",
        default: "unset"
      },
      format: DEFAULT_FORMAT,
      level: "silly",
      transforms: [
        addTemplateColors,
        format2,
        formatStyles,
        concatFirstStringElements,
        maxDepth,
        toJSON
      ],
      useStyles: process.env.FORCE_STYLES,
      writeFn({ message }) {
        const consoleLogFn = consoleMethods[message.level] || consoleMethods.info;
        consoleLogFn(...message.data);
      }
    });
    function transport(message) {
      const data = transform({ logger: logger2, message, transport });
      transport.writeFn({
        message: { ...message, data }
      });
    }
  }
  function addTemplateColors({ data, message, transport }) {
    if (typeof transport.format !== "string" || !transport.format.includes("%c")) {
      return data;
    }
    return [
      `color:${levelToStyle(message.level, transport)}`,
      "color:unset",
      ...data
    ];
  }
  function canUseStyles(useStyleValue, level) {
    if (typeof useStyleValue === "boolean") {
      return useStyleValue;
    }
    const useStderr = level === "error" || level === "warn";
    const stream = useStderr ? process.stderr : process.stdout;
    return stream && stream.isTTY;
  }
  function formatStyles(args) {
    const { message, transport } = args;
    const useStyles = canUseStyles(transport.useStyles, message.level);
    const nextTransform = useStyles ? applyAnsiStyles : removeStyles;
    return nextTransform(args);
  }
  function levelToStyle(level, transport) {
    return transport.colorMap[level] || transport.colorMap.default;
  }
  return console_1;
}
var File_1;
var hasRequiredFile$1;
function requireFile$1() {
  if (hasRequiredFile$1) return File_1;
  hasRequiredFile$1 = 1;
  const EventEmitter = require$$0$2;
  const fs2 = fs__default$1;
  const os = require$$1$1;
  class File extends EventEmitter {
    asyncWriteQueue = [];
    bytesWritten = 0;
    hasActiveAsyncWriting = false;
    path = null;
    initialSize = void 0;
    writeOptions = null;
    writeAsync = false;
    constructor({
      path: path2,
      writeOptions = { encoding: "utf8", flag: "a", mode: 438 },
      writeAsync = false
    }) {
      super();
      this.path = path2;
      this.writeOptions = writeOptions;
      this.writeAsync = writeAsync;
    }
    get size() {
      return this.getSize();
    }
    clear() {
      try {
        fs2.writeFileSync(this.path, "", {
          mode: this.writeOptions.mode,
          flag: "w"
        });
        this.reset();
        return true;
      } catch (e) {
        if (e.code === "ENOENT") {
          return true;
        }
        this.emit("error", e, this);
        return false;
      }
    }
    crop(bytesAfter) {
      try {
        const content = readFileSyncFromEnd(this.path, bytesAfter || 4096);
        this.clear();
        this.writeLine(`[log cropped]${os.EOL}${content}`);
      } catch (e) {
        this.emit(
          "error",
          new Error(`Couldn't crop file ${this.path}. ${e.message}`),
          this
        );
      }
    }
    getSize() {
      if (this.initialSize === void 0) {
        try {
          const stats = fs2.statSync(this.path);
          this.initialSize = stats.size;
        } catch (e) {
          this.initialSize = 0;
        }
      }
      return this.initialSize + this.bytesWritten;
    }
    increaseBytesWrittenCounter(text) {
      this.bytesWritten += Buffer.byteLength(text, this.writeOptions.encoding);
    }
    isNull() {
      return false;
    }
    nextAsyncWrite() {
      const file2 = this;
      if (this.hasActiveAsyncWriting || this.asyncWriteQueue.length === 0) {
        return;
      }
      const text = this.asyncWriteQueue.join("");
      this.asyncWriteQueue = [];
      this.hasActiveAsyncWriting = true;
      fs2.writeFile(this.path, text, this.writeOptions, (e) => {
        file2.hasActiveAsyncWriting = false;
        if (e) {
          file2.emit(
            "error",
            new Error(`Couldn't write to ${file2.path}. ${e.message}`),
            this
          );
        } else {
          file2.increaseBytesWrittenCounter(text);
        }
        file2.nextAsyncWrite();
      });
    }
    reset() {
      this.initialSize = void 0;
      this.bytesWritten = 0;
    }
    toString() {
      return this.path;
    }
    writeLine(text) {
      text += os.EOL;
      if (this.writeAsync) {
        this.asyncWriteQueue.push(text);
        this.nextAsyncWrite();
        return;
      }
      try {
        fs2.writeFileSync(this.path, text, this.writeOptions);
        this.increaseBytesWrittenCounter(text);
      } catch (e) {
        this.emit(
          "error",
          new Error(`Couldn't write to ${this.path}. ${e.message}`),
          this
        );
      }
    }
  }
  File_1 = File;
  function readFileSyncFromEnd(filePath, bytesCount) {
    const buffer = Buffer.alloc(bytesCount);
    const stats = fs2.statSync(filePath);
    const readLength = Math.min(stats.size, bytesCount);
    const offset = Math.max(0, stats.size - bytesCount);
    const fd = fs2.openSync(filePath, "r");
    const totalBytes = fs2.readSync(fd, buffer, 0, readLength, offset);
    fs2.closeSync(fd);
    return buffer.toString("utf8", 0, totalBytes);
  }
  return File_1;
}
var NullFile_1;
var hasRequiredNullFile;
function requireNullFile() {
  if (hasRequiredNullFile) return NullFile_1;
  hasRequiredNullFile = 1;
  const File = requireFile$1();
  class NullFile extends File {
    clear() {
    }
    crop() {
    }
    getSize() {
      return 0;
    }
    isNull() {
      return true;
    }
    writeLine() {
    }
  }
  NullFile_1 = NullFile;
  return NullFile_1;
}
var FileRegistry_1;
var hasRequiredFileRegistry;
function requireFileRegistry() {
  if (hasRequiredFileRegistry) return FileRegistry_1;
  hasRequiredFileRegistry = 1;
  const EventEmitter = require$$0$2;
  const fs2 = fs__default$1;
  const path2 = require$$1;
  const File = requireFile$1();
  const NullFile = requireNullFile();
  class FileRegistry extends EventEmitter {
    store = {};
    constructor() {
      super();
      this.emitError = this.emitError.bind(this);
    }
    /**
     * Provide a File object corresponding to the filePath
     * @param {string} filePath
     * @param {WriteOptions} [writeOptions]
     * @param {boolean} [writeAsync]
     * @return {File}
     */
    provide({ filePath, writeOptions = {}, writeAsync = false }) {
      let file2;
      try {
        filePath = path2.resolve(filePath);
        if (this.store[filePath]) {
          return this.store[filePath];
        }
        file2 = this.createFile({ filePath, writeOptions, writeAsync });
      } catch (e) {
        file2 = new NullFile({ path: filePath });
        this.emitError(e, file2);
      }
      file2.on("error", this.emitError);
      this.store[filePath] = file2;
      return file2;
    }
    /**
     * @param {string} filePath
     * @param {WriteOptions} writeOptions
     * @param {boolean} async
     * @return {File}
     * @private
     */
    createFile({ filePath, writeOptions, writeAsync }) {
      this.testFileWriting({ filePath, writeOptions });
      return new File({ path: filePath, writeOptions, writeAsync });
    }
    /**
     * @param {Error} error
     * @param {File} file
     * @private
     */
    emitError(error, file2) {
      this.emit("error", error, file2);
    }
    /**
     * @param {string} filePath
     * @param {WriteOptions} writeOptions
     * @private
     */
    testFileWriting({ filePath, writeOptions }) {
      fs2.mkdirSync(path2.dirname(filePath), { recursive: true });
      fs2.writeFileSync(filePath, "", { flag: "a", mode: writeOptions.mode });
    }
  }
  FileRegistry_1 = FileRegistry;
  return FileRegistry_1;
}
var file;
var hasRequiredFile;
function requireFile() {
  if (hasRequiredFile) return file;
  hasRequiredFile = 1;
  const fs2 = fs__default$1;
  const os = require$$1$1;
  const path2 = require$$1;
  const FileRegistry = requireFileRegistry();
  const { transform } = requireTransform();
  const { removeStyles } = requireStyle();
  const {
    format: format2,
    concatFirstStringElements
  } = requireFormat();
  const { toString } = requireObject();
  file = fileTransportFactory;
  const globalRegistry = new FileRegistry();
  function fileTransportFactory(logger2, { registry = globalRegistry, externalApi } = {}) {
    let pathVariables;
    if (registry.listenerCount("error") < 1) {
      registry.on("error", (e, file2) => {
        logConsole(`Can't write to ${file2}`, e);
      });
    }
    return Object.assign(transport, {
      fileName: getDefaultFileName(logger2.variables.processType),
      format: "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}",
      getFile,
      inspectOptions: { depth: 5 },
      level: "silly",
      maxSize: 1024 ** 2,
      readAllLogs,
      sync: true,
      transforms: [removeStyles, format2, concatFirstStringElements, toString],
      writeOptions: { flag: "a", mode: 438, encoding: "utf8" },
      archiveLogFn(file2) {
        const oldPath = file2.toString();
        const inf = path2.parse(oldPath);
        try {
          fs2.renameSync(oldPath, path2.join(inf.dir, `${inf.name}.old${inf.ext}`));
        } catch (e) {
          logConsole("Could not rotate log", e);
          const quarterOfMaxSize = Math.round(transport.maxSize / 4);
          file2.crop(Math.min(quarterOfMaxSize, 256 * 1024));
        }
      },
      resolvePathFn(vars) {
        return path2.join(vars.libraryDefaultDir, vars.fileName);
      },
      setAppName(name) {
        logger2.dependencies.externalApi.setAppName(name);
      }
    });
    function transport(message) {
      const file2 = getFile(message);
      const needLogRotation = transport.maxSize > 0 && file2.size > transport.maxSize;
      if (needLogRotation) {
        transport.archiveLogFn(file2);
        file2.reset();
      }
      const content = transform({ logger: logger2, message, transport });
      file2.writeLine(content);
    }
    function initializeOnFirstAccess() {
      if (pathVariables) {
        return;
      }
      pathVariables = Object.create(
        Object.prototype,
        {
          ...Object.getOwnPropertyDescriptors(
            externalApi.getPathVariables()
          ),
          fileName: {
            get() {
              return transport.fileName;
            },
            enumerable: true
          }
        }
      );
      if (typeof transport.archiveLog === "function") {
        transport.archiveLogFn = transport.archiveLog;
        logConsole("archiveLog is deprecated. Use archiveLogFn instead");
      }
      if (typeof transport.resolvePath === "function") {
        transport.resolvePathFn = transport.resolvePath;
        logConsole("resolvePath is deprecated. Use resolvePathFn instead");
      }
    }
    function logConsole(message, error = null, level = "error") {
      const data = [`electron-log.transports.file: ${message}`];
      if (error) {
        data.push(error);
      }
      logger2.transports.console({ data, date: /* @__PURE__ */ new Date(), level });
    }
    function getFile(msg) {
      initializeOnFirstAccess();
      const filePath = transport.resolvePathFn(pathVariables, msg);
      return registry.provide({
        filePath,
        writeAsync: !transport.sync,
        writeOptions: transport.writeOptions
      });
    }
    function readAllLogs({ fileFilter = (f) => f.endsWith(".log") } = {}) {
      initializeOnFirstAccess();
      const logsPath = path2.dirname(transport.resolvePathFn(pathVariables));
      if (!fs2.existsSync(logsPath)) {
        return [];
      }
      return fs2.readdirSync(logsPath).map((fileName) => path2.join(logsPath, fileName)).filter(fileFilter).map((logPath) => {
        try {
          return {
            path: logPath,
            lines: fs2.readFileSync(logPath, "utf8").split(os.EOL)
          };
        } catch {
          return null;
        }
      }).filter(Boolean);
    }
  }
  function getDefaultFileName(processType = process.type) {
    switch (processType) {
      case "renderer":
        return "renderer.log";
      case "worker":
        return "worker.log";
      default:
        return "main.log";
    }
  }
  return file;
}
var ipc;
var hasRequiredIpc;
function requireIpc() {
  if (hasRequiredIpc) return ipc;
  hasRequiredIpc = 1;
  const { maxDepth, toJSON } = requireObject();
  const { transform } = requireTransform();
  ipc = ipcTransportFactory;
  function ipcTransportFactory(logger2, { externalApi }) {
    Object.assign(transport, {
      depth: 3,
      eventId: "__ELECTRON_LOG_IPC__",
      level: logger2.isDev ? "silly" : false,
      transforms: [toJSON, maxDepth]
    });
    return externalApi?.isElectron() ? transport : void 0;
    function transport(message) {
      if (message?.variables?.processType === "renderer") {
        return;
      }
      externalApi?.sendIpc(transport.eventId, {
        ...message,
        data: transform({ logger: logger2, message, transport })
      });
    }
  }
  return ipc;
}
var remote;
var hasRequiredRemote;
function requireRemote() {
  if (hasRequiredRemote) return remote;
  hasRequiredRemote = 1;
  const http$1 = http;
  const https$1 = https;
  const { transform } = requireTransform();
  const { removeStyles } = requireStyle();
  const { toJSON, maxDepth } = requireObject();
  remote = remoteTransportFactory;
  function remoteTransportFactory(logger2) {
    return Object.assign(transport, {
      client: { name: "electron-application" },
      depth: 6,
      level: false,
      requestOptions: {},
      transforms: [removeStyles, toJSON, maxDepth],
      makeBodyFn({ message }) {
        return JSON.stringify({
          client: transport.client,
          data: message.data,
          date: message.date.getTime(),
          level: message.level,
          scope: message.scope,
          variables: message.variables
        });
      },
      processErrorFn({ error }) {
        logger2.processMessage(
          {
            data: [`electron-log: can't POST ${transport.url}`, error],
            level: "warn"
          },
          { transports: ["console", "file"] }
        );
      },
      sendRequestFn({ serverUrl, requestOptions, body }) {
        const httpTransport = serverUrl.startsWith("https:") ? https$1 : http$1;
        const request = httpTransport.request(serverUrl, {
          method: "POST",
          ...requestOptions,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": body.length,
            ...requestOptions.headers
          }
        });
        request.write(body);
        request.end();
        return request;
      }
    });
    function transport(message) {
      if (!transport.url) {
        return;
      }
      const body = transport.makeBodyFn({
        logger: logger2,
        message: { ...message, data: transform({ logger: logger2, message, transport }) },
        transport
      });
      const request = transport.sendRequestFn({
        serverUrl: transport.url,
        requestOptions: transport.requestOptions,
        body: Buffer.from(body, "utf8")
      });
      request.on("error", (error) => transport.processErrorFn({
        error,
        logger: logger2,
        message,
        request,
        transport
      }));
    }
  }
  return remote;
}
var createDefaultLogger_1;
var hasRequiredCreateDefaultLogger;
function requireCreateDefaultLogger() {
  if (hasRequiredCreateDefaultLogger) return createDefaultLogger_1;
  hasRequiredCreateDefaultLogger = 1;
  const Logger = requireLogger();
  const ErrorHandler = requireErrorHandler();
  const EventLogger = requireEventLogger();
  const transportConsole = requireConsole();
  const transportFile = requireFile();
  const transportIpc = requireIpc();
  const transportRemote = requireRemote();
  createDefaultLogger_1 = createDefaultLogger;
  function createDefaultLogger({ dependencies, initializeFn }) {
    const defaultLogger = new Logger({
      dependencies,
      errorHandler: new ErrorHandler(),
      eventLogger: new EventLogger(),
      initializeFn,
      isDev: dependencies.externalApi?.isDev(),
      logId: "default",
      transportFactories: {
        console: transportConsole,
        file: transportFile,
        ipc: transportIpc,
        remote: transportRemote
      },
      variables: {
        processType: "main"
      }
    });
    defaultLogger.default = defaultLogger;
    defaultLogger.Logger = Logger;
    defaultLogger.processInternalErrorFn = (e) => {
      defaultLogger.transports.console.writeFn({
        message: {
          data: ["Unhandled electron-log error", e],
          level: "error"
        }
      });
    };
    return defaultLogger;
  }
  return createDefaultLogger_1;
}
var main;
var hasRequiredMain;
function requireMain() {
  if (hasRequiredMain) return main;
  hasRequiredMain = 1;
  const electron = require$$0$3;
  const ElectronExternalApi = requireElectronExternalApi();
  const { initialize: initialize2 } = requireInitialize();
  const createDefaultLogger = requireCreateDefaultLogger();
  const externalApi = new ElectronExternalApi({ electron });
  const defaultLogger = createDefaultLogger({
    dependencies: { externalApi },
    initializeFn: initialize2
  });
  main = defaultLogger;
  externalApi.onIpc("__ELECTRON_LOG__", (_, message) => {
    if (message.scope) {
      defaultLogger.Logger.getInstance(message).scope(message.scope);
    }
    const date = new Date(message.date);
    processMessage({
      ...message,
      date: date.getTime() ? date : /* @__PURE__ */ new Date()
    });
  });
  externalApi.onIpcInvoke("__ELECTRON_LOG__", (_, { cmd = "", logId }) => {
    switch (cmd) {
      case "getOptions": {
        const logger2 = defaultLogger.Logger.getInstance({ logId });
        return {
          levels: logger2.levels,
          logId
        };
      }
      default: {
        processMessage({ data: [`Unknown cmd '${cmd}'`], level: "error" });
        return {};
      }
    }
  });
  function processMessage(message) {
    defaultLogger.Logger.getInstance(message)?.processMessage(message);
  }
  return main;
}
var node;
var hasRequiredNode;
function requireNode() {
  if (hasRequiredNode) return node;
  hasRequiredNode = 1;
  const NodeExternalApi = requireNodeExternalApi();
  const createDefaultLogger = requireCreateDefaultLogger();
  const externalApi = new NodeExternalApi();
  const defaultLogger = createDefaultLogger({
    dependencies: { externalApi }
  });
  node = defaultLogger;
  return node;
}
var hasRequiredSrc;
function requireSrc() {
  if (hasRequiredSrc) return src.exports;
  hasRequiredSrc = 1;
  const isRenderer = typeof process === "undefined" || (process.type === "renderer" || process.type === "worker");
  const isMain = typeof process === "object" && process.type === "browser";
  if (isRenderer) {
    requireElectronLogPreload();
    src.exports = requireRenderer();
  } else if (isMain) {
    src.exports = requireMain();
  } else {
    src.exports = requireNode();
  }
  return src.exports;
}
var srcExports = requireSrc();
const log$1 = /* @__PURE__ */ getDefaultExportFromCjs(srcExports);
const isDev = !app.isPackaged;
const isMac = process.platform === "darwin";
process.platform === "win32";
const isHeadless = process.env.HILO_HEADLESS === "1" || process.env.HILO_HEADLESS === "true";
const isEvalGui = isHeadless && isEvalGuiMode();
const appVersion = app.getVersion();
function readDesktopPackageJson() {
  try {
    const packagePath = path__default.join(app.getAppPath(), "package.json");
    const raw = fs__default.readFileSync(packagePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
function deriveChannelFromVersion(version) {
  if (isReleaseChannel(process.env.HILO_RELEASE_CHANNEL)) {
    return process.env.HILO_RELEASE_CHANNEL;
  }
  if (version.includes("-test.")) return "test";
  if (version.includes("-staging.")) return "staging";
  return isDev ? "dev" : "prod";
}
function deriveRegionFromEnv() {
  if (isReleaseRegion(process.env.HILO_RELEASE_REGION)) {
    return process.env.HILO_RELEASE_REGION;
  }
  return "domestic";
}
function normalizeReleaseMetadata(input, fallbackChannel, fallbackRegion) {
  const channel = isReleaseChannel(input?.channel) ? input.channel : fallbackChannel;
  const region = isReleaseRegion(input?.region) ? input.region : fallbackRegion;
  const fallback = createReleaseMetadata(channel, region);
  return {
    appId: input?.appId ?? fallback.appId,
    productName: input?.productName ?? fallback.productName,
    deepLinkScheme: input?.deepLinkScheme ?? fallback.deepLinkScheme,
    region,
    channel,
    downloadSource: input?.downloadSource ?? fallback.downloadSource,
    updateBaseUrl: input?.updateBaseUrl ?? fallback.updateBaseUrl,
    hotUpdateBaseUrl: input?.hotUpdateBaseUrl ?? fallback.hotUpdateBaseUrl,
    locale: input?.locale ?? fallback.locale,
    domain: input?.domain ?? fallback.domain
  };
}
const desktopPackageJson = readDesktopPackageJson();
const embeddedReleaseMetadata = isDev ? void 0 : desktopPackageJson.hiloRelease;
const releaseMetadata = normalizeReleaseMetadata(
  embeddedReleaseMetadata,
  deriveChannelFromVersion(appVersion),
  deriveRegionFromEnv()
);
const RELEASE = releaseMetadata;
const releaseChannel = releaseMetadata.channel;
const releaseRegion = releaseMetadata.region;
process.env.HILO_RELEASE_CHANNEL = releaseChannel;
process.env.HILO_RELEASE_REGION = releaseRegion;
const isTest = releaseChannel === "test";
const isProd = releaseChannel === "prod";
const isOverseas = releaseRegion === "overseas";
const isLaneOverrideAllowed = releaseChannel === "test" || releaseChannel === "dev";
const APP_NAME = releaseMetadata.productName;
const APP_ID = releaseMetadata.appId;
const DEEP_LINK_SCHEME = releaseMetadata.deepLinkScheme;
const UPDATE_BASE_URL = releaseMetadata.updateBaseUrl;
const DIAGNOSTICS_UPDATE_BASE_URL = getDiagnosticsUpdateBaseUrl(
  releaseRegion,
  releaseChannel,
  isDev
);
const HOT_UPDATE_BASE_URL = releaseMetadata.hotUpdateBaseUrl;
const RUNTIME_ENV = channelToRuntimeEnv(releaseChannel);
const APP_VERSION = appVersion;
const API_BASE_URL = getApiDomain(releaseRegion, releaseChannel);
const CDN_DOMAINS = [
  "https://filecdn.minimax.chat",
  "https://file.cdn.minimax.io",
  "https://cdn.hailuoai.com",
  "https://cdn.hailuoai.video",
  "https://minimax-public-cdn.oss-cn-wulanchabu.aliyuncs.com",
  "https://fonts.gstatic.com"
];
const API_WILDCARD_DOMAIN = "https://*.xaminim.com";
function enableDevRemoteDebugging() {
  if (isDev) {
    app.commandLine.appendSwitch("remote-debugging-port", "9223");
  }
}
function isBrokenPipeError(error) {
  if (error instanceof Error) {
    const code = error.code;
    if (code === "EIO" || code === "EPIPE" || code === "ERR_STREAM_DESTROYED") return true;
    if (error.message.includes("write EIO") || error.message.includes("write EPIPE")) return true;
  }
  return false;
}
let _userId = "";
function setLogUserId(userId) {
  _userId = userId;
}
function getLogUserId() {
  return _userId;
}
function installStreamGuards() {
  for (const stream of [process.stdout, process.stderr]) {
    stream.on("error", (err) => {
      if (isBrokenPipeError(err)) return;
      throw err;
    });
  }
}
installStreamGuards();
if (typeof log$1.initialize === "function") {
  log$1.initialize();
}
log$1.transports.console.level = isDev ? "debug" : "info";
log$1.transports.console.format = isDev ? "[{h}:{i}:{s}.{ms}] [{level}] {text}" : "[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}";
log$1.transports.file.level = false;
log$1.transports.file.maxSize = 10 * 1024 * 1024;
log$1.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";
function getDateString() {
  const now = /* @__PURE__ */ new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
log$1.transports.file.fileName = `main-${getDateString()}.log`;
log$1.errorHandler.startCatching();
function getLogDir() {
  const logFile = log$1.transports.file.getFile();
  return path__default.dirname(logFile.path);
}
function getLogFileName(category, prefix) {
  const dateStr = getDateString();
  return prefix ? `${category}-${prefix}-${dateStr}.log` : `${category}-${dateStr}.log`;
}
const MAX_LOG_FILE_BYTES = 10 * 1024 * 1024;
const MAX_BUFFERED_LINES_PER_FILE = 5e3;
const LOG_FLUSH_SLOW_MS = 250;
const writeBuffers = /* @__PURE__ */ new Map();
const droppedLineCounts = /* @__PURE__ */ new Map();
const fileSizeCache = /* @__PURE__ */ new Map();
const activeFilePaths = /* @__PURE__ */ new Set();
let flushScheduled = false;
let flushInProgress = false;
let flushCycle = 0;
async function rotateIfNeeded(filePath) {
  try {
    let size = fileSizeCache.get(filePath);
    if (size === void 0) {
      try {
        size = (await fsp.stat(filePath)).size;
      } catch {
        size = 0;
      }
      fileSizeCache.set(filePath, size);
    }
    if (size >= MAX_LOG_FILE_BYTES) {
      const backup = `${filePath}.1`;
      try {
        await fsp.rename(filePath, backup);
      } catch {
        try {
          await fsp.truncate(filePath, 0);
        } catch {
        }
      }
      fileSizeCache.set(filePath, 0);
    }
  } catch {
  }
}
function scheduleFlush() {
  if (flushScheduled || flushInProgress) return;
  flushScheduled = true;
  setImmediate(() => {
    flushScheduled = false;
    void flushBuffers();
  });
}
async function flushBuffers() {
  if (flushInProgress) return;
  flushInProgress = true;
  const startedAt = performance.now();
  let flushedFiles = 0;
  let flushedLines = 0;
  let flushedBytes = 0;
  try {
    flushCycle++;
    const entries = Array.from(writeBuffers.entries());
    writeBuffers.clear();
    const currentActive = /* @__PURE__ */ new Set();
    for (const [filePath, lines] of entries) {
      try {
        const dir = path__default.dirname(filePath);
        await fsp.mkdir(dir, { recursive: true });
        await rotateIfNeeded(filePath);
        const droppedLines = droppedLineCounts.get(filePath) ?? 0;
        if (droppedLines > 0) {
          droppedLineCounts.delete(filePath);
          lines.push(
            `[${(/* @__PURE__ */ new Date()).toISOString()}] [warn] [log-backpressure] dropped ${droppedLines} line(s) before flush
`
          );
        }
        const content = lines.join("");
        const contentBytes = Buffer.byteLength(content);
        await fsp.appendFile(filePath, content);
        flushedFiles++;
        flushedLines += lines.length;
        flushedBytes += contentBytes;
        const prev = fileSizeCache.get(filePath) ?? 0;
        fileSizeCache.set(filePath, prev + contentBytes);
        currentActive.add(filePath);
      } catch {
      }
    }
    if (flushCycle % 100 === 0) {
      for (const cached of fileSizeCache.keys()) {
        if (!currentActive.has(cached) && !activeFilePaths.has(cached)) {
          fileSizeCache.delete(cached);
        }
      }
    }
    activeFilePaths.clear();
    for (const p of currentActive) activeFilePaths.add(p);
  } finally {
    const durationMs = performance.now() - startedAt;
    if (durationMs >= LOG_FLUSH_SLOW_MS) {
      writeToFile(
        "perf",
        formatLogLine(
          "warn",
          `[perf] hilo:log:flush-main ${roundLogFlushMs(durationMs)}ms files=${flushedFiles} lines=${flushedLines} bytes=${flushedBytes}`
        )
      );
    }
    flushInProgress = false;
    if (writeBuffers.size > 0) scheduleFlush();
  }
}
function roundLogFlushMs(value) {
  return Math.round(value * 10) / 10;
}
function writeToFile(category, content, prefix) {
  try {
    const logDir = getLogDir();
    const filePath = path__default.join(logDir, getLogFileName(category, prefix));
    const line = `${content}
`;
    const buffer = writeBuffers.get(filePath);
    if (buffer) {
      if (buffer.length >= MAX_BUFFERED_LINES_PER_FILE) {
        droppedLineCounts.set(filePath, (droppedLineCounts.get(filePath) ?? 0) + 1);
        scheduleFlush();
        return;
      }
      buffer.push(line);
    } else {
      writeBuffers.set(filePath, [line]);
    }
    scheduleFlush();
  } catch {
  }
}
function formatLogData(data) {
  if (typeof data === "string") return data;
  if (typeof data === "object" && data !== null) {
    try {
      const obj = data;
      if ("msg" in obj) {
        const { msg, ...rest } = obj;
        const restStr = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
        return `${msg}${restStr}`;
      }
      return JSON.stringify(data);
    } catch {
      return String(data);
    }
  }
  return String(data);
}
function formatLogLine(level, data) {
  const now = /* @__PURE__ */ new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}.${String(now.getMilliseconds()).padStart(3, "0")}`;
  const userTag = _userId ? ` [uid:${_userId}]` : "";
  return `[${ts}] [${level}]${userTag} ${formatLogData(data)}`;
}
function createCategoryLogger(category, prefix) {
  return {
    debug: (data) => {
      log$1.debug(formatLogData(data));
      writeToFile(category, formatLogLine("debug", data), prefix);
    },
    info: (data) => {
      log$1.info(formatLogData(data));
      writeToFile(category, formatLogLine("info", data), prefix);
    },
    warn: (data) => {
      log$1.warn(formatLogData(data));
      writeToFile(category, formatLogLine("warn", data), prefix);
    },
    error: (data) => {
      log$1.error(formatLogData(data));
      writeToFile(category, formatLogLine("error", data), prefix);
    }
  };
}
const logger = createCategoryLogger("main");
function getCategoryLogger(category, prefix) {
  return createCategoryLogger(category, prefix);
}
function getLogFilePath() {
  if (isDev) return "Dev mode: no log file";
  return log$1.transports.file.getFile().path;
}
const LOG_FILE_PREFIXES = [
  "main-",
  "update-",
  "api-",
  "http-client-",
  "heartbeat-",
  "chat-",
  "deeplink-",
  "menu-",
  "settings-",
  "tray-",
  "screenshot-",
  "storage-",
  "remote-tool-",
  "remote-debug-",
  "action-trail-",
  "server-popup-",
  "credit-",
  "perf-",
  "im-bridge-",
  "project-",
  // Promised exportable by persistent-log.ts (workspaceLog) — was missing
  // here, which silently excluded workspace-*.log from export/cleanup.
  "workspace-"
];
function isLogFile(fileName) {
  return fileName.endsWith(".log") && LOG_FILE_PREFIXES.some((p) => fileName.startsWith(p));
}
function cleanupOldLogs() {
  if (isDev) return;
  try {
    const logDir = getLogDir();
    if (!fs__default.existsSync(logDir)) return;
    const maxAge = 7 * 24 * 60 * 60 * 1e3;
    const now = Date.now();
    for (const file2 of fs__default.readdirSync(logDir)) {
      if (isLogFile(file2)) {
        const filePath = path__default.join(logDir, file2);
        if (now - fs__default.statSync(filePath).mtimeMs > maxAge) {
          fs__default.unlinkSync(filePath);
        }
      }
    }
  } catch {
  }
}
const log = getCategoryLogger("update");
const MAX_TELEMETRY_BYTES = 64 * 1024;
const MAX_TELEMETRY_ENTRIES = 50;
const MAX_FIELD_LENGTH = 256;
const INSTALL_PREPARED_STAGE = "install-prepared";
let lastConsumed = null;
function installerShellTelemetryPath(appId, env = process.env) {
  const localAppData = env.LOCALAPPDATA;
  if (!localAppData) return null;
  return path__default.join(localAppData, "MiniMax", "install-telemetry", `${appId}.jsonl`);
}
function boundedField(value) {
  return typeof value === "string" ? value.slice(0, MAX_FIELD_LENGTH) : "";
}
function parseEntry(line) {
  try {
    const parsed = JSON.parse(line);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed;
    if (record.schema !== 1) return null;
    const stage = boundedField(record.stage);
    if (!stage) return null;
    return {
      schema: 1,
      pack: boundedField(record.pack),
      ts: boundedField(record.ts),
      stage,
      detail: boundedField(record.detail)
    };
  } catch {
    return null;
  }
}
function readInstallerShellTelemetry(filePath) {
  let raw;
  let truncated = false;
  try {
    const stat = fs__default.statSync(filePath);
    if (!stat.isFile()) return { entries: [], truncated: false };
    if (stat.size <= MAX_TELEMETRY_BYTES) {
      raw = fs__default.readFileSync(filePath, "utf8");
    } else {
      truncated = true;
      const fd = fs__default.openSync(filePath, "r");
      try {
        const start = stat.size - MAX_TELEMETRY_BYTES;
        const buffer = Buffer.alloc(MAX_TELEMETRY_BYTES);
        let offset = 0;
        while (offset < buffer.length) {
          const bytesRead = fs__default.readSync(fd, buffer, offset, buffer.length - offset, start + offset);
          if (bytesRead <= 0) break;
          offset += bytesRead;
        }
        raw = buffer.subarray(0, offset).toString("utf8");
      } finally {
        fs__default.closeSync(fd);
      }
    }
  } catch {
    return { entries: [], truncated: false };
  }
  const lines = raw.split(/\r?\n/u).filter((line) => line.trim().length > 0);
  const entries = [];
  for (const line of lines) {
    const entry = parseEntry(line);
    if (entry) entries.push(entry);
  }
  if (entries.length > MAX_TELEMETRY_ENTRIES) {
    truncated = true;
    entries.splice(0, entries.length - MAX_TELEMETRY_ENTRIES);
  }
  return { entries, truncated };
}
const MAX_ENTRIES_JSON_CHARS = 8192;
function boundedEntriesJson(entries) {
  let window2 = [...entries];
  let serialized = JSON.stringify(window2);
  while (window2.length > 1 && serialized.length > MAX_ENTRIES_JSON_CHARS) {
    window2 = window2.slice(1);
    serialized = JSON.stringify(window2);
  }
  return serialized;
}
function buildTelemetryProps(snapshot, reportIdSource) {
  const newest = snapshot.entries[snapshot.entries.length - 1];
  const entriesJson = boundedEntriesJson(snapshot.entries);
  return {
    backend: "nsis-bootstrap",
    entry_count: snapshot.entries.length,
    last_stage: newest.stage,
    last_detail: newest.detail,
    last_pack: newest.pack,
    entries_json: entriesJson,
    // N21 (!4442): stable identity for this exact breadcrumb set. Delivery is
    // now at-least-once (the file survives until a confirmed send), and a
    // pending install-prepared file is re-reported on every startup — without
    // a dedup key both would skew installer success-rate statistics.
    //
    // RM3 (review): finalize appends a synthetic committed entry whose ts is
    // "now" — hashing that would give every finalize retry a fresh id and
    // defeat dedup for exactly the at-least-once population. Callers that add
    // synthetic entries therefore pass the ON-DISK entries as the id source.
    report_id: createHash("sha256").update(reportIdSource ?? entriesJson).digest("hex").slice(0, 16)
  };
}
function quarantineNonFileOccupant(filePath) {
  try {
    const status = fs__default.lstatSync(filePath);
    if (status.isFile()) return false;
    const quarantinePath = `${filePath}.invalid-occupant-${Date.now()}`;
    fs__default.renameSync(filePath, quarantinePath);
    log.warn(
      `Installer shell telemetry path was occupied by a non-file; moved it aside to ${quarantinePath}`
    );
    return true;
  } catch (error) {
    if (error.code !== "ENOENT") {
      log.warn(`Installer shell telemetry occupant check failed: ${error}`);
    }
    return false;
  }
}
function removeAfterConfirmedDelivery(trackResult, filePath, remove) {
  const removeQuietly = () => {
    try {
      remove(filePath);
    } catch (error) {
      log.warn(`Installer shell telemetry file could not be removed: ${error}`);
    }
  };
  if (typeof trackResult === "object" && trackResult !== null && typeof trackResult.then === "function") {
    void Promise.resolve(trackResult).then(
      (delivered) => {
        if (delivered !== true) {
          log.warn(
            "Installer shell telemetry not confirmed delivered; keeping breadcrumbs for the next startup"
          );
          return;
        }
        removeQuietly();
      },
      () => {
        log.warn(
          "Installer shell telemetry send rejected; keeping breadcrumbs for the next startup"
        );
      }
    );
    return;
  }
  removeQuietly();
}
function consumeInstallerShellTelemetry(options) {
  try {
    if ((options.platform ?? process.platform) !== "win32" || !options.isPackaged) return false;
    const filePath = installerShellTelemetryPath(options.appId, options.env ?? process.env);
    if (!filePath) return false;
    if (quarantineNonFileOccupant(filePath)) return false;
    if (options.isOnline && !options.isOnline()) return false;
    const snapshot = readInstallerShellTelemetry(filePath);
    const remove = options.remove ?? ((target) => fs__default.rmSync(target, { force: true }));
    if (snapshot.entries.length === 0) {
      try {
        if (fs__default.existsSync(filePath)) {
          log.warn("Installer shell telemetry file contained no parseable entries; clearing it");
          remove(filePath);
        }
      } catch {
      }
      return false;
    }
    lastConsumed = snapshot;
    const newest = snapshot.entries[snapshot.entries.length - 1];
    const properties = buildTelemetryProps(snapshot);
    const trackResult = (options.track ?? ((eventName, props) => trackEventDelivered(eventName, props)))(INSTALLER_SHELL_RESULT_EVENT, properties);
    if (newest.stage !== INSTALL_PREPARED_STAGE) {
      removeAfterConfirmedDelivery(trackResult, filePath, remove);
    }
    return true;
  } catch (error) {
    log.warn(`Installer shell telemetry consumption failed: ${error}`);
    return false;
  }
}
function hasPendingInstallerShellCommit(options) {
  try {
    if ((options.platform ?? process.platform) !== "win32" || !options.isPackaged) return false;
    const filePath = installerShellTelemetryPath(options.appId, options.env ?? process.env);
    if (!filePath || !fs__default.existsSync(filePath)) return false;
    const snapshot = readInstallerShellTelemetry(filePath);
    return snapshot.entries[snapshot.entries.length - 1]?.stage === INSTALL_PREPARED_STAGE;
  } catch {
    return false;
  }
}
function finalizeInstallerShellCommit(options) {
  try {
    if ((options.platform ?? process.platform) !== "win32" || !options.isPackaged) return "none";
    const filePath = installerShellTelemetryPath(options.appId, options.env ?? process.env);
    if (!filePath || !fs__default.existsSync(filePath)) return "none";
    const snapshot = readInstallerShellTelemetry(filePath);
    const newest = snapshot.entries[snapshot.entries.length - 1];
    if (!newest || newest.stage !== INSTALL_PREPARED_STAGE) return "none";
    if (!options.commitReady) return "pending";
    const committedEntry = {
      schema: 1,
      pack: newest.pack,
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      stage: "install-success",
      detail: "renderer=healthy"
    };
    const committedSnapshot = {
      entries: [...snapshot.entries, committedEntry],
      truncated: snapshot.truncated
    };
    lastConsumed = committedSnapshot;
    const trackResult = (options.track ?? ((eventName, props) => trackEventDelivered(eventName, props)))(
      INSTALLER_SHELL_RESULT_EVENT,
      // RM3: hash only the on-disk entries so a finalize retry (unconfirmed
      // delivery keeps the file) re-reports under the SAME report_id.
      buildTelemetryProps(committedSnapshot, boundedEntriesJson(snapshot.entries))
    );
    removeAfterConfirmedDelivery(
      trackResult,
      filePath,
      options.remove ?? ((t) => fs__default.rmSync(t, { force: true }))
    );
    return "committed";
  } catch (error) {
    log.warn(`Installer shell commit finalization failed: ${error}`);
    return "pending";
  }
}
function getInstallerShellTelemetryDiagnostics(options) {
  try {
    if ((options.platform ?? process.platform) !== "win32") {
      return { skipped: "not-windows" };
    }
    const filePath = installerShellTelemetryPath(options.appId, options.env ?? process.env);
    if (!filePath) return { skipped: "no-local-app-data" };
    const pending = fs__default.existsSync(filePath) ? readInstallerShellTelemetry(filePath) : null;
    return {
      consumed: lastConsumed?.entries ?? null,
      consumedTruncated: lastConsumed?.truncated ?? false,
      pending: pending?.entries ?? null,
      pendingTruncated: pending?.truncated ?? false
    };
  } catch (error) {
    return { error: String(error).slice(0, 256) };
  }
}
function resetInstallerShellTelemetryForTest() {
  if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") return;
  lastConsumed = null;
}
const installerShellTelemetry = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  consumeInstallerShellTelemetry,
  finalizeInstallerShellCommit,
  getInstallerShellTelemetryDiagnostics,
  hasPendingInstallerShellCommit,
  installerShellTelemetryPath,
  readInstallerShellTelemetry,
  resetInstallerShellTelemetryForTest
}, Symbol.toStringTag, { value: "Module" }));
const UNINSTALL_GUARDIAN_ARGUMENT = "--minimax-uninstall-guardian";
const UNINSTALL_RESULT_ARGUMENT = "--minimax-uninstall-result";
const STANDALONE_GUARDIAN_NAME = "UninstallGuardian.exe";
const GUARDIAN_READY_TIMEOUT_MS = 5e3;
const GUARDIAN_KILL_CONFIRM_TIMEOUT_MS = 3e3;
const GUARDIAN_READY_POLL_MS = 50;
const REGISTRY_TIMEOUT_MS = 5e3;
const SIGNATURE_TIMEOUT_MS = 15e3;
const UTF8_BOM = "\uFEFF";
function attemptRegistryOnlyUninstall(options) {
  if ((options.platform ?? process.platform) !== "win32") {
    return { ok: false, performed: false, reason: "registry-only uninstall requires Windows" };
  }
  const env = options.env ?? process.env;
  const execute = options.execute ?? execFileSync;
  const location = (options.queryLocation ?? queryInstallLocation)(options.appId, env);
  if (location.status === "absent") {
    return { ok: true, performed: false, reason: "already unregistered" };
  }
  if (location.status === "unreadable" && location.undecodedValue) {
    return {
      ok: false,
      performed: false,
      reason: "the registered install location exists but cannot be decoded; refusing an unproven removal"
    };
  }
  if (location.status === "present") {
    const matchesThisRoot = normalizeWindowsPath$1(location.path) === normalizeWindowsPath$1(options.installRoot);
    if (!matchesThisRoot) {
      const otherStatus = (options.pathStatus ?? defaultPathStatus)(location.path);
      if (otherStatus === "present") {
        return {
          ok: false,
          performed: false,
          reason: "another existing install owns the registration; refusing to remove its entry"
        };
      }
      if (otherStatus === "unreadable") {
        return {
          ok: false,
          performed: false,
          reason: "the registered install root cannot be inspected; refusing an unproven removal"
        };
      }
    }
  }
  try {
    execute(
      systemExecutable("reg.exe", env),
      [
        "delete",
        `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${options.appId}`,
        "/f",
        "/reg:64"
      ],
      { encoding: "utf8", timeout: REGISTRY_TIMEOUT_MS, windowsHide: true }
    );
    return { ok: true, performed: true, reason: "registration removed" };
  } catch (error) {
    return { ok: false, performed: false, reason: `registry delete failed: ${error}` };
  }
}
function defaultPathStatus(targetPath) {
  try {
    fs__default.lstatSync(targetPath);
    return "present";
  } catch (error) {
    const code = error.code;
    return code === "ENOENT" || code === "ENOTDIR" ? "missing" : "unreadable";
  }
}
function normalizeWindowsPath$1(value) {
  return path__default.win32.normalize(value).replace(/[\\/]+$/u, "").toLowerCase();
}
function isExpectedGuardianExecutable(identity) {
  const current = path__default.win32.join(identity.installRoot, "current");
  const executableDirectory = path__default.win32.dirname(identity.execPath);
  const executableName = path__default.win32.basename(identity.execPath).toLowerCase();
  const allowedNames = [identity.productName, identity.legacyProductName].map(
    (name) => `${name}.exe`.toLowerCase()
  );
  return normalizeWindowsPath$1(executableDirectory) === normalizeWindowsPath$1(current) && allowedNames.includes(executableName);
}
function systemExecutable(name, env) {
  const systemRoot = env.SystemRoot ?? env.WINDIR;
  return systemRoot ? path__default.win32.join(systemRoot, "System32", name) : name;
}
const SIGNATURE_AUTHORITY_REASONS = {
  valid_matched: "",
  all_unsigned: "SIGNATURE_UNSIGNED_NOT_PERMITTED",
  inconsistent: "SIGNATURE_STATE_INCONSISTENT",
  signer_mismatch: "SIGNATURE_SIGNER_MISMATCH",
  invalid: "SIGNATURE_INVALID",
  query_failed: "SIGNATURE_QUERY_FAILED"
};
function resolveSignatureAuthority(state, packId) {
  if (state === "valid_matched") return { ok: true, state };
  if (state === "all_unsigned" && isUnsignedPermittedPackId(packId)) return { ok: true, state };
  return { ok: false, state, reason: SIGNATURE_AUTHORITY_REASONS[state] };
}
function quotePowerShellLiteral(value) {
  return `'${value.replace(/'/gu, "''")}'`;
}
function probeWindowsGuardianSignatureState(identity, env) {
  const updatePath = path__default.win32.join(identity.installRoot, "Update.exe");
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "$appPath = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:HILO_GUARDIAN_EXE_B64))",
    "$updatePath = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:HILO_UPDATE_EXE_B64))",
    "if (-not (Test-Path -LiteralPath $appPath -PathType Leaf) -or -not (Test-Path -LiteralPath $updatePath -PathType Leaf)) { Write-Output 'query_failed'; exit 0 }",
    "$appSignature = Get-AuthenticodeSignature -LiteralPath $appPath",
    "$updateSignature = Get-AuthenticodeSignature -LiteralPath $updatePath",
    "$unsignedCount = @(@($appSignature, $updateSignature) | Where-Object { $_.Status -eq 'NotSigned' }).Count",
    "if ($unsignedCount -eq 2) { Write-Output 'all_unsigned'; exit 0 }",
    "if ($unsignedCount -ne 0) { Write-Output 'inconsistent'; exit 0 }",
    "if ($appSignature.Status -ne 'Valid' -or $updateSignature.Status -ne 'Valid' -or $null -eq $appSignature.SignerCertificate -or $null -eq $updateSignature.SignerCertificate) { Write-Output 'invalid'; exit 0 }",
    "if (-not [string]::Equals($appSignature.SignerCertificate.Thumbprint, $updateSignature.SignerCertificate.Thumbprint, [StringComparison]::OrdinalIgnoreCase)) { Write-Output 'signer_mismatch'; exit 0 }",
    "Write-Output 'valid_matched'"
  ].join("; ");
  try {
    const output = execFileSync(
      systemExecutable("WindowsPowerShell\\v1.0\\powershell.exe", env),
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script],
      {
        encoding: "utf8",
        timeout: SIGNATURE_TIMEOUT_MS,
        windowsHide: true,
        env: {
          ...env,
          HILO_GUARDIAN_EXE_B64: Buffer.from(identity.execPath, "utf8").toString("base64"),
          HILO_UPDATE_EXE_B64: Buffer.from(updatePath, "utf8").toString("base64")
        }
      }
    ).trim();
    return output in SIGNATURE_AUTHORITY_REASONS ? output : "query_failed";
  } catch {
    return "query_failed";
  }
}
function verifyWindowsGuardianSignatures(identity, env) {
  return resolveSignatureAuthority(
    probeWindowsGuardianSignatureState(identity, env),
    identity.appId
  );
}
function buildUninstallWrapperSignatureGuard(allowUnsigned) {
  return [
    `$allowUnsigned = ${allowUnsigned ? "$true" : "$false"}`,
    "if (-not (Test-Path -LiteralPath $appPath -PathType Leaf) -or -not (Test-Path -LiteralPath $updatePath -PathType Leaf)) { exit 2 }",
    "$appSignature = Get-AuthenticodeSignature -LiteralPath $appPath",
    "$updateSignature = Get-AuthenticodeSignature -LiteralPath $updatePath",
    "$unsignedCount = @(@($appSignature, $updateSignature) | Where-Object { $_.Status -eq 'NotSigned' }).Count",
    "if ($unsignedCount -eq 2) { if (-not $allowUnsigned) { exit 2 } } elseif ($unsignedCount -ne 0) { exit 2 } elseif ($appSignature.Status -ne 'Valid' -or $updateSignature.Status -ne 'Valid' -or $null -eq $appSignature.SignerCertificate -or $null -eq $updateSignature.SignerCertificate -or -not [string]::Equals($appSignature.SignerCertificate.Thumbprint, $updateSignature.SignerCertificate.Thumbprint, [StringComparison]::OrdinalIgnoreCase)) { exit 2 }"
  ];
}
function buildUninstallWrapper(appPath, resultPath, allowUnsigned) {
  const updatePath = path__default.win32.join(path__default.win32.dirname(path__default.win32.dirname(appPath)), "Update.exe");
  const guardianPath = standaloneGuardianPath(path__default.win32.dirname(path__default.win32.dirname(appPath)));
  return [
    "$ErrorActionPreference = 'Stop'",
    `$resultPath = ${quotePowerShellLiteral(resultPath)}`,
    `$appPath = ${quotePowerShellLiteral(guardianPath)}`,
    `$updatePath = ${quotePowerShellLiteral(updatePath)}`,
    "$mutex = [Threading.Mutex]::new($false, ('Local\\MiniMaxUninstall-' + [IO.Path]::GetFileName([IO.Path]::GetDirectoryName($resultPath))))",
    "$acquired = $false",
    "try {",
    "try { $acquired = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $acquired = $true }",
    "if (-not $acquired) { exit 1618 }",
    ...buildUninstallWrapperSignatureGuard(allowUnsigned),
    "if (Test-Path -LiteralPath $resultPath) { Remove-Item -LiteralPath $resultPath -Force }",
    `$guardianArgs = @(${quotePowerShellLiteral(UNINSTALL_GUARDIAN_ARGUMENT)}, ${quotePowerShellLiteral(UNINSTALL_RESULT_ARGUMENT)}, ('"' + $resultPath + '"'))`,
    "if ($args -contains '--silent') { $guardianArgs += '--silent' }",
    "$guardian = Start-Process -FilePath $appPath -ArgumentList $guardianArgs -Wait -PassThru",
    "if ($guardian.ExitCode -ne 0) { exit $guardian.ExitCode }",
    "$deadline = [DateTime]::UtcNow.AddMinutes(5)",
    "while (-not (Test-Path -LiteralPath $resultPath) -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 100 }",
    "if (-not (Test-Path -LiteralPath $resultPath)) { if ($guardian.ExitCode -ne 0) { exit $guardian.ExitCode }; exit 2 }",
    "$utf8 = [Text.UTF8Encoding]::new($false, $true)",
    "$result = [IO.File]::ReadAllText($resultPath, $utf8) | ConvertFrom-Json",
    "if ($null -eq $result -or -not ($result.exitCode -is [int] -or $result.exitCode -is [long]) -or $result.exitCode -lt 0 -or $result.exitCode -gt [int]::MaxValue -or $result.PSObject.Properties['degraded']) { exit 2 }",
    "Remove-Item -LiteralPath $resultPath -Force",
    "exit [int]$result.exitCode",
    "} finally { if ($acquired) { $mutex.ReleaseMutex() }; $mutex.Dispose() }"
  ].join("\r\n");
}
function writeWrapperAtomic(filePath, content) {
  fs__default.mkdirSync(path__default.win32.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs__default.writeFileSync(temporaryPath, `${UTF8_BOM}${content}`, {
    encoding: "utf8",
    flag: "wx",
    mode: 384
  });
  try {
    fs__default.renameSync(temporaryPath, filePath);
  } catch (error) {
    fs__default.rmSync(temporaryPath, { force: true });
    throw error;
  }
}
function standaloneGuardianPath(installRoot) {
  return path__default.win32.join(
    installRoot,
    "current",
    "resources",
    "installer",
    STANDALONE_GUARDIAN_NAME
  );
}
function verifyWindowsUninstallExecutionIdentity(identity, env = process.env, verifySignatures = verifyWindowsGuardianSignatures) {
  if (!isExpectedGuardianExecutable(identity)) {
    return {
      ok: false,
      message: "Uninstall executable is outside the expected current directory."
    };
  }
  try {
    for (const execPath of [identity.execPath, standaloneGuardianPath(identity.installRoot)]) {
      const verdict = verifySignatures({ ...identity, execPath }, env);
      if (!verdict.ok)
        return { ok: false, message: `${verdict.reason}: uninstall execution is not ready` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, message: `Uninstall execution identity could not be verified: ${error}` };
  }
}
function registerWindowsUninstallGuardian(options) {
  if ((options.platform ?? process.platform) !== "win32" || !options.isPackaged) {
    return { ok: false, message: "Uninstall Guardian requires packaged Windows." };
  }
  if (!isExpectedGuardianExecutable(options.identity)) {
    return {
      ok: false,
      message: "Guardian registration executable is outside the expected current directory."
    };
  }
  const env = options.env ?? process.env;
  const localAppData = env.LOCALAPPDATA;
  if (!localAppData) {
    return { ok: false, message: "LOCALAPPDATA is unavailable for Guardian registration." };
  }
  const execute = options.execute ?? execFileSync;
  const ownershipDirectory = path__default.win32.join(
    localAppData,
    "MiniMax",
    "install-ownership",
    options.identity.appId
  );
  const wrapperPath = path__default.win32.join(ownershipDirectory, "uninstall-wrapper.ps1");
  const resultPath = path__default.win32.join(ownershipDirectory, "uninstall-result.json");
  const key = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${options.identity.appId}`;
  const powershell = systemExecutable("WindowsPowerShell\\v1.0\\powershell.exe", env);
  const command = `"${powershell}" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${wrapperPath}"`;
  if (!options.ownershipVerified) {
    const location = (options.queryLocation ?? queryInstallLocation)(options.identity.appId, env);
    if (location.status !== "present" || normalizeWindowsPath$1(location.path) !== normalizeWindowsPath$1(options.identity.installRoot)) {
      return {
        ok: false,
        message: "The registration does not belong to this install; it was left unchanged."
      };
    }
  }
  const wrapper = buildUninstallWrapper(
    options.identity.execPath,
    resultPath,
    isUnsignedPermittedPackId(options.identity.appId)
  );
  let alreadyGuarded = false;
  try {
    const previous = options.readRegistration ? options.readRegistration() : queryUninstallCommands(options.identity.appId, env);
    alreadyGuarded = previous?.uninstall === command && previous.quiet === `${command} --silent` && (options.readWrapper ?? ((filePath) => fs__default.readFileSync(filePath, "utf8")))(
      wrapperPath
    ).replace(/^\uFEFF/u, "") === wrapper;
  } catch {
  }
  try {
    (options.writeWrapper ?? writeWrapperAtomic)(wrapperPath, wrapper);
    if (!alreadyGuarded) {
      execute(
        systemExecutable("reg.exe", env),
        ["add", key, "/v", "SystemComponent", "/t", "REG_DWORD", "/d", "1", "/f", "/reg:64"],
        { encoding: "utf8", timeout: REGISTRY_TIMEOUT_MS, windowsHide: true }
      );
      for (const [name, value] of [
        ["UninstallString", command],
        ["QuietUninstallString", `${command} --silent`]
      ]) {
        execute(
          systemExecutable("reg.exe", env),
          ["add", key, "/v", name, "/t", "REG_SZ", "/d", value, "/f", "/reg:64"],
          { encoding: "utf8", timeout: REGISTRY_TIMEOUT_MS, windowsHide: true }
        );
      }
    }
    execute(
      systemExecutable("reg.exe", env),
      ["add", key, "/v", "SystemComponent", "/t", "REG_DWORD", "/d", "0", "/f", "/reg:64"],
      { encoding: "utf8", timeout: REGISTRY_TIMEOUT_MS, windowsHide: true }
    );
    return { ok: true };
  } catch (error) {
    if (!alreadyGuarded) {
      try {
        execute(
          systemExecutable("reg.exe", env),
          ["add", key, "/v", "SystemComponent", "/t", "REG_DWORD", "/d", "1", "/f", "/reg:64"],
          { encoding: "utf8", timeout: REGISTRY_TIMEOUT_MS, windowsHide: true }
        );
      } catch {
      }
    }
    return { ok: false, message: `Unable to register Uninstall Guardian: ${error}` };
  }
}
async function launchWindowsUninstallGuardian(options) {
  if ((options.platform ?? process.platform) !== "win32" || !options.isPackaged) {
    return { ok: false, message: "Uninstall Guardian requires packaged Windows." };
  }
  if (!options.ownershipVerified || !isExpectedGuardianExecutable(options.identity)) {
    return { ok: false, message: "Install-root ownership is not proven for guarded uninstall." };
  }
  const env = options.env ?? process.env;
  if (options.resultPath) {
    const localAppData = env.LOCALAPPDATA;
    const expectedResultPath = localAppData ? path__default.win32.join(
      localAppData,
      "MiniMax",
      "install-ownership",
      options.identity.appId,
      "uninstall-result.json"
    ) : "";
    if (!expectedResultPath || normalizeWindowsPath$1(options.resultPath) !== normalizeWindowsPath$1(expectedResultPath)) {
      return { ok: false, message: "Guarded uninstall result path is not trusted." };
    }
  }
  const exists = options.exists ?? fs__default.existsSync;
  const remove = options.remove ?? ((filePath) => fs__default.rmSync(filePath, { force: true }));
  const wait = options.wait ?? ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
  const verifierPath = path__default.win32.join(
    options.resourcesPath,
    "installer",
    "verify-install-ownership.ps1"
  );
  if (!exists(verifierPath)) {
    return { ok: false, message: "Packaged ownership verifier is missing." };
  }
  const readyPath = options.readyPath ?? path__default.join(os__default.tmpdir(), `minimax-uninstall-guardian-${randomUUID()}.ready`);
  remove(readyPath);
  const args = [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    verifierPath,
    "-Mode",
    "GuardedUninstall",
    "-InstallRoot",
    options.identity.installRoot,
    "-PackId",
    options.identity.appId,
    "-ProductName",
    options.identity.productName,
    "-LegacyProductName",
    options.identity.legacyProductName,
    "-MainExe",
    `${options.identity.productName}.exe`,
    "-LegacyMainExe",
    `${options.identity.legacyProductName}.exe`,
    "-GuardianPid",
    String(options.guardianPid ?? process.pid),
    "-ReadyFile",
    readyPath,
    ...options.silent ? ["-Silent"] : [],
    ...options.resultPath ? ["-ResultFile", options.resultPath] : []
  ];
  try {
    const child = (options.spawnProcess ?? ((command, childArgs, childOptions) => spawn(command, [...childArgs], childOptions)))(systemExecutable("WindowsPowerShell\\v1.0\\powershell.exe", env), args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.unref();
    const deadline = Date.now() + GUARDIAN_READY_TIMEOUT_MS;
    while (!exists(readyPath) && child.exitCode === null && Date.now() < deadline) {
      await wait(GUARDIAN_READY_POLL_MS);
    }
    if (!exists(readyPath)) {
      if (child.exitCode === null) {
        try {
          child.kill?.();
        } catch {
        }
        const killDeadline = Date.now() + GUARDIAN_KILL_CONFIRM_TIMEOUT_MS;
        while (child.exitCode === null && Date.now() < killDeadline) {
          await wait(GUARDIAN_READY_POLL_MS);
        }
      }
      try {
        remove(readyPath);
      } catch {
      }
      if (child.exitCode === null) {
        return {
          ok: false,
          degradable: false,
          message: "Guarded uninstaller is still running and could not be stopped; refusing any parallel action while it may proceed."
        };
      }
      return {
        ok: false,
        degradable: true,
        message: "Guarded uninstaller did not complete the PID/root handshake."
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      degradable: true,
      message: `Unable to launch guarded uninstaller: ${error}`
    };
  }
}
const PROBE_TIMEOUT_MS = 1e4;
const CLEANUP_LOG_MAX_BYTES = 64 * 1024;
const CLEANUP_LOG_FILE = "minimax-design-shortcut-cleanup.log";
const LEGACY_SHORTCUT_FOLDER_KINDS = ["DesktopDirectory", "Programs"];
const PROBE_SCRIPT = [
  "$name = $env:HILO_LEGACY_SHORTCUT_NAME",
  "if ([string]::IsNullOrWhiteSpace($name)) { exit 0 }",
  `$dirs = @(${LEGACY_SHORTCUT_FOLDER_KINDS.map((kind) => `'${kind}'`).join(",")}) |`,
  "  ForEach-Object { [Environment]::GetFolderPath($_) } | Where-Object { $_ }",
  "$shell = New-Object -ComObject WScript.Shell",
  "$out = @()",
  "foreach ($d in $dirs) {",
  "  $p = Join-Path $d ($name + '.lnk')",
  "  if (Test-Path -LiteralPath $p) {",
  "    try { $t = $shell.CreateShortcut($p).TargetPath } catch { $t = '' }",
  "    $out += [pscustomobject]@{ path = $p; target = [string]$t }",
  "  }",
  "}",
  "$json = ConvertTo-Json -InputObject @($out) -Compress",
  "[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json))"
].join("\n");
function resolvePowershellPath() {
  const systemRoot = process.env.SystemRoot ?? process.env.windir;
  if (systemRoot) {
    const absolute = path__default.win32.join(
      systemRoot,
      "System32",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe"
    );
    try {
      if (fs__default.existsSync(absolute)) return absolute;
    } catch {
    }
  }
  return "powershell.exe";
}
function defaultProbeShortcuts(shortcutBaseName) {
  const result = spawnSync(
    resolvePowershellPath(),
    ["-NoProfile", "-NonInteractive", "-Command", PROBE_SCRIPT],
    {
      timeout: PROBE_TIMEOUT_MS,
      windowsHide: true,
      encoding: "utf-8",
      env: { ...process.env, HILO_LEGACY_SHORTCUT_NAME: shortcutBaseName }
    }
  );
  if (result.error || result.status !== 0) return [];
  return parseProbeOutput(result.stdout);
}
function parseProbeOutput(stdout) {
  let raw = (stdout ?? "").trim();
  if (raw === "") return [];
  if (!raw.startsWith("[") && !raw.startsWith("{")) {
    try {
      raw = Buffer.from(raw, "base64").toString("utf-8");
    } catch {
      return [];
    }
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const candidates = [];
  for (const entry of parsed) {
    if (typeof entry === "object" && entry !== null && typeof entry.path === "string" && typeof entry.target === "string") {
      candidates.push({
        path: entry.path,
        target: entry.target
      });
    }
  }
  return candidates;
}
function defaultReadPackagedReleaseChannel() {
  const resourcesPath = process.resourcesPath;
  if (!resourcesPath) return void 0;
  for (const appDir of ["app.asar", "app"]) {
    try {
      const raw = fs__default.readFileSync(path__default.join(resourcesPath, appDir, "package.json"), "utf-8");
      const channel = JSON.parse(raw).hiloRelease?.channel;
      if (typeof channel === "string") return channel;
    } catch {
    }
  }
  return void 0;
}
function defaultLog(line) {
  const logPath = path__default.join(os__default.tmpdir(), CLEANUP_LOG_FILE);
  const message = `[${(/* @__PURE__ */ new Date()).toISOString()}] ${line}
`;
  try {
    try {
      if (fs__default.statSync(logPath).size > CLEANUP_LOG_MAX_BYTES) {
        fs__default.writeFileSync(logPath, message, "utf-8");
        return;
      }
    } catch {
    }
    fs__default.appendFileSync(logPath, message, "utf-8");
  } catch {
  }
}
function resolveCleanupReleaseChannel(hookVersion, packagedChannel) {
  if (isReleaseChannel(packagedChannel)) return packagedChannel;
  if (hookVersion?.includes("-test.")) return "test";
  if (hookVersion?.includes("-staging.")) return "staging";
  return "prod";
}
function normalizeWindowsPath(value) {
  return path__default.win32.normalize(value).replace(/[\\/]+$/, "").toLowerCase();
}
function isInsideDirectory(child, parent) {
  const normalizedChild = normalizeWindowsPath(child);
  const normalizedParent = normalizeWindowsPath(parent);
  if (normalizedParent === "") return false;
  return normalizedChild === normalizedParent || normalizedChild.startsWith(`${normalizedParent}${path__default.win32.sep}`);
}
function cleanupLegacyBrandShortcuts(options = {}) {
  const result = {
    attempted: false,
    shortcutName: null,
    deleted: [],
    kept: []
  };
  try {
    const platform = options.platform ?? process.platform;
    if (platform !== "win32") return result;
    const io = {
      probeShortcuts: options.io?.probeShortcuts ?? defaultProbeShortcuts,
      unlink: options.io?.unlink ?? ((filePath) => fs__default.unlinkSync(filePath)),
      readPackagedReleaseChannel: options.io?.readPackagedReleaseChannel ?? defaultReadPackagedReleaseChannel,
      log: options.io?.log ?? defaultLog
    };
    const execPath = resolveWindowsEffectiveExecPath(
      options.execPath ?? process.execPath,
      process.env
    );
    const currentInstallRoot = path__default.win32.dirname(path__default.win32.dirname(execPath));
    if (options.isInstallRootOwned?.(currentInstallRoot) !== true) {
      io.log("legacy shortcut cleanup skipped: install-root ownership is unverified");
      return result;
    }
    const channel = resolveCleanupReleaseChannel(
      options.hookVersion,
      io.readPackagedReleaseChannel()
    );
    const shortcutName = getDurableAppName(channel);
    result.attempted = true;
    result.shortcutName = shortcutName;
    for (const candidate of io.probeShortcuts(shortcutName)) {
      const target = candidate.target.trim();
      if (target === "") {
        result.kept.push({ path: candidate.path, reason: "target_unresolved" });
        continue;
      }
      if (!isInsideDirectory(target, currentInstallRoot)) {
        result.kept.push({ path: candidate.path, reason: "target_mismatch" });
        continue;
      }
      try {
        io.unlink(candidate.path);
        result.deleted.push(candidate.path);
      } catch {
        result.kept.push({ path: candidate.path, reason: "unlink_failed" });
      }
    }
    io.log(
      `legacy shortcut cleanup: name=${JSON.stringify(shortcutName)} deleted=${JSON.stringify(result.deleted)} kept=${JSON.stringify(result.kept)}`
    );
  } catch {
  }
  return result;
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
const REFRESH_TIMEOUT_MS = 3e3;
function resolveIe4uinitPath() {
  const systemRoot = process.env.SystemRoot ?? process.env.windir;
  if (systemRoot) {
    const absolute = path__default.win32.join(systemRoot, "System32", "ie4uinit.exe");
    try {
      if (fs__default.existsSync(absolute)) return absolute;
    } catch {
    }
  }
  return "ie4uinit.exe";
}
function defaultRunner(command, args) {
  const result = spawnSync(command, [...args], {
    timeout: REFRESH_TIMEOUT_MS,
    windowsHide: true
  });
  return { error: result.error, status: result.status };
}
function refreshWindowsIconCache(options = {}) {
  const platform = options.platform ?? process.platform;
  const log2 = options.log ?? (() => {
  });
  if (platform !== "win32") {
    return { attempted: false, ok: false };
  }
  const runner = options.runner ?? defaultRunner;
  try {
    const result = runner(resolveIe4uinitPath(), ["-show"]);
    const ok = !result.error && result.status === 0;
    log2(
      ok ? "icon cache refresh ok (ie4uinit -show)" : `icon cache refresh failed: status=${result.status} error=${result.error?.message ?? "none"}`
    );
    return { attempted: true, ok };
  } catch (error) {
    log2(`icon cache refresh threw: ${error instanceof Error ? error.message : String(error)}`);
    return { attempted: true, ok: false };
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
function shouldUseVelopackUpdaterTransport(isDev2, env = process.env) {
  return !isDev2 && isVelopackUpdaterRuntime(env);
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
  locatedBuilder.onAfterInstallFastCallback((version) => {
    const cleanup = cleanupLegacyBrandShortcuts({
      hookVersion: version,
      isInstallRootOwned: safety.isInstallRootOwned
    });
    if (cleanup.attempted) refreshWindowsIconCache();
  }).onAfterUpdateFastCallback((version) => {
    const cleanup = cleanupLegacyBrandShortcuts({
      hookVersion: version,
      isInstallRootOwned: safety.isInstallRootOwned
    });
    if (cleanup.attempted) refreshWindowsIconCache();
  }).setAutoApplyOnStartup(false).run();
}
function resolveFastHookInstallRootOwnership(deps) {
  const signatureVerdict = deps.verifySignatures();
  const ownership = signatureVerdict.ok ? deps.ensureOwnership() : { ok: false };
  const guardian = deps.registerGuardian({
    ownershipVerified: ownership.ok,
    ...signatureVerdict.ok ? { signatureVerdict } : {}
  });
  return ownership.ok && guardian.ok;
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
const VELOPACK_TEMP_VENDOR_DIRECTORY = "MiniMax";
const VELOPACK_TEMP_DIRECTORY = "velopack-generations";
const SAFE_APP_ID = /^[A-Za-z0-9._-]+$/u;
function resolveVelopackTempRoot(appId, env = process.env, pathApi = path__default.win32) {
  const localAppData = env.LOCALAPPDATA?.trim();
  if (!localAppData || !SAFE_APP_ID.test(appId)) return null;
  return pathApi.join(localAppData, VELOPACK_TEMP_VENDOR_DIRECTORY, VELOPACK_TEMP_DIRECTORY, appId);
}
function configureVelopackTempRoot(options) {
  if ((options.platform ?? process.platform) !== "win32") return null;
  const logError = options.logError ?? ((message) => console.error(`[velopack-temp-root] ${message}`));
  const env = options.env ?? process.env;
  const tempRoot = resolveVelopackTempRoot(options.appId, env);
  if (!tempRoot) {
    logError(
      `VELOPACK_TEMP not configured: LOCALAPPDATA unavailable or app id unsafe (${options.appId}); native extraction will fall back to the install root.`
    );
    return null;
  }
  try {
    (options.mkdirSync ?? fs__default.mkdirSync)(tempRoot, { recursive: true, mode: 448 });
    env.VELOPACK_TEMP = tempRoot;
    return tempRoot;
  } catch (error) {
    logError(
      `VELOPACK_TEMP not configured: cannot create ${tempRoot} (${error}); native extraction will fall back to the install root.`
    );
    return null;
  }
}
const RESIDUE_MAX_ENTRIES = 64;
function comparableRootPath(value) {
  return value.replace(/[\\/]+$/u, "").toLowerCase();
}
async function observeVelopackTempResidue(options) {
  const unavailable = {
    status: "unavailable",
    observedEntryCount: 0,
    byteCount: null
  };
  if ((options.platform ?? process.platform) !== "win32") return unavailable;
  const pathApi = options.pathApi ?? path__default.win32;
  const tempRoot = resolveVelopackTempRoot(options.appId, options.env ?? process.env, pathApi);
  if (!tempRoot) return unavailable;
  const fsApi = options.fsApi ?? {
    lstat: (targetPath) => fs__default.promises.lstat(targetPath),
    realpath: (targetPath) => fs__default.promises.realpath(targetPath),
    openDirectory: (targetPath) => fs__default.promises.opendir(targetPath)
  };
  const maxEntries = options.maxEntries ?? RESIDUE_MAX_ENTRIES;
  try {
    const rootStatus = await fsApi.lstat(tempRoot);
    if (rootStatus.isSymbolicLink()) {
      options.logWarn?.("Velopack temp root is a reparse point; residue not observed.");
      return { status: "unprovable", observedEntryCount: 0, byteCount: null };
    }
  } catch (error) {
    if (error.code === "ENOENT") return unavailable;
    options.logWarn?.(`Velopack temp root is unreadable; residue not observed: ${error}`);
    return { status: "unprovable", observedEntryCount: 0, byteCount: null };
  }
  try {
    const realRoot = await fsApi.realpath(tempRoot);
    if (comparableRootPath(realRoot) !== comparableRootPath(tempRoot)) {
      options.logWarn?.(
        "Velopack temp root resolves through a path alias or reparse boundary; residue not observed."
      );
      return { status: "unprovable", observedEntryCount: 0, byteCount: null };
    }
  } catch (error) {
    options.logWarn?.(`Velopack temp root could not be canonicalized: ${error}`);
    return { status: "unprovable", observedEntryCount: 0, byteCount: null };
  }
  let observedEntryCount = 0;
  try {
    const directory = await fsApi.openDirectory(tempRoot);
    for await (const entry of directory) {
      if (entry.name.toLowerCase() === "lkg") continue;
      if (observedEntryCount >= maxEntries) {
        return { status: "truncated", observedEntryCount, byteCount: null };
      }
      observedEntryCount += 1;
    }
  } catch (error) {
    options.logWarn?.(`Velopack temp residue enumeration incomplete: ${error}`);
    return { status: "unprovable", observedEntryCount, byteCount: null };
  }
  return { status: "ok", observedEntryCount, byteCount: null };
}
const VELOPACK_STARTUP_LOG = path__default.join(os__default.tmpdir(), "minimax-hub-velopack-startup.log");
const VELOPACK_STARTUP_LOG_MAX_BYTES = 256 * 1024;
const packagedBootSmoke = resolvePackagedBootSmokeConfig();
function readPackagedReleaseIdentity() {
  try {
    const packageJson2 = JSON.parse(
      fs__default.readFileSync(path__default.join(app.getAppPath(), "package.json"), "utf8")
    );
    const release = packageJson2.hiloRelease;
    if (typeof release?.appId !== "string" || typeof release.productName !== "string" || typeof release.channel !== "string" || !isReleaseChannel(release.channel)) {
      return null;
    }
    return {
      appId: release.appId,
      productName: release.productName,
      channel: release.channel
    };
  } catch {
    return null;
  }
}
function isFastHookInstallRootOwned(installRoot) {
  try {
    const release = readPackagedReleaseIdentity();
    if (!release) return false;
    const effectiveExecPath = resolveWindowsEffectiveExecPath(process.execPath, process.env);
    const identity = {
      installRoot,
      execPath: effectiveExecPath,
      appId: release.appId,
      productName: release.productName,
      legacyProductName: getDurableAppName(release.channel)
    };
    const ownershipOptions = {
      platform: process.platform,
      isPackaged: app.isPackaged,
      installDir: installRoot,
      execPath: effectiveExecPath,
      userDataPath: app.getPath("userData"),
      appId: release.appId,
      productName: release.productName,
      durableProductName: getDurableAppName(release.channel),
      allowBootstrap: true,
      allowUninstallReconciliation: true
    };
    const registeredUserDataRoots = readUserDataRootRegistry(ownershipOptions);
    return resolveFastHookInstallRootOwnership({
      verifySignatures: () => verifyWindowsGuardianSignatures(identity, process.env),
      ensureOwnership: () => ensureInstallRootOwnership({
        ...ownershipOptions,
        userDataRoots: registeredUserDataRoots.ok ? registeredUserDataRoots.roots : []
      }),
      registerGuardian: ({ ownershipVerified, signatureVerdict }) => registerWindowsUninstallGuardian({
        platform: process.platform,
        isPackaged: app.isPackaged,
        ownershipVerified,
        identity,
        // Reuse the verdict this hook already paid a PowerShell spawn for
        // instead of re-probing; a bare `() => true` would no longer satisfy
        // the gate contract (F2).
        ...signatureVerdict ? { verifySignatures: () => signatureVerdict } : {}
      })
    });
  } catch {
    return false;
  }
}
async function runRequestedUninstallGuardian() {
  const release = readPackagedReleaseIdentity();
  const silent = process.argv.includes("--silent");
  const resultArgumentIndex = process.argv.indexOf(UNINSTALL_RESULT_ARGUMENT);
  const resultPath = resultArgumentIndex >= 0 ? process.argv[resultArgumentIndex + 1] : void 0;
  if (resultArgumentIndex >= 0 && !resultPath) {
    await showUninstallGuardianFailure("Guarded uninstall result path is missing.", silent);
    return;
  }
  const effectiveExecPath = resolveWindowsEffectiveExecPath(process.execPath, process.env);
  let installRoot = path__default.win32.dirname(path__default.win32.dirname(effectiveExecPath));
  try {
    installRoot = resolveVelopackLocatorOverride()?.RootAppDir ?? installRoot;
  } catch (error) {
    await showUninstallGuardianFailure(`Install path resolution failed: ${error}`, silent);
    return;
  }
  if (!release) {
    await showUninstallGuardianFailure("Packaged release identity is unavailable.", silent);
    return;
  }
  const degradePayload = {
    appId: release.appId,
    installRoot,
    packVersion: app.getVersion(),
    productName: release.productName,
    ...resultPath ? { resultPath } : {}
  };
  let ownership;
  try {
    const ownershipOptions = {
      platform: process.platform,
      isPackaged: app.isPackaged,
      installDir: installRoot,
      execPath: effectiveExecPath,
      userDataPath: app.getPath("userData"),
      appId: release.appId,
      productName: release.productName,
      durableProductName: getDurableAppName(release.channel),
      allowBootstrap: false
    };
    const userDataRootRegistry = readUserDataRootRegistry(ownershipOptions);
    if (!userDataRootRegistry.ok) {
      await showUninstallGuardianFailure(userDataRootRegistry.message, silent, degradePayload);
      return;
    }
    ownership = ensureInstallRootOwnership({
      ...ownershipOptions,
      userDataRoots: userDataRootRegistry.roots,
      allowUninstallReconciliation: true
    });
  } catch (error) {
    await showUninstallGuardianFailure(
      `Install ownership validation failed: ${error}`,
      silent,
      degradePayload
    );
    return;
  }
  if (!ownership.ok) {
    await showUninstallGuardianFailure(ownership.message, silent, {
      ...degradePayload,
      dataOverlap: ownership.code === "OWNERSHIP_USER_DATA_OVERLAP"
    });
    return;
  }
  const launched = await launchWindowsUninstallGuardian({
    platform: process.platform,
    isPackaged: app.isPackaged,
    ownershipVerified: true,
    identity: {
      installRoot,
      execPath: effectiveExecPath,
      appId: release.appId,
      productName: release.productName,
      legacyProductName: getDurableAppName(release.channel)
    },
    resourcesPath: process.resourcesPath,
    guardianPid: process.pid,
    silent,
    resultPath
  });
  if (!launched.ok) {
    if (!launched.degradable) {
      await showUninstallGuardianFailure(
        launched.message ?? "Guarded uninstall could not start.",
        silent
      );
      return;
    }
    await showUninstallGuardianFailure(
      launched.message ?? "Guarded uninstall could not start.",
      silent,
      degradePayload
    );
    return;
  }
  app.exit(0);
}
async function showUninstallGuardianFailure(message, silent, degrade) {
  if (degrade) {
    let exitCode = 2;
    try {
      exitCode = await runDegradedUninstallFlow(message, silent, degrade);
    } catch (error) {
      writeVelopackStartupFailure(
        "runtime_startup",
        new Error(`Uninstall Guardian degraded flow crashed: ${error}; ${message}`)
      );
    }
    app.exit(exitCode);
    return;
  }
  try {
    if (silent) {
      writeVelopackStartupFailure("runtime_startup", new Error(`Uninstall Guardian: ${message}`));
      return;
    }
    await app.whenReady();
    const { dialog } = await import("electron");
    dialog.showErrorBox(
      "MiniMax Design uninstall stopped",
      `The installation could not be verified, so no files were removed.

${message}`
    );
  } finally {
    app.exit(2);
  }
}
async function runDegradedUninstallFlow(message, silent, degrade) {
  if (silent) {
    writeVelopackStartupFailure(
      "runtime_startup",
      new Error(
        `Uninstall Guardian: silent degraded uninstall refused; registration and files preserved. ${message}`
      )
    );
    return 2;
  }
  await app.whenReady();
  const { dialog } = await import("electron");
  const zh = app.getLocale().toLowerCase().startsWith("zh");
  const productName = degrade.productName;
  const t = zh ? {
    stoppedTitle: `${productName} 卸载已停止`,
    stoppedMessage: "无法验证此安装，因此没有删除任何文件。",
    offer: `你仍然可以将应用从"已安装应用"列表中移除。不会删除任何文件：以下文件夹
${degrade.installRoot}
` + (degrade.dataOverlap ? "仍保留在磁盘上，并且其中包含你的数据（有数据目录被配置在该文件夹内）。请勿删除该文件夹。" : "仍保留在磁盘上，其中可能包含此应用无法识别的文件。"),
    remove: "从已安装应用中移除（保留全部文件）",
    close: "关闭",
    removeFailed: (reason) => `应用注册也无法移除。

${reason}`,
    removedTitle: `${productName} 已从已安装应用中移除`,
    removedMessage: "应用注册已移除。没有删除任何文件。",
    removedDetail: degrade.dataOverlap ? `以下文件夹包含你的数据，请勿删除：
${degrade.installRoot}
如需彻底清理，请先重新安装应用并在设置中把数据目录迁出，或联系支持协助。` : `以下文件夹保留在磁盘上：
${degrade.installRoot}
在确认其中没有你需要的文件之前，请不要删除它。`,
    ok: "好的"
  } : {
    stoppedTitle: `${productName} uninstall stopped`,
    stoppedMessage: "The installation could not be verified, so no files were removed.",
    offer: `You can still remove the app from the installed apps list. No files will be deleted: the folder at
${degrade.installRoot}
` + (degrade.dataOverlap ? "stays on disk and CONTAINS YOUR DATA (a data directory is configured inside it). Do not delete this folder." : "stays on disk and may contain files this app could not identify."),
    remove: "Remove from installed apps (keep all files)",
    close: "Close",
    removeFailed: (reason) => `The registration could not be removed either.

${reason}`,
    removedTitle: `${productName} removed from installed apps`,
    removedMessage: "The app registration was removed. No files were deleted.",
    removedDetail: degrade.dataOverlap ? `The folder at
${degrade.installRoot}
contains your data — do not delete it. To clean it up safely, reinstall the app and move the data directory out in Settings, or contact support.` : `The folder at
${degrade.installRoot}
stays on disk. Do not delete it until you are sure it holds nothing you need.`,
    ok: "OK"
  };
  const choice = await dialog.showMessageBox({
    type: "warning",
    title: t.stoppedTitle,
    message: t.stoppedMessage,
    detail: `${message}

${t.offer}`,
    buttons: [t.remove, t.close],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  });
  if (choice.response !== 0) return 2;
  const attempt = attemptRegistryOnlyUninstall({
    appId: degrade.appId,
    installRoot: degrade.installRoot
  });
  if (!attempt.ok) {
    dialog.showErrorBox(t.stoppedTitle, t.removeFailed(attempt.reason));
    return 2;
  }
  completeDegradedUninstall(message, degrade, attempt.reason);
  await dialog.showMessageBox({
    type: "info",
    title: t.removedTitle,
    message: t.removedMessage,
    detail: t.removedDetail,
    buttons: [t.ok],
    noLink: true
  });
  return 2;
}
function completeDegradedUninstall(failureMessage, degrade, outcomeReason) {
  try {
    if (degrade.resultPath) {
      const localAppData = process.env.LOCALAPPDATA;
      const expectedResultPath = localAppData ? path__default.win32.join(
        localAppData,
        "MiniMax",
        "install-ownership",
        degrade.appId,
        "uninstall-result.json"
      ) : void 0;
      if (expectedResultPath && path__default.win32.normalize(degrade.resultPath).replace(/[\\/]+$/u, "").toLowerCase() === expectedResultPath.replace(/[\\/]+$/u, "").toLowerCase()) {
        fs__default.writeFileSync(
          degrade.resultPath,
          `${JSON.stringify({ exitCode: 2, degraded: "registry-only", reason: outcomeReason })}
`,
          "utf8"
        );
      }
    }
  } catch {
  }
  try {
    const telemetryPath = installerShellTelemetryPath(degrade.appId);
    if (telemetryPath) {
      fs__default.mkdirSync(path__default.win32.dirname(telemetryPath), { recursive: true });
      fs__default.appendFileSync(
        telemetryPath,
        `${JSON.stringify({
          schema: 1,
          pack: degrade.packVersion,
          ts: (/* @__PURE__ */ new Date()).toISOString(),
          stage: "uninstall-degraded",
          detail: failureMessage.slice(0, 200)
        })}\r
`,
        "utf8"
      );
    }
  } catch {
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
if (process.argv.includes(UNINSTALL_GUARDIAN_ARGUMENT)) {
  void runRequestedUninstallGuardian().catch(
    (error) => showUninstallGuardianFailure(
      `Unhandled Guardian failure: ${error}`,
      process.argv.includes("--silent")
    )
  );
} else {
  const release = readPackagedReleaseIdentity();
  if (release) configureVelopackTempRoot({ appId: release.appId });
  void runVelopackEntry({
    loadRuntime: loadVelopackRuntime,
    runStartup: (runtime) => runVelopackStartup(runtime, void 0, {
      isInstallRootOwned: isFastHookInstallRootOwned
    }),
    markRuntime: markVelopackUpdaterRuntime,
    importMain: () => import("./chunks/index-C0Ixo6UY.js").then((n) => n.A),
    onFatal: showVelopackStartupFailure
  });
}
export {
  initTrack as $,
  APP_NAME as A,
  resolveTrackingDomain as B,
  isEvalGui as C,
  DEEP_LINK_SCHEME as D,
  isHeadless as E,
  isCustomWindowsInstallDir as F,
  verifyWindowsGuardianSignatures as G,
  HOT_UPDATE_BASE_URL as H,
  writeUserDataRootRegistry as I,
  registerWindowsUninstallGuardian as J,
  verifyWindowsUninstallExecutionIdentity as K,
  resolveVelopackLocatorOverride as L,
  resolvePackagedVelopackChannel as M,
  ensureInstallRootOwnership as N,
  readUserDataRootRegistry as O,
  PREFLIGHT_PROBE_ENTRY_RE as P,
  hasPendingInstallerShellCommit as Q,
  RELEASE as R,
  finalizeInstallerShellCommit as S,
  observeVelopackTempResidue as T,
  UPDATE_BASE_URL as U,
  loadVelopackRuntime as V,
  enableDevRemoteDebugging as W,
  writePackagedBootSmokeResult as X,
  cleanupOldLogs as Y,
  resolveTrackServerUrl as Z,
  DIAGNOSTICS_UPDATE_BASE_URL as _,
  resolveWindowsInstallLocationInfo as a,
  setTrackUser as a0,
  consumeInstallerShellTelemetry as a1,
  API_WILDCARD_DOMAIN as a2,
  CDN_DOMAINS as a3,
  assertPackagedUpdateSmokeAllowed as a4,
  createPackagedBootSmokeExit as a5,
  shouldUseVelopackUpdaterTransport as a6,
  installerShellTelemetry as a7,
  APP_VERSION as b,
  isProd as c,
  RUNTIME_ENV as d,
  getLogUserId as e,
  getLogDir as f,
  getCategoryLogger as g,
  APP_ID as h,
  isDev as i,
  isLogFile as j,
  isBrokenPipeError as k,
  logger as l,
  getLogFilePath as m,
  isMac as n,
  isTest as o,
  releaseRegion as p,
  releaseChannel as q,
  resolveWindowsEffectiveExecPath as r,
  API_BASE_URL as s,
  trackEvent as t,
  isVelopackUpdaterRuntime as u,
  configurePackagedBootSmokeUserDataEvidence as v,
  setLogUserId as w,
  resolvePackagedBootSmokeConfig as x,
  isLaneOverrideAllowed as y,
  isOverseas as z
};
