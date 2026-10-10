// 首页展示区的远端配置：拉取、错误分类，以及读取配置的 react-query hooks。
import { reactExports, useQuery, workspaceLog, API_PATHS } from "../vendor.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { useGatewayReady } from "../infra/inline-rename-input.jsx";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { useRuntimeConfig } from "../generation/use-model-catalog-scope-key.js";
import { DEFAULT_HOME_SKILL_SHOWCASE_CONFIG, DEFAULT_HOME_TABS_SHOWCASE_CONFIG, EMPTY_HOME_PROJECT_SHOWCASE_CONFIG, HOME_PROJECT_SHOWCASE_CONFIG_KEY, HOME_PROJECT_SHOWCASE_SCHEMA_VERSION, HOME_SKILL_SHOWCASE_CONFIG_KEY, HOME_SKILL_SHOWCASE_SCHEMA_VERSION, HOME_TABS_SHOWCASE_CONFIG_KEY, HOME_TABS_SHOWCASE_SCHEMA_VERSION, parseHomeProjectShowcaseConfig, parseHomeSkillShowcaseConfig, parseHomeTabsShowcaseConfig } from "./config.js";
const HOME_SHOWCASE_APOLLO_MAX_BYTES = 1e6;
class HomeShowcaseApolloConfigError extends Error {
  constructor(failureKind, failureStage, message, httpStatus, options) {
    super(message, options);
    this.failureKind = failureKind;
    this.failureStage = failureStage;
    this.httpStatus = httpStatus;
    this.name = "HomeShowcaseApolloConfigError";
  }
}
function gatewayHttpStatus(error) {
  if (!error || typeof error !== "object") return void 0;
  const direct = error.status;
  if (isHttpStatus(direct)) return direct;
  const response = error.response;
  if (!response || typeof response !== "object") return void 0;
  const nested = response.status;
  return isHttpStatus(nested) ? nested : void 0;
}
function isHttpStatus(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value < 600;
}
function httpStatusGroup(status) {
  if (status === void 0) return void 0;
  if (status >= 400 && status < 500) return "4xx";
  if (status >= 500 && status < 600) return "5xx";
  return "other";
}
function requestError(error) {
  const status = gatewayHttpStatus(error);
  return new HomeShowcaseApolloConfigError(status === void 0 ? "network" : "http", "request", status === void 0 ? "home showcase config request failed" : `home showcase HTTP ${status}`, status, {
    cause: error
  });
}
function invalidHomeShowcaseConfigError(key) {
  return new HomeShowcaseApolloConfigError("invalid_config", "schema_validation", `invalid ${key}`);
}
const reportedErrors = new WeakSet();
function boundedRegion(region) {
  if (region === "domestic" || region === "overseas") return region;
  return "other";
}
function boundedChannel(channel) {
  if (channel === "dev" || channel === "test" || channel === "staging" || channel === "prod") {
    return channel;
  }
  return "other";
}
function classifyHomeShowcaseConfigError(error) {
  return error instanceof HomeShowcaseApolloConfigError ? error : requestError(error);
}
function reportHomeShowcaseConfigResolution({
  configName,
  outcome,
  region,
  channel,
  schemaVersion,
  error
}) {
  if (error && typeof error === "object") {
    if (reportedErrors.has(error)) return;
    reportedErrors.add(error);
  }
  const classified = classifyHomeShowcaseConfigError(error);
  const statusGroup = httpStatusGroup(classified.httpStatus);
  const properties = {
    config_name: configName,
    outcome,
    failure_kind: classified.failureKind,
    failure_stage: classified.failureStage,
    region: boundedRegion(region),
    channel: boundedChannel(channel),
    schema_version: schemaVersion,
    ...(statusGroup ? {
      http_status_group: statusGroup
    } : {})
  };
  try {
    trackEvent(TRACK_EVENTS.HOME_MEDIA_SHOWCASE_CONFIG_RESOLUTION, properties);
  } catch {}
  try {
    workspaceLog.warn("home: media-showcase-config-resolution", {
      ...properties,
      ...(classified.httpStatus === void 0 ? {} : {
        http_status: classified.httpStatus
      })
    });
  } catch {}
  try {
    const breadcrumb = window.hilo?.diagnostics?.addBreadcrumb("network", "home: media-showcase-config-resolution", properties);
    void breadcrumb?.catch(() => {});
  } catch {}
}
function useHomeShowcaseConfigResolution({
  configName,
  fallbackSource,
  hasRemoteData,
  region,
  channel,
  schemaVersion,
  error
}) {
  reactExports.useEffect(() => {
    if (!error) return;
    reportHomeShowcaseConfigResolution({
      configName,
      outcome: hasRemoteData ? "retained_remote" : fallbackSource === "bundle" ? "fallback_bundle" : "fallback_empty",
      region,
      channel,
      schemaVersion,
      error
    });
  }, [channel, configName, error, fallbackSource, hasRemoteData, region, schemaVersion]);
}
async function fetchHomeApolloConfig(key) {
  let response;
  try {
    response = await gatewayFetch(API_PATHS.apolloConfig(key));
  } catch (error) {
    throw requestError(error);
  }
  if (!response.ok) {
    throw new HomeShowcaseApolloConfigError("http", "request", `${key} HTTP ${response.status}`, response.status);
  }
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declaredBytes) && declaredBytes > HOME_SHOWCASE_APOLLO_MAX_BYTES) {
      throw new HomeShowcaseApolloConfigError("oversized", "response_body", `${key} payload is too large`);
    }
  }
  if (!response.body) {
    throw new HomeShowcaseApolloConfigError("invalid_config", "response_body", `${key} payload is empty`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let body = "";
  try {
    while (true) {
      const {
        done,
        value
      } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > HOME_SHOWCASE_APOLLO_MAX_BYTES) {
        try {
          await reader.cancel();
        } catch {}
        throw new HomeShowcaseApolloConfigError("oversized", "response_body", `${key} payload is too large`);
      }
      body += decoder.decode(value, {
        stream: true
      });
    }
    body += decoder.decode();
  } catch (error) {
    if (error instanceof HomeShowcaseApolloConfigError) throw error;
    throw new HomeShowcaseApolloConfigError("network", "response_body", `${key} response body failed`, void 0, {
      cause: error
    });
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new HomeShowcaseApolloConfigError("invalid_config", "json_parse", `${key} payload is not valid JSON`);
  }
}
const HOME_PROJECT_SHOWCASE_STALE_TIME_MS = 6e4;
export function useHomeProjectShowcaseConfig(enabled) {
  const gatewayReady = useGatewayReady();
  const {
    region,
    channel
  } = useRuntimeConfig();
  const {
    data,
    error,
    isLoading
  } = useQuery({
    queryKey: ["home-project-showcase-config", region, channel],
    queryFn: async () => {
      const raw = await fetchHomeApolloConfig(HOME_PROJECT_SHOWCASE_CONFIG_KEY);
      const parsed = parseHomeProjectShowcaseConfig(raw);
      if (!parsed) throw invalidHomeShowcaseConfigError(HOME_PROJECT_SHOWCASE_CONFIG_KEY);
      return parsed;
    },
    enabled: gatewayReady && enabled,
    staleTime: HOME_PROJECT_SHOWCASE_STALE_TIME_MS,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    retry: 1,
    throwOnError: false
  });
  useHomeShowcaseConfigResolution({
    configName: "project",
    fallbackSource: "empty",
    hasRemoteData: Boolean(data),
    region,
    channel,
    schemaVersion: HOME_PROJECT_SHOWCASE_SCHEMA_VERSION,
    error
  });
  return {
    config: data ?? EMPTY_HOME_PROJECT_SHOWCASE_CONFIG,
    source: data ? "remote" : enabled && gatewayReady && isLoading ? "loading" : "empty",
    isLoading: enabled && gatewayReady && isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null
  };
}
const HOME_SKILL_SHOWCASE_STALE_TIME_MS = 6e4;
export function useHomeSkillShowcaseConfig(enabled) {
  const gatewayReady = useGatewayReady();
  const {
    region,
    channel
  } = useRuntimeConfig();
  const {
    data,
    error,
    isError,
    isLoading
  } = useQuery({
    queryKey: ["home-skill-showcase-config", region, channel],
    queryFn: async () => {
      const raw = await fetchHomeApolloConfig(HOME_SKILL_SHOWCASE_CONFIG_KEY);
      const parsed = parseHomeSkillShowcaseConfig(raw);
      if (!parsed) throw invalidHomeShowcaseConfigError(HOME_SKILL_SHOWCASE_CONFIG_KEY);
      return parsed;
    },
    enabled: gatewayReady && enabled,
    staleTime: HOME_SKILL_SHOWCASE_STALE_TIME_MS,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    retry: 1,
    throwOnError: false
  });
  useHomeShowcaseConfigResolution({
    configName: "skill",
    fallbackSource: "bundle",
    hasRemoteData: Boolean(data),
    region,
    channel,
    schemaVersion: HOME_SKILL_SHOWCASE_SCHEMA_VERSION,
    error
  });
  return {
    config: data ?? DEFAULT_HOME_SKILL_SHOWCASE_CONFIG,
    source: data ? "remote" : isError ? "bundle" : "loading",
    isLoading: enabled && gatewayReady && isLoading
  };
}
const HOME_TABS_SHOWCASE_STALE_TIME_MS = 6e4;
const LOADING_HOME_TABS_SHOWCASE_CONFIG = {
  schemaVersion: HOME_TABS_SHOWCASE_SCHEMA_VERSION,
  enabled: true,
  primaryCategories: []
};
export function useHomeTabsShowcaseConfig() {
  const gatewayReady = useGatewayReady();
  const {
    region,
    channel
  } = useRuntimeConfig();
  const {
    data,
    error,
    isError,
    isLoading
  } = useQuery({
    queryKey: ["home-tabs-showcase-config", region, channel],
    queryFn: async () => {
      const raw = await fetchHomeApolloConfig(HOME_TABS_SHOWCASE_CONFIG_KEY);
      const parsed = parseHomeTabsShowcaseConfig(raw);
      if (!parsed) throw invalidHomeShowcaseConfigError(HOME_TABS_SHOWCASE_CONFIG_KEY);
      return parsed;
    },
    enabled: gatewayReady,
    staleTime: HOME_TABS_SHOWCASE_STALE_TIME_MS,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    retry: 1,
    throwOnError: false
  });
  useHomeShowcaseConfigResolution({
    configName: "tabs",
    fallbackSource: "bundle",
    hasRemoteData: Boolean(data),
    region,
    channel,
    schemaVersion: HOME_TABS_SHOWCASE_SCHEMA_VERSION,
    error
  });
  return {
    config: data ?? (isError ? DEFAULT_HOME_TABS_SHOWCASE_CONFIG : LOADING_HOME_TABS_SHOWCASE_CONFIG),
    source: data ? "remote" : isError ? "bundle" : "loading",
    isLoading: gatewayReady && isLoading
  };
}
