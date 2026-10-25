import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { catalogCache, defaultMediaConfig, parseMediaConfig } from "@ov/maas-media";
import { describe, expect, it } from "vitest";

import { capabilityEntries, platformEntries } from "./capabilities.controller.js";
import {
  catalogModelNames,
  catalogUrl,
  defaultCapability,
  fetchPlatformCatalog,
  readCachedCatalog,
} from "./platform-catalog.js";

function configWith(baseUrl: string, apiKey: string) {
  return parseMediaConfig({
    platform: { base_url: baseUrl, api_key: apiKey, chat_model: "chat" },
    models: {},
  });
}

function fakeCatalog() {
  return {
    version: "v1",
    capabilities: [
      {
        id: "generate_image:qwen-image-pro-enhanced",
        operation: "generate_image",
        model: "qwen-image-pro-enhanced",
        displayName: { zh: "Qwen 增强", en: "Qwen Enhanced" },
        description: { zh: "自动定画幅", en: "auto framing" },
        transport: { kind: "images" },
        paramSchema: { type: "object", properties: { aspect_ratio: { type: "string", enum: ["adaptive", "1:1"], default: "adaptive", title: "宽高比" } } },
        limits: { maxReferenceImages: 0, maxDurationSeconds: 0, maxInputBytes: 0 },
        default: true,
      },
      {
        id: "generate_video:minimax-h3-ref-2k",
        operation: "generate_video",
        model: "minimax-h3-ref-2k",
        transport: { kind: "videos_task" },
        taskTypes: ["r2va"],
        limits: { maxReferenceImages: 9, maxDurationSeconds: 15, maxInputBytes: 0 },
      },
      {
        id: "generate_video:minimax-h3-2k",
        operation: "generate_video",
        model: "minimax-h3-2k",
        transport: { kind: "videos_task" },
        taskTypes: ["t2v", "i2v", "flf2v", "l2va"],
      },
      { id: "chat:qwen3.8-flash-fp8", operation: "chat", model: "qwen3.8-flash-fp8", transport: { kind: "chat" } },
      // 平台加了我们还看不懂的操作 —— 只丢这一条，别的照报。
      { id: "frobnicate:thing", operation: "frobnicate", model: "thing" },
      { operation: "generate_image" },
    ],
  };
}

function stubFetch(payload: unknown, status = 200) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), headers: (init?.headers ?? {}) as Record<string, string> });
    return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("平台能力目录", () => {
  it("从 base_url 推出目录地址：/v1 只保留一层", () => {
    expect(catalogUrl("https://maas.example.com/v1")).toBe("https://maas.example.com/v1/ov/capabilities");
    expect(catalogUrl("https://maas.example.com/v1/")).toBe("https://maas.example.com/v1/ov/capabilities");
    expect(catalogUrl("https://maas.example.com")).toBe("https://maas.example.com/v1/ov/capabilities");
  });

  it("请求目录时带上令牌、落盘，并能从盘上读回来", async () => {
    const dataDir = mkdtempSync(path.join(tmpdir(), "ov-catalog-"));
    const { impl, calls } = stubFetch(fakeCatalog());
    const result = await fetchPlatformCatalog(configWith("https://maas.example.com/v1", "sk-test"), { dataDir, fetchImpl: impl });
    expect(result.error).toBeUndefined();
    expect(calls[0]!.url).toBe("https://maas.example.com/v1/ov/capabilities");
    expect(calls[0]!.headers.Authorization).toBe("Bearer sk-test");
    // 缺模型名的那条在**取回时**就丢掉；操作不认识的那条留着（缓存要忠实反映平台
    // 说了什么），到"转成能力条目"那一步才按操作白名单过滤。
    expect(result.catalog?.capabilities.map((item) => item.model)).toEqual([
      "qwen-image-pro-enhanced", "minimax-h3-ref-2k", "minimax-h3-2k", "qwen3.8-flash-fp8", "thing",
    ]);

    const cached = readCachedCatalog(dataDir, "sk-test");
    expect(cached?.version).toBe("v1");
    expect(cached?.source).toBe("cache");
    // **令牌不进缓存文件**：只存指纹。
    expect(readFileSync(catalogCache.platformCatalogPath(dataDir), "utf8")).not.toContain("sk-test");
  });

  it("换一个令牌读不到别人的缓存", async () => {
    const dataDir = mkdtempSync(path.join(tmpdir(), "ov-catalog-"));
    const { impl } = stubFetch(fakeCatalog());
    await fetchPlatformCatalog(configWith("https://maas.example.com/v1", "sk-a"), { dataDir, fetchImpl: impl });
    expect(readCachedCatalog(dataDir, "sk-b")).toBeNull();
  });

  it("平台不可达时返回原因，不抛错", async () => {
    const dataDir = mkdtempSync(path.join(tmpdir(), "ov-catalog-"));
    const failing = (async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;
    const result = await fetchPlatformCatalog(configWith("https://maas.example.com/v1", "sk-test"), { dataDir, fetchImpl: failing });
    expect(result.catalog).toBeNull();
    expect(result.error).toBe("HTTP 500");
    // 没配平台时连请求都不该发。
    const empty = await fetchPlatformCatalog(defaultMediaConfig(), { dataDir, fetchImpl: failing });
    expect(empty.error).toBe("platform not configured");
  });

  it("默认项按 default 标记取，没有标记就取第一条", async () => {
    const dataDir = mkdtempSync(path.join(tmpdir(), "ov-catalog-"));
    const { impl } = stubFetch(fakeCatalog());
    const { catalog } = await fetchPlatformCatalog(configWith("https://maas.example.com/v1", "sk-test"), { dataDir, fetchImpl: impl });
    expect(defaultCapability(catalog, "generate_image")?.model).toBe("qwen-image-pro-enhanced");
    expect(defaultCapability(catalog, "generate_video")?.model).toBe("minimax-h3-ref-2k");
    expect(catalogModelNames(catalog)).toContain("qwen3.8-flash-fp8");
  });

  it("目录转成能力条目：参数表、传输协议、上限都带出去，操作不认识的不报", async () => {
    const entries = platformEntries(fakeCatalog() as never);
    // 对话能力不进这份**媒体**能力目录（它没有生成任务，见 capabilities.controller
    // 的 OPERATIONS）；不认识的操作与缺模型名的坏条目也丢掉。
    expect(entries.map((entry) => entry.id)).toEqual([
      "generate_image:qwen-image-pro-enhanced",
      "generate_video:minimax-h3-ref-2k",
      "generate_video:minimax-h3-2k",
    ]);
    const image = entries[0]!;
    expect(image).toMatchObject({ operation: "generate_image", transport: "images", default: true });
    expect(image.paramSchema.properties).toMatchObject({
      aspect_ratio: { type: "string", enum: ["adaptive", "1:1"], default: "adaptive", title: "宽高比" },
    });
    // 双语只取一个（界面只有一种语言），优先中文。
    expect(image.displayName).toBe("Qwen 增强");
    const video = entries[1]!;
    expect(video).toMatchObject({ transport: "videos_task", taskTypes: ["r2va"] });
    expect(video.limits).toMatchObject({ maxReferenceImages: 9, maxDurationSeconds: 15 });
  });
});

describe("能力来源的选择", () => {
  it("没有目录时退回按配置槽位拼的能力", () => {
    const media = {
      load: () => parseMediaConfig({ platform: { base_url: "https://x/v1", api_key: "k", chat_model: "c" }, models: { image: "qwen-image" } }),
      currentCatalog: () => null,
    } as never;
    const entries = capabilityEntries(media);
    expect(entries.map((entry) => entry.id)).toEqual(["generate_image:qwen-image"]);
  });

  it("有目录时以目录为准", async () => {
    const dataDir = mkdtempSync(path.join(tmpdir(), "ov-catalog-"));
    const { impl } = stubFetch(fakeCatalog());
    const { catalog } = await fetchPlatformCatalog(configWith("https://maas.example.com/v1", "sk-test"), { dataDir, fetchImpl: impl });
    const media = {
      load: () => parseMediaConfig({ platform: { base_url: "https://x/v1", api_key: "k", chat_model: "c" }, models: { image: "qwen-image" } }),
      currentCatalog: () => catalog,
    } as never;
    const entries = capabilityEntries(media);
    expect(entries.map((entry) => entry.model.id)).not.toContain("qwen-image");
    expect(entries.map((entry) => entry.model.id)).toContain("qwen-image-pro-enhanced");
  });
});
