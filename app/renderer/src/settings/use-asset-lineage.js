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

async function fetchUpstream(gatewayFetch2, assetId, depth2) {
  const url2 = depth2
    ? `${API_PATHS.dependenciesUpstream(assetId)}?depth=${depth2}`
    : API_PATHS.dependenciesUpstream(assetId);
  const res = await gatewayFetch2(url2);
  return res.json();
}

async function fetchDownstream(gatewayFetch2, assetId, depth2) {
  const url2 = depth2
    ? `${API_PATHS.dependenciesDownstream(assetId)}?depth=${depth2}`
    : API_PATHS.dependenciesDownstream(assetId);
  const res = await gatewayFetch2(url2);
  return res.json();
}

async function fetchInputs(gatewayFetch2, assetId) {
  const res = await gatewayFetch2(API_PATHS.dependenciesInputs(assetId));
  return res.json();
}

export function useAssetLineage(assetId, options) {
  const gatewayFetch2 = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const enabled = (options?.enabled ?? true) && !!assetId;
  return useQuery({
    queryKey: assetLineageQueryKey.upstream(
      assetId ?? "",
      options?.depth,
      scopeKey,
    ),
    queryFn: () => fetchUpstream(gatewayFetch2, assetId, options?.depth),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    // WS event drives invalidation
  });
}

export function useAssetDescendants(assetId, options) {
  const gatewayFetch2 = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const enabled = (options?.enabled ?? true) && !!assetId;
  return useQuery({
    queryKey: assetLineageQueryKey.downstream(
      assetId ?? "",
      options?.depth,
      scopeKey,
    ),
    queryFn: () => fetchDownstream(gatewayFetch2, assetId, options?.depth),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useAssetInputs(assetId, options) {
  const gatewayFetch2 = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const enabled = !!assetId;
  return useQuery({
    queryKey: assetLineageQueryKey.inputs(assetId ?? "", scopeKey),
    queryFn: () => fetchInputs(gatewayFetch2, assetId),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
