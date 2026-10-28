import { existsSync, readFileSync } from "node:fs";

import { catalogCache, parseMediaConfig } from "@ov/maas-media";
import { pickChatModel, type PlatformCatalog, withPlatformPreset } from "@ov/protocol";

import type { Platform } from "./opencode/index.js";

/**
 * 读平台配置里 opencode 要用的那部分。文件不存在时用产品预设（地址、对话模型）、令牌为空；
 * 文件里没写的地址 / 模型同样用预设补全，和 gateway 的口径一致（见 `withPlatformPreset`）。
 *
 * `chat_context_limit` / `chat_output_limit`（可选，正整数）：对话模型的上下文窗口 /
 * 输出上限。opencode 拿 context 当自动压缩水位线 —— 平台模型多为 1M 级，不配会按
 * 128K 的保守值过早压缩，长流程（编译成片 prompt 这类）压缩后 agent 会退化。
 */
/**
 * 平台配置 + **目录里的对话模型列表**（L-3）。
 *
 * 列表来自 gateway 写的目录缓存（格式见 `@ov/protocol` 的 `platform-catalog.ts`），
 * 这里只读、不发请求：主进程不该为了拼一份 opencode 配置去连平台，而目录是
 * gateway 每次拉到的，读同一份文件就够。
 *
 * 读不到（还没拉过 / 换了令牌）时只有配置里那一个模型 —— 和改造前一致。
 */
export function readPlatform(configPath: string, dataDir?: string): Platform {
  const raw: unknown = existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf8")) : {};
  const cfg = parseMediaConfig(withPlatformPreset(raw));
  const platformSection = (isRecord(raw) && isRecord(raw.platform) ? raw.platform : {}) as Record<string, unknown>;
  const int = (v: unknown): number | undefined => {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
  };
  const chatModels = readChatModels(cfg.platform.chat_model, cfg.platform.api_key, dataDir);
  // 配置里那个模型可能已经被运营从目录里下架：改成目录里的第一个。
  const chatModel = pickChatModel(cfg.platform.chat_model, chatModels);
  return {
    ...cfg.platform,
    chat_model: chatModel,
    chat_context_limit: int(platformSection.chat_context_limit),
    chat_output_limit: int(platformSection.chat_output_limit),
    ...(chatModels.length > 1 ? { chat_models: chatModels } : {}),
  };
}

/** 目录里的对话模型（配置那个排第一）。读不到就是空数组。 */
function readChatModels(configured: string, apiKey: string, dataDir?: string): string[] {
  if (!dataDir || !apiKey.trim()) return [];
  const catalog = catalogCache.readPlatformCatalogCache<PlatformCatalog>(dataDir, apiKey);
  const names: string[] = [];
  const push = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !names.includes(trimmed)) names.push(trimmed);
  };
  for (const capability of catalog?.capabilities ?? []) {
    if (capability.operation === "chat") push(capability.model ?? "");
  }
  // 目录里没有配置那个（已下架）→ 以目录第一个为准，别再把它排到最前面。
  if (names.length > 0) return names;
  push(configured);
  return names;
}

/**
 * 有没有填过令牌。新装用户、令牌被清空、配置读不出来，都算没有 —— 令牌页据此拦住。
 * 只看令牌本身：地址和模型有预设，缺了不影响"能不能开始用"。
 */
export function hasPlatformToken(configPath: string): boolean {
  try {
    return readPlatform(configPath).api_key.trim() !== "";
  } catch {
    return false;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
