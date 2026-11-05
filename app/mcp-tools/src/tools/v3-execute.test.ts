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
    registerV3Tools(registrar as never, gw as never, "cn" as never);
    const args = {
      capabilityId: "generate_image:qwen-image",
      prompt: "一盏灯",
      params: { aspect_ratio: "1:1" },
      references: [{ versionId: "ver_1" }],
      count: 2,
      output: { resources: [{ mode: "create", name: "灯" }] },
    };
    const reply = (await tools.get("execute")!(args)) as { structuredContent?: { task?: typeof task } };
    expect(gw.post).toHaveBeenCalledWith("/api/v3/execute", args, 600_000, expect.anything());
    expect(reply.structuredContent?.task).toMatchObject({ id: "tsk_1", revision: 1, status: "running" });
  });

  function harness() {
    const tools = new Map<string, (args: unknown) => Promise<unknown>>();
    const registrar = {
      registerTool: (name: string, _meta: unknown, fn: (args: unknown) => Promise<unknown>) => {
        tools.set(name, fn);
      },
    };
    const gw = { post: vi.fn().mockResolvedValue({ task: { id: "tsk_ok", revision: 1, status: "running" } }) };
    registerV3Tools(registrar as never, gw as never, "cn" as never);
    return { tools, gw };
  }

  const textOf = (reply: unknown) => JSON.stringify(reply ?? "");

  it("空 prompt 的生成请求在提交前就被挡下（平台会 prompt is required 拒单）", async () => {
    const { tools, gw } = harness();
    const reply = await tools.get("execute")!({
      capabilityId: "generate_image:qwen-image-pro-enhanced",
      output: { resources: [{ mode: "create", name: "图" }] },
    });
    expect(gw.post).not.toHaveBeenCalled();
    expect(textOf(reply)).toContain("prompt");
  });

  it("音乐把风格描述放在 params.prompt 时不算缺 prompt", async () => {
    const { tools, gw } = harness();
    await tools.get("execute")!({ capabilityId: "generate_music:minimax-music3", params: { prompt: "温暖的公路民谣" } });
    expect(gw.post).toHaveBeenCalledTimes(1);
  });

  it("非生成类能力（剪辑/超分）不强制 prompt", async () => {
    const { tools, gw } = harness();
    await tools.get("execute")!({ capabilityId: "generate_video:enhance", params: { resolution: "1080p", fps: 60 } });
    expect(gw.post).toHaveBeenCalledTimes(1);
  });

  it("references 里的多余字段会被收敛成恰好 {versionId}（网关只收单键）", async () => {
    const { tools, gw } = harness();
    await tools.get("execute")!({
      capabilityId: "generate_video:minimax-h3-2k",
      prompt: "公路日落",
      params: { duration: "6" },
      references: { item: { kind: "image", versionId: "ver_a" } },
    });
    expect(gw.post).toHaveBeenCalledTimes(1);
    const sent = (gw.post as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![1] as { references: unknown };
    // 真机形状：宿主把数组改写成 `{"item": {...}}` —— 必须解壳并去掉多余字段
    expect(sent.references).toEqual([{ versionId: "ver_a" }]);
  });
});
