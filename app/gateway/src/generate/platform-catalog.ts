/**
 * 平台能力目录（`GET /v1/ov/capabilities`）的客户端缓存。
 *
 * # 为什么要缓存到盘上
 *
 * 目录决定"用户能选哪些模型、每个模型有哪些参数"。平台不可达时如果直接退回
 * "没有模型"，表现是设置页一片「未启用」、模型按钮空着 —— 而用户什么都没改。
 * 用上一次拿到的目录顶上，界面保持原样，只有生成会失败（并且失败原因说得清）。
 *
 * # 为什么按令牌指纹分文件
 *
 * 目录是**按 key 过滤过的**：A 的令牌能调到的模型和 B 的可能不一样。两个 key 共用
 * 一份缓存会让 B 看到 A 的模型，然后调用被拒。指纹只存哈希，不存 key 本身。
 *
 * `version` 是平台算的内容哈希：它没变就不用重新渲染，变了才更新选择器。
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { MediaConfig } from "@ov/maas-media";

/** 平台报的一条能力。字段与 `GET /v1/ov/capabilities` 一致（见 new-api 的 service/ovcaps）。 */
export interface PlatformCapability {
  id: string;
  operation: "generate_image" | "generate_video" | "generate_speech" | "generate_music" | "transcribe" | "chat" | "upscale" | "edit_media";
  model: string;
  displayName?: { zh?: string; en?: string };
  description?: { zh?: string; en?: string };
  transport?: { kind?: string };
  taskTypes?: string[];
  paramSchema?: { type?: string; properties?: Record<string, PlatformParam> };
  limits?: { maxReferenceImages?: number; maxDurationSeconds?: number; maxInputBytes?: number };
  default?: boolean;
}

export interface PlatformParam {
  type?: string;
  enum?: string[];
  default?: string | number;
  title?: string;
  minimum?: number;
  maximum?: number;
}

export interface PlatformCatalog {
  version: string;
  capabilities: PlatformCapability[];
  /** 什么时候拿到的。用于判断要不要刷新，以及界面上"目录来自缓存"的说明。 */
  fetchedAt: string;
  /** `live` = 这次真的请求到了；`cache` = 平台不可达，用的是上次的。 */
  source: "live" | "cache";
}

const CACHE_TTL_MS = 60_000;
const CACHE_FILE = "ov-catalog.json";

/** 目录服务的地址：`<base_url 去掉 /v1>/v1/ov/capabilities`。 */
export function catalogUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  const root = trimmed.endsWith("/v1") ? trimmed.slice(0, -3) : trimmed;
  return `${root}/v1/ov/capabilities`;
}

/** 令牌指纹：只进去哈希，用来给缓存文件分目录，不落明文。 */
export function keyDigest(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
}

export function cachePath(dataDir: string): string {
  return path.join(dataDir, CACHE_FILE);
}

/** 这个平台的目录值不值得请求：没有地址或没有 key 时请求一定失败，别每 60 秒打一次。 */
function fetchable(cfg: MediaConfig): boolean {
  return Boolean(cfg.platform.base_url.trim()) && Boolean(cfg.platform.api_key.trim());
}

interface CacheFile {
  /** 按令牌指纹分组：同一个目录文件里存多个 key 的结果。 */
  keys?: Record<string, PlatformCatalog>;
}

/**
 * 读上次落盘的目录。**读不到就是 null**，不抛错 —— 第一次启动本来就没有。
 */
export function readCachedCatalog(dataDir: string, digest: string): PlatformCatalog | null {
  try {
    const raw = JSON.parse(readFileSync(cachePath(dataDir), "utf8")) as CacheFile;
    const entry = raw?.keys?.[digest];
    if (!entry || typeof entry.version !== "string" || !Array.isArray(entry.capabilities)) return null;
    return { ...entry, source: "cache" };
  } catch {
    return null;
  }
}

function writeCachedCatalog(dataDir: string, digest: string, catalog: PlatformCatalog): void {
  try {
    mkdirSync(dataDir, { recursive: true });
    let existing: CacheFile = {};
    try {
      existing = JSON.parse(readFileSync(cachePath(dataDir), "utf8")) as CacheFile;
    } catch {
      existing = {};
    }
    const keys = { ...(existing.keys ?? {}), [digest]: { ...catalog, source: "live" as const } };
    writeFileSync(cachePath(dataDir), JSON.stringify({ keys }));
  } catch {
    // 落盘失败不影响本次使用：目录已经在内存里了。
  }
}

export interface CatalogOptions {
  dataDir: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface CatalogResult {
  catalog: PlatformCatalog | null;
  /** 平台那一步失败的原因；`live` 成功时为 undefined。 */
  error?: string;
}

/** 请求平台目录。失败不抛错 —— 调用方要的是"有没有目录"，不是异常。 */
export async function fetchPlatformCatalog(cfg: MediaConfig, options: CatalogOptions): Promise<CatalogResult> {
  if (!fetchable(cfg)) return { catalog: null, error: "platform not configured" };
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
  try {
    const response = await doFetch(catalogUrl(cfg.platform.base_url), {
      headers: { Authorization: `Bearer ${cfg.platform.api_key}` },
      signal: controller.signal,
    });
    if (!response.ok) return { catalog: null, error: `HTTP ${response.status}` };
    const payload = (await response.json()) as { version?: unknown; capabilities?: unknown };
    if (typeof payload.version !== "string" || !Array.isArray(payload.capabilities)) {
      return { catalog: null, error: "unexpected response shape" };
    }
    const catalog: PlatformCatalog = {
      version: payload.version,
      capabilities: payload.capabilities.filter(isCapability),
      fetchedAt: new Date().toISOString(),
      source: "live",
    };
    writeCachedCatalog(options.dataDir, keyDigest(cfg.platform.api_key), catalog);
    return { catalog };
  } catch (error) {
    return { catalog: null, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 一条能力的最小校验。**只丢弃看不懂的那一条**，不整份拒绝 ——
 * 平台加一个我们还不认识的操作类型时，其余模型照样能用。
 */
function isCapability(value: unknown): value is PlatformCapability {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.model === "string" && item.model.trim() !== "" && typeof item.operation === "string";
}

/** 某个操作下标了 `default` 的那条，没有就取第一条。 */
export function defaultCapability(catalog: PlatformCatalog | null, operation: PlatformCapability["operation"]): PlatformCapability | undefined {
  if (!catalog) return undefined;
  const matching = catalog.capabilities.filter((item) => item.operation === operation);
  return matching.find((item) => item.default === true) ?? matching[0];
}

/** 目录里所有模型名。给 `route()` 的直通判定用。 */
export function catalogModelNames(catalog: PlatformCatalog | null): string[] {
  if (!catalog) return [];
  return [...new Set(catalog.capabilities.map((item) => item.model))];
}

export { CACHE_TTL_MS };
