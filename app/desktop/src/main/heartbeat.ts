import { createHash } from "node:crypto";
import os from "node:os";
import { app } from "electron";

import type { LogLevelController } from "./log-level.js";

const INTERVAL_MS = 30_000;
const TIMEOUT_MS = 8_000;

const macHash = (() => {
  const raw = `${os.hostname()}|${os.platform()}|${os.arch()}`;
  return createHash("sha256").update(raw).digest("hex");
})();

/**
 * 主进程心跳：每 30 秒向本地 gateway 取一次指令（例如 set_log_level）。
 *
 * 心跳只打本机 gateway，不带任何用户内容；没有 gateway 地址时跳过这一轮。
 * 这也是「调试日志级别」远控链路的唯一消费者。
 */
export class MainHeartbeat {
  private timer: NodeJS.Timeout | undefined;
  private stopped = false;
  private inFlight = false;

  constructor(
    private readonly gatewayUrl: () => string | undefined,
    private readonly logLevel: LogLevelController,
    private readonly log: (line: string) => void,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), INTERVAL_MS);
    this.timer.unref?.();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private async tick(): Promise<void> {
    const base = this.gatewayUrl()?.trim();
    if (!base || this.stopped || this.inFlight) return;
    this.inFlight = true;
    try {
      const response = await fetch(`${base.replace(/\/+$/, "")}/api/heartbeat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appVersion: app.getVersion(),
          os: os.platform(),
          arch: os.arch(),
          macAddress: macHash,
          releaseChannel: process.env.OV_RELEASE_CHANNEL?.trim() || "prod",
          releaseRegion: process.env.OV_RELEASE_REGION?.trim() || "domestic",
          powerState: "active",
          onlineStatus: "online",
          timestamp: Date.now(),
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) return;
      const body = (await response.json()) as { commands?: unknown };
      if (!Array.isArray(body.commands)) return;
      for (const command of body.commands) this.apply(command);
    } catch {
      // 心跳失败不打扰用户；下一轮再来
    } finally {
      this.inFlight = false;
    }
  }

  private apply(value: unknown): void {
    if (!value || typeof value !== "object") return;
    const command = value as { type?: unknown; args?: Record<string, unknown> };
    if (command.type !== "set_log_level") return;
    const level = command.args?.level;
    const ttl = command.args?.ttl;
    if (typeof level !== "string") return;
    this.logLevel.setLevel(level, typeof ttl === "number" ? ttl : undefined);
    this.log(`[heartbeat] set_log_level ${level}`);
  }
}
