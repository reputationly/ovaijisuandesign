import { bY as stripProviderSecrets, bZ as fetchRemoteProviderConfigResult } from "./python-runtime-ZdSS6sqy.js";
import "node:child_process";
import "node:fs";
import "node:path";
import "./safe-spawn-path-DD3xknOt.js";
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
function hasUsableProviders(config) {
  if (!config) return false;
  const enabled = config.enabled_providers;
  if (Array.isArray(enabled) && enabled.length > 0) return true;
  const provider = config.provider;
  return provider != null && typeof provider === "object" && !Array.isArray(provider) && Object.keys(provider).length > 0;
}
function saveLkgProviderConfig(storage, config, log) {
  if (!hasUsableProviders(config)) {
    log.warn("[provider-lkg] Skipping LKG write: config has no usable providers");
    return;
  }
  try {
    const stripped = stripProviderSecrets(config);
    storage.set("lkgProviderConfig", JSON.stringify(stripped));
    log.info(
      `[provider-lkg] Saved LKG provider config (providers=${Object.keys(stripped.provider ?? {}).join(",") || "(enabled_providers only)"})`
    );
  } catch (err) {
    log.warn(`[provider-lkg] Failed to save LKG provider config: ${err}`);
  }
}
function loadLkgProviderConfig(storage, log) {
  let raw;
  try {
    raw = storage.get("lkgProviderConfig");
  } catch (err) {
    log.warn(`[provider-lkg] Failed to read LKG provider config: ${err}`);
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      log.warn("[provider-lkg] LKG provider config is not an object — ignoring");
      return null;
    }
    const config = stripProviderSecrets(parsed);
    if (!hasUsableProviders(config)) {
      log.warn("[provider-lkg] LKG provider config has no usable providers — ignoring");
      return null;
    }
    return config;
  } catch (err) {
    log.warn(`[provider-lkg] LKG provider config is corrupt — ignoring: ${err}`);
    return null;
  }
}
function providerReadinessLkgEnabled() {
  return process.env.HILO_PROVIDER_READINESS_LKG !== "false";
}
const PROVIDER_CONFIG_RETRY_SCHEDULE_MS = [
  5e3,
  15e3,
  6e4,
  5 * 6e4,
  15 * 6e4
];
function createProviderConfigController(options) {
  const { cloudGatewayUrl, storage, getToken, log } = options;
  const fetchResult = options.fetchResult ?? fetchRemoteProviderConfigResult;
  const setTimeoutFn = options.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;
  const enabled = providerReadinessLkgEnabled();
  const fetchLog = { info: (m) => log.info(m), warn: (m) => log.warn(m) };
  const fetchForToken = (token) => options.getAdAttribution ? fetchResult(cloudGatewayUrl, token, fetchLog, {
    getAdAttribution: options.getAdAttribution
  }) : fetchResult(cloudGatewayUrl, token, fetchLog);
  let remoteConfig = null;
  let chatReadiness = "ready";
  let onRecovered = null;
  let retryTimer = null;
  let retryCount = 0;
  let disposed = false;
  function clearRetry() {
    if (retryTimer) {
      clearTimeoutFn(retryTimer);
      retryTimer = null;
    }
  }
  function adoptFreshConfig(config, source) {
    remoteConfig = config;
    chatReadiness = "ready";
    retryCount = 0;
    clearRetry();
    if (enabled) saveLkgProviderConfig(storage, config, log);
    log.info(`[provider-readiness] Remote provider config adopted (source=${source})`);
  }
  function scheduleRetry() {
    if (!enabled || disposed || retryTimer) return;
    if (retryCount >= PROVIDER_CONFIG_RETRY_SCHEDULE_MS.length) {
      log.warn("[provider-readiness] Boot retry budget exhausted; awaiting token change/restart");
      return;
    }
    const delay = PROVIDER_CONFIG_RETRY_SCHEDULE_MS[retryCount];
    retryCount++;
    log.info(`[provider-readiness] Scheduling provider config retry #${retryCount} in ${delay}ms`);
    retryTimer = setTimeoutFn(() => {
      retryTimer = null;
      void runRetry();
    }, delay);
    retryTimer.unref?.();
  }
  async function runRetry() {
    if (disposed) return;
    const token = getToken();
    if (!token) return;
    try {
      const result = await fetchForToken(token);
      if (result.outcome === "ok" && hasUsableProviders(result.config)) {
        const hadUsableConfig = hasUsableProviders(remoteConfig);
        adoptFreshConfig(result.config, "retry");
        if (!hadUsableConfig) {
          log.info("[provider-readiness] Providers recovered — requesting OpenCode restart");
        }
        onRecovered?.();
        return;
      }
      if (result.outcome === "auth_failed") {
        log.warn("[provider-readiness] Retry hit auth_failed (401/403) — stopping retries");
        clearRetry();
        return;
      }
      scheduleRetry();
    } catch (err) {
      log.warn(`[provider-readiness] Provider config retry failed: ${err}`);
      scheduleRetry();
    }
  }
  async function resolveWithFallback(token, phase) {
    let result;
    try {
      result = await fetchForToken(token);
    } catch (err) {
      log.warn(`[provider-readiness] Provider config fetch threw: ${err}`);
      result = { outcome: "fetch_failed", config: null };
    }
    if (result.outcome === "ok" && hasUsableProviders(result.config)) {
      adoptFreshConfig(result.config, phase === "boot" ? "boot" : "token-change");
      return;
    }
    if (result.outcome === "auth_failed") {
      log.error(
        "[provider-readiness] Remote provider config rejected the token (401/403) — OpenCode will have no LLM providers until re-login"
      );
      remoteConfig = null;
      chatReadiness = "ready";
      clearRetry();
      return;
    }
    if (phase === "token-change" && hasUsableProviders(remoteConfig)) {
      log.warn(
        "[provider-readiness] Provider config refresh failed — keeping previous in-memory config"
      );
      scheduleRetry();
      return;
    }
    const lkg = enabled ? loadLkgProviderConfig(storage, log) : null;
    if (lkg) {
      remoteConfig = lkg;
      chatReadiness = "ready";
      log.warn(
        "[provider-readiness] Provider config fetch failed — booting on last-known-good config (live token re-injected at runtime); background refresh scheduled"
      );
    } else {
      remoteConfig = null;
      chatReadiness = enabled ? "providers_unavailable" : "ready";
      log.error(
        `[provider-readiness] Provider config fetch failed and no LKG available — chat readiness=${chatReadiness}`
      );
    }
    scheduleRetry();
  }
  return {
    getRemoteConfig: () => remoteConfig,
    getChatReadiness: () => chatReadiness,
    async resolveAtBoot(userToken) {
      if (!userToken) {
        log.info(
          "[config] No user token, skipping remote provider config (will fetch after login)"
        );
        return;
      }
      await resolveWithFallback(userToken, "boot");
    },
    async refreshForToken(token) {
      if (!token) {
        remoteConfig = null;
        chatReadiness = "ready";
        retryCount = 0;
        clearRetry();
        return;
      }
      retryCount = 0;
      await resolveWithFallback(token, "token-change");
    },
    setOnRecovered(fn) {
      onRecovered = fn;
    },
    dispose() {
      disposed = true;
      clearRetry();
    }
  };
}
export {
  PROVIDER_CONFIG_RETRY_SCHEDULE_MS,
  createProviderConfigController,
  providerReadinessLkgEnabled
};
