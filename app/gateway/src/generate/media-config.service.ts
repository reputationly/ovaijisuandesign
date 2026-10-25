import { readFileSync, statSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { type Client, type MediaConfig, createClient, defaultMediaConfig, parseMediaConfig } from "@ov/maas-media";
import { withPlatformPreset } from "@ov/protocol";

import { GatewayConfig } from "../config/gateway-config.js";
import {
  type PlatformCatalog,
  CACHE_TTL_MS,
  catalogModelNames,
  defaultCapability,
  fetchPlatformCatalog,
  keyDigest,
  readCachedCatalog,
} from "./platform-catalog.js";

/**
 * 平台与模型配置。文件由主进程管理（设置页改的就是它），gateway 只读；
 * 按 mtime 缓存 —— 用户在设置里换了令牌，下一次生成就该用新的，不用重启。
 * 没写进文件的地址 / 模型用产品预设补全（见 `@ov/protocol` 的 `withPlatformPreset`），
 * 和主进程读出来的口径一致。
 *
 * # 平台目录（L-1）
 *
 * 产品不再硬编码模型名：**目录里有就用目录的**。`load()` 仍是同步的（几十个调用点），
 * 所以目录由 `refreshCatalog()` 在后台取，取到之后下一次 `load()` 就能看到。
 * 平台不可达时用上次落盘的那份（`platform-catalog.ts` 里有理由）。
 */
@Injectable()
export class MediaConfigService {
  private cached?: { mtimeMs: number; value: MediaConfig };
  private catalog?: PlatformCatalog;
  private catalogFetchedAt = 0;
  private catalogInFlight?: Promise<PlatformCatalog | null>;
  private lastCatalogError?: string;
  /** 测试里换掉 sleep / fetch，免得每次轮询真等 5 秒。 */
  clientOverrides: Partial<Client> = {};

  constructor(private readonly cfg: GatewayConfig) {}

  /** 文件里那份配置（未叠加目录）。目录里的取值在 {@link load} 里叠加。 */
  private base(): MediaConfig {
    const file = this.cfg.mediaConfigPath;
    if (!file) return defaultMediaConfig();
    let mtimeMs: number;
    try {
      mtimeMs = statSync(file).mtimeMs;
    } catch {
      return defaultMediaConfig();
    }
    if (this.cached?.mtimeMs === mtimeMs) return this.cached.value;
    // 解析失败要抛出来：拿默认配置顶上会让每次生成都报"未配置"，真正的原因（JSON 写坏了）被藏住。
    const value = parseMediaConfig(withPlatformPreset(JSON.parse(readFileSync(file, "utf8"))));
    this.cached = { mtimeMs, value };
    return value;
  }

  load(): MediaConfig {
    const config = this.base();
    this.maybeRefreshCatalog(config);
    const catalog = this.catalog;
    if (!catalog) return config;
    // 空着的槽位用目录的默认项补上：产品预设不再写死模型名，而这些槽位还有别的
    // 读处（超分、写说明/歌词、对话模型），它们不该因为"没配"而失效。
    const models = { ...config.models };
    const fill = <K extends keyof typeof models>(slot: K, operation: Parameters<typeof defaultCapability>[1]) => {
      if (models[slot]) return;
      const capability = defaultCapability(catalog, operation);
      if (capability) models[slot] = capability.model as never;
    };
    fill("image", "generate_image");
    fill("video", "generate_video");
    fill("music", "generate_music");
    fill("speech", "generate_speech");
    fill("image_upscale", "upscale");
    fill("video_upscale", "upscale");
    // 帧族 / 参考族是两个 checkpoint，目录把它们报成两条；槽位只能各放一个。
    // 按 `taskTypes` 分：带 `r2va` 的是参考族。**分不出来就留空** —— 硬塞一个会让
    // 参考生视频打到帧族模型上（平台会拒），看起来像模型坏了。
    if (!models.video_ref) {
      const ref = catalog.capabilities.find((item) => item.operation === "generate_video" && (item.taskTypes ?? []).includes("r2va"));
      if (ref) models.video_ref = ref.model;
    }
    if (!models.image_edit) {
      const edit = catalog.capabilities.find((item) => item.operation === "generate_image" && (item.limits?.maxReferenceImages ?? 0) > 0);
      if (edit) models.image_edit = edit.model;
    }
    models.known = catalogModelNames(catalog);
    return { ...config, models };
  }

  /**
   * 当前生效的目录（可能来自缓存）。`null` = 还没拿到过。
   *
   * 第一次调用时先从盘上读一次：有些调用方（运行时模型列表）只读目录、不会先
   * 走一遍 `load()`，而"读不到目录"和"还没人拉过"对它们是两种不同的处境。
   */
  currentCatalog(): PlatformCatalog | null {
    if (!this.catalog) {
      try {
        this.catalog = readCachedCatalog(this.dataDir(), keyDigest(this.base().platform.api_key)) ?? undefined;
      } catch {
        // 配置文件坏了：这时连平台地址都没有，读缓存也没有意义。
      }
    }
    return this.catalog ?? null;
  }

  lastCatalogFailure(): string | undefined {
    return this.lastCatalogError;
  }

  /** 立刻刷新一次（测试与设置页保存后用）。 */
  async refreshCatalogNow(): Promise<PlatformCatalog | null> {
    return this.refresh(this.base());
  }

  private maybeRefreshCatalog(config: MediaConfig): void {
    if (this.catalogInFlight) return;
    if (Date.now() - this.catalogFetchedAt < CACHE_TTL_MS) return;
    void this.refresh(config);
  }

  private refresh(config: MediaConfig): Promise<PlatformCatalog | null> {
    if (this.catalogInFlight) return this.catalogInFlight;
    const dataDir = this.dataDir();
    const digest = keyDigest(config.platform.api_key);
    if (!this.catalog) {
      // 先把盘上的那份用起来：本次请求不等网络。
      this.catalog = readCachedCatalog(dataDir, digest) ?? undefined;
    }
    this.catalogInFlight = fetchPlatformCatalog(config, { dataDir })
      .then(({ catalog, error }) => {
        this.lastCatalogError = error;
        if (catalog) this.catalog = catalog;
        return this.catalog ?? null;
      })
      .finally(() => {
        this.catalogFetchedAt = Date.now();
        this.catalogInFlight = undefined;
      });
    return this.catalogInFlight;
  }

  private dataDir(): string {
    return process.env.HILO_DATA_DIR?.trim() || path.dirname(this.cfg.mediaConfigPath ?? ".") || ".";
  }

  client(onTaskSubmitted?: (taskId: string) => void): Client {
    return createClient({ ...this.clientOverrides, ...(onTaskSubmitted ? { onTaskSubmitted } : {}) });
  }
}
