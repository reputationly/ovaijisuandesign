import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * 设置页读写平台配置（config.json）。
 *
 * 文件是蛇形键（`base_url` / `image_edit` …），界面用驼峰；这里负责两边互转。
 * API Key 不回传明文，只给掩码；保存时空串表示「不改」。
 */
export interface SettingsInfo {
  path: string;
  workspace: string;
  port: number;
  platform: { baseUrl: string; apiKeyMasked: string; hasApiKey: boolean; chatModel: string };
  models: Record<string, unknown>;
}

const MODEL_KEYS: [camel: string, snake: string][] = [
  ["image", "image"],
  ["imageEdit", "image_edit"],
  ["video", "video"],
  ["videoRef", "video_ref"],
  ["videoUpscale", "video_upscale"],
  ["imageUpscale", "image_upscale"],
  ["music", "music"],
  ["musicEdit", "music_edit"],
  ["speech", "speech"],
];

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
  const cfg = readJson(configPath);
  const platform = (cfg.platform ?? {}) as Json;
  const models = (cfg.models ?? {}) as Json;
  const apiKey = typeof platform.api_key === "string" ? platform.api_key : "";
  return {
    path: configPath,
    workspace,
    port,
    platform: {
      baseUrl: typeof platform.base_url === "string" ? platform.base_url : "",
      apiKeyMasked: maskKey(apiKey),
      hasApiKey: apiKey.length > 0,
      chatModel: typeof platform.chat_model === "string" ? platform.chat_model : "",
    },
    models,
  };
}

/** 把界面的改动并进原配置：未知字段原样保留，空模型写成 null（= 该能力不可用） */
export function mergeSettings(cfg: Json, patch: Record<string, unknown>): Json {
  const platform = { ...((cfg.platform ?? {}) as Json) };
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : undefined);
  const baseUrl = str(patch.baseUrl);
  if (baseUrl !== undefined) platform.base_url = baseUrl;
  const chatModel = str(patch.chatModel);
  if (chatModel !== undefined) platform.chat_model = chatModel;
  const apiKey = str(patch.apiKey);
  if (apiKey) platform.api_key = apiKey;
  const models = { ...((cfg.models ?? {}) as Json) };
  for (const [camel, snake] of MODEL_KEYS) {
    const v = str(patch[camel]);
    if (v !== undefined) models[snake] = v || null;
  }
  return { ...cfg, platform, models };
}

/** 先写临时文件再改名，写到一半断电也不会留下半截 JSON */
export function writeSettings(configPath: string, patch: Record<string, unknown>): void {
  const next = mergeSettings(readJson(configPath), patch);
  mkdirSync(path.dirname(configPath), { recursive: true });
  const tmp = `${configPath}.tmp`;
  writeFileSync(tmp, JSON.stringify(next, null, 2));
  renameSync(tmp, configPath);
}
