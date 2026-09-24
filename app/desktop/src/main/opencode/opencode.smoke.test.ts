import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { basicAuth, locateOpencode, OpenCodeRuntime, prepareLaunch } from "./index.js";

/**
 * 真起一个 opencode serve：能就绪、agent 列表里有合同拼好的主 agent、停得干净。
 * 需要本机有 opencode（OPENCODE_BIN）和一份完整的 profile（OV_AGENT_PROFILE_DIR），
 * 所以默认跳过：`OV_SMOKE=1 OPENCODE_BIN=… OV_AGENT_PROFILE_DIR=… pnpm test`。
 */
const repoRoot = path.resolve(import.meta.dirname, "../../../../..");
describe.skipIf(!process.env.OV_SMOKE)("opencode 冒烟", () => {
  it("起来、列出 agent、停掉", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "ov-smoke-"));
    const spec = prepareLaunch({
      roots: { repoRoot },
      version: "0.0.0-test",
      workspace: root,
      platform: { base_url: "https://maas.example/v1", api_key: "sk-test", chat_model: "test-model" },
      gatewayUrl: "http://127.0.0.1:1",
      hubRoot: path.join(root, "hub"),
      runtimeDir: path.join(root, "ai-runtime"),
      skillsDir: path.join(root, "skills"),
      nodeExec: process.execPath,
    });
    expect(spec.binary).toBe(locateOpencode({ repoRoot }));
    const rt = new OpenCodeRuntime(() => {});
    const ep = await rt.start(spec);
    try {
      const agents = (await (await fetch(`${ep.url}/agent`, { headers: { authorization: basicAuth(ep) } })).json()) as { name: string }[];
      expect(agents.map((a) => a.name)).toContain("media-agent");
    } finally {
      await rt.stop();
    }
    expect(rt.status.state).toBe("stopped");
  }, 120_000);
});
