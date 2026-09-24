/**
 * 工作区 gateway 的身份：claim = 路径的 sha256（路径本身不出主进程）、instanceId =
 * 每次起进程新生成、generation = 同一路径第几次起。渲染层带着这三样请求 gateway，
 * gateway 重启或换了工作区时，旧标签页发来的请求就对不上号，写不进别的工作区。
 */
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

import type { GatewayBinding } from "../ipc/types.js";

export const IDENTITY_HEADERS = {
  claim: "x-hilo-workspace",
  instance: "x-hilo-workspace-instance",
  generation: "x-hilo-workspace-generation",
} as const;

export const IDENTITY_QUERY = {
  claim: "hilo_workspace",
  instance: "hilo_workspace_instance",
  generation: "hilo_workspace_generation",
} as const;

export function workspaceClaim(folderPath: string): string {
  return createHash("sha256").update(path.resolve(folderPath)).digest("hex");
}

export function mintIdentity(folderPath: string, generation: number): { claim: string; instanceId: string; generation: number } {
  return { claim: workspaceClaim(folderPath), instanceId: randomUUID(), generation };
}

export function identityEnv(id: { claim: string; instanceId: string; generation: number }): Record<string, string> {
  return {
    HILO_WORKSPACE_CLAIM: id.claim,
    HILO_WORKSPACE_INSTANCE_ID: id.instanceId,
    HILO_WORKSPACE_GENERATION: String(id.generation),
  };
}

export function identityHeaders(binding: GatewayBinding | undefined): Record<string, string> {
  if (!binding) return {};
  return {
    [IDENTITY_HEADERS.claim]: binding.claim,
    [IDENTITY_HEADERS.instance]: binding.instanceId,
    [IDENTITY_HEADERS.generation]: String(binding.generation),
  };
}

/** `ws(s)://host/ws?hilo_workspace=…`。 */
export function workspaceWsUrl(binding: GatewayBinding): string {
  const u = new URL(binding.baseUrl);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = "/ws";
  u.search = "";
  u.searchParams.set(IDENTITY_QUERY.claim, binding.claim);
  u.searchParams.set(IDENTITY_QUERY.instance, binding.instanceId);
  u.searchParams.set(IDENTITY_QUERY.generation, String(binding.generation));
  return u.toString();
}
