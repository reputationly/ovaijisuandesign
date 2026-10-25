import { readFileSync } from "node:fs";

import { parseMediaConfig } from "@ov/maas-media";
import { type PlatformCatalog, withPlatformPreset } from "@ov/protocol";

import type { GatewayConfig } from "../config/gateway-config.js";

/** opencode 配置里自建平台的 provider id（主进程生成 opencode 配置时用的同一个）。 */
// 不能用 `user-custom-*`：界面把这种 provider 当成用户自配的"自定义模型"，不当平台模型列出。
export const CHAT_PROVIDER_ID = "maas";

/** 配置里的对话模型（目录拿不到时的唯一选项）。每次现读：设置里换了模型不用重启 gateway。 */
export function configuredChatModel(cfg: GatewayConfig): string {
  try {
    if (cfg.mediaConfigPath) {
      return parseMediaConfig(withPlatformPreset(JSON.parse(readFileSync(cfg.mediaConfigPath, "utf8")))).platform.chat_model.trim();
    }
  } catch {
    // 配置读坏了不该让模型列表整个为空 —— 下面会退化成"没有模型"，
    // 而真正的错误会在生成时以更具体的形式报出来。
  }
  return "";
}

/**
 * 当前可用的对话模型（裸模型名）。
 *
 * # 从哪来
 *
 * 平台目录里 `operation === "chat"` 的那些（L-3 / M1：按目录生成 opencode 的 provider
 * 配置，用户可多选）。**配置里的 `platform.chat_model` 排第一并作为默认** —— 目录拿不到
 * 时退化成"只有配置那一个"，和改造前一致。
 *
 * 为什么要有目录这一路：平台上有二十多个语言模型，写死一个的后果是用户想换模型得改
 * 配置文件，而设置页根本没有这个入口。
 */
export function chatModelNames(configured: string, catalog: PlatformCatalog | null): string[] {
  const names: string[] = [];
  const push = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !names.includes(trimmed)) names.push(trimmed);
  };
  push(configured);
  for (const capability of catalog?.capabilities ?? []) {
    if (capability.operation === "chat") push(capability.model ?? "");
  }
  return names;
}

/** 同上，带 `provider/` 前缀 —— 这是 opencode / 运行时接口对外用的 id 形态。 */
export function chatModelIds(configured: string, catalog: PlatformCatalog | null): string[] {
  return chatModelNames(configured, catalog).map((name) => `${CHAT_PROVIDER_ID}/${name}`);
}

/** 拆 `provider/模型`。没有前缀时按"只有模型名"处理。 */
export function splitChatModelId(id: string): { providerID: string; modelID: string } {
  const at = id.indexOf("/");
  if (at < 0) return { providerID: CHAT_PROVIDER_ID, modelID: id };
  return { providerID: id.slice(0, at), modelID: id.slice(at + 1) };
}
