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
