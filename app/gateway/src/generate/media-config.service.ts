import { readFileSync, statSync } from "node:fs";

import { Injectable } from "@nestjs/common";
import { type Client, type MediaConfig, createClient, defaultMediaConfig, parseMediaConfig } from "@ov/maas-media";
import { withPlatformPreset } from "@ov/protocol";

import { GatewayConfig } from "../config/gateway-config.js";

/**
 * 平台与模型配置。文件由主进程管理（设置页改的就是它），gateway 只读；
 * 按 mtime 缓存 —— 用户在设置里换了令牌，下一次生成就该用新的，不用重启。
 * 没写进文件的地址 / 模型用产品预设补全（见 `@ov/protocol` 的 `withPlatformPreset`），
 * 和主进程读出来的口径一致。
 */
@Injectable()
export class MediaConfigService {
  private cached?: { mtimeMs: number; value: MediaConfig };
  /** 测试里换掉 sleep / fetch，免得每次轮询真等 5 秒。 */
  clientOverrides: Partial<Client> = {};

  constructor(private readonly cfg: GatewayConfig) {}

  load(): MediaConfig {
    const file = this.cfg.mediaConfigPath;
    if (!file) return defaultMediaConfig();
    let mtimeMs: number;
    try {
      mtimeMs = statSync(file).mtimeMs;
    } catch {
      return defaultMediaConfig();
    }
    if (this.cached?.mtimeMs === mtimeMs) return this.cached.value;
    // 解析失败要抛出来：拿默认配置顶上会让每次生成都报"未配置"，真正的原因（JSON 写坏了）被藏住。
    const value = parseMediaConfig(withPlatformPreset(JSON.parse(readFileSync(file, "utf8"))));
    this.cached = { mtimeMs, value };
    return value;
  }

  client(onTaskSubmitted?: (taskId: string) => void): Client {
    return createClient({ ...this.clientOverrides, ...(onTaskSubmitted ? { onTaskSubmitted } : {}) });
  }
}
