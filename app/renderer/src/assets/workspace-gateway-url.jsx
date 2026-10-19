import { HILO_WORKSPACE_GENERATION_QUERY, HILO_WORKSPACE_IDENTITY_QUERY, HILO_WORKSPACE_INSTANCE_QUERY, isWorkspaceIdentityErrorCode, workspaceGatewayIdentityHeaders } from "../infra/workspace-gateway.js";
export function workspaceGatewayUrl(binding, path2) {
  const baseUrl = binding.baseUrl.replace(/\/$/, "");
  const requested = new URL(path2, `${baseUrl}/`);
  const parsed = new URL(`${requested.pathname}${requested.search}${requested.hash}`, `${baseUrl}/`);
  parsed.searchParams.set(HILO_WORKSPACE_IDENTITY_QUERY, binding.claim);
  parsed.searchParams.set(HILO_WORKSPACE_INSTANCE_QUERY, binding.instanceId);
  parsed.searchParams.set(HILO_WORKSPACE_GENERATION_QUERY, String(binding.generation));
  return parsed.toString();
}

export function withWorkspaceGatewayHeaders(binding, headers) {
  const result = new Headers(headers);
  for (const [key2, value] of Object.entries(workspaceGatewayIdentityHeaders(binding))) {
    result.set(key2, value);
  }
  return result;
}

export class WorkspaceGatewayClient {
  bindingValue;
  fetchImpl;
  recoverWorkspace;
  recoveryInFlight;
  constructor(options2) {
    this.bindingValue = options2.binding;
    this.fetchImpl = options2.fetch ?? globalThis.fetch.bind(globalThis);
    this.recoverWorkspace = options2.recoverWorkspace;
  }
  get binding() {
    return this.bindingValue;
  }
  url(path2) {
    return workspaceGatewayUrl(this.bindingValue, path2);
  }
  async request(path2, init2) {
    return this.performRequest(path2, init2, true);
  }
  async performRequest(path2, init2, allowRecovery) {
    const response = await this.fetchImpl(this.url(path2), {
      ...init2,
      headers: withWorkspaceGatewayHeaders(this.bindingValue, init2?.headers),
    });
    if (!allowRecovery || !this.recoverWorkspace || !(await isIdentityError(response))) {
      return response;
    }
    const previousBinding = this.bindingValue;
    const recovered = await this.recoverBinding();
    if (!recovered) return response;
    if (!canReplayAfterRecovery(init2, previousBinding, recovered)) {
      return response;
    }
    this.bindingValue = recovered;
    return this.performRequest(path2, init2, false);
  }
  async recoverBinding() {
    if (!this.recoverWorkspace) return void 0;
    if (this.recoveryInFlight) return this.recoveryInFlight;
    const recovery = this.recoverWorkspace();
    this.recoveryInFlight = recovery;
    try {
      return await recovery;
    } finally {
      if (this.recoveryInFlight === recovery) {
        this.recoveryInFlight = void 0;
      }
    }
  }
}

export function canReplayAfterRecovery(init2, previous2, recovered) {
  const method = (init2?.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  return previous2.claim === recovered.claim && previous2.instanceId === recovered.instanceId;
}

export async function isIdentityError(response) {
  if (response.status !== 409 && response.status !== 428) return false;
  try {
    const body2 = await response.clone().json();
    return isWorkspaceIdentityErrorCode(body2.code);
  } catch {
    return false;
  }
}

export const listeners$b = new Set();

export const authExpiredBus = {
  on(listener) {
    listeners$b.add(listener);
    return () => {
      listeners$b.delete(listener);
    };
  },
  emit() {
    for (const fn2 of listeners$b) {
      try {
        fn2();
      } catch (err) {
        console.error("[auth-expired-bus] listener threw:", err);
      }
    }
  },
};
