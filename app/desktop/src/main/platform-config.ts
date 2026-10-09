import { existsSync, readFileSync } from "node:fs";

import { parseMediaConfig } from "@ov/maas-media";
import { withPlatformPreset } from "@ov/protocol";

import type { Platform } from "./opencode/index.js";

/**
 * 读平台配置里 opencode 要用的那部分。文件不存在时用产品预设（地址、对话模型）、令牌为空；
 * 文件里没写的地址 / 模型同样用预设补全，和 gateway 的口径一致（见 `withPlatformPreset`）。
 *
 * `chat_context_limit` / `chat_output_limit`（可选，正整数）：对话模型的上下文窗口 /
 * 输出上限。opencode 拿 context 当自动压缩水位线 —— 平台模型多为 1M 级，不配会按
 * 128K 的保守值过早压缩，长流程（编译成片 prompt 这类）压缩后 agent 会退化。
 */
export function readPlatform(configPath: string): Platform {
  const raw: unknown = existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf8")) : {};
  const cfg = parseMediaConfig(withPlatformPreset(raw));
  const platformSection = (isRecord(raw) && isRecord(raw.platform) ? raw.platform : {}) as Record<string, unknown>;
  const int = (v: unknown): number | undefined => {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
  };
  return {
    ...cfg.platform,
    chat_context_limit: int(platformSection.chat_context_limit),
    chat_output_limit: int(platformSection.chat_output_limit),
  };
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
