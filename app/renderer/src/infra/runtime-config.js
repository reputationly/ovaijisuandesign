// 区域、版本和 CDN 地址要在应用里读运行时配置。
import reactExports from "react";

export const HILO_APP_ID = "3001";
export const HILO_BIZ_ID = "0";
export const HILO_DEFAULT_VERSION_CODE = "0.1.0";
export const VERSION_CODE_SEMVER_CORE_PATTERN = /^v?(\d+\.\d+\.\d+)(?:[-+].*)?$/;
export function normalizeVersionCodeForCloud(version) {
  const trimmed = version.trim();
  const match = VERSION_CODE_SEMVER_CORE_PATTERN.exec(trimmed);
  return match?.[1] ?? trimmed;
}
export function regionToLocale(region) {
  return region === "overseas" ? "en" : "zh";
}
export const RUNTIME_CONFIG_KEY = "__HILO_CONFIG__";
export const DEFAULT_RUNTIME_CONFIG = {
  gatewayUrl: "http://localhost:8001",
  wsUrl: "ws://localhost:8001/ws",
  env: "development",
  channel: "dev",
  region: "domestic",
  appVersion: "0.0.0",
  domain: "https://hailuo-pre.xaminim.com",
  downloadSource: "default"
};
export function parseSemver(version) {
  const match = version.trim().replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)(?:-([\w.]+))?(?:\+.*)?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null
  };
}
export function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return 0;
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  return pa.patch - pb.patch;
}
export let _cachedConfig = null;
export function getRuntimeConfig() {
  if (_cachedConfig) return _cachedConfig;
  let raw = null;
  if (typeof window !== "undefined" && RUNTIME_CONFIG_KEY in window) {
    raw = window[RUNTIME_CONFIG_KEY];
  }
  if (!raw && typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="hilo-config"]');
    if (meta) {
      try {
        raw = JSON.parse(meta.getAttribute("content") ?? "{}");
      } catch {}
    }
  }
  if (raw) {
    const cleaned = Object.fromEntries(Object.entries(raw).filter(([, value]) => value != null));
    _cachedConfig = {
      ...DEFAULT_RUNTIME_CONFIG,
      ...cleaned
    };
  } else {
    _cachedConfig = DEFAULT_RUNTIME_CONFIG;
  }
  return _cachedConfig;
}
export function normalizeGatewayBaseUrl(gatewayUrl) {
  return gatewayUrl?.replace(/\/$/, "") || void 0;
}
export const GLOBAL_STORAGE_VERSION = 31;
export const GLOBAL_STORAGE_DEFAULTS = {
  _version: GLOBAL_STORAGE_VERSION,
  tokens: {},
  user: {},
  config: {
    browserConnectorEnabled: true,
    menuBarVisible: true,
    windowCloseBehavior: "ask",
    networkProxyMode: "auto",
    agentModePreference: "auto",
    runOnStartup: false,
    recentProjectsSortMode: "manual",
    recentProjectsGroupMode: "project",
    pinnedWorkspacePaths: [],
    pinnedProjectIds: [],
    projectsSortMode: "updated",
    globalAccessShortcut: {},
    workingDirectory: "",
    language: "en",
    theme: "system",
    islandLayout: true,
    transparentWindowExperiment: false,
    dataDirectory: "",
    dataDirectoryCleanupPaths: [],
    dataDirectoryDeferredCleanupPaths: [],
    assetCenterRestartRequired: false,
    folderWhitelist: [],
    skillAutoUpdate: true,
    autoInstallOnQuit: false,
    localFileRevealAllowedDirs: [],
    autoFeedbackEnabled: false,
    watermarkEnabled: false,
    watermarkOnboardingShown: true,
    assetCenterHidden: false,
    attachmentFaceNoticeAccepted: false,
    creditTransferTermsAccepted: {},
    comfyUiLicenseAcceptances: {},
    compactionEnabled: true,
    customModels: void 0,
    devAuthBrowser: "default",
    newProjectPrefs: {
      loadUserMemory: false
    }
  },
  globalSidebarLayout: {},
  currentWorkspace: "",
  recentWorkspaces: [],
  projects: [],
  hiddenProjectIds: [],
  skillPermissions: {},
  customMcpVault: "",
  windowState: null,
  notificationPermissionRequested: false,
  dismissedMoveToApplications: false,
  dismissedLegacyMacAppCleanup: false,
  visiblePreviewTabs: {
    version: 1,
    initialized: false,
    tabs: []
  },
  workspaceSessionTabs: {},
  workspaceTextEditSessions: {},
  reportedIncidentTelemetryByUserID: {},
  hasSelectedInterests: false,
  selectedInterests: [],
  hasEverLoggedIn: false,
  selectedGroupIds: {},
  creditReminderConfigs: {},
  subscriptionRenewalSeen: {},
  teamCreditTransferIntents: {},
  teamExitProgress: {},
  teamExitTombstones: {},
  dismissedCoachMarks: [],
  sessionEvictionToastCount: 0
};
export const GatewayScopeContext = reactExports.createContext(null);
export function useGatewayScope() {
  const context = reactExports.useContext(GatewayScopeContext);
  if (context) return context;
  const baseUrl = normalizeGatewayBaseUrl(getRuntimeConfig().gatewayUrl);
  return {
    baseUrl,
    gatewayReady: baseUrl !== void 0,
    scopeKey: "app",
    workspaceClaim: void 0,
    gatewayBinding: void 0,
    workspaceClient: void 0,
    recoverWorkspace: void 0
  };
}
export function useGatewayBaseUrl() {
  return useGatewayScope().baseUrl;
}
export let _rendererGlobalDefaults;
export function getRendererGlobalDefaults() {
  if (!_rendererGlobalDefaults) {
    const region = getRuntimeConfig().region;
    _rendererGlobalDefaults = {
      ...GLOBAL_STORAGE_DEFAULTS,
      config: {
        ...GLOBAL_STORAGE_DEFAULTS.config,
        language: regionToLocale(region)
      }
    };
  }
  return _rendererGlobalDefaults;
}
export const CDN_BASE_MAP = {
  domestic: "https://cdn.hailuoai.com/hailuo-video-web/public_assets",
  overseas: "https://cdn.hailuoai.video/open-hailuo-video-web/public_assets"
};
export const PUBLIC_ASSET_BASE_MAP = {
  domestic: "https://cdn.hailuoai.com/public_assets",
  overseas: "https://cdn.hailuoai.video/public_assets"
};
export function getCdnRegion() {
  try {
    const {
      region
    } = getRuntimeConfig();
    return region in CDN_BASE_MAP ? region : "domestic";
  } catch {
    return "domestic";
  }
}
export function cdnPublicAsset(files) {
  const region = getCdnRegion();
  return `${PUBLIC_ASSET_BASE_MAP[region]}/${files[region]}`;
}
export const CDN_TOUCHDESIGNER_COMPONENTS = cdnPublicAsset({
  domestic: "touchdesigner-mcp-components-2.0.0.zip",
  overseas: "touchdesigner-mcp-components-2.0.0.zip"
});
