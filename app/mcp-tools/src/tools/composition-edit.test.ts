import { describe, expect, it, vi } from "vitest";

import { registerV3Tools } from "./v3-tools.js";

function harness() {
  const tools = new Map<string, (args: unknown) => Promise<unknown>>();
  const registrar = {
    registerTool: (name: string, _meta: unknown, fn: (args: unknown) => Promise<unknown>) => {
      tools.set(name, fn);
    },
  };
  const gw = { post: vi.fn().mockResolvedValue({ commandId: "auto-x", committed: true, compositionId: "cmp_1", revision: 2 }) };
  registerV3Tools(registrar as never, gw as never, "cn" as never);
  return { tools, gw };
}

const bodyOf = (gw: ReturnType<typeof harness>["gw"], index = 0) =>
  (gw.post.mock.calls[index] as unknown[])[1] as Record<string, unknown>;
const textOf = (reply: unknown) => JSON.stringify(reply ?? "");

describe("design_composition_edit 的动作映射", () => {
  it("update 把 add/remove/update_member 映射成 composition.apply，并把 clientMemberKey 映射回 memberId", async () => {
    const { tools, gw } = harness();
    const reply = (await tools.get("composition_edit")!({
      action: "update",
      compositionId: "cmp_1",
      expectedRevision: 1,
      operations: [
        { action: "add_member", clientMemberKey: "hero", role: "主角", resourceId: "res_1" },
        { action: "remove_member", memberId: "mem_old" },
        { action: "update_member", memberId: "mem_2", role: "配角" },
      ],
    })) as { structuredContent?: { memberIds?: Record<string, string> } };
    const body = bodyOf(gw);
    expect(body.command).toMatchObject({
      type: "composition.apply",
      compositionId: "cmp_1",
      operations: [
        { type: "member.add", member: { role: "主角", resource: "res_1" } },
        { type: "member.remove", memberId: "mem_old" },
        { type: "member.update", memberId: "mem_2", role: "配角" },
      ],
    });
    const memberIds = reply.structuredContent?.memberIds ?? {};
    expect(memberIds.hero).toMatch(/^mem_[0-9a-f]{12}$/);
    expect((body.command as { operations: { member?: { memberId: string } }[] }).operations[0]!.member!.memberId).toBe(memberIds.hero);
  });

  it("set_attributes 映射成 composition.set_attributes（set/unset 都带上）", async () => {
    const { tools, gw } = harness();
    await tools.get("composition_edit")!({
      action: "set_attributes",
      compositionId: "cmp_1",
      expectedRevision: 3,
      attributes: { 地区: "西部" },
      unset: ["旧字段"],
    });
    expect(bodyOf(gw).command).toMatchObject({
      type: "composition.set_attributes",
      compositionId: "cmp_1",
      set: [{ name: "地区", value: "西部" }],
      unset: ["旧字段"],
    });
  });

  it("move 不带 expectedRevision（内核按位置自己处理冲突）", async () => {
    const { tools, gw } = harness();
    await tools.get("composition_edit")!({ action: "move", compositionId: "cmp_1", expectedRevision: 7, position: 4 });
    const body = bodyOf(gw);
    expect(body.expectedRevision).toBeUndefined();
    expect(body.command).toMatchObject({ type: "composition.move", position: 4 });
  });

  it("duplicate 映射成 composition.duplicate", async () => {
    const { tools, gw } = harness();
    await tools.get("composition_edit")!({ action: "duplicate", compositionId: "cmp_1", position: 9 });
    expect(bodyOf(gw).command).toMatchObject({ type: "composition.duplicate", sourceCompositionId: "cmp_1", position: 9 });
  });

  it("不支持的动作给出可用清单；update 缺 operations 直接说清", async () => {
    const { tools } = harness();
    expect(textOf(await tools.get("composition_edit")!({ action: "frobnicate", compositionId: "cmp_1" }))).toMatch(/ensure/);
    expect(textOf(await tools.get("composition_edit")!({ action: "update", compositionId: "cmp_1", operations: [] }))).toMatch(/operations/);
  });
});

describe("design_deliver 的报错翻译", () => {
  it("来源版本不存在时给出可操作提示，而不是原样 404", async () => {
    const tools = new Map<string, (args: unknown) => Promise<unknown>>();
    const registrar = {
      registerTool: (name: string, _meta: unknown, fn: (args: unknown) => Promise<unknown>) => {
        tools.set(name, fn);
      },
    };
    const gw = { post: vi.fn().mockRejectedValue(new Error("NOT_FOUND: Delivery source version ver_missing")) };
    registerV3Tools(registrar as never, gw as never, "cn" as never);
    const reply = await tools.get("deliver")!({ sources: [{ versionId: "ver_missing" }] });
    const text = textOf(reply);
    expect(text).toMatch(/不存在或已删除/);
    expect(text).toMatch(/不要重试同一个 id/);
  });
});
