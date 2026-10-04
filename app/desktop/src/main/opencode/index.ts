/**
 * 备好一次 opencode 启动：同步 profile → staging（合同拼接）→ 依赖标记 → 生成配置。
 *
 * ```text
 * profile 源 ─ sync ─► <hubRoot>/.config-v2 ─ stage ─► tmp/ov-opencode-staging-<pid>   OPENCODE_CONFIG_DIR
 * buildOpencodeConfig ─► tmp/ov-opencode-config-<pid>-<uuid>.json                     OPENCODE_CONFIG
 * ```
 */
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { buildOpencodeConfig, type Platform, writeConfigFile, writeDependencyMarkers } from "./config.js";
import { assertProfileComplete, stageProfile, syncProfile } from "./profile.js";
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
  /** 本工作区 gateway 的身份（`HILO_WORKSPACE_*`）。插件和 MCP server 回连时带上，否则请求被 428。 */
  identity?: Record<string, string>;
  /** 应用的数据根（profile 同步到这里的 `.config-v2`）。 */
  hubRoot: string;
  /** opencode 的状态隔离目录（XDG_* 指到这下面）。 */
  runtimeDir: string;
  skillsDir: string;
  /** 用户技能目录。和自带技能同名时用户的优先。 */
  userSkillsDir?: string;
  /** 跑 MCP server 的可执行文件。Electron 里是 process.execPath（配 ELECTRON_RUN_AS_NODE）。 */
  nodeExec: string;
}

const exe = (name: string) => (process.platform === "win32" ? `${name}.exe` : name);

/**
 * 第一个**存在且非空的文件**。
 *
 * **只查存在性是不够的。** 下载被打断会留下 0 字节的残骸（`scripts/fetch-opencode.mjs`
 * 正常是先写 `.part` 再 rename，所以不该出现，但断电、被 kill、磁盘满都会），
 * 而一个 0 字节的 `opencode` 会被当成有效路径返回 —— 表现是 opencode 起不来、
 * 历史面板空白，而日志里看不出是哪个环节坏了，只能一路猜。
 * 同一个坑对 `mcp-tools/dist/main.js`、插件 `dist/index.js` 也成立，所以在这里一次堵死。
 */
function firstExisting(...candidates: (string | undefined)[]): string | undefined {
  for (const c of candidates) {
    if (!c) continue;
    try {
      if (statSync(c).isFile() && statSync(c).size > 0) return c;
    } catch {
      // 不存在 / 不可读：继续试下一个。
    }
  }
  return undefined;
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

/** agent 配置目录（里面直接是 base.json、agents/ …）。开发时是仓库的 assets/agent-profiles/v2/config。 */
export function locateProfile(roots: ResourceRoots): string | undefined {
  return [
    process.env.OV_AGENT_PROFILE_DIR,
    roots.resources && path.join(roots.resources, "agent-profiles/v2/config"),
    roots.repoRoot && path.join(roots.repoRoot, "assets/agent-profiles/v2/config"),
  ].find((d): d is string => !!d && existsSync(path.join(d, "base.json")));
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

/** 按目录名去重，先到先得。 */
export function mergeSkillDirs(...groups: string[][]): string[] {
  const seen = new Set<string>();
  return groups.flat().filter((p) => {
    const name = path.basename(p);
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

const stagedDirs = new Set<string>();

export function prepareLaunch(i: PrepareInputs): LaunchSpec {
  const binary = locateOpencode(i.roots);
  if (!binary) throw new Error("找不到 opencode。发布包里应当自带（resources/opencode/）；开发时用 OPENCODE_BIN 指定");
  const src = locateProfile(i.roots);
  if (!src) throw new Error("找不到 agent 配置（发布包的 agent-profiles/v2/config，或仓库的 assets/agent-profiles/v2/config）");
  const mcpEntry = locateMcpEntry(i.roots);
  if (!mcpEntry) throw new Error("找不到 MCP server（mcp-tools/dist/main.js）");

  const synced = path.join(i.hubRoot, ".config-v2");
  const staging = path.join(tmpdir(), `ov-opencode-staging-${process.pid}`);
  // 同一进程里只同步 / 拼装一次：多个工作区共用这份目录，第二个工作区启动时再
  // 删掉重建，会让已经在跑的 opencode 读到半截配置。
  if (!stagedDirs.has(staging)) {
    syncProfile(src, synced, i.version);
    assertProfileComplete(synced);
    stageProfile(synced, staging);
    stagedDirs.add(staging);
  }

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
        ...i.identity,
      },
    },
    extraPlugins: plugin ? [plugin] : [],
    skillsPaths: mergeSkillDirs(i.userSkillsDir ? skillDirs(i.userSkillsDir) : [], skillDirs(i.skillsDir)),
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
    ...i.identity,
    HILO_MANAGED_RUNTIME: "1",
    // 插件按 NODE_ENV 选数据根：非 production 会去读 *-dev 目录。
    NODE_ENV: "production",
    HILO_LOAD_USER_MEMORY: "1",
    // 插件按技能 SKILL.md 里声明的工具给 agent 授权，要和 gateway 找同一批技能目录。
    HUB_SKILLS_DIR: i.skillsDir,
    ...(i.userSkillsDir ? { HUB_USER_SKILLS_DIR: i.userSkillsDir } : {}),
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
