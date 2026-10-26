import { describe, expect, it } from "vitest";

import { AGENT_PROFILE_VERSION_ENV, parseAgentProfileVersion } from "./agent-profile-env.js";
import { CAPABILITY_SEARCH_TOOL_NAMES, capabilitySearchToolName, isCapabilitySearchTool } from "./capability-search.js";

describe("能力搜索工具名", () => {
  it("两套 profile 各有一个名字", () => {
    expect(capabilitySearchToolName(2)).toBe("hub_capability_search");
    expect(capabilitySearchToolName(3)).toBe("design_capability_search");
  });

  it("两个名字都算能力搜索工具", () => {
    for (const name of Object.values(CAPABILITY_SEARCH_TOOL_NAMES)) expect(isCapabilitySearchTool(name)).toBe(true);
  });

  it("别的东西不算（空值、别的工具、非字符串）", () => {
    expect(isCapabilitySearchTool("hub_generate_image")).toBe(false);
    expect(isCapabilitySearchTool("design_capability_list")).toBe(false);
    expect(isCapabilitySearchTool(undefined)).toBe(false);
    expect(isCapabilitySearchTool(3)).toBe(false);
  });
});

describe("parseAgentProfileVersion", () => {
  it("不设就是 2（老会话），设 3 才是 3", () => {
    expect(parseAgentProfileVersion(undefined)).toBe(2);
    expect(parseAgentProfileVersion("2")).toBe(2);
    expect(parseAgentProfileVersion("3")).toBe(3);
    expect(AGENT_PROFILE_VERSION_ENV).toBe("HILO_AGENT_PROFILE_VERSION");
  });

  it("不认识的值直接抛，不猜", () => {
    expect(() => parseAgentProfileVersion("4")).toThrow(/Unsupported agent profile version/);
    expect(() => parseAgentProfileVersion("v3")).toThrow();
  });
});
