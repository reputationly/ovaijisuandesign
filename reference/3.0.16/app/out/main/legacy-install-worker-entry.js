import path__default from "node:path";
import { createHash } from "node:crypto";
import { h as getDeepLinkScheme, j as getProductName, f as getDurableAppName, k as getAppId, r as resolveManagedWindowsJunctionInstallDir } from "./chunks/windows-junction-path-Ndl9Z-pn.js";
import { execFileSync } from "node:child_process";
import fs__default from "node:fs";
import { c as createLegacyInstallWorkerFailureResponse, d as decodeLegacyInstallWorkerRequest, m as mapLegacyInstallDetectionToWorkerResponse, e as encodeLegacyInstallWorkerResponse, L as LEGACY_INSTALL_WORKER_MAX_REQUEST_BYTES } from "./chunks/worker-protocol-Rm4q_d5O.js";
import "./chunks/js-yaml-B0IoXaZA.js";
function normalizeWinPath(input) {
  return path__default.win32.normalize(input.trim()).replace(/[\\/]+$/, "").toLowerCase();
}
function normalizeConstrainedWindowsInstallRoot(input) {
  const trimmed = input.trim();
  if (!/^[a-z]:[\\/]/i.test(trimmed)) return null;
  const normalized = path__default.win32.normalize(trimmed);
  const parsed = path__default.win32.parse(normalized);
  if (!/^[a-z]:\\$/i.test(parsed.root)) return null;
  if (normalized.slice(2).includes(":")) return null;
  if (normalized.toLowerCase() === parsed.root.toLowerCase()) return null;
  const components = normalized.slice(parsed.root.length).split("\\");
  if (components.some(
    (component) => component.length === 0 || /[<>"|?*]/.test(component) || Array.from(component).some((character) => character.charCodeAt(0) < 32) || /[ .]$/.test(component) || /^(?:con|prn|aux|nul|clock\$|conin\$|conout\$|com(?:[1-9]|[¹²³])|lpt(?:[1-9]|[¹²³]))(?:\..*)?$/i.test(
      component
    )
  )) {
    return null;
  }
  return normalized.replace(/[\\/]+$/, "");
}
function isWinPathInsideOrSame(candidate, root) {
  const normalizedCandidate = normalizeWinPath(candidate);
  const normalizedRoot = normalizeWinPath(root);
  if (!normalizedRoot) return false;
  return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}\\`);
}
const REG_VALUE_LINE = /^\s+(.+?)\s+(REG_SZ|REG_EXPAND_SZ|REG_DWORD|REG_QWORD|REG_MULTI_SZ|REG_BINARY)\s+(.*)$/;
function parseRegQueryValues(output) {
  const values = {};
  for (const line of output.split(/\r?\n/)) {
    const match = REG_VALUE_LINE.exec(line);
    if (match) values[match[1]] = match[3].trim();
  }
  return values;
}
const KNOWN_DATA_ENTRIES = ["projects", "output_files", ".asset-center"];
const RECOVERED_ENTRY_PATTERN = /-recovered-\d{14}$/i;
const RECOVERY_ARTIFACTS = ["recovery-readme.txt"];
const KNOWN_APP_ENTRIES = [
  "locales",
  "resources",
  "swiftshader",
  "icudtl.dat",
  "snapshot_blob.bin",
  "v8_context_snapshot.bin",
  "version",
  "license",
  "license.electron.txt",
  "licenses.chromium.html",
  "vk_swiftshader_icd.json",
  "chrome_crashpad_handler"
];
const KNOWN_APP_PATTERNS = [/\.dll$/i, /\.pak$/i, /^\.hilo-.*\.tmp$/i];
function classifyLegacyRootEntry(entryName, identity) {
  const lower = entryName.toLowerCase();
  if (lower === identity.executableName.toLowerCase() || lower === identity.uninstallerName.toLowerCase() || KNOWN_APP_ENTRIES.includes(lower) || KNOWN_APP_PATTERNS.some((pattern) => pattern.test(entryName))) {
    return "app";
  }
  if (KNOWN_DATA_ENTRIES.includes(lower) || lower === `${identity.productName.toLowerCase()} data` || RECOVERED_ENTRY_PATTERN.test(entryName) || RECOVERY_ARTIFACTS.includes(lower) || lower.startsWith("unclassified-recovered-")) {
    return "data";
  }
  return "unclassified";
}
function analyzeLegacyRoot(entries, identity) {
  const analysis = {
    appEntries: [],
    dataEntries: [],
    unclassifiedEntries: []
  };
  for (const entry of entries) {
    switch (classifyLegacyRootEntry(entry, identity)) {
      case "app":
        analysis.appEntries.push(entry);
        break;
      case "data":
        analysis.dataEntries.push(entry);
        break;
      default:
        analysis.unclassifiedEntries.push(entry);
    }
  }
  return analysis;
}
function collectCompleteRegistryCandidate(identity, io) {
  const observations = identity.registryCandidates.map((candidate) => ({
    candidate,
    install: io.queryRegistryKey(candidate.installKey),
    uninstall: io.queryRegistryKey(candidate.uninstallKey)
  }));
  for (const { candidate, install, uninstall } of observations) {
    if (candidate.installKey.hive !== candidate.uninstallKey.hive || candidate.installKey.view !== candidate.uninstallKey.view) {
      return {
        state: "failed",
        code: "incomplete_registry_entry"
      };
    }
    if (install.state === "failed") {
      return {
        state: "failed",
        code: "registry_query_failed"
      };
    }
    if (uninstall.state === "failed") {
      return {
        state: "failed",
        code: "registry_query_failed"
      };
    }
  }
  const incomplete = observations.find(
    ({ install, uninstall }) => install.state !== uninstall.state
  );
  if (incomplete) {
    return {
      state: "failed",
      code: "incomplete_registry_entry"
    };
  }
  const complete = observations.flatMap(
    ({ candidate, install, uninstall }) => install.state === "found" && uninstall.state === "found" ? [{ candidate, installOutput: install.output, uninstallOutput: uninstall.output }] : []
  );
  if (complete.length === 0) {
    return { state: "absent", code: "registry_absent" };
  }
  if (complete.length > 1) {
    return {
      state: "failed",
      code: "ambiguous_registry_entries"
    };
  }
  return { state: "found", complete: complete[0] };
}
function parseExactUninstallCommand(uninstallString) {
  const match = /^"([^"]+)"\s+(\/currentuser|\/allusers)$/.exec(uninstallString.trim());
  return match ? { executablePath: match[1], argument: match[2] } : null;
}
function detectLegacyInstall(options) {
  const { identity, currentInstallDir, configuredDataDirectory, io } = options;
  const registry = collectCompleteRegistryCandidate(identity, io);
  if (registry.state !== "found") return registry;
  const { candidate, installOutput, uninstallOutput } = registry.complete;
  const installValues = parseRegQueryValues(installOutput);
  const uninstallValues = parseRegQueryValues(uninstallOutput);
  const rawInstallLocation = installValues.InstallLocation?.trim();
  if (!rawInstallLocation) {
    return { state: "failed", code: "missing_install_location" };
  }
  const installLocation = normalizeConstrainedWindowsInstallRoot(rawInstallLocation);
  if (!installLocation) return { state: "failed", code: "invalid_install_location" };
  const displayVersion = uninstallValues.DisplayVersion?.trim();
  if (!displayVersion) {
    return { state: "failed", code: "missing_display_version" };
  }
  const displayName = uninstallValues.DisplayName?.trim();
  const productIdentity = identity.compatibleProductIdentities.find(
    (candidateIdentity) => displayName === `${candidateIdentity.productName} ${displayVersion}`
  );
  if (!productIdentity) {
    return {
      state: "failed",
      code: "display_name_mismatch"
    };
  }
  const uninstallCommand = uninstallValues.UninstallString ? parseExactUninstallCommand(uninstallValues.UninstallString) : null;
  const expectedUninstallerPath = path__default.win32.join(installLocation, productIdentity.uninstallerName);
  if (!uninstallCommand || normalizeWinPath(uninstallCommand.executablePath) !== normalizeWinPath(expectedUninstallerPath) || uninstallCommand.argument !== candidate.uninstallArgument) {
    return {
      state: "failed",
      code: "invalid_uninstall_command"
    };
  }
  const uninstallerPath = uninstallCommand.executablePath;
  if (isWinPathInsideOrSame(installLocation, currentInstallDir)) {
    return { state: "failed", code: "install_overlap" };
  }
  if (isWinPathInsideOrSame(currentInstallDir, installLocation)) {
    return { state: "failed", code: "install_overlap" };
  }
  let rootSafety;
  try {
    rootSafety = io.probeInstallRoot(installLocation);
  } catch {
    return { state: "failed", code: "root_probe_failed" };
  }
  if (rootSafety === "failed") return { state: "failed", code: "root_probe_failed" };
  if (rootSafety === "unsafe") return { state: "failed", code: "invalid_install_location" };
  try {
    if (!io.directoryExists(installLocation)) {
      return { state: "failed", code: "stale_install_root" };
    }
    if (!io.fileExists(expectedUninstallerPath)) {
      return { state: "failed", code: "missing_uninstaller" };
    }
    if (!io.fileExists(path__default.win32.join(installLocation, productIdentity.executableName))) {
      return { state: "failed", code: "missing_main_executable" };
    }
  } catch {
    return { state: "failed", code: "root_probe_failed" };
  }
  let entries;
  try {
    entries = io.listDirectory(installLocation);
  } catch {
    return { state: "failed", code: "root_list_failed" };
  }
  const analysis = analyzeLegacyRoot(entries, productIdentity);
  const risks = [];
  if (configuredDataDirectory && isWinPathInsideOrSame(configuredDataDirectory, installLocation)) {
    risks.push("config_data_in_install_root");
  }
  if (analysis.dataEntries.length > 0) {
    risks.push("nested_user_data");
  }
  if (analysis.unclassifiedEntries.length > 0) {
    risks.push("unclassified_entries");
  }
  return {
    state: "found",
    candidate,
    installRoot: installLocation,
    uninstallerPath,
    displayName,
    displayVersion,
    analysis,
    riskProfile: {
      assessment: risks.length === 0 ? "provisional_low_risk" : "review_required",
      signals: risks
    }
  };
}
const ELECTRON_BUILDER_NS_UUID_BYTES = Buffer.from("50e065bc313411e69bab38c9862bdaf3", "hex");
function electronBuilderUninstallGuid(appId) {
  const hash = createHash("sha1").update(Buffer.concat([ELECTRON_BUILDER_NS_UUID_BYTES, Buffer.from(appId, "utf8")])).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = bytes[6] & 15 | 80;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20)
  ].join("-");
}
const REGISTRY_VIEW = "Registry64";
const UNINSTALL_KEY_ROOT = "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall";
function buildRegistryCandidate(hive, installMode, uninstallArgument, guid) {
  return {
    installMode,
    uninstallArgument,
    installKey: { hive, view: REGISTRY_VIEW, path: `Software\\${guid}` },
    uninstallKey: {
      hive,
      view: REGISTRY_VIEW,
      path: `${UNINSTALL_KEY_ROOT}\\${guid}`
    }
  };
}
function buildProductIdentity(productName) {
  return {
    productName,
    executableName: `${productName}.exe`,
    uninstallerName: `Uninstall ${productName}.exe`
  };
}
function resolveLegacyInstallIdentity(region, channel) {
  const appId = getAppId(region, channel);
  const productName = getDurableAppName(channel);
  const durableProductIdentity = buildProductIdentity(productName);
  const compatibleProductIdentities = [
    durableProductIdentity,
    buildProductIdentity(getProductName(channel))
  ].filter(
    (candidate, index, identities) => identities.findIndex((identity) => identity.productName === candidate.productName) === index
  );
  const registryGuid = electronBuilderUninstallGuid(appId);
  return {
    region,
    channel,
    appId,
    productName,
    executableName: durableProductIdentity.executableName,
    uninstallerName: durableProductIdentity.uninstallerName,
    compatibleProductIdentities,
    uninstallRegistryKey: registryGuid,
    registryCandidates: [
      buildRegistryCandidate("HKCU", "currentUser", "/currentuser", registryGuid),
      buildRegistryCandidate("HKLM", "allUsers", "/allusers", registryGuid)
    ],
    deepLinkScheme: getDeepLinkScheme(region, channel)
  };
}
const REG_QUERY_TIMEOUT_MS = 1e4;
const MAX_REGISTRY_OUTPUT_BYTES = 64 * 1024;
const MAX_PATH_SAFETY_OUTPUT_BYTES = 4 * 1024;
const MAX_REGISTRY_VALUES = 16;
const MAX_REGISTRY_VALUE_CHARACTERS = 32767;
const LEGACY_INSTALL_MAX_ROOT_ENTRIES = 4096;
const REQUESTED_REGISTRY_VALUE_NAMES = [
  "InstallLocation",
  "DisplayName",
  "DisplayVersion",
  "UninstallString"
];
const defaultExecFile = (executable, args, options) => execFileSync(executable, [...args], {
  ...options,
  stdio: [...options.stdio]
});
function defaultReadDirectory(dirPath) {
  const directory = fs__default.opendirSync(dirPath);
  const entries = [];
  try {
    while (true) {
      const entry = directory.readSync();
      if (!entry) return entries;
      if (entries.length >= LEGACY_INSTALL_MAX_ROOT_ENTRIES) {
        throw new Error("legacy install root entry limit exceeded");
      }
      entries.push(entry.name);
    }
  } finally {
    directory.closeSync();
  }
}
function propertyOf(error, key) {
  if (typeof error !== "object" && typeof error !== "function" || error === null) {
    return void 0;
  }
  return key in error ? error[key] : void 0;
}
function isMissingFilesystemEntry(error) {
  const code = propertyOf(error, "code");
  return code === "ENOENT" || code === "ENOTDIR";
}
function classifyRegistryProcessError(error) {
  const code = propertyOf(error, "code");
  const signal = propertyOf(error, "signal");
  if (code === "ETIMEDOUT" || signal === "SIGTERM" || signal === "SIGKILL") {
    return { state: "failed", reason: "timeout" };
  }
  if (code === "ENOENT" || code === "EACCES" || code === "EPERM") {
    return { state: "failed", reason: "spawn_failed" };
  }
  return { state: "failed", reason: "parse_failed" };
}
function hasExactKeys(value, expectedKeys) {
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length && expectedKeys.every((key) => keys.includes(key));
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isRequestedRegistryValueName(value) {
  return typeof value === "string" && REQUESTED_REGISTRY_VALUE_NAMES.includes(value);
}
function decodeRegistryQueryResult(output) {
  if (typeof output !== "string" || output.length === 0 || Buffer.byteLength(output, "utf8") > MAX_REGISTRY_OUTPUT_BYTES) {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || typeof parsed.state !== "string") return null;
  if (parsed.state === "absent") {
    return hasExactKeys(parsed, ["state"]) ? { state: "absent" } : null;
  }
  if (parsed.state === "failed") {
    if (!hasExactKeys(parsed, ["state", "code"]) || parsed.code !== "access_denied" && parsed.code !== "query_failed") {
      return null;
    }
    return { state: "failed", code: parsed.code };
  }
  if (parsed.state !== "found" || !hasExactKeys(parsed, ["state", "values"]) || !Array.isArray(parsed.values) || parsed.values.length > MAX_REGISTRY_VALUES) {
    return null;
  }
  const values = [];
  const names = /* @__PURE__ */ new Set();
  for (const value of parsed.values) {
    if (!isRecord(value) || !hasExactKeys(value, ["name", "kind", "value"]) || !isRequestedRegistryValueName(value.name) || value.kind !== "String" && value.kind !== "ExpandString" || typeof value.value !== "string" || value.value.length > MAX_REGISTRY_VALUE_CHARACTERS || /[\0\r\n]/.test(value.value) || names.has(value.name)) {
      return null;
    }
    names.add(value.name);
    values.push({ name: value.name, kind: value.kind, value: value.value });
  }
  return { state: "found", values };
}
function renderDetectorRegistryOutput(registryKey, values) {
  const hiveName = registryKey.hive === "HKCU" ? "HKEY_CURRENT_USER" : "HKEY_LOCAL_MACHINE";
  const lines = values.map(
    ({ name, kind, value }) => `    ${name}    ${kind === "String" ? "REG_SZ" : "REG_EXPAND_SZ"}    ${value}`
  );
  return [`${hiveName}\\${registryKey.path}`, ...lines, ""].join("\r\n");
}
function windowsPowerShellExecutable() {
  const windowsRoot = process.env.SystemRoot ?? "C:\\Windows";
  return path__default.win32.join(windowsRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
}
const REGISTRY_QUERY_POWERSHELL = `
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$baseKey = $null
$openedKey = $null
$result = $null
try {
  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
  if ($request.hive -eq 'HKCU') {
    $registryHive = [Microsoft.Win32.RegistryHive]::CurrentUser
  } elseif ($request.hive -eq 'HKLM') {
    $registryHive = [Microsoft.Win32.RegistryHive]::LocalMachine
  } else {
    throw [System.ArgumentException]::new('invalid hive')
  }
  $baseKey = [Microsoft.Win32.RegistryKey]::OpenBaseKey(
    $registryHive,
    [Microsoft.Win32.RegistryView]::Registry64
  )
  $openedKey = $baseKey.OpenSubKey([string]$request.path, $false)
  if ($null -eq $openedKey) {
    $result = [ordered]@{ state = 'absent' }
  } else {
    $knownNames = @($openedKey.GetValueNames())
    $values = @()
    foreach ($name in @('InstallLocation', 'DisplayName', 'DisplayVersion', 'UninstallString')) {
      if ($knownNames -contains $name) {
        $kind = $openedKey.GetValueKind($name).ToString()
        $value = $openedKey.GetValue(
          $name,
          $null,
          [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames
        )
        $values += [ordered]@{ name = $name; kind = $kind; value = $value }
      }
    }
    $result = [ordered]@{ state = 'found'; values = @($values) }
  }
} catch [System.UnauthorizedAccessException] {
  $result = [ordered]@{ state = 'failed'; code = 'access_denied' }
} catch [System.Security.SecurityException] {
  $result = [ordered]@{ state = 'failed'; code = 'access_denied' }
} catch {
  $result = [ordered]@{ state = 'failed'; code = 'query_failed' }
} finally {
  if ($null -ne $openedKey) { $openedKey.Dispose() }
  if ($null -ne $baseKey) { $baseKey.Dispose() }
}
[Console]::Out.Write(($result | ConvertTo-Json -Compress -Depth 4))
`;
const ENCODED_REGISTRY_QUERY_POWERSHELL = Buffer.from(
  REGISTRY_QUERY_POWERSHELL,
  "utf16le"
).toString("base64");
const PATH_SAFETY_PROBE_POWERSHELL = `
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$result = [ordered]@{ state = 'failed' }
try {
  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
  $propertyNames = @($request.PSObject.Properties.Name)
  if ($propertyNames.Count -ne 1 -or $propertyNames[0] -ne 'path' -or $request.path -isnot [string]) {
    throw [System.ArgumentException]::new('invalid request')
  }
  Add-Type -TypeDefinition @'
using System.Runtime.InteropServices;
public static class LegacyInstallPathNative {
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern uint GetDriveType(string rootPathName);

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern uint GetFileAttributes(string fileName);
}
'@
  $rootPath = [string]$request.path
  $driveRoot = [System.IO.Path]::GetPathRoot($rootPath)
  if ($driveRoot -notmatch '^[A-Za-z]:\\$') {
    $result = [ordered]@{ state = 'unsafe'; code = 'unsupported_drive' }
  } else {
    $driveType = [LegacyInstallPathNative]::GetDriveType($driveRoot)
    if ($driveType -ne 2 -and $driveType -ne 3) {
      $result = [ordered]@{ state = 'unsafe'; code = 'unsupported_drive' }
    } else {
      $currentPath = $driveRoot
      $result = [ordered]@{ state = 'safe' }
      $relativePath = $rootPath.Substring($driveRoot.Length)
      foreach ($component in $relativePath.Split([char[]]@([char]92), [System.StringSplitOptions]::RemoveEmptyEntries)) {
        $currentPath = [System.IO.Path]::Combine($currentPath, $component)
        $attributes = [LegacyInstallPathNative]::GetFileAttributes($currentPath)
        if ($attributes -eq [uint32]::MaxValue) {
          $lastError = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
          if ($lastError -eq 2 -or $lastError -eq 3) {
            break
          }
          $result = [ordered]@{ state = 'failed' }
          break
        }
        if (($attributes -band 0x400) -ne 0) {
          $result = [ordered]@{ state = 'unsafe'; code = 'reparse_point' }
          break
        }
      }
    }
  }
} catch {
  $result = [ordered]@{ state = 'failed' }
}
[Console]::Out.Write(($result | ConvertTo-Json -Compress -Depth 2))
`;
const ENCODED_PATH_SAFETY_PROBE_POWERSHELL = Buffer.from(
  PATH_SAFETY_PROBE_POWERSHELL,
  "utf16le"
).toString("base64");
function decodePathSafetyProbeResult(output) {
  if (typeof output !== "string" || output.length === 0 || Buffer.byteLength(output, "utf8") > MAX_PATH_SAFETY_OUTPUT_BYTES) {
    return "failed";
  }
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    return "failed";
  }
  if (!isRecord(parsed) || typeof parsed.state !== "string") return "failed";
  if (parsed.state === "safe") return hasExactKeys(parsed, ["state"]) ? "safe" : "failed";
  if (parsed.state === "unsafe") {
    return hasExactKeys(parsed, ["state", "code"]) && (parsed.code === "unsupported_drive" || parsed.code === "reparse_point") ? "unsafe" : "failed";
  }
  return "failed";
}
function createWindowsLegacyDetectionIo(dependencies = {}) {
  const execFile = dependencies.execFile ?? defaultExecFile;
  const stat = dependencies.stat ?? fs__default.lstatSync;
  const readDirectory = dependencies.readDirectory ?? defaultReadDirectory;
  return {
    queryRegistryKey(registryKey) {
      if (registryKey.view !== "Registry64" || registryKey.hive !== "HKCU" && registryKey.hive !== "HKLM") {
        return { state: "failed", reason: "parse_failed" };
      }
      let output;
      try {
        output = execFile(
          windowsPowerShellExecutable(),
          [
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-EncodedCommand",
            ENCODED_REGISTRY_QUERY_POWERSHELL
          ],
          {
            encoding: "utf8",
            input: JSON.stringify({ hive: registryKey.hive, path: registryKey.path }),
            stdio: ["pipe", "pipe", "pipe"],
            timeout: REG_QUERY_TIMEOUT_MS,
            maxBuffer: MAX_REGISTRY_OUTPUT_BYTES,
            windowsHide: true
          }
        );
      } catch (error) {
        return classifyRegistryProcessError(error);
      }
      const result = decodeRegistryQueryResult(output);
      if (!result) return { state: "failed", reason: "parse_failed" };
      if (result.state === "absent") return result;
      if (result.state === "failed") {
        return {
          state: "failed",
          reason: result.code === "access_denied" ? "access_denied" : "parse_failed"
        };
      }
      return { state: "found", output: renderDetectorRegistryOutput(registryKey, result.values) };
    },
    probeInstallRoot(rootPath) {
      let output;
      try {
        output = execFile(
          windowsPowerShellExecutable(),
          [
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-EncodedCommand",
            ENCODED_PATH_SAFETY_PROBE_POWERSHELL
          ],
          {
            encoding: "utf8",
            input: JSON.stringify({ path: rootPath }),
            stdio: ["pipe", "pipe", "pipe"],
            timeout: REG_QUERY_TIMEOUT_MS,
            maxBuffer: MAX_PATH_SAFETY_OUTPUT_BYTES,
            windowsHide: true
          }
        );
      } catch {
        return "failed";
      }
      return decodePathSafetyProbeResult(output);
    },
    fileExists(filePath) {
      try {
        return stat(filePath).isFile();
      } catch (error) {
        if (isMissingFilesystemEntry(error)) return false;
        throw error;
      }
    },
    directoryExists(dirPath) {
      try {
        return stat(dirPath).isDirectory();
      } catch (error) {
        if (isMissingFilesystemEntry(error)) return false;
        throw error;
      }
    },
    listDirectory(dirPath) {
      const entries = readDirectory(dirPath);
      if (entries.length > LEGACY_INSTALL_MAX_ROOT_ENTRIES) {
        throw new Error("legacy install root entry limit exceeded");
      }
      return entries;
    }
  };
}
const WATCHDOG_POLL_INTERVAL_MS = 250;
const TASKKILL_TIMEOUT_MS = 5e3;
const MAX_WINDOWS_PID = 4294967295;
function isValidPid(value) {
  if (!/^\d+$/.test(value)) return false;
  const pid = Number(value);
  return Number.isSafeInteger(pid) && pid > 0 && pid <= MAX_WINDOWS_PID;
}
function decodeLegacyInstallWorkerWatchdogArgs(args) {
  if (args.length !== 4 || args[0] !== "--watch-parent-pid" || args[2] !== "--watch-worker-pid" || !isValidPid(args[1]) || !isValidPid(args[3])) {
    return null;
  }
  return {
    parentPid: Number(args[1]),
    workerPid: Number(args[3])
  };
}
function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "EPERM") {
      return true;
    }
    return false;
  }
}
function sleep(durationMs) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
function windowsTaskkillExecutable() {
  const windowsRoot = process.env.SystemRoot ?? "C:\\Windows";
  return path__default.win32.join(windowsRoot, "System32", "taskkill.exe");
}
function terminateWorkerTree(workerPid) {
  try {
    execFileSync(windowsTaskkillExecutable(), ["/PID", String(workerPid), "/T", "/F"], {
      stdio: "ignore",
      timeout: TASKKILL_TIMEOUT_MS,
      windowsHide: true
    });
  } catch {
    try {
      process.kill(workerPid, "SIGKILL");
    } catch {
    }
  }
}
const DEFAULT_DEPENDENCIES = {
  isProcessAlive: processIsAlive,
  sleep,
  terminateWorkerTree
};
async function runLegacyInstallWorkerWatchdog(request, dependencies = DEFAULT_DEPENDENCIES) {
  while (dependencies.isProcessAlive(request.workerPid)) {
    if (!dependencies.isProcessAlive(request.parentPid)) {
      dependencies.terminateWorkerTree(request.workerPid);
      return;
    }
    await dependencies.sleep(WATCHDOG_POLL_INTERVAL_MS);
  }
}
async function readBoundedStdin() {
  const chunks = [];
  let retainedBytes = 0;
  for await (const chunk of process.stdin) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const remaining = LEGACY_INSTALL_WORKER_MAX_REQUEST_BYTES + 1 - retainedBytes;
    if (remaining > 0) {
      const retained = bytes.subarray(0, remaining);
      chunks.push(retained);
      retainedBytes += retained.byteLength;
    }
  }
  return Buffer.concat(chunks, retainedBytes);
}
async function main() {
  const workerArgs = process.argv.slice(2);
  if (workerArgs.length > 0) {
    const watchdogRequest = decodeLegacyInstallWorkerWatchdogArgs(workerArgs);
    if (!watchdogRequest) {
      process.exitCode = 1;
      return;
    }
    await runLegacyInstallWorkerWatchdog(watchdogRequest);
    return;
  }
  let response;
  try {
    if (process.env.ELECTRON_RUN_AS_NODE !== "1") {
      response = createLegacyInstallWorkerFailureResponse("worker_runtime_failed");
    } else {
      const decoded = decodeLegacyInstallWorkerRequest(await readBoundedStdin());
      if (!decoded.ok) {
        response = createLegacyInstallWorkerFailureResponse(decoded.code);
      } else {
        const junctionResolution = resolveManagedWindowsJunctionInstallDir(
          decoded.value.currentInstallDir
        );
        if (junctionResolution.kind === "invalid") {
          response = createLegacyInstallWorkerFailureResponse("worker_runtime_failed");
        } else {
          const request = {
            ...decoded.value,
            currentInstallDir: junctionResolution.installDir
          };
          const detection = detectLegacyInstall({
            identity: resolveLegacyInstallIdentity(request.region, request.channel),
            currentInstallDir: request.currentInstallDir,
            configuredDataDirectory: request.configuredDataDirectory ?? void 0,
            io: createWindowsLegacyDetectionIo()
          });
          response = mapLegacyInstallDetectionToWorkerResponse(detection, request);
        }
      }
    }
  } catch {
    response = createLegacyInstallWorkerFailureResponse("worker_runtime_failed");
  }
  let encoded;
  try {
    encoded = encodeLegacyInstallWorkerResponse(response);
  } catch {
    encoded = encodeLegacyInstallWorkerResponse(
      createLegacyInstallWorkerFailureResponse("worker_runtime_failed")
    );
  }
  process.stdout.write(`${encoded}
`);
}
void main();
