import { promises } from "node:fs";
import path__default from "node:path";
import { n as isRecord, o as resolveUpdatePolicy, q as classifyNetworkDiagnosticsError, t as buildReleaseCdnUrl } from "./index-C0Ixo6UY.js";
import "./js-yaml-B0IoXaZA.js";
import { net } from "electron";
import { q as releaseChannel, p as releaseRegion, g as getCategoryLogger, R as RELEASE } from "../index.js";
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
const log = getCategoryLogger("update", "policy");
const UPDATE_POLICY_TIMEOUT_MS = 3e3;
const UPDATE_POLICY_CACHE_FILE = "update-policy-cache.json";
const CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
const UPDATE_POLICY_FETCH_MAX_ATTEMPTS = 3;
const UPDATE_POLICY_RETRY_BASE_DELAY_MS = 250;
const UPDATE_POLICY_RETRY_MAX_DELAY_MS = 1e3;
const HTTP_SERVER_ERROR_MIN_STATUS = 500;
class UpdatePolicyFetchError extends Error {
  constructor(reason, message, retryable) {
    super(message);
    this.reason = reason;
    this.retryable = retryable;
    this.name = "UpdatePolicyFetchError";
  }
}
function parseCdnPolicy(data) {
  if (!isRecord(data)) return null;
  if (data.schema_version !== 1) return null;
  if (typeof data.enabled !== "boolean") return null;
  if (typeof data.min_supported_version !== "string") return null;
  const policy = {
    schema_version: 1,
    enabled: data.enabled,
    min_supported_version: data.min_supported_version
  };
  if (isRecord(data.force_reason)) {
    const fr = data.force_reason;
    if (typeof fr.zh === "string" && typeof fr.en === "string") {
      policy.force_reason = { zh: fr.zh, en: fr.en };
    }
  }
  if (typeof data.manual_download_url === "string") {
    try {
      const parsed = new URL(data.manual_download_url);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        policy.manual_download_url = data.manual_download_url;
      } else {
        log.warn(`Ignoring non-http(s) manual_download_url: ${parsed.protocol}`);
      }
    } catch {
      log.warn(`Ignoring invalid manual_download_url: ${data.manual_download_url}`);
    }
  }
  if (isRecord(data.manual_only)) {
    const rawRule = data.manual_only;
    const manualOnly = {};
    if (Array.isArray(rawRule.platforms)) {
      const platforms = rawRule.platforms.filter(
        (item) => typeof item === "string" && item.length > 0
      );
      if (platforms.length > 0) manualOnly.platforms = platforms;
    }
    if (typeof rawRule.min_version_inclusive === "string") {
      manualOnly.min_version_inclusive = rawRule.min_version_inclusive;
    }
    if (typeof rawRule.max_version_exclusive === "string") {
      manualOnly.max_version_exclusive = rawRule.max_version_exclusive;
    }
    if (isRecord(rawRule.reason)) {
      const reason = rawRule.reason;
      if (typeof reason.zh === "string" && typeof reason.en === "string") {
        manualOnly.reason = { zh: reason.zh, en: reason.en };
      }
    }
    policy.manual_only = manualOnly;
  }
  if (typeof data.updated_at === "string") {
    policy.updated_at = data.updated_at;
  }
  return policy;
}
function cachePath(userDataPath) {
  return path__default.join(userDataPath, UPDATE_POLICY_CACHE_FILE);
}
function createCacheMetadata(platform) {
  return {
    region: releaseRegion,
    channel: releaseChannel,
    platform: platform ?? process.platform
  };
}
function isCacheMetadata(data) {
  return isRecord(data) && typeof data.region === "string" && typeof data.channel === "string" && typeof data.platform === "string";
}
function cacheMetadataMatches(actual, expected) {
  return actual.region === expected.region && actual.channel === expected.channel && actual.platform === expected.platform;
}
function formatCacheMetadata(metadata) {
  return `${metadata.region}/${metadata.channel}/${metadata.platform}`;
}
async function readCache(userDataPath, now, expectedMetadata) {
  try {
    const raw = await promises.readFile(cachePath(userDataPath), "utf8");
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (typeof parsed.cachedAt !== "number") return null;
    if (!isCacheMetadata(parsed.metadata)) {
      log.warn("Update policy cache ignored because metadata is missing or invalid");
      return null;
    }
    if (!cacheMetadataMatches(parsed.metadata, expectedMetadata)) {
      log.warn(
        `Update policy cache ignored due to scope mismatch (cached=${formatCacheMetadata(
          parsed.metadata
        )}, expected=${formatCacheMetadata(expectedMetadata)})`
      );
      return null;
    }
    const policy = parseCdnPolicy(parsed.policy);
    if (!policy) return null;
    const ageMs = now - parsed.cachedAt;
    const stale = ageMs > CACHE_TTL_MS;
    if (stale) {
      log.warn(
        `Update policy cache expired (age=${Math.round(ageMs / 36e5)}h), retaining as LKG fallback`
      );
    }
    return { policy, cachedAt: parsed.cachedAt, stale, ageMs };
  } catch {
    return null;
  }
}
async function writeCache(userDataPath, policy, cachedAt, metadata) {
  try {
    await promises.mkdir(userDataPath, { recursive: true });
    await promises.writeFile(
      cachePath(userDataPath),
      JSON.stringify({ policy, cachedAt, metadata }),
      "utf8"
    );
  } catch (err) {
    log.warn(`Failed to write update policy cache: ${err}`);
  }
}
function retryDelayMs(attempt) {
  return Math.min(
    UPDATE_POLICY_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
    UPDATE_POLICY_RETRY_MAX_DELAY_MS
  );
}
async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
function errorMessage(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
function errorName(error) {
  if (error instanceof Error) return error.name;
  if (isRecord(error) && typeof error.name === "string") return error.name;
  return null;
}
function isTimeoutFailure(error, message) {
  const name = errorName(error);
  const normalizedMessage = message.toLowerCase();
  return name === "TimeoutError" || name === "AbortError" || normalizedMessage.includes("timed out") || normalizedMessage.includes("timeout") || message.includes("ETIMEDOUT") || message.includes("ERR_TIMED_OUT");
}
function isNetworkFailure(message) {
  const normalizedMessage = message.toLowerCase();
  return normalizedMessage.includes("network") || normalizedMessage.includes("fetch failed") || message.includes("ENOTFOUND") || message.includes("EAI_AGAIN") || message.includes("ECONNRESET") || message.includes("ECONNREFUSED") || message.includes("ERR_CONNECTION") || message.includes("ERR_NETWORK") || message.includes("ERR_INTERNET_DISCONNECTED");
}
function normalizeFetchError(error) {
  if (error instanceof UpdatePolicyFetchError) return error;
  const message = errorMessage(error);
  const networkFailureKind = classifyNetworkDiagnosticsError(error);
  if (isTimeoutFailure(error, message) || networkFailureKind === "timeout") {
    return new UpdatePolicyFetchError("timeout", message, true);
  }
  if (networkFailureKind === "dns" || networkFailureKind === "offline" || networkFailureKind === "network_changed") {
    return new UpdatePolicyFetchError(networkFailureKind, message, true);
  }
  if (errorName(error) === "SyntaxError") {
    return new UpdatePolicyFetchError("invalid_schema", message, false);
  }
  if (isNetworkFailure(message)) {
    return new UpdatePolicyFetchError("network", message, true);
  }
  return new UpdatePolicyFetchError("unknown", message, true);
}
async function fetchCdnPolicy(fetchImpl) {
  const url = buildReleaseCdnUrl("update-policy.json");
  log.info(`Fetching update policy: ${url}`);
  const response = await fetchImpl(url, {
    cache: "no-cache",
    signal: AbortSignal.timeout(UPDATE_POLICY_TIMEOUT_MS)
  });
  if (!response.ok) {
    const retryable = response.status >= HTTP_SERVER_ERROR_MIN_STATUS;
    throw new UpdatePolicyFetchError(
      retryable ? "http_5xx" : "http_4xx",
      `HTTP ${response.status} ${response.statusText}`,
      retryable
    );
  }
  const policy = parseCdnPolicy(await response.json());
  if (!policy) {
    throw new UpdatePolicyFetchError("invalid_schema", "Invalid update-policy.json schema", false);
  }
  return policy;
}
async function fetchCdnPolicyWithRetry(fetchImpl) {
  let lastError = null;
  for (let attempt = 1; attempt <= UPDATE_POLICY_FETCH_MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchCdnPolicy(fetchImpl);
    } catch (err) {
      const error = normalizeFetchError(err);
      lastError = error;
      if (!error.retryable || attempt >= UPDATE_POLICY_FETCH_MAX_ATTEMPTS) {
        throw error;
      }
      const delay = retryDelayMs(attempt);
      log.warn(
        `Update policy fetch attempt ${attempt}/${UPDATE_POLICY_FETCH_MAX_ATTEMPTS} failed (reason=${error.reason}); retrying in ${delay}ms: ${error.message}`
      );
      await sleep(delay);
    }
  }
  throw lastError ?? new UpdatePolicyFetchError("unknown", "Update policy fetch failed without an error", false);
}
function toResolution(currentVersion, policy, source, checkedAt, platform, metadata) {
  const locale = RELEASE.locale;
  const decision = resolveUpdatePolicy(currentVersion, policy, locale, { platform });
  return {
    status: "ready",
    source,
    forced: decision.forced,
    targetVersion: decision.targetVersion,
    requiredReason: decision.requiredReason,
    manualDownloadUrl: decision.manualDownloadUrl,
    manualOnly: decision.manualOnly,
    manualRecoveryReason: decision.manualRecoveryReason,
    checkedAt,
    policySource: source,
    ...metadata?.cacheAgeMs !== void 0 ? { policyCacheAgeMs: metadata.cacheAgeMs } : {},
    ...metadata?.fallbackReason ? { policyFallbackReason: metadata.fallbackReason } : {}
  };
}
async function resolveStartupUpdatePolicy(options) {
  const checkedAt = options.now?.() ?? Date.now();
  const fetchImpl = options.fetchImpl ?? ((url, init) => net.fetch(url, init));
  const cacheMetadata = createCacheMetadata(options.platform);
  const cached = await readCache(options.userDataPath, checkedAt, cacheMetadata);
  if (options.preferCache && cached && !cached.stale) {
    log.info("Using cached update policy for bootstrap (CDN refresh deferred to background)");
    return toResolution(
      options.currentVersion,
      cached.policy,
      "cache",
      checkedAt,
      options.platform,
      { cacheAgeMs: cached.ageMs }
    );
  }
  try {
    const policy = await fetchCdnPolicyWithRetry(fetchImpl);
    await writeCache(options.userDataPath, policy, checkedAt, cacheMetadata);
    return toResolution(options.currentVersion, policy, "cdn", checkedAt, options.platform);
  } catch (err) {
    const failure = normalizeFetchError(err);
    log.warn(
      `CDN update policy unavailable after ${UPDATE_POLICY_FETCH_MAX_ATTEMPTS} attempt(s) (reason=${failure.reason}): ${failure.message}`
    );
    if (cached) {
      if (cached.stale) {
        log.warn(
          `Using stale cache fallback for update policy (age=${Math.round(
            cached.ageMs / 36e5
          )}h, reason=${failure.reason})`
        );
      } else {
        log.warn(`Using cached update policy fallback (reason=${failure.reason})`);
      }
      return toResolution(
        options.currentVersion,
        cached.policy,
        "cache",
        checkedAt,
        options.platform,
        { cacheAgeMs: cached.ageMs, fallbackReason: failure.reason }
      );
    }
    return {
      status: "failed",
      source: "none",
      policySource: "none",
      policyFallbackReason: failure.reason,
      forced: false,
      targetVersion: null,
      requiredReason: null,
      manualDownloadUrl: null,
      manualOnly: false,
      manualRecoveryReason: null,
      checkedAt
    };
  }
}
export {
  UPDATE_POLICY_TIMEOUT_MS,
  resolveStartupUpdatePolicy
};
