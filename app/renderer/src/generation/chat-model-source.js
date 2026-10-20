/**
 * 模型目录来源（第 264 轮，照参照 4.0.0 逐字还原）。
 *
 * 参照 bundle 第 338657–338703 行是一段连续区间：
 *   capabilityModelRows / fetchCapabilityModelRows / useWorkspaceProjectArchitecture / useChatModelSource
 * 其中 `useWorkspaceProjectArchitecture` 我们树里已有（workspace/use-workspace-project-architecture.jsx，
 * queryKey / enabled / staleTime 与参照完全一致），所以这里只放另外三个。
 *
 * 为什么需要：4.0.0 新增了 `GET /api/v3/capabilities?source=model` 这条全量能力清单，
 * `useMentionModels` 与 `useMediaModels` 都通过 `useChatModelSource()` 决定走哪条路。
 * 我们原来只有 `/api/v1/models/config` 一条路，所以 v3 屏上少了 capability 请求。
 */
import { useQuery } from "@tanstack/react-query";

import { useWorkspaceProjectArchitecture } from "../workspace/use-workspace-project-architecture.jsx";
import { useGatewayFetch, useGatewayScope } from "../assets/listeners-a.jsx";
import { API_PATHS } from "../infra/workspace-gateway.js";

const CAPABILITIES_SOURCE_ROUTE = "/api/v3/capabilities";

function recordOf(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}

function resolutionOptions(entry) {
  const control = recordOf(recordOf(entry.controls)?.resolution);
  const schema = recordOf(recordOf(recordOf(entry.paramSchema)?.properties)?.resolution);
  const options = Array.isArray(control?.options) ? control.options : schema?.enum;
  return Array.isArray(options)
    ? options.filter((option) => typeof option === "string" || typeof option === "number").map(String)
    : [];
}

export function capabilityModelRows(payload) {
  const capabilities = recordOf(payload)?.capabilities;
  if (!Array.isArray(capabilities)) throw new Error("capability catalog returned an invalid response");
  const rows = new Map();
  for (const value of capabilities) {
    const entry = recordOf(value);
    const presentation = recordOf(recordOf(entry?.model)?.presentation);
    if (!entry || typeof presentation?.id !== "string" || rows.has(presentation.id)) continue;
    const resolution = resolutionOptions(entry);
    rows.set(presentation.id, {
      ...presentation,
      params: resolution.length ? { resolution: { options: resolution } } : undefined,
    });
  }
  return [...rows.values()];
}

export async function fetchCapabilityModelRows(gatewayFetch, signal) {
  const response = await gatewayFetch(`${CAPABILITIES_SOURCE_ROUTE}?source=model`, { signal });
  if (!response.ok) throw new Error(`capability catalog failed with HTTP ${response.status}`);
  return capabilityModelRows(await response.json());
}

/**
 * 当前模型目录来源。
 * - 没有 workspaceId 或架构查询失败 → "models-config"（立刻返回，不发请求）
 * - 架构还没拿到 → undefined（让调用方的 enabled 变 false，等架构到达）
 * - resource_v3 → "capabilities"，其余 → "models-config"
 */
export function useChatModelSource() {
  const { workspaceId } = useGatewayScope();
  const { data: architecture, isError } = useWorkspaceProjectArchitecture();
  if (!workspaceId || isError) return "models-config";
  if (!architecture) return undefined;
  return architecture === "resource_v3" ? "capabilities" : "models-config";
}

export { API_PATHS };
