/**
 * 能力搜索工具的**名字**。参照 4.0.4 的 `../protocol/dist/capability-search.js`。
 *
 * 为什么要有这张表：这个工具在两个 profile 里叫不同名字（v2 `hub_capability_search`、
 * v3 `design_capability_search`），而插件里有多处"这是不是能力搜索工具"的判断
 * （连接器发现流程要求先搜、再选中）。把名字抄在调用点，v3 会话就会出现
 * "要用户先搜索、却永远匹配不到那个工具"的死结。
 */
export const CAPABILITY_SEARCH_TOOL_NAMES = {
  2: "hub_capability_search",
  3: "design_capability_search",
} as const;

/** 2 | 3，与 `agent-profile-env.ts` 的 `AgentProfileVersion` 是同一个概念。 */
export type CapabilitySearchProfile = keyof typeof CAPABILITY_SEARCH_TOOL_NAMES;

const CAPABILITY_SEARCH_TOOLS = new Set<string>(Object.values(CAPABILITY_SEARCH_TOOL_NAMES));

export function isCapabilitySearchTool(name: unknown): boolean {
  return typeof name === "string" && CAPABILITY_SEARCH_TOOLS.has(name);
}

export function capabilitySearchToolName(profile: CapabilitySearchProfile): string {
  return CAPABILITY_SEARCH_TOOL_NAMES[profile];
}
