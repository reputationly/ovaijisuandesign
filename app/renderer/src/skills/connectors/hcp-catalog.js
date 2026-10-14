// 动态连接器清单：版本门槛、能力过滤、合并缓存、按 id 查找、图标和安装素材地址。
import { parseSemver, compareSemver, getCdnRegion, CDN_TOUCHDESIGNER_COMPONENTS } from "../../infra/runtime-config.js";
import { matchesLocalConnectorServer } from "./connector-match.js";
import { matchesRemoteConnectorServer } from "./connector-market.js";

export function satisfiesMinHubVersion(minHubVersion, appVersion) {
  if (!minHubVersion) return true;
  if (parseSemver(minHubVersion) === null) return false;
  if (!appVersion || parseSemver(appVersion) === null) return true;
  return compareSemver(appVersion, minHubVersion) >= 0;
}
function isDynamicallyDeliverable(manifest) {
  const {
    mcp,
    cli,
    skills
  } = manifest.capabilities;
  if (!mcp && !cli && !(skills && skills.length > 0)) return false;
  const managedInterpreter = mcp?.kind === "local" && (mcp.launch.command === "node" || mcp.launch.command === "python");
  if (mcp?.kind === "local" && managedInterpreter && !mcp.bundle && !mcp.pypi) return false;
  if (cli && cli.install.strategy === "bundle" && !cli.install.bundle) {
    const ridesMcpBundle = mcp?.kind === "local" && mcp.bundle !== void 0 && mcp.packageName === cli.packageName;
    if (!ridesMcpBundle) return false;
  }
  const pathSkills = (skills ?? []).filter(skill => skill.path !== void 0);
  if (pathSkills.length > 0 && !(mcp?.kind === "local" && mcp.bundle)) return false;
  return true;
}
function buildHcpCatalogEntries(dynamic) {
  const skipped = [];
  const byConnectorId = /* @__PURE__ */new Map();
  for (const manifest of dynamic) {
    if (!isDynamicallyDeliverable(manifest)) {
      skipped.push({
        connectorId: manifest.connectorId,
        reason: "requires_release"
      });
      continue;
    }
    if (byConnectorId.has(manifest.connectorId)) continue;
    byConnectorId.set(manifest.connectorId, manifest);
  }
  const entries2 = [...byConnectorId.values()].map(manifest => ({
    manifest,
    source: "dynamic"
  }));
  entries2.sort((a2, b3) => a2.manifest.order - b3.manifest.order);
  return {
    entries: entries2,
    skipped
  };
}
export function resolveConnectorIcon(icon) {
  return icon.urls[getCdnRegion()];
}
const CONNECTOR_SETUP_ASSET_BY_KEY = {
  "touchdesigner-components": CDN_TOUCHDESIGNER_COMPONENTS
};
export function resolveConnectorSetupAsset(setupAssetKey) {
  return CONNECTOR_SETUP_ASSET_BY_KEY[setupAssetKey];
}
let mergedCache;
export function registerDynamicHcpManifests(manifests) {
  const {
    entries: entries2,
    skipped
  } = buildHcpCatalogEntries(manifests);
  mergedCache = Object.freeze(entries2);
  return skipped;
}
function getMergedHcpCatalogEntries() {
  if (mergedCache) return mergedCache;
  return [];
}
export function getMergedHcpCatalog() {
  return getMergedHcpCatalogEntries().map(entry => entry.manifest);
}
export function findHcpConnector(connectorId) {
  return getMergedHcpCatalogEntries().find(entry => entry.manifest.connectorId === connectorId)?.manifest;
}
export function hcpToDefinition(connectorId) {
  const manifest = findHcpConnector(connectorId);
  if (!manifest) return void 0;
  const mcp = manifest.capabilities.mcp;
  const iconUrl = resolveConnectorIcon(manifest.icon);
  if (mcp?.kind === "remote") {
    return {
      id: connectorId,
      serverName: mcp.serverName,
      displayName: manifest.displayName.en || manifest.displayName.zh || connectorId,
      iconUrl,
      matches: server => matchesRemoteConnectorServer(server, mcp)
    };
  }
  return {
    id: connectorId,
    serverName: mcp?.serverName ?? connectorId,
    displayName: manifest.displayName.en || manifest.displayName.zh || connectorId,
    iconUrl,
    matches: server => matchesLocalConnectorServer(server, connectorId)
  };
}
export function isSkillsOnly(manifest) {
  return manifest.capabilities.mcp === void 0 && (manifest.capabilities.skills?.length ?? 0) > 0;
}
