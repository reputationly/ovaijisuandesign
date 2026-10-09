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
  const arch = typeof process !== "undefined" && process.arch ? process.arch : "";
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
export function buildBaseProps(opts) {
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
