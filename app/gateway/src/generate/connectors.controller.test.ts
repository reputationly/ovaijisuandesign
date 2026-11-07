import { describe, expect, it } from "vitest";

import { ConnectorsController } from "./connectors.controller.js";

const media = {
  currentCatalog: () => ({
    capabilities: [
      { id: "generate_video:minimax-h3-2k", operation: "generate_video", model: "minimax-h3-2k", displayName: "MiniMax H3", description: "video" },
      { id: "generate_image:qwen-image-pro-enhanced", operation: "generate_image", model: "qwen-image-pro-enhanced", displayName: "Qwen Image", description: "image" },
    ],
  }),
  load: () => ({ models: {} }),
} as never;

describe("connectors/search（capability_search 的本地检索端）", () => {
  it("按关键字命中平台能力", () => {
    const controller = new ConnectorsController(media);
    const result = controller.search("video");
    expect(result.results.map((item) => item.connectorId)).toContain("generate_video:minimax-h3-2k");
    expect(result.results.map((item) => item.connectorId)).not.toContain("generate_image:qwen-image-pro-enhanced");
  });

  it("市场不可用时如实说明，而不是假装没有结果", () => {
    const controller = new ConnectorsController(media);
    const result = controller.search("video");
    expect(result.market.available).toBe(false);
    expect(result.market.reason).toContain("connector market");
  });
});
