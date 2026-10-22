/**
 * ExternalAgentService 的行为测试（4.0.3 外部 Agent）。
 *
 * 用 `process.execPath` 起一个几行的临时脚本代替真的 external-main.js，
 * 这样能验证「该起才起、该停能停、失败不崩」而不用真去连 gateway。
 */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  ExternalAgentService,
  type ExternalAgentSettings,
} from "./external-agent-service.js";

/** 一个只挂住不退出的假子进程。 */
function fakeEntry(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "ov-ext-agent-"));
  const file = path.join(dir, "fake-external-main.cjs");
  writeFileSync(
    file,
    [
      "process.on('SIGTERM', () => process.exit(0));",
      "process.stdout.write('listening\\n');",
      "setInterval(() => {}, 1000);",
      "",
    ].join("\n"),
    "utf8",
  );
  return file;
}

function settings(over: Partial<ExternalAgentSettings> = {}): ExternalAgentSettings {
  return { enabled: true, port: 18999, allowedProjectPaths: [], ...over };
}

function makeService(over: {
  settings?: ExternalAgentSettings;
  gateway?: string | undefined;
  entry?: string;
}) {
  const logs: string[] = [];
  const svc = new ExternalAgentService({
    exec: process.execPath,
    entry: over.entry ?? fakeEntry(),
    readSettings: () => over.settings ?? settings(),
    gatewayUrl: () => ("gateway" in over ? over.gateway : "http://127.0.0.1:1"),
    log: (l) => logs.push(l),
  });
  return { svc, logs };
}

describe("ExternalAgentService", () => {
  it("enabled=false 时不启动", async () => {
    const { svc } = makeService({ settings: settings({ enabled: false }) });
    const st = await svc.start();
    expect(st.running).toBe(false);
    expect(st.url).toBeNull();
  });

  it("gateway 未就绪时不启动（否则每轮都打不回去）", async () => {
    const { svc, logs } = makeService({ gateway: undefined });
    const st = await svc.start();
    expect(st.running).toBe(false);
    expect(logs.join("\n")).toMatch(/gateway 尚未就绪/);
  });

  it("enabled 且 gateway 就绪 -> 起进程，status 给出 url", async () => {
    const { svc } = makeService({});
    const st = await svc.start();
    expect(st.running).toBe(true);
    expect(st.port).toBe(18999);
    expect(st.url).toBe("http://127.0.0.1:18999/mcp");
    await svc.stop();
  });

  it("stop 之后 running=false 且可以再次 start", async () => {
    const { svc } = makeService({});
    await svc.start();
    await svc.stop();
    expect(svc.status().running).toBe(false);
    const again = await svc.start();
    expect(again.running).toBe(true);
    await svc.stop();
  });

  it("读设置抛错时不崩，只是不启动", async () => {
    const logs: string[] = [];
    const svc = new ExternalAgentService({
      exec: process.execPath,
      entry: fakeEntry(),
      readSettings: () => {
        throw new Error("boom");
      },
      gatewayUrl: () => "http://127.0.0.1:1",
      log: (l) => logs.push(l),
    });
    const st = await svc.start();
    expect(st.running).toBe(false);
    expect(logs.join("\n")).toMatch(/读设置失败/);
  });

  it("entry 不存在时也只是一条日志，不抛", async () => {
    const { svc, logs } = makeService({ entry: "/definitely/not/here.js" });
    const st = await svc.start();
    // spawn 在这个平台上可能成功随后 exit，也可能直接 error；两种情况都不应抛
    expect(() => st).not.toThrow();
    await svc.stop();
    expect(logs.length).toBeGreaterThan(0);
  });
});
