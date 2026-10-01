import { execFileSync, spawn, execFile, spawnSync } from "node:child_process";
import * as fs$1 from "node:fs";
import fs__default, { rmSync, readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import path__default, { resolve, win32, posix, basename, join } from "node:path";
import { q as normalizeAdAttribution, y as yaml, O as OPENCODE_RUNTIME_HOME_ENV, d as HILO_WORKSPACE_IDENTITY_QUERY, e as HILO_WORKSPACE_INSTANCE_QUERY, f as HILO_WORKSPACE_GENERATION_QUERY, w as workspaceGatewayIdentityHeaders, s as isWorkspaceIdentityErrorCode, t as isAdAttributionApiUrl, C as CLOUD_GATEWAY_URL_PREFIXES, E as ENV_OPENCODE_CONFIG_DIR, j as hasNonAscii, a as workspaceGatewayIdentityEnv, c as HILO_WORKSPACE_IDENTITY_ENV, r as resolveSpawnPath, g as getCloudGatewayUrl, u as trimWindowsEnvBlock, H as HILO_WORKSPACE_IDENTITY_HEADER, v as HILO_WORKSPACE_INSTANCE_ENV, x as HILO_WORKSPACE_GENERATION_ENV, z as openCodeDependencySatisfiedFiles } from "./safe-spawn-path-DD3xknOt.js";
import * as crypto from "node:crypto";
import { randomUUID, timingSafeEqual, randomBytes } from "node:crypto";
import * as net from "node:net";
import * as os$1 from "node:os";
import os__default, { homedir } from "node:os";
import { promisify } from "node:util";
import { rootCertificates } from "node:tls";
import { pathToFileURL } from "node:url";
import { request, createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import Cs, { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import require$$0, { EventEmitter as EventEmitter$1 } from "events";
import fs__default$1 from "fs";
import { EventEmitter } from "node:events";
import { StringDecoder } from "node:string_decoder";
import require$$1, { parse, dirname } from "path";
import zi from "assert";
import { Buffer as Buffer$1 } from "buffer";
import * as zlib from "zlib";
import zlib__default from "zlib";
import assert from "node:assert";
import fsp__default from "node:fs/promises";
const AGENT_PROFILE_OWNED_ENV_KEYS = [
  "HILO_WORKFLOWS_DIR",
  "HILO_KNOWLEDGE_DIR",
  "HILO_CONTRACTS_DIR",
  "HILO_CONTRACTS_STAGING_MARKER",
  "HILO_OPENCODE_CONFIG_DIR",
  "HILO_OPENCODE_SOURCE_DIR",
  "OPENCODE_CONFIG_DIR",
  "OPENCODE_CONFIG",
  "OPENCODE_CONFIG_CONTENT"
];
function filterAgentProfileOwnedEnv(env) {
  const filtered = { ...env ?? {} };
  for (const key of AGENT_PROFILE_OWNED_ENV_KEYS) delete filtered[key];
  return filtered;
}
const HILO_AGENT_RUN_ID_ENV = "HILO_AGENT_RUN_ID";
const HILO_BIZ_ID = "0";
const VERSION_CODE_SEMVER_CORE_PATTERN = /^v?(\d+\.\d+\.\d+)(?:[-+].*)?$/;
function normalizeVersionCodeForCloud(version) {
  const trimmed = version.trim();
  const match = VERSION_CODE_SEMVER_CORE_PATTERN.exec(trimmed);
  return match?.[1] ?? trimmed;
}
const COMFYUI_HOST_PID_ENV = "HILO_COMFYUI_HOST_PID";
const COMFYUI_BACKEND_STATE_FILE = "backend-state.json";
const COMFYUI_BACKEND_OWNER_FILE = "backend-owner.json";
function classifyComfyUiBackend(input) {
  const { state, owner, selfPid, isProcessAlive: isProcessAlive2 } = input;
  const backendPid = typeof state?.pid === "number" && Number.isInteger(state.pid) && state.pid > 0 ? state.pid : null;
  if (backendPid === null) {
    return { ownership: "none", backendPid: null, reason: "no backend pid recorded" };
  }
  if (!isProcessAlive2(backendPid)) {
    return { ownership: "none", backendPid: null, reason: `backend pid ${backendPid} not running` };
  }
  const hostPid = typeof owner?.hostPid === "number" && Number.isInteger(owner.hostPid) && owner.hostPid > 0 ? owner.hostPid : null;
  if (hostPid === null) {
    return {
      ownership: "orphan",
      backendPid,
      reason: `backend pid ${backendPid} has no recorded host`
    };
  }
  if (typeof owner?.backendPid === "number" && owner.backendPid > 0 && owner.backendPid !== backendPid) {
    return {
      ownership: "orphan",
      backendPid,
      reason: `owner record targets pid ${owner.backendPid}, backend is ${backendPid}`
    };
  }
  if (hostPid === selfPid) {
    return { ownership: "ours", backendPid, reason: `owned by this host (pid ${selfPid})` };
  }
  if (isProcessAlive2(hostPid)) {
    return {
      ownership: "foreign-live",
      backendPid,
      reason: `host pid ${hostPid} is still running`
    };
  }
  return {
    ownership: "orphan",
    backendPid,
    reason: `host pid ${hostPid} is gone`
  };
}
function mayReapComfyUiBackend(classification, phase) {
  if (classification.backendPid === null) return false;
  if (classification.ownership === "ours") return true;
  return classification.ownership === "orphan" && phase === "startup";
}
function isCustomModelProvider(id) {
  return /^user-custom-[a-z0-9-]+$/.test(id ?? "");
}
const GATEWAY_AUTH_BOOTSTRAP_ENV = "HILO_GATEWAY_AUTH_BOOTSTRAP";
const GATEWAY_AUTH_BOOTSTRAP_REQUEST = "hilo:gateway-auth-bootstrap-request";
const GATEWAY_AUTH_BOOTSTRAP_RESPONSE = "hilo:gateway-auth-bootstrap-response";
const MAX_TOKEN_LENGTH = 64 * 1024;
const MAX_ID_LENGTH = 256;
function normalizeGatewayAuthSnapshot(value, region) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value;
  if (record.token !== null && (typeof record.token !== "string" || record.token.length > MAX_TOKEN_LENGTH)) {
    return null;
  }
  const token = record.token || null;
  const userID = token && typeof record.userID === "string" && record.userID.length <= MAX_ID_LENGTH ? record.userID || null : null;
  const groupID = token && typeof record.groupID === "string" && record.groupID.length <= MAX_ID_LENGTH && /^[1-9]\d*$/.test(record.groupID) ? record.groupID : null;
  return {
    token,
    userID,
    groupID,
    adAttribution: token ? normalizeAdAttribution(record.adAttribution, Date.now(), region) : null
  };
}
const BCP47_LOCALE_RE = /^[a-z]{2,3}(?:-(?:[A-Z]{2}|[A-Z][a-z]{3}))?$/;
const MIN_SUPPORTED_MACOS_VERSION = "13.0";
const MIN_SUPPORTED_DARWIN_VERSION = "22.0.0";
const MIN_SUPPORTED_DARWIN_MAJOR = Number.parseInt(MIN_SUPPORTED_DARWIN_VERSION, 10);
const MACOS_VERSION_UNSUPPORTED_DIAGNOSIS_CODE = "macos_version_unsupported";
const MACOS_VERSION_UNSUPPORTED_ERROR_MARKER = `[${MACOS_VERSION_UNSUPPORTED_DIAGNOSIS_CODE}]`;
const OPENCODE_VERSION = "1.18.18";
const DEFAULT_NAME_MAX_CHARS = 12;
const PROJECT_DIR_NAME_MAX_CHARS = 20;
const WINDOWS_RESERVED_BASENAME_PATTERN = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$/i;
function normalizePortableBasename(name) {
  const cleaned = name.trim().replace(/^\.+/, "").trim().replace(/[. ]+$/g, "").trim();
  if (!cleaned || WINDOWS_RESERVED_BASENAME_PATTERN.test(cleaned)) return "";
  return cleaned;
}
function sanitizeFileName(seed, maxChars = DEFAULT_NAME_MAX_CHARS) {
  if (!seed) return "";
  let cleaned = seed.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().replace(/^\.+/, "").trim();
  if (!cleaned) return "";
  const chars = [...cleaned];
  if (chars.length > maxChars) {
    cleaned = chars.slice(0, maxChars).join("").trim();
  }
  return cleaned;
}
function projectFolderName(projectName) {
  return normalizePortableBasename(sanitizeFileName(projectName, PROJECT_DIR_NAME_MAX_CHARS));
}
function normalizeSkillContentLocale(value) {
  return typeof value === "string" && value.toLowerCase().startsWith("en") ? "en-US" : "zh-CN";
}
const SKILL_GUIDE_PROMPT_DEFAULTS = {
  zh: "为我解释一下这个技能的最佳使用方式。",
  en: "Show me the best way to use this skill with a few examples."
};
const SKILL_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
function isValidSkillName(name) {
  return SKILL_NAME_RE.test(name);
}
function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  let doc;
  try {
    doc = yaml.load(match[1]);
  } catch {
    return lenientFallback(match[1]);
  }
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return {};
  const raw = doc;
  const result = {};
  Object.assign(result, normalizeSkillDetailMetadata(raw));
  const stringMap = [
    [["name"], "name"],
    [["summary-en", "summary"], "summary"],
    [["summary-cn", "summary-zh"], "summaryZh"],
    [["creator"], "creator"],
    [["guide-prompt"], "guidePrompt"],
    [["guide-prompt-en"], "guidePromptEn"],
    [["display-name-zh"], "displayNameZh"],
    [["version"], "version"],
    [["hash"], "hash"],
    [["tag-en"], "tagEn"],
    [["tag-cn"], "tagCn"],
    [["desc-en"], "descEn"],
    [["desc-cn"], "descCn"]
  ];
  for (const [keys, dst] of stringMap) {
    for (const k of keys) {
      const s3 = coerceString(raw[k]);
      if (s3 !== void 0) {
        result[dst] = s3;
        break;
      }
    }
  }
  const desc = coerceString(raw.description);
  if (desc !== void 0) result.description = desc;
  const listMap = [
    [["allowed-tools", "tools"], "tools"],
    [["tags"], "tags"],
    [["tags-cn"], "tagsCn"],
    [["trigger-words"], "triggerWords"],
    [["agents"], "agents"]
  ];
  for (const [keys, dst] of listMap) {
    for (const k of keys) {
      const arr = coerceList(raw[k]);
      if (arr !== void 0) {
        result[dst] = arr;
        break;
      }
    }
  }
  const en = reconcileTag(raw["tag-en"], raw["complete-tags-en"]);
  if (en.single) result.tagEn = en.single;
  if (en.list.length > 0) result.completeTagsEn = en.list;
  const cn2 = reconcileTag(raw["tag-cn"], raw["complete-tags-cn"]);
  if (cn2.single) result.tagCn = cn2.single;
  if (cn2.list.length > 0) result.completeTagsCn = cn2.list;
  if (typeof raw.priority === "number" && Number.isFinite(raw.priority)) {
    result.priority = raw.priority;
  } else if (typeof raw.priority === "string") {
    const n = Number.parseInt(raw.priority, 10);
    if (Number.isFinite(n)) result.priority = n;
  }
  const injectMode = coerceString(raw["inject-mode"]);
  if (injectMode === "append" || injectMode === "prepend") {
    result.injectMode = injectMode;
  }
  const AGENT_KEY_RE = /^allowed-tools-([a-zA-Z][a-zA-Z0-9_-]*)$/;
  const byAgent = {};
  for (const [key, value] of Object.entries(raw)) {
    const m2 = AGENT_KEY_RE.exec(key);
    if (!m2) continue;
    const tools = coerceList(value);
    if (tools && tools.length > 0) byAgent[m2[1]] = tools;
  }
  if (Object.keys(byAgent).length > 0) result.toolsByAgent = byAgent;
  return result;
}
function coerceString(v) {
  if (v == null) return void 0;
  if (typeof v === "string") {
    const s3 = v.trim();
    return s3 ? s3 : void 0;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return void 0;
}
function coerceList(v) {
  if (v == null) return void 0;
  if (Array.isArray(v)) {
    const arr = v.map((item) => item == null ? "" : String(item)).map((s3) => s3.trim()).filter(Boolean);
    return arr.length > 0 ? arr : void 0;
  }
  if (typeof v === "string") {
    const s3 = v.trim();
    if (!s3) return void 0;
    const arr = s3.split(/[\s,]+/).filter(Boolean);
    return arr.length > 0 ? arr : void 0;
  }
  return void 0;
}
function lenientFallback(yamlText) {
  const stringMap = [
    [["name"], "name"],
    [["summary-en", "summary"], "summary"],
    [["summary-cn", "summary-zh"], "summaryZh"],
    [["creator"], "creator"],
    [["display-name-zh"], "displayNameZh"],
    [["version"], "version"],
    [["hash"], "hash"],
    [["tag-en"], "tagEn"],
    [["tag-cn"], "tagCn"]
  ];
  const result = {};
  for (const [keys, dst] of stringMap) {
    for (const k of keys) {
      const v = lenientStringField(yamlText, k);
      if (v !== void 0) {
        result[dst] = v;
        break;
      }
    }
  }
  return result;
}
function lenientStringField(yamlText, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re2 = new RegExp(`^${escaped}:\\s*(.*?)\\s*$`, "m");
  const m2 = re2.exec(yamlText);
  if (!m2) return void 0;
  const raw = m2[1];
  if (!raw) return void 0;
  const s3 = raw.trim();
  if (s3.length >= 2 && (s3.startsWith('"') && s3.endsWith('"') || s3.startsWith("'") && s3.endsWith("'"))) {
    return s3.slice(1, -1) || void 0;
  }
  return s3 || void 0;
}
function matchesPattern(skillName, pattern) {
  if (pattern === "*") return true;
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    return skillName.startsWith(prefix);
  }
  return skillName === pattern;
}
function isSkillEnabled(skillName, permissions) {
  if (skillName in permissions) {
    return permissions[skillName] === "allow";
  }
  let bestMatch = null;
  let bestLen = 0;
  for (const pattern of Object.keys(permissions)) {
    if (pattern === "*" || pattern === skillName) continue;
    if (matchesPattern(skillName, pattern) && pattern.length > bestLen) {
      bestMatch = pattern;
      bestLen = pattern.length;
    }
  }
  if (bestMatch) {
    return permissions[bestMatch] === "allow";
  }
  if ("*" in permissions) {
    return permissions["*"] === "allow";
  }
  return false;
}
function normalizeToolsByAgent(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return void 0;
  const out = {};
  for (const [agentName, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) continue;
    const tools = value.filter((v) => typeof v === "string" && v.length > 0);
    if (tools.length > 0) out[agentName] = tools;
  }
  return Object.keys(out).length > 0 ? out : void 0;
}
function toStringArray(v) {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string" && x !== "");
  if (typeof v === "string" && v) return [v];
  return [];
}
function firstString(v) {
  if (Array.isArray(v)) {
    const first = v.find((x) => typeof x === "string" && x !== "");
    return first ?? "";
  }
  if (typeof v === "string") return v;
  return "";
}
function reconcileTag(tagRaw, completeRaw) {
  const complete = toStringArray(completeRaw);
  const single = firstString(tagRaw) || complete[0] || "";
  if (complete.length > 0) {
    return { single, list: complete };
  }
  const list = toStringArray(tagRaw);
  return { single, list };
}
function mapCloudSkillToMarketSkillInfo(raw) {
  const en = reconcileTag(
    raw.tagEn ?? raw.tag_en ?? raw["tag-en"],
    raw.completeTagsEn ?? raw.complete_tags_en ?? raw["complete-tags-en"]
  );
  const cn2 = reconcileTag(
    raw.tagCn ?? raw.tag_cn ?? raw["tag-cn"],
    raw.completeTagsCn ?? raw.complete_tags_cn ?? raw["complete-tags-cn"]
  );
  return {
    ...normalizeSkillDetailMetadata(raw),
    name: raw.name || "",
    version: raw.version || "",
    hash: raw.hash || "",
    summary: raw.summary || raw.summary_en || "",
    summaryZh: raw.summaryZh || raw.summary_zh || raw.summary_cn || "",
    description: raw.description || "",
    tags: raw.tags || [],
    tagsCn: raw.tagsCn || raw.tags_cn || raw["tags-cn"] || [],
    creator: raw.creator || "",
    triggerWords: raw.triggerWords || raw.trigger_words || [],
    guidePrompt: raw.guidePrompt || raw.guide_prompt || SKILL_GUIDE_PROMPT_DEFAULTS.zh,
    guidePromptEn: raw.guidePromptEn || raw.guide_prompt_en || SKILL_GUIDE_PROMPT_DEFAULTS.en,
    displayNameZh: raw.displayNameZh || raw.display_name_zh || "",
    tagEn: en.single,
    tagCn: cn2.single,
    completeTagsEn: en.list,
    completeTagsCn: cn2.list,
    categoryCodes: toStringArray(raw.categoryCodes ?? raw.category_codes),
    descEn: raw.descEn || raw.desc_en || raw["desc-en"] || "",
    descCn: raw.descCn || raw.desc_cn || raw["desc-cn"] || "",
    tools: raw.tools || [],
    toolsByAgent: normalizeToolsByAgent(
      raw.toolsByAgent ?? raw.tools_by_agent ?? raw["tools-by-agent"]
    ),
    skillType: raw.skillType || raw.skill_type || void 0,
    badges: Array.isArray(raw.badges) ? raw.badges : typeof raw.badges === "string" ? JSON.parse(raw.badges) : void 0,
    sortWeight: raw.sortWeight != null ? Number(raw.sortWeight) : raw.sort_weight != null ? Number(raw.sort_weight) : void 0,
    downloads: raw.downloads != null ? Number(raw.downloads) : void 0,
    coverUrl: raw.coverUrl || raw.cover_url || raw.cover || void 0,
    authorEn: raw.authorEn || raw.author_en || raw["author-en"] || void 0,
    authorCn: raw.authorCn || raw.author_cn || raw["author-cn"] || void 0,
    source: raw.source || void 0
  };
}
const SKILL_MEDIA_HOSTS = /* @__PURE__ */ new Set(["cdn.hailuoai.com", "cdn.hailuoai.video"]);
const SKILL_SUBMISSION_MEDIA_HOST = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\.oss-[a-z0-9-]+\.aliyuncs\.com$/;
const SKILL_SUBMISSION_SHOWCASE_PATH = /^\/creator-plan\/[1-9]\d*\/[A-Za-z0-9._-]+\/showcase-\d+\.(mp4|webm|mov)$/;
function isSkillShowcaseUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    return SKILL_MEDIA_HOSTS.has(url.hostname) && /\.(mp4|webm|mov|gif|png|jpe?g|webp|jfif)$/i.test(url.pathname) || SKILL_SUBMISSION_MEDIA_HOST.test(url.hostname) && !url.hostname.includes("-internal.") && SKILL_SUBMISSION_SHOWCASE_PATH.test(decodeURIComponent(url.pathname));
  } catch {
    return false;
  }
}
function skillMetadataRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function normalizeSkillDetailMetadata(raw) {
  const result = {};
  if (Array.isArray(raw.showcase)) {
    const media = [...new Set(raw.showcase.filter(isSkillShowcaseUrl))];
    result.showcase = media;
  } else {
    const media = [raw.showcase, raw.showcaseUrl, raw.showcase_url].find(isSkillShowcaseUrl);
    if (media) result.showcase = [media];
  }
  const localized = skillMetadataRecord(
    raw.structuredInfo ?? raw.structured_info ?? raw["structured-info"]
  );
  const legacyBest = raw.bestFor ?? raw.best_for ?? raw["best-for"];
  const legacyHow = raw.howToUse ?? raw.how_to_use ?? raw["how-to-use"];
  const hasLegacyDetails = [
    "bestFor",
    "best_for",
    "best-for",
    "howToUse",
    "how_to_use",
    "how-to-use",
    "outputs"
  ].some((key) => Object.hasOwn(raw, key));
  const legacyLocale = normalizeSkillContentLocale(
    raw.contentLocale ?? raw.content_locale ?? raw["content-locale"]
  );
  const info = {};
  for (const locale of ["zh-CN", "en-US"]) {
    const legacySummary = (locale === "zh-CN" ? [raw.summaryZh, raw.summary_zh, raw.summary_cn, raw["summary-cn"], raw.summary] : [raw.summary, raw.summary_en, raw["summary-en"]]).find((value) => typeof value === "string" && value.trim());
    const entry = skillMetadataRecord(localized?.[locale]) ?? (!localized && hasLegacyDetails && locale === legacyLocale ? {
      summary: legacySummary,
      best_for: legacyBest,
      how_to_use: legacyHow,
      outputs: raw.outputs
    } : void 0);
    if (!entry) continue;
    const summary = typeof entry.summary === "string" ? entry.summary.trim() : "";
    const how = entry.how_to_use ?? entry["how-to-use"];
    const best = entry.best_for ?? entry["best-for"];
    info[locale] = {
      summary,
      best_for: Array.isArray(best) ? best.filter((v) => typeof v === "string" && !!v.trim()).map((v) => v.trim()) : [],
      how_to_use: typeof how === "string" ? how.trim() : "",
      outputs: typeof entry.outputs === "string" ? entry.outputs.trim() : ""
    };
  }
  if (localized || Object.keys(info).length) result.structuredInfo = info;
  return result;
}
const TOOL_CONFIRM_TIMEOUT_ENV = "HILO_TOOL_CONFIRM_TIMEOUT_MS";
const TOOL_CONFIRM_DEFAULT_TIMEOUT_MS = 3e5;
const TOOL_CONFIRM_TRANSPORT_GRACE_MS = 1e4;
const MAX_DECISION_TIMEOUT_MS = 2147483647 - TOOL_CONFIRM_TRANSPORT_GRACE_MS;
const TOOL_CONFIRM_REJECT_REASONS = [
  "user_rejected",
  "confirmation_expired",
  "confirmation_unavailable"
];
function normalizeToolConfirmTimeoutMs(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > MAX_DECISION_TIMEOUT_MS) {
    return TOOL_CONFIRM_DEFAULT_TIMEOUT_MS;
  }
  const normalized = Math.floor(value);
  return normalized === 0 ? TOOL_CONFIRM_DEFAULT_TIMEOUT_MS : normalized;
}
function resolveToolConfirmTimeoutMs(remoteConfig) {
  if (!remoteConfig || typeof remoteConfig !== "object") {
    return TOOL_CONFIRM_DEFAULT_TIMEOUT_MS;
  }
  const agentTimeoutConfig = remoteConfig.agent_timeout_config;
  if (!agentTimeoutConfig || typeof agentTimeoutConfig !== "object") {
    return TOOL_CONFIRM_DEFAULT_TIMEOUT_MS;
  }
  return normalizeToolConfirmTimeoutMs(
    agentTimeoutConfig.tool_confirm_timeout_ms
  );
}
function isToolConfirmRejectReason(value) {
  return typeof value === "string" && TOOL_CONFIRM_REJECT_REASONS.includes(value);
}
function parseToolConfirmRejectReason(value) {
  if (!value) return void 0;
  const match = value.match(/\[tool-confirm-reject:([a-z_]+)\]/);
  return isToolConfirmRejectReason(match?.[1]) ? match[1] : void 0;
}
const MIN_SUPPORTED_WINDOWS_BUILD = 17763;
const MIN_SUPPORTED_WINDOWS_VERSION_LABEL = "Windows 10 1809 / Windows Server 2019";
const WINDOWS_REQUIRED_CPU_FEATURE = "sse4.2";
const WINDOWS_VERSION_UNSUPPORTED_DIAGNOSIS_CODE = "windows_version_unsupported";
const WINDOWS_VERSION_UNSUPPORTED_ERROR_MARKER = `[${WINDOWS_VERSION_UNSUPPORTED_DIAGNOSIS_CODE}]`;
const WINDOWS_VERSION_UNVERIFIED_DIAGNOSIS_CODE = "windows_version_unverified";
const WINDOWS_VERSION_UNVERIFIED_ERROR_MARKER = `[${WINDOWS_VERSION_UNVERIFIED_DIAGNOSIS_CODE}]`;
const WINDOWS_CPU_UNSUPPORTED_DIAGNOSIS_CODE = "windows_cpu_unsupported";
const WINDOWS_CPU_UNSUPPORTED_ERROR_MARKER = `[${WINDOWS_CPU_UNSUPPORTED_DIAGNOSIS_CODE}]`;
const WINDOWS_RUNTIME_COMPATIBILITY = {
  schemaVersion: 1,
  runtime: "opencode",
  openCodeVersion: OPENCODE_VERSION,
  platform: "win32",
  arch: "x64",
  minWindowsBuild: MIN_SUPPORTED_WINDOWS_BUILD,
  minWindowsVersionLabel: MIN_SUPPORTED_WINDOWS_VERSION_LABEL,
  requiredCpuFeature: WINDOWS_REQUIRED_CPU_FEATURE
};
function parseWindowsBuild(release) {
  const [, , buildRaw] = release.trim().split(".");
  if (!buildRaw || !/^\d+$/.test(buildRaw)) return void 0;
  const build = Number.parseInt(buildRaw, 10);
  return Number.isFinite(build) ? build : void 0;
}
function isWindowsVersionUnsupported(platform, release) {
  if (platform !== "win32") return false;
  const build = parseWindowsBuild(release);
  return build !== void 0 && build < MIN_SUPPORTED_WINDOWS_BUILD;
}
function isWindowsCpuUnsupported(platform, sse42Supported) {
  return platform === "win32" && sse42Supported === false;
}
const WORKSPACE_DATABASE_MIGRATION_CONFLICT_CODE = "workspace_database_migration_conflict";
const WORKSPACE_DATABASE_MIGRATION_FAILED_CODE = "workspace_database_migration_failed";
const WORKSPACE_DATABASE_SCHEMA_AHEAD_CODE = "workspace_database_schema_ahead";
const WORKSPACE_DATABASE_RECOVERY_REQUIRED_CODE = "workspace_database_recovery_required";
const WORKSPACE_INDEX_RECOVERY_EVENT_NAME = "workspace_index_recovery";
const GATEWAY_INDEX_SHUTDOWN_MESSAGE = "hilo:index-shutdown";
const WORKSPACE_INDEX_SHUTDOWN_BLOCKED_CODE = "workspace_index_shutdown_blocked";
const MAX_SHUTDOWN_CONTROL_FIELD_LENGTH = 128;
function hasShutdownEnvelope(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const data = value;
  return data.type === GATEWAY_INDEX_SHUTDOWN_MESSAGE && [data.requestId, data.token, data.nonce].every(
    (field) => typeof field === "string" && field.length > 0 && field.length <= MAX_SHUTDOWN_CONTROL_FIELD_LENGTH
  );
}
function isGatewayIndexShutdownResponse(value) {
  return hasShutdownEnvelope(value) && value.kind === "response" && typeof value.ok === "boolean" && (value.code === void 0 || value.code === WORKSPACE_INDEX_SHUTDOWN_BLOCKED_CODE);
}
const WORKSPACE_DATABASE_MIGRATION_CONFLICT_MARKER = `[${WORKSPACE_DATABASE_MIGRATION_CONFLICT_CODE}]`;
const WORKSPACE_DATABASE_MIGRATION_FAILED_MARKER = `[${WORKSPACE_DATABASE_MIGRATION_FAILED_CODE}]`;
const WORKSPACE_DATABASE_SCHEMA_AHEAD_MARKER = `[${WORKSPACE_DATABASE_SCHEMA_AHEAD_CODE}]`;
const WORKSPACE_DATABASE_RECOVERY_REQUIRED_MARKER = `[${WORKSPACE_DATABASE_RECOVERY_REQUIRED_CODE}]`;
const MAX_OPEN_WORKSPACES = 5;
const MIN_CONFIGURABLE_OPEN_WORKSPACES = 3;
const MAX_CONFIGURABLE_OPEN_WORKSPACES = 20;
function normalizeMaxOpenWorkspaces(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return void 0;
  const budget = Math.floor(value);
  return budget >= MIN_CONFIGURABLE_OPEN_WORKSPACES && budget <= MAX_CONFIGURABLE_OPEN_WORKSPACES ? budget : void 0;
}
const GATEWAY_WORKSPACE_RUNTIME_BUDGET = "hilo:workspace-runtime-budget";
const WORKSPACE_RUNTIME_APOLLO_KEY = "workspace_runtime";
function mapWorkspaceRuntimeRemoteConfig(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const value = raw.max_open_workspaces;
  if (typeof value !== "number" || !Number.isFinite(value)) return {};
  return { maxOpenWorkspaces: value };
}
function isPathInsideOrSame(child, parent) {
  let resolvedChild = path__default.resolve(child);
  let resolvedParent = path__default.resolve(parent);
  if (process.platform === "win32") {
    resolvedChild = resolvedChild.toLowerCase();
    resolvedParent = resolvedParent.toLowerCase();
  }
  const rel = path__default.relative(resolvedParent, resolvedChild);
  return rel === "" || !rel.startsWith("..") && !path__default.isAbsolute(rel);
}
function isInsideOptionalPath(child, parent) {
  return !!parent && isPathInsideOrSame(child, parent);
}
function isWinPathInsideOrSame(child, parent) {
  const normalizedChild = path__default.win32.normalize(child).replace(/[\\/]$/, "").toUpperCase();
  const normalizedParent = path__default.win32.normalize(parent).replace(/[\\/]$/, "").toUpperCase();
  const relative = path__default.win32.relative(normalizedParent, normalizedChild);
  return relative === "" || !relative.startsWith("..") && !path__default.win32.isAbsolute(relative);
}
function rewriteUnderRoot(value, oldRoot, newRoot) {
  if (!value) return value;
  const resolvedValue = path__default.resolve(value);
  const resolvedOld = path__default.resolve(oldRoot);
  const rel = process.platform === "win32" ? path__default.relative(resolvedOld.toLowerCase(), resolvedValue.toLowerCase()) : path__default.relative(resolvedOld, resolvedValue);
  const inside = rel === "" || !rel.startsWith("..") && !path__default.isAbsolute(rel);
  if (!inside) return value;
  const originalRel = path__default.relative(resolvedOld, resolvedValue);
  return path__default.join(newRoot, originalRel);
}
function validateWorkspacePathRewriteJournal(journal) {
  const fromProjectsRoot = journal.fromProjectsRoot;
  const toProjectsRoot = journal.toProjectsRoot;
  if (fromProjectsRoot !== void 0 || toProjectsRoot !== void 0) {
    if (typeof fromProjectsRoot !== "string" || typeof toProjectsRoot !== "string") {
      throw new Error("incomplete_root_rewrite");
    }
    if (!path__default.isAbsolute(fromProjectsRoot) || !path__default.isAbsolute(toProjectsRoot)) {
      throw new Error("invalid_root_rewrite");
    }
  }
  if (journal.mappings !== void 0 && !Array.isArray(journal.mappings)) {
    throw new Error("invalid_workspace_mappings");
  }
  for (const mapping of journal.mappings ?? []) {
    if (typeof mapping.fromWorkspacePath !== "string" || typeof mapping.toWorkspacePath !== "string" || !path__default.isAbsolute(mapping.fromWorkspacePath) || !path__default.isAbsolute(mapping.toWorkspacePath)) {
      throw new Error("invalid_workspace_mapping");
    }
  }
}
function workspacePathRewriteMappings(journal) {
  validateWorkspacePathRewriteJournal(journal);
  if (journal.mappings) return journal.mappings;
  if (journal.fromProjectsRoot && journal.toProjectsRoot) {
    return [
      {
        fromWorkspacePath: journal.fromProjectsRoot,
        toWorkspacePath: journal.toProjectsRoot
      }
    ];
  }
  return [];
}
function rewriteWorkspacePath(value, journal) {
  for (const mapping of workspacePathRewriteMappings(journal)) {
    const rewritten = rewriteUnderRoot(value, mapping.fromWorkspacePath, mapping.toWorkspacePath);
    if (rewritten !== value) return rewritten;
  }
  return value;
}
const LEGACY_DB_IMPORT_DECISION_FILE = ".opencode-legacy-db-import.json";
const LEGACY_DB_MIGRATION_DECISION_MARKER = ".hilo-legacy-db-migration-decision";
function resolveLegacyDbImportDecisionPath(dataHome) {
  return path__default.join(path__default.dirname(dataHome), LEGACY_DB_IMPORT_DECISION_FILE);
}
function legacyMarkerPath(dataHome) {
  return path__default.join(dataHome, "opencode", LEGACY_DB_MIGRATION_DECISION_MARKER);
}
function readLegacyDbImportRecord(dataHome) {
  try {
    const raw = JSON.parse(
      fs__default.readFileSync(resolveLegacyDbImportDecisionPath(dataHome), "utf-8")
    );
    return normalizeLegacyDbImportRecord(raw);
  } catch {
    return void 0;
  }
}
function normalizeLegacyDbImportRecord(raw) {
  if (!raw || typeof raw !== "object") return void 0;
  const value = raw;
  if (value.decision !== "imported" && value.decision !== "skipped") return void 0;
  if (typeof value.reason !== "string" || typeof value.atMs !== "number") return void 0;
  return {
    version: 1,
    decision: value.decision,
    reason: value.reason,
    atMs: value.atMs,
    ...value.source && typeof value.source === "object" ? { source: value.source } : {}
  };
}
function recordLegacyDbImportDecision(dataHome, record, log) {
  const decisionPath = resolveLegacyDbImportDecisionPath(dataHome);
  try {
    fs__default.mkdirSync(path__default.dirname(decisionPath), { recursive: true });
    fs__default.writeFileSync(decisionPath, `${JSON.stringify({ version: 1, ...record })}
`, {
      flag: "wx",
      mode: 384
    });
    return true;
  } catch (err) {
    if (err.code === "EEXIST") return true;
    log?.warn(
      "[opencode-runtime] Failed to persist the legacy db import decision; future schema remediation will refuse quarantine to avoid re-importing standalone data: " + (err instanceof Error ? err.message : String(err))
    );
    return false;
  }
}
const OPENCODE_BUNDLED_MIGRATION_IDS = /* @__PURE__ */ new Set([
  "20260127222353_familiar_lady_ursula",
  "20260211171708_add_project_commands",
  "20260213144116_wakeful_the_professor",
  "20260225215848_workspace",
  "20260227213759_add_session_workspace_id",
  "20260228203230_blue_harpoon",
  "20260303231226_add_workspace_fields",
  "20260309230000_move_org_to_state",
  "20260312043431_session_message_cursor",
  "20260323234822_events",
  "20260410174513_workspace-name",
  "20260413175956_chief_energizer",
  "20260423070820_add_icon_url_override",
  "20260427172553_slow_nightmare",
  "20260428004200_add_session_path",
  "20260501142318_next_venus",
  "20260504145000_add_sync_owner",
  "20260507164347_add_workspace_time",
  "20260510033149_session_usage",
  "20260511000411_data_migration_state",
  "20260511173437_session-metadata",
  "20260601010001_normalize_storage_paths",
  "20260601202201_amazing_prowler",
  "20260602002951_lowly_union_jack",
  "20260602182828_add_project_directories",
  "20260603001617_session_message_projection_indexes",
  "20260603040000_session_message_projection_order",
  "20260603141458_session_input_inbox",
  "20260603160727_jittery_ezekiel_stane",
  "20260604172448_event_sourced_session_input",
  "20260605003541_add_session_context_snapshot",
  "20260605042240_add_context_epoch_agent",
  "20260611035744_credential",
  "20260611192811_lush_chimera",
  "20260612174303_project_dir_strategy",
  "20260622142730_simplify_session_context_epoch",
  "20260622170816_reset_v2_session_state",
  "20260622202450_simplify_session_input"
]);
function importLegacyOpenCodeDb(options) {
  const { dataHome, log } = options;
  const now = options.now ?? Date.now;
  const dbDir = path__default.join(dataHome, "opencode");
  const newDbPath = path__default.join(dbDir, "opencode.db");
  if (fs__default.existsSync(resolveLegacyDbImportDecisionPath(dataHome))) {
    return readLegacyDbImportRecord(dataHome);
  }
  const decide = (decision, reason, source) => {
    const record = { decision, reason, atMs: now(), ...source ? { source } : {} };
    recordLegacyDbImportDecision(dataHome, record, log);
    const message = `[opencode-runtime] Legacy db import decision=${decision} reason=${reason}` + (source ? ` ${formatSourceSummary(source)}` : "");
    if (reason === "schema_incompatible") log?.warn(message);
    else log?.info(message);
    return { version: 1, ...record };
  };
  if (fs__default.existsSync(legacyMarkerPath(dataHome))) return decide("skipped", "legacy_marker");
  if (fs__default.existsSync(newDbPath)) return decide("skipped", "existing_private_db");
  const legacyDbPath = options.legacyDbPath ?? path__default.join(os__default.homedir(), ".local", "share", "opencode", "opencode.db");
  if (!fs__default.existsSync(legacyDbPath)) return decide("skipped", "no_source");
  let summary;
  try {
    summary = inspectOpenCodeDb(legacyDbPath, options.hubWorkspaceRoots ?? [], {
      readOnly: true
    });
  } catch (err) {
    log?.warn(
      `[opencode-runtime] Could not inspect legacy opencode db ${legacyDbPath}; will retry next launch: ${err instanceof Error ? err.message : String(err)}`
    );
    return void 0;
  }
  if (!summary.hasSessionTable) return decide("skipped", "not_opencode_session_db", summary);
  if (summary.hubSessionDirectoryCount === 0) return decide("skipped", "not_hub_owned", summary);
  if (!isJournalCompatible(summary)) return decide("skipped", "schema_incompatible", summary);
  try {
    stageAndInstallLegacyDb(legacyDbPath, dbDir, newDbPath, options.hubWorkspaceRoots ?? []);
  } catch (err) {
    log?.warn(
      `[opencode-runtime] Failed to import legacy opencode db from ${legacyDbPath}; will retry next launch: ${err instanceof Error ? err.message : String(err)}`
    );
    return void 0;
  }
  return decide("imported", "hub_owned_compatible", summary);
}
function isJournalCompatible(summary) {
  if (summary.journal === "none" || summary.journal === "drizzle_without_name") return false;
  return summary.journalEntries > 0 && summary.unknownMigrations === 0;
}
function formatSourceSummary(summary) {
  return `tables=${summary.tableCount} sessionTable=${summary.hasSessionTable} sessionDirs=${summary.sessionDirectoryCount} hubSessionDirs=${summary.hubSessionDirectoryCount} journal=${summary.journal} journalEntries=${summary.journalEntries} unknownMigrations=${summary.unknownMigrations}`;
}
function stageAndInstallLegacyDb(legacyDbPath, dbDir, newDbPath, hubWorkspaceRoots) {
  fs__default.mkdirSync(dbDir, { recursive: true });
  const stagingDir = fs__default.mkdtempSync(path__default.join(dbDir, ".legacy-import-"));
  try {
    const stagedDbPath = path__default.join(stagingDir, "opencode.db");
    fs__default.copyFileSync(legacyDbPath, stagedDbPath);
    for (const suffix of ["-wal", "-shm"]) {
      if (fs__default.existsSync(`${legacyDbPath}${suffix}`)) {
        fs__default.copyFileSync(`${legacyDbPath}${suffix}`, `${stagedDbPath}${suffix}`);
      }
    }
    const db = new DatabaseSync(stagedDbPath);
    try {
      bridgeMigrationJournal(db);
      db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    } finally {
      db.close();
    }
    const staged = inspectOpenCodeDb(stagedDbPath, hubWorkspaceRoots, { readOnly: true });
    if (!staged.hasSessionTable || !isJournalCompatible(staged)) {
      throw new Error("staged copy failed verification");
    }
    for (const suffix of ["-wal", "-shm"]) {
      fs__default.rmSync(`${stagedDbPath}${suffix}`, { force: true });
    }
    fs__default.renameSync(stagedDbPath, newDbPath);
  } finally {
    fs__default.rmSync(stagingDir, { recursive: true, force: true });
  }
}
function inspectOpenCodeDb(dbPath, hubWorkspaceRoots, options) {
  const db = new DatabaseSync(dbPath, { readOnly: options.readOnly });
  try {
    const tables = new Set(
      db.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
      ).all().map((row) => row.name)
    );
    const hasSessionTable = tables.has("session");
    let sessionDirectoryCount = 0;
    let hubSessionDirectoryCount = 0;
    if (hasSessionTable) {
      const roots = hubWorkspaceRoots.map(normalizeComparablePath).filter((root) => root !== "");
      const directories = db.prepare("SELECT DISTINCT directory FROM session").all();
      for (const { directory } of directories) {
        if (typeof directory !== "string") continue;
        sessionDirectoryCount++;
        const normalized = normalizeComparablePath(directory);
        if (roots.some((root) => isSameOrInside(normalized, root))) hubSessionDirectoryCount++;
      }
    }
    const journal = readJournal(db, tables);
    return {
      tableCount: tables.size,
      hasSessionTable,
      sessionDirectoryCount,
      hubSessionDirectoryCount,
      journal: journal.kind,
      journalEntries: journal.ids.length,
      unknownMigrations: journal.ids.filter((id) => !OPENCODE_BUNDLED_MIGRATION_IDS.has(id)).length
    };
  } finally {
    db.close();
  }
}
function readJournal(db, tables) {
  if (tables.has("migration")) {
    const ids = db.prepare("SELECT id FROM migration").all().map((row) => row.id).filter((id) => typeof id === "string");
    if (ids.length > 0) return { kind: "migration", ids };
  }
  if (tables.has("__drizzle_migrations")) {
    const columns = db.prepare("PRAGMA table_info(__drizzle_migrations)").all().map((column) => column.name);
    if (!columns.includes("name")) return { kind: "drizzle_without_name", ids: [] };
    const ids = db.prepare("SELECT name FROM __drizzle_migrations WHERE name IS NOT NULL").all().map((row) => row.name).filter((name) => typeof name === "string");
    return { kind: "drizzle", ids };
  }
  return { kind: "none", ids: [] };
}
function bridgeMigrationJournal(db) {
  const table = (name) => db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
  if (!table("session") || !table("migration")) return 0;
  db.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at NUMERIC,
      name TEXT,
      applied_at TEXT
    )
  `);
  const existing = db.prepare("SELECT COUNT(*) AS count FROM __drizzle_migrations").get();
  if (existing.count > 0) return 0;
  const migrations = db.prepare("SELECT id FROM migration ORDER BY time_completed, id").all().map(({ id }) => ({ name: id, createdAt: migrationNameToMillis(id) })).filter((entry) => entry.createdAt !== null);
  if (migrations.length === 0) return 0;
  const insert = db.prepare(
    `INSERT INTO __drizzle_migrations (hash, created_at, name, applied_at)
     VALUES ('', ?, ?, NULL)`
  );
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const migration of migrations) insert.run(migration.createdAt, migration.name);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return migrations.length;
}
function migrationNameToMillis(name) {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})_[A-Za-z0-9_-]+$/.exec(name);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const value = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
  return Number.isFinite(value) ? value : null;
}
function normalizeComparablePath(input) {
  const trimmed = input.trim();
  if (trimmed === "") return "";
  let value = trimmed.replace(/\\/g, "/").replace(/\/+$/, "");
  if (/^[a-z]:(\/|$)/i.test(value) || process.platform === "win32") value = value.toLowerCase();
  return value;
}
function isSameOrInside(candidate, root) {
  return candidate === root || candidate.startsWith(`${root}/`);
}
function setupOpenCodeRuntimeDirs(userDataDir, log) {
  const root = path__default.join(userDataDir, "ai-runtime");
  const dirs = {
    root,
    runtimeHome: path__default.join(root, "home"),
    configHome: path__default.join(root, "config-home"),
    cacheHome: path__default.join(root, "cache-home"),
    dataHome: path__default.join(root, "data-home"),
    stateHome: path__default.join(root, "state-home")
  };
  for (const [label, dir] of Object.entries(dirs)) {
    try {
      fs__default.mkdirSync(dir, { recursive: true });
    } catch (err) {
      log?.error(
        `[opencode-runtime] Failed to create ${label} dir "${dir}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  const runtimeEnv = {
    [OPENCODE_RUNTIME_HOME_ENV]: dirs.runtimeHome,
    XDG_CONFIG_HOME: dirs.configHome,
    XDG_CACHE_HOME: dirs.cacheHome,
    XDG_DATA_HOME: dirs.dataHome,
    XDG_STATE_HOME: dirs.stateHome
  };
  return { ...dirs, runtimeEnv };
}
function runRuntimeMigrations(dirs, log, options = {}) {
  migrateLegacyOpenCodeDb({
    dataHome: dirs.dataHome,
    hubWorkspaceRoots: options.hubWorkspaceRoots,
    log
  });
  bridgeLegacyOpenCodeMigrationJournal({ dataHome: dirs.dataHome, log });
  pruneQuarantinedOpenCodeDatabases({ dataHome: dirs.dataHome, log });
}
const QUARANTINE_SUFFIX_RE = /\.schema-mismatch-(\d+)$/;
const QUARANTINED_DB_SETS_TO_KEEP = 1;
function pruneQuarantinedOpenCodeDatabases(options) {
  const dbDir = path__default.join(options.dataHome, "opencode");
  let entries;
  try {
    entries = fs__default.readdirSync(dbDir);
  } catch {
    return;
  }
  const byTimestamp = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const match = QUARANTINE_SUFFIX_RE.exec(entry);
    if (!match) continue;
    const ts2 = Number(match[1]);
    const bucket = byTimestamp.get(ts2) ?? [];
    bucket.push(entry);
    byTimestamp.set(ts2, bucket);
  }
  if (byTimestamp.size <= QUARANTINED_DB_SETS_TO_KEEP) return;
  const staleTimestamps = [...byTimestamp.keys()].sort((a, b2) => b2 - a).slice(QUARANTINED_DB_SETS_TO_KEEP);
  let removed = 0;
  for (const ts2 of staleTimestamps) {
    for (const entry of byTimestamp.get(ts2) ?? []) {
      try {
        fs__default.rmSync(path__default.join(dbDir, entry), { force: true });
        removed++;
      } catch (err) {
        options.log?.warn(
          `[opencode-runtime] Failed to prune quarantined db file ${entry}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }
  if (removed > 0) {
    options.log?.info(
      `[opencode-runtime] Pruned ${removed} stale quarantined db file(s), kept the newest ${QUARANTINED_DB_SETS_TO_KEEP} set(s)`
    );
  }
}
function bridgeLegacyOpenCodeMigrationJournal(options) {
  const dbPath = path__default.join(options.dataHome, "opencode", "opencode.db");
  if (!fs__default.existsSync(dbPath)) return;
  let db;
  try {
    db = new DatabaseSync(dbPath);
    const bridged = bridgeMigrationJournal(db);
    if (bridged > 0) {
      options.log?.info(
        `[opencode-runtime] Bridged ${bridged} legacy migration records into the Drizzle journal`
      );
    }
  } catch (err) {
    options.log?.warn(
      `[opencode-runtime] Failed to bridge the OpenCode migration journal: ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    db?.close();
  }
}
function migrateLegacyOpenCodeDb(options) {
  return importLegacyOpenCodeDb(options);
}
function quarantineOpenCodeDatabase(options) {
  const { dbPath, log } = options;
  const suffix = `.schema-mismatch-${options.timestamp ?? Date.now()}`;
  const targets = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];
  if (!targets.some((target) => fs__default.existsSync(target))) return [];
  const dataHome = path__default.dirname(path__default.dirname(dbPath));
  const decision = {
    decision: "skipped",
    reason: "quarantine",
    atMs: options.timestamp ?? Date.now()
  };
  if (!recordLegacyDbImportDecision(dataHome, decision, log)) {
    log?.error(
      `[opencode-runtime] Refusing to quarantine ${dbPath}: legacy db migration decision is not durable`
    );
    return [];
  }
  const moved = [];
  for (const target of targets) {
    try {
      if (!fs__default.existsSync(target)) continue;
      fs__default.renameSync(target, `${target}${suffix}`);
      moved.push(target);
    } catch (err) {
      log?.warn(
        `[opencode-runtime] Failed to quarantine ${target}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  if (moved.length > 0) {
    log?.info(
      `[opencode-runtime] Quarantined ${moved.length} OpenCode database file(s) with suffix ${suffix}`
    );
  }
  return moved;
}
function rewriteOpenCodeSessionDirectories(options) {
  const dbPath = path__default.join(options.dataHome, "opencode", "opencode.db");
  if (!fs__default.existsSync(dbPath)) return { ok: true, updated: 0 };
  let db;
  try {
    db = new DatabaseSync(dbPath);
    const hasSessionTable = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'session'").get();
    if (!hasSessionTable) return { ok: true, updated: 0 };
    const journal = {
      ...options.fromProjectsRoot !== void 0 ? { fromProjectsRoot: options.fromProjectsRoot } : {},
      ...options.toProjectsRoot !== void 0 ? { toProjectsRoot: options.toProjectsRoot } : {},
      ...options.mappings ? { mappings: [...options.mappings] } : {}
    };
    const rows = db.prepare("SELECT id, directory FROM session").all();
    const rewrites = rows.flatMap((row) => {
      if (typeof row.id !== "string" || typeof row.directory !== "string") return [];
      const directory = rewriteWorkspacePath(row.directory, journal);
      return directory === row.directory ? [] : [{ id: row.id, directory }];
    });
    if (rewrites.length === 0) return { ok: true, updated: 0 };
    const update = db.prepare("UPDATE session SET directory = ? WHERE id = ?");
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const rewrite of rewrites) update.run(rewrite.directory, rewrite.id);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
    options.log?.info(
      `[opencode-runtime] Rewrote ${rewrites.length} session director${rewrites.length === 1 ? "y" : "ies"} after data-directory rescue`
    );
    return { ok: true, updated: rewrites.length };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    options.log?.warn(`[opencode-runtime] Failed to rewrite rescued session directories: ${error}`);
    return { ok: false, error };
  } finally {
    db?.close();
  }
}
function workspaceGatewayUrl(binding, path2) {
  const baseUrl = binding.baseUrl.replace(/\/$/, "");
  const requested = new URL(path2, `${baseUrl}/`);
  const parsed = new URL(`${requested.pathname}${requested.search}${requested.hash}`, `${baseUrl}/`);
  parsed.searchParams.set(HILO_WORKSPACE_IDENTITY_QUERY, binding.claim);
  parsed.searchParams.set(HILO_WORKSPACE_INSTANCE_QUERY, binding.instanceId);
  parsed.searchParams.set(HILO_WORKSPACE_GENERATION_QUERY, String(binding.generation));
  return parsed.toString();
}
function withWorkspaceGatewayHeaders(binding, headers) {
  const result = new Headers(headers);
  for (const [key, value] of Object.entries(workspaceGatewayIdentityHeaders(binding))) {
    result.set(key, value);
  }
  return result;
}
class WorkspaceGatewayClient {
  bindingValue;
  fetchImpl;
  recoverWorkspace;
  recoveryInFlight;
  constructor(options) {
    this.bindingValue = options.binding;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.recoverWorkspace = options.recoverWorkspace;
  }
  get binding() {
    return this.bindingValue;
  }
  url(path2) {
    return workspaceGatewayUrl(this.bindingValue, path2);
  }
  async request(path2, init) {
    return this.performRequest(path2, init, true);
  }
  async performRequest(path2, init, allowRecovery) {
    const response = await this.fetchImpl(this.url(path2), {
      ...init,
      headers: withWorkspaceGatewayHeaders(this.bindingValue, init?.headers)
    });
    if (!allowRecovery || !this.recoverWorkspace || !await isIdentityError(response)) {
      return response;
    }
    const previousBinding = this.bindingValue;
    const recovered = await this.recoverBinding();
    if (!recovered)
      return response;
    if (!canReplayAfterRecovery(init, previousBinding, recovered)) {
      return response;
    }
    this.bindingValue = recovered;
    return this.performRequest(path2, init, false);
  }
  async recoverBinding() {
    if (!this.recoverWorkspace)
      return void 0;
    if (this.recoveryInFlight)
      return this.recoveryInFlight;
    const recovery = this.recoverWorkspace();
    this.recoveryInFlight = recovery;
    try {
      return await recovery;
    } finally {
      if (this.recoveryInFlight === recovery) {
        this.recoveryInFlight = void 0;
      }
    }
  }
}
function canReplayAfterRecovery(init, previous, recovered) {
  const method = (init?.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS")
    return true;
  return previous.claim === recovered.claim && previous.instanceId === recovered.instanceId;
}
async function isIdentityError(response) {
  if (response.status !== 409 && response.status !== 428)
    return false;
  try {
    const body = await response.clone().json();
    return isWorkspaceIdentityErrorCode(body.code);
  } catch {
    return false;
  }
}
const HILO_MANAGED_RUNTIME_ENV = "HILO_MANAGED_RUNTIME";
const HILO_MANAGED_RUNTIME_VALUE = "1";
function buildOpenCodeEnv(gatewayUrl) {
  return {
    GATEWAY_URL: gatewayUrl,
    HILO_CONNECTOR_DISCOVERY: "1",
    [HILO_MANAGED_RUNTIME_ENV]: HILO_MANAGED_RUNTIME_VALUE,
    NODE_ENV: process.env.NODE_ENV || "production"
  };
}
const PLUGIN_DISPLAY_MODES = ["inline", "launcher"];
class PluginManifestError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "PluginManifestError";
    this.code = code;
  }
}
const PLUGIN_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PLUGIN_ID_MAX_LENGTH = 64;
const PLUGIN_VERSION_RE = /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/;
const PLUGIN_NAME_MAX_LENGTH = 80;
const PLUGIN_DESCRIPTION_MAX_LENGTH = 240;
const PLUGIN_DETAILS_MAX_LENGTH = 4e3;
const PLUGIN_PATH_MAX_LENGTH = 256;
const PLUGIN_URL_MAX_LENGTH = 2048;
const PLUGIN_TAG_VALUE_MAX_LENGTH = 64;
const HTML_ENTRY_RE = /\.html?$/i;
const SKILL_MD_RE = /\.md$/i;
const PLUGIN_SKILL_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const PREVIEW_EXT_RE = /\.(png|jpe?g|gif|webp|mp4|webm|mov)$/i;
const PLUGIN_PREVIEWS_MAX_COUNT = 12;
const PLUGIN_TAGS_MAX_COUNT = 16;
const PLUGIN_SIZE_MAX = 4096;
const PLUGIN_AGENT_METHOD_RE = /^[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)*$/;
const PLUGIN_AGENT_METHOD_MAX_LENGTH = 64;
const PLUGIN_AGENT_METHODS_MAX_COUNT = 16;
const PLUGIN_AGENT_METHOD_DESCRIPTION_MAX_LENGTH = 64e3;
const PLUGIN_AGENT_INSTRUCTIONS_MAX_LENGTH = 64e3;
const PLUGIN_AGENT_SESSION_NAME_MAX_LENGTH = 40;
const PLUGIN_AGENT_TIMEOUT_MIN_MS = 1e3;
const PLUGIN_AGENT_TIMEOUT_MAX_MS = 3e5;
function parsePluginManifest(input) {
  let raw = input;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch (err) {
      throw new PluginManifestError(
        "invalid_json",
        `manifest.json is not valid JSON: ${err.message}`
      );
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new PluginManifestError("invalid_shape", "manifest must be a JSON object");
  }
  const obj = raw;
  const id = obj.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new PluginManifestError("invalid_id", "id must be a non-empty string");
  }
  if (id.length > PLUGIN_ID_MAX_LENGTH) {
    throw new PluginManifestError(
      "invalid_id",
      `id "${id}" exceeds ${PLUGIN_ID_MAX_LENGTH} characters`
    );
  }
  if (!PLUGIN_ID_RE.test(id)) {
    throw new PluginManifestError(
      "invalid_id",
      `id "${id}" must be kebab-case (lowercase letters, digits, single dashes)`
    );
  }
  const name = parseLocalizedString(obj.name, "name", PLUGIN_NAME_MAX_LENGTH, "invalid_name");
  const description = parseLocalizedString(
    obj.description,
    "description",
    PLUGIN_DESCRIPTION_MAX_LENGTH,
    "invalid_description"
  );
  let details;
  if (obj.details !== void 0) {
    const parsed = parseLocalizedString(
      obj.details,
      "details",
      PLUGIN_DETAILS_MAX_LENGTH,
      "invalid_details",
      { allowEmptyValues: true }
    );
    const filtered = {};
    for (const [loc, val] of Object.entries(parsed)) {
      if (val.length > 0) filtered[loc] = val;
    }
    if (Object.keys(filtered).length > 0) details = filtered;
  }
  let previews;
  if (obj.previews !== void 0) {
    previews = parseLocalizedPathOrUrlArray(
      obj.previews,
      "previews",
      "invalid_previews",
      PLUGIN_PREVIEWS_MAX_COUNT,
      PREVIEW_EXT_RE
    );
  }
  let tags;
  if (obj.tags !== void 0) {
    tags = parseLocalizedTagArray(obj.tags, "tags", "invalid_tags");
  }
  const version = obj.version;
  if (typeof version !== "string" || !PLUGIN_VERSION_RE.test(version)) {
    throw new PluginManifestError(
      "invalid_version",
      `version "${String(version)}" must be semver (e.g. "0.1.0" or "1.2.3-beta.1")`
    );
  }
  const icon = parseLocalizedPathOrUrl(obj.icon, "icon", "invalid_icon");
  const entry = obj.entry;
  if (typeof entry !== "string" || entry.length === 0) {
    throw new PluginManifestError("invalid_entry", "entry must be a non-empty string");
  }
  if (entry.length > PLUGIN_PATH_MAX_LENGTH) {
    throw new PluginManifestError(
      "invalid_entry",
      `entry path exceeds ${PLUGIN_PATH_MAX_LENGTH} characters`
    );
  }
  if (!isSafeRelativePath(entry)) {
    throw new PluginManifestError(
      "invalid_entry",
      `entry "${entry}" must be a relative path inside the plugin directory`
    );
  }
  if (!HTML_ENTRY_RE.test(entry)) {
    throw new PluginManifestError(
      "invalid_entry",
      `entry "${entry}" must end in .html or .htm — the runtime mounts it as an HTML node`
    );
  }
  const rawSkill = obj.skill;
  let skill;
  if (rawSkill !== void 0) {
    if (typeof rawSkill === "string") {
      validatePluginSkillPath(rawSkill, "skill");
      skill = rawSkill;
    } else if (isPlainObject(rawSkill)) {
      validatePluginSkillPath(rawSkill.entry, "skill.entry");
      if (typeof rawSkill.name !== "string" || !PLUGIN_SKILL_NAME_RE.test(rawSkill.name)) {
        throw new PluginManifestError(
          "invalid_skill",
          "skill.name must match [A-Za-z0-9][A-Za-z0-9._-]{0,63}"
        );
      }
      if (rawSkill.load !== "on-demand") {
        throw new PluginManifestError("invalid_skill", 'skill.load must be "on-demand"');
      }
      if (rawSkill.fallback !== "inline") {
        throw new PluginManifestError("invalid_skill", 'skill.fallback must be "inline"');
      }
      skill = {
        entry: rawSkill.entry,
        name: rawSkill.name,
        load: "on-demand",
        fallback: "inline"
      };
    } else {
      throw new PluginManifestError(
        "invalid_skill",
        "skill must be a relative Markdown path or a hybrid skill object"
      );
    }
  }
  const displayMode = obj.displayMode;
  if (displayMode !== void 0 && !PLUGIN_DISPLAY_MODES.includes(displayMode)) {
    throw new PluginManifestError(
      "invalid_display_mode",
      `displayMode "${String(displayMode)}" must be one of: ${PLUGIN_DISPLAY_MODES.join(", ")}`
    );
  }
  const width = parseOptionalSize(obj.width, "width");
  const height = parseOptionalSize(obj.height, "height");
  const agent = obj.agent !== void 0 ? parseAgentManifest(obj.agent) : void 0;
  return {
    id,
    name,
    description,
    ...details !== void 0 ? { details } : {},
    ...previews !== void 0 ? { previews } : {},
    ...tags !== void 0 ? { tags } : {},
    version,
    icon,
    entry,
    ...skill !== void 0 ? { skill } : {},
    ...displayMode !== void 0 ? { displayMode } : {},
    ...width !== void 0 ? { width } : {},
    ...height !== void 0 ? { height } : {},
    ...agent !== void 0 ? { agent } : {}
  };
}
function parseAgentManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new PluginManifestError("invalid_agent", "agent must be an object");
  }
  const obj = raw;
  if (obj.editorSurface !== void 0 && typeof obj.editorSurface !== "boolean") {
    throw new PluginManifestError("invalid_agent", "agent.editorSurface must be a boolean");
  }
  let sessionName;
  if (obj.sessionName !== void 0) {
    sessionName = parseLocalizedString(
      obj.sessionName,
      "agent.sessionName",
      PLUGIN_AGENT_SESSION_NAME_MAX_LENGTH,
      "invalid_agent"
    );
  }
  const instructions = obj.instructions;
  if (typeof instructions !== "string" || instructions.trim().length === 0) {
    throw new PluginManifestError("invalid_agent", "agent.instructions must be a non-empty string");
  }
  if (instructions.length > PLUGIN_AGENT_INSTRUCTIONS_MAX_LENGTH) {
    throw new PluginManifestError(
      "invalid_agent",
      `agent.instructions exceeds ${PLUGIN_AGENT_INSTRUCTIONS_MAX_LENGTH} characters`
    );
  }
  const methodsRaw = obj.methods;
  if (!Array.isArray(methodsRaw) || methodsRaw.length === 0) {
    throw new PluginManifestError("invalid_agent", "agent.methods must be a non-empty array");
  }
  if (methodsRaw.length > PLUGIN_AGENT_METHODS_MAX_COUNT) {
    throw new PluginManifestError(
      "invalid_agent",
      `agent.methods exceeds ${PLUGIN_AGENT_METHODS_MAX_COUNT} entries`
    );
  }
  const seen = /* @__PURE__ */ new Set();
  const methods = methodsRaw.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new PluginManifestError("invalid_agent", `agent.methods[${index}] must be an object`);
    }
    const method = entry;
    const name = method.name;
    if (typeof name !== "string" || name.length === 0 || name.length > PLUGIN_AGENT_METHOD_MAX_LENGTH || !PLUGIN_AGENT_METHOD_RE.test(name)) {
      throw new PluginManifestError(
        "invalid_agent",
        `agent.methods[${index}].name must match ${PLUGIN_AGENT_METHOD_RE.source} (≤ ${PLUGIN_AGENT_METHOD_MAX_LENGTH} chars)`
      );
    }
    if (seen.has(name)) {
      throw new PluginManifestError("invalid_agent", `agent.methods duplicate name "${name}"`);
    }
    seen.add(name);
    const description = method.description;
    if (typeof description !== "string" || description.trim().length === 0) {
      throw new PluginManifestError(
        "invalid_agent",
        `agent.methods[${index}].description must be a non-empty string`
      );
    }
    if (description.length > PLUGIN_AGENT_METHOD_DESCRIPTION_MAX_LENGTH) {
      throw new PluginManifestError(
        "invalid_agent",
        `agent.methods[${index}].description exceeds ${PLUGIN_AGENT_METHOD_DESCRIPTION_MAX_LENGTH} characters`
      );
    }
    const timeoutMs = method.timeoutMs;
    if (timeoutMs !== void 0) {
      if (typeof timeoutMs !== "number" || !Number.isInteger(timeoutMs) || timeoutMs < PLUGIN_AGENT_TIMEOUT_MIN_MS || timeoutMs > PLUGIN_AGENT_TIMEOUT_MAX_MS) {
        throw new PluginManifestError(
          "invalid_agent",
          `agent.methods[${index}].timeoutMs must be an integer in [${PLUGIN_AGENT_TIMEOUT_MIN_MS}, ${PLUGIN_AGENT_TIMEOUT_MAX_MS}]`
        );
      }
    }
    return {
      name,
      description: description.trim(),
      ...timeoutMs !== void 0 ? { timeoutMs } : {}
    };
  });
  return {
    ...obj.editorSurface !== void 0 ? { editorSurface: obj.editorSurface } : {},
    ...sessionName !== void 0 ? { sessionName } : {},
    instructions: instructions.trim(),
    methods
  };
}
function parseLocalizedString(raw, field, maxLength, errorCode, opts = {}) {
  const dict = ensureI18nDict(raw, field, errorCode);
  const out = {};
  for (const [locale, value] of Object.entries(dict)) {
    assertBcp47(locale, field, errorCode);
    if (typeof value !== "string") {
      throw new PluginManifestError(errorCode, `${field}["${locale}"] must be a string`);
    }
    if (value.length > maxLength) {
      throw new PluginManifestError(
        errorCode,
        `${field}["${locale}"] exceeds ${maxLength} characters`
      );
    }
    const trimmed = value.trim();
    if (!opts.allowEmptyValues && trimmed.length === 0) {
      throw new PluginManifestError(errorCode, `${field}["${locale}"] must be a non-empty string`);
    }
    out[locale] = trimmed;
  }
  if (Object.keys(out).length === 0) {
    throw new PluginManifestError(
      errorCode,
      `${field} must contain at least one BCP47 locale entry`
    );
  }
  return out;
}
function parseLocalizedPathOrUrl(raw, field, errorCode) {
  const dict = ensureI18nDict(raw, field, errorCode);
  const out = {};
  for (const [locale, value] of Object.entries(dict)) {
    assertBcp47(locale, field, errorCode);
    if (typeof value !== "string" || value.length === 0) {
      throw new PluginManifestError(errorCode, `${field}["${locale}"] must be a non-empty string`);
    }
    validatePathOrUrl(value, `${field}["${locale}"]`, errorCode, void 0);
    out[locale] = value;
  }
  if (Object.keys(out).length === 0) {
    throw new PluginManifestError(
      errorCode,
      `${field} must contain at least one BCP47 locale entry`
    );
  }
  return out;
}
function parseLocalizedPathOrUrlArray(raw, field, errorCode, maxCount, extRe) {
  const dict = ensureI18nDict(raw, field, errorCode);
  const out = {};
  for (const [locale, value] of Object.entries(dict)) {
    assertBcp47(locale, field, errorCode);
    if (!Array.isArray(value)) {
      throw new PluginManifestError(errorCode, `${field}["${locale}"] must be an array of strings`);
    }
    if (value.length > maxCount) {
      throw new PluginManifestError(errorCode, `${field}["${locale}"] exceeds ${maxCount} entries`);
    }
    const seen = /* @__PURE__ */ new Set();
    const items = [];
    for (const item of value) {
      if (typeof item !== "string" || item.length === 0) {
        throw new PluginManifestError(
          errorCode,
          `${field}["${locale}"] entries must be non-empty strings`
        );
      }
      validatePathOrUrl(item, `${field}["${locale}"]`, errorCode, extRe);
      if (seen.has(item)) continue;
      seen.add(item);
      items.push(item);
    }
    if (items.length > 0) out[locale] = items;
  }
  return Object.keys(out).length > 0 ? out : {};
}
function parseLocalizedTagArray(raw, field, errorCode) {
  const dict = ensureI18nDict(raw, field, errorCode);
  const out = {};
  for (const [locale, value] of Object.entries(dict)) {
    assertBcp47(locale, field, errorCode);
    if (!Array.isArray(value)) {
      throw new PluginManifestError(errorCode, `${field}["${locale}"] must be an array of strings`);
    }
    if (value.length > PLUGIN_TAGS_MAX_COUNT) {
      throw new PluginManifestError(
        errorCode,
        `${field}["${locale}"] exceeds ${PLUGIN_TAGS_MAX_COUNT} entries`
      );
    }
    const seen = /* @__PURE__ */ new Set();
    const items = [];
    for (const item of value) {
      if (typeof item !== "string") continue;
      if (item.length > PLUGIN_TAG_VALUE_MAX_LENGTH) {
        throw new PluginManifestError(
          errorCode,
          `${field}["${locale}"] tag exceeds ${PLUGIN_TAG_VALUE_MAX_LENGTH} characters`
        );
      }
      const trimmed = item.trim();
      if (trimmed.length === 0) continue;
      if (seen.has(trimmed)) continue;
      seen.add(trimmed);
      items.push(trimmed);
    }
    if (items.length > 0) out[locale] = items;
  }
  return Object.keys(out).length > 0 ? out : {};
}
function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function validatePluginSkillPath(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new PluginManifestError("invalid_skill", `${field} must be a non-empty string`);
  }
  if (value.length > PLUGIN_PATH_MAX_LENGTH) {
    throw new PluginManifestError(
      "invalid_skill",
      `${field} path exceeds ${PLUGIN_PATH_MAX_LENGTH} characters`
    );
  }
  if (!isSafeRelativePath(value)) {
    throw new PluginManifestError(
      "invalid_skill",
      `${field} "${value}" must be a relative path inside the plugin directory`
    );
  }
  if (!SKILL_MD_RE.test(value)) {
    throw new PluginManifestError("invalid_skill", `${field} "${value}" must end in .md`);
  }
}
function ensureI18nDict(raw, field, errorCode) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new PluginManifestError(
      errorCode,
      `${field} must be an object keyed by BCP47 locale (e.g. { "zh-CN": "...", "en-US": "..." })`
    );
  }
  return raw;
}
function assertBcp47(locale, field, errorCode) {
  if (!BCP47_LOCALE_RE.test(locale)) {
    throw new PluginManifestError(
      errorCode,
      `${field} key "${locale}" must be a BCP47 locale tag (e.g. "zh-CN", "en-US", "zh-Hans")`
    );
  }
}
function validatePathOrUrl(value, fieldLabel, errorCode, extRe) {
  if (isAbsoluteHttpUrl(value)) {
    if (value.length > PLUGIN_URL_MAX_LENGTH) {
      throw new PluginManifestError(
        errorCode,
        `${fieldLabel} URL exceeds ${PLUGIN_URL_MAX_LENGTH} characters`
      );
    }
    if (extRe) {
      const pathname = extractUrlPathname(value);
      if (!extRe.test(pathname)) {
        throw new PluginManifestError(
          errorCode,
          `${fieldLabel} URL "${value}" must end in an allowed extension (${extRe.source})`
        );
      }
    }
    return;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//")) {
    throw new PluginManifestError(
      errorCode,
      `${fieldLabel} "${value}" must be an http(s) URL or a relative path inside the plugin directory`
    );
  }
  if (value.length > PLUGIN_PATH_MAX_LENGTH) {
    throw new PluginManifestError(
      errorCode,
      `${fieldLabel} path exceeds ${PLUGIN_PATH_MAX_LENGTH} characters`
    );
  }
  if (!isSafeRelativePath(value)) {
    throw new PluginManifestError(
      errorCode,
      `${fieldLabel} "${value}" must be a relative path inside the plugin directory`
    );
  }
  if (extRe && !extRe.test(value)) {
    throw new PluginManifestError(
      errorCode,
      `${fieldLabel} "${value}" must end in an allowed extension (${extRe.source})`
    );
  }
}
function isAbsoluteHttpUrl(value) {
  return /^https?:\/\//i.test(value);
}
function extractUrlPathname(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
function isSafeRelativePath(p2) {
  if (p2.length === 0) return false;
  if (p2.startsWith("/") || p2.startsWith("\\") || /^[A-Za-z]:[\\/]/.test(p2)) return false;
  const normalised = p2.replace(/\\/g, "/");
  if (normalised === ".." || normalised.startsWith("../") || normalised.includes("/../")) {
    return false;
  }
  if (normalised.includes("\0")) return false;
  return true;
}
function parseOptionalSize(raw, field) {
  if (raw === void 0) return void 0;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    throw new PluginManifestError("invalid_size", `${field} must be a finite number`);
  }
  if (raw <= 0) {
    throw new PluginManifestError("invalid_size", `${field} must be greater than 0`);
  }
  if (raw > PLUGIN_SIZE_MAX) {
    throw new PluginManifestError(
      "invalid_size",
      `${field} ${raw} exceeds maximum ${PLUGIN_SIZE_MAX}`
    );
  }
  return Math.round(raw);
}
const HUB_ROOT_SEGMENTS = ["Movies", "Hub"];
const HILO_SKILL_SUBMISSION_STAGING_DIR_ENV = "HILO_SKILL_SUBMISSION_STAGING_DIR";
const SKILL_SUBMISSION_STAGING_DIR_NAME = "hilo-skill-submission";
function skillSubmissionStagingDir(tempRoot) {
  return path.join(tempRoot, SKILL_SUBMISSION_STAGING_DIR_NAME);
}
function hubRoot(context) {
  const region = context?.region ?? process.env.HILO_RELEASE_REGION;
  const channel = context?.channel ?? process.env.HILO_RELEASE_CHANNEL;
  if (region !== void 0 || channel !== void 0) {
    const parts = [];
    if (region === "overseas") parts.push("global");
    switch (channel) {
      case "staging":
        parts.push("staging");
        break;
      case "test":
        parts.push("test");
        break;
      case "dev":
        parts.push("dev");
        break;
    }
    const suffix = parts.length > 0 ? `-${parts.join("-")}` : "";
    return path.join(homedir(), `.hub${suffix}`);
  }
  const nodeEnv = process.env.NODE_ENV;
  let hubEnv;
  if (nodeEnv === "production") {
    hubEnv = "";
  } else if (nodeEnv === "development" || !nodeEnv) {
    hubEnv = "-dev";
  } else {
    hubEnv = `-${nodeEnv}`;
  }
  return path.join(homedir(), `.hub${hubEnv}`);
}
const CONNECTOR_SKILL_ORIGIN_FILE = ".connector-origin.json";
function installedSkillsDir(context) {
  const envDir = process.env.HUB_SKILLS_DIR;
  if (envDir) return envDir;
  return path.join(hubRoot(context), "skills");
}
function userPermissionsFile() {
  const envFile = process.env.HILO_SKILL_PERMISSIONS_FILE;
  if (envFile) return envFile;
  return path.join(hubRoot(), "skill-permissions.json");
}
function userSkillsDir() {
  return path.join(homedir(), ...HUB_ROOT_SEGMENTS, "skills");
}
function allSkillsDirs(context) {
  const extras = parseExtraSkillsDirs();
  const dirs = [userSkillsDir(), installedSkillsDir(context), ...extras];
  const seen = /* @__PURE__ */ new Set();
  return dirs.filter((d) => {
    if (seen.has(d)) return false;
    seen.add(d);
    return true;
  });
}
function parseExtraSkillsDirs() {
  const raw = process.env.EXTRA_SKILLS_DIRS;
  if (!raw) return [];
  const out = [];
  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const expanded = trimmed.startsWith("~/") ? path.join(homedir(), trimmed.slice(2)) : trimmed === "~" ? homedir() : trimmed;
    const absolute = path.resolve(expanded);
    if (!out.includes(absolute)) out.push(absolute);
  }
  return out;
}
function scanSkillDirs(dirs) {
  const seen = /* @__PURE__ */ new Map();
  const versions = /* @__PURE__ */ new Map();
  for (const dir of dirs) {
    if (!fs$1.existsSync(dir)) continue;
    let entries;
    try {
      entries = fs$1.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const skillMdPath = path.join(dir, entry.name, "SKILL.md");
      if (!fs$1.existsSync(skillMdPath)) continue;
      let name = entry.name;
      let version;
      try {
        const content = fs$1.readFileSync(skillMdPath, "utf-8");
        const meta = parseFrontmatter(content);
        if (meta.name) name = meta.name;
        if (meta.version) version = meta.version;
      } catch {
      }
      if (!seen.has(name)) {
        seen.set(name, path.join(dir, entry.name));
        if (version) versions.set(name, version);
      }
    }
  }
  return { paths: Array.from(seen.values()), versions };
}
function resolvedSkillPaths(context) {
  return scanSkillDirs(allSkillsDirs(context));
}
function subAgentSkillsDir() {
  return path.join(installedSkillsDir(), "sub-agent-skills");
}
function installedPluginsDir(context) {
  const envDir = process.env.HUB_PLUGINS_DIR;
  if (envDir) return envDir;
  return path.join(hubRoot(context), "plugins");
}
function userPluginsDir() {
  return path.join(homedir(), ...HUB_ROOT_SEGMENTS, "plugins");
}
function bundledPluginsDir(context) {
  const envDir = context?.bundledPluginsDir ?? process.env.HILO_BUNDLED_PLUGINS_DIR;
  return envDir && envDir.trim().length > 0 ? envDir : null;
}
function allPluginsDirs(context) {
  const bundled = bundledPluginsDir(context);
  const dirs = [userPluginsDir(), ...bundled ? [bundled] : [], installedPluginsDir(context)];
  const seen = /* @__PURE__ */ new Set();
  return dirs.filter((d) => {
    if (seen.has(d)) return false;
    seen.add(d);
    return true;
  });
}
function resolvedPluginSkillPaths(context) {
  const plugins = /* @__PURE__ */ new Map();
  const orderedParents = allPluginsDirs(context);
  const bundled = bundledPluginsDir(context);
  const parentRank = (parent) => parent === userPluginsDir() ? 3 : bundled && parent === bundled ? 2 : 1;
  for (const parent of orderedParents) {
    let entries;
    try {
      entries = fs$1.readdirSync(parent, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink() || plugins.has(entry.name)) continue;
      const root = path.join(parent, entry.name);
      try {
        const manifest = parsePluginManifest(
          fs$1.readFileSync(path.join(root, "manifest.json"), "utf8")
        );
        if (manifest.id !== entry.name) continue;
        const previous = plugins.get(manifest.id);
        if (!previous || parentRank(parent) > parentRank(path.dirname(previous.root))) {
          plugins.set(manifest.id, { root, manifest });
        }
      } catch {
      }
    }
  }
  const occupiedNames = /* @__PURE__ */ new Set();
  for (const skillDir of resolvedSkillPaths(context).paths) {
    try {
      const frontmatter = parseFrontmatter(
        fs$1.readFileSync(path.join(skillDir, "SKILL.md"), "utf8")
      );
      occupiedNames.add(frontmatter.name ?? path.basename(skillDir));
    } catch {
      occupiedNames.add(path.basename(skillDir));
    }
  }
  const skills = /* @__PURE__ */ new Map();
  for (const [pluginId, plugin] of plugins) {
    const declaration = plugin.manifest.skill;
    if (!declaration || typeof declaration === "string") continue;
    try {
      const realRoot = fs$1.realpathSync(plugin.root);
      const entryPath = fs$1.realpathSync(path.resolve(plugin.root, declaration.entry));
      if (entryPath !== realRoot && !entryPath.startsWith(realRoot + path.sep) || !fs$1.statSync(entryPath).isFile()) {
        continue;
      }
      const frontmatter = parseFrontmatter(fs$1.readFileSync(entryPath, "utf8"));
      if (frontmatter.name !== declaration.name || occupiedNames.has(declaration.name) || skills.has(declaration.name)) {
        continue;
      }
      const skillDir = path.dirname(entryPath);
      skills.set(declaration.name, {
        pluginId,
        pluginVersion: plugin.manifest.version,
        name: declaration.name,
        path: skillDir,
        entryPath
      });
    } catch {
    }
  }
  return { paths: [...skills.values()].map((skill) => skill.path), skills };
}
function pluginConfigDir() {
  const envDir = process.env.HUB_PLUGIN_CONFIG_DIR;
  if (envDir) return envDir;
  return path.join(hubRoot(), "plugin-config");
}
function pluginDataDir(id) {
  if (!PLUGIN_ID_RE.test(id)) {
    throw new Error(`pluginDataDir: invalid plugin id: ${JSON.stringify(id)}`);
  }
  const base = process.env.HUB_PLUGIN_DATA_DIR ?? path.join(hubRoot(), "plugin-data");
  return path.join(base, id);
}
const COMFYUI_PLUGIN_ID = "comfyui";
function comfyUiManagedDataDirs() {
  const controlRoot = pluginDataDir(COMFYUI_PLUGIN_ID);
  const candidates = [path.join(controlRoot, "userdata")];
  const modelPaths = readJsonRecord(path.join(controlRoot, "model-paths.json"));
  const managedDataDirectory = modelPaths?.managedDataDirectory;
  if (typeof managedDataDirectory === "string" && path.isAbsolute(managedDataDirectory)) {
    candidates.push(managedDataDirectory);
  }
  const config = readJsonRecord(path.join(pluginConfigDir(), `${COMFYUI_PLUGIN_ID}.json`));
  const installDirectory = config?.backendInstallDir;
  if (typeof installDirectory === "string" && path.isAbsolute(installDirectory)) {
    candidates.push(path.join(installDirectory, "userdata"));
  }
  return [...new Set(candidates.map((candidate) => path.resolve(candidate)))];
}
function readJsonRecord(filePath) {
  try {
    const value = JSON.parse(fs$1.readFileSync(filePath, "utf8"));
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}
function comfyUiBackendStatePath() {
  return path.join(pluginDataDir(COMFYUI_PLUGIN_ID), COMFYUI_BACKEND_STATE_FILE);
}
function comfyUiBackendOwnerPath() {
  return path.join(pluginDataDir(COMFYUI_PLUGIN_ID), COMFYUI_BACKEND_OWNER_FILE);
}
const DEFAULT_GRACE_MS = 1200;
const EXIT_POLL_INTERVAL_MS = 50;
const PS_TIMEOUT_MS = 3e3;
function publishComfyUiHostPid(pid = process.pid) {
  process.env[COMFYUI_HOST_PID_ENV] = String(pid);
}
function isProcessAlive$2(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err?.code === "EPERM";
  }
}
function readJsonFile$1(filePath) {
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf-8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function readProcessCommand(pid) {
  try {
    if (process.platform === "win32") {
      const stdout2 = execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`
        ],
        { encoding: "utf-8", timeout: PS_TIMEOUT_MS, windowsHide: true }
      );
      return stdout2.trim() || null;
    }
    const stdout = execFileSync("ps", ["-o", "command=", "-p", String(pid)], {
      encoding: "utf-8",
      timeout: PS_TIMEOUT_MS
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}
function isManagedBackendProcess(pid) {
  const command = readProcessCommand(pid);
  if (!command) return false;
  const backendRoot = path.join(pluginDataDir(COMFYUI_PLUGIN_ID), "backend");
  const normalized = command.replaceAll("\\", "/");
  return normalized.includes(backendRoot.replaceAll("\\", "/"));
}
function signalBackend(pid, signal) {
  if (process.platform === "win32") {
    if (signal === "SIGKILL") {
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        timeout: PS_TIMEOUT_MS,
        windowsHide: true
      });
    }
    return;
  }
  try {
    process.kill(-pid, signal);
  } catch (err) {
    if (err?.code !== "ESRCH") {
      try {
        process.kill(pid, signal);
      } catch {
      }
    }
  }
}
function clearOwnerRecord() {
  try {
    rmSync(comfyUiBackendOwnerPath(), { force: true });
  } catch {
  }
}
function classifyCurrent(selfPid) {
  return classifyComfyUiBackend({
    state: readJsonFile$1(comfyUiBackendStatePath()),
    owner: readJsonFile$1(comfyUiBackendOwnerPath()),
    selfPid,
    isProcessAlive: isProcessAlive$2
  });
}
async function reapComfyUiBackend(selfPid, phase, log, options = {}) {
  const classification = classifyCurrent(selfPid);
  const { backendPid, ownership, reason } = classification;
  if (!mayReapComfyUiBackend(classification, phase)) {
    if (ownership === "foreign-live") {
      log?.info(`[comfyui] leaving backend ${backendPid} alone: ${reason}`);
    }
    if (ownership === "none") clearOwnerRecord();
    return { classification, reaped: false };
  }
  if (backendPid === null) return { classification, reaped: false };
  if (!isManagedBackendProcess(backendPid)) {
    log?.warn(`[comfyui] pid ${backendPid} is not the managed backend; skipping (${reason})`);
    clearOwnerRecord();
    return { classification, reaped: false };
  }
  log?.info(`[comfyui] reaping backend ${backendPid} at ${phase}: ${reason}`);
  signalBackend(backendPid, "SIGTERM");
  const graceMs = options.graceMs ?? DEFAULT_GRACE_MS;
  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline) {
    if (!isProcessAlive$2(backendPid)) {
      clearOwnerRecord();
      return { classification, reaped: true };
    }
    await new Promise((resolve2) => setTimeout(resolve2, EXIT_POLL_INTERVAL_MS));
  }
  log?.warn(`[comfyui] backend ${backendPid} ignored SIGTERM after ${graceMs}ms; forcing`);
  signalBackend(backendPid, "SIGKILL");
  clearOwnerRecord();
  return { classification, reaped: true };
}
const NODE_EXTRA_CA_CERTS_ENV_KEY = "NODE_EXTRA_CA_CERTS";
function applyNodeExtraCaCerts(env, pemPath) {
  const trimmedPath = pemPath?.trim();
  if (!trimmedPath) return;
  if (env[NODE_EXTRA_CA_CERTS_ENV_KEY]) return;
  env[NODE_EXTRA_CA_CERTS_ENV_KEY] = trimmedPath;
}
const CACHE_FILENAME = "system-ca-certs-v2.pem";
const DEFAULT_EXPORT_TIMEOUT_MS = 1e4;
const DEFAULT_COLD_START_WAIT_MS = 1e4;
const DEFAULT_STALE_AFTER_MS = 6 * 60 * 60 * 1e3;
const CERTIFICATE_MARKER = "BEGIN CERTIFICATE";
const PEM_CERTIFICATE_PATTERN = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
const DEFAULT_DARWIN_KEYCHAINS = [
  "/System/Library/Keychains/SystemRootCertificates.keychain",
  "/Library/Keychains/System.keychain"
];
const refreshPromises = /* @__PURE__ */ new Map();
const refreshAttemptedPaths = /* @__PURE__ */ new Set();
const WINDOWS_EXPORT_SCRIPT = `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$stores = @('Cert:\\LocalMachine\\Root', 'Cert:\\CurrentUser\\Root')
foreach ($storePath in $stores) {
  try {
    foreach ($cert in (Get-ChildItem -Path $storePath)) {
      $b64 = [Convert]::ToBase64String($cert.RawData, 'InsertLineBreaks')
      Write-Output "-----BEGIN CERTIFICATE-----"
      Write-Output $b64
      Write-Output "-----END CERTIFICATE-----"
    }
  } catch {}
}
`.trim();
function canonicalizePemCertificate(pem) {
  const body = pem.replace("-----BEGIN CERTIFICATE-----", "").replace("-----END CERTIFICATE-----", "").replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g);
  if (!lines) return void 0;
  return `-----BEGIN CERTIFICATE-----
${lines.join("\n")}
-----END CERTIFICATE-----`;
}
function mergeCaCertificates(sources) {
  const certificates = /* @__PURE__ */ new Set();
  for (const source of sources) {
    if (!source) continue;
    for (const match of source.matchAll(PEM_CERTIFICATE_PATTERN)) {
      const certificate = canonicalizePemCertificate(match[0]);
      if (certificate) certificates.add(certificate);
    }
  }
  if (certificates.size === 0) return void 0;
  return `${[...certificates].join("\n")}
`;
}
function countPemCertificates(pem) {
  return pem?.match(PEM_CERTIFICATE_PATTERN)?.length ?? 0;
}
function getSystemCaCachePath(userDataPath) {
  return path.join(userDataPath, CACHE_FILENAME);
}
function resolveSystemCaExportCommand(options = {}) {
  const platform = options.platform ?? process.platform;
  if (platform === "win32") {
    return {
      cmd: "powershell.exe",
      args: ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_EXPORT_SCRIPT]
    };
  }
  if (platform === "darwin") {
    const existsSync$1 = options.existsSync ?? existsSync;
    const keychainPaths = options.keychainPaths ?? DEFAULT_DARWIN_KEYCHAINS.filter((keychainPath) => existsSync$1(keychainPath));
    const readableKeychains = keychainPaths.filter(
      (keychainPath) => keychainPath.trim().length > 0
    );
    if (readableKeychains.length === 0) return void 0;
    return {
      cmd: "security",
      args: ["find-certificate", "-a", "-p", ...readableKeychains]
    };
  }
  return void 0;
}
async function runSystemCaExport(options) {
  const command = resolveSystemCaExportCommand(options);
  if (!command) return void 0;
  const spawn$1 = options.spawn ?? ((command2, args, spawnOptions) => spawn(command2, args, spawnOptions));
  const timeoutMs = options.exportTimeoutMs ?? DEFAULT_EXPORT_TIMEOUT_MS;
  return new Promise((resolve2) => {
    let stdout = "";
    let settled = false;
    let child;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve2(value);
    };
    const timer = setTimeout(() => {
      child?.kill();
      options.log?.warn?.(`[system-ca] export timed out after ${timeoutMs}ms`);
      finish(void 0);
    }, timeoutMs);
    try {
      child = spawn$1(command.cmd, command.args, { windowsHide: true });
    } catch (error) {
      options.log?.warn?.(`[system-ca] export spawn failed: ${String(error)}`);
      finish(void 0);
      return;
    }
    if (!child.stdout) {
      options.log?.warn?.("[system-ca] export stdout unavailable");
      finish(void 0);
      return;
    }
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.on("error", (error) => {
      options.log?.warn?.(`[system-ca] export spawn failed: ${String(error)}`);
      finish(void 0);
    });
    child.on("close", () => {
      finish(stdout.includes(CERTIFICATE_MARKER) ? stdout : void 0);
    });
  });
}
async function refreshSystemCaCache(userDataPath, options) {
  const systemPem = await runSystemCaExport(options);
  const bundledCaCerts = options.bundledCaCerts ?? rootCertificates;
  const pem = mergeCaCertificates([bundledCaCerts.join("\n"), systemPem]);
  if (!pem) return void 0;
  const cachePath = getSystemCaCachePath(userDataPath);
  try {
    mkdirSync(path.dirname(cachePath), { recursive: true });
    writeFileSync(cachePath, pem, "utf8");
    const count = countPemCertificates(pem);
    const bundledCount = bundledCaCerts.length;
    const systemCount = countPemCertificates(systemPem);
    options.log?.info?.(
      `[system-ca] cached ${count} CA certs (${bundledCount} bundled input, ${systemCount} system input) to ${cachePath}`
    );
    return cachePath;
  } catch (error) {
    options.log?.warn?.(`[system-ca] failed to write cache: ${String(error)}`);
    return void 0;
  }
}
function refreshSystemCaCacheOnce(userDataPath, options) {
  const cachePath = getSystemCaCachePath(userDataPath);
  const existing = refreshPromises.get(cachePath);
  if (existing) return existing;
  refreshAttemptedPaths.add(cachePath);
  const refreshPromise = refreshSystemCaCache(userDataPath, options).finally(() => {
    refreshPromises.delete(cachePath);
  });
  refreshPromises.set(cachePath, refreshPromise);
  return refreshPromise;
}
function waitForColdCacheExport(refreshPromise, options) {
  const waitMs = options.coldStartWaitMs ?? DEFAULT_COLD_START_WAIT_MS;
  if (waitMs <= 0) {
    return Promise.resolve(void 0);
  }
  return new Promise((resolve2) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve2(value);
    };
    const timer = setTimeout(() => {
      finish(void 0);
      options.log?.warn?.(
        `[system-ca] cold export still running after ${waitMs}ms; continuing startup without extra CA for this spawn`
      );
    }, waitMs);
    refreshPromise.then(finish, () => finish(void 0));
  });
}
async function ensureSystemCaCerts(userDataPath, options = {}) {
  if (!resolveSystemCaExportCommand(options)) return void 0;
  const cachePath = getSystemCaCachePath(userDataPath);
  if (existsSync(cachePath)) {
    const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
    const now = options.now ?? Date.now;
    try {
      const ageMs = now() - statSync(cachePath).mtimeMs;
      if (!refreshAttemptedPaths.has(cachePath) || ageMs > staleAfterMs) {
        void refreshSystemCaCacheOnce(userDataPath, options);
      }
    } catch {
      void refreshSystemCaCacheOnce(userDataPath, options);
    }
    return cachePath;
  }
  return waitForColdCacheExport(refreshSystemCaCacheOnce(userDataPath, options), options);
}
var _util;
((_util2) => {
  _util2.serviceIds = /* @__PURE__ */ new Map();
  _util2.DI_TARGET = "$di$target";
  _util2.DI_DEPENDENCIES = "$di$dependencies";
  function getServiceDependencies(ctor) {
    return ctor[_util2.DI_DEPENDENCIES] || [];
  }
  _util2.getServiceDependencies = getServiceDependencies;
})(_util || (_util = {}));
const IInstantiationService = createDecorator("instantiationService");
function storeServiceDependency(id, target, index) {
  if (target[_util.DI_TARGET] === target) {
    target[_util.DI_DEPENDENCIES].push({ id, index });
  } else {
    target[_util.DI_DEPENDENCIES] = [{ id, index }];
    target[_util.DI_TARGET] = target;
  }
}
function createDecorator(serviceId) {
  if (_util.serviceIds.has(serviceId)) {
    return _util.serviceIds.get(serviceId);
  }
  const id = function(target, _key, index) {
    if (arguments.length !== 3) {
      throw new Error("@IServiceName-decorator can only be used to decorate a parameter");
    }
    storeServiceDependency(id, target, index);
  };
  id.toString = () => serviceId;
  _util.serviceIds.set(serviceId, id);
  return id;
}
const ENV_LOG_DIR = "LOG_DIR";
const IGatewayManager = createDecorator("gatewayManager");
const errorListeners = [];
function onUnexpectedError(e) {
  if (!isCancellationError(e)) {
    for (const listener2 of errorListeners) {
      listener2(e);
    }
  }
  return void 0;
}
function errorHandler(listener2) {
  errorListeners.push(listener2);
  return () => {
    const idx = errorListeners.indexOf(listener2);
    if (idx >= 0) {
      errorListeners.splice(idx, 1);
    }
  };
}
function illegalState(name) {
  {
    return new Error(`Illegal state: ${name}`);
  }
}
const canceledName = "Canceled";
function isCancellationError(error) {
  if (error instanceof CancellationError) {
    return true;
  }
  return error instanceof Error && error.name === canceledName && error.message === canceledName;
}
class CancellationError extends Error {
  constructor() {
    super(canceledName);
    this.name = this.message;
  }
}
class ErrorNoTelemetry extends Error {
  name;
  constructor(msg) {
    super(msg);
    this.name = "ErrorNoTelemetry";
  }
  static fromError(err) {
    if (err instanceof ErrorNoTelemetry) {
      return err;
    }
    const result = new ErrorNoTelemetry();
    result.message = err.message;
    result.stack = err.stack;
    return result;
  }
  static isErrorNoTelemetry(err) {
    return err.name === "ErrorNoTelemetry";
  }
}
function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}
const PATH_ACCESS_DENIED_PREFIX = "Access denied:";
function createSingleCallFunction(fn, fnDidRunCallback) {
  const _this = this;
  let didCall = false;
  let result;
  return function() {
    if (didCall) {
      return result;
    }
    didCall = true;
    {
      result = fn.apply(_this, arguments);
    }
    return result;
  };
}
function isDisposable(thing) {
  return typeof thing === "object" && thing !== null && typeof thing.dispose === "function" && thing.dispose.length === 0;
}
function dispose(arg) {
  if (arg !== void 0 && arg !== null) {
    if (Symbol.iterator in arg) {
      const errors = [];
      for (const d of arg) {
        if (d) {
          try {
            d.dispose();
          } catch (e) {
            errors.push(e);
          }
        }
      }
      if (errors.length === 1) {
        throw errors[0];
      } else if (errors.length > 1) {
        throw new AggregateError(errors, "Encountered errors while disposing of store");
      }
      return Array.isArray(arg) ? [] : arg;
    } else {
      arg.dispose();
      return arg;
    }
  }
}
function combinedDisposable(...disposables) {
  return toDisposable(() => dispose(disposables));
}
function toDisposable(fn) {
  const self = {
    dispose: createSingleCallFunction(fn)
  };
  return self;
}
class DisposableStore {
  static DISABLE_DISPOSED_WARNING = false;
  _toDispose = /* @__PURE__ */ new Set();
  _isDisposed = false;
  /**
   * Dispose of all registered disposables and mark this object as disposed.
   */
  dispose() {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.clear();
  }
  /**
   * @return `true` if this object has been disposed of.
   */
  get isDisposed() {
    return this._isDisposed;
  }
  /**
   * Dispose of all registered disposables but do not mark this object as disposed.
   */
  clear() {
    if (this._toDispose.size === 0) {
      return;
    }
    try {
      dispose(this._toDispose);
    } finally {
      this._toDispose.clear();
    }
  }
  /**
   * Add a new {@link IDisposable disposable} to the collection.
   */
  add(o) {
    if (!o || o === Disposable.None) {
      return o;
    }
    if (o === this) {
      throw new Error("Cannot register a disposable on itself!");
    }
    if (this._isDisposed) {
      {
        console.warn(
          new Error(
            "Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!"
          ).stack
        );
      }
    } else {
      this._toDispose.add(o);
    }
    return o;
  }
  /**
   * Deletes a disposable from store and disposes of it.
   */
  delete(o) {
    if (!o) {
      return;
    }
    if (o === this) {
      throw new Error("Cannot dispose a disposable on itself!");
    }
    this._toDispose.delete(o);
    o.dispose();
  }
  /**
   * Deletes the value from the store, but does not dispose it.
   */
  deleteAndLeak(o) {
    if (!o) {
      return;
    }
    this._toDispose.delete(o);
  }
}
class Disposable {
  /**
   * A disposable that does nothing when it is disposed of.
   */
  static None = Object.freeze({ dispose() {
  } });
  _store = new DisposableStore();
  dispose() {
    this._store.dispose();
  }
  /**
   * Adds `o` to the collection of disposables managed by this object.
   */
  _register(o) {
    if (o === this) {
      throw new Error("Cannot register a disposable on itself!");
    }
    return this._store.add(o);
  }
}
class MutableDisposable {
  _value;
  _isDisposed = false;
  get value() {
    return this._isDisposed ? void 0 : this._value;
  }
  set value(value) {
    if (this._isDisposed || value === this._value) {
      return;
    }
    this._value?.dispose();
    this._value = value;
  }
  clear() {
    this.value = void 0;
  }
  dispose() {
    this._isDisposed = true;
    this._value?.dispose();
    this._value = void 0;
  }
  clearAndLeak() {
    const oldValue = this._value;
    this._value = void 0;
    return oldValue;
  }
}
class Node {
  static Undefined = new Node(void 0);
  element;
  next;
  prev;
  constructor(element) {
    this.element = element;
    this.next = Node.Undefined;
    this.prev = Node.Undefined;
  }
}
class LinkedList {
  _first = Node.Undefined;
  _last = Node.Undefined;
  _size = 0;
  get size() {
    return this._size;
  }
  isEmpty() {
    return this._first === Node.Undefined;
  }
  clear() {
    let node = this._first;
    while (node !== Node.Undefined) {
      const next = node.next;
      node.prev = Node.Undefined;
      node.next = Node.Undefined;
      node = next;
    }
    this._first = Node.Undefined;
    this._last = Node.Undefined;
    this._size = 0;
  }
  unshift(element) {
    return this._insert(element, false);
  }
  push(element) {
    return this._insert(element, true);
  }
  _insert(element, atTheEnd) {
    const newNode = new Node(element);
    if (this._first === Node.Undefined) {
      this._first = newNode;
      this._last = newNode;
    } else if (atTheEnd) {
      const oldLast = this._last;
      this._last = newNode;
      newNode.prev = oldLast;
      oldLast.next = newNode;
    } else {
      const oldFirst = this._first;
      this._first = newNode;
      newNode.next = oldFirst;
      oldFirst.prev = newNode;
    }
    this._size += 1;
    let didRemove = false;
    return () => {
      if (!didRemove) {
        didRemove = true;
        this._remove(newNode);
      }
    };
  }
  shift() {
    if (this._first === Node.Undefined) {
      return void 0;
    } else {
      const res = this._first.element;
      this._remove(this._first);
      return res;
    }
  }
  pop() {
    if (this._last === Node.Undefined) {
      return void 0;
    } else {
      const res = this._last.element;
      this._remove(this._last);
      return res;
    }
  }
  _remove(node) {
    if (node.prev !== Node.Undefined && node.next !== Node.Undefined) {
      const anchor = node.prev;
      anchor.next = node.next;
      node.next.prev = anchor;
    } else if (node.prev === Node.Undefined && node.next === Node.Undefined) {
      this._first = Node.Undefined;
      this._last = Node.Undefined;
    } else if (node.next === Node.Undefined) {
      this._last = this._last.prev;
      this._last.next = Node.Undefined;
    } else if (node.prev === Node.Undefined) {
      this._first = this._first.next;
      this._first.prev = Node.Undefined;
    }
    this._size -= 1;
  }
  *[Symbol.iterator]() {
    let node = this._first;
    while (node !== Node.Undefined) {
      yield node.element;
      node = node.next;
    }
  }
}
var Event;
((Event2) => {
  Event2.None = () => Disposable.None;
  function once(event) {
    return (listener2, thisArgs = null, disposables) => {
      let didFire = false;
      let result;
      result = event(
        (e) => {
          if (didFire) {
            return;
          } else if (result) {
            result.dispose();
          } else {
            didFire = true;
          }
          return listener2.call(thisArgs, e);
        },
        null,
        disposables
      );
      if (didFire) {
        result.dispose();
      }
      return result;
    };
  }
  Event2.once = once;
  function map(event, map2, disposable) {
    return snapshot2((listener2, thisArgs = null, disposables) => {
      return event((i) => listener2.call(thisArgs, map2(i)), null, disposables);
    }, disposable);
  }
  Event2.map = map;
  function filter(event, filter2, disposable) {
    return snapshot2(
      (listener2, thisArgs = null, disposables) => event((e) => filter2(e) && listener2.call(thisArgs, e), null, disposables),
      disposable
    );
  }
  Event2.filter = filter;
  function signal(event) {
    return event;
  }
  Event2.signal = signal;
  function any(...events) {
    return (listener2, thisArgs = null, disposables) => {
      const disposable = combinedDisposable(
        ...events.map((event) => event((e) => listener2.call(thisArgs, e)))
      );
      return addAndReturnDisposable(disposable, disposables);
    };
  }
  Event2.any = any;
  function snapshot2(event, disposable) {
    let listener2;
    const emitter = new Emitter({
      onWillAddFirstListener() {
        listener2 = event(emitter.fire, emitter);
      },
      onDidRemoveLastListener() {
        listener2?.dispose();
      }
    });
    disposable?.add(emitter);
    return emitter.event;
  }
  function toPromise(event) {
    return new Promise((resolve2) => once(event)(resolve2));
  }
  Event2.toPromise = toPromise;
  function buffer(event, _flushAfterTimeout = false, _buffer = [], disposable) {
    let buffer2 = _buffer.slice();
    let listener2 = event((e) => {
      if (buffer2) {
        buffer2.push(e);
      } else {
        emitter.fire(e);
      }
    });
    if (disposable) {
      disposable.add(listener2);
    }
    const flush = () => {
      if (buffer2) {
        for (const e of buffer2) {
          emitter.fire(e);
        }
      }
      buffer2 = null;
    };
    const emitter = new Emitter({
      onWillAddFirstListener() {
        if (!listener2) {
          listener2 = event((e) => emitter.fire(e));
          if (disposable) {
            disposable.add(listener2);
          }
        }
      },
      onDidAddFirstListener() {
        if (buffer2) {
          flush();
        }
      },
      onDidRemoveLastListener() {
        if (listener2) {
          listener2.dispose();
        }
        listener2 = null;
        buffer2 = [];
      }
    });
    if (disposable) {
      disposable.add(emitter);
    }
    return emitter.event;
  }
  Event2.buffer = buffer;
  function fromNodeEventEmitter(emitter, eventName, map2 = (id) => id) {
    const fn = (...args) => result.fire(map2(...args));
    const onFirstListenerAdd = () => emitter.on(eventName, fn);
    const onLastListenerRemove = () => emitter.removeListener(eventName, fn);
    const result = new Emitter({
      onWillAddFirstListener: onFirstListenerAdd,
      onDidRemoveLastListener: onLastListenerRemove
    });
    return result.event;
  }
  Event2.fromNodeEventEmitter = fromNodeEventEmitter;
  function addAndReturnDisposable(d, store) {
    if (Array.isArray(store)) {
      store.push(d);
    } else if (store) {
      store.add(d);
    }
    return d;
  }
})(Event || (Event = {}));
class Emitter {
  _options;
  _disposed;
  _event;
  _deliveryQueue;
  _listeners;
  constructor(options) {
    this._options = options;
  }
  dispose() {
    if (!this._disposed) {
      this._disposed = true;
      if (this._listeners) {
        this._listeners.clear();
      }
      this._deliveryQueue?.clear();
    }
  }
  /**
   * For the public to allow to subscribe to events from this Emitter
   */
  get event() {
    this._event ??= (listener2, thisArgs, disposables) => {
      if (!this._listeners) {
        this._listeners = new LinkedList();
      }
      const firstListener = this._listeners.isEmpty();
      if (firstListener && this._options?.onWillAddFirstListener) {
        this._options.onWillAddFirstListener(this);
      }
      let removeListener;
      let listenerObj;
      if (thisArgs) {
        listenerObj = (e) => {
          listener2.call(thisArgs, e);
        };
      } else {
        listenerObj = listener2;
      }
      removeListener = this._listeners.push(listenerObj);
      if (firstListener && this._options?.onDidAddFirstListener) {
        this._options.onDidAddFirstListener(this);
      }
      this._options?.onDidAddListener?.();
      const result = toDisposable(() => {
        if (!this._disposed) {
          this._options?.onWillRemoveListener?.(this);
          removeListener?.();
          if (this._options?.onDidRemoveLastListener) {
            const hasListeners = this._listeners && !this._listeners.isEmpty();
            if (!hasListeners) {
              this._options.onDidRemoveLastListener(this);
            }
          }
        }
      });
      if (disposables instanceof DisposableStore) {
        disposables.add(result);
      } else if (Array.isArray(disposables)) {
        disposables.push(result);
      }
      return result;
    };
    return this._event;
  }
  /**
   * To be kept private to fire an event to subscribers
   */
  fire(event) {
    if (this._listeners) {
      if (!this._deliveryQueue) {
        this._deliveryQueue = new EventDeliveryQueue();
      }
      for (const listener2 of this._listeners) {
        this._deliveryQueue.push(listener2, event);
      }
      const onListenerError = this._options?.onListenerError || onUnexpectedError;
      while (this._deliveryQueue.size > 0) {
        const entry = this._deliveryQueue.shift();
        if (!entry) break;
        const [listener2, event2] = entry;
        try {
          listener2(event2);
        } catch (e) {
          onListenerError(e);
        }
      }
    }
  }
  hasListeners() {
    return !!this._listeners && !this._listeners.isEmpty();
  }
}
class EventDeliveryQueue {
  _queue = [];
  get size() {
    return this._queue.length;
  }
  push(listener2, event) {
    this._queue.push([listener2, event]);
  }
  shift() {
    return this._queue.shift();
  }
  clear() {
    this._queue.length = 0;
  }
}
class Relay {
  listening = false;
  inputEvent = Event.None;
  inputEventListener = Disposable.None;
  emitter = new Emitter({
    onDidAddFirstListener: () => {
      this.listening = true;
      this.inputEventListener = this.inputEvent(this.emitter.fire, this.emitter);
    },
    onDidRemoveLastListener: () => {
      this.listening = false;
      this.inputEventListener.dispose();
    }
  });
  event = this.emitter.event;
  set input(event) {
    this.inputEvent = event;
    if (this.listening) {
      this.inputEventListener.dispose();
      this.inputEventListener = event(this.emitter.fire, this.emitter);
    }
  }
  dispose() {
    this.inputEventListener.dispose();
    this.emitter.dispose();
  }
}
class EventMultiplexer {
  emitter;
  hasListeners = false;
  events = [];
  constructor() {
    this.emitter = new Emitter({
      onWillAddFirstListener: () => this.onFirstListenerAdd(),
      onDidRemoveLastListener: () => this.onLastListenerRemove()
    });
  }
  get event() {
    return this.emitter.event;
  }
  add(event) {
    const e = { event, listener: null };
    this.events.push(e);
    if (this.hasListeners) {
      this.hook(e);
    }
    const dispose2 = () => {
      if (this.hasListeners) {
        this.unhook(e);
      }
      const idx = this.events.indexOf(e);
      this.events.splice(idx, 1);
    };
    return toDisposable(createSingleCallFunction(dispose2));
  }
  onFirstListenerAdd() {
    this.hasListeners = true;
    for (const e of this.events) {
      this.hook(e);
    }
  }
  onLastListenerRemove() {
    this.hasListeners = false;
    for (const e of this.events) {
      this.unhook(e);
    }
  }
  hook(e) {
    e.listener = e.event((r) => this.emitter.fire(r));
  }
  unhook(e) {
    e.listener?.dispose();
    e.listener = null;
  }
  dispose() {
    this.emitter.dispose();
  }
}
const LINEAR_STARTUP_PHASES = ["inactive", "starting", "ready", "restored", "running"];
new Set(LINEAR_STARTUP_PHASES);
const GATEWAY_TELEMETRY_PREFIX = "__HILO_TELEMETRY__";
const TERMINAL_STATES = /* @__PURE__ */ new Set(["failed", "stopped"]);
function isGatewayReady(s3) {
  return s3 === "gateway-ready" || s3 === "opencode-starting" || s3 === "bound";
}
function canTransition(from, to2) {
  if (from === to2) return true;
  if (from === "failed" && to2 === "stopped") return true;
  if (TERMINAL_STATES.has(from)) return false;
  if (to2 === "failed") return true;
  if (to2 === "stopping") return from !== "stopped";
  if (to2 === "stopped") return from === "stopping" || from === "failed";
  const order = [
    "creating",
    "gateway-starting",
    "gateway-ready",
    "opencode-starting",
    "bound"
  ];
  const fromIdx = order.indexOf(from);
  const toIdx = order.indexOf(to2);
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx > fromIdx;
}
const WORKSPACE_LIFECYCLE_TERMINAL_STATES = /* @__PURE__ */ new Set([
  "failed",
  "stopped"
]);
const WORKSPACE_LIFECYCLE_ALLOWED_TRANSITIONS = /* @__PURE__ */ new Map([
  ["cold", /* @__PURE__ */ new Set(["starting", "stopped"])],
  ["starting", /* @__PURE__ */ new Set(["gateway-ready", "failed", "stopping"])],
  ["gateway-ready", /* @__PURE__ */ new Set(["bound", "failed", "stopping"])],
  ["bound", /* @__PURE__ */ new Set(["background", "failed", "stopping"])],
  ["background", /* @__PURE__ */ new Set(["bound", "suspending", "failed", "stopping"])],
  ["suspending", /* @__PURE__ */ new Set(["suspended", "failed", "stopped"])],
  ["suspended", /* @__PURE__ */ new Set(["resuming", "stopped"])],
  ["resuming", /* @__PURE__ */ new Set(["starting", "failed", "stopping"])],
  ["failed", /* @__PURE__ */ new Set(["stopped"])],
  ["stopping", /* @__PURE__ */ new Set(["stopped"])],
  ["stopped", /* @__PURE__ */ new Set()]
]);
function isWorkspaceLifecycleTerminal(state) {
  return WORKSPACE_LIFECYCLE_TERMINAL_STATES.has(state);
}
function canTransitionWorkspaceLifecycle(from, to2) {
  if (from === to2) return true;
  return WORKSPACE_LIFECYCLE_ALLOWED_TRANSITIONS.get(from)?.has(to2) ?? false;
}
var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2[LogLevel2["Trace"] = 0] = "Trace";
  LogLevel2[LogLevel2["Debug"] = 1] = "Debug";
  LogLevel2[LogLevel2["Info"] = 2] = "Info";
  LogLevel2[LogLevel2["Warning"] = 3] = "Warning";
  LogLevel2[LogLevel2["Error"] = 4] = "Error";
  return LogLevel2;
})(LogLevel || {});
const ILogService = createDecorator("logService");
const CONTRACTS_STAGING_MARKER_FILENAME = ".contracts-staging-marker.json";
function resolveContractsDirFromConfigDir(configDir, _isPackaged) {
  return path.join(configDir, "contracts");
}
function resolveContractsStagingMarkerPath(stagingDir) {
  return path.join(stagingDir, CONTRACTS_STAGING_MARKER_FILENAME);
}
const PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS = 4;
const PROJECT_ASSET_MAX_FOLDER_DEPTH = PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS - 1;
const PROJECT_ASSET_MAX_FILE_DEPTH = PROJECT_ASSET_MAX_FOLDER_DEPTH + 1;
const CLOUD_ASSET_EXTENSIONS = {
  text: ["txt", "md", "json", "yaml", "csv", "pdf", "doc", "docx"],
  image: ["png", "jpg", "jpeg", "webp", "gif"],
  video: ["mp4", "webm"],
  audio: ["mp3", "wav", "m4a", "ogg"],
  archive: [],
  table: ["htable"]
};
const EXTENSION_TO_CATEGORY = new Map(
  Object.entries(CLOUD_ASSET_EXTENSIONS).flatMap(
    ([category, exts]) => exts.map((ext) => [ext, category])
  )
);
[...EXTENSION_TO_CATEGORY.keys()].map((ext) => `.${ext}`).join(",");
function dataRoot() {
  const dir = process.env.HILO_DATA_DIR;
  return dir?.trim() ? dir.trim() : void 0;
}
function resolveProjectsRoot() {
  const root = dataRoot();
  if (root) return path.join(root, "Projects");
  return path.join(homedir(), ...HUB_ROOT_SEGMENTS, "Projects");
}
const PROJECT_ASSETS_DIR_NAME = ".assets";
const PROJECT_SPACES_DIR_NAME = ".projects";
const PROJECT_INTERNAL_DIR_NAME = ".hilo";
const PROJECT_ASSET_INDEX_DB_NAME = "project-assets.sqlite";
const ANCHOR_PENDING_EVENTS_FILE = "anchor-pending-events.jsonl";
function resolveProjectLocationsPath(projectsRoot = resolveProjectsRoot()) {
  return path.join(
    projectsRoot,
    PROJECT_SPACES_DIR_NAME,
    `${path.basename(hubRoot())}-locations.json`
  );
}
function resolveProjectFolder(folderName, projectsRoot = resolveProjectsRoot()) {
  if (!folderName || folderName === "." || folderName === ".." || /[\\/:\0]/.test(folderName)) {
    throw new Error("Project folder name must be a single path segment");
  }
  let contents;
  try {
    contents = readFileSync(resolveProjectLocationsPath(projectsRoot), "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return path.join(projectsRoot, PROJECT_SPACES_DIR_NAME, folderName);
  }
  const locations = JSON.parse(contents);
  if (!locations || typeof locations !== "object" || Array.isArray(locations)) {
    throw new Error("Invalid project directory bindings");
  }
  if (Object.hasOwn(locations, folderName)) {
    const location = locations[folderName];
    if (typeof location !== "string" || !path.isAbsolute(location)) {
      throw new Error("Invalid project directory binding");
    }
    if (!statSync(location).isDirectory()) throw new Error("Project directory is unavailable");
    return location;
  }
  return path.join(projectsRoot, PROJECT_SPACES_DIR_NAME, folderName);
}
function resolveProjectSpacesRoot() {
  return path.join(resolveProjectsRoot(), PROJECT_SPACES_DIR_NAME);
}
const ASSET_LEAF_MAX_CHARS = 180;
function sanitizeAssetLeaf(name) {
  const idx = name.lastIndexOf(".");
  const hasExt = idx > 0 && idx < name.length - 1;
  const stem = hasExt ? name.slice(0, idx) : name;
  const ext = hasExt ? sanitizeFileName(name.slice(idx + 1), 20) : "";
  const safeStem = sanitizeFileName(stem, ASSET_LEAF_MAX_CHARS);
  if (!safeStem) return ext ? `asset.${ext}` : "asset";
  return ext ? `${safeStem}.${ext}` : safeStem;
}
function resolveOutputDir(userDataPath) {
  const root = dataRoot();
  if (root) return path.join(root, "output_files");
  return path.join(userDataPath, "output_files");
}
function resolveRuntimesDir() {
  return path.join(hubRoot(), "runtimes");
}
function resolveRuntimeDir(name) {
  return path.join(resolveRuntimesDir(), name);
}
function resolveAssetCenterRoot(configuredAssetCenterDir) {
  const envOverride = process.env.HILO_ASSET_CENTER_DIR;
  if (envOverride?.trim()) return envOverride.trim();
  const userConfigured = configuredAssetCenterDir?.trim();
  if (userConfigured) return userConfigured;
  return defaultAssetCenterRoot();
}
function defaultAssetCenterRoot() {
  const root = dataRoot();
  if (root) return path.join(root, ".asset-center");
  return path.join(homedir(), ...HUB_ROOT_SEGMENTS, ".asset-center");
}
function resolvePythonPackagesDir() {
  return path.join(resolveRuntimesDir(), "python-packages");
}
function resolvePythonPackageDir(packageName) {
  return path.join(resolvePythonPackagesDir(), packageName);
}
function resolveNodePackagesDir() {
  return path.join(resolveRuntimesDir(), "node-packages");
}
function resolveNodePackageDir(packageName) {
  return path.join(resolveNodePackagesDir(), packageName);
}
function resolveHubCliBinDir() {
  return path.join(resolveRuntimesDir(), "cli-bin");
}
function resolveConnectorDataDir(userDataDir, connectorId) {
  if (!/^[a-z0-9-]+$/.test(connectorId)) throw new Error("Invalid connector id");
  return path.join(userDataDir, "connectors", connectorId);
}
function resolveKnowledgeDirFromConfigDir(configDir, _isPackaged) {
  return path.join(configDir, "knowledge");
}
const PATTERN_PERMISSION = /EACCES|EPERM|permission denied/i;
const PATTERN_PERMISSION_MKDIR = /EACCES.*mkdir|permission denied.*mkdir/i;
const PATTERN_BINARY_MISSING = /ENOENT/i;
const PATTERN_PORT_CONFLICT = /EADDRINUSE|address already in use|port conflict/i;
const PATTERN_MACOS_VERSION_UNSUPPORTED = new RegExp(
  MACOS_VERSION_UNSUPPORTED_DIAGNOSIS_CODE,
  "i"
);
const PATTERN_WINDOWS_VERSION_UNSUPPORTED = new RegExp(
  WINDOWS_VERSION_UNSUPPORTED_DIAGNOSIS_CODE,
  "i"
);
const PATTERN_WINDOWS_VERSION_UNVERIFIED = new RegExp(
  WINDOWS_VERSION_UNVERIFIED_DIAGNOSIS_CODE,
  "i"
);
const PATTERN_WINDOWS_CPU_UNSUPPORTED = /\[windows_cpu_unsupported\]/i;
const PATTERN_WINDOWS_RUNTIME_DEPENDENCY_FAILED = /\[windows_runtime_dependency_failed\]/i;
const PATTERN_WINDOWS_BINARY_INCOMPATIBLE = /\[windows_binary_incompatible\]/i;
const PATTERN_WINDOWS_RUNTIME_RESOURCE_EXHAUSTED = /\[windows_runtime_resource_exhausted\]/i;
const PATTERN_WINDOWS_RUNTIME_TERMINATED = /\[windows_runtime_terminated\]/i;
const PATTERN_PROXY = /proxy|tunnel/i;
const PATTERN_TLS = /certificate|TLS|SELF_SIGNED_CERT|UNABLE_TO_VERIFY_LEAF_SIGNATURE/i;
const PATTERN_DNS = /ENOTFOUND|EAI_AGAIN/i;
const PATTERN_CONN_RESET = /ECONNRESET/i;
const PATTERN_CONN_REFUSED = /ECONNREFUSED/i;
const PATTERN_TIMEOUT = /timeout|timed out|ETIMEDOUT|AbortError|operation was aborted|failed to become healthy/i;
const PATTERN_BINARY_BLOCKED = /Cannot read OpenCode binary|spawn.*(?:EACCES|EPERM)|Windows Defender|antivirus|blocked access|quarantined/i;
const PATTERN_BINARY_CORRUPTED = /suspiciously small|not a valid .* executable|corrupted|truncated|bad Mach-O|missing PE/i;
const PATTERN_CONFIG_JSON = /Config file at .+ is not valid JSON|ConfigJsonError|JSONC Input|InvalidSymbol|ValueExpected|PropertyNameExpected|EndOfFileExpected/i;
const PATTERN_OPENCODE_DB_SCHEMA_MISMATCH = /no such column\b|no such table\b|has no column named\b|Database is not empty and has no session table/i;
const INDEX_SHUTDOWN_TIMEOUT_MS = 6e4;
function requestGatewayIndexShutdown(child, nonce, action, token, timeoutMs = INDEX_SHUTDOWN_TIMEOUT_MS) {
  return new Promise((resolve2, reject) => {
    const requestId = randomUUID();
    let settled = false;
    const finish = (reason) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.removeListener("message", handleMessage);
      child.removeListener("exit", handleExit);
      child.removeListener("disconnect", handleDisconnect);
      if (reason) reject(new Error(`[${WORKSPACE_INDEX_SHUTDOWN_BLOCKED_CODE}] ${reason}`));
      else resolve2();
    };
    const handleMessage = (message2) => {
      if (!isGatewayIndexShutdownResponse(message2) || message2.requestId !== requestId || message2.nonce !== nonce || message2.token !== token)
        return;
      finish(message2.ok ? void 0 : "index-protection-refused");
    };
    const handleExit = () => finish("gateway-exited-before-index-confirmation");
    const handleDisconnect = () => finish("index-control-disconnected");
    const timer = setTimeout(() => finish("index-confirmation-timeout"), timeoutMs);
    timer.unref?.();
    child.on("message", handleMessage);
    child.once("exit", handleExit);
    child.once("disconnect", handleDisconnect);
    if (!child.connected || !child.send || !nonce) {
      finish("index-control-unavailable");
      return;
    }
    const message = {
      type: GATEWAY_INDEX_SHUTDOWN_MESSAGE,
      kind: "request",
      action,
      requestId,
      token,
      nonce
    };
    try {
      child.send(message, (error) => {
        if (error) finish("index-control-send-failed");
      });
    } catch {
      finish("index-control-send-failed");
    }
  });
}
const PLATFORM_MIN_HEALTH_TIMEOUT = {
  /** Windows Defender real-time scanning can take 90s+ on first boot. */
  win32: 12e4,
  /** macOS Gatekeeper / notarization verification can take 30-60s after updates. */
  darwin: 9e4
  // TODO: add linux entry if we ship packaged Linux builds — SELinux / AppArmor
  // first-run checks could introduce similar delays.
};
function effectiveHealthTimeout(baseTimeout) {
  const floor = PLATFORM_MIN_HEALTH_TIMEOUT[process.platform] ?? 0;
  return Math.max(baseTimeout, floor);
}
const LOOPBACK_HOSTS$1 = /* @__PURE__ */ new Set(["127.0.0.1", "localhost", "::1"]);
const DEFAULT_MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_ERROR_CAUSE_DEPTH = 4;
async function requestLoopbackDirect(rawUrl, options = {}) {
  const url = parseLoopbackHttpUrl(rawUrl);
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  return new Promise((resolve2, reject) => {
    let settled = false;
    const finishResolve = (response) => {
      if (settled) return;
      settled = true;
      resolve2(response);
    };
    const finishReject = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const requestOptions = {
      method: options.method ?? "GET",
      headers: options.headers,
      signal: options.signal,
      // A fresh socket prevents stale proxy-era pooled connections from being reused.
      agent: false
    };
    const request$1 = request(url, requestOptions, (response) => {
      const chunks = [];
      let responseBytes = 0;
      response.on("data", (chunk) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        responseBytes += buffer.byteLength;
        if (responseBytes > maxResponseBytes) {
          const error = new Error(`Loopback response exceeded ${maxResponseBytes} bytes`);
          response.destroy(error);
          finishReject(error);
          return;
        }
        chunks.push(buffer);
      });
      response.once("error", finishReject);
      response.once("end", () => {
        finishResolve({
          status: response.statusCode ?? 0,
          statusText: response.statusMessage ?? "",
          headers: response.headers,
          bodyText: Buffer.concat(chunks).toString("utf8")
        });
      });
    });
    request$1.once("error", finishReject);
    request$1.end();
  });
}
function readLoopbackResponseHeader(headers, headerName) {
  const value = headers[headerName.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}
function formatTransportError(error) {
  const parts = [];
  const visited = /* @__PURE__ */ new Set();
  let current = error;
  for (let depth = 0; depth <= MAX_ERROR_CAUSE_DEPTH && current !== void 0; depth++) {
    if (visited.has(current)) break;
    visited.add(current);
    if (current instanceof Error) {
      const errorWithMetadata = current;
      const code = typeof errorWithMetadata.code === "string" || typeof errorWithMetadata.code === "number" ? String(errorWithMetadata.code) : void 0;
      const message = current.message || current.name;
      parts.push(code ? `${message} [${code}]` : message);
      current = errorWithMetadata.cause;
      continue;
    }
    if (typeof current === "object" && current !== null) {
      const record = current;
      const message = typeof record.message === "string" ? record.message : String(current);
      const code = typeof record.code === "string" || typeof record.code === "number" ? String(record.code) : void 0;
      parts.push(code ? `${message} [${code}]` : message);
      current = record.cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  return parts.filter(Boolean).join(" <- ") || "unknown transport error";
}
function isLoopbackHttpUrl(rawUrl) {
  try {
    parseLoopbackHttpUrl(rawUrl);
    return true;
  } catch {
    return false;
  }
}
function parseLoopbackHttpUrl(rawUrl) {
  const url = new URL(rawUrl);
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (url.protocol !== "http:") {
    throw new Error(`Loopback request must use http, received ${url.protocol}`);
  }
  if (!LOOPBACK_HOSTS$1.has(hostname)) {
    throw new Error(`Loopback request host is not local: ${url.hostname}`);
  }
  if (url.username || url.password) {
    throw new Error("Loopback request URL must not contain credentials");
  }
  return url;
}
const PROCESS_GROUP_POLL_INTERVAL_MS = 100;
const FORCE_EXIT_WAIT_MS = 1e3;
function createChildProcessExitWait(proc, timeoutMs) {
  if (proc.exitCode !== null || proc.signalCode !== null) {
    return { cancel: () => {
    }, promise: Promise.resolve(true) };
  }
  let resolveWait;
  let settled = false;
  let timer;
  const promise = new Promise((resolve2) => {
    resolveWait = resolve2;
  });
  const finish = (observed) => {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    proc.removeListener("exit", handleExit);
    resolveWait(observed);
  };
  const handleExit = () => finish(true);
  proc.once("exit", handleExit);
  timer = setTimeout(() => finish(false), timeoutMs);
  return {
    cancel: () => finish(false),
    promise
  };
}
function platformKill(proc, signal = "SIGTERM") {
  if (!proc) return false;
  try {
    if (process.platform === "win32") {
      proc.kill();
      return true;
    }
    return proc.kill(signal);
  } catch {
    return false;
  }
}
function killProcessGroup(pid, signal) {
  if (!pid) return false;
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
      return true;
    }
    process.kill(-pid, signal);
    return true;
  } catch {
    return false;
  }
}
function isProcessGroupAlive(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (err) {
    const code = err?.code;
    return code !== "ESRCH";
  }
}
async function waitForProcessGroupExit(pid, timeoutMs) {
  if (!pid || process.platform === "win32") return true;
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (!isProcessGroupAlive(pid)) return true;
    await new Promise((resolve2) => setTimeout(resolve2, PROCESS_GROUP_POLL_INTERVAL_MS));
  }
  return !isProcessGroupAlive(pid);
}
async function killAndWaitForExit(proc, timeoutMs = 3e3) {
  if (!proc) return;
  const childExit = createChildProcessExitWait(proc, timeoutMs);
  platformKill(proc, "SIGKILL");
  await childExit.promise;
}
async function killProcessGroupAndWaitForExit(proc, timeoutMs = 3e3) {
  if (!proc) return;
  const pid = proc.pid;
  const childExit = createChildProcessExitWait(proc, timeoutMs);
  const groupKillSent = killProcessGroup(pid, "SIGTERM");
  if (groupKillSent) {
    const exited2 = await waitForProcessGroupExit(pid, timeoutMs);
    if (!exited2) {
      const forceChildExit = createChildProcessExitWait(proc, FORCE_EXIT_WAIT_MS);
      if (!killProcessGroup(pid, "SIGKILL")) {
        platformKill(proc, "SIGKILL");
      }
      childExit.cancel();
      await Promise.all([waitForProcessGroupExit(pid, FORCE_EXIT_WAIT_MS), forceChildExit.promise]);
      return;
    }
    await childExit.promise;
    return;
  }
  platformKill(proc, "SIGTERM");
  const exited = await childExit.promise;
  if (!exited) {
    const forceChildExit = createChildProcessExitWait(proc, FORCE_EXIT_WAIT_MS);
    platformKill(proc, "SIGKILL");
    await forceChildExit.promise;
  }
}
const MAX_STDERR_DIAGNOSTIC_LINES = 20;
const BYPASS_DOMAINS = [
  "design.minimax.cn",
  // Pre-rebrand domestic domain, kept during the design.minimax.cn migration window.
  "design.minimaxi.com",
  // Pre-rebrand hub domain, kept during the design.* migration window.
  "hub.minimaxi.com",
  "hailuoai.com",
  // NOTE: minimax.cn is NOT covered by the *.minimaxi.com wildcard below — it is a
  // distinct registrable domain. Removing this entry silently routes domestic cloud
  // gateway traffic back through the user proxy.
  "*.minimax.cn",
  "*.minimaxi.com",
  "*.hailuoai.com",
  "*.xaminim.com",
  "*.minimax.io",
  "*.guance.com",
  "127.0.0.1",
  "localhost",
  "::1"
];
const LOOPBACK_NO_PROXY_ENTRIES = ["127.0.0.1", "localhost", "::1"];
const PROXY_ENV_KEYS = [
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "http_proxy",
  "https_proxy",
  "all_proxy"
];
const NODE_SYSTEM_CA_OPTION$1 = "--use-system-ca";
const DIRECT_PROXY_RESULT = "DIRECT";
const RESOLVED_PROXY_ENTRY_PATTERN = /^(PROXY|HTTPS|SOCKS|SOCKS4|SOCKS5)\s+(\S+)$/i;
const VELOPACK_PROXY_ENV_SNAPSHOT = "HILO_VELOPACK_PROXY_ENV_SNAPSHOT";
const PROXY_SNAPSHOT_KEYS = [...PROXY_ENV_KEYS, "NO_PROXY", "no_proxy"];
function normalizeNetworkProxyMode(value) {
  return value === "direct" || value === "system" ? value : "auto";
}
function parseResolvedProxy(raw) {
  if (!raw) return void 0;
  const entries = raw.split(";").map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  if (entries.length === 0 || entries[0].toUpperCase() === DIRECT_PROXY_RESULT) {
    return void 0;
  }
  for (const entry of entries) {
    if (entry.toUpperCase() === DIRECT_PROXY_RESULT) continue;
    const match = entry.match(RESOLVED_PROXY_ENTRY_PATTERN);
    if (!match) continue;
    const kind = match[1]?.toUpperCase();
    const hostPort = match[2];
    if (!hostPort) continue;
    if (kind === "PROXY") return `http://${hostPort}`;
    if (kind === "HTTPS") return `https://${hostPort}`;
    if (kind === "SOCKS4") return `socks4://${hostPort}`;
    if (kind === "SOCKS5" || kind === "SOCKS") return `socks5://${hostPort}`;
  }
  return void 0;
}
function hasEffectiveResolvedProxy(raw) {
  return parseResolvedProxy(raw) !== void 0;
}
function withNodeSystemCa(existing) {
  const trimmed = existing?.trim();
  if (trimmed && /(^|\s)--use-system-ca(\s|$)/.test(trimmed)) return trimmed;
  return trimmed ? `${trimmed} ${NODE_SYSTEM_CA_OPTION$1}` : NODE_SYSTEM_CA_OPTION$1;
}
function mergeNoProxy(env, value) {
  const existingNoProxy = env.NO_PROXY || env.no_proxy || "";
  const merged = existingNoProxy ? `${existingNoProxy},${value}` : value;
  env.NO_PROXY = merged;
  env.no_proxy = merged;
}
function clearProxyEnv(env) {
  for (const key of PROXY_ENV_KEYS) {
    delete env[key];
  }
}
function restoreProxyEnvironmentBeforeChildSpawn(env) {
  const rawSnapshot = env[VELOPACK_PROXY_ENV_SNAPSHOT];
  if (!rawSnapshot) return;
  try {
    const snapshot2 = JSON.parse(rawSnapshot);
    if (!snapshot2 || typeof snapshot2 !== "object" || Array.isArray(snapshot2)) return;
    const values = snapshot2;
    for (const key of PROXY_SNAPSHOT_KEYS) {
      const value = values[key];
      if (typeof value === "string") env[key] = value;
      else delete env[key];
    }
  } catch {
  } finally {
    delete env[VELOPACK_PROXY_ENV_SNAPSHOT];
  }
}
function applySystemProxyEnv(env) {
  mergeNoProxy(env, LOOPBACK_NO_PROXY_ENTRIES.join(","));
  const proxyUrl = parseResolvedProxy(env.HILO_RESOLVED_PROXY);
  if (!proxyUrl) return;
  env.HTTP_PROXY = env.HTTP_PROXY || proxyUrl;
  env.HTTPS_PROXY = env.HTTPS_PROXY || proxyUrl;
  env.ALL_PROXY = env.ALL_PROXY || proxyUrl;
  env.http_proxy = env.http_proxy || proxyUrl;
  env.https_proxy = env.https_proxy || proxyUrl;
  env.all_proxy = env.all_proxy || proxyUrl;
}
function applyChildProcessProxyMode(env, mode = "auto") {
  env.HILO_NETWORK_PROXY_MODE = mode;
  restoreProxyEnvironmentBeforeChildSpawn(env);
  if (mode === "direct") {
    clearProxyEnv(env);
    env.HILO_RESOLVED_PROXY = "DIRECT";
    mergeNoProxy(env, "*");
    return;
  }
  if (mode === "system") {
    applySystemProxyEnv(env);
    return;
  }
  injectResolvedProxy(env);
}
function injectResolvedProxy(env) {
  const resolved = env.HILO_RESOLVED_PROXY;
  if (!hasEffectiveResolvedProxy(resolved)) return;
  mergeNoProxy(env, BYPASS_DOMAINS.join(","));
}
const BUN_SUPPORTED_PROXY_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:"]);
function stripBunUnsupportedProxyEnv(env) {
  const stripped = [];
  for (const key of PROXY_ENV_KEYS) {
    const raw = env[key]?.trim();
    if (!raw) continue;
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;
    let protocol;
    try {
      protocol = new URL(withProtocol).protocol;
    } catch {
      continue;
    }
    if (BUN_SUPPORTED_PROXY_PROTOCOLS.has(protocol)) continue;
    delete env[key];
    stripped.push(`${key} (${protocol}//)`);
  }
  return stripped;
}
const PROCESS_QUERY_TIMEOUT_MS = 2e3;
function isRuntimePidAbsent(pid) {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return !!error && typeof error === "object" && "code" in error && error.code === "ESRCH";
  }
}
async function listWindowsProcesses() {
  const systemRoot = process.env.SystemRoot;
  if (!systemRoot || !/^[a-z]:[\\/]/i.test(systemRoot))
    throw new Error("Windows system path unavailable");
  const executable = path__default.win32.join(
    systemRoot,
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe"
  );
  const { stdout } = await promisify(execFile)(
    executable,
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$ErrorActionPreference = 'Stop'; @(Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId) | ConvertTo-Json -Compress"
    ],
    { timeout: PROCESS_QUERY_TIMEOUT_MS, windowsHide: true, encoding: "utf8" }
  );
  const raw = JSON.parse(stdout);
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("Process inventory unavailable");
  return raw.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid process inventory");
    const entry = item;
    if (!Number.isInteger(entry.ProcessId) || !Number.isInteger(entry.ParentProcessId))
      throw new Error("Invalid process identity");
    return { pid: Number(entry.ProcessId), parentPid: Number(entry.ParentProcessId) };
  });
}
function addDescendants(pids, entries) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of entries) {
      if (pids.has(entry.parentPid) && !pids.has(entry.pid)) {
        pids.add(entry.pid);
        changed = true;
      }
    }
  }
}
async function captureRuntimeExitProof(roots, deps = {
  platform: process.platform,
  probePid: isRuntimePidAbsent,
  listWindowsProcesses
}) {
  if (roots.length === 0 || roots.some((pid) => !Number.isInteger(pid) || pid <= 0))
    return void 0;
  const captured = new Set(roots);
  if (deps.platform === "win32") {
    try {
      const entries = await deps.listWindowsProcesses();
      if (!roots.every((pid) => entries.some((entry) => entry.pid === pid))) return void 0;
      addDescendants(captured, entries);
    } catch {
      return void 0;
    }
  }
  return async () => {
    try {
      if (deps.platform === "win32") {
        addDescendants(captured, await deps.listWindowsProcesses());
        return [...captured].every((pid) => deps.probePid(pid));
      }
      return [...captured].every((pid) => deps.probePid(pid) && deps.probePid(-pid));
    } catch {
      return false;
    }
  };
}
function createWorkspaceIdentityClaim(workspaceKey) {
  return crypto.createHash("sha256").update(workspaceKey).digest("hex");
}
const nativeQuitConsents = /* @__PURE__ */ new WeakSet();
function createWorkspaceShutdownConsent(folderPaths) {
  const consent = Object.freeze({
    discardMissingFolders: Object.freeze([...new Set(folderPaths)])
  });
  nativeQuitConsents.add(consent);
  return consent;
}
function hasWorkspaceShutdownConsent(options, folderPath) {
  return options !== void 0 && nativeQuitConsents.has(options) && options.discardMissingFolders.includes(folderPath);
}
class WorkspaceShutdownFoldersMissingError extends Error {
  folderPaths;
  constructor(folderPaths) {
    super("Workspace folders are missing; explicit discard confirmation is required");
    this.name = "WorkspaceShutdownFoldersMissingError";
    this.folderPaths = [...new Set(folderPaths)];
  }
}
function resolveWorkflowsDirFromConfigDir(configDir, _isPackaged) {
  return path.join(configDir, "workflows");
}
const MAX_BACKUPS_PER_FILE = 3;
let listener;
const reportedFiles = /* @__PURE__ */ new Set();
function setCorruptJsonRecoveryListener(next) {
  listener = next;
}
function isFileMissingError(err) {
  return err?.code === "ENOENT";
}
function reportCorruptJsonFile(filePath, err) {
  const errorMessage = err instanceof Error ? err.message : String(err);
  const backupPath = backupCorruptFile(filePath);
  console.error(
    `[config-recovery] corrupt file=${filePath} backup=${backupPath ?? "(backup-failed)"} error=${errorMessage}`
  );
  const report = { filePath, backupPath, errorMessage };
  if (listener && !reportedFiles.has(filePath)) {
    reportedFiles.add(filePath);
    try {
      listener(report);
    } catch (listenerErr) {
      console.error(`[config-recovery] listener failed for ${filePath}: ${listenerErr}`);
    }
  }
  return report;
}
function backupCorruptFile(filePath) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const backupPath = `${filePath}.corrupt-${timestamp}`;
  try {
    fs$1.copyFileSync(filePath, backupPath);
  } catch {
    return null;
  }
  pruneOldBackups(filePath);
  return backupPath;
}
function pruneOldBackups(filePath) {
  try {
    const dir = path.dirname(filePath);
    const prefix = `${path.basename(filePath)}.corrupt-`;
    const backups = fs$1.readdirSync(dir).filter((name) => name.startsWith(prefix)).sort();
    for (const name of backups.slice(0, Math.max(0, backups.length - MAX_BACKUPS_PER_FILE))) {
      fs$1.rmSync(path.join(dir, name), { force: true });
    }
  } catch {
  }
}
const COMMAND_PATH = /^(?:\/|\.{1,2}[\\/]|[a-z]:[\\/]|\\\\|~[\\/])/iu;
class CustomMcpCommandSyntaxError extends Error {
  constructor(issue) {
    super(issue);
    this.issue = issue;
  }
  name = "CustomMcpCommandSyntaxError";
}
function parseCustomMcpArguments(value, commandLine = false) {
  const result = [];
  let current = "";
  let quote;
  let tokenStarted = false;
  let windowsPath = false;
  for (let index = 0; index < value.length; index++) {
    const character = value.charAt(index);
    if (!tokenStarted && !/\s/u.test(character)) {
      const start = character === '"' || character === "'" ? index + 1 : index;
      windowsPath = character !== "'" && /^(?:[a-z]:\\|\\\\)/iu.test(value.slice(start));
    }
    if (commandLine && (!quote && /[|&;<>\r\n]/u.test(character) || quote !== "'" && (character === "`" || character === "$"))) {
      throw new CustomMcpCommandSyntaxError("shell_syntax");
    }
    if (!quote && /\s/u.test(character)) {
      if (tokenStarted) {
        result.push(current);
        current = "";
        tokenStarted = false;
      }
      continue;
    }
    if (!quote && (character === '"' || character === "'")) {
      quote = character;
      tokenStarted = true;
      continue;
    }
    if (quote && character === quote) {
      quote = void 0;
      continue;
    }
    if (character === "\\" && !windowsPath && quote !== "'" && index + 1 < value.length) {
      const nextCharacter = value.charAt(index + 1);
      if (quote === '"' && /["\\$`]/u.test(nextCharacter) || !quote && /[\s"'\\|&;<>$`]/u.test(nextCharacter)) {
        current += nextCharacter;
        index += 1;
        tokenStarted = true;
        continue;
      }
    }
    current += character;
    tokenStarted = true;
  }
  if (quote) throw new CustomMcpCommandSyntaxError("unclosed_quote");
  if (tokenStarted) result.push(current);
  return result;
}
function splitCustomMcpCommand(command, isCommandFile) {
  if (COMMAND_PATH.test(command)) {
    if (!isCommandFile || isCommandFile(command) || !/\s/u.test(command)) return [command];
    const tokens2 = parseCustomMcpArguments(command, true);
    if (!tokens2[0] || !isCommandFile(tokens2[0])) return [command];
    return tokens2;
  }
  const tokens = parseCustomMcpArguments(command, true);
  if (tokens[0] && /[\s"']/u.test(tokens[0]) && !COMMAND_PATH.test(tokens[0])) {
    throw new CustomMcpCommandSyntaxError("ambiguous_executable");
  }
  return tokens;
}
const ICustomMcpService = createDecorator("customMcpService");
const CUSTOM_MCP_NAME_MAX_LENGTH = 24;
const STORED_NAME_MAX_LENGTH = 80;
const SERVER_NAME_PATTERN = /^[\p{Script=Han}a-zA-Z0-9_.-]+$/u;
const MAX_COMMAND_LENGTH = 1024;
const MAX_URL_LENGTH = 8192;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_ARGUMENTS = 128;
const MAX_ARGUMENT_LENGTH = 4096;
const MAX_KEY_VALUES = 64;
const MAX_KEY_LENGTH = 256;
const MAX_VALUE_LENGTH = 8192;
const MAX_TIMEOUT_MS = 36e5;
class CustomMcpValidationError extends Error {
  constructor(message, field, commandIssue) {
    super(message);
    this.field = field;
    this.commandIssue = commandIssue;
  }
  name = "CustomMcpValidationError";
}
function normalizeCustomMcpServerInput(input, options = {}) {
  if (!isRecord$3(input) || hasUnknownKeys(input, ["name", "enabled", "config"])) {
    throw new CustomMcpValidationError("Invalid MCP server input");
  }
  const name = requireServerName(
    input.name,
    options.source === "stored" || options.source === "update" ? STORED_NAME_MAX_LENGTH : CUSTOM_MCP_NAME_MAX_LENGTH
  );
  if (isReservedCustomMcpName(name)) {
    throw new CustomMcpValidationError("Reserved MCP server name", "name");
  }
  if (typeof input.enabled !== "boolean") {
    throw new CustomMcpValidationError("Invalid MCP enabled state");
  }
  return {
    name,
    enabled: input.enabled,
    config: normalizeConfig(input.config, options)
  };
}
function isReservedCustomMcpName(name) {
  const normalized = name.trim().replace(/\./gu, "_").toLowerCase();
  return normalized === "hub" || normalized.startsWith("hub_") || ["__proto__", "constructor", "prototype"].includes(normalized);
}
function customMcpNameIdentity(name) {
  return name.trim().replace(/[^a-zA-Z0-9_-]/gu, "_").toLowerCase();
}
function toOpenCodeMcpConfig(server, options) {
  const { config } = server;
  if (config.transport === "stdio") {
    const useElectronNode = config.command === "node" && Boolean(options?.electronNodePath);
    const environment = {
      ...config.env ?? {},
      ...useElectronNode ? { ELECTRON_RUN_AS_NODE: "1" } : {}
    };
    return {
      type: "local",
      command: [
        useElectronNode ? options?.electronNodePath : config.command,
        ...config.args ?? []
      ],
      ...Object.keys(environment).length > 0 ? { environment } : {},
      enabled: server.enabled,
      ...config.timeoutMs ? { timeout: config.timeoutMs } : {}
    };
  }
  return {
    type: "remote",
    url: config.url,
    ...config.headers && Object.keys(config.headers).length > 0 ? { headers: config.headers } : {},
    enabled: server.enabled,
    ...config.timeoutMs ? { timeout: config.timeoutMs } : {}
  };
}
function toCustomMcpServerSummary(server, runtimeState, runtimeName = server.name) {
  return {
    name: server.name,
    ...runtimeName !== server.name ? { runtimeName } : {},
    enabled: server.enabled,
    transport: server.config.transport,
    ...server.config.description ? { description: server.config.description } : {},
    endpoint: summarizeEndpoint(server.config),
    runtimeState
  };
}
function normalizeCustomMcpLaunch(rawCommand, rawArgs, options = {}) {
  const command = requireBoundedString(rawCommand, MAX_COMMAND_LENGTH, "command");
  const args = normalizeStringArray(rawArgs);
  try {
    const tokens = splitCustomMcpCommand(command, options.isCommandFile);
    const executable = requireBoundedString(tokens[0], MAX_COMMAND_LENGTH, "command");
    const mergedArgs = normalizeStringArray([...tokens.slice(1), ...args ?? []]);
    return {
      command: executable,
      ...args || tokens.length > 1 ? { args: mergedArgs } : {}
    };
  } catch (error) {
    if (!(error instanceof CustomMcpCommandSyntaxError || error instanceof CustomMcpValidationError))
      throw error;
    if (options.source === "stored") return { command, ...args ? { args } : {} };
    if (error instanceof CustomMcpCommandSyntaxError)
      throw new CustomMcpValidationError("Invalid MCP command line", "command", error.issue);
    throw error;
  }
}
function normalizeConfig(input, options) {
  if (!isRecord$3(input) || typeof input.transport !== "string") {
    throw new CustomMcpValidationError("Invalid MCP server config");
  }
  const common = normalizeCommonConfig(input);
  if (input.transport === "stdio") {
    if (hasUnknownKeys(input, ["transport", "command", "args", "env", "timeoutMs", "description"])) {
      throw new CustomMcpValidationError("Unsupported stdio MCP field");
    }
    const launch = normalizeCustomMcpLaunch(input.command, input.args, options);
    const env = normalizeStringMap(input.env, false);
    return {
      transport: "stdio",
      ...launch,
      ...env ? { env } : {},
      ...common
    };
  }
  if (input.transport !== "http" && input.transport !== "streamable-http" && input.transport !== "sse") {
    throw new CustomMcpValidationError("Unsupported MCP transport");
  }
  if (hasUnknownKeys(input, ["transport", "url", "headers", "timeoutMs", "description"])) {
    throw new CustomMcpValidationError("Unsupported remote MCP field");
  }
  const url = requireRemoteUrl(input.url);
  const headers = normalizeStringMap(input.headers, true);
  return {
    transport: input.transport,
    url,
    ...headers ? { headers } : {},
    ...common
  };
}
function normalizeCommonConfig(input) {
  let timeoutMs;
  if (input.timeoutMs !== void 0) {
    if (typeof input.timeoutMs !== "number" || !Number.isSafeInteger(input.timeoutMs) || input.timeoutMs <= 0 || input.timeoutMs > MAX_TIMEOUT_MS) {
      throw new CustomMcpValidationError("Invalid MCP timeout", "timeoutMs");
    }
    timeoutMs = input.timeoutMs;
  }
  let description;
  if (input.description !== void 0) {
    if (typeof input.description !== "string") {
      throw new CustomMcpValidationError("Invalid MCP description", "description");
    }
    const trimmed = input.description.trim();
    if (!trimmed || trimmed.length > MAX_DESCRIPTION_LENGTH) {
      throw new CustomMcpValidationError("Invalid MCP description", "description");
    }
    description = trimmed;
  }
  return {
    ...timeoutMs ? { timeoutMs } : {},
    ...description ? { description } : {}
  };
}
function requireServerName(value, maxLength) {
  if (typeof value !== "string")
    throw new CustomMcpValidationError("Invalid MCP server name", "name");
  const name = value.trim();
  if (!SERVER_NAME_PATTERN.test(name) || Array.from(name).length > maxLength) {
    throw new CustomMcpValidationError("Invalid MCP server name", "name");
  }
  return name;
}
function requireBoundedString(value, maxLength, field) {
  if (typeof value !== "string") throw new CustomMcpValidationError("Invalid MCP string", field);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    throw new CustomMcpValidationError("Invalid MCP string", field);
  }
  return trimmed;
}
function requireRemoteUrl(value) {
  const raw = requireBoundedString(value, MAX_URL_LENGTH, "url");
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:" || !url.hostname) {
      throw new CustomMcpValidationError("Invalid MCP URL", "url");
    }
    return raw;
  } catch (error) {
    if (error instanceof CustomMcpValidationError) throw error;
    throw new CustomMcpValidationError("Invalid MCP URL", "url");
  }
}
function normalizeStringArray(value) {
  if (value === void 0) return void 0;
  if (!Array.isArray(value) || value.length > MAX_ARGUMENTS || value.some((item) => typeof item !== "string" || item.length > MAX_ARGUMENT_LENGTH)) {
    throw new CustomMcpValidationError("Invalid MCP arguments", "args");
  }
  return [...value];
}
function normalizeStringMap(value, caseInsensitive) {
  if (value === void 0) return void 0;
  if (!isRecord$3(value) || Object.keys(value).length > MAX_KEY_VALUES) {
    throw new CustomMcpValidationError(
      "Invalid MCP key-value map",
      caseInsensitive ? "headers" : "env"
    );
  }
  const result = {};
  const seen = /* @__PURE__ */ new Set();
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = rawKey.trim();
    const normalizedKey = caseInsensitive ? key.toLocaleLowerCase() : key;
    if (!key || key.length > MAX_KEY_LENGTH || seen.has(normalizedKey) || typeof rawValue !== "string" || rawValue.length > MAX_VALUE_LENGTH) {
      throw new CustomMcpValidationError(
        "Invalid MCP key-value map",
        caseInsensitive ? "headers" : "env"
      );
    }
    seen.add(normalizedKey);
    result[key] = rawValue;
  }
  return result;
}
function summarizeEndpoint(config) {
  if (config.transport === "stdio") {
    return config.command.split(/[\\/]/u).filter(Boolean).pop() ?? config.command;
  }
  try {
    const url = new URL(config.url);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
}
function hasUnknownKeys(value, allowed) {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).some((key) => !allowedKeys.has(key));
}
function isRecord$3(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
const CUSTOM_MCP_ENV_MARKER = "HILO_CUSTOM_MCP_ENV";
const INHERITED_ENV_ALLOWLIST = /* @__PURE__ */ new Set([
  "PATH",
  "HOME",
  "USER",
  "LOGNAME",
  "USERNAME",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "TEMP",
  "TMP",
  "TMPDIR",
  "SYSTEMROOT",
  "SYSTEMDRIVE",
  "WINDIR",
  "COMSPEC",
  "PATHEXT",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TERM",
  "COLORTERM",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "NO_PROXY",
  "SSL_CERT_FILE",
  "SSL_CERT_DIR"
]);
function markCustomMcpConfig(config) {
  return config.type === "local" ? { ...config, environment: { ...config.environment, [CUSTOM_MCP_ENV_MARKER]: "1" } } : config;
}
function isolateCustomMcpConfig(config, inheritedEnvKeys) {
  if (config.type !== "local") return config;
  const environment = Object.fromEntries(
    [...inheritedEnvKeys, "OPENCODE_CONFIG", "OPENCODE_CONFIG_CONTENT"].filter((key) => !INHERITED_ENV_ALLOWLIST.has(key.toUpperCase())).map((key) => [key, ""])
  );
  Object.assign(environment, config.environment);
  delete environment[CUSTOM_MCP_ENV_MARKER];
  return { ...config, environment };
}
function isolateCustomMcpConfigContent(content, inheritedEnvKeys) {
  if (!content.includes(CUSTOM_MCP_ENV_MARKER)) return content;
  const config = JSON.parse(content);
  if (!isRecord$2(config) || !isRecord$2(config.mcp)) return content;
  for (const [name, server] of Object.entries(config.mcp)) {
    if (!isRecord$2(server) || server.type !== "local" || !Array.isArray(server.command) || !server.command.every((item) => typeof item === "string") || !isRecord$2(server.environment) || server.environment[CUSTOM_MCP_ENV_MARKER] !== "1")
      continue;
    const environment = {};
    for (const [key, value] of Object.entries(server.environment)) {
      if (typeof value !== "string") throw new Error("Invalid custom MCP environment");
      environment[key] = value;
    }
    const isolated = isolateCustomMcpConfig(
      { type: "local", command: server.command, environment },
      inheritedEnvKeys
    );
    config.mcp[name] = {
      ...server,
      environment: isolated.type === "local" ? isolated.environment : {}
    };
  }
  return JSON.stringify(config);
}
function isRecord$2(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function getRequestAdAttributionUrl(requestUrl, requestToken, attribution) {
  if (!requestToken || !requestUrl || !isAdAttributionApiUrl(requestUrl)) return void 0;
  return normalizeAdAttribution(attribution)?.url;
}
function getTokenAdAttribution(tokens, requestToken, region) {
  if (!tokens || !requestToken || requestToken !== tokens.accessToken) return null;
  return normalizeAdAttribution(tokens.adAttribution, Date.now(), region);
}
function prepareTokensWithAttribution(previous, incoming, region) {
  const token = incoming.accessToken ?? previous.accessToken;
  const value = Object.hasOwn(incoming, "adAttribution") ? incoming.adAttribution : token === previous.accessToken ? previous.adAttribution : null;
  return {
    ...incoming,
    adAttribution: token ? normalizeAdAttribution(value, Date.now(), region) : null
  };
}
function customModelRuntimeId(modelId, reasoningLevel) {
  return reasoningLevel ? `__hub_reasoning__${encodeURIComponent(JSON.stringify([modelId, reasoningLevel]))}` : modelId;
}
function customModelEntries(models) {
  return models.flatMap((model) => [
    { runtimeId: model.id, model, reasoningLevel: void 0 },
    ...model.reasoningLevels.map((reasoningLevel) => ({
      runtimeId: customModelRuntimeId(model.id, reasoningLevel),
      model,
      reasoningLevel
    }))
  ]);
}
function getCustomModelValidationErrors(value, stored) {
  const errors = {};
  if (!value) return { baseUrl: "url", apiKey: "required", models: "modelCount" };
  if (!["openai-compatible", "anthropic", "openai-responses"].includes(value.protocol))
    errors.protocol = "protocol";
  if (value.providerName !== void 0 && (typeof value.providerName !== "string" || !value.providerName.trim()))
    errors.providerName = "required";
  try {
    const url = new URL(value.baseUrl.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash)
      errors.baseUrl = "url";
  } catch {
    errors.baseUrl = "url";
  }
  if (typeof value.apiKey !== "string" || /[\r\n]/.test(value.apiKey)) errors.apiKey = "apiKey";
  else if (!value.apiKey.trim() && !stored?.apiKey) errors.apiKey = "required";
  const ids = /* @__PURE__ */ new Map();
  if (!Array.isArray(value.models) || !value.models.length || value.models.length > 50)
    errors.models = "modelCount";
  for (const [index, model] of (Array.isArray(value.models) ? value.models : []).entries()) {
    const prefix = `models.${index}`;
    if (!model) {
      errors[`${prefix}.id`] = "modelId";
      continue;
    }
    const id = typeof model.id === "string" ? model.id.trim() : "";
    if (!id || id.startsWith("__hub_reasoning__") || Array.from(id).some((char) => /\s/.test(char) || char.charCodeAt(0) < 32))
      errors[`${prefix}.id`] = "modelId";
    else if (ids.has(id)) {
      errors[`${prefix}.id`] = "duplicateModel";
      errors[`models.${ids.get(id)}.id`] = "duplicateModel";
    } else ids.set(id, index);
    if (!Number.isSafeInteger(model.contextWindow) || model.contextWindow <= 0)
      errors[`${prefix}.contextWindow`] = "positiveInteger";
    if (!Number.isSafeInteger(model.maxOutputTokens) || model.maxOutputTokens <= 0)
      errors[`${prefix}.maxOutputTokens`] = "positiveInteger";
    else if (Number.isSafeInteger(model.contextWindow) && model.contextWindow > 0 && model.maxOutputTokens > model.contextWindow)
      errors[`${prefix}.maxOutputTokens`] = "outputLimit";
    if (!Array.isArray(model.reasoningLevels) || model.reasoningLevels.length > 16 || new Set(model.reasoningLevels).size !== model.reasoningLevels.length || model.reasoningLevels.some(
      (level) => typeof level !== "string" || !/^[a-zA-Z0-9_-]+$/.test(level)
    ))
      errors[`${prefix}.reasoningLevels`] = "reasoning";
    else if (value.protocol === "anthropic" && model.reasoningLevels.some(
      (level) => !["low", "medium", "high", "xhigh", "max"].includes(level)
    ))
      errors[`${prefix}.reasoningLevels`] = "anthropicReasoning";
  }
  const names = /* @__PURE__ */ new Map();
  if (value.headers !== void 0 && !Array.isArray(value.headers)) errors.headers = "headerName";
  for (const [index, header] of (Array.isArray(value.headers) ? value.headers : []).entries()) {
    const prefix = `headers.${index}`;
    if (!header) {
      errors[`${prefix}.name`] = "headerName";
      continue;
    }
    const name = typeof header.name === "string" ? header.name.trim().toLowerCase() : "";
    if (!/^[!#$%&'*+.^_`|~0-9a-z-]+$/.test(name) || ["host", "content-length", "connection", "transfer-encoding", "upgrade"].includes(name))
      errors[`${prefix}.name`] = "headerName";
    else if (names.has(name)) {
      errors[`${prefix}.name`] = "duplicateHeader";
      errors[`headers.${names.get(name)}.name`] = "duplicateHeader";
    } else names.set(name, index);
    if (typeof header.value !== "string" || /[\r\n\0]/.test(header.value))
      errors[`${prefix}.value`] = "headerValue";
    else if (!header.value && !Object.entries(stored?.headers ?? {}).some(
      ([saved, value2]) => saved.toLowerCase() === name && typeof value2 === "string" && value2.length > 0
    ))
      errors[`${prefix}.value`] = "required";
  }
  return errors;
}
function validateCustomModelInput(value, stored) {
  return Object.keys(getCustomModelValidationErrors(value, stored)).length === 0;
}
function preserveStoredCustomModels(value, providers) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new Error("Desktop configuration must be a plain object");
  }
  return { ...value, customModels: providers };
}
function buildCustomProviderConfig(settings) {
  const npm = settings.protocol === "anthropic" ? "@ai-sdk/anthropic" : settings.protocol === "openai-responses" ? "@ai-sdk/openai" : "@ai-sdk/openai-compatible";
  return {
    name: settings.providerName || "Custom",
    npm,
    options: {
      baseURL: settings.baseUrl,
      apiKey: settings.apiKey,
      headers: settings.headers ?? {}
    },
    models: Object.fromEntries(
      customModelEntries(settings.models).map(({ runtimeId, model, reasoningLevel }) => [
        runtimeId,
        {
          id: model.id,
          name: `${model.id}${reasoningLevel ? ` · ${reasoningLevel}` : ""}`,
          tool_call: true,
          limit: { context: model.contextWindow, output: model.maxOutputTokens },
          ...reasoningLevel ? {
            options: settings.protocol === "anthropic" ? { effort: reasoningLevel } : { reasoningEffort: reasoningLevel }
          } : {}
        }
      ])
    )
  };
}
const DEV_CONFIG_SEGMENTS = ["config", "opencode-v2"];
const DEV_OPENCODE_SEGMENT = ".opencode-v2";
const PACKAGED_SEGMENTS = ["agent-profiles", "v2", "config"];
const REQUIRED_PROFILE_ENTRIES = [
  { root: "configDir", relativePath: "base.json", kind: "file" },
  { root: "sourceConfigDir", relativePath: "agents/media-agent.md", kind: "file" },
  { root: "sourceConfigDir", relativePath: "agents/comfyui-agent.md", kind: "file" },
  { root: "sourceConfigDir", relativePath: "agents/planner.md", kind: "file" },
  { root: "sourceConfigDir", relativePath: "agents/router.md", kind: "file" },
  { root: "sourceConfigDir", relativePath: "agents/executor.md", kind: "file" },
  { root: "sourceConfigDir", relativePath: "contracts/baseline.md", kind: "file" },
  { root: "sourceConfigDir", relativePath: "knowledge/vendors", kind: "directory" },
  { root: "sourceConfigDir", relativePath: "plugins/session-header.ts", kind: "file" },
  { root: "sourceConfigDir", relativePath: "workflows/workflow.md", kind: "file" }
];
function resolveAgentProfilePaths(ctx) {
  let configDir;
  let sourceConfigDir;
  if (ctx.isPackaged) {
    if (!ctx.resourcesPath) throw new Error("resourcesPath is required in packaged mode");
    configDir = path.join(ctx.resourcesPath, ...PACKAGED_SEGMENTS);
    sourceConfigDir = configDir;
  } else {
    const repoRoot = ctx.repoRoot ?? process.cwd();
    configDir = path.resolve(repoRoot, ...DEV_CONFIG_SEGMENTS);
    sourceConfigDir = path.resolve(repoRoot, DEV_OPENCODE_SEGMENT);
  }
  return {
    configDir,
    sourceConfigDir
  };
}
function assertAgentProfileComplete(paths) {
  const missing = [];
  for (const entry of REQUIRED_PROFILE_ENTRIES) {
    const candidate = path.join(paths[entry.root], entry.relativePath);
    try {
      const stat = fs$1.statSync(candidate);
      const valid = entry.kind === "file" ? stat.isFile() : stat.isDirectory();
      if (!valid) missing.push(candidate);
    } catch {
      missing.push(candidate);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `[agent-profile] active v2 profile is incomplete: missing=[${missing.join(", ")}]`
    );
  }
}
const NODE_SYSTEM_CA_OPTION = "--use-system-ca";
const PROBE_TIMEOUT_MS = 5e3;
let cachedSupport;
let warnedUnsupported = false;
function pathNodeSupportsSystemCa() {
  if (cachedSupport !== void 0) return cachedSupport;
  try {
    const result = spawnSync(process.platform === "win32" ? "node.exe" : "node", ["-p", "1"], {
      env: { ...process.env, NODE_OPTIONS: NODE_SYSTEM_CA_OPTION },
      timeout: PROBE_TIMEOUT_MS,
      stdio: ["ignore", "ignore", "pipe"]
    });
    cachedSupport = result.status === 0;
    if (!cachedSupport && !warnedUnsupported) {
      warnedUnsupported = true;
      if (result.error) {
        console.error(
          `[config] failed to probe PATH node for --use-system-ca support (${result.error.message}) — skipping system CA injection for MCP servers in dev mode.`
        );
      } else {
        const stderr = result.stderr?.toString().trim() ?? "";
        console.error(
          `[config] PATH node rejects NODE_OPTIONS=--use-system-ca — skipping system CA injection for MCP servers in dev mode. Upgrade your node to >= 22.15 (e.g. \`nvm install 22\`), otherwise TLS interception proxies may not be trusted. Probe stderr: ${stderr || "(empty)"}`
        );
      }
    }
  } catch {
    cachedSupport = false;
  }
  return cachedSupport;
}
const BASE_CONFIG = "base.json";
function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const baseVal = base[key];
    const overVal = override[key];
    if (overVal !== null && typeof overVal === "object" && !Array.isArray(overVal) && baseVal !== null && typeof baseVal === "object" && !Array.isArray(baseVal)) {
      result[key] = deepMerge(baseVal, overVal);
    } else {
      result[key] = overVal;
    }
  }
  return result;
}
function readJsonFile(filePath) {
  try {
    return JSON.parse(fs$1.readFileSync(filePath, "utf-8"));
  } catch (err) {
    if (!isFileMissingError(err)) {
      reportCorruptJsonFile(filePath, err);
    }
    return {};
  }
}
function resolveConfigDir(options) {
  const appRoot = options.appRoot ?? process.cwd();
  return resolveAgentProfilePaths({
    isPackaged: options.isPackaged,
    resourcesPath: options.resourcesPath,
    // dev repoRoot = two levels up from appRoot (= app.getAppPath() = <repo>/app/desktop)
    repoRoot: path.resolve(appRoot, "..", "..")
  }).configDir;
}
function loadMergedConfig(configDir, channel, region) {
  let config = readJsonFile(path.join(configDir, BASE_CONFIG));
  if (region) {
    const regionFile = path.join(configDir, `base.${region}.json`);
    if (fs$1.existsSync(regionFile)) {
      config = deepMerge(config, readJsonFile(regionFile));
    }
  }
  const envFile = path.join(configDir, `${channel}.json`);
  if (fs$1.existsSync(envFile)) {
    config = deepMerge(config, readJsonFile(envFile));
  }
  return config;
}
function isPlatformProvider(baseURL) {
  return CLOUD_GATEWAY_URL_PREFIXES.some((prefix) => baseURL.startsWith(prefix));
}
function rewriteMcpPaths(config, ctx) {
  if (!ctx.isPackaged || !ctx.resourcesPath) return;
  const resourcesPath = ctx.resourcesPath;
  const mcp = config.mcp;
  if (!mcp) return;
  for (const tool of Object.values(mcp)) {
    const command = tool.command;
    if (!command || command.length < 2) continue;
    if (command[0] === "node" && ctx.electronPath) {
      command[0] = ctx.electronPath;
      const env = tool.environment ?? {};
      env.ELECTRON_RUN_AS_NODE = "1";
      tool.environment = env;
    }
    for (let i = 1; i < command.length; i++) {
      if (command[i].startsWith("../")) {
        command[i] = path.join(resourcesPath, command[i].replace(/^\.\.\//, ""));
      } else if (command[i].startsWith("./")) {
        command[i] = path.join(resourcesPath, command[i].replace(/^\.\//, ""));
      }
    }
  }
}
function stripPluginProfilePrefix(p2) {
  return p2.replace(/^(\.opencode-v2\/|\.\/)/, "");
}
function toLocalPluginSpecifier(pluginPath) {
  return pathToFileURL(pluginPath).href;
}
function ensureLocalPlugin(plugins, pluginPath) {
  const pluginSpecifier = toLocalPluginSpecifier(pluginPath);
  const existingIndexes = plugins.flatMap(
    (candidate, index) => candidate === pluginPath || candidate === pluginSpecifier ? [index] : []
  );
  if (existingIndexes.length > 0) {
    plugins[existingIndexes[0]] = pluginSpecifier;
    for (let i = existingIndexes.length - 1; i > 0; i--) {
      plugins.splice(existingIndexes[i], 1);
    }
    return false;
  }
  plugins.push(pluginSpecifier);
  return true;
}
function rewritePluginPaths(config, ctx, profileSourceConfigDir) {
  if (!ctx.isPackaged || !ctx.resourcesPath) return;
  const plugins = config.plugin;
  if (!plugins || plugins.length === 0) return;
  const sourceConfigDir = profileSourceConfigDir ?? path.join(ctx.resourcesPath, "agent-profiles", "v2", "config");
  for (let i = 0; i < plugins.length; i++) {
    const p2 = plugins[i];
    let localPluginPath;
    if (p2.startsWith(".opencode-v2/") || p2.startsWith("./")) {
      localPluginPath = path.join(sourceConfigDir, stripPluginProfilePrefix(p2));
    } else if (path.isAbsolute(p2)) {
      localPluginPath = p2;
    }
    if (localPluginPath) {
      plugins[i] = toLocalPluginSpecifier(localPluginPath);
    }
  }
  config.plugin = plugins;
}
function resolvePluginPathsDev(config, configDir, profileSourceConfigDir) {
  const plugins = config.plugin;
  if (!plugins || plugins.length === 0) return;
  const sourceConfigDir = profileSourceConfigDir ?? path.resolve(configDir, "..", "..", ".opencode-v2");
  for (let i = 0; i < plugins.length; i++) {
    const p2 = plugins[i];
    let localPluginPath;
    if (p2.startsWith(".opencode-v2/") || p2.startsWith("./")) {
      localPluginPath = path.join(sourceConfigDir, stripPluginProfilePrefix(p2));
    } else if (path.isAbsolute(p2)) {
      localPluginPath = p2;
    }
    if (localPluginPath) {
      plugins[i] = toLocalPluginSpecifier(localPluginPath);
    }
  }
  config.plugin = plugins;
}
function injectHiloPlugin(config, configDir, ctx) {
  let pluginPath;
  if (ctx?.isPackaged) {
    if (!ctx.resourcesPath) {
      console.error("[hilo-plugin-inject] SKIPPED: packaged but resourcesPath is empty");
      return;
    }
    pluginPath = path.join(ctx.resourcesPath, "opencode-plugin-hilo", "dist", "hilo.js");
  } else {
    const repoRoot = path.resolve(configDir, "..", "..");
    pluginPath = path.join(repoRoot, "app", "packages", "opencode-plugin-hilo", "dist", "hilo.js");
  }
  if (!fs$1.existsSync(pluginPath)) {
    const underTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
    if (!ctx?.isPackaged && !underTest) {
      throw new Error(
        `[hilo-plugin-inject] plugin entry not found at ${pluginPath}. Rebuild it first: pnpm -F @hilo/opencode-plugin-hilo build`
      );
    }
    console.error(
      `[hilo-plugin-inject] FATAL: plugin entry not found at ${pluginPath} (packaged=${!!ctx?.isPackaged}); media model selection will not be enforced`
    );
  }
  const plugins = config.plugin ?? [];
  const pluginSpecifier = toLocalPluginSpecifier(pluginPath);
  if (!ensureLocalPlugin(plugins, pluginPath)) {
    console.log(`[hilo-plugin-inject] already present in config.plugin: ${pluginSpecifier}`);
    return;
  }
  config.plugin = plugins;
  console.log(
    `[hilo-plugin-inject] injected (packaged=${!!ctx?.isPackaged}, total plugins=${plugins.length}): ${pluginSpecifier}`
  );
}
function injectTracePlugin(config, configDir, ctx) {
  let pluginPath;
  if (ctx?.isPackaged) {
    if (!ctx.resourcesPath) return;
    pluginPath = path.join(ctx.resourcesPath, "opencode-plugin-trace", "dist", "trace.js");
  } else {
    const repoRoot = path.resolve(configDir, "..", "..");
    pluginPath = path.join(
      repoRoot,
      "app",
      "packages",
      "opencode-plugin-trace",
      "dist",
      "trace.js"
    );
  }
  const plugins = config.plugin ?? [];
  ensureLocalPlugin(plugins, pluginPath);
  config.plugin = plugins;
}
function stripLegacyReflectionIdentityBlocks(config) {
  if (!isBenchmarkEnvEnabled()) return;
  const agents = config.agent ?? {};
  for (const agent of Object.values(agents)) {
    if (typeof agent.description !== "string") continue;
    const stripped = agent.description.replace(BENCHMARK_IDENTITY_BLOCK_REGEX, "").trimEnd();
    if (stripped !== agent.description) agent.description = stripped;
  }
}
const BENCHMARK_IDENTITY_OPEN = "<!-- benchmark-reflection-identity:start -->";
const BENCHMARK_IDENTITY_CLOSE = "<!-- benchmark-reflection-identity:end -->";
const BENCHMARK_IDENTITY_BLOCK_REGEX = new RegExp(
  `\\n*${escapeRegExp(BENCHMARK_IDENTITY_OPEN)}[\\s\\S]*?${escapeRegExp(BENCHMARK_IDENTITY_CLOSE)}\\n*`,
  "g"
);
function escapeRegExp(s3) {
  return s3.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function isBenchmarkEnvEnabled() {
  const v = process.env.HILO_BENCHMARK;
  return v === "1" || v === "true";
}
function getAgentStagingDir() {
  return path.join(os$1.tmpdir(), `hilo-opencode-staging-${process.pid}`);
}
const STAGING_DIR_NAME_RE = /^hilo-opencode-staging-(\d+)$/;
function isProcessAlive$1(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err?.code === "EPERM";
  }
}
function cleanupOrphanedAgentStagingDirs(log) {
  const tmpDir = os$1.tmpdir();
  let entries;
  try {
    entries = fs$1.readdirSync(tmpDir, { withFileTypes: true });
  } catch (err) {
    log?.warn(
      `[opencode] Failed to scan ${tmpDir} for orphaned staging dirs: ${err instanceof Error ? err.message : String(err)}`
    );
    return { removed: 0, skipped: 0 };
  }
  let removed = 0;
  let skipped = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const match = STAGING_DIR_NAME_RE.exec(entry.name);
    if (!match) continue;
    const pid = Number(match[1]);
    if (!Number.isSafeInteger(pid) || pid <= 0) continue;
    if (pid === process.pid || isProcessAlive$1(pid)) {
      skipped++;
      continue;
    }
    try {
      fs$1.rmSync(path.join(tmpDir, entry.name), { recursive: true, force: true });
      removed++;
    } catch (err) {
      log?.warn(
        `[opencode] Failed to remove orphaned staging dir ${entry.name}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  if (removed > 0) {
    log?.info(
      `[opencode] Removed ${removed} orphaned agent staging dir(s) from ${tmpDir}` + (skipped > 0 ? ` (${skipped} left in place — owning process still running)` : "")
    );
  }
  return { removed, skipped };
}
const STAGING_COPY_ONLY_FILES = /* @__PURE__ */ new Set([
  "package.json",
  "package-lock.json",
  "bun.lock",
  "bun.lockb"
]);
function isContractInjectVerbose() {
  const raw = process.env.HILO_VERBOSE;
  if (raw == null) return false;
  return !["", "0", "false", "no"].includes(raw.trim().toLowerCase());
}
function setupAgentStaging(sourceConfigDir, ctx) {
  const stagingDir = getAgentStagingDir();
  const agentsDir = path.join(sourceConfigDir, "agents");
  const contractsDir = resolveContractsDirFromConfigDir(sourceConfigDir, !!ctx?.isPackaged);
  try {
    fs$1.rmSync(stagingDir, { recursive: true, force: true });
    fs$1.mkdirSync(stagingDir, { recursive: true });
  } catch (err) {
    console.error(`[contract-inject] FATAL: failed to prepare staging dir ${stagingDir}: ${err}`);
    return void 0;
  }
  if (!fs$1.existsSync(contractsDir)) {
    console.error(
      `[contract-inject] FATAL: contracts dir not found at ${contractsDir} (packaged=${!!ctx?.isPackaged}); agents will not receive auto-injected contracts`
    );
    writeStagingMarker(stagingDir, {
      contractsCount: 0,
      agentsCount: 0,
      success: false,
      reason: "contracts_not_found"
    });
    return void 0;
  }
  if (!fs$1.existsSync(agentsDir)) {
    console.error(
      `[contract-inject] FATAL: agents dir not found at ${agentsDir} (packaged=${!!ctx?.isPackaged}); cannot inject contracts`
    );
    writeStagingMarker(stagingDir, {
      contractsCount: 0,
      agentsCount: 0,
      success: false,
      reason: "agents_not_found"
    });
    return void 0;
  }
  const contracts = [];
  let entries;
  try {
    entries = fs$1.readdirSync(contractsDir, { withFileTypes: true });
  } catch (err) {
    console.error(`[contract-inject] FATAL: failed to read ${contractsDir}: ${err}`);
    writeStagingMarker(stagingDir, {
      contractsCount: 0,
      agentsCount: 0,
      success: false,
      reason: "read_failed"
    });
    return void 0;
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".md")) continue;
    if (entry.name === "README.md") continue;
    const filePath = path.join(contractsDir, entry.name);
    let raw;
    try {
      raw = fs$1.readFileSync(filePath, "utf-8");
    } catch (err) {
      console.error(`[contract-inject] failed to read ${filePath}: ${err}`);
      continue;
    }
    const meta = parseFrontmatter(raw);
    const agentsList = meta.agents ?? [];
    if (agentsList.length === 0) {
      console.warn(
        `[contract-inject] contract "${entry.name}" missing or empty \`agents:\` frontmatter — skipped (declare \`agents: ['*']\` to inject into all agents)`
      );
      continue;
    }
    const bodyMatch = raw.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)$/);
    const content = (bodyMatch ? bodyMatch[1] : raw).trim();
    if (!content) continue;
    const name = meta.name || entry.name.replace(/\.md$/, "");
    contracts.push({ name, agents: agentsList, content });
  }
  if (contracts.length === 0) {
    console.warn(
      `[contract-inject] no contracts loaded from ${contractsDir} — staging will continue so media-agent still receives knowledge-base header injection`
    );
  }
  let agentEntries;
  try {
    agentEntries = fs$1.readdirSync(agentsDir, { withFileTypes: true });
  } catch (err) {
    console.error(`[contract-inject] FATAL: failed to read ${agentsDir}: ${err}`);
    writeStagingMarker(stagingDir, {
      contractsCount: contracts.length,
      agentsCount: 0,
      success: false,
      reason: "read_failed"
    });
    return void 0;
  }
  let sourceEntries;
  try {
    sourceEntries = fs$1.readdirSync(sourceConfigDir, { withFileTypes: true });
  } catch (err) {
    console.error(
      `[contract-inject] FATAL: failed to read sourceConfigDir ${sourceConfigDir}: ${err}`
    );
    writeStagingMarker(stagingDir, {
      contractsCount: contracts.length,
      agentsCount: agentEntries.length,
      success: false,
      reason: "source_config_read_failed"
    });
    return void 0;
  }
  for (const entry of sourceEntries) {
    if (entry.name === "agent" || entry.name === "agents") continue;
    const target = path.join(sourceConfigDir, entry.name);
    const link = path.join(stagingDir, entry.name);
    if (STAGING_COPY_ONLY_FILES.has(entry.name)) {
      try {
        fs$1.cpSync(target, link, { recursive: true, force: true, dereference: true });
      } catch (cpErr) {
        console.error(`[contract-inject] failed to copy ${target} → ${link}: ${cpErr}`);
      }
      continue;
    }
    try {
      fs$1.symlinkSync(target, link);
    } catch (symlinkErr) {
      try {
        fs$1.cpSync(target, link, { recursive: true, force: true, dereference: true });
        console.warn(
          `[contract-inject] symlink ${target} → ${link} failed (${symlinkErr.message}); fell back to recursive copy`
        );
      } catch (cpErr) {
        console.error(
          `[contract-inject] failed to stage ${target} → ${link}: symlink=${symlinkErr}, cp=${cpErr}`
        );
      }
    }
  }
  const knowledgeDir = path.join(sourceConfigDir, "knowledge");
  const vendorsDir = path.join(knowledgeDir, "vendors");
  let knowledgeBlock = "";
  if (fs$1.existsSync(knowledgeDir) && fs$1.existsSync(vendorsDir)) {
    knowledgeBlock = [
      "<knowledge-base>",
      "# Knowledge Base Directory (auto-injected)",
      "",
      `**Base directory**: \`${knowledgeDir}\``,
      "",
      "When this SP cites a relative knowledge path (e.g.",
      "`vendors/banana.md`, `failures/anatomy-traps.md`),",
      `expand it to the absolute path under \`${knowledgeDir}/\` before calling`,
      "`hub_read`. Never Read the literal relative form — it would resolve to the",
      "user workspace and fail.",
      "</knowledge-base>"
    ].join("\n");
  } else {
    console.error(
      `[knowledge-inject] FATAL: knowledge base not found under ${knowledgeDir} (expected vendors/; packaged=${!!ctx?.isPackaged}); media-agent knowledge-base header will be missing`
    );
  }
  const knowledgeHeaderForSubAgent = [
    "<knowledge-base>",
    "# Knowledge Base Directory (auto-injected)",
    "",
    `**Base directory**: \`${knowledgeDir}\``,
    "",
    "When an injected contract instructs you to Read a path prefixed with",
    "`<knowledgeDir>` (e.g. `<knowledgeDir>/model-prompts/nano-banana.md`),",
    "expand `<knowledgeDir>` to the absolute path above and Read the resulting",
    "full path. Never Read the literal `<knowledgeDir>/...` form — it would",
    "resolve to the user workspace and fail.",
    "",
    "You MUST NOT proactively browse this directory. Only Read files explicitly",
    "named by an injected contract.",
    "</knowledge-base>"
  ].join("\n");
  const workflowsDir = resolveWorkflowsDirFromConfigDir(sourceConfigDir, !!ctx?.isPackaged);
  const workflowsIndex = path.join(workflowsDir, "workflow.md");
  let workflowsBlock = "";
  if (fs$1.existsSync(workflowsIndex)) {
    workflowsBlock = [
      "<workflows-base>",
      "# Workflows Directory (auto-injected)",
      "",
      `**Base directory**: \`${workflowsDir}\``,
      "",
      "Layout: `workflow.md` (routing index), `README.md` (directory guide),",
      "`<project_type>/workflow.md` for each",
      "project workflow, and `_shared/<name>.md` for cross-workflow utilities.",
      "When the SP or an injected contract cites a path prefixed with",
      "`<workflowsDir>` (e.g. `<workflowsDir>/ad-tvc/workflow.md`), expand",
      "`<workflowsDir>` to the absolute path above before calling `hub_read`.",
      "`_disabled/` is an archive only and is never a `workflow_match` target.",
      "Never Read the literal `<workflowsDir>/...` form — it would resolve to",
      "the user workspace and fail.",
      "</workflows-base>"
    ].join("\n");
  } else {
    console.error(
      `[workflows-inject] workflows index not found at ${workflowsIndex} (packaged=${!!ctx?.isPackaged}); workflows-base header will be missing`
    );
  }
  const stagedAgentsDir = path.join(stagingDir, "agents");
  try {
    fs$1.mkdirSync(stagedAgentsDir, { recursive: true });
  } catch (err) {
    console.error(`[contract-inject] FATAL: failed to mkdir ${stagedAgentsDir}: ${err}`);
    writeStagingMarker(stagingDir, {
      contractsCount: contracts.length,
      agentsCount: agentEntries.length,
      success: false,
      reason: "write_failed"
    });
    return void 0;
  }
  let writeFailures = 0;
  let readFailures = 0;
  let splicedCount = 0;
  const spliceSummary = [];
  for (const entry of agentEntries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".md")) continue;
    const agentName = entry.name.replace(/\.md$/, "");
    const matched = contracts.filter((c) => c.agents.includes("*") || c.agents.includes(agentName));
    const isMediaAgent = agentName === "media-agent";
    const hasMatchedContract = matched.length > 0;
    let raw;
    try {
      raw = fs$1.readFileSync(path.join(agentsDir, entry.name), "utf-8");
    } catch (err) {
      readFailures++;
      console.error(`[contract-inject] failed to read agent ${entry.name}: ${err}`);
      continue;
    }
    let staged;
    if (!hasMatchedContract && !(isMediaAgent && (knowledgeBlock || workflowsBlock))) {
      staged = raw;
    } else {
      const blob = matched.map((c) => `<contract name="${c.name}">
${c.content}
</contract>`).join("\n\n");
      let knowledgeSuffix = "";
      if (isMediaAgent && knowledgeBlock) {
        knowledgeSuffix = `

${knowledgeBlock}`;
      } else if (hasMatchedContract) {
        knowledgeSuffix = `

${knowledgeHeaderForSubAgent}`;
      }
      const workflowsSuffix = workflowsBlock && (isMediaAgent || hasMatchedContract) ? `

${workflowsBlock}` : "";
      const contractsBlob = blob ? `

<!-- Contracts: auto-injected cross-cutting rules for this agent. -->

${blob}` : "";
      const fmMatch = raw.match(/^(---\s*\n[\s\S]*?\n---\s*\n)([\s\S]*)$/);
      if (fmMatch) {
        staged = `${fmMatch[1]}${fmMatch[2].trim()}${contractsBlob}${knowledgeSuffix}${workflowsSuffix}
`;
      } else {
        staged = `${raw.trim()}${contractsBlob}${knowledgeSuffix}${workflowsSuffix}
`;
      }
      if (hasMatchedContract) {
        spliceSummary.push(`${agentName}×${matched.length}`);
        if (isContractInjectVerbose()) {
          console.log(
            `[contract-inject] ${agentName}: spliced ${matched.length} contract(s) → ${matched.map((c) => c.name).join(", ")}`
          );
        }
      }
      if (isContractInjectVerbose()) {
        if (isMediaAgent && knowledgeBlock) {
          console.log(
            `[knowledge-inject] media-agent: spliced lightweight knowledge-base header (no INDEX inline)`
          );
        } else if (hasMatchedContract) {
          console.log(
            `[knowledge-inject] ${agentName}: spliced knowledge-base header (lightweight)`
          );
        }
      }
      splicedCount++;
    }
    try {
      fs$1.writeFileSync(path.join(stagedAgentsDir, entry.name), staged, "utf-8");
    } catch (err) {
      writeFailures++;
      console.error(`[contract-inject] failed to write ${entry.name} to staging: ${err}`);
    }
  }
  if (splicedCount === 0) {
    if (contracts.length === 0) {
      console.warn(
        `[contract-inject] empty contracts dir; no agents received contract injection (knowledge-base header may still apply to media-agent if knowledge/references/ exists)`
      );
    } else {
      console.warn(
        `[contract-inject] loaded ${contracts.length} contract(s) but no agents matched — check frontmatter \`agents:\` values vs filenames in ${agentsDir}`
      );
    }
  } else if (!isContractInjectVerbose()) {
    console.log(
      `[contract-inject] spliced ${splicedCount} agent(s) — ${spliceSummary.join(" ")} (HILO_VERBOSE=1 for per-contract detail)`
    );
  }
  const stagingFailures = readFailures + writeFailures;
  writeStagingMarker(stagingDir, {
    contractsCount: contracts.length,
    agentsCount: agentEntries.length,
    success: stagingFailures === 0,
    ...stagingFailures > 0 ? {
      reason: `partial_staging_failure_${stagingFailures}_${readFailures > 0 && writeFailures > 0 ? "rw" : readFailures > 0 ? "read" : "write"}`
    } : {}
  });
  return stagingDir;
}
function writeStagingMarker(stagingDir, payload) {
  try {
    fs$1.writeFileSync(
      resolveContractsStagingMarkerPath(stagingDir),
      JSON.stringify({ stagedAt: (/* @__PURE__ */ new Date()).toISOString(), ...payload })
    );
  } catch (err) {
    console.warn(`[contract-inject] failed to write staging marker: ${err}`);
  }
}
async function fetchRemoteProviderConfigResult(cloudGatewayUrl, token, logger, options) {
  const log = logger ?? console;
  const url = `${cloudGatewayUrl}/api/v1/config`;
  const configuredTimeoutMs = options?.timeoutMs;
  const timeoutMs = configuredTimeoutMs !== void 0 && Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0 ? Math.trunc(configuredTimeoutMs) : 5e3;
  const headers = {
    ...token ? { token } : {}
  };
  log.info(
    `[config] fetchRemoteProviderConfig: url=${url}, token=${token ? "***" : "(empty)"}, headers=${JSON.stringify(Object.keys(headers))}`
  );
  try {
    const requestUrl = new URL(url);
    requestUrl.searchParams.delete("hl_ads_url");
    let attribution = null;
    try {
      attribution = token ? options?.getAdAttribution?.(token) ?? null : null;
    } catch {
      log.warn("[config] Attribution unavailable; continuing without advertising params");
    }
    const attributionUrl = getRequestAdAttributionUrl(url, token, attribution);
    if (attributionUrl) requestUrl.searchParams.set("hl_ads_url", attributionUrl);
    const resp = await fetch(requestUrl.toString(), {
      signal: AbortSignal.timeout(timeoutMs),
      headers
    });
    log.info(`[config] fetchRemoteProviderConfig response: status=${resp.status}`);
    if (!resp.ok) {
      const body = await resp.text();
      const outcome = resp.status === 401 || resp.status === 403 ? "auth_failed" : "fetch_failed";
      log.warn(
        `[config] fetchRemoteProviderConfig failed: ${resp.status} ${resp.statusText} (${outcome}, body ${body.length} bytes)`
      );
      return { outcome, config: null, status: resp.status };
    }
    const data = await resp.json();
    log.info(`[config] fetchRemoteProviderConfig keys: ${JSON.stringify(Object.keys(data))}`);
    log.info(
      `[config] fetchRemoteProviderConfig permission: ${JSON.stringify(data.permission ?? null)}`
    );
    return { outcome: "ok", config: data, status: resp.status };
  } catch {
    log.warn("[config] fetchRemoteProviderConfig request failed");
    return { outcome: "fetch_failed", config: null };
  }
}
async function fetchRemoteProviderConfig(cloudGatewayUrl, token, logger, options) {
  return (await fetchRemoteProviderConfigResult(cloudGatewayUrl, token, logger, options)).config;
}
function stripProviderSecrets(config) {
  const clone = JSON.parse(JSON.stringify(config));
  const provider = clone.provider;
  if (provider == null || typeof provider !== "object" || Array.isArray(provider)) return clone;
  for (const entry of Object.values(provider)) {
    if (entry == null || typeof entry !== "object" || Array.isArray(entry)) continue;
    const rec = entry;
    const options = rec.options;
    if (options != null && typeof options === "object" && !Array.isArray(options)) {
      delete options.apiKey;
      delete options.headers;
    }
    const models = rec.models;
    if (models != null && typeof models === "object" && !Array.isArray(models)) {
      for (const model of Object.values(models)) {
        if (model != null && typeof model === "object" && !Array.isArray(model)) {
          delete model.headers;
        }
      }
    }
  }
  return clone;
}
function parseMcpHeapCapMb(raw) {
  if (!raw) return void 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : void 0;
}
function withNodeHeapCap(existing, capMb) {
  if (existing && /--max-old-space-size\b/.test(existing)) return existing;
  return existing && existing.length > 0 ? `${existing} --max-old-space-size=${capMb}` : `--max-old-space-size=${capMb}`;
}
function buildConfigContent(configDir, channel, region, userToken, options) {
  const {
    packagingCtx,
    mcpEnvOverrides,
    systemCaCertsPath,
    skillPermissions,
    customMcpServers,
    remoteConfig,
    customModels,
    skillsPaths,
    skillIsolation,
    evalSkillAgentGrants,
    deviceId,
    versionCode,
    lane,
    profileSourceConfigDir
  } = options ?? {};
  const config = loadMergedConfig(configDir, channel, region);
  delete config.media_models;
  if (remoteConfig) {
    if (remoteConfig.enabled_providers) config.enabled_providers = remoteConfig.enabled_providers;
    if (remoteConfig.model) config.model = remoteConfig.model;
    if (remoteConfig.provider) config.provider = remoteConfig.provider;
    if (remoteConfig.permission) config.permission = remoteConfig.permission;
    if (remoteConfig.compaction) config.compaction = remoteConfig.compaction;
    if (remoteConfig.agent_model) {
      const agentModelMap = remoteConfig.agent_model;
      const agents = config.agent ?? {};
      for (const [agentName, model] of Object.entries(agentModelMap)) {
        if (agents[agentName]) {
          agents[agentName].model = model;
        }
      }
      config.agent = agents;
    }
  }
  const localProviders = customModels ?? {};
  const customProviderIds = Object.keys(localProviders);
  if (customProviderIds.some((id) => !isCustomModelProvider(id)))
    throw new Error("Invalid custom provider identity");
  if (customProviderIds.length) {
    config.provider = {
      ...config.provider ?? {},
      ...Object.fromEntries(
        Object.entries(localProviders).map(([id, settings]) => [
          id,
          buildCustomProviderConfig(settings)
        ])
      )
    };
    if (Array.isArray(config.enabled_providers))
      config.enabled_providers = [.../* @__PURE__ */ new Set([...config.enabled_providers, ...customProviderIds])];
    if (Array.isArray(config.disabled_providers))
      config.disabled_providers = config.disabled_providers.filter(
        (id) => !customProviderIds.includes(String(id))
      );
    const agents = config.agent ?? {};
    for (const agent of Object.values(agents)) delete agent.model;
    config.agent = agents;
    delete config.small_model;
  }
  if (!config.permission) {
    config.permission = { "*": "allow" };
  }
  const resolved = resolvedSkillPaths(skillIsolation);
  const pluginSkills = resolvedPluginSkillPaths(skillIsolation);
  const hasEvalSkillMounts = !!skillsPaths && skillsPaths.length > 0 && !!evalSkillAgentGrants && Object.keys(evalSkillAgentGrants).length > 0;
  const baseSkillsPaths = mergeSkillPaths(resolved.paths, pluginSkills.paths);
  const rawSkillsPaths = skillsPaths && skillsPaths.length > 0 ? hasEvalSkillMounts ? mergeSkillPaths(baseSkillsPaths, skillsPaths) : mergeSkillPaths(skillsPaths, pluginSkills.paths) : baseSkillsPaths;
  const baseSkillPerms = config.agent?.["media-agent"]?.permission?.skill ?? {};
  const mergedPermsForFilter = {
    ...baseSkillPerms,
    ...skillPermissions ?? {}
  };
  const effectiveSkillsPaths = filterDisabledSkillPaths(rawSkillsPaths, mergedPermsForFilter);
  config.skills = {
    ...config.skills ?? {},
    paths: effectiveSkillsPaths
  };
  stripLegacyReflectionIdentityBlocks(config);
  if (skillPermissions && Object.keys(skillPermissions).length > 0) {
    const agents = config.agent ?? {};
    for (const [, raw] of Object.entries(agents)) {
      const agentObj = raw;
      if (agentObj?.mode === "subagent" || agentObj?.disable) continue;
      const permission = agentObj.permission ?? {};
      const baseSkill = permission.skill ?? {};
      permission.skill = { ...baseSkill, ...skillPermissions };
      agentObj.permission = permission;
    }
    config.agent = agents;
  }
  if (evalSkillAgentGrants && Object.keys(evalSkillAgentGrants).length > 0) {
    const agents = config.agent ?? {};
    const mountedSkillNames = /* @__PURE__ */ new Set();
    for (const names of Object.values(evalSkillAgentGrants)) {
      for (const name of names) mountedSkillNames.add(name);
    }
    for (const [agentName, raw] of Object.entries(agents)) {
      const agentObj = raw;
      if (agentObj?.disable) continue;
      const permission = agentObj.permission ?? {};
      const baseSkill = permission.skill ?? {};
      const nextSkill = { ...baseSkill };
      const allowedForAgent = new Set(evalSkillAgentGrants[agentName] ?? []);
      for (const skillName of mountedSkillNames) {
        nextSkill[skillName] = allowedForAgent.has(skillName) ? "allow" : "deny";
      }
      permission.skill = nextSkill;
      agentObj.permission = permission;
    }
    config.agent = agents;
  }
  if (packagingCtx) {
    rewriteMcpPaths(config, packagingCtx);
    rewritePluginPaths(config, packagingCtx, profileSourceConfigDir);
  }
  if (!packagingCtx?.isPackaged) {
    const mcpDev = config.mcp;
    if (mcpDev) {
      const desktopDir = path.resolve(configDir, "..", "..", "app", "desktop");
      for (const server of Object.values(mcpDev)) {
        const command = server.command;
        if (!command) continue;
        for (let i = 0; i < command.length; i++) {
          if (command[i].startsWith("../") || command[i].startsWith("./")) {
            command[i] = path.resolve(desktopDir, command[i]);
          }
        }
      }
    }
    resolvePluginPathsDev(config, configDir, profileSourceConfigDir);
  }
  injectHiloPlugin(config, configDir, packagingCtx);
  injectTracePlugin(config, configDir, packagingCtx);
  const defaultMcpEnvOverrides = {};
  if (process.env.HILO_USER_LANG) {
    defaultMcpEnvOverrides.HILO_USER_LANG = process.env.HILO_USER_LANG;
  }
  const effectiveMcpEnvOverrides = {
    ...defaultMcpEnvOverrides,
    ...mcpEnvOverrides ?? {}
  };
  const mcpHeapCapMb = parseMcpHeapCapMb(process.env.HILO_MCP_HEAP_CAP);
  if (Object.keys(effectiveMcpEnvOverrides).length > 0 || mcpHeapCapMb !== void 0 || config.mcp) {
    const mcp = config.mcp ?? {};
    const injectSystemCa = packagingCtx?.isPackaged === true || pathNodeSupportsSystemCa();
    for (const server of Object.values(mcp)) {
      const env = server.environment ?? {};
      Object.assign(env, effectiveMcpEnvOverrides);
      if (injectSystemCa) {
        env.NODE_OPTIONS = withNodeSystemCa(env.NODE_OPTIONS);
      }
      applyNodeExtraCaCerts(env, systemCaCertsPath);
      if (mcpHeapCapMb !== void 0) {
        env.NODE_OPTIONS = withNodeHeapCap(env.NODE_OPTIONS, mcpHeapCapMb);
      }
      server.environment = env;
    }
    config.mcp = mcp;
  }
  if (customMcpServers && Object.keys(customMcpServers).length > 0) {
    const bundledMcp = config.mcp ?? {};
    const mergedMcp = { ...bundledMcp };
    for (const [name, rawConfig] of Object.entries(customMcpServers)) {
      if (Object.hasOwn(bundledMcp, name) || isReservedCustomMcpName(name)) continue;
      mergedMcp[name] = markCustomMcpConfig(cloneCustomMcpConfig(rawConfig));
    }
    config.mcp = mergedMcp;
  }
  if (!userToken) {
    console.log(
      "[config] buildConfigContent permission:",
      JSON.stringify(config.permission ?? null)
    );
    return JSON.stringify(config);
  }
  const providers = config.provider ?? {};
  for (const [providerId, provider] of Object.entries(providers)) {
    if (isCustomModelProvider(providerId)) continue;
    const options2 = provider.options ?? {};
    const baseURL = options2.baseURL;
    if (!baseURL || !isPlatformProvider(baseURL)) continue;
    if (!options2.apiKey) {
      options2.apiKey = "sk-hilo-placeholder";
    }
    provider.options = options2;
    const models = provider.models ?? {};
    for (const model of Object.values(models)) {
      const headers = model.headers ?? {};
      headers.token = userToken;
      if (deviceId) {
        headers.device_id = deviceId;
      }
      if (versionCode) {
        headers.version_code = normalizeVersionCodeForCloud(versionCode);
      }
      const effectiveLane = (lane ?? process.env.LANE ?? "").trim();
      if (effectiveLane) {
        headers["bedrock-lane"] = effectiveLane;
      }
      model.headers = headers;
    }
    provider.models = models;
  }
  config.provider = providers;
  console.log("[config] buildConfigContent permission:", JSON.stringify(config.permission ?? null));
  return JSON.stringify(config);
}
function cloneCustomMcpConfig(config) {
  if (config.type === "local") {
    return {
      ...config,
      command: [...config.command],
      ...config.environment ? { environment: { ...config.environment } } : {}
    };
  }
  return {
    ...config,
    ...config.headers ? { headers: { ...config.headers } } : {}
  };
}
function mergeSkillPaths(base, extra) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const raw of [...base, ...extra]) {
    const value = raw.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}
function filterDisabledSkillPaths(skillPaths, skillPerms) {
  if (Object.keys(skillPerms).length === 0) return skillPaths;
  return skillPaths.filter((skillDir) => {
    const skillMd = path.join(skillDir, "SKILL.md");
    try {
      const content = fs$1.readFileSync(skillMd, "utf-8");
      const meta = parseFrontmatter(content);
      const name = meta.name ?? path.basename(skillDir);
      return isSkillEnabled(name, skillPerms);
    } catch {
      return true;
    }
  });
}
function bindGatewayAuthBootstrap(child, options) {
  let delivered = false;
  const cleanup = () => {
    child.off("message", onMessage);
    child.off("exit", cleanup);
    child.off("error", cleanup);
    child.off("disconnect", cleanup);
  };
  const onMessage = (message) => {
    if (!message || typeof message !== "object" || !("type" in message) || message.type !== GATEWAY_AUTH_BOOTSTRAP_REQUEST)
      return;
    cleanup();
    if (!options.isCurrent() || !child.connected) return;
    try {
      const snapshot2 = normalizeGatewayAuthSnapshot(options.getSnapshot(), options.region);
      if (!snapshot2) throw new Error("Invalid auth snapshot");
      child.send(
        { type: GATEWAY_AUTH_BOOTSTRAP_RESPONSE, snapshot: snapshot2 },
        (error) => {
          if (error) options.warn("[gateway] Auth bootstrap delivery failed");
          else if (options.isCurrent()) delivered = true;
        }
      );
    } catch {
      options.warn("[gateway] Auth bootstrap snapshot unavailable");
    }
  };
  child.on("message", onMessage);
  child.once("exit", cleanup);
  child.once("error", cleanup);
  child.once("disconnect", cleanup);
  return () => delivered;
}
var __getOwnPropDesc$1 = Object.getOwnPropertyDescriptor;
var __decorateClass$1 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$1(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = decorator(result) || result;
  return result;
};
var __decorateParam$1 = (index, decorator) => (target, key) => decorator(target, key, index);
const DEFAULT_OPTIONS = {
  healthCheckTimeout: 15e3,
  healthCheckInterval: 300,
  entryPath: "",
  preferredPort: 8001,
  ffmpegPath: "",
  ffprobePath: ""
};
const MAX_PORT_RETRIES = 8;
const DEFAULT_GATEWAY_HOST = "127.0.0.1";
const GATEWAY_HEAP_OVERRIDE_ENV = "HILO_GATEWAY_MAX_OLD_SPACE_MB";
const GATEWAY_HEAP_OVERRIDE_MIN_MB = 128;
const GATEWAY_HEAP_OVERRIDE_MAX_MB = 8192;
const GATEWAY_HEAP_APP_LEVEL_MB = 1024;
const GATEWAY_HEAP_WORKSPACE_MB = 2048;
const GATEWAY_HEAP_FULL_SYSTEM_MIN_MB = 8192;
const GATEWAY_HEAP_APP_LEVEL_LOW_MB = 512;
const GATEWAY_HEAP_WORKSPACE_LOW_MB = 1024;
const PATTERN_V8_HEAP_OOM = /JavaScript heap out of memory|Reached heap limit|Ineffective mark-compacts/i;
const PATTERN_ARRAYBUFFER_ALLOCATION_FAILED = /ArrayBuffer allocation failed|Array buffer allocation failed|invalid array buffer length/i;
const PATTERN_RSS_OR_OS_OOM = /\bENOMEM\b|Cannot allocate memory|system out of memory|allocation failed - process out of memory/i;
const LIVENESS_INTERVAL_MS = 3e4;
const LIVENESS_FAIL_THRESHOLD = 3;
const LIVENESS_SUSPEND_GAP_MS = LIVENESS_INTERVAL_MS * 3;
const ENSURE_RUNNING_HEALTH_ATTEMPTS = 3;
const GATEWAY_STOP_GRACE_MS = process.platform === "win32" ? 1e3 : 5e3;
const GATEWAY_FORCE_EXIT_WAIT_MS = 1e3;
const reservedGatewayPorts = /* @__PURE__ */ new Set();
const releasedGatewayPortOwners = /* @__PURE__ */ new Map();
const PICK_PORT_MAX_TRIES = 100;
function releaseReservedGatewayPort(port, ownerKey) {
  if (port > 0) {
    reservedGatewayPorts.delete(port);
    if (ownerKey) {
      releasedGatewayPortOwners.set(port, ownerKey);
    }
  }
}
function isPortQuarantinedFor(port, requesterKey) {
  const ownerKey = releasedGatewayPortOwners.get(port);
  if (!ownerKey) return false;
  return !(requesterKey && requesterKey === ownerKey);
}
function throwIfAborted(signal, phase) {
  if (signal?.aborted) {
    throw new Error(`[gateway-manager] ensureRunning aborted ${phase}`);
  }
}
function delay$1(ms2, signal) {
  throwIfAborted(signal, "during retry delay");
  return new Promise((resolve2, reject) => {
    let timer = null;
    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      signal?.removeEventListener("abort", handleAbort);
    };
    const handleAbort = () => {
      cleanup();
      reject(new Error("[gateway-manager] ensureRunning aborted during retry delay"));
    };
    timer = setTimeout(
      () => {
        cleanup();
        resolve2();
      },
      Math.max(0, ms2)
    );
    timer.unref?.();
    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}
function isValidPreferredPort(port) {
  return Number.isInteger(port) && port > 0 && port < 65536;
}
function resolveGatewayHeapLimitMB(role, systemTotalMB, env, logService) {
  const overrideRaw = env[GATEWAY_HEAP_OVERRIDE_ENV]?.trim();
  if (overrideRaw) {
    const overrideMB = Number(overrideRaw);
    if (Number.isInteger(overrideMB) && overrideMB >= GATEWAY_HEAP_OVERRIDE_MIN_MB && overrideMB <= GATEWAY_HEAP_OVERRIDE_MAX_MB) {
      return { heapLimitMB: overrideMB, source: GATEWAY_HEAP_OVERRIDE_ENV };
    }
    logService?.warn(
      `[gateway] Ignoring invalid ${GATEWAY_HEAP_OVERRIDE_ENV}="${overrideRaw}" (expected integer ${GATEWAY_HEAP_OVERRIDE_MIN_MB}..${GATEWAY_HEAP_OVERRIDE_MAX_MB}MB)`
    );
  }
  const lowMem = systemTotalMB > 0 && systemTotalMB < GATEWAY_HEAP_FULL_SYSTEM_MIN_MB;
  if (role === "workspace") {
    return {
      heapLimitMB: lowMem ? GATEWAY_HEAP_WORKSPACE_LOW_MB : GATEWAY_HEAP_WORKSPACE_MB,
      source: "default"
    };
  }
  return {
    heapLimitMB: lowMem ? GATEWAY_HEAP_APP_LEVEL_LOW_MB : GATEWAY_HEAP_APP_LEVEL_MB,
    source: "default"
  };
}
function gatewayListenHost() {
  return process.env.HILO_GATEWAY_HOST?.trim() || DEFAULT_GATEWAY_HOST;
}
function gatewayConnectHost(listenHost) {
  if (listenHost === "0.0.0.0") return DEFAULT_GATEWAY_HOST;
  if (listenHost === "::") return "::1";
  return listenHost;
}
function formatHostForUrl(host) {
  const connectHost = gatewayConnectHost(host);
  return connectHost.includes(":") && !connectHost.startsWith("[") ? `[${connectHost}]` : connectHost;
}
function gatewayUrlForPort(port) {
  return `http://${formatHostForUrl(gatewayListenHost())}:${port}`;
}
function pickPort(startPort, maxTries = PICK_PORT_MAX_TRIES, requesterKey) {
  if (!isValidPreferredPort(startPort)) {
    startPort = DEFAULT_OPTIONS.preferredPort;
  }
  let attempt = 0;
  const host = gatewayListenHost();
  const tryPort = (port) => new Promise((resolve2, reject) => {
    if (reservedGatewayPorts.has(port) || isPortQuarantinedFor(port, requesterKey)) {
      if (++attempt >= maxTries) {
        reject(new Error(`No free port found from ${startPort} to ${startPort + maxTries - 1}`));
      } else {
        resolve2(tryPort(port + 1));
      }
      return;
    }
    const server = net.createServer();
    server.once("error", () => {
      if (++attempt >= maxTries) {
        reject(new Error(`No free port found from ${startPort} to ${startPort + maxTries - 1}`));
      } else {
        resolve2(tryPort(port + 1));
      }
    });
    server.listen({ port, host }, () => {
      server.close(() => {
        reservedGatewayPorts.add(port);
        resolve2(port);
      });
    });
  });
  return tryPort(startPort);
}
class GatewayStartupError extends Error {
  constructor(message, errorKind) {
    super(message);
    this.errorKind = errorKind;
    this.name = "GatewayStartupError";
  }
  isGatewayStartupError = true;
}
function isGatewayStartupError(value) {
  return value instanceof Error && value.isGatewayStartupError === true && typeof value.errorKind === "string";
}
let GatewayManager = class extends Disposable {
  constructor(options, logService) {
    super();
    this.logService = logService;
    const definedOptions = options ? Object.fromEntries(Object.entries(options).filter(([, v]) => v !== void 0)) : {};
    this.options = { ...DEFAULT_OPTIONS, ...definedOptions };
    if (!isValidPreferredPort(this.options.preferredPort)) {
      this.logService.warn(
        `[gateway-manager] Invalid preferredPort ${String(
          this.options.preferredPort
        )}; falling back to ${DEFAULT_OPTIONS.preferredPort}`
      );
      this.options.preferredPort = DEFAULT_OPTIONS.preferredPort;
    }
    if (this.options.userLang) {
      process.env.HILO_USER_LANG = this.options.userLang;
    }
  }
  _onRuntimeEvent = this._register(new Emitter());
  onRuntimeEvent = this._onRuntimeEvent.event;
  process = null;
  _url = "";
  _port = 0;
  /**
   * Workspace identity for port quarantine bookkeeping (see
   * {@link releaseReservedGatewayPort}). Set on the first `start()` that
   * carries a workspaceDir; before that (bare `allocatePort()`), the owner is
   * unknown and quarantine checks are conservative (skip cooling ports).
   */
  _ownerKey;
  _workspaceClaim;
  _workspaceInstanceId;
  _workspaceGeneration = 0;
  options;
  /** Tracks early exit during waitForHealthy -- the exit handler sets this.process = null,
   *  so we need a separate flag to detect the process died before becoming healthy. */
  _earlyExit = null;
  _spawnError = null;
  _recentStderr = [];
  /** Latched after a matching nonce health response. Used to classify normal
   *  code=0 exits during startup as termination-before-health rather than a
   *  healthy planned shutdown. */
  _becameHealthy = false;
  /** Set to true while stop() is in progress. Allows exit handler to
   *  distinguish intentional teardown from unexpected signal kills. */
  _stopping = false;
  /** Random token injected into the subprocess so healthCheck can verify
   *  the HTTP response came from *our* process, not a stale gateway. */
  _nonce = "";
  indexStopBlocksSpawn = false;
  spawnEpoch = 0;
  lastStoppedSpawnEpoch = 0;
  indexStopWaiters = /* @__PURE__ */ new Set();
  emptyStopPreparations = 0;
  indexStopPreparation;
  _isAuthBootstrapped = () => true;
  // ── Post-startup liveness monitoring ──
  /** Interval handle for periodic liveness pings after startup. */
  _livenessInterval = null;
  /** Consecutive failed liveness pings. */
  _livenessFailCount = 0;
  /** Whether the liveness monitor already emitted a terminal unhealthy event. */
  _livenessFailed = false;
  /** Serialization guard: concurrent ensureRunning() calls share the same inflight promise. */
  _pendingEnsure = null;
  /** Timestamp of the last liveness check, used to detect suspend/resume gaps. */
  _lastLivenessCheckMs = 0;
  // ── Dist staleness guard ──
  /** entry-bundle mtime captured at spawn time. Liveness pings compare the
   *  current disk mtime against this to detect "developer rebuilt gateway
   *  but the running subprocess is still on the old bundle". 0 = not
   *  captured (entryPath unreadable at spawn time, very rare). */
  _distBaselineMtimeMs = 0;
  /** Latched so we only emit / log the warning once per gateway lifetime. */
  _distStaleEmitted = false;
  /** Skip the first liveness check after spawn — esbuild can update the
   *  bundle a few ms AFTER spawn during dev hot-loops. We only care about
   *  rebuilds that land while the process is actually serving requests. */
  static DIST_STALE_GRACE_MS = 1e3;
  setFFmpegPaths(ffmpegPath, ffprobePath) {
    this.options.ffmpegPath = ffmpegPath;
    this.options.ffprobePath = ffprobePath;
  }
  get url() {
    return this._url;
  }
  get pid() {
    return this.process?.pid ?? null;
  }
  get workspaceClaim() {
    return this._workspaceClaim;
  }
  get workspaceBinding() {
    if (!this._workspaceClaim || !this._workspaceInstanceId || this._workspaceGeneration < 1 || !this._url) {
      return void 0;
    }
    return {
      baseUrl: this._url,
      claim: this._workspaceClaim,
      instanceId: this._workspaceInstanceId,
      generation: this._workspaceGeneration
    };
  }
  prepareWorkspaceBinding() {
    if (!this._workspaceClaim || this._workspaceInstanceId) return;
    this._workspaceGeneration += 1;
    this._workspaceInstanceId = crypto.randomUUID();
  }
  assignWorkspaceOwner(workspaceDir) {
    if (!workspaceDir) return;
    const ownerKey = path.resolve(workspaceDir);
    if (this._ownerKey && this._ownerKey !== ownerKey) {
      throw new Error("GatewayManager cannot be rebound to a different workspace owner");
    }
    this._ownerKey = ownerKey;
    this._workspaceClaim ??= createWorkspaceIdentityClaim(ownerKey);
    this.prepareWorkspaceBinding();
  }
  /**
   * Pre-allocate a TCP port so that the URL is available before start().
   * Call this early to let dependents (e.g. MCP env) know the gateway URL.
   */
  async allocatePort(workspaceDir) {
    this.assignWorkspaceOwner(workspaceDir);
    if (this._port) return this._url;
    this._port = await pickPort(this.options.preferredPort, void 0, this._ownerKey);
    this._url = gatewayUrlForPort(this._port);
    return this._url;
  }
  /**
   * Start the gateway process and wait for it to be healthy.
   * @param workspaceDir - optional workspace directory; when set, the gateway
   *   subprocess receives WORKSPACE_DIR so WorkspacePathService locks to this folder.
   */
  async start(openCodeUrl, openCodeCredentials, workspaceDir, signal) {
    const admittedSpawnEpoch = this.spawnEpoch;
    if (this.indexStopBlocksSpawn) await this.waitForIndexStopDecision(signal);
    if (admittedSpawnEpoch < this.lastStoppedSpawnEpoch)
      throw new Error(`[${WORKSPACE_INDEX_SHUTDOWN_BLOCKED_CODE}] gateway-start-superseded`);
    this.assignWorkspaceOwner(workspaceDir);
    if (!this._port) {
      await this.allocatePort(workspaceDir);
    }
    this.prepareWorkspaceBinding();
    const entryPath = this.resolveEntryPath();
    this.logService.info(
      `[gateway-manager] Starting gateway at port ${this._port} from ${entryPath}`
    );
    const outputDir = process.env.OUTPUT_DIR ?? resolveOutputDir(this.options.platform.userDataPath);
    const logDir = process.env.LOG_DIR ?? path.join(this.options.platform.userDataPath, "logs", "gateway");
    const cwd = this.options.platform.isPackaged ? path.dirname(entryPath) : path.dirname(path.dirname(entryPath));
    const configDirEnv = {
      [ENV_OPENCODE_CONFIG_DIR]: this.options.configDir ?? (this.options.platform.isPackaged ? path.join(this.resolveResourcesPath(), "agent-profiles", "v2", "config") : path.resolve(cwd, "..", "..", "config", "opencode-v2"))
    };
    let knowledgeDir;
    let contractsDir;
    let bundledPluginsDir2;
    if (this.options.platform.isPackaged) {
      const configDir = this.options.configDir ?? path.join(this.resolveResourcesPath(), "agent-profiles", "v2", "config");
      if (!this.options.configDir) {
        this.logService.warn(
          "[gateway-manager] options.configDir not provided in packaged mode — HILO_KNOWLEDGE_DIR falling back to <resources> path; benchmark knowledge_read events will not match agent Read calls. Caller should pass the post-sync configDir."
        );
      }
      knowledgeDir = resolveKnowledgeDirFromConfigDir(configDir);
      contractsDir = resolveContractsDirFromConfigDir(configDir);
      bundledPluginsDir2 = path.join(this.resolveResourcesPath(), "bundled-plugins");
    } else {
      const repoRoot = path.resolve(cwd, "..", "..");
      const devSourceConfigDir = path.join(repoRoot, ".opencode-v2");
      knowledgeDir = resolveKnowledgeDirFromConfigDir(devSourceConfigDir);
      contractsDir = resolveContractsDirFromConfigDir(devSourceConfigDir);
      bundledPluginsDir2 = path.join(repoRoot, "app", "desktop", "resources", "bundled-plugins");
    }
    const agentProfile = this.options.agentProfile;
    if (agentProfile?.knowledgeDir) knowledgeDir = agentProfile.knowledgeDir;
    if (agentProfile?.contractsDir) contractsDir = agentProfile.contractsDir;
    const stagingMarkerPath = resolveContractsStagingMarkerPath(getAgentStagingDir());
    const gatewayRole = workspaceDir ? "workspace" : "app-level";
    if (process.platform === "win32") {
      if (hasNonAscii(process.execPath)) {
        this.logService.info(
          `[gateway-manager] Unicode execPath detected; compatibility path is enabled: "${process.execPath}"`
        );
      }
      if (hasNonAscii(cwd)) {
        this.logService.info(
          `[gateway-manager] Unicode cwd detected; compatibility path is enabled: "${cwd}"`
        );
      }
    }
    this._nonce = crypto.randomUUID();
    const spawnEnv = {
      ...filterInheritedGatewayEnv(process.env),
      ...filterRuntimeEnv(this.options.runtimeEnv),
      ...filterGatewayExtraEnv(this.options.extraEnv),
      PORT: String(this._port),
      NODE_ENV: process.env.NODE_ENV || "production",
      ELECTRON_RUN_AS_NODE: "1",
      [GATEWAY_AUTH_BOOTSTRAP_ENV]: this.options.getAuthSnapshot ? "1" : void 0,
      GATEWAY_NONCE: this._nonce,
      OUTPUT_DIR: outputDir,
      [HILO_SKILL_SUBMISSION_STAGING_DIR_ENV]: skillSubmissionStagingDir(
        this.options.platform.tempPath
      ),
      [ENV_LOG_DIR]: logDir,
      ...configDirEnv,
      ...this.options.region ? { HILO_RELEASE_REGION: this.options.region } : {},
      ...this.options.channel ? { HILO_RELEASE_CHANNEL: this.options.channel } : {},
      ...this.options.userLang ? { HILO_USER_LANG: this.options.userLang } : {},
      // Initial lane value for `LaneService` boot. Caller (desktop main /
      // headless boot) is responsible for channel gating before reaching
      // here — staging/prod should pass `undefined` (or never construct
      // the option). Runtime changes go through POST /api/lane/config.
      ...this.options.lane ? { LANE: this.options.lane } : {},
      ...this.options.region && this.options.channel ? {
        CLOUD_GATEWAY_BASE_URL: getCloudGatewayUrl(this.options.region, this.options.channel)
      } : {},
      ...this.options.appApiBaseUrl ? { HILO_APP_API_BASE_URL: this.options.appApiBaseUrl } : {},
      ...this.options.updateBaseUrl ? { HILO_UPDATE_BASE_URL: this.options.updateBaseUrl } : {},
      ...this.options.hotUpdateBaseUrl ? { HILO_HOT_UPDATE_BASE_URL: this.options.hotUpdateBaseUrl } : {},
      ...this.options.trackServerUrl ? { HILO_TRACK_SERVER_URL: this.options.trackServerUrl } : {},
      ...this.options.rumSite ? { HILO_RUM_SITE: this.options.rumSite } : {},
      ...openCodeUrl ? { OPENCODE_URL: openCodeUrl } : {},
      ...openCodeCredentials ? {
        OPENCODE_SERVER_USERNAME: openCodeCredentials.username,
        OPENCODE_SERVER_PASSWORD: openCodeCredentials.password
      } : {},
      ...this.options.ffmpegPath ? { FFMPEG_PATH: resolveSpawnPath(this.options.ffmpegPath, this.logService) } : {},
      ...this.options.ffprobePath ? { FFPROBE_PATH: resolveSpawnPath(this.options.ffprobePath, this.logService) } : {},
      // Role identifier paired with WORKSPACE_DIR. Read by gateway/main.ts at
      // bootstrap to fast-fail when a workspace-role gateway is missing its
      // WORKSPACE_DIR (CLAUDE.md fast-fail rule -- silent fallback to outputDir
      // would write user files to the wrong location and be near-impossible to
      // diagnose). Both branches set the env explicitly so the gateway never
      // has to guess its role from the (absence of) WORKSPACE_DIR.
      //   - 'workspace': locked to one workspace via WORKSPACE_DIR
      //   - 'app-level': home gateway; baseDir is OUTPUT_DIR staging area
      // Dev mode (`pnpm dev:gateway`) doesn't go through spawn, so HILO_GATEWAY_ROLE
      // is undefined there and the bootstrap check skips -- intentional.
      HILO_GATEWAY_ROLE: gatewayRole,
      ...workspaceDir ? { WORKSPACE_DIR: workspaceDir } : {},
      // Opaque workspace claim for HTTP/MCP/WS identity fencing. The raw
      // workspace path remains process-local and never crosses a transport.
      ...this.workspaceBinding ? workspaceGatewayIdentityEnv(this.workspaceBinding) : this._workspaceClaim ? { [HILO_WORKSPACE_IDENTITY_ENV]: this._workspaceClaim } : {},
      // Forward custom data directory so gateway subprocesses resolve
      // Projects / output_files under the user-selected volume.
      // Runtimes always stay local (resolveRuntimesDir ignores HILO_DATA_DIR).
      ...process.env.HILO_DATA_DIR ? { HILO_DATA_DIR: process.env.HILO_DATA_DIR } : {},
      // Cross-process work admission limit, kept in step with the desktop's
      // live-runtime budget (desktop main sets this from the remote config).
      // Without the forward, raising the budget would leave gateway children
      // rejecting chat sends at the old, lower number.
      ...process.env.HILO_MAX_WORKING_PROJECTS?.trim() ? { HILO_MAX_WORKING_PROJECTS: process.env.HILO_MAX_WORKING_PROJECTS.trim() } : {},
      // Client version for cloud common params (`version_code`). Desktop main
      // sets HILO_APP_VERSION before spawn; explicit re-pin avoids silent
      // fallback to protocol default `0.1.0` when ambient env is incomplete
      // (e.g. emergency gateway respawn without full parent env).
      ...process.env.HILO_APP_VERSION?.trim() ? { HILO_APP_VERSION: process.env.HILO_APP_VERSION.trim() } : {},
      // Knowledge base directory for benchmark mode KnowledgeSnapshotter.
      // Always set so benchmark works in both dev and packaged without
      // gateway-side path guessing.
      HILO_KNOWLEDGE_DIR: knowledgeDir,
      // App-shipped plugin packages (read-only). Consumed by
      // @hilo/protocol/plugin-paths#bundledPluginsDir → allPluginsDirs()
      // in the gateway's PluginsService so bundled plugins are
      // discoverable without a market install. Desktop main computes the
      // path (packaged: <resources>/bundled-plugins; dev:
      // <repo>/app/desktop/resources/bundled-plugins) because only this
      // side knows the packaging context.
      HILO_BUNDLED_PLUGINS_DIR: bundledPluginsDir2,
      // Contracts dir + staging marker path for benchmark mode
      // ContractsSnapshotter. Same SSOT pattern as HILO_KNOWLEDGE_DIR —
      // desktop main is the only side with the real packaging context,
      // so it computes both paths and pins them via env. Marker file is
      // written by setupAgentStaging (config-loader.ts) at OpenCode boot;
      // ContractsSnapshotter reads it at benchmark finalize to record
      // BenchmarkContractsInjection.stagingMarker (review H1 defence —
      // distinguishes source ok vs splice actually succeeded).
      HILO_CONTRACTS_DIR: contractsDir,
      HILO_CONTRACTS_STAGING_MARKER: stagingMarkerPath,
      // Workflows dir for benchmark mode WorkflowsSnapshotter.
      ...this.options.agentProfile?.workflowsDir ? { HILO_WORKFLOWS_DIR: this.options.agentProfile.workflowsDir } : {},
      // OpenCode SQLite path for benchmark mode opencode-db-reader.
      // Threaded from desktop main (which spawns OpenCode with the
      // XDG_DATA_HOME override and so owns the truth). Without this
      // the gateway subprocess (especially in dev where it doesn't
      // inherit OpenCode's spawn env) falls back to the legacy
      // ~/.local/share/opencode/opencode.db which since commit 7a69f0a2
      // is no longer written. Result: parts/sessions/messages dump are
      // empty → run.json knowledgeReads / skillInvocations all 0,
      // reflection finalize aggregate silently broken.
      // Also consumed by ToolHistoryRepairService to patch orphaned
      // tool_use blocks after OpenCode restart (e.g. skill install
      // mid-conversation). HILO_BENCHMARK_OPENCODE_DB kept as alias.
      ...this.options.opencodeDbPath ? {
        HILO_OPENCODE_DB: this.options.opencodeDbPath,
        HILO_BENCHMARK_OPENCODE_DB: this.options.opencodeDbPath
      } : {},
      // (schemaVersion 11 — plan benchmark-reflection-decontamination-20260518)
      // BenchmarkReflector tunables. Phase 8 deleted HILO_REFLECTION_MODE
      // (mode selector) — reflector always runs when benchmark mode is on.
      // R1 M4 deleted the in-process daily budget tracker, so only the
      // model + timeout knobs need forwarding. (R37 LOW-A) Reflector runs
      // gateway-only — MCP child / config-loader never read these envs,
      // so desktop main no longer forwards them to mcpEnvOverrides; this
      // gateway-side forward is the single live path.
      ...process.env.HILO_REFLECTION_MODEL ? { HILO_REFLECTION_MODEL: process.env.HILO_REFLECTION_MODEL } : {},
      ...process.env.HILO_REFLECTION_TIMEOUT_MS ? { HILO_REFLECTION_TIMEOUT_MS: process.env.HILO_REFLECTION_TIMEOUT_MS } : {}
    };
    if (!spawnEnv.NODE_OPTIONS?.includes("--max-old-space-size")) {
      const systemTotalMB = Math.round(os$1.totalmem() / 1024 / 1024);
      const { heapLimitMB, source } = resolveGatewayHeapLimitMB(
        gatewayRole,
        systemTotalMB,
        process.env,
        this.logService
      );
      const existing = spawnEnv.NODE_OPTIONS ?? "";
      spawnEnv.NODE_OPTIONS = `${existing} --max-old-space-size=${heapLimitMB}`.trim();
      this.logService.info(
        `[gateway] V8 heap limit: ${heapLimitMB}MB (system: ${systemTotalMB}MB, role: ${gatewayRole}, source: ${source})`
      );
    }
    spawnEnv.NODE_OPTIONS = withNodeSystemCa(spawnEnv.NODE_OPTIONS);
    const systemCaCertsPath = await ensureSystemCaCerts(this.options.platform.userDataPath, {
      log: this.logService
    });
    applyNodeExtraCaCerts(spawnEnv, systemCaCertsPath);
    if (systemCaCertsPath) {
      spawnEnv.HILO_SYSTEM_CA_CERTS = systemCaCertsPath;
    }
    applyChildProcessProxyMode(
      spawnEnv,
      this.options.getNetworkProxyMode?.() ?? this.options.networkProxyMode ?? "auto"
    );
    if (process.platform === "win32") {
      trimWindowsEnvBlock(spawnEnv, this.logService);
    }
    const spawnExecPath = resolveSpawnPath(process.execPath, this.logService);
    const spawnEntryPath = resolveSpawnPath(entryPath, this.logService);
    const spawnCwd = resolveSpawnPath(cwd, this.logService);
    this.validateSpawnPaths(spawnExecPath, spawnEntryPath, spawnCwd);
    let portRetries = 0;
    let timeoutRetried = false;
    const maxTotalAttempts = 1 + 1 + MAX_PORT_RETRIES;
    for (let attempt = 0; attempt < maxTotalAttempts; attempt++) {
      if (signal?.aborted) {
        this.releasePortReservation();
        throw new Error("[gateway-manager] start() aborted before spawn");
      }
      if (this.indexStopBlocksSpawn) await this.waitForIndexStopDecision(signal);
      if (admittedSpawnEpoch < this.lastStoppedSpawnEpoch) {
        throw new Error(`[${WORKSPACE_INDEX_SHUTDOWN_BLOCKED_CODE}] gateway-start-superseded`);
      }
      this.resetSpawnState();
      this.spawnAndAttach(spawnExecPath, spawnEntryPath, spawnEnv, spawnCwd);
      try {
        await this.waitForHealthy();
        this.logService.info(`[gateway-manager] Gateway is healthy at ${this._url}`);
        this.emitRuntimeEvent({
          component: "gateway",
          event: "health_ready",
          severity: "info",
          phase: "gateway_start",
          port: this._port
        });
        this.startLivenessMonitor();
        return this._url;
      } catch (err) {
        if (!timeoutRetried && this.isHealthTimeoutError(err)) {
          timeoutRetried = true;
          this.logService.warn("[gateway-manager] Health-check timed out — retrying on same port");
          this.emitRuntimeEvent({
            component: "gateway",
            event: "health_retry",
            severity: "warn",
            phase: "gateway_start",
            port: this._port,
            errorKind: "health_timeout",
            remediationAction: "retry_same_port"
          });
          await this.forceKillProcessTree(this.process, "health-timeout-retry");
          continue;
        }
        if (this.options.allowPortDrift !== false && portRetries < MAX_PORT_RETRIES && this.isPortConflictError()) {
          portRetries++;
          this.logService.warn(
            `[gateway-manager] Port ${this._port} EADDRINUSE — re-allocating (attempt ${portRetries}/${MAX_PORT_RETRIES})`
          );
          this.emitRuntimeEvent({
            component: "gateway",
            event: "port_conflict_retry",
            severity: "warn",
            phase: "gateway_start",
            port: this._port,
            errorKind: "port_conflict",
            retryCount: portRetries,
            remediationAction: "reallocate_port"
          });
          await this.forceKillProcessTree(this.process, "port-conflict-retry");
          releaseReservedGatewayPort(this._port);
          this._port = await pickPort(this._port + 1, void 0, this._ownerKey);
          this._url = gatewayUrlForPort(this._port);
          spawnEnv.PORT = String(this._port);
          continue;
        }
        this.releasePortReservation();
        throw err;
      }
    }
    this.releasePortReservation();
    throw new Error("[gateway-manager] Exhausted all startup retry attempts");
  }
  async ensureRunning(openCodeUrl, openCodeCredentials, workspaceDir, signal) {
    if (this._pendingEnsure) return this._pendingEnsure;
    const task = this._doEnsureRunning(openCodeUrl, openCodeCredentials, workspaceDir, signal);
    this._pendingEnsure = task;
    try {
      return await task;
    } finally {
      this._pendingEnsure = null;
    }
  }
  async _doEnsureRunning(openCodeUrl, openCodeCredentials, workspaceDir, signal) {
    if (this.process) {
      const result = await this.probeExistingGatewayForEnsure(signal);
      if (result === true) {
        this.logService.info("[gateway-manager] ensureRunning: gateway already healthy");
        if (!this._stopping && (this._livenessFailed || !this._livenessInterval)) {
          this.logService.info(
            "[gateway-manager] ensureRunning: re-arming liveness monitor after owner recovery"
          );
          this.startLivenessMonitor();
        }
        return this._url;
      }
      if (!this.process) {
        this.logService.warn(
          `[gateway-manager] ensureRunning: gateway process disappeared during health probes (${result}), restarting`
        );
      } else {
        this.logService.warn(
          `[gateway-manager] ensureRunning: gateway unhealthy after ${ENSURE_RUNNING_HEALTH_ATTEMPTS} probes (${result}), restarting`
        );
        this._stopping = true;
        this.stopLivenessMonitor();
        try {
          await this.forceKillProcessTree(this.process, "ensure-running-restart");
        } finally {
          this._stopping = false;
        }
      }
    }
    if (signal?.aborted) {
      throw new Error("[gateway-manager] ensureRunning aborted before restart");
    }
    return this.start(openCodeUrl, openCodeCredentials, workspaceDir, signal);
  }
  async probeExistingGatewayForEnsure(signal) {
    let lastResult = "not checked";
    for (let attempt = 1; attempt <= ENSURE_RUNNING_HEALTH_ATTEMPTS; attempt++) {
      throwIfAborted(signal, "during health probe");
      if (!this.process) return "process_gone";
      const now = Date.now();
      const elapsed = this._lastLivenessCheckMs > 0 ? now - this._lastLivenessCheckMs : 0;
      if (elapsed > LIVENESS_SUSPEND_GAP_MS) {
        this.logService.info(
          `[gateway-manager] ensureRunning: elapsed ${Math.round(elapsed / 1e3)}s since last liveness check (likely suspend/resume); resetting failure counter before destructive recovery`
        );
        this._lastLivenessCheckMs = now;
        this._livenessFailCount = 0;
        await delay$1(this.options.healthCheckInterval, signal);
      }
      const result = await this.healthCheck();
      if (result === true) {
        if (attempt > 1) {
          this.logService.info(
            `[gateway-manager] ensureRunning: gateway recovered after ${attempt - 1} failed probe(s)`
          );
        }
        return true;
      }
      lastResult = result;
      this.logService.warn(
        `[gateway-manager] ensureRunning: health probe ${attempt}/${ENSURE_RUNNING_HEALTH_ATTEMPTS} failed: ${result}`
      );
      if (attempt < ENSURE_RUNNING_HEALTH_ATTEMPTS) {
        await delay$1(this.options.healthCheckInterval, signal);
      }
    }
    return lastResult;
  }
  updateWorkspaceRuntimeBudget(value) {
    const maxOpenWorkspaces = normalizeMaxOpenWorkspaces(value);
    const child = this.process;
    if (maxOpenWorkspaces === void 0 || !child?.connected || child.exitCode !== null || child.signalCode !== null)
      return;
    const message = {
      type: GATEWAY_WORKSPACE_RUNTIME_BUDGET,
      nonce: this._nonce,
      maxOpenWorkspaces
    };
    const reportError = (error) => {
      if (error)
        this.logService.warn(`[gateway-manager] Runtime budget sync failed: ${error.message}`);
    };
    try {
      child.send(message, reportError);
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)));
    }
  }
  finalizeExitedRuntime(expectedPid) {
    if (!Number.isSafeInteger(expectedPid) || expectedPid <= 0) return false;
    if (this.process && this.process.pid !== expectedPid) return false;
    if (!isRuntimePidAbsent(expectedPid)) return false;
    this.stopLivenessMonitor();
    this.process = null;
    this.indexStopPreparation = void 0;
    this.releaseIndexSpawnFence(false);
    this.emptyStopPreparations = 0;
    this.releasePortReservation();
    return true;
  }
  // Only native quit confirmation can grant this process-specific discard lease.
  missingFolderDiscard;
  async prepareForStop(options) {
    const proc = this.process;
    if (proc && proc.exitCode === null && proc.signalCode === null) {
      if (this.missingFolderDiscard?.process === proc) {
        this.missingFolderDiscard.references += 1;
        return;
      }
      if (this._ownerKey) {
        let missing = false;
        try {
          fs$1.statSync(this._ownerKey);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          missing = true;
        }
        if (missing) {
          if (!hasWorkspaceShutdownConsent(options, this._ownerKey)) {
            throw new WorkspaceShutdownFoldersMissingError([this._ownerKey]);
          }
          this.missingFolderDiscard = { process: proc, references: 1 };
          this.indexStopBlocksSpawn = true;
          this.spawnEpoch += 1;
          this.stopLivenessMonitor();
          return;
        }
      }
    }
    this.stopLivenessMonitor();
    return this.prepareIndexProtection(true);
  }
  waitForIndexStopDecision(signal) {
    return new Promise((resolve2, reject) => {
      const decide = (resume) => {
        this.indexStopWaiters.delete(decide);
        signal?.removeEventListener("abort", abort);
        if (resume) resolve2();
        else
          reject(new Error(`[${WORKSPACE_INDEX_SHUTDOWN_BLOCKED_CODE}] gateway-start-superseded`));
      };
      const abort = () => decide(false);
      this.indexStopWaiters.add(decide);
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) abort();
    });
  }
  releaseIndexSpawnFence(resume) {
    if (!resume) this.lastStoppedSpawnEpoch = this.spawnEpoch;
    this.indexStopBlocksSpawn = false;
    for (const decide of [...this.indexStopWaiters]) decide(resume);
  }
  async prepareIndexProtection(blockSpawn) {
    const fenceSpawn = () => {
      if (blockSpawn && !this.indexStopBlocksSpawn) {
        this.indexStopBlocksSpawn = true;
        this.spawnEpoch += 1;
      }
    };
    fenceSpawn();
    const proc = this.process;
    if (!proc || proc.exitCode !== null || proc.signalCode !== null) {
      if (blockSpawn) this.emptyStopPreparations += 1;
      return;
    }
    const existing = this.indexStopPreparation;
    if (existing?.process === proc) {
      if (existing.phase !== "failed") {
        existing.references += 1;
        return existing.promise;
      }
      await this.cancelStopPreparation();
    }
    fenceSpawn();
    const nonce = this._nonce;
    const token = crypto.randomUUID();
    const request2 = requestGatewayIndexShutdown(proc, nonce, "prepare", token);
    const entry = {
      process: proc,
      nonce,
      token,
      phase: "pending",
      references: 1,
      promise: Promise.resolve()
    };
    const hasExited = () => proc.exitCode !== null || proc.signalCode !== null;
    entry.promise = request2.then(() => {
      if (hasExited()) return;
      if (this.process !== proc || entry.phase === "failed") {
        throw new Error(
          `[${WORKSPACE_INDEX_SHUTDOWN_BLOCKED_CODE}] gateway-changed-during-preparation`
        );
      }
      entry.phase = "prepared";
      this.stopLivenessMonitor();
    }).catch((error) => {
      entry.phase = "failed";
      entry.references = 0;
      if (hasExited()) return;
      void this.cancelStopPreparation().catch((cancelError) => {
        this.logService.warn(
          `[gateway-manager] Index shutdown cancellation failed: ${String(cancelError)}`
        );
      });
      throw error;
    });
    this.indexStopPreparation = entry;
    return entry.promise;
  }
  async cancelStopPreparation() {
    if (this.missingFolderDiscard) {
      if (--this.missingFolderDiscard.references > 0) return;
      this.missingFolderDiscard = void 0;
      this.releaseIndexSpawnFence(true);
      if (this.process && !this._stopping) this.startLivenessMonitor();
      return;
    }
    const entry = this.indexStopPreparation;
    if (!entry) {
      this.emptyStopPreparations = Math.max(0, this.emptyStopPreparations - 1);
      if (this.emptyStopPreparations === 0) this.releaseIndexSpawnFence(true);
      return;
    }
    if (entry.process.exitCode !== null || entry.process.signalCode !== null) {
      this.indexStopPreparation = void 0;
      this.releaseIndexSpawnFence(true);
      this.emptyStopPreparations = 0;
      return;
    }
    if (entry.phase !== "failed" && --entry.references > 0) return;
    entry.references = 0;
    entry.phase = "failed";
    entry.cancellation ??= (async () => {
      if (entry.process.exitCode === null && entry.process.signalCode === null) {
        await requestGatewayIndexShutdown(entry.process, entry.nonce, "cancel", entry.token);
      }
    })();
    try {
      await entry.cancellation;
    } catch (error) {
      entry.cancellation = void 0;
      throw error;
    }
    if (this.indexStopPreparation === entry) this.indexStopPreparation = void 0;
    if (this.emptyStopPreparations === 0) this.releaseIndexSpawnFence(true);
    if (this.process === entry.process && !this._stopping) this.startLivenessMonitor();
  }
  async stop() {
    await this.prepareForStop();
    this.stopLivenessMonitor();
    if (!this.process || this.process.exitCode !== null || this.process.signalCode !== null) {
      this.process = null;
      this.indexStopPreparation = void 0;
      this.missingFolderDiscard = void 0;
      this.releaseIndexSpawnFence(false);
      this.emptyStopPreparations = 0;
      this.releasePortReservation();
      return;
    }
    const proc = this.process;
    this._stopping = true;
    this.logService.info("[gateway-manager] Stopping gateway...");
    try {
      if (this.missingFolderDiscard?.process === proc) {
        await this.forceKillProcessTree(proc, "user-confirmed-missing-workspace-quit");
        return;
      }
      const prepared = this.indexStopPreparation;
      if (prepared?.process === proc && prepared.phase === "prepared") {
        try {
          await requestGatewayIndexShutdown(
            proc,
            prepared.nonce,
            "commit",
            prepared.token,
            GATEWAY_STOP_GRACE_MS
          );
        } catch (error) {
          this.logService.warn(
            `[gateway-manager] Prepared gateway close did not acknowledge: ${String(error)}`
          );
          await this.forceKillProcessTree(proc, "prepared-index-close-fallback");
          return;
        }
      }
      await this.terminateProcessTree(proc, GATEWAY_STOP_GRACE_MS);
    } finally {
      if (this.process === proc) {
        this.process = null;
      }
      this.indexStopPreparation = void 0;
      this.missingFolderDiscard = void 0;
      this.releaseIndexSpawnFence(false);
      this.emptyStopPreparations = 0;
      this._stopping = false;
      this.releasePortReservation();
    }
  }
  /**
   * No-op kill path by design.
   *
   * Why: when this manager lives in a per-workspace child DI container
   * alongside BundleHandle, `InstantiationService.dispose()` walks services in
   * insertion order — GatewayManager is constructed BEFORE BundleHandle, so a
   * naive SIGTERM here would race the BundleHandle.dispose() chain that
   * carefully stops OpenCode first, then this gateway. Routing all kill paths
   * through BundleHandle.dispose() -> this.stop() ensures the correct order.
   *
   * If you find this manager's process still running after dispose, the bug is
   * upstream — a caller bypassed BundleHandle and instantiated GatewayManager
   * directly. Fix the caller, not this method.
   */
  dispose() {
    if (!this.process) {
      this.releasePortReservation();
    }
    super.dispose();
  }
  releasePortReservation() {
    releaseReservedGatewayPort(this._port, this._ownerKey);
    this._port = 0;
    this._url = "";
  }
  resolveEntryPath() {
    if (this.options.entryPath) return this.options.entryPath;
    return path.join(this.resolveResourcesPath(), "gateway", "dist", "main.js");
  }
  resolveResourcesPath() {
    return process.resourcesPath ?? path.join(this.options.platform.appPath, "..");
  }
  /**
   * Validate that the executable, entry script, and working directory all
   * exist before calling spawn().  Throws with a human-readable message
   * instead of letting Node surface a raw ENOENT / UNKNOWN.
   */
  validateSpawnPaths(execPath, entryPath, cwd) {
    if (!fs$1.existsSync(execPath)) {
      this.logService.error(
        `[gateway-manager] Electron binary not found at "${execPath}" (original: "${process.execPath}")`
      );
      throw new Error(
        `Electron binary not found: ${execPath}

The application may have been moved, deleted, or corrupted during an update.
Please close and reopen MiniMax Hub, or reinstall the application.`
      );
    }
    if (!fs$1.existsSync(entryPath)) {
      this.logService.error(`[gateway-manager] Gateway entry point not found at "${entryPath}"`);
      throw new Error(
        `Gateway entry point not found: ${entryPath}

The application resources may be corrupted.
Please reinstall MiniMax Hub.`
      );
    }
    if (!fs$1.existsSync(cwd)) {
      this.logService.error(`[gateway-manager] Working directory not found at "${cwd}"`);
      throw new Error(
        `Gateway working directory not found: ${cwd}

The application resources may be corrupted.
Please reinstall MiniMax Hub.`
      );
    }
  }
  buildStderrSnippet() {
    if (!this._recentStderr.length) return "";
    return `
Stderr:
${this._recentStderr.join("\n")}`;
  }
  buildEarlyExitBeforeHealthyMessage(exit) {
    return `Gateway process exited with code ${exit.code} (signal: ${exit.signal}) before becoming healthy${this.buildStderrSnippet()}`;
  }
  /**
   * A clean `code 0 / signal null` exit before health usually means the process
   * was terminated by app startup/retry/update cleanup rather than crashing;
   * anything else is treated as a crash.
   */
  earlyExitKind(exit) {
    return exit.code === 0 && exit.signal === null ? "terminated_before_healthy" : "crashed";
  }
  // ── Spawn helpers ────────────────────────────────────────────────────────
  resetSpawnState() {
    this._earlyExit = null;
    this._spawnError = null;
    this._recentStderr = [];
    this._becameHealthy = false;
  }
  /**
   * Spawn gateway subprocess and attach stdout/stderr/exit/error handlers.
   * Separated from start() so the retry loop stays concise.
   */
  spawnAndAttach(execPath, entryPath, env, cwd) {
    this.emitRuntimeEvent({
      component: "gateway",
      event: "spawn_start",
      severity: "info",
      phase: "gateway_start",
      port: this._port
    });
    this._distBaselineMtimeMs = this.readDistMtimeMsSync(entryPath);
    this._distStaleEmitted = false;
    const spawnContext = {
      execPath,
      entryPath,
      cwd,
      platform: process.platform
    };
    try {
      this.process = spawn(execPath, [entryPath], {
        env,
        // Auth handoff and index-safe shutdown share the owned parent channel.
        stdio: ["ignore", "pipe", "pipe", "ipc"],
        cwd,
        detached: process.platform !== "win32",
        windowsHide: true
      });
    } catch (err) {
      const error = enrichGatewaySpawnError(err, spawnContext);
      this._spawnError = error;
      this.emitRuntimeEvent({
        component: "gateway",
        event: "spawn_error",
        severity: "error",
        phase: "gateway_start",
        port: this._port,
        errorKind: classifyGatewayErrorKind(error.message)
      });
      throw error;
    }
    const child = this.process;
    this._isAuthBootstrapped = () => !this.options.getAuthSnapshot;
    if (this.options.getAuthSnapshot) {
      this._isAuthBootstrapped = bindGatewayAuthBootstrap(child, {
        getSnapshot: this.options.getAuthSnapshot,
        isCurrent: () => this.process === child && !this._stopping,
        region: this.options.region,
        warn: (message) => this.logService.warn(message)
      });
    }
    if (this.process.pid) {
      this.emitRuntimeEvent({
        component: "gateway",
        event: "spawned",
        severity: "info",
        phase: "gateway_start",
        port: this._port,
        pid: this.process.pid
      });
    }
    this.process.stdout?.on("data", (data) => {
      if (this.process !== child) return;
      this.routeChildOutput("stdout", data.toString());
    });
    this.process.stderr?.on("data", (data) => {
      if (this.process !== child) return;
      this.routeChildOutput("stderr", data.toString());
    });
    this.process.on("exit", (code, signal) => {
      if (this.process !== child) {
        this.logService.debug(
          `[gateway-manager] Ignoring stale gateway exit: pid=${child.pid ?? "unknown"}, code=${code}, signal=${signal}`
        );
        return;
      }
      this.logService.info(
        `[gateway-manager] Gateway exited: pid=${child.pid ?? "unknown"}, code=${code}, signal=${signal}`
      );
      this._earlyExit = { code, signal };
      const exitedBeforeHealthy = !this._stopping && !this._becameHealthy;
      const isExpected = this._stopping || code === 0 && !exitedBeforeHealthy;
      const stderrErrorKind = isExpected ? void 0 : classifyRecentGatewayStderr(this._recentStderr);
      const fallbackErrorKind = exitedBeforeHealthy && code === 0 && signal === null ? "terminated_before_healthy" : "unexpected_exit";
      if (!isExpected && child.pid && killProcessGroup(child.pid, "SIGKILL")) {
        this.logService.warn(
          "[gateway-manager] Cleaned up gateway process group after unexpected exit"
        );
        void waitForProcessGroupExit(child.pid, GATEWAY_FORCE_EXIT_WAIT_MS);
      }
      this.emitRuntimeEvent({
        component: "gateway",
        event: "process_exit",
        severity: isExpected ? "info" : "error",
        phase: "gateway_start",
        port: this._port,
        exitCode: code,
        signal,
        errorKind: isExpected ? void 0 : stderrErrorKind ?? fallbackErrorKind
      });
      this.process = null;
    });
    this.process.on("error", (err) => {
      if (this.process !== child) {
        this.logService.debug(
          `[gateway-manager] Ignoring stale gateway error: pid=${child.pid ?? "unknown"}, error=${err.message}`
        );
        return;
      }
      const error = enrichGatewaySpawnError(err, spawnContext);
      this.logService.error("[gateway-manager] Failed to start gateway:", error);
      this._spawnError = error;
      this.emitRuntimeEvent({
        component: "gateway",
        event: "spawn_error",
        severity: "error",
        phase: "gateway_start",
        port: this._port,
        errorKind: classifyGatewayErrorKind(error.message)
      });
      this.process = null;
    });
  }
  routeChildOutput(stream, text) {
    const trimmedText = text.trim();
    if (!trimmedText) return;
    for (const line of trimmedText.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const telemetry = parseTelemetryLine(trimmed);
      if (telemetry) {
        this.emitRuntimeEvent({
          ...telemetry,
          component: "gateway",
          port: this._port
        });
        continue;
      }
      if (stream === "stderr") {
        this.logService.error(`[gateway] ${trimmed}`);
        this._recentStderr.push(trimmed);
        if (this._recentStderr.length > MAX_STDERR_DIAGNOSTIC_LINES) this._recentStderr.shift();
      } else {
        this.logService.info(`[gateway] ${trimmed}`);
      }
    }
  }
  emitRuntimeEvent(event) {
    const runtimeEvent = {
      ...event,
      component: "gateway",
      timestamp: event.timestamp ?? (/* @__PURE__ */ new Date()).toISOString()
    };
    try {
      this._onRuntimeEvent.fire(runtimeEvent);
      this.options.onRuntimeEvent?.(runtimeEvent);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logService.warn(`[gateway-manager] onRuntimeEvent failed: ${message}`);
    }
  }
  async forceKillProcessTree(proc, reason) {
    if (!proc) return;
    const confirmedMissingFolderQuit = this._stopping && reason === "user-confirmed-missing-workspace-quit" && this.missingFolderDiscard?.process === proc;
    if (proc === this.process && !confirmedMissingFolderQuit)
      await this.prepareIndexProtection(false);
    this.logService.warn(`[gateway-manager] Force-killing gateway process tree (${reason})`);
    const pid = proc.pid;
    const childExit = createChildProcessExitWait(proc, GATEWAY_FORCE_EXIT_WAIT_MS);
    if (pid && killProcessGroup(pid, "SIGKILL")) {
      await waitForProcessGroupExit(pid, GATEWAY_FORCE_EXIT_WAIT_MS);
      await childExit.promise;
      if (this.process === proc) {
        this.process = null;
      }
      return;
    }
    childExit.cancel();
    await killAndWaitForExit(proc);
    if (this.process === proc) {
      this.process = null;
    }
  }
  async terminateProcessTree(proc, graceMs) {
    const pid = proc.pid;
    const childExit = createChildProcessExitWait(proc, graceMs);
    if (pid && killProcessGroup(pid, "SIGTERM")) {
      const exited = await waitForProcessGroupExit(pid, graceMs);
      if (!exited) {
        this.logService.warn(
          "[gateway-manager] Gateway process tree did not exit in time, force-killing..."
        );
        const forceChildExit = createChildProcessExitWait(proc, GATEWAY_FORCE_EXIT_WAIT_MS);
        if (!killProcessGroup(pid, "SIGKILL")) {
          platformKill(proc, "SIGKILL");
        }
        const forceExited = await waitForProcessGroupExit(pid, GATEWAY_FORCE_EXIT_WAIT_MS);
        if (!forceExited && process.env.HILO_HEADLESS === "1") {
          childExit.cancel();
          forceChildExit.cancel();
          throw new Error("[gateway-manager] Gateway process tree still alive after SIGKILL");
        }
        childExit.cancel();
        await forceChildExit.promise;
        return;
      }
      await childExit.promise;
      return;
    }
    platformKill(proc, "SIGTERM");
    if (!await childExit.promise) {
      this.logService.warn(
        `[gateway-manager] Gateway exit event timeout; force-killing: pid=${proc.pid ?? "unknown"}, timeoutMs=${graceMs}`
      );
      const forceChildExit = createChildProcessExitWait(proc, GATEWAY_FORCE_EXIT_WAIT_MS);
      platformKill(proc, "SIGKILL");
      await forceChildExit.promise;
    }
  }
  /**
   * Check if the most recent failure was a port conflict (EADDRINUSE).
   *
   * Fragile: relies on NestJS printing "EADDRINUSE" to stderr. If the
   * framework changes its error format this detection will silently stop
   * working and fall through to a non-retryable error — safe but suboptimal.
   */
  isPortConflictError() {
    return this._recentStderr.some((line) => line.includes("EADDRINUSE"));
  }
  /**
   * Check if an error from waitForHealthy is a pure timeout (deadline
   * exceeded without the process crashing or the port being stolen).
   * On Windows, Defender scanning the ~10MB JS bundle can cause this on
   * first boot; retrying on the same port succeeds once the scan is done.
   *
   * Excludes HTTP application errors (4xx/5xx) — those indicate the server
   * is running but unhealthy, and retrying won't change the outcome.
   */
  isHealthTimeoutError(err) {
    if (!(err instanceof Error)) return false;
    const msg = err.message;
    return msg.includes("failed to become healthy") && !this._earlyExit && !this._spawnError && !msg.includes("HTTP ");
  }
  async waitForHealthy() {
    const { healthCheckTimeout, healthCheckInterval } = this.options;
    const timeout = effectiveHealthTimeout(healthCheckTimeout);
    const deadline = Date.now() + timeout;
    let lastHealthError = null;
    this.logService.info(
      `[gateway-manager] Waiting for healthy (timeout=${timeout}ms, platform=${process.platform})`
    );
    while (Date.now() < deadline) {
      if (this._earlyExit) {
        throw new GatewayStartupError(
          this.buildEarlyExitBeforeHealthyMessage(this._earlyExit),
          this.earlyExitKind(this._earlyExit)
        );
      }
      if (this.process === null) {
        const reason = this._spawnError ? `: ${this._spawnError.message}` : "";
        throw new GatewayStartupError(
          `Gateway process failed to start${reason}${this.buildStderrSnippet()}`,
          "spawn_failed"
        );
      }
      const result = await this.healthCheck();
      if (result === true) {
        const earlyExitAfterHealth = this._earlyExit;
        if (earlyExitAfterHealth) {
          throw new GatewayStartupError(
            this.buildEarlyExitBeforeHealthyMessage(earlyExitAfterHealth),
            this.earlyExitKind(earlyExitAfterHealth)
          );
        }
        if (this.process === null) {
          const reason = this._spawnError ? `: ${this._spawnError.message}` : "";
          throw new GatewayStartupError(
            `Gateway process failed to start${reason}${this.buildStderrSnippet()}`,
            "spawn_failed"
          );
        }
        this._becameHealthy = true;
        return;
      }
      lastHealthError = result;
      await new Promise((r) => setTimeout(r, healthCheckInterval));
    }
    platformKill(this.process, "SIGTERM");
    const errorHint = lastHealthError ? `
Last health error: ${lastHealthError}` : "";
    throw new GatewayStartupError(
      `Gateway failed to become healthy within ${timeout}ms${errorHint}${this.buildStderrSnippet()}`,
      "health_timeout"
    );
  }
  /**
   * HTTP health check over TCP.
   * Returns `true` when healthy, or an error description string when not.
   *
   * When `_nonce` is set, the response must carry a matching
   * `X-Gateway-Nonce` header to prove it came from the subprocess we
   * spawned, not a stale gateway still bound to the same port.
   * If the header is absent (old stale gateway version) or different, keep
   * polling until our subprocess replies, exits, or the health timeout fires.
   */
  async healthCheck() {
    if (!this._isAuthBootstrapped()) return "Gateway auth bootstrap pending";
    const healthUrl = `${this._url}/api/health/live`;
    const binding = this.workspaceBinding;
    const headers = binding ? workspaceGatewayIdentityHeaders(binding) : this._workspaceClaim ? { [HILO_WORKSPACE_IDENTITY_HEADER]: this._workspaceClaim } : void 0;
    if (isLoopbackHttpUrl(healthUrl)) {
      try {
        const response = await requestLoopbackDirect(healthUrl, {
          headers,
          signal: AbortSignal.timeout(2e3)
        });
        return this.evaluateHealthResponse(
          response.status,
          response.statusText,
          readLoopbackResponseHeader(response.headers, "x-gateway-nonce")
        );
      } catch (error) {
        const detail = formatTransportError(error);
        if (/ECONNREFUSED/i.test(detail)) {
          return `ECONNREFUSED (gateway not yet listening; ${detail})`;
        }
        return detail;
      }
    }
    try {
      const response = await fetch(healthUrl, {
        headers,
        signal: AbortSignal.timeout(2e3)
      });
      return this.evaluateHealthResponse(
        response.status,
        response.statusText,
        response.status === 200 ? response.headers.get("x-gateway-nonce") ?? void 0 : void 0
      );
    } catch (error) {
      const detail = formatTransportError(error);
      if (/ECONNREFUSED/i.test(detail)) {
        return `ECONNREFUSED (gateway not yet listening; ${detail})`;
      }
      return detail;
    }
  }
  evaluateHealthResponse(status, statusText, responseNonce) {
    if (status !== 200) return `HTTP ${status} ${statusText}`.trim();
    if (this._nonce) {
      if (!responseNonce) return "nonce-missing";
      if (responseNonce !== this._nonce) return "nonce mismatch (stale gateway on port)";
    }
    return true;
  }
  // ── Post-startup liveness monitoring ──
  // Periodically pings the gateway subprocess after startup. Gateway restart is
  // intentionally NOT done here: BundleHandle owns workspace lifecycle state and
  // must decide how to surface/recover lost in-memory gateway state.
  /**
   * Start periodic liveness pings. Called after gateway becomes healthy.
   * If the gateway fails to respond to {@link LIVENESS_FAIL_THRESHOLD}
   * consecutive pings, emit a terminal runtime event and stop polling.
   */
  startLivenessMonitor() {
    this.stopLivenessMonitor();
    this._livenessFailCount = 0;
    this._livenessFailed = false;
    this._lastLivenessCheckMs = Date.now();
    this._livenessInterval = setInterval(() => {
      this.livenessCheck().catch((err) => {
        this.logService.error(`[gateway-liveness] Unexpected error: ${err}`);
      });
    }, LIVENESS_INTERVAL_MS);
  }
  stopLivenessMonitor() {
    if (this._livenessInterval) {
      clearInterval(this._livenessInterval);
      this._livenessInterval = null;
    }
  }
  async livenessCheck() {
    if (this._stopping || this._livenessFailed) return;
    const now = Date.now();
    const elapsed = now - this._lastLivenessCheckMs;
    this._lastLivenessCheckMs = now;
    if (elapsed > LIVENESS_SUSPEND_GAP_MS) {
      if (this._livenessFailCount > 0) {
        this.logService.info(
          `[gateway-liveness] Elapsed ${Math.round(elapsed / 1e3)}s since last check (likely suspend/resume) — resetting failure counter`
        );
      }
      this._livenessFailCount = 0;
      return;
    }
    if (!this.process) {
      this.markLivenessFailed(
        "process_gone",
        "Gateway process is gone; owner lifecycle must decide recovery"
      );
      return;
    }
    const result = await this.healthCheck();
    if (result === true) {
      if (this._livenessFailCount > 0) {
        this.logService.info(
          `[gateway-liveness] Recovered after ${this._livenessFailCount} failed pings`
        );
      }
      this._livenessFailCount = 0;
      void this.checkDistStaleness();
      return;
    }
    this._livenessFailCount++;
    this.logService.warn(
      `[gateway-liveness] Ping failed (${this._livenessFailCount}/${LIVENESS_FAIL_THRESHOLD}): ${result}`
    );
    if (this._livenessFailCount >= LIVENESS_FAIL_THRESHOLD) {
      this.markLivenessFailed(
        "unresponsive",
        `Gateway failed ${LIVENESS_FAIL_THRESHOLD} consecutive liveness pings: ${result}`
      );
    }
  }
  /**
   * Stat the gateway bundle entry and return its mtime in ms, or 0 if the
   * file is unreadable (transient I/O error, file vanished, etc.).
   * Sync for spawn-time capture; async wrapper used by liveness checks.
   */
  readDistMtimeMsSync(entryPath) {
    try {
      return fs$1.statSync(entryPath).mtimeMs;
    } catch {
      return 0;
    }
  }
  /**
   * Compare the current dist mtime against the baseline captured at spawn.
   * If the bundle on disk is newer, the running subprocess is serving
   * stale code — the developer almost certainly ran `pnpm -F @hilo/gateway
   * build` (or it ran via a watcher) but the desktop process did not
   * restart, so old bugs reappear or new endpoints return 404/500.
   * Emits a one-shot warning + telemetry event so the desktop can surface
   * a toast / restart prompt (consumer wiring is a follow-up).
   *
   * Same-mtime → silent (the steady state). Cannot read disk → silent
   * (don't spam logs on transient filesystem glitches).
   */
  async checkDistStaleness() {
    if (this._distStaleEmitted) return;
    if (this._distBaselineMtimeMs === 0) return;
    const entryPath = this.resolveEntryPath();
    let currentMtimeMs;
    try {
      const stat = await fs$1.promises.stat(entryPath);
      currentMtimeMs = stat.mtimeMs;
    } catch {
      return;
    }
    if (currentMtimeMs <= this._distBaselineMtimeMs + GatewayManager.DIST_STALE_GRACE_MS) {
      return;
    }
    this._distStaleEmitted = true;
    const baselineIso = new Date(this._distBaselineMtimeMs).toISOString();
    const currentIso = new Date(currentMtimeMs).toISOString();
    this.logService.warn(
      `[gateway-manager] dist staleness detected: running gateway was spawned with bundle mtime=${baselineIso}, but ${entryPath} was rebuilt at mtime=${currentIso}. Restart the desktop app (or call gateway.restart) to load the new bundle — otherwise endpoints added/fixed after the spawn won't take effect.`
    );
    this.emitRuntimeEvent({
      component: "gateway",
      event: "dist_stale",
      severity: "warn",
      port: this._port,
      remediationAction: "restart_gateway",
      attrs: {
        entryPath,
        spawnedMtimeMs: this._distBaselineMtimeMs,
        currentMtimeMs,
        ageMs: currentMtimeMs - this._distBaselineMtimeMs
      }
    });
  }
  markLivenessFailed(errorKind, message) {
    if (this._livenessFailed) return;
    this._livenessFailed = true;
    this.stopLivenessMonitor();
    this.logService.error(`[gateway-liveness] ${message}`);
    this.emitRuntimeEvent({
      component: "gateway",
      event: "liveness_failed",
      severity: "error",
      port: this._port,
      errorKind,
      errorMessage: message,
      remediationAction: "owner_lifecycle_required"
    });
  }
};
GatewayManager = __decorateClass$1([
  __decorateParam$1(1, ILogService)
], GatewayManager);
function parseTelemetryLine(line) {
  if (!line.startsWith(GATEWAY_TELEMETRY_PREFIX)) return null;
  const raw = line.slice(GATEWAY_TELEMETRY_PREFIX.length).trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const version = typeof parsed.v === "number" ? parsed.v : 0;
    if (version > 1) return null;
    if (!parsed.event || !parsed.severity) return null;
    const severity = String(parsed.severity);
    if (severity !== "info" && severity !== "warn" && severity !== "error") return null;
    return {
      component: "gateway",
      event: String(parsed.event),
      severity,
      timestamp: typeof parsed.timestamp === "string" ? parsed.timestamp : void 0,
      phase: typeof parsed.phase === "string" ? parsed.phase : void 0,
      errorKind: typeof parsed.errorKind === "string" ? parsed.errorKind : void 0,
      durationMs: typeof parsed.durationMs === "number" ? parsed.durationMs : void 0,
      pid: typeof parsed.pid === "number" ? parsed.pid : void 0,
      exitCode: typeof parsed.exitCode === "number" || parsed.exitCode === null ? parsed.exitCode : void 0,
      signal: typeof parsed.signal === "string" || parsed.signal === null ? parsed.signal : void 0,
      attrs: isRecord$1(parsed.attrs) ? parsed.attrs : void 0
    };
  } catch {
    return null;
  }
}
function isRecord$1(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function classifyGatewayErrorKind(message) {
  if (PATTERN_V8_HEAP_OOM.test(message)) return "v8_heap_oom";
  if (PATTERN_ARRAYBUFFER_ALLOCATION_FAILED.test(message)) {
    return "arraybuffer_allocation_failed";
  }
  if (PATTERN_RSS_OR_OS_OOM.test(message)) return "rss_or_os_oom_suspected";
  if (PATTERN_PERMISSION.test(message)) return "permission";
  if (PATTERN_BINARY_MISSING.test(message) || /not found/i.test(message)) return "binary_missing";
  if (PATTERN_PORT_CONFLICT.test(message)) return "port_conflict";
  if (PATTERN_TIMEOUT.test(message)) return "health_timeout";
  return "unknown";
}
function classifyRecentGatewayStderr(lines) {
  const kind = classifyGatewayErrorKind(lines.join("\n"));
  return kind === "unknown" ? void 0 : kind;
}
function enrichGatewaySpawnError(err, context) {
  const message = buildGatewaySpawnFailureMessage(err, context);
  const error = err instanceof Error ? new Error(message, { cause: err }) : new Error(message);
  error.name = err instanceof Error ? err.name : "GatewaySpawnError";
  return error;
}
function buildGatewaySpawnFailureMessage(err, context) {
  const rawMessage = err instanceof Error ? err.message : String(err);
  if (classifyGatewayErrorKind(rawMessage) !== "permission" || context.platform !== "win32") {
    return `Gateway process failed to start: ${rawMessage}`;
  }
  return [
    "Windows blocked launching the local Gateway process.",
    `Original error: ${rawMessage}`,
    `Executable: ${context.execPath}`,
    `Gateway entry: ${context.entryPath}`,
    `Working directory: ${context.cwd}`,
    "",
    "This is usually caused by Windows Security/Defender, enterprise antivirus, or a restricted custom install directory.",
    "Open Windows Security > Virus & threat protection > Protection history, restore any quarantined MiniMax Hub files, then add the MiniMax Hub install directory to exclusions.",
    "If it still fails, reinstall MiniMax Hub to the standard per-user install path and move generated assets via the data-directory setting instead of moving the app itself."
  ].join("\n");
}
const GATEWAY_OWNED_KEYS = /* @__PURE__ */ new Set([
  "PORT",
  "NODE_ENV",
  "ELECTRON_RUN_AS_NODE",
  "GATEWAY_NONCE",
  "OUTPUT_DIR",
  "LOG_DIR",
  HILO_SKILL_SUBMISSION_STAGING_DIR_ENV,
  "WORKSPACE_DIR",
  "HILO_GATEWAY_ROLE",
  GATEWAY_AUTH_BOOTSTRAP_ENV,
  HILO_WORKSPACE_IDENTITY_ENV,
  HILO_WORKSPACE_INSTANCE_ENV,
  HILO_WORKSPACE_GENERATION_ENV,
  GATEWAY_HEAP_OVERRIDE_ENV
]);
function filterRuntimeEnv(env) {
  if (!env) return {};
  const filtered = {};
  for (const [key, value] of Object.entries(filterAgentProfileOwnedEnv(env))) {
    if (value === void 0) continue;
    if (!GATEWAY_OWNED_KEYS.has(key)) filtered[key] = value;
  }
  return filtered;
}
function filterGatewayExtraEnv(env) {
  if (!env) return {};
  const filtered = {};
  for (const [key, value] of Object.entries(filterAgentProfileOwnedEnv(env))) {
    if (value === void 0) continue;
    if (!GATEWAY_OWNED_KEYS.has(key)) filtered[key] = value;
  }
  return filtered;
}
function filterInheritedGatewayEnv(env) {
  const filtered = filterAgentProfileOwnedEnv(env);
  delete filtered.HILO_EVAL_SKILLS_PATHS;
  delete filtered[HILO_AGENT_RUN_ID_ENV];
  return filtered;
}
const WINDOWS_SSE42_PROCESSOR_FEATURE_ID = 38;
const WINDOWS_CPU_FEATURE_PROBE_TIMEOUT_MS = 3e3;
const WINDOWS_SSE42_FEATURE_PROBE_MIN_BUILD = 19041;
let cachedWindowsSse42Support;
let windowsSse42ProbeAttempted = false;
function parsePowerShellBoolean(output) {
  const normalized = output.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return void 0;
}
function canReliablyProbeWindowsSse42(platform, release) {
  if (platform !== "win32") return false;
  const build = parseWindowsBuild(release);
  return build !== void 0 && build >= WINDOWS_SSE42_FEATURE_PROBE_MIN_BUILD;
}
function detectWindowsSse42Support(platform = process.platform, release = os$1.release()) {
  if (!canReliablyProbeWindowsSse42(platform, release)) return void 0;
  if (windowsSse42ProbeAttempted) return cachedWindowsSse42Support;
  windowsSse42ProbeAttempted = true;
  const script = [
    "Add-Type -Namespace Hilo -Name ProcessorFeatures",
    `-MemberDefinition '[DllImport("kernel32.dll")] public static extern bool IsProcessorFeaturePresent(uint feature);';`,
    `[Hilo.ProcessorFeatures]::IsProcessorFeaturePresent(${WINDOWS_SSE42_PROCESSOR_FEATURE_ID})`
  ].join(" ");
  try {
    const output = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      {
        encoding: "utf8",
        windowsHide: true,
        timeout: WINDOWS_CPU_FEATURE_PROBE_TIMEOUT_MS
      }
    );
    cachedWindowsSse42Support = parsePowerShellBoolean(output);
  } catch {
    cachedWindowsSse42Support = void 0;
  }
  return cachedWindowsSse42Support;
}
const DOS_HEADER_MIN_SIZE = 64;
const PE_OFFSET_FIELD = 60;
const PE_SIGNATURE_SIZE = 4;
const COFF_MACHINE_SIZE = 2;
const PE_HEADER_PREFIX_SIZE = PE_SIGNATURE_SIZE + COFF_MACHINE_SIZE;
const PE_SIGNATURE = "PE\0\0";
const PE_MACHINE_NAMES = {
  332: "x86",
  34404: "x64",
  43620: "arm64"
};
function inspectWindowsPeFile(filePath) {
  const fileDescriptor = fs$1.openSync(filePath, "r");
  try {
    const dosHeader = Buffer.alloc(DOS_HEADER_MIN_SIZE);
    const dosBytesRead = fs$1.readSync(fileDescriptor, dosHeader, 0, DOS_HEADER_MIN_SIZE, 0);
    if (dosBytesRead < DOS_HEADER_MIN_SIZE) {
      return { valid: false, reason: "truncated_dos_header" };
    }
    if (dosHeader[0] !== 77 || dosHeader[1] !== 90) {
      return { valid: false, reason: "missing_mz_header" };
    }
    const peOffset = dosHeader.readUInt32LE(PE_OFFSET_FIELD);
    if (peOffset < DOS_HEADER_MIN_SIZE) {
      return { valid: false, reason: "invalid_pe_offset" };
    }
    const peHeader = Buffer.alloc(PE_HEADER_PREFIX_SIZE);
    const peBytesRead = fs$1.readSync(fileDescriptor, peHeader, 0, PE_HEADER_PREFIX_SIZE, peOffset);
    if (peBytesRead < PE_HEADER_PREFIX_SIZE) {
      return { valid: false, reason: "truncated_pe_header" };
    }
    if (peHeader.toString("binary", 0, PE_SIGNATURE_SIZE) !== PE_SIGNATURE) {
      return { valid: false, reason: "missing_pe_signature" };
    }
    const machineCode = peHeader.readUInt16LE(PE_SIGNATURE_SIZE);
    const machine = PE_MACHINE_NAMES[machineCode];
    if (!machine) {
      return { valid: false, machineCode, reason: "unsupported_machine" };
    }
    return { valid: true, machine, machineCode };
  } finally {
    fs$1.closeSync(fileDescriptor);
  }
}
const STATUS_ACCESS_VIOLATION = 3221225477;
const STATUS_NO_MEMORY = 3221225495;
const STATUS_ILLEGAL_INSTRUCTION = 3221225501;
const STATUS_ACCESS_DENIED = 3221225506;
const STATUS_INVALID_IMAGE_FORMAT = 3221225595;
const STATUS_DISK_FULL = 3221225599;
const STATUS_INTEGER_DIVIDE_BY_ZERO = 3221225620;
const STATUS_STACK_OVERFLOW = 3221225725;
const STATUS_COMMITMENT_LIMIT = 3221225773;
const STATUS_INVALID_IMAGE_NOT_MZ = 3221225775;
const STATUS_DLL_NOT_FOUND = 3221225781;
const STATUS_ENTRYPOINT_NOT_FOUND = 3221225785;
const STATUS_DLL_INIT_FAILED = 3221225794;
const STATUS_HEAP_CORRUPTION = 3221226356;
const STATUS_STACK_BUFFER_OVERRUN = 3221226505;
const DBG_TERMINATE_PROCESS = 1073807364;
const WINDOWS_STATUS_CODES = {
  [STATUS_ACCESS_VIOLATION]: {
    statusName: "STATUS_ACCESS_VIOLATION",
    startupErrorKind: "early_exit",
    detail: "The runtime accessed invalid memory."
  },
  [STATUS_NO_MEMORY]: {
    statusName: "STATUS_NO_MEMORY",
    startupErrorKind: "windows_runtime_resource_exhausted",
    detail: "The system could not allocate the memory required to start the process."
  },
  [STATUS_ILLEGAL_INSTRUCTION]: {
    statusName: "STATUS_ILLEGAL_INSTRUCTION",
    startupErrorKind: "windows_cpu_unsupported",
    detail: "The runtime attempted a CPU instruction unavailable on this processor."
  },
  [STATUS_ACCESS_DENIED]: {
    statusName: "STATUS_ACCESS_DENIED",
    startupErrorKind: "binary_blocked",
    detail: "Windows denied access while starting the runtime executable."
  },
  [STATUS_INVALID_IMAGE_FORMAT]: {
    statusName: "STATUS_INVALID_IMAGE_FORMAT",
    startupErrorKind: "windows_binary_incompatible",
    detail: "Windows rejected an executable or DLL because its image format is incompatible."
  },
  [STATUS_DISK_FULL]: {
    statusName: "STATUS_DISK_FULL",
    startupErrorKind: "windows_runtime_resource_exhausted",
    detail: "The system disk or runtime data disk does not have enough free space."
  },
  [STATUS_INTEGER_DIVIDE_BY_ZERO]: {
    statusName: "STATUS_INTEGER_DIVIDE_BY_ZERO",
    startupErrorKind: "early_exit",
    detail: "The runtime terminated after an invalid integer operation."
  },
  [STATUS_STACK_OVERFLOW]: {
    statusName: "STATUS_STACK_OVERFLOW",
    startupErrorKind: "early_exit",
    detail: "The runtime exhausted its process stack."
  },
  [STATUS_COMMITMENT_LIMIT]: {
    statusName: "STATUS_COMMITMENT_LIMIT",
    startupErrorKind: "windows_runtime_resource_exhausted",
    detail: "The system commit limit was reached while starting the runtime."
  },
  [STATUS_INVALID_IMAGE_NOT_MZ]: {
    statusName: "STATUS_INVALID_IMAGE_NOT_MZ",
    startupErrorKind: "windows_binary_incompatible",
    detail: "Windows rejected an executable or DLL because it is not a valid PE image."
  },
  [STATUS_DLL_NOT_FOUND]: {
    statusName: "STATUS_DLL_NOT_FOUND",
    startupErrorKind: "windows_runtime_dependency_failed",
    detail: "A DLL required by the runtime could not be found."
  },
  [STATUS_ENTRYPOINT_NOT_FOUND]: {
    statusName: "STATUS_ENTRYPOINT_NOT_FOUND",
    startupErrorKind: "windows_runtime_dependency_failed",
    detail: "A Windows API or DLL entry point required by the runtime is unavailable."
  },
  [STATUS_DLL_INIT_FAILED]: {
    statusName: "STATUS_DLL_INIT_FAILED",
    startupErrorKind: "windows_runtime_dependency_failed",
    detail: "A DLL required by the runtime failed to initialize."
  },
  [STATUS_HEAP_CORRUPTION]: {
    statusName: "STATUS_HEAP_CORRUPTION",
    startupErrorKind: "early_exit",
    detail: "Windows detected heap corruption in the runtime process."
  },
  [STATUS_STACK_BUFFER_OVERRUN]: {
    statusName: "STATUS_STACK_BUFFER_OVERRUN",
    startupErrorKind: "early_exit",
    detail: "Windows terminated the runtime after a fail-fast check."
  },
  [DBG_TERMINATE_PROCESS]: {
    statusName: "DBG_TERMINATE_PROCESS",
    startupErrorKind: "windows_runtime_terminated",
    detail: "The runtime process was terminated externally."
  }
};
const WINDOWS_PROCESS_STARTUP_ERROR_KINDS = [
  "windows_cpu_unsupported",
  "windows_runtime_dependency_failed",
  "windows_binary_incompatible",
  "windows_runtime_resource_exhausted",
  "windows_runtime_terminated"
];
const WINDOWS_RETRIABLE_CRASH_CODES = /* @__PURE__ */ new Set([
  STATUS_ACCESS_VIOLATION,
  STATUS_INTEGER_DIVIDE_BY_ZERO,
  STATUS_STACK_OVERFLOW,
  STATUS_HEAP_CORRUPTION,
  STATUS_STACK_BUFFER_OVERRUN
]);
function normalizeExitCode(code) {
  return code >>> 0;
}
function formatHexCode(code) {
  return `0x${code.toString(16).padStart(8, "0").toUpperCase()}`;
}
function classifyWindowsProcessExit(code) {
  if (code === null || code === void 0) return void 0;
  const unsignedCode = normalizeExitCode(code);
  if (!(unsignedCode in WINDOWS_STATUS_CODES)) return void 0;
  const status = WINDOWS_STATUS_CODES[unsignedCode];
  return {
    unsignedCode,
    hexCode: formatHexCode(unsignedCode),
    statusName: status.statusName,
    startupErrorKind: status.startupErrorKind,
    detail: status.detail,
    // Loader/compatibility/resource statuses require external action and must
    // not spin. Memory-safety/fail-fast crashes retain the bounded restart
    // circuit because a clean process can recover from transient corruption.
    shouldAutoRestart: WINDOWS_RETRIABLE_CRASH_CODES.has(unsignedCode)
  };
}
function parseWindowsProcessExitCode(message) {
  const hexMatch = message.match(/\b0x([0-9a-f]{8})\b/i);
  if (hexMatch?.[1]) {
    return Number.parseInt(hexMatch[1], 16) >>> 0;
  }
  const decimalMatch = message.match(/\b(?:exitCode|code)\s*[=:]?\s*(-?\d+)\b/i);
  if (!decimalMatch?.[1]) return void 0;
  const parsed = Number.parseInt(decimalMatch[1], 10);
  return Number.isFinite(parsed) ? parsed >>> 0 : void 0;
}
function classifyWindowsProcessExitMessage(message) {
  const code = parseWindowsProcessExitCode(message);
  return code === void 0 ? void 0 : classifyWindowsProcessExit(code);
}
function formatWindowsProcessExit(diagnosis) {
  return `
[${diagnosis.startupErrorKind}] [Windows] Exit code ${diagnosis.hexCode} (${diagnosis.statusName}): ${diagnosis.detail}`;
}
const WINDOWS_VERSION_QUERY_TIMEOUT_MS = 5e3;
const WINDOWS_VERSION_QUERY_MAX_BUFFER_BYTES = 8 * 1024;
const WINDOWS_VERSION_COMPONENT_MAX = 4294967295;
const WINDOWS_VERSION_MAX_LENGTH = 64;
const WINDOWS_VERSION_RECHECK_DELAY_MS = 5e3;
const WINDOWS_VERSION_CIM_SCRIPT = [
  "$ErrorActionPreference = 'Stop'",
  "Get-CimInstance -ClassName Win32_OperatingSystem -Property Version,BuildNumber -OperationTimeoutSec 3 | Select-Object Version,BuildNumber | ConvertTo-Json -Compress"
].join("; ");
class WindowsVersionQueryError extends Error {
  constructor(reason) {
    super(`Windows version query failed: ${reason}`);
    this.reason = reason;
  }
}
function normalizeWindowsRelease(raw) {
  const value = raw.trim();
  if (value.length > WINDOWS_VERSION_MAX_LENGTH || !/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(value)) {
    return void 0;
  }
  const components = value.split(".").map(Number);
  if (components.some(
    (component) => !Number.isSafeInteger(component) || component > WINDOWS_VERSION_COMPONENT_MAX
  )) {
    return void 0;
  }
  return components.slice(0, 3).join(".");
}
function parseCimWindowsRelease(output) {
  let value;
  try {
    value = JSON.parse(output.trim());
  } catch {
    return void 0;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  if (!("Version" in value) || !("BuildNumber" in value)) return void 0;
  if (typeof value.Version !== "string" || typeof value.BuildNumber !== "string") return void 0;
  const release = normalizeWindowsRelease(value.Version);
  const build = value.BuildNumber.trim();
  if (!release || !/^\d+$/.test(build) || build.length > WINDOWS_VERSION_MAX_LENGTH)
    return void 0;
  if (Number(build) !== Number(release.split(".")[2])) return void 0;
  return release;
}
function queryWindowsVersionCim() {
  const systemRoot = process.env.SystemRoot;
  if (!systemRoot || !/^[a-z]:[\\/]/i.test(systemRoot)) {
    return Promise.reject(new WindowsVersionQueryError("query_failed"));
  }
  const executable = path.win32.join(
    systemRoot,
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe"
  );
  return new Promise((resolve2, reject) => {
    execFile(
      executable,
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", WINDOWS_VERSION_CIM_SCRIPT],
      {
        encoding: "utf8",
        windowsHide: true,
        timeout: WINDOWS_VERSION_QUERY_TIMEOUT_MS,
        maxBuffer: WINDOWS_VERSION_QUERY_MAX_BUFFER_BYTES
      },
      (error, stdout) => {
        if (!error) {
          resolve2(stdout);
          return;
        }
        const reason = error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" ? "invalid_response" : error.killed ? "timeout" : "query_failed";
        reject(new WindowsVersionQueryError(reason));
      }
    );
  });
}
function createWindowsVersionResolver(deps = {}) {
  const queryCim = deps.queryCim ?? queryWindowsVersionCim;
  const now = deps.now ?? Date.now;
  let cached;
  let pending;
  async function verify(reportedRelease) {
    let failureReason;
    try {
      const cimRelease = parseCimWindowsRelease(await queryCim());
      if (cimRelease) {
        return Object.freeze({
          reportedRelease,
          effectiveRelease: cimRelease,
          cimRelease,
          source: "cim",
          status: isWindowsVersionUnsupported("win32", cimRelease) ? "unsupported" : "supported",
          observedAt: new Date(now()).toISOString()
        });
      }
      failureReason = "invalid_response";
    } catch (error) {
      failureReason = error instanceof WindowsVersionQueryError ? error.reason : "query_failed";
    }
    return Object.freeze({
      reportedRelease,
      source: "unavailable",
      status: "unverified",
      observedAt: new Date(now()).toISOString(),
      failureReason
    });
  }
  return {
    async resolve(platform, reportedRelease) {
      if (platform !== "win32") return void 0;
      const age = cached ? now() - cached.checkedAt : 0;
      if (cached?.snapshot.reportedRelease === reportedRelease && (cached.snapshot.status !== "unverified" || age >= 0 && age < WINDOWS_VERSION_RECHECK_DELAY_MS)) {
        return cached.snapshot;
      }
      if (pending?.reportedRelease === reportedRelease) return pending.promise;
      const release = normalizeWindowsRelease(reportedRelease);
      if (release && !isWindowsVersionUnsupported(platform, release)) {
        const snapshot22 = Object.freeze({
          reportedRelease,
          effectiveRelease: release,
          source: "runtime",
          status: "supported",
          observedAt: new Date(now()).toISOString()
        });
        cached = { snapshot: snapshot22, checkedAt: now() };
        pending = void 0;
        return snapshot22;
      }
      const request2 = { reportedRelease, promise: verify(reportedRelease) };
      pending = request2;
      const snapshot2 = await request2.promise;
      if (pending === request2) {
        cached = { snapshot: snapshot2, checkedAt: now() };
        pending = void 0;
      }
      return snapshot2;
    },
    peek: () => cached?.snapshot
  };
}
const windowsVersionResolver = createWindowsVersionResolver();
function getWindowsVersionVerification(platform = process.platform, reportedRelease = os$1.release()) {
  return windowsVersionResolver.resolve(platform, reportedRelease);
}
function peekWindowsVersionVerification() {
  return windowsVersionResolver.peek();
}
class CustomMcpConfigOverrides {
  overrides = /* @__PURE__ */ new Map();
  set(name, config) {
    this.overrides.set(name, config ? structuredClone(config) : null);
  }
  apply(content) {
    if (this.overrides.size === 0) return content;
    const document = JSON.parse(content || "{}");
    if (!isRecord(document) || document.mcp !== void 0 && !isRecord(document.mcp)) {
      throw new Error("Invalid runtime MCP configuration");
    }
    let mcp = { ...isRecord(document.mcp) ? document.mcp : {} };
    for (const [name, config] of this.overrides) {
      if (config === null) delete mcp[name];
      else mcp = { ...mcp, [name]: markCustomMcpConfig(config) };
    }
    return JSON.stringify({ ...document, mcp });
  }
}
function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
const startups = /* @__PURE__ */ new Map();
async function withOpenCodeDatabaseStartup(databasePath, start) {
  if (!databasePath) return start();
  const key = resolve(databasePath);
  const previous = startups.get(key);
  let release;
  const current = new Promise((done) => {
    release = done;
  });
  startups.set(key, current);
  try {
    await previous;
    return await start();
  } finally {
    release();
    if (startups.get(key) === current) startups.delete(key);
  }
}
const DATABASE_STARTUP_RETRY_DELAYS_MS = [250, 500, 1e3];
function isOpenCodeDatabaseBusy(error, stderr) {
  const message = error instanceof Error ? error.message : String(error);
  return /\bdatabase (?:table )?is locked\b|\bSQLITE_BUSY\b|\bSQLITE_LOCKED\b/i.test(
    `${message}
${stderr.join("\n")}`
  );
}
function ensureOpenCodeDependencySatisfied(dirs, log) {
  const satisfied = openCodeDependencySatisfiedFiles(OPENCODE_VERSION);
  const seen = /* @__PURE__ */ new Set();
  for (const dir of dirs) {
    if (!dir) continue;
    const resolved = path__default.resolve(dir);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    try {
      fs__default.mkdirSync(path__default.join(resolved, satisfied.markerDir), { recursive: true });
      for (const file of satisfied.files) {
        const target = path__default.join(resolved, file.name);
        fs__default.writeFileSync(target, file.content, "utf-8");
      }
    } catch (err) {
      log?.warn(
        `[opencode] Failed to write dependency markers in ${resolved}: ${err instanceof Error ? err.message : String(err)}. If the directory is unwritable OpenCode skips its npm install for it; otherwise the install may run and its outcome is reported by the instance readiness probe.`
      );
    }
  }
}
const GLOBAL_RESTART_WINDOW_MS = 3e4;
const GLOBAL_RESTART_MAX_IN_WINDOW = 2;
const GLOBAL_RESTART_STORM_COOLDOWN_MS = 6e4;
const BINARY_BLOCKED_QUARANTINE_MS = 10 * 6e4;
const RESTART_STAGGER_MS = 750;
class OpenCodeRestartCircuit {
  restartTimestamps = [];
  blockedUntilMs = 0;
  blockedReason = "";
  requestRestart(nowMs, errorKind) {
    const existingBlock = this.currentBlock(nowMs);
    if (existingBlock) return existingBlock;
    if (isQuarantineKind(errorKind)) {
      return this.block(nowMs, BINARY_BLOCKED_QUARANTINE_MS, errorKind);
    }
    this.prune(nowMs);
    if (this.restartTimestamps.length >= GLOBAL_RESTART_MAX_IN_WINDOW) {
      return this.block(nowMs, GLOBAL_RESTART_STORM_COOLDOWN_MS, "global_restart_storm");
    }
    this.restartTimestamps.push(nowMs);
    return {
      allow: true,
      delayMs: Math.max(0, (this.restartTimestamps.length - 1) * RESTART_STAGGER_MS),
      retryCountInWindow: this.restartTimestamps.length
    };
  }
  recordFailure(nowMs, errorKind) {
    if (!isQuarantineKind(errorKind)) return this.currentBlock(nowMs);
    return this.block(nowMs, BINARY_BLOCKED_QUARANTINE_MS, errorKind);
  }
  assertCanStart(nowMs) {
    return this.currentBlock(nowMs);
  }
  resetForTest() {
    this.restartTimestamps = [];
    this.blockedUntilMs = 0;
    this.blockedReason = "";
  }
  currentBlock(nowMs) {
    if (this.blockedUntilMs <= nowMs) return void 0;
    this.prune(nowMs);
    return {
      allow: false,
      reason: this.blockedReason,
      retryCountInWindow: this.restartTimestamps.length,
      blockedUntilMs: this.blockedUntilMs
    };
  }
  block(nowMs, durationMs, reason) {
    this.prune(nowMs);
    this.blockedUntilMs = Math.max(this.blockedUntilMs, nowMs + durationMs);
    this.blockedReason = reason;
    return {
      allow: false,
      reason,
      retryCountInWindow: this.restartTimestamps.length,
      blockedUntilMs: this.blockedUntilMs
    };
  }
  prune(nowMs) {
    const cutoff = nowMs - GLOBAL_RESTART_WINDOW_MS;
    this.restartTimestamps = this.restartTimestamps.filter((ts2) => ts2 >= cutoff);
  }
}
const globalOpenCodeRestartCircuit = new OpenCodeRestartCircuit();
function isQuarantineKind(errorKind) {
  return errorKind === "binary_blocked" || errorKind === "binary_missing" || errorKind === "binary_corrupted" || errorKind === "dll_init_failed";
}
class OpenCodeRestartCircuitRegistry {
  circuits = /* @__PURE__ */ new Map();
  /** Return the circuit for a workspace key, creating it on first use. */
  get(workspaceKey) {
    let circuit = this.circuits.get(workspaceKey);
    if (!circuit) {
      circuit = new OpenCodeRestartCircuit();
      this.circuits.set(workspaceKey, circuit);
    }
    return circuit;
  }
  /**
   * Drop a workspace's circuit (e.g. on workspace close) so a reopened
   * workspace starts with a clean restart history instead of inheriting a
   * cooldown from a previous session.
   */
  delete(workspaceKey) {
    this.circuits.delete(workspaceKey);
  }
  resetForTest() {
    this.circuits.clear();
  }
}
const globalOpenCodeRestartCircuitRegistry = new OpenCodeRestartCircuitRegistry();
function resolveRestartCircuit(opts) {
  if (opts.enabled && opts.workspaceKey) {
    return opts.registry.get(opts.workspaceKey);
  }
  return opts.fallback;
}
class RestartCircuitBlockedError extends Error {
  circuitBlock;
  constructor(kind, info) {
    super(formatRestartCircuitBlockMessage(kind, info));
    this.name = "RestartCircuitBlockedError";
    this.circuitBlock = info;
  }
}
function formatRestartCircuitBlockMessage(kind, info) {
  const action = kind === "startup" ? "OpenCode startup" : "AI service auto-restart";
  return `${action} blocked by ${info.scope} restart circuit: ${info.reason} until ${new Date(
    info.blockedUntilMs
  ).toISOString()}`;
}
const RESTART_CIRCUIT_BLOCK_PATTERN = /blocked by (workspace|global) restart circuit:\s+(\S+)\s+until\s+(\S+)/i;
function parseRestartCircuitBlockMessage(message) {
  const match = RESTART_CIRCUIT_BLOCK_PATTERN.exec(message);
  if (!match) return void 0;
  const [, scope, reason, until] = match;
  const blockedUntilMs = Date.parse(until);
  if (!Number.isFinite(blockedUntilMs)) return void 0;
  return {
    blockedUntilMs,
    reason,
    scope: scope === "global" ? "global" : "workspace"
  };
}
function getRestartCircuitBlockInfo(err) {
  if (err instanceof RestartCircuitBlockedError) return err.circuitBlock;
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : void 0;
  if (!message) return void 0;
  return parseRestartCircuitBlockMessage(message);
}
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = decorator(result) || result;
  return result;
};
var __decorateParam = (index, decorator) => (target, key) => decorator(target, key, index);
const DEFAULT_CONFIG = {
  hostname: "127.0.0.1",
  healthCheckTimeout: 3e4,
  healthCheckInterval: 500,
  maxRestartAttempts: 3
};
const RESTART_BASE_DELAY_MS = 1e3;
const RESTART_MAX_BACKOFF_MS = 1e4;
const RESTART_STABLE_RESET_MS = 5 * 6e4;
const PLUGIN_MARKER_GRACE_MS = 500;
const DB_QUARANTINE_COOLDOWN_MS = 6e4;
let lastDbQuarantineAtMs = 0;
function planDbSchemaMismatchRemediation(options) {
  if (!PATTERN_OPENCODE_DB_SCHEMA_MISMATCH.test(options.stderrText)) return "none";
  if (!options.dbPath) return "unconfigured";
  return options.nowMs - options.lastQuarantineAtMs < DB_QUARANTINE_COOLDOWN_MS ? "retry-only" : "quarantine";
}
const OPENCODE_HEALTH_PATH = "/global/health";
const OPENCODE_HEALTH_LOOPBACK_HOSTS = /* @__PURE__ */ new Set(["127.0.0.1", "localhost"]);
const INSTANCE_READINESS_TIMEOUT_MS = 2e4;
const INSTANCE_READINESS_MAX_PROBES = 5;
const INSTANCE_READINESS_REPROBE_DELAY_MS = 3e4;
async function probeOpenCodeInstanceReady(baseUrl, directory, authHeader, signal) {
  try {
    await warmOpenCodeProjectInstance(baseUrl, directory, authHeader, signal);
    return true;
  } catch (error) {
    return formatTransportError(error);
  }
}
const MIN_OPENCODE_BINARY_SIZE_BYTES = 1e6;
const PROGRESS_AWARE_HEALTH_ENABLED = process.env.HILO_PROGRESS_AWARE_HEALTH !== "0";
const HEALTH_HARD_TIMEOUT_MULTIPLIER = 2;
const HEALTH_HARD_TIMEOUT_CEILING_MS = 24e4;
const HEALTH_SERVER_LISTENING_PATTERN = /server listening|listening on/i;
const HEALTH_NO_RETRY_MARKER = "[bound-but-unhealthy]";
const WORKING_DIRECTORY_ERROR_KINDS = [
  "working_directory_missing",
  "working_directory_not_directory",
  "working_directory_inaccessible"
];
const WINDOWS_UNSAFE_TRAILING_CWD_SEGMENT_PATTERN = /[. ]$/;
const PER_WORKSPACE_RESTART_CIRCUIT_ENABLED = process.env.HILO_PER_WORKSPACE_RESTART_CIRCUIT !== "0";
function shouldContinueHealthWait(opts) {
  if (opts.nowMs >= opts.hardDeadlineMs) return false;
  if (opts.nowMs < opts.softDeadlineMs) return true;
  return opts.processAlive && opts.serverListening;
}
function hardHealthTimeoutMs(softTimeoutMs) {
  const override = Number(process.env.HILO_OPENCODE_HEALTH_HARD_TIMEOUT_MS);
  if (Number.isFinite(override) && override > 0) {
    return Math.max(softTimeoutMs, override);
  }
  return Math.min(softTimeoutMs * HEALTH_HARD_TIMEOUT_MULTIPLIER, HEALTH_HARD_TIMEOUT_CEILING_MS);
}
function isOpenCodeHealthResponse(value) {
  if (!value || typeof value !== "object") return false;
  const payload = value;
  return payload.healthy === true && typeof payload.version === "string";
}
function parseJsonResponse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return void 0;
  }
}
function evaluateOpenCodeHealthResponse(status, statusText, payload) {
  if (status >= 300 && status < 400) {
    return `redirect ${status} ${statusText}`.trim();
  }
  if (status >= 200 && status < 300) {
    return isOpenCodeHealthResponse(payload) ? true : "invalid /global/health response";
  }
  return `${status} ${statusText}`.trim();
}
async function warmOpenCodeProjectInstance(baseUrl, directory, authHeader, signal) {
  const url = new URL("/session", baseUrl);
  url.searchParams.set("directory", directory);
  url.searchParams.set("roots", "true");
  url.searchParams.set("limit", "1");
  const response = await requestLoopbackDirect(url.toString(), {
    headers: { authorization: authHeader },
    signal
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`project warmup returned ${response.status} ${response.statusText}`.trim());
  }
}
async function probeOpenCodeHealth(healthUrl, authHeader, signal) {
  try {
    const response = await requestLoopbackDirect(healthUrl, {
      headers: { Authorization: authHeader },
      signal
    });
    return evaluateOpenCodeHealthResponse(
      response.status,
      response.statusText,
      parseJsonResponse(response.bodyText)
    );
  } catch (error) {
    return formatTransportError(error);
  }
}
function resolveOpenCodeHealthUrl(baseUrl) {
  if (!baseUrl) {
    throw new Error("[opencode] Refusing health probe: OpenCode base URL is unavailable");
  }
  const healthUrl = `${baseUrl}${OPENCODE_HEALTH_PATH}`;
  let parsed;
  try {
    parsed = new URL(healthUrl);
  } catch {
    throw new Error("[opencode] Refusing health probe: invalid health URL");
  }
  if (parsed.protocol !== "http:") {
    throw new Error("[opencode] Refusing health probe: health URL must use http");
  }
  if (!OPENCODE_HEALTH_LOOPBACK_HOSTS.has(parsed.hostname)) {
    throw new Error("[opencode] Refusing health probe: host must be 127.0.0.1 or localhost");
  }
  if (parsed.username || parsed.password) {
    throw new Error("[opencode] Refusing health probe: health URL must not contain credentials");
  }
  if (parsed.pathname !== OPENCODE_HEALTH_PATH || parsed.search || parsed.hash) {
    throw new Error("[opencode] Refusing health probe: path must be /global/health");
  }
  return parsed.toString();
}
function pickSafeShell() {
  if (process.platform === "darwin") {
    return fs$1.existsSync("/bin/bash") ? "/bin/bash" : void 0;
  }
  return void 0;
}
function buildOpenCodeBaseSpawnEnv(parentEnv = process.env) {
  const env = filterAgentProfileOwnedEnv(parentEnv);
  delete env[HILO_AGENT_RUN_ID_ENV];
  const shell = pickSafeShell();
  if (shell) env.SHELL = shell;
  return env;
}
function prependBundledBinaryDirectory(env, binaryPath2, delimiter = path.delimiter) {
  const isWindowsPath = /^[a-zA-Z]:[\\/]/.test(binaryPath2);
  const directory = (isWindowsPath ? path.win32 : path).dirname(binaryPath2);
  const samePath = (value) => process.platform === "win32" || isWindowsPath ? value.toLowerCase() === directory.toLowerCase() : value === directory;
  let existingPath = "";
  for (const [key, value] of Object.entries(env)) {
    if (key.toUpperCase() === "PATH" && value !== void 0) existingPath = value;
  }
  for (const key of Object.keys(env)) {
    if (key.toUpperCase() === "PATH") delete env[key];
  }
  const existing = existingPath.split(delimiter).map((value) => value.trim()).filter((value) => value.length > 0 && !samePath(value));
  env.PATH = [directory, ...existing].join(delimiter);
}
function resolveExecutableFromPath(env, executableName, options = {}) {
  const platform = options.platform ?? process.platform;
  const delimiter = options.delimiter ?? path.delimiter;
  const exists = options.exists ?? fs$1.existsSync;
  const pathApi = platform === "win32" ? path.win32 : path;
  let executablePath = "";
  for (const [key, value] of Object.entries(env)) {
    if (key.toUpperCase() === "PATH" && value !== void 0) executablePath = value;
  }
  for (const directory of executablePath.split(delimiter)) {
    const trimmedDirectory = directory.trim();
    if (!trimmedDirectory) continue;
    const candidate = pathApi.resolve(trimmedDirectory, executableName);
    if (exists(candidate)) return candidate;
  }
  return void 0;
}
function describeExitCode(code) {
  if (code === null || process.platform !== "win32") return "";
  const diagnosis = classifyWindowsProcessExit(code);
  return diagnosis ? formatWindowsProcessExit(diagnosis) : "";
}
function describeSpawnError(err) {
  if (process.platform !== "win32") return "";
  if (err.message.includes("UNKNOWN")) {
    return '\n[Windows] "spawn UNKNOWN" means Windows rejected process creation without a specific error code. The diagnostic bundle records the executable path and environment-block size for further analysis.';
  }
  if (err.message.includes("ENOENT")) {
    return '\n[Windows] "spawn ENOENT" means Windows could not resolve the executable or working directory. The startup preflight checks both paths separately; use its diagnosis instead of changing a Unicode path.';
  }
  return "";
}
function getNodeErrorCode(err) {
  if (!err || typeof err !== "object" || !("code" in err)) return void 0;
  const code = err.code;
  return typeof code === "string" ? code : void 0;
}
function describeUnknownError(err) {
  return err instanceof Error ? err.message : String(err);
}
function parseDarwinMajor(release) {
  const [majorRaw] = release.split(".");
  const major = Number.parseInt(majorRaw ?? "", 10);
  return Number.isFinite(major) ? major : void 0;
}
function isMacOSVersionUnsupported(platform, release) {
  if (platform !== "darwin") return false;
  const darwinMajor = parseDarwinMajor(release);
  if (darwinMajor === void 0) return false;
  return darwinMajor < MIN_SUPPORTED_DARWIN_MAJOR;
}
async function assertOSVersionPreflight(platform = process.platform, release = os$1.release(), verifyWindowsVersion = getWindowsVersionVerification, detectSse42 = detectWindowsSse42Support) {
  if (isMacOSVersionUnsupported(platform, release)) {
    throw new Error(
      `${MACOS_VERSION_UNSUPPORTED_ERROR_MARKER} 系统版本过低，请升级 macOS 至 ${MIN_SUPPORTED_MACOS_VERSION} 或更高版本。 Detected Darwin release: ${release}.`
    );
  }
  const windowsVersion = await verifyWindowsVersion(platform, release);
  if (windowsVersion?.status === "unverified") {
    throw new Error(
      `${WINDOWS_VERSION_UNVERIFIED_ERROR_MARKER} Could not verify the Windows version before starting the local AI service. Reported Windows release: ${release}. Verification failure: ${windowsVersion.failureReason}.`
    );
  }
  if (windowsVersion?.status === "unsupported") {
    throw new Error(
      `${WINDOWS_VERSION_UNSUPPORTED_ERROR_MARKER} Windows build is below the bundled runtime requirement. Detected Windows release: ${windowsVersion.effectiveRelease}. Required build: ${MIN_SUPPORTED_WINDOWS_BUILD}. Reported Windows release: ${release}. Version source: ${windowsVersion.source}.`
    );
  }
  const effectiveRelease = windowsVersion?.effectiveRelease ?? release;
  const sse42Supported = detectSse42(platform, effectiveRelease);
  if (isWindowsCpuUnsupported(platform, sse42Supported)) {
    throw new Error(
      `${WINDOWS_CPU_UNSUPPORTED_ERROR_MARKER} The bundled local AI service requires an x64 processor with SSE4.2 support. Runtime requirement: ${MIN_SUPPORTED_WINDOWS_VERSION_LABEL}, SSE4.2.`
    );
  }
  return windowsVersion;
}
function createWorkingDirectoryPreflightError(kind, cwd, detail) {
  const detailLine = detail ? `
${detail}` : "";
  return new Error(
    `[${kind}] OpenCode working directory preflight failed for cwd: ${cwd}${detailLine}`
  );
}
function hasWin32UnsafeTrailingCwdSegment(cwd) {
  const normalized = cwd.replace(/[\\/]+$/, "");
  if (!normalized) return false;
  return normalized.split(/[\\/]+/).some((segment) => {
    if (!segment || segment === "." || segment === "..") return false;
    return WINDOWS_UNSAFE_TRAILING_CWD_SEGMENT_PATTERN.test(segment);
  });
}
function assertWorkingDirectoryPreflight(cwd) {
  let stat;
  try {
    stat = fs$1.statSync(cwd);
  } catch (err) {
    const code = getNodeErrorCode(err);
    const kind = code === "ENOENT" || code === "ENOTDIR" ? "working_directory_missing" : "working_directory_inaccessible";
    throw createWorkingDirectoryPreflightError(kind, cwd, describeUnknownError(err));
  }
  if (!stat.isDirectory()) {
    throw createWorkingDirectoryPreflightError(
      "working_directory_not_directory",
      cwd,
      "Path exists but is not a directory."
    );
  }
  if (process.platform === "win32" && hasWin32UnsafeTrailingCwdSegment(cwd)) {
    throw createWorkingDirectoryPreflightError(
      "working_directory_inaccessible",
      cwd,
      "Windows CreateProcess may reject cwd segments ending with a dot or space."
    );
  }
  try {
    fs$1.accessSync(cwd, fs$1.constants.R_OK | fs$1.constants.X_OK);
  } catch (err) {
    throw createWorkingDirectoryPreflightError(
      "working_directory_inaccessible",
      cwd,
      describeUnknownError(err)
    );
  }
}
function computeRestartDelayMs(restartCount, globalStaggerMs = 0) {
  const safeRestartCount = Math.max(1, Math.floor(restartCount));
  const perInstanceBackoffMs = Math.min(
    RESTART_BASE_DELAY_MS * 2 ** (safeRestartCount - 1),
    RESTART_MAX_BACKOFF_MS
  );
  return perInstanceBackoffMs + Math.max(0, globalStaggerMs);
}
class OpenCodeLifecycleCancelledError extends Error {
  constructor() {
    super("OpenCode startup cancelled by a newer stop or restart request");
    this.name = "OpenCodeLifecycleCancelledError";
  }
}
let OpenCodeManager = class extends Disposable {
  constructor(config, logService) {
    super();
    this.logService = logService;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._workingDirectory = config.workingDirectory;
    this.restartCircuitWorkspaceKey = PER_WORKSPACE_RESTART_CIRCUIT_ENABLED && config.workspaceKey ? config.workspaceKey : void 0;
    this.restartCircuit = resolveRestartCircuit({
      workspaceKey: config.workspaceKey,
      enabled: PER_WORKSPACE_RESTART_CIRCUIT_ENABLED,
      registry: globalOpenCodeRestartCircuitRegistry,
      fallback: globalOpenCodeRestartCircuit
    });
    this.openCodeCredentials = {
      username: config.username ?? crypto.randomUUID(),
      password: config.password ?? crypto.randomUUID()
    };
    this.authHeader = `Basic ${Buffer.from(`${this.openCodeCredentials.username}:${this.openCodeCredentials.password}`).toString("base64")}`;
  }
  _onDidReady = this._register(new Emitter());
  onDidReady = this._onDidReady.event;
  _onDidError = this._register(new Emitter());
  onDidError = this._onDidError.event;
  _onDidExit = this._register(
    new Emitter()
  );
  onDidExit = this._onDidExit.event;
  _onDidRebuildDatabase = this._register(new Emitter());
  onDidRebuildDatabase = this._onDidRebuildDatabase.event;
  process = null;
  _port = null;
  _url = null;
  restartCount = 0;
  stopping = false;
  restartTimer = null;
  restartCountResetTimer = null;
  /** Serializes public lifecycle transitions and coalesces duplicate calls. */
  lifecycleQueue = Promise.resolve();
  startPromise = null;
  startPromiseEpoch = -1;
  stopPromise = null;
  stopPromiseEpoch = -1;
  restartPromise = null;
  restartPromiseEpoch = -1;
  /** Incremented by stop/restart so the latest destructive intent wins. */
  lifecycleIntentEpoch = 0;
  /** Monotonic process generation used only for ownership diagnostics. */
  processGeneration = 0;
  /** Pending env overrides accumulated while a restart is in progress. */
  _pendingEnv = null;
  _pendingRestartPromise = null;
  /** Tracks early exit during waitForHealthy — the exit handler sets this.process = null,
   *  so we need a separate flag to detect the process died before becoming healthy. */
  _earlyExit = null;
  /** Captures the spawn error (ENOENT, EACCES, etc.) for waitForHealthy diagnostics. */
  _spawnError = null;
  /** True once the runtime logs that its HTTP server is listening. Drives the
   *  progress-aware health wait: a listening process is still making progress
   *  and should not be killed at the soft deadline. Reset on each startInner. */
  _serverListening = false;
  /** Restart circuit for this manager — per-workspace when a workspaceKey is
   *  configured (R1-4), otherwise the shared global circuit. */
  restartCircuit;
  /** The workspace key whose registry circuit we own, if any (for cleanup on dispose). */
  restartCircuitWorkspaceKey;
  /** Whether this manager's restart circuit is workspace-scoped (R1-4) or the
   *  shared global fallback — surfaced in logs/telemetry for triage. */
  get restartCircuitScope() {
    return this.restartCircuitWorkspaceKey ? "workspace" : "global";
  }
  /** Collects recent stderr lines for diagnostics (capped to last N lines). */
  _recentStderr = [];
  /** Set after first successful binary validation to skip redundant sync I/O on restart. */
  _binaryValidated = false;
  /** True while startInner/waitForHealthy is in progress. Gates handleUnexpectedExit
   *  so that early-exit during startup is handled by start()'s catch, not the restart loop. */
  _startingUp = false;
  /** Tracks whether the hilo plugin emitted its initialization marker on stderr. */
  _pluginInitSeen = false;
  /** Latest project-instance readiness observation (see IOpenCodeManager). */
  _instanceReadiness = { status: "unknown" };
  /** Cancels the in-flight readiness probe on stop / dispose / respawn. */
  _instanceReadinessAbort = null;
  /** Pending bounded re-probe after a degraded verdict (observation only). */
  _instanceReadinessTimer = null;
  /** Per-instance so tests can shrink it without leaking across managers. */
  _instanceReadinessReprobeDelayMs = INSTANCE_READINESS_REPROBE_DELAY_MS;
  get instanceReadiness() {
    return this._instanceReadiness;
  }
  /** Temp file path for externalized OPENCODE_CONFIG_CONTENT. Cleaned up on stop/dispose. */
  _configFilePath = null;
  customMcpInheritedEnvKeys = [];
  customMcpConfigOverrides = new CustomMcpConfigOverrides();
  runningWorkingDirectory;
  /** Per-instance credentials for OpenCode basic auth (fixed or random) */
  openCodeCredentials;
  /** Cached Basic auth header */
  authHeader;
  config;
  /** Mutable working directory — updated via setWorkingDirectory(), used by start() */
  _workingDirectory;
  get port() {
    return this._port;
  }
  get url() {
    return this._url;
  }
  get pid() {
    return this.process?.pid ?? null;
  }
  get isRunning() {
    return this.process !== null && this.process.exitCode === null;
  }
  prepareCustomMcpConfig(config) {
    return isolateCustomMcpConfig(config, this.customMcpInheritedEnvKeys);
  }
  get workingDirectory() {
    return this.runningWorkingDirectory ?? this._workingDirectory ?? process.cwd();
  }
  syncCustomMcpConfig(name, config) {
    this.customMcpConfigOverrides.set(name, config);
    if (!this._configFilePath) {
      if (this.isRunning) throw new Error("Custom MCP runtime configuration file unavailable");
      return;
    }
    const temporaryPath = `${this._configFilePath}.${crypto.randomUUID()}.next`;
    try {
      const content = this.customMcpConfigOverrides.apply(
        fs$1.readFileSync(this._configFilePath, "utf8")
      );
      if (!content) throw new Error("Missing runtime configuration");
      fs$1.writeFileSync(
        temporaryPath,
        isolateCustomMcpConfigContent(content, this.customMcpInheritedEnvKeys),
        { encoding: "utf8", mode: 384, flag: "wx" }
      );
      fs$1.renameSync(temporaryPath, this._configFilePath);
    } catch {
      throw new Error("Custom MCP runtime configuration sync failed");
    } finally {
      if (fs$1.existsSync(temporaryPath)) fs$1.unlinkSync(temporaryPath);
    }
  }
  setWorkingDirectory(dir) {
    this._workingDirectory = dir;
  }
  start() {
    if (this.restartPromise && this.restartPromiseEpoch === this.lifecycleIntentEpoch) {
      return this.restartPromise;
    }
    if (this.startPromise && this.startPromiseEpoch === this.lifecycleIntentEpoch) {
      return this.startPromise;
    }
    const requestedIntentEpoch = this.lifecycleIntentEpoch;
    const operation = this.enqueueLifecycle(() => this.startManaged(requestedIntentEpoch));
    let tracked;
    tracked = operation.then(
      (url) => {
        if (this.startPromise === tracked) this.startPromise = null;
        return url;
      },
      (err) => {
        if (this.startPromise === tracked) this.startPromise = null;
        throw err;
      }
    );
    this.startPromise = tracked;
    this.startPromiseEpoch = requestedIntentEpoch;
    return tracked;
  }
  enqueueLifecycle(operation) {
    const result = this.lifecycleQueue.then(operation);
    this.lifecycleQueue = result.then(
      () => void 0,
      () => void 0
    );
    return result;
  }
  async startManaged(requestedIntentEpoch) {
    return withOpenCodeDatabaseStartup(
      this.config.opencodeDbPath,
      () => this.startManagedWithDatabase(requestedIntentEpoch)
    );
  }
  async startWithDatabaseRetry(requestedIntentEpoch) {
    for (let attempt = 0; ; attempt++) {
      if (requestedIntentEpoch !== this.lifecycleIntentEpoch || this._store.isDisposed) {
        throw new OpenCodeLifecycleCancelledError();
      }
      try {
        return await this.startInner(requestedIntentEpoch);
      } catch (error) {
        const delayMs = DATABASE_STARTUP_RETRY_DELAYS_MS[attempt];
        if (error instanceof OpenCodeLifecycleCancelledError || requestedIntentEpoch !== this.lifecycleIntentEpoch || this._store.isDisposed || delayMs === void 0 || !isOpenCodeDatabaseBusy(error, this._recentStderr)) {
          throw error;
        }
        this._startingUp = true;
        try {
          await killProcessGroupAndWaitForExit(this.process);
        } finally {
          this._startingUp = false;
        }
        this.process = null;
        this.cleanupConfigFile();
        this.logService.warn(
          `[opencode] Startup database is busy; retry=${attempt + 1}/${DATABASE_STARTUP_RETRY_DELAYS_MS.length}, delayMs=${delayMs}`
        );
        await new Promise((resolve2) => setTimeout(resolve2, delayMs));
      }
    }
  }
  async startManagedWithDatabase(requestedIntentEpoch) {
    if (requestedIntentEpoch !== this.lifecycleIntentEpoch || this._store.isDisposed) {
      throw new OpenCodeLifecycleCancelledError();
    }
    if (this.isRunning) {
      throw new Error("OpenCode is already running");
    }
    const startBlock = this.restartCircuit.assertCanStart(Date.now());
    if (startBlock) {
      const scope = this.restartCircuitScope;
      const err = new RestartCircuitBlockedError("startup", {
        scope,
        reason: startBlock.reason ?? "unknown",
        blockedUntilMs: startBlock.blockedUntilMs ?? Date.now()
      });
      this.logService.warn(`[opencode] ${err.message}`);
      this.emitRuntimeEvent({
        component: "opencode",
        event: "startup_blocked_global_circuit",
        severity: "warn",
        phase: "opencode_start",
        errorKind: startBlock.reason,
        attrs: {
          circuitScope: scope,
          retryCountInWindow: startBlock.retryCountInWindow,
          blockedUntilMs: startBlock.blockedUntilMs
        }
      });
      throw err;
    }
    try {
      return await this.startWithDatabaseRetry(requestedIntentEpoch);
    } catch (err) {
      this._startingUp = false;
      if (err instanceof OpenCodeLifecycleCancelledError || requestedIntentEpoch !== this.lifecycleIntentEpoch || this._store.isDisposed) {
        throw err instanceof OpenCodeLifecycleCancelledError ? err : new OpenCodeLifecycleCancelledError();
      }
      const startupKind = classifyOpenCodeErrorKind(
        err instanceof Error ? err.message : String(err),
        this._recentStderr
      );
      const startupBlock = this.restartCircuit.recordFailure(Date.now(), startupKind);
      const remedy = this.classifyStartupFailure(err);
      if (remedy && !this.stopping) {
        this.logService.warn(`[opencode] Startup failed (${remedy.reason}) — ${remedy.action}`);
        this.emitRuntimeEvent({
          component: "opencode",
          event: "startup_remediation",
          severity: "warn",
          phase: "opencode_start",
          port: this._port ?? void 0,
          errorKind: startupKind,
          remediationAction: remedy.reason
        });
        remedy.remediate();
        this.cleanupConfigFile();
        await killProcessGroupAndWaitForExit(this.process);
        this.process = null;
        if (remedy.freshPort) this._port = null;
        try {
          const url = await this.startWithDatabaseRetry(requestedIntentEpoch);
          this.emitRuntimeEvent({
            component: "opencode",
            event: "startup_remediation_succeeded",
            severity: "info",
            phase: "opencode_start",
            port: this._port ?? void 0,
            errorKind: startupKind,
            remediationAction: remedy.reason,
            remediationSucceeded: true
          });
          if (remedy.dbRebuilt) {
            this._onDidRebuildDatabase.fire({ atMs: Date.now() });
          }
          return url;
        } catch (retryErr) {
          this._startingUp = false;
          this.cleanupConfigFile();
          this.emitRuntimeEvent({
            component: "opencode",
            event: "startup_failed",
            severity: "error",
            phase: "opencode_start",
            port: this._port ?? void 0,
            errorKind: classifyOpenCodeErrorKind(
              retryErr instanceof Error ? retryErr.message : String(retryErr),
              this._recentStderr
            ),
            remediationAction: remedy.reason,
            remediationSucceeded: false,
            attrs: startupBlock ? {
              circuitReason: startupBlock.reason,
              blockedUntilMs: startupBlock.blockedUntilMs
            } : void 0
          });
          throw retryErr;
        }
      }
      this.cleanupConfigFile();
      this.emitRuntimeEvent({
        component: "opencode",
        event: "startup_failed",
        severity: "error",
        phase: "opencode_start",
        port: this._port ?? void 0,
        errorKind: startupKind,
        attrs: startupBlock ? {
          circuitReason: startupBlock.reason,
          blockedUntilMs: startupBlock.blockedUntilMs
        } : void 0
      });
      throw err;
    }
  }
  /**
   * Classify a startup failure and return a remediation descriptor, or null
   * if the error is not retriable.
   *
   * Adding a new retriable error class: append a branch that returns
   * { reason, action, remediate(), freshPort }.
   */
  classifyStartupFailure(err) {
    const errMsg = err instanceof Error ? err.message : "";
    if (errMsg.includes(HEALTH_NO_RETRY_MARKER)) {
      return null;
    }
    const brokenConfigPath = this.extractBrokenConfigPath(this._recentStderr);
    if (brokenConfigPath) {
      return {
        reason: "broken user config",
        action: `backing up ${brokenConfigPath} and retrying`,
        remediate: () => this.backupBrokenConfigFile(brokenConfigPath),
        freshPort: true
      };
    }
    const dbPath = this.config.opencodeDbPath;
    const dbRemedy = planDbSchemaMismatchRemediation({
      // Same view classifyOpenCodeErrorKind gets: the early-exit message
      // embeds the stderr tail, and the raw lines are appended for the paths
      // where the message alone carries no signal.
      stderrText: `${errMsg}
${this._recentStderr.join("\n")}`,
      dbPath,
      nowMs: Date.now(),
      lastQuarantineAtMs: lastDbQuarantineAtMs
    });
    if (dbRemedy === "unconfigured") {
      this.logService.warn(
        "[opencode] Database schema mismatch detected but opencodeDbPath is not configured — cannot self-heal"
      );
      return null;
    }
    if (dbRemedy === "retry-only") {
      return {
        reason: "db schema mismatch (recently quarantined)",
        action: "retrying against the rebuilt database",
        remediate: () => {
        },
        freshPort: true,
        // Another workspace quarantined the shared db — this workspace's
        // history is equally gone, so it must be notified on success too.
        dbRebuilt: true
      };
    }
    if (dbRemedy === "quarantine" && dbPath) {
      return {
        reason: "db schema mismatch",
        action: `quarantining ${dbPath} and retrying`,
        remediate: () => {
          lastDbQuarantineAtMs = Date.now();
          const moved = quarantineOpenCodeDatabase({
            dbPath,
            timestamp: lastDbQuarantineAtMs,
            log: this.logService
          });
          if (moved.length === 0) {
            this.logService.error(
              "[opencode] Database quarantine made no changes; preserving the existing database"
            );
          } else {
            this.logService.warn(
              `[opencode] Quarantined ${moved.length} database file(s) after a schema mismatch — conversation history has been reset for this installation`
            );
          }
        },
        freshPort: true,
        dbRebuilt: true
      };
    }
    const isHealthFailure = errMsg.includes("failed to become healthy");
    if (isHealthFailure) {
      const isPortConflict = /fetch failed|ECONNREFUSED|ECONNRESET/.test(errMsg);
      const isTimeout = /operation was aborted|AbortError/.test(errMsg);
      if (isPortConflict || isTimeout) {
        return {
          reason: isPortConflict ? "port conflict" : "timeout",
          action: "retrying",
          remediate: () => {
          },
          freshPort: isPortConflict
        };
      }
    }
    return null;
  }
  async startInner(requestedIntentEpoch) {
    const windowsVersion = await assertOSVersionPreflight();
    if (requestedIntentEpoch !== this.lifecycleIntentEpoch || this._store.isDisposed) {
      throw new OpenCodeLifecycleCancelledError();
    }
    if (windowsVersion?.source === "cim" && windowsVersion.reportedRelease !== windowsVersion.effectiveRelease) {
      this.logService.warn(
        `[opencode] Windows version corrected by CIM: reported=${windowsVersion.reportedRelease} effective=${windowsVersion.effectiveRelease}`
      );
    }
    this.ensureBinaryExists();
    const cwd = this._workingDirectory ?? process.cwd();
    assertWorkingDirectoryPreflight(cwd);
    this.stopping = false;
    this._startingUp = true;
    this._earlyExit = null;
    this._spawnError = null;
    this._serverListening = false;
    this._recentStderr = [];
    this._pluginInitSeen = false;
    this.clearInstanceReadinessCheck();
    this._instanceReadiness = { status: "unknown" };
    const generation = ++this.processGeneration;
    const port = this.config.port ?? this._port ?? await this.findFreePort();
    if (requestedIntentEpoch !== this.lifecycleIntentEpoch || this.stopping) {
      throw new OpenCodeLifecycleCancelledError();
    }
    this._port = port;
    this._url = `http://${this.config.hostname}:${port}`;
    this.emitRuntimeEvent({
      component: "opencode",
      event: "spawn_start",
      severity: "info",
      phase: "opencode_start",
      port,
      attrs: { processGeneration: generation }
    });
    const { binaryPath: binaryPath2, hostname, verbose } = this.config;
    const args = ["serve", "--hostname", hostname, "--port", String(port)];
    if (verbose) {
      args.push("--print-logs", "--log-level", "DEBUG");
    }
    if (this.config.cors?.length) {
      for (const origin of this.config.cors) {
        args.push("--cors", origin);
      }
    }
    const baseSpawnEnv = this.buildBaseSpawnEnv();
    const spawnEnv = {
      ...baseSpawnEnv,
      OPENCODE_CLIENT: "hilo-agent",
      OPENCODE_ENABLE_QUESTION_TOOL: "true",
      OPENCODE_SERVER_USERNAME: this.openCodeCredentials.username,
      OPENCODE_SERVER_PASSWORD: this.openCodeCredentials.password
    };
    Object.assign(spawnEnv, this.config.env);
    const hubCliBinDir = resolveHubCliBinDir();
    if (fs$1.existsSync(hubCliBinDir)) {
      prependBundledBinaryDirectory(spawnEnv, path.join(hubCliBinDir, "shim"));
    }
    prependBundledBinaryDirectory(spawnEnv, binaryPath2);
    const resolvedRipgrepPath = resolveExecutableFromPath(
      spawnEnv,
      process.platform === "win32" ? "rg.exe" : "rg"
    );
    if (resolvedRipgrepPath) {
      this.logService.info(`[opencode] child PATH resolves ripgrep to: ${resolvedRipgrepPath}`);
    } else {
      this.logService.warn(
        "[opencode] ripgrep is missing from the child PATH; OpenCode may attempt a runtime download"
      );
    }
    applyChildProcessProxyMode(
      spawnEnv,
      this.config.getNetworkProxyMode?.() ?? this.config.networkProxyMode ?? "auto"
    );
    const strippedProxyEnv = stripBunUnsupportedProxyEnv(spawnEnv);
    if (strippedProxyEnv.length > 0) {
      this.logService.warn(
        `[opencode] Stripped proxy env unsupported by the Bun runtime; OpenCode will connect directly: ${strippedProxyEnv.join(", ")}`
      );
    }
    this.externalizeConfigToFile(spawnEnv);
    ensureOpenCodeDependencySatisfied(
      [
        spawnEnv[ENV_OPENCODE_CONFIG_DIR],
        spawnEnv.XDG_CONFIG_HOME ? path.join(spawnEnv.XDG_CONFIG_HOME, "opencode") : void 0
      ],
      this.logService
    );
    if (process.platform === "win32") {
      trimWindowsEnvBlock(spawnEnv, this.logService);
    }
    const envBlockSize = Object.entries(spawnEnv).reduce(
      (sum, [k, v]) => sum + k.length + (v?.length ?? 0) + 2,
      0
    );
    if (verbose) {
      this.logService.info(`[opencode] binary: ${binaryPath2}`);
      this.logService.info(`[opencode] args:   ${args.join(" ")}`);
      this.logService.info(`[opencode] cwd:    ${cwd}`);
      this.logService.info(`[opencode] env block: ${envBlockSize} bytes`);
    } else {
      this.logService.info(
        `[opencode] Starting generation=${generation} at port ${port} from ${binaryPath2} (cwd: ${cwd}, env: ${envBlockSize}B)`
      );
    }
    if (envBlockSize > 3e4) {
      this.logService.warn(
        `[opencode] env block size ${envBlockSize} is large — may cause issues on Windows`
      );
    }
    const spawnBinaryPath = resolveSpawnPath(binaryPath2, this.logService);
    const spawnCwd = resolveSpawnPath(cwd, this.logService);
    this.runningWorkingDirectory = fs$1.realpathSync.native(cwd);
    this.process = spawn(spawnBinaryPath, args, {
      env: spawnEnv,
      stdio: ["ignore", "pipe", "pipe"],
      cwd: spawnCwd,
      detached: process.platform !== "win32",
      windowsHide: true
    });
    if (this.process.pid) {
      this.emitRuntimeEvent({
        component: "opencode",
        event: "spawned",
        severity: "info",
        phase: "opencode_start",
        port,
        pid: this.process.pid,
        attrs: { processGeneration: generation }
      });
    }
    if (verbose) {
      this.logService.info(`[opencode] pid:    ${this.process.pid}`);
    }
    const spawnedProcess = this.process;
    spawnedProcess.stdout?.on("data", (data) => {
      if (this.process !== spawnedProcess) return;
      const text = data.toString().trim();
      this.maybeMarkServerListening(text);
      if (text.includes("[hilo-plugin] initialized")) {
        this._pluginInitSeen = true;
      }
      this.logService.info(`[opencode] ${text}`);
    });
    spawnedProcess.stderr?.on("data", (data) => {
      if (this.process !== spawnedProcess) return;
      const text = data.toString().trim();
      if (!text) return;
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        this.maybeMarkServerListening(trimmed);
        if (trimmed.includes("[hilo-plugin] initialized")) {
          this._pluginInitSeen = true;
        }
        this._recentStderr.push(trimmed);
        if (this._recentStderr.length > MAX_STDERR_DIAGNOSTIC_LINES) this._recentStderr.shift();
        this.routeOpenCodeLog(trimmed);
      }
    });
    spawnedProcess.on("exit", (code, signal) => {
      if (this.process !== spawnedProcess) {
        this.logService.debug(
          `[opencode] Ignoring stale process exit: generation=${generation}, currentGeneration=${this.processGeneration}, pid=${spawnedProcess.pid ?? "unknown"}, code=${code}, signal=${signal}`
        );
        return;
      }
      const windowsExit = process.platform === "win32" ? classifyWindowsProcessExit(code) : void 0;
      const externallyTerminated = windowsExit?.startupErrorKind === "windows_runtime_terminated";
      const unexpected = !this.stopping && code !== 0 && !externallyTerminated;
      if (unexpected) {
        this.logService.error(
          `[opencode] Process exited UNEXPECTEDLY: generation=${generation}, pid=${spawnedProcess.pid ?? "unknown"}, code=${code}, signal=${signal}${describeExitCode(code)}${this.buildStderrSnippet()}`
        );
      } else if (externallyTerminated && !this.stopping) {
        this.logService.warn(
          `[opencode] Process terminated externally: generation=${generation}, pid=${spawnedProcess.pid ?? "unknown"}, code=${code}, signal=${signal}${describeExitCode(code)}`
        );
      } else {
        this.logService.info(
          `[opencode] Process exited: generation=${generation}, pid=${spawnedProcess.pid ?? "unknown"}, code=${code}, signal=${signal}`
        );
      }
      this.clearRestartCountStableReset();
      if (unexpected && killProcessGroup(spawnedProcess.pid, "SIGKILL")) {
        this.logService.warn("[opencode] Cleaned up process group after unexpected exit");
      }
      if (!this.stopping) {
        this._earlyExit = { code, signal };
      }
      this.process = null;
      this._onDidExit.fire({ code, signal });
      this.emitRuntimeEvent({
        component: "opencode",
        event: "process_exit",
        severity: this.stopping || code === 0 ? "info" : externallyTerminated ? "warn" : "error",
        phase: "runtime_crash",
        port: this._port ?? void 0,
        exitCode: code,
        signal,
        errorKind: unexpected ? windowsExit?.startupErrorKind ?? "unexpected_exit" : externallyTerminated ? "windows_runtime_terminated" : void 0
      });
      if (!this.stopping && !this._startingUp && windowsExit?.shouldAutoRestart !== false) {
        this.handleUnexpectedExit();
      } else if (!this.stopping && !this._startingUp && windowsExit) {
        this._onDidError.fire(
          new Error(
            `AI service process exited with code ${code}; automatic restart was suppressed.` + formatWindowsProcessExit(windowsExit)
          )
        );
      }
    });
    spawnedProcess.on("error", (err) => {
      if (this.process !== spawnedProcess) {
        this.logService.debug(
          `[opencode] Ignoring stale process error: generation=${generation}, currentGeneration=${this.processGeneration}, pid=${spawnedProcess.pid ?? "unknown"}, error=${err.message}`
        );
        return;
      }
      this.logService.error(`[opencode] Failed to start process: ${err.message}`);
      this._spawnError = err;
      this.emitRuntimeEvent({
        component: "opencode",
        event: "spawn_error",
        severity: "error",
        phase: "opencode_start",
        port: this._port ?? void 0,
        errorKind: classifyOpenCodeErrorKind(err.message, this._recentStderr)
      });
      this.process = null;
      this._onDidError.fire(err);
    });
    try {
      await this.waitForHealthy();
      this.throwIfStartupProcessUnavailable();
    } finally {
      this._startingUp = false;
    }
    this.scheduleRestartCountStableReset();
    this.logService.info(`[opencode] Healthy at ${this._url}`);
    this.emitRuntimeEvent({
      component: "opencode",
      event: "health_ready",
      severity: "info",
      phase: "opencode_start",
      port
    });
    this.startInstanceReadinessCheck(port, generation);
    this._onDidReady.fire(this._url);
    return this._url;
  }
  stop() {
    const hasPendingStartForCurrentEpoch = this.startPromise !== null && this.startPromiseEpoch === this.lifecycleIntentEpoch || this.restartPromise !== null && this.restartPromiseEpoch === this.lifecycleIntentEpoch;
    if (this.stopPromise && this.stopPromiseEpoch === this.lifecycleIntentEpoch && !hasPendingStartForCurrentEpoch) {
      return this.stopPromise;
    }
    const requestedIntentEpoch = ++this.lifecycleIntentEpoch;
    this.stopping = true;
    const operation = this.enqueueLifecycle(() => this.stopManaged());
    let tracked;
    tracked = operation.then(
      () => {
        if (this.stopPromise === tracked) this.stopPromise = null;
      },
      (err) => {
        if (this.stopPromise === tracked) this.stopPromise = null;
        throw err;
      }
    );
    this.stopPromise = tracked;
    this.stopPromiseEpoch = requestedIntentEpoch;
    return tracked;
  }
  async stopManaged() {
    this.clearInstanceReadinessCheck();
    if (this._pluginCheckTimer) {
      clearTimeout(this._pluginCheckTimer);
      this._pluginCheckTimer = null;
    }
    if (!this.process) {
      this.cleanupConfigFile();
      return;
    }
    this.stopping = true;
    this.clearRestartCountStableReset();
    this.logService.info("[opencode] Stopping...");
    const proc = this.process;
    const generation = this.processGeneration;
    let rootExited = proc.exitCode !== null || proc.signalCode !== null;
    const graceMs = process.platform === "win32" ? 1e3 : 5e3;
    const childExit = createChildProcessExitWait(proc, graceMs);
    proc.once("exit", (code, signal) => {
      rootExited = true;
      this.logService.info(
        `[opencode] Stop observed exit: generation=${generation}, pid=${proc.pid ?? "unknown"}, code=${code ?? "null"}, signal=${signal ?? "null"}`
      );
    });
    const groupKillSent = killProcessGroup(proc.pid, "SIGTERM");
    if (groupKillSent) {
      const exited = await waitForProcessGroupExit(proc.pid, graceMs);
      let childExitObserved2;
      if (!exited) {
        this.logService.warn("[opencode] Process group did not exit in time, force-killing...");
        const forceChildExit = createChildProcessExitWait(proc, 1e3);
        const groupKillDelivered = killProcessGroup(proc.pid, "SIGKILL");
        const forceKillDelivered = groupKillDelivered || platformKill(proc, "SIGKILL");
        const forceExited = await waitForProcessGroupExit(proc.pid, 1e3);
        childExit.cancel();
        childExitObserved2 = await forceChildExit.promise;
        if (!forceExited && process.env.HILO_HEADLESS === "1") {
          if ((rootExited || childExitObserved2) && groupKillDelivered) {
            this.logService.warn(
              "[opencode] Process group remains observable after SIGKILL, but the root exited; treating it as non-running zombie residue"
            );
          } else {
            const detail = forceKillDelivered ? "root process did not exit" : "SIGKILL could not be delivered";
            throw new Error(
              `[opencode] OpenCode process group still alive after SIGKILL (${detail})`
            );
          }
        }
      } else {
        childExitObserved2 = await childExit.promise;
      }
      if (!childExitObserved2) {
        this.logService.warn(
          `[opencode] ChildProcess exit event timeout: generation=${generation}, pid=${proc.pid ?? "unknown"}, timeoutMs=${graceMs}`
        );
      }
      if (this.process === proc) this.process = null;
      this.cleanupConfigFile();
      return;
    }
    platformKill(proc, "SIGTERM");
    const childExitObserved = await childExit.promise;
    if (!childExitObserved) {
      this.logService.warn(
        `[opencode] ChildProcess exit event timeout; force-killing: generation=${generation}, pid=${proc.pid ?? "unknown"}, timeoutMs=${graceMs}`
      );
      const forceChildExit = createChildProcessExitWait(proc, 1e3);
      platformKill(proc, "SIGKILL");
      await forceChildExit.promise;
    }
    if (this.process === proc) this.process = null;
    this.cleanupConfigFile();
  }
  restart() {
    if (this.restartPromise && this.restartPromiseEpoch === this.lifecycleIntentEpoch) {
      return this.restartPromise;
    }
    const requestedIntentEpoch = ++this.lifecycleIntentEpoch;
    this.stopping = true;
    const operation = this.enqueueLifecycle(async () => {
      await this.stopManaged();
      this._port = null;
      return this.startManaged(requestedIntentEpoch);
    });
    let tracked;
    tracked = operation.then(
      (url) => {
        if (this.restartPromise === tracked) this.restartPromise = null;
        return url;
      },
      (err) => {
        if (this.restartPromise === tracked) this.restartPromise = null;
        throw err;
      }
    );
    this.restartPromise = tracked;
    this.restartPromiseEpoch = requestedIntentEpoch;
    return tracked;
  }
  /**
   * Accumulate env overrides and restart. If a restart is already in progress,
   * the new env is merged and the caller waits for the current cycle to finish.
   * After the in-flight restart completes, exactly ONE winner drains the
   * accumulated env and performs a follow-up restart; other waiters receive the
   * resulting URL without triggering redundant restarts.
   */
  async updateEnvAndRestart(env) {
    if (Object.keys(env).length > 0) {
      this._pendingEnv = { ...this._pendingEnv, ...env };
    }
    while (this._pendingRestartPromise || this.restartPromise) {
      const inFlightRestart = this._pendingRestartPromise ?? this.restartPromise;
      try {
        await inFlightRestart;
      } catch {
      }
    }
    if (this._pendingEnv) {
      this.config = { ...this.config, env: { ...this.config.env, ...this._pendingEnv } };
      this._pendingEnv = null;
      this.logService.info("[opencode] Env updated, restarting...");
      const promise = this.restart();
      this._pendingRestartPromise = promise;
      try {
        return await promise;
      } finally {
        if (this._pendingRestartPromise === promise) {
          this._pendingRestartPromise = null;
        }
      }
    }
    if (!this._url) {
      throw new Error(
        "[opencode] No URL available after concurrent restart — this should not happen"
      );
    }
    return this._url;
  }
  /**
   * No-op kill path by design — see BundleHandle for the single owner.
   *
   * Why: when this manager lives in a per-workspace child DI container alongside
   * BundleHandle, `InstantiationService.dispose()` walks services in insertion
   * order — OpenCodeManager is constructed BEFORE BundleHandle, so a naive
   * SIGTERM here would race the BundleHandle.dispose() chain that requires
   * OpenCode stop to finish before gateway stop. Routing all kill paths through
   * BundleHandle.dispose() -> this.stop() ensures the correct order.
   *
   * Timer + temp-config cleanup is retained — those are non-process state that
   * is safe (and necessary) to release during DI cascade.
   */
  dispose() {
    this.stopping = true;
    this.clearInstanceReadinessCheck();
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this._pluginCheckTimer) {
      clearTimeout(this._pluginCheckTimer);
      this._pluginCheckTimer = null;
    }
    this.clearRestartCountStableReset();
    this.cleanupConfigFile();
    if (this.restartCircuitWorkspaceKey) {
      globalOpenCodeRestartCircuitRegistry.delete(this.restartCircuitWorkspaceKey);
    }
    super.dispose();
  }
  // ---- private ----
  /**
   * Validates the binary exists, isn't corrupted, and has the correct format.
   * Covers: missing binary, quarantined by antivirus, corrupt download, wrong platform.
   * Skips validation after the first successful check (binary won't change at runtime).
   */
  ensureBinaryExists() {
    if (this._binaryValidated) return;
    const { binaryPath: binaryPath2 } = this.config;
    if (!fs$1.existsSync(binaryPath2)) {
      throw new Error(
        `OpenCode binary not found at: ${binaryPath2}
Run \`pnpm opencode:ensure\` to download it, or check SKIP_OPENCODE_DOWNLOAD is not set.`
      );
    }
    if (this.config.binaryIntegrityFailure) {
      throw new Error(
        "[windows_binary_incompatible] OpenCode binary does not match the packaged Windows runtime manifest."
      );
    }
    let stat;
    try {
      stat = fs$1.statSync(binaryPath2);
    } catch (err) {
      throw new Error(
        `Cannot read OpenCode binary at: ${binaryPath2}
${err instanceof Error ? err.message : String(err)}`
      );
    }
    if (stat.size < MIN_OPENCODE_BINARY_SIZE_BYTES) {
      throw new Error(
        `OpenCode binary at ${binaryPath2} is suspiciously small (${stat.size} bytes).
The installed file is incomplete or corrupted. Reinstall MiniMax Hub.`
      );
    }
    if (process.platform === "win32") {
      let inspection;
      try {
        inspection = inspectWindowsPeFile(binaryPath2);
      } catch (err) {
        throw new Error(
          `Cannot read OpenCode binary at: ${binaryPath2}
${err instanceof Error ? err.message : String(err)}`
        );
      }
      if (!inspection.valid || inspection.machine !== "x64") {
        throw new Error(
          `[windows_binary_incompatible] OpenCode binary failed PE validation at ${binaryPath2}. Expected machine=x64; actual=${inspection.machine ?? "invalid"}; reason=${inspection.reason ?? "machine_mismatch"}.`
        );
      }
    } else if (process.platform === "darwin") {
      let fileDescriptor;
      try {
        fileDescriptor = fs$1.openSync(binaryPath2, "r");
        const header = Buffer.alloc(4);
        fs$1.readSync(fileDescriptor, header, 0, 4, 0);
        const magic = header.readUInt32BE(0);
        const validMachO = [4277009102, 4277009103, 3405691582, 3489328638, 3472551422];
        if (!validMachO.includes(magic)) {
          throw new Error(
            `OpenCode binary at ${binaryPath2} is not a valid macOS executable (bad Mach-O header).
The installed file is incomplete or corrupted. Reinstall MiniMax Hub.`
          );
        }
      } finally {
        if (fileDescriptor !== void 0) fs$1.closeSync(fileDescriptor);
      }
    }
    if (binaryPath2.includes(" ")) {
      this.logService.info(
        `[opencode] Binary path contains spaces: "${binaryPath2}" — this is usually fine but noted for diagnostics`
      );
    }
    const cwd = this._workingDirectory ?? process.cwd();
    if (cwd.includes(" ")) {
      this.logService.info(
        `[opencode] Working directory contains spaces: "${cwd}" — this is usually fine but noted for diagnostics`
      );
    }
    this._binaryValidated = true;
  }
  findFreePort() {
    return new Promise((resolve2, reject) => {
      const server = net.createServer();
      server.listen(0, this.config.hostname, () => {
        const addr = server.address();
        if (!addr || typeof addr === "string") {
          server.close();
          reject(new Error("Failed to get address"));
          return;
        }
        const port = addr.port;
        server.close(() => resolve2(port));
      });
      server.on("error", reject);
    });
  }
  buildStderrSnippet() {
    if (!this._recentStderr.length) return "";
    return `
Stderr:
${this._recentStderr.join("\n")}`;
  }
  maybeMarkServerListening(text) {
    if (this._serverListening || !text) return;
    if (HEALTH_SERVER_LISTENING_PATTERN.test(text)) {
      this._serverListening = true;
    }
  }
  async waitForHealthy() {
    const { healthCheckTimeout, healthCheckInterval } = this.config;
    const softTimeout = effectiveHealthTimeout(healthCheckTimeout);
    const hardTimeout = PROGRESS_AWARE_HEALTH_ENABLED ? hardHealthTimeoutMs(softTimeout) : softTimeout;
    const start = Date.now();
    const softDeadline = start + softTimeout;
    const hardDeadline = start + hardTimeout;
    const healthUrl = resolveOpenCodeHealthUrl(this._url);
    let lastHealthError = null;
    this.logService.debug(`[opencode] Probing health endpoint ${OPENCODE_HEALTH_PATH}`);
    while (shouldContinueHealthWait({
      nowMs: Date.now(),
      softDeadlineMs: softDeadline,
      hardDeadlineMs: hardDeadline,
      processAlive: this.process !== null && this._earlyExit === null,
      serverListening: this._serverListening
    })) {
      this.throwIfStartupProcessUnavailable();
      const healthResult = await probeOpenCodeHealth(
        healthUrl,
        this.authHeader,
        AbortSignal.timeout(2e3)
      );
      if (healthResult === true) return;
      lastHealthError = healthResult;
      await new Promise((r) => setTimeout(r, healthCheckInterval));
    }
    this.throwIfStartupProcessUnavailable();
    const progressedButStuck = PROGRESS_AWARE_HEALTH_ENABLED && this._serverListening;
    const waitedMs = Date.now() - start;
    await killProcessGroupAndWaitForExit(this.process);
    this.process = null;
    const endpointHint = `
Health endpoint: ${OPENCODE_HEALTH_PATH}`;
    const errorHint = lastHealthError ? `
Last health error: ${lastHealthError}` : "";
    const progressNote = progressedButStuck ? ` (server started listening but never served health within ${hardTimeout}ms) ${HEALTH_NO_RETRY_MARKER}` : " (server never started listening)";
    throw new Error(
      `OpenCode failed to become healthy within ${waitedMs}ms${progressNote}${endpointHint}${errorHint}${this.buildStderrSnippet()}`
    );
  }
  throwIfStartupProcessUnavailable() {
    if (this.stopping) {
      throw new OpenCodeLifecycleCancelledError();
    }
    if (this._earlyExit) {
      const hint = describeExitCode(this._earlyExit.code);
      throw new Error(
        `AI service process exited with code ${this._earlyExit.code} (signal: ${this._earlyExit.signal}) before becoming healthy${hint}${this.buildStderrSnippet()}`
      );
    }
    if (this.process === null) {
      const reason = this._spawnError ? `: ${this._spawnError.message}` : "";
      const hint = this._spawnError ? describeSpawnError(this._spawnError) : "";
      throw new Error(`AI service failed to start${reason}${hint}${this.buildStderrSnippet()}`);
    }
  }
  /**
   * Scan recent stderr lines for OpenCode's config-file parse error pattern.
   * Returns the absolute path of the broken config file, or null if the error
   * is unrelated to config parsing.
   *
   * Example stderr:
   *   "Error: Config file at C:\Users\Wan\.config\opencode\opencode.json is not valid JSON(C):"
   */
  extractBrokenConfigPath(stderrLines) {
    for (const line of stderrLines) {
      const m2 = line.match(/Config file at (.+?) is not valid JSON/);
      if (m2) return m2[1].trim();
    }
    return null;
  }
  /**
   * Back up a broken user config file so OpenCode can start cleanly.
   * The file is renamed to `<original>.broken-<timestamp>` so the user
   * can inspect and fix it later.
   */
  backupBrokenConfigFile(filePath) {
    try {
      if (!fs$1.existsSync(filePath)) return;
      const backupPath = `${filePath}.broken-${Date.now()}`;
      fs$1.renameSync(filePath, backupPath);
      this.logService.info(`[opencode] Backed up broken config: ${filePath} → ${backupPath}`);
    } catch (err) {
      this.logService.warn(
        `[opencode] Failed to back up broken config at ${filePath}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  buildBaseSpawnEnv() {
    return buildOpenCodeBaseSpawnEnv();
  }
  /**
   * Move OPENCODE_CONFIG_CONTENT from env to a temp file, replacing it with
   * OPENCODE_CONFIG (file path). Shrinks env block by 10-20KB.
   */
  externalizeConfigToFile(env) {
    this.customMcpInheritedEnvKeys = Object.keys(env);
    const rawContent = this.customMcpConfigOverrides.apply(env.OPENCODE_CONFIG_CONTENT);
    if (!rawContent) return;
    const content = isolateCustomMcpConfigContent(rawContent, this.customMcpInheritedEnvKeys);
    this.cleanupConfigFile();
    const configPath = path.join(
      os$1.tmpdir(),
      `hilo-opencode-config-${process.pid}-${crypto.randomUUID()}.json`
    );
    fs$1.writeFileSync(configPath, content, { encoding: "utf-8", mode: 384 });
    this._configFilePath = configPath;
    delete env.OPENCODE_CONFIG_CONTENT;
    env.OPENCODE_CONFIG = configPath;
    this.logService.info(
      `[opencode] Config externalized to file (${content.length}B → ${configPath})`
    );
  }
  cleanupConfigFile() {
    if (!this._configFilePath) return;
    try {
      fs$1.unlinkSync(this._configFilePath);
    } catch {
    }
    this._configFilePath = null;
  }
  /**
   * After OpenCode becomes healthy, verify the hilo plugin actually loaded.
   *
   * OpenCode has a known bug where crash-restart (exit code 1 → auto respawn)
   * sometimes fails to load plugins despite the config containing the correct
   * plugin path. When this happens, ALL session/billing context injection is
   * absent, causing REQUEST_GROUP_UNAVAILABLE for every billable tool call.
   *
   * Detection only — no automatic restart. The plugin prints
   * `[hilo-plugin] initialized` to stderr/stdout on load. Because OpenCode
   * initializes project plugins lazily, verification starts only after the
   * instance readiness probe settles (first `ready` verdict, or the re-probe
   * budget spent); a short grace covers stdout delivery. If the marker is
   * still absent, we emit observable telemetry. Layer 2 (mcp-tools
   * gateway fallback) handles billing scope recovery at tool call time.
   *
   * Why not auto-restart: a restart may kill an active chat/generation turn,
   * and the OpenCode plugin bug is not reliably fixed by a single restart.
   * Keeping this as detection-only avoids expanding the blast radius while
   * still giving us telemetry to track the underlying OpenCode issue.
   */
  _pluginCheckTimer = null;
  schedulePluginLoadCheck(port, generation) {
    if (this._pluginCheckTimer) clearTimeout(this._pluginCheckTimer);
    this._pluginCheckTimer = setTimeout(() => {
      this._pluginCheckTimer = null;
      if (this.stopping || !this.process || generation !== this.processGeneration || this._pluginInitSeen) {
        return;
      }
      this.logService.warn(
        "[opencode] hilo plugin did NOT initialize after project warmup — billable tool calls will use gateway-level billing scope fallback (Layer 2)."
      );
      this.emitRuntimeEvent({
        component: "opencode",
        event: "plugin_load_failure",
        severity: "warn",
        phase: "opencode_start",
        port,
        errorKind: "plugin_not_loaded",
        remediationAction: "gateway_fallback"
      });
    }, PLUGIN_MARKER_GRACE_MS);
  }
  /**
   * Probe project-instance readiness, then verify the plugin.
   *
   * Deliberately fire-and-forget: `startInner` must not block workspace bind
   * on this, because a cold shell that is visible and marked starting beats a
   * workspace that stays invisible while a probe runs.
   *
   * Deliberately non-destructive: a `degraded` result records telemetry and
   * nothing else. Restarting here would violate the runtime lifecycle
   * contract (§2, and the health/liveness recovery row of §6.1) — a single
   * probe failure is not evidence, and a restart can kill a live turn. The
   * value delivered is the signal itself: before this, a stalled instance was
   * indistinguishable from an idle one.
   *
   * A `degraded` verdict is re-probed on a bounded schedule
   * ({@link INSTANCE_READINESS_MAX_PROBES} attempts,
   * {@link INSTANCE_READINESS_REPROBE_DELAY_MS} apart) so an instance that
   * recovers after a slow bootstrap is reported as `ready` again instead of
   * staying `degraded` in diagnostics for the rest of the process lifetime.
   * The re-probe only ever observes — it never stops, restarts or unmounts
   * anything, and it stops re-arming once the verdict is `ready`, on stop /
   * dispose / respawn, or when the attempt budget is spent.
   *
   * The probe holds no user work and is aborted on stop/dispose/respawn, so
   * it is not an activity source under §3.1.
   */
  startInstanceReadinessCheck(port, generation) {
    this.clearInstanceReadinessCheck();
    this.runInstanceReadinessProbe(port, generation, 1);
  }
  runInstanceReadinessProbe(port, generation, attempt) {
    const baseUrl = this._url;
    const directory = this._workingDirectory;
    if (!baseUrl || !directory) {
      if (attempt === 1) this.schedulePluginLoadCheck(port, generation);
      return;
    }
    const controller = new AbortController();
    this._instanceReadinessAbort = controller;
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(INSTANCE_READINESS_TIMEOUT_MS)
    ]);
    const startedAt = Date.now();
    void probeOpenCodeInstanceReady(baseUrl, directory, this.authHeader, signal).then((result) => {
      if (controller.signal.aborted || this.stopping || generation !== this.processGeneration) {
        return;
      }
      this._instanceReadinessAbort = null;
      const durationMs = Date.now() - startedAt;
      const observedAt = (/* @__PURE__ */ new Date()).toISOString();
      if (result === true) {
        const recovered = this._instanceReadiness.status === "degraded";
        this._instanceReadiness = { status: "ready", durationMs, observedAt, probes: attempt };
        this.logService.info(
          recovered ? `[opencode] Project instance recovered — ready on probe ${attempt} in ${durationMs}ms` : `[opencode] Project instance ready in ${durationMs}ms`
        );
        this.emitRuntimeEvent({
          component: "opencode",
          event: "instance_ready",
          severity: "info",
          phase: "opencode_start",
          port,
          durationMs
        });
      } else {
        this._instanceReadiness = {
          status: "degraded",
          reason: result,
          durationMs,
          observedAt,
          probes: attempt
        };
        this.logService.warn(
          `[opencode] Project instance NOT ready after ${durationMs}ms (${result}, probe ${attempt}/${INSTANCE_READINESS_MAX_PROBES}). The process answers /global/health but project-scoped requests are blocked; session list and chat send will fail until it recovers. Workspace, canvas and chat history are left untouched.`
        );
        this.emitRuntimeEvent({
          component: "opencode",
          event: "instance_readiness_degraded",
          severity: "warn",
          phase: "opencode_start",
          port,
          durationMs,
          errorKind: "instance_not_ready",
          errorMessage: result
        });
        if (attempt < INSTANCE_READINESS_MAX_PROBES) {
          this._instanceReadinessTimer = setTimeout(() => {
            this._instanceReadinessTimer = null;
            if (this.stopping || generation !== this.processGeneration) return;
            this.runInstanceReadinessProbe(port, generation, attempt + 1);
          }, this._instanceReadinessReprobeDelayMs);
        }
      }
      if (result === true || attempt >= INSTANCE_READINESS_MAX_PROBES) {
        this.schedulePluginLoadCheck(port, generation);
      }
    });
  }
  clearInstanceReadinessCheck() {
    this._instanceReadinessAbort?.abort();
    this._instanceReadinessAbort = null;
    if (this._instanceReadinessTimer) {
      clearTimeout(this._instanceReadinessTimer);
      this._instanceReadinessTimer = null;
    }
  }
  scheduleRestartCountStableReset() {
    this.clearRestartCountStableReset();
    if (this.restartCount === 0) return;
    this.restartCountResetTimer = setTimeout(() => {
      this.restartCount = 0;
      this.restartCountResetTimer = null;
      this.logService.info("[opencode] Restart counter reset after stable runtime window");
      this.emitRuntimeEvent({
        component: "opencode",
        event: "restart_counter_reset",
        severity: "info",
        phase: "runtime_crash"
      });
    }, RESTART_STABLE_RESET_MS);
  }
  clearRestartCountStableReset() {
    if (!this.restartCountResetTimer) return;
    clearTimeout(this.restartCountResetTimer);
    this.restartCountResetTimer = null;
  }
  handleUnexpectedExit() {
    this.restartCount++;
    const errorKind = "unexpected_exit";
    if (this.restartCount > this.config.maxRestartAttempts) {
      const err = new Error(
        `AI service crashed ${this.restartCount} times, giving up auto-restart`
      );
      this.logService.error(`[opencode] ${err.message}`);
      this.emitRuntimeEvent({
        component: "opencode",
        event: "restart_exhausted",
        severity: "error",
        phase: "runtime_crash",
        port: this._port ?? void 0,
        retryCount: this.restartCount,
        errorKind
      });
      this._onDidError.fire(err);
      return;
    }
    const circuitDecision = this.restartCircuit.requestRestart(Date.now(), errorKind);
    if (!circuitDecision.allow) {
      const scope = this.restartCircuitScope;
      const err = new RestartCircuitBlockedError("auto-restart", {
        scope,
        reason: circuitDecision.reason ?? "unknown",
        blockedUntilMs: circuitDecision.blockedUntilMs ?? Date.now()
      });
      this.logService.warn(
        `[opencode] ${err.message} (retryCountInWindow=${circuitDecision.retryCountInWindow})`
      );
      this.emitRuntimeEvent({
        component: "opencode",
        event: "restart_blocked_global_circuit",
        severity: "warn",
        phase: "runtime_crash",
        port: this._port ?? void 0,
        retryCount: this.restartCount,
        errorKind: circuitDecision.reason,
        remediationAction: "quarantine_restart_storm",
        attrs: {
          circuitScope: scope,
          retryCountInWindow: circuitDecision.retryCountInWindow,
          blockedUntilMs: circuitDecision.blockedUntilMs
        }
      });
      this._onDidError.fire(err);
      return;
    }
    const delay2 = computeRestartDelayMs(this.restartCount, circuitDecision.delayMs);
    this.logService.warn(
      `[opencode] Unexpected exit, restarting in ${delay2}ms (attempt ${this.restartCount}/${this.config.maxRestartAttempts}, globalWindow=${circuitDecision.retryCountInWindow})...`
    );
    this.emitRuntimeEvent({
      component: "opencode",
      event: "restart_scheduled",
      severity: "warn",
      phase: "runtime_crash",
      port: this._port ?? void 0,
      retryCount: this.restartCount,
      errorKind,
      remediationAction: "restart_fresh_port",
      attrs: {
        globalRestartCountInWindow: circuitDecision.retryCountInWindow
      }
    });
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (this.stopping) return;
      this._port = null;
      this.start().catch((err) => {
        this.logService.error(
          `[opencode] Restart failed: ${err instanceof Error ? err.message : String(err)}`
        );
        const failureKind = classifyOpenCodeErrorKind(
          err instanceof Error ? err.message : String(err),
          this._recentStderr
        );
        const failureBlock = this.restartCircuit.recordFailure(Date.now(), failureKind);
        this.emitRuntimeEvent({
          component: "opencode",
          event: "restart_failed",
          severity: "error",
          phase: "runtime_crash",
          port: this._port ?? void 0,
          retryCount: this.restartCount,
          errorKind: failureKind,
          remediationAction: "restart_fresh_port",
          remediationSucceeded: false,
          attrs: failureBlock ? {
            circuitReason: failureBlock.reason,
            blockedUntilMs: failureBlock.blockedUntilMs
          } : void 0
        });
        this._onDidError.fire(err instanceof Error ? err : new Error(String(err)));
      });
    }, delay2);
  }
  /**
   * Parse OpenCode stderr log level and route to the appropriate log method.
   * OpenCode outputs structured logs to stderr in the format:
   *   "INFO  2026-04-09T07:58:02 +123ms service=mcp ..."
   *   "ERROR 2026-04-09T07:58:03 ..."
   *   "WARN  2026-04-09T07:58:03 ..."
   *   "DEBUG 2026-04-09T07:58:03 ..."
   */
  routeOpenCodeLog(line) {
    const tag = "[opencode] ";
    if (line.startsWith("ERROR") || line.includes(" ERROR ")) {
      this.logService.error(`${tag}${line}`);
    } else if (line.startsWith("WARN") || line.includes(" WARN ")) {
      this.logService.warn(`${tag}${line}`);
    } else if (line.startsWith("DEBUG") || line.includes(" DEBUG ")) {
      this.logService.debug(`${tag}${line}`);
    } else {
      this.logService.info(`${tag}${line}`);
    }
  }
  emitRuntimeEvent(event) {
    try {
      this.config.onRuntimeEvent?.({
        ...event,
        component: "opencode",
        timestamp: event.timestamp ?? (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logService.warn(`[opencode] onRuntimeEvent failed: ${message}`);
    }
  }
};
OpenCodeManager = __decorateClass([
  __decorateParam(1, ILogService)
], OpenCodeManager);
[
  ...WORKING_DIRECTORY_ERROR_KINDS,
  MACOS_VERSION_UNSUPPORTED_DIAGNOSIS_CODE,
  WINDOWS_VERSION_UNSUPPORTED_DIAGNOSIS_CODE,
  WINDOWS_VERSION_UNVERIFIED_DIAGNOSIS_CODE,
  "global_config_broken",
  "db_schema_mismatch",
  "binary_missing",
  "binary_blocked",
  "binary_corrupted",
  ...WINDOWS_PROCESS_STARTUP_ERROR_KINDS,
  "port_conflict",
  "proxy_tls",
  "proxy",
  "health_timeout",
  "early_exit",
  "unknown"
];
function classifyOpenCodeErrorKind(message, stderrLines = []) {
  const joined = `${message}
${stderrLines.join("\n")}`;
  for (const kind of WORKING_DIRECTORY_ERROR_KINDS) {
    if (joined.includes(kind)) return kind;
  }
  if (PATTERN_MACOS_VERSION_UNSUPPORTED.test(joined)) {
    return MACOS_VERSION_UNSUPPORTED_DIAGNOSIS_CODE;
  }
  if (PATTERN_WINDOWS_VERSION_UNSUPPORTED.test(joined)) {
    return WINDOWS_VERSION_UNSUPPORTED_DIAGNOSIS_CODE;
  }
  if (PATTERN_WINDOWS_VERSION_UNVERIFIED.test(joined)) {
    return WINDOWS_VERSION_UNVERIFIED_DIAGNOSIS_CODE;
  }
  if (PATTERN_WINDOWS_CPU_UNSUPPORTED.test(joined)) return "windows_cpu_unsupported";
  if (PATTERN_WINDOWS_RUNTIME_DEPENDENCY_FAILED.test(joined)) {
    return "windows_runtime_dependency_failed";
  }
  if (PATTERN_WINDOWS_BINARY_INCOMPATIBLE.test(joined)) return "windows_binary_incompatible";
  if (PATTERN_WINDOWS_RUNTIME_RESOURCE_EXHAUSTED.test(joined)) {
    return "windows_runtime_resource_exhausted";
  }
  if (PATTERN_WINDOWS_RUNTIME_TERMINATED.test(joined)) return "windows_runtime_terminated";
  if (PATTERN_CONFIG_JSON.test(joined)) return "global_config_broken";
  if (PATTERN_OPENCODE_DB_SCHEMA_MISMATCH.test(joined)) return "db_schema_mismatch";
  const windowsExit = classifyWindowsProcessExitMessage(joined);
  if (windowsExit) return windowsExit.startupErrorKind;
  if (/OpenCode binary not found/i.test(joined)) return "binary_missing";
  if (PATTERN_BINARY_MISSING.test(joined)) return "binary_missing";
  if (PATTERN_BINARY_BLOCKED.test(joined)) return "binary_blocked";
  if (PATTERN_BINARY_CORRUPTED.test(joined)) return "binary_corrupted";
  if (PATTERN_PORT_CONFLICT.test(joined)) return "port_conflict";
  if (PATTERN_TLS.test(joined)) return "proxy_tls";
  if (PATTERN_PROXY.test(joined)) return "proxy";
  if (PATTERN_TIMEOUT.test(joined)) return "health_timeout";
  if (/exited with code/i.test(joined)) return "early_exit";
  return "unknown";
}
function resolveAgentTimeoutEnv(remoteConfig) {
  return {
    [TOOL_CONFIRM_TIMEOUT_ENV]: String(resolveToolConfirmTimeoutMs(remoteConfig))
  };
}
function createAgentTimeoutEnvRegistry(getRemoteConfig) {
  const targets = /* @__PURE__ */ new Set();
  const apply = (target) => {
    Object.assign(target, resolveAgentTimeoutEnv(getRemoteConfig()));
  };
  return {
    register(target) {
      apply(target);
      targets.add(target);
    },
    refresh() {
      for (const target of targets) apply(target);
    }
  };
}
function canonicalizeWorkspace(p2) {
  let canonical = path__default.normalize(p2).replace(/[/\\]+$/, "");
  try {
    canonical = fs__default.realpathSync(canonical);
    canonical = canonical.replace(/[/\\]+$/, "");
  } catch {
  }
  if (process.platform === "darwin" || process.platform === "win32") {
    canonical = canonical.toLowerCase();
  }
  return canonical;
}
function delay(ms2) {
  return new Promise((resolve2) => {
    const t = setTimeout(resolve2, ms2);
    t.unref?.();
  });
}
function parseEnvDurationMs(raw) {
  if (raw === void 0 || raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
  return n;
}
function defaultTaskIdFactory() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `task_${rand}`;
}
const defaultWebSocketFactory = (url) => {
  const ctor = globalThis.WebSocket;
  if (typeof ctor !== "function") {
    throw new Error("global WebSocket constructor not found (Node 22+ required)");
  }
  return new ctor(url);
};
function parseServerMessage(raw) {
  if (typeof raw !== "string") {
    if (raw && typeof raw.toString === "function") {
      try {
        return parseServerMessage(raw.toString());
      } catch {
        return null;
      }
    }
    return null;
  }
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object" && typeof obj.type === "string") {
      return obj;
    }
    return null;
  } catch {
    return null;
  }
}
const DOWNLOAD_TIMEOUT_MS = 12e4;
const DOWNLOAD_MAX_BYTES = 200 * 1024 * 1024;
async function resolveAttachmentSources(workspaceDir, attachments, errorFactory, fetchImpl = fetch) {
  if (!attachments || attachments.length === 0) return void 0;
  const wsAbs = path__default.resolve(workspaceDir);
  const resolved = [];
  for (let i = 0; i < attachments.length; i++) {
    const att = attachments[i];
    if (!/^https?:\/\//i.test(att)) {
      resolved.push(att);
      continue;
    }
    let urlObj;
    try {
      urlObj = new URL(att);
    } catch {
      throw errorFactory(workspaceDir, `attachments[${i}]: invalid URL "${att}"`);
    }
    let resp;
    try {
      resp = await fetchImpl(att, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw errorFactory(workspaceDir, `attachments[${i}] download failed (${att}): ${message}`);
    }
    if (!resp.ok) {
      throw errorFactory(
        workspaceDir,
        `attachments[${i}] download failed (${att}): HTTP ${resp.status} ${resp.statusText}`
      );
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length > DOWNLOAD_MAX_BYTES) {
      throw errorFactory(
        workspaceDir,
        `attachments[${i}] exceeds ${DOWNLOAD_MAX_BYTES} byte cap (${buf.length} bytes)`
      );
    }
    const baseRaw = path__default.basename(urlObj.pathname.split("?")[0]) || "attachment";
    const safeName = baseRaw.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "attachment";
    const wsRelative = path__default.join(
      "staged",
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
    );
    const wsAbsolute = path__default.resolve(wsAbs, wsRelative);
    fs__default.mkdirSync(path__default.dirname(wsAbsolute), { recursive: true });
    fs__default.writeFileSync(wsAbsolute, buf);
    resolved.push(wsRelative);
  }
  return resolved;
}
const DEFAULT_WAIT_TIMEOUT_MS = 30 * 6e4;
const DEFAULT_TASK_RETENTION_MS = 60 * 6e4;
const DEFAULT_MAX_TASKS = 100;
const SESSION_CREATE_TIMEOUT_MS = 3e4;
const DEFAULT_INACTIVITY_MS = 144e5;
const DEFAULT_ABSOLUTE_MS = 1446e4;
const DEFAULT_WS_CONNECT_TIMEOUT_MS = 1e4;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5e3;
const WS_CONNECT_MAX_ATTEMPTS = 30;
const WS_CONNECT_RETRY_DELAY_MS = 500;
const COLD_START_MAX_RETRIES = 60;
const COLD_START_RETRY_DELAY_MS = 500;
class WorkspaceBusyError extends Error {
  constructor(workspace, existingTaskId) {
    super(`workspace_busy: ${workspace} (existing task ${existingTaskId})`);
    this.workspace = workspace;
    this.existingTaskId = existingTaskId;
    this.name = "WorkspaceBusyError";
  }
  statusCode = 409;
}
class WorkspaceInvalidError extends Error {
  constructor(workspace, reason) {
    super(`workspace_invalid: ${workspace} — ${reason}`);
    this.workspace = workspace;
    this.name = "WorkspaceInvalidError";
  }
  statusCode = 400;
}
class BadRequestError extends Error {
  constructor(field, reason) {
    super(`bad_request: ${field} — ${reason}`);
    this.field = field;
    this.name = "BadRequestError";
  }
  statusCode = 400;
}
async function connectAndDrive(ctx, task, wsUrl, opts) {
  let attempt = 0;
  let lastError = "";
  while (attempt < WS_CONNECT_MAX_ATTEMPTS && !task.terminal) {
    attempt += 1;
    const socketOrError = await tryConnect(ctx, task, wsUrl, opts, attempt);
    if (socketOrError === "connected") return;
    lastError = socketOrError;
    if (attempt < WS_CONNECT_MAX_ATTEMPTS) {
      await delay(WS_CONNECT_RETRY_DELAY_MS);
    }
  }
  if (!task.terminal) {
    markTerminal(
      ctx,
      task,
      "error",
      `WS connect failed after ${attempt} attempts: ${lastError || "unknown"}`
    );
  }
}
function tryConnect(ctx, task, wsUrl, opts, attempt) {
  return new Promise((resolve2) => {
    let socket;
    try {
      socket = ctx.wsFactory(wsUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      resolve2(`WS factory failed: ${message}`);
      return;
    }
    let resolved = false;
    let connectTimer;
    const settle = (result) => {
      if (resolved) return;
      resolved = true;
      if (connectTimer) {
        clearTimeout(connectTimer);
        connectTimer = void 0;
      }
      resolve2(result);
    };
    if (ctx.wsConnectTimeoutMs > 0) {
      connectTimer = setTimeout(() => {
        if (resolved) return;
        ctx.logger.info(
          `[headless-driver] ${task.task_id} attempt ${attempt} connect timeout (${ctx.wsConnectTimeoutMs}ms with no open/error/close)`
        );
        try {
          socket.close(1e3, "connect_timeout");
        } catch {
        }
        settle(`connect timeout (${ctx.wsConnectTimeoutMs}ms)`);
      }, ctx.wsConnectTimeoutMs);
      connectTimer?.unref?.();
    }
    socket.addEventListener("open", () => {
      if (resolved) return;
      if (task.terminal) {
        try {
          socket.close(1e3, "task_terminal");
        } catch {
        }
        settle("connected");
        return;
      }
      task.socket = socket;
      if (opts.sessionId) {
        safeSend(ctx, task, {
          type: "switch_session",
          session_id: opts.sessionId,
          origin: "headless",
          request_id: `${task.task_id}:switch`
        });
      } else {
        const create = {
          type: "create_session",
          // origin: 'headless' tells the gateway to hold back the runtime
          // `done` SSE forwarding while a benchmark supervisor is still
          // evaluating. Without this, our socket would close on `done`
          // before supervisor's async LLM verdict comes back, silently
          // dropping any subsequent `nudge` (`sendSyntheticUserMessage:
          // no live WS session`). See @hilo/protocol ws.ts ClientCreateSession.origin.
          origin: "headless",
          ...opts.modelId ? { model_id: opts.modelId } : {},
          ...opts.selectedMediaModels ? { selected_media_models: opts.selectedMediaModels } : {}
        };
        safeSend(ctx, task, create);
      }
      task.sessionCreateTimer = setTimeout(() => {
        if (task.terminal) return;
        if (opts.sessionId ? !task.messageSubmitted : !task.session_id) {
          markTerminal(
            ctx,
            task,
            "error",
            opts.sessionId ? "session_switched not received within timeout" : "session_created not received within timeout"
          );
        }
      }, SESSION_CREATE_TIMEOUT_MS);
      task.sessionCreateTimer?.unref?.();
      armInactivityTimer(ctx, task);
      settle("connected");
    });
    socket.addEventListener("message", (ev) => {
      if (task.terminal) return;
      task.last_event_at = new Date(ctx.clock()).toISOString();
      armInactivityTimer(ctx, task);
      const msg = parseServerMessage(ev.data);
      if (!msg) {
        ctx.logger.info?.(`[headless-driver] ${task.task_id} ws message dropped (parse failed)`);
        return;
      }
      ctx.logger.info?.(`[headless-driver] ${task.task_id} ws message type=${msg.type}`);
      handleServerMessage(ctx, task, msg, opts);
    });
    socket.addEventListener("close", (ev) => {
      const code = ev?.code ?? 0;
      const reason = ev?.reason ?? "";
      const description = `WS closed (code=${code}, reason=${reason || "(none)"})`;
      if (!resolved) {
        ctx.logger.info(
          `[headless-driver] ${task.task_id} attempt ${attempt} closed before open: ${description}`
        );
        settle(description);
        return;
      }
      if (task.terminal) return;
      if (task.socket !== socket) {
        ctx.logger.info(
          `[headless-driver] ${task.task_id} attempt ${attempt} ignored late close (no longer driving socket): ${description}`
        );
        return;
      }
      markTerminal(ctx, task, "error", description);
    });
    socket.addEventListener("error", (ev) => {
      const message = ev && typeof ev === "object" && "message" in ev ? String(ev.message) : "WS error";
      if (!resolved) {
        ctx.logger.info(
          `[headless-driver] ${task.task_id} attempt ${attempt} errored before open: ${message}`
        );
        settle(message);
        return;
      }
      if (task.terminal) return;
      if (task.socket !== socket) {
        ctx.logger.info(
          `[headless-driver] ${task.task_id} attempt ${attempt} ignored late error (no longer driving socket): ${message}`
        );
        return;
      }
      markTerminal(ctx, task, "error", message);
    });
  });
}
function handleServerMessage(ctx, task, msg, opts) {
  switch (msg.type) {
    case "credit_threshold_request": {
      if (!opts.autoConfirmCredit || task.terminal || !task.session_id || msg.session_id !== task.session_id || !task.socket)
        return;
      if (msg.expires_at !== void 0 && msg.expires_at <= ctx.clock()) return;
      task.answeredCreditRequests ??= /* @__PURE__ */ new Set();
      const answered = task.answeredCreditRequests;
      if (answered.has(msg.id)) return;
      answered.add(msg.id);
      safeSend(ctx, task, {
        type: "credit_threshold_reply",
        id: msg.id,
        session_id: msg.session_id,
        decision: "continue",
        ...msg.batch_id ? { batch_id: msg.batch_id } : {},
        ...msg.items ? { selected_item_ids: msg.items.map((item) => item.item_id) } : {}
      });
      ctx.logger.info(`[headless-driver] ${task.task_id} credit request ${msg.id}: continued`);
      return;
    }
    case "session_created": {
      if (opts.sessionId) return;
      if (task.messageSubmitted) return;
      const created = msg;
      task.session_id = created.session_id;
      submitInput(ctx, task, opts);
      return;
    }
    case "session_switched": {
      if (!opts.sessionId || task.messageSubmitted || msg.request_id !== `${task.task_id}:switch`)
        return;
      if (msg.history_load_failed || msg.agent_running || (msg.pending_reasons?.length ?? 0) > 0 || msg.runtime_session_id !== opts.sessionId || !msg.session_id) {
        markTerminal(
          ctx,
          task,
          "error",
          "Existing session could not be loaded, is busy, or returned a different session."
        );
        return;
      }
      task.runtime_session_id = msg.runtime_session_id;
      task.session_id = msg.session_id;
      submitInput(ctx, task, opts);
      return;
    }
    case "session_bound": {
      const bound = msg;
      if (bound.ui_session_id === task.session_id) {
        task.runtime_session_id = bound.runtime_session_id;
      }
      return;
    }
    case "done":
    case "session_idle": {
      if (opts.sessionId && (!task.messageSubmitted || msg.session_id && msg.session_id !== task.session_id))
        return;
      if (msg.type === "session_idle" && msg.childSessionId) return;
      markTerminal(ctx, task, "completed");
      return;
    }
    case "benchmark_run_finalized": {
      const finalized = msg;
      if (!task.session_id || finalized.uiSessionId !== task.session_id) return;
      if (opts.sessionId && !task.messageSubmitted) return;
      if (finalized.status === "completed") {
        markTerminal(ctx, task, "completed");
      } else if (finalized.status === "aborted" || finalized.status === "error") {
        const reason = finalized.finalizeReason ?? "unknown";
        markTerminal(
          ctx,
          task,
          "error",
          `benchmark run finalized status=${finalized.status} reason=${reason}`
        );
      }
      return;
    }
    case "error":
    case "session_error": {
      if (msg.type === "session_error" && msg.childSessionId) return;
      const frameSessionId = msg.session_id;
      if (frameSessionId && task.session_id && frameSessionId !== task.session_id) return;
      const errMsg = msg.content || "unknown server error";
      if (scheduleColdStartRetry(ctx, task, opts, errMsg)) return;
      markTerminal(ctx, task, "error", errMsg);
      return;
    }
    default:
      return;
  }
}
function safeSend(ctx, task, msg) {
  if (!task.socket) return;
  try {
    task.socket.send(JSON.stringify(msg));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.warn(`[headless-driver] WS send failed for ${task.task_id}: ${message}`);
    markTerminal(ctx, task, "error", `WS send failed: ${message}`);
  }
}
function scheduleColdStartRetry(ctx, task, opts, errMsg) {
  if (opts.sessionId) return false;
  if (task.session_id) return false;
  if (!task.gateway_url) {
    ctx.logger.warn(
      `[headless-driver] ${task.task_id} cold-start retry skipped (no gateway_url tracked)`
    );
    return false;
  }
  const tries = (task.coldStartRetries ?? 0) + 1;
  task.coldStartRetries = tries;
  if (tries > COLD_START_MAX_RETRIES) {
    ctx.logger.warn(
      `[headless-driver] ${task.task_id} cold-start retry budget exhausted (${COLD_START_MAX_RETRIES} attempts)`
    );
    return false;
  }
  ctx.logger.info(
    `[headless-driver] ${task.task_id} cold-start retry ${tries}/${COLD_START_MAX_RETRIES} after gateway error: ${errMsg}`
  );
  if (task.sessionCreateTimer) {
    clearTimeout(task.sessionCreateTimer);
    task.sessionCreateTimer = void 0;
  }
  if (task.socket) {
    try {
      task.socket.close(1e3, "cold_start_retry");
    } catch {
    }
    task.socket = void 0;
  }
  const wsUrl = new URL(`${task.gateway_url.replace(/^http/i, "ws").replace(/\/$/, "")}/ws`);
  if (task.workspaceBinding) {
    const identityUrl = new URL(workspaceGatewayUrl(task.workspaceBinding, wsUrl.pathname));
    wsUrl.search = identityUrl.search;
  } else if (task.workspace_claim) {
    wsUrl.searchParams.set(HILO_WORKSPACE_IDENTITY_QUERY, task.workspace_claim);
  }
  void (async () => {
    await delay(COLD_START_RETRY_DELAY_MS);
    if (task.terminal) return;
    await connectAndDrive(ctx, task, wsUrl.toString(), opts);
  })();
  return true;
}
function submitInput(ctx, task, opts) {
  if (task.messageSubmitted || task.terminal || !task.session_id) return;
  if (task.sessionCreateTimer) {
    clearTimeout(task.sessionCreateTimer);
    task.sessionCreateTimer = void 0;
  }
  task.messageSubmitted = true;
  if (opts.sessionId && opts.modelId)
    safeSend(ctx, task, {
      type: "update_model",
      session_id: task.session_id,
      model_id: opts.modelId
    });
  if (opts.sessionId && opts.selectedMediaModels)
    safeSend(ctx, task, {
      type: "update_selected_media_models",
      session_id: task.session_id,
      selected_media_models: opts.selectedMediaModels
    });
  const send = {
    type: "message",
    content: opts.prompt,
    agent_type: "general",
    session_id: task.session_id,
    async: true,
    ...opts.attachments?.length ? { attachments: opts.attachments } : {}
  };
  safeSend(ctx, task, send);
}
function createTaskRecord(ctx, workspace, prompt) {
  const taskId = ctx.taskIdFactory();
  const now = new Date(ctx.clock()).toISOString();
  let resolveDone;
  const done = new Promise((res) => {
    resolveDone = res;
  });
  const task = {
    task_id: taskId,
    status: "pending",
    workspace,
    prompt,
    started_at: now,
    last_event_at: now,
    done,
    resolveDone,
    terminal: false
  };
  return task;
}
async function runTask(ctx, task, opts) {
  let runtime;
  try {
    runtime = await ctx.hiloApp.openWorkspace(task.workspace, {
      agentVersion: opts.agentVersion,
      agentRunId: opts.agentRunId,
      skillsPaths: opts.skillsPaths,
      evalSkillAgentGrants: opts.evalSkillAgentGrants,
      cloudEnvOverride: opts.cloudEnvOverride,
      watermarkEnabled: opts.watermarkEnabled
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    markTerminal(ctx, task, "error", `openWorkspace failed: ${message}`);
    return;
  }
  if (task.terminal) return;
  if (!runtime?.wsUrl) {
    markTerminal(ctx, task, "error", "openWorkspace returned no runtime / wsUrl");
    return;
  }
  task.gateway_url = runtime.gatewayUrl;
  const workspaceBinding = runtime.gatewayBinding;
  task.workspace_claim = workspaceBinding?.claim ?? runtime.workspaceClaim;
  task.workspace_instance_id = workspaceBinding?.instanceId;
  task.workspace_generation = workspaceBinding?.generation;
  task.workspaceBinding = workspaceBinding;
  task.metadata = {
    ...task.metadata ?? {},
    selected_agent_version: 2
  };
  try {
    await ctx.hiloApp.waitForWorkspaceBound(runtime.workspaceId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    markTerminal(ctx, task, "error", `waitForWorkspaceBound failed: ${message}`);
    return;
  }
  if (task.terminal) return;
  if (opts.prepareWorkspace) {
    const restore = opts.prepareWorkspace;
    const abort = new AbortController();
    task.preparationAbort = abort;
    const pending = Promise.resolve().then(() => {
      abort.signal.throwIfAborted();
      return restore(runtime, abort.signal);
    });
    task.preparationPending = pending;
    try {
      const cursor = await pending;
      if (task.preparationTerminalRequested || task.terminal) return;
      if (!cursor || typeof cursor.sessionId !== "string" || !cursor.sessionId.trim() || cursor.sessionId.length > 256 || typeof cursor.prompt !== "string" || !cursor.prompt.trim() && !cursor.attachments?.length || cursor.attachments !== void 0 && (!Array.isArray(cursor.attachments) || !cursor.attachments.every((value) => typeof value === "string" && value.length > 0))) {
        throw new Error("Workspace preparation returned invalid session input");
      }
      opts = {
        ...opts,
        sessionId: cursor.sessionId,
        prompt: cursor.prompt,
        attachments: cursor.attachments
      };
    } catch (error) {
      if (task.preparationTerminalRequested) return;
      task.preparationPending = void 0;
      markTerminal(
        ctx,
        task,
        "error",
        `workspace preparation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return;
    } finally {
      task.preparationPending = void 0;
      task.preparationAbort = void 0;
    }
  }
  task.status = "running";
  task.last_event_at = new Date(ctx.clock()).toISOString();
  await connectAndDrive(ctx, task, runtime.wsUrl, opts);
}
function markTerminal(ctx, task, status, errorMessage, options = {}) {
  if (task.terminal) return;
  if (task.preparationPending) {
    if (task.preparationTerminalRequested) return;
    task.preparationTerminalRequested = true;
    task.preparationAbort?.abort();
    void task.preparationPending.catch(() => void 0).then(() => {
      task.preparationPending = void 0;
      markTerminal(ctx, task, status, errorMessage, options);
    });
    return;
  }
  task.terminal = true;
  task.status = status;
  if (errorMessage) task.error_message = errorMessage;
  task.finalized_at = new Date(ctx.clock()).toISOString();
  if (task.inactivityTimer) {
    clearTimeout(task.inactivityTimer);
    task.inactivityTimer = void 0;
  }
  if (task.absoluteTimer) {
    clearTimeout(task.absoluteTimer);
    task.absoluteTimer = void 0;
  }
  if (task.sessionCreateTimer) {
    clearTimeout(task.sessionCreateTimer);
    task.sessionCreateTimer = void 0;
  }
  if (task.socket && task.socket.readyState <= 1) {
    try {
      task.socket.close(1e3, "task_terminal");
    } catch {
    }
  }
  ctx.busyWorkspaces.delete(canonicalizeWorkspace(task.workspace));
  if (!options.skipEnrich && task.session_id && task.gateway_url) {
    void enrichBenchmarkMetadata(ctx, task).finally(() => {
      task.resolveDone(snapshot(task));
    });
  } else {
    task.resolveDone(snapshot(task));
  }
}
function cancelGatewaySessionAndMarkTerminal(ctx, task, status, reason) {
  if (task.terminal) return;
  if (task.socket?.readyState === 1) {
    const cancel = {
      type: "cancel",
      ...task.session_id ? { session_id: task.session_id } : {},
      source: "unknown",
      reason
    };
    try {
      task.socket.send(JSON.stringify(cancel));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ctx.logger.warn(
        `[headless-driver] Gateway cancel send failed for ${task.task_id}: ${message}`
      );
    }
  }
  markTerminal(ctx, task, status, reason);
}
async function enrichBenchmarkMetadata(ctx, task) {
  if (!task.session_id || !task.gateway_url) return;
  let url;
  try {
    url = new URL(
      `/api/benchmark/runs/${encodeURIComponent(task.session_id)}`,
      task.gateway_url
    ).toString();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.warn(
      `[headless-driver] benchmark_run_dir URL build failed for ${task.task_id} (gateway_url=${task.gateway_url}): ${message}`
    );
    return;
  }
  try {
    const resp = await ctx.fetchImpl(url, {
      method: "GET",
      headers: task.workspaceBinding ? workspaceGatewayIdentityHeaders(task.workspaceBinding) : task.workspace_claim ? { [HILO_WORKSPACE_IDENTITY_HEADER]: task.workspace_claim } : void 0,
      signal: AbortSignal.timeout(3e3)
    });
    if (resp.status === 404) return;
    if (!resp.ok) {
      ctx.logger.warn(
        `[headless-driver] benchmark_run_dir lookup ${task.task_id}: HTTP ${resp.status}`
      );
      return;
    }
    const body = await resp.json();
    if (typeof body.run_dir !== "string" || body.run_dir.length === 0) return;
    task.metadata = {
      ...task.metadata ?? {},
      benchmark_run_dir: body.run_dir,
      ...typeof body.run_id === "string" ? { benchmark_run_id: body.run_id } : {}
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.warn(
      `[headless-driver] benchmark_run_dir lookup ${task.task_id} failed: ${message}`
    );
  }
}
function armInactivityTimer(ctx, task) {
  if (ctx.inactivityMs <= 0 || task.terminal) return;
  if (task.inactivityTimer) clearTimeout(task.inactivityTimer);
  const timer = setTimeout(() => {
    task.inactivityTimer = void 0;
    if (task.terminal) return;
    cancelGatewaySessionAndMarkTerminal(
      ctx,
      task,
      "timeout",
      `inactivity timeout (${ctx.inactivityMs}ms with no WS message)`
    );
  }, ctx.inactivityMs);
  timer.unref?.();
  task.inactivityTimer = timer;
}
function armAbsoluteTimer(ctx, task) {
  if (ctx.absoluteMs <= 0 || task.terminal) return;
  const timer = setTimeout(() => {
    task.absoluteTimer = void 0;
    if (task.terminal) return;
    cancelGatewaySessionAndMarkTerminal(
      ctx,
      task,
      "timeout",
      `absolute timeout (${ctx.absoluteMs}ms cap reached)`
    );
  }, ctx.absoluteMs);
  timer.unref?.();
  task.absoluteTimer = timer;
}
async function awaitTaskWithTimeout(ctx, task, timeoutMs) {
  let timer;
  const timeoutPromise = new Promise((resolve2) => {
    timer = setTimeout(() => {
      if (!task.terminal) {
        cancelGatewaySessionAndMarkTerminal(ctx, task, "timeout", `wait timeout (${timeoutMs}ms)`);
      }
      if (task.preparationPending) void task.done.then(resolve2);
      else resolve2(snapshot(task));
    }, timeoutMs);
    timer?.unref?.();
  });
  try {
    const record = await Promise.race([task.done, timeoutPromise]);
    return record;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
function snapshot(task) {
  const {
    socket: _socket,
    answeredCreditRequests: _answeredCreditRequests,
    messageSubmitted: _messageSubmitted,
    done: _done,
    resolveDone: _resolveDone,
    terminal: _terminal,
    inactivityTimer: _timer,
    absoluteTimer: _absoluteTimer,
    workspaceBinding: _workspaceBinding,
    preparationPending: _preparationPending,
    preparationAbort: _preparationAbort,
    preparationTerminalRequested: _preparationTerminalRequested,
    ...rest
  } = task;
  return { ...rest };
}
function validateWorkspace(input) {
  if (typeof input !== "string" || input.length === 0) {
    throw new WorkspaceInvalidError(String(input), "workspace must be a non-empty string");
  }
  if (!path__default.isAbsolute(input)) {
    throw new WorkspaceInvalidError(input, "workspace must be an absolute path");
  }
  if (!existsSync(input)) {
    throw new WorkspaceInvalidError(input, "workspace path does not exist");
  }
  let stat;
  try {
    stat = statSync(input);
  } catch (err) {
    throw new WorkspaceInvalidError(
      input,
      `workspace stat failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if (!stat.isDirectory()) {
    throw new WorkspaceInvalidError(input, "workspace path is not a directory");
  }
  return input;
}
function evictIfOverCapacity(ctx) {
  if (ctx.tasks.size <= ctx.maxTasks) return;
  for (const [taskId, task] of ctx.tasks) {
    if (task.terminal && ctx.tasks.size > ctx.maxTasks) {
      ctx.tasks.delete(taskId);
    }
    if (ctx.tasks.size <= ctx.maxTasks) break;
  }
}
function sweepRetention(ctx) {
  const now = ctx.clock();
  for (const [taskId, task] of ctx.tasks) {
    if (!task.terminal) continue;
    const finalisedAt = task.finalized_at ? Date.parse(task.finalized_at) : 0;
    if (finalisedAt > 0 && now - finalisedAt > ctx.taskRetentionMs) {
      ctx.tasks.delete(taskId);
    }
  }
}
class HeadlessDriver {
  hiloApp;
  logger;
  waitTimeoutMs;
  taskRetentionMs;
  maxTasks;
  inactivityMs;
  absoluteMs;
  wsConnectTimeoutMs;
  shutdownTimeoutMs;
  wsFactory;
  taskIdFactory;
  clock;
  fetchImpl;
  onShutdownComplete;
  tasks = /* @__PURE__ */ new Map();
  /** Workspace key (canonicalised path) → in-flight task id. */
  busyWorkspaces = /* @__PURE__ */ new Map();
  shuttingDown = false;
  retentionSweepTimer;
  constructor(options) {
    this.hiloApp = options.hiloApp;
    this.logger = options.logger;
    this.waitTimeoutMs = options.waitTimeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS;
    this.taskRetentionMs = options.taskRetentionMs ?? DEFAULT_TASK_RETENTION_MS;
    this.maxTasks = options.maxTasks ?? DEFAULT_MAX_TASKS;
    this.inactivityMs = options.inactivityMs ?? parseEnvDurationMs(process.env.HILO_HEADLESS_INACTIVITY_MS) ?? DEFAULT_INACTIVITY_MS;
    this.absoluteMs = options.absoluteMs ?? parseEnvDurationMs(process.env.HILO_HEADLESS_ABSOLUTE_MS) ?? DEFAULT_ABSOLUTE_MS;
    this.wsConnectTimeoutMs = options.wsConnectTimeoutMs ?? parseEnvDurationMs(process.env.HILO_HEADLESS_WS_CONNECT_TIMEOUT_MS) ?? DEFAULT_WS_CONNECT_TIMEOUT_MS;
    this.shutdownTimeoutMs = options.shutdownTimeoutMs ?? parseEnvDurationMs(process.env.HILO_HEADLESS_SHUTDOWN_TIMEOUT_MS) ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
    this.wsFactory = options.wsFactory ?? defaultWebSocketFactory;
    this.taskIdFactory = options.taskIdFactory ?? defaultTaskIdFactory;
    this.clock = options.clock ?? Date.now;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.onShutdownComplete = options.onShutdownComplete;
  }
  /**
   * Build the shared context surface that sub-module functions consume
   * in lieu of `this.*` access.
   *
   * **Why a getter (not a constructor-set field)**: tests monkey-patch
   * `driver.wsFactory` at runtime to inject deterministic behaviour
   * (see `headless-driver.test.ts:339`). A cached field would freeze
   * the ctor-time factory reference, breaking those tests. The getter
   * re-reads `this.*` on each call, so monkey-patches are honoured —
   * matching the pre-split contract where every method dereferenced
   * `this.wsFactory` directly.
   *
   * Per-call allocation is fine: hot paths (sweepRetention 1/min,
   * dispatch on each call) call this < 100 times/sec.
   *
   * **Lifetime contract** (R8 C-2 doc): the returned object is a fresh
   * snapshot each call, but every value-typed field except the two
   * dynamic ones below is set at constructor time and never reassigned,
   * so sub-module code that captures `ctx` in an async closure (e.g.
   * `await connectAndDrive(ctx, task, ...)`) reads the same values it
   * would see if it re-fetched. The two exceptions are intentionally
   * **live bindings** via arrow closures over the class instance:
   *
   *   - `isShuttingDown()` — reads `this.shuttingDown` at call time so
   *     long-lived async chains see shutdown state changes immediately.
   *   - `setShuttingDown(v)` — writes back to `this.shuttingDown` so
   *     callers can flip the flag from anywhere in the call chain.
   *
   * Mutable shared state lives in the `tasks` / `busyWorkspaces` Maps,
   * which are object refs (read-write through both ctx snapshots and
   * `this.*`). If you add a mutable field here, decide explicitly
   * whether it should be a value snapshot (constructor-time) or a live
   * binding (arrow closure) and document the choice — silently making
   * something snapshot-only when callers expect live binding will look
   * fine in tests and surprise you in production hot-reload scenarios.
   */
  get ctx() {
    return {
      hiloApp: this.hiloApp,
      logger: this.logger,
      waitTimeoutMs: this.waitTimeoutMs,
      taskRetentionMs: this.taskRetentionMs,
      maxTasks: this.maxTasks,
      inactivityMs: this.inactivityMs,
      absoluteMs: this.absoluteMs,
      wsConnectTimeoutMs: this.wsConnectTimeoutMs,
      shutdownTimeoutMs: this.shutdownTimeoutMs,
      wsFactory: this.wsFactory,
      taskIdFactory: this.taskIdFactory,
      clock: this.clock,
      fetchImpl: this.fetchImpl,
      onShutdownComplete: this.onShutdownComplete,
      tasks: this.tasks,
      busyWorkspaces: this.busyWorkspaces,
      isShuttingDown: () => this.shuttingDown,
      setShuttingDown: (value) => {
        this.shuttingDown = value;
      }
    };
  }
  /** Starts the periodic retention sweep. Idempotent. */
  start() {
    if (this.retentionSweepTimer) return;
    this.retentionSweepTimer = setInterval(() => sweepRetention(this.ctx), 6e4);
    this.retentionSweepTimer.unref?.();
  }
  /** Stops the retention sweep. Called from shutdownAll. */
  stop() {
    if (this.retentionSweepTimer) {
      clearInterval(this.retentionSweepTimer);
      this.retentionSweepTimer = void 0;
    }
  }
  async dispatch(opts) {
    if (this.shuttingDown) {
      throw new Error("headless_shutting_down");
    }
    const workspace = validateWorkspace(opts.workspace);
    const prompt = (opts.prompt ?? "").trim();
    if (opts.prepareWorkspace !== void 0 && (typeof opts.prepareWorkspace !== "function" || opts.sessionId !== void 0)) {
      throw new BadRequestError(
        "prepareWorkspace",
        "choose either a session or workspace preparation"
      );
    }
    if (opts.sessionId !== void 0 && (typeof opts.sessionId !== "string" || !opts.sessionId.trim() || opts.sessionId.length > 256)) {
      throw new BadRequestError(
        "session_id",
        "expected a non-empty session ID of at most 256 characters"
      );
    }
    if (!opts.prepareWorkspace && prompt.length === 0) {
      throw new WorkspaceInvalidError(workspace, "prompt is empty");
    }
    const resolvedAttachments = await resolveAttachmentSources(
      workspace,
      opts.attachments,
      (ws2, message) => new WorkspaceInvalidError(ws2, message)
    );
    const dedupKey = canonicalizeWorkspace(workspace);
    const existing = this.busyWorkspaces.get(dedupKey);
    if (existing) {
      throw new WorkspaceBusyError(workspace, existing);
    }
    const task = createTaskRecord(this.ctx, workspace, prompt);
    if (opts.agentVersion !== void 0) {
      task.metadata = { requested_agent_version: opts.agentVersion };
    }
    this.tasks.set(task.task_id, task);
    this.busyWorkspaces.set(dedupKey, task.task_id);
    evictIfOverCapacity(this.ctx);
    armAbsoluteTimer(this.ctx, task);
    const dispatchOpts = {
      ...opts,
      attachments: resolvedAttachments
    };
    runTask(this.ctx, task, dispatchOpts).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[headless-driver] runTask threw unexpectedly: ${message}`);
      markTerminal(this.ctx, task, "error", message);
    });
    if (opts.async === false) {
      const timeoutMs = opts.waitTimeoutMs ?? this.waitTimeoutMs;
      return await awaitTaskWithTimeout(this.ctx, task, timeoutMs);
    }
    return snapshot(task);
  }
  getTask(taskId) {
    const task = this.tasks.get(taskId);
    return task ? snapshot(task) : void 0;
  }
  /**
   * Cancel an in-flight task. Sends a targeted Gateway `cancel` frame
   * before closing the WS, allowing Gateway to abort the runtime session
   * and child work. Then finalises the driver record as
   * `error: "cancelled"`. Idempotent for already-terminal tasks.
   */
  cancelTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      this.logger.warn(`[headless-driver] cancelTask: unknown task_id=${taskId}`);
      return;
    }
    if (task.terminal) {
      this.logger.warn(
        `[headless-driver] cancelTask: task_id=${taskId} already terminal (${task.status})`
      );
      return;
    }
    cancelGatewaySessionAndMarkTerminal(this.ctx, task, "error", "cancelled");
  }
  /**
   * Release one eval workspace runtime after its item reached the explicit
   * `eval-item-terminal` phase. The busy lock is runtime-owned evidence that
   * no driver turn remains active; a caller-provided proof alone is not enough.
   */
  async closeWorkspace(workspace, proof) {
    assertEvalItemTerminalCloseProof(proof);
    const activeTaskId = this.busyWorkspaces.get(canonicalizeWorkspace(workspace));
    if (activeTaskId) {
      throw new Error(
        `closeWorkspace rejected: workspace still has active task ${activeTaskId}; eval-item-terminal phase is not proven`
      );
    }
    if (!this.hiloApp.closeEvalWorkspace) {
      throw new Error("closeEvalWorkspace unsupported by this HiloAppLike implementation");
    }
    await this.hiloApp.closeEvalWorkspace(workspace, proof);
  }
  /**
   * Drain in-flight tasks and ask HiloApp to shut down. The HTTP layer
   * calls this so the orchestrator can issue a clean shutdown without
   * SIGTERM gymnastics. Resolves before `onShutdownComplete` fires so
   * the HTTP response can be flushed first.
   */
  async shutdownAll() {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    this.stop();
    for (const task of Array.from(this.tasks.values())) {
      if (!task.terminal) {
        markTerminal(this.ctx, task, "error", "shutdown", { skipEnrich: true });
      }
    }
    try {
      const shutdownPromise = this.hiloApp.shutdown();
      if (this.shutdownTimeoutMs > 0) {
        let timeoutHandle;
        const timeoutPromise = new Promise((resolve2) => {
          timeoutHandle = setTimeout(() => resolve2("timed_out"), this.shutdownTimeoutMs);
          timeoutHandle?.unref?.();
        });
        const winner = await Promise.race([
          shutdownPromise.then(() => "ok"),
          timeoutPromise
        ]);
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (winner === "timed_out") {
          this.logger.error(
            `[headless-driver] hiloApp.shutdown did not resolve within ${this.shutdownTimeoutMs}ms; forcing exit`
          );
        }
      } else {
        await shutdownPromise;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[headless-driver] hiloApp.shutdown failed: ${message}`);
    }
    setImmediate(() => {
      try {
        this.onShutdownComplete?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`[headless-driver] onShutdownComplete threw: ${message}`);
      }
    });
  }
}
function assertEvalItemTerminalCloseProof(proof) {
  if (proof?.phase !== "eval-item-terminal" || !["terminal", "dispatch-not-started", "released"].includes(proof.itemOutcome) || proof.durableWorkSettled !== true || proof.terminalCallbackSettled !== true || proof.retentionDecisionSettled !== true) {
    throw new Error("invalid eval-item-terminal close proof");
  }
}
const MAX_BODY_SIZE = 1024 * 1024;
const DEFAULT_PORT = 18802;
const DEFAULT_BIND_HOST = "127.0.0.1";
const LOOPBACK_HOSTS = /* @__PURE__ */ new Set(["127.0.0.1", "localhost", "::1"]);
const ALLOWED_MEDIA_MODALITIES = /* @__PURE__ */ new Set([
  "video",
  "image",
  "audio",
  "music",
  "text"
]);
const MAX_MEDIA_MODEL_VALUE_BYTES = 200;
function parseHeadlessPort(env = process.env) {
  const raw = env.HILO_HEADLESS_PORT;
  if (!raw) return DEFAULT_PORT;
  const port = Number.parseInt(raw, 10);
  if (Number.isFinite(port) && port > 0 && port < 65536) return port;
  return DEFAULT_PORT;
}
function parseBindHost(env = process.env) {
  const raw = env.HILO_HEADLESS_BIND_HOST;
  if (typeof raw !== "string") return DEFAULT_BIND_HOST;
  const trimmed = raw.trim();
  if (trimmed === "") return DEFAULT_BIND_HOST;
  if (!/^[a-zA-Z0-9.:_-]+$/.test(trimmed)) return DEFAULT_BIND_HOST;
  return trimmed;
}
function isLoopbackHost(host) {
  return LOOPBACK_HOSTS.has(host.toLowerCase());
}
class BodyTooLargeError extends Error {
  statusCode = 413;
  constructor() {
    super("Request body too large (limit: 1 MB)");
    this.name = "BodyTooLargeError";
  }
}
class UnsupportedMediaTypeError extends Error {
  constructor(received) {
    super(`Unsupported Content-Type "${received || "(empty)"}"; expected application/json`);
    this.received = received;
    this.name = "UnsupportedMediaTypeError";
  }
  statusCode = 415;
}
function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}
function parseBody(req) {
  return new Promise((resolve2, reject) => {
    const chunks = [];
    let totalSize = 0;
    req.on("data", (chunk) => {
      totalSize += chunk.length;
      if (totalSize > MAX_BODY_SIZE) {
        req.destroy();
        reject(new BodyTooLargeError());
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf-8");
        if (raw.length === 0) {
          resolve2({});
          return;
        }
        const ct2 = (req.headers["content-type"] ?? "").toString().toLowerCase();
        if (!ct2.startsWith("application/json")) {
          reject(new UnsupportedMediaTypeError(ct2));
          return;
        }
        resolve2(JSON.parse(raw));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
    req.on("error", reject);
  });
}
class HeadlessServer {
  server = null;
  port;
  bindHost;
  authToken;
  logger;
  driver;
  constructor(options) {
    this.port = options.port ?? parseHeadlessPort();
    this.bindHost = options.bindHost ?? parseBindHost();
    this.authToken = options.authToken;
    this.logger = options.logger;
    this.driver = options.driver;
  }
  start() {
    return new Promise((resolve2, reject) => {
      this.server = createServer((req, res) => {
        void this.handleRequest(req, res);
      });
      this.server.on("error", reject);
      this.server.listen(this.port, this.bindHost, () => {
        this.logger.info(
          `[headless-server] listening on http://${this.bindHost}:${this.port}` + (this.authToken ? " (bearer auth required)" : "")
        );
        if (!isLoopbackHost(this.bindHost)) {
          this.logger.warn(
            `[headless-server] bound to ${this.bindHost} — API exposed beyond loopback. Bearer token + JSON Content-Type are sole CSRF defenses; restrict access via firewall in production.`
          );
        }
        resolve2();
      });
    });
  }
  stop() {
    return new Promise((resolve2) => {
      if (this.server) {
        this.server.close(() => resolve2());
      } else {
        resolve2();
      }
    });
  }
  async handleRequest(req, res) {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${this.port}`);
    const pathname = url.pathname;
    const method = req.method?.toUpperCase() ?? "GET";
    try {
      if (method === "GET" && pathname === "/api/headless/health") {
        sendJson(res, 200, {
          ok: true,
          status: "ready",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        return;
      }
      if (!this.originAllowed(req)) {
        sendJson(res, 403, { error: "forbidden_origin" });
        return;
      }
      if (!this.authorize(req)) {
        sendJson(res, 401, { error: "unauthorized" });
        return;
      }
      if (method === "POST" && pathname === "/api/headless/dispatch") {
        await this.handleDispatch(req, res, url);
        return;
      }
      const runMatch = pathname.match(/^\/api\/headless\/runs\/([^/]+)$/);
      if (method === "GET" && runMatch) {
        const record = this.driver.getTask(decodeURIComponent(runMatch[1]));
        if (!record) {
          sendJson(res, 404, { error: "task_not_found" });
          return;
        }
        sendJson(res, 200, record);
        return;
      }
      if (method === "POST" && pathname === "/api/headless/shutdown") {
        sendJson(res, 202, { ok: true, message: "shutting down" });
        void this.driver.shutdownAll();
        return;
      }
      sendJson(res, 404, { error: "not_found", path: pathname });
    } catch (err) {
      this.handleError(res, err);
    }
  }
  async handleDispatch(req, res, url) {
    let body;
    try {
      const raw = await parseBody(req);
      body = raw ?? {};
    } catch (err) {
      this.handleError(res, err);
      return;
    }
    const workspace = typeof body.workspace === "string" ? body.workspace : "";
    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    const queryWait = parseWaitQuery(url);
    const bodyAsync = body.async;
    const isAsync = bodyAsync === false ? false : !queryWait;
    let agentVersion;
    let selectedMediaModels;
    try {
      if (body.session_id !== void 0 && (typeof body.session_id !== "string" || !body.session_id.trim() || body.session_id.length > 256)) {
        throw new BadRequestError(
          "session_id",
          "expected a non-empty session ID of at most 256 characters"
        );
      }
      agentVersion = validateAgentVersion(body.agent_version);
      selectedMediaModels = validateSelectedMediaModels(body.selected_media_models);
    } catch (err) {
      this.handleError(res, err);
      return;
    }
    const attachments = Array.isArray(body.attachments) ? body.attachments.filter((s3) => typeof s3 === "string" && s3.length > 0) : void 0;
    let record;
    try {
      record = await this.driver.dispatch({
        workspace,
        prompt,
        sessionId: typeof body.session_id === "string" ? body.session_id : void 0,
        agentVersion,
        modelId: typeof body.model_id === "string" ? body.model_id : void 0,
        // selected_media_models keeps the WS protocol's snake_case key.
        selectedMediaModels,
        attachments: attachments && attachments.length > 0 ? attachments : void 0,
        async: isAsync
      });
    } catch (err) {
      this.handleError(res, err);
      return;
    }
    sendJson(res, 200, record);
  }
  handleError(res, err) {
    if (err instanceof BodyTooLargeError) {
      sendJson(res, 413, { error: err.message });
      return;
    }
    if (err instanceof UnsupportedMediaTypeError) {
      sendJson(res, 415, {
        error: "unsupported_media_type",
        received: err.received,
        expected: "application/json"
      });
      return;
    }
    if (err instanceof WorkspaceInvalidError) {
      sendJson(res, 400, {
        error: err.name,
        workspace: err.workspace,
        message: err.message
      });
      return;
    }
    if (err instanceof WorkspaceBusyError) {
      sendJson(res, 409, {
        error: err.name,
        workspace: err.workspace,
        existing_task_id: err.existingTaskId,
        message: err.message
      });
      return;
    }
    if (err instanceof BadRequestError) {
      sendJson(res, 400, {
        error: err.name,
        field: err.field,
        message: err.message
      });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    this.logger.error(`[headless-server] handleRequest failed: ${message}`);
    sendJson(res, 500, { error: "internal_error", message });
  }
  authorize(req) {
    if (!this.authToken) return true;
    const header = req.headers.authorization;
    if (typeof header !== "string" || !header.startsWith("Bearer ")) return false;
    const provided = header.slice("Bearer ".length).trim();
    const a = Buffer.from(provided, "utf-8");
    const b2 = Buffer.from(this.authToken, "utf-8");
    if (a.length !== b2.length) return false;
    return timingSafeEqual(a, b2);
  }
  /**
   * Browser CSRF defense. Two modes depending on bind host:
   *
   * - Loopback bind (default `127.0.0.1` / `localhost` / `::1`):
   *   strict — Origin (when present) must be a loopback hostname.
   *   This is the original posture: the page that issues the request
   *   must itself be hosted on the same loopback origin we listen on,
   *   ruling out attacks from other browser tabs / extensions.
   *
   * - Non-loopback bind (`0.0.0.0` / specific interface IP set via
   *   `HILO_HEADLESS_BIND_HOST` for remote orchestration): relaxed —
   *   Origin hostname is no longer constrained to loopback because
   *   legitimate remote callers will carry their own origin. Bearer
   *   token + `application/json` Content-Type become the sole CSRF
   *   defenses; the start-up `warn` makes this posture explicit so
   *   operators add a firewall in production.
   *
   * `Sec-Fetch-Site` is checked in both modes — `cross-site` is
   * rejected even when other gates pass (defense-in-depth against
   * header-spoofing edge cases).
   *
   * CLI / curl don't send Origin and pass through in both modes.
   */
  originAllowed(req) {
    const fetchSite = req.headers["sec-fetch-site"];
    if (typeof fetchSite === "string") {
      const v = fetchSite.toLowerCase();
      if (v !== "same-origin" && v !== "same-site" && v !== "none") {
        return false;
      }
    }
    const origin = req.headers.origin;
    if (origin === void 0 || origin === "") return true;
    try {
      const u = new URL(origin);
      if (isLoopbackHost(this.bindHost)) {
        if (u.hostname !== "127.0.0.1" && u.hostname !== "localhost") return false;
      }
      if (u.port && Number.parseInt(u.port, 10) !== this.port) return false;
      return true;
    } catch {
      return false;
    }
  }
}
function parseWaitQuery(url) {
  const raw = url.searchParams.get("wait");
  if (raw === null) return false;
  const lower = raw.toLowerCase();
  return lower === "true" || lower === "1";
}
function validateAgentVersion(raw) {
  if (raw === void 0) return void 0;
  if (raw === 2) return raw;
  throw new BadRequestError("agent_version", "expected numeric 2");
}
function validateSelectedMediaModels(raw) {
  if (raw === void 0 || raw === null) return void 0;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new BadRequestError(
      "selected_media_models",
      `expected plain object, got ${Array.isArray(raw) ? "array" : typeof raw}`
    );
  }
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!ALLOWED_MEDIA_MODALITIES.has(key)) {
      throw new BadRequestError(
        "selected_media_models",
        `unknown modality "${key}"; allowed: ${[...ALLOWED_MEDIA_MODALITIES].join(",")}`
      );
    }
    if (typeof value !== "string") {
      throw new BadRequestError(
        "selected_media_models",
        `value for "${key}" must be string, got ${typeof value}`
      );
    }
    if (Buffer.byteLength(value, "utf8") > MAX_MEDIA_MODEL_VALUE_BYTES) {
      throw new BadRequestError(
        "selected_media_models",
        `value for "${key}" exceeds ${MAX_MEDIA_MODEL_VALUE_BYTES} bytes`
      );
    }
    out[key] = value;
  }
  return Object.keys(out).length === 0 ? void 0 : out;
}
class DirectoryCopyError extends Error {
  details;
  constructor(message, details) {
    super(message);
    this.name = "DirectoryCopyError";
    this.details = details;
  }
}
const CLEANUP_MAX_RETRIES = 3;
const CLEANUP_RETRY_DELAY_MS = 50;
const RETRYABLE_CLEANUP_ERROR_CODES = /* @__PURE__ */ new Set(["EPERM", "EBUSY", "EACCES"]);
const WIN_DEVICE_PREFIX = "\\\\?\\";
function toExtendedLengthPath(target, platform = process.platform, pathImpl = path__default) {
  if (platform !== "win32") return target;
  if (target.startsWith(WIN_DEVICE_PREFIX) || target.startsWith("\\\\.\\")) return target;
  const resolved = pathImpl.resolve(target);
  if (resolved.startsWith("\\\\")) return `${WIN_DEVICE_PREFIX}UNC\\${resolved.slice(2)}`;
  return `${WIN_DEVICE_PREFIX}${resolved}`;
}
function errnoCode(err) {
  const code = err.code;
  return typeof code === "string" ? code : void 0;
}
function copyDirRecursive(src, dest) {
  const result = copyDirRecursiveDetailed(src, dest);
  return result.failures;
}
function copyDirRecursiveDetailed(src, dest) {
  const details = [];
  copyDirRecursiveInternal(src, dest, details);
  return { failures: details.length, details };
}
function copyDirRecursiveInternal(src, dest, details) {
  try {
    fs__default.mkdirSync(toExtendedLengthPath(dest), { recursive: true });
  } catch (err) {
    details.push({
      path: dest,
      error: err instanceof Error ? err.message : String(err),
      code: errnoCode(err)
    });
    return;
  }
  for (const entry of fs__default.readdirSync(toExtendedLengthPath(src), { withFileTypes: true })) {
    const srcPath = path__default.join(src, entry.name);
    const destPath = path__default.join(dest, entry.name);
    try {
      if (entry.isSymbolicLink()) {
        const target = fs__default.readlinkSync(toExtendedLengthPath(srcPath));
        try {
          fs__default.symlinkSync(target, toExtendedLengthPath(destPath));
        } catch {
          fs__default.copyFileSync(toExtendedLengthPath(srcPath), toExtendedLengthPath(destPath));
        }
      } else if (entry.isDirectory()) {
        copyDirRecursiveInternal(srcPath, destPath, details);
      } else {
        fs__default.copyFileSync(toExtendedLengthPath(srcPath), toExtendedLengthPath(destPath));
      }
    } catch (err) {
      details.push({
        path: srcPath,
        error: err instanceof Error ? err.message : String(err),
        code: errnoCode(err)
      });
    }
  }
}
function shouldFallbackToCopyOnRename(error) {
  const code = error.code;
  return code === "EXDEV" || code === "EPERM" || code === "EBUSY";
}
function sleepSync(delayMs) {
  const signal = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
  Atomics.wait(signal, 0, 0, delayMs);
}
function removeDirectoryWithRetry(target) {
  for (let attempt = 0; attempt <= CLEANUP_MAX_RETRIES; attempt += 1) {
    try {
      fs__default.rmSync(toExtendedLengthPath(target), { recursive: true, force: true });
      return void 0;
    } catch (error) {
      const code = error.code;
      const canRetry = RETRYABLE_CLEANUP_ERROR_CODES.has(code ?? "") && attempt < CLEANUP_MAX_RETRIES;
      if (!canRetry) return error;
      sleepSync(CLEANUP_RETRY_DELAY_MS * (attempt + 1));
    }
  }
  return void 0;
}
function logCleanupFailure(target, error) {
  const message = error instanceof Error ? error.message : String(error);
  try {
    console.error(`[fs-copy] Deferred cleanup for ${target}: ${message}`);
  } catch {
  }
}
function cleanupCommittedPath(target, cleanupDeferredPaths) {
  const cleanupError = removeDirectoryWithRetry(target);
  if (!cleanupError) return;
  cleanupDeferredPaths.push(target);
  logCleanupFailure(target, cleanupError);
}
function cleanupFailedPath(target) {
  const cleanupError = removeDirectoryWithRetry(target);
  if (cleanupError) logCleanupFailure(target, cleanupError);
}
function restoreBackup(dest, backup) {
  if (fs__default.existsSync(toExtendedLengthPath(dest))) {
    const cleanupError = removeDirectoryWithRetry(dest);
    if (cleanupError) {
      logCleanupFailure(dest, cleanupError);
      return;
    }
  }
  try {
    fs__default.renameSync(toExtendedLengthPath(backup), toExtendedLengthPath(dest));
  } catch (error) {
    logCleanupFailure(backup, error);
  }
}
function uniquePathSuffix() {
  return `${process.pid.toString(36)}-${Date.now().toString(36)}`;
}
function formatCopyFailures(details, limit = 3) {
  const shown = details.slice(0, limit).map((d) => `${d.path} (${d.code ?? "unknown"}: ${d.error})`).join("; ");
  const more = details.length > limit ? `; +${details.length - limit} more` : "";
  return `${shown}${more}`;
}
function copyDirectoryAtomic(src, dest) {
  const tmp = `${dest}.tmp-${uniquePathSuffix()}`;
  const cleanupDeferredPaths = [];
  let committed = false;
  try {
    fs__default.mkdirSync(toExtendedLengthPath(path__default.dirname(dest)), { recursive: true });
    const copyResult = copyDirRecursiveDetailed(src, tmp);
    if (copyResult.failures > 0) {
      throw new DirectoryCopyError(
        `${copyResult.failures} file(s) failed to copy: ${formatCopyFailures(copyResult.details)}`,
        copyResult.details
      );
    }
    const backup = fs__default.existsSync(toExtendedLengthPath(dest)) ? `${dest}.bak-${uniquePathSuffix()}` : null;
    if (backup) {
      fs__default.renameSync(toExtendedLengthPath(dest), toExtendedLengthPath(backup));
    }
    try {
      fs__default.renameSync(toExtendedLengthPath(tmp), toExtendedLengthPath(dest));
      committed = true;
    } catch (err) {
      if (shouldFallbackToCopyOnRename(err)) {
        try {
          const moveResult = copyDirRecursiveDetailed(tmp, dest);
          if (moveResult.failures > 0) {
            throw new DirectoryCopyError(
              `${moveResult.failures} file(s) failed during fallback move: ${formatCopyFailures(moveResult.details)}`,
              moveResult.details
            );
          }
          committed = true;
        } catch (fallbackError) {
          if (backup) restoreBackup(dest, backup);
          else cleanupFailedPath(dest);
          throw fallbackError;
        }
        cleanupCommittedPath(tmp, cleanupDeferredPaths);
      } else {
        if (backup) restoreBackup(dest, backup);
        throw err;
      }
    }
    if (backup) cleanupCommittedPath(backup, cleanupDeferredPaths);
    return { cleanupDeferredPaths };
  } catch (error) {
    const hint = `[fs-copy] Atomic copy failed. src=${src} tmp=${tmp} dest=${dest} — check for leftover .bak-* or .tmp-* directories if data appears missing.`;
    try {
      console.error(hint);
    } catch {
    }
    if (!committed) cleanupFailedPath(tmp);
    throw error;
  }
}
var zr = Object.defineProperty;
var Ur = (s3, t) => {
  for (var e in t) zr(s3, e, { get: t[e], enumerable: true });
};
var Ds = typeof process == "object" && process ? process : { stdout: null, stderr: null }, Wr = (s3) => !!s3 && typeof s3 == "object" && (s3 instanceof A || s3 instanceof Cs || Gr(s3) || Zr(s3)), Gr = (s3) => !!s3 && typeof s3 == "object" && s3 instanceof EventEmitter && typeof s3.pipe == "function" && s3.pipe !== Cs.Writable.prototype.pipe, Zr = (s3) => !!s3 && typeof s3 == "object" && s3 instanceof EventEmitter && typeof s3.write == "function" && typeof s3.end == "function", Q = Symbol("EOF"), J = Symbol("maybeEmitEnd"), nt = Symbol("emittedEnd"), De = Symbol("emittingEnd"), qt = Symbol("emittedError"), Ne = Symbol("closed"), Ns = Symbol("read"), Ae = Symbol("flush"), As = Symbol("flushChunk"), z = Symbol("encoding"), Mt = Symbol("decoder"), g = Symbol("flowing"), Qt = Symbol("paused"), Bt = Symbol("resume"), b = Symbol("buffer"), N = Symbol("pipes"), _ = Symbol("bufferLength"), bi = Symbol("bufferPush"), Ie = Symbol("bufferShift"), L = Symbol("objectMode"), S = Symbol("destroyed"), _i = Symbol("error"), Oi = Symbol("emitData"), Is = Symbol("emitEnd"), Ti = Symbol("emitEnd2"), Z = Symbol("async"), xi = Symbol("abort"), Ce = Symbol("aborted"), Jt = Symbol("signal"), Rt = Symbol("dataListeners"), C = Symbol("discarded"), jt = (s3) => Promise.resolve().then(s3), Yr = (s3) => s3(), Kr = (s3) => s3 === "end" || s3 === "finish" || s3 === "prefinish", Vr = (s3) => s3 instanceof ArrayBuffer || !!s3 && typeof s3 == "object" && s3.constructor && s3.constructor.name === "ArrayBuffer" && s3.byteLength >= 0, $r = (s3) => !Buffer.isBuffer(s3) && ArrayBuffer.isView(s3), Fe = class {
  src;
  dest;
  opts;
  ondrain;
  constructor(t, e, i) {
    this.src = t, this.dest = e, this.opts = i, this.ondrain = () => t[Bt](), this.dest.on("drain", this.ondrain);
  }
  unpipe() {
    this.dest.removeListener("drain", this.ondrain);
  }
  proxyErrors(t) {
  }
  end() {
    this.unpipe(), this.opts.end && this.dest.end();
  }
}, Li = class extends Fe {
  unpipe() {
    this.src.removeListener("error", this.proxyErrors), super.unpipe();
  }
  constructor(t, e, i) {
    super(t, e, i), this.proxyErrors = (r) => this.dest.emit("error", r), t.on("error", this.proxyErrors);
  }
}, Xr = (s3) => !!s3.objectMode, qr = (s3) => !s3.objectMode && !!s3.encoding && s3.encoding !== "buffer", A = class extends EventEmitter {
  [g] = false;
  [Qt] = false;
  [N] = [];
  [b] = [];
  [L];
  [z];
  [Z];
  [Mt];
  [Q] = false;
  [nt] = false;
  [De] = false;
  [Ne] = false;
  [qt] = null;
  [_] = 0;
  [S] = false;
  [Jt];
  [Ce] = false;
  [Rt] = 0;
  [C] = false;
  writable = true;
  readable = true;
  constructor(...t) {
    let e = t[0] || {};
    if (super(), e.objectMode && typeof e.encoding == "string") throw new TypeError("Encoding and objectMode may not be used together");
    Xr(e) ? (this[L] = true, this[z] = null) : qr(e) ? (this[z] = e.encoding, this[L] = false) : (this[L] = false, this[z] = null), this[Z] = !!e.async, this[Mt] = this[z] ? new StringDecoder(this[z]) : null, e && e.debugExposeBuffer === true && Object.defineProperty(this, "buffer", { get: () => this[b] }), e && e.debugExposePipes === true && Object.defineProperty(this, "pipes", { get: () => this[N] });
    let { signal: i } = e;
    i && (this[Jt] = i, i.aborted ? this[xi]() : i.addEventListener("abort", () => this[xi]()));
  }
  get bufferLength() {
    return this[_];
  }
  get encoding() {
    return this[z];
  }
  set encoding(t) {
    throw new Error("Encoding must be set at instantiation time");
  }
  setEncoding(t) {
    throw new Error("Encoding must be set at instantiation time");
  }
  get objectMode() {
    return this[L];
  }
  set objectMode(t) {
    throw new Error("objectMode must be set at instantiation time");
  }
  get async() {
    return this[Z];
  }
  set async(t) {
    this[Z] = this[Z] || !!t;
  }
  [xi]() {
    this[Ce] = true, this.emit("abort", this[Jt]?.reason), this.destroy(this[Jt]?.reason);
  }
  get aborted() {
    return this[Ce];
  }
  set aborted(t) {
  }
  write(t, e, i) {
    if (this[Ce]) return false;
    if (this[Q]) throw new Error("write after end");
    if (this[S]) return this.emit("error", Object.assign(new Error("Cannot call write after a stream was destroyed"), { code: "ERR_STREAM_DESTROYED" })), true;
    typeof e == "function" && (i = e, e = "utf8"), e || (e = "utf8");
    let r = this[Z] ? jt : Yr;
    if (!this[L] && !Buffer.isBuffer(t)) {
      if ($r(t)) t = Buffer.from(t.buffer, t.byteOffset, t.byteLength);
      else if (Vr(t)) t = Buffer.from(t);
      else if (typeof t != "string") throw new Error("Non-contiguous data written to non-objectMode stream");
    }
    return this[L] ? (this[g] && this[_] !== 0 && this[Ae](true), this[g] ? this.emit("data", t) : this[bi](t), this[_] !== 0 && this.emit("readable"), i && r(i), this[g]) : t.length ? (typeof t == "string" && !(e === this[z] && !this[Mt]?.lastNeed) && (t = Buffer.from(t, e)), Buffer.isBuffer(t) && this[z] && (t = this[Mt].write(t)), this[g] && this[_] !== 0 && this[Ae](true), this[g] ? this.emit("data", t) : this[bi](t), this[_] !== 0 && this.emit("readable"), i && r(i), this[g]) : (this[_] !== 0 && this.emit("readable"), i && r(i), this[g]);
  }
  read(t) {
    if (this[S]) return null;
    if (this[C] = false, this[_] === 0 || t === 0 || t && t > this[_]) return this[J](), null;
    this[L] && (t = null), this[b].length > 1 && !this[L] && (this[b] = [this[z] ? this[b].join("") : Buffer.concat(this[b], this[_])]);
    let e = this[Ns](t || null, this[b][0]);
    return this[J](), e;
  }
  [Ns](t, e) {
    if (this[L]) this[Ie]();
    else {
      let i = e;
      t === i.length || t === null ? this[Ie]() : typeof i == "string" ? (this[b][0] = i.slice(t), e = i.slice(0, t), this[_] -= t) : (this[b][0] = i.subarray(t), e = i.subarray(0, t), this[_] -= t);
    }
    return this.emit("data", e), !this[b].length && !this[Q] && this.emit("drain"), e;
  }
  end(t, e, i) {
    return typeof t == "function" && (i = t, t = void 0), typeof e == "function" && (i = e, e = "utf8"), t !== void 0 && this.write(t, e), i && this.once("end", i), this[Q] = true, this.writable = false, (this[g] || !this[Qt]) && this[J](), this;
  }
  [Bt]() {
    this[S] || (!this[Rt] && !this[N].length && (this[C] = true), this[Qt] = false, this[g] = true, this.emit("resume"), this[b].length ? this[Ae]() : this[Q] ? this[J]() : this.emit("drain"));
  }
  resume() {
    return this[Bt]();
  }
  pause() {
    this[g] = false, this[Qt] = true, this[C] = false;
  }
  get destroyed() {
    return this[S];
  }
  get flowing() {
    return this[g];
  }
  get paused() {
    return this[Qt];
  }
  [bi](t) {
    this[L] ? this[_] += 1 : this[_] += t.length, this[b].push(t);
  }
  [Ie]() {
    return this[L] ? this[_] -= 1 : this[_] -= this[b][0].length, this[b].shift();
  }
  [Ae](t = false) {
    do
      ;
    while (this[As](this[Ie]()) && this[b].length);
    !t && !this[b].length && !this[Q] && this.emit("drain");
  }
  [As](t) {
    return this.emit("data", t), this[g];
  }
  pipe(t, e) {
    if (this[S]) return t;
    this[C] = false;
    let i = this[nt];
    return e = e || {}, t === Ds.stdout || t === Ds.stderr ? e.end = false : e.end = e.end !== false, e.proxyErrors = !!e.proxyErrors, i ? e.end && t.end() : (this[N].push(e.proxyErrors ? new Li(this, t, e) : new Fe(this, t, e)), this[Z] ? jt(() => this[Bt]()) : this[Bt]()), t;
  }
  unpipe(t) {
    let e = this[N].find((i) => i.dest === t);
    e && (this[N].length === 1 ? (this[g] && this[Rt] === 0 && (this[g] = false), this[N] = []) : this[N].splice(this[N].indexOf(e), 1), e.unpipe());
  }
  addListener(t, e) {
    return this.on(t, e);
  }
  on(t, e) {
    let i = super.on(t, e);
    if (t === "data") this[C] = false, this[Rt]++, !this[N].length && !this[g] && this[Bt]();
    else if (t === "readable" && this[_] !== 0) super.emit("readable");
    else if (Kr(t) && this[nt]) super.emit(t), this.removeAllListeners(t);
    else if (t === "error" && this[qt]) {
      let r = e;
      this[Z] ? jt(() => r.call(this, this[qt])) : r.call(this, this[qt]);
    }
    return i;
  }
  removeListener(t, e) {
    return this.off(t, e);
  }
  off(t, e) {
    let i = super.off(t, e);
    return t === "data" && (this[Rt] = this.listeners("data").length, this[Rt] === 0 && !this[C] && !this[N].length && (this[g] = false)), i;
  }
  removeAllListeners(t) {
    let e = super.removeAllListeners(t);
    return (t === "data" || t === void 0) && (this[Rt] = 0, !this[C] && !this[N].length && (this[g] = false)), e;
  }
  get emittedEnd() {
    return this[nt];
  }
  [J]() {
    !this[De] && !this[nt] && !this[S] && this[b].length === 0 && this[Q] && (this[De] = true, this.emit("end"), this.emit("prefinish"), this.emit("finish"), this[Ne] && this.emit("close"), this[De] = false);
  }
  emit(t, ...e) {
    let i = e[0];
    if (t !== "error" && t !== "close" && t !== S && this[S]) return false;
    if (t === "data") return !this[L] && !i ? false : this[Z] ? (jt(() => this[Oi](i)), true) : this[Oi](i);
    if (t === "end") return this[Is]();
    if (t === "close") {
      if (this[Ne] = true, !this[nt] && !this[S]) return false;
      let n = super.emit("close");
      return this.removeAllListeners("close"), n;
    } else if (t === "error") {
      this[qt] = i, super.emit(_i, i);
      let n = !this[Jt] || this.listeners("error").length ? super.emit("error", i) : false;
      return this[J](), n;
    } else if (t === "resume") {
      let n = super.emit("resume");
      return this[J](), n;
    } else if (t === "finish" || t === "prefinish") {
      let n = super.emit(t);
      return this.removeAllListeners(t), n;
    }
    let r = super.emit(t, ...e);
    return this[J](), r;
  }
  [Oi](t) {
    for (let i of this[N]) i.dest.write(t) === false && this.pause();
    let e = this[C] ? false : super.emit("data", t);
    return this[J](), e;
  }
  [Is]() {
    return this[nt] ? false : (this[nt] = true, this.readable = false, this[Z] ? (jt(() => this[Ti]()), true) : this[Ti]());
  }
  [Ti]() {
    if (this[Mt]) {
      let e = this[Mt].end();
      if (e) {
        for (let i of this[N]) i.dest.write(e);
        this[C] || super.emit("data", e);
      }
    }
    for (let e of this[N]) e.end();
    let t = super.emit("end");
    return this.removeAllListeners("end"), t;
  }
  async collect() {
    let t = Object.assign([], { dataLength: 0 });
    this[L] || (t.dataLength = 0);
    let e = this.promise();
    return this.on("data", (i) => {
      t.push(i), this[L] || (t.dataLength += i.length);
    }), await e, t;
  }
  async concat() {
    if (this[L]) throw new Error("cannot concat in objectMode");
    let t = await this.collect();
    return this[z] ? t.join("") : Buffer.concat(t, t.dataLength);
  }
  async promise() {
    return new Promise((t, e) => {
      this.on(S, () => e(new Error("stream destroyed"))), this.on("error", (i) => e(i)), this.on("end", () => t());
    });
  }
  [Symbol.asyncIterator]() {
    this[C] = false;
    let t = false, e = async () => (this.pause(), t = true, { value: void 0, done: true });
    return { next: () => {
      if (t) return e();
      let r = this.read();
      if (r !== null) return Promise.resolve({ done: false, value: r });
      if (this[Q]) return e();
      let n, o, h = (d) => {
        this.off("data", a), this.off("end", l), this.off(S, c), e(), o(d);
      }, a = (d) => {
        this.off("error", h), this.off("end", l), this.off(S, c), this.pause(), n({ value: d, done: !!this[Q] });
      }, l = () => {
        this.off("error", h), this.off("data", a), this.off(S, c), e(), n({ done: true, value: void 0 });
      }, c = () => h(new Error("stream destroyed"));
      return new Promise((d, y) => {
        o = y, n = d, this.once(S, c), this.once("error", h), this.once("end", l), this.once("data", a);
      });
    }, throw: e, return: e, [Symbol.asyncIterator]() {
      return this;
    }, [Symbol.asyncDispose]: async () => {
    } };
  }
  [Symbol.iterator]() {
    this[C] = false;
    let t = false, e = () => (this.pause(), this.off(_i, e), this.off(S, e), this.off("end", e), t = true, { done: true, value: void 0 }), i = () => {
      if (t) return e();
      let r = this.read();
      return r === null ? e() : { done: false, value: r };
    };
    return this.once("end", e), this.once(_i, e), this.once(S, e), { next: i, throw: e, return: e, [Symbol.iterator]() {
      return this;
    }, [Symbol.dispose]: () => {
    } };
  }
  destroy(t) {
    if (this[S]) return t ? this.emit("error", t) : this.emit(S), this;
    this[S] = true, this[C] = true, this[b].length = 0, this[_] = 0;
    let e = this;
    return typeof e.close == "function" && !this[Ne] && e.close(), t ? this.emit("error", t) : this.emit(S), this;
  }
  static get isStream() {
    return Wr;
  }
};
var Jr = fs__default$1.writev, ht = Symbol("_autoClose"), H = Symbol("_close"), te = Symbol("_ended"), m = Symbol("_fd"), Ni = Symbol("_finished"), tt = Symbol("_flags"), Ai = Symbol("_flush"), ki = Symbol("_handleChunk"), vi = Symbol("_makeBuf"), ie = Symbol("_mode"), ke = Symbol("_needDrain"), Ut = Symbol("_onerror"), Ht = Symbol("_onopen"), Ii = Symbol("_onread"), Pt = Symbol("_onwrite"), at = Symbol("_open"), U = Symbol("_path"), ot = Symbol("_pos"), Y = Symbol("_queue"), zt = Symbol("_read"), Ci = Symbol("_readSize"), j = Symbol("_reading"), ee = Symbol("_remain"), Fi = Symbol("_size"), ve = Symbol("_write"), gt = Symbol("_writing"), Me = Symbol("_defaultFlag"), bt = Symbol("_errored"), _t = class extends A {
  [bt] = false;
  [m];
  [U];
  [Ci];
  [j] = false;
  [Fi];
  [ee];
  [ht];
  constructor(t, e) {
    if (e = e || {}, super(e), this.readable = true, this.writable = false, typeof t != "string") throw new TypeError("path must be a string");
    this[bt] = false, this[m] = typeof e.fd == "number" ? e.fd : void 0, this[U] = t, this[Ci] = e.readSize || 16 * 1024 * 1024, this[j] = false, this[Fi] = typeof e.size == "number" ? e.size : 1 / 0, this[ee] = this[Fi], this[ht] = typeof e.autoClose == "boolean" ? e.autoClose : true, typeof this[m] == "number" ? this[zt]() : this[at]();
  }
  get fd() {
    return this[m];
  }
  get path() {
    return this[U];
  }
  write() {
    throw new TypeError("this is a readable stream");
  }
  end() {
    throw new TypeError("this is a readable stream");
  }
  [at]() {
    fs__default$1.open(this[U], "r", (t, e) => this[Ht](t, e));
  }
  [Ht](t, e) {
    t ? this[Ut](t) : (this[m] = e, this.emit("open", e), this[zt]());
  }
  [vi]() {
    return Buffer.allocUnsafe(Math.min(this[Ci], this[ee]));
  }
  [zt]() {
    if (!this[j]) {
      this[j] = true;
      let t = this[vi]();
      if (t.length === 0) return process.nextTick(() => this[Ii](null, 0, t));
      fs__default$1.read(this[m], t, 0, t.length, null, (e, i, r) => this[Ii](e, i, r));
    }
  }
  [Ii](t, e, i) {
    this[j] = false, t ? this[Ut](t) : this[ki](e, i) && this[zt]();
  }
  [H]() {
    if (this[ht] && typeof this[m] == "number") {
      let t = this[m];
      this[m] = void 0, fs__default$1.close(t, (e) => e ? this.emit("error", e) : this.emit("close"));
    }
  }
  [Ut](t) {
    this[j] = true, this[H](), this.emit("error", t);
  }
  [ki](t, e) {
    let i = false;
    return this[ee] -= t, t > 0 && (i = super.write(t < e.length ? e.subarray(0, t) : e)), (t === 0 || this[ee] <= 0) && (i = false, this[H](), super.end()), i;
  }
  emit(t, ...e) {
    switch (t) {
      case "prefinish":
      case "finish":
        return false;
      case "drain":
        return typeof this[m] == "number" && this[zt](), false;
      case "error":
        return this[bt] ? false : (this[bt] = true, super.emit(t, ...e));
      default:
        return super.emit(t, ...e);
    }
  }
}, Be = class extends _t {
  [at]() {
    let t = true;
    try {
      this[Ht](null, fs__default$1.openSync(this[U], "r")), t = false;
    } finally {
      t && this[H]();
    }
  }
  [zt]() {
    let t = true;
    try {
      if (!this[j]) {
        this[j] = true;
        do {
          let e = this[vi](), i = e.length === 0 ? 0 : fs__default$1.readSync(this[m], e, 0, e.length, null);
          if (!this[ki](i, e)) break;
        } while (true);
        this[j] = false;
      }
      t = false;
    } finally {
      t && this[H]();
    }
  }
  [H]() {
    if (this[ht] && typeof this[m] == "number") {
      let t = this[m];
      this[m] = void 0, fs__default$1.closeSync(t), this.emit("close");
    }
  }
}, et = class extends require$$0 {
  readable = false;
  writable = true;
  [bt] = false;
  [gt] = false;
  [te] = false;
  [Y] = [];
  [ke] = false;
  [U];
  [ie];
  [ht];
  [m];
  [Me];
  [tt];
  [Ni] = false;
  [ot];
  constructor(t, e) {
    e = e || {}, super(e), this[U] = t, this[m] = typeof e.fd == "number" ? e.fd : void 0, this[ie] = e.mode === void 0 ? 438 : e.mode, this[ot] = typeof e.start == "number" ? e.start : void 0, this[ht] = typeof e.autoClose == "boolean" ? e.autoClose : true;
    let i = this[ot] !== void 0 ? "r+" : "w";
    this[Me] = e.flags === void 0, this[tt] = e.flags === void 0 ? i : e.flags, this[m] === void 0 && this[at]();
  }
  emit(t, ...e) {
    if (t === "error") {
      if (this[bt]) return false;
      this[bt] = true;
    }
    return super.emit(t, ...e);
  }
  get fd() {
    return this[m];
  }
  get path() {
    return this[U];
  }
  [Ut](t) {
    this[H](), this[gt] = true, this.emit("error", t);
  }
  [at]() {
    fs__default$1.open(this[U], this[tt], this[ie], (t, e) => this[Ht](t, e));
  }
  [Ht](t, e) {
    this[Me] && this[tt] === "r+" && t && t.code === "ENOENT" ? (this[tt] = "w", this[at]()) : t ? this[Ut](t) : (this[m] = e, this.emit("open", e), this[gt] || this[Ai]());
  }
  end(t, e) {
    return t && this.write(t, e), this[te] = true, !this[gt] && !this[Y].length && typeof this[m] == "number" && this[Pt](null, 0), this;
  }
  write(t, e) {
    return typeof t == "string" && (t = Buffer.from(t, e)), this[te] ? (this.emit("error", new Error("write() after end()")), false) : this[m] === void 0 || this[gt] || this[Y].length ? (this[Y].push(t), this[ke] = true, false) : (this[gt] = true, this[ve](t), true);
  }
  [ve](t) {
    fs__default$1.write(this[m], t, 0, t.length, this[ot], (e, i) => this[Pt](e, i));
  }
  [Pt](t, e) {
    t ? this[Ut](t) : (this[ot] !== void 0 && typeof e == "number" && (this[ot] += e), this[Y].length ? this[Ai]() : (this[gt] = false, this[te] && !this[Ni] ? (this[Ni] = true, this[H](), this.emit("finish")) : this[ke] && (this[ke] = false, this.emit("drain"))));
  }
  [Ai]() {
    if (this[Y].length === 0) this[te] && this[Pt](null, 0);
    else if (this[Y].length === 1) this[ve](this[Y].pop());
    else {
      let t = this[Y];
      this[Y] = [], Jr(this[m], t, this[ot], (e, i) => this[Pt](e, i));
    }
  }
  [H]() {
    if (this[ht] && typeof this[m] == "number") {
      let t = this[m];
      this[m] = void 0, fs__default$1.close(t, (e) => e ? this.emit("error", e) : this.emit("close"));
    }
  }
}, Wt = class extends et {
  [at]() {
    let t;
    if (this[Me] && this[tt] === "r+") try {
      t = fs__default$1.openSync(this[U], this[tt], this[ie]);
    } catch (e) {
      if (e?.code === "ENOENT") return this[tt] = "w", this[at]();
      throw e;
    }
    else t = fs__default$1.openSync(this[U], this[tt], this[ie]);
    this[Ht](null, t);
  }
  [H]() {
    if (this[ht] && typeof this[m] == "number") {
      let t = this[m];
      this[m] = void 0, fs__default$1.closeSync(t), this.emit("close");
    }
  }
  [ve](t) {
    let e = true;
    try {
      this[Pt](null, fs__default$1.writeSync(this[m], t, 0, t.length, this[ot])), e = false;
    } finally {
      if (e) try {
        this[H]();
      } catch {
      }
    }
  }
};
var jr = /* @__PURE__ */ new Map([["C", "cwd"], ["f", "file"], ["z", "gzip"], ["P", "preservePaths"], ["U", "unlink"], ["strip-components", "strip"], ["stripComponents", "strip"], ["keep-newer", "newer"], ["keepNewer", "newer"], ["keep-newer-files", "newer"], ["keepNewerFiles", "newer"], ["k", "keep"], ["keep-existing", "keep"], ["keepExisting", "keep"], ["m", "noMtime"], ["no-mtime", "noMtime"], ["p", "preserveOwner"], ["L", "follow"], ["h", "follow"], ["onentry", "onReadEntry"]]), Fs = (s3) => !!s3.sync && !!s3.file, ks = (s3) => !s3.sync && !!s3.file, vs = (s3) => !!s3.sync && !s3.file, Ms = (s3) => !s3.sync && !s3.file;
var Bs = (s3) => !!s3.file;
var tn = (s3) => {
  let t = jr.get(s3);
  return t || s3;
}, se = (s3 = {}) => {
  if (!s3) return {};
  let t = {};
  for (let [e, i] of Object.entries(s3)) {
    let r = tn(e);
    t[r] = i;
  }
  return t.chmod === void 0 && t.noChmod === false && (t.chmod = true), delete t.noChmod, t;
};
var K = (s3, t, e, i, r) => Object.assign((n = [], o, h) => {
  Array.isArray(n) && (o = n, n = {}), typeof o == "function" && (h = o, o = void 0), o = o ? Array.from(o) : [];
  let a = se(n);
  if (r?.(a, o), Fs(a)) {
    if (typeof h == "function") throw new TypeError("callback not supported for sync tar functions");
    return s3(a, o);
  } else if (ks(a)) {
    let l = t(a, o);
    return h ? l.then(() => h(), h) : l;
  } else if (vs(a)) {
    if (typeof h == "function") throw new TypeError("callback not supported for sync tar functions");
    return e(a, o);
  } else if (Ms(a)) {
    if (typeof h == "function") throw new TypeError("callback only supported with file option");
    return i(a, o);
  }
  throw new Error("impossible options??");
}, { syncFile: s3, asyncFile: t, syncNoFile: e, asyncNoFile: i, validate: r });
var sn = zlib__default.constants || { ZLIB_VERNUM: 4736 }, M = Object.freeze(Object.assign(/* @__PURE__ */ Object.create(null), { Z_NO_FLUSH: 0, Z_PARTIAL_FLUSH: 1, Z_SYNC_FLUSH: 2, Z_FULL_FLUSH: 3, Z_FINISH: 4, Z_BLOCK: 5, Z_OK: 0, Z_STREAM_END: 1, Z_NEED_DICT: 2, Z_ERRNO: -1, Z_STREAM_ERROR: -2, Z_DATA_ERROR: -3, Z_MEM_ERROR: -4, Z_BUF_ERROR: -5, Z_VERSION_ERROR: -6, Z_NO_COMPRESSION: 0, Z_BEST_SPEED: 1, Z_BEST_COMPRESSION: 9, Z_DEFAULT_COMPRESSION: -1, Z_FILTERED: 1, Z_HUFFMAN_ONLY: 2, Z_RLE: 3, Z_FIXED: 4, Z_DEFAULT_STRATEGY: 0, DEFLATE: 1, INFLATE: 2, GZIP: 3, GUNZIP: 4, DEFLATERAW: 5, INFLATERAW: 6, UNZIP: 7, BROTLI_DECODE: 8, BROTLI_ENCODE: 9, Z_MIN_WINDOWBITS: 8, Z_MAX_WINDOWBITS: 15, Z_DEFAULT_WINDOWBITS: 15, Z_MIN_CHUNK: 64, Z_MAX_CHUNK: 1 / 0, Z_DEFAULT_CHUNK: 16384, Z_MIN_MEMLEVEL: 1, Z_MAX_MEMLEVEL: 9, Z_DEFAULT_MEMLEVEL: 8, Z_MIN_LEVEL: -1, Z_MAX_LEVEL: 9, Z_DEFAULT_LEVEL: -1, BROTLI_OPERATION_PROCESS: 0, BROTLI_OPERATION_FLUSH: 1, BROTLI_OPERATION_FINISH: 2, BROTLI_OPERATION_EMIT_METADATA: 3, BROTLI_MODE_GENERIC: 0, BROTLI_MODE_TEXT: 1, BROTLI_MODE_FONT: 2, BROTLI_DEFAULT_MODE: 0, BROTLI_MIN_QUALITY: 0, BROTLI_MAX_QUALITY: 11, BROTLI_DEFAULT_QUALITY: 11, BROTLI_MIN_WINDOW_BITS: 10, BROTLI_MAX_WINDOW_BITS: 24, BROTLI_LARGE_MAX_WINDOW_BITS: 30, BROTLI_DEFAULT_WINDOW: 22, BROTLI_MIN_INPUT_BLOCK_BITS: 16, BROTLI_MAX_INPUT_BLOCK_BITS: 24, BROTLI_PARAM_MODE: 0, BROTLI_PARAM_QUALITY: 1, BROTLI_PARAM_LGWIN: 2, BROTLI_PARAM_LGBLOCK: 3, BROTLI_PARAM_DISABLE_LITERAL_CONTEXT_MODELING: 4, BROTLI_PARAM_SIZE_HINT: 5, BROTLI_PARAM_LARGE_WINDOW: 6, BROTLI_PARAM_NPOSTFIX: 7, BROTLI_PARAM_NDIRECT: 8, BROTLI_DECODER_RESULT_ERROR: 0, BROTLI_DECODER_RESULT_SUCCESS: 1, BROTLI_DECODER_RESULT_NEEDS_MORE_INPUT: 2, BROTLI_DECODER_RESULT_NEEDS_MORE_OUTPUT: 3, BROTLI_DECODER_PARAM_DISABLE_RING_BUFFER_REALLOCATION: 0, BROTLI_DECODER_PARAM_LARGE_WINDOW: 1, BROTLI_DECODER_NO_ERROR: 0, BROTLI_DECODER_SUCCESS: 1, BROTLI_DECODER_NEEDS_MORE_INPUT: 2, BROTLI_DECODER_NEEDS_MORE_OUTPUT: 3, BROTLI_DECODER_ERROR_FORMAT_EXUBERANT_NIBBLE: -1, BROTLI_DECODER_ERROR_FORMAT_RESERVED: -2, BROTLI_DECODER_ERROR_FORMAT_EXUBERANT_META_NIBBLE: -3, BROTLI_DECODER_ERROR_FORMAT_SIMPLE_HUFFMAN_ALPHABET: -4, BROTLI_DECODER_ERROR_FORMAT_SIMPLE_HUFFMAN_SAME: -5, BROTLI_DECODER_ERROR_FORMAT_CL_SPACE: -6, BROTLI_DECODER_ERROR_FORMAT_HUFFMAN_SPACE: -7, BROTLI_DECODER_ERROR_FORMAT_CONTEXT_MAP_REPEAT: -8, BROTLI_DECODER_ERROR_FORMAT_BLOCK_LENGTH_1: -9, BROTLI_DECODER_ERROR_FORMAT_BLOCK_LENGTH_2: -10, BROTLI_DECODER_ERROR_FORMAT_TRANSFORM: -11, BROTLI_DECODER_ERROR_FORMAT_DICTIONARY: -12, BROTLI_DECODER_ERROR_FORMAT_WINDOW_BITS: -13, BROTLI_DECODER_ERROR_FORMAT_PADDING_1: -14, BROTLI_DECODER_ERROR_FORMAT_PADDING_2: -15, BROTLI_DECODER_ERROR_FORMAT_DISTANCE: -16, BROTLI_DECODER_ERROR_DICTIONARY_NOT_SET: -19, BROTLI_DECODER_ERROR_INVALID_ARGUMENTS: -20, BROTLI_DECODER_ERROR_ALLOC_CONTEXT_MODES: -21, BROTLI_DECODER_ERROR_ALLOC_TREE_GROUPS: -22, BROTLI_DECODER_ERROR_ALLOC_CONTEXT_MAP: -25, BROTLI_DECODER_ERROR_ALLOC_RING_BUFFER_1: -26, BROTLI_DECODER_ERROR_ALLOC_RING_BUFFER_2: -27, BROTLI_DECODER_ERROR_ALLOC_BLOCK_TYPE_TREES: -30, BROTLI_DECODER_ERROR_UNREACHABLE: -31 }, sn));
var rn = Buffer$1.concat, zs = Object.getOwnPropertyDescriptor(Buffer$1, "concat"), nn = (s3) => s3, Bi = zs?.writable === true || zs?.set !== void 0 ? (s3) => {
  Buffer$1.concat = s3 ? nn : rn;
} : (s3) => {
}, Tt = Symbol("_superWrite"), Gt = class extends Error {
  code;
  errno;
  constructor(t, e) {
    super("zlib: " + t.message, { cause: t }), this.code = t.code, this.errno = t.errno, this.code || (this.code = "ZLIB_ERROR"), this.message = "zlib: " + t.message, Error.captureStackTrace(this, e ?? this.constructor);
  }
  get name() {
    return "ZlibError";
  }
}, Pi = Symbol("flushFlag"), re = class extends A {
  #t = false;
  #i = false;
  #s;
  #n;
  #r;
  #e;
  #o;
  get sawError() {
    return this.#t;
  }
  get handle() {
    return this.#e;
  }
  get flushFlag() {
    return this.#s;
  }
  constructor(t, e) {
    if (!t || typeof t != "object") throw new TypeError("invalid options for ZlibBase constructor");
    if (super(t), this.#s = t.flush ?? 0, this.#n = t.finishFlush ?? 0, this.#r = t.fullFlushFlag ?? 0, typeof zlib[e] != "function") throw new TypeError("Compression method not supported: " + e);
    try {
      this.#e = new zlib[e](t);
    } catch (i) {
      throw new Gt(i, this.constructor);
    }
    this.#o = (i) => {
      this.#t || (this.#t = true, this.close(), this.emit("error", i));
    }, this.#e?.on("error", (i) => this.#o(new Gt(i))), this.once("end", () => this.close);
  }
  close() {
    this.#e && (this.#e.close(), this.#e = void 0, this.emit("close"));
  }
  reset() {
    if (!this.#t) return zi(this.#e, "zlib binding closed"), this.#e.reset?.();
  }
  flush(t) {
    this.ended || (typeof t != "number" && (t = this.#r), this.write(Object.assign(Buffer$1.alloc(0), { [Pi]: t })));
  }
  end(t, e, i) {
    return typeof t == "function" && (i = t, e = void 0, t = void 0), typeof e == "function" && (i = e, e = void 0), t && (e ? this.write(t, e) : this.write(t)), this.flush(this.#n), this.#i = true, super.end(i);
  }
  get ended() {
    return this.#i;
  }
  [Tt](t) {
    return super.write(t);
  }
  write(t, e, i) {
    if (typeof e == "function" && (i = e, e = "utf8"), typeof t == "string" && (t = Buffer$1.from(t, e)), this.#t) return;
    zi(this.#e, "zlib binding closed");
    let r = this.#e._handle, n = r.close;
    r.close = () => {
    };
    let o = this.#e.close;
    this.#e.close = () => {
    }, Bi(true);
    let h;
    try {
      let l = typeof t[Pi] == "number" ? t[Pi] : this.#s;
      h = this.#e._processChunk(t, l), Bi(false);
    } catch (l) {
      Bi(false), this.#o(new Gt(l, this.write));
    } finally {
      this.#e && (this.#e._handle = r, r.close = n, this.#e.close = o, this.#e.removeAllListeners("error"));
    }
    this.#e && this.#e.on("error", (l) => this.#o(new Gt(l, this.write)));
    let a;
    if (h) if (Array.isArray(h) && h.length > 0) {
      let l = h[0];
      a = this[Tt](Buffer$1.from(l));
      for (let c = 1; c < h.length; c++) a = this[Tt](h[c]);
    } else a = this[Tt](Buffer$1.from(h));
    return i && i(), a;
  }
}, Pe = class extends re {
  #t;
  #i;
  constructor(t, e) {
    t = t || {}, t.flush = t.flush || M.Z_NO_FLUSH, t.finishFlush = t.finishFlush || M.Z_FINISH, t.fullFlushFlag = M.Z_FULL_FLUSH, super(t, e), this.#t = t.level, this.#i = t.strategy;
  }
  params(t, e) {
    if (!this.sawError) {
      if (!this.handle) throw new Error("cannot switch params when binding is closed");
      if (!this.handle.params) throw new Error("not supported in this implementation");
      if (this.#t !== t || this.#i !== e) {
        this.flush(M.Z_SYNC_FLUSH), zi(this.handle, "zlib binding closed");
        let i = this.handle.flush;
        this.handle.flush = (r, n) => {
          typeof r == "function" && (n = r, r = this.flushFlag), this.flush(r), n?.();
        };
        try {
          this.handle.params(t, e);
        } finally {
          this.handle.flush = i;
        }
        this.handle && (this.#t = t, this.#i = e);
      }
    }
  }
};
var ze = class extends Pe {
  #t;
  constructor(t) {
    super(t, "Gzip"), this.#t = t && !!t.portable;
  }
  [Tt](t) {
    return this.#t ? (this.#t = false, t[9] = 255, super[Tt](t)) : super[Tt](t);
  }
};
var Ue = class extends Pe {
  constructor(t) {
    super(t, "Unzip");
  }
}, He = class extends re {
  constructor(t, e) {
    t = t || {}, t.flush = t.flush || M.BROTLI_OPERATION_PROCESS, t.finishFlush = t.finishFlush || M.BROTLI_OPERATION_FINISH, t.fullFlushFlag = M.BROTLI_OPERATION_FLUSH, super(t, e);
  }
}, We = class extends He {
  constructor(t) {
    super(t, "BrotliCompress");
  }
}, Ge = class extends He {
  constructor(t) {
    super(t, "BrotliDecompress");
  }
}, Ze = class extends re {
  constructor(t, e) {
    t = t || {}, t.flush = t.flush || M.ZSTD_e_continue, t.finishFlush = t.finishFlush || M.ZSTD_e_end, t.fullFlushFlag = M.ZSTD_e_flush, super(t, e);
  }
}, Ye = class extends Ze {
  constructor(t) {
    super(t, "ZstdCompress");
  }
}, Ke = class extends Ze {
  constructor(t) {
    super(t, "ZstdDecompress");
  }
};
var Us = (s3, t) => {
  if (Number.isSafeInteger(s3)) s3 < 0 ? an(s3, t) : hn(s3, t);
  else throw Error("cannot encode number outside of javascript safe integer range");
  return t;
}, hn = (s3, t) => {
  t[0] = 128;
  for (var e = t.length; e > 1; e--) t[e - 1] = s3 & 255, s3 = Math.floor(s3 / 256);
}, an = (s3, t) => {
  t[0] = 255;
  var e = false;
  s3 = s3 * -1;
  for (var i = t.length; i > 1; i--) {
    var r = s3 & 255;
    s3 = Math.floor(s3 / 256), e ? t[i - 1] = Ws(r) : r === 0 ? t[i - 1] = 0 : (e = true, t[i - 1] = Gs(r));
  }
}, Hs = (s3) => {
  let t = s3[0], e = t === 128 ? cn(s3.subarray(1, s3.length)) : t === 255 ? ln(s3) : null;
  if (e === null) throw Error("invalid base256 encoding");
  if (!Number.isSafeInteger(e)) throw Error("parsed number outside of javascript safe integer range");
  return e;
}, ln = (s3) => {
  for (var t = s3.length, e = 0, i = false, r = t - 1; r > -1; r--) {
    var n = Number(s3[r]), o;
    i ? o = Ws(n) : n === 0 ? o = n : (i = true, o = Gs(n)), o !== 0 && (e -= o * Math.pow(256, t - r - 1));
  }
  return e;
}, cn = (s3) => {
  for (var t = s3.length, e = 0, i = t - 1; i > -1; i--) {
    var r = Number(s3[i]);
    r !== 0 && (e += r * Math.pow(256, t - i - 1));
  }
  return e;
}, Ws = (s3) => (255 ^ s3) & 255, Gs = (s3) => (255 ^ s3) + 1 & 255;
var Hi = {};
Ur(Hi, { code: () => Ve, isCode: () => ne, isName: () => dn, name: () => oe, normalFsTypes: () => Ui });
var ne = (s3) => oe.has(s3), dn = (s3) => Ve.has(s3), Ui = /* @__PURE__ */ new Set(["0", "", "1", "2", "3", "4", "5", "6", "7", "D"]), oe = /* @__PURE__ */ new Map([["0", "File"], ["", "OldFile"], ["1", "Link"], ["2", "SymbolicLink"], ["3", "CharacterDevice"], ["4", "BlockDevice"], ["5", "Directory"], ["6", "FIFO"], ["7", "ContiguousFile"], ["g", "GlobalExtendedHeader"], ["x", "ExtendedHeader"], ["A", "SolarisACL"], ["D", "GNUDumpDir"], ["I", "Inode"], ["K", "NextFileHasLongLinkpath"], ["L", "NextFileHasLongPath"], ["M", "ContinuationFile"], ["N", "OldGnuLongPath"], ["S", "SparseFile"], ["V", "TapeVolumeHeader"], ["X", "OldExtendedHeader"]]), Ve = new Map(Array.from(oe).map((s3) => [s3[1], s3[0]]));
var un = (s3) => s3 === void 0 || s3 < 0 ? void 0 : s3, F = class {
  cksumValid = false;
  needPax = false;
  nullBlock = false;
  block;
  path;
  mode;
  uid;
  gid;
  size;
  cksum;
  #t = "Unsupported";
  linkpath;
  uname;
  gname;
  devmaj = 0;
  devmin = 0;
  atime;
  ctime;
  mtime;
  charset;
  comment;
  constructor(t, e = 0, i, r) {
    Buffer.isBuffer(t) ? this.decode(t, e || 0, i, r) : t && this.#i(t);
  }
  decode(t, e, i, r) {
    if (e || (e = 0), !t || !(t.length >= e + 512)) throw new Error("need 512 bytes for header");
    let n = xt(t, e + 156, 1), o = Ui.has(n), h = o ? i : void 0, a = o ? r : void 0;
    if (this.path = h?.path ?? xt(t, e, 100), this.mode = h?.mode ?? a?.mode ?? lt(t, e + 100, 8), this.uid = h?.uid ?? a?.uid ?? lt(t, e + 108, 8), this.gid = h?.gid ?? a?.gid ?? lt(t, e + 116, 8), this.size = un(h?.size ?? a?.size ?? lt(t, e + 124, 12)), this.mtime = h?.mtime ?? a?.mtime ?? Wi(t, e + 136, 12), this.cksum = lt(t, e + 148, 12), a && this.#i(a, true), h && this.#i(h), ne(n) && (this.#t = n || "0"), this.#t === "0" && this.path.slice(-1) === "/" && (this.#t = "5"), this.#t === "5" && (this.size = 0), this.linkpath = xt(t, e + 157, 100), t.subarray(e + 257, e + 265).toString() === "ustar\x0000") if (this.uname = h?.uname ?? a?.uname ?? xt(t, e + 265, 32), this.gname = h?.gname ?? a?.gname ?? xt(t, e + 297, 32), this.devmaj = h?.devmaj ?? a?.devmaj ?? lt(t, e + 329, 8) ?? 0, this.devmin = h?.devmin ?? a?.devmin ?? lt(t, e + 337, 8) ?? 0, t[e + 475] !== 0) {
      let c = xt(t, e + 345, 155);
      this.path = c + "/" + this.path;
    } else {
      let c = xt(t, e + 345, 130);
      c && (this.path = c + "/" + this.path), this.atime = i?.atime ?? r?.atime ?? Wi(t, e + 476, 12), this.ctime = i?.ctime ?? r?.ctime ?? Wi(t, e + 488, 12);
    }
    let l = 256;
    for (let c = e; c < e + 148; c++) l += t[c];
    for (let c = e + 156; c < e + 512; c++) l += t[c];
    this.cksumValid = l === this.cksum, this.cksum === void 0 && l === 256 && (this.nullBlock = true);
  }
  #i(t, e = false) {
    Object.assign(this, Object.fromEntries(Object.entries(t).filter(([i, r]) => !(r == null || i === "size" && Number(r) < 0 || i === "path" && e || i === "linkpath" && e || i === "global"))));
  }
  encode(t, e = 0) {
    if (t || (t = this.block = Buffer.alloc(512)), this.#t === "Unsupported" && (this.#t = "0"), !(t.length >= e + 512)) throw new Error("need 512 bytes for header");
    let i = this.ctime || this.atime ? 130 : 155, r = mn(this.path || "", i), n = r[0], o = r[1];
    this.needPax = !!r[2], this.needPax = Lt(t, e, 100, n) || this.needPax, this.needPax = ct(t, e + 100, 8, this.mode) || this.needPax, this.needPax = ct(t, e + 108, 8, this.uid) || this.needPax, this.needPax = ct(t, e + 116, 8, this.gid) || this.needPax, this.needPax = ct(t, e + 124, 12, this.size) || this.needPax, this.needPax = Gi(t, e + 136, 12, this.mtime) || this.needPax, t[e + 156] = Number(this.#t.codePointAt(0)), this.needPax = Lt(t, e + 157, 100, this.linkpath) || this.needPax, t.write("ustar\x0000", e + 257, 8), this.needPax = Lt(t, e + 265, 32, this.uname) || this.needPax, this.needPax = Lt(t, e + 297, 32, this.gname) || this.needPax, this.needPax = ct(t, e + 329, 8, this.devmaj) || this.needPax, this.needPax = ct(t, e + 337, 8, this.devmin) || this.needPax, this.needPax = Lt(t, e + 345, i, o) || this.needPax, t[e + 475] !== 0 ? this.needPax = Lt(t, e + 345, 155, o) || this.needPax : (this.needPax = Lt(t, e + 345, 130, o) || this.needPax, this.needPax = Gi(t, e + 476, 12, this.atime) || this.needPax, this.needPax = Gi(t, e + 488, 12, this.ctime) || this.needPax);
    let h = 256;
    for (let a = e; a < e + 148; a++) h += t[a];
    for (let a = e + 156; a < e + 512; a++) h += t[a];
    return this.cksum = h, ct(t, e + 148, 8, this.cksum), this.cksumValid = true, this.needPax;
  }
  get type() {
    return this.#t === "Unsupported" ? this.#t : oe.get(this.#t);
  }
  get typeKey() {
    return this.#t;
  }
  set type(t) {
    let e = String(Ve.get(t));
    if (ne(e) || e === "Unsupported") this.#t = e;
    else if (ne(t)) this.#t = t;
    else throw new TypeError("invalid entry type: " + t);
  }
}, mn = (s3, t) => {
  let i = s3, r = "", n, o = posix.parse(s3).root || ".";
  if (Buffer.byteLength(i) < 100) n = [i, r, false];
  else {
    r = posix.dirname(i), i = posix.basename(i);
    do
      Buffer.byteLength(i) <= 100 && Buffer.byteLength(r) <= t ? n = [i, r, false] : Buffer.byteLength(i) > 100 && Buffer.byteLength(r) <= t ? n = [i.slice(0, 99), r, true] : (i = posix.join(posix.basename(r), i), r = posix.dirname(r));
    while (r !== o && n === void 0);
    n || (n = [s3.slice(0, 99), "", true]);
  }
  return n;
}, xt = (s3, t, e) => s3.subarray(t, t + e).toString("utf8").replace(/\0.*/, ""), Wi = (s3, t, e) => pn(lt(s3, t, e)), pn = (s3) => s3 === void 0 ? void 0 : new Date(s3 * 1e3), lt = (s3, t, e) => Number(s3[t]) & 128 ? Hs(s3.subarray(t, t + e)) : wn(s3, t, e), En = (s3) => isNaN(s3) ? void 0 : s3, wn = (s3, t, e) => En(parseInt(s3.subarray(t, t + e).toString("utf8").replace(/\0.*$/, "").trim(), 8)), Sn = { 12: 8589934591, 8: 2097151 }, ct = (s3, t, e, i) => i === void 0 ? false : i > Sn[e] || i < 0 ? (Us(i, s3.subarray(t, t + e)), true) : (yn(s3, t, e, i), false), yn = (s3, t, e, i) => s3.write(Rn(i, e), t, e, "ascii"), Rn = (s3, t) => gn(Math.floor(s3).toString(8), t), gn = (s3, t) => (s3.length === t - 1 ? s3 : new Array(t - s3.length - 1).join("0") + s3 + " ") + "\0", Gi = (s3, t, e, i) => i === void 0 ? false : ct(s3, t, e, i.getTime() / 1e3), bn = new Array(156).join("\0"), Lt = (s3, t, e, i) => i === void 0 ? false : (s3.write(i + bn, t, e, "utf8"), i.length !== Buffer.byteLength(i) || i.length > e);
var ft = class s {
  atime;
  mtime;
  ctime;
  charset;
  comment;
  gid;
  uid;
  gname;
  uname;
  linkpath;
  dev;
  ino;
  nlink;
  path;
  size;
  mode;
  global;
  constructor(t, e = false) {
    this.atime = t.atime, this.charset = t.charset, this.comment = t.comment, this.ctime = t.ctime, this.dev = t.dev, this.gid = t.gid, this.global = e, this.gname = t.gname, this.ino = t.ino, this.linkpath = t.linkpath, this.mtime = t.mtime, this.nlink = t.nlink, this.path = t.path, this.size = t.size, this.uid = t.uid, this.uname = t.uname;
  }
  encode() {
    let t = this.encodeBody();
    if (t === "") return Buffer.allocUnsafe(0);
    let e = Buffer.byteLength(t), i = 512 * Math.ceil(1 + e / 512), r = Buffer.allocUnsafe(i);
    for (let n = 0; n < 512; n++) r[n] = 0;
    new F({ path: ("PaxHeader/" + basename(this.path ?? "")).slice(0, 99), mode: this.mode || 420, uid: this.uid, gid: this.gid, size: e, mtime: this.mtime, type: this.global ? "GlobalExtendedHeader" : "ExtendedHeader", linkpath: "", uname: this.uname || "", gname: this.gname || "", devmaj: 0, devmin: 0, atime: this.atime, ctime: this.ctime }).encode(r), r.write(t, 512, e, "utf8");
    for (let n = e + 512; n < r.length; n++) r[n] = 0;
    return r;
  }
  encodeBody() {
    return this.encodeField("path") + this.encodeField("ctime") + this.encodeField("atime") + this.encodeField("dev") + this.encodeField("ino") + this.encodeField("nlink") + this.encodeField("charset") + this.encodeField("comment") + this.encodeField("gid") + this.encodeField("gname") + this.encodeField("linkpath") + this.encodeField("mtime") + this.encodeField("size") + this.encodeField("uid") + this.encodeField("uname");
  }
  encodeField(t) {
    if (this[t] === void 0) return "";
    let e = this[t], i = e instanceof Date ? e.getTime() / 1e3 : e, r = " " + (t === "dev" || t === "ino" || t === "nlink" ? "SCHILY." : "") + t + "=" + i + `
`, n = Buffer.byteLength(r), o = Math.floor(Math.log(n) / Math.log(10)) + 1;
    return n + o >= Math.pow(10, o) && (o += 1), o + n + r;
  }
  static parse(t, e, i = false) {
    return new s(On(Tn(t), e), i);
  }
}, On = (s3, t) => t ? Object.assign({}, t, s3) : s3, Tn = (s3) => s3.replace(/\n$/, "").split(`
`).reduce(xn, /* @__PURE__ */ Object.create(null)), xn = (s3, t) => {
  let e = parseInt(t, 10);
  if (e !== Buffer.byteLength(t) + 1) return s3;
  t = t.slice((e + " ").length);
  let i = t.split("="), r = i.shift();
  if (!r) return s3;
  let n = r.replace(/^SCHILY\.(dev|ino|nlink)/, "$1"), o = i.join("=").replace(/\0.*/, "");
  switch (n) {
    case "path":
    case "linkpath":
    case "type":
    case "charset":
    case "comment":
    case "gname":
    case "uname":
      s3[n] = o;
      break;
    case "ctime":
    case "atime":
    case "mtime":
      s3[n] = new Date(Number(o) * 1e3);
      break;
    case "size":
      let h = +o;
      h >= 0 && (s3[n] = h);
      break;
    case "gid":
    case "uid":
    case "dev":
    case "ino":
    case "nlink":
    case "mode":
      s3[n] = +o;
      break;
  }
  return s3;
};
var Ln = process.env.TESTING_TAR_FAKE_PLATFORM || process.platform, f = Ln !== "win32" ? (s3) => String(s3) : (s3) => String(s3).replaceAll(/\\/g, "/");
var $e = class extends A {
  extended;
  globalExtended;
  header;
  startBlockSize;
  blockRemain;
  remain;
  type;
  meta = false;
  ignore = false;
  path;
  mode;
  uid;
  gid;
  uname;
  gname;
  size = 0;
  mtime;
  atime;
  ctime;
  linkpath;
  dev;
  ino;
  nlink;
  invalid = false;
  absolute;
  unsupported = false;
  constructor(t, e, i) {
    switch (super({}), this.pause(), this.extended = e, this.globalExtended = i, this.header = t, this.remain = t.size ?? 0, this.startBlockSize = 512 * Math.ceil(this.remain / 512), this.blockRemain = this.startBlockSize, this.type = t.type, this.type) {
      case "File":
      case "OldFile":
      case "Link":
      case "SymbolicLink":
      case "CharacterDevice":
      case "BlockDevice":
      case "Directory":
      case "FIFO":
      case "ContiguousFile":
      case "GNUDumpDir":
        break;
      case "NextFileHasLongLinkpath":
      case "NextFileHasLongPath":
      case "OldGnuLongPath":
      case "GlobalExtendedHeader":
      case "ExtendedHeader":
      case "OldExtendedHeader":
        this.meta = true;
        break;
      default:
        this.ignore = true;
    }
    if (!t.path) throw new Error("no path provided for tar.ReadEntry");
    this.path = f(t.path), this.mode = t.mode, this.mode && (this.mode = this.mode & 4095), this.uid = t.uid, this.gid = t.gid, this.uname = t.uname, this.gname = t.gname, this.size = this.remain, this.mtime = t.mtime, this.atime = t.atime, this.ctime = t.ctime, this.linkpath = t.linkpath ? f(t.linkpath) : void 0, this.uname = t.uname, this.gname = t.gname, e && this.#t(e), i && this.#t(i, true);
  }
  write(t) {
    let e = t.length;
    if (e > this.blockRemain) throw new Error("writing more to entry than is appropriate");
    let i = this.remain, r = this.blockRemain;
    return this.remain = Math.max(0, i - e), this.blockRemain = Math.max(0, r - e), this.ignore ? true : i >= e ? super.write(t) : super.write(t.subarray(0, i));
  }
  #t(t, e = false) {
    t.path && (t.path = f(t.path)), t.linkpath && (t.linkpath = f(t.linkpath)), Object.assign(this, Object.fromEntries(Object.entries(t).filter(([i, r]) => !(r == null || i === "path" && e))));
  }
};
var Dt = (s3, t, e, i = {}) => {
  s3.file && (i.file = s3.file), s3.cwd && (i.cwd = s3.cwd), i.code = e instanceof Error && e.code || t, i.tarCode = t, !s3.strict && i.recoverable !== false ? (e instanceof Error && (i = Object.assign(e, i), e = e.message), s3.emit("warn", t, e, i)) : e instanceof Error ? s3.emit("error", Object.assign(e, i)) : s3.emit("error", Object.assign(new Error(`${t}: ${e}`), i));
};
var Nn = 1024 * 1024, Xi = Buffer.from([31, 139]), qi = Buffer.from([40, 181, 47, 253]), An = Math.max(Xi.length, qi.length), B = Symbol("state"), Nt = Symbol("writeEntry"), it = Symbol("readEntry"), Zi = Symbol("nextEntry"), Zs = Symbol("processEntry"), V = Symbol("extendedHeader"), he = Symbol("globalExtendedHeader"), dt = Symbol("meta"), Ys = Symbol("emitMeta"), p = Symbol("buffer"), st = Symbol("queue"), ut = Symbol("ended"), Yi = Symbol("emittedEnd"), At = Symbol("emit"), w = Symbol("unzip"), Xe = Symbol("consumeChunk"), qe = Symbol("consumeChunkSub"), Ki = Symbol("consumeBody"), Ks = Symbol("consumeMeta"), Vs = Symbol("consumeHeader"), ae = Symbol("consuming"), Vi = Symbol("bufferConcat"), Qe = Symbol("maybeEnd"), Yt = Symbol("writing"), $ = Symbol("aborted"), Je = Symbol("onDone"), It = Symbol("sawValidEntry"), je = Symbol("sawNullBlock"), ti = Symbol("sawEOF"), $s = Symbol("closeStream"), In = 1e3, le = Symbol("compressedBytesRead"), $i = Symbol("decompressedBytesRead"), Xs = Symbol("checkDecompressionRatio"), Cn = () => true, rt = class extends EventEmitter$1 {
  file;
  strict;
  maxMetaEntrySize;
  filter;
  brotli;
  zstd;
  maxDecompressionRatio;
  writable = true;
  readable = false;
  [st] = [];
  [p];
  [it];
  [Nt];
  [B] = "begin";
  [dt] = "";
  [V];
  [he];
  [ut] = false;
  [w];
  [$] = false;
  [It];
  [je] = false;
  [ti] = false;
  [Yt] = false;
  [ae] = false;
  [Yi] = false;
  [le] = 0;
  [$i] = 0;
  constructor(t = {}) {
    super(), this.file = t.file || "", this.on(Je, () => {
      (this[B] === "begin" || this[It] === false) && this.warn("TAR_BAD_ARCHIVE", "Unrecognized archive format");
    }), t.ondone ? this.on(Je, t.ondone) : this.on(Je, () => {
      this.emit("prefinish"), this.emit("finish"), this.emit("end");
    }), this.strict = !!t.strict, this.maxDecompressionRatio = typeof t.maxDecompressionRatio == "number" ? t.maxDecompressionRatio : In, this.maxMetaEntrySize = t.maxMetaEntrySize || Nn, this.filter = typeof t.filter == "function" ? t.filter : Cn;
    let e = t.file && (t.file.endsWith(".tar.br") || t.file.endsWith(".tbr"));
    this.brotli = !(t.gzip || t.zstd) && t.brotli !== void 0 ? t.brotli : e ? void 0 : false;
    let i = t.file && (t.file.endsWith(".tar.zst") || t.file.endsWith(".tzst"));
    this.zstd = !(t.gzip || t.brotli) && t.zstd !== void 0 ? t.zstd : i ? true : void 0, this.on("end", () => this[$s]()), typeof t.onwarn == "function" && this.on("warn", t.onwarn), typeof t.onReadEntry == "function" && this.on("entry", t.onReadEntry);
  }
  warn(t, e, i = {}) {
    Dt(this, t, e, i);
  }
  [Vs](t, e) {
    this[It] === void 0 && (this[It] = false);
    let i;
    try {
      i = new F(t, e, this[V], this[he]);
    } catch (r) {
      return this.warn("TAR_ENTRY_INVALID", r);
    }
    if (i.nullBlock) this[je] ? (this[ti] = true, this[B] === "begin" && (this[B] = "header"), this[At]("eof")) : (this[je] = true, this[At]("nullBlock"));
    else if (this[je] = false, !i.cksumValid) this.warn("TAR_ENTRY_INVALID", "checksum failure", { header: i });
    else if (!i.path) this.warn("TAR_ENTRY_INVALID", "path is required", { header: i });
    else {
      let r = i.type;
      if (/^(Symbolic)?Link$/.test(r) && !i.linkpath) this.warn("TAR_ENTRY_INVALID", "linkpath required", { header: i });
      else if (!/^(Symbolic)?Link$/.test(r) && !/^(Global)?ExtendedHeader$/.test(r) && i.linkpath) this.warn("TAR_ENTRY_INVALID", "linkpath forbidden", { header: i });
      else {
        let n = this[Nt] = new $e(i, this[V], this[he]);
        if (!this[It]) if (n.remain) {
          let o = () => {
            n.invalid || (this[It] = true);
          };
          n.on("end", o);
        } else this[It] = true;
        n.meta ? n.size > this.maxMetaEntrySize ? (n.ignore = true, this[At]("ignoredEntry", n), this[B] = "ignore", n.resume()) : n.size > 0 && (this[dt] = "", n.on("data", (o) => this[dt] += o), this[B] = "meta") : (this[V] = void 0, n.ignore = n.ignore || !this.filter(n.path, n), n.ignore ? (this[At]("ignoredEntry", n), this[B] = n.remain ? "ignore" : "header", n.resume()) : (n.remain ? this[B] = "body" : (this[B] = "header", n.end()), this[it] ? this[st].push(n) : (this[st].push(n), this[Zi]())));
      }
    }
  }
  [$s]() {
    queueMicrotask(() => this.emit("close"));
  }
  [Zs](t) {
    let e = true;
    if (!t) this[it] = void 0, e = false;
    else if (Array.isArray(t)) {
      let [i, ...r] = t;
      this.emit(i, ...r);
    } else this[it] = t, this.emit("entry", t), t.emittedEnd || (t.on("end", () => this[Zi]()), e = false);
    return e;
  }
  [Zi]() {
    do
      ;
    while (this[Zs](this[st].shift()));
    if (this[st].length === 0) {
      let t = this[it];
      !t || t.flowing || t.size === t.remain ? this[Yt] || this.emit("drain") : t.once("drain", () => this.emit("drain"));
    }
  }
  [Ki](t, e) {
    let i = this[Nt];
    if (!i) throw new Error("attempt to consume body without entry??");
    let r = i.blockRemain ?? 0, n = r >= t.length && e === 0 ? t : t.subarray(e, e + r);
    return i.write(n), i.blockRemain || (this[B] = "header", this[Nt] = void 0, i.end()), n.length;
  }
  [Ks](t, e) {
    let i = this[Nt], r = this[Ki](t, e);
    return !this[Nt] && i && this[Ys](i), r;
  }
  [At](t, e, i) {
    this[st].length === 0 && !this[it] ? this.emit(t, e, i) : this[st].push([t, e, i]);
  }
  [Ys](t) {
    switch (this[At]("meta", this[dt]), t.type) {
      case "ExtendedHeader":
      case "OldExtendedHeader":
        this[V] = ft.parse(this[dt], this[V], false);
        break;
      case "GlobalExtendedHeader":
        this[he] = ft.parse(this[dt], this[he], true);
        break;
      case "NextFileHasLongPath":
      case "OldGnuLongPath": {
        let e = this[V] ?? /* @__PURE__ */ Object.create(null);
        this[V] = e, e.path = this[dt].replace(/\0.*/, "");
        break;
      }
      case "NextFileHasLongLinkpath": {
        let e = this[V] || /* @__PURE__ */ Object.create(null);
        this[V] = e, e.linkpath = this[dt].replace(/\0.*/, "");
        break;
      }
      default:
        throw new Error("unknown meta: " + t.type);
    }
  }
  abort(t) {
    if (!this[$]) {
      if (this[w]) {
        let e = this[w];
        e.write = () => true, e.end = () => e, e.emit = () => false, e.destroy?.();
      }
      this[$] = true, this.emit("abort", t), this.warn("TAR_ABORT", t, { recoverable: false });
    }
  }
  [Xs](t) {
    this[$i] += t.length;
    let e = this[$i] / this[le];
    return e > this.maxDecompressionRatio ? (this.abort(new Error(`max decompression ratio exceeded: ${e.toFixed(2)} > ${this.maxDecompressionRatio}`)), false) : true;
  }
  write(t, e, i) {
    if (typeof e == "function" && (i = e, e = void 0), typeof t == "string" && (t = Buffer.from(t, typeof e == "string" ? e : "utf8")), this[$]) return i?.(), false;
    if ((this[w] === void 0 || this.brotli === void 0 && this[w] === false) && t) {
      if (this[p] && (t = Buffer.concat([this[p], t]), this[p] = void 0), t.length < An) return this[p] = t, i?.(), true;
      for (let a = 0; this[w] === void 0 && a < Xi.length; a++) t[a] !== Xi[a] && (this[w] = false);
      let o = false;
      if (this[w] === false && this.zstd !== false) {
        o = true;
        for (let a = 0; a < qi.length; a++) if (t[a] !== qi[a]) {
          o = false;
          break;
        }
      }
      let h = this.brotli === void 0 && !o;
      if (this[w] === false && h) if (t.length < 512) if (this[ut]) this.brotli = true;
      else return this[p] = t, i?.(), true;
      else try {
        new F(t.subarray(0, 512)), this.brotli = false;
      } catch {
        this.brotli = true;
      }
      if (this[w] === void 0 || this[w] === false && (this.brotli || o)) {
        let a = this[ut];
        this[ut] = false, this[w] = this[w] === void 0 ? new Ue({}) : o ? new Ke({}) : new Ge({}), this[w].on("data", (c) => {
          this[Xs](c) && this[Xe](c);
        }), this[w].on("error", (c) => {
          this[$] || this.abort(c);
        }), this[w].on("end", () => {
          this[ut] = true, this[Xe]();
        }), this[Yt] = true, this[le] += t.length;
        let l = !!this[w][a ? "end" : "write"](t);
        return this[Yt] = false, i?.(), l;
      }
    }
    this[Yt] = true, this[w] ? (this[le] += t.length, this[w].write(t)) : this[Xe](t), this[Yt] = false;
    let n = this[st].length > 0 ? false : this[it] ? this[it].flowing : true;
    return !n && this[st].length === 0 && this[it]?.once("drain", () => this.emit("drain")), i?.(), n;
  }
  [Vi](t) {
    t && !this[$] && (this[p] = this[p] ? Buffer.concat([this[p], t]) : t);
  }
  [Qe]() {
    if (this[ut] && !this[Yi] && !this[$] && !this[ae]) {
      this[Yi] = true;
      let t = this[Nt];
      if (t?.blockRemain) {
        let e = this[p] ? this[p].length : 0;
        this.warn("TAR_BAD_ARCHIVE", `Truncated input (needed ${t.blockRemain} more bytes, only ${e} available)`, { entry: t }), this[p] && t.write(this[p]), t.end();
      }
      this[At](Je);
    }
  }
  [Xe](t) {
    if (this[ae] && t) this[Vi](t);
    else if (!t && !this[p]) this[Qe]();
    else if (t) {
      if (this[ae] = true, this[p]) {
        this[Vi](t);
        let e = this[p];
        this[p] = void 0, this[qe](e);
      } else this[qe](t);
      for (; this[p] && this[p]?.length >= 512 && !this[$] && !this[ti]; ) {
        let e = this[p];
        this[p] = void 0, this[qe](e);
      }
      this[ae] = false;
    }
    (!this[p] || this[ut]) && this[Qe]();
  }
  [qe](t) {
    let e = 0, i = t.length;
    for (; e + 512 <= i && !this[$] && !this[ti]; ) switch (this[B]) {
      case "begin":
      case "header":
        this[Vs](t, e), e += 512;
        break;
      case "ignore":
      case "body":
        e += this[Ki](t, e);
        break;
      case "meta":
        e += this[Ks](t, e);
        break;
      default:
        throw new Error("invalid state: " + this[B]);
    }
    e < i && (this[p] = this[p] ? Buffer.concat([t.subarray(e), this[p]]) : t.subarray(e));
  }
  end(t, e, i) {
    return typeof t == "function" && (i = t, e = void 0, t = void 0), typeof e == "function" && (i = e, e = void 0), typeof t == "string" && (t = Buffer.from(t, e)), i && this.once("finish", i), this[$] || (this[w] ? (t && (this[le] += t.length, this[w].write(t)), this[w].end()) : (this[ut] = true, (this.brotli === void 0 || this.zstd === void 0) && (t = t || Buffer.alloc(0)), t && this.write(t), this[Qe]())), this;
  }
};
var mt = (s3) => {
  let t = s3.length - 1, e = -1;
  for (; t > -1 && s3.charAt(t) === "/"; ) e = t, t--;
  return e === -1 ? s3 : s3.slice(0, e);
};
var vn = (s3) => {
  let t = s3.onReadEntry;
  s3.onReadEntry = t ? (e) => {
    t(e), e.resume();
  } : (e) => e.resume();
}, Qi = (s3, t) => {
  let e = new Map(t.map((o) => [mt(o), true])), i = s3.filter, r = 100, n = (o, h = "", a = 0) => {
    if (a >= r) return e.set(o, false), false;
    let l = h || parse(o).root || ".", c;
    if (o === l) c = false;
    else {
      let d = e.get(o);
      c = d !== void 0 ? d : n(dirname(o), l, a + 1);
    }
    return e.set(o, c), c;
  };
  s3.filter = i ? (o, h) => i(o, h) && n(mt(o)) : (o) => n(mt(o));
}, Mn = (s3) => {
  let t = new rt(s3), e = s3.file, i;
  try {
    i = fs__default.openSync(e, "r");
    let r = fs__default.fstatSync(i), n = s3.maxReadSize || 16 * 1024 * 1024;
    if (r.size < n) {
      let o = Buffer.allocUnsafe(r.size), h = fs__default.readSync(i, o, 0, r.size, 0);
      t.end(h === o.byteLength ? o : o.subarray(0, h));
    } else {
      let o = 0, h = Buffer.allocUnsafe(n);
      for (; o < r.size; ) {
        let a = fs__default.readSync(i, h, 0, n, o);
        if (a === 0) break;
        o += a, t.write(h.subarray(0, a));
      }
      t.end();
    }
  } finally {
    if (typeof i == "number") try {
      fs__default.closeSync(i);
    } catch {
    }
  }
}, Bn = (s3, t) => {
  let e = new rt(s3), i = s3.maxReadSize || 16 * 1024 * 1024, r = s3.file;
  return new Promise((o, h) => {
    e.on("error", h), e.on("end", o), fs__default.stat(r, (a, l) => {
      if (a) h(a);
      else {
        let c = new _t(r, { readSize: i, size: l.size });
        c.on("error", h), c.pipe(e);
      }
    });
  });
}, Ct = K(Mn, Bn, (s3) => new rt(s3), (s3) => new rt(s3), (s3, t) => {
  t?.length && Qi(s3, t), s3.noResume || vn(s3);
});
var Ji = (s3, t, e) => (s3 &= 4095, e && (s3 = (s3 | 384) & -19), t && (s3 & 256 && (s3 |= 64), s3 & 32 && (s3 |= 8), s3 & 4 && (s3 |= 1)), s3);
var { isAbsolute: zn, parse: qs } = win32, ce = (s3) => {
  let t = "", e = qs(s3);
  for (; zn(s3) || e.root; ) {
    let i = s3.charAt(0) === "/" && s3.slice(0, 4) !== "//?/" ? "/" : e.root;
    s3 = s3.slice(i.length), t += i, e = qs(s3);
  }
  return [t, s3];
};
var ei = ["|", "<", ">", "?", ":"], ji = ei.map((s3) => String.fromCodePoint(61440 + Number(s3.codePointAt(0)))), Un = new Map(ei.map((s3, t) => [s3, ji[t]])), Hn = new Map(ji.map((s3, t) => [s3, ei[t]])), ts = (s3) => ei.reduce((t, e) => t.split(e).join(Un.get(e)), s3), Qs = (s3) => ji.reduce((t, e) => t.split(e).join(Hn.get(e)), s3);
var rr = (s3, t) => t ? (s3 = f(s3).replace(/^\.(\/|$)/, ""), mt(t) + "/" + s3) : f(s3), Wn = 16 * 1024 * 1024, tr = Symbol("process"), er = Symbol("file"), ir = Symbol("directory"), is = Symbol("symlink"), sr = Symbol("hardlink"), fe = Symbol("header"), ii = Symbol("read"), ss = Symbol("lstat"), si = Symbol("onlstat"), rs = Symbol("onread"), ns = Symbol("onreadlink"), os = Symbol("openfile"), hs = Symbol("onopenfile"), pt = Symbol("close"), ri = Symbol("mode"), as = Symbol("awaitDrain"), es = Symbol("ondrain"), q = Symbol("prefix"), de = class extends A {
  path;
  portable;
  myuid = process.getuid && process.getuid() || 0;
  myuser = process.env.USER || "";
  maxReadSize;
  linkCache;
  statCache;
  preservePaths;
  cwd;
  strict;
  mtime;
  noPax;
  noMtime;
  prefix;
  fd;
  blockLen = 0;
  blockRemain = 0;
  buf;
  pos = 0;
  remain = 0;
  length = 0;
  offset = 0;
  win32;
  absolute;
  header;
  type;
  linkpath;
  stat;
  onWriteEntry;
  #t = false;
  constructor(t, e = {}) {
    let i = se(e);
    super(), this.path = f(t), this.portable = !!i.portable, this.maxReadSize = i.maxReadSize || Wn, this.linkCache = i.linkCache || /* @__PURE__ */ new Map(), this.statCache = i.statCache || /* @__PURE__ */ new Map(), this.preservePaths = !!i.preservePaths, this.cwd = f(i.cwd || process.cwd()), this.strict = !!i.strict, this.noPax = !!i.noPax, this.noMtime = !!i.noMtime, this.mtime = i.mtime, this.prefix = i.prefix ? f(i.prefix) : void 0, this.onWriteEntry = i.onWriteEntry, typeof i.onwarn == "function" && this.on("warn", i.onwarn);
    let r = false;
    if (!this.preservePaths) {
      let [o, h] = ce(this.path);
      o && typeof h == "string" && (this.path = h, r = o);
    }
    this.win32 = !!i.win32 || process.platform === "win32", this.win32 && (this.path = Qs(this.path.replaceAll(/\\/g, "/")), t = t.replaceAll(/\\/g, "/")), this.absolute = f(i.absolute || require$$1.resolve(this.cwd, t)), this.path === "" && (this.path = "./"), r && this.warn("TAR_ENTRY_INFO", `stripping ${r} from absolute path`, { entry: this, path: r + this.path });
    let n = this.statCache.get(this.absolute);
    n ? this[si](n) : this[ss]();
  }
  warn(t, e, i = {}) {
    return Dt(this, t, e, i);
  }
  emit(t, ...e) {
    return t === "error" && (this.#t = true), super.emit(t, ...e);
  }
  [ss]() {
    fs__default$1.lstat(this.absolute, (t, e) => {
      if (t) return this.emit("error", t);
      this[si](e);
    });
  }
  [si](t) {
    this.statCache.set(this.absolute, t), this.stat = t, t.isFile() || (t.size = 0), this.type = Gn(t), this.emit("stat", t), this[tr]();
  }
  [tr]() {
    switch (this.type) {
      case "File":
        return this[er]();
      case "Directory":
        return this[ir]();
      case "SymbolicLink":
        return this[is]();
      default:
        return this.end();
    }
  }
  [ri](t) {
    return Ji(t, this.type === "Directory", this.portable);
  }
  [q](t) {
    return rr(t, this.prefix);
  }
  [fe]() {
    if (!this.stat) throw new Error("cannot write header before stat");
    this.type === "Directory" && this.portable && (this.noMtime = true), this.onWriteEntry?.(this), this.header = new F({ path: this[q](this.path), linkpath: this.type === "Link" && this.linkpath !== void 0 ? this[q](this.linkpath) : this.linkpath, mode: this[ri](this.stat.mode), uid: this.portable ? void 0 : this.stat.uid, gid: this.portable ? void 0 : this.stat.gid, size: this.stat.size, mtime: this.noMtime ? void 0 : this.mtime || this.stat.mtime, type: this.type === "Unsupported" ? void 0 : this.type, uname: this.portable ? void 0 : this.stat.uid === this.myuid ? this.myuser : "", atime: this.portable ? void 0 : this.stat.atime, ctime: this.portable ? void 0 : this.stat.ctime }), this.header.encode() && !this.noPax && super.write(new ft({ atime: this.portable ? void 0 : this.header.atime, ctime: this.portable ? void 0 : this.header.ctime, gid: this.portable ? void 0 : this.header.gid, mtime: this.noMtime ? void 0 : this.mtime || this.header.mtime, path: this[q](this.path), linkpath: this.type === "Link" && this.linkpath !== void 0 ? this[q](this.linkpath) : this.linkpath, size: this.header.size, uid: this.portable ? void 0 : this.header.uid, uname: this.portable ? void 0 : this.header.uname, dev: this.portable ? void 0 : this.stat.dev, ino: this.portable ? void 0 : this.stat.ino, nlink: this.portable ? void 0 : this.stat.nlink }).encode());
    let t = this.header?.block;
    if (!t) throw new Error("failed to encode header");
    super.write(t);
  }
  [ir]() {
    if (!this.stat) throw new Error("cannot create directory entry without stat");
    this.path.slice(-1) !== "/" && (this.path += "/"), this.stat.size = 0, this[fe](), this.end();
  }
  [is]() {
    fs__default$1.readlink(this.absolute, (t, e) => {
      if (t) return this.emit("error", t);
      this[ns](e);
    });
  }
  [ns](t) {
    this.linkpath = f(t), this[fe](), this.end();
  }
  [sr](t) {
    if (!this.stat) throw new Error("cannot create link entry without stat");
    this.type = "Link", this.linkpath = f(require$$1.relative(this.cwd, t)), this.stat.size = 0, this[fe](), this.end();
  }
  [er]() {
    if (!this.stat) throw new Error("cannot create file entry without stat");
    if (this.stat.nlink > 1) {
      let t = `${this.stat.dev}:${this.stat.ino}`, e = this.linkCache.get(t);
      if (e?.indexOf(this.cwd) === 0) return this[sr](e);
      this.linkCache.set(t, this.absolute);
    }
    if (this[fe](), this.stat.size === 0) return this.end();
    this[os]();
  }
  [os]() {
    fs__default$1.open(this.absolute, "r", (t, e) => {
      if (t) return this.emit("error", t);
      this[hs](e);
    });
  }
  [hs](t) {
    if (this.fd = t, this.#t) return this[pt]();
    if (!this.stat) throw new Error("should stat before calling onopenfile");
    this.blockLen = 512 * Math.ceil(this.stat.size / 512), this.blockRemain = this.blockLen;
    let e = Math.min(this.blockLen, this.maxReadSize);
    this.buf = Buffer.allocUnsafe(e), this.offset = 0, this.pos = 0, this.remain = this.stat.size, this.length = this.buf.length, this[ii]();
  }
  [ii]() {
    let { fd: t, buf: e, offset: i, length: r, pos: n } = this;
    if (t === void 0 || e === void 0) throw new Error("cannot read file without first opening");
    fs__default$1.read(t, e, i, r, n, (o, h) => {
      if (o) return this[pt](() => this.emit("error", o));
      this[rs](h);
    });
  }
  [pt](t = () => {
  }) {
    this.fd !== void 0 && fs__default$1.close(this.fd, t);
  }
  [rs](t) {
    if (t <= 0 && this.remain > 0) {
      let r = Object.assign(new Error("encountered unexpected EOF"), { path: this.absolute, syscall: "read", code: "EOF" });
      return this[pt](() => this.emit("error", r));
    }
    if (t > this.remain) {
      let r = Object.assign(new Error("did not encounter expected EOF"), { path: this.absolute, syscall: "read", code: "EOF" });
      return this[pt](() => this.emit("error", r));
    }
    if (!this.buf) throw new Error("should have created buffer prior to reading");
    if (t === this.remain) for (let r = t; r < this.length && t < this.blockRemain; r++) this.buf[r + this.offset] = 0, t++, this.remain++;
    let e = this.offset === 0 && t === this.buf.length ? this.buf : this.buf.subarray(this.offset, this.offset + t);
    this.write(e) ? this[es]() : this[as](() => this[es]());
  }
  [as](t) {
    this.once("drain", t);
  }
  write(t, e, i) {
    if (typeof e == "function" && (i = e, e = void 0), typeof t == "string" && (t = Buffer.from(t, typeof e == "string" ? e : "utf8")), this.blockRemain < t.length) {
      let r = Object.assign(new Error("writing more data than expected"), { path: this.absolute });
      return this.emit("error", r);
    }
    return this.remain -= t.length, this.blockRemain -= t.length, this.pos += t.length, this.offset += t.length, super.write(t, null, i);
  }
  [es]() {
    if (!this.remain) return this.blockRemain && super.write(Buffer.alloc(this.blockRemain)), this[pt]((t) => t ? this.emit("error", t) : this.end());
    if (!this.buf) throw new Error("buffer lost somehow in ONDRAIN");
    this.offset >= this.length && (this.buf = Buffer.allocUnsafe(Math.min(this.blockRemain, this.buf.length)), this.offset = 0), this.length = this.buf.length - this.offset, this[ii]();
  }
}, ni = class extends de {
  sync = true;
  [ss]() {
    this[si](fs__default$1.lstatSync(this.absolute));
  }
  [is]() {
    this[ns](fs__default$1.readlinkSync(this.absolute));
  }
  [os]() {
    this[hs](fs__default$1.openSync(this.absolute, "r"));
  }
  [ii]() {
    let t = true;
    try {
      let { fd: e, buf: i, offset: r, length: n, pos: o } = this;
      if (e === void 0 || i === void 0) throw new Error("fd and buf must be set in READ method");
      let h = fs__default$1.readSync(e, i, r, n, o);
      this[rs](h), t = false;
    } finally {
      if (t) try {
        this[pt](() => {
        });
      } catch {
      }
    }
  }
  [as](t) {
    t();
  }
  [pt](t = () => {
  }) {
    this.fd !== void 0 && fs__default$1.closeSync(this.fd), t();
  }
}, oi = class extends A {
  blockLen = 0;
  blockRemain = 0;
  buf = 0;
  pos = 0;
  remain = 0;
  length = 0;
  preservePaths;
  portable;
  strict;
  noPax;
  noMtime;
  readEntry;
  type;
  prefix;
  path;
  mode;
  uid;
  gid;
  uname;
  gname;
  header;
  mtime;
  atime;
  ctime;
  linkpath;
  size;
  onWriteEntry;
  warn(t, e, i = {}) {
    return Dt(this, t, e, i);
  }
  constructor(t, e = {}) {
    let i = se(e);
    super(), this.preservePaths = !!i.preservePaths, this.portable = !!i.portable, this.strict = !!i.strict, this.noPax = !!i.noPax, this.noMtime = !!i.noMtime, this.onWriteEntry = i.onWriteEntry, this.readEntry = t;
    let { type: r } = t;
    if (r === "Unsupported") throw new Error("writing entry that should be ignored");
    this.type = r, this.type === "Directory" && this.portable && (this.noMtime = true), this.prefix = i.prefix, this.path = f(t.path), this.mode = t.mode !== void 0 ? this[ri](t.mode) : void 0, this.uid = this.portable ? void 0 : t.uid, this.gid = this.portable ? void 0 : t.gid, this.uname = this.portable ? void 0 : t.uname, this.gname = this.portable ? void 0 : t.gname, this.size = t.size, this.mtime = this.noMtime ? void 0 : i.mtime || t.mtime, this.atime = this.portable ? void 0 : t.atime, this.ctime = this.portable ? void 0 : t.ctime, this.linkpath = t.linkpath !== void 0 ? f(t.linkpath) : void 0, typeof i.onwarn == "function" && this.on("warn", i.onwarn);
    let n = false;
    if (!this.preservePaths) {
      let [h, a] = ce(this.path);
      h && typeof a == "string" && (this.path = a, n = h);
    }
    this.remain = t.size, this.blockRemain = t.startBlockSize, this.onWriteEntry?.(this), this.header = new F({ path: this[q](this.path), linkpath: this.type === "Link" && this.linkpath !== void 0 ? this[q](this.linkpath) : this.linkpath, mode: this.mode, uid: this.portable ? void 0 : this.uid, gid: this.portable ? void 0 : this.gid, size: this.size, mtime: this.noMtime ? void 0 : this.mtime, type: this.type, uname: this.portable ? void 0 : this.uname, atime: this.portable ? void 0 : this.atime, ctime: this.portable ? void 0 : this.ctime }), n && this.warn("TAR_ENTRY_INFO", `stripping ${n} from absolute path`, { entry: this, path: n + this.path }), this.header.encode() && !this.noPax && super.write(new ft({ atime: this.portable ? void 0 : this.atime, ctime: this.portable ? void 0 : this.ctime, gid: this.portable ? void 0 : this.gid, mtime: this.noMtime ? void 0 : this.mtime, path: this[q](this.path), linkpath: this.type === "Link" && this.linkpath !== void 0 ? this[q](this.linkpath) : this.linkpath, size: this.size, uid: this.portable ? void 0 : this.uid, uname: this.portable ? void 0 : this.uname, dev: this.portable ? void 0 : this.readEntry.dev, ino: this.portable ? void 0 : this.readEntry.ino, nlink: this.portable ? void 0 : this.readEntry.nlink }).encode());
    let o = this.header?.block;
    if (!o) throw new Error("failed to encode header");
    super.write(o), t.pipe(this);
  }
  [q](t) {
    return rr(t, this.prefix);
  }
  [ri](t) {
    return Ji(t, this.type === "Directory", this.portable);
  }
  write(t, e, i) {
    typeof e == "function" && (i = e, e = void 0), typeof t == "string" && (t = Buffer.from(t, typeof e == "string" ? e : "utf8"));
    let r = t.length;
    if (r > this.blockRemain) throw new Error("writing more to entry than is appropriate");
    return this.blockRemain -= r, super.write(t, i);
  }
  end(t, e, i) {
    return this.blockRemain && super.write(Buffer.alloc(this.blockRemain)), typeof t == "function" && (i = t, e = void 0, t = void 0), typeof e == "function" && (i = e, e = void 0), typeof t == "string" && (t = Buffer.from(t, e ?? "utf8")), i && this.once("finish", i), t ? super.end(t, i) : super.end(i), this;
  }
}, Gn = (s3) => s3.isFile() ? "File" : s3.isDirectory() ? "Directory" : s3.isSymbolicLink() ? "SymbolicLink" : "Unsupported";
var hi = class s2 {
  tail;
  head;
  length = 0;
  static create(t = []) {
    return new s2(t);
  }
  constructor(t = []) {
    for (let e of t) this.push(e);
  }
  *[Symbol.iterator]() {
    for (let t = this.head; t; t = t.next) yield t.value;
  }
  removeNode(t) {
    if (t.list !== this) throw new Error("removing node which does not belong to this list");
    let e = t.next, i = t.prev;
    return e && (e.prev = i), i && (i.next = e), t === this.head && (this.head = e), t === this.tail && (this.tail = i), this.length--, t.next = void 0, t.prev = void 0, t.list = void 0, e;
  }
  unshiftNode(t) {
    if (t === this.head) return;
    t.list && t.list.removeNode(t);
    let e = this.head;
    t.list = this, t.next = e, e && (e.prev = t), this.head = t, this.tail || (this.tail = t), this.length++;
  }
  pushNode(t) {
    if (t === this.tail) return;
    t.list && t.list.removeNode(t);
    let e = this.tail;
    t.list = this, t.prev = e, e && (e.next = t), this.tail = t, this.head || (this.head = t), this.length++;
  }
  push(...t) {
    for (let e = 0, i = t.length; e < i; e++) Yn(this, t[e]);
    return this.length;
  }
  unshift(...t) {
    for (var e = 0, i = t.length; e < i; e++) Kn(this, t[e]);
    return this.length;
  }
  pop() {
    if (!this.tail) return;
    let t = this.tail.value, e = this.tail;
    return this.tail = this.tail.prev, this.tail ? this.tail.next = void 0 : this.head = void 0, e.list = void 0, this.length--, t;
  }
  shift() {
    if (!this.head) return;
    let t = this.head.value, e = this.head;
    return this.head = this.head.next, this.head ? this.head.prev = void 0 : this.tail = void 0, e.list = void 0, this.length--, t;
  }
  forEach(t, e) {
    e = e || this;
    for (let i = this.head, r = 0; i; r++) t.call(e, i.value, r, this), i = i.next;
  }
  forEachReverse(t, e) {
    e = e || this;
    for (let i = this.tail, r = this.length - 1; i; r--) t.call(e, i.value, r, this), i = i.prev;
  }
  get(t) {
    let e = 0, i = this.head;
    for (; i && e < t; e++) i = i.next;
    if (e === t && i) return i.value;
  }
  getReverse(t) {
    let e = 0, i = this.tail;
    for (; i && e < t; e++) i = i.prev;
    if (e === t && i) return i.value;
  }
  map(t, e) {
    e = e || this;
    let i = new s2();
    for (let r = this.head; r; ) i.push(t.call(e, r.value, this)), r = r.next;
    return i;
  }
  mapReverse(t, e) {
    e = e || this;
    var i = new s2();
    for (let r = this.tail; r; ) i.push(t.call(e, r.value, this)), r = r.prev;
    return i;
  }
  reduce(t, e) {
    let i, r = this.head;
    if (arguments.length > 1) i = e;
    else if (this.head) r = this.head.next, i = this.head.value;
    else throw new TypeError("Reduce of empty list with no initial value");
    for (var n = 0; r; n++) i = t(i, r.value, n), r = r.next;
    return i;
  }
  reduceReverse(t, e) {
    let i, r = this.tail;
    if (arguments.length > 1) i = e;
    else if (this.tail) r = this.tail.prev, i = this.tail.value;
    else throw new TypeError("Reduce of empty list with no initial value");
    for (let n = this.length - 1; r; n--) i = t(i, r.value, n), r = r.prev;
    return i;
  }
  toArray() {
    let t = new Array(this.length);
    for (let e = 0, i = this.head; i; e++) t[e] = i.value, i = i.next;
    return t;
  }
  toArrayReverse() {
    let t = new Array(this.length);
    for (let e = 0, i = this.tail; i; e++) t[e] = i.value, i = i.prev;
    return t;
  }
  slice(t = 0, e = this.length) {
    e < 0 && (e += this.length), t < 0 && (t += this.length);
    let i = new s2();
    if (e < t || e < 0) return i;
    t < 0 && (t = 0), e > this.length && (e = this.length);
    let r = this.head, n = 0;
    for (n = 0; r && n < t; n++) r = r.next;
    for (; r && n < e; n++, r = r.next) i.push(r.value);
    return i;
  }
  sliceReverse(t = 0, e = this.length) {
    e < 0 && (e += this.length), t < 0 && (t += this.length);
    let i = new s2();
    if (e < t || e < 0) return i;
    t < 0 && (t = 0), e > this.length && (e = this.length);
    let r = this.length, n = this.tail;
    for (; n && r > e; r--) n = n.prev;
    for (; n && r > t; r--, n = n.prev) i.push(n.value);
    return i;
  }
  splice(t, e = 0, ...i) {
    t > this.length && (t = this.length - 1), t < 0 && (t = this.length + t);
    let r = this.head;
    for (let o = 0; r && o < t; o++) r = r.next;
    let n = [];
    for (let o = 0; r && o < e; o++) n.push(r.value), r = this.removeNode(r);
    r ? r !== this.tail && (r = r.prev) : r = this.tail;
    for (let o of i) r = Zn(this, r, o);
    return n;
  }
  reverse() {
    let t = this.head, e = this.tail;
    for (let i = t; i; i = i.prev) {
      let r = i.prev;
      i.prev = i.next, i.next = r;
    }
    return this.head = e, this.tail = t, this;
  }
};
function Zn(s3, t, e) {
  let i = t, r = t ? t.next : s3.head, n = new ue(e, i, r, s3);
  return n.next === void 0 && (s3.tail = n), n.prev === void 0 && (s3.head = n), s3.length++, n;
}
function Yn(s3, t) {
  s3.tail = new ue(t, s3.tail, void 0, s3), s3.head || (s3.head = s3.tail), s3.length++;
}
function Kn(s3, t) {
  s3.head = new ue(t, void 0, s3.head, s3), s3.tail || (s3.tail = s3.head), s3.length++;
}
var ue = class {
  list;
  next;
  prev;
  value;
  constructor(t, e, i, r) {
    this.list = r, this.value = t, e ? (e.next = this, this.prev = e) : this.prev = void 0, i ? (i.prev = this, this.next = i) : this.next = void 0;
  }
};
var pi = class {
  path;
  absolute;
  entry;
  stat;
  readdir;
  pending = false;
  pendingLink = false;
  ignore = false;
  piped = false;
  constructor(t, e) {
    this.path = t || "./", this.absolute = e;
  }
}, nr = Buffer.alloc(1024), li = Symbol("onStat"), me = Symbol("ended"), W = Symbol("queue"), pe = Symbol("pendingLinks"), Et = Symbol("current"), Ft = Symbol("process"), Ee = Symbol("processing"), ai = Symbol("processJob"), G = Symbol("jobs"), ls = Symbol("jobDone"), ci = Symbol("addFSEntry"), or = Symbol("addTarEntry"), ds = Symbol("stat"), us = Symbol("readdir"), fi = Symbol("onreaddir"), di = Symbol("pipe"), hr = Symbol("entry"), cs = Symbol("entryOpt"), ui = Symbol("writeEntryClass"), lr = Symbol("write"), fs = Symbol("ondrain"), wt = class extends A {
  sync = false;
  opt;
  cwd;
  maxReadSize;
  preservePaths;
  strict;
  noPax;
  prefix;
  linkCache;
  statCache;
  file;
  portable;
  zip;
  readdirCache;
  noDirRecurse;
  follow;
  noMtime;
  mtime;
  filter;
  jobs;
  [ui];
  onWriteEntry;
  [W];
  [pe] = /* @__PURE__ */ new Map();
  [G] = 0;
  [Ee] = false;
  [me] = false;
  constructor(t = {}) {
    if (super(), this.opt = t, this.file = t.file || "", this.cwd = t.cwd || process.cwd(), this.maxReadSize = t.maxReadSize, this.preservePaths = !!t.preservePaths, this.strict = !!t.strict, this.noPax = !!t.noPax, this.prefix = f(t.prefix || ""), this.linkCache = t.linkCache || /* @__PURE__ */ new Map(), this.statCache = t.statCache || /* @__PURE__ */ new Map(), this.readdirCache = t.readdirCache || /* @__PURE__ */ new Map(), this.onWriteEntry = t.onWriteEntry, this[ui] = de, typeof t.onwarn == "function" && this.on("warn", t.onwarn), this.portable = !!t.portable, t.gzip || t.brotli || t.zstd) {
      if ((t.gzip ? 1 : 0) + (t.brotli ? 1 : 0) + (t.zstd ? 1 : 0) > 1) throw new TypeError("gzip, brotli, zstd are mutually exclusive");
      if (t.gzip && (typeof t.gzip != "object" && (t.gzip = {}), this.portable && (t.gzip.portable = true), this.zip = new ze(t.gzip)), t.brotli && (typeof t.brotli != "object" && (t.brotli = {}), this.zip = new We(t.brotli)), t.zstd && (typeof t.zstd != "object" && (t.zstd = {}), this.zip = new Ye(t.zstd)), !this.zip) throw new Error("impossible");
      let e = this.zip;
      e.on("data", (i) => super.write(i)), e.on("end", () => super.end()), e.on("drain", () => this[fs]()), this.on("resume", () => e.resume());
    } else this.on("drain", this[fs]);
    this.noDirRecurse = !!t.noDirRecurse, this.follow = !!t.follow, this.noMtime = !!t.noMtime, t.mtime && (this.mtime = t.mtime), this.filter = typeof t.filter == "function" ? t.filter : () => true, this[W] = new hi(), this[G] = 0, this.jobs = Number(t.jobs) || 4, this[Ee] = false, this[me] = false;
  }
  [lr](t) {
    return super.write(t);
  }
  add(t) {
    return this.write(t), this;
  }
  end(t, e, i) {
    return typeof t == "function" && (i = t, t = void 0), typeof e == "function" && (i = e, e = void 0), t && this.add(t), this[me] = true, this[Ft](), i && i(), this;
  }
  write(t) {
    if (this[me]) throw new Error("write after end");
    return typeof t == "string" ? this[ci](t) : this[or](t), this.flowing;
  }
  [or](t) {
    let e = f(require$$1.resolve(this.cwd, t.path));
    if (!this.filter(t.path, t)) t.resume();
    else {
      let i = new pi(t.path, e);
      i.entry = new oi(t, this[cs](i)), i.entry.on("end", () => this[ls](i)), this[G] += 1, this[W].push(i);
    }
    this[Ft]();
  }
  [ci](t) {
    let e = f(require$$1.resolve(this.cwd, t));
    this[W].push(new pi(t, e)), this[Ft]();
  }
  [ds](t) {
    t.pending = true, this[G] += 1;
    let e = this.follow ? "stat" : "lstat";
    fs__default$1[e](t.absolute, (i, r) => {
      t.pending = false, this[G] -= 1, i ? this.emit("error", i) : this[li](t, r);
    });
  }
  [li](t, e) {
    if (this.statCache.set(t.absolute, e), t.stat = e, !this.filter(t.path, e)) t.ignore = true;
    else if (e.isFile() && e.nlink > 1 && !this.linkCache.get(`${e.dev}:${e.ino}`) && !this.sync) if (t === this[Et]) this[ai](t);
    else {
      let i = `${e.dev}:${e.ino}`, r = this[pe].get(i);
      r ? r.push(t) : this[pe].set(i, [t]), t.pendingLink = true, t.pending = true;
    }
    this[Ft]();
  }
  [us](t) {
    t.pending = true, this[G] += 1, fs__default$1.readdir(t.absolute, (e, i) => {
      if (t.pending = false, this[G] -= 1, e) return this.emit("error", e);
      this[fi](t, i);
    });
  }
  [fi](t, e) {
    this.readdirCache.set(t.absolute, e), t.readdir = e, this[Ft]();
  }
  [Ft]() {
    if (!this[Ee]) {
      this[Ee] = true;
      for (let t = this[W].head; t && this[G] < this.jobs; t = t.next) if (this[ai](t.value), t.value.ignore) {
        let e = t.next;
        this[W].removeNode(t), t.next = e;
      }
      this[Ee] = false, this[me] && this[W].length === 0 && this[G] === 0 && (this.zip ? this.zip.end(nr) : (super.write(nr), super.end()));
    }
  }
  get [Et]() {
    return this[W] && this[W].head && this[W].head.value;
  }
  [ls](t) {
    this[W].shift(), this[G] -= 1;
    let { stat: e } = t;
    if (e && e.isFile() && e.nlink > 1) {
      let i = `${e.dev}:${e.ino}`, r = this[pe].get(i);
      if (r) {
        this[pe].delete(i);
        for (let n of r) n.pending = false, this[ai](n);
      }
    }
    this[Ft]();
  }
  [ai](t) {
    if (t.pending && t.pendingLink && t === this[Et] && (t.pending = false, t.pendingLink = false), !t.pending) {
      if (t.entry) {
        t === this[Et] && !t.piped && this[di](t);
        return;
      }
      if (!t.stat) {
        let e = this.statCache.get(t.absolute);
        e ? this[li](t, e) : this[ds](t);
      }
      if (t.stat && !t.ignore) {
        if (!this.noDirRecurse && t.stat.isDirectory() && !t.readdir) {
          let e = this.readdirCache.get(t.absolute);
          if (e ? this[fi](t, e) : this[us](t), !t.readdir) return;
        }
        if (t.entry = this[hr](t), !t.entry) {
          t.ignore = true;
          return;
        }
        t === this[Et] && !t.piped && this[di](t);
      }
    }
  }
  [cs](t) {
    return { onwarn: (e, i, r) => this.warn(e, i, r), noPax: this.noPax, cwd: this.cwd, absolute: t.absolute, preservePaths: this.preservePaths, maxReadSize: this.maxReadSize, strict: this.strict, portable: this.portable, linkCache: this.linkCache, statCache: this.statCache, noMtime: this.noMtime, mtime: this.mtime, prefix: this.prefix, onWriteEntry: this.onWriteEntry };
  }
  [hr](t) {
    this[G] += 1;
    try {
      return new this[ui](t.path, this[cs](t)).on("end", () => this[ls](t)).on("error", (i) => this.emit("error", i));
    } catch (e) {
      this.emit("error", e);
    }
  }
  [fs]() {
    this[Et] && this[Et].entry && this[Et].entry.resume();
  }
  [di](t) {
    t.piped = true, t.readdir && t.readdir.forEach((r) => {
      let n = t.path, o = n === "./" ? "" : n.replace(/\/*$/, "/");
      this[ci](o + r);
    });
    let e = t.entry, i = this.zip;
    if (!e) throw new Error("cannot pipe without source");
    i ? e.on("data", (r) => {
      i.write(r) || e.pause();
    }) : e.on("data", (r) => {
      super.write(r) || e.pause();
    });
  }
  pause() {
    return this.zip && this.zip.pause(), super.pause();
  }
  warn(t, e, i = {}) {
    Dt(this, t, e, i);
  }
}, kt = class extends wt {
  sync = true;
  constructor(t) {
    super(t), this[ui] = ni;
  }
  pause() {
  }
  resume() {
  }
  [ds](t) {
    let e = this.follow ? "statSync" : "lstatSync";
    this[li](t, fs__default$1[e](t.absolute));
  }
  [us](t) {
    this[fi](t, fs__default$1.readdirSync(t.absolute));
  }
  [di](t) {
    let e = t.entry, i = this.zip;
    if (t.readdir && t.readdir.forEach((r) => {
      let n = t.path, o = n === "./" ? "" : n.replace(/\/*$/, "/");
      this[ci](o + r);
    }), !e) throw new Error("Cannot pipe without source");
    i ? e.on("data", (r) => {
      i.write(r);
    }) : e.on("data", (r) => {
      super[lr](r);
    });
  }
};
var Vn = (s3, t) => {
  let e = new kt(s3), i = new Wt(s3.file, { mode: s3.mode || 438 });
  e.pipe(i), fr(e, t);
}, $n = (s3, t) => {
  let e = new wt(s3), i = new et(s3.file, { mode: s3.mode || 438 });
  e.pipe(i);
  let r = new Promise((n, o) => {
    i.on("error", o), i.on("close", n), e.on("error", o);
  });
  return dr(e, t).catch((n) => e.emit("error", n)), r;
}, fr = (s3, t) => {
  t.forEach((e) => {
    e.charAt(0) === "@" ? Ct({ file: path__default.resolve(s3.cwd, e.slice(1)), sync: true, noResume: true, onReadEntry: (i) => s3.add(i) }) : s3.add(e);
  }), s3.end();
}, dr = async (s3, t) => {
  for (let e of t) e.charAt(0) === "@" ? await Ct({ file: path__default.resolve(String(s3.cwd), e.slice(1)), noResume: true, onReadEntry: (i) => {
    s3.add(i);
  } }) : s3.add(e);
  s3.end();
}, Xn = (s3, t) => {
  let e = new kt(s3);
  return fr(e, t), e;
}, qn = (s3, t) => {
  let e = new wt(s3);
  return dr(e, t).catch((i) => e.emit("error", i)), e;
};
K(Vn, $n, Xn, qn, (s3, t) => {
  if (!t?.length) throw new TypeError("no paths specified to add to archive");
});
var Jn = process.env.__FAKE_PLATFORM__ || process.platform, Er = Jn === "win32", { O_CREAT: wr, O_NOFOLLOW: ur, O_TRUNC: Sr, O_WRONLY: yr } = fs__default$1.constants, Rr = Number(process.env.__FAKE_FS_O_FILENAME__) || fs__default$1.constants.UV_FS_O_FILEMAP || 0, jn = Er && !!Rr, to = 512 * 1024, eo = Rr | Sr | wr | yr, mr = !Er && typeof ur == "number" ? ur | Sr | wr | yr : null, ms = mr !== null ? () => mr : jn ? (s3) => s3 < to ? eo : "w" : () => "w";
var ps = (s3, t, e) => {
  try {
    return fs__default.lchownSync(s3, t, e);
  } catch (i) {
    if (i?.code !== "ENOENT") throw i;
  }
}, Ei = (s3, t, e, i) => {
  fs__default.lchown(s3, t, e, (r) => {
    i(r && r?.code !== "ENOENT" ? r : null);
  });
}, io = (s3, t, e, i, r) => {
  if (t.isDirectory()) Es(path__default.resolve(s3, t.name), e, i, (n) => {
    if (n) return r(n);
    let o = path__default.resolve(s3, t.name);
    Ei(o, e, i, r);
  });
  else {
    let n = path__default.resolve(s3, t.name);
    Ei(n, e, i, r);
  }
}, Es = (s3, t, e, i) => {
  fs__default.readdir(s3, { withFileTypes: true }, (r, n) => {
    if (r) {
      if (r.code === "ENOENT") return i();
      if (r.code !== "ENOTDIR" && r.code !== "ENOTSUP") return i(r);
    }
    if (r || !n.length) return Ei(s3, t, e, i);
    let o = n.length, h = null, a = (l) => {
      if (!h) {
        if (l) return i(h = l);
        if (--o === 0) return Ei(s3, t, e, i);
      }
    };
    for (let l of n) io(s3, l, t, e, a);
  });
}, so = (s3, t, e, i) => {
  t.isDirectory() && ws(path__default.resolve(s3, t.name), e, i), ps(path__default.resolve(s3, t.name), e, i);
}, ws = (s3, t, e) => {
  let i;
  try {
    i = fs__default.readdirSync(s3, { withFileTypes: true });
  } catch (r) {
    let n = r;
    if (n?.code === "ENOENT") return;
    if (n?.code === "ENOTDIR" || n?.code === "ENOTSUP") return ps(s3, t, e);
    throw n;
  }
  for (let r of i) so(s3, r, t, e);
  return ps(s3, t, e);
};
var Se = class extends Error {
  path;
  code;
  syscall = "chdir";
  constructor(t, e) {
    super(`${e}: Cannot cd into '${t}'`), this.path = t, this.code = e;
  }
  get name() {
    return "CwdError";
  }
};
var St = class extends Error {
  path;
  symlink;
  syscall = "symlink";
  code = "TAR_SYMLINK_ERROR";
  constructor(t, e) {
    super("TAR_SYMLINK_ERROR: Cannot extract through symbolic link"), this.symlink = t, this.path = e;
  }
  get name() {
    return "SymlinkError";
  }
};
var no = (s3, t) => {
  fs__default.stat(s3, (e, i) => {
    (e || !i.isDirectory()) && (e = new Se(s3, e?.code || "ENOTDIR")), t(e);
  });
}, gr = (s3, t, e) => {
  s3 = f(s3);
  let i = t.umask ?? 18, r = t.mode | 448, n = (r & i) !== 0, o = t.uid, h = t.gid, a = typeof o == "number" && typeof h == "number" && (o !== t.processUid || h !== t.processGid), l = t.preserve, c = t.unlink, d = f(t.cwd), y = (E, x) => {
    E ? e(E) : x && a ? Es(x, o, h, (Le) => y(Le)) : n ? fs__default.chmod(s3, r, e) : e();
  };
  if (s3 === d) return no(s3, y);
  if (l) return fsp__default.mkdir(s3, { mode: r, recursive: true }).then((E) => y(null, E ?? void 0), y);
  let D = f(path__default.relative(d, s3)).split("/");
  Ss(d, D, r, c, d, void 0, y);
}, Ss = (s3, t, e, i, r, n, o) => {
  if (t.length === 0) return o(null, n);
  let h = t.shift(), a = f(path__default.resolve(s3 + "/" + h));
  fs__default.mkdir(a, e, br(a, t, e, i, r, n, o));
}, br = (s3, t, e, i, r, n, o) => (h) => {
  h ? fs__default.lstat(s3, (a, l) => {
    if (a) a.path = a.path && f(a.path), o(a);
    else if (l.isDirectory()) Ss(s3, t, e, i, r, n, o);
    else if (i) fs__default.unlink(s3, (c) => {
      if (c) return o(c);
      fs__default.mkdir(s3, e, br(s3, t, e, i, r, n, o));
    });
    else {
      if (l.isSymbolicLink()) return o(new St(s3, s3 + "/" + t.join("/")));
      o(h);
    }
  }) : (n = n || s3, Ss(s3, t, e, i, r, n, o));
}, oo = (s3) => {
  let t = false, e;
  try {
    t = fs__default.statSync(s3).isDirectory();
  } catch (i) {
    e = i?.code;
  } finally {
    if (!t) throw new Se(s3, e ?? "ENOTDIR");
  }
}, _r = (s3, t) => {
  s3 = f(s3);
  let e = t.umask ?? 18, i = t.mode | 448, r = (i & e) !== 0, n = t.uid, o = t.gid, h = typeof n == "number" && typeof o == "number" && (n !== t.processUid || o !== t.processGid), a = t.preserve, l = t.unlink, c = f(t.cwd), d = (E) => {
    E && h && ws(E, n, o), r && fs__default.chmodSync(s3, i);
  };
  if (s3 === c) return oo(c), d();
  if (a) return d(fs__default.mkdirSync(s3, { mode: i, recursive: true }) ?? void 0);
  let T = f(path__default.relative(c, s3)).split("/"), D;
  for (let E = T.shift(), x = c; E && (x += "/" + E); E = T.shift()) {
    x = f(path__default.resolve(x));
    try {
      fs__default.mkdirSync(x, i), D = D || x;
    } catch {
      let Le = fs__default.lstatSync(x);
      if (Le.isDirectory()) continue;
      if (l) {
        fs__default.unlinkSync(x), fs__default.mkdirSync(x, i), D = D || x;
        continue;
      } else if (Le.isSymbolicLink()) return new St(x, x + "/" + T.join("/"));
    }
  }
  return d(D);
};
var ys = /* @__PURE__ */ Object.create(null), Or = 1e4, Vt = /* @__PURE__ */ new Set(), Tr = (s3) => {
  Vt.has(s3) ? Vt.delete(s3) : ys[s3] = s3.normalize("NFD").toLocaleLowerCase("en").toLocaleUpperCase("en"), Vt.add(s3);
  let t = ys[s3], e = Vt.size - Or;
  if (e > Or / 10) {
    for (let i of Vt) if (Vt.delete(i), delete ys[i], --e <= 0) break;
  }
  return t;
};
var ho = process.env.TESTING_TAR_FAKE_PLATFORM || process.platform, ao = ho === "win32", lo = (s3) => s3.split("/").slice(0, -1).reduce((e, i) => {
  let r = e.at(-1);
  return r !== void 0 && (i = join(r, i)), e.push(i || "/"), e;
}, []), yi = class {
  #t = /* @__PURE__ */ new Map();
  #i = /* @__PURE__ */ new Map();
  #s = /* @__PURE__ */ new Set();
  reserve(t, e) {
    t = ao ? ["win32 parallelization disabled"] : t.map((r) => mt(join(Tr(r))));
    let i = new Set(t.map((r) => lo(r)).reduce((r, n) => r.concat(n)));
    this.#i.set(e, { dirs: i, paths: t });
    for (let r of t) {
      let n = this.#t.get(r);
      n ? n.push(e) : this.#t.set(r, [e]);
    }
    for (let r of i) {
      let n = this.#t.get(r);
      if (!n) this.#t.set(r, [/* @__PURE__ */ new Set([e])]);
      else {
        let o = n.at(-1);
        o instanceof Set ? o.add(e) : n.push(/* @__PURE__ */ new Set([e]));
      }
    }
    return this.#r(e);
  }
  #n(t) {
    let e = this.#i.get(t);
    if (!e) throw new Error("function does not have any path reservations");
    return { paths: e.paths.map((i) => this.#t.get(i)), dirs: [...e.dirs].map((i) => this.#t.get(i)) };
  }
  check(t) {
    let { paths: e, dirs: i } = this.#n(t);
    return e.every((r) => r && r[0] === t) && i.every((r) => r && r[0] instanceof Set && r[0].has(t));
  }
  #r(t) {
    return this.#s.has(t) || !this.check(t) ? false : (this.#s.add(t), t(() => this.#e(t)), true);
  }
  #e(t) {
    if (!this.#s.has(t)) return false;
    let e = this.#i.get(t);
    if (!e) throw new Error("invalid reservation");
    let { paths: i, dirs: r } = e, n = /* @__PURE__ */ new Set();
    for (let o of i) {
      let h = this.#t.get(o);
      if (!h || h?.[0] !== t) continue;
      let a = h[1];
      if (!a) {
        this.#t.delete(o);
        continue;
      }
      if (h.shift(), typeof a == "function") n.add(a);
      else for (let l of a) n.add(l);
    }
    for (let o of r) {
      let h = this.#t.get(o), a = h?.[0];
      if (!(!h || !(a instanceof Set))) if (a.size === 1 && h.length === 1) {
        this.#t.delete(o);
        continue;
      } else if (a.size === 1) {
        h.shift();
        let l = h[0];
        typeof l == "function" && n.add(l);
      } else a.delete(t);
    }
    return this.#s.delete(t), n.forEach((o) => this.#r(o)), true;
  }
};
var Lr = () => process.umask();
var Dr = Symbol("onEntry"), _s = Symbol("checkFs"), Nr = Symbol("checkFs2"), Os = Symbol("isReusable"), P = Symbol("makeFs"), Ts = Symbol("file"), xs = Symbol("directory"), gi = Symbol("link"), Ar = Symbol("symlink"), Ir = Symbol("hardlink"), Re = Symbol("ensureNoSymlink"), Cr = Symbol("unsupported"), Fr = Symbol("checkPath"), Rs = Symbol("stripAbsolutePath"), yt = Symbol("mkdir"), O = Symbol("onError"), Ri = Symbol("pending"), kr = Symbol("pend"), $t = Symbol("unpend"), gs = Symbol("ended"), bs = Symbol("maybeClose"), Ls = Symbol("skip"), ge = Symbol("doChown"), be = Symbol("uid"), _e = Symbol("gid"), Oe = Symbol("checkedCwd"), fo = process.env.TESTING_TAR_FAKE_PLATFORM || process.platform, Te = fo === "win32", uo = 1024, mo = (s3, t) => {
  if (!Te) return fs__default.unlink(s3, t);
  let e = s3 + ".DELETE." + randomBytes(16).toString("hex");
  fs__default.rename(s3, e, (i) => {
    if (i) return t(i);
    fs__default.unlink(e, t);
  });
}, po = (s3) => {
  if (!Te) return fs__default.unlinkSync(s3);
  let t = s3 + ".DELETE." + randomBytes(16).toString("hex");
  fs__default.renameSync(s3, t), fs__default.unlinkSync(t);
}, vr = (s3, t, e) => s3 !== void 0 && s3 === s3 >>> 0 ? s3 : t !== void 0 && t === t >>> 0 ? t : e, Xt = class extends rt {
  [gs] = false;
  [Oe] = false;
  [Ri] = 0;
  reservations = new yi();
  transform;
  writable = true;
  readable = false;
  uid;
  gid;
  setOwner;
  preserveOwner;
  processGid;
  processUid;
  maxDepth;
  forceChown;
  win32;
  newer;
  keep;
  noMtime;
  preservePaths;
  unlink;
  cwd;
  strip;
  processUmask;
  umask;
  dmode;
  fmode;
  chmod;
  constructor(t = {}) {
    if (t.ondone = () => {
      this[gs] = true, this[bs]();
    }, super(t), this.transform = t.transform, this.chmod = !!t.chmod, typeof t.uid == "number" || typeof t.gid == "number") {
      if (typeof t.uid != "number" || typeof t.gid != "number") throw new TypeError("cannot set owner without number uid and gid");
      if (t.preserveOwner) throw new TypeError("cannot preserve owner in archive and also set owner explicitly");
      this.uid = t.uid, this.gid = t.gid, this.setOwner = true;
    } else this.uid = void 0, this.gid = void 0, this.setOwner = false;
    this.preserveOwner = t.preserveOwner === void 0 && typeof t.uid != "number" ? process.getuid?.() === 0 : !!t.preserveOwner, this.processUid = (this.preserveOwner || this.setOwner) && process.getuid ? process.getuid() : void 0, this.processGid = (this.preserveOwner || this.setOwner) && process.getgid ? process.getgid() : void 0, this.maxDepth = typeof t.maxDepth == "number" ? t.maxDepth : uo, this.forceChown = t.forceChown === true, this.win32 = !!t.win32 || Te, this.newer = !!t.newer, this.keep = !!t.keep, this.noMtime = !!t.noMtime, this.preservePaths = !!t.preservePaths, this.unlink = !!t.unlink, this.cwd = f(path__default.resolve(t.cwd || process.cwd())), this.strip = Number(t.strip) || 0, this.processUmask = this.chmod ? typeof t.processUmask == "number" ? t.processUmask : Lr() : 0, this.umask = typeof t.umask == "number" ? t.umask : this.processUmask, this.dmode = t.dmode || 511 & ~this.umask, this.fmode = t.fmode || 438 & ~this.umask, this.on("entry", (e) => this[Dr](e));
  }
  warn(t, e, i = {}) {
    return (t === "TAR_BAD_ARCHIVE" || t === "TAR_ABORT") && (i.recoverable = false), super.warn(t, e, i);
  }
  [bs]() {
    this[gs] && this[Ri] === 0 && (this.emit("prefinish"), this.emit("finish"), this.emit("end"));
  }
  [Rs](t, e) {
    let i = t[e], { type: r } = t;
    if (!i || this.preservePaths) return true;
    let [n, o] = ce(i), h = o.replaceAll(/\\/g, "/").split("/");
    if (h.includes("..") || Te && /^[a-z]:\.\.$/i.test(h[0] ?? "")) {
      if (e === "path" || r === "Link") return this.warn("TAR_ENTRY_ERROR", `${e} contains '..'`, { entry: t, [e]: i }), false;
      let a = path__default.posix.dirname(t.path), l = path__default.posix.normalize(path__default.posix.join(a, h.join("/")));
      if (l.startsWith("../") || l === "..") return this.warn("TAR_ENTRY_ERROR", `${e} escapes extraction directory`, { entry: t, [e]: i }), false;
    }
    return n && (t[e] = String(o), this.warn("TAR_ENTRY_INFO", `stripping ${n} from absolute ${e}`, { entry: t, [e]: i })), true;
  }
  [Fr](t) {
    let e = f(t.path), i = e.split("/");
    if (this.strip) {
      if (i.length < this.strip) return false;
      if (t.type === "Link") {
        let r = f(String(t.linkpath)).split("/");
        if (r.length >= this.strip) t.linkpath = r.slice(this.strip).join("/");
        else return false;
      }
      i.splice(0, this.strip), t.path = i.join("/");
    }
    if (isFinite(this.maxDepth) && i.length > this.maxDepth) return this.warn("TAR_ENTRY_ERROR", "path excessively deep", { entry: t, path: e, depth: i.length, maxDepth: this.maxDepth }), false;
    if (!this[Rs](t, "path") || !this[Rs](t, "linkpath")) return false;
    if (t.absolute = path__default.isAbsolute(t.path) ? f(path__default.resolve(t.path)) : f(path__default.resolve(this.cwd, t.path)), !this.preservePaths && typeof t.absolute == "string" && t.absolute.indexOf(this.cwd + "/") !== 0 && t.absolute !== this.cwd) return this.warn("TAR_ENTRY_ERROR", "path escaped extraction target", { entry: t, path: f(t.path), resolvedPath: t.absolute, cwd: this.cwd }), false;
    if (t.absolute === this.cwd && t.type !== "Directory" && t.type !== "GNUDumpDir") return false;
    if (this.win32) {
      let { root: r } = path__default.win32.parse(String(t.absolute));
      t.absolute = r + ts(String(t.absolute).slice(r.length));
      let { root: n } = path__default.win32.parse(t.path);
      t.path = n + ts(t.path.slice(n.length));
    }
    return true;
  }
  [Dr](t) {
    if (!this[Fr](t)) return t.resume();
    switch (assert.equal(typeof t.absolute, "string"), t.type) {
      case "Directory":
      case "GNUDumpDir":
        t.mode && (t.mode = t.mode | 448);
      case "File":
      case "OldFile":
      case "ContiguousFile":
      case "Link":
      case "SymbolicLink":
        return this[_s](t);
      default:
        return this[Cr](t);
    }
  }
  [O](t, e) {
    t.name === "CwdError" ? this.emit("error", t) : (this.warn("TAR_ENTRY_ERROR", t, { entry: e }), this[$t](), e.resume());
  }
  [yt](t, e, i) {
    gr(f(t), { uid: this.uid, gid: this.gid, processUid: this.processUid, processGid: this.processGid, umask: this.processUmask, preserve: this.preservePaths, unlink: this.unlink, cwd: this.cwd, mode: e }, i);
  }
  [ge](t) {
    return this.forceChown || this.preserveOwner && (typeof t.uid == "number" && t.uid !== this.processUid || typeof t.gid == "number" && t.gid !== this.processGid) || typeof this.uid == "number" && this.uid !== this.processUid || typeof this.gid == "number" && this.gid !== this.processGid;
  }
  [be](t) {
    return vr(this.uid, t.uid, this.processUid);
  }
  [_e](t) {
    return vr(this.gid, t.gid, this.processGid);
  }
  [Ts](t, e) {
    let i = typeof t.mode == "number" ? t.mode & 4095 : this.fmode, r = new et(String(t.absolute), { flags: ms(t.size), mode: i, autoClose: false });
    r.on("error", (a) => {
      r.fd && fs__default.close(r.fd, () => {
      }), r.write = () => true, this[O](a, t), e();
    });
    let n = 1, o = (a) => {
      if (a) {
        r.fd && fs__default.close(r.fd, () => {
        }), this[O](a, t), e();
        return;
      }
      --n === 0 && r.fd !== void 0 && fs__default.close(r.fd, (l) => {
        l ? this[O](l, t) : this[$t](), e();
      });
    };
    r.on("finish", () => {
      let a = String(t.absolute), l = r.fd;
      if (typeof l == "number" && t.mtime && !this.noMtime) {
        n++;
        let c = t.atime || /* @__PURE__ */ new Date(), d = t.mtime;
        fs__default.futimes(l, c, d, (y) => y ? fs__default.utimes(a, c, d, (T) => o(T && y)) : o());
      }
      if (typeof l == "number" && this[ge](t)) {
        n++;
        let c = this[be](t), d = this[_e](t);
        typeof c == "number" && typeof d == "number" && fs__default.fchown(l, c, d, (y) => y ? fs__default.chown(a, c, d, (T) => o(T && y)) : o());
      }
      o();
    });
    let h = this.transform && this.transform(t) || t;
    h !== t && (h.on("error", (a) => {
      this[O](a, t), e();
    }), t.pipe(h)), h.pipe(r);
  }
  [xs](t, e) {
    let i = typeof t.mode == "number" ? t.mode & 4095 : this.dmode;
    this[yt](String(t.absolute), i, (r) => {
      if (r) {
        this[O](r, t), e();
        return;
      }
      let n = 1, o = () => {
        --n === 0 && (e(), this[$t](), t.resume());
      };
      t.mtime && !this.noMtime && (n++, fs__default.utimes(String(t.absolute), t.atime || /* @__PURE__ */ new Date(), t.mtime, o)), this[ge](t) && (n++, fs__default.chown(String(t.absolute), Number(this[be](t)), Number(this[_e](t)), o)), o();
    });
  }
  [Cr](t) {
    t.unsupported = true, this.warn("TAR_ENTRY_UNSUPPORTED", `unsupported entry type: ${t.type}`, { entry: t }), t.resume();
  }
  [Ar](t, e) {
    let i = f(path__default.relative(this.cwd, path__default.resolve(path__default.dirname(String(t.absolute)), String(t.linkpath)))).split("/");
    this[Re](t, this.cwd, i, () => this[gi](t, String(t.linkpath), "symlink", e), (r) => {
      this[O](r, t), e();
    });
  }
  [Ir](t, e) {
    let i = f(path__default.resolve(this.cwd, String(t.linkpath))), r = f(String(t.linkpath)).split("/");
    this[Re](t, this.cwd, r, () => this[gi](t, i, "link", e), (n) => {
      this[O](n, t), e();
    });
  }
  [Re](t, e, i, r, n) {
    let o = i.shift();
    if (this.preservePaths || o === void 0) return r();
    let h = path__default.resolve(e, o);
    fs__default.lstat(h, (a, l) => {
      if (a) return r();
      if (l?.isSymbolicLink()) return n(new St(h, path__default.resolve(h, i.join("/"))));
      this[Re](t, h, i, r, n);
    });
  }
  [kr]() {
    this[Ri]++;
  }
  [$t]() {
    this[Ri]--, this[bs]();
  }
  [Ls](t) {
    this[$t](), t.resume();
  }
  [Os](t, e) {
    return t.type === "File" && !this.unlink && e.isFile() && e.nlink <= 1 && !Te;
  }
  [_s](t) {
    this[kr]();
    let e = [t.path];
    t.linkpath && e.push(t.linkpath), this.reservations.reserve(e, (i) => this[Nr](t, i));
  }
  [Nr](t, e) {
    let i = (h) => {
      e(h);
    }, r = () => {
      this[yt](this.cwd, this.dmode, (h) => {
        if (h) {
          this[O](h, t), i();
          return;
        }
        this[Oe] = true, n();
      });
    }, n = () => {
      if (t.absolute !== this.cwd) {
        let h = f(path__default.dirname(String(t.absolute)));
        if (h !== this.cwd) return this[yt](h, this.dmode, (a) => {
          if (a) {
            this[O](a, t), i();
            return;
          }
          o();
        });
      }
      o();
    }, o = () => {
      fs__default.lstat(String(t.absolute), (h, a) => {
        if (a && (this.keep || this.newer && a.mtime > (t.mtime ?? a.mtime))) {
          this[Ls](t), i();
          return;
        }
        if (h || this[Os](t, a)) return this[P](null, t, i);
        if (a.isDirectory()) {
          if (t.type === "Directory") {
            let l = this.chmod && t.mode && (a.mode & 4095) !== t.mode, c = (d) => this[P](d ?? null, t, i);
            return l ? fs__default.chmod(String(t.absolute), Number(t.mode), c) : c();
          }
          if (t.absolute !== this.cwd) return fs__default.rmdir(String(t.absolute), (l) => this[P](l ?? null, t, i));
        }
        if (t.absolute === this.cwd) return this[P](null, t, i);
        mo(String(t.absolute), (l) => this[P](l ?? null, t, i));
      });
    };
    this[Oe] ? n() : r();
  }
  [P](t, e, i) {
    if (t) {
      this[O](t, e), i();
      return;
    }
    switch (e.type) {
      case "File":
      case "OldFile":
      case "ContiguousFile":
        return this[Ts](e, i);
      case "Link":
        return this[Ir](e, i);
      case "SymbolicLink":
        return this[Ar](e, i);
      case "Directory":
      case "GNUDumpDir":
        return this[xs](e, i);
    }
  }
  [gi](t, e, i, r) {
    fs__default[i](e, String(t.absolute), (n) => {
      n ? this[O](n, t) : (this[$t](), t.resume()), r();
    });
  }
}, ye = (s3) => {
  try {
    return [null, s3()];
  } catch (t) {
    return [t, null];
  }
}, xe = class extends Xt {
  sync = true;
  [P](t, e) {
    return super[P](t, e, () => {
    });
  }
  [_s](t) {
    if (!this[Oe]) {
      let n = this[yt](this.cwd, this.dmode);
      if (n) return this[O](n, t);
      this[Oe] = true;
    }
    if (t.absolute !== this.cwd) {
      let n = f(path__default.dirname(String(t.absolute)));
      if (n !== this.cwd) {
        let o = this[yt](n, this.dmode);
        if (o) return this[O](o, t);
      }
    }
    let [e, i] = ye(() => fs__default.lstatSync(String(t.absolute)));
    if (i && (this.keep || this.newer && i.mtime > (t.mtime ?? i.mtime))) return this[Ls](t);
    if (e || this[Os](t, i)) return this[P](null, t);
    if (i.isDirectory()) {
      if (t.type === "Directory") {
        let o = this.chmod && t.mode && (i.mode & 4095) !== t.mode, [h] = o ? ye(() => {
          fs__default.chmodSync(String(t.absolute), Number(t.mode));
        }) : [];
        return this[P](h, t);
      }
      let [n] = ye(() => fs__default.rmdirSync(String(t.absolute)));
      this[P](n, t);
    }
    let [r] = t.absolute === this.cwd ? [] : ye(() => po(String(t.absolute)));
    this[P](r, t);
  }
  [Ts](t, e) {
    let i = typeof t.mode == "number" ? t.mode & 4095 : this.fmode, r = (h) => {
      let a;
      try {
        fs__default.closeSync(n);
      } catch (l) {
        a = l;
      }
      (h || a) && this[O](h || a, t), e();
    }, n;
    try {
      n = fs__default.openSync(String(t.absolute), ms(t.size), i);
    } catch (h) {
      return r(h);
    }
    let o = this.transform && this.transform(t) || t;
    o !== t && (o.on("error", (h) => this[O](h, t)), t.pipe(o)), o.on("data", (h) => {
      try {
        fs__default.writeSync(n, h, 0, h.length);
      } catch (a) {
        r(a);
      }
    }), o.on("end", () => {
      let h = null;
      if (t.mtime && !this.noMtime) {
        let a = t.atime || /* @__PURE__ */ new Date(), l = t.mtime;
        try {
          fs__default.futimesSync(n, a, l);
        } catch (c) {
          try {
            fs__default.utimesSync(String(t.absolute), a, l);
          } catch {
            h = c;
          }
        }
      }
      if (this[ge](t)) {
        let a = this[be](t), l = this[_e](t);
        try {
          fs__default.fchownSync(n, Number(a), Number(l));
        } catch (c) {
          try {
            fs__default.chownSync(String(t.absolute), Number(a), Number(l));
          } catch {
            h = h || c;
          }
        }
      }
      r(h);
    });
  }
  [xs](t, e) {
    let i = typeof t.mode == "number" ? t.mode & 4095 : this.dmode, r = this[yt](String(t.absolute), i);
    if (r) {
      this[O](r, t), e();
      return;
    }
    if (t.mtime && !this.noMtime) try {
      fs__default.utimesSync(String(t.absolute), t.atime || /* @__PURE__ */ new Date(), t.mtime);
    } catch {
    }
    if (this[ge](t)) try {
      fs__default.chownSync(String(t.absolute), Number(this[be](t)), Number(this[_e](t)));
    } catch {
    }
    e(), t.resume();
  }
  [yt](t, e) {
    try {
      return _r(f(t), { uid: this.uid, gid: this.gid, processUid: this.processUid, processGid: this.processGid, umask: this.processUmask, preserve: this.preservePaths, unlink: this.unlink, cwd: this.cwd, mode: e });
    } catch (i) {
      return i;
    }
  }
  [Re](t, e, i, r, n) {
    if (this.preservePaths || i.length === 0) return r();
    let o = e;
    for (let h of i) {
      o = path__default.resolve(o, h);
      let [a, l] = ye(() => fs__default.lstatSync(o));
      if (a) return r();
      if (l.isSymbolicLink()) return n(new St(o, path__default.resolve(e, i.join("/"))));
    }
    r();
  }
  [gi](t, e, i, r) {
    let n = `${i}Sync`;
    try {
      fs__default[n](e, String(t.absolute)), r(), t.resume();
    } catch (o) {
      return this[O](o, t);
    }
  }
};
var Eo = (s3) => {
  let t = new xe(s3), e = s3.file, i = fs__default.statSync(e), r = s3.maxReadSize || 16 * 1024 * 1024;
  new Be(e, { readSize: r, size: i.size }).pipe(t);
}, wo = (s3, t) => {
  let e = new Xt(s3), i = s3.maxReadSize || 16 * 1024 * 1024, r = s3.file;
  return new Promise((o, h) => {
    e.on("error", h), e.on("close", o), fs__default.stat(r, (a, l) => {
      if (a) h(a);
      else {
        let c = new _t(r, { readSize: i, size: l.size });
        c.on("error", h), c.pipe(e);
      }
    });
  });
}, So = K(Eo, wo, (s3) => new xe(s3), (s3) => new Xt(s3), (s3, t) => {
  t?.length && Qi(s3, t);
});
var yo = (s3, t) => {
  let e = new kt(s3), i = true, r, n;
  try {
    try {
      r = fs__default.openSync(s3.file, "r+");
    } catch (a) {
      if (a?.code === "ENOENT") r = fs__default.openSync(s3.file, "w+");
      else throw a;
    }
    let o = fs__default.fstatSync(r), h = Buffer.alloc(512);
    t: for (n = 0; n < o.size; n += 512) {
      for (let c = 0, d = 0; c < 512; c += d) {
        if (d = fs__default.readSync(r, h, c, h.length - c, n + c), n === 0 && h[0] === 31 && h[1] === 139) throw new Error("cannot append to compressed archives");
        if (!d) break t;
      }
      let a = new F(h);
      if (!a.cksumValid) break;
      let l = 512 * Math.ceil((a.size || 0) / 512);
      if (n + l + 512 > o.size) break;
      n += l, s3.mtimeCache && a.mtime && s3.mtimeCache.set(String(a.path), a.mtime);
    }
    i = false, Ro(s3, e, n, r, t);
  } finally {
    if (i) try {
      fs__default.closeSync(r);
    } catch {
    }
  }
}, Ro = (s3, t, e, i, r) => {
  let n = new Wt(s3.file, { fd: i, start: e });
  t.pipe(n), bo(t, r);
}, go = (s3, t) => {
  t = Array.from(t);
  let e = new wt(s3), i = (n, o, h) => {
    let a = (T, D) => {
      T ? fs__default.close(n, (E) => h(T)) : h(null, D);
    }, l = 0;
    if (o === 0) return a(null, 0);
    let c = 0, d = Buffer.alloc(512), y = (T, D) => {
      if (T || D === void 0) return a(T);
      if (c += D, c < 512 && D) return fs__default.read(n, d, c, d.length - c, l + c, y);
      if (l === 0 && d[0] === 31 && d[1] === 139) return a(new Error("cannot append to compressed archives"));
      if (c < 512) return a(null, l);
      let E = new F(d);
      if (!E.cksumValid) return a(null, l);
      let x = 512 * Math.ceil((E.size ?? 0) / 512);
      if (l + x + 512 > o || (l += x + 512, l >= o)) return a(null, l);
      s3.mtimeCache && E.mtime && s3.mtimeCache.set(String(E.path), E.mtime), c = 0, fs__default.read(n, d, 0, 512, l, y);
    };
    fs__default.read(n, d, 0, 512, l, y);
  };
  return new Promise((n, o) => {
    e.on("error", o);
    let h = "r+", a = (l, c) => {
      if (l && l.code === "ENOENT" && h === "r+") return h = "w+", fs__default.open(s3.file, h, a);
      if (l || !c) return o(l);
      fs__default.fstat(c, (d, y) => {
        if (d) return fs__default.close(c, () => o(d));
        i(c, y.size, (T, D) => {
          if (T) return o(T);
          let E = new et(s3.file, { fd: c, start: D });
          e.pipe(E), E.on("error", o), E.on("close", n), _o(e, t);
        });
      });
    };
    fs__default.open(s3.file, h, a);
  });
}, bo = (s3, t) => {
  t.forEach((e) => {
    e.charAt(0) === "@" ? Ct({ file: path__default.resolve(s3.cwd, e.slice(1)), sync: true, noResume: true, onReadEntry: (i) => s3.add(i) }) : s3.add(e);
  }), s3.end();
}, _o = async (s3, t) => {
  for (let e of t) e.charAt(0) === "@" ? await Ct({ file: path__default.resolve(String(s3.cwd), e.slice(1)), noResume: true, onReadEntry: (i) => s3.add(i) }) : s3.add(e);
  s3.end();
}, vt = K(yo, go, () => {
  throw new TypeError("file is required");
}, () => {
  throw new TypeError("file is required");
}, (s3, t) => {
  if (!Bs(s3)) throw new TypeError("file is required");
  if (s3.gzip || s3.brotli || s3.zstd || s3.file.endsWith(".br") || s3.file.endsWith(".tbr")) throw new TypeError("cannot append to compressed archives");
  if (!t?.length) throw new TypeError("no paths specified to add/replace");
});
K(vt.syncFile, vt.asyncFile, vt.syncNoFile, vt.asyncNoFile, (s3, t = []) => {
  vt.validate?.(s3, t), To(s3);
});
var To = (s3) => {
  let t = s3.filter;
  s3.mtimeCache || (s3.mtimeCache = /* @__PURE__ */ new Map()), s3.filter = t ? (e, i) => t(e, i) && !((s3.mtimeCache?.get(e) ?? i.mtime ?? 0) > (i.mtime ?? 0)) : (e, i) => !((s3.mtimeCache?.get(e) ?? i.mtime ?? 0) > (i.mtime ?? 0));
};
const VERSION = "3.12.8";
const BUILD_TAG = "20250106";
const PER_ATTEMPT_TIMEOUT_MS = 3e4;
const MAX_ATTEMPTS = 3;
const STALE_LOCK_MS = 5 * 60 * 1e3;
const DOWNLOAD_COOLDOWN_MS = 60 * 60 * 1e3;
const CDN_BASE_DOMESTIC = "https://cdn.hailuoai.com/hailuo-video-web/public_assets";
const CDN_BASE_OVERSEAS = "https://cdn.hailuoai.video/open-hailuo-video-web/public_assets";
const CDN_ASSET_MAP = {
  "darwin-arm64": {
    file: `cpython-${VERSION}+${BUILD_TAG}-aarch64-apple-darwin-install_only.tar.gz`,
    domestic: "1a3b7f0c-7702-42cd-8ccc-0d92e4259da7.gz",
    overseas: "458f28f9-a860-43fd-8adf-f8adc4070f43.gz"
  },
  "darwin-x64": {
    file: `cpython-${VERSION}+${BUILD_TAG}-x86_64-apple-darwin-install_only.tar.gz`,
    domestic: "7a5a2db7-6c51-4292-a16c-ca568a94f692.gz",
    overseas: "4b156bec-8400-411c-85bf-e186228aeb6e.gz"
  },
  "win32-x64": {
    file: `cpython-${VERSION}+${BUILD_TAG}-x86_64-pc-windows-msvc-install_only.tar.gz`,
    domestic: "ec36c1ac-722c-4622-852d-3293a9068f29.gz",
    overseas: "d95bc8d2-9087-4f49-ae4c-db8967a071b5.gz"
  },
  "linux-x64": {
    file: `cpython-${VERSION}+${BUILD_TAG}-x86_64-unknown-linux-gnu-install_only.tar.gz`,
    domestic: "2d11b883-78ba-449b-9953-55256460673f.gz",
    overseas: "d272bc3c-1bf6-4426-a2bb-0c4b1939dc6b.gz"
  }
};
function pythonDir() {
  return resolveRuntimeDir("python");
}
function binaryPath() {
  return process.platform === "win32" ? path.join(pythonDir(), "python.exe") : path.join(pythonDir(), "bin", "python3");
}
function pythonBinDir() {
  return path.dirname(binaryPath());
}
function getPythonRuntimeBinDir() {
  const key = `${process.platform}-${process.arch}`;
  return CDN_ASSET_MAP[key] ? pythonBinDir() : null;
}
function versionStampPath() {
  return path.join(path.dirname(pythonDir()), `python.${process.platform}-${process.arch}.version`);
}
function lockFilePath() {
  return path.join(path.dirname(pythonDir()), ".python-download.lock");
}
function downloadFailedPath() {
  return path.join(path.dirname(pythonDir()), ".python-download-failed");
}
function expectedStamp() {
  return `${VERSION}+${BUILD_TAG}`;
}
function resolveDownloadUrl(asset) {
  const envUrl = process.env.PYTHON_DOWNLOAD_URL?.trim();
  if (envUrl) return envUrl;
  const region = process.env.HILO_RELEASE_REGION;
  if (region === "overseas") {
    return `${CDN_BASE_OVERSEAS}/${asset.overseas}`;
  }
  return `${CDN_BASE_DOMESTIC}/${asset.domestic}`;
}
async function ensurePython(log, opts = {}) {
  const bin = binaryPath();
  const stamp = versionStampPath();
  const expected = expectedStamp();
  if (fs$1.existsSync(bin)) {
    try {
      if (fs$1.readFileSync(stamp, "utf8").trim() === expected) return pythonBinDir();
    } catch {
      return pythonBinDir();
    }
  }
  const key = `${process.platform}-${process.arch}`;
  const asset = CDN_ASSET_MAP[key];
  if (!asset) {
    log.warn(`[python-runtime] Unsupported platform: ${key}`);
    return null;
  }
  const failedMark = downloadFailedPath();
  try {
    const stat = fs$1.statSync(failedMark);
    if (!opts.force && Date.now() - stat.mtimeMs < DOWNLOAD_COOLDOWN_MS) {
      log.info("[python-runtime] Download recently failed, skipping retry (1h cooldown)");
      return fs$1.existsSync(bin) ? pythonBinDir() : null;
    }
  } catch {
  }
  if (!acquireDownloadLock(log)) return null;
  const url = resolveDownloadUrl(asset);
  if (process.env.PYTHON_DOWNLOAD_URL?.trim()) {
    log.info(`[python-runtime] Using custom download URL: ${url}`);
  }
  log.info(`[python-runtime] Downloading Python runtime (~15 MB) from CDN...`);
  const tmpDir = fs$1.mkdtempSync(path.join(os$1.tmpdir(), "hub-python-"));
  const archivePath = path.join(tmpDir, asset.file);
  try {
    await download(url, archivePath);
    await extractArchive(archivePath, tmpDir);
    fs$1.mkdirSync(path.dirname(stamp), { recursive: true });
    fs$1.writeFileSync(stamp, `${expected}
`, "utf8");
    try {
      fs$1.rmSync(failedMark, { force: true });
    } catch {
    }
    if (!fs$1.existsSync(bin)) {
      log.error("[python-runtime] Binary missing after extraction, aborting");
      return null;
    }
    log.info(`[python-runtime] Ready at ${pythonDir()}`);
    return pythonBinDir();
  } catch (err) {
    log.error(
      `[python-runtime] Download failed: ${err instanceof Error ? err.message : String(err)}`
    );
    try {
      fs$1.writeFileSync(failedMark, `${Date.now()}
`, "utf8");
    } catch {
    }
    if (fs$1.existsSync(bin)) {
      log.warn("[python-runtime] Falling back to existing Python binary");
      return pythonBinDir();
    }
    return null;
  } finally {
    fs$1.rmSync(tmpDir, { recursive: true, force: true });
    releaseDownloadLock();
  }
}
async function download(url, dest) {
  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PER_ATTEMPT_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("Empty response body");
      await pipeline(
        Readable.fromWeb(res.body),
        fs$1.createWriteStream(dest)
      );
      return;
    } catch (err) {
      if (controller.signal.aborted) {
        lastErr = new Error(`Download timed out (attempt ${attempt}/${MAX_ATTEMPTS})`);
      } else {
        lastErr = err instanceof Error ? err : new Error(String(err));
      }
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, attempt * 2e3));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error("Download failed");
}
function isRecoverableMoveError(code, platform) {
  if (code === "EXDEV") return true;
  if (platform === "win32") {
    return code === "EPERM" || code === "EACCES" || code === "EEXIST" || code === "ENOTEMPTY";
  }
  return false;
}
function moveDirSync(src, dest) {
  try {
    fs$1.renameSync(src, dest);
    return;
  } catch (err) {
    const code = err.code;
    if (!isRecoverableMoveError(code, process.platform)) throw err;
  }
  const failures = copyDirRecursive(src, dest);
  if (failures > 0) {
    throw new Error(`Failed to copy ${failures} file(s) while moving Python runtime`);
  }
  fs$1.rmSync(src, { recursive: true, force: true });
}
async function extractArchive(archivePath, tmpDir) {
  const extractDir = path.join(tmpDir, "__extract__");
  fs$1.mkdirSync(extractDir, { recursive: true });
  await So({ file: archivePath, cwd: extractDir });
  const entries = fs$1.readdirSync(extractDir);
  const sub = entries.find((e) => e === "python" || e.startsWith("python"));
  const root = sub ? path.join(extractDir, sub) : extractDir;
  const dest = pythonDir();
  const oldDest = `${dest}.old`;
  if (fs$1.existsSync(dest)) {
    fs$1.rmSync(oldDest, { recursive: true, force: true });
    moveDirSync(dest, oldDest);
  }
  fs$1.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    moveDirSync(root, dest);
  } catch (err) {
    if (fs$1.existsSync(oldDest)) {
      moveDirSync(oldDest, dest);
    }
    throw err;
  }
  fs$1.rmSync(oldDest, { recursive: true, force: true });
  if (process.platform !== "win32") {
    const bin = path.join(dest, "bin", "python3");
    if (fs$1.existsSync(bin)) fs$1.chmodSync(bin, 493);
  }
}
function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
function acquireDownloadLock(log) {
  const lock = lockFilePath();
  if (fs$1.existsSync(lock)) {
    try {
      const content = fs$1.readFileSync(lock, "utf8").trim();
      const pid = Number.parseInt(content, 10);
      if (!Number.isNaN(pid) && pid > 0) {
        if (isProcessAlive(pid)) {
          log.info("[python-runtime] Another instance is downloading, skipping");
          return false;
        }
      } else {
        const stat = fs$1.statSync(lock);
        if (Date.now() - stat.mtimeMs < STALE_LOCK_MS) {
          log.info("[python-runtime] Another instance is downloading, skipping");
          return false;
        }
      }
      fs$1.rmSync(lock, { force: true });
    } catch {
    }
  }
  try {
    fs$1.mkdirSync(path.dirname(lock), { recursive: true });
    fs$1.writeFileSync(lock, `${process.pid}
`, { flag: "wx" });
    return true;
  } catch (err) {
    if (err.code === "EEXIST") {
      log.info("[python-runtime] Another instance is downloading, skipping");
      return false;
    }
    return true;
  }
}
function releaseDownloadLock() {
  try {
    fs$1.rmSync(lockFilePath(), { force: true });
  } catch {
  }
}
export {
  createSingleCallFunction as $,
  createDecorator as A,
  resolveAssetCenterRoot as B,
  isInsideOptionalPath as C,
  toDisposable as D,
  Emitter as E,
  isGatewayReady as F,
  GatewayManager as G,
  HILO_AGENT_RUN_ID_ENV as H,
  IInstantiationService as I,
  ILogService as J,
  toExtendedLengthPath as K,
  LogLevel as L,
  rewriteUnderRoot as M,
  copyDirectoryAtomic as N,
  OpenCodeManager as O,
  DirectoryCopyError as P,
  isPathInsideOrSame as Q,
  Disposable as R,
  Event as S,
  CancellationError as T,
  ErrorNoTelemetry as U,
  DisposableStore as V,
  WorkspaceShutdownFoldersMissingError as W,
  EventMultiplexer as X,
  onUnexpectedError as Y,
  Relay as Z,
  _util as _,
  isValidSkillName as a,
  getRequestAdAttributionUrl as a$,
  pluginDataDir as a0,
  comfyUiManagedDataDirs as a1,
  customMcpNameIdentity as a2,
  resolveNodePackageDir as a3,
  resolvePythonPackageDir as a4,
  allSkillsDirs as a5,
  ICustomMcpService as a6,
  errorHandler as a7,
  resolveProjectFolder as a8,
  isFileMissingError as a9,
  PATTERN_WINDOWS_RUNTIME_DEPENDENCY_FAILED as aA,
  PATTERN_WINDOWS_BINARY_INCOMPATIBLE as aB,
  PATTERN_WINDOWS_RUNTIME_RESOURCE_EXHAUSTED as aC,
  PATTERN_WINDOWS_RUNTIME_TERMINATED as aD,
  PATTERN_PERMISSION as aE,
  WORKSPACE_DATABASE_SCHEMA_AHEAD_MARKER as aF,
  WORKSPACE_DATABASE_MIGRATION_CONFLICT_MARKER as aG,
  WORKSPACE_DATABASE_MIGRATION_FAILED_MARKER as aH,
  PATTERN_OPENCODE_DB_SCHEMA_MISMATCH as aI,
  IGatewayManager as aJ,
  MAX_OPEN_WORKSPACES as aK,
  normalizeMaxOpenWorkspaces as aL,
  canTransitionWorkspaceLifecycle as aM,
  isWorkspaceLifecycleTerminal as aN,
  hasEffectiveResolvedProxy as aO,
  getWindowsVersionVerification as aP,
  isWindowsCpuUnsupported as aQ,
  detectWindowsSse42Support as aR,
  normalizeNetworkProxyMode as aS,
  sanitizeFileName as aT,
  sanitizeAssetLeaf as aU,
  PROJECT_INTERNAL_DIR_NAME as aV,
  PROJECT_ASSET_INDEX_DB_NAME as aW,
  PROJECT_ASSETS_DIR_NAME as aX,
  ANCHOR_PENDING_EVENTS_FILE as aY,
  PROJECT_ASSET_MAX_FOLDER_DEPTH as aZ,
  PROJECT_ASSET_MAX_FILE_DEPTH as a_,
  reportCorruptJsonFile as aa,
  buildOpenCodeEnv as ab,
  canTransition as ac,
  captureRuntimeExitProof as ad,
  WORKSPACE_DATABASE_RECOVERY_REQUIRED_MARKER as ae,
  MACOS_VERSION_UNSUPPORTED_DIAGNOSIS_CODE as af,
  MIN_SUPPORTED_MACOS_VERSION as ag,
  WINDOWS_VERSION_UNSUPPORTED_DIAGNOSIS_CODE as ah,
  MIN_SUPPORTED_WINDOWS_VERSION_LABEL as ai,
  WINDOWS_VERSION_UNVERIFIED_DIAGNOSIS_CODE as aj,
  getRestartCircuitBlockInfo as ak,
  PATTERN_CONFIG_JSON as al,
  PATTERN_PERMISSION_MKDIR as am,
  PATTERN_PROXY as an,
  PATTERN_TLS as ao,
  PATTERN_DNS as ap,
  PATTERN_TIMEOUT as aq,
  PATTERN_CONN_RESET as ar,
  PATTERN_CONN_REFUSED as as,
  PATTERN_PORT_CONFLICT as at,
  PATTERN_BINARY_BLOCKED as au,
  PATTERN_BINARY_CORRUPTED as av,
  PATTERN_MACOS_VERSION_UNSUPPORTED as aw,
  PATTERN_WINDOWS_VERSION_UNSUPPORTED as ax,
  PATTERN_WINDOWS_VERSION_UNVERIFIED as ay,
  PATTERN_WINDOWS_CPU_UNSUPPORTED as az,
  HeadlessDriver as b,
  isCustomModelProvider as b0,
  customModelRuntimeId as b1,
  validateCustomModelInput as b2,
  resolveProjectSpacesRoot as b3,
  HILO_BIZ_ID as b4,
  PATH_ACCESS_DENIED_PREFIX as b5,
  WORKSPACE_INDEX_RECOVERY_EVENT_NAME as b6,
  readLegacyDbImportRecord as b7,
  peekWindowsVersionVerification as b8,
  getErrorMessage as b9,
  cleanupOrphanedAgentStagingDirs as bA,
  resolveProjectsRoot as bB,
  HUB_ROOT_SEGMENTS as bC,
  rewriteOpenCodeSessionDirectories as bD,
  PROJECT_SPACES_DIR_NAME as bE,
  projectFolderName as bF,
  resolveProjectLocationsPath as bG,
  MutableDisposable as bH,
  userPermissionsFile as bI,
  getPythonRuntimeBinDir as bJ,
  defaultAssetCenterRoot as bK,
  resolveOutputDir as bL,
  parseResolvedProxy as bM,
  VELOPACK_PROXY_ENV_SNAPSHOT as bN,
  WORKSPACE_RUNTIME_APOLLO_KEY as bO,
  mapWorkspaceRuntimeRemoteConfig as bP,
  resolveConfigDir as bQ,
  resolveAgentProfilePaths as bR,
  assertAgentProfileComplete as bS,
  resolveWorkflowsDirFromConfigDir as bT,
  isGatewayStartupError as bU,
  createAgentTimeoutEnvRegistry as bV,
  normalizePortableBasename as bW,
  PROJECT_DIR_NAME_MAX_CHARS as bX,
  stripProviderSecrets as bY,
  fetchRemoteProviderConfigResult as bZ,
  createWorkspaceShutdownConsent as ba,
  prepareTokensWithAttribution as bb,
  workspacePathRewriteMappings as bc,
  copyDirRecursive as bd,
  isWinPathInsideOrSame as be,
  getTokenAdAttribution as bf,
  preserveStoredCustomModels as bg,
  hubRoot as bh,
  resolveRuntimeDir as bi,
  So as bj,
  setCorruptJsonRecoveryListener as bk,
  toOpenCodeMcpConfig as bl,
  toCustomMcpServerSummary as bm,
  normalizeCustomMcpServerInput as bn,
  CustomMcpValidationError as bo,
  isReservedCustomMcpName as bp,
  CONNECTOR_SKILL_ORIGIN_FILE as bq,
  formatTransportError as br,
  resolveConnectorDataDir as bs,
  resolveHubCliBinDir as bt,
  subAgentSkillsDir as bu,
  parseToolConfirmRejectReason as bv,
  WorkspaceGatewayClient as bw,
  inspectWindowsPeFile as bx,
  WINDOWS_RUNTIME_COMPATIBILITY as by,
  runRuntimeMigrations as bz,
  HeadlessServer as c,
  parseHeadlessPort as d,
  ensurePython as e,
  publishComfyUiHostPid as f,
  fetchRemoteProviderConfig as g,
  ensureSystemCaCerts as h,
  installedSkillsDir as i,
  setupAgentStaging as j,
  buildConfigContent as k,
  filterAgentProfileOwnedEnv as l,
  mapCloudSkillToMarketSkillInfo as m,
  resolveAgentTimeoutEnv as n,
  HILO_MANAGED_RUNTIME_ENV as o,
  parseFrontmatter as p,
  HILO_MANAGED_RUNTIME_VALUE as q,
  resolvedSkillPaths as r,
  setupOpenCodeRuntimeDirs as s,
  applyNodeExtraCaCerts as t,
  reapComfyUiBackend as u,
  normalizeVersionCodeForCloud as v,
  workspaceGatewayUrl as w,
  dispose as x,
  isDisposable as y,
  illegalState as z
};
