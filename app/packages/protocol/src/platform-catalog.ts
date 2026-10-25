// 平台能力目录的**共享形状**。
//
// 三个进程都要用它：gateway 拉取、主进程拼 opencode 配置、渲染层间接。所以类型放在
// 这里只写一份 —— 各写一份的下场是字段名漂移，而漂移的症状是"某个模型的参数不见了"。
//
// **这里只能放类型和纯字符串**：`@ov/protocol` 也会被渲染层打进浏览器包，
// 引 `node:fs` / `node:crypto` 会让 vite 构建直接失败（实测：
// `"createHash" is not exported by "__vite-browser-external"`）。
// 缓存文件怎么读写在 `@ov/maas-media` 的 `catalog-cache.ts` 里（那边是 Node 环境）。

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

/** 缓存文件名。放在应用数据根下，gateway 写、主进程读。 */
export const PLATFORM_CATALOG_FILE = "ov-catalog.json";
