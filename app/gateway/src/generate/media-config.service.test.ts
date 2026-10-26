import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { catalogCache } from "@ov/maas-media";
import { FALLBACK_MODELS, PLATFORM_PRESET } from "@ov/protocol";
import { describe, expect, it } from "vitest";

import type { GatewayConfig } from "../config/gateway-config.js";
import { chatModelIds, configuredChatModel } from "../runtime/chat-models.js";
import { capabilityEntries } from "./capabilities.controller.js";
import { MediaConfigService } from "./media-config.service.js";

function dirWith(config: unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), "ov-media-cfg-"));
  writeFileSync(path.join(dir, "config.json"), JSON.stringify(config));
  return dir;
}

/** 伪造一份"上次拉到的目录"：gateway 与主进程共用这个缓存文件格式。 */
function seedCatalog(dir: string, apiKey: string, catalog: { version: string; capabilities: unknown[] }): void {
  writeFileSync(
    catalogCache.platformCatalogPath(dir),
    JSON.stringify({ keys: { [catalogCache.platformKeyDigest(apiKey)]: { ...catalog, fetchedAt: new Date().toISOString(), source: "live" } } }),
  );
}

function serviceFor(dir: string): MediaConfigService {
  return new MediaConfigService({ mediaConfigPath: path.join(dir, "config.json") } as unknown as GatewayConfig);
}

const CAPABILITIES = [
  { id: "generate_image:qwen-image-pro-enhanced", operation: "generate_image", model: "qwen-image-pro-enhanced", default: true, transport: { kind: "images" } },
  { id: "generate_image:qwen-image-edit", operation: "generate_image", model: "qwen-image-edit", limits: { maxReferenceImages: 4 } },
  { id: "generate_video:minimax-h3-2k", operation: "generate_video", model: "minimax-h3-2k", default: true, taskTypes: ["t2v", "i2v"] },
  { id: "generate_video:minimax-h3-ref-2k", operation: "generate_video", model: "minimax-h3-ref-2k", taskTypes: ["r2va"] },
  { id: "generate_music:minimax-music3", operation: "generate_music", model: "minimax-music3" },
  { id: "generate_speech:indextts-2.5", operation: "generate_speech", model: "indextts-2.5" },
  { id: "chat:qwen3.8-flash-fp8", operation: "chat", model: "qwen3.8-flash-fp8" },
  { id: "chat:GLM-5", operation: "chat", model: "GLM-5" },
];

describe("网关读平台配置", () => {
  it("只有令牌、没有任何目录：兜底表补全部空槽位，能力列表不为空", async () => {
    const dir = dirWith({ platform: { api_key: "sk-abc" } });
    const service = serviceFor(dir);
    const media = service.load();
    expect(media.platform.base_url).toBe(PLATFORM_PRESET.base_url);
    expect(media.platform.api_key).toBe("sk-abc");
    // 新装用户没目录时不能一屏"未启用"：兜底表把槽位填上，界面至少能用。
    expect(media.models.image).toBe(FALLBACK_MODELS.image);
    expect(media.models.video).toBe(FALLBACK_MODELS.video);
    expect(media.models.video_ref).toBe(FALLBACK_MODELS.video_ref);
    expect(media.models.music).toBe(FALLBACK_MODELS.music);
    // 目录里表达不了的那几个也必须有值，否则超分、音乐编辑没有入口。
    // 图片超分是个例外：平台没有能接 `/images/edits` 的超分模型，所以是 null。
    expect(media.models.image_upscale).toBeNull();
    expect(media.models.video_upscale).toBe("seedvr2");
    expect(media.models.music_edit).toBe("ace-step");
    // 配置里没写的两个仍然是空（兜底表本身就是 null）。
    expect(media.models.image_edit).toBeNull();
    expect(media.models.speech).toBeNull();
    // 能力列表非空 —— 这正是 `/api/v3/execute` 校验的前提。
    expect(capabilityEntries(service).length).toBeGreaterThan(0);
    // 对话模型仍来自预设：那是"用哪个模型跟平台对话"的默认值，目录里有 chat 能力时再排到它后面。
    const cfg = { mediaConfigPath: path.join(dir, "config.json") } as unknown as GatewayConfig;
    expect(configuredChatModel(cfg)).toBe(PLATFORM_PRESET.chat_model);
    expect(chatModelIds(PLATFORM_PRESET.chat_model, null)).toEqual([`maas/${PLATFORM_PRESET.chat_model}`]);
  });

  it("有目录时用目录的默认项补空槽位，并把目录里的模型名交给 route()", () => {
    const dir = dirWith({ platform: { api_key: "sk-catalog" } });
    seedCatalog(dir, "sk-catalog", { version: "v1", capabilities: CAPABILITIES });
    const media = serviceFor(dir).load();
    expect(media.models.image).toBe("qwen-image-pro-enhanced");
    expect(media.models.video).toBe("minimax-h3-2k");
    // 参考族按 taskTypes 里的 r2va 认出来（帧族/参考族是两个 checkpoint，只能各占一个槽位）。
    expect(media.models.video_ref).toBe("minimax-h3-ref-2k");
    // 图生图按"能收参考图"认。
    expect(media.models.image_edit).toBe("qwen-image-edit");
    expect(media.models.music).toBe("minimax-music3");
    expect(media.models.speech).toBe("indextts-2.5");
    // 目录里没有 upscale / music_edit 这两个操作，只有兜底表能补。
    expect(media.models.image_upscale).toBeNull();
    expect(media.models.video_upscale).toBe("seedvr2");
    expect(media.models.music_edit).toBe("ace-step");
    // 传进 route() 的白名单：目录认识的名字原样放行，不认识的才退回槽位默认。
    expect(media.models.known).toContain("qwen-image-edit");
    expect(media.models.known).toContain("GLM-5");
  });

  it("有目录但目录里没有 generate_image：image 保持空，不被兜底表补上", () => {
    const dir = dirWith({ platform: { api_key: "sk-partial" } });
    seedCatalog(dir, "sk-partial", {
      version: "v2",
      capabilities: [{ id: "generate_music:minimax-music3", operation: "generate_music", model: "minimax-music3", default: true }],
    });
    const media = serviceFor(dir).load();
    // 目录说了"这个 key 没有生图"，就不能拿兜底表硬塞一个 —— 那会让校验通过、调用被平台拒。
    expect(media.models.image).toBeNull();
    expect(media.models.video).toBeNull();
    expect(media.models.music).toBe("minimax-music3");
    // 目录表达不了的槽位仍然由兜底表补。
    expect(media.models.video_upscale).toBe("seedvr2");
  });

  it("换 key：内存里的旧目录要作废，不能拿 A 的目录校验 B 的调用", () => {
    const dir = dirWith({ platform: { api_key: "sk-A" } });
    seedCatalog(dir, "sk-A", { version: "a-v1", capabilities: CAPABILITIES });
    const service = serviceFor(dir);
    expect(service.currentCatalog()?.version).toBe("a-v1");

    // 换成 B：B 没有缓存，磁盘上只有 A 的。
    writeFileSync(path.join(dir, "config.json"), JSON.stringify({ platform: { api_key: "sk-B" } }));
    expect(service.currentCatalog()).toBeNull();
    const media = service.load();
    // B 走兜底表，绝不出现 A 的模型名。
    expect(media.models.image).toBe(FALLBACK_MODELS.image);
    expect(media.models.known ?? []).not.toContain("qwen-image-edit");
  });

  it("换回上一个 key：读到它自己的磁盘缓存", () => {
    const dir = dirWith({ platform: { api_key: "sk-A" } });
    seedCatalog(dir, "sk-A", { version: "a-v1", capabilities: CAPABILITIES });
    const service = serviceFor(dir);
    expect(service.currentCatalog()?.version).toBe("a-v1");

    writeFileSync(path.join(dir, "config.json"), JSON.stringify({ platform: { api_key: "sk-B" } }));
    expect(service.currentCatalog()).toBeNull();

    writeFileSync(path.join(dir, "config.json"), JSON.stringify({ platform: { api_key: "sk-A" } }));
    expect(service.currentCatalog()?.version).toBe("a-v1");
  });

  it("配置里写死的值优先于目录", () => {
    const dir = dirWith({ platform: { api_key: "sk-pinned" }, models: { image: "my-image", video_upscale: "swiftvr" } });
    seedCatalog(dir, "sk-pinned", { version: "v1", capabilities: CAPABILITIES });
    const media = serviceFor(dir).load();
    expect(media.models.image).toBe("my-image");
    expect(media.models.video_upscale).toBe("swiftvr");
    // 没写的那些仍然由目录补。
    expect(media.models.video).toBe("minimax-h3-2k");
  });

  it("对话模型多选：目录里的 chat 能力全部列出，配置那个排第一", () => {
    const dir = dirWith({ platform: { api_key: "sk-chat", chat_model: "my-chat" } });
    seedCatalog(dir, "sk-chat", { version: "v1", capabilities: CAPABILITIES });
    const media = serviceFor(dir).load();
    expect(media.platform.chat_model).toBe("my-chat");
    expect(chatModelIds(media.platform.chat_model, serviceFor(dir).currentCatalog())).toEqual([
      "maas/my-chat",
      "maas/qwen3.8-flash-fp8",
      "maas/GLM-5",
    ]);
  });

  it("空值当\"没写\"，不被当成\"关掉某项能力\"：没有目录时由兜底表补上", () => {
    const dir = dirWith({ platform: { api_key: "k", chat_model: "my-chat" }, models: { video_upscale: null } });
    const media = serviceFor(dir).load();
    expect(media.platform.chat_model).toBe("my-chat");
    // 老版本设置页会把没填的槽位写成 null。null 是"没写"，不是"关掉"，
    // 所以兜底表照常补 —— 否则这些用户会看到一屏"未启用"而界面又不让改。
    expect(media.models.video_upscale).toBe("seedvr2");
  });
});
