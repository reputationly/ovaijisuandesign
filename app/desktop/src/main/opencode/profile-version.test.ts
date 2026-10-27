import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { agentProfileVersion, buildMcpEnvironment, profileArchitecture } from "./index.js";

/**
 * 插件按 `HILO_AGENT_PROFILE_VERSION` 决定走 v2 还是 v3 工具面（记忆用哪个工具、
 * 素材按 Resource/Version 还是按路径报）。桌面端不设它的话，v3 架构下插件**永远走 v2**，
 * 单测里手动设变量能过、真机却一条 v3 逻辑都不生效 —— 这条用例盯的就是这个缺口。
 */
const saved = { ...process.env };

afterEach(() => {
  process.env = { ...saved };
});

function mcpEnv() {
  return buildMcpEnvironment(
    { gatewayUrl: "http://127.0.0.1:1", skillsDir: "/tmp/skills", identity: {} },
    { synced: "/tmp/config-v2" },
  );
}

describe("agent profile 版本（产品只跑 v3）", () => {
  it("无论环境变量怎么设，架构恒为 v3、版本号恒为 '3'", () => {
    delete process.env.HILO_PROJECT_ARCHITECTURE;
    expect(profileArchitecture()).toBe("v3");
    expect(agentProfileVersion()).toBe("3");
    expect(mcpEnv().HILO_AGENT_PROFILE_VERSION).toBe("3");

    // 有人（或旧脚本）把开关设成 legacy 也不影响：v2 不在任何启动路径上。
    process.env.HILO_PROJECT_ARCHITECTURE = "legacy";
    expect(profileArchitecture()).toBe("v3");
    expect(agentProfileVersion()).toBe("3");
    delete process.env.HILO_PROJECT_ARCHITECTURE;
  });

  it("和插件侧的解析规则对得上（parseAgentProfileVersion 认 '3'）", async () => {
    const { parseAgentProfileVersion } = await import("@ov/protocol");
    expect(parseAgentProfileVersion(mcpEnv().HILO_AGENT_PROFILE_VERSION)).toBe(3);
  });
});
