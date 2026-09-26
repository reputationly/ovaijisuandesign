import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { type FakeGateway, startFakeGateway, status } from "./__fixtures__/fake-gateway.js";
import { rememberSessionAgent, SESSION_AGENT_CACHE_MAX, sessionAgentCache } from "./_session-agent-cache.js";
import {
  _resetSessionSkillGrantsForTests,
  getAgentRef,
  getGrants,
  hasSkillLoaded,
  recordGrant,
  recordSkillLoaded,
  rememberAgentRef,
  resolveRootSession,
} from "./_session-skill-grants.js";
import { _resetWorkingLanguageForTests, getWorkingLanguage, getWorkingLanguageForSessions, rememberWorkingLanguage } from "./_session-working-language.js";
import {
  collectMessageSessionIds,
  formatWorkingLanguage,
  getEffectiveWorkingLanguage,
  getEffectiveWorkingLanguageForSessions,
  workingLanguageFromParts,
} from "./working-language.js";

let gw: FakeGateway;
beforeAll(async () => {
  gw = await startFakeGateway();
});
afterAll(() => gw.close());
beforeEach(() => {
  gw.reset();
  _resetSessionSkillGrantsForTests();
  _resetWorkingLanguageForTests();
});

describe("会话 → agent 缓存", () => {
  it("LRU：重复写入挪到最新，超过上限淘汰最旧的", () => {
    sessionAgentCache.clear();
    rememberSessionAgent("first", "media-agent");
    for (let i = 0; i < SESSION_AGENT_CACHE_MAX - 1; i++) rememberSessionAgent(`s${i}`, "executor");
    rememberSessionAgent("first", "planner");
    rememberSessionAgent("overflow", "router");
    expect(sessionAgentCache.size).toBe(SESSION_AGENT_CACHE_MAX);
    expect(sessionAgentCache.get("first")).toBe("planner");
    expect(sessionAgentCache.has("s0")).toBe(false);
  });
});

describe("技能授权缓存", () => {
  it("只收 hub_ 工具；按根会话、agent 分桶", () => {
    recordGrant("root", "media-agent", ["question", "hub_generate_image", "bash", "hub_generate_image"]);
    recordGrant("root", "executor", ["hub_analyse_media"]);
    expect([...getGrants("root")!.get("media-agent")!]).toEqual(["hub_generate_image"]);
    expect([...getGrants("root")!.get("executor")!]).toEqual(["hub_analyse_media"]);
    expect(getGrants("other")).toBeUndefined();
  });

  it("已加载技能、agent 引用", () => {
    recordSkillLoaded("root", "control-in-app-browser");
    expect(hasSkillLoaded("root", "control-in-app-browser")).toBe(true);
    expect(hasSkillLoaded("root", "x")).toBe(false);
    const agent = { name: "media-agent", permission: [] };
    rememberAgentRef("ses", agent);
    expect(getAgentRef("ses")).toBe(agent);
  });

  it("根会话：问 gateway 并缓存；出错当自己是根且不缓存", async () => {
    gw.routes.set("/root", { rootSessionId: "ses_root" });
    expect(await resolveRootSession("ses_child", gw.url)).toBe("ses_root");
    expect(await resolveRootSession("ses_child", gw.url)).toBe("ses_root");
    expect(gw.calls).toHaveLength(1);
    gw.routes.set("/root", status(500));
    expect(await resolveRootSession("ses_x", gw.url)).toBe("ses_x");
    gw.routes.set("/root", { rootSessionId: "ses_root2" });
    expect(await resolveRootSession("ses_x", gw.url)).toBe("ses_root2");
    expect(await resolveRootSession("ses_y", "http://127.0.0.1:1")).toBe("ses_y");
  });
});

describe("工作语言", () => {
  it("从 part metadata 读，来源不认识的不算", () => {
    expect(workingLanguageFromParts([{ metadata: { hilo_working_language: { locale: "ja", source: "bogus" } } }])).toBeUndefined();
    expect(workingLanguageFromParts([{}, { metadata: { hilo_working_language: { locale: "ja", source: "explicit" } } }])).toEqual({ locale: "ja", source: "explicit" });
  });

  it("注入块逐字", () => {
    const block = formatWorkingLanguage({ locale: "zh-CN", source: "ui-preference" });
    expect(block.split("\n")).toHaveLength(10);
    expect(block).toMatch(/^<working-language>\nworking_language: zh-CN\nsource: ui-preference\nUse zh-CN as working_language for interaction/);
    expect(block).toContain("Render every user-visible Question header, question, option label, and description in working_language.");
    expect(block.endsWith("</working-language>")).toBe(true);
  });

  it("LRU 缓存；多个会话取第一个有的", () => {
    rememberWorkingLanguage("a", { locale: "en", source: "session" });
    expect(getWorkingLanguage("a")).toEqual({ locale: "en", source: "session" });
    expect(getWorkingLanguage(undefined)).toBeUndefined();
    expect(getWorkingLanguageForSessions(["x", "a"])).toEqual({ locale: "en", source: "session" });
  });

  it("子会话自己没有就沿根会话取", async () => {
    rememberWorkingLanguage("ses_root", { locale: "zh-CN", source: "ui-preference" });
    gw.routes.set("/root", { rootSessionId: "ses_root" });
    expect(await getEffectiveWorkingLanguage("ses_child", gw.url)).toEqual({ locale: "zh-CN", source: "ui-preference" });
    expect(await getEffectiveWorkingLanguageForSessions(["ses_child2"], gw.url)).toEqual({ locale: "zh-CN", source: "ui-preference" });
    gw.routes.set("/root", { rootSessionId: null });
    expect(await getEffectiveWorkingLanguage("ses_lonely", gw.url)).toBeUndefined();
  });

  it("从消息和 part 上收集会话 id", () => {
    expect(collectMessageSessionIds([{ info: { sessionID: "a" }, parts: [{ sessionID: "b" }, { sessionID: "" }, {}] }, { info: {}, parts: [{ sessionID: "a" }] }])).toEqual(["a", "b"]);
  });
});
