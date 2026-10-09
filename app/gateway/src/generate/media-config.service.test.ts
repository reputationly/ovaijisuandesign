import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { PLATFORM_PRESET } from "@ov/protocol";
import { describe, expect, it } from "vitest";

import type { GatewayConfig } from "../config/gateway-config.js";
import { chatModelIds } from "../runtime/chat-models.js";
import { MediaConfigService } from "./media-config.service.js";

function fileWith(content: unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), "ov-media-cfg-"));
  const file = path.join(dir, "config.json");
  writeFileSync(file, JSON.stringify(content));
  return file;
}

describe("网关读平台配置：产品预设补全", () => {
  it("配置里只有令牌（新装用户）：地址和各模态模型用预设，对话模型 id 一致", () => {
    const file = fileWith({ platform: { api_key: "sk-abc" } });
    const cfg = { mediaConfigPath: file } as unknown as GatewayConfig;
    const media = new MediaConfigService(cfg).load();
    expect(media.platform.base_url).toBe(PLATFORM_PRESET.base_url);
    expect(media.platform.api_key).toBe("sk-abc");
    expect(media.models.image).toBe(PLATFORM_PRESET.models.image);
    expect(media.models.video).toBe(PLATFORM_PRESET.models.video);
    expect(media.models.music).toBe(PLATFORM_PRESET.models.music);
    expect(chatModelIds(cfg)).toEqual([`maas/${PLATFORM_PRESET.chat_model}`]);
  });

  it("写了非空的值照旧优先；老版本留下的 null 不会把能力关掉，回到预设", () => {
    const file = fileWith({
      platform: { api_key: "k", chat_model: "my-chat" },
      models: { image: "my-image", video_upscale: null },
    });
    const media = new MediaConfigService({ mediaConfigPath: file } as unknown as GatewayConfig).load();
    expect(media.models.image).toBe("my-image");
    expect(media.models.video_upscale).toBe(PLATFORM_PRESET.models.video_upscale);
    expect(media.platform.chat_model).toBe("my-chat");
  });
});
