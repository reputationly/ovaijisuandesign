import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { prepareLaunch } from "./index.js";

/**
 * 插件按 `HILO_AGENT_PROFILE_VERSION` 选 v2 / v3 工具面（记忆用 `hub_memory` 还是
 * `design_memory`，素材按路径还是按 Resource/Version 报）。参照 4.0.4 的主进程在两处都设了：
 * profile 的 env 与 MCP 的 env 覆盖。我们原来一处都没设 —— v3 架构下插件永远走 v2，
 * 单测里手动设变量能过、真机却一条 v3 逻辑都不生效。
 */
const saved = { ...process.env };
const repoRoot = path.resolve(import.meta.dirname, "../../../../..");

afterEach(() => {
  process.env = { ...saved };
});

function launch(architecture: "v3" | "v2") {
  const root = mkdtempSync(path.join(tmpdir(), "ov-launch-env-"));
  process.env.HILO_PROJECT_ARCHITECTURE = architecture === "v3" ? "resource_v3" : "";
  process.env.OV_AGENT_PROFILE_DIR = path.join(repoRoot, `assets/agent-profiles/${architecture}/config`);
  process.env.OVMCP_ENTRY = path.join(repoRoot, "app/mcp-tools/dist/main.js");
  // 只关心 env 的形状，不真起 opencode。**用当前 node 可执行文件当替身**：
  // 写死 `/bin/echo` 在 Windows runner 上不存在，这个用例会把 CI 判红。
  process.env.OPENCODE_BIN = process.execPath;
  return prepareLaunch({
    roots: { repoRoot: path.join(repoRoot, "app/desktop") },
    version: "0.0.0-test",
    workspace: root,
    platform: { base_url: "https://maas.example/v1", api_key: "sk-test", chat_model: "test-model" },
    gatewayUrl: "http://127.0.0.1:1",
    hubRoot: path.join(root, "hub"),
    runtimeDir: path.join(root, "ai-runtime"),
    skillsDir: path.join(root, "skills"),
    nodeExec: process.execPath,
  });
}

/** 写出来的 opencode 配置里，profile 声明的那个本地 MCP 服务的 environment。 */
function mcpEnvironment(configFile: string): Record<string, string> {
  const config = JSON.parse(readFileSync(configFile, "utf8")) as { mcp?: Record<string, { environment?: Record<string, string> }> };
  const services = Object.values(config.mcp ?? {});
  expect(services.length).toBeGreaterThan(0);
  return services[0]!.environment ?? {};
}

describe("opencode 启动 env", () => {
  it("v3 架构：进程 env 与 MCP environment 都带 HILO_AGENT_PROFILE_VERSION=3", () => {
    const spec = launch("v3");
    expect(spec.env.HILO_AGENT_PROFILE_VERSION).toBe("3");
    expect(mcpEnvironment(spec.configFile).HILO_AGENT_PROFILE_VERSION).toBe("3");
  });

  it("v2 架构（默认）：两处都是 2", () => {
    const spec = launch("v2");
    expect(spec.env.HILO_AGENT_PROFILE_VERSION).toBe("2");
    expect(mcpEnvironment(spec.configFile).HILO_AGENT_PROFILE_VERSION).toBe("2");
  });
});
