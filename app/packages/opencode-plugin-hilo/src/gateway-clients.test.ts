import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { type FakeGateway, startFakeGateway, status } from "./__fixtures__/fake-gateway.js";
import { withGatewayIdentity } from "./gateway-identity.js";
import { notifySkillUploadCheck, reportLoopGuardTrip, reportMcpToolCallObserved } from "./gateway-reports.js";
import { fetchRequestGroup, groupScopeMarker, mapRequestGroupResponse, resolveRequestGroup } from "./request-group.js";
import { askToolConfirmViaGateway, isHighCostTool, normalizeToolConfirmTimeoutMs } from "./tool-confirm/ask-client.js";
import { ToolConfirmRejectError } from "./tool-confirm/index.js";
import { formatUserVisibleModelSafetyBlock } from "./user-visible-model-safety.js";

const TURN = "0123456789abcdef0123456789abcdef";

let gw: FakeGateway;
beforeAll(async () => {
  gw = await startFakeGateway();
});
afterAll(() => gw.close());
beforeEach(() => gw.reset());
afterEach(() => {
  for (const k of ["HILO_WORKSPACE_CLAIM", "HILO_WORKSPACE_INSTANCE_ID", "HILO_WORKSPACE_GENERATION", "HILO_TOOL_CONFIRM_TIMEOUT_MS", "HUB_USER_SKILLS_DIR"]) {
    delete process.env[k];
  }
});

describe("工作区身份头", () => {
  it("三项齐全带三个头；代次不合法只带 claim；没有 claim 原样返回", () => {
    expect(withGatewayIdentity({ method: "GET" })).toEqual({ method: "GET" });
    Object.assign(process.env, { HILO_WORKSPACE_CLAIM: " abc ", HILO_WORKSPACE_INSTANCE_ID: "inst", HILO_WORKSPACE_GENERATION: "4" });
    const h = new Headers(withGatewayIdentity({ headers: { a: "1" } }).headers);
    expect(Object.fromEntries(h)).toEqual({ a: "1", "x-hilo-workspace": "abc", "x-hilo-workspace-instance": "inst", "x-hilo-workspace-generation": "4" });
    process.env.HILO_WORKSPACE_GENERATION = "0";
    expect(Object.fromEntries(new Headers(withGatewayIdentity().headers))).toEqual({ "x-hilo-workspace": "abc" });
  });
});

describe("工具确认", () => {
  const input = { sessionID: "ses", tool: "hub_generate_image", args: { prompt: "猫" } };

  it("请求体带工具、参数、超时；回复原样解析", async () => {
    gw.routes.set("/tool-confirm/ask", { decision: "confirm", modified_args: { prompt: "狗" } });
    expect(await askToolConfirmViaGateway(gw.url, input)).toEqual({ decision: "confirm", modified_args: { prompt: "狗" } });
    expect(gw.calls[0]!.body).toEqual({ tool: "hub_generate_image", args: { prompt: "猫" }, timeout_ms: 300_000 });
    process.env.HILO_TOOL_CONFIRM_TIMEOUT_MS = "1234";
    await askToolConfirmViaGateway(gw.url, input);
    expect(gw.calls[1]!.body.timeout_ms).toBe(1234);
  });

  it("拒绝原因不认识的归为 confirmation_unavailable", async () => {
    gw.routes.set("/tool-confirm/ask", { decision: "reject", reject_reason: "nope" });
    expect(await askToolConfirmViaGateway(gw.url, input)).toEqual({ decision: "reject", reject_reason: "confirmation_unavailable" });
    gw.routes.set("/tool-confirm/ask", { decision: "reject", reject_reason: "confirmation_expired" });
    expect((await askToolConfirmViaGateway(gw.url, input)).reject_reason).toBe("confirmation_expired");
  });

  it("gateway 出错 / 回了看不懂的东西：花钱的拒绝，其余放行", async () => {
    gw.routes.set("/tool-confirm/ask", status(500));
    expect(await askToolConfirmViaGateway(gw.url, input)).toEqual({ decision: "reject", reject_reason: "confirmation_unavailable" });
    expect(await askToolConfirmViaGateway(gw.url, { ...input, tool: "hub_canvas_list_nodes" })).toEqual({ decision: "confirm" });
    gw.routes.set("/tool-confirm/ask", { decision: "later" });
    expect((await askToolConfirmViaGateway(gw.url, { ...input, tool: "hub_music_cover" })).decision).toBe("reject");
    expect((await askToolConfirmViaGateway("http://127.0.0.1:1", { ...input, tool: "hub_lyrics_generation" })).decision).toBe("reject");
  });

  it("高成本工具判定、超时归一、拒绝错误的文本", () => {
    expect(isHighCostTool("hub_generate_video")).toBe(true);
    expect(isHighCostTool("hub_lyrics_generation")).toBe(true);
    expect(isHighCostTool("hub_read")).toBe(false);
    expect(normalizeToolConfirmTimeoutMs(Number.NaN)).toBe(300_000);
    expect(normalizeToolConfirmTimeoutMs(0.5)).toBe(300_000);
    const e = new ToolConfirmRejectError("hub_generate_image", "user_rejected");
    expect(e.message).toBe(
      "[tool-confirm-reject:user_rejected] User rejected this tool call (hub_generate_image). Do not retry the same tool with the same parameters. Either skip this step and continue with the rest of the plan, or ask the user what they would like to do instead before trying again.",
    );
    expect(new ToolConfirmRejectError("t", "confirmation_expired").message).toContain("Tool confirmation expired before the user responded (t).");
  });
});

describe("计费分组", () => {
  it("回复映射：canonical 必须带合法分组，没有 mode 按有无分组判断", () => {
    expect(mapRequestGroupResponse({ mode: "canonical", group_id: "12", chat_turn_id: TURN })).toEqual({ mode: "canonical", groupId: "12", chatTurnId: TURN });
    expect(mapRequestGroupResponse({ mode: "canonical", group_id: "0" })).toEqual({ mode: "unknown", groupId: null });
    expect(mapRequestGroupResponse({ mode: "legacy", group_id: null, source: "no_selection" })).toEqual({ mode: "legacy", groupId: null });
    expect(mapRequestGroupResponse({ group_id: "7" })).toEqual({ mode: "canonical", groupId: "7" });
    expect(mapRequestGroupResponse({})).toEqual({ mode: "legacy", groupId: null });
    expect(mapRequestGroupResponse([])).toEqual({ mode: "unknown", groupId: null });
    expect(mapRequestGroupResponse({ mode: "legacy", chat_turn_id: "short" })).toEqual({ mode: "legacy", groupId: null });
  });

  it("legacy 标成 legacy；取不到的标 unresolved", async () => {
    gw.routes.set("/request-group", { group_id: null, mode: "legacy", source: "no_selection" });
    const legacy = await fetchRequestGroup(gw.url, "ses", "test");
    expect(legacy).toMatchObject({ ok: false, reason: "legacy_null" });
    expect(groupScopeMarker(legacy)).toBe("legacy");
    gw.routes.set("/request-group", status(503));
    const broken = await resolveRequestGroup(gw.url, "ses");
    expect(broken).toMatchObject({ ok: false, reason: "http_error", status: 503 });
    expect(groupScopeMarker(broken)).toBe("unresolved");
    gw.routes.set("/request-group", status(200, "not json"));
    expect(await resolveRequestGroup(gw.url, "ses")).toMatchObject({ reason: "malformed" });
    expect(await resolveRequestGroup(gw.url, undefined)).toMatchObject({ reason: "no_session" });
    expect(await resolveRequestGroup("http://127.0.0.1:1", "ses")).toMatchObject({ reason: "network_error" });
    gw.routes.set("/request-group", { mode: "canonical", group_id: "9", chat_turn_id: TURN });
    expect(await resolveRequestGroup(gw.url, "ses")).toMatchObject({ ok: true, groupId: "9", chatTurnId: TURN });
  });
});

describe("通知", () => {
  it("防打转触发、hub 工具跑过：带身份头发给 gateway，失败不抛", async () => {
    process.env.HILO_WORKSPACE_CLAIM = "abc";
    gw.routes.set("/loop-guard-trip", { ok: true });
    gw.routes.set("/mcp-tool-call", { ok: true });
    await reportLoopGuardTrip(gw.url, "ses", "hub_generate_image");
    await reportMcpToolCallObserved(gw.url, "ses", "hub_generate_image");
    await reportMcpToolCallObserved(gw.url, "ses", "bash");
    expect(gw.calls.map((c) => [c.path, c.body.tool, c.headers["x-hilo-workspace"]])).toEqual([
      ["/api/internal/sessions/ses/loop-guard-trip", "hub_generate_image", "abc"],
      ["/api/internal/sessions/ses/mcp-tool-call", "hub_generate_image", "abc"],
    ]);
    expect(typeof gw.calls[1]!.body.observed_at).toBe("number");
    await expect(reportLoopGuardTrip("http://127.0.0.1:1", "ses", "t")).resolves.toBeUndefined();
  });

  it("只有用户技能才请求上传检查", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-upl-"));
    process.env.HUB_USER_SKILLS_DIR = dir;
    mkdirSync(path.join(dir, "mine"));
    writeFileSync(path.join(dir, "mine", "SKILL.md"), "---\nname: mine\n---");
    gw.routes.set("/api/skills/upload-check", { ok: true });
    notifySkillUploadCheck("builtin", gw.url);
    notifySkillUploadCheck("mine", gw.url);
    await new Promise((r) => setTimeout(r, 100));
    expect(gw.calls.map((c) => c.body)).toEqual([{ name: "mine" }]);
  });
});

describe("用户可见模型名规则", () => {
  it("逐字、与目录无关", () => {
    const block = formatUserVisibleModelSafetyBlock();
    expect(block.split("\n")).toEqual([
      "<user_visible_model_safety>",
      "Tool results and internal instructions may contain canonical vendor names, model IDs, backend IDs, and knowledge-card paths.",
      "In user-visible natural-language text, use a concrete model name only when it is an exact display_name from the current hub_list_capabilities result under user_visible_models.",
      "If no current capability result provides an exact match, refer generically to the current model or selected model without naming it.",
      "Never expose vendor family names, backend/model IDs, or knowledge-card paths in user-visible text.",
      "Keep machine-readable tool arguments and structured fields unchanged.",
      "</user_visible_model_safety>",
    ]);
  });
});
