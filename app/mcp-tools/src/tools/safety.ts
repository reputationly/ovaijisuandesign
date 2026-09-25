import { z } from "zod";

import { errorMessage, type GatewayClient } from "../gateway-client.js";

/**
 * agent 写进画布的文字先过一次内容安全检查（`POST /api/safety/check-text`）。
 * 检查服务本身出错时放行（fail-open）—— 安全服务抖动不该让所有写入失败；
 * 明确判定不通过才拦。
 */

export class SafetyBlockedError extends Error {
  readonly decision: string;
  constructor(decision: string) {
    super(`Content blocked by safety policy: ${decision}`);
    this.name = "SafetyBlockedError";
    this.decision = decision;
  }
}

const SafetyCheckResponseSchema = z.object({ pass: z.boolean(), decision: z.string() });

export async function checkAgentText(gw: GatewayClient, segments: (string | undefined)[]): Promise<void> {
  const joined = segments
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .join("\n")
    .trim();
  if (!joined) return;
  let result: z.infer<typeof SafetyCheckResponseSchema>;
  try {
    result = await gw.post("/api/safety/check-text", { content: joined }, 5_000, SafetyCheckResponseSchema);
  } catch (err) {
    process.stderr.write(`[hilo-tools] safety check failed (fail-open): ${errorMessage(err)}\n`);
    return;
  }
  if (!result.pass) {
    process.stderr.write(`[hilo-tools] safety blocked: decision=${result.decision} content_len=${joined.length}\n`);
    throw new SafetyBlockedError(result.decision);
  }
}
