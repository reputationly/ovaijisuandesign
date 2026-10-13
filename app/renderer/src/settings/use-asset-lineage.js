// use-asset-lineage.js
import { API_PATHS, useQuery } from "../vendor.js";
import { assetLineageQueryKey } from "../workspace/asset-lineage-query-key.js";
import {
  useGatewayFetch,
  useGatewayScopeKey,
} from "../generation/use-model-catalog-scope-key.js";

export function workspaceInitialPayloadSignature(payload) {
  return JSON.stringify([
    payload.initialMessage ?? null,
    payload.initialAttachments ?? [],
    payload.initialEntityRefs ?? [],
    payload.initialModelId ?? null,
    payload.initialSelectedMediaModels ?? null,
  ]);
}

async function fetchUpstream(gatewayFetch, assetId, depth) {
  const url = depth
    ? `${API_PATHS.dependenciesUpstream(assetId)}?depth=${depth}`
    : API_PATHS.dependenciesUpstream(assetId);
  const res = await gatewayFetch(url);
  return res.json();
}

async function fetchDownstream(gatewayFetch, assetId, depth) {
  const url = depth
    ? `${API_PATHS.dependenciesDownstream(assetId)}?depth=${depth}`
    : API_PATHS.dependenciesDownstream(assetId);
  const res = await gatewayFetch(url);
  return res.json();
}

async function fetchInputs(gatewayFetch, assetId) {
  const res = await gatewayFetch(API_PATHS.dependenciesInputs(assetId));
  return res.json();
}

export function useAssetLineage(assetId, options) {
  const gatewayFetch = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const enabled = (options?.enabled ?? true) && !!assetId;
  return useQuery({
    queryKey: assetLineageQueryKey.upstream(
      assetId ?? "",
      options?.depth,
      scopeKey,
    ),
    queryFn: () => fetchUpstream(gatewayFetch, assetId, options?.depth),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    // WS event drives invalidation
  });
}

export function useAssetDescendants(assetId, options) {
  const gatewayFetch = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const enabled = (options?.enabled ?? true) && !!assetId;
  return useQuery({
    queryKey: assetLineageQueryKey.downstream(
      assetId ?? "",
      options?.depth,
      scopeKey,
    ),
    queryFn: () => fetchDownstream(gatewayFetch, assetId, options?.depth),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useAssetInputs(assetId, options) {
  const gatewayFetch = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const enabled = !!assetId;
  return useQuery({
    queryKey: assetLineageQueryKey.inputs(assetId ?? "", scopeKey),
    queryFn: () => fetchInputs(gatewayFetch, assetId),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
