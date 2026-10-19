/**
 * 固定路由工具与共用参数描述的测试。
 *
 * `fixed().prepare` 决定请求体的形状，几个细节错了不会报错、只会让后端收错东西：
 * `model_name` 必须进参数表（后端靠它选模型）、空音频数组不能出现在请求体里、
 * 图片路径优先用 `compile` 给的。
 */
import { describe, expect, it } from "vitest";
import { fixed, objectParams } from "./fixed.js";
import { IMAGE_ASPECT_RATIO, IMAGE_RESOLUTION, VIDEO_AUDIO } from "../models/vendors/shared.js";

const media = (image: string[] = [], video: string[] = [], audio: string[] = []) => ({ image, video, audio });
/** 工具的 `params` 是必填（由 paramSchema 在运行时校验），测试里给空对象。 */
const req = (over: Record<string, unknown> = {}) => ({ params: {}, media: media(), references: [], ...over });

describe("fixed", () => {
  it("带上 provider 的字段并标记为 task/fixed 路由", () => {
    const tool = fixed({ backend: "seedream", model: "seedream_5_pro" });
    expect(tool.mode).toBe("task");
    expect(tool.route).toBe("fixed");
    expect(tool.backend).toBe("seedream");
    expect(tool.model).toBe("seedream_5_pro");
  });

  it("model_name 进参数表，供后端选模型", () => {
    const tool = fixed({ backend: "seedream", model: "seedream_5_pro" }, () => ({ params: { size: "2k" } }));
    const out = tool.prepare(req({ prompt: "p", media: media() })) as { params: Record<string, string> };
    expect(out.params.model_name).toBe("seedream_5_pro");
    expect(out.params.size).toBe("2k");
  });

  it("compile 给的提示词与图片路径优先，其余用调用方的", () => {
    const tool = fixed({ backend: "b", model: "m" }, () => ({ prompt: "来自模板", image_paths: ["tpl.png"] }));
    const out = tool.prepare(req({ prompt: "调用方", media: media(["user.png"], ["v.mp4"]) })) as {
      prompt: string;
      image_paths: string[];
      video_paths: string[];
    };
    expect(out.prompt).toBe("来自模板");
    expect(out.image_paths).toEqual(["tpl.png"]);
    expect(out.video_paths).toEqual(["v.mp4"]);
  });

  it("compile 没给提示词时用调用方的", () => {
    const tool = fixed({ backend: "b", model: "m" }, () => ({}));
    const out = tool.prepare(req({ prompt: "调用方", media: media() })) as { prompt: string };
    expect(out.prompt).toBe("调用方");
  });

  it("音频为空时请求体里没有 audio_paths 这个字段", () => {
    const tool = fixed({ backend: "b", model: "m" });
    expect(tool.prepare(req({ prompt: "p", media: media() }))).not.toHaveProperty("audio_paths");
    expect(tool.prepare(req({ prompt: "p", media: media([], [], ["a.mp3"]) }))).toHaveProperty("audio_paths", ["a.mp3"]);
  });
});

describe("objectParams", () => {
  it("required 为空时不写这个字段", () => {
    expect(objectParams({ a: {} })).toEqual({ type: "object", properties: { a: {} } });
    expect(objectParams({ a: {} }, [])).toEqual({ type: "object", properties: { a: {} } });
    expect(objectParams({ a: {} }, ["a"])).toEqual({ type: "object", properties: { a: {} }, required: ["a"] });
  });
});

describe("共用参数描述", () => {
  it("画幅与分辨率都强调「不传就继承」", () => {
    expect(IMAGE_ASPECT_RATIO(["1:1"]).description).toContain("Omit it to inherit");
    expect(IMAGE_RESOLUTION(["1k", "2k"]).description).toContain("increases cost");
    expect(IMAGE_RESOLUTION(["1k", "2k"]).enum).toEqual(["1k", "2k"]);
  });

  it("音频开关默认打开", () => {
    expect(VIDEO_AUDIO).toMatchObject({ type: "boolean", default: true });
  });
});
