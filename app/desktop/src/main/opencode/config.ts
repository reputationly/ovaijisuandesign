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
  /** 对话模型的上下文窗口（tokens）。opencode 拿它当自动压缩的水位线 —— 平台模型
   *  多为 1M 级，不配就落 128K 保守值，长流程会过早压缩、压缩后 agent 退化。 */
  chat_context_limit?: number;
  /** 对话模型单次输出上限（tokens），不配落 32K。 */
  chat_output_limit?: number;
  /**
   * 目录里的全部对话模型（L-3，配置那个排第一）。
   *
   * 给 opencode 的 provider 配多个模型条目，用户才能在界面上换模型。缺省时只有
   * `chat_model` 一个 —— 与改造前一致。
   */
  chat_models?: string[];
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
    // 一个平台上不存在的模型。思考档位留着：qwen 在 opencode 里没有内置档位，
    // 不写 variant 的话会话一直是 default，请求里不会带 reasoning_effort。
    // 第 298 轮（用户要求）：不用 `as any`。这里是遍历一个未知形状的记录，
    // 用窄化后的本地别名表达意图，类型仍然可见。
    for (const a of Object.values(config.agent ?? {})) {
      if (!a || typeof a !== "object") continue;
      const entry: { model?: unknown; variant?: string } = a;
      delete entry.model;
      entry.variant = "max";
    }
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

  // **把启动命令注入到 profile 声明的那个 MCP 服务上。**
  //
  // v3 的 profile 声明的是 `design`（`agent-profiles/v3/config/base.json`），v2 是 `hub`。
  // 原来无条件写 `config.mcp.hub`，v3 下就变成：`design` 只剩 profile 里那条
  // `../mcp-tools-v3/dist/main.js` 相对路径（根本起不来，`design_*` 一个都没有），
  // 真正的命令进了一个多出来的 `hub` 服务（注册成 `hub_*`）。agent 因此永远看不到
  // `design_execute`。
  //
  // profile 里只有一个 local 服务时就用它；没声明时退回 `hub`（保持老行为）。
  const declared = Object.entries(config.mcp ?? {}).filter(
    ([, entry]) => (entry as { type?: string } | undefined)?.type === "local",
  );
  const name = declared.length === 1 ? (declared[0]?.[0] ?? "hub") : "hub";
  const service = { ...((config.mcp?.[name] as Record<string, unknown>) ?? {}) };
  service.type = "local";
  service.command = i.mcp.command;
  // profile 自带的 environment 在前，我们的在后（要覆盖 GATEWAY_URL 等）。
  service.environment = {
    ...((service.environment as Record<string, string> | undefined) ?? {}),
    ...i.mcp.environment,
  };
  config.mcp = { ...(config.mcp ?? {}), [name]: service };

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
  // opencode 拿 limit.context 做自动压缩的水位线：报小了会过早压缩（长流程压缩后
  // agent 会退化成只说话不调工具），报大了撞上游真实窗口会 400。默认 128K 是对
  // 未知模型的保守值；平台模型的真实窗口在 config.json 的
  // platform.chat_context_limit / chat_output_limit 里按模型设置。
  const context = clampPositive(p.chat_context_limit, 128_000);
  const output = clampPositive(p.chat_output_limit, 32_000);
  // 每个模型条目都一样，只有 id/name 不同。**顺序**按调用方给的（配置那个第一），
  // opencode 的模型列表就按这个顺序显示。
  const names = [model, ...(p.chat_models ?? [])].map((item) => item.trim()).filter((item, index, all) => item !== "" && all.indexOf(item) === index);
  const models: Record<string, unknown> = {};
  for (const name of names) {
    models[name] = {
      id: name,
      name,
      tool_call: true,
      limit: { context, output },
      // opencode 看到模型 id 里有 qwen 就不上思考档。这里显式给 max，
      // 请求体会带 reasoning_effort=max，并打开 enable_thinking。
      variants: {
        max: { reasoningEffort: "max", enable_thinking: true },
      },
    };
  }
  return {
    name: "maas",
    npm: "@ai-sdk/openai-compatible",
    options: { baseURL: p.base_url, apiKey: p.api_key, headers: {} },
    models,
  };
}

/** 没配 / 配了非正数 / 超过 10M 一律落默认值。 */
function clampPositive(v: number | undefined, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 10_000_000 ? Math.floor(v) : fallback;
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
