import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { currentContext } from "./context.js";
import { structuredReply } from "./replies.js";
import { createHarness, resultText } from "./testing/harness.js";
import { buildToolMetas, extractParamHints } from "./tool-metas.js";

function setup() {
  const h = createHarness();
  const seen: { args: Record<string, unknown>; ctx: unknown }[] = [];
  h.registrar.registerTool(
    "echo",
    {
      description: "echo tool used by registrar tests",
      inputSchema: { text: z.string(), mode: z.enum(["a", "b"]).optional() },
      confirmable: true,
      paramHints: { text: { type: "desc", description: "override" } },
    },
    async (args) => {
      seen.push({ args: { ...args }, ctx: currentContext() });
      return structuredReply({ echoed: args.text });
    },
  );
  return { h, seen };
}

describe("registrar", () => {
  it("wraps the schema as passthrough so private args survive validation", async () => {
    const { h, seen } = setup();
    await h.call("echo", { text: "hi", _session_id: "s1", extra_unknown: 1 });
    // 未知的非私有键照样透传给工具（passthrough 语义）
    expect(seen[0]!.args).toEqual({ text: "hi", extra_unknown: 1 });
  });

  it("still rejects invalid declared params", async () => {
    const { h } = setup();
    await expect(h.call("echo", { text: 1 })).rejects.toThrow();
  });

  it("pops private args into the session context", async () => {
    const { h, seen } = setup();
    const turn = "ABCDEF0123456789abcdef0123456789";
    await h.call("echo", {
      text: "x",
      _session_id: "ses",
      _chat_turn_id: turn,
      _tool_use_id: "tu",
      _group_id: "5",
      _group_scope: "legacy",
    });
    expect(seen[0]!.args).toEqual({ text: "x" });
    expect(seen[0]!.ctx).toMatchObject({
      sessionId: "ses",
      chatTurnId: turn.toLowerCase(),
      toolUseId: "tu",
      groupId: "5",
      groupScope: "legacy",
    });
  });

  it("drops malformed chat turn ids and unknown group scopes", async () => {
    const { h, seen } = setup();
    await h.call("echo", { text: "x", _chat_turn_id: "not-hex", _group_scope: "weird", _session_id: "" });
    expect(seen[0]!.ctx).toMatchObject({ chatTurnId: undefined, groupScope: undefined, sessionId: undefined });
  });

  it("appends the user override note to the result", async () => {
    const { h } = setup();
    const r = await h.call("echo", { text: "x", _user_override_note: "use 16:9" });
    expect(r.content).toHaveLength(2);
    expect(r.content[1]).toEqual({ type: "text", text: "\n[User Override] use 16:9" });
    expect(resultText(r)).toBe(JSON.stringify({ echoed: "x" }));
  });

  it("logs mcp_started / mcp_finished only with a chat turn id", async () => {
    const { h } = setup();
    const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      await h.call("echo", { text: "x" });
      expect(spy.mock.calls.some((c) => String(c[0]).includes("[chat-turn]"))).toBe(false);
      await h.call("echo", { text: "x", _chat_turn_id: "f".repeat(32), _session_id: "s" });
      const lines = spy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.startsWith("[chat-turn] stage=mcp_started") && l.includes("tool=echo"))).toBe(true);
      expect(lines.some((l) => l.startsWith("[chat-turn] stage=mcp_finished") && l.includes("status=ok"))).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  it("strips private config fields from the SDK config and collects them", () => {
    const { h } = setup();
    const cfg = h.tools.get("echo")!.config;
    expect(cfg.confirmable).toBeUndefined();
    expect(cfg.paramHints).toBeUndefined();
    expect(cfg.description).toBe("echo tool used by registrar tests");
    const collected = h.registrar.collected().get("echo")!;
    expect(collected.confirmable).toBe(true);
    expect(Object.keys(collected.inputSchema)).toEqual(["text", "mode"]);
  });

  it("builds hub_-prefixed tool metas with inferred enum hints", () => {
    const { h } = setup();
    const metas = buildToolMetas(h.registrar.collected());
    expect(metas).toEqual({
      hub_echo: {
        paramHints: { mode: { type: "enum", values: ["a", "b"] }, text: { type: "desc", description: "override" } },
        confirmable: true,
      },
    });
  });

  it("flattens vendor_params hints and reads number ranges", () => {
    const hints = extractParamHints({
      count: z.number().min(1).max(4).describe("how many"),
      vendor_params: z.object({ quality: z.enum(["low", "high"]) }).optional(),
      _private: z.string(),
    });
    expect(hints).toEqual({
      count: { type: "range", min: 1, max: 4, description: "how many" },
      quality: { type: "enum", values: ["low", "high"] },
    });
  });
});

describe("宿主改写数组时的兜底", () => {
  function executeSetup() {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool(
      "execute",
      {
        description: "execute tool used by registrar tests",
        inputSchema: {
          output: z
            .object({
              resources: z.array(z.object({ mode: z.string() }).passthrough()),
              composition: z
                .object({ placements: z.array(z.object({ key: z.string() }).passthrough()) })
                .passthrough()
                .optional(),
            })
            .passthrough(),
        },
      },
      async (args) => {
        seen.push(JSON.parse(JSON.stringify(args)) as Record<string, unknown>);
        return structuredReply({ ok: true });
      },
    );
    return { h, seen };
  }

  const resourcesOf = (seen: Record<string, unknown>[]) => {
    const output = seen[0]?.output as { resources?: unknown; composition?: { placements?: unknown } } | undefined;
    return output?.resources;
  };

  it("{item: [...]} 这种被包了一层壳的数组能还原", async () => {
    const { h, seen } = executeSetup();
    await h.call("execute", { output: { resources: { item: [{ mode: "create", name: "a" }] } } });
    expect(resourcesOf(seen)).toEqual([{ mode: "create", name: "a" }]);
  });

  it("数字键对象能还原成数组", async () => {
    const { h, seen } = executeSetup();
    await h.call("execute", { output: { resources: { "0": { mode: "create" }, "1": { mode: "create" } } } });
    expect(resourcesOf(seen)).toEqual([{ mode: "create" }, { mode: "create" }]);
  });

  it("单个对象当数组传也能救回来", async () => {
    const { h, seen } = executeSetup();
    await h.call("execute", { output: { resources: { mode: "create", name: "b" } } });
    expect(resourcesOf(seen)).toEqual([{ mode: "create", name: "b" }]);
  });

  it("output.composition.placements 同样会被还原", async () => {
    const { h, seen } = executeSetup();
    await h.call("execute", {
      // primary 不带 key；具名输出用 key="extra"，placements 才对得上（否则会被当成无效 key 删掉）
      output: { resources: [{ mode: "create" }, { key: "extra", mode: "create" }], composition: { placements: { item: [{ key: "extra" }] } } },
    });
    const output = seen[0]?.output as { composition?: { placements?: unknown } } | undefined;
    expect(output?.composition?.placements).toEqual([{ key: "extra" }]);
  });

  it("capability_get 传 capabilityId 时归一成 ids，并把别名键删掉", async () => {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool(
      "capability_get",
      { description: "capability_get", inputSchema: { ids: z.array(z.string()).min(1) } },
      async (args) => {
        seen.push(JSON.parse(JSON.stringify(args)) as Record<string, unknown>);
        return structuredReply({ ok: true });
      },
    );
    await h.call("capability_get", { capabilityId: "generate_video:minimax-h3" });
    expect(seen[0]?.ids).toEqual(["generate_video:minimax-h3"]);
    expect(seen[0]?.capabilityId).toBeUndefined();
  });
});

describe("宿主改写数组（通用）", () => {
  function setup2() {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool(
      "capability_get",
      { description: "capability_get", inputSchema: { ids: z.array(z.string()).min(1), note: z.string().optional() } },
      async (args) => {
        seen.push(JSON.parse(JSON.stringify(args)) as Record<string, unknown>);
        return structuredReply({ ok: true });
      },
    );
    return { h, seen };
  }

  it("{item: \"x\"} / {item: [...]} / 数字键对象 都能还原成数组", async () => {
    const { h, seen } = setup2();
    await h.call("capability_get", { ids: { item: "a" } });
    expect(seen.at(-1)?.ids).toEqual(["a"]);
    await h.call("capability_get", { ids: { item: ["a", "b"] } });
    expect(seen.at(-1)?.ids).toEqual(["a", "b"]);
    await h.call("capability_get", { ids: { "0": "a", "1": "b" } });
    expect(seen.at(-1)?.ids).toEqual(["a", "b"]);
  });

  it("本来合法的数组不受影响", async () => {
    const { h, seen } = setup2();
    await h.call("capability_get", { ids: ["a", "b"], note: "keep" });
    expect(seen.at(-1)).toMatchObject({ ids: ["a", "b"], note: "keep" });
  });
});

describe("元素级解壳（真机 output.resources[0]）", () => {
  it("数组元素被包成 {item:…} 时 registrar 会自动解壳并通过校验", async () => {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool(
      "execute",
      {
        description: "元素解壳用的小工具",
        inputSchema: {
          prompt: z.string(),
          output: z.object({
            resources: z.array(z.object({ mode: z.literal("create"), name: z.string().min(1) })).min(1),
          }),
        },
      },
      async (args) => {
        seen.push(args as Record<string, unknown>);
        return structuredReply({ ok: true });
      },
    );
    // 宿主实测形状：数组对、元素被包了一层
    await h.call("execute", { prompt: "一张图", output: { resources: [{ item: { mode: "create", name: "身份锚" } }] } });
    expect(seen[0]).toEqual({ prompt: "一张图", output: { resources: [{ mode: "create", name: "身份锚" }] } });
  });

  it("正常形状照旧通过", async () => {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool(
      "execute",
      {
        description: "元素解壳用的小工具",
        inputSchema: {
          prompt: z.string(),
          output: z.object({ resources: z.array(z.object({ mode: z.literal("create"), name: z.string().min(1) })).min(1) }),
        },
      },
      async (args) => {
        seen.push(args as Record<string, unknown>);
        return structuredReply({ ok: true });
      },
    );
    await h.call("execute", { prompt: "一张图", output: { resources: [{ mode: "create", name: "身份锚" }] } });
    expect(seen[0]).toEqual({ prompt: "一张图", output: { resources: [{ mode: "create", name: "身份锚" }] } });
  });
});

describe("execute 参数形状兜底（真机 -32602）", () => {
  const spec = {
    description: "execute 形状兜底",
    inputSchema: {
      capabilityId: z.string().min(1),
      params: z.record(z.string(), z.unknown()).optional(),
      output: z.object({
        resources: z.array(z.object({ mode: z.literal("create"), name: z.string().min(1) })).min(1),
        composition: z.object({ name: z.string().optional(), placements: z.array(z.object({ role: z.string().optional() })).min(1) }).optional(),
      }).optional(),
    },
  } as const;

  it("capability_id / capability 别名能补成 capabilityId", async () => {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool("execute", spec, async (args) => { seen.push(args as Record<string, unknown>); return structuredReply({ ok: true }); });
    await h.call("execute", { capability_id: "generate_image:qwen-image-pro-enhanced", params: { aspect_ratio: "9:16" } });
    expect(seen[0]!.capabilityId).toBe("generate_image:qwen-image-pro-enhanced");
  });

  it("params 是 JSON 字符串时解析成对象", async () => {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool("execute", spec, async (args) => { seen.push(args as Record<string, unknown>); return structuredReply({ ok: true }); });
    await h.call("execute", { capabilityId: "cap", params: '{"aspect_ratio":"9:16","resolution":"2K"}' });
    expect(seen[0]!.params).toEqual({ aspect_ratio: "9:16", resolution: "2K" });
  });

  it("output 只给了 composition 名字时，补出 resources 与 placements", async () => {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool("execute", spec, async (args) => { seen.push(args as Record<string, unknown>); return structuredReply({ ok: true }); });
    await h.call("execute", { capabilityId: "cap", output: { composition: { name: "身份锚" } } });
    const output = seen[0]!.output as { resources: { name: string }[]; composition: { placements: { role?: string }[] } };
    expect(output.resources).toEqual([{ mode: "create", name: "身份锚" }]);
    expect(output.composition.placements).toEqual([{ role: "身份锚" }]);
  });
});

describe("深层数组包壳（真机 design_deliver 连报 8 次 Invalid input at sources[0]）", () => {
  const spec = {
    description: "deliver 形状兜底",
    inputSchema: {
      requestId: z.string().min(1),
      sources: z.array(z.union([z.object({ key: z.string().optional(), versionId: z.string() }), z.object({ key: z.string().optional(), path: z.string() })])).min(1),
      output: z.object({
        resources: z.array(z.object({ key: z.string().optional(), mode: z.literal("create"), name: z.string().min(1) })).min(1),
        composition: z.object({ name: z.string().optional(), placements: z.array(z.object({ key: z.string().optional(), role: z.string().optional() })).min(1) }).optional(),
      }),
    },
  } as const;

  it("sources / output.resources / placements 都被包成 {item:…} 时也能通过", async () => {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool("deliver", spec, async (args) => { seen.push(args as Record<string, unknown>); return structuredReply({ ok: true }); });
    await h.call("deliver", {
      requestId: "deliver-koc-001",
      sources: { item: { key: "ref", path: "01_reference(3).jpg" } },
      output: {
        resources: { item: { key: "ref", mode: "create", name: "RTIC随行杯 产品参考图" } },
        composition: { name: "RTIC随行杯 15秒小红书KOC视频", placements: { item: { key: "ref", role: "产品参考图" } } },
      },
    });
    expect(seen[0]!.sources).toEqual([{ key: "ref", path: "01_reference(3).jpg" }]);
  });
});

describe("包壳 + 字符串数字同时出现（真机 composition_edit）", () => {
  const spec = {
    description: "composition_edit 形状兜底",
    inputSchema: {
      action: z.string(),
      compositionId: z.string(),
      expectedRevision: z.number().int(),
      operations: z.array(z.object({ op: z.string(), clientMemberKey: z.string().optional(), role: z.string().optional(), resourceId: z.string().optional() })).min(1),
    },
  } as const;

  it("operations 被包成 {item:…} 且 expectedRevision 是字符串时也能通过", async () => {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool("composition_edit", spec, async (args) => { seen.push(args as Record<string, unknown>); return structuredReply({ ok: true }); });
    await h.call("composition_edit", {
      action: "update",
      compositionId: "cmp_788a93687fd9",
      expectedRevision: "1",
      operations: { item: { op: "add_member", clientMemberKey: "storyboard", role: "分镜与口播", resourceId: "res_0bdce35c725c" } },
    });
    expect(seen[0]!.expectedRevision).toBe(1);
    expect(seen[0]!.operations).toEqual([{ op: "add_member", clientMemberKey: "storyboard", role: "分镜与口播", resourceId: "res_0bdce35c725c" }]);
  });
});

describe("路径驱动修复（真机 task_query：嵌套字符串数字 + mode 被包在 query 里）", () => {
  const spec = {
    description: "task_query 形状兜底",
    inputSchema: {
      mode: z.string(),
      query: z.object({ limit: z.number().int(), status: z.string().optional() }).optional(),
    },
  } as const;

  it("query.limit 是字符串时按报错路径修成数字", async () => {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool("task_query", spec, async (args) => { seen.push(args as Record<string, unknown>); return structuredReply({ ok: true }); });
    await h.call("task_query", { mode: "list", query: { limit: "20" } });
    expect(seen[0]!.query).toEqual({ limit: 20 });
  });
});

describe("analyse_media 的 v2 写法归一（真机 Required at references / type）", () => {
  const spec = {
    description: "analyse_media 兜底",
    inputSchema: {
      references: z.array(z.object({ versionId: z.string() })).min(1),
      type: z.enum(["metadata", "semantic", "both"]),
    },
  } as const;

  it("versionIds + mode 能补成 references + type", async () => {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool("analyse_media", spec, async (args) => { seen.push(args as Record<string, unknown>); return structuredReply({ ok: true }); });
    await h.call("analyse_media", { mode: "metadata", versionIds: { item: ["ver_a", "ver_b"] } });
    expect(seen[0]!.references).toEqual([{ versionId: "ver_a" }, { versionId: "ver_b" }]);
    expect(seen[0]!.type).toBe("metadata");
  });
});

describe("composition_edit 深层归一（真机连试 22 次）", () => {
  const spec = {
    description: "composition_edit 兜底",
    inputSchema: {
      action: z.enum(["ensure", "update", "batch"]),
      compositionId: z.string().optional(),
      operations: z.array(z.union([
        z.object({ action: z.literal("add_member"), resourceId: z.string(), role: z.string().optional() }),
        z.object({ action: z.literal("remove_member"), memberId: z.string() }),
      ])).min(1).optional(),
      commands: z.array(z.object({ action: z.literal("update"), compositionId: z.string(), operations: z.array(z.object({ action: z.literal("add_member"), resourceId: z.string() })).min(1) })).min(1).optional(),
    },
  } as const;

  it("operations 是 JSON 字符串且用 op 代替 action 时也能通过", async () => {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool("composition_edit", spec, async (args) => { seen.push(args as Record<string, unknown>); return structuredReply({ ok: true }); });
    await h.call("composition_edit", {
      action: "update",
      compositionId: "cmp_bc265287a197",
      operations: '[{"op":"add_member","resourceId":"res_6eb41b8ab19b"}]',
    });
    expect(seen[0]!.operations).toEqual([{ action: "add_member", resourceId: "res_6eb41b8ab19b" }]);
  });

  it("batch 的 commands 是字符串、内层也用 op", async () => {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool("composition_edit", spec, async (args) => { seen.push(args as Record<string, unknown>); return structuredReply({ ok: true }); });
    await h.call("composition_edit", {
      action: "batch",
      commands: '[{"action":"update","compositionId":"cmp_1","operations":[{"op":"add_member","resourceId":"res_1"}]}]',
    });
    expect(seen[0]!.commands).toEqual([{ action: "update", compositionId: "cmp_1", operations: [{ action: "add_member", resourceId: "res_1" }] }]);
  });
});

describe("可操作护栏（真机：analyse_media 失败→开 code-agent）", () => {
  it("references 用 path 时直接给出 design_deliver 的建 Resource 步骤", async () => {
    const h = createHarness();
    h.registrar.registerTool("analyse_media", {
      description: "t",
      inputSchema: {
        references: z.array(z.union([z.object({ resourceId: z.string() }), z.object({ versionId: z.string() })])).min(1),
        type: z.enum(["metadata", "semantic", "both"]),
      },
    }, async () => structuredReply({ ok: true }));
    let message = "";
    try {
      await h.call("analyse_media", { references: [{ path: "01_reference(3).jpg" }], type: "both" });
    } catch (error) {
      message = String(error);
    }
    expect(message).toContain("design_deliver");
    expect(message).toContain("versionId");
  });
});

describe("capability_list 的 operation 自造名（真机 text_to_video）", () => {
  const spec = {
    description: "capability_list 兜底",
    inputSchema: { operation: z.enum(["generate_image", "generate_video", "edit_media", "chat"]).optional() },
  } as const;

  it("text_to_video 归一到 generate_video", async () => {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool("capability_list", spec, async (args) => { seen.push(args as Record<string, unknown>); return structuredReply({ ok: true }); });
    await h.call("capability_list", { operation: "text_to_video" });
    expect(seen[0]!.operation).toBe("generate_video");
  });
});

describe("真机形状兜底（deepseek 实跑）", () => {
  it("analyse_media：顶层 versionId + instruction 能补成 references + question", async () => {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool("analyse_media", {
      description: "t",
      inputSchema: {
        references: z.array(z.union([z.object({ versionId: z.string() }), z.object({ resourceId: z.string() })])).min(1),
        type: z.enum(["metadata", "semantic", "both"]),
        question: z.string().optional(),
      },
    }, async (args) => { seen.push(args as Record<string, unknown>); return structuredReply({ ok: true }); });
    await h.call("analyse_media", { type: "both", instruction: "描述这张图", versionId: "res_1" });
    expect(seen[0]!.references).toEqual([{ versionId: "res_1" }]);
    expect(seen[0]!.question).toBe("描述这张图");
  });

  it("整份参数塞进 step 键时展开到顶层", async () => {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool("execute", {
      description: "t",
      inputSchema: { capabilityId: z.string(), params: z.record(z.string(), z.unknown()).optional() },
    }, async (args) => { seen.push(args as Record<string, unknown>); return structuredReply({ ok: true }); });
    await h.call("execute", { step: { capabilityId: "edit_media:ffmpeg", params: { args: ["-i", "x"] } } });
    expect(seen[0]!.capabilityId).toBe("edit_media:ffmpeg");
  });

  it("task_query 只给 taskId 时补 mode=get", async () => {
    const h = createHarness();
    const seen: Record<string, unknown>[] = [];
    h.registrar.registerTool("task_query", {
      description: "t",
      inputSchema: { mode: z.enum(["get", "list"]), taskId: z.string().optional() },
    }, async (args) => { seen.push(args as Record<string, unknown>); return structuredReply({ ok: true }); });
    await h.call("task_query", { taskId: "tsk_1" });
    expect(seen[0]!.mode).toBe("get");
  });
});
