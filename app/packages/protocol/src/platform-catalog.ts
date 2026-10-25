// 平台能力目录的**共享形状与缓存文件格式**。
//
// 三个进程都要读它：gateway（拉取 + 用它补槽位）、主进程（拼 opencode 的 provider
// 配置）、渲染层（间接）。所以"文件长什么样、怎么算令牌指纹"放在这里只写一份 ——
// 各写一份的下场是两边的指纹算法差一点，谁也读不到谁写的缓存，而且不报错。
//
// 拉取（HTTP）不在这里：那是 gateway 的事，主进程不该为了读缓存去连平台。

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

/** 平台报的一条能力。字段与 new-api 的 `GET /v1/ov/capabilities` 一致。 */
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
  fetchedAt: string;
  /** `live` = 这次真的请求到了；`cache` = 平台不可达，用的是上次的。 */
  source: "live" | "cache";
}

/** 缓存文件名。放在数据根下，gateway 写、主进程读。 */
export const PLATFORM_CATALOG_FILE = "ov-catalog.json";

export function platformCatalogPath(dataDir: string): string {
  return path.join(dataDir, PLATFORM_CATALOG_FILE);
}

/** 令牌指纹：只进哈希，用来给缓存分组，不落明文。 */
export function platformKeyDigest(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
}

interface CacheFile {
  keys?: Record<string, PlatformCatalog>;
}

/**
 * 读某个令牌那份缓存。读不到 / 形状不对都返回 `null` —— 第一次启动本来就没有，
 * 缓存坏了也不该让调用方崩。
 */
export function readPlatformCatalogCache(dataDir: string, apiKey: string): PlatformCatalog | null {
  try {
    const raw = JSON.parse(readFileSync(platformCatalogPath(dataDir), "utf8")) as CacheFile;
    const entry = raw?.keys?.[platformKeyDigest(apiKey)];
    if (!entry || typeof entry.version !== "string" || !Array.isArray(entry.capabilities)) return null;
    return { ...entry, source: "cache" };
  } catch {
    return null;
  }
}
