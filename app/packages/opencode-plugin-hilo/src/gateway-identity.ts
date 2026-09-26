/**
 * 回连本工作区 gateway 时带的身份头。主进程经环境变量把身份给 opencode（和 gateway 同一份），
 * gateway 对缺身份的请求回 428：不带的话确认、防打转、根会话的请求全被拒，
 * 花钱的工具一律按「确认不可用」拦下。
 *
 * 实例 id 和代次齐全时三个头一起带；只有 claim 时只带 claim（老的单工作区启动方式）。
 */
export const WORKSPACE_CLAIM_ENV = "HILO_WORKSPACE_CLAIM";
export const WORKSPACE_INSTANCE_ENV = "HILO_WORKSPACE_INSTANCE_ID";
export const WORKSPACE_GENERATION_ENV = "HILO_WORKSPACE_GENERATION";

const CLAIM_HEADER = "x-hilo-workspace";
const INSTANCE_HEADER = "x-hilo-workspace-instance";
const GENERATION_HEADER = "x-hilo-workspace-generation";

export function withGatewayIdentity(init: RequestInit = {}): RequestInit {
  const claim = process.env[WORKSPACE_CLAIM_ENV]?.trim();
  if (!claim) return init;
  const headers = new Headers(init.headers);
  const instanceId = process.env[WORKSPACE_INSTANCE_ENV]?.trim();
  const generation = Number(process.env[WORKSPACE_GENERATION_ENV]);
  if (instanceId && Number.isSafeInteger(generation) && generation > 0) {
    headers.set(CLAIM_HEADER, claim);
    headers.set(INSTANCE_HEADER, instanceId);
    headers.set(GENERATION_HEADER, String(generation));
  } else {
    headers.set(CLAIM_HEADER, claim);
  }
  return { ...init, headers };
}

/** 拼 gateway 地址：环境变量里的地址可能带结尾斜杠。 */
export function gatewayEndpoint(gatewayUrl: string, pathname: string): string {
  return `${gatewayUrl.replace(/\/+$/, "")}${pathname}`;
}

/** 按 opencode 会话 id 寻址的内部接口。 */
export function sessionEndpoint(gatewayUrl: string, sessionId: string, suffix: string): string {
  return gatewayEndpoint(gatewayUrl, `/api/internal/sessions/${encodeURIComponent(sessionId)}/${suffix}`);
}
