import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import { withPlatformPreset } from "@ov/protocol";

/**
 * 设置页读写平台配置（config.json）。
 *
 * 界面只能改两样：接口地址和令牌（API Key）。模型由产品预设定（见 `@ov/protocol` 的
 * `PLATFORM_PRESET`），界面只展示「正在使用的模型」，不接受修改 —— 所以这里不收模型字段。
 * 读出来的是**生效**的值（缺的用预设补），界面显示的和 gateway 实际用的一致。
 * API Key 不回传明文，只给掩码；保存时空串表示「不改」。
 */
export interface SettingsInfo {
  path: string;
  workspace: string;
  port: number;
  platform: { baseUrl: string; apiKeyMasked: string; hasApiKey: boolean; chatModel: string };
  models: Record<string, unknown>;
}

type Json = Record<string, unknown>;

function readJson(file: string): Json {
  if (!existsSync(file)) return {};
  try {
    const v = JSON.parse(readFileSync(file, "utf8")) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {};
  } catch {
    return {};
  }
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export function readSettings(configPath: string, workspace: string, port: number): SettingsInfo {
  const raw = readJson(configPath);
  const rawPlatform = (raw.platform ?? {}) as Json;
  const apiKey = typeof rawPlatform.api_key === "string" ? rawPlatform.api_key.trim() : "";
  // 生效的值：缺的地址 / 模型用产品预设补，和 gateway 读到的一致。
  const effective = withPlatformPreset(raw);
  const platform = effective.platform as Json;
  return {
    path: configPath,
    workspace,
    port,
    platform: {
      baseUrl: String(platform.base_url),
      apiKeyMasked: maskKey(apiKey),
      hasApiKey: apiKey.length > 0,
      chatModel: String(platform.chat_model),
    },
    models: effective.models as Json,
  };
}

/** 把界面的改动并进原配置：只认地址和令牌（空令牌不覆盖），模型字段忽略，未知字段原样保留。 */
export function mergeSettings(cfg: Json, patch: Record<string, unknown>): Json {
  const platform = { ...((cfg.platform ?? {}) as Json) };
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : undefined);
  const baseUrl = str(patch.baseUrl);
  if (baseUrl !== undefined) platform.base_url = baseUrl;
  const apiKey = str(patch.apiKey);
  if (apiKey) platform.api_key = apiKey;
  return { ...cfg, platform };
}

/** 先写临时文件再改名，写到一半断电也不会留下半截 JSON */
export function writeSettings(configPath: string, patch: Record<string, unknown>): void {
  const next = mergeSettings(readJson(configPath), patch);
  mkdirSync(path.dirname(configPath), { recursive: true });
  const tmp = `${configPath}.tmp`;
  writeFileSync(tmp, JSON.stringify(next, null, 2));
  renameSync(tmp, configPath);
}
