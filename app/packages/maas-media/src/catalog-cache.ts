// 平台能力目录的**缓存文件读写**（Node 环境）。
//
// 类型在 `@ov/protocol`（那边要能被浏览器打包）；文件格式和令牌指纹放在这里，
// 因为读它的是 Node 侧的两个进程：gateway（写 + 读）和主进程（读，用来拼
// opencode 的模型列表）。各写一份的下场是两边的指纹算法差一点，谁也读不到谁写的，
// 而且不报错。

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * 缓存文件的形状。**故意不用 `@ov/protocol` 的类型**：这个包不知道 MiniMax Design 的
 * 存在（见 `index.ts` 顶部），只认"一份带 version 的 JSON"这个最小约定。调用方给了
 * 类型参数就按它的类型读回来。
 */
export interface CachedCatalog {
  version: string;
  capabilities: unknown[];
  fetchedAt: string;
  source: "live" | "cache";
}

/** 缓存文件名（与 `@ov/protocol` 的 `PLATFORM_CATALOG_FILE` 是同一个值）。 */
const CACHE_FILE = "ov-catalog.json";

export function platformCatalogPath(dataDir: string): string {
  return path.join(dataDir, CACHE_FILE);
}

/** 令牌指纹：只进哈希，用来给缓存分组，不落明文。 */
export function platformKeyDigest(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
}

interface CacheFile {
  keys?: Record<string, CachedCatalog>;
}

/**
 * 读某个令牌那份缓存。读不到 / 形状不对都返回 `null` —— 第一次启动本来就没有，
 * 缓存坏了也不该让调用方崩。
 */
export function readPlatformCatalogCache<T extends CachedCatalog = CachedCatalog>(dataDir: string, apiKey: string): T | null {
  try {
    const raw = JSON.parse(readFileSync(platformCatalogPath(dataDir), "utf8")) as CacheFile;
    const entry = raw?.keys?.[platformKeyDigest(apiKey)];
    if (!entry || typeof entry.version !== "string" || !Array.isArray(entry.capabilities)) return null;
    return { ...entry, source: "cache" } as T;
  } catch {
    return null;
  }
}

/** 写回某个令牌那份（gateway 拉到新目录时调用）。失败不抛：目录已经在内存里了。 */
export function writePlatformCatalogCache(dataDir: string, apiKey: string, catalog: CachedCatalog): void {
  try {
    const file = platformCatalogPath(dataDir);
    let existing: CacheFile = {};
    try {
      existing = JSON.parse(readFileSync(file, "utf8")) as CacheFile;
    } catch {
      existing = {};
    }
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(file, JSON.stringify({ keys: { ...(existing.keys ?? {}), [platformKeyDigest(apiKey)]: { ...catalog, source: "live" } } }));
  } catch {
    // 落盘失败不影响本次使用。
  }
}
