import { w as windowsJunctionHash, n as normalizeWindowsJunctionTarget } from "./js-yaml-B0IoXaZA.js";
import * as fs from "node:fs";
import * as path from "node:path";
function regionToLocale(region) {
  return region === "overseas" ? "en" : "zh";
}
const RELEASE_CHANNELS = ["dev", "test", "staging", "prod"];
const RELEASE_REGIONS = ["domestic", "overseas"];
const UPDATE_CDN = {
  domestic: "https://filecdn.minimax.chat",
  overseas: "https://file.cdn.minimax.io"
};
function isReleaseChannel(value) {
  return !!value && RELEASE_CHANNELS.includes(value);
}
function isReleaseRegion(value) {
  return !!value && RELEASE_REGIONS.includes(value);
}
function channelToRuntimeEnv(channel) {
  switch (channel) {
    case "prod":
      return "production";
    case "staging":
      return "staging";
    case "test":
      return "test";
    default:
      return "development";
  }
}
function getProductName(channel) {
  switch (channel) {
    case "test":
      return "MiniMax Design Test";
    case "staging":
      return "MiniMax Design Staging";
    case "dev":
      return "MiniMax Design Dev";
    default:
      return "MiniMax Design";
  }
}
function getDurableAppName(channel) {
  switch (channel) {
    case "test":
      return "MiniMax Hub Test";
    case "staging":
      return "MiniMax Hub Staging";
    case "dev":
      return "MiniMax Hub Dev";
    default:
      return "MiniMax Hub";
  }
}
function getDeepLinkScheme(region, channel) {
  const base = region === "domestic" ? "minimax-hub-cn" : "minimax-hub";
  const suffix = channel === "test" || channel === "dev" ? "-test" : channel === "staging" ? "-staging" : "";
  return `${base}${suffix}`;
}
function getAppId(region, channel) {
  const base = region === "overseas" ? "com.minimax.hub.global" : "com.minimax.hub";
  if (channel === "prod") return base;
  return `${base}.${channel}`;
}
const UNSIGNED_PERMITTED_PACK_IDS = RELEASE_REGIONS.flatMap(
  (region) => ["test", "staging"].map((channel) => getAppId(region, channel))
);
function isUnsignedPermittedPackId(packId) {
  return UNSIGNED_PERMITTED_PACK_IDS.includes(packId);
}
function getUpdateBaseUrl(region, channel) {
  const base = UPDATE_CDN[region];
  const appName = channel === "prod" ? "minimax-hub" : `minimax-hub-${channel}`;
  return `${base}/public/${appName}/release/${region}`;
}
function getEffectiveUpdateCdnChannel(runtimeIsDev, channel) {
  return runtimeIsDev || channel === "dev" ? "prod" : channel;
}
function getEffectiveUpdateBaseUrl(region, channel, runtimeIsDev) {
  return getUpdateBaseUrl(region, getEffectiveUpdateCdnChannel(runtimeIsDev, channel));
}
function getDiagnosticsUpdateBaseUrl(region, channel, runtimeIsDev) {
  return getEffectiveUpdateBaseUrl(region, channel, runtimeIsDev);
}
function getHotUpdateBaseUrl(region, channel) {
  if (channel === "dev") return "";
  const base = UPDATE_CDN[region];
  const locale = regionToLocale(region);
  return `${base}/public/minimax-hub/hot-update/${locale}/${channel}`;
}
const API_DOMAINS = {
  domestic: {
    dev: "https://hailuo-pre.xaminim.com",
    test: "https://hailuo-pre.xaminim.com",
    staging: "https://hailuoai.com",
    prod: "https://hailuoai.com"
  },
  overseas: {
    dev: "https://hailuoai-video-test.xaminim.com",
    test: "https://hailuoai-video-test.xaminim.com",
    staging: "https://hailuoai.video",
    prod: "https://hailuoai.video"
  }
};
function getApiDomain(region, channel) {
  return API_DOMAINS[region]?.[channel] ?? API_DOMAINS.domestic.dev;
}
function createReleaseMetadata(channel, region) {
  return {
    appId: getAppId(region, channel),
    productName: getProductName(channel),
    deepLinkScheme: getDeepLinkScheme(region, channel),
    region,
    channel,
    downloadSource: "default",
    updateBaseUrl: getUpdateBaseUrl(region, channel),
    hotUpdateBaseUrl: getHotUpdateBaseUrl(region, channel),
    locale: regionToLocale(region),
    domain: getApiDomain(region, channel)
  };
}
createReleaseMetadata("dev", "domestic");
const APP_JUNCTION_ROOT_NAME = "MiniMaxHub";
const JUNCTIONS_DIR_NAME = "junctions";
const JUNCTION_HASH_PATTERN = /^[a-f0-9]{12}$/i;
function stripWindowsNtPathPrefix(input) {
  return input.replace(/^(\\\\\?\\|\\\?\?\\)/, "");
}
function normalizeWindowsPathForCompare(input) {
  return normalizeWindowsJunctionTarget(input);
}
function normalizeWindowsInstallDir(input) {
  return path.win32.normalize(stripWindowsNtPathPrefix(input)).replace(/[\\/]+$/, "");
}
function getWindowsJunctionRootCandidates(env = process.env) {
  return [
    path.win32.join(env.ProgramData || "C:\\ProgramData", APP_JUNCTION_ROOT_NAME),
    path.win32.join(env.PUBLIC || "C:\\Users\\Public", APP_JUNCTION_ROOT_NAME)
  ];
}
function buildWindowsJunctionPath(targetDir, workRoot) {
  return path.win32.join(workRoot, JUNCTIONS_DIR_NAME, windowsJunctionHash(targetDir));
}
function isReusableWindowsJunction(existingTarget, targetDir) {
  return normalizeWindowsPathForCompare(existingTarget) === normalizeWindowsPathForCompare(targetDir);
}
function findManagedJunctionWorkRoot(installDir, env) {
  const parentDir = path.win32.dirname(installDir);
  const junctionName = path.win32.basename(installDir);
  if (!JUNCTION_HASH_PATTERN.test(junctionName)) return null;
  return getWindowsJunctionRootCandidates(env).find((workRoot) => {
    const junctionBaseDir = path.win32.join(workRoot, JUNCTIONS_DIR_NAME);
    return normalizeWindowsPathForCompare(parentDir) === normalizeWindowsPathForCompare(junctionBaseDir);
  }) ?? null;
}
function resolveManagedWindowsJunctionInstallDir(installDir, options = {}) {
  const env = options.env ?? process.env;
  const workRoot = findManagedJunctionWorkRoot(installDir, env);
  if (!workRoot) return { kind: "not-managed", installDir };
  const invalid = (reason) => ({
    kind: "invalid",
    installDir,
    junctionDir: installDir,
    reason
  });
  try {
    const readlinkSync = options.readlinkSync ?? ((targetPath) => fs.readlinkSync(targetPath));
    const accessSync = options.accessSync ?? fs.accessSync;
    const targetDir = normalizeWindowsInstallDir(readlinkSync(installDir));
    if (!path.win32.isAbsolute(targetDir)) {
      return invalid(`Managed updater junction target is not absolute: ${targetDir}`);
    }
    const expectedJunctionDir = buildWindowsJunctionPath(targetDir, workRoot);
    if (normalizeWindowsPathForCompare(expectedJunctionDir) !== normalizeWindowsPathForCompare(installDir)) {
      return invalid(`Managed updater junction target hash mismatch: ${targetDir}`);
    }
    accessSync(installDir);
    return { kind: "resolved", installDir: targetDir, junctionDir: installDir };
  } catch (error) {
    return invalid(`Managed updater junction cannot be resolved: ${error}`);
  }
}
export {
  getApiDomain as a,
  isReleaseRegion as b,
  createReleaseMetadata as c,
  channelToRuntimeEnv as d,
  isUnsignedPermittedPackId as e,
  getDurableAppName as f,
  getDiagnosticsUpdateBaseUrl as g,
  getDeepLinkScheme as h,
  isReleaseChannel as i,
  getProductName as j,
  getAppId as k,
  getWindowsJunctionRootCandidates as l,
  buildWindowsJunctionPath as m,
  isReusableWindowsJunction as n,
  getEffectiveUpdateBaseUrl as o,
  resolveManagedWindowsJunctionInstallDir as r
};
