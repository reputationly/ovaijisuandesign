/**
 * RequestGroupRegistry（4.0.3 回合范围登记表）的行为测试。
 *
 * 重点验证参照里那几条「不说就会踩」的规则：
 *   · 栅栏不匹配时不删（防迟到的终止帧删掉新回合）
 *   · UI id 与 runtime id 都能查到同一个 scope，runtime 优先
 *   · 模式变更要跟进到回合，且不破坏已有引用
 *   · canonical / legacy / unknown 三种解析结果
 */
import { describe, expect, it } from "vitest";

import { RequestGroupRegistry, chatTurnId } from "./request-group.registry.js";

describe("chatTurnId", () => {
  it("同一个 clientMessageId 返回同一个 id", () => {
    expect(chatTurnId("m1")).toBe(chatTurnId("m1"));
  });
  it("不同 clientMessageId 返回不同 id", () => {
    expect(chatTurnId("m2")).not.toBe(chatTurnId("m3"));
  });
  it("形如 8 位时间戳 + 24 位摘要", () => {
    expect(chatTurnId("m4")).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("RequestGroupRegistry", () => {
  it("openTurn 有 groupId -> canonical，无 -> legacy", () => {
    const r = new RequestGroupRegistry();
    r.openTurn({ uiSessionId: "u1", groupId: "g1" });
    expect(r.resolveConversation({ uiSessionId: "u1" })).toMatchObject({ mode: "canonical", groupId: "g1" });
    r.openTurn({ uiSessionId: "u2" });
    expect(r.resolveConversation({ uiSessionId: "u2" })).toMatchObject({ mode: "legacy" });
  });

  it("查不到 -> unknown", () => {
    const r = new RequestGroupRegistry();
    expect(r.resolveConversation({ uiSessionId: "nope" })).toEqual({ mode: "unknown" });
  });

  it("bindRuntimeSession 之后按 runtime id 也能查到，且 runtime 优先", () => {
    const r = new RequestGroupRegistry();
    r.openTurn({ uiSessionId: "u1", groupId: "g1" });
    r.bindRuntimeSession("u1", "rt1");
    expect(r.resolveConversation({ runtimeSessionId: "rt1" })).toMatchObject({ mode: "canonical" });
    // 两个都给时以 runtime 为准
    r.openTurn({ uiSessionId: "u2", groupId: "g2" });
    expect(r.resolveConversation({ runtimeSessionId: "rt1", uiSessionId: "u2" })).toMatchObject({
      groupId: "g1",
    });
  });

  it("closeTurn 栅栏不匹配时不删（防迟到终止帧误删新回合）", () => {
    const r = new RequestGroupRegistry();
    const fence = r.openTurn({ uiSessionId: "u1" });
    expect(r.closeTurn("u1", fence + 999)).toBe(false);
    expect(r.resolveConversation({ uiSessionId: "u1" }).mode).toBe("legacy");
    expect(r.closeTurn("u1", fence)).toBe(true);
    expect(r.resolveConversation({ uiSessionId: "u1" }).mode).toBe("unknown");
  });

  it("按 chatTurnId 能查到 sourceType / sessionMode / 选型", () => {
    const r = new RequestGroupRegistry();
    r.openTurn({
      uiSessionId: "u1",
      clientMessageId: "m1",
      sourceType: "Hub",
      sessionMode: "auto",
      selectedMediaModels: { image: "m" },
    });
    const id = chatTurnId("m1");
    expect(r.resolveSourceTypeByChatTurnId(id)).toBe("Hub");
    expect(r.resolveSessionModeByChatTurnId(id)).toBe("auto");
    expect(r.resolveSelectedMediaModelsByChatTurnId(id)).toEqual({ image: "m" });
  });

  it("setSessionMode 跟进到回合，之后查得到新模式", () => {
    const r = new RequestGroupRegistry();
    r.openTurn({ uiSessionId: "u1", clientMessageId: "m2", sessionMode: "auto" });
    r.bindRuntimeSession("u1", "rt1");
    r.setSessionMode("u1", "rt1", "ask");
    expect(r.resolveSessionModeByChatTurnId(chatTurnId("m2"))).toBe("ask");
    expect(r.resolveConversation({ runtimeSessionId: "rt1" })).toMatchObject({
      scope: { sessionMode: "ask" },
    });
  });

  it("openTurnForSession 会写回会话上的镜像字段", () => {
    const r = new RequestGroupRegistry();
    const session = { uiSessionId: "u1", mode: "auto" };
    r.openTurnForSession(session, "g1", "m3", "Hub");
    expect(session.currentTurnGroupId).toBe("g1");
    expect(session.currentTurnSequence).toBeGreaterThan(0);
  });

  it("size 反映两张表的条数", () => {
    const r = new RequestGroupRegistry();
    r.openTurn({ uiSessionId: "u1", runtimeSessionId: "rt1" });
    expect(r.size()).toEqual({ uiSessions: 1, runtimeSessions: 1 });
  });
});
