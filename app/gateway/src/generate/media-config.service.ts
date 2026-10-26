import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { type Client, type MediaConfig, createClient, defaultMediaConfig, parseMediaConfig } from "@ov/maas-media";
import { FALLBACK_MODELS, FALLBACK_ONLY_SLOTS, withPlatformPreset } from "@ov/protocol";

import { GatewayConfig } from "../config/gateway-config.js";
import {
  type PlatformCatalog,
  CACHE_TTL_MS,
  catalogModelNames,
  defaultCapability,
  fetchPlatformCatalog,
  readCachedCatalog,
  keyDigest,
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
  /**
   * 缓存依据是**文件内容摘要**，不是 mtime。
   *
   * 只看 mtime 有真问题：NTFS 的时间粒度比 Linux 粗，用户在设置里极短时间连续保存两次
   * （典型就是换 key —— 两次内容长度一模一样）时，第二次写可能落回同一个 mtime，
   * gateway 就继续用旧配置。文件只有几百字节，每次 `load()` 读一遍走页缓存，
   * 代价可忽略，但"同毫秒、同大小、不同内容"能立刻认出来。
   */
  private cached?: { digest: string; value: MediaConfig };
  private catalog?: PlatformCatalog;
  /**
   * 这份目录属于谁。**换 key 必须认出旧目录**：目录是按令牌过滤过的，拿 A 的目录去
   * 校验 B 的调用，会让 B 看到它其实没有的模型（然后被平台拒）。磁盘缓存本来就按
   * 指纹分开存，内存这份没道理混用。
   */
  private catalogOwner?: { digest: string; baseUrl: string };
  /** 每次换归属就 +1；在飞的刷新回来时对不上就丢弃，别把旧 key 的目录写回来。 */
  private catalogGeneration = 0;
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
    let raw: string;
    try {
      raw = readFileSync(file, "utf8");
    } catch {
      return defaultMediaConfig();
    }
    const digest = createHash("sha256").update(raw).digest("hex");
    if (this.cached?.digest === digest) return this.cached.value;
    // 解析失败要抛出来：拿默认配置顶上会让每次生成都报"未配置"，真正的原因（JSON 写坏了）被藏住。
    const value = parseMediaConfig(withPlatformPreset(JSON.parse(raw)));
    this.cached = { digest, value };
    return value;
  }

  load(): MediaConfig {
    const config = this.base();
    const catalog = this.catalogFor(config);
    this.maybeRefreshCatalog(config);
    if (!catalog) {
      // 一份目录都没有（新装 / 离线 / 平台还没发 `/v1/ov`）：兜底表补全部空槽位，
      // 否则新用户的能力列表是空的、`/api/v3/execute` 直接 422。
      const models = { ...config.models };
      for (const [slot, model] of Object.entries(FALLBACK_MODELS)) {
        if (model && !models[slot as keyof typeof models]) models[slot as keyof typeof models] = model as never;
      }
      return { ...config, models };
    }
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
    // 目录里没有"超分"和"音乐编辑"这两个操作（`upscale` 只作为聚合流水线的一段存在，
    // `music_edit` 干脆不报），所以这三个槽位只能由兜底表补。**其余槽位一律以目录为准**：
    // 目录没给的（比如这个 key 没有 generate_image）就保持空，不能"目录没给却照样调用"。
    for (const slot of FALLBACK_ONLY_SLOTS) {
      const model = FALLBACK_MODELS[slot];
      if (model && !models[slot]) models[slot] = model as never;
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
    let config: MediaConfig;
    try {
      config = this.base();
    } catch {
      // 配置文件坏了：这时连平台地址都没有，读缓存也没有意义。
      return this.catalog ?? null;
    }
    const catalog = this.catalogFor(config);
    if (!catalog) {
      // 归属刚变过（`catalogFetchedAt` 被重置）：立刻去拉，别等 60 秒。
      this.maybeRefreshCatalog(config);
    }
    return catalog;
  }

  /**
   * 把内存里的目录对齐到"当前配置对应的那个账号"。
   *
   * 换 key / 换地址时：丢掉旧目录、读新 key 的磁盘缓存、把下一个刷新窗口提前到现在。
   */
  private catalogFor(config: MediaConfig): PlatformCatalog | null {
    const digest = keyDigest(config.platform.api_key);
    const baseUrl = config.platform.base_url;
    if (!this.catalogOwner || this.catalogOwner.digest !== digest || this.catalogOwner.baseUrl !== baseUrl) {
      this.catalogOwner = { digest, baseUrl };
      this.catalogGeneration += 1;
      // 旧 key 的刷新还在飞：它的结果会被 .then 里的代际判断丢掉，但 `catalogInFlight`
      // 仍然占着位置，新 key 的 `refresh()` 会直接返回那个旧 promise。这里一并清掉，
      // 让新 key 立即发起自己的那次。
      this.catalogInFlight = undefined;
      this.catalog = readCachedCatalog(this.dataDir(), config.platform.api_key) ?? undefined;
      this.catalogFetchedAt = 0;
      this.lastCatalogError = undefined;
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
    if (!this.catalog) {
      // 先把盘上的那份用起来：本次请求不等网络。
      this.catalog = readCachedCatalog(dataDir, config.platform.api_key) ?? undefined;
    }
    const generation = this.catalogGeneration;
    this.catalogInFlight = fetchPlatformCatalog(config, { dataDir })
      .then(({ catalog, error }) => {
        // 在飞期间换了 key：这份结果属于上一个账号，丢掉。
        if (generation !== this.catalogGeneration) return this.catalog ?? null;
        this.lastCatalogError = error;
        if (catalog) this.catalog = catalog;
        return this.catalog ?? null;
      })
      .finally(() => {
        // **只在同一代里收尾。** 换 key 之后，旧 key 这次刷新的 finally 不能把
        // `catalogFetchedAt` 写成"刚刚拉过"：那会让新 key 白等 60 秒才去拉目录
        // （`maybeRefreshCatalog` 就是拿这个时间判 TTL 的）。
        if (generation !== this.catalogGeneration) return;
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
