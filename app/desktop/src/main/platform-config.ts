import { existsSync, readFileSync } from "node:fs";

import { parseMediaConfig } from "@ov/maas-media";

import type { Platform } from "./opencode/index.js";

/**
 * 读平台配置里 opencode 要用的那部分。文件不存在或没填对话模型时返回空的 ——
 * 应用照常起来，只是 agent 没有模型可用，设置页会提示去填。
 */
export function readPlatform(configPath: string): Platform {
  if (!existsSync(configPath)) return { base_url: "", api_key: "", chat_model: "" };
  const cfg = parseMediaConfig(JSON.parse(readFileSync(configPath, "utf8")));
  return cfg.platform;
}
