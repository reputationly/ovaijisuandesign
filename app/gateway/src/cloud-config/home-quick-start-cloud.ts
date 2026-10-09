/**
 * 首页「创作灵感」的云端配置（quick_start_config v2）本地版。
 *
 * 数据源是 `assets/home-showcase/quick-start-config-v2.json` —— 官方云端
 * `GET /api/v1/home/quick_start_config?config_version=2` 的完整响应原文（8 个分区 / 165 条示例，
 * 提取自官方 3.0.21 应用的磁盘缓存，见 assets/home-showcase/README.md）。接口形状与云端一致，
 * 渲染层走的就是官方那份解析逻辑，替代 home-showcase.ts 里手写的 4 场景兜底配置。
 *
 * 素材本地化策略（2026-10-02 定）：
 * - **图片**（type==="image" 的附件 + 封面 `outputs[].cover`，452 个 URL，484MB）：
 *   下载到 `assets/home-showcase/media/`（gitignored，脚本 `scripts/fetch-home-showcase-images.py`），
 *   配置里的地址重写成网关的 `showcase-assets/:key` 静态路由；本地还没下载时 302 回 CDN。
 * - **媒体**（video / audio 附件 + `outputs[].video`，318 个 URL，~6.9GB）：不本地化，保持 CDN 原地址，
 *   渲染层直接按它自己的 CDN 白名单拉流（和官方在线行为一致）。
 * - 提示词 / 描述文本里的 URL（比如某条示例里的 B 站链接）原样保留，不参与重写。
 *
 * key 的派生规则 `showcaseAssetKey()` 必须和 Python 脚本逐字一致：
 * `<sha1(url) 前 16 位>-<文件名（安全字符替换后）>`；
 * 一致性由 `media-manifest.json`（脚本生成入库）与本模块派生结果的对账测试保证。
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { homeShowcaseAssetUrl, homeShowcaseDir } from "./home-showcase.js";

const UNSAFE_FILENAME = /[^A-Za-z0-9._-]/g;

/** 静态路由 key：全局唯一（带 url 哈希前缀），和 legacy 8 个中文文件名不冲突。 */
export function showcaseAssetKey(url: string): string {
  const name = (url.split("/").pop() ?? "").replace(UNSAFE_FILENAME, "_") || "unnamed";
  return `${createHash("sha1").update(url).digest("hex").slice(0, 16)}-${name}`;
}

/** {domestic, overseas} 或纯字符串，统一展平成 URL 列表。 */
const urlValues = (field: unknown): string[] => {
  if (typeof field === "string") return [field];
  if (field && typeof field === "object") {
    return Object.values(field as Record<string, unknown>).filter((v): v is string => typeof v === "string");
  }
  return [];
};

type AnyRecord = Record<string, any>;

/**
 * 按字段路径精确收集素材 URL —— 和 `scripts/fetch-home-showcase-images.py` 的
 * `collect_media_urls()` 走同一套路径约定：
 * - 图片（本地化）：`sections[].items[].attachments[]` 里 type==="image" 的 url、
 *   `sections[].items[].outputs[].cover`
 * - 媒体（保持 CDN）：type!=="image" 的附件（video / audio，渲染层直接按 CDN 白名单拉）、
 *   `sections[].items[].outputs[].video`
 */
export function collectShowcaseAssets(config: AnyRecord): { images: string[]; media: string[] } {
  const images = new Set<string>();
  const media = new Set<string>();
  for (const section of config.sections ?? []) {
    for (const item of section.items ?? []) {
      for (const att of item.attachments ?? []) {
        const urls = att?.type === "image" ? images : media;
        for (const url of urlValues(att?.url)) urls.add(url);
      }
      for (const out of item.outputs ?? []) {
        for (const url of urlValues(out?.cover)) images.add(url);
        for (const url of urlValues(out?.video)) media.add(url);
      }
    }
  }
  return { images: [...images], media: [...media] };
}

/**
 * 重写一个 url 字段，每个 URL 各自映射自己的本地文件（domestic / overseas 是各自区域的内容，
 * 不共享；两份都已经下载）。纯字符串原样换成本地地址。
 */
function localizeUrlField(field: unknown): unknown {
  if (typeof field === "string") {
    return homeShowcaseAssetUrl(showcaseAssetKey(field));
  }
  if (field && typeof field === "object") {
    const out: Record<string, string> = {};
    for (const [region, url] of Object.entries(field as Record<string, unknown>)) {
      if (typeof url === "string") out[region] = homeShowcaseAssetUrl(showcaseAssetKey(url));
    }
    return out;
  }
  return field;
}

/**
 * 把配置里的图片地址全部换成本地静态路由；video / audio 附件、输出视频和文本不动。
 * 纯函数，直接在原文上深拷贝后改。
 */
export function rewriteShowcaseConfig(config: AnyRecord): AnyRecord {
  const out = structuredClone(config);
  for (const section of out.sections ?? []) {
    for (const item of section.items ?? []) {
      for (const att of item.attachments ?? []) {
        // 只有图片附件本地化；video / audio 附件保持 CDN（渲染层按白名单直接拉）。
        if (att?.type === "image" && att.url !== undefined) att.url = localizeUrlField(att.url);
      }
      for (const outItem of item.outputs ?? []) {
        if (outItem?.cover !== undefined) outItem.cover = localizeUrlField(outItem.cover);
      }
    }
  }
  return out;
}

export interface ShowcaseCloudConfig {
  /** 重写后的配置（图片地址已指到本地静态路由）。 */
  config: AnyRecord;
  /** 静态路由 key → CDN 原地址。key 不在表里一律 404，不拿请求参数拼路径。 */
  mediaKeys: Map<string, string>;
  /** 保持 CDN 的媒体 URL 数（video / audio 附件 + 输出视频）。 */
  mediaCount: number;
  /**
   * 封面图，按首页显示顺序，每项是 `{key, cdnUrl}`。
   * 首启预热按这个顺序取前 N 个（见 showcase-warm.ts）。
   */
  covers: { key: string; cdnUrl: string }[];
}

/**
 * 按**首页实际显示顺序**列出封面图 URL：section 顺序 → item 顺序 → outputs 顺序。
 *
 * 首启预热（showcase-warm.ts）只预热这个列表的前 N 个，而不是整个 452 张 ——
 * 那是用户打开首页第一屏会看到的顺序，预热别的等于替用户猜他往哪滚。
 *
 * 每个 cover 是 `{domestic, overseas}`：**两个都收**。gateway 这边没有"当前区域"这个概念
 * （区域是平台配置里的事，不在这里），只挑一个就有一半用户看到的是 302。
 * `urlValues` 的顺序是 `Object.values`，先 domestic 后 overseas，所以前 N 个自然覆盖到。
 */
export function showcaseCoverUrlsInOrder(config: AnyRecord): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const section of config.sections ?? []) {
    for (const item of section.items ?? []) {
      for (const outItem of item.outputs ?? []) {
        for (const url of urlValues(outItem?.cover)) {
          if (seen.has(url)) continue;
          seen.add(url);
          out.push(url);
        }
      }
    }
  }
  return out;
}

/**
 * 暂时不提供的分区（2026-10 定：「工具互联」依赖的连接器能力还没有）。整块去掉：分类标签、NEW 角标、
 * 「精选」里来自它的示例、它的封面预热。原文 JSON 不动，把 id 从这里删掉就恢复。
 */
export const HIDDEN_SHOWCASE_SECTION_IDS: readonly string[] = ["tool-integration"];

/** 去掉隐藏分区，以及它在 showcase.tabs 里的页签（NEW 角标挂在页签上）。不改入参。 */
export function withoutHiddenShowcaseSections(raw: AnyRecord): AnyRecord {
  const hidden = new Set(HIDDEN_SHOWCASE_SECTION_IDS);
  const sections = (raw.sections ?? []).filter((s: AnyRecord) => !hidden.has(String(s?.id)));
  const showcase =
    raw.showcase && typeof raw.showcase === "object"
      ? { ...raw.showcase, tabs: Object.fromEntries(Object.entries(raw.showcase.tabs ?? {}).filter(([id]) => !hidden.has(id))) }
      : raw.showcase;
  return { ...raw, sections, showcase };
}

let cached: ShowcaseCloudConfig | undefined;

/**
 * 加载云端配置原文并做本地化重写；进程内缓存一份。
 * 找不到原文（发布包漏拷 / 仓库不完整）时抛错，由调用方决定兜底。
 */
export function loadShowcaseCloudConfig(): ShowcaseCloudConfig {
  if (cached) return cached;
  const dir = homeShowcaseDir();
  if (!dir) throw new Error("找不到 home-showcase 目录（assets/ 或 resources/ 下都试过了）");
  const raw = JSON.parse(readFileSync(path.join(dir, "quick-start-config-v2.json"), "utf8")) as AnyRecord;
  // 之后的配置、素材登记表、封面预热都只用过滤后的原文：隐藏分区的素材不下载、不登记、不预热。
  const visible = withoutHiddenShowcaseSections(raw);
  const { images, media } = collectShowcaseAssets(visible);
  const mediaKeys = new Map(images.map((url) => [showcaseAssetKey(url), url]));
  // 同一 URL 的 domestic/overseas 是镜像，key 不同（URL 不同）、内容各自一份，都下载。
  const covers = showcaseCoverUrlsInOrder(visible).map((url) => ({ key: showcaseAssetKey(url), cdnUrl: url }));
  cached = { config: rewriteShowcaseConfig(visible), mediaKeys, mediaCount: media.length, covers };
  return cached;
}

/** 首页封面图（按显示顺序）。首启预热用；拿不到配置时返回空数组而不是抛 —— 预热是锦上添花。 */
export function showcaseCovers(): { key: string; cdnUrl: string }[] {
  try {
    return loadShowcaseCloudConfig().covers;
  } catch {
    return [];
  }
}

/** 静态路由用：key → CDN 原地址；不在登记表里返回 undefined（调用方 404）。 */
export function showcaseMediaEntry(key: string): { cdnUrl: string } | undefined {
  const url = loadShowcaseCloudConfig().mediaKeys.get(key);
  return url ? { cdnUrl: url } : undefined;
}
