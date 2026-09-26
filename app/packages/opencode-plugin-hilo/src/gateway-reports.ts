import * as fs from "node:fs";
import * as path from "node:path";

import { gatewayEndpoint, sessionEndpoint, withGatewayIdentity } from "./gateway-identity.js";
import { userSkillsDir } from "./skill-paths.js";

/**
 * 发了就不管的几个通知。都有短超时、失败只记日志：它们是统计和后台检查，不能拖慢或打断对话。
 */

/** 防打转触发一次，记到会话的运行统计上。 */
export async function reportLoopGuardTrip(gatewayUrl: string, sessionID: string, tool: string): Promise<void> {
  await postQuietly(sessionEndpoint(gatewayUrl, sessionID, "loop-guard-trip"), { tool }, Number(process.env.LOOP_GUARD_REPORT_TIMEOUT_MS ?? 1500), (detail) =>
    console.warn(`[hilo-plugin] loop-guard report ${detail} session=${sessionID} tool=${tool}`),
  );
}

/** hub 工具实际跑过一次（gateway 据此判断会话里的活还在不在动）。 */
export async function reportMcpToolCallObserved(gatewayUrl: string, sessionID: string, tool: string): Promise<void> {
  if (!tool.startsWith("hub_") || !sessionID) return;
  await postQuietly(
    sessionEndpoint(gatewayUrl, sessionID, "mcp-tool-call"),
    { tool, observed_at: Date.now() },
    Number(process.env.MCP_TOOL_OBSERVED_REPORT_TIMEOUT_MS ?? 1500),
    (detail) => console.warn(`[hilo-plugin] mcp observed report ${detail} session=${sessionID} tool=${tool}`),
  );
}

/** 用户自己的技能被加载了：让 gateway 检查一下要不要同步。自带技能不报。 */
export function notifySkillUploadCheck(skillName: string, gatewayUrl: string): void {
  try {
    if (!fs.existsSync(path.join(userSkillsDir(), skillName, "SKILL.md"))) return;
    fetch(
      gatewayEndpoint(gatewayUrl, "/api/skills/upload-check"),
      withGatewayIdentity({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: skillName }),
        signal: AbortSignal.timeout(3000),
      }),
    ).catch((err: unknown) => {
      console.warn(`[hilo-plugin] skill upload check failed for ${skillName}:`, err);
    });
  } catch {
    // 目录都读不了：不报
  }
}

async function postQuietly(url: string, body: unknown, timeoutMs: number, warn: (detail: string) => void): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(
      url,
      withGatewayIdentity({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: controller.signal }),
    );
    if (!resp.ok) warn(`HTTP ${resp.status}`);
  } catch (err) {
    warn(`failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}
