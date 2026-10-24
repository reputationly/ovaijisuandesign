import { describe, expect, it } from "vitest";

import { selectedModelsFromEnv } from "./selected-models.js";

describe("外部 Agent 模型范围", () => {
  it("解析 image/video/audio 数组，忽略非法项", () => {
    expect(selectedModelsFromEnv('{"image":["a","b"],"video":[],"audio":["c",1]}')).toEqual({
      image: ["a", "b"],
      video: [],
      audio: ["c"],
    });
  });

  it("缺省 / 空对象 / 坏 JSON 都表示全部", () => {
    expect(selectedModelsFromEnv(undefined)).toBeNull();
    expect(selectedModelsFromEnv("{}")).toBeNull();
    expect(selectedModelsFromEnv("not-json")).toBeNull();
  });
});
