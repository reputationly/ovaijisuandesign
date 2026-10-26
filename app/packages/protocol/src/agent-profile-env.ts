/**
 * agent profile 的版本开关。参照 4.0.4 的 `../protocol/dist/agent-profile-env.js`。
 *
 * 和 `HILO_PROJECT_ARCHITECTURE` 不是一回事：那个是"项目内核用哪版"（resource_v3 与否），
 * 这个是"agent 工具面用哪一版"（2 或 3）。插件里按它决定工具名、记忆工具名等，
 * 所以必须有一处统一解析，不能各调用点自己 `parseInt(process.env[...])`。
 */
export const AGENT_PROFILE_VERSION_ENV = "HILO_AGENT_PROFILE_VERSION";

/**
 * 项目内核的架构开关（`resource_v3` 与否）。插件用它决定"素材按路径报还是按
 * Resource/Version 报"——v3 的 `design_*` 产出没有路径。
 */
export const HILO_PROJECT_ARCHITECTURE_ENV = "HILO_PROJECT_ARCHITECTURE";

export type AgentProfileVersion = 2 | 3;

/** 缺省是 2（老会话不设这个变量）；非法值直接抛，别猜。 */
export function parseAgentProfileVersion(value: unknown): AgentProfileVersion {
  if (value === undefined || value === null || value === "" || value === "2") return 2;
  if (value === "3") return 3;
  throw new Error(`Unsupported agent profile version: ${String(value)}`);
}
