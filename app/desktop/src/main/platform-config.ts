import { existsSync, readFileSync } from "node:fs";

import { parseMediaConfig } from "@ov/maas-media";

import type { Platform } from "./opencode/index.js";

/**
 * 读平台配置里 opencode 要用的那部分。文件不存在或没填对话模型时返回空的 ——
 * 应用照常起来，只是 agent 没有模型可用，设置页会提示去填。
 *
 * `chat_context_limit` / `chat_output_limit`（可选，正整数）：对话模型的上下文窗口 /
 * 输出上限。opencode 拿 context 当自动压缩水位线 —— 平台模型多为 1M 级，不配会按
 * 128K 的保守值过早压缩，长流程（编译成片 prompt 这类）压缩后 agent 会退化。
 */
export function readPlatform(configPath: string): Platform {
  if (!existsSync(configPath)) return { base_url: "", api_key: "", chat_model: "" };
  const raw = JSON.parse(readFileSync(configPath, "utf8")) as { platform?: Record<string, unknown> };
  const cfg = parseMediaConfig(raw);
  const platformSection = (raw.platform ?? {}) as Record<string, unknown>;
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
