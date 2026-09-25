import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/**
 * 环境变量集中在这里。全部按调用时读 —— 测试里改 process.env 立即生效，
 * 也和 opencode 按会话注入的变量保持一致。
 */

export type ReleaseRegion = "domestic" | "overseas";

export function gatewayUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.GATEWAY_URL || "http://localhost:8001";
}

/**
 * 所在工作区 gateway 的身份头。主进程经 opencode 的 MCP 环境变量传进来；gateway 对缺身份的请求回 428（读请求缺 claim、写请求缺任何一项）、
 * 对不上的回 409 —— 防的是 gateway 重启后这个 MCP 进程还往旧地址写。没有这些变量（独立跑）就不带。
 */
export function workspaceIdentityHeaders(env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const out: Record<string, string> = {};
  const set = (header: string, v: string | undefined) => {
    if (v?.trim()) out[header] = v.trim();
  };
  set("x-hilo-workspace", env.HILO_WORKSPACE_CLAIM);
  set("x-hilo-workspace-instance", env.HILO_WORKSPACE_INSTANCE_ID);
  set("x-hilo-workspace-generation", env.HILO_WORKSPACE_GENERATION);
  return out;
}

/** 影响部分枚举与描述；未知值按 domestic。 */
export function releaseRegion(env: NodeJS.ProcessEnv = process.env): ReleaseRegion {
  return env.HILO_RELEASE_REGION === "overseas" ? "overseas" : "domestic";
}

export const DEFAULT_CONNECT_TIMEOUT_MS = 5_000;

export function connectTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.HILO_CONNECT_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CONNECT_TIMEOUT_MS;
}

export function ffprobePath(env: NodeJS.ProcessEnv = process.env): string {
  return env.FFPROBE_PATH || (process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
}

export function ffmpegPath(env: NodeJS.ProcessEnv = process.env): string {
  return env.FFMPEG_PATH || (process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
}

export const BUNDLED_CJK_FONT_ENV = "HILO_BUNDLED_CJK_FONT_PATH";

export function bundledCjkFontPath(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const v = env[BUNDLED_CJK_FONT_ENV]?.trim();
  return v ? v : undefined;
}

/** 数据根是 ~/.ovhub（不是 ~/.hub），和 desktop / 插件同一约定。 */
export function dataRoot(env: NodeJS.ProcessEnv = process.env): string {
  return env.HILO_DATA_DIR || path.join(homedir(), ".ovhub");
}

export function userMemoryDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.HUB_MEMORY_DIR || path.join(dataRoot(env), "memory");
}

export function projectMemoryDir(projectRoot: string): string {
  return path.join(projectRoot, ".hilo", "memory");
}

/**
 * knowledge 目录：显式变量 → `$OPENCODE_CONFIG_DIR/knowledge` → cwd 上两级的
 * `.opencode-v2/knowledge`。都不存在返回 null，调用方给出可读的报错。
 */
export function knowledgeDir(env: NodeJS.ProcessEnv = process.env): string | null {
  const explicit = env.HILO_KNOWLEDGE_DIR;
  if (explicit && existsSync(explicit)) return explicit;
  const configDir = env.OPENCODE_CONFIG_DIR;
  if (configDir) {
    const derived = path.join(configDir, "knowledge");
    if (existsSync(derived)) return derived;
  }
  const fromCwd = path.resolve(process.cwd(), "..", "..", ".opencode-v2", "knowledge");
  return existsSync(fromCwd) ? fromCwd : null;
}

/** workflows 目录：显式变量给了就只认它（不存在即 null），否则看 OPENCODE_CONFIG_DIR。 */
export function workflowsDir(env: NodeJS.ProcessEnv = process.env): string | null {
  const explicit = env.HILO_WORKFLOWS_DIR;
  if (explicit) return existsSync(explicit) ? explicit : null;
  const configDir = env.OPENCODE_CONFIG_DIR;
  if (configDir) {
    const derived = path.join(configDir, "workflows");
    return existsSync(derived) ? derived : null;
  }
  return null;
}

export const AGENT_RUN_ID_ENV = "HILO_AGENT_RUN_ID";
