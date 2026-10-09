import { readFileSync } from "node:fs";

import { parseMediaConfig } from "@ov/maas-media";
import { withPlatformPreset } from "@ov/protocol";

import type { GatewayConfig } from "../config/gateway-config.js";

/** opencode 配置里自建平台的 provider id（主进程生成 opencode 配置时用的同一个）。 */
// 不能用 `user-custom-*`：界面把这种 provider 当成用户自配的"自定义模型"，不当平台模型列出。
export const CHAT_PROVIDER_ID = "maas";

/**
 * 当前可用的对话模型 id（`provider/模型`）。只有配置里那一个；配置读不到就是空。
 * 每次现读：用户在设置里换了模型，不用重启 gateway。
 */
export function chatModelIds(cfg: GatewayConfig): string[] {
  let chat = "";
  try {
    if (cfg.mediaConfigPath) chat = parseMediaConfig(withPlatformPreset(JSON.parse(readFileSync(cfg.mediaConfigPath, "utf8")))).platform.chat_model.trim();
  } catch {
    chat = "";
  }
  return chat ? [`${CHAT_PROVIDER_ID}/${chat}`] : [];
}
