/**
 * 备好一次 opencode 启动：同步 profile → staging（合同拼接）→ 依赖标记 → 生成配置。
 *
 * ```text
 * profile 源 ─ sync ─► <hubRoot>/.config-v2 ─ stage ─► tmp/ov-opencode-staging-<pid>   OPENCODE_CONFIG_DIR
 * buildOpencodeConfig ─► tmp/ov-opencode-config-<pid>-<uuid>.json                     OPENCODE_CONFIG
 * ```
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { buildOpencodeConfig, type Platform, writeConfigFile, writeDependencyMarkers } from "./config.js";
import { assertProfileComplete, type ProfileSource, stageProfile, syncProfile } from "./profile.js";
import type { LaunchSpec } from "./runtime.js";

export * from "./config.js";
export * from "./profile.js";
export * from "./runtime.js";

/** base.json 的分区层是 `base.<region>.json`。只有国内这一个。 */
export const REGION = "domestic";

/**
 * opencode 的运行时开关：
 * - DISABLE_PROJECT_CONFIG：工作区是用户内容，不是 agent 配置。不关的话 opencode 会
 *   从工作区往上收集 `.opencode` 目录当配置源（还会去那里 npm install）。
 * - DISABLE_CLAUDE_CODE：不要再叠一层 Claude Code 的提示词。
 * - DISABLE_EXTERNAL_SKILLS：skill 走我们给的 `skills.paths`。
 * - LOG_LEVEL=INFO：不显式给级别的话 opencode 写一个**零字节**的日志文件，
 *   后台依赖安装失败这类诊断全丢。
 */
const SWITCHES: Record<string, string> = {
  OPENCODE_DISABLE_PROJECT_CONFIG: "1",
  OPENCODE_DISABLE_CLAUDE_CODE: "1",
  OPENCODE_DISABLE_EXTERNAL_SKILLS: "1",
  OPENCODE_LOG_LEVEL: "INFO",
};

/** 资源在哪：发布包给 resourcesPath，开发时给仓库根。 */
export interface ResourceRoots {
  resources?: string;
  repoRoot?: string;
}

export interface PrepareInputs {
  roots: ResourceRoots;
  version: string;
  workspace: string;
  platform: Platform;
  /** 本工作区 gateway 的地址，给插件和 MCP server 回连。 */
  gatewayUrl: string;
  /** 应用的数据根（profile 同步到这里的 `.config-v2`）。 */
  hubRoot: string;
  /** opencode 的状态隔离目录（XDG_* 指到这下面）。 */
  runtimeDir: string;
  skillsDir: string;
  /** 跑 MCP server 的可执行文件。Electron 里是 process.execPath（配 ELECTRON_RUN_AS_NODE）。 */
  nodeExec: string;
}

const exe = (name: string) => (process.platform === "win32" ? `${name}.exe` : name);

function firstExisting(...candidates: (string | undefined)[]): string | undefined {
  return candidates.find((c): c is string => !!c && existsSync(c));
}

export function locateOpencode(roots: ResourceRoots): string | undefined {
  const found = firstExisting(
    roots.resources && path.join(roots.resources, "opencode", exe("opencode")),
    process.env.OPENCODE_BIN,
    roots.repoRoot && path.join(roots.repoRoot, "app/packages/service/bin", exe("opencode")),
  );
  if (found) return found;
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    const p = path.join(dir, exe("opencode"));
    if (dir && existsSync(p)) return p;
  }
  return undefined;
}

export function locateProfile(roots: ResourceRoots): ProfileSource | undefined {
  const override = process.env.OV_AGENT_PROFILE_DIR;
  if (override && existsSync(path.join(override, "base.json"))) return { configDir: override, sourceDir: override };
  if (roots.resources) {
    const dir = path.join(roots.resources, "agent-profiles/v2/config");
    if (existsSync(path.join(dir, "base.json"))) return { configDir: dir, sourceDir: dir };
  }
  if (roots.repoRoot) {
    const configDir = path.join(roots.repoRoot, "config/opencode-v2");
    const sourceDir = path.join(roots.repoRoot, ".opencode-v2");
    if (existsSync(path.join(configDir, "base.json")) && existsSync(sourceDir)) return { configDir, sourceDir };
  }
  return undefined;
}

export function locateMcpEntry(roots: ResourceRoots): string | undefined {
  return firstExisting(
    process.env.OVMCP_ENTRY,
    roots.resources && path.join(roots.resources, "mcp-tools/dist/main.js"),
    roots.repoRoot && path.join(roots.repoRoot, "app/mcp-tools/dist/main.js"),
  );
}

export function locatePlugin(roots: ResourceRoots): string | undefined {
  return firstExisting(
    roots.resources && path.join(roots.resources, "opencode-plugin-hilo/dist/index.js"),
    roots.repoRoot && path.join(roots.repoRoot, "app/packages/opencode-plugin-hilo/dist/index.js"),
  );
}

/** 每个 skill 一个目录，逐个列给 opencode（不是父目录）。没有 SKILL.md 的不算。 */
export function skillDirs(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .map((n) => path.join(root, n))
    .filter((p) => existsSync(path.join(p, "SKILL.md")))
    .sort();
}

export function prepareLaunch(i: PrepareInputs): LaunchSpec {
  const binary = locateOpencode(i.roots);
  if (!binary) throw new Error("找不到 opencode。发布包里应当自带（resources/opencode/）；开发时用 OPENCODE_BIN 指定");
  const src = locateProfile(i.roots);
  if (!src) throw new Error("找不到 agent 配置（发布包的 agent-profiles/v2/config，或仓库的 config/opencode-v2 + .opencode-v2）");
  const mcpEntry = locateMcpEntry(i.roots);
  if (!mcpEntry) throw new Error("找不到 MCP server（mcp-tools/dist/main.js）");

  const synced = path.join(i.hubRoot, ".config-v2");
  syncProfile(src, synced, i.version);
  assertProfileComplete(synced);
  const staging = path.join(tmpdir(), `ov-opencode-staging-${process.pid}`);
  stageProfile(synced, staging);

  // opencode 的全部状态隔离到我们自己的目录，不碰用户的 ~/.config/opencode。
  const xdg = {
    XDG_CONFIG_HOME: path.join(i.runtimeDir, "config-home"),
    XDG_CACHE_HOME: path.join(i.runtimeDir, "cache-home"),
    XDG_DATA_HOME: path.join(i.runtimeDir, "data-home"),
    XDG_STATE_HOME: path.join(i.runtimeDir, "state-home"),
  };
  for (const d of Object.values(xdg)) mkdirSync(d, { recursive: true });
  const home = path.join(i.runtimeDir, "home");
  mkdirSync(home, { recursive: true });
  writeDependencyMarkers(staging);
  writeDependencyMarkers(path.join(xdg.XDG_CONFIG_HOME, "opencode"));

  const plugin = locatePlugin(i.roots);
  const config = buildOpencodeConfig({
    profileDir: synced,
    region: REGION,
    platform: i.platform,
    mcp: {
      command: [i.nodeExec, mcpEntry],
      environment: {
        ELECTRON_RUN_AS_NODE: "1",
        GATEWAY_URL: i.gatewayUrl,
        SKILLS_DIR: i.skillsDir,
        HILO_KNOWLEDGE_DIR: path.join(synced, "knowledge"),
        HILO_WORKFLOWS_DIR: path.join(synced, "workflows"),
      },
    },
    extraPlugins: plugin ? [plugin] : [],
    skillsPaths: skillDirs(i.skillsDir),
  });
  const configFile = writeConfigFile(config);

  const env: Record<string, string> = {
    OPENCODE_CLIENT: "hilo-agent",
    // question 是 opencode 原生工具但默认不开；agent 配置里 `permission.question: allow` 的前提就是它。
    OPENCODE_ENABLE_QUESTION_TOOL: "true",
    OPENCODE_TEST_HOME: home,
    OPENCODE_CONFIG_DIR: staging,
    OPENCODE_CONFIG: configFile,
    // 插件要它回连 gateway，缺了直接 throw。
    GATEWAY_URL: i.gatewayUrl,
    HILO_MANAGED_RUNTIME: "1",
    // 插件按 NODE_ENV 选数据根：非 production 会去读 *-dev 目录。
    NODE_ENV: "production",
    HILO_LOAD_USER_MEMORY: "1",
    ...xdg,
    ...SWITCHES,
    // opencode 的 grep 工具要 `rg`，发布包里放在它旁边。
    PATH: [path.dirname(binary), process.env.PATH ?? ""].join(path.delimiter),
  };
  // 用户的 SHELL 可能是 fish / nu，agent 的 bash 工具按 POSIX 写的命令在那里跑不通，
  // 而错误看起来像命令本身写错了。
  if (process.platform === "darwin") env.SHELL = "/bin/bash";
  return { binary, cwd: i.workspace, env, configFile };
}
