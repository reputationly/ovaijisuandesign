import { gatewayFetchFromBase, normalizeGatewayBaseUrl } from "../assets/record-gateway-trace-id.jsx";
import { workspaceGatewayUrl } from "../assets/workspace-gateway-url.jsx";
import { getRuntimeConfig } from "../infra/runtime-config.js";
import { HILO_WORKSPACE_IDENTITY_QUERY } from "../infra/workspace-gateway.js";
export function getBaseUrl() {
  return normalizeGatewayBaseUrl(getRuntimeConfig().gatewayUrl);
}

export function withUrlSearchParams(url2, params) {
  const hashIndex = url2.indexOf("#");
  const hash2 = hashIndex >= 0 ? url2.slice(hashIndex) : "";
  const urlWithoutHash = hashIndex >= 0 ? url2.slice(0, hashIndex) : url2;
  const queryIndex = urlWithoutHash.indexOf("?");
  const path2 = queryIndex >= 0 ? urlWithoutHash.slice(0, queryIndex) : urlWithoutHash;
  const searchParams = new URLSearchParams(queryIndex >= 0 ? urlWithoutHash.slice(queryIndex + 1) : "");
  for (const [key2, value] of Object.entries(params)) {
    if (value !== void 0) {
      searchParams.set(key2, String(value));
    }
  }
  const query = searchParams.toString();
  return `${path2}${query ? `?${query}` : ""}${hash2}`;
}

export function gatewayUrlFromBase(baseUrl, path2, workspaceIdentity) {
  if (typeof workspaceIdentity === "object") {
    return workspaceGatewayUrl(workspaceIdentity, path2);
  }
  const base2 = normalizeGatewayBaseUrl(baseUrl);
  if (!base2) return void 0;
  const result = new URL(`${base2}${path2}`);
  if (workspaceIdentity) {
    result.searchParams.set(HILO_WORKSPACE_IDENTITY_QUERY, workspaceIdentity);
  }
  return result.toString();
}

export async function gatewayFetch(path2, options2) {
  return gatewayFetchFromBase(getBaseUrl(), path2, options2);
}
