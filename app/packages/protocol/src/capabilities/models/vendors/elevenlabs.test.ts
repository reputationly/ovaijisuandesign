import { describe, expect, it } from "vitest";

import { elevenlabsMusic } from "./elevenlabs.js";

const base = {
  modelId: "elevenlabs-music-v2",
  prompt: "calm piano",
  media: { image: [], video: [], audio: [] },
  references: [],
};

describe("elevenlabs 音乐能力（4.0.4）", () => {
  it("只提供 instrumental，不再有 song 模式", () => {
    const params = elevenlabsMusic.params as { mode: { enum: string[] } };
    const native = elevenlabsMusic.native as {
      mode: { values: Record<string, string> };
    };
    expect(params.mode.enum).toEqual(["instrumental"]);
    expect(native.mode.values).toEqual({ instrumental: "instrumental" });
  });

  it("600 秒以内接受，超过 600 秒拒绝", () => {
    const accepted = elevenlabsMusic.prepare({ ...base, params: { length: "10m" } }) as {
      params: Record<string, string>;
    };
    expect(accepted.params).toMatchObject({ is_instrumental: "instrumental", music_length_ms: "10m" });
    expect(() => elevenlabsMusic.prepare({ ...base, params: { length: "11m" } })).toThrow(/at most 600 seconds/);
  });

  it("即使不传 mode，也固定发 instrumental", () => {
    const out = elevenlabsMusic.prepare({ ...base, params: { length: "auto" } }) as {
      params: Record<string, string>;
    };
    expect(out.params.is_instrumental).toBe("instrumental");
  });
});
