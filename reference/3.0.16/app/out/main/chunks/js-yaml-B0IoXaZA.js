import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
function hasNonAscii(s) {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) > 127) return true;
  }
  return false;
}
const WINDOWS_ENV_BLOCK_LIMIT = 3e4;
const WINDOWS_ENV_BLOCKLIST = /* @__PURE__ */ new Set([
  // PowerShell — often 2-5KB
  "PSModulePath",
  // Visual Studio / MSVC
  "VSINSTALLDIR",
  "VS140COMNTOOLS",
  "VS150COMNTOOLS",
  "VS160COMNTOOLS",
  "VSCMD_ARG_app_plat",
  "VSCMD_ARG_HOST_ARCH",
  "VSCMD_ARG_TGT_ARCH",
  "VSCMD_VER",
  "VCINSTALLDIR",
  "VCIDEInstallDir",
  "VCToolsInstallDir",
  "VCToolsRedistDir",
  "VCToolsVersion",
  "VisualStudioVersion",
  "WindowsSdkDir",
  "WindowsSdkBinPath",
  "WindowsSDKLibVersion",
  "WindowsSDKVersion",
  "WindowsSdkVerBinPath",
  "UCRTVersion",
  "UniversalCRTSdkDir",
  "ExtensionSdkDir",
  "Framework40Version",
  "FrameworkDir",
  "FrameworkDir32",
  "FrameworkVersion",
  "FrameworkVersion32",
  "INCLUDE",
  "LIB",
  "LIBPATH",
  "NETFXSDKDir",
  // Chocolatey
  "ChocolateyInstall",
  "ChocolateyLastPathUpdate",
  "ChocolateyToolsLocation",
  // Android
  "ANDROID_HOME",
  "ANDROID_SDK_ROOT",
  "ANDROID_NDK_ROOT",
  // Python
  "CONDA_DEFAULT_ENV",
  "CONDA_PREFIX",
  "CONDA_PYTHON_EXE",
  "CONDA_SHLVL",
  "_CE_CONDA",
  "_CE_M",
  // Java
  "CLASSPATH",
  "MAVEN_HOME",
  "GRADLE_HOME",
  // Ruby
  "GEM_HOME",
  "GEM_PATH",
  // Go (not needed for spawned binaries)
  "GOPATH",
  "GOROOT",
  // Rust
  "CARGO_HOME",
  "RUSTUP_HOME"
]);
const KEEP_PREFIXES = [
  "OPENCODE_",
  "HILO_",
  "NODE_",
  "ELECTRON_",
  "SystemRoot",
  "SystemDrive",
  "WINDIR",
  "COMSPEC",
  "TEMP",
  "TMP",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "PROGRAMDATA",
  "HOMEDRIVE",
  "HOMEPATH",
  "USERNAME",
  "PATH",
  "PATHEXT",
  "OS",
  "NUMBER_OF_PROCESSORS",
  "PROCESSOR_"
];
function measureEnvBlock(env) {
  return Object.entries(env).reduce((sum, [k, v]) => sum + k.length + (v?.length ?? 0) + 2, 0);
}
function trimWindowsEnvBlock(env, logService) {
  const before = measureEnvBlock(env);
  if (before <= WINDOWS_ENV_BLOCK_LIMIT) return;
  let removed = 0;
  for (const key of WINDOWS_ENV_BLOCKLIST) {
    if (key in env) {
      delete env[key];
      removed++;
    }
  }
  const afterPhase1 = measureEnvBlock(env);
  if (afterPhase1 <= WINDOWS_ENV_BLOCK_LIMIT) {
    logService.info(
      `[windows-env] Env trimmed: ${before}B → ${afterPhase1}B (removed ${removed} blocklisted vars)`
    );
    return;
  }
  const isKeep = (key) => KEEP_PREFIXES.some((p) => key.toUpperCase().startsWith(p.toUpperCase()));
  const removable = Object.entries(env).filter(([k, v]) => v !== void 0 && !isKeep(k)).sort((a, b) => (b[1]?.length ?? 0) - (a[1]?.length ?? 0));
  for (const [key] of removable) {
    if (measureEnvBlock(env) <= WINDOWS_ENV_BLOCK_LIMIT) break;
    delete env[key];
    removed++;
  }
  const after = measureEnvBlock(env);
  logService.warn(
    `[windows-env] Env aggressively trimmed: ${before}B → ${after}B (removed ${removed} vars total)`
  );
}
const TAG = "[safe-spawn-path]";
const WINDOWS_JUNCTION_HASH_LENGTH = 12;
function normalizeWindowsJunctionTarget(targetDir) {
  return path.win32.normalize(targetDir.replace(/^(\\\\\?\\|\\\?\?\\)/, "")).replace(/[\\/]+$/, "").toLowerCase();
}
function windowsJunctionHash(targetDir) {
  return createHash("md5").update(normalizeWindowsJunctionTarget(targetDir)).digest("hex").slice(0, WINDOWS_JUNCTION_HASH_LENGTH);
}
const SAFE_WORK_ROOT_CANDIDATES = [
  path.join(process.env.ProgramData || "C:\\ProgramData", "MiniMaxHub"),
  path.join(process.env.PUBLIC || "C:\\Users\\Public", "MiniMaxHub")
];
class SafeSpawnPathResolver {
  constructor(log) {
    this.log = log;
    this._installDir = process.platform === "win32" ? path.win32.dirname(process.execPath) : path.dirname(process.execPath);
  }
  /** Original install directory (may contain non-ASCII). */
  _installDir;
  /** Safe (ASCII-only) replacement, or `null` if resolution failed / not needed. */
  _safeDir = null;
  /** Whether we've already attempted resolution. */
  _resolved = false;
  /** Writable ASCII root for helper files / junctions (`null` means probed and unavailable). */
  _safeWorkRoot = void 0;
  /**
   * Replace the non-ASCII install-dir prefix in `targetPath` with a safe
   * ASCII equivalent.  Returns the original path unchanged when:
   * - platform is not Windows
   * - install dir is already ASCII
   * - `targetPath` doesn't start with the install dir
   */
  resolve(targetPath) {
    if (process.platform !== "win32") return targetPath;
    if (!hasNonAscii(this._installDir)) return targetPath;
    if (!this._resolved) {
      this._resolved = true;
      this._safeDir = this.resolveInstallDir();
    }
    if (!this._safeDir) return targetPath;
    if (targetPath.toLowerCase().startsWith(this._installDir.toLowerCase())) {
      return this._safeDir + targetPath.slice(this._installDir.length);
    }
    return targetPath;
  }
  // ---- strategy chain -----------------------------------------------------
  resolveInstallDir() {
    this.log.info(`${TAG} Install directory contains non-ASCII characters: "${this._installDir}"`);
    const shortDir = this.tryShortPath(this._installDir);
    if (shortDir) {
      this.log.info(`${TAG} Strategy 1 (8.3 short path) succeeded: "${shortDir}"`);
      return shortDir;
    }
    this.log.info(`${TAG} Strategy 1 (8.3 short path) unavailable, trying junction…`);
    const junctionDir = this.tryJunction(this._installDir);
    if (junctionDir) {
      this.log.info(`${TAG} Strategy 2 (NTFS junction) succeeded: "${junctionDir}"`);
      return junctionDir;
    }
    this.log.warn(
      `${TAG} All strategies exhausted. Subprocess spawning from "${this._installDir}" may fail. Reinstall to a pure-ASCII path (e.g. C:\\MiniMaxHub) to fix this.`
    );
    return null;
  }
  getSafeWorkRoot() {
    if (this._safeWorkRoot !== void 0) return this._safeWorkRoot;
    for (const candidate of SAFE_WORK_ROOT_CANDIDATES) {
      if (!candidate || hasNonAscii(candidate)) continue;
      try {
        fs.mkdirSync(candidate, { recursive: true });
        fs.accessSync(candidate, fs.constants.W_OK);
        this._safeWorkRoot = candidate;
        this.log.info(`${TAG} Using writable ASCII work root: "${candidate}"`);
        return candidate;
      } catch {
      }
    }
    this.log.warn(
      `${TAG} No writable ASCII work root found (tried: ${SAFE_WORK_ROOT_CANDIDATES.join(", ")}).`
    );
    this._safeWorkRoot = null;
    return this._safeWorkRoot;
  }
  parseShortPathOutput(raw) {
    const shortPath = raw.split(/\r?\n/).filter(Boolean).pop()?.trim() ?? "";
    return shortPath && !hasNonAscii(shortPath) ? shortPath : null;
  }
  tryShortPathInline(dirPath) {
    try {
      const escaped = dirPath.replace(/"/g, '""');
      const raw = execSync(`cmd.exe /d /s /c for %I in ("${escaped}") do @echo %~sI`, {
        encoding: "utf-8",
        timeout: 5e3,
        windowsHide: true
      });
      return this.parseShortPathOutput(raw);
    } catch {
      return null;
    }
  }
  // ---- strategy 1: 8.3 short path ----------------------------------------
  /**
   * Resolve the 8.3 short-name equivalent of `dirPath`.
   *
   * Primary path: inline `cmd /c for %I ... %~sI` (no filesystem writes).
   * Fallback path: helper batch file under a writable ASCII root.
   */
  tryShortPath(dirPath) {
    const inline = this.tryShortPathInline(dirPath);
    if (inline) return inline;
    const workRoot = this.getSafeWorkRoot();
    if (!workRoot) return null;
    try {
      const helperDir = path.join(workRoot, "tmp");
      fs.mkdirSync(helperDir, { recursive: true });
      const batchPath = path.join(helperDir, "shortpath.cmd");
      fs.writeFileSync(batchPath, "@echo %~s1\r\n", "ascii");
      try {
        const raw = execSync(`"${batchPath}" "${dirPath}"`, {
          encoding: "utf-8",
          timeout: 5e3,
          windowsHide: true
        });
        return this.parseShortPathOutput(raw);
      } finally {
        try {
          fs.unlinkSync(batchPath);
        } catch {
        }
      }
    } catch (err) {
      this.log.warn(
        `${TAG} 8.3 resolution failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return null;
    }
  }
  // ---- strategy 2: NTFS junction ------------------------------------------
  /**
   * Create an NTFS directory junction from a deterministic ASCII path to the
   * actual install directory.
   *
   * - `mklink /J` (directory junction) does NOT require admin privileges.
   * - `fs.symlinkSync(target, path, 'junction')` is the Node.js equivalent.
   * - The junction is a lightweight reparse point — no data duplication.
   * - Persists across reboots; cleaned up by NSIS uninstaller.
   */
  tryJunction(targetDir) {
    const workRoot = this.getSafeWorkRoot();
    if (!workRoot) return null;
    try {
      const hash = windowsJunctionHash(targetDir);
      const junctionBaseDir = path.join(workRoot, "junctions");
      const junctionPath = path.join(junctionBaseDir, hash);
      let needsCreate = true;
      try {
        const existing = fs.readlinkSync(junctionPath);
        if (normalizeWindowsJunctionTarget(existing) === normalizeWindowsJunctionTarget(targetDir)) {
          try {
            fs.accessSync(junctionPath);
            this.log.info(`${TAG} Reusing existing junction: "${junctionPath}"`);
            return junctionPath;
          } catch {
            this.log.warn(`${TAG} Existing junction not accessible, recreating…`);
          }
        }
        try {
          fs.rmSync(junctionPath);
        } catch (rmErr) {
          this.log.warn(
            `${TAG} Failed to remove stale junction: ${rmErr instanceof Error ? rmErr.message : String(rmErr)}`
          );
        }
        needsCreate = true;
      } catch {
      }
      if (needsCreate) {
        fs.mkdirSync(junctionBaseDir, { recursive: true });
        fs.symlinkSync(targetDir, junctionPath, "junction");
      }
      return junctionPath;
    } catch (err) {
      this.log.warn(
        `${TAG} Junction creation failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return null;
    }
  }
}
let _resolver;
function resolveSpawnPath(targetPath, logService) {
  if (process.platform !== "win32") return targetPath;
  if (!_resolver) {
    _resolver = new SafeSpawnPathResolver(logService);
  }
  return _resolver.resolve(targetPath);
}
const CLOUD_GATEWAY_URLS = {
  domestic: {
    dev: "https://hub-pre.xaminim.com",
    test: "https://hub-pre.xaminim.com",
    staging: "https://design.minimax.cn",
    prod: "https://design.minimax.cn"
  },
  overseas: {
    dev: "https://hilo-test.xaminim.com",
    test: "https://hilo-test.xaminim.com",
    staging: "https://design.minimax.io",
    prod: "https://design.minimax.io"
  }
};
const DEFAULT_CLOUD_GATEWAY_URL = CLOUD_GATEWAY_URLS.domestic.dev;
function getCloudGatewayUrl(region, channel) {
  return CLOUD_GATEWAY_URLS[region]?.[channel] ?? DEFAULT_CLOUD_GATEWAY_URL;
}
const LEGACY_PLATFORM_PROVIDER_URLS = [
  // The config endpoint is routed through hub-pre, but provider baseURL values
  // can still be served as the legacy hilo-pre alias.
  "https://hilo-pre.xaminim.com",
  // Pre-rebrand hub.* domains: server-side provider baseURL values may still
  // point at hub.* during the design.* domain migration window.
  "https://hub.minimaxi.com",
  "https://hub.minimax.io",
  // Pre-rebrand domestic design.minimaxi.com: the server may still serve provider
  // baseURL values on the old domain while clients roll over to design.minimax.cn.
  // Dropping this would stop token injection and fail LLM calls with 401.
  "https://design.minimaxi.com"
];
const CLOUD_GATEWAY_URL_PREFIXES = [
  ...new Set(
    [
      ...Object.values(CLOUD_GATEWAY_URLS).flatMap((channels) => Object.values(channels)),
      ...LEGACY_PLATFORM_PROVIDER_URLS
    ].flatMap((url) => [url, url.replace("https://", "http://")])
  )
];
const AD_ATTRIBUTION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1e3;
const AD_ATTRIBUTION_MAX_URL_LENGTH = 2048;
const MAX_INPUT_URL_LENGTH = 8192;
const MAX_PARAM_VALUE_LENGTH = 1024;
const CLOCK_SKEW_MS = 5 * 60 * 1e3;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const ADS_PREFIX = "hl_ads_";
const LANDING_ORIGINS = {
  domestic: [
    "https://design.minimaxi.com",
    "https://design.minimax.cn",
    "https://hub.minimaxi.com",
    "https://hub-pre.xaminim.com"
  ],
  overseas: ["https://design.minimax.io", "https://hub.minimax.io", "https://hub-test.xaminim.com"]
};
const AD_PARAM_KEYS = /* @__PURE__ */ new Set([
  "monitorId",
  "trackChannelId",
  "gclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "fbclid",
  "ttclid",
  "twclid",
  "yclid",
  "campaign",
  "adgroup",
  "creative",
  "campaign_id",
  "adgroup_id",
  "creative_id",
  "ad_id",
  "keyword",
  "matchtype",
  "placement"
]);
const API_ORIGINS = /* @__PURE__ */ new Set([
  "https://design.minimax.cn",
  ...CLOUD_GATEWAY_URL_PREFIXES.filter((url) => url.startsWith("https://")),
  "https://hailuo-pre.xaminim.com",
  "https://hailuoai-video-test.xaminim.com",
  "https://hailuoai.com",
  "https://hailuoai.video",
  "https://openplatform-test.xaminim.com",
  "https://openplatform-test-i18n.xaminim.com",
  "https://www.minimaxi.com",
  "https://platform.minimax.io"
]);
function isAdParam(key) {
  return AD_PARAM_KEYS.has(key) || /^utm_[a-z0-9_]{1,48}$/.test(key);
}
function normalizeAdAttributionUrl(value, region) {
  if (typeof value !== "string" || value.length > MAX_INPUT_URL_LENGTH || CONTROL_CHARACTERS.test(value))
    return null;
  try {
    const source = new URL(value);
    const origins = region ? LANDING_ORIGINS[region] : Object.values(LANDING_ORIGINS).flat();
    if (source.username || source.password || !origins.includes(source.origin)) return null;
    const params = new URLSearchParams();
    for (const prefixed of [false, true]) {
      for (const key of new Set(source.searchParams.keys())) {
        if (key.startsWith(ADS_PREFIX) !== prefixed) continue;
        const canonicalKey = prefixed ? key.slice(ADS_PREFIX.length) : key;
        if (!isAdParam(canonicalKey)) continue;
        const values = source.searchParams.getAll(key).filter(Boolean);
        if (new Set(values).size > 1) return null;
        const param = values[0];
        if (!param) continue;
        if (param.length > MAX_PARAM_VALUE_LENGTH || CONTROL_CHARACTERS.test(param)) return null;
        if (!params.has(canonicalKey)) params.set(canonicalKey, param);
      }
    }
    if (params.size === 0) return null;
    if (!params.has("utm_media_source") && params.has("utm_source")) {
      params.set("utm_media_source", params.get("utm_source") ?? "");
    }
    const sanitized = new URL(source.href);
    sanitized.hash = "";
    sanitized.search = params.toString();
    const result = sanitized.toString();
    return result.length <= AD_ATTRIBUTION_MAX_URL_LENGTH ? result : null;
  } catch {
    return null;
  }
}
function normalizeAdAttribution(value, now = Date.now(), region) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value;
  const { capturedAt, expiresAt } = record;
  if (record.v !== 1 || typeof capturedAt !== "number" || typeof expiresAt !== "number" || !Number.isSafeInteger(capturedAt) || !Number.isSafeInteger(expiresAt) || capturedAt <= 0 || capturedAt > now + CLOCK_SKEW_MS || expiresAt <= now || expiresAt <= capturedAt || expiresAt - capturedAt > AD_ATTRIBUTION_MAX_AGE_MS)
    return null;
  const url = normalizeAdAttributionUrl(record.url, region);
  return url ? { v: 1, url, capturedAt, expiresAt } : null;
}
function isAdAttributionApiUrl(value) {
  try {
    const url = new URL(value);
    return !url.username && !url.password && API_ORIGINS.has(url.origin) && /^(?:\/api\/|\/v[12]\/|\/oauth2\/)/.test(url.pathname);
  } catch {
    return false;
  }
}
const BENCHMARK_PROVEN_COMPLETION_REASONS = [
  "supervisor_completed",
  "external_control"
];
const BENCHMARK_PROVEN_COMPLETION_REASON_SET = new Set(
  BENCHMARK_PROVEN_COMPLETION_REASONS
);
function isBenchmarkCompletionProven(status, finalizeReason) {
  return status === "completed" && typeof finalizeReason === "string" && BENCHMARK_PROVEN_COMPLETION_REASON_SET.has(finalizeReason);
}
const CanvasMode = {
  Freeform: "freeform",
  Workflow: "workflow"
};
new Set(Object.values(CanvasMode));
const ROW_HEIGHT_ORDER = ["low", "medium", "tall", "extraTall"];
new Set(ROW_HEIGHT_ORDER);
const PRESET_COLOR_TAG_IDS = {
  red: "color:red",
  orange: "color:orange",
  yellow: "color:yellow",
  green: "color:green",
  blue: "color:blue",
  purple: "color:purple",
  deepPurple: "color:deep-purple"
};
new Set(Object.values(PRESET_COLOR_TAG_IDS));
const DOMESTIC_MODEL_DISPLAY_ALIASES = [
  // Nano Banana 2 Flash → General Image 2（空格 / 下划线 / 中划线变体）
  ["nano_banana_2_flash", "General Image 2"],
  ["NanoBanana 2 Flash", "General Image 2"],
  ["NanoBanana_2_Flash", "General Image 2"],
  ["NanoBanana-2-Flash", "General Image 2"],
  ["Nano Banana 2 Flash", "General Image 2"],
  ["Nano-Banana-2-Flash", "General Image 2"],
  ["Banana 2 Flash", "General Image 2"],
  ["Banana_2_Flash", "General Image 2"],
  ["Banana-2-Flash", "General Image 2"],
  // Nano Banana Flash → General Image 2
  ["NanoBanana Flash", "General Image 2"],
  ["NanoBanana_Flash", "General Image 2"],
  ["NanoBanana-Flash", "General Image 2"],
  ["Nano Banana Flash", "General Image 2"],
  ["Nano_Banana_Flash", "General Image 2"],
  ["Nano-Banana-Flash", "General Image 2"],
  ["Banana Flash", "General Image 2"],
  ["Banana_Flash", "General Image 2"],
  ["Banana-Flash", "General Image 2"],
  // Nano Banana Pro → General Image Pro
  ["NanoBanana Pro", "General Image Pro"],
  ["NanoBanana_Pro", "General Image Pro"],
  ["NanoBanana-Pro", "General Image Pro"],
  ["Nano Banana Pro", "General Image Pro"],
  ["Nano_Banana_Pro", "General Image Pro"],
  ["Nano-Banana-Pro", "General Image Pro"],
  ["Banana Pro", "General Image Pro"],
  ["Banana_Pro", "General Image Pro"],
  ["Banana-Pro", "General Image Pro"],
  // 特例：nano_banana_2（下划线全名）→ General Image Pro。仅此一条，不派生
  // 空格/中划线变体，避免与下方 "Nano Banana 2 → General Image 2" 的下划线
  // 全名 Nano_Banana_2 冲突。
  ["nano_banana_2", "General Image Pro"],
  // Nano Banana 2 → General Image 2（不含下划线全名 Nano_Banana_2，留给上面的特例）
  ["NanoBanana 2", "General Image 2"],
  ["NanoBanana_2", "General Image 2"],
  ["NanoBanana-2", "General Image 2"],
  ["Nano Banana 2", "General Image 2"],
  ["Nano-Banana-2", "General Image 2"],
  ["Banana 2", "General Image 2"],
  ["Banana_2", "General Image 2"],
  ["Banana-2", "General Image 2"],
  // 旧国内展示名也统一收敛到新名称，覆盖历史消息与缓存数据。
  ["香蕉Pro", "General Image Pro"],
  ["香蕉2", "General Image 2"],
  // Banana 系列 → General Image 系列
  ["Banana 系列", "General Image 系列"],
  ["Banana系列", "General Image 系列"],
  ["Banana_系列", "General Image 系列"],
  ["Banana-系列", "General Image 系列"],
  ["香蕉系列", "General Image 系列"],
  // GPT Image 2.5 Flare / Sunburst → Design Image 2.5 Flare / Sunburst。
  // 两区只差品牌前缀，脱敏只把 GPT 换成 Design。
  // 这四个内部名都以 'gpt-image-2' / 'g-image-2' 为前缀子串，依靠
  // SORTED_DOMESTIC_MODEL_DISPLAY_ALIASES 的长度降序 + 单次 alternation
  // 保证长规则先命中，不会被下方的 'gpt-image-2' 截断成 "Design Image 2.5-flare"。
  ["gpt-image-2.5-sunburst", "Design Image 2.5 Sunburst"],
  ["GPT Image 2.5 Sunburst", "Design Image 2.5 Sunburst"],
  ["GPT_Image_2.5_Sunburst", "Design Image 2.5 Sunburst"],
  ["g-image-2.5-sunburst", "Design Image 2.5 Sunburst"],
  ["gpt-image-2.5-flare", "Design Image 2.5 Flare"],
  ["GPT Image 2.5 Flare", "Design Image 2.5 Flare"],
  ["GPT_Image_2.5_Flare", "Design Image 2.5 Flare"],
  ["g-image-2.5-flare", "Design Image 2.5 Flare"],
  // GPT Image 2 / 旧国内名 → Design Image 2。只改 2 这一版，其他版本继续沿用
  // 既有 GPT Image → G Image 的国内脱敏规则。
  ["gpt-image-2", "Design Image 2"],
  ["GPT Image 2", "Design Image 2"],
  ["GPT_Image_2", "Design Image 2"],
  ["g-image-2", "Design Image 2"],
  ["G Image 2", "Design Image 2"],
  ["G_Image_2", "Design Image 2"],
  // GPT Image → G Image（其他版本）
  ["GPT Image", "G Image"],
  ["GPT_Image", "G Image"],
  ["gpt-image", "g-image"],
  // Veo 3.1 → Beta（国内展示名）。统一海外命名后 agent 输出 veo-3.1-* / Veo3，
  // 国内渲染时 redact 回 beta。长度降序排序保证技术全名（最长）先匹配；裸 model_id
  // 形如 `veo-3.1-generate-001` 内部是 `veo-3`（带连字符），不含连续子串 `veo3`，
  // 因此短规则 `Veo3 → Beta` 不会误伤全名，双重安全。
  ["veo-3.1-fast-generate-001", "beta_fast"],
  ["veo-3.1-generate-001", "beta_pro"],
  ["Veo3.1 Fast", "Beta Fast"],
  ["Veo 3.1 Fast", "Beta Fast"],
  ["Veo3 Series", "Beta系列"],
  ["Veo3.1", "Beta Pro"],
  ["Veo 3.1", "Beta Pro"],
  ["Veo3", "Beta"],
  // seedream alias
  ["doubao-seedream-5-0-pro-260628", "Seedream 5.0 Pro"],
  ["doubao-seedream-5-0-260128", "Seedream 5.0 Lite"],
  ["doubao-seedream-4-5-251128", "Seedream 4.5"]
];
const SORTED_DOMESTIC_MODEL_DISPLAY_ALIASES = DOMESTIC_MODEL_DISPLAY_ALIASES.slice().sort(
  ([a], [b]) => b.length - a.length
);
const DOMESTIC_MODEL_DISPLAY_ALIAS_BY_LOWERCASE = new Map(
  SORTED_DOMESTIC_MODEL_DISPLAY_ALIASES.map(([internal, display]) => [
    internal.toLowerCase(),
    display
  ])
);
const DOMESTIC_MODEL_DISPLAY_ALIAS_PATTERN = new RegExp(
  SORTED_DOMESTIC_MODEL_DISPLAY_ALIASES.map(([internal]) => escapeRegExp(internal)).join("|"),
  "gi"
);
const DOMESTIC_MODEL_CONTEXT_ALIAS_PATTERNS = [
  [/\bbanana(?=\s*(?:模型|model\b))/gi, "General Image"],
  [/(\b(?:(?:available|selected)_)?vendors?\s*=\s*(?:\[[^\]]*)?)\bbanana\b/gi, "$1General Image"]
];
function shouldRedactModelAliases(region) {
  return region === "domestic" || region === void 0 || region === null || region === "";
}
function redactModelAliasesForDisplay(text, region) {
  if (!text || !shouldRedactModelAliases(region)) return text;
  let redacted = text.replace(
    DOMESTIC_MODEL_DISPLAY_ALIAS_PATTERN,
    (matched) => DOMESTIC_MODEL_DISPLAY_ALIAS_BY_LOWERCASE.get(matched.toLowerCase()) ?? matched
  );
  for (const [pattern, display] of DOMESTIC_MODEL_CONTEXT_ALIAS_PATTERNS) {
    redacted = redacted.replace(pattern, display);
  }
  return redacted;
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const HILO_WORKSPACE_IDENTITY_HEADER = "x-hilo-workspace";
const HILO_WORKSPACE_IDENTITY_QUERY = "hilo_workspace";
const HILO_WORKSPACE_IDENTITY_ENV = "HILO_WORKSPACE_CLAIM";
const HILO_WORKSPACE_INSTANCE_HEADER = "x-hilo-workspace-instance";
const HILO_WORKSPACE_INSTANCE_QUERY = "hilo_workspace_instance";
const HILO_WORKSPACE_INSTANCE_ENV = "HILO_WORKSPACE_INSTANCE_ID";
const HILO_WORKSPACE_GENERATION_HEADER = "x-hilo-workspace-generation";
const HILO_WORKSPACE_GENERATION_QUERY = "hilo_workspace_generation";
const HILO_WORKSPACE_GENERATION_ENV = "HILO_WORKSPACE_GENERATION";
const WORKSPACE_IDENTITY_MISMATCH_CODE = "WORKSPACE_IDENTITY_MISMATCH";
const WORKSPACE_IDENTITY_REQUIRED_CODE = "WORKSPACE_IDENTITY_REQUIRED";
function workspaceGatewayIdentityHeaders(binding) {
  return {
    [HILO_WORKSPACE_IDENTITY_HEADER]: binding.claim,
    [HILO_WORKSPACE_INSTANCE_HEADER]: binding.instanceId,
    [HILO_WORKSPACE_GENERATION_HEADER]: String(binding.generation)
  };
}
function workspaceGatewayIdentityEnv(binding) {
  return {
    [HILO_WORKSPACE_IDENTITY_ENV]: binding.claim,
    [HILO_WORKSPACE_INSTANCE_ENV]: binding.instanceId,
    [HILO_WORKSPACE_GENERATION_ENV]: String(binding.generation)
  };
}
function isWorkspaceIdentityErrorCode(value) {
  return value === WORKSPACE_IDENTITY_MISMATCH_CODE || value === WORKSPACE_IDENTITY_REQUIRED_CODE;
}
function encodePath(p) {
  return p.split("/").map(encodeURIComponent).join("/");
}
const DEFAULT_VIDEO_PLAYBACK_MAX_HEIGHT = 1080;
const VIDEO_PLAYBACK_IDENTITY_QUERY_KEYS = [
  HILO_WORKSPACE_IDENTITY_QUERY,
  HILO_WORKSPACE_INSTANCE_QUERY,
  HILO_WORKSPACE_GENERATION_QUERY
];
function videoPlaybackPath(source, maxHeight = DEFAULT_VIDEO_PLAYBACK_MAX_HEIGHT) {
  const params = new URLSearchParams({
    source,
    maxHeight: String(maxHeight)
  });
  try {
    const parsedSource = new URL(source, "http://hilo.local");
    for (const key of VIDEO_PLAYBACK_IDENTITY_QUERY_KEYS) {
      const value = parsedSource.searchParams.get(key);
      if (value) params.set(key, value);
    }
  } catch {
  }
  return `/api/asset/video-playback?${params.toString()}`;
}
const HILO_HUB_BIZ_LINE = 4;
const TEAM_GROUP_LOAD_REASONS = [
  /** Upstream certificate chain is not trusted — terminal, retrying cannot fix it. */
  "tls_trust",
  /** Hostname resolution failed — terminal (usually DNS/proxy configuration). */
  "dns",
  /** Upstream refused the connection — retryable. */
  "conn_refused",
  /** Connection was reset mid-flight — retryable. */
  "conn_reset",
  /** TCP/TLS handshake timed out — retryable. */
  "connect_timeout",
  /** Request exceeded the gateway's time budget — retryable. */
  "timeout",
  /** Upstream answered 5xx — retryable. */
  "upstream_5xx",
  /** Upstream rejected the request (4xx) — terminal. */
  "upstream_4xx",
  /** Transport failed without a finer signature — retryable. */
  "network",
  /** Local gateway configuration is incomplete (e.g. empty baseUrl) — terminal. */
  "config_missing",
  "unknown"
];
const TEAM_GROUP_LOAD_REASON_SET = new Set(TEAM_GROUP_LOAD_REASONS);
function isTeamGroupLoadReason(value) {
  return typeof value === "string" && TEAM_GROUP_LOAD_REASON_SET.has(value);
}
const API_PATHS = {
  // Workspace
  workspace: "/api/workspace",
  // ComfyUI workflow catalogue and commands.
  comfyUiWorkflows: "/api/comfyui/workflows",
  comfyUiFeaturedWorkflows: (locale) => `/api/comfyui/featured-workflows?locale=${locale}`,
  comfyUiAgentWorkflows: "/api/comfyui/workflows?agent_only=true",
  comfyUiWorkflowImport: "/api/comfyui/workflows/import",
  comfyUiWorkflowDraftParameters: "/api/comfyui/workflows/draft-parameters",
  comfyUiWorkflowPreflight: "/api/comfyui/workflows/preflight",
  comfyUiInputImport: "/api/comfyui/inputs/import",
  comfyUiWorkflowInstall: (workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/install`,
  comfyUiWorkflow: (workflowId, includeGraph = false) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}${includeGraph ? "?include_graph=true" : ""}`,
  comfyUiNodeWorkflow: (sourceNodeId, includeGraph = false) => `/api/comfyui/node-workflows/${encodeURIComponent(sourceNodeId)}${includeGraph ? "?include_graph=true" : ""}`,
  comfyUiWorkflowDelete: (workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}`,
  comfyUiWorkflowClearDeletedBindings: (workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/clear-deleted-bindings`,
  comfyUiWorkflowDependencies: (workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/dependencies`,
  comfyUiWorkflowOpen: (workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/open`,
  comfyUiWorkflowRun: (workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/run`,
  comfyUiWorkflowExecutable: (workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/executable`,
  comfyUiWorkflowMetadata: (workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/metadata`,
  comfyUiWorkflowAgentAccess: (workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/agent-access`,
  comfyUiRuns: "/api/comfyui/runs",
  // Internal immutable request/billing Group recovery for MCP billable exits.
  internalRequestGroup: (runtimeSessionId) => `/api/internal/sessions/${encodeURIComponent(runtimeSessionId)}/request-group`,
  internalRequestGroupDiagnostic: "/api/internal/sessions/request-group-diagnostic",
  /** Gateway-level billing scope fallback when plugin context is absent. */
  internalBillingCurrentScope: "/api/internal/sessions/billing-current-scope",
  // Files
  files: "/api/files",
  deleteFiles: "/api/files/delete",
  mkdir: "/api/files/mkdir",
  rename: "/api/files/rename",
  forkRename: "/api/files/fork-rename",
  move: "/api/files/move",
  copy: "/api/files/copy",
  duplicateFiles: "/api/files/duplicate",
  writeContent: "/api/files/content",
  createTextAsset: "/api/files/text-asset",
  readContent: (path2) => `/api/files/content?path=${encodeURIComponent(path2)}`,
  filesUploadCdn: "/api/files/upload-cdn",
  upload: "/api/upload",
  uploadCommit: "/api/upload/commit",
  uploadCommitAbort: "/api/upload/commit/abort",
  uploadCommitFinalize: "/api/upload/commit/finalize",
  uploadStagingDelete: "/api/upload/staging/delete",
  importExternal: "/api/files/import-external",
  /**
   * Anchor project-asset files (项目资产 "添加到 agent") into the
   * watcher-ignored `.hilo/project-assets/` directory and return their
   * workspace-relative paths without enrolling them in the vault.
   * Body: { items: Array<{ path, assetId?, projectFolderName? }> } —
   * legacy { paths: string[] } still accepted (no ledger identity).
   * Response: { ok: true, anchored: Array<{ path, filename }>, errors?: [...] }
   */
  anchorProjectAsset: "/api/files/anchor-project-asset",
  /**
   * Write-side propagation for project-asset mutations (Electron main →
   * this workspace's gateway). Re-links anchors after content replacement
   * (new inode) and unlinks them after deletion, driven by the
   * `project_asset_anchors` ledger in the workspace vault sqlite.
   * Body: ProjectAssetPropagateRequest; response: ProjectAssetPropagateResult.
   */
  projectAssetPropagate: "/api/files/project-asset-propagate",
  /**
   * Pure-stat probe used by the asset-panel right-click menu's
   * "Import" / "Paste" / "New Folder" entries to surface a conflict-resolution
   * modal before kicking off the actual mkdir / import.
   * Body: { items: Array<{ name, sourcePath?, kind? }>, targetDir? }
   * Response: { ok: true, conflicts: Array<{ name, sourcePath?, existingKind }> }
   */
  checkConflicts: "/api/files/check-conflicts",
  /**
   * Recursive directory listing for the open workspace. Returns every
   * directory (including empty ones), workspace-relative POSIX paths.
   * Used by the asset panel tree to surface empty folders that the
   * file-only vault can't enumerate. WS push: `dirs_changed`.
   * Response: { ok: true, dirs: string[] }
   */
  listDirs: "/api/files/dirs",
  trackFile: "/api/files/track",
  thumbnail: (path2) => `/api/thumbnail/${encodePath(path2)}`,
  serveFile: (path2) => `/files/${encodePath(path2)}`,
  adoptFiles: "/api/files/adopt",
  serveFileById: (id) => `/files/id/${encodeURIComponent(id)}`,
  scanMedia: (dir, limit = 3) => `/api/files/scan-media?dir=${encodeURIComponent(dir)}&limit=${limit}`,
  workspaceSummary: (dir) => `/api/files/workspace-summary?dir=${encodeURIComponent(dir)}`,
  serveLocal: (absolutePath) => `/api/local-file?path=${encodeURIComponent(absolutePath)}`,
  filesMentionSearch: "/api/files/mention-search",
  projectAssetMentionSearch: "/api/files/project-asset-mention-search",
  // Text document versions (named snapshots of a text asset).
  // Content never round-trips through the renderer on save: the body only
  // carries { assetId, title, note } and the gateway snapshots off disk.
  textVersions: "/api/files/versions",
  textVersionsList: (assetId) => `/api/files/versions?assetId=${encodeURIComponent(assetId)}`,
  textVersion: (id) => `/api/files/versions/${encodeURIComponent(id)}`,
  textVersionContent: (id, offset = 0, limit) => {
    const query = new URLSearchParams({ offset: String(offset) });
    if (limit !== void 0) query.set("limit", String(limit));
    return `/api/files/versions/${encodeURIComponent(id)}/content?${query.toString()}`;
  },
  /**
   * Diff between two snapshots of one document. `to` may be omitted to diff
   * a version against the CURRENT on-disk content (the editor's default
   * "what changed since this version" view). Server-side only: neither side
   * of a multi-MB document is ever shipped to the renderer.
   */
  textVersionDiff: (params) => {
    const query = new URLSearchParams({ from: params.from });
    if (params.to) query.set("to", params.to);
    if (params.offset !== void 0) query.set("offset", String(params.offset));
    if (params.limit !== void 0) query.set("limit", String(params.limit));
    return `/api/files/versions/diff?${query.toString()}`;
  },
  textVersionRestore: (id) => `/api/files/versions/${encodeURIComponent(id)}/restore`,
  textVersionMaterialize: (id) => `/api/files/versions/${encodeURIComponent(id)}/materialize`,
  textVersionSummarize: "/api/files/versions/summarize",
  // Media preview
  heicPreview: "/api/media/heic-preview",
  webMedia: "/api/web-media/yt-dlp",
  // Built-in workspace browser automation (proxied to the Electron main
  // process via the MainBridgeServer loopback bridge).
  browserAutomation: "/api/browser/automation",
  // Assets
  assets: (folder) => `/api/assets/${encodeURIComponent(folder)}`,
  allAssets: "/api/assets",
  /**
   * `GET /api/assets` opting into the raw `metadata` blob.
   *
   * Only for callers that read un-projected keys (today: mcp-tools reading
   * `read_media_cache`). Everything else must use `allAssets` -- the blob
   * duplicates every flat field and is unbounded in size.
   */
  allAssetsWithMetadata: "/api/assets?include=metadata",
  assetChanges: "/api/assets/changes",
  // W4-T1: missing-asset reconciliation actions (ADR-004 Phase 4)
  mergeMissingCandidate: (id) => `/api/assets/${encodeURIComponent(id)}/merge-candidate`,
  removeMissing: (id) => `/api/assets/${encodeURIComponent(id)}/remove-missing`,
  locateMissing: (id) => `/api/assets/${encodeURIComponent(id)}/locate`,
  // Canvas asset tags (PRD: canvas 内标签体系)
  assetTags: (id) => `/api/assets/${encodeURIComponent(id)}/tags`,
  assetTagsBatch: "/api/assets/tags/batch",
  assetTagMutationsBatch: "/api/assets/tags/mutations/batch",
  tagRegistry: "/api/canvas/tag-registry",
  canvasTags: "/api/canvas/tags",
  canvasTag: (id) => `/api/canvas/tags/${encodeURIComponent(id)}`,
  canvasTagImpact: (id) => `/api/canvas/tags/${encodeURIComponent(id)}/impact`,
  canvasTagOrder: "/api/canvas/tags/order",
  // Dependencies (ADR-005 Layer 3 / W5-T1)
  // Lineage queries follow role='source' edges only; inputs returns
  // every role for the immediate fan-in (style / mask / pose / ...).
  dependenciesUpstream: (assetId) => `/api/dependencies/${encodeURIComponent(assetId)}/upstream`,
  dependenciesDownstream: (assetId) => `/api/dependencies/${encodeURIComponent(assetId)}/downstream`,
  dependenciesInputs: (assetId) => `/api/dependencies/${encodeURIComponent(assetId)}/inputs`,
  addDependency: "/api/dependencies",
  deleteDependency: (id) => `/api/dependencies/${id}`,
  // Asset hover-card preview (text excerpt + read-only metadata enrichment)
  assetTextPreview: (path2, chars = 200) => `/api/asset/text-preview?path=${encodeURIComponent(path2)}&chars=${chars}`,
  documentRead: (path2, offset = 1, limit = 2e3) => `/api/internal/document/read?path=${encodeURIComponent(path2)}&offset=${offset}&limit=${limit}`,
  assetMetadata: (id) => `/api/asset/${encodeURIComponent(id)}/metadata`,
  /**
   * Hover-only height-capped MP4 stream. Compatible H.264 MP4 sources pass
   * through; other containers/codecs are remuxed or transcoded for Chromium.
   */
  assetVideoStream: (path2, maxHeight = 480) => `/api/asset/video-stream?path=${encodeURIComponent(path2)}&maxHeight=${maxHeight}`,
  /** Browser-compatible H.264/AAC MP4 for canvas playback. */
  assetVideoPlayback: videoPlaybackPath,
  // Pre-computed audio peaks (issue #5 follow-up §2): wavesurfer.js skips
  // its own decode when peaks + duration are supplied via constructor opts.
  // Buckets are clamped server-side to [50, 4096]; default 200 matches the
  // typical hover-card waveform width (~400 px @ 2-bar minimum).
  assetPeaks: (path2, buckets = 200) => `/api/asset/peaks?path=${encodeURIComponent(path2)}&buckets=${buckets}`,
  // Asset Center
  assetCenterWorkspaceRefs: (workspace) => `/api/asset-center/workspace-refs?workspace=${encodeURIComponent(workspace)}`,
  assetCenterAttachmentBlob: (attachmentId, width) => {
    const base = `/api/asset-center/attachments/${encodeURIComponent(attachmentId)}/blob`;
    return width === void 0 ? base : `${base}?w=${width}`;
  },
  assetCenterAttachmentPlayback: (attachmentId, maxHeight = 1080) => `/api/asset-center/attachments/${encodeURIComponent(attachmentId)}/playback?maxHeight=${maxHeight}`,
  assetCenterBlobPreview: (blobPath, width = 512) => `/api/asset-center/blobs/preview?${new URLSearchParams({ blobPath, w: String(width) }).toString()}`,
  assetCenterBlobPlayback: (blobPath, maxHeight = 1080) => `/api/asset-center/blobs/playback?${new URLSearchParams({
    blobPath,
    maxHeight: String(maxHeight)
  }).toString()}`,
  // Canvas
  canvas: "/api/canvas",
  canvasRecovery: "/api/canvas/recovery-result",
  canvasSearch: "/api/canvas/search",
  addCanvasNode: "/api/canvas/add-node",
  canvasMediaNode: "/api/canvas/media-node",
  // Generation
  models: "/api/models",
  modelsConfig: "/api/v1/models/config",
  imageModels: "/api/models/image",
  videoModels: "/api/models/video",
  speechModels: "/api/models/speech",
  musicModels: "/api/models/music",
  agentModels: "/api/runtime/models",
  openCodeConfig: "/api/v1/config",
  speechVoices: "/api/speech/voices",
  speechVoiceDesign: "/api/speech/voice_design",
  generateImage: "/api/generate/image",
  generateVideo: "/api/generate/video",
  generateSpeech: "/api/generate/speech",
  generateMusic: "/api/generate/music",
  generateText: "/api/generate/text",
  generationCancel: "/api/generation/cancel",
  generationQueueSummary: "/api/generation-queue/summary",
  generationQueueCancel: "/api/generation-queue/cancel",
  canvasGenerationReconcile: "/api/canvas/generation/reconcile",
  generateImageSubmit: "/api/generate/image/submit",
  generateVideoSubmit: "/api/generate/video/submit",
  generateSpeechSubmit: "/api/generate/speech/submit",
  generateMusicSubmit: "/api/generate/music/submit",
  generateTaskQueryPattern: "/api/generate/tasks/:task_id/query",
  generateTaskQuery: (taskId) => `/api/generate/tasks/${encodeURIComponent(taskId)}/query`,
  // Editing
  concatenateVideos: "/api/edit/concatenate-videos",
  embedAudio: "/api/edit/embed-audio",
  extractAudio: "/api/edit/extract-audio",
  voiceIsolation: "/api/speech/voice_isolation",
  lipSync: "/api/edit/lip-sync",
  asr: "/api/edit/asr",
  analyzeMedia: "/api/edit/analyze-media",
  superResolution: "/api/edit/super-resolution",
  eraseBanana: "/api/edit/erase-banana",
  redrawBanana: "/api/edit/redraw-banana",
  outpaintBanana: "/api/edit/outpaint-banana",
  moveObjectBanana: "/api/edit/move-object-banana",
  removeBackground: "/api/edit/remove-background",
  layerDecompose: "/api/edit/layer-decompose",
  enhanceImageMediaKit: "/api/edit/enhance-image",
  enhanceVideoMediaKit: "/api/edit/enhance-video-mediakit",
  hailuo03VideoSuperResolution: "/api/edit/hailuo03-video-super-resolution",
  eraseSubtitleMediaKit: "/api/edit/erase-subtitle-mediakit",
  asrMediaKit: "/api/edit/asr-mediakit",
  asrWhisper: "/api/edit/asr-whisper",
  // Skills
  skills: "/api/skills",
  runtimeSkills: "/api/skills/runtime",
  marketSkills: "/api/skills/market",
  marketSearch: "/api/skills/market/search",
  marketInstall: "/api/skills/market/install",
  marketUninstall: "/api/skills/market/uninstall",
  skillImport: "/api/skills/import",
  skillSubmissionStage: "/api/skills/submission/stage",
  skillSubmissionSave: "/api/skills/submission/save",
  skillSubmissionCoverUpload: "/api/skills/creator-plan/cover-upload",
  skillSubmissionAssetUpload: "/api/skills/creator-plan/asset-upload",
  skillSubmissionAssetPresign: "/api/skills/creator-plan/asset-presign",
  skillSubmissionSubmit: "/api/skills/creator-plan/submit",
  skillSubmissionList: "/api/skills/creator-plan/submissions",
  skillSubmissionOffline: "/api/skills/creator-plan/offline",
  marketWhitelist: "/api/skills/market/whitelist",
  marketSyncStatus: "/api/skills/market/sync-status",
  marketCheckOperator: "/api/skills/market/check-operator",
  marketOperations: "/api/skills/market/operation",
  marketDeleteOperation: (skillName) => `/api/skills/market/operation/${encodeURIComponent(skillName)}`,
  marketBatchSaveOperations: "/api/skills/market/operations/batch",
  marketOperatorSubmissions: "/api/skills/market/operator/submissions",
  marketOperatorPublished: "/api/skills/market/operator/published",
  marketOperatorSubmission: (submissionId) => `/api/skills/market/operator/submissions/${encodeURIComponent(submissionId)}`,
  marketOperatorSubmissionPackage: (submissionId) => `/api/skills/market/operator/submissions/${encodeURIComponent(submissionId)}/package`,
  marketOperatorSubmissionPackageUpload: (submissionId) => `/api/skills/market/operator/submissions/${encodeURIComponent(submissionId)}/package-upload`,
  marketOperatorBatchApprove: "/api/skills/market/operator/submissions/batch-approve",
  marketOperatorPublish: "/api/skills/market/operator/publish",
  marketOperatorCategories: "/api/skills/market/categories",
  marketTrending: "/api/skills/market/trending",
  skillFiles: (name) => `/api/skills/${encodeURIComponent(name)}/files`,
  skillFileContent: (name, filePath) => `/api/skills/${encodeURIComponent(name)}/file-content?path=${encodeURIComponent(filePath)}`,
  skillUserTrash: "/api/skills/user/trash",
  skillFork: "/api/skills/fork",
  // Plugin management (local plugin listing, not cloud market)
  plugins: "/api/plugins",
  // Feedback
  feedback: "/api/feedback",
  feedbackUploadAttachment: "/api/feedback/upload-attachment",
  feedbackDetail: (ticketId) => `/api/feedback/${encodeURIComponent(ticketId)}`,
  // Export
  exportSession: (id) => `/api/sessions/${id}/export`,
  customMcpApply: "/api/connectors/mcp",
  customMcpAuthenticate: "/api/connectors/mcp/authenticate",
  projectArchiveActivityBegin: "/api/projects/archive/activity/begin",
  projectArchiveActivityHeartbeat: "/api/projects/archive/activity/heartbeat",
  projectArchiveActivityEnd: "/api/projects/archive/activity/end",
  // Billing
  billingPricing: "/api/v1/billing/pricing",
  billingPromotion: "/api/v1/billing/promotion",
  /** Atomic cloud-side price calculation; reminder policy stays local. */
  creditCalculateCost: "/api/v1/credit/calculate-cost",
  /** Atomic authoritative balance query for the authenticated billing scope. */
  creditBalance: "/api/v1/credit/balance",
  /** Existing wallet envelope used by the balance/insufficient-credit UI. */
  creditWallet: "/api/v1/credit/wallet",
  hailuo03VideoTrialStatus: "/api/v1/promotions/hailuo03-video-trial/status",
  hailuo03VideoTrialClaim: "/api/v1/promotions/hailuo03-video-trial/claim",
  // Home
  hubClientConfig: "/api/v1/hub/client_config",
  apolloConfig: (key) => `/api/v1/apollo/config?key=${encodeURIComponent(key)}`,
  /** Legacy path retained for old Desktop releases. */
  homeQuickStartConfig: "/api/v1/home/quick_start_config",
  /** Current Desktop explicitly selects the isolated Apollo v2 key. */
  homeQuickStartConfigV2: "/api/v1/home/quick_start_config?config_version=2",
  // Group 间 MediaCredit 转移（Owner only）。operator_uid 由云网关从登录态解析；
  // 客户端严格发送后端契约的三字段请求；幂等由云端负责。
  creditTransfer: "/api/v1/credit/transfer",
  // Account deletion（账户注销）。
  accountProfile: "/api/v1/account/profile",
  accountHailuoWeb: "/api/v1/account/hailuo-web",
  accountHailuoCancelCheck: "/api/v1/account/cancel/hailuo-check",
  accountHubCancelCheck: "/api/v1/account/cancel/check",
  accountCancelSendCode: "/api/v1/account/cancel/send-code",
  accountDelete: "/api/v1/account/cancel",
  // Team edition (Renderer-safe business data only).
  // Canonical active-context and operation coordination routes are deliberately
  // absent: they are Main-process implementation details and must never become
  // a second Renderer source of truth.
  teamContract: "/api/v1/team/contract",
  teamCapabilities: "/api/v1/team/capabilities",
  groupList: `/backend/group/list?biz_line=${HILO_HUB_BIZ_LINE}`,
  groupCreate: "/backend/group/create",
  /** QueryGroupMembers：按 scope 查成员（InGroup 当前团队全量 / Owned·Manageable 聚合去重候选，无分页）。 */
  groupMembersQuery: "/backend/group/members/query",
  /** BatchAddGroupMembers：按 UID 批量入团（单次上限 100，逐用户结果）。 */
  groupMembersBatchAdd: "/backend/group/members/batch_add",
  teamInvitations: "/api/v1/team/invitations",
  teamInvitation: (invitationId) => `/api/v1/team/invitations/${encodeURIComponent(invitationId)}`,
  teamDetail: (groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}`,
  teamRename: (groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}`,
  teamDelete: (groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}`,
  teamMembers: (groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members`,
  teamInviteMembers: (groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members/invite`,
  teamRemoveMember: (groupId, userId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
  teamChangeMemberRole: (groupId, userId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/role`,
  teamLeave: (groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/leave`,
  teamTransferOwner: (groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/transfer-owner`,
  teamInviteLinks: (groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/invite-links`,
  teamInviteLinkInfo: (token, region) => {
    const params = new URLSearchParams({ token });
    if (region) params.set("region", region);
    return `/api/v1/team/invite-links/info?${params.toString()}`;
  },
  teamInviteLinkAccept: "/api/v1/team/invite-links/accept",
  teamInviteLinkDecline: "/api/v1/team/invite-links/decline",
  teamInvitationAccept: "/api/v1/team/invitations/accept",
  teamQuota: (groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/quota`,
  teamMemberQuotas: (groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/member-quotas`,
  /** 云网关 member/details 代理：全量成员 + Quota 使用 + 历史累计消耗（不分页）。 */
  teamMemberDetails: (groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/member-details`,
  teamCreditSummary: (groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/credit-summary`,
  teamTransactions: (groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/transactions`,
  teamSelfTransactions: (groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/self/transactions`,
  teamMemberTransactions: (groupId, memberId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}/transactions`,
  teamTransfers: (groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/transfers`,
  teamCheckoutSessions: (groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/checkout-sessions`,
  // WebSocket
  wsChat: "/ws"
};
const BACKEND_NANO_BANANA = "nano_banana";
const BACKEND_KLING = "kling";
const BACKEND_OPENAI = "openai";
const BACKEND_MIDJOURNEY = "midjourney";
const BACKEND_SEEDREAM = "seedream";
const BACKEND_MINIMAX_V3 = "minimax_v3";
const BACKEND_VEO3 = "veo3";
const BACKEND_WAN_I2V = "wan_i2v";
const BACKEND_MINIMAX_TTS = "minimax_tts";
const BACKEND_SEEDAUDIO = "seedaudio";
const BACKEND_MINIMAX_MUSIC = "minimax_music";
const BACKEND_ELEVENLABS_MUSIC = "elevenlabs_music";
const BACKEND_SEEDANCE = "seedance";
const BACKEND_KLING_AVATAR = "kling_avatar";
const BACKEND_KLING_MOTION_CONTROL = "kling_motion_control";
const BACKEND_JIMENG_MOTION_CONTROL = "jimeng_motion_control";
const ASPECT_RATIOS_FULL = [
  "auto",
  "1:1",
  "16:9",
  "9:16",
  "3:4",
  "4:3",
  "3:2",
  "2:3",
  "5:4",
  "4:5",
  "21:9"
];
const IMAGE_GENERATION_ESTIMATE_SECONDS = 180;
const LEGACY_HAILUO_MODEL_ALIASES = [
  {
    publicModels: ["MiniMax-Hailuo-2.3-Fast", "Hailuo 2.3 Fast"],
    pricingModel: "MiniMax-Hailuo-2.3-Fast",
    preferredPublicModel: "MiniMax-Hailuo-2.3-Fast",
    displayName: "Hailuo 2.3 Fast"
  },
  {
    publicModels: ["MiniMax-Hailuo-2.3", "Hailuo 2.3"],
    pricingModel: "MiniMax-Hailuo-2.3",
    preferredPublicModel: "MiniMax-Hailuo-2.3",
    displayName: "Hailuo 2.3"
  },
  {
    publicModels: ["MiniMax-Hailuo-02", "Hailuo 2.0"],
    pricingModel: "MiniMax-Hailuo-02",
    preferredPublicModel: "MiniMax-Hailuo-02",
    displayName: "Hailuo 2.0"
  }
];
new Map(
  LEGACY_HAILUO_MODEL_ALIASES.flatMap(
    (alias) => [...alias.publicModels, alias.pricingModel].map((model) => [model, alias.displayName])
  )
);
function gptImage25Params() {
  return {
    resolution: {
      type: "select",
      label: "分辨率",
      options: ["1k", "2k", "4k"],
      default: "1k"
    },
    aspect_ratio: {
      type: "select",
      label: "比例",
      options: [
        "1:1",
        "16:9",
        "9:16",
        "3:4",
        "4:3",
        "3:2",
        "2:3",
        "5:4",
        "4:5",
        "21:9",
        "2:1",
        "1:2",
        "3:1",
        "1:3"
      ],
      default: "1:1"
    },
    quality: {
      type: "select",
      label: "画质",
      options: ["low", "medium", "high", "xhigh", "max"],
      default: "medium"
    },
    // background 只在 2.5 暴露：云网关 normalizeOpenAIBackground 会把其他 GPT Image
    // 模型上的 transparent / opaque 归一化回 auto。transparent 时由云网关自行补
    // output_format=png，前端不需要（也不应该）声明这个参数。
    background: {
      type: "select",
      label: "背景",
      options: ["auto", "transparent", "opaque"],
      default: "auto"
    }
  };
}
[
  // NanoBanana series — domestic registration (General Image branding)
  {
    id: "banana-2",
    name: "General Image 2",
    seriesId: "banana",
    publicToken: "banana_2",
    region: "domestic",
    backend: BACKEND_NANO_BANANA,
    model_name: "nano_banana_2_flash",
    //backend model name
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference"],
        default: "reference"
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto"
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["auto", "1K", "2K", "4K"],
        default: "auto"
      }
    }
  },
  {
    id: "banana-pro",
    name: "General Image Pro",
    seriesId: "banana",
    publicToken: "banana_pro",
    region: "domestic",
    backend: BACKEND_NANO_BANANA,
    model_name: "nano_banana_2",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference"],
        default: "reference"
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto"
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["auto", "1K", "2K", "4K"],
        default: "auto"
      }
    }
  },
  // NanoBanana series — overseas registration (NanoBanana branding)
  {
    id: "nano_banana_2_flash",
    name: "NanoBanana 2",
    seriesId: "nano-banana",
    region: "overseas",
    backend: BACKEND_NANO_BANANA,
    model_name: "nano_banana_2_flash",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto"
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["auto", "1K", "2K", "4K"],
        default: "auto"
      }
    }
  },
  {
    id: "nano_banana_2",
    name: "NanoBanana Pro",
    seriesId: "nano-banana",
    region: "overseas",
    backend: BACKEND_NANO_BANANA,
    model_name: "nano_banana_2",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto"
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["auto", "1K", "2K", "4K"],
        default: "auto"
      }
    }
  },
  // Seedream
  // max_refs 严格对齐官方文档上限 ≤10（4.5/4.0 多图融合），早期 registry
  // 写 14 会被上游静默截断或返回 4xx；详见画布模型参数对接 Diff 报告 §2.2
  // (2026-06-07)。如需放宽请先与上游确认。
  {
    id: "doubao-seedream-5-0-pro-260628",
    name: "Seedream 5.0 Pro",
    seriesId: "seedream",
    backend: BACKEND_SEEDREAM,
    model_name: "doubao-seedream-5-0-pro-260628",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto"
      },
      // Seedream 5.0 Pro \u4E0A\u6E38\u5206\u8FA8\u7387\u6863\u4F4D\uFF1A1K / 2K\uFF08\u65E0 auto / \u65E0 3K / \u65E0 4K\uFF09\u3002
      // default \u8D70 2K\uFF0C\u4E0E\u65E7 5.0 Lite \u9ED8\u8BA4\u89C6\u89C9\u8D28\u91CF\u5BF9\u9F50\uFF08\u4E14\u4E0A\u6E38\u7A7A resolution \u56DE\u843D 2K\uFF09\u3002
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["1K", "2K"],
        default: "2K"
      }
    }
  },
  {
    id: "doubao-seedream-4-5-251128",
    name: "Seedream 4.5",
    seriesId: "seedream",
    backend: BACKEND_SEEDREAM,
    model_name: "doubao-seedream-4-5-251128",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto"
      },
      // Seedream 4.5 \u4E0A\u6E38\u5206\u8FA8\u7387\u6863\u4F4D\uFF1A2K / 4K\uFF08\u65E0 auto / \u65E0 1K / \u65E0 3K\uFF09\u3002
      // default \u8D70\u6700\u4F4E\u6863\uFF082K\uFF09\uFF0C\u4E0E 5.0 Lite \u4FDD\u6301\u4E00\u81F4\u7B56\u7565\u3002
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["2K", "4K"],
        default: "2K"
      }
    }
  },
  // Midjourney —— 每个可选版本使用独立 model_id（MJ 8.2 / MJ 8.1 / MJ 7 / MJ Niji7）。
  // 各版本共用 backend=BACKEND_MIDJOURNEY、seriesId='midjourney'，区别只在 model_id；
  // version 不再是 UI 参数，由 model_id 决定（gateway midjourney.service 按 model_id 推
  // --v 8.2 / --v 8.1 / --v 7 / --niji 7）。pricingId 统一回指云端计费 key 'midjourney'。
  // 老资产/老画布节点存的 model_id='midjourney' 通过 normalizeLegacyModelId 归一到
  // midjourney-8.1（read-time，不做磁盘迁移）。
  // —— 走悠船 i2i:参考图由 app/gateway 的 midjourney.service.ts 上传成 CDN URL,
  // 再以 url-prefix "url1 url2 ... urlN prompt" 拼到 prompt 里透传给悠船。
  // cloud-gateway 会反向解析 URL 列表落到 extra.InputImages。
  ...["8.2", "8.1", "7", "niji7"].map((ver) => ({
    id: ver === "niji7" ? "midjourney-niji7" : `midjourney-${ver}`,
    name: ver === "niji7" ? "Midjourney Niji 7" : `Midjourney ${ver}`,
    seriesId: "midjourney",
    backend: BACKEND_MIDJOURNEY,
    pricingId: "midjourney",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 4,
    params: {
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "1:1"
      },
      ...ver === "8.2" || ver === "8.1" ? {
        clarity: {
          type: "select",
          label: "清晰度",
          options: ["1k", "2k"],
          default: "1k"
        }
      } : {},
      stylize: {
        type: "slider",
        label: "风格化",
        min: 0,
        max: 1e3,
        step: 1,
        default: "100",
        marks: ["0", "100", "250", "500", "750", "1000"]
      },
      chaos: {
        type: "slider",
        label: "多样化",
        min: 0,
        max: 100,
        step: 1,
        default: "0",
        marks: ["0", "10", "30", "50", "75", "100"]
      },
      weird: {
        type: "slider",
        label: "怪异化",
        min: 0,
        max: 3e3,
        step: 1,
        default: "0",
        marks: ["0", "250", "500", "1000", "2000", "3000"]
      }
    }
  })),
  // GPT Image 2 — 双区域命名分离（与 all-in-one / nano_banana 同模式）
  // Domestic: g-image-2 / "Design Image 2" —— 去 OpenAI 品牌
  // Overseas: gpt-image-2 / "GPT Image 2" —— 沿用 OpenAI 品牌
  //
  // GPT Image 2 双区域共用一套 params 形态：
  //   - aspect_ratio: 在 21:9 之后追加 2:1 / 1:2 / 3:1 / 1:3 四个极端横纵比，
  //     横纵成对排布，保持原有横纵交替的视觉模式。
  //   - quality: low / medium / high 三档，default=medium。gateway 与云网关
  //     已透传并按 quality 分档计费。
  {
    id: "g-image-2",
    name: "Design Image 2",
    seriesId: "g-image-2",
    selectionAliases: ["gpt-image"],
    region: "domestic",
    backend: BACKEND_OPENAI,
    model_name: "gpt-image-2",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 16,
    params: {
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["1k", "2k", "4k"],
        default: "1k"
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: [
          "1:1",
          "16:9",
          "9:16",
          "3:4",
          "4:3",
          "3:2",
          "2:3",
          "5:4",
          "4:5",
          "21:9",
          "2:1",
          "1:2",
          "3:1",
          "1:3"
        ],
        default: "1:1"
      },
      quality: {
        type: "select",
        label: "画质",
        options: ["low", "medium", "high"],
        default: "medium"
      }
    }
  },
  {
    id: "gpt-image-2",
    name: "GPT Image 2",
    seriesId: "openai-image",
    region: "overseas",
    backend: BACKEND_OPENAI,
    model_name: "gpt-image-2",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 16,
    params: {
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["1k", "2k", "4k"],
        default: "1k"
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: [
          "1:1",
          "16:9",
          "9:16",
          "3:4",
          "4:3",
          "3:2",
          "2:3",
          "5:4",
          "4:5",
          "21:9",
          "2:1",
          "1:2",
          "3:1",
          "1:3"
        ],
        default: "1:1"
      },
      quality: {
        type: "select",
        label: "画质",
        options: ["low", "medium", "high"],
        default: "medium"
      }
    }
  },
  // GPT Image 2.5 — Flare（快速）/ Sunburst（精细）两个变体 × 双区域命名分离，
  // 与 GPT Image 2 同模式。max_refs 与链路与 GPT Image 2 一致；参数只多出 quality 的
  // xhigh / max 两档与独有的 background（见 gptImage25Params）。
  //
  // Domestic: g-image-2.5-*   / "Design Image 2.5 Flare|Sunburst" —— 去 OpenAI 品牌
  // Overseas: gpt-image-2.5-* / "GPT Image 2.5 Flare|Sunburst"    —— 沿用 OpenAI 品牌
  //
  // 两区只差一个品牌前缀，变体后缀保持一致。
  //
  // 两区共用同一个上游 model_name，而云网关计费按 model_name 匹配（非注册表 id），
  // 所以 Apollo media_billing_config / op_models 每个变体只需配一份。
  ...[
    { variant: "flare", label: "Flare" },
    { variant: "sunburst", label: "Sunburst" }
  ].flatMap(({ variant, label }) => [
    {
      id: `g-image-2.5-${variant}`,
      name: `Design Image 2.5 ${label}`,
      seriesId: "g-image-2.5",
      region: "domestic",
      backend: BACKEND_OPENAI,
      model_name: `gpt-image-2.5-${variant}`,
      estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
      max_refs: 16,
      params: gptImage25Params()
    },
    {
      id: `gpt-image-2.5-${variant}`,
      name: `GPT Image 2.5 ${label}`,
      seriesId: "openai-image",
      region: "overseas",
      backend: BACKEND_OPENAI,
      model_name: `gpt-image-2.5-${variant}`,
      estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
      max_refs: 16,
      params: gptImage25Params()
    }
  ])
];
const MINIMAX_H3_TEXT_ONLY_DEFAULT_RATIO = "16:9";
const HAILUO03_VIDEO_MODEL = {
  id: "MiniMax-H3",
  name: "MiniMax H3",
  seriesId: "MiniMax",
  backend: BACKEND_MINIMAX_V3,
  model_name: "MiniMax-H3",
  pricingId: "MiniMax-H3",
  max_refs: 9,
  max_video_refs: 3,
  max_audio_refs: 3,
  max_video_audio_refs: 3,
  supportsLastFrameOnly: true,
  promptMaxLength: 7e3,
  inputMediaLimits: {
    imageMinWidth: 256,
    imageMinHeight: 256,
    imageMaxWidth: 5760,
    imageMaxHeight: 5760,
    imageMinAspectRatio: 2 / 5,
    imageMaxAspectRatio: 5 / 2
  },
  params: {
    image_mode: {
      type: "select",
      label: "生成方式",
      options: ["reference", "first-last-frame", "video-extension"],
      default: "reference"
    },
    duration: {
      type: "select",
      label: "时长",
      options: ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
      default: "5"
    },
    aspect_ratio: {
      type: "select",
      label: "宽高比",
      options: [
        "adaptive",
        MINIMAX_H3_TEXT_ONLY_DEFAULT_RATIO,
        "4:3",
        "1:1",
        "3:4",
        "9:16",
        "21:9"
      ],
      default: "adaptive"
    },
    resolution: {
      type: "select",
      label: "分辨率",
      options: ["768P", "2K"],
      default: "2K"
    },
    generate_audio: {
      type: "select",
      label: "有声视频",
      options: ["true", "false"],
      default: "true"
    }
  },
  // 首尾帧模式上游只支持自适应比例（其余比例上游会忽略 / 报错）；视频续写
  // 仍走 768P 专用链路。popover 侧直接隐藏对应模式不支持的选项。
  paramConstraints: [
    {
      if: { param: "image_mode", eq: "first-last-frame" },
      disable: {
        param: "aspect_ratio",
        options: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"]
      }
    },
    {
      if: { param: "image_mode", eq: "video-extension" },
      disable: { param: "resolution", options: ["2K"] }
    }
  ],
  videoExtension: {
    inputMinDurationSec: 2,
    inputMaxDurationSec: 15,
    outputMinDurationSec: 5,
    outputMaxDurationSec: 20
  }
};
const MINIMAX_H3_MAX_VIDEO_MODEL = {
  id: "MiniMax-H3-Max",
  name: "MiniMax H3 Max",
  seriesId: "MiniMax",
  backend: BACKEND_MINIMAX_V3,
  model_name: "MiniMax-H3-Max",
  pricingId: "MiniMax-H3-Max",
  max_refs: 9,
  max_video_refs: 3,
  max_audio_refs: 3,
  max_video_audio_refs: 3,
  promptRequired: true,
  supportsLastFrameOnly: false,
  hiddenParamsByImageMode: {
    "first-last-frame": ["aspect_ratio"]
  },
  referenceMediaLimits: {
    video: { minDurationSec: 2, maxDurationSec: 15, totalMaxDurationSec: 15 },
    audio: {
      minDurationSec: 2,
      maxDurationSec: 15,
      totalMaxDurationSec: 15,
      allowStandalone: false
    }
  },
  params: {
    image_mode: {
      type: "select",
      label: "canvas.params.imageMode",
      options: ["reference", "first-last-frame", "text-to-video"],
      default: "reference"
    },
    aspect_ratio: {
      type: "select",
      label: "canvas.params.ratio",
      options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
      default: "adaptive"
    },
    resolution: {
      type: "select",
      label: "canvas.params.resolution",
      options: ["768P", "480P"],
      default: "768P"
    },
    duration: {
      type: "select",
      label: "canvas.params.duration",
      options: ["5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
      default: "5"
    },
    prompt_expansion_mode: {
      type: "select",
      label: "canvas.params.promptExpansion",
      options: ["disabled", "balanced", "quality"],
      default: "balanced"
    }
  },
  // 上游只在比例能从参考素材推导时接受 adaptive（i2va / r2va）；纯文本生成
  // （t2va）必须给固定比例。首尾帧比例整体隐藏，见 hiddenParamsByImageMode。
  paramConstraints: [
    {
      if: { param: "image_mode", eq: "text-to-video" },
      disable: { param: "aspect_ratio", options: ["adaptive"] }
    }
  ]
};
const MINIMAX_H3_MAX_TURBO_VIDEO_MODEL = {
  ...MINIMAX_H3_MAX_VIDEO_MODEL,
  id: "MiniMax-H3-Max-Turbo",
  name: "MiniMax H3 Max Turbo",
  model_name: "MiniMax-H3-Max-Turbo",
  pricingId: "MiniMax-H3-Max-Turbo",
  max_refs: 2,
  max_video_refs: void 0,
  max_audio_refs: void 0,
  max_video_audio_refs: void 0,
  referenceMediaLimits: void 0,
  params: {
    ...MINIMAX_H3_MAX_VIDEO_MODEL.params,
    image_mode: {
      ...MINIMAX_H3_MAX_VIDEO_MODEL.params.image_mode,
      options: ["first-last-frame", "text-to-video"],
      default: "text-to-video"
    },
    aspect_ratio: {
      ...MINIMAX_H3_MAX_VIDEO_MODEL.params.aspect_ratio,
      options: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
      default: "16:9"
    }
  }
};
const WAN3_MAX_REFERENCE_IMAGES = 10;
const WAN3_MAX_REFERENCE_VIDEOS = 5;
const WAN3_MAX_REFERENCE_AUDIOS = 5;
const WAN3_PROMPT_MAX_LENGTH = 2e4;
const WAN3_REFERENCE_MEDIA_LIMITS = {
  video: {
    minDurationSec: 1,
    maxDurationSec: 15,
    totalMaxDurationSec: 15,
    combinedWithOutputMaxDurationSec: 30
  },
  audio: {
    minDurationSec: 1,
    maxDurationSec: 15,
    totalMaxDurationSec: 15,
    allowStandalone: true
  }
};
const WAN3_DURATION_OPTIONS = Array.from({ length: 29 }, (_, index) => String(index + 2));
function wan3Params() {
  return {
    // 只暴露全能参考与首尾帧两种。视频编辑 / 视频延长 不单独开模式：
    // 在 reference 下放参考视频 + prompt 里写编辑或延长意图，上游自行识别，
    // 能力并没有少。文件参考（file）也归在 reference 里。
    image_mode: {
      type: "select",
      label: "生成方式",
      options: ["reference", "first-last-frame"],
      default: "reference"
    },
    duration: {
      type: "select",
      label: "时长",
      options: WAN3_DURATION_OPTIONS,
      default: "5"
    },
    aspect_ratio: {
      type: "select",
      label: "宽高比",
      options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16"],
      default: "adaptive"
    },
    resolution: {
      type: "select",
      label: "分辨率",
      options: ["480P", "720P", "1080P"],
      default: "1080P"
    },
    generate_audio: {
      type: "select",
      label: "有声视频",
      options: ["true", "false"],
      default: "true"
    }
  };
}
[
  HAILUO03_VIDEO_MODEL,
  MINIMAX_H3_MAX_VIDEO_MODEL,
  MINIMAX_H3_MAX_TURBO_VIDEO_MODEL,
  // Seedance series
  {
    id: "seedance2.0",
    name: "Seedance 2.0",
    seriesId: "seedance",
    backend: BACKEND_SEEDANCE,
    model_name: "seedance2.0",
    max_refs: 9,
    max_video_refs: 3,
    max_audio_refs: 3,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference", "first-last-frame"],
        default: "reference"
      },
      duration: {
        type: "select",
        label: "时长",
        options: ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
        default: "5"
      },
      aspect_ratio: {
        type: "select",
        label: "宽高比",
        options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
        default: "adaptive"
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["480p", "720p", "1080p", "4k"],
        default: "720p"
      },
      generate_audio: {
        type: "select",
        label: "有声视频",
        options: ["true", "false"],
        default: "true"
      }
    }
  },
  {
    id: "seedance2.0-fast",
    name: "Seedance 2.0 Fast",
    seriesId: "seedance",
    backend: BACKEND_SEEDANCE,
    model_name: "seedance2.0-fast",
    max_refs: 9,
    max_video_refs: 3,
    max_audio_refs: 3,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference", "first-last-frame"],
        default: "reference"
      },
      duration: {
        type: "select",
        label: "时长",
        options: ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
        default: "5"
      },
      aspect_ratio: {
        type: "select",
        label: "宽高比",
        options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
        default: "adaptive"
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["480p", "720p"],
        default: "720p"
      },
      generate_audio: {
        type: "select",
        label: "有声视频",
        options: ["true", "false"],
        default: "true"
      }
    }
  },
  {
    id: "seedance2.0-mini",
    name: "Seedance 2.0 Mini",
    seriesId: "seedance",
    backend: BACKEND_SEEDANCE,
    model_name: "seedance2.0-mini",
    max_refs: 9,
    max_video_refs: 3,
    max_audio_refs: 3,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference", "first-last-frame"],
        default: "reference"
      },
      duration: {
        type: "select",
        label: "时长",
        options: ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
        default: "5"
      },
      aspect_ratio: {
        type: "select",
        label: "宽高比",
        options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
        default: "adaptive"
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["480p", "720p"],
        default: "720p"
      },
      generate_audio: {
        type: "select",
        label: "有声视频",
        options: ["true", "false"],
        default: "true"
      }
    }
  },
  {
    id: "seedance2.5",
    name: "Seedance 2.5",
    seriesId: "seedance",
    backend: BACKEND_SEEDANCE,
    model_name: "seedance2.5",
    max_refs: 30,
    max_video_refs: 10,
    max_audio_refs: 10,
    promptRequired: true,
    referenceMediaLimits: {
      video: { minDurationSec: 2, maxDurationSec: 30, totalMaxDurationSec: 30 },
      audio: {
        minDurationSec: 2,
        maxDurationSec: 30,
        totalMaxDurationSec: 30,
        allowStandalone: true
      }
    },
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference", "first-last-frame", "video-edit", "video-extend"],
        default: "reference"
      },
      duration: {
        type: "select",
        label: "时长",
        options: Array.from({ length: 27 }, (_, index) => String(index + 4)),
        default: "5"
      },
      aspect_ratio: {
        type: "select",
        label: "宽高比",
        options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
        default: "adaptive"
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["480p", "720p", "1080p"],
        default: "720p"
      },
      output_format: {
        type: "select",
        label: "输出格式",
        options: ["mp4", "mov"],
        default: "mp4"
      },
      generate_audio: {
        type: "select",
        label: "有声视频",
        options: ["true", "false"],
        default: "true"
      }
    }
  },
  // Kling OmniVideo (kling-video-o1 / kling-v3-omni, multi-shot + image/video refs)
  // 注意：kling-video-o1 不支持原生音频生成（上游模型限制），故不暴露 sound 字段；
  // 仅 kling-v3-omni 支持 sound: on。
  {
    id: "kling-video-o1",
    name: "Kling O1",
    seriesId: "kling",
    backend: BACKEND_KLING,
    model_name: "kling-video-o1",
    pricingId: "kling-video-o1",
    max_refs: 7,
    max_video_refs: 1,
    promptMaxLength: 2500,
    params: {
      mode: {
        type: "select",
        label: "清晰度",
        options: ["std", "pro"],
        default: "pro"
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ["16:9", "9:16", "1:1"],
        default: "16:9"
      },
      duration: {
        type: "select",
        label: "时长(秒)",
        options: ["3", "4", "5", "6", "7", "8", "9", "10"],
        default: "5"
      }
    }
  },
  {
    id: "kling-v3-omni-video",
    name: "Kling 3.0 Omni",
    seriesId: "kling",
    backend: BACKEND_KLING,
    model_name: "kling-v3-omni",
    pricingId: "kling-v3-omni",
    max_refs: 7,
    max_video_refs: 1,
    promptMaxLength: 2500,
    params: {
      mode: {
        type: "select",
        label: "清晰度",
        options: ["std", "pro", "4k"],
        default: "pro"
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ["16:9", "9:16", "1:1"],
        default: "16:9"
      },
      duration: {
        type: "select",
        label: "时长(秒)",
        options: ["3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
        default: "5"
      },
      sound: {
        type: "select",
        label: "声音",
        options: ["on", "off"],
        default: "off"
      }
    }
  },
  {
    id: "kling-avatar",
    name: "Kling Avatar",
    seriesId: "kling",
    backend: BACKEND_KLING_AVATAR,
    model_name: "kling-avatar",
    pricingId: "kling-avatar",
    max_refs: 1,
    referenceImageRequired: true,
    max_audio_refs: 1,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference"],
        default: "reference"
      },
      mode: {
        type: "select",
        label: "清晰度",
        options: ["std", "pro"],
        default: "std"
      },
      type: {
        type: "select",
        label: "类型",
        options: ["avatar"],
        default: "avatar"
      }
    }
  },
  {
    id: "kling-motion-control",
    name: "Kling Motion Control",
    seriesId: "kling",
    backend: BACKEND_KLING_MOTION_CONTROL,
    model_name: "kling-motion-control",
    pricingId: "kling-motion-control",
    max_refs: 1,
    referenceImageRequired: true,
    max_video_refs: 1,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference"],
        default: "reference"
      },
      mode: {
        type: "select",
        label: "清晰度",
        options: ["std", "pro"],
        default: "std"
      },
      keep_original_sound: {
        type: "select",
        label: "原视频声音",
        options: ["yes", "no"],
        default: "yes"
      },
      character_orientation: {
        type: "select",
        label: "人物朝向",
        options: ["video", "image"],
        default: "video"
      },
      type: {
        type: "select",
        label: "类型",
        options: ["motion_control"],
        default: "motion_control"
      }
    }
  },
  // Wan 2.6 已下线：Apollo 不再下发这一行，且 wan_i2v backend 现在路由到 Wan 3.0，
  // 真去生成会被云网关的 wan3 型号白名单拒掉。条目本身不能删 —— 历史用 2.6
  // 生成的资产还要靠它查显示名（见 ModelInfo.hideInModelPicker 的说明），
  // 所以只把它从选择面里藏起来。
  {
    id: "wan2.6-i2v",
    name: "Wan 2.6",
    seriesId: "wan",
    backend: BACKEND_WAN_I2V,
    model_name: "wan2.6-i2v",
    hideInModelPicker: true,
    max_refs: 1,
    referenceImageRequired: true,
    max_audio_refs: 1,
    promptMaxLength: 1500,
    params: {
      duration: {
        type: "select",
        label: "时长",
        options: ["5", "10", "15"],
        default: "5"
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["720P", "1080P"],
        default: "1080P"
      },
      shot_type: {
        type: "select",
        label: "镜头类型",
        options: ["single", "multi"],
        default: "single"
      }
    }
  },
  // Wan 3.0 — All-in-One 全能参考视频。文生 / 首帧(+尾帧) / 参考生 / 视频编辑 /
  // 视频延长共用同一上游入口，由素材组合决定模式。image_mode 只暴露 reference 与
  // first-last-frame 两档：编辑和延长靠 reference + 参考视频 + prompt 意图达成，
  // 不需要单独的模式档。
  // backend 复用 wan_i2v（见 backend-ids.ts 的说明）：新增 backend id 会让存量
  // 客户端整份 catalog 解析失败。本地 gateway 按 model_id 选实现。
  // 上游强互斥：首尾帧素材与参考素材（图 / 视频 / 音频 / 文件）不能混用，
  // 云网关 ValidateWan3Input 会在提交期拦掉非法组合。
  {
    id: "wan3.0-video",
    name: "Wan 3.0",
    seriesId: "wan",
    backend: BACKEND_WAN_I2V,
    model_name: "wan3.0-video",
    max_refs: WAN3_MAX_REFERENCE_IMAGES,
    max_video_refs: WAN3_MAX_REFERENCE_VIDEOS,
    max_audio_refs: WAN3_MAX_REFERENCE_AUDIOS,
    promptMaxLength: WAN3_PROMPT_MAX_LENGTH,
    referenceMediaLimits: WAN3_REFERENCE_MEDIA_LIMITS,
    params: wan3Params()
  },
  {
    id: "wan3.0-video-prime",
    name: "Wan 3.0 Prime",
    seriesId: "wan",
    backend: BACKEND_WAN_I2V,
    model_name: "wan3.0-video-prime",
    max_refs: WAN3_MAX_REFERENCE_IMAGES,
    max_video_refs: WAN3_MAX_REFERENCE_VIDEOS,
    max_audio_refs: WAN3_MAX_REFERENCE_AUDIOS,
    promptMaxLength: WAN3_PROMPT_MAX_LENGTH,
    referenceMediaLimits: WAN3_REFERENCE_MEDIA_LIMITS,
    params: wan3Params()
  },
  {
    id: "jimeng_motion_control",
    name: "Jimeng Motion Control 2.0",
    seriesId: "jimeng",
    backend: BACKEND_JIMENG_MOTION_CONTROL,
    model_name: "jimeng_motion_control",
    pricingId: "jimeng-motion-control",
    max_refs: 1,
    max_video_refs: 1,
    hideInModelPicker: true,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference"],
        default: "reference"
      }
    }
  },
  // Veo3.1 Fast — domestic registration (Beta branding)
  {
    id: "beta-3-1-fast",
    name: "Beta Fast",
    seriesId: "beta",
    publicToken: "beta_fast",
    region: "domestic",
    backend: BACKEND_VEO3,
    model_name: "veo-3.1-fast-generate-001",
    max_refs: 1,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["first-last-frame"],
        default: "first-last-frame"
      },
      duration: {
        type: "select",
        label: "时长",
        options: ["8"],
        default: "8"
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ["16:9", "9:16"],
        default: "16:9"
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["720p", "1080p"],
        default: "720p"
      }
    }
  },
  // Veo3.1 — domestic registration (Beta branding)
  {
    id: "beta-3-1",
    name: "Beta Pro",
    seriesId: "beta",
    publicToken: "beta_pro",
    region: "domestic",
    backend: BACKEND_VEO3,
    model_name: "veo-3.1-generate-001",
    max_refs: 1,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["first-last-frame"],
        default: "first-last-frame"
      },
      duration: {
        type: "select",
        label: "时长",
        options: ["8"],
        default: "8"
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ["16:9", "9:16"],
        default: "16:9"
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["720p", "1080p"],
        default: "720p"
      }
    }
  },
  // Veo3.1 Fast — overseas registration (Veo3.1 branding)
  {
    id: "veo-3.1-fast-generate-001",
    name: "Veo3.1 Fast",
    seriesId: "veo3",
    region: "overseas",
    backend: BACKEND_VEO3,
    model_name: "veo-3.1-fast-generate-001",
    max_refs: 1,
    promptRequired: true,
    params: {
      duration: {
        type: "select",
        label: "时长",
        options: ["8"],
        default: "8"
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ["16:9", "9:16"],
        default: "16:9"
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["720p", "1080p"],
        default: "720p"
      }
    }
  },
  // Veo3.1 — overseas registration (Veo3.1 branding)
  {
    id: "veo-3.1-generate-001",
    name: "Veo3.1",
    seriesId: "veo3",
    region: "overseas",
    backend: BACKEND_VEO3,
    model_name: "veo-3.1-generate-001",
    max_refs: 1,
    promptRequired: true,
    params: {
      duration: {
        type: "select",
        label: "时长",
        options: ["8"],
        default: "8"
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ["16:9", "9:16"],
        default: "16:9"
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["720p", "1080p"],
        default: "720p"
      }
    }
  }
];
const TTS_VOICE_OPTIONS = [
  "Friendly_Person",
  "Calm_Woman",
  "Energetic_Male",
  "Professional_Female",
  "Deep_Male",
  "Young_Female"
];
const TTS_SPEED_PRESETS = ["0.5", "0.75", "1", "1.25", "1.5", "1.75", "2"];
const TTS_SPEED_SLIDER = {
  type: "slider",
  label: "语速",
  min: 0.5,
  max: 2,
  step: 0.25,
  marks: TTS_SPEED_PRESETS,
  default: "1"
};
const TTS_EMOTIONS_BASIC = [
  "calm",
  "happy",
  "sad",
  "angry",
  "fearful",
  "disgusted",
  "surprised",
  "fluent"
];
const TTS_EMOTION_FIELD = {
  type: "select",
  label: "情绪",
  options: TTS_EMOTIONS_BASIC,
  default: "",
  optional: true
};
const SEEDAUDIO_SPEED_SLIDER = {
  type: "slider",
  label: "语速",
  min: 0.5,
  max: 2,
  step: 0.1,
  marks: ["0.5", "1", "1.5", "2"],
  default: "1"
};
const SEEDAUDIO_VOLUME_SLIDER = {
  type: "slider",
  label: "音量",
  min: 0.5,
  max: 2,
  step: 0.1,
  marks: ["0.5", "1", "1.5", "2"],
  default: "1"
};
const SEEDAUDIO_PITCH_SLIDER = {
  type: "slider",
  label: "音调",
  min: -12,
  max: 12,
  step: 1,
  marks: ["-12", "0", "12"],
  default: "0"
};
const SEEDAUDIO_SAMPLE_RATE_FIELD = {
  type: "select",
  label: "采样率",
  options: ["8000", "16000", "24000", "32000", "44100", "48000"],
  default: "24000"
};
const AUDIO_MODELS = [
  // MiniMax H3 reference-audio continuation.
  {
    id: "MiniMax-H3 Audio",
    name: "MiniMax H3 Audio",
    seriesId: "MiniMax",
    backend: BACKEND_MINIMAX_V3,
    model_name: "MiniMax-H3 Audio",
    pricingId: "MiniMax-H3-audio-continuation",
    max_refs: 0,
    max_audio_refs: 1,
    promptLabel: "text",
    params: {
      duration: {
        type: "select",
        label: "时长",
        options: [
          "5",
          "6",
          "7",
          "8",
          "9",
          "10",
          "11",
          "12",
          "13",
          "14",
          "15",
          "16",
          "17",
          "18",
          "19",
          "20"
        ],
        default: "5"
      }
    },
    audioExtension: {
      inputMinDurationSec: 1,
      inputMaxDurationSec: 20,
      outputMinDurationSec: 5,
      outputMaxDurationSec: 20
    }
  },
  // speech-2.8 系列：当前唯一支持的版本，最高保真度
  {
    id: "speech-2.8-hd",
    name: "Speech-2.8-HD",
    seriesId: "official-speech",
    backend: BACKEND_MINIMAX_TTS,
    max_refs: 0,
    promptLabel: "text",
    promptMaxLength: 1e4,
    params: {
      voice_id: {
        type: "select",
        label: "音色",
        options: TTS_VOICE_OPTIONS,
        default: "Friendly_Person"
      },
      speed: TTS_SPEED_SLIDER,
      emotion: TTS_EMOTION_FIELD
    }
  },
  // SeedAudio 1.0（字节 openspeech seed-audio）
  // - 参考文件：音频 ≤3（wav/mp3/pcm/ogg_opus，≤30s/≤10MB），或图片 1 张
  //   （jpeg/png/webp，≤10MB）；音频与图片不可同时 ref（popover 侧互斥）。
  // - @音频N 逻辑保持：由用户自己在 text 里写引用，前端/网关不自动注入。
  // - Speed / Volume UI 显示 0.5-2 倍，网关侧映射 (x-1)*100 后透传上游
  //   speech_rate / loudness_rate；Pitch / SampleRate 与上游直接对齐。
  {
    id: "seed-audio-1.0",
    name: "Seed Audio 1.0",
    seriesId: "seedaudio",
    backend: BACKEND_SEEDAUDIO,
    model_name: "seed-audio-1.0",
    max_refs: 1,
    // 参考图最多 1 张
    max_audio_refs: 3,
    // 参考音频最多 3 条
    promptLabel: "text",
    promptMaxLength: 3e3,
    params: {
      speed: SEEDAUDIO_SPEED_SLIDER,
      volume: SEEDAUDIO_VOLUME_SLIDER,
      pitch: SEEDAUDIO_PITCH_SLIDER,
      sample_rate: SEEDAUDIO_SAMPLE_RATE_FIELD
    }
  },
  // MiniMax Music
  // Proto carries `model` + `is_instrumental`; local gateway forwards both and
  // Go provider reads them. is_instrumental=true skips lyrics and generates a
  // vocal-free track.
  {
    id: "music-3.0",
    name: "Music-3.0",
    seriesId: "official-music",
    backend: BACKEND_MINIMAX_MUSIC,
    model_name: "music-3.0",
    max_refs: 0,
    promptMaxLength: 2e3,
    params: {
      is_instrumental: {
        type: "select",
        label: "canvas.params.musicMode",
        options: ["vocal", "instrumental"],
        default: "vocal"
      },
      lyrics: {
        type: "textarea",
        label: "歌词",
        placeholder: "输入歌词,不填则使用上方描述作为歌词",
        default: ""
      }
    }
  },
  // ElevenLabs Music v2 — prompt-only song generation.
  {
    id: "elevenlabs-music-v2",
    name: "ElevenLabs Music v2",
    seriesId: "elevenlabs-music",
    backend: BACKEND_ELEVENLABS_MUSIC,
    model_name: "music_v2",
    max_refs: 0,
    promptLabel: "musicStyle",
    promptMaxLength: 2e3,
    params: {
      music_length_ms: {
        type: "select",
        label: "canvas.params.duration",
        options: ["auto", "30s", "1m", "2m", "4m", "6m", "custom"],
        default: "auto"
      },
      is_instrumental: {
        type: "select",
        label: "canvas.params.musicMode",
        options: ["auto", "instrumental"],
        default: "auto"
      }
    }
  }
];
AUDIO_MODELS.filter(
  (m) => m.backend === BACKEND_MINIMAX_TTS || m.backend === BACKEND_SEEDAUDIO || m.backend === BACKEND_MINIMAX_V3 && !!m.audioExtension
);
AUDIO_MODELS.filter(
  (m) => m.backend === BACKEND_MINIMAX_MUSIC || m.backend === BACKEND_ELEVENLABS_MUSIC
);
const OPENCODE_RUNTIME_HOME_ENV = "OPENCODE_TEST_HOME";
const OPENCODE_RUNTIME_SWITCHES = [
  {
    key: "OPENCODE_DISABLE_PROJECT_CONFIG",
    value: "1",
    why: "Project trees are user content, not agent configuration. Without this, OpenCode walks up from the project dir collecting `.opencode` dirs and treats each as a config source (and an npm install target)."
  },
  {
    key: "OPENCODE_DISABLE_CLAUDE_CODE",
    value: "1",
    why: "Hub ships its own agent profile; Claude Code interop would inject a second, unversioned prompt surface."
  },
  {
    key: "OPENCODE_DISABLE_EXTERNAL_SKILLS",
    value: "1",
    why: "Skills are resolved through Hub skill paths (`@hilo/protocol/skill-paths`), not through OpenCode discovery."
  },
  {
    key: "OPENCODE_LOG_LEVEL",
    value: "INFO",
    why: "Without an explicit level OpenCode writes a ZERO-BYTE log file, so its own diagnostics — including `background dependency install failed`, which names the exact directory and cause — are discarded. That gap is why the four-hour freeze had to be root-caused by disassembling the binary instead of reading a log. Verbose debugging is unaffected: the `--log-level` CLI flag is applied by OpenCode after the env var and still wins."
  }
];
[
  ...OPENCODE_RUNTIME_SWITCHES.map(({ key }) => key),
  OPENCODE_RUNTIME_HOME_ENV
];
const OPENCODE_PLUGIN_RUNTIME_PACKAGE = "@opencode-ai/plugin";
const ENV_OPENCODE_CONFIG_DIR = "OPENCODE_CONFIG_DIR";
function openCodeRuntimeContractEnv() {
  return Object.fromEntries(OPENCODE_RUNTIME_SWITCHES.map(({ key, value }) => [key, value]));
}
function openCodeDependencySatisfiedFiles(version) {
  const dependencies = { [OPENCODE_PLUGIN_RUNTIME_PACKAGE]: version };
  return {
    markerDir: "node_modules",
    files: [
      {
        name: "package.json",
        content: `${JSON.stringify({ name: "hilo-opencode-config", private: true, dependencies }, null, 2)}
`
      },
      {
        name: "package-lock.json",
        content: `${JSON.stringify(
          {
            name: "hilo-opencode-config",
            lockfileVersion: 3,
            requires: true,
            packages: { "": { name: "hilo-opencode-config", dependencies } }
          },
          null,
          2
        )}
`
      },
      {
        name: ".npmrc",
        content: "# Written by Hub — see @hilo/protocol/opencode-runtime-contract.ts.\n# Scopes OpenCode internal installs for THIS directory to the local cache;\n# never set npm_config_offline in the process env (it leaks to agent commands).\noffline=true\n"
      }
    ]
  };
}
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var jsYaml = {};
var loader = {};
var common = {};
var hasRequiredCommon;
function requireCommon() {
  if (hasRequiredCommon) return common;
  hasRequiredCommon = 1;
  function isNothing(subject) {
    return typeof subject === "undefined" || subject === null;
  }
  function isObject(subject) {
    return typeof subject === "object" && subject !== null;
  }
  function toArray(sequence) {
    if (Array.isArray(sequence)) return sequence;
    else if (isNothing(sequence)) return [];
    return [sequence];
  }
  function extend(target, source) {
    if (source) {
      const sourceKeys = Object.keys(source);
      for (let index = 0, length = sourceKeys.length; index < length; index += 1) {
        const key = sourceKeys[index];
        target[key] = source[key];
      }
    }
    return target;
  }
  function repeat(string, count) {
    let result = "";
    for (let cycle = 0; cycle < count; cycle += 1) {
      result += string;
    }
    return result;
  }
  function isNegativeZero(number) {
    return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
  }
  common.isNothing = isNothing;
  common.isObject = isObject;
  common.toArray = toArray;
  common.repeat = repeat;
  common.isNegativeZero = isNegativeZero;
  common.extend = extend;
  return common;
}
var exception;
var hasRequiredException;
function requireException() {
  if (hasRequiredException) return exception;
  hasRequiredException = 1;
  function formatError(exception2, compact) {
    let where = "";
    const message = exception2.reason || "(unknown reason)";
    if (!exception2.mark) return message;
    if (exception2.mark.name) {
      where += 'in "' + exception2.mark.name + '" ';
    }
    where += "(" + (exception2.mark.line + 1) + ":" + (exception2.mark.column + 1) + ")";
    if (!compact && exception2.mark.snippet) {
      where += "\n\n" + exception2.mark.snippet;
    }
    return message + " " + where;
  }
  function YAMLException2(reason, mark) {
    Error.call(this);
    this.name = "YAMLException";
    this.reason = reason;
    this.mark = mark;
    this.message = formatError(this, false);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error().stack || "";
    }
  }
  YAMLException2.prototype = Object.create(Error.prototype);
  YAMLException2.prototype.constructor = YAMLException2;
  YAMLException2.prototype.toString = function toString(compact) {
    return this.name + ": " + formatError(this, compact);
  };
  exception = YAMLException2;
  return exception;
}
var snippet;
var hasRequiredSnippet;
function requireSnippet() {
  if (hasRequiredSnippet) return snippet;
  hasRequiredSnippet = 1;
  const common2 = requireCommon();
  function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
    let head = "";
    let tail = "";
    const maxHalfLength = Math.floor(maxLineLength / 2) - 1;
    if (position - lineStart > maxHalfLength) {
      head = " ... ";
      lineStart = position - maxHalfLength + head.length;
    }
    if (lineEnd - position > maxHalfLength) {
      tail = " ...";
      lineEnd = position + maxHalfLength - tail.length;
    }
    return {
      str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "→") + tail,
      pos: position - lineStart + head.length
      // relative position
    };
  }
  function padStart(string, max) {
    return common2.repeat(" ", max - string.length) + string;
  }
  function makeSnippet(mark, options) {
    options = Object.create(options || null);
    if (!mark.buffer) return null;
    if (!options.maxLength) options.maxLength = 79;
    if (typeof options.indent !== "number") options.indent = 1;
    if (typeof options.linesBefore !== "number") options.linesBefore = 3;
    if (typeof options.linesAfter !== "number") options.linesAfter = 2;
    const re = /\r?\n|\r|\0/g;
    const lineStarts = [0];
    const lineEnds = [];
    let match;
    let foundLineNo = -1;
    while (match = re.exec(mark.buffer)) {
      lineEnds.push(match.index);
      lineStarts.push(match.index + match[0].length);
      if (mark.position <= match.index && foundLineNo < 0) {
        foundLineNo = lineStarts.length - 2;
      }
    }
    if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
    let result = "";
    const lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
    const maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
    for (let i = 1; i <= options.linesBefore; i++) {
      if (foundLineNo - i < 0) break;
      const line2 = getLine(
        mark.buffer,
        lineStarts[foundLineNo - i],
        lineEnds[foundLineNo - i],
        mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
        maxLineLength
      );
      result = common2.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line2.str + "\n" + result;
    }
    const line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
    result += common2.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
    result += common2.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
    for (let i = 1; i <= options.linesAfter; i++) {
      if (foundLineNo + i >= lineEnds.length) break;
      const line2 = getLine(
        mark.buffer,
        lineStarts[foundLineNo + i],
        lineEnds[foundLineNo + i],
        mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
        maxLineLength
      );
      result += common2.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line2.str + "\n";
    }
    return result.replace(/\n$/, "");
  }
  snippet = makeSnippet;
  return snippet;
}
var type;
var hasRequiredType;
function requireType() {
  if (hasRequiredType) return type;
  hasRequiredType = 1;
  const YAMLException2 = requireException();
  const TYPE_CONSTRUCTOR_OPTIONS = [
    "kind",
    "multi",
    "resolve",
    "construct",
    "instanceOf",
    "predicate",
    "represent",
    "representName",
    "defaultStyle",
    "styleAliases"
  ];
  const YAML_NODE_KINDS = [
    "scalar",
    "sequence",
    "mapping"
  ];
  function compileStyleAliases(map2) {
    const result = {};
    if (map2 !== null) {
      Object.keys(map2).forEach(function(style) {
        map2[style].forEach(function(alias) {
          result[String(alias)] = style;
        });
      });
    }
    return result;
  }
  function Type2(tag, options) {
    options = options || {};
    Object.keys(options).forEach(function(name) {
      if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
        throw new YAMLException2('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
      }
    });
    this.options = options;
    this.tag = tag;
    this.kind = options["kind"] || null;
    this.resolve = options["resolve"] || function() {
      return true;
    };
    this.construct = options["construct"] || function(data) {
      return data;
    };
    this.instanceOf = options["instanceOf"] || null;
    this.predicate = options["predicate"] || null;
    this.represent = options["represent"] || null;
    this.representName = options["representName"] || null;
    this.defaultStyle = options["defaultStyle"] || null;
    this.multi = options["multi"] || false;
    this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
    if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
      throw new YAMLException2('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
    }
  }
  type = Type2;
  return type;
}
var schema;
var hasRequiredSchema;
function requireSchema() {
  if (hasRequiredSchema) return schema;
  hasRequiredSchema = 1;
  const YAMLException2 = requireException();
  const Type2 = requireType();
  function compileList(schema2, name) {
    const result = [];
    schema2[name].forEach(function(currentType) {
      let newIndex = result.length;
      result.forEach(function(previousType, previousIndex) {
        if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
          newIndex = previousIndex;
        }
      });
      result[newIndex] = currentType;
    });
    return result;
  }
  function compileMap() {
    const result = {
      scalar: {},
      sequence: {},
      mapping: {},
      fallback: {},
      multi: {
        scalar: [],
        sequence: [],
        mapping: [],
        fallback: []
      }
    };
    function collectType(type2) {
      if (type2.multi) {
        result.multi[type2.kind].push(type2);
        result.multi["fallback"].push(type2);
      } else {
        result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
      }
    }
    for (let index = 0, length = arguments.length; index < length; index += 1) {
      arguments[index].forEach(collectType);
    }
    return result;
  }
  function Schema2(definition) {
    return this.extend(definition);
  }
  Schema2.prototype.extend = function extend(definition) {
    let implicit = [];
    let explicit = [];
    if (definition instanceof Type2) {
      explicit.push(definition);
    } else if (Array.isArray(definition)) {
      explicit = explicit.concat(definition);
    } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
      if (definition.implicit) implicit = implicit.concat(definition.implicit);
      if (definition.explicit) explicit = explicit.concat(definition.explicit);
    } else {
      throw new YAMLException2("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
    }
    implicit.forEach(function(type2) {
      if (!(type2 instanceof Type2)) {
        throw new YAMLException2("Specified list of YAML types (or a single Type object) contains a non-Type object.");
      }
      if (type2.loadKind && type2.loadKind !== "scalar") {
        throw new YAMLException2("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
      }
      if (type2.multi) {
        throw new YAMLException2("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
      }
    });
    explicit.forEach(function(type2) {
      if (!(type2 instanceof Type2)) {
        throw new YAMLException2("Specified list of YAML types (or a single Type object) contains a non-Type object.");
      }
    });
    const result = Object.create(Schema2.prototype);
    result.implicit = (this.implicit || []).concat(implicit);
    result.explicit = (this.explicit || []).concat(explicit);
    result.compiledImplicit = compileList(result, "implicit");
    result.compiledExplicit = compileList(result, "explicit");
    result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
    return result;
  };
  schema = Schema2;
  return schema;
}
var str;
var hasRequiredStr;
function requireStr() {
  if (hasRequiredStr) return str;
  hasRequiredStr = 1;
  const Type2 = requireType();
  str = new Type2("tag:yaml.org,2002:str", {
    kind: "scalar",
    construct: function(data) {
      return data !== null ? data : "";
    }
  });
  return str;
}
var seq;
var hasRequiredSeq;
function requireSeq() {
  if (hasRequiredSeq) return seq;
  hasRequiredSeq = 1;
  const Type2 = requireType();
  seq = new Type2("tag:yaml.org,2002:seq", {
    kind: "sequence",
    construct: function(data) {
      return data !== null ? data : [];
    }
  });
  return seq;
}
var map;
var hasRequiredMap;
function requireMap() {
  if (hasRequiredMap) return map;
  hasRequiredMap = 1;
  const Type2 = requireType();
  map = new Type2("tag:yaml.org,2002:map", {
    kind: "mapping",
    construct: function(data) {
      return data !== null ? data : {};
    }
  });
  return map;
}
var failsafe;
var hasRequiredFailsafe;
function requireFailsafe() {
  if (hasRequiredFailsafe) return failsafe;
  hasRequiredFailsafe = 1;
  const Schema2 = requireSchema();
  failsafe = new Schema2({
    explicit: [
      requireStr(),
      requireSeq(),
      requireMap()
    ]
  });
  return failsafe;
}
var _null;
var hasRequired_null;
function require_null() {
  if (hasRequired_null) return _null;
  hasRequired_null = 1;
  const Type2 = requireType();
  function resolveYamlNull(data) {
    if (data === null) return true;
    const max = data.length;
    return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
  }
  function constructYamlNull() {
    return null;
  }
  function isNull(object) {
    return object === null;
  }
  _null = new Type2("tag:yaml.org,2002:null", {
    kind: "scalar",
    resolve: resolveYamlNull,
    construct: constructYamlNull,
    predicate: isNull,
    represent: {
      canonical: function() {
        return "~";
      },
      lowercase: function() {
        return "null";
      },
      uppercase: function() {
        return "NULL";
      },
      camelcase: function() {
        return "Null";
      },
      empty: function() {
        return "";
      }
    },
    defaultStyle: "lowercase"
  });
  return _null;
}
var bool;
var hasRequiredBool;
function requireBool() {
  if (hasRequiredBool) return bool;
  hasRequiredBool = 1;
  const Type2 = requireType();
  function resolveYamlBoolean(data) {
    if (data === null) return false;
    const max = data.length;
    return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
  }
  function constructYamlBoolean(data) {
    return data === "true" || data === "True" || data === "TRUE";
  }
  function isBoolean(object) {
    return Object.prototype.toString.call(object) === "[object Boolean]";
  }
  bool = new Type2("tag:yaml.org,2002:bool", {
    kind: "scalar",
    resolve: resolveYamlBoolean,
    construct: constructYamlBoolean,
    predicate: isBoolean,
    represent: {
      lowercase: function(object) {
        return object ? "true" : "false";
      },
      uppercase: function(object) {
        return object ? "TRUE" : "FALSE";
      },
      camelcase: function(object) {
        return object ? "True" : "False";
      }
    },
    defaultStyle: "lowercase"
  });
  return bool;
}
var int;
var hasRequiredInt;
function requireInt() {
  if (hasRequiredInt) return int;
  hasRequiredInt = 1;
  const common2 = requireCommon();
  const Type2 = requireType();
  function isHexCode(c) {
    return c >= 48 && c <= 57 || c >= 65 && c <= 70 || c >= 97 && c <= 102;
  }
  function isOctCode(c) {
    return c >= 48 && c <= 55;
  }
  function isDecCode(c) {
    return c >= 48 && c <= 57;
  }
  function resolveYamlInteger(data) {
    if (data === null) return false;
    const max = data.length;
    let index = 0;
    let hasDigits = false;
    if (!max) return false;
    let ch = data[index];
    if (ch === "-" || ch === "+") {
      ch = data[++index];
    }
    if (ch === "0") {
      if (index + 1 === max) return true;
      ch = data[++index];
      if (ch === "b") {
        index++;
        for (; index < max; index++) {
          ch = data[index];
          if (ch !== "0" && ch !== "1") return false;
          hasDigits = true;
        }
        return hasDigits && isFinite(parseYamlInteger(data));
      }
      if (ch === "x") {
        index++;
        for (; index < max; index++) {
          if (!isHexCode(data.charCodeAt(index))) return false;
          hasDigits = true;
        }
        return hasDigits && isFinite(parseYamlInteger(data));
      }
      if (ch === "o") {
        index++;
        for (; index < max; index++) {
          if (!isOctCode(data.charCodeAt(index))) return false;
          hasDigits = true;
        }
        return hasDigits && isFinite(parseYamlInteger(data));
      }
    }
    for (; index < max; index++) {
      if (!isDecCode(data.charCodeAt(index))) {
        return false;
      }
      hasDigits = true;
    }
    if (!hasDigits) return false;
    return isFinite(parseYamlInteger(data));
  }
  function parseYamlInteger(data) {
    let value = data;
    let sign = 1;
    let ch = value[0];
    if (ch === "-" || ch === "+") {
      if (ch === "-") sign = -1;
      value = value.slice(1);
      ch = value[0];
    }
    if (value === "0") return 0;
    if (ch === "0") {
      if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
      if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
      if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
    }
    return sign * parseInt(value, 10);
  }
  function constructYamlInteger(data) {
    return parseYamlInteger(data);
  }
  function isInteger(object) {
    return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common2.isNegativeZero(object));
  }
  int = new Type2("tag:yaml.org,2002:int", {
    kind: "scalar",
    resolve: resolveYamlInteger,
    construct: constructYamlInteger,
    predicate: isInteger,
    represent: {
      binary: function(obj) {
        return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
      },
      octal: function(obj) {
        return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
      },
      decimal: function(obj) {
        return obj.toString(10);
      },
      hexadecimal: function(obj) {
        return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
      }
    },
    defaultStyle: "decimal",
    styleAliases: {
      binary: [2, "bin"],
      octal: [8, "oct"],
      decimal: [10, "dec"],
      hexadecimal: [16, "hex"]
    }
  });
  return int;
}
var float;
var hasRequiredFloat;
function requireFloat() {
  if (hasRequiredFloat) return float;
  hasRequiredFloat = 1;
  const common2 = requireCommon();
  const Type2 = requireType();
  const YAML_FLOAT_PATTERN = new RegExp(
    // 2.5e4, 2.5 and integers
    "^(?:[-+]?(?:[0-9]+)(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
  );
  const YAML_FLOAT_SPECIAL_PATTERN = new RegExp(
    "^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
  );
  function resolveYamlFloat(data) {
    if (data === null) return false;
    if (!YAML_FLOAT_PATTERN.test(data)) {
      return false;
    }
    if (isFinite(parseFloat(data, 10))) {
      return true;
    }
    return YAML_FLOAT_SPECIAL_PATTERN.test(data);
  }
  function constructYamlFloat(data) {
    let value = data.toLowerCase();
    const sign = value[0] === "-" ? -1 : 1;
    if ("+-".indexOf(value[0]) >= 0) {
      value = value.slice(1);
    }
    if (value === ".inf") {
      return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    } else if (value === ".nan") {
      return NaN;
    }
    return sign * parseFloat(value, 10);
  }
  const SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
  function representYamlFloat(object, style) {
    if (isNaN(object)) {
      switch (style) {
        case "lowercase":
          return ".nan";
        case "uppercase":
          return ".NAN";
        case "camelcase":
          return ".NaN";
      }
    } else if (Number.POSITIVE_INFINITY === object) {
      switch (style) {
        case "lowercase":
          return ".inf";
        case "uppercase":
          return ".INF";
        case "camelcase":
          return ".Inf";
      }
    } else if (Number.NEGATIVE_INFINITY === object) {
      switch (style) {
        case "lowercase":
          return "-.inf";
        case "uppercase":
          return "-.INF";
        case "camelcase":
          return "-.Inf";
      }
    } else if (common2.isNegativeZero(object)) {
      return "-0.0";
    }
    const res = object.toString(10);
    return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
  }
  function isFloat(object) {
    return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common2.isNegativeZero(object));
  }
  float = new Type2("tag:yaml.org,2002:float", {
    kind: "scalar",
    resolve: resolveYamlFloat,
    construct: constructYamlFloat,
    predicate: isFloat,
    represent: representYamlFloat,
    defaultStyle: "lowercase"
  });
  return float;
}
var json;
var hasRequiredJson;
function requireJson() {
  if (hasRequiredJson) return json;
  hasRequiredJson = 1;
  json = requireFailsafe().extend({
    implicit: [
      require_null(),
      requireBool(),
      requireInt(),
      requireFloat()
    ]
  });
  return json;
}
var core;
var hasRequiredCore;
function requireCore() {
  if (hasRequiredCore) return core;
  hasRequiredCore = 1;
  core = requireJson();
  return core;
}
var timestamp;
var hasRequiredTimestamp;
function requireTimestamp() {
  if (hasRequiredTimestamp) return timestamp;
  hasRequiredTimestamp = 1;
  const Type2 = requireType();
  const YAML_DATE_REGEXP = new RegExp(
    "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
  );
  const YAML_TIMESTAMP_REGEXP = new RegExp(
    "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
  );
  function resolveYamlTimestamp(data) {
    if (data === null) return false;
    if (YAML_DATE_REGEXP.exec(data) !== null) return true;
    if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
    return false;
  }
  function constructYamlTimestamp(data) {
    let fraction = 0;
    let delta = null;
    let match = YAML_DATE_REGEXP.exec(data);
    if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
    if (match === null) throw new Error("Date resolve error");
    const year = +match[1];
    const month = +match[2] - 1;
    const day = +match[3];
    if (!match[4]) {
      return new Date(Date.UTC(year, month, day));
    }
    const hour = +match[4];
    const minute = +match[5];
    const second = +match[6];
    if (match[7]) {
      fraction = match[7].slice(0, 3);
      while (fraction.length < 3) {
        fraction += "0";
      }
      fraction = +fraction;
    }
    if (match[9]) {
      const tzHour = +match[10];
      const tzMinute = +(match[11] || 0);
      delta = (tzHour * 60 + tzMinute) * 6e4;
      if (match[9] === "-") delta = -delta;
    }
    const date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
    if (delta) date.setTime(date.getTime() - delta);
    return date;
  }
  function representYamlTimestamp(object) {
    return object.toISOString();
  }
  timestamp = new Type2("tag:yaml.org,2002:timestamp", {
    kind: "scalar",
    resolve: resolveYamlTimestamp,
    construct: constructYamlTimestamp,
    instanceOf: Date,
    represent: representYamlTimestamp
  });
  return timestamp;
}
var merge;
var hasRequiredMerge;
function requireMerge() {
  if (hasRequiredMerge) return merge;
  hasRequiredMerge = 1;
  const Type2 = requireType();
  function resolveYamlMerge(data) {
    return data === "<<" || data === null;
  }
  merge = new Type2("tag:yaml.org,2002:merge", {
    kind: "scalar",
    resolve: resolveYamlMerge
  });
  return merge;
}
var binary;
var hasRequiredBinary;
function requireBinary() {
  if (hasRequiredBinary) return binary;
  hasRequiredBinary = 1;
  const Type2 = requireType();
  const BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
  function resolveYamlBinary(data) {
    if (data === null) return false;
    let bitlen = 0;
    const max = data.length;
    const map2 = BASE64_MAP;
    for (let idx = 0; idx < max; idx++) {
      const code = map2.indexOf(data.charAt(idx));
      if (code > 64) continue;
      if (code < 0) return false;
      bitlen += 6;
    }
    return bitlen % 8 === 0;
  }
  function constructYamlBinary(data) {
    const input = data.replace(/[\r\n=]/g, "");
    const max = input.length;
    const map2 = BASE64_MAP;
    let bits = 0;
    const result = [];
    for (let idx = 0; idx < max; idx++) {
      if (idx % 4 === 0 && idx) {
        result.push(bits >> 16 & 255);
        result.push(bits >> 8 & 255);
        result.push(bits & 255);
      }
      bits = bits << 6 | map2.indexOf(input.charAt(idx));
    }
    const tailbits = max % 4 * 6;
    if (tailbits === 0) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    } else if (tailbits === 18) {
      result.push(bits >> 10 & 255);
      result.push(bits >> 2 & 255);
    } else if (tailbits === 12) {
      result.push(bits >> 4 & 255);
    }
    return new Uint8Array(result);
  }
  function representYamlBinary(object) {
    let result = "";
    let bits = 0;
    const max = object.length;
    const map2 = BASE64_MAP;
    for (let idx = 0; idx < max; idx++) {
      if (idx % 3 === 0 && idx) {
        result += map2[bits >> 18 & 63];
        result += map2[bits >> 12 & 63];
        result += map2[bits >> 6 & 63];
        result += map2[bits & 63];
      }
      bits = (bits << 8) + object[idx];
    }
    const tail = max % 3;
    if (tail === 0) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    } else if (tail === 2) {
      result += map2[bits >> 10 & 63];
      result += map2[bits >> 4 & 63];
      result += map2[bits << 2 & 63];
      result += map2[64];
    } else if (tail === 1) {
      result += map2[bits >> 2 & 63];
      result += map2[bits << 4 & 63];
      result += map2[64];
      result += map2[64];
    }
    return result;
  }
  function isBinary(obj) {
    return Object.prototype.toString.call(obj) === "[object Uint8Array]";
  }
  binary = new Type2("tag:yaml.org,2002:binary", {
    kind: "scalar",
    resolve: resolveYamlBinary,
    construct: constructYamlBinary,
    predicate: isBinary,
    represent: representYamlBinary
  });
  return binary;
}
var omap;
var hasRequiredOmap;
function requireOmap() {
  if (hasRequiredOmap) return omap;
  hasRequiredOmap = 1;
  const Type2 = requireType();
  const _hasOwnProperty = Object.prototype.hasOwnProperty;
  const _toString = Object.prototype.toString;
  function resolveYamlOmap(data) {
    if (data === null) return true;
    const objectKeys = {};
    const object = data;
    for (let index = 0, length = object.length; index < length; index += 1) {
      const pair = object[index];
      let pairHasKey = false;
      if (_toString.call(pair) !== "[object Object]") return false;
      let pairKey;
      for (pairKey in pair) {
        if (_hasOwnProperty.call(pair, pairKey)) {
          if (!pairHasKey) pairHasKey = true;
          else return false;
        }
      }
      if (!pairHasKey) return false;
      if (_hasOwnProperty.call(objectKeys, pairKey)) return false;
      Object.defineProperty(objectKeys, pairKey, { value: true });
    }
    return true;
  }
  function constructYamlOmap(data) {
    return data !== null ? data : [];
  }
  omap = new Type2("tag:yaml.org,2002:omap", {
    kind: "sequence",
    resolve: resolveYamlOmap,
    construct: constructYamlOmap
  });
  return omap;
}
var pairs;
var hasRequiredPairs;
function requirePairs() {
  if (hasRequiredPairs) return pairs;
  hasRequiredPairs = 1;
  const Type2 = requireType();
  const _toString = Object.prototype.toString;
  function resolveYamlPairs(data) {
    if (data === null) return true;
    const object = data;
    const result = new Array(object.length);
    for (let index = 0, length = object.length; index < length; index += 1) {
      const pair = object[index];
      if (_toString.call(pair) !== "[object Object]") return false;
      const keys = Object.keys(pair);
      if (keys.length !== 1) return false;
      result[index] = [keys[0], pair[keys[0]]];
    }
    return true;
  }
  function constructYamlPairs(data) {
    if (data === null) return [];
    const object = data;
    const result = new Array(object.length);
    for (let index = 0, length = object.length; index < length; index += 1) {
      const pair = object[index];
      const keys = Object.keys(pair);
      result[index] = [keys[0], pair[keys[0]]];
    }
    return result;
  }
  pairs = new Type2("tag:yaml.org,2002:pairs", {
    kind: "sequence",
    resolve: resolveYamlPairs,
    construct: constructYamlPairs
  });
  return pairs;
}
var set;
var hasRequiredSet;
function requireSet() {
  if (hasRequiredSet) return set;
  hasRequiredSet = 1;
  const Type2 = requireType();
  const _hasOwnProperty = Object.prototype.hasOwnProperty;
  function resolveYamlSet(data) {
    if (data === null) return true;
    const object = data;
    for (const key in object) {
      if (_hasOwnProperty.call(object, key)) {
        if (object[key] !== null) return false;
      }
    }
    return true;
  }
  function constructYamlSet(data) {
    return data !== null ? data : {};
  }
  set = new Type2("tag:yaml.org,2002:set", {
    kind: "mapping",
    resolve: resolveYamlSet,
    construct: constructYamlSet
  });
  return set;
}
var _default;
var hasRequired_default;
function require_default() {
  if (hasRequired_default) return _default;
  hasRequired_default = 1;
  _default = requireCore().extend({
    implicit: [
      requireTimestamp(),
      requireMerge()
    ],
    explicit: [
      requireBinary(),
      requireOmap(),
      requirePairs(),
      requireSet()
    ]
  });
  return _default;
}
var hasRequiredLoader;
function requireLoader() {
  if (hasRequiredLoader) return loader;
  hasRequiredLoader = 1;
  const common2 = requireCommon();
  const YAMLException2 = requireException();
  const makeSnippet = requireSnippet();
  const DEFAULT_SCHEMA2 = require_default();
  const _hasOwnProperty = Object.prototype.hasOwnProperty;
  const CONTEXT_FLOW_IN = 1;
  const CONTEXT_FLOW_OUT = 2;
  const CONTEXT_BLOCK_IN = 3;
  const CONTEXT_BLOCK_OUT = 4;
  const CHOMPING_CLIP = 1;
  const CHOMPING_STRIP = 2;
  const CHOMPING_KEEP = 3;
  const PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
  const PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
  const PATTERN_FLOW_INDICATORS = /[,\[\]{}]/;
  const PATTERN_TAG_HANDLE = /^(?:!|!!|![0-9A-Za-z-]+!)$/;
  const PATTERN_TAG_URI = /^(?:!|[^,\[\]{}])(?:%[0-9a-f]{2}|[0-9a-z\-#;/?:@&=+$,_.!~*'()\[\]])*$/i;
  function _class(obj) {
    return Object.prototype.toString.call(obj);
  }
  function isEol(c) {
    return c === 10 || c === 13;
  }
  function isWhiteSpace(c) {
    return c === 9 || c === 32;
  }
  function isWsOrEol(c) {
    return c === 9 || c === 32 || c === 10 || c === 13;
  }
  function isFlowIndicator(c) {
    return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
  }
  function fromHexCode(c) {
    if (c >= 48 && c <= 57) {
      return c - 48;
    }
    const lc = c | 32;
    if (lc >= 97 && lc <= 102) {
      return lc - 97 + 10;
    }
    return -1;
  }
  function escapedHexLen(c) {
    if (c === 120) {
      return 2;
    }
    if (c === 117) {
      return 4;
    }
    if (c === 85) {
      return 8;
    }
    return 0;
  }
  function fromDecimalCode(c) {
    if (c >= 48 && c <= 57) {
      return c - 48;
    }
    return -1;
  }
  function simpleEscapeSequence(c) {
    switch (c) {
      case 48:
        return "\0";
      case 97:
        return "\x07";
      case 98:
        return "\b";
      case 116:
        return "	";
      case 9:
        return "	";
      case 110:
        return "\n";
      case 118:
        return "\v";
      case 102:
        return "\f";
      case 114:
        return "\r";
      case 101:
        return "\x1B";
      case 32:
        return " ";
      case 34:
        return '"';
      case 47:
        return "/";
      case 92:
        return "\\";
      case 78:
        return "";
      case 95:
        return " ";
      case 76:
        return "\u2028";
      case 80:
        return "\u2029";
      default:
        return "";
    }
  }
  function charFromCodepoint(c) {
    if (c <= 65535) {
      return String.fromCharCode(c);
    }
    return String.fromCharCode(
      (c - 65536 >> 10) + 55296,
      (c - 65536 & 1023) + 56320
    );
  }
  function setProperty(object, key, value) {
    if (key === "__proto__") {
      Object.defineProperty(object, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value
      });
    } else {
      object[key] = value;
    }
  }
  const simpleEscapeCheck = new Array(256);
  const simpleEscapeMap = new Array(256);
  for (let i = 0; i < 256; i++) {
    simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
    simpleEscapeMap[i] = simpleEscapeSequence(i);
  }
  function State(input, options) {
    this.input = input;
    this.filename = options["filename"] || null;
    this.schema = options["schema"] || DEFAULT_SCHEMA2;
    this.onWarning = options["onWarning"] || null;
    this.legacy = options["legacy"] || false;
    this.json = options["json"] || false;
    this.listener = options["listener"] || null;
    this.maxDepth = typeof options["maxDepth"] === "number" ? options["maxDepth"] : 100;
    this.maxTotalMergeKeys = typeof options["maxTotalMergeKeys"] === "number" ? options["maxTotalMergeKeys"] : 1e4;
    this.implicitTypes = this.schema.compiledImplicit;
    this.typeMap = this.schema.compiledTypeMap;
    this.length = input.length;
    this.position = 0;
    this.line = 0;
    this.lineStart = 0;
    this.lineIndent = 0;
    this.depth = 0;
    this.totalMergeKeys = 0;
    this.firstTabInLine = -1;
    this.documents = [];
    this.anchorMapTransactions = [];
  }
  function generateError(state, message) {
    const mark = {
      name: state.filename,
      buffer: state.input.slice(0, -1),
      // omit trailing \0
      position: state.position,
      line: state.line,
      column: state.position - state.lineStart
    };
    mark.snippet = makeSnippet(mark);
    return new YAMLException2(message, mark);
  }
  function throwError(state, message) {
    throw generateError(state, message);
  }
  function throwWarning(state, message) {
    if (state.onWarning) {
      state.onWarning.call(null, generateError(state, message));
    }
  }
  function storeAnchor(state, name, value) {
    const transactions = state.anchorMapTransactions;
    if (transactions.length !== 0) {
      const transaction = transactions[transactions.length - 1];
      if (!_hasOwnProperty.call(transaction, name)) {
        transaction[name] = {
          existed: _hasOwnProperty.call(state.anchorMap, name),
          value: state.anchorMap[name]
        };
      }
    }
    state.anchorMap[name] = value;
  }
  function beginAnchorTransaction(state) {
    state.anchorMapTransactions.push(/* @__PURE__ */ Object.create(null));
  }
  function commitAnchorTransaction(state) {
    const transaction = state.anchorMapTransactions.pop();
    const transactions = state.anchorMapTransactions;
    if (transactions.length === 0) return;
    const parent = transactions[transactions.length - 1];
    const names = Object.keys(transaction);
    for (let index = 0, length = names.length; index < length; index += 1) {
      const name = names[index];
      if (!_hasOwnProperty.call(parent, name)) {
        parent[name] = transaction[name];
      }
    }
  }
  function rollbackAnchorTransaction(state) {
    const transaction = state.anchorMapTransactions.pop();
    const names = Object.keys(transaction);
    for (let index = names.length - 1; index >= 0; index -= 1) {
      const entry = transaction[names[index]];
      if (entry.existed) {
        state.anchorMap[names[index]] = entry.value;
      } else {
        delete state.anchorMap[names[index]];
      }
    }
  }
  function snapshotState(state) {
    return {
      position: state.position,
      line: state.line,
      lineStart: state.lineStart,
      lineIndent: state.lineIndent,
      firstTabInLine: state.firstTabInLine,
      tag: state.tag,
      anchor: state.anchor,
      kind: state.kind,
      result: state.result
    };
  }
  function restoreState(state, snapshot) {
    state.position = snapshot.position;
    state.line = snapshot.line;
    state.lineStart = snapshot.lineStart;
    state.lineIndent = snapshot.lineIndent;
    state.firstTabInLine = snapshot.firstTabInLine;
    state.tag = snapshot.tag;
    state.anchor = snapshot.anchor;
    state.kind = snapshot.kind;
    state.result = snapshot.result;
  }
  const directiveHandlers = {
    YAML: function handleYamlDirective(state, name, args) {
      if (state.version !== null) {
        throwError(state, "duplication of %YAML directive");
      }
      if (args.length !== 1) {
        throwError(state, "YAML directive accepts exactly one argument");
      }
      const match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
      if (match === null) {
        throwError(state, "ill-formed argument of the YAML directive");
      }
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      if (major !== 1) {
        throwError(state, "unacceptable YAML version of the document");
      }
      state.version = args[0];
      state.checkLineBreaks = minor < 2;
      if (minor !== 1 && minor !== 2) {
        throwWarning(state, "unsupported YAML version of the document");
      }
    },
    TAG: function handleTagDirective(state, name, args) {
      let prefix;
      if (args.length !== 2) {
        throwError(state, "TAG directive accepts exactly two arguments");
      }
      const handle = args[0];
      prefix = args[1];
      if (!PATTERN_TAG_HANDLE.test(handle)) {
        throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
      }
      if (_hasOwnProperty.call(state.tagMap, handle)) {
        throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
      }
      if (!PATTERN_TAG_URI.test(prefix)) {
        throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
      }
      try {
        prefix = decodeURIComponent(prefix);
      } catch (err) {
        throwError(state, "tag prefix is malformed: " + prefix);
      }
      state.tagMap[handle] = prefix;
    }
  };
  function captureSegment(state, start, end, checkJson) {
    if (start < end) {
      const _result = state.input.slice(start, end);
      if (checkJson) {
        for (let _position = 0, _length = _result.length; _position < _length; _position += 1) {
          const _character = _result.charCodeAt(_position);
          if (!(_character === 9 || _character >= 32 && _character <= 1114111)) {
            throwError(state, "expected valid JSON character");
          }
        }
      } else if (PATTERN_NON_PRINTABLE.test(_result)) {
        throwError(state, "the stream contains non-printable characters");
      }
      state.result += _result;
    }
  }
  function chargeMergeWork(state) {
    state.totalMergeKeys++;
    if (state.maxTotalMergeKeys !== -1 && state.totalMergeKeys > state.maxTotalMergeKeys) {
      throwError(state, "merge keys exceeded maxTotalMergeKeys (" + state.maxTotalMergeKeys + ")");
    }
  }
  function mergeMappings(state, destination, source, overridableKeys) {
    if (!common2.isObject(source)) {
      throwError(state, "cannot merge mappings; the provided source object is unacceptable");
    }
    chargeMergeWork(state);
    const sourceKeys = Object.keys(source);
    for (let index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
      const key = sourceKeys[index];
      chargeMergeWork(state);
      if (!_hasOwnProperty.call(destination, key)) {
        setProperty(destination, key, source[key]);
        overridableKeys[key] = true;
      }
    }
  }
  function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
    if (Array.isArray(keyNode)) {
      keyNode = Array.prototype.slice.call(keyNode);
      for (let index = 0, quantity = keyNode.length; index < quantity; index += 1) {
        if (Array.isArray(keyNode[index])) {
          throwError(state, "nested arrays are not supported inside keys");
        }
        if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
          keyNode[index] = "[object Object]";
        }
      }
    }
    if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
      keyNode = "[object Object]";
    }
    keyNode = String(keyNode);
    if (_result === null) {
      _result = {};
    }
    if (keyTag === "tag:yaml.org,2002:merge") {
      if (Array.isArray(valueNode)) {
        if (valueNode.length > 100) {
          throwError(state, "abnormal merge sequence size");
        }
        for (let index = 0, quantity = valueNode.length; index < quantity; index += 1) {
          mergeMappings(state, _result, valueNode[index], overridableKeys);
        }
      } else {
        mergeMappings(state, _result, valueNode, overridableKeys);
      }
    } else {
      if (!state.json && !_hasOwnProperty.call(overridableKeys, keyNode) && _hasOwnProperty.call(_result, keyNode)) {
        state.line = startLine || state.line;
        state.lineStart = startLineStart || state.lineStart;
        state.position = startPos || state.position;
        throwError(state, "duplicated mapping key");
      }
      setProperty(_result, keyNode, valueNode);
      delete overridableKeys[keyNode];
    }
    return _result;
  }
  function readLineBreak(state) {
    const ch = state.input.charCodeAt(state.position);
    if (ch === 10) {
      state.position++;
    } else if (ch === 13) {
      state.position++;
      if (state.input.charCodeAt(state.position) === 10) {
        state.position++;
      }
    } else {
      throwError(state, "a line break is expected");
    }
    state.line += 1;
    state.lineStart = state.position;
    state.firstTabInLine = -1;
  }
  function skipSeparationSpace(state, allowComments, checkIndent) {
    let lineBreaks = 0;
    let ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      while (isWhiteSpace(ch)) {
        if (ch === 9 && state.firstTabInLine === -1) {
          state.firstTabInLine = state.position;
        }
        ch = state.input.charCodeAt(++state.position);
      }
      if (allowComments && ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 10 && ch !== 13 && ch !== 0);
      }
      if (isEol(ch)) {
        readLineBreak(state);
        ch = state.input.charCodeAt(state.position);
        lineBreaks++;
        state.lineIndent = 0;
        while (ch === 32) {
          state.lineIndent++;
          ch = state.input.charCodeAt(++state.position);
        }
      } else {
        break;
      }
    }
    if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
      throwWarning(state, "deficient indentation");
    }
    return lineBreaks;
  }
  function testDocumentSeparator(state) {
    let _position = state.position;
    let ch = state.input.charCodeAt(_position);
    if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
      _position += 3;
      ch = state.input.charCodeAt(_position);
      if (ch === 0 || isWsOrEol(ch)) {
        return true;
      }
    }
    return false;
  }
  function writeFoldedLines(state, count) {
    if (count === 1) {
      state.result += " ";
    } else if (count > 1) {
      state.result += common2.repeat("\n", count - 1);
    }
  }
  function readPlainScalar(state, nodeIndent, withinFlowCollection) {
    let captureStart;
    let captureEnd;
    let hasPendingContent;
    let _line;
    let _lineStart;
    let _lineIndent;
    const _kind = state.kind;
    const _result = state.result;
    let ch = state.input.charCodeAt(state.position);
    if (isWsOrEol(ch) || isFlowIndicator(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
      return false;
    }
    if (ch === 63 || ch === 45) {
      const following = state.input.charCodeAt(state.position + 1);
      if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following)) {
        return false;
      }
    }
    state.kind = "scalar";
    state.result = "";
    captureStart = captureEnd = state.position;
    hasPendingContent = false;
    while (ch !== 0) {
      if (ch === 58) {
        const following = state.input.charCodeAt(state.position + 1);
        if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following)) {
          break;
        }
      } else if (ch === 35) {
        const preceding = state.input.charCodeAt(state.position - 1);
        if (isWsOrEol(preceding)) {
          break;
        }
      } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && isFlowIndicator(ch)) {
        break;
      } else if (isEol(ch)) {
        _line = state.line;
        _lineStart = state.lineStart;
        _lineIndent = state.lineIndent;
        skipSeparationSpace(state, false, -1);
        if (state.lineIndent >= nodeIndent) {
          hasPendingContent = true;
          ch = state.input.charCodeAt(state.position);
          continue;
        } else {
          state.position = captureEnd;
          state.line = _line;
          state.lineStart = _lineStart;
          state.lineIndent = _lineIndent;
          break;
        }
      }
      if (hasPendingContent) {
        captureSegment(state, captureStart, captureEnd, false);
        writeFoldedLines(state, state.line - _line);
        captureStart = captureEnd = state.position;
        hasPendingContent = false;
      }
      if (!isWhiteSpace(ch)) {
        captureEnd = state.position + 1;
      }
      ch = state.input.charCodeAt(++state.position);
    }
    captureSegment(state, captureStart, captureEnd, false);
    if (state.result) {
      return true;
    }
    state.kind = _kind;
    state.result = _result;
    return false;
  }
  function readSingleQuotedScalar(state, nodeIndent) {
    let captureStart;
    let captureEnd;
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 39) {
      return false;
    }
    state.kind = "scalar";
    state.result = "";
    state.position++;
    captureStart = captureEnd = state.position;
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      if (ch === 39) {
        captureSegment(state, captureStart, state.position, true);
        ch = state.input.charCodeAt(++state.position);
        if (ch === 39) {
          captureStart = state.position;
          state.position++;
          captureEnd = state.position;
        } else {
          return true;
        }
      } else if (isEol(ch)) {
        captureSegment(state, captureStart, captureEnd, true);
        writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
        captureStart = captureEnd = state.position;
      } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
        throwError(state, "unexpected end of the document within a single quoted scalar");
      } else {
        state.position++;
        if (!isWhiteSpace(ch)) {
          captureEnd = state.position;
        }
      }
    }
    throwError(state, "unexpected end of the stream within a single quoted scalar");
  }
  function readDoubleQuotedScalar(state, nodeIndent) {
    let captureStart;
    let captureEnd;
    let tmp;
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 34) {
      return false;
    }
    state.kind = "scalar";
    state.result = "";
    state.position++;
    captureStart = captureEnd = state.position;
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      if (ch === 34) {
        captureSegment(state, captureStart, state.position, true);
        state.position++;
        return true;
      } else if (ch === 92) {
        captureSegment(state, captureStart, state.position, true);
        ch = state.input.charCodeAt(++state.position);
        if (isEol(ch)) {
          skipSeparationSpace(state, false, nodeIndent);
        } else if (ch < 256 && simpleEscapeCheck[ch]) {
          state.result += simpleEscapeMap[ch];
          state.position++;
        } else if ((tmp = escapedHexLen(ch)) > 0) {
          let hexLength = tmp;
          let hexResult = 0;
          for (; hexLength > 0; hexLength--) {
            ch = state.input.charCodeAt(++state.position);
            if ((tmp = fromHexCode(ch)) >= 0) {
              hexResult = (hexResult << 4) + tmp;
            } else {
              throwError(state, "expected hexadecimal character");
            }
          }
          state.result += charFromCodepoint(hexResult);
          state.position++;
        } else {
          throwError(state, "unknown escape sequence");
        }
        captureStart = captureEnd = state.position;
      } else if (isEol(ch)) {
        captureSegment(state, captureStart, captureEnd, true);
        writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
        captureStart = captureEnd = state.position;
      } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
        throwError(state, "unexpected end of the document within a double quoted scalar");
      } else {
        state.position++;
        if (!isWhiteSpace(ch)) {
          captureEnd = state.position;
        }
      }
    }
    throwError(state, "unexpected end of the stream within a double quoted scalar");
  }
  function readFlowCollection(state, nodeIndent) {
    let readNext = true;
    let _line;
    let _lineStart;
    let _pos;
    const _tag = state.tag;
    let _result;
    const _anchor = state.anchor;
    let terminator;
    let isPair;
    let isExplicitPair;
    let isMapping;
    const overridableKeys = /* @__PURE__ */ Object.create(null);
    let keyNode;
    let keyTag;
    let valueNode;
    let ch = state.input.charCodeAt(state.position);
    if (ch === 91) {
      terminator = 93;
      isMapping = false;
      _result = [];
    } else if (ch === 123) {
      terminator = 125;
      isMapping = true;
      _result = {};
    } else {
      return false;
    }
    if (state.anchor !== null) {
      storeAnchor(state, state.anchor, _result);
    }
    ch = state.input.charCodeAt(++state.position);
    while (ch !== 0) {
      skipSeparationSpace(state, true, nodeIndent);
      ch = state.input.charCodeAt(state.position);
      if (ch === terminator) {
        state.position++;
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = isMapping ? "mapping" : "sequence";
        state.result = _result;
        return true;
      } else if (!readNext) {
        throwError(state, "missed comma between flow collection entries");
      } else if (ch === 44) {
        throwError(state, "expected the node content, but found ','");
      }
      keyTag = keyNode = valueNode = null;
      isPair = isExplicitPair = false;
      if (ch === 63) {
        const following = state.input.charCodeAt(state.position + 1);
        if (isWsOrEol(following)) {
          isPair = isExplicitPair = true;
          state.position++;
          skipSeparationSpace(state, true, nodeIndent);
        }
      }
      _line = state.line;
      _lineStart = state.lineStart;
      _pos = state.position;
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      keyTag = state.tag;
      keyNode = state.result;
      skipSeparationSpace(state, true, nodeIndent);
      ch = state.input.charCodeAt(state.position);
      if ((isExplicitPair || state.line === _line) && ch === 58) {
        isPair = true;
        ch = state.input.charCodeAt(++state.position);
        skipSeparationSpace(state, true, nodeIndent);
        composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
        valueNode = state.result;
      }
      if (isMapping) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
      } else if (isPair) {
        _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
      } else {
        _result.push(keyNode);
      }
      skipSeparationSpace(state, true, nodeIndent);
      ch = state.input.charCodeAt(state.position);
      if (ch === 44) {
        readNext = true;
        ch = state.input.charCodeAt(++state.position);
      } else {
        readNext = false;
      }
    }
    throwError(state, "unexpected end of the stream within a flow collection");
  }
  function readBlockScalar(state, nodeIndent) {
    let folding;
    let chomping = CHOMPING_CLIP;
    let didReadContent = false;
    let detectedIndent = false;
    let textIndent = nodeIndent;
    let emptyLines = 0;
    let atMoreIndented = false;
    let tmp;
    let ch = state.input.charCodeAt(state.position);
    if (ch === 124) {
      folding = false;
    } else if (ch === 62) {
      folding = true;
    } else {
      return false;
    }
    state.kind = "scalar";
    state.result = "";
    while (ch !== 0) {
      ch = state.input.charCodeAt(++state.position);
      if (ch === 43 || ch === 45) {
        if (CHOMPING_CLIP === chomping) {
          chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
        } else {
          throwError(state, "repeat of a chomping mode identifier");
        }
      } else if ((tmp = fromDecimalCode(ch)) >= 0) {
        if (tmp === 0) {
          throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
        } else if (!detectedIndent) {
          textIndent = nodeIndent + tmp - 1;
          detectedIndent = true;
        } else {
          throwError(state, "repeat of an indentation width identifier");
        }
      } else {
        break;
      }
    }
    if (isWhiteSpace(ch)) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (isWhiteSpace(ch));
      if (ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (!isEol(ch) && ch !== 0);
      }
    }
    while (ch !== 0) {
      readLineBreak(state);
      state.lineIndent = 0;
      ch = state.input.charCodeAt(state.position);
      while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
      if (!detectedIndent && state.lineIndent > textIndent) {
        textIndent = state.lineIndent;
      }
      if (isEol(ch)) {
        emptyLines++;
        continue;
      }
      if (!detectedIndent && textIndent === 0) {
        throwError(state, "missing indentation for block scalar");
      }
      if (state.lineIndent < textIndent) {
        if (chomping === CHOMPING_KEEP) {
          state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
        } else if (chomping === CHOMPING_CLIP) {
          if (didReadContent) {
            state.result += "\n";
          }
        }
        break;
      }
      if (folding) {
        if (isWhiteSpace(ch)) {
          atMoreIndented = true;
          state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
        } else if (atMoreIndented) {
          atMoreIndented = false;
          state.result += common2.repeat("\n", emptyLines + 1);
        } else if (emptyLines === 0) {
          if (didReadContent) {
            state.result += " ";
          }
        } else {
          state.result += common2.repeat("\n", emptyLines);
        }
      } else {
        state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      }
      didReadContent = true;
      detectedIndent = true;
      emptyLines = 0;
      const captureStart = state.position;
      while (!isEol(ch) && ch !== 0) {
        ch = state.input.charCodeAt(++state.position);
      }
      captureSegment(state, captureStart, state.position, false);
    }
    return true;
  }
  function readBlockSequence(state, nodeIndent) {
    const _tag = state.tag;
    const _anchor = state.anchor;
    const _result = [];
    let detected = false;
    if (state.firstTabInLine !== -1) return false;
    if (state.anchor !== null) {
      storeAnchor(state, state.anchor, _result);
    }
    let ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      if (state.firstTabInLine !== -1) {
        state.position = state.firstTabInLine;
        throwError(state, "tab characters must not be used in indentation");
      }
      if (ch !== 45) {
        break;
      }
      const following = state.input.charCodeAt(state.position + 1);
      if (!isWsOrEol(following)) {
        break;
      }
      detected = true;
      state.position++;
      if (skipSeparationSpace(state, true, -1)) {
        if (state.lineIndent <= nodeIndent) {
          _result.push(null);
          ch = state.input.charCodeAt(state.position);
          continue;
        }
      }
      const _line = state.line;
      composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
      _result.push(state.result);
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
      if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
        throwError(state, "bad indentation of a sequence entry");
      } else if (state.lineIndent < nodeIndent) {
        break;
      }
    }
    if (detected) {
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = "sequence";
      state.result = _result;
      return true;
    }
    return false;
  }
  function readBlockMapping(state, nodeIndent, flowIndent) {
    let allowCompact;
    let _keyLine;
    let _keyLineStart;
    let _keyPos;
    const _tag = state.tag;
    const _anchor = state.anchor;
    const _result = {};
    const overridableKeys = /* @__PURE__ */ Object.create(null);
    let keyTag = null;
    let keyNode = null;
    let valueNode = null;
    let atExplicitKey = false;
    let detected = false;
    if (state.firstTabInLine !== -1) return false;
    if (state.anchor !== null) {
      storeAnchor(state, state.anchor, _result);
    }
    let ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      if (!atExplicitKey && state.firstTabInLine !== -1) {
        state.position = state.firstTabInLine;
        throwError(state, "tab characters must not be used in indentation");
      }
      const following = state.input.charCodeAt(state.position + 1);
      const _line = state.line;
      if ((ch === 63 || ch === 58) && isWsOrEol(following)) {
        if (ch === 63) {
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = true;
          allowCompact = true;
        } else if (atExplicitKey) {
          atExplicitKey = false;
          allowCompact = true;
        } else {
          throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
        }
        state.position += 1;
        ch = following;
      } else {
        _keyLine = state.line;
        _keyLineStart = state.lineStart;
        _keyPos = state.position;
        if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
          break;
        }
        if (state.line === _line) {
          ch = state.input.charCodeAt(state.position);
          while (isWhiteSpace(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          if (ch === 58) {
            ch = state.input.charCodeAt(++state.position);
            if (!isWsOrEol(ch)) {
              throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
            }
            if (atExplicitKey) {
              storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
              keyTag = keyNode = valueNode = null;
            }
            detected = true;
            atExplicitKey = false;
            allowCompact = false;
            keyTag = state.tag;
            keyNode = state.result;
          } else if (detected) {
            throwError(state, "can not read an implicit mapping pair; a colon is missed");
          } else {
            state.tag = _tag;
            state.anchor = _anchor;
            return true;
          }
        } else if (detected) {
          throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true;
        }
      }
      if (state.line === _line || state.lineIndent > nodeIndent) {
        if (atExplicitKey) {
          _keyLine = state.line;
          _keyLineStart = state.lineStart;
          _keyPos = state.position;
        }
        if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
          if (atExplicitKey) {
            keyNode = state.result;
          } else {
            valueNode = state.result;
          }
        }
        if (!atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
          keyTag = keyNode = valueNode = null;
        }
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
      }
      if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
        throwError(state, "bad indentation of a mapping entry");
      } else if (state.lineIndent < nodeIndent) {
        break;
      }
    }
    if (atExplicitKey) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
    }
    if (detected) {
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = "mapping";
      state.result = _result;
    }
    return detected;
  }
  function readTagProperty(state) {
    let isVerbatim = false;
    let isNamed = false;
    let tagHandle;
    let tagName;
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 33) return false;
    if (state.tag !== null) {
      throwError(state, "duplication of a tag property");
    }
    ch = state.input.charCodeAt(++state.position);
    if (ch === 60) {
      isVerbatim = true;
      ch = state.input.charCodeAt(++state.position);
    } else if (ch === 33) {
      isNamed = true;
      tagHandle = "!!";
      ch = state.input.charCodeAt(++state.position);
    } else {
      tagHandle = "!";
    }
    let _position = state.position;
    if (isVerbatim) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 0 && ch !== 62);
      if (state.position < state.length) {
        tagName = state.input.slice(_position, state.position);
        ch = state.input.charCodeAt(++state.position);
      } else {
        throwError(state, "unexpected end of the stream within a verbatim tag");
      }
    } else {
      while (ch !== 0 && !isWsOrEol(ch)) {
        if (ch === 33) {
          if (!isNamed) {
            tagHandle = state.input.slice(_position - 1, state.position + 1);
            if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
              throwError(state, "named tag handle cannot contain such characters");
            }
            isNamed = true;
            _position = state.position + 1;
          } else {
            throwError(state, "tag suffix cannot contain exclamation marks");
          }
        }
        ch = state.input.charCodeAt(++state.position);
      }
      tagName = state.input.slice(_position, state.position);
      if (PATTERN_FLOW_INDICATORS.test(tagName)) {
        throwError(state, "tag suffix cannot contain flow indicator characters");
      }
    }
    if (tagName && !PATTERN_TAG_URI.test(tagName)) {
      throwError(state, "tag name cannot contain such characters: " + tagName);
    }
    try {
      tagName = decodeURIComponent(tagName);
    } catch (err) {
      throwError(state, "tag name is malformed: " + tagName);
    }
    if (isVerbatim) {
      state.tag = tagName;
    } else if (_hasOwnProperty.call(state.tagMap, tagHandle)) {
      state.tag = state.tagMap[tagHandle] + tagName;
    } else if (tagHandle === "!") {
      state.tag = "!" + tagName;
    } else if (tagHandle === "!!") {
      state.tag = "tag:yaml.org,2002:" + tagName;
    } else {
      throwError(state, 'undeclared tag handle "' + tagHandle + '"');
    }
    return true;
  }
  function readAnchorProperty(state) {
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 38) return false;
    if (state.anchor !== null) {
      throwError(state, "duplication of an anchor property");
    }
    ch = state.input.charCodeAt(++state.position);
    const _position = state.position;
    while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    if (state.position === _position) {
      throwError(state, "name of an anchor node must contain at least one character");
    }
    state.anchor = state.input.slice(_position, state.position);
    return true;
  }
  function readAlias(state) {
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 42) return false;
    ch = state.input.charCodeAt(++state.position);
    const _position = state.position;
    while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    if (state.position === _position) {
      throwError(state, "name of an alias node must contain at least one character");
    }
    const alias = state.input.slice(_position, state.position);
    if (!_hasOwnProperty.call(state.anchorMap, alias)) {
      throwError(state, 'unidentified alias "' + alias + '"');
    }
    state.result = state.anchorMap[alias];
    skipSeparationSpace(state, true, -1);
    return true;
  }
  function tryReadBlockMappingFromProperty(state, propertyStart, nodeIndent, flowIndent) {
    const fallbackState = snapshotState(state);
    beginAnchorTransaction(state);
    restoreState(state, propertyStart);
    state.tag = null;
    state.anchor = null;
    state.kind = null;
    state.result = null;
    if (readBlockMapping(state, nodeIndent, flowIndent) && state.kind === "mapping") {
      commitAnchorTransaction(state);
      return true;
    }
    rollbackAnchorTransaction(state);
    restoreState(state, fallbackState);
    return false;
  }
  function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
    let allowBlockScalars;
    let allowBlockCollections;
    let indentStatus = 1;
    let atNewLine = false;
    let hasContent = false;
    let propertyStart = null;
    let type2;
    let flowIndent;
    let blockIndent;
    if (state.depth >= state.maxDepth) {
      throwError(state, "nesting exceeded maxDepth (" + state.maxDepth + ")");
    }
    state.depth += 1;
    if (state.listener !== null) {
      state.listener("open", state);
    }
    state.tag = null;
    state.anchor = null;
    state.kind = null;
    state.result = null;
    const allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
    if (allowToSeek) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      }
    }
    if (indentStatus === 1) {
      while (true) {
        const ch = state.input.charCodeAt(state.position);
        const propertyState = snapshotState(state);
        if (atNewLine && (ch === 33 && state.tag !== null || ch === 38 && state.anchor !== null)) {
          break;
        }
        if (!readTagProperty(state) && !readAnchorProperty(state)) {
          break;
        }
        if (propertyStart === null) {
          propertyStart = propertyState;
        }
        if (skipSeparationSpace(state, true, -1)) {
          atNewLine = true;
          allowBlockCollections = allowBlockStyles;
          if (state.lineIndent > parentIndent) {
            indentStatus = 1;
          } else if (state.lineIndent === parentIndent) {
            indentStatus = 0;
          } else if (state.lineIndent < parentIndent) {
            indentStatus = -1;
          }
        } else {
          allowBlockCollections = false;
        }
      }
    }
    if (allowBlockCollections) {
      allowBlockCollections = atNewLine || allowCompact;
    }
    if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
      if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
        flowIndent = parentIndent;
      } else {
        flowIndent = parentIndent + 1;
      }
      blockIndent = state.position - state.lineStart;
      if (indentStatus === 1) {
        if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
          hasContent = true;
        } else {
          const ch = state.input.charCodeAt(state.position);
          if (propertyStart !== null && allowBlockStyles && !allowBlockCollections && ch !== 124 && ch !== 62 && tryReadBlockMappingFromProperty(
            state,
            propertyStart,
            propertyStart.position - propertyStart.lineStart,
            flowIndent
          )) {
            hasContent = true;
          } else if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
            hasContent = true;
          } else if (readAlias(state)) {
            hasContent = true;
            if (state.tag !== null || state.anchor !== null) {
              throwError(state, "alias node should not have any properties");
            }
          } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
            hasContent = true;
            if (state.tag === null) {
              state.tag = "?";
            }
          }
          if (state.anchor !== null) {
            storeAnchor(state, state.anchor, state.result);
          }
        }
      } else if (indentStatus === 0) {
        hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
      }
    }
    if (state.tag === null) {
      if (state.anchor !== null) {
        storeAnchor(state, state.anchor, state.result);
      }
    } else if (state.tag === "?") {
      if (state.result !== null && state.kind !== "scalar") {
        throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
      }
      for (let typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
        type2 = state.implicitTypes[typeIndex];
        if (type2.resolve(state.result)) {
          state.result = type2.construct(state.result);
          state.tag = type2.tag;
          if (state.anchor !== null) {
            storeAnchor(state, state.anchor, state.result);
          }
          break;
        }
      }
    } else if (state.tag !== "!") {
      if (_hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag)) {
        type2 = state.typeMap[state.kind || "fallback"][state.tag];
      } else {
        type2 = null;
        const typeList = state.typeMap.multi[state.kind || "fallback"];
        for (let typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
          if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
            type2 = typeList[typeIndex];
            break;
          }
        }
      }
      if (!type2) {
        throwError(state, "unknown tag !<" + state.tag + ">");
      }
      if (state.result !== null && type2.kind !== state.kind) {
        throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type2.kind + '", not "' + state.kind + '"');
      }
      if (!type2.resolve(state.result, state.tag)) {
        throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
      } else {
        state.result = type2.construct(state.result, state.tag);
        if (state.anchor !== null) {
          storeAnchor(state, state.anchor, state.result);
        }
      }
    }
    if (state.listener !== null) {
      state.listener("close", state);
    }
    state.depth -= 1;
    return state.tag !== null || state.anchor !== null || hasContent;
  }
  function readDocument(state) {
    const documentStart = state.position;
    let hasDirectives = false;
    let ch;
    state.version = null;
    state.checkLineBreaks = state.legacy;
    state.tagMap = /* @__PURE__ */ Object.create(null);
    state.anchorMap = /* @__PURE__ */ Object.create(null);
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
      if (state.lineIndent > 0 || ch !== 37) {
        break;
      }
      hasDirectives = true;
      ch = state.input.charCodeAt(++state.position);
      let _position = state.position;
      while (ch !== 0 && !isWsOrEol(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      const directiveName = state.input.slice(_position, state.position);
      const directiveArgs = [];
      if (directiveName.length < 1) {
        throwError(state, "directive name must not be less than one character in length");
      }
      while (ch !== 0) {
        while (isWhiteSpace(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (ch === 35) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (ch !== 0 && !isEol(ch));
          break;
        }
        if (isEol(ch)) break;
        _position = state.position;
        while (ch !== 0 && !isWsOrEol(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        directiveArgs.push(state.input.slice(_position, state.position));
      }
      if (ch !== 0) readLineBreak(state);
      if (_hasOwnProperty.call(directiveHandlers, directiveName)) {
        directiveHandlers[directiveName](state, directiveName, directiveArgs);
      } else {
        throwWarning(state, 'unknown document directive "' + directiveName + '"');
      }
    }
    skipSeparationSpace(state, true, -1);
    if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    } else if (hasDirectives) {
      throwError(state, "directives end mark is expected");
    }
    composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
    skipSeparationSpace(state, true, -1);
    if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
      throwWarning(state, "non-ASCII line breaks are interpreted as content");
    }
    state.documents.push(state.result);
    if (state.position === state.lineStart && testDocumentSeparator(state)) {
      if (state.input.charCodeAt(state.position) === 46) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);
      }
      return;
    }
    if (state.position < state.length - 1) {
      throwError(state, "end of the stream or a document separator is expected");
    }
  }
  function loadDocuments(input, options) {
    input = String(input);
    options = options || {};
    if (input.length !== 0) {
      if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
        input += "\n";
      }
      if (input.charCodeAt(0) === 65279) {
        input = input.slice(1);
      }
    }
    const state = new State(input, options);
    const nullpos = input.indexOf("\0");
    if (nullpos !== -1) {
      state.position = nullpos;
      throwError(state, "null byte is not allowed in input");
    }
    state.input += "\0";
    while (state.input.charCodeAt(state.position) === 32) {
      state.lineIndent += 1;
      state.position += 1;
    }
    while (state.position < state.length - 1) {
      readDocument(state);
    }
    return state.documents;
  }
  function loadAll2(input, iterator, options) {
    if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
      options = iterator;
      iterator = null;
    }
    const documents = loadDocuments(input, options);
    if (typeof iterator !== "function") {
      return documents;
    }
    for (let index = 0, length = documents.length; index < length; index += 1) {
      iterator(documents[index]);
    }
  }
  function load2(input, options) {
    const documents = loadDocuments(input, options);
    if (documents.length === 0) {
      return void 0;
    } else if (documents.length === 1) {
      return documents[0];
    }
    throw new YAMLException2("expected a single document in the stream, but found more");
  }
  loader.loadAll = loadAll2;
  loader.load = load2;
  return loader;
}
var dumper = {};
var hasRequiredDumper;
function requireDumper() {
  if (hasRequiredDumper) return dumper;
  hasRequiredDumper = 1;
  const common2 = requireCommon();
  const YAMLException2 = requireException();
  const DEFAULT_SCHEMA2 = require_default();
  const _toString = Object.prototype.toString;
  const _hasOwnProperty = Object.prototype.hasOwnProperty;
  const CHAR_BOM = 65279;
  const CHAR_TAB = 9;
  const CHAR_LINE_FEED = 10;
  const CHAR_CARRIAGE_RETURN = 13;
  const CHAR_SPACE = 32;
  const CHAR_EXCLAMATION = 33;
  const CHAR_DOUBLE_QUOTE = 34;
  const CHAR_SHARP = 35;
  const CHAR_PERCENT = 37;
  const CHAR_AMPERSAND = 38;
  const CHAR_SINGLE_QUOTE = 39;
  const CHAR_ASTERISK = 42;
  const CHAR_COMMA = 44;
  const CHAR_MINUS = 45;
  const CHAR_COLON = 58;
  const CHAR_EQUALS = 61;
  const CHAR_GREATER_THAN = 62;
  const CHAR_QUESTION = 63;
  const CHAR_COMMERCIAL_AT = 64;
  const CHAR_LEFT_SQUARE_BRACKET = 91;
  const CHAR_RIGHT_SQUARE_BRACKET = 93;
  const CHAR_GRAVE_ACCENT = 96;
  const CHAR_LEFT_CURLY_BRACKET = 123;
  const CHAR_VERTICAL_LINE = 124;
  const CHAR_RIGHT_CURLY_BRACKET = 125;
  const ESCAPE_SEQUENCES = {};
  ESCAPE_SEQUENCES[0] = "\\0";
  ESCAPE_SEQUENCES[7] = "\\a";
  ESCAPE_SEQUENCES[8] = "\\b";
  ESCAPE_SEQUENCES[9] = "\\t";
  ESCAPE_SEQUENCES[10] = "\\n";
  ESCAPE_SEQUENCES[11] = "\\v";
  ESCAPE_SEQUENCES[12] = "\\f";
  ESCAPE_SEQUENCES[13] = "\\r";
  ESCAPE_SEQUENCES[27] = "\\e";
  ESCAPE_SEQUENCES[34] = '\\"';
  ESCAPE_SEQUENCES[92] = "\\\\";
  ESCAPE_SEQUENCES[133] = "\\N";
  ESCAPE_SEQUENCES[160] = "\\_";
  ESCAPE_SEQUENCES[8232] = "\\L";
  ESCAPE_SEQUENCES[8233] = "\\P";
  const DEPRECATED_BOOLEANS_SYNTAX = [
    "y",
    "Y",
    "yes",
    "Yes",
    "YES",
    "on",
    "On",
    "ON",
    "n",
    "N",
    "no",
    "No",
    "NO",
    "off",
    "Off",
    "OFF"
  ];
  const DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
  function compileStyleMap(schema2, map2) {
    if (map2 === null) return {};
    const result = {};
    const keys = Object.keys(map2);
    for (let index = 0, length = keys.length; index < length; index += 1) {
      let tag = keys[index];
      let style = String(map2[tag]);
      if (tag.slice(0, 2) === "!!") {
        tag = "tag:yaml.org,2002:" + tag.slice(2);
      }
      const type2 = schema2.compiledTypeMap["fallback"][tag];
      if (type2 && _hasOwnProperty.call(type2.styleAliases, style)) {
        style = type2.styleAliases[style];
      }
      result[tag] = style;
    }
    return result;
  }
  function encodeHex(character) {
    let handle;
    let length;
    const string = character.toString(16).toUpperCase();
    if (character <= 255) {
      handle = "x";
      length = 2;
    } else if (character <= 65535) {
      handle = "u";
      length = 4;
    } else if (character <= 4294967295) {
      handle = "U";
      length = 8;
    } else {
      throw new YAMLException2("code point within a string may not be greater than 0xFFFFFFFF");
    }
    return "\\" + handle + common2.repeat("0", length - string.length) + string;
  }
  const QUOTING_TYPE_SINGLE = 1;
  const QUOTING_TYPE_DOUBLE = 2;
  function State(options) {
    this.schema = options["schema"] || DEFAULT_SCHEMA2;
    this.indent = Math.max(1, options["indent"] || 2);
    this.noArrayIndent = options["noArrayIndent"] || false;
    this.skipInvalid = options["skipInvalid"] || false;
    this.flowLevel = common2.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
    this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
    this.sortKeys = options["sortKeys"] || false;
    this.lineWidth = options["lineWidth"] || 80;
    this.noRefs = options["noRefs"] || false;
    this.noCompatMode = options["noCompatMode"] || false;
    this.condenseFlow = options["condenseFlow"] || false;
    this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
    this.forceQuotes = options["forceQuotes"] || false;
    this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
    this.implicitTypes = this.schema.compiledImplicit;
    this.explicitTypes = this.schema.compiledExplicit;
    this.tag = null;
    this.result = "";
    this.duplicates = [];
    this.usedDuplicates = null;
  }
  function indentString(string, spaces) {
    const ind = common2.repeat(" ", spaces);
    let position = 0;
    let result = "";
    const length = string.length;
    while (position < length) {
      let line;
      const next = string.indexOf("\n", position);
      if (next === -1) {
        line = string.slice(position);
        position = length;
      } else {
        line = string.slice(position, next + 1);
        position = next + 1;
      }
      if (line.length && line !== "\n") result += ind;
      result += line;
    }
    return result;
  }
  function generateNextLine(state, level) {
    return "\n" + common2.repeat(" ", state.indent * level);
  }
  function testImplicitResolving(state, str2) {
    for (let index = 0, length = state.implicitTypes.length; index < length; index += 1) {
      const type2 = state.implicitTypes[index];
      if (type2.resolve(str2)) {
        return true;
      }
    }
    return false;
  }
  function isWhitespace(c) {
    return c === CHAR_SPACE || c === CHAR_TAB;
  }
  function isPrintable(c) {
    return c >= 32 && c <= 126 || c >= 161 && c <= 55295 && c !== 8232 && c !== 8233 || c >= 57344 && c <= 65533 && c !== CHAR_BOM || c >= 65536 && c <= 1114111;
  }
  function isNsCharOrWhitespace(c) {
    return isPrintable(c) && c !== CHAR_BOM && // - b-char
    c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
  }
  function isPlainSafe(c, prev, inblock) {
    const cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
    const cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
    return (
      // ns-plain-safe
      (inblock ? cIsNsCharOrWhitespace : cIsNsCharOrWhitespace && // - c-flow-indicator
      c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && // ns-plain-char
      c !== CHAR_SHARP && // false on '#'
      !(prev === CHAR_COLON && !cIsNsChar) || // false on ': '
      isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || // change to true on '[^ ]#'
      prev === CHAR_COLON && cIsNsChar
    );
  }
  function isPlainSafeFirst(c) {
    return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && // - s-white
    // - (c-indicator ::=
    // “-” | “?” | “:” | “,” | “[” | “]” | “{” | “}”
    c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && // | “#” | “&” | “*” | “!” | “|” | “=” | “>” | “'” | “"”
    c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && // | “%” | “@” | “`”)
    c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
  }
  function isPlainSafeLast(c) {
    return !isWhitespace(c) && c !== CHAR_COLON;
  }
  function codePointAt(string, pos) {
    const first = string.charCodeAt(pos);
    let second;
    if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
      second = string.charCodeAt(pos + 1);
      if (second >= 56320 && second <= 57343) {
        return (first - 55296) * 1024 + second - 56320 + 65536;
      }
    }
    return first;
  }
  function needIndentIndicator(string) {
    const leadingSpaceRe = /^\n* /;
    return leadingSpaceRe.test(string);
  }
  const STYLE_PLAIN = 1;
  const STYLE_SINGLE = 2;
  const STYLE_LITERAL = 3;
  const STYLE_FOLDED = 4;
  const STYLE_DOUBLE = 5;
  function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
    let i;
    let char = 0;
    let prevChar = null;
    let hasLineBreak = false;
    let hasFoldableLine = false;
    const shouldTrackWidth = lineWidth !== -1;
    let previousLineBreak = -1;
    let plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
    if (singleLineOnly || forceQuotes) {
      for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
        char = codePointAt(string, i);
        if (!isPrintable(char)) {
          return STYLE_DOUBLE;
        }
        plain = plain && isPlainSafe(char, prevChar, inblock);
        prevChar = char;
      }
    } else {
      for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
        char = codePointAt(string, i);
        if (char === CHAR_LINE_FEED) {
          hasLineBreak = true;
          if (shouldTrackWidth) {
            hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
            i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
            previousLineBreak = i;
          }
        } else if (!isPrintable(char)) {
          return STYLE_DOUBLE;
        }
        plain = plain && isPlainSafe(char, prevChar, inblock);
        prevChar = char;
      }
      hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
    }
    if (!hasLineBreak && !hasFoldableLine) {
      if (plain && !forceQuotes && !testAmbiguousType(string)) {
        return STYLE_PLAIN;
      }
      return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
    }
    if (indentPerLevel > 9 && needIndentIndicator(string)) {
      return STYLE_DOUBLE;
    }
    if (!forceQuotes) {
      return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
    }
    return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  function writeScalar(state, string, level, iskey, inblock) {
    state.dump = (function() {
      if (string.length === 0) {
        return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
      }
      if (!state.noCompatMode) {
        if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
          return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
        }
      }
      const indent = state.indent * Math.max(1, level);
      const lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
      const singleLineOnly = iskey || // No block styles in flow mode.
      state.flowLevel > -1 && level >= state.flowLevel;
      function testAmbiguity(string2) {
        return testImplicitResolving(state, string2);
      }
      switch (chooseScalarStyle(
        string,
        singleLineOnly,
        state.indent,
        lineWidth,
        testAmbiguity,
        state.quotingType,
        state.forceQuotes && !iskey,
        inblock
      )) {
        case STYLE_PLAIN:
          return string;
        case STYLE_SINGLE:
          return "'" + string.replace(/'/g, "''") + "'";
        case STYLE_LITERAL:
          return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
        case STYLE_FOLDED:
          return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
        case STYLE_DOUBLE:
          return '"' + escapeString(string) + '"';
        default:
          throw new YAMLException2("impossible error: invalid scalar style");
      }
    })();
  }
  function blockHeader(string, indentPerLevel) {
    const indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
    const clip = string[string.length - 1] === "\n";
    const keep = clip && (string[string.length - 2] === "\n" || string === "\n");
    const chomp = keep ? "+" : clip ? "" : "-";
    return indentIndicator + chomp + "\n";
  }
  function dropEndingNewline(string) {
    return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
  }
  function foldString(string, width) {
    const lineRe = /(\n+)([^\n]*)/g;
    let result = (function() {
      let nextLF = string.indexOf("\n");
      nextLF = nextLF !== -1 ? nextLF : string.length;
      lineRe.lastIndex = nextLF;
      return foldLine(string.slice(0, nextLF), width);
    })();
    let prevMoreIndented = string[0] === "\n" || string[0] === " ";
    let moreIndented;
    let match;
    while (match = lineRe.exec(string)) {
      const prefix = match[1];
      const line = match[2];
      moreIndented = line[0] === " ";
      result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
      prevMoreIndented = moreIndented;
    }
    return result;
  }
  function foldLine(line, width) {
    if (line === "" || line[0] === " ") return line;
    const breakRe = / [^ ]/g;
    let match;
    let start = 0;
    let end;
    let curr = 0;
    let next = 0;
    let result = "";
    while (match = breakRe.exec(line)) {
      next = match.index;
      if (next - start > width) {
        end = curr > start ? curr : next;
        result += "\n" + line.slice(start, end);
        start = end + 1;
      }
      curr = next;
    }
    result += "\n";
    if (line.length - start > width && curr > start) {
      result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
    } else {
      result += line.slice(start);
    }
    return result.slice(1);
  }
  function escapeString(string) {
    let result = "";
    let char = 0;
    for (let i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      const escapeSeq = ESCAPE_SEQUENCES[char];
      if (!escapeSeq && isPrintable(char)) {
        result += string[i];
        if (char >= 65536) result += string[i + 1];
      } else {
        result += escapeSeq || encodeHex(char);
      }
    }
    return result;
  }
  function writeFlowSequence(state, level, object) {
    let _result = "";
    const _tag = state.tag;
    for (let index = 0, length = object.length; index < length; index += 1) {
      let value = object[index];
      if (state.replacer) {
        value = state.replacer.call(object, String(index), value);
      }
      if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
        if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
        _result += state.dump;
      }
    }
    state.tag = _tag;
    state.dump = "[" + _result + "]";
  }
  function writeBlockSequence(state, level, object, compact) {
    let _result = "";
    const _tag = state.tag;
    for (let index = 0, length = object.length; index < length; index += 1) {
      let value = object[index];
      if (state.replacer) {
        value = state.replacer.call(object, String(index), value);
      }
      if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
        if (!compact || _result !== "") {
          _result += generateNextLine(state, level);
        }
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          _result += "-";
        } else {
          _result += "- ";
        }
        _result += state.dump;
      }
    }
    state.tag = _tag;
    state.dump = _result || "[]";
  }
  function writeFlowMapping(state, level, object) {
    let _result = "";
    const _tag = state.tag;
    const objectKeyList = Object.keys(object);
    for (let index = 0, length = objectKeyList.length; index < length; index += 1) {
      let pairBuffer = "";
      if (_result !== "") pairBuffer += ", ";
      if (state.condenseFlow) pairBuffer += '"';
      const objectKey = objectKeyList[index];
      let objectValue = object[objectKey];
      if (state.replacer) {
        objectValue = state.replacer.call(object, objectKey, objectValue);
      }
      if (!writeNode(state, level, objectKey, false, false)) {
        continue;
      }
      if (state.dump.length > 1024) pairBuffer += "? ";
      pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
      if (!writeNode(state, level, objectValue, false, false)) {
        continue;
      }
      pairBuffer += state.dump;
      _result += pairBuffer;
    }
    state.tag = _tag;
    state.dump = "{" + _result + "}";
  }
  function writeBlockMapping(state, level, object, compact) {
    let _result = "";
    const _tag = state.tag;
    const objectKeyList = Object.keys(object);
    if (state.sortKeys === true) {
      objectKeyList.sort();
    } else if (typeof state.sortKeys === "function") {
      objectKeyList.sort(state.sortKeys);
    } else if (state.sortKeys) {
      throw new YAMLException2("sortKeys must be a boolean or a function");
    }
    for (let index = 0, length = objectKeyList.length; index < length; index += 1) {
      let pairBuffer = "";
      if (!compact || _result !== "") {
        pairBuffer += generateNextLine(state, level);
      }
      const objectKey = objectKeyList[index];
      let objectValue = object[objectKey];
      if (state.replacer) {
        objectValue = state.replacer.call(object, objectKey, objectValue);
      }
      if (!writeNode(state, level + 1, objectKey, true, true, true)) {
        continue;
      }
      const explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
      if (explicitPair) {
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          pairBuffer += "?";
        } else {
          pairBuffer += "? ";
        }
      }
      pairBuffer += state.dump;
      if (explicitPair) {
        pairBuffer += generateNextLine(state, level);
      }
      if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
        continue;
      }
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += ":";
      } else {
        pairBuffer += ": ";
      }
      pairBuffer += state.dump;
      _result += pairBuffer;
    }
    state.tag = _tag;
    state.dump = _result || "{}";
  }
  function detectType(state, object, explicit) {
    const typeList = explicit ? state.explicitTypes : state.implicitTypes;
    for (let index = 0, length = typeList.length; index < length; index += 1) {
      const type2 = typeList[index];
      if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object === "object" && object instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object))) {
        if (explicit) {
          if (type2.multi && type2.representName) {
            state.tag = type2.representName(object);
          } else {
            state.tag = type2.tag;
          }
        } else {
          state.tag = "?";
        }
        if (type2.represent) {
          const style = state.styleMap[type2.tag] || type2.defaultStyle;
          let _result;
          if (_toString.call(type2.represent) === "[object Function]") {
            _result = type2.represent(object, style);
          } else if (_hasOwnProperty.call(type2.represent, style)) {
            _result = type2.represent[style](object, style);
          } else {
            throw new YAMLException2("!<" + type2.tag + '> tag resolver accepts not "' + style + '" style');
          }
          state.dump = _result;
        }
        return true;
      }
    }
    return false;
  }
  function writeNode(state, level, object, block, compact, iskey, isblockseq) {
    state.tag = null;
    state.dump = object;
    if (!detectType(state, object, false)) {
      detectType(state, object, true);
    }
    const type2 = _toString.call(state.dump);
    const inblock = block;
    if (block) {
      block = state.flowLevel < 0 || state.flowLevel > level;
    }
    const objectOrArray = type2 === "[object Object]" || type2 === "[object Array]";
    let duplicateIndex;
    let duplicate;
    if (objectOrArray) {
      duplicateIndex = state.duplicates.indexOf(object);
      duplicate = duplicateIndex !== -1;
    }
    if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
      compact = false;
    }
    if (duplicate && state.usedDuplicates[duplicateIndex]) {
      state.dump = "*ref_" + duplicateIndex;
    } else {
      if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
        state.usedDuplicates[duplicateIndex] = true;
      }
      if (type2 === "[object Object]") {
        if (block && Object.keys(state.dump).length !== 0) {
          writeBlockMapping(state, level, state.dump, compact);
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + state.dump;
          }
        } else {
          writeFlowMapping(state, level, state.dump);
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + " " + state.dump;
          }
        }
      } else if (type2 === "[object Array]") {
        if (block && state.dump.length !== 0) {
          if (state.noArrayIndent && !isblockseq && level > 0) {
            writeBlockSequence(state, level - 1, state.dump, compact);
          } else {
            writeBlockSequence(state, level, state.dump, compact);
          }
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + state.dump;
          }
        } else {
          writeFlowSequence(state, level, state.dump);
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + " " + state.dump;
          }
        }
      } else if (type2 === "[object String]") {
        if (state.tag !== "?") {
          writeScalar(state, state.dump, level, iskey, inblock);
        }
      } else if (type2 === "[object Undefined]") {
        return false;
      } else {
        if (state.skipInvalid) return false;
        throw new YAMLException2("unacceptable kind of an object to dump " + type2);
      }
      if (state.tag !== null && state.tag !== "?") {
        let tagStr = encodeURI(
          state.tag[0] === "!" ? state.tag.slice(1) : state.tag
        ).replace(/!/g, "%21");
        if (state.tag[0] === "!") {
          tagStr = "!" + tagStr;
        } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
          tagStr = "!!" + tagStr.slice(18);
        } else {
          tagStr = "!<" + tagStr + ">";
        }
        state.dump = tagStr + " " + state.dump;
      }
    }
    return true;
  }
  function getDuplicateReferences(object, state) {
    const objects = [];
    const duplicatesIndexes = [];
    inspectNode(object, objects, duplicatesIndexes);
    const length = duplicatesIndexes.length;
    for (let index = 0; index < length; index += 1) {
      state.duplicates.push(objects[duplicatesIndexes[index]]);
    }
    state.usedDuplicates = new Array(length);
  }
  function inspectNode(object, objects, duplicatesIndexes) {
    if (object !== null && typeof object === "object") {
      const index = objects.indexOf(object);
      if (index !== -1) {
        if (duplicatesIndexes.indexOf(index) === -1) {
          duplicatesIndexes.push(index);
        }
      } else {
        objects.push(object);
        if (Array.isArray(object)) {
          for (let i = 0, length = object.length; i < length; i += 1) {
            inspectNode(object[i], objects, duplicatesIndexes);
          }
        } else {
          const objectKeyList = Object.keys(object);
          for (let i = 0, length = objectKeyList.length; i < length; i += 1) {
            inspectNode(object[objectKeyList[i]], objects, duplicatesIndexes);
          }
        }
      }
    }
  }
  function dump2(input, options) {
    options = options || {};
    const state = new State(options);
    if (!state.noRefs) getDuplicateReferences(input, state);
    let value = input;
    if (state.replacer) {
      value = state.replacer.call({ "": value }, "", value);
    }
    if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
    return "";
  }
  dumper.dump = dump2;
  return dumper;
}
var hasRequiredJsYaml;
function requireJsYaml() {
  if (hasRequiredJsYaml) return jsYaml;
  hasRequiredJsYaml = 1;
  const loader2 = requireLoader();
  const dumper2 = requireDumper();
  function renamed(from, to) {
    return function() {
      throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
    };
  }
  jsYaml.Type = requireType();
  jsYaml.Schema = requireSchema();
  jsYaml.FAILSAFE_SCHEMA = requireFailsafe();
  jsYaml.JSON_SCHEMA = requireJson();
  jsYaml.CORE_SCHEMA = requireCore();
  jsYaml.DEFAULT_SCHEMA = require_default();
  jsYaml.load = loader2.load;
  jsYaml.loadAll = loader2.loadAll;
  jsYaml.dump = dumper2.dump;
  jsYaml.YAMLException = requireException();
  jsYaml.types = {
    binary: requireBinary(),
    float: requireFloat(),
    map: requireMap(),
    null: require_null(),
    pairs: requirePairs(),
    set: requireSet(),
    timestamp: requireTimestamp(),
    bool: requireBool(),
    int: requireInt(),
    merge: requireMerge(),
    omap: requireOmap(),
    seq: requireSeq(),
    str: requireStr()
  };
  jsYaml.safeLoad = renamed("safeLoad", "load");
  jsYaml.safeLoadAll = renamed("safeLoadAll", "loadAll");
  jsYaml.safeDump = renamed("safeDump", "dump");
  return jsYaml;
}
var jsYamlExports = requireJsYaml();
const yaml = /* @__PURE__ */ getDefaultExportFromCjs(jsYamlExports);
const {
  Type,
  Schema,
  FAILSAFE_SCHEMA,
  JSON_SCHEMA,
  CORE_SCHEMA,
  DEFAULT_SCHEMA,
  load,
  loadAll,
  dump,
  YAMLException,
  types,
  safeLoad,
  safeLoadAll,
  safeDump
} = yaml;
export {
  API_PATHS as A,
  CLOUD_GATEWAY_URL_PREFIXES as C,
  ENV_OPENCODE_CONFIG_DIR as E,
  HILO_WORKSPACE_IDENTITY_HEADER as H,
  OPENCODE_RUNTIME_HOME_ENV as O,
  WORKSPACE_IDENTITY_MISMATCH_CODE as W,
  workspaceGatewayIdentityHeaders as a,
  workspaceGatewayIdentityEnv as b,
  HILO_WORKSPACE_IDENTITY_ENV as c,
  HILO_WORKSPACE_IDENTITY_QUERY as d,
  HILO_WORKSPACE_INSTANCE_QUERY as e,
  HILO_WORKSPACE_GENERATION_QUERY as f,
  getCloudGatewayUrl as g,
  WORKSPACE_IDENTITY_REQUIRED_CODE as h,
  isBenchmarkCompletionProven as i,
  hasNonAscii as j,
  redactModelAliasesForDisplay as k,
  HILO_HUB_BIZ_LINE as l,
  isTeamGroupLoadReason as m,
  normalizeWindowsJunctionTarget as n,
  openCodeRuntimeContractEnv as o,
  normalizeAdAttribution as p,
  isWorkspaceIdentityErrorCode as q,
  resolveSpawnPath as r,
  isAdAttributionApiUrl as s,
  trimWindowsEnvBlock as t,
  HILO_WORKSPACE_INSTANCE_ENV as u,
  HILO_WORKSPACE_GENERATION_ENV as v,
  windowsJunctionHash as w,
  openCodeDependencySatisfiedFiles as x,
  yaml as y,
  load as z
};
