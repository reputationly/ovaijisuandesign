import { Injectable } from "@nestjs/common";

import { GatewayConfig } from "../config/gateway-config.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";

export interface OpencodeEndpoint {
  url: string;
  username?: string;
  password?: string;
}

/**
 * 当前连着的 opencode。
 *
 * gateway 和 opencode 是主进程同时拉起的，gateway 起来时 opencode 还没就绪，
 * 所以地址不能只靠启动时的环境变量：主进程等 opencode 健康后
 * `POST /api/runtime/opencode-url` 推过来，opencode 重启（端口会变）时再推一次。
 * 环境变量只作为 gateway 被单独重拉时的初值。
 */
@Injectable()
export class RuntimeConnection {
  private ep: OpencodeEndpoint | undefined;

  constructor(
    cfg: GatewayConfig,
    private readonly bus: GatewayEventBus,
  ) {
    if (process.env.OPENCODE_URL) {
      this.ep = { url: cfg.opencodeUrl, username: cfg.opencodeUsername, password: cfg.opencodePassword };
    }
  }

  get endpoint(): OpencodeEndpoint | undefined {
    return this.ep;
  }

  set(ep: OpencodeEndpoint): void {
    this.ep = { url: ep.url.replace(/\/+$/, ""), username: ep.username, password: ep.password };
    this.bus.emit("internal:opencode-url", { url: this.ep.url });
  }

  /** 发给 opencode 的请求头。 */
  headers(): Record<string, string> {
    const e = this.ep;
    if (!e?.username || !e.password) return {};
    return { authorization: "Basic " + Buffer.from(`${e.username}:${e.password}`).toString("base64") };
  }
}
