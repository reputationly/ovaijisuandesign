import { describe, expect, it, vi } from "vitest";

import { registerV3Tools } from "./v3-tools.js";

describe("design_execute 的任务契约", () => {
  it("透传完整入参到 /api/v3/execute 并返回 task", async () => {
    const tools = new Map<string, (args: unknown) => Promise<unknown>>();
    const registrar = {
      registerTool: (name: string, _meta: unknown, fn: (args: unknown) => Promise<unknown>) => {
        tools.set(name, fn);
      },
    };
    const task = { id: "tsk_1", revision: 1, status: "running" };
    const gw = { post: vi.fn().mockResolvedValue({ task }) };
    registerV3Tools(registrar as never, gw as never);
    const args = {
      capabilityId: "generate_image:qwen-image",
      prompt: "一盏灯",
      params: { aspect_ratio: "1:1" },
      references: [{ versionId: "ver_1" }],
      count: 2,
      output: { resources: [{ mode: "create", name: "灯" }] },
    };
    await tools.get("execute")!(args);
    expect(gw.post).toHaveBeenCalledWith("/api/v3/execute", args, 600_000, expect.anything());
  });
});
