import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, timingSafeEqual } from "node:crypto";

import type { NextFunction, Request, Response } from "express";

type RequestContext = { sessionId?: string; toolUseId?: string; caller?: "agent" };

const storage = new AsyncLocalStorage<RequestContext>();

export function getCaller(): "agent" | "canvas" {
  return storage.getStore()?.caller ?? "canvas";
}

export function getRuntimeSessionId(): string | undefined {
  return storage.getStore()?.sessionId;
}

export function getToolUseId(): string | undefined {
  return storage.getStore()?.toolUseId;
}

function header(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** 调用方密钥比对的是摘要，避免用长度或前缀暴露真实密钥。 */
function isAgentCaller(presented: string | undefined): boolean {
  const key = process.env.HILO_AGENT_CALLER_KEY;
  if (!key || !presented) return false;
  const left = createHash("sha256").update(presented).digest();
  const right = createHash("sha256").update(key).digest();
  return timingSafeEqual(left, right);
}

export function requestContextMiddleware() {
  return (req: Request, _res: Response, next: NextFunction) => {
    const sessionId = header(req, "x-session-id");
    const toolUseId = header(req, "x-tool-use-id");
    const caller = isAgentCaller(header(req, "x-hilo-agent-caller")) ? "agent" as const : undefined;
    storage.run({ sessionId, toolUseId, ...(caller ? { caller } : {}) }, () => next());
  };
}
