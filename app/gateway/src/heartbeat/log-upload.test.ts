import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { HeartbeatService, LogUploadController } from "./heartbeat.module.js";

function controller() {
  const heartbeat = new HeartbeatService();
  const queued: unknown[] = [];
  heartbeat.enqueueCommand = (command) => queued.push(command);
  return { ctl: new LogUploadController(heartbeat), queued };
}

describe("api/logs/request-level", () => {
  it("只接受 loopback，非本机 403", () => {
    const { ctl } = controller();
    expect(() => ctl.requestLevel({ socket: { remoteAddress: "10.0.0.2" } }, { level: "info" })).toThrow(ForbiddenException);
  });

  it("非法 level / ttl 返回 400，且不排队", () => {
    const { ctl, queued } = controller();
    expect(() => ctl.requestLevel({ socket: { remoteAddress: "127.0.0.1" } }, { level: "verbose" })).toThrow(BadRequestException);
    expect(() => ctl.requestLevel({ socket: { remoteAddress: "127.0.0.1" } }, { level: "debug", ttl: 30 })).toThrow(BadRequestException);
    expect(queued).toHaveLength(0);
  });

  it("把 set_log_level 指令放进心跳队列，默认 24 小时", () => {
    const { ctl, queued } = controller();
    const out = ctl.requestLevel({ socket: { remoteAddress: "::1" } }, { level: "debug" });
    expect(out.ok).toBe(true);
    expect(queued).toEqual([{ type: "set_log_level", args: { level: "debug", ttl: 86_400 } }]);
  });
});
