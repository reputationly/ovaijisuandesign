import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  collectShowcaseAssets,
  loadShowcaseCloudConfig,
  rewriteShowcaseConfig,
  showcaseAssetKey,
} from "./home-quick-start-cloud.js";
import { HOME_SHOWCASE_ASSET_ROUTE, homeShowcaseAssetUrl } from "./home-showcase.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const CONFIG_PATH = path.join(REPO, "assets/home-showcase/quick-start-config-v2.json");
const MANIFEST_PATH = path.join(REPO, "assets/home-showcase/media-manifest.json");
const MEDIA_DIR = path.join(REPO, "assets/home-showcase/media");

const rawConfig = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Record<string, any>;

describe("创作灵感云端配置（quick_start_config v2 本地版）", () => {
  it("素材收集：452 张图片、318 个 CDN 媒体（video/audio 附件 + 输出视频，和下载脚本的口径一致）", () => {
    const { images, media } = collectShowcaseAssets(rawConfig);
    expect(images).toHaveLength(452);
    expect(media).toHaveLength(318);
    // 图片全部来自官方 CDN 白名单；媒体同理。
    for (const url of [...images, ...media]) {
      expect(url).toMatch(/^https:\/\/cdn\.hailuoai\.(com|video)\/|^https:\/\/cdn\.hailuo\.ai\//);
    }
  });

  it("key 派生规则与下载脚本一致：media-manifest.json 和 TS 侧逐项对上", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Record<string, { url: string; bytes: number | null }>;
    const { images } = collectShowcaseAssets(rawConfig);
    const derived = new Map(images.map((url) => [showcaseAssetKey(url), url]));
    expect(derived.size).toBe(Object.keys(manifest).length);
    for (const [key, entry] of Object.entries(manifest)) {
      expect(derived.get(key), `manifest 里的 key ${key} 应该能从配置原文派生出来`).toBe(entry.url);
    }
    // 反向也对：派生出来的每一个 key 都在 manifest 里。
    for (const key of derived.keys()) {
      expect(manifest[key], `派生 key ${key} 不在 manifest 里，脚本和 TS 的收集口径漂了`).toBeTruthy();
    }
  });

  it("重写：图片指到 showcase-assets 静态路由，视频和提示词文本保持原样", () => {
    const rewritten = rewriteShowcaseConfig(rawConfig);
    const itemsOf = (cfg: any) => cfg.sections.flatMap((s: any) => s.items);

    // 附件重写：找一条带**图片**附件的示例（video / audio 附件保持 CDN，不算）。
    const withAtt = itemsOf(rawConfig).find((it: any) => it.attachments?.some((a: any) => a.type === "image"));
    expect(withAtt).toBeTruthy();
    const gotAtt = itemsOf(rewritten).find((it: any) => it.id === withAtt.id);
    const att = gotAtt.attachments.find((a: any) => a.type === "image");
    expect(att.url.domestic).toMatch(new RegExp(`^/${HOME_SHOWCASE_ASSET_ROUTE}/[A-Za-z0-9._-]+$`));
    expect(att.url.overseas).toMatch(new RegExp(`^/${HOME_SHOWCASE_ASSET_ROUTE}/`));
    const originalAtt = withAtt.attachments.find((a: any) => a.type === "image");
    expect(decodeURIComponent(att.url.domestic.split("/").pop()!)).toBe(showcaseAssetKey(originalAtt.url.domestic));
    expect(decodeURIComponent(att.url.overseas.split("/").pop()!)).toBe(showcaseAssetKey(originalAtt.url.overseas));
    expect(att.url.domestic).not.toBe(att.url.overseas); // 两个 URL 不同 → key 不同

    // video / audio 附件保持 CDN 原地址。
    const withMediaAtt = itemsOf(rawConfig).find((it: any) => it.attachments?.some((a: any) => a.type !== "image"));
    if (withMediaAtt) {
      const gotMedia = itemsOf(rewritten).find((it: any) => it.id === withMediaAtt.id);
      for (const a of gotMedia.attachments.filter((x: any) => x.type !== "image")) {
        expect(a.url).toEqual(withMediaAtt.attachments.find((x: any) => x.name === a.name && x.type === a.type).url);
      }
    }

    // 封面 / 视频重写：找一条带视频输出的示例。
    const withVideo = itemsOf(rawConfig).find((it: any) => it.outputs?.some((o: any) => o.video));
    expect(withVideo).toBeTruthy();
    const got = itemsOf(rewritten).find((it: any) => it.id === withVideo.id);
    const cover = got.outputs[0].cover;
    expect(cover.domestic).toMatch(new RegExp(`^/${HOME_SHOWCASE_ASSET_ROUTE}/`));
    // 视频：保持 CDN 原地址（渲染层自己按白名单拉流）。
    expect(got.outputs[0].video).toEqual(withVideo.outputs[0].video);

    // 提示词文本里的 B 站链接不动。
    const withBilibili = itemsOf(rewritten).find((it: any) => it.prompt.zh.includes("bilibili.com"));
    expect(withBilibili).toBeTruthy();
    expect(withBilibili.prompt.zh).toContain("https://www.bilibili.com/");

    // 重写不碰原文（纯函数，深拷贝）。
    expect(withAtt.attachments[0].url.domestic).toMatch(/^https:/);
  });

  it("loadShowcaseCloudConfig：进程内缓存，mediaKeys 覆盖全部图片且不含 CDN 媒体", () => {
    const a = loadShowcaseCloudConfig();
    const b = loadShowcaseCloudConfig();
    expect(b).toBe(a);
    const { images, media } = collectShowcaseAssets(rawConfig);
    expect(a.mediaKeys.size).toBe(images.length);
    for (const url of media) {
      expect(a.mediaKeys.has(showcaseAssetKey(url))).toBe(false);
    }
    // 配置里所有图片地址都已指向本地静态路由。
    const urls = new Set<string>();
    const walk = (node: any) => {
      if (typeof node === "string" && node.startsWith(`/${HOME_SHOWCASE_ASSET_ROUTE}/`)) urls.add(node);
      else if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === "object") Object.values(node).forEach(walk);
    };
    walk(a.config);
    expect(urls.size).toBe(images.length);
  });

  it("下载脚本跑过的话，manifest 里每个 key 在 media/ 下都有文件且字节数对得上", () => {
    if (!existsSync(MEDIA_DIR)) {
      console.warn("media/ 不存在（没跑过 scripts/fetch-home-showcase-images.py），跳过本地文件对账");
      return;
    }
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Record<string, { url: string; bytes: number | null }>;
    for (const [key, entry] of Object.entries(manifest)) {
      const file = path.join(MEDIA_DIR, key);
      expect(existsSync(file), `缺文件 ${key}`).toBe(true);
      if (entry.bytes !== null) {
        expect(statSync(file).size, `${key} 字节数和 manifest 记录不符`).toBe(entry.bytes);
      }
    }
  });

  it("静态路由 URL 帮手：legacy 名字和 media key 都按同一前缀编码", () => {
    expect(homeShowcaseAssetUrl("参考照片.png")).toBe(`/${HOME_SHOWCASE_ASSET_ROUTE}/${encodeURIComponent("参考照片.png")}`);
    const key = showcaseAssetKey("https://cdn.hailuoai.com/x/y/cover image.png");
    expect(key).toMatch(/^[0-9a-f]{16}-cover_image\.png$/);
    expect(homeShowcaseAssetUrl(key)).toBe(`/${HOME_SHOWCASE_ASSET_ROUTE}/${key}`);
  });
});

function urlValues(field: unknown): string[] {
  if (typeof field === "string") return [field];
  if (field && typeof field === "object") {
    return Object.values(field as Record<string, unknown>).filter((v): v is string => typeof v === "string");
  }
  return [];
}
