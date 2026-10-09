// use-ensure-skill-ready.js
import {
  reactExports,
  useTranslation,
  dedupedToast,
  useQuery,
  gatewayFetch,
  API_PATHS,
  useRuntimeConfig,
  HOME_QUICK_START_SCHEMA_VERSION,
  isRecord$5,
  meetsMinClientVersion,
  nonEmptyString,
  parsePromptSection,
  parseFeaturePopupSection,
  parseProjectArchiveSection,
  HOME_QUICK_START_MAX_SECTIONS,
  HOME_QUICK_START_MAX_TOTAL_QUERIES,
  parseShowcaseConfig,
  boundedRegion,
  boundedChannel,
  TRACK_EVENTS,
  workspaceLog,
  homeQuickStartLkgKey,
  pruneOtherHomeQuickStartLkgEntries,
  utf8ByteLength,
  HOME_QUICK_START_CONFIG_MAX_BYTES,
  removeHomeQuickStartLkg,
  gatewayHttpStatus,
  readBoundedConfigJson,
  InvalidHomeQuickStartPayloadError,
  isRawPayloadWithinLimit,
  HOME_QUICK_START_STALE_TIME_MS,
  beginSkillApplyingToast,
} from "../vendor.js";
import { homeService } from "../m08/browser-inspiration-urls.jsx";
import { useGatewayReady } from "../m10/hub-logo.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { showSkillInstallSuccessToast } from "../m10/use-new-workspace-dialog.jsx";
import { DEFAULT_HOME_QUICK_START_CONFIG, parseSkillSection } from "./mode-selector.jsx";
import { shuffle } from "./yt.jsx";
function parseSection(value) {
  if (!isRecord$5(value)) return void 0;
  if (!meetsMinClientVersion(value.min_client_version)) return void 0;
  const type2 = nonEmptyString(value.type);
  if (type2 === "prompt") return parsePromptSection(value);
  if (type2 === "skill") return parseSkillSection(value);
  if (type2 === "feature-popup") return parseFeaturePopupSection(value);
  if (type2 === "project-archive") return parseProjectArchiveSection(value);
  return void 0;
}
function parseHomeQuickStartConfig(rawConfig) {
  if (!isRecord$5(rawConfig)) return null;
  if (rawConfig.schema_version !== HOME_QUICK_START_SCHEMA_VERSION) return null;
  if (typeof rawConfig.enabled !== "boolean") return null;
  if (!Array.isArray(rawConfig.sections)) return null;
  if (!rawConfig.enabled) {
    return {
      schemaVersion: HOME_QUICK_START_SCHEMA_VERSION,
      categories: [],
    };
  }
  const parsedCategories = rawConfig.sections
    .slice(0, HOME_QUICK_START_MAX_SECTIONS)
    .flatMap((section) => {
      const parsed = parseSection(section);
      return parsed ? [parsed] : [];
    });
  const seenCategoryIds = new Set();
  let hasFeaturedCategory = false;
  let remainingQueryBudget = HOME_QUICK_START_MAX_TOTAL_QUERIES;
  const categories = [];
  for (const category of parsedCategories) {
    if (seenCategoryIds.has(category.id)) continue;
    if (category.kind === "featured-skills" && hasFeaturedCategory) continue;
    seenCategoryIds.add(category.id);
    if (category.kind === "featured-skills") hasFeaturedCategory = true;
    if (category.kind !== "scene") {
      categories.push(category);
      continue;
    }
    if (remainingQueryBudget <= 0) continue;
    const queries = category.scene.queries.slice(0, remainingQueryBudget);
    remainingQueryBudget -= queries.length;
    categories.push({
      ...category,
      scene: {
        ...category.scene,
        queries,
      },
    });
  }
  const showcase = parseShowcaseConfig(rawConfig.showcase);
  return {
    schemaVersion: HOME_QUICK_START_SCHEMA_VERSION,
    categories,
    ...(showcase
      ? {
          showcase,
        }
      : {}),
  };
}
function reportConfigResolution(region, channel, phase, outcome, failureKind) {
  const properties2 = {
    phase,
    outcome,
    region: boundedRegion(region),
    channel: boundedChannel(channel),
    schema_version: HOME_QUICK_START_SCHEMA_VERSION,
    ...(failureKind
      ? {
          failure_kind: failureKind,
        }
      : {}),
  };
  try {
    trackEvent(TRACK_EVENTS.HOME_QUICK_START_CONFIG_RESOLUTION, properties2);
  } catch {}
  const message2 = "home: quick-start-config-resolution";
  try {
    if (
      outcome === "corrupt" ||
      outcome === "invalid_config" ||
      outcome === "quota_exceeded" ||
      outcome === "storage_failed" ||
      outcome === "fetch_failed" ||
      outcome === "revalidate_failed"
    ) {
      workspaceLog.warn(message2, properties2);
    } else {
      workspaceLog.info(message2, properties2);
    }
  } catch {}
}
function readHomeQuickStartLkg(region, channel) {
  const lkgKey = homeQuickStartLkgKey(region, channel);
  pruneOtherHomeQuickStartLkgEntries(lkgKey);
  let serialized;
  try {
    serialized = localStorage.getItem(lkgKey);
  } catch {
    reportConfigResolution(region, channel, "lkg_read", "storage_failed", "storage");
    return void 0;
  }
  if (!serialized) {
    reportConfigResolution(region, channel, "lkg_read", "miss");
    return void 0;
  }
  if (utf8ByteLength(serialized) > HOME_QUICK_START_CONFIG_MAX_BYTES) {
    reportConfigResolution(region, channel, "lkg_read", "oversized");
    removeHomeQuickStartLkg(lkgKey);
    return void 0;
  }
  let envelope;
  try {
    envelope = JSON.parse(serialized);
  } catch {
    reportConfigResolution(region, channel, "lkg_read", "corrupt", "storage");
    removeHomeQuickStartLkg(lkgKey);
    return void 0;
  }
  if (
    !envelope ||
    typeof envelope !== "object" ||
    envelope.schemaVersion !== HOME_QUICK_START_SCHEMA_VERSION
  ) {
    reportConfigResolution(region, channel, "lkg_read", "schema_mismatch");
    removeHomeQuickStartLkg(lkgKey);
    return void 0;
  }
  const parsed = parseHomeQuickStartConfig(envelope.raw);
  if (!parsed) {
    reportConfigResolution(region, channel, "lkg_read", "invalid_config", "invalid_payload");
    removeHomeQuickStartLkg(lkgKey);
    return void 0;
  }
  reportConfigResolution(region, channel, "lkg_read", "hit");
  return parsed;
}
function writeHomeQuickStartLkg(region, channel, raw2) {
  let serialized;
  try {
    serialized = JSON.stringify({
      raw: raw2,
      schemaVersion: HOME_QUICK_START_SCHEMA_VERSION,
    });
  } catch {
    reportConfigResolution(region, channel, "lkg_write", "storage_failed", "storage");
    return;
  }
  if (utf8ByteLength(serialized) > HOME_QUICK_START_CONFIG_MAX_BYTES) {
    reportConfigResolution(region, channel, "lkg_write", "oversized");
    return;
  }
  const lkgKey = homeQuickStartLkgKey(region, channel);
  let writeError;
  try {
    localStorage.setItem(lkgKey, serialized);
  } catch (error) {
    writeError = error;
    pruneOtherHomeQuickStartLkgEntries(lkgKey);
    try {
      localStorage.setItem(lkgKey, serialized);
      writeError = void 0;
    } catch (retryError) {
      writeError = retryError;
    }
  }
  if (!writeError) {
    pruneOtherHomeQuickStartLkgEntries(lkgKey);
    reportConfigResolution(region, channel, "lkg_write", "success");
  } else {
    reportConfigResolution(
      region,
      channel,
      "lkg_write",
      writeError instanceof DOMException && writeError.name === "QuotaExceededError"
        ? "quota_exceeded"
        : "storage_failed",
      "storage",
    );
  }
}
const LOADING_HOME_QUICK_START_CONFIG = {
  schemaVersion: DEFAULT_HOME_QUICK_START_CONFIG.schemaVersion,
  categories: [],
};
export function useHomeQuickStartConfig() {
  const gatewayReady = useGatewayReady();
  const { region, channel } = useRuntimeConfig();
  const lkgConfig = reactExports.useMemo(
    () => readHomeQuickStartLkg(region, channel),
    [channel, region],
  );
  const {
    data: data2,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["home-quick-start-config", HOME_QUICK_START_SCHEMA_VERSION, region, channel],
    queryFn: async () => {
      const reportFailure = (failureKind) => {
        reportConfigResolution(
          region,
          channel,
          "remote_fetch",
          lkgConfig ? "revalidate_failed" : "fetch_failed",
          failureKind,
        );
      };
      let response;
      try {
        response = await gatewayFetch(API_PATHS.homeQuickStartConfigV2);
      } catch (error) {
        reportFailure(gatewayHttpStatus(error) ? "http" : "network");
        throw error;
      }
      if (!response.ok) {
        reportFailure("http");
        throw new Error(`home_quick_start_config HTTP ${response.status}`);
      }
      let raw2;
      try {
        raw2 = await readBoundedConfigJson(response);
      } catch (error) {
        reportFailure(
          error instanceof InvalidHomeQuickStartPayloadError ? "invalid_payload" : "network",
        );
        throw error;
      }
      if (!isRawPayloadWithinLimit(raw2)) {
        reportFailure("invalid_payload");
        throw new Error("oversized home_quick_start_config");
      }
      const parsed = parseHomeQuickStartConfig(raw2);
      if (!parsed) {
        reportFailure("invalid_payload");
        throw new Error("invalid home_quick_start_config");
      }
      writeHomeQuickStartLkg(region, channel, raw2);
      reportConfigResolution(region, channel, "remote_fetch", "success");
      return {
        config: parsed,
        origin: "remote",
      };
    },
    initialData: lkgConfig
      ? {
          config: lkgConfig,
          origin: "lkg",
        }
      : void 0,
    initialDataUpdatedAt: lkgConfig ? 0 : void 0,
    enabled: gatewayReady,
    staleTime: HOME_QUICK_START_STALE_TIME_MS,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    retry: 1,
    throwOnError: false,
  });
  let config2;
  let source;
  if (data2) {
    config2 = data2.config;
    source = data2.origin;
  } else if (isError) {
    config2 = DEFAULT_HOME_QUICK_START_CONFIG;
    source = "bundle";
  } else {
    config2 = LOADING_HOME_QUICK_START_CONFIG;
    source = "loading";
  }
  return {
    config: config2,
    source,
    isLoading: gatewayReady && isLoading,
  };
}
function parseInstallResponse(raw2) {
  if (!raw2 || typeof raw2 !== "object")
    return {
      ok: false,
    };
  const response = raw2;
  return {
    ok: response.ok === true,
    error: typeof response.error === "string" ? response.error : void 0,
  };
}
function parseLocalSkills(raw2) {
  if (!Array.isArray(raw2)) return [];
  return raw2.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const skill = item;
    if (typeof skill.name !== "string" || typeof skill.enabled !== "boolean") return [];
    return [
      {
        name: skill.name,
        enabled: skill.enabled,
      },
    ];
  });
}
export function useEnsureSkillReady({ preload: preload2 = false } = {}) {
  const { t: t2 } = useTranslation();
  const gatewayReady = useGatewayReady();
  const [localSkills, setLocalSkills] = reactExports.useState([]);
  const localSkillsRef = reactExports.useRef([]);
  const skillsLoadedRef = reactExports.useRef(false);
  const fetchSequenceRef = reactExports.useRef(0);
  reactExports.useEffect(() => {
    localSkillsRef.current = localSkills;
  }, [localSkills]);
  const fetchLocalSkills = reactExports.useCallback(async () => {
    const sequence = ++fetchSequenceRef.current;
    try {
      const response = await gatewayFetch("/api/skills");
      const skills = response.ok ? parseLocalSkills(await response.json()) : [];
      if (sequence !== fetchSequenceRef.current) return;
      skillsLoadedRef.current = true;
      localSkillsRef.current = skills;
      setLocalSkills(skills);
    } catch {}
  }, []);
  reactExports.useEffect(() => {
    if (!preload2 || !gatewayReady) return;
    void fetchLocalSkills();
  }, [fetchLocalSkills, gatewayReady, preload2]);
  reactExports.useEffect(() => {
    if (!window.hilo?.skills) return;
    return window.hilo.skills.onPermissionsChanged(() => {
      void fetchLocalSkills();
    });
  }, [fetchLocalSkills]);
  const markReady = reactExports.useCallback((skillName) => {
    const next2 = localSkillsRef.current.some((skill) => skill.name === skillName)
      ? localSkillsRef.current.map((skill) =>
          skill.name === skillName
            ? {
                ...skill,
                enabled: true,
              }
            : skill,
        )
      : [
          ...localSkillsRef.current,
          {
            name: skillName,
            enabled: true,
          },
        ];
    localSkillsRef.current = next2;
    skillsLoadedRef.current = true;
    setLocalSkills(next2);
  }, []);
  const ensureSkillReady = reactExports.useCallback(
    async (skillName, onProgress) => {
      const reportProgress = (progress) => {
        onProgress?.(Math.min(1, Math.max(0, progress)));
      };
      if (!skillsLoadedRef.current) await fetchLocalSkills();
      const localSkill = localSkillsRef.current.find((skill) => skill.name === skillName);
      if (!localSkill) {
        reportProgress(0.12);
        const toastId = onProgress ? void 0 : dedupedToast.loading(t2("skills.market.installing"));
        try {
          const response = await gatewayFetch(API_PATHS.marketInstall, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: skillName,
            }),
          });
          const installResult = parseInstallResponse(await response.json());
          if (!installResult.ok) {
            dedupedToast.error(
              t2("skills.market.installError", {
                name: skillName,
              }),
              toastId !== void 0
                ? {
                    id: toastId,
                  }
                : void 0,
            );
            return false;
          }
          reportProgress(0.72);
          await homeService.hiloApp.toggleSkill(skillName, true);
          reportProgress(0.84);
          await window.hilo.opencode.restart();
          reportProgress(1);
          markReady(skillName);
          showSkillInstallSuccessToast(
            skillName,
            toastId !== void 0
              ? {
                  id: toastId,
                }
              : void 0,
          );
          return true;
        } catch {
          dedupedToast.error(
            t2("skills.market.installError", {
              name: skillName,
            }),
            toastId !== void 0
              ? {
                  id: toastId,
                }
              : void 0,
          );
          return false;
        }
      }
      if (!localSkill.enabled) {
        reportProgress(0.28);
        const applyingToast = onProgress ? void 0 : beginSkillApplyingToast(t2("skills.applying"));
        try {
          await homeService.hiloApp.toggleSkill(localSkill.name, true);
          reportProgress(0.82);
          await window.hilo.opencode.restart();
          reportProgress(1);
          markReady(localSkill.name);
          if (applyingToast) {
            applyingToast.success(t2("skills.restartSuccess"));
          } else {
            dedupedToast.success(t2("skills.restartSuccess"));
          }
        } catch {
          if (applyingToast) {
            applyingToast.error(t2("skills.toggleError"));
          } else {
            dedupedToast.error(t2("skills.toggleError"));
          }
          return false;
        }
      }
      reportProgress(1);
      return true;
    },
    [fetchLocalSkills, markReady, t2],
  );
  return {
    ensureSkillReady,
    refreshLocalSkills: fetchLocalSkills,
  };
}
const EMPTY_CHAT_RECOMMENDATION_BATCH_SIZE = 4;
export function pickRecommendationBatch(items, previousIds = [], random = Math.random) {
  const seen2 = new Set();
  const unique2 = items.filter((item) => {
    if (seen2.has(item.id)) return false;
    seen2.add(item.id);
    return true;
  });
  const previous2 = new Set(previousIds);
  const preferred = unique2.filter((item) => !previous2.has(item.id));
  const fallback = unique2.filter((item) => previous2.has(item.id));
  const pool = [...shuffle(preferred, random), ...shuffle(fallback, random)];
  return pool.slice(0, EMPTY_CHAT_RECOMMENDATION_BATCH_SIZE);
}
