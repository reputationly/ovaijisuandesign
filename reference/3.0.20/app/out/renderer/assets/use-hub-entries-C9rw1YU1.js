import { u as useGatewayReady, g as useRuntimeConfig, h as useTranslation, k as useQuery, l as gatewayFetch, m as API_PATHS, t as trackEvent, T as TRACK_EVENTS, p as projectLog } from "./index-CANVzzmD.js";
const EMPTY_HUB_ENTRIES = {};
const HUB_ENTRIES_REFRESH_INTERVAL_MS = 6e4;
const HUB_ENTRIES_MAX_BYTES = 128 * 1024;
const HUB_ENTRIES_MAX_COUNT = 32;
const HUB_ENTRY_TITLE_MAX_LENGTH = 128;
const textEncoder = new TextEncoder();
const HUB_ENTRY_IDS = {
  /** 项目库「查看教程」按钮。 */
  projectTutorial: "project_tutorial",
  /** ComfyUI 工作流页「探索本地版」按钮。 */
  workflowTutorial: "workflow_tutorial"
};
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const MAX_UNWRAP_DEPTH = 4;
class HubEntriesParseError extends Error {
  constructor(failureKind, message) {
    super(message);
    this.failureKind = failureKind;
    this.name = "HubEntriesParseError";
  }
}
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
function reportHubEntryLoadFailure({
  phase,
  failureKind,
  region,
  channel,
  entryId,
  httpStatus,
  durationMs
}) {
  const properties = {
    phase,
    outcome: "failed",
    failure_kind: failureKind,
    region: boundedRegion(region),
    channel: boundedChannel(channel),
    ...entryId ? { entry_id: entryId } : {},
    ...httpStatus === void 0 ? {} : { http_status: httpStatus },
    ...durationMs === void 0 ? {} : { duration_ms: Math.max(0, Math.round(durationMs)) }
  };
  try {
    trackEvent(TRACK_EVENTS.HUB_ENTRY_LOAD_RESULT, properties);
  } catch {
  }
  try {
    projectLog.warn("hub-entry-load-result", properties);
  } catch {
  }
}
function unwrapApolloValue(raw) {
  let current = raw;
  for (let depth = 0; depth < MAX_UNWRAP_DEPTH; depth += 1) {
    if (typeof current === "string") {
      try {
        current = JSON.parse(current);
        continue;
      } catch {
        return null;
      }
    }
    if (!isRecord(current)) break;
    if ("hub_entries" in current) {
      current = current.hub_entries;
      continue;
    }
    if ("data" in current && (isRecord(current.data) || typeof current.data === "string")) {
      current = current.data;
      continue;
    }
    if ("value" in current && (isRecord(current.value) || typeof current.value === "string")) {
      current = current.value;
      continue;
    }
    break;
  }
  return current;
}
function pickLocalizedText(value, locale) {
  const truncate = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return void 0;
    return Array.from(trimmed).slice(0, HUB_ENTRY_TITLE_MAX_LENGTH).join("");
  };
  if (typeof value === "string") return truncate(value);
  if (!isRecord(value)) return void 0;
  const primary = value[locale];
  const fallback = value[locale === "zh" ? "en" : "zh"];
  if (typeof primary === "string" && primary.trim()) return truncate(primary);
  if (typeof fallback === "string" && fallback.trim()) return truncate(fallback);
  return void 0;
}
function pickWebUrl(value, httpsOnly = false) {
  if (typeof value !== "string") return void 0;
  try {
    const parsed = new URL(value.trim());
    const validProtocol = httpsOnly ? parsed.protocol === "https:" : parsed.protocol === "http:" || parsed.protocol === "https:";
    if (!validProtocol || parsed.username || parsed.password) return void 0;
    return parsed.toString();
  } catch {
    return void 0;
  }
}
function parseHubEntries(raw, locale) {
  const unwrapped = unwrapApolloValue(raw);
  if (!isRecord(unwrapped)) {
    throw new HubEntriesParseError("invalid_payload", "hub_entries root must be an object");
  }
  const rawEntries = Object.entries(unwrapped);
  if (rawEntries.length > HUB_ENTRIES_MAX_COUNT) {
    throw new HubEntriesParseError("entry_limit", "hub_entries entry limit exceeded");
  }
  const entries = {};
  for (const [id, value] of rawEntries) {
    if (!isRecord(value)) continue;
    entries[id] = {
      visible: value.visible !== false,
      title: pickLocalizedText(value.title, locale),
      url: pickWebUrl(value.url),
      imageUrl: pickWebUrl(value.image_url, true)
    };
  }
  return entries;
}
async function readBoundedHubEntriesJson(response) {
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declaredBytes) && declaredBytes > HUB_ENTRIES_MAX_BYTES) {
      throw new HubEntriesParseError("oversized", "hub_entries payload exceeds byte limit");
    }
  }
  const reader = response.body?.getReader();
  let serialized;
  if (!reader) {
    serialized = await response.text();
    if (textEncoder.encode(serialized).byteLength > HUB_ENTRIES_MAX_BYTES) {
      throw new HubEntriesParseError("oversized", "hub_entries payload exceeds byte limit");
    }
  } else {
    const decoder = new TextDecoder();
    let receivedBytes = 0;
    serialized = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedBytes += value.byteLength;
        if (receivedBytes > HUB_ENTRIES_MAX_BYTES) {
          await reader.cancel();
          throw new HubEntriesParseError("oversized", "hub_entries payload exceeds byte limit");
        }
        serialized += decoder.decode(value, { stream: true });
      }
      serialized += decoder.decode();
    } finally {
      reader.releaseLock();
    }
  }
  try {
    return JSON.parse(serialized);
  } catch {
    throw new HubEntriesParseError("invalid_json", "hub_entries payload is not valid JSON");
  }
}
function useHubEntries() {
  const gatewayReady = useGatewayReady();
  const { region, channel } = useRuntimeConfig();
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("zh") ? "zh" : "en";
  const { data } = useQuery({
    queryKey: ["hub-entries", region, channel, locale],
    queryFn: async () => {
      const startedAt = performance.now();
      let response;
      try {
        response = await gatewayFetch(API_PATHS.apolloConfig("hub_entries"));
      } catch (error) {
        reportHubEntryLoadFailure({
          phase: "fetch",
          failureKind: "network",
          region,
          channel,
          durationMs: performance.now() - startedAt
        });
        throw error;
      }
      if (!response.ok) {
        reportHubEntryLoadFailure({
          phase: "fetch",
          failureKind: "http",
          region,
          channel,
          httpStatus: response.status,
          durationMs: performance.now() - startedAt
        });
        throw new Error(`hub_entries HTTP ${response.status}`);
      }
      try {
        const raw = await readBoundedHubEntriesJson(response);
        return parseHubEntries(raw, locale);
      } catch (error) {
        reportHubEntryLoadFailure({
          phase: "parse",
          failureKind: error instanceof HubEntriesParseError ? error.failureKind : "invalid_payload",
          region,
          channel,
          durationMs: performance.now() - startedAt
        });
        throw error;
      }
    },
    enabled: gatewayReady,
    staleTime: HUB_ENTRIES_REFRESH_INTERVAL_MS,
    refetchInterval: HUB_ENTRIES_REFRESH_INTERVAL_MS,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    retry: false,
    throwOnError: false
  });
  return data ?? EMPTY_HUB_ENTRIES;
}
export {
  HUB_ENTRY_IDS as H,
  useHubEntries as u
};
