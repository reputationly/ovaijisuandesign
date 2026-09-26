/**
 * 拼给 opencode 的配置。provider 来自本地配置里填的自建平台，走"自定义模型"那条
 * 路径拼（provider id `user-custom-*`、`@ai-sdk/openai-compatible`）—— 插件里按
 * `user-custom-*` 判断的逻辑（maxOutputTokens、跳过计费头）因此原样成立。
 */
import { randomUUID } from "node:crypto";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { loadMergedConfig } from "./profile.js";

/** 平台在 opencode 里的 provider id。**必须以 `user-custom-` 开头**，见模块说明。 */
// 不能用 `user-custom-*`：界面把这种 provider 一律当成用户自配的"自定义模型"，
// 对话框的模型选择器里就不把它当平台模型列出来，也不当默认。
export const PROVIDER_ID = "maas";

/** 插件运行时依赖的版本，钉死和 opencode 同版本。 */
export const PLUGIN_RUNTIME_VERSION = "1.18.18";

export interface Platform {
  base_url: string;
  api_key: string;
  chat_model: string;
}

export interface McpLaunch {
  command: string[];
  environment: Record<string, string>;
}

export interface BuildInputs {
  /** 同步后的 profile 目录。插件路径按它解析。 */
  profileDir: string;
  region: string;
  platform: Platform;
  mcp: McpLaunch;
  /** profile 自带的 `plugin` 之外额外注入的插件文件。 */
  extraPlugins: string[];
  skillsPaths: string[];
}

export function buildOpencodeConfig(i: BuildInputs): Record<string, any> {
  const config = loadMergedConfig(i.profileDir, i.region) as Record<string, any>;
  delete config.media_models;

  const model = i.platform.chat_model.trim();
  if (model) {
    config.provider = { ...(config.provider ?? {}), [PROVIDER_ID]: customProvider(i.platform) };
    if (Array.isArray(config.enabled_providers) && !config.enabled_providers.includes(PROVIDER_ID)) {
      config.enabled_providers.push(PROVIDER_ID);
    }
    if (Array.isArray(config.disabled_providers)) {
      config.disabled_providers = config.disabled_providers.filter((p: unknown) => p !== PROVIDER_ID);
    }
    // 启用自定义模型时删掉各 agent 的 model 和 small_model —— 否则 agent 会去找
    // 一个平台上不存在的模型。
    for (const a of Object.values(config.agent ?? {})) if (a && typeof a === "object") delete (a as any).model;
    delete config.small_model;
    config.model = `${PROVIDER_ID}/${model}`;
  }

  // **不能只写 `{"*": "allow"}`**：opencode 会在它后面追加默认规则
  // `external_directory: ask` / `doom_loop: ask`。知识库和工作流都在工作区外，
  // agent 一读就发 permission.asked —— 整条链都不处理那个事件，这一轮就永远
  // 卡住，界面上只是"还在想"。
  config.permission ??= defaultPermission();
  config.compaction ??= { auto: true, prune: true, reserved: 40_000 };
  config.skills = { ...(config.skills ?? {}), paths: i.skillsPaths };

  const hub = { ...(config.mcp?.hub ?? {}) };
  hub.type = "local";
  hub.command = i.mcp.command;
  hub.environment = { ...(hub.environment ?? {}), ...i.mcp.environment };
  config.mcp = { ...(config.mcp ?? {}), hub };

  const plugins: string[] = (Array.isArray(config.plugin) ? config.plugin : [])
    .filter((p: unknown): p is string => typeof p === "string")
    .map((p: string) => resolvePlugin(p, i.profileDir));
  config.plugin = [...plugins, ...i.extraPlugins.map(fileUrl)];
  return config;
}

function defaultPermission(): Record<string, string> {
  return {
    read: "allow",
    write: "allow",
    edit: "allow",
    bash: "allow",
    glob: "allow",
    grep: "allow",
    task: "allow",
    todowrite: "allow",
    skill: "allow",
    webfetch: "allow",
    external_directory: "allow",
  };
}

function customProvider(p: Platform) {
  const model = p.chat_model.trim();
  return {
    name: "maas",
    npm: "@ai-sdk/openai-compatible",
    options: { baseURL: p.base_url, apiKey: p.api_key, headers: {} },
    models: {
      // opencode 拿 context 做压缩水位线，报大了会在长会话里直接撞上游限制。
      [model]: { id: model, name: model, tool_call: true, limit: { context: 128_000, output: 32_000 } },
    },
  };
}

/**
 * profile 里的插件路径（`.opencode-v2/plugins/x.ts` 这种相对形式）→ profile 目录
 * 下 `plugins/` 的绝对 `file://`。前缀是开发树的布局，跟运行时无关。
 */
function resolvePlugin(p: string, profileDir: string): string {
  if (p.includes("://")) return p;
  if (path.isAbsolute(p)) return fileUrl(p);
  return fileUrl(path.join(profileDir, "plugins", path.basename(p)));
}

/**
 * 路径 → `file://` URL，**要百分号编码**。数据目录在 `Application Support` 下
 * 带空格，不编码的话 opencode 按 URL 解析插件路径会找不到文件，而插件加载失败
 * 只是一行日志 —— agent 照样能跑，只是少了语言注入、防打转这些行为。
 */
export function fileUrl(p: string): string {
  return pathToFileURL(p).href;
}

/**
 * 让 opencode 以为插件依赖已经装好，不去在线 `npm install`：写 package.json /
 * package-lock.json / `.npmrc`（offline=true）+ 空的 `node_modules/`。**不写的话**
 * 第一次启动会卡在后台依赖安装上（离线或慢网时是好几分钟没有任何输出）。
 */
export function writeDependencyMarkers(dir: string): void {
  mkdirSync(path.join(dir, "node_modules"), { recursive: true });
  const deps = { "@opencode-ai/plugin": PLUGIN_RUNTIME_VERSION };
  const name = "hilo-opencode-config";
  writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name, private: true, dependencies: deps }, null, 2) + "\n");
  writeFileSync(
    path.join(dir, "package-lock.json"),
    JSON.stringify({ name, lockfileVersion: 3, requires: true, packages: { "": { name, dependencies: deps } } }, null, 2) + "\n",
  );
  writeFileSync(
    path.join(dir, ".npmrc"),
    "# Scopes OpenCode internal installs for THIS directory to the local cache;\n" +
      "# never set npm_config_offline in the process env (it leaks to agent commands).\n" +
      "offline=true\n",
  );
}

/**
 * 配置写成临时文件（0600），经 `OPENCODE_CONFIG` 传 —— 不用 `OPENCODE_CONFIG_CONTENT`：
 * 里面有 api_key，放环境变量会出现在进程列表和崩溃转储里。
 */
export function writeConfigFile(config: unknown): string {
  const file = path.join(tmpdir(), `ov-opencode-config-${process.pid}-${randomUUID()}.json`);
  writeFileSync(file, JSON.stringify(config));
  if (process.platform !== "win32") chmodSync(file, 0o600);
  return file;
}
